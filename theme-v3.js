/* IOMASTAVKA v3 — home bento behaviour. Progressive: if it fails, the site still works. */
(function(){
  var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches;
  var timers=[];
  function safe(f){try{f()}catch(e){console.warn('v3',e)}}

  /* 1. letters of the big title */
  safe(function(){var h=$('#v3h1');if(!h||reduce)return;var t=h.textContent;h.setAttribute('aria-label',t);h.innerHTML=t.split('').map(function(c,i){return '<span class="ch" aria-hidden="true" style="animation-delay:'+(.1+i*.05)+'s">'+c+'</span>'}).join('')});

  /* 2. nav pill */
  var nav=$('.v3-nav'),pill=$('.v3-pill');
  function movePill(){safe(function(){var b=$('.v3-nav button.on');if(!b||!pill)return;pill.style.left=b.offsetLeft+'px';pill.style.width=b.offsetWidth+'px'})}
  function syncNav(){
    var open=$('.view-layer.open'),map={kbView:'kbView',calculatorView:'calculator',assistantView:'assistant',newsView:'news',forwardersView:'forwarders',customsView:'customsView',loginView:'loginView',leadView:'leadView',cabinetView:'cabinetView',workView:'workView'};
    var key=open?map[open.id]:null;
    $$('.v3-nav button').forEach(function(b){b.classList.toggle('on',key?b.getAttribute('data-open-view')===key:b.dataset.nav==='home')});
    movePill();
  }
  safe(function(){
    if(!nav)return;
    $('[data-nav=home]').addEventListener('click',function(){window.__iomaCloseViews&&window.__iomaCloseViews();syncNav()});
    $$('.brand').forEach(function(b){b.addEventListener('click',function(){window.__iomaCloseViews&&window.__iomaCloseViews();syncNav()})});
    $$('.view-layer').forEach(function(v){new MutationObserver(syncNav).observe(v,{attributes:true,attributeFilter:['class']})});
    document.addEventListener('click',function(){setTimeout(syncNav,30)});
    window.addEventListener('resize',movePill);
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(movePill);
    movePill();setTimeout(movePill,300);
  });

  /* 3. route card: transport chips change the comet path */
  var MODES={h:{auto:'M40 120C160 140 330 30 480 80',rail:'M40 110Q260 -10 480 70',sea:'M40 100C120 150 380 150 480 70',air:'M40 110Q260 -90 480 70'},
             c:{auto:'M40 140C160 160 330 50 480 100',rail:'M40 140Q260 0 480 100',sea:'M40 140C120 188 380 182 480 100',air:'M40 140Q260 -70 480 100'}};
  var DUR={auto:6,rail:7,sea:10,air:3};
  var NAMES={auto:['Авто','Road','公路','Kara'],rail:['ЖД','Rail','铁路','Demiryolu'],sea:['Море','Sea','海运','Deniz'],air:['Авиа','Air','空运','Hava']};
  var curMode='rail';
  function drawMode(m){
    var R=window.IOMA_ROUTES;if(!R)return;
    var v=function(id){var e=document.getElementById(id);return e?String(e.value||'').trim():''};
    var from=v('fromCity')||'Шанхай',to=v('toCity')||'Москва';
    var hs=document.querySelector('#v3Hero .v3-map svg');
    var adv=R.render(hs,{from:from,to:to,mode:m,fromLabel:v('fromCity')||'',toLabel:v('toCity')||''});
    var cap=document.getElementById('v3hcap'),L=(function(){try{return localStorage.getItem('iomastavka_lang')||'ru'}catch(e){return 'ru'}})();
    var DAYS={ru:'дн.',en:'days',zh:'天',tr:'gün'}[L]||'дн.';
    if(cap&&adv&&adv.items[0]){var c=adv.items[0];cap.textContent=(c.t[L]||c.t.ru)+' · '+c.days[0]+'–'+c.days[1]+' '+DAYS}
    var cs=document.querySelector('.v3c-mapbox svg');var adv2=R.render(cs,{from:from,to:to,mode:m,fromLabel:v('fromCity')||'',toLabel:v('toCity')||''});
    var box=document.getElementById('v3advice');
    if(box&&adv2){var TX={ru:['Рекомендуем','Другие варианты','риск','Сроки ориентировочные, от двери до двери; зависят от загрузки погранпереходов и сезона.'],en:['Recommended','Other options','risk','Door-to-door times are indicative and depend on border congestion and season.'],zh:['推荐','其他方案','风险','门到门时效仅供参考，取决于口岸拥堵和季节。'],tr:['Önerilen','Diğer seçenekler','risk','Kapıdan kapıya süreler yaklaşıktır; sınır yoğunluğuna ve sezona bağlıdır.']}[L]||[];
      box.innerHTML='<p class="v3a-why">'+adv2.why+'</p>'+adv2.items.map(function(c,i){return '<div class="v3a-item'+(i?'':' best')+(c.risky?' risky':'')+'"><div class="v3a-h"><i style="background:'+R.colors[c.mode]+'"></i><b>'+(c.t[L]||c.t.ru)+'</b><span>'+c.days[0]+'–'+c.days[1]+' '+DAYS+'</span>'+(i?'':'<em>'+TX[0]+'</em>')+(c.risky?'<em class="rk">'+TX[2]+'</em>':'')+'</div><p class="p">+ '+(c.plus[L]||c.plus.ru)+'</p><p class="m">− '+(c.minus[L]||c.minus.ru)+'</p></div>'}).join('')+'<p class="v3a-note">'+TX[3]+' <button type="button" class="v3c-link" data-open-view="kbView">'+({ru:'Гид по доставке →',en:'Shipping guide →',zh:'运输指南 →',tr:'Taşıma rehberi →'}[L]||'Гид по доставке →')+'</button></p>'}
  }
  window.__v3drawMode=function(){drawMode(curMode)};
  function pickTransport(m){ // select the same transport in the real calculator menu
    var menu=document.getElementById('transportMenu');if(!menu)return;
    var item=$$('.hover-item',menu).find(function(b){return NAMES[m].indexOf(b.textContent.trim())>=0});
    if(item)item.click();
  }
  function setMode(m,fromUser){curMode=m;$$('.v3-chips .chip,.v3c-chips .chip').forEach(function(c){c.classList.toggle('on',c.dataset.m===m)});drawMode(m);if(fromUser)pickTransport(m)}
  window.__v3setMode=setMode;
  safe(function(){$$('.v3-chips .chip,.v3c-chips .chip').forEach(function(c){c.addEventListener('click',function(e){e.stopPropagation();setMode(c.dataset.m,true)})})});
  safe(function(){if(window.IOMA_ROUTES)drawMode(curMode);else window.addEventListener('load',function(){drawMode(curMode)})});

  /* route card on home: editable from / to / weight, synced with the calculator; the map redraws live */
  safe(function(){
    var CITIES=['Шанхай','Нинбо','Иу','Гуанчжоу','Шэньчжэнь','Циндао','Тяньцзинь','Пекин','Сиань','Чэнду','Чунцин','Ухань','Харбин','Далянь','Сямэнь','Фошань','Дунгуань','Урумчи','Москва','Санкт-Петербург','Екатеринбург','Новосибирск','Казань','Нижний Новгород','Краснодар','Ростов-на-Дону','Самара','Челябинск','Омск','Красноярск','Иркутск','Хабаровск','Владивосток','Минск','Алматы','Ташкент'];
    var dl=$('#v3cities');if(dl)dl.innerHTML=CITIES.map(function(c){return '<option value="'+c+'">'}).join('');
    var pairs=[['v3hFrom','fromCity'],['v3hTo','toCity'],['v3hW','weight']];
    function el(id){return document.getElementById(id)}
    var tm;function redraw(){clearTimeout(tm);tm=setTimeout(function(){drawMode(curMode)},220)}
    pairs.forEach(function(p){var h=el(p[0]),c=el(p[1]);if(!h||!c)return;
      h.addEventListener('input',function(){c.value=h.value;try{var m=JSON.parse(localStorage.getItem('iomaCalc')||'{}');m[p[1]]=h.value;localStorage.setItem('iomaCalc',JSON.stringify(m))}catch(e){}if(p[1]!=='weight')redraw()});
      h.addEventListener('change',function(){c.value=h.value;c.dispatchEvent(new Event('change',{bubbles:true}))});
      h.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();var g=el('v3go');g&&g.click()}});
      function back(){if(document.activeElement!==h&&h.value!==c.value){h.value=c.value;if(p[1]!=='weight')redraw()}}
      c.addEventListener('input',back);c.addEventListener('change',back);setInterval(back,1500);
    });
    ['fromCity','toCity'].forEach(function(i){var e=el(i);e&&e.addEventListener('change',redraw)});
    document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.lang'))setTimeout(function(){drawMode(curMode)},60)});
  });

  /* 4. calculate: loader with steps + confetti, then open calculator */
  function confetti(x,y){if(reduce)return;var C=['#E8A33D','#2E7D5B','#8FD3B0','#fff','#E8A33D'];for(var i=0;i<34;i++){var e=document.createElement('i');e.className='v3cf';e.style.left=x+'px';e.style.top=y+'px';e.style.background=C[i%5];document.body.appendChild(e);var a=Math.random()*Math.PI*2,v=120+Math.random()*260;(function(e,a,v){var an=e.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate('+Math.cos(a)*v+'px,'+(Math.sin(a)*v+160)+'px) rotate('+Math.random()*720+'deg)',opacity:0}],{duration:1300+Math.random()*700,easing:'cubic-bezier(.2,.7,.4,1)'});an.onfinish=function(){e.remove()}})(e,a,v)}}
  safe(function(){
    var go=$('#v3go'),ld=$('#v3ld'),t=$('#v3ldt'),hero=$('#v3Hero');if(!go)return;
    function fit(){ld.style.inset='0'}fit();
    go.addEventListener('click',function(ev){
      ev.stopPropagation();
      var st=['Запрашиваем ставки экспедиторов…','Считаем пошлину и НДС…','Подбираем лучший маршрут…'];
      ld.classList.add('on');ld.setAttribute('aria-hidden','false');t.textContent=st[0];
      setTimeout(function(){t.textContent=st[1]},850);setTimeout(function(){t.textContent=st[2]},1700);
      setTimeout(function(){ld.classList.remove('on');ld.setAttribute('aria-hidden','true');var r=go.getBoundingClientRect();confetti(r.left+r.width/2,r.top);window.__iomaOpenView&&window.__iomaOpenView('calculator');pickTransport(curMode);syncNav()},reduce?300:2600);
    });
  });

  /* 5. small decorations: wave bars, date, freshness */
  safe(function(){var w=$('.v3-wave');if(w)w.innerHTML=Array.apply(null,{length:12}).map(function(_,i){return '<i style="animation-delay:'+((i*.09)%1)+'s;animation-duration:'+(.7+(i%5)*.15)+'s"></i>'}).join('')});
  /* CBR rates on a chosen date: real 30-day sparklines and day-to-day change */
  safe(function(){
    var inp=$('#v3curDate'),lbl=$('#v3date'),today=$('#v3curToday');if(!inp)return;
    function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
    var t=iso(new Date());inp.max=iso(new Date(Date.now()+864e5));inp.min='1993-01-01';
    function spark(svg,vals){if(!svg)return;var p=svg.querySelector('path');if(!vals||vals.length<2){svg.style.visibility='hidden';return}svg.style.visibility='';var mn=Math.min.apply(0,vals),mx=Math.max.apply(0,vals),r=mx-mn||1;p.setAttribute('d',vals.map(function(v,i){return (i?'L':'M')+(2+i*60/(vals.length-1)).toFixed(1)+' '+(19-(v-mn)/r*16).toFixed(1)}).join(''))}
    function load(date){
      lbl.textContent='…';
      fetch('/api/currency'+(date&&date!==t?'?date='+date:''),{cache:'no-store'}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Нет данных');return d})}).then(function(d){
        lbl.textContent=d.date||new Date(date||t).toLocaleDateString('ru-RU');
        [['CNY','homeCny','dCny'],['USD','homeUsd','dUsd'],['EUR','homeEur','dEur']].forEach(function(x){var it=d.items[x[0]];if(!it)return;var b=el(x[1]);b.textContent=it.value.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:4});
          var dl=el(x[2]);if(dl){if(it.prev){var df=it.value-it.prev;dl.textContent=(df>0?'▲ ':df<0?'▼ ':'')+Math.abs(df).toFixed(2);dl.className='v3-dl '+(df>0?'up':df<0?'dn':'')}else dl.textContent=''}
          spark(b.parentNode.querySelector('.spk'),d.series&&d.series[x[0]])});
        today.hidden=!date||date===t;
      }).catch(function(e){lbl.textContent=e.message;today.hidden=false});
    }
    function el(id){return document.getElementById(id)}
    inp.addEventListener('change',function(){if(inp.value)load(inp.value)});
    lbl.parentNode.addEventListener('click',function(){try{inp.showPicker()}catch(e){inp.focus()}});
    today.addEventListener('click',function(){inp.value='';load('')});
    load('');
  });
  safe(function(){
    var s=$('#v3fresh'),t0=Date.now();if(!s)return;
    (function tick(){var m=Math.floor((Date.now()-t0)/60000);s.textContent='Обновлено '+(m<1?'только что':m+' мин назад');setTimeout(tick,30000)})();
  });

  /* 6. TN VED typing loop */
  safe(function(){
    var el=$('#v3code'),card=$('.v3-tn');if(!el)return;var txt='7616 99 100 8';
    if(reduce){el.textContent=txt;card.classList.add('done');return}
    (function cyc(){var i=0;card.classList.remove('done');el.textContent='';(function s(){el.textContent=txt.slice(0,++i);if(i<txt.length)setTimeout(s,90);else{card.classList.add('done');setTimeout(cyc,6500)}})()})();
  });

  /* 7. "ВАЖНО К ПРОЧТЕНИЮ" from the real news feed (urgent item first) */
  safe(function(){
    fetch('/api/news',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(d){
      var items=d&&(d.items||d.news||d);if(!Array.isArray(items)||!items.length)return;
      var it=items.find(function(x){return x.urgent})||items[0];var t=it&&String(it.title||it.headline||'').replace(/\s+[-–—]\s+[^-–—]{2,60}$/,'');
      if(t)$('#v3imp-t').textContent=t.length>140?t.slice(0,137)+'…':t;
    }).catch(function(){});
  });

  /* 8. tilt on cards (desktop, transform only) */
  if(fine&&!reduce)safe(function(){
    $$('.v3-grid .k').forEach(function(k){
      k.addEventListener('pointermove',function(e){var r=k.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;k.style.transform='perspective(900px) rotateX('+(-y*4)+'deg) rotateY('+(x*4)+'deg) translateY(-4px)'});
      k.addEventListener('pointerleave',function(){k.style.transform=''});
    });
  });

  /* 9. a11y: name every icon-only button */
  safe(function(){$$('button:not([aria-label])').forEach(function(b){if(!b.textContent.trim())b.setAttribute('aria-label',b.title||'Кнопка')})});
  /* 10. assistant quick questions -> fill input and send */
  safe(function(){
    $$('#v3quick button').forEach(function(b){b.addEventListener('click',function(){var i=$('#assistantInput'),send=$('#sendAI');if(!i||!send)return;i.value=b.textContent;i.dispatchEvent(new Event('input',{bubbles:true}));send.click()})});
  });
  /* 11. news filters (client-side by keywords; "Важные" uses the urgent flag) */
  safe(function(){
    var list=$('#newsList'),bar=$('#v3nf');if(!list||!bar)return;var cur='all';
    var KW={customs:/таможен|тамож|фтс|декларац|пошлин|тн вэд/i,logistics:/логист|перевоз|жд|ж\/д|море|контейнер|груз|порт|транспорт/i,law:/закон|прав|суд|регулир|постановлен|приказ|налог/i};
    function apply(){var any=0;$$('.nw',list).forEach(function(n){var ok=cur==='all'||n.dataset.cat===cur;n.classList.toggle('v3off',!ok);if(ok)any++});list.classList.toggle('nw-none',!any&&$$('.nw',list).length>0)}
    $$('.chip',bar).forEach(function(c){c.addEventListener('click',function(){cur=c.dataset.c;$$('.chip',bar).forEach(function(x){x.classList.toggle('on',x===c)});apply()})});
    new MutationObserver(apply).observe(list,{childList:true});
  });
  /* 12. theme button in the header -> the existing theme toggle */
  safe(function(){var b=$('#v3theme');b&&b.addEventListener('click',function(){var t=document.getElementById('themeToggleButton');t&&t.click()})});

  /* 14. calculator result -> big price, ruble estimate, delivery ring, breakdown */
  safe(function(){
    var res=$('#result');if(!res)return;
    function num(t){t=String(t||'').replace(/\s| /g,'').replace(',','.');var m=t.match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):NaN}
    function money(n){return isFinite(n)?n.toLocaleString('ru-RU',{maximumFractionDigits:0}):'—'}
    function rate(cur){var id={USD:'usdRate',CNY:'cnyRate',EUR:'eurRate'}[String(cur).toUpperCase()];var e=id&&document.getElementById(id);return e?num(e.textContent):NaN}
    function ring(days){var rf=$('#v3rf'),b=$('#v3days'),l=$('#v3dayl');if(!rf)return;if(isFinite(days)){b.textContent=days;l.textContent='дней';rf.style.strokeDashoffset=339*(1-Math.min(days,45)/45)}else{b.textContent='—';l.textContent='срок уточнить';rf.style.strokeDashoffset=339}}
    function bars(rows){var box=$('#v3break');if(!box)return;box.innerHTML=rows.map(function(r){return '<div><em>'+r[0]+'<span>'+r[1]+'</span></em><i class="'+(r[3]||'')+'" style="width:0" data-w="'+r[2]+'%"></i></div>'}).join('');setTimeout(function(){$$('i[data-w]',box).forEach(function(i){i.style.width=i.dataset.w+'%'})},60)}
    var busy=false;
    function apply(){
      if(busy)return;busy=true;
      try{
        var pe=$('.result-price',res),facts=$('#v3facts');
        if(!pe||res.classList.contains('hidden')||pe.classList.contains('muted')){ring(NaN);bars([['Ставка экспедитора','—',0],['Комиссия перевозчика','—',0],['Терминальные расходы','уточнить',100,'dash']]);facts&&(facts.innerHTML='');return}
        var cur=(($('span',pe)||{}).textContent||'USD').trim(),price=num(pe.firstChild?pe.firstChild.textContent:pe.textContent);
        // ruble estimate
        var r=rate(cur),meta=$('.result-meta',res);
        if(isFinite(r)&&isFinite(price)&&!$('.v3c-rub',res)){var d=document.createElement('div');d.className='v3c-rub';d.textContent='≈ '+money(price*r)+' ₽ по курсу ЦБ '+r.toLocaleString('ru-RU',{maximumFractionDigits:3});(meta||pe).insertAdjacentElement('afterend',d)}
        // count-up
        if(!reduce&&isFinite(price)&&!pe.dataset.v3){pe.dataset.v3='1';var node=pe.firstChild,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);node.textContent=money(price*e)+' ';if(k<1)requestAnimationFrame(f);else node.textContent=money(price)+' '})(t0)}
        // days from notes/meta text
        var txt=res.textContent,m=txt.match(/(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*(?:дн|дней|сут|days|天)/i);ring(m?Number(m[2]||m[1]):NaN);
        // breakdown
        var base=NaN,rows=[];$$('.result-grid span',res).forEach(function(sp){var b=$('b',sp),lab=sp.firstChild?sp.firstChild.textContent.trim():'';if(/Ставка|Base rate/i.test(lab))base=num(b&&b.textContent);else rows.push([lab,b?b.textContent:''])});
        var com=$('.commission-note',res)&&isFinite(base)?price-base:0;
        bars([['Ставка экспедитора',money(isFinite(base)?base:price)+' '+cur,isFinite(base)?Math.round(base/price*100):100],['Комиссия перевозчика 5%',com?money(com)+' '+cur:'нет',com?Math.max(3,Math.round(com/price*100)):0],['Терминальные расходы','уточнить',100,'dash']]);
        if(facts)facts.innerHTML=rows.map(function(r){return '<span>'+r[0]+'<b>'+r[1]+'</b></span>'}).join('');
        var nb=$('.v3c-hero');nb&&nb.classList.add('has-result');
      }finally{setTimeout(function(){busy=false},0)}
    }
    new MutationObserver(function(){setTimeout(apply,0)}).observe(res,{childList:true,attributes:true,attributeFilter:['class']});
    apply();
  });
  /* 15. subtitle: <br> -> " · " so it reads as one line like the demo */
  safe(function(){var p=$('.hero-copy p');if(!p)return;function fix(){var br=$('br',p);if(br){br.replaceWith(document.createTextNode(' '))}}fix();new MutationObserver(fix).observe(p,{childList:true})});
})();
