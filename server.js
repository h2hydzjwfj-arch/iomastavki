(function loadEnvFile(){
  try {
    const envPath = require('path').join(__dirname, '.env');
    if (require('fs').existsSync(envPath)) {
      const content = require('fs').readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(function(line){
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq < 1) return;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      });
      console.log('[env] Loaded: ' + Object.keys(process.env).filter(function(k){return /_API_KEY|_TOKEN/.test(k);}).join(', '));
    }
  } catch (e) { console.warn('[env]', e.message); }
})();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { execFile } = require('child_process');
const os = require('os');
const upload = multer({storage: multer.memoryStorage(), limits:{fileSize: 15*1024*1024}});

const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const RATES_FILE = process.env.RATES_FILE || path.join(DATA_DIR, 'rates.json');
const MAX_RATE_RECORDS = 5000;

const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const EDGE_VOICES = { ru:'ru-RU-DmitryNeural', en:'en-US-GuyNeural', zh:'zh-CN-YunxiNeural', tr:'tr-TR-AhmetNeural' };

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const fallbackHash = 'scrypt$16384$8$1$bd186dac2105a3d050c5f769e28d25a2$51e731def6ff02e823b43cb8cfce55adcad745c5c72935ce68d875f583096288';

function safeReadRates(){ try { return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8')); } catch(e){ return {}; } }
function ensureRateDb(){
  const raw = safeReadRates();
  if (Array.isArray(raw)) return { version: 2, updatedAt: null, records: raw };
  if (raw && Array.isArray(raw.records)) return raw;
  const records = [];
  for (const [company, v] of Object.entries(raw || {})) {
    if (v && v.latestRate) records.push(Object.assign({ company }, v.latestRate, { source: 'legacy' }));
  }
  return { version: 2, updatedAt: null, records };
}
function normalizeText(s=''){ return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function routeScore(record, from, to, mode, distance){
  const a=normalizeText(from), b=normalizeText(to), rf=normalizeText(record.from), rt=normalizeText(record.to);
  let score=0;
  if (rf && (rf===a || rf.includes(a) || a.includes(rf))) score+=8;
  if (rt && (rt===b || rt.includes(b) || b.includes(rt))) score+=8;
  if (mode && record.mode && normalizeText(record.mode)===normalizeText(mode)) score+=5;
  if (Number.isFinite(distance) && Number(record.distanceKm)) score += Math.max(0,5-Math.abs(distance-Number(record.distanceKm))/1200);
  return score;
}

// ============ AI ОЧЕРЕДЬ (защита от 429) ============
let AI_LOCK = Promise.resolve();
function withAiLock(fn){
  const run = async function(){ return await fn(); };
  const next = AI_LOCK.then(run, run);
  AI_LOCK = next.catch(function(){});
  return next;
}
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

async function groqRequest(model, messages, maxTokens, key){
  for (let attempt = 1; attempt <= 2; attempt++){
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5, response_format:{type:'json_object'} }),
        signal: AbortSignal.timeout(60000)
      });
      if (r.ok){
        const d = await r.json();
        const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (text) return { ok:true, text };
      }
      const errText = await r.text();
      if (r.status === 429 || /rate limit/i.test(errText)){
        // При 429 сразу отдаём наверх — пусть пробует Gemini
        return { ok:false, rateLimited:true };
      }
      if (/decommissioned|does not exist/i.test(errText)) return { ok:false, fatal:true };
      return { ok:false, error: 'HTTP ' + r.status };
    } catch(e){
      if (attempt < 2){ await sleep(800); continue; }
      return { ok:false, error: e.message };
    }
  }
  return { ok:false };
}

function repairJSON(raw){
  if (typeof raw !== 'string') return raw;
  let t = raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'').trim();
  const ob = t.indexOf('{'), obr = t.indexOf('[');
  let s = -1;
  if (ob < 0 && obr < 0) throw new Error('No JSON');
  if (ob < 0) s = obr; else if (obr < 0) s = ob; else s = Math.min(ob, obr);
  const e = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (e <= s) throw new Error('Broken JSON');
  t = t.slice(s, e+1).replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(t); } catch(e){}
  try {
    const fixed = t.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, function(m){ return m.replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t'); });
    return JSON.parse(fixed);
  } catch(e){}
  throw new Error('JSON repair failed');
}

// ========== Google Gemini (резервный провайдер) ==========
async function geminiRequest(systemPrompt, userPrompt, maxTokens, jsonMode){
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok:false, error:'no key' };
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens || 2000,
      temperature: 0.5
    }
  };
  if (jsonMode) body.generationConfig.responseMimeType = 'application/json';
  for (const model of models){
    for (let attempt = 1; attempt <= 2; attempt++){
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90000)
        });
        if (r.ok){
          const d = await r.json();
          const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
          const text = parts && parts.map(function(x){return x.text||'';}).join('');
          if (text) return { ok:true, text };
        }
        const errText = await r.text();
        if (r.status === 429 || /rate limit|quota/i.test(errText)){
          if (attempt < 2){ await sleep(3000); continue; }
        }
        if (r.status === 400 && /API_KEY_INVALID|API key not valid/i.test(errText)) return { ok:false, fatal:true };
        break;
      } catch(e){
        if (attempt < 2){ await sleep(2000); continue; }
      }
    }
  }
  return { ok:false };
}

async function geminiChatJSON(systemPrompt, userPrompt, maxTokens){
  const res = await geminiRequest(systemPrompt + ' Return ONLY valid JSON.', userPrompt, maxTokens, true);
  if (!res.ok) return null;
  try { return repairJSON(res.text); } catch(e){ console.warn('[AI] Gemini JSON repair fail'); return null; }
}
async function geminiChatText(systemPrompt, userPrompt, maxTokens){
  const res = await geminiRequest(systemPrompt, userPrompt, maxTokens, false);
  return res.ok ? res.text : null;
}

