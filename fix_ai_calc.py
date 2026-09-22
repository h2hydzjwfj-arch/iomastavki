import re

# ==================== STYLES.CSS — авто-2-колонки ====================
c_path = 'styles.css'
c = open(c_path, 'r', encoding='utf-8').read()

old_css = '''
.calc-layout {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 380px !important;
  gap: 22px !important;
  min-height: 0 !important;
  flex: 1 !important;
  overflow: hidden !important;
}
'''

new_css = '''
.calc-layout {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 22px !important;
  min-height: 0 !important;
  flex: 1 !important;
  overflow: hidden !important;
  transition: grid-template-columns .35s ease, gap .35s ease;
}
/* Когда в правой колонке появился видимый контент — открываем 2 колонки */
.calc-layout:has(.calc-output > :not(.hidden)) {
  grid-template-columns: minmax(0, 1fr) 380px !important;
}
/* Скрываем пустой output */
.calc-output:not(:has(> :not(.hidden))) {
  display: none !important;
}
'''

if old_css in c:
    c = c.replace(old_css, new_css, 1)
    print('OK: styles.css — авто-2-колонки')
else:
    print('WARN: anchor calc-layout не найден, добавляю поверх')
    c += '\n' + new_css

# Убираем старый псевдо-заполнитель
c = c.replace('''.calc-output:empty::before,
.calc-output > .hidden:only-child::before {
  content: "Здесь появятся рекомендации, советы по маршруту и расчёт ставки";
}''', '')

open(c_path, 'w', encoding='utf-8').write(c)

# ==================== SERVER.JS — улучшение AI ====================
sp = 'server.js'
s = open(sp, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Переписываем geminiRequest с логированием и без responseMimeType
old_g = """async function geminiRequest(systemPrompt, userPrompt, maxTokens, jsonMode){
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok:false, error:'no key' };
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\\n\\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens || 2000,
      temperature: 0.5
    }
  };
  if (jsonMode) body.generationConfig.responseMimeType = 'application/json';
  for (const model of models){
    for (let attempt = 1; attempt <= 2; attempt++){
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90000)
        });
        if (r.ok){
          const d = await r.json();
          const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
          const text = parts && parts.map(function(x){return x.text||'';}).join('');
          if (text) return { ok:true, text };
        }
        const errText = await r.text();
        if (r.status === 429 || /rate limit|quota/i.test(errText)){
          if (attempt < 2){ await sleep(3000); continue; }
        }
        if (r.status === 400 && /API_KEY_INVALID|API key not valid/i.test(errText)) return { ok:false, fatal:true };
        break;
      } catch(e){
        if (attempt < 2){ await sleep(2000); continue; }
      }
    }
  }
  return { ok:false };
}"""

new_g = """async function geminiRequest(systemPrompt, userPrompt, maxTokens, jsonMode){
  const key = process.env.GEMINI_API_KEY;
  if (!key){ console.log('[AI] Gemini — нет ключа'); return { ok:false, error:'no key' }; }
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\\n\\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens || 2000,
      temperature: 0.5
    }
  };
  // NOTE: не ставим responseMimeType — некоторые ключи/модели не поддерживают
  for (const model of models){
    for (let attempt = 1; attempt <= 2; attempt++){
      try {
        // Пробуем сначала с key в query, потом с заголовком x-goog-api-key
        const authVariants = [
          { url: 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key, headers: { 'Content-Type': 'application/json' } },
          { url: 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key } }
        ];
        for (const v of authVariants){
          const r = await fetch(v.url, {
            method: 'POST',
            headers: v.headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000)
          });
          if (r.ok){
            const d = await r.json();
            const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
            const text = parts && parts.map(function(x){return x.text||'';}).join('');
            if (text){
              console.log('[AI] Gemini ' + model + ' OK');
              return { ok:true, text };
            }
            const finish = d.candidates && d.candidates[0] && d.candidates[0].finishReason;
            console.warn('[AI] Gemini ' + model + ' — пустой ответ (finishReason=' + (finish || '?') + ')');
          } else {
            const errText = await r.text();
            console.warn('[AI] Gemini ' + model + ' HTTP ' + r.status + ': ' + errText.slice(0, 200));
            if (r.status === 429){ break; }
            if (r.status === 400 && /API key not valid|API_KEY_INVALID|invalid.*key/i.test(errText)) return { ok:false, fatal:true };
          }
        }
        break;
      } catch(e){
        console.warn('[AI] Gemini ' + model + ' error: ' + e.message);
        if (attempt < 2){ await sleep(2000); continue; }
      }
    }
  }
  return { ok:false };
}"""

if old_g in s:
    s = s.replace(old_g, new_g, 1)
    print('OK: geminiRequest — логирование + 2 формата аутентификации')
else:
    print('WARN: geminiRequest anchor не найден')

# 2. Улучшаем logging в groqRequest
old_groq = "      if (r.status === 429 || /rate limit/i.test(errText)){\n        // При 429 сразу отдаём наверх — пусть пробует Gemini\n        return { ok:false, rateLimited:true };\n      }"
new_groq = "      if (r.status === 429 || /rate limit/i.test(errText)){\n        console.log('[AI] Groq 429 (' + model + '): ' + errText.slice(0,120));\n        return { ok:false, rateLimited:true };\n      }"
if old_groq in s:
    s = s.replace(old_groq, new_groq, 1)
    print('OK: groqRequest — логирование 429')

# 3. Улучшаем logging в aiChatJSON для отладки
old_aicj = """async function aiChatJSON(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt + ' Return ONLY valid JSON.' },
      { role:'user', content: userPrompt }
    ];
    if (process.env.GROQ_API_KEY){
      for (const model of GROQ_MODELS){
        const res = await groqRequest(model, messages, maxTokens, process.env.GROQ_API_KEY);
        if (res.ok){
          console.log('[AI] Groq ' + model + ' OK');
          try { return repairJSON(res.text); } catch(e){ console.warn('[AI] JSON repair fail'); }
        }
        if (res.fatal) continue;
      }
    }
    if (process.env.GEMINI_API_KEY){
      const g = await geminiChatJSON(systemPrompt, userPrompt, maxTokens);
      if (g && typeof g === 'object' && Object.keys(g).length){
        console.log('[AI] Gemini OK');
        return g;
      }
    }
    if (process.env.DEEPSEEK_API_KEY){"""

new_aicj = """async function aiChatJSON(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt + ' Return ONLY valid JSON.' },
      { role:'user', content: userPrompt }
    ];
    if (process.env.GROQ_API_KEY){
      for (const model of GROQ_MODELS){
        const res = await groqRequest(model, messages, maxTokens, process.env.GROQ_API_KEY);
        if (res.ok){
          console.log('[AI] Groq ' + model + ' OK (json)');
          try { return repairJSON(res.text); } catch(e){ console.warn('[AI] JSON repair fail'); }
        }
        if (res.fatal) continue;
      }
    }
    if (process.env.GEMINI_API_KEY){
      console.log('[AI] пробую Gemini (json)…');
      const g = await geminiChatJSON(systemPrompt, userPrompt, maxTokens);
      if (g && typeof g === 'object' && Object.keys(g).length){
        console.log('[AI] Gemini OK (json)');
        return g;
      }
    }
    if (process.env.DEEPSEEK_API_KEY){"""

if old_aicj in s:
    s = s.replace(old_aicj, new_aicj, 1)
    print('OK: aiChatJSON — логирование')
else:
    print('WARN: aiChatJSON anchor не найден')

open(sp, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))
print('===== ГОТОВО =====')
