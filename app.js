const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const I18N = {
  ru:{title:'Расчёт ставки',from:'Откуда',to:'Куда',cargo:'ГРУЗ',weight:'Вес, кг',pieces:'Количество мест',distance:'Расстояние, км',auto:'Автоматически',dimensions:'ГАБАРИТЫ ОДНОГО МЕСТА',volumeAll:'Объём — по всем местам',length:'Длина',width:'Ширина',height:'Высота',forwarder:'Экспедитор',transport:'Вид транспорта',incoterms:'Условия поставки',dimWeight:'Объёмный вес',chooseForwarder:'Выберите экспедитора',chooseTransport:'Выберите транспорт',selected:'ЭКСПЕДИТОР',none:'Не выбран',calculate:'Рассчитать',agents:'Экспедиторы',assistant:'ИИ-ассистент',assistantSub:'Спросите что угодно по логистике',assistantHelp:'Можно писать обычным языком: маршрут, ставка, Incoterms, таможня, расчёт веса или новая ставка.',send:'Отправить',news:'Новости',newsSub:'Логистика · Китай · Таможня',logout:'Выйти',thinking:'Думаю…',aiOff:'ИИ не подключён. Добавьте OPENAI_API_KEY в Render.',newsLoading:'Загружаю новости…',noNews:'Новости пока недоступны.',weatherError:'Погода временно недоступна.',todayDate:'15.09.2026 г.',home:'Главная',heroEyebrow:'ЛОГИСТИКА · КИТАЙ → РОССИЯ',heroText:'Точный расчёт. Умный помощник.\nВсё необходимое для работы с грузом — в одном месте.',tileRates:'Расчёт ставок',tileRatesSub:'Маршрут, ставка и транспорт',tileAI:'AI-ассистент',tileAISub:'Текстом или голосом',tileAgents:'Экспедиторы',tileAgentsSub:'Контакты и направления перевозок',tileNews:'Новости ВЭД',tileNewsSub:'Китай · логистика · таможня',directoryEyebrow:'СПРАВОЧНИК',directorySub:'Поставщики и контакты по направлениям.',intelligence:'ИНТЕЛЛЕКТ',assistantSub2:'Логистика, расчёты и ВЭД — голосом или текстом.',attach:'＋ Прикрепить КП / PDF / Excel / Word / TXT',fileHint:'Файл можно добавить вместе с сообщением',voice:'Голос',intelligenceFeed:'ИНФОРМАЦИОННАЯ ЛЕНТА',newsSub2:'Китай · логистика · таможня',chargeWeight:'Расчётный вес',company:'Компания',contact:'Контакт',phone:'Телефон',email:'Email',website:'Сайт',directions:'Направления',note:'Примечание',all:'Все',close:'Закрыть',weatherUpdating:'Погода обновляется',distanceWaiting:'Расстояние появится после выбора двух городов',autoByTransport:'Автоматически по транспорту',transportRail:'ЖД',transportRoad:'Авто',transportAir:'Авиа',transportSea:'Море',transportMulti:'Море + ЖД',menu:'Меню',ready:'Готов к разговору',listen:'Слушаю…',transcribe:'Расшифровываю…',recognized:'Речь распознана',fail:'Не удалось распознать голос',mic:'Нет доступа к микрофону',unavailable:'Голос недоступен',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'ЦБ РФ',articleLoading:'Готовлю статью…',articleError:'Не удалось подготовить статью.',articleListen:'Аудиоподкаст',articlePlay:'Слушать',articlePause:'Пауза',articleSource:'Материал подготовлен на основе новости',articleBack:'К новостям'},
  en:{title:'Rate calculation',from:'From',to:'To',cargo:'CARGO',weight:'Weight, kg',pieces:'Pieces',distance:'Distance, km',auto:'Automatic',dimensions:'DIMENSIONS OF ONE PIECE',volumeAll:'Volume — all pieces',length:'Length',width:'Width',height:'Height',forwarder:'Forwarder',transport:'Transport',incoterms:'Incoterms',dimWeight:'Volumetric weight',chooseForwarder:'Choose forwarder',chooseTransport:'Choose transport',selected:'FORWARDER',none:'Not selected',calculate:'Calculate',agents:'Forwarders',assistant:'AI assistant',assistantSub:'Ask anything about logistics',assistantHelp:'Write naturally: route, rate, Incoterms, customs, weight calculation or a new rate.',send:'Send',news:'News',newsSub:'Logistics · China · Customs',logout:'Log out',thinking:'Thinking…',aiOff:'AI is not connected. Add OPENAI_API_KEY in Render.',newsLoading:'Loading news…',noNews:'News are temporarily unavailable.',weatherError:'Weather is temporarily unavailable.',todayDate:'15.09.2026',home:'首页',heroEyebrow:'物流 · 中国 → 俄罗斯',heroText:'精准报价。智能助手。\n货运工作所需的一切，都在这里。',tileRates:'运价计算',tileRatesSub:'路线、运价和运输方式',tileAI:'AI 助手',tileAISub:'文字或语音',tileAgents:'货运代理',tileAgentsSub:'联系方式和运输方向',tileNews:'外贸新闻',tileNewsSub:'中国 · 物流 · 海关',directoryEyebrow:'通讯录',directorySub:'按运输方向查看供应商和联系方式。',intelligence:'智能',assistantSub2:'物流、运价和外贸 — 支持语音或文字。',attach:'＋ 添加报价 / PDF / Excel / Word / TXT',fileHint:'可以随消息添加文件',voice:'语音',intelligenceFeed:'资讯',newsSub2:'中国 · 物流 · 海关',chargeWeight:'Chargeable weight',company:'Company',contact:'Contact',phone:'Phone',email:'Email',website:'Website',directions:'Directions',note:'Note',all:'All',close:'Close',weatherUpdating:'Updating weather',distanceWaiting:'Distance appears after selecting two cities',autoByTransport:'Automatic by transport',transportRail:'Rail',transportRoad:'Road',transportAir:'Air',transportSea:'Sea',transportMulti:'Sea + Rail',menu:'Menu',ready:'Ready to talk',listen:'Listening…',transcribe:'Transcribing…',recognized:'Speech recognized',fail:'Could not recognize speech',mic:'Microphone access denied',unavailable:'Voice unavailable',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'CBR',articleLoading:'Preparing article…',articleError:'Could not prepare the article.',articleListen:'Audio podcast',articlePlay:'Listen',articlePause:'Pause',articleSource:'Prepared from the selected news item',articleBack:'Back to news'},
  zh:{title:'运价计算',from:'起运地',to:'目的地',cargo:'货物',weight:'重量，公斤',pieces:'件数',distance:'距离，公里',auto:'自动',dimensions:'单件尺寸',volumeAll:'体积 — 所有件',length:'长度',width:'宽度',height:'高度',forwarder:'货运代理',transport:'运输方式',incoterms:'贸易术语',dimWeight:'体积重量',chooseForwarder:'选择货运代理',chooseTransport:'选择运输方式',selected:'货运代理',none:'未选择',calculate:'计算',agents:'货运代理',assistant:'AI 助手',assistantSub:'咨询物流问题',assistantHelp:'可以直接输入路线、运价、贸易术语、清关或体积重量问题。',send:'发送',news:'新闻',newsSub:'物流 · 中国 · 海关',logout:'退出',thinking:'思考中…',aiOff:'AI 尚未连接。请在 Render 添加 OPENAI_API_KEY。',newsLoading:'正在加载新闻…',noNews:'暂时没有新闻。',weatherError:'天气暂时不可用。',todayDate:'15.09.2026',home:'首页',heroEyebrow:'物流 · 中国 → 俄罗斯',heroText:'精准报价。智能助手。\n货运工作所需的一切，都在这里。',tileRates:'运价计算',tileRatesSub:'路线、运价和运输方式',tileAI:'AI 助手',tileAISub:'文字或语音',tileAgents:'货运代理',tileAgentsSub:'联系方式和运输方向',tileNews:'外贸新闻',tileNewsSub:'中国 · 物流 · 海关',directoryEyebrow:'通讯录',directorySub:'按运输方向查看供应商和联系方式。',intelligence:'智能',assistantSub2:'物流、运价和外贸 — 支持语音或文字。',attach:'＋ 添加报价 / PDF / Excel / Word / TXT',fileHint:'可以随消息添加文件',voice:'语音',intelligenceFeed:'资讯',newsSub2:'中国 · 物流 · 海关',chargeWeight:'计费重量',company:'公司',contact:'联系人',phone:'电话',email:'邮箱',website:'网站',directions:'运输方向',note:'备注',all:'全部',close:'关闭',weatherUpdating:'正在更新天气',distanceWaiting:'选择两个城市后显示距离',autoByTransport:'根据运输方式自动计算',transportRail:'铁路',transportRoad:'公路',transportAir:'空运',transportSea:'海运',transportMulti:'海运 + 铁路',menu:'菜单',ready:'准备好开始对话',listen:'正在听…',transcribe:'正在转写…',recognized:'已识别语音',fail:'无法识别语音',mic:'没有麦克风权限',unavailable:'语音不可用',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'中国人民银行',articleLoading:'正在准备文章…',articleError:'无法生成文章。',articleListen:'音频播客',articlePlay:'播放',articlePause:'暂停',articleSource:'根据所选新闻整理',articleBack:'返回新闻'}
};

