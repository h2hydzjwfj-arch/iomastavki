import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

# 1. Удаляем блок v50 (он сломал dropdown)
v50_start = s.find('/* ========== v50: расширение + dropdown fix ========== */')
if v50_start > 0:
    # Найти конец блока v50 (перед v51 или конец файла)
    v51_start = s.find('/* ========== v51: fix overflow chat + containers ========== */', v50_start)
    if v51_start > v50_start:
        # Удаляем от v50 до v51 (не трогая v51)
        s = s[:v50_start] + s[v51_start:]
    else:
        # Удаляем до конца
        s = s[:v50_start].rstrip() + '\n'
    print('OK: удалён блок v50 (сломанный dropdown)')

# 2. Найдём и удалим оставшиеся переопределения .hover-menu из моих патчей
# Все мои правила "body.manual-light .hover-menu,.hover-menu{background:... !important}" — оставляем, но убираем !important на видимости
patterns_to_remove = [
    r"\.hover-menu\{\s*opacity:0 !important;[\s\S]*?\}\n",
    r"\.hover-select:hover > \.hover-menu,[\s\S]*?\}\n",
    r"\.suggestions:not\(\.open\)\{[\s\S]*?\}\n",
]
for pat in patterns_to_remove:
    s, n = re.subn(pat, '', s, count=1)
    if n > 0:
        print('OK: удалено правило: ' + pat[:40])

open(p, 'w', encoding='utf-8').write(s)
print('==== styles.css почищен ====')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Убираем мой блок, который принудительно закрывал все меню при загрузке — он не нужен
if 'v50: гарантированно закрываем все меню при загрузке' in s2:
    idx = s2.find('/* v50: гарантированно закрываем все меню при загрузке */')
    end = s2.find('});', idx)
    if end > 0:
        s2 = s2[:idx] + s2[end+3:]
        print('OK: убран v50 блок из app.js')

# Убедимся, что при клике на fake-select меню открывается только ОДНО
old_click = '''['forwarderBtn','transportBtn','incotermBtn'].forEach(id=>{const btn=$('#'+id);const menu=$('#'+id.replace('Btn','Menu'));if(btn&&menu)btn.addEventListener('click',e=>{e.stopPropagation();const open=menu.style.visibility==='visible'||menu.classList.contains('open');$$('.hover-menu').forEach(m=>m.classList.remove('open'));if(!open)menu.classList.add('open')})});'''

new_click = '''['forwarderBtn','transportBtn','incotermBtn'].forEach(id=>{
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

if old_click in s2:
    s2 = s2.replace(old_click, new_click)
    print('OK: обработчик клика на dropdown обновлён')
else:
    print('WARN: старый обработчик не найден')

open(p2, 'w', encoding='utf-8').write(s2)

# Обновляем версию
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = s3.replace('styles.css?v=20260919-v51', 'styles.css?v=20260919-v52')
s3 = s3.replace('app.js?v=20260919-v51', 'app.js?v=20260919-v52')
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html версия → v52')
print('==== Готово ====')
