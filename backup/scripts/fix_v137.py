import re

# ==================== SERVER.JS: возвращаем preprocessForTts ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

if 'function preprocessForTts(' not in s:
    anchor = 'function runEdgeTts(text, voice, out){'
    if anchor not in s:
        print('FAIL: runEdgeTts не найден')
    else:
        block = '''function preprocessForTts(text, lang){
  let t = String(text || '');
  t = t.replace(/\\$\\s*(\\d[\\d.,]*)\\s*[-–—]\\s*\\$?\\s*(\\d[\\d.,]*)/g, '$1-$2 долларов');
  t = t.replace(/(\\d[\\d.,]*)\\s*[-–—]\\s*(\\d[\\d.,]*)\\s*\\$/g, '$1-$2 долларов');
  t = t.replace(/\\$\\s*(\\d[\\d.,]*)/g, '$1 долларов');
  t = t.replace(/(\\d[\\d.,]*)\\s*\\$/g, '$1 долларов');
  t = t.replace(/(\\d[\\d.,]*)\\s*₽/g, '$1 рублей');
  t = t.replace(/₽\\s*(\\d[\\d.,]*)/g, '$1 рублей');
  t = t.replace(/(\\d[\\d.,]*)\\s*€/g, '$1 евро');
  t = t.replace(/€\\s*(\\d[\\d.,]*)/g, '$1 евро');
  t = t.replace(/(\\d[\\d.,]*)\\s*¥/g, '$1 юаней');
  t = t.replace(/(\\d[\\d.,]*)\\s*%/g, '$1 процентов');
  if (lang === 'ru') t = t.replace(/(\\d)\\.(\\d)/g, '$1,$2');
  if (lang === 'ru'){
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ТН ВЭД([^А-Яа-яЁёA-Za-z]|$)/g, '$1тэ-эн вэ-э-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])НПЗ([^А-Яа-яЁёA-Za-z]|$)/g, '$1эн-пэ-зэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])Ж\\/Д([^А-Яа-яЁёA-Za-z]|$)/g, '$1жэ-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ЖД([^А-Яа-яЁёA-Za-z]|$)/g, '$1жэ-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ВЭД([^А-Яа-яЁёA-Za-z]|$)/g, '$1вэ-э-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ФТС([^А-Яа-яЁёA-Za-z]|$)/g, '$1эф-тэ-эс$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ЕАЭС([^А-Яа-яЁёA-Za-z]|$)/g, '$1е-а-е-эс$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])КП([^А-Яа-яЁёA-Za-z]|$)/g, '$1ка-пэ$2');
  }
  t = t.replace(/[▪•●◆■]/g, ', ');
  t = t.replace(/[#*`>_]+/g, ' ');
  t = t.replace(/\\s*[—–]\\s*/g, ', ');
  t = t.replace(/\\s+/g, ' ').trim();
  return t;
}

'''
        s = s.replace(anchor, block + anchor, 1)
        print('OK: preprocessForTts возвращена')
else:
    print('SKIP: preprocessForTts уже есть')

# Проверяем что synthesizeEdge использует её
if 'preprocessForTts(text, lang)' not in s:
    old = "const clean = String(text||'').replace(/[#*`>]/g,' ').replace(/\\s+/g,' ').trim();"
    new = "const clean = preprocessForTts(text, lang);"
    if old in s:
        s = s.replace(old, new, 1)
        print('OK: synthesizeEdge -> preprocessForTts')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# Обрезаем v136
idx = s2.find('/* ========== v136:')
if idx > 0:
    s2 = s2[:idx].rstrip()
    print('OK: удалён блок v136')

