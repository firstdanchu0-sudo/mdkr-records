(()=>{
const cfg=window.MDKR_CONFIG||{};
const ready=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient);
const db=ready?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:true}}):null;
let currentUser=null,adminUser=false;
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const msg=e=>e?.message||String(e);
const judgeOrder={AP:0,FC:1,OTHER:2};
function note(text){return `<div class="notice">${safe(text)}</div>`}
function disableMsg(){return note('Discord 로그인과 기록 DB 설정이 필요합니다.')}
function chartTitle(chartId){const s=songs.find(x=>x.chart_id===chartId);return s?title(s):chartId}
function songByChart(chartId){return songs.find(x=>x.chart_id===chartId)}
function detailScore(r){return Number(r.early||0)+Number(r.late||0)+Number(r.great||0)+Number(r.miss||0)*2}
function accountLabel(){
  const md=currentUser?.user_metadata||{};
  return md.global_name||md.full_name||md.name||md.user_name||'Player';
}
async function ensureProfile(){
  if(!db||!currentUser)return;
  const md=currentUser.user_metadata||{};
  const avatar=md.avatar_url||null;
  const nickname=accountLabel();
  const upd=await db.from('profiles').upsert({id:currentUser.id,nickname,avatar_url:avatar},{onConflict:'id',ignoreDuplicates:true});
  if(upd.error) console.warn(upd.error);
}
async function startAuth(){
  if(!db){showAuth();return}
  const {data:{session}}=await db.auth.getSession();
  currentUser=session?.user||null;
  if(currentUser){
    await ensureProfile();
    const r=await db.rpc('is_mdkr_admin');
    adminUser=r.data===true;
  } else adminUser=false;
  showAuth();
  if(currentUser)renderNotifications();
  if(location.hash.startsWith('#/players')||location.hash.startsWith('#/admin')||location.hash.startsWith('#/submit')||location.hash.startsWith('#/chart/')) route();
}
function showAuth(){
  let btn=document.querySelector('#account-area');
  if(!btn){btn=document.createElement('div');btn.id='account-area';document.querySelector('.top').append(btn)}
  btn.innerHTML=currentUser
    ?`<a href="#/players?me=1" class="button">내 프로필</a> <button class="button" id="logout">로그아웃</button>`
    :`<button class="button primary" id="login" ${!ready?'disabled':''}>Discord 로그인</button>`;
  const login=btn.querySelector('#login');
  if(login) login.onclick=async()=>{
    const redirectTo=location.origin+location.pathname;
    const r=await db.auth.signInWithOAuth({provider:'discord',options:{redirectTo}});
    if(r.error) alert(msg(r.error));
  };
  const logout=btn.querySelector('#logout');
  if(logout) logout.onclick=async()=>{await db.auth.signOut();currentUser=null;adminUser=false;showAuth();route();};
}
async function fetchRanks(chart){
  if(!db) return [];
  const r=await db.from('mdkr_rankings').select('*').eq('chart_id',chart).order('rank',{ascending:true}).order('detail_score',{ascending:true}).order('created_at',{ascending:true}).limit(50);
  if(r.error) throw r.error;
  return (r.data||[]).filter(x=>x.rank<=10);
}
chartPage=async function(id){
  setActive('songs');
  const s=songs.find(x=>x.chart_id===id);
  if(!s){view.innerHTML='<div class="empty">채보를 찾을 수 없습니다.</div>';return}
  view.innerHTML=`<a class="back" href="#/">← 악곡 목록</a><div class="detail">${img(s)}<div><span class="tag">LV.${s.level}</span> ${s.chart_type==='HIDDEN'?'<span class="tag hidden">HIDDEN</span>':''}<h2 style="margin-top:10px">${safe(title(s))}</h2><div class="muted">${safe(s.artist)}</div></div></div><div class="section-head"><div><h2>한국 전일 TOP 10</h2><p class="muted">세부값 = EARLY + LATE + GREAT + (MISS × 2) · 낮을수록 우위</p></div><a class="button primary" href="#/submit?chart=${encodeURIComponent(id)}">기록 제출</a></div><div class="table-wrap"><table class="ranks"><thead><tr><th>순위</th><th>플레이어</th><th>판정</th><th>세부</th><th>E / L</th><th>G / M</th></tr></thead><tbody id="ranksbody"><tr><td colspan="6">랭킹 불러오는 중…</td></tr></tbody></table></div>`;
  let rows=[];
  try{rows=await fetchRanks(id)}catch(e){view.querySelector('#ranksbody').innerHTML=`<tr><td colspan="6">${safe(msg(e))}</td></tr>`;return}
  const body=view.querySelector('#ranksbody'); if(!body) return;
  let equipped=new Map();
  try{equipped=await getEquippedTitles(rows.map(r=>r.user_id))}catch(e){console.warn('칭호 조회 실패:',e)}
  if(!view.contains(body))return;
  body.innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${r.rank}위</strong></td><td><a href="#/players?user=${encodeURIComponent(r.user_id)}">${titleSpan(equipped.get(r.user_id))}${equipped.has(r.user_id)?" ":""}${safe(r.nickname)}</a></td><td>${safe(r.judge)}</td><td>${r.detail_score}</td><td>${r.early} / ${r.late}</td><td>${r.great} / ${r.miss}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty">아직 승인된 기록이 없습니다.</div></td></tr>`;
};
async function fetchPlayerStats(){
  if(!db) return [];
  const r=await db.from('mdkr_player_stats').select('*');
  if(r.error) throw r.error;
  return r.data||[];
}
function fmtNum(v,fix=2){return (v===null||v===undefined||Number.isNaN(Number(v)))?'—':Number(v).toFixed(fix)}
const titleColors={COMMON:'#F3F0EA',RARE:'#83BBFF',EPIC:'#C39AFF',LEGENDARY:'#F4C873'};
function titleSpan(t){return t?`<span class="title-chip" style="color:${titleColors[t.rarity]||'#F3F0EA'}">${safe(t.name)}</span>`:''}
// Public equipped titles for ranking tables. Never infer unlocks from user input.
async function getEquippedTitles(userIds){
  const ids=[...new Set(userIds.filter(Boolean))];
  const result=new Map();
  if(!db||!ids.length)return result;
  const profiles=await db.from('profiles').select('id,equipped_title_id').in('id',ids);
  if(profiles.error)throw profiles.error;
  const assigned=(profiles.data||[]).filter(p=>p.equipped_title_id);
  if(!assigned.length)return result;
  const wanted=[...new Set(assigned.map(p=>p.equipped_title_id))];
  const catalog=await db.from('mdkr_title_catalog').select('id,name,rarity').in('id',wanted);
  if(catalog.error)throw catalog.error;
  const byId=new Map((catalog.data||[]).map(t=>[t.id,t]));
  for(const p of assigned){const t=byId.get(p.equipped_title_id);if(t)result.set(p.id,t)}
  // Rare song titles and legendary Lv.12 song titles are computed by
  // mdkr_available_titles(), not persisted in mdkr_title_catalog.
  // Only request the RPC for profiles whose equipped ID is absent from catalog.
  const dynamic=assigned.filter(p=>!byId.has(p.equipped_title_id));
  const lookups=await Promise.allSettled(dynamic.map(async p=>{
    const r=await db.rpc('mdkr_available_titles',{p_user_id:p.id});
    if(r.error)throw r.error;
    const t=(r.data||[]).find(x=>x.title_id===p.equipped_title_id&&x.unlocked);
    return t?{id:p.id,title:{name:t.name,rarity:t.rarity}}:null;
  }));
  for(const r of lookups){
    if(r.status==='fulfilled'&&r.value)result.set(r.value.id,r.value.title);
    else if(r.status==='rejected')console.warn('악곡 칭호 조회 실패:',r.reason);
  }
  return result;
}

