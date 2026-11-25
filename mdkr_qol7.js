/* MDKR 2026-11 QoL: music, compact header, album browser, draft guard, admin log, profile ranking & compare.
   Add after all existing app scripts. Does not alter existing scoring/submissions. */
(()=>{'use strict';
const cfg=window.MDKR_CONFIG||{};
const db=(window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseAnonKey)
 ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:false,autoRefreshToken:false}}):null;
const $=(q,root=document)=>root.querySelector(q);
const enc=s=>encodeURIComponent(String(s??''));
const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeHash=()=>decodeURIComponent(location.hash.split('?')[0]||'#/');
const isProfile=()=>activeHash()==='#/players'&&(/\?(me=1|user=)/.test(location.hash)||new URLSearchParams(location.hash.split('?')[1]||'').has('user'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// A. User-triggered BGM; keep the audio element outside #view so SPA navigation doesn't restart it.
function initAudio(){
 const bar=$('.top');if(!bar||$('#mdkr-bgm-wrap'))return;
 const wrap=document.createElement('div');wrap.id='mdkr-bgm-wrap';wrap.innerHTML=`<button type="button" id="mdkr-bgm-toggle" class="mdkr-bgm-button" aria-pressed="false" title="배경음악 켜기">♫ BGM OFF</button><label class="mdkr-bgm-slider" title="배경음악 볼륨"><span>음량</span><input id="mdkr-bgm-volume" type="range" min="0" max="100" step="1" value="20" aria-label="BGM 볼륨"></label>`;
 const audio=document.createElement('audio');audio.id='mdkr-bgm-audio';audio.src='mdkr_ensolarado_loop.mp3';audio.preload='none';audio.loop=true;
 const button=$('#mdkr-bgm-toggle',wrap),volume=$('#mdkr-bgm-volume',wrap);
 let savedVol=20;try{const raw=localStorage.getItem('mdkr-bgm-volume');const n=Number(raw);if(raw!==null&&Number.isFinite(n)&&n>=0&&n<=100)savedVol=n}catch{}
 volume.value=String(savedVol);audio.volume=savedVol/100;
 const sync=()=>{const on=!audio.paused;button.textContent=on?'♫ BGM ON':'♫ BGM OFF';button.setAttribute('aria-pressed',String(on));button.title=on?'배경음악 끄기':'배경음악 켜기';wrap.classList.toggle('playing',on)};
 button.onclick=async()=>{
  if(!audio.paused){audio.pause();sync();try{localStorage.setItem('mdkr-bgm-enabled','0')}catch{};return}
  try{audio.preload='auto';await audio.play();try{localStorage.setItem('mdkr-bgm-enabled','1')}catch{}}catch(e){console.warn('[MDKR BGM] 재생 실패:',e);button.title='브라우저에서 재생을 허용해 주세요'}sync();
 };
 volume.oninput=()=>{audio.volume=Number(volume.value)/100;try{localStorage.setItem('mdkr-bgm-volume',volume.value)}catch{}};
 audio.addEventListener('pause',sync);audio.addEventListener('play',sync);audio.addEventListener('error',()=>{button.textContent='♫ 재생 오류';button.title='mdkr_ensolarado_loop.mp3 파일을 확인하세요'});
 bar.insertBefore(wrap,$('#account-area')||null);bar.append(audio);sync();
 // Deliberately do not autoplay even if user enabled music in an earlier visit.
}

// B. Banner collapsed by default; persist preference on this device.
function initBanner(){
 const nav=$('.tabs');if(!nav||$('#mdkr-banner-toggle'))return;
 let hidden=true;try{hidden=localStorage.getItem('mdkr-banner-hidden')!=='0'}catch{}
 const button=document.createElement('button');button.id='mdkr-banner-toggle';button.type='button';button.className='mdkr-banner-toggle';
 const render=()=>{document.body.classList.toggle('mdkr-banner-hidden',hidden);button.textContent=hidden?'▾ 배너 펼치기':'▴ 배너 접기';button.setAttribute('aria-expanded',String(!hidden))};
 button.onclick=()=>{hidden=!hidden;try{localStorage.setItem('mdkr-banner-hidden',hidden?'1':'0')}catch{}render()};
 nav.append(button);render();
}

// C. Album/pack explorer, based on the chart dataset (7~12 levels; not a separate external chart list).
let activeAlbum='all';
let albumNames={},allAlbumRows=[],albumCount=12,albumTerm='',albumExpanded=false,albumLoadAttempted=false;
function getAlbumRows(){
 const map=new Map();if(typeof songs==='undefined')return [];
 for(const s of songs){const id=String(s.album_id||'UNKNOWN');let a=map.get(id);
  if(!a){a={id,title:String(s.album_title||id),songs:0,uids:new Set(),cover:s.cover_path||s.cover_url||'',artist:s.artist||''};map.set(id,a)}
  a.songs++;a.uids.add(s.uid);
 }
 return [...map.values()].map(a=>({...a,distinct:a.uids.size})).sort((a,b)=>a.id.localeCompare(b.id,'ko',{numeric:true}));
}
function displayAlbum(a){return albumNames[a.id]||a.title||a.id}
async function loadAlbumLabels(){
 if(albumLoadAttempted)return;albumLoadAttempted=true;
 try{const cached=JSON.parse(sessionStorage.getItem('mdkr-album-korean')||'null');if(cached&&Object.keys(cached).length){albumNames=cached;drawAlbumCards();return}}catch{}
 try{
  const r=await fetch('https://api.musedash.moe/albums',{signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('albums HTTP '+r.status);
  const json=await r.json(), mapped={};
  for(const [id,info] of Object.entries(json)){
   const name=info?.Korean?.title||info?.Korean?.name;if(name) mapped[id]=String(name);
  }
  albumNames=mapped;try{sessionStorage.setItem('mdkr-album-korean',JSON.stringify(mapped))}catch{}drawAlbumCards();
 }catch(e){console.info('[MDKR albums] 외부 한국어 앨범 이름 불러오기 실패. 기존 팩 이름 사용:',e.message)}
}
function drawAlbumCards(){
 const box=$('#mdkr-album-cardlist'),heading=$('#mdkr-album-selection');if(!box)return;
 const query=albumTerm.trim().toLocaleLowerCase();
 const filtered=allAlbumRows.filter(a=>!query||[displayAlbum(a),a.title,a.id].some(t=>String(t).toLocaleLowerCase().includes(query)));
 const visible=filtered.slice(0,albumCount);
 box.innerHTML=visible.map(a=>`<button class="mdkr-pack-card ${activeAlbum===a.id?'selected':''}" type="button" data-album="${clean(a.id)}" title="${clean(displayAlbum(a))}"><img loading="lazy" src="${clean(a.cover)}" alt=""><span class="mdkr-pack-name">${clean(displayAlbum(a))}</span><span class="mdkr-pack-count">${a.distinct}곡 · ${a.songs}채보</span></button>`).join('')||'<p class="muted">일치하는 악곡 팩이 없습니다.</p>';
 box.querySelectorAll('[data-album]').forEach(b=>b.onclick=()=>{activeAlbum=b.dataset.album;refreshAlbumUI();if(typeof drawCards==='function')drawCards()});
 const more=$('#mdkr-album-more');if(more){more.hidden=filtered.length<=albumCount;more.textContent=`더 보기 (${Math.max(0,filtered.length-albumCount)}팩)`}
 if(heading)heading.textContent=activeAlbum==='all'?'모든 악곡 팩':`선택: ${displayAlbum(allAlbumRows.find(x=>x.id===activeAlbum)||{id:activeAlbum,title:activeAlbum})}`;
 const clear=$('#mdkr-album-clear');if(clear)clear.disabled=activeAlbum==='all';
}
function refreshAlbumUI(){drawAlbumCards();if(typeof drawCards==='function')drawCards()}
function initAlbumBrowser(){
 const base=$('#view .mdkr-activity-content')||$('#view');if(!base||!$('#songsGrid',base))return;
 if($('#mdkr-album-browser',base))return;
 allAlbumRows=getAlbumRows();
 const panel=document.createElement('section');panel.id='mdkr-album-browser';panel.className='mdkr-album-browser';
 panel.innerHTML=`<div class="mdkr-album-heading"><div><strong>악곡 팩 탐색</strong><p class="muted">MuseDash.moe 악곡 데이터 기반 · 팩별로 보기</p></div><button type="button" class="button" id="mdkr-album-toggle">${albumExpanded?'팩 목록 닫기':'팩으로 찾기'}</button></div><div class="mdkr-album-tools" ${albumExpanded?'':'hidden'}><div class="mdkr-album-searchline"><input id="mdkr-album-search" type="search" placeholder="악곡 팩 이름 검색" aria-label="악곡 팩 검색"><button type="button" class="button" id="mdkr-album-clear">전체 팩</button></div><div id="mdkr-album-selection" class="muted"></div><div class="mdkr-pack-grid" id="mdkr-album-cardlist"></div><button type="button" id="mdkr-album-more" class="button">더 보기</button></div>`;
 const header=$('.section-head',base);if(header)header.after(panel);else base.prepend(panel);
 const tools=$('.mdkr-album-tools',panel),toggle=$('#mdkr-album-toggle',panel);
 toggle.onclick=()=>{albumExpanded=!albumExpanded;tools.hidden=!albumExpanded;toggle.textContent=albumExpanded?'팩 목록 닫기':'팩으로 찾기';if(albumExpanded)drawAlbumCards()};
 $('#mdkr-album-search',panel).addEventListener('input',e=>{albumTerm=e.target.value;albumCount=12;drawAlbumCards()});
 $('#mdkr-album-search',panel).value=albumTerm;
 $('#mdkr-album-clear',panel).onclick=()=>{activeAlbum='all';refreshAlbumUI()};
 $('#mdkr-album-more',panel).onclick=()=>{albumCount+=12;drawAlbumCards()};
 drawAlbumCards();
 if(!Object.keys(albumNames).length)loadAlbumLabels();
}
if(typeof drawCards==='function'){
 const previousDrawCards=drawCards;
 drawCards=function(...args){
  if(activeAlbum==='all'||!$('#songsGrid'))return previousDrawCards.apply(this,args);
  const q=String(currentQuery||'').trim().toLocaleLowerCase();
  const filtered=songs.filter(s=>String(s.album_id||'UNKNOWN')===activeAlbum
   &&(currentLevel==='all'||String(s.level)===String(currentLevel))
   &&(currentChartType==='all'||s.chart_type===currentChartType)
   &&(!q||[s.title,s.title_ko,s.artist,s.album_title].some(v=>String(v??'').toLocaleLowerCase().includes(q))));
  const count=$('#count'),grid=$('#songsGrid');if(!count||!grid)return;
  count.textContent=`${filtered.length}개 채보 검색됨 · ${displayAlbum(allAlbumRows.find(x=>x.id===activeAlbum)||{id:activeAlbum,title:activeAlbum})}`;
  grid.innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">선택한 악곡 팩에 조건과 일치하는 채보가 없습니다.</div>';
  return undefined;
 };
}
if(typeof songList==='function'){
 const previousSongList=songList;
 songList=function(...args){const r=previousSongList.apply(this,args);initAlbumBrowser();return r};
}

// D. Prevent auth refresh from tearing down an already visible submission form.
// Other routes still rerender as usual. Browser reload is handled by session draft.
if(typeof route==='function'){
 const originalRoute=route;
 route=function(...args){
  const form=$('#view #submitBtn'),hash=location.hash;
  if(activeHash()==='#/submit'&&form&&window.__mdkr_submit_view_hash===hash&&!$('#account-area #login')){return}
  if(activeHash()==='#/submit')window.__mdkr_submit_view_hash=hash;
  else window.__mdkr_submit_view_hash=null;
  return originalRoute.apply(this,args);
 };
}
const draftKey='mdkr-records-submission-draft-v3';
const draftIds=['chart-search','chart','judge','accuracy','early','late','great','miss'];
const getDraft=()=>{try{return JSON.parse(sessionStorage.getItem(draftKey)||'null')}catch{return null}};
function saveDraft(){if(activeHash()!=='#/submit'||!$('#submitBtn'))return;
 const values={};for(const id of draftIds){const el=document.getElementById(id);if(el)values[id]=el.value}
 try{sessionStorage.setItem(draftKey,JSON.stringify({values,savedAt:Date.now()}))}catch{}
}
function initDraft(){
 if(activeHash()!=='#/submit')return;
 const btn=$('#view #submitBtn');if(!btn||btn.dataset.mdkrDraftReady)return;
 btn.dataset.mdkrDraftReady='1';window.__mdkr_submit_view_hash=location.hash;
 const form=btn.closest('.panel.form')||$('#view'),draft=getDraft();
 const fromUrl=new URLSearchParams(location.hash.split('?')[1]||'').get('chart');
 if(draft?.values&&Date.now()-draft.savedAt<1000*60*60*24&&(!fromUrl||draft.values.chart===fromUrl)){
  const v=draft.values,search=$('#chart-search',form),selector=$('#chart',form);
  if(search&&typeof v['chart-search']==='string'){search.value=v['chart-search'];search.dispatchEvent(new Event('input',{bubbles:true}))}
  if(selector&&v.chart){if([...selector.options].some(o=>o.value===v.chart)){selector.value=v.chart;selector.dispatchEvent(new Event('change',{bubbles:true}))}}
  const judge=$('#judge',form);if(judge&&v.judge){judge.value=v.judge;judge.dispatchEvent(new Event('change',{bubbles:true}))}
  for(const id of ['accuracy','early','late','great','miss']){const el=document.getElementById(id);if(el&&typeof v[id]==='string'&&!el.readOnly&&!el.disabled){el.value=v[id];el.dispatchEvent(new Event('input',{bubbles:true}))}}
  const note=document.createElement('p');note.className='mdkr-draft-note';note.textContent='작성 중이던 내용을 복원했어요. 스크린샷은 필요하면 다시 선택해 주세요.';btn.after(note);
 }
 form.addEventListener('input',saveDraft);form.addEventListener('change',saveDraft);
 const out=$('#submitMsg',form);if(out){const obs=new MutationObserver(()=>{if((out.textContent||'').includes('제출 완료')){try{sessionStorage.removeItem(draftKey)}catch{}obs.disconnect()}});obs.observe(out,{childList:true,characterData:true,subtree:true})}
}

// E. Admin-only audit stream; relies on SQL RPC mdkr_admin_activity_feed.
const auditTypes=[['all','모든 활동'],['RECORD_SUBMITTED','기록 제출'],['RECORD_APPROVED','승인'],['RECORD_REJECTED','반려'],['RECORD_DELETED','삭제'],['COMMENT_ADDED','댓글 작성'],['COMMENT_EDITED','댓글 수정'],['COMMENT_DELETED','댓글 삭제'],['RECORD_HISTORY','기존 기록'],['COMMENT_HISTORY','기존 코멘트']];
const auditLabels=Object.fromEntries(auditTypes);
async function initAdminFeed(){
 if(activeHash()!=='#/admin'||!db)return;
 const root=$('#view'),review=$('#reviewarea',root);if(!review||$('#mdkr-admin-activity',root))return;
 const main=document.createElement('div');main.className='mdkr-admin-main';
 for(const node of [...root.childNodes])main.append(node);
 const aside=document.createElement('aside');aside.id='mdkr-admin-activity';aside.className='mdkr-admin-activity';
 aside.innerHTML=`<div class="mdkr-admin-log-head"><div><h3>관리 로그</h3><small>기록·코멘트 변경 이력</small></div><button type="button" class="button" id="mdkr-audit-refresh" title="새로고침">↻</button></div><select id="mdkr-audit-filter" aria-label="로그 유형">${auditTypes.map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select><div id="mdkr-audit-list" role="log" aria-live="polite">불러오는 중…</div>`;
 root.append(main,aside);root.classList.add('mdkr-admin-split');
 const list=$('#mdkr-audit-list',aside),filter=$('#mdkr-audit-filter',aside);
 async function load(){
  list.textContent='불러오는 중…';
  const {data,error}=await db.rpc('mdkr_admin_activity_feed',{p_limit:100,p_action:filter.value==='all'?null:filter.value});
  if(!root.contains(aside))return;
  if(error){list.textContent='관리 로그를 불러올 수 없습니다. SQL 적용과 관리자 로그인 여부를 확인해 주세요. ('+error.message+')';return}
  const rows=data||[];
  list.replaceChildren();if(!rows.length){list.textContent='표시할 활동이 없습니다.';return}
  for(const r of rows){const item=document.createElement('article');item.className='mdkr-audit-item';
   const label=document.createElement('b');label.textContent=auditLabels[r.action]||r.action;
   const when=document.createElement('time');when.textContent=new Date(r.created_at).toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'});
   const who=document.createElement('p');who.textContent=r.target_name||'플레이어';
   const desc=document.createElement('p');desc.textContent=r.detail||'';
   const link=document.createElement('a');link.href='#/chart/'+enc(r.chart_id||'');link.textContent=r.chart_id?((typeof songs!=='undefined'&&songs.find(s=>s.chart_id===r.chart_id)?.title_ko)||r.chart_id):'';
   item.append(label,when,who,desc);if(r.chart_id)item.append(link);list.append(item)
  }
 }
 $('#mdkr-audit-refresh',aside).onclick=load;filter.onchange=load;await load();
}
if(typeof admin==='function'){const oldAdmin=admin;admin=async function(...args){const r=await oldAdmin.apply(this,args);if(activeHash()==='#/admin')await initAdminFeed();return r}}

// F. Profile rankings on avatar, plus two-player comparison of shared approved chart records.
const metrics=[['points','포인트'],['firsts','전일 보유'],['top10','TOP 10'],['accuracy','평균 정확도'],['el','평균 E+L'],['records','등록 기록 수']];
const metricField={points:'points',firsts:'total_firsts',top10:'top10_count',accuracy:'avg_accuracy',el:'avg_el',records:'charts_count'};
let statsCache=null,statsCacheAt=0,profileRun=0;
async function allPlayerStats(){
 if(statsCache&&Date.now()-statsCacheAt<45000)return statsCache;
 const result=[];for(let from=0;from<5000;from+=1000){const {data,error}=await db.from('mdkr_player_stats').select('user_id,points,total_firsts,top10_count,avg_accuracy,avg_el,charts_count').range(from,from+999);if(error)throw error;result.push(...(data||[]));if(!data||data.length<1000)break}
 statsCache=result;statsCacheAt=Date.now();return result;
}
function applyProfileRank(target,stats,select){
 const metric=select.value,field=metricField[metric],asc=metric==='el';
 const ranked=stats.filter(r=>Number(r.charts_count||0)>0).slice().sort((a,b)=>{
  const av=Number(a[field]),bv=Number(b[field]),v=asc?(av-bv):(bv-av);return (Number.isFinite(v)?v:0)||Number(b.points||0)-Number(a.points||0)});
 const myIndex=ranked.findIndex(r=>r.user_id===target);
 const value=$('#mdkr-rank-place'),count=$('#mdkr-rank-population');if(!value||!count)return;
 value.textContent=myIndex<0?'순위 없음':'#'+(myIndex+1).toLocaleString('ko-KR');count.textContent=metrics.find(x=>x[0]===metric)[1]+' · 승인 기록 보유 '+ranked.length+'명';
}
async function initProfileRank(target){
 const wrap=$('#view .profile-head .avatar-wrap');if(!wrap||$('#mdkr-avatar-rank'))return;
 const panel=document.createElement('div');panel.id='mdkr-avatar-rank';
 panel.innerHTML=`<small>전체 랭킹</small><strong id="mdkr-rank-place">조회 중…</strong><select id="mdkr-rank-metric" aria-label="랭킹 종목">${metrics.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><small id="mdkr-rank-population"></small>`;
 wrap.append(panel);
 try{const stats=await allPlayerStats();if(!wrap.contains(panel))return;
  const sel=$('#mdkr-rank-metric',panel);try{sel.value=localStorage.getItem('mdkr-profile-rank-type')||'points'}catch{sel.value='points'}
  if(!metricField[sel.value])sel.value='points';
  sel.onchange=()=>{try{localStorage.setItem('mdkr-profile-rank-type',sel.value)}catch{}applyProfileRank(target,stats,sel)};
  applyProfileRank(target,stats,sel);
 }catch(e){$('#mdkr-rank-place',panel).textContent='조회 실패';console.warn('[MDKR ranks]',e)}
}
async function allBestRows(ids){
 const all=[];
 for(let pos=0;pos<5000;pos+=1000){const {data,error}=await db.from('mdkr_rankings').select('user_id,chart_id,judge,accuracy,early,late,great,miss,detail_score,rank').in('user_id',ids).range(pos,pos+999);
  if(error)throw error;all.push(...(data||[]));if(!data||data.length<1000)break
 }
 return all;
}
const judgePriority={AP:0,FC:1,OTHER:2};
function bestCompare(a,b){const aj=judgePriority[a.judge]??9,bj=judgePriority[b.judge]??9;if(aj!==bj)return Math.sign(bj-aj);
 const diff=Number(b.detail_score??0)-Number(a.detail_score??0);if(diff!==0)return Math.sign(diff);return 0}
async function initCompare(target){
 const own=await db.auth.getUser();if(!own.data?.user||own.data.user.id===target)return;
 const me=own.data.user.id;const root=$('#view');if(!root||$('#mdkr-compare'))return;
 const panel=document.createElement('section');panel.id='mdkr-compare';panel.className='mdkr-compare panel';
 panel.innerHTML=`<div class="mdkr-compare-title"><div><h3>두 플레이어 비교</h3><p class="muted">서로 승인 기록이 있는 채보만 비교합니다.</p></div><button type="button" class="button" id="mdkr-compare-toggle">비교 열기</button></div><div id="mdkr-compare-content" hidden><div id="mdkr-compare-output">준비 중…</div></div>`;
 const head=$('.profile-head',root);if(head)head.after(panel);else root.prepend(panel);
 const toggle=$('#mdkr-compare-toggle',panel),content=$('#mdkr-compare-content',panel),output=$('#mdkr-compare-output',panel);
 let loaded=false,opened=false;
 toggle.onclick=async()=>{opened=!opened;content.hidden=!opened;toggle.textContent=opened?'비교 접기':'비교 열기';if(!opened||loaded)return;
  output.textContent='두 플레이어의 승인 기록을 비교하는 중…';
  try{const rows=await allBestRows([me,target]);if(!panel.isConnected)return;
   const mine=new Map(rows.filter(x=>x.user_id===me).map(x=>[x.chart_id,x]));
   const theirs=new Map(rows.filter(x=>x.user_id===target).map(x=>[x.chart_id,x]));
   const pairs=[...mine.keys()].filter(id=>theirs.has(id)).map(id=>{const a=mine.get(id),b=theirs.get(id),s=typeof songs!=='undefined'?songs.find(x=>x.chart_id===id):null;return {id,a,b,s,cmp:bestCompare(a,b)}}).sort((x,y)=>(Number(y.s?.level||0)-Number(x.s?.level||0))||Math.abs(Number(y.a.detail_score)-Number(y.b.detail_score))-Math.abs(Number(x.a.detail_score)-Number(x.b.detail_score)));
   const counts={win:pairs.filter(x=>x.cmp>0).length,lose:pairs.filter(x=>x.cmp<0).length,tie:pairs.filter(x=>x.cmp===0).length};
   output.innerHTML=`<div class="mdkr-compare-stats"><span>내 채보 <b>${mine.size}</b></span><span>상대 채보 <b>${theirs.size}</b></span><span>공통 <b>${pairs.length}</b></span><span class="mdkr-win">우세 <b>${counts.win}</b></span><span class="mdkr-loss">열세 <b>${counts.lose}</b></span><span>동률 <b>${counts.tie}</b></span></div><div class="mdkr-compare-filters"><select id="mdkr-compare-level" aria-label="비교 채보 레벨"><option value="all">모든 레벨</option>${[7,8,9,10,11,12].map(n=>`<option value="${n}">Lv.${n}</option>`).join('')}</select><select id="mdkr-compare-side" aria-label="비교 결과"><option value="all">모든 결과</option><option value="win">내 우세</option><option value="lose">상대 우세</option><option value="tie">동률</option></select></div><div class="mdkr-compare-rows" id="mdkr-compare-rows"></div>`;
   const board=$('#mdkr-compare-rows',panel),level=$('#mdkr-compare-level',panel),side=$('#mdkr-compare-side',panel);
   const render=()=>{const results=pairs.filter(x=>(level.value==='all'||String(x.s?.level)===level.value)&&(side.value==='all'||x.cmp===(side.value==='win'?1:side.value==='lose'?-1:0)));
    board.innerHTML=results.map(x=>{
     const s=x.s,title=s?.title_ko||s?.title||x.id;
     const detail=Number(x.a.detail_score)-Number(x.b.detail_score),message=x.cmp>0?'내 기록 우세':x.cmp<0?'상대 기록 우세':'동률';
     return `<article class="mdkr-versus-row"><a href="#/chart/${enc(x.id)}" class="mdkr-versus-song">${s?.cover_path?`<img loading="lazy" src="${clean(s.cover_path)}" alt="">`:''}<span>${clean(title)}<small>Lv.${clean(s?.level??'?')} · ${clean(s?.chart_type||'')}</small></span></a><div class="mdkr-versus-results"><div><small>나</small><b>${clean(x.a.judge)} · EL ${Number(x.a.early||0)+Number(x.a.late||0)}</b><small>세부 ${x.a.detail_score} · ${x.a.accuracy??'—'}%</small></div><div class="mdkr-versus-diff ${x.cmp>0?'ahead':x.cmp<0?'behind':''}"><strong>${message}</strong><small>세부차 ${detail>0?'+':''}${detail}</small></div><div><small>상대</small><b>${clean(x.b.judge)} · EL ${Number(x.b.early||0)+Number(x.b.late||0)}</b><small>세부 ${x.b.detail_score} · ${x.b.accuracy??'—'}%</small></div></div></article>`;
    }).join('')||'<p class="muted">조건에 해당하는 공통 기록이 없습니다.</p>';
   };
   level.onchange=render;side.onchange=render;render();loaded=true;
  }catch(e){output.textContent='비교 기록을 불러오지 못했습니다: '+e.message}
 };
}
if(typeof players==='function'){
 const oldPlayers=players;
 players=async function(...args){const seq=++profileRun;const result=await oldPlayers.apply(this,args);
  if(seq!==profileRun||!db||!isProfile())return result;
  const params=new URLSearchParams(location.hash.split('?')[1]||'');let target=params.get('user');
  if(params.has('me')){const {data}=await db.auth.getUser();target=data?.user?.id||null}
  if(!target)return result;
  await initProfileRank(target);
  if(seq===profileRun&&!params.has('me'))await initCompare(target);
  return result;
 };
}

// G. One observer is only used to attach draft management to freshly rendered forms.
function boot(){initBanner();initAudio();initDraft();
 const root=$('#view');if(root){const observer=new MutationObserver(()=>initDraft());observer.observe(root,{childList:true,subtree:true});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
