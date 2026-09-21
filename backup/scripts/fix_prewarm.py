import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# --- 1. Функция prewarmArticles + флаг ---
if 'async function prewarmArticles' not in s:
    anchor = "app.post('/api/news/article', async function(req,res){"
    if anchor not in s:
        print('FAIL: /api/news/article не найден')
        exit(1)
    block = '''// ========== Автопрогрев статей (фоновый) ==========
let prewarmRunning = false;

async function prewarmArticles(N){
  if (prewarmRunning){
    console.log('[prewarm] уже выполняется, пропускаю');
    return;
  }
  N = Math.max(1, Math.min(20, N || 5));
  prewarmRunning = true;
  console.log('[prewarm] === старт: топ-' + N + ' статей × 4 языка ===');
  const t0 = Date.now();
  let ok = 0, fail = 0, cached = 0;
  try {
    // Обновляем новости, если кэш устарел
    if (!newsCache.items.length || Date.now() - newsCache.at > 6*60*60*1000){
      console.log('[prewarm] обновляю новости...');
      try { await fetchNews(); } catch(e){ console.warn('[prewarm] fetchNews: ' + e.message); }
    }
    const items = (newsCache.items || []).slice(0, N);
    if (!items.length){ console.log('[prewarm] новостей нет, выходим'); return; }

    for (let i = 0; i < items.length; i++){
      const item = items[i];
      const title = (typeof stripSource === 'function') ? stripSource(item.title) : item.title;
      const desc = item.description || '';
      const source = item.source || '';
      const link = item.link || '';
      console.log('[prewarm] (' + (i+1) + '/' + items.length + ') ' + String(title).slice(0,60));
      for (const lg of ['ru', 'en', 'zh', 'tr']){
        try {
          const r = await fetch('http://localhost:' + PORT + '/api/news/article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc, source, link, language: lg }),
            signal: AbortSignal.timeout(180000)
          });
          const d = await r.json();
          if (d && d.ok && d.article){
            if (d.fromCache){ cached++; console.log('    · ' + lg + ' (кэш)'); }
            else { ok++; console.log('    ✓ ' + lg + ' OK'); }
          } else { fail++; console.log('    ✗ ' + lg + ' fail'); }
        } catch(e){
          fail++;
          console.log('    ✗ ' + lg + ': ' + e.message);
        }
        await sleep(2500); // пауза между запросами — не бьём лимиты
      }
    }
  } finally {
    prewarmRunning = false;
    const dt = Math.round((Date.now()-t0)/1000);
    console.log('[prewarm] === готово за ' + dt + ' сек: новых=' + ok + ', кэш=' + cached + ', ошибок=' + fail + ' ===');
  }
}

'''
    s = s.replace(anchor, block + anchor, 1)
    print('OK: prewarmArticles добавлена')
else:
    print('SKIP: prewarmArticles уже есть')

# --- 2. Роут /api/articles/prewarm ---
if "app.post('/api/articles/prewarm'" not in s:
    anchor2 = "// Служебный endpoint — сколько статей в кэше"
    if anchor2 not in s:
        print('WARN: anchor cache-stats не найден')
    else:
        route = """// Ручной запуск прогрева
app.post('/api/articles/prewarm', function(req,res){
  const n = Math.max(1, Math.min(20, Number(req.body && req.body.n) || 5));
  console.log('[prewarm] ручной запуск, n=' + n);
  prewarmArticles(n).catch(function(e){ console.warn('[prewarm] error: ' + e.message); });
  res.json({ ok: true, started: true, n: n });
});

"""
        s = s.replace(anchor2, route + anchor2, 1)
        print('OK: роут /api/articles/prewarm добавлен')
else:
    print('SKIP: роут prewarm уже есть')

# --- 3. Периодический прогрев каждые 6 часов ---
if 'setInterval(function(){ console.log("[prewarm] 6h' not in s:
    anchor3 = "app.listen(PORT, function(){"
    if anchor3 not in s:
        print('WARN: app.listen не найден')
    else:
        block3 = """// Периодический прогрев каждые 6 часов
setInterval(function(){
  console.log('[prewarm] плановый (каждые 6ч)');
  prewarmArticles(5).catch(function(){});
}, 6*60*60*1000);

"""
        s = s.replace(anchor3, block3 + anchor3, 1)
        print('OK: периодический прогрев каждые 6ч')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# --- 4. Версия ---
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>107', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>107', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v107')

print('===== ГОТОВО =====')
