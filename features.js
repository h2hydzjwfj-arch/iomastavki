(function(){
  'use strict';
  if (window.__iomaFeaturesV1) return;
  window.__iomaFeaturesV1 = true;

  var $ = function(s, root){ return (root || document).querySelector(s); };
  var $$ = function(s, root){ return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function fetchJson(url, options){
    options = options || {};
    options.credentials = options.credentials || 'same-origin';
    options.cache = options.cache || 'no-store';
    return fetch(url, options).then(function(response){
      return response.text().then(function(body){
        var data = {};
        try { data = body ? JSON.parse(body) : {}; }
        catch(e){ data = { ok:false, error:'Сервер вернул непонятный ответ.' }; }
        return { ok:response.ok, status:response.status, data:data };
      });
    });
  }
  function getRole(){
    return fetchJson('/api/whoami?t=' + Date.now()).then(function(r){
      if (!r.ok || !r.data || !r.data.ok) return 'guest';
      return r.data.role || 'guest';
    }).catch(function(){ return 'guest'; });
  }
  function openLogin(){
    if (typeof window.iomaOpenAuth === 'function') { window.iomaOpenAuth('login'); return; }
    var b = $('#loginGateBtn');
    if (b) b.click();
  }
  function setVisible(el, yes){
    if (!el) return;
    el.classList.toggle('hidden', !yes);
    if (yes) el.removeAttribute('hidden');
    else el.setAttribute('hidden','');
  }
  function messageBox(parent, text, type){
    if (!parent) return null;
    var box = document.createElement('div');
    box.className = 'feature-notice' + (type ? ' is-' + type : '');
    box.setAttribute('role', type === 'error' ? 'alert' : 'status');
    box.textContent = text;
    parent.appendChild(box);
    return box;
  }
  function replaceWithMessage(parent, text, type){
    if (!parent) return;
    parent.replaceChildren();
    messageBox(parent,text,type);
  }
  function authPrompt(parent, text){
    if (!parent) return;
    parent.replaceChildren();
    var box = document.createElement('div');
    box.className = 'feature-notice';
    var p = document.createElement('p');
    p.textContent = text || 'Для доступа к персональным ставкам и таможенной проверке войдите в личный кабинет.';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'feature-inline-action';
    button.textContent = 'Войти в личный кабинет';
    button.addEventListener('click',openLogin);
    box.appendChild(p); box.appendChild(button); parent.appendChild(box);
  }

  /* ---------- Calculator: autocomplete, cargo dimensions and sourced rate matches ---------- */
  var CITIES = [
    {n:'Шанхай',country:'Китай'},{n:'Пекин',country:'Китай'},{n:'Гуанчжоу',country:'Китай'},
    {n:'Шэньчжэнь',country:'Китай'},{n:'Нинбо',country:'Китай'},{n:'Циндао',country:'Китай'},
    {n:'Тяньцзинь',country:'Китай'},{n:'Далянь',country:'Китай'},{n:'Шэньян',country:'Китай'},
    {n:'Иу',country:'Китай'},{n:'Харбин',country:'Китай'},{n:'Сиань',country:'Китай'},
    {n:'Чжэнчжоу',country:'Китай'},{n:'Чэнду',country:'Китай'},{n:'Чунцин',country:'Китай'},
    {n:'Ухань',country:'Китай'},{n:'Урумчи',country:'Китай'},
    {n:'Москва',country:'Россия'},{n:'Санкт-Петербург',country:'Россия'},
    {n:'Нижний Новгород',country:'Россия'},{n:'Владивосток',country:'Россия'},
    {n:'Находка',country:'Россия'},{n:'Уссурийск',country:'Россия'},
    {n:'Благовещенск',country:'Россия'},{n:'Хабаровск',country:'Россия'},
    {n:'Чита',country:'Россия'},{n:'Иркутск',country:'Россия'},
    {n:'Новосибирск',country:'Россия'},{n:'Екатеринбург',country:'Россия'},
    {n:'Омск',country:'Россия'},{n:'Казань',country:'Россия'},{n:'Самара',country:'Россия'},
    {n:'Уфа',country:'Россия'},{n:'Челябинск',country:'Россия'},{n:'Пермь',country:'Россия'},
    {n:'Тюмень',country:'Россия'},{n:'Ростов-на-Дону',country:'Россия'},
    {n:'Краснодар',country:'Россия'},{n:'Волгоград',country:'Россия'},
    {n:'Новороссийск',country:'Россия'}
  ];
  var MODE_OPTIONS = [
    {value:'multimodal',label:'Все варианты'},
    {value:'air',label:'Авиа'},
    {value:'rail',label:'Железная дорога'},
    {value:'road',label:'Автотранспорт'},
    {value:'sea',label:'Морская перевозка'}
  ];
  var INCOTERM_OPTIONS = [
    {value:'EXW',label:'EXW · со склада продавца'},
    {value:'FCA',label:'FCA · передача перевозчику'},
    {value:'FOB',label:'FOB · на борту судна'},
    {value:'CFR',label:'CFR · фрахт до порта'},
    {value:'CIF',label:'CIF · фрахт и страхование'},
    {value:'CPT',label:'CPT · перевозка оплачена'},
    {value:'CIP',label:'CIP · перевозка и страхование'},
    {value:'DAP',label:'DAP · в месте назначения'},
    {value:'DPU',label:'DPU · выгрузка в месте назначения'},
    {value:'DDP',label:'DDP · с уплатой пошлин'}
  ];

  function initAutocomplete(input, host, expectedCountry){
    if (!input || !host || input.dataset.featureBound === '1') return;
    input.dataset.featureBound = '1';
    input.setAttribute('aria-autocomplete','list');
    host.hidden = true;
    input.addEventListener('input',function(){
      var query = input.value.trim().toLocaleLowerCase('ru');
      host.replaceChildren();
      if (!query) { host.hidden = true; return; }
      var matches = CITIES.filter(function(c){
        return c.country === expectedCountry && (c.n.toLocaleLowerCase('ru').indexOf(query) !== -1);
      }).slice(0,7);
      if (!matches.length) {
        var manual = document.createElement('div');
        manual.className = 'feature-suggestion-empty';
        manual.textContent = 'Можно оставить введённый город — сервер попробует определить его координаты.';
        host.appendChild(manual); host.hidden = false; return;
      }
      matches.forEach(function(c){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'feature-suggestion';
        b.textContent = c.n;
        b.addEventListener('click',function(){
          input.value = c.n; host.hidden = true; host.replaceChildren();
          input.dispatchEvent(new Event('change',{bubbles:true}));
        });
        host.appendChild(b);
      });
      host.hidden = false;
    });
    input.addEventListener('blur',function(){
      window.setTimeout(function(){ host.hidden = true; },160);
    });
    input.addEventListener('focus',function(){
      if (input.value.trim()) input.dispatchEvent(new Event('input'));
    });
  }

  function getDimensionsUnit(){
    var active = $('[data-unit].active');
    return active ? active.getAttribute('data-unit') : 'mm';
  }
  function unitInMetres(unit){
    return unit === 'm' ? 1 : unit === 'cm' ? 0.01 : 0.001;
  }
  function updateCargoSummary(){
    var w = $('#weight'), piecesEl = $('#pieces');
    var l = $('#length'), wi = $('#width'), h = $('#height');
    var volumeNode = $('#autoVolume'), volWeightNode = $('#autoVolumetricWeight'), factorNode = $('#autoFactor');
    if (!volumeNode) return { volume:0, volumetricWeight:0, pieces:1, grossWeight:0 };
    var pieces = Math.max(1,Math.floor(Number(piecesEl && piecesEl.value) || 1));
    var grossWeight = Math.max(0,Number(w && w.value) || 0);
    var factor = 167;
    var k = unitInMetres(getDimensionsUnit());
    var vals = [l,wi,h].map(function(el){ return Math.max(0,Number(el && el.value)||0)*k; });
    var volume = vals.every(function(v){return v>0;}) ? vals[0]*vals[1]*vals[2]*pieces : 0;
    var modeBtn = $('#transportBtn');
    var mode = modeBtn && modeBtn.dataset.mode || 'multimodal';
    var volumetricWeight = mode === 'air' ? volume*factor : 0;
    volumeNode.textContent = volume ? volume.toFixed(3) + ' м³' : '—';
    if (volWeightNode) volWeightNode.textContent = mode === 'air' && volume ? Math.ceil(volumetricWeight) + ' кг' : '—';
    if (factorNode) factorNode.textContent = mode === 'air' ? '167 кг/м³ · ориентир' : 'уточняется у перевозчика';
    var warning = $('#containerWarning');
    if (warning){
      warning.textContent = volume && volume > 75
        ? 'Объём более 75 м³: проверьте возможность нескольких контейнеров/машин и допустимую загрузку.'
        : volume && volume > 30
          ? 'Крупный объём. Сравните FCL/контейнер или отдельную машину; допустимый объём зависит от оборудования.'
          : '';
      setVisible(warning,!!warning.textContent);
    }
    return { volume:volume, volumetricWeight:volumetricWeight, pieces:pieces, grossWeight:grossWeight, factor:factor };
  }
  function initDimensionUnits(){
    $$('.unit-choice').forEach(function(button){
      if (button.dataset.featureBound === '1') return;
      button.dataset.featureBound = '1';
      button.addEventListener('click',function(){
        var previous = getDimensionsUnit();
        var next = button.dataset.unit;
        var factor = unitInMetres(previous)/unitInMetres(next);
        ['#length','#width','#height'].forEach(function(sel){
          var el=$(sel); if (!el || el.value==='' || !Number.isFinite(Number(el.value))) return;
          el.value = String(Math.round(Number(el.value)*factor*10000)/10000);
        });
        $$('.unit-choice').forEach(function(b){b.classList.toggle('active',b===button);});
        $$('.dimension-unit-label').forEach(function(el){el.textContent=next;});
        updateCargoSummary();
      });
    });
    ['#weight','#pieces','#length','#width','#height'].forEach(function(sel){
      var el=$(sel);
      if(el && el.dataset.cargoBound!=='1'){
        el.dataset.cargoBound='1';
        el.addEventListener('input',updateCargoSummary);
      }
    });
  }

  function setSelectButton(buttonId, menuId, options, initial, key){
    var button=$('#'+buttonId),menu=$('#'+menuId);
    if(!button||!menu)return;
    menu.hidden=true;
    button.dataset.mode=button.dataset.mode||initial;
    function labelFor(value){
      var found=options.find(function(o){return o.value===value;});
      return found?found.label:value;
    }
    function set(value){
      button.dataset[key]=value;
      if(key==='mode')button.dataset.mode=value;
      var span=$('span',button);
      if(span)span.textContent=labelFor(value);
      else button.textContent=labelFor(value);
      menu.hidden=true;
      menu.replaceChildren();
      if(key==='mode')updateCargoSummary();
    }
    options.forEach(function(option){
      var item=document.createElement('button');
      item.type='button';item.className='feature-menu-option';
      item.textContent=option.label;
      item.setAttribute('aria-pressed',String((button.dataset[key]||initial)===option.value));
      item.addEventListener('click',function(){set(option.value);});
      menu.appendChild(item);
    });
    button.addEventListener('click',function(e){
      e.preventDefault();
      var show=menu.hidden;
      $$('.hover-menu').forEach(function(m){m.hidden=true;});
      menu.hidden=!show;
    });
    set(button.dataset[key]||initial);
    document.addEventListener('click',function(e){
      if(!e.target.closest('#'+buttonId)&&!e.target.closest('#'+menuId))menu.hidden=true;
    });
  }

  function renderRateResults(host, matches, mode){
    host.replaceChildren();
    if(!matches.length){
      messageBox(host,'В базе нет подходящей ставки для этой пары городов и условий. Это не означает, что маршрут недоступен — запросите у экспедитора актуальное предложение.','');
      return;
    }
    var heading=document.createElement('h3');heading.className='feature-results-title';heading.textContent='Ставки из базы';host.appendChild(heading);
    matches.forEach(function(rate){
      var card=document.createElement('article');card.className='feature-rate-card';
      var h=document.createElement('h4');h.textContent=rate.company||'Ставка без названия компании';card.appendChild(h);
      var route=document.createElement('p');route.className='feature-rate-route';
      route.textContent=(rate.from||'Пункт не указан')+' → '+(rate.to||'Пункт не указан');card.appendChild(route);
      var grid=document.createElement('dl');grid.className='feature-rate-fields';
      [
        ['Транспорт',rate.mode],['Условия поставки',rate.incoterms],
        ['Ставка',rate.rate],['Валюта',rate.currency],['Источник',rate.source]
      ].forEach(function(pair){
        if(pair[1]===undefined||pair[1]===null||String(pair[1]).trim()==='')return;
        var dt=document.createElement('dt');dt.textContent=pair[0];
        var dd=document.createElement('dd');dd.textContent=String(pair[1]);
        grid.appendChild(dt);grid.appendChild(dd);
      });
      card.appendChild(grid);
      var note=document.createElement('p');note.className='feature-rate-disclaimer';
      note.textContent='Данные из внутренней базы. Перед использованием подтвердите дату, валюту, надбавки, ограничения и срок действия у компании.';
      card.appendChild(note);host.appendChild(card);
    });
  }
  function initCalculator(){
    var from=$('#fromCity'),to=$('#toCity'),calc=$('#calculate'),result=$('#result');
    if(!from||!to||!calc||!result||calc.dataset.featureBound==='1')return;
    calc.dataset.featureBound='1';
    initAutocomplete(from,$('#fromSuggestions'),'Китай');
    initAutocomplete(to,$('#toSuggestions'),'Россия');
    setSelectButton('transportBtn','transportMenu',MODE_OPTIONS,'multimodal','mode');
    setSelectButton('incotermBtn','incotermMenu',INCOTERM_OPTIONS,'EXW','incoterm');
    initDimensionUnits();
    var forwarderBtn=$('#forwarderBtn'),forwarderMenu=$('#forwarderMenu');
    if(forwarderBtn&&forwarderMenu){
      forwarderMenu.hidden=true;
      forwarderBtn.addEventListener('click',function(e){
        e.preventDefault(); var show=forwarderMenu.hidden;
        $$('.hover-menu').forEach(function(m){m.hidden=true;});
        forwarderMenu.hidden=!show;
      });
      document.addEventListener('click',function(e){
        if(!e.target.closest('#forwarderBtn')&&!e.target.closest('#forwarderMenu'))forwarderMenu.hidden=true;
      });
      fetchJson('/api/agents').then(function(resp){
        if(!resp.ok||!Array.isArray(resp.data.records))return;
        forwarderMenu.replaceChildren();
        var none=document.createElement('button');none.type='button';none.className='feature-menu-option';none.textContent='Не выбран';
        none.addEventListener('click',function(){var span=$('span',forwarderBtn);if(span)span.textContent='Не выбран';forwarderBtn.dataset.forwarder='';forwarderMenu.hidden=true;});
        forwarderMenu.appendChild(none);
        resp.data.records.forEach(function(agent){
          if(!agent||!agent.company)return;
          var item=document.createElement('button');item.type='button';item.className='feature-menu-option';item.textContent=agent.company;
          item.addEventListener('click',function(){var span=$('span',forwarderBtn);if(span)span.textContent=agent.company;forwarderBtn.dataset.forwarder=agent.company;forwarderMenu.hidden=true;});
          forwarderMenu.appendChild(item);
        });
      }).catch(function(){});
    }

    calc.addEventListener('click',async function(){
      var fromValue=from.value.trim(),toValue=to.value.trim();
      if(!fromValue||!toValue){
        replaceWithMessage(result,'Укажите город отправления в Китае и город назначения в России.','error');setVisible(result,true);return;
      }
      if(fromValue.toLocaleLowerCase('ru')===toValue.toLocaleLowerCase('ru')){
        replaceWithMessage(result,'Пункты отправления и назначения должны различаться.','error');setVisible(result,true);return;
      }
      var cargo=updateCargoSummary();
      if(cargo.grossWeight<=0){
        replaceWithMessage(result,'Укажите общий вес груза в килограммах.','error');setVisible(result,true);return;
      }
      calc.disabled=true;calc.textContent='Рассчитываем…';
      result.replaceChildren();messageBox(result,'Уточняем расстояние и проверяем внутреннюю базу ставок…');
      setVisible(result,true);
      var mode=forwarderBtn && $('#transportBtn') ? $('#transportBtn').dataset.mode||'multimodal':'multimodal';
      var selectedMode=$('#transportBtn') && $('#transportBtn').dataset.mode||'multimodal';
      var incoterm=$('#incotermBtn') && $('#incotermBtn').dataset.incoterm||'EXW';
      var distanceValue=Number($('#distance')&&$('#distance').value)||0;
      var distanceInfo=null;
      try{
        var d=await fetchJson('/api/route-distance?from='+encodeURIComponent(fromValue)+'&to='+encodeURIComponent(toValue));
        if(d.ok&&d.data.ok){
          distanceInfo=d.data;
          var roadKm=Number(d.data.roadKm)||Number(d.data.distanceKm)||0;
          var straightKm=Number(d.data.straightKm)||0;
          distanceValue=selectedMode==='road'?roadKm:straightKm;
          if($('#distance')&&distanceValue>0)$('#distance').value=distanceValue;
        }
      }catch(e){}
      var summary=document.createElement('div');summary.className='feature-calculation-summary';
      var title=document.createElement('h3');title.className='feature-results-title';title.textContent='Параметры расчёта';summary.appendChild(title);
      var dl=document.createElement('dl');dl.className='feature-rate-fields';
      var currentUnit=getDimensionsUnit();
      var dims=['#length','#width','#height'].map(function(sel){var el=$(sel);return el&&el.value!==''?el.value+' '+currentUnit:'—';}).join(' × ');
      [
        ['Маршрут',fromValue+' → '+toValue],['Транспорт',MODE_OPTIONS.find(function(o){return o.value===selectedMode;}).label],
        ['Условия поставки',incoterm],['Общий вес',cargo.grossWeight+' кг'],['Количество мест',cargo.pieces],
        ['Габарит одного места',dims],['Общий объём',cargo.volume?cargo.volume.toFixed(3)+' м³':'не рассчитан'],
        ['Объёмный вес',selectedMode==='air'&&cargo.volume?Math.ceil(cargo.volumetricWeight)+' кг (ориентир 167 кг/м³)':'не применяется без коэффициента перевозчика'],
        ['Расстояние',distanceValue?distanceValue.toLocaleString('ru-RU')+' км':'не удалось определить']
      ].forEach(function(pair){var dt=document.createElement('dt');dt.textContent=pair[0];var dd=document.createElement('dd');dd.textContent=pair[1];dl.appendChild(dt);dl.appendChild(dd);});
      summary.appendChild(dl);
      var note=document.createElement('p');note.className='feature-rate-disclaimer';
      note.textContent=!distanceInfo
        ?'Расстояние определить не удалось. Проверьте названия городов; не используйте расстояние как коммерческий тарифный километраж.'
        :selectedMode==='road'
          ?(distanceInfo.roadKm?'Автодистанция получена по дорожному графу OpenStreetMap. Реальный маршрут зависит от КПП, ограничений, разрешений и выбранного перевозчика.':'Автодистанция ориентировочная: дорожный сервис не построил маршрут и сервер использовал коэффициент к расстоянию по прямой.')
          :'Для этого вида перевозки указано расстояние по прямой, а не длина фактического железнодорожного, авиационного или морского плеча.';
      summary.appendChild(note);result.replaceChildren(summary);

      try{
        var matchesResponse=await fetchJson('/api/rates/recommend?from='+encodeURIComponent(fromValue)+'&to='+encodeURIComponent(toValue)+'&mode='+encodeURIComponent(selectedMode)+'&distance='+encodeURIComponent(distanceValue||''));
        var host=document.createElement('div');host.className='feature-rate-match-block';
        result.appendChild(host);
        if(matchesResponse.status===401){
          authPrompt(host,'Персональные тарифы доступны после входа. Расстояние и параметры груза выше рассчитаны предварительно.');
        }else if(!matchesResponse.ok||!matchesResponse.data.ok){
          messageBox(host,'Не удалось проверить базу ставок. Попробуйте позже или запросите расчёт у экспедитора.','error');
        }else{
          renderRateResults(host,matchesResponse.data.matches||[],selectedMode);
        }
      }catch(e){
        messageBox(result,'Сбой соединения при проверке ставок. Параметры груза сохранены на экране; повторите попытку позже.','error');
      }
      var advice=$('#routeAdvice');
      if(advice){advice.textContent='Ориентировочный расчёт не заменяет подтверждённую ставку. Итог зависит от упаковки, класса груза, Incoterms, границы, терминальных операций и даты отправки.';setVisible(advice,true);}
      calc.disabled=false;calc.innerHTML='Рассчитать';
    });

    ['#length','#width','#height','#pieces','#weight'].forEach(function(sel){
      var el=$(sel);if(el)el.addEventListener('change',updateCargoSummary);
    });
    updateCargoSummary();

    var upload=$('#rateFileUpload'),uploadStatus=$('#rateUploadStatus');
    if(upload&&upload.dataset.featureBound!=='1'){
      upload.dataset.featureBound='1';
      upload.accept='.txt,.csv,.json';
      upload.addEventListener('change',async function(){
        var file=upload.files&&upload.files[0];if(!file)return;
        if(!/\.(txt|csv|json)$/i.test(file.name)){
          if(uploadStatus)uploadStatus.textContent='Пока поддерживаются только текстовые TXT/CSV/JSON-файлы. PDF и Excel требуют отдельного извлечения данных.';
          upload.value='';return;
        }
        var role=await getRole();
        if(role!=='admin'){
          if(uploadStatus)uploadStatus.textContent='Импорт в общую базу ставок доступен только администратору.';
          upload.value='';return;
        }
        var form=new FormData();form.append('file',file);
        if(uploadStatus)uploadStatus.textContent='Обрабатываем файл…';
        try{
          var response=await fetchJson('/api/rates/import',{method:'POST',body:form});
          if(response.ok&&response.data.ok){
            if(uploadStatus)uploadStatus.textContent='Импортировано записей: '+(response.data.added||0)+'. Проверьте направления, валюту и срок действия.';
          }else if(response.status===401){
            if(uploadStatus)uploadStatus.textContent='Сессия истекла. Войдите как администратор.';
          }else{
            if(uploadStatus)uploadStatus.textContent=response.data.error||'Не удалось импортировать файл.';
          }
        }catch(e){if(uploadStatus)uploadStatus.textContent='Сбой соединения при импорте.';}
        upload.value='';
      });
    }
  }

  /* ---------- Customs code lookup: visible states and non-authoritative output ---------- */
  function appendCustomsAnalysis(host, analysis){
    var records=[];
    var lines=String(analysis||'').split(/\r?\n/);
    lines.forEach(function(line){
      var m=line.match(/^\s*([^:：]{2,42})\s*[:：]\s*(.*)$/);
      if(m)records.push({label:m[1].trim(),value:m[2].trim()});
    });
    var list=document.createElement('dl');list.className='feature-customs-fields';
    var shown=0;
    records.forEach(function(r){
      if(!r.value)return;
      var dt=document.createElement('dt');dt.textContent=r.label;
      var dd=document.createElement('dd');dd.textContent=r.value;
      if(/АКТУАЛЬНОСТЬ/i.test(r.label))dd.classList.add('is-warning');
      list.appendChild(dt);list.appendChild(dd);shown++;
    });
    if(shown)host.appendChild(list);
    else {var pre=document.createElement('pre');pre.className='feature-customs-raw';pre.textContent=analysis||'Сервер не вернул разбор кода.';host.appendChild(pre);}
  }
  function initCustoms(){
    var input=$('#customsCode'),button=$('#customsCheck'),status=$('#customsStatus'),result=$('#customsResult');
    if(!input||!button||!status||!result||button.dataset.featureBound==='1')return;
    button.dataset.featureBound='1';
    input.addEventListener('input',function(){input.value=input.value.replace(/\D/g,'').slice(0,10);});
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();button.click();}});
    button.addEventListener('click',async function(){
      var code=input.value.trim();
      result.replaceChildren();setVisible(result,false);
      if(!/^\d{10}$/.test(code)){status.textContent='Введите ровно 10 цифр кода ТН ВЭД ЕАЭС.';status.className='customs-status is-error';input.focus();return;}
      var role=await getRole();
      if(role!=='client'&&role!=='admin'){
        status.textContent='Проверка ТН ВЭД доступна после входа в личный кабинет.';
        status.className='customs-status';authPrompt(result,'Войдите, чтобы запросить предварительный анализ кода ТН ВЭД.');setVisible(result,true);return;
      }
      button.disabled=true;button.textContent='Проверяем…';
      status.textContent='Запрашиваем предварительный анализ. Это может занять до 60 секунд.';
      status.className='customs-status';
      try{
        var response=await fetchJson('/api/customs/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code}),signal:AbortSignal.timeout(65000)});
        if(response.status===401){
          status.textContent='Сессия истекла. Войдите снова.';authPrompt(result,'Сессия недействительна. Повторно войдите в личный кабинет.');setVisible(result,true);
        }else if(!response.ok||!response.data.ok){
          status.textContent='Не удалось завершить проверку.';
          replaceWithMessage(result,response.data.error||'Таможенный сервис временно недоступен.','error');setVisible(result,true);
        }else{
          status.textContent='Предварительный анализ получен. Не используйте его как окончательное таможенное решение.';
          result.replaceChildren();
          var h=document.createElement('h3');h.className='feature-results-title';h.textContent='ТН ВЭД ЕАЭС '+code;result.appendChild(h);
          appendCustomsAnalysis(result,response.data.analysis);
          var caution=document.createElement('p');caution.className='feature-rate-disclaimer';
          caution.textContent='AI-анализ может ошибаться. Подтвердите классификацию, ставку пошлины, НДС, таможенный сбор, маркировку и разрешительные документы по действующим источникам ФТС/ЕЭК перед декларированием.';
          result.appendChild(caution);
          setVisible(result,true);
        }
      }catch(e){
        status.textContent=e.name==='TimeoutError'?'Превышено время ожидания проверки. Попробуйте позже.':'Ошибка соединения при проверке.';
        replaceWithMessage(result,status.textContent,'error');setVisible(result,true);
      }finally{button.disabled=false;button.textContent='Проверить код';}
    });
  }

  /* ---------- Assistant page: actual message sending, text file extraction, voice input ---------- */
  function initAssistantPage(){
    var input=$('#assistantInput'),button=$('#sendAI'),messages=$('#chatMessages'),status=$('#assistantStatus');
    if(!input||!button||!messages||button.dataset.featureBound==='1')return;
    button.dataset.featureBound='1';
    var history=[];
    var attachedText='';
    var fileInput=$('#aiFile'),fileNames=$('#fileNames');
    if(fileInput){
      fileInput.accept='.txt,.csv,.json,.md';
      fileInput.addEventListener('change',function(){
        var list=Array.prototype.slice.call(fileInput.files||[]);
        attachedText='';
        if(!list.length){if(fileNames)fileNames.textContent='Текстовые файлы TXT / CSV / JSON / MD';return;}
        var invalid=list.filter(function(f){return !/\.(txt|csv|json|md)$/i.test(f.name)||f.size>1024*1024;});
        if(invalid.length){
          if(fileNames)fileNames.textContent='Поддерживаются только текстовые файлы до 1 МБ. PDF/Excel сюда пока не прикрепляются.';
          fileInput.value='';return;
        }
        Promise.all(list.map(function(file){
          return new Promise(function(resolve){
            var reader=new FileReader();
            reader.onload=function(e){resolve('[Файл: '+file.name+']\n'+String(e.target.result||'').slice(0,6000));};
            reader.onerror=function(){resolve('[Не удалось прочитать '+file.name+']');};
            reader.readAsText(file);
          });
        })).then(function(contents){
          attachedText=contents.join('\n\n').slice(0,10000);
          if(fileNames)fileNames.textContent='Прикреплено текстовых файлов: '+list.length;
        });
      });
    }
    function addMessage(text,kind){
      var node=document.createElement('div');node.className='feature-chat-message '+(kind==='user'?'is-user':kind==='error'?'is-error':'is-assistant');
      var bubble=document.createElement('div');bubble.className='feature-chat-bubble';bubble.textContent=text;node.appendChild(bubble);messages.appendChild(node);
      messages.scrollTop=messages.scrollHeight;
      return node;
    }
    if(!messages.children.length)addMessage('Здравствуйте. Задайте вопрос о логистике Китай—Россия, документах, Incoterms или расчёте маршрута. Ответ AI нужно перепроверять по первичным источникам.','assistant');

    async function send(){
      if(button.disabled)return;
      var text=String(input.value||'').trim();
      if(!text&&!attachedText)return;
      var question=(text+(attachedText?'\n\n'+attachedText:'')).slice(0,2000);
      addMessage(text+(attachedText?'\n\nПрикреплены текстовые файлы.':''),'user');
      history.push({role:'user',content:question});
      input.value='';attachedText='';
      if(fileNames)fileNames.textContent='Текстовые файлы TXT / CSV / JSON / MD';
      if(fileInput)fileInput.value='';
      button.disabled=true;
      if(status)status.textContent='Отправляем запрос…';
      var pending=addMessage('Готовлю ответ…','assistant');
      try{
        var response=await fetchJson('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:question,history:history.slice(-6)})});
        pending.remove();
        if(response.ok&&response.data.ok&&response.data.reply){
          var reply=String(response.data.reply);
          addMessage(reply,'assistant');history.push({role:'assistant',content:reply});
          if(status)status.textContent='Ответ получен. Проверьте фактические ставки и сроки по источникам.';
        }else{
          addMessage(response.data.error||'Сервис не смог ответить. Попробуйте позже.','error');
          if(status)status.textContent='Ответ не получен.';
        }
      }catch(e){
        pending.remove();addMessage('Не удалось соединиться с AI-сервисом. Повторите попытку позже.','error');
        if(status)status.textContent='Ошибка соединения.';
      }finally{button.disabled=false;input.focus();}
    }
    button.addEventListener('click',send);
    input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    var voice=$('#voiceButton');
    if(voice){
      voice.addEventListener('click',function(){
        var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(!SR){if(status)status.textContent='Голосовой ввод не поддерживается в этом браузере.';return;}
        var recognition=new SR();
        var language=(document.documentElement.lang||'ru').slice(0,2);
        recognition.lang=language==='zh'?'zh-CN':language==='en'?'en-US':language==='tr'?'tr-TR':'ru-RU';
        recognition.continuous=false;recognition.interimResults=true;
        recognition.onresult=function(event){
          var text='';
          for(var i=event.resultIndex;i<event.results.length;i++)text+=event.results[i][0].transcript;
          input.value=text;if(status)status.textContent='Речь распознана. Проверьте текст перед отправкой.';
        };
        recognition.onerror=function(){if(status)status.textContent='Не удалось распознать речь.';};
        recognition.start();if(status)status.textContent='Слушаю…';
      });
    }
  }

  function start(){
    initCalculator();initCustoms();initAssistantPage();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();