const modes={air:{ru:'Авиа',en:'Air',zh:'空运',factor:167},road:{ru:'Авто',en:'Road',zh:'公路',factor:400},rail:{ru:'ЖД',en:'Rail',zh:'铁路',factor:500},sea:{ru:'Море',en:'Sea',zh:'海运',factor:1000},multimodal:{ru:'Море + ЖД',en:'Sea + Rail',zh:'海运+铁路',factor:1000}};
const modeGroups=[['rail','transportRail'],['road','transportRoad'],['air','transportAir'],['sea','transportSea'],['multimodal','transportMulti']];
let lang=localStorage.getItem('iomastavka_lang')||'ru';
let rates={}; let currentArticleNews=null; let selectedForwarder=''; let selectedMode=''; let selectedFactor=167;
let selectedCities={from:null,to:null};
let dimensionUnit='mm';
const agentDirectory=[{"id":1,"company":"Multiwell","contact":"Kane","phone":"8 616 608 738 886","email":"sales344@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":2,"company":"Multiwell","contact":"Sakiya","phone":"8 619 860 070 462","email":"sales242@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":3,"company":"CR FREIGHT","contact":"Ирина Андреева","phone":"8 911 195 62 31","email":"andreeva@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":4,"company":"CR FREIGHT","contact":"Ella и другие","phone":"","email":"cs19@crfreight.cn, ella@crfreight.cn, sr16@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":5,"company":"TRANSIT, LLC","contact":"Konstantin Leonov","phone":"8 914 791 87 81","email":"k.leonov@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":6,"company":"TRANSIT, LLC","contact":"Tatyana Iskaleeva","phone":"8 908 450 11 98","email":"t.iskaleeva@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":7,"company":"TRANSIT, LLC","contact":"","phone":"","email":"directrail@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":8,"company":"Русмарин","contact":"Евгений Ермоленко","phone":"8 921 401 61 29","email":"evermolenko@rusmarine.ru","site":"www.rusmarine.ru","modes":["rail","road","air","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Авиа","Море","Море + Ж/Д"],"notes":"Сборные груза"},{"id":9,"company":"Qtavia","contact":"Anastasiia Snatkina","phone":"86 131 499 21 667","email":"a.snatkina@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":10,"company":"Qtavia","contact":"Linara Iliazova","phone":"8 936 131 23 25","email":"linara.iliazova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":11,"company":"Qtavia","contact":"Naida Azadova","phone":"8 986 749 55 92","email":"naida.azadova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":12,"company":"ФЛГ","contact":"Александр Токарев","phone":"8 906 238 85 17","email":"sales@flgrussia.com","site":"https://flgrussia.com/","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":13,"company":"РусКарго","contact":"Alina Karpova","phone":"8 981 930 24 66","email":"kas@r-cargo.com","site":"https://r-cargo.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":14,"company":"YM Trans Group","contact":"Милена Никитина","phone":"8 925 988 65 99","email":"982@ymtrans.ru","site":"www.ymtrans.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":15,"company":"JENTY","contact":"Marina Kostukovich","phone":"375 29 192 46 69","email":"m.kostukovich@jenty-spedition.com","site":"https://jenty-spedition.ru/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза"},{"id":16,"company":"Consolidator-DV LLC","contact":"Timofei Bakanovich","phone":"8 964 432 57 95","email":"import5@consolidator-dv.ru","site":"http://consolidator-dv.ru/","modes":["sea"],"transport":["Море"],"notes":"Сборные груза"},{"id":17,"company":"ТАМГА","contact":"Осипов Николай","phone":"8 985 279 69 39","email":"n.osipov@tamga80.ru","site":"https://tamga80.ru/ru","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Негабарит"},{"id":18,"company":"Green Avia","contact":"Kuzmina Maria","phone":"8 936 506 11 15","email":"sales3@avia-dostavka.com","site":"https://avia-dostavka.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":19,"company":"Sky Cargo Service","contact":"Ekaterina Ivanova","phone":"8 913 061 71 56","email":"sales10@scs-aero.ru","site":"www.scs-aero.ru","modes":["air"],"transport":["Авиа"],"notes":""},{"id":20,"company":"Альфа Транзит","contact":"Щепина Виктория","phone":"8 916 894 05 20","email":"v.shchepina@alfa-transit.com","site":"www.alfa-transit.com","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":21,"company":"Шатл Логистик / Shuttle-Logistic","contact":"Братасенко Михаил","phone":"8 999 614 64 92","email":"mb@shuttle-logistic.ru","site":"www.shuttle-logistic.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":22,"company":"Chengdu Tiechi Silk Road Supply Chain Management","contact":"Lily","phone":"8 619 115 959 752","email":"lily@tsrscm.com","site":"http://tsrscm.com/ru/","modes":["rail"],"transport":["Прямое Ж/Д"],"notes":"Сборные груза"},{"id":23,"company":"GUANGZHOU ETY TRANS INTERNATIONAL FREIGHT FORWARDING","contact":"Vera Yao","phone":"8 615 999 941 607","email":"vera@cnetytrans.com","site":"www.cnetytrans.com","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":""},{"id":24,"company":"A2","contact":"Микулин Владимир","phone":"8 913 061 71 56","email":"v.mikulin@a2-express.com","site":"a2-express.com","modes":["air"],"transport":["Авиа"],"notes":""},{"id":25,"company":"RUTENSIL Logistics","contact":"Алина","phone":"8 906 351 17 33","email":"108@rutensil.com","site":"http://rutensil.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Европа"},{"id":26,"company":"ВТХ","contact":"Станислав","phone":"8 914 077 79 26","email":"vthopr4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":27,"company":"ВТХ","contact":"Алексей","phone":"8 914 704 43 41","email":"sales4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":28,"company":"Chongqing Gudali Supply Chain Management","contact":"Logan","phone":"8 613 827 428 296","email":"logan@gdl-rail.com","site":"logan@gdl-rail.com","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":29,"company":"Вэй Трейд","contact":"Рукосуева Евгения Олеговна","phone":"8 902 981 11 04","email":"e.rukosueva@way-trade.ru","site":"https://way-trade.ru/","modes":["rail","road","multimodal"],"transport":["Прямое Ж/Д","Авто","Море + Ж/Д"],"notes":""},{"id":30,"company":"WAY GROUP","contact":"Общий","phone":"8 800 600 04 30","email":"info@wayg.ru","site":"https://www.wayg.ru/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Негабарит"},{"id":31,"company":"ФИТ, Владивосток","contact":"Маргарита","phone":"8-800-23-444-99 ext. 41501; +7-914-794-20-89","email":"NNKuznetsova@fesco.com","site":"https://www.fesco.ru/ru/","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит"},{"id":32,"company":"Нью Вэй Лоджистик","contact":"Боев Сергей","phone":"8 914 320 65 95","email":"310@newwaylogistic.ru","site":"https://newwaylogistic.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Ж/Д по России, Опасный"},{"id":33,"company":"ВЕЛЕС","contact":"Венера Рашидова","phone":"8 918 418 69 82","email":"operative2@velesforwarding.ru","site":"www.velesforwarding.ru","modes":["sea"],"transport":["Море"],"notes":"Новороссийск, Негабарит, Опасный"},{"id":34,"company":"ГАЛЕАС","contact":"Роман","phone":"8 961 520 31 25","email":"r.kuznetsov@galeasgroup.ru","site":"https://galeasgroup.ru/","modes":["sea"],"transport":["Море"],"notes":"Новороссийск"},{"id":35,"company":"Znylogistics","contact":"Maya","phone":"","email":"operator01@znylogistics.com","site":"","modes":["road"],"transport":["Авто"],"notes":"Турция"},{"id":36,"company":"РТТК","contact":"Алексей Веслополов (Чита)","phone":"8 3022 21 18 18; 8 914 464 23 32","email":"rttk888@mail.ru","site":"https://www.rttk.net/","modes":["rail","road"],"transport":["Ж/Д","Авто"],"notes":"Негабарит, Россия, Китай"},{"id":37,"company":"Tu-Tell","contact":"Вадим","phone":"375 33 3071468","email":"t14@tutell.com","site":"https://www.tutell.com/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Турция, Европа"},{"id":38,"company":"СДЕК","contact":"Палащук Владислав Сергеевич","phone":"8 924 697 72 73","email":"v.palashchuk@cdek.ru","site":"www.cdek.ru","modes":["road"],"transport":["Мелкие груза"],"notes":"Китай"},{"id":39,"company":"ИП Полчанинов Кирилл Александрович","contact":"Кирилл","phone":"7 925 991 25 75","email":"pka666@yandex.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина 42-43 куб.м."],"notes":"Россия, Москва, МО"},{"id":40,"company":"ИП Диана Куркина","contact":"Евгений","phone":"7 962 936 27 08","email":"yevgeniy-kurkin@mail.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина до 18 куб.м."],"notes":"Россия, Москва, МО"},{"id":41,"company":"Автовывоз — Алексей","contact":"Алексей","phone":"7 985 227 06 67","email":"","site":"","modes":["road"],"transport":["Автовывоз с СВХ, более 20 куб.м."],"notes":"Россия, Москва, МО"}];
let chatHistory=[];

