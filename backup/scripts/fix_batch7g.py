import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# Отключаем вызов /api/weather из клиента — погода не настроена
old_cw = "async function checkWeather(){try{const cfg=await fetch('/api/config',{cache:'no-store'}).then(r=>r.json());if(!cfg.weatherConfigured){setTimeWeather();return}const wr=await fetch('/api/weather',{cache:'no-store'});if(!wr.ok)throw new Error('weather');const d=await wr.json();applyWeatherVisual(d)}catch{setTimeWeather()}}"
new_cw = "async function checkWeather(){setTimeWeather()}"
if new_cw in s:
    print('SKIP: checkWeather уже упрощён')
elif old_cw in s:
    s = s.replace(old_cw, new_cw, 1)
    print('OK: checkWeather упрощён (нет 404 в консоли)')
else:
    print('WARN: checkWeather anchor не найден')

# Добавляем favicon (чтобы убрать 404)
if "app.get('/favicon.ico'" not in s:
    anchor = "app.get('/', function(req,res){"
    if anchor in s:
        fav = """// Пустая favicon — убирает 404 из консоли
app.get('/favicon.ico', function(req,res){
  res.status(204).end();
});

"""
        s = s.replace(anchor, fav + anchor, 1)
        print('OK: /favicon.ico добавлен')
else:
    print('SKIP: /favicon.ico уже есть')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== v117: фикс наезда hero + жёсткая прозрачность ========== */

/* 1. Сдвигаем весь app-shell вниз под fixed топбар */
.app-shell{
  margin-top: 72px !important;
  padding-top: 0 !important;
  height: calc(100svh - 72px) !important;
  position: relative !important;
}

/* 2. home-view — обычный отступ, контент вниз не улетает */
.home-view{
  padding: 20px 24px 38px !important;
  justify-content: center !important;
  align-items: center !important;
  height: 100% !important;
}

/* 3. Жёсткая прозрачность через ID — три уровня !important */
html body #newsView .directory-panel,
html body #forwardersView .directory-panel,
html body #assistantView .assistant-shell,
html body #calculatorView .calculator-card,
html body #customsView .customs-shell {
  background: rgba(252, 254, 255, 0.52) !important;
  background-image: linear-gradient(135deg, rgba(255,255,255,.68), rgba(240,250,253,.42)) !important;
  -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
  backdrop-filter: blur(40px) saturate(180%) !important;
  border: 1px solid rgba(255,255,255,0.9) !important;
  border-radius: 36px !important;
}

html body.manual-dark #newsView .directory-panel,
html body.manual-dark #forwardersView .directory-panel,
html body.manual-dark #assistantView .assistant-shell,
html body.manual-dark #calculatorView .calculator-card,
html body.manual-dark #customsView .customs-shell {
  background: rgba(8, 42, 60, 0.68) !important;
  background-image: linear-gradient(145deg, rgba(8,42,60,.72), rgba(10,62,78,.58)) !important;
}

/* 4. Картинки новостей — по центру, без среза */
html body #newsView .directory-panel .news-card-img{
  aspect-ratio: 16/10 !important;
  display: block !important;
  overflow: hidden !important;
}
html body #newsView .directory-panel .news-card-img img{
  object-fit: cover !important;
  object-position: center center !important;
  width: 100% !important;
  height: 100% !important;
  display: block !important;
}

/* 5. Мобильные — app-shell сдвигаем на 62px */
@media(max-width: 650px){
  .app-shell{
    margin-top: 62px !important;
    height: calc(100svh - 62px) !important;
  }
  .home-view{
    padding: 12px 14px 25px !important;
  }
  html body #newsView .directory-panel,
  html body #forwardersView .directory-panel,
  html body #assistantView .assistant-shell,
  html body #calculatorView .calculator-card,
  html body #customsView .customs-shell {
    border-radius: 26px !important;
  }
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок v117 добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>117', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>117', s3)
open(p3, 'w', encoding='utf-8').write(s3)

# Финальная проверка
m = re.search(r'styles\.css\?v=[^"]+', s3)
print('OK: index.html → ' + (m.group(0) if m else 'НЕ НАЙДЕНО'))
print('===== ГОТОВО =====')
