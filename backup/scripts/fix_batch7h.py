import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

css_add = """

/* ========== v118: возврат сплошного фона окон ========== */

/* 1. Все окна — сплошной светлый фон, как было раньше */
html body #newsView .directory-panel,
html body #forwardersView .directory-panel,
html body #assistantView .assistant-shell,
html body #calculatorView .calculator-card,
html body #customsView .customs-shell,
html body #agentImportView .agent-import-shell {
  background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(245,251,254,.88)) !important;
  background-image: linear-gradient(135deg, rgba(255,255,255,.94), rgba(245,251,254,.88)) !important;
  backdrop-filter: blur(30px) saturate(130%) !important;
  -webkit-backdrop-filter: blur(30px) saturate(130%) !important;
  border: 1px solid rgba(255,255,255,.85) !important;
  border-radius: 32px !important;
  box-shadow:
    0 24px 70px rgba(24,70,98,.14),
    0 6px 22px rgba(24,70,98,.06),
    inset 0 1px 0 rgba(255,255,255,.9) !important;
}

/* 2. Тёмная тема — глубокий синий */
html body.manual-dark #newsView .directory-panel,
html body.manual-dark #forwardersView .directory-panel,
html body.manual-dark #assistantView .assistant-shell,
html body.manual-dark #calculatorView .calculator-card,
html body.manual-dark #customsView .customs-shell {
  background: linear-gradient(145deg, #0a3648, #0f4c60) !important;
  background-image: linear-gradient(145deg, #0a3648, #0f4c60) !important;
  border-color: rgba(140,220,235,.26) !important;
}

/* 3. Крестик в статье — не налезает на топбар */
#articleView .view-close,
#articleView .close-button {
  position: fixed !important;
  left: 22px !important;
  top: 90px !important;
  background: rgba(20,40,55,.75) !important;
  color: #ffffff !important;
  z-index: 4000 !important;
  width: 36px !important;
  height: 36px !important;
  border-radius: 50% !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
}
#articleView .view-close:hover,
#articleView .close-button:hover {
  background: rgba(20,40,55,.92) !important;
  transform: scale(1.06) !important;
}

/* 4. Мобильные */
@media(max-width: 650px) {
  html body #newsView .directory-panel,
  html body #forwardersView .directory-panel,
  html body #assistantView .assistant-shell,
  html body #calculatorView .calculator-card,
  html body #customsView .customs-shell,
  html body #agentImportView .agent-import-shell {
    border-radius: 24px !important;
  }
  #articleView .view-close,
  #articleView .close-button {
    left: 14px !important;
    top: 76px !important;
    width: 32px !important;
    height: 32px !important;
  }
}
"""

s += css_add
open(p, 'w', encoding='utf-8').write(s)

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>118', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>118', s2)
open(p2, 'w', encoding='utf-8').write(s2)

m = re.search(r'styles\.css\?v=[^"]+', s2)
print('OK: styles.css — блок v118 добавлен')
print('OK: index.html → ' + (m.group(0) if m else 'НЕ НАЙДЕНО'))
print('===== ГОТОВО =====')
