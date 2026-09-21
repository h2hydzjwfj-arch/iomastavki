import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Клик по орбу — ручное завершение
if 'window.__iomaOrbClickWired' not in s:
    anchor = "function forceOrbDisplay(on){"
    if anchor in s:
        block = '''// Клик по орбу — ручное завершение диалога
(function(){
  if (window.__iomaOrbClickWired) return;
  window.__iomaOrbClickWired = true;
  var orb = document.getElementById('voiceOrb');
  if (!orb) return;
  orb.style.cursor = 'pointer';
  orb.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    console.warn('[IOMA-ORB] click — manual stop');
    if (window.__iomaStopVoice) {
      try { window.__iomaStopVoice(); } catch(err){}
    }
  });
})();

'''
        s = s.replace(anchor, block + anchor, 1)
        print('OK: обработчик клика на орбе добавлен')
    else:
        print('WARN: forceOrbDisplay anchor не найден')
else:
    print('SKIP: клик по орбу уже есть')

# 2. Глобальная функция стоп-войса
old_start = "recognition.lang=voiceLang();try{recognition.start();try{forceOrbDisplay(true)}catch(e){}}catch{setVoiceUI(false,tr('fail'))}"
new_start = "recognition.lang=voiceLang();window.__iomaStopVoice=function(){try{recognition.stop()}catch(err){}};try{recognition.start();try{forceOrbDisplay(true)}catch(e){}}catch{setVoiceUI(false,tr('fail'))}"
if 'window.__iomaStopVoice=function(){try{recognition.stop()' in s:
    print('SKIP: __iomaStopVoice уже есть')
elif old_start in s:
    s = s.replace(old_start, new_start, 1)
    print('OK: __iomaStopVoice зарегистрирован')
else:
    print('WARN: voice btn.onclick anchor не найден')

# 3. Fallback для MediaRecorder
old_mr = "mediaRecorder=new MediaRecorder(stream); voiceListening=true; setVoiceUI(true,tr('listen'));"
new_mr = "mediaRecorder=new MediaRecorder(stream); voiceListening=true; setVoiceUI(true,tr('listen'));window.__iomaStopVoice=function(){try{mediaRecorder.stop()}catch(err){}};"
if 'window.__iomaStopVoice=function(){try{mediaRecorder.stop()' in s:
    print('SKIP: mediaRecorder stop уже есть')
elif old_mr in s:
    s = s.replace(old_mr, new_mr, 1)
    print('OK: mediaRecorder stop добавлен')
else:
    print('WARN: mediaRecorder anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== v125: сфера с переливами + клик ========== */

.voice-orb-stage .voice-orb,
body.voice-active #voiceOrb{
  width: 200px !important;
  height: 200px !important;
  flex: 0 0 200px !important;
  border-radius: 50% !important;
  position: relative !important;
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
  animation: iomaOrbFloat 3.2s ease-in-out infinite !important;
  transition: transform .2s ease !important;
}
.voice-orb-stage .voice-orb:hover,
body.voice-active #voiceOrb:hover{
  transform: scale(1.04) !important;
}

.voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 8% !important;
  border-radius: 50% !important;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.85), transparent 32%),
    radial-gradient(circle at 70% 65%, rgba(140,230,255,.55), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(70,160,200,.35), transparent 50%) !important;
  animation: iomaOrbShimmer 4.5s ease-in-out infinite !important;
  pointer-events: none !important;
  filter: blur(4px) !important;
  z-index: 2 !important;
}

.voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: -12px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(120,200,225,.55) !important;
  animation: iomaOrbRing 2.4s ease-out infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.voice-orb-stage .voice-orb span{
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 16px 5px rgba(255,255,255,.95), 0 0 30px rgba(140,220,255,.8) !important;
  position: absolute !important;
  pointer-events: none !important;
  z-index: 3 !important;
}
.voice-orb-stage .voice-orb span:nth-child(1){
  left: 26% !important; top: 28% !important;
  animation: iomaSparkBig 1.6s ease-in-out infinite !important;
}
.voice-orb-stage .voice-orb span:nth-child(2){
  right: 22% !important; top: 45% !important;
  animation: iomaSparkBig 1.9s ease-in-out infinite .4s !important;
}
.voice-orb-stage .voice-orb span:nth-child(3){
  left: 48% !important; bottom: 22% !important;
  animation: iomaSparkBig 1.7s ease-in-out infinite .8s !important;
}

.voice-orb-stage .voice-orb.listening,
body.voice-active #voiceOrb.listening{
  animation:
    iomaOrbFloat 3.2s ease-in-out infinite,
    iomaOrbGlow 2.2s ease-in-out infinite !important;
}

@keyframes iomaOrbFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-8px) scale(1.02); }
}
@keyframes iomaOrbShimmer{
  0%, 100% {
    transform: rotate(0deg) scale(1);
    opacity: .85;
    filter: blur(4px) hue-rotate(0deg);
  }
  50% {
    transform: rotate(180deg) scale(1.08);
    opacity: 1;
    filter: blur(6px) hue-rotate(20deg);
  }
}
@keyframes iomaOrbRing{
  0%   { transform: scale(.7); opacity: 0; border-color: rgba(120,200,225,.7); }
  30%  { opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; border-color: rgba(120,200,225,.15); }
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
      0 0 60px rgba(120,225,255,.75),
      0 0 140px rgba(90,190,235,.5),
      0 0 240px rgba(75,167,207,.28),
      inset 14px 14px 28px rgba(255,255,255,.95),
      inset -14px -16px 28px rgba(18,95,133,.45);
  }
}
@keyframes iomaSparkBig{
  0%, 100% { opacity: .35; transform: scale(.75); }
  50%      { opacity: 1; transform: scale(1.6); }
}

.voice-orb-stage::after{
  content: "Нажми на сферу, чтобы завершить диалог";
  position: absolute !important;
  bottom: 30% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  color: rgba(60,100,125,.75) !important;
  letter-spacing: .2px !important;
  pointer-events: none !important;
  white-space: nowrap !important;
  animation: iomaHintFade 3s ease-in-out infinite !important;
}
@keyframes iomaHintFade{
  0%, 100% { opacity: .55; }
  50%      { opacity: 1; }
}
body.manual-dark .voice-orb-stage::after{
  color: rgba(180,220,235,.7) !important;
}

body.manual-dark.voice-active .voice-orb-stage,
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: radial-gradient(circle at 50% 50%, rgba(10,45,65,.94), rgba(4,22,36,.98)) !important;
}

@media(max-width: 650px){
  .voice-orb-stage .voice-orb,
  body.voice-active #voiceOrb{
    width: 150px !important;
    height: 150px !important;
    flex: 0 0 150px !important;
  }
  .voice-orb-stage::after{
    bottom: 25% !important;
    font-size: 11px !important;
  }
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v125 добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>125', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>125', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v125')
print('===== ГОТОВО =====')
