import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v114: финальные пропорции окна ========== */

/* 1. view-layer — больше воздуха сверху, отступ от топбара */
.view-layer{
  top: 92px !important;
  padding: 16px 32px 32px !important;
}

/* 2. Окна — сильное скругление, отступ сверху, мягкая тень */
.calculator-card,
.directory-panel,
.assistant-shell,
.customs-shell,
.agent-import-shell,
.directory-panel.news-shell{
  border-radius: 32px !important;
  box-shadow:
    0 30px 90px rgba(24,70,98,.16),
    0 8px 28px rgba(24,70,98,.08),
    inset 0 1px 0 rgba(255,255,255,.95) !important;
}

/* 3. Максимальная высота с учётом отступов */
.calculator-card,
.directory-panel,
.assistant-shell,
.customs-shell{
  max-height: calc(100svh - 92px - 32px) !important;
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

/* 4. Статья — на весь экран как раньше */
#articleView.view-layer{
  top: 0 !important;
  padding: 0 !important;
}
.article-shell{
  max-height: 100svh !important;
  border-radius: 0 !important;
}

/* 5. Мобильные */
@media(max-width: 650px){
  .view-layer{
    top: 78px !important;
    padding: 8px 12px 16px !important;
  }
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell,
  .agent-import-shell{
    border-radius: 24px !important;
    max-height: calc(100svh - 78px - 16px) !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>114', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>114', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v114 добавлен')
print('OK: index.html -> v114')
print('===== ГОТОВО =====')
