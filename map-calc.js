/* IOMASTAVKA — карта-калькулятор на главной.
   Настоящая карта (Natural Earth, коническая проекция Альберса): Китай, Корея, Казахстан, Монголия, Россия.
   При наведении карта оживает, колесом или щипком — масштаб, перетаскиванием — сдвиг.
   Клик по городу в Китае/Корее — «откуда», по городу в России/Казахстане — «куда»;
   вес — и цены по всем подходящим видам транспорта появляются прямо в карточке. */
(function () {
  'use strict';
  var G = window.IOMA_GEO, host = document.getElementById('v3Hero');
  if (!G || !host || !document.getElementById('mcStage')) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lang() { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } }
  var LI = { ru: 0, en: 1, zh: 2, tr: 3 };
  function T(a) { return a[LI[lang()]] || a[0]; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- города и порты: [id, RU, EN, ZH, TR, долгота, широта, страна, уровень, вид]
     уровень 1 — видно сразу, 2 — при небольшом приближении, 3 — при сильном; вид: c — город, p — порт, x — погранпереход */
  var RAW = [
    ['sha', 'Шанхай', 'Shanghai', '上海', 'Şanghay', 121.47, 31.23, 'CN', 1, 'p'], ['nb', 'Нинбо', 'Ningbo', '宁波', 'Ningbo', 121.55, 29.87, 'CN', 2, 'p'],
    ['yiwu', 'Иу', 'Yiwu', '义乌', 'Yiwu', 120.07, 29.31, 'CN', 1, 'c'], ['hz', 'Ханчжоу', 'Hangzhou', '杭州', 'Hangzhou', 120.15, 30.27, 'CN', 3, 'c'],
    ['suz', 'Сучжоу', 'Suzhou', '苏州', 'Suzhou', 120.62, 31.3, 'CN', 3, 'c'], ['nj', 'Нанкин', 'Nanjing', '南京', 'Nanjing', 118.8, 32.06, 'CN', 3, 'c'],
    ['can', 'Гуанчжоу', 'Guangzhou', '广州', 'Guangzhou', 113.26, 23.13, 'CN', 1, 'p'], ['szx', 'Шэньчжэнь', 'Shenzhen', '深圳', 'Shenzhen', 114.06, 22.54, 'CN', 2, 'p'],
    ['fos', 'Фошань', 'Foshan', '佛山', 'Foshan', 113.12, 23.02, 'CN', 3, 'c'], ['dg', 'Дунгуань', 'Dongguan', '东莞', 'Dongguan', 113.75, 23.02, 'CN', 3, 'c'],
    ['hk', 'Гонконг', 'Hong Kong', '香港', 'Hong Kong', 114.17, 22.32, 'CN', 3, 'p'], ['xmn', 'Сямэнь', 'Xiamen', '厦门', 'Xiamen', 118.09, 24.48, 'CN', 2, 'p'],
    ['fz', 'Фучжоу', 'Fuzhou', '福州', 'Fuzhou', 119.3, 26.08, 'CN', 3, 'p'], ['qd', 'Циндао', 'Qingdao', '青岛', 'Qingdao', 120.38, 36.07, 'CN', 1, 'p'],
    ['tj', 'Тяньцзинь', 'Tianjin', '天津', 'Tianjin', 117.2, 39.08, 'CN', 2, 'p'], ['bj', 'Пекин', 'Beijing', '北京', 'Pekin', 116.4, 39.9, 'CN', 1, 'c'],
    ['dl', 'Далянь', 'Dalian', '大连', 'Dalian', 121.61, 38.91, 'CN', 2, 'p'], ['sy', 'Шэньян', 'Shenyang', '沈阳', 'Shenyang', 123.43, 41.8, 'CN', 3, 'c'],
    ['hrb', 'Харбин', 'Harbin', '哈尔滨', 'Harbin', 126.63, 45.75, 'CN', 2, 'c'], ['xian', 'Сиань', "Xi'an", '西安', 'Şian', 108.94, 34.34, 'CN', 2, 'c'],
    ['cd', 'Чэнду', 'Chengdu', '成都', 'Chengdu', 104.07, 30.67, 'CN', 2, 'c'], ['cq', 'Чунцин', 'Chongqing', '重庆', 'Chongqing', 106.55, 29.56, 'CN', 3, 'c'],
    ['wuh', 'Ухань', 'Wuhan', '武汉', 'Wuhan', 114.3, 30.59, 'CN', 2, 'c'], ['zz', 'Чжэнчжоу', 'Zhengzhou', '郑州', 'Zhengzhou', 113.62, 34.75, 'CN', 3, 'c'],
    ['urc', 'Урумчи', 'Urumqi', '乌鲁木齐', 'Urumçi', 87.62, 43.83, 'CN', 2, 'c'],
    ['sel', 'Сеул', 'Seoul', '首尔', 'Seul', 126.98, 37.57, 'KR', 1, 'c'], ['pus', 'Пусан', 'Busan', '釜山', 'Busan', 129.04, 35.18, 'KR', 1, 'p'],
    ['icn', 'Инчхон', 'Incheon', '仁川', 'Incheon', 126.63, 37.46, 'KR', 3, 'p'],
    ['zab', 'Забайкальск', 'Zabaikalsk', '后贝加尔斯克', 'Zabaykalsk', 117.33, 49.65, 'RU', 1, 'x'],
    ['erl', 'Эрлянь — Замын-Ууд', 'Erenhot — Zamyn-Uud', '二连浩特—扎门乌德', 'Erenhot — Zamın-Üüd', 111.98, 43.65, '', 2, 'x'],
    ['khg', 'Хоргос — Алтынколь', 'Khorgos — Altynkol', '霍尔果斯—阿腾科里', 'Horgos — Altınköl', 80.42, 44.21, '', 2, 'x'],
    ['dst', 'Достык — Алашанькоу', 'Dostyk — Alashankou', '多斯特克—阿拉山口', 'Dostık — Alaşankou', 82.48, 45.25, '', 3, 'x'],
    ['sfh', 'Суйфэньхэ — Пограничный', 'Suifenhe — Pogranichny', '绥芬河—波格拉尼奇内', 'Suifenhe — Pograniçnıy', 131.15, 44.4, '', 3, 'x'],
    ['msk', 'Москва', 'Moscow', '莫斯科', 'Moskova', 37.62, 55.75, 'RU', 1, 'c'], ['spb', 'Санкт-Петербург', 'St. Petersburg', '圣彼得堡', 'St. Petersburg', 30.32, 59.94, 'RU', 1, 'p'],
    ['nnov', 'Нижний Новгород', 'Nizhny Novgorod', '下诺夫哥罗德', 'Nijniy Novgorod', 44.0, 56.33, 'RU', 3, 'c'], ['kzn', 'Казань', 'Kazan', '喀山', 'Kazan', 49.1, 55.79, 'RU', 2, 'c'],
    ['sam', 'Самара', 'Samara', '萨马拉', 'Samara', 50.1, 53.2, 'RU', 3, 'c'], ['ufa', 'Уфа', 'Ufa', '乌法', 'Ufa', 55.96, 54.74, 'RU', 3, 'c'],
    ['perm', 'Пермь', 'Perm', '彼尔姆', 'Perm', 56.25, 58.0, 'RU', 3, 'c'], ['ekb', 'Екатеринбург', 'Yekaterinburg', '叶卡捷琳堡', 'Yekaterinburg', 60.6, 56.84, 'RU', 1, 'c'],
    ['chel', 'Челябинск', 'Chelyabinsk', '车里雅宾斯克', 'Çelyabinsk', 61.4, 55.16, 'RU', 2, 'c'], ['tmn', 'Тюмень', 'Tyumen', '秋明', 'Tümen', 65.53, 57.15, 'RU', 3, 'c'],
    ['omsk', 'Омск', 'Omsk', '鄂木斯克', 'Omsk', 73.37, 54.99, 'RU', 3, 'c'], ['nsk', 'Новосибирск', 'Novosibirsk', '新西伯利亚', 'Novosibirsk', 82.92, 55.03, 'RU', 1, 'c'],
    ['krs', 'Красноярск', 'Krasnoyarsk', '克拉斯诺亚尔斯克', 'Krasnoyarsk', 92.87, 56.01, 'RU', 2, 'c'], ['irk', 'Иркутск', 'Irkutsk', '伊尔库茨克', 'İrkutsk', 104.28, 52.29, 'RU', 2, 'c'],
    ['ulu', 'Улан-Удэ', 'Ulan-Ude', '乌兰乌德', 'Ulan-Ude', 107.6, 51.83, 'RU', 3, 'c'], ['chita', 'Чита', 'Chita', '赤塔', 'Çita', 113.5, 52.03, 'RU', 3, 'c'],
    ['blg', 'Благовещенск', 'Blagoveshchensk', '布拉戈维申斯克', 'Blagoveşçensk', 127.53, 50.27, 'RU', 2, 'x'], ['khv', 'Хабаровск', 'Khabarovsk', '哈巴罗夫斯克', 'Habarovsk', 135.07, 48.48, 'RU', 2, 'c'],
    ['vvo', 'Владивосток', 'Vladivostok', '符拉迪沃斯托克', 'Vladivostok', 131.9, 43.12, 'RU', 1, 'p'], ['nhk', 'Находка', 'Nakhodka', '纳霍德卡', 'Nahodka', 132.87, 42.82, 'RU', 3, 'p'],
    ['uss', 'Уссурийск', 'Ussuriysk', '乌苏里斯克', 'Ussuriysk', 131.95, 43.8, 'RU', 3, 'c'],
    ['krd', 'Краснодар', 'Krasnodar', '克拉斯诺达尔', 'Krasnodar', 38.98, 45.04, 'RU', 2, 'c'], ['nvr', 'Новороссийск', 'Novorossiysk', '新罗西斯克', 'Novorossiysk', 37.77, 44.72, 'RU', 2, 'p'],
    ['rnd', 'Ростов-на-Дону', 'Rostov-on-Don', '顿河畔罗斯托夫', 'Rostov', 39.72, 47.23, 'RU', 2, 'c'], ['vrn', 'Воронеж', 'Voronezh', '沃罗涅日', 'Voronej', 39.2, 51.67, 'RU', 3, 'c'],
    ['vgg', 'Волгоград', 'Volgograd', '伏尔加格勒', 'Volgograd', 44.5, 48.7, 'RU', 3, 'c'], ['kgd', 'Калининград', 'Kaliningrad', '加里宁格勒', 'Kaliningrad', 20.5, 54.71, 'RU', 3, 'p'],
    ['ala', 'Алматы', 'Almaty', '阿拉木图', 'Almatı', 76.89, 43.24, 'KZ', 1, 'c'], ['ast', 'Астана', 'Astana', '阿斯塔纳', 'Astana', 71.43, 51.13, 'KZ', 2, 'c'],
    ['shy', 'Шымкент', 'Shymkent', '奇姆肯特', 'Şımkent', 69.6, 42.32, 'KZ', 3, 'c'], ['kar', 'Караганда', 'Karaganda', '卡拉干达', 'Karağandı', 73.1, 49.8, 'KZ', 3, 'c'],
    ['ub', 'Улан-Батор', 'Ulaanbaatar', '乌兰巴托', 'Ulan Batur', 106.9, 47.92, 'MN', 2, 'c'],
    ['msq', 'Минск', 'Minsk', '明斯克', 'Minsk', 27.56, 53.9, 'BY', 3, 'c'], ['tas', 'Ташкент', 'Tashkent', '塔什干', 'Taşkent', 69.24, 41.3, 'UZ', 3, 'c'],
  ];
  var ORIG = { CN: 1, KR: 1 }, DEST = { RU: 1, KZ: 1, MN: 1, BY: 1, UZ: 1 };
  var COUNTRY = [
    [['РОССИЯ', 'RUSSIA', '俄罗斯', 'RUSYA'], 96, 61.5, 1], [['КИТАЙ', 'CHINA', '中国', 'ÇİN'], 104, 33.5, 1], [['КАЗАХСТАН', 'KAZAKHSTAN', '哈萨克斯坦', 'KAZAKİSTAN'], 67.5, 48.3, .8],
    [['МОНГОЛИЯ', 'MONGOLIA', '蒙古', 'MOĞOLİSTAN'], 103, 46.4, .8], [['КОРЕЯ', 'KOREA', '韩国', 'KORE'], 128.3, 36.4, .62],
  ];

  /* ---------- проекция (та же, что в tools/build-geo.py) */
  var P = G.proj, rad = Math.PI / 180, n = (Math.sin(P.lat1 * rad) + Math.sin(P.lat2 * rad)) / 2, C0 = Math.pow(Math.cos(P.lat1 * rad), 2) + 2 * n * Math.sin(P.lat1 * rad), rho0 = Math.sqrt(C0 - 2 * n * Math.sin(P.lat0 * rad)) / n;
  function proj(lon, lat) { var rho = Math.sqrt(C0 - 2 * n * Math.sin(lat * rad)) / n, th = n * (lon - P.lon0) * rad; return [(rho * Math.sin(th) - P.mnx) * P.k - P.fx, -(rho0 - rho * Math.cos(th)) * P.k - P.miny - P.fy]; }
  var CITIES = RAW.map(function (r) { var p = proj(r[5], r[6]); return { id: r[0], names: [r[1], r[2], r[3], r[4]], lon: r[5], lat: r[6], cc: r[7], tier: r[8], kind: r[9], x: p[0], y: p[1], side: ORIG[r[7]] ? 'o' : DEST[r[7]] ? 'd' : '' }; });
  var BY = {}; CITIES.forEach(function (c) { BY[c.id] = c; });
  function cname(c) { return c ? (c.names[LI[lang()]] || c.names[1] || c.names[0]) : ''; }
  function findCity(text) { var t = String(text || '').trim().toLowerCase(); if (!t) return null; return CITIES.find(function (c) { return c.names.some(function (n) { return String(n).toLowerCase() === t; }); }) || null; }

  /* ---------- разметка */
  var stage = $('#mcStage'), svg = $('#mcSvg'), layer = $('#mcLayer');
  var NS = 'http://www.w3.org/2000/svg';
  var vp = document.createElementNS(NS, 'g'); vp.setAttribute('class', 'mc-vp'); svg.appendChild(vp);
  vp.innerHTML = '<rect class="mc-sea" x="-2000" y="-2000" width="' + (G.w + 4000) + '" height="' + (G.h + 4000) + '"/>'
    + '<g class="mc-grid">' + grat() + '</g>'
    + '<path class="mc-land" d="' + G.land.map(function (l) { return l[1]; }).join('') + '"/>'
    + '<path class="mc-lake" d="' + G.lakes + '"/>'
    + '<path class="mc-border" d="' + G.borders.join('') + '"/>'
    + '<g class="mc-route" id="mcRoute"></g>';
  function grat() { // параллели и меридианы — тонкой сеткой, как на настоящей карте
    var h = '';
    for (var lat = 20; lat <= 70; lat += 10) { var d = ''; for (var lon = 0; lon <= 180; lon += 4) { var p = proj(lon, lat); d += (lon ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); } h += '<path d="' + d + '"/>'; }
    for (var lo = 20; lo <= 170; lo += 15) { var d2 = ''; for (var la = 10; la <= 80; la += 5) { var q = proj(lo, la); d2 += (la > 10 ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); } h += '<path d="' + d2 + '"/>'; }
    return h;
  }
  var routeG = $('#mcRoute', svg);
  // города — HTML-кнопки поверх карты: текст чёткий при любом масштабе
  var pins = CITIES.map(function (c) {
    var b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1;
    b.className = 'mc-pin k-' + c.kind + ' s-' + (c.side || 'n') + ' t' + c.tier; b.dataset.id = c.id;
    b.innerHTML = '<i></i><span></span>'; layer.appendChild(b); c.el = b; c.lbl = b.lastChild; return c;
  });
  var clabels = COUNTRY.map(function (k) { var p = proj(k[1], k[2]); var e = document.createElement('span'); e.className = 'mc-cl'; layer.insertBefore(e, layer.firstChild); return { t: k[0], x: p[0], y: p[1], sz: k[3], el: e }; });
  function relabel() { pins.forEach(function (c) { c.lbl.textContent = cname(c); c.el.setAttribute('aria-label', cname(c)); }); clabels.forEach(function (k) { k.el.textContent = T(k.t); }); }
  relabel();

  /* ---------- вид: масштаб и сдвиг */
  var IB = (function () { var a = proj(37, 57.6), b = proj(134, 42), c = proj(113.5, 21.8), d = proj(31, 59); return [Math.min(a[0], d[0]) - 6, a[1] - 8, b[0] + 30, c[1] + 6]; })(); // Москва … Владивосток … Гуанчжоу
  var view = { s: 1, ox: 0, oy: 0, min: 1, home: null }, cw = 0, ch = 0, area = 0;
  function measure() {
    var r = stage.getBoundingClientRect(); cw = r.width; ch = r.height;
    var panel = $('#mcPanel'), over = panel && getComputedStyle(panel).position === 'absolute';
    area = over ? Math.max(ch * .5, ch - panel.offsetHeight - 10) : ch; // видимая часть над панелью
    view.min = Math.max(cw / G.w, ch / G.h);
    var s = Math.max(view.min, Math.min(cw / (IB[2] - IB[0]), (area - 60) / (IB[3] - IB[1])));
    var head = $('.mc-head', host), top = head && getComputedStyle(head).position === 'absolute' ? head.offsetTop + head.offsetHeight + 6 : 0;
    s = Math.max(view.min, Math.min(cw / (IB[2] - IB[0]), (area - top - 8) / (IB[3] - IB[1])));
    view.home = { s: s, ox: cw / 2 - (IB[0] + IB[2]) / 2 * s, oy: top + (area - top) / 2 - (IB[1] + IB[3]) / 2 * s };
  }
  function clamp(v) {
    v.s = Math.max(view.min, Math.min(view.min * 9, v.s));
    v.ox = Math.min(0, Math.max(cw - G.w * v.s, v.ox)); v.oy = Math.min(0, Math.max(ch - G.h * v.s, v.oy));
    return v;
  }
  var raf = 0;
  function apply() { if (raf || !view.home) return; raf = requestAnimationFrame(function () { raf = 0; vp.setAttribute('transform', 'translate(' + view.ox.toFixed(2) + ' ' + view.oy.toFixed(2) + ') scale(' + view.s.toFixed(4) + ')'); place(); stage.classList.toggle('zoomed', view.s > view.home.s * 1.05); }); }
  function setView(v, anim) {
    if (!view.home) return;
    v = clamp({ s: v.s, ox: v.ox, oy: v.oy });
    if (!anim || reduce) { view.s = v.s; view.ox = v.ox; view.oy = v.oy; apply(); return; }
    var a = { s: view.s, ox: view.ox, oy: view.oy }, t0 = performance.now(), D = 380;
    (function step(t) { var k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); view.s = a.s + (v.s - a.s) * e; view.ox = a.ox + (v.ox - a.ox) * e; view.oy = a.oy + (v.oy - a.oy) * e; apply(); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function zoomAt(px, py, f, anim) { var s = Math.max(view.min, Math.min(view.min * 9, view.s * f)); setView({ s: s, ox: px - (px - view.ox) * s / view.s, oy: py - (py - view.oy) * s / view.s }, anim); }

  /* ---------- подписи без наложений */
  var sel = { from: null, to: null, fromText: '', toText: '', check: null };
  function obstacles() {
    var r = stage.getBoundingClientRect(), out = [];
    $$('.mc-head > *, .mc-zoom, .mc-cap', host).forEach(function (e) { if (e.hidden) return; var b = e.getBoundingClientRect(); if (b.width) out.push([b.left - r.left - 4, b.top - r.top - 4, b.right - r.left + 4, b.bottom - r.top + 4]); });
    [$('#mcPanel'), res].forEach(function (pn) { if (pn && !pn.hidden && getComputedStyle(pn).position === 'absolute') { var b = pn.getBoundingClientRect(); out.push([b.left - r.left - 4, b.top - r.top - 6, b.right - r.left + 4, b.bottom - r.top]); } });
    return out;
  }
  var cv = document.createElement('canvas').getContext('2d'), wcache = {};
  function tw(text, sz, bold) { var k = text + '|' + sz + bold; if (wcache[k]) return wcache[k]; cv.font = (bold ? '700 ' : '600 ') + sz + 'px ' + (getComputedStyle(host).fontFamily || 'sans-serif'); return (wcache[k] = cv.measureText(text).width); }
  function hit(a, list) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) return true; } return false; }
  function place() {
    if (!view.home) return;
    var s = view.s, z = s / view.home.s, maxT = z >= 2.3 ? 3 : z >= 1.45 ? 2 : 1;
    var obs = obstacles(), boxes = [];
    var on = { }; if (sel.from) on[sel.from.id] = 'from'; if (sel.to) on[sel.to.id] = 'to'; if (sel.check) on[sel.check] = 'chk';
    // порядок: выбранные, пункт пропуска маршрута, потом по уровню
    var pri = function (c) { return (on[c.id] === 'from' || on[c.id] === 'to' ? 10 : on[c.id] ? 6 : 0) + (4 - c.tier) * 2 + (c.kind === 'x' ? -1 : 0); };
    var list = pins.slice().sort(function (a, b) { return pri(b) - pri(a); });
    list.forEach(function (c) {
      var X = c.x * s + view.ox, Y = c.y * s + view.oy, el = c.el, st = on[c.id];
      var vis = (c.tier <= maxT || st) && X > -40 && X < cw + 40 && Y > -20 && Y < ch + 20;
      el.classList.toggle('off', !vis); if (!vis) return;
      el.style.transform = 'translate(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px)';
      el.classList.toggle('from', st === 'from'); el.classList.toggle('to', st === 'to'); el.classList.toggle('chk', st === 'chk');
      var sz = st ? 14 : c.tier === 1 ? 13.5 : 12.5, w = tw(cname(c), sz, st || c.tier === 1) + (st ? 20 : 12), hgt = st ? 22 : 16, side = '';
      var R = [X + 8, Y - hgt / 2, X + 8 + w, Y + hgt / 2], Lb = [X - 8 - w, Y - hgt / 2, X - 8, Y + hgt / 2];
      if (!hit(R, boxes) && !hit(R, obs) && R[2] < cw - 4) side = 'r'; else if (!hit(Lb, boxes) && !hit(Lb, obs) && Lb[0] > 4) side = 'l';
      if (!side && st) side = R[2] < cw - 4 ? 'r' : 'l';
      el.classList.toggle('nl', !side); el.classList.toggle('l', side === 'l');
      if (side) boxes.push(side === 'r' ? R : Lb);
      boxes.push([X - 6, Y - 6, X + 6, Y + 6]);
    });
    clabels.forEach(function (k) {
      var X = k.x * s + view.ox, Y = k.y * s + view.oy, f = Math.max(11, Math.min(26, 15 * k.sz * Math.pow(z, .35)));
      k.el.style.transform = 'translate(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px) translate(-50%,-50%)'; k.el.style.fontSize = f.toFixed(1) + 'px';
    });
  }

  /* ---------- маршрут: коридор из справочника маршрутов (routes-kb.js), от города до города */
  var MODE_OF = { air: 'air', ltl_auto: 'auto', ftl_auto: 'auto', lcl_rail: 'rail', fcl_rail: 'rail', lcl_sea: 'sea' };
  var COL = { rail: '#F6F1EA', auto: '#E7A47C', sea: '#8FB3E8', air: '#E0AE62' }; // глина и полночь: белый, терракота, стальной синий, охра
  var curMode = '';
  function km(a, b) { var dl = (b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * rad); var dp = b[1] - a[1]; return Math.sqrt(dl * dl + dp * dp) * 111; }
  function ll(c) { return [c.lon, c.lat]; }
  function anchor(which) { // координаты выбранного города или примерные — по региону, если города нет на карте
    var c = sel[which]; if (c) return ll(c);
    var R = window.IOMA_ROUTES, adv = R && R.advise(sel.fromText || 'Шанхай', sel.toText || 'Москва', 'all'), k = adv && (which === 'from' ? adv.origin : adv.dest), nd = R && R.nodes[k];
    return nd ? [nd[0], nd[1]] : null;
  }
  function corridor(mode) {
    var R = window.IOMA_ROUTES; if (!R) return null;
    var adv = R.advise(sel.from ? sel.from.names[0] : sel.fromText, sel.to ? sel.to.names[0] : sel.toText, mode || 'all');
    return adv && adv.items[0] ? { c: adv.items[0], adv: adv } : null;
  }
  function routePoints(c) {
    var N = window.IOMA_ROUTES.nodes, A = anchor('from'), B = anchor('to'); if (!A || !B) return null;
    if (c.air) return { pts: [A, B], air: true };
    var p = c.path.slice(1).map(function (k) { return { k: k, ll: N[k] }; }).filter(function (x) { return x.ll; });
    var ci = c.check ? p.findIndex(function (x) { return x.k === c.check; }) : -1;
    var pre = ci >= 0 ? p.slice(0, ci) : [], post = ci >= 0 ? p.slice(ci) : p;
    // в начале пропускаем узлы, которые уводят в сторону от города отправки
    while (pre.length) { var nx = pre[1] ? pre[1].ll : post[0] && post[0].ll; if (nx && km(A, nx) <= km(pre[0].ll, nx)) pre.shift(); else break; }
    // после пункта пропуска — до узла, ближайшего к городу доставки
    var di = 0, best = 1e9; post.forEach(function (x, i) { var d = km(x.ll, B); if (d < best) { best = d; di = i; } });
    post = post.slice(0, di + 1);
    if (post.length > 1) { var a = post[post.length - 2].ll, b = post[post.length - 1].ll; if (km(a, B) < km(a, b)) post.pop(); }
    var pts = [A].concat(pre.map(function (x) { return x.ll; }), post.map(function (x) { return x.ll; }), [B]);
    var out = []; pts.forEach(function (q) { if (!out.length || km(out[out.length - 1], q) > 40) out.push(q); });
    if (out.length === 1) out.push(B);
    return { pts: out, check: c.check };
  }
  function smooth(P2) { // Катмулл — Ром → кривые Безье
    if (P2.length < 3) return 'M' + P2.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
    var d = 'M' + P2[0][0].toFixed(1) + ',' + P2[0][1].toFixed(1);
    for (var i = 0; i < P2.length - 1; i++) {
      var p0 = P2[i - 1] || P2[i], p1 = P2[i], p2 = P2[i + 1], p3 = P2[i + 2] || p2, t = .18;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) * t).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) * t).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) * t).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) * t).toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }
  function drawRoute() {
    var cr = (sel.from || sel.fromText) && (sel.to || sel.toText) ? corridor(curMode) : null, cap = $('#mcCap');
    sel.check = null;
    if (!cr) { routeG.innerHTML = ''; if (cap) cap.hidden = true; place(); return; }
    var rp = routePoints(cr.c); if (!rp) { routeG.innerHTML = ''; return; }
    var P2 = rp.pts.map(function (q) { return proj(q[0], q[1]); }), d;
    routeBox = [Math.min.apply(0, P2.map(function (q) { return q[0]; })), Math.min.apply(0, P2.map(function (q) { return q[1]; })), Math.max.apply(0, P2.map(function (q) { return q[0]; })), Math.max.apply(0, P2.map(function (q) { return q[1]; }))];
    if (rp.air) { var a = P2[0], b = P2[1], mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - Math.abs(a[0] - b[0]) * .22; d = 'M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + 'Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1); }
    else d = smooth(P2);
    var col = COL[cr.c.mode] || '#E8A33D', dur = { air: 4, sea: 11, rail: 8, auto: 7 }[cr.c.mode] || 8;
    routeG.innerHTML = '<path class="mc-r-glow" d="' + d + '" stroke="' + col + '"/><path class="mc-r-line" d="' + d + '" stroke="' + col + '"/><path class="mc-r-dash" d="' + d + '"/>'
      + (reduce ? '' : '<circle class="mc-comet" r="4.2"><animateMotion dur="' + dur + 's" repeatCount="indefinite" path="' + d + '"/></circle>');
    if (rp.check && BY[rp.check]) sel.check = rp.check; else if (rp.check === 'mzl' || rp.check === 'zab') sel.check = 'zab'; else if (rp.check === 'grd') sel.check = 'sfh'; else if (rp.check === 'kam') sel.check = 'sfh';
    var DAYS = T(['дн.', 'days', '天', 'gün']);
    var capHtml = '<i style="background:' + col + '"></i><span>' + esc(cr.c.t[lang()] || cr.c.t.ru) + ' · ' + cr.c.days[0] + '–' + cr.c.days[1] + ' ' + DAYS + '</span>';
    if (cap) { cap.hidden = false; cap.innerHTML = capHtml; }
    var rr = $('.mc-res-route', res); if (rr) rr.innerHTML = capHtml;
    place();
  }

  /* ---------- выбор городов */
  var fromBtn = $('#mcFrom'), toBtn = $('#mcTo'), wIn = $('#mcW'), vIn = $('#mcV'), go = $('#mcGo'), res = $('#mcRes'), hint = $('#mcHint'), sum = $('#mcSum'), row = $('.mc-row', host);
  function stepText() {
    $('b', fromBtn).textContent = sel.from ? cname(sel.from) : (sel.fromText || T(['Выберите на карте', 'Pick on the map', '在地图上选择', 'Haritadan seçin']));
    $('b', toBtn).textContent = sel.to ? cname(sel.to) : (sel.toText || T(['Выберите на карте', 'Pick on the map', '在地图上选择', 'Haritadan seçin']));
    fromBtn.classList.toggle('set', !!(sel.from || sel.fromText)); toBtn.classList.toggle('set', !!(sel.to || sel.toText));
    var w = Number(String(wIn.value).replace(',', '.'));
    var H = !(sel.from || sel.fromText) ? 'Нажмите на карте город отправки — в Китае или Корее' : !(sel.to || sel.toText) ? 'Теперь — город доставки в России или Казахстане' : !(w > 0) ? 'Укажите вес груза и нажмите «Рассчитать»' : last ? 'Нажмите на вариант — покажем его путь на карте' : 'Всё готово — нажмите «Рассчитать»';
    if (hint && hint.dataset.ru !== H) { hint.dataset.ru = H; hint.textContent = H; }
    host.classList.toggle('mc-ready', !!((sel.from || sel.fromText) && (sel.to || sel.toText) && w > 0));
  }
  function syncCalc() { // те же значения — в большой калькулятор (откроется по «Подробный расчёт»)
    var map = { fromCity: sel.from ? cname(sel.from) : sel.fromText, toCity: sel.to ? cname(sel.to) : sel.toText, weight: wIn.value };
    Object.keys(map).forEach(function (id) { var e = document.getElementById(id); if (e && map[id] != null && e.value !== map[id]) { e.value = map[id]; } });
    try { var m = JSON.parse(localStorage.getItem('iomaCalc') || '{}'); Object.keys(map).forEach(function (k) { if (map[k]) m[k] = map[k]; }); if (vIn.value) m.mcV = vIn.value; localStorage.setItem('iomaCalc', JSON.stringify(m)); } catch (e) { }
  }
  function pick(which, c, text) {
    sel[which] = c || null; sel[which + 'Text'] = c ? '' : String(text || '').trim();
    curMode = ''; clearRes(); stepText(); syncCalc(); drawRoute();
    var b = which === 'from' ? fromBtn : toBtn; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    if (c) { // мягко подвинуть карту, если город у края
      var X = c.x * view.s + view.ox, Y = c.y * view.s + view.oy;
      if (X < 40 || X > cw - 40 || Y < 40 || Y > area - 20) setView({ s: view.s, ox: cw / 2 - c.x * view.s, oy: area / 2 - c.y * view.s }, true);
    }
    if (which === 'from' && !sel.to && !sel.toText) pulseSide('d'); else if (which === 'to' && sel.from && !(Number(wIn.value) > 0)) setTimeout(function () { try { wIn.focus({ preventScroll: true }); } catch (e) { wIn.focus(); } }, 150);
  }
  function pulseSide(side) { host.classList.remove('want-o', 'want-d'); void host.offsetWidth; host.classList.add('want-' + side); clearTimeout(pulseSide.t); pulseSide.t = setTimeout(function () { host.classList.remove('want-o', 'want-d'); }, 2600); }
  function choose(c) {
    if (c.side === 'o') pick('from', c);
    else if (c.side === 'd') pick('to', c);
    else tip(c, T(['Пункт пропуска на границе — выберите город отправки или доставки', 'A border crossing — pick a city of origin or destination', '这是边境口岸——请选择起运或目的城市', 'Bu bir sınır kapısı — çıkış veya varış şehri seçin']));
  }
  function tip(c, text) { var t = $('#mcTip'); if (!t) return; t.textContent = text; t.hidden = false; var X = c.x * view.s + view.ox, Y = c.y * view.s + view.oy; t.style.left = Math.max(10, Math.min(cw - 270, X - 130)) + 'px'; t.style.top = Math.max(10, Y - 64) + 'px'; clearTimeout(tip.t); tip.t = setTimeout(function () { t.hidden = true; }, 2800); }

  /* ---------- список городов (для тех, кому удобнее выбрать из списка или ввести свой) */
  var pickBox = $('#mcPick'), pickQ = $('#mcPickQ'), pickList = $('#mcPickList'), pickSide = 'o';
  function openPick(side, btn) {
    pickSide = side; pickBox.hidden = false; pickQ.value = ''; drawPick();
    var r = btn.getBoundingClientRect(), hr = host.getBoundingClientRect();
    pickBox.style.left = Math.max(8, Math.min(hr.width - pickBox.offsetWidth - 8, r.left - hr.left)) + 'px';
    pickBox.style.top = ''; pickBox.style.bottom = '';
    if (r.top - hr.top > 300) pickBox.style.bottom = (hr.bottom - r.top + 8) + 'px'; else pickBox.style.top = (r.bottom - hr.top + 8) + 'px';
    pickQ.placeholder = side === 'o' ? T(['Город в Китае или Корее', 'City in China or Korea', '中国或韩国城市', 'Çin veya Kore’de şehir']) : T(['Город в России или Казахстане', 'City in Russia or Kazakhstan', '俄罗斯或哈萨克斯坦城市', 'Rusya veya Kazakistan’da şehir']);
    setTimeout(function () { pickQ.focus(); }, 30);
  }
  function closePick() { pickBox.hidden = true; }
  function drawPick() {
    var q = pickQ.value.trim().toLowerCase();
    var list = CITIES.filter(function (c) { return c.side === pickSide && (!q || c.names.some(function (n) { return String(n).toLowerCase().indexOf(q) >= 0; })); }).sort(function (a, b) { return a.tier - b.tier || cname(a).localeCompare(cname(b)); }).slice(0, 40);
    var h = list.map(function (c) { return '<button type="button" role="option" data-cid="' + c.id + '"><b>' + esc(cname(c)) + '</b><small>' + (c.kind === 'p' ? T(['порт', 'port', '港口', 'liman']) : c.kind === 'x' ? T(['граница', 'border', '口岸', 'sınır']) : '') + '</small></button>'; }).join('');
    if (q && !list.some(function (c) { return c.names.some(function (n) { return String(n).toLowerCase() === q; }); })) h += '<button type="button" role="option" data-free="1"><b>«' + esc(pickQ.value.trim()) + '»</b><small>' + T(['другой город — тоже посчитаем', 'another city — we’ll quote it too', '其他城市——同样可以报价', 'başka şehir — onu da hesaplarız']) + '</small></button>';
    pickList.innerHTML = h || '<p>' + T(['Начните вводить название', 'Start typing a name', '请输入城市名', 'Bir ad yazmaya başlayın']) + '</p>';
  }
  pickQ.addEventListener('input', drawPick);
  pickQ.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePick(); (pickSide === 'o' ? fromBtn : toBtn).focus(); } if (e.key === 'Enter') { e.preventDefault(); var b = $('button', pickList); if (b) b.click(); } });
  pickList.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.cid) pick(pickSide === 'o' ? 'from' : 'to', BY[b.dataset.cid]); else pick(pickSide === 'o' ? 'from' : 'to', null, pickQ.value); closePick(); });
  fromBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!pickBox.hidden && pickSide === 'o') return closePick(); openPick('o', fromBtn); });
  toBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!pickBox.hidden && pickSide === 'd') return closePick(); openPick('d', toBtn); });
  document.addEventListener('click', function (e) { if (!pickBox.hidden && !pickBox.contains(e.target) && !pickBox.contains(window.__iomaDownOn || null) && !fromBtn.contains(e.target) && !toBtn.contains(e.target)) closePick(); });

  /* ---------- мышь, палец, колесо */
  var ptrs = new Map(), drag = null, live = 0, wheelOk = false, wheelT = 0;
  function local(e) { var r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function ui(t) { return t.closest && t.closest('.mc-panel,.mc-zoom,.mc-head,.mc-pick,.mc-cap'); }
  stage.addEventListener('pointerdown', function (e) {
    if (ui(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    ptrs.set(e.pointerId, local(e));
    if (ptrs.size === 1) drag = { start: local(e), ox: view.ox, oy: view.oy, moved: false, pin: e.target.closest && e.target.closest('.mc-pin') };
    else if (ptrs.size === 2) { var a = Array.from(ptrs.values()); drag = { pinch: true, d0: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1, s0: view.s, ox: view.ox, oy: view.oy, mid: [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2], moved: true }; }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!ptrs.has(e.pointerId) || !drag) return;
    var p = local(e); ptrs.set(e.pointerId, p);
    if (drag.pinch && ptrs.size >= 2) { var a = Array.from(ptrs.values()), d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), s = Math.max(view.min, Math.min(view.min * 9, drag.s0 * d / drag.d0)); var m = drag.mid; setView({ s: s, ox: m[0] - (m[0] - drag.ox) * s / drag.s0, oy: m[1] - (m[1] - drag.oy) * s / drag.s0 }); return; }
    var dx = p[0] - drag.start[0], dy = p[1] - drag.start[1];
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; stage.classList.add('dragging'); try { stage.setPointerCapture(e.pointerId); } catch (x) { } }
    if (drag.moved) setView({ s: view.s, ox: drag.ox + dx, oy: drag.oy + dy });
  });
  function up(e) {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (drag && !drag.moved && drag.pin && e.type === 'pointerup') { var c = BY[drag.pin.dataset.id]; if (c) choose(c); }
    if (!ptrs.size) { drag = null; stage.classList.remove('dragging'); } else if (drag && drag.pinch) drag = null;
  }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', function (e) { if (ui(e.target)) return; var p = local(e); zoomAt(p[0], p[1], 1.8, true); });
  // колесо: масштаб, но только если курсор задержался на карте — иначе страница прокручивается как обычно
  stage.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(live); host.classList.add('mc-live'); wheelT = setTimeout(function () { wheelOk = true; }, 350); });
  stage.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(wheelT); wheelOk = false; live = setTimeout(function () { host.classList.remove('mc-live'); }, 900); });
  stage.addEventListener('wheel', function (e) {
    if (!wheelOk || ui(e.target)) return;
    var f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? .05 : .0016));
    if (f < 1 && view.s <= view.min * 1.001) return; // дальше отдалять некуда — пусть листается страница
    e.preventDefault(); var p = local(e); zoomAt(p[0], p[1], f);
  }, { passive: false });
  $$('.mc-zoom button', host).forEach(function (b) { b.addEventListener('click', function () { var z = b.dataset.z; if (z === 'reset') return setView(view.home, true); zoomAt(cw / 2, area / 2, z === 'in' ? 1.6 : 1 / 1.6, true); }); });
  if (!fine) host.classList.add('mc-live', 'mc-touch');
  // клавиатура: стрелки двигают карту, +/− масштаб (когда фокус на карте)
  stage.tabIndex = 0;
  stage.addEventListener('keydown', function (e) {
    var k = e.key, st = 60; if (ui(e.target)) return;
    if (k === '+' || k === '=') zoomAt(cw / 2, area / 2, 1.4, true); else if (k === '-') zoomAt(cw / 2, area / 2, 1 / 1.4, true);
    else if (k === 'ArrowLeft') setView({ s: view.s, ox: view.ox + st, oy: view.oy }, true); else if (k === 'ArrowRight') setView({ s: view.s, ox: view.ox - st, oy: view.oy }, true);
    else if (k === 'ArrowUp') setView({ s: view.s, ox: view.ox, oy: view.oy + st }, true); else if (k === 'ArrowDown') setView({ s: view.s, ox: view.ox, oy: view.oy - st }, true);
    else return; e.preventDefault();
  });

  /* ---------- расчёт прямо в карточке */
  var NM = { air: ['Авиа', 'Air', '空运', 'Hava yolu'], ltl_auto: ['Авто, сборный груз', 'Truck, groupage', '公路拼车', 'Karayolu, parsiyel'], lcl_rail: ['ЖД, сборный груз', 'Rail, groupage', '铁路拼箱', 'Demiryolu, parsiyel'], lcl_sea: ['Море + ЖД, сборный', 'Sea + rail, groupage', '海铁联运拼箱', 'Deniz + demiryolu, parsiyel'], fcl_rail: ["ЖД, контейнер 40'", "Rail, 40' container", '铁路40尺整箱', "Demiryolu, 40' konteyner"], ftl_auto: ['Авто, машина целиком', 'Full truck', '公路整车', 'Komple tır'] };
  var TG = { best: ['Оптимально', 'Best value', '最优', 'En uygun'], cheap: ['Дешевле всего', 'Cheapest', '最便宜', 'En ucuz'], fast: ['Быстрее всего', 'Fastest', '最快', 'En hızlı'] };
  var IC = { air: '<path d="M2 16l20-6-20-6 4 6-4 6zM6 10h8"/>', auto: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z"/>', rail: '<path d="M6 3h12a2 2 0 012 2v9a3 3 0 01-3 3H7a3 3 0 01-3-3V5a2 2 0 012-2zM4 10h16M8 21l2-4M16 21l-2-4"/>', sea: '<path d="M3 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M5 14l1-5h12l1 5M9 9V5h6v4"/>' };
  var last = null, seq = 0, chosen = '';
  function usd() { var e = document.getElementById('usdRate'); var t = e ? String(e.textContent).replace(/\s/g, '').replace(',', '.') : ''; return parseFloat(t); }
  function money(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function clearRes() { last = null; chosen = ''; res.hidden = true; res.innerHTML = ''; sum.hidden = true; row.hidden = false; host.classList.remove('mc-has-res'); stepText(); requestAnimationFrame(place); }
  function panelPad() { var pn = $('#mcPanel'); if (pn && getComputedStyle(pn).position === 'absolute') host.style.setProperty('--mc-pb', (pn.offsetHeight + 24) + 'px'); }
  function fitRoute() { // путь целиком в свободной части карты (слева от вариантов и над панелью)
    var pts = routeBox; if (!pts || !cw) return;
    var over = getComputedStyle(res).position === 'absolute' && !res.hidden, pn = $('#mcPanel'), pAbs = pn && getComputedStyle(pn).position === 'absolute';
    var head = $('.mc-head', host), top = head && getComputedStyle(head).position === 'absolute' ? head.offsetTop + head.offsetHeight + 12 : 12;
    var L = 18, Rr = over ? cw - res.offsetWidth - 66 - 20 : cw - 62, B = pAbs ? ch - pn.offsetHeight - 30 : ch - 16;
    var bw = pts[2] - pts[0], bh = pts[3] - pts[1]; if (bw <= 0 || bh <= 0) return;
    var s2 = Math.max(view.min, Math.min(view.min * 9, Math.min((Rr - L) / bw, (B - top) / bh) * .92));
    setView({ s: s2, ox: (L + Rr) / 2 - (pts[0] + pts[2]) / 2 * s2, oy: (top + B) / 2 - (pts[1] + pts[3]) / 2 * s2 }, true);
  }
  var routeBox = null;
  function drawRes() {
    if (!last) return;
    var r = usd(), DAYS = T(['дн.', 'days', '天', 'gün']);
    var opts = last.options.slice(0, 4);
    res.innerHTML = '<p class="mc-res-h">' + esc(T(['Варианты для вашего груза', 'Options for your cargo', '适合您货物的方案', 'Yükünüz için seçenekler'])) + '</p><div class="mc-opts">' + opts.map(function (o) {
      return '<button type="button" class="mc-o' + (o.kind === chosen ? ' on' : '') + '" data-kind="' + o.kind + '" aria-pressed="' + (o.kind === chosen) + '"><span class="mc-o-n"><span class="mc-o-ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + IC[o.mode] + '</svg></span>' + esc(T(NM[o.kind] || [o.kind])) + '</span>' + (o.tags.length ? '<span class="mc-o-t">' + o.tags.slice(0, 1).map(function (t) { return '<em class="t-' + t + '">' + esc(T(TG[t])) + '</em>'; }).join('') + '</span>' : '<span></span>') + '<span class="mc-o-p">' + money(o.price) + '&nbsp;<em>$</em></span><span class="mc-o-d">' + o.days[0] + '–' + o.days[1] + ' ' + DAYS + '</span>' + (isFinite(r) ? '<span class="mc-o-r">≈ ' + money(o.price * r) + ' ₽</span>' : '') + '</button>';
    }).join('') + '</div><p class="mc-res-route"></p>';
    var w = Number(String(wIn.value).replace(',', '.')), v = Number(String(vIn.value).replace(',', '.'));
    sum.innerHTML = '<span class="mc-sum-r"><b>' + esc($('b', fromBtn).textContent) + '</b> → <b>' + esc($('b', toBtn).textContent) + '</b>' + (w > 0 ? ' · ' + money(w) + ' ' + T(['кг', 'kg', '公斤', 'kg']) : '') + (v > 0 ? ' · ' + String(v).replace('.', ',') + ' ' + T(['м³', 'm³', '立方米', 'm³']) : '') + '</span><button type="button" class="mc-edit" id="mcEdit">' + esc(T(['Изменить', 'Edit', '修改', 'Değiştir'])) + '</button><span class="mc-sum-n">' + esc(T(['Ориентир без таможенных платежей', 'Estimate, excl. customs payments', '参考价，不含关税', 'Gümrük ödemeleri hariç tahmin'])) + '</span><button type="button" class="mc-more" id="mcMore">' + esc(T(['Подробный расчёт и КП →', 'Full quote →', '详细报价 →', 'Ayrıntılı hesap ve teklif →'])) + '</button>';
    res.hidden = false; sum.hidden = false; row.hidden = true; host.classList.add('mc-has-res'); panelPad();
    $$('.mc-o', res).forEach(function (b) { b.addEventListener('click', function () { choose2(b.dataset.kind); }); });
    $('#mcMore').addEventListener('click', more);
    $('#mcEdit').addEventListener('click', function () { clearRes(); setTimeout(function () { try { wIn.focus({ preventScroll: true }); } catch (e) { } }, 30); });
    stepText(); requestAnimationFrame(place);
  }
  function choose2(kind) { chosen = kind; curMode = MODE_OF[kind] || ''; $$('.mc-o', res).forEach(function (b) { var on = b.dataset.kind === kind; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); drawRoute(); fitRoute(); }
  function run() {
    var w = Number(String(wIn.value).replace(',', '.')), v = Number(String(vIn.value).replace(',', '.'));
    if (!(sel.from || sel.fromText)) { pulseSide('o'); openPick('o', fromBtn); return; }
    if (!(sel.to || sel.toText)) { pulseSide('d'); openPick('d', toBtn); return; }
    if (!(w > 0) && !(v > 0)) { wIn.focus(); $('.mc-w', host).classList.add('err'); setTimeout(function () { $('.mc-w', host).classList.remove('err'); }, 1400); return; }
    syncCalc(); var my = ++seq; go.disabled = true; go.classList.add('busy'); var txt = go.textContent; go.textContent = T(['Считаем…', 'Calculating…', '计算中…', 'Hesaplanıyor…']);
    fetch('/api/estimate', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: sel.from ? sel.from.names[0] : sel.fromText, to: sel.to ? sel.to.names[0] : sel.toText, weight: w || null, volume: v > 0 ? v : null, source: 'map' }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || d.ok === false) throw new Error(d.error || 'Ошибка расчёта'); return d; }); })
      .then(function (d) { if (my !== seq) return; last = d; chosen = d.recommended; curMode = MODE_OF[chosen] || ''; drawRes(); drawRoute(); fitRoute(); window.__mcLast = d; })
      .catch(function (e) { if (my !== seq) return; res.hidden = false; res.innerHTML = '<p class="mc-err">' + esc(e.message) + '</p>'; requestAnimationFrame(place); })
      .then(function () { if (my !== seq) return; go.disabled = false; go.classList.remove('busy'); go.textContent = txt; });
  }
  function more() { // подробный расчёт: те же данные в большом калькуляторе + выбранный вариант
    syncCalc();
    window.__iomaOpenView && window.__iomaOpenView('calculator');
    setTimeout(function () { window.__v3calc && window.__v3calc(); }, 120);
  }
  go.addEventListener('click', function (e) { e.preventDefault(); run(); });
  [wIn, vIn].forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } }); i.addEventListener('input', function () { if (last) clearRes(); else stepText(); syncCalc(); }); });

  /* ---------- старт */
  function restore() {
    var m = {}; try { m = JSON.parse(localStorage.getItem('iomaCalc') || '{}'); } catch (e) { }
    var f = findCity(m.fromCity), t = findCity(m.toCity);
    sel.from = f && f.side === 'o' ? f : null; if (!sel.from && m.fromCity && !f) sel.fromText = m.fromCity;
    sel.to = t && t.side === 'd' ? t : null; if (!sel.to && m.toCity && !t) sel.toText = m.toCity;
    if (!sel.from && !sel.fromText) sel.from = BY.sha; if (!sel.to && !sel.toText) sel.to = BY.msk; // пример маршрута сразу на карте
    if (m.weight && !wIn.value) wIn.value = m.weight; if (m.mcV && !vIn.value) vIn.value = m.mcV;
  }
  function boot() {
    measure(); view.s = view.home.s; view.ox = view.home.ox; view.oy = view.home.oy; clamp(view);
    restore(); stepText(); drawRoute(); apply(); host.classList.add('mc-on');
  }
  // Пересчёт размеров. Если карта была скрыта (страница открылась на другом разделе), её размер был 0 —
  // тогда начинаем с исходного вида и заново рисуем маршрут, иначе сохраняем масштаб и центр.
  function remeasure() {
    var was = cw, z = view.s && view.home && view.home.s ? view.s / view.home.s : 1;
    measure(); if (!cw) return;
    if (!was || !isFinite(z) || !isFinite(view.ox) || !isFinite(view.oy)) { view.s = view.home.s; view.ox = view.home.ox; view.oy = view.home.oy; clamp(view); apply(); drawRoute(); return; }
    var cx = (cw / 2 - view.ox) / view.s, cy = (area / 2 - view.oy) / view.s; var s = view.home.s * Math.max(1, z); setView({ s: s, ox: cw / 2 - cx * s, oy: area / 2 - cy * s }); drawRoute();
  }
  var rt, later = function () { clearTimeout(rt); rt = setTimeout(remeasure, 120); };
  window.addEventListener('resize', later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { apply(); });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.lang')) setTimeout(function () { relabel(); stepText(); drawRoute(); if (last) drawRes(); }, 80); });
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
  window.IOMA_MAP = { pick: function (w, id) { pick(w, BY[id]); }, run: run, view: function () { return view; }, cities: CITIES, choose: choose };
})();
