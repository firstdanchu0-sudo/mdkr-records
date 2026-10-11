/* MDKR RECORDS live extension. Requires config.js and Supabase JS UMD. */
(()=>{
const cfg=window.MDKR_CONFIG||{};
const ready=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient);
const db=ready?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:true}}):null;
let currentUser=null,adminUser=false;
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const msg=e=>e?.message||String(e);
function note(text){return `<div class="notice">${safe(text)}</div>`}
function disableMsg(){return note('Discord 로그인과 기록 DB 준비 중입니다. 관리자에게 Supabase 연결 설정을 요청해주세요.')}
async function startAuth(){
 if(!db){showAuth();return}
 const {data:{session}}=await db.auth.getSession();currentUser=session?.user||null;
 if(currentUser){
  const md=currentUser.user_metadata||{};
  await db.from('profiles').upsert({id:currentUser.id,nickname:md.full_name||md.name||md.user_name||'Player',avatar_url:md.avatar_url||null},{onConflict:'id',ignoreDuplicates:true});
  const r=await db.rpc('is_mdkr_admin');adminUser=r.data===true;
 }else adminUser=false;
 showAuth();if(location.hash.startsWith('#/players')||location.hash.startsWith('#/admin'))route();
}
function showAuth(){let btn=document.querySelector('#account-area');if(!btn){btn=document.createElement('div');btn.id='account-area';document.querySelector('.top').append(btn)}
 btn.innerHTML=currentUser?`<a href="#/players?me=1" class="button">내 프로필</a> <button class="button" id="logout">로그아웃</button>`:`<button class="button primary" id="login" ${!ready?'disabled':''}>Discord 로그인</button>`;
 const login=btn.querySelector('#login');if(login)login.onclick=async()=>{const redirectTo=location.origin+location.pathname;const r=await db.auth.signInWithOAuth({provider:'discord',options:{redirectTo}});if(r.error)alert(msg(r.error))};
 const logout=btn.querySelector('#logout');if(logout)logout.onclick=async()=>{await db.auth.signOut();currentUser=null;adminUser=false;showAuth();route()};
}
async function fetchRanks(chart){if(!db)return[];const r=await db.from('mdkr_rankings').select('*').eq('chart_id',chart).order('rank',{ascending:true}).order('created_at',{ascending:true}).limit(200);if(r.error)throw r.error;return(r.data||[]).filter(x=>x.rank<=10)}
chartPage=async function(id){
setActive('songs');const s=songs.find(x=>x.chart_id===id);if(!s){view.innerHTML='<div class="empty">채보를 찾을 수 없습니다.</div>';return}
view.innerHTML=`<a class="back" href="#/">← 악곡 목록</a><div class="detail">${img(s)}<div><span class="tag">LV.${s.level}</span> ${s.chart_type==='HIDDEN'?'<span class="tag hidden">HIDDEN</span>':''}<h2 style="margin-top:10px">${safe(title(s))}</h2><div class="muted">${safe(s.artist)} · 곡 ID ${safe(s.uid)}<br>채보 ID ${safe(id)}</div></div></div><div class="section-head"><div><h2>한국 전일 TOP 10</h2><p class="muted">AP 우선 · Early + Late 합계 오름차순 · 동점 공동 순위</p></div><a class="button primary" href="#/submit?chart=${encodeURIComponent(id)}">기록 제출</a></div><div class="table-wrap"><table class="ranks"><thead><tr><th>순위</th><th>플레이어</th><th>판정</th><th>EARLY / LATE</th></tr></thead><tbody id="ranksbody"><tr><td colspan="4">랭킹 불러오는 중…</td></tr></tbody></table></div>`;
let rows=[];try{rows=await fetchRanks(id)}catch(e){view.querySelector('#ranksbody').innerHTML=`<tr><td colspan="4">${safe(msg(e))}</td></tr>`;return}
if(!view.querySelector('#ranksbody'))return;
view.querySelector('#ranksbody').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${r.rank}위</strong></td><td><a href="#/players?user=${encodeURIComponent(r.user_id)}">${safe(r.nickname)}</a></td><td>${safe(r.judge)}</td><td>${r.early} / ${r.late}</td></tr>`).join(''):`<tr><td colspan="4"><div class="empty">${ready?'아직 승인된 기록이 없습니다.':'랭킹 서버 연결 전입니다.'}</div></td></tr>`;
};
players=async function(){
setActive('players');view.innerHTML='<h2>플레이어 프로필</h2><div class="muted">승인된 기록을 기준으로 집계합니다.</div><div id="profile-data" class="panel">불러오는 중…</div>';
const params=new URLSearchParams(location.hash.split('?')[1]||'');
const target=params.get('user')||currentUser?.id;
const el=view.querySelector('#profile-data');if(!db){el.innerHTML=disableMsg();return}
if(!target){el.textContent='로그인하거나 채보 랭킹에서 플레이어를 선택해 주세요.';return}
const own=Boolean(currentUser&&currentUser.id===target);
const requests=[db.from('profiles').select('nickname,avatar_url,created_at').eq('id',target).maybeSingle(),db.from('mdkr_rankings').select('chart_id,rank,judge,early,late').eq('user_id',target)];
if(own)requests.push(db.from('submissions').select('id,chart_id,judge,early,late,status,rejection_reason,created_at').eq('user_id',target).order('created_at',{ascending:false}).limit(30));
const [profile,ranking,subs]=await Promise.all(requests);
if(profile.error||ranking.error||(subs&&subs.error)){el.textContent=msg(profile.error||ranking.error||subs?.error);return}
const records=(ranking.data||[]).filter(x=>x.rank<=10),wins=records.filter(x=>x.rank===1).length;
const avg=records.length?(records.reduce((acc,x)=>acc+x.rank,0)/records.length).toFixed(2):'—';
const nick=profile.data?.nickname||currentUser?.user_metadata?.full_name||'Player';
const avatar=profile.data?.avatar_url;
const avatarHtml=avatar&&/^https:\/\//i.test(avatar)?`<img src="${safe(avatar)}" alt="프로필 사진" referrerpolicy="no-referrer" style="width:84px;height:84px;object-fit:cover;border-radius:50%;border:2px solid #555">`:'<div style="width:84px;height:84px;border-radius:50%;background:#313849;display:grid;place-items:center;font-size:32px">♫</div>';
el.innerHTML=`<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">${avatarHtml}<div><h2 style="margin:0">${safe(nick)}</h2><p class="muted" style="margin:6px 0">${own?'내 프로필 · ':''}MDKR RECORDS 플레이어${own&&adminUser?' · 관리자':''}</p></div></div>
<div class="statrow" style="margin-top:24px"><div class="statbox"><strong>${wins}</strong>전일 보유</div><div class="statbox"><strong>${avg}</strong>평균 순위</div><div class="statbox"><strong>${records.length}</strong>TOP 10 진입</div><div class="statbox"><strong>${records.filter(x=>x.judge==='AP').length}</strong>AP 기록</div></div>
${own?'<div style="margin-top:26px"><h3>프로필 편집</h3><label for="profile-nickname">표시 이름</label><input id="profile-nickname" maxlength="24" autocomplete="off" style="max-width:320px" value="'+safe(nick)+'"> <button class="button" id="save-profile">이름 저장</button><p class="muted" id="profile-save-msg">프로필 이미지는 Discord 계정에서 최초 연동됩니다.</p></div>':''}
<h3 style="margin-top:28px">등록 채보 · TOP 10</h3>${records.length?records.sort((x,y)=>x.rank-y.rank).map(r=>{const song=songs.find(x=>x.chart_id===r.chart_id);return `<p><a href="#/chart/${encodeURIComponent(r.chart_id)}">${safe(song?title(song):r.chart_id)}</a> · ${r.rank}위 · ${safe(r.judge)} · EARLY ${r.early} / LATE ${r.late}</p>`}).join(''):'<p class="muted">아직 TOP 10에 진입한 기록이 없습니다.</p>'}
${own?'<h3 style="margin-top:28px">내 제출 내역</h3>'+((subs?.data||[]).length?(subs.data.map(r=>{const song=songs.find(x=>x.chart_id===r.chart_id);const label={PENDING:'검수 대기',APPROVED:'승인',REJECTED:'반려',VOIDED:'무효'}[r.status]||r.status;return `<p><strong>${safe(label)}</strong> · ${safe(song?title(song):r.chart_id)} · ${safe(r.judge)} ${r.early}E/${r.late}L${r.rejection_reason?' · 사유: '+safe(r.rejection_reason):''}</p>`}).join('')):'<p class="muted">제출한 기록이 없습니다.</p>'):''}`;
if(own){const save=el.querySelector('#save-profile');save.onclick=async()=>{const input=el.querySelector('#profile-nickname'),out=el.querySelector('#profile-save-msg'),name=input.value.trim();if(name.length<2||name.length>24){out.textContent='표시 이름은 2~24자로 입력하세요.';return}save.disabled=true;const r=await db.from('profiles').update({nickname:name}).eq('id',currentUser.id);save.disabled=false;if(r.error){out.textContent='저장 실패: '+msg(r.error)}else{out.textContent='표시 이름이 저장되었습니다.';el.querySelector('h2').textContent=name}}}
};
submit=function(){
setActive('submit');const selected=new URLSearchParams(location.hash.split('?')[1]||'').get('chart')||'';
view.innerHTML=`<h2>기록 제출</h2>${!ready?disableMsg():!currentUser?note('기록 제출에는 Discord 로그인이 필요합니다. 오른쪽 위 로그인 버튼을 눌러주세요.'):''}<div class="panel form"><label>악곡 및 채보</label><select id="chart">${songs.map(s=>`<option value="${safe(s.chart_id)}" ${selected===s.chart_id?'selected':''}>${safe(title(s))} · Lv.${s.level} ${safe(s.chart_type)}</option>`).join('')}</select><label>판정</label><select id="judge"><option>AP</option><option>FC</option><option>OTHER</option></select><div class="statrow"><div style="flex:1"><label>EARLY</label><input id="early" type="number" min="0" value="0"></div><div style="flex:1"><label>LATE</label><input id="late" type="number" min="0" value="0"></div></div><label>결과 스크린샷</label><input id="shot" type="file" accept="image/png,image/jpeg,image/webp"><button class="button primary" id="submitrecord" style="margin-top:16px" ${!currentUser?'disabled':''}>검수 요청 보내기</button><p class="muted" id="resultmsg">최대 8MB · 검수 승인 시 랭킹에 반영됩니다.</p></div>`;
view.querySelector('#submitrecord').onclick=async()=>{const button=view.querySelector('#submitrecord'),out=view.querySelector('#resultmsg');if(!currentUser)return;
const s=view.querySelector('#chart').value,e=Number(view.querySelector('#early').value),l=Number(view.querySelector('#late').value),file=view.querySelector('#shot').files[0];
if(!songs.some(x=>x.chart_id===s)||!Number.isInteger(e)||!Number.isInteger(l)||e<0||l<0||e>100000||l>100000||!file){out.textContent='입력값과 스크린샷을 확인해주세요.';return}
if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){out.textContent='PNG/JPG/WebP 이미지만 업로드할 수 있으며 최대 8MB입니다.';return}
button.disabled=true;out.textContent='이미지를 업로드하는 중…';
const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type],path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;
try{const up=await db.storage.from('mdkr-evidence').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
const res=await db.from('submissions').insert({user_id:currentUser.id,chart_id:s,judge:view.querySelector('#judge').value,early:e,late:l,screenshot_path:path});if(res.error)throw res.error;out.textContent='✓ 제출 완료! 관리자의 검수를 기다려주세요.';
}catch(err){out.textContent='제출 실패: '+msg(err)}finally{button.disabled=false}}
};
admin=async function(){setActive('admin');view.innerHTML='<h2>관리자 기록 검수</h2><div id="reviewarea" class="panel">확인 중…</div>';
const box=view.querySelector('#reviewarea');if(!db){box.innerHTML=disableMsg();return}if(!adminUser){box.innerHTML=note('이 페이지는 등록된 관리자만 볼 수 있습니다.');return}
const r=await db.from('submissions').select('id,user_id,chart_id,judge,early,late,screenshot_path,created_at').eq('status','PENDING').order('created_at',{ascending:true}).limit(50);
if(r.error){box.textContent=msg(r.error);return}const items=r.data||[];box.innerHTML=`<h3>승인 대기 · ${items.length}건 (최대 50건 표시)</h3>`+(items.length?items.map(x=>`<div class="reviewitem" data-id="${safe(x.id)}"><p><b>${safe(songs.find(s=>s.chart_id===x.chart_id)?.title||x.chart_id)}</b> · ${safe(x.judge)} · ${x.early}E / ${x.late}L</p><p class="muted">제출자 ${safe(x.user_id)} · ${safe(x.created_at)}</p><button class="button evidence" data-path="${safe(x.screenshot_path)}">스크린샷 확인</button> <button class="button primary decision" data-action="APPROVED">승인</button> <button class="button decision" data-action="REJECTED">반려</button><div class="evidencearea"></div><p class="muted output"></p></div>`).join(''):'<p class="muted">대기 중인 기록이 없습니다.</p>');
box.querySelectorAll('.evidence').forEach(b=>b.onclick=async()=>{const area=b.closest('.reviewitem').querySelector('.evidencearea');const res=await db.storage.from('mdkr-evidence').createSignedUrl(b.dataset.path,120);area.innerHTML=res.error?safe(msg(res.error)):`<a href="${safe(res.data.signedUrl)}" target="_blank" rel="noopener">새 탭으로 원본 보기</a><br><img style="max-width:100%;max-height:370px;margin-top:8px" src="${safe(res.data.signedUrl)}" alt="검수용 스크린샷">`});
box.querySelectorAll('.decision').forEach(b=>b.onclick=async()=>{const row=b.closest('.reviewitem'),act=b.dataset.action;let reason=null;if(act==='REJECTED'){reason=prompt('반려 사유를 3글자 이상 입력하세요.');if(!reason||reason.trim().length<3)return}else if(!confirm('이 기록을 승인하고 랭킹에 반영하시겠습니까?'))return;
b.disabled=true;const res=await db.rpc('review_mdkr_submission',{p_id:row.dataset.id,p_action:act,p_reason:reason});if(res.error){row.querySelector('.output').textContent=msg(res.error);b.disabled=false}else{row.remove();}})
};
if(db){db.auth.onAuthStateChange(()=>{setTimeout(startAuth,0)})}
startAuth();
})();
