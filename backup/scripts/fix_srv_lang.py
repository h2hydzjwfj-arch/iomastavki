p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Заменим генерацию статьи, чтобы точно уважала language
old = "const systemPrompt = 'Ты опытный редактор-аналитик в области международной логистики, ВЭД и таможни. Пишешь подробные, полезные, экспертные статьи для русскоязычного специалиста-логиста. Живо, но по делу.';"
new = "const LANG = (language==='en'?'English':language==='tr'?'Turkish':language==='zh'?'Chinese':'Russian');\n  const systemPrompt = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Do not mix languages. Use specific terms, laws, numbers. Output JSON only.';"

if old in s:
    s = s.replace(old, new)
    print('OK: systemPrompt теперь динамический')
else:
    print('WARN: systemPrompt не найден')

# Меняем userPrompt чтобы язык передавался явно
old_prompt = "'Напиши подробную аналитическую статью на русском языке.\\n\\n' +"
new_prompt = "'Write a detailed analytical article in ' + (language==='en'?'English':language==='tr'?'Turkish':language==='zh'?'Chinese':'Russian') + '.\\n\\n' +"

if old_prompt in s:
    s = s.replace(old_prompt, new_prompt)
    print('OK: userPrompt теперь мультиязычный')
else:
    print('WARN: userPrompt не найден — ищу другой вариант')
    # Альтернативный вариант
    if "Напиши подробную аналитическую статью" in s:
        s = s.replace("Напиши подробную аналитическую статью на русском языке.\\n\\n",
                      "' + (language==='en'?'Write in English.':language==='tr'?'Türkçe yaz.':language==='zh'?'用中文写。':'Напиши на русском.') + '\\n\\n")
        print('OK: альтернативный вариант применён')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js обновлён ====')
