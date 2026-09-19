import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# --- 1. Функция перевода заголовков новостей (с кэшем) ---
if 'async function translateNewsItems' not in s:
    anchor = 'app.get(\'/api/news\', async function(req,res){'
    if anchor not in s:
        print('FAIL: /api/news не найден')
        exit(1)
    block = '''// ========== Перевод заголовков новостей ==========
const newsTranslationCache = {};

async function translateNewsItems(items, targetLang){
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

  const BATCH = 12;
  const translated = [];
  for (let i = 0; i < items.length; i += BATCH){
    const chunk = items.slice(i, i + BATCH);
    const blockText = chunk.map(function(x, idx){
      return (idx+1) + '. TITLE: ' + String(x.title||'').slice(0,200) + '\\n   DESC: ' + String(x.description||'').slice(0,200);
    }).join('\\n');
    const sys = 'You are a translator. Translate news titles and short descriptions into ' + langName + '. Output ONLY valid JSON.';
    const usr = 'Translate the following ' + chunk.length + ' news items into ' + langName + '. Keep it short and natural. Return JSON: {"items":[{"title":"...","description":"..."}]} with exactly ' + chunk.length + ' items in the same order.\\n\\n' + blockText;
    try {
      const res = await aiChatJSON(sys, usr, 3500);
      if (res && Array.isArray(res.items) && res.items.length === chunk.length){
        for (let j = 0; j < chunk.length; j++){
          translated.push(Object.assign({}, chunk[j], {
            title: String(res.items[j].title || chunk[j].title || ''),
            description: String(res.items[j].description || chunk[j].description || '')
          }));
        }
      } else {
        chunk.forEach(function(x){ translated.push(x); });
      }
    } catch(e){
      console.warn('[news-translate] batch error: ' + e.message);
      chunk.forEach(function(x){ translated.push(x); });
    }
    if (i + BATCH < items.length) await sleep(500);
  }

  newsTranslationCache[cacheKey] = { at: Date.now(), items: translated };
  console.log('[news-translate] ' + targetLang + ' OK (' + translated.length + ' items)');
  return translated;
}

'''
    s = s.replace(anchor, block + anchor, 1)
    print('OK: translateNewsItems + кэш добавлены')
else:
    print('SKIP: translateNewsItems уже есть')

# --- 2. Меняем /api/news чтобы принимал lang ---
old_news = """app.get('/api/news', async function(req,res){
  try {
    let items = newsCache.items;
    if (Date.now() - newsCache.at > 6*60*60*1000 || !items.length) items = await fetchNews();
    res.json({ ok:true, updatedAt:newsCache.at, items });
  } catch(e){ res.status(502).json({ ok:false, items:[] }); }
});"""
new_news = """app.get('/api/news', async function(req,res){
  const targetLang = String(req.query.lang || 'ru').toLowerCase().slice(0,2);
  try {
    let items = newsCache.items;
    if (Date.now() - newsCache.at > 6*60*60*1000 || !items.length) items = await fetchNews();
    if (targetLang && targetLang !== 'ru'){
      try { items = await translateNewsItems(items, targetLang); }
      catch(e){ console.warn('[news-translate] fail: ' + e.message); }
    }
    res.json({ ok:true, updatedAt:newsCache.at, lang: targetLang, items });
  } catch(e){ res.status(502).json({ ok:false, items:[] }); }
});"""
if new_news.split('\n')[0] in s and 'targetLang' in s.split("app.get('/api/news'")[1][:2000] if "app.get('/api/news'" in s else False:
    print('SKIP: /api/news уже с lang')
elif old_news in s:
    s = s.replace(old_news, new_news, 1)
    print('OK: /api/news принимает ?lang=')
else:
    print('WARN: /api/news anchor не найден')

# --- 3. Расширяем defaultImgQuery — уникальность картинок ---
old_query = "function defaultImgQuery(title){\n  const t = String(title||'').toLowerCase();\n  // Точный подбор по теме новости\n  if (/таможен|пошлин|декларац|фтс|еэк|вэд|тн.?вэд|сертифик/.test(t)) return 'customs documents';\n  if (/маркиров|честный знак/.test(t)) return 'product marking';\n  if (/нефт|газ|barrel|oil|tanker/.test(t)) return 'oil tanker ship';\n  if (/железнодорож|жд|rail|поезд/.test(t)) return 'freight train railway';\n  if (/мор|порт|судно|контейнер|ship|port|container/.test(t)) return 'container ship port';\n  if (/авиа|самолёт|air|flight|cargo plane/.test(t)) return 'cargo airplane';\n  if (/грузовик|авто|truck|road/.test(t)) return 'cargo truck highway';\n  if (/китай|china/.test(t)) return 'china logistics warehouse';\n  if (/индия|india/.test(t)) return 'india port logistics';\n  if (/корея|korea|япония|japan/.test(t)) return 'asia port city';\n  if (/склад|warehouse|логист/.test(t)) return 'warehouse logistics';\n  if (/автомобил|машин|car/.test(t)) return 'car transport ship';\n  if (/рыба|fish|сельхоз|agro|food/.test(t)) return 'food cargo shipping';\n  if (/импорт|экспорт|import|export/.test(t)) return 'cargo shipping logistics';\n  return 'cargo logistics';\n}"

