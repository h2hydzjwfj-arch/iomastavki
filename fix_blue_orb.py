import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Убираем блок v131
idx = s.find('/* ========== v131:')
if idx > 0:
    s = s[:idx].rstrip()
    print('OK: удалён блок v131')

css_add = """

/* ========== v132: синий шарик как на сайте, по центру, компактный ========== */

/* 1. Stage — fixed центрирование относительно viewport */
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  right: auto !important;
  bottom: auto !important;
  width: 240px !important;
  height: 240px !important;
  min-height: 240px !important;
  max-height: 240px !important;
  transform: translate(-50%, -50%) !important;
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
  z-index: 500 !important;
  overflow: visible !important;
  animation: none !important;
}

/* 2. UI виден полностью */
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
  background: transparent !important;
}

/* 3. Шарик — 140px, сине-бирюзовый как сайт */
.assistant-shell.voice-active .voice-orb-stage .voice-orb,
body.voice-active #voiceOrb{
  display: block !important;
  position: relative !important;
  width: 140px !important;
  height: 140px !important;
  min-width: 140px !important;
  min-height: 140px !important;
  max-width: 140px !important;
  max-height: 140px !important;
  aspect-ratio: 1 / 1 !important;
  flex: 0 0 140px !important;
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
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.98) 0%, rgba(220,245,255,.55) 10%, transparent 26%),
    radial-gradient(circle at 70% 72%, rgba(100,190,220,.55) 0%, transparent 50%),
    radial-gradient(circle at 34% 60%, rgba(60,160,200,.6) 0%, transparent 52%),
    radial-gradient(circle at 66% 36%, rgba(140,220,245,.55) 0%, transparent 48%),
    radial-gradient(circle at 50% 50%, #1e5a80 0%, #0d3550 55%, #041b2e 100%) !important;
  box-shadow:
    0 0 30px rgba(90,190,225,.75),
    0 0 70px rgba(60,150,200,.5),
    0 0 130px rgba(75,167,207,.28),
    inset -10px -12px 32px rgba(15,60,90,.55),
    inset 8px 8px 22px rgba(255,255,255,.28) !important;
  animation: blueOrbFloat 3.6s ease-in-out infinite !important;
  transition: transform .25s ease !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb:hover,
body.voice-active #voiceOrb:hover{
  transform: scale(1.05) !important;
}

/* 4. Вращающаяся сине-бирюзовая туманность */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: conic-gradient(
    from 0deg,
    rgba(140,225,255,.7) 0deg,
    rgba(80,180,220,.6) 60deg,
    rgba(140,220,245,.7) 120deg,
    rgba(60,155,200,.6) 180deg,
    rgba(180,235,255,.7) 240deg,
    rgba(90,190,225,.7) 300deg,
    rgba(140,225,255,.7) 360deg
  ) !important;
  mix-blend-mode: screen !important;
  filter: blur(14px) !important;
  opacity: .85 !important;
  animation: blueOrbSpin 10s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 5. Блеск сверху */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.9) 0%, rgba(255,255,255,.22) 14%, transparent 32%) !important;
  pointer-events: none !important;
  z-index: 3 !important;
}

/* 6. Звёзды */
.assistant-shell.voice-active .voice-orb-stage .voice-orb span,
body.voice-active #voiceOrb span{
  display: block !important;
  position: absolute !important;
  width: 3px !important;
  height: 3px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 10px 3px rgba(255,255,255,.95), 0 0 18px rgba(180,225,255,.85) !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
.voice-orb-stage .voice-orb span:nth-child(1){
  left: 28% !important; top: 22% !important;
  animation: blueOrbTwinkle 1.6s ease-in-out infinite !important;
}
.voice-orb-stage .voice-orb span:nth-child(2){
  right: 22% !important; top: 44% !important;
  width: 2.5px !important; height: 2.5px !important;
  animation: blueOrbTwinkle 2.1s ease-in-out infinite .4s !important;
}
.voice-orb-stage .voice-orb span:nth-child(3){
  left: 42% !important; bottom: 22% !important;
  width: 2.5px !important; height: 2.5px !important;
  animation: blueOrbTwinkle 1.9s ease-in-out infinite .8s !important;
}

@keyframes blueOrbFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-5px) scale(1.012); }
}
@keyframes blueOrbSpin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes blueOrbTwinkle{
  0%, 100% { opacity: .3; transform: scale(.8); }
  50%      { opacity: 1; transform: scale(1.8); }
}

/* 7. Мобильные */
@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage{
    width: 180px !important;
    height: 180px !important;
    min-height: 180px !important;
    max-height: 180px !important;
  }
  .assistant-shell.voice-active .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 110px !important;
    height: 110px !important;
    min-width: 110px !important;
    min-height: 110px !important;
    max-width: 110px !important;
    max-height: 110px !important;
    flex-basis: 110px !important;
  }
}
"""

s = s.rstrip() + '\n' + css_add
open(p, 'w', encoding='utf-8').write(s)
print('styles.css: было ' + str(orig) + ', стало ' + str(len(s)))

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>132', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>132', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v132')
print('===== ГОТОВО =====')
