/* Окна сайта без лишней прокрутки.
   Если содержимое окна чуть выше экрана (не больше чем на ~25%), окно аккуратно уменьшается целиком,
   чтобы поместиться в один экран. Длинные разделы (CRM, новости, справочник) прокручиваются как обычно.
   На телефоне ничего не меняется — там прокрутка естественна. */
(function () {
  'use strict';
  var MIN = 0.76, SKIP = { newsView: 1, articleView: 1, cabinetView: 1, forwardersView: 1, assistantView: 1, tarotView: 1 };
  var timers = [], watchUntil = 0, ro = null, cur = null, lastW = 0, lastH = 0;

  function openView() { return document.querySelector('.view-layer.open'); }
  function reset(v) { if (v && v.style.zoom) { v.style.zoom = ''; v.removeAttribute('data-fit'); } }

  function fit() {
    var v = openView(); if (cur && cur !== v) reset(cur); cur = v; if (!v) return;
    reset(v);
    if (window.innerWidth <= 900 || SKIP[v.id] || v.hasAttribute('data-scroll')) return;
    var se = document.scrollingElement || document.documentElement;
    var over = se.scrollHeight - window.innerHeight; if (over <= 2) return;
    var h = v.getBoundingClientRect().height; if (h < 200) return;
    var z = (h - over - 6) / h; if (z < MIN) return; // содержимого больше, чем на экран: обычная прокрутка
    v.style.zoom = z.toFixed(3); v.setAttribute('data-fit', '1');
    // второй проход: учесть переносы строк после уменьшения
    over = se.scrollHeight - window.innerHeight;
    if (over > 2) { h = v.getBoundingClientRect().height; var z2 = z * (h - over - 6) / h; if (z2 >= MIN) v.style.zoom = z2.toFixed(3); else reset(v); }
  }

  function soon() {
    timers.forEach(clearTimeout); timers = [0, 120, 450, 1100].map(function (t) { return setTimeout(fit, t); });
    watchUntil = Date.now() + 1600; // пока окно дорисовывается — подстраиваемся под его высоту
  }

  function watch() {
    var layers = document.querySelectorAll('.view-layer'); if (!layers.length) return;
    var mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) if (list[i].target.classList.contains('open') || list[i].target === cur) { soon(); break; }
    });
    layers.forEach(function (l) { mo.observe(l, { attributes: true, attributeFilter: ['class'] }); });
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { if (Date.now() < watchUntil) { clearTimeout(watch.t); watch.t = setTimeout(fit, 60); } });
      layers.forEach(function (l) { ro.observe(l); });
    }
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW && window.innerHeight === lastH) return; lastW = window.innerWidth; lastH = window.innerHeight;
      clearTimeout(watch.r); watch.r = setTimeout(fit, 120);
    });
    new MutationObserver(function () { soon(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    // переключение вкладок внутри окна меняет высоту — подстраиваемся заново
    document.addEventListener('click', function (ev) { var t = ev.target.closest && ev.target.closest('[role="tab"]'); if (t && t.closest('.view-layer.open')) setTimeout(soon, 40); });
    if (openView()) soon();
  }

  window.IOMA_FIT = { fit: fit, refit: soon };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
