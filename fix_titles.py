import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1) Расширяем BAD_DOMAINS и добавляем очистку в фильтре
old_filter = '''  // Жёсткая фильтрация: Украина + политика + запрещённые домены
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

new_filter = '''  // Жёсткая фильтрация: Украина + политика + запрещённые домены
  const BAD_TOPICS = /(украин|киев|київ|ukrain|киевск|одесс|харьков|львов|донец|луганск|крым|мариупол|запорож|херсон|николаев|чернигов|ВСУ|ЗСУ|політик|политик[а-яё]*\\s+украин|зеленск|киевstar|київстар)/i;
  const BAD_DOMAINS = /(\\.ua\\b|delo\\.ua|pravda\\.com\\.ua|ukrinform|unian|112\\.ua|gordonua|strana\\.ua|liga\\.net|korrespondent\\.net|lenta\\.ua|zn\\.ua|epravda|24tv\\.ua|tsn\\.ua|fakty\\.com\\.ua|obozrevatel|focus\\.ua|nv\\.ua|biz\\.liga|hromadske)/i;
  // Очистка заголовка от источника в конце: "Новость - Pravda.Ru" → "Новость"
  function cleanTitleFromSource(t){
    let x = String(t||'').trim();
    // Убираем " - Source.ru", " — Source.ru", " – Source.com", "- .ua"
    x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv)(?:\\.[a-z]{2})?\\s*$/i, '');
    // Убираем " - Правда.Ру", " - Alfa-Soft" и т.п.
    x = x.replace(/\\s+[-–—]\\s+(?:Правда\\.?Ру|Альта[-\\s]?Софт|Логирус|ТАСС|РБК|Интерфакс|Коммерсантъ?|Ведомости|Известия|Форбс|Forbes|Reuters|Bloomberg|Интерфакс|Delo\\.ua|Alfa-Soft|Logirus|TKS\\.RU|Portnews|Trans\\.ru|Biznes Online|Eastrussia|Vgudok|AMIT[\\s\\"']*\\w*|AsiaRussia|Inbusiness\\.kz|dknews\\.kz|Sputnik[\\w\\s]*|Правда\\s*\\.?\\s*Ру|Бизнес\\s*Online)[\\s\\"']*$/i, '');
    return x.trim();
  }
  all = all.filter(function(x){
    const text = String(x.title||'') + ' ' + String(x.description||'') + ' ' + String(x.link||'');
    if (BAD_TOPICS.test(text)) return false;
    if (BAD_DOMAINS.test(String(x.link||''))) return false;
    if (BAD_DOMAINS.test(String(x.source||''))) return false;
    // Проверка: если заголовок содержит ".ua" — тоже блокируем
    if (/\\.ua\\b/i.test(String(x.title||''))) return false;
    return true;
  });
  // Чистим заголовки от источников
  all = all.map(function(x){
    return Object.assign({}, x, {title: cleanTitleFromSource(x.title)});
  });
  console.log('[fetchNews] filtered to ' + all.length + ' items (removed Ukraine/politics, cleaned titles)');'''

if old_filter in s:
    s = s.replace(old_filter, new_filter)
    print('OK: фильтр обновлён + очистка заголовков')
else:
    print('WARN: старый фильтр не найден — добавлю очистку отдельно')
    # Пробуем найти блок фильтра попроще
    if 'BAD_DOMAINS' in s:
        idx = s.find('const BAD_TOPICS')
        if idx > 0:
            # ужесточаем regex инлайн
            s = s.replace("const BAD_DOMAINS = /\\.ua\\b|delo\\.ua|pravda\\.com\\.ua|ukrinform|unian|112\\.ua|gordonua|strana\\.ua|liga\\.net|korrespondent\\.net|lenta\\.ua|zn\\.ua|epravda/i;",
                         "const BAD_DOMAINS = /(\\.ua\\b|delo\\.ua|pravda\\.com\\.ua|ukrinform|unian|112\\.ua|gordonua|strana\\.ua|liga\\.net|korrespondent\\.net|lenta\\.ua|zn\\.ua|epravda|24tv\\.ua|tsn\\.ua|fakty\\.com\\.ua|obozrevatel|focus\\.ua|nv\\.ua|biz\\.liga|hromadske)/i;")
            print('OK: BAD_DOMAINS ужесточён (inline)')

# 2) Заменяем промпт статьи — чтобы AI не включал источник в заголовок
old_prompt = "'Заголовок: ' + title + '\\n' +"
new_prompt = "'Тема новости (без названия источника): ' + title + '\\n' +"

if old_prompt in s:
    s = s.replace(old_prompt, new_prompt)
    print('OK: промпт статьи — без источника в заголовке')
else:
    print('WARN: строка промпта не найдена')

# 3) Добавляем явное требование не включать источник в title
old_req = "'Формат СТРОГО JSON без markdown:\\n{\"title\":\"...\",\"subtitle\":\"...\",\"content\":\"...markdown...\",\"podcast\":\"...\",\"image_query\":\"cargo logistics\",\"image_queries\":[\"container port\",\"freight train\",\"customs documents\"]}'"
new_req = "'Формат СТРОГО JSON без markdown:\\n' +\n    '{\"title\":\"...\",\"subtitle\":\"...\",\"content\":\"...markdown...\",\"podcast\":\"...\",\"image_query\":\"cargo logistics\"}\\n\\n' +\n    'ВАЖНО: В поле title НЕ включай название источника и домен (никаких Pravda.Ru, Delo.ua, TKS.RU, Alfa-Soft). Только суть новости.'"

if old_req in s:
    s = s.replace(old_req, new_req)
    print('OK: промпт статьи — запрет источника в title')
else:
    print('WARN: строка формата JSON не найдена — оставляем как есть')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Клиентская очистка заголовка от источника (двойная страховка)
helper = '''
function stripSourceFromTitle(t){
  let x = String(t||'').trim();
  x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv)(?:\\.[a-z]{2})?\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+(?:Правда\\.?Ру|Альта[-\\s]?Софт|Логирус|ТАСС|РБК|Интерфакс|Delo\\.ua|Alfa-Soft|Logirus|TKS\\.RU|Portnews|Trans\\.ru|Biznes Online|Eastrussia|Vgudok|AMIT[\\s"']*\\w*|AsiaRussia|Inbusiness\\.kz|dknews\\.kz|Правда\\s*\\.?\\s*Ру|Бизнес\\s*Online)[\\s"']*$/i, '');
  return x.trim();
}
'''

if 'function stripSourceFromTitle' not in s2:
    # Вставляем helper перед renderArticleFull или openArticle
    anchor = s2.find('async function openArticle')
    if anchor < 0:
        anchor = s2.find('let articleMemCache')
    if anchor > 0:
        s2 = s2[:anchor] + helper + '\n' + s2[anchor:]
        print('OK: app.js — helper stripSourceFromTitle добавлен')
    else:
        print('WARN: не нашёл место для helper')

# Применяем в openArticle: title = stripSourceFromTitle(...)
old_title = "const title = cleanNewsText(n.title || '');"
new_title = "const title = stripSourceFromTitle(cleanNewsText(n.title || ''));"

count = s2.count(old_title)
if count > 0:
    s2 = s2.replace(old_title, new_title)
    print('OK: очистка заголовка применена (' + str(count) + ' мест)')
else:
    print('WARN: cleanNewsText(n.title не найден')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== app.js готов ====')
print('===== ВСЁ ГОТОВО =====')
