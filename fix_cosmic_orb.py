import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Отладка AI: логировать что реально приходит
old_send = "const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:finalMessage,history:chatHistory.slice(-10),context:getCalculatorContext(),language:lang,web:true})});"
new_send = "console.warn('[IOMA] /api/ai send len=', finalMessage.length);const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:finalMessage,history:chatHistory.slice(-10),context:getCalculatorContext(),language:lang,web:true})});"
if "console.warn('[IOMA] /api/ai send len=" in s:
    print('SKIP: send-лог уже есть')
elif old_send in s:
    s = s.replace(old_send, new_send, 1)
    print('OK: отправка в /api/ai логируется')
else:
    print('WARN: send anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== SERVER.JS ====================
p2 = 'server.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# 1. Улучшить aiChatText — логировать каждый шаг и добавить надёжные fallbacks
idx = s2.find('async function aiChatText(')
idx_end = s2.find('function runEdgeTts', idx)
if idx < 0 or idx_end <= idx:
    print('WARN: aiChatText не найден')
else:
    new_fn = '''async function aiChatText(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt },
      { role:'user', content: userPrompt }
    ];
    // 1. GROQ
    if (process.env.GROQ_API_KEY){
      let rateLimited = false;
      for (const model of GROQ_MODELS){
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type':'application/json'},
            body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5 }),
            signal: AbortSignal.timeout(45000)
          });
          if (r.ok){
            const d = await r.json();
            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
            if (text){ console.log('[AI] Groq OK (' + model + ')'); return text; }
          }
          if (r.status === 429){ rateLimited = true; console.log('[AI] Groq 429 (' + model + ')'); break; }
          console.log('[AI] Groq HTTP ' + r.status);
        } catch(e){ console.log('[AI] Groq error: ' + e.message); }
      }
      if (rateLimited) console.log('[AI] Groq rate-limited → Gemini');
    } else {
      console.log('[AI] Groq — нет ключа');
    }

    // 2. GEMINI
    if (process.env.GEMINI_API_KEY){
      try {
        const g = await geminiChatText(systemPrompt, userPrompt, maxTokens);
        if (g){ console.log('[AI] Gemini OK'); return g; }
        console.log('[AI] Gemini вернул пусто');
      } catch(e){ console.log('[AI] Gemini error: ' + e.message); }
    } else {
      console.log('[AI] Gemini — нет ключа');
    }

    // 3. DEEPSEEK
    if (process.env.DEEPSEEK_API_KEY){
      try {
        const r = await fetch('https://api.deepseek.com/chat/completions', {
          method:'POST',
          headers:{'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type':'application/json'},
          body: JSON.stringify({ model:'deepseek-chat', messages, max_tokens: maxTokens || 2000, temperature:0.5 }),
          signal: AbortSignal.timeout(60000)
        });
        if (r.ok){
          const d = await r.json();
          const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          if (text){ console.log('[AI] DeepSeek OK'); return text; }
        }
        console.log('[AI] DeepSeek HTTP ' + r.status);
      } catch(e){ console.log('[AI] DeepSeek error: ' + e.message); }
    } else {
      console.log('[AI] DeepSeek — нет ключа');
    }

    throw new Error('Все AI-провайдеры недоступны');
  });
}

'''
    s2 = s2[:idx] + new_fn + s2[idx_end:]
    print('OK: aiChatText переписан с логированием каждого провайдера')

open(p2, 'w', encoding='utf-8').write(s2)
print('server.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

css_add = """

/* ========== v129: космический шарик поверх UI ========== */

/* 1. НЕ затемнять UI — чат, композ, хедер остаются как есть */
body.voice-active .assistant-shell .chat-messages,
body.voice-active .assistant-shell .chat-compose,
body.voice-active .assistant-shell .voice-state,
body.voice-active .assistant-shell .assistant-head{
  filter: none !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  transition: none !important;
}

/* 2. Stage — маленький, ровно по центру окна, не трогает UI */
body.voice-active .assistant-shell .voice-orb-stage,
.assistant-shell.voice-active .voice-orb-stage{
  display: flex !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  right: auto !important;
  bottom: auto !important;
  width: 340px !important;
  height: 340px !important;
  min-height: 340px !important;
  max-height: 340px !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  padding: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: 0 !important;
  pointer-events: none !important;
  z-index: 250 !important;
  overflow: visible !important;
}

/* 3. Свечение снаружи — большая пульсирующая туманность */
.voice-orb-stage::before{
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
    rgba(140,90,255,.30) 0%,
    rgba(90,180,255,.18) 30%,
    rgba(255,120,220,.10) 55%,
    transparent 75%
  ) !important;
  filter: blur(12px) !important;
  animation: cosmoPulse 3.2s ease-in-out infinite !important;
  pointer-events: none !important;
  z-index: 0 !important;
}

/* 4. Расходящееся кольцо (второй псевдо) */
.voice-orb-stage::after{
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
  box-shadow: 0 0 30px rgba(140,90,255,.4) inset !important;
}

/* 5. САМ ШАРИК — космический, как туманность/планета */
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
  overflow: hidden !important;
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.98) 0%, rgba(230,240,255,.7) 6%, transparent 20%),
    radial-gradient(circle at 72% 70%, rgba(255,140,230,.55) 0%, transparent 45%),
    radial-gradient(circle at 38% 62%, rgba(130,90,255,.65) 0%, transparent 50%),
    radial-gradient(circle at 62% 38%, rgba(80,180,255,.55) 0%, transparent 45%),
    radial-gradient(circle at 50% 50%, #2a1a5e 0%, #150a3a 55%, #05010f 100%) !important;
  box-shadow:
    0 0 60px rgba(140,80,255,.75),
    0 0 140px rgba(80,180,255,.5),
    0 0 240px rgba(140,80,255,.28),
    inset -12px -14px 40px rgba(80,40,180,.55),
    inset 10px 10px 26px rgba(255,255,255,.22) !important;
  animation: cosmoFloat 3.6s ease-in-out infinite !important;
}

/* 6. Вращающаяся туманность внутри шара */
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
  opacity: .85 !important;
  animation: cosmoSpin 9s linear infinite !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 7. Кольцо-обод внутри шара + блеск */
.voice-orb-stage .voice-orb::after,
body.voice-active #voiceOrb::after{
  content: "" !important;
  position: absolute !important;
  inset: 8% !important;
  border-radius: 50% !important;
  background: radial-gradient(
    circle at 30% 25%,
    rgba(255,255,255,.9) 0%,
    rgba(255,255,255,.25) 12%,
    transparent 30%
  ) !important;
  pointer-events: none !important;
  z-index: 3 !important;
  animation: cosmoSheen 4.5s ease-in-out infinite !important;
}

/* 8. Звёзды/блёстки — много маленьких точек */
.voice-orb-stage .voice-orb span{
  display: block !important;
  position: absolute !important;
  width: 3px !important;
  height: 3px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow:
    0 0 10px 2px rgba(255,255,255,.95),
    0 0 18px rgba(180,220,255,.85) !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
.voice-orb-stage .voice-orb span:nth-child(1){
  left: 30% !important; top: 22% !important;
  animation: cosmoTwinkle 1.6s ease-in-out infinite !important;
}
.voice-orb-stage .voice-orb span:nth-child(2){
  right: 24% !important; top: 42% !important;
  width: 2px !important; height: 2px !important;
  animation: cosmoTwinkle 2.1s ease-in-out infinite .4s !important;
}
.voice-orb-stage .voice-orb span:nth-child(3){
  left: 40% !important; bottom: 24% !important;
  width: 2.5px !important; height: 2.5px !important;
  animation: cosmoTwinkle 1.9s ease-in-out infinite .8s !important;
}

/* 9. Подсказка под шариком */
.voice-orb-stage .voice-orb{
  /* stage уже центрирует */
}
body.voice-active .assistant-shell .voice-orb-stage .voice-orb{
  /* для читаемости */
}

/* 10. Отключаем старые правила, создающие затемнение */
.assistant-shell.voice-active{
  background: rgba(248,252,255,.88) !important;
}
body.manual-dark .assistant-shell.voice-active{
  background: linear-gradient(145deg, #0a3648, #0f4c60) !important;
}

/* 11. Прячем старую подсказку от v127 если была */
.voice-orb-stage .voice-orb-hint{ display: none !important; }

/* 12. Keyframes */
@keyframes cosmoFloat{
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-6px) scale(1.012); }
}
@keyframes cosmoSpin{
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes cosmoSheen{
  0%, 100% { transform: rotate(0deg) scale(1); opacity: .55; }
  50%      { transform: rotate(180deg) scale(1.02); opacity: .9; }
}
@keyframes cosmoTwinkle{
  0%, 100% { opacity: .35; transform: scale(.85); }
  50%      { opacity: 1; transform: scale(1.7); }
}
@keyframes cosmoPulse{
  0%, 100% { opacity: .55; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
}
@keyframes cosmoRing{
  0%   { width: 180px; height: 180px; opacity: 0; border-color: rgba(180,140,255,.85); }
  20%  { opacity: 1; }
  100% { width: 380px; height: 380px; opacity: 0; border-color: rgba(180,220,255,.05); }
}

/* 13. Мобильные */
@media(max-width: 650px){
  body.voice-active .assistant-shell .voice-orb-stage,
  .assistant-shell.voice-active .voice-orb-stage{
    width: 260px !important;
    height: 260px !important;
    min-height: 260px !important;
    max-height: 260px !important;
  }
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
    width: 300px !important;
    height: 300px !important;
  }
  .voice-orb-stage::after{
    width: 140px !important;
    height: 140px !important;
  }
}
"""

s3 += css_add
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: styles.css — блок v129 добавлен')

# ==================== INDEX.HTML ====================
p4 = 'index.html'
s4 = open(p4, 'r', encoding='utf-8').read()
s4 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>129', s4)
s4 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>129', s4)
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: index.html -> v129')
print('===== ГОТОВО =====')
