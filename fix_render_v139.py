import re

# ==================== STYLES.CSS ====================
p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

css_add = """

/* ========== v139: центровка шара + картинки ========== */

/* 1. Шар — строго по центру через grid-центрирование stage */
.assistant-shell.voice-active .voice-orb-stage{
  display: grid !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  width: auto !important; height: auto !important;
  min-width: 0 !important; min-height: 0 !important;
  max-width: none !important; max-height: none !important;
  transform: none !important;
  translate: none !important;
  margin: 0 !important;
  padding: 0 !important;
  place-items: center !important;
  align-content: center !important;
  justify-content: center !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 0 !important;
  box-shadow: none !important;
  pointer-events: none !important;
  z-index: 500 !important;
  overflow: visible !important;
}

.assistant-shell.voice-active .voice-orb-stage .voice-orb,
.assistant-shell.voice-active #voiceOrb{
  justify-self: center !important;
  align-self: center !important;
  margin: 0 auto !important;
  position: relative !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  transform: none !important;
  translate: none !important;
}

/* 2. Карточки новостей — картинки вписаны полностью */
.news-card-img{
  width: 100% !important;
  aspect-ratio: 16 / 10 !important;
  overflow: hidden !important;
  background: #e8f2f7 !important;
  display: block !important;
}
.news-card-img img{
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center center !important;
  display: block !important;
}
"""

s = s.rstrip() + '\n' + css_add
open(p, 'w', encoding='utf-8').write(s)
print('styles.css: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== SERVER.JS ====================
p2 = 'server.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# --- Обновляем промпт генерации статей ---
old_prompt = """  const sys = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Be specific with numbers, laws, terms. Return JSON only.';
  const usr = 'Write a detailed analytical article in ' + LANG + ' (900-1300 words). Topic: ' + cleanTitle + '. Source: ' + sourceName + '. Description: ' + description + '.\\n\\nReturn JSON: {"title":"...","subtitle":"...","content":"markdown with ## headings","podcast":"short script","image_query":"cargo logistics"}';"""

new_prompt = """  const sys = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Today is ' + new Date().toISOString().slice(0,10) + '. IMPORTANT: Never write outdated dates (like 2023, 2024, 2025) in the article body. If the source mentions old dates, rewrite the context to be timeless or use current data only. If unsure about a fact, write in general terms. Return JSON only.';
  const usr = 'Write a detailed analytical article in ' + LANG + ' (900-1300 words). Topic: ' + cleanTitle + '. Source: ' + sourceName + '. Description: ' + description + '.\\n\\nSTRICT RULES:\\n1. Do NOT mention any years in the article body unless they are the CURRENT year (' + new Date().getFullYear() + ') or the future.\\n2. If the source data is from 2023-2025, rephrase as "recent data shows" or "the latest available figures".\\n3. Add realistic industry analysis, Incoterms, HS codes, logistics implications.\\n4. Content structure: ## Что произошло / ## Что это значит для логистики / ## Что проверить / ## Выводы.\\n5. End with a short practical takeaway.\\n\\nReturn JSON: {"title":"...","subtitle":"...","content":"markdown with ## headings","podcast":"short script","image_query":"specific topic"}';"""

if 'STRICT RULES:' in s2:
    print('SKIP: промпт уже обновлён')
elif old_prompt in s2:
    s2 = s2.replace(old_prompt, new_prompt, 1)
    print('OK: промпт статей обновлён (без старых лет)')
else:
    print('WARN: anchor старого промпта не найден')

# --- Улучшаем defaultImgQuery — конкретные словари ---
old_q = "function defaultImgQuery(title){\n  const t = String(title||'').toLowerCase();"
if old_q in s2:
    print('OK: defaultImgQuery уже есть')
else:
    print('WARN: defaultImgQuery anchor не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('server.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>139', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>139', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v139')
print('===== ГОТОВО =====')
