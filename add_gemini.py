import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# ========== 1. Функции Gemini ==========
if 'async function geminiChatJSON' not in s:
    anchor = 'async function aiChatJSON(systemPrompt, userPrompt, maxTokens){'
    if anchor not in s:
        print('FAIL: aiChatJSON не найден')
        exit(1)
    block = '''// ========== Google Gemini (резервный провайдер) ==========
async function geminiRequest(systemPrompt, userPrompt, maxTokens, jsonMode){
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
}

async function geminiChatJSON(systemPrompt, userPrompt, maxTokens){
  const res = await geminiRequest(systemPrompt + ' Return ONLY valid JSON.', userPrompt, maxTokens, true);
  if (!res.ok) return null;
  try { return repairJSON(res.text); } catch(e){ console.warn('[AI] Gemini JSON repair fail'); return null; }
}
async function geminiChatText(systemPrompt, userPrompt, maxTokens){
  const res = await geminiRequest(systemPrompt, userPrompt, maxTokens, false);
  return res.ok ? res.text : null;
}

'''
    s = s.replace(anchor, block + anchor, 1)
    print('OK: geminiRequest + geminiChatJSON + geminiChatText добавлены')
else:
    print('SKIP: Gemini функции уже есть')

# ========== 2. Вставляем Gemini в aiChatJSON ПЕРЕД DeepSeek ==========
idx_chatjson = s.find('async function aiChatJSON')
idx_chattext = s.find('async function aiChatText')
if idx_chatjson < 0:
    print('FAIL: aiChatJSON не найден')
    exit(1)

old_json = """    if (process.env.DEEPSEEK_API_KEY){
      for (let attempt = 1; attempt <= 2; attempt++){
        try {
          const r = await fetch('https://api.deepseek.com/chat/completions', {"""
new_json = """    if (process.env.GEMINI_API_KEY){
      const g = await geminiChatJSON(systemPrompt, userPrompt, maxTokens);
      if (g && typeof g === 'object' && Object.keys(g).length){
        console.log('[AI] Gemini OK');
        return g;
      }
    }
    if (process.env.DEEPSEEK_API_KEY){
      for (let attempt = 1; attempt <= 2; attempt++){
        try {
          const r = await fetch('https://api.deepseek.com/chat/completions', {"""

end_json = idx_chattext if idx_chattext > 0 else len(s)
section = s[idx_chatjson:end_json]
if old_json in section:
    section = section.replace(old_json, new_json, 1)
    s = s[:idx_chatjson] + section + s[end_json:]
    print('OK: Gemini вставлен в aiChatJSON (Groq -> Gemini -> DeepSeek)')
elif 'geminiChatJSON(systemPrompt' in section:
    print('SKIP: Gemini уже в aiChatJSON')
else:
    print('WARN: anchor в aiChatJSON не найден')

# ========== 3. Вставляем Gemini в aiChatText ПЕРЕД DeepSeek ==========
if idx_chattext > 0:
    old_text = """    if (process.env.DEEPSEEK_API_KEY){
      try {
        const r = await fetch('https://api.deepseek.com/chat/completions', {"""
    new_text = """    if (process.env.GEMINI_API_KEY){
      const g = await geminiChatText(systemPrompt, userPrompt, maxTokens);
      if (g){
        console.log('[AI] Gemini OK (text)');
        return g;
      }
    }
    if (process.env.DEEPSEEK_API_KEY){
      try {
        const r = await fetch('https://api.deepseek.com/chat/completions', {"""

    end_text = s.find('function runEdgeTts', idx_chattext)
    if end_text < 0: end_text = len(s)
    section_t = s[idx_chattext:end_text]
    if old_text in section_t:
        section_t = section_t.replace(old_text, new_text, 1)
        s = s[:idx_chattext] + section_t + s[end_text:]
        print('OK: Gemini вставлен в aiChatText')
    elif 'geminiChatText(systemPrompt' in section_t:
        print('SKIP: Gemini уже в aiChatText')
    else:
        print('WARN: anchor в aiChatText не найден')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ========== 4. Версия ==========
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>103', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>103', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v103')

print('===== ГОТОВО =====')
