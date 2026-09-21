import re

# ==================== SERVER.JS ====================
p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# 1. Проверяем наличие /api/news/article/audio
has_audio = "app.post('/api/news/article/audio'" in s
print('/api/news/article/audio: ' + ('✅ есть' if has_audio else '❌ нет'))

if not has_audio:
    # Вставляем перед app.listen
    anchor = s.find('app.listen(')
    if anchor < 0:
        print('❌ app.listen не найден')
        exit()
    audio_block = '''app.post('/api/news/article/audio', async function(req,res){
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ ok:false, error:'Text required' });
  const lang = String(req.body?.language || 'ru').slice(0,2);
  try {
    const buf = await synthesizeEdge(text, lang);
    if (!buf.length) throw new Error('Empty');
    res.set('Content-Type','audio/mpeg');
    res.set('Cache-Control','public, max-age=3600');
    res.send(buf);
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});

// ============ Погода ============
const WEATHER_CACHE = { at: 0, data: null };
app.get('/api/weather', async function(req,res){
  try {
    if (WEATHER_CACHE.data && Date.now() - WEATHER_CACHE.at < 15*60*1000){
      return res.json(WEATHER_CACHE.data);
    }
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) return res.status(503).json({ ok:false, error:'no_weather_key' });
    const city = String(req.query.city || 'Moscow');
    const r = await fetch('https://api.openweathermap.org/data/2.5/weather?q=' + encodeURIComponent(city) + '&units=metric&lang=ru&appid=' + key, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const out = {
      ok: true,
      temp: d.main?.temp,
      main: d.weather?.[0]?.main,
      icon: d.weather?.[0]?.icon,
      description: d.weather?.[0]?.description,
      clouds: d.clouds?.all,
      wind: d.wind?.speed,
      sunrise: d.sys?.sunrise,
      sunset: d.sys?.sunset
    };
    WEATHER_CACHE.at = Date.now();
    WEATHER_CACHE.data = out;
    res.json(out);
  } catch(e){ res.status(502).json({ ok:false, error: e.message }); }
});

'''
    s = s[:anchor] + audio_block + s[anchor:]
    print('OK: /api/news/article/audio + /api/weather добавлены')

open(p, 'w', encoding='utf-8').write(s)
print('==== server.js готов ====')

# ==================== APP.JS ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# 2. Защитные обёртки для setTimeWeather и checkWeather
if 'function setTimeWeather' not in s2:
    # Добавляем заглушку, если её нет
    anchor = s2.find('async function checkWeather')
    if anchor < 0:
        anchor = s2.find('function checkWeather')
    if anchor >= 0:
        stub = '''function setTimeWeather(){
  // Заглушка: не используем погоду, если API недоступен
  document.body.classList.remove('weather-night','weather-sun','weather-cloud','weather-rain','weather-snow','weather-storm');
  document.body.classList.add('weather-sun');
}

'''
        s2 = s2[:anchor] + stub + s2[anchor:]
        print('OK: setTimeWeather добавлена')
else:
    print('OK: setTimeWeather уже есть')

open(p2, 'w', encoding='utf-8').write(s2)
print('==== app.js готов ====')

# Версия
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>93', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>93', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v93')
print('===== ГОТОВО =====')
