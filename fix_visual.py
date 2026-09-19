import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

if 'v81: white title + hide route' in s:
    print('OK: уже применено')
else:
    s += '''

/* v81: white title + hide route */
.article-title h1,
.article-title h1 *,
.article-shell .article-title h1,
.article-shell .article-hero .article-title h1{
  color:#ffffff !important;
  -webkit-text-fill-color:#ffffff !important;
  background:none !important;
  font-weight:700 !important;
  text-shadow:0 2px 4px rgba(0,0,0,.98), 0 4px 16px rgba(0,0,0,.9), 0 8px 30px rgba(0,0,0,.75) !important;
}
.article-title p,
.article-title .eyebrow,
.article-shell .article-title p,
.article-shell .article-title .eyebrow{
  color:rgba(255,255,255,.94) !important;
  -webkit-text-fill-color:rgba(255,255,255,.94) !important;
  text-shadow:0 2px 10px rgba(0,0,0,.85) !important;
}
.article-hero-shade{
  background:linear-gradient(180deg, rgba(8,35,50,.15) 0%, rgba(8,35,50,.7) 45%, rgba(8,35,50,.96) 100%) !important;
}
/* Скрыть бессмысленную надпись CHINA → CUSTOMS → RUSSIA */
.article-art-route{display:none !important}
.article-art::after{content:"" !important}
.article-art{
  background:radial-gradient(circle at 75% 25%, rgba(255,255,255,.25), transparent 30%), linear-gradient(135deg, #4a8fb5 0%, #2a5f80 50%, #122f44 100%) !important;
  position:relative !important; overflow:hidden !important;
}
'''
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: styles.css обновлён (белый заголовок + скрыта надпись)')

# Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>81', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>81', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v81')
print('===== ГОТОВО =====')
