let agents=[];
const $=id=>document.getElementById(id);
let cityTimers={from:null,to:null};
let selectedCoords={from:null,to:null};
let suggestionsState={from:[],to:[]};

async function api(url,options={}){const r=await fetch(url,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})}});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||`Ошибка ${r.status}`);return d}
function showLogin(){ $('loginScreen').classList.remove('hidden');$('appScreen').classList.add('hidden');$('password').focus() }
function showApp(){ $('loginScreen').classList.add('hidden');$('appScreen').classList.remove('hidden') }
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function selected(){return agents.find(a=>a.id===$('carrier').value)}

function carrierGroups(a){
 const t=(a.transport||[]).map(x=>x.toLowerCase());
 if(t.includes('прямое ж/д') && (t.includes('авто')||t.includes('море + ж/д'))) return 'Ж/Д + Авто / мультимодальные';
 if(t.includes('прямое ж/д') || t.includes('ж/д')) return 'Ж/Д';
 if(t.includes('море + ж/д')) return 'Море + Ж/Д';
 if(t.includes('море')) return 'Море';
 if(t.includes('авиа')) return 'Авиа';
 if(t.includes('авто')) return 'Авто';
 return 'Другие';
}
function setCarrier(id){
 const a=agents.find(x=>x.id===id); if(!a)return;
 $('selectedCarrierName').textContent=a.name+(a.contact?` · ${a.contact}`:'');
 const sel=$('transport');sel.innerHTML='<option value="">Выберите транспорт</option>'+(a.transport||[]).map(t=>`<option>${esc(t)}</option>`).join('');
 const info=[a.phone?'☎ '+a.phone:'',a.email?'✉ '+a.email:'',a.notes?'ℹ '+a.notes:''].filter(Boolean).join(' · ');
 $('carrierInfo').innerHTML=`<b>${esc(a.name)}</b>${a.contact?' · '+esc(a.contact):''}${info?' — '+esc(info):''}`;
 $('carrierInfo').classList.remove('hidden');
 $('carrierDock').classList.remove('open');
}
function renderCarrierGroups(){
 const q=$('search').value.trim().toLowerCase();
 const filtered=agents.filter(a=>[a.name,a.contact,a.phone,a.email,a.notes,...(a.transport||[])].join(' ').toLowerCase().includes(q));
 const groups={};filtered.forEach(a=>(groups[carrierGroups(a)]??=[]).push(a));
 const order=['Ж/Д + Авто / мультимодальные','Ж/Д','Море + Ж/Д','Море','Авиа','Авто','Другие'];
 $('carrierGroups').innerHTML=order.filter(g=>groups[g]?.length).map(g=>`<div class="carrier-group"><div class="group-title"><span>${esc(g)}</span><em>${groups[g].length}</em></div>${groups[g].map(a=>`<button class="carrier-item ${a.id===$('carrier')?.value?'selected':''}" data-id="${esc(a.id)}"><span class="carrier-name">${esc(a.name)}</span><span class="carrier-contact">${esc(a.contact||'')}</span></button>`).join('')}</div>`).join('')||'<div class="empty">Ничего не найдено</div>';
}
function renderAgents(){renderCarrierGroups()}

async function citySearch(kind,value){
 const q=value.trim(); const box=$(kind+'Suggestions'); if(q.length<2){box.classList.remove('show');return}
 try{const data=await api('/api/cities?q='+encodeURIComponent(q)+'&country='+(kind==='from'?'CN':'RU')); suggestionsState[kind]=data.results||[];box.innerHTML=suggestionsState[kind].slice(0,7).map((c,i)=>`<button type="button" class="suggestion" data-kind="${kind}" data-index="${i}"><span>${esc(c.name)}</span><small>${esc(c.admin||'')} · ${esc(c.country||'')}</small></button>`).join('');box.classList.toggle('show',suggestionsState[kind].length>0)}catch{box.classList.remove('show')}
}
function bindAutocomplete(kind){
 const input=$(kind); input.addEventListener('input',()=>{selectedCoords[kind]=null;clearTimeout(cityTimers[kind]);cityTimers[kind]=setTimeout(()=>citySearch(kind,input.value),260)});
 input.addEventListener('focus',()=>{if(input.value.length>=2)citySearch(kind,input.value)});
 $(kind+'Suggestions').addEventListener('click',e=>{const b=e.target.closest('.suggestion');if(!b)return;const c=suggestionsState[kind][Number(b.dataset.index)];input.value=c.label;selectedCoords[kind]={lat:c.lat,lon:c.lon};$(kind+'Suggestions').classList.remove('show');autoDistance()});
}
async function autoDistance(){
 if(!selectedCoords.from||!selectedCoords.to)return;
 try{const r=await api(`/api/route-distance?fromLat=${selectedCoords.from.lat}&fromLon=${selectedCoords.from.lon}&toLat=${selectedCoords.to.lat}&toLon=${selectedCoords.to.lon}`);if(r.ok)$('distance').value=r.distanceKm}catch{}
}
function calculate(){
 const w=Number($('actualWeight').value)||0,places=Math.max(1,Number($('places').value)||1),l=Number($('length').value)||0,wd=Number($('width').value)||0,h=Number($('height').value)||0,divisor=Number($('divisor').value)||6000;
 if(!w||!l||!wd||!h){alert('Заполните вес и все три габарита одного места.');return}
 const volume=l*wd*h/1e9*places; const volumetric=volume*1e6/divisor; const charge=Math.max(w,volumetric);
 $('actualResult').textContent=w.toFixed(1)+' кг';$('volumetricResult').textContent=volumetric.toFixed(1)+' кг';$('volumeResult').textContent=volume.toFixed(3)+' м³';$('distanceResult').textContent=(Number($('distance').value)||0).toLocaleString('ru-RU')+' км';$('chargeableWeight').textContent=charge.toFixed(1)+' кг';$('weightText').textContent=w>=volumetric?'Фактический вес больше объёмного':'Объёмный вес больше фактического';
 const a=selected();$('transportTags').innerHTML=(a?.transport||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="muted">Экспедитор не выбран</span>';$('result').classList.remove('hidden');
}
async function loadWeather(){try{const r=await api('/api/weather');if(!r.ok)return;$('weatherLabel').textContent=`${r.city}: ${r.temp}° · ${r.description}`;const bg=$('weatherBg');bg.className='weather-bg weather-'+r.type}catch{}}
async function boot(){try{const me=await api('/api/me');if(!me.authenticated)return showLogin();agents=await api('/api/agents');renderAgents();showApp();loadWeather()}catch(e){showLogin();$('loginError').textContent=e.message}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';try{await api('/api/login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await boot()}catch(e){$('loginError').textContent=e.message}});
$('calculateBtn').addEventListener('click',calculate);$('openCarrierSelect').addEventListener('click',()=>{$('carrierDock').classList.add('open');renderCarrierGroups()});$('carrierDockButton').addEventListener('click',()=>{$('carrierDock').classList.toggle('open')});$('search').addEventListener('input',renderCarrierGroups);$('carrierPanel').addEventListener('click',e=>{const b=e.target.closest('.carrier-item');if(b)setCarrier(b.dataset.id)});$('logoutBtn').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST'})}catch{}agents=[];showLogin()});bindAutocomplete('from');bindAutocomplete('to');boot();
