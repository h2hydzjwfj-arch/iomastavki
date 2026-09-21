import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# ============ 1. Инициализация директорий кэша ============
if 'function ensureArticleCacheDir' not in s:
    anchor = s.find('function safeReadRates()')
    if anchor < 0: anchor = 0
    
    block = '''// ============ Дисковый кэш статей и переводов ============
const ARTICLE_CACHE_DIR = path.join(DATA_DIR, 'articles-cache');
const AGENTS_CACHE_DIR = path.join(DATA_DIR, 'agents-cache');

function ensureCacheDirs(){
  try { fs.mkdirSync(ARTICLE_CACHE_DIR, { recursive: true }); } catch(e){}
  try { fs.mkdirSync(AGENTS_CACHE_DIR, { recursive: true }); } catch(e){}
}
ensureCacheDirs();

function normalizeTitleKey(t){
  return String(t||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '').slice(0, 80);
}

function articleCachePath(titleRu){
  const k = crypto.createHash('md5').update(normalizeTitleKey(titleRu)).digest('hex');
  return path.join(ARTICLE_CACHE_DIR, k + '.json');
}

function readArticleCache(titleRu){
  try {
    const file = articleCachePath(titleRu);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e){ return null; }
}

function writeArticleCache(titleRu, data){
  try {
    const file = articleCachePath(titleRu);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch(e){ console.warn('[article-cache] write error:', e.message); }
}

function getCachedArticleByLang(titleRu, langCode){
  const c = readArticleCache(titleRu);
  if (!c) return null;
  return (c.byLang && c.byLang[langCode]) || null;
}

function saveArticleToCache(titleRu, langCode, article){
  const c = readArticleCache(titleRu) || { titleRu: titleRu, createdAt: new Date().toISOString(), byLang: {} };
  c.byLang = c.byLang || {};
  c.byLang[langCode] = Object.assign({}, article, { _cachedAt: new Date().toISOString() });
  c.updatedAt = new Date().toISOString();
  writeArticleCache(titleRu, c);
}

function listCachedArticles(){
  try {
    if (!fs.existsSync(ARTICLE_CACHE_DIR)) return [];
    const out = [];
    const files = fs.readdirSync(ARTICLE_CACHE_DIR);
    for (const f of files){
      if (!f.endsWith('.json')) continue;
      try { out.push(JSON.parse(fs.readFileSync(path.join(ARTICLE_CACHE_DIR, f), 'utf8'))); } catch(e){}
    }
    return out;
  } catch(e){ return []; }
}

// Фоновый перевод статьи на все языки
async function warmArticleTranslations(titleRu, baseArticle, sourceLink){
  if (!baseArticle || !baseArticle.content) return;
  // Сохраняем русскую версию
  saveArticleToCache(titleRu, 'ru', baseArticle);
  
  const targetLangs = ['en', 'zh', 'tr'];
  for (const tl of targetLangs){
    const existing = getCachedArticleByLang(titleRu, tl);
    if (existing && existing.content && existing.content.length > 200) {
      console.log('[warm] ' + tl + ' already cached');
      continue;
    }
    try {
      console.log('[warm] translating to ' + tl + ': ' + titleRu.slice(0,50));
      const translated = await translateArticleWithAI(baseArticle, tl);
      if (translated && translated.content){
        saveArticleToCache(titleRu, tl, translated);
        console.log('[warm] ' + tl + ' saved');
      }
      await sleep(1500);
    } catch(e){
      console.warn('[warm] ' + tl + ' failed:', e.message);
      await sleep(3000);
    }
  }
}

async function translateArticleWithAI(article, targetLang){
  const langNames = {en:'English', tr:'Turkish', zh:'Chinese', ru:'Russian'};
  const langName = langNames[targetLang] || 'English';
  const sourceJson = JSON.stringify({
    title: article.title || '',
    subtitle: article.subtitle || '',
    content: String(article.content || '').slice(0, 6000),
    podcast: String(article.podcast || '').slice(0, 800)
  });
  const system = 'You are a professional translator. Translate the following article to ' + langName + '. Output ONLY valid JSON with keys title, subtitle, content, podcast. Preserve markdown formatting in content. Do not leave any Russian text.';
  const user = 'Translate this article to ' + langName + '. Return JSON {\\"title\\":\\"...\\",\\"subtitle\\":\\"...\\",\\"content\\":\\"...\\",\\"podcast\\":\\"...\\"}:\\n\\n' + sourceJson;
  const result = await aiChatJSON(system, user, 4000);
  if (result && result.title && result.content){
    return {
      title: String(result.title),
      subtitle: String(result.subtitle || ''),
      content: String(result.content),
      podcast: String(result.podcast || ''),
      image: article.image || '',
      images: Array.isArray(article.images) ? article.images : [],
      source: article.source || '',
      _translated: true,
      _lang: targetLang
    };
  }
  throw new Error('AI не вернул перевод');
}

'''
    s = s[:anchor] + block + s[anchor:]
    print('OK: дисковый кэш добавлен')

