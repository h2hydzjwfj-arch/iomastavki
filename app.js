const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const I18N = {
  ru:{title:'Расчёт ставки',from:'Откуда',to:'Куда',cargo:'ГРУЗ',weight:'Вес, кг',pieces:'Количество мест',distance:'Расстояние, км',auto:'Автоматически',dimensions:'ГАБАРИТЫ ОДНОГО МЕСТА',volumeAll:'Объём — по всем местам',length:'Длина',width:'Ширина',height:'Высота',forwarder:'Экспедитор',transport:'Вид транспорта',incoterms:'Условия поставки',dimWeight:'Объёмный вес',chooseForwarder:'Выберите экспедитора',chooseTransport:'Выберите транспорт',selected:'ЭКСПЕДИТОР',none:'Не выбран',calculate:'Рассчитать',agents:'Экспедиторы',assistant:'ИИ-ассистент',assistantSub:'Спросите что угодно по логистике',assistantHelp:'Можно писать обычным языком: маршрут, ставка, Incoterms, таможня, расчёт веса или новая ставка.',send:'Отправить',news:'Новости',newsSub:'Логистика · Китай · Таможня',logout:'Выйти',thinking:'Думаю…',aiOff:'ИИ не подключён. Добавьте OPENAI_API_KEY в Render.',newsLoading:'Загружаю новости…',noNews:'Новости пока недоступны.',weatherError:'Погода временно недоступна.',todayDate:'15.09.2026 г.',home:'Главная',heroEyebrow:'ЛОГИСТИКА · КИТАЙ → РОССИЯ',heroText:'Точный расчёт. Умный помощник.\nВсё необходимое для работы с грузом — в одном месте.',tileRates:'Расчёт ставок',tileRatesSub:'Маршрут, ставка и транспорт',tileAI:'AI-ассистент',tileAISub:'Текстом или голосом',tileAgents:'Экспедиторы',tileAgentsSub:'Контакты и направления перевозок',tileNews:'Новости ВЭД',tileNewsSub:'Китай · логистика · таможня',directoryEyebrow:'СПРАВОЧНИК',directorySub:'Поставщики и контакты по направлениям.',intelligence:'ИНТЕЛЛЕКТ',assistantSub2:'Логистика, расчёты и ВЭД — голосом или текстом.',attach:'Файл',fileHint:'Файл можно добавить вместе с сообщением',voice:'Микрофон',intelligenceFeed:'ИНФОРМАЦИОННАЯ ЛЕНТА',newsSub2:'Китай · логистика · таможня',chargeWeight:'Расчётный вес',company:'Компания',contact:'Контакт',phone:'Телефон',email:'Email',website:'Сайт',directions:'Направления',note:'Примечание',all:'Все',close:'Закрыть',weatherUpdating:'',distanceWaiting:'',autoByTransport:'Автоматически по транспорту',transportRail:'ЖД',transportRoad:'Авто',transportAir:'Авиа',transportSea:'Море',transportMulti:'Море + ЖД',menu:'Меню',ready:'Готов к разговору',listen:'Слушаю…',transcribe:'Расшифровываю…',recognized:'Речь распознана',fail:'Не удалось распознать голос',mic:'Нет доступа к микрофону',unavailable:'Голос недоступен',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'ЦБ РФ',articleLoading:'Готовлю статью…',articleError:'Не удалось подготовить статью.',articleListen:'Аудиоподкаст',articlePlay:'Слушать',articlePause:'Пауза',articleSource:'Материал подготовлен на основе новости',articleBack:'К новостям'},
  en:{title:'Rate calculation',from:'From',to:'To',cargo:'CARGO',weight:'Weight, kg',pieces:'Pieces',distance:'Distance, km',auto:'Automatic',dimensions:'DIMENSIONS OF ONE PIECE',volumeAll:'Volume — all pieces',length:'Length',width:'Width',height:'Height',forwarder:'Forwarder',transport:'Transport',incoterms:'Incoterms',dimWeight:'Volumetric weight',chooseForwarder:'Choose forwarder',chooseTransport:'Choose transport',selected:'FORWARDER',none:'Not selected',calculate:'Calculate',agents:'Forwarders',assistant:'AI assistant',assistantSub:'Ask anything about logistics',assistantHelp:'Write naturally: route, rate, Incoterms, customs, weight calculation or a new rate.',send:'Send',news:'News',newsSub:'Logistics · China · Customs',logout:'Log out',thinking:'Thinking…',aiOff:'AI is not connected. Add OPENAI_API_KEY in Render.',newsLoading:'Loading news…',noNews:'News are temporarily unavailable.',weatherError:'Weather is temporarily unavailable.',todayDate:'15.09.2026',home:'首页',heroEyebrow:'物流 · 中国 → 俄罗斯',heroText:'精准报价。智能助手。\n货运工作所需的一切，都在这里。',tileRates:'运价计算',tileRatesSub:'路线、运价和运输方式',tileAI:'AI 助手',tileAISub:'文字或语音',tileAgents:'货运代理',tileAgentsSub:'联系方式和运输方向',tileNews:'外贸新闻',tileNewsSub:'中国 · 物流 · 海关',directoryEyebrow:'通讯录',directorySub:'按运输方向查看供应商和联系方式。',intelligence:'智能',assistantSub2:'物流、运价和外贸 — 支持语音或文字。',attach:'文件',fileHint:'可以随消息添加文件',voice:'麦克风',intelligenceFeed:'资讯',newsSub2:'中国 · 物流 · 海关',chargeWeight:'Chargeable weight',company:'Company',contact:'Contact',phone:'Phone',email:'Email',website:'Website',directions:'Directions',note:'Note',all:'All',close:'Close',weatherUpdating:'',distanceWaiting:'',autoByTransport:'Automatic by transport',transportRail:'Rail',transportRoad:'Road',transportAir:'Air',transportSea:'Sea',transportMulti:'Sea + Rail',menu:'Menu',ready:'Ready to talk',listen:'Listening…',transcribe:'Transcribing…',recognized:'Speech recognized',fail:'Could not recognize speech',mic:'Microphone access denied',unavailable:'Voice unavailable',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'CBR',articleLoading:'Preparing article…',articleError:'Could not prepare the article.',articleListen:'Audio podcast',articlePlay:'Listen',articlePause:'Pause',articleSource:'Prepared from the selected news item',articleBack:'Back to news'},
  zh:{title:'运价计算',from:'起运地',to:'目的地',cargo:'货物',weight:'重量，公斤',pieces:'件数',distance:'距离，公里',auto:'自动',dimensions:'单件尺寸',volumeAll:'体积 — 所有件',length:'长度',width:'宽度',height:'高度',forwarder:'货运代理',transport:'运输方式',incoterms:'贸易术语',dimWeight:'体积重量',chooseForwarder:'选择货运代理',chooseTransport:'选择运输方式',selected:'货运代理',none:'未选择',calculate:'计算',agents:'货运代理',assistant:'AI 助手',assistantSub:'咨询物流问题',assistantHelp:'可以直接输入路线、运价、贸易术语、清关或体积重量问题。',send:'发送',news:'新闻',newsSub:'物流 · 中国 · 海关',logout:'退出',thinking:'思考中…',aiOff:'AI 尚未连接。请在 Render 添加 OPENAI_API_KEY。',newsLoading:'正在加载新闻…',noNews:'暂时没有新闻。',weatherError:'天气暂时不可用。',todayDate:'15.09.2026',home:'首页',heroEyebrow:'物流 · 中国 → 俄罗斯',heroText:'精准报价。智能助手。\n货运工作所需的一切，都在这里。',tileRates:'运价计算',tileRatesSub:'路线、运价和运输方式',tileAI:'AI 助手',tileAISub:'文字或语音',tileAgents:'货运代理',tileAgentsSub:'联系方式和运输方向',tileNews:'外贸新闻',tileNewsSub:'中国 · 物流 · 海关',directoryEyebrow:'通讯录',directorySub:'按运输方向查看供应商和联系方式。',intelligence:'智能',assistantSub2:'物流、运价和外贸 — 支持语音或文字。',attach:'文件',fileHint:'可以随消息添加文件',voice:'麦克风',intelligenceFeed:'资讯',newsSub2:'中国 · 物流 · 海关',chargeWeight:'计费重量',company:'公司',contact:'联系人',phone:'电话',email:'邮箱',website:'网站',directions:'运输方向',note:'备注',all:'全部',close:'关闭',weatherUpdating:'',distanceWaiting:'',autoByTransport:'根据运输方式自动计算',transportRail:'铁路',transportRoad:'公路',transportAir:'空运',transportSea:'海运',transportMulti:'海运 + 铁路',menu:'菜单',ready:'准备好开始对话',listen:'正在听…',transcribe:'正在转写…',recognized:'已识别语音',fail:'无法识别语音',mic:'没有麦克风权限',unavailable:'语音不可用',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'中国人民银行',articleLoading:'正在准备文章…',articleError:'无法生成文章。',articleListen:'音频播客',articlePlay:'播放',articlePause:'暂停',articleSource:'根据所选新闻整理',articleBack:'返回新闻'}
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
 $$('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(key==='heroText')el.innerHTML=tr(key).replace(/\n/g,'<br>');else el.textContent=tr(key)});
 const ph=lang==='zh'?['中国城市','俄罗斯城市']:lang==='en'?['City in China','City in Russia']:['Город в Китае','Город в России'];
 $('#fromCity').placeholder=ph[0]; $('#toCity').placeholder=ph[1]; $('#distance').placeholder='0';
 $('#weight').placeholder='0'; $('#pieces').placeholder='1'; $('#length').placeholder='0'; $('#width').placeholder='0'; $('#height').placeholder='0';
 $('#assistantInput').placeholder=lang==='zh'?'输入消息…':lang==='en'?'Write a message…':'Напишите сообщение…';
 $('#fileNames').textContent=tr('fileHint'); $('#voiceState').textContent=tr('ready');
 $('.close-button').forEach?.(x=>{});
 $$('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',tr(el.dataset.i18nAria)));
 $('#menuButton')?.setAttribute('title',tr('menu')); $('#menuButton')?.setAttribute('aria-label',tr('menu'));
 $$('.close-button').forEach(el=>{el.setAttribute('aria-label',tr('close'));el.setAttribute('title',tr('close'))});
 $$('.lang').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang)); localStorage.setItem('iomastavka_lang',lang);
 setDimensionLabels(); renderForwarderMenu(); renderTransportMenu(); renderIncoterms(); renderFactors();
 renderSuggestions($('#fromSuggestions'),$('#fromCity').value.trim()?cityMatches($('#fromCity').value,'china'):[],$('#fromCity'),'china');
 renderSuggestions($('#toSuggestions'),$('#toCity').value.trim()?cityMatches($('#toCity').value,'russia'):[],$('#toCity'),'russia');
 $('#currencyDate').textContent=formatToday();
 if($('#forwardersView')?.classList.contains('open'))renderDirectory();
 if($('#newsView')?.classList.contains('open'))loadNews();
 if($('#articleView')?.classList.contains('open')&&currentArticleNews)openArticle(currentArticleNews);
 updateCityPlaceholders();
}
$$('.lang').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;applyLang();autoDistance()});