async function aiChatJSON(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt + ' Return ONLY valid JSON.' },
      { role:'user', content: userPrompt }
    ];
    if (process.env.GROQ_API_KEY){
      for (const model of GROQ_MODELS){
        const res = await groqRequest(model, messages, maxTokens, process.env.GROQ_API_KEY);
        if (res.ok){
          console.log('[AI] Groq ' + model + ' OK');
          try { return repairJSON(res.text); } catch(e){ console.warn('[AI] JSON repair fail'); }
        }
        if (res.fatal) continue;
      }
    }
    if (process.env.GEMINI_API_KEY){
      const g = await geminiChatJSON(systemPrompt, userPrompt, maxTokens);
      if (g && typeof g === 'object' && Object.keys(g).length){
        console.log('[AI] Gemini OK');
        return g;
      }
    }
    if (process.env.DEEPSEEK_API_KEY){
      for (let attempt = 1; attempt <= 2; attempt++){
        try {
          const r = await fetch('https://api.deepseek.com/chat/completions', {
            method:'POST',
            headers:{'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type':'application/json'},
            body: JSON.stringify({ model:'deepseek-chat', messages, max_tokens: maxTokens || 4000, temperature:0.5, response_format:{type:'json_object'} }),
            signal: AbortSignal.timeout(120000)
          });
          if (r.ok){
            const d = await r.json();
            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
            if (text){ console.log('[AI] DeepSeek OK'); return repairJSON(text); }
          }
        } catch(e){ if (attempt < 2) await sleep(3000); }
      }
    }
    throw new Error('Все AI-провайдеры недоступны');
  });
}

async function aiChatText(systemPrompt, userPrompt, maxTokens){
  return withAiLock(async function(){
    const messages = [
      { role:'system', content: systemPrompt },
      { role:'user', content: userPrompt }
    ];
    // 1. GROQ
    if (process.env.GROQ_API_KEY){
      let rateLimited = false;
      for (const model of GROQ_MODELS){
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type':'application/json'},
            body: JSON.stringify({ model, messages, max_tokens: maxTokens || 2000, temperature: 0.5 }),
            signal: AbortSignal.timeout(45000)
          });
          if (r.ok){
            const d = await r.json();
            const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
            if (text){ console.log('[AI] Groq OK (' + model + ')'); return text; }
          }
          if (r.status === 429){ rateLimited = true; console.log('[AI] Groq 429 (' + model + ')'); break; }
          console.log('[AI] Groq HTTP ' + r.status);
        } catch(e){ console.log('[AI] Groq error: ' + e.message); }
      }
      if (rateLimited) console.log('[AI] Groq rate-limited → Gemini');
    } else {
      console.log('[AI] Groq — нет ключа');
    }

    // 2. GEMINI
    if (process.env.GEMINI_API_KEY){
      try {
        const g = await geminiChatText(systemPrompt, userPrompt, maxTokens);
        if (g){ console.log('[AI] Gemini OK'); return g; }
        console.log('[AI] Gemini вернул пусто');
      } catch(e){ console.log('[AI] Gemini error: ' + e.message); }
    } else {
      console.log('[AI] Gemini — нет ключа');
    }

    // 3. DEEPSEEK
    if (process.env.DEEPSEEK_API_KEY){
      try {
        const r = await fetch('https://api.deepseek.com/chat/completions', {
          method:'POST',
          headers:{'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type':'application/json'},
          body: JSON.stringify({ model:'deepseek-chat', messages, max_tokens: maxTokens || 2000, temperature:0.5 }),
          signal: AbortSignal.timeout(60000)
        });
        if (r.ok){
          const d = await r.json();
          const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          if (text){ console.log('[AI] DeepSeek OK'); return text; }
        }
        console.log('[AI] DeepSeek HTTP ' + r.status);
      } catch(e){ console.log('[AI] DeepSeek error: ' + e.message); }
    } else {
      console.log('[AI] DeepSeek — нет ключа');
    }

    throw new Error('Все AI-провайдеры недоступны');
  });
}

