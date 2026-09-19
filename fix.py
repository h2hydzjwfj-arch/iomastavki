import re
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# Ищем блок article-title (любая вариация кавычек)
pattern = r'(<div class="article-title">\s*<span class="eyebrow">[^<]*</span>\s*<h1)(>)([^<]*)(</h1>)'

def repl(m):
    return (m.group(1) +
            ' style="color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; background:none !important; text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9),0 8px 30px rgba(0,0,0,.75) !important"' +
            m.group(2) + m.group(3) + m.group(4))

s2, n = re.subn(pattern, repl, s)

if n > 0:
    open(p, 'w', encoding='utf-8').write(s2)
    print('OK: заменено блоков: ' + str(n))
else:
    # Пробуем без span (упрощённая разметка)
    pattern2 = r'(<div class="article-title">.*?<h1)(>)'
    s2, n2 = re.subn(pattern2, r'\1 style="color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9) !important"\2', s, flags=re.DOTALL)
    if n2 > 0:
        open(p, 'w', encoding='utf-8').write(s2)
        print('OK (упрощённо): заменено: ' + str(n2))
    else:
        print('FAIL: разметка не найдена. Ищу вручную...')
        idx = s.find('article-title')
        if idx > 0:
            print('Контекст вокруг article-title:')
            print(s[max(0,idx-50):idx+400])
        else:
            print('article-title не найден в app.js')
