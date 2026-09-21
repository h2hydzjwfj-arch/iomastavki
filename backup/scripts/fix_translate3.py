import re
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем старую translateNewsItems
s = re.sub(r'const newsTranslateCache = \{\};[\s\S]*?async function translateNewsItems[\s\S]*?\n\}\n', '', s, count=1)

idx = s.find("app.get('/api/news'")
if idx < 0:
    print('❌ /api/news не найден')
    exit()

fn = '''const newsTranslateCache = {};

function hasCyrillic(t){
  return /[а-яё]/i.test(String(t||''));
}

async function translateNewsItems(items, targetLang){
  if (targetLang === 'ru' || !items || !items.length) return items;
  const langNames = {en:'English', tr:'Turkish', zh:'Chinese'};
  const langName = langNames[targetLang] || 'English';
  const cacheKey = targetLang + '_' + items.length + '_' + normalizeText(items[0].title).slice(0,30);
  const c = newsTranslateCache[cacheKey];
  if (c && Date.now() - c.at < 30*60*1000) { console.log('[translateNews] CACHE HIT'); return c.items; }

  // Переводим по 8 штук за раз, чтобы модель не путалась
  const BATCH = 8;
  const allTranslated = [];
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    const titlesBlock = batch.map(function(x, i){
      return (i+1) + '. TITLE: ' + String(x.title||'').replace(/\\n/g,' ').slice(0,200) + '\\n   DESC: ' + String(x.description||'').replace(/\\n/g,' ').slice(0,200);
    }).join('\\n');

    const system = 'You are a professional translator. Translate Russian logistics news headlines and descriptions to ' + langName + '. Output ONLY valid JSON. Every title and description MUST be in ' + langName + '. Never leave text in Russian.';
    const user = 'Translate ' + batch.length + ' news items from Russian to ' + langName + '.\\n\\n' + titlesBlock + '\\n\\nReturn JSON: {"items":[{"title":"...","description":"..."}]} with exactly ' + batch.length + ' items. ALL text must be in ' + langName + '.';

    try {
      console.log('[translateNews] BATCH ' + (start/BATCH + 1) + ' START');
      const translated = await aiChatJSON(system, user, 3500);
      if (translated && Array.isArray(translated.items)){
        console.log('[translateNews] BATCH returned ' + translated.items.length + ' items');
        console.log('[translateNews] sample title: ' + String(translated.items[0] && translated.items[0].title || '').slice(0, 100));
        for (let i = 0; i < batch.length; i++){
          const t = translated.items[i];
          if (t && t.title && !hasCyrillic(t.title)){
            allTranslated.push(Object.assign({}, batch[i], {
              title: String(t.title),
              description: String(t.description || batch[i].description)
            }));
          } else {
            allTranslated.push(batch[i]);
          }
        }
      } else {
        console.warn('[translateNews] BAD FORMAT — keeping batch');
        for (const b of batch) allTranslated.push(b);
      }
    } catch (e) {
      console.warn('[translateNews] ERROR: ' + e.message);
      for (const b of batch) allTranslated.push(b);
    }
  }

  newsTranslateCache[cacheKey] = {at: Date.now(), items: allTranslated};
  console.log('[translateNews] ALL DONE ' + targetLang);
  return allTranslated;
}

'''
s = s[:idx] + fn + s[idx:]

# Заменяем /api/news
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
print('OK: заменено ' + str(n))
open(p, 'w', encoding='utf-8').write(s)
print('==== Готово ====')
