import re, os, json, shutil

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Диагностика через console.warn (видно всегда)
old_log = "console.log('[openArticle] click title=', String(n && n.title || '').slice(0,70), '| link=', String(n && n.link || '').slice(0,60));"
new_log = "console.warn('[IOMA] openArticle click:', { title: String(n && n.title || '').slice(0,80), link: String(n && n.link || '').slice(0,60), desc: String(n && n.description || '').slice(0,60) });"
if "console.warn('[IOMA] openArticle click" in s:
    print('SKIP: console.warn уже есть')
elif old_log in s:
    s = s.replace(old_log, new_log, 1)
    print('OK: диагностика openArticle → console.warn')
else:
    # Пробуем добавить в другое место
    old2 = "async function openArticle(n){\n  try { stopAudioPlayback(); } catch(e){}"
    new2 = "async function openArticle(n){\n  console.warn('[IOMA] openArticle called:', { title: String(n && n.title || '').slice(0,80), link: String(n && n.link || '').slice(0,60) });\n  try { stopAudioPlayback(); } catch(e){}"
    if old2 in s:
        s = s.replace(old2, new2, 1)
        print('OK: диагностика добавлена (fallback)')

# 2. Диагностика cacheKey
old_ck = "console.log('[openArticle] title=', String(title).slice(0,50), '| cacheKey=', cacheKey.slice(0,80));"
new_ck = "console.warn('[IOMA] cacheKey:', cacheKey.slice(0,100), '| normId:', normId.slice(0,60), '| lang:', lang, '| memKeys:', Object.keys(articleMemCache).length);"
if "console.warn('[IOMA] cacheKey" in s:
    print('SKIP: cacheKey warn уже есть')
elif old_ck in s:
    s = s.replace(old_ck, new_ck, 1)
    print('OK: cacheKey → console.warn')

# 3. Диагностика карточек через console.warn
old_card = "console.log('[card] idx=' + items.indexOf(n) + ' title=' + String(n.title || '').slice(0,60) + ' link=' + String(n.link || '').slice(0,50));"
new_card = "console.warn('[IOMA] card rendered idx=' + items.indexOf(n) + ' title=' + String(n.title || '').slice(0,80) + ' link=' + String(n.link || '').slice(0,60));"
if "console.warn('[IOMA] card rendered" in s:
    print('SKIP: card warn уже есть')
elif old_card in s:
    s = s.replace(old_card, new_card, 1)
    print('OK: card → console.warn')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== SERVER.JS ====================
p2 = 'server.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# 4. Входящий запрос — громкий лог
old_srv = "const sourceLinkRaw = String(req.body?.link || '').trim();"
new_srv = "const sourceLinkRaw = String(req.body?.link || '').trim();\n  console.warn('[IOMA-SRV] /api/news/article:', { title: title.slice(0,80), link: sourceLinkRaw.slice(0,60), lang: language });"
if "[IOMA-SRV] /api/news/article" in s2:
    print('SKIP: SRV warn уже есть')
elif old_srv in s2:
    s2 = s2.replace(old_srv, new_srv, 1)
    print('OK: server — громкий лог входящих')

open(p2, 'w', encoding='utf-8').write(s2)
print('server.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()

# 5. Meta no-cache
if 'no-cache' not in s3.split('</head>')[0]:
    s3 = s3.replace('<head>', '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">', 1)
    print('OK: meta no-cache добавлен')

# 6. Одноразовая очистка localStorage + sessionStorage перед app.js
if 'IOMA_CACHE_CLEARED_v123' not in s3:
    clear_script = '''<script>
  try {
    if (!sessionStorage.getItem('IOMA_CACHE_CLEARED_v123')) {
      localStorage.removeItem('iomas_articles');
      localStorage.removeItem('iomas_news');
      console.warn('[IOMA] one-time cache cleanup done');
      sessionStorage.setItem('IOMA_CACHE_CLEARED_v123', '1');
    }
  } catch(e){}
</script>
<script src="/app.js?v=20260919-v123"></script>'''
    s3 = s3.replace('<script src="/app.js?v=20260919-v98"></script>', clear_script, 1)
    if 'IOMA_CACHE_CLEARED_v123' not in s3:
        # ещё один возможный вариант
        s3 = re.sub(r'<script src="/app\.js\?v=[^"]+"></script>', clear_script, s3, count=1)
    print('OK: одноразовая очистка localStorage добавлена')

# Обновляем версии
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>123', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>123', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v123')

# ==================== ЧИСТКА СЕРВЕРНЫХ КЭШЕЙ ====================
cleared = []

# 7. articles-cache
try:
    d = 'data/articles-cache'
    if os.path.isdir(d):
        n = len(os.listdir(d))
        shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
        cleared.append(f'articles-cache ({n} файлов)')
except Exception as e:
    print('WARN articles-cache:', e)

# 8. news-cache.json (плохие переводы)
try:
    f = 'data/news-cache.json'
    if os.path.isfile(f):
        os.remove(f)
        cleared.append('news-cache.json')
except Exception as e:
    print('WARN news-cache:', e)

# 9. audio-cache
try:
    d = 'data/audio-cache'
    if os.path.isdir(d):
        n = len(os.listdir(d))
        shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
        cleared.append(f'audio-cache ({n} файлов)')
except Exception as e:
    print('WARN audio-cache:', e)

if cleared:
    print('OK: очищено — ' + ', '.join(cleared))
else:
    print('Кэши уже пустые')

print('===== ГОТОВО =====')
