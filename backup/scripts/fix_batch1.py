import re

# ==================== APP.JS ====================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# --- 1. Кнопка аудио: добавить orb ---
old_btn = """'<button class="article-audio-btn" id="articlePlayBtn">' +
        '<svg class="audio-play-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
        '<svg class="audio-pause-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>' +
        '<span class="audio-label">Прослушать статью</span>' +
      '</button>'"""
new_btn = """'<button class="article-audio-btn" id="articlePlayBtn">' +
        '<span class="audio-orb-mini" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<svg class="audio-play-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
        '<svg class="audio-pause-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>' +
        '<span class="audio-label">Прослушать статью</span>' +
      '</button>'"""
if 'audio-orb-mini' in s:
    print('SKIP: orb уже есть в HTML кнопки')
elif old_btn in s:
    s = s.replace(old_btn, new_btn, 1)
    print('OK: orb-mini добавлен в HTML кнопки')
else:
    print('WARN: HTML кнопки аудио не найден, пробуем через regex')
    # Пробуем более гибко
    pattern = r'(<button class="article-audio-btn" id="articlePlayBtn">)(<svg class="audio-play-icon")'
    if re.search(pattern, s):
        s = re.sub(pattern, r'\1<span class="audio-orb-mini" aria-hidden="true"><i></i><i></i><i></i></span>\2', s, count=1)
        print('OK: orb-mini добавлен (regex)')

# --- 2. Label "Пауза" -> "Остановить" ---
if "label.textContent = 'Пауза';" in s:
    s = s.replace("label.textContent = 'Пауза';", "label.textContent = 'Остановить';", 1)
    print('OK: label при игре — "Остановить"')

# --- 3. showRecommendation: усиленная проверка ---
old_rec = """async function showRecommendation(name){
 const el=$('#recommendation'); if(!el)return;
 const from=$('#fromCity')?.value?.trim()||'',to=$('#toCity')?.value?.trim()||'',distance=Number($('#distance')?.value)||0;
 if(!from||!to){el.classList.add('hidden');return;}"""
new_rec = """async function showRecommendation(name){
 const el=$('#recommendation'); if(!el)return;
 const from=$('#fromCity')?.value?.trim()||'';
 const to=$('#toCity')?.value?.trim()||'';
 const distance=Number($('#distance')?.value)||0;
 const weight=Number($('#weight')?.value)||0;
 const dims=dimensionsMm();
 const hasCargo=(weight>0)||(dims[0]>0&&dims[1]>0&&dims[2]>0);
 if(!from||!to||!hasCargo){el.classList.add('hidden');return;}"""
if old_rec in s:
    s = s.replace(old_rec, new_rec, 1)
    print('OK: showRecommendation — проверка на груз')
else:
    print('WARN: showRecommendation anchor не найден')

# --- 4. autoDistance: скрывать блок при пустых полях ---
old_ad = "if(!fromText||!toText){$('#distance').value='';$('#distance').dataset.auto='';return}"
new_ad = "if(!fromText||!toText){$('#distance').value='';$('#distance').dataset.auto='';document.getElementById('recommendation')?.classList.add('hidden');return}"
if old_ad in s:
    s = s.replace(old_ad, new_ad, 1)
    print('OK: autoDistance — скрытие блока при пустых полях')
else:
    print('WARN: autoDistance anchor не найден')

# --- 5. Стрелка в agent-import ---
old_imp = '<button class="close-button" data-agent-import-close>×</button>'
new_imp = '<button class="close-button" data-agent-import-close aria-label="Назад" title="Назад"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>'
if 'data-agent-import-close aria-label' in s:
    print('SKIP: стрелка в agent-import уже есть')
elif old_imp in s:
    s = s.replace(old_imp, new_imp, 1)
    print('OK: agent-import — крестик заменён на стрелку')
else:
    print('WARN: agent-import кнопка не найдена')

open(p, 'w', encoding='utf-8').write(s)
print('app.js: было ' + str(orig) + ', стало ' + str(len(s)))

# ==================== STYLES.CSS ====================
p2 = 'styles.css'
s2 = open(p2, 'r', encoding='utf-8').read()

css_add = """

/* ========== Батч 1 ========== */

/* #2: Анимированный круг ChatGPT-style при воспроизведении аудио */
.article-audio-btn .audio-orb-mini{
  display: none;
  width: 24px; height: 24px; border-radius: 50%;
  position: relative;
  background: radial-gradient(circle at 32% 28%, #ffffff 0%, #d6f2fb 18%, #7fc8e5 45%, #2d8eb8 78%, #155a7a 100%);
  box-shadow: 0 0 14px rgba(80,190,225,.55), inset 0 0 5px rgba(255,255,255,.65);
}
.article-audio-btn.playing .audio-orb-mini{ display: inline-block; }
.article-audio-btn.playing .audio-play-icon,
.article-audio-btn.playing .audio-pause-icon{ display: none !important; }
.article-audio-btn .audio-orb-mini::before,
.article-audio-btn .audio-orb-mini::after{
  content: ''; position: absolute; inset: -5px; border-radius: 50%;
  border: 1.5px solid rgba(165,229,255,.72);
  animation: audioOrbRing 1.5s ease-out infinite;
}
.article-audio-btn .audio-orb-mini::after{ animation-delay: .5s; }
.article-audio-btn .audio-orb-mini i{
  position: absolute; border-radius: 50%; background: rgba(255,255,255,.94);
  box-shadow: 0 0 7px rgba(255,255,255,.95);
  animation: audioOrbSpark 1.1s ease-in-out infinite;
}
.article-audio-btn .audio-orb-mini i:nth-child(1){ width: 3px; height: 3px; top: 6px; left: 5px; animation-delay: 0s; }
.article-audio-btn .audio-orb-mini i:nth-child(2){ width: 2.5px; height: 2.5px; top: 13px; right: 4px; animation-delay: .3s; }
.article-audio-btn .audio-orb-mini i:nth-child(3){ width: 2px; height: 2px; bottom: 5px; left: 11px; animation-delay: .6s; }
@keyframes audioOrbRing{
  0%   { transform: scale(.7); opacity: 0; }
  30%  { opacity: .85; }
  100% { transform: scale(1.55); opacity: 0; }
}
@keyframes audioOrbSpark{
  0%, 100% { opacity: .45; transform: scale(.75); }
  50%      { opacity: 1; transform: scale(1.35); }
}

/* #3: картинки новостей — не обрезать голову у людей */
.news-card-img img{
  object-position: center 32% !important;
}

/* #9: кнопка в agent-import — не перекрывает текст */
.agent-import-shell{
  padding: 68px 34px 30px !important;
}
.agent-import-shell .close-button{
  left: 18px !important;
  top: 18px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  background: rgba(235,238,241,.94) !important;
  color: #6e7b84 !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
}
.agent-import-shell .close-button svg{ display: block; width: 18px; height: 18px; }
.agent-import-shell .close-button:hover{
  transform: scale(1.08) !important;
  background: #e3e7ea !important;
  color: #304b5c !important;
}
body.manual-dark .agent-import-shell .close-button{
  background: #0b4760 !important;
  color: #ffe9a1 !important;
  border: 1px solid rgba(125,219,237,.34) !important;
}
"""

s2 += css_add
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: styles.css — блок Батч 1 добавлен')

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>104', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>104', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html -> v104')

print('===== ГОТОВО =====')
