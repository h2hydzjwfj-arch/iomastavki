/* IOMASTAVKA — какой маршрут выбрать: Китай, Корея, Япония, Тайвань, Вьетнам → любой город России.
   Логика как у логиста: откуда (регион Китая или страна), куда (часть России), сколько груза и что важнее (цена, срок).
   Сроки — ориентиры «от двери до двери» по открытым данным перевозчиков и экспедиторов 2026 г. (FESCO, РЖД Логистика,
   отраслевые обзоры): авто через Казахстан до Москвы 16–24 дн., ЖД 25–35, море до Владивостока + ЖД 35–50, авиа 3–7.
   Работает и в браузере (window.IOMA_ADVICE), и на сервере (require). */
(function (root) {
  'use strict';

  // ---------- города: [долгота, широта, страна]; ключи — как пишут в поле «Откуда/Куда» (нижний регистр, без «г.»)
  var CITY = {
    // Россия
    'москва': [37.62, 55.75, 'RU'], 'санкт-петербург': [30.32, 59.94, 'RU'], 'питер': [30.32, 59.94, 'RU'], 'спб': [30.32, 59.94, 'RU'], 'калининград': [20.51, 54.71, 'RU'],
    'нижний новгород': [44.0, 56.33, 'RU'], 'н. новгород': [44.0, 56.33, 'RU'], 'казань': [49.1, 55.8, 'RU'], 'самара': [50.15, 53.2, 'RU'], 'тольятти': [49.42, 53.51, 'RU'], 'саратов': [46.03, 51.53, 'RU'],
    'волгоград': [44.5, 48.71, 'RU'], 'ульяновск': [48.4, 54.32, 'RU'], 'пенза': [45.0, 53.2, 'RU'], 'ижевск': [53.2, 56.85, 'RU'], 'набережные челны': [52.4, 55.74, 'RU'], 'чебоксары': [47.25, 56.13, 'RU'],
    'екатеринбург': [60.6, 56.84, 'RU'], 'челябинск': [61.4, 55.16, 'RU'], 'магнитогорск': [58.98, 53.41, 'RU'], 'тюмень': [65.53, 57.15, 'RU'], 'курган': [65.34, 55.44, 'RU'], 'пермь': [56.23, 58.01, 'RU'],
    'уфа': [55.96, 54.74, 'RU'], 'оренбург': [55.1, 51.77, 'RU'], 'сургут': [73.4, 61.25, 'RU'], 'омск': [73.37, 54.99, 'RU'], 'новосибирск': [82.92, 55.03, 'RU'], 'томск': [84.95, 56.48, 'RU'],
    'барнаул': [83.78, 53.35, 'RU'], 'кемерово': [86.09, 55.35, 'RU'], 'новокузнецк': [87.12, 53.76, 'RU'], 'красноярск': [92.87, 56.01, 'RU'], 'иркутск': [104.3, 52.29, 'RU'], 'улан-удэ': [107.6, 51.83, 'RU'],
    'чита': [113.5, 52.03, 'RU'], 'якутск': [129.73, 62.03, 'RU'], 'благовещенск': [127.53, 50.29, 'RU'], 'хабаровск': [135.07, 48.48, 'RU'], 'владивосток': [131.89, 43.12, 'RU'], 'уссурийск': [131.95, 43.8, 'RU'],
    'находка': [132.87, 42.82, 'RU'], 'комсомольск-на-амуре': [137.0, 50.55, 'RU'], 'южно-сахалинск': [142.73, 46.96, 'RU'], 'петропавловск-камчатский': [158.65, 53.02, 'RU'], 'магадан': [150.8, 59.57, 'RU'],
    'воронеж': [39.2, 51.66, 'RU'], 'тула': [37.62, 54.19, 'RU'], 'ярославль': [39.89, 57.63, 'RU'], 'рязань': [39.74, 54.63, 'RU'], 'калуга': [36.26, 54.51, 'RU'], 'тверь': [35.9, 56.86, 'RU'],
    'владимир': [40.41, 56.13, 'RU'], 'иваново': [40.97, 57.0, 'RU'], 'липецк': [39.6, 52.61, 'RU'], 'белгород': [36.59, 50.6, 'RU'], 'курск': [36.19, 51.73, 'RU'], 'брянск': [34.36, 53.24, 'RU'],
    'смоленск': [32.05, 54.78, 'RU'], 'орёл': [36.07, 52.97, 'RU'], 'орел': [36.07, 52.97, 'RU'], 'тамбов': [41.45, 52.72, 'RU'], 'кострома': [40.93, 57.77, 'RU'],
    'вологда': [39.89, 59.22, 'RU'], 'архангельск': [40.52, 64.54, 'RU'], 'мурманск': [33.08, 68.97, 'RU'], 'петрозаводск': [34.35, 61.79, 'RU'], 'великий новгород': [31.27, 58.52, 'RU'], 'псков': [28.33, 57.82, 'RU'],
    'ростов-на-дону': [39.7, 47.23, 'RU'], 'ростов': [39.7, 47.23, 'RU'], 'краснодар': [38.98, 45.04, 'RU'], 'новороссийск': [37.77, 44.72, 'RU'], 'сочи': [39.72, 43.6, 'RU'], 'ставрополь': [41.97, 45.04, 'RU'],
    'астрахань': [48.03, 46.35, 'RU'], 'махачкала': [47.5, 42.98, 'RU'], 'минеральные воды': [43.13, 44.21, 'RU'], 'симферополь': [34.1, 44.95, 'RU'], 'севастополь': [33.52, 44.62, 'RU'],
    // Китай
    'иу': [120.07, 29.31, 'CN'], 'шанхай': [121.47, 31.23, 'CN'], 'нинбо': [121.55, 29.87, 'CN'], 'ханчжоу': [120.16, 30.27, 'CN'], 'сучжоу': [120.62, 31.3, 'CN'], 'нанкин': [118.8, 32.06, 'CN'],
    'вэньчжоу': [120.7, 28.0, 'CN'], 'цзиньхуа': [119.65, 29.08, 'CN'], 'уси': [120.3, 31.57, 'CN'], 'хэфэй': [117.23, 31.82, 'CN'], 'циндао': [120.38, 36.07, 'CN'], 'цзинань': [117.0, 36.67, 'CN'], 'линьи': [118.36, 35.1, 'CN'],
    'пекин': [116.4, 39.9, 'CN'], 'тяньцзинь': [117.2, 39.13, 'CN'], 'шицзячжуан': [114.51, 38.04, 'CN'], 'баодин': [115.46, 38.87, 'CN'], 'тайюань': [112.55, 37.87, 'CN'], 'синьчжоу': [112.73, 38.42, 'CN'], 'хух-хото': [111.67, 40.82, 'CN'],
    'баотоу': [109.84, 40.66, 'CN'], 'эрлянь': [111.98, 43.65, 'CN'], 'маньчжурия': [117.43, 49.6, 'CN'], 'шэньян': [123.43, 41.8, 'CN'], 'далянь': [121.61, 38.91, 'CN'], 'чанчунь': [125.32, 43.82, 'CN'],
    'харбин': [126.63, 45.75, 'CN'], 'муданьцзян': [129.6, 44.58, 'CN'], 'суйфэньхэ': [131.15, 44.4, 'CN'], 'хэйхэ': [127.49, 50.24, 'CN'], 'хуньчунь': [130.37, 42.87, 'CN'],
    'чжэнчжоу': [113.62, 34.75, 'CN'], 'ухань': [114.3, 30.59, 'CN'], 'чанша': [112.94, 28.23, 'CN'], 'наньчан': [115.86, 28.68, 'CN'], 'сиань': [108.94, 34.34, 'CN'], 'ланьчжоу': [103.83, 36.06, 'CN'],
    'синин': [101.78, 36.62, 'CN'], 'иньчуань': [106.23, 38.49, 'CN'], 'урумчи': [87.62, 43.83, 'CN'], 'кашгар': [75.99, 39.47, 'CN'], 'хоргос': [80.42, 44.2, 'CN'], 'алашанькоу': [82.58, 45.17, 'CN'],
    'чэнду': [104.07, 30.67, 'CN'], 'чунцин': [106.55, 29.56, 'CN'], 'гуйян': [106.63, 26.65, 'CN'], 'куньмин': [102.83, 24.88, 'CN'], 'наньнин': [108.37, 22.82, 'CN'], 'циньчжоу': [108.62, 21.95, 'CN'],
    'гуанчжоу': [113.26, 23.13, 'CN'], 'шэньчжэнь': [114.06, 22.54, 'CN'], 'фошань': [113.12, 23.02, 'CN'], 'дунгуань': [113.75, 23.02, 'CN'], 'чжуншань': [113.39, 22.52, 'CN'], 'чжухай': [113.58, 22.27, 'CN'],
    'шаньтоу': [116.68, 23.35, 'CN'], 'сямэнь': [118.09, 24.48, 'CN'], 'фучжоу': [119.3, 26.08, 'CN'], 'цюаньчжоу': [118.68, 24.87, 'CN'], 'гонконг': [114.17, 22.32, 'CN'], 'хайкоу': [110.33, 20.03, 'CN'],
    // Корея, Япония, Тайвань
    'пусан': [129.08, 35.18, 'KR'], 'сеул': [126.98, 37.57, 'KR'], 'инчхон': [126.7, 37.46, 'KR'], 'тэгу': [128.6, 35.87, 'KR'], 'ульсан': [129.31, 35.54, 'KR'], 'кванджу': [126.85, 35.16, 'KR'], 'пхёнтхэк': [126.99, 36.99, 'KR'],
    'токио': [139.69, 35.69, 'JP'], 'йокогама': [139.64, 35.44, 'JP'], 'осака': [135.5, 34.69, 'JP'], 'нагоя': [136.91, 35.18, 'JP'], 'кобе': [135.2, 34.69, 'JP'], 'тояма': [137.21, 36.7, 'JP'], 'ниигата': [139.02, 37.92, 'JP'], 'фукуока': [130.4, 33.59, 'JP'],
    'тайбэй': [121.56, 25.03, 'TW'], 'гаосюн': [120.31, 22.62, 'TW'], 'тайчжун': [120.68, 24.15, 'TW'],
    // Вьетнам и Юго-Восточная Азия, Индия
    'ханой': [105.85, 21.03, 'VN'], 'хайфон': [106.68, 20.86, 'VN'], 'хошимин': [106.63, 10.82, 'VN'], 'дананг': [108.2, 16.05, 'VN'],
    'бангкок': [100.5, 13.75, 'TH'], 'сингапур': [103.82, 1.35, 'SG'], 'куала-лумпур': [101.69, 3.14, 'MY'], 'порт-кланг': [101.39, 3.0, 'MY'], 'джакарта': [106.85, -6.21, 'ID'],
    'мумбаи': [72.88, 19.08, 'IN'], 'нью-дели': [77.21, 28.61, 'IN'], 'дели': [77.21, 28.61, 'IN'], 'ченнаи': [80.27, 13.08, 'IN']
  };
  var EN = { yiwu: 'иу', shanghai: 'шанхай', ningbo: 'нинбо', hangzhou: 'ханчжоу', suzhou: 'сучжоу', nanjing: 'нанкин', qingdao: 'циндао', beijing: 'пекин', tianjin: 'тяньцзинь', shenyang: 'шэньян', dalian: 'далянь',
    harbin: 'харбин', zhengzhou: 'чжэнчжоу', wuhan: 'ухань', changsha: 'чанша', "xi'an": 'сиань', xian: 'сиань', urumqi: 'урумчи', chengdu: 'чэнду', chongqing: 'чунцин', guangzhou: 'гуанчжоу', shenzhen: 'шэньчжэнь',
    foshan: 'фошань', dongguan: 'дунгуань', xiamen: 'сямэнь', fuzhou: 'фучжоу', qinzhou: 'циньчжоу', kunming: 'куньмин', 'hong kong': 'гонконг', busan: 'пусан', pusan: 'пусан', seoul: 'сеул', incheon: 'инчхон',
    tokyo: 'токио', yokohama: 'йокогама', osaka: 'осака', nagoya: 'нагоя', taipei: 'тайбэй', kaohsiung: 'гаосюн', hanoi: 'ханой', haiphong: 'хайфон', 'ho chi minh': 'хошимин', saigon: 'хошимин',
    moscow: 'москва', 'st petersburg': 'санкт-петербург', 'saint petersburg': 'санкт-петербург', yekaterinburg: 'екатеринбург', chelyabinsk: 'челябинск', novosibirsk: 'новосибирск', kazan: 'казань', vladivostok: 'владивосток', khabarovsk: 'хабаровск' };

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').split(/[,(（，]/)[0].replace(/^(г\.|город)\s*/, '').replace(/\s+/g, ' ').trim(); }
  function lookup(s) {
    var n = norm(s); if (!n) return null;
    var k = CITY[n] ? n : EN[n] && CITY[EN[n]] ? EN[n] : CITY[n.replace(/е/g, 'ё')] ? n.replace(/е/g, 'ё') : null;
    if (!k) { var ks = Object.keys(CITY); for (var i = 0; i < ks.length; i++) if (ks[i].length > 3 && (n.indexOf(ks[i]) === 0 || ks[i].indexOf(n) === 0 && n.length > 3)) { k = ks[i]; break; } }
    return k ? { name: k, lon: CITY[k][0], lat: CITY[k][1], cc: CITY[k][2] } : null;
  }
  function country(lon, lat) {
    if (lon >= 124.5 && lon <= 130.5 && lat >= 33 && lat <= 38.7) return 'KR';
    if (lon >= 129.5 && lon <= 146 && lat >= 30 && lat <= 46 && !(lon < 131.5 && lat > 42)) return 'JP';
    if (lon >= 119.5 && lon <= 122.2 && lat >= 21.8 && lat <= 25.4) return 'TW';
    if (lon >= 73 && lon <= 135.5 && lat >= 18 && lat <= 54 && !(lat > 49.5 && lon < 120 && lon > 87)) {
      if (lat > 41.6 && lon > 119.5 && lon < 135.5 && lat > 49.8 && lon > 127) return 'RU';
      return 'CN';
    }
    if (lon > 19 && lat > 41) return 'RU';
    return '';
  }
  // регион отправления в Китае
  function cnRegion(lon, lat) {
    if (lon < 96) return 'XJ';                       // Синьцзян: Урумчи, Кашгар, Хоргос
    if (lat >= 40.5 && lon >= 118) return 'NE';      // Ляонин, Цзилинь, Хэйлунцзян
    if (lat >= 35.5 && lon >= 109.5) return lon >= 119.5 && lat < 37.5 ? 'E' : 'N'; // Пекин, Тяньцзинь, Хэбэй, Шаньси, Внутр. Монголия (Циндао — восток)
    if (lon < 109.5 && lat >= 32.5) return 'NW';     // Шэньси, Ганьсу, Нинся, Цинхай
    if (lon < 110.5 && lat < 32.5) return lat < 23.2 && lon > 107.5 ? 'SWC' : 'SW'; // Сычуань, Чунцин, Юньнань, Гуйчжоу; Циньчжоу — порт
    if (lon >= 117 && lat >= 26.5) return 'E';       // Шанхай, Цзянсу, Чжэцзян (Иу, Нинбо), Аньхой, Шаньдун
    if (lat < 26.5) return 'S';                      // Гуандун, Фуцзянь, Хайнань
    return 'C';                                      // Хэнань, Хубэй, Хунань, Цзянси
  }
  // часть России назначения
  function ruZone(lon, lat) {
    if (lon < 23) return 'KGD';
    if (lon >= 127) return 'FE';
    if (lon >= 90) return 'ES';
    if (lon >= 68) return 'WS';
    if (lon >= 55) return 'UR';
    if (lat < 48.6 && lon < 49) return 'S';
    if (lon >= 43) return 'VG';
    if (lat >= 58.6) return 'NW';
    return 'C';
  }
  var ZN = {
    ru: { FE: 'Дальний Восток', ES: 'Восточная Сибирь', WS: 'Западная Сибирь', UR: 'Урал', VG: 'Поволжье', C: 'центр России', NW: 'Северо-Запад', S: 'юг России', KGD: 'Калининград' },
    ruCN: { XJ: 'Синьцзян (запад Китая)', NE: 'северо-восток Китая', N: 'север Китая', NW: 'северо-запад Китая', SW: 'юго-запад Китая', SWC: 'юг Китая (Гуанси)', E: 'восток Китая', S: 'юг Китая', C: 'центр Китая',
      KR: 'Южная Корея', JP: 'Япония', TW: 'Тайвань', VN: 'Вьетнам', TH: 'Таиланд', SG: 'Сингапур', MY: 'Малайзия', ID: 'Индонезия', IN: 'Индия' },
    en: { FE: 'Russian Far East', ES: 'Eastern Siberia', WS: 'Western Siberia', UR: 'the Urals', VG: 'the Volga region', C: 'Central Russia', NW: 'North-West Russia', S: 'Southern Russia', KGD: 'Kaliningrad' },
    enCN: { XJ: 'Xinjiang (West China)', NE: 'Northeast China', N: 'North China', NW: 'Northwest China', SW: 'Southwest China', SWC: 'South China (Guangxi)', E: 'East China', S: 'South China', C: 'Central China',
      KR: 'South Korea', JP: 'Japan', TW: 'Taiwan', VN: 'Vietnam', TH: 'Thailand', SG: 'Singapore', MY: 'Malaysia', ID: 'Indonesia', IN: 'India' }
  };
  var ZONE_ORDER = ['FE', 'ES', 'WS', 'UR', 'VG', 'C', 'NW', 'S', 'KGD'];
  function zi(z) { var i = ZONE_ORDER.indexOf(z); return i < 0 ? 5 : i; }

  // ---------- сроки по участкам (дни, от/до) — ориентиры 2026
  // авто из Иу / Чжэцзяна до части России; поправки по региону Китая ниже
  var AUTO = { FE: [11, 17], ES: [15, 21], WS: [13, 19], UR: [13, 19], VG: [16, 23], C: [16, 24], NW: [19, 27], S: [19, 27], KGD: [24, 34] };
  var RAIL = { FE: [14, 22], ES: [16, 24], WS: [18, 26], UR: [20, 28], VG: [24, 32], C: [25, 35], NW: [28, 38], S: [30, 40], KGD: [32, 44] };
  // ЖД от Владивостока по России (после моря)
  var VVO_RAIL = { FE: [1, 3], ES: [7, 10], WS: [10, 13], UR: [12, 15], VG: [13, 16], C: [14, 17], NW: [15, 19], S: [16, 20], KGD: [20, 26] };
  // море до Владивостока по стране / региону
  var SEA_VVO = { KR: [2, 4], JP: [3, 8], TW: [7, 11], NE: [4, 7], N: [5, 8], E: [5, 9], S: [8, 12], SWC: [10, 14], VN: [12, 18], TH: [16, 24], SG: [15, 22], MY: [15, 22], ID: [17, 26] };
  var PORT = [8, 16], PORT_KR = [5, 12]; // выгрузка, таможня и ожидание вывоза во Владивостоке (2026: порт перегружен)
  // морские порты отправления: до ближайшего — по суше
  var PORTS = [[121.8, 31.0], [121.85, 29.9], [120.3, 36.0], [117.7, 39.0], [121.6, 38.9], [122.2, 40.7], [119.4, 34.7], [118.1, 24.5], [119.6, 26.0], [114.1, 22.5], [113.6, 22.7],
    [108.6, 21.7], [116.7, 23.3], [110.3, 20.0], [114.17, 22.3], [106.7, 20.85], [106.7, 10.8], [108.2, 16.05], [129.05, 35.1], [126.6, 37.45], [100.9, 13.1], [103.8, 1.27], [101.4, 3.0], [106.9, -6.1]];
  function hav(a, b) { var r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r, s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * 6371 * Math.asin(Math.sqrt(s)); }
  function toPort(lon, lat) { var m = Infinity; PORTS.forEach(function (p) { var d = hav([lon, lat], p); if (d < m) m = d; }); return m; }
  // поправки авто/ЖД по региону Китая: [авто, ЖД] в днях, по частям России
  function adj(reg, zone) {
    var east = zi(zone) <= 1; // ДВ и Восточная Сибирь
    switch (reg) {
      case 'NE': return east ? [-5, -5] : [-1, -2];
      case 'N': return east ? [-3, -3] : [-1, -1];
      case 'XJ': return east ? [2, 2] : [-6, -6];
      case 'NW': return east ? [1, 0] : [-3, -3];
      case 'SW': return east ? [3, 2] : [0, -2];
      case 'SWC': return [3, 2];
      case 'S': return [3, 3];
      case 'C': return [0, -1];
      default: return [0, 0];
    }
  }
  function add(r, d) { return [Math.max(1, r[0] + d), Math.max(2, r[1] + d)]; }

  // ---------- коридоры (подписи)
  function autoVia(reg, zone, toName, l) {
    var ru = l !== 'en';
    if (zone === 'FE') return reg === 'NE' || reg === 'N' || reg === 'E' || reg === 'C' || reg === 'S' || reg === 'SWC' ?
      (/благовещ/.test(toName) ? (ru ? 'Хэйхэ — Благовещенск' : 'Heihe — Blagoveshchensk') : (ru ? 'Суйфэньхэ — Пограничный' : 'Suifenhe — Pogranichny')) : (ru ? 'через Забайкальск' : 'via Zabaikalsk');
    if (zone === 'ES' || (reg === 'NE' && zi(zone) <= 5)) return ru ? 'Маньчжурия — Забайкальск' : 'Manzhouli — Zabaikalsk';
    if (reg === 'N' && zone === 'ES') return ru ? 'Эрлянь — Монголия — Кяхта' : 'Erenhot — Mongolia — Kyakhta';
    return ru ? 'через Казахстан: Хоргос — Алматы — Астана' : 'via Kazakhstan: Khorgos — Almaty — Astana';
  }
  function railVia(reg, zone, l) {
    var ru = l !== 'en';
    if (zone === 'FE') return ru ? 'Суйфэньхэ — Гродеково' : 'Suifenhe — Grodekovo';
    if (reg === 'NE' || zone === 'ES') return ru ? 'Маньчжурия — Забайкальск' : 'Manzhouli — Zabaikalsk';
    if (reg === 'N') return ru ? 'Эрлянь — Монголия — Наушки' : 'Erenhot — Mongolia — Naushki';
    if (reg === 'XJ' || reg === 'NW' || reg === 'SW' || zone === 'UR' || zone === 'WS') return ru ? 'Казахстан: Достык / Алтынколь' : 'Kazakhstan: Dostyk / Altynkol';
    return ru ? 'Забайкальск или Казахстан (Достык)' : 'Zabaikalsk or Kazakhstan (Dostyk)';
  }

  // ---------- размер партии
  function band(w, v) {
    if (w < 100 && v < 0.6) return 'tiny';
    if (v < 12 && w < 6000) return 'ltl';
    if (v < 35 && w < 14000) return 'mid';
    if (v <= 140 && w <= 56000) return 'fcl';
    return 'multi';
  }
  var BAND = { ru: { tiny: 'мелкая посылка', ltl: 'сборный груз', mid: 'часть машины или контейнер 20′', fcl: 'контейнер или машина целиком', multi: 'несколько контейнеров' },
    en: { tiny: 'small parcel', ltl: 'groupage (LCL/LTL)', mid: 'part load or 20′ container', fcl: 'full container or truck', multi: 'several containers' } };

  // стоимость — относительная шкала (1 дешевле всего … 5 дороже всего), по типу партии
  var COST = {
    tiny: { air: 3.2, auto: 3.0, rail: 4.2, sea: 5, sea_only: 4.5, sea_direct: 5 },
    ltl: { air: 5, auto: 2.6, rail: 2.9, sea: 3.6, sea_only: 2.4, sea_direct: 4 },
    mid: { air: 5.5, auto: 2.8, rail: 2.4, sea: 2.3, sea_only: 1.6, sea_direct: 2.8 },
    fcl: { air: 6.5, auto: 3.0, rail: 2.0, sea: 1.4, sea_only: 1.0, sea_direct: 1.8 },
    multi: { air: 8, auto: 3.2, rail: 2.0, sea: 1.2, sea_only: 0.9, sea_direct: 1.5 }
  };
  var PRI = { balance: [1, 1], cheap: [1.8, 0.45], fast: [0.45, 1.9] };

  var TX = {
    ru: {
      auto: 'Авто', rail: 'ЖД', sea: 'Море + ЖД', sea_only: 'Море', sea_direct: 'Море через Суэц', air: 'Авиа',
      viaVvo: 'морем до Владивостока, дальше ЖД', viaVvoOnly: 'морем до Владивостока', viaSuez: 'вокруг Азии через Суэцкий канал', airVia: 'прямой рейс в Москву, дальше авто', airDirect: 'прямой рейс',
      noLand: 'нет сухопутного пути: у Кореи с Россией нет общей дороги, а путь через КНДР закрыт — только море или авиа',
      noLandJP: 'Япония — острова: только море или авиа', noLandTW: 'Тайвань — остров: только море или авиа',
      inland: 'город далеко от моря: до порта ещё 1–3 дня по Китаю, море выгодно только для нескольких контейнеров',
      farSea: 'до моря больше 1000 км — по суше быстрее и дешевле',
      seaMin: 'для моря груза слишком мало — минимальные сборы съедят выгоду',
      railMin: 'ЖД сборным — от 1 м³, мелкий груз выйдет дороже авто',
      bigAir: 'для такого объёма авиа неоправданно дорого',
      ltlAuto: 'сборное авто — самый удобный способ для партии до 10–12 м³: оплата за объём, без целой машины',
      yiwuHub: 'Иу — главный хаб сборных грузов: машины на Россию уходят ежедневно',
      kzShort: 'через Казахстан до Урала и Сибири короче, чем через Забайкальск',
      zabShort: 'до Сибири и Дальнего Востока ближе всего через Забайкальск и Приморье',
      neShort: 'северо-восток Китая граничит с Россией — путь самый короткий',
      seaCheap: 'контейнер морем до Владивостока и дальше по ЖД — самый дешёвый способ для полного контейнера',
      seaFE: 'Владивосток — порт назначения: контейнер приходит морем за несколько дней, без ЖД',
      railFcl: 'ЖД — золотая середина для контейнера: дешевле авто, быстрее моря',
      railHub: 'из Чэнду, Чунцина, Сианя и Урумчи регулярно идут контейнерные поезда через Казахстан',
      ftl: 'машина целиком — быстрее ЖД, без перегрузок от склада до склада',
      airFast: 'самый быстрый способ: срочный, лёгкий или дорогой груз',
      airTiny: 'для небольшой посылки авиа почти не дороже сборного авто, а в разы быстрее',
      koreaSea: 'из Кореи до Владивостока 2–4 дня морем — основной путь корейских грузов в Россию',
      vnRail: 'есть прямой ЖД-сервис Вьетнам — Россия через Китай (25–35 дней)',
      suezRisk: 'Чёрное море почти закрыто для импорта, через Суэц до Петербурга 45–60 дней — только для больших партий без спешки',
      kgd: 'в Калининград — морем из Петербурга или через Усть-Лугу: транзит через Литву ограничен',
      port: 'во Владивостоке закладывайте до 1–2 недель на выгрузку и вывоз из порта',
      days: 'дн.', best: 'Рекомендуем', alt: 'Ещё варианты', no: 'Не подходит', cheap: 'дешевле', fast: 'быстрее',
      sum: function (o, from, to, b) { return 'Из ' + from + ' в ' + to + ' ' + b + ' лучше везти: ' + o + '.'; }
    },
    en: {
      auto: 'Truck', rail: 'Rail', sea: 'Sea + rail', sea_only: 'Sea', sea_direct: 'Sea via Suez', air: 'Air',
      viaVvo: 'sea to Vladivostok, then rail', viaVvoOnly: 'sea to Vladivostok', viaSuez: 'around Asia via the Suez Canal', airVia: 'direct flight to Moscow, then truck', airDirect: 'direct flight',
      noLand: 'no land route: Korea has no road to Russia, the way through North Korea is closed — sea or air only',
      noLandJP: 'Japan is an island country: sea or air only', noLandTW: 'Taiwan is an island: sea or air only',
      inland: 'far from the sea: 1–3 more days to the port; sea pays off only for several containers',
      farSea: 'over 1,000 km to the sea — overland is faster and cheaper',
      seaMin: 'too little cargo for sea — minimum charges eat the saving',
      railMin: 'rail groupage starts at 1 m³; small cargo costs more than truck',
      bigAir: 'air is unreasonably expensive for this volume',
      ltlAuto: 'groupage truck is the handiest way for up to 10–12 m³: you pay per m³, no full truck needed',
      yiwuHub: 'Yiwu is the main groupage hub: trucks to Russia leave daily',
      kzShort: 'via Kazakhstan the Urals and Siberia are closer than via Zabaikalsk',
      zabShort: 'Siberia and the Far East are closest via Zabaikalsk and Primorye',
      neShort: 'Northeast China borders Russia — the shortest way',
      seaCheap: 'container by sea to Vladivostok and on by rail is the cheapest way for a full container',
      seaFE: 'Vladivostok is the destination port: the container arrives by sea in a few days, no rail',
      railFcl: 'rail is the sweet spot for a container: cheaper than truck, faster than sea',
      railHub: 'container trains via Kazakhstan run regularly from Chengdu, Chongqing, Xi’an and Urumqi',
      ftl: 'a full truck is faster than rail, door to door without reloading',
      airFast: 'the fastest way: urgent, light or valuable cargo',
      airTiny: 'for a small parcel air costs about the same as groupage truck and is many times faster',
      koreaSea: 'Korea to Vladivostok takes 2–4 days by sea — the main route for Korean cargo to Russia',
      vnRail: 'there is a direct rail service Vietnam — Russia via China (25–35 days)',
      suezRisk: 'the Black Sea is nearly closed for imports; via Suez to St Petersburg takes 45–60 days — large batches only',
      kgd: 'to Kaliningrad — by sea from St Petersburg or Ust-Luga: transit via Lithuania is restricted',
      port: 'allow up to 1–2 weeks in Vladivostok for unloading and port pick-up',
      days: 'days', best: 'Recommended', alt: 'Other options', no: 'Not suitable', cheap: 'cheaper', fast: 'faster',
      sum: function (o, from, to, b) { return 'From ' + from + ' to ' + to + ', ' + b + ' is best shipped by ' + o + '.'; }
    }
  };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /**
   * @param {object} q { from, to, weight (кг), volume (м³), priority: 'balance'|'cheap'|'fast', dangerous, lang,
   *                    fromLL: [lon,lat] и toLL: [lon,lat] — если город уже найден на карте }
   */
  function advise(q) {
    q = q || {}; var l = q.lang === 'en' || q.lang === 'zh' ? 'en' : 'ru', T = TX[l], Z = ZN[l], ZC = ZN[l + 'CN'];
    var fo = lookup(q.from), to = lookup(q.to);
    if (!fo && q.fromLL) fo = { name: norm(q.from), lon: q.fromLL[0], lat: q.fromLL[1], cc: '' };
    if (!to && q.toLL) to = { name: norm(q.to), lon: q.toLL[0], lat: q.toLL[1], cc: '' };
    if (!to && !norm(q.to)) to = lookup('москва');
    if (!fo || !to) return { ok: false, unknown: !fo ? 'from' : 'to' };
    var cc = fo.cc || country(fo.lon, fo.lat); if (!cc || cc === 'RU') return { ok: false, unknown: 'from' };
    var reg = cc === 'CN' ? cnRegion(fo.lon, fo.lat) : cc;
    var tcc = to.cc || country(to.lon, to.lat); if (tcc && tcc !== 'RU') return { ok: false, unknown: 'to' };
    var zone = ruZone(to.lon, to.lat);
    var W = Math.max(0, +q.weight || 0), V = Math.max(0, +q.volume || 0); if (!V && W) V = W / 250; if (!W && V) W = V * 250;
    var b = W || V ? band(W, V) : 'ltl', pri = PRI[q.priority] || PRI.balance, cost = COST[b];
    var island = cc === 'KR' || cc === 'JP' || cc === 'TW';
    var portKm = island ? 0 : toPort(fo.lon, fo.lat), coastal = portKm <= 350, farInland = portKm > 1000;
    var seaLeg = farInland && b !== 'multi' ? null : SEA_VVO[island || cc !== 'CN' ? cc : reg] || (reg === 'C' || reg === 'NW' ? [8, 13] : reg === 'SW' || reg === 'XJ' ? [11, 16] : [6, 10]);
    var port = cc === 'KR' ? PORT_KR : PORT;
    var a = cc === 'CN' ? adj(reg, zone) : [0, 0];
    var opts = [], no = [];
    var fromN = cap(fo.name), toN = cap(to.name);
    function opt(id, mode, days, why, extra) { var o = { id: id, mode: mode, title: T[id] || T[mode], days: days, cost: cost[id] != null ? cost[id] : cost[mode], why: why.filter(Boolean), cons: [] }; for (var k in extra) o[k] = extra[k]; opts.push(o); return o; }

    // --- авто
    if (island) no.push({ mode: 'auto', why: cc === 'KR' ? T.noLand : cc === 'JP' ? T.noLandJP : T.noLandTW });
    else if (cc === 'CN' || cc === 'VN') {
      var ad = add(AUTO[zone] || AUTO.C, a[0] + (cc === 'VN' ? 5 : 0));
      var ow = [];
      if (b === 'ltl' || b === 'tiny') ow.push(T.ltlAuto);
      if (b === 'fcl' || b === 'mid') ow.push(T.ftl);
      if (/^иу$|^цзиньхуа/.test(fo.name) && (b === 'ltl' || b === 'tiny')) ow.push(T.yiwuHub);
      if (reg === 'NE' && zi(zone) <= 1) ow.push(T.neShort); else if ((zone === 'UR' || zone === 'WS') && reg !== 'NE' && reg !== 'N') ow.push(T.kzShort);
      var ao = opt('auto', 'auto', ad, ow, { via: autoVia(reg, zone, to.name, l) });
      if (b === 'multi') ao.cost += 0.6;
      if (zone === 'KGD') { ao.cons.push(T.kgd); ao.cost += 1; }
    }
    // --- ЖД
    if (island) no.push({ mode: 'rail', why: cc === 'KR' ? T.noLand : cc === 'JP' ? T.noLandJP : T.noLandTW });
    else if (cc === 'CN' || cc === 'VN') {
      var rd = add(RAIL[zone] || RAIL.C, a[1] + (cc === 'VN' ? 3 : 0));
      var rw = [];
      if (b === 'fcl' || b === 'mid' || b === 'multi') rw.push(T.railFcl);
      if (reg === 'SW' || reg === 'NW' || reg === 'XJ') rw.push(T.railHub);
      if (cc === 'VN') rw.push(T.vnRail);
      if (zi(zone) <= 1 && reg !== 'XJ') rw.push(T.zabShort);
      var ro = opt('rail', 'rail', b === 'ltl' || b === 'tiny' ? add(rd, 4) : rd, rw, { via: cc === 'VN' ? (l === 'en' ? 'via China' : 'через Китай') : railVia(reg, zone, l) });
      if (b === 'tiny') ro.cons.push(T.railMin);
      if (zone === 'KGD') { ro.cons.push(T.kgd); ro.cost += 0.8; }
    }
    // --- море
    if (seaLeg) {
      if (zone === 'FE') {
        var so = opt('sea_only', 'sea', [seaLeg[0] + port[0] - 2 + VVO_RAIL.FE[0], seaLeg[1] + port[1] - 4 + VVO_RAIL.FE[1]], [island && cc === 'KR' ? T.koreaSea : '', T.seaFE], { via: T.viaVvoOnly });
        if (!coastal) { so.cons.push(T.inland); so.cost += 1.4; so.days = add(so.days, 3); }
        if (b === 'tiny') so.cons.push(T.seaMin);
      } else {
        var vr = VVO_RAIL[zone] || VVO_RAIL.C, sd = [seaLeg[0] + port[0] + vr[0], seaLeg[1] + port[1] + vr[1]];
        var sw = [cc === 'KR' ? T.koreaSea : '', b === 'fcl' || b === 'multi' || b === 'mid' ? T.seaCheap : ''];
        var se = opt('sea', 'sea', sd, sw, { via: T.viaVvo });
        se.cons.push(T.port);
        if (!coastal) { se.cons.unshift(T.inland); se.cost += b === 'multi' ? 0.4 : 1.2; se.days = add(se.days, 3); }
        if (b === 'tiny' || (b === 'ltl' && !island && W < 1500)) se.cons.unshift(T.seaMin), se.cost += 1;
        if (zone === 'KGD') se.cons.push(T.kgd);
        if (island && b === 'ltl') se.cost -= 0.7; // из Кореи и Японии сборные контейнеры до Владивостока идут регулярно
      }
      // через Суэц: только на Северо-Запад и только для больших партий
      if ((zone === 'NW' || zone === 'KGD') && (b === 'fcl' || b === 'multi') && coastal && !island) {
        var sx = opt('sea_direct', 'sea', [45, 60], [], { via: T.viaSuez }); sx.cons.push(T.suezRisk);
      }
    } else if (cc === 'CN') no.push({ mode: 'sea', why: T.farSea });
    // --- авиа
    var airDays = zone === 'C' ? [3, 7] : zi(zone) <= 3 ? [4, 8] : [4, 9];
    var aw = [b === 'tiny' ? T.airTiny : T.airFast];
    var air = opt('air', 'air', airDays, aw, { via: zone === 'C' ? T.airDirect : T.airVia });
    if (b === 'fcl' || b === 'multi') { air.cons.push(T.bigAir); air.cost += 2; }

    // --- оценка: цена и срок с весами приоритета
    opts.forEach(function (o) { var mid = (o.days[0] + o.days[1]) / 2; o.score = o.cost * pri[0] * 1.6 + mid / 10 * pri[1]; });
    opts.sort(function (x, y) { return x.score - y.score; });
    var cheapest = opts.reduce(function (x, y) { return y.cost < x.cost ? y : x; }), fastest = opts.reduce(function (x, y) { return y.days[1] < x.days[1] ? y : x; });
    opts.forEach(function (o, i) { o.tags = []; if (i === 0) o.tags.push('best'); if (o === cheapest) o.tags.push('cheap'); if (o === fastest) o.tags.push('fast'); o.rub = Math.max(1, Math.min(5, Math.round(o.cost))); });
    var best = opts[0];
    return {
      ok: true, lang: l, band: b, bandName: BAND[l][b], priority: q.priority || 'balance',
      from: { name: fromN, cc: cc, region: reg, regionName: ZC[reg] || '' }, to: { name: toN, zone: zone, zoneName: Z[zone] },
      best: best.id, options: opts, impossible: no,
      summary: T.sum(best.title.toLowerCase() + (best.via ? ' (' + best.via + ')' : '') + ', ' + best.days[0] + '–' + best.days[1] + ' ' + T.days, fromN, toN, BAND[l][b])
    };
  }

  var API = { advise: advise, lookup: lookup, ruZone: ruZone, cnRegion: cnRegion, text: TX };
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (root) root.IOMA_ADVICE = API;
})(typeof window !== 'undefined' ? window : null);
