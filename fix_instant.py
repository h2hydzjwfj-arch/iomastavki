import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1) Фильтр украинских источников — жёсткий
old_filter = '''  const BAD_TOPICS = /(украин|киев|київ|ukrain|киевск|одесс|харьков|львов|донец|луганск|крым|мариупол|запорож|херсон|николаев|чернигов|ВСУ|ЗСУ|політик|политик[а-яё]*\\s+украин)/i;
  all = all.filter(function(x){
    const text = String(x.title||'') + ' ' + String(x.description||'');
    return !BAD_TOPICS.test(text);
  });'''

new_filter = '''  // Жёсткая фильтрация: Украина + политика + запрещённые домены
  const BAD_TOPICS = /(украин|киев|київ|ukrain|киевск|одесс|харьков|львов|донец|луганск|крым|мариупол|запорож|херсон|николаев|чернигов|ВСУ|ЗСУ|політик|политик[а-яё]*\\s+украин|зеленск|киевstar|київстар)/i;
  const BAD_DOMAINS = /\\.ua\\b|delo\\.ua|pravda\\.com\\.ua|ukrinform|unian|112\\.ua|gordonua|strana\\.ua|liga\\.net|korrespondent\\.net|lenta\\.ua|zn\\.ua|epravda/i;
  all = all.filter(function(x){
    const text = String(x.title||'') + ' ' + String(x.description||'') + ' ' + String(x.link||'');
    if (BAD_TOPICS.test(text)) return false;
    if (BAD_DOMAINS.test(String(x.link||''))) return false;
    if (BAD_DOMAINS.test(String(x.source||''))) return false;
    return true;
  });
  console.log('[fetchNews] filtered to ' + all.length + ' items (removed Ukraine/politics)');'''

if old_filter in s:
    s = s.replace(old_filter, new_filter)
    print('OK: фильтр Украины ужесточён')
else:
    print('WARN: старый фильтр не найден')

# 2) Ускоряем перевод — параллельно по 3 штуки
old_loop = '''  console.log('[translateNews] START ' + targetLang + ' — translating ' + MAX + ' items');
  for (let i = 0; i < MAX; i++){
    const t = await translateOne(items[i], targetLang);
    if (i === 0) console.log('[translateNews] SAMPLE: ' + String(t.title).slice(0,100));
    result.push(t);
    // Пауза 600 мс между запросами — чтобы не словить 429
    if (i < MAX - 1) await new Promise(function(r){ setTimeout(r, 600); });
  }
  // Остальные оставляем как есть
  for (let i = MAX; i < items.length; i++) result.push(items[i]);'''

new_loop = '''  console.log('[translateNews] START ' + targetLang + ' — translating ' + MAX + ' items (parallel x3)');
  // Переводим параллельно по 3 штуки — быстрее и не ловим 429
  const CONCURRENCY = 3;
  const temp = new Array(MAX);
  for (let batchStart = 0; batchStart < MAX; batchStart += CONCURRENCY){
    const promises = [];
    for (let j = batchStart; j < Math.min(batchStart + CONCURRENCY, MAX); j++){
      promises.push(translateOne(items[j], targetLang).then(function(t){ temp[j] = t; }));
    }
    await Promise.all(promises);
    if (batchStart === 0) console.log('[translateNews] SAMPLE: ' + String(temp[0] && temp[0].title || '').slice(0,100));
    // Пауза между батчами — чтобы не словить rate limit
    if (batchStart + CONCURRENCY < MAX) await new Promise(function(r){ setTimeout(r, 400); });
  }
  for (let i = 0; i < MAX; i++) result.push(temp[i] || items[i]);
  for (let i = MAX; i < items.length; i++) result.push(items[i]);'''

if old_loop in s:
    s = s.replace(old_loop, new_loop)
    print('OK: перевод ускорен (параллельный)')
else:
    print('WARN: цикл перевода не найден')

# 3) Увеличиваем таймаут генерации статьи — чтобы на других языках тоже успевало
s = s.replace("signal: AbortSignal.timeout(60000)\n      });\n      if (r.ok) {\n        const d = await r.json();\n        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;\n        if (text) { console.log('[aiChatJSON] DeepSeek OK'); return repairJSON(text); }",
              "signal: AbortSignal.timeout(120000)\n      });\n      if (r.ok) {\n        const d = await r.json();\n        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;\n        if (text) { console.log('[aiChatJSON] DeepSeek OK'); return repairJSON(text); }")
s = s.replace("signal: AbortSignal.timeout(90000)\n        });\n        if (r.ok) {\n          const d = await r.json();\n          const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;\n          if (text) {\n            console.log('[aiChatJSON] Groq ' + model + ' OK');",
              "signal: AbortSignal.timeout(120000)\n        });\n        if (r.ok) {\n          const d = await r.json();\n          const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;\n          if (text) {\n            console.log('[aiChatJSON] Groq ' + model + ' OK');")
print('OK: таймауты увеличены до 120с')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Смена языка — мгновенный интерфейс + фоновый перевод новостей
old_handler = '''$$('.lang').forEach(b=>b.onclick=async()=>{
  lang=b.dataset.lang;
  try{ newsCache=[]; articleMemCache={}; }catch(e){}
  applyLang();
  autoDistance();
  if(typeof loadNews==='function') await loadNews();
  // Если открыта статья — перерисовать её на новом языке
  try{
    if(currentArticleNews && document.getElementById('articleView')?.classList.contains('open')){
      await openArticle(currentArticleNews);
    }
  }catch(e){ console.warn('reopen article:', e); }
});'''

new_handler = '''$$('.lang').forEach(b=>b.onclick=async()=>{
  lang=b.dataset.lang;
  try{ newsCache=[]; articleMemCache={}; articleMemLang={}; }catch(e){}
  // 1) Мгновенно меняем интерфейс (как на главной)
  applyLang();
  autoDistance();
  // 2) Если открыта статья — сразу перерисовать с тем же контентом, а перевод подтянется в фоне
  try{
    if(currentArticleNews && document.getElementById('articleView')?.classList.contains('open')){
      openArticle(currentArticleNews);
    }
  }catch(e){ console.warn('reopen article:', e); }
  // 3) В фоне загружаем переведённые новости (не блокируем интерфейс)
  if(typeof loadNews==='function') loadNews();
});'''

if old_handler in s2:
    s2 = s2.replace(old_handler, new_handler)
    print('OK: смена языка мгновенная')
else:
    print('WARN: обработчик смены языка не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== app.js готов ====')
print('===== ВСЁ ГОТОВО =====')
