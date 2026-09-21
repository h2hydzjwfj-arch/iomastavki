import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# Заменяем switchArticleLanguage — не убирать контент
start = s.find('async function switchArticleLanguage')
end = s.find('async function openArticle', start)
if start < 0 or end <= start:
    print('❌ switchArticleLanguage не найден')
    exit()

new_switch = '''async function switchArticleLanguage(n){
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const box = $('#articleContent');
  const cacheKey = normalizeText(title);

  // Уже есть в памяти — заменяем мгновенно
  if (articleMemCache[cacheKey] && articleMemLang[cacheKey] === lang){
    const urgent = isUrgentNews(n);
    const source = cleanNewsText(n.source || '');
    const img = n.image || '';
    const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
    const statusLabel = urgent ? 'СРОЧНО' : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
    renderArticleFull(articleMemCache[cacheKey], n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

  // Показываем маленький спиннер вверху, НЕ трогая статью
  showArticleLangSwitching(true);

  try {
    // Пробуем получить перевод с сервера (он сам разрулит кэш/генерацию)
    const r = await fetch('/api/news/article', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        title: title,
        description: cleanNewsText(n.description||''),
        source: cleanNewsText(n.source||''),
        link: n.link || '',
        language: lang
      })
    });
    const d = await r.json();
    if (d && d.ok && d.article){
      articleMemCache[cacheKey] = d.article;
      articleMemLang[cacheKey] = lang;
      const urgent = isUrgentNews(n);
      const source = cleanNewsText(n.source || '');
      const img = n.image || '';
      const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
      const statusLabel = urgent ? 'СРОЧНО' : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
      // Плавное появление
      box.style.transition = 'opacity .35s ease';
      box.style.opacity = '0.3';
      setTimeout(function(){
        renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
        box.style.opacity = '1';
      }, 350);
    }
  } catch(e){
    console.warn('switch lang error:', e.message);
  }
  showArticleLangSwitching(false);
}

'''
s = s[:start] + new_switch + s[end:]
print('OK: switchArticleLanguage — статья не пропадает')

# Показываем плашку только когда реально идёт перевод в фоне
old_show = '''function showArticleLangSwitching(on){
  let el = document.getElementById('articleLangOverlay');
  if (on){
    if (!el){
      el = document.createElement('div');
      el.id = 'articleLangOverlay';
      el.className = 'article-lang-overlay';
      el.innerHTML = '<div class="article-lang-spinner"></div><div class="article-lang-text">Перевод статьи…</div>';
      const shell = document.querySelector('.article-shell');
      if (shell) shell.appendChild(el);
    }
    el.classList.add('visible');
  } else if (el){
    el.classList.remove('visible');
    setTimeout(function(){ try{ el.remove(); }catch(e){} }, 400);
  }
}'''

new_show = '''function showArticleLangSwitching(on){
  let el = document.getElementById('articleLangOverlay');
  if (on){
    if (!el){
      el = document.createElement('div');
      el.id = 'articleLangOverlay';
      el.className = 'article-lang-overlay';
      el.innerHTML = '<div class="article-lang-spinner"></div><div class="article-lang-text">Обновляю перевод…</div>';
      const shell = document.querySelector('.article-shell');
      if (shell) shell.appendChild(el);
    }
    el.classList.add('visible');
  } else if (el){
    el.classList.remove('visible');
    setTimeout(function(){ try{ el.remove(); }catch(e){} }, 600);
  }
}'''

if old_show in s:
    s = s.replace(old_show, new_show)
    print('OK: плашка обновлена')

open(p, 'w', encoding='utf-8').write(s)
print('==== app.js готов ====')

