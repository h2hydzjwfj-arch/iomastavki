const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const state={theme:localStorage.getItem('theme')||'light',lang:localStorage.getItem('lang')||'ru',chat:[],weather:null,cbr:null,rates:null};
const modal=$('#modal'), body=$('#modalBody');

function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),3200)}
function esc(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function openModal(html){body.innerHTML=html;modal.classList.remove('hidden')}
function closeModal(){modal.classList.add('hidden');body.innerHTML=''}
$('#modalClose').onclick=closeModal; modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))closeModal()});

document.body.classList.toggle('dark',state.theme==='dark');

/* ---------- перевод главной страницы RU / EN / ZH / TR ---------- */
const I18N={
 ru:{tag:'ЛОГИСТИКА · КИТАЙ → РОССИЯ',hero:'Точный расчёт. Умный помощник.<br>Всё необходимое для работы с грузом — в одном месте.',c1t:'Расчёт ставок',c1s:'Маршрут, ставка и транспорт',c2t:'AI-ассистент',c2s:'Текстом или голосом',c3t:'Экспедиторы',c3s:'Контакты и направления перевозок',c4t:'Новости ВЭД',c4s:'Китай · логистика · таможня',upd:'обновление…',lang:'Язык интерфейса: Русский'},
 en:{tag:'LOGISTICS · CHINA → RUSSIA',hero:'Accurate rates. Smart assistant.<br>Everything you need for your cargo — in one place.',c1t:'Rate calculator',c1s:'Route, rate and transport',c2t:'AI assistant',c2s:'Text or voice',c3t:'Freight forwarders',c3s:'Contacts and shipping lanes',c4t:'FTZ news',c4s:'China · logistics · customs',upd:'updating…',lang:'Interface language: English'},
 zh:{tag:'物流 · 中国 → 俄罗斯',hero:'精准报价，智能助手。<br>货运所需的一切，尽在一处。',c1t:'运费计算',c1s:'路线、运价与运输方式',c2t:'AI 助手',c2s:'文字或语音',c3t:'货运代理',c3s:'联系方式与运输线路',c4t:'外贸新闻',c4s:'中国 · 物流 · 海关',upd:'更新中…',lang:'界面语言：中文'},
 tr:{tag:'LOJİSTİK · ÇİN → RUSYA',hero:'Doğru fiyat. Akıllı asistan.<br>Kargo için gereken her şey tek yerde.',c1t:'Fiyat hesaplama',c1s:'Rota, fiyat ve taşıma',c2t:'AI asistan',c2s:'Metin veya sesli',c3t:'Taşımacılar',c3s:'İletişim ve güzergâhlar',c4t:'DTÖ haberleri',c4s:'Çin · lojistik · gümrük',upd:'güncelleniyor…',lang:'Arayüz dili: Türkçe'},
};
function applyLang(l){state.lang=l;localStorage.setItem('lang',l);const d=I18N[l]||I18N.ru;$$('[data-i18n]').forEach(el=>{if(d[el.dataset.i18n])el.textContent=d[el.dataset.i18n]});$$('[data-i18n-html]').forEach(el=>{if(d[el.dataset.i18nHtml])el.innerHTML=d[el.dataset.i18nHtml]})}
$$('[data-lang]').forEach(b=>b.onclick=()=>{applyLang(b.dataset.lang);toast((I18N[b.dataset.lang]||I18N.ru).lang)});
applyLang(state.lang);

