const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const state={theme:localStorage.getItem('theme')||'light',chat:[],weather:null,cbr:null};
const modal=$('#modal'), body=$('#modalBody');

function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),3200)}
function esc(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function openModal(html){body.innerHTML=html;modal.classList.remove('hidden')}
function closeModal(){modal.classList.add('hidden');body.innerHTML=''}
$('#modalClose').onclick=closeModal; modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))closeModal()});

document.body.classList.toggle('dark',state.theme==='dark');

/* ---------- ночь: по данным погоды, fallback — по локальному времени ---------- */
function localNight(){const h=new Date().getHours();return h>=20||h<7}
function applyNight(night){document.documentElement.classList.toggle('night',night);$('#sky').classList.toggle('night',night);$('#themeBtn').textContent=night?'🌙':'☀️'}
applyNight(localNight());

async function loadCBR(){
  try{const r=await fetch('/api/cbr',{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error);
    state.cbr=j.data;
    $('#cbrTicker').innerHTML=`<span>CNY</span><strong>${state.cbr.cny.toFixed(3)}</strong><span>USD</span><strong>${state.cbr.usd.toFixed(3)}</strong><span>EUR</span><strong>${state.cbr.eur.toFixed(3)}</strong><em>${esc(state.cbr.source||'ЦБ РФ')} · ${esc(state.cbr.date||'')}${j.stale?' · кэш':''}</em>`;
  }catch(e){$('#cbrTicker').innerHTML='<span>ЦБ РФ</span><strong>временно недоступен</strong>';console.warn(e)}
}
async function loadWeather(){
  try{const r=await fetch('/api/weather',{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error);state.weather=j.data;
    const night=(state.weather.isNight!=null)?state.weather.isNight:localNight();
    applyNight(night);
    const c=(state.weather.condition||'').toLowerCase();
    $('#sky').classList.toggle('rainy',/rain|drizzle|thunder/.test(c));
    $('#sky').classList.toggle('snowy',/snow/.test(c));
  }catch(e){console.warn(e)}
}
loadCBR();loadWeather();
setInterval(loadCBR,15*60*1000);setInterval(loadWeather,5*60*1000);

function modalHead(k,t,p){return `<div class="modal-head"><div class="eyebrow">${k}</div><h2>${t}</h2><p>${p}</p></div>`}

/* ---------- экспедиторы ---------- */
async function openAgents(){
 openModal(modalHead('СПРАВОЧНИК','Экспедиторы','Загрузка контактов…')+`<div class="panel"><input id="agentSearch" style="width:100%;padding:13px;border:1px solid #d6e8ef;border-radius:14px" placeholder="Поиск компании, контакта, телефона, e-mail…"><div id="agentGrid" class="agent-grid" style="margin-top:12px"></div></div>`);
 try{const j=await (await fetch('/api/agents')).json();if(!j.ok)throw Error(j.error);
   const rec=j.records||[];
   $('.modal-head p').textContent=`${rec.length} контактов · фильтр по направлению и виду перевозки`;
   renderAgents(rec);
   $('#agentSearch').oninput=e=>renderAgents(rec.filter(a=>(a.company+' '+a.contact+' '+a.email+' '+a.phone+' '+(a.transport||[]).join(' ')+' '+(a.notes||'')).toLowerCase().includes(e.target.value.toLowerCase())));
 }catch(e){toast('Не удалось загрузить экспедиторов: '+e.message)}
}
function renderAgents(list){const g=$('#agentGrid');if(!g)return;g.innerHTML=list.map(a=>`<article class="agent"><strong>${esc(a.company)}</strong><div class="muted">${esc(a.contact||'Контакт не указан')}</div><div style="margin-top:9px">${a.phone?`☎ ${esc(a.phone)}<br>`:''}${a.email?`✉ <a href="mailto:${esc(a.email)}">${esc(a.email)}</a><br>`:''}${a.site?`↗ <a href="${/^https?:/.test(a.site)?esc(a.site):'https://'+esc(a.site)}" target="_blank" rel="noreferrer">${esc(a.site)}</a>`:''}</div><div class="muted" style="margin-top:8px">${esc((a.transport||[]).join(' · '))}</div><div class="muted">${esc(a.notes||'')}</div></article>`).join('')||'<div class="status">Ничего не найдено.</div>'}

/* ---------- новости с картинками ---------- */
function openNews(){
 openModal(modalHead('ИНФОРМАЦИОННАЯ ЛЕНТА','Новости ВЭД','Свежие события по таможне, ВЭД, перевозкам и Азии · обновляется ежедневно')+'<div id="newsList" class="news-list"><div class="status">Загружаю свежую ленту…</div></div>');
 fetch('/api/news',{cache:'no-store'}).then(r=>r.json()).then(j=>{
   if(!j.ok)throw Error(j.error);
   const list=j.data.items||[];
   $('#newsList').innerHTML=list.map(n=>`<article class="news-item ${n.important?'important':''}">${n.image?`<img class="news-thumb" loading="lazy" src="${esc(n.image)}" alt="" onerror="this.style.display='none'">`:''}<div><a href="${esc(n.url)}" target="_blank" rel="noreferrer">${n.important?'🔴 ':''}${esc(n.title)}</a><div class="news-meta">${esc(n.source)} · ${new Date(n.publishedAt).toLocaleString('ru-RU')}</div></div></article>`).join('')||'<div class="status">Свежих материалов сейчас не получено. Лента обновляется автоматически — загляните позже.</div>';
 }).catch(e=>{$('#newsList').innerHTML='<div class="status">Не удалось получить ленту. Попробуйте обновить окно через минуту.</div>';console.warn(e)})
}

/* ---------- AI-ассистент: вы говорите голосом — он отвечает текстом ---------- */
function openAssistant(){
 openModal(modalHead('ИНТЕЛЛЕКТ','AI-ассистент','Логистика, расчёты и ВЭД — текстом или голосом')+`<div class="assistant"><div id="chat" class="chat"></div><div class="composer"><button id="mic" title="Диктовка: скажите вопрос — текст отправится автоматически">🎙</button><textarea id="msg" placeholder="Напишите вопрос…"></textarea><button class="send" id="send">Отправить</button></div></div>`);
 renderChat(); const msg=$('#msg');
 $('#send').onclick=sendAI;
 msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()}});
 $('#mic').onclick=voiceInput;
}
function renderChat(){const c=$('#chat');if(!c)return;c.innerHTML=state.chat.length?state.chat.map(m=>`<div class="bubble ${m.role==='user'?'user':'ai'}">${esc(m.content)}</div>`).join(''):'<div class="status" style="text-align:center;margin-top:30px">Готов к разговору. Задайте вопрос по логистике или ВЭД — текстом или голосом (🎙).</div>';c.scrollTop=c.scrollHeight}
async function sendAI(){
 const el=$('#msg');if(!el)return;const text=el.value.trim();if(!text)return;
 state.chat.push({role:'user',content:text});el.value='';renderChat();
 const send=$('#send');send.disabled=true;send.textContent='…';
 try{
   const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,history:state.chat.slice(-9,-1)})});
   const j=await r.json();if(!j.ok)throw Error(j.error);
   state.chat.push({role:'assistant',content:j.answer});renderChat();
 }catch(e){state.chat.push({role:'assistant',content:'Не удалось получить ответ: '+e.message});renderChat()}
 finally{send.disabled=false;send.textContent='Отправить'}
}
function voiceInput(){
 if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){toast('Диктовка не поддерживается этим браузером (нужен Chrome/Edge)');return}
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new R();
 r.lang='ru-RU';r.interimResults=false;
 r.onstart=()=>{$('#mic').textContent='👂';toast('Слушаю… говорите вопрос')};
 r.onerror=e=>{$('#mic').textContent='🎙';toast(e.error==='not-allowed'?'Разрешите доступ к микрофону':'Не удалось распознать речь')};
 r.onend=()=>{const m=$('#mic');if(m)m.textContent='🎙'};
 r.onresult=e=>{const t=e.results[0][0].transcript;const msg=$('#msg');if(!msg)return;msg.value=t;msg.focus();setTimeout(sendAI,150)}; /* автоматическая отправка */
 r.start();
}

