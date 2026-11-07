/* IOMASTAVKA — роли в интерфейсе: вход, заявка, кабинет клиента, раздел «Работа». */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function api(url,opt){opt=opt||{};var o={method:opt.method||'GET',credentials:'same-origin',headers:{}};if(opt.body instanceof FormData)o.body=opt.body;else if(opt.body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(opt.body)}
    return fetch(url,o).then(function(r){return r.json().catch(function(){return {}}).then(function(d){if(!r.ok||d.ok===false)throw new Error(d.error||'Ошибка '+r.status);return d})})}
  var ST={new:'Оформлен',pickup:'Забран у поставщика',transit:'В пути',border:'На границе',customs:'Таможня',delivery:'Доставка по РФ',done:'Доставлен'};
  var STK=Object.keys(ST);
  var MODE={auto:'Авто',rail:'ЖД',sea:'Море',air:'Авиа',multimodal:'Море + ЖД'};
  var LS={new:'Новая',work:'В работе',done:'Закрыта',spam:'Спам'};
  var role='guest',me={};
  function fmt(n){return n==null||n===''?'—':Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2})}
  function date(d){if(!d)return '—';var x=new Date(d);return isNaN(x)?esc(d):x.toLocaleDateString('ru-RU')}
  function dtime(d){var x=new Date(d);return isNaN(x)?'':x.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}

  /* ---------- роль ---------- */
  function setRole(r,name){role=r||'guest';me.name=name||'';window.__v3role=role;
    document.body.classList.remove('role-guest','role-client','role-admin');document.body.classList.add('role-'+role);var ai=$('#v3accInit');if(ai)ai.textContent=role==='admin'?'A':(String(name||'?').trim()[0]||'?').toUpperCase();
    setTimeout(function(){window.dispatchEvent(new Event('resize'))},30);
    if(role==='admin')loadLeadCount();
  }
  api('/api/me').then(function(d){setRole(d.role,d.name);if(d.storage==='local'){var h=$('#workView .v3-head');if(h&&!$('.v3p-warn',h)){var w=document.createElement('p');w.className='v3p-warn';w.textContent='⚠ Хранилище временное — данные сотрутся при перезапуске. Подключите Supabase в Render.';h.appendChild(w);fetch('/api/health').then(function(r){return r.json()}).then(function(j){if(j&&j.storageIssue)w.textContent='⚠ Хранилище временное — данные сотрутся при перезапуске. Причина: '+j.storageIssue+'.'}).catch(function(){})}}}).catch(function(){setRole('guest')});

  /* ---------- открытие своих окон ---------- */
  var MY={loginView:1,leadView:1,cabinetView:1,workView:1,accountView:1,resetView:1,quoteView:1,kbView:1};
  function openView(id){
    if(id==='cabinetView'&&role==='guest')id='loginView';
    if(id==='workView'&&role!=='admin')id='loginView';if(id==='accountView'&&role==='guest')id='loginView';
    var t=document.getElementById(id);if(!t)return;
    $$('.view-layer').forEach(function(v){v.classList.remove('open');v.setAttribute('aria-hidden','true')});
    t.classList.add('open');t.setAttribute('aria-hidden','false');document.body.classList.add('view-open');
    if(id==='leadView')prefillLead();if(id==='cabinetView')loadCabinet();if(id==='workView')loadWork();if(id==='accountView')loadAccount();if(id==='kbView'&&window.IOMA_KB)window.IOMA_KB.render();
    if(id==='loginView')setTimeout(function(){var f=$('#v3loginForm'),i=f&&$('input[name=login]',f);if(i&&!f.contains(document.activeElement)&&!i.value)i.focus()},120);
  }
  window.__v3open=openView;
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-open-view]');if(!t)return;var n=t.getAttribute('data-open-view');if(MY[n]){e.preventDefault();e.stopPropagation();openView(n)}},true);

  /* ---------- вход ---------- */
  var lf=$('#v3loginForm');
  lf&&lf.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3loginErr');err.textContent='';var b=$('button[type=submit]',lf);b.disabled=true;
    api('/api/login',{method:'POST',body:{login:lf.login.value,password:lf.password.value,remember:lf.remember.checked}}).then(function(d){goIn(d.role)}).catch(function(x){err.textContent=x.message;b.disabled=false})});

  /* ---------- заявка ---------- */
  function prefillLead(){
    var f=$('#v3leadForm');if(!f)return;$('#v3leadDone').hidden=true;f.hidden=false;
    var v=function(id){var e=document.getElementById(id);return e?String(e.value||'').trim():''};
    if(!f.from.value)f.from.value=v('fromCity');if(!f.to.value)f.to.value=v('toCity');if(!f.weight.value)f.weight.value=v('weight');
    var vol=(($('#autoVolume')||{}).textContent||'').match(/[\d.,]+/);if(!f.volume.value&&vol&&parseFloat(vol[0].replace(',','.'))>0)f.volume.value=vol[0].replace(',','.');
    var pr=$('#result .result-price');f.estimate.value=pr&&!pr.classList.contains('muted')?pr.textContent.replace(/\s+/g,' ').trim():'';
    var on=$('.v3c-chips .chip.on, .v3-chips .chip.on');f.mode.value=on?{auto:'auto',rail:'rail',sea:'sea',air:'air'}[on.dataset.m]||'':'';
    if(role==='client'&&me.name&&!f.name.value)f.name.value=me.name;
  }
  var lead=$('#v3leadForm');
  lead&&lead.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3leadErr');err.textContent='';
    if(!lead.name.value.trim()||!lead.contact.value.trim()){err.textContent='Укажите имя и телефон или Telegram';return}
    if(!lead.consent.checked){err.textContent='Отметьте согласие на обработку данных';return}
    var b=$('button[type=submit]',lead);b.disabled=true;
    var body={};['name','contact','from','to','cargo','weight','volume','comment','estimate','mode','website'].forEach(function(k){body[k]=lead[k].value});body.consent=true;
    var files=leadFiles.slice(),req;
    if(files.length){var fd=new FormData();Object.keys(body).forEach(function(k){fd.append(k,body[k])});files.forEach(function(f){fd.append('files',f,f.name)});b.textContent='Разбираем документы…';req=api('/api/leads/docs',{method:'POST',body:fd})}
    else req=api('/api/leads',{method:'POST',body:body});
    req.then(function(d){lead.reset();leadFiles=[];drawFiles();lsSet(DK,null);lead.hidden=true;$('#v3leadDone').hidden=false;var pz=$('#v3leadParsed');if(pz){pz.hidden=!(d&&d.summary);if(d&&d.summary)$('pre',pz).textContent=d.summary}}).catch(function(x){err.textContent=x.message}).then(function(){b.disabled=false;b.textContent='Отправить заявку'})});
  var leadFiles=[];function drawFiles(){var ul=$('#v3leadFlist');if(!ul)return;ul.innerHTML=leadFiles.map(function(f,i){return '<li><span>📎 '+esc(f.name)+'</span><small>'+Math.max(1,Math.round(f.size/1024))+' КБ</small><button type="button" data-rmf="'+i+'" aria-label="Убрать файл">×</button></li>'}).join('')}
  var lfi=$('#v3leadFiles');lfi&&lfi.addEventListener('change',function(){Array.prototype.forEach.call(lfi.files,function(f){if(leadFiles.length<6)leadFiles.push(f)});lfi.value='';drawFiles()});
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-rmf]');if(t){leadFiles.splice(+t.dataset.rmf,1);drawFiles()}});
  var dz=$('#v3leadDocs');dz&&['dragover','drop'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();if(ev==='drop'){Array.prototype.forEach.call(e.dataTransfer.files,function(f){if(leadFiles.length<6)leadFiles.push(f)});drawFiles()}})});
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-lead-docs]');if(t)setTimeout(function(){var z=$('#v3leadDocs');if(z){z.scrollIntoView({block:'center'});z.classList.add('pulse');setTimeout(function(){z.classList.remove('pulse')},1600)}},250)},true);

  /* ---------- расчёт для гостя и клиента: ориентир + заявка ---------- */
  var res=$('#result');
  res&&new MutationObserver(function(){if(role==='admin')return;setTimeout(function(){
    var w=$('.result-price-window',res);if(!w||$('.v3p-cta',w))return;
    var k=$('.result-kicker',w),pr=$('.result-price',w),found=pr&&!pr.classList.contains('muted');
    if(k&&found)k.textContent='ОРИЕНТИРОВОЧНАЯ СТОИМОСТЬ';
    var meta=$('.result-meta',w);if(meta)meta.innerHTML=meta.innerHTML.replace(/^<b>(—)?<\/b>\s*·\s*/,'').replace(/\bcontainer\b/,'контейнер').replace(/\bshipment\b/,'отправка').replace(/\brail\b/,'ЖД').replace(/\bsea\b/,'море').replace(/\broad\b/,'авто').replace(/\bair\b/,'авиа');
    var b=document.createElement('button');b.type='button';b.className='v3p-cta';b.setAttribute('data-open-view','leadView');
    b.textContent=found?'Получить точную ставку от менеджера →':'Оставить заявку — посчитаем вручную →';w.appendChild(b);
  },20)}).observe(res,{childList:true});

  /* ---------- кабинет клиента ---------- */
  function steps(s){var i=STK.indexOf(s);if(s==='done')i=STK.length;return '<ol class="v3p-steps">'+STK.map(function(k,j){return '<li class="'+(j<i?'done':j===i?'cur':'')+'"><i></i><span>'+ST[k]+'</span></li>'}).join('')+'</ol>'}
  function costs(list){if(!list||!list.length)return '<p class="v3p-muted">Расходы появятся после расчёта</p>';
    var tot={};list.forEach(function(c){tot[c.currency]=(tot[c.currency]||0)+Number(c.amount||0)});
    return '<ul class="v3p-rows">'+list.map(function(c){return '<li><span>'+esc(c.label)+'</span><b>'+fmt(c.amount)+' '+esc(c.currency)+'</b></li>'}).join('')+'</ul><div class="v3p-total">Итого: '+Object.keys(tot).map(function(k){return '<b>'+fmt(tot[k])+' '+esc(k)+'</b>'}).join(' + ')+'</div>'}
  function docs(s,admin){if(!s.docs||!s.docs.length)return '<p class="v3p-muted">Документов пока нет</p>';
    return '<ul class="v3p-docs">'+s.docs.map(function(d){return '<li><a href="/api/shipments/'+encodeURIComponent(s.id)+'/docs/'+encodeURIComponent(d.id)+'" download>📄 '+esc(d.name)+'</a><small>'+date(d.uploadedAt)+'</small>'+(admin?'<button type="button" class="v3p-x" data-deldoc="'+esc(d.id)+'" data-ship="'+esc(s.id)+'" aria-label="Удалить документ">×</button>':'')+'</li>'}).join('')+'</ul>'}
  function cargo(s){return '<ul class="v3p-rows">'+[['Груз',esc(s.cargo||'—')],['Вес',s.weight!=null?fmt(s.weight)+' кг':'—'],['Объём',s.volume!=null?fmt(s.volume)+' м³':'—'],['Мест',s.places!=null?fmt(s.places):'—'],['Габариты',esc(s.dims||'—')]].map(function(r){return '<li><span>'+r[0]+'</span><b>'+r[1]+'</b></li>'}).join('')+'</ul>'}
  var TR=function(){return window.IOMA_TRACK};
  function trackForm(s){var T=TR(),l=T?T.list(s):[],cur=s.stage||'';
    var f=function(k,label,ph,type){return '<label class="v3p-f"><span>'+label+'</span><input data-f="'+k+'"'+(type?' type="'+type+'"':'')+' value="'+esc(type==='date'?(/^\d{4}-\d\d-\d\d$/.test(s[k]||'')?s[k]:''):(s[k]||''))+'" placeholder="'+esc(ph||'')+'" maxlength="300"></label>'};
    return '<div class="v3p-admin trk-form" data-ship="'+esc(s.id)+'"><b class="v3p-h">Где груз сейчас — видит клиент</b>'
      +'<div class="trk-fgrid"><label class="v3p-f"><span>Этап</span><select data-f="stage"><option value="">Оформлен, ещё не забран</option>'+l.map(function(k){return '<option value="'+k+'"'+(k===cur?' selected':'')+'>'+esc(T.TITLE[k]+(s.customsAt==='border'&&/^(border|port_ru|airport_ru)$/.test(k)?' и таможня':''))+'</option>'}).join('')+'<option value="done"'+(cur==='done'?' selected':'')+'>Доставлен</option></select></label>'
      +'<label class="v3p-f"><span>Транспорт</span><select data-f="mode">'+[['','—'],['auto','Авто'],['rail','ЖД'],['sea','Море'],['multimodal','Море + ЖД'],['air','Авиа']].map(function(m){return '<option value="'+m[0]+'"'+(m[0]===(s.mode||'')?' selected':'')+'>'+m[1]+'</option>'}).join('')+'</select></label>'
      +'<label class="v3p-f"><span>Таможня</span><select data-f="customsAt"><option value="inland"'+(s.customsAt!=='border'?' selected':'')+'>в России, отдельным этапом</option><option value="border"'+(s.customsAt==='border'?' selected':'')+'>на границе / в порту прибытия</option></select></label>'
      +f('whCity','Склад в Китае (город)','Иу')+f('crossing','Граница / порт прибытия','Забайкальск')+f('nowCity','Где сейчас (город в России)','Новосибирск')
      +f('customsPlace','Где таможня','Москва, Бутовский т/п')+f('address','Адрес доставки клиенту','Москва, ул. Складская, 3')+f('eta','Прибытие (ETA)','','date')+f('trackNo','Контейнер или рейс для отслеживания','MSCU1234567 · SU204')+'</div>'
      +'<label class="v3p-f"><span>Комментарий к обновлению (видит клиент)</span><input data-f="eventNote" maxlength="300" placeholder="Например: прошли досмотр, выезд завтра"></label>'
      +'<div class="trk-fbtns"><button type="button" class="calculate" data-trksave="'+esc(s.id)+'">Сохранить и уведомить клиента</button><button type="button" class="v3p-del" data-delship="'+esc(s.id)+'">Удалить груз</button></div></div>'}
  // отслеживание: море — tracecontainer.com, ЖД — ТрансКонтейнер, авиа — Flightradar24 (у первых двух номер подставляется из буфера)
  var TRK_SVC={sea:['Море','https://www.tracecontainer.com/',1],multimodal:['Море','https://www.tracecontainer.com/',1],rail:['ЖД','https://isales.trcont.ru/tracking?lang=ru',1],air:['Авиа','https://www.flightradar24.com/',0]};
  function trackLink(s){var no=String(s.trackNo||'').trim();if(!no)return '';var m=TRK_SVC[s.mode]||(/^[A-Z]{4}\d{7}$/i.test(no.replace(/\s/g,''))?TRK_SVC.sea:null);if(!m)return '<p class="trk-no">Номер для отслеживания: <b>'+esc(no)+'</b></p>';return '<p class="trk-no">'+(s.mode==='air'?'Рейс':'Контейнер')+': <b>'+esc(no)+'</b> <button type="button" class="v3c-link" data-trkgo="'+esc(s.id)+'">Отследить ↗</button></p>'}
  function trackGo(s){var no=String(s.trackNo||'').trim().replace(/\s+/g,''),m=TRK_SVC[s.mode]||TRK_SVC.sea,url=m[1];if(s.mode==='air'){var code=no.replace(/[^A-Za-z0-9]/g,'').toLowerCase();url=code?'https://www.flightradar24.com/data/flights/'+encodeURIComponent(code):url}
    window.open(url,'_blank','noopener');if(m[2]&&navigator.clipboard){navigator.clipboard.writeText(no).then(function(){if(window.CX)window.CX.toast('Номер '+no+' скопирован — вставьте его в поле поиска на открывшемся сайте')}).catch(function(){})}}
  var SHIP_BY_ID={};document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-trkgo]');if(!b)return;var sh=SHIP_BY_ID[b.dataset.trkgo];if(sh)trackGo(sh)});
  function shipCard(s,admin,clientName){
    SHIP_BY_ID[s.id]=s;var ev=(s.events||[]).slice().reverse(),T=TR();
    var now=T?T.nowText(s):(ST[s.status]||s.status);
    return '<article class="k v3p-ship" data-id="'+esc(s.id)+'"><header><div><span class="tag">№ '+esc(s.number)+'</span><h3>'+esc(s.from||'—')+' → '+esc(s.to||'—')+'</h3><small>'+(MODE[s.mode]||'Транспорт уточняется')+' · прибытие: '+(s.eta?date(s.eta):'уточняется')+(clientName?' · '+esc(clientName):'')+'</small></div><span class="v3p-status s-'+esc(s.status)+'">'+esc(now)+'</span></header>'+trackLink(s)
      +(T?'<div class="trk-wrap"><div class="trk-main">'+T.rail(s,{admin:admin}):steps(s.status))
      +'<div class="v3p-cols"><section><b class="v3p-h">Груз</b>'+cargo(s)+'</section><section><b class="v3p-h">Сколько и за что</b>'+costs(s.costs)+'</section><section><b class="v3p-h">Документы</b>'+docs(s,admin)+(admin?'<label class="v3p-upl">＋ Загрузить документ<input type="file" data-upl="'+esc(s.id)+'" hidden></label>':'')+'</section></div>'
      +(T?'</div><aside class="trk-bot"><div class="trk-bh"><i></i><b>Сообщения по грузу</b></div>'+T.history(s,4)+'</aside></div>':'')
      +(ev.length>4?'<details class="v3p-hist"><summary>История ('+ev.length+')</summary><ul>'+ev.map(function(x){return '<li><time>'+dtime(x.date)+'</time><b>'+esc(x.stage&&T?T.TITLE[x.stage]:(ST[x.status]||x.status))+'</b>'+(x.note?' — '+esc(x.note):'')+'</li>'}).join('')+'</ul></details>':'')
      +(admin?trackForm(s):'')
      +'</article>'}
  function ratesStrip(){var g=function(id){var e=document.getElementById(id);return e?e.textContent:''},dt=(document.getElementById('v3date')||{}).textContent||'';
    return '<div class="trk-rates"><span>Курс ЦБ'+(dt&&dt!=='…'?' на '+esc(dt):'')+'</span><b><small>CNY</small> '+esc(g('homeCny'))+'</b><b><small>USD</small> '+esc(g('homeUsd'))+'</b><b><small>EUR</small> '+esc(g('homeEur'))+'</b><button type="button" class="v3c-link" data-rates-dyn="CNY">Динамика курса →</button></div>'}
  function loadCabinet(){var box=$('#v3cabList');if(!box)return;$$('#v3cabTabs .chip').forEach(function(x){x.classList.toggle('on',x.dataset.ctab==='ships')});box.hidden=false;$('#v3cabQuotes').hidden=true;box.innerHTML='<p class="v3p-muted">Загружаю…</p>';
    if(me.name)$('#v3cabHello').textContent=me.name+', здесь ваши грузы: статус, маршрут, расходы и документы.';
    api('/api/my/shipments').then(function(d){box.innerHTML=d.items.length?ratesStrip()+d.items.map(function(s){return shipCard(s,false)}).join(''):'<div class="k v3p-empty"><b>Пока нет грузов</b><small>Как только менеджер оформит перевозку, она появится здесь.</small><button type="button" class="calculate" data-open-view="leadView">Оставить заявку</button></div>'})
      .catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}

  /* ---------- раздел «Работа» (администратор) ---------- */
  var clients=[];
  function loadLeadCount(){api('/api/leads').then(function(d){var n=d.items.filter(function(l){return l.status==='new'}).length;var c=$('#v3leadCount');if(c)c.textContent=n?'· новых: '+n:''}).catch(function(){})}
  $$('#workView .v3p-tabs .chip').forEach(function(t){t.addEventListener('click',function(){$$('#workView .v3p-tabs .chip').forEach(function(x){x.classList.toggle('on',x===t)});$$('.v3p-tab').forEach(function(p){p.hidden=p.dataset.pane!==t.dataset.tab})})});
  function loadWork(){loadLeads();loadClients().then(loadShips);loadAllQuotes();if(window.CX){var on=$('#workView .cx-nav .chip.on'),tb=on?on.dataset.tab:'inbox',last=window.CX.lastTab();if(last&&last!==tb&&$('#workView .cx-nav [data-tab="'+last+'"]'))window.CX.show(last);else window.CX.load(tb);window.CX.badges()}}
  function loadLeads(){var box=$('#v3leadsList');if(!box)return loadLeadCount();api('/api/leads').then(function(d){
    box.innerHTML=d.items.length?d.items.map(function(l){var c=String(l.contact||''),href=/^@/.test(c)?'https://t.me/'+encodeURIComponent(c.slice(1)):/^[+\d][\d\s()-]{6,}$/.test(c)?'tel:'+c.replace(/[^\d+]/g,''):'';
      return '<article class="k v3p-lead s-'+esc(l.status)+'"><header><div><b>'+esc(l.name)+'</b> · '+(href?'<a href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(c)+'</a>':esc(c))+'<small>'+dtime(l.createdAt)+'</small></div><select data-lead="'+esc(l.id)+'">'+Object.keys(LS).map(function(k){return '<option value="'+k+'"'+(k===l.status?' selected':'')+'>'+LS[k]+'</option>'}).join('')+'</select></header>'
        +'<p><b>'+esc(l.from||'—')+' → '+esc(l.to||'—')+'</b>'+(l.mode?' · '+(MODE[l.mode]||''):'')+'</p><p>'+esc(l.cargo||'')+(l.weight!=null?' · '+fmt(l.weight)+' кг':'')+(l.volume!=null?' · '+fmt(l.volume)+' м³':'')+(l.estimate?' · оценка: '+esc(l.estimate):'')+'</p>'+(l.comment?'<p class="v3p-muted">'+esc(l.comment)+'</p>':'')
        +'<button type="button" class="v3c-link" data-mkclient="'+esc(l.id)+'">Сделать клиентом →</button></article>'}).join(''):'<div class="k v3p-empty"><b>Заявок пока нет</b><small>Заявки с сайта появятся здесь и придут вам в Telegram, если он подключён.</small></div>';
    box._items=d.items;loadLeadCount()}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function loadClients(){var box=$('#v3clientsList');return api('/api/clients').then(function(d){clients=d.items;
    $('#v3shipClient').innerHTML='<option value="">— выберите —</option>'+clients.filter(function(c){return c.active}).map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.name)+(c.company?' · '+esc(c.company):'')+'</option>'}).join('');
    box.innerHTML=clients.length?clients.map(function(c){return '<article class="k v3p-client'+(c.active?'':' off')+'"><div><b>'+esc(c.name)+'</b>'+(c.company?' · '+esc(c.company):'')+'<small>'+esc(c.email)+(c.phone?' · '+esc(c.phone):'')+'</small></div><div class="v3p-actions"><button type="button" class="v3c-link" data-reset="'+esc(c.id)+'">Новый пароль</button><button type="button" class="v3c-link" data-active="'+esc(c.id)+'" data-val="'+(c.active?'0':'1')+'">'+(c.active?'Отключить доступ':'Включить доступ')+'</button></div></article>'}).join(''):'<div class="k v3p-empty"><b>Клиентов пока нет</b><small>Создайте доступ — клиент войдёт по почте и паролю и увидит свои грузы.</small></div>'}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function loadShips(){var box=$('#v3shipsList');api('/api/shipments').then(function(d){var by={};clients.forEach(function(c){by[c.id]=c.name});
    box.innerHTML=d.items.length?d.items.map(function(s){return shipCard(s,true,by[s.clientId]||'клиент удалён')}).join(''):'<div class="k v3p-empty"><b>Грузов пока нет</b><small>Нажмите «+ Новый груз» — клиент сразу увидит его в своём кабинете.</small></div>'}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function showPw(email,pw){var ok=$('#v3clientOk');ok.innerHTML='Доступ для <b>'+esc(email)+'</b>: пароль <code>'+esc(pw)+'</code> — передайте клиенту. Пароль показан один раз. Вход: '+esc(location.origin);}
  var cf=$('#v3clientForm');
  cf&&cf.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3clientErr');err.textContent='';$('#v3clientOk').textContent='';
    api('/api/clients',{method:'POST',body:{email:cf.email.value,name:cf.name.value,company:cf.company.value,phone:cf.phone.value}}).then(function(d){showPw(d.item.email,d.password);cf.reset();loadClients()}).catch(function(x){err.textContent=x.message})});
  var sf=$('#v3shipForm');
  sf&&sf.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3shipErr');err.textContent='';var body={};
    ['clientId','number','from','to','mode','cargo','weight','volume','places','dims','eta','address'].forEach(function(k){if(sf[k]&&sf[k].value!=='')body[k]=sf[k].value});
    body.costs=sf.costs.value.split('\n').map(function(l){var p=l.split(';');return {label:(p[0]||'').trim(),amount:(p[1]||'').trim().replace(/\s/g,''),currency:(p[2]||'USD').trim()}}).filter(function(c){return c.label&&c.amount});
    api('/api/shipments',{method:'POST',body:body}).then(function(){sf.reset();var nb=$('#v3shipNew');if(nb)nb.open=false;loadShips()}).catch(function(x){err.textContent=x.message})});
  document.addEventListener('change',function(e){var t=e.target;
    if((t.dataset.f==='mode'||t.dataset.f==='customsAt')&&t.closest('.trk-form')&&window.IOMA_TRACK){var fm=t.closest('.trk-form'),sl=$('[data-f=stage]',fm),cur=sl.value,T=window.IOMA_TRACK,l=T.list({mode:$('[data-f=mode]',fm).value,customsAt:$('[data-f=customsAt]',fm).value}),ca=$('[data-f=customsAt]',fm).value;
      sl.innerHTML='<option value="">Оформлен, ещё не забран</option>'+l.map(function(k){return '<option value="'+k+'">'+esc(T.TITLE[k]+(ca==='border'&&/^(border|port_ru|airport_ru)$/.test(k)?' и таможня':''))+'</option>'}).join('')+'<option value="done">Доставлен</option>';sl.value=l.indexOf(cur)>=0||cur==='done'?cur:''}
    if(t.dataset.lead)api('/api/leads/'+encodeURIComponent(t.dataset.lead),{method:'PATCH',body:{status:t.value}}).then(loadLeads).catch(function(x){alert(x.message)});
    if(t.dataset.upl&&t.files&&t.files[0]){var fd=new FormData();fd.append('file',t.files[0]);api('/api/shipments/'+encodeURIComponent(t.dataset.upl)+'/docs',{method:'POST',body:fd}).then(loadShips).catch(function(x){alert(x.message)})}
  });
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('button');if(!t||!t.closest('#workView'))return;
    if(t.dataset.setstage){var fm=$('.trk-form[data-ship="'+t.dataset.ship+'"]');if(fm){var sl=$('[data-f=stage]',fm);sl.value=t.dataset.setstage;var art=t.closest('.v3p-ship');$$('.trk-stops li',art).forEach(function(li){li.classList.toggle('pick',li.contains(t))});sl.classList.add('flash');setTimeout(function(){sl.classList.remove('flash')},900);var nc=$('[data-f=nowCity]',fm);if(t.dataset.setstage==='ru'&&nc)nc.focus()}}
    if(t.dataset.trksave){var id=t.dataset.trksave,fm2=$('.trk-form[data-ship="'+id+'"]'),body={};$$('[data-f]',fm2).forEach(function(i){body[i.dataset.f]=i.value});if(!body.stage)delete body.stage;if(!body.eventNote)delete body.eventNote;if(!body.eta)delete body.eta;t.disabled=true;
      api('/api/shipments/'+encodeURIComponent(id),{method:'PATCH',body:body}).then(function(){toast('Сохранено — клиент получит уведомление, если оно подключено');loadShips()}).catch(function(x){alert(x.message);t.disabled=false})}
    if(t.dataset.delship&&confirm('Удалить груз? Клиент перестанет его видеть.'))api('/api/shipments/'+encodeURIComponent(t.dataset.delship),{method:'DELETE'}).then(loadShips).catch(function(x){alert(x.message)});
    if(t.dataset.deldoc&&confirm('Удалить документ?'))api('/api/shipments/'+encodeURIComponent(t.dataset.ship)+'/docs/'+encodeURIComponent(t.dataset.deldoc),{method:'DELETE'}).then(loadShips).catch(function(x){alert(x.message)});
    if(t.dataset.reset)api('/api/clients/'+encodeURIComponent(t.dataset.reset)+'/reset',{method:'POST'}).then(function(d){var c=clients.find(function(x){return x.id===t.dataset.reset});$('#workView [data-tab=clients]').click();var dd=$('.crm-access');if(dd)dd.open=true;showPw(c?c.email:'',d.password)}).catch(function(x){alert(x.message)});
    if(t.dataset.active)api('/api/clients/'+encodeURIComponent(t.dataset.active),{method:'PATCH',body:{active:t.dataset.val==='1'}}).then(loadClients).catch(function(x){alert(x.message)});
    if(t.dataset.mkclient){var l=($('#v3leadsList')._items||[]).find(function(x){return x.id===t.dataset.mkclient});$('#workView [data-tab=clients]').click();var dd=$('.crm-access');if(dd)dd.open=true;if(l){cf.name.value=l.name||'';cf.phone.value=/^[+\d]/.test(l.contact)?l.contact:'';if(/@.+\./.test(l.contact))cf.email.value=l.contact;cf.email.focus()}}
  });

  /* =================== toast =================== */
  function toast(msg,ms){var t=$('#v3toast');if(!t){t=document.createElement('div');t.id='v3toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('on')},ms||4200)}
  window.__v3toast=toast;
  function copy(text){(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(text):Promise.reject()).then(function(){toast('Ссылка скопирована')}).catch(function(){window.prompt('Скопируйте ссылку:',text)})}

  /* =================== восстановление пароля =================== */
  var ff=$('#v3forgotForm');
  $('#v3forgotBtn')&&$('#v3forgotBtn').addEventListener('click',function(){lf.hidden=true;ff.hidden=false;if(lf.login.value.indexOf('@')>0)ff.email.value=lf.login.value;ff.email.focus()});
  $('#v3backLogin')&&$('#v3backLogin').addEventListener('click',function(){ff.hidden=true;lf.hidden=false});
  ff&&ff.addEventListener('submit',function(e){e.preventDefault();$('#v3forgotErr').textContent='';$('#v3forgotOk').textContent='';
    api('/api/password/forgot',{method:'POST',body:{email:ff.email.value}}).then(function(d){$('#v3forgotOk').textContent=d.message}).catch(function(x){$('#v3forgotErr').textContent=x.message})});
  var rf=$('#v3resetForm'),resetToken='';
  rf&&rf.addEventListener('submit',function(e){e.preventDefault();$('#v3resetErr').textContent='';
    api('/api/password/reset',{method:'POST',body:{token:resetToken,password:rf.password.value}}).then(function(d){rf.reset();$('#v3resetOk').textContent=d&&d.role==='admin'?'Пароль администратора сохранён. Войдите: логин admin и новый пароль.':'Пароль сохранён. Теперь войдите с новым паролем.';setTimeout(function(){openView('loginView')},1500)}).catch(function(x){$('#v3resetErr').textContent=x.message})});

  /* =================== аккаунт =================== */
  function loadAccount(){var box=$('#v3accBody');box.innerHTML='<p class="v3p-muted">Загружаю…</p>';
    api('/api/account').then(function(a){
      var h='';
      if(a.role==='client'){
        h+='<form class="k v3p-form" id="v3profForm"><b class="v3c-title">Профиль</b><div class="v3p-two"><label class="v3p-f"><span>Имя</span><input name="name" value="'+esc(a.name)+'"></label><label class="v3p-f"><span>Телефон</span><input name="phone" value="'+esc(a.phone||'')+'"></label></div>'
          +'<label class="v3p-f"><span>Почта (логин для входа)</span><input name="email" type="email" value="'+esc(a.email)+'"></label><label class="v3p-f v3p-cur" hidden><span>Текущий пароль — нужен для смены почты</span><input name="currentPassword" type="password" autocomplete="current-password"></label>'
          +'<p class="v3p-err" role="alert"></p><button type="submit" class="calculate">Сохранить</button></form>';
        h+='<div class="k v3p-form"><b class="v3c-title">Уведомления</b><p class="v3p-muted">Сюда придут ваши КП, смена статуса груза и новые документы.</p>'
          +'<div class="v3p-notif"><span>✈️ Telegram</span>'+(a.telegramLinked?'<b class="v3p-on">подключён</b><button type="button" class="v3c-link" id="v3tgOff">Отключить</button>':(a.botReady?'<button type="button" class="calculate v3p-sm" id="v3tgOn">Подключить Telegram</button>':'<span class="v3p-muted">бот ещё не подключён менеджером</span>'))+'</div>'
          +'<div class="v3p-notif"><span>✉️ Почта</span>'+(a.mail?'<b class="v3p-on">'+esc(a.email)+'</b>':'<span class="v3p-muted">отправка писем пока не настроена</span>')+'</div></div>';
      } else {
        h+='<div class="k v3p-form"><b class="v3c-title">Состояние сайта</b>'
          +'<div class="v3p-notif"><span>💾 Хранилище</span>'+(a.storage==='supabase'?'<b class="v3p-on">Supabase — данные сохраняются</b>':'<b class="v3p-off">временное — подключите Supabase</b>')+'</div>'
          +'<div class="v3p-notif"><span>✈️ Заявки в Telegram</span>'+(a.telegram?'<b class="v3p-on">включено</b>':'<b class="v3p-off">нет TELEGRAM_CHAT_ID</b>')+'</div>'
          +'<div class="v3p-notif"><span>🤖 Бот для клиентов</span>'+(a.botReady?'<b class="v3p-on">готов</b>':'<b class="v3p-off">нет TELEGRAM_BOT_TOKEN</b>')+'</div>'
          +'<div class="v3p-notif"><span>✉️ Письма</span>'+(a.mail?'<b class="v3p-on">включены</b>':'<b class="v3p-off">нет RESEND_API_KEY / SMTP_URL</b>')+'</div>'+'<div class="v3p-test"><input id="v3testMail" type="email" placeholder="Почта для тестового письма (необязательно)"><button type="button" class="calculate v3p-sm" id="v3testBtn">Проверить уведомления</button></div><div id="v3testOut" class="v3p-testout"></div></div>';
      }
      h+='<form class="k v3p-form" id="v3pwForm"><b class="v3c-title">Сменить пароль</b><div class="v3p-two"><label class="v3p-f"><span>Текущий пароль</span><input name="current" type="password" autocomplete="current-password" required></label><label class="v3p-f"><span>Новый пароль (от 8 символов)</span><input name="next" type="password" autocomplete="new-password" minlength="8" required></label></div><p class="v3p-err" role="alert"></p><p class="v3p-ok"></p><button type="submit" class="calculate">Сменить пароль</button></form>';
      box.innerHTML=h;
      var pf=$('#v3profForm');
      if(pf){var orig=a.email;pf.email.addEventListener('input',function(){$('.v3p-cur',pf).hidden=pf.email.value.trim().toLowerCase()===orig});
        pf.addEventListener('submit',function(e){e.preventDefault();var er=$('.v3p-err',pf);er.textContent='';var body={name:pf.name.value,phone:pf.phone.value};if(pf.email.value.trim().toLowerCase()!==orig){body.email=pf.email.value;body.currentPassword=pf.currentPassword.value}
          api('/api/account',{method:'PATCH',body:body}).then(function(d){toast('Сохранено');orig=d.item.email;$('.v3p-cur',pf).hidden=true;pf.currentPassword.value='';me.name=d.item.name}).catch(function(x){er.textContent=x.message})})}
      var pw=$('#v3pwForm');pw.addEventListener('submit',function(e){e.preventDefault();var er=$('.v3p-err',pw),ok=$('.v3p-ok',pw);er.textContent='';ok.textContent='';
        api('/api/account/password',{method:'POST',body:{current:pw.current.value,next:pw.next.value}}).then(function(){pw.reset();ok.textContent='Пароль изменён'}).catch(function(x){er.textContent=x.message})});
      var tb=$('#v3testBtn');tb&&tb.addEventListener('click',function(){tb.disabled=true;var o=$('#v3testOut');o.innerHTML='<p class="v3p-muted">Отправляю…</p>';
        api('/api/account/test-notify',{method:'POST',body:{email:($('#v3testMail')||{}).value||''}}).then(function(r){o.innerHTML=[['Заявки в Telegram',r.telegram],['Бот для клиентов',r.bot],['Письма',r.email]].map(function(x){return '<p class="'+(x[1].ok?'v3p-on':'v3p-off')+'">'+(x[1].ok?'✅ ':'❌ ')+x[0]+': '+esc(x[1].info)+'</p>'}).join('')}).catch(function(x){o.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'}).then(function(){tb.disabled=false})});
      var on=$('#v3tgOn');on&&on.addEventListener('click',function(){api('/api/account/telegram',{method:'POST'}).then(function(d){window.open(d.url,'_blank','noopener');toast('В Telegram нажмите «Запустить», затем вернитесь сюда',6000);setTimeout(loadAccount,15000)}).catch(function(x){toast(x.message)})});
      var off=$('#v3tgOff');off&&off.addEventListener('click',function(){api('/api/account/telegram',{method:'DELETE'}).then(loadAccount)});
    }).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}

  /* =================== КП =================== */
  var MODE2={road:'Авто',auto:'Авто',rail:'ЖД',sea:'Море',air:'Авиа',multimodal:'Море + ЖД'};
  function rateRub(cur){var id={USD:'usdRate',CNY:'cnyRate',EUR:'eurRate'}[cur];var e=id&&document.getElementById(id);var n=e?parseFloat(String(e.textContent).replace(/\s/g,'').replace(',','.')):NaN;return isFinite(n)?n:NaN}
  function kpHtml(q){
    var r=rateRub(q.currency),rub=isFinite(r)?Math.round(q.price*r):null,link=location.origin+'/#kp='+q.id,exp=new Date(q.validUntil)<new Date();
    return '<article class="k v3p-kp"><header><div><span class="v3p-kplogo">iomastavka</span><small>Логистика Китай → Россия</small></div><div class="v3p-kpno"><b>'+esc(q.number)+'</b><small>от '+date(q.createdAt)+'</small></div></header>'
      +'<h2>Коммерческое предложение</h2><p class="v3p-kproute">'+esc(q.from)+' → '+esc(q.to)+'</p>'
      +'<div class="v3p-kpprice"><span>Стоимость перевозки</span><b>'+fmt(q.price)+' '+esc(q.currency)+'</b>'+(rub?'<small>≈ '+fmt(rub)+' ₽ по курсу ЦБ на сегодня</small>':'')+'</div>'
      +'<ul class="v3p-rows">'+[['Транспорт',MODE2[q.mode]||esc(q.mode||'—')],['Срок в пути',q.transitDays?esc(q.transitDays)+' дн.':'уточняется'],['Вес',q.weight!=null?fmt(q.weight)+' кг':'—'],['Объём',q.volume?fmt(q.volume)+' м³':'—'],['Мест',q.places!=null?fmt(q.places):'—'],['Основа ставки',esc([q.basis,q.container].filter(Boolean).join(', ')||'—')],['Условия поставки',esc(q.incoterms||'—')],['Комиссия перевозчика',q.commission?fmt(q.commission)+' '+esc(q.currency)+' (включена)':'нет']].map(function(x){return '<li><span>'+x[0]+'</span><b>'+x[1]+'</b></li>'}).join('')+'</ul>'
      +'<p class="v3p-kpvalid'+(exp?' exp':'')+'">'+(exp?'Срок действия истёк '+date(q.validUntil)+' — запросите актуальную ставку':'Действует до '+date(q.validUntil))+'</p>'
      +'<p class="v3p-muted v3p-kpnote">Ставка ориентировочная, рассчитана по базе предложений перевозчиков. Терминальные расходы в пункте прибытия, таможенные платежи и страхование уточняются отдельно.</p>'
      +'<div class="v3p-kpbtns"><button type="button" class="calculate" data-kpprint>Печать / PDF</button><button type="button" class="v3p-cta" data-kpcopy="'+esc(link)+'">Скопировать ссылку</button><button type="button" class="v3c-link" data-open-view="leadView">Подтвердить ставку у менеджера →</button></div></article>'}
  function openQuote(id){api('/api/quotes/'+encodeURIComponent(id)).then(function(d){$('#v3kp').innerHTML=kpHtml(d.quote);openView('quoteView')}).catch(function(x){toast(x.message)})}
  window.__v3openQuote=openQuote;
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-kpprint],[data-kpcopy],[data-kpopen]');if(!t)return;
    if(t.hasAttribute('data-kpprint'))window.print();if(t.dataset.kpcopy)copy(t.dataset.kpcopy);if(t.dataset.kpopen)openQuote(t.dataset.kpopen)});
  function quoteRow(q,owner){return '<article class="k v3p-qrow"><div><b>'+esc(q.number)+'</b> · '+esc(q.from)+' → '+esc(q.to)+'<small>'+date(q.createdAt)+(owner?' · '+esc(owner):'')+(q.company?' · '+esc(q.company):'')+' · до '+date(q.validUntil)+'</small></div><b class="v3p-qp">'+fmt(q.price)+' '+esc(q.currency)+'</b><button type="button" class="v3c-link" data-kpopen="'+esc(q.id)+'">Открыть</button></article>'}
  function loadMyQuotes(){var box=$('#v3cabQuotes');api('/api/my/quotes').then(function(d){box.innerHTML=d.items.length?d.items.map(function(q){return quoteRow(q)}).join(''):'<div class="k v3p-empty"><b>Пока нет КП</b><small>Посчитайте ставку — КП сохранится здесь автоматически.</small><button type="button" class="calculate" data-open-view="calculator">Рассчитать ставку</button></div>'}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function loadAllQuotes(){var box=$('#v3quotesList');if(!box)return;api('/api/quotes').then(function(d){box.innerHTML=d.items.length?d.items.map(function(q){return quoteRow(q,q.ownerName)}).join(''):'<div class="k v3p-empty"><b>КП пока нет</b><small>Здесь будут все расчёты клиентов и гостей, которые сохранили КП.</small></div>'}).catch(function(){})}
  $$('#v3cabTabs .chip').forEach(function(t){t.addEventListener('click',function(){$$('#v3cabTabs .chip').forEach(function(x){x.classList.toggle('on',x===t)});var q=t.dataset.ctab==='quotes';$('#v3cabList').hidden=q;$('#v3cabQuotes').hidden=!q;if(q)loadMyQuotes()})});

  /* сохранение КП после расчёта */
  var LSK='iomaQuotes';function lsGet(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function calcInput(){var v=function(id){var e=document.getElementById(id);return e?String(e.value||'').trim():''};var vol=((($('#autoVolume')||{}).textContent||'').match(/[\d.,]+/)||[''])[0].replace(',','.');
    var mode='';try{mode=typeof selectedMode!=='undefined'&&selectedMode?selectedMode:''}catch(e){}
    var est=window.__v3est||{};return {from:v('fromCity'),to:v('toCity'),weight:v('weight'),places:v('pieces'),volume:parseFloat(vol)>0?vol:'',distance:v('distance'),mode:mode,kind:est.kind||'',dangerous:!!est.dangerous,dealId:role==='admin'?(window.__crmDeal||''):'',incoterms:((($('#incotermBtn span')||{}).textContent)||'').trim()}}
  function renderSaved(){var box=$('#v3saved');if(!box)return;var list=lsGet(LSK,[]);if(role!=='guest'||!list.length){box.hidden=true;return}
    box.hidden=false;box.innerHTML='<b>Ваши сохранённые расчёты</b>'+list.slice(0,5).map(function(q){return '<button type="button" class="v3c-link" data-kpopen="'+esc(q.id)+'">'+esc(q.number)+' · '+esc(q.from)+' → '+esc(q.to)+'</button>'}).join('')}
  function saveQuote(extra,silent){var body=calcInput();for(var k in extra)body[k]=extra[k];
    return api('/api/quotes',{method:'POST',body:body}).then(function(d){var q=d.quote;var list=lsGet(LSK,[]).filter(function(x){return x.id!==q.id});list.unshift({id:q.id,number:q.number,from:q.from,to:q.to});lsSet(LSK,list.slice(0,20));renderSaved();
      var where=[];if(d.delivered.telegram)where.push('в Telegram');if(d.delivered.email)where.push('на почту');
      showSavedBanner(q,where);if(!silent)toast(q.number+' сохранено'+(where.length?' и отправлено '+where.join(' и '):''),6000);return d})}
  function showSavedBanner(q,where){var w=$('#result .result-price-window');if(!w)return;var old=$('.v3p-saved',w);old&&old.remove();
    var link=location.origin+'/#kp='+q.id;var d=document.createElement('div');d.className='v3p-saved';
    d.innerHTML='<span>✓ <b>'+esc(q.number)+'</b> сохранено'+(role==='client'?' в «Мои КП»':'')+(where.length?' · отправлено '+where.join(' и '):'')+'</span><span class="v3p-savedbtns"><button type="button" data-kpopen="'+esc(q.id)+'">Открыть КП</button><button type="button" data-kpcopy="'+esc(link)+'">Ссылка</button></span>';w.appendChild(d)}
  var lastKey='',lastSeq=-1;
  res&&new MutationObserver(function(){setTimeout(function(){
    var w=$('.result-price-window',res),pr=w&&$('.result-price',w);if(!w||!pr||pr.classList.contains('muted')||$('.v3p-saved,.v3p-savebtn',w))return;
    var inp=calcInput(),key=JSON.stringify(inp);
    var sq=(window.__v3est||{}).seq;
    if(role==='client'&&sq!==lastSeq){if(key===lastKey)return;lastKey=key;lastSeq=sq;saveQuote({},false).catch(function(x){toast(x.message)})}
    else{var b=document.createElement('button');b.type='button';b.className='v3p-savebtn';b.textContent=role==='admin'?'Создать КП (ссылка для клиента)':'Сохранить расчёт — получить ссылку на КП';
      b.addEventListener('click',function(){b.disabled=true;saveQuote({},false).then(function(){b.remove()}).catch(function(x){b.disabled=false;toast(x.message)})});w.appendChild(b)}
  },60)}).observe(res,{childList:true});

  /* память калькулятора: ввод не теряется при перезагрузке */
  var CK='iomaCalc';
  var CF=['fromCity','toCity','weight','pieces','distance','length','width','height'];
  function saveCalc(){var m={};CF.forEach(function(id){var e=document.getElementById(id);if(e&&e.value)m[id]=e.value});lsSet(CK,m)}
  CF.forEach(function(id){var e=document.getElementById(id);if(!e)return;e.addEventListener('change',saveCalc);e.addEventListener('input',function(){clearTimeout(saveCalc.t);saveCalc.t=setTimeout(saveCalc,400)})});
  // выбор города из подсказки меняет поле без события — сохраняем и после клика по подсказке, и перед расчётом
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.suggestions,.suggestion,[class*=suggest],#calculate,#v3go'))setTimeout(saveCalc,80)},true);
  window.addEventListener('pagehide',saveCalc);
  setTimeout(function(){var m=lsGet(CK,{});Object.keys(m).forEach(function(id){var e=document.getElementById(id);if(e&&!e.value&&m[id]){e.value=m[id];e.dispatchEvent(new Event('input',{bubbles:true}))}})},400);

  /* ---------- регистрация, показ пароля, вход сразу в кабинет ---------- */
  function goIn(r){try{history.replaceState(null,'',r==='admin'?'/rabota':'/kabinet')}catch(e){}location.reload()} // после входа — сразу на страницу «Работа» или «Мои грузы»
  var rf2=$('#v3regForm');
  $('#v3regBtn')&&$('#v3regBtn').addEventListener('click',function(){lf.hidden=true;rf2.hidden=false;if(lf.login.value.indexOf('@')>0)rf2.email.value=lf.login.value;rf2.name.focus()});
  $('#v3regBack')&&$('#v3regBack').addEventListener('click',function(){rf2.hidden=true;lf.hidden=false;if(rf2.email.value)lf.login.value=rf2.email.value;lf.password.focus()});
  rf2&&rf2.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3regErr');err.textContent='';var b=$('button[type=submit]',rf2);b.disabled=true;
    var body={};['name','company','email','phone','password','website'].forEach(function(k){body[k]=rf2[k].value});
    api('/api/register',{method:'POST',body:body}).then(function(d){rf2.dataset.dirty='';if(d.role==='client')goIn('client');else b.disabled=false}).catch(function(x){err.textContent=x.message;b.disabled=false})});
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.v3p-eye');if(!b)return;var i=b.parentNode.querySelector('input');var show=i.type==='password';i.type=show?'text':'password';b.classList.toggle('on',show);b.setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль')});
  // при открытии окна входа — всегда форма входа
  var _ov=openView;openView=function(id){if(id==='loginView'&&rf2){rf2.hidden=true;lf.hidden=false;var ff3=$('#v3forgotForm');if(ff3)ff3.hidden=true}_ov(id)};window.__v3open=openView;

  /* ---------- «Сохранить или выйти?» при закрытии окна с несохранёнными данными ---------- */
  var DK='iomaLeadDraft';
  function leadFilled(){var f=$('#v3leadForm');if(!f||f.hidden)return false;return ['name','contact','cargo','comment'].some(function(k){return String(f[k].value||'').trim()})}
  function calcUnsaved(){return !!$('#result .v3p-savebtn:not([disabled])')}
  function openId(){var v=$('.view-layer.open');return v?v.id:''}
  function dirtyInfo(){var id=openId();
    if(id==='calculatorView'&&calcUnsaved())return {p:'Расчёт ещё не сохранён. Сохраните его — получите КП со ссылкой, к нему можно вернуться в любой момент.',save:function(){return saveQuote({},false).then(function(d){var b=$('#result .v3p-savebtn');b&&b.remove();return d})}};
    if(id==='leadView'&&leadFilled())return {p:'Заявка не отправлена. Сохранить черновик? Он останется в форме, когда вы вернётесь.',saveText:'Сохранить черновик',save:function(){var f=$('#v3leadForm'),d={};['name','contact','from','to','cargo','weight','volume','comment'].forEach(function(k){d[k]=f[k].value});lsSet(DK,d);toast('Черновик заявки сохранён');return Promise.resolve()}};
    if(id==='accountView'){var pf=$('#v3profForm');if(pf&&pf.dataset.dirty==='1')return {p:'Изменения в профиле не сохранены.',save:function(){return new Promise(function(ok,no){pf.requestSubmit();setTimeout(function(){var er=$('.v3p-err',pf);if(er&&er.textContent)no(new Error(er.textContent));else{pf.dataset.dirty='';ok()}},1400)})}}}
    if(id==='loginView'&&rf2&&!rf2.hidden&&rf2.dataset.dirty==='1')return {p:'Кабинет ещё не создан — данные формы пропадут.',saveText:'Создать кабинет',save:function(){rf2.requestSubmit();return new Promise(function(){})}};
    return null}
  document.addEventListener('input',function(e){var f=e.target.closest&&e.target.closest('#v3profForm,#v3regForm');if(f)f.dataset.dirty='1'},true);
  var ask=$('#v3ask'),pending=null,bypass=false;
  function leaving(t){if(!t||!t.closest)return false;if(t.closest('#v3ask'))return false;
    if(t.closest('[data-close-view],.view-close,[data-nav],#logoutButton'))return true;
    var o=t.closest('[data-open-view]');if(o){var cur=openId();var map={calculator:'calculatorView',news:'newsView',assistant:'assistantView',forwarders:'forwardersView',customsView:'customsView'};var n=o.getAttribute('data-open-view');return (map[n]||n)!==cur}
    return t.classList&&t.classList.contains('view-layer')&&t.classList.contains('open')&&window.__iomaDownOn===t}
  function showAsk(info,go){pending={info:info,go:go};$('#v3askP').textContent=info.p;$('[data-ask=save]',ask).textContent=info.saveText||'Сохранить';ask.hidden=false;setTimeout(function(){$('[data-ask=save]',ask).focus()},30)}
  window.addEventListener('click',function(e){if(bypass||!ask)return;if(!leaving(e.target))return;var info=dirtyInfo();if(!info)return;
    e.preventDefault();e.stopImmediatePropagation();var t=e.target;showAsk(info,function(){bypass=true;try{t.click()}finally{bypass=false}})},true);
  window.addEventListener('keydown',function(e){if(e.key!=='Escape'||!ask)return;if(!ask.hidden){e.stopImmediatePropagation();ask.hidden=true;pending=null;return}var info=dirtyInfo();if(!info)return;e.stopImmediatePropagation();showAsk(info,function(){window.__iomaCloseViews&&window.__iomaCloseViews()})},true);
  ask&&ask.addEventListener('click',function(e){var b=e.target.closest('[data-ask]');if(!b&&(e.target!==ask||window.__iomaDownOn!==ask))return;var a=b?b.dataset.ask:'stay',p=pending;
    if(a==='stay'||!p){ask.hidden=true;pending=null;return}
    if(a==='leave'){ask.hidden=true;pending=null;if(openId()==='leadView')lsSet(DK,null);p.go();return}
    b.disabled=true;p.info.save().then(function(){ask.hidden=true;pending=null;b.disabled=false;setTimeout(p.go,350)}).catch(function(x){b.disabled=false;$('#v3askP').textContent=x.message||'Не удалось сохранить'})});
  // черновик заявки возвращается в форму
  var _pl=prefillLead;prefillLead=function(){_pl();var d=lsGet(DK,null),f=$('#v3leadForm');if(d&&f)Object.keys(d).forEach(function(k){if(f[k]&&!f[k].value&&d[k])f[k].value=d[k]})};

  /* =================== ссылки вида /#kp=…, /#reset=…, /#cabinet =================== */
  function route(){var h=location.hash||'';var m;
    if((m=h.match(/^#kp=([a-f0-9]{16})$/)))openQuote(m[1]);
    else if((m=h.match(/^#reset=([\w-]{20,})$/))){resetToken=m[1];history.replaceState(null,'',location.pathname);openView('resetView')}
    else if(h==='#kb')setTimeout(function(){openView('kbView')},300);
    else if(h==='#calc'){try{history.replaceState(null,'',location.pathname)}catch(e){}setTimeout(function(){window.__iomaOpenView&&window.__iomaOpenView('calculator')},300)}
    else if(h==='#cabinet'||h==='#work'){try{history.replaceState(null,'',location.pathname)}catch(e){}if(!$('.view-layer.open'))openView(h==='#work'?(role==='admin'?'workView':'loginView'):(role==='client'?'cabinetView':'loginView'))}
  }
  window.addEventListener('hashchange',route);
  var waitRole=setInterval(function(){if(document.body.className.match(/role-/)){clearInterval(waitRole);route();renderSaved()}},100);

})();
