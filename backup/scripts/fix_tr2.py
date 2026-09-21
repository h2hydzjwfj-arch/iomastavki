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

function hasCyrillic(t){ return /[а-яё]/i.test(String(t||'')); }
function cleanDesc(t){
  let x = String(t||'').trim();
  if (/^https?:\\/\\//i.test(x)) return '';
  x = x.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\\s+/g, ' ').trim();
  return x.slice(0, 220);
}

const TRANSLATE_PROMPTS = {
  en: {
    sys: 'You are a professional Russian-to-English translator for logistics news. Translate EVERYTHING to English. Never leave Russian text. Output strict JSON.',
    example: 'Example: "Индийские НПЗ вышли на жирную маржу" → "Indian refineries achieve strong margins"'
  },
  tr: {
    sys: 'Sen Rusça-Türkçe çevirmen. TÜM metni Türkçeye çevir. Rusça bırakma. Sadece JSON döndür.',
    example: 'Örnek: "Индийские НПЗ вышли на жирную маржу" → "Hint rafinerileri yüksek kâr marjına ulaştı"'
  },
  zh: {
    sys: '你是俄语到中文的专业翻译。把所有内容翻译成简体中文。不要留俄语。只输出JSON。',
    example: '示例: "Индийские НПЗ вышли на жирную маржу" → "印度炼油厂获得高额利润"'
  }
};

async function translateOne(item, targetLang){
  const P = TRANSLATE_PROMPTS[targetLang];
  if (!P) return item;
  const source = 'TITLE: ' + String(item.title||'').slice(0,220) + '\\nDESC: ' + String(item.description||'').slice(0,220);
  const user = P.example + '\\n\\nTranslate this ONE news item:\\n' + source + '\\n\\nReturn JSON: {"title":"...","description":"..."}';

  for (let attempt = 1; attempt <= 2; attempt++){
    try {
      const translated = await aiChatJSON(P.sys, user, 800);
      if (translated && translated.title && !hasCyrillic(translated.title)){
        return Object.assign({}, item, {
          title: String(translated.title),
          description: String(translated.description || item.description || '')
        });
      }
      console.warn('[translate] attempt ' + attempt + ' still Russian: ' + String(translated && translated.title || '').slice(0,80));
    } catch (e) {
      console.warn('[translate] attempt ' + attempt + ' error: ' + e.message);
      if (attempt < 2) await new Promise(function(r){ setTimeout(r, 1500); });
    }
  }
  return item;
}

async function translateNewsItems(items, targetLang){
  if (targetLang === 'ru' || !items || !items.length) return items;
  const cacheKey = targetLang + '_' + items.length + '_' + normalizeText(items[0].title).slice(0,30);
  const c = newsTranslateCache[cacheKey];
  if (c && Date.now() - c.at < 30*60*1000) { console.log('[translateNews] CACHE HIT ' + targetLang); return c.items; }

  items = items.map(function(x){ return Object.assign({}, x, {description: cleanDesc(x.description)}); });

  // Переводим только первые 10 — чтобы уложиться в лимит Groq
  const MAX = Math.min(10, items.length);
  const result = [];

  console.log('[translateNews] START ' + targetLang + ' — translating ' + MAX + ' items');
  for (let i = 0; i < MAX; i++){
    const t = await translateOne(items[i], targetLang);
    if (i === 0) console.log('[translateNews] SAMPLE: ' + String(t.title).slice(0,100));
    result.push(t);
    // Пауза 600 мс между запросами — чтобы не словить 429
    if (i < MAX - 1) await new Promise(function(r){ setTimeout(r, 600); });
  }
  // Остальные оставляем как есть
  for (let i = MAX; i < items.length; i++) result.push(items[i]);

  newsTranslateCache[cacheKey] = {at: Date.now(), items: result};
  console.log('[translateNews] ALL DONE ' + targetLang);
  return result;
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
