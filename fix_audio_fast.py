import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Заменяем synthesizeEdge — параллельная генерация по 2 части
old_fn = s.find('async function synthesizeEdge(')
end_fn = s.find('\n}\n', old_fn)
if old_fn < 0 or end_fn < 0:
    print('❌ synthesizeEdge не найдена')
    exit()

# Ищем конец функции (следующий "}\n" на верхнем уровне)
import re as re2
m = re2.search(r'async function synthesizeEdge\(text, lang\)\{[\s\S]*?\n\}\n', s)
if not m:
    print('❌ не нашёл границы synthesizeEdge')
    exit()

new_fn = '''async function synthesizeEdge(text, lang){
  const voice = EDGE_VOICES[lang] || EDGE_VOICES.ru;
  const clean = String(text||'').replace(/[#*`>]/g,' ').replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g,'$1').replace(/\\s+/g,' ').trim();
  const MAX = 1500;
  const parts = [];
  let rest = clean;
  while (rest.length > 0){
    let cut = Math.min(MAX, rest.length);
    if (cut < rest.length){
      const end = Math.max(rest.lastIndexOf('. ', cut), rest.lastIndexOf('? ', cut), rest.lastIndexOf('! ', cut));
      if (end > MAX*0.4) cut = end+1;
    }
    parts.push(rest.slice(0,cut).trim());
    rest = rest.slice(cut).trim();
    if (parts.length > 25) break;
  }
  console.log('[edge-tts] voice=' + voice + ' parts=' + parts.length + ' (parallel x2)');
  const buffers = new Array(parts.length);
  // Параллельная генерация по 2 части одновременно
  const CONCURRENCY = 2;
  for (let i = 0; i < parts.length; i += CONCURRENCY){
    const promises = [];
    for (let j = i; j < Math.min(i + CONCURRENCY, parts.length); j++){
      promises.push((async function(idx){
        const tmp = path.join(os.tmpdir(), 'edge-tts-' + crypto.randomBytes(6).toString('hex') + '.mp3');
        try {
          await runEdgeTts(parts[idx], voice, tmp);
          buffers[idx] = fs.readFileSync(tmp);
        } finally {
          try { fs.unlinkSync(tmp); } catch(e){}
        }
      })(j));
    }
    await Promise.all(promises);
    console.log('[edge-tts] batch ' + (Math.floor(i/CONCURRENCY)+1) + '/' + Math.ceil(parts.length/CONCURRENCY));
  }
  return Buffer.concat(buffers.filter(Boolean));
}
'''

s = s[:m.start()] + new_fn + s[m.end():]
print('OK: параллельная генерация аудио')

open(p, 'w', encoding='utf-8').write(s)

# Версия
p3 = 'index.html'
s3 = open(p3, 'r', encoding='utf-8').read()
s3 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>95', s3)
s3 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>95', s3)
open(p3, 'w', encoding='utf-8').write(s3)
print('OK: index.html → v95')
print('===== ГОТОВО =====')
