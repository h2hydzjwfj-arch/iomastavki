import re

# ==================== INDEX.HTML ====================
p = 'index.html'
s = open(p, 'r', encoding='utf-8').read()

# Убираем title="Закрыть" со всех крестиков
s = s.replace(' data-i18n-aria="close" aria-label="Закрыть" title="Закрыть"', ' data-i18n-aria="close" aria-label="Закрыть"')
s = s.replace(' aria-label="Закрыть" title="Закрыть"', ' aria-label="Закрыть"')
print('OK: убраны title-подсказки с крестиков')

s = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>111', s)
s = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>111', s)
open(p, 'w', encoding='utf-8').write(s)
print('OK: index.html -> v111')

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 7: прозрачный топбар, окна под ним ========== */

/* 1. Топбар — прозрачный */
.topbar,
body.manual-dark .topbar{
  background: transparent !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
.topbar::before,
.topbar::after{
  display: none !important;
  content: none !important;
}

/* 2. Прозрачная полоса-обёртка над контентом */
.app-shell{
  background: transparent !important;
}

/* 3. Слои view-layer растягиваем на весь viewport */
.view-layer{
  position: fixed !important;
  inset: 0 !important;
  padding: 0 !important;
}

/* 4. Окна могут занимать всю высоту и заходить под топбар */
.calculator-card,
.directory-panel,
.assistant-shell,
.customs-shell,
.agent-import-shell{
  max-height: calc(100svh - 20px) !important;
  margin: 0 !important;
}
.calculator-card{
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}
.view-layer.open .calculator-card{
  transform: translate(-50%, -50%) !important;
}
.directory-panel,
.assistant-shell{
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}
.view-layer.open .directory-panel,
.view-layer.open .assistant-shell{
  transform: translate(-50%, -50%) !important;
}
.customs-shell{
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}
#customsView .customs-shell{
  transform: translate(-50%, -50%) !important;
}
.article-shell{
  max-height: 100svh !important;
}

/* 5. Кнопки и бренд топбара — поверх всего */
.topbar-left,
.topbar .brand,
.topbar .top-actions{
  position: relative;
  z-index: 10;
}

/* 6. Крестики в окнах — не показывают tooltip */
.view-layer .close-button,
.view-layer .view-close{
  cursor: pointer;
}
.view-layer .close-button:focus,
.view-layer .view-close:focus{
  outline: none;
}

/* 7. Home-view — оставляем как есть, но контент не уходит за топбар */
.home-view{
  padding-top: 90px !important;
}

/* 8. Внутри окон — небольшой верхний отступ, чтобы крестик не налезал на контент */
.assistant-shell,
.directory-panel,
.customs-shell,
.calculator-card,
.agent-import-shell{
  padding-top: 64px !important;
}
.article-shell{
  padding-top: 0 !important;
}

/* 9. На мобильных */
@media(max-width: 650px){
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell,
  .agent-import-shell{
    max-height: calc(100svh - 12px) !important;
    padding-top: 56px !important;
  }
  .home-view{
    padding-top: 80px !important;
  }
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок Батч 7 добавлен')

print('===== ГОТОВО =====')
