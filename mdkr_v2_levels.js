/* MDKR 2.0: patch only filter rendering; keep existing app.js untouched. */
(function () {
  'use strict';
  if (typeof drawFilters !== 'function' || typeof drawCards !== 'function') return;
  drawFilters = function () {
    const panel = document.querySelector('#levelFilters');
    const types = document.querySelector('#typeFilters');
    if (!panel || !types) return;
    panel.innerHTML = ['all',7,8,9,10,11,12].map(l =>
      `<button class="pill ${String(l)===String(currentLevel)?'active':''}" data-l="${l}">${l==='all'?'전체':'LEVEL '+l}</button>`
    ).join('');
    panel.querySelectorAll('[data-l]').forEach(b => b.onclick = () => {
      currentLevel=b.dataset.l; drawFilters(); drawCards();
    });
    types.innerHTML=['all','MASTER','HIDDEN'].map(t=>
      `<button class="pill ${t===currentChartType?'active':''}" data-t="${t}">${t==='all'?'모든 채보':t}</button>`
    ).join('');
    types.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{
      currentChartType=b.dataset.t;drawFilters();drawCards();
    });
  };
})();
