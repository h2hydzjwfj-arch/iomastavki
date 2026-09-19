p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
if 'v43: таблицы статей' not in s:
    s += '''

/* v43: таблицы статей */
.article-table-wrap{overflow-x:auto;margin:22px 0;border-radius:14px;border:1px solid rgba(55,103,132,.13)}
.article-table{width:100%;border-collapse:collapse;font-size:14px;background:#fff}
.article-table th{background:#eef7fa;color:#1e4863;font-weight:700;text-align:left;padding:13px 14px;font-size:12px;letter-spacing:.6px;border-bottom:1px solid rgba(55,103,132,.14)}
.article-table td{padding:12px 14px;border-bottom:1px solid rgba(55,103,132,.08);color:#2c4a5e;vertical-align:top;line-height:1.55}
.article-table tr:last-child td{border-bottom:0}
.article-table tr:hover td{background:#f6fbfd}
body.manual-dark .article-table{background:#0a2940}
body.manual-dark .article-table th{background:#0f4059;color:#d6f3f8;border-bottom-color:rgba(130,199,209,.2)}
body.manual-dark .article-table td{color:#d8eaf0;border-bottom-color:rgba(130,199,209,.1)}
body.manual-dark .article-table tr:hover td{background:#0d3145}

.article-inline-progress{margin:30px 0;height:3px;border-radius:2px;background:rgba(55,103,132,.1);overflow:hidden;position:relative}
.article-inline-progress > div{height:100%;width:35%;background:linear-gradient(90deg,transparent,#287fa8,transparent);animation:artProg 1.4s linear infinite;position:absolute;top:0;left:0}
@keyframes artProg{0%{transform:translateX(-100%)}100%{transform:translateX(380%)}}
body.manual-dark .article-inline-progress{background:rgba(130,199,209,.15)}
'''
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: CSS для таблиц добавлен')
else:
    print('OK: CSS уже есть')
