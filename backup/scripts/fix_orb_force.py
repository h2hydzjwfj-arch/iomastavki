import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Функция управления орбом — напрямую через style
if 'function forceOrbDisplay' not in s:
    anchor = "function setVoiceUI(on,text){"
    if anchor in s:
        block = '''function forceOrbDisplay(on){
  const shell = document.querySelector('.assistant-shell');
  const stage = document.querySelector('.voice-orb-stage');
  const orb = document.querySelector('#voiceOrb');
  console.warn('[IOMA-ORB] forceOrbDisplay:', on, '| shell:', !!shell, '| stage:', !!stage, '| orb:', !!orb);
  if (shell) shell.classList.toggle('voice-active', !!on);
  document.body.classList.toggle('voice-active', !!on);
  if (on){
    if (stage){
      stage.style.setProperty('display', 'flex', 'important');
      stage.style.setProperty('position', 'absolute', 'important');
      stage.style.setProperty('inset', '0', 'important');
      stage.style.setProperty('width', '100%', 'important');
      stage.style.setProperty('height', '100%', 'important');
      stage.style.setProperty('align-items', 'center', 'important');
      stage.style.setProperty('justify-content', 'center', 'important');
      stage.style.setProperty('z-index', '2000', 'important');
      stage.style.setProperty('background', 'rgba(248,252,255,.94)', 'important');
      stage.style.setProperty('backdrop-filter', 'blur(18px)', 'important');
      stage.style.setProperty('-webkit-backdrop-filter', 'blur(18px)', 'important');
      stage.style.setProperty('border-radius', 'inherit', 'important');
    }
    if (orb){
      orb.style.setProperty('display', 'grid', 'important');
      orb.style.setProperty('position', 'relative', 'important');
      orb.style.setProperty('left', 'auto', 'important');
      orb.style.setProperty('top', 'auto', 'important');
      orb.style.setProperty('transform', 'none', 'important');
      orb.style.setProperty('width', '180px', 'important');
      orb.style.setProperty('height', '180px', 'important');
      orb.style.setProperty('margin', '0', 'important');
      orb.classList.add('listening');
    }
  } else {
    if (stage) stage.style.removeProperty('display');
    if (orb) orb.classList.remove('listening');
  }
}

'''
        s = s.replace(anchor, block + anchor, 1)
        print('OK: forceOrbDisplay добавлена')
else:
    print('SKIP: forceOrbDisplay уже есть')

# 2. В setVoiceUI — вызвать forceOrbDisplay
old_set = "function setVoiceUI(on,text){$('#voiceButton')?.classList.toggle('listening',on);$('#voiceOrb')?.classList.toggle('listening',on);$('#assistantView')?.classList.toggle('voice-active',on);document.querySelector('.assistant-shell')?.classList.toggle('voice-active',on);if($('#voiceState'))$('#voiceState').textContent=text||tr(on?'listen':'ready')}"
new_set = "function setVoiceUI(on,text){$('#voiceButton')?.classList.toggle('listening',on);$('#voiceOrb')?.classList.toggle('listening',on);$('#assistantView')?.classList.toggle('voice-active',on);try{forceOrbDisplay(on)}catch(e){console.warn('forceOrb:',e.message)};if($('#voiceState'))$('#voiceState').textContent=text||tr(on?'listen':'ready')}"
if 'forceOrbDisplay(on)}catch' in s:
    print('SKIP: setVoiceUI уже вызывает forceOrbDisplay')
elif old_set in s:
    s = s.replace(old_set, new_set, 1)
    print('OK: setVoiceUI → forceOrbDisplay')
else:
    print('WARN: setVoiceUI anchor не найден')

# 3. В btn.onclick при старте — вызвать forceOrbDisplay(true)
old_start = "recognition.lang=voiceLang();try{recognition.start();document.querySelector('.assistant-shell')?.classList.add('voice-active');document.body.classList.add('voice-active')}catch{setVoiceUI(false,tr('fail'))}"
new_start = "recognition.lang=voiceLang();try{recognition.start();try{forceOrbDisplay(true)}catch(e){}}catch{setVoiceUI(false,tr('fail'))}"
if 'recognition.start();try{forceOrbDisplay(true)}catch' in s:
    print('SKIP: btn.onclick уже вызывает forceOrbDisplay')
