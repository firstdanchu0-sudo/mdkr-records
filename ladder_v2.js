/* MDKR Friendly 2.5: persistent choices, per-level profiles, results reveal. Requires v25 SQL. */
(()=>{'use strict';
const cfg=window.MDKR_CONFIG||{};
const db=window.supabase?.createClient&&cfg.supabaseUrl&&cfg.supabaseAnonKey?
 window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:false,persistSession:true}}):null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const list=()=>typeof songs!=='undefined'?songs:[];
const chart=id=>list().find(x=>x.chart_id===id);
const art=id=>esc(chart(id)?.cover_path||chart(id)?.cover_url||'');
const name=id=>esc(chart(id)?.title||id||'알 수 없는 곡');
const $=s=>document.querySelector(s);
const routed=()=>location.hash.split('?')[0]==='#/ladder';
let tick=0,poll=null,clock=null,startTime=0,signature='',myId=null,selected=null,banBusy=false,rpcBusy=false,mode='',lastMatch=null;
let assignedCharacter='',assignedMatchId=null;
let lastState=null, refreshInFlight=false, revealPending=false, revealSnapshot=null, initializedState=false;
const preferenceKey=()=>`mdkr_friendly_preferences_v25_${myId||'guest'}`;
function getPrefs(){try{return JSON.parse(localStorage.getItem(preferenceKey())||'{}')}catch{return {}}}
function savePrefs(){try{const min=$('#mdv22-min'),max=$('#mdv22-max'),pick=$('#mdv22-pick');if(!min||!max||!pick)return;localStorage.setItem(preferenceKey(),JSON.stringify({min:Number(min.value),max:Number(max.value),onepick:pick.value}));}catch(e){console.warn('Preferences not saved',e)}}
function accurate(x){return Number(x??0).toFixed(4)}
function roundOutcome(r){if(r.win==='draw')return '무승부 · 양쪽 +1';return r.win==='a'?'왼쪽 승리':'오른쪽 승리'}

