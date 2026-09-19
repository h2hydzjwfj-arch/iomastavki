p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

if 'v44: широкое поле статьи' not in s:
    s += '''

/* v44: широкое поле статьи */
.article-body-full{
  max-width:1100px !important;
  padding:44px 40px 80px !important;
  font-size:16.5px !important;
  line-height:1.85 !important;
}
.article-body-full p{
  font-size:16.5px !important;
  line-height:1.85 !important;
  margin:0 0 18px !important;
}
.article-body-full h2{font-size:26px !important;margin:40px 0 16px !important}
.article-body-full h3{font-size:19px !important;margin:28px 0 12px !important}
.article-subtitle{font-size:19px !important;margin-bottom:32px !important}
@media(max-width:900px){
  .article-body-full{max-width:100% !important;padding:30px 22px 60px !important;font-size:15.5px !important}
  .article-body-full p{font-size:15.5px !important}
  .article-body-full h2{font-size:22px !important}
  .article-body-full h3{font-size:17px !important}
}
'''
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: поле статьи расширено')
else:
    print('OK: уже расширено')
