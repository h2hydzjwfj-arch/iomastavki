import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Находим определение функции (с любым отступом)
pattern = re.compile(r'^\s*function stripSourceFromTitleJs\(t\)\{[\s\S]*?^\s*\}\s*$', re.MULTILINE)
matches = list(pattern.finditer(s))
print('Найдено определений: ' + str(len(matches)))

if not matches:
    print('❌ Функция не найдена по regex — попробую вручную')
    # Ищем какую-то другую вариацию
    pattern2 = re.compile(r'function stripSourceFromTitleJs\(t\)\{[\s\S]*?\n\}\n')
    matches = list(pattern2.finditer(s))
    print('Альтернативных: ' + str(len(matches)))

if not matches:
    print('❌ Не нашёл — пришли вывод скрипта, я перепишу подход')
    exit()

# Удаляем все найденные определения
for m in reversed(matches):
    s = s[:m.start()] + s[m.end():]
print('OK: старые определения удалены')

# 2. Вставляем одну свежую копию на верх файла
anchor = s.find('const BT = ')
if anchor < 0:
    print('❌ Не нашёл const BT — вставляю после express')
    anchor = s.find('const express')
    # Возьмём через пару строк
    anchor = s.find('\n', s.find('\n', anchor) + 1)

# Ищем конец строки с const BT
line_end = s.find('\n', anchor)
if line_end > 0:
    anchor = line_end + 1

block = '''
// Хелпер: очистка заголовка от источника (глобальный, на верхнем уровне)
function stripSourceFromTitleJs(t){
  let x = String(t||'').trim();
  x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\\.[a-z]{2})?\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[A-Z][a-zA-Z]+(?:[\\s\\-][A-Z][a-zA-Z]+){0,2}\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[А-ЯЁ][а-яё]+(?:[\\s\\-][А-ЯЁ][а-яё]+){0,2}\\s*$/i, '');
  return x.trim();
}

'''
s = s[:anchor] + block + s[anchor:]
print('OK: свежая функция вставлена на верх')

# 3. Убедимся что нет дубликатов
count = s.count('function stripSourceFromTitleJs(t){')
print('Всего определений сейчас: ' + str(count))

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# 4. Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>74', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>74', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v74')
print('===== ГОТОВО =====')
