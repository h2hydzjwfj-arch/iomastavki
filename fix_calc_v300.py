import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# ---- 1. Короткие советы для городов ----
if 'routeAdviceShort' not in s:
    block = '''
function routeAdviceShort(info){
  if (!info) return '';
  if (info.region === 'north' && info.rail) return 'Оптимально: прямое ЖД — 25-30 дней';
  if (info.region === 'center' && info.rail) return 'Оптимально: прямое ЖД';
  if (info.region === 'east' && info.sea && info.rail) return 'Оптимально: море из ' + (info.hub || 'Нинбо') + ' или прямое ЖД';
  if (info.region === 'east' && info.sea) return 'Оптимально: море из ' + (info.hub || 'Шанхай');
  if (info.region === 'south' && info.sea && !info.rail) return 'Оптимально: море через ' + (info.hub || 'Шэньчжэнь') + ' + ЖД';
  if (info.region === 'south' && info.sea) return 'Оптимально: море';
  if (info.sea) return 'Оптимально: море';
  if (info.rail) return 'Оптимально: прямое ЖД';
  if (info.road) return 'Авто до ' + (info.hub || 'ближайшего ЖД-хаба');
  return 'Уточните у экспедитора';
}
'''
    anchor = 'function renderRouteAdvice(){'
    if anchor in s:
        s = s.replace(anchor, block + anchor, 1)
        print('OK: routeAdviceShort добавлена')

# Заменить использование info.note на routeAdviceShort
old = "'<p>' + escapeHtml(info.note) + '</p>'"
new = "'<p>' + escapeHtml(routeAdviceShort(info)) + '</p>'"
if old in s:
    s = s.replace(old, new, 1)
    print('OK: renderRouteAdvice — короткий совет')
else:
    print('WARN: anchor info.note не найден')

# ---- 2. Фактор показывает — пока не выбран транспорт ----
old_vol = "function fmtNum(n){const x=Number(n);if(!Number.isFinite(x))return '0';return Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(3).replace(/0+$/,'').replace(/\\.$/,'')} function updateAutoVolume(){const [l,w,h]=dimensionsMm(),pieces=Number($('#pieces').value)||1,volume=(l*w*h/1e9)*pieces,factor=selectedMode&&modes[selectedMode]?modes[selectedMode].factor:167;const v=$('#autoVolume'),vw=$('#autoVolumetricWeight'),f=$('#autoFactor');if(v)v.textContent=volume?fmtNum(volume)+' m³':'0 m³';if(vw)vw.textContent=volume?fmtNum(volume*factor)+' kg':'0 kg';if(f)f.textContent=factor+' kg/m³';}"

new_vol = "function fmtNum(n){const x=Number(n);if(!Number.isFinite(x))return '0';return Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(3).replace(/0+$/,'').replace(/\\.$/,'')} function updateAutoVolume(){const [l,w,h]=dimensionsMm(),pieces=Number($('#pieces').value)||1,volume=(l*w*h/1e9)*pieces;const hasMode=!!(selectedMode&&modes[selectedMode]);const factor=hasMode?modes[selectedMode].factor:0;const v=$('#autoVolume'),vw=$('#autoVolumetricWeight'),f=$('#autoFactor');if(v)v.textContent=volume?fmtNum(volume)+' m³':'0 m³';if(vw)vw.textContent=(hasMode&&volume)?fmtNum(volume*factor)+' kg':'—';if(f)f.textContent=hasMode?factor+' kg/m³':'—';}"

if old_vol in s:
    s = s.replace(old_vol, new_vol, 1)
    print('OK: updateAutoVolume — фактор только при выбранном транспорте')
elif 'hasMode=!!(selectedMode' in s:
    print('SKIP: уже применено')
