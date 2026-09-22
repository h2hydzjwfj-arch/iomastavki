import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Переписываем geminiRequest с thinkingConfig (отключить reasoning для быстрого ответа)
old_body = """  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\\n\\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens || 2000,
      temperature: 0.5
    }
  };"""

new_body = """  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\\n\\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: Math.max(4000, (maxTokens || 2000) * 2),
      temperature: 0.5,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };"""

if old_body in s:
    s = s.replace(old_body, new_body, 1)
    print('OK: geminiRequest — thinkingBudget=0 + maxTokens × 2')
else:
    print('WARN: тело запроса Gemini не найдено')

# 2. Улучшаем диагностику — даём больше токенов
old_diag = "        generationConfig: { maxOutputTokens: 20, temperature: 0.1 }"
new_diag = "        generationConfig: { maxOutputTokens: 500, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } }"
if old_diag in s:
    s = s.replace(old_diag, new_diag, 1)
    print('OK: диагностика — maxOutputTokens=500 + thinkingBudget=0')

# 3. Меняем порядок моделей — 2.5-flash (не reasoning) первым для скорости
old_models = "  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];"
new_models = "  const models = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];"
if old_models in s:
    s = s.replace(old_models, new_models, 1)
    print('OK: 2.5-flash теперь первый — быстрее отвечает')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))
print('===== ГОТОВО =====')
