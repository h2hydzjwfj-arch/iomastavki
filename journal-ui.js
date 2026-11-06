/* IOMASTAVKA — «Работа → Журнал»: всё, что посетители и клиенты вводили на сайте,
   отдельными строками, каждое поле — в своей колонке. Выгрузка в Excel (CSV). */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  var GROUPS=[['all','Все',null],['calc','Расчёты',['calc']],['leads','Заявки',['lead','lead_docs']],['quote','КП',['quote']],['users','Регистрации и входы',['register','login','login_fail','forgot','profile','cabinet']],['ships','Грузы',['ship','ship_update']]];
  var MONTHS=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  var state={month:'',group:'all',q:'',data:null};
  var MAX=1000;

  function monthName(m){var p=m.split('-');return (MONTHS[+p[1]-1]||m)+' '+p[0]}
  function when(iso){var d=new Date(iso);if(isNaN(d))return '';var now=new Date();
    return d.toLocaleString('ru-RU',Object.assign({day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'},d.getFullYear()!==now.getFullYear()?{year:'numeric'}:{}))}
  function cell(k,v){
    if(v==null||v==='')return '';
    if(k==='at')return when(v);
    if(k==='dangerous')return v===true||v==='true'?'да':'';
    if(typeof v==='number')return v.toLocaleString('ru-RU',{maximumFractionDigits:2});
    return esc(v);
  }
  function filtered(){
    var d=state.data;if(!d)return [];var g=GROUPS.find(function(x){return x[0]===state.group});var set=g&&g[2];
    var q=state.q.trim().toLowerCase();
    return d.items.filter(function(r){
      if(set&&set.indexOf(r.type)<0)return false;
      if(!q)return true;
      return Object.keys(r).some(function(k){return k!=='id'&&String(r[k]).toLowerCase().indexOf(q)>=0});
    });
  }
  function draw(){
    var box=$('#jrnBox');if(!box||!state.data)return;var d=state.data;
    var rows=filtered();
    // считаем по видам — сверху короткая сводка
    var cnt={};d.items.forEach(function(r){cnt[r.type]=(cnt[r.type]||0)+1});
    var sum=[['calc','Расчётов'],['lead','Заявок'],['lead_docs','С документами'],['quote','КП'],['register','Регистраций'],['login','Входов']].filter(function(x){return cnt[x[0]]}).map(function(x){return x[1]+': <b>'+cnt[x[0]]+'</b>'}).join(' · ')||'Записей за этот месяц пока нет';
    // колонки: только те, где есть данные
    var cols=d.columns.filter(function(c){return c[0]==='at'||c[0]==='typeName'||rows.some(function(r){var v=r[c[0]];return v!=null&&v!==''&&v!==false})});
    var shown=rows.slice(0,MAX);
    var g=GROUPS.find(function(x){return x[0]===state.group});
    var csv='/api/journal/export?month='+encodeURIComponent(state.month)+(g&&g[2]?'&type='+g[2].join(','):'');
    var h='<div class="jrn-bar"><label class="jrn-month"><span>Месяц</span><select id="jrnMonth">'+d.months.map(function(m){return '<option value="'+m+'"'+(m===state.month?' selected':'')+'>'+monthName(m)+'</option>'}).join('')+'</select></label>'
      +'<div class="jrn-types" role="group" aria-label="Что показать">'+GROUPS.map(function(x){return '<button type="button" class="chip'+(x[0]===state.group?' on':'')+'" data-jg="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'
      +'<input id="jrnQ" type="search" placeholder="Поиск: город, имя, телефон, почта…" value="'+esc(state.q)+'">'
      +'<a class="calculate v3p-sm jrn-csv" href="'+csv+'" download>Скачать для Excel</a></div>'
      +'<p class="jrn-sum">'+sum+'</p>';
    if(!rows.length){h+='<div class="k v3p-empty"><b>Нет записей</b><small>'+(state.q||state.group!=='all'?'Попробуйте другой фильтр или поиск.':'Здесь появится каждый расчёт, заявка, регистрация и вход на сайт.')+'</small></div>';box.innerHTML=h;return}
    h+='<div class="jrn-wrap"><table class="jrn"><thead><tr>'+cols.map(function(c){return '<th>'+esc(c[1])+'</th>'}).join('')+'</tr></thead><tbody>'
      +shown.map(function(r){return '<tr class="t-'+esc(r.type)+'">'+cols.map(function(c){var k=c[0];var v=cell(k,r[k]);return '<td'+(k==='result'||k==='comment'?' class="wide"':'')+(k==='typeName'?' class="ty"':'')+'>'+v+'</td>'}).join('')+'</tr>'}).join('')
      +'</tbody></table></div>';
    if(rows.length>MAX)h+='<p class="v3p-muted">Показаны последние '+MAX+' из '+rows.length+'. Уточните поиск или скачайте всё для Excel.</p>';
    box.innerHTML=h;
  }
  function load(m){
    var box=$('#jrnBox');if(!box)return;if(!state.data)box.innerHTML='<p class="v3p-muted">Загружаю журнал…</p>';
    fetch('/api/journal'+(m?'?month='+encodeURIComponent(m):''),{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json().then(function(d){if(!r.ok||d.ok===false)throw new Error(d.error||'Ошибка '+r.status);return d})})
      .then(function(d){state.data=d;state.month=d.month;draw()})
      .catch(function(e){box.innerHTML='<p class="v3p-err">'+esc(e.message)+'</p>'});
  }
  window.IOMA_JOURNAL={load:function(){load(state.month)}};
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-tab=journal]');if(t){setTimeout(function(){load(state.month)},0);return}
    var g=e.target.closest&&e.target.closest('[data-jg]');if(g&&g.closest('#jrnBox')){state.group=g.dataset.jg;draw()}
  });
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='jrnMonth'){state.month=e.target.value;state.data=null;load(state.month)}});
  var qt;document.addEventListener('input',function(e){if(e.target&&e.target.id==='jrnQ'){clearTimeout(qt);var v=e.target.value;qt=setTimeout(function(){state.q=v;var pos=e.target.selectionStart;draw();var i=$('#jrnQ');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(x){}}},250)}});
})();