new_query = """function defaultImgQuery(title){
  const t = String(title||'').toLowerCase();
  // Хэш от title -> стабильный выбор варианта (но разный для разных новостей)
  const h = crypto.createHash('md5').update(t).digest('hex');
  const n = parseInt(h.slice(0, 8), 16);
  const pick = function(arr){ return arr[n % arr.length]; };
  if (/таможен|пошлин|декларац|фтс|еэк|вэд|тн.?вэд|сертифик/.test(t)) return pick(['customs documents','customs clearance','border checkpoint','trade documents','customs inspection']);
  if (/маркиров|честный знак/.test(t)) return pick(['product marking','barcode scanner','qr code label','warehouse label']);
  if (/нефт|газ|barrel|oil|tanker/.test(t)) return pick(['oil tanker ship','oil refinery','oil pipeline','fuel tanker truck']);
  if (/железнодорож|жд|rail|поезд/.test(t)) return pick(['freight train railway','cargo train station','railway containers','train tracks']);
  if (/мор|порт|судно|контейнер|ship|port|container/.test(t)) return pick(['container ship port','cargo ship sea','port terminal crane','shipping containers']);
  if (/авиа|самолёт|air|flight|cargo plane/.test(t)) return pick(['cargo airplane','airport cargo terminal','air freight loading','cargo plane loading']);
  if (/грузовик|авто|truck|road/.test(t)) return pick(['cargo truck highway','semi trailer road','truck fleet logistics','truck loading dock']);
  if (/китай|china/.test(t)) return pick(['china logistics warehouse','shanghai port','china factory export','china cargo terminal']);
  if (/индия|india/.test(t)) return pick(['india port logistics','india container terminal','mumbai port','india cargo ship']);
  if (/корея|korea|япония|japan/.test(t)) return pick(['asia port city','korea cargo port','japan container terminal','asia shipping']);
  if (/склад|warehouse|логист/.test(t)) return pick(['warehouse logistics','distribution center','fulfillment center','cargo storage racks','pallet warehouse','forklift warehouse']);
  if (/автомобил|машин|car/.test(t)) return pick(['car transport ship','car carrier trailer','auto logistics port','vehicle loading']);
  if (/рыба|fish|сельхоз|agro|food/.test(t)) return pick(['food cargo shipping','refrigerated container','cold chain logistics','food export']);
  if (/импорт|экспорт|import|export/.test(t)) return pick(['cargo shipping logistics','export containers port','import logistics warehouse','trade cargo']);
  if (/дрон|беспилот|drone|uav/.test(t)) return pick(['delivery drone','drone logistics','cargo drone flight','uav delivery']);
  if (/мебел|furniture/.test(t)) return pick(['furniture warehouse','wooden furniture crates','furniture export','furniture shop warehouse']);
  return pick(['cargo logistics','freight transport','global shipping','logistics network','supply chain']);
}"""

if 'const pick = function(arr){ return arr[n % arr.length]; };' in s:
    print('SKIP: defaultImgQuery уже расширен')
elif old_query in s:
    s = s.replace(old_query, new_query, 1)
    print('OK: defaultImgQuery расширен (разные запросы для похожих тем)')
else:
    print('WARN: defaultImgQuery anchor не найден')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# --- loadNews с lang ---
old_ln = "try{const r=await fetch('/api/news',{cache:'no-store'});const d=r.ok?await r.json():null;const items=Array.isArray(d?.items)?d.items:[];if(items.length){newsCache=items;renderNewsItems(items);return;}}catch{}"
new_ln = "try{const r=await fetch('/api/news?lang='+lang,{cache:'no-store'});const d=r.ok?await r.json():null;const items=Array.isArray(d?.items)?d.items:[];if(items.length){newsCache=items;renderNewsItems(items);return;}}catch{}"
if new_ln in s2:
    print('SKIP: loadNews уже с lang')
elif old_ln in s2:
    s2 = s2.replace(old_ln, new_ln, 1)
    print('OK: loadNews — fetch с lang')
else:
    print('WARN: loadNews anchor не найден')

# --- prefetchNews с lang ---
old_pf = "newsPrefetchPromise=fetch('/api/news',{cache:'no-store',credentials:'same-origin'})"
new_pf = "newsPrefetchPromise=fetch('/api/news?lang='+lang,{cache:'no-store',credentials:'same-origin'})"
if new_pf in s2:
    print('SKIP: prefetchNews уже с lang')
elif old_pf in s2:
    s2 = s2.replace(old_pf, new_pf, 1)
    print('OK: prefetchNews — fetch с lang')
else:
    print('WARN: prefetchNews anchor не найден')

# --- Сброс newsCache при смене языка ---
old_lang = "$$('.lang').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;applyLang();"
new_lang = "$$('.lang').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;newsCache=[];newsPrefetchPromise=null;applyLang();"
if new_lang in s2:
    print('SKIP: сброс кэша новостей уже есть')
elif old_lang in s2:
    s2 = s2.replace(old_lang, new_lang, 1)
    print('OK: при смене языка — сброс кэша новостей')
else:
    print('WARN: обработчик языков не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('app.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>106', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>106', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v106')

print('===== ГОТОВО =====')
