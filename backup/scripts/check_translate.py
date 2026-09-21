p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

if 'translateNewsItems' in s:
    print('OK: translateNewsItems есть в server.js')
else:
    print('FAIL: translateNewsItems НЕТ — нужно добавить')
    # Найдём старый обработчик /api/news и заменим
    old = "app.get('/api/news', async function(req,res){"
    idx = s.find(old)
    if idx < 0:
        print('FAIL: /api/news не найден')
    else:
        # Найдём конец функции
        end_idx = s.find('\n});', idx)
        if end_idx < 0:
            print('FAIL: конец /api/news не найден')
        else:
            end_idx += 4
            new_block = '''const newsTranslateCache = {};

async function translateNewsItems(items, targetLang){
  if (targetLang === 'ru' || !items.length) return items;
  const langNames = {en:'English', tr:'Turkish', zh:'Chinese'};
  const langName = langNames[targetLang] || 'English';
  const key = targetLang + '_' + items.length + '_' + normalizeText(items[0].title).slice(0,30);
  const c = newsTranslateCache[key];
  if (c && Date.now() - c.at < 30*60*1000) return c.items;

  const titlesBlock = items.slice(0, 25).map(function(x, i){
    return (i+1) + '. ' + String(x.title||'').replace(/\\n/g,' ').slice(0,180) + ' ||| ' + String(x.description||'').replace(/\\n/g,' ').slice(0,180);
  }).join('\\n');

  const system = 'Ты переводчик новостей про логистику. Переводишь с русского на ' + langName + '. Отвечай ТОЛЬКО валидным JSON-объектом без markdown и без пояснений.';
  const user = 'Переведи ' + items.slice(0,25).length + ' новостей на ' + langName + ' язык.\\n\\nНовости:\\n' + titlesBlock + '\\n\\nВерни JSON-объект: {"items":[{"title":"...","description":"..."}]} с ровно ' + items.slice(0,25).length + ' элементами.';

  try {
    const translated = await aiChatJSON(system, user, 4000);
    if (translated && Array.isArray(translated.items) && translated.items.length === items.slice(0,25).length){
      const result = items.map(function(x, i){
        if (i >= 25 || !translated.items[i]) return x;
        return Object.assign({}, x, {
          title: String(translated.items[i].title || x.title),
          description: String(translated.items[i].description || x.description)
        });
      });
      newsTranslateCache[key] = {at: Date.now(), items: result};
      console.log('[translateNews] ' + targetLang + ' OK (' + result.length + ' items)');
      return result;
    } else {
      console.warn('[translateNews] неверный формат ответа от AI');
    }
  } catch (e) { console.warn('[translateNews] ошибка:', e.message); }
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
  } catch (e) { console.warn('News endpoint error:', e.message); }
  try { items = await translateNewsItems(items, targetLang); }
  catch (e) { console.warn('Translation error:', e.message); }
  res.json({ok:true, updatedAt: newsCache.at, lang: targetLang, items: items});
});
'''
            s = s[:idx] + new_block + s[end_idx:]
            open(p, 'w', encoding='utf-8').write(s)
            print('OK: /api/news заменён с переводом')
