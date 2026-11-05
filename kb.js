/* IOMASTAVKA — база знаний: маршруты Китай → Россия, ситуация, сроки, погранпереходы, документы.
   Факты с датами — со ссылкой на источник. Обновлено: ноябрь 2026. */
(function () {
  'use strict';
  var S = {
    mt: ['The Moscow Times, 13.08.2026', 'https://ru.themoscowtimes.com/2026/08/13/u-importerov-nachalis-problemi-s-dostavkoi-tovarov-cherez-vladivostok-posle-zakritiya-chernomorskogo-marshruta-a203374'],
    tks: ['TKS.RU, 03.09.2026', 'https://www.tks.ru/logistics/2026/09/03/0002/rzhd-prognoziruyut-istoricheskij-maksimum-perevozok-gruzov-s-kitaem-v-2026-godu/'],
    lenta: ['Lenta.ru, 12.02.2026', 'https://lenta.ru/news/2026/02/12/cargo/'],
    alta: ['Alta.ru', 'https://www.alta.ru/logistics_news/125626/'],
    kz: ['mybuh.kz, 2026', 'https://mybuh.kz/useful/dostavka-iz-kitaya-v-rf-cherez-kazakhstan-2026.html'],
    prof: ['Профиль, 12.11.2025', 'https://profile.ru/news/economy/rzhd-i-pochta-rossii-zapustili-kontejnernyj-gruzovoj-ekspress-iz-kitaya-v-moskvu-1779064/'],
  };
  var T = {
    title: { ru: 'База знаний', en: 'Knowledge base', zh: '知识库', tr: 'Bilgi bankası' },
    sub: { ru: 'Маршруты Китай → Россия: что происходит сейчас, сроки, погранпереходы и документы. Обновлено в ноябре 2026.', en: 'China → Russia routes: the current situation, transit times, border crossings and documents. Updated November 2026.', zh: '中国→俄罗斯路线：当前形势、时效、口岸和单证。2026年11月更新。', tr: 'Çin → Rusya güzergâhları: güncel durum, süreler, sınır kapıları ve belgeler. Kasım 2026’da güncellendi.' },
    now: { ru: 'Ситуация сейчас', en: 'Current situation', zh: '当前形势', tr: 'Güncel durum' },
    times: { ru: 'Средние сроки «от двери до двери»', en: 'Average door-to-door times', zh: '门到门平均时效', tr: 'Ortalama kapıdan kapıya süreler' },
    choose: { ru: 'Как выбрать маршрут', en: 'How to choose a route', zh: '如何选择路线', tr: 'Güzergâh nasıl seçilir' },
    cross: { ru: 'Погранпереходы', en: 'Border crossings', zh: '口岸', tr: 'Sınır kapıları' },
    docs: { ru: 'Документы', en: 'Documents', zh: '单证', tr: 'Belgeler' },
    routes: { ru: 'Все коридоры', en: 'All corridors', zh: '全部通道', tr: 'Tüm koridorlar' },
    src: { ru: 'Источник', en: 'Source', zh: '来源', tr: 'Kaynak' },
    sources: { ru: 'Источники', en: 'Sources', zh: '来源', tr: 'Kaynaklar' },
    days: { ru: 'дн.', en: 'days', zh: '天', tr: 'gün' },
    note: { ru: 'Сроки и условия меняются еженедельно — перед отправкой подтверждайте их у перевозчика.', en: 'Times and conditions change weekly — confirm with the carrier before shipping.', zh: '时效和条件每周都在变化——发货前请与承运人确认。', tr: 'Süreler ve koşullar her hafta değişir — göndermeden önce taşıyıcıyla teyit edin.' },
    ask: { ru: 'Посчитать мой маршрут', en: 'Plan my route', zh: '计算我的路线', tr: 'Güzergâhımı hesapla' },
  };
  var NOW = [
    { s: 'mt', lv: 'risk', h: { ru: 'Чёрное море почти закрыто для импорта', en: 'Black Sea all but closed to imports', zh: '黑海航线几乎停止进口', tr: 'Karadeniz ithalata neredeyse kapandı' }, ru: '1 августа 2026 у Новороссийска потоплен контейнеровоз FESCO «Янина». FESCO и ряд турецких линий остановили рейсы по Чёрному морю; оставшиеся берут надбавку за военный риск ~$1000 за контейнер (из Китая +8–20% к ставке). Импортёры потребительских товаров этот путь почти не используют.',
      en: 'On 1 Aug 2026 the FESCO container ship Yanina was sunk near Novorossiysk. FESCO and several Turkish lines suspended Black Sea calls; the rest charge a ~$1,000/container war-risk surcharge (+8–20% on rates from China). Consumer-goods importers have almost stopped using this route.',
      zh: '2026年8月1日，FESCO集装箱船“雅尼娜”号在新罗西斯克附近被击沉。FESCO和多家土耳其船公司停止黑海航线；仍在运营的收取每箱约1000美元战争险附加费（自中国运价上涨8–20%）。消费品进口商几乎不再走这条路线。',
      tr: '1 Ağustos 2026’da FESCO’nun Yanina konteyner gemisi Novorossiysk yakınında batırıldı. FESCO ve bazı Türk hatları Karadeniz seferlerini durdurdu; kalanlar konteyner başına ~1.000 $ savaş riski ek ücreti alıyor (Çin’den fiyatlara +%8–20). Tüketim malı ithalatçıları bu yolu neredeyse kullanmıyor.' },
    { s: 'mt', lv: 'warn', h: { ru: 'Дальний Восток перегружен: до ~60 дней до Москвы', en: 'Far East congested: up to ~60 days to Moscow', zh: '远东拥堵：到莫斯科最长约60天', tr: 'Uzak Doğu yoğun: Moskova’ya ~60 güne kadar' }, ru: 'Грузы ушли на Дальний Восток: импорт контейнеров через порты ДВ за 7 месяцев 2026 вырос на 38%. Летом ожидание судна доходило до 2 недель, вывоз по ЖД из порта Владивостока — до 2 недель (Восточный — около недели). Срок Китай → Москва/Петербург через ДВ вырос с ~45 до ~60 дней.',
      en: 'Cargo shifted to the Far East: container imports through Far Eastern ports grew 38% in 7 months of 2026. In summer, waits for a vessel reached 2 weeks and rail dispatch from Vladivostok port up to 2 weeks (Vostochny about a week). China → Moscow/St. Petersburg via the Far East grew from ~45 to ~60 days.',
      zh: '货物转向远东：2026年前7个月经远东港口的集装箱进口增长38%。夏季等船最长2周，符拉迪沃斯托克港铁路发运最长2周（东方港约1周）。经远东的中国→莫斯科/圣彼得堡时效从约45天增至约60天。',
      tr: 'Yükler Uzak Doğu’ya kaydı: 2026’nın 7 ayında Uzak Doğu limanlarından konteyner ithalatı %38 arttı. Yazın gemi bekleme 2 haftaya, Vladivostok limanından demiryolu sevki 2 haftaya kadar çıktı (Vostoçnıy yaklaşık 1 hafta). Uzak Doğu üzerinden Çin → Moskova/St. Petersburg süresi ~45’ten ~60 güne çıktı.' },
    { s: 'tks', lv: 'ok', h: { ru: 'РЖД ждут рекордный год с Китаем', en: 'RZD expects a record year with China', zh: '俄铁预计对华运量创纪录', tr: 'RZD Çin ile rekor yıl bekliyor' }, ru: 'РЖД ждут рекордных перевозок с Китаем в 2026: за январь–апрель контейнерные перевозки по китайскому направлению +5,9% (1,2 млн TEU), импорт из Китая +10,8%. Основной маршрут — Восточный полигон.',
      en: 'RZD expects record China volumes in 2026: in January–April container traffic on the China route rose 5.9% (1.2 million TEU), imports from China +10.8%. The main route is the Eastern Polygon.',
      zh: '俄铁预计2026年对华运量创纪录：1–4月中国方向集装箱运量增长5.9%（120万标箱），自华进口增长10.8%。主要通道为东部铁路网。',
      tr: 'RZD 2026’da Çin ile rekor taşıma bekliyor: Ocak–Nisan’da Çin yönünde konteyner taşımacılığı %5,9 arttı (1,2 milyon TEU), Çin’den ithalat %10,8 arttı. Ana güzergâh Doğu Poligonu.' },
    { s: 'lenta', lv: 'warn', h: { ru: 'Казахстан: строгие досмотры на границе', en: 'Kazakhstan: strict border inspections', zh: '哈萨克斯坦：边境严格查验', tr: 'Kazakistan: sınırda sıkı denetim' }, ru: 'Казахстан ужесточил досмотры с осени 2025: в октябре 2025 переходы КНР–Казахстан закрывали, на границах стояли тысячи фур. Часть бизнеса перевела потоки на Дальний Восток. Забайкальск — Маньчжурия и Уссурийск — Суйфэньхэ принимают до ~2000 грузовиков в сутки.',
      en: 'Kazakhstan has tightened inspections since autumn 2025: in October 2025 China–Kazakhstan crossings were closed and thousands of trucks queued. Some businesses moved flows to the Far East. Zabaikalsk — Manzhouli and Ussuriysk — Suifenhe handle up to ~2,000 trucks a day.',
      zh: '自2025年秋季哈萨克斯坦加强查验：2025年10月中哈口岸曾关闭，边境数千辆货车排队。部分企业将货流转向远东。满洲里—后贝加尔斯克和绥芬河—乌苏里斯克每天可通行约2000辆货车。',
      tr: 'Kazakistan 2025 sonbaharından beri denetimleri sıkılaştırdı: Ekim 2025’te Çin–Kazakistan geçişleri kapandı, binlerce kamyon bekledi. Bazı işletmeler akışı Uzak Doğu’ya kaydırdı. Zabaykalsk — Mançuli ve Ussuriysk — Suifenhe günde ~2.000 kamyon geçirebiliyor.' },
    { s: 'alta', lv: 'info', h: { ru: 'Китай: новые правила экспорта с 01.10.2025', en: 'China: new export rules from 1 Oct 2025', zh: '中国：2025年10月1日起出口新规', tr: 'Çin: 1 Ekim 2025’ten itibaren yeni ihracat kuralları' }, ru: 'С 1 октября 2025 в Китае новые правила экспорта: регистрация всех участников экспортной цепочки в налоговой, запрет чужих экспортных лицензий и оплат через личные счета и платёжные сервисы (WeChat, Alipay, криптовалюта).',
      en: 'Since 1 Oct 2025 China applies new export rules: every company in the export chain must be registered with the tax authority; using someone else’s export licence or personal accounts and payment apps (WeChat, Alipay, crypto) for settlements is banned.',
      zh: '自2025年10月1日起中国实施出口新规：出口链所有企业须在税务机关登记；禁止借用他人出口许可，禁止通过个人账户和支付平台（微信、支付宝、加密货币）结算。',
      tr: '1 Ekim 2025’ten itibaren Çin’de yeni ihracat kuralları: ihracat zincirindeki tüm şirketler vergi dairesine kayıtlı olmalı; başkasının ihracat lisansını ve kişisel hesap ya da ödeme uygulamalarını (WeChat, Alipay, kripto) kullanmak yasak.' },
    { s: 'lenta', lv: 'info', h: { ru: 'Сезон: декабрь и Китайский Новый год дороже', en: 'Season: December and Chinese New Year cost more', zh: '旺季：12月和春节运价上涨', tr: 'Sezon: Aralık ve Çin Yeni Yılı daha pahalı' }, ru: 'Сезонность: перед Китайским Новым годом (февраль) и в декабре ставки растут до 1,5–2 раз, 40-футовый контейнер в праздники — до +$700. Бронируйте заранее.',
      en: 'Seasonality: before Chinese New Year (February) and in December rates rise up to 1.5–2×; a 40-ft container can cost up to +$700 during holidays. Book early.',
      zh: '季节性：春节前（2月）和12月运价最多上涨1.5–2倍，节假日40尺柜最多上涨700美元。请提前订舱。',
      tr: 'Mevsimsellik: Çin Yeni Yılı öncesinde (Şubat) ve Aralık’ta fiyatlar 1,5–2 katına çıkabilir; tatillerde 40’lık konteyner +700 $’a kadar. Erken rezervasyon yapın.' },
  ];
  var TIMES = [
    { m: { ru: 'Авиа', en: 'Air', zh: '空运', tr: 'Hava' }, d: '2–7', s: 'lenta', r: [2,7] },
    { m: { ru: 'Авто', en: 'Truck', zh: '公路', tr: 'Karayolu' }, d: '15–25', s: 'lenta', r: [15,25] },
    { m: { ru: 'ЖД', en: 'Rail', zh: '铁路', tr: 'Demiryolu' }, d: '15–35', s: 'lenta', r: [15,35] },
    { m: { ru: 'ЖД-экспресс Хуньчунь — Москва', en: 'Rail express Hunchun — Moscow', zh: '珲春—莫斯科铁路快线', tr: 'Hunchun — Moskova demiryolu ekspresi' }, d: '≈12', s: 'prof', r: [11,13] },
    { m: { ru: 'Море через порты Дальнего Востока + ЖД', en: 'Sea via Far Eastern ports + rail', zh: '经远东港口海运+铁路', tr: 'Uzak Doğu limanları üzerinden deniz + demiryolu' }, d: '35–45 (лето 2026: до ~60)', s: 'lenta', r: [35,60] },
    { m: { ru: 'Море через Новороссийск / Петербург', en: 'Sea via Novorossiysk / St. Petersburg', zh: '经新罗西斯克/圣彼得堡海运', tr: 'Novorossiysk / St. Petersburg üzerinden deniz' }, d: '45–60', s: 'lenta', r: [45,60] },
  ];
  var CHOOSE = {
    ru: ['Москва и центр: ЖД через Забайкальск — основной вариант; полный контейнер дешевле всего морем до Владивостока + ЖД, но с лета 2026 закладывайте до ~60 дней.', 'Урал и Поволжье: через Казахстан короче, но учитывайте строгие досмотры и электронные пломбы.', 'Сибирь: Забайкальск или Монголия (Эрлянь).', 'Дальний Восток: Пограничный, Благовещенск, Гродеково или море прямо во Владивосток — быстро и дёшево.', 'Юг России (Краснодар, Новороссийск, Геленджик): Чёрное море сейчас опасно — Казахстан или Дальний Восток + ЖД.', 'Срочно, легко или дорого (электроника, запчасти): авиа, 2–7 дней.', 'Сборный груз до 2–3 т: авто или сборные ЖД-контейнеры; полный контейнер: ЖД или море + ЖД.'],
    en: ['Moscow and central Russia: rail via Zabaikalsk is the default; a full container is cheapest by sea to Vladivostok + rail, but allow up to ~60 days since summer 2026.', 'Urals and Volga: shorter via Kazakhstan, but expect strict inspections and e-seals.', 'Siberia: Zabaikalsk or Mongolia (Erenhot).', 'Far East: Pogranichny, Blagoveshchensk, Grodekovo or sea straight to Vladivostok — fast and cheap.', 'Southern Russia (Krasnodar, Novorossiysk, Gelendzhik): the Black Sea is dangerous now — use Kazakhstan or the Far East + rail.', 'Urgent, light or high-value (electronics, spare parts): air, 2–7 days.', 'Groupage up to 2–3 t: truck or consolidated rail; full container: rail or sea + rail.'],
    zh: ['莫斯科及中部：首选经后贝加尔斯克的铁路；整箱最便宜是海运至符拉迪沃斯托克+铁路，但自2026年夏季需预留约60天。', '乌拉尔和伏尔加：经哈萨克斯坦更近，但查验严格并需电子铅封。', '西伯利亚：后贝加尔斯克或蒙古（二连浩特）。', '远东：波格拉尼奇内、布拉戈维申斯克、格罗捷阔沃或直接海运至符拉迪沃斯托克——快且便宜。', '俄罗斯南部（克拉斯诺达尔、新罗西斯克、格连吉克）：黑海目前危险——走哈萨克斯坦或远东+铁路。', '急件、轻货或高价值货（电子产品、配件）：空运，2–7天。', '2–3吨以内拼箱：公路或铁路拼箱；整箱：铁路或海铁联运。'],
    tr: ['Moskova ve merkez: varsayılan Zabaykalsk üzerinden demiryolu; tam konteyner için en ucuzu Vladivostok’a deniz + demiryolu, ama 2026 yazından beri ~60 güne kadar hesaplayın.', 'Urallar ve Volga: Kazakistan üzerinden daha kısa, ancak sıkı denetim ve elektronik mühür bekleyin.', 'Sibirya: Zabaykalsk veya Moğolistan (Erenhot).', 'Uzak Doğu: Pograniçnıy, Blagoveşçensk, Grodekovo veya doğrudan Vladivostok’a deniz — hızlı ve ucuz.', 'Güney Rusya (Krasnodar, Novorossiysk, Gelencik): Karadeniz şu an tehlikeli — Kazakistan veya Uzak Doğu + demiryolu.', 'Acil, hafif veya değerli (elektronik, yedek parça): hava yolu, 2–7 gün.', '2–3 tona kadar parsiyel: karayolu veya parsiyel demiryolu; tam konteyner: demiryolu veya deniz + demiryolu.'],
  };
  var CROSS = [
    { n: { ru: 'Забайкальск — Маньчжурия', en: 'Zabaikalsk — Manzhouli', zh: '后贝加尔斯克—满洲里', tr: 'Zabaykalsk — Mançuli' }, m: { ru: 'ЖД, авто', en: 'rail, truck', zh: '铁路、公路', tr: 'demiryolu, karayolu' }, t: { ru: 'Главный переход на Москву и Сибирь; до ~2000 грузовиков в сутки.', en: 'Main crossing for Moscow and Siberia; up to ~2,000 trucks a day.', zh: '通往莫斯科和西伯利亚的主要口岸；每天约2000辆货车。', tr: 'Moskova ve Sibirya için ana geçiş; günde ~2.000 kamyon.' } },
    { n: { ru: 'Наушки — Сухэ-Батор (Монголия), Эрлянь — Замын-Ууд', en: 'Naushki — Sükhbaatar (Mongolia), Erenhot — Zamyn-Uud', zh: '纳乌什基—苏赫巴托（蒙古）、二连浩特—扎门乌德', tr: 'Nauşki — Sühbaatar (Moğolistan), Erenhot — Zamın-Üüd' }, m: { ru: 'ЖД', en: 'rail', zh: '铁路', tr: 'demiryolu' }, t: { ru: 'Транзит через Монголию; разгружает Забайкальск.', en: 'Transit through Mongolia; relieves Zabaikalsk.', zh: '经蒙古过境；分流后贝加尔斯克。', tr: 'Moğolistan transiti; Zabaykalsk’ı rahatlatır.' } },
    { n: { ru: 'Гродеково — Суйфэньхэ; Пограничный — Суйфэньхэ', en: 'Grodekovo — Suifenhe; Pogranichny — Suifenhe', zh: '格罗捷阔沃—绥芬河；波格拉尼奇内—绥芬河', tr: 'Grodekovo — Suifenhe; Pograniçnıy — Suifenhe' }, m: { ru: 'ЖД / авто', en: 'rail / truck', zh: '铁路/公路', tr: 'demiryolu / karayolu' }, t: { ru: 'Приморье и Дальний Восток; авто — до ~2000 машин в сутки (вместе с Уссурийском).', en: 'Primorye and the Far East; trucks up to ~2,000 a day (with Ussuriysk).', zh: '滨海边疆区和远东；公路每天约2000辆（含乌苏里斯克）。', tr: 'Primorye ve Uzak Doğu; kamyon günde ~2.000’e kadar (Ussuriysk ile).' } },
    { n: { ru: 'Камышовая — Хуньчунь', en: 'Kamyshovaya — Hunchun', zh: '卡梅绍瓦亚—珲春', tr: 'Kamışovaya — Hunchun' }, m: { ru: 'ЖД', en: 'rail', zh: '铁路', tr: 'demiryolu' }, t: { ru: 'Контейнерный экспресс РЖД и Почты России до Москвы — около 12 дней (с ноября 2025).', en: 'RZD and Russian Post container express to Moscow — about 12 days (since Nov 2025).', zh: '俄铁与俄罗斯邮政至莫斯科集装箱快线——约12天（2025年11月起）。', tr: 'RZD ve Rus Postası Moskova konteyner ekspresi — ~12 gün (Kasım 2025’ten beri).' } },
    { n: { ru: 'Благовещенск — Хэйхэ', en: 'Blagoveshchensk — Heihe', zh: '布拉戈维申斯克—黑河', tr: 'Blagoveşçensk — Heihe' }, m: { ru: 'авто (мост)', en: 'truck (bridge)', zh: '公路（大桥）', tr: 'karayolu (köprü)' }, t: { ru: 'Амурская область и Хабаровский край.', en: 'Amur region and Khabarovsk Krai.', zh: '阿穆尔州和哈巴罗夫斯克边疆区。', tr: 'Amur bölgesi ve Habarovsk Krayı.' } },
    { n: { ru: 'Нижнеленинское — Тунцзян', en: 'Nizhneleninskoye — Tongjiang', zh: '下列宁斯阔耶—同江', tr: 'Nijneleninskoye — Tongjiang' }, m: { ru: 'ЖД (мост)', en: 'rail (bridge)', zh: '铁路（大桥）', tr: 'demiryolu (köprü)' }, t: { ru: 'ЕАО; в основном сырьё и навалочные грузы.', en: 'Jewish Autonomous Region; mostly raw materials and bulk.', zh: '犹太自治州；以原材料和散货为主。', tr: 'Yahudi Özerk Bölgesi; çoğunlukla hammadde ve dökme yük.' } },
    { n: { ru: 'Хоргос / Алтынколь, Достык — Алашанькоу (Казахстан)', en: 'Khorgos / Altynkol, Dostyk — Alashankou (Kazakhstan)', zh: '霍尔果斯/阿腾科里、多斯特克—阿拉山口（哈萨克斯坦）', tr: 'Horgos / Altınköl, Dostık — Alaşankou (Kazakistan)' }, m: { ru: 'ЖД, авто', en: 'rail, truck', zh: '铁路、公路', tr: 'demiryolu, karayolu' }, t: { ru: 'Короче из Западного Китая; строгие досмотры, СНТ и электронные навигационные пломбы (с 11.02.2026).', en: 'Shorter from Western China; strict inspections, SNT waybills and e-navigation seals (from 11 Feb 2026).', zh: '从中国西部更近；查验严格，需SNT随货单和电子导航铅封（2026年2月11日起）。', tr: 'Batı Çin’den daha kısa; sıkı denetim, SNT irsaliyesi ve elektronik navigasyon mühürleri (11.02.2026’dan itibaren).' } },
  ];
  var DOCS = {
    ru: ['Внешнеторговый контракт с базисом поставки по Инкотермс 2020.', 'Инвойс и упаковочный лист — вес и количество должны совпадать с фактом.', 'Транспортный документ: ЖД — СМГС, авто — CMR, море — коносамент, авиа — AWB.', 'Разрешительные документы ЕАЭС: сертификат или декларация соответствия, где нужно — маркировка «Честный знак».', 'Точный код ТН ВЭД: от него зависят пошлина, НДС и обязательные разрешения.', 'Транзит через Казахстан: СНТ и электронные навигационные пломбы.', 'Перевозки по России: электронная транспортная накладная (ЭТРН).'],
    en: ['Foreign trade contract with Incoterms 2020 delivery terms.', 'Invoice and packing list — weight and quantity must match the actual cargo.', 'Transport document: rail — SMGS, truck — CMR, sea — bill of lading, air — AWB.', 'EAEU permits: certificate or declaration of conformity; “Chestny Znak” labelling where required.', 'Accurate HS (TN VED) code: it defines duty, VAT and required permits.', 'Transit via Kazakhstan: SNT waybills and electronic navigation seals.', 'Carriage within Russia: electronic consignment note (ETRN).'],
    zh: ['对外贸易合同，注明《2020年国际贸易术语》交货条件。', '发票和装箱单——重量与数量须与实际货物一致。', '运输单据：铁路——国际货协运单（SMGS），公路——CMR，海运——提单，空运——航空运单。', '欧亚经济联盟许可文件：合格证书或合格声明；需要时加贴“诚信标志”。', '准确的海关编码（TN VED）：决定关税、增值税及所需许可。', '经哈萨克斯坦过境：SNT随货单和电子导航铅封。', '俄罗斯境内运输：电子运单（ETRN）。'],
    tr: ['Incoterms 2020 teslim şartlı dış ticaret sözleşmesi.', 'Fatura ve çeki listesi — ağırlık ve miktar fiili yükle aynı olmalı.', 'Taşıma belgesi: demiryolu — SMGS, karayolu — CMR, deniz — konşimento, hava — AWB.', 'AEB izinleri: uygunluk sertifikası veya beyanı; gereken yerde “Çestnıy Znak” etiketi.', 'Doğru GTİP (TN VED) kodu: gümrük vergisi, KDV ve gerekli izinleri belirler.', 'Kazakistan transiti: SNT irsaliyesi ve elektronik navigasyon mühürleri.', 'Rusya içi taşıma: elektronik taşıma irsaliyesi (ETRN).'],
  };
  T.title = { ru: 'Гид по доставке', en: 'Shipping guide', zh: '运输指南', tr: 'Taşıma rehberi' };
  T.sub = { ru: 'Как сейчас везти из Китая в Россию: обстановка на маршрутах, сроки, погранпереходы и документы.', en: 'How to ship from China to Russia right now: route conditions, transit times, border crossings and documents.', zh: '当前如何从中国运往俄罗斯：路线状况、时效、口岸和单证。', tr: 'Şu anda Çin’den Rusya’ya nasıl taşınır: güzergâh durumu, süreler, sınır kapıları ve belgeler.' };
  T.upd = { ru: 'Обновлено: ноябрь 2026', en: 'Updated: November 2026', zh: '更新：2026年11月', tr: 'Güncelleme: Kasım 2026' };
  T.pulse = { ru: 'Обстановка на маршрутах', en: 'Route conditions', zh: '路线状况', tr: 'Güzergâh durumu' };
  T.tabs = { now: { ru: 'Новости рынка', en: 'Market news', zh: '市场动态', tr: 'Piyasa haberleri' }, choose: { ru: 'Какой маршрут', en: 'Which route', zh: '选哪条路线', tr: 'Hangi güzergâh' }, times: { ru: 'Сроки', en: 'Transit times', zh: '时效', tr: 'Süreler' }, cross: { ru: 'Погранпереходы', en: 'Border crossings', zh: '口岸', tr: 'Sınır kapıları' }, docs: { ru: 'Документы', en: 'Documents', zh: '单证', tr: 'Belgeler' } };
  T.where = { ru: 'Куда везём?', en: 'Where to?', zh: '运往哪里？', tr: 'Nereye?' };
  T.calc = { ru: 'Посчитать этот маршрут', en: 'Quote this route', zh: '计算该路线', tr: 'Bu güzergâhı hesapla' };
  T.all = { ru: 'Все маршруты и их плюсы-минусы', en: 'All routes: pros and cons', zh: '全部路线：优缺点', tr: 'Tüm güzergâhlar: artılar ve eksiler' };
  T.docsHint = { ru: 'Отмечайте, что уже готово — отметки сохранятся на этом устройстве.', en: 'Tick what is ready — your ticks stay on this device.', zh: '勾选已准备好的单证——勾选会保存在本设备上。', tr: 'Hazır olanları işaretleyin — işaretler bu cihazda kalır.' };
  T.ready = { ru: 'готово', en: 'ready', zh: '已备齐', tr: 'hazır' };
  T.st = { best: { ru: 'Оптимальный вариант', en: 'Best option', zh: '最佳方案', tr: 'En iyi seçenek' }, alt: { ru: 'Хорошая альтернатива', en: 'Good alternative', zh: '不错的替代', tr: 'İyi alternatif' }, fast: { ru: 'Самый быстрый', en: 'Fastest', zh: '最快', tr: 'En hızlı' }, warn: { ru: 'Возможны задержки', en: 'Possible delays', zh: '可能延误', tr: 'Gecikme olabilir' }, risk: { ru: 'Высокий риск', en: 'High risk', zh: '高风险', tr: 'Yüksek risk' } };
  var PULSE = [
    { lv: 'ok', st: 'best', d: '18–35', n: { ru: 'ЖД через Забайкальск', en: 'Rail via Zabaikalsk', zh: '经后贝加尔斯克铁路', tr: 'Zabaykalsk üzerinden demiryolu' }, t: { ru: 'Главный коридор; в пик — очереди', en: 'Main corridor; queues at peak', zh: '主通道；旺季排队', tr: 'Ana koridor; yoğun dönemde kuyruk' } },
    { lv: 'ok', st: 'alt', d: '18–32', n: { ru: 'ЖД через Монголию', en: 'Rail via Mongolia', zh: '经蒙古铁路', tr: 'Moğolistan üzerinden demiryolu' }, t: { ru: 'Эрлянь — Замын-Ууд, разгружает Забайкальск', en: 'Erenhot — Zamyn-Uud, relieves Zabaikalsk', zh: '二连浩特—扎门乌德，分流后贝加尔斯克', tr: 'Erenhot — Zamın-Üüd, Zabaykalsk’ı rahatlatır' } },
    { lv: 'warn', d: '15–30', n: { ru: 'Через Казахстан', en: 'Via Kazakhstan', zh: '经哈萨克斯坦', tr: 'Kazakistan üzerinden' }, t: { ru: 'Строгие досмотры, СНТ и э-пломбы', en: 'Strict checks, SNT and e-seals', zh: '严格查验、SNT与电子铅封', tr: 'Sıkı denetim, SNT ve e-mühür' } },
    { lv: 'warn', d: '35–60', n: { ru: 'Море + ЖД через Владивосток', en: 'Sea + rail via Vladivostok', zh: '经符拉迪沃斯托克海铁联运', tr: 'Vladivostok üzerinden deniz + demiryolu' }, t: { ru: 'Вывоз из порта — до 2 недель', en: 'Port dispatch up to 2 weeks', zh: '港口发运最长2周', tr: 'Limandan sevk 2 haftaya kadar' } },
    { lv: 'risk', d: '45–60+', n: { ru: 'Море через Новороссийск', en: 'Sea via Novorossiysk', zh: '经新罗西斯克海运', tr: 'Novorossiysk üzerinden deniz' }, t: { ru: 'Надбавка за военный риск ~$1000/конт.', en: 'War-risk surcharge ~$1,000/box', zh: '战争险附加费约1000美元/箱', tr: 'Savaş riski ek ücreti ~1.000 $/konteyner' } },
    { lv: 'ok', st: 'fast', d: '2–7', n: { ru: 'Авиа', en: 'Air', zh: '空运', tr: 'Hava yolu' }, t: { ru: 'Быстро и дорого: срочное и ценное', en: 'Fast and costly: urgent, high-value', zh: '快但贵：急件和高价值货', tr: 'Hızlı ve pahalı: acil, değerli yük' } },
  ];
  var REG = [
    [{ ru: 'Москва и центр', en: 'Moscow & centre', zh: '莫斯科及中部', tr: 'Moskova ve merkez' }, 'Москва', 'rail'],
    [{ ru: 'Урал и Поволжье', en: 'Urals & Volga', zh: '乌拉尔和伏尔加', tr: 'Urallar ve Volga' }, 'Екатеринбург', 'rail'],
    [{ ru: 'Сибирь', en: 'Siberia', zh: '西伯利亚', tr: 'Sibirya' }, 'Новосибирск', 'rail'],
    [{ ru: 'Дальний Восток', en: 'Far East', zh: '远东', tr: 'Uzak Doğu' }, 'Владивосток', 'auto'],
    [{ ru: 'Юг России', en: 'Southern Russia', zh: '俄罗斯南部', tr: 'Güney Rusya' }, 'Краснодар', 'rail'],
    [{ ru: 'Срочный груз', en: 'Urgent cargo', zh: '急件', tr: 'Acil yük' }, 'Москва', 'air'],
    [{ ru: 'Сборный груз', en: 'Groupage', zh: '拼箱货', tr: 'Parsiyel yük' }, 'Москва', 'auto'],
  ];
  var IC = { ok: '<path d="M5 12l4 4 10-10"/>', warn: '<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>', risk: '<path d="M12 3l9 16H3zM12 10v4M12 17v.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>' };
  var tab = 'now', reg = 0;
  function L() { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } }
  function e(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function link(k) { var s = S[k]; return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + e(s[0]) + ' ↗</a>'; }
  function ic(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>'; }
  function docsDone() { try { return JSON.parse(localStorage.getItem('iomaDocs') || '{}') || {}; } catch (x) { return {}; } }
  function render() {
    var box = document.getElementById('kbBody'); if (!box) return;
    var l = L(), t = function (o) { return o[l] || o.ru; }, R = window.IOMA_ROUTES;
    var h = '<section class="kb-pulse"><div class="kb-ph"><b>' + t(T.pulse) + '</b><span>' + t(T.upd) + '</span></div><div class="kb-pg">' + PULSE.map(function (p) { return '<div class="kb-p kb-' + p.lv + '"><span class="kb-st">' + ic(p.lv) + t(T.st[p.st || p.lv]) + '</span><b>' + e(t(p.n)) + '</b><em>' + p.d + ' ' + t(T.days) + '</em><small>' + e(t(p.t)) + '</small></div>'; }).join('') + '</div></section>';
    h += '<div class="kb-tabs" role="tablist">' + ['now', 'choose', 'times', 'cross', 'docs'].map(function (k) { return '<button type="button" role="tab" class="chip' + (k === tab ? ' on' : '') + '" aria-selected="' + (k === tab) + '" data-kbt="' + k + '">' + t(T.tabs[k]) + '</button>'; }).join('') + '</div><div class="kb-pane">';
    if (tab === 'now') h += '<div class="kb-news">' + NOW.map(function (x) { return '<article class="k kb-n kb-' + x.lv + '"><span class="kb-ni">' + ic(x.lv) + '</span><div><b>' + e(t(x.h)) + '</b><p>' + e(x[l] || x.ru) + '</p><span class="kb-src">' + link(x.s) + '</span></div></article>'; }).join('') + '</div>';
    if (tab === 'choose') {
      var txt = (CHOOSE[l] || CHOOSE.ru)[reg].replace(/^[^:：]+[:：]\s*/, '');
      h += '<div class="k kb-choose"><b class="kb-q">' + t(T.where) + '</b><div class="kb-regs">' + REG.map(function (r, i) { return '<button type="button" class="chip' + (i === reg ? ' on' : '') + '" data-kbr="' + i + '">' + e(t(r[0])) + '</button>'; }).join('') + '</div><div class="kb-ans"><p>' + e(txt) + '</p><button type="button" class="calculate kb-go" data-kbcalc="' + reg + '">' + t(T.calc) + ' →</button></div></div>';
      if (R) h += '<details class="kb-all"><summary>' + t(T.all) + '</summary><div class="kb-routes">' + R.corridors.map(function (c) { return '<div class="kb-r' + (c.risky ? ' risky' : '') + '"><div class="kb-rh"><i style="background:' + R.colors[c.mode] + '"></i><b>' + e(c.t[l] || c.t.ru) + '</b><span>' + c.days[0] + '–' + c.days[1] + ' ' + t(T.days) + '</span></div><p class="p">+ ' + e(c.plus[l] || c.plus.ru) + '</p><p class="m">− ' + e(c.minus[l] || c.minus.ru) + '</p></div>'; }).join('') + '</div></details>';
    }
    if (tab === 'times') h += '<div class="k kb-times">' + TIMES.map(function (x) { var a = x.r[0] / 65 * 100, w = Math.max(3, (x.r[1] - x.r[0]) / 65 * 100); return '<div class="kb-tr"><span>' + e(t(x.m)) + '</span><div class="kb-bar"><i style="left:' + a + '%;width:' + w + '%"></i></div><b>' + (x.r[0] === 11 ? '≈12' : x.r[0] + '–' + x.r[1]) + ' ' + t(T.days) + '</b></div>'; }).join('') + '<div class="kb-scale"><span>0</span><span>15</span><span>30</span><span>45</span><span>60 ' + t(T.days) + '</span></div><p class="kb-note">' + t(T.note) + ' ' + link('lenta') + '</p></div>';
    if (tab === 'cross') h += '<div class="kb-cross">' + CROSS.map(function (x) { return '<div class="k"><b>' + e(t(x.n)) + '</b><span>' + e(t(x.m)) + '</span><p>' + e(t(x.t)) + '</p></div>'; }).join('') + '</div>';
    if (tab === 'docs') { var dd = docsDone(), list = DOCS[l] || DOCS.ru, n = list.filter(function (_, i) { return dd[i]; }).length;
      h += '<div class="k kb-docs"><div class="kb-dh"><span>' + t(T.docsHint) + '</span><b>' + n + ' / ' + list.length + ' ' + t(T.ready) + '</b></div><div class="kb-prog"><i style="width:' + (n / list.length * 100) + '%"></i></div>' + list.map(function (x, i) { return '<label class="kb-d"><input type="checkbox" data-kbd="' + i + '"' + (dd[i] ? ' checked' : '') + '><span>' + e(x) + '</span></label>'; }).join('') + '</div>'; }
    h += '</div><p class="kb-sources">' + t(T.sources) + ': ' + Object.keys(S).map(link).join(' · ') + '</p>';
    box.innerHTML = h;
    var hd = document.querySelector('#kbView .v3-head'); if (hd) { hd.querySelector('h1').textContent = t(T.title); hd.querySelector('p').textContent = t(T.sub); }
  }
  document.addEventListener('click', function (ev) {
    var x = ev.target.closest && ev.target.closest('[data-kbt],[data-kbr],[data-kbcalc]'); if (!x) return;
    if (x.dataset.kbt) { tab = x.dataset.kbt; render(); }
    else if (x.dataset.kbr) { reg = +x.dataset.kbr; render(); }
    else { var r = REG[+x.dataset.kbcalc], to = document.getElementById('toCity'); if (to) { to.value = r[1]; to.dispatchEvent(new Event('input', { bubbles: true })); to.dispatchEvent(new Event('change', { bubbles: true })); } if (window.__v3setMode) window.__v3setMode(r[2], true); if (window.__iomaOpenView) window.__iomaOpenView('calculator'); }
  });
  document.addEventListener('change', function (ev) { var c = ev.target; if (!c.dataset || c.dataset.kbd == null) return; var d = docsDone(); d[c.dataset.kbd] = c.checked; try { localStorage.setItem('iomaDocs', JSON.stringify(d)); } catch (x) {} render(); });
  window.IOMA_KB = { render: render };
  document.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('.lang')) setTimeout(render, 80); });
})();
