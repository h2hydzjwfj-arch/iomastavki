import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Дисковый кэш статей + аудио (Map)
if 'const ARTICLE_CACHE_DIR' not in s:
    anchor = s.find('async function fetchArticleSource')
    if anchor < 0:
        anchor = s.find('function buildTemplate')
    if anchor < 0:
        anchor = s.find('app.post(')
    
    block = '''// ========== Кэш статей (диск) + аудио (память) ==========
const ARTICLE_CACHE_DIR = path.join(DATA_DIR, 'articles-cache');
try { fs.mkdirSync(ARTICLE_CACHE_DIR, { recursive: true }); } catch(e){}

function articleCacheKey(title, lang){
  const norm = String(title||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '').slice(0, 100);
  return crypto.createHash('md5').update(norm + '::' + lang).digest('hex');
}
function articleCachePath(title, lang){
  return path.join(ARTICLE_CACHE_DIR, articleCacheKey(title, lang) + '.json');
}
function getCachedArticle(title, lang){
  try {
    const file = articleCachePath(title, lang);
    if (!fs.existsSync(file)) return null;
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs > 7*24*60*60*1000) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')).article || null;
  } catch(e){ return null; }
}
function saveCachedArticle(title, lang, article){
  try {
    fs.writeFileSync(articleCachePath(title, lang), JSON.stringify({ title, lang, article, cachedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch(e){ console.warn('[cache] save:', e.message); }
}
function countCachedArticles(){
  try { return fs.readdirSync(ARTICLE_CACHE_DIR).filter(function(f){ return f.endsWith('.json'); }).length; } catch(e){ return 0; }
}

// Аудио кэш в памяти
const AUDIO_CACHE = new Map();
const AUDIO_CACHE_MAX = 30;
function audioKey(text, lang){
  return crypto.createHash('md5').update(lang + '::' + String(text||'').slice(0,2000)).digest('hex');
}
function getCachedAudio(key){
  const e = AUDIO_CACHE.get(key);
  if (!e) return null;
  if (Date.now() - e.at > 6*60*60*1000){ AUDIO_CACHE.delete(key); return null; }
  return e.buf;
}
function setCachedAudio(key, buf){
  if (AUDIO_CACHE.size >= AUDIO_CACHE_MAX){
    const first = AUDIO_CACHE.keys().next().value;
    if (first) AUDIO_CACHE.delete(first);
  }
  AUDIO_CACHE.set(key, { buf, at: Date.now() });
}

console.log('[article-cache] dir=' + ARTICLE_CACHE_DIR + ' files=' + countCachedArticles());

'''
    if anchor > 0:
        s = s[:anchor] + block + s[anchor:]
        print('OK: server.js — дисковый кэш + аудио кэш')
    else:
        print('❌ anchor не найден')

# 2. Обновляем synthesizeEdge с кэшем
m = re.search(r'async function synthesizeEdge\(text, lang\)\{[\s\S]*?\n\}\n', s)
if m:
    new_fn = '''async function synthesizeEdge(text, lang){
  const voice = EDGE_VOICES[lang] || EDGE_VOICES.ru;
  const clean = String(text||'').replace(/[#*`>]/g,' ').replace(/\\s+/g,' ').trim();
  const ck = audioKey(clean, voice);
  const cached = getCachedAudio(ck);
  if (cached){
    console.log('[edge-tts] CACHE HIT (' + cached.length + ' bytes)');
    return cached;
  }
  const MAX = 1500;
  const parts = [];
  let rest = clean;
  while (rest.length > 0){
    let cut = Math.min(MAX, rest.length);
    if (cut < rest.length){
      const end = Math.max(rest.lastIndexOf('. ', cut), rest.lastIndexOf('? ', cut), rest.lastIndexOf('! ', cut));
      if (end > MAX*0.4) cut = end+1;
    }
    parts.push(rest.slice(0,cut).trim());
    rest = rest.slice(cut).trim();
    if (parts.length > 25) break;
  }
  console.log('[edge-tts] voice=' + voice + ' parts=' + parts.length + ' (parallel x2)');
  const buffers = new Array(parts.length);
  const CONCURRENCY = 2;
  for (let i = 0; i < parts.length; i += CONCURRENCY){
    const promises = [];
    for (let j = i; j < Math.min(i + CONCURRENCY, parts.length); j++){
      promises.push((async function(idx){
        const tmp = path.join(os.tmpdir(), 'edge-tts-' + crypto.randomBytes(6).toString('hex') + '.mp3');
        try {
          await runEdgeTts(parts[idx], voice, tmp);
          buffers[idx] = fs.readFileSync(tmp);
        } finally {
          try { fs.unlinkSync(tmp); } catch(e){}
        }
      })(j));
    }
    await Promise.all(promises);
  }
  const result = Buffer.concat(buffers.filter(Boolean));
  setCachedAudio(ck, result);
  return result;
}
'''
    s = s[:m.start()] + new_fn + s[m.end():]
    print('OK: synthesizeEdge — с кэшем')

