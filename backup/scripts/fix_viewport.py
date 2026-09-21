import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

if 'v90: universal viewport fit' in s:
    print('OK: уже применено')
else:
    s += '''

/* ========== v90: universal viewport fit ========== */
/* Всё содержимое не выходит за границы экрана ни на десктопе, ни на мобильном */

html, body{
  overflow-x: hidden !important;
  max-width: 100vw !important;
}

/* Все окна (панели) — вписаны в viewport */
.directory-panel,
.assistant-shell,
.calculator-card,
.customs-shell,
.article-shell,
.tarot-card,
.agent-import-shell,
.directory-panel.news-shell{
  max-width: calc(100vw - 32px) !important;
  max-height: calc(100svh - 32px) !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

/* Внутри окон — контент тоже не выходит */
.directory-panel *,
.assistant-shell *,
.calculator-card *,
.customs-shell *,
.article-shell *{
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Сетки внутри калькулятора — переносятся на мобильном */
.calculator-card .grid.three,
.calculator-card .grid.four,
.calculator-card .centered-three,
.calculator-card .auto-calc-strip{
  max-width: 100% !important;
}

/* Таблицы и меню — прокручиваются, но не выходят */
.directory-table-wrap,
.hover-menu,
.suggestions{
  max-width: 100% !important;
  overflow-x: auto !important;
}

/* Аудио-блок и обложка статьи */
.article-audio-block,
.article-hero,
.article-title{
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Все картинки вписываются */
img, video, iframe{
  max-width: 100% !important;
  height: auto !important;
}

/* Поля ввода не выходят */
input, textarea, select, button{
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* ===== Адаптив для мобильных и маленьких экранов ===== */
@media(max-width: 900px){
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell,
  .article-shell{
    max-width: calc(100vw - 20px) !important;
    max-height: calc(100svh - 20px) !important;
  }
  .calculator-card{
    padding: 22px 18px 16px !important;
  }
  .calculator-card .grid.three,
  .calculator-card .grid.four,
  .calculator-card .centered-three{
    grid-template-columns: 1fr !important;
  }
  .auto-calc-strip{
    grid-template-columns: 1fr !important;
  }
  .directory-panel,
  .assistant-shell,
  .customs-shell{
    padding: 26px 20px !important;
  }
}

@media(max-width: 600px){
  .calculator-card,
  .directory-panel,
  .assistant-shell,
  .customs-shell,
  .article-shell,
  .agent-import-shell{
    max-width: calc(100vw - 12px) !important;
    max-height: calc(100svh - 12px) !important;
    border-radius: 20px !important;
  }
  .article-title h1{
    font-size: 22px !important;
  }
  .article-audio-block{
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 12px !important;
  }
  .article-audio-btn{
    width: 100% !important;
  }
}

/* Специфичные окна — тоже вписаны */
#customsView .customs-shell{
  max-width: calc(100vw - 32px) !important;
  max-height: calc(100svh - 32px) !important;
}
.agent-import-shell{
  max-width: calc(100vw - 32px) !important;
  max-height: calc(100svh - 32px) !important;
  overflow-y: auto !important;
}

/* Плавающий result (окно расчёта) */
.result{
  max-width: calc(100vw - 32px) !important;
  max-height: calc(100svh - 32px) !important;
  overflow: auto !important;
  box-sizing: border-box !important;
}

/* Тосты и оверлеи */
.toast{
  max-width: calc(100vw - 40px) !important;
  box-sizing: border-box !important;
}
'''
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: добавлены универсальные правила viewport')

# Обновляем версию
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>90', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>90', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v90')
print('===== ГОТОВО =====')
