import re

p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# ============ 1. Фоновый прогрев при загрузке сайта ============
if 'function backgroundPrewarm' not in s:
    block = '''
/* v71: фоновый прогрев статей */
function backgroundPrewarm(){
  try {
    fetch('/api/news/prewarm', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ n: 8 })
    }).catch(function(){});
  } catch(e){}
}

'''
    anchor = s.find("const $ = s =>")
    if anchor >= 0:
        s = s[:anchor] + block + s[anchor:]

# Запускаем прогрев через 8 секунд после загрузки
if 'backgroundPrewarm()' not in s or s.count('backgroundPrewarm()') < 2:
    hook = """
/* v71: запуск фонового прогрева */
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(backgroundPrewarm, 8000);
    setInterval(backgroundPrewarm, 30 * 60 * 1000);
  }, {once:true});
} else {
  setTimeout(backgroundPrewarm, 8000);
  setInterval(backgroundPrewarm, 30 * 60 * 1000);
}
"""
    s = s + hook

# ============ 2. Плавная смена языка статьи без перезагрузки ============
# Меняем обработчик смены языка чтобы статья НЕ пропадала
old_handler_patterns = [
    r"\$\$\('\.lang'\)\.forEach\(b=>b\.onclick=async\(\)=>\{[\s\S]*?\n\}\);",
    r"\$\$\('\.lang'\)\.forEach\(b=>b\.onclick=\(\)=>\{[^}]*\}\);"
]

new_handler = '''$$('.lang').forEach(b=>b.onclick=async()=>{
  const newLang = b.dataset.lang;
  if (newLang === lang) return;
  lang = newLang;
  try{ newsCache=[]; }catch(e){}
  // НЕ сбрасываем articleMemCache полностью — оставляем для проверки
  // articleMemLang оставляем — по нему поймём, есть ли перевод
  applyLang();
  autoDistance();

  // Если открыта статья — плавно подменяем контент
  try{
    if(currentArticleNews && document.getElementById('articleView')?.classList.contains('open')){
      // Показываем индикатор поверх, но не убираем текущий контент
      showArticleLangSwitching(true);
      await switchArticleLanguage(currentArticleNews);
      showArticleLangSwitching(false);
    }
  }catch(e){ console.warn('lang switch article:', e); }

  // Новости в фоне
  if(typeof loadNews==='function') loadNews();
});

function showArticleLangSwitching(on){
  let el = document.getElementById('articleLangOverlay');
  if (on){
    if (!el){
      el = document.createElement('div');
      el.id = 'articleLangOverlay';
      el.className = 'article-lang-overlay';
      el.innerHTML = '<div class="article-lang-spinner"></div><div class="article-lang-text">Перевод статьи…</div>';
      const shell = document.querySelector('.article-shell');
      if (shell) shell.appendChild(el);
    }
    el.classList.add('visible');
  } else if (el){
    el.classList.remove('visible');
    setTimeout(function(){ try{ el.remove(); }catch(e){} }, 400);
  }
}

async function switchArticleLanguage(n){
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const box = $('#articleContent');
  const urgent = isUrgentNews(n);
  const source = cleanNewsText(n.source || '');
  const img = n.image || '';
  const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const statusLabel = urgent ? 'СРОЧНО' : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
  const cacheKey = normalizeText(title);

  // 1) Если в памяти есть перевод на этот язык — подменяем мгновенно
  if (articleMemCache[cacheKey] && articleMemLang[cacheKey] === lang){
    renderArticleFull(articleMemCache[cacheKey], n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

  // 2) Проверяем серверный кэш через быстрый endpoint
  try {
    const r = await fetch('/api/news/article/check', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title: title, language: lang })
    });
    const d = await r.json();
    if (d && d.ready){
      // Забираем из кэша
      const rr = await fetch('/api/news/article', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ title: title, description: cleanNewsText(n.description||''), source: source, link: n.link || '', language: lang })
      });
      const dd = await rr.json();
      if (dd.ok && dd.article){
        articleMemCache[cacheKey] = dd.article;
        articleMemLang[cacheKey] = lang;
        renderArticleFull(dd.article, n, urgent, source, title, dateStr, img, statusLabel);
        return;
      }
    }
  } catch(e){ console.warn('article check error:', e.message); }

  // 3) Перевода нет — запрашиваем у сервера (он сам сгенерирует русскую и переведёт)
  try {
    const r = await fetch('/api/news/article', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title: title, description: cleanNewsText(n.description||''), source: source, link: n.link || '', language: lang })
    });
    const d = await r.json();
    if (d.ok && d.article){
      articleMemCache[cacheKey] = d.article;
      articleMemLang[cacheKey] = lang;
      renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
    }
  } catch(e){
    console.warn('article translate error:', e.message);
  }
}

'''

