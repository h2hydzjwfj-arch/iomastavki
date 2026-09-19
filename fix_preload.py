import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем старую версию
start = s.find('// ============ Edge TTS через Python')
end = s.find('app.listen(', start)
if start > 0 and end > start:
    s = s[:start] + s[end:]
    print('OK: удалён старый блок Edge TTS')

new_block = '''// ============ Edge TTS с кэшем (Microsoft, Дмитрий) ============
const { execFile } = require('child_process');
const os = require('os');
const cryptoNode = require('crypto');

const EDGE_VOICES = {
  ru: 'ru-RU-DmitryNeural',
  en: 'en-US-GuyNeural',
  zh: 'zh-CN-YunxiNeural',
  tr: 'tr-TR-AhmetNeural'
};

// Кэш: hash -> { buf, at }
const AUDIO_CACHE = new Map();
const AUDIO_CACHE_MAX = 50;
const AUDIO_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 часов

function audioCacheKey(text, voice){
  return cryptoNode.createHash('md5').update(voice + '|' + text).digest('hex');
}

function cacheGet(key){
  const v = AUDIO_CACHE.get(key);
  if (!v) return null;
  if (Date.now() - v.at > AUDIO_CACHE_TTL){ AUDIO_CACHE.delete(key); return null; }
  return v.buf;
}
function cacheSet(key, buf){
  if (AUDIO_CACHE.size >= AUDIO_CACHE_MAX){
    const first = AUDIO_CACHE.keys().next().value;
    if (first) AUDIO_CACHE.delete(first);
  }
  AUDIO_CACHE.set(key, { buf: buf, at: Date.now() });
}

// ВСЕГДА используем python3 -m edge_tts — это работающий вариант
function runEdgeTts(text, voice, outputPath){
  return new Promise(function(resolve, reject){
    execFile('python3', ['-m', 'edge_tts', '--voice', voice, '--rate=-5%', '--text', text, '--write-media', outputPath],
      { timeout: 90000, maxBuffer: 10*1024*1024 },
      function(err, stdout, stderr){
        if (err) return reject(new Error('edge_tts: ' + (stderr || err.message)));
        resolve(outputPath);
      });
  });
}

async function synthesizeWithEdge(text, langCode){
  const voice = EDGE_VOICES[langCode] || EDGE_VOICES.ru;
  const clean = String(text || '')
    .replace(/[#*`>]/g, ' ')
    .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')
    .replace(/\\s+/g, ' ')
    .trim();

  // Проверяем кэш
  const key = audioCacheKey(clean, voice);
  const cached = cacheGet(key);
  if (cached){
    console.log('[edge-tts] CACHE HIT (' + cached.length + ' bytes)');
    return cached;
  }

  // Разбиваем на куски по 1500 символов
  const MAX = 1500;
  const parts = [];
  let rest = clean;
  while (rest.length > 0){
    let cut = Math.min(MAX, rest.length);
    if (cut < rest.length){
      const lastDot = rest.lastIndexOf('. ', cut);
      const lastQ = rest.lastIndexOf('? ', cut);
      const lastEx = rest.lastIndexOf('! ', cut);
      const endPos = Math.max(lastDot, lastQ, lastEx);
      if (endPos > MAX * 0.4) cut = endPos + 1;
    }
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
    if (parts.length > 25) break;
  }

  console.log('[edge-tts] voice=' + voice + ' parts=' + parts.length + ' textLen=' + clean.length);

  const buffers = [];
  const tmpDir = os.tmpdir();
  for (let i = 0; i < parts.length; i++){
    const tmpFile = path.join(tmpDir, 'edge-tts-' + cryptoNode.randomBytes(8).toString('hex') + '.mp3');
    await runEdgeTts(parts[i], voice, tmpFile);
    const buf = fs.readFileSync(tmpFile);
    try { fs.unlinkSync(tmpFile); } catch(e){}
    if (buf.length > 0) buffers.push(buf);
    console.log('[edge-tts] part ' + (i+1) + '/' + parts.length + ' = ' + buf.length + ' bytes');
  }
  const result = Buffer.concat(buffers);
  cacheSet(key, result);
  return result;
}

// Фоновая генерация — запускается из /api/news/article/audio/preload
async function preloadAudioInBackground(text, langCode){
  try {
    const voice = EDGE_VOICES[langCode] || EDGE_VOICES.ru;
    const clean = String(text || '')
      .replace(/[#*`>]/g, ' ')
      .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')
      .replace(/\\s+/g, ' ')
      .trim();
    const key = audioCacheKey(clean, voice);
    if (cacheGet(key)) { console.log('[preload] already cached'); return; }
    console.log('[preload] starting background synth for ' + clean.length + ' chars');
    await synthesizeWithEdge(clean, langCode);
    console.log('[preload] done');
  } catch(e){
    console.warn('[preload] error:', e.message);
  }
}

app.post('/api/news/article/audio', async function(req,res){
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ok:false, error:'Text required'});
  const language = String((req.body && req.body.language) || 'ru').slice(0,2);
  try {
    console.log('[edge-tts] START lang=' + language + ' textLen=' + text.length);
    const buf = await synthesizeWithEdge(text, language);
    if (!buf.length) throw new Error('Пустой результат');
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', String(buf.length));
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buf);
    console.log('[edge-tts] DONE ' + buf.length + ' bytes');
  } catch (e) {
    console.warn('[edge-tts] FAIL:', e.message);
    res.status(502).json({ok:false, error: e.message || 'TTS unavailable'});
  }
});

// Фоновый предзапуск — клиент дёргает это сразу при открытии статьи
app.post('/api/news/article/audio/preload', function(req,res){
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.json({ok:false, error:'Text required'});
  const language = String((req.body && req.body.language) || 'ru').slice(0,2);
  // Не ждём — запускаем в фоне
  preloadAudioInBackground(text, language).catch(function(){});
  res.json({ok:true, started:true});
});

// Проверка готовности — быстро вернуть статус
app.post('/api/news/article/audio/check', function(req,res){
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.json({ok:false, error:'Text required'});
  const language = String((req.body && req.body.language) || 'ru').slice(0,2);
  const voice = EDGE_VOICES[language] || EDGE_VOICES.ru;
  const clean = text.replace(/[#*`>]/g, ' ').replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1').replace(/\\s+/g, ' ').trim();
  const key = audioCacheKey(clean, voice);
  res.json({ok:true, ready: !!cacheGet(key)});
});

'''

