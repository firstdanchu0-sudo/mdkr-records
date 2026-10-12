/* MDKR v0.8 profile visibility / public favorite songs.
   Place after backend.js (and mdkr_edit.js, if present). */
(()=>{
'use strict';
if(typeof players!=='function'){
 console.warn('MDKR v0.8: players() is unavailable; script order is incorrect.');
 return;
}
const originalPlayers=players;
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&'+'#39;'}[ch]));
let seq=0;
players=async function(){
 const token=++seq;
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 const id=params.get('user');
 const me=params.get('me');
 if(!id&&!me)return originalPlayers();
 const target=document.querySelector('#view');
 if(!target)return originalPlayers();
 // Hide any intermediate public recent-record table while original rendering runs.
 // target.style.visibility='hidden';
 try{
   const cfg=window.MDKR_CONFIG||{};
   const client=(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient)
      ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
   const current=client?(await client.auth.getUser()).data?.user:null;
   const own=!!current&&(me==='1'||id===current.id);
   await originalPlayers();
   if(token!==seq)return;
   if(own||!id)return;
   const view=document.querySelector('#view');
   if(!view)return;
   // The original page always inserts recent submissions into the last panel
   // before #mdkr-profile-extra. Remove it, not just hide via CSS.
   const recent=[...view.querySelectorAll('.panel')].find(p=>p.querySelector('h3')?.textContent.trim()==='최근 제출 기록');
   if(recent)recent.remove();
   const section=document.createElement('section');section.className='panel mdkr-favorites';
   const heading=document.createElement('h3');heading.textContent='주로 플레이하는 악곡 TOP 5';section.append(heading);
   const description=document.createElement('p');description.className='muted';
   description.textContent='승인된 기록의 제출 횟수 기준 · 같은 악곡의 채보는 합산';section.append(description);
   const content=document.createElement('div');content.className='mdkr-favorite-list';content.textContent='불러오는 중…';section.append(content);
   const extras=view.querySelector('#mdkr-profile-extra');
   if(extras)extras.before(section);else view.append(section);
   if(!client){content.textContent='데이터 연결이 필요합니다.';return;}
   const {data,error}=await client.rpc('mdkr_favorite_songs',{p_user_id:id});
   if(token!==seq||!section.isConnected)return;
   if(error){content.textContent='TOP 5를 불러오지 못했습니다. v0.8 SQL 적용 여부를 확인해 주세요.';console.warn(error);return;}
   const entries=data||[];
   if(!entries.length){content.textContent='아직 승인된 기록이 없습니다.';return;}
   const allSongs=typeof songs!=='undefined'?songs:[];
   content.innerHTML=entries.map((item,i)=>{
     const matches=allSongs.filter(s=>String(s.chart_id).split(':')[0]===item.song_key);
     const s=matches[0];
     const name=s?(s.title_ko||s.title||item.song_key):item.song_key;
     const cover=s?.cover_path?`<img class="mdkr-favorite-cover" loading="lazy" src="${escapeHtml(s.cover_path)}" alt="">`:'';
     const link=s?`#/chart/${encodeURIComponent(s.chart_id)}`:'#/';
     return `<div class="mdkr-favorite-row"><span class="mdkr-favorite-position">${i+1}</span>${cover}<a href="${link}">${escapeHtml(name)}</a><strong>${Number(item.record_count)||0}회</strong></div>`;
   }).join('');
 }catch(error){console.warn('MDKR v0.8 profile rendering:',error);}
 // finally{if(token===seq)target.style.visibility='';}
};
})();