function preprocessForTts(text, lang){
  let t = String(text || '');
  t = t.replace(/\$\s*(\d[\d.,]*)\s*[-–—]\s*\$?\s*(\d[\d.,]*)/g, '$1-$2 долларов');
  t = t.replace(/(\d[\d.,]*)\s*[-–—]\s*(\d[\d.,]*)\s*\$/g, '$1-$2 долларов');
  t = t.replace(/\$\s*(\d[\d.,]*)/g, '$1 долларов');
  t = t.replace(/(\d[\d.,]*)\s*\$/g, '$1 долларов');
  t = t.replace(/(\d[\d.,]*)\s*₽/g, '$1 рублей');
  t = t.replace(/₽\s*(\d[\d.,]*)/g, '$1 рублей');
  t = t.replace(/(\d[\d.,]*)\s*€/g, '$1 евро');
  t = t.replace(/€\s*(\d[\d.,]*)/g, '$1 евро');
  t = t.replace(/(\d[\d.,]*)\s*¥/g, '$1 юаней');
  t = t.replace(/(\d[\d.,]*)\s*%/g, '$1 процентов');
  if (lang === 'ru') t = t.replace(/(\d)\.(\d)/g, '$1,$2');
  if (lang === 'ru'){
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ТН ВЭД([^А-Яа-яЁёA-Za-z]|$)/g, '$1тэ-эн вэ-э-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])НПЗ([^А-Яа-яЁёA-Za-z]|$)/g, '$1эн-пэ-зэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])Ж\/Д([^А-Яа-яЁёA-Za-z]|$)/g, '$1жэ-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ЖД([^А-Яа-яЁёA-Za-z]|$)/g, '$1жэ-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ВЭД([^А-Яа-яЁёA-Za-z]|$)/g, '$1вэ-э-дэ$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ФТС([^А-Яа-яЁёA-Za-z]|$)/g, '$1эф-тэ-эс$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])ЕАЭС([^А-Яа-яЁёA-Za-z]|$)/g, '$1е-а-е-эс$2');
    t = t.replace(/(^|[^А-Яа-яЁёA-Za-z])КП([^А-Яа-яЁёA-Za-z]|$)/g, '$1ка-пэ$2');
  }
  t = t.replace(/[▪•●◆■]/g, ', ');
  t = t.replace(/[#*`>_]+/g, ' ');
  t = t.replace(/\s*[—–]\s*/g, ', ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function runEdgeTts(text, voice, out){
  return new Promise(function(resolve, reject){
    execFile('python3', ['-m','edge_tts','--voice',voice,'--rate=-5%','--text',text,'--write-media',out],
      { timeout: 90000, maxBuffer: 10*1024*1024 },
      function(err, so, se){
        if (err) return reject(new Error((se||err.message).slice(0,200)));
        resolve(out);
      });
  });
}
async function synthesizeEdge(text, lang){
  const voice = EDGE_VOICES[lang] || EDGE_VOICES.ru;
  const clean = preprocessForTts(text, lang);
  const ck = audioKey(clean, voice);
  const cached = getCachedAudio(ck);
  if (cached){
    console.log('[edge-tts] CACHE HIT (' + cached.length + ' bytes)');
    return cached;
  }
  const MAX = 2000;
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
  const CONCURRENCY = 4;
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
  }
  const result = Buffer.concat(buffers.filter(Boolean));
  setCachedAudio(ck, result);
  return result;
}

// ============ NEWS ============
const newsCache = { at: 0, items: [], translations: {} };
const NEWS_CACHE_FILE = path.join(DATA_DIR, 'news-cache.json');

function loadNewsCacheFromDisk(){
  try {
    if (!fs.existsSync(NEWS_CACHE_FILE)) return;
    const d = JSON.parse(fs.readFileSync(NEWS_CACHE_FILE, 'utf8'));
    if (d && Array.isArray(d.items)) {
      newsCache.at = d.at || 0;
      newsCache.items = d.items;
      newsCache.translations = d.translations || {};
      console.log('[news-cache] загружено с диска: items=' + d.items.length + ', переводов=' + Object.keys(newsCache.translations).length);
    }
  } catch(e){ console.warn('[news-cache] load error: ' + e.message); }
}
function saveNewsCacheToDisk(){
  try {
    fs.mkdirSync(DATA_DIR, {recursive:true});
    fs.writeFileSync(NEWS_CACHE_FILE, JSON.stringify(newsCache), 'utf8');
  } catch(e){ console.warn('[news-cache] save error: ' + e.message); }
}
loadNewsCacheFromDisk();

function stripSource(t){
  let x = String(t||'').trim();
  x = x.replace(/\s+[-–—]\s+[A-Za-zА-Яа-яЁё][\w\.\-]*\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\.[a-z]{2})?\s*$/i,'');
  x = x.replace(/\s+[-–—]\s+[A-Z][a-zA-Z]+(?:[\s\-][A-Z][a-zA-Z]+){0,2}\s*$/i,'');
  x = x.replace(/\s+[-–—]\s+[А-ЯЁ][а-яё]+(?:[\s\-][А-ЯЁ][а-яё]+){0,2}\s*$/i,'');
  return x.trim();
}
function xmlUnescape(s){
  return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCodePoint(Number(n))})
    .replace(/&#x([0-9a-f]+);/gi,function(_,n){return String.fromCodePoint(parseInt(n,16))})
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
async function fetchRss(url, source){
  try {
    const r = await fetch(url, { headers:{'User-Agent':'Mozilla/5.0 Chrome/120'}, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    const out = [];
    for (const b of blocks.slice(0,30)){
      const t = xmlUnescape((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
      const l = xmlUnescape((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1]||'').trim();
      const d = xmlUnescape((b.match(/<description[^>]*>([\s\S]*?)<\/description>/i)||[])[1]||'');
      const p = (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)||[])[1]||'';
      if (!t) continue;
      const dt = Date.parse(p);
      out.push({ title: t, link: l, date: Number.isFinite(dt)?new Date(dt).toISOString():new Date().toISOString(), source, description: d.slice(0,400) });
    }
    return out;
  } catch(e){ return []; }
}
function isUrgent(t){ return /(обязательн|запрет|пошлин|таможенн|маркиров|лиценз|санкц|mandatory|ban|duty|tariff|customs|sanction)/i.test(String(t||'')); }
async function fetchNews(){
  const queries = [
    ['логистика Китай Россия','Логистика'],
    ['грузоперевозки Китай Россия','Грузоперевозки'],
    ['импорт из Китая в Россию','Импорт'],
    ['таможня ЕАЭС пошлина ВЭД','Таможня'],
    ['ТН ВЭД маркировка','ТН ВЭД'],
    ['контейнерные перевозки Китай','Контейнеры'],
    ['железнодорожные перевозки Китай Россия','Ж/Д'],
    ['морские перевозки Азия','Море'],
    ['логистика Индия Россия','Индия'],
    ['логистика Корея Япония Россия','Азия']
  ];
  const urls = queries.map(function(q){
    return ['https://news.google.com/rss/search?q=' + encodeURIComponent(q[0]) + '&hl=ru&gl=RU&ceid=RU:ru', q[1]];
  });
  let all = [];
  try { const lists = await Promise.all(urls.map(function(u){ return fetchRss(u[0], u[1]); })); all = lists.flat(); } catch(e){}
  const BAD_TOPICS = /(украин|киев|київ|ukrain|киевск|одесс|харьков|львов|донец|луганск|крым|мариупол|запорож|херсон|николаев|чернигов|ВСУ|ЗСУ|політик|зеленск)/i;
  const BAD_DOMAINS = /(\.ua\b|delo\.ua|pravda\.com\.ua|ukrinform|unian|112\.ua|gordonua|strana\.ua|liga\.net|korrespondent\.net|lenta\.ua|zn\.ua|epravda|24tv\.ua|tsn\.ua|fakty\.com\.ua|obozrevatel|focus\.ua|nv\.ua)/i;
  all = all.filter(function(x){
    const tx = String(x.title||'') + ' ' + String(x.description||'') + ' ' + String(x.link||'');
    if (BAD_TOPICS.test(tx)) return false;
    if (BAD_DOMAINS.test(String(x.link||''))) return false;
    if (BAD_DOMAINS.test(String(x.source||''))) return false;
    if (/\.ua\b/i.test(String(x.title||''))) return false;
    return true;
  });
  const seen = new Set();
  all = all.filter(function(x){ const k = normalizeText(x.title); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  all.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
  const items = all.slice(0,30).map(function(x){
    return Object.assign({}, x, { title: stripSource(x.title), urgent: isUrgent(x.title + ' ' + x.description) });
  });
  newsCache.at = Date.now();
  newsCache.items = items;
  newsCache.translations = {}; // сбрасываем устаревшие переводы
  saveNewsCacheToDisk();
  // Фоновый прогрев переводов
  warmNewsTranslations().catch(function(e){ console.warn('[news-warm] ' + e.message); });
  return items;
}

async function warmNewsTranslations(){
  if (!newsCache.items.length) return;
  console.log('[news-warm] старт прогрева переводов...');
  for (const lg of ['en','zh','tr']){
    try {
      if (newsCache.translations && newsCache.translations[lg]) { console.log('[news-warm] ' + lg + ' уже есть'); continue; }
      await translateNewsItems(newsCache.items, lg);
      await sleep(1500);
    } catch(e){ console.warn('[news-warm] ' + lg + ' fail: ' + e.message); }
  }
  console.log('[news-warm] готово');
}

// ============ Article ============
// ========== Дисковый кэш статей ==========
const ARTICLE_CACHE_DIR = path.join(DATA_DIR, 'articles-cache');
try { fs.mkdirSync(ARTICLE_CACHE_DIR, { recursive: true }); } catch(e){}

function articleKey(title, lang){
  const norm = String(title||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '').slice(0, 100);
  return crypto.createHash('md5').update(norm + '::' + lang).digest('hex');
}
function articleCachePath(title, lang){
  return path.join(ARTICLE_CACHE_DIR, articleKey(title, lang) + '.json');
}
function getCachedArticle(title, lang){
  try {
    const file = articleCachePath(title, lang);
    if (!fs.existsSync(file)) return null;
    const st = fs.statSync(file);
    // Кэш живёт 7 дней
    if (Date.now() - st.mtimeMs > 7*24*60*60*1000) return null;
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    return d.article || null;
  } catch(e){ return null; }
}
function saveCachedArticle(title, lang, article){
  try {
    const file = articleCachePath(title, lang);
    fs.writeFileSync(file, JSON.stringify({ title, lang, article, cachedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch(e){ console.warn('[article-cache] save error:', e.message); }
}
function countCachedArticles(){
  try { return fs.readdirSync(ARTICLE_CACHE_DIR).filter(function(f){ return f.endsWith('.json'); }).length; } catch(e){ return 0; }
}
console.log('[article-cache] dir=' + ARTICLE_CACHE_DIR + ' files=' + countCachedArticles());

async function fetchArticleSource(url){
  if (!/^https?:\/\//i.test(url)) return '';
  try {
    const r = await fetch(url, { headers:{'User-Agent':'Mozilla/5.0'}, signal: AbortSignal.timeout(7000) });
    if (!r.ok) return '';
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,18000);
  } catch(e){ return ''; }
}
function buildTemplate(title, description, source, sourceText){
  const parts = ['## Что произошло','', description || ('Новость из источника ' + source + '.'), '',
    '## Что это значит для логистики','',
    'Изменения в международной логистике требуют повышенного внимания к документам, срокам и структуре затрат. Проверьте базис поставки, маршрут и применимые таможенные нормы.', '',
    '## Что проверить','',
    '- Базис поставки (Incoterms)',
    '- Код ТН ВЭД и применяемая пошлина',
    '- Разрешительные документы и маркировка',
    '- Даты вступления изменений в силу', '',
    '## Источник','', 'Новость от ' + source + '.'];
  return { title, subtitle: description.slice(0,180), content: parts.join('\n'), podcast: description || '' };
}
async function fetchPexelsImage(q){
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=5&orientation=landscape', { headers:{'Authorization': key}, signal: AbortSignal.timeout(8000) });
    if (r.ok){ const d = await r.json(); if (d.photos && d.photos.length){ const p = d.photos[Math.floor(Math.random()*d.photos.length)]; return p.src && (p.src.large || p.src.medium) || null; } }
  } catch(e){}
  return null;
}
function defaultImgQuery(title){
  const t = String(title||'').toLowerCase();
  // Хэш от title -> стабильный выбор варианта (но разный для разных новостей)
  const h = crypto.createHash('md5').update(t).digest('hex');
  const n = parseInt(h.slice(0, 8), 16);
  const pick = function(arr){ return arr[n % arr.length]; };
  if (/таможен|пошлин|декларац|фтс|еэк|вэд|тн.?вэд|сертифик/.test(t)) return pick(['customs documents','customs clearance','border checkpoint','trade documents','customs inspection']);
  if (/маркиров|честный знак/.test(t)) return pick(['product marking','barcode scanner','qr code label','warehouse label']);
  if (/нефт|газ|barrel|oil|tanker/.test(t)) return pick(['oil tanker ship','oil refinery','oil pipeline','fuel tanker truck']);
  if (/железнодорож|жд|rail|поезд/.test(t)) return pick(['freight train railway','cargo train station','railway containers','train tracks']);
  if (/мор|порт|судно|контейнер|ship|port|container/.test(t)) return pick(['container ship port','cargo ship sea','port terminal crane','shipping containers']);
  if (/авиа|самолёт|air|flight|cargo plane/.test(t)) return pick(['cargo airplane','airport cargo terminal','air freight loading','cargo plane loading']);
  if (/грузовик|авто|truck|road/.test(t)) return pick(['cargo truck highway','semi trailer road','truck fleet logistics','truck loading dock']);
  if (/китай|china/.test(t)) return pick(['china logistics warehouse','shanghai port','china factory export','china cargo terminal']);
  if (/индия|india/.test(t)) return pick(['india port logistics','india container terminal','mumbai port','india cargo ship']);
  if (/корея|korea|япония|japan/.test(t)) return pick(['asia port city','korea cargo port','japan container terminal','asia shipping']);
  if (/склад|warehouse|логист/.test(t)) return pick(['warehouse logistics','distribution center','fulfillment center','cargo storage racks','pallet warehouse','forklift warehouse']);
  if (/автомобил|машин|car/.test(t)) return pick(['car transport ship','car carrier trailer','auto logistics port','vehicle loading']);
  if (/рыба|fish|сельхоз|agro|food/.test(t)) return pick(['food cargo shipping','refrigerated container','cold chain logistics','food export']);
  if (/импорт|экспорт|import|export/.test(t)) return pick(['cargo shipping logistics','export containers port','import logistics warehouse','trade cargo']);
  if (/дрон|беспилот|drone|uav/.test(t)) return pick(['delivery drone','drone logistics','cargo drone flight','uav delivery']);
  if (/мебел|furniture/.test(t)) return pick(['furniture warehouse','wooden furniture crates','furniture export','furniture shop warehouse']);
  return pick(['cargo logistics','freight transport','global shipping','logistics network','supply chain']);
}

// ============ ROUTES ============
// Пустая favicon — убирает 404 из консоли
app.get('/favicon.ico', function(req,res){
  res.status(204).end();
});

app.get('/', function(req,res){ res.sendFile(path.join(ROOT,'index.html')); });
app.get('/app.js', function(req,res){ res.sendFile(path.join(ROOT,'app.js')); });
app.get('/styles.css', function(req,res){ res.sendFile(path.join(ROOT,'styles.css')); });
app.get('/api/health', function(req,res){ res.json({ ok:true }); });
app.get('/api/version', function(req,res){ res.json({ ok:true, version:'98', build:'IOMASTAVKA_FILE_80' }); });
app.get('/api/config', function(req,res){ res.json({ weatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY), aiConfigured: Boolean(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY), pexelsConfigured: Boolean(process.env.PEXELS_API_KEY) }); });

// ========== Дорожное расстояние через OSRM + Nominatim ==========
const LOCAL_CITY_COORDS = {
  'пекин':[39.9042,116.4074],'beijing':[39.9042,116.4074],
  'шанхай':[31.2304,121.4737],'shanghai':[31.2304,121.4737],
  'гуанчжоу':[23.1291,113.2644],'guangzhou':[23.1291,113.2644],
  'шэньчжэнь':[22.5431,114.0579],'shenzhen':[22.5431,114.0579],
  'нинбо':[29.8683,121.5440],'ningbo':[29.8683,121.5440],
  'иу':[29.3068,120.0749],'yiwu':[29.3068,120.0749],
  'циндао':[36.0671,120.3826],'qingdao':[36.0671,120.3826],
  'тяньцзинь':[39.3434,117.3616],'tianjin':[39.3434,117.3616],
  'далянь':[38.9140,121.6147],'dalian':[38.9140,121.6147],
  'шэньян':[41.8057,123.4315],'shenyang':[41.8057,123.4315],
  'харбин':[45.8038,126.5349],'harbin':[45.8038,126.5349],
  'сиань':[34.3416,108.9398],'xian':[34.3416,108.9398],
  'чжэнчжоу':[34.7466,113.6254],'zhengzhou':[34.7466,113.6254],
  'ухань':[30.5928,114.3055],'wuhan':[30.5928,114.3055],
  'чэнду':[30.5728,104.0668],'chengdu':[30.5728,104.0668],
  'чунцин':[29.4316,106.9123],'chongqing':[29.4316,106.9123],
  'куньмин':[24.8801,102.8329],'kunming':[24.8801,102.8329],
  'урумчи':[43.8256,87.6168],'urumqi':[43.8256,87.6168],
  'москва':[55.7558,37.6173],'moscow':[55.7558,37.6173],
  'санкт-петербург':[59.9311,30.3609],'saint petersburg':[59.9311,30.3609],'st petersburg':[59.9311,30.3609],
  'владивосток':[43.1155,131.8855],'vladivostok':[43.1155,131.8855],
  'находка':[42.8333,132.8833],'nakhodka':[42.8333,132.8833],
  'новосибирск':[55.0084,82.9357],'novosibirsk':[55.0084,82.9357],
  'екатеринбург':[56.8389,60.6057],'yekaterinburg':[56.8389,60.6057],
  'казань':[55.7879,49.1233],'kazan':[55.7879,49.1233],
  'краснодар':[45.0355,38.9753],'krasnodar':[45.0355,38.9753],
  'ростов-на-дону':[47.2225,39.7188],'rostov-on-don':[47.2225,39.7188],
  'хабаровск':[48.4827,135.0838],'khabarovsk':[48.4827,135.0838],
  'омск':[54.9885,73.3242],'omsk':[54.9885,73.3242],
  'самара':[53.2001,50.1500],'samara':[53.2001,50.1500],
  'уфа':[54.7388,55.9721],'ufa':[54.7388,55.9721],
  'челябинск':[55.1644,61.4368],'chelyabinsk':[55.1644,61.4368],
  'пермь':[58.0105,56.2502],'perm':[58.0105,56.2502],
  'тюмень':[57.1522,65.5272],'tyumen':[57.1522,65.5272]
};

function normalizeCityKeyServer(s){
  return String(s||'').toLowerCase().trim().replace(/ё/g,'е').replace(/[^a-zа-я0-9 -]/gi,'');
}

async function geocodeCityServer(name){
  const key = normalizeCityKeyServer(name);
  if (LOCAL_CITY_COORDS[key]) return LOCAL_CITY_COORDS[key];
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru,en&q=' + encodeURIComponent(name);
    const r = await fetch(url, {
      headers: { 'User-Agent': 'iomastavka-logistics/1.0 (contact@iomastavka.onrender.com)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d) || !d.length) return null;
    return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
  } catch(e){ return null; }
}

function haversineKmServer(a, b){
  const R=6371, rad=x=>x*Math.PI/180;
  const dLat=rad(b[0]-a[0]), dLon=rad(b[1]-a[1]);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

app.get('/api/route-distance', async function(req,res){
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();
  if (!from || !to) return res.status(400).json({ ok:false, error:'from/to required' });
  try {
    const [c1, c2] = await Promise.all([geocodeCityServer(from), geocodeCityServer(to)]);
    if (!c1 || !c2) return res.status(404).json({ ok:false, error:'city not found', from:c1, to:c2 });
    let roadKm = null;
    try {
      const url = 'https://router.project-osrm.org/route/v1/driving/' + c1[1] + ',' + c1[0] + ';' + c2[1] + ',' + c2[0] + '?overview=false&alternatives=false';
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (r.ok){
        const d = await r.json();
        if (d.routes && d.routes[0] && Number.isFinite(d.routes[0].distance)){
          roadKm = Math.round(d.routes[0].distance / 1000);
        }
      }
    } catch(e){ console.warn('[route] osrm: ' + e.message); }
    const straightKm = Math.round(haversineKmServer(c1, c2));
    const finalKm = roadKm || Math.round(straightKm * 1.25);
    console.log('[route] ' + from + ' -> ' + to + ' = ' + finalKm + ' km (road=' + roadKm + ', straight=' + straightKm + ')');
    res.json({ ok:true, distanceKm: finalKm, roadKm, straightKm, fromCoords:c1, toCoords:c2, source: roadKm ? 'osrm' : 'haversine' });
  } catch(e){
    console.error('[route] error:', e.message);
    res.status(502).json({ ok:false, error:e.message });
  }
});

app.get('/api/currency', async function(req,res){
  try {
    const r = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { signal: AbortSignal.timeout(8000) });
    if (r.ok){
      const data = await r.json(), items = {};
      for (const c of ['USD','EUR','CNY']){ const x = data.Valute && data.Valute[c]; if (x && x.Value) items[c] = { nominal:x.Nominal||1, value:Number(x.Value) }; }
      if (items.USD && items.EUR && items.CNY) return res.json({ ok:true, source:'cbr-xml-daily.ru', date: data.Date, items });
    }
    throw new Error('CBR');
  } catch(e){ res.status(502).json({ ok:false, error:'CBR unavailable' }); }
});

// ========== Перевод заголовков новостей ==========
const newsTranslationCache = {};

async function translateNewsItems(items, targetLang){
  if (!items || !items.length || targetLang === 'ru') return items;
  const langNames = { en:'English', zh:'Chinese', tr:'Turkish' };
  const langName = langNames[targetLang] || 'English';
  // 1. Дисковый кэш переводов
  if (newsCache.translations && Array.isArray(newsCache.translations[targetLang]) &&
      newsCache.translations[targetLang].length === items.length){
    console.log('[news-translate] CACHE HIT (disk) ' + targetLang);
    return newsCache.translations[targetLang];
  }
  // 2. Память-кэш
  const titlesKey = items.slice(0, 30).map(function(x){ return String(x.title||'').slice(0,120); }).join('||');
  const cacheKey = crypto.createHash('md5').update(targetLang + '::' + titlesKey).digest('hex');
  const cached = newsTranslationCache[cacheKey];
  if (cached && Date.now() - cached.at < 60*60*1000) {
    console.log('[news-translate] CACHE HIT ' + targetLang);
    if (!newsCache.translations) newsCache.translations = {};
    newsCache.translations[targetLang] = cached.items;
    saveNewsCacheToDisk();
    return cached.items;
  }

  const BATCH = 12;
  const translated = [];
  for (let i = 0; i < items.length; i += BATCH){
    const chunk = items.slice(i, i + BATCH);
    const blockText = chunk.map(function(x, idx){
      return (idx+1) + '. TITLE: ' + String(x.title||'').slice(0,200) + '\n   DESC: ' + String(x.description||'').slice(0,200);
    }).join('\n');
    const sys = 'You are a translator. Translate news titles and short descriptions into ' + langName + '. Output ONLY valid JSON.';
    const usr = 'Translate the following ' + chunk.length + ' news items into ' + langName + '. Keep it short and natural. Return JSON: {"items":[{"title":"...","description":"..."}]} with exactly ' + chunk.length + ' items in the same order.\n\n' + blockText;
    try {
      const res = await aiChatJSON(sys, usr, 3500);
      if (res && Array.isArray(res.items) && res.items.length === chunk.length){
        for (let j = 0; j < chunk.length; j++){
          translated.push(Object.assign({}, chunk[j], {
            title: String(res.items[j].title || chunk[j].title || ''),
            description: String(res.items[j].description || chunk[j].description || '')
          }));
        }
      } else {
        chunk.forEach(function(x){ translated.push(x); });
      }
    } catch(e){
      console.warn('[news-translate] batch error: ' + e.message);
      chunk.forEach(function(x){ translated.push(x); });
    }
    if (i + BATCH < items.length) await sleep(500);
  }

  newsTranslationCache[cacheKey] = { at: Date.now(), items: translated };
  if (!newsCache.translations) newsCache.translations = {};
  newsCache.translations[targetLang] = translated;
  saveNewsCacheToDisk();
  console.log('[news-translate] ' + targetLang + ' OK (' + translated.length + ' items) + saved to disk');
  return translated;
}

app.get('/api/news', async function(req,res){
  const targetLang = String(req.query.lang || 'ru').toLowerCase().slice(0,2);
  try {
    let items = newsCache.items;
    if (Date.now() - newsCache.at > 6*60*60*1000 || !items.length) items = await fetchNews();
    if (targetLang && targetLang !== 'ru'){
      try { items = await translateNewsItems(items, targetLang); }
      catch(e){ console.warn('[news-translate] fail: ' + e.message); }
    }
    res.json({ ok:true, updatedAt:newsCache.at, lang: targetLang, items });
  } catch(e){ res.status(502).json({ ok:false, items:[] }); }
});

const NEWS_IMAGE_CACHE_FILE = path.join(DATA_DIR, 'news-images.json');
let newsImageCache = {};
try { newsImageCache = JSON.parse(fs.readFileSync(NEWS_IMAGE_CACHE_FILE, 'utf8')); } catch(e){}
function saveNewsImageCache(){
  try { fs.mkdirSync(DATA_DIR, {recursive:true}); fs.writeFileSync(NEWS_IMAGE_CACHE_FILE, JSON.stringify(newsImageCache), 'utf8'); } catch(e){}
}

app.get('/api/news/image', async function(req,res){
  const title = String(req.query.title || '').trim().slice(0, 200);
  if (!title) return res.status(400).json({ ok:false });
  const key = crypto.createHash('md5').update(title.toLowerCase()).digest('hex');
  if (newsImageCache[key]) return res.json({ ok:true, image: newsImageCache[key], fromCache:true });
  const query = defaultImgQuery(title);
  const image = await fetchPexelsImage(query);
  if (image){ newsImageCache[key] = image; saveNewsImageCache(); }
  res.json({ ok:true, image: image || '', query });
});

// ========== Автопрогрев статей (фоновый) ==========
let prewarmRunning = false;

async function prewarmArticles(N){
  if (prewarmRunning){
    console.log('[prewarm] уже выполняется, пропускаю');
    return;
  }
  N = Math.max(1, Math.min(20, N || 5));
  prewarmRunning = true;
  console.log('[prewarm] === старт: топ-' + N + ' статей × 4 языка ===');
  const t0 = Date.now();
  let ok = 0, fail = 0, cached = 0;
  try {
    // Обновляем новости, если кэш устарел
    if (!newsCache.items.length || Date.now() - newsCache.at > 6*60*60*1000){
      console.log('[prewarm] обновляю новости...');
      try { await fetchNews(); } catch(e){ console.warn('[prewarm] fetchNews: ' + e.message); }
    }
    const items = (newsCache.items || []).slice(0, N);
    if (!items.length){ console.log('[prewarm] новостей нет, выходим'); return; }

    for (let i = 0; i < items.length; i++){
      const item = items[i];
      const title = (typeof stripSource === 'function') ? stripSource(item.title) : item.title;
      const desc = item.description || '';
      const source = item.source || '';
      const link = item.link || '';
      console.log('[prewarm] (' + (i+1) + '/' + items.length + ') ' + String(title).slice(0,60));
      for (const lg of ['ru', 'en', 'zh', 'tr']){
        try {
          const r = await fetch('http://localhost:' + PORT + '/api/news/article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc, source, link, language: lg }),
            signal: AbortSignal.timeout(180000)
          });
          const d = await r.json();
          if (d && d.ok && d.article){
            if (d.fromCache){ cached++; console.log('    · ' + lg + ' (кэш)'); }
            else { ok++; console.log('    ✓ ' + lg + ' OK'); }
          } else { fail++; console.log('    ✗ ' + lg + ' fail'); }
        } catch(e){
          fail++;
          console.log('    ✗ ' + lg + ': ' + e.message);
        }
        await sleep(2500); // пауза между запросами — не бьём лимиты
      }
    }
  } finally {
    prewarmRunning = false;
    const dt = Math.round((Date.now()-t0)/1000);
    console.log('[prewarm] === готово за ' + dt + ' сек: новых=' + ok + ', кэш=' + cached + ', ошибок=' + fail + ' ===');
  }
}

app.post('/api/news/article', async function(req,res){
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ ok:false, error:'Title required' });
  const language = String(req.body?.language || 'ru').toLowerCase().slice(0,2);
  const description = String(req.body?.description || '');
  const sourceName = String(req.body?.source || '');
  const sourceLink = String(req.body?.link || '');
  const cleanTitle = stripSource ? stripSource(title) : title;
  const sourceLinkRaw = String(req.body?.link || '').trim();
  console.warn('[IOMA-SRV] /api/news/article:', { title: title.slice(0,80), link: sourceLinkRaw.slice(0,60), lang: language });
  // Используем link как первичный ключ, т.к. он уникален
  const cacheId = sourceLinkRaw || cleanTitle;
  console.log('[article] lookup id=' + cacheId.slice(0,60) + ' lang=' + language);

  // 1. Проверяем кэш (на диске) — по ключу id+lang
  const cached = getCachedArticle(cacheId, language);
  if (cached){
    console.log('[article] CACHE HIT (' + language + '): ' + cacheId.slice(0,50));
    return res.json({ ok:true, article: cached, fromCache: true });
  }
  console.log('[article] CACHE MISS (' + language + '): ' + cacheId.slice(0,50));

  // 2. Если есть RU в кэше, но нужен другой язык — переводим RU
  if (language !== 'ru'){
    const ruCached = getCachedArticle(cacheId, 'ru');
    if (ruCached){
      console.log('[article] RU cache есть, перевожу на ' + language);
      try {
        const LANG = language==='en'?'English':language==='tr'?'Turkish':'Chinese';
        const sys = 'Translate this article to ' + LANG + '. Output ONLY valid JSON with keys: title, subtitle, content, podcast. Preserve markdown in content.';
        const usr = 'Translate to ' + LANG + ':\n\n' + JSON.stringify({title:ruCached.title, subtitle:ruCached.subtitle||'', content:String(ruCached.content||'').slice(0,6000), podcast:String(ruCached.podcast||'').slice(0,800)});
        const translated = await aiChatJSON(sys, usr, 4000);
        if (translated && translated.content){
          translated.source = sourceName;
          translated.image = ruCached.image || '';
          saveCachedArticle(cacheId, language, translated);
          return res.json({ ok:true, article: translated, fromCache: false, translated: true });
        }
      } catch(e){ console.warn('[article] translate error: ' + e.message); }
    }
  }

  // 3. Генерируем с нуля (только RU если языка нет)
  if (!process.env.GROQ_API_KEY && !process.env.DEEPSEEK_API_KEY){
    const tpl = buildTemplate(cleanTitle, description, sourceName, '');
    tpl.source = sourceName;
    saveCachedArticle(cacheId, language, tpl);
    return res.json({ ok:true, article: tpl, fromCache: false });
  }

  const LANG = language==='en'?'English':language==='tr'?'Turkish':language==='zh'?'Chinese':'Russian';
  const sys = 'You are an expert logistics editor. Write in ' + LANG + ' ONLY. Be specific with numbers, laws, terms. Return JSON only.';
  const usr = 'Write a detailed analytical article in ' + LANG + ' (900-1300 words). Topic: ' + cleanTitle + '. Source: ' + sourceName + '. Description: ' + description + '.\n\nReturn JSON: {"title":"...","subtitle":"...","content":"markdown with ## headings","podcast":"short script","image_query":"cargo logistics"}';
  let article = null;
  for (let att = 1; att <= 2; att++){
    try {
      article = await aiChatJSON(sys, usr, 4000);
      if (article && article.content) break;
    } catch(e){
      console.warn('[article] attempt ' + att + ': ' + e.message);
      if (att < 2) await sleep(3000);
    }
  }
  if (!article || !article.content) article = buildTemplate(cleanTitle, description, sourceName, '');
  article.source = sourceName;
  const mainQuery = String(article.image_query || '').trim() || defaultImgQuery(cleanTitle);
  article.image = await fetchPexelsImage(mainQuery) || '';

  // 4. Сохраняем в кэш
  saveCachedArticle(cacheId, language, article);

  res.json({ ok:true, article, fromCache: false });
});

// Ручной запуск прогрева
app.post('/api/articles/prewarm', function(req,res){
  const n = Math.max(1, Math.min(20, Number(req.body && req.body.n) || 5));
  console.log('[prewarm] ручной запуск, n=' + n);
  prewarmArticles(n).catch(function(e){ console.warn('[prewarm] error: ' + e.message); });
  res.json({ ok: true, started: true, n: n });
});

// Служебный endpoint — сколько статей в кэше
app.get('/api/articles/cache-stats', function(req,res){
  res.json({ ok:true, count: countCachedArticles(), dir: ARTICLE_CACHE_DIR });
});

app.post('/api/news/article/audio', async function(req,res){
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

app.post('/api/transcribe', upload.single('file'), async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ ok:false, error:'No OpenAI key for transcription' });
  if (!req.file?.buffer) return res.status(400).json({ ok:false, error:'No file' });
  try {
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer],{type:req.file.mimetype||'audio/webm'}), 'voice.webm');
    form.append('model','whisper-1');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+key},body:form});
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok:false, error:d.error?.message });
    res.json({ ok:true, text:d.text || '' });
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});