// Быстрый локальный справочник. Он работает мгновенно и не ждёт API.
const cities=[
['Иу','Yiwu','义乌','Jinhua','China','cn'],['Циндао','Qingdao','青岛','Shandong','China','cn'],['Цзинань','Jinan','济南','Shandong','China','cn'],['Цзиньхуа','Jinhua','金华','Zhejiang','China','cn'],['Цзиньчжоу','Jinzhou','锦州','Liaoning','China','cn'],['Цзянмэнь','Jiangmen','江门','Guangdong','China','cn'],['Цзюцзян','Jiujiang','九江','Jiangxi','China','cn'],['Цицикар','Qiqihar','齐齐哈尔','Heilongjiang','China','cn'],['Цанчжоу','Cangzhou','沧州','Hebei','China','cn'],['Чанша','Changsha','长沙','Hunan','China','cn'],['Чанчжоу','Changzhou','常州','Jiangsu','China','cn'],['Чэнду','Chengdu','成都','Sichuan','China','cn'],['Чунцин','Chongqing','重庆','Chongqing','China','cn'],['Чжэнчжоу','Zhengzhou','郑州','Henan','China','cn'],['Чжухай','Zhuhai','珠海','Guangdong','China','cn'],['Шанхай','Shanghai','上海','Shanghai','China','cn'],['Шэньчжэнь','Shenzhen','深圳','Guangdong','China','cn'],['Шэньян','Shenyang','沈阳','Liaoning','China','cn'],['Шицзячжуан','Shijiazhuang','石家庄','Hebei','China','cn'],['Гуанчжоу','Guangzhou','广州','Guangdong','China','cn'],['Пекин','Beijing','北京','Beijing','China','cn'],['Нинбо','Ningbo','宁波','Zhejiang','China','cn'],['Тяньцзинь','Tianjin','天津','Tianjin','China','cn'],['Ханчжоу','Hangzhou','杭州','Zhejiang','China','cn'],['Сучжоу','Suzhou','苏州','Jiangsu','China','cn'],['Ухань','Wuhan','武汉','Hubei','China','cn'],['Сямэнь','Xiamen','厦门','Fujian','China','cn'],['Далянь','Dalian','大连','Liaoning','China','cn'],['Харбин','Harbin','哈尔滨','Heilongjiang','China','cn'],['Наньнин','Nanning','南宁','Guangxi','China','cn'],['Нанкин','Nanjing','南京','Jiangsu','China','cn'],['Фошань','Foshan','佛山','Guangdong','China','cn'],['Хэфэй','Hefei','合肥','Anhui','China','cn'],['Тайюань','Taiyuan','太原','Shanxi','China','cn'],['Куньмин','Kunming','昆明','Yunnan','China','cn'],['Сиань','Xi’an','西安','Shaanxi','China','cn'],['Сеул','Seoul','서울','South Korea','kr'],['Пусан','Busan','부산','South Korea','kr'],['Инчхон','Incheon','인천','South Korea','kr'],['Мумбаи','Mumbai','मुंबई','Maharashtra','India','in'],['Дели','Delhi','दिल्ली','Delhi','India','in'],['Ченнаи','Chennai','சென்னை','Tamil Nadu','India','in'],
['Нижний Новгород','Nizhny Novgorod','Нижний Новгород','Nizhny Novgorod','Russia','ru'],['Набережные Челны','Naberezhnye Chelny','Набережные Челны','Tatarstan','Russia','ru'],['Нижневартовск','Nizhnevartovsk','Нижневартовск','Khanty-Mansi','Russia','ru'],['Норильск','Norilsk','Норильск','Krasnoyarsk Krai','Russia','ru'],['Новосибирск','Novosibirsk','Новосибирск','Novosibirsk Oblast','Russia','ru'],['Новороссийск','Novorossiysk','Новороссийск','Krasnodar Krai','Russia','ru'],['Нальчик','Nalchik','Нальчик','Kabardino-Balkaria','Russia','ru'],['Находка','Nakhodka','Находка','Primorsky Krai','Russia','ru'],['Нефтеюганск','Nefteyugansk','Нефтеюганск','Khanty-Mansi','Russia','ru'],['Невинномысск','Nevinnomyssk','Невинномысск','Stavropol Krai','Russia','ru'],['Новокузнецк','Novokuznetsk','Новокузнецк','Kemerovo Oblast','Russia','ru'],['Новомосковск','Novomoskovsk','Новомосковск','Tula Oblast','Russia','ru'],['Ноябрьск','Noyabrsk','Ноябрьск','Yamalo-Nenets','Russia','ru'],['Москва','Moscow','Москва','Moscow','Russia','ru'],['Санкт-Петербург','Saint Petersburg','圣彼得堡','Russia','Russia','ru'],['Казань','Kazan','喀山','Tatarstan','Russia','ru'],['Екатеринбург','Yekaterinburg','叶卡捷琳堡','Sverdlovsk','Russia','ru'],['Самара','Samara','萨马拉','Samara','Russia','ru'],['Владивосток','Vladivostok','符拉迪沃斯托克','Primorsky Krai','Russia','ru'],['Краснодар','Krasnodar','克拉斯诺达尔','Krasnodar Krai','Russia','ru'],['Ростов-на-Дону','Rostov-on-Don','顿河畔罗斯托夫','Rostov','Russia','ru'],['Хабаровск','Khabarovsk','哈巴罗夫斯克','Khabarovsk Krai','Russia','ru'],['Омск','Omsk','鄂木斯克','Omsk','Russia','ru'],['Тюмень','Tyumen','秋明','Tyumen','Russia','ru'],['Уфа','Ufa','乌法','Bashkortostan','Russia','ru'],['Челябинск','Chelyabinsk','车里雅宾斯克','Chelyabinsk','Russia','ru'],['Пермь','Perm','彼尔姆','Perm Krai','Russia','ru']
];

