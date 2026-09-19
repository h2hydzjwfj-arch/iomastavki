import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1) Более устойчивый перевод при 429 — 5 попыток с растущими паузами
old_retry = '''    let success = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log('[translateNews] BATCH ' + (Math.floor(start/BATCH)+1) + ' attempt ' + attempt);
        const translated = await aiChatJSON(system, user, 2500);
        if (translated && Array.isArray(translated.items)){
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
          success = true;
          break;
        }
      } catch (e) {
        console.warn('[translateNews] attempt ' + attempt + ' failed: ' + e.message);
        if (attempt < 2) await new Promise(function(r){ setTimeout(r, 2500); });
      }
    }
    if (!success) {
      console.warn('[translateNews] BATCH failed — keeping Russian');
      for (const b of batch) allTranslated.push(b);
    }'''

new_retry = '''    let success = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log('[translateNews] BATCH ' + (Math.floor(start/BATCH)+1) + ' attempt ' + attempt);
        const translated = await aiChatJSON(system, user, 2500);
        if (translated && Array.isArray(translated.items)){
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
          success = true;
          break;
        }
      } catch (e) {
        const wait = 3000 * attempt;
        console.warn('[translateNews] attempt ' + attempt + ' failed, wait ' + wait + 'ms: ' + e.message);
        if (attempt < 5) await new Promise(function(r){ setTimeout(r, wait); });
      }
    }
    if (!success) {
      console.warn('[translateNews] BATCH failed — keeping Russian');
      for (const b of batch) allTranslated.push(b);
    }'''

if old_retry in s:
    s = s.replace(old_retry, new_retry)
    print('OK: retry логика для 429 (5 попыток с растущими паузами)')

# 2) Чистим источники: расширяем regex — ловим "Vgudok", "Güney Otomobil" и любые латинские после " - "
old_clean = '''  function cleanTitleFromSource(t){
    let x = String(t||'').trim();
    // Убираем " - Source.ru", " — Source.ru", " – Source.com", "- .ua"
    x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv)(?:\\.[a-z]{2})?\\s*$/i, '');
    // Убираем " - Правда.Ру", " - Alfa-Soft" и т.п.
    x = x.replace(/\\s+[-–—]\\s+(?:Правда\\.?Ру|Альта[-\\s]?Софт|Логирус|ТАСС|РБК|Интерфакс|Коммерсантъ?|Ведомости|Известия|Форбс|Forbes|Reuters|Bloomberg|Интерфакс|Delo\\.ua|Alfa-Soft|Logirus|TKS\\.RU|Portnews|Trans\\.ru|Biznes Online|Eastrussia|Vgudok|AMIT[\\s\\"']*\\w*|AsiaRussia|Inbusiness\\.kz|dknews\\.kz|Sputnik[\\w\\s]*|Правда\\s*\\.?\\s*Ру|Бизнес\\s*Online)[\\s\\"']*$/i, '');
    return x.trim();
  }'''

new_clean = '''  function cleanTitleFromSource(t){
    let x = String(t||'').trim();
    // Убираем " - Source.ru", " — Source.ua", " – Source.com" и любые домены
    x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё0-9][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\\.[a-z]{2})?\\s*$/i, '');
    // Убираем любые остатки после " - " где в конце латиница или кириллица без точки
    // Простые имена источников (2-3 слова максимум)
    x = x.replace(/\\s+[-–—]\\s+[A-Z][a-zA-Z]+(?:[\\s\\-][A-Z][a-zA-Z]+){0,2}\\s*$/i, '');
    x = x.replace(/\\s+[-–—]\\s+[А-ЯЁ][а-яё]+(?:[\\s\\-][А-ЯЁ][а-яё]+){0,2}\\s*$/i, '');
    // Конкретные источники
    x = x.replace(/\\s+[-–—]\\s+(?:Правда\\.?Ру|Альта[-\\s]?Софт|Логирус|ТАСС|РБК|Интерфакс|Коммерсантъ?|Ведомости|Известия|Форбс|Forbes|Reuters|Bloomberg|Delo\\.ua|Alfa-Soft|Logirus|TKS\\.RU|Portnews|Trans\\.ru|Biznes Online|Eastrussia|Vgudok|AMIT[\\s\\"']*\\w*|AsiaRussia|Inbusiness\\.kz|dknews\\.kz|Sputnik[\\w\\s]*|Правда\\s*\\.?\\s*Ру|Бизнес\\s*Online|Güney Otomobil|Sostav\\.ru|ATI\\.su|Lenta\\.ru|RBC|Izvestia|Vedomosti|Sputnik)[\\s\\"']*$/i, '');
    return x.trim();
  }'''

if old_clean in s:
    s = s.replace(old_clean, new_clean)
    print('OK: очистка заголовков — расширена')

# 3) Pexels: добавляем случайность в запрос чтобы картинки не повторялись
old_fetch = '''async function fetchPexelsImage(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const q = String(query||'').trim();
  if (!q) return null;
  try {
    const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=1&orientation=landscape';
    const r = await fetch(url, { headers: { 'Authorization': key }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      return (d.photos && d.photos[0] && d.photos[0].src && (d.photos[0].src.large || d.photos[0].src.landscape || d.photos[0].src.original)) || null;
    }
  } catch (e) { console.warn('Pexels error:', e.message); }
  return null;
}'''

