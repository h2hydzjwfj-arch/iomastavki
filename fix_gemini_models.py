import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Меняем список моделей на актуальные
old_models = "  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];"
new_models = "  const models = ['gemini-3.6-flash', 'gemini-2.5-pro', 'gemini-flash-latest', 'gemini-pro-latest'];"
if old_models in s:
    s = s.replace(old_models, new_models, 1)
    print('OK: список моделей обновлён на gemini-3.6-flash, 2.5-pro, flash-latest, pro-latest')
else:
    print('WARN: старый список моделей не найден')

# 2. Добавляем endpoint диагностики Gemini
if '/api/gemini-test' not in s:
    anchor = "app.get('/api/currency', async function(req,res){"
    if anchor in s:
        diag = '''// Диагностика Gemini — какие модели доступны для ключа
app.get('/api/gemini-test', async function(req,res){
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(400).json({ ok:false, error:'GEMINI_API_KEY не задан' });
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key, {
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok){
      const t = await r.text();
      return res.status(502).json({ ok:false, error:'HTTP ' + r.status + ': ' + t.slice(0, 300) });
    }
    const d = await r.json();
    const models = (d.models || []).map(function(m){
      return {
        name: m.name,
        displayName: m.displayName,
        supportsGenerate: !!(m.supportedGenerationMethods || []).includes('generateContent')
      };
    }).filter(function(m){ return m.supportsGenerate; });
    res.json({ ok:true, count: models.length, models: models });
  } catch(e){
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Тестовый запрос к Gemini — проверка что реально отвечает
app.get('/api/gemini-ask', async function(req,res){
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(400).json({ ok:false, error:'GEMINI_API_KEY не задан' });
  const model = String(req.query.model || 'gemini-3.6-flash');
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Ответь одним словом: работает?' }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok){
      const t = await r.text();
      return res.status(502).json({ ok:false, model: model, error: 'HTTP ' + r.status + ': ' + t.slice(0, 400) });
    }
    const d = await r.json();
    const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
    const text = parts && parts.map(function(x){return x.text||'';}).join('');
    res.json({ ok:true, model: model, answer: text, finishReason: d.candidates && d.candidates[0] && d.candidates[0].finishReason });
  } catch(e){
    res.status(500).json({ ok:false, model: model, error: e.message });
  }
});

'''
        s = s.replace(anchor, diag + anchor, 1)
        print('OK: добавлены /api/gemini-test и /api/gemini-ask')

# 3. Улучшаем обработку 429 — увеличиваем паузы
old_sleep = "        if (r.status === 429 || /rate limit|quota/i.test(errText)){\n          if (attempt < 2){ await sleep(3000); continue; }\n        }"
new_sleep = "        if (r.status === 429 || /rate limit|quota/i.test(errText)){\n          console.log('[AI] Gemini 429 quota — жду 8 сек');\n          if (attempt < 2){ await sleep(8000); continue; }\n          break;\n        }"
if old_sleep in s:
    s = s.replace(old_sleep, new_sleep, 1)
    print('OK: пауза при 429 увеличена до 8 сек')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))
print('===== ГОТОВО =====')
