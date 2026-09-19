import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. openArticle: добавить логи + использовать link как ключ
old1 = """async function openArticle(n){
  try { stopAudioPlayback(); } catch(e){}
  currentArticleNews = n;
  showView('article');
  const box = $('#articleContent');
  const urgent = isUrgentNews(n);
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const desc = cleanNewsText(n.description || '');
  const source = cleanNewsText(n.source || '');
  const img = n.image || '';
  const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const statusLabel = urgent ? (lang === 'ru' ? 'СРОЧНО' : 'URGENT') : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
  const normTitle = normalizeText(title);
  const cacheKey = normTitle + '::' + lang;"""
new1 = """async function openArticle(n){
  console.log('[openArticle] click n.title=', String(n && n.title || '').slice(0,70), '| link=', String(n && n.link || '').slice(0,60));
  try { stopAudioPlayback(); } catch(e){}
  currentArticleNews = n;
  showView('article');
  const box = $('#articleContent');
  const urgent = isUrgentNews(n);
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const desc = cleanNewsText(n.description || '');
  const source = cleanNewsText(n.source || '');
  const img = n.image || '';
  const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const statusLabel = urgent ? (lang === 'ru' ? 'СРОЧНО' : 'URGENT') : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
  const normTitle = normalizeText(title);
  // Ключ кэша: link приоритетнее title, т.к. link уникален
  const stableId = String(n.link || '').trim() || title;
  const normId = normalizeText(stableId);
  const cacheKey = normId + '::' + lang;
  console.log('[openArticle] title=', String(title).slice(0,50), '| cacheKey=', cacheKey.slice(0,80));"""
if "console.log('[openArticle] click" in s:
    print('SKIP: логи уже добавлены')
elif old1 in s:
    s = s.replace(old1, new1, 1)
    print('OK: openArticle — логи + link-based cacheKey')
else:
    print('WARN: openArticle anchor не найден, пробуем альтернативный')

# 2. Резервный патч если первый не сработал
if "console.log('[openArticle] click" not in s:
    old1b = "async function openArticle(n){\n  try { stopAudioPlayback(); } catch(e){}\n  currentArticleNews = n;"
    new1b = "async function openArticle(n){\n  console.log('[openArticle] click title=', String(n && n.title || '').slice(0,70), '| link=', String(n && n.link || '').slice(0,60));\n  try { stopAudioPlayback(); } catch(e){}\n  currentArticleNews = n;"
    if old1b in s:
        s = s.replace(old1b, new1b, 1)
        print('OK: добавлен базовый лог в openArticle')

# 3. saveLocalArticle — сохранять с тем же ключом
old3 = "if (typeof saveLocalArticle === 'function') saveLocalArticle(normTitle, lang, d.article);"
new3 = "if (typeof saveLocalArticle === 'function') saveLocalArticle(normId, lang, d.article);"
if new3 in s:
    print('SKIP: saveLocalArticle уже с normId')
elif old3 in s:
    s = s.replace(old3, new3, 1)
    print('OK: saveLocalArticle использует normId')
else:
    print('WARN: saveLocalArticle anchor не найден')

# 4. getLocalArticle — читать с тем же ключом
old4 = "const localArt = (typeof getLocalArticle === 'function') ? getLocalArticle(normTitle, lang) : null;"
new4 = "const localArt = (typeof getLocalArticle === 'function') ? getLocalArticle(normId, lang) : null;"
if new4 in s:
    print('SKIP: getLocalArticle уже с normId')
elif old4 in s:
    s = s.replace(old4, new4, 1)
    print('OK: getLocalArticle использует normId')
else:
    print('WARN: getLocalArticle anchor не найден')

# 5. Логи в renderNewsItems — какой title у каждой карточки
old5 = "a.onclick = function(){ openArticle(n); };\n    box.appendChild(a);"
new5 = "a.onclick = function(){ openArticle(n); };\n    console.log('[card] idx=' + items.indexOf(n) + ' title=' + String(n.title || '').slice(0,60) + ' link=' + String(n.link || '').slice(0,50));\n    box.appendChild(a);"
if "console.log('[card] idx=" in s:
    print('SKIP: логи карточек уже есть')
elif old5 in s:
    s = s.replace(old5, new5, 1)
    print('OK: логи карточек добавлены')
else:
    print('WARN: card anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== SERVER.JS ====================
p2 = 'server.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# 6. Сервер: cache ID = link если есть
old_s = """  const cleanTitle = stripSource ? stripSource(title) : title;

  // 1. Проверяем кэш (на диске) — по ключу title+lang
  const cached = getCachedArticle(cleanTitle, language);
  if (cached){
    console.log('[article] CACHE HIT (' + language + '): ' + cleanTitle.slice(0,50));
    return res.json({ ok:true, article: cached, fromCache: true });
  }
  console.log('[article] CACHE MISS (' + language + '): ' + cleanTitle.slice(0,50));"""
new_s = """  const cleanTitle = stripSource ? stripSource(title) : title;
  const sourceLinkRaw = String(req.body?.link || '').trim();
  // Используем link как первичный ключ, т.к. он уникален
  const cacheId = sourceLinkRaw || cleanTitle;
  console.log('[article] lookup id=' + cacheId.slice(0,60) + ' lang=' + language);

  // 1. Проверяем кэш (на диске) — по ключу id+lang
  const cached = getCachedArticle(cacheId, language);
  if (cached){
    console.log('[article] CACHE HIT (' + language + '): ' + cacheId.slice(0,50));
    return res.json({ ok:true, article: cached, fromCache: true });
  }
  console.log('[article] CACHE MISS (' + language + '): ' + cacheId.slice(0,50));"""
if 'lookup id=' in s2:
    print('SKIP: сервер уже использует link как cacheId')
elif old_s in s2:
    s2 = s2.replace(old_s, new_s, 1)
    print('OK: сервер — cacheId = link || title')
else:
    print('WARN: сервер anchor #1 не найден')

# 7. Сервер: заменить cleanTitle на cacheId в saveCachedArticle и getCachedArticle
s2 = s2.replace("const ruCached = getCachedArticle(cleanTitle, 'ru');", "const ruCached = getCachedArticle(cacheId, 'ru');")
s2 = s2.replace("saveCachedArticle(cleanTitle, language, translated);", "saveCachedArticle(cacheId, language, translated);")
s2 = s2.replace("saveCachedArticle(cleanTitle, language, tpl);", "saveCachedArticle(cacheId, language, tpl);")
s2 = s2.replace("saveCachedArticle(cleanTitle, language, article);", "saveCachedArticle(cacheId, language, article);")
print('OK: сервер — все saveCachedArticle/getCachedArticle через cacheId')

open(p2, 'w', encoding='utf-8').write(s2)
print('server.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>122', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>122', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v122')
print('===== ГОТОВО =====')
