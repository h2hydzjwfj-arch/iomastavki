import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Функция fetchFullArticle
if 'async function fetchFullArticle' not in s:
    anchor = "async function fetchArticleSource(url){"
    if anchor not in s:
        print('WARN: fetchArticleSource не найден')
    else:
        block = '''// ========== Загрузка полного текста статьи с источника ==========
async function fetchFullArticle(url){
  if (!/^https?:\\/\\//i.test(url)) return null;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) return null;
    let html = await r.text();

    // og:image
    let image = '';
    let m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
         || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (m) image = m[1];

    // og:title
    let title = '';
    m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
    if (m) title = m[1].replace(/<[^>]+>/g, '').trim();

    // og:description
    let desc = '';
    m = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (m) desc = m[1];

    // Убираем мусор
    html = html.replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
               .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
               .replace(/<nav[\\s\\S]*?<\\/nav>/gi, ' ')
               .replace(/<footer[\\s\\S]*?<\\/footer>/gi, ' ')
               .replace(/<aside[\\s\\S]*?<\\/aside>/gi, ' ')
               .replace(/<header[\\s\\S]*?<\\/header>/gi, ' ')
               .replace(/<form[\\s\\S]*?<\\/form>/gi, ' ')
               .replace(/<noscript[\\s\\S]*?<\\/noscript>/gi, ' ')
               .replace(/<!--[\\s\\S]*?-->/g, ' ');

    // Основной контент: article / main / body
    let content = '';
    let mA = html.match(/<article[^>]*>([\\s\\S]*?)<\\/article>/i);
    if (mA) content = mA[1];
    else {
      let mM = html.match(/<main[^>]*>([\\s\\S]*?)<\\/main>/i);
      if (mM) content = mM[1];
      else content = html;
    }

    // Параграфы
    const paras = content.match(/<p[^>]*>([\\s\\S]*?)<\\/p>/gi) || [];
    const clean = [];
    for (let pi = 0; pi < paras.length; pi++){
      let t = paras[pi].replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
        .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\\s+/g, ' ').trim();
      if (t.length > 60) clean.push(t);
    }

    if (clean.length < 3) return null;

    return {
      title: title,
      description: desc,
      image: image,
      content: clean.join('\\n\\n'),
      sourceUrl: url,
      paragraphs: clean.length
    };
  } catch(e){
    console.warn('[full-article] ' + e.message);
    return null;
  }
}

'''
        s = s.replace(anchor, block + anchor, 1)
        print('OK: fetchFullArticle добавлена')
else:
    print('SKIP: fetchFullArticle уже есть')

# 2. Меняем /api/news/article — сначала пробуем оригинал
if '[full-article] try original' not in s:
    old_marker = "  console.log('[article] lookup id=' + cacheId.slice(0,60) + ' lang=' + language);"
    new_marker = """  console.log('[article] lookup id=' + cacheId.slice(0,60) + ' lang=' + language);

  // 0. Если есть прямая ссылка — пробуем загрузить оригинал
  if (sourceLinkRaw && language === 'ru'){
    const orig = getCachedArticle(cacheId, 'orig');
    if (orig){
      console.log('[full-article] CACHE HIT original');
      return res.json({ ok:true, article: orig, fromCache: true, isOriginal: true });
    }
    try {
      console.log('[full-article] try original: ' + sourceLinkRaw.slice(0,80));
      const full = await fetchFullArticle(sourceLinkRaw);
      if (full && full.paragraphs >= 3){
        const art = {
          title: full.title || cleanTitle,
          subtitle: full.description || '',
          content: full.content,
          podcast: '',
          image: full.image || '',
          source: sourceName,
          sourceUrl: sourceLinkRaw,
          isOriginal: true,
          attribution: sourceName
        };
        saveCachedArticle(cacheId, 'orig', art);
        console.log('[full-article] OK original, ' + full.paragraphs + ' paras');
        return res.json({ ok:true, article: art, fromCache: false, isOriginal: true });
      }
    } catch(e){ console.warn('[full-article] fail: ' + e.message); }
  }"""
    if old_marker in s:
        s = s.replace(old_marker, new_marker, 1)
        print('OK: /api/news/article — сначала пробует оригинал')
    else:
        print('WARN: маркер /api/news/article не найден')