app.get('/api/agents', function(req,res){
  try { const file = path.join(DATA_DIR,'agents.json'); const records = JSON.parse(fs.readFileSync(file,'utf8')); res.json({ ok:true, records }); }
  catch(e){ try { const b = JSON.parse(fs.readFileSync(path.join(ROOT,'agents.json'),'utf8')); res.json({ ok:true, records:b }); } catch(e2){ res.json({ ok:true, records:[] }); } }
});

app.get('/api/rates', function(req,res){ res.json(ensureRateDb()); });

app.get('/api/rates/recommend', function(req,res){
  const db = ensureRateDb();
  const from = String(req.query.from||''), to = String(req.query.to||''), mode = String(req.query.mode||''), distance = Number(req.query.distance);
  const matches = db.records.map(function(r){ return Object.assign({}, r, { _score: routeScore(r, from, to, mode, Number.isFinite(distance)?distance:null) }); })
    .filter(function(r){ return r._score > 0; })
    .sort(function(a,b){ return b._score - a._score; })
    .slice(0,8);
  res.json({ ok:true, matches });
});

app.post('/api/agents/import', async function(req,res){
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ ok:false });
  try {
    const sys = 'Extract agents. Return JSON array with fields: company, contact, phone, email, site, modes[], transport[], notes.';
    const parsed = await aiChatJSON(sys, text.slice(0,60000), 2500);
    const incoming = Array.isArray(parsed) ? parsed : [];
    const file = path.join(DATA_DIR,'agents.json');
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(file,'utf8')); } catch(e){}
    for (const a of incoming){
      if (!a || !a.company) continue;
      existing.push(Object.assign({ id: existing.length+1 }, a));
    }
    fs.writeFileSync(file, JSON.stringify(existing,null,2));
    res.json({ ok:true, added: incoming.length });
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});

