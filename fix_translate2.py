import re
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Проверяем наличие aiChatJSON
if 'async function aiChatJSON' not in s:
    print('❌ НЕТ aiChatJSON — запусти сначала fix_json.py')
    exit()
else:
    print('✅ aiChatJSON есть')

# 2. Удаляем старую translateNewsItems если есть
s = re.sub(r'const newsTranslateCache = \{\};[\s\S]*?async function translateNewsItems[\s\S]*?\n\}\n', '', s, count=1)

# 3. Вставляем новую функцию ПЕРЕД app.get('/api/news'
idx = s.find("app.get('/api/news'")
if idx < 0:
    print('❌ /api/news не найден')
    exit()

fn = '''const newsTranslateCache = {};

async function translateNewsItems(items, targetLang){
  if (targetLang === 'ru' || !items || !items.length) return items;
  const langNames = {en:'English', tr:'Turkish', zh:'Chinese'};
  const langName = langNames[targetLang] || 'English';
  const cacheKey = targetLang + '_' + items.length + '_' + normalizeText(items[0].title).slice(0,30);
  const c = newsTranslateCache[cacheKey];
  if (c && Date.now() - c.at < 30*60*1000) { console.log('[translateNews] CACHE HIT ' + targetLang); return c.items; }

  const useItems = items.slice(0, 20);
  const titlesBlock = useItems.map(function(x, i){
    return (i+1) + '. ' + String(x.title||'').replace(/\\n/g,' ').slice(0,180) + ' ||| ' + String(x.description||'').replace(/\\n/g,' ').slice(0,180);
  }).join('\\n');

  const system = 'Ты переводчик. Переводи новости с русского на ' + langName + '. Отвечай ТОЛЬКО валидным JSON.';
  const user = 'Переведи ' + useItems.length + ' новостей на ' + langName + '.\\n\\n' + titlesBlock + '\\n\\nВерни JSON {"items":[{"title":"...","description":"..."}]} с ' + useItems.length + ' элементами.';

  try {
    console.log('[translateNews] START ' + targetLang + ' (' + useItems.length + ')');
    const translated = await aiChatJSON(system, user, 4000);
    if (translated && Array.isArray(translated.items) && translated.items.length === useItems.length){
      const result = items.map(function(x, i){
        if (i >= useItems.length || !translated.items[i]) return x;
        return Object.assign({}, x, {
          title: String(translated.items[i].title || x.title),
          description: String(translated.items[i].description || x.description)
        });
      });
      newsTranslateCache[cacheKey] = {at: Date.now(), items: result};
      console.log('[translateNews] DONE ' + targetLang);
      return result;
    } else {
      console.warn('[translateNews] BAD FORMAT');
    }
  } catch (e) { console.warn('[translateNews] ERROR:', e.message); }
  return items;
}

'''
s = s[:idx] + fn + s[idx:]

# 4. Заменяем сам обработчик /api/news
pattern = re.compile(r"app\.get\('/api/news',\s*async function\(req,res\)\{[\s\S]*?\n\}\);", re.MULTILINE)
new_ep = """app.get('/api/news', async function(req,res){
  const targetLang = String(req.query.lang || 'ru').toLowerCase().slice(0,2);
  console.log('[api/news] lang=' + targetLang);
  let items = [];
  try {
    if (Date.now() - newsCache.at < 6*60*60*1000 && newsCache.items.length) {
      items = newsCache.items;
    } else {
      items = await fetchNews();
    }
  } catch (e) { console.warn('News endpoint error:', e.message); }
  if (targetLang !== 'ru') {
    try { items = await translateNewsItems(items, targetLang); }
    catch (e) { console.warn('Translation error:', e.message); }
  }
  res.json({ok:true, updatedAt: newsCache.at, lang: targetLang, items: items});
});"""

s, n = pattern.subn(new_ep, s)
print('OK: /api/news заменён (' + str(n) + ')')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js обновлён ====')
