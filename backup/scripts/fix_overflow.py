p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

if 'v51: fix overflow chat + containers' in s:
    print('OK: уже применено')
    exit()

s += '''

/* ========== v51: fix overflow chat + containers ========== */

/* 1. Окно AI-ассистента — контент не выходит за пределы */
.assistant-shell{
  overflow:hidden !important;
  box-sizing:border-box !important;
}
.chat-messages{
  overflow-x:hidden !important;
  overflow-y:auto !important;
  word-wrap:break-word !important;
  overflow-wrap:anywhere !important;
  padding:10px 12px 15px !important;
}
.chat-bubble{
  max-width:85% !important;
  word-wrap:break-word !important;
  overflow-wrap:anywhere !important;
  word-break:break-word !important;
  white-space:pre-wrap !important;
  box-sizing:border-box !important;
  overflow:hidden !important;
}
.chat-bubble *{
  max-width:100% !important;
  overflow-wrap:anywhere !important;
  word-break:break-word !important;
  box-sizing:border-box !important;
}
/* Длинные URL и таблицы не растягивают */
.chat-bubble a{word-break:break-all !important}
.chat-bubble code,.chat-bubble pre{
  white-space:pre-wrap !important;
  word-break:break-word !important;
  overflow-wrap:anywhere !important;
  max-width:100% !important;
  overflow-x:auto !important;
}

/* 2. AI-ассистент — фиксируем размеры, чтобы ничего не вылезало */
.assistant-shell{
  display:flex !important;
  flex-direction:column !important;
}
.chat-compose textarea{
  max-width:100% !important;
  box-sizing:border-box !important;
  word-wrap:break-word !important;
  overflow-wrap:anywhere !important;
}

/* 3. Все остальные окна — контент в рамках */
.directory-panel,
.calculator-card,
.customs-shell,
.article-shell,
.article-body{
  overflow-x:hidden !important;
  box-sizing:border-box !important;
}
.directory-table-wrap{
  max-width:100% !important;
  overflow-x:auto !important;
}
.article-body p,
.article-body h1,
.article-body h2,
.article-body h3,
.article-body ul,
.article-body li{
  max-width:100% !important;
  overflow-wrap:anywhere !important;
  word-break:break-word !important;
}

/* 4. Общий фикс — ничего не выезжает за экран */
.view-layer *{
  max-width:100%;
  box-sizing:border-box;
}
input, textarea, select, button{
  max-width:100% !important;
  box-sizing:border-box !important;
}
img{
  max-width:100% !important;
  height:auto;
}

/* 5. Мобильная адаптация */
@media(max-width:650px){
  .assistant-shell{width:calc(100vw - 20px) !important;padding:50px 16px 16px !important}
  .chat-bubble{max-width:92% !important;font-size:12.5px !important}
  .chat-messages{padding:8px 6px 10px !important}
  .directory-panel,.calculator-card,.customs-shell{
    width:calc(100vw - 20px) !important;
    padding-left:16px !important;
    padding-right:16px !important;
  }
}
'''
open(p, 'w', encoding='utf-8').write(s)
print('OK: styles.css обновлён (фикс overflow)')

# Обновляем версию для сброса кэша
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = s2.replace('styles.css?v=20260919-v50', 'styles.css?v=20260919-v51')
s2 = s2.replace('app.js?v=20260919-v50', 'app.js?v=20260919-v51')
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html версия обновлена до v51')
print('==== Готово ====')
