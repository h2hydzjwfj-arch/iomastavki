import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. aiChatText — быстрый переход на Gemini при 429
old_g = """async function groqRequest(model, messages, maxTokens, key){
  for (let attempt = 1; attempt <= 4; attempt++){
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5, response_format:{type:'json_object'} }),
        signal: AbortSignal.timeout(120000)
      });
      if (r.ok){
        const d = await r.json();
        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (text) return { ok:true, text };
      }
      const errText = await r.text();
      if (r.status === 429 || /rate limit/i.test(errText)){
        if (attempt < 4){ await sleep(4000*attempt); continue; }
      }
      if (/decommissioned|does not exist/i.test(errText)) return { ok:false, fatal:true };
      return { ok:false, error: 'HTTP ' + r.status };
    } catch(e){
      if (attempt < 4){ await sleep(3000); continue; }
      return { ok:false, error: e.message };
    }
  }
  return { ok:false };
}"""
new_g = """async function groqRequest(model, messages, maxTokens, key){
  for (let attempt = 1; attempt <= 2; attempt++){
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5, response_format:{type:'json_object'} }),
        signal: AbortSignal.timeout(60000)
      });
      if (r.ok){
        const d = await r.json();
        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (text) return { ok:true, text };
      }
      const errText = await r.text();
      if (r.status === 429 || /rate limit/i.test(errText)){
        // При 429 сразу отдаём наверх — пусть пробует Gemini
        return { ok:false, rateLimited:true };
      }
      if (/decommissioned|does not exist/i.test(errText)) return { ok:false, fatal:true };
      return { ok:false, error: 'HTTP ' + r.status };
    } catch(e){
      if (attempt < 2){ await sleep(800); continue; }
      return { ok:false, error: e.message };
    }
  }
  return { ok:false };
}"""
if 'rateLimited:true' in s:
    print('SKIP: groqRequest уже ускорен')
elif old_g in s:
    s = s.replace(old_g, new_g, 1)
    print('OK: groqRequest — 2 попытки, при 429 сразу exit')
else:
    print('WARN: groqRequest anchor не найден')

# 2. aiChatText — Gemini ПЕРЕД повтором Groq
old_at = """async function aiChatText(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt },
      { role:'user', content: userPrompt }
    ];
    if (process.env.GROQ_API_KEY){
      for (const model of GROQ_MODELS){
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type':'application/json'},
            body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5 }),
            signal: AbortSignal.timeout(120000)
          });
          if (r.ok){
            const d = await r.json();
            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
            if (text) return text;
          }
        } catch(e){}
      }
    }"""
new_at = """async function aiChatText(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt },
      { role:'user', content: userPrompt }
    ];
    if (process.env.GROQ_API_KEY){
      let groqRateLimited = false;
      for (const model of GROQ_MODELS){
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type':'application/json'},
            body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5 }),
            signal: AbortSignal.timeout(60000)
          });
          if (r.ok){
            const d = await r.json();
            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
            if (text) return text;
          }
          if (r.status === 429){
            groqRateLimited = true;
            break;
          }
        } catch(e){}
      }
      if (groqRateLimited) console.log('[AI] Groq 429 → сразу к Gemini');
    }"""
if 'Groq 429 → сразу к Gemini' in s:
    print('SKIP: aiChatText уже ускорен')
elif old_at in s:
    s = s.replace(old_at, new_at, 1)
    print('OK: aiChatText — Groq 429 → сразу Gemini')
else:
    print('WARN: aiChatText anchor не найден, пробую короткий путь')

# Резервная попытка — просто заменить timeout
if 'Groq 429 → сразу к Gemini' not in s:
    s = s.replace('signal: AbortSignal.timeout(120000)\n          });\n          if (r.ok){\n            const d = await r.json();\n            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;\n            if (text) return text;\n          }\n        } catch(e){}',
                  'signal: AbortSignal.timeout(60000)\n          });\n          if (r.ok){\n            const d = await r.json();\n            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;\n            if (text) return text;\n          }\n          if (r.status === 429) break;\n        } catch(e){}')
    print('OK: aiChatText — fallback timeout 60 сек, break при 429')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# 3. Отключаем автоозвучку
old_v = "let recognition=null,voiceListening=false,voiceAutoSpeak=true,voiceFinalBuffer='',mediaRecorder=null,mediaChunks=[];"
new_v = "let recognition=null,voiceListening=false,voiceAutoSpeak=false,voiceFinalBuffer='',mediaRecorder=null,mediaChunks=[];"
if 'voiceAutoSpeak=false' in s2:
    print('SKIP: voiceAutoSpeak уже отключён')
