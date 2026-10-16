(function(){
  'use strict';
  if(window.__iomaRoutePlannerV2) return;
  window.__iomaRoutePlannerV2=true;

  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.from((r||document).querySelectorAll(s));};
  var state={role:'guest',username:'',mode:'multimodal',field:'from',selectedOption:null,from:'shanghai',to:'moscow',routeTitle:'',routeDescription:''};

  var CITIES={
    shanghai:{id:'shanghai',name:'Шанхай',country:'Китай',region:'cn',x:718,y:196,kind:'city'},
    beijing:{id:'beijing',name:'Пекин',country:'Китай',region:'cn',x:689,y:145,kind:'city'},
    guangzhou:{id:'guangzhou',name:'Гуанчжоу',country:'Китай',region:'cn',x:694,y:218,kind:'city'},
    shenzhen:{id:'shenzhen',name:'Шэньчжэнь',country:'Китай',region:'cn',x:711,y:232,kind:'city'},
    yiwu:{id:'yiwu',name:'Иу',country:'Китай',region:'cn',x:706,y:188,kind:'city'},
    shenyang:{id:'shenyang',name:'Шэньян',country:'Китай',region:'cn',x:679,y:153,kind:'city'},
    manzhouli:{id:'manzhouli',name:'Маньчжурия',country:'Китай',region:'cn',x:615,y:127,kind:'border'},
    suifenhe:{id:'suifenhe',name:'Суйфэньхэ',country:'Китай',region:'cn',x:666,y:155,kind:'border'},
    heihe:{id:'heihe',name:'Хэйхэ',country:'Китай',region:'cn',x:639,y:143,kind:'border'},
    khorgos:{id:'khorgos',name:'Хоргос',country:'Китай',region:'cn',x:540,y:164,kind:'border'},
    erenhot:{id:'erenhot',name:'Эрэн-Хото',country:'Китай',region:'cn',x:610,y:164,kind:'border'},
    'zamyn-uud':{id:'zamyn-uud',name:'Замын-Ууд',country:'Монголия',region:'mn',x:620,y:179,kind:'border'},
    ulaanbaatar:{id:'ulaanbaatar',name:'Улан-Батор',country:'Монголия',region:'mn',x:558,y:151,kind:'city'},
    naushki:{id:'naushki',name:'Наушки',country:'Россия',region:'ru',x:514,y:127,kind:'border'},
    alashankou:{id:'alashankou',name:'Алашанькоу',country:'Китай',region:'cn',x:520,y:171,kind:'border'},
    moscow:{id:'moscow',name:'Москва',country:'Россия',region:'ru',x:390,y:125,kind:'city'},
    'saint-petersburg':{id:'saint-petersburg',name:'Санкт-Петербург',country:'Россия',region:'ru',x:367,y:106,kind:'city'},
    vladivostok:{id:'vladivostok',name:'Владивосток',country:'Россия',region:'ru',x:711,y:231,kind:'city'},
    blagoveshchensk:{id:'blagoveshchensk',name:'Благовещенск',country:'Россия',region:'ru',x:640,y:166,kind:'city'},
    ussuriysk:{id:'ussuriysk',name:'Уссурийск',country:'Россия',region:'ru',x:690,y:209,kind:'city'},
    novosibirsk:{id:'novosibirsk',name:'Новосибирск',country:'Россия',region:'ru',x:492,y:153,kind:'city'},
    yekaterinburg:{id:'yekaterinburg',name:'Екатеринбург',country:'Россия',region:'ru',x:446,y:141,kind:'city'},
    zabaikalsk:{id:'zabaikalsk',name:'Забайкальск',country:'Россия',region:'ru',x:625,y:135,kind:'border'},
    grodekovo:{id:'grodekovo',name:'Гродеково',country:'Россия',region:'ru',x:674,y:195,kind:'border'},
    dostyk:{id:'dostyk',name:'Достык',country:'Казахстан',region:'kz',x:525,y:178,kind:'border'},
    altynkol:{id:'altynkol',name:'Алтынколь',country:'Казахстан',region:'kz',x:548,y:165,kind:'border'},
    khabarovsk:{id:'khabarovsk',name:'Хабаровск',country:'Россия',region:'ru',x:674,y:175,kind:'city'},
    ningbo:{id:'ningbo',name:'Нинбо',country:'Китай',region:'cn',x:706,y:192,kind:'city'},
    qingdao:{id:'qingdao',name:'Циндао',country:'Китай',region:'cn',x:672,y:162,kind:'city'},
    tianjin:{id:'tianjin',name:'Тяньцзинь',country:'Китай',region:'cn',x:654,y:150,kind:'city'},
    dalian:{id:'dalian',name:'Далянь',country:'Китай',region:'cn',x:670,y:155,kind:'city'},
    xiamen:{id:'xiamen',name:'Сямэнь',country:'Китай',region:'cn',x:705,y:225,kind:'city'},
    chengdu:{id:'chengdu',name:'Чэнду',country:'Китай',region:'cn',x:627,y:191,kind:'city'},
    xian:{id:'xian',name:'Сиань',country:'Китай',region:'cn',x:644,y:176,kind:'city'},
    zhengzhou:{id:'zhengzhou',name:'Чжэнчжоу',country:'Китай',region:'cn',x:659,y:171,kind:'city'},
    chongqing:{id:'chongqing',name:'Чунцин',country:'Китай',region:'cn',x:635,y:202,kind:'city'},
    nansha:{id:'nansha',name:'Наньша / Гуанчжоу',country:'Китай',region:'cn',x:695,y:229,kind:'port'},
    yantian:{id:'yantian',name:'Яньтянь / Шэньчжэнь',country:'Китай',region:'cn',x:713,y:238,kind:'port'},
    chita:{id:'chita',name:'Чита',country:'Россия',region:'ru',x:620,y:130,kind:'city'},
    'ulan-ude':{id:'ulan-ude',name:'Улан-Удэ',country:'Россия',region:'ru',x:550,y:137,kind:'city'},
    irkutsk:{id:'irkutsk',name:'Иркутск',country:'Россия',region:'ru',x:530,y:151,kind:'city'},
    krasnoyarsk:{id:'krasnoyarsk',name:'Красноярск',country:'Россия',region:'ru',x:500,y:146,kind:'city'},
    omsk:{id:'omsk',name:'Омск',country:'Россия',region:'ru',x:465,y:151,kind:'city'},
    astana:{id:'astana',name:'Астана',country:'Казахстан',region:'kz',x:469,y:163,kind:'city'},
    almaty:{id:'almaty',name:'Алматы',country:'Казахстан',region:'kz',x:535,y:190,kind:'city'},
    'nur-zholy':{id:'nur-zholy',name:'Нур Жолы',country:'Казахстан',region:'kz',x:539,y:163,kind:'border'},
    kanikurgan:{id:'kanikurgan',name:'Кани-Курган',country:'Россия',region:'ru',x:640,y:164,kind:'border'},
    pogranichny:{id:'pogranichny',name:'Пограничный',country:'Россия',region:'ru',x:680,y:195,kind:'border'},
    'nizhny-novgorod':{id:'nizhny-novgorod',name:'Нижний Новгород',country:'Россия',region:'ru',x:401,y:117,kind:'city'},
    kazan:{id:'kazan',name:'Казань',country:'Россия',region:'ru',x:421,y:135,kind:'city'},
    samara:{id:'samara',name:'Самара',country:'Россия',region:'ru',x:428,y:153,kind:'city'},
    'rostov-on-don':{id:'rostov-on-don',name:'Ростов-на-Дону',country:'Россия',region:'ru',x:384,y:169,kind:'city'},
    krasnodar:{id:'krasnodar',name:'Краснодар',country:'Россия',region:'ru',x:371,y:176,kind:'city'},
    novorossiysk:{id:'novorossiysk',name:'Новороссийск',country:'Россия',region:'ru',x:361,y:181,kind:'port'},
    volgograd:{id:'volgograd',name:'Волгоград',country:'Россия',region:'ru',x:398,y:162,kind:'city'},
    perm:{id:'perm',name:'Пермь',country:'Россия',region:'ru',x:437,y:127,kind:'city'},
    voronezh:{id:'voronezh',name:'Воронеж',country:'Россия',region:'ru',x:378,y:148,kind:'city'},
    'med-waypoint':{id:'med-waypoint',name:'Средиземное море',country:'Морской путь',region:'sea',x:300,y:160,kind:'waypoint'},
    malacca:{id:'malacca',name:'Малаккский пролив',country:'Морской путь',region:'sea',x:720,y:260,kind:'waypoint'},
    colombo:{id:'colombo',name:'Коломбо',country:'Морской путь',region:'sea',x:570,y:300,kind:'waypoint'},
    suez:{id:'suez',name:'Суэцкий канал',country:'Морской путь',region:'sea',x:448,y:235,kind:'waypoint'},
    gibraltar:{id:'gibraltar',name:'Гибралтар',country:'Морской путь',region:'sea',x:270,y:170,kind:'waypoint'},
    'north-sea':{id:'north-sea',name:'Северное море',country:'Морской путь',region:'sea',x:295,y:105,kind:'waypoint'},
    'baltic-sea':{id:'baltic-sea',name:'Балтийское море',country:'Морской путь',region:'sea',x:340,y:100,kind:'waypoint'},
    'east-china-sea':{id:'east-china-sea',name:'Восточно-Китайское море',country:'Морской путь',region:'sea',x:735,y:220,kind:'waypoint'},
    'korea-strait':{id:'korea-strait',name:'Корейский пролив',country:'Морской путь',region:'sea',x:735,y:195,kind:'waypoint'},
    'sea-of-japan':{id:'sea-of-japan',name:'Японское море',country:'Морской путь',region:'sea',x:734,y:160,kind:'waypoint'}
  };

  // Географические координаты узлов (широта, долгота); карта использует реальную проекцию.
  var GEO={
    shanghai:[31.2304,121.4737],beijing:[39.9042,116.4074],guangzhou:[23.1291,113.2644],
    shenzhen:[22.5431,114.0579],yiwu:[29.3068,120.0753],shenyang:[41.8057,123.4315],
    manzhouli:[49.5989,117.3784],suifenhe:[44.3998,131.1575],heihe:[50.2458,127.5285],
    khorgos:[44.2075,80.4128],erenhot:[43.6475,111.9767],'zamyn-uud':[43.7249,111.9045],
    ulaanbaatar:[47.9184,106.9177],naushki:[50.3827,106.1056],alashankou:[45.1833,82.5667],
    moscow:[55.7558,37.6173],'saint-petersburg':[59.9311,30.3609],vladivostok:[43.1155,131.8855],
    blagoveshchensk:[50.2906,127.5272],ussuriysk:[43.7973,131.9518],novosibirsk:[55.0084,82.9357],
    yekaterinburg:[56.8389,60.6057],zabaikalsk:[49.6514,117.3266],grodekovo:[44.399,131.291],
    dostyk:[45.253,82.493],altynkol:[45.979,82.611],khabarovsk:[48.4802,135.0719],
    ningbo:[29.8683,121.544],qingdao:[36.0671,120.3826],tianjin:[39.0842,117.201],dalian:[38.914,121.6147],
    xiamen:[24.4798,118.0894],chengdu:[30.5728,104.0668],xian:[34.3416,108.9398],zhengzhou:[34.7466,113.6254],chongqing:[29.563,106.5516],
    nansha:[22.8,113.6],yantian:[22.57,114.27],chita:[52.0336,113.501], 'ulan-ude':[51.8335,107.5842],
    irkutsk:[52.2869,104.305],krasnoyarsk:[56.0153,92.8932],omsk:[54.9885,73.3242],astana:[51.1694,71.4491],
    almaty:[43.2383,76.9451],'nur-zholy':[45.625,82.525],kanikurgan:[50.15,127.31],pogranichny:[43.806,131.96],
    'nizhny-novgorod':[56.2965,43.9361],kazan:[55.7961,49.1064],samara:[53.1959,50.1002],
    'rostov-on-don':[47.2357,39.7015],krasnodar:[45.0355,38.9753],novorossiysk:[44.7239,37.7689],
    volgograd:[48.708,44.5133],perm:[58.0105,56.2502],voronezh:[51.6608,39.2003],
    'med-waypoint':[36.5,19],'malacca':[2.5,101.4],colombo:[6.9271,79.8612],suez:[30.5852,32.2654],
    gibraltar:[36.14,-5.35],'north-sea':[55,3],'baltic-sea':[56.5,18],
    'east-china-sea':[29,128],'korea-strait':[34.3,129.5],'sea-of-japan':[40,133]
  };
  // Cities the customer can select as endpoints. Border crossings, transfer points,
  // and sea waypoints stay internal so the customer is not forced to choose a hub.
  var PICKABLE_CITIES=[
    'shanghai','beijing','guangzhou','shenzhen','yiwu','shenyang','ningbo','qingdao','tianjin','dalian',
    'xiamen','chengdu','xian','zhengzhou','chongqing',
    'moscow','saint-petersburg','vladivostok','blagoveshchensk','ussuriysk','khabarovsk',
    'novosibirsk','yekaterinburg','chita','irkutsk','nizhny-novgorod','kazan','samara',
    'rostov-on-don','krasnodar','novorossiysk','volgograd','perm'
  ];
  var leafletMap=null,leafletTileLayer=null,leafletRouteLayer=null,leafletMarkerLayer=null;
  function initLeafletMap(){
    var el=$('#routePlannerMap');
    if(!el||!window.L)return false;
    if(leafletMap)return true;
    leafletMap=L.map(el,{zoomControl:false,scrollWheelZoom:true,preferCanvas:true}).setView([48,100],3);
    L.control.zoom({position:'topright'}).addTo(leafletMap);
    var initialTiles=document.documentElement.classList.contains('dark')?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png':'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    leafletTileLayer=L.tileLayer(initialTiles,{
      subdomains:'abcd',maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
    }).addTo(leafletMap);
    leafletRouteLayer=L.layerGroup().addTo(leafletMap);
    leafletMarkerLayer=L.layerGroup().addTo(leafletMap);
    var toggle=document.getElementById('themeToggleButton');
    if(toggle)toggle.addEventListener('click',function(){setTimeout(updateLeafletTiles,80);});
    var observer=new MutationObserver(updateLeafletTiles);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    setTimeout(function(){leafletMap.invalidateSize();renderLeafletMap();},120);
    return true;
  }
  function updateLeafletTiles(){
    if(!leafletMap||!window.L)return;
    var dark=document.documentElement.classList.contains('dark');
    var url=dark
      ?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      :'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    if(leafletTileLayer)leafletMap.removeLayer(leafletTileLayer);
    leafletTileLayer=L.tileLayer(url,{subdomains:'abcd',maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'}).addTo(leafletMap);
  }
  function renderLeafletMap(){
    if(!initLeafletMap()||!leafletMap)return;
    leafletRouteLayer.clearLayers();leafletMarkerLayer.clearLayers();

    // The map deliberately starts with the two endpoints only. Intermediate
    // nodes appear only after the visitor explicitly selects a route option.
    var options=defaultCorridors(state.from,state.to,state.mode);
    var selected=state.selectedOption ? options.find(function(o){return o.id===state.selectedOption;}) : null;
    var pathIds=selected ? compactIds(selected.points||[state.from,state.to]) : [];
    var visibleIds=[state.from,state.to];
    if(selected) visibleIds=visibleIds.concat(pathIds);
    visibleIds=visibleIds.filter(function(id,i,all){return GEO[id]&&all.indexOf(id)===i;});

    visibleIds.forEach(function(id){
      var ll=GEO[id], c=city(id);
      var isFrom=id===state.from, isTo=id===state.to, isIntermediate=!isFrom&&!isTo;
      var icon=L.divIcon({
        className:'ioma-map-marker-wrap',
        html:'<span class="ioma-map-marker '+(isFrom?'is-origin':isTo?'is-destination':isIntermediate?'is-intermediate':'')+'"></span>',
        iconSize:[16,16],iconAnchor:[8,8]
      });
      var marker=L.marker(ll,{icon:icon,title:c.name,keyboard:true,alt:c.name}).addTo(leafletMarkerLayer);
      marker.bindTooltip(c.name+(c.country?' · '+c.country:''),{
        direction:'top',offset:[0,-7],className:'ioma-map-tooltip',permanent:false
      });
      marker.on('click',function(){
        if(isIntermediate){
          marker.openTooltip();
          return;
        }
        selectMapCity(id);
      });
    });

    if(selected && pathIds.length>1){
      var latlngs=pathIds.map(function(id){return GEO[id];}).filter(Boolean);
      if(latlngs.length>1){
        var isAir=selected.mode==='air'||state.mode==='air';
        var isSea=String(selected.id).indexOf('sea-')===0;
        var line=L.polyline(latlngs,{
          color:'#222',weight:isAir?1.8:2.4,opacity:.92,
          dashArray:isAir?'4 7':isSea?'8 6':null,
          lineCap:'round',lineJoin:'round'
        }).addTo(leafletRouteLayer);
        line.bindPopup(
          '<div><strong>'+esc(selected.title)+'</strong><br><small>Предварительный коридор. Геометрия схематична; точный маршрут, стыки, КПП и расписание подтверждает оператор.</small></div>',
          {className:'ioma-route-popup',closeButton:false}
        );
      }
    }

    var boundsIds=selected&&pathIds.length>1?pathIds:[state.from,state.to];
    var boundsPoints=boundsIds.map(function(id){return GEO[id];}).filter(Boolean);
    if(boundsPoints.length>1){
      var bounds=L.latLngBounds(boundsPoints);
      if(bounds.isValid())leafletMap.fitBounds(bounds.pad(selected?.15:.28),{
        maxZoom:selected?5:6,animate:true
      });
    }else if(boundsPoints.length===1){
      leafletMap.setView(boundsPoints[0],5,{animate:true});
    }
    setTimeout(function(){if(leafletMap)leafletMap.invalidateSize();},80);
  }
  var MODES={
    multimodal:{label:'Мультимодальная',short:'Мультимодальный',description:'Сочетание видов транспорта с перегрузкой в терминальных узлах.'},
    air:{label:'Авиа',short:'Авиа',description:'Аэропорт отправления → доступный грузовой хаб → таможня → доставка до адреса.'},
    rail:{label:'Железная дорога',short:'Ж/Д',description:'Контейнерный или вагонный сервис через железнодорожные погранпереходы.'},
    road:{label:'Авто',short:'Авто',description:'Автоперевозка через выбранный пункт пропуска с проверкой ограничений перевозчика.'},
    sea:{label:'Море',short:'Море + Ж/Д',description:'Морской участок до порта, терминальная обработка и возможное продолжение по железной дороге.'}
  };
  var SOURCE={
    manzhouli:{title:'Маньчжурия — Забайкальск — Транссиб',label:'ВОСТОЧНЫЙ Ж/Д КОРИДОР',source:'https://mintrans.gov.ru/press-center/news/12684',sourceLabel:'Минтранс РФ · проект развития перехода',proof:'Подтверждённый пограничный узел ЖД. Заявленное расширение инфраструктуры к 2030 году — план, не гарантия текущего слота. Конкретную станцию, формат контейнера и отправление подтверждает оператор.'},
    kazakhstan:{title:'Алашанькоу — Достык — Казахстан',label:'ЗАПАДНЫЙ Ж/Д КОРИДОР',source:'https://www.gov.kz/org/maidd/activities/2110',sourceLabel:'Правительство Казахстана · погранпереходы',proof:'Официально указана железнодорожная пара Достык (Казахстан) — Алашанькоу (Китай). Дальнейшее плечо, перегрузка/смена колеи, наличие поезда и срок должны подтверждаться экспедитором.'},
    khorgosRail:{title:'Хоргос — Алтынколь — Казахстан',label:'ЗАПАДНЫЙ Ж/Д КОРИДОР',source:'https://www.gov.kz/org/maidd/activities/2110',sourceLabel:'Правительство Казахстана · погранпереходы',proof:'Хоргос—Алтынколь — железнодорожная пара Китай—Казахстан. Это не автомобильный КПП. Стык, наличие места, тариф и дальнейший маршрут в РФ подтверждаются оператором на дату отправки.'},
    suifenhe:{title:'Суйфэньхэ — Гродеково — Уссурийск',label:'ДАЛЬНЕВОСТОЧНЫЙ Ж/Д КОРИДОР',source:'https://www.rzd-partner.ru/zhd-transport/news/perevozki-cherez-pogranichnye-perekhody-dvzhd-snizilis-na-1-3-za-10-mesyatsev-2025-goda/',sourceLabel:'РЖД-Партнёр · данные перехода за 2025 год',proof:'Переход Гродеково—Суйфэньхэ используется в железнодорожных грузоперевозках; отраслевой источник приводит объём за январь—октябрь 2025 года. Это не подтверждает свободный слот для конкретного груза.'},
    heihe:{title:'Хэйхэ — Кани-Курган — Благовещенск',label:'АМУРСКИЙ АВТОМОБИЛЬНЫЙ КОРИДОР',source:'https://mintrans.gov.ru/press-center/news/12676',sourceLabel:'Минтранс РФ · инфраструктура КПП',proof:'Минтранс сообщал о работе и модернизации автомобильного перехода Кани-Курган—Хэйхэ. Допуск конкретного груза, очередь, режим работы и транзитный документ проверяются перед отправкой.'},
    roadManzhouli:{title:'Авто через Маньчжурию — Забайкальск',label:'ВОСТОЧНЫЙ АВТОКОРИДОР',source:'https://forums.ati.su/forum/Topic.aspx?forumid=1112&topicid=b584db01-e8b6-ef11-bbc6-0cc47af31075',sourceLabel:'ATI.SU · обсуждение разрешений АСМАП',proof:'Отраслевое обсуждение ATI.SU описывает разрешения, привязанные к МАПП Маньчжурия—Забайкальск. Оно подтверждает практическую значимость этого перехода, но не текущую очередь, разрешения или возможность перевозки конкретного товара.'},
    roadKazakhstan:{title:'Авто через Хоргос — Нур Жолы — Казахстан',label:'ЗАПАДНЫЙ АВТОКОРИДОР',source:'https://www.gov.kz/org/maidd/activities/2110',sourceLabel:'Правительство Казахстана · автопереходы',proof:'Для автоперевозок используется пара Нур Жолы—Хоргос; Алтынколь относится к железнодорожной паре. Проверяйте документы для транзита через Казахстан, ограничения товара и действующие разрешения перевозчика.'},
    roadPrimorye:{title:'Авто через Суйфэньхэ — Пограничный — Уссурийск',label:'ПРИМОРСКИЙ АВТОКОРИДОР',source:'https://mintrans.gov.ru/press-center/news/12676',sourceLabel:'Минтранс РФ · развитие дальневосточных КПП',proof:'КПП Пограничный—Суйфэньхэ фигурирует в официальных сообщениях о развитии приграничной инфраструктуры. Перед заявкой проверяется фактический допуск грузового транспорта, режим работы и разрешения.'},
    mongolia:{title:'Эрэн-Хото — Замын-Ууд — Улан-Батор — Наушки',label:'ЦЕНТРАЛЬНЫЙ КОРИДОР ЧЕРЕЗ МОНГОЛИЮ',source:'https://mintrans.gov.ru/press-center/news/12241',sourceLabel:'Минтранс РФ · транспортный коридор',proof:'Минтранс РФ описывает развитие экономического коридора Россия—Монголия—Китай. Связка показана как кандидатный сценарий: наличие сервиса, транзитные разрешения, стык и слот должны быть подтверждены оператором.'},
    seaVlad:{title:'Китайский порт — Владивосток — доставка по РФ',label:'МОРЕ + Ж/Д / АВТО',source:'https://www.fesco.com/en/clients/region/intermodal-chinese-services/',sourceLabel:'FESCO · интермодальные перевозки Китай—Россия',proof:'FESCO указывает доставку Китай—Россия через Владивосток, Санкт-Петербург и Новороссийск, включая комбинации море/ЖД/авто и door-to-door. Конкретная линия, порт, слот и тариф подтверждаются оператором.'},
    seaNovo:{title:'Китайский порт — Новороссийск — авто / ЖД',label:'ЧЕРНОМОРСКИЙ МАРШРУТ',source:'https://www.fesco.com/en/clients/region/intermodal-chinese-services/',sourceLabel:'FESCO · интермодальные перевозки Китай—Россия',proof:'Новороссийск указан FESCO как один из портовых маршрутов Китай—Россия. Схема до внутреннего адреса строится отдельным железнодорожным или автомобильным плечом; судовой маршрут и перевалка зависят от конкретного сервиса.'},
    seaSpb:{title:'Китайский порт — Санкт-Петербург — авто / ЖД',label:'БАЛТИЙСКИЙ МАРШРУТ',source:'https://www.fesco.com/en/clients/region/intermodal-chinese-services/',sourceLabel:'FESCO · морские сервисы',proof:'Санкт-Петербург указан FESCO среди направлений Китай—Россия. Показанная линия через Суэц и далее в Балтику — иллюстрация географического коридора, а не карта конкретного судна или гарантированного прямого рейса.'},
    air:{title:'Авиа через доступный грузовой хаб',label:'АВИА / AIR CARGO',source:'https://www.fesco.com/ru/press-center/news/fesco-i-atc-global-logistics-organizovali-kompleksnuyu-aviaperevozku-21-tonny-gruza-iz-kitaya-v-ross/',sourceLabel:'FESCO · кейс авиаперевозки, 26.05.2026',proof:'FESCO описала комбинированную перевозку 21 тонны из Китая через HKIA Dongguan Logistics Park в Шереметьево. Это пример действовавшей схемы, а не обещание идентичного маршрута или свободного авиаслота сегодня.'}
  };

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function city(id){return CITIES[id]||{id:id,name:id,country:'',region:'',x:450,y:200,kind:'city'};}
  function cityName(id){var c=city(id);return c.name+(c.country?', '+c.country:'');}
  function isCrossBorder(from,to){return city(from).region!==city(to).region;}
  function isChRu(from,to){var a=city(from).region,b=city(to).region;return a!==b&&['cn','ru','mn'].includes(a)&&['cn','ru','mn'].includes(b);}
  function reverseForDirection(points,from,to){return city(from).region==='ru'&&city(to).region==='cn'?points.slice().reverse():points.slice();}
  function compactIds(ids){return (ids||[]).filter(function(id,i,all){return i===0||id!==all[i-1];});}
  function routeSteps(ids){return compactIds(ids).map(function(id){var p=city(id);return {id:id,name:p.name,country:p.country};});}
  function reverseSteps(ids,from,to){return routeSteps(reverseForDirection(ids,from,to));}
  function defaultCorridors(from,to,mode){
    var fromCity=city(from),toCity=city(to);
    var fromRegion=fromCity.region,toRegion=toCity.region;
    var cnFirst=fromRegion==='cn';
    var isChinaRussia=(fromRegion==='cn'&&toRegion==='ru')||(fromRegion==='ru'&&toRegion==='cn');
    if(!isChinaRussia){
      if(from===to)return [];
      return [{
        id:'domestic',mode:mode==='multimodal'?'road':mode,
        title:(fromRegion===toRegion?'Внутренняя доставка':'Маршрут требует проверки')+': '+cityName(from)+' → '+cityName(to),
        label:'ПРЕДВАРИТЕЛЬНЫЙ СЦЕНАРИЙ',
        points:[from,to],
        desc:'Этот подбор охватывает прежде всего коридоры Китай—Россия. Для выбранной пары требуется отдельно проверить внутренний или транзитный сервис; международный КПП автоматически не назначается.',
        source:null,
        fit:'Проверьте региональное плечо, документы и доступность перевозчика для выбранной пары.'
      }];
    }

    var cnCity=cnFirst?from:to;
    var ruCity=cnFirst?to:from;
    var farEast=['vladivostok','ussuriysk','khabarovsk','blagoveshchensk'].includes(ruCity);
    var southern=['novorossiysk','krasnodar','rostov-on-don','volgograd'].includes(ruCity);
    var western=['moscow','saint-petersburg','nizhny-novgorod','kazan','samara','perm','yekaterinburg','novosibirsk'].includes(ruCity);

    function trimAt(nodes,target){
      var clean=compactIds(nodes||[]);
      var idx=clean.indexOf(target);
      return idx>=0?clean.slice(0,idx):clean;
    }
    function orient(cnPath){
      var clean=compactIds(cnPath);
      return cnFirst?clean:clean.slice().reverse();
    }
    function make(id,modeId,title,label,cnNodes,desc,source,fit,extra){
      var cnPath=[cnCity].concat(cnNodes||[],[ruCity]);
      var points=orient(cnPath);
      var p={id:id,mode:modeId,title:title,label:label,points:points,desc:desc,source:source||null,fit:fit||'Параметры и доступность должны быть подтверждены оператором.'};
      if(extra&&extra.estimated)p.estimated=extra.estimated;
      p.steps=routeSteps(points);
      return p;
    }
    function eastRailNodes(target){
      var nodes;
      if(farEast)nodes=['manzhouli','zabaikalsk','chita','khabarovsk','ussuriysk'];
      else nodes=['manzhouli','zabaikalsk','chita','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function centralRailNodes(target){
      var nodes=['alashankou','dostyk','almaty','astana','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function khorgosRailNodes(target){
      var nodes=['khorgos','altynkol','almaty','astana','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function suifenheRailNodes(target){
      var nodes=farEast?['suifenhe','grodekovo','ussuriysk','khabarovsk']:['suifenhe','grodekovo','ussuriysk','khabarovsk','chita','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function mongoliaRailNodes(target){
      var nodes=['erenhot','zamyn-uud','ulaanbaatar','naushki','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function roadEastNodes(target){
      var nodes=farEast?['manzhouli','zabaikalsk','chita','khabarovsk','ussuriysk']:['manzhouli','zabaikalsk','chita','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function roadKazakhNodes(target){
      return trimAt(['khorgos','nur-zholy','almaty','astana','omsk','yekaterinburg','perm'],target);
    }
    function roadAmurNodes(target){
      var nodes=farEast?['heihe','kanikurgan','blagoveshchensk','khabarovsk']:['heihe','kanikurgan','blagoveshchensk','chita','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function roadPrimoryeNodes(target){
      var nodes=farEast?['suifenhe','pogranichny','ussuriysk','khabarovsk']:['suifenhe','pogranichny','ussuriysk','khabarovsk','chita','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      return trimAt(nodes,target);
    }
    function nearestChinesePort(id){
      var ports=['shanghai','ningbo','qingdao','tianjin','dalian','nansha','yantian','xiamen'];
      var origin=GEO[id]||GEO.shanghai,best='shanghai',bestD=Infinity;
      ports.forEach(function(pid){
        var ll=GEO[pid];if(!ll)return;
        var dx=(ll[1]-origin[1])*Math.cos((ll[0]+origin[0])*Math.PI/360),dy=ll[0]-origin[0];
        var d=dx*dx+dy*dy;
        if(d<bestD){bestD=d;best=pid;}
      });
      return best;
    }
    function inlandFromVlad(target){
      var line=['vladivostok','ussuriysk','khabarovsk','chita','ulan-ude','irkutsk','krasnoyarsk','novosibirsk','omsk','yekaterinburg','perm'];
      if(target==='blagoveshchensk')line=['vladivostok','ussuriysk','khabarovsk','blagoveshchensk'];
      return trimAt(line,target);
    }
    function inlandFromNovo(target){
      if(target==='novorossiysk')return [];
      if(target==='krasnodar')return ['krasnodar'];
      if(target==='rostov-on-don')return ['rostov-on-don'];
      if(target==='volgograd')return ['rostov-on-don','volgograd'];
      var line=['rostov-on-don','voronezh','moscow'];
      if(target==='saint-petersburg')line.push('saint-petersburg');
      if(target==='nizhny-novgorod')line=['rostov-on-don','voronezh','nizhny-novgorod'];
      if(target==='kazan')line=['rostov-on-don','voronezh','moscow','kazan'];
      return trimAt(line,target);
    }
    function inlandFromSpb(target){
      if(target==='saint-petersburg')return [];
      var line=['saint-petersburg','moscow'];
      if(target==='nizhny-novgorod')line.push('nizhny-novgorod');
      if(target==='kazan')line.push('kazan');
      return trimAt(line,target);
    }
    var cnPort=nearestChinesePort(cnCity);
    var vladSea=['east-china-sea','korea-strait','sea-of-japan','vladivostok'].concat(inlandFromVlad(ruCity));
    var novoSea=['malacca','colombo','suez','med-waypoint','novorossiysk'].concat(inlandFromNovo(ruCity));
    var spbSea=['malacca','colombo','suez','med-waypoint','gibraltar','north-sea','baltic-sea','saint-petersburg'].concat(inlandFromSpb(ruCity));
    var routes=[
      make('rail-manzhouli','rail',SOURCE.manzhouli.title,SOURCE.manzhouli.label,eastRailNodes(ruCity),
        'Железнодорожный вариант через китайскую станцию Маньчжурия, российский Забайкальск и далее по сети Транссиба. Промежуточные узлы на схеме — ориентир коридора, а не трек конкретного состава.',
        SOURCE.manzhouli,'Проверять для контейнерных и вагонных партий: стык, станцию отправления, терминал и актуальный слот.'),
      make('rail-dostyk','rail','Алашанькоу — Достык — Казахстан',SOURCE.kazakhstan.label,centralRailNodes(ruCity),
        'Западный железнодорожный сценарий через Алашанькоу—Достык, Казахстан и российскую сеть. Колея, перегрузка, станция передачи и доступность сервиса зависят от оператора.',
        SOURCE.kazakhstan,'Сравнить с восточным направлением по тарифу, типу контейнера, очереди на терминале и сроку, подтверждённому перевозчиком.'),
      make('rail-khorgos','rail','Хоргос — Алтынколь — Казахстан',SOURCE.khorgosRail.label,khorgosRailNodes(ruCity),
        'Альтернативный железнодорожный сценарий через Хоргос—Алтынколь. Алтынколь указан здесь именно как железнодорожный стык; для автомобиля используется другой КПП.',
        SOURCE.khorgosRail,'Имеет смысл сравнить с Алашанькоу—Достык, но выбирать станцию следует по фактической схеме экспедитора.'),
      make('rail-suifenhe','rail',SOURCE.suifenhe.title,SOURCE.suifenhe.label,suifenheRailNodes(ruCity),
        'Дальневосточный железнодорожный сценарий через Суйфэньхэ—Гродеково и далее по российской сети. Особенно полезен для северо-восточных регионов Китая и Приморья.',
        SOURCE.suifenhe,'Проверить доступность именно импортного сервиса, состав документов, перегрузку/смену колеи и станцию назначения.'),
      make('rail-mongolia','rail',SOURCE.mongolia.title,SOURCE.mongolia.label,mongoliaRailNodes(ruCity),
        'Кандидатный железнодорожный вариант через Эрэн-Хото, Замын-Ууд, Улан-Батор и Наушки. Не отображается как гарантированный сервис: оператор должен подтвердить движение на конкретной паре городов.',
        SOURCE.mongolia,'Использовать как запрос оператору, если он работает с транзитом через Монголию и подтверждает разрешения, стык и слот.'),
      make('road-manzhouli','road',SOURCE.roadManzhouli.title,SOURCE.roadManzhouli.label,roadEastNodes(ruCity),
        'Автомобильный маршрут через МАПП Маньчжурия—Забайкальск. Для грузовика учитываются тип кузова, разрешения, режим КПП, очередь, ограничения товара и доставка до двери.',
        SOURCE.roadManzhouli,'Сравнить с Казахстаном по текущим разрешениям, очередям и требованиям к документам на дату отправки.'),
      make('road-kazakhstan','road',SOURCE.roadKazakhstan.title,SOURCE.roadKazakhstan.label,roadKazakhNodes(ruCity),
        'Автомобильный коридор через Нур Жолы—Хоргос и Казахстан. Не путать с железнодорожной парой Хоргос—Алтынколь.',
        SOURCE.roadKazakhstan,'Проверить международные разрешения, транзитные документы, тип кузова и доступность дальнейшего въезда в РФ.'),
      make('road-amur','road',SOURCE.heihe.title,SOURCE.heihe.label,roadAmurNodes(ruCity),
        'Автомобильный сценарий через Хэйхэ—Кани-Курган—Благовещенск. После перехода требуется внутреннее российское плечо; возможность перевозки зависит от груза и перевозчика.',
        SOURCE.heihe,'В первую очередь рассматривать для северо-востока Китая и Амурского региона; для дальнего пункта сравнить общую стоимость и срок.'),
      make('road-primorye','road',SOURCE.roadPrimorye.title,SOURCE.roadPrimorye.label,roadPrimoryeNodes(ruCity),
        'Потенциальный автомобильный сценарий через Суйфэньхэ—Пограничный и Приморье. Не путать автомобильный КПП с железнодорожной связкой Гродеково—Суйфэньхэ.',
        SOURCE.roadPrimorye,'Подтвердить действующий режим КПП, допуск машины и груза, очередь и документы перед расчётом.'),
      make('sea-vladivostok','sea',SOURCE.seaVlad.title,SOURCE.seaVlad.label,[cnPort].concat(vladSea),
        'Морское плечо до Владивостока, затем контейнерная железная дорога или авто по России. Для внутренней доставки до двери добавляются терминал, таможня и последняя миля.',
        SOURCE.seaVlad,'Часто рассматривается для Дальнего Востока и как вариант море + Транссиб для центральных регионов.'),
      make('sea-novorossiysk','sea',SOURCE.seaNovo.title,SOURCE.seaNovo.label,[cnPort].concat(novoSea),
        'Морской сценарий через Суэцкий канал и Чёрное море до Новороссийска, далее авто или железная дорога. Фактическая линия, перевалка и доступность зависят от актуального сервиса и условий судоходства.',
        SOURCE.seaNovo,'Особенно стоит сравнить для юга России; для других регионов нужно добавить внутреннее плечо и сопоставить его стоимость с Владивостоком/Балтикой.'),
      make('sea-st-petersburg','sea',SOURCE.seaSpb.title,SOURCE.seaSpb.label,[cnPort].concat(spbSea),
        'Морской сценарий через Суэц, Средиземное море и Балтику до Санкт-Петербурга. Из порта возможно внутреннее железнодорожное или автомобильное плечо к получателю.',
        SOURCE.seaSpb,'Сравнить для Москвы и западной/северо-западной части России; прямой рейс и точный путь судна нельзя считать гарантированными.'),
      make('air','air',SOURCE.air.title,SOURCE.air.label,[],
        'Для авиа подбираются доступный грузовой аэропорт, при необходимости автодоставка до хаба, число стыковок и аэропорт прибытия. Маршрут на карте — только линия связи городов, а не траектория фактического рейса.',
        SOURCE.air,'Для срочного или компактного груза; заранее проверяют опасные грузы, аккумуляторы, упаковку, объёмный вес, cut-off и доступность слота.')
    ];

    // The sea lanes are alternatives only where the inland leg is meaningful;
    // the route card still makes the trade-offs explicit, not a promise of service.
    routes=routes.filter(function(p){
      if(p.id==='sea-novorossiysk'&&farEast)return false;
      if(p.id==='sea-st-petersburg'&&(farEast||southern))return false;
      if(p.id==='rail-mongolia'&&farEast)return false;
      return true;
    });
    var filtered=routes.filter(function(p){return mode==='multimodal'||p.mode===mode;});
    if(mode==='multimodal'){
      var rank;
      if(farEast)rank={'road-amur':0,'road-primorye':1,'rail-suifenhe':2,'sea-vladivostok':3,'rail-manzhouli':4,'road-manzhouli':5,'air':6,'rail-dostyk':7,'rail-khorgos':8,'sea-novorossiysk':9,'sea-st-petersburg':10};
      else if(southern)rank={'sea-novorossiysk':0,'road-kazakhstan':1,'road-manzhouli':2,'rail-manzhouli':3,'rail-dostyk':4,'rail-khorgos':5,'sea-vladivostok':6,'air':7,'sea-st-petersburg':8};
      else if(ruCity==='saint-petersburg')rank={'sea-st-petersburg':0,'rail-manzhouli':1,'rail-dostyk':2,'rail-khorgos':3,'road-kazakhstan':4,'road-manzhouli':5,'sea-vladivostok':6,'sea-novorossiysk':7,'air':8};
      else rank={'rail-manzhouli':0,'rail-dostyk':1,'rail-khorgos':2,'road-manzhouli':3,'road-kazakhstan':4,'sea-vladivostok':5,'sea-novorossiysk':6,'sea-st-petersburg':7,'air':8,'rail-suifenhe':9,'road-amur':10,'road-primorye':11,'rail-mongolia':12};
      filtered.sort(function(x,y){return (rank[x.id]===undefined?50:rank[x.id])-(rank[y.id]===undefined?50:rank[y.id]);});
      return filtered.slice(0,9);
    }
    if(mode==='rail')return filtered.slice(0,5);
    if(mode==='road')return filtered.slice(0,4);
    if(mode==='sea')return filtered.slice(0,3);
    return filtered.slice(0,1);
  }
  function updateRoleUI(){
    var role=$('#siteRoleBadge'),note=$('#siteModeNote'),guest=$('#routeGuestBanner'),notice=$('#servicesAccessNotice'),homeGuest=$('#homeGuestNote');
    var labels={guest:'ГОСТЬ',client:'КЛИЕНТ',admin:'АДМИНИСТРАТОР'};
    if(role)role.textContent=labels[state.role]||'ГОСТЬ';
    if(note)note.textContent=state.role==='guest'?'Гостевой режим · часть информации скрыта':state.role==='admin'?'Полный административный режим':'Клиентский доступ · личные заявки и инструменты';
    $$('[data-auth-nav]').forEach(function(el){el.hidden=state.role==='guest';});
    $$('[data-admin-nav]').forEach(function(el){el.hidden=state.role!=='admin';});
    $$('[data-gated-link="client"]').forEach(function(el){el.classList.toggle('is-locked',state.role==='guest');});
    $$('[data-gated-link="admin"]').forEach(function(el){el.classList.toggle('is-locked',state.role!=='admin');});
    if(guest)guest.hidden=state.role!=='guest';
    if(homeGuest)homeGuest.hidden=state.role!=='guest';
    if(notice)notice.hidden=state.role!=='guest';
    if(state.role==='admin'){$$('#adminView .admin-security-note').forEach(function(el){el.classList.add('admin-access-confirmed');});}
    var title=$('#servicesAccessTitle'),text=$('#servicesAccessText');
    if(title&&text){
      title.textContent=state.role==='guest'?'Часть функций доступна после входа':state.role==='admin'?'Административный режим активен':'Клиентский режим активен';
      text.textContent=state.role==='guest'?'В гостевом режиме доступны обзор платформы, карта коридоров и открытая информация. Тарифные инструменты, сохранение расчётов и расширенные справочники доступны после регистрации.':state.role==='admin'?'Доступ администратора предоставлен текущей серверной сессией.':'Клиентская сессия активна. Административные действия доступны только роли admin.';
    }
  }
  function checkRole(){
    return fetch('/api/whoami?t='+Date.now(),{credentials:'same-origin',cache:'no-store'})
      .then(function(r){return r.ok?r.json():{role:'guest'};})
      .then(function(d){state.role=d&&d.role?d.role:'guest';state.username=d&&d.username||'';updateRoleUI();return state.role;})
      .catch(function(){state.role='guest';updateRoleUI();return 'guest';});
  }
  function showToast(msg){
    if(typeof window.toast==='function')window.toast(msg,'info');
    else {var el=$('#siteToastFallback');if(!el){el=document.createElement('div');el.id='siteToastFallback';el.className='site-toast-fallback';document.body.appendChild(el);}el.textContent=msg;el.classList.add('is-visible');setTimeout(function(){el.classList.remove('is-visible');},3500);}
  }
  function goAuth(tab){ if(window.iomaOpenAuth)window.iomaOpenAuth(tab||'login'); else showToast('Откройте личный кабинет, чтобы войти или зарегистрироваться.');}
  function setUrl(path){try{history.pushState({},'',path);}catch(e){}}
  function closeCurrentViews(){
    $$('.view-layer.open').forEach(function(el){el.classList.remove('open');el.setAttribute('aria-hidden','true');});
    document.body.classList.remove('view-open');
    if(window.iomaCloseView)window.iomaCloseView();
  }
  function openCustomLayer(id,path){
    closeCurrentViews();
    var el=document.getElementById(id);
    if(!el){showToast('Раздел пока недоступен.');return;}
    el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('view-open');
    var w=el.querySelector('.route-workspace,.service-workspace,.request-shell,.directory-panel,.calculator-card,.article-shell,.assistant-shell,.customs-shell');
    if(w)w.scrollTop=0;
    if(path)setUrl(path);
  }
  function openLegacyView(name,path){
    closeCurrentViews();
    if(name==='request'){var requestTs=$('#requestTime');if(requestTs)requestTs.value=String(Date.now());}
    if(window.iomaOpenView)window.iomaOpenView(name);
    else {var el=document.getElementById(name+'View');if(el){el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('view-open');}}
    if(path)setUrl(path);
    if(name==='news'&&window.loadNews)window.loadNews();
  }
  function routeToPath(path,changeUrl){
    var u;try{u=new URL(path,location.origin);}catch(e){u=new URL('/',location.origin);}
    var p=u.pathname.replace(/\/+$/,'')||'/';
    var activeNav=({'/':'home','/routes':'routes','/services':'services','/news':'news','/rates':'rates','/forwarders':'forwarders','/customs':'customs','/admin':'admin'})[p]||'';
    $$('[data-page-route]').forEach(function(a){if(a.dataset.pageRoute===activeNav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(p==='/admin'&&state.role!=='admin'){showToast(state.role==='guest'?'Войдите, чтобы проверить доступ к административному разделу.':'Администрирование доступно только администратору.');if(state.role==='guest')goAuth('login');else window.location.href='/services';return;}
    if(['/rates','/forwarders','/customs'].includes(p)&&state.role==='guest'){showToast('Вы в гостевом режиме. Войдите или зарегистрируйтесь для доступа к этому разделу.');goAuth('register');return;}
    if(changeUrl)setUrl(p+(u.search||''));
    if(p==='/'){closeCurrentViews();return;}
    if(p==='/routes'){
      openCustomLayer('routesView',null);
      var fromParam=u.searchParams.get('from'),toParam=u.searchParams.get('to');
      if(fromParam&&CITIES[fromParam]){state.from=fromParam;var fromSelect=$('#routeFrom');if(fromSelect)fromSelect.value=fromParam;}
      if(toParam&&CITIES[toParam]){state.to=toParam;var toSelect=$('#routeTo');if(toSelect)toSelect.value=toParam;}
      if(u.searchParams.get('mode'))setMode(u.searchParams.get('mode'));
      renderRouteResults();return;
    }
    if(p==='/article'){openCustomLayer('articleView',null);loadArticlePage();return;}
    if(p==='/services'){openCustomLayer('servicesView',null);return;}
    if(p==='/admin'){openCustomLayer('adminView',null);return;}
    var map={'/rates':'calculator','/forwarders':'forwarders','/assistant':'assistant','/news':'news','/customs':'customs','/tarot':'tarot','/account':'account','/request':'request'};
    if(map[p]==='account'){openCustomLayer('accountView',null);return;}
    if(map[p]){openLegacyView(map[p],null);return;}
    openCustomLayer('servicesView',null);
  }
  function routeForView(name){
    var map={calculator:'/rates',forwarders:'/forwarders',assistant:'/assistant',news:'/news',customs:'/customs',tarot:'/tarot',article:'/news',request:'/request'};
    return map[name]||'/';
  }

  function makeSvg(name,attrs){
    var el=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.keys(attrs||{}).forEach(function(k){el.setAttribute(k,attrs[k]);});
    return el;
  }
  function ensureDynamicLayer(){
    var svg=$('#routePlannerMap');
    if(!svg)return null;
    var layer=$('#routeMapDynamic');
    if(!layer){layer=makeSvg('g',{id:'routeMapDynamic','class':'route-map-dynamic'});var markers=$('#routeMapMarkers');if(markers&&markers.parentNode===svg)svg.insertBefore(layer,markers);else svg.appendChild(layer);}
    return layer;
  }
  function renderMapMarkers(){
    if($('#routePlannerMap')&&$('#routePlannerMap').classList.contains('real-route-map')){renderLeafletMap();return;}
    var host=$('#routeMapMarkers');if(!host)return;
    host.innerHTML='';
    Object.keys(CITIES).filter(function(id){return ['shanghai','beijing','guangzhou','shenzhen','yiwu','shenyang','manzhouli','suifenhe','heihe','khorgos','alashankou','erenhot','zamyn-uud','ulaanbaatar','naushki','moscow','saint-petersburg','vladivostok','blagoveshchensk','ussuriysk','novosibirsk','yekaterinburg','zabaikalsk','grodekovo','dostyk','altynkol','khabarovsk'].includes(id);}).forEach(function(id){
      var c=city(id),g=makeSvg('g',{class:'route-map-city '+(id===state.from?'is-from':id===state.to?'is-to':''),'data-map-city':id,tabindex:'0',role:'button','aria-label':'Выбрать '+c.name});
      var ring=makeSvg('circle',{class:'city-marker-ring',cx:c.x,cy:c.y,r:id===state.from||id===state.to?11:6});
      var dot=makeSvg('circle',{class:'city-marker-dot',cx:c.x,cy:c.y,r:3.3});
      var offsets={manzhouli:{x:-72,y:-7},zabaikalsk:{x:9,y:16},heihe:{x:-35,y:-6},blagoveshchensk:{x:9,y:16},khorgos:{x:-23,y:-10},alashankou:{x:-52,y:13},altynkol:{x:9,y:-7},dostyk:{x:-32,y:15},suifenhe:{x:-49,y:-2},grodekovo:{x:8,y:14},ussuriysk:{x:9,y:15},khabarovsk:{x:8,y:-7},erenhot:{x:-49,y:-12},'zamyn-uud':{x:10,y:17},ulaanbaatar:{x:-54,y:-7},naushki:{x:-45,y:-12}};
      var off=offsets[id]||{x:8,y:-8};
      var text=makeSvg('text',{class:'city-marker-label',x:c.x+off.x,y:c.y+off.y});
      text.textContent=c.name;
      g.appendChild(ring);g.appendChild(dot);if(['shanghai','beijing','manzhouli','moscow','vladivostok','blagoveshchensk','khorgos','suifenhe','zabaikalsk','grodekovo','dostyk','altynkol','heihe','alashankou','khabarovsk','ussuriysk','erenhot','zamyn-uud','ulaanbaatar','naushki'].includes(id))g.appendChild(text);
      g.addEventListener('click',function(){selectMapCity(id);});
      g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectMapCity(id);}});
      host.appendChild(g);
    });
  }
  function renderDynamicRoute(){
    if($('#routePlannerMap')&&$('#routePlannerMap').classList.contains('real-route-map')){renderLeafletMap();return;}
    var layer=ensureDynamicLayer();if(!layer)return;
    layer.innerHTML='';
    var opts=defaultCorridors(state.from,state.to,state.mode);
    var opt=opts.find(function(o){return o.id===state.selectedOption;})||opts[0];
    if(!opt){renderMapMarkers();return;}
    var pts=compactIds(opt.points||[state.from,state.to]).map(function(id){return city(id);});
    if(pts.length<2)return;
    var d='M '+pts[0].x+' '+pts[0].y;
    for(var i=1;i<pts.length;i++){
      var a=pts[i-1],b=pts[i],midX=(a.x+b.x)/2,midY=Math.min(a.y,b.y)-Math.max(18,Math.abs(b.x-a.x)*.07);
      d+=' Q '+midX+' '+midY+' '+b.x+' '+b.y;
    }
    var glow=makeSvg('path',{d:d,class:'route-active-glow'});
    var path=makeSvg('path',{d:d,class:'route-active-line'});
    layer.appendChild(glow);layer.appendChild(path);
    var head=makeSvg('circle',{r:5,class:'route-moving-dot'});
    var animate=makeSvg('animateMotion',{path:d,dur:'5s',repeatCount:'indefinite',rotate:'auto'});
    head.appendChild(animate);layer.appendChild(head);
    renderMapMarkers();
  }
  function selectMapCity(id){
    if(!CITIES[id])return;
    state[state.field]=id;
    var sel=$('#route'+(state.field==='from'?'From':'To'));
    if(sel)sel.value=id;
    syncEndpoints();
    state.selectedOption=null;
    renderRouteResults();
  }
  function syncEndpoints(){
    var f=$('#routeFrom'),t=$('#routeTo');
    if(f&&CITIES[f.value])state.from=f.value;
    if(t&&CITIES[t.value])state.to=t.value;
    var fm=$('#routeFromMini'),tm=$('#routeToMini');
    if(fm)fm.textContent=cityName(state.from);
    if(tm)tm.textContent=cityName(state.to);
    $$('[data-route-field]').forEach(function(b){b.classList.toggle('is-active',b.dataset.routeField===state.field);b.setAttribute('aria-pressed',b.dataset.routeField===state.field?'true':'false');});
    renderMapMarkers();
  }
  function setMode(mode){
    if(!MODES[mode])mode='multimodal';
    state.mode=mode;state.selectedOption=null;
    $$('[data-route-mode]').forEach(function(b){b.classList.toggle('is-active',b.dataset.routeMode===mode);b.setAttribute('aria-pressed',b.dataset.routeMode===mode?'true':'false');});
    $$('.corridor-line').forEach(function(line){var id=line.dataset.corridor;var show=mode==='multimodal'||id===mode||(mode==='rail'&&['manzhouli','kazakhstan','mongolia','suifenhe'].includes(id))||(mode==='road'&&['manzhouli','kazakhstan','heihe','suifenhe'].includes(id))||(mode==='sea'&&id==='sea');line.classList.toggle('is-mode-active',show);});
    renderRouteResults();
  }
  function buildStepsMarkup(steps){
    return '<div class="route-option-steps">'+steps.map(function(s,i){return '<div class="route-step"><span class="route-step-index">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(s.name)+'</span>'+(s.country?'<small>'+esc(s.country)+'</small>':'')+'</div>';}).join('<span class="route-step-connector" aria-hidden="true"></span>')+'</div>';
  }
  function routeCard(p,index){
    var chosen=state.selectedOption===p.id;
    var steps=p.steps||routeSteps(p.points||[state.from,state.to]);
    return '<article class="route-option-card '+(chosen?'is-selected':'')+'" data-route-option-card="'+esc(p.id)+'">'+
      '<div class="route-option-head"><span class="route-option-number">'+String(index+1).padStart(2,'0')+'</span><span class="route-option-tag">'+esc(p.label)+'</span></div>'+
      '<h4>'+esc(p.title)+'</h4><p>'+esc(p.desc)+'</p>'+
      buildStepsMarkup(steps)+
      '<div class="route-option-fit"><b>Когда рассматривать</b><span>'+esc(p.fit)+'</span></div>'+
      (p.source&&p.source.proof?'<div class="route-source-proof"><b>Источник и ограничения</b><p>'+esc(p.source.proof)+'</p></div>':'')+
      (p.estimated?'<div class="route-time-note"><span>◷</span><span>'+esc(p.estimated)+'</span></div>':'')+
      '<div class="route-option-footer">'+(p.source&&p.source.source?'<a href="'+esc(p.source.source)+'" target="_blank" rel="noopener noreferrer">'+esc(p.source.sourceLabel)+' ↗</a>':'<span class="route-source-muted">Открытый источник не относится к этому локальному участку</span>')+'<button type="button" data-choose-route="'+esc(p.id)+'">'+(chosen?'Маршрут выбран':'Показать на карте')+' <span>→</span></button></div>'+
      '<button type="button" class="route-request-button" data-request-route="'+esc(p.id)+'">Запросить расчёт по маршруту ↗</button>'+
      '</article>';
  }
  function renderRouteResults(){
    var from=$('#routeFrom'),to=$('#routeTo');
    if(from&&CITIES[from.value])state.from=from.value;
    if(to&&CITIES[to.value])state.to=to.value;
    syncEndpoints();
    var opts=defaultCorridors(state.from,state.to,state.mode);
    var title=$('#routeResultsSubtitle'),count=$('#routeCount'),host=$('#routeOptions');
    if(title)title.textContent=cityName(state.from)+' → '+cityName(state.to)+' · '+MODES[state.mode].label;
    if(count)count.textContent=opts.length===1?'1 вариант':opts.length+' вариантов';
    if(host){
      if(city(state.from).id===city(state.to).id)host.innerHTML='<div class="route-empty-state">Выберите разные пункты отправления и назначения, чтобы сравнить коридоры.</div>';
      else if(!opts.length)host.innerHTML='<div class="route-empty-state">В открытом справочнике пока нет подтверждённого сценария для этого сочетания городов и вида транспорта. Попробуйте Ж/Д или мультимодальный режим либо запросите проверку у логиста. Мы не показываем неподтверждённые рейсы, ставки или сроки.</div>';
      else host.innerHTML=opts.map(routeCard).join('');
    }
    renderDynamicRoute();
  }
  function chooseRoute(id){
    var opts=defaultCorridors(state.from,state.to,state.mode);
    var p=opts.find(function(o){return o.id===id;});
    if(!p)return;
    state.selectedOption=id;state.routeTitle=p.title;state.routeDescription=p.desc;
    renderRouteResults();
    var card=$('[data-route-option-card="'+id+'"]');
    if(card)card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    var btn=$('#routeShowButton');if(btn)btn.innerHTML='<span>Варианты обновлены</span><b>✓</b>';
  }
  function startRequestForRoute(id){
    var opts=defaultCorridors(state.from,state.to,state.mode);
    var p=opts.find(function(o){return o.id===id;})||opts[0];
    if(!p)return;
    state.routeTitle=p.title;state.routeDescription=p.desc;
    var data={from:cityName(state.from),to:cityName(state.to),mode:MODES[state.mode].label,title:p.title,description:p.desc,steps:(p.steps||routeSteps(p.points||[state.from,state.to])).map(function(s){return s.name;}).join(' → '),at:new Date().toISOString(),source:(p.source&&p.source.source)||''};
    try{localStorage.setItem('iomaRouteDraft',JSON.stringify(data));}catch(e){}
    var message=$('#requestMessage');
    if(message)message.value='Маршрут: '+data.from+' → '+data.to+'\nВид перевозки: '+data.mode+'\nПредлагаемый коридор: '+data.title+'\nПромежуточные узлы: '+data.steps+'\nПараметры груза, срок и бюджет уточнить при расчёте.\nИсточник/описание коридора: '+data.source;
    var status=$('#requestStatus');
    if(status)status.textContent='Маршрут добавлен в заявку. Проверьте описание груза, укажите контакт и отправьте запрос.';
    window.location.href='/request';
  }

  function interceptClick(e){
    var transportEl=e.target.closest&&e.target.closest('[data-open-route-mode]');
    if(transportEl){
      e.preventDefault();
      var requestedMode=transportEl.dataset.openRouteMode||'multimodal';
      if(location.pathname.replace(/\/+$/,'')==='/routes'){
        setMode(requestedMode);
        var routeSelectors=$('#routeControlsPanel');
        if(routeSelectors)routeSelectors.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      } else {
        var fromValue=$('#routeFrom')&&$('#routeFrom').value||state.from||'shanghai';
        var toValue=$('#routeTo')&&$('#routeTo').value||state.to||'moscow';
        window.location.href='/routes?mode='+encodeURIComponent(requestedMode)+'&from='+encodeURIComponent(fromValue)+'&to='+encodeURIComponent(toValue);
      }
      return;
    }
    var modeEl=e.target.closest&&e.target.closest('[data-route-mode]');
    if(modeEl){e.preventDefault();setMode(modeEl.dataset.routeMode);return;}
    var fieldEl=e.target.closest&&e.target.closest('[data-route-field]');
    if(fieldEl){e.preventDefault();state.field=fieldEl.dataset.routeField;syncEndpoints();return;}
    var cityEl=e.target.closest&&e.target.closest('[data-map-city]');
    if(cityEl){e.preventDefault();selectMapCity(cityEl.dataset.mapCity);return;}
    var show=e.target.closest&&e.target.closest('#routeShowButton');
    if(show){e.preventDefault();state.selectedOption=null;renderRouteResults();var results=$('#routeResultsBlock');if(results)results.scrollIntoView({behavior:'smooth',block:'start'});return;}
    var choose=e.target.closest&&e.target.closest('[data-choose-route]');
    if(choose){e.preventDefault();chooseRoute(choose.dataset.chooseRoute);return;}
    var req=e.target.closest&&e.target.closest('[data-request-route]');
    if(req){e.preventDefault();startRequestForRoute(req.dataset.requestRoute);return;}
    var auth=e.target.closest&&e.target.closest('[data-open-auth]');
    if(auth){e.preventDefault();goAuth(auth.dataset.openAuth);return;}
    var newsCard=e.target.closest&&e.target.closest('.news-card');
    if(newsCard){
      var newsId=newsCard.getAttribute('data-news-id');
      if(newsId){
        e.preventDefault();e.stopImmediatePropagation();
        var sourceEl=newsCard.querySelector('.news-card-source');
        var dateEl=newsCard.querySelector('.news-card-date');
        try{localStorage.setItem('iomaNewsSelected',JSON.stringify({id:newsId,title:newsCard.getAttribute('data-news-title')||'',source:sourceEl?sourceEl.textContent:'',date:dateEl?dateEl.textContent:''}));}catch(ignore){}
        window.location.href='/article?id='+encodeURIComponent(newsId);
        return;
      }
    }
    var plane=e.target.closest&&e.target.closest('[data-open-route-mode]');
    if(plane){e.preventDefault();var m=plane.dataset.openRouteMode||'multimodal';if((location.pathname.replace(/\/+$/,'')||'/')==='/routes'){setMode(m);var modeBar=$('.route-mode-bar');if(modeBar)modeBar.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});}else{window.location.href='/routes?mode='+encodeURIComponent(m);}return;}
    var nav=e.target.closest&&e.target.closest('[data-page-route]');
    if(nav){e.preventDefault();window.location.href=nav.getAttribute('href')||'/';return;}
    var gate=e.target.closest&&e.target.closest('[data-gated-link]');
    if(gate){e.preventDefault();var type=gate.dataset.gatedLink;if((type==='admin'&&state.role!=='admin')||(type==='client'&&state.role==='guest')){goAuth(type==='admin'?'login':'register');return;}window.location.href=gate.getAttribute('href');return;}
    var link=e.target.closest&&e.target.closest('a[href^="/"]');
    if(link&&!link.target&&link.origin===location.origin){var dest=link.getAttribute('href');if(dest&&/^\/(routes|services|news|rates|forwarders|assistant|customs|account|admin|tarot|request)(\?|$|\/)/.test(dest)){e.preventDefault();window.location.href=dest;return;}}
    var openView=e.target.closest&&e.target.closest('[data-open-view]');
    if(openView){e.preventDefault();var name=openView.dataset.openView;window.location.href=routeForView(name);return;}
    var closeView=e.target.closest&&e.target.closest('[data-close-view]');
    if(closeView){e.preventDefault();window.location.href=closeView.dataset.closeView==='article'?'/news':'/';return;}
  }
  function onPopState(){routeToPath(location.pathname+location.search,false);}
  function initAdmin(){
    if(state.role!=='admin')return;
    function setStatus(id,msg){var el=$('#'+id);if(el)el.textContent=msg;}
    var fileInput=$('#adminRateFile'),fileButton=$('#adminRateFileButton'),topImport=$('#adminImportRates');
    if(fileButton&&fileInput)fileButton.addEventListener('click',function(){fileInput.click();});
    if(topImport&&fileInput)topImport.addEventListener('click',function(){fileInput.click();});
    if(fileInput)fileInput.addEventListener('change',function(){
      var file=fileInput.files&&fileInput.files[0];if(!file)return;
      var form=new FormData();form.append('file',file);
      setStatus('adminRateFileStatus','Загружаем '+file.name+'…');
      if(fileButton)fileButton.disabled=true;
      fetch('/api/rates/import',{method:'POST',credentials:'same-origin',body:form})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'Не удалось прочитать ответ'};}).then(function(d){return {ok:r.ok,data:d};});})
      .then(function(x){if(x.ok&&x.data&&x.data.ok){setStatus('adminRateFileStatus','Готово: добавлено записей — '+(x.data.added||0)+'. Проверьте результаты импорта и корректность ставок.');}
      else setStatus('adminRateFileStatus',(x.data&&x.data.error)||'Не удалось импортировать файл.');})
      .catch(function(){setStatus('adminRateFileStatus','Ошибка соединения при импорте файла.');})
      .finally(function(){if(fileButton)fileButton.disabled=false;fileInput.value='';});
    });

    var agentsButton=$('#adminAgentsImport');
    if(agentsButton)agentsButton.addEventListener('click',function(){
      var text=($('#adminAgentsText')&&$('#adminAgentsText').value||'').trim();
      if(!text){setStatus('adminAgentsStatus','Сначала вставьте данные компаний и контактов.');return;}
      agentsButton.disabled=true;setStatus('adminAgentsStatus','Обрабатываем данные…');
      fetch('/api/agents/import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text})})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'Не удалось прочитать ответ'};}).then(function(d){return {ok:r.ok,data:d};});})
      .then(function(x){if(x.ok&&x.data&&x.data.ok){setStatus('adminAgentsStatus','Импорт завершён. Проверьте карточки экспедиторов.');}
        else if(x.ok&&x.data){setStatus('adminAgentsStatus','Ответ сервера получен. Проверьте справочник после импорта.');}
        else setStatus('adminAgentsStatus',(x.data&&x.data.error)||'Не удалось импортировать контакты.');})
      .catch(function(){setStatus('adminAgentsStatus','Ошибка соединения при импорте.');})
      .finally(function(){agentsButton.disabled=false;});
    });

    var pbForm=$('#adminPlaybookForm');
    if(pbForm)pbForm.addEventListener('submit',function(e){
      e.preventDefault();
      var title=($('#adminPlaybookTitle')&&$('#adminPlaybookTitle').value||'').trim();
      var answer=($('#adminPlaybookAnswer')&&$('#adminPlaybookAnswer').value||'').trim();
      var keywords=($('#adminPlaybookKeywords')&&$('#adminPlaybookKeywords').value||'').trim();
      if(!title||!answer){setStatus('adminPlaybookStatus','Нужны название и текст проверенной инструкции.');return;}
      var btn=pbForm.querySelector('button[type="submit"]');if(btn)btn.disabled=true;setStatus('adminPlaybookStatus','Сохраняем…');
      fetch('/api/admin/playbook',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title,answer:answer,keywords:keywords})})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'Не удалось прочитать ответ'};}).then(function(d){return {ok:r.ok,data:d};});})
      .then(function(x){if(x.ok&&x.data&&x.data.ok){setStatus('adminPlaybookStatus','Инструкция добавлена в базу знаний.');pbForm.reset();}
        else setStatus('adminPlaybookStatus',(x.data&&x.data.error)||'Не удалось сохранить инструкцию.');})
      .catch(function(){setStatus('adminPlaybookStatus','Ошибка соединения при сохранении.');})
      .finally(function(){if(btn)btn.disabled=false;});
    });

    function loadRequests(){
      var list=$('#adminRequestsList'),button=$('#adminLoadRequests');
      if(!list)return;
      list.textContent='Загружаем защищённый список заявок…';if(button)button.disabled=true;
      fetch('/api/requests?t='+Date.now(),{credentials:'same-origin',cache:'no-store'})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'Не удалось прочитать ответ'};}).then(function(d){return {ok:r.ok,status:r.status,data:d};});})
      .then(function(x){
        if(!x.ok){list.textContent=x.status===401?'Сервер не подтвердил административный доступ. Войдите под учётной записью администратора.':'Не удалось загрузить заявки.';return;}
        var rows=(x.data&&x.data.requests)||[];
        if(!rows.length){list.textContent='Новых заявок в текущем хранилище нет.';return;}
        list.innerHTML=rows.map(function(r){
          return '<article class="admin-request-row"><div class="admin-request-meta"><b>#'+esc(r.id||'')+' · '+esc(r.name||'Без имени')+'</b><time>'+esc(r.at||'')+'</time></div><div><b>Контакт:</b> '+esc(r.contact||'—')+'</div><p>'+esc(r.body||'Описание не указано')+'</p></article>';
        }).join('');
      }).catch(function(){list.textContent='Ошибка соединения при загрузке заявок.';})
      .finally(function(){if(button)button.disabled=false;});
    }
    var requestsButton=$('#adminLoadRequests');if(requestsButton)requestsButton.addEventListener('click',loadRequests);

    var cab=$('#adminOpenCabinet');if(cab)cab.addEventListener('click',function(){if(window.iomaOpenCabinet)window.iomaOpenCabinet();else goAuth('login');});
    var health=$('#adminHealthCheck');if(health)health.addEventListener('click',function(){var out=$('#adminHealthStatus');if(out)out.textContent='Проверяем…';fetch('/api/health?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(d){if(out)out.textContent=d&&d.ok?'Сервис отвечает':'Сервис вернул неожиданный ответ';}).catch(function(){if(out)out.textContent='Не удалось получить ответ сервера';});});
  }
  function initTheme(){
    var b=$('#themeToggleButton');if(!b)return;
    // Existing application has a theme handler. This listener only synchronizes the body/header after it toggles html.dark.
    b.addEventListener('click',function(){setTimeout(function(){var dark=document.documentElement.classList.contains('dark');try{localStorage.setItem('iomastavka_theme',dark?'dark':'light');}catch(e){}document.querySelector('meta[name="theme-color"]').content=dark?'#071321':'#edf6fb';},80);});
  }
  function normalizeRoutePath(path){
    var p=(path||'/').replace(/\/+$/,'')||'/';
    var map={'/':'home','/routes':'routes','/services':'services','/admin':'admin','/rates':'rates','/forwarders':'forwarders','/assistant':'assistant','/news':'news','/customs':'customs','/tarot':'tarot','/account':'account','/request':'request','/article':'article'};
    return map[p]||'services';
  }
  function bootPath(){
    var p=normalizeRoutePath(location.pathname);
    if(p==='routes'){routeToPath('/routes'+location.search,false);return;}
    if(p==='article'){routeToPath('/article'+location.search,false);return;}
    if(p==='services'){routeToPath('/services',false);return;}
    if(p==='admin'){routeToPath('/admin',false);return;}
    if(p==='home'){routeToPath('/',false);return;}
    routeToPath('/'+p,false);
  }

  function articleMarkdownToHtml(markdown){
    var text=String(markdown||'').replace(/\r/g,'');
    return text.split(/\n{2,}/).map(function(block){
      var lines=block.split('\n');
      if(lines.every(function(line){return /^\s*[-*]\s+/.test(line);})){
        return '<ul>'+lines.map(function(line){return '<li>'+esc(line.replace(/^\s*[-*]\s+/,''))+'</li>';}).join('')+'</ul>';
      }
      var headings=block.match(/^(#{1,3})\s+([\s\S]*)$/);
      if(headings){var n=headings[1].length;return '<h'+n+'>'+esc(headings[2])+'</h'+n+'>';}
      return '<p>'+esc(block).replace(/\n/g,'<br>')+'</p>';
    }).join('');
  }
  function loadArticlePage(){
    var host=$('#articleContent');if(!host)return;
    var query=new URLSearchParams(location.search);
    var id=query.get('id'),saved=null;
    try{saved=JSON.parse(localStorage.getItem('iomaNewsSelected')||'null');}catch(ignore){}
    if(!id&&saved)id=saved.id;
    if(!id){host.innerHTML='<div class="article-reader-empty"><span class="eyebrow">IOMA NEWS</span><h1>Материал ВЭД</h1><p>Откройте материал из ленты новостей, чтобы прочитать подробную версию.</p><a href="/news">← Вернуться к новостям</a></div>';return;}
    host.innerHTML='<div class="article-reader-loading"><span class="article-reader-spinner"></span><span>Готовим подробный материал из открытого источника…</span><small>Это может занять до минуты.</small></div>';
    fetch('/api/news/rewrite',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'Не удалось прочитать ответ сервера'};}).then(function(d){return {ok:r.ok,data:d};});})
      .then(function(out){
        var d=out.data||{};
        if(!out.ok||!d.ok){host.innerHTML='<div class="article-reader-empty"><h1>Не удалось загрузить материал</h1><p>'+esc(d.error||'Попробуйте открыть материал из ленты ещё раз.')+'</p><a href="/news">← Вернуться к новостям</a></div>';return;}
        host.innerHTML='<div class="article-reader-meta"><span>Источник: <b>'+esc(d.source||(saved&&saved.source)||'открытый источник')+'</b></span><span>'+esc(d.publishedAt||(saved&&saved.date)||'')+'</span></div><h1 class="article-reader-title">'+esc(d.title||(saved&&saved.title)||'Материал ВЭД')+'</h1><div class="article-reader-content">'+articleMarkdownToHtml(d.markdown||'')+'</div><div class="article-reader-footnote">Материал переработан на основе открытого источника. Перед практическими решениями проверяйте первоисточник и действующие правила.</div>';
        if(d.image&&/^https:\/\//i.test(d.image)){var im=document.createElement('img');im.className='article-reader-image';im.src=d.image;im.alt=d.title||'Иллюстрация материала';host.insertBefore(im,host.querySelector('.article-reader-meta'));}
      })
      .catch(function(){host.innerHTML='<div class="article-reader-empty"><h1>Не удалось подключиться</h1><p>Проверьте соединение и повторите попытку.</p><a href="/news">← Вернуться к новостям</a></div>';});
  }

  function initRequestForm(){
    var form=$('#requestForm');if(!form||form.dataset.routePlannerBound==='1')return;
    form.dataset.routePlannerBound='1';
    var status=$('#requestStatus');
    var ts=$('#requestTime');
    var messageField=$('#requestMessage');
    try{
      var savedDraft=JSON.parse(localStorage.getItem('iomaRouteDraft')||'null');
      if(savedDraft&&messageField&&!messageField.value){
        messageField.value='Маршрут: '+(savedDraft.from||'')+' → '+(savedDraft.to||'')+'\nВид перевозки: '+(savedDraft.mode||'')+'\nПредлагаемый коридор: '+(savedDraft.title||'')+'\nПромежуточные узлы: '+(savedDraft.steps||'')+'\n'+(savedDraft.description||'')+'\nСрок, тариф и ограничения требуют подтверждения перевозчика.';
        if(status)status.textContent='Выбранный маршрут перенесён в заявку. Добавьте описание груза и контакт.';
      }
    }catch(ignore){}
    function markOpened(){if(ts&&!ts.value)ts.value=String(Date.now());}
    document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-open-view="request"]'))markOpened();});
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var name=$('#requestName'),phone=$('#requestPhone'),email=$('#requestEmail'),message=$('#requestMessage'),website=$('#requestWebsite'),code=$('#phoneCode');
      var person=(name&&name.value||'').trim();
      var number=(phone&&phone.value||'').trim();
      if(!person||!number){if(status)status.textContent='Укажите имя и телефон для связи.';return;}
      markOpened();
      var contact=((code&&code.textContent)||'+7')+' '+number;
      var body=(message&&message.value||'').trim();
      var mail=(email&&email.value||'').trim();
      if(mail)body+=(body?'\\n\\n':'')+'Email для обратной связи: '+mail;
      var payload={name:person,contact:contact,body:body,website:(website&&website.value)||'',_t:Number((ts&&ts.value)||Date.now())};
      var send=form.querySelector('button[type="submit"]');
      if(send){send.disabled=true;send.textContent='Отправляем…';}
      if(status)status.textContent='Отправка заявки…';
      fetch('/api/requests',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'Не удалось прочитать ответ сервера'};}).then(function(d){return {ok:r.ok,data:d};});})
      .then(function(out){
        if(out.ok&&out.data&&out.data.ok&&Number(out.data.id||0)>0){
          if(status)status.textContent='Заявка отправлена. Номер: '+out.data.id+'. Менеджер сможет связаться с вами по указанному контакту.';
          form.reset();if(ts)ts.value=String(Date.now());
          try{localStorage.removeItem('iomaRouteDraft');}catch(e){}
        } else if(out.ok&&out.data&&out.data.ok&&Number(out.data.id||0)===0){
          if(status)status.textContent='Сервер не подтвердил приём заявки. Заполните форму и попробуйте ещё раз через несколько секунд.';
        } else {
          if(status)status.textContent=(out.data&&out.data.error)||'Не удалось отправить заявку. Повторите попытку позже.';
        }
      })
      .catch(function(){if(status)status.textContent='Нет связи с сервером. Проверьте соединение и попробуйте ещё раз.';})
      .finally(function(){if(send){send.disabled=false;send.textContent='Отправить';}});
    });
  }

  function fillCitySelect(select){
    if(!select)return;
    var previous=select.value;
    var optgroups=[
      {label:'Китай',ids:PICKABLE_CITIES.filter(function(id){return city(id).region==='cn';})},
      {label:'Россия',ids:PICKABLE_CITIES.filter(function(id){return city(id).region==='ru';})}
    ];
    select.innerHTML='';
    optgroups.forEach(function(group){
      var og=document.createElement('optgroup');og.label=group.label;
      group.ids.forEach(function(id){
        var c=city(id),opt=document.createElement('option');
        opt.value=id;opt.textContent=c.name+' · '+c.country;
        og.appendChild(opt);
      });
      select.appendChild(og);
    });
    if(previous&&PICKABLE_CITIES.indexOf(previous)>=0)select.value=previous;
    else select.value=select.id==='routeTo'||select.id==='homeRouteTo'?'moscow':'shanghai';
  }
  function initRouteCitySelects(){
    fillCitySelect($('#routeFrom'));fillCitySelect($('#routeTo'));
    fillCitySelect($('#homeRouteFrom'));fillCitySelect($('#homeRouteTo'));
    var form=$('#homeRouteStartForm');
    if(!form||form.dataset.bound==='1')return;
    form.dataset.bound='1';
    var mode='multimodal';
    $('[data-home-route-mode]').forEach(function(button){
      button.addEventListener('click',function(){
        mode=MODES[button.dataset.homeRouteMode]?button.dataset.homeRouteMode:'multimodal';
        $('[data-home-route-mode]').forEach(function(b){
          var active=b.dataset.homeRouteMode===mode;
          b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',active?'true':'false');
        });
      });
    });
    var swap=$('#homeRouteSwap');
    if(swap)swap.addEventListener('click',function(){
      var from=$('#homeRouteFrom'),to=$('#homeRouteTo');if(!from||!to)return;
      var old=from.value;from.value=to.value;to.value=old;
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var from=$('#homeRouteFrom'),to=$('#homeRouteTo');
      if(!from||!to||!PICKABLE_CITIES.includes(from.value)||!PICKABLE_CITIES.includes(to.value)){
        showToast('Выберите пункты отправления и назначения.');return;
      }
      if(from.value===to.value){showToast('Пункты отправления и назначения должны отличаться.');return;}
      window.location.href='/routes?mode='+encodeURIComponent(mode)+'&from='+encodeURIComponent(from.value)+'&to='+encodeURIComponent(to.value);
    });
  }
  function init(){ 
    initRouteCitySelects();
    checkRole().then(function(){bootPath();});
    if($('#routeFrom'))$('#routeFrom').addEventListener('change',function(){state.from=this.value;state.selectedOption=null;syncEndpoints();renderRouteResults();});
    if($('#routeTo'))$('#routeTo').addEventListener('change',function(){state.to=this.value;state.selectedOption=null;syncEndpoints();renderRouteResults();});
    document.addEventListener('click',interceptClick,true);
    window.addEventListener('popstate',onPopState);
    document.addEventListener('keydown',function(e){
      var transport=e.target.closest&&e.target.closest('[data-open-route-mode]');
      if(transport&&(e.key==='Enter'||e.key===' ')){e.preventDefault();transport.click();return;}
      if(e.key==='Escape'){
        var modalOpen=!!document.querySelector('[aria-modal="true"]:not([hidden]),[role="dialog"]:not([hidden]),#iomaNewsOverlay:not([hidden])');
        if(!modalOpen&&location.pathname!=='/'){window.location.href=location.pathname==='/article'?'/news':'/';}
      }
    });
    initAdmin();initTheme();initRequestForm();syncEndpoints();renderMapMarkers();renderRouteResults();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();