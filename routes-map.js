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
    // ещё города для расчёта ставки (на карте главной не рисуются): Китай, Тайвань, Япония, Корея и города России
    xz: ['Синьчжоу', 'Xinzhou', '忻州', 112.73, 38.42], ty: ['Тайюань', 'Taiyuan', '太原', 112.55, 37.87], hz: ['Ханчжоу', 'Hangzhou', '杭州', 120.16, 30.27], suz: ['Сучжоу', 'Suzhou', '苏州', 120.62, 31.3],
    nj: ['Нанкин', 'Nanjing', '南京', 118.8, 32.06], wh: ['Ухань', 'Wuhan', '武汉', 114.3, 30.59], cs: ['Чанша', 'Changsha', '长沙', 112.94, 28.23], xm: ['Сямэнь', 'Xiamen', '厦门', 118.09, 24.48],
    fs: ['Фошань', 'Foshan', '佛山', 113.12, 23.02], dg: ['Дунгуань', 'Dongguan', '东莞', 113.75, 23.02], dl: ['Далянь', 'Dalian', '大连', 121.61, 38.91],
    tpe: ['Тайбэй', 'Taipei', '台北', 121.56, 25.03], khh: ['Гаосюн', 'Kaohsiung', '高雄', 120.31, 22.62], tyo: ['Токио', 'Tokyo', '东京', 139.69, 35.69], osa: ['Осака', 'Osaka', '大阪', 135.5, 34.69],
    sel: ['Сеул', 'Seoul', '首尔', 126.98, 37.57], icn: ['Инчхон', 'Incheon', '仁川', 126.7, 37.46],
    perm: ['Пермь', 'Perm', '彼尔姆', 56.23, 58.01], ufa: ['Уфа', 'Ufa', '乌法', 55.96, 54.74], tmn: ['Тюмень', 'Tyumen', '秋明', 65.53, 57.15], vrn: ['Воронеж', 'Voronezh', '沃罗涅日', 39.2, 51.66], minsk: ['Минск', 'Minsk', '明斯克', 27.56, 53.9],
  };
  // из Тайваня, Японии и Кореи по суше не возят: ЖД и авто считаем как море до Владивостока + ЖД
  var OVERSEA = { tpe: 1, khh: 1, tyo: 1, osa: 1, sel: 1, icn: 1, pus: 1 };
  // точки в море (для пути судна)
  var SEA = { s1: [123.6, 30.6], s2: [126.2, 32.9], s3: [129.4, 34.2], s4: [131.0, 38.6], c1: [114.6, 21.8], c2: [117.6, 22.9], c3: [120.2, 25.0], c4: [122.6, 28.2], q1: [109.2, 20.9], q2: [110.6, 19.9], q3: [112.6, 21.2], d1: [122.8, 35.4],
    j1: [141.3, 37.4], j2: [141.0, 41.5], j3: [137.0, 42.3], j4: [132.2, 33.9], k1: [125.6, 36.4], k2: [126.2, 34.0], t1: [122.3, 25.7] };
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
        cn: { sh: ['sh', 's1', 's2', 's3', 's4', 'vvo'], nb: ['nb', 's1'], qd: ['qd', 'd1', 's2'], pus: ['pus', 's3'], gz: ['gz', 'c1', 'c2', 'c3', 'c4', 's1'], sz: ['sz', 'c1'], qz: ['qz', 'q1', 'q2', 'q3', 'c1'],
          tyo: ['tyo', 'j1', 'j2', 'j3', 'vvo'], osa: ['osa', 'j4', 's3'], sel: ['sel', 'icn'], icn: ['icn', 'k1', 'k2', 's3'], tpe: ['tpe', 't1', 'c4'], khh: ['khh', 'c3'] } },
    ],
    air: [{ id: 'air', gw: [], ru: ['msk'], air: ['bj', 'sh', 'gz', 'sz', 'cd', 'zz', 'xa', 'urc', 'hrb', 'qd', 'yw', 'cq'] }],
  };
  var GW_NAME = { zab: ['zab', 'mzl'], dos: ['dos', 'ala'], hor: ['hor'], nau: ['nau', 'erl'], kya: ['kya', 'erl'], pog: ['pog', 'sfh'], blg: ['blg', 'hh'], vvo: ['vvo'] };
  var MODE_NAME = { rail: ['ЖД', 'Rail', '铁路'], road: ['Авто', 'Truck', '公路'], air: ['Авиа', 'Air', '空运'], sea: ['Море + ЖД', 'Sea + rail', '海运 + 铁路'] };
  var UI = { km: ['км', 'km', '公里'], via: ['погранпереход', 'border crossing', '口岸'], calc: ['Рассчитать', 'Get a rate', '计算运费'], direct: ['прямой рейс', 'direct flight', '直飞'], toMsk: ['до Москвы', 'to Moscow', '至莫斯科'], seaThen: ['морем до Владивостока, дальше ЖД', 'by sea to Vladivostok, then rail', '海运至符拉迪沃斯托克，再铁路'],
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
      path = path.filter(function (k, i) { return !i || k !== path[i - 1]; });
      return { mode: mode, path: path, legs: legs, km: legs.reduce(function (s, l) { return s + l.km; }, 0), gw: cor.id };
    }
    return null;
  }
  // маршрут до любого города России: по Китаю — как до Москвы, от перехода (или Владивостока) — к городу назначения
  function routeTo(fromKey, toKey, mode) {
    mode = MODES[mode] ? mode : 'rail';
    if (OVERSEA[fromKey] && (mode === 'rail' || mode === 'road')) mode = 'sea';
    if (!toKey || toKey === 'msk') { var r0 = routeFor(fromKey, mode); if (r0 || !C[fromKey]) return r0; toKey = 'msk'; }
    if (!C[fromKey] || !C[toKey]) return routeFor(fromKey, mode);
    if (mode === 'air') { var d0 = Math.round(hav(ll(fromKey), ll(toKey)) / 10) * 10; return { mode: mode, path: [fromKey, toKey], legs: [{ kind: 'air', km: d0 }], km: d0, gw: null, to: toKey }; }
    // для городов не в Москве выбираем переход, через который ближе всего (Иркутск — через Забайкальск, а не через Казахстан)
    var best = null, far = false;
    function each(cor) {
      var p = chain(cor, fromKey);
      // город не на коридоре: подъезд к ближайшему городу коридора (не дальше 1500 км, иначе коридор не подходит)
      if (p.length < 2) { var starts = Object.keys(cor.cn || {}).map(function (k) { return cor.cn[k][0]; }); if (!starts.length) return; var k0 = starts.sort(function (a, b) { return hav(ll(fromKey), ll(a)) - hav(ll(fromKey), ll(b)); })[0]; if (!far && hav(ll(fromKey), ll(k0)) > 1500) return; p = [fromKey].concat(chain(cor, k0)); if (p.length < 2) return; }
      var mid = cor.mid ? cor.mid.slice() : null, entry = cor.ru[0], legs = [];
      if (cor.sea) legs.push({ kind: 'sea', km: km(p, 1.08) }); else { legs.push({ kind: 'china', km: km(p, 1.25) }); if (mid) legs.push({ kind: 'transit', km: km(mid, 1.25) }); }
      // по России: город на магистрали — режем путь на нём; запад (Петербург, юг) — через Москву; Сибирь и Дальний Восток — от перехода напрямую
      // по России: город на магистрали — режем путь на нём; иначе — по магистрали до ближайшего к нему города и дальше к нему
      var ru = cor.ru, at = ru.indexOf(toKey), ruPath, ruKm, trunk = function (j) { return j === ru.length - 1 && mode !== 'road' && TRUNK_KM[cor.id] ? TRUNK_KM[cor.id] : km(ru.slice(0, j + 1), 1.25); };
      if (at >= 0) { ruPath = ru.slice(0, at + 1); ruKm = at ? trunk(at) : 0; }
      else { var j = 0; ru.forEach(function (k, i) { if (hav(ll(k), ll(toKey)) < hav(ll(ru[j]), ll(toKey))) j = i; }); if (!far && hav(ll(ru[j]), ll(toKey)) > 1200) return; ruPath = ru.slice(0, j + 1).concat([toKey]); ruKm = (j ? trunk(j) : 0) + km([ru[j], toKey], 1.25); }
      legs.push({ kind: cor.sea ? 'rail' : 'ru', km: ruKm });
      var total = legs.reduce(function (s, l) { return s + l.km; }, 0);
      var path = p.concat(mid ? mid.slice(1) : []).concat(ruPath.slice(cor.sea || mid ? 1 : 0));
      path = path.filter(function (k, i) { return !i || k !== path[i - 1]; });
      if (!best || total < best.km) best = { mode: mode, path: path, legs: legs, km: total, gw: cor.id, to: toKey };
    }
    MODES[mode].forEach(each);
    if (!best) { far = true; MODES[mode].forEach(each); }
    return best || routeFor(fromKey, mode);
  }
  // поиск города по названию на любом языке
  var ALIAS = { yw: ['yiwu', 'иу', 'iwu'], tpe: ['taibei', 'тайпей'], tyo: ['токио', 'tokio', 'yokohama', 'йокогама'], sel: ['seoul', 'сеул'], icn: ['incheon', 'инчон'], spb: ['спб', 'питер', 'saint petersburg', 'санкт петербург'], msk: ['мск'], sh: ['shanghai', 'шанхай'], sz: ['shenzhen', 'шэньчжэнь', 'шеньчжень', 'шэньжэнь'], gz: ['guangzhou', 'гуанчжоу', 'кантон', 'canton'], xa: ['xian', "xi'an", 'сиань'], qz: ['qinzhou', 'циньчжоу'], pus: ['busan', 'pusan', 'пусан'] };
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
  // точки на карте главной: все крупные города Китая (откуда) и города России (куда)
  var CN_DOTS = ['bj', 'tj', 'sy', 'hrb', 'dl', 'qd', 'sh', 'nb', 'yw', 'hz', 'nj', 'wh', 'cs', 'zz', 'xa', 'ty', 'xz', 'lz', 'cd', 'cq', 'gz', 'sz', 'xm', 'qz', 'urc', 'pus', 'icn', 'osa', 'tyo', 'tpe']; // и Корея, Япония, Тайвань — только море или авиа
  var RU_DOTS = ['msk', 'spb', 'nnov', 'kzn', 'sam', 'ufa', 'perm', 'ekb', 'chel', 'tmn', 'omsk', 'nsk', 'krs', 'irk', 'ulu', 'chita', 'khb', 'vvo', 'krd', 'rnd', 'vrn'];
  var DEMO = ['yw', 'sh', 'gz', 'bj', 'cd', 'sz', 'qd', 'urc', 'cq', 'hz'];
  // значки транспорта (24×24, линии)
  var ICON = {
    rail: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9.5 20l-1.5-4M14.5 20l1.5-4"/><circle cx="9.5" cy="13" r=".7"/><circle cx="14.5" cy="13" r=".7"/>',
    road: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7"/><circle cx="6.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    air: '<path d="M21 12.6l-7.2-3V5a1.8 1.8 0 00-3.6 0v4.6L3 12.6v2l7.2-1.8v4l-2.1 1.5V20l3.9-1 3.9 1v-1.7l-2.1-1.5v-4l7.2 1.8z"/>',
    sea: '<path d="M3 15.5l1.8 3.5h14.4l1.8-3.5zM6 15.5V10h12v5.5M9 10V6.5h6V10M12 3.5v3"/>'
  };
  var ICON_I = { rail: 'rail', road: 'road', air: 'air', sea: 'sea' };
  var KM = { kz: ['Казахстан и Россия', 'Kazakhstan and Russia', '哈萨克斯坦和俄罗斯'], all: ['всего', 'total', '合计'], pick: ['Выберите город в Китае и город в России — маршрут построится сам', 'Pick a city in China and a city in Russia — the route builds itself', '在地图上选择中国城市和俄罗斯城市，即可显示路线'],
    via2: ['Путь', 'Route', '路径'], from: ['Откуда', 'From', '起运地'], to: ['Куда', 'To', '目的地'] };
  function kmT(k, l) { return KM[k][LI[l || lang()]]; }
  function legLabel(r, x, l) {
    if (x.kind === 'china') return ui('china', l); if (x.kind === 'transit') return ui('transit', l) + (r.gw === 'nau' || r.gw === 'kya' ? ' · ' + nm('uba', l) : '');
    if (x.kind === 'ru') return r.gw === 'dos' || r.gw === 'hor' ? kmT('kz', l) : ui('ru', l);
    return x.kind === 'sea' ? ui('seaLeg', l) : x.kind === 'rail' ? ui('railLeg', l) : ui('air', l);
  }

  function mount(el, opts) {
    opts = opts || {};
    var state = { mode: opts.mode || 'rail', from: opts.from || 'yw', to: opts.to || 'msk', auto: !!opts.auto, timer: 0, demo: 0 };
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    el.classList.add('rmap');
    el.innerHTML = '<div class="rmap-top"><div class="rmap-tabs" role="tablist"></div><p class="rmap-hint"></p></div><div class="rmap-stage"><svg class="rmap-svg" viewBox="' + VB.join(' ') + '" preserveAspectRatio="xMidYMid meet" role="img"></svg></div><div class="rmap-info" aria-live="polite"></div>';
    var svg = el.querySelector('svg'), tabs = el.querySelector('.rmap-tabs'), info = el.querySelector('.rmap-info'), hint = el.querySelector('.rmap-hint');
    var U = 1;
    // единиц карты на пиксель экрана — с учётом того, что карта может упираться в высоту
    function unit() { var r = svg.getBoundingClientRect(); if (!r.width) return U; return Math.max(W / r.width, H / (r.height || r.width * H / W)); }
    // на главной карта не выше, чем остаётся места в первом экране (без прокрутки страницы)
    function fit() {
      var box = opts.fitTo; if (!box) return;
      if (window.innerWidth <= 900) { svg.style.maxHeight = ''; return; }
      var other = el.getBoundingClientRect().height - svg.getBoundingClientRect().height, avail = Math.floor(box.clientHeight - other - 2); if (avail > 0) svg.style.maxHeight = Math.max(180, avail) + 'px';
    }
    function scale() { fit(); var u = unit(); el.style.setProperty('--u', u.toFixed(3)); el.classList.toggle('rmap-sm', svg.getBoundingClientRect().width < 520); if (Math.abs(u - U) / U > .1) { U = u; draw(); } }
    function drawTabs() { var l = lang(); tabs.innerHTML = ['rail', 'road', 'air', 'sea'].map(function (m) { return '<button type="button" role="tab" data-m="' + m + '" aria-selected="' + (m === state.mode) + '"' + (m === state.mode ? ' class="on"' : '') + '>' + MODE_NAME[m][LI[l]] + '</button>'; }).join('') + '<i class="rmap-ind"></i>'; moveInd(); hint.textContent = kmT('pick', l); }
    function moveInd() { var b = tabs.querySelector('.on'), i = tabs.querySelector('.rmap-ind'); if (b && i) { i.style.width = b.offsetWidth + 'px'; i.style.transform = 'translateX(' + b.offsetLeft + 'px)'; } }
    function f(n) { return n.toFixed(1); }
    var NEAR = {};
    function near(k) { if (NEAR[k] != null) return NEAR[k]; var p = xy(k), m = Infinity; RU_DOTS.concat(CN_DOTS).forEach(function (o) { if (o === k) return; var q = xy(o), d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < m) m = d; }); return (NEAR[k] = m); }
    function route() { return routeTo(state.from, state.to, state.mode); }
    // подписи выбранных точек: пробуем справа, слева, сверху, снизу — берём место, где не налезает на другие подписи
    function labels(items) {
      var boxes = [], out = '';
      items.forEach(function (it) {
        var p = xy(it.k), fs = it.fs * U, w = it.t.length * fs * .56, h = fs * 1.25 * (it.lines || 1), g = 9 * U, cands = it.prefer || ['r', 'l', 't', 'b'], best = null;
        cands.concat(['r', 'l', 't', 'b']).some(function (c) {
          var x = c === 'r' ? p[0] + g : c === 'l' ? p[0] - g - w : p[0] - w / 2, y = c === 't' ? p[1] - g - h : c === 'b' ? p[1] + g : p[1] - h / 2;
          x = Math.max(VB[0] + 2 * U, Math.min(VB[0] + W - w - 2 * U, x)); y = Math.max(VB[1] + 2 * U, Math.min(VB[1] + H - h - 2 * U, y));
          var bx = { x: x, y: y, w: w, h: h }, hit = boxes.some(function (o) { return !(bx.x + bx.w < o.x || o.x + o.w < bx.x || bx.y + bx.h < o.y || o.y + o.h < bx.y); });
          if (!best) best = bx; if (!hit) { best = bx; return true; } return false;
        });
        boxes.push(best);
        var lines = it.t.split('\n');
        out += '<text class="' + it.cls + '" x="' + f(best.x) + '" y="' + f(best.y + fs) + '" style="font-size:' + f(fs) + 'px">' + lines.map(function (ln, i) { return '<tspan x="' + f(best.x) + '" dy="' + (i ? '1.2em' : '0') + '">' + ln + '</tspan>'; }).join('') + '</text>';
      });
      return out;
    }
    function veh(pathD, kind, dur, delay) {
      if (reduce) return '';
      return '<g class="rm-veh rm-veh-' + kind + '"><animateMotion dur="' + dur + 's" repeatCount="indefinite" begin="' + delay + 's" path="' + pathD + '" calcMode="linear"/>'
        + '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.92;1" dur="' + dur + 's" begin="' + delay + 's" repeatCount="indefinite"/>'
        + '<g transform="scale(' + U.toFixed(3) + ')"><circle class="rm-veh-b" r="12.5"/><g transform="translate(-8.4 -8.4) scale(.7)" class="rm-veh-i">' + ICON[kind] + '</g></g></g>';
    }
    function draw() {
      var l = lang(), r = route(), h = '';
      h += '<defs><linearGradient id="rmG" x1="1" y1="0" x2="0" y2="0"><stop offset="0" style="stop-color:var(--ui-o1,#F28A3A)"/><stop offset="1" style="stop-color:var(--ui-o2,#E06A2C)"/></linearGradient></defs>';
      h += land();
      // все точки: Россия — куда, Китай — откуда. Зона нажатия не больше половины расстояния до соседа,
      // чтобы соседние города (Гуанчжоу и Шэньчжэнь, Шанхай и Ханчжоу) не перекрывали друг друга
      function dot(k, side, on) { var p = xy(k), r = Math.max(3.2 * U, Math.min(9 * U, near(k) / 2)); return '<g class="rm-pt rm-' + side + (on ? ' on' : '') + '" data-' + side + '="' + k + '" tabindex="0" role="button" aria-label="' + nm(k, l) + '"><circle class="rm-hit" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(r) + '"/><circle class="rm-c" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f((on ? 5 : 2.6) * U) + '"/></g>'; }
      // выбранные точки рисуем последними — они поверх соседних
      RU_DOTS.filter(function (k) { return k !== state.to; }).forEach(function (k) { h += dot(k, 'to', false); });
      CN_DOTS.filter(function (k) { return k !== state.from; }).forEach(function (k) { h += dot(k, 'from', false); });
      var lbl = [];
      if (r) {
        var keys = r.path, vi = keys.indexOf('vvo'), seaSplit = r.mode === 'sea' && vi > 0 && vi < keys.length - 1;
        var full = r.mode === 'air' ? arc(keys[0], keys[keys.length - 1]) : smooth(keys);
        h += '<path class="rm-track" d="' + full + '"/>';
        if (seaSplit) { var dSea = smooth(keys.slice(0, vi + 1)), dRail = smooth(keys.slice(vi)); h += '<path class="rm-route rm-sea" d="' + dSea + '" pathLength="1"/><path class="rm-route" d="' + dRail + '" pathLength="1" style="animation-delay:.5s"/>' + veh(dSea, 'sea', 6, 0) + veh(dRail, 'rail', 7.5, 1.5); }
        else { h += '<path class="rm-route' + (r.mode === 'sea' ? ' rm-sea' : '') + (r.mode === 'air' ? ' rm-air' : '') + '" d="' + full + '" pathLength="1"/>' + veh(full, ICON_I[r.mode], r.mode === 'air' ? 6 : 9, 0); }
        if (r.gw && GW_NAME[r.gw] && r.mode !== 'air') { var gk = GW_NAME[r.gw][0], gp2 = xy(gk); h += '<rect class="rm-gw" x="' + f(gp2[0] - 4.5 * U) + '" y="' + f(gp2[1] - 4.5 * U) + '" width="' + f(9 * U) + '" height="' + f(9 * U) + '" transform="rotate(45 ' + f(gp2[0]) + ' ' + f(gp2[1]) + ')"/>'; lbl.push({ k: gk, t: GW_NAME[r.gw].map(function (x) { return nm(x, l); }).join('\n'), cls: 'rm-l rm-l-gw', fs: 11.5, lines: GW_NAME[r.gw].length, prefer: ['r', 'b'] }); }
      }
      if (C[state.to]) h += dot(state.to, 'to', true); if (C[state.from]) h += dot(state.from, 'from', true);
      lbl.unshift({ k: state.to, t: nm(state.to, l), cls: 'rm-l rm-l-to', fs: 15, prefer: ['l', 't'] }, { k: state.from, t: nm(state.from, l), cls: 'rm-l rm-l-from', fs: 14, prefer: ['r', 'b', 'l'] });
      h += labels(lbl) + '<text class="rm-l rm-hov" visibility="hidden"></text>';
      svg.innerHTML = h; svg.setAttribute('aria-label', nm(state.from, l) + ' → ' + nm(state.to, l) + ', ' + MODE_NAME[state.mode][LI[l]]);
      el.dataset.mode = state.mode; panel(r); fit();
    }
    function panel(r) {
      var l = lang(), loc = l === 'ru' ? 'ru-RU' : 'en-US';
      if (!r) { info.innerHTML = '<div class="rmap-od"><b>' + nm(state.from, l) + ' → ' + nm(state.to, l) + '</b><small>—</small></div>'; return; }
      var g = r.gw && GW_NAME[r.gw] ? GW_NAME[r.gw].map(function (x) { return nm(x, l); }).join(' · ') : '';
      var sub = MODE_NAME[r.mode][LI[l]] + (r.mode === 'air' ? ' · ' + ui('direct', l) : g ? ' · ' + ui('via', l) + ' ' + g : '');
      var hubs = r.path.filter(function (k) { return C[k]; }).map(function (k) { return nm(k, l); }).join(' — ');
      info.innerHTML = '<div class="rmap-od"><b>' + nm(state.from, l) + ' <i>→</i> ' + nm(state.to, l) + '</b><small>' + sub + '</small></div>'
        + '<div class="rmap-km">' + r.legs.filter(function (x) { return x.km > 0; }).map(function (x) { return '<span class="k-' + x.kind + '"><small>' + legLabel(r, x, l) + '</small><b>≈ ' + x.km.toLocaleString(loc) + ' ' + ui('km', l) + '</b></span>'; }).join('')
        + (r.legs.length > 1 ? '<span class="tot"><small>' + kmT('all', l) + '</small><b>≈ ' + r.km.toLocaleString(loc) + ' ' + ui('km', l) + '</b></span>' : '') + '</div>'
        + '<button type="button" class="rmap-go">' + ui('calc', l) + '</button>' + rec(l)
        + (r.mode !== 'air' ? '<p class="rmap-path" title="' + hubs + '">' + kmT('via2', l) + ': ' + hubs + '</p>' : '');
    }
    // рекомендация: сборный груз и полный контейнер (route-advice.js)
    function rec(l) {
      var A = window.IOMA_ADVICE; if (!A) return '';
      var q = function (w, v) { return A.advise({ from: nm(state.from, 'ru'), to: nm(state.to, 'ru'), fromLL: ll(state.from), toLL: ll(state.to), weight: w, volume: v, lang: l }); };
      var a = q(800, 4), b = q(20000, 60); if (!a.ok || !b.ok) return '';
      var M = { auto: 'road', rail: 'rail', sea: 'sea', air: 'air' }, X = A.text[a.lang];
      var one = function (lbl, o) { return '<button type="button" data-recm="' + M[o.mode] + '" title="' + (o.why[0] || '') + '"><small>' + lbl + '</small><b>' + o.title + '</b><em>' + o.days[0] + '–' + o.days[1] + ' ' + X.days + '</em></button>'; };
      var en = a.lang === 'en';
      return '<div class="rmap-rec"><span>' + (en ? 'Best way' : 'Как лучше') + '</span>' + one(en ? 'Groupage' : 'Сборный груз', a.options[0]) + one(en ? 'Full container' : 'Контейнер', b.options[0]) + '</div>';
    }
    function setMode(m, user) { if (!MODES[m]) return; state.mode = m; if (user) stopAuto(); drawTabs(); draw(); if (opts.onMode) opts.onMode(m); }
    function setFrom(k, user) { if (!C[k]) return; state.from = k; if (user) stopAuto(); draw(); }
    function setTo(k, user) { if (!C[k]) return; state.to = k; if (user) stopAuto(); draw(); }
    function stopAuto() { state.auto = false; clearInterval(state.timer); el.classList.add('rmap-user'); }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m, true); });
    function pick(t) { var g = t.closest && t.closest('.rm-pt'); if (!g) return false; if (g.dataset.from) setFrom(g.dataset.from, true); else setTo(g.dataset.to, true); return true; }
    svg.addEventListener('click', function (e) { pick(e.target); });
    svg.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && pick(e.target)) e.preventDefault(); });
    // подсказка с названием — одна, у точки под курсором
    svg.addEventListener('mouseover', function (e) {
      var g = e.target.closest && e.target.closest('.rm-pt'), t = svg.querySelector('.rm-hov'); if (!t) return;
      if (!g || g.classList.contains('on')) { t.setAttribute('visibility', 'hidden'); return; }
      var k = g.dataset.from || g.dataset.to, p = xy(k), fs = 12.5 * U, nmTxt = nm(k), w = nmTxt.length * fs * .56, x = p[0] + 9 * U; if (x + w > VB[0] + W) x = p[0] - 9 * U - w;
      t.textContent = nmTxt; t.setAttribute('x', f(x)); t.setAttribute('y', f(p[1] - 6 * U)); t.style.fontSize = f(fs) + 'px'; t.setAttribute('visibility', 'visible');
    });
    svg.addEventListener('mouseleave', function () { var t = svg.querySelector('.rm-hov'); if (t) t.setAttribute('visibility', 'hidden'); });
    info.addEventListener('click', function (e) { var rb = e.target.closest('[data-recm]'); if (rb) { setMode(rb.dataset.recm, true); return; } if (e.target.closest('.rmap-go') && opts.onPick) opts.onPick(state.from, state.mode, nm(state.from, 'ru'), state.to, nm(state.to, 'ru')); });
    var drawnLang = lang(); new MutationObserver(function () { if (lang() === drawnLang) return; drawnLang = lang(); drawTabs(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('resize', function () { scale(); moveInd(); });
    if (window.ResizeObserver) new ResizeObserver(function () { scale(); moveInd(); }).observe(svg);
    drawTabs(); U = unit() || 1; draw(); scale();
    // пока гость не выбрал сам — раз в 6 секунд показываем другой город Китая
    if (state.auto) state.timer = setInterval(function () { if (document.hidden || el.matches(':hover')) return; state.demo = (state.demo + 1) % DEMO.length; state.from = DEMO[state.demo]; draw(); }, 6500);
    return { setMode: setMode, setFrom: setFrom, setTo: setTo, stopAuto: stopAuto, get state() { return state; } };
  }

  // путь для маленькой карты маршрута (расчёт ставки): только выбранный маршрут
  // o.aspect — пропорции рамки (ширина/высота), o.px — ширина на экране: подписи и точки одного размера на любой карте
  function routeSvg(r, l, o) {
    l = l || lang(); o = o || {}; if (!r) return '';
    var A = o.aspect || 1.9, px = o.px > 60 ? o.px : 600, keys = r.path, xs = keys.map(xy);
    var x0 = Math.min.apply(null, xs.map(function (p) { return p[0]; })), x1 = Math.max.apply(null, xs.map(function (p) { return p[0]; })),
      y0 = Math.min.apply(null, xs.map(function (p) { return p[1]; })), y1 = Math.max.apply(null, xs.map(function (p) { return p[1]; }));
    function fit(pad) { var w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad; if (w / h < A) w = h * A; else h = w / A; return { x: (x0 + x1 - w) / 2, y: (y0 + y1 - h) / 2, w: w, h: h }; }
    var b = fit(10), k = b.w / px; b = fit(Math.max(78 * k, 16)); k = b.w / px; // поля под подписи: ~78 пикселей экрана
    var dest = keys[keys.length - 1], dd = r.mode === 'air' ? arc(keys[0], dest) : smooth(keys), first = xy(keys[0]), last = xy(dest);
    var gw = r.gw && GW_NAME[r.gw] ? GW_NAME[r.gw] : null, g = gw ? xy(gw[0]) : null, f = function (n) { return n.toFixed(1); }, ge = g && g[0] > b.x + b.w * .58;
    return '<svg class="rmini" viewBox="' + f(b.x) + ' ' + f(b.y) + ' ' + f(b.w) + ' ' + f(b.h) + '" style="--u:' + k.toFixed(3) + '" aria-hidden="true">'
      + land() + '<path class="rmini-r" d="' + dd + '" pathLength="1"/>'
      + (g ? '<rect class="rmini-g" x="' + f(g[0] - 4.5 * k) + '" y="' + f(g[1] - 4.5 * k) + '" width="' + f(9 * k) + '" height="' + f(9 * k) + '" transform="rotate(45 ' + f(g[0]) + ' ' + f(g[1]) + ')"/><text class="rmini-t gw" x="' + f(g[0] + (ge ? -11 : 11) * k) + '" y="' + f(g[1] + 4 * k) + '" text-anchor="' + (ge ? 'end' : 'start') + '">' + gw.map(function (x) { return nm(x, l); }).join(' · ') + '</text>' : '')
      + '<circle class="rmini-a" cx="' + f(first[0]) + '" cy="' + f(first[1]) + '" r="' + f(5.5 * k) + '"/><text class="rmini-t" x="' + f(first[0]) + '" y="' + f(first[1] + 21 * k) + '" text-anchor="middle">' + nm(keys[0], l) + '</text>'
      + '<circle class="rmini-b" cx="' + f(last[0]) + '" cy="' + f(last[1]) + '" r="' + f(6.5 * k) + '"/><text class="rmini-t msk" x="' + f(last[0]) + '" y="' + f(last[1] - 14 * k) + '" text-anchor="middle">' + nm(dest, l) + '</text></svg>';
  }

  window.IOMA_RMAP = { mount: mount, routeFor: routeFor, routeTo: routeTo, find: find, name: nm, cities: C, origins: ORIGINS, routeSvg: routeSvg, gwNames: function (id, l) { return (GW_NAME[id] || []).map(function (k) { return nm(k, l); }); }, gwKeys: function (id) { return (GW_NAME[id] || []).slice(); }, modeName: function (m, l) { return MODE_NAME[m] ? MODE_NAME[m][LI[l || lang()]] : m; }, ui: ui };
})();
