import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Меняем список моделей — только те, что РЕАЛЬНО работают для новых ключей
old = "  const models = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];"
new = "  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];"
if old in s:
    s = s.replace(old, new, 1)
    print('OK: список моделей обновлён (без 2.5-flash)')
else:
    # Попробуем найти любой список моделей и заменить
    m = re.search(r"  const models = \[[^\]]+\];", s)
    if m:
        s = s.replace(m.group(0), new, 1)
        print('OK: список моделей принудительно обновлён')

# Добавляем fallback: если thinkingConfig не поддерживается — повтор без него
old_body = """  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\\n\\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: Math.max(4000, (maxTokens || 2000) * 2),
      temperature: 0.5,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };"""

new_body = """  const bodyBase = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\\n\\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: Math.max(6000, (maxTokens || 2000) * 3),
      temperature: 0.5
    }
  };
  const bodyNoThinking = JSON.parse(JSON.stringify(bodyBase));
  bodyNoThinking.generationConfig.thinkingConfig = { thinkingBudget: 0 };"""

if old_body in s:
    s = s.replace(old_body, new_body, 1)
    print('OK: тело запроса переписано с fallback')

# Меняем сам вызов — сначала с thinkingConfig, при 400 — без него
old_call = """        for (const v of authVariants){
          const r = await fetch(v.url, {
            method: 'POST',
            headers: v.headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000)
          });"""
new_call = """        for (const v of authVariants){
          // 1-я попытка с thinkingBudget=0, если 400 — без него
          let r = await fetch(v.url, {
            method: 'POST',
            headers: v.headers,
            body: JSON.stringify(bodyNoThinking),
            signal: AbortSignal.timeout(60000)
          });
          if (r.status === 400){
            const errText = await r.text();
            if (/thinking|thinkingConfig/i.test(errText)){
              console.warn('[AI] Gemini ' + model + ' не поддерживает thinkingConfig — повтор без него');
              r = await fetch(v.url, {
                method: 'POST',
                headers: v.headers,
                body: JSON.stringify(bodyBase),
                signal: AbortSignal.timeout(60000)
              });
            } else {
              console.warn('[AI] Gemini ' + model + ' HTTP 400: ' + errText.slice(0,150));
              continue;
            }
          }"""
if old_call in s:
    s = s.replace(old_call, new_call, 1)
    print('OK: geminiRequest — fallback при отсутствии thinkingConfig')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))
print('===== ГОТОВО =====')
