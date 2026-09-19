import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Стрелка видна в любом окне
old1 = "var _back = document.getElementById('backToNewsBtn'); if (_back) _back.style.display = (name === 'article') ? 'inline-flex' : 'none';"
new1 = "var _back = document.getElementById('backToNewsBtn'); if (_back) _back.style.display = 'inline-flex';"
if old1 in s:
    s = s.replace(old1, new1, 1)
    print('OK: стрелка видна в любом окне')
elif "if (_back) _back.style.display = 'inline-flex';" in s and 'name ===' not in s.split('backToNewsBtn')[1][:200]:
    print('SKIP: стрелка уже универсальна')
else:
    print('WARN: anchor #1 не найден')

# 2. Умная логика стрелки
old2 = """b.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    if (typeof window.__iomaOpenView === 'function') window.__iomaOpenView('news');
  });"""
new2 = """b.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    var articleOpen = document.querySelector('#articleView.open');
    if (articleOpen) {
      if (typeof window.__iomaOpenView === 'function') window.__iomaOpenView('news');
    } else {
      if (typeof window.__iomaCloseViews === 'function') window.__iomaCloseViews();
    }
  });"""
if 'var articleOpen = document.querySelector' in s:
    print('SKIP: умная логика уже есть')
elif old2 in s:
    s = s.replace(old2, new2, 1)
    print('OK: стрелка — умная (статья→новости, иначе→главная)')
else:
    print('WARN: anchor #2 не найден')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== INDEX.HTML ====================
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()

# Единый набор SVG для 4 кнопок
hand_svg = '<svg class="top-nav-svg" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>'
theme_svg = '<svg class="top-nav-svg" viewBox="0 0 24 24"><g class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g><path class="icon-moon" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
money_svg = '<svg class="top-nav-svg" viewBox="0 0 24 24"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
customs_svg_new = '<svg class="top-nav-svg" viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z"/><circle cx="12" cy="10" r="2.5"/><path d="M7 19c1-2.5 3-3.5 5-3.5s4 1 5 3.5"/></svg>'

new_nav = '<nav class="top-nav" id="topNav" aria-label="Быстрые действия">' \
    '<button id="menuButton" class="top-nav-btn" type="button" aria-label="Карта дня" title="Карта дня">' + hand_svg + '<span>Карта</span></button>' \
    '<button id="themeToggleButton" class="top-nav-btn" type="button" aria-label="Тема" title="Тема">' + theme_svg + '<span>Тема</span></button>' \
    '<button id="agentImportButton" class="top-nav-btn" type="button" aria-label="Обновить ставки" title="Обновить ставки">' + money_svg + '<span>Ставки</span></button>' \
    '<button id="customsButton" class="top-nav-btn" type="button" aria-label="Проверка ТН ВЭД" title="Проверка ТН ВЭД">' + customs_svg_new + '<span>Таможня</span></button>' \
    '</nav>'

m = re.search(r'<nav class="top-nav" id="topNav"[\s\S]*?</nav>', s2)
if not m:
    print('FAIL: top-nav не найден')
    exit(1)
s2 = s2[:m.start()] + new_nav + s2[m.end():]
print('OK: top-nav переписан (единые SVG-иконки)')

# Обновить aria-label стрелки
s2 = s2.replace('aria-label="Назад к новостям" title="Назад к новостям"', 'aria-label="Назад" title="Назад"')

# Версия
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>105', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>105', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v105')

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 2: единое верхнее меню + стрелки везде ========== */

/* 1. Скрыть все крестики во всех окнах (таро и agent-import оставляем как есть) */
#calculatorView .view-close,
#calculatorView .close-button,
#forwardersView .view-close,
#forwardersView .close-button,
#assistantView .close-button,
#assistantView .view-close,
#newsView .view-close,
#newsView .close-button,
#customsView .view-close,
#customsView .close-button,
#articleView .view-close,
#articleView .close-button{
  display: none !important;
  visibility: hidden !important;
}

/* 2. Стрелка Назад — тонкая, аккуратная */
.topbar-back{
  width: 40px !important;
  height: 40px !important;
  flex: 0 0 40px !important;
  margin: 0 !important;
  border-radius: 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}
.topbar-back svg{
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2 !important;
}

/* 3. Единый стиль кнопок верхнего меню */
.topbar-left .top-nav{
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin: 0 !important;
  padding: 0 !important;
}
.topbar-left .top-nav-btn{
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 3px !important;
  min-width: 52px !important;
  height: 54px !important;
  padding: 5px 8px !important;
  border: 1px solid transparent !important;
  border-radius: 12px !important;
  background: transparent !important;
  color: #1d607e !important;
  cursor: pointer !important;
  transition: background .2s ease, border-color .2s ease !important;
  font-family: inherit !important;
  box-sizing: border-box !important;
}
.topbar-left .top-nav-btn:hover{
  background: rgba(255,255,255,.68) !important;
  border-color: rgba(255,255,255,.86) !important;
}
.topbar-left .top-nav-btn .top-nav-svg{
  width: 22px !important;
  height: 22px !important;
  display: block !important;
  flex: 0 0 22px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.85 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}
.topbar-left .top-nav-btn .top-nav-svg *{
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: inherit !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}
.topbar-left .top-nav-btn > span:last-child{
  font-size: 9.5px !important;
  font-weight: 700 !important;
  letter-spacing: .2px !important;
  line-height: 1 !important;
  color: inherit !important;
  white-space: nowrap !important;
}

/* 4. Переключение иконки темы при тёмном режиме */
.topbar-left .top-nav-btn .icon-moon{ display: none !important; }
body.manual-dark .topbar-left .top-nav-btn .icon-sun{ display: none !important; }
body.manual-dark .topbar-left .top-nav-btn .icon-moon{ display: block !important; }

/* 5. Тёмная тема */
body.manual-dark .topbar-left .top-nav-btn{
  color: #dceff1 !important;
}
body.manual-dark .topbar-left .top-nav-btn:hover{
  background: rgba(17,57,73,.72) !important;
  border-color: rgba(139,210,216,.32) !important;
}

/* 6. Перебиваем правило v102 — показываем nav всегда */
body.view-open .topbar-left .top-nav{
  display: flex !important;
}

/* 7. Адаптив */
@media(max-width: 900px){
  .topbar-left .top-nav-btn{
    min-width: 42px !important;
    height: 46px !important;
    padding: 4px !important;
  }
  .topbar-left .top-nav-btn .top-nav-svg{
    width: 20px !important;
    height: 20px !important;
    flex-basis: 20px !important;
  }
  .topbar-left .top-nav-btn > span:last-child{
    font-size: 8.5px !important;
  }
}
@media(max-width: 650px){
  .topbar-left{
    gap: 2px !important;
  }
  .topbar-left .top-nav{
    gap: 1px !important;
  }
  .topbar-left .top-nav-btn{
    min-width: 38px !important;
    height: 40px !important;
    padding: 3px !important;
    gap: 2px !important;
  }
  .topbar-left .top-nav-btn .top-nav-svg{
    width: 17px !important;
    height: 17px !important;
    flex-basis: 17px !important;
  }
  .topbar-left .top-nav-btn > span:last-child{
    font-size: 7.5px !important;
  }
  .topbar-back{
    width: 34px !important;
    height: 34px !important;
    flex: 0 0 34px !important;
  }
  .topbar-back svg{
    width: 16px !important;
    height: 16px !important;
  }
}
"""

s3 += css_add
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: styles.css — блок Батч 2 добавлен')

print('===== ГОТОВО =====')
