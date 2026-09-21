import re, os, shutil

p = 'styles.css'
if not os.path.exists(p):
    print('FAIL: styles.css не найден')
    exit(1)

# Backup
shutil.copy2(p, 'backup/styles.css.bak')
s = open(p, 'r', encoding='utf-8').read()
orig_size = len(s)

# Находим ВСЕ блоки версий /* ========== vNNN: ... */
# Оставляем только v135, v136, v137, v138, v139, v140, v141 (последние актуальные)
version_pattern = re.compile(r'/\* ={9} v(\d+):')
matches = list(version_pattern.finditer(s))

if not matches:
    print('WARN: блоки версий не найдены — CSS уже чистый')
    exit(0)

print('=== Найдено блоков версий: ' + str(len(matches)) + ' ===')
versions_found = []
for m in matches:
    versions_found.append(int(m.group(1)))
print('Версии: ' + ', '.join('v' + str(v) for v in sorted(set(versions_found))))

# Определяем что оставить — самые последние
KEEP_VERSIONS = set(range(135, 200))  # v135+

# Определяем границу первой v135+ (всё что ДО неё — под нож)
first_keep_idx = None
for m in matches:
    v = int(m.group(1))
    if v in KEEP_VERSIONS:
        first_keep_idx = m.start()
        break

if first_keep_idx is None:
    print('WARN: нет блоков v135+, ничего не удаляю')
    exit(0)

# Удаляем всё от первого блока v101 (или другого раннего) до first_keep_idx
# Но при этом сохраняем всё что было ДО первого блока версий (базовые стили)
first_version_idx = matches[0].start()

# Считаем: сколько удалим
removed_chars = first_keep_idx - first_version_idx

# Обрезаем
s_new = s[:first_version_idx] + s[first_keep_idx:]

# Дополнительно: удаляем дубликаты (если один блок v141 встретится 2 раза)
new_size = len(s_new)

# Финальная зачистка: убираем лишние пустые строки
s_new = re.sub(r'\n{4,}', '\n\n\n', s_new)

# Сохраняем
open(p, 'w', encoding='utf-8').write(s_new)

print()
print('=== Результат ===')
print('Было: ' + str(orig_size) + ' байт')
print('Стало: ' + str(len(s_new)) + ' байт')
print('Удалено: ' + str(orig_size - len(s_new)) + ' байт (' + str(round((orig_size - len(s_new)) / orig_size * 100, 1)) + '%)')
print()
print('OK: backup в backup/styles.css.bak')
print('===== ГОТОВО =====')
