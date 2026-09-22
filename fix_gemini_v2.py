import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Убеждаемся что список моделей правильный
correct_models = "  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];"

old_any = re.search(r"  const models = \[[^\]]+\];", s)
if old_any:
    if old_any.group(0) == correct_models:
        print('SKIP: список моделей уже правильный')
    else:
        s = s.replace(old_any.group(0), correct_models, 1)
        print('OK: список моделей обновлён')
else:
    print('WARN: не найден список моделей')

# 2. Проверяем что responseMimeType удалён
if "body.generationConfig.responseMimeType = 'application/json';" in s:
    s = s.replace("  if (jsonMode) body.generationConfig.responseMimeType = 'application/json';\n", "  // responseMimeType убран — не все модели поддерживают\n")
    print('OK: responseMimeType убран')

# 3. Улучшаем geminiChatJSON — если пришёл не JSON, всё равно возвращаем
old_gcj = """async function geminiChatJSON(systemPrompt, userPrompt, maxTokens){
  const res = await geminiRequest(systemPrompt + ' Return ONLY valid JSON.', userPrompt, maxTokens, true);
  if (!res.ok) return null;
  try { return repairJSON(res.text); } catch(e){ console.warn('[AI] Gemini JSON repair fail'); return null; }
}"""

new_gcj = """async function geminiChatJSON(systemPrompt, userPrompt, maxTokens){
  const res = await geminiRequest(systemPrompt + ' Return ONLY valid JSON.', userPrompt, maxTokens, false);
  if (!res.ok){ console.warn('[AI] Gemini request failed: ' + (res.error || 'unknown')); return null; }
  try { return repairJSON(res.text); }
  catch(e){ console.warn('[AI] Gemini JSON repair fail: ' + e.message + ' | text: ' + String(res.text||'').slice(0,150)); return null; }
}"""

if old_gcj in s:
    s = s.replace(old_gcj, new_gcj, 1)
    print('OK: geminiChatJSON — улучшено логирование')
else:
    print('WARN: geminiChatJSON anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))
print('===== ГОТОВО =====')
