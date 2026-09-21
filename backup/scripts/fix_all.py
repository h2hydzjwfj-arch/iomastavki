p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# 1) Удаляем хвост от fix_tables.py
v43 = s.find('/* v43: таблицы в статьях */')
if v43 > 0:
    s = s[:v43].rstrip() + '\n'
    print('OK: удалён хвост fix_tables.py')

# 2) Заменяем блок статей
start = s.find('let articleMemCache')
end = s.find('function applyWeatherVisual', start)

if start < 0 or end <= start:
    print('FAIL: маркеры не найдены')
else:
    new_block = r'''let articleMemCache = {};

function mdToHtmlArticle(text){
  let html = escapeHtml(text);
  html = html.replace(/^### (.*)$/gm, '___H3___$1___/H3___');
  html = html.replace(/^## (.*)$/gm, '___H2___$1___/H2___');
  html = html.replace(/^# (.*)$/gm, '___H1___$1___/H1___');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const lines = html.split('\n');
  const blocks = [];
  let buf = [];
  let inTable = false;
  let tableBuf = [];

  function flush(){
    if (buf.length){
      const t = buf.join('\n').trim();
      if (t) blocks.push({type:'text', text: t});
      buf = [];
    }
  }
  function flushTable(){
    if (tableBuf.length){
      blocks.push({type:'table', rows: tableBuf.slice()});
      tableBuf = [];
    }
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
  flush();
  flushTable();

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
    const text = b.text;
    const paras = text.split(/\n\s*\n/);
    for (let p of paras){
      p = p.trim();
      if (!p) continue;
      if (/^___H[123]___/.test(p)){
        out.push(p.replace(/___H3___/g, '<h3>').replace(/___\/H3___/g, '</h3>')
                    .replace(/___H2___/g, '<h2>').replace(/___\/H2___/g, '</h2>')
                    .replace(/___H1___/g, '<h1>').replace(/___\/H1___/g, '</h1>'));
        continue;
      }
      if (/^[-–—]\s/.test(p)){
        const items = p.split('\n').map(function(l){return l.replace(/^[-–—]\s*/, '').trim();}).filter(Boolean);
        out.push('<ul>' + items.map(function(i){return '<li>' + i + '</li>';}).join('') + '</ul>');
        continue;
      }
      out.push('<p>' + p.replace(/\n/g, '<br>') + '</p>');
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
      (sourceLink ? '<div class="article-source-link"><b>Источник:</b> <a href="' + escapeHtml(sourceLink) + '" target="_blank" rel="noopener">' + escapeHtml(source) + '</a></div>' : '') +
      '<div class="article-source"><b>Примечание:</b> статья сгенерирована ИИ на основе источника. Для юридически значимых решений проверяйте первоисточник.</div>' +
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
  const cacheKey = normalizeText(title);
  const cached = articleMemCache[cacheKey];
  const statusLabel = urgent ? 'СРОЧНО · ЗАКОН / ТАМОЖНЯ' : 'ЛОГИСТИКА / РЫНОК';

  if (cached){
    renderArticleFull(cached, n, urgent, source, title, dateStr, img, statusLabel);
    return;
  }

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
    renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
  } catch (e) {
    console.warn('Article AI error:', e);
  }
}

function renderArticleFallback(){ /* не используется */ }

'''
    s = s[:start] + new_block + s[end:]
    open(p, 'w', encoding='utf-8').write(s)
    print('OK: блок статей заменён на полную версию')
