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
    var open=$('.view-layer.open'),map={calculatorView:'calculator',assistantView:'assistant',newsView:'news',forwardersView:'forwarders',customsView:'customsView',loginView:'loginView',leadView:'leadView',cabinetView:'cabinetView',workView:'workView'};
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
    $$('svg').forEach(function(svg){var p=$('.v3routepath',svg);if(!p)return;var key=(svg.getAttribute('viewBox')||'').split(' ')[3]==='190'?'c':'h';var d=MODES[key][m];if(!d)return;p.setAttribute('d',d);$$('.v3am',svg).forEach(function(a){a.setAttribute('path',d);a.setAttribute('dur',DUR[m]+'s');try{a.beginElement&&a.beginElement()}catch(e){}})});
  }
  function pickTransport(m){ // select the same transport in the real calculator menu
    var menu=document.getElementById('transportMenu');if(!menu)return;
    var item=$$('.hover-item',menu).find(function(b){return NAMES[m].indexOf(b.textContent.trim())>=0});
    if(item)item.click();
  }
  function setMode(m,fromUser){curMode=m;$$('.v3-chips .chip,.v3c-chips .chip').forEach(function(c){c.classList.toggle('on',c.dataset.m===m)});drawMode(m);if(fromUser)pickTransport(m)}
  window.__v3setMode=setMode;
  safe(function(){$$('.v3-chips .chip,.v3c-chips .chip').forEach(function(c){c.addEventListener('click',function(e){e.stopPropagation();setMode(c.dataset.m,true)})})});
  safe(function(){drawMode(curMode)});

  /* route + cargo labels follow the calculator fields */
  safe(function(){
    function val(id){var e=document.getElementById(id);return e?String(e.value||'').trim():''}
    function upd(){
      var f=val('fromCity'),t=val('toCity');
      if(f||t){var rt=(f||'—')+' → '+(t||'—');$('#v3route-text')&&($('#v3route-text').textContent=rt);}
      [['#v3from','#v3mfrom',f],['#v3to','#v3mto',t]].forEach(function(x){if(x[2]){$(x[0])&&($(x[0]).textContent=x[2].slice(0,14));$(x[1])&&($(x[1]).textContent=x[2].slice(0,14))}});
      var w=val('weight'),v=(($('#autoVolume')||{}).textContent||'').trim(),c=$('#v3cargo');
      if(c)c.textContent=w&&Number(w)>0?(Number(w).toLocaleString('ru-RU')+' кг'+(v&&!/^0\s/.test(v)?' · '+v.replace('m³','м³'):'')):'укажите в расчёте';
    }
    ['fromCity','toCity','weight','pieces','length','width','height'].forEach(function(i){var e=document.getElementById(i);if(e){e.addEventListener('change',upd);e.addEventListener('input',upd)}});
    document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.suggestions'))setTimeout(upd,50)});
    upd();
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
  safe(function(){var d=$('#v3date');if(d)d.textContent=new Date().toLocaleDateString('ru-RU')});
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
      var it=items.find(function(x){return x.urgent})||items[0];var t=it&&(it.title||it.headline);
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
    function apply(){$$('.news-item',list).forEach(function(n){var ok=cur==='all'||(cur==='urgent'?n.classList.contains('news-urgent'):KW[cur].test(n.textContent));n.classList.toggle('v3off',!ok)})}
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
