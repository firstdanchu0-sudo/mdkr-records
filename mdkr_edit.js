/* MDKR v0.7 record correction UI, added after backend.js */
(()=>{
'use strict';
const cfg=window.MDKR_CONFIG||{};
if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase?.createClient)return;
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
const levels={PENDING:'대기',APPROVED:'승인',REJECTED:'반려'};
const fields='id,chart_id,status,judge,accuracy,early,late,great,miss,screenshot_path,created_at';
let last='',rendering=false;
function chartName(id){const s=(window.songs||[]).find(x=>x.chart_id===id);return s?.title_ko||s?.title||id}
function ui(title){const v=document.querySelector('#view'); if(!v)return null;
 v.innerHTML=`<div class="section-head"><h2>${title}</h2></div><div id="mdkr-edit-ui" class="panel">불러오는 중…</div>`;
 return v.querySelector('#mdkr-edit-ui');}
function optionsFor(s){return `<option value="${h(s.id)}">${h(s.chart_id)} · ${h(s.judge)} · ${h(s.status)} · ${new Date(s.created_at).toLocaleDateString('ko-KR')}</option>`}
async function userPage(){const box=ui('내 기록 수정 신청');if(!box)return;
 const {data:{user}}=await db.auth.getUser();if(!user){box.textContent='Discord 로그인 후 이용할 수 있습니다.';return}
 const [a,b]=await Promise.all([
  db.from('submissions').select(fields).eq('user_id',user.id).in('status',['APPROVED','PENDING','REJECTED']).order('created_at',{ascending:false}).limit(100),
  db.from('mdkr_record_edit_requests').select('id,submission_id,status,review_reason,created_at,replacement_submission_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100)
 ]);
 if(a.error||b.error){box.textContent='불러오기 실패: '+(a.error||b.error).message;return}
 const rows=a.data||[],requests=b.data||[],blocked=new Set(requests.filter(x=>x.status==='PENDING').map(x=>x.submission_id));
 const valid=rows.filter(x=>!blocked.has(x.id));
 box.innerHTML=`<p class="muted">수정 신청은 관리자 승인 전에는 기록에 반영되지 않습니다. 승인 후 기존 기록은 무효화되고 수정 기록이 새로 승인됩니다. 원본 이력은 보존됩니다.</p>`+
 (valid.length?`<label>수정할 기록</label><select id="edit-source">${valid.map(optionsFor).join('')}</select><div id="edit-chart" class="muted"></div>
 <div class="statrow"><div><label>판정</label><select id="edit-judge"><option>AP</option><option>FC</option><option>OTHER</option></select></div><div><label>정확도(%)</label><input id="edit-accuracy" type="number" min="0" max="100" step="0.001"></div></div>
 <div class="statrow">${[['early','EARLY'],['late','LATE'],['great','GREAT'],['miss','MISS']].map(([k,n])=>`<div><label>${n}</label><input id="edit-${k}" type="number" min="0" max="100000" step="1"></div>`).join('')}</div>
 <p class="muted" id="edit-detail"></p><label>수정 사유</label><textarea id="edit-reason" maxlength="500" placeholder="어떤 내용을 잘못 입력했나요?"></textarea>
 <label>새 결과 스크린샷 (권장, 미선택 시 기존 파일 사용)</label><input id="edit-file" type="file" accept="image/png,image/jpeg,image/webp">
 <p id="edit-result" class="muted"></p><button id="edit-send" class="button primary">관리자에게 수정 신청</button>`:'<div class="notice">수정 가능한 기록이 없거나 모두 검수 대기 중입니다.</div>')+
 `<h3 style="margin-top:28px">내 수정 신청 이력</h3><div class="table-wrap"><table class="ranks"><thead><tr><th>신청일</th><th>상태</th><th>반려 사유</th></tr></thead><tbody>${requests.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ko-KR')}</td><td>${levels[x.status]||h(x.status)}</td><td>${h(x.review_reason||'—')}</td></tr>`).join('')||'<tr><td colspan="3">아직 신청이 없습니다.</td></tr>'}</tbody></table></div>`;
 if(!valid.length)return;
 const el=k=>box.querySelector('#edit-'+k), pick=()=>valid.find(x=>x.id===el('source').value);
 function onPick(){const r=pick();if(!r)return;el('chart').textContent=`채보: ${chartName(r.chart_id)} (${r.chart_id})`;el('judge').value=r.judge;el('accuracy').value=r.accuracy??'';for(const k of ['early','late','great','miss'])el(k).value=r[k]??0;sync()}
 function sync(){const j=el('judge').value;el('great').disabled=j==='AP';el('miss').disabled=j!=='OTHER';if(j==='AP')el('great').value=0;if(j!=='OTHER')el('miss').value=0;
 el('detail').textContent='세부값: '+(['early','late','great'].reduce((s,k)=>s+(+el(k).value||0),0)+2*(+el('miss').value||0));}
 el('source').onchange=onPick;el('judge').onchange=sync;for(const k of ['early','late','great','miss'])el(k).oninput=sync;onPick();
 el('send').onclick=async()=>{const result=el('result'),src=pick();if(!src)return;const data={submission_id:src.id,user_id:user.id,judge:el('judge').value,accuracy:el('accuracy').value===''?null:Number(el('accuracy').value),message:el('reason').value.trim()};
 for(const k of ['early','late','great','miss']){const n=Number(el(k).value);if(!Number.isInteger(n)||n<0||n>100000){result.textContent='판정 수치를 확인해주세요.';return}data[k]=n}
 if(data.accuracy!==null&&(data.accuracy<0||data.accuracy>100||!Number.isFinite(data.accuracy))){result.textContent='정확도는 0~100 사이여야 합니다.';return}
 const file=el('file').files[0];if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)){result.textContent='증빙은 PNG/JPG/WebP, 최대 8MB만 허용됩니다.';return}
 if(!confirm('이 내용으로 수정 신청하시겠습니까? 관리자 승인 전까지 기존 기록은 유지됩니다.'))return;
 el('send').disabled=true;try{data.screenshot_path=src.screenshot_path;
 if(file){const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];const path=`${user.id}/${crypto.randomUUID()}.${ext}`;const uploaded=await db.storage.from('mdkr-evidence').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;data.screenshot_path=path}
 const res=await db.from('mdkr_record_edit_requests').insert(data);if(res.error)throw res.error;result.textContent='신청 접수 완료!';setTimeout(userPage,700)}catch(e){result.textContent='신청 실패: '+e.message;el('send').disabled=false}};
}
async function adminPanel(){const {data:{user}}=await db.auth.getUser();if(!user)return;const admin=await db.rpc('is_mdkr_admin');if(admin.error||!admin.data)return;
 const v=document.querySelector('#view');if(!v||!location.hash.startsWith('#/admin')||v.querySelector('#mdkr-edit-review'))return;
 const panel=document.createElement('section');panel.id='mdkr-edit-review';panel.className='panel';panel.innerHTML='<h3>기록 수정 신청 검수</h3><div id="edit-review-list">불러오는 중…</div>';v.append(panel);
 const q=await db.from('mdkr_record_edit_requests').select('id,submission_id,user_id,judge,accuracy,early,late,great,miss,message,screenshot_path,created_at').eq('status','PENDING').order('created_at',{ascending:true}).limit(100);
 const list=panel.querySelector('#edit-review-list');if(!list)return;
 if(q.error){list.textContent=q.error.message;return}
 list.innerHTML=(q.data||[]).map(r=>`<div class="reviewitem" data-id="${h(r.id)}"><strong>${h(r.submission_id)}</strong><p>수정: ${h(r.judge)} · E ${r.early} / L ${r.late} / G ${r.great} / M ${r.miss} · 정확도 ${r.accuracy??'—'}%</p><p>${h(r.message||'사유 없음')}</p><p class="muted">제출자 ID: ${h(r.user_id)}</p><button class="button evidence-edit" data-path="${h(r.screenshot_path)}">증빙 확인</button> <button class="button primary edit-approve">수정 승인</button> <button class="button edit-reject">수정 반려</button><div class="edit-evidence"></div><p class="edit-status muted"></p></div>`).join('')||'<p class="muted">대기 중인 수정 신청이 없습니다.</p>';
 list.querySelectorAll('.evidence-edit').forEach(b=>b.onclick=async()=>{const r=await db.storage.from('mdkr-evidence').createSignedUrl(b.dataset.path,120);const area=b.parentElement.querySelector('.edit-evidence');area.innerHTML=r.error?h(r.error.message):`<a href="${h(r.data.signedUrl)}" target="_blank" rel="noopener noreferrer">원본 열기</a><img src="${h(r.data.signedUrl)}" style="max-width:100%;max-height:350px;display:block;margin-top:10px" alt="수정 증빙">`});
 for(const b of list.querySelectorAll('.edit-approve,.edit-reject'))b.onclick=async()=>{const row=b.closest('.reviewitem'),ok=b.classList.contains('edit-approve');const reason=ok?null:prompt('반려 사유를 입력하세요.');if(!ok&&(!reason||reason.trim().length<3))return;if(ok&&!confirm('스크린샷과 판정 수치를 확인하셨나요? 기존 기록을 무효화하고 수정 기록을 새로 승인합니다.'))return;
 b.disabled=true;const r=await db.rpc('mdkr_review_record_edit',{p_id:row.dataset.id,p_action:ok?'APPROVED':'REJECTED',p_reason:reason});row.querySelector('.edit-status').textContent=r.error?'실패: '+r.error.message:(ok?'수정 승인 완료':'수정 반려 완료');if(!r.error)setTimeout(()=>{panel.remove();adminPanel()},600);else b.disabled=false};
}
function nav(){const tabs=document.querySelector('.tabs');if(!tabs||tabs.querySelector('[data-route="edit"]'))return;const a=document.createElement('a');a.href='#/edit';a.dataset.route='edit';a.textContent='기록 수정 신청';tabs.append(a)}
async function routeExtras(){const hash=location.hash;nav();if(hash.startsWith('#/edit')){if(rendering)return;rendering=true;await userPage();rendering=false;}else if(hash.startsWith('#/admin'))setTimeout(adminPanel,600)}
window.addEventListener('hashchange',()=>setTimeout(routeExtras,100));
const obs=new MutationObserver(()=>{nav();if(location.hash.startsWith('#/admin')&&!document.querySelector('#mdkr-edit-review')){if(!window.__mdkrEditAdminWait){window.__mdkrEditAdminWait=true;setTimeout(()=>{window.__mdkrEditAdminWait=false;adminPanel()},500)}}});obs.observe(document.body,{childList:true,subtree:true});
setTimeout(routeExtras,500);
})();
