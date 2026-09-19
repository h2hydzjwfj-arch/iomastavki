p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

if '/* v43: таблицы в статьях */' in s:
    print('OK: уже есть')
else:
    addition = r'''

/* v43: таблицы в статьях + быстрый рендер без лоадера */
function mdToHtmlArticle(text){
  let html = escapeHtml(text);
  html = html.replace(/^### (.*)$/gm, '___H3___$1___/H3___');
  html = html.replace(/^## (.*)$/gm, '___H2___$1___/H2___');
  html = html.replace(/^# (.*)$/gm, '___H1___$1___/H1___');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const blocks = html.split(/\n\s*\n/);
  const out = [];
  for (let b of blocks) {
    b = b.trim();
    if (!b) continue;
    const lines = b.split('\n').map(function(l){return l.trim();}).filter(function(l){return l;});
    // Таблица?
    if (lines.length >= 2 && /^\|/.test(lines[0]) && /^\|?[\s\-:|]+\|?\s*$/.test(lines[1].replace(/___\w+___/g, ''))){
      const headers = lines[0].split('|').map(function(s){return s.trim();}).filter(function(s, i, arr){return !(i === 0 && s === '') && !(i === arr.length-1 && s === '');});
      const rows = [];
      for (let i = 2; i < lines.length; i++){
        const cells = lines[i].split('|').map(function(s){return s.trim();}).filter(function(s, idx, arr){return !(idx === 0 && s === '') && !(idx === arr.length-1 && s === '');});
        if (cells.length) rows.push(cells);
      }
      let t = '<div class="article-table-wrap"><table class="article-table"><thead><tr>';
      headers.forEach(function(h){ t += '<th>' + h + '</th>'; });
      t += '</tr></thead><tbody>';
      rows.forEach(function(row){
        t += '<tr>';
        headers.forEach(function(_, i){ t += '<td>' + (row[i] || '') + '</td>'; });
        t += '</tr>';
      });
      t += '</tbody></table></div>';
      out.push(t);
      continue;
    }
    if (/^___H[123]___/.test(b)){
      out.push(b.replace(/___H3___/g, '<h3>').replace(/___\/H3___/g, '</h3>')
                  .replace(/___H2___/g, '<h2>').replace(/___\/H2___/g, '</h2>')
                  .replace(/___H1___/g, '<h1>').replace(/___\/H1___/g, '</h1>'));
      continue;
    }
    if (/^[-–—]\s/m.test(b)){
      const items = b.split('\n').map(function(l){return l.replace(/^[-–—]\s*/, '').trim();}).filter(function(l){return l;});
      out.push('<ul>' + items.map(function(i){return '<li>' + i + '</li>';}).join('') + '</ul>');
      continue;
    }
    out.push('<p>' + b.replace(/\n/g, '<br>') + '</p>');
  }
  return out.join('');
}

renderArticleFull = function(a, n, urgent, source, title, dateStr, img, statusLabel){
  const box = $('#articleContent');
  const articleTitle = cleanNewsText(a.title || title);
  const subtitle = cleanNewsText(a.subtitle || '');
  const content = String(a.content || '');
  const images = Array.isArray(a.images) ? a.images.filter(Boolean) : [];
  const mainImage = a.image || img;
  const sourceLink = n.link || '';
  const contentHtml = mdToHtmlArticle(content);
  let galleryHtml = '';
  if (images.length){
    galleryHtml = '<div class="article-inline-gallery">' + images.map(function(u){ return '<img src="' + escapeHtml(u) + '" loading="lazy" alt="">'; }).join('') + '</div>';
  }
  const parts = contentHtml.split('</h2>');
  let withGallery;
  if (images.length && parts.length > 3){
    const mid = Math.floor(parts.length / 2);
    withGallery = parts.slice(0, mid).join('</h2>') + '</h2>' + galleryHtml + parts.slice(mid).join('</h2>');
  } else if (images.length){
    withGallery = galleryHtml + contentHtml;
  } else {
    withGallery = contentHtml;
  }
  const bigImgHtml = mainImage ? '<img src="' + escapeHtml(mainImage) + '" alt="" loading="eager">' : '<div class="article-art"></div>';
  box.innerHTML = '<div class="article-hero">' + bigImgHtml +
    '<div class="article-hero-shade"></div>' +
    '<div class="article-title">' +
      '<span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.9)!important">' + escapeHtml(statusLabel) + '</span>' +
      '<h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;background:none!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9),0 8px 30px rgba(0,0,0,.75)!important">' + escapeHtml(articleTitle) + '</h1>' +
      '<p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important;text-shadow:0 2px 8px rgba(0,0,0,.75)!important">' + escapeHtml(source) + (dateStr ? ' · ' + escapeHtml(dateStr) : '') + '</p>' +
    '</div></div>' +
    '<div class="article-body article-body-full">' +
      (subtitle ? '<p class="article-subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
      withGallery +
      (sourceLink ? '<div class="article-source-link"><b>Источник:</b> <a href="' + escapeHtml(sourceLink) + '" target="_blank" rel="noopener">' + escapeHtml(source) + '</a></div>' : '') +
      '<div class="article-source"><b>Примечание:</b> статья сгенерирована ИИ на основе источника и открытых данных. Для юридически значимых решений проверяйте первоисточник.</div>' +
    '</div>';
};

openArticle = async function(n){
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
  const statusLabel = urgent ? (lang === 'ru' ? 'СРОЧНО · ЗАКОН / ТАМОЖНЯ' : 'URGENT') : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS');

  if (cached){
    renderArticleFull(cached, n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

  const bigImgHtml = img ? '<img src="' + escapeHtml(img) + '" alt="" loading="eager">' : '<div class="article-art"></div>';
  box.innerHTML = '<div class="article-hero">' + bigImgHtml +
    '<div class="article-hero-shade"></div>' +
    '<div class="article-title">' +
      '<span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important">' + escapeHtml(statusLabel) + '</span>' +
      '<h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9)!important">' + escapeHtml(title) + '</h1>' +
      '<p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important">' + escapeHtml(source) + (dateStr ? ' · ' + escapeHtml(dateStr) : '') + '</p>' +
    '</div></div>' +
    '<div class="article-body article-body-full">' +
      (desc ? '<p class="article-subtitle">' + escapeHtml(desc) + '</p>' : '') +
      '<div class="article-inline-progress"><div></div></div>' +
    '</div>';

  try {
    const r = await fetch('/api/news/article', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '', language: lang })
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || 'Не удалось');
    articleMemCache[cacheKey] = d.article;
    renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
  } catch (e) {
    console.warn('Article AI error:', e);
  }
};
'''
    s = s + addition
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: app.js обновлён (таблицы + быстрый рендер)')
