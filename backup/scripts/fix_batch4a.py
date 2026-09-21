import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# --- 1. Словарь городов + функция ---
if 'CHINA_CITIES_TRANSPORT' not in s:
    anchor = "async function showRecommendation(name){"
    if anchor not in s:
        print('FAIL: showRecommendation не найден')
        exit(1)
    block = '''// ========== Маршрутная логика Китай → Россия ==========
const CHINA_CITIES_TRANSPORT = {
  // ===== ЮГ: только море + авто, прямого ЖД нет =====
  'гуанчжоу':   { region:'south', sea:true,  rail:false, road:true, air:true,  hub:'Шэньчжэнь', note:'Южный Китай. Прямого ЖД нет — оптимально море из Наньша + ЖД через Владивосток. Или авто до Шэньчжэня (150 км) → ЖД.' },
  'шэньчжэнь':  { region:'south', sea:true,  rail:false, road:true, air:true,  hub:null,         note:'Крупнейший порт Юга. Море из Яньтянь/Шэкоу — самый оптимальный вариант. Прямого ЖД нет.' },
  'дунгуань':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Шэньчжэнь', note:'Промышленный Юг. Море через Яньтянь (100 км). Прямого ЖД нет, до ближайшей станции — авто.' },
  'фошань':     { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Рядом с Гуанчжоу. Море из Наньша (60 км). Прямого ЖД нет.' },
  'чжухай':     { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Юг. Море через Шэньчжэнь/Наньша. Прямого ЖД нет.' },
  'чжуншань':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Юг, рядом с Гуанчжоу. Море из Наньша/Шэньчжэня.' },
  'шаньтоу':    { region:'south', sea:true,  rail:false, road:true, air:true,  hub:'Шэньчжэнь', note:'Восточный Гуандун. Море. Прямого ЖД в РФ нет.' },
  'цзянмэнь':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Юг. Море из Наньша/Яньтянь.' },
  'хуэйчжоу':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Шэньчжэнь', note:'Юг. Море из Яньтянь.' },
  'фучжоу':     { region:'south', sea:true,  rail:false, road:true, air:true,  hub:'Сямэнь',    note:'Юго-восток. Море из Сямэня/Фучжоу.' },
  'сямынь':     { region:'south', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт Юго-Востока. Море из Сямэня. Есть ограниченное ЖД через Чэнду (перегрузка).' },
  'хайкоу':     { region:'south', sea:true,  rail:false, road:false, air:true, hub:'Гуанчжоу',  note:'Остров Хайнань. Только море + паром. Авто через паром.' },
  'санья':      { region:'south', sea:true,  rail:false, road:false, air:true, hub:'Гуанчжоу',  note:'Хайнань. Только море (паром) или авиа.' },

  // ===== ВОСТОК: море + ЖД =====
  'шанхай':     { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Крупнейший порт Китая. Море из Яншань. ЖД через Сиань/Чэнду. Авто до границы.' },
  'нинбо':      { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт Нинбо-Чжоушань. Море + ЖД — универсальный вариант.' },
  'ханчжоу':    { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:'Нинбо',      note:'Через Нинбо (150 км). Есть ЖД через Сиань.' },
  'сучжоу':     { region:'east',  sea:true,  rail:true,  road:true, air:false, hub:'Шанхай',     note:'Через Шанхай (100 км). Море + ЖД.' },
  'нанькин':    { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт на Янцзы. Море через Шанхай. ЖД через Сиань.' },
  'иу':         { region:'east',  sea:true,  rail:true,  road:true, air:false, hub:'Нинбо',      note:'Город-экспортёр. Через Нинбо (180 км) морем, или авто до Сианя (1500 км) → ЖД.' },
  'цзиньхуа':   { region:'east',  sea:true,  rail:true,  road:true, air:false, hub:'Нинбо',      note:'Рядом с Иу. Через Нинбо морем или авто до ЖД-хаба.' },
  'вэньчжоу':   { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:'Нинбо',      note:'Порт Востока. Море из Вэньчжоу/Нинбо.' },

  // ===== СЕВЕР: прямое ЖД =====
  'пекин':      { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД из Пекина. Порт Тяньцзинь (150 км) для моря. Универсальный хаб.' },
  'тяньцзинь':  { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Северный порт + прямое ЖД. Оптимально море или ЖД.' },
  'шэньян':     { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД + порт Далянь (400 км). Универсал.' },
  'далянь':     { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт Северо-Востока. Море + ЖД. Хорошая логистика.' },
  'харбин':     { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД через Забайкальск. Один из главных ЖД-хабов.' },
  'цицикар':    { region:'north', sea:false, rail:true,  road:true, air:false, hub:'Харбин',     note:'Через Харбин (300 км) прямое ЖД.' },
  'цзинань':    { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:'Циндао',     note:'Через Циндао (350 км) море, или прямое ЖД.' },
  'циндао':     { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт + прямое ЖД. Универсальный хаб Севера.' },
  'чжэнчжоу':   { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Крупнейший ЖД-хаб Центра. Прямое ЖД в РФ.' },
  'шицзячжуан': { region:'north', sea:false, rail:true,  road:true, air:false, hub:'Чжэнчжоу',   note:'Через Чжэнчжоу (400 км) прямое ЖД.' },
  'тайюань':    { region:'north', sea:false, rail:true,  road:true, air:true,  hub:'Чжэнчжоу',   note:'Через Чжэнчжоу (500 км). Есть ЖД через Эрлянь.' },
  'сиань':      { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Главный ЖД-хаб для Центрального Китая. Прямое ЖД, 25-30 дней.' },
  'ланьчжоу':   { region:'north', sea:false, rail:true,  road:true, air:true,  hub:'Сиань',      note:'Через Сиань (600 км). ЖД через Хоргос.' },
  'урумчи':     { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД через Хоргос/Алашанькоу — самый быстрый ЖД-маршрут.' },

  // ===== ЦЕНТР: ЖД + река =====
  'ухань':      { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Речной порт + ЖД. Универсальный хаб Центра.' },
  'чанша':      { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'ЖД-хаб для Юга. Прямое ЖД через Чжэнчжоу.' },
  'наньчан':    { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:'Ухань',      note:'Через Ухань (350 км) ЖД.' },
  'чунцин':     { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Крупный ЖД-хаб. Прямое ЖД в РФ.' },
  'чэнду':      { region:'center',sea:false, rail:true,  road:true, air:true,  hub:null,         note:'ЖД-хаб. Прямое ЖД через Сиань/Чжэнчжоу.' },
  'хэфэй':      { region:'center',sea:false, rail:true,  road:true, air:true,  hub:'Ухань',      note:'Через Ухань (400 км) ЖД.' },
  'куньмин':    { region:'center',sea:false, rail:true,  road:true, air:true,  hub:'Чэнду',      note:'Через Чэнду (1100 км) ЖД.' },
  'наннин':     { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Юго-Запад. Есть ЖД в РФ через Чунцин.' },
};

function normalizeCityKey(s){ return String(s||'').toLowerCase().replace(/[^a-zа-яё]/gi,''); }

function renderRouteAdvice(){
  const el = $('#routeAdvice');
  if (!el) return;
  const from = ($('#fromCity')?.value || '').trim();
  const to = ($('#toCity')?.value || '').trim();
  if (!from || !to){ el.classList.add('hidden'); return; }
  const key = normalizeCityKey(from);
  const info = CHINA_CITIES_TRANSPORT[key];
  if (!info){ el.classList.add('hidden'); return; }

  const warnings = [];
  const modes = [];
  if (info.sea)  modes.push('🚢 море' + (info.region==='south'?' (Наньша/Яньтянь)':info.region==='east'?' (Нинбо/Шанхай)':info.region==='north'?' (Циндао/Тяньцзинь)':' (Янцзы)'));
  if (info.rail) modes.push('🚂 прямое ЖД');
  if (info.road) modes.push('🚛 авто');
  if (info.air)  modes.push('✈️ авиа');

  // Предупреждения по выбранному транспорту
  if (selectedMode === 'rail' && !info.rail){
    warnings.push({ type:'danger', html:'<b>Прямого ЖД из ' + escapeHtml(from) + ' нет.</b> Варианты: авто до ' + escapeHtml(info.hub || 'ближайшего ЖД-хаба') + ', либо морем через порт.' });
  }
  if (selectedMode === 'road' && info.region === 'south'){
    warnings.push({ type:'warning', html:'<b>Авто из ' + escapeHtml(from) + ' в РФ — в 2-3 раза дороже моря + ЖД.</b> Оправдано только для срочных грузов до 20 т.' });
  }
  if (selectedMode === 'sea' && !info.sea && info.region === 'north'){
    warnings.push({ type:'warning', html:'Море из ' + escapeHtml(from) + ' — через ' + escapeHtml(info.hub || 'ближайший порт') + ' (авто 300-500 км). ЖД обычно выгоднее.' });
  }
  if (selectedMode === 'sea' && !info.sea){
    warnings.push({ type:'warning', html:'У ' + escapeHtml(from) + ' нет прямого выхода к морю. Груз пойдёт через ' + escapeHtml(info.hub || 'ближайший порт') + '.' });
  }
  if (selectedMode === 'air'){
    warnings.push({ type:'info', html:'Авиа — быстрее всего (5-8 дней), но в 5-10 раз дороже. Оправдано для грузов до 200 кг.' });
  }

  // Основная карточка
  let html = '<div class="route-advice-main"><span class="route-advice-icon">🗺</span><div class="route-advice-text">' +
    '<b>' + escapeHtml(from) + ' → ' + escapeHtml(to) + '</b>' +
    '<p>' + escapeHtml(info.note) + '</p>' +
    '<div class="route-advice-modes">' + modes.join(' · ') + '</div>' +
    '</div></div>';

  // Предупреждения
  warnings.forEach(function(w){
    const icon = w.type === 'danger' ? '🚫' : w.type === 'warning' ? '⚠️' : 'ℹ️';
    html += '<div class="route-advice-warn route-advice-' + w.type + '"><span class="route-advice-warn-icon">' + icon + '</span><div>' + w.html + '</div></div>';
  });

  el.innerHTML = html;
  el.classList.remove('hidden');
}

'''
    s = s.replace(anchor, block + anchor, 1)
    print('OK: CHINA_CITIES_TRANSPORT + renderRouteAdvice добавлены')
