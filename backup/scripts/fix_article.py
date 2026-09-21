import re

# ============ 1. Обновляем app.js ============
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# Находим старую openArticle
start = s.find('async function openArticle(n){')
end_marker = s.find('function applyWeatherVisual', start)

if start > 0 and end_marker > start:
    new_func = r'''let articleMemCache = {};
async function openArticle(n){
  currentArticleNews = n;
  showView('article');
  const box = $('#articleContent');
  const urgent = isUrgentNews(n);
  const title = cleanNewsText(n.title || '');
  const desc = cleanNewsText(n.description || '');
  const source = cleanNewsText(n.source || '');
  const img = n.image || '';
  const dateStr = n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US') : '';

  const cacheKey = normalizeText(title);
  const cached = articleMemCache[cacheKey];
  const statusLabel = urgent ? (lang === 'ru' ? 'СРОЧНО · ЗАКОН / ТАМОЖНЯ' : 'URGENT · LAW / CUSTOMS') : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');

  const heroHtml = `<div class="article-hero">${img ? `<img src="${escapeHtml(img)}" alt="" loading="eager">` : `<div class="article-art"></div>`}<div class="article-hero-shade"></div><div class="article-title"><span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.9)!important">${escapeHtml(statusLabel)}</span><h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;background:none!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9),0 8px 30px rgba(0,0,0,.75)!important">${escapeHtml(title)}</h1><p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important;text-shadow:0 2px 8px rgba(0,0,0,.75)!important">${escapeHtml(source)}${dateStr ? ' · ' + escapeHtml(dateStr) : ''}</p></div></div>`;

  if (!cached) {
    box.innerHTML = heroHtml + `<div class="article-loading-box"><div class="article-loading-spinner"></div><p>Готовлю подробную статью…</p><small>Это займёт 10–20 секунд. ИИ разбирает новость, дополняет контекстом и подбирает фотографии.</small></div>`;
  }

  try {
    let article = cached;
    if (!article) {
      const r = await fetch('/api/news/article', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '', language: lang })
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || 'Не удалось подготовить статью');
      article = d.article;
      articleMemCache[cacheKey] = article;
    }
    renderArticleFull(article, n, urgent, source, title, dateStr, img, statusLabel);
  } catch (e) {
    console.warn('Article AI error:', e);
    renderArticleFallback(n, urgent, e.message || 'Ошибка генерации', img, title, source, dateStr, statusLabel);
  }
}

function renderArticleFull(a, n, urgent, source, title, dateStr, img, statusLabel){
  const box = $('#articleContent');
  const articleTitle = cleanNewsText(a.title || title);
  const subtitle = cleanNewsText(a.subtitle || '');
  const content = String(a.content || '');
  const images = Array.isArray(a.images) ? a.images.filter(Boolean).slice(0, 4) : [];
  const mainImage = a.image || img;
  const sourceLink = n.link || '';

  // Парсим markdown-ish
  function mdToHtml(text){
    let html = escapeHtml(text);
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/^\s*[-–—] (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(m){ return '<ul>' + m.replace(/\n/g,'') + '</ul>'; });
    // параграфы
    html = html.split(/\n\s*\n/).map(function(p){
      p = p.trim();
      if(!p) return '';
      if(/^<(h1|h2|h3|ul|ol|blockquote)/.test(p)) return p;
      return '<p>' + p.replace(/\n/g,'<br>') + '</p>';
    }).join('');
    return html;
  }

  const contentHtml = mdToHtml(content);

  // Галерея
  let galleryHtml = '';
  if(images.length){
    galleryHtml = '<div class="article-inline-gallery">' + images.map(function(u){ return `<img src="${escapeHtml(u)}" loading="lazy" alt="">`; }).join('') + '</div>';
  }

  // Разбить контент пополам — вставить галерею в середину
  const parts = contentHtml.split('</h2>');
  let withGallery = contentHtml;
  if(images.length && parts.length > 3){
    const mid = Math.floor(parts.length / 2);
    withGallery = parts.slice(0, mid).join('</h2>') + '</h2>' + galleryHtml + parts.slice(mid).join('</h2>');
  } else {
    withGallery = galleryHtml + contentHtml;
  }

  const bigImgHtml = mainImage ? `<img src="${escapeHtml(mainImage)}" alt="" loading="eager">` : `<div class="article-art"></div>`;

  box.innerHTML = `
    <div class="article-hero">
      ${bigImgHtml}
      <div class="article-hero-shade"></div>
      <div class="article-title">
        <span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.9)!important">${escapeHtml(statusLabel)}</span>
        <h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;background:none!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9),0 8px 30px rgba(0,0,0,.75)!important">${escapeHtml(articleTitle)}</h1>
        <p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important;text-shadow:0 2px 8px rgba(0,0,0,.75)!important">${escapeHtml(source)}${dateStr ? ' · ' + escapeHtml(dateStr) : ''}</p>
      </div>
    </div>
    <div class="article-body article-body-full">
      ${subtitle ? `<p class="article-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      ${withGallery}
      ${sourceLink ? `<div class="article-source-link"><b>Источник:</b> <a href="${escapeHtml(sourceLink)}" target="_blank" rel="noopener">${escapeHtml(source)}</a></div>` : ''}
      <div class="article-source"><b>Примечание:</b> статья сгенерирована ИИ на основе источника и открытых данных. Для юридически значимых решений проверяйте первоисточник.</div>
    </div>
  `;
}

function renderArticleFallback(n, urgent, errMsg, img, title, source, dateStr, statusLabel){
  const box = $('#articleContent');
  const desc = cleanNewsText(n.description || '');
  box.innerHTML = `
    <div class="article-hero">
      ${img ? `<img src="${escapeHtml(img)}" alt="" loading="eager">` : `<div class="article-art"></div>`}
      <div class="article-hero-shade"></div>
      <div class="article-title">
        <span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.9)!important">${escapeHtml(statusLabel)}</span>
        <h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;background:none!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9),0 8px 30px rgba(0,0,0,.75)!important">${escapeHtml(title)}</h1>
        <p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important">${escapeHtml(source)}${dateStr ? ' · ' + escapeHtml(dateStr) : ''}</p>
      </div>
    </div>
    <div class="article-body article-body-full">
      <p>${escapeHtml(desc || 'Не удалось загрузить подробную версию статьи.')}</p>
      <p style="color:#a94d4d;font-size:12px;margin-top:20px">${escapeHtml(errMsg)}</p>
    </div>
  `;
}
'''
    s = s[:start] + new_func + '\n' + s[end_marker:]
    print('OK: openArticle + renderArticleFull + renderArticleFallback заменены в app.js')