else:
    print('WARN: updateAutoVolume anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== INDEX.HTML ====================
h_path = 'index.html'
h = open(h_path, 'r', encoding='utf-8').read()

# Найти блок calculatorView
m = re.search(r'<section id="calculatorView"[\s\S]*?</section></section>', h)
if not m:
    print('FAIL: calculatorView не найден')
    exit(1)

block = m.group(0)
nb = block

# Открыть calc-layout + calc-inputs перед h1
nb = nb.replace('<h1 data-i18n="title">Расчёт маршрута</h1>',
                '<div class="calc-layout"><div class="calc-inputs"><h1 data-i18n="title">Расчёт маршрута</h1>', 1)

# Удалить div recommendation/routeAdvice/result из старого места (будут в outputs)
nb = re.sub(r'<div id="recommendation"[^>]*></div>\s*', '', nb, 1)
nb = re.sub(r'<div id="routeAdvice"[^>]*></div>\s*', '', nb, 1)
nb = re.sub(r'<div id="result"[^>]*></div>\s*', '', nb, 1)

# Удалить currency-bar
nb = re.sub(r'<div id="currencyBar"[\s\S]*?</div>\s*</section></section>', '</section></section>', nb, 1)

# Закрыть inputs и открыть outputs перед закрывающими section
nb = nb.replace('</section></section>',
    '</div><div class="calc-output">'
    '<div id="routeAdvice" class="route-advice hidden"></div>'
    '<div id="recommendation" class="recommendation hidden"></div>'
    '<div id="result" class="result hidden"></div>'
    '</div></div></section></section>')

h = h.replace(block, nb, 1)
open(h_path, 'w', encoding='utf-8').write(h)
print('OK: index.html — 2 колонки, курс убран')

# ==================== STYLES.CSS ====================
css_path = 'styles.css'
c = open(css_path, 'r', encoding='utf-8').read()

css_add = '''

/* ========== Калькулятор: 2 колонки ========== */
.calculator-card {
  --pw: 1200px !important;
  overflow: hidden !important;
  height: min(92vh, 720px) !important;
  max-height: min(92vh, 720px) !important;
}
.calc-layout {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 380px !important;
  gap: 22px !important;
  min-height: 0 !important;
  flex: 1 !important;
  overflow: hidden !important;
}
.calc-inputs {
  min-width: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 4px !important;
  overscroll-behavior: contain !important;
}
.calc-inputs::-webkit-scrollbar { width: 6px; }
.calc-inputs::-webkit-scrollbar-thumb { background: rgba(50,111,159,.2); border-radius: 6px; }
.calc-output {
  min-width: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  padding-right: 4px !important;
  overscroll-behavior: contain !important;
}
.calc-output::-webkit-scrollbar { width: 6px; }
.calc-output::-webkit-scrollbar-thumb { background: rgba(50,111,159,.2); border-radius: 6px; }
.calc-output:empty::before,
.calc-output > .hidden:only-child::before {
  content: "Здесь появятся рекомендации, советы по маршруту и расчёт ставки";
}
.calc-output .result { margin-top: 0 !important; }

@media (max-width: 900px) {
  .calculator-card { height: auto !important; max-height: 92vh !important; }
  .calc-layout { grid-template-columns: 1fr !important; }
  .calc-output { max-height: 40vh; }
}
'''

if '.calc-layout' not in c:
    c = c.rstrip() + '\n' + css_add
    open(css_path, 'w', encoding='utf-8').write(c)
    print('OK: styles.css — 2 колонки для калькулятора')

# ==================== SERVER.JS — картинки ====================
sp = 'server.js'
s2 = open(sp, 'r', encoding='utf-8').read()
orig2 = len(s2)

# Расширить defaultImgQuery
old_q = "function defaultImgQuery(title){"
new_q = '''function defaultImgQuery(title){'''
# не меняю старт, но расширю словарь
if 'hyperloop|вакуумн|маглев' not in s2:
    # вставим блок ПЕРЕД дефолтным return
    ext = '''  if (/hyperloop|вакуумн|маглев|hyperloop|скоростн.*поезд/.test(t)) return pick(['hyperloop train','futuristic transport','vacuum train','high speed train future']);
  if (/искусственн.*интеллект|нейросет|ai\\b|ai |машинн.*обучен/.test(t)) return pick(['artificial intelligence','ai neural network','machine learning code','ai technology']);
  if (/дрон|беспилот|drone|uav|квадрокоптер/.test(t)) return pick(['delivery drone','drone flying','cargo drone','uav logistics']);
  if (/спутник|космос|spacex|satellite|космическ/.test(t)) return pick(['satellite orbit','space rocket','satellite technology','space station']);
  if (/робот|robot|автоматизац|механизац/.test(t)) return pick(['warehouse robot','industrial robot','automation robot','robotic arms factory']);
  if (/электро|ev|электромобил|charging|зарядк/.test(t)) return pick(['electric vehicle charging','ev battery','electric car','charging station']);
  if (/блокчейн|blockchain|криптовалют/.test(t)) return pick(['blockchain technology','cryptocurrency network','digital ledger']);
  if (/5g|6g|связь|internet|интернет/.test(t)) return pick(['5g tower','communication technology','internet network']);
  if (/телеком|telecom|связь/.test(t)) return pick(['telecom equipment','network cables','cell tower']);
  if (/финтех|fintech|банк|bank|payment/.test(t)) return pick(['fintech app','banking technology','digital payment']);
  if (/кибербезопас|security|безопасн/.test(t)) return pick(['cybersecurity','data security','network protection']);
  if (/нефт|oil|barrel|нефтепрод/.test(t)) return pick(['oil tanker ship','oil refinery','oil pipeline','fuel tanker truck']);
  if (/газ|lng|газовоз/.test(t)) return pick(['lng tanker','gas pipeline','natural gas plant']);
  if (/пшениц|зерн|wheat|grain|урожай/.test(t)) return pick(['wheat field harvest','grain silo','bulk cargo grain','agriculture export']);
  if (/уголь|coal|угол/.test(t)) return pick(['coal mine','coal train','bulk coal port']);
  if (/металл|metal|сталь|steel|алюмин/.test(t)) return pick(['steel factory','metal warehouse','steel coils logistics']);
  if (/автомобил|машин|car|автотрансп/.test(t)) return pick(['car transport ship','auto logistics','vehicle loading port','car carrier trailer']);
  if (/авиа|самолёт|air|flight|cargo plane|боинг|airbus/.test(t)) return pick(['cargo airplane','airport cargo terminal','air freight loading']);
  if (/мор|порт|судно|контейнер|ship|port/.test(t)) return pick(['container ship port','cargo ship sea','port terminal crane','shipping containers']);
  if (/железнодорож|жд|rail|поезд|вагон/.test(t)) return pick(['freight train railway','cargo train','railway containers','train tracks']);
  if (/грузовик|авто|truck|фур|фура/.test(t)) return pick(['cargo truck highway','semi trailer road','truck fleet logistics']);
  if (/китай|china|шанхай|пекин|гуанчжоу/.test(t)) return pick(['shanghai port','china factory','china logistics warehouse','beijing business']);
  if (/индия|india|дели|мумбаи/.test(t)) return pick(['india port logistics','mumbai port','india cargo ship','delhi business']);
  if (/киргиз|казахстан|узбекистан|средн.*ази/.test(t)) return pick(['central asia trade','kazakhstan trade','silk road','central asia logistics']);
  if (/таможен|пошлин|фтс|еэк|вэд|тн.?вэд|сертифик/.test(t)) return pick(['customs documents','customs clearance','border checkpoint','trade documents']);
  if (/маркиров|честный знак/.test(t)) return pick(['product marking','barcode scanner','qr code label','warehouse label']);
  if (/рыба|fish|сельхоз|agro|food|продовольств/.test(t)) return pick(['food cargo shipping','refrigerated container','cold chain logistics','food export']);
  if (/склад|warehouse|логист/.test(t)) return pick(['warehouse logistics','distribution center','fulfillment center','pallet warehouse']);
  if (/импорт|экспорт|import|export/.test(t)) return pick(['cargo shipping logistics','export containers port','import logistics warehouse']);
'''
    # вставить перед дефолтными "if" (в самый верх функции defaultImgQuery)
    # найдём место сразу после "const pick = function(arr){ return arr[n % arr.length]; };"
    anchor = "const pick = function(arr){ return arr[n % arr.length]; };"
    if anchor in s2:
        s2 = s2.replace(anchor, anchor + '\n' + ext, 1)
        print('OK: defaultImgQuery — расширен словарь картинок')

open(sp, 'w', encoding='utf-8').write(s2)
print('server.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

print()
print('===== ГОТОВО =====')
