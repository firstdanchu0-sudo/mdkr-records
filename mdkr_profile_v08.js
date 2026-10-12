/* MDKR v0.8.1 profile UI hotfix: no visibility toggling; one shared Supabase client. */
(()=>{
'use strict';
if(typeof players!=='function') { console.warn('MDKR profile patch: backend.js must load first'); return; }
const originalPlayers=players;
const cfg=window.MDKR_CONFIG||{};
const db=(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient)
 ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let serial=0;
players=async function(){
  const request=++serial;
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  const id=params.get('user'),me=params.get('me');
  if(!id&&!me)return originalPlayers();
  // No style.visibility changes: never blink or blank the entire profile.
  let current=null;
  if(db){try{const result=await db.auth.getUser();current=result.data?.user||null;}catch(e){console.warn('Profile auth:',e);}}
  // Render existing profile first; only modify public profiles.
  await originalPlayers();
  if(request!==serial||!location.hash.startsWith('#/players'))return;
  const own=!!current&&(!!me||id===current.id);
  if(own||!id)return;
  const view=document.querySelector('#view');
  if(!view)return;
  const recent=[...view.querySelectorAll('.panel')].find(p=>p.querySelector('h3')?.textContent.trim()==='최근 제출 기록');
  if(recent)recent.remove();
  const old=view.querySelector('.mdkr-favorites');if(old)old.remove();
  const section=document.createElement('section');section.className='panel mdkr-favorites';
  section.innerHTML='<h3>주로 플레이하는 악곡 TOP 5</h3><p class="muted">승인된 기록의 제출 횟수 기준 · 같은 악곡의 채보는 합산</p><div class="mdkr-favorite-list">불러오는 중…</div>';
  const extras=view.querySelector('#mdkr-profile-extra');
  if(extras)extras.before(section);else view.append(section);
  const content=section.querySelector('.mdkr-favorite-list');
  if(!db){content.textContent='데이터 연결이 필요합니다.';return;}
  try{
    const result=await db.rpc('mdkr_favorite_songs',{p_user_id:id});
    if(request!==serial||!section.isConnected)return;
    if(result.error)throw result.error;
    if(!result.data?.length){content.textContent='아직 승인된 기록이 없습니다.';return;}
    const allSongs=typeof songs!=='undefined'?songs:[];
    content.innerHTML=result.data.map((item,i)=>{
      const found=allSongs.find(s=>String(s.chart_id).split(':')[0]===item.song_key);
      const name=found?(found.title_ko||found.title||item.song_key):item.song_key;
      const cover=found?.cover_path?`<img class="mdkr-favorite-cover" loading="lazy" src="${esc(found.cover_path)}" alt="">`:'';
      const href=found?`#/chart/${encodeURIComponent(found.chart_id)}`:'#/';
      return `<div class="mdkr-favorite-row"><span class="mdkr-favorite-position">${i+1}</span>${cover}<a href="${href}">${esc(name)}</a><strong>${Number(item.record_count)||0}회</strong></div>`;
    }).join('');
  }catch(e){console.warn('MDKR favorites:',e);content.textContent='TOP 5를 불러오지 못했습니다. SQL 설치 상태를 확인해 주세요.';}
};
})();
