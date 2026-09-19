import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# --- 1. Роут /api/route-distance с OSRM + Nominatim ---
if "/api/route-distance" not in s:
    anchor = "app.get('/api/currency', async function(req,res){"
    if anchor not in s:
        print('WARN: anchor /api/currency не найден')
    else:
        block = '''// ========== Дорожное расстояние через OSRM + Nominatim ==========
const LOCAL_CITY_COORDS = {
  'пекин':[39.9042,116.4074],'beijing':[39.9042,116.4074],
  'шанхай':[31.2304,121.4737],'shanghai':[31.2304,121.4737],
  'гуанчжоу':[23.1291,113.2644],'guangzhou':[23.1291,113.2644],
  'шэньчжэнь':[22.5431,114.0579],'shenzhen':[22.5431,114.0579],
  'нинбо':[29.8683,121.5440],'ningbo':[29.8683,121.5440],
  'иу':[29.3068,120.0749],'yiwu':[29.3068,120.0749],
  'циндао':[36.0671,120.3826],'qingdao':[36.0671,120.3826],
  'тяньцзинь':[39.3434,117.3616],'tianjin':[39.3434,117.3616],
  'далянь':[38.9140,121.6147],'dalian':[38.9140,121.6147],
  'шэньян':[41.8057,123.4315],'shenyang':[41.8057,123.4315],
  'харбин':[45.8038,126.5349],'harbin':[45.8038,126.5349],
  'сиань':[34.3416,108.9398],'xian':[34.3416,108.9398],
  'чжэнчжоу':[34.7466,113.6254],'zhengzhou':[34.7466,113.6254],
  'ухань':[30.5928,114.3055],'wuhan':[30.5928,114.3055],
  'чэнду':[30.5728,104.0668],'chengdu':[30.5728,104.0668],
  'чунцин':[29.4316,106.9123],'chongqing':[29.4316,106.9123],
  'куньмин':[24.8801,102.8329],'kunming':[24.8801,102.8329],
  'урумчи':[43.8256,87.6168],'urumqi':[43.8256,87.6168],
  'москва':[55.7558,37.6173],'moscow':[55.7558,37.6173],
  'санкт-петербург':[59.9311,30.3609],'saint petersburg':[59.9311,30.3609],'st petersburg':[59.9311,30.3609],
  'владивосток':[43.1155,131.8855],'vladivostok':[43.1155,131.8855],
  'находка':[42.8333,132.8833],'nakhodka':[42.8333,132.8833],
  'новосибирск':[55.0084,82.9357],'novosibirsk':[55.0084,82.9357],
  'екатеринбург':[56.8389,60.6057],'yekaterinburg':[56.8389,60.6057],
  'казань':[55.7879,49.1233],'kazan':[55.7879,49.1233],
  'краснодар':[45.0355,38.9753],'krasnodar':[45.0355,38.9753],
  'ростов-на-дону':[47.2225,39.7188],'rostov-on-don':[47.2225,39.7188],
  'хабаровск':[48.4827,135.0838],'khabarovsk':[48.4827,135.0838],
  'омск':[54.9885,73.3242],'omsk':[54.9885,73.3242],
  'самара':[53.2001,50.1500],'samara':[53.2001,50.1500],
  'уфа':[54.7388,55.9721],'ufa':[54.7388,55.9721],
  'челябинск':[55.1644,61.4368],'chelyabinsk':[55.1644,61.4368],
  'пермь':[58.0105,56.2502],'perm':[58.0105,56.2502],
  'тюмень':[57.1522,65.5272],'tyumen':[57.1522,65.5272]
};

function normalizeCityKeyServer(s){
  return String(s||'').toLowerCase().trim().replace(/ё/g,'е').replace(/[^a-zа-я0-9 -]/gi,'');
}

async function geocodeCityServer(name){
  const key = normalizeCityKeyServer(name);
  if (LOCAL_CITY_COORDS[key]) return LOCAL_CITY_COORDS[key];
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru,en&q=' + encodeURIComponent(name);
    const r = await fetch(url, {
      headers: { 'User-Agent': 'iomastavka-logistics/1.0 (contact@iomastavka.onrender.com)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d) || !d.length) return null;
    return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
  } catch(e){ return null; }
}

function haversineKmServer(a, b){
  const R=6371, rad=x=>x*Math.PI/180;
  const dLat=rad(b[0]-a[0]), dLon=rad(b[1]-a[1]);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

app.get('/api/route-distance', async function(req,res){
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();
  if (!from || !to) return res.status(400).json({ ok:false, error:'from/to required' });
  try {
    const [c1, c2] = await Promise.all([geocodeCityServer(from), geocodeCityServer(to)]);
    if (!c1 || !c2) return res.status(404).json({ ok:false, error:'city not found', from:c1, to:c2 });
    let roadKm = null;
    try {
      const url = 'https://router.project-osrm.org/route/v1/driving/' + c1[1] + ',' + c1[0] + ';' + c2[1] + ',' + c2[0] + '?overview=false&alternatives=false';
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (r.ok){
        const d = await r.json();
        if (d.routes && d.routes[0] && Number.isFinite(d.routes[0].distance)){
          roadKm = Math.round(d.routes[0].distance / 1000);
        }
      }
    } catch(e){ console.warn('[route] osrm: ' + e.message); }
    const straightKm = Math.round(haversineKmServer(c1, c2));
    const finalKm = roadKm || Math.round(straightKm * 1.25);
    console.log('[route] ' + from + ' -> ' + to + ' = ' + finalKm + ' km (road=' + roadKm + ', straight=' + straightKm + ')');
    res.json({ ok:true, distanceKm: finalKm, roadKm, straightKm, fromCoords:c1, toCoords:c2, source: roadKm ? 'osrm' : 'haversine' });
  } catch(e){
    console.error('[route] error:', e.message);
    res.status(502).json({ ok:false, error:e.message });
  }
});

'''
        s = s.replace(anchor, block + anchor, 1)
        print('OK: /api/route-distance добавлен (OSRM + Nominatim)')
