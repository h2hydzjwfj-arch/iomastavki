/* IOMASTAVKA — готовые переводы интерфейса (RU → EN / 中文 / TR / DE / FR).
   Тексты написаны заранее, а не переводятся «на лету». Работает вместе с переводами app.js:
   всё, что не покрыто там, переводится здесь по точному совпадению русской фразы. */
(function () {
  'use strict';
  // RU: [EN, ZH, TR]; немецкий и французский добавляются из i18n-more.js (IOMA_DICT_DF, IOMA_DICT_MORE)
  var D = {

    // --- v4: карта-калькулятор, трекинг, динамика курса, экскурсия
    'Расчёт ставок на карте': ['Rates on the map', '在地图上计算运价', 'Haritada fiyat hesabı'],
    'КИТАЙ → РОССИЯ': ['CHINA → RUSSIA', '中国 → 俄罗斯', 'ÇİN → RUSYA'],
    'Объём, м³': ['Volume, m³', '体积，立方米', 'Hacim, m³'],
    'Нажмите на карте город отправки — в Китае или Корее': ['Tap a city of origin on the map — in China or Korea', '在地图上点选起运城市——中国或韩国', 'Haritada çıkış şehrine dokunun — Çin veya Kore'],
    'Теперь — город доставки в России или Казахстане': ['Now a destination in Russia or Kazakhstan', '再选俄罗斯或哈萨克斯坦的目的城市', 'Şimdi Rusya veya Kazakistan’da varış şehri'],
    'Укажите вес груза и нажмите «Рассчитать»': ['Enter the weight and press “Calculate”', '输入重量并点“计算”', 'Ağırlığı girip “Hesapla”ya basın'],
    'Нажмите на вариант — покажем его путь на карте': ['Tap an option to see its route on the map', '点选方案——在地图上显示路线', 'Güzergâhı görmek için bir seçeneğe dokunun'],
    'Всё готово — нажмите «Рассчитать»': ['All set — press “Calculate”', '准备就绪——点“计算”', 'Hazır — “Hesapla”ya basın'],
    'Склад в Китае': ['China warehouse', '中国仓库', 'Çin deposu'], 'По Китаю': ['Across China', '中国境内', 'Çin içinde'], 'Порт отправки': ['Port of loading', '起运港', 'Yükleme limanı'],
    'Море': ['Sea', '海运', 'Deniz'], 'Аэропорт вылета': ['Departure airport', '起飞机场', 'Kalkış havalimanı'], 'Перелёт': ['Flight', '航班', 'Uçuş'],
    'Граница': ['Border', '边境', 'Sınır'], 'Порт прибытия': ['Port of arrival', '到达港', 'Varış limanı'], 'Аэропорт прилёта': ['Arrival airport', '到达机场', 'Varış havalimanı'],
    'По России': ['Across Russia', '俄罗斯境内', 'Rusya içinde'], 'Таможня': ['Customs', '清关', 'Gümrük'], 'Доставка': ['Delivery', '派送', 'Teslimat'], 'Доставлен': ['Delivered', '已送达', 'Teslim edildi'],
    'Граница и таможня': ['Border and customs', '边境及清关', 'Sınır ve gümrük'], 'Порт прибытия и таможня': ['Port of arrival and customs', '到达港及清关', 'Varış limanı ve gümrük'], 'Аэропорт прилёта и таможня': ['Arrival airport and customs', '到达机场及清关', 'Varış havalimanı ve gümrük'],
    'На складе в Китае': ['At the China warehouse', '在中国仓库', 'Çin deposunda'], 'В пути по Китаю': ['In transit across China', '中国境内运输中', 'Çin içinde yolda'], 'В порту отправки': ['At the port of loading', '在起运港', 'Yükleme limanında'],
    'В море': ['At sea', '海上运输中', 'Denizde'], 'В аэропорту вылета': ['At the departure airport', '在起飞机场', 'Kalkış havalimanında'], 'В полёте': ['In flight', '飞行中', 'Uçuşta'],
    'На границе': ['At the border', '在边境', 'Sınırda'], 'В порту прибытия': ['At the port of arrival', '在到达港', 'Varış limanında'], 'В аэропорту прилёта': ['At the arrival airport', '在到达机场', 'Varış havalimanında'],
    'В пути по России': ['In transit across Russia', '俄罗斯境内运输中', 'Rusya içinde yolda'], 'На таможне': ['At customs', '清关中', 'Gümrükte'], 'Везём к вам': ['On the way to you', '正在派送给您', 'Size getiriyoruz'],
    'Оформлен, ждём забора у поставщика': ['Booked, awaiting pickup from the supplier', '已下单，等待从供应商提货', 'Kayıtlı, tedarikçiden alım bekleniyor'],
    'Сообщения по грузу': ['Shipment updates', '货物动态', 'Gönderi güncellemeleri'], 'Сообщений пока нет': ['No updates yet', '暂无动态', 'Henüz güncelleme yok'],
    'Все грузы →': ['All shipments →', '全部货物 →', 'Tüm yükler →'], 'Курс ЦБ': ['Central Bank rate', '央行汇率', 'Merkez Bankası kuru'],
    'Динамика курса →': ['Rate history →', '汇率走势 →', 'Kur geçmişi →'], 'Динамика курса': ['Rate history', '汇率走势', 'Kur geçmişi'],
    'Динамика курса ЦБ РФ': ['Bank of Russia rate history', '俄罗斯央行汇率走势', 'Rusya Merkez Bankası kur geçmişi'],
    'Официальный курс Банка России по дням — выберите валюту и период.': ['Official Bank of Russia rate by day — choose a currency and period.', '俄罗斯央行每日官方汇率——请选择货币和期间。', 'Rusya Merkez Bankası’nın günlük resmi kuru — para birimi ve dönem seçin.'],
    'Юань': ['Yuan', '人民币', 'Yuan'], 'Доллар': ['Dollar', '美元', 'Dolar'], 'Евро': ['Euro', '欧元', 'Euro'], 'Тенге': ['Tenge', '坚戈', 'Tenge'], 'Вона': ['Won', '韩元', 'Won'],
    'Неделя': ['Week', '一周', 'Hafta'], 'Месяц': ['Month', '一个月', 'Ay'], '3 месяца': ['3 months', '3个月', '3 ay'], 'Полгода': ['6 months', '半年', '6 ay'], 'Год': ['Year', '一年', 'Yıl'], '5 лет': ['5 years', '5年', '5 yıl'], 'Свои даты': ['Custom dates', '自定义日期', 'Özel tarihler'],
    'Изменение': ['Change', '变化', 'Değişim'], 'Минимум': ['Low', '最低', 'En düşük'], 'Максимум': ['High', '最高', 'En yüksek'], 'Загружаю курс…': ['Loading rates…', '正在加载汇率…', 'Kurlar yükleniyor…'],
    'Как пользоваться сайтом': ['How to use the site', '使用说明', 'Site nasıl kullanılır'],
    'Варианты для вашего груза': ['Options for your cargo', '适合您货物的方案', 'Yükünüz için seçenekler'],
    '@напр. 400': ['e.g. 400', '例如 400', 'örn. 400'], '@если знаете': ['if known', '如已知', 'biliyorsanız'], '@Масштаб карты': ['Map zoom', '地图缩放', 'Harita yakınlaştırma'],
    '@Приблизить': ['Zoom in', '放大', 'Yakınlaştır'], '@Отдалить': ['Zoom out', '缩小', 'Uzaklaştır'], '@Вся карта': ['Whole map', '全图', 'Tüm harita'], '@Выбор города': ['Choose a city', '选择城市', 'Şehir seçin'], '@Город': ['City', '城市', 'Şehir'],
    '@Показать динамику': ['Show history', '查看走势', 'Geçmişi göster'],
    // ТН ВЭД: поля проверки кода
    'необязательно': ['optional', '可选', 'isteğe bağlı'], 'Фрахт': ['Freight', '运费', 'Navlun'], 'в той же валюте': ['in the same currency', '同一币种', 'aynı para biriminde'],
    'Вес нетто, кг': ['Net weight, kg', '净重，公斤', 'Net ağırlık, kg'], 'Количество / площадь': ['Quantity / area', '数量 / 面积', 'Miktar / alan'],
    '@например 800 USD': ['e.g. 800 USD', '例如 800 USD', 'örn. 800 USD'], '@для пошлины и НДС': ['for duty and VAT', '用于计算关税和增值税', 'gümrük vergisi ve KDV için'],
    '@для ставок «€/кг»': ['for “€/kg” rates', '用于“欧元/公斤”税率', '“€/kg” oranları için'], '@пары, шт, л, м²': ['pairs, pcs, l, m²', '双、件、升、平方米', 'çift, adet, l, m²'],
    'Опасный груз': ['Dangerous goods', '危险品', 'Tehlikeli yük'],
    'аккумуляторы, жидкости, химия': ['batteries, liquids, chemicals', '电池、液体、化学品', 'piller, sıvılar, kimyasallar'],
    'ГИД ПО ДОСТАВКЕ': ['SHIPPING GUIDE', '运输指南', 'TAŞIMA REHBERİ'],
    'Какой маршрут выбрать сейчас': ['Which route to choose now', '现在该选哪条路线', 'Şimdi hangi güzergâh seçilmeli'],
    'Обстановка на погранпереходах, сроки и документы — коротко': ['Border crossings, transit times and documents — in brief', '口岸状况、时效和单证——简要说明', 'Sınır kapıları, süreler ve belgeler — kısaca'],
    'ЗАЯВКА ПО ДОКУМЕНТАМ': ['REQUEST BY DOCUMENTS', '凭单证询价', 'BELGEYLE TALEP'],
    'Загрузите инвойс и упаковочный лист': ['Upload the invoice and packing list', '上传发票和装箱单', 'Fatura ve çeki listesini yükleyin'],
    'Сами разберём документы и посчитаем доставку': ['We will read the documents and quote the delivery', '我们会解析单证并计算运费', 'Belgeleri biz okur, taşımayı hesaplarız'],
    'Прикрепите инвойс и упаковочный лист': ['Attach the invoice and packing list', '附上发票和装箱单', 'Faturayı ve çeki listesini ekleyin'],
    'PDF, Excel, Word или фото — до 6 файлов. Сами достанем поставщика, товары, цены, вес, габариты и количество мест.': ['PDF, Excel, Word or photos — up to 6 files. We will extract the supplier, goods, prices, weight, dimensions and number of packages.', 'PDF、Excel、Word 或照片——最多6个文件。我们会提取供应商、商品、价格、重量、尺寸和件数。', 'PDF, Excel, Word veya fotoğraf — en fazla 6 dosya. Tedarikçi, ürünler, fiyatlar, ağırlık, ölçüler ve koli sayısını biz çıkarırız.'],
    'Что мы поняли из документов': ['What we understood from the documents', '我们从单证中识别到的内容', 'Belgelerden anladıklarımız'],
    'Если что-то не так — менеджер уточнит при звонке.': ['If anything is off, the manager will clarify on the call.', '如有不符，经理会在电话中确认。', 'Bir hata varsa yöneticimiz görüşmede netleştirir.'],
    'Почта, с которой вы входите (администратор — admin)': ['Email you sign in with (administrator — admin)', '登录邮箱（管理员填 admin）', 'Giriş e-postanız (yönetici — admin)'],
    'Разбираем документы…': ['Reading the documents…', '正在解析单证…', 'Belgeler okunuyor…'],
    'Гид по доставке': ['Shipping guide', '运输指南', 'Taşıma rehberi'],
    'Как сейчас везти из Китая в Россию: обстановка на маршрутах, сроки, погранпереходы и документы.': ['How to ship from China to Russia right now: route conditions, transit times, border crossings and documents.', '当前如何从中国运往俄罗斯：路线状况、时效、口岸和单证。', 'Şu anda Çin’den Rusya’ya nasıl taşınır: güzergâh durumu, süreler, sınır kapıları ve belgeler.'],
    'сегодня': ['today', '今天', 'bugün'],
    'Курсы ЦБ РФ на выбранную дату · cbr.ru': ['Bank of Russia rates on the selected date · cbr.ru', '所选日期的俄罗斯央行汇率 · cbr.ru', 'Seçilen tarihteki Rusya Merkez Bankası kurları · cbr.ru'],
    'Выбрать дату': ['Pick a date', '选择日期', 'Tarih seç'],
    'Курс на дату': ['Rate on date', '指定日期汇率', 'Tarihteki kur'],
    'Ваши грузы, расчёты и КП — в одном кабинете.': ['Your shipments, quotes and offers — in one account.', '您的货物、运价计算和报价——尽在一个账户。', 'Gönderileriniz, hesaplarınız ve teklifleriniz — tek hesapta.'],
    'Почта или логин': ['Email or login', '邮箱或登录名', 'E-posta veya kullanıcı adı'],
    'почта или admin': ['email or admin', '邮箱或 admin', 'e-posta veya admin'],
    'Нет кабинета?': ['No account?', '还没有账户？', 'Hesabınız yok mu?'],
    'Создать за минуту': ['Create one in a minute', '一分钟创建', 'Bir dakikada oluşturun'],
    'Новый кабинет': ['New account', '新建账户', 'Yeni hesap'],
    'Сохраняйте расчёты и КП, следите за грузами, получайте статусы в Telegram.': ['Save quotes and offers, track shipments and get status updates in Telegram.', '保存运价与报价，跟踪货物，并在 Telegram 接收状态通知。', 'Hesapları ve teklifleri kaydedin, gönderileri izleyin, durum bildirimlerini Telegram’dan alın.'],
    'Имя *': ['Name *', '姓名 *', 'Ad *'],
    'Почта *': ['Email *', '邮箱 *', 'E-posta *'],
    'Телефон или Telegram': ['Phone or Telegram', '电话或 Telegram', 'Telefon veya Telegram'],
    'Пароль * (от 8 символов)': ['Password * (8+ characters)', '密码 *（至少8位）', 'Şifre * (en az 8 karakter)'],
    'Создать кабинет': ['Create account', '创建账户', 'Hesap oluştur'],
    'У меня уже есть кабинет — войти': ['I already have an account — sign in', '我已有账户——登录', 'Zaten hesabım var — giriş yap'],
    'Показать пароль': ['Show password', '显示密码', 'Şifreyi göster'],
    'Скрыть пароль': ['Hide password', '隐藏密码', 'Şifreyi gizle'],
    'Сохранить изменения?': ['Save changes?', '保存更改？', 'Değişiklikler kaydedilsin mi?'],
    'Выйти без сохранения': ['Leave without saving', '不保存并退出', 'Kaydetmeden çık'],
    'Остаться': ['Stay', '留下', 'Kal'],
    'Сохранить черновик': ['Save draft', '保存草稿', 'Taslağı kaydet'],
    'Расчёт ещё не сохранён. Сохраните его — получите КП со ссылкой, к нему можно вернуться в любой момент.': ['This quote is not saved yet. Save it to get an offer with a link you can come back to anytime.', '运价尚未保存。保存后将获得带链接的报价，可随时查看。', 'Hesap henüz kaydedilmedi. Kaydedin — istediğiniz zaman dönebileceğiniz bağlantılı bir teklif alın.'],
    'Заявка не отправлена. Сохранить черновик? Он останется в форме, когда вы вернётесь.': ['Your request has not been sent. Save a draft? It will stay in the form when you come back.', '询价尚未发送。保存草稿？返回时表单中会保留。', 'Talebiniz gönderilmedi. Taslak kaydedilsin mi? Döndüğünüzde formda kalır.'],
    'Изменения в профиле не сохранены.': ['Profile changes are not saved.', '个人资料的更改尚未保存。', 'Profil değişiklikleri kaydedilmedi.'],
    'Кабинет ещё не создан — данные формы пропадут.': ['The account is not created yet — the form data will be lost.', '账户尚未创建——表单数据将丢失。', 'Hesap henüz oluşturulmadı — form verileri kaybolacak.'],
    'Черновик заявки сохранён': ['Request draft saved', '询价草稿已保存', 'Talep taslağı kaydedildi'],
    'Главная': ['Home', '首页', 'Ana sayfa'],
    'База знаний': ['Knowledge base', '知识库', 'Bilgi bankası'],
    'Маршруты Китай → Россия: что происходит сейчас, сроки, погранпереходы и документы.': ['China → Russia routes: the current situation, transit times, border crossings and documents.', '中国→俄罗斯路线：当前形势、时效、口岸和单证。', 'Çin → Rusya güzergâhları: güncel durum, süreler, sınır kapıları ve belgeler.'],
    'Мои грузы': ['My shipments', '我的货物', 'Gönderilerim'],
    'Расчёт ставок': ['Freight rates', '运价计算', 'Navlun hesabı'],
    'Расчёт ставки': ['Freight quote', '运价计算', 'Navlun hesabı'],
    'Работа': ['Workspace', '工作台', 'Çalışma alanı'],
    // группы меню «Глина и полночь»
    'Управление грузом': ['Cargo', '货物管理', 'Kargo yönetimi'],
    'Инструменты ВЭД': ['Trade tools', '外贸工具', 'Dış ticaret araçları'],
    // инструменты логиста
    'Отследить груз': ['Track cargo', '货物追踪', 'Kargo takibi'],
    'Контейнер, ЖД и авианакладная': ['Container, rail and air waybill', '集装箱、铁路和空运单', 'Konteyner, demiryolu ve hava konşimentosu'],
    'Влезет ли груз': ['Will it fit', '能否装下', 'Sığar mı'],
    '20′, 40′ HC, Open Top, Flat Rack, фура': ['20′, 40′ HC, Open Top, Flat Rack, truck', '20′、40′ HC、开顶箱、框架箱、货车', '20′, 40′ HC, Open Top, Flat Rack, tır'],
    'Объём груза': ['Cargo volume', '货物体积', 'Kargo hacmi'],
    'м³, плотность, объёмный вес': ['m³, density, volumetric weight', '立方米、密度、体积重量', 'm³, yoğunluk, hacimsel ağırlık'],
    'Терминальные в Шереметьево': ['Sheremetyevo terminal fees', '谢列梅捷沃货站费用', 'Şeremetyevo terminal ücretleri'],
    'Москва Карго и Шереметьево-Карго': ['Moscow Cargo and Sheremetyevo-Cargo', '莫斯科货运站和谢列梅捷沃货运站', 'Moscow Cargo ve Sheremetyevo-Cargo'],
    'Доставка по России': ['Delivery within Russia', '俄罗斯境内配送', 'Rusya içi teslimat'],
    'Сборный груз между городами': ['Groupage between cities', '城市间拼货', 'Şehirler arası parsiyel yük'],
    'Чей номер и который час': ['Whose number and local time', '号码归属与当地时间', 'Numara kimin ve saat kaç'],
    'Регион, время, можно ли звонить': ['Region, time, OK to call', '地区、时间、能否致电', 'Bölge, saat, aranabilir mi'],
    'Сумма прописью': ['Amount in words', '金额大写', 'Yazıyla tutar'],
    'Для договора, в нужном падеже': ['For contracts, in the right case', '用于合同', 'Sözleşmeler için'],
    'Сделки, задачи, КП и финансы': ['Deals, tasks, quotes and finance', '交易、任务、报价和财务', 'Anlaşmalar, görevler, teklifler ve finans'],
    'Статусы, маршрут и документы': ['Status, route and documents', '状态、路线和单据', 'Durum, güzergâh ve belgeler'],
    'Агенты и их ставки': ['Agents and their rates', '代理及其运价', 'Acenteler ve fiyatları'],
    'Обновить экспедиторов': ['Update forwarders', '更新货代', 'Nakliyecileri güncelle'],
    'Импорт агентов и тарифов': ['Import agents and tariffs', '导入代理和运价表', 'Acente ve tarife içe aktarma'],
    'Маршрут, груз и контакты — за минуту': ['Route, cargo and contacts in a minute', '一分钟填写路线、货物和联系方式', 'Güzergâh, yük ve iletişim — bir dakikada'],
    'Код товара: пошлина, НДС и сбор': ['Product code: duty, VAT and fee', '商品编码：关税、增值税和规费', 'Ürün kodu: gümrük vergisi, KDV ve harç'],
    'Таможня, санкции, ставки': ['Customs, sanctions, rates', '海关、制裁、运价', 'Gümrük, yaptırımlar, fiyatlar'],
    'Маршруты, сроки, документы': ['Routes, transit times, documents', '路线、时效、单据', 'Güzergâhlar, süreler, belgeler'],
    'Карта дня': ['Card of the day', '今日卡片', 'Günün kartı'],
    'Текстом или голосом': ['By text or voice', '文字或语音', 'Yazıyla ya da sesle'],
    'AI-ассистент': ['AI assistant', 'AI 助手', 'Yapay zekâ asistanı'],
    'Новости ВЭД': ['Trade news', '外贸新闻', 'Dış ticaret haberleri'],
    'Экспедиторы': ['Forwarders', '货代', 'Nakliyeciler'],
    'ТН ВЭД': ['HS codes', '海关编码', 'GTİP kodları'],
    'Оставить заявку': ['Send a request', '提交需求', 'Talep gönder'],
    'Войти': ['Log in', '登录', 'Giriş'],
    'Выйти': ['Log out', '退出', 'Çıkış'],
    'КИТАЙ → РОССИЯ': ['CHINA → RUSSIA', '中国 → 俄罗斯', 'ÇİN → RUSYA'],
    'Авто': ['Truck', '公路', 'Karayolu'], 'ЖД': ['Rail', '铁路', 'Demiryolu'], 'Море': ['Sea', '海运', 'Deniz'], 'Авиа': ['Air', '空运', 'Hava'],
    'Море + ЖД': ['Sea + Rail', '海铁联运', 'Deniz + Demiryolu'],
    'Груз': ['Cargo', '货物', 'Yük'], 'укажите в расчёте': ['set in the calculator', '在计算中填写', 'hesaplamada belirtin'],
    'Маршрут': ['Route', '路线', 'Güzergâh'], 'Шанхай → Москва': ['Shanghai → Moscow', '上海 → 莫斯科', 'Şanghay → Moskova'],
    'Рассчитать': ['Calculate', '计算', 'Hesapla'], 'Запрашиваем ставки…': ['Requesting rates…', '正在查询运价…', 'Fiyatlar soruluyor…'],
    'Где мой груз': ['Where is my cargo', '我的货在哪', 'Yüküm nerede'],
    'Войдите — статус, маршрут, документы и расходы по каждому грузу': ['Log in to see status, route, documents and costs for each shipment', '登录查看每票货的状态、路线、单证和费用', 'Her gönderi için durum, güzergâh, belgeler ve maliyetleri görmek için giriş yapın'],
    'Статус, маршрут, документы и расходы': ['Status, route, documents and costs', '状态、路线、单证和费用', 'Durum, güzergâh, belgeler ve maliyetler'],
    'ВАЖНО К ПРОЧТЕНИЮ': ['MUST READ', '重要提示', 'MUTLAKA OKUYUN'],
    'Свежие новости ВЭД — таможня, право, логистика': ['Latest trade news — customs, law, logistics', '最新外贸新闻——海关、法规、物流', 'Son dış ticaret haberleri — gümrük, hukuk, lojistik'],
    'НОВОСТИ ВЭД': ['TRADE NEWS', '外贸新闻', 'DIŞ TİCARET HABERLERİ'],
    'Таможня, право, логистика': ['Customs, law, logistics', '海关、法规、物流', 'Gümrük, hukuk, lojistik'],
    'Главное за неделю — коротко': ['The week in brief', '本周要闻速览', 'Haftanın özeti'],
    'Заявки': ['Requests', '需求', 'Talepler'], 'Клиенты, грузы, документы': ['Clients, shipments, documents', '客户、货物、单证', 'Müşteriler, gönderiler, belgeler'],
    'Рассчитаем доставку': ["We'll quote your delivery", '我们为您计算运费', 'Teslimatınızı hesaplayalım'],
    'Обновлено только что': ['Updated just now', '刚刚更新', 'Az önce güncellendi'],
    'Курсы ЦБ РФ · данные обновляются автоматически': ['Bank of Russia rates · updated automatically', '俄罗斯央行汇率 · 自动更新', 'Rusya MB kurları · otomatik güncellenir'],
    'Маршрут, груз, вид транспорта — и сразу ставка по вашей базе': ['Route, cargo and transport mode — get a rate from the database at once', '路线、货物、运输方式——立即从数据库获得运价', 'Güzergâh, yük ve taşıma türü — veritabanından anında fiyat'],
    'Параметры': ['Parameters', '参数', 'Parametreler'],
    'Габариты, расстояние и условия поставки': ['Dimensions, distance and Incoterms', '尺寸、距离和贸易条款', 'Ölçüler, mesafe ve teslim şartları'],
    'мм': ['mm', '毫米', 'mm'], 'см': ['cm', '厘米', 'cm'], 'м': ['m', '米', 'm'],
    '＋ Загрузить КП / ставку': ['＋ Upload a quote / rate', '＋ 上传报价', '＋ Teklif / fiyat yükle'],
    'СТАВКА': ['RATE', '运价', 'FİYAT'],
    'Заполните параметры и нажмите «Рассчитать» — ставка из вашей базы появится здесь': ['Fill in the parameters and press “Calculate” — the rate will appear here', '填写参数并点击“计算”——运价将显示在这里', 'Parametreleri doldurup “Hesapla”ya basın — fiyat burada görünecek'],
    'срок уточнить': ['transit time TBC', '时效待确认', 'süre teyit edilecek'], 'дней': ['days', '天', 'gün'],
    'Из чего складывается': ['Cost breakdown', '费用构成', 'Maliyet dağılımı'],
    'Ставка экспедитора': ['Forwarder rate', '货代运价', 'Nakliyeci fiyatı'], 'Комиссия перевозчика': ['Carrier commission', '承运人佣金', 'Taşıyıcı komisyonu'],
    'Комиссия перевозчика 5%': ['Carrier commission 5%', '承运人佣金 5%', 'Taşıyıcı komisyonu %5'],
    'Терминальные расходы': ['Terminal charges', '码头费用', 'Terminal masrafları'], 'уточнить': ['TBC', '待确认', 'teyit edilecek'], 'нет': ['none', '无', 'yok'],
    'Грузовой вес': ['Chargeable weight', '计费重量', 'Ücrete esas ağırlık'], 'Объём': ['Volume', '体积', 'Hacim'], 'Расстояние': ['Distance', '距离', 'Mesafe'], 'Ставка': ['Rate', '运价', 'Fiyat'], 'Срок': ['Transit', '时效', 'Süre'],
    'ОРИЕНТИРОВОЧНАЯ СТОИМОСТЬ': ['ESTIMATED COST', '预估费用', 'TAHMİNİ MALİYET'],
    'Получить точную ставку от менеджера →': ['Get an exact rate from a manager →', '向经理获取准确运价 →', 'Yöneticiden kesin fiyat alın →'],
    'Оставить заявку — посчитаем вручную →': ['Send a request — we will calculate manually →', '提交需求——我们人工计算 →', 'Talep gönderin — elle hesaplayalım →'],
    'Сохранить расчёт — получить ссылку на КП': ['Save the quote — get a link', '保存报价——获取链接', 'Teklifi kaydet — bağlantı al'],
    'Создать КП (ссылка для клиента)': ['Create a quote (link for the client)', '生成报价（客户链接）', 'Teklif oluştur (müşteri bağlantısı)'],
    'Открыть КП': ['Open quote', '打开报价', 'Teklifi aç'], 'Ссылка': ['Link', '链接', 'Bağlantı'],
    'Все': ['All', '全部', 'Tümü'], 'Загрузить КП': ['Upload a quote', '上传报价', 'Teklif yükle'],
    'PDF, Excel или текст письма — ставки разберутся автоматически': ['PDF, Excel or e-mail text — rates are parsed automatically', 'PDF、Excel或邮件正文——自动识别运价', 'PDF, Excel veya e-posta metni — fiyatlar otomatik ayrıştırılır'],
    'Проверь код 7616991008': ['Check code 7616991008', '查询编码 7616991008', '7616991008 kodunu kontrol et'],
    'Что нового по ЭТРН?': ["What's new on e-waybills (ETRN)?", '电子运单（ETRN）有什么新变化？', 'E-irsaliye (ETRN) ile ilgili yenilikler?'],
    'Рассчитай ЖД Шанхай → Москва': ['Quote rail Shanghai → Moscow', '计算上海→莫斯科铁路运价', 'Şanghay → Moskova demiryolu hesapla'],
    'Важные': ['Important', '重要', 'Önemli'], 'Таможня': ['Customs', '海关', 'Gümrük'], 'Логистика': ['Logistics', '物流', 'Lojistik'], 'Право': ['Law', '法规', 'Hukuk'],
    'Вход': ['Log in', '登录', 'Giriş'],
    'Для клиентов — отслеживание грузов. Доступ выдаёт ваш менеджер.': ['For clients — shipment tracking. Your manager provides access.', '客户货物跟踪。账号由您的经理开通。', 'Müşteriler için gönderi takibi. Erişimi yöneticiniz verir.'],
    'Почта': ['E-mail', '邮箱', 'E-posta'], 'Пароль': ['Password', '密码', 'Şifre'],
    'Запомнить меня на этом устройстве': ['Remember me on this device', '在此设备上记住我', 'Bu cihazda beni hatırla'],
    'Забыли пароль?': ['Forgot password?', '忘记密码？', 'Şifrenizi mi unuttunuz?'], 'Нет доступа?': ['No access?', '没有账号？', 'Erişiminiz yok mu?'],
    'Оставьте заявку': ['Send a request', '提交需求', 'Talep gönderin'], '— менеджер свяжется с вами.': ['— a manager will contact you.', '——经理会联系您。', '— bir yönetici sizinle iletişime geçecek.'],
    'Восстановление пароля': ['Password recovery', '找回密码', 'Şifre kurtarma'], 'Почта, с которой вы входите': ['The e-mail you log in with', '您登录使用的邮箱', 'Giriş yaptığınız e-posta'],
    'Прислать ссылку': ['Send link', '发送链接', 'Bağlantı gönder'], '← Вернуться ко входу': ['← Back to login', '← 返回登录', '← Girişe dön'],
    'Новый пароль': ['New password', '新密码', 'Yeni şifre'], 'Придумайте пароль от 8 символов.': ['Choose a password of at least 8 characters.', '请设置至少8位的密码。', 'En az 8 karakterlik bir şifre belirleyin.'],
    'Сохранить пароль': ['Save password', '保存密码', 'Şifreyi kaydet'], 'Аккаунт': ['Account', '账户', 'Hesap'], 'Профиль, пароль и уведомления.': ['Profile, password and notifications.', '个人资料、密码和通知。', 'Profil, şifre ve bildirimler.'],
    'Заявка на перевозку': ['Shipping request', '运输需求', 'Taşıma talebi'],
    'Оставьте контакты и пару слов о грузе — менеджер уточнит детали и пришлёт точную ставку.': ['Leave your contacts and a few words about the cargo — a manager will clarify details and send an exact rate.', '留下联系方式并简述货物——经理会确认细节并发送准确运价。', 'İletişim bilgilerinizi ve yük hakkında birkaç kelime bırakın — yönetici ayrıntıları netleştirip kesin fiyat gönderecek.'],
    'Как вас зовут *': ['Your name *', '您的姓名 *', 'Adınız *'], 'Телефон или Telegram *': ['Phone or Telegram *', '电话或 Telegram *', 'Telefon veya Telegram *'],
    'Откуда': ['From', '起运地', 'Nereden'], 'Куда': ['To', '目的地', 'Nereye'], 'Что везём': ['What are we shipping', '货物品名', 'Ne taşınıyor'],
    'Вес, кг': ['Weight, kg', '重量，公斤', 'Ağırlık, kg'], 'Объём, м³': ['Volume, m³', '体积，立方米', 'Hacim, m³'], 'Комментарий': ['Comment', '备注', 'Yorum'], 'Сайт': ['Website', '网站', 'Web sitesi'],
    'Согласен на обработку персональных данных для ответа на заявку': ['I agree to the processing of my personal data to answer this request', '我同意为回复需求处理我的个人数据', 'Talebe yanıt verilmesi için kişisel verilerimin işlenmesini kabul ediyorum'],
    'Отправить заявку': ['Send request', '提交需求', 'Talebi gönder'], 'Заявка отправлена': ['Request sent', '需求已提交', 'Talep gönderildi'],
    'Менеджер свяжется с вами в ближайшее рабочее время.': ['A manager will contact you during the next business hours.', '经理将在最近的工作时间联系您。', 'Yönetici en yakın mesai saatinde sizinle iletişime geçecek.'], 'Готово': ['Done', '完成', 'Tamam'],
    'Статус, маршрут, расходы и документы — в одном месте.': ['Status, route, costs and documents — all in one place.', '状态、路线、费用和单证——一目了然。', 'Durum, güzergâh, maliyetler ve belgeler — tek yerde.'],
    'Грузы': ['Shipments', '货物', 'Gönderiler'], 'Мои КП': ['My quotes', '我的报价', 'Tekliflerim'], 'Заявки с сайта, клиенты и их грузы.': ['Website requests, clients and their shipments.', '网站需求、客户及其货物。', 'Site talepleri, müşteriler ve gönderileri.'],
    'Клиенты': ['Clients', '客户', 'Müşteriler'], 'КП': ['Quotes', '报价', 'Teklifler'],
    'Оформлен': ['Registered', '已登记', 'Kaydedildi'], 'Забран у поставщика': ['Picked up from supplier', '已从供应商提货', 'Tedarikçiden alındı'], 'В пути': ['In transit', '运输中', 'Yolda'],
    'На границе': ['At the border', '在口岸', 'Sınırda'], 'Доставка по РФ': ['Delivery in Russia', '俄罗斯境内派送', 'Rusya içi teslimat'], 'Доставлен': ['Delivered', '已送达', 'Teslim edildi'],
    'Вес': ['Weight', '重量', 'Ağırlık'], 'Мест': ['Pieces', '件数', 'Koli'], 'Габариты': ['Dimensions', '尺寸', 'Ölçüler'],
    'Сколько и за что': ['What you pay for', '费用明细', 'Neye ne ödüyorsunuz'], 'Итого:': ['Total:', '合计：', 'Toplam:'], 'Документы': ['Documents', '单证', 'Belgeler'],
    'Документов пока нет': ['No documents yet', '暂无单证', 'Henüz belge yok'], 'Расходы появятся после расчёта': ['Costs will appear after calculation', '计算后显示费用', 'Maliyetler hesaplamadan sonra görünecek'],
    '＋ Загрузить документ': ['＋ Upload document', '＋ 上传单证', '＋ Belge yükle'], 'Обновить': ['Update', '更新', 'Güncelle'], 'Удалить': ['Delete', '删除', 'Sil'],
    'Пока нет грузов': ['No shipments yet', '暂无货物', 'Henüz gönderi yok'], 'Как только менеджер оформит перевозку, она появится здесь.': ['As soon as a manager books a shipment, it will appear here.', '经理办理运输后将显示在这里。', 'Yönetici gönderiyi kaydeder kaydetmez burada görünecek.'],
    'Пока нет КП': ['No quotes yet', '暂无报价', 'Henüz teklif yok'], 'Посчитайте ставку — КП сохранится здесь автоматически.': ['Calculate a rate — the quote will be saved here automatically.', '计算运价——报价会自动保存在这里。', 'Fiyat hesaplayın — teklif otomatik olarak burada saklanır.'], 'Рассчитать ставку': ['Calculate a rate', '计算运价', 'Fiyat hesapla'],
    'Профиль': ['Profile', '个人资料', 'Profil'], 'Имя': ['Name', '姓名', 'Ad'], 'Телефон': ['Phone', '电话', 'Telefon'], 'Почта (логин для входа)': ['E-mail (login)', '邮箱（登录名）', 'E-posta (giriş)'],
    'Текущий пароль — нужен для смены почты': ['Current password — required to change e-mail', '当前密码——更改邮箱时需要', 'Mevcut şifre — e-posta değişikliği için gerekli'],
    'Сохранить': ['Save', '保存', 'Kaydet'], 'Уведомления': ['Notifications', '通知', 'Bildirimler'],
    'Сюда придут ваши КП, смена статуса груза и новые документы.': ['Your quotes, shipment status changes and new documents will arrive here.', '您的报价、货物状态变更和新单证将发送到这里。', 'Teklifleriniz, durum değişiklikleri ve yeni belgeler buraya gelecek.'],
    'Подключить Telegram': ['Connect Telegram', '绑定 Telegram', 'Telegram’ı bağla'], 'подключён': ['connected', '已绑定', 'bağlı'], 'Отключить': ['Disconnect', '解绑', 'Bağlantıyı kes'],
    '✈️ Telegram': ['✈️ Telegram', '✈️ Telegram', '✈️ Telegram'], '✉️ Почта': ['✉️ E-mail', '✉️ 邮箱', '✉️ E-posta'],
    'бот ещё не подключён менеджером': ['the manager has not connected the bot yet', '经理尚未接入机器人', 'yönetici botu henüz bağlamadı'], 'отправка писем пока не настроена': ['e-mail sending is not set up yet', '尚未配置邮件发送', 'e-posta gönderimi henüz ayarlanmadı'],
    'Сменить пароль': ['Change password', '修改密码', 'Şifreyi değiştir'], 'Текущий пароль': ['Current password', '当前密码', 'Mevcut şifre'], 'Новый пароль (от 8 символов)': ['New password (8+ characters)', '新密码（至少8位）', 'Yeni şifre (en az 8 karakter)'],
    'Пароль изменён': ['Password changed', '密码已修改', 'Şifre değiştirildi'], 'Сохранено': ['Saved', '已保存', 'Kaydedildi'],
    'Новая': ['New', '新', 'Yeni'], 'В работе': ['In progress', '处理中', 'İşlemde'], 'Закрыта': ['Closed', '已关闭', 'Kapandı'], 'Спам': ['Spam', '垃圾', 'Spam'],
    'Сделать клиентом →': ['Make a client →', '设为客户 →', 'Müşteri yap →'], 'Новый груз': ['New shipment', '新货物', 'Yeni gönderi'], 'Клиент *': ['Client *', '客户 *', 'Müşteri *'], 'Номер': ['Number', '编号', 'Numara'],
    'Транспорт': ['Transport', '运输方式', 'Taşıma'], 'Прибытие (ETA)': ['Arrival (ETA)', '到达（ETA）', 'Varış (ETA)'], 'Создать груз': ['Create shipment', '创建货物', 'Gönderi oluştur'],
    'Расходы — по строке: «Фрахт; 2450; USD»': ['Costs — one per line: “Freight; 2450; USD”', '费用——每行一条：“运费; 2450; USD”', 'Maliyetler — satır başına: “Navlun; 2450; USD”'],
    'Новый клиент': ['New client', '新客户', 'Yeni müşteri'], 'Почта (логин) *': ['E-mail (login) *', '邮箱（登录名）*', 'E-posta (giriş) *'], 'Компания': ['Company', '公司', 'Şirket'], 'Создать доступ': ['Create access', '开通账号', 'Erişim oluştur'],
    'Новый пароль ': ['New password', '新密码', 'Yeni şifre'], 'Отключить доступ': ['Disable access', '停用账号', 'Erişimi kapat'], 'Включить доступ': ['Enable access', '启用账号', 'Erişimi aç'],
    'Состояние сайта': ['Site status', '网站状态', 'Site durumu'], '💾 Хранилище': ['💾 Storage', '💾 存储', '💾 Depolama'], '✈️ Заявки в Telegram': ['✈️ Requests to Telegram', '✈️ 需求推送 Telegram', '✈️ Talepler Telegram’a'],
    '🤖 Бот для клиентов': ['🤖 Client bot', '🤖 客户机器人', '🤖 Müşteri botu'], '✉️ Письма': ['✉️ E-mails', '✉️ 邮件', '✉️ E-postalar'], 'готов': ['ready', '就绪', 'hazır'], 'включено': ['on', '已开启', 'açık'], 'включены': ['on', '已开启', 'açık'],
    'временное — подключите Supabase': ['temporary — connect Supabase', '临时——请接入 Supabase', 'geçici — Supabase bağlayın'], 'Supabase — данные сохраняются': ['Supabase — data is saved', 'Supabase——数据已保存', 'Supabase — veriler kaydediliyor'],
    'Проверить уведомления': ['Test notifications', '测试通知', 'Bildirimleri test et'], 'Отправляю…': ['Sending…', '发送中…', 'Gönderiliyor…'], 'Загружаю…': ['Loading…', '加载中…', 'Yükleniyor…'],
    'Коммерческое предложение': ['Commercial offer', '商业报价', 'Ticari teklif'], 'Логистика Китай → Россия': ['Logistics China → Russia', '中国 → 俄罗斯物流', 'Çin → Rusya lojistiği'],
    'Стоимость перевозки': ['Freight cost', '运费', 'Taşıma maliyeti'], 'Срок в пути': ['Transit time', '运输时效', 'Transit süresi'], 'Основа ставки': ['Rate basis', '计价基础', 'Fiyat esası'],
    'Условия поставки': ['Incoterms', '贸易条款', 'Teslim şartları'], 'Печать / PDF': ['Print / PDF', '打印 / PDF', 'Yazdır / PDF'], 'Скопировать ссылку': ['Copy link', '复制链接', 'Bağlantıyı kopyala'],
    'Подтвердить ставку у менеджера →': ['Confirm the rate with a manager →', '向经理确认运价 →', 'Fiyatı yöneticiyle teyit edin →'],
    'Ставка ориентировочная, рассчитана по базе предложений перевозчиков. Терминальные расходы в пункте прибытия, таможенные платежи и страхование уточняются отдельно.': ['The rate is indicative and based on carriers’ offers. Terminal charges at destination, customs duties and insurance are confirmed separately.', '运价为参考价，基于承运人报价。目的地码头费、关税和保险另行确认。', 'Fiyat tahminidir ve taşıyıcı tekliflerine dayanır. Varış terminal masrafları, gümrük vergileri ve sigorta ayrıca teyit edilir.'],
    'Ваши сохранённые расчёты': ['Your saved quotes', '您保存的报价', 'Kayıtlı teklifleriniz'],
    'Курсы ЦБ РФ': ['Bank of Russia rates', '俄罗斯央行汇率', 'Rusya MB kurları'],
    'ВАЖНО': ['IMPORTANT', '重要', 'ÖNEMLİ'],
    'контейнер': ['container', '集装箱', 'konteyner'], 'отправка': ['shipment', '整票', 'sevkiyat'], 'авто': ['truck', '公路', 'karayolu'], 'море': ['sea', '海运', 'deniz'], 'авиа': ['air', '空运', 'hava'],
    'Администратор': ['Administrator', '管理员', 'Yönetici'], 'Транспорт уточняется': ['Transport TBC', '运输方式待定', 'Taşıma teyit edilecek'],
    'Нужен для смены почты': ['Required to change e-mail', '更改邮箱时需要', 'E-posta değişikliği için gerekli'],
    // подсказки и подписи
    '@Инструменты': ['Tools', '工具', 'Araçlar'], '@Тёмная тема': ['Dark theme', '深色主题', 'Koyu tema'], '@Обновить экспедиторов': ['Update forwarders', '更新货代', 'Nakliyecileri güncelle'],
    '@Проверка ТН ВЭД': ['HS code check', '海关编码查询', 'GTİP kontrolü'], '@Разделы': ['Sections', '栏目', 'Bölümler'], '@Русский': ['Russian', '俄语', 'Rusça'], '@Сменить тему': ['Switch theme', '切换主题', 'Temayı değiştir'],
    '@Аккаунт': ['Account', '账户', 'Hesap'], '@Вид транспорта': ['Transport mode', '运输方式', 'Taşıma türü'], '@Пример кода': ['Code example', '编码示例', 'Kod örneği'], '@Единицы измерения': ['Units', '单位', 'Birimler'],
    '@Срок доставки': ['Transit time', '运输时效', 'Teslim süresi'], '@Быстрые вопросы': ['Quick questions', '快捷问题', 'Hızlı sorular'], '@Прикрепить файл': ['Attach file', '附加文件', 'Dosya ekle'], '@Микрофон': ['Microphone', '麦克风', 'Mikrofon'],
    '@Фильтр новостей': ['News filter', '新闻筛选', 'Haber filtresi'], '@+7… или @username': ['+7… or @username', '+7… 或 @username', '+7… veya @kullanıcı'], '@Город в Китае': ['City in China', '中国城市', 'Çin’de şehir'], '@Город в России': ['City in Russia', '俄罗斯城市', 'Rusya’da şehir'],
    '@Например: запчасти, 3 паллеты': ['E.g.: spare parts, 3 pallets', '例如：配件，3个托盘', 'Örn.: yedek parça, 3 palet'], '@Сроки, условия поставки, особенности груза': ['Deadlines, Incoterms, cargo specifics', '时限、贸易条款、货物特点', 'Süreler, teslim şartları, yük özellikleri'],
    '@Удалить документ': ['Delete document', '删除单证', 'Belgeyi sil'], '@Комментарий к статусу (видит клиент)': ['Status comment (visible to client)', '状态备注（客户可见）', 'Durum yorumu (müşteri görür)'], '@Прибытие': ['Arrival', '到达', 'Varış'],
    '@Почта для тестового письма (необязательно)': ['E-mail for a test message (optional)', '测试邮件地址（可选）', 'Test e-postası için adres (isteğe bağlı)'], '@Закрыть': ['Close', '关闭', 'Kapat'], '@авто': ['auto', '自动', 'otomatik'],
  };
  // Фразы с переменной частью: [EN, ZH, TR, DE, FR]
  var P = [
    [/^(На складе в Китае|В пути по Китаю|На границе|В порту прибытия|В аэропорту прилёта|В пути по России|На таможне): (.+)$/, ['$1: $2', '$1：$2', '$1: $2', '$1: $2', '$1 : $2']],
    [/^сейчас: (.+)$/, ['now: $1', '当前：$1', 'şu an: $1', 'jetzt: $1', 'actuellement : $1']],
    [/^Курс ЦБ на (.+)$/, ['Central Bank rate on $1', '$1 央行汇率', '$1 Merkez Bankası kuru', 'Kurs der Zentralbank am $1', 'Taux de la Banque centrale au $1']],
    [/^(.+), здесь ваши грузы: статус, маршрут, расходы и документы\.$/, ['$1, here are your shipments: status, route, costs and documents.', '$1，这里是您的货物：状态、路线、费用和单证。', '$1, gönderileriniz burada: durum, güzergâh, maliyetler ve belgeler.', '$1, hier sind Ihre Sendungen: Status, Route, Kosten und Dokumente.', '$1, voici vos envois : statut, itinéraire, coûts et documents.']],
    [/^(.+) · прибытие: (.+)$/, ['$1 · arrival: $2', '$1 · 到达：$2', '$1 · varış: $2', '$1 · Ankunft: $2', '$1 · arrivée : $2']],
    [/^Транспорт уточняется · прибытие: (.+)$/, ['Transport TBC · arrival: $1', '运输方式待定 · 到达：$1', 'Taşıma teyit edilecek · varış: $1', 'Transport wird geklärt · Ankunft: $1', 'Transport à confirmer · arrivée : $1']],
    [/^История \((\d+)\)$/, ['History ($1)', '记录（$1）', 'Geçmiş ($1)', 'Verlauf ($1)', 'Historique ($1)']],
    [/^· новых: (\d+)$/, ['· new: $1', '· 新：$1', '· yeni: $1', '· neu: $1', '· nouveaux : $1']],
    [/^Обновлено (\d+) мин назад$/, ['Updated $1 min ago', '$1 分钟前更新', '$1 dk önce güncellendi', 'Vor $1 Min. aktualisiert', 'Mis à jour il y a $1 min']],
    [/^от (\d\d\.\d\d\.\d{4})$/, ['of $1', '日期 $1', '$1 tarihli', 'vom $1', 'du $1']],
    [/^Действует до (.+)$/, ['Valid until $1', '有效期至 $1', '$1 tarihine kadar geçerli', 'Gültig bis $1', 'Valable jusqu’au $1']],
    [/^≈ ([\d\s ]+) ₽ по курсу ЦБ на сегодня$/, ['≈ $1 ₽ at today’s Bank of Russia rate', '≈ $1 ₽（按今日央行汇率）', '≈ $1 ₽ (bugünkü MB kuruyla)', '≈ $1 ₽ zum heutigen Kurs der Bank von Russland', '≈ $1 ₽ au taux du jour de la Banque de Russie']],
    [/^≈ ([\d\s ]+) ₽ по курсу ЦБ ([\d,.]+)$/, ['≈ $1 ₽ at Bank of Russia rate $2', '≈ $1 ₽（央行汇率 $2）', '≈ $1 ₽ (MB kuru $2)', '≈ $1 ₽ zum Kurs der Bank von Russland $2', '≈ $1 ₽ au taux de la Banque de Russie $2']],
    [/^(\d+) дн\.$/, ['$1 days', '$1 天', '$1 gün', '$1 Tage', '$1 jours']],
    [/^(\d+)\s?[–-]\s?(\d+) дн\.$/, ['$1–$2 days', '$1–$2 天', '$1–$2 gün', '$1–$2 Tage', '$1–$2 jours']],
    [/^(\d+)\s?[–-]\s?(\d+) дн\. · (быстрее|дешевле)$/, ['$1–$2 days · $3', '$1–$2 天 · $3', '$1–$2 gün · $3', '$1–$2 Tage · $3', '$1–$2 jours · $3']],
    [/^≈\s?(\d+) дн\.$/, ['≈ $1 days', '≈ $1 天', '≈ $1 gün', '≈ $1 Tage', '≈ $1 jours']],
    [/^(\d+)\s?[–-]\s?(\d+)\+? дн\.$/, ['$1–$2+ days', '$1–$2+ 天', '$1–$2+ gün', '$1–$2+ Tage', '$1–$2+ jours']],
    [/^(\d\d\.\d\d\.\d{4}) г\.$/, ['$1', '$1', '$1', '$1', '$1']],
    [/^([\d\s ,.]+) кг$/, ['$1 kg', '$1 公斤', '$1 kg', '$1 kg', '$1 kg']],
    [/^([\d\s ,.]+) т$/, ['$1 t', '$1 吨', '$1 t', '$1 t', '$1 t']],
    [/^([\d\s ,.]+) м³$/, ['$1 m³', '$1 立方米', '$1 m³', '$1 m³', '$1 m³']],
    [/^≈ ([\d\s ,.]+) км$/, ['≈ $1 km', '≈ $1 公里', '≈ $1 km', '≈ $1 km', '≈ $1 km']],
    [/^([\d\s ,.]+) км$/, ['$1 km', '$1 公里', '$1 km', '$1 km', '$1 km']],
    [/^([\d\s ]+) мест$/, ['$1 pcs', '$1 件', '$1 parça', '$1 Packstücke', '$1 colis']],
    [/^1 шт\. · (\d+) мест$/, ['1 unit · $1 pcs', '1 个 · $1 件', '1 adet · $1 parça', '1 Stk. · $1 Packstücke', '1 unité · $1 colis']],
    [/^(\d+) шт\. · (\d+) мест$/, ['$1 units · $2 pcs', '$1 个 · $2 件', '$1 adet · $2 parça', '$1 Stk. · $2 Packstücke', '$1 unités · $2 colis']],
    [/^к оплате ([\d\s ,.]+) кг · по объёму$/, ['chargeable $1 kg · by volume', '计费 $1 公斤 · 按体积', 'ücretli $1 kg · hacme göre', 'abgerechnet $1 kg · nach Volumen', 'facturé $1 kg · au volume']],
    [/^к оплате ([\d\s ,.]+) кг · по весу$/, ['chargeable $1 kg · by weight', '计费 $1 公斤 · 按重量', 'ücretli $1 kg · ağırlığa göre', 'abgerechnet $1 kg · nach Gewicht', 'facturé $1 kg · au poids']],
    [/^([+−–]) (.+)$/, ['$1 $2', '$1 $2', '$1 $2', '$1 $2', '$1 $2']],
    [/^· (.+)$/, ['· $1', '· $1', '· $1', '· $1', '· $1']],
    [/^через (.+)$/, ['via $1', '经$1', '$1 üzerinden', 'über $1', 'via $1']],
    [/^(\d+) фур[аы]?$/, ['$1 trucks', '$1 辆卡车', '$1 tır', '$1 Lkw', '$1 camions']],
    [/^([\d,.]+) м³\*$/, ['$1 m³*', '$1 立方米*', '$1 m³*', '$1 m³*', '$1 m³*']],
    [/^(\d+) \/ (\d+) готово$/, ['$1 / $2 ready', '$1 / $2 已完成', '$1 / $2 hazır', '$1 / $2 fertig', '$1 / $2 prêts']],
    [/^(.+) ↗$/, ['$1 ↗', '$1 ↗', '$1 ↗', '$1 ↗', '$1 ↗']],
    [/^НДС (\d+(?:[,.]\d+)?) %$/, ['VAT $1 %', '增值税 $1 %', 'KDV %$1', 'MwSt. $1 %', 'TVA $1 %']],
    [/^Код (\d+) не найден в справочнике ТН ВЭД ЕАЭС$/, ['Code $1 not found in the EAEU HS directory', '在欧亚经济联盟海关编码目录中未找到编码 $1', '$1 kodu EAEU GTİP rehberinde bulunamadı', 'Code $1 im Zolltarif der EAWU nicht gefunden', 'Code $1 introuvable dans la nomenclature douanière de l’UEE']],
    [/^Груз ([\d×,.\s]+) см выше, чем можно \(([\d\s,.]+) см\)(, даже если положить на бок)?$/, ['Cargo $1 cm is taller than allowed ($2 cm)$3', '货物 $1 厘米超高（限 $2 厘米）$3', '$1 cm yük izin verilenden yüksek ($2 cm)$3', 'Fracht $1 cm ist höher als zulässig ($2 cm)$3', 'Marchandise $1 cm plus haute que permis ($2 cm)$3']],
    [/^Груз ([\d×,.\s]+) см шире, чем можно \(([\d\s,.]+) см\)$/, ['Cargo $1 cm is wider than allowed ($2 cm)', '货物 $1 厘米超宽（限 $2 厘米）', '$1 cm yük izin verilenden geniş ($2 cm)', 'Fracht $1 cm ist breiter als zulässig ($2 cm)', 'Marchandise $1 cm plus large que permis ($2 cm)']],
    [/^Груз ([\d×,.\s]+) см длиннее, чем помещается \(([\d\s,.]+) см\)$/, ['Cargo $1 cm is longer than fits ($2 cm)', '货物 $1 厘米超长（限 $2 厘米）', '$1 cm yük sığandan uzun ($2 cm)', 'Fracht $1 cm ist länger als hineinpasst ($2 cm)', 'Marchandise $1 cm plus longue que l’espace ($2 cm)']],
    [/^Груз ([\d×,.\s]+) см не проходит в дверь \(проём ([\d×,.\s]+) см\)$/, ['Cargo $1 cm does not pass through the door (opening $2 cm)', '货物 $1 厘米无法通过箱门（门洞 $2 厘米）', '$1 cm yük kapıdan geçmez (açıklık $2 cm)', 'Fracht $1 cm passt nicht durch die Tür (Öffnung $2 cm)', 'Marchandise $1 cm ne passe pas par la porte (ouverture $2 cm)']],
    [/^, даже если положить на бок$/, [', even laid on its side', '，即使侧放也不行', ', yan yatırılsa bile', ', auch wenn gekippt', ', même couchée sur le côté']],
    [/^Позиция (\d+) \(([\d×,.\s]+)\): (.+)$/, ['Item $1 ($2): $3', '第 $1 项（$2）：$3', 'Kalem $1 ($2): $3', 'Position $1 ($2): $3', 'Ligne $1 ($2) : $3']],
    [/^выступает над бортом на ([\d\s,.]+) см — негабарит, нужна доплата и согласование$/, ['sticks out $1 cm above the sides — oversize, surcharge and approval needed', '高出箱壁 $1 厘米 — 超限，需要加价并报批', 'kenardan $1 cm taşıyor — gabari dışı, ek ücret ve onay gerekir', 'ragt $1 cm über die Bordwand — Übermaß, Aufpreis und Genehmigung nötig', 'dépasse de $1 cm au-dessus des parois — hors gabarit, supplément et accord nécessaires']],
    [/^шире платформы на ([\d\s,.]+) см — негабарит по ширине$/, ['$1 cm wider than the platform — over-width', '比平台宽 $1 厘米 — 超宽', 'platformdan $1 cm geniş — genişlikte gabari dışı', '$1 cm breiter als die Plattform — Überbreite', '$1 cm plus large que la plateforme — hors gabarit en largeur']],
    [/^Одно место тяжелее грузоподъёмности \(([\d\s ,.]+) кг\)$/, ['One piece is heavier than the payload ($1 kg)', '单件超过载重（$1 公斤）', 'Tek parça taşıma kapasitesinden ağır ($1 kg)', 'Ein Packstück ist schwerer als die Nutzlast ($1 kg)', 'Un colis dépasse la charge utile ($1 kg)']],
    [/^по весу входит (\d+) мест из (\d+) по размеру$/, ['by weight $1 of $2 pieces fit', '按重量可装 $1 件（按尺寸 $2 件）', 'ağırlığa göre $2 parçadan $1 parça sığar', 'nach Gewicht passen $1 von $2 Packstücken', 'au poids, $1 colis sur $2 tiennent']],
    [/^Вид сверху, (.+): (\d+) × (\d+) мест в ряду$/, ['Top view, $1: $2 × $3 pieces per layer', '俯视图，$1：每层 $2 × $3 件', 'Üstten görünüm, $1: katta $2 × $3 parça', 'Draufsicht, $1: $2 × $3 Packstücke pro Lage', 'Vue de dessus, $1 : $2 × $3 colis par rangée']],
    [/^(\d+) ярус(а|ов)?$/, ['$1 tiers', '$1 层', '$1 kat', '$1 Lagen', '$1 niveaux']],
    [/^помещается (\d+) мест$/, ['$1 pieces fit', '可装 $1 件', '$1 parça sığar', '$1 Packstücke passen', '$1 colis tiennent']],
    [/^([\d,.]+(?:×[\d,.]+)+) м$/, ['$1 m', '$1 米', '$1 m', '$1 m', '$1 m']],
    [/^([\d,.]+(?:×[\d,.]+)*)×без крыши м$/, ['$1 m · open top', '$1 米 · 无顶', '$1 m · üstü açık', '$1 m · ohne Dach', '$1 m · toit ouvert']],
    [/^до ([\d\s ,.]+) т$/, ['up to $1 t', '最多 $1 吨', '$1 t’ye kadar', 'bis $1 t', 'jusqu’à $1 t']],
    [/^(\d+) шт\.$/, ['$1 units', '$1 个', '$1 adet', '$1 Stk.', '$1 unités']],
    [/^([+−-]\d+(?::\d\d)?) ч к Москве$/, ['$1 h vs Moscow', '比莫斯科 $1 小时', 'Moskova’ya göre $1 sa', '$1 Std. zu Moskau', '$1 h par rapport à Moscou']],
    [/^Хранение, (\d+) сут\.$/, ['Storage, $1 days', '仓储，$1 天', 'Depolama, $1 gün', 'Lagerung, $1 Tage', 'Stockage, $1 jours']],
    [/^Открыть отслеживание (.+) ↗$/, ['Open $1 tracking ↗', '打开 $1 追踪 ↗', '$1 takibini aç ↗', '$1-Sendungsverfolgung öffnen ↗', 'Ouvrir le suivi $1 ↗']],
    [/^ЖД-дислокация сейчас недоступна: (.+)$/, ['Rail location is unavailable right now: $1', '铁路位置暂不可用：$1', 'Demiryolu konumu şu an alınamıyor: $1', 'Bahn-Standort derzeit nicht verfügbar: $1', 'Localisation ferroviaire indisponible pour le moment : $1']],
    [/^контрольная цифра должна быть (\d) — проверьте номер$/, ['check digit should be $1 — check the number', '校验位应为 $1 — 请检查号码', 'kontrol hanesi $1 olmalı — numarayı kontrol edin', 'Prüfziffer müsste $1 sein — prüfen Sie die Nummer', 'le chiffre de contrôle devrait être $1 — vérifiez le numéro']],
    [/^контрольная цифра не сходится — проверьте номер$/, ['check digit does not match — check the number', '校验位不符 — 请检查号码', 'kontrol hanesi tutmuyor — numarayı kontrol edin', 'Prüfziffer stimmt nicht — prüfen Sie die Nummer', 'le chiffre de contrôle ne correspond pas — vérifiez le numéro']],
    [/^Посчитано по (.+)\. Сумма ориентировочная, точную выставит терминал\.$/, ['Calculated by $1. The amount is approximate; the terminal will issue the exact one.', '依据 $1 计算。金额为估算，准确金额以货站开票为准。', '$1 ile hesaplandı. Tutar yaklaşıktır, kesin tutarı terminal keser.', 'Berechnet nach $1. Der Betrag ist ein Richtwert, den genauen stellt das Terminal in Rechnung.', 'Calculé selon $1. Montant indicatif ; le terminal facturera le montant exact.']],
    [/^Посчитано калькулятором терминала на moscow-cargo\.com\. Сумма ориентировочная, точную выставит терминал\.$/, ['Calculated with the terminal calculator on moscow-cargo.com. The amount is approximate; the terminal will issue the exact one.', '使用 moscow-cargo.com 货站计算器计算。金额为估算，准确金额以货站开票为准。', 'moscow-cargo.com terminal hesaplayıcısıyla hesaplandı. Tutar yaklaşıktır, kesin tutarı terminal keser.', 'Berechnet mit dem Terminalrechner auf moscow-cargo.com. Der Betrag ist ein Richtwert, den genauen stellt das Terminal in Rechnung.', 'Calculé avec le calculateur du terminal sur moscow-cargo.com. Montant indicatif ; le terminal facturera le montant exact.']],
    [/^Калькулятор Москва Карго не ответил \((.+)\), посчитано по их тарифам на рейсах других авиакомпаний$/, ['The Moscow Cargo calculator did not respond ($1); calculated by their tariffs for other airlines', 'Moscow Cargo 计算器未响应（$1），已按其他航空公司的费率计算', 'Moscow Cargo hesaplayıcısı yanıt vermedi ($1), diğer havayolları tarifeleriyle hesaplandı', 'Der Rechner von Moscow Cargo hat nicht geantwortet ($1); berechnet nach ihren Tarifen für andere Fluggesellschaften', 'Le calculateur de Moscow Cargo n’a pas répondu ($1) ; calcul selon leurs tarifs pour les autres compagnies']],
    [/^Деловые Линии не ответили: (.+)\. Показан ориентир\.$/, ['Dellin did not respond: $1. An estimate is shown.', 'Dellin 未响应：$1。显示参考价。', 'Dellin yanıt vermedi: $1. Tahmin gösteriliyor.', 'Dellin hat nicht geantwortet: $1. Richtwert angezeigt.', 'Dellin n’a pas répondu : $1. Estimation affichée.']],
    [/^Деловые Линии не знают город «(.+)»$/, ['Dellin does not know the city “$1”', 'Dellin 没有城市“$1”', 'Dellin “$1” şehrini tanımıyor', 'Dellin kennt die Stadt „$1“ nicht', 'Dellin ne connaît pas la ville « $1 »']],
    [/^Сервер ответил не так, как ожидалось \((\d+)\)$/, ['The server responded unexpectedly ($1)', '服务器响应异常（$1）', 'Sunucu beklenmedik yanıt verdi ($1)', 'Der Server hat unerwartet geantwortet ($1)', 'Le serveur a répondu de façon inattendue ($1)']],
    [/^(\d+) мест · ([\d\s ,.]+) кг · плотность ([\d\s ,.]+) кг\/м³$/, ['$1 pcs · $2 kg · density $3 kg/m³', '$1 件 · $2 公斤 · 密度 $3 公斤/立方米', '$1 parça · $2 kg · yoğunluk $3 kg/m³', '$1 Packstücke · $2 kg · Dichte $3 kg/m³', '$1 colis · $2 kg · densité $3 kg/m³']],
    [/^(.+) см$/, ['$1 cm', '$1 厘米', '$1 cm', '$1 cm', '$1 cm']],
    [/^(\d+) (сделк[аи]|сделок)$/, ['$1 deals', '$1 笔交易', '$1 işlem', '$1 Deals', '$1 affaires']],
    [/^(\d+) · предложения$/, ['$1 · offers', '$1 · 报价', '$1 · teklif', '$1 · Angebote', '$1 · offres']],
    [/^Сегодня отсутствуют: (.+)$/, ['Absent today: $1', '今日缺勤：$1', 'Bugün yok: $1', 'Heute abwesend: $1', 'Absents aujourd’hui : $1']],
    [/^нет (.+)$/, ['missing $1', '缺少 $1', '$1 eksik', '$1 fehlt', '$1 manquant']],
  ];
  var IDX = { en: 0, zh: 1, tr: 2, de: 3, fr: 4 };
  // переводы на немецкий и французский и строки, которых не было в словаре, — из i18n-more.js
  (function merge() {
    var DF = window.IOMA_DICT_DF || {}, MORE = window.IOMA_DICT_MORE || {};
    Object.keys(DF).forEach(function (k) { var v = DF[k], t = D[k]; if (t) { while (t.length < 5) t.push(null); t[3] = v[0]; t[4] = v[1]; } else D[k] = [null, null, null, v[0], v[1]]; });
    var TDF = window.IOMA_DICT_TDF || {};
    Object.keys(TDF).forEach(function (k) { var v = TDF[k], t = D[k] || (D[k] = [null, null, null, null, null]); t[2] = t[2] || v[0]; t[3] = t[3] || v[1]; t[4] = t[4] || v[2]; });
    Object.keys(MORE).forEach(function (k) { var v = MORE[k], t = D[k]; if (!t) { D[k] = v.slice(); return; } for (var i = 0; i < 5; i++) if (!t[i] && v[i]) t[i] = v[i]; });
  })();
  var SKIP = '#chatMessages,#newsList,#directoryGrid,#v3leadsList .v3p-lead p,#v3clientsList small,svg,script,style,.tarot-shell,#articleContent,.result-notes,input,textarea,[data-no-i18n]';
  var orig = new WeakMap();
  function lang() { var l; try { l = localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { l = 'ru'; } return IDX.hasOwnProperty(l) ? l : 'ru'; }
  function pick(t, l) { return t[IDX[l]] || t[0] || null; } // нет перевода на язык — английский понятнее русского
  var CYR = /[а-яё]/i, SEPS = [' → ', ' — ', ' – ', ': ', '; ', ', '];
  function tr(ru, l, attr) {
    var k = attr ? '@' + ru : ru, t = D[k] || (attr ? D[ru] : null);
    if (t) { var tt = pick(t, l); if (tt) return tt; }
    for (var i = 0; i < P.length; i++) { if (P[i][0].test(ru)) { var m = ru.match(P[i][0]); var tpl = P[i][1][IDX[l]] || P[i][1][0]; return tpl.replace(/\$(\d)/g, function (_, d) { var part = m[d] || ''; var pt = D[part.trim()], pp = pt && pick(pt, l); if (pp) return pp; if (CYR.test(part) && part !== ru) { var p2 = tr(part.trim(), l); if (p2) return p2; } return part; }); } }
    // «часть · часть»: переводим известные части, остальное (данные) оставляем
    if (ru.indexOf(' · ') > 0) { var parts = ru.split(' · '), any = false; var outp = parts.map(function (x) { var t2 = tr(x.trim(), l); if (t2) { any = true; return t2; } return x; }); if (any) return outp.join(' · '); }
    // составные фразы «A → B», «A — B», «A: B», «A, B»: переводим, только если известны все русские части
    for (var j = 0; j < SEPS.length; j++) {
      var sp = SEPS[j]; if (ru.indexOf(sp) < 1) continue;
      var ps = ru.split(sp), ok = true, out = ps.map(function (x) { var y = x.trim(); if (!y || !CYR.test(y)) return x; var z = (D[y] && pick(D[y], l)) || tr(y, l); if (!z) ok = false; return z || x; });
      if (ok) { var res = out.join(sp); if (l === 'fr' && sp === ': ') res = out.join(' : '); return res; }
    }
    // скобки в конце: «Текст (пояснение)»
    var mb = ru.match(/^(.+?) \(([^()]+)\)$/); if (mb) { var a = tr(mb[1], l), b = CYR.test(mb[2]) ? tr(mb[2], l) : mb[2]; if (a && b) return a + ' (' + b + ')'; }
    return null;
  }
  // новые разделы добавляют свои переводы: { 'Русский текст': ['English', '中文', 'Türkçe', 'Deutsch', 'Français'] }; языки, которых нет, берутся из i18n-more.js, иначе — английский
  window.IOMA_T_ADD = function (obj) { Object.keys(obj || {}).forEach(function (k) { var v = obj[k], o = D[k] || []; D[k] = [v[0] || o[0] || null, v[1] || o[1] || null, v[2] || o[2] || null, v[3] || o[3] || null, v[4] || o[4] || null]; }); if (typeof later === 'function') later(); };
  window.IOMA_T = function (ru, l) { l = l || lang(); if (l === 'ru' || !IDX.hasOwnProperty(l)) return ru; return tr(ru, l) || ru; };
  window.IOMA_LANGS = ['ru', 'en', 'zh', 'de', 'fr', 'tr'];
  var busy = false;
  function apply(root) {
    var l = lang(); busy = true;
    try {
      var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) {
        var el = n.parentElement; if (!el || el.closest(SKIP)) continue;
        var o = orig.get(n); var src = o != null ? o : n.nodeValue; var s = src.trim(); if (!s || !/[а-яё]/i.test(s)) continue;
        if (o == null) orig.set(n, src);
        if (l === 'ru' || !IDX.hasOwnProperty(l)) { if (n.nodeValue !== src) n.nodeValue = src; continue; }
        var t = tr(s, l); if (t) { var v = src.replace(s, t); if (n.nodeValue !== v) n.nodeValue = v; }
      }
      (root || document).querySelectorAll('[placeholder],[aria-label],[title]').forEach(function (e) {
        if (e.closest('#chatMessages,#newsList,#directoryGrid')) return;
        ['placeholder', 'aria-label', 'title'].forEach(function (a) {
          var key = 'v3ru' + a.replace('-', ''), cur = e.getAttribute(a); if (!cur) return;
          if (!e.dataset[key]) { if (!/[а-яё]/i.test(cur)) return; e.dataset[key] = cur; }
          var ru = e.dataset[key];
          var t = (l === 'ru' || !IDX.hasOwnProperty(l)) ? ru : (tr(ru, l, true) || null);
          if (t && cur !== t) e.setAttribute(a, t);
        });
      });
      var hl = IDX.hasOwnProperty(l) ? l : 'ru'; if (document.documentElement.lang !== hl) document.documentElement.lang = hl; // без лишних записей: на смену языка подписаны карта и разделы
    } finally { busy = false; }
  }
  var timer = null;
  // не откладываем бесконечно: если страница всё время меняется (анимация, счётчики), перевод всё равно применяется не реже раза в 80 мс
  function later() { if (timer) return; timer = setTimeout(function () { timer = null; apply(); }, 80); }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.lang')) setTimeout(later, 30); });
  new MutationObserver(function () { if (!busy && lang() !== 'ru') later(); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
  window.addEventListener('load', later);
})();
