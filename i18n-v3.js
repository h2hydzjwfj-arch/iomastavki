/* IOMASTAVKA — готовые переводы интерфейса (RU → EN / 中文 / TR).
   Тексты написаны заранее, а не переводятся «на лету». Работает вместе с переводами app.js:
   всё, что не покрыто там, переводится здесь по точному совпадению русской фразы. */
(function () {
  'use strict';
  // RU: [EN, ZH, TR]
  var D = {
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
  // Фразы с переменной частью
  var P = [
    [/^(.+), здесь ваши грузы: статус, маршрут, расходы и документы\.$/, ['$1, here are your shipments: status, route, costs and documents.', '$1，这里是您的货物：状态、路线、费用和单证。', '$1, gönderileriniz burada: durum, güzergâh, maliyetler ve belgeler.']],
    [/^(.+) · прибытие: (.+)$/, ['$1 · arrival: $2', '$1 · 到达：$2', '$1 · varış: $2']],
    [/^Транспорт уточняется · прибытие: (.+)$/, ['Transport TBC · arrival: $1', '运输方式待定 · 到达：$1', 'Taşıma teyit edilecek · varış: $1']],
    [/^История \((\d+)\)$/, ['History ($1)', '记录（$1）', 'Geçmiş ($1)']],
    [/^· новых: (\d+)$/, ['· new: $1', '· 新：$1', '· yeni: $1']],
    [/^Обновлено (\d+) мин назад$/, ['Updated $1 min ago', '$1 分钟前更新', '$1 dk önce güncellendi']],
    [/^от (\d\d\.\d\d\.\d{4})$/, ['of $1', '日期 $1', '$1 tarihli']],
    [/^Действует до (.+)$/, ['Valid until $1', '有效期至 $1', '$1 tarihine kadar geçerli']],
    [/^≈ ([\d\s ]+) ₽ по курсу ЦБ на сегодня$/, ['≈ $1 ₽ at today’s Bank of Russia rate', '≈ $1 ₽（按今日央行汇率）', '≈ $1 ₽ (bugünkü MB kuruyla)']],
    [/^≈ ([\d\s ]+) ₽ по курсу ЦБ ([\d,.]+)$/, ['≈ $1 ₽ at Bank of Russia rate $2', '≈ $1 ₽（央行汇率 $2）', '≈ $1 ₽ (MB kuru $2)']],
    [/^(\d+) дн\.$/, ['$1 days', '$1 天', '$1 gün']],
    [/^(\d\d\.\d\d\.\d{4}) г\.$/, ['$1', '$1', '$1']],
    [/^([\d\s\u00a0,.]+) кг$/, ['$1 kg', '$1 公斤', '$1 kg']],
    [/^([\d\s\u00a0,.]+) м³$/, ['$1 m³', '$1 立方米', '$1 m³']],
    [/^(.+) см$/, ['$1 cm', '$1 厘米', '$1 cm']],
    [/^нет (.+)$/, ['missing $1', '缺少 $1', '$1 eksik']],
  ];
  var IDX = { en: 0, zh: 1, tr: 2 };
  var SKIP = '#kbBody,#chatMessages,#newsList,#directoryGrid,#v3leadsList .v3p-lead p,#v3clientsList small,svg,script,style,.tarot-shell,#articleContent,.result-notes,input,textarea';
  var orig = new WeakMap();
  function lang() { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } }
  function tr(ru, l, attr) {
    var k = attr ? '@' + ru : ru, t = D[k] || (attr ? null : null);
    if (t) return t[IDX[l]];
    for (var i = 0; i < P.length; i++) { if (P[i][0].test(ru)) { var m = ru.match(P[i][0]); return P[i][1][IDX[l]].replace(/\$(\d)/g, function (_, d) { var part = m[d] || ''; var pt = D[part.trim()]; return pt ? pt[IDX[l]] : part; }); } }
    // «часть · часть»: переводим известные части, остальное (данные) оставляем
    if (ru.indexOf(' · ') > 0) { var parts = ru.split(' · '), any = false; var outp = parts.map(function (x) { var t2 = tr(x.trim(), l); if (t2) { any = true; return t2; } return x; }); if (any) return outp.join(' · '); }
    return null;
  }
  window.IOMA_T = function (ru) { var l = lang(); if (l === 'ru' || !IDX.hasOwnProperty(l)) return ru; return tr(ru, l) || ru; };
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
      document.documentElement.lang = IDX.hasOwnProperty(l) ? l : 'ru';
    } finally { busy = false; }
  }
  var timer = null;
  function later() { clearTimeout(timer); timer = setTimeout(function () { apply(); }, 80); }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.lang')) setTimeout(later, 30); });
  new MutationObserver(function () { if (!busy && lang() !== 'ru') later(); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
  window.addEventListener('load', later);
})();
