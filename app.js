const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const state={lang:'ru',theme:localStorage.getItem('theme')||'light',chat:[],weather:null,cbr:null};
const modal=$('#modal'), body=$('#modalBody');

function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),2600)}
function esc(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function openModal(html){body.innerHTML=html;modal.classList.remove('hidden')}
function closeModal(){modal.classList.add('hidden');body.innerHTML=''}
$('#modalClose').onclick=closeModal; modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});

document.body.classList.toggle('dark',state.theme==='dark');

async function loadCBR(){
  try{const r=await fetch('/api/cbr',{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error);state.cbr=j.data;$('#cbrTicker').innerHTML=`<span>CNY</span><strong>${state.cbr.cny.toFixed(3)}</strong><span>USD</span><strong>${state.cbr.usd.toFixed(3)}</strong><span>EUR</span><strong>${state.cbr.eur.toFixed(3)}</strong><em>ЦБ РФ · ${esc(state.cbr.date||'')}</em>`}
  catch(e){$('#cbrTicker').innerHTML='<span>ЦБ РФ</span><strong>временно недоступен</strong>';console.warn(e)}
}
async function loadWeather(){
  try{const r=await fetch('/api/weather',{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error);state.weather=j.data;if(state.weather.isNight)document.documentElement.classList.add('night'); else document.documentElement.classList.remove('night'); const c=(state.weather.condition||'').toLowerCase();$('#sky').classList.toggle('rainy',/rain|drizzle|thunder/.test(c));$('#sky').classList.toggle('snowy',/snow/.test(c)); if(state.weather.isNight)$('#sky').classList.add('night');else $('#sky').classList.remove('night');}
  catch(e){console.warn(e)}
}
loadCBR();loadWeather();setInterval(loadCBR,30*60*1000);setInterval(loadWeather,5*60*1000);

function modalHead(k,t,p){return `<div class="modal-head"><div class="eyebrow">${k}</div><h2>${t}</h2><p>${p}</p></div>`}

/* ---------------- Экспедиторы ---------------- */
const MODE_LABELS={rail:'Ж/Д',road:'Авто',sea:'Море',air:'Авиа',multimodal:'Мультимодал'};
let agentMode='all';
async function openAgents(){
 openModal(modalHead('СПРАВОЧНИК','Экспедиторы','41 контакт · фильтр по виду перевозки и поиск')+`<div class="panel"><input id="agentSearch" style="width:100%;padding:13px;border:1px solid #d6e8ef;border-radius:14px" placeholder="Поиск компании, контакта, телефона, e-mail…"><div class="mode-chips" id="agentChips" style="margin-top:12px"></div><div id="agentGrid" class="agent-grid" style="margin-top:12px"></div></div>`);
 try{
  const j=await (await fetch('/api/agents')).json();
  const all=j.records||[];
  const chips=$('#agentChips');
  const modes=['all','rail','road','sea','air','multimodal'];
  const drawChips=()=>{chips.innerHTML=modes.map(m=>`<button class="chip ${agentMode===m?'active':''}" data-m="${m}">${m==='all'?'Все':MODE_LABELS[m]}</button>`).join('');
    $$('#agentChips .chip').forEach(c=>c.onclick=()=>{agentMode=c.dataset.m;drawChips();draw()})};
  const draw=()=>{const q=($('#agentSearch').value||'').toLowerCase();
    renderAgents(all.filter(a=>(agentMode==='all'||a.modes.includes(agentMode))&&(a.company+' '+a.contact+' '+a.email+' '+a.phone+' '+a.transport.join(' ')+' '+a.notes).toLowerCase().includes(q)))};
  drawChips();draw();
  $('#agentSearch').oninput=draw;
 }catch(e){toast('Не удалось загрузить экспедиторов')}
}
function renderAgents(list){$('#agentGrid').innerHTML=list.map(a=>`<article class="agent"><strong>${esc(a.company)}</strong><div class="muted">${esc(a.contact||'Контакт не указан')}</div><div style="margin-top:9px">${a.phone?`☎ ${esc(a.phone)}<br>`:''}${a.email?`✉ <a href="mailto:${esc(a.email)}">${esc(a.email)}</a><br>`:''}${a.site?`↗ <a href="${/^https?:/.test(a.site)?esc(a.site):'https://'+esc(a.site)}" target="_blank" rel="noreferrer">${esc(a.site)}</a>`:''}</div><div class="muted" style="margin-top:8px">${esc((a.transport||[]).join(' · '))}</div><div class="muted">${esc(a.notes||'')}</div></article>`).join('')||'<div class="status">Ничего не найдено.</div>'}

/* ---------------- Новости ---------------- */
function openNews(){
 openModal(modalHead('ИНФОРМАЦИОННАЯ ЛЕНТА','Новости ВЭД','Свежие события по таможне, ВЭД, перевозкам и Азии · читаются прямо здесь')+'<div id="newsList" class="news-list"><div class="status">Загружаю свежую ленту…</div></div>');
 fetch('/api/news',{cache:'no-store'}).then(r=>r.json()).then(j=>{
  if(!j.ok)throw Error(j.error);
  const list=j.data.items||[];
  $('#newsList').innerHTML=list.map(n=>`<article class="news-item ${n.important?'important':''}"><a href="#" data-url="${esc(n.url)}">${n.important?'🔴 ':''}${esc(n.title)}</a><div class="news-meta">${esc(n.source)} · ${new Date(n.publishedAt).toLocaleString('ru-RU')}</div></article>`).join('')||'<div class="status">Свежих материалов сейчас не получено.</div>';
  $$('#newsList a').forEach(a=>a.onclick=e=>{e.preventDefault();openReader(a.dataset.url)});
 }).catch(e=>{$('#newsList').innerHTML='<div class="status">Не удалось получить ленту. Попробуйте обновить окно через минуту.</div>';console.warn(e)})
}
function openReader(url){
 openModal(`<div class="modal-head"><div class="eyebrow">ЧТЕНИЕ НОВОСТИ</div><h2 id="readerTitle">Загружаю…</h2></div><div class="panel reader" id="readerBody"><div class="status">Открываю материал…</div></div><div class="status" id="readerSrc" style="margin-top:12px"></div>`);
 fetch('/api/news/read?url='+encodeURIComponent(url)).then(r=>r.json()).then(j=>{
  if(!j.ok)throw Error(j.error);
  $('#readerTitle').textContent=j.title||'Новость';
  $('#readerBody').innerHTML=(j.text?j.text.split(/\n{2,}/).map(p=>`<p>${esc(p)}</p>`).join(''):'<div class="status">Текст извлечь не удалось.</div>');
  $('#readerSrc').innerHTML=`Источник: <a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url)}</a>`;
 }).catch(e=>{
  $('#readerBody').innerHTML=`<div class="status">Не удалось открыть материал на сайте (${esc(e.message||'ошибка')}).<br><a href="${esc(url)}" target="_blank" rel="noreferrer">Открыть оригинал в новой вкладке</a></div>`;
 })
}

/* ---------------- AI-ассистент ---------------- */
function openAssistant(){
 openModal(modalHead('ИНТЕЛЛЕКТ','AI-ассистент','Логистика, расчёты и ВЭД — текстом или голосом')+`<div class="assistant"><div id="chat" class="chat"></div><div class="composer"><button id="mic" title="Диктовка">🎙</button><textarea id="msg" placeholder="Напишите вопрос…"></textarea><button class="send" id="send">Отправить</button></div></div>`);
 renderChat(); const msg=$('#msg');$('#send').onclick=sendAI;msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()}});$('#mic').onclick=voiceInput;
}
function renderChat(){const c=$('#chat');if(!c)return;c.innerHTML=state.chat.length?state.chat.map(m=>`<div class="bubble ${m.role==='user'?'user':'ai'}">${esc(m.content)}</div>`).join(''):'<div class="status" style="text-align:center;margin-top:30px">Готов к разговору. Задайте вопрос по логистике или ВЭД.</div>';c.scrollTop=c.scrollHeight}
async function sendAI(){
 const el=$('#msg');const text=el.value.trim();if(!text)return;
 state.chat.push({role:'user',content:text});el.value='';renderChat();
 const send=$('#send');send.disabled=true;send.textContent='…';
 try{
  const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,history:state.chat.slice(-9,-1)})});
  const j=await r.json();if(!j.ok)throw Error(j.error);
  state.chat.push({role:'assistant',content:j.answer});renderChat();speak(j.answer);
 }catch(e){state.chat.push({role:'assistant',content:'Не удалось получить ответ. '+e.message});renderChat()}
 finally{send.disabled=false;send.textContent='Отправить'}
}
function voiceInput(){if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){toast('Диктовка не поддерживается этим браузером');return}const R=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new R();r.lang=state.lang==='en'?'en-US':state.lang==='tr'?'tr-TR':state.lang==='zh'?'zh-CN':'ru-RU';r.interimResults=false;r.onstart=()=>toast('Слушаю…');r.onerror=()=>toast('Не удалось распознать речь');r.onresult=e=>{$('#msg').value=e.results[0][0].transcript;$('#msg').focus()};r.start()}
function speak(text){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=state.lang==='en'?'en-US':state.lang==='tr'?'tr-TR':state.lang==='zh'?'zh-CN':'ru-RU';u.rate=.98;window.speechSynthesis.speak(u)}

