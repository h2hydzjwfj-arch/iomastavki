p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем блок статей от прошлых версий
start = s.find('let articleMemCache')
end = s.find('function applyWeatherVisual', start)

if start < 0 or end <= start:
    print('FAIL: маркеры не найдены')
else:
    new_block = r'''let articleMemCache = {};
let articleMemLang = {};

function mdToHtmlArticle(text){
  let html = String(text || '');
  // Экранируем HTML
  html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Заголовки
  html = html.replace(/^### (.*)$/gm, '{{{H3}}}$1{{{/H3}}}');
  html = html.replace(/^## (.*)$/gm, '{{{H2}}}$1{{{/H2}}}');
  html = html.replace(/^# (.*)$/gm, '{{{H1}}}$1{{{/H1}}}');
  // Жирный/курсив
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  // Ссылки
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const lines = html.split('\n');
  const blocks = [];
  let buf = [];
  let inTable = false;
  let tableBuf = [];

  function flush(){
    if (buf.length){ const t = buf.join('\n').trim(); if (t) blocks.push({type:'text', text:t}); buf = []; }
  }
  function flushTable(){
    if (tableBuf.length){ blocks.push({type:'table', rows:tableBuf.slice()}); tableBuf = []; }
    inTable = false;
  }

  for (const line of lines){
    const trimmed = line.trim();
    if (/^\|.*\|/.test(trimmed)){
      if (!inTable){ flush(); inTable = true; }
      tableBuf.push(trimmed);
      continue;
    }
    if (inTable) flushTable();
    buf.push(line);
  }
  flush(); flushTable();

  const out = [];
  for (const b of blocks){
    if (b.type === 'table'){
      const rows = b.rows;
      if (rows.length < 2) continue;
      const parseCells = function(line){
        let l = line;
        if (l.startsWith('|')) l = l.slice(1);
        if (l.endsWith('|')) l = l.slice(0, -1);
        return l.split('|').map(function(x){return x.trim();});
      };
      const headers = parseCells(rows[0]);
      let dataStart = 1;
      if (rows.length > 1 && /^[\s\-:|]+$/.test(rows[1].replace(/\|/g, ''))){
        dataStart = 2;
      }
      let t = '<div class="article-table-wrap"><table class="article-table"><thead><tr>';
      headers.forEach(function(h){ t += '<th>' + h + '</th>'; });
      t += '</tr></thead><tbody>';
      for (let i = dataStart; i < rows.length; i++){
        const cells = parseCells(rows[i]);
        t += '<tr>';
        headers.forEach(function(_, j){ t += '<td>' + (cells[j] || '') + '</td>'; });
        t += '</tr>';
      }
      t += '</tbody></table></div>';
      out.push(t);
      continue;
    }
    // Текстовый блок — разбиваем по двойным переносам
    const text = b.text;
    const paras = text.split(/\n\s*\n/);
    for (let para of paras){
      para = para.trim();
      if (!para) continue;
      // Заголовки
      if (/^\{\{\{H[123]\}\}\}/.test(para)){
        out.push(para.replace(/\{\{\{H3\}\}\}/g, '<h3>').replace(/\{\{\{\/H3\}\}\}/g, '</h3>')
                     .replace(/\{\{\{H2\}\}\}/g, '<h2>').replace(/\{\{\{\/H2\}\}\}/g, '</h2>')
                     .replace(/\{\{\{H1\}\}\}/g, '<h1>').replace(/\{\{\{\/H1\}\}\}/g, '</h1>')
                     .replace(/\n/g, '<br>'));
        continue;
      }
      // Список
      if (/^[-–—•]\s/m.test(para)){
        const items = para.split('\n').map(function(l){return l.replace(/^[-–—•]\s*/, '').trim();}).filter(Boolean);
        out.push('<ul>' + items.map(function(i){return '<li>' + i + '</li>';}).join('') + '</ul>');
        continue;
      }
      // Нумерованный список
      if (/^\d+\.\s/.test(para) && para.split('\n').length > 1){
        const items = para.split('\n').map(function(l){return l.replace(/^\d+\.\s*/, '').trim();}).filter(Boolean);
        out.push('<ol>' + items.map(function(i){return '<li>' + i + '</li>';}).join('') + '</ol>');
        continue;
      }
      out.push('<p>' + para.replace(/\n/g, '<br>') + '</p>');
    }
  }
  return out.join('');
}

function renderArticleFull(a, n, urgent, source, title, dateStr, img, statusLabel){
  const box = $('#articleContent');
  const articleTitle = cleanNewsText(a.title || title);
  const subtitle = cleanNewsText(a.subtitle || '');
  const content = String(a.content || '');
  const mainImage = a.image || img;
  const sourceLink = n.link || '';
  const contentHtml = mdToHtmlArticle(content);
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
      contentHtml +
      (sourceLink ? '<div class="article-source-link"><b>Source:</b> <a href="' + escapeHtml(sourceLink) + '" target="_blank" rel="noopener">' + escapeHtml(source) + '</a></div>' : '') +
      '<div class="article-source">AI-generated summary. Проверяйте первоисточник.</div>' +
    '</div>';
}

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
  const statusLabel = urgent ? 'СРОЧНО' : (lang === 'ru' ? 'ЛОГИСТИКА / РЫНОК' : 'LOGISTICS / MARKET');

  const cacheKey = normalizeText(title);
  const cached = articleMemCache[cacheKey];
  const cachedLang = articleMemLang[cacheKey];

  // Если есть кэш и язык совпадает — показать сразу
  if (cached && cachedLang === lang){
    renderArticleFull(cached, n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

  // Показываем обложку пока грузится статья
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
    box.innerHTML += '<p style="color:#a94d4d;padding:20px;text-align:center">Ошибка генерации: ' + escapeHtml(e.message) + '</p>';
  }
}

'''
    s = s[:start] + new_block + s[end:]
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: app.js — блок статей полностью переписан')
