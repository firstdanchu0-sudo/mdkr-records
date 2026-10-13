/* MDKR v1.0: tier badge for profile and player points.
   Load AFTER backend.js and mdkr_profile_v08.js. No polling or visibility toggles. */
(()=>{
'use strict';
if(typeof players!=='function'){console.warn('MDKR tier: backend.js missing');return;}
const oldPlayers=players;
const cuts=[
 ['UNRANKED',0],['STELLAR I',1000],['STELLAR II',1300],
 ['STELLAR III',1600],['STELLAR IV',2000],['STELLAR V',2400],
 ['NEBULA I',3000],['NEBULA II',3500],['NEBULA III',4000],
 ['NEBULA IV',4500],['NEBULA V',5000],
 ['QUASAR I',5500],['QUASAR II',6000],['QUASAR III',6500],
 ['QUASAR IV',7000],['QUASAR V',7500],
 ['COSMOS I',8000],['COSMOS II',8500],['COSMOS III',9000],
 ['COSMOS IV',9500],['COSMOS V',10500]
];
function tier(p){
 const value=Math.max(0,Math.round(Number(p)||0));
 let i=0;for(let k=1;k<cuts.length;k++)if(value>=cuts[k][1])i=k;
 const name=cuts[i][0],group=name.split(' ')[0].toLowerCase(),next=cuts[i+1]||null;
 return {value,name,group,next,lower:cuts[i][1]};
}
function apply(){
 if(!location.hash.startsWith('#/players'))return;
 const root=document.querySelector('#view');if(!root)return;
 const grid=root.querySelector('.profile-grid');
 if(grid){
   const box=grid.querySelector('.statbox:nth-child(2)');
   if(box&&!box.dataset.mdkrTier){
     const raw=box.querySelector('strong')?.textContent||'0';
     const t=tier(raw.replace(/,/g,''));
     box.dataset.mdkrTier='1';
     const label=box.querySelector('small');if(label)label.textContent='포인트 · TOP 20';
     const span=document.createElement('div');span.className='mdkr-tier-badge '+t.group;span.textContent=t.name;box.append(span);
     const head=root.querySelector('.profile-head');
     if(head&&!root.querySelector('#mdkr-tier-panel')){
       const panel=document.createElement('section');panel.id='mdkr-tier-panel';
       panel.className='mdkr-tier-panel '+t.group;
       const title=document.createElement('div');title.className='mdkr-tier-heading';
       const star=document.createElement('span');star.className='mdkr-tier-glyph';star.textContent='✦';
       const info=document.createElement('div');info.className='mdkr-tier-info';
       const name=document.createElement('strong');name.textContent=t.name;
       const note=document.createElement('small');note.textContent='상위 20개 채보 · 레벨과 정확도 기준';
       info.append(name,note);
       const points=document.createElement('b');points.textContent=t.value.toLocaleString('ko-KR')+' PT';
       title.append(star,info,points);panel.append(title);
       if(t.next){
         const pct=Math.min(100,Math.max(0,100*(t.value-t.lower)/(t.next[1]-t.lower)));
         const track=document.createElement('div');track.className='mdkr-tier-track';
         const fill=document.createElement('div');fill.className='mdkr-tier-fill';fill.style.width=pct+'%';
         track.append(fill);panel.append(track);
         const foot=document.createElement('div');foot.className='mdkr-tier-foot';
         foot.textContent='다음 '+t.next[0]+'까지 '+(t.next[1]-t.value).toLocaleString('ko-KR')+' PT';
         panel.append(foot);
       }else{
         const foot=document.createElement('div');foot.className='mdkr-tier-foot';foot.textContent='최고 등급 달성';panel.append(foot);
       }
       head.after(panel);
     }
   }
 }
 const body=root.querySelector('#playerRows');
 if(body)body.querySelectorAll('tr').forEach(row=>{
   const cell=row.querySelector('td:nth-child(4)');
   if(!cell||cell.querySelector('.mdkr-tier-badge'))return;
   const t=tier(cell.textContent.replace(/,/g,''));
   const badge=document.createElement('span');
   badge.className='mdkr-tier-badge mdkr-tier-small '+t.group;badge.textContent=t.name;
   cell.append(badge);
 });
}
let last=0;
players=async function(){
 const token=++last;
 const result=await oldPlayers();
 if(token!==last)return result;
 apply();
 const filter=document.querySelector('#sortFilters');
 if(filter&&!filter.dataset.mdkrTier){
   filter.dataset.mdkrTier='1';
   filter.addEventListener('click',()=>queueMicrotask(apply));
 }
 return result;
};
})();