elif old_start in s:
    s = s.replace(old_start, new_start, 1)
    print('OK: btn.onclick → forceOrbDisplay(true)')
else:
    print('WARN: btn.onclick anchor не найден')

# 4. При завершении — forceOrbDisplay(false)
old_end = "recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));document.querySelector('.assistant-shell')?.classList.remove('voice-active');document.body.classList.remove('voice-active');"
new_end = "recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));try{forceOrbDisplay(false)}catch(e){};"
if 'setVoiceUI(false,tr(\'ready\'));try{forceOrbDisplay(false)' in s:
    print('SKIP: recognition.onend уже вызывает forceOrbDisplay')
elif old_end in s:
    s = s.replace(old_end, new_end, 1)
    print('OK: recognition.onend → forceOrbDisplay(false)')
else:
    print('WARN: recognition.onend anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== v124: жёсткое отображение орба + анимации ========== */

/* 1. Скрываем чат и композ когда орб активен */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head{
  filter: blur(2px);
  opacity: .18;
  pointer-events: none !important;
  transition: opacity .25s ease, filter .25s ease;
}

/* 2. Орб — большая сфера с кольцами */
.voice-orb-stage .voice-orb{
  background: radial-gradient(circle at 35% 28%, #ffffff 0%, #dff8ff 14%, #9be2f5 30%, #55b9dc 52%, #237ca8 74%, rgba(35,124,168,.06) 80%) !important;
  box-shadow:
    0 0 30px rgba(80,190,225,.45),
    0 0 80px rgba(75,167,207,.28),
    inset 10px 10px 22px rgba(255,255,255,.85),
    inset -10px -12px 22px rgba(18,95,133,.32) !important;
  border-radius: 50% !important;
  position: relative !important;
}
.voice-orb-stage .voice-orb::before,
.voice-orb-stage .voice-orb::after{
  content: "" !important;
  position: absolute !important;
  inset: -28px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(120,200,225,.55) !important;
  animation: iomaOrbRing 1.8s ease-out infinite !important;
  pointer-events: none !important;
}
.voice-orb-stage .voice-orb::after{
  animation-delay: .6s !important;
  border-color: rgba(120,200,225,.32) !important;
}
@keyframes iomaOrbRing{
  0%   { transform: scale(.72); opacity: 0; }
  30%  { opacity: .95; }
  100% { transform: scale(1.6); opacity: 0; }
}
.voice-orb-stage .voice-orb.listening{
  animation: iomaOrbPulse 1.5s ease-in-out infinite !important;
}
@keyframes iomaOrbPulse{
  0%, 100% { transform: scale(.97) rotate(0deg); filter: hue-rotate(0deg); }
  50%      { transform: scale(1.07) rotate(4deg); filter: hue-rotate(16deg); }
}
.voice-orb-stage .voice-orb span{
  width: 6px !important;
  height: 6px !important;
  background: #fff !important;
  box-shadow: 0 0 14px 4px rgba(255,255,255,.95) !important;
  border-radius: 50% !important;
  position: absolute !important;
}
.voice-orb-stage .voice-orb span:nth-child(1){ left: 25%; top: 30%; animation: iomaSpark 1.1s ease-in-out infinite; }
.voice-orb-stage .voice-orb span:nth-child(2){ right: 24%; top: 40%; animation: iomaSpark 1.3s ease-in-out infinite .25s; }
.voice-orb-stage .voice-orb span:nth-child(3){ left: 48%; bottom: 24%; animation: iomaSpark 1.2s ease-in-out infinite .5s; }
@keyframes iomaSpark{
  0%, 100% { opacity: .4; transform: scale(.75); }
  50%      { opacity: 1; transform: scale(1.5); }
}

/* 3. Тёмная тема — фон орба */
body.manual-dark.voice-active .voice-orb-stage,
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: rgba(6, 30, 46, .94) !important;
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v124 добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>124', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>124', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v124')
print('===== ГОТОВО =====')
