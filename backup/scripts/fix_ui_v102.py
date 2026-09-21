import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# 1. Заменяем openArticle на умную версию с localStorage-кэшем + фоновый перевод
start = s.find('async function openArticle(n){')
end = s.find('function applyWeatherVisual', start)
if start < 0 or end <= start:
    print('FAIL: openArticle не найден')
    exit(1)

new_open = '''function showLangBadge(on){
  let b = document.getElementById('langSwitchBadge');
  if (on){
    if (!b){
      b = document.createElement('div');
      b.id = 'langSwitchBadge';
      b.className = 'lang-switch-badge';
      b.innerHTML = '<span class="lang-switch-dot"></span><span class="lang-switch-text">Перевод…</span>';
      document.body.appendChild(b);
    }
    b.classList.add('visible');
  } else if (b){
    b.classList.remove('visible');
    setTimeout(function(){ try { b.remove(); } catch(e){} }, 350);
  }
}

async function openArticle(n){
  currentArticleNews = n;
  showView('article');
  const box = $('#articleContent');
  const urgent = isUrgentNews(n);
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const desc = cleanNewsText(n.description || '');
  const source = cleanNewsText(n.source || '');
  const img = n.image || '';
  const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const statusLabel = urgent ? (lang === 'ru' ? 'СРОЧНО' : 'URGENT') : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
  const normTitle = normalizeText(title);
  const cacheKey = normTitle + '::' + lang;

  // 1. Память — мгновенно
  if (articleMemCache[cacheKey]){
    renderArticleFull(articleMemCache[cacheKey], n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }
  // 2. localStorage — мгновенно
  const localArt = (typeof getLocalArticle === 'function') ? getLocalArticle(normTitle, lang) : null;
  if (localArt){
    articleMemCache[cacheKey] = localArt;
    renderArticleFull(localArt, n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

  // 3. Если в окне уже есть другая статья — не стираем, показываем бейдж
  const hasOldContent = !!box.querySelector('.article-body');
  if (hasOldContent){
    showLangBadge(true);
  } else {
    const bigImgHtml = img ? '<img src="' + escapeHtml(img) + '" alt="" loading="eager">' : '<div class="article-art"></div>';
    box.innerHTML = '<div class="article-hero">' + bigImgHtml +
      '<div class="article-hero-shade"></div>' +
      '<div class="article-title">' +
        '<span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.9)!important">' + escapeHtml(statusLabel) + '</span>' +
        '<h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9)!important">' + escapeHtml(title) + '</h1>' +
        '<p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important">' + escapeHtml(source) + (dateStr ? ' · ' + escapeHtml(dateStr) : '') + '</p>' +
      '</div></div>' +
      '<div class="article-body article-body-full">' +
        (desc ? '<p class="article-subtitle">' + escapeHtml(desc) + '</p>' : '') +
        '<div class="article-inline-progress"><div></div></div>' +
      '</div>';
  }

  try {
    const r = await fetch('/api/news/article', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '', language: lang })
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || 'Не удалось');
    articleMemCache[cacheKey] = d.article;
    if (typeof saveLocalArticle === 'function') saveLocalArticle(normTitle, lang, d.article);
    renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
  } catch(e){
    if (!hasOldContent) box.innerHTML += '<p style="color:#a94d4d;padding:20px;text-align:center">Ошибка: ' + escapeHtml(e.message) + '</p>';
    else console.warn('lang switch error:', e.message);
  } finally {
    showLangBadge(false);
  }
}

'''
s = s[:start] + new_open + s[end:]
print('OK: openArticle заменён (localStorage + фоновый перевод)')

# 2. Сохраняем в localStorage при первом fetch в switchArticleLanguage если есть
if 'saveLocalArticle(normTitle' in s:
    pass

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()

# Извлекаем top-nav блок
m_nav = re.search(r'<nav class="top-nav" id="topNav"[\s\S]*?</nav>', s3)
if not m_nav:
    print('FAIL: top-nav не найден в HTML')
    exit(1)