# 3. Обновляем RSS-источники
old_q = """  const queries = [
    ['логистика Китай Россия','Логистика'],
    ['грузоперевозки Китай Россия','Грузоперевозки'],
    ['импорт из Китая в Россию','Импорт'],
    ['таможня ЕАЭС пошлина ВЭД','Таможня'],
    ['ТН ВЭД маркировка','ТН ВЭД'],
    ['контейнерные перевозки Китай','Контейнеры'],
    ['железнодорожные перевозки Китай Россия','Ж/Д'],
    ['морские перевозки Азия','Море'],
    ['логистика Индия Россия','Индия'],
    ['логистика Корея Япония Россия','Азия']
  ];"""
new_q = """  const queries = [
    ['site:customs.gov.ru','ФТС России'],
    ['site:eaeunion.org','ЕЭК'],
    ['site:alta.ru','Альта-Софт'],
    ['site:tks.ru','TKS.RU'],
    ['site:logirus.ru','Логирус'],
    ['site:rzd-partner.ru','РЖД-Партнёр'],
    ['site:mintrans.gov.ru','Минтранс'],
    ['логистика Китай Россия','Логистика'],
    ['грузоперевозки Китай Россия','Грузоперевозки'],
    ['импорт из Китая в Россию','Импорт'],
    ['таможня ЕАЭС пошлина ВЭД','Таможня'],
    ['ТН ВЭД маркировка','ТН ВЭД'],
    ['контейнерные перевозки Китай','Контейнеры'],
    ['железнодорожные перевозки Китай Россия','Ж/Д'],
    ['морские перевозки Азия','Море']
  ];"""
if new_q.split('\n')[1] in s:
    print('SKIP: RSS-источники уже обновлены')
elif old_q in s:
    s = s.replace(old_q, new_q, 1)
    print('OK: RSS — профильные источники (ФТС, ЕЭК, Альтa, TKS, Логирус, РЖД-Партнёр, Минтранс)')
else:
    print('WARN: anchor queries не найден')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

# 4. В renderArticleFull — показать "Источник: автор" если есть isOriginal
old_src = """      (sourceLink ? '<div class="article-source-link"><b>Источник:</b> <a href="' + escapeHtml(sourceLink) + '" target="_blank" rel="noopener">' + escapeHtml(source) + '</a></div>' : '') +
      '<div class="article-source">Материал подготовлен ИИ. Проверяйте первоисточник.</div>' +
    '</div>';"""
new_src = """      (sourceLink ? '<div class="article-source-link"><b>Источник:</b> <a href="' + escapeHtml(sourceLink) + '" target="_blank" rel="noopener">' + escapeHtml(source || sourceLink) + '</a></div>' : '') +
      (a.isOriginal
        ? '<div class="article-source">Материал опубликован по источнику: <b>' + escapeHtml(source || sourceLink || 'открытые данные') + '</b>. Полный текст доступен по ссылке выше.</div>'
        : '<div class="article-source">Материал подготовлен ИИ. Проверяйте первоисточник.</div>') +
    '</div>';"""
if 'Материал опубликован по источнику' in s2:
    print('SKIP: app.js уже обрабатывает isOriginal')
elif old_src in s2:
    s2 = s2.replace(old_src, new_src, 1)
    print('OK: app.js — блок источника для оригиналов')
