import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Добавляем stripSourceFromTitle если нет
if 'function stripSourceFromTitle' not in s:
    anchor = s.find('function cleanNewsText') 
    if anchor < 0: anchor = s.find('function escapeHtml')
    if anchor < 0: anchor = s.find('function tr(')
    block = '''function stripSourceFromTitle(t){
  let x = String(t||'').trim();
  x = x.replace(/\\s+[-–—]\\s+[A-Za-zА-Яа-яЁё][\\w\\.\\-]*\\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\\.[a-z]{2})?\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[A-Z][a-zA-Z]+(?:[\\s\\-][A-Z][a-zA-Z]+){0,2}\\s*$/i, '');
  x = x.replace(/\\s+[-–—]\\s+[А-ЯЁ][а-яё]+(?:[\\s\\-][А-ЯЁ][а-яё]+){0,2}\\s*$/i, '');
  return x.trim();
}

'''
    if anchor > 0:
        s = s[:anchor] + block + s[anchor:]
        print('OK: stripSourceFromTitle добавлена')

# 2. Заменяем openArticle + добавляем mdToHtmlArticle + renderArticleFull
start = s.find('async function openArticle')
end = s.find('function renderArticleFallback', start)
if end < 0:
    end = s.find('function applyWeatherVisual', start)
if end < 0:
    end = s.find('function showTarot', start)

if start < 0 or end <= start:
    print('❌ openArticle не найден — попробую другой вариант')
    # Ищем просто "function openArticle" без async
    start = s.find('function openArticle')
    end = s.find('function applyWeatherVisual', start)
    if start < 0 or end <= start:
        print('❌ Не нашёл границы — придётся применить другой подход')
        exit()

print('OK: заменим openArticle с ' + str(start) + ' до ' + str(end))

