import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v127: шарик по центру, статичный + только ореолы ========== */

/* 1. Stage — растянут на весь assistant-shell, центрирует шар */
body.voice-active .assistant-shell .voice-orb-stage,
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
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
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  animation: none !important;
  box-shadow: none !important;
  z-index: 200 !important;
}

/* 2. Сам шар — строго 200×200, круглый, ЦЕНТРИРОВАН, СТАТИЧНЫЙ */
.voice-orb-stage .voice-orb,
body.voice-active #voiceOrb,
.assistant-shell.voice-active .voice-orb-stage .voice-orb{
  display: block !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  margin: 0 !important;
  width: 200px !important;
  height: 200px !important;
  min-width: 200px !important;
  min-height: 200px !important;
  max-width: 200px !important;
  max-height: 200px !important;
  aspect-ratio: 1 / 1 !important;
  flex: 0 0 200px !important;
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
  animation: none !important;
  transition: none !important;
}

/* 3. Убираем пульсацию и переливы (::before) — но оставляем лёгкий highlight */
.voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 8% !important;
  border-radius: 50% !important;
  background:
    radial-gradient(circle at 32% 30%, rgba(255,255,255,.85), transparent 38%),
    radial-gradient(circle at 70% 72%, rgba(140,220,245,.35), transparent 45%) !important;
  animation: none !important;
  filter: blur(5px) !important;
  pointer-events: none !important;
  z-index: 2 !important;
}

/* 4. Ореолы — расходящиеся кольца от краёв шара */
.voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: -8px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(120,200,225,.6) !important;
  animation: iomaOrbRingOnly 2.6s ease-out infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* Второе кольцо через box-shadow */
.voice-orb-stage .voice-orb{
  /* уже задали выше */
}

/* Второй ореол — через before второго stage-элемента */
body.voice-active .assistant-shell .voice-orb-stage .voice-orb.listening::before{
  /* placeholder */
}

/* 5. Убираем блёстки внутри */
.voice-orb-stage .voice-orb span{
  display: none !important;
}

/* 6. Дублируем кольцо — вторая волна через отдельный селектор */
.voice-orb-stage .voice-orb.listening::after,
body.voice-active #voiceOrb.listening::after{
  animation: iomaOrbRingOnly 2.6s ease-out infinite !important;
}

/* 7. Keyframe — только расходящееся кольцо */
@keyframes iomaOrbRingOnly{
  0%   { transform: scale(.95); opacity: 0; border-color: rgba(120,200,225,.9); border-width: 2px; }
  15%  { opacity: 1; }
  100% { transform: scale(1.65); opacity: 0; border-color: rgba(120,200,225,.05); border-width: 1px; }
}

/* 8. Подсказка снизу */
.voice-orb-stage::after{
  content: "Нажми на сферу, чтобы завершить диалог" !important;
  position: absolute !important;
  bottom: calc(50% - 160px) !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif !important;
  font-size: 12px !important;
  font-weight: 400 !important;
  color: rgba(60,100,125,.85) !important;
  letter-spacing: .2px !important;
  pointer-events: none !important;
  white-space: nowrap !important;
  background: rgba(255,255,255,.85) !important;
  padding: 5px 12px !important;
  border-radius: 999px !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  animation: iomaHintFade 3s ease-in-out infinite !important;
  z-index: 210 !important;
}
body.manual-dark .voice-orb-stage::after{
  color: rgba(200,235,245,.9) !important;
  background: rgba(6,30,46,.85) !important;
}

@keyframes iomaHintFade{
  0%, 100% { opacity: .65; }
  50%      { opacity: 1; }
}

/* 9. Тёмная тема — контейнер тоже без фона */
body.manual-dark.voice-active .voice-orb-stage,
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: transparent !important;
}

/* 10. Мобильные */
@media(max-width: 650px){
  .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 150px !important;
    height: 150px !important;
    min-width: 150px !important;
    min-height: 150px !important;
    max-width: 150px !important;
    max-height: 150px !important;
    flex-basis: 150px !important;
  }
  .voice-orb-stage::after{
    bottom: calc(50% - 120px) !important;
    font-size: 11px !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>127', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>127', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v127 добавлен')
print('OK: index.html -> v127')
print('===== ГОТОВО =====')