app.post('/api/rates/import', upload.single('file'), async function(req,res){
  if (!req.file?.buffer && !String(req.body?.text||'').trim()) return res.status(400).json({ ok:false });
  try {
    const content = req.file?.buffer ? req.file.buffer.toString('utf8') : String(req.body?.text||'');
    const sys = 'Extract logistics rates. Return JSON array: company, from, to, mode, incoterms, rate, currency.';
    const parsed = await aiChatJSON(sys, content.slice(0,60000), 3000);
    const records = Array.isArray(parsed) ? parsed : [parsed];
    const db = ensureRateDb();
    for (const r of records) db.records.push(r);
    saveRates(db);
    res.json({ ok:true, added: records.length });
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});

function saveRates(data){ fs.mkdirSync(DATA_DIR,{recursive:true}); fs.writeFileSync(RATES_FILE, JSON.stringify(data,null,2), 'utf8'); }

app.post('/api/ai', async function(req,res){
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ ok:false });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
  const sys = 'Ты AI-ассистент iomastavka — помощник по логистике Китай-Россия, ВЭД, таможне, ставкам, Incoterms. Отвечай на языке пользователя. Не выдумывай ставки.';
  const historyText = history.map(function(h){ return (h.role === 'assistant' ? 'Assistant: ' : 'User: ') + h.content; }).join('\n');
  const prompt = (historyText ? historyText + '\n' : '') + 'User: ' + message;
  try {
    const text = await aiChatText(sys, prompt, 1500);
    res.json({ ok:true, text });
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});

