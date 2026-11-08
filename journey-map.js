/* IOMASTAVKA — карта главной: маршрут по шагам и путешествие «от первого лица».
   1) Откуда — город в Китае, Корее, Японии или на Тайване; 2) Куда — город в России; 3) Каким транспортом —
   с рекомендацией (route-advice.js) и честным «нельзя» (из Кореи нет дороги). Потом камера наклоняется,
   и груз «едет» по маршруту: самолёт взлетает, поезд проходит Забайкальск, корабль заходит во Владивосток.
   В конце — весь маршрут, сроки, совет про хаб в Москве и кнопка расчёта. */
(function () {
  'use strict';
  var L6 = ['ru', 'en', 'zh', 'de', 'fr', 'tr'];
  function lang() { var l; try { l = localStorage.getItem('iomastavka_lang'); } catch (e) {} return L6.indexOf(l) >= 0 ? l : 'ru'; }
  function tx(k) { var v = TX[k]; return v ? v[L6.indexOf(lang())] || v[1] || v[0] : k; }
  var TX = {
    s1: ['Откуда', 'From', '起点', 'Von', 'Départ', 'Nereden'], s2: ['Куда', 'To', '终点', 'Nach', 'Arrivée', 'Nereye'], s3: ['Транспорт', 'Transport', '运输方式', 'Transport', 'Transport', 'Taşıma'],
    askFrom: ['Откуда везём? Нажмите город на карте', 'Where from? Tap a city on the map', '从哪里发货？点击地图上的城市', 'Woher? Tippen Sie auf eine Stadt', 'D’où ? Touchez une ville sur la carte', 'Nereden? Haritada bir şehre dokunun'],
    askTo: ['Куда везём? Нажмите город в России', 'Where to? Tap a city in Russia', '运往哪里？点击俄罗斯的城市', 'Wohin? Tippen Sie auf eine Stadt in Russland', 'Vers où ? Touchez une ville en Russie', 'Nereye? Rusya’da bir şehre dokunun'],
    askMode: ['Каким транспортом предпочитаете?', 'Which transport do you prefer?', '您希望选择哪种运输方式？', 'Welches Transportmittel bevorzugen Sie?', 'Quel transport préférez-vous ?', 'Hangi taşımayı tercih edersiniz?'],
    rec: ['Рекомендуем', 'Recommended', '推荐', 'Empfohlen', 'Recommandé', 'Önerilen'], no: ['нельзя', 'not possible', '不可行', 'nicht möglich', 'impossible', 'mümkün değil'],
    skip: ['Пропустить', 'Skip', '跳过', 'Überspringen', 'Passer', 'Geç'], again: ['Новый маршрут', 'New route', '新路线', 'Neue Route', 'Nouvel itinéraire', 'Yeni rota'],
    other: ['Другой транспорт', 'Other transport', '其他运输方式', 'Anderer Transport', 'Autre transport', 'Başka taşıma'], calc: ['Рассчитать ставку', 'Get a rate', '计算运费', 'Preis berechnen', 'Calculer le tarif', 'Fiyat hesapla'],
    days: ['дн.', 'days', '天', 'Tage', 'jours', 'gün'], km: ['км', 'km', '公里', 'km', 'km', 'km'], day: ['день', 'day', '第', 'Tag', 'jour', 'gün'], total: ['всего', 'total', '总计', 'gesamt', 'total', 'toplam'],
    border: ['Граница', 'Border', '口岸', 'Grenze', 'Frontière', 'Sınır'], customs: ['таможня и перегрузка, 1–3 дня', 'customs and transshipment, 1–3 days', '清关和换装，1–3天', 'Zoll und Umladung, 1–3 Tage', 'douane et transbordement, 1–3 jours', 'gümrük ve aktarma, 1–3 gün'],
    port: ['Порт Владивосток: выгрузка и вывоз — до 1–2 недель', 'Port of Vladivostok: unloading and pick-up — up to 1–2 weeks', '符拉迪沃斯托克港：卸货和提货最多1–2周', 'Hafen Wladiwostok: Entladen und Abholung — bis zu 1–2 Wochen', 'Port de Vladivostok : déchargement et enlèvement — jusqu’à 1–2 semaines', 'Vladivostok Limanı: boşaltma ve teslim — 1–2 haftaya kadar'],
    takeoff: ['Взлёт', 'Take-off', '起飞', 'Start', 'Décollage', 'Kalkış'], land: ['Посадка в Москве, Шереметьево', 'Landing in Moscow, Sheremetyevo', '降落莫斯科谢列梅捷沃', 'Landung in Moskau, Scheremetjewo', 'Atterrissage à Moscou, Cheremetievo', 'Moskova Şeremetyevo’ya iniş'],
    truck: ['дальше машиной', 'then by truck', '之后公路运输', 'dann per LKW', 'puis par camion', 'sonra kamyonla'], way: ['Путь', 'Route', '路线', 'Route', 'Itinéraire', 'Güzergâh'],
    time: ['Срок', 'Transit time', '时效', 'Laufzeit', 'Délai', 'Süre'],
    pop: ['Часто везём', 'Popular', '常用', 'Häufig', 'Fréquent', 'Sık'], step: ['Шаг', 'Step', '步骤', 'Schritt', 'Étape', 'Adım']
  };
  var MN = { air: ['Авиа', 'Air', '空运', 'Luftfracht', 'Aérien', 'Hava'], road: ['Авто', 'Truck', '公路', 'LKW', 'Camion', 'Kara yolu'], rail: ['ЖД', 'Rail', '铁路', 'Bahn', 'Rail', 'Demiryolu'], sea: ['Море + ЖД', 'Sea + rail', '海运+铁路', 'See + Bahn', 'Mer + rail', 'Deniz + demiryolu'] };
  function mn(m) { return MN[m][L6.indexOf(lang())] || MN[m][1]; }
  // значки «сверху», нос вверх — так транспорт выглядит на карте, когда камера летит следом
  var TOP = {
    air: '<path d="M24 2.5c1.6 0 2.5 1.7 2.5 4V18l15.5 8.3v4.2l-15.5-4.2v9.3l5 3.9v3.1L24 40.8l-7.5 1.8v-3.1l5-3.9v-9.3L6 30.5v-4.2L21.5 18V6.5c0-2.3.9-4 2.5-4z"/>',
    road: '<rect x="15.5" y="3" width="17" height="10" rx="3.5"/><rect x="13.5" y="15" width="21" height="30" rx="2.5"/><path d="M17 21h14M17 27h14M17 33h14M17 39h14" class="jm-v-line"/>',
    rail: '<rect x="16.5" y="1.5" width="15" height="14" rx="6"/><rect x="16.5" y="17.5" width="15" height="13" rx="2"/><rect x="16.5" y="32.5" width="15" height="13" rx="2"/>',
    sea: '<path d="M24 1.5c6.5 6.3 9.5 13.5 9.5 22.5v17.5c0 2.4-2 4.5-4.5 4.5h-10c-2.5 0-4.5-2.1-4.5-4.5V24c0-9 3-16.2 9.5-22.5z"/><path d="M19 20h10v6H19zM19 28h10v6H19zM19 36h10v5H19z" class="jm-v-line"/>'
  };
  var SIDE = { // значки для кнопок выбора
    air: '<path d="M21 12.6l-7.2-3V5a1.8 1.8 0 00-3.6 0v4.6L3 12.6v2l7.2-1.8v4l-2.1 1.5V20l3.9-1 3.9 1v-1.7l-2.1-1.5v-4l7.2 1.8z"/>',
    road: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7"/><circle cx="6.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    rail: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9.5 20l-1.5-4M14.5 20l1.5-4"/><circle cx="9.5" cy="13" r=".7"/><circle cx="14.5" cy="13" r=".7"/>',
    sea: '<path d="M3 15.5l1.8 3.5h14.4l1.8-3.5zM6 15.5V10h12v5.5M9 10V6.5h6V10M12 3.5v3"/>'
  };
  var POP_FROM = ['yw', 'gz', 'sz', 'sh', 'bj', 'pus'], POP_TO = ['msk', 'spb', 'ekb', 'nsk', 'kzn', 'vvo'];
  var ADV2MAP = { auto: 'road', rail: 'rail', sea: 'sea', sea_only: 'sea', sea_direct: 'sea', air: 'air' };
  var DEFS = '<defs><linearGradient id="rmG" x1="1" y1="0" x2="0" y2="0"><stop offset="0" style="stop-color:var(--ui-o1,#F28A3A)"/><stop offset="1" style="stop-color:var(--ui-o2,#E06A2C)"/></linearGradient></defs>';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mount(el, opts) {
    opts = opts || {};
    var R = window.IOMA_RMAP, G = R.geo, VB = G.VB, NS = 'http://www.w3.org/2000/svg';
    var st = { step: 1, from: null, to: null, mode: null, anim: 0 };
    el.classList.add('rmap', 'jm');
    el.innerHTML = '<div class="jm-top"><ol class="jm-steps"></ol><button type="button" class="jm-reset" hidden></button></div>' +
      '<div class="jm-stage"><div class="jm-cam"><svg class="rmap-svg jm-svg" viewBox="' + VB.join(' ') + '" preserveAspectRatio="xMidYMid slice" role="img"></svg></div>' +
      '<div class="jm-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="jm-veh" aria-hidden="true"></div><div class="jm-hud" aria-live="polite"></div><div class="jm-toast" aria-live="polite"></div><button type="button" class="jm-skip" hidden></button></div>' +
      '<div class="jm-panel" aria-live="polite"></div>';
    var stage = el.querySelector('.jm-stage'), cam = el.querySelector('.jm-cam'), svg = el.querySelector('svg'), veh = el.querySelector('.jm-veh'), hud = el.querySelector('.jm-hud'), toast = el.querySelector('.jm-toast'),
      skip = el.querySelector('.jm-skip'), panel = el.querySelector('.jm-panel'), steps = el.querySelector('.jm-steps'), reset = el.querySelector('.jm-reset');
    function nm(k) { var l = lang(); return R.name(k, l === 'ru' || l === 'zh' ? l : 'en'); }
    function f(n) { return (+n).toFixed(1); }
    function unit() { var r = svg.getBoundingClientRect(); return r.width ? Math.max(VB[2] / r.width, VB[3] / r.height) : 1.2; }

    function drawSteps() {
      steps.innerHTML = [['s1', st.from], ['s2', st.to], ['s3', st.mode]].map(function (s, i) {
        var n = i + 1, val = s[1] ? (i < 2 ? nm(s[1]) : mn(s[1])) : '';
        return '<li class="' + (st.step === n ? 'cur' : st.step > n ? 'done' : '') + '"><button type="button" data-go="' + n + '"' + (st.step > n && !st.anim ? '' : ' disabled') + '><i>' + (st.step > n ? '✓' : n) + '</i><span><small>' + tx(s[0]) + '</small>' + (val ? '<b>' + val + '</b>' : '') + '</span></button></li>';
      }).join('');
      reset.hidden = st.step === 1; reset.textContent = tx('again'); skip.textContent = tx('skip');
    }
    // точки городов: зона нажатия не больше половины расстояния до соседа
    var near = {};
    function nearDist(k, all) { if (near[k] != null) return near[k]; var p = G.xy(k), m = Infinity; all.forEach(function (o) { if (o === k) return; var q = G.xy(o), d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < m) m = d; }); return (near[k] = m); }
    function dots(list, side, active) {
      var U = unit(), all = G.dots.cn.concat(G.dots.ru);
      return list.map(function (k) {
        var p = G.xy(k), on = k === st.from || k === st.to, r = Math.max(3.4 * U, Math.min(10 * U, nearDist(k, all) / 2));
        return '<g class="rm-pt jm-pt rm-' + side + (on ? ' on' : '') + (active ? ' act' : '') + '" data-' + side + '="' + k + '"' + (active ? ' tabindex="0" role="button" aria-label="' + nm(k) + '"' : '') + '><circle class="rm-hit" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(r) + '"/><circle class="rm-c" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f((on ? 5 : active ? 3.2 : 2.2) * U) + '"/>' + (on ? '<text class="rm-l" x="' + f(p[0] + 7 * U) + '" y="' + f(p[1] + 4 * U) + '" style="font-size:' + f(14 * U) + 'px">' + nm(k) + '</text>' : '') + '</g>';
      }).join('');
    }
    function route() { return st.from && st.to && st.mode ? R.routeTo(st.from, st.to, st.mode) : null; }
    function pathD(r) { return r.mode === 'air' ? G.arc(r.path[0], r.path[r.path.length - 1]) : G.smooth(r.path); }
    function advice() {
      var A = window.IOMA_ADVICE; if (!A || !st.from || !st.to) return null;
      var a = A.advise({ from: R.name(st.from, 'ru'), to: R.name(st.to, 'ru'), fromLL: G.ll(st.from), toLL: G.ll(st.to), lang: lang() === 'ru' ? 'ru' : 'en' });
      return a && a.ok ? a : null;
    }

    // ---------- шаги 1–3: плоская карта
    function drawFlat() {
      stopAnim(); stage.classList.remove('jm-fly', 'jm-air', 'jm-sea', 'jm-road', 'jm-rail'); cam.classList.remove('jm-tilt'); veh.innerHTML = ''; hud.innerHTML = ''; toast.className = 'jm-toast'; skip.hidden = true;
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      var U = unit(), h = DEFS + '<g class="jm-world">' + G.land(), r = st.step >= 5 ? route() : null; el.style.setProperty('--u', U.toFixed(3));
      if (st.from && st.to && st.step < 5) { var a = G.xy(st.from), b = G.xy(st.to); h += '<path class="jm-guide" d="M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]) + '"/>'; }
      if (r) {
        h += '<path class="rm-track" d="' + pathD(r) + '"/><path class="rm-route jm-done' + (r.mode === 'sea' ? ' rm-sea' : r.mode === 'air' ? ' rm-air' : '') + '" d="' + pathD(r) + '" pathLength="1"/>';
        if (r.gw && r.mode !== 'air') { var gk = (G.gwNames[r.gw] || [])[0], gp = gk && G.xy(gk); if (gp) h += '<rect class="rm-gw" x="' + f(gp[0] - 4 * U) + '" y="' + f(gp[1] - 4 * U) + '" width="' + f(8 * U) + '" height="' + f(8 * U) + '" transform="rotate(45 ' + f(gp[0]) + ' ' + f(gp[1]) + ')"/>'; }
      }
      h += dots(G.dots.ru.filter(function (k) { return k !== st.to; }), 'to', st.step === 2) + dots(G.dots.cn.filter(function (k) { return k !== st.from; }), 'from', st.step === 1);
      if (st.to) h += dots([st.to], 'to', st.step === 2); if (st.from) h += dots([st.from], 'from', st.step === 1);
      svg.innerHTML = h + '</g>'; stage.dataset.step = st.step;
      drawSteps(); drawPanel();
    }
    function chips(list, side) { return '<div class="jm-chips"><small>' + tx('pop') + '</small>' + list.map(function (k) { return '<button type="button" data-' + side + '="' + k + '">' + nm(k) + '</button>'; }).join('') + '</div>'; }
    function drawPanel() {
      var h = '';
      if (st.step === 1) h = '<p class="jm-ask">' + tx('askFrom') + '</p>' + chips(POP_FROM, 'from');
      else if (st.step === 2) h = '<p class="jm-ask">' + tx('askTo') + '</p>' + chips(POP_TO, 'to');
      else if (st.step === 3) {
        var a = advice(), best = a && ADV2MAP[a.best], dd = {}, nope = {};
        if (a) { a.options.forEach(function (o) { var m = ADV2MAP[o.mode]; if (!dd[m]) dd[m] = o.days; }); a.impossible.forEach(function (n) { nope[ADV2MAP[n.mode]] = n.why; }); }
        h = '<p class="jm-ask">' + tx('askMode') + '</p><div class="jm-modes">' + ['air', 'road', 'rail', 'sea'].map(function (m) {
          var no = nope[m];
          return '<button type="button" class="jm-m' + (m === best ? ' best' : '') + '" data-jm="' + m + '"' + (no ? ' disabled title="' + no + '"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + SIDE[m] + '</svg><b>' + mn(m) + '</b><small>' + (no ? tx('no') : dd[m] ? dd[m][0] + '–' + dd[m][1] + ' ' + tx('days') : '') + '</small>' + (m === best ? '<em>' + tx('rec') + '</em>' : '') + '</button>';
        }).join('') + '</div>' + (a && a.impossible.length ? '<p class="jm-note">' + a.impossible[0].why + '</p>' : a && a.hub && a.hub.via === 'msk' ? '<p class="jm-note">' + a.hub.text + '</p>' : '');
      } else if (st.step === 5) h = summary();
      panel.innerHTML = h;
    }
    function summary() {
      var r = route(), a = advice(); if (!r) return '';
      var o = a && a.options.filter(function (x) { return ADV2MAP[x.mode] === st.mode; })[0], loc = lang() === 'ru' ? 'ru-RU' : 'en-US';
      var gw = r.gw && r.mode !== 'air' ? R.gwNames(r.gw, lang() === 'ru' ? 'ru' : 'en').join(' — ') : '';
      var hubs = r.mode === 'air' ? '' : r.path.filter(function (k) { return R.cities[k]; }).map(nm).join(' — ');
      return '<div class="jm-sum"><div class="jm-od"><b>' + nm(st.from) + ' <i>→</i> ' + nm(st.to) + '</b><small>' + mn(st.mode) + (gw ? ' · ' + gw : '') + '</small></div>' +
        '<div class="jm-facts"><span><small>' + tx('total') + '</small><b>≈ ' + r.km.toLocaleString(loc) + ' ' + tx('km') + '</b></span>' + (o ? '<span><small>' + tx('time') + '</small><b>' + o.days[0] + '–' + o.days[1] + ' ' + tx('days') + '</b></span>' : '') + '</div>' +
        '<div class="jm-acts"><button type="button" class="jm-calc">' + tx('calc') + '</button><button type="button" class="jm-alt" data-go="3">' + tx('other') + '</button></div>' +
        (a && a.hub ? '<p class="jm-note' + (a.hub.via === 'msk' ? ' jm-hub' : '') + '">' + a.hub.text + '</p>' : '') + (hubs ? '<p class="jm-path" title="' + hubs + '">' + tx('way') + ': ' + hubs + '</p>' : '') + '</div>';
    }

    // ---------- шаг 4: путешествие от первого лица
    function stopAnim() { if (st.anim) cancelAnimationFrame(st.anim); st.anim = 0; }
    function fly() {
      var r = route(); if (!r) return;
      st.step = 4; drawSteps(); panel.innerHTML = ''; svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      var d = pathD(r), U = unit();
      var lbl = [st.from, st.to]; if (r.gw && r.mode !== 'air') lbl.push((G.gwNames[r.gw] || [])[0]); if (r.mode === 'sea') lbl.push('vvo');
      r.path.forEach(function (k) { if (R.cities[k] && lbl.indexOf(k) < 0 && lbl.length < 9 && G.dots.ru.concat(G.dots.cn).indexOf(k) >= 0) lbl.push(k); });
      var h = DEFS + '<g class="jm-world">' + G.land() + '<path class="rm-track jm-track" d="' + d + '"/><path class="jm-trail' + (r.mode === 'sea' ? ' sea' : r.mode === 'air' ? ' air' : '') + '" d="' + d + '"/>' +
        lbl.filter(Boolean).map(function (k) { var p = G.xy(k); return '<g class="jm-lbl" data-x="' + p[0] + '" data-y="' + p[1] + '"><circle r="3.2"/><text x="7" y="4">' + nm(k) + '</text></g>'; }).join('') + '</g>';
      svg.innerHTML = h;
      var world = svg.querySelector('.jm-world'), path = svg.querySelector('.jm-trail'), L = path.getTotalLength(), marks = [].slice.call(svg.querySelectorAll('.jm-lbl'));
      path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      // где на пути граница и порт
      function at(k) { if (!k) return -1; var q = G.xy(k), best = 0, bd = Infinity; for (var i = 0; i <= 160; i++) { var p = path.getPointAtLength(L * i / 160), dd = Math.hypot(p.x - q[0], p.y - q[1]); if (dd < bd) { bd = dd; best = i / 160; } } return best; }
      var ev = [];
      if (r.mode === 'air') ev.push({ t: 0.02, text: tx('takeoff') + ' · ' + nm(st.from) }, { t: 0.9, text: tx('land') + (st.to !== 'msk' ? ', ' + tx('truck') : '') });
      else {
        if (r.gw) { var gn = R.gwNames(r.gw, lang() === 'ru' ? 'ru' : 'en').join(' — '); ev.push({ t: at((G.gwNames[r.gw] || [])[0]), text: tx('border') + ': ' + gn + ' · ' + tx('customs') }); }
        if (r.mode === 'sea') ev.push({ t: at('vvo'), text: tx('port') });
      }
      ev.forEach(function (e) { e.shown = false; });
      var a = advice(), o = a && a.options.filter(function (x) { return ADV2MAP[x.mode] === st.mode; })[0], days = o ? o.days : [10, 20];
      stage.classList.add('jm-fly', 'jm-' + r.mode); veh.innerHTML = '<svg viewBox="0 0 48 48">' + TOP[r.mode] + '</svg>';
      skip.hidden = false;
      var VW = VB[2], VH = VB[3], cx = VB[0] + VW / 2, cy = VB[1] + VH * 0.66, zMax = r.mode === 'air' ? 2.3 : 3.2;
      var dur = reduce ? 1 : Math.min(13000, Math.max(8000, r.km * 0.85)), t0 = 0, rot = 0, firstRot = null, loc = lang() === 'ru' ? 'ru-RU' : 'en-US';
      requestAnimationFrame(function () { cam.classList.add('jm-tilt'); });
      function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
      function frame(ts) {
        if (!t0) t0 = ts; var t = Math.min(1, (ts - t0) / dur), s = L * ease(t);
        var p = path.getPointAtLength(s), q = path.getPointAtLength(Math.min(L, s + L * 0.015)), back = path.getPointAtLength(Math.max(0, s - L * 0.015));
        var head = Math.atan2(q.y - back.y, q.x - back.x) * 180 / Math.PI, want = -90 - head;
        if (firstRot === null) { firstRot = want; rot = want; }
        var dr = ((want - rot + 540) % 360) - 180; rot += dr * 0.06;
        var z = 1 + (zMax - 1) * Math.min(1, t / 0.12, (1 - t) / 0.1 + 0.25);
        world.setAttribute('transform', 'translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + rot.toFixed(2) + ') scale(' + z.toFixed(3) + ') translate(' + f(-p.x) + ' ' + f(-p.y) + ')');
        path.style.strokeDashoffset = L - s;
        marks.forEach(function (m) { m.setAttribute('transform', 'translate(' + m.dataset.x + ' ' + m.dataset.y + ') rotate(' + (-rot).toFixed(2) + ') scale(' + (U * 1.15 / z).toFixed(3) + ')'); });
        var km = Math.round(r.km * s / L / 10) * 10, day = Math.max(1, Math.round((days[0] + days[1]) / 2 * s / L));
        hud.innerHTML = '<span class="jm-hm"><svg viewBox="0 0 24 24">' + SIDE[r.mode] + '</svg>' + mn(r.mode) + '</span><b>' + nm(st.from) + ' → ' + nm(st.to) + '</b><span class="jm-hk">' + km.toLocaleString(loc) + ' / ' + r.km.toLocaleString(loc) + ' ' + tx('km') + ' · ' + tx('day') + ' ' + day + '</span><i style="--p:' + (s / L).toFixed(3) + '"></i>';
        ev.forEach(function (e) { if (!e.shown && e.t >= 0 && t >= e.t) { e.shown = true; toast.textContent = e.text; toast.className = 'jm-toast on'; clearTimeout(toast._t); toast._t = setTimeout(function () { toast.className = 'jm-toast'; }, 2600); } });
        if (t < 1) st.anim = requestAnimationFrame(frame); else finish();
      }
      st.anim = requestAnimationFrame(frame);
    }
    function finish() { stopAnim(); st.step = 5; cam.classList.remove('jm-tilt'); setTimeout(drawFlat, reduce ? 0 : 450); }

    // ---------- управление
    function setFrom(k) { if (!R.cities[k]) return; st.from = k; st.step = st.to ? 3 : 2; st.mode = null; drawFlat(); }
    function setTo(k) { if (!R.cities[k]) return; st.to = k; st.step = st.from ? 3 : 1; st.mode = null; drawFlat(); }
    function setMode(m) { if (!MN[m]) return; st.mode = m; if (opts.onMode) opts.onMode(m); fly(); }
    el.addEventListener('click', function (e) {
      var t = e.target;
      var p = t.closest('[data-from]'); if (p && (st.step === 1 || p.tagName === 'BUTTON')) return setFrom(p.dataset.from);
      var q = t.closest('[data-to]'); if (q && (st.step === 2 || q.tagName === 'BUTTON')) return setTo(q.dataset.to);
      var m = t.closest('[data-jm]'); if (m && !m.disabled) return setMode(m.dataset.jm);
      var g = t.closest('[data-go]'); if (g && !g.disabled) { var n = +g.dataset.go; stopAnim(); st.step = n; if (n <= 2) { st.mode = null; if (n === 1) { st.from = null; } else st.to = null; } if (n === 3) st.mode = null; return drawFlat(); }
      if (t.closest('.jm-skip')) return finish();
      if (t.closest('.jm-reset')) { st = { step: 1, from: null, to: null, mode: null, anim: 0 }; return drawFlat(); }
      if (t.closest('.jm-calc') && opts.onPick) opts.onPick(st.from, st.mode, R.name(st.from, 'ru'), st.to, R.name(st.to, 'ru'));
    });
    el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.jm-pt.act')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
    // наведение: подпись города
    svg.addEventListener('mouseover', function (e) { var g = e.target.closest && e.target.closest('.jm-pt.act'); if (!g) return; var k = g.dataset.from || g.dataset.to; var c = g.querySelector('.rm-c'); if (!c || g.querySelector('text')) return; var U = unit(); var tt = document.createElementNS(NS, 'text'); tt.setAttribute('class', 'rm-l jm-hov'); tt.setAttribute('x', +c.getAttribute('cx') + 7 * U); tt.setAttribute('y', +c.getAttribute('cy') + 4 * U); tt.style.fontSize = (13 * U) + 'px'; tt.textContent = nm(k); g.appendChild(tt); });
    svg.addEventListener('mouseout', function (e) { var g = e.target.closest && e.target.closest('.jm-pt.act'); if (!g) return; var tt = g.querySelector('.jm-hov'); if (tt && !g.contains(e.relatedTarget)) tt.remove(); });
    new MutationObserver(function () { if (st.step !== 4) drawFlat(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { near = {}; if (st.step !== 4) drawFlat(); }, 150); });
    requestAnimationFrame(drawFlat);
    return { state: st, setFrom: setFrom, setTo: setTo, setMode: setMode, stopAuto: function () {} };
  }
  window.IOMA_JMAP = { mount: mount };
})();
