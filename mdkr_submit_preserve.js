/* MDKR Records 2.6 — preserve submit form across session refresh and navigation.
 * Load AFTER backend.js, mdkr_accuracy_guard.js and mdkr_edit.js.
 * No database changes. Screenshot data is not written to browser storage.
 */
(()=>{'use strict';
 const KEY='mdkr-record-submit-draft-v1';
 const ids=['chart-search','chart','judge','accuracy','early','late','great','miss'];
 const view=document.getElementById('view');
 if(!view)return;
 let formNode=null,restoring=false,lastSubmitHash='',successWatcher=null;
 const isSubmit=()=>location.hash.split('?')[0]==='#/submit';
 const input=id=>view.querySelector('#'+id);
 function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
 function save(){
  if(restoring||!isSubmit()||!input('submitBtn'))return;
  const state={};ids.forEach(id=>{let el=input(id);if(el)state[id]=el.value});
  state.savedAt=Date.now();
  try{sessionStorage.setItem(KEY,JSON.stringify(state))}catch{}
 }
 function restore(){
  const draft=read();if(!draft||!input('submitBtn'))return;
  restoring=true;
  try{
   const query=input('chart-search');
   if(query&&draft['chart-search']!==undefined){query.value=draft['chart-search'];query.dispatchEvent(new Event('input',{bubbles:true}))}
   const sel=input('chart');
   if(sel&&draft.chart){
    if(!Array.from(sel.options).some(o=>o.value===draft.chart)){
     // Saved chart may be outside the initial 200 results; find it by exact title.
     const song=typeof songs!=='undefined'?songs.find(s=>s.chart_id===draft.chart):null;
     if(song&&query){query.value=song.title;query.dispatchEvent(new Event('input',{bubbles:true}))}
    }
    if(Array.from(sel.options).some(o=>o.value===draft.chart)){
     sel.value=draft.chart;sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
   }
   const judge=input('judge');if(judge&&draft.judge){judge.value=draft.judge;judge.dispatchEvent(new Event('change',{bubbles:true}))}
   for(const id of ['accuracy','early','late','great','miss']){
    const el=input(id);if(el&&draft[id]!==undefined&&!el.readOnly&&!el.disabled){el.value=draft[id];el.dispatchEvent(new Event('input',{bubbles:true}))}
   }
   const note=view.querySelector('#mdkr-submit-draft-note');
   if(note&&note.firstChild)note.firstChild.textContent='작성 중인 내용이 복원되었습니다. 스크린샷은 다시 선택해야 할 수 있어요. ';
  }finally{restoring=false}
 }
 function clearDraft(){try{sessionStorage.removeItem(KEY)}catch{}
  const n=view.querySelector('#mdkr-submit-draft-note');if(n&&n.firstChild)n.firstChild.textContent='임시 저장을 비웠습니다. ';
 }
 function install(){
  if(!isSubmit())return;
  const btn=input('submitBtn');if(!btn||btn===formNode)return;
  formNode=btn;lastSubmitHash=location.hash;
  const note=document.createElement('div');note.id='mdkr-submit-draft-note';note.className='muted';note.style.margin='10px 0';note.style.fontSize='12px';
  note.textContent='입력 내용은 이 탭에 자동 저장됩니다.';
  const reset=document.createElement('button');reset.type='button';reset.className='button';reset.textContent='임시 저장 비우기';reset.style.marginLeft='10px';reset.style.fontSize='12px';
  reset.addEventListener('click',clearDraft);note.append(reset);
  btn.parentNode.insertBefore(note,btn);
  restore();
  // Reset draft only after the server confirms submission, not on click.
  const status=input('submitMsg');
  if(successWatcher)successWatcher.disconnect();
  if(status){successWatcher=new MutationObserver(()=>{
   if((status.textContent||'').includes('제출 완료')){
    try{sessionStorage.removeItem(KEY)}catch{}
    const msg=view.querySelector('#mdkr-submit-draft-note');if(msg)msg.firstChild.textContent='제출 완료 · 임시 저장 삭제됨. ';
   }
  });successWatcher.observe(status,{subtree:true,childList:true,characterData:true})}
 }
 // Capture before and after form field handlers; use change for selects.
 view.addEventListener('input',e=>{if(ids.includes(e.target?.id))save()},true);
 view.addEventListener('change',e=>{if(ids.includes(e.target?.id))save()},true);
 window.addEventListener('pagehide',save);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
 // backend.js calls route() whenever Supabase emits SIGNED_IN on tab focus.
 // A redundant call destroys the form (including the screenshot input). Suppress
 // only when we're on the same submit route with a usable signed-in form.
 if(typeof window.route==='function'){
  const original=window.route;
  window.route=function(...args){
   if(isSubmit()&&location.hash===lastSubmitHash&&input('submitBtn')&&document.querySelector('#account-area #logout')){
    save();return;
   }
   return original.apply(this,args);
  }
 }
 new MutationObserver(install).observe(view,{childList:true,subtree:false});
 window.addEventListener('hashchange',()=>{if(!isSubmit()){formNode=null}else{queueMicrotask(install)}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
