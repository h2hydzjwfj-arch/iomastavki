p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

old_q = """  const queries = [
    [googleNewsQuery('таможня ЕАЭС пошлина'), 'Google News · Таможня'],
    [googleNewsQuery('грузоперевозки Китай Россия'), 'Google News · Китай-Россия'],
    [googleNewsQuery('логистика Китай'), 'Google News · Логистика'],
    [googleNewsQuery('ТН ВЭД маркировка'), 'Google News · ТН ВЭД'],
    [googleNewsQuery('контейнерные перевозки'), 'Google News · Контейнеры'],
    [googleNewsQuery('железнодорожные перевозки Китай'), 'Google News · Ж/Д'],
    [googleNewsQuery('морские перевозки порт'), 'Google News · Море'],
    [googleNewsQuery('внешнеэкономическая деятельность ВЭД'), 'Google News · ВЭД']
  ];"""

new_q = """  const queries = [
    [googleNewsQuery('логистика Китай Россия'), 'Логистика · Китай-Россия'],
    [googleNewsQuery('грузоперевозки Китай Россия'), 'Грузоперевозки · Китай-Россия'],
    [googleNewsQuery('импорт из Китая в Россию'), 'Импорт · Китай'],
    [googleNewsQuery('таможня ЕАЭС пошлина ВЭД'), 'Таможня · ЕАЭС'],
    [googleNewsQuery('ТН ВЭД маркировка импорт'), 'ТН ВЭД · Маркировка'],
    [googleNewsQuery('контейнерные перевозки Китай'), 'Контейнеры · Китай'],
    [googleNewsQuery('железнодорожные перевозки Китай Россия'), 'Ж/Д · Китай-Россия'],
    [googleNewsQuery('морские перевозки Азия Россия'), 'Море · Азия'],
    [googleNewsQuery('логистика Индия Россия'), 'Логистика · Индия'],
    [googleNewsQuery('логистика Южная Корея Россия'), 'Логистика · Корея'],
    [googleNewsQuery('логистика Япония Россия'), 'Логистика · Япония'],
    [googleNewsQuery('экспедирование международные перевозки'), 'Экспедирование']
  ];"""

if old_q in s:
    s = s.replace(old_q, new_q)
    print('OK: список запросов обновлён')
else:
    print('WARN: queries не найдены 1:1')

# Фильтр от Украины и политики
if '// Исключаем нерелевантные темы' not in s:
    fn_idx = s.find('async function fetchNews')
    if fn_idx > 0:
        seen_idx = s.find('const seen = new Set();', fn_idx)
        if seen_idx > 0:
            filter_code = """  // Исключаем нерелевантные темы (Украина и политика)
  const BAD_TOPICS = /(украин|киев|київ|ukrain|киевск|одесс|харьков|львов|донец|луганск|крым|мариупол|запорож|херсон|николаев|чернигов|ВСУ|ЗСУ|політик|политик[а-яё]*\\s+украин)/i;
  all = all.filter(function(x){
    const text = String(x.title||'') + ' ' + String(x.description||'');
    return !BAD_TOPICS.test(text);
  });

"""
            s = s[:seen_idx] + filter_code + s[seen_idx:]
            print('OK: фильтр от Украины добавлен')
        else:
            print('FAIL: не нашёл seen в fetchNews')
    else:
        print('FAIL: не нашёл fetchNews')
else:
    print('OK: фильтр уже есть')

open(p, 'w', encoding='utf-8').write(s)
print('==== Готово ====')
