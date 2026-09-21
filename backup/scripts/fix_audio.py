import re, os

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

# ========== 1. Добавляем аудио-кэш ПЕРЕД функцией runEdgeTts ==========
if 'function audioKey(' not in s:
    anchor = 'function runEdgeTts(text, voice, out){'
    if anchor not in s:
        print('FAIL: runEdgeTts не найден')
        exit(1)
    block = '''// ========== Дисковый аудио-кэш ==========
const AUDIO_CACHE_DIR = path.join(DATA_DIR, 'audio-cache');
try { fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true }); } catch(e){}

function audioKey(text, voice){
  const norm = String(text||'').replace(/\\s+/g,' ').trim().slice(0, 3000);
  return crypto.createHash('md5').update(norm + '::' + voice).digest('hex');
}
function audioCachePath(key){
  return path.join(AUDIO_CACHE_DIR, key + '.mp3');
}
function getCachedAudio(key){
  try {
    const f = audioCachePath(key);
    if (!fs.existsSync(f)) return null;
    const st = fs.statSync(f);
    if (Date.now() - st.mtimeMs > 30*24*60*60*1000) return null; // 30 дней
    return fs.readFileSync(f);
  } catch(e){ return null; }
}
function setCachedAudio(key, buf){
  try { fs.writeFileSync(audioCachePath(key), buf); } catch(e){ console.warn('[audio-cache] save error:', e.message); }
}
console.log('[audio-cache] dir=' + AUDIO_CACHE_DIR);

'''
    s = s.replace(anchor, block + anchor, 1)
    print('OK: аудио-кэш добавлен (audioKey / getCachedAudio / setCachedAudio)')
else:
    print('SKIP: аудио-кэш уже есть')

open(p, 'w', encoding='utf-8').write(s)
print('server.js: было ' + str(orig) + ' байт, стало ' + str(len(s)) + ' байт')

# ========== 2. Обновляем версию в index.html ==========
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\\.css\\?v=\\d{8}-v)\\d+', r'\\g<1>99', s2)
s2 = re.sub(r'(app\\.js\\?v=\\d{8}-v)\\d+', r'\\g<1>99', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v99')

print('===== ГОТОВО =====')
