import re, os

# Проверяем текущую версию CSS
css_file = 'styles.css'
s = open(css_file, 'r', encoding='utf-8').read()

# Узнаём какая версия последняя в файле
versions = re.findall(r'v1\d\d', s[-10000:])
print('Последние версии в CSS: ' + str(sorted(set(versions))[-5:]))

css_add = """

/* ========== v116: ФОРСИРОВАННЫЕ стили через ID (макс. специфичность) ========== */

/* 1. Полупрозрачный фон ВСЕХ окон через ID view-layer */
#newsView .directory-panel,
#forwardersView .directory-panel,
#assistantView .assistant-shell,
#calculatorView .calculator-card,
#customsView .customs-shell,
#agentImportView .agent-import-shell {
  background: rgba(252, 254, 255, 0.58) !important;
  backdrop-filter: blur(34px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(34px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
  border-radius: 36px !important;
  box-shadow:
    0 30px 90px rgba(24, 70, 98, 0.16),
    0 10px 30px rgba(24, 70, 98, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
  overflow: hidden !important;
  overscroll-behavior: contain !important;
}

/* 2. Тёмная тема */
body.manual-dark #newsView .directory-panel,
body.manual-dark #forwardersView .directory-panel,
body.manual-dark #assistantView .assistant-shell,
body.manual-dark #calculatorView .calculator-card,
body.manual-dark #customsView .customs-shell,
body.manual-dark #agentImportView .agent-import-shell {
  background: rgba(8, 42, 60, 0.72) !important;
  border-color: rgba(140, 220, 235, 0.28) !important;
}

/* 3. Новости — карточки не режут картинки по центру */
#newsView .directory-panel .news-card-img {
  aspect-ratio: 16 / 10 !important;
  background: #e8f2f7 !important;
  overflow: hidden !important;
  display: block !important;
}
#newsView .directory-panel .news-card-img img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center center !important;
  display: block !important;
}

/* 4. Отступ view-layer — окна парят под топбаром */
.view-layer {
  top: 92px !important;
  padding: 20px 32px 32px !important;
}

#newsView .directory-panel,
#forwardersView .directory-panel,
#assistantView .assistant-shell,
#calculatorView .calculator-card,
#customsView .customs-shell {
  max-height: calc(100svh - 92px - 40px) !important;
}

/* 5. Мобильные */
@media(max-width: 650px) {
  #newsView .directory-panel,
  #forwardersView .directory-panel,
  #assistantView .assistant-shell,
  #calculatorView .calculator-card,
  #customsView .customs-shell,
  #agentImportView .agent-import-shell {
    border-radius: 26px !important;
  }
  .view-layer {
    top: 78px !important;
    padding: 10px 12px 16px !important;
  }
  #newsView .directory-panel,
  #forwardersView .directory-panel,
  #assistantView .assistant-shell,
  #calculatorView .calculator-card,
  #customsView .customs-shell {
    max-height: calc(100svh - 78px - 20px) !important;
  }
}
"""

# ВАЖНО: обрезаем возможный дубликат, если скрипт запускается повторно
if 'v116: ФОРСИРОВАННЫЕ стили' in s:
    # Удаляем предыдущий блок v116 если есть
    start = s.find('/* ========== v116:')
    end = s.find('/* ==========', start + 20)
    if end < 0: end = len(s)
    s = s[:start] + s[end:]
    print('OK: удалён старый блок v116')

s += css_add
open(css_file, 'w', encoding='utf-8').write(s)
print('OK: styles.css — блок v116 добавлен')
print('OK: размер styles.css: ' + str(len(s)) + ' байт')

# Обновляем версию в HTML
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>116', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>116', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v116')

# Проверяем что в HTML правильная версия
check = open(p2, 'r', encoding='utf-8').read()
m = re.search(r'styles\.css\?v=[^"]+', check)
if m: print('Проверка HTML: ' + m.group(0))

print('===== ГОТОВО =====')
