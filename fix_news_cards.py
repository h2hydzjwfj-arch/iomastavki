import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Переписываем renderNewsItems — карточки вместо списка
start = s.find('function renderNewsItems(')
end = s.find('function loadNews(', start)
if start < 0 or end <= start:
    print('❌ renderNewsItems не найден')
    exit()

new_fn = '''function isSuperImportant(n){
  const text = String(n.title||'') + ' ' + String(n.description||'');
  return /(таможен|пошлин|тариф|маркиров|лиценз|запрет|ограничен|обязательн|закон|приказ|постановлен|фнс|фтс|еэк|еаэс|сертификац|декларац|вэд|тн.?вэд|честный знак|вступ.*сил)/i.test(text);
}

function renderNewsItems(items){
  const box = $('#newsList');
  if (!box) return;
  box.innerHTML = '';
  items.forEach(function(n){
    const a = document.createElement('button');
    a.type = 'button';
    const important = isSuperImportant(n);
    a.className = 'news-card' + (important ? ' news-card-important' : '');
    const img = n.image || '';
    const thumb = img
      ? '<div class="news-card-img"><img src="' + escapeHtml(img) + '" alt="" loading="lazy"></div>'
      : '<div class="news-card-img news-card-img-placeholder"><span>✦</span></div>';
    const badge = important ? '<div class="news-card-badge">' + (lang === 'ru' ? '⚠ ВАЖНО' : '⚠ IMPORTANT') + '</div>' : '';
    const shortTitle = String(cleanNewsText(n.title) || '').slice(0, 140);
    a.innerHTML = badge + thumb + '<div class="news-card-body"><div class="news-card-title">' + escapeHtml(shortTitle) + '</div></div>';
    a.onclick = function(){ openArticle(n); };
    box.appendChild(a);
  });
}

'''
s = s[:start] + new_fn + s[end:]
print('OK: renderNewsItems — карточки')

open(p, 'w', encoding='utf-8').write(s)

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

if 'v94: news cards' not in s2:
    s2 += '''

/* ========== v94: news cards ========== */
.news-list{
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 16px !important;
  padding: 18px !important;
  max-height: calc(100svh - 240px) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

.news-card{
  position: relative !important;
  display: block !important;
  text-align: left !important;
  border: 1px solid rgba(55,103,132,.14) !important;
  border-radius: 18px !important;
  overflow: hidden !important;
  background: #ffffff !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease !important;
  box-shadow: 0 8px 24px rgba(38,90,116,.06) !important;
}
.news-card:hover{
  transform: translateY(-4px) !important;
  box-shadow: 0 16px 40px rgba(38,90,116,.14) !important;
  border-color: rgba(45,113,159,.35) !important;
}

.news-card-img{
  width: 100% !important;
  aspect-ratio: 16 / 10 !important;
  overflow: hidden !important;
  background: linear-gradient(135deg, #dceff7, #8ab6ca) !important;
}
.news-card-img img{
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
  transition: transform .35s ease !important;
}
.news-card:hover .news-card-img img{
  transform: scale(1.05) !important;
}
.news-card-img-placeholder{
  display: grid !important;
  place-items: center !important;
  color: #fff !important;
  font-size: 36px !important;
  background: linear-gradient(135deg, #4a8fb5, #2a5f80) !important;
}

.news-card-body{
  padding: 14px 16px 16px !important;
}
.news-card-title{
  font-size: 13.5px !important;
  line-height: 1.45 !important;
  font-weight: 600 !important;
  color: #1e4863 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 3 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

/* ВАЖНАЯ новость — красная рамка + бейдж */
.news-card-important{
  border: 2px solid #d84848 !important;
  box-shadow: 0 8px 24px rgba(216,72,72,.16), 0 0 0 1px rgba(216,72,72,.08) !important;
  animation: newsImportantPulse 2.5s ease-in-out infinite !important;
}
.news-card-important:hover{
  border-color: #c23636 !important;
  box-shadow: 0 16px 40px rgba(216,72,72,.28) !important;
}
@keyframes newsImportantPulse{
  0%, 100% { box-shadow: 0 8px 24px rgba(216,72,72,.16), 0 0 0 1px rgba(216,72,72,.08); }
  50%      { box-shadow: 0 12px 30px rgba(216,72,72,.28), 0 0 0 4px rgba(216,72,72,.12); }
}
.news-card-badge{
  position: absolute !important;
  top: 12px !important;
  left: 12px !important;
  z-index: 3 !important;
  padding: 5px 10px !important;
  border-radius: 8px !important;
  background: #d84848 !important;
  color: #fff !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: .8px !important;
  text-transform: uppercase !important;
  box-shadow: 0 4px 14px rgba(216,72,72,.35) !important;
  animation: newsBadgeFlash 2.5s ease-in-out infinite !important;
}
@keyframes newsBadgeFlash{
  0%, 100% { background: #d84848; }
  50%      { background: #f05858; }
}

/* Тёмная тема */
body.manual-dark .news-card{
  background: linear-gradient(145deg, #0a2a3e, #0e3a52) !important;
  border-color: rgba(130,199,209,.22) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.24) !important;
}
body.manual-dark .news-card:hover{
  border-color: rgba(130,199,209,.5) !important;
  box-shadow: 0 16px 40px rgba(0,0,0,.35) !important;
}
body.manual-dark .news-card-title{ color: #eaf6fa !important; }
body.manual-dark .news-card-important{
  border-color: #d84848 !important;
  box-shadow: 0 8px 24px rgba(216,72,72,.28), 0 0 0 1px rgba(216,72,72,.2) !important;
}

/* Адаптив */
@media(max-width: 1100px){
  .news-list{ grid-template-columns: repeat(2, 1fr) !important; }
}
@media(max-width: 700px){
  .news-list{ grid-template-columns: 1fr !important; padding: 12px !important; }
  .news-card-title{ font-size: 12.5px !important; -webkit-line-clamp: 4 !important; }
}

/* Убираем старые стили для старых элементов */
.news-item, .news-thumb, .news-item-copy { display: none !important; }
'''
    open(p2, 'w', encoding='utf-8').write(s2)
    print('OK: styles.css — карточки новостей')

# Версия
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>94', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>94', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v94')
print('===== ГОТОВО =====')