function tr(k){return I18N[lang][k]||k}
function modeName(k){return modes[k]?.[lang]||k}
function setDimensionLabels(){
 const labels={length:['Длина','Length','长度'],width:['Ширина','Width','宽度'],height:['Высота','Height','高度']};
 Object.entries(labels).forEach(([id,texts])=>{
   const label=$('#'+id)?.previousElementSibling; if(!label)return;
   label.textContent=texts[lang==='ru'?0:lang==='en'?1:2]+' ';
   const span=document.createElement('span'); span.className='dimension-unit-label'; span.textContent=unitLabel(); label.appendChild(span);
 });
}
function applyLang(){
 document.documentElement.lang=lang;
 $$('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(key==='heroText') el.innerHTML=tr(key).replace(/\n/g,'<br>'); else el.textContent=tr(key)});
 $('#fromCity').placeholder=lang==='zh'?'中国城市':lang==='en'?'City in China':'Город в Китае'; $('#toCity').placeholder=lang==='zh'?'俄罗斯城市':lang==='en'?'City in Russia':'Город в России'; $('#distance').placeholder=tr('auto'); renderFactors(); $('#assistantInput').placeholder=lang==='zh'?'输入消息…':lang==='en'?'Write a message…':'Напишите сообщение…'; $('#fileNames').textContent=tr('fileHint'); $('#voiceState').textContent=tr('ready'); $('#homeWeatherText').textContent=tr('weatherUpdating'); $('#homeRouteStatus').textContent=tr('distanceWaiting'); $('.close-button')?.setAttribute('aria-label',tr('close')); $('.close-button')?.setAttribute('title',tr('close')); $('#menuButton')?.setAttribute('aria-label',tr('menu')); $('#menuButton')?.setAttribute('title',tr('menu')); $$('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',tr(el.dataset.i18nAria))); $$('[data-i18n]').forEach(el=>{if(el.dataset.i18n==='heroText')el.innerHTML=tr('heroText').replace(/\n/g,'<br>')});
 $$('.lang').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang)); localStorage.setItem('iomastavka_lang',lang);
 setDimensionLabels(); renderForwarderMenu(); renderTransportMenu(); renderIncoterms(); renderFactors(); renderSuggestions($('#fromSuggestions'),$('#fromCity').value.trim()?cityMatches($('#fromCity').value,'china'):[],$('#fromCity'),'china'); renderSuggestions($('#toSuggestions'),$('#toCity').value.trim()?cityMatches($('#toCity').value,'russia'):[],$('#toCity'),'russia'); $('#currencyDate').textContent=formatToday();
}
$$('.lang').forEach(b=>b.onclick=async()=>{lang=b.dataset.lang;applyLang();if(currentArticleNews&&$('#articleView')?.classList.contains('open'))await openArticle(currentArticleNews)});

async function loadRates(){try{const r=await fetch('/api/rates',{credentials:'same-origin'});if(r.ok){const d=await r.json();rates=d||{};window.rateRecords=Array.isArray(d.records)?d.records:[]}}catch{} renderForwarderMenu();renderTransportMenu()}
function companyModes(company){
  const found=agentDirectory.filter(a=>a.company===company).flatMap(a=>a.modes||[]);
  return [...new Set(found.concat(rates[company]?.modes||[]))];
}
function allForwarderNames(){return [...new Set(agentDirectory.map(a=>a.company).filter(Boolean).concat(Object.keys(rates)))];}
function forwarderModes(name){return companyModes(name)}
function filteredAgents(){return agentDirectory.filter(a=>{
  const ms=a.modes||[];
  if(!selectedMode)return true;
  return ms.includes(selectedMode) || (selectedMode==='sea'&&ms.includes('multimodal')) || (selectedMode==='rail'&&ms.includes('multimodal'));
})}
function renderForwarderMenu(){
 const menu=$('#forwarderMenu'); if(!menu)return; menu.innerHTML='';
 const list=filteredAgents();
 list.forEach(agent=>{
   const b=document.createElement('button'); b.type='button'; b.className='hover-item agent-option';
   const main=document.createElement('strong'); main.textContent=agent.company;
   b.append(main);
   b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectForwarder(agent.company);menu.classList.remove('open')});
   menu.appendChild(b);
 });
 if(!list.length) menu.innerHTML=`<div class="hover-item">${tr('none')}</div>`;
}
function selectForwarder(name){
 selectedForwarder=name; $('#forwarderBtn span').textContent=name; renderTransportMenu(); showRecommendation(name);
}
function renderTransportMenu(){
 const menu=$('#transportMenu'); if(!menu)return; menu.innerHTML='';
 const list=selectedForwarder?forwarderModes(selectedForwarder):Object.keys(modes);
 list.filter(k=>modes[k]).forEach(k=>{const b=document.createElement('button');b.className='hover-item';b.textContent=modeName(k);b.onclick=()=>{selectedMode=k;selectedFactor=modes[k].factor;$('#transportBtn span').textContent=modeName(k);renderFactors();renderForwarderMenu();renderTransportMenu();menu.classList.remove('open')};menu.appendChild(b)})
}
function renderAgents(){return;}
function renderIncoterms(){const m=$('#incotermMenu');m.innerHTML='';['EXW','FCA','FOB','CIF','DAP','DDP'].forEach(x=>{const b=document.createElement('button');b.className='hover-item';b.textContent=x;b.onclick=()=>{$('#incotermBtn span').textContent=x;m.classList.remove('open')};m.appendChild(b)})}
function renderFactors(){selectedFactor=selectedMode&&modes[selectedMode]?modes[selectedMode].factor:167;}

// Dropdowns work both by hover and by click/tap.
['forwarderBtn','transportBtn','incotermBtn'].forEach(id=>{const btn=$('#'+id);const menu=$('#'+id.replace('Btn','Menu'));if(btn&&menu)btn.addEventListener('click',e=>{e.stopPropagation();const open=menu.style.visibility==='visible'||menu.classList.contains('open');$$('.hover-menu').forEach(m=>m.classList.remove('open'));if(!open)menu.classList.add('open')})});
document.addEventListener('click',e=>{$$('.hover-menu').forEach(m=>{if(!e.target.closest('.hover-select'))m.classList.remove('open')})});

// Navigation: the Hamsa is a compact command button; hover/click reveals the home dashboard.
$('#menuButton').onclick=()=>showView('home');
$('#logoutButton').onclick=async()=>{await fetch('/api/logout',{method:'POST'});location.href='/'};