const msg=s=>{let el=$('#mdv22-msg');if(el)el.textContent=s};
const stage=s=>{let el=$('#mdv22-stage');if(el)el.innerHTML=s};
function cleanup(){if(poll)clearInterval(poll);if(clock)clearInterval(clock);poll=clock=null;$('#mdv22')?.remove();document.body.classList.remove('mdv22-open')}
function elapsed(){let el=$('#mdv22-clock');if(el&&startTime){let sec=Math.floor((Date.now()-startTime)/1000);el.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}}
function item(id,i){const s=chart(id);return `<div class="mdv22-song ${selected===id?'chosen':''}" data-song="${esc(id)}" role="button" tabindex="0"><div class="mdv22-song-number">${String(i+1).padStart(2,'0')} <b>LV.${esc(s?.level||'?')}</b></div><img src="${art(id)}" alt="" loading="lazy"><strong title="${name(id)}">${name(id)}</strong><small>${esc(s?.chart_type||'MASTER')}</small></div>`}
async function rpc(fn,args={}){if(rpcBusy)return;rpcBusy=true;try{let {error}=await db.rpc(fn,args);if(error)throw error;signature='';await refresh(true)}catch(e){msg(e.message||String(e))}finally{rpcBusy=false}}
function picks(){
 const min=Number($('#mdv22-min')?.value||7),max=Number($('#mdv22-max')?.value||9),q=($('#mdv22-search')?.value||'').toLowerCase().trim(),one=$('#mdv22-pick');if(!one)return;
 const current=one.value||getPrefs().onepick||'';
 const results=list().filter(s=>Number(s.level)>=min&&Number(s.level)<=max&&[s.title,s.artist,s.title_ko].some(x=>String(x||'').toLowerCase().includes(q)));
 const picked=results.find(s=>s.chart_id===current);const subset=results.slice(0,400);
 if(picked&&!subset.some(s=>s.chart_id===picked.chart_id))subset.unshift(picked);
 one.innerHTML=subset.map(s=>`<option value="${esc(s.chart_id)}">${esc(s.title)} · Lv.${s.level}</option>`).join('')||'<option value="">곡이 없습니다</option>';
 if(subset.some(s=>s.chart_id===current))one.value=current;
 savePrefs();
}
function lobby(){mode='lobby';startTime=0;stage(`<div class="mdv22-center mdv22-lobby"><span class="mdv22-caption">FRIENDLY MATCH</span><h2>친선전</h2><p>원픽을 고르고 상대를 찾아보세요.</p><div class="mdv22-fields"><label>최소 레벨<select id="mdv22-min">${[7,8,9,10,11,12].map(n=>`<option>${n}</option>`).join('')}</select></label><label>최대 레벨<select id="mdv22-max">${[7,8,9,10,11,12].map(n=>`<option ${n===9?'selected':''}>${n}</option>`).join('')}</select></label><label class="wide">원픽<input id="mdv22-search" placeholder="곡명 검색"><select id="mdv22-pick"></select></label></div><label class="mdv22-ack"><input type="checkbox" id="mdv22-own"> 선택 범위의 곡을 플레이할 수 있어요 (DLC·해금 확인)</label><button class="mdv22-primary" id="mdv22-join">매칭 시작</button><button class="mdv22-quiet" id="mdv25-profile">내 친선전 프로필</button><div class="mdv22-sub">5곡 → 비공개 동시 밴 → 3곡 대전 · 점수 변동 없음</div></div>`);const prefs=getPrefs();
 if([7,8,9,10,11,12].includes(prefs.min))$('#mdv22-min').value=String(prefs.min);
 if([7,8,9,10,11,12].includes(prefs.max))$('#mdv22-max').value=String(prefs.max);
 ['min','max'].forEach(k=>$('#mdv22-'+k).addEventListener('change',picks));
 $('#mdv22-search').addEventListener('input',picks);picks();
 $('#mdv22-pick').addEventListener('change',savePrefs);
 $('#mdv25-profile').onclick=()=>showProfile(myId);
 $('#mdv22-join').onclick=()=>{const a=Number($('#mdv22-min').value),b=Number($('#mdv22-max').value),one=$('#mdv22-pick').value;if(a>b)return msg('난이도 범위를 확인해 주세요.');if(!$('#mdv22-own').checked)return msg('플레이 가능 여부를 확인해 주세요.');if(!one)return msg('원픽을 선택해 주세요.');savePrefs();rpc('mdkr_ladder_join',{p_min:a,p_max:b,p_onepick:one})}}
async function showProfile(userId){
 if(!db||!userId)return;
 const old=$('#mdv25-profile-modal');if(old)old.remove();
 const wrap=document.createElement('div');wrap.id='mdv25-profile-modal';wrap.className='mdv25-profile-overlay';
 wrap.innerHTML='<div class="mdv25-profile-sheet"><button type="button" id="mdv25-profile-close" class="mdv22-quiet">닫기</button><div id="mdv25-profile-data">프로필 불러오는 중…</div></div>';
 $('#mdv22').append(wrap);wrap.querySelector('#mdv25-profile-close').onclick=()=>wrap.remove();
 wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});
 const {data,error}=await db.rpc('mdkr_friendly_profile',{p_user_id:userId});
 if(!wrap.isConnected)return;
 if(error){wrap.querySelector('#mdv25-profile-data').textContent=error.message;return}
 const p=data||{},rows=p.levels||[];
 const avg=(v)=>v===null||v===undefined?'—':Number(v).toFixed(2);
 wrap.querySelector('#mdv25-profile-data').innerHTML=`<div class="mdv25-profile-hero">${avatar(p.avatar_url,p.nickname)}<div><small>FRIENDLY PROFILE</small><h2>${esc(p.nickname||'플레이어')}</h2><span>경기 승리 ${Number(p.match_wins||0)}회 · 플레이한 경기 ${Number(p.matches||0)}회</span></div></div><div class="mdv25-profile-scroll"><table class="mdv25-profile-table"><thead><tr><th>레벨</th><th>판수</th><th>평균 정확도</th><th>평균 E/L</th><th>승률</th><th>승리</th><th>무승부</th></tr></thead><tbody>${rows.map(r=>`<tr><th>Lv.${r.level}</th><td>${Number(r.games)}</td><td>${avg(r.avg_accuracy)}%</td><td>${avg(r.avg_el)}</td><td>${avg(r.win_rate)}%</td><td>${Number(r.wins)}</td><td>${Number(r.draws)}</td></tr>`).join('')||'<tr><td colspan="7">아직 플레이한 라운드가 없어요.</td></tr>'}</tbody></table></div><p class="mdv25-profile-note">승률 = 해당 레벨 라운드 승리 수 ÷ 완료 라운드 수. 무승부는 승리 횟수에 포함하지 않습니다.</p>`;
}

