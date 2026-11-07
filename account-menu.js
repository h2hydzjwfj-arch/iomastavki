/* IOMASTAVKA — меню аккаунта в шапке: одна кнопка с аватаром вместо «А» и «Выйти».
   Администратор: профиль и пароль, настройки компании, мои средства, состояние сайта, робот-помощник, выход.
   Клиент: коротко — мои грузы, профиль (окно поверх страницы), уведомления, выход.
   Меню закрывается после выбора, щелчком мимо или Esc; окно профиля — только крестиком. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function T(s) { return window.IOMA_T ? window.IOMA_T(s) : s; }
  function role() { var c = document.body.className; return /role-admin/.test(c) ? 'admin' : /role-client/.test(c) ? 'client' : 'guest'; }
  function api(url, opt) {
    opt = opt || {}; var o = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opt.body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opt.body); }
    return fetch(url, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.ok === false) throw new Error(d.error || 'Ошибка ' + r.status); return d; }); });
  }
  var I = {
    user: '<path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0"/>', gear: '<path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    wallet: '<path d="M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2zM16 14.5h.01"/>', pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>', robot: '<rect x="5" y="8" width="14" height="11" rx="4"/><path d="M12 4v4M9.5 13h.01M14.5 13h.01M10 16h4"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>', bell: '<path d="M6 9a6 6 0 0112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 004 0"/>', out: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10"/>', chev: '<path d="M6 9l6 6 6-6"/>'
  };
  function ic(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[n] + '</svg>'; }
  var btn, menu, me = { name: '', email: '' }, loaded = '';

  function items() {
    if (role() === 'admin') return [['profile', 'user', 'Профиль и пароль'], ['company', 'gear', 'Настройки компании'], ['wallet', 'wallet', 'Мои средства'], ['site', 'pulse', 'Состояние сайта'], ['robot', 'robot', 'Робот-помощник'], ['-'], ['out', 'out', 'Выйти']];
    return [['ships', 'box', 'Мои грузы'], ['profile', 'user', 'Профиль'], ['notify', 'bell', 'Уведомления'], ['-'], ['out', 'out', 'Выйти']];
  }
  function draw() {
    var r = role(), nm = r === 'admin' ? (me.name || 'Администратор') : (me.name || 'Клиент'), sub = r === 'admin' ? T('Администратор') + ' · iomastavka' : (me.email || T('Клиент'));
    menu.innerHTML = '<div class="am-h"><span class="am-ava">' + esc(initial(nm)) + '</span><span class="am-who"><b>' + esc(nm) + '</b><small>' + esc(sub) + '</small></span></div>'
      + items().map(function (x) { return x[0] === '-' ? '<i class="am-sep" role="separator"></i>' : '<button type="button" role="menuitem" class="am-i' + (x[0] === 'out' ? ' am-out' : '') + '" data-am="' + x[0] + '">' + ic(x[1]) + '<span>' + esc(T(x[2])) + '</span></button>'; }).join('');
  }
  function initial(n) { return (String(n || '?').trim()[0] || '?').toUpperCase(); }
  function place() { var r = btn.getBoundingClientRect(), w = menu.offsetWidth || 280; menu.style.top = (r.bottom + 10) + 'px'; menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px'; }
  function open() {
    if (!menu) { menu = document.createElement('div'); menu.className = 'am-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true; document.body.appendChild(menu); menu.addEventListener('click', pick); }
    draw(); menu.hidden = false; place(); requestAnimationFrame(function () { menu.classList.add('on'); }); btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open');
    var f = $('.am-i', menu); f && f.focus({ preventScroll: true });
    refresh();
  }
  function close() { if (!menu || menu.hidden) return; menu.classList.remove('on'); menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('open'); }
  function refresh() {
    var r = role(); if (loaded === r) return; loaded = r;
    api('/api/account').then(function (a) { me.name = a.role === 'admin' ? (a.name || 'Администратор') : a.name || ''; me.email = a.email || ''; me.acc = a; label(); if (menu && !menu.hidden) draw(); }).catch(function () { loaded = ''; });
  }
  function label() { var n = $('.am-name', btn); if (n) n.textContent = role() === 'admin' ? T('Администратор') : (me.name || T('Кабинет')).split(' ')[0]; }

  function go(view, then) { if (window.__v3open) window.__v3open(view); else if (window.__iomaOpenView) window.__iomaOpenView(view); if (then) setTimeout(then, 380); }
  function pick(e) {
    var b = e.target.closest('[data-am]'); if (!b) return; var k = b.dataset.am; close();
    if (k === 'out') { var lo = document.getElementById('logoutButton'); if (lo) lo.click(); else fetch('/api/logout', { method: 'POST' }).finally(function () { location.href = '/'; }); return; }
    if (k === 'profile') return profile();
    if (k === 'site' || k === 'notify') return go('accountView');
    if (k === 'ships') return go('cabinetView');
    if (k === 'robot') { if (window.IOMA_ROBOT) window.IOMA_ROBOT.open(); return; }
    if (k === 'company') return go('workView', function () { var t = $('#workView .cx-nav [data-tab="settings"]'); t && t.click(); setTimeout(function () { var s = $('#cxSetBar [data-sub="company"]'); s && s.click(); }, 250); });
    if (k === 'wallet') return go('workView', function () { var t = $('#workView .cx-nav [data-tab="wallet"]'); t && t.click(); });
  }

  /* окно профиля: клиенту — имя, телефон, почта и пароль; администратору — пароль */
  function profile() {
    if (!window.CX || !window.CX.modal) return go('accountView');
    var a = me.acc || {}, client = role() === 'client';
    var h = (client ? '<form class="am-form" data-f="prof"><div class="am-two"><label><span>' + T('Имя') + '</span><input name="name" value="' + esc(a.name || '') + '" autocomplete="name"></label><label><span>' + T('Телефон') + '</span><input name="phone" value="' + esc(a.phone || '') + '" autocomplete="tel"></label></div>'
      + '<label><span>' + T('Почта (логин для входа)') + '</span><input name="email" type="email" value="' + esc(a.email || '') + '" autocomplete="email"></label><label class="am-cur" hidden><span>' + T('Текущий пароль — нужен для смены почты') + '</span><input name="currentPassword" type="password" autocomplete="current-password"></label>'
      + '<p class="am-err" role="alert"></p><button type="submit" class="am-go">' + T('Сохранить') + '</button></form>' : '<p class="am-note">' + T('Вход администратора — по паролю. Здесь его можно сменить.') + '</p>')
      + '<details class="am-pw"' + (client ? '' : ' open') + '><summary>' + T('Сменить пароль') + '</summary><form class="am-form" data-f="pw"><div class="am-two"><label><span>' + T('Текущий пароль') + '</span><input name="current" type="password" autocomplete="current-password" required></label><label><span>' + T('Новый пароль (от 8 символов)') + '</span><input name="next" type="password" autocomplete="new-password" minlength="8" required></label></div><p class="am-err" role="alert"></p><p class="am-ok"></p><button type="submit" class="am-go">' + T('Сменить пароль') + '</button></form></details>';
    var md = window.CX.modal(client ? T('Профиль') : T('Профиль и пароль'), h, false);
    md.el.classList.add('am-modal');
    var pf = $('[data-f=prof]', md.el), orig = (a.email || '').toLowerCase();
    if (pf) {
      pf.email.addEventListener('input', function () { $('.am-cur', pf).hidden = pf.email.value.trim().toLowerCase() === orig; });
      pf.addEventListener('submit', function (e) {
        e.preventDefault(); var er = $('.am-err', pf); er.textContent = ''; var body = { name: pf.name.value, phone: pf.phone.value };
        if (pf.email.value.trim().toLowerCase() !== orig) { body.email = pf.email.value; body.currentPassword = pf.currentPassword.value; }
        api('/api/account', { method: 'PATCH', body: body }).then(function (d) { me.name = d.item.name; me.email = d.item.email; me.acc = Object.assign(me.acc || {}, d.item); orig = d.item.email; label(); if (window.CX.toast) window.CX.toast(T('Сохранено')); md.close(); }).catch(function (x) { er.textContent = x.message; });
      });
    }
    var pw = $('[data-f=pw]', md.el);
    pw.addEventListener('submit', function (e) {
      e.preventDefault(); var er = $('.am-err', pw), ok = $('.am-ok', pw); er.textContent = ''; ok.textContent = '';
      api('/api/account/password', { method: 'POST', body: { current: pw.current.value, next: pw.next.value } }).then(function () { pw.reset(); ok.textContent = T('Пароль изменён'); }).catch(function (x) { er.textContent = x.message; });
    });
    setTimeout(function () { var f = $('input', md.el); f && f.focus(); }, 80);
  }

  function init() {
    btn = $('.v3-acc'); if (!btn) return;
    document.body.classList.add('am-on');
    btn.removeAttribute('data-open-view'); btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
    btn.insertAdjacentHTML('beforeend', '<span class="am-name"></span>' + ic('chev').replace('<svg', '<svg class="am-chev"'));
    // перехватываем раньше общего обработчика data-open-view: вместо страницы «Аккаунт» — меню
    window.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.v3-acc');
      if (t) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); if (menu && !menu.hidden) close(); else open(); return; }
      if (menu && !menu.hidden && !menu.contains(e.target)) close();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (!menu || menu.hidden) return;
      if (e.key === 'Escape') { close(); btn.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var all = Array.prototype.slice.call(menu.querySelectorAll('.am-i')), i = all.indexOf(document.activeElement); i = e.key === 'ArrowDown' ? (i + 1) % all.length : (i - 1 + all.length) % all.length; all[i].focus(); }
    });
    window.addEventListener('resize', function () { if (menu && !menu.hidden) place(); });
    window.addEventListener('scroll', function () { if (menu && !menu.hidden) place(); }, true);
    new MutationObserver(function () { var r = role(); if (r !== loaded) { loaded = loaded && r !== loaded ? '' : loaded; me = { name: '', email: '' }; label(); if (r !== 'guest') refresh(); close(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(function () { label(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    label(); if (role() !== 'guest') refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.IOMA_ACC = { open: function () { if (btn) open(); }, profile: profile };
})();
