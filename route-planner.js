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
    khabarovsk:{id:'khabarovsk',name:'Хабаровск',country:'Россия',region:'ru',x:674,y:175,kind:'city'}
  };
  var MODES={
    multimodal:{label:'Мультимодальная',short:'Мультимодальный',description:'Сочетание видов транспорта с перегрузкой в терминальных узлах.'},
    air:{label:'Авиа',short:'Авиа',description:'Аэропорт отправления → доступный грузовой хаб → таможня → доставка до адреса.'},
    rail:{label:'Железная дорога',short:'Ж/Д',description:'Контейнерный или вагонный сервис через железнодорожные погранпереходы.'},
    road:{label:'Авто',short:'Авто',description:'Автоперевозка через выбранный пункт пропуска с проверкой ограничений перевозчика.'},
    sea:{label:'Море',short:'Море + Ж/Д',description:'Морской участок до порта, терминальная обработка и возможное продолжение по железной дороге.'}
  };
  var SOURCE={
    manzhouli:{title:'Маньчжурия — Забайкальск — Транссиб',label:'ВОСТОЧНЫЙ Ж/Д КОРИДОР',source:'https://english.www.gov.cn/policies/policywatch/202604/11/content_WS69d9a590c6d00ca5f9a0a593.html',sourceLabel:'Правительство КНР · порт Маньчжурия',proof:'Маньчжурия описывается правительством КНР как ключевой железнодорожный порт для торговли Китай—Россия. Конкретный поезд и пересечение границы подтверждает оператор.'},
    kazakhstan:{title:'Хоргос / Алтынколь или Алашанькоу / Достык',label:'ЗАПАДНЫЙ КОРИДОР ЧЕРЕЗ КАЗАХСТАН',source:'https://www.gov.kz/org/maidd/activities/2110',sourceLabel:'Правительство Казахстана · переходы Китай—Казахстан',proof:'Узел Алтынколь—Хоргос обслуживает международные контейнерные потоки с перегрузкой между китайской колеёй 1435 мм и колеёй 1520 мм. Выбор пары станций зависит от отправки.'},
    suifenhe:{title:'Суйфэньхэ — Гродеково — Уссурийск',label:'ДАЛЬНЕВОСТОЧНЫЙ Ж/Д КОРИДОР',source:'https://english.www.gov.cn/news/202509/28/content_WS68d8864ec6d00ca5f9a06802.html',sourceLabel:'Правительство КНР · ЖД к Суйфэньхэ',proof:'Схема для северо-востока Китая и Дальнего Востока РФ; до Москвы потребуется отдельный дальнейший железнодорожный участок. Конкретный КПП подтверждается перевозчиком.'},
    heihe:{title:'Хэйхэ — Благовещенск — внутренняя доставка',label:'АМУРСКИЙ / МУЛЬТИМОДАЛЬНЫЙ СЦЕНАРИЙ',source:'https://www.mintrans.gov.ru/press-center/news/10281',sourceLabel:'Минтранс РФ · мост Кани-Курган—Хэйхэ',proof:'Вариант для грузов, которым подходит региональный переход через Амур. Наличие сервиса, допустимость груза и последующая отправка проверяются для конкретной даты.'},
    sea:{title:'Порт Владивосток — поезд до Москвы',label:'МОРЕ + ЖЕЛЕЗНАЯ ДОРОГА',source:'https://www.fesco.com/en/clients/container/trains/fesco-moscow-shuttle/',sourceLabel:'FESCO Moscow Shuttle',proof:'FESCO публикует сервис контейнерного поезда Владивосток—Москва с ориентиром железнодорожного участка 10–14 дней. Это не включает морской участок, портовые операции, таможню и последнюю милю.'},
    air:{title:'Авиа через доступный грузовой хаб',label:'АВИА / AIR CARGO',source:'https://www.fesco.com/en/clients/container/trains/',sourceLabel:'FESCO · сервисы перевозки',proof:'Маршрут строится через доступные грузовые аэропорты и терминалы на дату отправления. Прямой рейс, авиакомпания, ограничения по грузу и сроки требуют отдельного подтверждения.'},
    railExample:{title:'Китай — Москва на контейнерном поезде',label:'ОПУБЛИКОВАННЫЙ ПРИМЕР Ж/Д',source:'https://english.www.gov.cn/news/202504/16/content_WS67ffa7d8c6d0868f4e8f1c56.html',sourceLabel:'Правительство КНР · поезд Пекин—Москва',proof:'В апреле 2025 года был описан поезд Пекин—Москва с оценкой около 16 дней. Это исторический пример конкретного поезда, а не обещание срока для новой отправки.'}
  };

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function city(id){return CITIES[id]||{id:id,name:id,country:'',region:'',x:450,y:200,kind:'city'};}
  function cityName(id){var c=city(id);return c.name+(c.country?', '+c.country:'');}
  function isCrossBorder(from,to){return city(from).region!==city(to).region;}
  function isChRu(from,to){return (city(from).region==='cn'&&city(to).region==='ru')||(city(from).region==='ru'&&city(to).region==='cn');}
  function reverseForDirection(points,from,to){return city(from).region==='ru'&&city(to).region==='cn'?points.slice().reverse():points.slice();}
  function compactIds(ids){return (ids||[]).filter(function(id,i,all){return i===0||id!==all[i-1];});}
  function routeSteps(ids){return compactIds(ids).map(function(id){var p=city(id);return {id:id,name:p.name,country:p.country};});}
  function reverseSteps(ids,from,to){return routeSteps(reverseForDirection(ids,from,to));}
  function defaultCorridors(from,to,mode){
    var cnFirst=city(from).region==='cn';
    var pairs=[
      {id:'manzhouli',mode:'rail',title:SOURCE.manzhouli.title,label:SOURCE.manzhouli.label,points:cnFirst?[from,'manzhouli','zabaikalsk','novosibirsk',to]:[from,'novosibirsk','zabaikalsk','manzhouli',to],desc:'Восточный вариант через погранстанцию Маньчжурия—Забайкальск и дальнейшую российскую железнодорожную сеть.',source:SOURCE.manzhouli,fit:'Подходит для проверки контейнерной Ж/Д схемы на центральные и дальние направления России.'},
      {id:'kazakhstan',mode:'rail',title:SOURCE.kazakhstan.title,label:SOURCE.kazakhstan.label,points:cnFirst?[from,'alashankou','dostyk','novosibirsk',to]:[from,'novosibirsk','dostyk','alashankou',to],desc:'Западная железнодорожная схема через узлы китайско-казахстанской границы и далее через Казахстан/Россию.',source:SOURCE.kazakhstan,fit:'Альтернатива восточному маршруту; станция передачи зависит от направления, типа контейнера и оператора.'},
      {id:'suifenhe',mode:'rail',title:SOURCE.suifenhe.title, label:SOURCE.suifenhe.label, points:cnFirst?[from,'suifenhe','grodekovo','ussuriysk',to]:[from,'ussuriysk','grodekovo','suifenhe',to],desc:'Региональный дальневосточный сценарий через Суйфэньхэ—Гродеково с дальнейшей доставкой по российской сети.',source:SOURCE.suifenhe,fit:'Особенно уместно для Уссурийска, Владивостока и других точек Дальнего Востока.'},
      {id:'heihe',mode:'multimodal',title:SOURCE.heihe.title,label:SOURCE.heihe.label,points:cnFirst?[from,'heihe','blagoveshchensk','khabarovsk',to]:[from,'khabarovsk','blagoveshchensk','heihe',to],desc:'Региональный сценарий через Хэйхэ—Благовещенск с последующей автодоставкой или передачей на внутреннюю железнодорожную сеть.',source:SOURCE.heihe,fit:'Больше подходит для приграничных и дальневосточных направлений; точный сервис нужно согласовать.'},
      {id:'sea',mode:'sea',title:SOURCE.sea.title,label:SOURCE.sea.label,points:cnFirst?[from,'vladivostok','moscow',to]:[from,'moscow','vladivostok',to],desc:'Морской участок до российского дальневосточного порта, терминальная обработка и контейнерный поезд до Москвы; далее возможна автодоставка.',source:SOURCE.sea,fit:'Проверять вместе с морским фрахтом, портовыми расходами, таможенным плечом и доставкой до двери.'},
      {id:'air',mode:'air',title:SOURCE.air.title,label:SOURCE.air.label,points:[from,to],desc:'Авиа-груз через доступный грузовой аэропорт/хаб, затем таможенное оформление и доставка до пункта назначения.',source:SOURCE.air,fit:'Для срочного или относительно компактного груза; ограничения по аккумуляторам, опасному грузу и упаковке проверяются отдельно.'},
      {id:'road',mode:'road',title:'Автоперевозка через доступный погранпереход',label:'АВТО / CROSS-BORDER ROAD',points:cnFirst?[from,'manzhouli','zabaikalsk',to]:[from,'zabaikalsk','manzhouli',to],desc:'Автомобильная схема через подтверждённый перевозчиком пункт пропуска с дальнейшей доставкой до склада/адреса.',source:SOURCE.manzhouli,fit:'Проверить вид транспорта на каждом плече, доступность КПП, ограничения груза и возможность перецепки/перегруза.'}
    ];
    if(!isChRu(from,to)){
      return [{id:'domestic',mode:mode==='multimodal'?'rail':mode,title:'Внутреннее плечо: '+cityName(from)+' → '+cityName(to),label:'НЕТ МЕЖДУНАРОДНОГО ПЕРЕХОДА В ВЫБРАННОЙ ПАРЕ',points:[from,to],desc:'Указанные пункты находятся в одном регионе списка. Международные коридоры ниже не следует автоматически применять к этому маршруту.',source:SOURCE.sea,fit:'Для такой пары нужен расчёт локального автомобильного или железнодорожного плеча; международный участок не включён.'}];
    }
    var filtered=pairs.filter(function(p){return mode==='multimodal'||p.mode===mode||(mode==='rail'&&p.id==='sea');});
    if(city(to).id==='blagoveshchensk'||city(to).id==='ussuriysk'||city(to).id==='vladivostok'){
      filtered.sort(function(a,b){var score={heihe:0,suifenhe:1,manzhouli:3,kazakhstan:4,sea:5,air:6,road:7};return (score[a.id]??10)-(score[b.id]??10);});
    } else if(city(to).id==='moscow'||city(to).id==='saint-petersburg'||city(to).id==='yekaterinburg'||city(to).id==='novosibirsk'){
      filtered.sort(function(a,b){var score={manzhouli:0,kazakhstan:1,sea:2,air:3,suifenhe:4,heihe:5,road:6};return (score[a.id]??10)-(score[b.id]??10);});
    }
    return filtered.slice(0,mode==='multimodal'?6:4).map(function(p){
      p.steps=reverseSteps(p.points,from,to);
      p.estimated='';
      if(p.id==='sea'&&city(to).id==='moscow') p.estimated='Опубликованный ориентир FESCO для участка поездом Владивосток—Москва: 10–14 дней; морское плечо и обработки не включены.';
      if(p.id==='manzhouli') p.estimated='В 2025 году публиковался пример поезда Пекин—Москва с оценкой около 16 дней; срок этой отправки не гарантируется.';
      return p;
    });
  }

  function updateRoleUI(){
    var role=$('#siteRoleBadge'),note=$('#siteModeNote'),guest=$('#routeGuestBanner'),notice=$('#servicesAccessNotice');
    var labels={guest:'ГОСТЬ',client:'КЛИЕНТ',admin:'АДМИНИСТРАТОР'};
    if(role)role.textContent=labels[state.role]||'ГОСТЬ';
    if(note)note.textContent=state.role==='guest'?'Гостевой режим · часть информации скрыта':state.role==='admin'?'Полный административный режим':'Клиентский доступ · личные заявки и инструменты';
    $$('[data-auth-nav]').forEach(function(el){el.hidden=state.role==='guest';});
    $$('[data-admin-nav]').forEach(function(el){el.hidden=state.role!=='admin';});
    $$('[data-gated-link="client"]').forEach(function(el){el.classList.toggle('is-locked',state.role==='guest');});
    $$('[data-gated-link="admin"]').forEach(function(el){el.classList.toggle('is-locked',state.role!=='admin');});
    if(guest)guest.hidden=state.role!=='guest';
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
    $('[data-page-route]').forEach(function(a){if(a.dataset.pageRoute===activeNav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(p==='/admin'&&state.role!=='admin'){showToast('Администрирование доступно только администратору.');goAuth('login');return;}
    if(['/rates','/forwarders','/customs'].includes(p)&&state.role==='guest'){showToast('Вы в гостевом режиме. Войдите или зарегистрируйтесь для доступа к этому разделу.');goAuth('register');return;}
    if(changeUrl)setUrl(p+(u.search||''));
    if(p==='/'){closeCurrentViews();return;}
    if(p==='/routes'){openCustomLayer('routesView',null);if(u.searchParams.get('mode'))setMode(u.searchParams.get('mode'));renderRouteResults();return;}
    if(p==='/services'){openCustomLayer('servicesView',null);return;}
    if(p==='/admin'){openCustomLayer('adminView',null);return;}
    var map={'/rates':'calculator','/forwarders':'forwarders','/assistant':'assistant','/news':'news','/customs':'customs','/tarot':'tarot','/account':'account','/request':'request'};
    if(map[p]==='account'){goAuth('login');return;}
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
    if(!layer){layer=makeSvg('g',{id:'routeMapDynamic','class':'route-map-dynamic'});svg.appendChild(layer);}
    return layer;
  }
  function renderMapMarkers(){
    var host=$('#routeMapMarkers');if(!host)return;
    host.innerHTML='';
    Object.keys(CITIES).filter(function(id){return ['shanghai','beijing','guangzhou','shenzhen','yiwu','shenyang','manzhouli','suifenhe','heihe','khorgos','alashankou','moscow','saint-petersburg','vladivostok','blagoveshchensk','ussuriysk','novosibirsk','yekaterinburg'].includes(id);}).forEach(function(id){
      var c=city(id),g=makeSvg('g',{class:'route-map-city '+(id===state.from?'is-from':id===state.to?'is-to':''),'data-map-city':id,tabindex:'0',role:'button','aria-label':'Выбрать '+c.name});
      var ring=makeSvg('circle',{class:'city-marker-ring',cx:c.x,cy:c.y,r:id===state.from||id===state.to?11:6});
      var dot=makeSvg('circle',{class:'city-marker-dot',cx:c.x,cy:c.y,r:3.3});
      var text=makeSvg('text',{class:'city-marker-label',x:c.x+8,y:c.y-8});
      text.textContent=c.name;
      g.appendChild(ring);g.appendChild(dot);if(['shanghai','beijing','manzhouli','moscow','vladivostok','blagoveshchensk','khorgos','suifenhe'].includes(id))g.appendChild(text);
      g.addEventListener('click',function(){selectMapCity(id);});
      g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectMapCity(id);}});
      host.appendChild(g);
    });
  }
  function renderDynamicRoute(){
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
      (p.estimated?'<div class="route-time-note"><span>◷</span><span>'+esc(p.estimated)+'</span></div>':'')+
      '<div class="route-option-footer"><a href="'+esc(p.source.source)+'" target="_blank" rel="noopener noreferrer">'+esc(p.source.sourceLabel)+' ↗</a><button type="button" data-choose-route="'+esc(p.id)+'">'+(chosen?'Маршрут выбран':'Показать на карте')+' <span>→</span></button></div>'+
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
    var data={from:cityName(state.from),to:cityName(state.to),mode:MODES[state.mode].label,title:p.title,description:p.desc,steps:(p.steps||routeSteps(p.points||[state.from,state.to])).map(function(s){return s.name;}).join(' → '),at:new Date().toISOString(),source:p.source.source};
    try{localStorage.setItem('iomaRouteDraft',JSON.stringify(data));}catch(e){}
    var message=$('#requestMessage');
    if(message)message.value='Маршрут: '+data.from+' → '+data.to+'\nВид перевозки: '+data.mode+'\nПредлагаемый коридор: '+data.title+'\nПромежуточные узлы: '+data.steps+'\nПараметры груза, срок и бюджет уточнить при расчёте.\nИсточник/описание коридора: '+data.source;
    var status=$('#requestStatus');
    if(status)status.textContent='Маршрут добавлен в заявку. Проверьте описание груза, укажите контакт и отправьте запрос.';
    routeToPath('/request',true);
  }

  function interceptClick(e){
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
    var plane=e.target.closest&&e.target.closest('[data-open-route-mode]');
    if(plane){e.preventDefault();var m=plane.dataset.openRouteMode||'multimodal';state.mode=m;state.selectedOption=null;routeToPath('/routes?mode='+encodeURIComponent(m),true);return;}
    var nav=e.target.closest&&e.target.closest('[data-page-route]');
    if(nav){e.preventDefault();routeToPath(nav.getAttribute('href')||'/',true);return;}
    var gate=e.target.closest&&e.target.closest('[data-gated-link]');
    if(gate){e.preventDefault();var type=gate.dataset.gatedLink;if((type==='admin'&&state.role!=='admin')||(type==='client'&&state.role==='guest')){goAuth(type==='admin'?'login':'register');return;}routeToPath(gate.getAttribute('href'),true);return;}
    var link=e.target.closest&&e.target.closest('a[href^="/"]');
    if(link&&!link.target&&link.origin===location.origin){var dest=link.getAttribute('href');if(dest&&/^\/(routes|services|news|rates|forwarders|assistant|customs|account|admin|tarot|request)(\?|$|\/)/.test(dest)){e.preventDefault();routeToPath(dest,true);return;}}
    var openView=e.target.closest&&e.target.closest('[data-open-view]');
    if(openView){var name=openView.dataset.openView;setTimeout(function(){var p=routeForView(name);if(p!=='/')setUrl(p);},0);}
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
    var map={'/':'home','/routes':'routes','/services':'services','/admin':'admin','/rates':'rates','/forwarders':'forwarders','/assistant':'assistant','/news':'news','/customs':'customs','/tarot':'tarot','/account':'account','/request':'request'};
    return map[p]||'services';
  }
  function bootPath(){
    var p=normalizeRoutePath(location.pathname);
    if(p==='routes'){routeToPath('/routes'+location.search,false);return;}
    if(p==='services'){routeToPath('/services',false);return;}
    if(p==='admin'){routeToPath('/admin',false);return;}
    if(p==='home'){routeToPath('/',false);return;}
    routeToPath('/'+p,false);
  }

  function initRequestForm(){
    var form=$('#requestForm');if(!form||form.dataset.routePlannerBound==='1')return;
    form.dataset.routePlannerBound='1';
    var status=$('#requestStatus');
    var ts=$('#requestTime');
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

  function init(){
    checkRole().then(function(){bootPath();});
    if($('#routeFrom'))$('#routeFrom').addEventListener('change',function(){state.from=this.value;state.selectedOption=null;syncEndpoints();renderRouteResults();});
    if($('#routeTo'))$('#routeTo').addEventListener('change',function(){state.to=this.value;state.selectedOption=null;syncEndpoints();renderRouteResults();});
    document.addEventListener('click',interceptClick,true);
    window.addEventListener('popstate',onPopState);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(location.pathname!=='/')setUrl('/');}});
    initAdmin();initTheme();initRequestForm();syncEndpoints();renderMapMarkers();renderRouteResults();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();