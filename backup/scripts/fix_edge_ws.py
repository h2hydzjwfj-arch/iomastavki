import re

p = 'server.js'
s = open(p, 'r', encoding='utf-8').read()

# Удаляем старую версию Edge TTS через npm-пакет
start = s.find('// ============ Edge TTS (Microsoft, бесплатный, без API-ключа) ============')
end = s.find('app.listen(', start)
if start > 0 and end > start:
    s = s[:start] + s[end:]
    print('OK: удалён старый Edge TTS через npm-пакет')

new_block = '''// ============ Edge TTS через WebSocket (Microsoft, бесплатно, без ключей) ============
const WebSocket = require('ws');

const EDGE_VOICES = {
  ru: 'ru-RU-DmitryNeural',
  en: 'en-US-GuyNeural',
  zh: 'zh-CN-YunxiNeural',
  tr: 'tr-TR-AhmetNeural'
};

const EDGE_TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=' + EDGE_TRUSTED_TOKEN;
const EDGE_OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

function escapeSSML(text){
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function synthesizeChunk(text, voice){
  return new Promise(function(resolve, reject){
    const ws = new WebSocket(EDGE_URL, {
      headers: {
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
      }
    });

    const chunks = [];
    let finished = false;
    const timer = setTimeout(function(){
      if (!finished){ finished = true; try{ ws.close(); }catch(e){} reject(new Error('Edge TTS timeout')); }
    }, 30000);

    ws.on('open', function(){
      const now = new Date();
      const ts = now.toISOString().replace('T',' ').split('.')[0] + 'Z';
      const configMsg = 'X-Timestamp:' + ts + '\\r\\nContent-Type:application/json; charset=utf-8\\r\\nPath:speech.config\\r\\n\\r\\n' +
        JSON.stringify({context:{synthesis:{audio:{metadataoptions:{sentenceBoundaryEnabled:false,wordBoundaryEnabled:false},outputFormat:EDGE_OUTPUT_FORMAT}}}});
      ws.send(configMsg);

      const requestId = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function(){ return Math.floor(Math.random()*16).toString(16); });
      const ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ru-RU">' +
        '<voice name="' + voice + '">' +
        '<prosody rate="-5%" pitch="+0Hz" volume="+0%">' + escapeSSML(text) + '</prosody>' +
        '</voice></speak>';
      const ssmlMsg = 'X-RequestId:' + requestId + '\\r\\nContent-Type:application/ssml+xml\\r\\nX-Timestamp:' + ts + 'Z\\r\\nPath:ssml\\r\\n\\r\\n' + ssml;
      ws.send(ssmlMsg);
    });

    ws.on('message', function(data, isBinary){
      if (isBinary){
        const buf = Buffer.from(data);
        const headerLen = buf.readUInt16BE(0);
        const audioData = buf.slice(2 + headerLen);
        if (audioData.length > 0) chunks.push(audioData);
      } else {
        const text = data.toString();
        if (text.includes('Path:turn.end')){
          finished = true;
          clearTimeout(timer);
          try{ ws.close(); }catch(e){}
          resolve(Buffer.concat(chunks));
        }
      }
    });

    ws.on('error', function(err){
      if (!finished){ finished = true; clearTimeout(timer); reject(err); }
    });
  });
}

async function synthesizeWithEdge(text, langCode){
  const voice = EDGE_VOICES[langCode] || EDGE_VOICES.ru;
  let rest = String(text || '')
    .replace(/[#*`>]/g, ' ')
    .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')
    .replace(/\\s+/g, ' ')
    .trim();
  const MAX = 1500;
  const parts = [];
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
  console.log('[edge-tts] voice=' + voice + ' parts=' + parts.length);
  const buffers = [];
  for (let i = 0; i < parts.length; i++){
    const buf = await synthesizeChunk(parts[i], voice);
    if (buf.length > 0) buffers.push(buf);
    console.log('[edge-tts] part ' + (i+1) + '/' + parts.length + ' = ' + buf.length + ' bytes');
    if (i < parts.length - 1) await new Promise(function(r){ setTimeout(r, 200); });
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
print('OK: Edge TTS через WebSocket (без npm-пакетов)')

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\\.css\\?v=\\d{8}-v)\\d+', r'\\g<1>58', s2)
s2 = re.sub(r'(app\\.js\\?v=\\d{8}-v)\\d+', r'\\g<1>58', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v58')
print('===== ВСЁ ГОТОВО =====')
