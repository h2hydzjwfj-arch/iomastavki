/* IOMASTAVKA — dropdown menus rendered above the page, outside the horizontally scrolling nav */
(function(){
 'use strict';
 var opened=[];
 function place(button,menu){
  var r=button.getBoundingClientRect(),mobile=window.innerWidth<=900;
  var width=mobile?window.innerWidth-24:Math.min(350,window.innerWidth-24);
  var left=mobile?12:Math.max(12,Math.min(r.left,window.innerWidth-width-12));
  var top=Math.min(r.bottom+8,Math.max(12,window.innerHeight-120));
  Object.assign(menu.style,{position:'fixed',zIndex:'100000',left:left+'px',right:'auto',top:top+'px',width:width+'px',minWidth:mobile?'0':'260px',maxWidth:'calc(100vw - 24px)',maxHeight:'min(70dvh,560px)',overflowY:'auto',display:'grid',visibility:'visible',opacity:'1',pointerEvents:'auto'});
 }
 function close(item){
  var i=opened.findIndex(function(x){return x.item===item;});if(i<0)return;
  var x=opened.splice(i,1)[0];x.item.classList.remove('is-open');x.button.setAttribute('aria-expanded','false');
  x.menu.classList.remove('sg-menu-portal');x.menu.removeAttribute('style');
  if(x.marker.parentNode){x.marker.parentNode.insertBefore(x.menu,x.marker);x.marker.remove();}
 }
 function closeAll(except){opened.slice().forEach(function(x){if(x.item!==except)close(x.item);});}
 function toggle(button){
  var item=button.closest('.v3-nav [data-sg]');if(!item)return;
  if(item.classList.contains('is-open')){close(item);return;}
  closeAll();var menu=item.querySelector(':scope > .sg-menu');if(!menu)return;
  var marker=document.createComment('menu-position');menu.parentNode.insertBefore(marker,menu);
  document.body.appendChild(menu);menu.classList.add('sg-menu-portal');
  item.classList.add('is-open');button.setAttribute('aria-expanded','true');
  opened.push({item:item,button:button,menu:menu,marker:marker});place(button,menu);
 }
 document.addEventListener('click',function(e){
  var trigger=e.target.closest&&e.target.closest('.v3-nav [data-sg] > .sg-btn');
  if(trigger){e.preventDefault();e.stopPropagation();toggle(trigger);return;}
  var inMenu=e.target.closest&&e.target.closest('.sg-menu-portal');
  var inTrigger=e.target.closest&&e.target.closest('.v3-nav [data-sg]');
  if(!inMenu&&!inTrigger)closeAll();
  else if(inMenu&&e.target.closest('[data-open-view],[data-proxy]'))closeAll();
 },true);
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened.length){var b=opened[0].button;closeAll();if(b)b.focus();}});
 window.addEventListener('resize',function(){opened.forEach(function(x){place(x.button,x.menu);});});
 window.addEventListener('scroll',function(){opened.forEach(function(x){place(x.button,x.menu);});},true);
 document.addEventListener('click',function(e){
  var proxy=e.target.closest&&e.target.closest('[data-proxy]');if(!proxy)return;
  var target=document.querySelector(proxy.getAttribute('data-proxy'));if(target){e.preventDefault();target.click();}
 },false);
})();