# ==================== SERVER.JS ====================
p2 = 'server.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Ускоряем warmArticleTranslations — параллельно EN, потом ZH, TR
old_warm = '''  const targetLangs = ['en', 'zh', 'tr'];
  for (const tl of targetLangs){
    const existing = getCachedArticleByLang(titleRu, tl);
    if (existing && existing.content && existing.content.length > 200) {
      console.log('[warm] ' + tl + ' already cached');
      continue;
    }
    try {
      console.log('[warm] translating to ' + tl + ': ' + titleRu.slice(0,50));
      const translated = await translateArticleWithAI(baseArticle, tl);
      if (translated && translated.content){
        saveArticleToCache(titleRu, tl, translated);
        console.log('[warm] ' + tl + ' saved');
      }
      await sleep(1500);
    } catch(e){
      console.warn('[warm] ' + tl + ' failed:', e.message);
      await sleep(3000);
    }
  }'''

new_warm = '''  // Приоритет EN (самый популярный), потом ZH, TR
  const targetLangs = ['en', 'zh', 'tr'];
  for (const tl of targetLangs){
    const existing = getCachedArticleByLang(titleRu, tl);
    if (existing && existing.content && existing.content.length > 200) {
      console.log('[warm] ' + tl + ' already cached');
      continue;
    }
    let success = false;
    for (let attempt = 1; attempt <= 2; attempt++){
      try {
        console.log('[warm] ' + tl + ' попытка ' + attempt + ': ' + titleRu.slice(0,40));
        const translated = await translateArticleWithAI(baseArticle, tl);
        if (translated && translated.content){
          saveArticleToCache(titleRu, tl, translated);
          console.log('[warm] ' + tl + ' OK');
          success = true;
          break;
        }
      } catch(e){
        console.warn('[warm] ' + tl + ' (' + attempt + ') error: ' + e.message);
        if (attempt < 2) await sleep(4000);
      }
    }
    if (!success) console.warn('[warm] ' + tl + ' не удалось после 2 попыток');
    await sleep(2000);
  }'''

if old_warm in s2:
    s2 = s2.replace(old_warm, new_warm)
    print('OK: warm — с двумя попытками для каждого языка')

# Меняем prewarm — только 3 статьи, но каждую с полным прогревом на все языки
old_prewarm = '''app.post('/api/news/prewarm', function(req,res){
  const N = Math.min(15, Math.max(1, Number(req.body && req.body.n) || 5));
  console.log('[prewarm] запускаю прогрев топ-' + N + ' новостей');
  prewarmNewsCache(N).catch(function(e){ console.warn('[prewarm] error:', e.message); });
  res.json({ok:true, started:true, n: N});
});'''

new_prewarm = '''app.post('/api/news/prewarm', function(req,res){
  const N = Math.min(15, Math.max(1, Number(req.body && req.body.n) || 3));
  console.log('[prewarm] запускаю прогрев топ-' + N + ' новостей');
  prewarmNewsCache(N).catch(function(e){ console.warn('[prewarm] error:', e.message); });
  res.json({ok:true, started:true, n: N});
});

// Прогрев при заходе на сайт — только 3 статьи, но каждая с полным переводом
app.post('/api/news/quickprewarm', function(req,res){
  console.log('[quickprewarm] быстрый прогрев 3 статей');
  prewarmNewsCache(3).catch(function(){});
  res.json({ok:true});
});'''

if old_prewarm in s2:
    s2 = s2.replace(old_prewarm, new_prewarm)
    print('OK: quickprewarm добавлен')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== server.js готов ====')

# ==================== APP.JS — используем quickprewarm ====================
p3 = 'app.js'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = s3.replace("fetch('/api/news/prewarm', {", "fetch('/api/news/quickprewarm', {")
s3 = s3.replace("body: JSON.stringify({ n: 8 })", "body: JSON.stringify({})")
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: app.js → quickprewarm')

# ==================== Версия ====================
p4 = 'index.html'
s4 = open(p4, 'r', encoding='utf-8').read()
s4 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>72', s4)
s4 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>72', s4)
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: index.html → v72')
print('===== ГОТОВО =====')
