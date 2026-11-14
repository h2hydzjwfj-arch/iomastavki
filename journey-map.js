/* IOMASTAVKA — карта главной: глобус, маршрут по шагам и рассказ о пути.
   1) Откуда — написать город или нажать его на глобусе; 2) Куда; 3) Каким транспортом — с рекомендацией (route-advice.js)
   и честным «нельзя» (из Кореи нет дороги). 4) Путь по этапам: камера облетает маршрут с разных сторон, транспорт едет,
   на каждой остановке — что происходит, сколько это дней и километров: погрузка, граница, порт, хаб в Москве, доставка
   перевозчиком по России. 5) Итог: весь путь, сроки, кнопка расчёта.
   Глобус крутится сам, пока ничего не выбрано; его можно вращать мышью или пальцем и приближать колёсиком.
   Рисуем на canvas: d3-geo (ортографическая проекция), суша — globe-geo.js (Natural Earth). */
(function () {
  'use strict';
  var L6 = ['ru', 'en', 'zh', 'de', 'fr', 'tr'];
  function lang() { var l; try { l = localStorage.getItem('iomastavka_lang'); } catch (e) {} return L6.indexOf(l) >= 0 ? l : 'ru'; }
  function tx(k, a, b) { var v = TX[k], s = v ? v[L6.indexOf(lang())] || v[1] || v[0] : k; return s.replace('{a}', a == null ? '' : a).replace('{b}', b == null ? '' : b); }
  var TX = {
    s1: ['Откуда', 'From', '起点', 'Von', 'Départ', 'Nereden'], s2: ['Куда', 'To', '终点', 'Nach', 'Arrivée', 'Nereye'], s3: ['Транспорт', 'Transport', '运输方式', 'Transport', 'Transport', 'Taşıma'],
    phFrom: ['Город в Китае или Азии', 'City in China or Asia', '中国或亚洲城市', 'Stadt in China oder Asien', 'Ville en Chine ou en Asie', 'Çin’de veya Asya’da şehir'],
    phTo: ['Город в России', 'City in Russia', '俄罗斯城市', 'Stadt in Russland', 'Ville en Russie', 'Rusya’da şehir'],
    askFrom: ['Откуда везём? Напишите город или нажмите его на глобусе', 'Where from? Type a city or tap it on the globe', '从哪里发货？输入城市或在地球上点击', 'Woher? Stadt eingeben oder auf dem Globus antippen', 'D’où ? Saisissez une ville ou touchez-la sur le globe', 'Nereden? Şehri yazın veya küre üzerinde dokunun'],
    askTo: ['Куда везём? Напишите город в России или нажмите его на глобусе', 'Where to? Type a city in Russia or tap it on the globe', '运往哪里？输入俄罗斯城市或在地球上点击', 'Wohin? Stadt in Russland eingeben oder antippen', 'Vers où ? Saisissez une ville en Russie ou touchez-la', 'Nereye? Rusya’da bir şehir yazın veya dokunun'],
    askMode: ['Каким транспортом предпочитаете?', 'Which transport do you prefer?', '您希望选择哪种运输方式？', 'Welches Transportmittel bevorzugen Sie?', 'Quel transport préférez-vous ?', 'Hangi taşımayı tercih edersiniz?'],
    none: ['Нет в списке — выберите ближайший крупный город', 'Not in the list — choose the nearest major city', '列表中没有——请选择最近的大城市', 'Nicht in der Liste — wählen Sie die nächste Großstadt', 'Absente de la liste — choisissez la grande ville la plus proche', 'Listede yok — en yakın büyük şehri seçin'],
    drag: ['Глобус можно крутить', 'Drag to turn the globe', '可拖动旋转地球', 'Globus lässt sich drehen', 'Faites tourner le globe', 'Küreyi çevirebilirsiniz'],
    rec: ['Рекомендуем', 'Recommended', '推荐', 'Empfohlen', 'Recommandé', 'Önerilen'], no: ['нельзя', 'not possible', '不可行', 'nicht möglich', 'impossible', 'mümkün değil'],
    skip: ['Пропустить', 'Skip', '跳过', 'Überspringen', 'Passer', 'Geç'], again: ['Новый маршрут', 'New route', '新路线', 'Neue Route', 'Nouvel itinéraire', 'Yeni rota'],
    other: ['Другой транспорт', 'Other transport', '其他运输方式', 'Anderer Transport', 'Autre transport', 'Başka taşıma'], calc: ['Рассчитать ставку', 'Get a rate', '计算运费', 'Preis berechnen', 'Calculer le tarif', 'Fiyat hesapla'],
    replay: ['Показать путь ещё раз', 'Show the journey again', '再看一遍路线', 'Weg noch einmal zeigen', 'Revoir le trajet', 'Yolu tekrar göster'],
    pause: ['Пауза', 'Pause', '暂停', 'Pause', 'Pause', 'Duraklat'], play: ['Дальше', 'Play', '继续', 'Weiter', 'Lecture', 'Devam'], next: ['Следующий этап', 'Next stage', '下一阶段', 'Nächste Etappe', 'Étape suivante', 'Sonraki aşama'],
    days: ['дн.', 'days', '天', 'Tage', 'jours', 'gün'], upto: ['до {a} дн.', 'up to {a} days', '最多{a}天', 'bis {a} Tage', 'jusqu’à {a} jours', '{a} güne kadar'], km: ['км', 'km', '公里', 'km', 'km', 'km'],
    day: ['день', 'day', '第', 'Tag', 'jour', 'gün'], total: ['всего', 'total', '总计', 'gesamt', 'total', 'toplam'], time: ['Срок', 'Transit time', '时效', 'Laufzeit', 'Délai', 'Süre'],
    way: ['Путь', 'Route', '路线', 'Route', 'Itinéraire', 'Güzergâh'], pop: ['Часто везём', 'Popular', '常用', 'Häufig', 'Fréquent', 'Sık'],
    stage: ['Этап {a} из {b}', 'Stage {a} of {b}', '第{a}段，共{b}段', 'Etappe {a} von {b}', 'Étape {a} sur {b}', 'Aşama {a} / {b}'], how: ['Как едет груз', 'How the cargo travels', '货物如何运输', 'So reist die Fracht', 'Le voyage de la marchandise', 'Yük nasıl gider'],
    // этапы пути
    load: ['Забор груза: {a}', 'Pick-up: {a}', '提货：{a}', 'Abholung: {a}', 'Enlèvement : {a}', 'Yükün alınması: {a}'],
    loadRoad: ['погрузка в машину у поставщика, экспортная декларация', 'loading the truck at the supplier, export declaration', '在供应商处装车，出口报关', 'Verladung beim Lieferanten, Ausfuhranmeldung', 'chargement du camion chez le fournisseur, déclaration d’export', 'tedarikçide araca yükleme, ihracat beyannamesi'],
    loadRail: ['загрузка контейнера и отправка со станции', 'container loading and dispatch from the station', '装箱并从车站发运', 'Containerbeladung und Abfahrt vom Bahnhof', 'empotage du conteneur et départ de la gare', 'konteyner yükleme ve istasyondan sevk'],
    loadSea: ['загрузка контейнера и экспортная декларация', 'container loading and export declaration', '装箱和出口报关', 'Containerbeladung und Ausfuhranmeldung', 'empotage du conteneur et déclaration d’export', 'konteyner yükleme ve ihracat beyannamesi'],
    loadAir: ['доставка в аэропорт и экспортное оформление', 'delivery to the airport and export clearance', '送往机场并办理出口手续', 'Zustellung zum Flughafen und Ausfuhrabfertigung', 'acheminement à l’aéroport et formalités d’export', 'havalimanına teslim ve ihracat işlemleri'],
    cn: ['По Китаю: {a} → {b}', 'Across China: {a} → {b}', '中国境内：{a} → {b}', 'Durch China: {a} → {b}', 'À travers la Chine : {a} → {b}', 'Çin içinde: {a} → {b}'],
    cnRoad: ['китайский грузовик до границы', 'Chinese truck to the border', '中国卡车运至边境', 'chinesischer Lkw bis zur Grenze', 'camion chinois jusqu’à la frontière', 'Çin tırı ile sınıra'],
    cnRail: ['китайская железная дорога до границы', 'Chinese railway to the border', '中国铁路运至边境', 'chinesische Bahn bis zur Grenze', 'chemin de fer chinois jusqu’à la frontière', 'Çin demiryolu ile sınıra'],
    toPort: ['До порта: {a} → {b}', 'To the port: {a} → {b}', '运往港口：{a} → {b}', 'Zum Hafen: {a} → {b}', 'Vers le port : {a} → {b}', 'Limana: {a} → {b}'],
    toPortSub: ['машина везёт контейнер в порт', 'a truck takes the container to the port', '卡车将集装箱运往港口', 'ein Lkw bringt den Container zum Hafen', 'un camion amène le conteneur au port', 'konteyner kamyonla limana gider'],
    trMN: ['Транзит через Монголию', 'Transit through Mongolia', '经蒙古过境', 'Transit durch die Mongolei', 'Transit par la Mongolie', 'Moğolistan üzerinden transit'],
    trKZ: ['Транзит через Казахстан', 'Transit through Kazakhstan', '经哈萨克斯坦过境', 'Transit durch Kasachstan', 'Transit par le Kazakhstan', 'Kazakistan üzerinden transit'],
    trSub: ['пломба и транзитная декларация', 'seal and transit declaration', '铅封和过境申报', 'Plombe und Transitanmeldung', 'scellé et déclaration de transit', 'mühür ve transit beyanı'],
    border: ['Граница: {a}', 'Border: {a}', '口岸：{a}', 'Grenze: {a}', 'Frontière : {a}', 'Sınır: {a}'],
    borderRoad: ['таможенный транзит и перегруз в российскую машину', 'customs transit and reloading onto a Russian truck', '海关过境并换装俄罗斯卡车', 'Zolltransit und Umladen auf einen russischen Lkw', 'transit douanier et transbordement sur un camion russe', 'gümrük transiti ve Rus tırına aktarma'],
    borderRail: ['таможня и перестановка на российскую колею 1520 мм', 'customs and change to the Russian 1520 mm gauge', '海关和换装俄罗斯1520毫米轨距', 'Zoll und Umspuren auf die russische Spur 1520 mm', 'douane et changement d’écartement russe 1520 mm', 'gümrük ve Rus 1520 mm hattına geçiş'],
    borderTr: ['таможенный контроль на въезде в транзитную страну', 'customs check entering the transit country', '进入过境国的海关检查', 'Zollkontrolle bei der Einreise ins Transitland', 'contrôle douanier à l’entrée du pays de transit', 'transit ülkeye girişte gümrük kontrolü'],
    sea: ['Море: {a} → {b}', 'Sea: {a} → {b}', '海运：{a} → {b}', 'See: {a} → {b}', 'Mer : {a} → {b}', 'Deniz: {a} → {b}'],
    seaSub: ['контейнеровоз', 'container ship', '集装箱船', 'Containerschiff', 'porte-conteneurs', 'konteyner gemisi'],
    port: ['Порт {a}', 'Port of {a}', '{a}港', 'Hafen {a}', 'Port de {a}', '{a} Limanı'],
    portSub: ['выгрузка, транзитная декларация и погрузка на поезд — сейчас до 1–2 недель', 'unloading, transit declaration and loading onto a train — now up to 1–2 weeks', '卸船、过境申报并装上火车——目前最长1–2周', 'Entladen, Transitanmeldung und Verladung auf den Zug — derzeit bis zu 1–2 Wochen', 'déchargement, déclaration de transit et chargement sur le train — actuellement jusqu’à 1–2 semaines', 'boşaltma, transit beyanı ve trene yükleme — şu an 1–2 haftaya kadar'],
    ru: ['По России: {a} → {b}', 'Across Russia: {a} → {b}', '俄罗斯境内：{a} → {b}', 'Durch Russland: {a} → {b}', 'À travers la Russie : {a} → {b}', 'Rusya içinde: {a} → {b}'],
    ruRoad: ['российская машина по трассе', 'Russian truck on the highway', '俄罗斯卡车走公路', 'russischer Lkw auf der Fernstraße', 'camion russe sur l’autoroute', 'Rus tırı karayolunda'],
    ruRail: ['контейнерный поезд по Транссибу', 'container train on the Trans-Siberian', '集装箱班列走西伯利亚大铁路', 'Containerzug auf der Transsib', 'train de conteneurs sur le Transsibérien', 'Trans-Sibirya’da konteyner treni'],
    fly: ['Перелёт: {a} → {b}', 'Flight: {a} → {b}', '航班：{a} → {b}', 'Flug: {a} → {b}', 'Vol : {a} → {b}', 'Uçuş: {a} → {b}'],
    flySub: ['прямой рейс, груз в грузовом отсеке', 'direct flight, cargo in the hold', '直飞，货物在货舱', 'Direktflug, Fracht im Laderaum', 'vol direct, marchandise en soute', 'direkt uçuş, yük kargo bölmesinde'],
    apt: ['Аэропорт {a}: обработка и таможня', 'Airport {a}: handling and customs', '{a}机场：操作和清关', 'Flughafen {a}: Abfertigung und Zoll', 'Aéroport de {a} : manutention et douane', '{a} Havalimanı: elleçleme ve gümrük'],
    svoS: ['Шереметьево', 'Sheremetyevo', '谢列梅捷沃', 'Scheremetjewo', 'Cheremetievo', 'Şeremetyevo'],
    svo: ['Шереметьево: обработка и таможня', 'Sheremetyevo: handling and customs', '谢列梅捷沃：操作和清关', 'Scheremetjewo: Abfertigung und Zoll', 'Cheremetievo : manutention et douane', 'Şeremetyevo: elleçleme ve gümrük'],
    aptSub: ['терминал выдаёт груз после таможенного выпуска', 'the terminal releases the cargo after customs clearance', '货站在海关放行后交货', 'das Terminal gibt die Fracht nach der Zollfreigabe heraus', 'le terminal remet la marchandise après dédouanement', 'terminal yükü gümrük onayından sonra teslim eder'],
    hub: ['Москва — главный хаб', 'Moscow — the main hub', '莫斯科——主要枢纽', 'Moskau — das Hauptdrehkreuz', 'Moscou — le hub principal', 'Moskova — ana merkez'],
    hubSub: ['таможенное оформление и перегруз на сборный транспорт', 'customs clearance and reloading for groupage', '清关并换装拼货运输', 'Verzollung und Umladen in Sammelgut', 'dédouanement et transbordement en groupage', 'gümrükleme ve parsiyel taşımaya aktarma'],
    carrier: ['По России: {a} → {b}', 'Within Russia: {a} → {b}', '俄罗斯境内：{a} → {b}', 'Innerhalb Russlands: {a} → {b}', 'En Russie : {a} → {b}', 'Rusya içinde: {a} → {b}'],
    carrierSub: ['Деловые Линии, ПЭК и др. — сборным грузом', 'Dellin, PEK and others — as groupage', 'Dellin、PEK等——拼货运输', 'Dellin, PEK u. a. — als Sammelgut', 'Dellin, PEK et autres — en groupage', 'Dellin, PEK vb. — parsiyel yük olarak'],
    fin: ['{a}: груз у вас', '{a}: cargo delivered', '{a}：货物送达', '{a}: Fracht zugestellt', '{a} : marchandise livrée', '{a}: yük teslim edildi'],
    finDirect: ['таможенное оформление на терминале и доставка до вашего склада', 'customs clearance at the terminal and delivery to your warehouse', '在货站清关并送到您的仓库', 'Verzollung am Terminal und Zustellung in Ihr Lager', 'dédouanement au terminal et livraison à votre entrepôt', 'terminalde gümrükleme ve deponuza teslim'],
    finHub: ['доставка до вашего склада', 'delivery to your warehouse', '送到您的仓库', 'Zustellung in Ihr Lager', 'livraison à votre entrepôt', 'deponuza teslim'],
    CN: ['Китай', 'China', '中国', 'China', 'Chine', 'Çin'], MN: ['Монголия', 'Mongolia', '蒙古', 'Mongolei', 'Mongolie', 'Moğolistan'], KZ: ['Казахстан', 'Kazakhstan', '哈萨克斯坦', 'Kasachstan', 'Kazakhstan', 'Kazakistan'], RU: ['Россия', 'Russia', '俄罗斯', 'Russland', 'Russie', 'Rusya']
  };
  var MN = { air: ['Авиа', 'Air', '空运', 'Luftfracht', 'Aérien', 'Hava'], road: ['Авто', 'Truck', '公路', 'Lkw', 'Camion', 'Karayolu'], rail: ['ЖД', 'Rail', '铁路', 'Bahn', 'Rail', 'Demiryolu'], sea: ['Море + ЖД', 'Sea + rail', '海运+铁路', 'See + Bahn', 'Mer + rail', 'Deniz + demiryolu'] };
  function mn(m) { return MN[m][L6.indexOf(lang())] || MN[m][1]; }
  // тонкие значки 32×32: машина, поезд и корабль — сбоку (носом вправо), самолёт — сверху (носом вверх)
  var IC = {
    truck: 'M3 9.5h16.6V20H3zM19.6 13h5.3l3.6 3.8V20h-8.9M21.4 14.3v2.7h4.9M6 13.4h10.5M2.5 20h26.5M9 21.9a2 2 0 1 1-4 0a2 2 0 1 1 4 0M13.6 21.9a2 2 0 1 1-4 0a2 2 0 1 1 4 0M27.2 21.9a2 2 0 1 1-4 0a2 2 0 1 1 4 0',
    train: 'M1.5 11.6h11.2v8.4H1.5zM14.4 11.6h8.6c3.6 0 6.5 2.7 6.9 6.2l.3 2.2H14.4zM24.2 13.5h1.1c1.2 0 2.2.8 2.6 2.1h-3.7zM3.8 14.3h2.4M8.2 14.3h2.4M16.6 14.3h4.2M12.7 18h1.7M1 23.3h30M5.5 21.6a1.2 1.2 0 1 1-2.4 0a1.2 1.2 0 1 1 2.4 0M11 21.6a1.2 1.2 0 1 1-2.4 0a1.2 1.2 0 1 1 2.4 0M18.4 21.6a1.2 1.2 0 1 1-2.4 0a1.2 1.2 0 1 1 2.4 0M27.6 21.6a1.2 1.2 0 1 1-2.4 0a1.2 1.2 0 1 1 2.4 0',
    ship: 'M2 18.6h28.2l-3.7 5.6H5.7zM4.6 18.6v-3.3h4v3.3M8.6 18.6v-3.3h4v3.3M12.6 18.6v-3.3h4v3.3M6.6 15.3V12h4v3.3M10.6 15.3V12h4v3.3M20.5 18.6v-7h4.6v7M22.8 11.6V8.8M21.4 14h3.4M3.4 27.2c1.5 0 1.5-.9 3-.9s1.5.9 3 .9 1.5-.9 3-.9 1.5.9 3 .9',
    plane: 'M16 2.6c1.05 0 1.75 1.15 1.75 2.7v6.7l10.6 6.2v2.5l-10.6-3.3v6.2l3.3 2.5v2.1L16 26.9l-5.05 1.3v-2.1l3.3-2.5v-6.2L3.65 20.7v-2.5l10.6-6.2V5.3c0-1.55.7-2.7 1.75-2.7z',
    box: 'M8 11.5l8-4.3 8 4.3v9.2l-8 4.3-8-4.3zM8 11.5l8 4.4 8-4.4M16 15.9v9.1M12 9.4l8 4.3',
    gate: 'M8.5 25V9.5M6 25h5M8.5 12.2h18.5v3.5H8.5zM12.8 12.2l-2.2 3.5M17.3 12.2l-2.2 3.5M21.8 12.2l-2.2 3.5M26.3 12.2l-2.2 3.5',
    crane: 'M9.5 25.5V7.5h3v18M9.5 9.5h16M12.5 7.5l13 2M23.5 9.5v5.3M21.3 14.8h4.4v3.4h-4.4zM5.5 25.5h11',
    hub: 'M5 14.2l11-6.3 11 6.3v11.3H5zM9.2 25.5v-7.3h13.6v7.3M9.2 21.8h13.6',
    flag: 'M10 26.5V6.5M10 7.5h12.5l-3.2 3.7 3.2 3.7H10'
  };
  var MODE_IC = { air: 'plane', road: 'truck', rail: 'train', sea: 'ship' };
  var POP_FROM = ['yw', 'gz', 'sz', 'sh', 'bj', 'pus'], POP_TO = ['msk', 'spb', 'ekb', 'nsk', 'kzn', 'vvo'];
  var ADV2MAP = { auto: 'road', rail: 'rail', sea: 'sea', sea_only: 'sea', sea_direct: 'sea', air: 'air' };
  // страна каждой точки маршрута: по ней режем путь на этапы и ставим границы
  var CT = {};
  'msk spb nnov kzn sam ekb chel omsk nsk krs irk ulu chita bel khb uss vvo krd rnd zab nau kya pog blg perm ufa tmn vrn'.split(' ').forEach(function (k) { CT[k] = 'RU'; });
  'dos akt ast'.split(' ').forEach(function (k) { CT[k] = 'KZ'; }); CT.uba = 'MN'; CT.minsk = 'BY';
  'pus sel icn'.split(' ').forEach(function (k) { CT[k] = 'KR'; }); CT.tyo = CT.osa = 'JP'; CT.tpe = CT.khh = 'TW';
  var BORDER_PT = { mzl: 1, ala: 1, erl: 1, sfh: 1, hh: 1, hor: 1, zab: 1, nau: 1, kya: 1, pog: 1, dos: 1 };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function svgI(k, cls) { return '<svg viewBox="0 0 32 32" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '><path d="' + IC[k] + '"/></svg>'; }

  // ---------- суша для глобуса (globe-geo.js)
  var LAND = null;
  function land() {
    if (LAND) return LAND; var G = window.IOMA_GLOBE; if (!G) return (LAND = { far: null, near: null, hot: null, focus: null, lakes: null });
    function ring(s) { var a = s.split(','), x = 0, y = 0, r = []; for (var i = 0; i < a.length; i += 2) { x += +a[i]; y += +a[i + 1]; r.push([x / G.q, y / G.q]); } r.push(r[0]); return r; }
    function mp(s) { return { type: 'MultiPolygon', coordinates: s.split('|').map(function (p) { return p.split(';').map(ring); }) }; }
    var g = { far: [], near: [], hot: [], focus: [] };
    G.c.forEach(function (c) { var geo = mp(c[2]); (c[0] === 'RUS' || c[0] === 'CHN' ? g.focus : c[1] === 0 ? g.hot : c[1] === 1 ? g.near : g.far).push(geo); });
    function col(a) { return { type: 'GeometryCollection', geometries: a }; }
    return (LAND = { far: col(g.far), near: col(g.near), hot: col(g.hot), focus: col(g.focus), lakes: { type: 'MultiPolygon', coordinates: (G.lakes || []).map(function (s) { return [ring(s)]; }) } });
  }

  function mount(el, opts) {
    opts = opts || {};
    var d3 = window.d3, R = window.IOMA_RMAP, G = R.geo;
    if (!d3 || !d3.geoOrthographic) { el.textContent = ''; return { state: {}, setFrom: function () {}, setTo: function () {}, setMode: function () {}, stopAuto: function () {} }; }
    var st = { step: 1, from: null, to: null, mode: null, plan: null };
    el.classList.add('rmap', 'jm', 'jm-g');
    el.innerHTML = '<div class="jm-top"><ol class="jm-steps"></ol><button type="button" class="jm-reset" hidden></button><div class="jm-sug" role="listbox" hidden></div></div>' +
      '<div class="jm-stage"><canvas class="jm-cv" role="img"></canvas><div class="jm-hud" aria-live="polite"></div><div class="jm-cap" aria-live="polite"></div>' +
      '<span class="jm-hint" aria-hidden="true"></span><button type="button" class="jm-skip" hidden></button></div><div class="jm-panel" aria-live="polite"></div>';
    var q = function (s) { return el.querySelector(s); };
    var stage = q('.jm-stage'), cv = q('.jm-cv'), ctx = cv.getContext('2d'), hud = q('.jm-hud'), cap = q('.jm-cap'), hint = q('.jm-hint'), skip = q('.jm-skip'),
      panel = q('.jm-panel'), steps = q('.jm-steps'), reset = q('.jm-reset'), sug = q('.jm-sug');
    function nm(k) { return R.name(k, lang()); }
    function ll(k) { return G.ll(k); }
    function loc() { return ({ ru: 'ru-RU', zh: 'zh-CN', de: 'de-DE', fr: 'fr-FR', tr: 'tr-TR' })[lang()] || 'en-US'; }
    function kmS(n) { return (Math.round(n / 10) * 10).toLocaleString(loc()) + ' ' + tx('km'); }
    function dS(d) { var a = Math.round(d[0]), b = Math.round(d[1]); if (b <= 1) return tx('upto', 1); if (a < 1) a = 1; if (b <= a) return a + ' ' + tx('days'); return a + '–' + b + ' ' + tx('days'); }
    function ctry(k) { return CT[k] || (R.cities[k] ? 'CN' : 'SEA'); }

    // ---------- откуда и куда можно везти
    var FROM = Object.keys(R.cities).filter(function (k) { var c = ctry(k); return c !== 'RU' && c !== 'KZ' && c !== 'MN' && c !== 'BY' && !BORDER_PT[k] && k !== 'hlr' && k !== 'qqh'; });
    var TO = Object.keys(R.cities).filter(function (k) { return ctry(k) === 'RU' && !BORDER_PT[k]; });
    var DOT_FROM = G.dots.cn.filter(function (k) { return FROM.indexOf(k) >= 0; }), DOT_TO = G.dots.ru.filter(function (k) { return TO.indexOf(k) >= 0; });
    function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[\s\-–—]+/g, ' ').trim(); }
    function search(side, text) {
      var list = side === 'from' ? FROM : TO, t = norm(text); if (!t) return (side === 'from' ? POP_FROM : POP_TO).slice();
      var hit = R.find(text), out = [];
      list.forEach(function (k) { var c = R.cities[k], ns = [c[0], c[1], c[2], nm(k)].map(norm), score = -1; ns.forEach(function (n) { if (n === t) score = Math.max(score, 3); else if (n.indexOf(t) === 0) score = Math.max(score, 2); else if (t.length > 1 && n.indexOf(t) > 0) score = Math.max(score, 1); }); if (k === hit) score = 4; if (score >= 0) out.push([score, k]); });
      return out.sort(function (a, b) { return b[0] - a[0]; }).slice(0, 7).map(function (x) { return x[1]; });
    }

    // ---------- советы и план пути по этапам
    function adviseFor(f, t) {
      var A = window.IOMA_ADVICE; if (!A || !f || !t) return null;
      var a = A.advise({ from: R.name(f, 'ru'), to: R.name(t, 'ru'), fromLL: ll(f), toLL: ll(t), lang: lang(), fromLabel: lang() === 'ru' ? undefined : nm(f), toLabel: lang() === 'ru' ? undefined : nm(t) });
      return a && a.ok ? a : null;
    }
    function optFor(a, m) { return a ? a.options.filter(function (o) { return ADV2MAP[o.mode] === m; })[0] || null : null; }
    function hav(a, b) { return d3.geoDistance(a, b) * 6371; }
    function r10(n) { return Math.round(n / 10) * 10; }
    // плавная линия по точкам: углы сглаживаем, между точками — дуги большого круга
    function line(keys, air) {
      var pts = keys.map(ll);
      if (!air && pts.length > 2) for (var it = 0; it < 2; it++) { var o = [pts[0]]; for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1]; if (i > 0) o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]); if (i < pts.length - 2) o.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } o.push(pts[pts.length - 1]); pts = o; }
      var out = [pts[0]];
      for (var j = 0; j < pts.length - 1; j++) { var n = Math.max(1, Math.ceil(d3.geoDistance(pts[j], pts[j + 1]) * 180 / Math.PI / (air ? 0.6 : 0.8))), f = d3.geoInterpolate(pts[j], pts[j + 1]); for (var s = 1; s <= n; s++) out.push(f(s / n)); }
      var cum = [0]; for (var c = 1; c < out.length; c++) cum.push(cum[c - 1] + d3.geoDistance(out[c - 1], out[c]));
      return { pts: out, cum: cum, len: cum[cum.length - 1] || 1e-9 };
    }
    function along(L, p) { var d = L.len * clamp(p, 0, 1), i = 1; while (i < L.cum.length - 1 && L.cum[i] < d) i++; var a = L.cum[i - 1], b = L.cum[i], t = b > a ? (d - a) / (b - a) : 0; return { p: d3.geoInterpolate(L.pts[i - 1], L.pts[i])(t), i: i, t: t }; }
    function nominal(s, m) {
      var k = s.km || 0;
      switch (s.kind) {
        case 'load': return m === 'road' || m === 'air' ? [1, 2] : [2, 4];
        case 'cn': case 'transit': return m === 'road' ? [k / 650, k / 450] : [k / 600, k / 380];
        case 'toPort': return [Math.max(0.5, k / 600), Math.max(1, k / 400)];
        case 'border': return m === 'road' ? [1, 3] : [2, 5];
        case 'sea': return [Math.max(2, k / 600), Math.max(3, k / 380)];
        case 'port': return [7, 14];
        case 'ru': return m === 'road' ? [k / 750, k / 550] : m === 'sea' ? [k / 750, k / 480] : [k / 700, k / 450];
        case 'fly': return [1, 2];
        case 'apt': return [1, 3];
        case 'hub': return [1, 2];
        case 'final': return [1, 2];
      }
      return [0, 1];
    }
    function plan(f, t, m) {
      if (!f || !t || !m) return null;
      var a = adviseFor(f, t), hubMsk = !!(a && a.hub && a.hub.via === 'msk' && t !== 'msk'), main = hubMsk ? 'msk' : t;
      var am = hubMsk ? adviseFor(f, 'msk') : a, o = optFor(am, m) || optFor(a, m), D = o ? o.days.slice() : null, S = [];
      function stop(kind, k, title, sub, extra) { extra = extra || {}; var s = { t: 'stop', kind: kind, at: k, pt: extra.pt || (k ? ll(k) : null), title: title, sub: sub, ic: extra.ic, short: extra.short || (k ? nm(k) : title) }; S.push(s); return s; }
      function leg(kind, keys, veh, km, title, sub, a0) { var s = { t: 'leg', kind: kind, keys: keys, veh: veh, km: r10(km), L: line(keys, kind === 'fly'), title: title, sub: sub, short: nm(a0 || keys[0]) + ' → ' + nm(keys[keys.length - 1]) }; S.push(s); return s; }
      stop('load', f, tx('load', nm(f)), tx(m === 'road' ? 'loadRoad' : m === 'rail' ? 'loadRail' : m === 'sea' ? 'loadSea' : 'loadAir'), { ic: 'box' });
      var r = null;
      if (m === 'air') {
        var dest = main === 'msk' ? 'msk' : main;
        leg('fly', [f, dest], 'plane', hav(ll(f), ll(dest)), tx('fly', nm(f), nm(dest)), tx('flySub'));
        stop('apt', dest, dest === 'msk' ? tx('svo') : tx('apt', nm(dest)), tx('aptSub'), { ic: 'plane', short: dest === 'msk' ? tx('svoS') : nm(dest) });
      } else {
        r = R.routeTo(f, main, m); if (!r) return null;
        var groups = [], cur = null;
        r.path.forEach(function (k) { var c = ctry(k); if (c === 'KR' || c === 'JP' || c === 'TW') c = 'CN'; if (cur && cur.c === c) cur.keys.push(k); else { cur = { c: c, keys: [k] }; groups.push(cur); } });
        var lk = {}; r.legs.forEach(function (x) { lk[x.kind] = (lk[x.kind] || 0) + x.km; });
        var veh = m === 'road' ? 'truck' : 'train';
        groups.forEach(function (g, i) {
          var prev = groups[i - 1], next = groups[i + 1], keys = (prev ? [prev.keys[prev.keys.length - 1]] : []).concat(g.keys);
          if (g.c === 'SEA') {
            var port = prev ? prev.keys[prev.keys.length - 1] : f, to = next ? next.keys[0] : 'vvo';
            var seaKm = Math.max(300, (lk.sea || 0) - (port !== f ? hav(ll(f), ll(port)) * 1.08 : 0));
            leg('sea', keys.concat(next ? [to] : []), 'ship', seaKm, tx('sea', nm(port), nm(to)), tx('seaSub'));
            stop('port', to, tx('port', nm(to)), tx('portSub'), { ic: 'crane' });
            return;
          }
          if (g.c === 'CN') {
            if (next && next.c === 'SEA') { if (g.keys.length > 1) leg('toPort', g.keys, 'truck', hav(ll(g.keys[0]), ll(g.keys[g.keys.length - 1])) * 1.25, tx('toPort', nm(g.keys[0]), nm(g.keys[g.keys.length - 1])), tx('toPortSub')); return; }
            if (g.keys.length > 1) leg('cn', g.keys, veh, lk.china || 0, tx('cn', nm(g.keys[0]), nm(g.keys[g.keys.length - 1])), tx(m === 'road' ? 'cnRoad' : 'cnRail'));
          } else if (g.c === 'MN' || g.c === 'KZ') {
            leg('transit', keys, veh, lk.transit || 0, tx(g.c === 'MN' ? 'trMN' : 'trKZ'), tx('trSub'), g.keys[0]);
          } else if (g.c === 'RU' && prev && prev.c === 'SEA') {
            if (g.keys.length > 1) leg('ru', g.keys, 'train', lk.rail || 0, tx('ru', nm(g.keys[0]), nm(g.keys[g.keys.length - 1])), tx('ruRail'));
          } else if (g.c === 'RU') {
            leg('ru', keys, veh, lk.ru || 0, tx('ru', nm(g.keys[0]), nm(g.keys[g.keys.length - 1])), tx(m === 'road' ? 'ruRoad' : 'ruRail'), g.keys[0]);
          }
          // граница: между сухопутными участками разных стран
          if (next && next.c !== 'SEA' && g.c !== 'SEA') {
            // переход — город на границе; если его нет в маршруте (Казахстан → Россия), ставим между странами
            var a1 = g.keys[g.keys.length - 1], b1 = next.keys[0], close = hav(ll(a1), ll(b1)) < 160, at = BORDER_PT[a1] ? a1 : BORDER_PT[b1] ? b1 : null;
            var label = close ? nm(a1) + ' — ' + nm(b1) : at ? nm(at) : tx(g.c) + ' — ' + tx(next.c);
            stop('border', at, tx('border', label), next.c === 'RU' ? tx(m === 'road' ? 'borderRoad' : 'borderRail') : tx('borderTr'), { ic: 'gate', short: label, pt: at ? null : d3.geoInterpolate(ll(a1), ll(b1))(0.5) });
          }
        });
      }
      if (hubMsk) {
        if (m !== 'air') stop('hub', 'msk', tx('hub'), tx('hubSub'), { ic: 'hub', short: nm('msk') }); // авиа: таможня уже в Шереметьево
        var cs = leg('carrier', ['msk', t], 'truck', a.hub.km || hav(ll('msk'), ll(t)) * 1.22, tx('carrier', nm('msk'), nm(t)), tx('carrierSub'));
        cs.fixed = a.hub.days || [1, 4];
      }
      var fs = stop('final', t, tx('fin', nm(t)), tx(hubMsk ? 'finHub' : 'finDirect'), { ic: 'flag' }); if (hubMsk) fs.fixed = [0, 1];
      // дни: этапы по-честному, сумма — как в совете по маршруту
      var nmin = 0, nmax = 0; S.forEach(function (s) { if (!s.fixed) { s.d = nominal(s, m); nmin += s.d[0]; nmax += s.d[1]; } });
      var f0 = D && nmin ? D[0] / nmin : 1, f1 = D && nmax ? D[1] / nmax : 1;
      S.forEach(function (s) { if (s.fixed) s.d = s.fixed.slice(); else s.d = [s.d[0] * f0, Math.max(s.d[0] * f0, s.d[1] * f1)]; });
      var tot = S.reduce(function (x, s) { return [x[0] + s.d[0], x[1] + s.d[1]]; }, [0, 0]), km = S.reduce(function (x, s) { return x + (s.km || 0); }, 0);
      return { stages: S, days: [Math.round(tot[0]), Math.max(Math.round(tot[0]) + 1, Math.round(tot[1]))], km: km, advice: a, route: r, hub: hubMsk, mode: m };
    }

    // ---------- камера и глобус
    var W = 0, H = 0, DPR = 1, R0 = 100;
    var cam = { lon: 92, lat: 42, g: 0, k: 1.12 }, fly = null, auto = !reduce, idleAt = 0, inertia = null, drag = null, hover = null, dirty = true, raf = 0, visible = true;
    var proj = d3.geoOrthographic().clipAngle(90).precision(0.4), path = d3.geoPath(proj, ctx), grat = d3.geoGraticule10();
    // в рассказе сверху полоса пути, снизу подпись этапа — глобус кадрируем в просвете между ними
    function area() { return st.step === 4 ? [W < 560 ? 70 : 58, H - (W < 560 ? 96 : 84)] : [0, H]; }
    function cy() { var a = area(); return (a[0] + a[1]) / 2; }
    function setProj(c) { c = c || cam; proj.rotate([-c.lon, -c.lat, c.g]).scale(R0 * c.k).translate([W / 2, cy()]); }
    function visibleP(p) { return d3.geoDistance(p, [cam.lon, cam.lat]) < Math.PI / 2 - 0.02; }
    function size() {
      var r = stage.getBoundingClientRect(); if (!r.width || !r.height) return; DPR = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); R0 = Math.min(W, H) * 0.46; dirty = true; wake();
    }
    // рамка: какие центр и приближение покажут все точки
    function frame(pts, pad, gm) {
      var c = d3.geoCentroid({ type: 'MultiPoint', coordinates: pts }), t = { lon: c[0], lat: clamp(c[1], -60, 75), g: gm || 0, k: 1 };
      setProj(t); var mx = 1, my = 1, X = W / 2, Y = cy(), ar = area();
      pts.forEach(function (p) { var s = proj(p); if (!s) return; mx = Math.max(mx, Math.abs(s[0] - X)); my = Math.max(my, Math.abs(s[1] - Y)); });
      setProj(); t.k = clamp(Math.min(W * pad / 2 / mx, (ar[1] - ar[0]) * pad / 2 / my), 1, 9); return t;
    }
    function flyTo(t, ms) {
      if (reduce || !ms) { cam = { lon: t.lon, lat: t.lat, g: t.g || 0, k: t.k }; fly = null; dirty = true; wake(); return; }
      var a = { lon: cam.lon, lat: cam.lat, g: cam.g, k: cam.k }, d = d3.geoDistance([a.lon, a.lat], [t.lon, t.lat]);
      fly = { a: a, b: t, f: d3.geoInterpolate([a.lon, a.lat], [t.lon, t.lat]), bump: clamp(d / 1.1, 0, 0.45), t0: 0, ms: ms }; wake();
    }
    function stepFly(ts) {
      if (!fly) return; if (!fly.t0) fly.t0 = ts; var u = clamp((ts - fly.t0) / fly.ms, 0, 1), e = ease(u), c = fly.f(e);
      var k = Math.exp(Math.log(fly.a.k) * (1 - e) + Math.log(fly.b.k) * e) * (1 - fly.bump * Math.sin(Math.PI * u));
      var dg = ((fly.b.g || 0) - fly.a.g); cam = { lon: c[0], lat: c[1], g: fly.a.g + dg * e, k: Math.max(0.85, k) };
      if (u >= 1) { var done = fly.done; fly = null; if (done) done(); }
    }

    // ---------- цвета из CSS (тёмная и светлая тема)
    var PAL = null;
    function pal() {
      if (PAL) return PAL; var cs = getComputedStyle(el), v = function (n, d) { return (cs.getPropertyValue(n) || '').trim() || d; };
      return (PAL = { sea1: v('--gl-sea1', '#18285A'), sea2: v('--gl-sea2', '#0A1331'), far: v('--gl-far', '#17244B'), near: v('--gl-near', '#1C2A57'), hot: v('--gl-land', '#24366A'), focus: v('--gl-focus', '#2E4384'),
        line: v('--gl-line', 'rgba(244,248,255,.16)'), grat: v('--gl-grat', 'rgba(244,248,255,.05)'), glow: v('--gl-glow', 'rgba(120,150,255,.22)'), lake: v('--gl-lake', '#0E1A40'), shade: v('--gl-shade', 'rgba(3,7,22,.35)'),
        txt: v('--rm-txt', '#F4F8FF'), halo: v('--rm-halo', '#0B1433'), dot: v('--rm-dot', 'rgba(244,248,255,.55)'), o1: '#5D95FF', o2: '#2B66F0', sea: '#4FB3C4', star: v('--gl-star', 'rgba(244,248,255,.5)'), font: cs.fontFamily || 'system-ui' });
    }
    var STARS = []; (function () { var s = 7; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; } for (var i = 0; i < 70; i++) STARS.push([rnd(), rnd(), rnd() * 1.1 + 0.3, rnd() * 0.6 + 0.2]); })();

    function draw() {
      if (!W) return; var P = pal(), Ld = land(); setProj(); placed = [];
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
      var X = W / 2, Y = cy(), r = R0 * cam.k;
      if (P.star !== 'none') { ctx.fillStyle = P.star; STARS.forEach(function (s) { ctx.globalAlpha = s[3]; ctx.beginPath(); ctx.arc(s[0] * W, s[1] * H, s[2], 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1; }
      var gl = ctx.createRadialGradient(X, Y, r * 0.96, X, Y, r * 1.12); gl.addColorStop(0, P.glow); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X, Y, r * 1.12, 0, 6.283); ctx.fill();
      var sg = ctx.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r * 1.05); sg.addColorStop(0, P.sea1); sg.addColorStop(1, P.sea2);
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = sg; ctx.fill();
      ctx.beginPath(); path(grat); ctx.strokeStyle = P.grat; ctx.lineWidth = 0.6; ctx.stroke();
      [['far', P.far], ['near', P.near], ['hot', P.hot], ['focus', P.focus]].forEach(function (x) { if (!Ld[x[0]]) return; ctx.beginPath(); path(Ld[x[0]]); ctx.fillStyle = x[1]; ctx.fill(); });
      if (Ld.lakes) { ctx.beginPath(); path(Ld.lakes); ctx.fillStyle = P.lake; ctx.fill(); }
      if (Ld.hot) { ctx.beginPath(); path(Ld.hot); path(Ld.focus); ctx.strokeStyle = P.line; ctx.lineWidth = 0.7; ctx.stroke(); }
      var sh = ctx.createRadialGradient(X - r * 0.3, Y - r * 0.35, r * 0.5, X, Y, r); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, P.shade); ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = sh; ctx.fill();
      drawRoute(P); drawDots(P);
    }
    function lineTo(L, upto, P, color, width, dash) {
      var pts = L.pts; if (upto < 1) { var a = along(L, upto); pts = L.pts.slice(0, a.i).concat([a.p]); }
      if (pts.length < 2) return; ctx.beginPath(); path({ type: 'LineString', coordinates: pts }); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    }
    function legColor(s, P) { return s.kind === 'sea' ? P.sea : s.kind === 'carrier' ? '#8CCBFF' : P.o1; }
    function drawRoute(P) {
      var pl = st.plan;
      if (!pl) { if (st.from && st.to && st.step === 3) lineTo(line([st.from, st.to], true), 1, P, P.o2, 1.6, [5, 5]); return; }
      var cur = story ? story.i : pl.stages.length, prog = story ? story.p : 1;
      pl.stages.forEach(function (s, i) { if (s.t !== 'leg') return; lineTo(s.L, 1, P, P.line, 5); });
      pl.stages.forEach(function (s, i) { if (s.t !== 'leg' || i > cur) return; lineTo(s.L, i < cur ? 1 : prog, P, legColor(s, P), 2.6); });
      // остановки: значки этапов
      pl.stages.forEach(function (s, i) {
        if (s.t !== 'stop' || !s.pt) return; var p = s.pt; if (!visibleP(p)) return; var xy = proj(p), on = story && i === cur, done = i < cur || !story;
        ctx.beginPath(); ctx.arc(xy[0], xy[1], on ? 5.5 : 4, 0, 6.283); ctx.fillStyle = P.halo; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = done || on ? P.o1 : P.dot; ctx.stroke();
        if (on) { var tt = (performance.now() % 1600) / 1600; ctx.beginPath(); ctx.arc(xy[0], xy[1], 6 + tt * 22, 0, 6.283); ctx.strokeStyle = P.o1; ctx.globalAlpha = 1 - tt; ctx.lineWidth = 1.6; ctx.stroke(); ctx.globalAlpha = 1; badge(xy, s.ic, P); }
      });
      var lbl = {}; pl.stages.forEach(function (s) { if (s.t === 'stop' && s.at) lbl[s.at] = 1; }); if (pl.stages[0]) lbl[st.from] = 1; lbl[st.to] = 1;
      labels(Object.keys(lbl), P);
      if (story && story.veh) vehicle(story.veh, P);
    }
    // значок того, что происходит на остановке (погрузка, граница, порт, хаб)
    function badge(xy, ic, P) {
      if (!ic) return; var x = xy[0] + 26, y = xy[1] - 30, rr = 17;
      ctx.save(); ctx.shadowColor = 'rgba(6,12,34,.35)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fillStyle = P.halo; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.strokeStyle = P.o1; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xy[0] + 5, xy[1] - 5); ctx.lineTo(x - rr * 0.7, y + rr * 0.7); ctx.strokeStyle = P.o1; ctx.lineWidth = 1; ctx.stroke();
      icon(ic, x, y, 22, 0, false, P);
    }
    function icon(k, x, y, sz, rot, flip, P, fill) {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); var s = sz / 32; ctx.scale(flip ? -s : s, s); ctx.translate(-16, -16);
      var p2 = new Path2D(IC[k]); if (fill) { ctx.fillStyle = fill; ctx.fill(p2); }
      ctx.strokeStyle = P.o1; ctx.lineWidth = 1.6 / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p2); ctx.restore();
    }
    function vehicle(v, P) {
      if (!visibleP(v.p)) return; var xy = proj(v.p), ah = proj(v.ahead) || xy, dx = ah[0] - xy[0], dy = ah[1] - xy[1];
      ctx.save(); ctx.fillStyle = 'rgba(6,12,34,.22)'; ctx.beginPath(); ctx.ellipse(xy[0], xy[1] + 4, 16, 5, 0, 0, 6.283); ctx.fill(); ctx.restore();
      if (v.k === 'plane') icon('plane', xy[0], xy[1] - 6, 38, Math.atan2(dy, dx) + Math.PI / 2, false, P, P.halo);
      else icon(v.k, xy[0], xy[1] - 12, 38, 0, dx < -0.3, P, P.halo);
    }
    var placed = [];
    function text(s, x, y, P, bold, align) {
      ctx.font = (bold ? '650 ' : '550 ') + '12.5px ' + P.font; var w = ctx.measureText(s).width, bx = align === 'r' ? x - w - 8 : x + 8, box = [bx - 2, y - 11, w + 4, 15];
      for (var i = 0; i < placed.length; i++) { var b = placed[i]; if (box[0] < b[0] + b[2] && box[0] + box[2] > b[0] && box[1] < b[1] + b[3] && box[1] + box[3] > b[1]) return; }
      placed.push(box); ctx.lineWidth = 3.5; ctx.strokeStyle = P.halo; ctx.lineJoin = 'round'; ctx.strokeText(s, bx, y); ctx.fillStyle = P.txt; ctx.fillText(s, bx, y);
    }
    function labels(keys, P) { keys.forEach(function (k) { var p = ll(k); if (!p || !visibleP(p)) return; var xy = proj(p); var ar = area(); if (xy[0] < 4 || xy[0] > W - 4 || xy[1] < ar[0] + 6 || xy[1] > ar[1] - 2) return; text(nm(k), xy[0], xy[1] + 4, P, k === st.from || k === st.to, xy[0] > W - 130 ? 'r' : ''); }); }
    var hits = [];
    function drawDots(P) {
      hits = [];
      if (st.step >= 4) return;
      var act = st.step === 1 ? 'from' : st.step === 2 ? 'to' : '', pulse = (Math.sin(performance.now() / 380) + 1) / 2;
      [['to', DOT_TO], ['from', DOT_FROM]].forEach(function (g) {
        g[1].forEach(function (k) {
          var p = ll(k); if (!visibleP(p)) return; var xy = proj(p), on = k === st.from || k === st.to, a = g[0] === act;
          hits.push({ k: k, side: g[0], x: xy[0], y: xy[1] });
          ctx.beginPath(); ctx.arc(xy[0], xy[1], on ? 5 : a ? 3.4 + pulse * 0.8 : 2.4, 0, 6.283);
          if (on) { ctx.fillStyle = P.o1; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.halo; ctx.stroke(); }
          else if (g[0] === 'from') { ctx.globalAlpha = a || !act ? 0.95 : 0.45; ctx.fillStyle = a ? P.o2 : P.dot; ctx.fill(); ctx.globalAlpha = 1; }
          else { ctx.globalAlpha = a || !act ? 0.95 : 0.45; ctx.lineWidth = 1.5; ctx.strokeStyle = a ? P.o2 : P.dot; ctx.stroke(); ctx.globalAlpha = 1; }
        });
      });
      if (st.from && st.to && st.step === 3) { /* линия-подсказка рисуется в drawRoute */ }
      var lb = []; if (st.from) lb.push(st.from); if (st.to) lb.push(st.to); if (hover && lb.indexOf(hover) < 0) lb.push(hover); labels(lb, P);
    }

    // ---------- рассказ о пути
    var story = null;
    function legMs(s) { return reduce ? 1 : clamp(1700 + s.km * 0.28, 2100, 4200); }
    function stageTarget(i) {
      var s = st.plan.stages[i], roll = [0, -9, 7, -6, 9, -4, 6][i % 7];
      if (s.t === 'leg') { var t = frame(s.L.pts, 0.74, roll); t.k = clamp(t.k, 1.1, 7); return t; }
      var p = s.pt, prev = cam.k; return { lon: p[0], lat: p[1], g: roll, k: clamp(Math.max(prev * 1.7, 3.6), 3.6, 6.5) };
    }
    function startStage(i) {
      var pl = st.plan; if (!pl) return; if (i >= pl.stages.length) return finish();
      story.i = i; story.p = 0; story.phase = 'fly'; story.t0 = 0; var s = pl.stages[i];
      story.veh = s.t === 'leg' ? { k: s.veh, p: s.L.pts[0], ahead: s.L.pts[1] || s.L.pts[0] } : story.veh;
      caption(); timeline(); var t = stageTarget(i); t.done = null;
      flyTo(t, i === 0 ? 1100 : 850); fly && (fly.done = function () { story.phase = s.t === 'leg' ? 'run' : 'hold'; story.t0 = 0; });
      if (!fly) { story.phase = s.t === 'leg' ? 'run' : 'hold'; story.t0 = 0; }
      wake();
    }
    function stepStory(ts) {
      if (!story || story.paused || story.phase === 'fly') return; var pl = st.plan, s = pl.stages[story.i];
      if (!story.t0) story.t0 = ts; var u = (ts - story.t0);
      if (story.phase === 'run') {
        var T = legMs(s), p = clamp(u / T, 0, 1), e = p < 1 ? (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) : 1; story.p = e;
        var a = along(s.L, e), b = along(s.L, Math.min(1, e + 0.02)); story.veh = { k: s.veh, p: a.p, ahead: e >= 0.99 ? s.L.pts[s.L.pts.length - 1] : b.p };
        if (e > 0.99) { var aa = along(s.L, 0.97); story.veh.ahead = s.L.pts[s.L.pts.length - 1]; story.veh.p = s.L.pts[s.L.pts.length - 1]; story.veh.back = aa.p; }
        // камера мягко идёт за транспортом
        if (!reduce) { var base = story.base || (story.base = { lon: cam.lon, lat: cam.lat, k: cam.k, g: cam.g }); var c = d3.geoInterpolate([base.lon, base.lat], a.p)(0.3); cam = { lon: c[0], lat: c[1], g: base.g, k: base.k * (1 + 0.12 * Math.sin(Math.PI * e)) }; }
        hudDraw(); if (p >= 1) { story.base = null; story.phase = 'hold'; story.t0 = 0; story.hold = 500; }
      } else if (story.phase === 'hold') {
        var hold = story.hold || (reduce ? 2600 : 1900); hudDraw();
        if (u >= hold) { story.hold = 0; startStage(story.i + 1); }
      }
    }
    function progress() { var pl = st.plan, km = 0, d = 0; pl.stages.forEach(function (s, i) { var f = i < story.i ? 1 : i === story.i ? (s.t === 'leg' ? story.p : story.phase === 'hold' ? 1 : 0) : 0; km += (s.km || 0) * f; d += (s.d[0] + s.d[1]) / 2 * f; }); return { km: km, d: d }; }
    function hudDraw() {
      if (!story) return; var pl = st.plan, g = progress(), tot = pl.km;
      hud.innerHTML = '<span class="jm-hm">' + svgI(MODE_IC[st.mode]) + mn(st.mode) + '</span><b>' + esc(nm(st.from)) + ' → ' + esc(nm(st.to)) + '</b><span class="jm-hk">' + (Math.round(g.km / 10) * 10).toLocaleString(loc()) + ' / ' + kmS(tot) + ' · ' + tx('day') + ' ' + Math.max(1, Math.round(g.d)) + '</span><i style="--p:' + clamp(g.km / (tot || 1), 0, 1).toFixed(3) + '"></i>';
    }
    function caption() {
      var pl = st.plan, s = pl.stages[story.i], ic = s.t === 'leg' ? s.veh : s.ic;
      cap.innerHTML = '<div class="jm-cap-i">' + svgI(ic) + '</div><div class="jm-cap-t"><small>' + tx('stage', story.i + 1, pl.stages.length) + '</small><b>' + esc(s.title) + '</b><span>' + esc(s.sub) + '</span></div><div class="jm-cap-n">' + (s.km ? '<em>≈ ' + kmS(s.km) + '</em>' : '') + '<em>' + dS(s.d) + '</em></div>';
      cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on');
    }
    function tlHtml(cur) {
      var pl = st.plan; return '<ol class="jm-tl">' + pl.stages.map(function (s, i) {
        var short = s.short;
        return '<li class="' + (cur == null || i < cur ? 'done' : i === cur ? 'cur' : '') + (s.t === 'leg' ? ' leg' : ' stop') + '"><button type="button" data-st="' + i + '" title="' + esc(s.title) + '">' + svgI(s.t === 'leg' ? s.veh : s.ic) + '<span><b>' + esc(short) + '</b><small>' + (s.km ? kmS(s.km) + ' · ' : '') + dS(s.d) + '</small></span></button></li>';
      }).join('') + '</ol>';
    }
    function timeline() {
      if (!story) return; panel.innerHTML = '<div class="jm-run"><p class="jm-ask">' + tx('how') + '</p><div class="jm-ctl"><button type="button" data-act="pause" aria-label="' + tx(story.paused ? 'play' : 'pause') + '">' + (story.paused ? '▶' : '❚❚') + '</button><button type="button" data-act="next" aria-label="' + tx('next') + '">⏭</button></div></div>' + tlHtml(story.i);
      var c = panel.querySelector('.jm-tl .cur'); if (c && c.scrollIntoView) { var ol = c.parentNode; ol.scrollLeft = c.offsetLeft - ol.clientWidth / 2 + c.offsetWidth / 2; }
    }
    function play(from) {
      st.plan = plan(st.from, st.to, st.mode); if (!st.plan) return;
      st.step = 4; auto = false; stage.classList.add('jm-fly'); stage.dataset.step = 4; skip.hidden = false; skip.textContent = tx('skip'); hint.textContent = '';
      story = { i: 0, p: 0, phase: 'fly', paused: false, veh: null }; drawSteps(); hudDraw(); startStage(from || 0);
    }
    function finish() {
      story = null; st.step = 5; stage.classList.remove('jm-fly'); stage.dataset.step = 5; skip.hidden = true; hud.innerHTML = ''; cap.innerHTML = ''; cap.classList.remove('on');
      var all = []; st.plan.stages.forEach(function (s) { if (s.t === 'leg') all = all.concat(s.L.pts); }); if (!all.length) all = [ll(st.from), ll(st.to)];
      flyTo(frame(all, 0.84, 0), 1000); drawSteps(); drawPanel(); wake();
    }

    // ---------- шаги, подсказки, панель
    function drawSteps() {
      var fz = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('jm-in') ? document.activeElement.dataset.side : null;
      steps.innerHTML = [['from', 's1', 'phFrom'], ['to', 's2', 'phTo']].map(function (s, i) {
        var n = i + 1, v = st[s[0]], cls = st.step === n ? 'cur' : v ? 'done' : '';
        return '<li class="' + cls + '"><label><i>' + (v ? '✓' : n) + '</i><span><small>' + tx(s[1]) + '</small><input class="jm-in" data-side="' + s[0] + '" type="text" autocomplete="off" spellcheck="false" enterkeyhint="go" role="combobox" aria-autocomplete="list" aria-expanded="false" placeholder="' + esc(tx(s[2])) + '" value="' + esc(v ? nm(v) : '') + '"' + (st.step === 4 ? ' disabled' : '') + '></span></label></li>';
      }).join('') + '<li class="' + (st.step === 3 ? 'cur' : st.mode && st.step > 3 ? 'done' : '') + '"><button type="button" data-go="3"' + (st.step > 3 && st.step !== 4 ? '' : ' disabled') + '><i>' + (st.mode && st.step > 3 ? '✓' : 3) + '</i><span><small>' + tx('s3') + '</small>' + (st.mode ? '<b>' + mn(st.mode) + '</b>' : '') + '</span></button></li>';
      reset.hidden = st.step === 1 && !st.from; reset.textContent = tx('again');
      if (fz) { var inp = steps.querySelector('.jm-in[data-side="' + fz + '"]'); if (inp && !inp.disabled) inp.focus(); }
      hint.textContent = st.step <= 2 && auto ? tx('drag') : '';
      cv.setAttribute('aria-label', st.from && st.to ? nm(st.from) + ' → ' + nm(st.to) + (st.mode ? ' · ' + mn(st.mode) : '') : tx('askFrom'));
    }
    function chips(list, side) { return '<div class="jm-chips"><small>' + tx('pop') + '</small>' + list.map(function (k) { return '<button type="button" data-' + side + '="' + k + '">' + esc(nm(k)) + '</button>'; }).join('') + '</div>'; }
    function drawPanel() {
      var h = '';
      if (st.step === 1) h = '<p class="jm-ask">' + tx('askFrom') + '</p>' + chips(POP_FROM, 'from');
      else if (st.step === 2) h = '<p class="jm-ask">' + tx('askTo') + '</p>' + chips(POP_TO, 'to');
      else if (st.step === 3) {
        var a = adviseFor(st.from, st.to), best = a && ADV2MAP[a.best], nope = {};
        if (a) a.impossible.forEach(function (n) { nope[ADV2MAP[n.mode]] = n.why; });
        h = '<p class="jm-ask">' + tx('askMode') + '</p><div class="jm-modes">' + ['air', 'road', 'rail', 'sea'].map(function (m) {
          var no = nope[m], p = no ? null : plan(st.from, st.to, m);
          return '<button type="button" class="jm-m' + (m === best ? ' best' : '') + '" data-jm="' + m + '"' + (no ? ' disabled title="' + esc(no) + '"' : '') + '>' + svgI(MODE_IC[m]) + '<b>' + mn(m) + '</b><small>' + (no ? tx('no') : p ? p.days[0] + '–' + p.days[1] + ' ' + tx('days') : '') + '</small>' + (m === best ? '<em>' + tx('rec') + '</em>' : '') + '</button>';
        }).join('') + '</div>' + (a && a.impossible.length ? '<p class="jm-note">' + esc(a.impossible[0].why) + '</p>' : a && a.hub && a.hub.via === 'msk' ? '<p class="jm-note">' + esc(a.hub.text) + '</p>' : '');
      } else if (st.step === 5) h = summary();
      panel.innerHTML = h;
    }
    function summary() {
      var pl = st.plan; if (!pl) return '';
      var r = pl.route, gw = r && r.gw ? R.gwNames(r.gw, lang()).join(' — ') : '';
      var hubs = r ? r.path.filter(function (k) { return R.cities[k]; }).map(nm) : [];
      if (pl.hub && hubs[hubs.length - 1] !== nm(st.to)) hubs.push(nm(st.to));
      var a = pl.advice;
      return '<div class="jm-sum"><div class="jm-od"><b>' + esc(nm(st.from)) + ' <i>→</i> ' + esc(nm(st.to)) + '</b><small>' + mn(st.mode) + (gw ? ' · ' + esc(gw) : '') + '</small></div>' +
        '<div class="jm-facts"><span><small>' + tx('total') + '</small><b>≈ ' + kmS(pl.km) + '</b></span><span><small>' + tx('time') + '</small><b>' + pl.days[0] + '–' + pl.days[1] + ' ' + tx('days') + '</b></span></div>' +
        '<div class="jm-acts"><button type="button" class="jm-calc">' + tx('calc') + '</button><button type="button" class="jm-alt" data-go="3">' + tx('other') + '</button></div>' +
        (a && a.hub && a.hub.via === 'msk' ? '<p class="jm-note jm-hub">' + esc(a.hub.text) + '</p>' : '') + '</div>' +
        '<div class="jm-sumtl"><div class="jm-run"><p class="jm-ask">' + tx('how') + '</p><button type="button" class="jm-replay" data-act="replay">↻ ' + tx('replay') + '</button></div>' + tlHtml(null) + '</div>' +
        (hubs.length > 2 ? '<p class="jm-path" title="' + esc(hubs.join(' — ')) + '">' + tx('way') + ': ' + esc(hubs.join(' — ')) + '</p>' : '');
    }
    function showSug(inp) {
      var side = inp.dataset.side, list = search(side, inp.value);
      sug.dataset.side = side; sug.innerHTML = list.length ? list.map(function (k, i) { var c = R.cities[k]; return '<button type="button" role="option" data-pick="' + side + '" data-k="' + k + '"' + (i === 0 ? ' class="on"' : '') + '><b>' + esc(nm(k)) + '</b><small>' + esc([c[1], c[2]].filter(function (x) { return x && x !== nm(k); }).join(' · ')) + '</small></button>'; }).join('') : '<p>' + tx('none') + '</p>';
      var li = inp.closest('li'), tr = el.querySelector('.jm-top').getBoundingClientRect(), lr = li.getBoundingClientRect();
      sug.style.left = (lr.left - tr.left) + 'px'; sug.style.width = Math.max(lr.width, 220) + 'px'; sug.hidden = false; inp.setAttribute('aria-expanded', 'true');
    }
    function hideSug() { sug.hidden = true; [].forEach.call(el.querySelectorAll('.jm-in'), function (i) { i.setAttribute('aria-expanded', 'false'); }); }

    // ---------- выбор
    function afterPick() {
      st.plan = null; story = null; stage.classList.remove('jm-fly'); skip.hidden = true; hud.innerHTML = ''; cap.innerHTML = '';
      st.step = !st.from ? 1 : !st.to ? 2 : 3; st.mode = null; auto = false;
      if (st.from && st.to) flyTo(frame([ll(st.from), ll(st.to)], 0.78, 0), 1000);
      else if (st.from) flyTo(frame([ll(st.from), ll('msk'), ll('nsk')], 0.8, 0), 1000);
      drawSteps(); drawPanel(); wake();
    }
    function setFrom(k) { if (FROM.indexOf(k) < 0 && !R.cities[k]) return; st.from = k; afterPick(); }
    function setTo(k) { if (TO.indexOf(k) < 0 && !R.cities[k]) return; st.to = k; afterPick(); }
    function setMode(m) { if (!MN[m]) return; st.mode = m; if (opts.onMode) opts.onMode(m); play(0); }
    function resetAll() { st = { step: 1, from: null, to: null, mode: null, plan: null }; story = null; auto = !reduce; stage.classList.remove('jm-fly'); skip.hidden = true; hud.innerHTML = ''; cap.innerHTML = ''; flyTo({ lon: 92, lat: 42, g: 0, k: 1.12 }, 900); drawSteps(); drawPanel(); }

    el.addEventListener('click', function (e) {
      var t = e.target;
      var pk = t.closest('[data-pick]'); if (pk) { hideSug(); return pk.dataset.pick === 'from' ? setFrom(pk.dataset.k) : setTo(pk.dataset.k); }
      var p = t.closest('[data-from]'); if (p && p.tagName === 'BUTTON') return setFrom(p.dataset.from);
      var qq = t.closest('[data-to]'); if (qq && qq.tagName === 'BUTTON') return setTo(qq.dataset.to);
      var m = t.closest('[data-jm]'); if (m && !m.disabled) return setMode(m.dataset.jm);
      var sb = t.closest('[data-st]'); if (sb) { if (!story) play(+sb.dataset.st); else { story.paused = false; startStage(+sb.dataset.st); } return; }
      var ac = t.closest('[data-act]');
      if (ac) { var a = ac.dataset.act; if (a === 'pause' && story) { story.paused = !story.paused; if (!story.paused) story.t0 = 0; timeline(); wake(); } else if (a === 'next' && story) { story.paused = false; startStage(story.i + 1); } else if (a === 'replay') play(0); return; }
      var g = t.closest('[data-go]'); if (g && !g.disabled) { story = null; st.plan = null; st.mode = null; stage.classList.remove('jm-fly'); skip.hidden = true; hud.innerHTML = ''; cap.innerHTML = ''; st.step = 3; flyTo(frame([ll(st.from), ll(st.to)], 0.78, 0), 800); drawSteps(); drawPanel(); return; }
      if (t.closest('.jm-skip')) { if (story) finish(); return; }
      if (t.closest('.jm-reset')) return resetAll();
      if (t.closest('.jm-calc') && opts.onPick) opts.onPick(st.from, st.mode, R.name(st.from, 'ru'), st.to, R.name(st.to, 'ru'));
    });
    el.addEventListener('input', function (e) { var i = e.target; if (i.classList && i.classList.contains('jm-in')) showSug(i); });
    el.addEventListener('focusin', function (e) { var i = e.target; if (i.classList && i.classList.contains('jm-in')) { i.select && i.select(); showSug(i); } });
    el.addEventListener('focusout', function () { setTimeout(function () { if (!el.contains(document.activeElement) || !document.activeElement.classList.contains('jm-in')) { if (!sug.matches(':hover')) hideSug(); } }, 120); });
    el.addEventListener('keydown', function (e) {
      var i = e.target; if (!i.classList || !i.classList.contains('jm-in')) return;
      var opts2 = [].slice.call(sug.querySelectorAll('[data-pick]')), cur = opts2.findIndex ? opts2.findIndex(function (b) { return b.classList.contains('on'); }) : -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (sug.hidden) showSug(i); if (!opts2.length) return; var n = (cur + (e.key === 'ArrowDown' ? 1 : -1) + opts2.length) % opts2.length; opts2.forEach(function (b, j) { b.classList.toggle('on', j === n); }); }
      else if (e.key === 'Enter') { e.preventDefault(); var b = opts2[cur >= 0 ? cur : 0]; if (b) { hideSug(); i.blur(); if (b.dataset.pick === 'from') setFrom(b.dataset.k); else setTo(b.dataset.k); } }
      else if (e.key === 'Escape') { hideSug(); i.value = st[i.dataset.side] ? nm(st[i.dataset.side]) : ''; i.blur(); }
    });
    document.addEventListener('pointerdown', function (e) { if (!el.contains(e.target)) hideSug(); });

    // ---------- вращение мышью и пальцем, приближение колёсиком
    var pts = {};
    function hitAt(x, y) { var best = null, bd = 16; hits.forEach(function (h) { var d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }); return best; }
    function rel(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) {
      var p = rel(e); pts[e.pointerId] = p; auto = false; inertia = null; idleAt = performance.now();
      if (Object.keys(pts).length === 1) drag = { x: p[0], y: p[1], sx: p[0], sy: p[1], t: performance.now(), vx: 0, vy: 0, moved: false };
      else drag && (drag.pinch = { d: dist2(), k: cam.k });
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    function dist2() { var a = Object.keys(pts).map(function (k) { return pts[k]; }); return a.length > 1 ? Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) : 0; }
    cv.addEventListener('pointermove', function (e) {
      var p = rel(e);
      if (!drag) { var h = st.step < 4 ? hitAt(p[0], p[1]) : null, k = h ? h.k : null; cv.style.cursor = h ? 'pointer' : 'grab'; if (k !== hover) { hover = k; dirty = true; wake(); } return; }
      pts[e.pointerId] = p;
      if (drag.pinch) { var d = dist2(); if (drag.pinch.d) { cam.k = clamp(drag.pinch.k * d / drag.pinch.d, 0.9, 8); dirty = true; wake(); } return; }
      var dx = p[0] - drag.x, dy = p[1] - drag.y; if (Math.hypot(p[0] - drag.sx, p[1] - drag.sy) > 5) drag.moved = true;
      if (!drag.moved) return; fly = null;
      var s = 180 / Math.PI / (R0 * cam.k), now = performance.now(), dt = Math.max(1, now - drag.t);
      cam.lon -= dx * s; cam.lat = clamp(cam.lat + dy * s, -70, 80); drag.vx = dx / dt; drag.vy = dy / dt; drag.x = p[0]; drag.y = p[1]; drag.t = now; dirty = true; wake();
    });
    function up(e) {
      var p = rel(e), d = drag; delete pts[e.pointerId];
      if (Object.keys(pts).length) { if (d) d.pinch = null; return; }
      drag = null; if (!d) return;
      if (!d.moved && !d.pinch) { var h = st.step < 4 ? hitAt(p[0], p[1]) : null; if (h) { if (h.side === 'from') setFrom(h.k); else setTo(h.k); } return; }
      if (!reduce && (Math.abs(d.vx) > 0.05 || Math.abs(d.vy) > 0.05)) { inertia = { vx: d.vx * 16, vy: d.vy * 16 }; wake(); }
    }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', function () { if (hover) { hover = null; dirty = true; wake(); } });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); auto = false; fly = null; cam.k = clamp(cam.k * Math.exp(-e.deltaY * 0.0016), 0.9, 8); dirty = true; wake(); }, { passive: false });

    // ---------- кадр
    function tick(ts) {
      raf = 0; var busy = false;
      if (fly) { stepFly(ts); busy = true; }
      if (story && !story.paused) { stepStory(ts); busy = true; }
      if (inertia) { var s = 180 / Math.PI / (R0 * cam.k); cam.lon -= inertia.vx * s; cam.lat = clamp(cam.lat + inertia.vy * s, -70, 80); inertia.vx *= 0.92; inertia.vy *= 0.92; if (Math.abs(inertia.vx) + Math.abs(inertia.vy) < 0.05) inertia = null; busy = true; }
      if (auto && !fly && st.step <= 2 && !drag) { cam.lon += 0.06; cam.lat += (38 - cam.lat) * 0.01; busy = true; }
      if (!auto && st.step <= 2 && !drag && !fly && !inertia && !reduce && idleAt && ts - idleAt > 6000) { auto = true; idleAt = 0; }
      var pulsing = st.step <= 2 || (story && story.phase === 'hold');
      if (busy || dirty || pulsing) { draw(); dirty = false; }
      if (visible && (busy || pulsing || dirty)) raf = requestAnimationFrame(tick);
    }
    function wake() { if (!raf && visible) raf = requestAnimationFrame(tick); }

    // ---------- окружение: размер, тема, язык, видимость
    if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size);
    new MutationObserver(function () { PAL = null; dirty = true; wake(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // язык сменили — тексты этапов пересобираем, путь и положение рассказа сохраняем
    new MutationObserver(function () { if (st.from && st.to && st.mode && st.step >= 4) { st.plan = plan(st.from, st.to, st.mode); if (story) { caption(); timeline(); } else drawPanel(); } else drawPanel(); drawSteps(); dirty = true; wake(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; if (visible) wake(); }).observe(stage);
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) wake(); });
    requestAnimationFrame(function () { size(); drawSteps(); drawPanel(); wake(); });
    return { state: st, setFrom: setFrom, setTo: setTo, setMode: setMode, stopAuto: function () { auto = false; }, plan: function () { return st.plan; } };
  }
  window.IOMA_JMAP = { mount: mount };
})();
