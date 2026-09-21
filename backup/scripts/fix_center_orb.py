import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Убираем блок v134
idx = s.find('/* ========== v134:')
if idx > 0:
    s = s[:idx].rstrip()
    print('OK: удалён блок v134')

css_add = """

/* ========== v135: финальное центрирование через inset:0 + flex ========== */

/* 1. Сам shell — относительный якорь */
.assistant-shell{
  position: relative !important;
}

/* 2. Stage — растянут на ВЕСЬ shell, flex центрирует шар внутри */
.assistant-shell .voice-orb-stage{
  display: none !important;
}
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  transform: none !important;
  translate: none !important;
  margin: 0 !important;
  padding: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  outline: 0 !important;
  pointer-events: none !important;
  z-index: 500 !important;
  overflow: visible !important;
  animation: none !important;
  opacity: 1 !important;
  filter: none !important;
}
.assistant-shell.voice-active .voice-orb-stage::before,
.assistant-shell.voice-active .voice-orb-stage::after{
  display: none !important;
  content: none !important;
  background: none !important;
  border: 0 !important;
}

/* 3. Шар 100×100, без внешнего свечения */
.assistant-shell.voice-active .voice-orb-stage .voice-orb,
.assistant-shell.voice-active #voiceOrb,
body.voice-active #voiceOrb{
  display: block !important;
  position: static !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  translate: none !important;
  width: 100px !important;
  height: 100px !important;
  min-width: 100px !important;
  min-height: 100px !important;
  max-width: 100px !important;
  max-height: 100px !important;
  flex: 0 0 100px !important;
  border-radius: 50% !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  overflow: hidden !important;
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.98) 0%, rgba(220,245,255,.5) 10%, transparent 26%),
    radial-gradient(circle at 70% 72%, rgba(100,190,220,.5) 0%, transparent 50%),
    radial-gradient(circle at 34% 60%, rgba(60,160,200,.55) 0%, transparent 52%),
    radial-gradient(circle at 66% 36%, rgba(140,220,245,.5) 0%, transparent 48%),
    radial-gradient(circle at 50% 50%, #1e5a80 0%, #0d3550 55%, #041b2e 100%) !important;
  box-shadow:
    inset -7px -9px 20px rgba(15,60,90,.55),
    inset 5px 5px 16px rgba(255,255,255,.28) !important;
  animation: finalOrbFloat 3.6s ease-in-out infinite !important;
  transition: transform .25s ease !important;
  filter: none !important;
}

/* 4. Туманность вращается */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
.assistant-shell.voice-active #voiceOrb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: conic-gradient(
    from 0deg,
    rgba(140,225,255,.65) 0deg,
    rgba(80,180,220,.55) 60deg,
    rgba(140,220,245,.65) 120deg,
    rgba(60,155,200,.55) 180deg,
    rgba(180,235,255,.65) 240deg,
    rgba(90,190,225,.65) 300deg,
    rgba(140,225,255,.65) 360deg
  ) !important;
  mix-blend-mode: screen !important;
  filter: blur(9px) !important;
  opacity: .85 !important;
  animation: finalOrbSpin 10s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 5. Блик */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
.assistant-shell.voice-active #voiceOrb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.9) 0%, rgba(255,255,255,.2) 14%, transparent 32%) !important;
  pointer-events: none !important;
  z-index: 3 !important;
}

/* 6. Звёзды */
.assistant-shell.voice-active .voice-orb-stage .voice-orb span,
.assistant-shell.voice-active #voiceOrb span,
body.voice-active #voiceOrb span{
  display: block !important;
  position: absolute !important;
  width: 3px !important;
  height: 3px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 7px 2px rgba(255,255,255,.9) !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
.voice-orb span:nth-child(1){
  left: 28% !important; top: 22% !important;
  animation: finalOrbTwinkle 1.6s ease-in-out infinite !important;
}
.voice-orb span:nth-child(2){
  right: 22% !important; top: 44% !important;
  width: 2px !important; height: 2px !important;
  animation: finalOrbTwinkle 2.1s ease-in-out infinite .4s !important;
}
.voice-orb span:nth-child(3){
  left: 42% !important; bottom: 22% !important;
  width: 2px !important; height: 2px !important;
  animation: finalOrbTwinkle 1.9s ease-in-out infinite .8s !important;
}

@keyframes finalOrbFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-4px) scale(1.012); }
}
@keyframes finalOrbSpin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes finalOrbTwinkle{
  0%, 100% { opacity: .3; transform: scale(.8); }
  50%      { opacity: 1; transform: scale(1.7); }
}

/* 7. UI виден */
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

/* 8. Мобильные */
@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 85px !important;
    height: 85px !important;
    min-width: 85px !important;
    min-height: 85px !important;
    max-width: 85px !important;
    max-height: 85px !important;
    flex-basis: 85px !important;
  }
}
"""

s = s.rstrip() + '\n' + css_add
open(p, 'w', encoding='utf-8').write(s)
print('styles.css: было ' + str(orig) + ', стало ' + str(len(s)))

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>135', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>135', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v135')
print('===== ГОТОВО =====')