else:
    print('FAIL: openArticle не найдена или end_marker не найден')

open(p, 'w', encoding='utf-8').write(s)

# ============ 2. Стили в styles.css ============
sp = 'styles.css'
sc = open(sp, 'r', encoding='utf-8').read()

css_block = '''
/* v42: полная AI-статья */
.article-loading-box{
  max-width:700px;margin:60px auto;padding:40px 30px;text-align:center;
  background:linear-gradient(145deg,#f4fafd,#e0eef4);
  border:1px solid rgba(55,103,132,.12);border-radius:20px;
  box-shadow:0 20px 60px rgba(38,90,116,.08);
}
.article-loading-box p{font-size:16px;color:#1e4863;font-weight:600;margin:20px 0 8px}
.article-loading-box small{color:#6f8896;font-size:12px;line-height:1.5;display:block;max-width:420px;margin:0 auto}
.article-loading-spinner{
  width:56px;height:56px;margin:0 auto;
  border:4px solid rgba(50,120,168,.15);
  border-top-color:#287fa8;border-radius:50%;
  animation:artSpin 1s linear infinite;
}
@keyframes artSpin{to{transform:rotate(360deg)}}
body.manual-dark .article-loading-box{background:linear-gradient(145deg,#0c3a4e,#115365);border-color:rgba(130,199,209,.2)}
body.manual-dark .article-loading-box p{color:#e8fbfd}
body.manual-dark .article-loading-box small{color:#9fc2d0}

.article-body-full{max-width:780px !important;font-size:15.5px !important;line-height:1.8 !important;color:#2c4a5e !important}
.article-body-full h1{font-size:28px;line-height:1.25;color:#123c53;margin:32px 0 16px;font-weight:700}
.article-body-full h2{font-size:22px;line-height:1.3;color:#123c53;margin:36px 0 14px;font-weight:700;padding-bottom:8px;border-bottom:1px solid rgba(55,103,132,.14)}
.article-body-full h3{font-size:17px;line-height:1.4;color:#1c5877;margin:24px 0 10px;font-weight:700}
.article-body-full p{margin:0 0 16px;font-size:15.5px;line-height:1.8}
.article-body-full ul{margin:0 0 18px 22px;padding:0;list-style:none}
.article-body-full ul li{position:relative;padding-left:22px;margin:8px 0;font-size:15px;line-height:1.7}
.article-body-full ul li:before{content:"▪";position:absolute;left:0;color:#287fa8;font-size:18px;line-height:1.4}
.article-body-full a{color:#1c6f95;text-decoration:none;border-bottom:1px solid rgba(28,111,149,.3);transition:border-color .2s}
.article-body-full a:hover{border-bottom-color:#1c6f95}
.article-body-full strong{color:#123c53;font-weight:700}
.article-subtitle{font-size:17px !important;color:#4d6c7c !important;font-style:italic !important;margin-bottom:24px !important;padding-left:18px;border-left:3px solid #287fa8}

.article-inline-gallery{
  display:grid;grid-template-columns:repeat(3,1fr);gap:10px;
  margin:28px 0;border-radius:18px;overflow:hidden;
}
.article-inline-gallery img{
  width:100%;height:200px;object-fit:cover;
  border-radius:14px;cursor:pointer;
  transition:transform .35s ease, box-shadow .35s ease;
  box-shadow:0 10px 30px rgba(38,90,116,.1);
}
.article-inline-gallery img:hover{transform:scale(1.03);box-shadow:0 14px 40px rgba(38,90,116,.18)}
@media(max-width:700px){
  .article-inline-gallery{grid-template-columns:1fr 1fr}
  .article-inline-gallery img{height:140px}
  .article-body-full{font-size:15px !important}
}

.article-source-link{
  margin:32px 0 16px;padding:16px 18px;
  background:linear-gradient(135deg,#eef7fa,#f7fbfd);
  border:1px solid rgba(55,103,132,.1);border-radius:14px;
  font-size:13px;color:#3d6072;
}
.article-source-link a{color:#1c6f95;font-weight:600;word-break:break-all}

body.manual-dark .article-body-full{color:#d8eaf0 !important}
body.manual-dark .article-body-full h1,body.manual-dark .article-body-full h2{color:#f1faff !important;border-bottom-color:rgba(130,199,209,.2) !important}
body.manual-dark .article-body-full h3{color:#c9ecf5 !important}
body.manual-dark .article-body-full p{color:#d8eaf0 !important}
body.manual-dark .article-body-full strong{color:#fff !important}
body.manual-dark .article-subtitle{color:#c9dde4 !important}
body.manual-dark .article-source-link{background:linear-gradient(135deg,#0b3a4c,#104a5e);border-color:rgba(130,199,209,.2);color:#c9dde4}
body.manual-dark .article-source-link a{color:#7fe1ed}
'''

if 'v42: полная AI-статья' not in sc:
    sc = sc + css_block
    open(sp, 'w', encoding='utf-8').write(sc)
    print('OK: стили добавлены в styles.css')
else:
    print('OK: стили уже есть')

print('==== Всё готово ====')
