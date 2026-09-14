let agents=[];
const $=id=>document.getElementById(id);
async function api(url,options={}){const r=await fetch(url,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})}});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||`Ошибка ${r.status}`);return d}
function showLogin(){ $('loginScreen').classList.remove('hidden');$('appScreen').classList.add('hidden');$('password').focus() }
function showApp(){ $('loginScreen').classList.add('hidden');$('appScreen').classList.remove('hidden') }
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function selected(){return agents.find(a=>a.id===$('carrier').value)}
function fillCarriers(){ $('carrier').innerHTML='<option value="">Выберите экспедитора</option>'+agents.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}${a.contact?' — '+esc(a.contact):''}</option>`).join('') }
function updateCarrier(){
 const a=selected(); const sel=$('transport');
 if(!a){sel.innerHTML='<option value="">Сначала выберите экспедитора</option>';$('carrierInfo').classList.add('hidden');return}
 sel.innerHTML='<option value="">Выберите транспорт</option>'+(a.transport||[]).map(t=>`<option>${esc(t)}</option>`).join('');
 const info=[a.phone?'☎ '+a.phone:'',a.email?'✉ '+a.email:'',a.notes?'ℹ '+a.notes:''].filter(Boolean).join(' · ');
 $('carrierInfo').innerHTML=`<b>${esc(a.name)}</b>${a.contact?' · '+esc(a.contact):''}${info?' — '+esc(info):''}`;$('carrierInfo').classList.remove('hidden');
 renderAgents();
}
function renderAgents(){const q=$('search').value.trim().toLowerCase();const list=agents.filter(a=>[a.name,a.contact,a.phone,a.email,a.notes,...(a.transport||[])].join(' ').toLowerCase().includes(q));$('agents').innerHTML=list.map(a=>`<article class="agent ${a.id===$('carrier').value?'selected':''}" data-id="${esc(a.id)}"><div class="company">${esc(a.name)}</div><div class="contact">${esc(a.contact||'')}</div><div class="tags">${(a.transport||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="details">${a.phone?`<div>☎ ${esc(a.phone)}</div>`:''}${a.email?`<div>✉ ${esc(a.email)}</div>`:''}${a.notes?`<div>ℹ ${esc(a.notes)}</div>`:''}</div></article>`).join('')}
function calculate(){
 const w=Number($('actualWeight').value)||0, places=Math.max(1,Number($('places').value)||1), l=Number($('length').value)||0, wd=Number($('width').value)||0, h=Number($('height').value)||0, divisor=Number($('divisor').value)||6000;
 if(!w||!l||!wd||!h){alert('Заполните вес и все три габарита одного места.');return}
 const volume=l*wd*h/1e9*places; const volumetric=volume*1e6/divisor; const charge=Math.max(w,volumetric); const actual=w;
 $('actualResult').textContent=actual.toFixed(1)+' кг';$('volumetricResult').textContent=volumetric.toFixed(1)+' кг';$('volumeResult').textContent=volume.toFixed(3)+' м³';$('distanceResult').textContent=(Number($('distance').value)||0).toLocaleString('ru-RU')+' км';
 $('chargeableWeight').textContent=charge.toFixed(1)+' кг'; $('weightText').textContent=actual>=volumetric?'Фактический вес больше объёмного.':'Объёмный вес больше фактического.';
 const a=selected(); $('transportTags').innerHTML=(a?.transport||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="muted">—</span>';
 $('result').classList.remove('hidden');
}
async function loadWeather(){try{const r=await api('/api/weather');if(!r.ok)return;$('weatherLabel').textContent=`${r.city}: ${r.temp}°C · ${r.description}`;const bg=$('weatherBg');bg.className='weather-bg weather-'+r.type}catch{}}
async function boot(){try{const me=await api('/api/me');if(!me.authenticated)return showLogin();agents=await api('/api/agents');fillCarriers();renderAgents();showApp();loadWeather()}catch(e){showLogin();$('loginError').textContent=e.message}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';try{await api('/api/login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await boot()}catch(e){$('loginError').textContent=e.message}});
$('carrier').addEventListener('change',updateCarrier);$('calculateBtn').addEventListener('click',calculate);$('search').addEventListener('input',renderAgents);$('agents').addEventListener('click',e=>{const card=e.target.closest('.agent');if(card){$('carrier').value=card.dataset.id;updateCarrier();window.scrollTo({top:0,behavior:'smooth'})}});
$('logoutBtn').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST'})}catch{}agents=[];showLogin()});boot();