const views={home:'#homeView',calculator:'#calculatorView',assistant:'#assistantView',forwarders:'#forwardersView',news:'#newsView',article:'#articleView'};
function showView(name){
  Object.entries(views).forEach(([key,sel])=>{const el=$(sel);if(!el)return;const open=key===name;el.classList.toggle('open',open);el.setAttribute('aria-hidden',String(!open));});
  document.body.classList.toggle('view-open',name!=='home');
  if(name==='forwarders')renderDirectory();
  if(name==='news')loadNews();
  if(name==='assistant')setTimeout(()=>$('#assistantInput')?.focus(),350);
}
$$('[data-open-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.openView)));
$$('[data-close-view]').forEach(b=>b.addEventListener('click',()=>showView('home')));
window.addEventListener('keydown',e=>{if(e.key==='Escape')showView('home')});

async function showRecommendation(name){
 const el=$('#recommendation'); if(!el)return;
 const from=$('#fromCity')?.value?.trim()||'',to=$('#toCity')?.value?.trim()||'',distance=Number($('#distance')?.value)||0;
 if(!from||!to){el.classList.add('hidden');return;}
 try{
  const q=new URLSearchParams({from,to,mode:selectedMode||'',distance:String(distance)});
  const d=await fetch('/api/rates/recommend?'+q.toString()).then(r=>r.json());
  const pool=(d.matches||[]).filter(x=>Number.isFinite(Number(x.rate)));
  const best=pool[0];
  if(best){
    const rate=` — ${best.rate} ${best.currency||'RUB'}`;
    el.textContent=lang==='ru'?`Совет: присмотритесь к ${best.company}${rate}. Есть сохранённая ставка по похожему направлению.`:lang==='en'?`Tip: consider ${best.company}${rate}. A saved rate exists for a similar route.`:`建议关注 ${best.company}${rate}。数据库中有相似路线的历史运价。`;
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
 }catch{el.classList.add('hidden')}
}
function normalizeTextCompany(s=''){return String(s).toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'')}

const UNIT_SCALE={mm:1,cm:10,m:1000};
function unitLabel(){return dimensionUnit==='mm'?'мм':dimensionUnit==='cm'?'см':'м'}
function setDimensionUnit(next){
 if(!UNIT_SCALE[next]||next===dimensionUnit)return;
 ['length','width','height'].forEach(id=>{
   const el=$('#'+id); const old=Number(el.value); if(Number.isFinite(old)&&old>0){const mm=old*UNIT_SCALE[dimensionUnit]; const nextValue=mm/UNIT_SCALE[next]; el.value=Number.isInteger(nextValue)?nextValue:Number(nextValue.toFixed(3));}
 });
 dimensionUnit=next;
 updateDimensionUnitUI();
 containerFitWarning();
}
function updateDimensionUnitUI(){
 $$('.unit-choice').forEach(b=>b.classList.toggle('active',b.dataset.unit===dimensionUnit));
 const title=$('#dimensionsTitle'); if(title) title.textContent=lang==='ru'?`ГАБАРИТЫ ОДНОГО МЕСТА, ${unitLabel()}`:lang==='en'?`DIMENSIONS OF ONE PIECE, ${unitLabel()}`:`单件尺寸，${unitLabel()}`;
 setDimensionLabels();
}
function dimensionsMm(){
 return ['length','width','height'].map(id=>(Number($('#'+id).value)||0)*UNIT_SCALE[dimensionUnit]);
}
function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function cityMatches(q,target){
 const x=normalize(q).trim(); const list=cities.filter(c=>target==='china'?c[5]==='cn':c[5]==='ru'); if(!x)return [];
 return list.map(c=>{const fields=[c[0],c[1],c[2]];let score=99;fields.forEach((f,i)=>{const n=normalize(f);if(n.startsWith(x))score=Math.min(score,i);else if(n.includes(x))score=Math.min(score,10+i)});return {c,score}}).filter(o=>o.score<99).sort((a,b)=>a.score-b.score||a.c[0].localeCompare(b.c[0],'ru')).slice(0,20).map(o=>o.c)
}
function renderSuggestions(box,list,input,target){box.innerHTML='';list.forEach(c=>{const d=document.createElement('button');d.type='button';d.innerHTML=`<strong>${c[lang==='zh'?2:lang==='en'?1:0]}</strong><small>${lang==='zh'?c[1]:c[2]} · ${c[3]} · ${c[4]}</small>`;d.onclick=()=>{input.value=lang==='zh'?c[2]:lang==='en'?c[1]:c[0];box.classList.remove('open');if(inputIdForTarget(target)==='fromCity')selectedCities.from=c;else selectedCities.to=c;autoDistance()};box.appendChild(d)});box.classList.toggle('open',list.length>0)}
function inputIdForTarget(target){return target==='china'?'fromCity':'toCity'}
function setupAutocomplete(inputId,boxId,target){const input=$('#'+inputId),box=$('#'+boxId);input.addEventListener('input',()=>{const q=input.value.trim();if(inputId==='fromCity')selectedCities.from=null;else selectedCities.to=null;renderSuggestions(box,cityMatches(q,target),input,target);if(q.length>=1)fetchGeo(q,target,box,input)});input.addEventListener('focus',()=>{const q=input.value.trim();renderSuggestions(box,q?cityMatches(q,target):[],input,target)});}
async function fetchGeo(q,target,box,input){try{const url=`/api/cities?q=${encodeURIComponent(q)}&country=${target==='china'?'CN':'RU'}`;const r=await fetch(url);const data=await r.json();if(input.value.trim()!==q)return;const remote=(data.results||[]).map(x=>[x.name,x.nameEn||x.name,x.nameZh||x.name,x.admin1||'',x.country||'',x.country_code,x.latitude,x.longitude]);const local=cityMatches(q,target);const merged=[...local,...remote].filter((v,i,a)=>a.findIndex(x=>normalize(x[1])===normalize(v[1]))===i);renderSuggestions(box,merged.slice(0,20),input,target)}catch{}}
setupAutocomplete('fromCity','fromSuggestions','china');setupAutocomplete('toCity','toSuggestions','russia');

document.addEventListener('click',e=>{$$('.suggestions').forEach(box=>{if(!e.target.closest('.autocomplete'))box.classList.remove('open')})});
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('blur',()=>setTimeout(autoDistance,120)));
let autoDistanceTimer=0;
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{clearTimeout(autoDistanceTimer);autoDistanceTimer=setTimeout(autoDistance,350);}));
function haversineKm(a,b){const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(b[0]-a[0]),dLon=rad(b[1]-a[1]);const q=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
async function resolveCityCoordinates(city,target){if(Array.isArray(city)&&Number.isFinite(Number(city[6]))&&Number.isFinite(Number(city[7])))return [Number(city[6]),Number(city[7])];const q=cityName(city);if(!q)return null;try{const url=`/api/cities?q=${encodeURIComponent(q)}&country=${target==='china'?'CN':'RU'}&limit=5`;const r=await fetch(url);if(!r.ok)return null;const d=await r.json();const x=(d.results||[]).find(v=>target==='china'?v.country_code==='CN':v.country_code==='RU');return x?[x.latitude,x.longitude]:null}catch{return null}}
let distanceRequestId=0;
async function autoDistance(){
 const requestId=++distanceRequestId;
 const fromText=$('#fromCity')?.value?.trim()||'', toText=$('#toCity')?.value?.trim()||'';
 if(!fromText||!toText){$('#distance').value='';$('#distance').dataset.auto='';const hs=$('#homeRouteStatus');if(hs)hs.textContent='Расстояние появится после выбора двух городов';return}
 const a=selectedCities.from && cityName(selectedCities.from)===fromText?selectedCities.from:[fromText];
 const b=selectedCities.to && cityName(selectedCities.to)===toText?selectedCities.to:[toText];
 const [ca,cb]=await Promise.all([resolveCityCoordinates(a,'china'),resolveCityCoordinates(b,'russia')]);
 if(requestId!==distanceRequestId||!ca||!cb)return;
 const km=Math.round(haversineKm(ca,cb));$('#distance').value=km;$('#distance').dataset.auto='1';
 const hs=$('#homeRouteStatus');if(hs)hs.textContent=`${fromText} → ${toText} · ${km.toLocaleString('ru-RU')} км`; showRecommendation(selectedForwarder);
}

function fitsContainer(dims, container){
 const sorted=[...dims].sort((a,b)=>b-a), c=[...container].sort((a,b)=>b-a);
 return sorted.every((v,i)=>v<=c[i]);
}
function containerFitWarning(){
 const box=$('#containerWarning'); if(!box)return;
 const dims=dimensionsMm(); const [l,w,h]=dims;
 if(!l||!w||!h){box.classList.add('hidden');return}
 const c20=[5898,2352,2390], c40=[12032,2352,2390], c40hc=[12032,2352,2690];
 let text='';
 if(fitsContainer(dims,c20)) text='';
 else if(fitsContainer(dims,c40)) text='⚠️ В 20 DC не войдёт. Потребуется 40 DC.';
 else if(fitsContainer(dims,c40hc)) text='⚠️ В 20 DC и 40 DC не войдёт. Потребуется 40 HC.';
 else text='⚠️ Габариты не помещаются даже в 40 HC. Нужен негабарит / OOG и отдельное согласование.';
 box.textContent=text;box.classList.toggle('hidden',!text);
}
['length','width','height','pieces'].forEach(id=>$('#'+id)?.addEventListener('input',containerFitWarning));
$$('.unit-choice').forEach(b=>b.addEventListener('click',()=>setDimensionUnit(b.dataset.unit)));
updateDimensionUnitUI();
containerFitWarning();
$('#calculate').onclick=()=>{const weight=Number($('#weight').value)||0,pieces=Number($('#pieces').value)||1,[l,w,h]=dimensionsMm();selectedFactor=selectedMode&&modes[selectedMode]?modes[selectedMode].factor:167;renderFactors();const volume=l*w*h/1e9*pieces,volumetric=volume*selectedFactor,charge=Math.max(weight,volumetric);const result=$('#result');result.classList.remove('hidden');result.innerHTML=`<strong>${lang==='ru'?'Объём':lang==='zh'?'体积':'Volume'}:</strong> ${volume.toFixed(3)} m³ <span class="result-muted">(${selectedMode?modeName(selectedMode):(lang==='ru'?'авиа':lang==='zh'?'空运':'Air')})</span>`;containerFitWarning();showRecommendation(selectedForwarder)};

let distanceTimer=null;
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{clearTimeout(distanceTimer);distanceTimer=setTimeout(autoDistance,450)}));
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('change',autoDistance));

