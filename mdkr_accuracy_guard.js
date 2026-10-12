/* MDKR v0.7.1 — accuracy & required field guard.
   Load AFTER backend.js and mdkr_edit.js. */
(()=>{
'use strict';
const forms=[
  {root:'#submitBtn',prefix:'',btn:'submitBtn',judge:'judge',accuracy:'accuracy',message:'submitMsg'},
  {root:'#edit-send',prefix:'edit-',btn:'edit-send',judge:'edit-judge',accuracy:'edit-accuracy',message:'edit-result'}
];
const get=(id)=>document.getElementById(id);
function prepare(f){
 const btn=get(f.btn),judge=get(f.judge),accuracy=get(f.accuracy);
 if(!btn||!judge||!accuracy||btn.dataset.mdkrV071==='1')return;
 btn.dataset.mdkrV071='1';
 const field=k=>get(f.prefix+k);
 const sync=()=>{
   const j=judge.value;
   if(j==='AP'){
     accuracy.value='100.000';
     accuracy.readOnly=true;
     accuracy.title='AP 기록은 정확도 100%로 자동 고정됩니다.';
   }else{
     accuracy.readOnly=false;
     accuracy.title='정확도는 필수 입력입니다.';
     // Switching away from AP must not leave an artificial 100% value.
     if(accuracy.dataset.mdkrAuto==='1')accuracy.value='';
   }
   accuracy.dataset.mdkrAuto=j==='AP'?'1':'0';
   const g=field('great'),m=field('miss');
   if(g&&j==='AP')g.value='0';
   if(m&&j!=='OTHER')m.value='0';
 };
 judge.addEventListener('change',sync);
 // Capture runs before the site's original click listener, even when its input
 // parser silently converts an empty string into 0.
 btn.addEventListener('click',event=>{
   const j=judge.value, out=get(f.message);
   const keys=['early','late','great','miss'];
   const required=j==='AP'?['early','late']:j==='FC'?['early','late','great']:keys;
   let error='';
   if(j==='AP'){
     accuracy.value='100.000';
   }else if(accuracy.value.trim()===''){
     error='정확도(%)를 입력하지 않았어요! 결과 화면을 확인해 주세요.';
   }else{
     const n=Number(accuracy.value);
     if(!Number.isFinite(n)||n<0||n>100)error='정확도는 0~100 사이의 숫자로 입력해 주세요.';
   }
   if(!error){
     const missing=required.filter(k=>!field(k)||field(k).value.trim()==='');
     if(missing.length)error=missing.join(', ')+' 입력이 빠졌어요! 0이라면 숫자 0을 직접 입력해 주세요.';
   }
   if(!error){
     const invalid=required.filter(k=>{
       const input=field(k),n=Number(input.value);
       return !Number.isInteger(n)||n<0||n>100000;
     });
     if(invalid.length)error=invalid.join(', ')+'는 0 이상의 정수로 입력해 주세요.';
   }
   if(error){
     event.preventDefault();
     event.stopImmediatePropagation();
     if(out)out.textContent=error;
     const missingField=required.find(k=>field(k)&&field(k).value.trim()==='');
     if(j!=='AP'&&accuracy.value.trim()==='')accuracy.focus();
     else if(missingField)field(missingField).focus();
   }
 },true);
 sync();
}
const init=()=>forms.forEach(prepare);
document.addEventListener('DOMContentLoaded',()=>{
 init();
 new MutationObserver(init).observe(document.getElementById('view')||document.body,{childList:true,subtree:true});
});
})();
