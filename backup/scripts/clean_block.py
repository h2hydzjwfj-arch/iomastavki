p = 'app.js'
lines = open(p, 'r', encoding='utf-8').read().split('\n')

print('=== До очистки: ' + str(len(lines)) + ' строк ===')

# Находим блок мусора вокруг "backgroundRefresh()});10*60*1000" до "});"
# Ищем начало: строка с "setInterval(()=>{if(document.visibilityState==='visible')backgroundRefresh()},10*60*1000);"
# и удаляем всё до следующей полезной строки

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    # Ищем строку с setInterval visibilityState
    if "setInterval(()=>{if(document.visibilityState" in line and "backgroundRefresh" in line:
        start_idx = i + 1  # со следующей строки
        print('Найден конец полезного блока в строке ' + str(i+1))
        break

if start_idx > 0:
    # Ищем конец мусора — первую строку, начинающуюся с нормального кода (не с пробелов + },); или подобного)
    for j in range(start_idx, min(start_idx + 10, len(lines))):
        line = lines[j].strip()
        # Конец мусора — строка типа "});" на последнем уровне, после которого идёт пустота или ничего
        if line == '});' or line == '}' or line == '':
            end_idx = j
            # Продолжаем пока пустые строки
            while end_idx + 1 < len(lines) and not lines[end_idx + 1].strip():
                end_idx += 1
            break
    
    if end_idx > start_idx:
        print('Удаляю блок строк ' + str(start_idx + 1) + '-' + str(end_idx + 1))
        for i in range(start_idx, end_idx + 1):
            print('  del: ' + lines[i][:100])
        del lines[start_idx:end_idx + 1]
        print('OK: блок удалён')
    else:
        print('Не нашёл конец блока')
else:
    print('❌ Не нашёл начало блока setInterval')

# Обрезаем пустые строки в конце
while lines and not lines[-1].strip():
    lines.pop()

# Убираем пустые строки подряд в конце (оставляем одну)
while len(lines) >= 2 and not lines[-1].strip() and not lines[-2].strip():
    lines.pop()

open(p, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

content = '\n'.join(lines)
open_c = content.count('{')
close_c = content.count('}')
print('=== После: ' + str(len(lines)) + ' строк, скобки: { = ' + str(open_c) + ', } = ' + str(close_c))
if open_c == close_c:
    print('✅ БАЛАНС ОК')
else:
    print('⚠️ Дисбаланс: ' + str(open_c - close_c))