else:
    print('WARN: anchor renderArticleFull не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('app.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

css_add = """

/* ========== v140: компактный калькулятор без скролла ========== */
.calculator-card{
  overflow: hidden !important;
  max-height: calc(100svh - 40px) !important;
  padding: 22px 32px 14px !important;
}
.calculator-card::-webkit-scrollbar{ display: none !important; }

.calculator-card h1{
  font-size: 20px !important;
  margin: 0 0 14px !important;
  letter-spacing: -.8px !important;
}
.calculator-card .route{
  gap: 10px !important;
}
.calculator-card .route-arrow{
  height: 40px !important;
  font-size: 17px !important;
}
.calculator-card .field label{
  font-size: 8.5px !important;
  letter-spacing: 1.2px !important;
  margin: 0 0 4px 2px !important;
}
.calculator-card input,
.calculator-card .fake-select{
  height: 38px !important;
  font-size: 11.5px !important;
  border-radius: 10px !important;
  padding: 0 11px !important;
}
.calculator-card .fake-select b{ font-size: 13px !important; }
.calculator-card .section-title{
  margin: 12px 0 6px !important;
  font-size: 8.5px !important;
  letter-spacing: 1.7px !important;
}
.calculator-card .grid.three{
  gap: 8px !important;
}
.calculator-card .auto-calc-strip{
  margin-top: 8px !important;
  gap: 7px !important;
}
.calculator-card .auto-calc-strip>div{
  min-height: 40px !important;
  padding: 5px 10px !important;
  border-radius: 10px !important;
}
.calculator-card .auto-calc-strip span{ font-size: 7.5px !important; letter-spacing: 1px !important; }
.calculator-card .auto-calc-strip b{ font-size: 11.5px !important; }
.calculator-card .dimensions{
  margin-top: 8px !important;
  padding: 10px !important;
  border-radius: 14px !important;
}
.calculator-card .dimensions-head{
  margin-bottom: 6px !important;
  font-size: 8.5px !important;
}
.calculator-card .unit-choice{
  height: 20px !important;
  min-width: 26px !important;
  font-size: 8px !important;
  padding: 0 5px !important;
}
.calculator-card .centered-three{
  margin-top: 8px !important;
  gap: 8px !important;
}
.calculator-card .recommendation{
  margin-top: 6px !important;
  padding: 8px 10px !important;
  font-size: 10px !important;
}
.calculator-card .route-advice{
  margin-top: 6px !important;
}
.calculator-card .route-advice-main{
  padding: 10px 12px !important;
  gap: 10px !important;
}
.calculator-card .route-advice-icon{
  width: 30px !important;
  height: 30px !important;
  flex-basis: 30px !important;
  font-size: 15px !important;
}
.calculator-card .route-advice-text b{ font-size: 12px !important; margin-bottom: 3px !important; }
.calculator-card .route-advice-text p{ font-size: 11px !important; line-height: 1.4 !important; margin-bottom: 5px !important; }
.calculator-card .route-advice-modes{ font-size: 9.5px !important; padding-top: 4px !important; }
.calculator-card .route-advice-warn{ padding: 8px 12px !important; font-size: 11px !important; }
.calculator-card .calculate{
  height: 42px !important;
  margin-top: 10px !important;
  font-size: 12px !important;
  border-radius: 12px !important;
}
.calculator-card .currency-bar{
  margin-top: 8px !important;
  gap: 6px 10px !important;
  font-size: 11px !important;
}
.calculator-card .currency-item{
  padding: 5px 9px !important;
  font-size: 11px !important;
}
.calculator-card .currency-item b{ font-size: 12.5px !important; }
.calculator-card .currency-title{ font-size: 10.5px !important; }
.calculator-card .currency-source{ font-size: 8px !important; }
.calculator-card .container-warning{
  margin: 0 0 6px !important;
  padding: 7px 10px !important;
  font-size: 10px !important;
}
.calculator-card .hidden{ display: none !important; }

@media(max-width: 700px){
  .calculator-card{
    padding: 16px 14px 12px !important;
    max-height: calc(100svh - 20px) !important;
  }
  .calculator-card h1{ font-size: 17px !important; margin-bottom: 10px !important; }
  .calculator-card input,
  .calculator-card .fake-select{ height: 34px !important; font-size: 11px !important; }
}
"""

s3 = s3.rstrip() + '\n' + css_add
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: styles.css — блок v140 (компактный калькулятор)')

# ==================== INDEX.HTML ====================
p4 = 'index.html'
s4 = open(p4, 'r', encoding='utf-8').read()
s4 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>140', s4)
s4 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>140', s4)
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: index.html -> v140')
print('===== ГОТОВО =====')
