/* MDKR LADDER 2.0 public-safe beta: isolated route, no changes to existing backend. */
(()=>{'use strict';
const cfg=window.MDKR_CONFIG||{};
const db=(window.supabase&&cfg.supabaseUrl&&cfg.supabaseAnonKey)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:false,persistSession:true}}):null;
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\"':'&quot;',"'":'&#39;'}[c]));
let uid=null,allowed=null,queueTimer=null,renderToken=0;
const $=s=>document.querySelector(s);
const query=()=>location.hash.split('?')[0]==='#/ladder';
function notice(msg){const n=$('#mdv2-message');if(n)n.textContent=msg}
function pickOption(list,id){return list.map(s=>`<option value="${html(s.chart_id)}" ${s.chart_id===id?'selected':''}>${html(s.title)} · Lv.${s.level}${s.chart_type==='HIDDEN'?' HIDDEN':''}</option>`).join('')}
function chartCover(s){return html(s.cover_path||s.cover_url||'')}
function showSongs(charts){return charts.map((s,i)=>`<div class="mdv2-song"><img class="mdv2-cover" src="${chartCover(s)}" alt="" onerror="this.style.visibility='hidden'"><div><strong>${html(s.title)}</strong><small>${html(s.artist)}</small><span class="mdv2-tag">Lv.${s.level} ${html(s.chart_type)}</span></div></div>`).join('')}
async function init(){const token=++renderToken;clearInterval(queueTimer);if(!query())return;setTimeout(async()=>{
 if(!query()||token!==renderToken)return;const v=$('#view');if(!v)return;
 v.innerHTML=`<div id="mdkr-v2-panel"><div class="mdv2-hero"><span class="mdv2-kicker">MDKR RECORDS · UPDATE 2.0</span><h2>ONLINE LADDER <span class="mdv2-tag">PUBLIC TEST</span></h2><p class="mdv2-muted">1600 Elo · K=30 · 양측 원픽 2개 + 랜덤 3개 → 비공개 동시 밴 → 3곡 매치. 3R 하드판정.</p></div><div id="mdv2-message" class="mdv2-notice">로그인 상태를 확인하는 중…</div><div class="mdv2-grid"><section class="mdv2-card"><h3>매칭 설정</h3><p class="mdv2-muted">최소~최대 난이도 범위를 지정해 주세요.</p><div class="mdv2-row"><div style="flex:1"><label>최소 레벨</label><select class="mdv2-field" id="mdv2-min">${[7,8,9,10,11,12].map(x=>`<option>${x}</option>`).join('')}</select></div><div style="flex:1"><label>최대 레벨</label><select class="mdv2-field" id="mdv2-max">${[7,8,9,10,11,12].map(x=>`<option>${x}</option>`).join('')}</select></div></div><p><label><input type="checkbox" id="mdv2-dlc" class="mdv2-checkbox">매칭 대상으로 지정한 곡의 DLC/해금 조건을 충족합니다 (자기 신고)</label></p><label>내 원픽 채보</label><input id="mdv2-search" class="mdv2-field" placeholder="곡명 검색"><select id="mdv2-onepick" class="mdv2-field" style="margin-top:7px"></select><div class="mdv2-row" style="margin-top:16px"><button class="mdv2-btn" id="mdv2-start" disabled>큐 시작</button><button class="mdv2-btn" id="mdv2-cancel" disabled>큐 취소</button></div><div class="mdv2-queue" id="mdv2-state">대기</div></section><section class="mdv2-card"><h3>래더 안내</h3><p class="mdv2-muted">양측 원픽을 반드시 포함하고 랜덤 3곡을 추가합니다. 원픽이 중복되면 랜덤 4곡을 추가합니다. 두 사람은 선택을 공개하지 않고 동시 밴하며, 동일 밴 시 남은 4곡에서 랜덤으로 3곡을 선택합니다.</p><p class="mdv2-muted">1R·2R 일반 판정, 3R 하드판정. 결과는 스크린샷 증빙 후 확정합니다. 공개 밴픽 테스트이며 결과 제출과 Elo 반영은 아직 제공하지 않습니다.</p><div class="mdv2-links"><a href="#/">악곡 랭킹</a><a href="#/players">플레이어 랭킹</a></div></section></div><div class="mdv2-card" id="mdv2-match" style="display:none"></div></div>`;
 const min=$('#mdv2-min'),max=$('#mdv2-max'),one=$('#mdv2-onepick'),search=$('#mdv2-search');min.value='7';max.value='9';
 function choices(){const a=+min.value,b=+max.value,q=search.value.toLowerCase().trim();const list=(typeof songs!=='undefined'?songs:[]).filter(s=>s.level>=a&&s.level<=b&&(!q||s.title.toLowerCase().includes(q)||String(s.artist).toLowerCase().includes(q)));one.innerHTML=pickOption(list.slice(0,300),one.value);if(!list.length)one.innerHTML='<option value="">범위 내 곡이 없습니다</option>'}
 [min,max,search].forEach(el=>el.addEventListener(el===search?'input':'change',choices));choices();
 if(!db){notice('Supabase 연결이 없습니다. 기존 악곡 기록은 정상적으로 이용할 수 있습니다.');return}
 const {data:{user}}=await db.auth.getUser();if(token!==renderToken||!query())return;uid=user?.id;if(!uid){notice('Discord 로그인 후 래더를 이용할 수 있습니다.');return}
 allowed=true;notice('공개 밴픽 테스트입니다. DLC 보유와 난이도 범위를 선택해 큐에 참가하세요. (Elo 변동 없음)');$('#mdv2-start').disabled=false;
 async function refresh(){const {data,error}=await db.rpc('mdkr_ladder_state');if(error){notice(error.message);return}const o=data;if(!o)return;
 const st=$('#mdv2-state');if(st)st.textContent=o.status==='queued'?'매칭 상대를 찾는 중…':o.status==='matched'?'매치 성립!': '대기';
 $('#mdv2-cancel').disabled=o.status!=='queued';$('#mdv2-start').disabled=o.status==='queued'||o.status==='matched';
 const panel=$('#mdv2-match');if(!panel)return;
 if(o.status!=='matched'){panel.style.display='none';return}
 const charts=(o.charts||[]).map(id=>(typeof songs!=='undefined'?songs:[]).find(s=>s.chart_id===id)).filter(Boolean);panel.style.display='block';
 panel.innerHTML=`<h3>매치 #${html(o.match_id)}</h3><p class="mdv2-muted">${o.phase==='ban'?'비공개 동시 밴 진행 중':'선정된 라운드 곡'}</p>${showSongs(charts)}${o.phase==='ban'?`<select id="mdv2-ban-song" class="mdv2-field">${pickOption(charts,'')}</select><p><button class="mdv2-btn" id="mdv2-ban" ${o.my_ban_submitted?'disabled':''}>${o.my_ban_submitted?'밴 제출 완료':'비공개 밴 확정'}</button></p>`:''}${o.phase==='rounds'?'<div class="mdv2-notice">3곡이 결정되었습니다. 점수 제출은 다음 패치에서 연결합니다. 이 테스트 매치는 Elo에 반영되지 않습니다.</div>':''}<p><button class="mdv2-btn" id="mdv2-close">테스트 매치 종료 · 다시 큐 가능</button></p>`;
 const close=$('#mdv2-close');if(close)close.onclick=async()=>{if(!confirm('테스트 매치를 종료할까요? 상대방도 매치에서 나가게 됩니다.'))return;close.disabled=true;const {error}=await db.rpc('mdkr_ladder_close',{p_match_id:o.match_id});if(error)notice(error.message);await refresh()};
 const ban=$('#mdv2-ban');if(ban)ban.onclick=async()=>{ban.disabled=true;const {error}=await db.rpc('mdkr_ladder_ban',{p_chart_id:$('#mdv2-ban-song').value});if(error)notice(error.message);await refresh()};
 }
 $('#mdv2-start').onclick=async()=>{if(+min.value>+max.value)return notice('최소 레벨은 최대 레벨 이하로 선택해 주세요.');if(!$('#mdv2-dlc').checked)return notice('DLC/해금 조건을 확인해 주세요.');if(!one.value)return notice('원픽 채보를 선택해 주세요.');const {error}=await db.rpc('mdkr_ladder_join',{p_min:+min.value,p_max:+max.value,p_onepick:one.value});if(error)return notice(error.message);await refresh()};
 $('#mdv2-cancel').onclick=async()=>{const {error}=await db.rpc('mdkr_ladder_cancel');if(error)notice(error.message);await refresh()};
 await refresh();queueTimer=setInterval(()=>{if(query()&&token===renderToken)refresh();else clearInterval(queueTimer)},3500);
 },0)}
 window.addEventListener('hashchange',()=>{if(query())init();else{renderToken++;clearInterval(queueTimer)}});
 window.addEventListener('load',()=>{const tabs=document.querySelector('.tabs');if(tabs&&!tabs.querySelector('a[href="#/ladder"]'))tabs.insertAdjacentHTML('beforeend','<a href="#/ladder" data-route="ladder">온라인 래더 <sup>β</sup></a>');if(query())init()});
 // Wrap router before the ordinary router runs; preserve old pages.
 if(typeof window.route==='function'){const original=window.route;window.route=function(...args){if(query()){init();return}return original.apply(this,args)}}
})();
