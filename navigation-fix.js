/* IOMASTAVKA — robust delegated navigation for desktop and touch */
(function(){
 'use strict';
 function closeAll(except){
  document.querySelectorAll('.v3-nav [data-sg].is-open').forEach(function(item){
   if(item===except)return;
   item.classList.remove('is-open');
   var b=item.querySelector(':scope > .sg-btn');
   if(b)b.setAttribute('aria-expanded','false');
  });
 }
 function openToggle(button){
  var item=button.closest('[data-sg]');
  if(!item)return;
  var opening=!item.classList.contains('is-open');
  closeAll(item);
  item.classList.toggle('is-open',opening);
  button.setAttribute('aria-expanded',opening?'true':'false');
 }
 document.addEventListener('click',function(e){
  var button=e.target.closest&&e.target.closest('.v3-nav [data-sg] > .sg-btn');
  if(button){e.preventDefault();e.stopPropagation();openToggle(button);return;}
  var inside=e.target.closest&&e.target.closest('.v3-nav [data-sg] .sg-menu');
  if(!inside)closeAll();
  else if(e.target.closest('[data-open-view],[data-proxy]'))closeAll();
 },true);
 document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  closeAll();
  var b=document.querySelector('.v3-nav .sg-btn[aria-expanded="true"]');
  if(b)b.focus();
 });
 document.addEventListener('click',function(e){
  var proxy=e.target.closest&&e.target.closest('[data-proxy]');
  if(!proxy)return;
  var target=document.querySelector(proxy.getAttribute('data-proxy'));
  if(target){e.preventDefault();target.click();}
 },false);
})();
