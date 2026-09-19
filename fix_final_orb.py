import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Удаляем ВСЕ мои блоки с v124 по конец (там где наворочено)
for marker in ['/* ========== v124:', '/* ========== v125:', '/* ========== v126:', '/* ========== v127:', '/* ========== v128:', '/* ========== v129:']:
    idx = s.find(marker)
    if idx > 0:
        s = s[:idx].rstrip()
        print('OK: удалён блок начиная с ' + marker)
        break

css_add = """

/* ========== v130: КОСМИЧЕСКИЙ шарик, UI полностью виден ========== */

/* 1. Stage — прозрачный оверлей по центру окна, НЕ трогает UI */
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
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
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 250 !important;
  overflow: visible !important;
  animation: none !important;
}

/* 2. UI полностью видно — ничего не размываем */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head,
body.voice-active .assistant-shell .close-button{
  filter: none !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* 3. Сам шарик — космический, 180×180, круглый */
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
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.98) 0%, rgba(230,240,255,.6) 8%, transparent 22%),
    radial-gradient(circle at 72% 72%, rgba(255,140,230,.55) 0%, transparent 48%),
    radial-gradient(circle at 36% 60%, rgba(130,90,255,.65) 0%, transparent 52%),
    radial-gradient(circle at 64% 38%, rgba(80,180,255,.55) 0%, transparent 48%),
    radial-gradient(circle at 50% 50%, #2a1a5e 0%, #150a3a 55%, #05010f 100%) !important;
  box-shadow:
    0 0 60px rgba(140,80,255,.75),
    0 0 140px rgba(80,180,255,.5),
    0 0 240px rgba(140,80,255,.28),
    inset -12px -14px 40px rgba(80,40,180,.55),
    inset 10px 10px 26px rgba(255,255,255,.22) !important;
  animation: cosmoFloat 3.6s ease-in-out infinite !important;
  transition: transform .25s ease !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb:hover,
body.voice-active #voiceOrb:hover{
  transform: scale(1.04) !important;
}

/* 4. Вращающаяся туманность внутри */
.voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: -10% !important;
  border-radius: 50% !important;
  background: conic-gradient(
    from 0deg,
    rgba(255,140,230,.65) 0deg,
    rgba(140,90,255,.55) 60deg,
    rgba(80,180,255,.65) 120deg,
    rgba(200,120,255,.55) 180deg,
    rgba(120,220,255,.65) 240deg,
    rgba(255,140,230,.65) 300deg,
    rgba(255,140,230,.65) 360deg
  ) !important;
  mix-blend-mode: screen !important;
  filter: blur(16px) !important;
  opacity: .9 !important;
  animation: cosmoSpin 9s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 5. Блеск скользящий по шару */
.voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 6% !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.28) 14%, transparent 32%) !important;
  pointer-events: none !important;
  z-index: 3 !important;
  animation: cosmoSheen 4.5s ease-in-out infinite !important;
}

/* 6. Три мерцающие звезды внутри */
.voice-orb-stage .voice-orb span{
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

/* 7. Ореолы: свечение снаружи + расходящееся кольцо */
.assistant-shell.voice-active .voice-orb-stage::before{
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  width: 380px !important;
  height: 380px !important;
  border-radius: 50% !important;
  transform: translate(-50%, -50%) !important;
  background: radial-gradient(
    circle,
    rgba(140,90,255,.28) 0%,
    rgba(90,180,255,.16) 32%,
    rgba(255,120,220,.08) 58%,
    transparent 78%
  ) !important;
  filter: blur(14px) !important;
  animation: cosmoPulse 3.2s ease-in-out infinite !important;
  pointer-events: none !important;
  z-index: 0 !important;
}

.assistant-shell.voice-active .voice-orb-stage::after{
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  width: 180px !important;
  height: 180px !important;
  border-radius: 50% !important;
  border: 1.5px solid rgba(180,140,255,.7) !important;
  transform: translate(-50%, -50%) !important;
  animation: cosmoRing 3.4s ease-out infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
  box-shadow: 0 0 30px rgba(140,90,255,.35) inset !important;
}

/* 8. Keyframes */
@keyframes cosmoFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-6px) scale(1.012); }
}
@keyframes cosmoSpin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes cosmoSheen{
  0%, 100% { transform: rotate(0deg); opacity: .55; }
  50%      { transform: rotate(180deg); opacity: .95; }
}
@keyframes cosmoTwinkle{
  0%, 100% { opacity: .3; transform: scale(.8); }
  50%      { opacity: 1; transform: scale(1.8); }
}
@keyframes cosmoPulse{
  0%, 100% { opacity: .55; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 1; transform: translate(-50%, -50%) scale(1.16); }
}
@keyframes cosmoRing{
  0%   { width: 180px; height: 180px; opacity: 0; border-color: rgba(180,140,255,.85); border-width: 2px; }
  20%  { opacity: 1; }
  100% { width: 400px; height: 400px; opacity: 0; border-color: rgba(180,220,255,.05); border-width: 1px; }
}

/* 9. Мобильные */
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
  .assistant-shell.voice-active .voice-orb-stage::before{
    width: 300px !important;
    height: 300px !important;
  }
}
"""

s = s.rstrip() + '\n' + css_add
open(p, 'w', encoding='utf-8').write(s)
print('styles.css: было ' + str(orig) + ', стало ' + str(len(s)))

# index.html -> v130
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>130', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>130', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v130')
print('===== ГОТОВО =====')
