/* IOMASTAVKA — помощник расчёта.
   1) Подсказки городов: все города Китая, Кореи, Индии и России; в «Откуда» первым идёт Китай, в «Куда» — Россия.
   2) Габариты — сразу под весом; объём считается сам и не редактируется.
   3) Подсказка вида транспорта по весу, объёму и опасности груза.
   4) Проверка маршрута: что невозможно или рискованно по странам и видам транспорта. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  if (typeof cities === 'undefined') return;

  /* ---------- 1. города ---------- */
  var ORDER = { from: { cn: 0, kr: 1, in: 2, ru: 3 }, to: { ru: 0, cn: 1, kr: 2, in: 3 } };
  var norm = function (s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[\s\-–—().,]+/g, ''); };
  function rank(c, side) { var o = ORDER[side][String(c[5] || '').toLowerCase()]; return o == null ? 9 : o; }
  function matches(q, target) {
    var side = /^(asia|china)$/i.test(String(target || '')) ? 'from' : 'to', x = norm(q);
    var list = cities.filter(function (c) { return c && c[0] && ORDER[side][String(c[5] || '').toLowerCase()] != null; });
    if (!x) return list.slice().sort(function (a, b) { return rank(a, side) - rank(b, side) || a[0].localeCompare(b[0], 'ru'); });
    return list.map(function (c) {
      var s = 99; [c[0], c[1], c[2]].forEach(function (f, i) { var n = norm(f); if (!n) return; if (n === x) s = Math.min(s, 0); else if (n.indexOf(x) === 0) s = Math.min(s, 1 + i * .1); else if (n.indexOf(x) > 0) s = Math.min(s, 3 + i * .1); });
      return { c: c, s: s };
    }).filter(function (o) { return o.s < 99; }).sort(function (a, b) { return a.s - b.s || rank(a.c, side) - rank(b.c, side) || a.c[0].localeCompare(b.c[0], 'ru'); }).slice(0, 40).map(function (o) { return o.c; });
  }
  window.cityMatches = matches;
  [['fromCity', 'fromSuggestions', 'asia'], ['toCity', 'toSuggestions', 'russia']].forEach(function (t) {
    var inp = document.getElementById(t[0]), box = document.getElementById(t[1]);
    if (!inp || !box || typeof renderSuggestions !== 'function') return;
    inp.addEventListener('focus', function () { if (!inp.value.trim()) renderSuggestions(box, matches('', t[2]), inp, t[2]); });
    // выбор города закрывает список
    box.addEventListener('click', function (e) { if (e.target.closest('button')) setTimeout(function () { box.classList.remove('open', 'show', 'visible'); box.innerHTML = ''; check(); }, 0); });
  });
  document.addEventListener('click', function (e) {
    $$('#fromSuggestions,#toSuggestions').forEach(function (b) { if (!b.contains(e.target) && e.target !== b.previousElementSibling) b.classList.remove('open', 'show', 'visible'); });
  });

  /* ---------- 2. габариты под весом ---------- */
  function moveDims() {
    var params = $('.v3c-params'), dims = $('.v3c-morecard .dimensions'), strip = $('.v3c-morecard .auto-calc-strip'), two = $('.v3c-params .v3c-two');
    if (!params || !dims || !two || params.querySelector('.dimensions')) return;
    var wrap = document.createElement('div'); wrap.className = 'ca-dims';
    wrap.innerHTML = '<div class="ca-dims-h"><b>Габариты одного места</b><small>Объём посчитается сам</small></div>';
    wrap.appendChild(dims); if (strip) { strip.classList.add('ca-strip'); wrap.appendChild(strip); }
    two.insertAdjacentElement('afterend', wrap);
    $$('#length,#width,#height').forEach(function (i) { i.setAttribute('inputmode', 'decimal'); });
  }

  /* ---------- 3–4. подсказка транспорта и проверка маршрута ---------- */
  function cityOf(id) {
    var v = norm((document.getElementById(id) || {}).value); if (!v) return null;
    for (var i = 0; i < cities.length; i++) { var c = cities[i]; if (norm(c[0]) === v || norm(c[1]) === v || norm(c[2]) === v) return c; }
    return null;
  }
  var BLACK_SEA = /геленджик|новороссийск|анапа|сочи|туапсе|краснодар|севастопол|симферопол|керч|ейск|темрюк|тамань|ростов|таганрог|азов/;
  function num(id) { var v = Number(String((document.getElementById(id) || {}).value || '').replace(',', '.')); return isFinite(v) ? v : 0; }
  function volume() { var t = ($('#autoVolume') || {}).textContent || ''; var v = parseFloat(t.replace(',', '.')); return isFinite(v) ? v : 0; }
  function dangerous() { var b = $('#v3dg'); return !!b && (b.getAttribute('aria-pressed') === 'true' || b.classList.contains('on')); }

  function rules(from, to) {
    var out = { no: {}, warn: [] }, fc = from && String(from[5] || '').toLowerCase(), tc = to && String(to[5] || '').toLowerCase(), tn = to ? norm(to[0]) : '';
    if (fc === 'kr' && tc === 'ru') {
      out.no.auto = out.no.rail = 'Из Южной Кореи в Россию нет сухопутного пути: дорога шла бы через КНДР, граница закрыта. Везём морем до Владивостока, дальше ЖД или авто.';
    }
    if (fc === 'in' && tc === 'ru') {
      out.no.auto = out.no.rail = 'Прямого сухопутного пути из Индии в Россию нет. Наземная часть возможна только по коридору «Север — Юг»: морем до Ирана (Бандар-Аббас), дальше ЖД или авто через Иран и Азербайджан либо по Каспию.';
      out.warn.push('Из Индии чаще всего морем: через Суэц в Санкт-Петербург или через Малаккский пролив во Владивосток, либо коридор «Север — Юг» через Иран.');
    }
    if (tc === 'ru' && BLACK_SEA.test(tn)) out.warn.push('Порты Чёрного и Азовского морей сейчас высокого риска. Надёжнее морем до Владивостока, а оттуда ЖД или авто.');
    if (tc === 'ru' && /калининград/.test(tn)) { out.no.auto = 'Автотранзит в Калининград через Литву и Польшу для большинства товаров закрыт. Везём морем из Санкт-Петербурга или Усть-Луги.'; }
    if (fc === 'ru' && tc === 'ru') out.warn.push('Оба города в России — это перевозка по РФ. Посчитаем в «Доставке по России».');
    return out;
  }
  function advise(w, v, dg) {
    if (!(w > 0) && !(v > 0)) return null;
    var dens = v > 0 ? w / v : 0;
    if (dg) {
      if (w <= 300 && v <= 1.5) return { mode: 'air', text: 'Опасный груз небольшого объёма обычно везут авиа. Сборным грузом опасный не берут — только авиа или машина и контейнер целиком.' };
      return { mode: 'rail', text: 'Опасный груз сборным не возят. Для такого объёма — контейнер целиком по ЖД или машина целиком. Менеджер подтвердит класс опасности и перевозчика.' };
    }
    if (w > 0 && w <= 100 && (!v || v <= .5)) return { mode: 'air', text: 'Лёгкий и небольшой груз выгоднее и быстрее авиа.' };
    if (v >= 20 || w >= 10000) return { mode: 'rail', text: 'Большой объём — выгоднее машина или контейнер целиком. Посчитаем оба варианта.' };
    if (v > 0 && dens < 120) return { mode: 'auto', text: 'Груз лёгкий, но объёмный: дешевле наземным сборным грузом, авиа выйдет дорого из‑за объёмного веса.' };
    return { mode: 'auto', text: 'Для такого груза оптимален сборный груз: авто быстрее, ЖД дешевле.' };
  }
  var NAMES = { auto: 'Авто', rail: 'ЖД', sea: 'Море', air: 'Авиа' };
  function check() {
    var box = $('#caAdvice'); if (!box) return;
    var from = cityOf('fromCity'), to = cityOf('toCity'), r = rules(from, to), a = advise(num('weight'), volume(), dangerous()), h = '';
    $$('.v3c-chips .chip').forEach(function (c) {
      var m = c.dataset.m, why = r.no[m] || (dangerous() && false);
      c.classList.toggle('ca-no', !!why); c.classList.toggle('ca-rec', !!a && a.mode === m && !why);
      if (why) c.title = why; else c.removeAttribute('title');
    });
    var on = $('.v3c-chips .chip.on'); if (on && r.no[on.dataset.m]) h += '<p class="ca-stop">' + r.no[on.dataset.m] + '</p>';
    r.warn.forEach(function (t) { h += '<p class="ca-warn">' + t + '</p>'; });
    if (a && !r.no[a.mode]) h += '<p class="ca-tip"><b>Советуем: ' + NAMES[a.mode] + '.</b> ' + a.text + '</p>';
    else if (a && r.no[a.mode]) h += '<p class="ca-tip"><b>Советуем: Море.</b> ' + a.text.split('.')[0] + ', но по этому направлению только через порт.</p>';
    box.innerHTML = h; box.hidden = !h;
  }
  function init() {
    moveDims();
    var chips = $('.v3c-chips');
    if (chips && !$('#caAdvice')) { var d = document.createElement('div'); d.id = 'caAdvice'; d.className = 'ca-advice'; d.hidden = true; chips.insertAdjacentElement('afterend', d); }
    ['fromCity', 'toCity', 'weight', 'pieces', 'length', 'width', 'height'].forEach(function (id) { var el = document.getElementById(id); if (el) { el.addEventListener('input', check); el.addEventListener('change', check); } });
    var dg = $('#v3dg'); if (dg) dg.addEventListener('click', function () { setTimeout(check, 30); });
    if (chips) chips.addEventListener('click', function () { setTimeout(check, 30); });
    var av = $('#autoVolume'); if (av) new MutationObserver(check).observe(av, { childList: true, characterData: true, subtree: true });
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.iomaCalcCheck = function () { try { check(); } catch (e) {} };
})();