else:
    print('SKIP: /api/route-distance уже есть')

# --- 2. Улучшение /api/customs/check: логирование + таймаут ---
old_cc = """app.post('/api/customs/check', async function(req,res){
  const code = String(req.body?.code || '').replace(/\\D/g,'').slice(0,10);
  if (code.length !== 10) return res.status(400).json({ ok:false, error:'Нужен 10-значный код' });
  try {
    const sys = 'Ты специалист по ВЭД РФ/ЕАЭС. Отвечай строго в формате ниже.';
    const usr = 'Проверь код ТН ВЭД ' + code + '.\\n\\nОтвет строго:\\nКОД: ' + code + '\\nОПИСАНИЕ: ...\\nИМПОРТНАЯ ПОШЛИНА: ...\\nНДС: ...\\nАКЦИЗ: ...\\nТАМОЖЕННЫЙ СБОР: ...\\nЧЕСТНЫЙ ЗНАК: ...\\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: ...\\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: ...\\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ...';
    const text = await aiChatText(sys, usr, 2500);
    res.json({ ok:true, code, title:'ТН ВЭД ' + code, analysis:text });
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});"""

new_cc = """app.post('/api/customs/check', async function(req,res){
  const code = String(req.body?.code || '').replace(/\\D/g,'').slice(0,10);
  if (code.length !== 10) return res.status(400).json({ ok:false, error:'Нужен 10-значный код' });
  console.log('[customs] запрос code=' + code + ' | Groq=' + (process.env.GROQ_API_KEY?'yes':'no') + ' Gemini=' + (process.env.GEMINI_API_KEY?'yes':'no') + ' DeepSeek=' + (process.env.DEEPSEEK_API_KEY?'yes':'no'));
  const t0 = Date.now();
  try {
    const sys = 'Ты специалист по ВЭД РФ и ЕАЭС с 20-летним опытом. Отвечай на русском. Давай точную и актуальную информацию по коду ТН ВЭД: описание, пошлину, НДС, акциз, таможенный сбор, маркировку Честный знак, разрешительные документы (сертификаты, декларации), запреты и ограничения. Если чего-то нет — пиши "не установлено".';
    const usr = 'Код ТН ВЭД ЕАЭС: ' + code + '\\n\\nВерни строго в формате (каждая строка начинается с метки):\\nКОД: ' + code + '\\nОПИСАНИЕ: [полное наименование товара]\\nИМПОРТНАЯ ПОШЛИНА: [ставка, % или €/кг]\\nНДС: [ставка, %]\\nАКЦИЗ: [ставка или "нет"]\\nТАМОЖЕННЫЙ СБОР: [сумма в рублях по стоимости]\\nЧЕСТНЫЙ ЗНАК: [подлежит/не подлежит маркировке]\\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: [сертификаты/декларации, если нужны]\\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: [если есть]\\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: [важные примечания]';
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Превышено время ожидания (60 сек)')), 60000));
    const text = await Promise.race([aiChatText(sys, usr, 2500), timeout]);
    const dt = Math.round((Date.now()-t0)/1000);
    console.log('[customs] OK за ' + dt + ' сек, длина=' + (text||'').length);
    if (!text || !text.trim()) throw new Error('Пустой ответ от AI');
    res.json({ ok:true, code, title:'ТН ВЭД ' + code, analysis:text });
  } catch(e){
    const dt = Math.round((Date.now()-t0)/1000);
    console.error('[customs] FAIL за ' + dt + ' сек: ' + e.message);
    res.status(502).json({ ok:false, error:e.message });
  }
});"""

