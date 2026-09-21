import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v113: окна не заходят выше топбара ========== */

/* 1. Топбар — прозрачный, фиксированный */
.topbar,
body.manual-dark .topbar{
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 72px !important;
  padding: 0 30px !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  z-index: 5000 !important;
  display: flex !important;
  align-items: center !important;
}

/* 2. brand и группы — как раньше */
.topbar .brand{
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  z-index: auto !important;
}
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

/* 3. view-layer начинается ПОД топбаром — окна физически не могут выше */
.view-layer{
  position: fixed !important;
  top: 72px !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  padding: 12px 24px 24px !important;
  background: transparent !important;
}

/* 4. Окна центрируются внутри этой области */
.calculator-card,
.directory-panel,
.assistant-shell,
.customs-shell{
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  max-height: calc(100svh - 72px - 30px) !important;
  margin: 0 !important;
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

/* 5. Внутри окон — крестик не должен наезжать на контент */
.assistant-shell,
.directory-panel,
.customs-shell,
.calculator-card,
.agent-import-shell{
  padding-top: 62px !important;
}

/* 6. Статья — на весь экран (исключение) */
#articleView.view-layer{
  top: 0 !important;
  padding: 0 !important;
}
.article-shell{
  max-height: 100svh !important;
}

/* 7. Home-view — оставляем как есть, но не уходит за топбар */
.home-view{
  padding-top: 90px !important;
}

/* 8. Мобильные */
@media(max-width: 650px){
  .topbar,
  body.manual-dark .topbar{
    height: 62px !important;
    padding: 0 14px !important;
  }
  .topbar .topbar-left{ left: 8px !important; }
  .topbar .top-actions{ right: 8px !important; }
  .view-layer{
    top: 62px !important;
    padding: 8px 8px 12px !important;
  }
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell{
    max-height: calc(100svh - 62px - 20px) !important;
  }
  .assistant-shell,
  .directory-panel,
  .customs-shell,
  .calculator-card,
  .agent-import-shell{
    padding-top: 56px !important;
  }
  .home-view{
    padding-top: 78px !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>113', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>113', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v113 добавлен')
print('OK: index.html -> v113')
print('===== ГОТОВО =====')