function queue(){mode='queued';if(!startTime)startTime=Date.now();stage(`<div class="mdv22-center mdv22-searching"><div class="mdv22-ring">VS</div><h2>상대 찾는 중</h2><div id="mdv22-clock" class="mdv22-timer">00:00</div><button class="mdv22-quiet" id="mdv22-cancel">취소</button></div>`);elapsed();$('#mdv22-cancel').onclick=()=>rpc('mdkr_ladder_cancel')}
function ban(o){mode='ban';const ids=o.charts||[];const done=o.my_ban_submitted;selected=null;banBusy=done;startTime=0;stage(`<div class="mdv22-matchtop"><span>밴픽</span><strong>${esc(o.player_a)} <em>VS</em> ${esc(o.player_b)}</strong></div><h2 class="mdv22-head">한 곡을 밴하세요</h2><p class="mdv22-hint">더블클릭으로 확정 · 상대의 밴은 공개되지 않아요</p><div class="mdv22-five">${ids.map(item).join('')}</div><div class="mdv22-center">${done?'<strong class="mdv22-locked">선택 완료 · 상대 기다리는 중</strong>':'<button class="mdv22-primary" id="mdv22-ban" disabled>밴 확정</button>'}<button class="mdv22-quiet" id="mdv22-forfeit">경기 나가기</button></div>`);
if(!done){$('#mdv22-ban').onclick=()=>selected&&submitBan(selected);document.querySelectorAll('#mdv22 .mdv22-song').forEach(el=>{const id=el.dataset.song;el.onclick=()=>selectBan(id);el.ondblclick=()=>submitBan(id);el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();selected===id?submitBan(id):selectBan(id)}}})}
$('#mdv22-forfeit').onclick=()=>closeMatch(o.match_id);bindProfileButtons(o)}
function selectBan(id){if(banBusy)return;selected=id;document.querySelectorAll('.mdv22-song').forEach(el=>el.classList.toggle('chosen',el.dataset.song===id));if($('#mdv22-ban'))$('#mdv22-ban').disabled=false}
async function submitBan(id){if(banBusy||!id)return;banBusy=true;msg('밴을 저장하고 있어요…');try{const {error}=await db.rpc('mdkr_ladder_ban',{p_chart_id:id});if(error)throw error;signature='';await refresh(true)}catch(e){banBusy=false;msg(e.message||String(e))}}
function avatar(url,label){const safe=esc(url||'');return safe&&/^https:\/\//i.test(url)?`<img class="mdv23-avatar" src="${safe}" alt="${esc(label)} 프로필" referrerpolicy="no-referrer" onerror="this.style.display='none'">`:`<span class="mdv23-avatar-fallback">${esc(String(label||'?').slice(0,1))}</span>`}
function player(o,side){const label=side==='a'?o.player_a:o.player_b,photo=side==='a'?o.player_a_avatar:o.player_b_avatar,points=side==='a'?o.wins_a:o.wins_b;return `<div class="mdv23-player ${o.my_side===side?'self':''}"><div class="mdv23-portrait">${avatar(photo,label)}</div><span>${o.my_side===side?'나':'상대'}</span><strong>${esc(label||'플레이어')}</strong><b>${Number(points||0)}<small> 승점</small></b><button type="button" class="mdv25-player-profile" data-profile-side="${side}">프로필</button></div>`}
function resultRows(o,includeCurrent=true){let played=o.played||[];let parts=[];for(let n=1;n<=3;n++){
 let r=played.find(x=>Number(x.round)===n),now=o.phase==='rounds'&&Number(o.round_no)===n,done=o.phase==='finished'&&n>Number(o.round_no);
 let inner='';if(r){const win=roundOutcome(r);inner=`<div class="mdv23-row-song">${name(r.chart)}</div><div class="mdv23-row-stats"><span>${accurate(r.accuracy_a)}%</span><b>${win}</b><span>${accurate(r.accuracy_b)}%</span></div>${n===3?`<div class="mdv23-detail">세부 ${Number(r.detail_a)} : ${Number(r.detail_b)} · E/L/G/M ${r.early_a}/${r.late_a}/${r.great_a}/${r.miss_a} : ${r.early_b}/${r.late_b}/${r.great_b}/${r.miss_b}</div>`:''}`}
 else if(now&&includeCurrent)inner=`<div class="mdv23-row-song">${name(o.current_chart)}</div><div class="mdv23-row-wait">플레이 중 · 상대 결과 대기</div>`;
 else if(done&&o.unplayed_chart&&n===3)inner=`<div class="mdv23-row-song">${name(o.unplayed_chart)}</div><div class="mdv23-row-wait">미플레이 · 경기 종료 후 공개</div>`;
 else inner=`<div class="mdv23-row-wait">${n===3?'마지막 곡 비공개':'아직 비공개'}</div>`;
 parts.push(`<div class="mdv23-roundrow ${now?'active':''} ${r?'completed':''}"><div class="mdv23-row-title">ROUND ${n}${n===3?' · HARD':''}</div>${inner}</div>`)}return parts.join('')}
function matchup(o){return `<div class="mdv23-matchup">${player(o,'a')}<div class="mdv23-centerboard"><div class="mdv23-vs">VS</div>${resultRows(o)}</div>${player(o,'b')}</div>`}
function bindProfileButtons(o){
 document.querySelectorAll('#mdv22 .mdv25-player-profile').forEach(b=>{
  b.onclick=()=>showProfile(b.dataset.profileSide==='a'?o.player_a_id:o.player_b_id);
 });
}
function revealResults(oldState,o){
 revealPending=true;revealSnapshot=o;
 const oldCount=(oldState?.played||[]).length;
 const newly=(o.played||[]).slice(oldCount);
 const r=newly[newly.length-1];
 if(!r){revealPending=false;return false}
 const result=r.win==='draw'?'무승부!':r.win===o.my_side?'승리!':'패배';
 const leftName=o.player_a||'플레이어 A',rightName=o.player_b||'플레이어 B';
 stage(`<section class="mdv25-reveal"><span class="mdv22-caption">ROUND ${r.round} · 결과</span><h2 class="mdv25-reveal-outcome">${result}</h2><div class="mdv25-versus"><div>${avatar(o.player_a_avatar,leftName)}<strong>${esc(leftName)}</strong><b>${accurate(r.accuracy_a)}%</b></div><div class="mdv25-reveal-vs">VS</div><div>${avatar(o.player_b_avatar,rightName)}<strong>${esc(rightName)}</strong><b>${accurate(r.accuracy_b)}%</b></div></div><div class="mdv25-reveal-song">${name(r.chart)} · ${roundOutcome(r)} ${Number(r.round)===3?`· 세부 ${r.detail_a} : ${r.detail_b}`:''}</div><p>${o.phase==='finished'?'경기 종료!':'다음 라운드 준비 완료'}</p><button id="mdv25-reveal-next" class="mdv22-primary">${o.phase==='finished'?'최종 결과 보기':'다음 곡 공개'}</button></section>`);
 $('#mdv25-reveal-next').onclick=()=>{revealPending=false;signature='';refresh(true)};
 return true;
}

function rulesBanner(){return `<div class="mdv24-rules"><span>이번 경기 설정</span><strong>${esc(assignedCharacter)} + 무음레이</strong><div><b>AP 인디케이터 ON</b><b>오토피버 OFF · 수동피버</b></div></div>`}
function rulesBrief(o){mode='brief';startTime=0;stage(`<div class="mdv24-brief"><span class="mdv22-caption">MATCH START</span><h2>이번 경기 설정</h2><div class="mdv24-role">${esc(assignedCharacter)}</div><p>선택된 캐릭터와 <strong>무음레이</strong>를 함께 사용해 주세요.</p><div class="mdv24-settings"><div>AP 인디케이터 <strong>ON</strong></div><div>오토피버 <strong>OFF</strong> <small>수동피버</small></div></div><p class="mdv24-advice">양쪽 플레이어에게 동일한 설정이 표시됩니다.<br>스크린샷으로 설정 준수 여부를 확인할 수 있으나 자동 검증은 지원하지 않습니다.</p><button id="mdv24-start" class="mdv22-primary">확인 · 1라운드 시작</button></div>`);$('#mdv24-start').onclick=()=>{sessionStorage.setItem('mdkr_friendly_rules_'+o.match_id,'1');play(o)}}
function play(o){mode='play';startTime=0;const id=o.current_chart||(o.charts||[])[0],s=chart(id);stage(`<div class="mdv23-game"><div class="mdv23-matchhead">친선전 · ${Number(o.round_no)}R / 3R${o.round_no===3?' · HARD':''}</div>${rulesBanner()}${matchup(o)}<div class="mdv23-below"><div class="mdv23-current"><img src="${art(id)}" alt=""><div><span>ROUND ${o.round_no}</span><h2>${name(id)}</h2><p>Lv.${esc(s?.level||'?')} · ${esc(s?.chart_type||'MASTER')}</p><small>다음 곡은 이번 라운드 종료 후 공개됩니다.</small></div></div><div class="mdv23-submit">${o.my_submitted?`<div class="mdv22-waittext"><h3>제출 완료</h3><p>${o.opponent_submitted?'결과 확인 중':'상대 기다리는 중…'}</p></div>`:`<form id="mdv22-form"><h3>플레이 결과</h3><div class="mdv22-formgrid"><label>정확도 (%)<input type="number" name="accuracy" min="0" max="100" step="0.0001" required placeholder="99.5000"></label><label>EARLY<input type="number" name="early" min="0" step="1" value="0" required></label><label>LATE<input type="number" name="late" min="0" step="1" value="0" required></label><label>GREAT<input type="number" name="great" min="0" step="1" value="0" required></label><label>MISS<input type="number" name="miss" min="0" step="1" value="0" required></label></div><small class="mdv23-inputnote">정확도 100%면 GREAT·MISS는 자동으로 0이 됩니다.</small><label class="mdv24-agree"><input type="checkbox" name="setupConfirmed" required> 지정된 캐릭터 + 무음레이, AP ON, 수동피버로 플레이했습니다.</label><label class="mdv22-file">F12 스크린샷<input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp" required></label><button type="submit" class="mdv22-primary">제출</button></form>`}</div></div><div class="mdv22-center"><button class="mdv22-quiet" id="mdv22-forfeit">경기 나가기</button></div></div>`);
const form=$('#mdv22-form');if(form){const accuracy=form.elements.accuracy,gr=form.elements.great,mi=form.elements.miss;const sync=()=>{const ap=accuracy.value.trim()!==''&&Number(accuracy.value)===100;for(const el of [gr,mi]){if(ap){el.value='0';el.readOnly=true}else el.readOnly=false;el.classList.toggle('mdv23-readonly',ap)}};accuracy.addEventListener('input',sync);accuracy.addEventListener('change',sync);sync();form.onsubmit=e=>{e.preventDefault();submitResult(o,form)}}$('#mdv22-forfeit').onclick=()=>closeMatch(o.match_id);bindProfileButtons(o)}
async function submitResult(o,form){if(rpcBusy)return;const data=new FormData(form),f=data.get('screenshot'),button=form.querySelector('button[type=submit]');if(!(f instanceof File)||!f.size)return msg('스크린샷을 선택해 주세요.');if(f.size>8*1024*1024)return msg('스크린샷은 8MB 이하만 올릴 수 있어요.');const mime={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[f.type];if(!mime)return msg('PNG, JPG, WEBP만 지원해요.');const nums=['accuracy','early','late','great','miss'].map(k=>Number(data.get(k)));if(nums.some(x=>!Number.isFinite(x)||x<0)||nums[0]>100||[1,2,3,4].some(i=>!Number.isInteger(nums[i])))return msg('판정 입력을 확인해 주세요.');if(nums[0]===100&&(nums[3]!==0||nums[4]!==0))return msg('100%에서는 GREAT·MISS가 0이어야 해요.');
button.disabled=true;rpcBusy=true;msg('스크린샷 올리는 중…');try{const path=`${myId}/${o.match_id}/${o.round_no}/${crypto.randomUUID()}.${mime}`;const uploaded=await db.storage.from('mdkr-ladder-evidence').upload(path,f,{contentType:f.type,upsert:false});if(uploaded.error)throw uploaded.error;
msg('결과를 저장하는 중…');const {error}=await db.rpc('mdkr_ladder_submit_friendly',{p_match_id:o.match_id,p_round:o.round_no,p_score:0,p_accuracy:nums[0],p_early:nums[1],p_late:nums[2],p_great:nums[3],p_miss:nums[4],p_screenshot_path:path});if(error)throw error;signature='';await refresh(true)}catch(e){msg(e.message||String(e));button.disabled=false}finally{rpcBusy=false}}
function finished(o){mode='finished';startTime=0;const result=o.winner==='you'?'승리!':o.winner==='opponent'?'패배':'무승부';const last=o.unplayed_chart;stage(`<div class="mdv23-game"><div class="mdv23-matchhead">경기 종료 · 친선전</div>${assignedCharacter?rulesBanner():''}<h2 class="mdv23-finish-title">${result}</h2>${matchup(o)}${last?`<div class="mdv22-last"><span>3라운드 곡은 이거였습니다!</span><img src="${art(last)}" alt=""><strong>${name(last)}</strong><small>2라운드에서 승부가 끝났어요.</small></div>`:''}<div class="mdv22-center"><p>레이팅 변동 없음</p><button class="mdv22-primary" id="mdv22-back">로비로</button></div></div>`);$('#mdv22-back').onclick=()=>rpc('mdkr_ladder_leave_finished',{p_match_id:o.match_id});bindProfileButtons(o)}
function closeMatch(id){if(confirm('경기를 나가시겠어요? 상대도 경기가 종료돼요.'))rpc('mdkr_ladder_close',{p_match_id:id})}
async function refresh(force=false){
 if(!routed()||!$('#mdv22')||!db||refreshInFlight)return;
 refreshInFlight=true;
 try{
  const {data:o,error}=await db.rpc('mdkr_ladder_state');if(error)throw error;
  const sig=JSON.stringify([o.status,o.phase,o.match_id,o.round_no,o.charts,o.my_ban_submitted,o.my_submitted,o.opponent_submitted,o.wins_a,o.wins_b,o.played,o.winner,o.player_a_avatar,o.player_b_avatar]);
  if(!force&&sig===signature)return;
  if(revealPending){revealSnapshot=o;signature=sig;return}
  const prev=lastState;
  const isSame=prev?.match_id&&prev.match_id===o.match_id;
  lastState=o;
  signature=sig;
  const increment=isSame&&(o.played||[]).length>(prev.played||[]).length;
  if(increment&&(o.phase==='rounds'||o.phase==='finished')){
   if(revealResults(prev,o))return;
  }
  if(o.status==='queued'){
   assignedMatchId=null;assignedCharacter='';if(mode!=='queued')queue();msg('매칭 중…');
  }else if(o.status==='matched'){
   lastMatch=o.match_id;
   if(o.phase==='ban'){ban(o);msg('한 곡을 더블클릭해 밴하세요.');}
   else if(o.phase==='rounds'){
    if(assignedMatchId!==o.match_id||!assignedCharacter){
     const picked=await db.rpc('mdkr_friendly_get_character',{p_match_id:o.match_id});if(picked.error)throw picked.error;
     assignedMatchId=o.match_id;assignedCharacter=picked.data;
    }
    if(o.round_no===1&&!sessionStorage.getItem('mdkr_friendly_rules_'+o.match_id)){
     if(mode!=='brief')rulesBrief(o);msg('설정을 확인해 주세요.');
    }else{
     // Never rebuild a live form just because the browser regained focus.
     if(force||mode!=='play'||prev?.round_no!==o.round_no||prev?.my_submitted!==o.my_submitted)play(o);
     msg('플레이 후 F12 스크린샷을 제출하세요.');
    }
   }else if(o.phase==='finished'){
    if(assignedMatchId!==o.match_id){const picked=await db.rpc('mdkr_friendly_get_character',{p_match_id:o.match_id});if(picked.error)throw picked.error;assignedMatchId=o.match_id;assignedCharacter=picked.data;}
    finished(o);msg('경기 종료!');
   }else{lobby();msg('친선전을 시작해 보세요.')}
  }else{assignedMatchId=null;assignedCharacter='';if(mode!=='lobby'||force)lobby();msg('준비 완료')}
 }catch(e){msg(e.message||String(e))}finally{refreshInFlight=false}
}

async function open(){cleanup();const myTick=++tick;if(!routed())return;document.body.classList.add('mdv22-open');const modal=document.createElement('div');modal.id='mdv22';modal.innerHTML=`<div class="mdv22-dim"></div><div class="mdv22-shell" role="dialog" aria-modal="true" aria-label="친선전"><header><div><small>MDKR RECORDS</small><strong>ONLINE <em>MATCH</em></strong></div><span>FRIENDLY · ELO OFF</span><button id="mdv22-exit" aria-label="닫기">✕</button></header><div class="mdv22-banner">5 PICK <i>·</i> SECRET BAN <i>·</i> 3 ROUND</div><div id="mdv22-msg">연결 중…</div><main id="mdv22-stage"><div class="mdv22-center">로그인 확인 중…</div></main></div>`;document.body.append(modal);$('#mdv22-exit').onclick=()=>location.hash='#/';$('.mdv22-dim').onclick=()=>location.hash='#/';if(!db)return msg('Supabase 연결을 확인해 주세요.');try{const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(myTick!==tick||!routed())return;if(!user){stage('<div class="mdv22-center"><h2>로그인이 필요해요</h2><p>Discord 로그인 후 이용할 수 있어요.</p><a href="#/players">플레이어 페이지로 이동</a></div>');return}myId=user.id;await refresh(true);poll=setInterval(()=>{if(routed()&&myTick===tick&&!document.hidden)refresh()},2500);clock=setInterval(elapsed,1000)}catch(e){msg(e.message||String(e))}}
window.addEventListener('hashchange',()=>{if(routed()){if(!$('#mdv22'))open()}else{tick++;cleanup()}});
window.addEventListener('visibilitychange',()=>{if(!document.hidden&&routed()&&$('#mdv22'))refresh()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&routed())location.hash='#/'});
window.addEventListener('load',()=>{if(routed())open()});
})();