else:
    print('SKIP: маршрутная логика уже есть')

# --- 2. Вызов renderRouteAdvice при смене транспорта ---
old_mode = "b.onclick=()=>{selectedMode=k;selectedFactor=modes[k].factor;$('#transportBtn span').textContent=modeName(k);renderFactors();updateAutoVolume();renderForwarderMenu();renderTransportMenu();menu.classList.remove('open')}"
new_mode = "b.onclick=()=>{selectedMode=k;selectedFactor=modes[k].factor;$('#transportBtn span').textContent=modeName(k);renderFactors();updateAutoVolume();renderForwarderMenu();renderTransportMenu();renderRouteAdvice();menu.classList.remove('open')}"
if 'renderRouteAdvice();menu.classList.remove' in s:
    print('SKIP: renderRouteAdvice уже в renderTransportMenu')
elif old_mode in s:
    s = s.replace(old_mode, new_mode, 1)
    print('OK: renderRouteAdvice вызывается при смене транспорта')
else:
    print('WARN: anchor renderTransportMenu не найден')

# --- 3. Вызов при выборе города ---
old_sel = "d.onclick=()=>{input.value=lang==='zh'?c[2]:lang==='en'?c[1]:c[0];box.classList.remove('open');if(target==='asia')selectedCities.from=c;else selectedCities.to=c;autoDistance()}"
new_sel = "d.onclick=()=>{input.value=lang==='zh'?c[2]:lang==='en'?c[1]:c[0];box.classList.remove('open');if(target==='asia')selectedCities.from=c;else selectedCities.to=c;autoDistance();renderRouteAdvice()}"
if 'autoDistance();renderRouteAdvice()' in s:
    print('SKIP: renderRouteAdvice уже в выборе города')
