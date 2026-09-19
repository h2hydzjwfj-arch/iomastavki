p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем предыдущий блок v44 если есть
v44_idx = s.find('/* v44: широкое поле статьи */')
if v44_idx > 0:
    s = s[:v44_idx].rstrip() + '\n'
    print('OK: удалён старый v44')

s += '''

/* v45: статья на всю ширину */
.article-shell{
  background:#f8fcfd !important;
}
.article-body-full{
  max-width:100% !important;
  width:100% !important;
  padding:40px 60px 80px !important;
  margin:0 auto !important;
  font-size:17px !important;
  line-height:1.8 !important;
  box-sizing:border-box !important;
}
.article-body-full p{
  font-size:17px !important;
  line-height:1.8 !important;
  margin:0 0 18px !important;
  max-width:none !important;
}
.article-body-full h1{font-size:32px !important}
.article-body-full h2{font-size:26px !important;margin:38px 0 16px !important}
.article-body-full h3{font-size:20px !important;margin:26px 0 12px !important}
.article-body-full ul{max-width:none !important}
.article-body-full ul li{font-size:16px !important;line-height:1.75 !important}
.article-subtitle{
  font-size:19px !important;
  margin:0 0 32px 0 !important;
  max-width:none !important;
  padding-left:20px !important;
}
.article-table-wrap{max-width:100% !important}
.article-source-link,.article-source{max-width:100% !important}
body.manual-dark .article-shell{background:#082b3b !important}

@media(max-width:900px){
  .article-body-full{padding:28px 20px 60px !important;font-size:15.5px !important}
  .article-body-full p{font-size:15.5px !important}
  .article-body-full h1{font-size:24px !important}
  .article-body-full h2{font-size:21px !important}
  .article-body-full h3{font-size:17px !important}
  .article-subtitle{font-size:16px !important}
}
'''
open(p, 'w', encoding='utf-8').write(s)
print('OK: статья теперь на всю ширину')
