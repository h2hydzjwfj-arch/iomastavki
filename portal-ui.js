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
    document.body.classList.remove('role-guest','role-client','role-admin');document.body.classList.add('role-'+role);
    setTimeout(function(){window.dispatchEvent(new Event('resize'))},30);
    if(role==='admin')loadLeadCount();
  }
  api('/api/me').then(function(d){setRole(d.role,d.name)}).catch(function(){setRole('guest')});

  /* ---------- открытие своих окон ---------- */
  var MY={loginView:1,leadView:1,cabinetView:1,workView:1};
  function openView(id){
    if(id==='cabinetView'&&role==='guest')id='loginView';
    if(id==='workView'&&role!=='admin')id='loginView';
    var t=document.getElementById(id);if(!t)return;
    $$('.view-layer').forEach(function(v){v.classList.remove('open');v.setAttribute('aria-hidden','true')});
    t.classList.add('open');t.setAttribute('aria-hidden','false');document.body.classList.add('view-open');
    if(id==='leadView')prefillLead();if(id==='cabinetView')loadCabinet();if(id==='workView')loadWork();
    if(id==='loginView')setTimeout(function(){var i=$('#v3loginForm input[name=login]');i&&i.focus()},120);
  }
  window.__v3open=openView;
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-open-view]');if(!t)return;var n=t.getAttribute('data-open-view');if(MY[n]){e.preventDefault();e.stopPropagation();openView(n)}},true);

  /* ---------- вход ---------- */
  var lf=$('#v3loginForm');
  lf&&lf.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3loginErr');err.textContent='';var b=$('button[type=submit]',lf);b.disabled=true;
    api('/api/login',{method:'POST',body:{login:lf.login.value,password:lf.password.value}}).then(function(){location.reload()}).catch(function(x){err.textContent=x.message;b.disabled=false})});

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
    api('/api/leads',{method:'POST',body:body}).then(function(){lead.reset();lead.hidden=true;$('#v3leadDone').hidden=false}).catch(function(x){err.textContent=x.message}).then(function(){b.disabled=false})});

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
  function shipCard(s,admin,clientName){
    var ev=(s.events||[]).slice().reverse();
    return '<article class="k v3p-ship" data-id="'+esc(s.id)+'"><header><div><span class="tag">№ '+esc(s.number)+'</span><h3>'+esc(s.from||'—')+' → '+esc(s.to||'—')+'</h3><small>'+(MODE[s.mode]||'Транспорт уточняется')+' · прибытие: '+(s.eta?date(s.eta):'уточняется')+(clientName?' · '+esc(clientName):'')+'</small></div><span class="v3p-status s-'+esc(s.status)+'">'+(ST[s.status]||esc(s.status))+'</span></header>'
      +steps(s.status)
      +'<div class="v3p-cols"><section><b class="v3p-h">Груз</b>'+cargo(s)+'</section><section><b class="v3p-h">Сколько и за что</b>'+costs(s.costs)+'</section><section><b class="v3p-h">Документы</b>'+docs(s,admin)+(admin?'<label class="v3p-upl">＋ Загрузить документ<input type="file" data-upl="'+esc(s.id)+'" hidden></label>':'')+'</section></div>'
      +(ev.length?'<details class="v3p-hist"><summary>История ('+ev.length+')</summary><ul>'+ev.map(function(x){return '<li><time>'+dtime(x.date)+'</time><b>'+(ST[x.status]||esc(x.status))+'</b>'+(x.note?' — '+esc(x.note):'')+'</li>'}).join('')+'</ul></details>':'')
      +(admin?'<div class="v3p-admin"><select data-status="'+esc(s.id)+'">'+STK.map(function(k){return '<option value="'+k+'"'+(k===s.status?' selected':'')+'>'+ST[k]+'</option>'}).join('')+'</select><input data-note="'+esc(s.id)+'" placeholder="Комментарий к статусу (видит клиент)" maxlength="300"><input data-eta="'+esc(s.id)+'" type="date" value="'+esc(/^\d{4}-\d\d-\d\d$/.test(s.eta||'')?s.eta:'')+'" title="Прибытие"><button type="button" class="calculate" data-save="'+esc(s.id)+'">Обновить</button><button type="button" class="v3p-del" data-delship="'+esc(s.id)+'">Удалить</button></div>':'')
      +'</article>'}
  function loadCabinet(){var box=$('#v3cabList');if(!box)return;box.innerHTML='<p class="v3p-muted">Загружаю…</p>';
    if(me.name)$('#v3cabHello').textContent=me.name+', здесь ваши грузы: статус, маршрут, расходы и документы.';
    api('/api/my/shipments').then(function(d){box.innerHTML=d.items.length?d.items.map(function(s){return shipCard(s,false)}).join(''):'<div class="k v3p-empty"><b>Пока нет грузов</b><small>Как только менеджер оформит перевозку, она появится здесь.</small><button type="button" class="calculate" data-open-view="leadView">Оставить заявку</button></div>'})
      .catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}

  /* ---------- раздел «Работа» (администратор) ---------- */
  var clients=[];
  function loadLeadCount(){api('/api/leads').then(function(d){var n=d.items.filter(function(l){return l.status==='new'}).length;var c=$('#v3leadCount');if(c)c.textContent=n?'· '+n+' новых':''}).catch(function(){})}
  $$('.v3p-tabs .chip').forEach(function(t){t.addEventListener('click',function(){$$('.v3p-tabs .chip').forEach(function(x){x.classList.toggle('on',x===t)});$$('.v3p-tab').forEach(function(p){p.hidden=p.dataset.pane!==t.dataset.tab})})});
  function loadWork(){loadLeads();loadClients().then(loadShips)}
  function loadLeads(){var box=$('#v3leadsList');api('/api/leads').then(function(d){
    box.innerHTML=d.items.length?d.items.map(function(l){var c=String(l.contact||''),href=/^@/.test(c)?'https://t.me/'+encodeURIComponent(c.slice(1)):/^[+\d][\d\s()-]{6,}$/.test(c)?'tel:'+c.replace(/[^\d+]/g,''):'';
      return '<article class="k v3p-lead s-'+esc(l.status)+'"><header><div><b>'+esc(l.name)+'</b> · '+(href?'<a href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(c)+'</a>':esc(c))+'<small>'+dtime(l.createdAt)+'</small></div><select data-lead="'+esc(l.id)+'">'+Object.keys(LS).map(function(k){return '<option value="'+k+'"'+(k===l.status?' selected':'')+'>'+LS[k]+'</option>'}).join('')+'</select></header>'
        +'<p><b>'+esc(l.from||'—')+' → '+esc(l.to||'—')+'</b>'+(l.mode?' · '+(MODE[l.mode]||''):'')+'</p><p>'+esc(l.cargo||'')+(l.weight!=null?' · '+fmt(l.weight)+' кг':'')+(l.volume!=null?' · '+fmt(l.volume)+' м³':'')+(l.estimate?' · оценка: '+esc(l.estimate):'')+'</p>'+(l.comment?'<p class="v3p-muted">'+esc(l.comment)+'</p>':'')
        +'<button type="button" class="v3c-link" data-mkclient="'+esc(l.id)+'">Сделать клиентом →</button></article>'}).join(''):'<div class="k v3p-empty"><b>Заявок пока нет</b><small>Заявки с сайта появятся здесь и придут вам в Telegram, если он подключён.</small></div>';
    box._items=d.items;loadLeadCount()}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function loadClients(){var box=$('#v3clientsList');return api('/api/clients').then(function(d){clients=d.items;
    $('#v3shipClient').innerHTML='<option value="">— выберите —</option>'+clients.filter(function(c){return c.active}).map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.name)+(c.company?' · '+esc(c.company):'')+'</option>'}).join('');
    box.innerHTML=clients.length?clients.map(function(c){return '<article class="k v3p-client'+(c.active?'':' off')+'"><div><b>'+esc(c.name)+'</b>'+(c.company?' · '+esc(c.company):'')+'<small>'+esc(c.email)+(c.phone?' · '+esc(c.phone):'')+'</small></div><div class="v3p-actions"><button type="button" class="v3c-link" data-reset="'+esc(c.id)+'">Новый пароль</button><button type="button" class="v3c-link" data-active="'+esc(c.id)+'" data-val="'+(c.active?'0':'1')+'">'+(c.active?'Отключить доступ':'Включить доступ')+'</button></div></article>'}).join(''):'<div class="k v3p-empty"><b>Клиентов пока нет</b><small>Создайте доступ — клиент войдёт по почте и паролю и увидит свои грузы.</small></div>'}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function loadShips(){var box=$('#v3shipsList');api('/api/shipments').then(function(d){var by={};clients.forEach(function(c){by[c.id]=c.name});
    box.innerHTML=d.items.length?d.items.map(function(s){return shipCard(s,true,by[s.clientId]||'клиент удалён')}).join(''):'<div class="k v3p-empty"><b>Грузов пока нет</b><small>Создайте груз выше — клиент сразу увидит его в своём кабинете.</small></div>'}).catch(function(x){box.innerHTML='<p class="v3p-err">'+esc(x.message)+'</p>'})}
  function showPw(email,pw){var ok=$('#v3clientOk');ok.innerHTML='Доступ для <b>'+esc(email)+'</b>: пароль <code>'+esc(pw)+'</code> — передайте клиенту. Пароль показан один раз. Вход: '+esc(location.origin);}
  var cf=$('#v3clientForm');
  cf&&cf.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3clientErr');err.textContent='';$('#v3clientOk').textContent='';
    api('/api/clients',{method:'POST',body:{email:cf.email.value,name:cf.name.value,company:cf.company.value,phone:cf.phone.value}}).then(function(d){showPw(d.item.email,d.password);cf.reset();loadClients()}).catch(function(x){err.textContent=x.message})});
  var sf=$('#v3shipForm');
  sf&&sf.addEventListener('submit',function(e){e.preventDefault();var err=$('#v3shipErr');err.textContent='';var body={};
    ['clientId','number','from','to','mode','cargo','weight','volume','places','dims','eta'].forEach(function(k){if(sf[k].value!=='')body[k]=sf[k].value});
    body.costs=sf.costs.value.split('\n').map(function(l){var p=l.split(';');return {label:(p[0]||'').trim(),amount:(p[1]||'').trim().replace(/\s/g,''),currency:(p[2]||'USD').trim()}}).filter(function(c){return c.label&&c.amount});
    api('/api/shipments',{method:'POST',body:body}).then(function(){sf.reset();loadShips()}).catch(function(x){err.textContent=x.message})});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.dataset.lead)api('/api/leads/'+encodeURIComponent(t.dataset.lead),{method:'PATCH',body:{status:t.value}}).then(loadLeads).catch(function(x){alert(x.message)});
    if(t.dataset.upl&&t.files&&t.files[0]){var fd=new FormData();fd.append('file',t.files[0]);api('/api/shipments/'+encodeURIComponent(t.dataset.upl)+'/docs',{method:'POST',body:fd}).then(loadShips).catch(function(x){alert(x.message)})}
  });
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('button');if(!t||!t.closest('#workView'))return;
    if(t.dataset.save){var id=t.dataset.save;var body={status:$('[data-status="'+id+'"]').value,eventNote:$('[data-note="'+id+'"]').value};var eta=$('[data-eta="'+id+'"]').value;if(eta)body.eta=eta;api('/api/shipments/'+encodeURIComponent(id),{method:'PATCH',body:body}).then(loadShips).catch(function(x){alert(x.message)})}
    if(t.dataset.delship&&confirm('Удалить груз? Клиент перестанет его видеть.'))api('/api/shipments/'+encodeURIComponent(t.dataset.delship),{method:'DELETE'}).then(loadShips).catch(function(x){alert(x.message)});
    if(t.dataset.deldoc&&confirm('Удалить документ?'))api('/api/shipments/'+encodeURIComponent(t.dataset.ship)+'/docs/'+encodeURIComponent(t.dataset.deldoc),{method:'DELETE'}).then(loadShips).catch(function(x){alert(x.message)});
    if(t.dataset.reset)api('/api/clients/'+encodeURIComponent(t.dataset.reset)+'/reset',{method:'POST'}).then(function(d){var c=clients.find(function(x){return x.id===t.dataset.reset});$$('.v3p-tabs .chip')[2].click();showPw(c?c.email:'',d.password)}).catch(function(x){alert(x.message)});
    if(t.dataset.active)api('/api/clients/'+encodeURIComponent(t.dataset.active),{method:'PATCH',body:{active:t.dataset.val==='1'}}).then(loadClients).catch(function(x){alert(x.message)});
    if(t.dataset.mkclient){var l=($('#v3leadsList')._items||[]).find(function(x){return x.id===t.dataset.mkclient});$$('.v3p-tabs .chip')[2].click();if(l){cf.name.value=l.name||'';cf.phone.value=/^[+\d]/.test(l.contact)?l.contact:'';if(/@.+\./.test(l.contact))cf.email.value=l.contact;cf.email.focus()}}
  });
})();
