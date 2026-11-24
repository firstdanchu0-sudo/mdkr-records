/* MDKR score builds + short per-chart comments. Duplicate render fix. */
(()=>{'use strict';
if(typeof chartPage!=='function')return;
const cfg=window.MDKR_CONFIG||{};
const db=window.supabase?.createClient&&cfg.supabaseUrl&&cfg.supabaseAnonKey
 ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:false}}):null;
let builds=null,token=0;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=id=>location.hash.startsWith('#/chart/')&&decodeURIComponent(location.hash.split('?')[0].slice(8))===id;
async function getBuilds(){if(builds)return builds;try{const r=await fetch('data/score_builds.json',{cache:'no-cache'});if(!r.ok)throw Error();builds=await r.json()}catch{builds={}}return builds}
const original=chartPage;
chartPage=async function(id){
 const run=++token;
 await original(id);
 if(!current(id)||run!==token)return;
 const view=document.querySelector('#view'),detail=view?.querySelector('.detail');if(!detail)return;
 // The build panel is a SIBLING of .detail, not a child. Find it from view.
 const duplicates=[...view.querySelectorAll('.mdkr-score-build')];
 let buildRow=duplicates.shift();duplicates.forEach(el=>el.remove());
 if(!buildRow){buildRow=document.createElement('div');buildRow.className='mdkr-score-build'}
 detail.after(buildRow);
 buildRow.textContent='점수작 추천: 데이터 준비 중';
 const all=await getBuilds();if(!current(id)||run!==token||!view.contains(buildRow))return;
 const b=all[id];
 if(b&&b.character&&b.elfin){buildRow.textContent=`점수작 추천: ${b.character} / ${b.elfin}`;buildRow.title='MuseDash.moe 통합 랭킹 두 번째 기록 기준 · '+(b.updated_at||'')}
 else {buildRow.textContent='점수작 추천: 데이터 준비 중';buildRow.removeAttribute('title')}
 if(!db)return;
 // Multiple auth/route refreshes must not append multiple comment sections.
 const old=[...view.querySelectorAll('.mdkr-chart-comments')];old.forEach(el=>el.remove());
 const section=document.createElement('section');section.className='mdkr-chart-comments';
 section.innerHTML='<h3>기록 한마디 <small>최대 10글자</small></h3><div class="mdkr-comment-list">불러오는 중…</div><div class="mdkr-comment-editor"></div>';
 const table=view.querySelector('.table-wrap');if(!table)return;table.after(section);
 const list=section.querySelector('.mdkr-comment-list'),edit=section.querySelector('.mdkr-comment-editor');
 const valid=()=>current(id)&&run===token&&view.contains(section);
 async function reload(){
  const {data,error}=await db.rpc('mdkr_chart_comment_list',{p_chart_id:id});if(!valid())return;
  if(error){list.textContent='코멘트를 불러올 수 없습니다. SQL 적용을 확인해주세요.';return}
  const rows=data||[],rankRows=[...view.querySelectorAll('#ranksbody tr')];
  const rankUsers=rankRows.map(r=>r.querySelector('a[href^="#/players?user="]')?.getAttribute('href')?.split('user=')[1]).map(x=>x?decodeURIComponent(x):null);
  for(const r of rankRows)r.querySelector('.mdkr-inline-comment')?.remove();
  const other=[];
  for(const x of rows){
   const i=rankUsers.indexOf(x.user_id);
   if(i>=0){const target=rankRows[i]?.querySelector('td:nth-child(2)');if(target){const el=document.createElement('div');el.className='mdkr-inline-comment';el.textContent=x.body;target.append(el)}}
   else other.push(x);
  }
  list.replaceChildren();
  if(other.length){const lbl=document.createElement('div');lbl.className='mdkr-comment-subhead';lbl.textContent='TOP 10 외 승인 기록 코멘트';list.append(lbl);for(const x of other){const el=document.createElement('p');el.className='mdkr-comment-other';el.textContent=x.body;list.append(el)}}
 }
 await reload();if(!valid())return;
 const user=await db.auth.getUser();if(!valid()||!user.data?.user)return;
 const {data:mine,error:mineError}=await db.rpc('mdkr_chart_comment_mine',{p_chart_id:id});
 if(!valid()||mineError||!mine?.[0]?.eligible)return;
 const existing=mine[0].body||'';
 edit.innerHTML=`<label for="mdkr-comment-text">내 기록 한마디</label><div class="mdkr-comment-controls"><input id="mdkr-comment-text" maxlength="20" placeholder="예: 12렙 EL40" value="${safe(existing)}"><span class="mdkr-comment-count"></span><button class="button primary" type="button">저장</button></div><p class="muted mdkr-comment-status">승인된 기록이 있는 곡에만 남길 수 있어요. 빈칸으로 저장하면 삭제됩니다.</p>`;
 const input=edit.querySelector('input'),button=edit.querySelector('button'),counter=edit.querySelector('.mdkr-comment-count'),status=edit.querySelector('.mdkr-comment-status');
 const measure=()=>{const n=Array.from(input.value).length;counter.textContent=`${n}/10`;button.disabled=n>10};
 input.addEventListener('input',measure);measure();
 button.onclick=async()=>{const body=input.value.trim();if(Array.from(body).length>10)return;button.disabled=true;status.textContent='저장 중…';const r=await db.rpc('mdkr_chart_comment_save',{p_chart_id:id,p_body:body});if(!valid())return;status.textContent=r.error?'저장 실패: '+r.error.message:'저장했어요!';measure();if(!r.error)await reload()};
};
})();
