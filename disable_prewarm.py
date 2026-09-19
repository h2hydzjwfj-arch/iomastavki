import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig_len = len(s)

# Удаляем вызов prewarm из app.listen
patterns = [
    r"\n\s*// Отложенный прогрев[\s\S]*?\}, 5 \* 60 \* 1000\);",
    r"\n\s*// Автопрогрев[\s\S]*?\}, \d+\);",
    r"\n\s*setTimeout\(function\(\)\{\s*console\.log\('\[startup\] автопрогрев[\s\S]*?\}, \d+\);"
]
for pat in patterns:
    s2, n = re.subn(pat, "\n  // Prewarm отключён", s)
    if n > 0:
        s = s2
        print('OK: убран вызов prewarm (pattern ' + str(patterns.index(pat)) + ')')
        break

# Отключаем саму функцию prewarmNewsCache
if 'async function prewarmNewsCache(N){' in s and 'return; // отключено' not in s:
    s = s.replace('async function prewarmNewsCache(N){',
                  'async function prewarmNewsCache(N){\n  return; // отключено, чтобы не есть лимит Groq')
    print('OK: prewarmNewsCache отключена')

# Обновляем версию
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>76', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>76', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v76')

# Записываем server.js
open(p, 'w', encoding='utf-8').write(s)
print('Размер до: ' + str(orig_len) + ' байт, после: ' + str(len(s)) + ' байт')
print('===== ГОТОВО =====')