nav_html = m_nav.group(0)

# Извлекаем кнопку backToNewsBtn
m_back = re.search(r'<button id="backToNewsBtn"[\s\S]*?</button>', s3)
if not m_back:
    print('FAIL: backToNewsBtn не найден')
    exit(1)
back_html = m_back.group(0)

# Убираем nav из старого места
s3 = s3.replace(nav_html, '', 1)
# Убираем back из старого места
s3 = s3.replace(back_html, '', 1)

# Собираем topbar-left
topbar_left = '<div class="topbar-left">' + back_html + nav_html + '</div>'

# Вставляем topbar-left перед <div class="brand"
if '<div class="brand"' in s3 and 'topbar-left' not in s3:
    s3 = s3.replace('<div class="brand"', topbar_left + '\n  <div class="brand"', 1)
    print('OK: topbar-left создан (стрелка + nav слева)')
else:
    print('WARN: не удалось вставить topbar-left')

# Версия v102
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>102', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>102', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v102')

# ==================== STYLES.CSS ====================
p4 = 'styles.css'
s4 = open(p4, 'r', encoding='utf-8').read()

css_add = """

/* ========== v102: убрать × в статье, nav влево, бейдж перевода ========== */
.view-layer > .article-shell > .view-close,
.article-shell > .view-close,
#articleView .close-button{
  display: none !important;
  visibility: hidden !important;
}

/* Контейнер левых элементов топбара */
.topbar-left{
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  position: relative;
  z-index: 5;
}

/* Верхнее меню — слева, компактное */
.topbar-left .top-nav{
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0;
}
body.view-open .topbar-left .top-nav{
  display: none !important;
}

/* Стрелка Назад — рядом с nav слева */
.topbar-back{
  margin: 0 !important;
  flex: 0 0 auto;
}

/* Бейдж "Перевод..." */
.lang-switch-badge{
  position: fixed;
  top: 84px;
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 8px 12px;
  border-radius: 999px;
  background: rgba(18, 60, 82, .92);
  color: #eafcff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .2px;
  z-index: 5000;
  pointer-events: none;
  opacity: 0;
  transition: opacity .25s ease, transform .25s ease;
  box-shadow: 0 10px 30px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.12);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.lang-switch-badge.visible{
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.lang-switch-dot{
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7fe1ed;
  box-shadow: 0 0 0 4px rgba(127,225,237,.2);
  animation: langDotPulse 1.1s ease-in-out infinite;
}
@keyframes langDotPulse{
  0%, 100%{ transform: scale(.85); opacity: .65; }
  50%      { transform: scale(1.15); opacity: 1; }
}
body.manual-dark .lang-switch-badge{
  background: rgba(8, 45, 65, .96);
  color: #eafcff;
}

/* Порядок в топбаре: слева — nav, в центре — brand, справа — языки */
.topbar{
  display: flex !important;
  align-items: center !important;
}
.top-actions{
  margin-left: auto !important;
}

/* Верхнее меню в топбаре — компактнее */
.topbar-left .top-nav-btn{
  height: 46px;
  min-width: 44px;
}
.topbar-left .top-nav-btn > span:last-child{
  font-size: 8.5px;
}

@media(max-width: 900px){
  .topbar-left .top-nav-btn{
    height: 40px;
    min-width: 38px;
  }
  .topbar-left .top-nav-btn > span:last-child{ display: none; }
}
@media(max-width: 650px){
  .topbar-left{ gap: 4px; }
  .topbar-left .top-nav-btn{
    height: 36px;
    min-width: 34px;
  }
  .topbar-back{
    width: 36px !important;
    height: 36px !important;
    flex: 0 0 36px !important;
  }
  .lang-switch-badge{ top: 72px; font-size: 11px; padding: 7px 13px 7px 10px; }
}
"""

s4 += css_add
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: styles.css — блок v102 добавлен')

print('===== ГОТОВО =====')
