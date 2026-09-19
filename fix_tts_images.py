import re, os

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# --- 1. Функция очистки текста для TTS ---
if 'function preprocessForTts(' not in s:
    anchor = 'function runEdgeTts(text, voice, out){'
    if anchor not in s:
        print('FAIL: runEdgeTts не найден')
        exit(1)
    block = '''function preprocessForTts(text, lang){
  let t = String(text || '');
  // Диапазоны валют: $68-$72 -> 68-72 долларов
  t = t.replace(/\\$\\s*(\\d[\\d.,]*)\\s*[-–—]\\s*\\$?\\s*(\\d[\\d.,]*)/g, '$1-$2 долларов');
  t = t.replace(/(\\d[\\d.,]*)\\s*[-–—]\\s*(\\d[\\d.,]*)\\s*\\$/g, '$1-$2 долларов');
  // Одиночные валюты
  t = t.replace(/\\$\\s*(\\d[\\d.,]*)/g, '$1 долларов');
  t = t.replace(/(\\d[\\d.,]*)\\s*\\$/g, '$1 долларов');
  t = t.replace(/(\\d[\\d.,]*)\\s*₽/g, '$1 рублей');
  t = t.replace(/₽\\s*(\\d[\\d.,]*)/g, '$1 рублей');
  t = t.replace(/(\\d[\\d.,]*)\\s*€/g, '$1 евро');
  t = t.replace(/€\\s*(\\d[\\d.,]*)/g, '$1 евро');
  t = t.replace(/(\\d[\\d.,]*)\\s*¥/g, '$1 юаней');
  t = t.replace(/(\\d[\\d.,]*)\\s*%/g, '$1 процентов');
  t = t.replace(/(\\d[\\d.,]*)\\s*‰/g, '$1 промилле');
  // Точка в десятичных -> запятая (русский голос)
  if (lang === 'ru') t = t.replace(/(\\d)\\.(\\d)/g, '$1,$2');
  // Сокращения
  if (lang === 'ru'){
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ТН ВЭД([^А-Яа-яЁёA-Za-z]|$)/g, '$1тэ-эн вэ-э-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])НПЗ([^А-Яа-яЁёA-Za-z]|$)/g, '$1эн-пэ-зэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])Ж\\/Д([^А-Яа-яЁёA-Za-z]|$)/g, '$1жэ-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ЖД([^А-Яа-яЁёA-Za-z]|$)/g, '$1жэ-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ВЭД([^А-Яа-яЁёA-Za-z]|$)/g, '$1вэ-э-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ФТС([^А-Яа-яЁёA-Za-z]|$)/g, '$1эф-тэ-эс$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ЕАЭС([^А-Яа-яЁёA-Za-z]|$)/g, '$1е-а-е-эс$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])КП([^А-Яа-яЁёA-Za-z]|$)/g, '$1ка-пэ$2');
  }
  // Спецсимволы/маркеры -> паузы
  t = t.replace(/[▪•●◆■]/g, ', ');
  t = t.replace(/[#*`>_]+/g, ' ');
  t = t.replace(/\\s*[—–]\\s*/g, ', ');
  t = t.replace(/\\s+/g, ' ').trim();
  return t;
}

'''
    s = s.replace(anchor, block + anchor, 1)
    print('OK: preprocessForTts добавлен')
else:
    print('SKIP: preprocessForTts уже есть')

# --- 2. Использовать его в synthesizeEdge ---
old_clean = "const clean = String(text||'').replace(/[#*`>]/g,' ').replace(/\\s+/g,' ').trim();"
new_clean = "const clean = preprocessForTts(text, lang);"
if old_clean in s:
    s = s.replace(old_clean, new_clean, 1)
    print('OK: synthesizeEdge -> preprocessForTts')
elif 'preprocessForTts(text, lang)' in s:
    print('SKIP: synthesizeEdge уже использует preprocessForTts')
else:
    print('WARN: clean= в synthesizeEdge не найден')

# --- 3. Endpoint /api/news/image ---
if '/api/news/image' not in s:
    anchor2 = "app.post('/api/news/article', async function(req,res){"
    if anchor2 not in s:
        print('WARN: anchor /api/news/article не найден')
    else:
        block2 = '''const NEWS_IMAGE_CACHE_FILE = path.join(DATA_DIR, 'news-images.json');
let newsImageCache = {};
try { newsImageCache = JSON.parse(fs.readFileSync(NEWS_IMAGE_CACHE_FILE, 'utf8')); } catch(e){}
function saveNewsImageCache(){
  try { fs.mkdirSync(DATA_DIR, {recursive:true}); fs.writeFileSync(NEWS_IMAGE_CACHE_FILE, JSON.stringify(newsImageCache), 'utf8'); } catch(e){}
}

app.get('/api/news/image', async function(req,res){
  const title = String(req.query.title || '').trim().slice(0, 200);
  if (!title) return res.status(400).json({ ok:false });
  const key = crypto.createHash('md5').update(title.toLowerCase()).digest('hex');
  if (newsImageCache[key]) return res.json({ ok:true, image: newsImageCache[key], fromCache:true });
  const query = defaultImgQuery(title);
  const image = await fetchPexelsImage(query);
  if (image){ newsImageCache[key] = image; saveNewsImageCache(); }
  res.json({ ok:true, image: image || '', query });
});

'''
        s = s.replace(anchor2, block2 + anchor2, 1)
        print('OK: /api/news/image добавлен')
else:
    print('SKIP: /api/news/image уже есть')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ' байт, стало ' + str(len(s)) + ' байт')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

old_hook = "    a.onclick = function(){ openArticle(n); };\n    box.appendChild(a);"
new_hook = """    a.onclick = function(){ openArticle(n); };
    box.appendChild(a);
    if (!img && n.title){
      var q = String(cleanNewsText(n.title) || '').slice(0, 120);
      var cardRef = a;
      fetch('/api/news/image?title=' + encodeURIComponent(q))
        .then(function(r){ return r.json(); })
        .then(function(d){
          if (d && d.ok && d.image){
            n.image = d.image;
            var holder = cardRef.querySelector('.news-card-img');
            if (holder){
              holder.classList.remove('news-card-img-placeholder');
              holder.innerHTML = '<img src="' + d.image + '" alt="" loading="lazy">';
            }
          }
        })
        .catch(function(){});
    }"""

if 'news/image?title=' in s2:
    print('SKIP: lazy-картинки уже есть в app.js')
elif old_hook in s2:
    s2 = s2.replace(old_hook, new_hook, 1)
    print('OK: lazy-картинки добавлены в renderNewsItems')
else:
    print('WARN: anchor в renderNewsItems не найден')

open(p2, 'w', encoding='utf-8').write(s2)

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\\.css\\?v=\\d{8}-v)\\d+', r'\\g<1>100', s3)
s3 = re.sub(r'(app\\.js\\?v=\\d{8}-v)\\d+', r'\\g<1>100', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v100')

print('===== ГОТОВО =====')
