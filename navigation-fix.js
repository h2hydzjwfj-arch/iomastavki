/* IOMASTAVKA — robust dropdown portal at document root to escape every page stacking context */
(function(){
 'use strict';
 var opened=[];
 function important(el,props){Object.keys(props).forEach(function(k){el.style.setProperty(k,props[k],'important');});}
 function place(button,menu){
  var r=button.getBoundingClientRect(),vv=window.visualViewport;
  var vw=vv?vv.width:window.innerWidth,vh=vv?vv.height:window.innerHeight;
  var ox=vv?vv.offsetLeft:0,oy=vv?vv.offsetTop:0,mobile=vw<=900;
  var width=mobile?Math.max(260,vw-24):Math.min(350,vw-24);
  width=Math.min(width,vw-16);
  var left=mobile?ox+8:ox+Math.max(8,Math.min(r.left,vw-width-8));
  var desired=r.bottom+oy+8;
  var maxH=Math.min(vh*.70,560);
  var top=desired+Math.min(maxH,menu.scrollHeight)>oy+vh-8
    ?Math.max(oy+8,r.top+oy-Math.min(maxH,menu.scrollHeight)-8):desired;
  important(menu,{position:'fixed',zIndex:'2147483647',left:left+'px',right:'auto',top:top+'px',bottom:'auto',width:width+'px',minWidth:mobile?'0':'260px',maxWidth:'calc(100vw - 16px)',maxHeight:'min(70dvh,560px)',overflowY:'auto',display:'grid',visibility:'visible',opacity:'1',pointerEvents:'auto',transform:'none',margin:'0'});
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
  document.documentElement.appendChild(menu);menu.classList.add('sg-menu-portal');
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
 function reposition(){opened.forEach(function(x){place(x.button,x.menu);});}
 window.addEventListener('resize',reposition);
 window.addEventListener('scroll',reposition,true);
 if(window.visualViewport){window.visualViewport.addEventListener('resize',reposition);window.visualViewport.addEventListener('scroll',reposition);}
 document.addEventListener('click',function(e){
  var proxy=e.target.closest&&e.target.closest('[data-proxy]');if(!proxy)return;
  var target=document.querySelector(proxy.getAttribute('data-proxy'));if(target){e.preventDefault();target.click();}
 },false);
})();