/* ---------- ТН ВЭД ---------- */
function openCustoms(){
 openModal(modalHead('ТАМОЖЕННЫЙ ПРОВЕРЯЮЩИЙ','ТН ВЭД ЕАЭС','Введите 10-значный код — результат за 3 секунды: пошлина, НДС, сбор, Честный Знак, разрешительные документы')+`<div class="customs-form"><input id="tnved" inputmode="numeric" maxlength="10" placeholder="Например, 8438101000"><button class="primary" id="checkTN">Проверить</button></div><div id="customsResult" class="customs-result"></div>`);
 $('#checkTN').onclick=checkTN;
 $('#tnved').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);if(e.target.value.length===10)checkTN()});
 $('#tnved').focus();
}
async function checkTN(){
 const code=$('#tnved').value;if(!/^\d{10}$/.test(code)){toast('Нужно 10 цифр ТН ВЭД');return}
 const out=$('#customsResult');out.innerHTML='<div class="status">Проверяю официальные источники…</div>';
 try{
   const r=await fetch('/api/customs/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
   const j=await r.json();if(!j.ok)throw Error(j.error);
   const d=j.data;
   out.innerHTML=`<div class="panel">
     <p class="shortdesc"><b>${esc(d.shortDescription||'Товар по коду')}</b></p>
     <div class="customs-summary">
       <div class="metric primary-metric"><small>Импортная пошлина</small><strong>${esc(d.importDuty||'—')}</strong></div>
       <div class="metric"><small>НДС</small><strong>${esc(d.vat||'—')}</strong></div>
       <div class="metric"><small>Таможенный сбор</small><strong>${esc(d.customsFee||'—')}</strong></div>
       <div class="metric"><small>Акциз</small><strong>${esc(d.excise||'—')}</strong></div>
     </div>
     <div class="rate-grid" style="margin-top:10px">
       <div class="rate-row"><strong>Честный ЗНАК</strong><span>${esc(d.honestSign||'—')}</span></div>
       <div class="rate-row"><strong>Разрешительные документы</strong><span>${esc(d.permitDocs||'—')}</span></div>
       <div class="rate-row"><strong>Ограничения</strong><span>${esc(d.restrictions||'—')}</span></div>
       <div class="rate-row"><strong>Уверенность</strong><span>${esc(d.confidence||'—')}</span></div>
       <div class="rate-row" style="grid-column:1/-1"><strong>Что сделать</strong><span style="white-space:pre-line">${esc(d.actions||'—')}</span></div>
       <div class="rate-row"><strong>Код</strong><span>${esc(d.code)}</span></div>
     </div>
     ${d.warning?`<div class="status">⚠️ ${esc(d.warning)}</div>`:''}
     <div class="status" style="margin-top:12px">Источники: ${(d.sourceUrls||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noreferrer">${esc(u)}</a>`).join(' · ')}</div>
   </div>`;
 }catch(e){out.innerHTML='<div class="status">Ошибка проверки: '+esc(e.message)+'</div>'}
}

/* ---------- ставки: привычная таблица + обновление через AI ---------- */
function openRates(){
 openModal(modalHead('РАСЧЁТ','Ставки перевозки','Сохранённые ориентиры · обновляются через левую кнопку ↻')+'<div id="ratesPanel" class="panel">Загрузка…</div>');
 fetch('/api/rates').then(r=>r.json()).then(j=>{
   const rec=j.records||[];
   $('#ratesPanel').innerHTML=`<div class="rate-grid">${rec.map(x=>`<div class="rate-row"><strong>${esc(x.from)} → ${esc(x.to)} · ${esc(x.mode)}</strong><span>${x.rate} ${esc(x.currency)} · ${esc(x.container||'')} · ${esc(x.transitDays||'')} дней · ${esc(x.company||'')}</span></div>`).join('')||'<div class="status">Ставок пока нет — загрузите КП экспедиторов кнопкой ↻ слева.</div>'}</div><p class="status">Обновлено: ${new Date(j.updatedAt).toLocaleString('ru-RU')} · записей: ${rec.length}. Всегда уточняйте терминальные расходы в пункте прибытия.</p>`;
 }).catch(e=>{$('#ratesPanel').innerHTML='<div class="status">Не удалось загрузить ставки.</div>'});
}
function openRatesUpdate(){
 openModal(modalHead('ОБНОВЛЕНИЕ','Ставки от экспедиторов','Вставьте текст КП или загрузите файл (.txt / .csv / .json) — AI извлечёт маршруты и цены и обновит справочник')+`
   <div class="panel rates-update">
     <input type="file" id="ratesFile" accept=".txt,.csv,.json,.md" style="margin-bottom:12px">
     <textarea id="ratesText" placeholder="Например: Shanghai → Москва, ж/д 40HC FOB, 9600 USD, 30-35 дней…"></textarea>
     <div style="display:flex;gap:10px;margin-top:12px;align-items:center">
       <button class="primary" id="ratesParse">Обновить через AI</button>
       <span id="ratesOut" class="status" style="margin:0"></span>
     </div>
   </div>`);
 $('#ratesFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{$('#ratesText').value=rd.result;toast('Файл загружен: '+f.name)};rd.readAsText(f)};
 $('#ratesParse').onclick=async()=>{
   const text=$('#ratesText').value.trim();
   if(text.length<20){toast('Пришлите текст подлиннее — маршруты и цены');return}
   const btn=$('#ratesParse'),o=$('#ratesOut');btn.disabled=true;btn.textContent='AI парсит…';
   try{
     const r=await fetch('/api/rates/update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});
     const j=await r.json();if(!j.ok)throw Error(j.error);
     o.textContent=`Готово: +${j.added} новых, ${j.updated} обновлено. Всего записей: ${j.total}.`;
     toast('Ставки обновлены');
   }catch(e){o.textContent='Ошибка: '+e.message;toast('Не удалось обновить ставки')}
   finally{btn.disabled=false;btn.textContent='Обновить через AI'}
 };
}
function openTarot(){
 const cards=[
  ['✋','Спокойный ход','Сегодня лучше не ускорять процесс искусственно: сначала проверить детали, затем действовать.'],
  ['🚂','Прямой путь','Самое быстрое решение — не обязательно прямое. Проверьте ставку ж/д перед бронированием авто.'],
  ['📦','Сборный груз','Небольшой груз — не проблема, а возможность сэкономить. Спросите у экспедитора про LCL.'],
  ['🌉','Мосты, а не стены','Один звонок экспедитору сегодня сэкономит три дня ожидания завтра.'],
  ['🧭','Проверка курса','Курс CNY меняется ежедневно — пересчитайте ставку перед оплатой счёта.'],
 ];
 const c=cards[Math.floor(Math.random()*cards.length)];
 openModal(modalHead('КАРТА ДНЯ','Карта Фатимы','Лёгкий персональный символ дня')+`<div class="tarot"><div class="tarot-card"><div class="hand">${c[0]}</div><h3>${c[1]}</h3><p>${c[2]}</p></div></div>`);
}

/* ---------- роутинг: карточки и единый лаунчер ---------- */
$$('[data-open]').forEach(b=>b.onclick=()=>({rates:openRates,assistant:openAssistant,agents:openAgents,news:openNews}[b.dataset.open])());
$$('[data-tool]').forEach(b=>b.onclick=e=>{
 e.stopPropagation();const t=b.dataset.tool;
 if(t==='ratesUpdate')openRatesUpdate();
 if(t==='theme'){state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('theme',state.theme);document.body.classList.toggle('dark',state.theme==='dark')}
 if(t==='tarot')openTarot();
 if(t==='customs')openCustoms();
});