new_fetch = '''async function fetchPexelsImage(query, seed) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const q = String(query||'').trim();
  if (!q) return null;
  try {
    // Запрашиваем 15 фото и выбираем случайное на основе seed — чтобы не повторялись
    const perPage = 15;
    const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=' + perPage + '&orientation=landscape';
    const r = await fetch(url, { headers: { 'Authorization': key }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      if (d.photos && d.photos.length){
        const idx = seed != null ? (Math.abs(Number(seed)) % d.photos.length) : Math.floor(Math.random() * d.photos.length);
        const p = d.photos[idx] || d.photos[0];
        return (p.src && (p.src.large || p.src.landscape || p.src.original)) || null;
      }
    }
  } catch (e) { console.warn('Pexels error:', e.message); }
  return null;
}'''

if old_fetch in s:
    s = s.replace(old_fetch, new_fetch)
    print('OK: Pexels — случайный выбор из 15 фото')

# 4) В fetchNews передаём seed для каждой новости чтобы картинки не повторялись
old_img_loop = '''      const enriched = await Promise.all(selected.slice(0, 30).map(async function(item){
        if (item.image) return item;
        const queries = defaultImageQueries(item.title);
        const img = await fetchPexelsImage(queries[0]);
        return Object.assign({}, item, {image: img || ''});
      }));'''

new_img_loop = '''      const enriched = await Promise.all(selected.slice(0, 30).map(async function(item, idx){
        if (item.image) return item;
        const queries = defaultImageQueries(item.title);
        const img = await fetchPexelsImage(queries[0], idx * 7 + new Date(item.date).getTime());
        return Object.assign({}, item, {image: img || ''});
      }));'''

if old_img_loop in s:
    s = s.replace(old_img_loop, new_img_loop)
    print('OK: images — уникальный seed для каждой новости')

# 5) Статья: если AI не смог — fallback из описания
old_gen = '''    if (!article || !article.content) throw new Error('AI не сгенерировал content');'''

new_gen = '''    if (!article || !article.content) throw new Error('AI не сгенерировал content');'''

# 6) Если /api/news/article падает на 429 — попробуем 2 раза с паузой
old_endpoint = '''  try {
    let raw = await aiChat(systemPrompt, userPrompt, 4000);
    raw = raw.replace(/^```json\\s*/i, '').replace(/```\\s*$/i, '').trim();
    let article;
    try { article = JSON.parse(raw); }
    catch(e) {
      const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) article = JSON.parse(raw.slice(a, b+1));
      else throw new Error('AI вернул не-JSON');
    }
    if (!article.content) throw new Error('AI не сгенерировал content');'''

new_endpoint = '''  let article = null;
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log('[article] attempt ' + attempt);
      let raw = await aiChat(systemPrompt, userPrompt, 4000);
      raw = raw.replace(/^```json\\s*/i, '').replace(/```\\s*$/i, '').trim();
      try { article = JSON.parse(raw); }
      catch(e) {
        const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
        if (a >= 0 && b > a) article = JSON.parse(raw.slice(a, b+1));
        else throw new Error('AI вернул не-JSON');
      }
      if (article && article.content) break;
      throw new Error('AI не сгенерировал content');
    } catch (e) {
      lastError = e.message;
      console.warn('[article] attempt ' + attempt + ' failed: ' + lastError);
      article = null;
      if (attempt < 3) await new Promise(function(r){ setTimeout(r, 4000 * attempt); });
    }
  }
  if (!article || !article.content) {
    // Fallback — статья из описания (чтобы не показывать ошибку)
    console.warn('[article] Все попытки провалились: ' + lastError);
    article = {
      title: title,
      subtitle: description || '',
      content: '## Кратко\\n\\n' + (description || 'Новость от источника ' + sourceName) + '\\n\\n## Что это значит для логистики\\n\\nМатериал обрабатывается. Пожалуйста, обновите страницу через 1-2 минуты, или прочитайте полную версию по ссылке внизу.\\n\\n## Что проверить\\n\\n- Базис поставки (Incoterms)\\n- Код ТН ВЭД\\n- Документы и разрешения\\n- Даты вступления изменений в силу',
      podcast: ''
    };
  }'''

if old_endpoint in s:
    s = s.replace(old_endpoint, new_endpoint)
    print('OK: /api/news/article — 3 попытки + fallback')
else:
    print('WARN: блок генерации статьи не найден — ищу другой вариант')
    # Ищем более простой паттерн
    if "let raw = await aiChat(systemPrompt, userPrompt, 4000);" in s:
        s = s.replace("let raw = await aiChat(systemPrompt, userPrompt, 4000);",
                      "let article = await aiChatJSON(systemPrompt, userPrompt, 4000);\n    if (!article || !article.content) throw new Error('AI не сгенерировал content');")
        print('OK: простой вариант замены')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>55', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>55', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v55')
print('===== ВСЁ ГОТОВО =====')