if 'Promise.race([aiChatText(sys, usr, 2500), timeout])' in s:
    print('SKIP: /api/customs/check уже улучшен')
elif old_cc in s:
    s = s.replace(old_cc, new_cc, 1)
    print('OK: /api/customs/check — логирование + таймаут 60 сек')
else:
    print('WARN: /api/customs/check anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# --- 3. autoDistance через /api/route-distance ---
old_ad_start = s2.find('async function autoDistance(){')
old_ad_end = s2.find('\nfunction fitsContainer', old_ad_start)
if old_ad_start < 0 or old_ad_end <= old_ad_start:
    print('WARN: autoDistance не найден')
else:
    new_ad = '''async function autoDistance(){
 const requestId=++distanceRequestId;
 const fromText=$('#fromCity')?.value?.trim()||'', toText=$('#toCity')?.value?.trim()||'';
 if(!fromText||!toText){$('#distance').value='';$('#distance').dataset.auto='';document.getElementById('recommendation')?.classList.add('hidden');document.getElementById('routeAdvice')?.classList.add('hidden');return}
 try{
   const r = await fetch('/api/route-distance?from=' + encodeURIComponent(fromText) + '&to=' + encodeURIComponent(toText));
   if (requestId !== distanceRequestId) return;
   const d = await r.json();
   if (d && d.ok && Number.isFinite(d.distanceKm)){
     $('#distance').value = d.distanceKm;
     $('#distance').dataset.auto = '1';
     try{ renderRouteAdvice(); }catch(e){}
     showRecommendation(selectedForwarder);
     return;
   }
 }catch(e){ console.warn('route-distance:', e.message); }
 // Fallback — прямая линия
 const a=selectedCities.from && cityName(selectedCities.from)===fromText?selectedCities.from:[fromText];
 const b=selectedCities.to && cityName(selectedCities.to)===toText?selectedCities.to:[toText];
 const [ca,cb]=await Promise.all([resolveCityCoordinates(a,'china'),resolveCityCoordinates(b,'russia')]);
 if(requestId!==distanceRequestId||!ca||!cb)return;
 const km=Math.round(haversineKm(ca,cb)*1.25);
 $('#distance').value=km;$('#distance').dataset.auto='1';
 try{ renderRouteAdvice(); }catch(e){}
 showRecommendation(selectedForwarder);
}
'''
    s2 = s2[:old_ad_start] + new_ad + s2[old_ad_end:]
    print('OK: autoDistance переписан через /api/route-distance')

# --- 4. voice-active на .assistant-shell ---
old_v = "$('#voiceButton')?.classList.toggle('listening',on);$('#voiceOrb')?.classList.toggle('listening',on);$('#assistantView')?.classList.toggle('voice-active',on);"
new_v = "$('#voiceButton')?.classList.toggle('listening',on);$('#voiceOrb')?.classList.toggle('listening',on);$('#assistantView')?.classList.toggle('voice-active',on);document.querySelector('.assistant-shell')?.classList.toggle('voice-active',on);"
if 'document.querySelector(\'.assistant-shell\')?.classList.toggle(\'voice-active\'' in s2:
    print('SKIP: voice-active уже добавляется на assistant-shell')
elif old_v in s2:
    s2 = s2.replace(old_v, new_v, 1)
    print('OK: voice-active — добавлен на .assistant-shell')
else:
    print('WARN: setVoiceUI anchor не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('app.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
# Скрыть стрелку Назад в топбаре
s3 = s3.replace('<button id="backToNewsBtn" class="topbar-back" type="button" aria-label="Назад" title="Назад" style="display:none">',
                '<button id="backToNewsBtn" class="topbar-back" type="button" aria-label="Назад" title="Назад" style="display:none !important;visibility:hidden !important;pointer-events:none !important">')
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>109', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>109', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html — стрелка скрыта, версия v109')

# ==================== STYLES.CSS ====================
p4 = 'styles.css'
s4 = open(p4, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 5: крестики, цвет кнопок, орб ========== */

/* 1. Вернуть крестики ВНУТРИ каждого popup */
#calculatorView .view-close,
#calculatorView .close-button,
#forwardersView .view-close,
#forwardersView .close-button,
#assistantView .close-button,
#assistantView .view-close,
#newsView .view-close,
#newsView .close-button,
#customsView .view-close,
#customsView .close-button,
#articleView .view-close,
#articleView .close-button{
  display: grid !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  position: absolute !important;
  left: 18px !important;
  top: 16px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  background: rgba(235,238,241,.94) !important;
  color: #6e7b84 !important;
  font-size: 20px !important;
  line-height: 1 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  z-index: 3000 !important;
  box-shadow: 0 4px 14px rgba(30,60,75,.10) !important;
}
#calculatorView .view-close:hover,
#forwardersView .view-close:hover,
#assistantView .close-button:hover,
#newsView .view-close:hover,
#customsView .view-close:hover,
#articleView .view-close:hover{
  background: #e3e7ea !important;
  color: #304b5c !important;
  transform: scale(1.08) !important;
}

/* Статья — крестик в углу картинки, полупрозрачный */
#articleView .view-close,
#articleView .close-button{
  position: fixed !important;
  left: 18px !important;
  top: 18px !important;
  background: rgba(20,40,55,.72) !important;
  color: #ffffff !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
#articleView .view-close:hover,
#articleView .close-button:hover{
  background: rgba(20,40,55,.9) !important;
}

