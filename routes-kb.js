/* IOMASTAVKA — карта и справочник маршрутов Китай → Россия.
   Координаты городов и пунктов пропуска реальные (долгота/широта), карта — схема
   в равнопромежуточной проекции: Москва слева вверху, Китай справа внизу.
   Сроки — ориентировочные диапазоны «от двери до двери» в обычной ситуации; реальные
   сроки зависят от загрузки погранпереходов, сезона и перевозчика. */
(function () {
  'use strict';
  // ---------- узлы: [долгота, широта, RU, EN, ZH, TR]
  var N = {
    msk: [37.62, 55.75, 'Москва', 'Moscow', '莫斯科', 'Moskova'],
    spb: [30.32, 59.94, 'Санкт-Петербург', 'St. Petersburg', '圣彼得堡', 'St. Petersburg'],
    nnov: [44.0, 56.33, 'Н. Новгород', 'N. Novgorod', '下诺夫哥罗德', 'N. Novgorod'],
    kzn: [49.1, 55.79, 'Казань', 'Kazan', '喀山', 'Kazan'],
    ekb: [60.6, 56.84, 'Екатеринбург', 'Yekaterinburg', '叶卡捷琳堡', 'Yekaterinburg'],
    chel: [61.4, 55.16, 'Челябинск', 'Chelyabinsk', '车里雅宾斯克', 'Çelyabinsk'],
    omsk: [73.37, 54.99, 'Омск', 'Omsk', '鄂木斯克', 'Omsk'],
    nsk: [82.92, 55.03, 'Новосибирск', 'Novosibirsk', '新西伯利亚', 'Novosibirsk'],
    krs: [92.87, 56.01, 'Красноярск', 'Krasnoyarsk', '克拉斯诺亚尔斯克', 'Krasnoyarsk'],
    irk: [104.28, 52.29, 'Иркутск', 'Irkutsk', '伊尔库茨克', 'İrkutsk'],
    ulu: [107.6, 51.83, 'Улан-Удэ', 'Ulan-Ude', '乌兰乌德', 'Ulan-Ude'],
    chita: [113.5, 52.03, 'Чита', 'Chita', '赤塔', 'Çita'],
    zab: [117.33, 49.65, 'Забайкальск', 'Zabaikalsk', '后贝加尔斯克', 'Zabaykalsk'],
    blg: [127.53, 50.27, 'Благовещенск', 'Blagoveshchensk', '布拉戈维申斯克', 'Blagoveşçensk'],
    khv: [135.07, 48.48, 'Хабаровск', 'Khabarovsk', '哈巴罗夫斯克', 'Habarovsk'],
    grd: [131.55, 44.05, 'Гродеково/Пограничный', 'Grodekovo/Pogranichny', '格罗捷阔沃', 'Grodekovo'],
    vvo: [131.9, 43.12, 'Владивосток', 'Vladivostok', '符拉迪沃斯托克', 'Vladivostok'],
    nvr: [37.77, 44.72, 'Новороссийск', 'Novorossiysk', '新罗西斯克', 'Novorossiysk'],
    krd: [38.98, 45.04, 'Краснодар', 'Krasnodar', '克拉斯诺达尔', 'Krasnodar'],
    rnd: [39.72, 47.23, 'Ростов-на-Дону', 'Rostov-on-Don', '顿河畔罗斯托夫', 'Rostov'],
    ub: [106.9, 47.92, 'Улан-Батор', 'Ulaanbaatar', '乌兰巴托', 'Ulan Batur'],
    erl: [111.98, 43.65, 'Эрлянь/Замын-Ууд', 'Erenhot/Zamyn-Uud', '二连浩特', 'Erenhot'],
    mzl: [117.43, 49.3, 'Маньчжурия', 'Manzhouli', '满洲里', 'Mançuli'],
    hrb: [126.63, 45.75, 'Харбин', 'Harbin', '哈尔滨', 'Harbin'],
    sfh: [131.15, 44.4, 'Суйфэньхэ', 'Suifenhe', '绥芬河', 'Suifenhe'],
    hun: [130.36, 42.86, 'Хуньчунь', 'Hunchun', '珲春', 'Hunchun'],
    kam: [130.55, 43.05, 'Камышовая', 'Kamyshovaya', '卡梅绍瓦亚', 'Kamışovaya'],
    uss: [131.95, 43.8, 'Уссурийск', 'Ussuriysk', '乌苏里斯克', 'Ussuriysk'],
    heihe: [127.49, 50.24, 'Хэйхэ', 'Heihe', '黑河', 'Heihe'],
    bj: [116.4, 39.9, 'Пекин', 'Beijing', '北京', 'Pekin'],
    tj: [117.2, 39.08, 'Тяньцзинь', 'Tianjin', '天津', 'Tianjin'],
    sha: [121.47, 31.23, 'Шанхай', 'Shanghai', '上海', 'Şanghay'],
    nb: [121.55, 29.87, 'Нинбо', 'Ningbo', '宁波', 'Ningbo'],
    yiwu: [120.07, 29.31, 'Иу', 'Yiwu', '义乌', 'Yiwu'],
    can: [113.26, 23.13, 'Гуанчжоу', 'Guangzhou', '广州', 'Guangzhou'],
    szx: [114.06, 22.54, 'Шэньчжэнь', 'Shenzhen', '深圳', 'Shenzhen'],
    xian: [108.94, 34.34, 'Сиань', "Xi'an", '西安', 'Şian'],
    cq: [106.55, 29.56, 'Чунцин', 'Chongqing', '重庆', 'Chongqing'],
    urc: [87.62, 43.83, 'Урумчи', 'Urumqi', '乌鲁木齐', 'Urumçi'],
    khg: [80.42, 44.21, 'Хоргос/Алтынколь', 'Khorgos/Altynkol', '霍尔果斯', 'Horgos'],
    ala: [76.89, 43.24, 'Алматы', 'Almaty', '阿拉木图', 'Almatı'],
    ast: [71.43, 51.13, 'Астана', 'Astana', '阿斯塔纳', 'Astana'],
    // морские точки пути (для схемы)
    s_ecs: [125.5, 30.0], s_jp: [130.5, 35.5], s_sea: [133.0, 40.0], s_scs: [111.0, 15.5], s_suez: [32.5, 30.0], s_bos: [29.0, 41.2], s_med: [27.0, 35.0], s_off: [100.0, 20.5],
  };
  var LANG = function () { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } };
  var LI = { ru: 2, en: 3, zh: 4, tr: 5 };
  function name(k) { var n = N[k]; return n ? (n[LI[LANG()]] || n[2]) : k; }

  // ---------- коридоры
  // days — ориентировочно до Москвы/центра (если иное не указано), check — пункт пропуска
  var C = [
    { id: 'rail_zab', mode: 'rail', path: ['sha', 'bj', 'mzl', 'zab', 'chita', 'ulu', 'irk', 'krs', 'nsk', 'omsk', 'ekb', 'kzn', 'msk'], check: 'zab', days: [18, 35],
      t: { ru: 'ЖД через Забайкальск — Маньчжурию', en: 'Rail via Zabaikalsk — Manzhouli', zh: '铁路经满洲里—后贝加尔斯克', tr: 'Zabaykalsk — Mançuli üzerinden demiryolu' },
      plus: { ru: 'Главный коридор, больше всего сервисов и контейнерных поездов, ставки стабильнее авто', en: 'Main corridor with the most services and container trains; rates steadier than road', zh: '主通道，班列和服务最多，运价比公路稳定', tr: 'En çok servis ve konteyner treni olan ana koridor; fiyatlar karayolundan daha istikrarlı' },
      minus: { ru: 'Перегрузка на погранпереходе в пиковые месяцы — очередь может добавить 5–10 дней', en: 'Border congestion in peak months can add 5–10 days', zh: '旺季口岸拥堵可能增加5–10天', tr: 'Yoğun aylarda sınır sıkışıklığı 5–10 gün ekleyebilir' } },
    { id: 'rail_erl', mode: 'rail', path: ['sha', 'bj', 'erl', 'ub', 'ulu', 'irk', 'krs', 'nsk', 'omsk', 'ekb', 'kzn', 'msk'], check: 'erl', days: [18, 32],
      t: { ru: 'ЖД через Эрлянь — Замын-Ууд (Монголия)', en: 'Rail via Erenhot — Zamyn-Uud (Mongolia)', zh: '铁路经二连浩特—扎门乌德（蒙古）', tr: 'Erenhot — Zamın-Üüd (Moğolistan) üzerinden demiryolu' },
      plus: { ru: 'Разгружает Забайкальск, удобно для Северного и Центрального Китая', en: 'Bypasses Zabaikalsk congestion; convenient from North and Central China', zh: '分流后贝加尔斯克，适合华北、华中货源', tr: 'Zabaykalsk yoğunluğunu azaltır; Kuzey ve Orta Çin için uygun' },
      minus: { ru: 'Транзит через Монголию: доп. документы и тарифы, ограниченная пропускная способность', en: 'Transit through Mongolia: extra paperwork and tariffs, limited capacity', zh: '过境蒙古：额外单证与费用，运力有限', tr: 'Moğolistan transiti: ek evrak ve ücret, sınırlı kapasite' } },
    { id: 'rail_kz', mode: 'rail', path: ['sha', 'xian', 'urc', 'khg', 'ala', 'ast', 'chel', 'kzn', 'msk'], check: 'khg', days: [15, 30],
      t: { ru: 'ЖД через Хоргос — Алтынколь (Казахстан)', en: 'Rail via Khorgos — Altynkol (Kazakhstan)', zh: '铁路经霍尔果斯—阿腾科里（哈萨克斯坦）', tr: 'Horgos — Altınköl (Kazakistan) üzerinden demiryolu' },
      plus: { ru: 'Короче для Западного и Центрального Китая, удобно на Урал, Поволжье и юг России', en: 'Shorter from Western and Central China; good for the Urals, Volga and southern Russia', zh: '对中国西部、中部更近；适合乌拉尔、伏尔加和俄罗斯南部', tr: 'Batı ve Orta Çin için daha kısa; Urallar, Volga ve güney Rusya için uygun' },
      minus: { ru: 'Казахстан ужесточил проверки (осенью 2025 — очереди и закрытия переходов), с 11.02.2026 обязательны электронные навигационные пломбы; перестановка на колею 1520', en: 'Kazakhstan tightened checks (queues and closed crossings in autumn 2025); e-navigation seals mandatory from 11 Feb 2026; gauge change to 1520 mm', zh: '哈萨克斯坦加强查验（2025年秋季排队及口岸关闭）；2026年2月11日起强制电子导航铅封；换装1520轨距', tr: 'Kazakistan kontrolleri sıkılaştırdı (2025 sonbaharında kuyruklar ve kapanan geçişler); 11.02.2026’dan itibaren elektronik navigasyon mühürleri zorunlu; 1520 mm hat değişimi' } },
    { id: 'rail_grd', mode: 'rail', path: ['sha', 'hrb', 'sfh', 'grd', 'vvo'], check: 'grd', days: [10, 18], far: true,
      t: { ru: 'ЖД через Суйфэньхэ — Гродеково (Приморье)', en: 'Rail via Suifenhe — Grodekovo (Primorye)', zh: '铁路经绥芬河—格罗捷阔沃（滨海边疆区）', tr: 'Suifenhe — Grodekovo (Primorye) üzerinden demiryolu' },
      plus: { ru: 'Оптимально для Приморья и Дальнего Востока', en: 'Best for Primorye and the Russian Far East', zh: '最适合滨海边疆区和远东', tr: 'Primorye ve Uzak Doğu için en uygun' },
      minus: { ru: 'До центра России — длинное плечо по Транссибу', en: 'Long Trans-Siberian leg to central Russia', zh: '去俄罗斯中部需走很长的西伯利亚铁路', tr: 'Orta Rusya’ya uzun Trans-Sibirya hattı' } },
    { id: 'rail_hun', mode: 'rail', path: ['sha', 'hrb', 'hun', 'kam', 'uss', 'khv', 'chita', 'ulu', 'irk', 'krs', 'nsk', 'omsk', 'ekb', 'kzn', 'msk'], check: 'kam', days: [12, 16],
      t: { ru: 'ЖД-экспресс Хуньчунь — Камышовая — Уссурийск', en: 'Rail express Hunchun — Kamyshovaya — Ussuriysk', zh: '铁路快线 珲春—卡梅绍瓦亚—乌苏里斯克', tr: 'Hunchun — Kamışovaya — Ussuriysk demiryolu ekspresi' },
      plus: { ru: 'Контейнерный экспресс РЖД и Почты России (с ноября 2025): около 12 дней до ТЛЦ «Белый Раст» под Москвой', en: 'RZD and Russian Post container express (since Nov 2025): about 12 days to the Bely Rast terminal near Moscow', zh: '俄铁与俄罗斯邮政集装箱快线（2025年11月起）：到莫斯科郊外“别雷拉斯特”物流中心约12天', tr: 'RZD ve Rus Postası konteyner ekspresi (Kasım 2025’ten beri): Moskova yakınındaki Bely Rast terminaline ~12 gün' },
      minus: { ru: 'Ограниченное расписание и места; удобнее из Северо-Восточного Китая (провинция Цзилинь)', en: 'Limited schedule and space; best from Northeast China (Jilin)', zh: '班期和舱位有限；更适合中国东北（吉林）货源', tr: 'Sınırlı sefer ve yer; en uygunu Kuzeydoğu Çin (Jilin) çıkışlı' } },
    { id: 'auto_kz', mode: 'auto', path: ['sha', 'xian', 'urc', 'khg', 'ala', 'ast', 'chel', 'kzn', 'msk'], check: 'khg', days: [15, 25],
      t: { ru: 'Авто через Хоргос / Нур Жолы и Казахстан', en: 'Truck via Khorgos / Nur Zholy and Kazakhstan', zh: '公路经霍尔果斯/努尔饶勒及哈萨克斯坦', tr: 'Horgos / Nur Jolı ve Kazakistan üzerinden kamyon' },
      plus: { ru: 'Один из самых быстрых наземных вариантов до Москвы и Урала', en: 'One of the fastest land options to Moscow and the Urals', zh: '到莫斯科和乌拉尔最快的陆路选项之一', tr: 'Moskova ve Urallar için en hızlı kara seçeneklerinden biri' },
      minus: { ru: 'В октябре 2025 переходы КНР–Казахстан закрывали, на границах стояли тысячи фур; проверки строже, перегруз на казахстанский/российский транспорт', en: 'In Oct 2025 China–Kazakhstan crossings were closed with thousands of trucks queuing; stricter checks; reloading to Kazakh/Russian trucks', zh: '2025年10月中哈口岸曾关闭，数千辆货车排队；查验更严；需换装哈/俄车辆', tr: 'Ekim 2025’te Çin–Kazakistan geçişleri kapandı, binlerce kamyon bekledi; kontroller daha sıkı; aktarma gerekebilir' } },
    { id: 'auto_zab', mode: 'auto', path: ['sha', 'bj', 'mzl', 'zab', 'chita', 'ulu', 'irk', 'krs', 'nsk', 'omsk', 'ekb', 'kzn', 'msk'], check: 'zab', days: [15, 25],
      t: { ru: 'Авто через Забайкальск — Маньчжурию', en: 'Truck via Zabaikalsk — Manzhouli', zh: '公路经满洲里—后贝加尔斯克', tr: 'Zabaykalsk — Mançuli üzerinden kamyon' },
      plus: { ru: 'Прямой въезд в Россию без транзита третьих стран; переход принимает до ~2000 грузовиков в сутки; удобно для Сибири', en: 'Direct entry into Russia without third-country transit; good for Siberia', zh: '直接入境俄罗斯，无需第三国过境；适合西伯利亚', tr: 'Üçüncü ülke transiti olmadan doğrudan giriş; Sibirya için uygun' },
      minus: { ru: 'Очереди грузовиков на переходе, длинное плечо до центра', en: 'Truck queues at the crossing; long haul to central Russia', zh: '口岸货车排队；到俄罗斯中部距离长', tr: 'Sınırda kamyon kuyrukları; merkeze uzun mesafe' } },
    { id: 'auto_blg', mode: 'auto', path: ['sha', 'bj', 'hrb', 'heihe', 'blg', 'khv'], check: 'blg', days: [8, 14], far: true,
      t: { ru: 'Авто через мост Хэйхэ — Благовещенск', en: 'Truck via the Heihe — Blagoveshchensk bridge', zh: '公路经黑河—布拉戈维申斯克大桥', tr: 'Heihe — Blagoveşçensk köprüsü üzerinden kamyon' },
      plus: { ru: 'Амурская область, Хабаровск, северная часть Дальнего Востока', en: 'Amur region, Khabarovsk, northern Far East', zh: '阿穆尔州、哈巴罗夫斯克、远东北部', tr: 'Amur bölgesi, Habarovsk, Uzak Doğu’nun kuzeyi' },
      minus: { ru: 'Для европейской части России — далеко', en: 'Too far east for European Russia', zh: '去俄罗斯欧洲部分太远', tr: 'Avrupa Rusyası için çok uzak' } },
    { id: 'auto_pgr', mode: 'auto', path: ['sha', 'hrb', 'sfh', 'grd', 'vvo'], check: 'grd', days: [7, 12], far: true,
      t: { ru: 'Авто через Суйфэньхэ — Пограничный', en: 'Truck via Suifenhe — Pogranichny', zh: '公路经绥芬河—波格拉尼奇内', tr: 'Suifenhe — Pograniçnıy üzerinden kamyon' },
      plus: { ru: 'Быстро во Владивосток, Уссурийск, Находку', en: 'Fast to Vladivostok, Ussuriysk, Nakhodka', zh: '快速到达符拉迪沃斯托克、乌苏里斯克、纳霍德卡', tr: 'Vladivostok, Ussuriysk, Nahodka’ya hızlı' },
      minus: { ru: 'Только для Приморья; дальше — ЖД или авто через всю страну', en: 'Primorye only; beyond that, rail or a long truck haul', zh: '仅限滨海边疆区；再往西需铁路或长途公路', tr: 'Sadece Primorye; ötesi için demiryolu veya uzun karayolu' } },
    { id: 'sea_vvo', mode: 'sea', path: ['sha', 's_ecs', 's_jp', 's_sea', 'vvo', 'khv', 'chita', 'ulu', 'irk', 'krs', 'nsk', 'omsk', 'ekb', 'kzn', 'msk'], seaUntil: 4, check: 'vvo', days: [35, 60],
      t: { ru: 'Море до Владивостока + ЖД до места', en: 'Sea to Vladivostok + rail onward', zh: '海运至符拉迪沃斯托克+铁路续运', tr: 'Vladivostok’a deniz + demiryolu ile devam' },
      plus: { ru: 'Обычно самый дешёвый вариант для полных контейнеров; морское плечо всего 4–7 дней', en: 'Usually the cheapest for full containers; the sea leg is only 4–7 days', zh: '整箱通常最便宜；海运段仅4–7天', tr: 'Tam konteyner için genelde en ucuz; deniz bacağı sadece 4–7 gün' },
      minus: { ru: 'С лета 2026 порты перегружены: ожидание судна до 2 недель, вывоз по ЖД из Владивостока — до 2 недель (Восточный — около недели); до Москвы выходило до ~60 дней', en: 'Ports congested since summer 2026: up to 2 weeks waiting for a vessel and up to 2 weeks for rail dispatch from Vladivostok (Vostochny ~1 week); up to ~60 days to Moscow', zh: '2026年夏季起港口拥堵：等船最长2周，符拉迪沃斯托克铁路发运最长2周（东方港约1周）；到莫斯科最长约60天', tr: '2026 yazından beri limanlar yoğun: gemi bekleme 2 haftaya, Vladivostok’tan demiryolu sevki 2 haftaya kadar (Vostoçnıy ~1 hafta); Moskova’ya ~60 güne kadar' } },
    { id: 'sea_nvr', mode: 'sea', path: ['sha', 's_ecs', 's_off', 's_scs', 's_suez', 's_med', 's_bos', 'nvr'], seaUntil: 7, check: 'nvr', days: [45, 70], risky: true,
      t: { ru: 'Море через Суэц в Новороссийск', en: 'Sea via Suez to Novorossiysk', zh: '海运经苏伊士至新罗西斯克', tr: 'Süveyş üzerinden Novorossiysk’e deniz' },
      plus: { ru: 'Прямо в порт юга России: дешевле для Краснодарского края и Ростова, если маршрут доступен', en: 'Direct to a southern Russian port: cheaper for Krasnodar and Rostov when available', zh: '直达俄罗斯南部港口：可行时对克拉斯诺达尔、罗斯托夫更便宜', tr: 'Güney Rusya limanına doğrudan: uygunsa Krasnodar ve Rostov için daha ucuz' },
      minus: { ru: 'Сейчас опасно: 1 августа 2026 у Новороссийска потоплен контейнеровоз «Янина» (FESCO), FESCO остановила рейсы по Чёрному морю, надбавка за военный риск ~$1000 за контейнер; плюс Красное море и обходы вокруг Африки', en: 'Dangerous now: on 1 Aug 2026 the FESCO container ship Yanina was sunk near Novorossiysk, FESCO suspended Black Sea calls, war-risk surcharge ~$1,000/container; plus Red Sea detours around Africa', zh: '当前危险：2026年8月1日FESCO集装箱船“雅尼娜”号在新罗西斯克附近被击沉，FESCO停止黑海航线，战争险附加费约每箱1000美元；另有红海绕行非洲', tr: 'Şu an tehlikeli: 1 Ağustos 2026’da FESCO’nun Yanina konteyner gemisi Novorossiysk yakınında batırıldı, FESCO Karadeniz seferlerini durdurdu, savaş riski ek ücreti konteyner başına ~1.000 $; ayrıca Kızıldeniz ve Afrika etrafından dolaşma' } },
    { id: 'air', mode: 'air', path: ['sha', 'msk'], air: true, check: null, days: [2, 7],
      t: { ru: 'Авиа Шанхай/Пекин/Гуанчжоу — Москва', en: 'Air Shanghai/Beijing/Guangzhou — Moscow', zh: '空运上海/北京/广州—莫斯科', tr: 'Hava yolu Şanghay/Pekin/Guangzhou — Moskova' },
      plus: { ru: 'Самый быстрый: перелёт ~9 часов, от двери до двери около недели', en: 'Fastest: ~9-hour flight, about a week door to door', zh: '最快：飞行约9小时，门到门约一周', tr: 'En hızlı: ~9 saat uçuş, kapıdan kapıya yaklaşık bir hafta' },
      minus: { ru: 'Дорого, выгодно для лёгких, срочных и дорогих грузов', en: 'Expensive; worth it for light, urgent and high-value cargo', zh: '昂贵；适合轻、急、高价值货物', tr: 'Pahalı; hafif, acil ve değerli yükler için uygun' } },
  ];

  // ---------- регионы
  var RU_REG = { far: ['владивосток', 'уссурийск', 'находка', 'хабаровск', 'благовещенск', 'артём', 'артем', 'комсомольск', 'южно-сахалинск', 'vladivostok', 'khabarovsk', 'blagoveshchensk'],
    sib: ['новосибирск', 'иркутск', 'красноярск', 'омск', 'улан-удэ', 'чита', 'томск', 'кемерово', 'барнаул', 'новокузнецк', 'novosibirsk', 'irkutsk', 'krasnoyarsk', 'omsk'],
    ural: ['екатеринбург', 'челябинск', 'тюмень', 'пермь', 'уфа', 'оренбург', 'курган', 'yekaterinburg', 'chelyabinsk', 'perm', 'ufa'],
    south: ['новороссийск', 'геленджик', 'краснодар', 'ростов', 'сочи', 'анапа', 'темрюк', 'севастополь', 'симферополь', 'ставрополь', 'волгоград', 'астрахань', 'новоросс', 'novorossiysk', 'krasnodar', 'rostov', 'sochi', 'gelendzhik'],
    nw: ['санкт-петербург', 'петербург', 'спб', 'мурманск', 'калининград', 'архангельск', 'st. petersburg', 'saint petersburg', 'petersburg'] };
  var CN_REG = { west: ['урумчи', 'чэнду', 'ченду', 'чунцин', 'сиань', 'ланьчжоу', 'урумqi', 'urumqi', 'chengdu', 'chongqing', "xi'an", 'xian'],
    ne: ['харбин', 'шэньян', 'шеньян', 'далянь', 'чанчунь', 'harbin', 'shenyang', 'dalian'],
    south: ['гуанчжоу', 'шэньчжэнь', 'шеньчжень', 'фошань', 'дунгуань', 'гонконг', 'сямынь', 'guangzhou', 'shenzhen', 'foshan', 'dongguan', 'xiamen'] };
  function region(city, table) { var c = String(city || '').toLowerCase(); for (var r in table) if (table[r].some(function (x) { return c.indexOf(x) >= 0; })) return r; return ''; }
  var DEST = { far: 'vvo', sib: 'nsk', ural: 'ekb', south: 'krd', nw: 'spb', '': 'msk' };
  var ORIG = { west: 'urc', ne: 'hrb', south: 'can', '': 'sha' };

  // Советник: варианты для пары регионов и вида транспорта, с объяснением
  function advise(from, to, mode) {
    var o = region(from, CN_REG), d = region(to, RU_REG), L = LANG();
    var list = C.filter(function (c) { return !mode || mode === 'all' || c.mode === mode; });
    function score(c) {
      var s = 0;
      if (d === 'far') s += c.far ? 6 : (c.id === 'sea_vvo' ? 4 : -4);
      else if (c.far) s -= 8;
      if (d === 'south') { if (c.id === 'sea_nvr') s += 2; if (c.id === 'rail_kz' || c.id === 'auto_kz') s += 4; if (c.id === 'sea_vvo') s += 3; }
      if (d === 'ural' && /_kz$/.test(c.id)) s += 3;
      if (d === 'sib' && /_zab$|_erl$/.test(c.id)) s += 4;
      if (d === 'nw' && c.id === 'sea_vvo') s += 1;
      if (o === 'west' && /_kz$/.test(c.id)) s += 5;
      if (o === 'ne' && /_zab$|_grd$|_pgr$|_blg$|_hun$/.test(c.id)) s += 3;
      if (o === 'south' && c.id === 'sea_vvo') s += 3;
      if (c.risky) s -= 3;
      if (/_zab$/.test(c.id)) s += 1; // основной коридор
      return s;
    }
    list = list.map(function (c) { return { c: c, s: score(c) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, mode && mode !== 'all' ? 3 : 4);
    var why = [];
    var W = {
      ru: { far: 'Груз идёт на Дальний Восток — короткие переходы Приморья и Амура быстрее и дешевле, чем через Забайкальск.', south: 'Юг России: морем в Новороссийск было бы дешевле, но после атаки на судно в августе 2026 Чёрное море фактически закрыто для потребительских грузов — надёжнее Казахстан или Дальний Восток + ЖД.', ural: 'Урал удобно закрывается через Казахстан — путь короче, чем через Забайкальск.', sib: 'Сибирь ближе всего через Забайкальск или Монголию.', west: 'Отправка из Западного Китая — через Хоргос ближе всего.', def: 'Для центра России основной выбор — ЖД через Забайкальск или Казахстан; самый дешёвый для контейнеров — море до Владивостока + ЖД; самый быстрый — авиа.' },
      en: { far: 'Cargo goes to the Far East — the Primorye and Amur crossings are faster and cheaper than Zabaikalsk.', south: 'Southern Russia: sea to Novorossiysk would be cheaper, but after the August 2026 attack on a vessel the Black Sea is effectively closed for consumer goods — Kazakhstan or the Far East + rail is more reliable.', ural: 'The Urals are best reached via Kazakhstan — shorter than via Zabaikalsk.', sib: 'Siberia is closest via Zabaikalsk or Mongolia.', west: 'Shipping from Western China — Khorgos is closest.', def: 'For central Russia the main choice is rail via Zabaikalsk or Kazakhstan; cheapest for containers is sea to Vladivostok + rail; fastest is air.' },
      zh: { far: '货物去远东——滨海边疆区和阿穆尔口岸比后贝加尔斯克更快更便宜。', south: '俄罗斯南部：海运至新罗西斯克本应更便宜，但2026年8月船只遇袭后黑海对消费品实际已关闭——经哈萨克斯坦或远东+铁路更可靠。', ural: '去乌拉尔经哈萨克斯坦更近。', sib: '去西伯利亚经后贝加尔斯克或蒙古最近。', west: '从中国西部发货——霍尔果斯最近。', def: '去俄罗斯中部主要选择经后贝加尔斯克或哈萨克斯坦的铁路；整箱最便宜是海运至符拉迪沃斯托克+铁路；最快是空运。' },
      tr: { far: 'Yük Uzak Doğu’ya gidiyor — Primorye ve Amur geçişleri Zabaykalsk’tan daha hızlı ve ucuz.', south: 'Güney Rusya: Novorossiysk’e deniz daha ucuz olurdu, ancak Ağustos 2026’daki gemi saldırısından sonra Karadeniz tüketim malları için fiilen kapalı — Kazakistan veya Uzak Doğu + demiryolu daha güvenilir.', ural: 'Urallar’a Kazakistan üzerinden daha kısa.', sib: 'Sibirya’ya en yakın yol Zabaykalsk veya Moğolistan.', west: 'Batı Çin’den gönderim — Horgos en yakın.', def: 'Orta Rusya için ana seçenek Zabaykalsk veya Kazakistan üzerinden demiryolu; konteyner için en ucuzu Vladivostok’a deniz + demiryolu; en hızlısı hava yolu.' },
    }[L] || {};
    why.push(W[d] || W[o] || W.def);
    return { origin: ORIG[o], dest: DEST[d], items: list.map(function (x) { return x.c; }), why: why[0], region: d };
  }

  // ---------- рисование
  var LON0 = 28, LON1 = 140, LAT0 = 14, LAT1 = 62;
  function xy(k, W, H) { var n = N[k]; return [(n[0] - LON0) / (LON1 - LON0) * W, (LAT1 - n[1]) / (LAT1 - LAT0) * H]; }
  function pathD(c, W, H, ofrom, odest) {
    var p = c.path.slice();
    if (ofrom && ofrom !== 'sha' && p[0] === 'sha') p[0] = ofrom;
    if (odest && p[p.length - 1] === 'msk' && odest !== 'msk' && !c.far) {
      // обрезаем путь у ближайшего к назначению узла и ведём к нему
      var di = p.indexOf(odest); if (di > 0) p = p.slice(0, di + 1); else p.push(odest);
    }
    if (c.air) { var a = xy(p[0], W, H), b = xy(p[p.length - 1], W, H); var mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - H * 0.18; return 'M' + a.join(' ') + ' Q' + mx + ' ' + my + ' ' + b.join(' '); }
    return p.map(function (k, i) { return (i ? 'L' : 'M') + xy(k, W, H).map(function (v) { return v.toFixed(1); }).join(' '); }).join(' ');
  }
  var COLORS = { rail: '#9CE8CB', auto: '#FFD08A', sea: '#8FC7FF', air: '#F3A6FF' };
  function render(svg, opts) {
    if (!svg) return;
    var W = 560, H = 300; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    var adv = advise(opts.from, opts.to, opts.mode || 'all');
    var main = adv.items[0];
    var h = '';
    // сетка-графикула
    for (var lon = 40; lon <= 140; lon += 20) { var x = (lon - LON0) / (LON1 - LON0) * W; h += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" class="g"/>'; }
    for (var lat = 20; lat <= 60; lat += 10) { var y = (LAT1 - lat) / (LAT1 - LAT0) * H; h += '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" class="g"/>'; }
    var L = LANG();
    var lbl = { ru: ['РОССИЯ', 'КИТАЙ', 'КАЗАХСТАН', 'МОНГОЛИЯ'], en: ['RUSSIA', 'CHINA', 'KAZAKHSTAN', 'MONGOLIA'], zh: ['俄罗斯', '中国', '哈萨克斯坦', '蒙古'], tr: ['RUSYA', 'ÇİN', 'KAZAKİSTAN', 'MOĞOLİSTAN'] }[L] || [];
    [[lbl[0], 75, 62], [lbl[1], 103, 33], [lbl[2], 66, 47.5], [lbl[3], 100, 45.5]].forEach(function (t) { var p = [(t[1] - LON0) / (LON1 - LON0) * W, (LAT1 - t[2]) / (LAT1 - LAT0) * H]; h += '<text x="' + p[0] + '" y="' + p[1] + '" class="cn">' + t[0] + '</text>'; });
    // все варианты бледно, главный — ярко
    adv.items.slice().reverse().forEach(function (c, i) {
      var d = pathD(c, W, H, adv.origin, adv.dest), isMain = c === main;
      h += '<path d="' + d + '" class="r ' + c.mode + (isMain ? ' main' : '') + (c.risky ? ' risky' : '') + '" stroke="' + COLORS[c.mode] + '"/>';
      if (isMain) h += '<circle r="5" class="comet"><animateMotion dur="' + (c.mode === 'air' ? 3 : c.mode === 'sea' ? 9 : 7) + 's" repeatCount="indefinite" path="' + d + '"/></circle>';
    });
    // пункты пропуска основного варианта и города
    var pts = {}; adv.items.forEach(function (c) { if (c.check) pts[c.check] = 1; });
    Object.keys(pts).forEach(function (k) { if (k === adv.dest || k === adv.origin) return; var p = xy(k, W, H), end = p[0] > W - 110; h += '<rect x="' + (p[0] - 3.5) + '" y="' + (p[1] - 3.5) + '" width="7" height="7" transform="rotate(45 ' + p[0] + ' ' + p[1] + ')" class="chk"/><text x="' + (end ? p[0] - 7 : p[0] + 7) + '" y="' + (p[1] + 12) + '"' + (end ? ' text-anchor="end"' : '') + ' class="cl">' + name(k) + '</text>'; });
    var o = xy(adv.origin, W, H), dd = xy(adv.dest, W, H);
    var oe = o[0] > W - 110; h += '<circle cx="' + o[0] + '" cy="' + o[1] + '" r="6" class="o"/><text x="' + (oe ? o[0] - 9 : o[0] + 9) + '" y="' + (o[1] + 4) + '"' + (oe ? ' text-anchor="end"' : '') + ' class="ct">' + (opts.fromLabel || name(adv.origin)) + '</text>';
    h += '<circle cx="' + dd[0] + '" cy="' + dd[1] + '" r="6" class="d"/><text x="' + (dd[0] + 9) + '" y="' + (dd[1] - 6) + '" class="ct">' + (opts.toLabel || name(adv.dest)) + '</text>';
    svg.innerHTML = '<style>.g{stroke:rgba(255,255,255,.07);stroke-width:1}.cn{fill:rgba(255,255,255,.22);font:700 11px Inter,sans-serif;letter-spacing:.2em}.r{fill:none;stroke-width:1.6;opacity:.35;stroke-dasharray:3 5;stroke-linecap:round;stroke-linejoin:round}.r.main{opacity:1;stroke-width:2.6;stroke-dasharray:2 7;animation:v3mv 1s linear infinite}.r.risky{stroke:#FF8A70}.comet{fill:#E8A33D;filter:drop-shadow(0 0 6px #FFB86B)}.chk{fill:#E8A33D}.cl{fill:#FFE3B0;font:600 9.5px Inter,sans-serif}.o,.d{fill:#fff;stroke:#E8A33D;stroke-width:2}.ct{fill:#fff;font:700 11.5px Inter,sans-serif}</style>' + h;
    return adv;
  }
  window.IOMA_ROUTES = { advise: advise, render: render, corridors: C, name: name, colors: COLORS, nodes: N };
})();
