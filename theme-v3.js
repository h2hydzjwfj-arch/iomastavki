/* IOMASTAVKA v3 — tiny progressive enhancements (no dependencies). Safe if it fails. */
(function(){
  try{
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine=window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches;
    // 1) soft tilt on home cards (desktop only, transform only)
    if(fine&&!reduce){
      document.querySelectorAll('.service-card').forEach(function(c){
        c.addEventListener('pointermove',function(e){
          var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
          c.style.transform='translateY(-5px) perspective(700px) rotateX('+(-y*4)+'deg) rotateY('+(x*5)+'deg)';
        });
        c.addEventListener('pointerleave',function(){c.style.transform='';});
      });
    }
    // 2) count-up for currency numbers on home when they change/appear
    function count(el){
      var to=parseFloat(String(el.textContent).replace(',','.'));
      if(!isFinite(to)||reduce||el.dataset.v3===String(to))return;
      el.dataset.v3=String(to);
      var dec=(String(el.textContent).split(/[.,]/)[1]||'').length,t0=performance.now(),d=900;
      (function f(t){var k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=(to*e).toFixed(dec);if(k<1)requestAnimationFrame(f);else el.textContent=to.toFixed(dec);})(t0);
    }
    var ids=['homeCny','homeUsd','homeEur'];
    var mo=new MutationObserver(function(){mo.disconnect();ids.forEach(function(i){var n=document.getElementById(i);if(n)count(n);});attach();});
    function attach(){ids.forEach(function(i){var n=document.getElementById(i);if(n)mo.observe(n,{childList:true,characterData:true,subtree:true});});}
    attach();ids.forEach(function(i){var n=document.getElementById(i);if(n)count(n);});
    // 3) a11y: keep aria-hidden in sync is done by app.js; just make sure icon-only buttons have names
    document.querySelectorAll('button:not([aria-label])').forEach(function(b){
      if(!b.textContent.trim())b.setAttribute('aria-label',b.title||'Кнопка');
    });
    // 4) data freshness label "обновлено N мин назад" under currency strip
    var home=document.querySelector('.home-status');
    if(home){
      var s=document.createElement('div');s.id='freshness';s.setAttribute('aria-live','off');
      s.style.cssText='font-size:11px;opacity:.8';home.appendChild(s);
      var t0=Date.now();
      (function tick(){var m=Math.floor((Date.now()-t0)/60000);s.textContent='Данные обновлены '+(m<1?'только что':m+' мин назад');setTimeout(tick,30000);})();
    }
  }catch(e){}
})();
