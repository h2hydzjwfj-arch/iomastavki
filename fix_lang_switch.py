p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
changed = 0

# 1. loadNews должен передавать ?lang=
if "fetch('/api/news?lang='" not in s and "fetch('/api/news'" in s:
    s = s.replace("fetch('/api/news',{cache:'no-store'})", "fetch('/api/news?lang='+encodeURIComponent(lang),{cache:'no-store'})")
    s = s.replace("fetch('/api/news',{cache:'no-store',credentials:'same-origin'})", "fetch('/api/news?lang='+encodeURIComponent(lang),{cache:'no-store',credentials:'same-origin'})")
    s = s.replace("await fetch('/api/news',", "await fetch('/api/news?lang='+encodeURIComponent(lang),")
    changed += 1
    print('OK: loadNews теперь с lang')
else:
    print('OK: loadNews уже с lang (или не найден)')

# 2. Обработчик смены языка: чистить кэш + перезагружать новости + перерисовывать статью
old_handler = "$$('.lang').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;applyLang();autoDistance()});"
new_handler = """$$('.lang').forEach(b=>b.onclick=async()=>{
  lang=b.dataset.lang;
  try{ newsCache=[]; articleMemCache={}; }catch(e){}
  applyLang();
  autoDistance();
  if(typeof loadNews==='function') await loadNews();
  // Если открыта статья — перерисовать её на новом языке
  try{
    if(currentArticleNews && document.getElementById('articleView')?.classList.contains('open')){
      await openArticle(currentArticleNews);
    }
  }catch(e){ console.warn('reopen article:', e); }
});"""

if old_handler in s:
    s = s.replace(old_handler, new_handler)
    changed += 1
    print('OK: обработчик языка обновлён')
elif "b.dataset.lang;applyLang();autoDistance()" in s:
    # Была другая вариация
    import re
    s = re.sub(r"\$\$\('\.lang'\)\.forEach\(b=>b\.onclick=\(\)=>\{[^}]*\}\);", new_handler, s)
    changed += 1
    print('OK: обработчик языка обновлён (regex)')
else:
    print('WARN: обработчик языка не найден')

# 3. openArticle должен использовать lang из параметра
if "language: lang" not in s and "body: JSON.stringify({ title: title" in s:
    s = s.replace("body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '' })",
                  "body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '', language: lang })")
    changed += 1
    print('OK: openArticle теперь передаёт language')
else:
    print('OK: language в openArticle есть или не найден')

open(p, 'w', encoding='utf-8').write(s)
print('==== Готово, изменений: ' + str(changed) + ' ====')
