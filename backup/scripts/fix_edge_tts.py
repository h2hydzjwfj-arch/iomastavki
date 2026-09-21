import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1) Заменяем /api/news/article/audio на Edge TTS
old_audio = '''app.post('/api/news/article/audio', async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  const input = String((req.body && req.body.text) || '').trim().slice(0, 4000);
  if (!input) return res.status(400).json({ok:false, error:'Text required'});
  const language = String((req.body && req.body.language) || 'ru');
  if (!key) {
    console.warn('[tts] OPENAI_API_KEY не настроен — клиент использует браузерный fallback');
    return res.status(503).json({ok:false, error:'no_openai_key'});
  }
  const voice = process.env.OPENAI_TTS_VOICE || 'onyx';
  const instr = language === 'ru'
    ? 'Профессиональный мужской голос диктора-аналитика. Спокойно, уверенно, кинематографично. Русский язык, чёткая артикуляция, естественные паузы.'
    : language === 'zh'
      ? 'Professional male narrator, calm and cinematic.'
      : language === 'tr'
        ? 'Profesyonel erkek sunucu, sakin ve sinematik.'
        : 'Professional male narrator, calm, confident, cinematic.';
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key},
      body: JSON.stringify({model:'gpt-4o-mini-tts', voice: voice, input: input, response_format:'mp3', speed: 0.94, instructions: instr})
    });
    if (!r.ok) {
      const errText = await r.text();
      console.warn('[tts] OpenAI error ' + r.status + ': ' + errText.slice(0, 200));
      return res.status(r.status).json({ok:false, error: errText || 'TTS failed'});
    }
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'TTS unavailable'}); }
});'''

new_audio = '''// ============ Edge TTS (Microsoft, бесплатный, без API-ключа) ============
const EDGE_VOICES = {
  ru: 'ru-RU-DmitryNeural',
  en: 'en-US-GuyNeural',
  zh: 'zh-CN-YunxiNeural',
  tr: 'tr-TR-AhmetNeural'
};

async function synthesizeWithEdge(text, langCode) {
  const voice = EDGE_VOICES[langCode] || EDGE_VOICES.ru;
  const { EdgeTTS } = await import('@travisvn/edge-tts');
  // Разбиваем на куски по 2500 символов — Edge имеет лимит на один запрос
  const MAX = 2500;
  const chunks = [];
  let rest = String(text || '').replace(/[#*`>\\[\\]()]/g, ' ').replace(/\\s+/g, ' ').trim();
  while (rest.length > 0) {
    let cut = Math.min(MAX, rest.length);
    if (cut < rest.length) {
      const dot = rest.lastIndexOf('. ', cut);
      const bang = rest.lastIndexOf('! ', cut);
      const q = rest.lastIndexOf('? ', cut);
      const end = Math.max(dot, bang, q);
      if (end > MAX * 0.5) cut = end + 1;
    }
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
    if (chunks.length > 20) break; // максимум 50 000 символов
  }
  console.log('[edge-tts] voice=' + voice + ' chunks=' + chunks.length);
  const buffers = [];
  for (let i = 0; i < chunks.length; i++) {
    const tts = new EdgeTTS(chunks[i], voice, { rate: '-5%', volume: '+0%', pitch: '+0Hz' });
    const result = await tts.synthesize();
    const buf = Buffer.from(await result.audio.arrayBuffer());
    buffers.push(buf);
    console.log('[edge-tts] chunk ' + (i+1) + '/' + chunks.length + ' ok (' + buf.length + ' bytes)');
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
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buf);
    console.log('[edge-tts] DONE ' + buf.length + ' bytes');
  } catch (e) {
    console.warn('[edge-tts] FAIL:', e.message);
    res.status(502).json({ok:false, error: e.message || 'TTS unavailable'});
  }
});'''

if old_audio in s:
    s = s.replace(old_audio, new_audio)
    print('OK: /api/news/article/audio → Edge TTS (Дмитрий, бесплатно)')
else:
    print('WARN: старый endpoint не найден — ищу любой /api/news/article/audio')
    pattern = re.compile(r"app\.post\('/api/news/article/audio',[\s\S]*?\n\}\);", re.MULTILINE)
    s, n = pattern.subn(new_audio, s)
    print('OK: применена regex-замена ' + str(n))

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# КРИТИЧНО: озвучивать весь контент, а не только podcast
old_play = '''async function playArticleAudio(article, langCode, btn){
  // Если уже играет на этой кнопке — остановить
  if (btn.classList.contains('playing')){ stopAudioPlayback(); return; }
  stopAudioPlayback();
  currentPlayBtn = btn;
  btn.classList.add('playing');
  const label = btn.querySelector('.audio-label');
  if (label) label.textContent = 'Подготовка…';

  const text = String(article.podcast || article.content || article.subtitle || article.title || '').replace(/[#*`]/g,'').slice(0, 4000);'''

new_play = '''async function playArticleAudio(article, langCode, btn){
  // Если уже играет на этой кнопке — остановить
  if (btn.classList.contains('playing')){ stopAudioPlayback(); return; }
  stopAudioPlayback();
  currentPlayBtn = btn;
  btn.classList.add('playing');
  const label = btn.querySelector('.audio-label');
  if (label) label.textContent = 'Подготовка…';

  // Собираем ПОЛНЫЙ текст: заголовок + подзаголовок + ВСЁ содержимое + podcast
  const parts = [];
  if (article.title) parts.push(article.title + '.');
  if (article.subtitle) parts.push(article.subtitle + '.');
  if (article.content) parts.push(String(article.content));
  if (article.podcast) parts.push('Аудио-сценарий. ' + String(article.podcast));
  const text = parts.join('\\n\\n')
    .replace(/[#*`]/g, '')
    .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')  // markdown-ссылки → текст
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim()
    .slice(0, 40000);'''

if old_play in s2:
    s2 = s2.replace(old_play, new_play)
    print('OK: playArticleAudio — озвучивает ВСЮ статью')
else:
    print('WARN: playArticleAudio не найден')

# В renderArticleFull — считать минуты по полному контенту
old_dur = "Math.max(1, Math.round(content.length / 900)) + ' мин'"
new_dur = "Math.max(1, Math.round((content.length + (a.podcast ? a.podcast.length : 0) + articleTitle.length) / 900)) + ' мин · голос Дмитрий'"

if old_dur in s2:
    s2 = s2.replace(old_dur, new_dur)
    print('OK: длительность — учитывает весь контент')

open(p2, 'w', encoding='utf-8').write(s2)

# ==================== INDEX.HTML ====================
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>57', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>57', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v57')
print('===== ВСЁ ГОТОВО =====')