function updateCityPlaceholders(){
 const examples={ru:[['Пекин','Шанхай','Нинбо','Гуанчжоу'],['Москва','Санкт-Петербург','Екатеринбург','Новосибирск']],en:[['Beijing','Shanghai','Ningbo','Guangzhou'],['Moscow','Saint Petersburg','Yekaterinburg','Novosibirsk']],zh:[['北京','上海','宁波','广州'],['莫斯科','圣彼得堡','叶卡捷琳堡','新西伯利亚']]};
 const arr=examples[lang]||examples.ru; let i=0;
 clearInterval(window.cityPlaceholderTimer); const tick=()=>{if(!$('#fromCity')?.value)$('#fromCity').placeholder=arr[0][i%arr[0].length];if(!$('#toCity')?.value)$('#toCity').placeholder=arr[1][i%arr[1].length];i++};tick();window.cityPlaceholderTimer=setInterval(tick,2000);
}

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
function cityName(c){if(Array.isArray(c)) return String(c[1]||c[0]||c[2]||'').trim(); if(c&&typeof c==='object') return String(c.name||c.nameEn||c.nameZh||'').trim(); return String(c||'').trim()}
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
async function resolveCityCoordinates(city,target){if(Array.isArray(city)&&Number.isFinite(Number(city[6]))&&Number.isFinite(Number(city[7])))return [Number(city[6]),Number(city[7])];const q=cityName(city);if(!q)return null;try{const url=`/api/cities?q=${encodeURIComponent(q)}&country=${target==='china'?'CN':'RU'}&limit=5`;const r=await fetch(url);if(!r.ok)return null;const d=await r.json();const x=(d.results||[]).find(v=>{const cc=String(v.country_code||'').toUpperCase();return (target==='china'?cc==='CN':cc==='RU')&&Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))}) || (d.results||[]).find(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude)));return x?[Number(x.latitude),Number(x.longitude)]:null}catch{return null}}
let distanceRequestId=0;
async function autoDistance(){
 const requestId=++distanceRequestId;
 const fromText=$('#fromCity')?.value?.trim()||'', toText=$('#toCity')?.value?.trim()||'';
 if(!fromText||!toText){$('#distance').value='';$('#distance').dataset.auto='';return}
 const a=selectedCities.from && cityName(selectedCities.from)===fromText?selectedCities.from:[fromText];
 const b=selectedCities.to && cityName(selectedCities.to)===toText?selectedCities.to:[toText];
 const [ca,cb]=await Promise.all([resolveCityCoordinates(a,'china'),resolveCityCoordinates(b,'russia')]);
 if(requestId!==distanceRequestId||!ca||!cb)return;
 const km=Math.round(haversineKm(ca,cb));$('#distance').value=km;$('#distance').dataset.auto='1';
 showRecommendation(selectedForwarder);
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

// AI chat: полностью локальный бесплатный режим. Файлы извлекаются в браузере.
function getCalculatorContext(){return {from:$('#fromCity')?.value||'',to:$('#toCity')?.value||'',distanceKm:Number($('#distance')?.value)||null,weightKg:Number($('#weight')?.value)||null,pieces:Number($('#pieces')?.value)||null,lengthMm:dimensionsMm()[0]||null,widthMm:dimensionsMm()[1]||null,heightMm:dimensionsMm()[2]||null,forwarder:selectedForwarder||'',transport:selectedMode?modeName(selectedMode):'',incoterms:$('#incotermBtn span')?.textContent||'EXW'};}
function setAIThinking(on,error=''){const s=$('#assistantStatus');if(!s)return;if(on){s.innerHTML='<span class="thinking-orb" aria-hidden="true"><i></i><i></i><i></i></span><span>'+tr('thinking')+'</span>';s.classList.add('thinking-active')}else{s.innerHTML=error?`<span>${escapeHtml(error)}</span>`:'';s.classList.remove('thinking-active')}}
function addChat(role,text,shouldSpeak=false){const d=document.createElement('div');d.className=`chat-bubble ${role}`;d.textContent=text;$('#chatMessages').appendChild(d);$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;if(role==='assistant'&&shouldSpeak)speakAI(text)}
async function extractAttachment(file){
 const name=file.name.toLowerCase(), ext=name.split('.').pop();
 if(['txt','csv','json','text','md','markdown','rtf'].includes(ext)){let t=await file.text();if(ext==='rtf')t=t.replace(/\\[a-z]+\d* ?/gi,'').replace(/[{}]/g,'');return t.slice(0,120000)}
 if(ext==='pdf'){const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let out='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),c=await page.getTextContent();out+=c.items.map(x=>x.str||'').join(' ')+'\n';if(out.length>120000)break}return out.slice(0,120000)}
 if(['xlsx','xls'].includes(ext)){const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});return wb.SheetNames.map(n=>`[${n}]\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n').slice(0,120000)}
 if(ext==='docx'){const mammoth=await import('https://cdn.jsdelivr.net/npm/mammoth@1.9.0/+esm');const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return r.value.slice(0,120000)}
 if(['png','jpg','jpeg','webp'].includes(ext)){const T=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm');const r=await T.recognize(file,lang==='zh'?'eng+chi_sim':lang==='en'?'eng':'rus+eng',{logger:m=>{if(m.status==='recognizing text')setAIThinking(true,`${tr('transcribe')} ${Math.round((m.progress||0)*100)}%`)}});return String(r.data.text||'').slice(0,120000)}
 throw new Error('Формат файла пока не поддерживается');
}
function detectRequestedAction(msg=''){const x=msg.toLowerCase();if(/перевед|translate|翻译/.test(x))return 'translate';if(/цифр|числ|numbers|extract.*number|数字/.test(x))return 'numbers';if(/структур|таблиц|структурир|structure|整理/.test(x))return 'structure';if(/ставк|кп|тариф|quote|rate|运价/.test(x))return 'rates';return 'analyze'}
async function parseRatesLocally(text,companyHint=''){
 const lower=text.toLowerCase();
 if(lower.includes('ruscargo')||lower.includes('rus cargo')||/fo?b\s*40hc\s*coc/i.test(text)){
  const destinations={Москва:[['Shanghai',9600],['Qingdao',9500],['Ningbo',9700],['Nansha',9700],['Xiamen',9600]],'Санкт-Петербург':[['Shanghai',9800],['Qingdao',9800],['Ningbo',9800],['Nansha',9900],['Xiamen',9900]],'Екатеринбург':[['Shanghai',9700],['Qingdao',9700],['Ningbo',9700],['Nansha',9800],['Xiamen',9800]],'Новосибирск':[['Shanghai',8800],['Qingdao',8800],['Ningbo',8700],['Nansha',8900],['Xiamen',8900]],Минск:[['Shanghai',9800],['Qingdao',9900],['Ningbo',9800],['Nansha',9800],['Xiamen',9800]]};
  const records=[];for(const [to,rows] of Object.entries(destinations))for(const [from,rate] of rows)records.push({company:'Ruscargo',from,to,mode:'rail',incoterms:'FOB',container:'40HC COC',rate,currency:'USD',basis:'container',transitDays:'30-35',validFrom:'2026-09-14',validUntil:null,source:'КП Ruscargo, предоставлено пользователем',sourceType:'user_quote',approximateAfterValidity:true,notes:'Индикативная ставка; брутто до 26 т; генеральный неопасный груз без батареек/АКБ; EXW/FCA: +600 USD к FOB; подтвердить наличие контейнеров и мест.'});return records;
 }
 return [];
}
async function importLocalRates(records){if(!records.length)return 0;const r=await fetch('/api/rates/import-local',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({records})});if(!r.ok)throw new Error('Не удалось сохранить ставки');const d=await r.json();return Number(d.added||0)}
async function sendAI(fromVoice=false){
 if(!fromVoice){try{currentAIaudio?.pause();currentAIaudio=null;window.speechSynthesis?.cancel()}catch{}}
 const input=$('#assistantInput'),msg=input.value.trim(),files=[...($('#aiFile')?.files||[])];if(!msg&&!files.length)return;
 const shown=msg||(files.length?`📎 ${files.map(f=>f.name).join(', ')}`:'');addChat('user',shown,false);input.value='';setAIThinking(true);
 try{
  let docs=[];for(const f of files){const text=await extractAttachment(f);docs.push({name:f.name,text});}
  let imported=0;for(const d of docs){const recs=await parseRatesLocally(d.text,d.name);if(recs.length)imported+=await importLocalRates(recs)}
  if(imported)await loadRates();
  const action=detectRequestedAction(msg);const fileContext=docs.length?docs.map(d=>`\n--- ФАЙЛ: ${d.name} ---\n${d.text}`).join('\n'):'';
  let instruction=msg||'Проанализируй прикрепленный файл и дай краткий полезный результат.';
  if(action==='rates'&&docs.length)instruction+=' Считай файл КП/ставками: выдели перевозчика, маршруты, транспорт, базис, цены, валюту, срок действия и ограничения. Скажи, какие ставки сохранены.';
  if(action==='numbers')instruction+=' Извлеки только важные цифры и подпиши, что каждая означает.';
  if(action==='translate')instruction+=` Переведи содержимое файла на ${lang==='ru'?'русский':lang==='en'?'английский':'китайский'} язык.`;
  if(action==='structure')instruction+=' Структурируй данные в удобные списки/таблицу.';
  const finalMessage=instruction+fileContext+(imported?`\n\nВ базу ставок уже сохранено записей: ${imported}. Учитывай их в ответе.`:'');
  if(!window.freeAI)throw new Error('Локальный ИИ ещё загружается. Попробуйте через секунду.');
  const text=await window.freeAI.chat(finalMessage,chatHistory,getCalculatorContext());setAIThinking(false);addChat('assistant',text,fromVoice);chatHistory.push({role:'user',content:finalMessage},{role:'assistant',content:text});chatHistory=chatHistory.slice(-12);if($('#aiFile'))$('#aiFile').value='';if($('#fileNames'))$('#fileNames').textContent=tr('fileHint');
 }catch(e){setAIThinking(false,e?.message||'Не удалось обработать запрос')}
}
$('#aiFile')?.addEventListener('change',e=>{const fs=[...e.target.files],el=$('#fileNames');if(el)el.textContent=fs.length?fs.map(f=>f.name).join(' · '):tr('fileHint')});$('#sendAI').onclick=sendAI;$('#assistantInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()}});

// Forwarder directory: clear contact table.
function normalizeText(s=''){return String(s).toLowerCase().trim().replace(/\s+/g,' ')}
function translatedTransportLabel(m){const x=normalizeText(m); if(x.includes('авиа')||x==='air')return tr('transportAir'); if(x.includes('авто')||x==='road')return tr('transportRoad'); if(x.includes('жд')||x==='rail')return tr('transportRail'); if(x.includes('море + жд')||x.includes('sea + rail')||x==='multimodal')return tr('transportMulti'); if(x.includes('море')||x==='sea')return tr('transportSea'); return m}
function renderDirectory(){
 const grid=$('#directoryGrid'), filters=$('#directoryFilters'); if(!grid||!filters)return;
 filters.innerHTML=''; const allModes=[['all',tr('all')],...modeGroups.map(([k,key])=>[k,tr(key)])];
 allModes.forEach(([key,label])=>{const b=document.createElement('button');b.className='directory-filter'+(key==='all'?' active':'');b.textContent=label;b.onclick=()=>{filters.querySelectorAll('.directory-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDirectoryItems(key)};filters.appendChild(b)});
 renderDirectoryItems('all');
 function renderDirectoryItems(mode){
  grid.innerHTML='';
  const groups=new Map();
  agentDirectory.filter(a=>mode==='all'||(a.modes||[]).includes(mode)||(mode==='rail'&&(a.modes||[]).includes('multimodal'))||(mode==='sea'&&(a.modes||[]).includes('multimodal'))).forEach(a=>{
   const key=normalizeTextCompany(a.company||''); if(!groups.has(key))groups.set(key,{company:a.company,contacts:new Set(),phones:new Set(),emails:new Set(),sites:new Set(),modes:new Set(),transport:new Set(),notes:new Set()});
   const g=groups.get(key);if(a.contact)g.contacts.add(a.contact);if(a.phone)g.phones.add(a.phone);if(a.email)a.email.split(/[,;]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>g.emails.add(x));if(a.site)g.sites.add(a.site);(a.modes||[]).forEach(x=>g.modes.add(x));(a.transport||[]).forEach(x=>g.transport.add(x));if(a.notes)g.notes.add(a.notes);
  });
  [...groups.values()].forEach(g=>{const trEl=document.createElement('tr');const sites=[...g.sites];const site=sites.length?sites.map(x=>`<a href="${x.startsWith('http')?x:'https://'+x}" target="_blank" rel="noopener">${x.replace(/^https?:\/\//,'')}</a>`).join('<br>'):'—';const contacts=[...g.contacts].join('<br>')||'—';const phones=[...g.phones].join('<br>')||'—';const emails=[...g.emails].join('<br>')||'—';const modes=[...g.modes].map(translatedTransportLabel).join(', ')||[...g.transport].map(translatedTransportLabel).join(', ')||'—';trEl.innerHTML=`<td><b>${escapeHtml(g.company||'—')}</b></td><td>${contacts}</td><td>${phones}</td><td>${emails}</td><td>${site}</td><td>${modes}</td><td>${[...g.notes].join('<br>')||'—'}</td>`;grid.appendChild(trEl)});
 }
}

// Voice: бесплатное распознавание речи браузером, без OpenAI API.
let recognition=null,voiceListening=false,voiceAutoSpeak=true;
function voiceLang(){return lang==='zh'?'zh-CN':lang==='en'?'en-US':'ru-RU'}
function setVoiceUI(on,text){$('#voiceButton')?.classList.toggle('listening',on);$('#voiceOrb')?.classList.toggle('listening',on);$('#voiceState').textContent=text||tr(on?'listen':'ready')}
function initVoice(){const btn=$('#voiceButton');if(!btn)return;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){btn.onclick=()=>setVoiceUI(false,tr('unavailable'));return}recognition=new SR();recognition.lang=voiceLang();recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
 recognition.onstart=()=>{voiceListening=true;setVoiceUI(true,tr('listen'))};
 recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t+' ';else interim+=t}const input=$('#assistantInput');if(finalText){input.value=(input.value.trim()?(input.value.trim()+' '):'')+finalText.trim();input.dispatchEvent(new Event('input'));setVoiceUI(true,tr('recognized'))}else if(interim)$('#voiceState').textContent=interim};
 recognition.onerror=e=>{voiceListening=false;setVoiceUI(false,e.error==='not-allowed'?tr('mic'):tr('fail'))};
 recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'))};
 btn.onclick=()=>{if(voiceListening){recognition.stop();return}recognition.lang=voiceLang();try{recognition.start()}catch{}}
}
function speakAI(text){if(!voiceAutoSpeak||!text||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=voiceLang();u.rate=.96;u.pitch=.98;u.volume=1;window.speechSynthesis.speak(u)}
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

function isUrgentNews(n){const x=normalize(String(n.title||'')+' '+String(n.description||'')).toLowerCase();return /(закон|законодатель|таможенн|пошлин|тариф|ставк.*пошлин|запрет|ограничен|санкц|лиценз|сертификат|обязательн|вступ(ил|ает).*сил|изменен.*правил|customs|tariff|duty|ban|restriction|regulation|law|licen[cs]|mandatory|sanction)/i.test(x)}
async function loadNews(){
  const box=$('#newsList'); box.innerHTML=`<div class="news-loading">${tr('newsLoading')}</div>`;
  try{
    const r=await fetch('/api/news'); const d=await r.json();
    if(!d.items?.length){box.innerHTML=`<div class="news-loading">${tr('noNews')}</div>`;return}
    box.innerHTML='';
    d.items.forEach((n,i)=>{
      const a=document.createElement('button'); a.type='button'; a.className='news-item'+(isUrgentNews(n)?' news-urgent':'');
      a.innerHTML=`${n.image?`<img class="news-thumb" src="${escapeHtml(n.image)}" alt="" loading="lazy">`:`<span class="news-thumb news-placeholder">✦</span>`}<span class="news-item-copy">${isUrgentNews(n)?'<em class="news-urgent-badge">'+(lang==='ru'?'СРОЧНО':lang==='en'?'URGENT':'紧急')+'</em>':''}<strong>${escapeHtml(n.title)}</strong><small>${escapeHtml(n.source||'')} · ${n.date?new Date(n.date).toLocaleDateString(lang==='ru'?'ru-RU':lang==='zh'?'zh-CN':'en-US'):''}</small></span>`;
      a.onclick=()=>openArticle(n); box.appendChild(a);
    });
  }catch{box.innerHTML=`<div class="news-loading">${tr('noNews')}</div>`}
}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderArticleMarkdown(text=''){
  const safe=escapeHtml(text); return safe.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split(/\n\s*\n/).map(p=>p.trim()?`<p>${p.replace(/\n/g,'<br>')}</p>`:'').join('');
}
async function openArticle(n){
  currentArticleNews=n; showView('article'); const box=$('#articleContent'); box.innerHTML=`<div class="article-loading">${tr('articleLoading')}</div>`;
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
updateCityPlaceholders();
checkWeather();setInterval(checkWeather,5*60*1000);
loadRates();renderIncoterms();renderFactors();applyLang();$('#currencyDate').textContent=formatToday();loadCurrency();setInterval(loadCurrency,30*60*1000);
setInterval(()=>fetch('/api/health',{cache:'no-store'}).catch(()=>{}),2*60*1000);
setInterval(()=>{fetch('/api/news',{cache:'no-store'}).catch(()=>{})},30*60*1000);
window.addEventListener('error',e=>{console.warn('iomastavka:',e.error||e.message)});window.addEventListener('unhandledrejection',e=>{console.warn('iomastavka promise:',e.reason)});


// Keep the workspace alive when the browser returns to the tab.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')backgroundRefresh()});
window.addEventListener('online',()=>backgroundRefresh());
setInterval(()=>{if(document.visibilityState==='visible')backgroundRefresh()},10*60*1000);
