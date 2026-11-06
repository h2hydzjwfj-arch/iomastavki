/* IOMASTAVKA — общий набор для рабочего места (CRM): запросы, окна, подтверждения, справочники, боковое меню. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function api(url, opt) {
    opt = opt || {}; var o = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opt.body instanceof FormData) o.body = opt.body; else if (opt.body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opt.body); }
    return fetch(url, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.ok === false) { var e = new Error(d.error || 'Ошибка ' + r.status); e.status = r.status; throw e; } return d; }); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, kind) { if (window.__v3toast) window.__v3toast(m); else { var t = document.createElement('div'); t.className = 'cx-toast' + (kind ? ' ' + kind : ''); t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); } }
  function money(v, cur) { if (v == null || v === '' || !isFinite(v)) return '—'; var n = Number(v), fr = Math.round(n * 100) % 100 !== 0; return n.toLocaleString('ru-RU', { minimumFractionDigits: fr ? 2 : 0, maximumFractionDigits: 2 }) + (cur ? ' ' + (cur === 'RUB' ? '₽' : cur) : ''); }
  function num(v) { return v == null || v === '' ? '' : Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); }
  var pad = function (n) { return String(n).padStart(2, '0'); };
  function d(v) { if (!v) return '—'; var s = String(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4); var t = new Date(v); return isNaN(t) ? '—' : pad(t.getDate()) + '.' + pad(t.getMonth() + 1) + '.' + t.getFullYear(); }
  function dt(v) { if (!v) return ''; var t = new Date(v); return isNaN(t) ? '' : d(v) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()); }
  function hm(v) { var t = new Date(v); return isNaN(t) ? '' : pad(t.getHours()) + ':' + pad(t.getMinutes()); }
  function today(add) { var t = new Date(); t.setDate(t.getDate() + (add || 0)); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); }
  function initials(n) { var p = String(n || '?').trim().split(/\s+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : (p[0] || '?').slice(0, 2)).toUpperCase(); }
  function plural(n, a, b, c) { n = Math.abs(n) % 100; var k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; }

  // ---------- окно (закрывается крестиком, Esc или щелчком по свободному полю — нажатие и отпускание вне окна)
  var stack = [];
  function modal(title, body, foot, opts) {
    opts = opts || {};
    var ov = document.createElement('div'); ov.className = 'cx-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="cx-modal' + (opts.wide ? ' wide' : '') + (opts.side ? ' side' : '') + '"><div class="cx-mh"><b>' + esc(title) + '</b><button type="button" class="cx-x" aria-label="Закрыть" title="Закрыть">×</button></div><div class="cx-mb"></div>' + (foot !== false ? '<div class="cx-mf"></div>' : '') + '</div>';
    var box = $('.cx-mb', ov); if (typeof body === 'string') box.innerHTML = body; else if (body) box.appendChild(body);
    var mf = $('.cx-mf', ov); if (mf) { if (typeof foot === 'string') mf.innerHTML = foot; else mf.innerHTML = '<button type="button" class="cx-btn ghost" data-cx="close">Закрыть</button>'; }
    var down = null;
    ov.addEventListener('pointerdown', function (e) { down = e.target; });
    ov.addEventListener('click', function (e) { if (e.target === ov && down === ov) close(); if (e.target.closest('.cx-x,[data-cx=close]')) close(); });
    function close() { if (opts.onClose && opts.onClose() === false) return; ov.classList.remove('on'); setTimeout(function () { ov.remove(); }, 160); stack = stack.filter(function (x) { return x !== api2; }); }
    var api2 = { el: ov, body: box, foot: mf, close: close };
    document.body.appendChild(ov); requestAnimationFrame(function () { ov.classList.add('on'); });
    stack.push(api2);
    setTimeout(function () { var f = $('[autofocus],input:not([type=hidden]):not([readonly]),textarea,select', box); if (f && !opts.noFocus) try { f.focus(); } catch (e) {} }, 60);
    return api2;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) { stack[stack.length - 1].close(); e.stopPropagation(); } }, true);
  function confirmBox(text, okLabel, danger) {
    return new Promise(function (resolve) {
      var done = false;
      var m = modal('Подтверждение', '<p class="cx-confirm">' + esc(text) + '</p>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn ' + (danger ? 'danger' : 'primary') + '" data-ok>' + esc(okLabel || 'Да') + '</button>', { onClose: function () { if (!done) resolve(false); } });
      $('[data-ok]', m.el).addEventListener('click', function () { done = true; resolve(true); m.close(); });
    });
  }
  function promptBox(title, label, value) {
    return new Promise(function (resolve) {
      var done = false;
      var m = modal(title, '<label class="cx-f"><span>' + esc(label) + '</span><input type="text" data-v value="' + esc(value || '') + '"></label>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>', { onClose: function () { if (!done) resolve(null); } });
      var inp = $('[data-v]', m.el), ok = function () { done = true; resolve(inp.value.trim()); m.close(); };
      $('[data-ok]', m.el).addEventListener('click', ok); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
    });
  }
  // кнопка не нажимается дважды, пока идёт запрос
  function guard(btn, fn) { if (!btn || btn.disabled) return; btn.disabled = true; btn.classList.add('busy'); return Promise.resolve().then(fn).catch(function (e) { toast(e.message || String(e), 'err'); }).then(function () { btn.disabled = false; btn.classList.remove('busy'); }); }

  // ---------- справочники CRM
  var META = null, metaP = null;
  function meta(force) { if (META && !force) return Promise.resolve(META); if (metaP && !force) return metaP; metaP = api('/api/deals/meta').then(function (m) { META = m; metaP = null; return m; }); return metaP; }
  var STC = { 'Новая заявка': 'n', 'Запрос': 'q', 'Расчёт': 'q', 'Ставка отправлена': 'r', 'КП отправлено': 'r', 'Клиент на рассмотрении': 'w', 'В работе': 'g', 'Груз в пути': 'g', 'Успешно': 'ok', 'Закрыта': 'x' };
  function stageCls(s) { return 's-' + (STC[s] || 'q'); }
  function stageBadge(s) { return '<em class="crm-st ' + stageCls(s) + '">' + esc(s || '—') + '</em>'; }
  function ageDot(days) { if (days == null) return ''; return '<span class="cx-age ' + (days > 30 ? 'a3' : days > 7 ? 'a2' : 'a1') + '" title="Дней на этапе">' + days + '&nbsp;дн</span>'; }
  var ICON = { note: '📝', call: '📞', meet: '🤝', tg: '✈️', wa: '💬', mail: '✉️', lead: '📩', rate: '💲', finance: '💰', calc: '🧮', file: '📎', quote: '📄', task: '✅', field: '•' };
  function mgrOptions(sel, withEmpty, emptyLabel) { var list = (META && META.managers) || []; if (sel && list.indexOf(sel) < 0) list = list.concat(sel); return (withEmpty ? '<option value="">' + esc(emptyLabel || '—') + '</option>' : '') + list.map(function (m) { return '<option' + (m === sel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join(''); }
  function curOptions(sel, list) { return (list || ['RUB', 'CNY', 'USD', 'EUR']).map(function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; }).join(''); }

  // ---------- боковое меню рабочего места
  var loaders = {}, current = null;
  function on(tab, fn) { loaders[tab] = fn; }
  function show(tab, noLoad) {
    var chip = $('#workView .cx-nav [data-tab="' + tab + '"]');
    if (chip) { chip.click(); return; } // клик сам переключает вкладку (portal-ui) и загружает раздел
    $$('#workView .v3p-tab').forEach(function (p) { p.hidden = p.dataset.pane !== tab; });
    if (!noLoad) load(tab);
  }
  // «Настройки»: компания, отгулы, праздники, почта, ИИ-бот, безопасность, журнал — одна строка меню и вкладки сверху
  var SETTINGS = ['company', 'timeoff', 'holidays', 'mail', 'bot', 'security', 'journal'];
  function lastSet() { try { var v = localStorage.getItem('iomaSetTab'); return SETTINGS.indexOf(v) >= 0 ? v : 'company'; } catch (e) { return 'company'; } }
  function markSettings(tab) {
    var isSet = SETTINGS.indexOf(tab) >= 0, chip = $('#workView .cx-nav [data-tab="settings"]'), bar = $('#cxSetBar');
    if (chip) chip.classList.toggle('on', isSet);
    if (bar) { bar.hidden = !isSet; $$('[data-sub]', bar).forEach(function (b) { b.classList.toggle('on', b.dataset.sub === tab); b.setAttribute('aria-selected', b.dataset.sub === tab ? 'true' : 'false'); }); }
    if (isSet) { try { localStorage.setItem('iomaSetTab', tab); } catch (e) {} }
  }
  function load(tab) {
    if (tab === 'settings') return show(lastSet());
    current = tab; try { localStorage.setItem('iomaWorkTab', tab); } catch (e) {} markSettings(tab);
    if (loaders[tab]) loaders[tab](); var w = $('#workView'); if (w) w.dataset.cur = tab;
  }
  document.addEventListener('click', function (e) {
    var sb = e.target.closest && e.target.closest('#cxSetBar [data-sub]'); if (sb) return show(sb.dataset.sub);
    var t = e.target.closest && e.target.closest('#workView .cx-nav [data-tab]'); if (!t) return;
    load(t.dataset.tab); var nav = t.closest('.cx-nav'); if (t.closest('.cx-sethid')) t = $('#workView .cx-nav [data-tab="settings"]') || t; if (nav) { nav.classList.remove('open'); if (nav.scrollWidth > nav.clientWidth && nav.scrollTo) nav.scrollTo({ left: Math.max(0, t.offsetLeft - nav.clientWidth / 2 + t.offsetWidth / 2), behavior: 'smooth' }); }
    if (window.innerWidth < 900) { var pane = $('#workView [data-pane="' + (t.dataset.tab === 'settings' ? current : t.dataset.tab) + '"]'); if (pane) setTimeout(function () { pane.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); }
  });
  function lastTab() { try { return localStorage.getItem('iomaWorkTab'); } catch (e) { return null; } }
  // отдельная «страница» внутри рабочего места (карточка сделки): прячем вкладки, кнопка «Назад» возвращает
  function page(id) { $$('#workView .v3p-tab').forEach(function (p) { p.hidden = p.id !== id; }); var el = document.getElementById(id); if (el) { el.hidden = false; el.scrollTop = 0; var w = $('#workView'); if (w && w.scrollTo) { var top = el.getBoundingClientRect().top + w.scrollTop - 90; if (top < w.scrollTop) w.scrollTo({ top: Math.max(0, top) }); } } return el; }

  // счётчики в меню
  var badgeT = null;
  function badges() {
    clearTimeout(badgeT); if (!document.body.classList.contains('role-admin')) return;
    api('/api/crm/badges').then(function (b) {
      var set = function (tab, n, hot) { var el = $('#workView .cx-nav [data-tab="' + tab + '"] .cx-badge'); if (!el) return; el.textContent = n > 99 ? '99+' : n || ''; el.hidden = !n; el.classList.toggle('hot', !!hot); };
      set('inbox', b.inbox, b.inboxNew > 0); set('tasks', b.tasksOverdue + b.tasksToday, b.tasksOverdue > 0);
      var off = $('#cxOffToday'); if (off) { off.hidden = !b.offToday.length; off.textContent = b.offToday.length ? 'Сегодня отсутствуют: ' + b.offToday.join(', ') : ''; }
    }).catch(function () {});
    badgeT = setTimeout(badges, 60000);
  }

  // drag-and-drop файлов в зону: подсветка и обработчик
  function dropzone(el, onFiles) {
    if (!el || el.dataset.dz) return; el.dataset.dz = '1';
    var isFiles = function (e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; };
    ['dragenter', 'dragover'].forEach(function (ev) { el.addEventListener(ev, function (e) { if (!isFiles(e)) return; e.preventDefault(); el.classList.add('dragover'); }); });
    ['dragleave', 'dragend'].forEach(function (ev) { el.addEventListener(ev, function (e) { if (!el.contains(e.relatedTarget)) el.classList.remove('dragover'); }); });
    el.addEventListener('drop', function (e) { el.classList.remove('dragover'); if (!isFiles(e) || !e.dataTransfer.files.length) return; e.preventDefault(); onFiles(e.dataTransfer.files); });
  }
  function upload(url, files, extra) {
    var list = Array.prototype.slice.call(files || []); var i = 0, okN = 0;
    function next() { if (i >= list.length) return Promise.resolve(okN); var f = list[i++]; var fd = new FormData(); fd.append('file', f); Object.keys(extra || {}).forEach(function (k) { fd.append(k, extra[k]); });
      return api(url, { method: 'POST', body: fd }).then(function () { okN++; }).catch(function (e) { toast(f.name + ': ' + e.message, 'err'); }).then(next); }
    return next();
  }
  function fileIcon(name) {
    var ext = String(name || '').split('.').pop().toLowerCase(), C = { pdf: '#E5483D', doc: '#2B6CB5', docx: '#2B6CB5', xls: '#1C7C42', xlsx: '#1C7C42', csv: '#1C7C42', zip: '#A06A2C', rar: '#A06A2C', txt: '#6B7280' };
    var img = /^(jpe?g|png|webp|gif|bmp|tiff)$/.test(ext), col = img ? '#9F4FC1' : C[ext] || '#6B7280', lab = img ? 'IMG' : ({ docx: 'DOC', xlsx: 'XLS' }[ext] || ext.toUpperCase()).slice(0, 4);
    return '<svg viewBox="0 0 20 20" width="34" height="34" aria-hidden="true"><path d="M5 2.5H11.5L15.5 6.5V16C15.5 16.83 14.83 17.5 14 17.5H5C4.17 17.5 3.5 16.83 3.5 16V4C3.5 3.17 4.17 2.5 5 2.5Z" fill="' + col + '" fill-opacity=".14" stroke="' + col + '" stroke-width="1.2"/><path d="M11.5 2.5V5.5C11.5 6.05 11.95 6.5 12.5 6.5H15.5" stroke="' + col + '" stroke-width="1.2" fill="none"/><text x="9.5" y="13.6" text-anchor="middle" font-size="4.3" font-weight="700" fill="' + col + '" font-family="Arial,sans-serif">' + esc(lab) + '</text></svg>';
  }
  function size(b) { return !b ? '' : b < 1024 ? b + ' Б' : b < 1048576 ? (b / 1024).toFixed(1) + ' КБ' : (b / 1048576).toFixed(1) + ' МБ'; }

  window.CX = { $: $, $$: $$, api: api, esc: esc, toast: toast, money: money, num: num, d: d, dt: dt, hm: hm, today: today, initials: initials, plural: plural, modal: modal, confirm: confirmBox, prompt: promptBox, guard: guard,
    meta: meta, get META() { return META; }, stageCls: stageCls, stageBadge: stageBadge, ageDot: ageDot, ICON: ICON, mgrOptions: mgrOptions, curOptions: curOptions,
    on: on, show: show, load: load, page: page, lastTab: lastTab, get current() { return current; }, badges: badges, dropzone: dropzone, upload: upload, fileIcon: fileIcon, size: size };
})();
