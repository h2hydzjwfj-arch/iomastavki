import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Файловое хранилище новостей + переводов
if 'function saveNewsCacheToDisk' not in s:
    anchor = 'const newsCache = { at: 0, items: [] };'
    if anchor not in s:
        print('WARN: newsCache anchor не найден')
    else:
        block = '''const newsCache = { at: 0, items: [], translations: {} };
const NEWS_CACHE_FILE = path.join(DATA_DIR, 'news-cache.json');

function loadNewsCacheFromDisk(){
  try {
    if (!fs.existsSync(NEWS_CACHE_FILE)) return;
    const d = JSON.parse(fs.readFileSync(NEWS_CACHE_FILE, 'utf8'));
    if (d && Array.isArray(d.items)) {
      newsCache.at = d.at || 0;
      newsCache.items = d.items;
      newsCache.translations = d.translations || {};
      console.log('[news-cache] загружено с диска: items=' + d.items.length + ', переводов=' + Object.keys(newsCache.translations).length);
    }
  } catch(e){ console.warn('[news-cache] load error: ' + e.message); }
}
function saveNewsCacheToDisk(){
  try {
    fs.mkdirSync(DATA_DIR, {recursive:true});
    fs.writeFileSync(NEWS_CACHE_FILE, JSON.stringify(newsCache), 'utf8');
  } catch(e){ console.warn('[news-cache] save error: ' + e.message); }
}
loadNewsCacheFromDisk();
'''
        s = s.replace(anchor, block, 1)
        print('OK: newsCache с дисковым хранилищем')
else:
    print('SKIP: newsCache уже с файлом')

# 2. translateNewsItems: сначала смотрим в newsCache.translations
old_tn = """async function translateNewsItems(items, targetLang){
  if (!items || !items.length || targetLang === 'ru') return items;
  const langNames = { en:'English', zh:'Chinese', tr:'Turkish' };
  const langName = langNames[targetLang] || 'English';
  const titlesKey = items.slice(0, 30).map(function(x){ return String(x.title||'').slice(0,120); }).join('||');
  const cacheKey = crypto.createHash('md5').update(targetLang + '::' + titlesKey).digest('hex');
  const cached = newsTranslationCache[cacheKey];
  if (cached && Date.now() - cached.at < 60*60*1000) {
    console.log('[news-translate] CACHE HIT ' + targetLang);
    return cached.items;
  }
"""
new_tn = """async function translateNewsItems(items, targetLang){
  if (!items || !items.length || targetLang === 'ru') return items;
  const langNames = { en:'English', zh:'Chinese', tr:'Turkish' };
  const langName = langNames[targetLang] || 'English';
  // 1. Дисковый кэш переводов
  if (newsCache.translations && Array.isArray(newsCache.translations[targetLang]) &&
      newsCache.translations[targetLang].length === items.length){
    console.log('[news-translate] CACHE HIT (disk) ' + targetLang);
    return newsCache.translations[targetLang];
  }
  // 2. Память-кэш
  const titlesKey = items.slice(0, 30).map(function(x){ return String(x.title||'').slice(0,120); }).join('||');
  const cacheKey = crypto.createHash('md5').update(targetLang + '::' + titlesKey).digest('hex');
  const cached = newsTranslationCache[cacheKey];
  if (cached && Date.now() - cached.at < 60*60*1000) {
    console.log('[news-translate] CACHE HIT ' + targetLang);
    if (!newsCache.translations) newsCache.translations = {};
    newsCache.translations[targetLang] = cached.items;
    saveNewsCacheToDisk();
    return cached.items;
  }
"""
if 'CACHE HIT (disk)' in s:
    print('SKIP: translateNewsItems уже смотрит в дисковый кэш')
elif old_tn in s:
    s = s.replace(old_tn, new_tn, 1)
    print('OK: translateNewsItems → дисковый кэш')
else:
    print('WARN: translateNewsItems anchor не найден')

# 3. При сохранении перевода — писать в newsCache + на диск
old_save = """  newsTranslationCache[cacheKey] = { at: Date.now(), items: translated };
  console.log('[news-translate] ' + targetLang + ' OK (' + translated.length + ' items)');
  return translated;
}"""
new_save = """  newsTranslationCache[cacheKey] = { at: Date.now(), items: translated };
  if (!newsCache.translations) newsCache.translations = {};
  newsCache.translations[targetLang] = translated;
  saveNewsCacheToDisk();
  console.log('[news-translate] ' + targetLang + ' OK (' + translated.length + ' items) + saved to disk');
  return translated;
}"""
if '+ saved to disk' in s:
    print('SKIP: сохранение уже есть')
