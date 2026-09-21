p = 'app.js'
lines = open(p, 'r', encoding='utf-8').read().split('\n')

# Показываем контекст — что вокруг строки 844
print('--- Контекст вокруг ошибки (строки 835-855) ---')
for i in range(max(0, 834), min(len(lines), 855)):
    mark = ' <<<' if (i + 1) in [841, 842, 843, 844, 845] else ''
    print(str(i + 1) + ': ' + lines[i][:100] + mark)
print('---')

# Ищем блок от "document.addEventListener('DOMContentLoaded'" до "}, 100);"
# Это моя сломанная попытка, которую нужно удалить
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "DOMContentLoaded" in line and "setTimeout" in lines[min(i+1, len(lines)-1)]:
        start_idx = i
    if start_idx >= 0 and "}, 100);" in line and end_idx < 0:
        end_idx = i
        break

if start_idx >= 0 and end_idx > start_idx:
    print('Найден блок для удаления: строки ' + str(start_idx + 1) + '-' + str(end_idx + 1))
    for i in range(start_idx, end_idx + 1):
        print('  удаляю: ' + lines[i][:100])
    # Удаляем блок и пустые строки рядом
    del lines[start_idx:end_idx + 1]
    # Удаляем пустые строки в конце файла
    while lines and not lines[-1].strip():
        lines.pop()
    print('OK: блок удалён')
else:
    # Если не нашли готовый блок — удаляем просто строку с "}, 100);"
    print('Ищу строку "}, 100);" отдельно...')
    removed = False
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == '}, 100);':
            print('Удаляю строку ' + str(i+1) + ': ' + lines[i])
            del lines[i]
            removed = True
            break
    if not removed:
        print('❌ Не нашёл "}, 100);"')

open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('==== Готово ====')

# Проверяем баланс
content = '\n'.join(lines)
open_c = content.count('{')
close_c = content.count('}')
print('Баланс: { = ' + str(open_c) + ', } = ' + str(close_c))
if open_c == close_c:
    print('✅ Скобки в балансе')
else:
    print('⚠️ Дисбаланс: ' + str(open_c - close_c))
