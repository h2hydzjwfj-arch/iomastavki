import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Удаляем мой сломанный обработчик (тот что с new_click)
bad = '''['forwarderBtn','transportBtn','incotermBtn'].forEach(id=>{
  const btn=$('#'+id);
  const menu=$('#'+id.replace('Btn','Menu'));
  if(btn&&menu) btn.addEventListener('click', function(e){
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');
    document.querySelectorAll('.hover-menu').forEach(function(m){ m.classList.remove('open'); });
    if(!isOpen) menu.classList.add('open');
  });
});
document.addEventListener('click', function(){ document.querySelectorAll('.hover-menu').forEach(function(m){ m.classList.remove('open'); }); });'''

# Восстанавливаем нормальный обработчик
good = """['forwarderBtn','transportBtn','incotermBtn'].forEach(id=>{const btn=$('#'+id);const menu=$('#'+id.replace('Btn','Menu'));if(btn&&menu)btn.addEventListener('click',e=>{e.stopPropagation();const open=menu.style.visibility==='visible'||menu.classList.contains('open');$$('.hover-menu').forEach(m=>m.classList.remove('open'));if(!open)menu.classList.add('open')})});
document.addEventListener('click',e=>{$$('.hover-menu').forEach(m=>{if(!e.target.closest('.hover-select'))m.classList.remove('open')})});"""

if bad in s:
    s = s.replace(bad, good)
    print('OK: вернул нормальный обработчик dropdown')
else:
    print('WARN: мой обработчик не найден, возможно уже удалён')

# 2. Убираем v50 блок если он остался
if 'v50: гарантированно закрываем все меню при загрузке' in s:
    idx = s.find('/* v50: гарантированно закрываем все меню при загрузке */')
    end = s.find('});', idx)
    if end > 0:
        s = s[:idx].rstrip() + '\n' + s[end+3:]
        print('OK: убран v50 из app.js')

# 3. Проверка синтаксиса — простой поиск сломанных скобок
open_count = s.count('{')
close_count = s.count('}')
if open_count != close_count:
    print('❌ СКОБКИ НЕ СОВПАДАЮТ: { = ' + str(open_count) + ', } = ' + str(close_count))
else:
    print('OK: скобки в балансе (' + str(open_count) + ')')

open(p, 'w', encoding='utf-8').write(s)
print('==== app.js восстановлен ====')

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

# 1. Удаляем v50 если остался
v50 = s2.find('/* ========== v50: расширение + dropdown fix ========== */')
if v50 > 0:
    v51 = s2.find('/* ========== v51:', v50)
    if v51 > v50:
        s2 = s2[:v50] + s2[v51:]
    else:
        s2 = s2[:v50].rstrip() + '\n'
    print('OK: удалён v50 из styles.css')

# 2. Удаляем остатки моих патчей dropdown
patterns = [
    r'/\* v50: гарантированно закрываем все меню \*/\s*',
]
for pat in patterns:
    s2 = re.sub(pat, '', s2)

# 3. Проверка: в CSS в конце должно быть закрытых } не меньше чем {
open_braces = s2.count('{')
close_braces = s2.count('}')
print('CSS скобки: { = ' + str(open_braces) + ', } = ' + str(close_braces))
if open_braces != close_braces:
    diff = open_braces - close_braces
    if diff > 0:
        s2 += '\n' + ('}\n' * diff)
        print('OK: добавлено ' + str(diff) + ' закрывающих }')
    elif diff < 0:
        print('⚠️ Больше } чем {, но это не смертельно для CSS')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== styles.css восстановлен ====')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = s3.replace('styles.css?v=20260919-v52', 'styles.css?v=20260919-v53')
s3 = s3.replace('app.js?v=20260919-v52', 'app.js?v=20260919-v53')
s3 = s3.replace('styles.css?v=20260919-v51', 'styles.css?v=20260919-v53')
s3 = s3.replace('app.js?v=20260919-v51', 'app.js?v=20260919-v53')
s3 = s3.replace('styles.css?v=20260919-v50', 'styles.css?v=20260919-v53')
s3 = s3.replace('app.js?v=20260919-v50', 'app.js?v=20260919-v53')
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v53')
print('==== ВСЁ ГОТОВО ====')
