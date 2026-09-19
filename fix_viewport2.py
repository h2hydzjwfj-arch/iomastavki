import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

if 'v91: viewport final' in s:
    print('OK: уже применено')
else:
    s += '''

/* ========== v91: viewport final ========== */
/* Окно не должно выходить за пределы видимой области */

/* 1. Калькулятор — вписан, с прокруткой внутри если не влезает */
.calculator-card{
  width: min(1020px, calc(100vw - 40px)) !important;
  max-width: calc(100vw - 40px) !important;
  max-height: calc(100svh - 100px) !important;
  height: auto !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 26px 34px 20px !important;
  box-sizing: border-box !important;
}
.calculator-card::-webkit-scrollbar{ width: 6px; display: block !important; }
.calculator-card::-webkit-scrollbar-thumb{ background: rgba(50,111,159,.25); border-radius: 6px; }
.calculator-card::-webkit-scrollbar-track{ background: transparent; }

/* Убираем избыточные отступы внутри, чтобы всё влезало по высоте */
.calculator-card h1{ font-size: 24px !important; margin: 0 0 16px !important; }
.calculator-card .section-title{ margin: 16px 0 8px !important; }
.calculator-card .dimensions{ margin-top: 10px !important; padding: 12px !important; }
.calculator-card input{ height: 42px !important; font-size: 12px !important; }
.calculator-card .fake-select{ height: 44px !important; }
.calculator-card .calculate{ height: 46px !important; margin-top: 12px !important; }
.calculator-card .auto-calc-strip>div{ min-height: 46px !important; padding: 6px 10px !important; }
.calculator-card .currency-bar{ margin-top: 8px !important; padding-top: 4px !important; }
.calculator-card .dimensions-head{ margin-bottom: 8px !important; }

/* 2. Экспедиторы */
.directory-panel{
  width: min(1200px, calc(100vw - 40px)) !important;
  max-width: calc(100vw - 40px) !important;
  max-height: calc(100svh - 100px) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 40px 26px 24px !important;
}
.directory-panel::-webkit-scrollbar{ width: 8px; }
.directory-panel::-webkit-scrollbar-thumb{ background: rgba(50,111,159,.28); border-radius: 8px; }
.directory-table-wrap{
  max-height: calc(100svh - 220px) !important;
  overflow-y: auto !important;
  overflow-x: auto !important;
}

/* 3. AI-ассистент */
.assistant-shell{
  width: min(900px, calc(100vw - 40px)) !important;
  max-width: calc(100vw - 40px) !important;
  height: calc(100svh - 100px) !important;
  max-height: calc(100svh - 100px) !important;
  overflow: hidden !important;
  padding: 40px 26px 20px !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 4. Таможня */
.customs-shell{
  width: min(900px, calc(100vw - 40px)) !important;
  max-width: calc(100vw - 40px) !important;
  max-height: calc(100svh - 100px) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 44px 28px 24px !important;
  box-sizing: border-box !important;
}

/* 5. Статья */
.article-shell{
  max-width: 100vw !important;
  max-height: 100svh !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

/* 6. Новости */
.news-shell{
  max-height: calc(100svh - 100px) !important;
  overflow: hidden !important;
}
.news-list{
  max-height: calc(100svh - 240px) !important;
  overflow-y: auto !important;
}

/* 7. Импорт экспедиторов */
.agent-import-shell{
  width: min(700px, calc(100vw - 40px)) !important;
  max-height: calc(100svh - 100px) !important;
  overflow-y: auto !important;
  box-sizing: border-box !important;
}

/* 8. Таро */
.tarot-card{
  max-height: calc(100svh - 60px) !important;
  overflow-y: auto !important;
}

/* На мобильных ещё компактнее */
@media(max-width: 700px){
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell,
  .agent-import-shell{
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    max-height: calc(100svh - 80px) !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
  .calculator-card input{ height: 38px !important; }
  .calculator-card h1{ font-size: 20px !important; }
}
'''
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: универсальный фикс viewport v91')

# Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>91', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>91', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v91')
print('===== ГОТОВО =====')