// AI chat
function getCalculatorContext(){
 return {from:$('#fromCity')?.value||'',to:$('#toCity')?.value||'',distanceKm:Number($('#distance')?.value)||null,weightKg:Number($('#weight')?.value)||null,pieces:Number($('#pieces')?.value)||null,lengthMm:dimensionsMm()[0]||null,widthMm:dimensionsMm()[1]||null,heightMm:dimensionsMm()[2]||null,forwarder:selectedForwarder||'',transport:selectedMode?modeName(selectedMode):'',incoterms:$('#incotermBtn span')?.textContent||'EXW'};
}
async function sendAI(fromVoice=false){
 if(!fromVoice){try{currentAIaudio?.pause();currentAIaudio=null;window.speechSynthesis?.cancel();stopInterruptMonitor()}catch{}}
 const input=$('#assistantInput'),msg=input.value.trim(),files=[...($('#aiFile')?.files||[])];
 if(!msg&&!files.length)return;
 const shown=msg||(files.length?`📎 ${files.map(f=>f.name).join(', ')}`:''); addChat('user',shown,false); input.value=''; setAIThinking(true);
 try{
  let imported=0;
  if(msg && /(ставк|кп|коммерчес|тариф|цена|usd|cny|руб|eur|rate|quote)/i.test(msg)){try{const ir=await fetch('/api/rates/import-text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:msg,note:getCalculatorContext()})});const id=await ir.json();if(ir.ok)imported+=Number(id.added||0)}catch{}}
  for(const file of files){const fd=new FormData();fd.append('file',file);fd.append('note',msg);const ir=await fetch('/api/rates/import',{method:'POST',body:fd});const id=await ir.json();if(!ir.ok)throw new Error(id.error||'Не удалось обработать файл');imported+=Number(id.added||0)}
  if(imported)await loadRates();
  const finalMessage=msg||(imported?`Я загрузил ${files.length} файл(а). Проанализируй новые ставки и скажи, что добавилось в базу.`:'');
  if(!finalMessage){setAIThinking(false);return}
  const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({message:finalMessage,history:chatHistory,context:getCalculatorContext(),importedRates:imported})});
  const d=await r.json();if(!r.ok){setAIThinking(false,d.error==='AI key not configured'?tr('aiOff'):(d.error||'AI error'));return}
  const text=String(d.text||'').trim();setAIThinking(false);addChat('assistant',text||'Готово.',fromVoice);chatHistory.push({role:'user',content:finalMessage},{role:'assistant',content:text});chatHistory=chatHistory.slice(-12);if($('#aiFile'))$('#aiFile').value='';if($('#fileNames'))$('#fileNames').textContent='Файл можно добавить вместе с сообщением';
 }catch(e){setAIThinking(false,e?.message||tr('aiOff'))}
}
function setAIThinking(on,error=''){const s=$('#assistantStatus');if(on){s.innerHTML='<span class="thinking-orb" aria-hidden="true"><i></i><i></i><i></i></span><span>'+tr('thinking')+'</span>';s.classList.add('thinking-active')}else{s.innerHTML=error?`<span>${error}</span>`:'';s.classList.remove('thinking-active')}}
function addChat(role,text,shouldSpeak=false){const d=document.createElement('div');d.className=`chat-bubble ${role}`;d.textContent=text;$('#chatMessages').appendChild(d);$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;if(role==='assistant'&&shouldSpeak)speakAI(text)}
$('#aiFile')?.addEventListener('change',e=>{const fs=[...e.target.files];const el=$('#fileNames');if(el)el.textContent=fs.length?fs.map(f=>f.name).join(' · '):'Файл можно добавить вместе с сообщением'});$('#sendAI').onclick=sendAI;$('#assistantInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()}});


// Forwarder directory: clear contact table.
function translatedTransportLabel(m){const x=normalizeText(m); if(x.includes('авиа')||x==='air')return tr('transportAir'); if(x.includes('авто')||x==='road')return tr('transportRoad'); if(x.includes('жд')||x==='rail')return tr('transportRail'); if(x.includes('море + жд')||x.includes('sea + rail')||x==='multimodal')return tr('transportMulti'); if(x.includes('море')||x==='sea')return tr('transportSea'); return m}
function renderDirectory(){
 const grid=$('#directoryGrid'), filters=$('#directoryFilters'); if(!grid||!filters)return;
 filters.innerHTML=''; const allModes=[['all',tr('all')],...modeGroups.map(([k,key])=>[k,tr(key)])];
 allModes.forEach(([key,label])=>{const b=document.createElement('button');b.className='directory-filter'+(key==='all'?' active':'');b.textContent=label;b.onclick=()=>{filters.querySelectorAll('.directory-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDirectoryItems(key)};filters.appendChild(b)});
 renderDirectoryItems('all');
 function renderDirectoryItems(mode){grid.innerHTML='';const rows=agentDirectory.filter(a=>mode==='all'||(a.modes||[]).includes(mode)||(mode==='rail'&&(a.modes||[]).includes('multimodal'))||(mode==='sea'&&(a.modes||[]).includes('multimodal')));rows.forEach(a=>{const tr=document.createElement('tr');const site=a.site?`<a href="${a.site.startsWith('http')?a.site:'https://'+a.site}" target="_blank" rel="noopener">${a.site.replace(/^https?:\/\//,'')}</a>`:'—';tr.innerHTML=`<td><b>${a.company||'—'}</b></td><td>${a.contact||'—'}</td><td>${a.phone||'—'}</td><td>${a.email||'—'}</td><td>${site}</td><td>${(a.transport||[]).map(translatedTransportLabel).join(', ')||'—'}</td><td>${a.notes||'—'}</td>`;grid.appendChild(tr)})}
}

// Voice AI: hands-free conversation with automatic end-of-speech detection and barge-in.
let mediaRecorder=null, voiceChunks=[], voiceListening=false, voiceAutoSpeak=true, voiceAutoStopTimer=null;
let voiceStream=null, voiceAnalyser=null, voiceAudioContext=null, voiceVadFrame=0, voiceStartedAt=0, voiceSpeechSeen=false, voiceLastSpeechAt=0;
let currentAIaudio=null, interruptStream=null, interruptContext=null, interruptFrame=0;
function voiceLang(){return lang==='zh'?'zh':lang==='en'?'en':'ru'}
function voiceText(key){
 const m={
  listen:{ru:'Слушаю…',en:'Listening…',zh:'正在聆听…'},
  transcribe:{ru:'Распознаю…',en:'Transcribing…',zh:'正在识别…'},
  ready:{ru:'Готов к разговору',en:'Ready to talk',zh:'准备对话'},
  recognized:{ru:'Речь распознана',en:'Speech recognized',zh:'已识别语音'},
  mic:{ru:'Разреши доступ к микрофону',en:'Allow microphone access',zh:'请允许麦克风访问'},
  unavailable:{ru:'Микрофон временно недоступен',en:'Microphone is temporarily unavailable',zh:'麦克风暂时不可用'},
  unsupported:{ru:'Голосовой ввод не поддерживается этим браузером',en:'Voice input is not supported by this browser',zh:'此浏览器不支持语音输入'},
  fail:{ru:'Не удалось распознать голос',en:'Voice recognition failed',zh:'语音识别失败'}
 };
 return m[key]?.[lang]||m[key]?.ru||key;
}
function setVoiceUI(active,state){
 const btn=$('#voiceButton'),orb=$('#voiceOrb'),el=$('#voiceState');
 btn?.classList.toggle('listening',active); orb?.classList.toggle('listening',active);
 if(el&&state)el.textContent=state;
}
function stopVoiceTracks(){voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;try{voiceAudioContext?.close()}catch{}voiceAudioContext=null;voiceAnalyser=null;if(voiceVadFrame)cancelAnimationFrame(voiceVadFrame);voiceVadFrame=0}
function monitorSpeech(){
 if(!voiceListening||!voiceAnalyser)return;
 const data=new Uint8Array(voiceAnalyser.fftSize);voiceAnalyser.getByteTimeDomainData(data);
 let sum=0;for(const v of data){const x=(v-128)/128;sum+=x*x} const rms=Math.sqrt(sum/data.length);
 const now=performance.now();
 if(rms>0.028){voiceSpeechSeen=true;voiceLastSpeechAt=now;}
 if(voiceSpeechSeen && now-voiceStartedAt>900 && now-voiceLastSpeechAt>1250){stopVoice();return;}
 voiceVadFrame=requestAnimationFrame(monitorSpeech);
}
async function startVoice(){
 const btn=$('#voiceButton');
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setVoiceUI(false,voiceText('unsupported'));return}
 try{
  // If the assistant is speaking, this is a barge-in: stop its speech immediately.
  if(currentAIaudio){try{currentAIaudio.pause();currentAIaudio.currentTime=0}catch{}currentAIaudio=null;window.speechSynthesis?.cancel();stopInterruptMonitor();}
  voiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x))||'';
  mediaRecorder=new MediaRecorder(voiceStream,mime?{mimeType:mime}:undefined);voiceChunks=[];voiceListening=true;voiceStartedAt=performance.now();voiceSpeechSeen=false;voiceLastSpeechAt=voiceStartedAt;
  setVoiceUI(true,voiceText('listen'));
  voiceAudioContext=new (window.AudioContext||window.webkitAudioContext)();
  const src=voiceAudioContext.createMediaStreamSource(voiceStream);voiceAnalyser=voiceAudioContext.createAnalyser();voiceAnalyser.fftSize=512;src.connect(voiceAnalyser);
  mediaRecorder.ondataavailable=e=>{if(e.data.size)voiceChunks.push(e.data)};
  mediaRecorder.onstop=async()=>{
   const rec=mediaRecorder; const blob=new Blob(voiceChunks,{type:rec?.mimeType||'audio/webm'});
   stopVoiceTracks();voiceListening=false;clearTimeout(voiceAutoStopTimer);voiceAutoStopTimer=null;setVoiceUI(false,voiceText('transcribe'));
   try{
    const fd=new FormData();fd.append('file',blob,'voice.'+(blob.type.includes('mp4')?'mp4':'webm'));fd.append('language',voiceLang());
    const r=await fetch('/api/transcribe',{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error||'Transcription failed');
    const text=String(d.text||'').trim();if(!text)throw new Error('No speech');
    $('#assistantInput').value=text;setVoiceUI(false,voiceText('recognized'));await sendAI(true);
   }catch(e){setVoiceUI(false,(e?.message&&e.message!=='No speech')?e.message:voiceText('fail'))}
   setTimeout(()=>{if(!voiceListening)$('#voiceState').textContent=voiceText('ready')},1800);
  };
  mediaRecorder.start(120);
  clearTimeout(voiceAutoStopTimer); voiceAutoStopTimer=setTimeout(()=>{if(voiceListening)stopVoice()},30000);
  voiceVadFrame=requestAnimationFrame(monitorSpeech);
 }catch(e){stopVoiceTracks();voiceListening=false;setVoiceUI(false,e?.name==='NotAllowedError'?voiceText('mic'):voiceText('unavailable'))}
}
function stopVoice(){if(mediaRecorder&&voiceListening){try{mediaRecorder.stop()}catch{}}}
let rtcPC=null, rtcDC=null, rtcStream=null, rtcAudio=null, rtcConnected=false;
async function startRealtime(){
  if(rtcConnected){ rtcDC?.send(JSON.stringify({type:'response.cancel'})); return; }
  const btn=$('#voiceButton');
  try{
    btn.classList.add('listening'); $('#voiceOrb')?.classList.add('listening'); setVoiceUI(true,tr('listen'));
    // The WebRTC offer is sent directly to the server. There is no separate
    // /api/realtime/session endpoint in this architecture.
    rtcPC=new RTCPeerConnection();
    rtcAudio=new Audio(); rtcAudio.autoplay=true;
    rtcPC.ontrack=e=>{rtcAudio.srcObject=e.streams[0];};
    rtcStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    rtcStream.getTracks().forEach(t=>rtcPC.addTrack(t,rtcStream));
    rtcDC=rtcPC.createDataChannel('oai-events');
    rtcDC.onopen=()=>{rtcConnected=true; setVoiceUI(true,tr('listen'));};
    rtcDC.onmessage=e=>handleRealtimeEvent(JSON.parse(e.data));
    const offer=await rtcPC.createOffer(); await rtcPC.setLocalDescription(offer);
    await new Promise(resolve=>{ if(rtcPC.iceGatheringState==='complete') return resolve(); const onState=()=>{if(rtcPC.iceGatheringState==='complete'){rtcPC.removeEventListener('icegatheringstatechange',onState);resolve();}}; rtcPC.addEventListener('icegatheringstatechange',onState); });
    const answerResp=await fetch('/api/realtime/call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:rtcPC.localDescription?.sdp||offer.sdp,language:lang,context:getCalculatorContext()})});
    const answerText=await answerResp.text();
    if(!answerResp.ok) {
      let message=answerText||'Realtime connection failed';
      try { const parsed=JSON.parse(answerText); message=parsed.error||message; } catch {}
      throw new Error(message);
    }
    // OpenAI returns a raw SDP answer, not JSON.
    if(!answerText.includes('v=0')) throw new Error('Invalid Realtime SDP answer');
    await rtcPC.setRemoteDescription({type:'answer',sdp:answerText});
  }catch(e){stopRealtime();setVoiceUI(false,e.message||tr('unavailable'));}
}
function handleRealtimeEvent(ev){
  if(ev.type==='input_audio_buffer.speech_started'){setVoiceUI(true,tr('listen'));return;}
  if(ev.type==='input_audio_buffer.speech_stopped'){setVoiceUI(true,tr('thinking'));return;}
  if(ev.type==='conversation.item.input_audio_transcription.completed'){
    const text=ev.transcript||''; if(text.trim()) addChat('user',text,false); return;
  }
  if(ev.type==='response.output_audio_transcript.delta'){
    if(!window._rtcAnswerText)window._rtcAnswerText=''; window._rtcAnswerText+=ev.delta||''; return;
  }
  if(ev.type==='response.output_audio_transcript.done'){
    const text=ev.transcript||window._rtcAnswerText||''; window._rtcAnswerText=''; if(text.trim())addChat('assistant',text,false); setVoiceUI(true,tr('listen')); return;
  }
  if(ev.type==='response.done'){setVoiceUI(true,tr('listen'));}
  if(ev.type==='error'){setVoiceUI(false,ev.error?.message||tr('unavailable'));}
}
function stopRealtime(){rtcConnected=false;try{rtcDC?.close()}catch{}try{rtcPC?.close()}catch{}rtcStream?.getTracks().forEach(t=>t.stop());rtcDC=null;rtcPC=null;rtcStream=null;rtcAudio=null;$('#voiceButton')?.classList.remove('listening');$('#voiceOrb')?.classList.remove('listening');setVoiceUI(false,tr('ready'));}
function initVoice(){const btn=$('#voiceButton');if(!btn)return;btn.onclick=()=>rtcConnected?stopRealtime():startRealtime();}
function stopInterruptMonitor(){if(interruptFrame)cancelAnimationFrame(interruptFrame);interruptFrame=0;interruptStream?.getTracks().forEach(t=>t.stop());interruptStream=null;try{interruptContext?.close()}catch{}interruptContext=null}
async function monitorInterrupt(audio){
 try{
  interruptStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  interruptContext=new (window.AudioContext||window.webkitAudioContext)();const src=interruptContext.createMediaStreamSource(interruptStream);const an=interruptContext.createAnalyser();an.fftSize=512;src.connect(an);
  const data=new Uint8Array(an.fftSize);let loud=0;
  const loop=()=>{
   if(!currentAIaudio||currentAIaudio!==audio||audio.paused){stopInterruptMonitor();return}
   an.getByteTimeDomainData(data);let sum=0;for(const v of data){const x=(v-128)/128;sum+=x*x}const rms=Math.sqrt(sum/data.length);
   if(rms>0.075)loud++;else loud=Math.max(0,loud-1);
   if(loud>=3){try{audio.pause();audio.currentTime=0}catch{}currentAIaudio=null;stopInterruptMonitor();setTimeout(()=>startVoice(),80);return}
   interruptFrame=requestAnimationFrame(loop);
  };interruptFrame=requestAnimationFrame(loop);
 }catch{}
}
async function speakAI(text){
 if(!voiceAutoSpeak||!text)return;
 window.speechSynthesis?.cancel();stopInterruptMonitor();
 try{
  const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:text,language:voiceLang()})});
  if(r.ok){const blob=await r.blob();const url=URL.createObjectURL(blob);const audio=new Audio(url);currentAIaudio=audio;audio.onended=()=>{URL.revokeObjectURL(url);if(currentAIaudio===audio){currentAIaudio=null;stopInterruptMonitor()}};audio.onerror=()=>{if(currentAIaudio===audio)currentAIaudio=null;stopInterruptMonitor()};await audio.play();monitorInterrupt(audio);return;}
 }catch{}
 if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(text);u.lang=lang==='zh'?'zh-CN':lang==='en'?'en-US':'ru-RU';u.rate=.96;u.pitch=.98;u.volume=1;window.speechSynthesis.speak(u)}
}
initVoice();

