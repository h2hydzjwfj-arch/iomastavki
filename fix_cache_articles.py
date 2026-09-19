import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# ========== 1. Инициализация кэша ==========
if 'function getCachedArticle' not in s:
    anchor = s.find('async function fetchArticleSource')
    if anchor < 0:
        anchor = s.find('function buildTemplate')
    if anchor < 0:
        print('❌ Не нашёл anchor')
        exit()
    
    block = '''// ========== Дисковый кэш статей ==========
const ARTICLE_CACHE_DIR = path.join(DATA_DIR, 'articles-cache');
try { fs.mkdirSync(ARTICLE_CACHE_DIR, { recursive: true }); } catch(e){}

function articleKey(title, lang){
  const norm = String(title||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '').slice(0, 100);
  return crypto.createHash('md5').update(norm + '::' + lang).digest('hex');
}
function articleCachePath(title, lang){
  return path.join(ARTICLE_CACHE_DIR, articleKey(title, lang) + '.json');
}
function getCachedArticle(title, lang){
  try {
    const file = articleCachePath(title, lang);
    if (!fs.existsSync(file)) return null;
    const st = fs.statSync(file);
    // Кэш живёт 7 дней
    if (Date.now() - st.mtimeMs > 7*24*60*60*1000) return null;
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    return d.article || null;
  } catch(e){ return null; }
}
function saveCachedArticle(title, lang, article){
  try {
    const file = articleCachePath(title, lang);
    fs.writeFileSync(file, JSON.stringify({ title, lang, article, cachedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch(e){ console.warn('[article-cache] save error:', e.message); }
}
function countCachedArticles(){
  try { return fs.readdirSync(ARTICLE_CACHE_DIR).filter(function(f){ return f.endsWith('.json'); }).length; } catch(e){ return 0; }
}
console.log('[article-cache] dir=' + ARTICLE_CACHE_DIR + ' files=' + countCachedArticles());

'''
    s = s[:anchor] + block + s[anchor:]
    print('OK: кэш статей добавлен')

# ========== 2. Заменяем /api/news/article на версию с кэшем ==========
start = s.find("app.post('/api/news/article'")
end = s.find("app.post('/api/news/article/audio'", start)
if end < 0:
    end = s.find("app.post('/api/transcribe'", start)

if start < 0 or end <= start:
    print('❌ не нашёл endpoint')
    exit()
print('OK: заменю /api/news/article с ' + str(start) + ' до ' + str(end))

new_ep = '''app.post('/api/news/article', async function(req,res){
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ ok:false, error:'Title required' });
  const language = String(req.body?.language || 'ru').toLowerCase().slice(0,2);
  const description = String(req.body?.description || '');
  const sourceName = String(req.body?.source || '');
  const sourceLink = String(req.body?.link || '');
  const cleanTitle = stripSource ? stripSource(title) : title;

  // 1. Проверяем кэш (на диске) — по ключу title+lang
  const cached = getCachedArticle(cleanTitle, language);
  if (cached){
    console.log('[article] CACHE HIT (' + language + '): ' + cleanTitle.slice(0,50));
    return res.json({ ok:true, article: cached, fromCache: true });
  }
  console.log('[article] CACHE MISS (' + language + '): ' + cleanTitle.slice(0,50));

  // 2. Если есть RU в кэше, но нужен другой язык — переводим RU
  if (language !== 'ru'){
    const ruCached = getCachedArticle(cleanTitle, 'ru');
    if (ruCached){
      console.log('[article] RU cache есть, перевожу на ' + language);
      try {
        const LANG = language==='en'?'English':language==='tr'?'Turkish':'Chinese';
        const sys = 'Translate this article to ' + LANG + '. Output ONLY valid JSON with keys: title, subtitle, content, podcast. Preserve markdown in content.';
        const usr = 'Translate to ' + LANG + ':\\n\\n' + JSON.stringify({title:ruCached.title, subtitle:ruCached.subtitle||'', content:String(ruCached.content||'').slice(0,6000), podcast:String(ruCached.podcast||'').slice(0,800)});
        const translated = await aiChatJSON(sys, usr, 4000);
        if (translated && translated.content){
          translated.source = sourceName;
          translated.image = ruCached.image || '';
          saveCachedArticle(cleanTitle, language, translated);
          return res.json({ ok:true, article: translated, fromCache: false, translated: true });
        }
      } catch(e){ console.warn('[article] translate error: ' + e.message); }
    }
  }

  // 3. Генерируем с нуля (только RU если языка нет)
  if (!process.env.GROQ_API_KEY && !process.env.DEEPSEEK_API_KEY){
    const tpl = buildTemplate(cleanTitle, description, sourceName, '');
    tpl.source = sourceName;
    saveCachedArticle(cleanTitle, language, tpl);
    return res.json({ ok:true, article: tpl, fromCache: false });
  }

  const LANG = language==='en'?'English':language==='tr'?'Turkish':language==='zh'?'Chinese':'Russian';
  const sys = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Be specific with numbers, laws, terms. Return JSON only.';
  const usr = 'Write a detailed analytical article in ' + LANG + ' (900-1300 words). Topic: ' + cleanTitle + '. Source: ' + sourceName + '. Description: ' + description + '.\\n\\nReturn JSON: {"title":"...","subtitle":"...","content":"markdown with ## headings","podcast":"short script","image_query":"cargo logistics"}';
  let article = null;
  for (let att = 1; att <= 2; att++){
    try {
      article = await aiChatJSON(sys, usr, 4000);
      if (article && article.content) break;
    } catch(e){
      console.warn('[article] attempt ' + att + ': ' + e.message);
      if (att < 2) await sleep(3000);
    }
  }
  if (!article || !article.content) article = buildTemplate(cleanTitle, description, sourceName, '');
  article.source = sourceName;
  const mainQuery = String(article.image_query || '').trim() || defaultImgQuery(cleanTitle);
  article.image = await fetchPexelsImage(mainQuery) || '';

  // 4. Сохраняем в кэш
  saveCachedArticle(cleanTitle, language, article);

  res.json({ ok:true, article, fromCache: false });
});

// Служебный endpoint — сколько статей в кэше
app.get('/api/articles/cache-stats', function(req,res){
  res.json({ ok:true, count: countCachedArticles(), dir: ARTICLE_CACHE_DIR });
});

'''
s = s[:start] + new_ep + s[end:]
print('OK: endpoint заменён')
open(p, 'w', encoding='utf-8').write(s)

# Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>92', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>92', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v92')
print('===== ГОТОВО =====')
