import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Одинарные точки — убрать текст "•••"
old_think = """d.innerHTML=`<span class=thinking-dots>•••</span><i></i><i></i><i></i>`;"""
new_think = """d.innerHTML=`<i></i><i></i><i></i>`;"""
if new_think in s:
    print('SKIP: одинарные точки уже есть')
elif old_think in s:
    s = s.replace(old_think, new_think, 1)
    print('OK: убраны двойные точки (•••)')
else:
    print('WARN: anchor thinking dots не найден')

# 2. Голос: НЕ показывать текст в поле пока идёт запись
old_recog = """recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t+' ';else interim+=t}if(finalText){const clean=finalText.trim();voiceFinalBuffer+=(voiceFinalBuffer?' ':'')+clean;$('#assistantInput').value=voiceFinalBuffer;setVoiceUI(true,tr('recognized'))}else if(interim&&$('#voiceState'))$('#voiceState').textContent=interim;
      clearTimeout(window.__voiceSilenceTimer);
      window.__voiceSilenceTimer = setTimeout(function(){
        if (voiceListening){ try{ recognition.stop(); }catch(err){} }
      }, 2200);
    };"""
new_recog = """recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t+' ';else interim+=t}if(finalText){const clean=finalText.trim();voiceFinalBuffer+=(voiceFinalBuffer?' ':'')+clean;}
      clearTimeout(window.__voiceSilenceTimer);
      window.__voiceSilenceTimer = setTimeout(function(){
        if (voiceListening){ try{ recognition.stop(); }catch(err){} }
      }, 2200);
    };"""
if 'if(finalText){const clean=finalText.trim();voiceFinalBuffer+=(voiceFinalBuffer?' ':'')+clean;}' in s:
    print('SKIP: голос уже не пишет в поле')
elif old_recog in s:
    s = s.replace(old_recog, new_recog, 1)
    print('OK: голос — текст не показывается в поле')
else:
    print('WARN: recognition.onresult anchor не найден')

# 3. При завершении — сразу отправить БЕЗ показа текста
old_end = """recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));if(voiceFinalBuffer.trim()){const text=voiceFinalBuffer.trim();voiceFinalBuffer='';$('#assistantInput').value=text;sendAI(true)}};"""
new_end = """recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));if(voiceFinalBuffer.trim()){const text=voiceFinalBuffer.trim();voiceFinalBuffer='';const inp=$('#assistantInput');if(inp)inp.value=text;setTimeout(function(){try{sendAI(true)}catch(e){console.warn('voice send:',e)}if(inp)inp.value='';},50)}};"""
if 'setTimeout(function(){try{sendAI(true)}' in s:
    print('SKIP: авто-отправка уже есть')
elif old_end in s:
    s = s.replace(old_end, new_end, 1)
    print('OK: авто-отправка после тишины')
else:
    print('WARN: recognition.onend anchor не найден')

# 4. При старте голоса — показываем орб, скрываем textarea
old_start = """btn.onclick=()=>{if(voiceListening){try{recognition.stop()}catch{};return}recognition.lang=voiceLang();try{recognition.start()}catch{setVoiceUI(false,tr('fail'))}};"""
new_start = """btn.onclick=()=>{if(voiceListening){try{recognition.stop()}catch{};return}recognition.lang=voiceLang();try{recognition.start();document.querySelector('.assistant-shell')?.classList.add('voice-active');document.body.classList.add('voice-active')}catch{setVoiceUI(false,tr('fail'))}};"""
if "document.body.classList.add('voice-active')" in s:
    print('SKIP: орб при старте уже есть')
elif old_start in s:
    s = s.replace(old_start, new_start, 1)
    print('OK: при голосе — показать орб')
else:
    print('WARN: voice btn.onclick anchor не найден')

# 5. При завершении — убираем орб
if "document.body.classList.remove('voice-active')" not in s:
    old_onend2 = "recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));"
    new_onend2 = "recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));document.querySelector('.assistant-shell')?.classList.remove('voice-active');document.body.classList.remove('voice-active');"
    if old_onend2 in s:
        s = s.replace(old_onend2, new_onend2, 1)
        print('OK: при завершении — убрать орб')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 8B: одинарные точки, орб, контраст топбара ========== */

