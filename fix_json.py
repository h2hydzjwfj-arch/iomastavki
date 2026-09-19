p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# ============ 1. Добавляем функцию repairJSON и aiChatJSON ============
if 'function repairJSON' not in s and 'async function aiChatJSON' not in s:
    # Найдём конец функции aiChat
    anchor = '\n\nasync function openAIFileUpload'
    insert_at = s.find(anchor)
    if insert_at < 0:
        print('FAIL: anchor openAIFileUpload не найден')
    else:
        new_funcs = r'''

// ============ АВТО-РЕМОНТ СЛОМАННОГО JSON ============
function repairJSON(raw){
  if (typeof raw !== 'string') return raw;
  let t = raw.trim();
  // Убрать markdown-обёртку
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  // Найти первую { или [
  const firstBrace = t.indexOf('{');
  const firstBracket = t.indexOf('[');
  let start = -1;
  if (firstBrace < 0 && firstBracket < 0) throw new Error('Нет JSON');
  if (firstBrace < 0) start = firstBracket;
  else if (firstBracket < 0) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  // Найти последнюю } или ]
  const lastBrace = t.lastIndexOf('}');
  const lastBracket = t.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (end <= start) throw new Error('Повреждённый JSON');
  t = t.slice(start, end + 1);
  // Убрать trailing commas перед } или ]
  t = t.replace(/,\s*([}\]])/g, '$1');
  // Заменить одиночные кавычки на двойные только у ключей
  t = t.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
  // Попробовать распарсить
  try { return JSON.parse(t); } catch(e) {}
  // Заменить неэкранированные переводы строк в строках
  try {
    const fixed = t.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, function(m){
      return m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    return JSON.parse(fixed);
  } catch(e) {}
  throw new Error('Не удалось починить JSON: ' + e.message);
}

// ============ AI-ЗАПРОС С ГАРАНТИРОВАННЫМ JSON (Groq/DeepSeek) ============
async function aiChatJSON(systemPrompt, userPrompt, maxTokens) {
  const messages = [
    {role: 'system', content: systemPrompt + ' Отвечай ТОЛЬКО валидным JSON-объектом без markdown и без комментариев.'},
    {role: 'user', content: userPrompt}
  ];

  // 1. GROQ с response_format: json_object
  if (process.env.GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json'},
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: maxTokens || 4000,
            temperature: 0.5,
            response_format: {type: 'json_object'}
          }),
          signal: AbortSignal.timeout(90000)
        });
        if (r.ok) {
          const d = await r.json();
          const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          if (text) {
            console.log('[aiChatJSON] Groq ' + model + ' OK');
            try { return repairJSON(text); }
            catch(e) {
              console.warn('[aiChatJSON] Groq JSON repair failed, retry');
              // Вторая попытка с более строгим промптом
              const r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json'},
                body: JSON.stringify({
                  model: model,
                  messages: [
                    {role: 'system', content: 'Ты возвращаешь ТОЛЬКО валидный JSON. Все строки в двойных кавычках. Без trailing запятых. Без комментариев.'},
                    {role: 'user', content: userPrompt}
                  ],
                  max_tokens: maxTokens || 4000,
                  temperature: 0.3,
                  response_format: {type: 'json_object'}
                }),
                signal: AbortSignal.timeout(90000)
              });
              if (r2.ok) {
                const d2 = await r2.json();
                const t2 = d2.choices && d2.choices[0] && d2.choices[0].message && d2.choices[0].message.content;
                if (t2) return repairJSON(t2);
              }
            }
          }
        } else {
          console.warn('[aiChatJSON] Groq ' + model + ' error ' + r.status);
        }
      } catch (e) { console.warn('[aiChatJSON] Groq ' + model + ' failed:', e.message); }
    }
  }

  // 2. DEEPSEEK
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          max_tokens: maxTokens || 4000,
          temperature: 0.5,
          response_format: {type: 'json_object'}
        }),
        signal: AbortSignal.timeout(90000)
      });
      if (r.ok) {
        const d = await r.json();
        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (text) { console.log('[aiChatJSON] DeepSeek OK'); return repairJSON(text); }
      }
    } catch (e) { console.warn('[aiChatJSON] DeepSeek failed:', e.message); }
  }

  throw new Error('Не удалось получить валидный JSON от AI');
}
'''
        s = s[:insert_at] + new_funcs + s[insert_at:]
        print('OK: aiChatJSON + repairJSON добавлены')
else:
    print('OK: aiChatJSON уже есть')

# ============ 2. Заменяем вызов в /api/news/article ============
old_call = "let raw = await aiChat(systemPrompt, userPrompt, 4000);"
new_call = "let article = await aiChatJSON(systemPrompt, userPrompt, 4000);"

if old_call in s:
    # Убираем старую логику парсинга после вызова
    old_block = old_call + '''
    raw = raw.replace(/^```json\\s*/i, '').replace(/```\\s*$/i, '').trim();
    let article;
    try { article = JSON.parse(raw); }
    catch(e) {
      const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) article = JSON.parse(raw.slice(a, b+1));
      else throw new Error('AI вернул не-JSON');
    }
    if (!article.content) throw new Error('AI не сгенерировал content');'''

    new_block = new_call + '''
    if (!article || !article.content) throw new Error('AI не сгенерировал content');'''

    if old_block in s:
        s = s.replace(old_block, new_block)
        print('OK: /api/news/article переключён на aiChatJSON')
    else:
        # Более простой фолбэк — только заменить первую строку
        s = s.replace(old_call, new_call)
        print('OK: заменил вызов aiChat → aiChatJSON (простая замена)')
else:
    print('WARN: не нашёл вызов aiChat в article')

# ============ 3. Улучшаем промпт — короче и строже ============
old_prompt = "'\\nТребования:\\n- 900-1300 слов\\n- Подзаголовки (## Заголовок)\\n- Будь конкретным: цифры, шаги, примеры\\n- Контекст про логистику Китай-Россия\\n- В конце краткий аудио-сценарий\\n\\n' +\n    'Формат СТРОГО JSON без markdown:\\n{\"title\":\"...\",\"subtitle\":\"...\",\"content\":\"...markdown...\",\"podcast\":\"...\",\"image_query\":\"cargo logistics\",\"image_queries\":[\"container port\",\"freight train\",\"customs documents\"]}';"

new_prompt = "'\\nТребования:\\n- 900-1300 слов\\n- Подзаголовки (## Заголовок)\\n- Будь конкретным: цифры, шаги, примеры, термины\\n- Контекст про логистику Китай-Россия, таможню, ВЭД\\n- Если упоминаешь законы/пошлины — указывай конкретные номера\\n- В конце краткий аудио-сценарий\\n\\n' +\n    'Верни JSON-объект со строго такими ключами (все строки в двойных кавычках!):\\n' +\n    '{\"title\":\"string\",\"subtitle\":\"string\",\"content\":\"string (markdown)\",\"podcast\":\"string\",\"image_query\":\"string\",\"image_queries\":[\"string\",\"string\",\"string\"]}';"

if old_prompt in s:
    s = s.replace(old_prompt, new_prompt)
    print('OK: промпт улучшен')
else:
    print('WARN: промпт не найден (но это не критично)')

open(p, 'w', encoding='utf-8').write(s)
print('==== Готово ====')
