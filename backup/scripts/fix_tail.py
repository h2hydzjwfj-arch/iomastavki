lines = open('app.js', 'r', encoding='utf-8').read().split('\n')

# Показываем последние 20 строк
print('=== Последние 20 строк ===')
for i in range(max(0, len(lines) - 20), len(lines)):
    print('{:3d}: {}'.format(i+1, lines[i][:110]))
print()

# Ищем последнюю закрывающую скобку без пары.
# Стратегия: удалить последний блок, начинающийся с пустой строки + "});" в конце файла
# Удалим все пустые строки и блоки "});", "}" в конце
while lines:
    last = lines[-1].strip()
    if last == '' or last == '});' or last == '}' or last == ');':
        print('Удаляю последнюю строку: ' + repr(lines[-1]))
        lines.pop()
    else:
        break

# Добавляем пустую строку в конце
lines.append('')

open('app.js', 'w', encoding='utf-8').write('\n'.join(lines))

content = '\n'.join(lines)
open_c = content.count('{')
close_c = content.count('}')
print()
print('Баланс: { = ' + str(open_c) + ', } = ' + str(close_c))
if open_c == close_c:
    print('✅ БАЛАНС ОК')
else:
    print('⚠️ Дисбаланс: ' + str(open_c - close_c))