async function renderNotifications(){
  if(!db||!currentUser)return;
  const q=await db.from('mdkr_notifications').select('id,type,chart_id,created_at,read_at,actor_id').is('read_at',null).order('created_at',{ascending:false}).limit(30);
  if(q.error)return;
  const items=q.data||[];
  let area=document.querySelector('#account-area');
  if(!area)return;
  let bell=area.querySelector('#mdkr-bell');
  if(!bell){bell=document.createElement('button');bell.id='mdkr-bell';bell.className='button';area.prepend(bell)}
  bell.textContent=`🔔 ${items.length}`;
  bell.onclick=async()=>{
    const popup=document.querySelector('#mdkr-notifications');
    if(popup){popup.remove();return}
    const panel=document.createElement('div'); panel.id='mdkr-notifications'; panel.className='panel';
    panel.innerHTML=`<h3>새 알림 ${items.length}건</h3>`+(items.length?items.map(n=>`<p>⚔️ ${n.type==='OVERTAKEN'?'전일 기록 추월!':'왕좌 탈환 성공!'} <a href="#/chart/${encodeURIComponent(n.chart_id)}">${safe(chartTitle(n.chart_id))}</a></p>`).join(''):'<p class="muted">새로운 알림이 없습니다.</p>')+'<button id="mdkr-read" class="button">모두 읽음</button>';
    document.querySelector('main').prepend(panel);
    panel.querySelector('#mdkr-read').onclick=async()=>{const r=await db.rpc('mdkr_mark_notifications_read');if(r.error)alert(msg(r.error));else{panel.remove();renderNotifications()}};
  };
}
async function getTitleProgress(id){
 const [a,b,c]=await Promise.all([
  db.from('submissions').select('chart_id,judge,level,status').eq('user_id',id).eq('status','APPROVED').limit(1000),
  db.from('mdkr_rankings').select('chart_id,rank,level').eq('user_id',id).limit(1000),
  db.from('mdkr_throne_losses').select('id,reclaimed_at').eq('loser_id',id).limit(1000)
 ]);
 const rows=a.data||[], rank=b.data||[], losses=c.data||[];
 return {charts:new Set(rows.map(x=>x.chart_id)).size, ap:new Set(rows.filter(x=>x.judge==='AP').map(x=>x.chart_id)).size,
 lv12:new Set(rows.filter(x=>x.level===12).map(x=>x.chart_id)).size, lv12ap:new Set(rows.filter(x=>x.level===12&&x.judge==='AP').map(x=>x.chart_id)).size,
 firsts:rank.filter(x=>x.rank===1).length,top10:rank.filter(x=>x.rank<=10).length,reclaims:losses.filter(x=>x.reclaimed_at).length};
}
function titleProgress(t,s){
 const requirements={'기쁜':['charts',1],'친절한':['charts',10],'배고픈':['charts',20],'시끄러운':['charts',30],
 '달콤한':['ap',5],'예쁜':['ap',3],'안전한':['ap',10],'완벽주의자':['ap',100],
 '용감한':['lv12',1],'매운':['lv12',3],'무거운':['lv12',10],'악마':['lv12ap',10],
 '멋있는':['firsts',3],'챔피언':['firsts',10],'왕':['firsts',30],'여왕':['firsts',30],
 '황제':['firsts',50],'1등':['firsts',100],'중요한':['top10',50],
 '행복한':['reclaims',3],'도전자':['reclaims',10],'로드':['reclaims',20],'인간승리':['reclaims',30]};
 const r=requirements[t.name];if(!r)return '';
 const num=Math.min(s[r[0]]||0,r[1]);return `<div class="mdkr-progress"><div class="mdkr-progress-track"><span style="width:${100*num/r[1]}%"></span></div><small>${num} / ${r[1]} · ${t.unlocked?'획득 완료':'진행 중'}</small></div>`;
}
async function renderProfileExtras(targetId,own){
  view.querySelector('#mdkr-profile-extra')?.remove();
  const area=document.createElement('section');area.id='mdkr-profile-extra';view.append(area);
  const [pr,owned]=await Promise.all([
    db.from('profiles').select('nickname,bio,equipped_title_id,created_at').eq('id',targetId).maybeSingle(),
    db.rpc('mdkr_available_titles',{p_user_id:targetId})
  ]);
  if(pr.error||owned.error){area.innerHTML=note('프로필 확장 기능을 불러오지 못했습니다. v0.5 SQL 적용 여부를 확인해주세요. '+msg(pr.error||owned.error));return}
  const profile=pr.data||{}, titles=owned.data||[];
  const equipped=titles.find(t=>t.title_id===profile.equipped_title_id&&t.unlocked);
  const unlocked=titles.filter(t=>t.unlocked);
  const header=view.querySelector('.section-head h2');
  if(header){header.innerHTML=`${equipped?titleSpan(equipped)+' ':''}${safe(profile.nickname||'Player')} 프로필`}
  const [loss,win]=await Promise.all([
    db.from('mdkr_throne_losses').select('id,reclaimed_at').eq('loser_id',targetId),
    db.from('mdkr_throne_events').select('id').eq('new_holder_id',targetId)
  ]);
  const lossRows=loss.data||[];
  const reclaimed=lossRows.filter(x=>x.reclaimed_at).length;
  area.innerHTML=`<div class="panel"><h3>업적과 칭호</h3><div class="profile-grid"><div class="statbox"><strong>${unlocked.length}</strong><small>획득 칭호</small></div><div class="statbox"><strong>${lossRows.length}</strong><small>전일 추월당함</small></div><div class="statbox"><strong>${reclaimed}</strong><small>재탈환 완료</small></div><div class="statbox"><strong>${(win.data||[]).length}</strong><small>전일 획득 이벤트</small></div></div><div class="filters" id="titleFilters"></div><div class="title-grid" id="titleGrid"></div></div>`;
  if(own){
    const edit=document.createElement('div');edit.className='panel';
    edit.innerHTML=`<h3>프로필 편집</h3><label>닉네임 (2~24자)</label><input id="mdkr-nickname" maxlength="24" value="${safe(profile.nickname||'')}"><label>자기소개 (최대 160자)</label><textarea id="mdkr-bio" maxlength="160" rows="3">${safe(profile.bio||'')}</textarea><label>대표 칭호 (하나만)</label><select id="mdkr-equip"><option value="">장착 안 함</option>${unlocked.map(t=>`<option value="${safe(t.title_id)}" ${profile.equipped_title_id===t.title_id?'selected':''}>${safe(t.name)} [${safe(t.rarity)}]</option>`).join('')}</select><button class="button primary" id="mdkr-save" style="margin-top:12px">설정 저장</button><p class="muted" id="mdkr-save-result"></p>`;
    area.prepend(edit);
    edit.querySelector('#mdkr-save').onclick=async()=>{
      const nick=edit.querySelector('#mdkr-nickname').value.trim(),bio=edit.querySelector('#mdkr-bio').value.trim(),tid=edit.querySelector('#mdkr-equip').value||null;
      const out=edit.querySelector('#mdkr-save-result');
      if(nick.length<2||nick.length>24){out.textContent='닉네임은 2~24자로 입력해주세요.';return}
      const r=await db.rpc('mdkr_save_profile',{p_nickname:nick,p_bio:bio,p_title_id:tid});
      if(r.error)out.textContent='저장 실패: '+msg(r.error);else{out.textContent='저장 완료!';await renderProfileExtras(targetId,true)};
    };
  }
  const progressStats=await getTitleProgress(targetId);
  let filter='all';const filters=area.querySelector('#titleFilters'),grid=area.querySelector('#titleGrid');
  function draw(){
    filters.innerHTML=['all','COMMON','RARE','EPIC','LEGENDARY'].map(x=>`<button class="pill ${x===filter?'active':''}" data-rarity="${x}">${x==='all'?'전체':x}</button>`).join('');
    filters.querySelectorAll('button').forEach(el=>el.onclick=()=>{filter=el.dataset.rarity;draw()});
    const selected=titles.filter(x=>filter==='all'||x.rarity===filter);
    grid.innerHTML=selected.map(t=>`<div class="title-card ${t.unlocked?'':'title-locked'}">${titleSpan(t)}<div class="muted">${safe(t.description||'')} ${t.unlocked?'· 획득':'· 미획득'}</div>${titleProgress(t,progressStats)}</div>`).join('')||'<p class="muted">해당 등급 칭호가 없습니다.</p>';
  }
  draw();
}
players=async function(){
  setActive('players');
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  const me=params.get('me');
  const user=params.get('user');
  if(!db){view.innerHTML='<h2>플레이어</h2>'+disableMsg();return}
  if(me && !currentUser){view.innerHTML='<h2>내 프로필</h2>'+note('먼저 Discord 로그인을 해주세요.');return}
  const targetId=me&&currentUser?currentUser.id:user;
  if(targetId){
    const statsRes=await db.from('mdkr_player_stats').select('*').eq('user_id',targetId).maybeSingle();
    const stat=statsRes.data||{nickname: me?'나': '플레이어', user_id:targetId, points:0,total_firsts:0,top10_count:0,ap_count:0,avg_accuracy:null,avg_early:null,avg_late:null,avg_el:null,charts_count:0};
    let subs=[];
    const subRes=await db.from('submissions').select('id,chart_id,judge,accuracy,early,late,great,miss,status,rejection_reason,created_at').eq('user_id',targetId).order('created_at',{ascending:false}).limit(100);
    if(!subRes.error) subs=subRes.data||[];
    view.innerHTML=`<div class="section-head"><div><h2>${safe(stat.nickname)} 프로필</h2><div class="muted">승인 기록 기준 통계</div></div><a class="button" href="#/players">전체 랭킹</a></div>
      <div class="profile-head"><div class="avatar-wrap">${stat.avatar_url?`<img class="avatar" src="${safe(stat.avatar_url)}" alt="">`:'<div class="avatar avatar-fallback"></div>'}</div>
      <div class="profile-grid">
        <div class="statbox"><strong>${stat.total_firsts||0}</strong><small>전일 보유</small></div>
        <div class="statbox"><strong>${stat.points?Math.round(stat.points):0}</strong><small>포인트</small></div>
        <div class="statbox"><strong>${stat.top10_count||0}</strong><small>TOP 10</small></div>
        <div class="statbox"><strong>${fmtNum(stat.avg_accuracy,3)}</strong><small>평균 정확도</small></div>
        <div class="statbox"><strong>${fmtNum(stat.avg_el,2)}</strong><small>평균 E+L</small></div>
        <div class="statbox"><strong>${fmtNum(stat.avg_early,2)} / ${fmtNum(stat.avg_late,2)}</strong><small>평균 E / L</small></div>
      </div></div>
      <div class="panel"><h3>최근 제출 기록</h3>${subs.length?`<div class="table-wrap"><table class="ranks"><thead><tr><th>곡</th><th>판정</th><th>세부</th><th>정확도</th><th>상태</th><th>제출일</th></tr></thead><tbody>${subs.map(r=>`<tr><td><a href="#/chart/${encodeURIComponent(r.chart_id)}">${safe(chartTitle(r.chart_id))}</a></td><td>${safe(r.judge)}</td><td>${detailScore(r)} <span class="muted">(${r.early}/${r.late}, ${r.great}/${r.miss})</span></td><td>${r.accuracy==null?'—':safe(r.accuracy)}</td><td>${safe(({PENDING:'검수 대기',APPROVED:'승인 완료',REJECTED:'반려됨',VOIDED:'무효 처리'})[r.status]||r.status)}${r.status==='REJECTED'&&targetId===currentUser?.id?` <a class="back" href="#/submit?chart=${encodeURIComponent(r.chart_id)}">다시 제출</a>`:''}${r.rejection_reason?`<div class="muted">${safe(r.rejection_reason)}</div>`:''}</td><td>${new Date(r.created_at).toLocaleDateString('ko-KR')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">아직 제출 기록이 없습니다.</p>'}</div>`;
    await renderProfileExtras(targetId, targetId===currentUser?.id);
    return;
  }
  view.innerHTML=`<div class="section-head"><div><h2>플레이어 랭킹</h2><div class="muted">전일 · 평균 정확도 · E/L · 포인트 랭킹</div></div></div><div class="filters" id="sortFilters"></div><div class="table-wrap"><table class="ranks"><thead><tr><th>순위</th><th>플레이어</th><th>전일</th><th>포인트</th><th>정확도</th><th>평균 E+L</th><th>TOP 10</th></tr></thead><tbody id="playerRows"><tr><td colspan="7">불러오는 중…</td></tr></tbody></table></div>`;
  const all=await fetchPlayerStats();
  let equipped=new Map();
  try{equipped=await getEquippedTitles(all.map(r=>r.user_id))}catch(e){console.warn('칭호 조회 실패:',e)}
  if(!view.querySelector('#playerRows'))return;
  let sort='points';
  function sorted(){
    const arr=[...all];
    const desc=(a,b,key)=>Number(b[key]||0)-Number(a[key]||0);
    const asc=(a,b,key)=>Number(a[key]||999999)-Number(b[key]||999999);
    if(sort==='firsts') arr.sort((a,b)=>desc(a,b,'total_firsts')||desc(a,b,'points'));
    else if(sort==='accuracy') arr.sort((a,b)=>desc(a,b,'avg_accuracy')||desc(a,b,'points'));
    else if(sort==='avg_el') arr.sort((a,b)=>asc(a,b,'avg_el')||desc(a,b,'points'));
    else if(sort==='top10') arr.sort((a,b)=>desc(a,b,'top10_count')||desc(a,b,'points'));
    else arr.sort((a,b)=>desc(a,b,'points')||desc(a,b,'total_firsts'));
    return arr;
  }
  function render(){
    const filters=view.querySelector('#sortFilters');
    filters.innerHTML=[['points','포인트'],['firsts','전일 수'],['accuracy','평균 정확도'],['avg_el','평균 E+L'],['top10','TOP 10']].map(([k,label])=>`<button class="pill ${sort===k?'active':''}" data-sort="${k}">${label}</button>`).join('');
    filters.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{sort=b.dataset.sort;render()});
    const rows=sorted();
    const body=view.querySelector('#playerRows');
    body.innerHTML=rows.length?rows.map((r,i)=>`<tr><td><strong>${i+1}위</strong></td><td><a href="#/players?user=${encodeURIComponent(r.user_id)}">${titleSpan(equipped.get(r.user_id))}${equipped.has(r.user_id)?" ":""}${safe(r.nickname)}</a></td><td>${r.total_firsts||0}</td><td>${Math.round(r.points||0)}</td><td>${fmtNum(r.avg_accuracy,3)}</td><td>${fmtNum(r.avg_el,2)}</td><td>${r.top10_count||0}</td></tr>`).join(''):'<tr><td colspan="7">표시할 플레이어가 없습니다.</td></tr>';
  }
  render();
};
submit=async function(){
  setActive('submit');
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  const selected=params.get('chart');
  view.innerHTML=`<h2>기록 제출</h2><div id="submitNotice"></div><div class="panel form"><label for="chart-search">곡 검색</label><input id="chart-search" type="text" placeholder="곡명 또는 아티스트 검색"><div id="mdkr-chart-preview" class="mdkr-chart-preview"></div><label for="chart">악곡 및 채보</label><select id="chart"></select><label for="judge">판정</label><select id="judge"><option value="AP">AP</option><option value="FC">FC</option><option value="OTHER">OTHER</option></select><div class="statrow"><div style="flex:1"><label for="accuracy">정확도 (%)</label><input id="accuracy" type="number" min="0" max="100" step="0.001" placeholder="예: 99.823"></div><div style="flex:1"><label for="early">EARLY</label><input id="early" type="number" min="0" value="0"></div><div style="flex:1"><label for="late">LATE</label><input id="late" type="number" min="0" value="0"></div></div><div class="statrow"><div style="flex:1"><label for="great">GREAT</label><input id="great" type="number" min="0" value="0"></div><div style="flex:1"><label for="miss">MISS</label><input id="miss" type="number" min="0" value="0"></div></div><div class="muted">세부값 = EARLY + LATE + GREAT + (MISS × 2)</div><div id="mdkr-detail-preview" class="notice">세부 점수: 0</div><label for="shot">스크린샷</label><input id="shot" type="file" accept="image/png,image/jpeg,image/webp"><div id="mdkr-shot-preview"></div><button class="button primary" style="margin-top:20px" id="submitBtn">기록 제출</button><div id="submitMsg" class="muted" style="margin-top:12px"></div></div>`;
  const info=view.querySelector('#submitNotice');
  if(!db){info.innerHTML=disableMsg();return}
  if(!currentUser){info.innerHTML=note('기록 제출은 Discord 로그인 후 이용할 수 있습니다.');return}
  const sel=view.querySelector('#chart');
  function renderOptions(query=''){
    const q=query.trim().toLowerCase();
    const filtered=songs.filter(s=>!q||[title(s),s.title,s.title_ko,s.artist].some(v=>String(v??'').toLowerCase().includes(q)));
    sel.innerHTML=filtered.slice(0,200).map(s=>`<option value="${safe(s.chart_id)}" ${selected===s.chart_id?'selected':''}>${safe(title(s))} · Lv.${s.level}${s.chart_type==='HIDDEN'?' HIDDEN':''}</option>`).join('');
    if(selected&&filtered.some(x=>x.chart_id===selected))sel.value=selected;
    updateSelection();
  }
  function updateSelection(){const x=songByChart(sel.value);const box=view.querySelector('#mdkr-chart-preview');box.innerHTML=x?`${img(x)}<div><b>${safe(title(x))}</b><p class="muted">${safe(x.artist)} · Lv.${x.level} · ${safe(x.chart_type)}</p></div>`:'<span class="muted">검색 결과가 없습니다.</span>';}
  renderOptions();
  view.querySelector('#chart-search').addEventListener('input',e=>renderOptions(e.target.value));
  sel.addEventListener('change',updateSelection);
  const judgeInput=view.querySelector('#judge'),greatInput=view.querySelector('#great'),missInput=view.querySelector('#miss');
  function refreshJudge(){if(judgeInput.value==='AP'){greatInput.value='0';missInput.value='0'}else if(judgeInput.value==='FC'){missInput.value='0'}greatInput.disabled=judgeInput.value==='AP';missInput.disabled=judgeInput.value!=='OTHER';refreshDetail()}
  function refreshDetail(){const val=id=>Math.max(0,Number(view.querySelector('#'+id).value)||0);view.querySelector('#mdkr-detail-preview').textContent=`세부 점수: ${val('early')+val('late')+val('great')+val('miss')*2} · ${judgeInput.value} 기록`;}
  judgeInput.addEventListener('change',refreshJudge);for(const id of ['early','late','great','miss'])view.querySelector('#'+id).addEventListener('input',refreshDetail);refreshJudge();
  view.querySelector('#shot').addEventListener('change',e=>{const file=e.target.files[0],el=view.querySelector('#mdkr-shot-preview');el.replaceChildren();if(!file)return;if(!file.type.startsWith('image/')){el.textContent='이미지 형식이 아닙니다.';return}const image=document.createElement('img');image.className='mdkr-upload-preview';const url=URL.createObjectURL(file);image.onload=()=>URL.revokeObjectURL(url);image.src=url;image.alt='제출 증빙 미리보기';el.append(image)});
  const submitBtn=view.querySelector('#submitBtn'), out=view.querySelector('#submitMsg');
  submitBtn.onclick=async()=>{
    const chartId=sel.value; const song=songByChart(chartId);
    const judge=view.querySelector('#judge').value;
    const accuracyRaw=view.querySelector('#accuracy').value.trim();
    const accuracy=accuracyRaw?Number(accuracyRaw):null;
    const early=Number(view.querySelector('#early').value||0),late=Number(view.querySelector('#late').value||0),great=Number(view.querySelector('#great').value||0),miss=Number(view.querySelector('#miss').value||0);
    const file=view.querySelector('#shot').files[0];
    if(!chartId||!song||!Number.isInteger(early)||!Number.isInteger(late)||!Number.isInteger(great)||!Number.isInteger(miss)||early<0||late<0||great<0||miss<0||!file){out.textContent='입력값과 스크린샷을 확인해주세요.';return}
    if((judge==='AP'&&(great!==0||miss!==0))||(judge==='FC'&&miss!==0)){out.textContent='AP는 GREAT/MISS가 0, FC는 MISS가 0이어야 합니다.';return}
    if(accuracy!==null && (!(accuracy>=0&&accuracy<=100))){out.textContent='정확도는 0~100 사이로 입력해주세요.';return}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){out.textContent='PNG/JPG/WebP 이미지만 업로드할 수 있으며 최대 8MB입니다.';return}
    submitBtn.disabled=true; out.textContent='이미지를 업로드하는 중…';
    const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type], path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;
    try{
      const up=await db.storage.from('mdkr-evidence').upload(path,file,{contentType:file.type,upsert:false}); if(up.error) throw up.error;
      const ins=await db.from('submissions').insert({
        user_id:currentUser.id,chart_id:chartId,judge,accuracy,early,late,great,miss,
        level:song.level, chart_type:song.chart_type, song_title:title(song), screenshot_path:path
      });
      if(ins.error) throw ins.error;
      out.textContent='✓ 제출 완료! 관리자의 검수를 기다려주세요.';
    }catch(err){out.textContent='제출 실패: '+msg(err)}finally{submitBtn.disabled=false}
  };
};
admin=async function(){
  setActive('admin');
  view.innerHTML='<h2>관리자 기록 검수</h2><div id="reviewarea" class="panel">확인 중…</div>';
  const box=view.querySelector('#reviewarea');
  if(!db){box.innerHTML=disableMsg();return}
  if(!currentUser||!adminUser){box.innerHTML=note('이 페이지는 등록된 관리자만 볼 수 있습니다.');return}
  const pendingRes=await db.from('submissions').select('id,user_id,chart_id,judge,accuracy,early,late,great,miss,status,screenshot_path,created_at').eq('status','PENDING').order('created_at',{ascending:true}).limit(50);
  const approvedRes=await db.from('submissions').select('id,user_id,chart_id,judge,accuracy,early,late,great,miss,status,screenshot_path,created_at').eq('status','APPROVED').order('created_at',{ascending:false}).limit(20);
  if(pendingRes.error){box.textContent=msg(pendingRes.error);return}
  const pend=pendingRes.data||[], appr=approvedRes.data||[];
  function itemHtml(x, approved=false){return `<div class="reviewitem" data-id="${safe(x.id)}"><p><b>${safe(chartTitle(x.chart_id))}</b> · ${safe(x.judge)} · 세부 ${detailScore(x)}</p><p class="muted">E/L ${x.early}/${x.late} · G/M ${x.great}/${x.miss}${x.accuracy!=null?` · 정확도 ${safe(x.accuracy)}`:''}</p><p class="muted">제출자 ${safe(x.user_id)} · ${new Date(x.created_at).toLocaleString('ko-KR')}</p><button class="button evidence" data-path="${safe(x.screenshot_path)}">스크린샷 확인</button> ${approved?'':`<button class="button primary decision" data-action="APPROVED">승인</button> <button class="button decision" data-action="REJECTED">반려</button>`} <button class="button danger delete-record">기록 삭제</button><div class="evidencearea"></div><p class="muted output"></p></div>`}
  box.innerHTML=`<h3>승인 대기 · ${pend.length}건 (최대 50건 표시)</h3>${pend.length?pend.map(x=>itemHtml(x,false)).join(''):'<p class="muted">대기 중인 기록이 없습니다.</p>'}<hr class="line"><h3>최근 승인 기록 · ${appr.length}건</h3>${appr.length?appr.map(x=>itemHtml(x,true)).join(''):'<p class="muted">아직 승인 기록이 없습니다.</p>'}`;
  box.querySelectorAll('.evidence').forEach(b=>b.onclick=async()=>{const area=b.closest('.reviewitem').querySelector('.evidencearea'); const res=await db.storage.from('mdkr-evidence').createSignedUrl(b.dataset.path,120); area.innerHTML=res.error?safe(msg(res.error)):`<a href="${safe(res.data.signedUrl)}" target="_blank" rel="noopener">새 탭으로 원본 보기</a><br><img style="max-width:100%;max-height:370px;margin-top:8px" src="${safe(res.data.signedUrl)}" alt="검수용 스크린샷">`;});
  box.querySelectorAll('.decision').forEach(b=>b.onclick=async()=>{const row=b.closest('.reviewitem'); const act=b.dataset.action; let reason=null; if(act==='REJECTED'){reason=prompt('반려 사유 (추천: 결과 화면 확인 불가 / 채보 불일치 / 판정 수치 불일치 / 중복 제출 / 이미지 누락)\n사유를 입력하세요.', '결과 화면 확인 불가'); if(!reason||reason.trim().length<3) return;} else if(!confirm('이 기록을 승인하고 랭킹에 반영하시겠습니까?')) return; b.disabled=true; const res=await db.rpc('review_mdkr_submission',{p_id:row.dataset.id,p_action:act,p_reason:reason}); if(res.error){row.querySelector('.output').textContent=msg(res.error); b.disabled=false;} else {row.querySelector('.output').textContent=act==='APPROVED'?'승인 완료':'반려 완료'; setTimeout(()=>route(),500);} });
  const cleanup=document.createElement('section');cleanup.className='panel';cleanup.id='mdkr-cleanup';
  cleanup.innerHTML=`<h3>스크린샷 보관함 정리</h3><p class="muted">승인 · 대기 · 반려 · 무효화 기록 모두 선택할 수 있습니다. 이미지 삭제 시 기록과 순위는 유지되지만 증빙은 복구되지 않습니다.</p><div class="filters"><select id="cleanup-status"><option value="ALL">모든 상태</option><option value="APPROVED">승인</option><option value="PENDING">대기</option><option value="REJECTED">반려</option><option value="VOIDED">무효화</option></select><button class="button" id="cleanup-load">대상 불러오기</button></div><div id="cleanup-list"></div><button class="button danger" id="cleanup-delete" disabled>선택한 이미지 영구 삭제</button><p id="cleanup-output" class="muted"></p>`;
  box.after(cleanup);
  const load=cleanup.querySelector('#cleanup-load'),list=cleanup.querySelector('#cleanup-list'),del=cleanup.querySelector('#cleanup-delete'),output=cleanup.querySelector('#cleanup-output');
  let candidates=[];
  load.onclick=async()=>{
    output.textContent='보관함을 확인하는 중…';del.disabled=true;
    let q=db.from('submissions').select('id,chart_id,status,screenshot_path,evidence_deleted_at,created_at').order('created_at',{ascending:false}).limit(300);
    const st=cleanup.querySelector('#cleanup-status').value;if(st!=='ALL')q=q.eq('status',st);
    const res=await q;if(res.error){output.textContent=msg(res.error);return}
    candidates=(res.data||[]).filter(x=>x.screenshot_path&&!x.evidence_deleted_at);
    list.innerHTML=candidates.length?`<label><input type="checkbox" id="cleanup-all"> 현재 목록 전체 선택</label><div class="mdkr-cleanup-list">${candidates.map(x=>`<label><input type="checkbox" class="cleanup-check" value="${safe(x.id)}"> <b>${safe(chartTitle(x.chart_id))}</b> · ${safe(x.status)} · ${new Date(x.created_at).toLocaleDateString('ko-KR')} <small>${safe(x.screenshot_path)}</small></label>`).join('')}</div>`:'<p class="muted">정리 가능한 이미지가 없습니다.</p>';
    output.textContent=`최신 ${candidates.length}건 표시 · 오래된 기록은 날짜순으로 별도 조회해야 합니다.`;
    list.querySelector('#cleanup-all')?.addEventListener('change',e=>{list.querySelectorAll('.cleanup-check').forEach(c=>c.checked=e.target.checked);del.disabled=!e.target.checked});
    list.querySelectorAll('.cleanup-check').forEach(c=>c.addEventListener('change',()=>{del.disabled=!list.querySelector('.cleanup-check:checked')}));
  };
  del.onclick=async()=>{
    const ids=new Set([...list.querySelectorAll('.cleanup-check:checked')].map(x=>x.value));const chosen=candidates.filter(x=>ids.has(x.id));
    if(!chosen.length)return;
    const approved=chosen.filter(x=>x.status==='APPROVED').length;
    if(!confirm(`${chosen.length}개의 증빙 스크린샷을 영구 삭제하시겠습니까?\n승인 기록 ${approved}건 포함. 기록과 랭킹은 그대로 남지만 검증 이미지가 사라집니다.`))return;
    if(approved&&prompt('승인 기록 증빙도 삭제됩니다. 계속하려면 삭제합니다 를 정확히 입력하세요.')!=='삭제합니다')return;
    del.disabled=true;let success=0,failed=[];
    for(const x of chosen){
      const rm=await db.storage.from('mdkr-evidence').remove([x.screenshot_path]);
      if(rm.error){failed.push(`${chartTitle(x.chart_id)}: ${msg(rm.error)}`);continue}
      const log=await db.rpc('mdkr_log_evidence_cleanup',{p_submission_id:x.id,p_path:x.screenshot_path});
      if(log.error)failed.push(`${chartTitle(x.chart_id)}: 파일은 삭제되었지만 감사 기록 실패 (${msg(log.error)})`);else success++;
    }
    output.textContent=`정리 완료 ${success}건 · 오류 ${failed.length}건. ${failed.join(' / ')}`;
    await load.onclick();
  };
  box.querySelectorAll('.delete-record').forEach(b=>b.onclick=async()=>{const row=b.closest('.reviewitem'); if(!confirm('이 기록을 완전히 삭제할까요?')) return; b.disabled=true; const res=await db.rpc('delete_mdkr_submission',{p_id:row.dataset.id}); if(res.error){row.querySelector('.output').textContent=msg(res.error); b.disabled=false;} else {row.querySelector('.output').textContent='삭제 완료'; setTimeout(()=>route(),300);} });
};
if(db){db.auth.onAuthStateChange(()=>{setTimeout(startAuth,0)})}
startAuth();
})();
<script src="mdkr_edit.js" defer></script>