# ============ 2. Переписываем /api/news/article ============
# Находим и заменяем весь endpoint
start = s.find("app.post('/api/news/article'")
end = s.find("app.post('/api/news/article/audio'", start)
if start < 0 or end <= start:
    start = s.find("app.post('/api/news/article'")
    end = s.find("app.post('/api/news/article/audio", start)
    if start < 0:
        # старый вариант
        end = s.find("app.post('/api/news/article/audio')", start)

if start > 0 and end > start:
    new_ep = '''app.post('/api/news/article', async function(req,res){
  const title = String((req.body && req.body.title) || '').trim();
  if (!title) return res.status(400).json({ok:false, error:'Article title required'});
  const language = String((req.body && req.body.language) || 'ru').toLowerCase().slice(0,2);
  const description = String((req.body && req.body.description) || '');
  const sourceName = String((req.body && req.body.source) || '');
  const sourceLink = String((req.body && req.body.link) || '');
  const cleanTitle = stripSourceFromTitleJs ? stripSourceFromTitleJs(title) : title;

  // 1) Смотрим кэш
  const cached = getCachedArticleByLang(cleanTitle, language);
  if (cached){
    console.log('[article] CACHE HIT ' + language + ': ' + cleanTitle.slice(0,50));
    return res.json({ok:true, article: cached, fromCache: true});
  }

  // 2) Если нужна русская — генерируем через AI
  if (language === 'ru'){
    const sourceText = await fetchArticleSource(sourceLink);
    const LANG = 'Russian';
    const systemPrompt = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Use specific terms, laws, numbers. Output JSON only.';
    const userPrompt = 'Write a detailed analytical article in Russian.\\n\\n' +
      'Тема: ' + cleanTitle + '\\n' +
      'Источник: ' + sourceName + '\\n' +
      'Описание: ' + description + '\\n' +
      (sourceText ? ('Оригинал: ' + sourceText.slice(0, 4000) + '\\n') : '') +
      '\\nТребования:\\n- 900-1300 слов\\n- Подзаголовки (## Заголовок)\\n- Будь конкретным: цифры, шаги, примеры\\n- В конце краткий аудио-сценарий\\n\\n' +
      'Верни JSON: {"title":"...","subtitle":"...","content":"...markdown...","podcast":"...","image_query":"cargo logistics"}';

    let article = null;
    let lastError = '';
    for (let attempt = 1; attempt <= 2; attempt++){
      try {
        console.log('[article] gen attempt ' + attempt);
        article = await aiChatJSON(systemPrompt, userPrompt, 4000);
        if (article && article.content) break;
        throw new Error('Пустой ответ');
      } catch(e){
        lastError = e.message;
        article = null;
        if (attempt < 2) await sleep(3000);
      }
    }
    if (!article || !article.content){
      console.warn('[article] Шаблон. Причина: ' + lastError);
      article = buildTemplateArticle(cleanTitle, description, sourceName, sourceText);
    }
    article.source = sourceName;

    // Обложка
    let mainQuery = String(article.image_query || '').trim();
    if (!mainQuery || /[а-яё]/i.test(mainQuery)) mainQuery = defaultImageQueries(cleanTitle)[0];
    mainQuery = mainQuery.split(/\\s+/).slice(0, 4).join(' ');
    let mainImage = null;
    const queries = [mainQuery].concat(defaultImageQueries(cleanTitle)).slice(0, 5);
    for (const q of queries){
      const img = await fetchPexelsImage(q);
      if (img){ mainImage = img; break; }
    }
    article.image = mainImage || '';
    article.images = [];

    // Сохраняем + запускаем фоновый прогрев на другие языки
    saveArticleToCache(cleanTitle, 'ru', article);
    setImmediate(function(){ warmArticleTranslations(cleanTitle, article, sourceLink).catch(function(){}); });

    return res.json({ok:true, article: article, fromCache: false});
  }

  // 3) Нужен другой язык, но в кэше нет — генерируем русский, потом переводим
  console.log('[article] нет ' + language + ' в кэше — генерирую русский → перевод');
  try {
    const ruResp = await new Promise(function(resolve, reject){
      // Вызываем локально ту же логику через http (проще — через прямой вызов)
      // Но проще — сгенерировать и перевести сразу
      resolve(null);
    });
    // Простой вариант: сгенерировать русскую и сразу перевести
    const sourceText = await fetchArticleSource(sourceLink);
    const systemPrompt = 'You are an expert logistics editor. Write in Russian ONLY. Use specific terms, laws, numbers. Output JSON only.';
    const userPrompt = 'Write a detailed analytical article in Russian.\\n\\nТема: ' + cleanTitle + '\\nИсточник: ' + sourceName + '\\nОписание: ' + description + '\\n' +
      (sourceText ? ('Оригинал: ' + sourceText.slice(0, 4000) + '\\n') : '') +
      '\\nВерни JSON: {"title":"...","subtitle":"...","content":"...markdown...","podcast":"...","image_query":"cargo logistics"}';
    let ruArticle = null;
    for (let attempt = 1; attempt <= 2; attempt++){
      try {
        ruArticle = await aiChatJSON(systemPrompt, userPrompt, 4000);
        if (ruArticle && ruArticle.content) break;
      } catch(e){ if (attempt < 2) await sleep(3000); }
    }
    if (!ruArticle || !ruArticle.content){
      ruArticle = buildTemplateArticle(cleanTitle, description, sourceName, sourceText);
    }
    ruArticle.source = sourceName;
    // Картинка
    let mainQuery = String(ruArticle.image_query || '').trim();
    if (!mainQuery || /[а-яё]/i.test(mainQuery)) mainQuery = defaultImageQueries(cleanTitle)[0];
    let mainImage = null;
    const queries = [mainQuery.split(/\\s+/).slice(0,4).join(' ')].concat(defaultImageQueries(cleanTitle)).slice(0, 5);
    for (const q of queries){
      const img = await fetchPexelsImage(q);
      if (img){ mainImage = img; break; }
    }
    ruArticle.image = mainImage || '';
    ruArticle.images = [];
    saveArticleToCache(cleanTitle, 'ru', ruArticle);

    // Теперь переводим на запрошенный язык
    try {
      const translated = await translateArticleWithAI(ruArticle, language);
      translated.source = sourceName;
      translated.image = ruArticle.image;
      saveArticleToCache(cleanTitle, language, translated);
      // И фоново — на остальные
      setImmediate(function(){ warmArticleTranslations(cleanTitle, ruArticle, sourceLink).catch(function(){}); });
      return res.json({ok:true, article: translated, fromCache: false, translated: true});
    } catch(e){
      console.warn('[article] перевод упал, отдаю шаблон на ' + language);
      const tpl = buildTemplateArticle(cleanTitle, description, sourceName, sourceText);
      tpl.source = sourceName;
      tpl.image = ruArticle.image;
      saveArticleToCache(cleanTitle, language, tpl);
      return res.json({ok:true, article: tpl, fromCache: false, translated: false});
    }
  } catch(e){
    return res.status(502).json({ok:false, error: e.message || 'Article unavailable'});
  }
});

// Быстрая проверка — есть ли статья в кэше на нужном языке
app.post('/api/news/article/check', function(req,res){
  const title = String((req.body && req.body.title) || '').trim();
  const language = String((req.body && req.body.language) || 'ru').toLowerCase().slice(0,2);
  if (!title) return res.json({ok:false});
  const cleanTitle = stripSourceFromTitleJs ? stripSourceFromTitleJs(title) : title;
  const cached = getCachedArticleByLang(cleanTitle, language);
  res.json({ok:true, ready: !!cached, hasRu: !!getCachedArticleByLang(cleanTitle, 'ru')});
});

// Прогрев списка новостей — генерирует русские версии для топ-N в фоне
app.post('/api/news/prewarm', function(req,res){
  const N = Math.min(15, Math.max(1, Number(req.body && req.body.n) || 5));
  console.log('[prewarm] запускаю прогрев топ-' + N + ' новостей');
  prewarmNewsCache(N).catch(function(e){ console.warn('[prewarm] error:', e.message); });
  res.json({ok:true, started:true, n: N});
});

async function prewarmNewsCache(N){
  let items = [];
  try {
    if (Date.now() - newsCache.at < 6*60*60*1000 && newsCache.items.length){
      items = newsCache.items;
    } else {
      items = await fetchNews();
    }
  } catch(e){ return; }
  const top = items.slice(0, N);
  console.log('[prewarm] ' + top.length + ' статей');
  for (const item of top){
    const cleanTitle = stripSourceFromTitleJs ? stripSourceFromTitleJs(item.title) : item.title;
    if (getCachedArticleByLang(cleanTitle, 'ru')) {
      console.log('[prewarm] skip (cached): ' + cleanTitle.slice(0,40));
      continue;
    }
    try {
      const sourceText = await fetchArticleSource(item.link || '');
      const systemPrompt = 'You are an expert logistics editor. Write in Russian ONLY. Use specific terms, laws, numbers. Output JSON only.';
      const userPrompt = 'Write a detailed analytical article in Russian.\\n\\nТема: ' + cleanTitle + '\\nИсточник: ' + (item.source||'') + '\\nОписание: ' + (item.description||'') + '\\n' +
        (sourceText ? ('Оригинал: ' + sourceText.slice(0, 3000) + '\\n') : '') +
        '\\nВерни JSON: {"title":"...","subtitle":"...","content":"...markdown...","podcast":"...","image_query":"cargo logistics"}';
      let article = null;
      for (let att = 1; att <= 2; att++){
        try {
          article = await aiChatJSON(systemPrompt, userPrompt, 3500);
          if (article && article.content) break;
        } catch(e){ if (att < 2) await sleep(4000); }
      }
      if (!article || !article.content) article = buildTemplateArticle(cleanTitle, item.description || '', item.source || '', sourceText);
      article.source = item.source || '';
      // Картинка
      let mainQuery = String(article.image_query || '').trim();
      if (!mainQuery || /[а-яё]/i.test(mainQuery)) mainQuery = defaultImageQueries(cleanTitle)[0];
      let mainImage = null;
      const queries = [mainQuery.split(/\\s+/).slice(0,4).join(' ')].concat(defaultImageQueries(cleanTitle)).slice(0, 4);
      for (const q of queries){
        const img = await fetchPexelsImage(q);
        if (img){ mainImage = img; break; }
      }
      article.image = mainImage || item.image || '';
      article.images = [];
      saveArticleToCache(cleanTitle, 'ru', article);
      console.log('[prewarm] OK: ' + cleanTitle.slice(0,40));
      // Фоновый прогрев на языки
      setImmediate(function(){ warmArticleTranslations(cleanTitle, article, item.link || '').catch(function(){}); });
      await sleep(2000);
    } catch(e){
      console.warn('[prewarm] error:', e.message);
    }
  }
  console.log('[prewarm] готово');
}

'''
    s = s[:start] + new_ep + s[end:]
    print('OK: /api/news/article + check + prewarm перезаписаны')
