import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Проверяем, где функция
has_func = 'function stripSourceFromTitleJs(t){' in s
print('Функция stripSourceFromTitleJs: ' + ('✅ найдена' if has_func else '❌ отсутствует'))

if not has_func:
    # Вставляем перед первым app.get или app.post
    anchor = s.find("app.get('/'")
    if anchor < 0:
        anchor = s.find('app.use(')
    if anchor < 0:
        anchor = s.find('async function aiChatJSON')
    if anchor < 0:
        print('❌ Не нашёл куда вставить')
        exit()
    
    block = '''// Хелпер: очистка заголовка от источника
function stripSourceFromTitleJs(t){
  let x = String(t||'').trim();
  x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\\.[a-z]{2})?\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[A-Z][a-zA-Z]+(?:[\\s\\-][A-Z][a-zA-Z]+){0,2}\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[А-ЯЁ][а-яё]+(?:[\\s\\-][А-ЯЁ][а-яё]+){0,2}\\s*$/i, '');
  return x.trim();
}

'''
    s = s[:anchor] + block + s[anchor:]
    print('OK: функция добавлена перед app.get')
else:
    print('OK: функция уже есть, ничего не делаем')

# 2. Отложить преварм — он съедает лимит Groq
# Меняем setTimeout с 15 сек на 3 минуты
old_startup = '''  setTimeout(function(){
    console.log('[startup] автопрогрев статей...');
    prewarmNewsCache(10).catch(function(e){ console.warn('[startup] prewarm error:', e.message); });
  }, 15000);'''

new_startup = '''  // Отложенный прогрев — стартует через 5 минут после запуска, чтобы не есть лимит сразу
  setTimeout(function(){
    console.log('[startup] автопрогрев статей (3 статьи)...');
    prewarmNewsCache(3).catch(function(e){ console.warn('[startup] prewarm error:', e.message); });
  }, 5 * 60 * 1000);'''

if old_startup in s:
    s = s.replace(old_startup, new_startup)
    print('OK: преварм отложен на 5 мин, только 3 статьи')
else:
    print('WARN: блок startup не найден')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# 3. Обновляем версию
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>73', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>73', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v73')
print('===== ГОТОВО =====')
