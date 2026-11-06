/* IOMASTAVKA — динамика курса ЦБ РФ: как менялся юань (и доллар, евро, тенге, вона) за выбранный период.
   Открывается из плитки «Курсы ЦБ РФ» (клик по валюте или «Динамика курса») и из кабинета. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lang() { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } }
  var LOC = { ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN', tr: 'tr-TR' };
  var CUR = [['CNY', 'Юань'], ['USD', 'Доллар'], ['EUR', 'Евро'], ['KZT', 'Тенге'], ['KRW', 'Вона']];
  var PER = [['7', 'Неделя'], ['30', 'Месяц'], ['90', '3 месяца'], ['182', 'Полгода'], ['365', 'Год'], ['1826', '5 лет'], ['own', 'Свои даты']];
  var st = { code: 'CNY', per: '30', from: '', to: '', data: null, seq: 0 };
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function human(s) { var d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : d.toLocaleDateString(LOC[lang()] || 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function num(v, k) { return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: k == null ? 2 : k, maximumFractionDigits: k == null ? 4 : k }); }
  var ov = null;

  function build() {
    ov = document.createElement('div'); ov.className = 'rd-ov'; ov.hidden = true;
    ov.innerHTML = '<div class="rd" role="dialog" aria-modal="true" aria-labelledby="rdT"><button type="button" class="rd-x" aria-label="Закрыть" title="Закрыть">×</button>'
      + '<h2 id="rdT">Динамика курса ЦБ РФ</h2><p class="rd-sub">Официальный курс Банка России по дням — выберите валюту и период.</p>'
      + '<div class="rd-tabs" role="group" aria-label="Валюта">' + CUR.map(function (c) { return '<button type="button" class="chip" data-rc="' + c[0] + '"><b>' + c[0] + '</b> ' + c[1] + '</button>'; }).join('') + '</div>'
      + '<div class="rd-per" role="group" aria-label="Период">' + PER.map(function (p) { return '<button type="button" class="chip" data-rp="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>'
      + '<div class="rd-own" hidden><button type="button" class="rd-date" data-rd="from"><small>С</small><b></b></button><span>—</span><button type="button" class="rd-date" data-rd="to"><small>По</small><b></b></button></div>'
      + '<div class="rd-chart"><svg class="rd-svg" aria-hidden="true"></svg><div class="rd-tipline" hidden></div><div class="rd-tip" hidden></div><p class="rd-load">Загружаю курс…</p></div>'
      + '<div class="rd-stats"></div><p class="rd-note"></p></div>';
    document.body.appendChild(ov);
    var downOn = null;
    ov.addEventListener('pointerdown', function (e) { downOn = e.target; });
    ov.addEventListener('click', function (e) {
      if (e.target === ov && downOn === ov) return close();
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('rd-x')) return close();
      if (b.dataset.rc) { st.code = b.dataset.rc; load(); }
      if (b.dataset.rp) { st.per = b.dataset.rp; if (st.per === 'own' && !st.from) { var t = new Date(); st.to = iso(t); st.from = iso(new Date(t.getFullYear(), t.getMonth() - 3, t.getDate())); } load(); }
      if (b.dataset.rd) { e.stopPropagation(); cal(b); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov && !ov.hidden) { if (pop) closeCal(); else close(); } });
    var chart = $('.rd-chart', ov);
    chart.addEventListener('pointermove', hover); chart.addEventListener('pointerleave', function () { $('.rd-tip', ov).hidden = true; $('.rd-tipline', ov).hidden = true; });
    window.addEventListener('resize', function () { if (!ov.hidden) draw(); });
  }
  function open(code) {
    if (!ov) build();
    if (code) st.code = code; ov.hidden = false; document.body.classList.add('rd-open');
    setTimeout(function () { var b = $('.rd-tabs [data-rc="' + st.code + '"]', ov); b && b.focus(); }, 30);
    load();
  }
  function close() { if (!ov) return; closeCal(); ov.hidden = true; document.body.classList.remove('rd-open'); }
  function range() {
    var to = new Date(), from;
    if (st.per === 'own' && st.from && st.to) return [st.from, st.to];
    from = new Date(to.getTime() - (+st.per || 30) * 864e5); return [iso(from), iso(to)];
  }
  function load() {
    $$('.rd-tabs .chip', ov).forEach(function (b) { b.classList.toggle('on', b.dataset.rc === st.code); b.setAttribute('aria-pressed', b.dataset.rc === st.code); });
    $$('.rd-per .chip', ov).forEach(function (b) { b.classList.toggle('on', b.dataset.rp === st.per); b.setAttribute('aria-pressed', b.dataset.rp === st.per); });
    var own = $('.rd-own', ov); own.hidden = st.per !== 'own';
    var r = range(); if (st.per === 'own') { $('[data-rd=from] b', ov).textContent = human(r[0]); $('[data-rd=to] b', ov).textContent = human(r[1]); }
    var my = ++st.seq, ld = $('.rd-load', ov); ld.hidden = false; ld.textContent = 'Загружаю курс…'; $('.rd-chart', ov).classList.add('busy');
    fetch('/api/currency/dynamics?code=' + st.code + '&from=' + r[0] + '&to=' + r[1], { cache: 'no-store' })
      .then(function (x) { return x.json().then(function (d) { if (!x.ok || d.ok === false) throw new Error(d.error || 'Нет данных'); return d; }); })
      .then(function (d) { if (my !== st.seq) return; st.data = d; ld.hidden = true; draw(); })
      .catch(function (e) { if (my !== st.seq) return; st.data = null; ld.hidden = false; ld.textContent = e.message; $('.rd-svg', ov).innerHTML = ''; $('.rd-stats', ov).innerHTML = ''; })
      .then(function () { if (my === st.seq) $('.rd-chart', ov).classList.remove('busy'); });
  }
  var geo = null;
  function draw() {
    var d = st.data; if (!d || !ov) return;
    var svg = $('.rd-svg', ov), box = svg.getBoundingClientRect(), W = Math.max(280, box.width), H = Math.max(200, box.height);
    var padL = 54, padR = 14, padT = 14, padB = 30, pts = d.points, n = pts.length;
    var mn = d.min, mx = d.max, span = mx - mn || mx * .01 || 1; mn -= span * .08; mx += span * .08;
    var X = function (i) { return padL + (n > 1 ? i / (n - 1) : .5) * (W - padL - padR); }, Y = function (v) { return padT + (1 - (v - mn) / (mx - mn)) * (H - padT - padB); };
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join('');
    var area = line + 'L' + X(n - 1).toFixed(1) + ',' + (H - padB) + 'L' + X(0).toFixed(1) + ',' + (H - padB) + 'Z';
    var up = d.last >= d.first, col = up ? '#C2412D' : '#2E7D5B';
    var g = '';
    for (var k = 0; k <= 4; k++) { var v = mn + (mx - mn) * k / 4, y = Y(v); g += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="rd-g"/><text x="' + (padL - 8) + '" y="' + (y + 4).toFixed(1) + '" class="rd-yl">' + num(v, 2) + '</text>'; }
    var ticks = Math.min(6, n), lab = '';
    for (var t = 0; t < ticks; t++) { var i = Math.round(t * (n - 1) / Math.max(1, ticks - 1)), dd = new Date(pts[i].d + 'T12:00:00'); var long = (new Date(pts[n - 1].d) - new Date(pts[0].d)) > 400 * 864e5; lab += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" class="rd-xl" text-anchor="' + (t === 0 ? 'start' : t === ticks - 1 ? 'end' : 'middle') + '">' + esc(dd.toLocaleDateString(LOC[lang()] || 'ru-RU', long ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).replace('.', '')) + '</text>'; }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '<defs><linearGradient id="rdA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".22"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' + g + lab
      + '<path d="' + area + '" fill="url(#rdA)"/><path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" class="rd-line"/>'
      + '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(d.last).toFixed(1) + '" r="4.5" fill="' + col + '" stroke="#fff" stroke-width="2"/>';
    geo = { X: X, Y: Y, n: n, W: W, padL: padL, padR: padR, col: col };
    var unit = d.nominal > 1 ? ' за ' + d.nominal + ' ' + ({ KZT: 'тенге', KRW: 'вон' }[d.code] || d.code) : '';
    var arrow = d.change > 0 ? '▲' : d.change < 0 ? '▼' : '';
    var minI = pts.findIndex(function (p) { return p.v === d.min; }), maxI = pts.findIndex(function (p) { return p.v === d.max; });
    $('.rd-stats', ov).innerHTML = [
      ['На ' + human(d.from), num(d.first) + ' ₽'], ['На ' + human(d.to), num(d.last) + ' ₽'],
      ['Изменение', '<span class="' + (d.change > 0 ? 'up' : d.change < 0 ? 'dn' : '') + '">' + arrow + ' ' + num(Math.abs(d.change)) + ' ₽ (' + (d.changePct > 0 ? '+' : '') + String(d.changePct).replace('.', ',') + '%)</span>'],
      ['Минимум', num(d.min) + ' ₽<small>' + human(pts[minI].d) + '</small>'], ['Максимум', num(d.max) + ' ₽<small>' + human(pts[maxI].d) + '</small>'],
    ].map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('');
    $('.rd-note', ov).textContent = 'Курс ' + d.code + unit + ' в рублях · ' + n + ' ' + plural(n) + ' с курсом · источник: cbr.ru';
  }
  function plural(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'день' : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? 'дня' : 'дней'; }
  function hover(e) {
    var d = st.data; if (!d || !geo) return;
    var svg = $('.rd-svg', ov), r = svg.getBoundingClientRect(), x = e.clientX - r.left;
    var i = Math.max(0, Math.min(geo.n - 1, Math.round((x - geo.padL) / (geo.W - geo.padL - geo.padR) * (geo.n - 1)))), p = d.points[i];
    var tip = $('.rd-tip', ov), ln = $('.rd-tipline', ov), px = geo.X(i), py = geo.Y(p.v);
    ln.hidden = false; ln.style.left = px + 'px';
    tip.hidden = false; tip.innerHTML = '<small>' + esc(human(p.d)) + '</small><b>' + num(p.v) + ' ₽</b>';
    tip.style.left = Math.max(4, Math.min(r.width - tip.offsetWidth - 4, px - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(0, py - 58) + 'px';
  }

  /* свой календарь — в стиле сайта */
  var pop = null, which = '', vy, vm;
  function closeCal() { if (pop) { pop.remove(); pop = null; } }
  function cal(btn) {
    if (pop && which === btn.dataset.rd) return closeCal(); closeCal(); which = btn.dataset.rd;
    var cur = new Date((which === 'from' ? st.from : st.to) + 'T12:00:00'); if (isNaN(cur)) cur = new Date(); vy = cur.getFullYear(); vm = cur.getMonth();
    pop = document.createElement('div'); pop.className = 'v3-cal rd-cal'; pop.setAttribute('role', 'dialog');
    var host = $('.rd', ov); host.appendChild(pop);
    var br = btn.getBoundingClientRect(), hr = host.getBoundingClientRect();
    pop.style.top = (br.bottom - hr.top + 8) + 'px'; pop.style.left = Math.max(10, Math.min(hr.width - 300, br.left - hr.left)) + 'px'; pop.style.right = 'auto';
    drawCal();
    pop.addEventListener('click', function (e) {
      e.stopPropagation(); var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.d) { var v = vy + '-' + ('0' + (vm + 1)).slice(-2) + '-' + ('0' + b.dataset.d).slice(-2); if (which === 'from') st.from = v; else st.to = v; if (st.from > st.to) { var t = st.from; st.from = st.to; st.to = t; } closeCal(); load(); return; }
      if (b.dataset.cal === 'close') return closeCal();
      var k = +b.dataset.cal; if (k === 12 || k === -12) vy += k / 12; else { vm += k; if (vm < 0) { vm = 11; vy--; } if (vm > 11) { vm = 0; vy++; } } if (vy < 1993) vy = 1993; drawCal();
    });
  }
  function drawCal() {
    var L = LOC[lang()] || 'ru-RU', now = new Date(), sel = new Date((which === 'from' ? st.from : st.to) + 'T12:00:00');
    var first = new Date(vy, vm, 1), shift = (first.getDay() + 6) % 7, dim = new Date(vy, vm + 1, 0).getDate(), h = '';
    var cap = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };
    h += '<div class="cal-h"><button type="button" class="cal-nav" data-cal="-12" aria-label="Год назад">«</button><button type="button" class="cal-nav" data-cal="-1" aria-label="Месяц назад">‹</button><span class="cal-t">' + cap(first.toLocaleDateString(L, { month: 'long', year: 'numeric' }).replace(' г.', '')) + '</span><button type="button" class="cal-nav" data-cal="1" aria-label="Месяц вперёд">›</button><button type="button" class="cal-nav" data-cal="12" aria-label="Год вперёд">»</button></div><div class="cal-g">';
    for (var i = 0; i < 7; i++) h += '<i>' + cap(new Date(2024, 0, 1 + i).toLocaleDateString(L, { weekday: 'short' }).replace('.', '')).slice(0, 3) + '</i>';
    for (var k = 0; k < shift; k++) h += '<span></span>';
    for (var d = 1; d <= dim; d++) { var dt = new Date(vy, vm, d), fut = dt > now, s = sel.getFullYear() === vy && sel.getMonth() === vm && sel.getDate() === d; h += '<button type="button" class="cal-d' + (s ? ' s' : '') + '" data-d="' + d + '"' + (fut ? ' disabled' : '') + '>' + d + '</button>'; }
    h += '</div><div class="cal-f"><button type="button" data-cal="close">Закрыть</button></div>';
    pop.innerHTML = h;
  }

  window.IOMA_RATES = { open: open, close: close };
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rates-dyn]'); if (t) { e.preventDefault(); open(t.getAttribute('data-rates-dyn')); return; }
    var row = e.target.closest && e.target.closest('.v3-cur .rt'); if (row && !e.target.closest('.v3-cal')) { var c = (row.querySelector('span') || {}).textContent; open(/USD|EUR|CNY/.test(c) ? c.trim().slice(0, 3) : 'CNY'); }
  });
  document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target) && !(e.target.closest && e.target.closest('[data-rd]'))) closeCal(); });
  // плитка курсов: кнопка «Динамика курса» внизу
  function addBtn() { var c = document.querySelector('.v3-cur'); if (!c || c.querySelector('.rd-open-btn')) return; var b = document.createElement('button'); b.type = 'button'; b.className = 'rd-open-btn'; b.setAttribute('data-rates-dyn', 'CNY'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>Динамика курса'; c.appendChild(b); $$('.rt', c).forEach(function (r) { r.setAttribute('role', 'button'); r.tabIndex = 0; r.title = 'Показать динамику'; }); }
  document.addEventListener('keydown', function (e) { var r = e.target.closest && e.target.closest('.v3-cur .rt'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.click(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
})();
