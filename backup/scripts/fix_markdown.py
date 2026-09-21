import re

p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Находим mdToHtmlArticle и добавляем в начало конвертацию \n
old_start = 'function mdToHtmlArticle(text){\n  let html = String(text||\'\');'

new_start = '''function mdToHtmlArticle(text){
  // Конвертируем литеральные \\n (backslash+n) в реальные переносы строк
  let html = String(text||'').replace(/\\\\n/g, '\\n');
  // Также разбираемся со случаями когда AI вернул реальные \\r\\n
  html = html.replace(/\\r\\n/g, '\\n');'''

if old_start in s:
    s = s.replace(old_start, new_start)
    print('OK: конвертация \\\\n в переносы добавлена')
else:
    print('WARN: не нашёл точное начало — пробую regex')
    pattern = re.compile(r'function mdToHtmlArticle\(text\)\{\s*\n\s*let html = String\(text\|\|\'\'\);')
    s, n = pattern.subn(new_start, s)
    print('OK: regex-замена ' + str(n))

open(p, 'w', encoding='utf-8').write(s)
print('==== app.js готов ====')

# 2. CSS — уменьшаем размер шрифта и правим заголовок
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

if 'v83: article polish' not in s2:
    s2 += '''

/* v83: article polish */
.article-body-full{
  max-width:1000px !important;
  padding:40px 40px 70px !important;
  font-size:15.5px !important;
  line-height:1.75 !important;
}
.article-body-full p{
  font-size:15.5px !important;
  line-height:1.75 !important;
  margin:0 0 16px !important;
  font-weight:400 !important;
  color:#2c4a5e !important;
}
.article-body-full h1{
  font-size:26px !important;
  line-height:1.3 !important;
  margin:28px 0 14px !important;
  font-weight:700 !important;
}
.article-body-full h2{
  font-size:21px !important;
  line-height:1.35 !important;
  margin:32px 0 12px !important;
  font-weight:700 !important;
}
.article-body-full h3{
  font-size:17px !important;
  line-height:1.4 !important;
  margin:22px 0 10px !important;
  font-weight:600 !important;
}
.article-body-full ul li{
  font-size:15px !important;
  line-height:1.7 !important;
}

/* Заголовок статьи — не обрезается */
.article-hero{
  min-height:420px !important;
  height:auto !important;
  display:flex !important;
  align-items:flex-end !important;
}
.article-hero img,
.article-hero .article-art{
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
}
.article-title{
  position:relative !important;
  padding:60px 44px 36px !important;
  z-index:2 !important;
}
.article-title h1{
  font-size:34px !important;
  line-height:1.15 !important;
  word-wrap:break-word !important;
  overflow-wrap:anywhere !important;
}
.article-title p{
  margin-top:10px !important;
}

body.manual-dark .article-body-full p{color:#d8eaf0 !important}

@media(max-width:700px){
  .article-body-full{padding:26px 20px 55px !important}
  .article-title{padding:40px 20px 24px !important}
  .article-title h1{font-size:24px !important}
  .article-hero{min-height:340px !important}
}
'''
    open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: стили статьи обновлены')

# 3. Версия
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>83', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>83', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v83')
print('===== ГОТОВО =====')
