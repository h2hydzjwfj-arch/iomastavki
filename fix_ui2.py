p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

if 'v50: расширение + dropdown fix' in s:
    print('OK: уже применено')
    exit()

s += '''

/* ========== v50: расширение + dropdown fix ========== */

/* 1. Экспедиторы — широкая таблица */
.directory-panel{width:min(1400px,96vw) !important;max-height:calc(100svh - 40px) !important;padding:32px 28px 24px !important}
.directory-table{min-width:1300px !important;font-size:12.5px !important}
.directory-table th{padding:13px 14px !important;font-size:11px !important}
.directory-table td{padding:12px 14px !important;font-size:12px !important}
.directory-table-wrap{max-height:calc(100svh - 200px) !important}

/* 2. Таможня — шире окно */
.customs-shell{width:min(1150px,96vw) !important;max-height:calc(100svh - 40px) !important;padding:44px 32px 28px !important}

/* 3. Карточки таможни — читаемый текст в обеих темах */
/* Светлая тема */
.customs-info-card{
  background:#ffffff !important;
  border:1px solid rgba(55,103,132,.14) !important;
  box-shadow:0 4px 14px rgba(38,90,116,.06) !important;
}
.customs-info-label{color:#5e7888 !important;opacity:1 !important;font-weight:800 !important}
.customs-info-value{color:#1e4863 !important;font-size:14.5px !important}
.customs-result-title{color:#1e4863 !important}
.customs-free-line{color:#2c4a5e !important}
/* Тёмная тема */
body.manual-dark .customs-info-card{
  background:linear-gradient(145deg,#0f4059,#125566) !important;
  border-color:rgba(130,199,209,.28) !important;
  box-shadow:0 6px 20px rgba(0,0,0,.24) !important;
}
body.manual-dark .customs-info-label{color:#9fd8e6 !important;opacity:1 !important}
body.manual-dark .customs-info-value{color:#eafcff !important}
body.manual-dark .customs-result-title{color:#f1faff !important}
body.manual-dark .customs-free-line{color:#dcecf2 !important}

/* 4. КРИТИЧНО: чиним выпадающие меню — они не должны показываться все сразу */
.hover-menu{
  opacity:0 !important;
  visibility:hidden !important;
  pointer-events:none !important;
  transform:translateY(-5px) !important;
  position:absolute !important;
  z-index:500 !important;
}
.hover-select:hover > .hover-menu,
.hover-select:focus-within > .hover-menu,
.hover-menu.open{
  opacity:1 !important;
  visibility:visible !important;
  pointer-events:auto !important;
  transform:none !important;
}
/* Тёмная тема hover-menu */
body.manual-dark .hover-menu{background:rgba(7,48,64,.99) !important;border-color:rgba(123,218,232,.24) !important}
body.manual-dark .hover-item{color:#dff8fc !important}
body.manual-dark .hover-item:hover{background:#123c52 !important;color:#ffe7a0 !important}
/* Светлая тема hover-menu */
body.manual-light .hover-menu,.hover-menu{background:rgba(255,255,255,.99) !important}
body.manual-light .hover-item,.hover-item{color:#294155 !important}
body.manual-light .hover-item:hover,.hover-item:hover{background:#edf6fb !important;color:#164e74 !important}

/* 5. Калькулятор — расширить окно, не менять логику */
.calculator-card{width:min(1100px,94vw) !important;padding:28px 34px 20px !important;max-height:calc(100svh - 80px) !important;overflow-y:auto !important}

/* 6. Поля калькулятора — нормальный вид в тёмной теме */
body.manual-dark input,
body.manual-dark textarea,
body.manual-dark .fake-select{
  background:#0b3049 !important;
  color:#f6fdff !important;
  border:1px solid rgba(140,225,236,.32) !important;
}
body.manual-dark .fake-select span{color:#f6fdff !important}
body.manual-dark .fake-select b{color:#7fc8dd !important}
body.manual-dark .field label{color:#bfe0e7 !important}
body.manual-dark .section-title{color:#9fd8e6 !important}

/* 7. Убеждаемся что suggestions тоже не открыты везде */
.suggestions:not(.open){
  opacity:0 !important;
  visibility:hidden !important;
  pointer-events:none !important;
}
'''
open(p, 'w', encoding='utf-8').write(s)
print('OK: styles.css обновлён')

# Проверим app.js — может там меню принудительно открываются
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Убедимся, что нет принудительного .open для всех меню
if "$$('.hover-menu').forEach(m=>m.classList.add('open'))" in s2:
    s2 = s2.replace("$$('.hover-menu').forEach(m=>m.classList.add('open'))", "$$('.hover-menu').forEach(m=>m.classList.remove('open'))")
    print('OK: убран принудительный .open для всех меню')
else:
    print('OK: app.js чист от принудительного открытия меню')

# Добавим закрытие всех меню при загрузке страницы
if 'window.addEventListener("load"' not in s2 and 'window.onload' not in s2:
    s2 = s2 + '''
/* v50: гарантированно закрываем все меню при загрузке */
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    document.querySelectorAll('.hover-menu').forEach(function(m){ m.classList.remove('open'); });
    document.querySelectorAll('.suggestions').forEach(function(m){ m.classList.remove('open'); });
  }, 100);
});
'''
    print('OK: добавлено закрытие меню при загрузке')
else:
    print('OK: обработчик load уже есть')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== Готово ====')
