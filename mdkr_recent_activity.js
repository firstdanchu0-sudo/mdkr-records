/* MDKR Recent Activity v1 - approved-only community feed. Load after app.js and backend.js. */
(()=>{'use strict';
if(typeof songList!=='function'||typeof route!=='function')return;
const config=window.MDKR_CONFIG||{};
const db=window.supabase?.createClient&&config.supabaseUrl&&config.supabaseAnonKey
  ?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{detectSessionInUrl:false,persistSession:false,autoRefreshToken:false}}):null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
const localSong=id=>typeof songs!=='undefined'?songs.find(x=>x.chart_id===id):null;
const isHome=()=>!location.hash||location.hash==='#/'||location.hash==='#';
const isActivity=()=>location.hash.split('?')[0]==='#/activity';
const active=()=>isHome()||isActivity();
let latest=[],loadPending=false,lastAt=0;
const timeAgo=date=>{
 const ms=Date.parse(date);if(!Number.isFinite(ms))return '날짜 정보 없음';
 const sec=Math.max(0,Math.floor((Date.now()-ms)/1000));
 if(sec<60)return '방금 전';if(sec<3600)return Math.floor(sec/60)+'분 전';
 if(sec<86400)return Math.floor(sec/3600)+'시간 전';if(sec<604800)return Math.floor(sec/86400)+'일 전';
 return new Date(ms).toLocaleDateString('ko-KR');
};
function row(r){
 const s=localSong(r.chart_id),link='#/chart/'+encodeURIComponent(r.chart_id||'');
 const user='#/players?user='+encodeURIComponent(r.user_id||'');
 const title=s?.title_ko||s?.title||r.song_title||r.chart_id||'악곡';
 const cover=s?.cover_path||s?.cover_url||'';
 const avatar=r.avatar_url||'';
 const e=Number(r.early||0),l=Number(r.late||0),g=Number(r.great||0),m=Number(r.miss||0);
 const judge=['AP','FC','OTHER'].includes(r.judge)?r.judge:'OTHER';
 const details=judge==='AP'?`E/L ${e} / ${l}`:`${Number(r.accuracy??0).toFixed(3)}% · E/L ${e} / ${l}`;
 return `<article class="mdkr-activity-row">
  <a class="mdkr-activity-cover" href="${link}" aria-label="${esc(title)} 채보 보기">${cover?`<img loading="lazy" src="${esc(cover)}" alt="" onerror="this.style.display='none'">`:'♪'}</a>
  <div class="mdkr-activity-main"><div class="mdkr-activity-line"><a href="${user}" class="mdkr-activity-person">${avatar?`<img class="mdkr-activity-avatar" src="${esc(avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'">`:''}${esc(r.nickname||'플레이어')}</a><span class="mdkr-activity-action">님의 새 기록</span></div>
  <a class="mdkr-activity-song" href="${link}">${esc(title)}</a><div class="mdkr-activity-meta"><span>Lv.${esc(r.level??s?.level??'?')}${r.chart_type==='HIDDEN'?' · HIDDEN':''}</span><span class="mdkr-activity-judge ${judge.toLowerCase()}">${judge}</span><span>${esc(details)}</span>${(g||m)?`<span>G/M ${g}/${m}</span>`:''}</div></div>
  <time datetime="${esc(r.submitted_at)}" title="제출일 기준">${esc(timeAgo(r.submitted_at))}</time></article>`;
}
function render(){
 if(!active())return;
 const target=document.querySelector('#mdkr-activity-list');if(!target)return;
 const total=isActivity()?50:5;
 if(!db){target.innerHTML='<p class="mdkr-activity-empty">기록 서버 연결이 필요합니다.</p>';return}
 target.innerHTML=latest.length?latest.slice(0,total).map(row).join(''):'<p class="mdkr-activity-empty">아직 승인된 기록이 없습니다.</p>';
}
async function fetchFeed(force=false){
 if(!db||!active()||loadPending)return;
 if(!force&&Date.now()-lastAt<14000)return;
 loadPending=true;
 try{
  const {data,error}=await db.rpc('mdkr_recent_records',{p_limit:isActivity()?50:5});
  if(error)throw error;
  latest=data||[];lastAt=Date.now();render();
 }catch(err){const target=document.querySelector('#mdkr-activity-list');if(target)target.innerHTML=`<p class="mdkr-activity-empty">최근 기록을 불러오지 못했습니다. SQL 적용 여부를 확인해 주세요. (${esc(err?.message||err)})</p>`;}
 finally{loadPending=false}
}
function section(full=false){return `<section class="mdkr-activity" aria-label="최근 승인 기록"><div class="mdkr-activity-heading"><div><h2>최근 기록</h2><p>관리자 승인 완료 기록 · 제출일 기준</p></div>${full?'<a href="#/" class="mdkr-activity-more">악곡 랭킹</a>':'<a href="#/activity" class="mdkr-activity-more">전체 보기</a>'}</div><div id="mdkr-activity-list"><p class="mdkr-activity-empty">기록 불러오는 중…</p></div></section>`}
const originalSongList=songList;
songList=function(...args){const result=originalSongList.apply(this,args);if(isHome()){
 const root=document.querySelector('#view');if(root&&!root.querySelector('.mdkr-activity'))root.insertAdjacentHTML('afterbegin',section(false));
 render();fetchFeed(true);
}return result};
const originalRoute=route;
route=function(...args){if(isActivity()){
 if(typeof setActive==='function')setActive('activity');
 const root=document.querySelector('#view');if(root)root.innerHTML=section(true);
 render();fetchFeed(true);return;
}return originalRoute.apply(this,args)};
setInterval(()=>{if(active())fetchFeed(false)},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())fetchFeed(false)});
})();