elif old_save in s:
    s = s.replace(old_save, new_save, 1)
    print('OK: переводы сохраняются на диск')
else:
    print('WARN: anchor сохранения перевода не найден')

# 4. fetchNews: сбрасываем переводы при обновлении + запускаем прогрев
old_fn = """  newsCache.at = Date.now();
  newsCache.items = items;
  return items;
}"""
new_fn = """  newsCache.at = Date.now();
  newsCache.items = items;
  newsCache.translations = {}; // сбрасываем устаревшие переводы
  saveNewsCacheToDisk();
  // Фоновый прогрев переводов
  warmNewsTranslations().catch(function(e){ console.warn('[news-warm] ' + e.message); });
  return items;
}

async function warmNewsTranslations(){
  if (!newsCache.items.length) return;
  console.log('[news-warm] старт прогрева переводов...');
  for (const lg of ['en','zh','tr']){
    try {
      if (newsCache.translations && newsCache.translations[lg]) { console.log('[news-warm] ' + lg + ' уже есть'); continue; }
      await translateNewsItems(newsCache.items, lg);
      await sleep(1500);
    } catch(e){ console.warn('[news-warm] ' + lg + ' fail: ' + e.message); }
  }
  console.log('[news-warm] готово');
}"""
if 'warmNewsTranslations' in s and 'newsCache.translations = {}' in s:
    print('SKIP: прогрев уже есть')
elif old_fn in s:
    s = s.replace(old_fn, new_fn, 1)
    print('OK: fetchNews → прогрев переводов в фоне')
else:
    print('WARN: fetchNews anchor не найден')

# 5. При старте — если кэш есть, но переводов нет, прогреть
if 'setTimeout(function(){ warmNewsTranslations' not in s:
    old_listen = "app.listen(PORT, function(){\n  console.log('iomastavka listening on ' + PORT);"
    new_listen = "app.listen(PORT, function(){\n  console.log('iomastavka listening on ' + PORT);\n  setTimeout(function(){ if (newsCache.items.length && (!newsCache.translations || !newsCache.translations.en)){ console.log('[startup] прогрев переводов новостей...'); warmNewsTranslations().catch(function(){}); } }, 20000);"
    if old_listen in s:
        s = s.replace(old_listen, new_listen, 1)
        print('OK: прогрев переводов при старте')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 8A: шрифты статьи ========== */

/* 1. Заголовок статьи — как бренд iomastavka */
.article-title h1,
.article-body-full h1,
.article-body-full h2,
.article-body-full h3{
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif !important;
  font-weight: 700 !important;
  letter-spacing: -1.5px !important;
  line-height: 1.15 !important;
}
.article-title h1{
  letter-spacing: -1.8px !important;
  font-size: 40px !important;
}
.article-body-full h1{ font-size: 28px !important; letter-spacing: -1.2px !important; }
.article-body-full h2{ font-size: 24px !important; letter-spacing: -1px !important; }
.article-body-full h3{ font-size: 19px !important; letter-spacing: -.6px !important; }

/* 2. Текст статьи — тонкий, лаконичный, как у Apple */
.article-body-full,
.article-body-full p,
.article-body-full li,
.article-body-full td{
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif !important;
  font-weight: 300 !important;
  font-size: 16.5px !important;
  line-height: 1.82 !important;
  letter-spacing: -.1px !important;
  color: #2c4a5e !important;
}
.article-body-full strong{
  font-weight: 600 !important;
  color: #143e56 !important;
}
.article-body-full em{ font-style: italic !important; }

/* 3. Подзаголовок статьи — тоже тонкий */
.article-subtitle{
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif !important;
  font-weight: 300 !important;
  font-size: 18px !important;
  line-height: 1.6 !important;
  letter-spacing: -.15px !important;
}

/* 4. Тёмная тема */
body.manual-dark .article-body-full,
body.manual-dark .article-body-full p,
body.manual-dark .article-body-full li,
body.manual-dark .article-body-full td{
  color: #d8eaf0 !important;
}
body.manual-dark .article-body-full strong{ color: #ffffff !important; }

@media(max-width: 700px){
  .article-title h1{ font-size: 26px !important; letter-spacing: -1.2px !important; }
  .article-body-full,
  .article-body-full p,
  .article-body-full li{ font-size: 15.5px !important; line-height: 1.78 !important; }
  .article-body-full h2{ font-size: 20px !important; letter-spacing: -.7px !important; }
  .article-body-full h3{ font-size: 17px !important; }
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок 8A добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>119', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>119', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v119')
print('===== ГОТОВО =====')
