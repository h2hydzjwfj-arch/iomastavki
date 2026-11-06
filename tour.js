/* IOMASTAVKA — экскурсия по сайту для нового посетителя: что здесь можно сделать.
   Показывается один раз (можно пропустить), повторить — ссылкой «Как пользоваться сайтом» внизу страницы. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function lang() { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } }
  var LI = { ru: 0, en: 1, zh: 2, tr: 3 };
  function T(a) { return a[LI[lang()]] || a[0]; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  var GUEST = [
    { t: ['Добро пожаловать в iomastavka', 'Welcome to iomastavka', '欢迎来到 iomastavka', 'iomastavka’ya hoş geldiniz'],
      p: ['Покажем за минуту, что здесь можно сделать: посчитать доставку из Китая, отправить документы и следить за грузом.', 'A one-minute tour: quote a shipment from China, send documents and track your cargo.', '一分钟了解本网站：计算从中国发货的运费、发送单证、跟踪货物。', 'Bir dakikada: Çin’den taşımayı hesaplayın, belge gönderin ve yükünüzü takip edin.'] },
    { sel: '#mcStage', t: ['Карта — это калькулятор', 'The map is a calculator', '地图就是计算器', 'Harita bir hesap makinesidir'],
      p: ['Нажмите город отправки в Китае или Корее, затем город доставки в России или Казахстане. Колёсиком мыши или двумя пальцами карту можно приблизить, а перетаскиванием — подвинуть.', 'Tap a city of origin in China or Korea, then a destination in Russia or Kazakhstan. Zoom with the mouse wheel or two fingers, drag to move.', '先点中国或韩国的起运城市，再点俄罗斯或哈萨克斯坦的目的城市。滚轮或双指缩放，拖动可移动地图。', 'Önce Çin veya Kore’de çıkış şehrine, sonra Rusya veya Kazakistan’da varış şehrine dokunun. Tekerlek veya iki parmakla yakınlaştırın, sürükleyerek kaydırın.'] },
    { sel: '#mcPanel', t: ['Вес — и цена сразу здесь', 'Enter weight — see prices here', '输入重量——立即看到价格', 'Ağırlığı girin — fiyat hemen burada'],
      p: ['Укажите вес (и объём, если знаете) и нажмите «Рассчитать»: покажем цену и срок для авто, ЖД, моря и авиа. Маленький груз не считаем как целый контейнер.', 'Enter weight (and volume if you know it) and press Calculate: price and transit time for truck, rail, sea and air. Small cargo is never priced as a full container.', '输入重量（如知道也填体积），点“计算”：显示公路、铁路、海运和空运的价格和时效。小货不按整箱计算。', 'Ağırlığı (biliyorsanız hacmi) girip Hesapla’ya basın: kara, demiryolu, deniz ve hava için fiyat ve süre. Küçük yük tam konteyner gibi fiyatlanmaz.'] },
    { sel: '.v3-doccard', t: ['Есть инвойс? Пришлите', 'Have an invoice? Send it', '有发票？直接上传', 'Faturanız mı var? Gönderin'],
      p: ['Загрузите инвойс и упаковочный лист — сами достанем товары, вес, габариты и количество мест. Код ТН ВЭД подберёт менеджер и посчитает доставку под ключ.', 'Upload the invoice and packing list — we extract goods, weight, dimensions and pieces. A manager picks the HS code and quotes door-to-door.', '上传发票和装箱单——我们自动提取货物、重量、尺寸和件数。经理选定海关编码并给出门到门报价。', 'Fatura ve çeki listesini yükleyin — ürünleri, ağırlığı, ölçüleri ve koli sayısını biz çıkarırız. GTİP kodunu yönetici seçer ve kapıdan kapıya fiyat verir.'] },
    { sel: '.v3-track', t: ['Где мой груз', 'Where is my cargo', '我的货在哪', 'Yüküm nerede'],
      p: ['После входа видно каждый этап: склад в Китае, граница, город в России, таможня и доставка до вашего адреса. Сообщения приходят и в Telegram.', 'After signing in you see every stage: China warehouse, border, city in Russia, customs and delivery to your address. Updates also come to Telegram.', '登录后可看到每个环节：中国仓库、边境、俄罗斯城市、清关和送货上门。通知也会发到 Telegram。', 'Giriş yaptıktan sonra her aşamayı görürsünüz: Çin deposu, sınır, Rusya’daki şehir, gümrük ve adresinize teslimat. Bildirimler Telegram’a da gelir.'] },
    { sel: '.v3-cur', t: ['Курс ЦБ и его динамика', 'Central Bank rates and trends', '央行汇率及走势', 'Merkez Bankası kurları ve seyri'],
      p: ['Курс на любую дату — нажмите на дату. А чтобы посмотреть, как менялся юань, доллар или евро, — нажмите на валюту.', 'Rates on any date — tap the date. To see how the yuan, dollar or euro changed — tap the currency.', '点日期可查任意一天的汇率；点货币可查看人民币、美元或欧元的走势。', 'Herhangi bir tarihin kuru için tarihe, yuan, dolar veya euronun seyri için para birimine dokunun.'] },
    { sel: '.v3-guide', t: ['Гид по доставке', 'Shipping guide', '运输指南', 'Taşıma rehberi'],
      p: ['Коротко и по делу: какой маршрут выбрать сейчас, где очереди на границе и какие нужны документы.', 'Short and practical: which route to choose now, where the border queues are and which documents you need.', '简明实用：现在该选哪条路线、哪个口岸排队、需要哪些单证。', 'Kısa ve net: şimdi hangi güzergâh, sınırda nerede kuyruk var ve hangi belgeler gerekir.'] },
    { sel: '.v3-loginbtn', t: ['Личный кабинет', 'Your account', '个人账户', 'Hesabınız'],
      p: ['Создайте кабинет за минуту — там ваши грузы, КП и документы. Или просто оставьте заявку: менеджер пришлёт точную ставку.', 'Create an account in a minute — your shipments, offers and documents in one place. Or just leave a request: a manager will send the exact rate.', '一分钟注册账户——货物、报价和单证集中查看。也可以直接留下询价，经理会发来准确运价。', 'Bir dakikada hesap açın — yükleriniz, teklifleriniz ve belgeleriniz tek yerde. Ya da talep bırakın: yönetici kesin fiyatı gönderir.'] },
  ];
  var CLIENT = [
    { t: ['Ваш кабинет готов', 'Your account is ready', '您的账户已就绪', 'Hesabınız hazır'],
      p: ['Коротко о главном: где смотреть грузы, как считать новые перевозки и куда приходят уведомления.', 'The essentials: where to see shipments, how to quote new ones and where notifications arrive.', '要点：在哪里查看货物、如何计算新运输、通知发到哪里。', 'Özetle: yükler nerede, yeni taşımalar nasıl hesaplanır, bildirimler nereye gelir.'] },
    { sel: '.v3-nav [data-open-view=cabinetView]', alt: '.v3-track', t: ['Мои грузы', 'My shipments', '我的货物', 'Yüklerim'],
      p: ['Здесь все ваши перевозки: на полосе видно, где груз сейчас — от склада в Китае до вашего адреса. Там же расходы, документы и КП.', 'All your shipments: the strip shows where the cargo is now — from the China warehouse to your address. Costs, documents and offers are there too.', '这里是您的全部运输：进度条显示货物当前位置——从中国仓库到您的地址。费用、单证和报价也在这里。', 'Tüm taşımalarınız: şerit yükün şu an nerede olduğunu gösterir — Çin deposundan adresinize. Masraflar, belgeler ve teklifler de burada.'] },
    { sel: '#mcStage', t: ['Новый расчёт — на карте', 'New quote — on the map', '新报价——在地图上', 'Yeni hesap — haritada'],
      p: ['Выберите города на карте и укажите вес. Расчёт сохранится в «Мои КП».', 'Pick cities on the map and enter weight. The quote is saved to “My offers”.', '在地图上选城市并输入重量，报价会保存到“我的报价”。', 'Haritadan şehirleri seçip ağırlığı girin. Hesap “Tekliflerim”e kaydedilir.'] },
    { sel: '.v3-acc', t: ['Уведомления в Telegram', 'Telegram notifications', 'Telegram 通知', 'Telegram bildirimleri'],
      p: ['В аккаунте подключите Telegram — о каждом этапе перевозки придёт сообщение.', 'Connect Telegram in your account — you’ll get a message at every stage.', '在账户中连接 Telegram——每个运输环节都会收到消息。', 'Hesabınızda Telegram’ı bağlayın — her aşamada mesaj alırsınız.'] },
  ];
  var BTN = { skip: ['Пропустить', 'Skip', '跳过', 'Atla'], next: ['Далее', 'Next', '下一步', 'İleri'], back: ['Назад', 'Back', '上一步', 'Geri'], start: ['Покажите', 'Show me', '开始', 'Göster'], done: ['Понятно', 'Got it', '明白了', 'Anladım'], of: ['из', 'of', '/', '/'] };

  var steps = [], i = 0, ov = null, hole = null, card = null, key = '';
  function visible(sel) { if (!sel) return null; var e = $(sel); if (!e) return null; var r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden' ? e : null; }
  function build() {
    ov = document.createElement('div'); ov.className = 'tour'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-live', 'polite');
    ov.innerHTML = '<div class="tour-hole"></div><div class="tour-card"><span class="tour-n"></span><b class="tour-t"></b><p class="tour-p"></p><div class="tour-btns"><button type="button" class="tour-skip"></button><span></span><button type="button" class="tour-back"></button><button type="button" class="tour-next calculate"></button></div></div>';
    document.body.appendChild(ov); hole = $('.tour-hole', ov); card = $('.tour-card', ov);
    $('.tour-skip', ov).onclick = finish; $('.tour-back', ov).onclick = function () { go(i - 1, -1); }; $('.tour-next', ov).onclick = function () { if (i >= steps.length - 1) finish(); else go(i + 1, 1); };
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight') $('.tour-next', ov).click(); if (e.key === 'ArrowLeft' && i > 0) go(i - 1, -1); });
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
  }
  function go(n, dir) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    var st = steps[i]; st.el = visible(st.sel) || visible(st.alt);
    if (st.sel && !st.el) { if (i + (dir || 1) >= 0 && i + (dir || 1) < steps.length) return go(i + (dir || 1), dir); }
    $('.tour-n', ov).textContent = (i + 1) + ' ' + T(BTN.of) + ' ' + steps.length;
    $('.tour-t', ov).textContent = T(st.t); $('.tour-p', ov).textContent = T(st.p);
    $('.tour-skip', ov).textContent = T(BTN.skip); $('.tour-back', ov).textContent = T(BTN.back);
    $('.tour-back', ov).hidden = i === 0; $('.tour-skip', ov).hidden = i === steps.length - 1;
    $('.tour-next', ov).textContent = i === 0 ? T(BTN.start) : i === steps.length - 1 ? T(BTN.done) : T(BTN.next);
    ov.classList.toggle('center', !st.el);
    if (st.el) { var r = st.el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 40) st.el.scrollIntoView({ block: r.height > innerHeight * .6 ? 'start' : 'center', behavior: 'smooth' }); }
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    place(); setTimeout(place, 350); setTimeout(place, 700);
    setTimeout(function () { $('.tour-next', ov).focus({ preventScroll: true }); }, 60);
  }
  function place() {
    if (!ov || !ov.parentNode) return; var st = steps[i]; if (!st) return;
    if (!st.el) { hole.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = ''; card.style.top = ''; return; }
    var r = st.el.getBoundingClientRect(), pad = 8, mob = innerWidth < 640;
    hole.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px';
    if (mob) { card.style.left = ''; card.style.top = ''; card.classList.toggle('top', r.top > innerHeight * .55); return; }
    var cw = card.offsetWidth, chh = card.offsetHeight, x, y;
    var below = innerHeight - r.bottom, above = r.top, right = innerWidth - r.right;
    if (below > chh + 24) { y = r.bottom + 16; x = r.left + r.width / 2 - cw / 2; }
    else if (above > chh + 24) { y = r.top - chh - 16; x = r.left + r.width / 2 - cw / 2; }
    else if (right > cw + 24) { x = r.right + 16; y = r.top + r.height / 2 - chh / 2; }
    else { x = r.left - cw - 16; y = r.top + r.height / 2 - chh / 2; if (x < 12) { x = innerWidth / 2 - cw / 2; y = innerHeight - chh - 24; } }
    card.style.left = Math.max(12, Math.min(innerWidth - cw - 12, x)) + 'px'; card.style.top = Math.max(12, Math.min(innerHeight - chh - 12, y)) + 'px';
  }
  function start(list, k) {
    if (ov && ov.parentNode) return;
    steps = list.map(function (s) { return Object.assign({}, s); }); key = k || ''; build();
    document.body.classList.add('tour-on'); go(0, 1);
  }
  function finish() { if (key) set(key, '1'); if (ov) { ov.remove(); ov = null; } document.body.classList.remove('tour-on'); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); }
  function role() { return window.__v3role || (document.body.className.match(/role-(\w+)/) || [])[1] || ''; }
  window.IOMA_TOUR = { start: function () { start(role() === 'client' ? CLIENT : GUEST, ''); }, guest: function () { start(GUEST, ''); }, client: function () { start(CLIENT, ''); } };

  // ссылка «Как пользоваться сайтом» внизу главной
  function link() {
    var f = document.querySelector('.v3-foot > span:first-child'); if (!f || f.querySelector('.tour-link')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tour-link'; b.textContent = 'Как пользоваться сайтом'; b.onclick = function () { window.IOMA_TOUR.start(); }; f.appendChild(b);
  }
  // автоматически — один раз: гостю при первом визите, клиенту — при первом входе
  function auto() {
    var r = role(); if (!r) return setTimeout(auto, 200);
    if (r === 'admin') return;
    if (navigator.webdriver && !/[?&]tour=1/.test(location.search)) return; // автопроверки сайта
    var k = r === 'client' ? 'iomaTourClientDone' : 'iomaTourDone';
    if (get(k) || (r === 'guest' && get('iomaTourDone'))) return;
    setTimeout(function () {
      if (document.body.classList.contains('view-open') || document.querySelector('.rd-ov:not([hidden]),#v3ask:not([hidden])')) { set(k, '1'); return; }
      start(r === 'client' ? CLIENT : GUEST, k); if (r === 'client') set('iomaTourDone', '1');
    }, 1600);
  }
  function boot() { link(); auto(); }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
