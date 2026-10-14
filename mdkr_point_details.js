/* MDKR point breakdown v1.0.1: load AFTER mdkr_tier_v10.js */
(()=>{
'use strict';
if(typeof players!=='function')return;
const cfg=window.MDKR_CONFIG||{};
const client=cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient
  ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const oldPlayers=players;
const nf=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
let serial=0;
let drawer=null;
function close(){if(drawer){drawer.remove();drawer=null;}document.removeEventListener('keydown',escHandler)}
function escHandler(e){if(e.key==='Escape')close()}
function songFor(id){return (typeof songs!=='undefined'?songs:[]).find(x=>x.chart_id===id)}
function make(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el}
async function open(userId,token){
 close();
 const layer=make('div','mdkr-pt-overlay');drawer=layer;
 const backdrop=make('button','mdkr-pt-backdrop');backdrop.type='button';backdrop.setAttribute('aria-label','닫기');backdrop.onclick=close;
 const panel=make('aside','mdkr-pt-drawer');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','포인트 반영 채보');
 const header=make('header','mdkr-pt-header');header.append(make('h2','', '포인트 반영 TOP 20'));
 const exit=make('button','mdkr-pt-close','×');exit.type='button';exit.setAttribute('aria-label','닫기');exit.onclick=close;header.append(exit);panel.append(header);
 const body=make('div','mdkr-pt-body','반영 기록을 불러오는 중…');panel.append(body);layer.append(backdrop,panel);document.body.append(layer);
 document.addEventListener('keydown',escHandler);exit.focus();
 if(!client){body.textContent='Supabase 연결을 확인해 주세요.';return;}
 try{
  const {data,error}=await client.rpc('mdkr_point_top20',{p_user_id:userId});
  if(error)throw error;
  if(token!==serial||drawer!==layer)return;
  body.replaceChildren();
  const rows=data||[];
  if(!rows.length){body.textContent='아직 포인트에 반영된 채보가 없습니다.';return;}
  const total=rows.reduce((sum,r)=>sum+Number(r.chart_points||0),0);
  const info=make('div','mdkr-pt-summary',`${rows.length}개 채보 · ${nf.format(total)} PT`);body.append(info);
  rows.forEach((r,i)=>{
   const s=songFor(r.chart_id);
   const item=make('a','mdkr-pt-item');item.href='#/chart/'+encodeURIComponent(r.chart_id);item.addEventListener('click',close);
   item.append(make('span','mdkr-pt-index',String(i+1).padStart(2,'0')));
   if(s?.cover_path){const cover=make('img','mdkr-pt-cover');cover.src=s.cover_path;cover.alt='';cover.loading='lazy';item.append(cover)}
   const details=make('div','mdkr-pt-track');
   details.append(make('strong','',s?.title_ko||s?.title||r.chart_id));
   details.append(make('small','',`Lv.${r.level} · ${s?.chart_type==='HIDDEN'?'HIDDEN · ':''}${r.judge} · ${r.accuracy==null?'정확도 미입력':nf.format(r.accuracy)+'%'}`));
   item.append(details,make('b','mdkr-pt-pts',nf.format(r.chart_points)+' PT'));body.append(item);
  });
  body.append(make('p','mdkr-pt-hint','점수 합산은 반올림 전 원본 값을 사용합니다. 표시된 개별 점수 합계와 최대 소수점 차이가 있을 수 있습니다.'));
 }catch(e){if(drawer===layer){body.textContent='포인트 상세 기록을 불러오지 못했습니다. SQL 설치 상태를 확인해 주세요.';console.warn('MDKR point breakdown:',e)}}
}
function init(){
 const root=document.querySelector('#view');
 const panel=root?.querySelector('#mdkr-tier-panel');
 if(!panel||panel.dataset.mdkrDetailReady)return;
 panel.dataset.mdkrDetailReady='1';
 panel.querySelector('.mdkr-tier-info small')?.remove();
 const stat=root.querySelector('.profile-grid .statbox:nth-child(2)');
 const action=make('button','mdkr-pt-open');action.type='button';action.title='포인트에 반영된 20개 채보 보기';
 const original=panel.querySelector('.mdkr-tier-heading');
 if(original){original.parentElement.insertBefore(action,original);action.append(original);}
 action.append(make('span','mdkr-pt-open-hint','기록 보기  ›'));
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 const targetId=params.get('user');
 const trigger=async()=>{
  let id=targetId;
  if(!id){try{id=(await client?.auth.getUser())?.data?.user?.id}catch(e){console.warn(e)}}
  if(!id)return;
  await open(id,serial);
 };
 action.onclick=trigger;
 if(stat){stat.classList.add('mdkr-pt-stat-clickable');stat.setAttribute('role','button');stat.tabIndex=0;stat.onclick=trigger;stat.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();trigger()}};}
}
players=async function(){const n=++serial;close();const result=await oldPlayers();if(n===serial)init();return result};
})();