/* 1. Одинарные анимированные точки */
.ai-thinking-bubble{
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 14px 18px !important;
  min-height: 44px !important;
}
.ai-thinking-bubble i{
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #4a8bab !important;
  display: inline-block !important;
  animation: aiThinkingDot 1.3s ease-in-out infinite !important;
}
.ai-thinking-bubble i:nth-of-type(1){ animation-delay: 0s !important; }
.ai-thinking-bubble i:nth-of-type(2){ animation-delay: .18s !important; }
.ai-thinking-bubble i:nth-of-type(3){ animation-delay: .36s !important; }
.thinking-dots{ display: none !important; }
@keyframes aiThinkingDot{
  0%, 80%, 100% { transform: translateY(0); opacity: .45; }
  40%           { transform: translateY(-6px); opacity: 1; }
}
body.manual-dark .ai-thinking-bubble i{ background: #7fc8e5 !important; }

/* 2. Орб при голосе — большая сфера в центре, скрывает textarea */
body.voice-active .assistant-shell,
.assistant-shell.voice-active{
  overflow: hidden !important;
}
body.voice-active .assistant-shell .chat-compose,
.assistant-shell.voice-active .chat-compose,
body.voice-active .assistant-shell .chat-messages,
.assistant-shell.voice-active .chat-messages{
  filter: blur(2px);
  opacity: .25;
  pointer-events: none;
  transition: opacity .25s ease, filter .25s ease;
}
.assistant-shell.voice-active .voice-orb-stage,
body.voice-active .assistant-shell .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
  height: auto !important;
  flex-basis: auto !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 200 !important;
  background: radial-gradient(circle at 50% 50%, rgba(250,253,255,.94) 0%, rgba(240,250,253,.88) 55%, rgba(230,245,250,.94) 100%) !important;
  backdrop-filter: blur(18px) !important;
  -webkit-backdrop-filter: blur(18px) !important;
  animation: voiceStageFadeIn .3s ease-out !important;
  border-radius: inherit !important;
}
@keyframes voiceStageFadeIn{ from{opacity:0} to{opacity:1} }
.assistant-shell.voice-active .voice-orb-stage .voice-orb,
body.voice-active .assistant-shell .voice-orb-stage .voice-orb{
  display: grid !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  width: 168px !important;
  height: 168px !important;
  flex: 0 0 168px !important;
  margin: 0 !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
body.voice-active .assistant-shell .voice-orb-stage .voice-orb::before,
body.voice-active .assistant-shell .voice-orb-stage .voice-orb::after{
  content: "" !important;
  position: absolute !important;
  inset: -24px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(120,200,225,.45) !important;
  animation: voiceOrbRingBig 1.6s ease-out infinite !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after,
body.voice-active .assistant-shell .voice-orb-stage .voice-orb::after{
  animation-delay: .55s !important;
  border-color: rgba(120,200,225,.28) !important;
}
@keyframes voiceOrbRingBig{
  0%   { transform: scale(.72); opacity: 0; }
  30%  { opacity: .9; }
  100% { transform: scale(1.55); opacity: 0; }
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb.listening,
body.voice-active .assistant-shell .voice-orb-stage .voice-orb.listening{
  animation: voiceOrbBreath 1.6s ease-in-out infinite !important;
}
@keyframes voiceOrbBreath{
  0%, 100% { transform: scale(.97); filter: hue-rotate(0deg); }
  50%      { transform: scale(1.06); filter: hue-rotate(18deg); }
}
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: radial-gradient(circle at 50% 50%, rgba(8,40,60,.94) 0%, rgba(6,30,46,.9) 55%, rgba(4,22,36,.96) 100%) !important;
}

/* 3. Топбар — белая подложка когда открыто окно */
body.view-open .topbar,
body.view-open .topbar .topbar-left,
body.view-open .topbar .brand,
body.view-open .topbar .top-actions{
  background: rgba(240, 248, 252, .82) !important;
  backdrop-filter: blur(20px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
}
body.view-open .topbar{
  box-shadow: 0 1px 0 rgba(80,120,140,.08), 0 8px 24px rgba(24,70,98,.06) !important;
}
body.view-open .topbar .brand{
  padding: 0 14px !important;
  border-radius: 14px !important;
}
body.view-open .topbar .topbar-left,
body.view-open .topbar .top-actions{
  padding: 6px 10px !important;
  border-radius: 16px !important;
}
body.manual-dark.view-open .topbar,
body.manual-dark.view-open .topbar .topbar-left,
body.manual-dark.view-open .topbar .brand,
body.manual-dark.view-open .topbar .top-actions{
  background: rgba(6, 30, 46, .82) !important;
}
body.manual-dark.view-open .topbar{
  box-shadow: 0 1px 0 rgba(140,220,235,.14), 0 8px 24px rgba(0,0,0,.24) !important;
}

/* 4. Топбар остаётся прозрачным на главной */
body:not(.view-open) .topbar,
body:not(.view-open) .topbar .topbar-left,
body:not(.view-open) .topbar .brand,
body:not(.view-open) .topbar .top-actions{
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* 5. Мобильные */
@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage .voice-orb,
  body.voice-active .assistant-shell .voice-orb-stage .voice-orb{
    width: 128px !important;
    height: 128px !important;
    flex-basis: 128px !important;
  }
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок 8B добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>120', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>120', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v120')
print('===== ГОТОВО =====')