s = s.replace('app.listen(', new_block + 'app.listen(')
open(p, 'w', encoding='utf-8').write(s)
print('OK: сервер — Edge TTS с кэшем + фоновый preload')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# Заменяем весь блок playArticleAudio
start_f = s2.find('async function playArticleAudio')
end_f = s2.find('function renderArticleFull', start_f)
if start_f < 0 or end_f <= start_f:
    print('❌ playArticleAudio не найден')
    exit()

new_play = '''let audioPreloadPollers = {};

function articleFullText(a){
  const parts = [];
  if (a.title) parts.push(a.title + '.');
  if (a.subtitle) parts.push(a.subtitle + '.');
  if (a.content) parts.push(String(a.content));
  if (a.podcast) parts.push('Аудио-сценарий. ' + String(a.podcast));
  return parts.join('\\n\\n')
    .replace(/[#*`]/g, '')
    .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim()
    .slice(0, 40000);
}

async function preloadArticleAudio(article, langCode, btn){
  const text = articleFullText(article);
  if (!text || text.length < 40) return;
  const key = 'ap_' + text.slice(0, 50);
  // Отмечаем кнопку как «в подготовке»
  if (btn && !btn.classList.contains('audio-ready')){
    btn.classList.add('audio-preloading');
    const label = btn.querySelector('.audio-label');
    if (label) label.textContent = 'Готовлю в фоне…';
  }
  try {
    await fetch('/api/news/article/audio/preload', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text: text, language: langCode })
    });
  } catch(e){ console.warn('[preload] fetch error:', e.message); }

  // Периодически проверяем готовность
  const startTime = Date.now();
  const maxWaitMs = 120000; // 2 минуты максимум
  if (audioPreloadPollers[key]) clearInterval(audioPreloadPollers[key]);
  audioPreloadPollers[key] = setInterval(async function(){
    if (Date.now() - startTime > maxWaitMs){
      clearInterval(audioPreloadPollers[key]);
      audioPreloadPollers[key] = null;
      if (btn){
        btn.classList.remove('audio-preloading');
        const label = btn.querySelector('.audio-label');
        if (label) label.textContent = 'Прослушать статью';
      }
      return;
    }
    try {
      const r = await fetch('/api/news/article/audio/check', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ text: text, language: langCode })
      });
      const d = await r.json();
      if (d.ready){
        clearInterval(audioPreloadPollers[key]);
        audioPreloadPollers[key] = null;
        if (btn){
          btn.classList.remove('audio-preloading');
          btn.classList.add('audio-ready');
          const label = btn.querySelector('.audio-label');
          if (label) label.textContent = 'Прослушать статью';
        }
      }
    } catch(e){}
  }, 2000);
}

async function playArticleAudio(article, langCode, btn){
  if (btn.classList.contains('playing')){ stopAudioPlayback(); return; }
  stopAudioPlayback();
  currentPlayBtn = btn;
  btn.classList.add('playing');
  const label = btn.querySelector('.audio-label');
  if (label) label.textContent = 'Подготовка…';

  const text = articleFullText(article);

  try {
    const r = await fetch('/api/news/article/audio', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text: text, language: langCode })
    });
    if (r.ok){
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioPlayer = audio;
      audio.onended = stopAudioPlayback;
      audio.onerror = stopAudioPlayback;
      await audio.play();
      if (label) label.textContent = 'Пауза';
      return;
    }
    let errMsg = 'Ошибка озвучки';
    try { const j = await r.json(); errMsg = j.error || errMsg; } catch(e){}
    console.warn('[audio] server error:', errMsg);
    if (label) label.textContent = 'Ошибка озвучки';
    setTimeout(function(){ if(label) label.textContent = 'Прослушать статью'; }, 3000);
    btn.classList.remove('playing');
    currentPlayBtn = null;
  } catch(e){
    console.warn('[audio] fetch error:', e.message);
    if (label) label.textContent = 'Ошибка соединения';
    setTimeout(function(){ if(label) label.textContent = 'Прослушать статью'; }, 3000);
    btn.classList.remove('playing');
    currentPlayBtn = null;
  }
}

'''
s2 = s2[:start_f] + new_play + s2[end_f:]
print('OK: playArticleAudio + preload')