elif old_sel in s:
    s = s.replace(old_sel, new_sel, 1)
    print('OK: renderRouteAdvice при выборе города')
else:
    print('WARN: anchor выбора города не найден')

# --- 4. Вызов в autoDistance ---
old_ad = "const km=Math.round(haversineKm(ca,cb));$('#distance').value=km;$('#distance').dataset.auto='1';\n showRecommendation(selectedForwarder);"
new_ad = "const km=Math.round(haversineKm(ca,cb));$('#distance').value=km;$('#distance').dataset.auto='1';\n try{ renderRouteAdvice(); }catch(e){}\n showRecommendation(selectedForwarder);"
if 'try{ renderRouteAdvice(); }catch(e){}' in s:
    print('SKIP: renderRouteAdvice уже в autoDistance')
elif old_ad in s:
    s = s.replace(old_ad, new_ad, 1)
    print('OK: renderRouteAdvice в autoDistance')
else:
    print('WARN: anchor autoDistance не найден')

# --- 5. Вызов при загрузке ---
if 'setTimeout(renderRouteAdvice, 100)' not in s:
    old_init = "updateCityPlaceholders();\ncheckWeather();setInterval(checkWeather,5*60*1000);"
    new_init = "updateCityPlaceholders();\nsetTimeout(renderRouteAdvice, 500);\ncheckWeather();setInterval(checkWeather,5*60*1000);"
    if old_init in s:
        s = s.replace(old_init, new_init, 1)
        print('OK: renderRouteAdvice при загрузке')
    else:
        print('WARN: anchor init не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== INDEX.HTML ====================
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()

if 'id="routeAdvice"' not in s2:
    anchor_html = '<div id="recommendation" class="recommendation hidden"></div>'
    if anchor_html in s2:
        s2 = s2.replace(anchor_html, anchor_html + '\n<div id="routeAdvice" class="route-advice hidden"></div>', 1)
        print('OK: routeAdvice блок добавлен в HTML')
    else:
        print('WARN: anchor HTML не найден')
else:
    print('SKIP: routeAdvice уже в HTML')

s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>108', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>108', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v108')

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 4A: маршрутная логика ========== */
.route-advice{
  margin-top: 12px;
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(55,103,132,.14);
  background: linear-gradient(135deg,#f4fbfd,#eaf6fa);
  box-shadow: 0 6px 20px rgba(35,90,116,.06);
  animation: routeAdviceIn .35s cubic-bezier(.2,.8,.2,1);
}
@keyframes routeAdviceIn{
  from{ opacity: 0; transform: translateY(-6px); }
  to{ opacity: 1; transform: translateY(0); }
}
.route-advice.hidden{ display: none; }

.route-advice-main{
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  align-items: flex-start;
}
.route-advice-icon{
  flex: 0 0 38px;
  width: 38px; height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg,#3d9ec7,#227eaa);
  color: #fff;
  font-size: 19px;
  box-shadow: 0 6px 16px rgba(45,113,159,.24);
}
.route-advice-text{ flex: 1; min-width: 0; }
.route-advice-text b{
  display: block;
  font-size: 14px;
  color: #143e56;
  margin-bottom: 5px;
  letter-spacing: -.2px;
}
.route-advice-text p{
  margin: 0 0 8px;
  font-size: 12.5px;
  line-height: 1.55;
  color: #47647a;
}
.route-advice-modes{
  font-size: 11px;
  color: #6c8a9c;
  letter-spacing: .2px;
  padding-top: 6px;
  border-top: 1px dashed rgba(55,103,132,.15);
}

.route-advice-warn{
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 18px;
  font-size: 12.5px;
  line-height: 1.5;
  border-top: 1px solid rgba(55,103,132,.1);
}
.route-advice-warn-icon{
  flex: 0 0 auto;
  font-size: 15px;
  line-height: 1.2;
}
.route-advice-warn div{ flex: 1; min-width: 0; }
.route-advice-warn b{ color: inherit; }

.route-advice-info{
  background: rgba(224,241,249,.72);
  color: #2c6379;
}
.route-advice-info .route-advice-warn-icon{ color: #3d9ec7; }

.route-advice-warning{
  background: rgba(255,241,215,.72);
  color: #755b31;
}
.route-advice-warning .route-advice-warn-icon{ color: #b88a2e; }

.route-advice-danger{
  background: rgba(255,229,229,.82);
  color: #9a3333;
  font-weight: 500;
}
.route-advice-danger .route-advice-warn-icon{ color: #c43a3a; }

/* Тёмная тема */
body.manual-dark .route-advice{
  background: linear-gradient(135deg,#0a3040,#0d3d52);
  border-color: rgba(130,199,209,.22);
}
body.manual-dark .route-advice-text b{ color: #eef8ff; }
body.manual-dark .route-advice-text p{ color: #b9d8e8; }
body.manual-dark .route-advice-modes{ color: #9fc2d0; border-top-color: rgba(130,199,209,.16); }
body.manual-dark .route-advice-info{ background: rgba(16,74,100,.62); color: #b9e2ed; }
body.manual-dark .route-advice-warning{ background: rgba(90,70,35,.55); color: #f2d9a0; }
body.manual-dark .route-advice-danger{ background: rgba(120,40,40,.55); color: #ffd0d0; }

@media(max-width: 700px){
  .route-advice-main{ padding: 14px 14px; }
  .route-advice-icon{ width: 32px; height: 32px; flex-basis: 32px; font-size: 16px; }
  .route-advice-text b{ font-size: 13px; }
  .route-advice-text p{ font-size: 12px; }
  .route-advice-warn{ padding: 10px 14px; font-size: 12px; }
}
"""

s3 += css_add
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: styles.css — блок Батч 4A добавлен')

print('===== ГОТОВО =====')
