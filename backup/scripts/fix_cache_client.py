import re

# ==================== INDEX.HTML ====================
p = 'index.html'
s = open(p, 'r', encoding='utf-8').read()

# 1. Добавляем класс к обёртке загрузки КП (чтобы скрыть через CSS)
old_wrap = '<div style="margin-top: 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">'
new_wrap = '<div class="rate-upload-area" style="margin-top: 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">'
if old_wrap in s:
    s = s.replace(old_wrap, new_wrap)
    print('OK: index.html — rate-upload-area')

# 2. Версия
s = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>98', s)
s = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>98', s)
open(p, 'w', encoding='utf-8').write(s)
print('OK: index.html → v98')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# 3. Добавляем localStorage кэш после "let articleMemCache"
if 'function readLocalCache' not in s2:
    anchor = s2.find('let articleMemCache')
    if anchor > 0:
        line_end = s2.find('\n', anchor)
        block = '''

// ========== localStorage кэш статей и новостей ==========
function readLocalCache(name){
  try { return JSON.parse(localStorage.getItem('iomas_' + name) || '{}'); } catch(e){ return {}; }
}
function writeLocalCache(name, obj){
  try {
    // Ограничение: не более 100 записей
    const keys = Object.keys(obj);
    if (keys.length > 100){
      const sorted = keys.sort(function(a,b){ return (obj[a].at || 0) - (obj[b].at || 0); });
      for (let i = 0; i < keys.length - 100; i++) delete obj[sorted[i]];
    }
    localStorage.setItem('iomas_' + name, JSON.stringify(obj));
  } catch(e){ console.warn('localStorage full'); }
}
function getLocalArticle(key, lang){
  const c = readLocalCache('articles');
  const e = c[key + '::' + lang];
  if (!e) return null;
  if (Date.now() - (e.at || 0) > 7*24*60*60*1000){ delete c[key + '::' + lang]; writeLocalCache('articles', c); return null; }
  return e.article;
}
function saveLocalArticle(key, lang, article){
  const c = readLocalCache('articles');
  c[key + '::' + lang] = { article, at: Date.now() };
  writeLocalCache('articles', c);
}
function getLocalNews(){
  const c = readLocalCache('news');
  if (!c.items || !c.at) return null;
  if (Date.now() - c.at > 6*60*60*1000) return null;
  return c.items;
}
function saveLocalNews(items){
  writeLocalCache('news', { items, at: Date.now() });
}
'''
        s2 = s2[:line_end+1] + block + s2[line_end+1:]
        print('OK: app.js — localStorage кэш функций')

# 4. Сохранение полей формы
if "iomas_field_" not in s2:
    anchor = s2.find("['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('blur'")
    if anchor < 0:
        anchor = s2.find('updateCityPlaceholders();')
    block = '''

// ========== Сохранение полей формы ==========
(function(){
  const ids = ['fromCity','toCity','weight','pieces','distance','length','width','height'];
  ids.forEach(function(id){
    const el = document.getElementById(id);
    if (!el) return;
    const saved = localStorage.getItem('iomas_field_' + id);
    if (saved && !el.value) el.value = saved;
    el.addEventListener('input', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
    el.addEventListener('change', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
  });
})();
'''
    if anchor > 0:
        s2 = s2[:anchor] + block + s2[anchor:]
        print('OK: app.js — сохранение полей формы')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== app.js готов ====')

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

if 'v98: cache + chat fix' not in s3:
    s3 += '''

/* ========== v98: cache + chat fix ========== */

/* 1. Скрыть кнопку «Загрузить КП / Ставку» */
.rate-upload-area { display: none !important; }

/* 2. Чат — сильное разделение */
.chat-messages{
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 4px !important;
}
.chat-bubble{
  max-width: 78% !important;
  box-sizing: border-box !important;
  padding: 12px 16px !important;
  font-size: 13.5px !important;
  line-height: 1.55 !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  overflow-wrap: anywhere !important;
}
.chat-bubble.user{
  align-self: flex-end !important;
  margin: 8px 0 8px auto !important;
  background: linear-gradient(135deg, #3d9ec7, #227eaa) !important;
  color: #fff !important;
  border-radius: 18px 18px 4px 18px !important;
  box-shadow: 0 6px 18px rgba(45,113,159,.22) !important;
  text-align: left !important;
}
.chat-bubble.assistant{
  align-self: flex-start !important;
  margin: 8px auto 8px 0 !important;
  background: #edf5f9 !important;
  color: #355164 !important;
  border-radius: 18px 18px 18px 4px !important;
  box-shadow: 0 4px 14px rgba(0,0,0,.05) !important;
  position: relative !important;
  padding-left: 20px !important;
}
.chat-bubble.assistant:before{
  content: "AI" !important;
  position: absolute !important;
  left: -30px !important;
  top: 10px !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #3d9ec7, #227eaa) !important;
  color: #fff !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  display: grid !important;
  place-items: center !important;
  box-shadow: 0 3px 10px rgba(45,113,159,.3) !important;
}
body.manual-dark .chat-bubble.user{
  background: linear-gradient(135deg, #3d9ec7, #227eaa) !important;
  color: #fff !important;
}
body.manual-dark .chat-bubble.assistant{
  background: #10374b !important;
  color: #eafcff !important;
}
'''
    open(p3, 'w', encoding='utf-8').write(s3)
    print('OK: styles.css — кэш + чат фикс')

print('===== ГОТОВО =====')
