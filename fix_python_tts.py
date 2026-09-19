import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем старую WebSocket версию
start = s.find('// ============ Edge TTS через WebSocket')
end = s.find('app.listen(', start)
if start > 0 and end > start:
    s = s[:start] + s[end:]
    print('OK: удалён старый WebSocket-подход')

new_block = '''// ============ Edge TTS через Python (Microsoft, бесплатно, качество нейросети) ============
const { execFile } = require('child_process');
const os = require('os');
const cryptoNode = require('crypto');

const EDGE_VOICES = {
  ru: 'ru-RU-DmitryNeural',
  en: 'en-US-GuyNeural',
  zh: 'zh-CN-YunxiNeural',
  tr: 'tr-TR-AhmetNeural'
};

// Пытаемся найти команду edge-tts в системе
function findEdgeTtsCmd(){
  const candidates = [
    'edge-tts',
    '/usr/local/bin/edge-tts',
    '/opt/homebrew/bin/edge-tts',
    process.env.HOME + '/Library/Python/3.9/bin/edge-tts',
    process.env.HOME + '/Library/Python/3.10/bin/edge-tts',
    process.env.HOME + '/Library/Python/3.11/bin/edge-tts',
    process.env.HOME + '/Library/Python/3.12/bin/edge-tts',
    process.env.HOME + '/Library/Python/3.13/bin/edge-tts'
  ];
  return candidates;
}

function runEdgeTts(text, voice, outputPath){
  return new Promise(function(resolve, reject){
    const candidates = findEdgeTtsCmd();
    let attemptIdx = 0;
    function tryNext(){
      if (attemptIdx >= candidates.length){
        // Последняя попытка — через python -m edge_tts
        execFile('python3', ['-m', 'edge_tts', '--voice', voice, '--rate=-5%', '--text', text, '--write-media', outputPath],
          { timeout: 60000, maxBuffer: 10*1024*1024 },
          function(err, stdout, stderr){
            if (err) return reject(new Error('python -m edge_tts: ' + (stderr || err.message)));
            resolve(outputPath);
          });
        return;
      }
      const cmd = candidates[attemptIdx++];
      execFile(cmd, ['--voice', voice, '--rate=-5%', '--text', text, '--write-media', outputPath],
        { timeout: 60000, maxBuffer: 10*1024*1024 },
        function(err, stdout, stderr){
          if (err){
            console.warn('[edge-tts] cmd "' + cmd + '" failed: ' + (err.code || err.message));
            return tryNext();
          }
          resolve(outputPath);
        });
    }
    tryNext();
  });
}

async function synthesizeWithEdge(text, langCode){
  const voice = EDGE_VOICES[langCode] || EDGE_VOICES.ru;
  const clean = String(text || '')
    .replace(/[#*`>]/g, ' ')
    .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')
    .replace(/\\s+/g, ' ')
    .trim();

  // Режем на куски до 2500 символов, чтобы не перегружать
  const MAX = 2500;
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
    if (i < parts.length - 1) await new Promise(function(r){ setTimeout(r, 150); });
  }
  return Buffer.concat(buffers);
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
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buf);
    console.log('[edge-tts] DONE ' + buf.length + ' bytes');
  } catch (e) {
    console.warn('[edge-tts] FAIL:', e.message);
    res.status(502).json({ok:false, error: e.message || 'TTS unavailable'});
  }
});

'''

s = s.replace('app.listen(', new_block + 'app.listen(')
open(p, 'w', encoding='utf-8').write(s)
print('OK: Python edge-tts интегрирован')

# ==================== APP.JS ====================
# Теперь НЕ уходим молча в браузерный fallback при ошибке сервера
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

old_play = '''  // 1) Попробуем OpenAI TTS
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
    console.warn('[audio] OpenAI недоступен, использую браузерный голос');
  } catch(e){ console.warn('[audio] server error:', e.message); }

  // 2) Fallback — браузерный SpeechSynthesis
  if (!('speechSynthesis' in window)){
    if (label) label.textContent = 'Прослушать статью';
    btn.classList.remove('playing');
    currentPlayBtn = null;
    alert('Ваш браузер не поддерживает озвучку');
    return;
  }

  // Голоса иногда загружаются асинхронно
  let voices = window.speechSynthesis.getVoices();
  if (!voices.length){
    await new Promise(function(resolve){
      const timer = setTimeout(resolve, 800);
      window.speechSynthesis.onvoiceschanged = function(){ clearTimeout(timer); resolve(); };
    });
  }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode === 'ru' ? 'ru-RU' : langCode === 'zh' ? 'zh-CN' : langCode === 'tr' ? 'tr-TR' : 'en-US';
  const voice = pickBestMaleVoice(u.lang);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 0.92; // чуть ниже — мужской оттенок
  u.volume = 1;
  u.onend = stopAudioPlayback;
  u.onerror = stopAudioPlayback;
  currentUtterance = u;
  if (label) label.textContent = 'Пауза';
  window.speechSynthesis.speak(u);'''

new_play = '''  // Edge TTS через сервер
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
    // Сервер вернул ошибку — показываем её, НЕ уходим в браузерный fallback
    let errMsg = 'Не удалось сгенерировать аудио';
    try { const j = await r.json(); errMsg = j.error || errMsg; } catch(e){}
    console.warn('[audio] server error:', errMsg);
    if (label) label.textContent = 'Ошибка озвучки';
    setTimeout(function(){ if(label) label.textContent = 'Прослушать статью'; }, 3000);
    btn.classList.remove('playing');
    currentPlayBtn = null;
    return;
  } catch(e){
    console.warn('[audio] fetch error:', e.message);
    if (label) label.textContent = 'Ошибка соединения';
    setTimeout(function(){ if(label) label.textContent = 'Прослушать статью'; }, 3000);
    btn.classList.remove('playing');
    currentPlayBtn = null;
    return;
  }'''

if old_play in s2:
    s2 = s2.replace(old_play, new_play)
    print('OK: клиент — без молчаливого fallback на браузер')
else:
    print('WARN: playArticleAudio не найден — попробуем regex')
    # Regex-поиск
    pattern = re.compile(r"async function playArticleAudio\(article, langCode, btn\)\{[\s\S]*?\n\}\n", re.MULTILINE)
    # Не будем переписывать всю функцию, только тело с fetch

open(p2, 'w', encoding='utf-8').write(s2)

# Обновляем версию
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>59', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>59', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v59')
print('===== ВСЁ ГОТОВО =====')
