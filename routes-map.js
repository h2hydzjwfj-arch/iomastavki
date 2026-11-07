/* IOMASTAVKA — карта маршрутов Китай → Москва.
   Города Китая — те, откуда у нас были запросы и ставки (Иу, Шанхай, Нинбо, Пекин, Циндао, Чжэнчжоу, Сиань, Чэнду, Чунцин, Гуанчжоу,
   Шэньчжэнь, Циньчжоу, Урумчи, Харбин, Шэньян) и Пусан. Маршрут всегда до Москвы; другие города России — бледными точками.
   Виды: ЖД, авто, авиа, море + ЖД (морем до Владивостока, дальше ЖД). Переходы подписаны парой «Забайкальск · Маньчжурия».
   Используется на главной (window.IOMA_RMAP.mount) и в расчёте ставки (routeFor — путь и километры по участкам). */
(function () {
  'use strict';
  // [ru, en, zh, lon, lat]
  var C = {
    msk: ['Москва', 'Moscow', '莫斯科', 37.62, 55.75], spb: ['Санкт-Петербург', 'St Petersburg', '圣彼得堡', 30.32, 59.94], nnov: ['Нижний Новгород', 'Nizhny Novgorod', '下诺夫哥罗德', 44.0, 56.33],
    kzn: ['Казань', 'Kazan', '喀山', 49.1, 55.8], sam: ['Самара', 'Samara', '萨马拉', 50.15, 53.2], ekb: ['Екатеринбург', 'Yekaterinburg', '叶卡捷琳堡', 60.6, 56.84], chel: ['Челябинск', 'Chelyabinsk', '车里雅宾斯克', 61.4, 55.16],
    omsk: ['Омск', 'Omsk', '鄂木斯克', 73.37, 54.99], nsk: ['Новосибирск', 'Novosibirsk', '新西伯利亚', 82.92, 55.03], krs: ['Красноярск', 'Krasnoyarsk', '克拉斯诺亚尔斯克', 92.87, 56.01],
    irk: ['Иркутск', 'Irkutsk', '伊尔库茨克', 104.3, 52.29], ulu: ['Улан-Удэ', 'Ulan-Ude', '乌兰乌德', 107.6, 51.83], chita: ['Чита', 'Chita', '赤塔', 113.5, 52.03], bel: ['Белогорск', 'Belogorsk', '别洛戈尔斯克', 128.47, 50.92],
    khb: ['Хабаровск', 'Khabarovsk', '哈巴罗夫斯克', 135.07, 48.48], uss: ['Уссурийск', 'Ussuriysk', '乌苏里斯克', 131.95, 43.8], vvo: ['Владивосток', 'Vladivostok', '符拉迪沃斯托克', 131.89, 43.12],
    krd: ['Краснодар', 'Krasnodar', '克拉斯诺达尔', 38.98, 45.04], rnd: ['Ростов-на-Дону', 'Rostov-on-Don', '顿河畔罗斯托夫', 39.7, 47.23],
    // переходы и транзит
    zab: ['Забайкальск', 'Zabaikalsk', '后贝加尔斯克', 117.33, 49.65], mzl: ['Маньчжурия', 'Manzhouli', '满洲里', 117.43, 49.6], hlr: ['Хайлар', 'Hailar', '海拉尔', 119.76, 49.21], qqh: ['Цицикар', 'Qiqihar', '齐齐哈尔', 123.92, 47.35],
    dos: ['Достык', 'Dostyk', '多斯特克', 82.47, 45.25], ala: ['Алашанькоу', 'Alashankou', '阿拉山口', 82.58, 45.17], hor: ['Хоргос', 'Khorgos', '霍尔果斯', 80.42, 44.2], akt: ['Актогай', 'Aktogay', '阿克托盖', 79.62, 46.95],
    ast: ['Астана', 'Astana', '阿斯塔纳', 71.45, 51.17], erl: ['Эрлянь', 'Erenhot', '二连浩特', 111.98, 43.65], uba: ['Улан-Батор', 'Ulaanbaatar', '乌兰巴托', 106.92, 47.92],
    nau: ['Наушки', 'Naushki', '纳乌什基', 106.1, 50.38], kya: ['Кяхта', 'Kyakhta', '恰克图', 106.45, 50.35], sfh: ['Суйфэньхэ', 'Suifenhe', '绥芬河', 131.15, 44.4], pog: ['Пограничный', 'Pogranichny', '波格拉尼奇内', 131.38, 44.4],
    hh: ['Хэйхэ', 'Heihe', '黑河', 127.49, 50.24], blg: ['Благовещенск', 'Blagoveshchensk', '布拉戈维申斯克', 127.53, 50.29], lz: ['Ланьчжоу', 'Lanzhou', '兰州', 103.83, 36.06],
    // Китай — города запросов
    bj: ['Пекин', 'Beijing', '北京', 116.4, 39.9], tj: ['Тяньцзинь', 'Tianjin', '天津', 117.2, 39.13], sy: ['Шэньян', 'Shenyang', '沈阳', 123.43, 41.8], hrb: ['Харбин', 'Harbin', '哈尔滨', 126.63, 45.75],
    qd: ['Циндао', 'Qingdao', '青岛', 120.38, 36.07], sh: ['Шанхай', 'Shanghai', '上海', 121.47, 31.23], nb: ['Нинбо', 'Ningbo', '宁波', 121.55, 29.87], yw: ['Иу', 'Yiwu', '义乌', 120.07, 29.31],
    zz: ['Чжэнчжоу', 'Zhengzhou', '郑州', 113.62, 34.75], xa: ['Сиань', "Xi'an", '西安', 108.94, 34.34], cd: ['Чэнду', 'Chengdu', '成都', 104.07, 30.67], cq: ['Чунцин', 'Chongqing', '重庆', 106.55, 29.56],
    gz: ['Гуанчжоу', 'Guangzhou', '广州', 113.26, 23.13], sz: ['Шэньчжэнь', 'Shenzhen', '深圳', 114.06, 22.54], qz: ['Циньчжоу', 'Qinzhou', '钦州', 108.62, 21.95], urc: ['Урумчи', 'Urumqi', '乌鲁木齐', 87.62, 43.83],
    pus: ['Пусан', 'Busan', '釜山', 129.08, 35.18],
  };
  // точки в море (для пути судна)
  var SEA = { s1: [123.6, 30.6], s2: [126.2, 32.9], s3: [129.4, 34.2], s4: [131.0, 38.6], c1: [114.6, 21.8], c2: [117.6, 22.9], c3: [120.2, 25.0], c4: [122.6, 28.2], q1: [109.2, 20.9], q2: [110.6, 19.9], q3: [112.6, 21.2], d1: [122.8, 35.4] };
  var ORIGINS = ['bj', 'sy', 'hrb', 'qd', 'sh', 'nb', 'yw', 'zz', 'xa', 'cd', 'cq', 'gz', 'sz', 'qz', 'urc', 'pus'];
  var RU_MINOR = ['spb', 'nnov', 'kzn', 'ekb', 'nsk', 'khb', 'vvo', 'krd'];
  var TS_RU = ['chita', 'ulu', 'irk', 'krs', 'nsk', 'omsk', 'ekb', 'kzn', 'msk']; // Транссиб от Читы до Москвы
  var KZ_RU = ['akt', 'ast', 'chel', 'sam', 'msk'];
  // коридоры по видам: переход (gw — две точки пары), путь по Китаю для каждого города, путь от перехода до Москвы
  var MODES = {
    rail: [
      { id: 'zab', gw: ['zab', 'mzl'], ru: ['zab'].concat(TS_RU), cn: { bj: ['bj', 'sy', 'hrb', 'qqh', 'hlr', 'mzl'], sy: ['sy', 'hrb', 'qqh', 'hlr', 'mzl'], hrb: ['hrb', 'qqh', 'hlr', 'mzl'], qd: ['qd', 'tj', 'sy'] } },
      { id: 'dos', gw: ['dos', 'ala'], ru: ['dos'].concat(KZ_RU), cn: { sh: ['sh', 'zz', 'xa', 'lz', 'urc', 'ala'], nb: ['nb', 'sh'], yw: ['yw', 'zz'], zz: ['zz', 'xa'], xa: ['xa', 'lz'], cd: ['cd', 'lz'], cq: ['cq', 'cd'], gz: ['gz', 'zz'], sz: ['sz', 'gz'], qz: ['qz', 'cq'], urc: ['urc', 'ala'] } },
      { id: 'hor', gw: ['hor'], ru: ['hor', 'akt'].concat(KZ_RU.slice(1)), cn: { urc2: ['urc', 'hor'] } },
      { id: 'nau', gw: ['nau', 'erl'], ru: ['nau', 'ulu'].concat(TS_RU.slice(2)), mid: ['erl', 'uba', 'nau'], cn: { bj2: ['bj', 'erl'] } },
      { id: 'pog', gw: ['pog', 'sfh'], ru: ['pog', 'uss', 'khb', 'bel', 'chita'].concat(TS_RU.slice(1)), cn: { hrb2: ['hrb', 'sfh'] } },
    ],
    road: [
      { id: 'zab', gw: ['zab', 'mzl'], ru: ['zab'].concat(TS_RU), cn: { bj: ['bj', 'sy', 'hrb', 'qqh', 'hlr', 'mzl'], sy: ['sy', 'hrb', 'qqh', 'hlr', 'mzl'], hrb: ['hrb', 'qqh', 'hlr', 'mzl'], qd: ['qd', 'tj', 'sy'] } },
      { id: 'hor', gw: ['hor'], ru: ['hor', 'akt'].concat(KZ_RU.slice(1)), cn: { sh: ['sh', 'zz', 'xa', 'lz', 'urc', 'hor'], nb: ['nb', 'sh'], yw: ['yw', 'zz'], zz: ['zz', 'xa'], xa: ['xa', 'lz'], cd: ['cd', 'lz'], cq: ['cq', 'cd'], gz: ['gz', 'zz'], sz: ['sz', 'gz'], qz: ['qz', 'cq'], urc: ['urc', 'hor'] } },
      { id: 'kya', gw: ['kya', 'erl'], ru: ['kya', 'ulu'].concat(TS_RU.slice(2)), mid: ['erl', 'uba', 'kya'], cn: { bj2: ['bj', 'erl'] } },
      { id: 'pog', gw: ['pog', 'sfh'], ru: ['pog', 'uss', 'khb', 'bel', 'chita'].concat(TS_RU.slice(1)), cn: { hrb2: ['hrb', 'sfh'] } },
      { id: 'blg', gw: ['blg', 'hh'], ru: ['blg', 'bel', 'chita'].concat(TS_RU.slice(1)), cn: { hrb3: ['hrb', 'hh'] } },
    ],
    sea: [
      { id: 'vvo', gw: ['vvo'], ru: ['vvo', 'uss', 'khb', 'bel', 'chita'].concat(TS_RU.slice(1)), sea: true,
        cn: { sh: ['sh', 's1', 's2', 's3', 's4', 'vvo'], nb: ['nb', 's1'], qd: ['qd', 'd1', 's2'], pus: ['pus', 's3'], gz: ['gz', 'c1', 'c2', 'c3', 'c4', 's1'], sz: ['sz', 'c1'], qz: ['qz', 'q1', 'q2', 'q3', 'c1'] } },
    ],
    air: [{ id: 'air', gw: [], ru: ['msk'], air: ['bj', 'sh', 'gz', 'sz', 'cd', 'zz', 'xa', 'urc', 'hrb', 'qd', 'yw', 'cq'] }],
  };
  var GW_NAME = { zab: ['zab', 'mzl'], dos: ['dos', 'ala'], hor: ['hor'], nau: ['nau', 'erl'], kya: ['kya', 'erl'], pog: ['pog', 'sfh'], blg: ['blg', 'hh'], vvo: ['vvo'] };
  var MODE_NAME = { rail: ['ЖД', 'Rail', '铁路'], road: ['Авто', 'Truck', '公路'], air: ['Авиа', 'Air', '空运'], sea: ['Море + ЖД', 'Sea + rail', '海运 + 铁路'] };
  var UI = { km: ['км', 'km', '公里'], via: ['через', 'via', '经'], calc: ['Рассчитать', 'Get a rate', '计算运费'], direct: ['прямой рейс', 'direct flight', '直飞'], toMsk: ['до Москвы', 'to Moscow', '至莫斯科'], seaThen: ['морем до Владивостока, дальше ЖД', 'by sea to Vladivostok, then rail', '海运至符拉迪沃斯托克，再铁路'],
    china: ['по Китаю', 'in China', '中国境内'], ru: ['по России', 'in Russia', '俄罗斯境内'], transit: ['транзит', 'transit', '过境'], seaLeg: ['морем', 'by sea', '海运'], railLeg: ['по ЖД', 'by rail', '铁路'], air: ['перелёт', 'flight', '航程'] };
  var LI = { ru: 0, en: 1, zh: 2 };
  function lang() { var l; try { l = localStorage.getItem('iomastavka_lang'); } catch (e) {} return LI.hasOwnProperty(l) ? l : 'ru'; }
  function nm(k, l) { var c = C[k]; return c ? c[LI[l || lang()] + 0] || c[0] : k; }
  function ui(k, l) { return UI[k][LI[l || lang()]]; }
  function ll(k) { return C[k] ? [C[k][3], C[k][4]] : SEA[k]; }
  // расстояние по дуге, км
  function hav(a, b) { var R = 6371, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r, s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * R * Math.asin(Math.sqrt(s)); }
  function km(keys, k) { var s = 0; for (var i = 1; i < keys.length; i++) s += hav(ll(keys[i - 1]), ll(keys[i])); return Math.round(s * (k || 1.12) / 10) * 10; } // 1,12 — дороги и пути длиннее прямой
  // путь города до перехода внутри коридора (собираем по цепочке: Иу → Чжэнчжоу → … → переход)
  function next(cn, cur) {
    if (cn[cur] && cn[cur][0] === cur) return cn[cur];
    var ks = Object.keys(cn), i, j;
    for (i = 0; i < ks.length; i++) if (cn[ks[i]][0] === cur) return cn[ks[i]];
    for (i = 0; i < ks.length; i++) { j = cn[ks[i]].indexOf(cur); if (j >= 0 && j < cn[ks[i]].length - 1) return cn[ks[i]].slice(j); }
    return null;
  }
  function chain(cor, start) {
    var cn = cor.cn || {}, path = [], seen = {}, cur = start;
    for (var guard = 0; guard < 14; guard++) {
      var seg = next(cn, cur); if (!seg) break;
      seg.forEach(function (p, i) { if (i || !path.length) path.push(p); });
      cur = seg[seg.length - 1]; if (seen[cur]) break; seen[cur] = 1;
      if (cor.gw.indexOf(cur) >= 0 || cur === (cor.mid || [])[0]) break;
    }
    return path;
  }
  // ЖД от перехода до Москвы по Транссибу (ориентир по тарифным расстояниям); остальное — по карте с поправкой на изгибы пути
  var TRUNK_KM = { zab: 6650, nau: 5900, pog: 9270, vvo: 9290, blg: 7980 };
  // маршрут для расчёта ставки: путь, километры по участкам, переход
  function routeFor(fromKey, mode) {
    mode = MODES[mode] ? mode : 'rail';
    if (mode === 'air') { var c0 = MODES.air[0]; if (!C[fromKey]) return null; var d = Math.round(hav(ll(fromKey), ll('msk')) / 10) * 10; return { mode: mode, path: [fromKey, 'msk'], legs: [{ kind: 'air', km: d }], km: d, gw: null }; }
    var cors = MODES[mode];
    for (var i = 0; i < cors.length; i++) {
      var cor = cors[i], p = chain(cor, fromKey); if (p.length < 2 && fromKey !== cor.gw[0]) continue;
      var legs = [], china = p.slice(), mid = cor.mid ? cor.mid.slice() : null;
      var ruKm = (mode !== 'road' && TRUNK_KM[cor.id]) || km(cor.ru, 1.25);
      if (cor.sea) { legs.push({ kind: 'sea', km: km(china, 1.08) }); legs.push({ kind: 'rail', km: ruKm }); }
      else { legs.push({ kind: 'china', km: km(china, 1.25) }); if (mid) legs.push({ kind: 'transit', km: km(mid, 1.25) }); legs.push({ kind: 'ru', km: ruKm }); }
      var path = china.concat(mid ? mid.slice(1) : []).concat(cor.ru.slice(cor.sea ? 1 : (mid ? 1 : 0)));
      return { mode: mode, path: path, legs: legs, km: legs.reduce(function (s, l) { return s + l.km; }, 0), gw: cor.id };
    }
    return null;
  }
  // поиск города по названию на любом языке
  var ALIAS = { yw: ['yiwu', 'иу', 'iwu'], sh: ['shanghai', 'шанхай'], sz: ['shenzhen', 'шэньчжэнь', 'шеньчжень', 'шэньжэнь'], gz: ['guangzhou', 'гуанчжоу', 'кантон', 'canton'], xa: ['xian', "xi'an", 'сиань'], qz: ['qinzhou', 'циньчжоу'], pus: ['busan', 'pusan', 'пусан'] };
  function find(q) {
    q = String(q || '').trim().toLowerCase().replace(/ё/g, 'е'); if (!q) return null;
    var keys = Object.keys(C);
    for (var i = 0; i < keys.length; i++) { var c = C[keys[i]]; if ([c[0], c[1], c[2]].some(function (n) { return String(n).toLowerCase().replace(/ё/g, 'е') === q; }) || (ALIAS[keys[i]] || []).indexOf(q) >= 0) return keys[i]; }
    for (var j = 0; j < keys.length; j++) { var c2 = C[keys[j]]; if (q.length >= 3 && [c2[0], c2[1]].some(function (n) { return String(n).toLowerCase().indexOf(q) === 0; })) return keys[j]; }
    return null;
  }

  /* ---------------- рисование ---------------- */
  // проекция: если на странице есть настоящая карта (geo-asia.js, Natural Earth, коническая Альберса) — рисуем на ней,
  // иначе — простая равнопромежуточная
  var G = window.IOMA_GEO || null, W, H, VB, xy;
  if (G && G.proj) {
    var P = G.proj, rad = Math.PI / 180, nn = (Math.sin(P.lat1 * rad) + Math.sin(P.lat2 * rad)) / 2, C0 = Math.pow(Math.cos(P.lat1 * rad), 2) + 2 * nn * Math.sin(P.lat1 * rad), rho0 = Math.sqrt(C0 - 2 * nn * Math.sin(P.lat0 * rad)) / nn;
    var gp = function (lon, lat) { var rho = Math.sqrt(C0 - 2 * nn * Math.sin(lat * rad)) / nn, th = nn * (lon - P.lon0) * rad; return [(rho * Math.sin(th) - P.mnx) * P.k - P.fx, -(rho0 - rho * Math.cos(th)) * P.k - P.miny - P.fy]; };
    xy = function (k) { var p = ll(k); return gp(p[0], p[1]); };
    VB = [282, 80, 448, 326]; W = VB[2]; H = VB[3];
  } else {
    var LON0 = 27, LON1 = 141, LAT1 = 61.5, LAT0 = 19; W = 1000; var KX = W / (LON1 - LON0), KY = KX / Math.cos(42 * Math.PI / 180); H = Math.round((LAT1 - LAT0) * KY); VB = [0, 0, W, H];
    xy = function (k) { var p = ll(k); return [(p[0] - LON0) * KX, (LAT1 - p[1]) * KY]; };
  }
  function d(keys) { return keys.map(function (k, i) { var p = xy(k); return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(''); }
  function smooth(keys) { // сглаженная линия через точки
    var pts = keys.map(xy); if (pts.length < 3) return d(keys);
    var s = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) { var m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; s += 'Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1); }
    var l = pts[pts.length - 1]; return s + 'L' + l[0].toFixed(1) + ' ' + l[1].toFixed(1);
  }
  function arc(a, b) { var p = xy(a), q = xy(b), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len, h = len * .18; return 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'Q' + (mx + nx * h).toFixed(1) + ' ' + (my + ny * h).toFixed(1) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }
  // упрощённая береговая линия Китая, Кореи и Приморья — только для ориентира
  var COAST = [[108.0, 21.6], [109.7, 21.5], [110.4, 20.4], [111.0, 21.4], [113.0, 22.2], [114.2, 22.3], [115.5, 22.8], [116.7, 23.3], [118.0, 24.4], [119.6, 25.6], [120.4, 27.0], [121.0, 28.2], [121.9, 29.9], [121.0, 30.6], [121.9, 31.0], [121.0, 32.2], [120.3, 34.3], [119.3, 35.0], [120.3, 36.0], [122.4, 37.2], [120.7, 37.8], [119.0, 37.2], [118.0, 38.3], [117.6, 39.0], [119.0, 39.5], [121.2, 40.8], [122.2, 40.4], [121.2, 39.0], [122.5, 39.6], [124.3, 39.9], [125.2, 38.7], [126.4, 37.6], [126.5, 36.5], [126.3, 35.0], [127.6, 34.6], [129.1, 35.1], [129.4, 36.0], [129.4, 37.4], [128.6, 38.6], [127.9, 39.6], [129.7, 40.9], [130.6, 42.4], [131.2, 42.6], [131.9, 43.0], [133.2, 42.8], [135.3, 43.9], [138.0, 46.0], [140.4, 48.6]];
  var JAPAN = [[129.8, 33.2], [130.9, 31.4], [131.5, 32.8], [132.4, 34.3], [134.2, 34.7], [135.4, 34.6], [136.9, 34.4], [139.0, 35.1], [140.0, 35.6], [140.9, 36.9], [141.0, 38.3]];
  function poly(pts) { return pts.map(function (p, i) { var q = G && G.proj ? gp(p[0], p[1]) : [(p[0] - LON0) * KX, (LAT1 - p[1]) * KY]; return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(''); }
  // суша: Россия и Китай ярче, соседи бледнее
  var HOT = { RUS: 1, CHN: 1 }, NEAR = { KAZ: 1, MNG: 1, KOR: 1, PRK: 1, JPN: 1, TWN: 1, BLR: 1, UKR: 1, UZB: 1, KGZ: 1, TJK: 1, TKM: 1, AFG: 1, PAK: 1, IND: 1, NPL: 1, BTN: 1, MMR: 1, LAO: 1, VNM: 1, THA: 1, GEO: 1, AZE: 1, ARM: 1, IRN: 1, TUR: 1, FIN: 1, EST: 1, LVA: 1, LTU: 1, POL: 1, NOR: 1, SWE: 1, HKG: 1 };
  function land() {
    if (!(G && G.land)) return '<path class="rm-coast" d="' + poly(COAST) + '"/><path class="rm-coast" d="' + poly(JAPAN) + '"/>';
    var h = '<g class="rm-land">'; G.land.forEach(function (c) { if (HOT[c[0]] || NEAR[c[0]]) h += '<path class="' + (HOT[c[0]] ? 'hot' : 'near') + '" d="' + c[1] + '"/>'; }); h += '</g>';
    if (G.borders) h += '<g class="rm-borders">' + G.borders.map(function (b) { return '<path d="' + b + '"/>'; }).join('') + '</g>';
    return h;
  }
  // подписи: смещение и выравнивание, чтобы не налезали
  var LBL = { msk: [-12, -12, 'end'], spb: [9, 4, 'start'], nnov: [8, 13, 'start'], kzn: [-8, 12, 'end'], ekb: [6, -8, 'start'], nsk: [0, -10, 'middle'], irk: [-8, 14, 'end'], khb: [9, -4, 'start'], vvo: [-9, 12, 'end'], krd: [9, 4, 'start'],
    bj: [-9, 4, 'end'], sy: [9, 4, 'start'], hrb: [-9, 12, 'end'], qd: [9, 4, 'start'], sh: [10, 2, 'start'], nb: [10, 9, 'start'], yw: [-9, 8, 'end'], zz: [0, -10, 'middle'], xa: [-9, 10, 'end'], cd: [-9, 4, 'end'], cq: [0, 18, 'middle'], gz: [-9, 4, 'end'], sz: [9, 10, 'start'], qz: [-9, 4, 'end'], urc: [0, 18, 'middle'], pus: [10, 4, 'start'],
    zab: [10, -14, 'start'], dos: [-10, -18, 'end'], hor: [-10, 20, 'end'], nau: [-10, -18, 'end'], kya: [-10, -18, 'end'], pog: [11, 6, 'start'], blg: [11, -14, 'start'] };

  function mount(el, opts) {
    opts = opts || {}; var state = { mode: opts.mode || 'rail', pick: null, auto: !!opts.auto, timer: 0 };
    el.classList.add('rmap');
    el.innerHTML = '<div class="rmap-tabs" role="tablist"></div><div class="rmap-stage"><svg class="rmap-svg" viewBox="' + VB.join(' ') + '" role="img" aria-label="Маршруты Китай — Москва"></svg><div class="rmap-tip" hidden></div></div>';
    var svg = el.querySelector('svg'), tabs = el.querySelector('.rmap-tabs'), tip = el.querySelector('.rmap-tip');
    var U = 1; // пользовательских единиц на 1 пиксель экрана: точки и отступы подписей одинаковые на любом экране
    function scale() { var w = svg.getBoundingClientRect().width || W, u = W / w; el.style.setProperty('--u', u.toFixed(3)); el.classList.toggle('rmap-sm', w < 560); if (Math.abs(u - U) / U > .12) { U = u; draw(); } }
    function drawTabs() { var l = lang(); tabs.innerHTML = ['rail', 'road', 'air', 'sea'].map(function (m) { return '<button type="button" role="tab" data-m="' + m + '" aria-selected="' + (m === state.mode) + '"' + (m === state.mode ? ' class="on"' : '') + '>' + MODE_NAME[m][LI[l]] + '</button>'; }).join('') + '<i class="rmap-ind"></i>'; moveInd(); }
    function moveInd() { var b = tabs.querySelector('.on'), i = tabs.querySelector('.rmap-ind'); if (b && i) { i.style.width = b.offsetWidth + 'px'; i.style.transform = 'translateX(' + b.offsetLeft + 'px)'; } }
    function text(x, y, t, cls, anchor) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" class="' + cls + '" text-anchor="' + (anchor || 'start') + '">' + t + '</text>'; }
    function label(k, cls, alt) { var p = xy(k), o = LBL[k] || [8, 4, 'start']; return text(p[0] + o[0] * U * .62, p[1] + o[1] * U * .62, alt || nm(k), cls, o[2]); }
    function draw() {
      var l = lang(), cors = MODES[state.mode], h = '';
      h += '<defs><linearGradient id="rmG" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#F28A3A"/><stop offset="1" stop-color="#E06A2C"/></linearGradient><radialGradient id="rmGlow"><stop offset="0" stop-color="#F28A3A" stop-opacity=".55"/><stop offset="1" stop-color="#F28A3A" stop-opacity="0"/></radialGradient></defs>';
      h += land();
      RU_MINOR.forEach(function (k) { if (k === 'vvo' && state.mode === 'sea') return; var p = xy(k); h += '<circle class="rm-ru" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (1.364 * U).toFixed(2) + '"/>' + label(k, 'rm-ru-t'); });
      var used = {}, gws = {}, n = 0;
      cors.forEach(function (cor) {
        if (cor.air) { cor.air.forEach(function (k) { used[k] = 1; h += '<path class="rm-r rm-air" data-o="' + k + '" d="' + arc(k, 'msk') + '" pathLength="1" style="--d:' + (n++ * 0.06) + 's"/>'; }); return; }
        Object.keys(cor.cn).forEach(function (k) { var seg = cor.cn[k]; used[seg[0]] = 1; h += '<path class="rm-r rm-cn' + (cor.sea ? ' rm-sea' : '') + '" data-o="' + seg[0] + '" d="' + smooth(seg) + '" pathLength="1" style="--d:' + (n++ * 0.05) + 's"/>'; });
        if (cor.mid) h += '<path class="rm-r rm-cn" d="' + smooth(cor.mid) + '" pathLength="1" style="--d:' + (n++ * 0.05) + 's"/>';
        h += '<path class="rm-r rm-trunk" data-gw="' + cor.id + '" id="rmT_' + cor.id + '" d="' + smooth(cor.ru) + '" pathLength="1" style="--d:' + (0.25 + n++ * 0.05) + 's"/>';
        if (cor.gw.length) gws[cor.id] = cor.gw;
      });
      // бегущие огоньки по магистралям
      if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) cors.forEach(function (cor, i) { if (cor.air) { cor.air.slice(0, 6).forEach(function (k, j) { h += '<circle class="rm-dot" r="' + (1.984 * U).toFixed(2) + '"><animateMotion dur="' + (5 + j * .7).toFixed(1) + 's" repeatCount="indefinite" begin="-' + (j * 1.3 + .4).toFixed(1) + 's" path="' + arc(k, 'msk') + '"/></circle>'; }); return; } h += '<circle class="rm-dot" r="' + (2.108 * U).toFixed(2) + '"><animateMotion dur="' + (7 + i * 1.3).toFixed(1) + 's" repeatCount="indefinite" begin="-' + (i * 2.1 + .5).toFixed(1) + 's" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#rmT_' + cor.id + '"/></animateMotion></circle>'; });
      Object.keys(gws).forEach(function (id) { var g = gws[id], p = xy(g[0]), o = LBL[g[0]] || [10, 4, 'start'], lx = p[0] + o[0] * U * .62, ly = p[1] + o[1] * U * .62, nmTxt = g.map(function (k, i) { return '<tspan x="' + lx.toFixed(1) + '" dy="' + (i ? '1.15em' : '0') + '">' + nm(k, l) + '</tspan>'; }).join(''); h += '<g class="rm-gw" data-gw="' + id + '"><rect x="' + (p[0] - 5).toFixed(1) + '" y="' + (p[1] - 5).toFixed(1) + '" width="10" height="10" transform="rotate(45 ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')"/>' + '<text class="rm-gw-t" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + o[2] + '">' + nmTxt + '</text>' + '</g>'; });
      ORIGINS.forEach(function (k) { var p = xy(k), on = !!used[k]; h += '<g class="rm-o' + (on ? '' : ' off') + '" data-o="' + k + '" tabindex="' + (on ? 0 : -1) + '" role="button" aria-label="' + nm(k) + '"><circle class="rm-hit" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (8.06 * U).toFixed(2) + '"/><circle class="rm-o-c" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (2.48 * U).toFixed(2) + '"/>' + label(k, 'rm-o-t') + '</g>'; });
      var m = xy('msk'); h += '<g class="rm-msk"><circle cx="' + m[0].toFixed(1) + '" cy="' + m[1].toFixed(1) + '" r="' + (13.64 * U).toFixed(2) + '" fill="url(#rmGlow)" class="rm-pulse"/><circle cx="' + m[0].toFixed(1) + '" cy="' + m[1].toFixed(1) + '" r="' + (3.7199999999999998 * U).toFixed(2) + '"/>' + label('msk', 'rm-msk-t') + '</g>';
      svg.innerHTML = h; svg.setAttribute('aria-label', MODE_NAME[state.mode][LI[l]] + ' — ' + ui('toMsk', l));
      el.dataset.mode = state.mode; hideTip();
    }
    function hl(k) {
      svg.classList.toggle('pick', !!k); var o = svg.querySelector('.rm-hl'); if (o) o.remove(); if (!k) return;
      var r = routeFor(k, state.mode); if (!r) return;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'rm-hl'); path.setAttribute('pathLength', '1'); path.setAttribute('d', state.mode === 'air' ? arc(k, 'msk') : smooth(r.path));
      var first = svg.querySelector('.rm-gw, .rm-o, .rm-msk'); svg.insertBefore(path, first);
    }
    function showTip(k, g) {
      var l = lang(), r = routeFor(k, state.mode); if (!r) return hideTip();
      var gw = r.gw && GW_NAME[r.gw] ? GW_NAME[r.gw].map(function (x) { return nm(x, l); }).join(' · ') : '';
      var legs = r.legs.map(function (x) { return '<span>' + (x.kind === 'china' ? ui('china', l) : x.kind === 'ru' ? ui('ru', l) : x.kind === 'transit' ? ui('transit', l) : x.kind === 'sea' ? ui('seaLeg', l) : x.kind === 'rail' ? ui('railLeg', l) : ui('air', l)) + ' <b>≈ ' + x.km.toLocaleString(l === 'ru' ? 'ru-RU' : 'en-US') + ' ' + ui('km', l) + '</b></span>'; }).join('');
      tip.innerHTML = '<b>' + nm(k, l) + ' → ' + nm('msk', l) + '</b><small>' + MODE_NAME[state.mode][LI[l]] + (gw ? ' · ' + ui('via', l) + ' ' + gw : state.mode === 'air' ? ' · ' + ui('direct', l) : '') + '</small><div class="rmap-legs">' + legs + '</div><button type="button" class="rmap-go" data-go="' + k + '">' + ui('calc', l) + '</button>';
      var p = xy(k), rect = svg.getBoundingClientRect(), s = rect.width / W, stage = el.querySelector('.rmap-stage').getBoundingClientRect(); p = [p[0] - VB[0], p[1] - VB[1]];
      tip.hidden = false; var tw = tip.offsetWidth, th = tip.offsetHeight, x = rect.left - stage.left + p[0] * s, y = rect.top - stage.top + p[1] * s;
      tip.style.left = Math.max(4, Math.min(stage.width - tw - 4, x - tw / 2)) + 'px'; tip.style.top = (y - th - 16 < 0 ? y + 18 : y - th - 16) + 'px';
      hl(k); state.pick = k;
    }
    function hideTip() { tip.hidden = true; state.pick = null; hl(null); }
    function setMode(m, user) { if (!MODES[m]) return; state.mode = m; if (user) stopAuto(); drawTabs(); draw(); if (opts.onMode) opts.onMode(m); }
    function stopAuto() { state.auto = false; clearInterval(state.timer); }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m, true); });
    svg.addEventListener('click', function (e) { var o = e.target.closest('.rm-o:not(.off)'); if (o) { stopAuto(); if (state.pick !== o.dataset.o) showTip(o.dataset.o); } else hideTip(); });
    svg.addEventListener('keydown', function (e) { var o = e.target.closest && e.target.closest('.rm-o'); if (o && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); stopAuto(); showTip(o.dataset.o); } });
    if (window.matchMedia && window.matchMedia('(hover:hover)').matches) {
      svg.addEventListener('mouseover', function (e) { var o = e.target.closest('.rm-o:not(.off)'); if (o && state.pick !== o.dataset.o) { stopAuto(); showTip(o.dataset.o); } });
    }
    tip.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b && opts.onPick) opts.onPick(b.dataset.go, state.mode, nm(b.dataset.go, 'ru')); });
    el.addEventListener('mouseleave', function () { if (state.pick) hideTip(); });
    new MutationObserver(function () { drawTabs(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('resize', function () { scale(); moveInd(); });
    if (window.ResizeObserver) new ResizeObserver(function () { scale(); moveInd(); }).observe(svg);
    drawTabs(); U = W / (svg.getBoundingClientRect().width || W) || 1; draw(); scale();
    if (state.auto) { var order = ['rail', 'road', 'air', 'sea']; state.timer = setInterval(function () { if (document.hidden) return; setMode(order[(order.indexOf(state.mode) + 1) % order.length]); }, 7000); }
    return { setMode: setMode, show: function (k) { stopAuto(); showTip(k); }, hide: hideTip, stopAuto: stopAuto };
  }

  // путь для маленькой карты маршрута (расчёт ставки): только выбранный маршрут
  function routeSvg(r, l) {
    l = l || lang(); if (!r) return '';
    var keys = r.path, xs = keys.map(xy), minx = Math.min.apply(null, xs.map(function (p) { return p[0]; })) - 40, maxx = Math.max.apply(null, xs.map(function (p) { return p[0]; })) + 40,
      miny = Math.min.apply(null, xs.map(function (p) { return p[1]; })) - 40, maxy = Math.max.apply(null, xs.map(function (p) { return p[1]; })) + 40, w = maxx - minx, hh = Math.max(maxy - miny, w * .32);
    var dd = r.mode === 'air' ? arc(keys[0], 'msk') : smooth(keys), first = xy(keys[0]), last = xy('msk');
    var gw = r.gw && GW_NAME[r.gw] ? GW_NAME[r.gw] : null, g = gw ? xy(gw[0]) : null;
    return '<svg class="rmini" viewBox="' + minx.toFixed(0) + ' ' + (miny - (hh - (maxy - miny)) / 2).toFixed(0) + ' ' + w.toFixed(0) + ' ' + hh.toFixed(0) + '" style="--u:' + (w / 600).toFixed(3) + '" aria-hidden="true">'
      + '' + land() + '<path class="rmini-r" d="' + dd + '" pathLength="1"/>'
      + '<circle class="rmini-a" cx="' + first[0].toFixed(1) + '" cy="' + first[1].toFixed(1) + '" r="' + (6 * w / 600).toFixed(1) + '"/><text class="rmini-t" x="' + first[0].toFixed(1) + '" y="' + (first[1] + 22 * w / 600).toFixed(1) + '" text-anchor="middle">' + nm(keys[0], l) + '</text>'
      + (g ? '<rect class="rmini-g" x="' + (g[0] - 5 * w / 600).toFixed(1) + '" y="' + (g[1] - 5 * w / 600).toFixed(1) + '" width="' + (10 * w / 600).toFixed(1) + '" height="' + (10 * w / 600).toFixed(1) + '" transform="rotate(45 ' + g[0].toFixed(1) + ' ' + g[1].toFixed(1) + ')"/><text class="rmini-t gw" x="' + g[0].toFixed(1) + '" y="' + (g[1] - 14 * w / 600).toFixed(1) + '" text-anchor="middle">' + gw.map(function (k) { return nm(k, l); }).join(' · ') + '</text>' : '')
      + '<circle class="rmini-b" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="' + (7 * w / 600).toFixed(1) + '"/><text class="rmini-t msk" x="' + last[0].toFixed(1) + '" y="' + (last[1] - 14 * w / 600).toFixed(1) + '" text-anchor="middle">' + nm('msk', l) + '</text></svg>';
  }

  window.IOMA_RMAP = { mount: mount, routeFor: routeFor, find: find, name: nm, cities: C, origins: ORIGINS, routeSvg: routeSvg, modeName: function (m, l) { return MODE_NAME[m] ? MODE_NAME[m][LI[l || lang()]] : m; }, ui: ui };
})();