new_block = '''let articleMemCache = {};

function mdToHtmlArticle(text){
  let html = String(text||'');
  html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  html = html.replace(/^### (.*)$/gm, '{{{H3}}}$1{{{/H3}}}');
  html = html.replace(/^## (.*)$/gm, '{{{H2}}}$1{{{/H2}}}');
  html = html.replace(/^# (.*)$/gm, '{{{H1}}}$1{{{/H1}}}');
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\\*([^*\\n]+?)\\*(?!\\*)/g, '$1<em>$2</em>');
  html = html.replace(/\\[(.+?)\\]\\((https?:\\/\\/[^\\)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = html.split('\\n');
  const blocks = [];
  let buf = [];
  let inTable = false;
  let tableBuf = [];
  function flush(){ if (buf.length){ const t = buf.join('\\n').trim(); if (t) blocks.push({type:'text', text:t}); buf = []; } }
  function flushTable(){ if (tableBuf.length){ blocks.push({type:'table', rows:tableBuf.slice()}); tableBuf = []; } inTable = false; }
  for (const line of lines){
    const trimmed = line.trim();
    if (/^\\|.*\\|/.test(trimmed)){ if (!inTable){ flush(); inTable = true; } tableBuf.push(trimmed); continue; }
    if (inTable) flushTable();
    buf.push(line);
  }
  flush(); flushTable();
  const out = [];
  for (const b of blocks){
    if (b.type === 'table'){
      const rows = b.rows; if (rows.length < 2) continue;
      const parseCells = function(line){ let l = line; if (l.startsWith('|')) l = l.slice(1); if (l.endsWith('|')) l = l.slice(0, -1); return l.split('|').map(function(x){return x.trim();}); };
      const headers = parseCells(rows[0]);
      let dataStart = 1;
      if (rows.length > 1 && /^[\\s\\-:|]+$/.test(rows[1].replace(/\\|/g, ''))) dataStart = 2;
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
    const paras = text.split(/\\n\\s*\\n/);
    for (let para of paras){
      para = para.trim();
      if (!para) continue;
      if (/^\\{\\{\\{H[123]\\}\\}\\}/.test(para)){
        out.push(para.replace(/\\{\\{\\{H3\\}\\}\\}/g, '<h3>').replace(/\\{\\{\\{\\/H3\\}\\}\\}/g, '</h3>')
                     .replace(/\\{\\{\\{H2\\}\\}\\}/g, '<h2>').replace(/\\{\\{\\{\\/H2\\}\\}\\}/g, '</h2>')
                     .replace(/\\{\\{\\{H1\\}\\}\\}/g, '<h1>').replace(/\\{\\{\\{\\/H1\\}\\}\\}/g, '</h1>')
                     .replace(/\\n/g, '<br>'));
        continue;
      }
      if (/^[-–—•]\\s/m.test(para)){
        const items = para.split('\\n').map(function(l){return l.replace(/^[-–—•]\\s*/, '').trim();}).filter(Boolean);
        out.push('<ul>' + items.map(function(i){return '<li>' + i + '</li>';}).join('') + '</ul>');
        continue;
      }
      out.push('<p>' + para.replace(/\\n/g, '<br>') + '</p>');
    }
  }
  return out.join('');
}

function renderArticleFull(a, n, urgent, source, title, dateStr, img, statusLabel){
  const box = $('#articleContent');
  const articleTitle = stripSourceFromTitle(cleanNewsText(a.title || title));
  const subtitle = cleanNewsText(a.subtitle || '');
  const content = String(a.content || '');
  const mainImage = a.image || img;
  const sourceLink = n.link || '';
  const contentHtml = mdToHtmlArticle(content);
  const bigImgHtml = mainImage ? '<img src="' + escapeHtml(mainImage) + '" alt="" loading="eager">' : '<div class="article-art"></div>';
  const audioBtnHtml = content.length > 40 ? (
    '<div class="article-audio-block">' +
      '<div class="article-audio-icon">🎧</div>' +
      '<div class="article-audio-text">' +
        '<div class="article-audio-title">Аудиоверсия статьи</div>' +
        '<div class="article-audio-sub">Голос Дмитрий · ' + Math.max(1, Math.round(content.length/900)) + ' мин</div>' +
      '</div>' +
      '<button class="article-audio-btn" id="articlePlayBtn">' +
        '<svg class="audio-play-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
        '<svg class="audio-pause-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>' +
        '<span class="audio-label">Прослушать статью</span>' +
      '</button>' +
    '</div>'
  ) : '';
  box.innerHTML = '<div class="article-hero">' + bigImgHtml +
    '<div class="article-hero-shade"></div>' +
    '<div class="article-title">' +
      '<span class="eyebrow" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.9)!important">' + escapeHtml(statusLabel) + '</span>' +
      '<h1 style="color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;background:none!important;text-shadow:0 2px 4px rgba(0,0,0,.98),0 4px 16px rgba(0,0,0,.9),0 8px 30px rgba(0,0,0,.75)!important">' + escapeHtml(articleTitle) + '</h1>' +
      '<p style="color:rgba(255,255,255,.94)!important;-webkit-text-fill-color:rgba(255,255,255,.94)!important;text-shadow:0 2px 8px rgba(0,0,0,.75)!important">' + escapeHtml(source) + (dateStr ? ' · ' + escapeHtml(dateStr) : '') + '</p>' +
    '</div></div>' +
    '<div class="article-body article-body-full">' +
      (subtitle ? '<p class="article-subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
      audioBtnHtml +
      contentHtml +
      (sourceLink ? '<div class="article-source-link"><b>Источник:</b> <a href="' + escapeHtml(sourceLink) + '" target="_blank" rel="noopener">' + escapeHtml(source) + '</a></div>' : '') +
      '<div class="article-source">Материал подготовлен ИИ. Проверяйте первоисточник.</div>' +
    '</div>';
  const btn = document.getElementById('articlePlayBtn');
  if (btn) btn.addEventListener('click', function(){ playArticleAudio(a, lang, btn); });
}

let currentAudioPlayer = null;
let currentPlayBtn = null;
function stopAudioPlayback(){
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  if (currentAudioPlayer){ try { currentAudioPlayer.pause(); } catch(e){} currentAudioPlayer = null; }
  if (currentPlayBtn){ currentPlayBtn.classList.remove('playing'); const t = currentPlayBtn.querySelector('.audio-label'); if (t) t.textContent = 'Прослушать статью'; currentPlayBtn = null; }
}

async function playArticleAudio(article, langCode, btn){
  if (btn.classList.contains('playing')){ stopAudioPlayback(); return; }
  stopAudioPlayback();
  currentPlayBtn = btn;
  btn.classList.add('playing');
  const label = btn.querySelector('.audio-label');
  if (label) label.textContent = 'Готовлю…';
  const text = String(article.content || article.subtitle || article.title || '').replace(/[#*`]/g,'').slice(0, 40000);
  try {
    const r = await fetch('/api/news/article/audio', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: text, language: langCode })
    });
    if (r.ok){
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioPlayer = audio;
      audio.onended = stopAudioPlayback;
      await audio.play();
      if (label) label.textContent = 'Пауза';
      return;
    }
    let err = 'Ошибка'; try { const j = await r.json(); err = j.error||err; } catch(e){}
    if (label) label.textContent = err;
    setTimeout(stopAudioPlayback, 3000);
  } catch(e){
    if (label) label.textContent = 'Ошибка соединения';
    setTimeout(stopAudioPlayback, 3000);
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

  const cacheKey = normalizeText(title);
  if (articleMemCache[cacheKey]){
    renderArticleFull(articleMemCache[cacheKey], n, urgent, source, title, dateStr, img, statusLabel);
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
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title: title, description: desc, source: source, link: n.link || '', language: lang })
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || 'Не удалось');
    articleMemCache[cacheKey] = d.article;
    renderArticleFull(d.article, n, urgent, source, title, dateStr, img, statusLabel);
  } catch(e){
    box.innerHTML += '<p style="color:#a94d4d;padding:20px;text-align:center">Ошибка: ' + escapeHtml(e.message) + '</p>';
  }
}

'''
s = s[:start] + new_block + s[end:]
print('OK: openArticle + renderArticleFull + mdToHtmlArticle + playArticleAudio')
open(p, 'w', encoding='utf-8').write(s)

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()
if 'v82: article content' not in s2:
    s2 += '''

/* v82: article content */
.article-inline-progress{margin:30px 0;height:3px;border-radius:2px;background:rgba(55,103,132,.1);overflow:hidden;position:relative}
.article-inline-progress > div{height:100%;width:35%;background:linear-gradient(90deg,transparent,#287fa8,transparent);animation:artProg 1.4s linear infinite;position:absolute;top:0;left:0}
@keyframes artProg{0%{transform:translateX(-100%)}100%{transform:translateX(380%)}}
.article-body-full{max-width:1100px !important;padding:44px 40px 80px !important;font-size:16.5px !important;line-height:1.85 !important;margin:0 auto}
.article-body-full p{font-size:16.5px !important;line-height:1.85 !important;margin:0 0 18px !important}
.article-body-full h1{font-size:30px !important;margin:32px 0 16px !important;color:#123c53 !important;font-weight:700 !important}
.article-body-full h2{font-size:24px !important;margin:38px 0 14px !important;color:#123c53 !important;font-weight:700 !important;padding-bottom:8px;border-bottom:1px solid rgba(55,103,132,.14)}
.article-body-full h3{font-size:19px !important;margin:26px 0 10px !important;color:#1c5877 !important;font-weight:700 !important}
.article-body-full ul{margin:0 0 18px 22px !important;padding:0 !important;list-style:none !important}
.article-body-full ul li{position:relative;padding-left:22px;margin:8px 0;font-size:16px;line-height:1.75}
.article-body-full ul li:before{content:"▪";position:absolute;left:0;color:#287fa8;font-size:18px;line-height:1.4}
.article-body-full a{color:#1c6f95;text-decoration:none;border-bottom:1px solid rgba(28,111,149,.3)}
.article-body-full strong{color:#123c53;font-weight:700}
.article-subtitle{font-size:18px !important;color:#4d6c7c !important;font-style:italic !important;margin-bottom:28px !important;padding-left:18px;border-left:3px solid #287fa8;max-width:none !important}
.article-table-wrap{overflow-x:auto;margin:22px 0;border-radius:14px;border:1px solid rgba(55,103,132,.13)}
.article-table{width:100%;border-collapse:collapse;font-size:14px;background:#fff}
.article-table th{background:#eef7fa;color:#1e4863;font-weight:700;text-align:left;padding:13px 14px;font-size:12px;border-bottom:1px solid rgba(55,103,132,.14)}
.article-table td{padding:12px 14px;border-bottom:1px solid rgba(55,103,132,.08);color:#2c4a5e;vertical-align:top;line-height:1.55}
.article-table tr:last-child td{border-bottom:0}
.article-table tr:hover td{background:#f6fbfd}
.article-audio-block{display:flex;align-items:center;gap:16px;margin:8px 0 32px 0;padding:18px 22px;border-radius:18px;background:linear-gradient(135deg,#eaf6fb,#f4fbfd);border:1px solid rgba(55,103,132,.12);box-shadow:0 10px 30px rgba(38,90,116,.07)}
.article-audio-icon{flex:0 0 48px;width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#3d9ec7,#227eaa);color:#fff;display:grid;place-items:center;font-size:22px;box-shadow:0 8px 22px rgba(45,113,159,.28)}
.article-audio-text{flex:1;min-width:0}
.article-audio-title{font-size:15px;font-weight:700;color:#1e4863;margin-bottom:2px}
.article-audio-sub{font-size:11.5px;color:#6f8896}
.article-audio-btn{flex:0 0 auto;display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 22px;border:0;border-radius:14px;background:linear-gradient(135deg,#3d9ec7,#227eaa);color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 10px 26px rgba(45,113,159,.24);transition:transform .2s ease}
.article-audio-btn:hover{transform:translateY(-2px)}
.article-audio-btn .audio-pause-icon{display:none}
.article-audio-btn.playing .audio-play-icon{display:none}
.article-audio-btn.playing .audio-pause-icon{display:block}
.article-audio-btn.playing{background:linear-gradient(135deg,#e17055,#c0392b)}
.article-source-link{margin:32px 0 16px;padding:16px 18px;background:linear-gradient(135deg,#eef7fa,#f7fbfd);border:1px solid rgba(55,103,132,.1);border-radius:14px;font-size:13px;color:#3d6072}
.article-source-link a{color:#1c6f95;font-weight:600;word-break:break-all}

/* Тёмная тема */
body.manual-dark .article-body-full h1,body.manual-dark .article-body-full h2{color:#f1faff !important;border-bottom-color:rgba(130,199,209,.2) !important}
body.manual-dark .article-body-full h3{color:#c9ecf5 !important}
body.manual-dark .article-body-full p,body.manual-dark .article-body-full li{color:#d8eaf0 !important}
body.manual-dark .article-body-full strong{color:#fff !important}
body.manual-dark .article-subtitle{color:#c9dde4 !important}
body.manual-dark .article-table{background:#0a2940}
body.manual-dark .article-table th{background:#0f4059;color:#d6f3f8;border-bottom-color:rgba(130,199,209,.2)}
body.manual-dark .article-table td{color:#d8eaf0;border-bottom-color:rgba(130,199,209,.1)}
body.manual-dark .article-audio-block{background:linear-gradient(135deg,#0d3b50,#104f63);border-color:rgba(130,199,209,.22)}
body.manual-dark .article-audio-title{color:#f1faff}
body.manual-dark .article-audio-sub{color:#9fc2d0}
body.manual-dark .article-source-link{background:linear-gradient(135deg,#0b3a4c,#104a5e);border-color:rgba(130,199,209,.2);color:#c9dde4}

@media(max-width:700px){
  .article-body-full{padding:28px 20px 60px !important;font-size:15.5px !important}
  .article-body-full p{font-size:15.5px !important}
  .article-body-full h2{font-size:20px !important}
  .article-audio-block{flex-wrap:wrap;padding:16px}
  .article-audio-btn{width:100%;justify-content:center;height:44px}
}
'''
    open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: стили статьи (таблицы, аудио, тёмная тема)')

# Версия
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>82', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>82', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v82')
print('===== ГОТОВО =====')
