import re, os, shutil

p = 'styles.css'
if not os.path.exists('backup'):
    os.makedirs('backup')
shutil.copy2(p, 'backup/styles.css.bak2')
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

pattern = re.compile(r'/\* ={9} (v\d+): [^*]*?={9} \*/')
matches = list(pattern.finditer(s))

print('Найдено блоков: ' + str(len(matches)))
for m in matches:
    line = s[:m.start()].count('\n') + 1
    print('  line ' + str(line) + ': ' + m.group(1))
print()

versions = {}
for i, m in enumerate(matches):
    v = m.group(1)
    versions.setdefault(v, []).append(i)

to_delete = []
for v, idxs in versions.items():
    if len(idxs) <= 1:
        continue
    for keep_i in idxs[:-1]:
        start = matches[keep_i].start()
        end = matches[keep_i + 1].start() if keep_i + 1 < len(matches) else len(s)
        to_delete.append((start, end, matches[keep_i].group(0)))

to_delete.sort(key=lambda x: -x[0])
for start, end, label in to_delete:
    print('Удаляю дубликат: ' + label[:60])
    s = s[:start] + s[end:]

s = re.sub(r'\n{4,}', '\n\n\n', s)
s = s.rstrip() + '\n'
open(p, 'w', encoding='utf-8').write(s)

print()
print('Было: ' + str(orig) + ' байт')
print('Стало: ' + str(len(s)) + ' байт')
print('Удалено: ' + str(orig - len(s)) + ' байт')
print('Backup: backup/styles.css.bak2')
print()

# Проверка баланса скобок
opens = s.count('{')
closes = s.count('}')
print('{ = ' + str(opens) + ', } = ' + str(closes))
if opens == closes:
    print('✅ Скобки в балансе')
else:
    print('⚠️ ВНИМАНИЕ: скобки НЕ в балансе!')
print('===== ГОТОВО =====')
