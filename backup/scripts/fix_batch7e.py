import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v115: прозрачность окон + картинки новостей ========== */

/* 1. Все окна — полупрозрачный фон с blur */
.directory-panel,
.assistant-shell,
.calculator-card,
.customs-shell,
.agent-import-shell,
.directory-panel.news-shell{
  background: linear-gradient(135deg, rgba(255,255,255,.62), rgba(240,250,253,.48)) !important;
  backdrop-filter: blur(30px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(30px) saturate(150%) !important;
  border: 1px solid rgba(255,255,255,.85) !important;
  border-radius: 36px !important;
  box-shadow:
    0 30px 90px rgba(24,70,98,.14),
    0 8px 28px rgba(24,70,98,.06),
    inset 0 1px 0 rgba(255,255,255,.9) !important;
}

/* 2. Тёмная тема — тоже полупрозрачный */
body.manual-dark .directory-panel,
body.manual-dark .assistant-shell,
body.manual-dark .calculator-card,
body.manual-dark .customs-shell,
body.manual-dark .agent-import-shell{
  background: linear-gradient(145deg, rgba(8,42,60,.72), rgba(10,62,78,.62)) !important;
  border-color: rgba(140,220,235,.28) !important;
}

/* 3. Картинки новостей — показываем полностью по центру */
.news-card-img{
  aspect-ratio: 16/10 !important;
  background: #e8f2f7 !important;
}
.news-card-img img{
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center center !important;
  display: block !important;
}
body.manual-dark .news-card-img{
  background: #0a2a3e !important;
}

/* 4. Само окно — отступ от топбара побольше, скругление видно */
.view-layer{
  top: 92px !important;
  padding: 20px 32px 32px !important;
}
.directory-panel,
.assistant-shell,
.calculator-card,
.customs-shell{
  max-height: calc(100svh - 92px - 40px) !important;
}

/* 5. Мобильные */
@media(max-width: 650px){
  .directory-panel,
  .assistant-shell,
  .calculator-card,
  .customs-shell,
  .agent-import-shell{
    border-radius: 26px !important;
  }
  .view-layer{
    top: 78px !important;
    padding: 10px 12px 16px !important;
  }
  .directory-panel,
  .assistant-shell,
  .calculator-card,
  .customs-shell{
    max-height: calc(100svh - 78px - 20px) !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>115', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>115', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v115 добавлен')
print('OK: index.html -> v115')
print('===== ГОТОВО =====')