# 3. Модифицируем /api/news/article чтобы сначала смотрел в кэш
m = re.search(r"app\.post\('/api/news/article',[\s\S]*?\n\}\);", s)
if m and 'getCachedArticle(cleanTitle' not in m.group(0):
    new_ep = '''app.post('/api/news/article', async function(req,res){
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ ok:false, error:'Title required' });
  const language = String(req.body?.language || 'ru').toLowerCase().slice(0,2);
  const description = String(req.body?.description || '');
  const sourceName = String(req.body?.source || '');
  const cleanTitle = stripSource ? stripSource(title) : title;

  // 1. Кэш на диске
  const cached = getCachedArticle(cleanTitle, language);
  if (cached){
    console.log('[article] CACHE HIT (' + language + '): ' + cleanTitle.slice(0,50));
    return res.json({ ok:true, article: cached, fromCache: true });
  }
  console.log('[article] CACHE MISS (' + language + '): ' + cleanTitle.slice(0,50));

  if (!process.env.GROQ_API_KEY && !process.env.DEEPSEEK_API_KEY){
    const tpl = buildTemplate(cleanTitle, description, sourceName, '');
    tpl.source = sourceName;
    saveCachedArticle(cleanTitle, language, tpl);
    return res.json({ ok:true, article: tpl });
  }
  const LANG = language==='en'?'English':language==='tr'?'Turkish':language==='zh'?'Chinese':'Russian';
  const sys = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Be specific with numbers, laws, terms. Return JSON only.';
  const usr = 'Write a detailed analytical article in ' + LANG + ' (900-1300 words). Topic: ' + cleanTitle + '. Source: ' + sourceName + '. Description: ' + description + '.\\n\\nReturn JSON: {"title":"...","subtitle":"...","content":"markdown with ## headings","podcast":"short script","image_query":"cargo logistics"}';
  let article = null;
  for (let att = 1; att <= 2; att++){
    try { article = await aiChatJSON(sys, usr, 4000); if (article && article.content) break; }
    catch(e){ console.warn('[article] attempt ' + att + ': ' + e.message); if (att < 2) await sleep(3000); }
  }
  if (!article || !article.content) article = buildTemplate(cleanTitle, description, sourceName, '');
  article.source = sourceName;
  const mainQuery = String(article.image_query || '').trim() || defaultImgQuery(cleanTitle);
  article.image = await fetchPexelsImage(mainQuery) || '';
  saveCachedArticle(cleanTitle, language, article);
  res.json({ ok:true, article });
});
'''
    s = s[:m.start()] + new_ep + s[m.end():]
    print('OK: /api/news/article — с кэшем')

# 4. Добавляем endpoint /api/articles/cache-stats
if '/api/articles/cache-stats' not in s:
    anchor = s.find('app.listen(')
    block = '''app.get('/api/articles/cache-stats', function(req,res){
  res.json({ ok:true, articles: countCachedArticles(), audio: AUDIO_CACHE.size });
});

// Прогрев кэша статей в фоне
app.post('/api/articles/prewarm', function(req,res){
  const n = Math.min(10, Math.max(1, Number(req.body?.n) || 5));
  (async function(){
    let items = newsCache.items;
    if (!items.length) items = await fetchNews();
    const top = items.slice(0, n);
    for (const item of top){
      const cleanTitle = stripSource ? stripSource(item.title) : item.title;
      if (getCachedArticle(cleanTitle, 'ru')) continue;
      try {
        const LANG = 'Russian';
        const sys = 'You are an expert logistics editor. Write in Russian ONLY. Return JSON only.';
        const usr = 'Write a detailed analytical article in Russian (900-1300 words). Topic: ' + cleanTitle + '. Source: ' + (item.source||'') + '. Description: ' + (item.description||'') + '.\\n\\nReturn JSON: {"title":"...","subtitle":"...","content":"markdown","podcast":"script","image_query":"cargo logistics"}';
        let article = null;
        for (let att = 1; att <= 2; att++){
          try { article = await aiChatJSON(sys, usr, 3500); if (article && article.content) break; } catch(e){ if (att < 2) await sleep(4000); }
        }
        if (!article || !article.content) article = buildTemplate(cleanTitle, item.description || '', item.source || '', '');
        article.source = item.source || '';
        article.image = await fetchPexelsImage(defaultImgQuery(cleanTitle)) || item.image || '';
        saveCachedArticle(cleanTitle, 'ru', article);
        console.log('[prewarm] OK: ' + cleanTitle.slice(0,40));
        await sleep(2500);
      } catch(e){ console.warn('[prewarm] ' + e.message); }
    }
    console.log('[prewarm] done');
  })().catch(function(){});
  res.json({ ok:true, started: true, n });
});

'''
    if anchor > 0:
        s = s[:anchor] + block + s[anchor:]
        print('OK: /api/articles/cache-stats + prewarm добавлены')

# 5. Автопрогрев при старте (через 60 сек, чтобы не сразу жечь лимит)
if 'setTimeout(function(){ console.log("[startup] prewarm' not in s:
    s = s.replace(
        "app.listen(PORT, function(){ console.log('iomastavka listening on ' + PORT); });",
        '''app.listen(PORT, function(){
  console.log('iomastavka listening on ' + PORT);
  setTimeout(function(){
    console.log('[startup] автопрогрев 5 статей в фоне...');
    fetch('http://localhost:' + PORT + '/api/articles/prewarm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ n:5 }) }).catch(function(){});
  }, 60000);
});'''
    )
    print('OK: автопрогрев через 60 сек после старта')

# Версия
s = s.replace("version:'80'", "version:'98'")
open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')
print('===== ГОТОВО =====')
