/* MDKR avatar fix: update only Discord avatar_url, not a custom nickname, bio or title. */
(()=>{'use strict';
 const cfg=window.MDKR_CONFIG||{};
 if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
 const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:false}});
 let running=false,lastUser='',lastAvatar='',ready=false;
 const valid=x=>typeof x==='string'&&/^https:\/\//i.test(x)&&!/[<>"']/.test(x);
 function avatarOf(user){
  const m=user?.user_metadata||{};
  const discord=(user?.identities||[]).find(x=>x.provider==='discord')?.identity_data||{};
  const source=[m.avatar_url,m.picture,discord.avatar_url,discord.picture].find(valid);
  if(source)return source;
  const id=String(discord.provider_id||m.provider_id||discord.sub||'');
  const hash=String(discord.avatar||m.avatar||'');
  return /^\d{15,22}$/.test(id)&&/^[a-zA-Z0-9_]+$/.test(hash)
   ?`https://cdn.discordapp.com/avatars/${id}/${hash}.${hash.startsWith('a_')?'gif':'png'}?size=256`:null;
 }
 async function sync(force=false){
  if(running)return;
  running=true;
  try{
   const {data:{user},error:ue}=await db.auth.getUser();
   if(ue||!user)return;
   const url=avatarOf(user);
   if(!url){if(force)alert('디스코드 프로필 사진 정보가 로그인 세션에 없습니다. MDKR에서 로그아웃하고 디스코드로 다시 로그인해 주세요.');return;}
   if(!force&&lastUser===user.id&&lastAvatar===url)return;
   const {data:profile,error:pe}=await db.from('profiles').select('avatar_url').eq('id',user.id).maybeSingle();
   if(pe){console.warn('[MDKR avatar] 조회 실패',pe);return;}
   if(profile?.avatar_url!==url){
    const {error:e}=await db.from('profiles').update({avatar_url:url}).eq('id',user.id);
    if(e){console.warn('[MDKR avatar] 갱신 실패',e);if(force)alert('프로필 사진 갱신 실패: '+e.message);return;}
   }
   lastUser=user.id;lastAvatar=url;
   if(force){const note=document.querySelector('#mdkr-avatar-sync-note');if(note)note.textContent='사진 동기화 완료! 페이지를 다시 열면 반영됩니다.';}
  }catch(e){console.warn('[MDKR avatar]',e)}finally{running=false}
 }
 // Applies to public profile fallback, too. Leave working images untouched.
 function decorate(){
  document.querySelectorAll('.profile-head .avatar-fallback').forEach(el=>{
   if(el.dataset.avatarFixed)return;
   el.dataset.avatarFixed='1';el.classList.add('mdkr-avatar-initials');
   const name=document.querySelector('.section-head h2')?.textContent||'M';
   el.textContent=[...name.trim()][0]||'M';
  });
  document.querySelectorAll('.profile-head img.avatar').forEach(img=>{
   if(img.dataset.avatarFixed)return;img.dataset.avatarFixed='1';
   img.addEventListener('error',()=>{
    const el=document.createElement('div');el.className='avatar avatar-fallback mdkr-avatar-initials';
    el.textContent=([...(document.querySelector('.section-head h2')?.textContent||'M')][0]||'M');
    img.replaceWith(el);
   });
  });
  const edit=document.querySelector('#mdkr-save')?.closest('.panel');
  if(edit&&!edit.querySelector('.mdkr-avatar-sync-btn')){
   const b=document.createElement('button');b.type='button';b.className='button mdkr-avatar-sync-btn';b.textContent='디스코드 프로필 사진 동기화';
   const note=document.createElement('div');note.id='mdkr-avatar-sync-note';note.className='mdkr-avatar-sync-note';
   b.addEventListener('click',()=>{note.textContent='프로필 사진을 확인하는 중…';sync(true).then(()=>{if(note.textContent==='프로필 사진을 확인하는 중…')note.textContent='사진 정보가 갱신되지 않았다면 로그아웃 후 다시 로그인해 주세요.'})});
   edit.append(b,note);
  }
 }
 const start=()=>{if(ready)return;ready=true;new MutationObserver(decorate).observe(document.querySelector('#view')||document.body,{childList:true,subtree:true});decorate();setTimeout(()=>sync(),900)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 db.auth.onAuthStateChange(()=>setTimeout(()=>sync(),400));
})();
