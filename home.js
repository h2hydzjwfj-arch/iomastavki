/* IOMASTAVKA — публичная часть: главная (один экран), «Услуги», «Кейсы», язык одной кнопкой, звонок Роману.
   Главная: «Под ключ» и «Только доставка» в одном блоке (сами сменяют друг друга, пока посетитель не выберет),
   карта маршрутов из Китая в Москву (routes-map.js). Тексты переводятся через общий словарь (IOMA_T_ADD). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function lang() { try { var l = localStorage.getItem('iomastavka_lang'); return l === 'en' || l === 'zh' ? l : 'ru'; } catch (e) { return 'ru'; } }
  var T = function (s) { return window.IOMA_T ? window.IOMA_T(s) : s; };
  function role() { var m = document.body.className.match(/\brole-(admin|client|guest)\b/); return m ? m[1] : 'guest'; }

  /* ---------------- переводы новых разделов ---------------- */
  var DICT = {
    'Китай → Россия': ['China → Russia', '中国 → 俄罗斯'], 'Купим в Китае.': ['We buy in China.', '我们在中国采购。'], 'Привезём в Россию.': ['We deliver to Russia.', '运到俄罗斯。'],
    'Под ключ': ['Turnkey', '一站式'], 'Только доставка': ['Delivery only', '仅运输'],
    'Найдём и проверим поставщика, оплатим ему по контракту, доставим, растаможим и сертифицируем. Вы принимаете груз на складе.': ['We find and vet the supplier, pay them under contract, ship, clear customs and certify. You receive the goods at your warehouse.', '我们寻找并核实供应商，按合同付款，运输、清关并办理认证。您在仓库收货即可。'],
    'Поставщик уже есть? Заберём груз у него и привезём в Москву: авиа, авто, ЖД или морем через Владивосток.': ['Already have a supplier? We pick up the cargo and bring it to Moscow by air, truck, rail or by sea via Vladivostok.', '已有供应商？我们从供应商处提货，经空运、公路、铁路或经符拉迪沃斯托克海运送到莫斯科。'],
    'Поставщик': ['Supplier', '供应商'], 'Оплата': ['Payment', '付款'], 'Доставка': ['Delivery', '运输'], 'Таможня': ['Customs', '清关'], 'Ваш склад': ['Your warehouse', '您的仓库'],
    'Забор у поставщика': ['Pickup', '提货'], 'Экспорт': ['Export', '出口报关'], 'Перевозка': ['Transport', '运输'],
    'Рассчитать доставку': ['Get a delivery rate', '计算运费'], 'Оставить заявку': ['Send a request', '提交需求'], 'Открыть «Работу»': ['Open “Work”', '打开“工作”'],
    'Роман': ['Roman', '罗曼'], 'логист iomastavka': ['logistics manager, iomastavka', 'iomastavka 物流经理'], 'Позвонить': ['Call', '致电'], 'Скопировать номер': ['Copy number', '复制号码'], 'Номер скопирован': ['Number copied', '号码已复制'],
    'Связаться с Романом': ['Contact Roman', '联系罗曼'], 'Китай → Россия · выкуп, доставка, растаможка': ['China → Russia · sourcing, delivery, customs clearance', '中国 → 俄罗斯 · 采购、运输、清关'],
    'Расчёт ставок': ['Rates', '运费计算'], 'Услуги': ['Services', '服务'], 'Кейсы': ['Cases', '案例'], 'ТН ВЭД': ['HS codes', '海关编码'], 'Гид по доставке': ['Shipping guide', '运输指南'],
    'Язык сайта': ['Site language', '网站语言'], 'Маршруты из Китая в Москву': ['Routes from China to Moscow', '中国至莫斯科路线'], 'Что нужно': ['What do you need', '您需要什么'],
    // услуги
    'Что мы делаем': ['What we do', '我们的服务'], 'От оплаты поставщику до вашего склада — или только перевозка, если поставщик уже есть.': ['From paying the supplier to your warehouse — or just the transport if you already have a supplier.', '从向供应商付款到送达您的仓库——如果您已有供应商，也可只负责运输。'],
    'Выкуп и оплата поставщику': ['Purchasing and supplier payment', '采购与供应商付款'], 'Платим поставщику в Китае напрямую через ВТБ Шанхай или через торговый дом. Контракт, инвойс, контроль отгрузки.': ['We pay your supplier in China directly via VTB Shanghai or through a trading house. Contract, invoice, shipment control.', '通过VTB上海分行或贸易公司直接向中国供应商付款。合同、发票、发货监控。'],
    'Доставка любым транспортом': ['Delivery by any transport', '多种运输方式'], 'Авиа — от нескольких дней; авто и ЖД — через Забайкальск, Казахстан, Монголию или Приморье; море — до Владивостока и дальше ЖД.': ['Air — from a few days; truck and rail — via Zabaikalsk, Kazakhstan, Mongolia or Primorye; sea — to Vladivostok, then rail.', '空运——数天起；公路和铁路——经后贝加尔斯克、哈萨克斯坦、蒙古或滨海边疆区；海运——至符拉迪沃斯托克后转铁路。'],
    'Таможенное оформление': ['Customs clearance', '清关'], 'Подбор кода ТН ВЭД, расчёт пошлины и НДС, декларант под вашу ЭЦП или под печать брокера.': ['HS code selection, duty and VAT calculation, declarant using your e-signature or the broker’s seal.', '确定海关编码，计算关税和增值税，可用您的电子签名或报关行印章申报。'],
    'Сертификация': ['Certification', '认证'], 'Декларации и сертификаты соответствия, СГР, Честный знак — заранее, чтобы груз не стоял на таможне.': ['Declarations and certificates of conformity, state registration, Honest Sign labelling — in advance so the cargo doesn’t wait at customs.', '符合性声明和证书、国家注册证书、“诚信标志”——提前办理，避免货物滞留海关。'],
    'Только логистика': ['Logistics only', '仅物流'], 'Поставщик и контракт ваши — мы забираем груз и привозим. Ставка под ваш контракт: EXW, FOB и другие условия.': ['Your supplier and contract — we pick up and deliver. A rate for your terms: EXW, FOB and others.', '供应商和合同由您负责——我们负责提货和运输。按您的条款报价：EXW、FOB等。'],
    'Документы и ЭТрН': ['Documents and e-waybills', '单证与电子运单'], 'Поручения, транспортные накладные, ЭТрН в Контур.Диадоке — подскажем, кто что подписывает.': ['Instructions, waybills, e-waybills in Kontur.Diadoc — we tell you who signs what.', '委托书、运单、Kontur.Diadoc电子运单——我们告诉您谁签什么。'],
    'Посчитать мой груз': ['Price my cargo', '计算我的货物'],
    // кейсы
    'Что мы уже привезли': ['What we have delivered', '我们已运送的货物'], 'Нажмите на груз — покажем, как ехал: вес, объём, транспорт. Сколько стоила доставка клиенту, не показываем.': ['Tap a shipment to see how it travelled: weight, volume, transport. We don’t show what the client paid.', '点击货物查看运输详情：重量、体积、运输方式。不公开客户支付的运费。'],
    'Ещё возили': ['We also shipped', '我们还运过'], 'Груз': ['Cargo', '货物'], 'Вес': ['Weight', '重量'], 'Фактический вес': ['Actual weight', '实际重量'], 'Объём': ['Volume', '体积'], 'Мест': ['Pieces', '件数'], 'Стоимость товара': ['Goods value', '货值'],
    'Транспорт': ['Transport', '运输方式'], 'Машин': ['Trucks', '车数'], 'Маршрут': ['Route', '路线'], 'Посчитать такой же груз': ['Price a similar shipment', '计算类似货物'],
    '+ Кейс': ['+ Case', '+ 案例'], 'Кейс': ['Case', '案例'], 'Новый кейс': ['New case', '新案例'], 'Сохранить': ['Save', '保存'], 'Удалить': ['Delete', '删除'], 'Отмена': ['Cancel', '取消'],
    'Авто': ['Truck', '公路'], 'ЖД': ['Rail', '铁路'], 'Авиа': ['Air', '空运'], 'Море + ЖД': ['Sea + rail', '海运 + 铁路'], 'Мульти': ['Multimodal', '多式联运'],
    'кг': ['kg', '公斤'], 'т': ['t', '吨'], 'м³': ['m³', '立方米'], 'млн ₽': ['M RUB', '百万卢布'],
  };
  // кейсы и товары по умолчанию; новые кейсы администратор пишет сам (с ИИ робот переведёт их)
  var GOODS = { 'Баллистическая ткань': ['Ballistic fabric', '防弹面料'], 'Сумки и рюкзаки': ['Bags and backpacks', '箱包和背包'], 'Бутылки': ['Bottles', '瓶子'], 'Арамидная верёвка': ['Aramid rope', '芳纶绳'],
    'Гидравлический инструмент': ['Hydraulic tools', '液压工具'], 'Гидроцилиндры': ['Hydraulic cylinders', '液压缸'], 'Транспаки': ['Transport packs', '运输包装'], 'Термомозаика': ['Fuse beads', '拼豆'], 'Инверторы': ['Inverters', '逆变器'],
    'Камеры для банкоматов': ['ATM cameras', 'ATM 摄像头'], 'Капсульный дом': ['Capsule house', '太空舱房屋'], 'Когтеточки': ['Cat scratchers', '猫抓板'], 'Конвейерная лента': ['Conveyor belt', '输送带'], 'Косметика': ['Cosmetics', '化妆品'],
    'Регуляторы скорости': ['Speed controllers', '调速器'], 'Кухонные мойки': ['Kitchen sinks', '厨房水槽'], 'Лампы': ['Lamps', '灯具'], 'Образцы свитеров': ['Sweater samples', '毛衣样品'], 'Пищевое оборудование': ['Food processing equipment', '食品加工设备'],
    'Токарные пластины': ['Turning inserts', '车刀片'], 'Портативные анализаторы': ['Portable analysers', '便携式分析仪'], 'Рюкзаки': ['Backpacks', '背包'], 'Салфетки': ['Wipes and napkins', '湿巾和纸巾'], 'Тара': ['Packaging', '包装容器'],
    'Техническое оборудование': ['Technical equipment', '技术设备'], 'Синьчжоу → Москва': ['Xinzhou → Moscow', '忻州 → 莫斯科'], 'Партия 15 т на 27 млн ₽ — пять фур.': ['A 15-tonne shipment worth 27 million ₽ — five trucks.', '15 吨货物，价值 2700 万卢布，五辆卡车。'],
    'Расчётный вес 780 кг при фактическом 580 кг — груз объёмный, ставка считалась по объёмному весу.': ['Chargeable weight 780 kg with an actual weight of 580 kg — bulky cargo, so the rate was based on volumetric weight.', '计费重 780 公斤，实重 580 公斤——货物体积大，按体积重计费。'],
    'Р': ['R', 'R'], 'Стоимость груза': ['Cargo value', '货值'], 'Нажмите на груз — покажем, как ехал: вес, объём, стоимость груза и транспорт.': ['Tap a shipment to see how it travelled: weight, volume, cargo value and transport.', '点击货物，查看运输详情：重量、体积、货值和运输方式。'] };
  Object.keys(GOODS).forEach(function (k) { DICT[k] = GOODS[k]; });
  if (window.IOMA_T_ADD) window.IOMA_T_ADD(DICT);

  /* ---------------- главная: «Под ключ» / «Только доставка» ---------------- */
  var hx = $('#hx'), autoT = 0, autoOn = true, CYCLE = 6500;
  function pick(mode, user) {
    if (!hx) return; if (user) { autoOn = false; clearInterval(autoT); hx.classList.add('hx-manual'); }
    $$('[data-hx]', hx).forEach(function (b) { var on = b.dataset.hx === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('[data-hxc]', hx).forEach(function (c) { c.classList.toggle('on', c.dataset.hxc === mode); });
    moveInd(); hx.dataset.mode = mode;
    var bar = $('.hx-bar', hx); if (bar && autoOn) { bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); }
  }
  function moveInd() { var b = $('[data-hx].on', hx), i = $('.hx-ind', hx); if (b && i) { i.style.width = b.offsetWidth + 'px'; i.style.transform = 'translateX(' + b.offsetLeft + 'px)'; } }
  if (hx) {
    hx.addEventListener('click', function (e) { var b = e.target.closest('[data-hx]'); if (b) pick(b.dataset.hx, true); });
    pick('full');
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) autoT = setInterval(function () { if (!autoOn || document.hidden || document.body.classList.contains('view-open')) return; pick(hx.dataset.mode === 'full' ? 'cargo' : 'full'); }, CYCLE);
    else { autoOn = false; hx.classList.add('hx-manual'); }
    window.addEventListener('resize', moveInd);
    new MutationObserver(function () { setTimeout(moveInd, 60); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    requestAnimationFrame(function () { hx.classList.add('in'); });
  }

  /* ---------------- звонок Роману ---------------- */
  var call = $('[data-call]');
  if (call) {
    var acts = $('.hx-acts', call);
    call.addEventListener('click', function (e) {
      var o = e.target.closest('[data-call-open]');
      if (o) { var show = acts.hidden; acts.hidden = !show; call.classList.toggle('open', show); $$('[data-call-open]', call).forEach(function (b) { b.setAttribute('aria-expanded', show); }); return; }
      var c = e.target.closest('[data-copy]');
      if (c) { var done = function () { c.textContent = T('Номер скопирован'); setTimeout(function () { c.textContent = T('Скопировать номер'); }, 1600); }; if (navigator.clipboard) navigator.clipboard.writeText(c.dataset.copy).then(done).catch(done); else done(); }
    });
    document.addEventListener('click', function (e) { if (!call.contains(e.target) && !acts.hidden) { acts.hidden = true; call.classList.remove('open'); } });
  }

  /* ---------------- карта маршрутов ---------------- */
  function openCalc(fromRu, mode, toRu) {
    if (window.__iomaOpenView) window.__iomaOpenView('calculator');
    setTimeout(function () { if (window.IOMA_CALC_PUBLIC && window.IOMA_CALC_PUBLIC.prefill) window.IOMA_CALC_PUBLIC.prefill({ from: fromRu, to: toRu, mode: mode }); else { var f = $('#fromCity'); if (f) { f.value = fromRu; f.dispatchEvent(new Event('input', { bubbles: true })); } } }, 80);
  }
  // высота шапки бывает разной (меню переносится на вторую строку) — первый экран считаем от настоящей
  function hdr() { var t = document.querySelector('.topbar'); if (t && t.offsetHeight) document.documentElement.style.setProperty('--hdr', t.offsetHeight + 'px'); }
  hdr(); window.addEventListener('resize', hdr); if (window.ResizeObserver) { var tb = document.querySelector('.topbar'); if (tb) new ResizeObserver(hdr).observe(tb); }
  function mountMap() { var el = $('#hxMap'); if (!el || !window.IOMA_RMAP || el.dataset.on) return; el.dataset.on = '1'; window.IOMA_RMAP.mount(el, { auto: true, fitTo: el.closest('.hx-r'), onPick: function (k, mode, ru, to, toRu) { openCalc(ru, mode, toRu); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountMap); else mountMap();

  /* ---------------- язык одной кнопкой ---------------- */
  var lx = $('[data-lx]');
  if (lx) {
    var lb = $('.lx-btn', lx), cur = $('.lx-cur', lx);
    var setCur = function () { var l = lang(); cur.textContent = l === 'zh' ? '中文' : l.toUpperCase(); $$('.lang', lx).forEach(function (b) { b.setAttribute('aria-checked', b.dataset.lang === l); }); };
    lb.addEventListener('click', function (e) { e.stopPropagation(); var open = !lx.classList.contains('open'); lx.classList.toggle('open', open); lb.setAttribute('aria-expanded', open); });
    lx.addEventListener('click', function (e) { if (e.target.closest('.lang')) { lx.classList.remove('open'); lb.setAttribute('aria-expanded', 'false'); setTimeout(setCur, 30); } });
    document.addEventListener('click', function (e) { if (!lx.contains(e.target)) { lx.classList.remove('open'); lb.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lx.classList.contains('open')) { lx.classList.remove('open'); lb.focus(); } });
    setCur();
  }

  /* ---------------- страницы «Услуги» и «Кейсы» ---------------- */
  var ICON = {
    buy: '<path d="M3 7h18v10H3zM3 10h18M7 14h4"/>', ship: '<path d="M3 17l2-6h12l3-3h2l-3 9zM2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>', customs: '<path d="M5 21V8l7-5 7 5v13M9 21v-6h6v6M3 21h18"/>',
    cert: '<path d="M7 3h10v18l-5-3-5 3zM9 8h6M9 12h6"/>', truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8zM6 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z"/>', doc: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
  };
  var SERVICES = [['buy', 'Выкуп и оплата поставщику', 'Платим поставщику в Китае напрямую через ВТБ Шанхай или через торговый дом. Контракт, инвойс, контроль отгрузки.'],
    ['ship', 'Доставка любым транспортом', 'Авиа — от нескольких дней; авто и ЖД — через Забайкальск, Казахстан, Монголию или Приморье; море — до Владивостока и дальше ЖД.'],
    ['customs', 'Таможенное оформление', 'Подбор кода ТН ВЭД, расчёт пошлины и НДС, декларант под вашу ЭЦП или под печать брокера.'],
    ['cert', 'Сертификация', 'Декларации и сертификаты соответствия, СГР, Честный знак — заранее, чтобы груз не стоял на таможне.'],
    ['truck', 'Только логистика', 'Поставщик и контракт ваши — мы забираем груз и привозим. Ставка под ваш контракт: EXW, FOB и другие условия.'],
    ['doc', 'Документы и ЭТрН', 'Поручения, транспортные накладные, ЭТрН в Контур.Диадоке — подскажем, кто что подписывает.']];
  function renderServices() {
    var b = $('#servicesBody'); if (!b) return;
    b.innerHTML = '<header class="pg-h"><span class="pg-ey">Услуги</span><h2>Что мы делаем</h2><p>От оплаты поставщику до вашего склада — или только перевозка, если поставщик уже есть.</p></header>'
      + '<div class="sv-g">' + SERVICES.map(function (s, i) { return '<article class="sv-c" style="--i:' + i + '"><span class="sv-i"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[s[0]] + '</svg></span><h3>' + esc(s[1]) + '</h3><p>' + esc(s[2]) + '</p></article>'; }).join('') + '</div>'
      + '<div class="pg-cta"><button type="button" class="hx-btn hx-btn-o" data-open-view="calculator">Посчитать мой груз<span aria-hidden="true">→</span></button><button type="button" class="hx-btn hx-btn-l" data-open-view="leadView" data-roles="guest client">Оставить заявку</button></div>';
  }
  var MODE_RU = { road: 'Авто', rail: 'ЖД', air: 'Авиа', sea: 'Море + ЖД', multi: 'Мульти' };
  var CASES = null;
  function num(v) { return Number(v || 0).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 }); }
  function weight(v) { return v >= 1000 ? num(v / 1000) + ' ' + T('т') : num(v) + ' ' + T('кг'); }
  function money(v) { return v >= 1e6 ? num(v / 1e6) + ' ' + T('млн ₽') : num(v) + ' ₽'; }
  // значок транспорта — для кейса без фото (рамка не пустая)
  var MODE_ICON = { road: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7"/><circle cx="6.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>', rail: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9.5 20l-1.5-4M14.5 20l1.5-4"/>', air: '<path d="M21 12.6l-7.2-3V5a1.8 1.8 0 00-3.6 0v4.6L3 12.6v2l7.2-1.8v4l-2.1 1.5V20l3.9-1 3.9 1v-1.7l-2.1-1.5v-4l7.2 1.8z"/>', sea: '<path d="M3 15.5l1.8 3.5h14.4l1.8-3.5zM6 15.5V10h12v5.5M9 10V6.5h6V10M12 3.5v3"/>' };
  function frame(c, big) {
    return '<span class="cs-frame' + (big ? ' big' : '') + (c.photo ? '' : ' empty') + '">' + (c.photo ? '<img src="' + esc(c.photo) + '" alt="' + esc(c.goods) + '" loading="lazy" decoding="async">' : '<svg viewBox="0 0 24 24" aria-hidden="true">' + (MODE_ICON[c.transport === 'multi' ? 'sea' : c.transport] || MODE_ICON.road) + '</svg>') + '</span>';
  }
  function caseCard(c, i) {
    var facts = [c.weight ? weight(c.weight) : '', T(MODE_RU[c.transport] || ''), c.trucks ? c.trucks + ' ' + (lang() === 'ru' ? (c.trucks % 10 === 1 && c.trucks % 100 !== 11 ? 'фура' : c.trucks % 10 >= 2 && c.trucks % 10 <= 4 && (c.trucks % 100 < 10 || c.trucks % 100 >= 20) ? 'фуры' : 'фур') : T('Машин').toLowerCase()) : ''].filter(Boolean);
    return '<button type="button" class="cs-c" data-case="' + esc(c.id) + '" style="--i:' + i + '">' + frame(c) + '<span class="cs-body"><span class="cs-mode cs-' + esc(c.transport || 'road') + '">' + esc(T(MODE_RU[c.transport] || '')) + '</span><b>' + esc(c.goods) + '</b><span class="cs-f">' + facts.map(esc).join(' · ') + '</span>'
      + (c.value ? '<span class="cs-val"><small>' + esc(T('Стоимость груза')) + '</small><em>' + esc(money(c.value)) + '</em></span>' : '')
      + (c.from || c.to ? '<small class="cs-route">' + esc([c.from, c.to].filter(Boolean).join(' → ')) + '</small>' : '') + '</span><i aria-hidden="true">→</i></button>';
  }
  function renderCases() {
    var b = $('#casesBody'); if (!b) return;
    b.innerHTML = '<p class="pg-load">…</p>';
    fetch('/api/cases', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
      CASES = d.items || [];
      var known = {}; CASES.forEach(function (c) { known[String(c.goods).toLowerCase()] = 1; });
      var more = (d.goods || []).filter(function (g) { return !known[g.toLowerCase()]; });
      b.innerHTML = '<header class="pg-h"><span class="pg-ey">Кейсы</span><h2>Что мы уже привезли</h2><p>Нажмите на груз — покажем, как ехал: вес, объём, стоимость груза и транспорт.</p>' + (role() === 'admin' ? '<button type="button" class="hx-btn hx-btn-l pg-add" data-case-add>+ Кейс</button>' : '') + '</header>'
        + '<div class="cs-g">' + CASES.map(caseCard).join('') + '</div>'
        + (more.length ? '<h3 class="cs-more-h">Ещё возили</h3><div class="cs-more">' + more.map(function (g) { return '<span>' + esc(g) + '</span>'; }).join('') + '</div>' : '');
    }).catch(function () { b.innerHTML = '<p class="pg-load">Не удалось загрузить кейсы</p>'; });
  }
  function caseModal(c) {
    var K = window.CX; if (!K) return;
    var row = function (k, v) { return v ? '<div class="cs-row"><span>' + esc(T(k)) + '</span><b>' + esc(v) + '</b></div>' : ''; };
    var body = '<div class="cs-m">' + (c.photo ? frame(c, true) : '') + '<div class="cs-m-hero"><span class="cs-mode cs-' + esc(c.transport || 'road') + '">' + esc(T(MODE_RU[c.transport] || '')) + '</span><h3>' + esc(c.goods) + '</h3>' + (c.from || c.to ? '<p>' + esc([c.from, c.to].filter(Boolean).join(' → ')) + '</p>' : '') + '</div>'
      + row('Вес', c.weight ? weight(c.weight) : '') + row('Фактический вес', c.actualWeight ? weight(c.actualWeight) : '') + row('Объём', c.volume ? num(c.volume) + ' ' + T('м³') : '') + row('Мест', c.places ? num(c.places) : '')
      + row('Стоимость груза', c.value ? money(c.value) : '') + row('Транспорт', T(MODE_RU[c.transport] || '')) + row('Машин', c.trucks ? String(c.trucks) : '') + (c.note ? '<p class="cs-note">' + esc(c.note) + '</p>' : '') + '</div>';
    var foot = '<button type="button" class="cx-btn primary" data-case-calc>' + esc(T('Посчитать такой же груз')) + '</button>' + (role() === 'admin' ? '<button type="button" class="cx-btn ghost" data-case-edit>Изменить</button><button type="button" class="cx-btn ghost" data-case-del>' + esc(T('Удалить')) + '</button>' : '');
    var md = K.modal(T('Кейс'), body, foot, { noFocus: true });
    md.el.addEventListener('click', function (e) {
      if (e.target.closest('[data-case-calc]')) { md.close(); if (window.__iomaOpenView) window.__iomaOpenView('calculator'); setTimeout(function () { if (window.IOMA_CALC_PUBLIC && window.IOMA_CALC_PUBLIC.prefill) window.IOMA_CALC_PUBLIC.prefill({ from: c.from && c.from !== 'Китай' ? c.from : '', weight: c.weight, mode: c.transport === 'multi' ? 'sea' : c.transport }); }, 90); }
      if (e.target.closest('[data-case-edit]')) { md.close(); caseForm(c); }
      if (e.target.closest('[data-case-del]')) K.confirm('Удалить кейс «' + c.goods + '»?', 'Удалить').then(function (ok) { if (ok) K.api('/api/cases/' + c.id, { method: 'DELETE' }).then(function () { md.close(); renderCases(); }).catch(function (er) { K.toast(er.message, 'err'); }); });
    });
  }
  function caseForm(c) {
    var K = window.CX; if (!K) return; c = c || {};
    var f = function (k, label, type, ph) { return '<label class="cx-f"><span>' + label + '</span><input data-k="' + k + '"' + (type ? ' inputmode="decimal"' : '') + ' value="' + esc(c[k] == null ? '' : c[k]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>'; };
    var md = K.modal(c.id ? 'Кейс: ' + c.goods : 'Новый кейс', '<div class="cx-grid2">' + f('goods', 'Груз', '', 'Баллистическая ткань') + '<label class="cx-f"><span>Транспорт</span><select data-k="transport">' + ['road', 'rail', 'air', 'sea'].map(function (m) { return '<option value="' + m + '"' + (c.transport === m ? ' selected' : '') + '>' + MODE_RU[m] + '</option>'; }).join('') + '</select></label>'
      + f('from', 'Откуда', '', 'Иу') + f('to', 'Куда', '', 'Москва') + f('weight', 'Вес, кг', 1) + f('actualWeight', 'Фактический вес, кг', 1) + f('volume', 'Объём, м³', 1) + f('places', 'Мест', 1) + f('value', 'Стоимость товара, ₽', 1) + f('trucks', 'Машин', 1)
      + '<label class="cx-f wide"><span>Как ехал (коротко)</span><textarea data-k="note" rows="3">' + esc(c.note || '') + '</textarea></label>'
      + '<div class="cx-f wide cs-up"><span>Фото груза</span><div class="cs-up-row">' + frame(c) + '<div class="cs-up-b"><label class="cx-btn ghost">Выбрать фото<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden data-photo></label>' + (c.photo ? '<button type="button" class="cx-btn ghost" data-photo-del>Убрать фото</button>' : '') + '<small class="cx-mut">JPG, PNG или WebP — сайт сам уменьшит и вставит в рамку</small></div></div></div>'
      + '</div><p class="cx-mut cx-small">Сколько стоила доставка клиенту, на сайте не показывается.</p>',
      '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Сохранить</button>');
    var photo = null, dropPhoto = false;
    $('[data-photo]', md.el).addEventListener('change', function () {
      var file = this.files && this.files[0]; if (!file) return;
      shrink(file).then(function (f) { photo = f; dropPhoto = false; var fr = $('.cs-up .cs-frame', md.el), url = URL.createObjectURL(f); fr.className = 'cs-frame'; fr.innerHTML = '<img src="' + url + '" alt="">'; });
    });
    var del = $('[data-photo-del]', md.el); if (del) del.addEventListener('click', function () { dropPhoto = true; photo = null; var fr = $('.cs-up .cs-frame', md.el); fr.className = 'cs-frame empty'; fr.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + MODE_ICON.road + '</svg>'; del.remove(); });
    $('[data-go]', md.el).addEventListener('click', function () { var b = {}; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value.trim().replace(/\s/g, i.dataset.k === 'goods' || i.dataset.k === 'note' || i.dataset.k === 'from' || i.dataset.k === 'to' ? ' ' : ''); }); K.guard(this, function () {
      return K.api(c.id ? '/api/cases/' + c.id : '/api/cases', { method: c.id ? 'PATCH' : 'POST', body: b }).then(function (r) {
        var id = (r.item && r.item.id) || c.id;
        if (photo) { var fd = new FormData(); fd.append('file', photo, 'case.jpg'); return K.api('/api/cases/' + id + '/photo', { method: 'POST', body: fd }); }
        if (dropPhoto && c.photo) return K.api('/api/cases/' + id + '/photo', { method: 'DELETE' });
      }).then(function () { md.close(); K.toast('Кейс сохранён'); renderCases(); });
    }); });
  }
  // фото уменьшаем в браузере: до 1600 px по длинной стороне, JPEG — быстро грузится у гостей
  function shrink(file) {
    return new Promise(function (ok) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { try { var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); cv.toBlob(function (bl) { ok(bl ? new File([bl], 'case.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', .86); } catch (e) { ok(file); } };
      img.onerror = function () { URL.revokeObjectURL(url); ok(file); }; img.src = url;
    });
  }
  document.addEventListener('click', function (e) {
    var cs = e.target.closest && e.target.closest('[data-case]'); if (cs && CASES) { var c = CASES.filter(function (x) { return x.id === cs.dataset.case; })[0]; if (c) caseModal(c); return; }
    if (e.target.closest && e.target.closest('[data-case-add]')) caseForm(null);
  });
  // открыть «Услуги» и «Кейсы» как страницы
  var PAGES = { servicesView: renderServices, casesView: renderCases };
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-open-view]'); if (!t) return; var id = t.getAttribute('data-open-view'); if (!PAGES[id]) return;
    e.preventDefault(); e.stopPropagation(); if (window.__v3open) window.__v3open(id);
  }, true);
  new MutationObserver(function () { Object.keys(PAGES).forEach(function (id) { var v = document.getElementById(id); if (v && v.classList.contains('open') && !v.dataset.ready) { v.dataset.ready = '1'; PAGES[id](); } else if (v && !v.classList.contains('open')) delete v.dataset.ready; }); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  var pagesLang = document.documentElement.lang; new MutationObserver(function () { if (document.documentElement.lang === pagesLang) return; pagesLang = document.documentElement.lang; var c = document.getElementById('casesView'); if (c && c.classList.contains('open')) renderCases(); var s = document.getElementById('servicesView'); if (s && s.classList.contains('open')) renderServices(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.IOMA_HOME = { pick: pick, renderCases: renderCases };
})();
