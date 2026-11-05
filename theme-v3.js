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
    var open=$('.view-layer.open'),map={calculatorView:'calculator',assistantView:'assistant',newsView:'news',forwardersView:'forwarders',customsView:'customsView'};
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
  var MODES={auto:{d:'M40 120C160 140 330 30 480 80',t:6},rail:{d:'M40 110Q260 -10 480 70',t:7},sea:{d:'M40 100C120 150 380 150 480 70',t:10},air:{d:'M40 110Q260 -90 480 70',t:3}};
  function setMode(m){var o=MODES[m];if(!o)return;$$('.v3-chips .chip').forEach(function(c){c.classList.toggle('on',c.dataset.m===m)});var r=$('#v3route');r&&r.setAttribute('d',o.d);$$('.v3am').forEach(function(a){a.setAttribute('path',o.d);a.setAttribute('dur',o.t+'s');a.beginElement&&a.beginElement()})}
  safe(function(){$$('.v3-chips .chip').forEach(function(c){c.addEventListener('click',function(){setMode(c.dataset.m)})})});

  /* route text from the calculator fields if filled */
  safe(function(){
    function upd(){var f=($('#fromCity')||{}).value,t=($('#toCity')||{}).value;if(f&&t){$('#v3route-text').textContent=f+' → '+t;$('#v3from').textContent=f.slice(0,12);$('#v3to').textContent=t.slice(0,12)}}
    ['fromCity','toCity'].forEach(function(i){var e=document.getElementById(i);e&&e.addEventListener('change',upd)});
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
      setTimeout(function(){ld.classList.remove('on');ld.setAttribute('aria-hidden','true');var r=go.getBoundingClientRect();confetti(r.left+r.width/2,r.top);window.__iomaOpenView&&window.__iomaOpenView('calculator');syncNav()},reduce?300:2600);
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
})();
