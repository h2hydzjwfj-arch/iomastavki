import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Ключ кэша статей — с языком (чтобы смена языка перечитывала статью)
old = "  const cacheKey = normalizeText(title);\n  if (articleMemCache[cacheKey]){"
new = "  const cacheKey = normalizeText(title) + '::' + lang;\n  if (articleMemCache[cacheKey]){"
if old in s:
    s = s.replace(old, new, 1)
    print('OK: openArticle — ключ кэша с языком')
else:
    print('WARN: openArticle anchor не найден')

# 2. Открытие view — показывать стрелку Назад только для article
old = """  const open = (name) => {
    const id=viewMap[name]; if(!id) return false;
    const target=document.getElementById(id); if(!target) return false;
    document.querySelectorAll('.view-layer').forEach(v=>{v.classList.remove('open');v.setAttribute('aria-hidden','true')});
    target.classList.add('open'); target.setAttribute('aria-hidden','false'); document.body.classList.add('view-open');"""
new = """  const open = (name) => {
    const id=viewMap[name]; if(!id) return false;
    const target=document.getElementById(id); if(!target) return false;
    document.querySelectorAll('.view-layer').forEach(v=>{v.classList.remove('open');v.setAttribute('aria-hidden','true')});
    target.classList.add('open'); target.setAttribute('aria-hidden','false'); document.body.classList.add('view-open');
    var _back = document.getElementById('backToNewsBtn'); if (_back) _back.style.display = (name === 'article') ? 'inline-flex' : 'none';"""
if old in s:
    s = s.replace(old, new, 1)
    print('OK: open — управление стрелкой Назад')
else:
    print('WARN: open anchor не найден')

# 3. Закрытие view — скрывать стрелку
old = "  const close = () => { document.querySelectorAll('.view-layer').forEach(v=>{v.classList.remove('open');v.setAttribute('aria-hidden','true')}); document.body.classList.remove('view-open'); };"
new = "  const close = () => { document.querySelectorAll('.view-layer').forEach(v=>{v.classList.remove('open');v.setAttribute('aria-hidden','true')}); document.body.classList.remove('view-open'); var _back = document.getElementById('backToNewsBtn'); if (_back) _back.style.display = 'none'; };"
if old in s:
    s = s.replace(old, new, 1)
    print('OK: close — скрытие стрелки')
else:
    print('WARN: close anchor не найден')

# 4. Обработчик кнопки Назад
if 'v101: стрелка назад' not in s:
    s += """

// === v101: стрелка назад в статье -> к списку новостей ===
(function(){
  var b = document.getElementById('backToNewsBtn');
  if (!b) return;
  b.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    if (typeof window.__iomaOpenView === 'function') window.__iomaOpenView('news');
  });
})();
"""
    print('OK: обработчик стрелки Назад добавлен')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ' байт, стало ' + str(len(s)))

# ==================== SERVER.JS ====================
p2 = 'server.js'
s2 = open(p2, 'r', encoding='utf-8').read()
orig2 = len(s2)

if 'const CONCURRENCY = 2;' in s2:
    s2 = s2.replace('const CONCURRENCY = 2;', 'const CONCURRENCY = 4;', 1)
    print('OK: аудио CONCURRENCY 2 -> 4 (в 2 раза быстрее)')
else:
    print('SKIP: CONCURRENCY уже изменён')

if 'const MAX = 1500;' in s2:
    s2 = s2.replace('const MAX = 1500;', 'const MAX = 2000;', 1)
    print('OK: аудио MAX 1500 -> 2000 (меньше батчей)')

