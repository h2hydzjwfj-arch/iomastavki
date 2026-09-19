import re

# ==================== APP.JS: чистим инлайн-стили ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Найти forceOrbDisplay и заменить целиком
start = s.find('function forceOrbDisplay(on){')
if start < 0:
    print('WARN: forceOrbDisplay не найден')
else:
    # Найти конец функции — ищем закрывающую } на первом уровне
    depth = 0
    i = s.find('{', start)
    end = i
    while i < len(s):
        if s[i] == '{': depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    new_fn = '''function forceOrbDisplay(on){
  const shell = document.querySelector('.assistant-shell');
  const orb = document.querySelector('#voiceOrb');
  if (shell) shell.classList.toggle('voice-active', !!on);
  document.body.classList.toggle('voice-active', !!on);
  if (on){
    if (orb) orb.classList.add('listening');
  } else {
    if (orb) orb.classList.remove('listening');
  }
}'''
    s = s[:start] + new_fn + s[end:]
    print('OK: forceOrbDisplay переписан (без inline-стилей)')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS: чистая версия ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# Удаляем все блоки v124-v130
for marker in ['/* ========== v124:', '/* ========== v125:', '/* ========== v126:', '/* ========== v127:', '/* ========== v128:', '/* ========== v129:', '/* ========== v130:']:
    idx = s2.find(marker)
    if idx > 0:
        s2 = s2[:idx].rstrip()
        print('OK: обрезал с ' + marker)
        break

css_add = """

/* ========== v131: чистый космический шарик ========== */

/* 1. Stage — прозрачный оверлей, центрирует шар, НЕ трогает UI */
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: auto !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  transform: none !important;
  margin: 0 !important;
  padding: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  pointer-events: none !important;
  z-index: 250 !important;
  overflow: visible !important;
  animation: none !important;
  opacity: 1 !important;
}

/* 2. UI ПОЛНОСТЬЮ виден — никаких размытий и прозрачностей */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head,
body.voice-active .assistant-shell .close-button,
.assistant-shell.voice-active .chat-messages,
.assistant-shell.voice-active .chat-compose,
.assistant-shell.voice-active .voice-state,
.assistant-shell.voice-active .assistant-head,
.assistant-shell.voice-active .close-button{
  filter: none !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  display: revert !important;
  background: transparent !important;
}

/* 3. Шарик — космический */
.assistant-shell.voice-active .voice-orb-stage .voice-orb,
body.voice-active #voiceOrb{
  display: block !important;
  position: relative !important;
  width: 180px !important;
  height: 180px !important;
  min-width: 180px !important;
  min-height: 180px !important;
  max-width: 180px !important;
  max-height: 180px !important;
  aspect-ratio: 1 / 1 !important;
  flex: 0 0 180px !important;
  border-radius: 50% !important;
  transform: none !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  overflow: hidden !important;
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.95) 0%, rgba(230,240,255,.5) 8%, transparent 22%),
    radial-gradient(circle at 70% 70%, rgba(255,140,230,.6) 0%, transparent 50%),
    radial-gradient(circle at 36% 60%, rgba(130,90,255,.7) 0%, transparent 55%),
    radial-gradient(circle at 64% 38%, rgba(80,180,255,.6) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, #2a1a5e 0%, #150a3a 55%, #05010f 100%) !important;
  box-shadow:
    0 0 40px rgba(140,80,255,.85),
    0 0 90px rgba(90,180,255,.55),
    0 0 160px rgba(140,80,255,.35),
    inset -12px -14px 40px rgba(80,40,180,.6),
    inset 10px 10px 26px rgba(255,255,255,.25) !important;
  animation: cosmoFloat 3.6s ease-in-out infinite !important;
  transition: transform .25s ease !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb:hover,
body.voice-active #voiceOrb:hover{
  transform: scale(1.05) !important;
}

/* 4. Вращающаяся туманность внутри шара */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: conic-gradient(
    from 0deg,
    rgba(255,140,230,.7) 0deg,
    rgba(140,90,255,.6) 60deg,
    rgba(80,180,255,.7) 120deg,
    rgba(200,120,255,.6) 180deg,
    rgba(120,220,255,.7) 240deg,
    rgba(255,140,230,.7) 300deg,
    rgba(255,140,230,.7) 360deg
  ) !important;
  mix-blend-mode: screen !important;
  filter: blur(18px) !important;
  opacity: .85 !important;
  animation: cosmoSpin 10s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 5. Блеск */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.85) 0%, rgba(255,255,255,.2) 14%, transparent 32%) !important;
  pointer-events: none !important;
  z-index: 3 !important;
}

/* 6. Звёзды внутри */
.assistant-shell.voice-active .voice-orb-stage .voice-orb span,
body.voice-active #voiceOrb span{
  display: block !important;
  position: absolute !important;
  width: 4px !important;
  height: 4px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 12px 3px rgba(255,255,255,.95), 0 0 22px rgba(200,220,255,.85) !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
.voice-orb-stage .voice-orb span:nth-child(1){
  left: 28% !important; top: 22% !important;
  animation: cosmoTwinkle 1.6s ease-in-out infinite !important;
}
.voice-orb-stage .voice-orb span:nth-child(2){
  right: 22% !important; top: 44% !important;
  width: 3px !important; height: 3px !important;
  animation: cosmoTwinkle 2.1s ease-in-out infinite .4s !important;
}
.voice-orb-stage .voice-orb span:nth-child(3){
  left: 42% !important; bottom: 22% !important;
  width: 3px !important; height: 3px !important;
  animation: cosmoTwinkle 1.9s ease-in-out infinite .8s !important;
}

/* 7. Keyframes */
@keyframes cosmoFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-6px) scale(1.012); }
}
@keyframes cosmoSpin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes cosmoTwinkle{
  0%, 100% { opacity: .3; transform: scale(.8); }
  50%      { opacity: 1; transform: scale(1.8); }
}

/* 8. Мобильные */
@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 130px !important;
    height: 130px !important;
    min-width: 130px !important;
    min-height: 130px !important;
    max-width: 130px !important;
    max-height: 130px !important;
    flex-basis: 130px !important;
  }
}
"""

s2 = s2.rstrip() + '\n' + css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('styles.css: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>131', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>131', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v131')
print('===== ГОТОВО =====')
