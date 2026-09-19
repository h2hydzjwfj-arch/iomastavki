p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем все наши старые правила hover-menu что были с !important
import re
s = re.sub(r'\.hover-menu\{[^}]*!important[^}]*\}', '', s)
s = re.sub(r'\.hover-select:hover > \.hover-menu,[\s\S]*?\}', '', s)
s = re.sub(r'body\.manual-dark \.hover-menu\{[^}]*\}', '', s)
s = re.sub(r'body\.manual-light \.hover-menu[^{]*\{[^}]*\}', '', s)
s = re.sub(r'body\.manual-light \.hover-item[^{]*\{[^}]*\}', '', s)

# Добавляем чистые правила в конец
s += '''

/* ========== v54: hover-menu чистое правило ========== */
.hover-menu{
  position:absolute !important;
  left:0 !important;
  right:0 !important;
  top:calc(100% - 1px) !important;
  z-index:500 !important;
  margin:0 !important;
  padding:6px !important;
  max-height:min(300px,42vh) !important;
  overflow:auto !important;
  border:1px solid rgba(55,103,132,.12) !important;
  border-radius:17px !important;
  background:rgba(255,255,255,.98) !important;
  box-shadow:0 24px 70px rgba(25,68,96,.17), 0 4px 18px rgba(25,68,96,.07) !important;
  opacity:0 !important;
  visibility:hidden !important;
  transform:translateY(-5px) !important;
  transition:opacity .16s ease, transform .16s ease, visibility .16s !important;
  pointer-events:none !important;
}
.hover-select:hover > .hover-menu,
.hover-select:focus-within > .hover-menu,
.hover-menu.open{
  opacity:1 !important;
  visibility:visible !important;
  transform:none !important;
  pointer-events:auto !important;
}
body.manual-dark .hover-menu{
  background:rgba(7,48,64,.985) !important;
  border-color:rgba(123,218,232,.22) !important;
  color:#eafcff !important;
}

/* Suggestions тоже не должны показываться все сразу */
.suggestions{
  opacity:0 !important;
  visibility:hidden !important;
  pointer-events:none !important;
}
.suggestions.open{
  opacity:1 !important;
  visibility:visible !important;
  pointer-events:auto !important;
}
'''
open(p, 'w', encoding='utf-8').write(s)
print('OK: styles.css — меню исправлены')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Добавляем в начало файла чистку меню при загрузке
if '/* v54: принудительная очистка меню при загрузке */' not in s2:
    idx = s2.find("const $ = s =>")
    if idx >= 0:
        block = """/* v54: принудительная очистка меню при загрузке */
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    document.querySelectorAll('.hover-menu').forEach(function(m){ m.classList.remove('open'); });
    document.querySelectorAll('.suggestions').forEach(function(m){ m.classList.remove('open'); });
  }, 50);
  setTimeout(function(){
    document.querySelectorAll('.hover-menu').forEach(function(m){ m.classList.remove('open'); });
    document.querySelectorAll('.suggestions').forEach(function(m){ m.classList.remove('open'); });
  }, 500);
});

"""
        s2 = s2[:idx] + block + s2[idx:]
        print('OK: app.js — очистка меню при загрузке')

open(p2, 'w', encoding='utf-8').write(s2)

# Обновляем версию
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
import re as re2
s3 = re2.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>54', s3)
s3 = re2.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>54', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v54')
print('==== Готово ====')