open(p2, 'w', encoding='utf-8').write(s2)
print('server.js: было ' + str(orig2) + ', стало ' + str(len(s2)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()

# Найти и извлечь SVG из старого controlDock
start = s3.find('<div id="controlDock"')
end = s3.find('<div class="brand"')
if start < 0 or end <= start:
    print('FAIL: controlDock в HTML не найден')
    exit(1)

control_block = s3[start:end]

# Извлечь SVG hamsa
hamsa_m = re.search(r'(<svg viewBox="0 0 80 80"[\s\S]*?</svg>)', control_block)
hamsa_svg = hamsa_m.group(1) if hamsa_m else '<span style="font-size:18px">✋</span>'
if not hamsa_m: print('WARN: hamsa SVG не извлечён')

# Извлечь SVG customs
customs_m = re.search(r'(<svg class="customs-officer-icon"[\s\S]*?</svg>)', control_block)
customs_svg = customs_m.group(1) if customs_m else '<span style="font-size:18px">🛃</span>'
if not customs_m: print('WARN: customs SVG не извлечён')

# Заменить controlDock на кнопку Назад
back_btn = '''  <button id="backToNewsBtn" class="topbar-back" type="button" aria-label="Назад к новостям" title="Назад к новостям" style="display:none">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  </button>
'''
s3 = s3[:start] + back_btn + s3[end:]
print('OK: controlDock -> кнопка Назад')

# Вставить top-nav в .top-actions
top_nav_html = (
    '<nav class="top-nav" id="topNav" aria-label="Быстрые действия">'
    '<button id="menuButton" class="top-nav-btn" type="button" data-i18n-aria="menu" aria-label="Карта дня" title="Карта дня">'
    + hamsa_svg +
    '<span>Карта</span></button>'
    '<button id="themeToggleButton" class="top-nav-btn" type="button" title="Тема" aria-label="Тема">'
    '<span id="themeIcon" class="top-nav-icon">☀</span><span>Тема</span></button>'
    '<button id="agentImportButton" class="top-nav-btn" type="button" aria-label="Обновить ставки" title="Обновить ставки">'
    '<span class="top-nav-icon">$</span><span>Ставки</span></button>'
    '<button id="customsButton" class="top-nav-btn" type="button" aria-label="Проверка ТН ВЭД" title="Проверка ТН ВЭД">'
    + customs_svg +
    '<span>Таможня</span></button>'
    '</nav>'
)

old_live = '<span class="live-pill">'
if old_live in s3 and 'class="top-nav"' not in s3:
    s3 = s3.replace(old_live, top_nav_html + old_live, 1)
    print('OK: top-nav добавлен в топбар')
else:
    print('SKIP: top-nav уже есть')

# Обновление версий
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>101', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>101', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v101')

# ==================== STYLES.CSS ====================
p4 = 'styles.css'
s4 = open(p4, 'r', encoding='utf-8').read()

css_add = """

/* ========== v101: верхнее меню + стрелка Назад ========== */
.top-nav{display:flex;align-items:center;gap:2px;margin-right:8px}
.top-nav-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:46px;height:48px;padding:4px 8px;border:1px solid transparent;border-radius:12px;background:transparent;color:#1d607e;cursor:pointer;transition:background .2s ease, transform .18s ease;font-family:inherit}
.top-nav-btn:hover{background:rgba(255,255,255,.62);border-color:rgba(255,255,255,.78);transform:translateY(-1px)}
.top-nav-btn>span:last-child{font-size:9px;font-weight:700;letter-spacing:.2px;line-height:1;color:#476a7e;white-space:nowrap}
.top-nav-btn .top-nav-icon{font-size:18px;line-height:1;font-weight:800}
.top-nav-btn .top-nav-svg{width:22px;height:22px;display:block}
.top-nav-btn .top-nav-svg .hamsa-palm{fill:rgba(55,115,153,.1);stroke:#236782;stroke-width:2.4}
.top-nav-btn .top-nav-svg .hamsa-eye,.top-nav-btn .top-nav-svg .finger{fill:none;stroke:#236782;stroke-width:2}
.top-nav-btn .top-nav-svg .hamsa-dot{fill:#236782}
.top-nav-btn .customs-officer-icon{fill:none;stroke:#236782;stroke-width:2.4;width:22px;height:22px}

body.manual-dark .top-nav-btn{color:#e8f8fa}
body.manual-dark .top-nav-btn:hover{background:rgba(30,80,105,.55);border-color:rgba(140,220,235,.28)}
body.manual-dark .top-nav-btn>span:last-child{color:#b9d8e8}
body.manual-dark .top-nav-btn .top-nav-svg .hamsa-palm{fill:none;stroke:#dceff1}
body.manual-dark .top-nav-btn .top-nav-svg .hamsa-eye,body.manual-dark .top-nav-btn .top-nav-svg .finger{stroke:#dceff1}
body.manual-dark .top-nav-btn .top-nav-svg .hamsa-dot{fill:#dceff1}
body.manual-dark .top-nav-btn .customs-officer-icon{stroke:#dceff1}

/* Панель быстрых действий прячется при открытии любого окна */
body.view-open .top-nav{display:none !important}

/* Стрелка Назад */
.topbar-back{width:42px;height:42px;flex:0 0 42px;margin:0 14px 0 8px;border:1px solid rgba(255,255,255,.72);border-radius:12px;background:rgba(255,255,255,.78);color:#1d607e;cursor:pointer;align-items:center;justify-content:center;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 6px 20px rgba(35,83,111,.1);transition:transform .2s ease, background .2s ease;padding:0;box-sizing:border-box}
.topbar-back:hover{transform:scale(1.06);background:#fff}
.topbar-back svg{display:block}
body.manual-dark .topbar-back{background:rgba(17,57,73,.92);border-color:rgba(139,210,216,.32);color:#e8f8fa}
body.manual-dark .topbar-back:hover{background:#12556a}

/* Полностью убираем старую левую док-кнопку */
#controlDock,.control-dock,.control-tools,.control-launcher{display:none !important;visibility:hidden !important;pointer-events:none !important}

@media(max-width:900px){
  .top-nav-btn>span:last-child{display:none}
  .top-nav-btn{min-width:36px;width:36px;height:36px;padding:0}
  .top-nav{gap:2px;margin-right:6px}
}
@media(max-width:650px){
  .top-nav-btn{min-width:32px;width:32px;height:32px}
  .top-nav-btn .top-nav-svg,.top-nav-btn .customs-officer-icon{width:19px;height:19px}
  .topbar-back{width:36px;height:36px;flex:0 0 36px;margin:0 8px 0 4px}
}
"""

s4 += css_add
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: styles.css — добавлен блок v101')

print('===== ГОТОВО =====')
