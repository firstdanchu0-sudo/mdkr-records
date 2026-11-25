/* MDKR Pack Explorer 2.0 — hierarchical Korean album browsing and UI refresh.
   Load AFTER mdkr_qol7.js. Does not modify scoring, submissions, or the database. */
(()=>{'use strict';
if(typeof songList!=='function'||typeof drawCards!=='function')return;
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s??'').trim().toLocaleLowerCase('ko');
const ids=s=>s.trim().split(/\s+/).map(n=>'ALBUM'+n);
// Korean names transcribed from MuseDash.moe's api/albums/albums_Korean.json,
// matched against api/albums/albums.json by jsonName. Kept local to avoid API failures.
const namesText=`
1|기본 패키지
2|귀여움은 정의다 Vol.1
3|치유는 포기했어 Vol.1
4|오타쿠의 쾌락 모음 Vol.1
5|오타쿠의 쾌락 모음 Vol.2
6|오타쿠의 쾌락 모음 Vol.3
7|경비가 불타고 있다 Vol.1
8|치유는 포기했어 Vol.2
9|치유는 포기했어 Vol.3
10|오타쿠의 쾌락 모음 Vol.4
11|치유는 포기했어 Vol.4
12|오타쿠의 쾌락 모음 Vol.5
13|치유는 포기했어 Vol.5
14|귀여움은 정의다 Vol.2
15|오타쿠의 쾌락 모음 Vol.6
16|귀여움은 정의다 Vol.3
17|치유는 포기했어 Vol.6
18|오타쿠의 쾌락 모음 Vol.7
19|귀여움은 정의다 Vol.4
20|치유는 포기했어 Vol.7
21|오타쿠의 쾌락 모음 Vol.8
22|경비가 불타고 있다 Nano Core
23|치유는 포기했어 Vol.8
24|귀여움은 정의다 Vol.5
25|오타쿠의 쾌락 모음 Vol.9
26|뮤즈 라디오 FM101
27|치유는 포기했어 Vol.9
28|나나히라 축제
29|오타쿠의 쾌락 모음 Vol.10
30|Let's GROOVE!
31|귀여움은 정의다 Vol.6
32|오타쿠의 쾌락 모음 Vol.11
33|같이 나쁜 짓 좀 해볼까
34|cyTus
35|HARDCORE TANO*C
36|오타쿠의 쾌락 모음 SP
37|치유는 포기했어 Vol.10
38|귀여움은 정의다 Vol.7
39|Phigros
40|뮤즈 라디오 FM102
41|오타쿠의 쾌락 모음 Vol.12
42|7th Beat Games
43|동방 뮤악단 -Ⅰ-
44|MD 보완 계획
45|오타쿠의 쾌락 모음 Vol.13
46|WACCA Horizon
47|오타쿠의 쾌락 모음 Vol.14
48|Arcaea
49|DJMAX Reflect
50|서프라이즈! 두근두근! 밸런타인데이!
51|냥냥 유니버스!
52|버추얼 아이돌이 되자
53|뮤즈 라디오 FM103
54|오타쿠의 쾌락 모음 Vol.15
55|MEGAREX THE FUTURE
56|동방 뮤악단 -Ⅱ-
57|치유는 포기했어 Vol.11
58|오타쿠의 쾌락 모음 Vol.16
59|나나히라 파라다이스
60|MSR 스페셜 음악 앨범_Vol.01
61|maimai DX 한정 음악 팩_Vol.01
62|오라 대쉬
63|오타쿠의 쾌락 모음 Vol.17
64|뮤즈 라디오 FM104
65|COSMIC RADIO PEROLIST
66|NeonAbyss
67|Miku in Museland
68|오타쿠의 쾌락 모음 Vol.18
69|속임수의 대가
70|동방 뮤악단 -Ⅲ-
71|Rin·Len's Mirrorland
72|Valentine Stage
73|뮤즈 투사의 전설
74|오타쿠의 쾌락 모음 Vol.19
75|CHUNITHM COURSE MUSE
76|초보자 온전 팩
77|뮤즈 라디오 FM105
78|Let's 리듬게임 파티!
79|끝없는 발레 턴
80|꽃비 합주 비화
81|동방 뮤악단 -IV-
82|MD 급 전술 교육 BD
83|MSR 스페셜 음악 앨범_Vol.02
84|Cosmic Radio 2024
85|Muse Dash・Legend
86|오타쿠의 쾌락 모음 Vol.20
87|아쿠아 드라이브 가이드
88|내 꿈은 리듬마스터!
89|뮤즈 라디오 FM106
90|기묘한 항해, 신비의 보물
91|오차원의 메아리
92|퇴원 후 48시간
93|HARDCORE MOTTO TANO*C
94|블루 홀에 오신 것을 환영합니다!
95|Cosmic Radio 2025
96|애♡마
97|명조: 워더링 웨이브 선약 방송국
98|DASH AND SHOOT!
99|동방 뮤악단 -V-
100|의지와 힘의 노래
101|maimai DX 한정 음악 팩_Vol.02
102|R의 예고장
103|잠든 황금의 각인
104|오타쿠의 쾌락 모음 Vol.21`;
const nameMap=Object.fromEntries(namesText.trim().split('\n').map(line=>{const p=line.indexOf('|');return ['ALBUM'+line.slice(0,p),line.slice(p+1)]}));
const groupDefs=[
 {id:'happy',icon:'🎧',title:'오타쿠의 쾌락 모음',sub:'Vol.1 ~ Vol.21 · SP',ids:ids('4 5 6 10 12 15 18 21 25 29 32 36 41 45 47 54 58 63 68 74 86 104')},
 {id:'giveup',icon:'💊',title:'치유는 포기했어',sub:'Vol.1 ~ Vol.11',ids:ids('3 8 9 11 13 17 20 23 27 37 57')},
 {id:'cute',icon:'🌸',title:'귀여움은 정의다',sub:'Vol.1 ~ Vol.7',ids:ids('2 14 16 19 24 31 38')},
 {id:'radio',icon:'📻',title:'뮤즈 라디오',sub:'FM · Cosmic Radio',ids:ids('26 40 53 64 65 77 84 89 95')},
 {id:'touhou',icon:'⛩️',title:'동방 뮤악단',sub:'Ⅰ ~ Ⅴ',ids:ids('43 56 70 81 99')},
 {id:'collab',icon:'🎮',title:'게임 콜라보',sub:'게임별로 보기',ids:ids('34 39 42 46 48 49 61 66 67 71 75 78 88 97 100 101')},
 {id:'basic',icon:'🎼',title:'기본 음악',sub:'기본 · 무료 팩',ids:ids('1 7 22')},
 {id:'plus',icon:'✨',title:'MD 보완 계획',sub:'추가 수록곡',ids:ids('44')},
 {id:'theme',icon:'🎨',title:'테마 팩',sub:'이벤트 · 테마 앨범',ids:ids('50 51 52 62 69 72 73 76 79 85 90 92 96 102 103')},
 {id:'other',icon:'💿',title:'스페셜 / 기타',sub:'기타 음악 팩',ids:[]}
];
const collabs=[
 {id:'maimai',name:'maimai DX',icon:'🥁',ids:ids('61 101')},
 {id:'arcaea',name:'Arcaea',icon:'🎶',ids:ids('48')},
 {id:'phigros',name:'Phigros',icon:'🎹',ids:ids('39')},
 {id:'wacca',name:'WACCA',icon:'💫',ids:ids('46')},
 {id:'djmax',name:'DJMAX',icon:'🎛️',ids:ids('49')},
 {id:'chunithm',name:'CHUNITHM',icon:'⚡',ids:ids('75')},
 {id:'cytus',name:'Cytus',icon:'🎵',ids:ids('34')},
 {id:'7th',name:'7th Beat Games',icon:'🥁',ids:ids('42')},
 {id:'neon',name:'Neon Abyss',icon:'🌈',ids:ids('66')},
 {id:'miku',name:'하츠네 미쿠',icon:'🎤',ids:ids('67')},
 {id:'rinlen',name:'린 & 렌',icon:'🎙️',ids:ids('71')},
 {id:'wuthering',name:'명조',icon:'🌊',ids:ids('97')},
 {id:'undertale',name:'UNDERTALE / DELTARUNE',icon:'❤️',ids:ids('100')},
 {id:'rhythm',name:'리듬게임 합동',icon:'🎮',ids:ids('78 88')}
];
const groupLookup=new Map(groupDefs.map(g=>[g.id,g]));
const collabLookup=new Map(collabs.map(g=>[g.id,g]));
const explicit=new Set(groupDefs.filter(g=>g.id!=='other').flatMap(g=>g.ids));
let albums=new Map();
const state={mode:'all',group:null,game:null,album:null,packSearch:''};
function collect(){
 if(typeof songs==='undefined')return;
 const map=new Map();
 for(const song of songs){const id=String(song.album_id||'UNKNOWN');let a=map.get(id);
  if(!a){a={id,title:nameMap[id]||String(song.album_title||id),charts:0,uids:new Set(),cover:song.cover_path||song.cover_url||''};map.set(id,a)}
  a.charts++;a.uids.add(song.uid||song.chart_id);
 }
 albums=map;
 groupLookup.get('other').ids=[...map.keys()].filter(x=>!explicit.has(x));
}
const albumInfo=id=>albums.get(id);
const matchIds=items=>items.filter(id=>albums.has(id));
const albumLabel=id=>nameMap[id]||albumInfo(id)?.title||id;
function albumStats(array){const found=matchIds(array),charts=found.reduce((sum,id)=>sum+albums.get(id).charts,0);return {count:found.length,charts}}
function groupFor(id){return groupLookup.get(id)}
function availableGroup(id){return albumStats(groupFor(id)?.ids||[]).charts>0}
function volume(s){const match=String(s||'').match(/Vol\.?\s*0*(\d+)/i);return match?Number(match[1]):null}
function sortAlbums(a,b){const av=volume(albumLabel(a)),bv=volume(albumLabel(b));if(av!==null||bv!==null){if(av===null)return 1;if(bv===null)return -1;return av-bv}return albumLabel(a).localeCompare(albumLabel(b),'ko',{numeric:true})}
function allowedAlbumIds(){if(state.mode!=='packs')return null;
 if(state.album)return new Set([state.album]);
 return new Set(); // Show songs only after selecting a specific pack.
}
function getShell(){return $('#view .mdkr-activity-content')||$('#view')}
function buildCard({icon,title,desc,count,image},action,chosen=false){
 const btn=document.createElement('button');btn.type='button';btn.className='mdkr-px-card'+(chosen?' is-current':'');btn.addEventListener('click',action);
 const art=document.createElement('span');art.className='mdkr-px-icon'+(image?' has-cover':'');
 if(image){const img=document.createElement('img');img.src=image;img.loading='lazy';img.alt='';img.onerror=()=>{img.remove();art.textContent=icon||'♫'};art.append(img)}else art.textContent=icon||'♫';
 const words=document.createElement('span');words.className='mdkr-px-copy';
 const name=document.createElement('strong');name.textContent=title;
 const detail=document.createElement('small');detail.textContent=desc||'';
 words.append(name,detail);btn.append(art,words);
 if(count){const badge=document.createElement('span');badge.className='mdkr-px-count';badge.textContent=count;btn.append(badge)}
 return btn;
}
function resetToAll(){state.mode='all';state.group=null;state.game=null;state.album=null;state.packSearch='';render();drawCards()}
function openGroup(group){state.mode='packs';state.group=group;state.game=null;state.album=null;state.packSearch='';render();drawCards()}
function openGame(game){state.game=game;state.album=null;state.packSearch='';const c=collabLookup.get(game);if(c&&matchIds(c.ids).length===1)state.album=matchIds(c.ids)[0];render();drawCards()}
function openAlbum(id){state.album=id;state.packSearch='';render();drawCards()}
function breadcrumb(label,onClick,here=false){const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.className='mdkr-px-crumb'+(here?' current':'');btn.disabled=here;btn.onclick=onClick;return btn}
function render(){const root=$('#mdkr-pack-explorer');if(!root)return;
 const allButton=$('#mdkr-px-all',root),packsButton=$('#mdkr-px-packs',root),body=$('#mdkr-px-body',root),grid=$('#mdkr-px-grid',root),path=$('#mdkr-px-path',root),search=$('#mdkr-px-search',root),summary=$('#mdkr-px-summary',root);
 allButton.classList.toggle('active',state.mode==='all');packsButton.classList.toggle('active',state.mode==='packs');
 allButton.setAttribute('aria-pressed',String(state.mode==='all'));packsButton.setAttribute('aria-pressed',String(state.mode==='packs'));
 body.hidden=state.mode==='all';
 const shell=getShell();if(shell)shell.classList.toggle('mdkr-px-picking',state.mode==='packs'&&!state.album);
 if(state.mode==='all')return;
 path.replaceChildren();path.append(breadcrumb('전체 팩',()=>{state.group=null;state.game=null;state.album=null;state.packSearch='';render();drawCards()},!state.group));
 if(state.group){path.append(' › ');path.append(breadcrumb(groupFor(state.group)?.title||'',()=>openGroup(state.group),!state.game&&!state.album));}
 if(state.game){path.append(' › ');path.append(breadcrumb(collabLookup.get(state.game)?.name||'',()=>{state.album=null;render();drawCards()},!state.album));}
 if(state.album){path.append(' › ');path.append(breadcrumb(albumLabel(state.album),null,true));}
 search.value=state.packSearch;
 search.placeholder=!state.group?'큰 팩 이름 검색':state.group==='collab'&&!state.game?'콜라보 작품 검색':'세부 팩 검색';
 grid.replaceChildren();let nodes=[];const term=normalize(state.packSearch);
 if(!state.group){
  nodes=groupDefs.filter(g=>availableGroup(g.id)).map(g=>{const v=albumStats(g.ids);return {title:g.title,desc:g.sub,icon:g.icon,count:v.count+'팩',action:()=>openGroup(g.id)}});
  summary.textContent='큰 팩을 선택해 주세요. 원하는 팩을 고른 뒤 수록곡을 확인할 수 있어요.';
 }else if(state.group==='collab'&&!state.game){
  nodes=collabs.filter(g=>albumStats(g.ids).charts>0).map(g=>{const v=albumStats(g.ids);return {title:g.name,desc:v.count>1?'세부 팩 '+v.count+'개':'콜라보 악곡',icon:g.icon,count:v.charts+'채보',action:()=>openGame(g.id)}});
  summary.textContent='게임이나 콜라보 작품을 선택해 주세요.';
 }else if(state.album){
  const a=albumInfo(state.album),g=groupFor(state.group);
  summary.textContent=(a?a.uids.size+'곡 · '+a.charts+'채보 · ':'')+'아래 악곡 랭킹에서 수록곡을 확인하세요.';
  const back=document.createElement('button');back.type='button';back.className='mdkr-px-back';back.textContent='‹ 다른 팩 보기';back.onclick=()=>{if(state.game){state.album=null;if(matchIds(collabLookup.get(state.game)?.ids||[]).length===1){state.game=null}}else state.album=null;render();drawCards()};
  grid.append(back);
 }else{
  let list=groupFor(state.group)?.ids||[];
  if(state.game)list=collabLookup.get(state.game)?.ids||[];
  nodes=matchIds(list).sort(sortAlbums).map(id=>{
   const a=albumInfo(id),num=volume(albumLabel(id));
   return {title:num!==null?'Vol.'+num:albumLabel(id),desc:albumLabel(id),icon:'💿',image:a?.cover,count:a?.uids.size+'곡',action:()=>openAlbum(id)};
  });
  summary.textContent=groupFor(state.group)?.title+' · '+albumStats(list).count+'개 세부 팩';
 }
 const shown=nodes.filter(n=>!term||normalize(n.title+' '+n.desc).includes(term));
 shown.forEach(n=>grid.append(buildCard(n,n.action)));
 if(!shown.length&&nodes.length){const p=document.createElement('p');p.className='mdkr-px-empty';p.textContent='검색 결과가 없습니다.';grid.append(p)}
 const hideSearch=!!state.album;search.hidden=hideSearch;
 // Limit extra vertical space when the selected pack is already showing songs.
 grid.classList.toggle('selected-pack',!!state.album);
}
function attach(){const base=getShell();if(!base||!$('#songsGrid',base))return;
 // QoL v1 injected a flat 100+ album grid. Remove it; its state is never touched.
 $('#mdkr-album-browser',base)?.remove();
 $('#mdkr-pack-explorer',base)?.remove();
 collect();
 const panel=document.createElement('section');panel.id='mdkr-pack-explorer';panel.className='mdkr-pack-explorer';
 panel.innerHTML=`<div class="mdkr-px-head"><div class="mdkr-px-title"><span class="mdkr-px-heading-icon">▦</span><div><strong>악곡 탐색</strong><small>전체 곡 또는 악곡 팩별로 보기</small></div></div><div class="mdkr-px-modes" role="group" aria-label="악곡 탐색 방식"><button id="mdkr-px-all" type="button">전체 곡</button><button id="mdkr-px-packs" type="button">팩별 보기</button></div></div><div id="mdkr-px-body" class="mdkr-px-body" hidden><nav id="mdkr-px-path" aria-label="악곡 팩 경로"></nav><div class="mdkr-px-searchbox"><span aria-hidden="true">⌕</span><input id="mdkr-px-search" type="search" aria-label="악곡 팩 검색" placeholder="악곡 팩 이름 검색"></div><p id="mdkr-px-summary" class="mdkr-px-summary"></p><div id="mdkr-px-grid" class="mdkr-px-grid"></div></div>`;
 const head=$('.section-head',base);if(head)head.after(panel);else base.prepend(panel);
 $('#mdkr-px-all',panel).onclick=resetToAll;
 $('#mdkr-px-packs',panel).onclick=()=>{state.mode='packs';render();drawCards()};
 $('#mdkr-px-search',panel).oninput=e=>{state.packSearch=e.target.value;render();const input=$('#mdkr-px-search',panel);input.focus();input.setSelectionRange(input.value.length,input.value.length)};
 const q=$('#query',base);if(q&&!q.dataset.mdkrPackBound){q.dataset.mdkrPackBound='1';q.addEventListener('input',()=>{if(state.mode==='packs'&&!state.album){state.mode='all';render();drawCards()}})}
 render();drawCards();
}
const prevSongList=songList;
songList=function(...args){const result=prevSongList.apply(this,args);attach();return result};
const prevDrawCards=drawCards;
drawCards=function(...args){
 const result=prevDrawCards.apply(this,args);
 const grid=$('#songsGrid'),count=$('#count');if(!grid||!count)return result;
 const allowed=allowedAlbumIds();if(!allowed)return result;
 if(!allowed.size){grid.innerHTML='<div class="mdkr-px-choose">위에서 세부 악곡 팩을 선택하면 수록곡이 표시됩니다.</div>';count.textContent='악곡 팩을 선택해 주세요';return result}
 const q=normalize(typeof currentQuery==='string'?currentQuery:'');
 const filtered=songs.filter(s=>allowed.has(String(s.album_id||'UNKNOWN'))
  &&(String(currentLevel)==='all'||String(s.level)===String(currentLevel))
  &&(currentChartType==='all'||s.chart_type===currentChartType)
  &&(!q||[s.title,s.title_ko,s.artist,s.album_title,nameMap[s.album_id]].some(v=>normalize(v).includes(q))));
 count.textContent=albumLabel(state.album)+' · '+filtered.length+'개 채보';
 grid.innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">선택한 팩에서 조건에 맞는 채보가 없습니다.</div>';
 return result;
};
// If a render is triggered before first song data load, the main app's route()
// will call the overridden songList after data arrives.
})();


// Pack Explorer 2.1: remove a leftover HOME-only right-sidebar grid when
// navigating to player rankings, profiles, record submission, and admin pages.
// Do not touch the home page nor the dedicated recent-activity page.
(()=>{
  const reset = () => {
    const hash=location.hash.split('?')[0]||'#/';
    if(hash==='#/'||hash==='#'||hash==='#/activity') return;
    const root=document.getElementById('view');
    if(root)root.classList.remove('mdkr-activity-layout');
  };
  window.addEventListener('hashchange', reset);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',reset,{once:true});
  else reset();
})();
