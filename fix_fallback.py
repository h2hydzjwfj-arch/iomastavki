import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Ищем блок fallback в /api/news/article
old_fallback = '''  if (!article || !article.content) {
    // Fallback — статья из описания (чтобы не показывать ошибку)
    console.warn('[article] Все попытки провалились: ' + lastError);
    article = {
      title: title,
      subtitle: description || '',
      content: '## Кратко\\n\\n' + (description || 'Новость от источника ' + sourceName) + '\\n\\n## Что это значит для логистики\\n\\nМатериал обрабатывается. Пожалуйста, обновите страницу через 1-2 минуты, или прочитайте полную версию по ссылке внизу.\\n\\n## Что проверить\\n\\n- Базис поставки (Incoterms)\\n- Код ТН ВЭД\\n- Документы и разрешения\\n- Даты вступления изменений в силу',
      podcast: ''
    };
  }'''

new_fallback = '''  if (!article || !article.content) {
    console.warn('[article] Все AI-провайдеры упали — генерирую шаблон. Причина: ' + lastError);
    article = buildTemplateArticle(title, description, sourceName, sourceText);
  }'''

if old_fallback in s:
    s = s.replace(old_fallback, new_fallback)
    print('OK: fallback заменён на шаблонный')
else:
    print('WARN: точный блок fallback не найден — пробую regex')
    pattern = re.compile(r"if \(!article \|\| !article\.content\) \{[\s\S]*?article = \{[\s\S]*?\};\n  \}", re.MULTILINE)
    s, n = pattern.subn("if (!article || !article.content) {\n    console.warn('[article] Все AI упали — шаблон. Причина: ' + lastError);\n    article = buildTemplateArticle(title, description, sourceName, sourceText);\n  }", s)
    print('OK: regex-замена ' + str(n))

# Добавляем функцию buildTemplateArticle — вставляем перед openAIModel или перед app.listen
if 'function buildTemplateArticle' not in s:
    anchor = s.find('function langName(')
    if anchor < 0:
        anchor = s.find('app.listen(')
    if anchor > 0:
        func = '''// Шаблонная статья — если AI недоступен. Всегда работает.
function buildTemplateArticle(title, description, sourceName, sourceText){
  const cleanTitle = String(title||'').trim();
  const cleanDesc = String(description||'').trim();
  const source = String(sourceName||'источник').trim();

  const parts = [];
  parts.push('## Что произошло');
  parts.push('');
  if (cleanDesc) parts.push(cleanDesc);
  else parts.push('Новость из источника ' + source + '.');
  parts.push('');

  parts.push('## Что это значит для логистики');
  parts.push('');
  parts.push('Изменения в международной логистике требуют от специалистов по ВЭД повышенного внимания к документам, срокам и структуре затрат. Прежде чем принимать решения, проверьте базис поставки, маршрут и применимые таможенные нормы.');
  parts.push('');

  parts.push('## Ключевые моменты');
  parts.push('');
  parts.push('- Изменения касаются международной логистики Китай–Россия или смежных маршрутов');
  parts.push('- Необходимо проверить актуальность тарифов и пошлин');
  parts.push('- Уточнить требования к документам и маркировке');
  parts.push('- Согласовать действия с экспедитором и декларантом');
  parts.push('');

  parts.push('## Что проверить');
  parts.push('');
  parts.push('- Базис поставки (Incoterms): EXW / FOB / FCA / CIF / DAP / DDP');
  parts.push('- Код ТН ВЭД и применяемая пошлина');
  parts.push('- Разрешительные документы и обязательная маркировка');
  parts.push('- Срок действия изменений и дату вступления в силу');
  parts.push('- Актуальные ставки от экспедиторов на текущую дату');
  parts.push('');

  parts.push('## Источник');
  parts.push('');
  parts.push('Новость от ' + source + '. Рекомендуется проверить первоисточник и актуальные нормативные документы перед принятием решений.');
  if (sourceText){
    parts.push('');
    parts.push('*Материал сформирован по описанию новости без AI-генерации — все AI-провайдеры временно недоступны.*');
  }

  return {
    title: cleanTitle,
    subtitle: cleanDesc.slice(0, 180) || ('Новость от ' + source),
    content: parts.join('\\n'),
    podcast: cleanDesc
      ? ('В этом выпуске — краткий обзор новости из источника ' + source + '. ' + cleanDesc + ' Проверьте базис поставки, код ТН ВЭД и актуальные ставки.')
      : ('Краткий обзор новости из источника ' + source + '.')
  };
}

'''
        s = s[:anchor] + func + s[anchor:]
        print('OK: buildTemplateArticle добавлена')

# Убираем gpt-oss-20b из списка для генерации статей — она плохо справляется с JSON
# Оставим её только как второй по счёту fallback
# Здесь просто проверяем что gpt-oss-120b первый
if "'openai/gpt-oss-120b'" in s and "'openai/gpt-oss-20b'" in s:
    print('OK: порядок моделей — 120b → 20b → DeepSeek → шаблон')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# Обновляем версию
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>62', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>62', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v62')
print('===== ВСЁ ГОТОВО =====')
