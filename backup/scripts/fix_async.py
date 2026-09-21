import re

p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# Ищем function loadNews без async
count_before = len(re.findall(r'(?<!async )function loadNews\b', s))
print('Найдено "function loadNews" без async: ' + str(count_before))

# Заменяем на async function loadNews
s = re.sub(r'(?<!async )function loadNews\b', 'async function loadNews', s)

# Проверяем что теперь
count_after = len(re.findall(r'async function loadNews\b', s))
print('Теперь "async function loadNews": ' + str(count_after))

# Также проверяем другие функции, которые могут быть без async
others = ['loadCurrency', 'loadRates', 'loadAgents', 'autoDistance', 'openArticle', 'sendAI', 'checkWeather']
for fn in others:
    cnt = len(re.findall(r'(?<!async )function ' + fn + r'\b', s))
    if cnt > 0:
        print('⚠️ ' + fn + ' без async: ' + str(cnt) + ' — исправляю')
        s = re.sub(r'(?<!async )function ' + fn + r'\b', 'async function ' + fn, s)

open(p, 'w', encoding='utf-8').write(s)
print('==== app.js готов ====')

# Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>96', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>96', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v96')
print('===== ГОТОВО =====')
