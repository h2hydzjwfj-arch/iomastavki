import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v112: прозрачный топбар БЕЗ сдвигов ========== */

/* 1. Топбар — прозрачный */
.topbar,
body.manual-dark .topbar{
  background: transparent !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  height: 72px !important;
  padding: 0 30px !important;
  position: relative !important;
  z-index: 5000 !important;
  display: flex !important;
  align-items: center !important;
}

/* 2. Отменяю ошибочный position:relative из v111 для brand */
.topbar .brand{
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  z-index: auto !important;
}

/* 3. Левая группа — на своём месте */
.topbar .topbar-left{
  position: absolute !important;
  left: 20px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  z-index: 10 !important;
}

/* 4. Правая группа — на своём месте */
.topbar .top-actions{
  position: absolute !important;
  right: 20px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  z-index: 10 !important;
}

/* 5. View-layer — без боковых отступов, но с местом под верх */
.view-layer{
  padding: 14px 24px 24px !important;
}

/* 6. Окна — могут заходить под прозрачный топбар */
.calculator-card,
.directory-panel,
.assistant-shell,
.customs-shell{
  max-height: calc(100svh - 30px) !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}
.view-layer.open .calculator-card,
.view-layer.open .directory-panel,
.view-layer.open .assistant-shell{
  transform: translate(-50%, -50%) !important;
}
#customsView .customs-shell,
#customsView.open .customs-shell{
  transform: translate(-50%, -50%) !important;
}
.article-shell{
  max-height: 100svh !important;
}

/* 7. Внутри окон — оставляем как было, только верхний padding под крестик */
.assistant-shell,
.directory-panel,
.customs-shell,
.calculator-card,
.agent-import-shell{
  padding-top: 60px !important;
}

/* 8. Мобильные */
@media(max-width: 650px){
  .topbar{
    height: 62px !important;
    padding: 0 14px !important;
  }
  .topbar .topbar-left{
    left: 8px !important;
  }
  .topbar .top-actions{
    right: 8px !important;
  }
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell{
    max-height: calc(100svh - 20px) !important;
  }
  .assistant-shell,
  .directory-panel,
  .customs-shell,
  .calculator-card,
  .agent-import-shell{
    padding-top: 54px !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

# index.html -> v112
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>112', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>112', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v112 добавлен')
print('OK: index.html -> v112')
print('===== ГОТОВО =====')
