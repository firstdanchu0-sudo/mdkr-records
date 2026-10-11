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
  const upd=await db.from('profiles').upsert({id:currentUser.id,nickname,avatar_url:avatar},{onConflict:'id'});
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
  body.innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${r.rank}위</strong></td><td><a href="#/players?user=${encodeURIComponent(r.user_id)}">${safe(r.nickname)}</a></td><td>${safe(r.judge)}</td><td>${r.detail_score}</td><td>${r.early} / ${r.late}</td><td>${r.great} / ${r.miss}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty">아직 승인된 기록이 없습니다.</div></td></tr>`;
};
async function fetchPlayerStats(){
  if(!db) return [];
  const r=await db.from('mdkr_player_stats').select('*');
  if(r.error) throw r.error;
  return r.data||[];
}
function fmtNum(v,fix=2){return (v===null||v===undefined||Number.isNaN(Number(v)))?'—':Number(v).toFixed(fix)}
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
      <div class="panel"><h3>최근 제출 기록</h3>${subs.length?`<div class="table-wrap"><table class="ranks"><thead><tr><th>곡</th><th>판정</th><th>세부</th><th>정확도</th><th>상태</th><th>제출일</th></tr></thead><tbody>${subs.map(r=>`<tr><td><a href="#/chart/${encodeURIComponent(r.chart_id)}">${safe(chartTitle(r.chart_id))}</a></td><td>${safe(r.judge)}</td><td>${detailScore(r)} <span class="muted">(${r.early}/${r.late}, ${r.great}/${r.miss})</span></td><td>${r.accuracy==null?'—':safe(r.accuracy)}</td><td>${safe(r.status)}${r.rejection_reason?`<div class="muted">${safe(r.rejection_reason)}</div>`:''}</td><td>${new Date(r.created_at).toLocaleDateString('ko-KR')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">아직 제출 기록이 없습니다.</p>'}</div>`;
    return;
  }
  view.innerHTML=`<div class="section-head"><div><h2>플레이어 랭킹</h2><div class="muted">전일 · 평균 정확도 · E/L · 포인트 랭킹</div></div></div><div class="filters" id="sortFilters"></div><div class="table-wrap"><table class="ranks"><thead><tr><th>순위</th><th>플레이어</th><th>전일</th><th>포인트</th><th>정확도</th><th>평균 E+L</th><th>TOP 10</th></tr></thead><tbody id="playerRows"><tr><td colspan="7">불러오는 중…</td></tr></tbody></table></div>`;
  const all=await fetchPlayerStats();
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
    body.innerHTML=rows.length?rows.map((r,i)=>`<tr><td><strong>${i+1}위</strong></td><td><a href="#/players?user=${encodeURIComponent(r.user_id)}">${safe(r.nickname)}</a></td><td>${r.total_firsts||0}</td><td>${Math.round(r.points||0)}</td><td>${fmtNum(r.avg_accuracy,3)}</td><td>${fmtNum(r.avg_el,2)}</td><td>${r.top10_count||0}</td></tr>`).join(''):'<tr><td colspan="7">표시할 플레이어가 없습니다.</td></tr>';
  }
  render();
};
submit=async function(){
  setActive('submit');
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  const selected=params.get('chart');
  view.innerHTML=`<h2>기록 제출</h2><div id="submitNotice"></div><div class="panel form"><label for="chart-search">곡 검색</label><input id="chart-search" type="text" placeholder="곡명 또는 아티스트 검색"><label for="chart">악곡 및 채보</label><select id="chart"></select><label for="judge">판정</label><select id="judge"><option value="AP">AP</option><option value="FC">FC</option><option value="OTHER">OTHER</option></select><div class="statrow"><div style="flex:1"><label for="accuracy">정확도 (%)</label><input id="accuracy" type="number" min="0" max="100" step="0.001" placeholder="예: 99.823"></div><div style="flex:1"><label for="early">EARLY</label><input id="early" type="number" min="0" value="0"></div><div style="flex:1"><label for="late">LATE</label><input id="late" type="number" min="0" value="0"></div></div><div class="statrow"><div style="flex:1"><label for="great">GREAT</label><input id="great" type="number" min="0" value="0"></div><div style="flex:1"><label for="miss">MISS</label><input id="miss" type="number" min="0" value="0"></div></div><div class="muted">세부값 = EARLY + LATE + GREAT + (MISS × 2)</div><label for="shot">스크린샷</label><input id="shot" type="file" accept="image/png,image/jpeg,image/webp"><button class="button primary" style="margin-top:20px" id="submitBtn">기록 제출</button><div id="submitMsg" class="muted" style="margin-top:12px"></div></div>`;
  const info=view.querySelector('#submitNotice');
  if(!db){info.innerHTML=disableMsg();return}
  if(!currentUser){info.innerHTML=note('기록 제출은 Discord 로그인 후 이용할 수 있습니다.');return}
  const sel=view.querySelector('#chart');
  function renderOptions(query=''){
    const q=query.trim().toLowerCase();
    const filtered=songs.filter(s=>!q||[title(s),s.title,s.title_ko,s.artist].some(v=>String(v??'').toLowerCase().includes(q)));
    sel.innerHTML=filtered.map(s=>`<option value="${safe(s.chart_id)}" ${selected===s.chart_id?'selected':''}>${safe(title(s))} · Lv.${s.level}${s.chart_type==='HIDDEN'?' HIDDEN':''}</option>`).join('');
  }
  renderOptions();
  view.querySelector('#chart-search').addEventListener('input',e=>renderOptions(e.target.value));
  const submitBtn=view.querySelector('#submitBtn'), out=view.querySelector('#submitMsg');
  submitBtn.onclick=async()=>{
    const chartId=sel.value; const song=songByChart(chartId);
    const judge=view.querySelector('#judge').value;
    const accuracyRaw=view.querySelector('#accuracy').value.trim();
    const accuracy=accuracyRaw?Number(accuracyRaw):null;
    const early=Number(view.querySelector('#early').value||0),late=Number(view.querySelector('#late').value||0),great=Number(view.querySelector('#great').value||0),miss=Number(view.querySelector('#miss').value||0);
    const file=view.querySelector('#shot').files[0];
    if(!chartId||!song||!Number.isInteger(early)||!Number.isInteger(late)||!Number.isInteger(great)||!Number.isInteger(miss)||early<0||late<0||great<0||miss<0||!file){out.textContent='입력값과 스크린샷을 확인해주세요.';return}
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
  box.querySelectorAll('.decision').forEach(b=>b.onclick=async()=>{const row=b.closest('.reviewitem'); const act=b.dataset.action; let reason=null; if(act==='REJECTED'){reason=prompt('반려 사유를 3글자 이상 입력하세요.'); if(!reason||reason.trim().length<3) return;} else if(!confirm('이 기록을 승인하고 랭킹에 반영하시겠습니까?')) return; b.disabled=true; const res=await db.rpc('review_mdkr_submission',{p_id:row.dataset.id,p_action:act,p_reason:reason}); if(res.error){row.querySelector('.output').textContent=msg(res.error); b.disabled=false;} else {row.querySelector('.output').textContent=act==='APPROVED'?'승인 완료':'반려 완료'; setTimeout(()=>route(),500);} });
  box.querySelectorAll('.delete-record').forEach(b=>b.onclick=async()=>{const row=b.closest('.reviewitem'); if(!confirm('이 기록을 완전히 삭제할까요?')) return; b.disabled=true; const res=await db.rpc('delete_mdkr_submission',{p_id:row.dataset.id}); if(res.error){row.querySelector('.output').textContent=msg(res.error); b.disabled=false;} else {row.querySelector('.output').textContent='삭제 완료'; setTimeout(()=>route(),300);} });
};
if(db){db.auth.onAuthStateChange(()=>{setTimeout(startAuth,0)})}
startAuth();
})();