// News panel: обновляется с серверного RSS-кэша.
function formatToday(){const p=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());const d=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${d.day}.${d.month}.${d.year} г.`}
async function loadCurrency(){
  try {
    const r=await fetch('/api/currency',{credentials:'same-origin'});
    if(!r.ok) throw new Error('currency');
    const d=await r.json();
    $('#currencyDate').textContent=formatToday();
    const fmt=x=>x==null?'—':Number(x).toLocaleString('ru-RU',{minimumFractionDigits:4,maximumFractionDigits:4});
    $('#usdRate').textContent=fmt(d.items?.USD?.value);
    $('#eurRate').textContent=fmt(d.items?.EUR?.value);
    $('#cnyRate').textContent=fmt(d.items?.CNY?.value);$('#homeCny').textContent=fmt(d.items?.CNY?.value);$('#homeUsd').textContent=fmt(d.items?.USD?.value);$('#homeEur').textContent=fmt(d.items?.EUR?.value);
  }catch{['usdRate','eurRate','cnyRate','homeCny','homeUsd','homeEur'].forEach(id=>{const el=$('#'+id);if(el&&el.textContent==='—')el.title='Курс временно недоступен'});}
}

async function loadNews(){
  const box=$('#newsList'); box.innerHTML=`<div class="news-loading">${tr('newsLoading')}</div>`;
  try{
    const r=await fetch('/api/news'); const d=await r.json();
    if(!d.items?.length){box.innerHTML=`<div class="news-loading">${tr('noNews')}</div>`;return}
    box.innerHTML='';
    d.items.forEach((n,i)=>{
      const a=document.createElement('button'); a.type='button'; a.className='news-item';
      a.innerHTML=`${n.image?`<img class="news-thumb" src="${escapeHtml(n.image)}" alt="" loading="lazy">`:''}<span class="news-item-copy"><strong>${escapeHtml(n.title)}</strong><small>${escapeHtml(n.source||'')} · ${n.date?new Date(n.date).toLocaleDateString(lang==='ru'?'ru-RU':lang==='zh'?'zh-CN':'en-US'):''}</small></span>`;
      a.onclick=()=>openArticle(n); box.appendChild(a);
    });
  }catch{box.innerHTML=`<div class="news-loading">${tr('noNews')}</div>`}
}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderArticleMarkdown(text=''){
  const safe=escapeHtml(text); return safe.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split(/\n\s*\n/).map(p=>p.trim()?`<p>${p.replace(/\n/g,'<br>')}</p>`:'').join('');
}
async function openArticle(n){
  currentArticleNews=n; openView('article'); const box=$('#articleContent'); box.innerHTML=`<div class="article-loading">${tr('articleLoading')}</div>`;
  try{
    const r=await fetch('/api/news/article',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:n.title,description:n.description||'',source:n.source||'',date:n.date||'',link:n.link||'',image:n.image||'',language:lang})});
    const d=await r.json(); if(!r.ok||!d.ok)throw new Error(d.error||tr('articleError'));
    const a=d.article||{};
    box.innerHTML=`<div class="article-hero">${a.image?`<img src="${escapeHtml(a.image)}" alt="" loading="eager">`:''}<div class="article-hero-shade"></div><div class="article-title"><span class="eyebrow">${escapeHtml(a.source||n.source||'')}</span><h1>${escapeHtml(a.title||n.title)}</h1><p>${escapeHtml(a.subtitle||'')}</p></div></div><div class="article-body">${renderArticleMarkdown(a.content||'')}<div class="article-source">${tr('articleSource')} · ${escapeHtml(a.source||n.source||'')}</div><section class="podcast-card"><div><span class="eyebrow">${tr('articleListen')}</span><h3>${escapeHtml(a.audioTitle||a.title||n.title)}</h3></div><button id="articleAudioBtn" class="podcast-button">▶ ${tr('articlePlay')}</button><audio id="articleAudio" controls preload="none"></audio></section></div>`;
    const btn=$('#articleAudioBtn'), audio=$('#articleAudio'); let loaded=false;
    btn.onclick=async()=>{ if(!loaded){btn.disabled=true;btn.textContent='…'; try{const rr=await fetch('/api/news/article/audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:a.podcast||a.content||'',language:lang})}); if(!rr.ok)throw new Error(); const blob=await rr.blob(); audio.src=URL.createObjectURL(blob);loaded=true; audio.play();btn.textContent='❚❚ '+tr('articlePause')}catch{btn.textContent='⚠ '+tr('articleError');btn.disabled=false}} else if(audio.paused){audio.play();btn.textContent='❚❚ '+tr('articlePause')}else{audio.pause();btn.textContent='▶ '+tr('articlePlay')}};
    audio.onended=()=>btn.textContent='▶ '+tr('articlePlay');
  }catch(e){box.innerHTML=`<div class="article-loading">${escapeHtml(e.message||tr('articleError'))}</div>`}
}

function applyWeatherVisual(d){document.body.classList.remove('weather-night','weather-sun','weather-cloud','weather-rain','weather-snow','weather-storm');const now=Math.floor(Date.now()/1000);const night=d.sunrise&&d.sunset?(now<d.sunrise||now>d.sunset):false;const main=d.main||'';const icon=d.icon||'';document.body.classList.add(night?'weather-night':main==='Thunderstorm'?'weather-storm':main==='Rain'||main==='Drizzle'?'weather-rain':main==='Snow'?'weather-snow':main==='Clouds'?'weather-cloud':'weather-sun');document.documentElement.style.setProperty('--weather-clouds',Math.min(1,(Number(d.clouds)||0)/100));document.documentElement.style.setProperty('--weather-wind',Math.min(1,(Number(d.wind)||0)/18));document.documentElement.style.setProperty('--weather-temp',Number(d.temp)||0);document.documentElement.dataset.weatherIcon=icon;const weatherNames={Clear:{ru:'Ясно',en:'Clear',zh:'晴'},Clouds:{ru:'Облачно',en:'Cloudy',zh:'多云'},Rain:{ru:'Дождь',en:'Rain',zh:'下雨'},Drizzle:{ru:'Морось',en:'Drizzle',zh:'毛毛雨'},Snow:{ru:'Снег',en:'Snow',zh:'下雪'},Thunderstorm:{ru:'Гроза',en:'Thunderstorm',zh:'雷雨'},Mist:{ru:'Туман',en:'Mist',zh:'雾'},Fog:{ru:'Туман',en:'Fog',zh:'雾'}};const hw=$('#homeWeatherText');if(hw)hw.textContent=`${weatherNames[main]?.[lang]||main}${d.temp!=null?' · '+Math.round(d.temp)+'°':''}`;const hs=$('#homeRouteStatus');if(hs&&$('#distance')?.value)hs.textContent=lang==='ru'?`Маршрут · ${Number($('#distance').value).toLocaleString('ru-RU')} км`:lang==='en'?`Route · ${Number($('#distance').value).toLocaleString('en-US')} km`:`路线 · ${Number($('#distance').value).toLocaleString('zh-CN')} 公里`;}
async function checkWeather(){try{const cfg=await fetch('/api/config',{cache:'no-store'}).then(r=>r.json());if(!cfg.weatherConfigured){setTimeWeather();return}const wr=await fetch('/api/weather',{cache:'no-store'});if(!wr.ok)throw new Error('weather');const d=await wr.json();applyWeatherVisual(d)}catch{setTimeWeather()}}
async function backgroundRefresh(){await Promise.allSettled([checkWeather(),loadRates(),loadCurrency()]);}
checkWeather();setInterval(checkWeather,5*60*1000);
loadRates();renderIncoterms();renderFactors();applyLang();$('#currencyDate').textContent=formatToday();loadCurrency();setInterval(loadCurrency,30*60*1000);
setInterval(()=>fetch('/api/health',{cache:'no-store'}).catch(()=>{}),2*60*1000);
setInterval(()=>{fetch('/api/news',{cache:'no-store'}).catch(()=>{})},30*60*1000);
window.addEventListener('error',e=>{console.warn('iomastavka:',e.error||e.message)});window.addEventListener('unhandledrejection',e=>{console.warn('iomastavka promise:',e.reason)});


// Keep the workspace alive when the browser returns to the tab.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')backgroundRefresh()});
window.addEventListener('online',()=>backgroundRefresh());
setInterval(()=>{if(document.visibilityState==='visible')backgroundRefresh()},10*60*1000);
