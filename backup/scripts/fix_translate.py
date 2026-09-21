p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Меняем /api/news чтобы принимал lang и переводил
old_handler = """app.get('/api/news', async function(req,res){
  let items = [];
  try {
    if (Date.now() - newsCache.at < 6*60*60*1000 && newsCache.items.length) {
      items = newsCache.items;
    } else {
      items = await fetchNews();
    }
  } catch (e) {
    console.warn('News endpoint error:', e.message);
  }
  res.json({ok:true, updatedAt: newsCache.at, items: items});
});"""

new_handler = """const newsTranslateCache = {};

async function translateNewsItems(items, targetLang){
  if (targetLang === 'ru' || !items.length) return items;
  const langNames = {en:'English', tr:'Turkish', zh:'Chinese'};
  const langName = langNames[targetLang] || 'English';
  const key = targetLang + '_' + items.map(function(x){return normalizeText(x.title).slice(0,30);}).join('_').slice(0,80);
  const c = newsTranslateCache[key];
  if (c && Date.now() - c.at < 30*60*1000) return c.items;

  const titlesBlock = items.map(function(x, i){ return (i+1) + '. ' + String(x.title||'').replace(/\\n/g,' ') + ' ||| ' + String(x.description||'').replace(/\\n/g,' ').slice(0,220); }).join('\\n');

  const system = 'Ты переводчик. Переводишь новости с русского на ' + langName + '. Отвечай ТОЛЬКО валидным JSON-объектом без markdown.';
  const user = 'Переведи каждую новость на ' + langName + '. Сохрани структуру. Не добавляй лишнего.\\n\\n' +
    'Новости:\\n' + titlesBlock + '\\n\\n' +
    'Верни JSON-объект: {"items":[{"title":"...","description":"..."}]}. Количество элементов = ' + items.length + '.';

  try {
    const translated = await aiChatJSON(system, user, 4000);
    if (translated && Array.isArray(translated.items) && translated.items.length === items.length){
      const result = items.map(function(x, i){
        return Object.assign({}, x, {
          title: String(translated.items[i].title || x.title),
          description: String(translated.items[i].description || x.description)
        });
      });
      newsTranslateCache[key] = {at: Date.now(), items: result};
      console.log('[translateNews] ' + targetLang + ' OK (' + items.length + ' items)');
      return result;
    }
  } catch (e) { console.warn('[translateNews] failed:', e.message); }
  return items;
}

app.get('/api/news', async function(req,res){
  const targetLang = String(req.query.lang || 'ru').toLowerCase().slice(0,2);
  let items = [];
  try {
    if (Date.now() - newsCache.at < 6*60*60*1000 && newsCache.items.length) {
      items = newsCache.items;
    } else {
      items = await fetchNews();
    }
  } catch (e) {
    console.warn('News endpoint error:', e.message);
  }
  try {
    items = await translateNewsItems(items, targetLang);
  } catch (e) { console.warn('Translation error:', e.message); }
  res.json({ok:true, updatedAt: newsCache.at, lang: targetLang, items: items});
});"""

if old_handler in s:
    s = s.replace(old_handler, new_handler)
    print('OK: /api/news с переводом')
else:
    print('WARN: /api/news не найден для замены')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js обновлён ====')