/* ---------- небо: как было у вас — день со светом; ночь/дождь только по погоде ---------- */
function applyNight(night){document.documentElement.classList.toggle('night',night);$('#sky').classList.toggle('night',night);$('#themeBtn').textContent=night?'🌙':'☀️'}
async function loadCBR(){
  try{const r=await fetch('/api/cbr',{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error);
    state.cbr=j.data;
    $('#cbrTicker').innerHTML=`<span>CNY</span><strong>${state.cbr.cny.toFixed(3)}</strong><span>USD</span><strong>${state.cbr.usd.toFixed(3)}</strong><span>EUR</span><strong>${state.cbr.eur.toFixed(3)}</strong><em>${esc(state.cbr.source||'ЦБ РФ')} · ${esc(state.cbr.date||'')}${j.stale?' · кэш':''}</em>`;
  }catch(e){$('#cbrTicker').innerHTML='<span>ЦБ РФ</span><strong>временно недоступен</strong>';console.warn(e)}
}
async function loadWeather(){
  try{const r=await fetch('/api/weather',{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error);state.weather=j.data;
    if(state.weather.isNight!=null)applyNight(state.weather.isNight);
    const c=(state.weather.condition||'').toLowerCase();
    $('#sky').classList.toggle('rainy',/rain|drizzle|thunder/.test(c));
    $('#sky').classList.toggle('snowy',/snow/.test(c));
  }catch(e){console.warn(e)}
}
loadCBR();loadWeather();
setInterval(loadCBR,15*60*1000);setInterval(loadWeather,5*60*1000);

/* ---------- «набухающий шарик» на карточках ---------- */
$$('.main-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--mx',(e.clientX-r.left)+'px');card.style.setProperty('--my',(e.clientY-r.top)+'px')});
});

function modalHead(k,t,p){return `<div class="modal-head"><div class="eyebrow">${k}</div><h2>${t}</h2><p>${p}</p></div>`}

/* ---------- экспедиторы: таблица + мгновенный показ из кэша ---------- */
async function openAgents(){
 openModal(modalHead('СПРАВОЧНИК','Экспедиторы','Загрузка контактов…')+`<div class="panel"><input id="agentSearch" style="width:100%;padding:13px;border:1px solid #d6e8ef;border-radius:14px" placeholder="Поиск компании, контакта, телефона, e-mail…"><div id="agentWrap" style="margin-top:12px;overflow:auto;max-height:56vh"><div class="status">Загружаю…</div></div></div>`);
 let cached=null;try{cached=JSON.parse(sessionStorage.getItem('agentsCache')||'null')}catch(e){}
 if(cached&&cached.length){renderAgents(cached)}
 try{const j=await (await fetch('/api/agents')).json();if(!j.ok)throw Error(j.error);
   const rec=j.records||[];
   sessionStorage.setItem('agentsCache',JSON.stringify(rec));
   $('.modal-head p').textContent=`${rec.length} контактов · фильтр по направлению и виду перевозки`;
   renderAgents(rec);
   $('#agentSearch').oninput=e=>renderAgents(rec.filter(a=>(a.company+' '+a.contact+' '+a.email+' '+a.phone+' '+(a.transport||[]).join(' ')+' '+(a.notes||'')).toLowerCase().includes(e.target.value.toLowerCase())));
 }catch(e){if(!cached)toast('Не удалось загрузить экспедиторов: '+e.message)}
}
function renderAgents(list){const w=$('#agentWrap');if(!w)return;
 w.innerHTML=`<table class="agent-table"><thead><tr><th>Компания</th><th>Контакт</th><th>Телефон</th><th>E-mail</th><th>Виды перевозок</th><th>Примечания</th></tr></thead><tbody>${list.map(a=>`<tr><td><b>${esc(a.company)}</b>${a.site?`<br><a href="${/^https?:/.test(a.site)?esc(a.site):'https://'+esc(a.site)}" target="_blank" rel="noreferrer">${esc(a.site)}</a>`:''}</td><td>${esc(a.contact||'—')}</td><td>${a.phone?esc(a.phone):'—'}</td><td>${a.email?`<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>`:'—'}</td><td>${esc((a.transport||[]).join(', '))}</td><td>${esc(a.notes||'')}</td></tr>`).join('')}</tbody></table>`||'<div class="status">Ничего не найдено.</div>';
}