else:
    print('❌ не нашёл /api/news/article')

# ============ 3. Хелпер stripSourceFromTitleJs для сервера ============
if 'function stripSourceFromTitleJs' not in s:
    anchor = s.find('function cleanTitleFromSource')
    if anchor < 0:
        anchor = s.find('async function aiChatJSON')
        # Вставляем как отдельную функцию перед
    block = '''function stripSourceFromTitleJs(t){
  let x = String(t||'').trim();
  x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\\.[a-z]{2})?\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[A-Z][a-zA-Z]+(?:[\\s\\-][A-Z][a-zA-Z]+){0,2}\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[А-ЯЁ][а-яё]+(?:[\\s\\-][А-ЯЁ][а-яё]+){0,2}\\s*$/i, '');
  return x.trim();
}

'''
    if anchor > 0:
        s = s[:anchor] + block + s[anchor:]
        print('OK: stripSourceFromTitleJs добавлен')

# ============ 4. Автозапуск prewarm при старте сервера ============
if 'setTimeout(function(){ prewarmNewsCache(' not in s:
    old_listen = "app.listen(PORT, function(){ console.log('iomastavka listening on ' + PORT); });"
    new_listen = """app.listen(PORT, function(){
  console.log('iomastavka listening on ' + PORT);
  // Автопрогрев топ-10 новостей на всех языках — через 15 секунд после старта
  setTimeout(function(){
    console.log('[startup] автопрогрев статей...');
    prewarmNewsCache(10).catch(function(e){ console.warn('[startup] prewarm error:', e.message); });
  }, 15000);
});"""
    if old_listen in s:
        s = s.replace(old_listen, new_listen)
        print('OK: автопрогрев при старте сервера')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# Обновляем версию
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>70', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>70', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v70')
print('===== ГОТОВО =====')