app.post('/api/customs/check', async function(req,res){
  const code = String(req.body?.code || '').replace(/\D/g,'').slice(0,10);
  if (code.length !== 10) return res.status(400).json({ ok:false, error:'Нужен 10-значный код' });
  console.log('[customs] запрос code=' + code + ' | Groq=' + (process.env.GROQ_API_KEY?'yes':'no') + ' Gemini=' + (process.env.GEMINI_API_KEY?'yes':'no') + ' DeepSeek=' + (process.env.DEEPSEEK_API_KEY?'yes':'no'));
  const t0 = Date.now();
  try {
    const sys = 'Ты специалист по ВЭД РФ и ЕАЭС с 20-летним опытом. Отвечай на русском. Давай точную и актуальную информацию по коду ТН ВЭД: описание, пошлину, НДС, акциз, таможенный сбор, маркировку Честный знак, разрешительные документы (сертификаты, декларации), запреты и ограничения. Если чего-то нет — пиши "не установлено".';
    const usr = 'Код ТН ВЭД ЕАЭС: ' + code + '\n\nВерни строго в формате (каждая строка начинается с метки):\nКОД: ' + code + '\nОПИСАНИЕ: [полное наименование товара]\nИМПОРТНАЯ ПОШЛИНА: [ставка, % или €/кг]\nНДС: [ставка, %]\nАКЦИЗ: [ставка или "нет"]\nТАМОЖЕННЫЙ СБОР: [сумма в рублях по стоимости]\nЧЕСТНЫЙ ЗНАК: [подлежит/не подлежит маркировке]\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: [сертификаты/декларации, если нужны]\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: [если есть]\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: [важные примечания]';
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Превышено время ожидания (60 сек)')), 60000));
    const text = await Promise.race([aiChatText(sys, usr, 2500), timeout]);
    const dt = Math.round((Date.now()-t0)/1000);
    console.log('[customs] OK за ' + dt + ' сек, длина=' + (text||'').length);
    if (!text || !text.trim()) throw new Error('Пустой ответ от AI');
    res.json({ ok:true, code, title:'ТН ВЭД ' + code, analysis:text });
  } catch(e){
    const dt = Math.round((Date.now()-t0)/1000);
    console.error('[customs] FAIL за ' + dt + ' сек: ' + e.message);
    res.status(502).json({ ok:false, error:e.message });
  }
});