/* ---------- новости: ваш список + фото Pexels + красная пометка ---------- */
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
async function askAI(message,history){
  const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,history:history||[]})});
  const j=await r.json();if(!j.ok)throw Error(j.error);return j.answer;
}
async function sendAI(){
 const el=$('#msg');if(!el)return;const text=el.value.trim();if(!text)return;
 state.chat.push({role:'user',content:text});el.value='';renderChat();
 const send=$('#send');send.disabled=true;send.textContent='…';
 try{const answer=await askAI(text,state.chat.slice(-9,-1));state.chat.push({role:'assistant',content:answer});renderChat()}
 catch(e){state.chat.push({role:'assistant',content:aiErrorText(e.message)});renderChat()}
 finally{send.disabled=false;send.textContent='Отправить'}
}
function aiErrorText(m){if(/credit|billing|insufficient/i.test(m))return '⚠️ У вашего OpenAI-аккаунта закончились кредиты. Пополните баланс: platform.openai.com/settings/organization/billing — после этого ассистент заработает. Сайт и остальные функции работают штатно.';return 'Не удалось получить ответ: '+m}
function voiceInput(){
 if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){toast('Диктовка не поддерживается этим браузером (нужен Chrome/Edge)');return}
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new R();
 r.lang=state.lang==='en'?'en-US':state.lang==='tr'?'tr-TR':state.lang==='zh'?'zh-CN':'ru-RU';r.interimResults=false;
 r.onstart=()=>{$('#mic').textContent='👂';toast('Слушаю… говорите вопрос')};
 r.onerror=e=>{$('#mic').textContent='🎙';toast(e.error==='not-allowed'?'Разрешите доступ к микрофону':'Не удалось распознать речь')};
 r.onend=()=>{const m=$('#mic');if(m)m.textContent='🎙'};
 r.onresult=e=>{const t=e.results[0][0].transcript;const msg=$('#msg');if(!msg)return;msg.value=t;msg.focus();setTimeout(sendAI,150)};
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