elif old_v in s2:
    s2 = s2.replace(old_v, new_v, 1)
    print('OK: voiceAutoSpeak = false (озвучка ответов отключена)')
else:
    print('WARN: voiceAutoSpeak anchor не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('app.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

css_add = """

/* ========== v126: круглый шарик + без затемнения ========== */

/* 1. Отменяем затемнение/блюр контейнера */
body.voice-active .assistant-shell .voice-orb-stage,
.assistant-shell.voice-active .voice-orb-stage{
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  inset: auto !important;
  top: 50% !important;
  left: 50% !important;
  right: auto !important;
  bottom: auto !important;
  transform: translate(-50%, -50%) !important;
  width: 260px !important;
  height: 260px !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  pointer-events: none !important;
  animation: none !important;
  box-shadow: none !important;
}

/* 2. НЕ размывать чат и композ — оставляем всё видимым */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head{
  filter: none !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* 3. Шарик — строго круглый */
.voice-orb-stage .voice-orb,
body.voice-active #voiceOrb,
.assistant-shell.voice-active .voice-orb-stage .voice-orb{
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
  position: relative !important;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  margin: 0 !important;
  display: grid !important;
  place-items: center !important;
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
    iomaOrbFloat 3.2s ease-in-out infinite,
    iomaOrbGlow 2.2s ease-in-out infinite !important;
}

/* 4. Переливы внутри */
.voice-orb-stage .voice-orb::before,
body.voice-active #voiceOrb::before{
  content: "" !important;
  position: absolute !important;
  inset: 6% !important;
  border-radius: 50% !important;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), transparent 30%),
    radial-gradient(circle at 72% 68%, rgba(140,230,255,.6), transparent 42%),
    radial-gradient(circle at 50% 82%, rgba(70,160,200,.4), transparent 48%) !important;
  animation: iomaOrbShimmer 4.5s ease-in-out infinite !important;
  pointer-events: none !important;
  filter: blur(4px) !important;
  z-index: 2 !important;
}

/* 5. Кольцо-ореол */
.voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: -10px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(120,200,225,.55) !important;
  animation: iomaOrbRing 2.4s ease-out infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 6. Блёстки внутри */
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

/* 7. Подсказка ниже сферы (не внутри) */
.voice-orb-stage::after{
  content: "Нажми на сферу, чтобы завершить диалог" !important;
  position: absolute !important;
  bottom: -36px !important;
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
}
body.manual-dark .voice-orb-stage::after{
  color: rgba(200,235,245,.9) !important;
  background: rgba(6,30,46,.85) !important;
}

/* 8. Keyframes */
@keyframes iomaOrbFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-6px) scale(1.015); }
}
@keyframes iomaOrbShimmer{
  0%, 100% { transform: rotate(0deg) scale(1); opacity: .85; filter: blur(4px) hue-rotate(0deg); }
  50%      { transform: rotate(180deg) scale(1.05); opacity: 1; filter: blur(6px) hue-rotate(22deg); }
}
@keyframes iomaOrbRing{
  0%   { transform: scale(.72); opacity: 0; border-color: rgba(120,200,225,.7); }
  30%  { opacity: 1; }
  100% { transform: scale(1.55); opacity: 0; border-color: rgba(120,200,225,.15); }
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
@keyframes iomaHintFade{
  0%, 100% { opacity: .65; }
  50%      { opacity: 1; }
}

/* 9. Тёмная тема — не перекрашивать контейнер */
body.manual-dark.voice-active .voice-orb-stage,
body.manual-dark .assistant-shell.voice-active .voice-orb-stage{
  background: transparent !important;
}

/* 10. Мобильные */
@media(max-width: 650px){
  body.voice-active .assistant-shell .voice-orb-stage,
  .assistant-shell.voice-active .voice-orb-stage{
    width: 200px !important;
    height: 200px !important;
  }
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
    bottom: -32px !important;
    font-size: 11px !important;
  }
}
"""

s3 += css_add
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: styles.css — блок v126 добавлен')

# ==================== INDEX.HTML ====================
p4 = 'index.html'
s4 = open(p4, 'r', encoding='utf-8').read()
s4 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>126', s4)
s4 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>126', s4)
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: index.html -> v126')
print('===== ГОТОВО =====')