css_add = """

/* ========== v137: топбар + шарик + кольца ========== */

/* --- 1. ВОССТАНОВЛЕНИЕ СТИЛЕЙ ТОПБАРА --- */
.topbar-left .top-nav{
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}
.topbar-left .top-nav-btn{
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 3px !important;
  min-width: 52px !important;
  height: 54px !important;
  padding: 5px 8px !important;
  border: 1px solid transparent !important;
  border-radius: 12px !important;
  background: transparent !important;
  color: #1d607e !important;
  cursor: pointer !important;
  transition: background .2s ease, border-color .2s ease !important;
  font-family: inherit !important;
  box-sizing: border-box !important;
}
.topbar-left .top-nav-btn:hover{
  background: rgba(255,255,255,.68) !important;
  border-color: rgba(255,255,255,.86) !important;
}
.topbar-left .top-nav-btn .top-nav-svg,
.topbar-left .top-nav-btn svg{
  width: 22px !important;
  height: 22px !important;
  display: block !important;
  flex: 0 0 22px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.85 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}
.topbar-left .top-nav-btn svg *{
  fill: none !important;
  stroke: currentColor !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}
.topbar-left .top-nav-btn > span:last-child{
  font-size: 9.5px !important;
  font-weight: 700 !important;
  letter-spacing: .2px !important;
  line-height: 1 !important;
  color: inherit !important;
  white-space: nowrap !important;
}
.topbar-left .top-nav-btn .icon-moon{ display: none !important; }
body.manual-dark .topbar-left .top-nav-btn .icon-sun{ display: none !important; }
body.manual-dark .topbar-left .top-nav-btn .icon-moon{ display: block !important; }
body.manual-dark .topbar-left .top-nav-btn{ color: #dceff1 !important; }
body.manual-dark .topbar-left .top-nav-btn:hover{
  background: rgba(17,57,73,.72) !important;
  border-color: rgba(139,210,216,.32) !important;
}
@media(max-width: 900px){
  .topbar-left .top-nav-btn{
    min-width: 42px !important;
    height: 46px !important;
    padding: 4px !important;
  }
  .topbar-left .top-nav-btn svg{ width: 20px !important; height: 20px !important; }
  .topbar-left .top-nav-btn > span:last-child{ font-size: 8.5px !important; }
}
@media(max-width: 650px){
  .topbar-left .top-nav{ gap: 1px !important; }
  .topbar-left .top-nav-btn{
    min-width: 38px !important;
    height: 40px !important;
    padding: 3px !important;
    gap: 2px !important;
  }
  .topbar-left .top-nav-btn svg{ width: 17px !important; height: 17px !important; }
  .topbar-left .top-nav-btn > span:last-child{ font-size: 7.5px !important; }
}

/* --- 2. ШАРИК: обрезка blur + кольца + анимация --- */

.assistant-shell{ position: relative !important; }

.assistant-shell .voice-orb-stage{ display: none !important; }
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;
  width: auto !important; height: auto !important;
  max-width: none !important; max-height: none !important;
  transform: none !important; translate: none !important;
  margin: 0 !important; padding: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 0 !important;
  box-shadow: none !important;
  pointer-events: none !important;
  z-index: 500 !important;
  overflow: visible !important;
}

/* Отключаем псевдо stage */
.assistant-shell.voice-active .voice-orb-stage::before,
.assistant-shell.voice-active .voice-orb-stage::after{
  display: none !important;
  content: none !important;
}

/* Шарик */
.assistant-shell.voice-active .voice-orb-stage .voice-orb,
.assistant-shell.voice-active #voiceOrb,
body.voice-active #voiceOrb{
  display: block !important;
  position: relative !important;
  width: 130px !important; height: 130px !important;
  min-width: 130px !important; min-height: 130px !important;
  max-width: 130px !important; max-height: 130px !important;
  flex: 0 0 130px !important;
  border-radius: 50% !important;
  margin: 0 !important; padding: 0 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  /* Ключевое: обрезаем всё за пределами круга */
  overflow: hidden !important;
  clip-path: circle(50% at 50% 50%) !important;
  isolation: isolate !important;
  background:
    radial-gradient(circle at 30% 28%, #ffffff 0%, #e8f8ff 12%, transparent 30%),
    radial-gradient(circle at 72% 75%, #4ab8e0 0%, transparent 55%),
    radial-gradient(circle at 25% 65%, #1e7ba8 0%, transparent 55%),
    radial-gradient(circle at 75% 25%, #6dd0f0 0%, transparent 55%),
    radial-gradient(circle at 50% 50%, #186a94 0%, #0d3f5e 60%, #041e30 100%) !important;
  box-shadow:
    inset -8px -10px 26px rgba(5,45,70,.65),
    inset 6px 6px 20px rgba(255,255,255,.30) !important;
  animation: v137Float 3.4s ease-in-out infinite !important;
  transition: transform .25s ease !important;
  filter: none !important;
}

/* Вращающаяся туманность внутри шара (blur обрезается overflow+clip-path) */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
.assistant-shell.voice-active #voiceOrb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: conic-gradient(
    from 0deg,
    rgba(120,220,255,.85) 0deg,
    rgba(40,140,190,.55) 60deg,
    rgba(200,245,255,.95) 120deg,
    rgba(60,170,220,.6) 180deg,
    rgba(150,225,255,.85) 240deg,
    rgba(90,200,240,.7) 300deg,
    rgba(120,220,255,.85) 360deg
  ) !important;
  mix-blend-mode: screen !important;
  filter: blur(14px) !important;
  opacity: .95 !important;
  animation: v137Spin 6s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* Пульсирующие световые пятна внутри */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
.assistant-shell.voice-active #voiceOrb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.15) 18%, transparent 32%),
    radial-gradient(circle at 70% 65%, rgba(120,220,255,.75) 0%, transparent 42%),
    radial-gradient(circle at 40% 82%, rgba(60,170,220,.65) 0%, transparent 42%);
  pointer-events: none !important;
  z-index: 3 !important;
  animation: v137Shimmer 3s ease-in-out infinite !important;
}

/* Звёзды */
.assistant-shell.voice-active .voice-orb-stage .voice-orb span,
.assistant-shell.voice-active #voiceOrb span,
body.voice-active #voiceOrb span{
  display: block !important;
  position: absolute !important;
  width: 3px !important; height: 3px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 8px 2px rgba(255,255,255,.95) !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
.voice-orb span:nth-child(1){
  left: 28% !important; top: 22% !important;
  animation: v137Twinkle 1.5s ease-in-out infinite !important;
}
.voice-orb span:nth-child(2){
  right: 22% !important; top: 44% !important;
  width: 2px !important; height: 2px !important;
  animation: v137Twinkle 1.9s ease-in-out infinite .3s !important;
}
.voice-orb span:nth-child(3){
  left: 42% !important; bottom: 22% !important;
  width: 2.5px !important; height: 2.5px !important;
  animation: v137Twinkle 1.7s ease-in-out infinite .6s !important;
}

/* КОЛЬЦА — рисуем на stage через доп. псевдо шарика ::marker не подойдёт. Используем outline на самом шаре */
/* Вместо stage — вешаем outline-кольцо на .voice-orb через дочерний :before stage не выйдет. */
/* Решение: создадим кольцо через box-shadow c прозрачным blur, но ограничим spread */

/* Внешнее расходящееся кольцо через clip-path на самом шаре невозможно.
   Делаем кольца через отдельные элементы, но у нас только 3 span.
   Перепрофилируем — добавим ещё 2 псевдо кольца на stage через SVG-не требуется */

/* Решение: расходящееся кольцо через box-shadow-анимацию на самом шаре
   (spread идёт наружу, обрезается НЕ будет, т.к. box-shadow не режется clip-path... 
   но у нас clip-path обрежет. Значит — кольцо через outline, который тоже обрезается.
   Финальное решение: переносим clip-path на ::before/::after, а не на сам шар) */

@keyframes v137Float{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-5px) scale(1.015); }
}
@keyframes v137Spin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes v137Shimmer{
  0%, 100% { opacity: .75; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.05); }
}
@keyframes v137Twinkle{
  0%, 100% { opacity: .3; transform: scale(.7); }
  50%      { opacity: 1; transform: scale(1.9); }
}

/* UI виден */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head,
body.voice-active .assistant-shell .close-button{
  filter: none !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  background: transparent !important;
}

@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 100px !important; height: 100px !important;
    min-width: 100px !important; min-height: 100px !important;
    max-width: 100px !important; max-height: 100px !important;
    flex-basis: 100px !important;
  }
}
"""

s2 = s2.rstrip() + '\n' + css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('styles.css: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>137', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>137', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v137')
print('===== ГОТОВО =====')
