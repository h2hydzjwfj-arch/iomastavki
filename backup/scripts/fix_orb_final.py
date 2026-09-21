import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Удаляем ВСЕ старые блоки v101-v135
for v in range(101, 136):
    marker = '/* ========== v' + str(v) + ':'
    idx = s.find(marker)
    if idx >= 0:
        s = s[:idx].rstrip()
        print('OK: обрезал на ' + marker)
        break

css_add = """

/* ========== v136: ФИНАЛЬНЫЙ чистый шарик по центру ========== */

/* 1. Якорь */
.assistant-shell{ position: relative !important; }

/* 2. Stage — растянут на shell, flex-центр */
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
  animation: none !important;
}

/* 3. САМ ШАРИК — 130px, сочный, с анимацией ВНУТРИ */
.assistant-shell.voice-active .voice-orb-stage .voice-orb,
.assistant-shell.voice-active #voiceOrb,
body.voice-active #voiceOrb{
  display: block !important;
  position: relative !important;
  top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
  transform: none !important; translate: none !important;
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
  overflow: hidden !important;
  isolation: isolate !important;
  background:
    radial-gradient(circle at 30% 28%, #ffffff 0%, #e8f8ff 12%, transparent 28%),
    radial-gradient(circle at 72% 75%, #4ab8e0 0%, transparent 55%),
    radial-gradient(circle at 25% 65%, #1e7ba8 0%, transparent 55%),
    radial-gradient(circle at 75% 25%, #6dd0f0 0%, transparent 55%),
    radial-gradient(circle at 50% 50%, #186a94 0%, #0d3f5e 60%, #041e30 100%) !important;
  box-shadow:
    inset -8px -10px 26px rgba(5,45,70,.65),
    inset 6px 6px 20px rgba(255,255,255,.30),
    0 0 20px rgba(90,190,225,.4) !important;
  animation: finalOrbFloat 3.4s ease-in-out infinite !important;
  transition: transform .25s ease !important;
  filter: none !important;
}

/* 4. ВНУТРЕННЯЯ АНИМАЦИЯ — вращающаяся туманность */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
.assistant-shell.voice-active #voiceOrb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: -15% !important;
  border-radius: 50% !important;
  background: conic-gradient(
    from 0deg,
    rgba(120,220,255,.75) 0deg,
    rgba(40,140,190,.5) 70deg,
    rgba(180,240,255,.85) 140deg,
    rgba(60,170,220,.55) 210deg,
    rgba(150,225,255,.75) 280deg,
    rgba(120,220,255,.75) 360deg
  ) !important;
  mix-blend-mode: screen !important;
  filter: blur(11px) !important;
  opacity: .95 !important;
  animation: finalOrbSpin 6s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 5. Второй слой анимации — пульсирующие пятна (переливы цвета) */
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
.assistant-shell.voice-active #voiceOrb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: 50% !important;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.15) 18%, transparent 32%),
    radial-gradient(circle at 70% 65%, rgba(120,220,255,.7) 0%, transparent 40%),
    radial-gradient(circle at 40% 80%, rgba(60,170,220,.6) 0%, transparent 40%);
  pointer-events: none !important;
  z-index: 3 !important;
  animation: finalOrbShimmer 3s ease-in-out infinite !important;
}

/* 6. Звёзды внутри */
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
  animation: finalOrbTwinkle 1.5s ease-in-out infinite !important;
}
.voice-orb span:nth-child(2){
  right: 22% !important; top: 44% !important;
  width: 2px !important; height: 2px !important;
  animation: finalOrbTwinkle 1.9s ease-in-out infinite .3s !important;
}
.voice-orb span:nth-child(3){
  left: 42% !important; bottom: 22% !important;
  width: 2.5px !important; height: 2.5px !important;
  animation: finalOrbTwinkle 1.7s ease-in-out infinite .6s !important;
}

@keyframes finalOrbFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-5px) scale(1.015); }
}
@keyframes finalOrbSpin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes finalOrbShimmer{
  0%, 100% { opacity: .75; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.04); }
}
@keyframes finalOrbTwinkle{
  0%, 100% { opacity: .3; transform: scale(.7); }
  50%      { opacity: 1; transform: scale(1.9); }
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
    width: 100px !important; height: 100px !important;
    min-width: 100px !important; min-height: 100px !important;
    max-width: 100px !important; max-height: 100px !important;
    flex-basis: 100px !important;
  }
}
"""

s = s.rstrip() + '\n' + css_add
open(p, 'w', encoding='utf-8').write(s)
print('styles.css: было ' + str(orig) + ', стало ' + str(len(s)))

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>136', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>136', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v136')
print('===== ГОТОВО =====')