/* Тёмная тема */
body.manual-dark #calculatorView .view-close,
body.manual-dark #forwardersView .view-close,
body.manual-dark #assistantView .close-button,
body.manual-dark #newsView .view-close,
body.manual-dark #customsView .view-close{
  background: #0b4760 !important;
  color: #ffe9a1 !important;
  border: 1px solid rgba(125,219,237,.34) !important;
}

/* 2. Скрыть стрелку Назад в топбаре */
.topbar-back{
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* 3. Жёлто-золотистый цвет иконок верхнего меню */
.topbar-left .top-nav-btn{
  color: #d4a52c !important;
}
.topbar-left .top-nav-btn:hover{
  color: #b88a1e !important;
}
.topbar-left .top-nav-btn > span:last-child{
  color: #d4a52c !important;
}
body.manual-dark .topbar-left .top-nav-btn,
body.manual-dark .topbar-left .top-nav-btn > span:last-child{
  color: #ffe08a !important;
}
body.manual-dark .topbar-left .top-nav-btn:hover{
  color: #ffd45a !important;
}

/* 4. Орб показывается только при голосовом вводе */
.voice-orb-stage{
  display: none !important;
  height: 0 !important;
  flex-basis: 0 !important;
  overflow: visible;
}
#assistantView.voice-active .voice-orb-stage,
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  height: 130px !important;
  flex-basis: 130px !important;
  align-items: center !important;
  justify-content: center !important;
}
#assistantView.voice-active .voice-orb,
.assistant-shell.voice-active .voice-orb{
  display: grid !important;
}

@media(max-width: 650px){
  #calculatorView .view-close,
  #forwardersView .view-close,
  #assistantView .close-button,
  #newsView .view-close,
  #customsView .view-close,
  #articleView .view-close{
    left: 12px !important;
    top: 12px !important;
    width: 30px !important;
    height: 30px !important;
    font-size: 18px !important;
  }
}
"""

s4 += css_add
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: styles.css — блок Батч 5 добавлен')

print('===== ГОТОВО =====')
