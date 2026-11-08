/* IOMASTAVKA — единые элементы интерфейса поверх старых модулей.
   1) Выпадающие списки в стиле сайта вместо системных: любой <select> получает свою кнопку и список;
      сам select остаётся (скрыт) — значение, события change/input и формы работают как раньше.
   2) «Вы вышли из аккаунта» — понятное окно со входом, когда сессия закончилась.
   Подключается последним. */
(function () {
  'use strict';
  var doc = document, OPEN = null;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var CHEV = '<svg class="ui-sel-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5L6 7.5l3-3"/></svg>';
  var TICK = '<svg class="ui-opt-tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';

  /* ---------- значение select, выставленное кодом, тоже обновляет подпись ---------- */
  ['value', 'selectedIndex'].forEach(function (prop) {
    var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
    if (!d || !d.set) return;
    Object.defineProperty(HTMLSelectElement.prototype, prop, { configurable: true, enumerable: d.enumerable, get: d.get,
      set: function (v) { d.set.call(this, v); if (this.__ui) this.__ui.sync(); } });
  });

  function label(sel) { var o = sel.options[sel.selectedIndex]; return o ? (o.label || o.textContent) : ''; }
  function enhance(sel) {
    if (sel.__ui || sel.multiple || sel.hasAttribute('data-native') || sel.closest('[data-native]')) return;
    var r = sel.getBoundingClientRect(), parent = sel.parentNode, pw = parent && parent.getBoundingClientRect ? parent.getBoundingClientRect().width : 0;
    var btn = doc.createElement('button'); btn.type = 'button';
    btn.className = 'ui-sel ' + (sel.className || '').replace(/\bui-sel\b/g, '');
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    var al = sel.getAttribute('aria-label') || (sel.id && $('label[for="' + sel.id + '"]') ? $('label[for="' + sel.id + '"]').textContent : '');
    if (al) btn.setAttribute('aria-label', al.trim());
    if (sel.style.width) btn.style.width = sel.style.width;
    else if (r.width && pw && Math.abs(r.width - pw) < 3) btn.style.width = '100%';
    else if (r.width) btn.style.minWidth = Math.round(r.width) + 'px';
    if (sel.title) btn.title = sel.title;
    btn.innerHTML = '<span class="ui-sel-v"></span>' + CHEV;
    sel.classList.add('ui-native'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
    sel.insertAdjacentElement('afterend', btn);
    var api = {
      btn: btn,
      sync: function () {
        var t = label(sel); $('.ui-sel-v', btn).textContent = t || '—';
        btn.disabled = !!sel.disabled; btn.hidden = !!sel.hidden || sel.style.display === 'none';
        btn.classList.toggle('ui-ph', !sel.value && sel.selectedIndex <= 0 && sel.options.length > 0 && sel.options[0].value === '');
      }
    };
    sel.__ui = api; api.sync();
    sel.addEventListener('change', api.sync);
    new MutationObserver(api.sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'style'] });
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); OPEN && OPEN.sel === sel ? closeList() : openList(sel); });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) >= 0) { e.preventDefault(); if (!OPEN) openList(sel); }
    });
  }

  function openList(sel) {
    closeList();
    var btn = sel.__ui.btn, list = doc.createElement('div');
    list.className = 'ui-list'; list.setAttribute('role', 'listbox'); list.tabIndex = -1;
    var h = '', groupOf = function (o) { return o.parentNode && o.parentNode.tagName === 'OPTGROUP' ? o.parentNode : null; }, lastG = null;
    Array.prototype.forEach.call(sel.options, function (o, i) {
      if (o.hidden) return;
      var g = groupOf(o); if (g && g !== lastG) { h += '<div class="ui-grp">' + esc(g.label) + '</div>'; } lastG = g;
      h += '<div class="ui-opt' + (i === sel.selectedIndex ? ' on' : '') + (o.disabled ? ' off' : '') + '" role="option" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '">' + TICK + '<span>' + esc(o.label || o.textContent) + '</span></div>';
    });
    list.innerHTML = h || '<div class="ui-opt off"><span>Нет вариантов</span></div>';
    doc.body.appendChild(list);
    OPEN = { sel: sel, list: list, act: sel.selectedIndex };
    btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open');
    place(); requestAnimationFrame(function () { list.classList.add('on'); var on = list.querySelector('.ui-opt.on'); if (on) on.scrollIntoView({ block: 'nearest' }); });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { var o = e.target.closest('.ui-opt'); if (!o || o.classList.contains('off')) return; pick(+o.dataset.i); });
    list.addEventListener('mousemove', function (e) { var o = e.target.closest('.ui-opt'); if (o) mark(+o.dataset.i, true); });
  }
  function place() {
    if (!OPEN) return;
    var b = OPEN.sel.__ui.btn.getBoundingClientRect(), l = OPEN.list, vh = window.innerHeight, vw = window.innerWidth;
    if (!b.width) return closeList();
    l.style.minWidth = Math.max(180, b.width) + 'px';
    var lh = Math.min(l.scrollHeight, 340), below = vh - b.bottom - 12, up = below < Math.min(lh, 220) && b.top > below;
    l.style.maxHeight = Math.max(140, Math.min(340, (up ? b.top : below) - 12)) + 'px';
    l.style.left = Math.max(8, Math.min(b.left, vw - l.offsetWidth - 8)) + 'px';
    l.style.top = up ? '' : (b.bottom + 6) + 'px'; l.style.bottom = up ? (vh - b.top + 6) + 'px' : '';
    l.classList.toggle('up', up);
  }
  function mark(i, noScroll) {
    if (!OPEN) return; OPEN.act = i;
    Array.prototype.forEach.call(OPEN.list.querySelectorAll('.ui-opt'), function (o) { var on = +o.dataset.i === i; o.classList.toggle('act', on); if (on && !noScroll) o.scrollIntoView({ block: 'nearest' }); });
  }
  function pick(i) {
    var sel = OPEN.sel, changed = sel.selectedIndex !== i;
    closeList(true);
    if (changed) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function closeList(focus) {
    if (!OPEN) return; var o = OPEN; OPEN = null;
    o.sel.__ui.btn.setAttribute('aria-expanded', 'false'); o.sel.__ui.btn.classList.remove('open');
    o.list.classList.remove('on'); setTimeout(function () { o.list.remove(); }, 140);
    if (focus) try { o.sel.__ui.btn.focus({ preventScroll: true }); } catch (e) {}
  }
  doc.addEventListener('keydown', function (e) {
    if (!OPEN) return;
    var opts = Array.prototype.filter.call(OPEN.list.querySelectorAll('.ui-opt:not(.off)'), function () { return true; }).map(function (o) { return +o.dataset.i; });
    var k = opts.indexOf(OPEN.act);
    if (e.key === 'ArrowDown') { e.preventDefault(); mark(opts[Math.min(opts.length - 1, k + 1)]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark(opts[Math.max(0, k - 1)]); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (OPEN.act >= 0) pick(OPEN.act); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeList(true); }
    else if (e.key === 'Tab') closeList();
    else if (e.key.length === 1) { var ch = e.key.toLowerCase(), sel = OPEN.sel; for (var n = 1; n <= opts.length; n++) { var j = opts[(k + n) % opts.length]; if ((sel.options[j].textContent || '').trim().toLowerCase().indexOf(ch) === 0) { mark(j); break; } } }
  }, true);
  doc.addEventListener('click', function (e) { if (OPEN && !OPEN.list.contains(e.target) && !OPEN.sel.__ui.btn.contains(e.target)) closeList(); });
  window.addEventListener('resize', function () { if (OPEN) place(); });
  window.addEventListener('scroll', function (e) { if (OPEN && !(e.target && e.target.nodeType === 1 && OPEN.list.contains(e.target))) place(); }, true);

  /* ---------- все select на странице, и те, что появятся потом ---------- */
  var queued = false;
  function scan() { queued = false; Array.prototype.forEach.call(doc.querySelectorAll('select:not(.ui-native)'), enhance); }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(scan); } }
  function start() { scan(); new MutationObserver(queue).observe(doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();

  /* ---------- сессия закончилась ---------- */
  var shown = false;
  window.addEventListener('ioma:signed-out', function () {
    if (shown) return; shown = true;
    var ov = doc.createElement('div'); ov.className = 'ui-gate';
    ov.innerHTML = '<div class="ui-gate-c" role="dialog" aria-modal="true" aria-labelledby="uiGateT"><b id="uiGateT">Вы вышли из аккаунта</b><p>Так бывает после обновления сайта или долгого перерыва. Войдите снова — всё сохранено.</p><div><a class="ui-gate-go" href="/vhod">Войти</a><button type="button" class="ui-gate-x">Закрыть</button></div></div>';
    doc.body.appendChild(ov); requestAnimationFrame(function () { ov.classList.add('on'); });
    ov.querySelector('.ui-gate-x').addEventListener('click', function () { ov.remove(); shown = false; });
  });

  window.IOMA_UI = { enhance: enhance, scan: scan, close: closeList };
})();
