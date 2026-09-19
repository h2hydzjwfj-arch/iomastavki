p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Улучшенные ключевые слова — ВСЕГДА релевантные теме
old_fn = s.find('function defaultImageQueries(title)')
end_fn = s.find('\n}', old_fn)
if old_fn < 0 or end_fn < 0:
    print('❌ defaultImageQueries не найдена')
    exit()

new_fn = '''function defaultImageQueries(title){
  const t = String(title||'').toLowerCase();
  // Все запросы на английском — Pexels лучше всего их понимает
  if (/таможен|пошлин|тн.?вэд|маркиров|декларац|customs|duty|tariff/.test(t))
    return ['customs office', 'cargo terminal', 'shipping documents'];
  if (/железнодорож|жд\\b|поезд|rail|train/.test(t))
    return ['freight train', 'railway cargo', 'container train'];
  if (/мор|порт|судно|контейнер|sea|ship|port|container/.test(t))
    return ['container ship', 'cargo port', 'shipping containers'];
  if (/авиа|самолёт|air|flight|cargo plane/.test(t))
    return ['cargo airplane', 'air freight', 'airport cargo'];
  if (/индия|india/.test(t))
    return ['India port', 'Indian logistics', 'Mumbai port'];
  if (/китай|china/.test(t))
    return ['China port', 'Shanghai container', 'Chinese warehouse'];
  if (/россия|russia|москв/.test(t))
    return ['Moscow logistics', 'Russian railway', 'cargo truck'];
  if (/корея|korea|япония|japan|вьетнам|vietnam|индонезия/.test(t))
    return ['Asian port', 'Asia logistics', 'cargo shipping'];
  if (/газ|нефт|oil|gas|энерг/.test(t))
    return ['oil tanker', 'gas pipeline', 'energy logistics'];
  if (/склад|warehouse|логист/.test(t))
    return ['warehouse logistics', 'shipping cargo', 'freight logistics'];
  // Универсальный fallback
  return ['cargo logistics', 'shipping containers', 'freight transport'];
}'''
s = s[:old_fn] + new_fn + s[end_fn+2:]

# 2. Проверяем image_query из AI — если не латиница или пустой, берём fallback
old_line = "const mainQuery = String(article.image_query || '').trim() || defaultImageQueries(title)[0];"
new_line = """// Улучшенная логика: всегда английский, всегда релевантный
    let mainQuery = String(article.image_query || '').trim();
    // Если запрос содержит кириллицу — игнорируем, берём из defaultImageQueries
    if (!mainQuery || /[а-яёА-ЯЁ]/.test(mainQuery) || !/[a-zA-Z]/.test(mainQuery)) {
      mainQuery = defaultImageQueries(title)[0];
    }
    // Ограничиваем 4 словами
    mainQuery = mainQuery.split(/\\s+/).slice(0, 4).join(' ');"""

if old_line in s:
    s = s.replace(old_line, new_line)
    print('OK: логика image_query улучшена')
else:
    print('WARN: строка mainQuery не найдена — ищу вариацию')
    import re
    s = re.sub(r"const mainQuery = .*defaultImageQueries\(title\)\[0\];", new_line, s)
    print('OK: применена regex-замена')

# 3. Пробуем несколько запросов, если первый не дал картинку
old_fetch = "const mainImage = await fetchPexelsImage(mainQuery);"
new_fetch = """// Пробуем несколько запросов по очереди, пока не найдём фото
    let mainImage = null;
    const queries = [mainQuery].concat(defaultImageQueries(title)).slice(0, 5);
    for (const q of queries) {
      const img = await fetchPexelsImage(q);
      if (img) { mainImage = img; console.log('[article] image found by: ' + q); break; }
    }"""

if old_fetch in s:
    s = s.replace(old_fetch, new_fetch)
    print('OK: пробуем несколько запросов')
else:
    print('WARN: mainImage не найден')

# 4. Убираем галерею (в ней были мусорные фото)
old_gal = """let galleryQueries = Array.isArray(article.image_queries) ? article.image_queries.filter(Boolean).slice(0, 5) : [];
    if (!galleryQueries.length) galleryQueries = defaultImageQueries(title);
    const gallery = await fetchPexelsGallery(galleryQueries, 4);
    const galleryFiltered = gallery.filter(function(x){return x && x !== mainImage;});
    article.image = mainImage || galleryFiltered[0] || '';
    article.images = galleryFiltered.slice(0, 4);"""

new_gal = """article.image = mainImage || '';
    article.images = [];"""

if old_gal in s:
    s = s.replace(old_gal, new_gal)
    print('OK: галерея убрана')
else:
    print('WARN: блок галереи не найден')

open(p, 'w', encoding='utf-8').write(s)
print('==== Готово ====')
