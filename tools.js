/* IOMASTAVKA — инструменты логиста в отдельных окнах:
   «Отследить груз», «Влезет ли груз», «Объём груза», «Терминальные в Шереметьево», «Доставка по России»,
   «Чей номер и который час», «Сумма прописью».
   Расчёты, которые можно сделать в браузере (вместимость, объём, сумма прописью), — здесь;
   данные с чужих сайтов сервер получает сам (/api/tools/*) и показывает на нашем сайте. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function fmt(n, d) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: 0 }).format(n); }
  function rub(n) { return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ₽'; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('ioma_tl_' + k) || 'null'); localStorage.setItem('ioma_tl_' + k, JSON.stringify(v)); } catch (e) { return null; } }
  function api(url, body) {
    return fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сервер ответил не так, как ожидалось (' + r.status + ')' }; }); })
      .catch(function () { return { ok: false, error: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.' }; });
  }
  function head(ey, title, sub) { return '<div class="pg-h tl-h"><span class="pg-ey">' + esc(ey) + '</span><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div>'; }
  function field(label, html, cls) { return '<label class="tl-f' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span>' + html + '</label>'; }
  function busy(btn, on) { if (!btn) return; btn.disabled = on; btn.classList.toggle('tl-busy', on); }
  function copyBtn(text) { return '<button type="button" class="tl-copy" data-copy="' + esc(text) + '" title="Скопировать">Скопировать</button>'; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
    var t = b.getAttribute('data-copy'); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Скопировано'; setTimeout(function () { b.textContent = 'Скопировать'; }, 1400); }, function () {
      var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); b.textContent = 'Скопировано'; } catch (x) {} ta.remove();
    });
  });
  var ICON = {
    box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>', no: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>', warn: '<svg viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.5M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>'
  };

  /* =================================================================== 1. ВЛЕЗЕТ ЛИ ГРУЗ */
  // внутренние размеры, см; дверь, см; грузоподъёмность, кг. open — без крыши (Open Top), flat — без стен и крыши (Flat Rack), side — грузят сбоку/сверху (тент)
  var EQ = [
    { id: '20dc', name: '20′ DC', full: 'Контейнер 20 футов', L: 589.8, W: 235.2, H: 239.3, dW: 234.3, dH: 228, kg: 28200, rank: 1 },
    { id: '40dc', name: '40′ DC', full: 'Контейнер 40 футов', L: 1203.2, W: 235.2, H: 239.3, dW: 234.3, dH: 228, kg: 26700, rank: 1.3 },
    { id: '40hc', name: '40′ HC', full: 'Контейнер 40 футов, высокий', L: 1203.2, W: 235.2, H: 269.8, dW: 234.3, dH: 258.5, kg: 26500, rank: 1.35 },
    { id: 'tent', name: 'Фура 82 м³', full: 'Тент 13,6 м (еврофура)', L: 1360, W: 245, H: 250, side: true, kg: 20000, rank: 1.5 },
    { id: 'mega', name: 'Мега 100 м³', full: 'Тент «мега» 13,6 м', L: 1360, W: 248, H: 300, side: true, kg: 20000, rank: 1.6 },
    { id: '20ot', name: '20′ Open Top', full: 'Контейнер 20 футов без крыши', L: 589.4, W: 234.7, H: 234.8, open: true, kg: 28100, rank: 1.7 },
    { id: '40ot', name: '40′ Open Top', full: 'Контейнер 40 футов без крыши', L: 1202.9, W: 234.2, H: 234.7, open: true, kg: 26500, rank: 2.1 },
    { id: '20fr', name: '20′ Flat Rack', full: 'Платформа 20 футов', L: 562.8, W: 223.8, H: 223.3, flat: true, kg: 30000, rank: 2.2 },
    { id: '40fr', name: '40′ Flat Rack', full: 'Платформа 40 футов', L: 1208, W: 242, H: 195.5, flat: true, kg: 39000, rank: 2.8 }
  ];
  var OOG_W = 100, OOG_H = 120; // допустимый выступ на Flat Rack / Open Top, см (дальше — спецперевозка)
  function orients(it) { var l = it.l, w = it.w, h = it.h; var o = [[l, w, h], [w, l, h]]; if (it.tilt) o.push([l, h, w], [h, l, w], [w, h, l], [h, w, l]); return o; }
  // сколько мест одной позиции входит в одну единицу техники (плотная укладка рядами + остаток длины повёрнутыми местами)
  function capacity(it, e) {
    var best = { n: 0 }, why = [], tall = false, wide = false;
    orients(it).forEach(function (o) {
      var a = o[0], b = o[1], c = o[2];
      if (a > e.L) { why.push('len'); return; }
      if (b > e.W && (!e.flat || b > e.W + OOG_W)) { why.push('wid'); return; }
      if (c > e.H && (!(e.open || e.flat) || c > e.H + OOG_H)) { why.push('hgt'); return; }
      if (e.dW && (b > e.dW || c > e.dH)) { why.push('door'); return; }
      var over = c > e.H, nH = over ? 1 : it.stack ? Math.max(1, Math.floor(e.H / c)) : 1;
      var nL = Math.floor(e.L / a), nW = b > e.W ? 1 : Math.floor(e.W / b), n = nL * nW * nH;
      var rest = e.L - nL * a; if (rest >= b && a <= e.W) n += Math.floor(rest / b) * Math.floor(e.W / a) * nH;
      // негабарит — только если иначе никак: сначала укладка без выступов
      var oog = Math.max(0, c - e.H) + Math.max(0, b - e.W), cur = { n: n, o: o, nL: nL, nW: nW, nH: nH, over: over, wide: b > e.W, oog: oog };
      if (!best.n || oog < best.oog || (oog === best.oog && n > best.n)) best = cur;
    });
    if (!best.n) return { n: 0, why: why };
    if (it.kg > 0) best.byKg = Math.floor(e.kg / it.kg);
    return best;
  }
  var WHY = { len: 'длиннее, чем помещается', wid: 'шире, чем можно', hgt: 'выше, чем можно', door: 'не проходит в дверь' };
  function fitCheck(items) {
    var tot = items.reduce(function (s, it) { s.v += it.l * it.w * it.h / 1e6 * it.q; s.kg += it.kg * it.q; return s; }, { v: 0, kg: 0 });
    var rows = EQ.map(function (e) {
      var units = 0, fail = null, notes = [], frac = 0;
      items.forEach(function (it, i) {
        var c = capacity(it, e); if (fail) return;
        if (!c.n) {
          var w = c.why, t = w.indexOf('door') >= 0 && w.indexOf('hgt') < 0 && w.indexOf('len') < 0 ? 'door' : w.indexOf('hgt') >= 0 && w.every(function (x) { return x !== 'len'; }) ? 'hgt' : w.indexOf('wid') >= 0 && w.indexOf('len') < 0 ? 'wid' : 'len';
          var size = fmt(it.l, 0) + '×' + fmt(it.w, 0) + '×' + fmt(it.h, 0) + ' см';
          fail = (items.length > 1 ? 'Позиция ' + (i + 1) + ' (' + size + '): ' : 'Груз ' + size + ' ') + WHY[t] + (t === 'hgt' ? ' (' + fmt(e.H, 0) + ' см)' + (it.tilt ? ', даже если положить на бок' : '') : t === 'door' ? ' (проём ' + fmt(e.dW, 0) + '×' + fmt(e.dH, 0) + ' см)' : t === 'len' ? ' (' + fmt(e.L, 0) + ' см)' : ' (' + fmt(e.W, 0) + ' см)');
          return;
        }
        if (it.kg > e.kg) { fail = 'Одно место тяжелее грузоподъёмности (' + fmt(e.kg, 0) + ' кг)'; return; }
        var per = Math.min(c.n, c.byKg || Infinity); frac += it.q / per;
        if (c.over) notes.push('выступает над бортом на ' + fmt(c.o[2] - e.H, 0) + ' см — негабарит, нужна доплата и согласование');
        if (c.wide) notes.push('шире платформы на ' + fmt(c.o[1] - e.W, 0) + ' см — негабарит по ширине');
        if (c.byKg && c.byKg < c.n) notes.push('по весу входит ' + fmt(c.byKg, 0) + ' мест из ' + fmt(c.n, 0) + ' по размеру');
      });
      if (!fail) units = Math.max(1, Math.ceil(Math.max(frac, tot.kg / e.kg) - 1e-9));
      var cap0 = !fail && items.length === 1 ? capacity(items[0], e) : null;
      return { e: e, fail: fail, units: units, notes: notes, per: cap0 ? Math.min(cap0.n, cap0.byKg || Infinity) : null, cap: cap0 };
    });
    var pick = function (f) { return rows.filter(function (r) { return !r.fail && f(r.e); }).sort(function (a, b) { return a.units * a.e.rank * (a.notes.length ? 1.6 : 1) - b.units * b.e.rank * (b.notes.length ? 1.6 : 1) || a.e.rank - b.e.rank; })[0] || null; };
    var bestC = pick(function (e) { return !e.side; }), bestT = pick(function (e) { return e.side; });
    return { tot: tot, rows: rows, best: bestC || bestT, bestC: bestC, bestT: bestT };
  }
  function fitSvg(r, it) {
    var e = r.e, c = r.cap; if (!c || !c.o) return '';
    var W = 560, k = W / e.L, H = Math.max(40, e.W * k), boxes = '', a = c.o[0] * k, b = c.o[1] * k, n = 0, maxN = 400;
    for (var i = 0; i < c.nL && n < maxN; i++) for (var j = 0; j < c.nW && n < maxN; j++, n++) boxes += '<rect x="' + (i * a + 1).toFixed(1) + '" y="' + (j * b + 1).toFixed(1) + '" width="' + Math.max(1, a - 2).toFixed(1) + '" height="' + Math.max(1, b - 2).toFixed(1) + '" rx="2"/>';
    return '<figure class="tl-plan"><svg viewBox="-2 -2 ' + (W + 4) + ' ' + (H + 4).toFixed(0) + '" aria-hidden="true"><rect class="tl-plan-c" x="0" y="0" width="' + W + '" height="' + H.toFixed(1) + '" rx="4"/>' + boxes + '</svg><figcaption>Вид сверху, ' + esc(e.name) + ': ' + c.nL + ' × ' + c.nW + ' мест в ряду' + (c.nH > 1 ? ', ' + c.nH + ' яруса' : '') + '</figcaption></figure>';
  }
  function renderFit(root) {
    var saved = store('fit') || { items: [{ l: 120, w: 80, h: 150, kg: 300, q: 10 }], tilt: false, stack: true };
    function rowHtml(it, i) {
      return '<div class="tl-item" data-i="' + i + '"><b class="tl-n">' + (i + 1) + '</b>' +
        field('Длина, см', '<input inputmode="decimal" data-k="l" value="' + esc(it.l || '') + '">') + field('Ширина, см', '<input inputmode="decimal" data-k="w" value="' + esc(it.w || '') + '">') +
        field('Высота, см', '<input inputmode="decimal" data-k="h" value="' + esc(it.h || '') + '">') + field('Вес места, кг', '<input inputmode="decimal" data-k="kg" value="' + esc(it.kg || '') + '">') +
        field('Мест', '<input inputmode="numeric" data-k="q" value="' + esc(it.q || 1) + '">') + (i ? '<button type="button" class="tl-del" data-del="' + i + '" aria-label="Убрать позицию">×</button>' : '') + '</div>';
    }
    root.innerHTML = head('Инструменты', 'Влезет ли груз', 'Габариты и вес мест — и сразу видно, в какой контейнер или машину груз войдёт, сколько единиц нужно и что делать с негабаритом.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate><div class="tl-items"></div><button type="button" class="tl-add">+ Ещё позиция</button>' +
      '<div class="tl-checks"><label><input type="checkbox" data-o="tilt"' + (saved.tilt ? ' checked' : '') + '> Можно класть на бок (кантовать)</label><label><input type="checkbox" data-o="stack"' + (saved.stack ? ' checked' : '') + '> Можно ставить друг на друга</label></div>' +
      '<button class="tl-go" type="submit">Проверить</button></form><div class="tl-card tl-out" aria-live="polite"><p class="tl-empty">Укажите размеры одного места — покажем, во что груз войдёт.</p></div></div>';
    var list = $('.tl-items', root), form = $('form', root), out = $('.tl-out', root), items = saved.items;
    function draw() { list.innerHTML = items.map(rowHtml).join(''); }
    function read() { items = $$('.tl-item', list).map(function (r) { var o = {}; $$('[data-k]', r).forEach(function (x) { o[x.dataset.k] = num(x.value); }); o.q = Math.max(1, Math.round(o.q || 1)); return o; }); }
    function run() {
      read(); var tilt = $('[data-o="tilt"]', root).checked, stack = $('[data-o="stack"]', root).checked;
      store('fit', { items: items, tilt: tilt, stack: stack });
      var bad = items.filter(function (it) { return !(it.l > 0 && it.w > 0 && it.h > 0); }); if (bad.length) { out.innerHTML = '<p class="tl-err">Укажите длину, ширину и высоту каждого места.</p>'; return; }
      var its = items.map(function (it) { return { l: it.l, w: it.w, h: it.h, kg: it.kg || 0, q: it.q, tilt: tilt, stack: stack }; });
      var r = fitCheck(its), b = r.best;
      var h = '<div class="tl-sum"><span>Всего</span><b>' + fmt(r.tot.v, 2) + ' м³</b><b>' + fmt(r.tot.kg, 0) + ' кг</b><b>' + fmt(its.reduce(function (s, x) { return s + x.q; }, 0), 0) + ' мест</b></div>';
      var verdict = function (x, kind) { return '<div class="tl-verdict ' + (x.notes.length ? 'warn' : 'ok') + '">' + (x.notes.length ? ICON.warn : ICON.ok) + '<div><small>' + kind + '</small><b>' + (x.units > 1 ? x.units + ' × ' : '') + esc(x.e.full) + '</b><span>' + esc(x.e.name) + (x.per ? ' · помещается ' + fmt(x.per, 0) + ' мест' : '') + (x.notes.length ? ' · ' + esc(x.notes.join('; ')) : '') + '</span></div></div>'; };
      if (b) h += (r.bestC ? verdict(r.bestC, 'Контейнер — для моря и ЖД') : '<div class="tl-verdict no">' + ICON.no + '<div><small>Контейнер</small><b>В контейнер не входит</b><span>Даже Open Top и Flat Rack не подходят — только автомобиль или спецперевозка.</span></div></div>') + (r.bestT ? verdict(r.bestT, 'Машина — для авто') : '');
      else h += '<div class="tl-verdict no">' + ICON.no + '<div><b>Не входит ни в контейнер, ни в фуру</b><span>Нужна негабаритная перевозка: трал или платформа по индивидуальному расчёту.</span></div></div>';
      h += '<table class="tl-tbl"><thead><tr><th>Техника</th><th>Итог</th><th>Почему</th></tr></thead><tbody>' + r.rows.map(function (x) {
        var st = x.fail ? 'no' : x.notes.length ? 'warn' : 'ok';
        return '<tr class="' + st + (x === r.bestC || x === r.bestT ? ' best' : '') + '"><td><b>' + esc(x.e.name) + '</b><small>' + fmt(x.e.L / 100, 2) + '×' + fmt(x.e.W / 100, 2) + '×' + (x.e.open || x.e.flat ? 'без крыши' : fmt(x.e.H / 100, 2)) + ' м · до ' + fmt(x.e.kg / 1000, 1) + ' т</small></td><td><i class="tl-ic">' + ICON[st] + '</i>' + (x.fail ? 'не входит' : (x.units > 1 ? x.units + ' шт.' : '1 шт.') + (x.per ? ' · ' + fmt(x.per, 0) + ' мест' : '')) + '</td><td>' + esc(x.fail || x.notes.join('; ') || 'входит без ограничений') + '</td></tr>';
      }).join('') + '</tbody></table>';
      if (b && its.length === 1) h += fitSvg(r.bestC && !r.bestC.notes.length ? r.bestC : b, its[0]);
      h += '<p class="tl-note">Расчёт по внутренним размерам и грузоподъёмности по стандарту ISO; на деле закладывайте 5–10% на крепление и зазоры. Open Top грузят сверху краном, Flat Rack — для широкой и тяжёлой техники.</p>';
      out.innerHTML = h;
    }
    draw();
    root.addEventListener('click', function (e) {
      if (e.target.closest('.tl-add')) { read(); items.push({ l: '', w: '', h: '', kg: '', q: 1 }); draw(); var last = $$('.tl-item', list).pop(); if (last) $('input', last).focus(); }
      var d = e.target.closest('[data-del]'); if (d) { read(); items.splice(+d.dataset.del, 1); draw(); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    root._fill = function (its) { items = its; draw(); run(); };
    if (saved.items && saved.items[0] && saved.items[0].l) run();
  }

  /* =================================================================== 2. ОБЪЁМ ГРУЗА */
  var UNIT = { mm: 0.001, cm: 0.01, m: 1 };
  function renderVolume(root) {
    var saved = store('vol') || { unit: 'cm', rows: [{ l: 60, w: 40, h: 40, q: 20, kg: 12 }] };
    root.innerHTML = head('Инструменты', 'Объём груза', 'Размеры коробок — объём в м³, общий вес, плотность и объёмный вес для авиа, авто и ЖД.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate><div class="tl-unit" role="radiogroup" aria-label="Единицы">' + ['mm', 'cm', 'm'].map(function (u) { return '<button type="button" data-u="' + u + '" class="chip' + (saved.unit === u ? ' on' : '') + '">' + { mm: 'мм', cm: 'см', m: 'м' }[u] + '</button>'; }).join('') + '</div><div class="tl-items"></div><button type="button" class="tl-add">+ Ещё размер коробки</button></form><div class="tl-card tl-out" aria-live="polite"></div></div>';
    var unit = saved.unit, rows = saved.rows, list = $('.tl-items', root), out = $('.tl-out', root);
    function u() { return { mm: 'мм', cm: 'см', m: 'м' }[unit]; }
    function draw() { list.innerHTML = rows.map(function (r, i) { return '<div class="tl-item" data-i="' + i + '"><b class="tl-n">' + (i + 1) + '</b>' + field('Длина, ' + u(), '<input inputmode="decimal" data-k="l" value="' + esc(r.l) + '">') + field('Ширина, ' + u(), '<input inputmode="decimal" data-k="w" value="' + esc(r.w) + '">') + field('Высота, ' + u(), '<input inputmode="decimal" data-k="h" value="' + esc(r.h) + '">') + field('Мест', '<input inputmode="numeric" data-k="q" value="' + esc(r.q) + '">') + field('Вес места, кг', '<input inputmode="decimal" data-k="kg" value="' + esc(r.kg) + '">') + (i ? '<button type="button" class="tl-del" data-del="' + i + '" aria-label="Убрать">×</button>' : '') + '</div>'; }).join(''); calc(); }
    function read() { rows = $$('.tl-item', list).map(function (r) { var o = {}; $$('[data-k]', r).forEach(function (x) { o[x.dataset.k] = x.value; }); return o; }); }
    function calc() {
      read(); store('vol', { unit: unit, rows: rows });
      var k = UNIT[unit], V = 0, KG = 0, Q = 0, per = [];
      rows.forEach(function (r) { var v = num(r.l) * k * num(r.w) * k * num(r.h) * k, q = Math.max(0, Math.round(num(r.q) || 0)); per.push(v); V += v * q; KG += num(r.kg) * q; Q += q; });
      if (!V) { out.innerHTML = '<p class="tl-empty">Введите длину, ширину и высоту коробки.</p>'; return; }
      var dens = KG ? KG / V : 0;
      var vw = [['Авиа (1:6000)', 167], ['Экспресс (1:5000)', 200], ['Авто сборный из Китая', 250], ['ЖД сборный', 300]];
      var cont = [['20′ DC', 33.2], ['40′ DC', 67.7], ['40′ HC', 76.3], ['Фура 82 м³', 82]];
      var h = '<div class="tl-big"><b>' + fmt(V, 3) + ' м³</b><span>' + fmt(Q, 0) + ' мест' + (KG ? ' · ' + fmt(KG, 1) + ' кг' : '') + (dens ? ' · плотность ' + fmt(dens, 0) + ' кг/м³' : '') + '</span>' + copyBtn(fmt(V, 3) + ' м³') + '</div>';
      if (rows.length > 1) h += '<ul class="tl-mini">' + per.map(function (v, i) { return '<li>' + (i + 1) + ': ' + fmt(v, 4) + ' м³ × ' + fmt(num(rows[i].q), 0) + ' = <b>' + fmt(v * num(rows[i].q), 3) + ' м³</b></li>'; }).join('') + '</ul>';
      h += '<h3 class="tl-sub">Объёмный вес</h3><div class="tl-chips">' + vw.map(function (x) { var w = V * x[1], pay = Math.max(w, KG); return '<div class="tl-chip"><small>' + x[0] + '</small><b>' + fmt(w, 0) + ' кг</b><em>' + (KG ? 'к оплате ' + fmt(pay, 0) + ' кг · ' + (w > KG ? 'по объёму' : 'по весу') : '1 м³ = ' + x[1] + ' кг') + '</em></div>'; }).join('') + '</div>';
      h += '<h3 class="tl-sub">Сколько места займёт</h3><div class="tl-bars">' + cont.map(function (c) { var p = V / (c[1] * 0.9) * 100; return '<div class="tl-bar"><span>' + c[0] + '</span><i><em style="width:' + Math.min(100, p).toFixed(1) + '%"></em></i><b>' + (p > 100 ? Math.ceil(p / 100) + ' шт.' : fmt(p, 0) + '%') + '</b></div>'; }).join('') + '</div>';
      h += '<div class="tl-acts"><button type="button" class="tl-go tl-tofit">Проверить, влезет ли →</button></div><p class="tl-note">Заполнение считаем от 90% объёма контейнера — остальное уходит на зазоры. Грузовой вес в сборных грузах из Китая часто считают как 1 м³ = 250 кг, у перевозчиков он может отличаться.</p>';
      out.innerHTML = h;
    }
    draw();
    root.addEventListener('input', function (e) { if (e.target.closest('.tl-item')) calc(); });
    root.addEventListener('click', function (e) {
      var ub = e.target.closest('[data-u]'); if (ub) { read(); unit = ub.dataset.u; $$('[data-u]', root).forEach(function (x) { x.classList.toggle('on', x === ub); }); draw(); }
      if (e.target.closest('.tl-add')) { read(); rows.push({ l: '', w: '', h: '', q: 1, kg: '' }); draw(); }
      var d = e.target.closest('[data-del]'); if (d) { read(); rows.splice(+d.dataset.del, 1); draw(); }
      if (e.target.closest('.tl-tofit')) { var k = UNIT[unit] * 100; openTool('fitView', function (r) { r._fill && r._fill(rows.filter(function (x) { return num(x.l) && num(x.w) && num(x.h); }).map(function (x) { return { l: Math.round(num(x.l) * k * 10) / 10, w: Math.round(num(x.w) * k * 10) / 10, h: Math.round(num(x.h) * k * 10) / 10, kg: num(x.kg), q: Math.max(1, Math.round(num(x.q))) }; })); }); }
    });
  }

  /* =================================================================== 3. СУММА ПРОПИСЬЮ */
  var CASES = ['nom', 'gen', 'dat', 'acc', 'ins', 'pre'];
  var CASE_NAME = { nom: 'Именительный (кто? что?)', gen: 'Родительный (кого? чего?)', dat: 'Дательный (кому? чему?)', acc: 'Винительный (кого? что?)', ins: 'Творительный (кем? чем?)', pre: 'Предложный (о ком? о чём?)' };
  var U = {
    nom: { m: ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'], f: ['', 'одна', 'две'] },
    gen: { m: ['', 'одного', 'двух', 'трёх', 'четырёх', 'пяти', 'шести', 'семи', 'восьми', 'девяти'], f: ['', 'одной', 'двух'] },
    dat: { m: ['', 'одному', 'двум', 'трём', 'четырём', 'пяти', 'шести', 'семи', 'восьми', 'девяти'], f: ['', 'одной', 'двум'] },
    acc: { m: ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'], f: ['', 'одну', 'две'] },
    ins: { m: ['', 'одним', 'двумя', 'тремя', 'четырьмя', 'пятью', 'шестью', 'семью', 'восемью', 'девятью'], f: ['', 'одной', 'двумя'] },
    pre: { m: ['', 'одном', 'двух', 'трёх', 'четырёх', 'пяти', 'шести', 'семи', 'восьми', 'девяти'], f: ['', 'одной', 'двух'] }
  };
  var TEEN = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  var TENS = {
    nom: ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'],
    gen: ['', '', 'двадцати', 'тридцати', 'сорока', 'пятидесяти', 'шестидесяти', 'семидесяти', 'восьмидесяти', 'девяноста'],
    ins: ['', '', 'двадцатью', 'тридцатью', 'сорока', 'пятьюдесятью', 'шестьюдесятью', 'семьюдесятью', 'восемьюдесятью', 'девяноста']
  };
  var HUND = {
    nom: ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'],
    gen: ['', 'ста', 'двухсот', 'трёхсот', 'четырёхсот', 'пятисот', 'шестисот', 'семисот', 'восьмисот', 'девятисот'],
    dat: ['', 'ста', 'двумстам', 'трёмстам', 'четырёмстам', 'пятистам', 'шестистам', 'семистам', 'восьмистам', 'девятистам'],
    ins: ['', 'ста', 'двумястами', 'тремястами', 'четырьмястами', 'пятьюстами', 'шестьюстами', 'семьюстами', 'восемьюстами', 'девятьюстами'],
    pre: ['', 'ста', 'двухстах', 'трёхстах', 'четырёхстах', 'пятистах', 'шестистах', 'семистах', 'восьмистах', 'девятистах']
  };
  function teen(i, c) { var w = TEEN[i]; if (c === 'nom' || c === 'acc') return w; var stem = w.slice(0, -1); return c === 'ins' ? stem + 'ью' : stem + 'и'; }
  function tens(i, c) { return (TENS[c === 'acc' ? 'nom' : c === 'ins' ? 'ins' : c === 'nom' ? 'nom' : 'gen'])[i]; }
  function hund(i, c) { return (HUND[c === 'acc' ? 'nom' : c])[i]; }
  // склонение существительного: forms = { nom: [ед, 2-4, 5+], gen: [ед, мн], dat: [...], acc: [ед, 2-4, 5+], ins: [...], pre: [...] }
  function nounForm(n, c, forms) {
    var n100 = n % 100, n10 = n % 10, f = forms[c];
    if (c === 'nom' || c === 'acc') return n100 >= 11 && n100 <= 14 ? f[2] : n10 === 1 ? f[0] : n10 >= 2 && n10 <= 4 ? f[1] : f[2];
    return n10 === 1 && n100 !== 11 ? f[0] : f[1];
  }
  var NOUN = {
    thousand: { g: 'f', nom: ['тысяча', 'тысячи', 'тысяч'], acc: ['тысячу', 'тысячи', 'тысяч'], gen: ['тысячи', 'тысяч'], dat: ['тысяче', 'тысячам'], ins: ['тысячей', 'тысячами'], pre: ['тысяче', 'тысячах'] },
    million: { g: 'm', nom: ['миллион', 'миллиона', 'миллионов'], acc: ['миллион', 'миллиона', 'миллионов'], gen: ['миллиона', 'миллионов'], dat: ['миллиону', 'миллионам'], ins: ['миллионом', 'миллионами'], pre: ['миллионе', 'миллионах'] },
    billion: { g: 'm', nom: ['миллиард', 'миллиарда', 'миллиардов'], acc: ['миллиард', 'миллиарда', 'миллиардов'], gen: ['миллиарда', 'миллиардов'], dat: ['миллиарду', 'миллиардам'], ins: ['миллиардом', 'миллиардами'], pre: ['миллиарде', 'миллиардах'] },
    rub: { g: 'm', nom: ['рубль', 'рубля', 'рублей'], acc: ['рубль', 'рубля', 'рублей'], gen: ['рубля', 'рублей'], dat: ['рублю', 'рублям'], ins: ['рублём', 'рублями'], pre: ['рубле', 'рублях'] },
    kop: { g: 'f', nom: ['копейка', 'копейки', 'копеек'], acc: ['копейку', 'копейки', 'копеек'], gen: ['копейки', 'копеек'], dat: ['копейке', 'копейкам'], ins: ['копейкой', 'копейками'], pre: ['копейке', 'копейках'] },
    usd: { g: 'm', nom: ['доллар США', 'доллара США', 'долларов США'], acc: ['доллар США', 'доллара США', 'долларов США'], gen: ['доллара США', 'долларов США'], dat: ['доллару США', 'долларам США'], ins: ['долларом США', 'долларами США'], pre: ['долларе США', 'долларах США'] },
    cent: { g: 'm', nom: ['цент', 'цента', 'центов'], acc: ['цент', 'цента', 'центов'], gen: ['цента', 'центов'], dat: ['центу', 'центам'], ins: ['центом', 'центами'], pre: ['центе', 'центах'] },
    eur: { g: 'm', nom: ['евро', 'евро', 'евро'], acc: ['евро', 'евро', 'евро'], gen: ['евро', 'евро'], dat: ['евро', 'евро'], ins: ['евро', 'евро'], pre: ['евро', 'евро'] },
    cny: { g: 'm', nom: ['юань', 'юаня', 'юаней'], acc: ['юань', 'юаня', 'юаней'], gen: ['юаня', 'юаней'], dat: ['юаню', 'юаням'], ins: ['юанем', 'юанями'], pre: ['юане', 'юанях'] },
    fen: { g: 'm', nom: ['фэнь', 'фэня', 'фэней'], acc: ['фэнь', 'фэня', 'фэней'], gen: ['фэня', 'фэней'], dat: ['фэню', 'фэням'], ins: ['фэнем', 'фэнями'], pre: ['фэне', 'фэнях'] }
  };
  var CUR = { rub: ['rub', 'kop', '₽'], usd: ['usd', 'cent', '$'], eur: ['eur', 'cent', '€'], cny: ['cny', 'fen', '¥'], none: [null, null, ''] };
  function triad(n, c, g) {
    var h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10, out = [];
    if (h) out.push(hund(h, c));
    if (t === 1) out.push(teen(u, c));
    else { if (t) out.push(tens(t, c)); if (u) out.push(g === 'f' && u <= 2 ? U[c].f[u] : (g === 'n' && u === 1 && (c === 'nom' || c === 'acc') ? 'одно' : U[c].m[u])); }
    return out.join(' ');
  }
  function words(n, c, g) {
    n = Math.floor(Math.abs(n)); if (!n) return c === 'gen' ? 'нуля' : c === 'dat' ? 'нулю' : c === 'ins' ? 'нулём' : c === 'pre' ? 'нуле' : 'ноль';
    var parts = [], groups = [['billion', 1e9], ['million', 1e6], ['thousand', 1e3]], rest = n;
    groups.forEach(function (gr) { var k = Math.floor(rest / gr[1]) % 1000; rest = rest % gr[1]; if (k) parts.push(triad(k, c, NOUN[gr[0]].g) + ' ' + nounForm(k, c, NOUN[gr[0]])); });
    if (rest) parts.push(triad(rest, c, g || 'm'));
    return parts.join(' ');
  }
  function amountWords(x, cur, c, opt) {
    var C = CUR[cur], whole = Math.floor(x + 1e-9), frac = Math.round((x - whole) * 100); if (frac === 100) { whole++; frac = 0; }
    var w = words(whole, c, C[0] ? NOUN[C[0]].g : 'm'), unit = C[0] ? nounForm(whole, c, NOUN[C[0]]) : '';
    var small = C[1] ? (opt.kopWords ? words(frac, c, NOUN[C[1]].g) : String(frac).padStart(2, '0')) + ' ' + nounForm(frac, c, NOUN[C[1]]) : (frac ? ', ' + String(frac).padStart(2, '0') + ' сотых' : '');
    return { w: w, unit: unit, small: small, whole: whole, frac: frac };
  }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function renderPropis(root) {
    var saved = store('propis') || { sum: '1234567,89', cur: 'rub', c: 'nom', vat: '22', vatMode: 'in', kopWords: false, upper: true };
    root.innerHTML = head('Инструменты', 'Сумма прописью', 'Для договора, счёта и акта: сумма цифрами и прописью в нужном падеже, с НДС или без.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate>' + field('Сумма', '<input inputmode="decimal" data-p="sum" value="' + esc(saved.sum) + '" placeholder="например, 1 250 000,50">', 'tl-wide') +
      field('Валюта', '<select data-p="cur"><option value="rub">Рубли</option><option value="usd">Доллары США</option><option value="eur">Евро</option><option value="cny">Юани</option><option value="none">Без валюты</option></select>') +
      field('Падеж', '<select data-p="c">' + CASES.map(function (c) { return '<option value="' + c + '">' + CASE_NAME[c] + '</option>'; }).join('') + '</select>') +
      field('НДС', '<select data-p="vatMode"><option value="in">в том числе НДС</option><option value="add">НДС сверху</option><option value="none">без НДС</option></select>') +
      field('Ставка НДС, %', '<select data-p="vat"><option>22</option><option>20</option><option>10</option><option>7</option><option>5</option><option>0</option></select>') +
      '<div class="tl-checks"><label><input type="checkbox" data-p="kopWords"> Копейки прописью</label><label><input type="checkbox" data-p="upper"> С заглавной буквы</label></div></form><div class="tl-card tl-out" aria-live="polite"></div></div>';
    var f = $('form', root), out = $('.tl-out', root);
    $$('[data-p]', f).forEach(function (el) { var v = saved[el.dataset.p]; if (el.type === 'checkbox') el.checked = !!v; else if (v != null) el.value = v; });
    function calc() {
      var o = {}; $$('[data-p]', f).forEach(function (el) { o[el.dataset.p] = el.type === 'checkbox' ? el.checked : el.value; }); store('propis', o);
      var x = num(o.sum); if (!(x >= 0) || !String(o.sum).trim()) { out.innerHTML = '<p class="tl-empty">Введите сумму.</p>'; return; }
      if (x >= 1e12) { out.innerHTML = '<p class="tl-err">Слишком большая сумма — до 999 миллиардов.</p>'; return; }
      var C = CUR[o.cur], sign = C[2], rate = num(o.vat), total = x, vat = 0;
      if (o.vatMode === 'in') vat = Math.round(x * rate / (100 + rate) * 100) / 100;
      else if (o.vatMode === 'add') { vat = Math.round(x * rate) / 100; total = Math.round((x + vat) * 100) / 100; }
      function line(v) {
        var a = amountWords(v, o.cur, o.c, o), w = o.upper ? cap1(a.w) : a.w, digits = fmt(a.whole, 0);
        var full = digits + ' (' + w + ')' + (a.unit ? ' ' + a.unit : '') + (C[1] ? ' ' + a.small : (a.frac ? a.small : ''));
        var plain = (o.upper ? cap1(a.w) : a.w) + (a.unit ? ' ' + a.unit : '') + (C[1] ? ' ' + a.small : (a.frac ? a.small : ''));
        return { full: full, plain: plain, num: fmt(v, 2) + (sign ? ' ' + sign : '') };
      }
      var L = line(total), V = vat ? line(vat) : null, base = o.vatMode === 'add' ? line(x) : null;
      var contract = L.full + (o.vatMode === 'none' ? ', НДС не облагается' : V ? ', в том числе НДС ' + rate + ' % — ' + V.full : '');
      var h = '<div class="tl-big"><b>' + esc(L.num) + '</b><span>' + esc(CASE_NAME[o.c].split(' ')[0]) + ' падеж</span></div>';
      h += '<div class="tl-res-row"><small>Для договора</small><p data-no-i18n lang="ru">' + esc(contract) + '</p>' + copyBtn(contract) + '</div>';
      h += '<div class="tl-res-row"><small>Только прописью</small><p data-no-i18n lang="ru">' + esc(L.plain) + '</p>' + copyBtn(L.plain) + '</div>';
      if (V) h += '<div class="tl-res-row"><small>НДС ' + rate + ' %</small><p data-no-i18n lang="ru">' + esc(V.full) + '</p>' + copyBtn(V.full) + '</div>';
      if (base) h += '<div class="tl-res-row"><small>Сумма без НДС</small><p data-no-i18n lang="ru">' + esc(base.full) + '</p>' + copyBtn(base.full) + '</div>';
      h += '<p class="tl-note">Падеж выбирают по фразе в договоре: «стоимость составляет …» — именительный, «в размере …» — родительный, «по цене, равной …» — дательный, «за …» — винительный.</p>';
      out.innerHTML = h;
    }
    f.addEventListener('input', calc); f.addEventListener('change', calc); f.addEventListener('submit', function (e) { e.preventDefault(); }); calc();
  }

  /* =================================================================== 4. ЧЕЙ НОМЕР И КОТОРЫЙ ЧАС */
  var clockT = 0;
  function renderPhone(root) {
    root.innerHTML = head('Инструменты', 'Чей номер и который час', 'Номер клиента — регион, оператор, местное время и разница с Москвой: сразу понятно, можно ли звонить.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate>' + field('Номер телефона', '<input type="tel" data-k="num" placeholder="+7 953 550-56-54 или +86 138 0013 8000" autocomplete="off">', 'tl-wide') +
      '<button class="tl-go" type="submit">Проверить</button><div class="tl-hist"></div></form><div class="tl-card tl-out" aria-live="polite"><p class="tl-empty">Можно вводить с восьмёркой, плюсом, скобками и пробелами.</p></div></div>';
    var f = $('form', root), out = $('.tl-out', root), inp = $('[data-k="num"]', f), hist = $('.tl-hist', f), cur = null;
    function drawHist() { var h = store('phones') || []; hist.innerHTML = h.length ? '<small>Недавние</small>' + h.map(function (x) { return '<button type="button" class="chip" data-ph="' + esc(x.n) + '">' + esc(x.n) + (x.p ? ' · ' + esc(x.p) : '') + '</button>'; }).join('') : ''; }
    function local(tz) { try { return new Date().toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function hourIn(tz) { try { var p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date()); var h = 0, wd = ''; p.forEach(function (x) { if (x.type === 'hour') h = +x.value; if (x.type === 'weekday') wd = x.value; }); return { h: h, we: wd === 'Sat' || wd === 'Sun' }; } catch (e) { return { h: 12, we: false }; } }
    function diff(min) { if (!min) return 'как в Москве'; var s = min > 0 ? '+' : '−', a = Math.abs(min), h = Math.floor(a / 60), m = a % 60; return s + h + (m ? ':' + String(m).padStart(2, '0') : '') + ' ч к Москве'; }
    function draw() {
      if (!cur) return; var r = cur, t = hourIn(r.tz), can = t.h >= 9 && t.h < (t.we ? 18 : 20), soon = !can && t.h >= 7 && t.h < 9;
      var place = [r.city, r.region].filter(Boolean).join(', ') || r.country || '';
      out.innerHTML = '<div class="tl-phone"><div class="tl-clock"><b>' + local(r.tz) + '</b><span>' + esc(diff(r.mskDiffMin)) + '</span></div><div class="tl-call ' + (can ? 'ok' : soon ? 'warn' : 'no') + '">' + (can ? ICON.ok + 'Можно звонить' : soon ? ICON.warn + 'Рано — лучше после 9:00' : ICON.no + 'Поздно — лучше написать') + '</div></div>' +
        '<dl class="tl-dl"><dt>Номер</dt><dd>' + esc(r.number) + copyBtn(r.number) + '</dd>' + (r.country ? '<dt>Страна</dt><dd>' + esc(r.country) + '</dd>' : '') + (place && place !== r.country ? '<dt>Регион</dt><dd>' + esc(place) + '</dd>' : '') +
        (r.operator ? '<dt>Оператор</dt><dd>' + esc(r.operator) + '</dd>' : '') + (r.ported ? '<dt>Перенос номера</dt><dd>' + esc(r.ported) + '</dd>' : '') + '<dt>Часовой пояс</dt><dd>UTC' + (r.utcOffsetMin >= 0 ? '+' : '−') + fmt(Math.abs(r.utcOffsetMin) / 60, 1) + '</dd></dl>' +
        (r.note ? '<p class="tl-note">' + esc(r.note) + '</p>' : '') +
        '<div class="tl-acts"><a class="tl-btn" href="tel:+' + esc(r.digits) + '">Позвонить</a><a class="tl-btn" target="_blank" rel="noopener" href="https://wa.me/' + esc(r.digits) + '">WhatsApp</a><a class="tl-btn" target="_blank" rel="noopener" href="https://t.me/+' + esc(r.digits) + '">Telegram</a></div>' +
        '<p class="tl-src">Источник: ' + esc(r.source || 'справочник') + '. Мобильный номер показывает регион, где его выдали: человек может быть в другом городе.</p>';
    }
    function go(v) {
      var btn = $('.tl-go', f); busy(btn, true); out.innerHTML = '<p class="tl-load">Определяем номер…</p>';
      api('/api/tools/phone', { number: v }).then(function (r) {
        busy(btn, false); if (!r.ok) { cur = null; out.innerHTML = '<p class="tl-err">' + esc(r.error || 'Не получилось') + '</p>'; return; }
        cur = r; draw(); var h = (store('phones') || []).filter(function (x) { return x.n !== r.number; }); h.unshift({ n: r.number, p: r.city || r.region || r.country || '' }); store('phones', h.slice(0, 5)); drawHist();
      });
    }
    f.addEventListener('submit', function (e) { e.preventDefault(); if (inp.value.trim()) go(inp.value); });
    hist.addEventListener('click', function (e) { var b = e.target.closest('[data-ph]'); if (b) { inp.value = b.dataset.ph; go(b.dataset.ph); } });
    drawHist(); clearInterval(clockT); clockT = setInterval(function () { if (root.closest('.view-layer.open')) draw(); }, 20000);
  }

  /* =================================================================== 5. ТЕРМИНАЛЬНЫЕ В ШЕРЕМЕТЬЕВО */
  var AIR = [['SU', 'Аэрофлот (555)'], ['FV', 'Россия (195)'], ['CZ', 'China Southern (784)'], ['MU', 'China Eastern (112)'], ['HU', 'Hainan Airlines (880)'], ['3U', 'Sichuan Airlines (876)'], ['GS', 'Tianjin Airlines (826)'], ['JD', 'Beijing Capital (898)'], ['QR', 'Qatar Airways (157)'], ['VI', 'Волга-Днепр (412)'], ['N4', 'Северный ветер (216)'], ['EO', 'Икар (770)'], ['5N', 'Смартавиа (316)'], ['WZ', 'Red Wings (309)'], ['SV', 'Saudia (065)'], ['GF', 'Gulf Air (072)'], ['ZR', 'Авиакон Цитотранс (410)']];
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function renderTerminal(root) {
    var saved = store('term') || { t: 'mc' }, today = new Date(), later = new Date(Date.now() + 4 * 864e5);
    root.innerHTML = head('Инструменты', 'Терминальные в Шереметьево', 'Груз прилетает в SVO-1 — это Москва Карго, в SVO-2 — Шереметьево-Карго. Считаем обработку, хранение и сборы с НДС.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate><div class="tl-seg" role="tablist"><button type="button" role="tab" data-t="mc">SVO-1 · Москва Карго</button><button type="button" role="tab" data-t="sher">SVO-2 · Шереметьево-Карго</button></div>' +
      field('Авиакомпания', '<select data-k="airline">' + AIR.map(function (a) { return '<option value="' + a[0] + '">' + a[1] + '</option>'; }).join('') + '</select>', 'tl-mc') +
      field('Характер груза', '<select data-k="category"><option value="general">Генеральный</option><option value="dangerous">Опасный</option><option value="perishable">Скоропортящийся, с температурой</option><option value="valuable">Ценный</option><option value="animals">Живые животные</option></select>') +
      field('Вес фактический, кг', '<input inputmode="decimal" data-k="weight" value="' + esc(saved.weight || '') + '">') + field('Платный вес, кг', '<input inputmode="decimal" data-k="chargeable" value="' + esc(saved.chargeable || '') + '" placeholder="объёмный, если больше">') +
      field('Мест', '<input inputmode="numeric" data-k="places" value="' + esc(saved.places || 1) + '">') +
      field('Прибытие на склад', '<input type="date" data-k="from" value="' + iso(today) + '">') + field('Получение груза', '<input type="date" data-k="to" value="' + iso(later) + '">') +
      '<div class="tl-checks"><label class="tl-mc"><input type="checkbox" data-k="after16"> Груз готов к выдаче после 16:00</label><label><input type="checkbox" data-k="load"> Погрузка в машину</label><label class="tl-sher"><input type="checkbox" data-k="coordination"> Координация обслуживания</label></div>' +
      '<button class="tl-go" type="submit">Рассчитать</button></form><div class="tl-card tl-out" aria-live="polite"><p class="tl-empty">Укажите вес и даты — посчитаем по тарифам терминала.</p></div></div>';
    var f = $('form', root), out = $('.tl-out', root), t = saved.t;
    if (saved.airline) $('[data-k="airline"]', f).value = saved.airline; if (saved.category) $('[data-k="category"]', f).value = saved.category;
    function seg() { $$('[data-t]', f).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); }); inp.placeholder = t === 'awb' ? '555-12345675' : t === 'bl' ? 'Номер B/L из документа' : t === 'wagon' ? '8–12 цифр номера вагона' : 'FESU5011022'; var carrier = $('.tl-carrier', f); if (carrier) carrier.hidden = t !== 'bl'; }
    seg();
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { t = b.dataset.t; seg(); out.innerHTML = '<p class="tl-empty">Нажмите «Рассчитать».</p>'; } });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var q = { terminal: t }; $$('[data-k]', f).forEach(function (x) { q[x.dataset.k] = x.type === 'checkbox' ? x.checked : x.value; });
      store('term', { t: t, airline: q.airline, category: q.category, weight: q.weight, chargeable: q.chargeable, places: q.places });
      var btn = $('.tl-go', f); busy(btn, true); out.innerHTML = '<p class="tl-load">' + (t === 'mc' ? 'Считаем в калькуляторе Москва Карго…' : 'Считаем по тарифам Шереметьево-Карго…') + '</p>';
      api('/api/tools/terminal', q).then(function (r) {
        busy(btn, false); if (!r.ok) { out.innerHTML = '<p class="tl-err">' + esc(r.error || 'Не получилось') + '</p>'; return; }
        out.innerHTML = '<div class="tl-big"><b>' + rub(r.total) + '</b><span>с НДС · ' + (t === 'mc' ? 'Москва Карго, SVO-1' : 'Шереметьево-Карго, SVO-2') + '</span>' + copyBtn(rub(r.total)) + '</div>' +
          '<table class="tl-tbl tl-lines"><tbody>' + r.lines.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + rub(x.sum) + '</td></tr>'; }).join('') + '</tbody></table>' +
          (r.note ? '<p class="tl-note">' + esc(r.note) + '</p>' : '') + '<p class="tl-src">' + (r.live ? 'Посчитано калькулятором терминала на moscow-cargo.com' : 'Посчитано по ' + esc(r.source)) + '. Сумма ориентировочная, точную выставит терминал.</p>';
      });
    });
  }

  /* =================================================================== 6. ДОСТАВКА ПО РОССИИ */
  function renderRussia(root) {
    var s = store('ru') || { from: 'Москва', to: 'Челябинск', weight: 200, volume: 1, places: 1 };
    root.innerHTML = head('Инструменты', 'Доставка по России', 'Груз пришёл из Китая в Москву и едет дальше? Считаем сборную перевозку между городами России.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate>' + field('Откуда', '<input data-k="from" value="' + esc(s.from) + '" placeholder="Москва">') + field('Куда', '<input data-k="to" value="' + esc(s.to) + '" placeholder="Челябинск">') +
      field('Вес, кг', '<input inputmode="decimal" data-k="weight" value="' + esc(s.weight) + '">') + field('Объём, м³', '<input inputmode="decimal" data-k="volume" value="' + esc(s.volume) + '">') + field('Мест', '<input inputmode="numeric" data-k="places" value="' + esc(s.places) + '">') +
      '<button class="tl-go" type="submit">Рассчитать</button></form><div class="tl-card tl-out" aria-live="polite"><p class="tl-empty">Терминал — терминал, сборный груз.</p></div></div>';
    var f = $('form', root), out = $('.tl-out', root);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var q = {}; $$('[data-k]', f).forEach(function (x) { q[x.dataset.k] = x.value; }); store('ru', q);
      var btn = $('.tl-go', f); busy(btn, true); out.innerHTML = '<p class="tl-load">Считаем…</p>';
      api('/api/tools/russia', q).then(function (r) {
        busy(btn, false); if (!r.ok) { out.innerHTML = '<p class="tl-err">' + esc(r.error || 'Не получилось') + '</p>'; return; }
        var h = '<div class="tl-big"><b>' + (r.live ? rub(r.price) : '≈ ' + fmt(r.priceRange[0], 0) + '–' + fmt(r.priceRange[1], 0) + ' ₽') + '</b><span>' + esc(q.from) + ' → ' + esc(q.to) + (r.km ? ' · ≈ ' + fmt(r.km, 0) + ' км' : '') + (r.days ? ' · ' + r.days[0] + '–' + r.days[1] + ' дн.' : '') + '</span></div>';
        if (r.live) h += '<p class="tl-src">Цена Деловых Линий: терминал — терминал, без страхования и упаковки.</p>';
        else h += '<p class="tl-note">' + (r.note ? esc(r.note) : r.keyMissing ? 'Это ориентир по рынку сборных перевозок. Чтобы здесь была точная цена Деловых Линий, подключите их бесплатный ключ API (dev.dellin.ru) — администратор добавляет его в настройках сервера как DELLIN_APPKEY.' : '') + '</p>';
        out.innerHTML = h;
      });
    });
  }

  /* =================================================================== 7. ОТСЛЕДИТЬ ГРУЗ */
  var KEYRU = { station: 'Станция', station_name: 'Станция', dislocation_station: 'Станция дислокации', operation: 'Операция', operation_name: 'Операция', date: 'Дата', datetime: 'Дата и время', wagon: 'Вагон', wagon_number: 'Вагон', departure_station: 'Станция отправления', destination_station: 'Станция назначения', distance_left: 'Осталось, км', status: 'Статус' };
  function renderTrack(root) {
    var s = store('track') || { t: 'cont' };
    root.innerHTML = head('Инструменты', 'Отследить груз', 'Номер контейнера или авианакладной — проверим номер, найдём линию и покажем, где груз сейчас.') +
      '<div class="tl-grid"><form class="tl-card tl-form" novalidate><div class="tl-seg" role="tablist"><button type="button" role="tab" data-t="cont">Контейнер</button><button type="button" role="tab" data-t="awb">Авиа · AWB</button><button type="button" role="tab" data-t="bl">Коносамент · B/L</button><button type="button" role="tab" data-t="wagon">ЖД · вагон</button></div>' +
      field('Номер', '<input data-k="no" autocomplete="off" spellcheck="false" placeholder="FESU5011022">', 'tl-wide') + '<label class="tl-f tl-wide tl-carrier" hidden><span>Морская линия</span><select data-k="carrier"><option value="maersk">Maersk</option><option value="msc">MSC</option><option value="cosco">COSCO</option><option value="cmacgm">CMA CGM</option><option value="hapag">Hapag-Lloyd</option><option value="one">ONE</option><option value="zim">ZIM</option><option value="evergreen">Evergreen</option><option value="sitc">SITC</option><option value="fesco">FESCO</option></select></label>' + '<button class="tl-go" type="submit">Отследить</button><div class="tl-hist"></div></form>' +
      '<div class="tl-card tl-out" aria-live="polite"><p class="tl-empty">Контейнер: 4 буквы и 7 цифр. Авианакладная: 11 цифр, например 555-12345675.</p></div></div>';
    var f = $('form', root), out = $('.tl-out', root), inp = $('[data-k="no"]', f), t = s.t, hist = $('.tl-hist', f);
    function seg() { $('[data-t]', f).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); }); inp.placeholder = t === 'awb' ? '555-12345675' : t === 'bl' ? 'Номер B/L из документа' : t === 'wagon' ? '8–12 цифр номера вагона' : 'FESU5011022'; var carrier = $('.tl-carrier', f); if (carrier) carrier.hidden = t !== 'bl'; }
    function drawHist() { var h = (store('trackHist') || []).filter(function (x) { return x.t === t; }); hist.innerHTML = h.length ? '<small>Недавние</small>' + h.map(function (x) { return '<button type="button" class="chip" data-no="' + esc(x.n) + '">' + esc(x.n) + '</button>'; }).join('') : ''; }
    seg(); drawHist();
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { t = b.dataset.t; store('track', { t: t }); seg(); drawHist(); } var n = e.target.closest('[data-no]'); if (n) { inp.value = n.dataset.no; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit')); } });
    function remember(n) { var h = (store('trackHist') || []).filter(function (x) { return x.n !== n; }); h.unshift({ t: t, n: n }); store('trackHist', h.slice(0, 8)); drawHist(); }
    function table(rows) {
      if (!rows.length) return '';
      var keys = Object.keys(rows[0]).filter(function (k) { return rows.some(function (r) { return r[k] != null && typeof r[k] !== 'object' && String(r[k]).trim() !== ''; }); }).slice(0, 7);
      return '<div class="tl-scroll"><table class="tl-tbl"><thead><tr>' + keys.map(function (k) { return '<th>' + esc(KEYRU[k] || k.replace(/_/g, ' ')) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + keys.map(function (k) { return '<td>' + esc(r[k]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var v = inp.value.trim(); if (!v) return;
      var btn = $('.tl-go', f); busy(btn, true); out.innerHTML = '<p class="tl-load">Ищем…</p>';
      if (t === 'bl') { var bl = v.toUpperCase().replace(/\s+/g, ' '), line = $('[data-k="carrier"]', f).value, links = { maersk:'https://www.maersk.com/tracking/', msc:'https://www.msc.com/en/track-a-shipment', cosco:'https://elines.coscoshipping.com/ebusiness/cargoTracking', cmacgm:'https://www.cma-cgm.com/ebusiness/tracking', hapag:'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html', one:'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking', zim:'https://www.zim.com/tools/track-a-shipment', evergreen:'https://www.shipmentlink.com/', sitc:'https://www.sitcline.com/', fesco:'https://www.fesco.ru/' }, names = {maersk:'Maersk',msc:'MSC',cosco:'COSCO',cmacgm:'CMA CGM',hapag:'Hapag-Lloyd',one:'ONE',zim:'ZIM',evergreen:'Evergreen',sitc:'SITC',fesco:'FESCO'}; remember(bl); out.innerHTML = '<div class="tl-big"><b>' + esc(bl) + '</b><span>Коносамент · ' + esc(names[line]) + '</span></div><p class="tl-note">Откроется официальный кабинет выбранной морской линии. Вставьте номер B/L в форму отслеживания на сайте перевозчика. Статус из внешней системы напрямую на IOMASTAVKA пока не загружается.</p><div class="tl-acts"><a class="tl-btn" href="' + links[line] + '" target="_blank" rel="noopener">Открыть отслеживание ' + esc(names[line]) + ' ↗</a>' + copyBtn(bl) + '</div>'; if(navigator.clipboard) navigator.clipboard.writeText(bl).catch(function(){}); busy(btn,false); return; } if (t === 'wagon') return api('/api/tools/wagon?no=' + encodeURIComponent(v)).then(function (r) { busy(btn,false); if(!r.ok){out.innerHTML='<p class="tl-err">'+esc(r.error||'Не получилось проверить вагон')+'</p>';return;} remember(v); out.innerHTML='<div class="tl-big"><b>'+esc(v)+'</b><span>Запрос по железнодорожному номеру</span></div>'+(r.rows&&r.rows.length?'<h3 class="tl-sub">Дислокация</h3>'+table(r.rows):'<p class="tl-note">В ответе ТрансКонтейнера нет событий по этому номеру. Это не подтверждает отсутствие вагона в пути: источник может не поддерживать данный номер или перевозку.</p>')+'<p class="tl-src">Источник: API ТрансКонтейнера. Результат зависит от доступности и охвата внешней системы.</p>'; }); if (t === 'awb') return api('/api/tools/awb?no=' + encodeURIComponent(v)).then(function (r) {
        busy(btn, false); if (!r.ok) { out.innerHTML = '<p class="tl-err">' + esc(r.error) + '</p>'; return; } remember(r.awb);
        var tabs = (r.tables || []).filter(function (tb) { return tb.length > 1; });
        out.innerHTML = '<div class="tl-big"><b>' + esc(r.awb) + '</b><span>Шереметьево-Карго (SVO-2)' + (r.checkOk ? '' : ' · контрольная цифра не сходится — проверьте номер') + '</span></div>' +
          (tabs.length ? tabs.map(function (tb) { return '<div class="tl-scroll"><table class="tl-tbl"><tbody>' + tb.map(function (row, i) { return '<tr>' + row.map(function (c) { return (i ? '<td>' : '<th>') + esc(c) + (i ? '</td>' : '</th>'); }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }).join('') : '<p class="tl-empty">Терминал пока не знает эту накладную.</p>') +
          '<p class="tl-src">Данные Шереметьево-Карго. Если груз прилетает в SVO-1 (Москва Карго), статус смотрите у Москва Карго — у них нет открытого доступа без кабинета.</p>';
      });
      api('/api/tools/container?no=' + encodeURIComponent(v)).then(function (r) {
        busy(btn, false); if (!r.ok) { out.innerHTML = '<p class="tl-err">' + esc(r.error) + '</p>'; return; } remember(r.number);
        var o = r.owner || {}, kind = { line: 'морская линия', leasing: 'лизинговая компания — линия по номеру не определяется', rail: 'железнодорожный оператор' }[o.kind] || 'владелец не найден в нашем справочнике';
        var h = '<div class="tl-big"><b>' + esc(r.number.slice(0, 4) + ' ' + r.number.slice(4, 10) + ' ' + r.number.slice(10)) + '</b><span>' + (r.valid ? ICON.ok + ' номер верный' : ICON.warn + ' контрольная цифра должна быть ' + r.checkDigit + ' — проверьте номер') + '</span></div>';
        h += '<dl class="tl-dl"><dt>Владелец</dt><dd>' + esc(o.name || o.code) + '</dd><dt>Кто это</dt><dd>' + esc(kind) + '</dd></dl>';
        if (r.rail && r.rail.ok && r.rail.rows && r.rail.rows.length) h += '<h3 class="tl-sub">По железной дороге (ТрансКонтейнер)</h3>' + table(r.rail.rows);
        else if (r.rail && r.rail.ok) h += '<p class="tl-note">По ЖД в системе ТрансКонтейнера этого контейнера сейчас нет: он в море, в порту или едет не по их перевозке.</p>';
        else if (r.rail) h += '<p class="tl-note">ЖД-дислокация сейчас недоступна: ' + esc(r.rail.error) + '</p>';
        if (o.url) h += '<div class="tl-acts"><a class="tl-btn" href="' + esc(o.url) + '" target="_blank" rel="noopener">Открыть отслеживание ' + esc(o.name) + ' ↗</a></div><p class="tl-src">Морские линии показывают путь судна только у себя на сайте — откроем нужную страницу, номер уже скопирован.</p>';
        out.innerHTML = h;
        if (o.url && navigator.clipboard) navigator.clipboard.writeText(r.number).catch(function () {});
      });
    });
  }

  /* =================================================================== открытие окон */
  var TOOLS = { fitView: renderFit, volumeView: renderVolume, propisView: renderPropis, phoneView: renderPhone, terminalView: renderTerminal, russiaView: renderRussia, trackView: renderTrack };
  // результат длиннее экрана — прокручивается внутри своей карточки, страница остаётся на месте
  function fitOut(out) {
    if (!out || !out.isConnected) return; out.style.maxHeight = '';
    if (window.innerWidth <= 900 || !out.closest('.view-layer.open')) return;
    var v = out.closest('.view-layer'), z = parseFloat(v.style.zoom) || 1, top = out.getBoundingClientRect().top;
    out.style.maxHeight = Math.max(260, (window.innerHeight - top - 18) / z) + 'px';
  }
  function mount(id) {
    var v = document.getElementById(id), body = v && $('.tl', v); if (!body) return body;
    // инструменты — для сотрудников компании: гостю и клиенту — только приглашение войти
    if (!document.body.classList.contains('role-admin')) { body.dataset.ok = ''; body.innerHTML = head('Инструменты', 'Только для сотрудников', 'Эти инструменты доступны сотрудникам iomastavka после входа.') + '<button type="button" class="tl-go tl-login" data-open-view="loginView">Войти</button>'; return null; }
    if (body.dataset.ok) return body; body.dataset.ok = '1';
    try { TOOLS[id](body); } catch (e) { body.innerHTML = '<p class="tl-err">Не удалось открыть инструмент: ' + esc(e.message) + '</p>'; }
    var out = $('.tl-out', body); if (out) { new MutationObserver(function () { fitOut(out); }).observe(out, { childList: true }); setTimeout(function () { fitOut(out); }, 1300); }
    return body;
  }
  window.addEventListener('resize', function () { clearTimeout(fitOut.t); fitOut.t = setTimeout(function () { $$('.view-layer.open .tl-out').forEach(fitOut); }, 200); });
  function openTool(id, then) { if (window.__v3open) window.__v3open(id); var b = mount(id); if (then && b) setTimeout(function () { then(b); }, 60); }
  window.IOMA_TOOLS = { open: openTool, fitCheck: fitCheck, words: words, amountWords: amountWords };
  function watch() {
    Object.keys(TOOLS).forEach(function (id) {
      var v = document.getElementById(id); if (!v) return;
      if (v.classList.contains('open')) mount(id);
      new MutationObserver(function () { if (v.classList.contains('open')) mount(id); }).observe(v, { attributes: true, attributeFilter: ['class'] });
    });
  }
  // роль становится известна после загрузки (вход сотрудника) — открытое окно инструмента перерисовываем
  var lastRole = '';
  if (typeof MutationObserver === 'function' && document.body) new MutationObserver(function () { var r = document.body.classList.contains('role-admin') ? 'admin' : 'other'; if (r === lastRole) return; lastRole = r; Object.keys(TOOLS).forEach(function (id) { var v = document.getElementById(id); if (v && v.classList.contains('open')) { var b = $('.tl', v); if (b) b.dataset.ok = ''; mount(id); } }); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
