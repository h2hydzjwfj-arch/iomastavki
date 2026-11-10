/* IOMASTAVKA — stable desktop dropdown + explicit mobile navigation sheet */
(function(){
 'use strict';
 var opened=[];
 function important(el,props){Object.keys(props).forEach(function(k){el.style.setProperty(k,props[k],'important');});}
 function mobile(){return window.matchMedia('(max-width: 900px)').matches;}
 function makePanel(button,menu){
  var overlay=document.createElement('div');
  overlay.className='ioma-mobile-menu-overlay';
  important(overlay,{position:'fixed',inset:'0',zIndex:'2147483647',display:'flex',alignItems:'flex-start',justifyContent:'center',boxSizing:'border-box',paddingTop:'calc(env(safe-area-inset-top, 0px) + var(--hdr, 112px) + 8px)',paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 12px)',paddingLeft:'12px',paddingRight:'12px',backgroundColor:'rgba(7, 18, 32, .48)',visibility:'visible',opacity:'1',pointerEvents:'auto'});
  var panel=document.createElement('div');
  panel.className='ioma-mobile-menu-panel';
  important(panel,{position:'relative',display:'grid',gridAutoRows:'min-content',gap:'5px',width:'100%',maxWidth:'560px',maxHeight:'calc(100dvh - var(--hdr, 112px) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)',overflowY:'auto',overscrollBehavior:'contain',WebkitOverflowScrolling:'touch',boxSizing:'border-box',padding:'10px',border:'1px solid rgba(25, 48, 68, .16)',borderRadius:'18px',backgroundColor:document.body.classList.contains('night')?'#17283a':'#ffffff',color:document.body.classList.contains('night')?'#f3f7fb':'#172b3d',boxShadow:'0 22px 64px rgba(0,0,0,.32)',visibility:'visible',opacity:'1',pointerEvents:'auto',transform:'none'});
  menu.querySelectorAll(':scope > button').forEach(function(b){
   important(b,{display:'grid',width:'100%',minHeight:'50px',padding:'12px 14px',textAlign:'left',whiteSpace:'normal',border:'0',borderRadius:'11px',backgroundColor:'transparent',color:'inherit',font:'inherit',fontSize:'15px',lineHeight:'1.35',pointerEvents:'auto'});
  });
  important(menu,{position:'static',inset:'auto',display:'grid',gridAutoRows:'min-content',gap:'5px',width:'100%',minWidth:'0',maxWidth:'none',maxHeight:'none',overflow:'visible',padding:'0',margin:'0',border:'0',borderRadius:'0',backgroundColor:'transparent',color:'inherit',boxShadow:'none',transform:'none',visibility:'visible',opacity:'1',pointerEvents:'auto'});\n  panel.appendChild(menu);overlay.appendChild(panel);document.documentElement.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay){var x=opened.find(function(v){return v.menu===menu;});if(x)close(x.item);}});
  return overlay;
 }
 function place(button,menu){
  var r=button.getBoundingClientRect(),vv=window.visualViewport;
  var vw=vv?vv.width:window.innerWidth,vh=vv?vv.height:window.innerHeight;
  var ox=vv?vv.offsetLeft:0,oy=vv?vv.offsetTop:0;
  var width=Math.min(350,vw-24),left=ox+Math.max(8,Math.min(r.left,vw-width-8));
  var desired=r.bottom+oy+8,maxH=Math.min(vh*.70,560);
  var top=desired+Math.min(maxH,menu.scrollHeight)>oy+vh-8?Math.max(oy+8,r.top+oy-Math.min(maxH,menu.scrollHeight)-8):desired;
  important(menu,{position:'fixed',zIndex:'2147483647',left:left+'px',right:'auto',top:top+'px',bottom:'auto',width:width+'px',minWidth:'260px',maxWidth:'calc(100vw - 16px)',maxHeight:'min(70dvh,560px)',overflowY:'auto',display:'grid',visibility:'visible',opacity:'1',pointerEvents:'auto',transform:'none',margin:'0'});
 }
 function close(item){
  var i=opened.findIndex(function(x){return x.item===item;});if(i<0)return;
  var x=opened.splice(i,1)[0];x.item.classList.remove('is-open');x.button.setAttribute('aria-expanded','false');
  x.menu.classList.remove('sg-menu-portal');x.menu.removeAttribute('style');
  if(x.overlay&&x.overlay.parentNode)x.overlay.remove();
  if(x.marker.parentNode){x.marker.parentNode.insertBefore(x.menu,x.marker);x.marker.remove();}
 }
 function closeAll(except){opened.slice().forEach(function(x){if(x.item!==except)close(x.item);});}
 function toggle(button){
  var item=button.closest('.v3-nav [data-sg]');if(!item)return;
  if(item.classList.contains('is-open')){close(item);return;}
  closeAll();var menu=item.querySelector(':scope > .sg-menu');if(!menu)return;
  var marker=document.createComment('menu-position');menu.parentNode.insertBefore(marker,menu);
  item.classList.add('is-open');button.setAttribute('aria-expanded','true');
  var record={item:item,button:button,menu:menu,marker:marker,overlay:null};
  if(mobile()){record.overlay=makePanel(button,menu);menu.classList.add('sg-menu-portal');}
  else{document.documentElement.appendChild(menu);menu.classList.add('sg-menu-portal');place(button,menu);}
  opened.push(record);
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
 function reposition(){opened.forEach(function(x){if(!x.overlay)place(x.button,x.menu);});}
 window.addEventListener('resize',reposition);
 window.addEventListener('scroll',reposition,true);
 if(window.visualViewport){window.visualViewport.addEventListener('resize',reposition);window.visualViewport.addEventListener('scroll',reposition);}
 document.addEventListener('click',function(e){
  var proxy=e.target.closest&&e.target.closest('[data-proxy]');if(!proxy)return;
  var target=document.querySelector(proxy.getAttribute('data-proxy'));if(target){e.preventDefault();target.click();}
 },false);
})();
