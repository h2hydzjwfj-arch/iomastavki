import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# ========== 1. Находим и заменяем aiChatJSON ==========
start = s.find('async function aiChatJSON')
if start < 0:
    print('❌ aiChatJSON не найдена')
    exit()

# Ищем следующий async function или app.post после начала
after = s.find('\nasync function', start + 10)
if after < 0:
    after = s.find('\napp.post', start + 10)
if after < 0:
    after = len(s)
print('OK: aiChatJSON от ' + str(start) + ' до ' + str(after))

new_func = '''// ============ AI ОЧЕРЕДЬ (мьютекс) — защита от 429 ============
// Все запросы идут последовательно. При 429 — ждём и повторяем.
let AI_LOCK = Promise.resolve();
let AI_QUEUE_LEN = 0;

function withAiLock(fn){
  AI_QUEUE_LEN++;
  const run = async function(){
    try { return await fn(); }
    finally { AI_QUEUE_LEN--; }
  };
  const next = AI_LOCK.then(run, run);
  AI_LOCK = next.catch(function(){});
  return next;
}

async function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

// Делает запрос к одной модели Groq с retry при 429/400
async function groqRequestWithRetry(model, messages, maxTokens, key){
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens || 2000,
          temperature: 0.5,
          response_format: {type: 'json_object'}
        }),
        signal: AbortSignal.timeout(120000)
      });
      if (r.ok){
        const d = await r.json();
        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (text) return { ok: true, text: text };
      }
      const errText = await r.text();
      const isRate = r.status === 429 || (errText && errText.indexOf('rate limit') >= 0);
      const isDecommissioned = errText && errText.indexOf('decommissioned') >= 0;
      if (isDecommissioned){
        console.warn('[groq] ' + model + ' decommissioned — пропускаю');
        return { ok: false, fatal: true, error: 'decommissioned' };
      }
      if (isRate && attempt < MAX_ATTEMPTS){
        const wait = 4000 * attempt; // 4, 8, 12 сек
        console.log('[queue] ' + model + ' → 429, ждём ' + wait + 'мс (попытка ' + attempt + '/' + MAX_ATTEMPTS + ')');
        await sleep(wait);
        continue;
      }
      console.warn('[groq] ' + model + ' error ' + r.status + ': ' + errText.slice(0, 100));
      return { ok: false, error: 'http ' + r.status };
    } catch (e){
      console.warn('[groq] ' + model + ' exception: ' + e.message);
      if (attempt < MAX_ATTEMPTS){
        await sleep(3000);
        continue;
      }
      return { ok: false, error: e.message };
    }
  }
  return { ok: false, error: 'all retries failed' };
}

async function aiChatJSON(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    if (AI_QUEUE_LEN > 1) console.log('[queue] в очереди ещё ' + (AI_QUEUE_LEN - 1));
    const messages = [
      {role: 'system', content: systemPrompt + ' Отвечай ТОЛЬКО валидным JSON-объектом без markdown и без комментариев.'},
      {role: 'user', content: userPrompt}
    ];

    // 1. GROQ с retry
    if (process.env.GROQ_API_KEY){
      for (const model of GROQ_MODELS){
        const res = await groqRequestWithRetry(model, messages, maxTokens, process.env.GROQ_API_KEY);
        if (res.ok){
          console.log('[aiChatJSON] Groq ' + model + ' OK');
          try { return repairJSON(res.text); }
          catch(e){ console.warn('[aiChatJSON] JSON repair failed, retry'); }
        }
        if (res.fatal) continue;
      }
    }

    // 2. DEEPSEEK с retry
    if (process.env.DEEPSEEK_API_KEY){
      for (let attempt = 1; attempt <= 3; attempt++){
        try {
          const r = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type': 'application/json'},
            body: JSON.stringify({model: 'deepseek-chat', messages: messages, max_tokens: maxTokens || 4000, temperature: 0.5, response_format: {type: 'json_object'}}),
            signal: AbortSignal.timeout(120000)
          });
          if (r.ok){
            const d = await r.json();
            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
            if (text){
              console.log('[aiChatJSON] DeepSeek OK');
              return repairJSON(text);
            }
          } else {
            const errText = await r.text();
            if ((r.status === 429 || r.status === 402) && attempt < 3){
              console.log('[queue] DeepSeek → ' + r.status + ', ждём 5с');
              await sleep(5000);
              continue;
            }
            console.warn('[aiChatJSON] DeepSeek error ' + r.status + ': ' + errText.slice(0, 100));
            break;
          }
        } catch (e){
          console.warn('[aiChatJSON] DeepSeek exception: ' + e.message);
          if (attempt < 3) await sleep(3000);
        }
      }
    }

    throw new Error('Все AI-провайдеры недоступны (Groq 429, DeepSeek не настроен)');
  });
}
'''

s = s[:start] + new_func + s[after:]
print('OK: aiChatJSON с очередью + retry')

# ========== 2. Уменьшаем параллельность в translateNewsItems ==========
s = s.replace('const CONCURRENCY = 3;', 'const CONCURRENCY = 1;')
s = s.replace(
    "if (batchStart + CONCURRENCY < MAX) await new Promise(function(r){ setTimeout(r, 400); });",
    "if (batchStart + CONCURRENCY < MAX) await new Promise(function(r){ setTimeout(r, 1500); });"
)
print('OK: translateNews — 1 запрос за раз + пауза 1.5с')

# ========== 3. Не запускать preload аудио, пока AI занят переводом ==========
# Заменяем вызов preloadNews сразу после fetchNews на отложенный
old_call = "items = await fetchNews();\n    } else {\n      items = await fetchNews();"
# (не трогаем — оставим как есть)

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# ========== 4. Обновляем версию ==========
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>61', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>61', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v61')
print('===== ВСЁ ГОТОВО =====')
