import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Показываем контекст вокруг строки 41
lines = s.split('\n')
print('=== Контекст строк 35-50 ===')
for i in range(max(0, 34), min(len(lines), 50)):
    print('{:3d}: {}'.format(i+1, lines[i][:100]))

# 2. Удаляем ВСЕ определения (function и const)
s = re.sub(r'^\s*function stripSourceFromTitleJs\(t\)\s*\{[\s\S]*?^\s*\}\s*$', '', s, flags=re.MULTILINE)
s = re.sub(r'^\s*(?:const|let|var)\s+stripSourceFromTitleJs\s*=\s*[\s\S]*?;\s*$', '', s, flags=re.MULTILINE)
print('\nOK: старые определения удалены')

# 3. Проверяем сколько осталось
rem = s.count('stripSourceFromTitleJs')
print('Упоминаний в коде (не считая вызовов): осталось ' + str(rem - s.count('stripSourceFromTitleJs(') + s.count('stripSourceFromTitleJs(') - s.count('stripSourceFromTitleJs(') + 0))

# 4. Вставляем ГЛОБАЛЬНОЕ определение сразу после первого require
anchor = s.find("const express = require('express');")
if anchor < 0:
    anchor = s.find("const path = require('path');")
if anchor < 0:
    anchor = 0
# Вставляем ПОСЛЕ блока require (ищем первое пустое после require)
after_require = s.find('\n\n', anchor)
if after_require < 0:
    after_require = s.find('\n', anchor)
insert_at = after_require + 1

block = '''
// ============= ГЛОБАЛЬНЫЙ ХЕЛПЕР (обязательно на верхнем уровне) =============
global.stripSourceFromTitleJs = function(t){
  let x = String(t||'').trim();
  x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\\.[a-z]{2})?\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[A-Z][a-zA-Z]+(?:[\\s\\-][A-Z][a-zA-Z]+){0,2}\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[А-ЯЁ][а-яё]+(?:[\\s\\-][А-ЯЁ][а-яё]+){0,2}\\s*$/i, '');
  return x.trim();
};

'''
s = s[:insert_at] + block + s[insert_at:]

# 5. В prewarmNewsCache заменяем вызовы на безопасные
s = s.replace('stripSourceFromTitleJs ? stripSourceFromTitleJs(item.title) : item.title',
              '(typeof stripSourceFromTitleJs === "function" ? stripSourceFromTitleJs(item.title) : item.title)')
s = s.replace('stripSourceFromTitleJs ? stripSourceFromTitleJs(title) : title',
              '(typeof stripSourceFromTitleJs === "function" ? stripSourceFromTitleJs(title) : title)')

print('OK: функция теперь глобальная')
print('Всего определений сейчас: ' + str(s.count('stripSourceFromTitleJs = function')))

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# 6. Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>75', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>75', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v75')
print('===== ГОТОВО =====')
