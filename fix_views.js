/* fix_views.js — открытие/закрытие панелей (.view-layer.open) */
(function(){
  if (window.__iomaViews) return;
  window.__iomaViews = true;

  function openView(name){
    document.querySelectorAll('.view-layer.open').forEach(function(v){
      v.classList.remove('open');
      v.setAttribute('aria-hidden', 'true');
    });
    var v = document.getElementById(name + 'View');
    if (!v) { console.warn('[views] не найден #' + name + 'View'); return; }
    v.classList.add('open');
    v.setAttribute('aria-hidden', 'false');
    document.body.classList.add('view-open');
    // Скролл панели наверх
    var sc = v.querySelector('.request-shell, .directory-panel, .calculator-card, .article-shell, .assistant-shell, .customs-shell, .agent-import-shell');
    if (sc) sc.scrollTop = 0;
    console.log('[views] open:', name);
  }

  function closeView(){
    document.querySelectorAll('.view-layer.open').forEach(function(v){
      v.classList.remove('open');
      v.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('view-open');
  }

  document.addEventListener('click', function(e){
    var openEl = e.target.closest && e.target.closest('[data-open-view]');
    if (openEl){
      e.preventDefault();
      openView(openEl.getAttribute('data-open-view'));
      return;
    }
    var closeEl = e.target.closest && e.target.closest('[data-close-view]');
    if (closeEl){
      e.preventDefault();
      closeView();
      return;
    }
    // клик по пустому месту — закрыть, если открыта панель
    if (e.target.classList && e.target.classList.contains('view-layer')){
      closeView();
    }
  }, false);

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeView();
  });

  window.iomaOpenView = openView;
  window.iomaCloseView = closeView;
})();
