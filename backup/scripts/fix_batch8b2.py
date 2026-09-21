import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v121: только полоса у топбара, без плашек на группах ========== */

/* 1. Только сам топбар — белая полоса с блюром */
body.view-open .topbar{
  background: rgba(245, 250, 253, .85) !important;
  backdrop-filter: blur(22px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(22px) saturate(150%) !important;
  box-shadow: 0 1px 0 rgba(80,120,140,.10), 0 6px 20px rgba(24,70,98,.05) !important;
}

/* 2. Убираем фон и padding с групп и brand */
body.view-open .topbar .topbar-left,
body.view-open .topbar .brand,
body.view-open .topbar .top-actions{
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
}

/* 3. Тёмная тема */
body.manual-dark.view-open .topbar{
  background: rgba(6, 30, 46, .85) !important;
  box-shadow: 0 1px 0 rgba(140,220,235,.16), 0 6px 20px rgba(0,0,0,.28) !important;
}
body.manual-dark.view-open .topbar .topbar-left,
body.manual-dark.view-open .topbar .brand,
body.manual-dark.view-open .topbar .top-actions{
  background: transparent !important;
  padding: 0 !important;
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>121', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>121', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v121 добавлен')
print('OK: index.html -> v121')
print('===== ГОТОВО =====')
