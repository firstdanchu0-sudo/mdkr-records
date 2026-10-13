/* MDKR profile v0.9: TOP5, profile record count, optional detailed comparison.
   This file REPLACES mdkr_profile_v08.js; keep its existing script tag.
   Existing profile tables are not hidden; no MutationObserver or polling. */
(()=>{
 'use strict';
 if(typeof players!=='function') { console.warn('MDKR profile v0.9: backend.js must load first'); return; }
 const previous=players;
 const cfg=window.MDKR_CONFIG||{};
 const client=cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient
  ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=n=>Number(n||0).toLocaleString('ko-KR');
 const el=n=>n==null?'—':Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
 const songData=id=>(typeof songs!=='undefined'?songs:[]).find(s=>s.chart_id===id);
 const isHidden=s=>s?.chart_type==='HIDDEN';
 const nameFor=s=>s?.title_ko||s?.title||'알 수 없는 악곡';
 const chartLabel=(id)=>{const s=songData(id);return s?`${nameFor(s)} · Lv.${s.level}${isHidden(s)?' HIDDEN':''}`:id;};
 const songKey=id=>String(id||'').split(':')[0];
 let seq=0;
 players=async function(){
  const key=++seq;
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  const id=params.get('user'), me=params.get('me');
  if(!id&&!me)return previous();
  let current=null;
  if(client){try{current=(await client.auth.getUser()).data?.user||null;}catch(e){console.warn('MDKR auth',e);}}
  await previous();
  if(key!==seq||!location.hash.startsWith('#/players'))return;
  const targetId=me?current?.id:id;
  if(!targetId||!client)return;
  const own=!!current&&current.id===targetId;
  const view=document.querySelector('#view');if(!view)return;
  const recent=[...view.querySelectorAll('.panel')].find(p=>p.querySelector('h3')?.textContent.trim()==='최근 제출 기록');
  if(!own)recent?.remove();
  const section=document.createElement('section');
  section.className='panel mdkr-favorites';
  section.innerHTML=`<h3>주로 플레이하는 악곡 TOP 5</h3><p class="muted">승인된 제출 횟수 기준 · 같은 악곡의 채보는 합산 · E/L은 평균</p><div class="mdkr-favorite-list">불러오는 중…</div>`;
  if(!own){const extras=view.querySelector('#mdkr-profile-extra'); if(extras)extras.before(section);else view.append(section);}
  const {data:rows,error}=await client.rpc('mdkr_profile_chart_summary',{p_user_id:targetId});
  if(key!==seq||!view.isConnected)return;
  if(error){console.warn('MDKR v0.9 summary',error);if(!own)section.querySelector('.mdkr-favorite-list').textContent='집계를 불러오지 못했습니다. v0.9 SQL 적용 여부를 확인해 주세요.';return;}
  const summaries=rows||[];
  const total=summaries.reduce((a,r)=>a+Number(r.record_count||0),0);
  // Insert directly into profile stats. No full-profile redraw needed.
  const grid=view.querySelector('.profile-grid');
  if(grid){
    const wrapper=document.createElement('div');wrapper.className='statbox mdkr-record-count';
    wrapper.innerHTML=`<button type="button" class="mdkr-record-count-button" aria-expanded="false"><strong>${num(total)}</strong><small>총 등록 기록 수 <span aria-hidden="true">▾</span></small></button>`;
    grid.append(wrapper);
    wrapper.querySelector('button').addEventListener('click',async()=>{
      const button=wrapper.querySelector('button');
      const open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(open));
      let details=view.querySelector('#mdkr-record-comparison');
      if(!open){if(details)details.hidden=true;return;}
      if(!details){details=document.createElement('section');details.id='mdkr-record-comparison';details.className='panel';
        const extra=view.querySelector('#mdkr-profile-extra');if(extra)extra.before(details);else view.append(details);}
      details.hidden=false;
      details.innerHTML=`<h3>등록한 기록 · ${num(total)}건</h3><p class="muted">승인 기록을 채보별로 묶었습니다. 같은 채보를 여러 번 제출한 경우 횟수를 표시합니다. 승패는 양측의 최고 세부 점수 기준이며, 동점은 동일 성적으로 표시합니다.</p><div id="mdkr-record-comparison-table">비교 기록을 불러오는 중…</div>`;
      // Personal best records from the same published leaderboard used by MDKR.
      let mine=new Map();
      if(current&&current.id!==targetId){
        const ownRank=await client.from('mdkr_rankings').select('chart_id,detail_score,judge,early,late').eq('user_id',current.id).limit(5000);
        if(ownRank.error)console.warn('MDKR personal comparison',ownRank.error);
        else mine=new Map((ownRank.data||[]).map(r=>[r.chart_id,r]));
      }
      if(key!==seq||!details.isConnected||details.hidden)return;
      const sorted=[...summaries].sort((a,b)=>{
        const sa=songData(a.chart_id),sb=songData(b.chart_id);
        return nameFor(sa).localeCompare(nameFor(sb),'ko') || Number(isHidden(sb))-Number(isHidden(sa)) || String(a.chart_id).localeCompare(String(b.chart_id));
      });
      const trs=sorted.map(r=>{
        const mineRec=mine.get(r.chart_id);let verdict='—';
        if(!own&&current){
          if(!mineRec)verdict='내 기록 없음';
          else if(Number(r.best_detail)<Number(mineRec.detail_score))verdict='상대 승리';
          else if(Number(r.best_detail)>Number(mineRec.detail_score))verdict='내 승리';
          else verdict='동점';
        }
        const ownValue=mineRec?`${num(mineRec.detail_score)} (E/L ${el(Number(mineRec.early)+Number(mineRec.late))})`:'—';
        return `<tr><td><a href="#/chart/${encodeURIComponent(r.chart_id)}">${esc(chartLabel(r.chart_id))}</a></td><td>${num(r.record_count)}</td><td>${esc(r.best_judge||'—')}</td><td>${num(r.best_detail)} (E/L ${el(r.best_el)})</td>${!own&&current?`<td>${ownValue}</td><td>${verdict}</td>`:''}</tr>`;
      }).join('');
      const head=`<tr><th>악곡·채보</th><th>등록 횟수</th><th>최고 판정</th><th>상대 최고 세부 점수</th>${!own&&current?'<th>내 최고 세부 점수</th><th>비교 결과</th>':''}</tr>`;
      details.querySelector('#mdkr-record-comparison-table').innerHTML=`<div class="table-wrap"><table class="ranks"><thead>${head}</thead><tbody>${trs||`<tr><td colspan="${!own&&current?6:4}">승인된 기록이 없습니다.</td></tr>`}</tbody></table></div>`;
    });
  }
  if(own)return;
  const buckets=new Map();
  for(const r of summaries){
    const k=songKey(r.chart_id),group=buckets.get(k)||{key:k,count:0,weightedEl:0,charts:[]};
    group.count+=Number(r.record_count);group.weightedEl+=Number(r.avg_el||0)*Number(r.record_count);group.charts.push(r);
    buckets.set(k,group);
  }
  const top=[...buckets.values()].sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key)).slice(0,5);
  const area=section.querySelector('.mdkr-favorite-list');
  area.innerHTML=top.map((g,i)=>{
    const preferred=[...g.charts].sort((a,b)=>Number(b.record_count)-Number(a.record_count)||Number(isHidden(songData(b.chart_id)))-Number(isHidden(songData(a.chart_id))))[0];
    const song=songData(preferred.chart_id);
    const cover=song?.cover_path?`<img class="mdkr-favorite-cover" loading="lazy" src="${esc(song.cover_path)}" alt="">`:'';
    return `<div class="mdkr-favorite-row"><span class="mdkr-favorite-position">${i+1}</span>${cover}<a href="#/chart/${encodeURIComponent(preferred.chart_id)}">${esc(nameFor(song)||g.key)} <span class="muted">Lv.${esc(song?.level??'?')}${isHidden(song)?' HIDDEN':''}</span></a><span class="mdkr-favorite-meta">평균 E/L ${el(g.weightedEl/g.count)}</span><strong>${num(g.count)}회</strong></div>`;
  }).join('')||'아직 승인된 기록이 없습니다.';
 };
})();