changed = False
for pat in old_handler_patterns:
    m = re.search(pat, s)
    if m:
        s = s[:m.start()] + new_handler + s[m.end():]
        changed = True
        print('OK: обработчик языка заменён (pattern)')
        break

if not changed:
    print('WARN: обработчик языка не найден — возможно, уже новый')

# ============ 3. openArticle — сначала кэш, потом сервер ============
start = s.find('async function openArticle')
end = s.find('function renderArticleFallback', start)
if start > 0 and end > start:
    new_open = '''async function openArticle(n){
  currentArticleNews = n;
  showView('article');
  const box = $('#articleContent');
  const urgent = isUrgentNews(n);
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const desc = cleanNewsText(n.description || '');
  const source = cleanNewsText(n.source || '');
  const img = n.image || '';
  const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const statusLabel = urgent ? 'СРОЧНО' : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');
  const cacheKey = normalizeText(title);

  // 1) Память: если есть для текущего языка — сразу показываем
  if (articleMemCache[cacheKey] && articleMemLang[cacheKey] === lang){
    renderArticleFull(articleMemCache[cacheKey], n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

  // 2) Показываем скелет с обложкой
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

  // 3) Сервер (он сам разрулит: кэш или генерация)
  try {
    const r = await fetch('/api/news/article', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '', language: lang })
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || 'Не удалось');
    articleMemCache[cacheKey] = d.article;
    articleMemLang[cacheKey] = lang;
    renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
  } catch (e) {
    console.warn('Article AI error:', e);
    box.innerHTML += '<p style="color:#a94d4d;padding:20px;text-align:center">Ошибка: ' + escapeHtml(e.message) + '</p>';
  }
}

'''
    s = s[:start] + new_open + s[end:]
    print('OK: openArticle перезаписан')

# ============ 4. CSS для overlay перевода ============
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()
if 'v71: article lang overlay' not in s2:
    s2 += '''

/* v71: article lang overlay */
.article-lang-overlay{
  position:fixed;
  right:24px;
  top:24px;
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 16px;
  border-radius:14px;
  background:rgba(15,80,105,.94);
  color:#fff;
  font-size:13px;
  font-weight:600;
  box-shadow:0 12px 36px rgba(15,80,105,.35);
  opacity:0;
  transform:translateY(-10px);
  transition:opacity .3s ease, transform .3s ease;
  z-index:9999;
  backdrop-filter:blur(12px);
}
.article-lang-overlay.visible{opacity:1;transform:translateY(0)}
.article-lang-spinner{
  width:16px;height:16px;
  border:2px solid rgba(255,255,255,.35);
  border-top-color:#fff;
  border-radius:50%;
  animation:langSpin .8s linear infinite;
}
@keyframes langSpin{to{transform:rotate(360deg)}}
body.manual-light .article-lang-overlay{background:rgba(40,127,168,.96)}
'''
    open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: CSS overlay добавлен')

# ============ 5. Версия ============
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>71', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>71', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v71')

open(p, 'w', encoding='utf-8').write(s)
print('==== app.js готов ====')
print('===== ГОТОВО =====')