app.post('/api/login', function(req,res){
  if (!verifyPassword(req.body?.password || '')) return res.status(401).json({ ok:false });
  res.cookie('auth','1',{httpOnly:true,secure:true,sameSite:'lax',maxAge:8*60*60*1000,path:'/'});
  res.json({ ok:true });
});
app.post('/api/logout', function(req,res){ res.clearCookie('auth',{path:'/'}); res.json({ ok:true }); });

function verifyPassword(pw){
  const raw = process.env.ADMIN_PASSWORD_HASH || fallbackHash;
  const p = raw.split('$');
  if (p.length !== 6) return false;
  try {
    const salt = Buffer.from(p[4],'hex'), expected = p[5];
    const actual = crypto.scryptSync(String(pw), salt, 32, { N:Number(p[1]), r:Number(p[2]), p:Number(p[3]), maxmem:64*1024*1024 }).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual,'hex'), Buffer.from(expected,'hex'));
  } catch(e){ return false; }
}

// Периодический прогрев каждые 6 часов
setInterval(function(){
  console.log('[prewarm] плановый (каждые 6ч)');
  prewarmArticles(5).catch(function(){});
}, 6*60*60*1000);

app.listen(PORT, function(){
  console.log('iomastavka listening on ' + PORT);
  setTimeout(function(){ if (newsCache.items.length && (!newsCache.translations || !newsCache.translations.en)){ console.log('[startup] прогрев переводов новостей...'); warmNewsTranslations().catch(function(){}); } }, 20000);
  setTimeout(function(){
    console.log('[startup] автопрогрев 5 статей в фоне...');
    fetch('http://localhost:' + PORT + '/api/articles/prewarm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ n:5 }) }).catch(function(){});
  }, 60000);
});