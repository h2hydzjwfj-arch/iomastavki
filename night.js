/* IOMASTAVKA — тема «Полночь и стекло»: поведение новых блоков главной.
   Без зависимостей; всё, что не нашлось на странице, тихо пропускается. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function safe(f) { try { f(); } catch (e) { if (window.console) console.warn('night.js', e); } }

  // «Рассчитать ставку» — плавно к карте-калькулятору и в поле веса
  safe(function () {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-n-go="calc"]');
      if (!b) return;
      e.preventDefault();
      if (window.__iomaCloseViews) { try { window.__iomaCloseViews(); } catch (x) {} }
      var head = $('#nCalcHead') || $('#v3Hero');
      if (head) head.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { var w = $('#mcW'); if (w) try { w.focus({ preventScroll: true }); } catch (x) { w.focus(); } }, 700);
    });
  });

  // Вкладки «Ключевые возможности» / «Как мы работаем»
  safe(function () {
    $$('.nw-group').forEach(function (g) {
      $$('.nw-tabs button', g).forEach(function (t) {
        t.addEventListener('click', function () {
          var n = t.getAttribute('data-t');
          $$('.nw-tabs button', g).forEach(function (x) { var on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
          $$('.nw-pane', g).forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-p') === n); });
          var num = $('#nwNum'); if (num) num.textContent = '0' + n;
        });
      });
    });
  });

  // Заголовок первого экрана на выбранном языке: первая строка heroText — в заголовок, вторая — в абзац
  safe(function () {
    var src = $('#nHeroSrc'), h1 = $('#nH1'), p = $('#nHeroP');
    if (!src || !h1 || !p) return;
    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function sync() {
      var parts = src.innerHTML.split(/<br\s*\/?>/i).map(function (s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent.trim(); });
      if (!parts[0]) return;
      var t = esc(parts[0]).replace(/([.!?。])\s+(?=\S)/, '$1<br>');
      if (h1.innerHTML !== t) h1.innerHTML = t;
      if (parts[1] && p.textContent !== parts[1]) p.textContent = parts[1];
    }
    sync();
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
  });
})();
