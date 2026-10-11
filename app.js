let songs=[];
let currentLevel='all',currentQuery='',currentChartType='all';
const view=document.querySelector('#view');
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const img=s=>`<img class="cover" loading="lazy" src="${esc(s.cover_path)}" alt="${esc(s.title)} 자켓">`;
const title=s=>s.title_ko&&s.title_ko!==s.title?s.title_ko:s.title;
const songMeta=s=>`${esc(s.artist)} · LV.${esc(s.level)}${s.chart_type==='HIDDEN'?' · HIDDEN':''}`;
const card=s=>`<a class="song" href="#/chart/${encodeURIComponent(s.chart_id)}">${img(s)}<div class="songinfo"><div class="songname">${esc(title(s))}</div><div class="songmeta">${songMeta(s)}</div></div></a>`;
function setActive(t){document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('active',a.dataset.route===t))}
function songList(){
  setActive('songs');
  view.innerHTML=`<div class="section-head"><div><h2>악곡 랭킹</h2><div class="muted">MASTER · HIDDEN 포함 · 현재 수집된 ${songs.length}개 채보</div></div></div>
  <input id="query" placeholder="곡명, 아티스트 검색" value="${esc(currentQuery)}" aria-label="악곡 검색">
  <div class="filters" id="levelFilters"></div>
  <div class="filters" id="typeFilters"></div>
  <div class="muted" id="count"></div>
  <div class="grid" id="songsGrid" style="margin-top:13px"></div>`;
  const q=view.querySelector('#query');
  q.addEventListener('input',e=>{currentQuery=e.target.value;drawCards()});
  drawFilters();drawCards();
}
function drawFilters(){
  view.querySelector('#levelFilters').innerHTML=['all',10,11,12].map(l=>`<button class="pill ${String(l)===String(currentLevel)?'active':''}" data-l="${l}">${l==='all'?'전체':'LEVEL '+l}</button>`).join('');
  view.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{currentLevel=b.dataset.l;drawFilters();drawCards()});
  view.querySelector('#typeFilters').innerHTML=['all','MASTER','HIDDEN'].map(t=>`<button class="pill ${t===currentChartType?'active':''}" data-t="${t}">${t==='all'?'모든 채보':t}</button>`).join('');
  view.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{currentChartType=b.dataset.t;drawFilters();drawCards()});
}
function drawCards(){
  const q=currentQuery.trim().toLowerCase();
  const filtered=songs.filter(s=>(currentLevel==='all'||String(s.level)===String(currentLevel))&&(currentChartType==='all'||s.chart_type===currentChartType)&&(!q||[s.title,s.title_ko,s.artist,s.album_title].some(v=>String(v??'').toLowerCase().includes(q))));
  view.querySelector('#count').textContent=`${filtered.length}개 채보 검색됨`;
  view.querySelector('#songsGrid').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">검색 결과가 없습니다.</div>';
}
function chartPage(id){
  setActive('songs');
  const s=songs.find(x=>x.chart_id===id);
  if(!s){view.innerHTML='<div class="empty">채보를 찾지 못했어요. <a href="#/">목록으로</a></div>';return}
  view.innerHTML=`<a class="back" href="#/">← 악곡 목록</a><div class="detail">${img(s)}<div><span class="tag">LV.${s.level}</span> ${s.chart_type==='HIDDEN'?'<span class="tag hidden">HIDDEN</span>':''}<h2 style="margin-top:10px">${esc(title(s))}</h2><div class="muted">${esc(s.artist)}</div></div></div><div class="section-head"><div><h2>한국 전일 TOP 10</h2><p class="muted">공개 랭킹 서버 연결 전에는 실제 기록이 비어 있을 수 있습니다.</p></div><a class="button primary" href="#/submit?chart=${encodeURIComponent(id)}">기록 제출</a></div><div class="table-wrap"><table class="ranks"><thead><tr><th>순위</th><th>플레이어</th><th>판정</th><th>세부</th><th>E / L</th><th>G / M</th></tr></thead><tbody><tr><td colspan="6"><div class="empty">랭킹 불러오는 중…</div></td></tr></tbody></table></div>`;
}
function players(){setActive('players');view.innerHTML='<h2>플레이어 랭킹</h2><div class="empty">플레이어 통계를 불러오는 중입니다…</div>'}
function submit(){
  setActive('submit');
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  const selected=params.get('chart');
  view.innerHTML=`<h2>기록 제출</h2><div class="notice">로그인과 서버 연결 상태에 따라 실제 제출이 비활성화될 수 있습니다.</div><div class="panel form"><label for="chart-search">곡 검색</label><input id="chart-search" type="text" placeholder="곡명 또는 아티스트 검색"><label for="chart">악곡 및 채보</label><select id="chart"></select><label for="judge">판정</label><select id="judge"><option value="AP">AP</option><option value="FC">FC</option><option value="OTHER">OTHER</option></select><div class="statrow"><div style="flex:1"><label for="accuracy">정확도 (%)</label><input id="accuracy" type="number" min="0" max="100" step="0.001" placeholder="예: 99.823"></div><div style="flex:1"><label for="early">EARLY</label><input id="early" type="number" min="0" value="0"></div><div style="flex:1"><label for="late">LATE</label><input id="late" type="number" min="0" value="0"></div></div><div class="statrow"><div style="flex:1"><label for="great">GREAT</label><input id="great" type="number" min="0" value="0"></div><div style="flex:1"><label for="miss">MISS</label><input id="miss" type="number" min="0" value="0"></div></div><div class="muted">랭킹 세부값 = EARLY + LATE + GREAT + (MISS × 2)</div><label for="shot">스크린샷</label><input id="shot" type="file" accept="image/png,image/jpeg,image/webp"><button class="button primary" style="margin-top:20px" id="preview">제출 내용 확인</button><div id="previewmsg" class="muted" style="margin-top:12px"></div></div>`;
  const sel=view.querySelector('#chart');
  function renderOptions(query=''){
    const q=query.trim().toLowerCase();
    const filtered=songs.filter(s=>!q||[title(s),s.title,s.title_ko,s.artist].some(v=>String(v??'').toLowerCase().includes(q)));
    sel.innerHTML=filtered.map(s=>`<option value="${esc(s.chart_id)}" ${selected===s.chart_id?'selected':''}>${esc(title(s))} · Lv.${s.level}${s.chart_type==='HIDDEN'?' HIDDEN':''}</option>`).join('');
  }
  renderOptions();
  view.querySelector('#chart-search').addEventListener('input',e=>renderOptions(e.target.value));
  view.querySelector('#preview').onclick=()=>{
    const file=view.querySelector('#shot').files[0];
    const e=Number(view.querySelector('#early').value||0),l=Number(view.querySelector('#late').value||0),g=Number(view.querySelector('#great').value||0),m=Number(view.querySelector('#miss').value||0);
    const detail=e+l+g+m*2;
    view.querySelector('#previewmsg').textContent=file?`세부값 ${detail} · ${file.name} · 실제 제출은 서버 연결 시 진행됩니다.`:'스크린샷을 선택해 주세요.';
  }
}
function admin(){setActive('admin');view.innerHTML='<h2>관리자 검수</h2><div class="notice">관리자 권한과 서버 연결이 준비되면 승인/반려/삭제 기능을 사용할 수 있습니다.</div><div class="panel"><h3>승인 대기</h3><p class="muted">기록이 아직 없습니다.</p></div>'}
function route(){const h=decodeURIComponent(location.hash.slice(1).split('?')[0]||'/');if(h.startsWith('/chart/'))chartPage(h.slice(7));else if(h==='/players')players();else if(h==='/submit')submit();else if(h==='/admin')admin();else songList();}
fetch('data/songs.json').then(r=>{if(!r.ok)throw Error('데이터 응답 오류');return r.json()}).then(rows=>{songs=rows;document.querySelector('#stat-all').textContent=rows.length;document.querySelector('#stat-hidden').textContent=rows.filter(s=>s.chart_type==='HIDDEN').length;route();window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0)})}).catch(e=>{view.innerHTML=`<div class="empty">악곡 데이터를 불러오지 못했습니다.<br>${esc(e.message)}<br>GitHub Pages 또는 로컬 웹서버에서 열어주세요.</div>`});