/* ---------------- Таможня ---------------- */
function openCustoms(){
 openModal(modalHead('ТАМОЖЕННЫЙ ПРОВЕРЯЮЩИЙ','ТН ВЭД ЕАЭС','Введите 10-значный код — система проверит актуальные данные: пошлина, НДС, сбор, Честный знак')+`<div class="customs-form"><input id="tnved" inputmode="numeric" maxlength="10" placeholder="Например, 8438101000"><input id="tvalue" inputmode="numeric" type="number" min="0" placeholder="Тамож. стоимость, ₽ (необязательно)" style="max-width:240px"><button class="primary" id="checkTN">Проверить</button></div><div id="customsResult" class="customs-result"></div>`);
 $('#checkTN').onclick=checkTN;
 $('#tnved').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);if(e.target.value.length===10)checkTN()});
}
async function checkTN(){
 const code=$('#tnved').value;const value=$('#tvalue').value;
 if(!/^\d{10}$/.test(code)){toast('Нужно 10 цифр ТН ВЭД');return}
 const out=$('#customsResult');out.innerHTML='<div class="status">Проверяю официальные источники…</div>';
 try{
  const r=await fetch('/api/customs/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,value:value||null})});
  const j=await r.json();if(!j.ok)throw Error(j.error);
  const d=j.data;
  out.innerHTML=`<div class="panel"><p class="shortdesc"><b>${esc(d.shortDescription||'Товар по коду')}</b></p>
  <div class="customs-summary">
    <div class="metric primary-metric"><small>Импортная пошлина</small><strong>${esc(d.importDuty||'—')}</strong></div>
    <div class="metric"><small>НДС</small><strong>${esc(d.vat||'—')}</strong></div>
    <div class="metric"><small>Таможенный сбор</small><strong>${esc(d.customsFee||'—')}</strong></div>
    <div class="metric"><small>Акциз</small><strong>${esc(d.excise||'—')}</strong></div>
  </div>
  <div class="rate-grid" style="margin-top:10px">
    <div class="rate-row"><strong>Честный ЗНАК</strong><span>${esc(d.honestSign||'—')}</span></div>
    <div class="rate-row"><strong>Ограничения</strong><span>${esc(d.restrictions||'—')}</span></div>
    <div class="rate-row"><strong>Уверенность</strong><span>${esc(d.confidence||'—')}</span></div>
    <div class="rate-row"><strong>Код</strong><span>${esc(d.code)}</span></div>
  </div>
  ${d.feeNote?`<div class="status">${esc(d.feeNote)}</div>`:''}
  ${d.warning?`<div class="status">${esc(d.warning)}</div>`:''}
  <div class="status" style="margin-top:12px">Источники: ${(d.sourceUrls||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noreferrer">${esc(u)}</a>`).join(' · ')} · проверено ${esc(d.checkedAt||'')}</div></div>`;
 }catch(e){out.innerHTML='<div class="status">Ошибка проверки: '+esc(e.message)+'</div>'}
}

/* ---------------- Ставки ---------------- */
function getMyRates(){try{return JSON.parse(localStorage.getItem('myRates')||'[]')}catch(e){return[]}}
function saveMyRates(l){localStorage.setItem('myRates',JSON.stringify(l))}
function openRates(){
 openModal(modalHead('РАСЧЁТ','Ставки перевозки','Впишите свои данные — сохранятся в браузере · ниже справочник ставок с поиском')+`
  <div class="panel">
   <div class="rates-form">
    <input id="rFrom" placeholder="Откуда (Shanghai)">
    <input id="rTo" placeholder="Куда (Москва)">
    <select id="rMode"><option value="rail">Ж/Д</option><option value="road">Авто</option><option value="sea">Море</option><option value="air">Авиа</option><option value="multimodal">Мультимодал</option></select>
    <select id="rCont"><option>40HC</option><option>40DC</option><option>20DC</option><option>сборный груз</option></select>
    <input id="rRate" type="number" min="0" placeholder="Ставка (USD)">
    <input id="rDays" placeholder="Транзит, дней (30-35)">
    <input id="rNotes" placeholder="Примечания">
    <button class="primary" id="rSave">Сохранить</button>
   </div>
  </div>
  <div class="panel" style="margin-top:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input id="rateSearch" placeholder="Поиск по маршруту, компании…" style="flex:1;min-width:200px;padding:12px;border:1px solid #d6e8ef;border-radius:14px"><select id="rateMode"><option value="all">Все виды</option><option value="rail">Ж/Д</option><option value="road">Авто</option><option value="sea">Море</option><option value="air">Авиа</option><option value="multimodal">Мультимодал</option><option value="my">Мои ставки</option></select></div><div id="ratesTable" style="margin-top:14px;overflow-x:auto"></div></div>
  <p class="status">Ставки справочные. Всегда уточняйте терминальные расходы в пункте прибытия.</p>`);
 $('#rSave').onclick=()=>{
  const rate=Number($('#rRate').value);const from=$('#rFrom').value.trim();const to=$('#rTo').value.trim();
  if(!from||!to||!rate){toast('Заполните: откуда, куда и ставку');return}
  const l=getMyRates();l.unshift({from,to,mode:$('#rMode').value,container:$('#rCont').value,rate,currency:'USD',transitDays:$('#rDays').value.trim(),notes:$('#rNotes').value.trim(),mine:true,createdAt:new Date().toISOString()});
  saveMyRates(l);toast('Ставка сохранена');drawRatesTable();
  ['rFrom','rTo','rRate','rDays','rNotes'].forEach(id=>$('#'+id).value='');
 };
 $('#rateSearch').oninput=drawRatesTable;$('#rateMode').onchange=drawRatesTable;
 window.delMyRate=i=>{const l=getMyRates();l.splice(i,1);saveMyRates(l);drawRatesTable()};
 ratesCache=null;fetch('/api/rates').then(r=>r.json()).then(j=>{ratesCache=j.records||[];drawRatesTable()}).catch(()=>{ratesCache=[];drawRatesTable()});
}
let ratesCache=null;
function drawRatesTable(){
 const q=($('#rateSearch')?.value||'').toLowerCase(),mode=$('#rateMode')?.value||'all';
 const mine=getMyRates().map((x,i)=>({...x,source:'Моя ставка',del:i}));
 const srv=(ratesCache||[]).filter(x=>!mode||mode==='all'||x.mode===mode);
 const list=(mode==='my'?mine:[...mine,...srv]).filter(x=>(x.from+' '+x.to+' '+(x.company||'')+' '+(x.container||'')+' '+(x.notes||'')).toLowerCase().includes(q));
 $('#ratesTable').innerHTML=list.length?`<table class="rates-table"><thead><tr><th>Маршрут</th><th>Вид</th><th>Контейнер</th><th>Ставка</th><th>Транзит</th><th>Источник / примечание</th><th></th></tr></thead><tbody>${list.map(x=>`<tr class="${x.mine?'mine':''}"><td><b>${esc(x.from)} → ${esc(x.to)}</b></td><td><span class="badge">${MODE_LABELS[x.mode]||esc(x.mode)}</span></td><td>${esc(x.container||'—')}</td><td><b>${Number(x.rate).toLocaleString('ru-RU')} ${esc(x.currency||'USD')}</b></td><td>${esc(x.transitDays||'—')} дн.</td><td class="muted-cell">${esc(x.company||x.source||'')}${x.notes?'<br><span class="muted">'+esc(x.notes)+'</span>':''}</td><td>${x.mine?`<button class="del-rate" data-del="${x.del}" title="Удалить">✕</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="status">Ничего не найдено. Добавьте свою ставку формой выше.</div>';
 $$('#ratesTable [data-del]').forEach(b=>b.onclick=()=>delMyRate(Number(b.dataset.del)));
}

/* ---------------- Карта дня ---------------- */
const FATE_CARDS=[
 ['Спокойный ход','Сегодня лучше не ускорять процесс искусственно: сначала проверить детали, затем действовать.'],
 ['Чёткий расчёт','Цифры сойдутся, если сверить все цифры дважды. День хорош для смет и ставок.'],
 ['Новый маршрут','Присмотритесь к альтернативному пути поставки — он окажется короче или дешевле.'],
 ['Партнёрская удача','Старый контакт откликнется быстрее, чем новый. Не стесняйтесь написать первым.'],
 ['Терпение и проверка','Документы потребуют внимания. Спешка сегодня дороже ожидания.'],
 ['Быстрое решение','Окно возможностей короткое: решайте сегодня, пока ставка не ушла вверх.'],
 ['Внимание к деталям','Мелочь, которую вы заметите, сэкономит крупную сумму на таможне.'],
 ['Удачная сделка','День благоприятен для переговоров и подписания условий.'],
 ['Тихая гавань','Не гонитесь за объёмом — закрепите то, что уже едет.'],
 ['Смелый шаг','Риск сегодня оправдан, если он посчитан до копейки.'],
 ['Поддержка друзей','Помощь придёт со стороны, откуда не ждали. Примите её.'],
 ['Чистые документы','Приведите бумаги в порядок — это разблокирует застрявший груз.'],
 ['Вторая проверка','Проверьте код ТН ВЭД ещё раз: малейшая ошибка обернётся доплатой.'],
 ['Лёгкий транзит','Груз пройдёт границу без сюрпризов. Можно спокойно дышать.'],
 ['Хорошие новости','Дождитесь вечера — придёт известие, которое улучшит неделю.'],
 ['Сила привычки','Работайте по проверенной схеме: сегодня не время экспериментов.'],
 ['Свежий взгляд','Взгляните на старую проблему новыми глазами — решение простое.'],
 ['Удача в мелочах','Мелкий контракт сегодня важнее крупного обещания.'],
 ['Надёжный тыл','Укрепьте отношения с тем, кто страхует ваши поставки.'],
 ['Время договоров','Слово, данное сегодня, станет фундаментом долгого сотрудничества.'],
 ['Мудрость паузы','Перед отправкой груза сделайте шаг назад и оцените картину целиком.'],
 ['Свет впереди','Сложный этап позади. Впереди — ровная дорога и понятные сроки.'],
 ['Твёрдая ставка','Не сбивайте цену ниже разумного — качество перевозки того стоит.'],
 ['Тёплый ветер','День складывается в вашу пользу. Двигайтесь спокойно и уверенно.'],
];
function hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return Math.abs(h)}
function openTarot(){
 const bday=localStorage.getItem('birthday');
 if(!bday){
  openModal(modalHead('КАРТА ДНЯ','Карта Фатимы','Персональный символ дня — по вашей дате рождения')+`<div class="tarot"><div class="tarot-card fate-card" style="display:block;text-align:center;padding:30px"><div class="hand">✋</div><h3 style="margin:14px 0 8px">Введите дату рождения</h3><p style="color:#6f8da0;font-size:14px;line-height:1.6">Карта дня подбирается индивидуально — одна и та же дата для разных людей даёт разные знаки.</p><input type="date" id="bday" style="margin:16px 0;padding:12px;border:1px solid #d2e9f1;border-radius:14px;font:inherit"><br><button class="primary" id="bgo" style="padding:12px 26px">Показать карту</button></div></div>`);
  $('#bgo').onclick=()=>{const v=$('#bday').value;if(!v){toast('Выберите дату');return}localStorage.setItem('birthday',v);openTarot()};
  return;
 }
 const today=new Date().toISOString().slice(0,10);
 const card=FATE_CARDS[hashStr(bday+'|'+today)%FATE_CARDS.length];
 openModal(modalHead('КАРТА ДНЯ','Карта Фатимы','Лёгкий персональный символ дня')+`<div class="tarot"><div class="tarot-card fate-card"><div class="hand">✋</div><h3>${esc(card[0])}</h3><p>${esc(card[1])}</p><div class="muted" style="margin-top:18px;font-size:11px">для даты рождения ${esc(bday)} · вернётесь завтра — карта обновится</div></div></div>`);
}

$$('[data-open]').forEach(b=>b.onclick=()=>({rates:openRates,assistant:openAssistant,agents:openAgents,news:openNews}[b.dataset.open])());
$$('[data-tool]').forEach(b=>b.onclick=e=>{e.stopPropagation();const t=b.dataset.tool;if(t==='rates')openRates();if(t==='theme'){state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('theme',state.theme);document.body.classList.toggle('dark',state.theme==='dark')}if(t==='tarot')openTarot();if(t==='customs')openCustoms()});
$$('[data-lang]').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;toast('Язык интерфейса: '+b.dataset.lang)});
$('#logout').onclick=()=>toast('Сессия закрывается…');