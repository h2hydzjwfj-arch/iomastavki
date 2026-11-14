/* IOMASTAVKA — разделы меню на телефоне открываются нижней стеклянной панелью.
   На iPhone выпадающее меню внутри прокручиваемой полосы навигации обрезалось и было не видно.
   Пункты панели нажимают исходные кнопки меню, поэтому вся логика разделов остаётся прежней. */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width: 900px)'), sheet = null;
  function close() {
    if (!sheet) return; var s = sheet; sheet = null;
    s.classList.remove('on'); document.documentElement.classList.remove('ms-lock');
    setTimeout(function () { s.remove(); }, 220);
  }
  function open(btn) {
    var item = btn.closest('[data-sg]') || btn.parentNode, menu = item && item.querySelector('.sg-menu');
    if (!menu) return false;
    var items = Array.prototype.filter.call(menu.querySelectorAll('button, a'), function (b) { return !b.hidden && getComputedStyle(b).display !== 'none'; });
    if (!items.length) return false;
    close();
    var title = (btn.textContent || '').trim();
    var s = document.createElement('div'); s.className = 'ms-sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', title);
    s.innerHTML = '<div class="ms-back"></div><div class="ms-panel"><div class="ms-grip"></div><div class="ms-head"><b></b><button type="button" class="ms-x" aria-label="Закрыть">×</button></div><div class="ms-list"></div></div>';
    s.querySelector('.ms-head b').textContent = title;
    var list = s.querySelector('.ms-list');
    items.forEach(function (orig) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ms-item'; b.innerHTML = orig.innerHTML;
      b.addEventListener('click', function () { close(); setTimeout(function () { orig.click(); }, 10); });
      list.appendChild(b);
    });
    s.querySelector('.ms-back').addEventListener('click', close);
    s.querySelector('.ms-x').addEventListener('click', close);
    document.body.appendChild(s); document.documentElement.classList.add('ms-lock');
    requestAnimationFrame(function () { s.classList.add('on'); });
    sheet = s; return true;
  }
  document.addEventListener('click', function (e) {
    if (!mq.matches) return;
    var btn = e.target.closest && e.target.closest('.v3-nav .sg-btn, .topbar .sg-btn');
    if (!btn) return;
    if (open(btn)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