/* ---------- ставки: калькулятор с полями + сохранённые ставки ---------- */
async function ensureRates(){if(state.rates)return state.rates;const j=await (await fetch('/api/rates')).json();state.rates=j;return j}
async function openRates(){
 openModal(modalHead('РАСЧЁТ','Расчёт ставок','Введите параметры груза — покажу сохранённые ставки по маршруту, либо оценит AI')+`
  <div class="panel">
    <div class="calc-grid">
      <label>Откуда (Китай)<input id="cFrom" list="chinaCities" placeholder="Shanghai"></label>
      <datalist id="chinaCities"><option>Shanghai</option><option>Qingdao</option><option>Ningbo</option><option>Nansha</option><option>Xiamen</option><option>Shenzhen</option><option>Guangzhou</option><option>Beijing</option><option>Chengdu</option><option>Chongqing</option></datalist>
      <label>Куда (Россия)<input id="cTo" list="ruCities" placeholder="Москва"></label>
      <datalist id="ruCities"><option>Москва</option><option>Санкт-Петербург</option><option>Екатеринбург</option><option>Новосибирск</option><option>Минск</option><option>Владивосток</option><option>Казань</option><option>Ростов-на-Дону</option></datalist>
      <label>Тип<div class="sel"><select id="cType"><option value="">Любой</option><option>40HC</option><option>20DC</option><option>Сборный LCL</option><option>Авто сборный</option></select></div></label>
      <label>Вес, кг<input id="cWeight" inputmode="decimal" placeholder="напр. 12000"></label>
      <label>Объём, м³<input id="cVol" inputmode="decimal" placeholder="напр. 58"></label>
      <label>Кол-во мест<input id="cQty" inputmode="numeric" placeholder="напр. 12"></label>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;align-items:center;flex-wrap:wrap">
      <button class="primary" id="calcBtn">Рассчитать</button>
      <span id="calcStatus" class="status" style="margin:0"></span>
    </div>
  </div>
  <div id="calcResult" class="customs-result"></div>
  <div class="panel" style="margin-top:14px"><div id="savedRatesHead" class="status" style="margin:0 0 10px">Сохранённые ставки…</div><div id="savedRates" class="rate-grid"></div></div>`);
 try{
   const j=await ensureRates();const rec=j.records||[];
   $('#savedRatesHead').textContent=`Сохранённые ставки · ${rec.length} записей · обновлено ${new Date(j.updatedAt).toLocaleString('ru-RU')}`;
   $('#savedRates').innerHTML=rec.map(x=>`<div class="rate-row"><strong>${esc(x.from)} → ${esc(x.to)} · ${esc(x.mode)}</strong><span>${x.rate} ${esc(x.currency)} · ${esc(x.container||'')} · ${esc(x.transitDays||'')} дней · ${esc(x.company||'')}</span></div>`).join('')||'<div class="status">Ставок пока нет — загрузите КП экспедиторов кнопкой ↻ слева.</div>';
 }catch(e){$('#savedRates').innerHTML='<div class="status">Не удалось загрузить ставки.</div>'}
 $('#calcBtn').onclick=calcRates;
 ['cFrom','cTo'].forEach(id=>$('#'+id).addEventListener('keydown',e=>{if(e.key==='Enter')calcRates()}));
}
async function calcRates(){
 const from=$('#cFrom').value.trim(),to=$('#cTo').value.trim(),type=$('#cType').value;
 const weight=parseFloat(($('#cWeight').value||'').replace(',','.'))||0;
 const vol=parseFloat(($('#cVol').value||'').replace(',','.'))||0;
 const qty=parseInt($('#cQty').value)||0;
 const out=$('#calcResult'),st=$('#calcStatus');
 if(!from||!to){toast('Укажите город отправления и прибытия');return}
 st.textContent='Подбираю ставки…';
 try{
   const j=state.rates||await ensureRates();const rec=j.records||[];
   const norm=s=>s.toLowerCase().replace(/[^a-zа-я0-9]/gi,'');
   const nf=norm(from),nt=norm(to);
   let hits=rec.filter(x=>norm(x.from).includes(nf)||nf.includes(norm(x.from))).filter(x=>norm(x.to).includes(nt)||nt.includes(norm(x.to)));
   if(type)hits=hits.filter(x=>{const c=(x.container||'').toLowerCase();const t=type.toLowerCase();return t==='сборный lcl'?c.includes('lcl')||!c:c.includes(t.replace('авто сборный',''))});
   hits=hits.sort((a,b)=>a.rate-b.rate).slice(0,6);
   const cargo=[weight?`вес ${weight} кг`:'',vol?`объём ${vol} м³`:'',qty?`мест: ${qty}`:''].filter(Boolean).join(', ');
   if(hits.length){
     out.innerHTML=`<div class="panel"><div class="status" style="margin:0 0 10px">По маршруту «${esc(from)} → ${esc(to)}»${cargo?` · ${esc(cargo)}`:''} найдено ${hits.length}:</div><div class="rate-grid">${hits.map((x,i)=>`<div class="rate-row ${i===0?'best':''}"><strong>${i===0?'⭐ ':''}${esc(x.from)} → ${esc(x.to)} · ${esc(x.mode)}</strong><span>${x.rate} ${esc(x.currency)} · ${esc(x.container||'')} · ${esc(x.transitDays||'')} дней · ${esc(x.company||'')}${weight&&/40/.test(x.container||'')?` · ≈ ${(x.rate/26000).toFixed(2)} USD/кг (ориентир)`:''}</span></div>`).join('')}</div><p class="status">Ставка индикативная — уточняйте терминальные расходы в пункте прибытия.</p></div>`;
     st.textContent='Готово';
   }else{
     out.innerHTML=`<div class="panel"><div class="status" style="margin:0">По маршруту «${esc(from)} → ${esc(to)}» в справочнике ставок нет. Могу спросить AI-оценку:</div><div style="margin-top:10px"><button class="primary" id="askAI">Спросить AI-ассистента</button></div><div id="aiEst" class="status"></div></div>`;
     st.textContent='';
     $('#askAI').onclick=async()=>{
       const btn=$('#askAI');btn.disabled=true;btn.textContent='Спрашиваю…';
       try{
         const ans=await askAI(`Оцени ставку перевозки ${from} → ${to}${type?', тип: '+type:''}${cargo?', '+cargo:''}. Дай краткий ориентир по цене и срокам, укажи, что это оценка, и посоветуй запросить КП у экспедиторов из справочника.`);
         $('#aiEst').innerHTML='<br>'+esc(ans);btn.textContent='Готово';
       }catch(e){$('#aiEst').textContent=aiErrorText(e.message);btn.disabled=false;btn.textContent='Спросить AI-ассистента'}
     };
   }
 }catch(e){st.textContent='Ошибка: '+e.message}
}

/* ---------- обновление ставок через AI (кнопка ↻) ---------- */
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
     state.rates=null;toast('Ставки обновлены');
   }catch(e){o.textContent='Ошибка: '+aiErrorText(e.message);toast('Не удалось обновить ставки')}
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