# В renderArticleFull — запускаем preload после отрисовки
old_hook = '''  const playBtn = document.getElementById('articlePlayBtn');
  if (playBtn){
    playBtn.addEventListener('click', function(){ playArticleAudio(a, lang, playBtn); });
  }'''

new_hook = '''  const playBtn = document.getElementById('articlePlayBtn');
  if (playBtn){
    playBtn.addEventListener('click', function(){ playArticleAudio(a, lang, playBtn); });
    // АВТОПРЕДЗАГРУЗКА: как только статья отрисована — запускаем генерацию в фоне
    setTimeout(function(){ preloadArticleAudio(a, lang, playBtn); }, 300);
  }'''

if old_hook in s2:
    s2 = s2.replace(old_hook, new_hook)
    print('OK: автопредзагрузка при открытии статьи')
else:
    print('WARN: не нашёл точку подключения preload')

open(p2, 'w', encoding='utf-8').write(s2)

# ==================== STYLES.CSS ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

if 'v60: audio preloading' not in s3:
    s3 += '''

/* v60: audio preloading states */
.article-audio-btn.audio-preloading{
  background:linear-gradient(135deg,#8ba8b9,#6a8a9c) !important;
  cursor:wait !important;
}
.article-audio-btn.audio-ready::before{
  content:"";
  display:inline-block;
  width:8px;height:8px;
  border-radius:50%;
  background:#7fdd8a;
  box-shadow:0 0 8px rgba(127,221,138,.9);
  margin-right:4px;
  animation:audioReadyPulse 1.8s ease-in-out infinite;
}
@keyframes audioReadyPulse{
  0%,100%{ opacity:1; transform:scale(1); }
  50%{ opacity:.6; transform:scale(.85); }
}
'''
    open(p3, 'w', encoding='utf-8').write(s3)
    print('OK: стили audio preloading')

# ==================== INDEX.HTML ====================
p4 = 'index.html'
s4 = open(p4, 'r', encoding='utf-8').read()
s4 = re.sub(r'(styles\\.css\\?v=\\d{8}-v)\\d+', r'\\g<1>60', s4)
s4 = re.sub(r'(app\\.js\\?v=\\d{8}-v)\\d+', r'\\g<1>60', s4)
open(p4, 'w', encoding='utf-8').write(s4)
print('OK: index.html → v60')
print('===== ВСЁ ГОТОВО =====')
