import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Убрать автозагрузку полей калькулятора
old_save = """(function(){
  const ids = ['fromCity','toCity','weight','pieces','distance','length','width','height'];
  ids.forEach(function(id){
    const el = document.getElementById(id);
    if (!el) return;
    const saved = localStorage.getItem('iomas_field_' + id);
    if (saved && !el.value) el.value = saved;
    el.addEventListener('input', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
    el.addEventListener('change', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
  });
})();"""
new_save = """// v110: поля калькулятора всегда пустые при открытии
(function(){
  const ids = ['fromCity','toCity','weight','pieces','distance','length','width','height'];
  ids.forEach(function(id){
    try { localStorage.removeItem('iomas_field_' + id); } catch(e){}
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
    el.addEventListener('change', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
  });
})();"""
if old_save in s:
    s = s.replace(old_save, new_save, 1)
    print('OK: убрана автозагрузка полей калькулятора')
else:
    print('WARN: anchor автосохранения не найден')

# 2. Улучшить stopAudioPlayback
old_stop = """function stopAudioPlayback(){
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  if (currentAudioPlayer){ try { currentAudioPlayer.pause(); } catch(e){} currentAudioPlayer = null; }
  if (currentPlayBtn){ currentPlayBtn.classList.remove('playing'); const t = currentPlayBtn.querySelector('.audio-label'); if (t) t.textContent = 'Прослушать статью'; currentPlayBtn = null; }
}"""
new_stop = """function stopAudioPlayback(){
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  if (currentAudioPlayer){
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
      try { URL.revokeObjectURL(currentAudioPlayer.src); } catch(e){}
      currentAudioPlayer.src = '';
      currentAudioPlayer.load();
    } catch(e){}
    currentAudioPlayer = null;
  }
  if (currentPlayBtn){ currentPlayBtn.classList.remove('playing'); const t = currentPlayBtn.querySelector('.audio-label'); if (t) t.textContent = 'Прослушать статью'; currentPlayBtn = null; }
}"""
if new_stop in s:
    print('SKIP: stopAudioPlayback уже улучшен')
elif old_stop in s:
    s = s.replace(old_stop, new_stop, 1)
    print('OK: stopAudioPlayback улучшен (ревокация URL)')
else:
    print('WARN: stopAudioPlayback не найден')

# 3. При открытии статьи — стоп текущего аудио
old_open = """async function openArticle(n){
  currentArticleNews = n;
  showView('article');"""
new_open = """async function openArticle(n){
  try { stopAudioPlayback(); } catch(e){}
  currentArticleNews = n;
  showView('article');"""
if 'try { stopAudioPlayback(); } catch(e){}\n  currentArticleNews = n;' in s:
    print('SKIP: stop при открытии уже есть')
elif old_open in s:
    s = s.replace(old_open, new_open, 1)
    print('OK: stopAudioPlayback при открытии статьи')
else:
    print('WARN: openArticle не найден')

# 4. Таймер тишины для голоса
old_voice = "recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t+' ';else interim+=t}if(finalText){const clean=finalText.trim();voiceFinalBuffer+=(voiceFinalBuffer?' ':'')+clean;$('#assistantInput').value=voiceFinalBuffer;setVoiceUI(true,tr('recognized'))}else if(interim&&$('#voiceState'))$('#voiceState').textContent=interim};"
new_voice = """recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t+' ';else interim+=t}if(finalText){const clean=finalText.trim();voiceFinalBuffer+=(voiceFinalBuffer?' ':'')+clean;$('#assistantInput').value=voiceFinalBuffer;setVoiceUI(true,tr('recognized'))}else if(interim&&$('#voiceState'))$('#voiceState').textContent=interim;
      clearTimeout(window.__voiceSilenceTimer);
      window.__voiceSilenceTimer = setTimeout(function(){
        if (voiceListening){ try{ recognition.stop(); }catch(err){} }
      }, 2200);
    };"""
if 'window.__voiceSilenceTimer' in s:
    print('SKIP: таймер тишины уже есть')
elif old_voice in s:
    s = s.replace(old_voice, new_voice, 1)
    print('OK: таймер тишины 2.2 сек для голосового ввода')
else:
    print('WARN: recognition.onresult anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 6 ========== */

/* 1. Верхнее меню — обычный цвет, brand-стиль */
.topbar-left .top-nav-btn{
  color: #1d607e !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif !important;
}
.topbar-left .top-nav-btn:hover{
  color: #17506b !important;
}
.topbar-left .top-nav-btn > span:last-child{
  color: inherit !important;
  font-weight: 650 !important;
  letter-spacing: -0.3px !important;
  font-family: inherit !important;
}
body.manual-dark .topbar-left .top-nav-btn,
body.manual-dark .topbar-left .top-nav-btn > span:last-child{
  color: #dceff1 !important;
}
body.manual-dark .topbar-left .top-nav-btn:hover{
  color: #b8e8ef !important;
}

/* 2. Топбар поверх окон */
.topbar{z-index: 5000 !important}
.view-layer{z-index: 1000 !important}
.view-layer.open{z-index: 1000 !important}

/* 3. Орб при голосе — большая сфера по центру окна */
.voice-orb-stage{
  display: none !important;
  height: 0 !important;
  flex-basis: 0 !important;
  overflow: visible;
}
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
  height: auto !important;
  flex-basis: auto !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 100 !important;
  background: rgba(248,252,255,.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: inherit;
  animation: voiceStageIn .35s ease-out;
}
@keyframes voiceStageIn{
  from { opacity: 0; }
  to   { opacity: 1; }
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb{
  display: grid !important;
  width: 148px !important;
  height: 148px !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  flex-basis: auto !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb::before,
.assistant-shell.voice-active .voice-orb-stage .voice-orb::after{
  inset: -20px !important;
}
.assistant-shell.voice-active .voice-orb-stage .voice-orb.listening{
  animation: voiceOrbPulse 1.4s ease-in-out infinite !important;
}
@keyframes voiceOrbPulse{
  0%, 100% { transform: scale(.96); }
  50%      { transform: scale(1.08); }
}
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: rgba(6,22,40,.9);
}

/* 4. Анимация hero-заголовка в статье */
.article-hero{
  position: relative;
  overflow: hidden;
}
.article-hero::before{
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 40%, rgba(120,200,240,.22), transparent 45%),
              radial-gradient(circle at 70% 60%, rgba(255,220,140,.15), transparent 50%);
  animation: articleHeroPulse 8s ease-in-out infinite;
  z-index: 2;
  pointer-events: none;
}
@keyframes articleHeroPulse{
  0%, 100% { opacity: .55; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.18); }
}
.article-title h1{
  animation: articleTitleIn 1.1s cubic-bezier(.2,.8,.2,1);
}
@keyframes articleTitleIn{
  from { opacity: 0; transform: translateY(20px); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.article-title .eyebrow{
  animation: articleEyebrowIn .95s ease-out .25s both;
}
@keyframes articleEyebrowIn{
  from { opacity: 0; letter-spacing: 8px; }
  to   { opacity: 1; letter-spacing: 2.2px; }
}

@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage .voice-orb{
    width: 110px !important;
    height: 110px !important;
  }
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок Батч 6 добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>110', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>110', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v110')

print('===== ГОТОВО =====')
