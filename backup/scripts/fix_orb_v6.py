import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v128: анимированный шарик + кольца + видимый UI ========== */

/* 1. Stage — прозрачный, только для позиционирования шара */
body.voice-active .assistant-shell .voice-orb-stage,
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  transform: none !important;
  margin: 0 !important;
  padding: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  pointer-events: none !important;
  z-index: 200 !important;
}

/* 2. НЕ затемняем чат и композ — оставляем всё видимым */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head{
  filter: none !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* 3. Сам шарик — анимированный, переливающийся */
.voice-orb-stage .voice-orb,
body.voice-active #voiceOrb,
.assistant-shell.voice-active .voice-orb-stage .voice-orb{
  display: block !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  margin: 0 !important;
  width: 180px !important;
  height: 180px !important;
  min-width: 180px !important;
  min-height: 180px !important;
  max-width: 180px !important;
  max-height: 180px !important;
  aspect-ratio: 1 / 1 !important;
  flex: 0 0 180px !important;
  border-radius: 50% !important;
  box-sizing: border-box !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  background: radial-gradient(
    circle at 35% 28%,
    #ffffff 0%,
    #e0f6ff 12%,
    #a5e4f5 28%,
    #6bc0dc 45%,
    #3d95b8 62%,
    #1f6d94 80%,
    rgba(31,109,148,.15) 100%
  ) !important;
  box-shadow:
    0 0 40px rgba(90,200,235,.55),
    0 0 100px rgba(75,167,207,.35),
    0 0 180px rgba(75,167,207,.18),
    inset 14px 14px 28px rgba(255,255,255,.9),
    inset -14px -16px 28px rgba(18,95,133,.4) !important;
  animation:
    iomaOrbFloat 3.4s ease-in-out infinite,
    iomaOrbGlow 2.6s ease-in-out infinite,
    iomaOrbHue 6s linear infinite !important;
}

/* 4. Переливы света внутри шара — вращаются */
.voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 6% !important;
  border-radius: 50% !important;
  background:
    conic-gradient(
      from 0deg,
      rgba(255,255,255,.9) 0deg,
      rgba(160,230,255,.6) 90deg,
      rgba(100,180,220,.4) 180deg,
      rgba(180,240,255,.7) 270deg,
      rgba(255,255,255,.9) 360deg
    ) !important;
  mix-blend-mode: screen !important;
  filter: blur(14px) !important;
  animation: iomaOrbRotate 5s linear infinite !important;
  pointer-events: none !important;
  z-index: 2 !important;
}

/* 5. Кольца — расходящиеся от краёв, цветные */
.voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: -6px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(120,200,225,.7) !important;
  animation: iomaOrbRingColor 2.8s ease-out infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 6. Второе и третье кольцо — через box-shadow элемента (стакаются) */
.voice-orb-stage .voice-orb{
  --ring1: 0px;
}

/* 7. Блёстки внутри — вернуть и оживить */
.voice-orb-stage .voice-orb span{
  display: block !important;
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 14px 4px rgba(255,255,255,.95), 0 0 26px rgba(140,220,255,.8) !important;
  position: absolute !important;
  pointer-events: none !important;
  z-index: 3 !important;
}
.voice-orb-stage .voice-orb span:nth-child(1){
  left: 24% !important; top: 26% !important;
  animation: iomaSparkBig 1.8s ease-in-out infinite !important;
}
.voice-orb-stage .voice-orb span:nth-child(2){
  right: 20% !important; top: 46% !important;
  animation: iomaSparkBig 2.1s ease-in-out infinite .5s !important;
}
.voice-orb-stage .voice-orb span:nth-child(3){
  left: 46% !important; bottom: 22% !important;
  animation: iomaSparkBig 1.9s ease-in-out infinite 1s !important;
}

/* 8. Дополнительное пульсирующее свечение через псевдо на stage */
.voice-orb-stage::before{
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 260px !important;
  height: 260px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle, rgba(120,210,240,.28) 0%, rgba(90,180,215,.12) 45%, transparent 70%) !important;
  animation: iomaOuterGlow 2.8s ease-in-out infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 9. Второе кольцо (через ещё один псевдо) */
.voice-orb-stage::after{
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  width: 180px !important;
  height: 180px !important;
  border-radius: 50% !important;
  border: 1.5px solid rgba(140,220,245,.55) !important;
  transform: translate(-50%, -50%) !important;
  animation: iomaOrbRingColor2 3.6s ease-out infinite .9s !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 10. Подсказка внизу */
.voice-orb-stage .voice-orb{
  /* для ясности */
}
body.voice-active .assistant-shell .voice-orb-stage::before,
body.voice-active .assistant-shell .voice-orb-stage::after{
  /* псевдо выше */
}

/* Скрываем старую подсказку из v127, если она ещё есть */
.assistant-shell.voice-active .voice-orb-stage .voice-orb-hint,
.voice-orb-hint{ display: none !important; }

/* 11. Keyframes */
@keyframes iomaOrbFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-7px) scale(1.015); }
}
@keyframes iomaOrbGlow{
  0%, 100% {
    box-shadow:
      0 0 40px rgba(90,200,235,.55),
      0 0 100px rgba(75,167,207,.35),
      0 0 180px rgba(75,167,207,.18),
      inset 14px 14px 28px rgba(255,255,255,.9),
      inset -14px -16px 28px rgba(18,95,133,.4);
  }
  50% {
    box-shadow:
      0 0 65px rgba(140,230,255,.8),
      0 0 150px rgba(90,190,235,.55),
      0 0 260px rgba(75,167,207,.32),
      inset 14px 14px 28px rgba(255,255,255,.95),
      inset -14px -16px 28px rgba(18,95,133,.45);
  }
}
@keyframes iomaOrbHue{
  0%   { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
@keyframes iomaOrbRotate{
  0%   { transform: rotate(0deg) scale(1); }
  50%  { transform: rotate(180deg) scale(1.08); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes iomaOrbRingColor{
  0%   { transform: scale(.95); opacity: 0; border-color: rgba(120,220,255,.9); border-width: 3px; }
  20%  { opacity: 1; }
  100% { transform: scale(1.7); opacity: 0; border-color: rgba(255,180,220,.1); border-width: 1px; }
}
@keyframes iomaOrbRingColor2{
  0%   { width: 180px; height: 180px; opacity: 0; border-color: rgba(160,230,255,.7); }
  20%  { opacity: 1; }
  100% { width: 340px; height: 340px; opacity: 0; border-color: rgba(180,220,255,.05); }
}
@keyframes iomaOuterGlow{
  0%, 100% { opacity: .55; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
}
@keyframes iomaSparkBig{
  0%, 100% { opacity: .35; transform: scale(.7); }
  50%      { opacity: 1; transform: scale(1.7); }
}

/* 12. Тёмная тема — без фона */
body.manual-dark.voice-active .voice-orb-stage,
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: transparent !important;
}

/* 13. Мобильные */
@media(max-width: 650px){
  .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 140px !important;
    height: 140px !important;
    min-width: 140px !important;
    min-height: 140px !important;
    max-width: 140px !important;
    max-height: 140px !important;
    flex-basis: 140px !important;
  }
  .voice-orb-stage::before{
    width: 220px !important;
    height: 220px !important;
  }
  .voice-orb-stage::after{
    width: 140px !important;
    height: 140px !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>128', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>128', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v128 добавлен')
print('OK: index.html -> v128')
print('===== ГОТОВО =====')
