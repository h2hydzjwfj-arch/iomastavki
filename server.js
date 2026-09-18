// Загружаем .env файл (без внешних зависимостей)
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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
      console.log('[env] Loaded .env: ' + Object.keys(process.env).filter(function(k){return /_API_KEY|_TOKEN|_HASH/.test(k);}).join(', '));
    }
  } catch (e) { console.warn('[env] Could not load .env:', e.message); }
})();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage(), limits:{fileSize: 15*1024*1024}});

const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const RATES_FILE = process.env.RATES_FILE || path.join(DATA_DIR, 'rates.json');
const MAX_RATE_RECORDS = 5000;
const BT = String.fromCharCode(96);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const fallbackHash = 'scrypt$16384$8$1$bd186dac2105a3d050c5f769e28d25a2$51e731def6ff02e823b43cb8cfce55adcad745c5c72935ce68d875f583096288';

function safeReadRates() {
  try { return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8')); } catch (e) { return {}; }
}

function ensureRateDb() {
  const raw = safeReadRates();
  if (Array.isArray(raw)) return { version: 2, updatedAt: null, records: raw };
  if (raw && Array.isArray(raw.records)) return raw;
  const records = [];
  for (const entry of Object.entries(raw || {})) {
    const company = entry[0], v = entry[1];
    if (!v || typeof v !== 'object') continue;
    if (v.latestRate && typeof v.latestRate === 'object') records.push(Object.assign({ company: company }, v.latestRate, { source: 'legacy', updatedAt: new Date().toISOString() }));
  }
  return { version: 2, updatedAt: null, records: records };
}

function normalizeText(s) { return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }

function routeScore(record, from, to, mode, distance) {
  const a=normalizeText(from), b=normalizeText(to), rf=normalizeText(record.from), rt=normalizeText(record.to);
  let score=0;
  if (rf && (rf===a || rf.includes(a) || a.includes(rf))) score+=8;
  else if (rf && a && (rf.split(/\s+/)[0]===a.split(/\s+/)[0])) score+=3;
  if (rt && (rt===b || rt.includes(b) || b.includes(rt))) score+=8;
  else if (rt && b && (rt.split(/\s+/)[0]===b.split(/\s+/)[0])) score+=3;
  if (mode && record.mode && normalizeText(record.mode)===normalizeText(mode)) score+=5;
  if (Number.isFinite(distance) && Number(record.distanceKm)) score += Math.max(0,5-Math.abs(distance-Number(record.distanceKm))/1200);
  if (record.validUntil){const t=Date.parse(record.validUntil);if(Number.isFinite(t)&&t>=Date.now())score+=1;} else if(record.approximateAfterValidity) score+=0.25;
  return score;
}

function parseJsonLoose(text) {
  const cleaned = String(text||'').split(BT+BT+BT+'json').join('').split(BT+BT+BT).join('').trim();
  const openBraces = [cleaned.indexOf('{'), cleaned.indexOf('[')].filter(function(x){return x >= 0;});
  const start = openBraces.length ? Math.min.apply(null, openBraces) : Infinity;
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === Infinity || end < start) throw new Error('No JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function openAIFileUpload(buffer, filename, mimetype, key) {
  const form=new FormData();
  form.append('purpose','user_data');
  form.append('file', new Blob([buffer], {type: mimetype||'application/octet-stream'}), filename||'rate-file');
  const r = await fetch('https://api.openai.com/v1/files', {method:'POST', headers:{Authorization: 'Bearer ' + key}, body: form});
  const d = await r.json();
  if (!r.ok) throw new Error((d && d.error && d.error.message) || 'OpenAI file upload failed');
  return d.id;
}

async function extractRatesWithAI(opts) {
  const key = opts.key, text = opts.text, fileId = opts.fileId, note = opts.note || '';
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const prompt = 'Ты извлекаешь ставки международной логистики из КП, прайса, переписки или текста. Верни ТОЛЬКО JSON-массив объектов без markdown. Поля каждого объекта: company, from, to, mode, incoterms, distanceKm, basis (weight|volume|container|shipment|unknown), weightKg, volumeM3, rate, currency, minCharge, transitDays, validUntil, notes, source. Не выдумывай отсутствующие данные: ставь null. Если в документе несколько ставок — создай несколько объектов. rate должно быть числом только если цена однозначно указана. mode: air|road|rail|sea|multimodal. ' + (note ? ('Дополнительная информация пользователя: ' + note) : '');
  const content = [{type:'input_text', text: prompt}];
  if (fileId) content.push({type:'input_file', file_id: fileId});
  else content.push({type:'input_text', text: String(text||'')});
  const r = await fetch('https://api.openai.com/v1/responses', {method:'POST', headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify({model: model, input: [{role:'user', content: content}], max_output_tokens: 2500})});
  const d = await r.json();
  if (!r.ok) throw new Error((d && d.error && d.error.message) || 'AI extraction failed');
  const out = typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(function(o){return o.content || [];}).map(function(c){return c.text || c.value || '';}).filter(Boolean).join('\n');
  const parsed = parseJsonLoose(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function mergeRateRecords(records, sourceLabel) {
  sourceLabel = sourceLabel || 'manual';
  const db = ensureRateDb(); const now = new Date().toISOString();
  const incoming = (records||[]).filter(function(x){return x && typeof x === 'object';}).map(function(x){return Object.assign({}, x, {source: x.source || sourceLabel, updatedAt: now});});
  for (const rec of incoming) {
    const key = [normalizeText(rec.company), normalizeText(rec.from), normalizeText(rec.to), normalizeText(rec.mode), normalizeText(rec.incoterms), String(rec.weightKg||''), String(rec.volumeM3||'')].join('|');
    const idx = db.records.findIndex(function(old){return [normalizeText(old.company), normalizeText(old.from), normalizeText(old.to), normalizeText(old.mode), normalizeText(old.incoterms), String(old.weightKg||''), String(old.volumeM3||'')].join('|') === key;});
    if (idx >= 0) db.records[idx] = Object.assign({}, db.records[idx], rec, {updatedAt: now});
    else db.records.push(rec);
  }
  db.records = db.records.slice(-MAX_RATE_RECORDS);
  db.updatedAt = now;
  saveRates(db);
  return {db: db, added: incoming.length};
}

function saveRates(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RATES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function verifyPassword(password) {
  const raw = process.env.ADMIN_PASSWORD_HASH || fallbackHash;
  const p = raw.split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  const N = Number(p[1]), r = Number(p[2]), salt = Buffer.from(p[4], 'hex'), expected = p[5];
  try {
    const actual = crypto.scryptSync(String(password), salt, 32, { N: N, r: r, p: Number(p[3]), maxmem: 64 * 1024 * 1024 }).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch (e) { return false; }
}

function auth(req, res, next) {
  if (req.cookies && req.cookies.auth === '1') return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

async function fetchPexelsImage(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const q = String(query||'').trim();
  if (!q) return null;
  try {
    const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=1&orientation=landscape';
    const r = await fetch(url, { headers: { 'Authorization': key }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      return (d.photos && d.photos[0] && d.photos[0].src && (d.photos[0].src.large || d.photos[0].src.landscape || d.photos[0].src.original)) || null;
    }
  } catch (e) { console.warn('Pexels error:', e.message); }
  return null;
}

async function fetchPexelsGallery(queries, limit) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const max = Math.max(1, Math.min(Number(limit) || 3, 6));
  const seen = new Set();
  const out = [];
  for (const q of (queries || [])) {
    if (out.length >= max) break;
    const url = await fetchPexelsImage(q);
    if (url && !seen.has(url)) { seen.add(url); out.push(url); }
  }
  return out;
}

function defaultImageQueries(title) {
  const t = String(title||'').toLowerCase();
  const base = ['cargo shipping logistics', 'container port', 'warehouse cargo'];
  if (/таможен|customs|тн\s?вэд|маркиров/.test(t)) base.unshift('customs documents', 'cargo terminal');
  else if (/железнодорож|жд|rail/.test(t)) base.unshift('freight train railway', 'railway cargo');
  else if (/мор|порт|sea|ship|контейнер/.test(t)) base.unshift('container ship port', 'cargo ship');
  else if (/авиа|air|flight/.test(t)) base.unshift('air cargo plane', 'airport cargo');
  else if (/китай|china/.test(t)) base.unshift('china logistics warehouse', 'shanghai port');
  return base.slice(0, 4);
}

app.get('/', function(req,res){ res.sendFile(path.join(ROOT, 'index.html')); });
app.get('/app.js', function(req,res){ res.sendFile(path.join(ROOT, 'app.js')); });
app.get('/styles.css', function(req,res){ res.sendFile(path.join(ROOT, 'styles.css')); });
app.get('/api/health', function(req,res){ res.json({ ok: true }); });
app.get('/api/version', function(req,res){ res.json({ok:true, version:'34', build:'IOMASTAVKA_FILE_34'}); });
app.get('/api/config', function(req,res){ res.json({ weatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY), aiConfigured: Boolean(process.env.OPENAI_API_KEY), pexelsConfigured: Boolean(process.env.PEXELS_API_KEY), ftsConfigured: Boolean(process.env.API_CLOUD_FTS_TOKEN) }); });

app.get('/api/pexels/status', async function(req,res){
  const key = process.env.PEXELS_API_KEY;
  if (!key) return res.json({ok:false, error:'PEXELS_API_KEY не задан', keyLength: 0});
  try {
    const testUrl = 'https://api.pexels.com/v1/search?query=logistics&per_page=1&orientation=landscape';
    const r = await fetch(testUrl, { headers: { 'Authorization': key }, signal: AbortSignal.timeout(8000) });
    const rawText = await r.text();
    let parsed = null; try { parsed = JSON.parse(rawText); } catch(e){}
    if (!r.ok) return res.json({ok:false, status: r.status, keyLength: key.length, error: (parsed && parsed.error) || rawText.slice(0, 200)});
    const photo = parsed && parsed.photos && parsed.photos[0];
    res.json({
      ok: true, status: r.status, keyLength: key.length, keyPrefix: key.slice(0, 6) + '...',
      samplePhoto: photo ? (photo.src && (photo.src.large || photo.src.medium)) : null,
      samplePhotographer: photo && photo.photographer || null
    });
  } catch (e) {
    res.json({ok:false, error: e.message, keyLength: key ? key.length : 0});
  }
});

app.get('/api/currency', async function(req,res){
  const parseCbrXml = function(xml){
    const items = {};
    const blocks = xml.match(/<Valute\b[\s\S]*?<\/Valute>/gi) || [];
    for (const block of blocks) {
      const code = (block.match(/<CharCode>([^<]+)<\/CharCode>/i)||[])[1];
      if (!['USD','EUR','CNY'].includes(code)) continue;
      const nominal = (block.match(/<Nominal>([^<]+)<\/Nominal>/i)||[])[1];
      const value = (block.match(/<Value>([^<]+)<\/Value>/i)||[])[1];
      if (value) items[code] = {nominal: Number(String(nominal||'1').replace(',','.')) || 1, value: Number(String(value).replace(',','.'))};
    }
    const date = (xml.match(/<ValCurs[^>]*Date="([^"]+)"/i)||[])[1] || new Date().toISOString();
    return {date: date, items: items};
  };
  try {
    const official = await fetch('https://www.cbr.ru/scripts/XML_daily.asp', {headers:{'User-Agent':'iomastavka/2.0'}, signal: AbortSignal.timeout(8000)});
    if (official.ok) {
      const parsed = parseCbrXml(await official.text());
      if (parsed.items.USD && parsed.items.EUR && parsed.items.CNY) return res.json({ok:true, source:'cbr.ru', date: parsed.date, items: parsed.items});
    }
    const mirror = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {headers:{'User-Agent':'iomastavka/2.0'}, signal: AbortSignal.timeout(8000)});
    if (mirror.ok) {
      const data = await mirror.json(), items = {};
      for (const code of ['USD','EUR','CNY']) { const x = data.Valute && data.Valute[code]; if (x && x.Value) items[code] = {nominal: x.Nominal||1, value: Number(x.Value)}; }
      if (items.USD && items.EUR && items.CNY) return res.json({ok:true, source:'cbr-xml-daily.ru', date: data.Date || new Date().toISOString(), items: items});
    }
    throw new Error('CBR unavailable');
  } catch (e) { res.status(502).json({ok:false, error:'CBR unavailable'}); }
});

const CITY_ALIASES = {
 'аньян':['Anyang','CN','Хэнань','安阳'],'anyang':['Anyang','CN','Хэнань','安阳'],
 'ханьдань':['Handan','CN','Хэбэй','邯郸'],'handan':['Handan','CN','Хэбэй','邯郸'],
 'пиндиншань':['Pingdingshan','CN','Хэнань','平顶山'],'хэфэй':['Hefei','CN','Аньхой','合肥'],
 'нантонг':['Nantong','CN','Цзянсу','南通'],'наньтун':['Nantong','CN','Цзянсу','南通'],
 'чжэнчжоу':['Zhengzhou','CN','Хэнань','郑州'],'циндао':['Qingdao','CN','Шаньдун','青岛'],
 'сучжоу':['Suzhou','CN','Цзянсу','苏州'],'suzhou':['Suzhou','CN','Цзянсу','苏州'],
 'гуанчжоу':['Guangzhou','CN','Гуандун','广州'],'шанхай':['Shanghai','CN','Шанхай','上海'],
 'пекин':['Beijing','CN','Пекин','北京'],'шэньчжэнь':['Shenzhen','CN','Гуандун','深圳'],
 'тяньцзинь':['Tianjin','CN','Тяньцзинь','天津'],'чэнду':['Chengdu','CN','Сычуань','成都'],
 'чунцин':['Chongqing','CN','Чунцин','重庆'],'ухань':['Wuhan','CN','Хубэй','武汉'],
 'нанкин':['Nanjing','CN','Цзянсу','南京'],'сямэнь':['Xiamen','CN','Фуцзянь','厦门'],
 'фошань':['Foshan','CN','Гуандун','佛山'],'дунгуань':['Dongguan','CN','Гуандун','东莞'],
 'нинбо':['Ningbo','CN','Чжэцзян','宁波'],'ханчжоу':['Hangzhou','CN','Чжэцзян','杭州'],
 'чжуншань':['Zhongshan','CN','Гуандун','中山']
};

app.get('/api/cities', async function(req,res){
  const q = String(req.query.q||'').trim();
  const country = String(req.query.country||'CN').toUpperCase();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit)||30));
  const ASIA_CODES_SERVER = new Set(['CN','JP','KR','KP','MN','IN','PK','BD','NP','BT','LK','MV','AF','ID','TH','VN','MY','SG','PH','MM','KH','LA','BN','TL','KZ','UZ','KG','TJ','TM']);
  const isAsiaScope = country === 'ASIA';
  if (!q) return res.json({ok:true, results:[]});
  try {
    const alias = CITY_ALIASES[normalizeText(q)];
    const searchName = (alias && alias[0]) || q;
    const results = [];
    const add = function(x){
      if (!x) return;
      const name = x.name || x.city || x.town || x.village || x.municipality || (x.display_name && x.display_name.split(',')[0]);
      if (!name) return;
      results.push({
        name: name,
        nameEn: x.nameEn || x.name || name,
        nameZh: x.nameZh || x.name || name,
        admin1: x.admin1 || x.state || x.province || '',
        country: x.country || 'China',
        country_code: x.country_code || country,
        latitude: Number(x.latitude != null ? x.latitude : x.lat),
        longitude: Number(x.longitude != null ? x.longitude : x.lon)
      });
    };
    try {
      const u = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(searchName) + '&count=100&language=en&format=json';
      const r = await fetch(u, {headers:{'User-Agent':'iomastavka/1.0'}});
      if (r.ok) {
        const d = await r.json();
        for (const x of d.results || []) {
          if ((isAsiaScope && ASIA_CODES_SERVER.has(String(x.country_code||'').toUpperCase())) || (!isAsiaScope && x.country_code === country)) {
            add({name: x.name, nameEn: x.name, admin1: x.admin1, country: x.country, country_code: x.country_code, latitude: x.latitude, longitude: x.longitude});
          }
        }
      }
    } catch (e) {}
    if (q.length >= 1) {
      try {
        const cc = isAsiaScope ? Array.from(ASIA_CODES_SERVER).map(function(x){return x.toLowerCase();}).join(',') : country.toLowerCase();
        const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=100&countrycodes=' + cc + '&q=' + encodeURIComponent(q);
        const r = await fetch(u, {headers:{'User-Agent':'iomastavka/1.1'}});
        if (r.ok) { const d = await r.json(); for (const x of d) add(x); }
      } catch (e) {}
    }
    if (alias && (isAsiaScope || country === alias[1])) {
      add({name: alias[0], nameEn: alias[0], nameZh: alias[3], admin1: alias[2], country: 'China', country_code: 'CN', latitude: null, longitude: null});
    }
    const seen = new Set();
    const clean = results.filter(function(x){
      if (x.country_code && ((isAsiaScope && !ASIA_CODES_SERVER.has(String(x.country_code).toUpperCase())) || (!isAsiaScope && x.country_code !== country))) return false;
      const k = normalizeText(x.name + '|' + x.admin1 + '|' + x.country_code);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    clean.sort(function(a,b){
      const aa = normalizeText(a.name + ' ' + a.nameEn + ' ' + a.nameZh);
      const bb = normalizeText(b.name + ' ' + b.nameEn + ' ' + b.nameZh);
      const qq = normalizeText(q);
      const sa = aa.startsWith(qq) ? 0 : (aa.includes(qq) ? 1 : 2);
      const sb = bb.startsWith(qq) ? 0 : (bb.includes(qq) ? 1 : 2);
      return sa - sb;
    });
    res.json({ok:true, results: clean.slice(0, limit)});
  } catch (e) { res.status(502).json({ok:false, error:'city search unavailable', results:[]}); }
});

app.get('/api/geocode', async function(req,res){
  const q = String(req.query.q||'').trim();
  const country = String(req.query.country||'').toLowerCase();
  const scope = String(req.query.scope||'').toLowerCase();
  const asiaCodes = new Set(['cn','jp','kr','kp','mn','in','pk','bd','np','bt','lk','mv','af','id','th','vn','my','sg','ph','mm','kh','la','bn','tl','kz','uz','kg','tj','tm']);
  if (!q) return res.json({ok:true, results:[]});
  try {
    const cc = (scope==='asia' || scope==='china') ? 'cn,jp,kr,kp,mn,in,pk,bd,np,bt,lk,mv,af,id,th,vn,my,sg,ph,mm,kh,la,bn,tl,kz,uz,kg,tj,tm' : country;
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20' + (cc ? ('&countrycodes=' + encodeURIComponent(cc)) : '') + '&q=' + encodeURIComponent(q);
    const r = await fetch(url, {headers:{'User-Agent':'iomastavka/1.3 (logistics calculator)'}});
    if (!r.ok) throw new Error('geocode unavailable');
    const data = await r.json();
    const results = (data||[]).map(function(x){
      return {
        name: x.name || (x.display_name && x.display_name.split(',')[0]) || q,
        nameEn: x.name || (x.display_name && x.display_name.split(',')[0]) || q,
        nameZh: x.name || (x.display_name && x.display_name.split(',')[0]) || q,
        admin1: (x.address && (x.address.state || x.address.province)) || '',
        country: (x.address && x.address.country) || '',
        country_code: (x.address && x.address.country_code) || '',
        latitude: Number(x.lat),
        longitude: Number(x.lon),
        display_name: x.display_name || ''
      };
    }).filter(function(x){return Number.isFinite(x.latitude) && Number.isFinite(x.longitude);}).filter(function(x){
      return (scope==='asia' || scope==='china') ? asiaCodes.has(String(x.country_code).toLowerCase()) : (!country || String(x.country_code).toLowerCase() === country);
    });
    res.json({ok:true, results: results});
  } catch (e) { res.status(502).json({ok:false, error:'geocode unavailable', results:[]}); }
});

function stripHtml(html) {
  return String(html||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/\s+/g,' ').trim();
}

function xmlUnescape(s) {
  return String(s||'')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, function(_,n){return String.fromCodePoint(Number(n));})
    .replace(/&#x([0-9a-f]+);/gi, function(_,n){return String.fromCodePoint(parseInt(n,16));})
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/\s+/g,' ').trim();
}

function newsIsUrgent(item) {
  item = item || {};
  const text = String(item.title||'') + ' ' + String(item.description||'');
  return /(обязательн|вступ(ает|ил).*сил|запрет|ограничен|пошлин|тариф|таможенн|маркиров|санкц|лиценз|сертификат|law|mandatory|ban|restriction|customs|duty|tariff|sanction|licen[cs]|certificate)/i.test(text);
}

function parseRssItem(block){
  let title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1] || '';
  let link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1] || '';
  if (!link) link = (block.match(/<link[^>]*href="([^"]+)"/i)||[])[1] || '';
  if (!link) link = (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)||[])[1] || '';
  let desc = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)||[])[1] || '';
  if (!desc) desc = (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)||[])[1] || '';
  let pub = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)||[])[1] || '';
  if (!pub) pub = (block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)||[])[1] || '';
  if (!pub) pub = (block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)||[])[1] || '';
  const t = xmlUnescape(title), l = xmlUnescape(link).trim(), d = xmlUnescape(desc);
  if (!t) return null;
  const date = Date.parse(pub);
  return {title: t, link: l, date: Number.isFinite(date) ? new Date(date).toISOString() : new Date().toISOString(), description: d.slice(0, 500)};
}

async function fetchRss(url, sourceName){
  try {
    const r = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'}, signal: AbortSignal.timeout(12000)});
    if (!r.ok) return [];
    const xml = await r.text();
    const items = [];
    let blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    if (!blocks.length) blocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const block of blocks.slice(0, 30)) {
      const item = parseRssItem(block);
      if (item) { item.source = sourceName; items.push(item); }
    }
    return items;
  } catch (e) { return []; }
}

const newsCache = {at: 0, items: []};

function googleNewsQuery(q) {
  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=ru&gl=RU&ceid=RU:ru';
}

async function fetchNews(){
  const queries = [
    [googleNewsQuery('таможня ЕАЭС пошлина'), 'Google News · Таможня'],
    [googleNewsQuery('грузоперевозки Китай Россия'), 'Google News · Китай-Россия'],
    [googleNewsQuery('логистика Китай'), 'Google News · Логистика'],
    [googleNewsQuery('ТН ВЭД маркировка'), 'Google News · ТН ВЭД'],
    [googleNewsQuery('контейнерные перевозки'), 'Google News · Контейнеры'],
    [googleNewsQuery('железнодорожные перевозки Китай'), 'Google News · Ж/Д'],
    [googleNewsQuery('морские перевозки порт'), 'Google News · Море'],
    [googleNewsQuery('внешнеэкономическая деятельность ВЭД'), 'Google News · ВЭД']
  ];
  let all = [];
  try {
    const lists = await Promise.all(queries.map(function(q){return fetchRss(q[0], q[1]);}));
    all = lists.flat();
  } catch (e) { console.warn('Google News RSS failed:', e.message); }

  const seen = new Set();
  all = all.filter(function(x){const k = normalizeText(x.title); if (!k || seen.has(k)) return false; seen.add(k); return true;});
  all.sort(function(a,b){return new Date(b.date) - new Date(a.date);});
  let selected = all.slice(0, 30).map(function(x){return Object.assign({}, x, {urgent: newsIsUrgent(x)});});

  if (process.env.PEXELS_API_KEY) {
    try {
      const enriched = await Promise.all(selected.slice(0, 30).map(async function(item){
        if (item.image) return item;
        const queries = defaultImageQueries(item.title);
        const img = await fetchPexelsImage(queries[0]);
        return Object.assign({}, item, {image: img || ''});
      }));
      selected = enriched;
    } catch (e) { console.warn('News image enrichment failed:', e.message); }
  }

  if (selected.length < 5) {
    const key = process.env.OPENAI_API_KEY;
    if (key) {
      try {
        const prompt = 'Найди через web_search 10 актуальных новостей за последние 7 дней ТОЛЬКО по темам: международная логистика Китай→Россия, морские/ж.д./авто/авиа перевозки, таможенное оформление, ВЭД, ТН ВЭД, ЕАЭС, пошлины, маркировка, контейнерные перевозки. Верни ТОЛЬКО JSON-массив: [{"title":"...","link":"...","date":"ISO","source":"...","description":"...","urgent":false}]. Текущая дата: ' + new Date().toISOString();
        const out = await responsesRequest({key: key, preferred: process.env.OPENAI_MODEL, input: prompt, tools: [{type:'web_search', search_context_size:'medium'}], max_output_tokens: 2200});
        if (!out.error) {
          const raw = responseText(out.d);
          const parsed = parseJsonLoose(raw);
          if (Array.isArray(parsed)) {
            const aiItems = parsed.map(function(x){return Object.assign({}, x, {urgent: Boolean(x.urgent) || newsIsUrgent(x)});});
            selected = selected.concat(aiItems).slice(0, 30);
          }
        }
      } catch (e) { console.warn('AI news failed:', e.message); }
    }
  }

  newsCache.at = Date.now();
  newsCache.items = selected;
  return selected;
}

app.get('/api/news', async function(req,res){
  let items = [];
  try {
    if (Date.now() - newsCache.at < 6*60*60*1000 && newsCache.items.length) {
      items = newsCache.items;
    } else {
      items = await fetchNews();
    }
  } catch (e) {
    console.warn('News endpoint error:', e.message);
  }
  res.json({ok:true, updatedAt: newsCache.at, items: items});
});

function langName(code){return code==='zh'?'Chinese':(code==='en'?'English':(code==='tr'?'Turkish':'Russian'));}

function openAIModel(preferred){
  const m = String(preferred||'').trim();
  if (m && !/mini-test|local|chatgpt/i.test(m)) return m;
  return 'gpt-4o';
}
function aiModelCandidates(preferred){
  const first = openAIModel(preferred);
  return Array.from(new Set([first, 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini']));
}

async function responsesRequest(opts){
  const key = opts.key, preferred = opts.preferred, input = opts.input, tools = opts.tools, max_output_tokens = opts.max_output_tokens || 1000;
  let last = {status: 502, error: 'OpenAI request failed'};
  for (const model of aiModelCandidates(preferred)) {
    const body = {model: model, input: input, max_output_tokens: max_output_tokens};
    if (tools) body.tools = tools;
    try {
      const r = await fetch('https://api.openai.com/v1/responses', {method:'POST', headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify(body)});
      const raw = await r.text(); let d = {}; try {d = JSON.parse(raw);} catch (e) {}
      if (r.ok) return {r: r, d: d};
      last = {status: r.status, error: (d && d.error && d.error.message) || raw || ('Model ' + model + ' failed')};
    } catch (e) { last = {status: 502, error: e.message || 'OpenAI unavailable'}; }
  }
  return {error: last};
}

function responseText(d){
  let text = typeof d.output_text === 'string' ? d.output_text : '';
  if (!text && Array.isArray(d.output)) {
    text = d.output.flatMap(function(o){return Array.isArray(o.content) ? o.content : [];}).map(function(c){return c.text || c.value || '';}).filter(Boolean).join('\n');
  }
  return String(text||'').trim();
}

app.post('/api/realtime/call', async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  const sdp = String((req.body && req.body.sdp) || '');
  if (!sdp) return res.status(400).json({ok:false, error:'SDP offer required'});
  const language = String((req.body && req.body.language) || 'ru');
  const context = (req.body && req.body.context) || {};
  const instructions = 'You are iomastavka, a calm expert logistics assistant for China/Asia to Russia. Respond in ' + langName(language) + '. Current context: ' + JSON.stringify(context);
  try {
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview';
    const sessionConfig = {type:'realtime', model: model, instructions: instructions, output_modalities:['audio'], audio:{input:{turn_detection:{type:'server_vad', create_response: true, interrupt_response: true}}, output:{voice: process.env.OPENAI_REALTIME_VOICE || 'marin'}}};
    const form = new FormData();
    form.append('sdp', sdp);
    form.append('session', new Blob([JSON.stringify(sessionConfig)], {type:'application/json'}), 'session.json');
    const r = await fetch('https://api.openai.com/v1/realtime/calls?model=' + encodeURIComponent(model), {method:'POST', headers:{Authorization: 'Bearer ' + key}, body: form});
    const text = await r.text();
    if (!r.ok) {
      let message = text || 'Realtime call failed';
      try { const parsed = JSON.parse(text); message = (parsed && parsed.error && parsed.error.message) || (parsed && parsed.error) || message; } catch (e) {}
      return res.status(r.status).json({ok:false, error: message});
    }
    res.status(200).type('application/sdp').send(text);
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'Realtime unavailable'}); }
});

async function fetchArticleSource(url){
  if (!/^https?:\/\//i.test(url)) return '';
  try {
    const r = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 iomastavka/1.0'}, signal: AbortSignal.timeout(7000)});
    if (!r.ok) return '';
    const html = await r.text();
    return stripHtml(html).slice(0, 18000);
  } catch (e) { return ''; }
}

function parseLooseJson(text){
  try { return JSON.parse(text); } catch (e) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(text.slice(a, b+1));
    throw new Error('Invalid article JSON');
  }
}

app.post('/api/news/article', async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  const title = String((req.body && req.body.title) || '').trim();
  if (!title) return res.status(400).json({ok:false, error:'Article title required'});
  const language = String((req.body && req.body.language) || 'ru');
  const description = String((req.body && req.body.description) || '');
  const sourceText = await fetchArticleSource(String((req.body && req.body.link) || ''));
  const model = openAIModel(process.env.OPENAI_MODEL);
  const prompt = 'Create a beautiful study article. Language: ' + langName(language) + '. 700-1000 words. Return ONLY JSON: title, subtitle, content (markdown), podcast, image_query (short English query 2-4 words for stock photo), image_queries (array of 3-4 short English queries). Choose image queries relevant to: ' + title + '. News title: ' + title + '. Description: ' + description + '. Source text: ' + sourceText;
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {method:'POST', headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify({model: model, input: [{role:'user', content: prompt}], max_output_tokens: 2200})});
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ok:false, error: (d && d.error && d.error.message) || 'Article generation failed'});
    const out = d.output_text || ((d.output || []).flatMap(function(o){return o.content || [];}).map(function(c){return c.text || c.value || '';}).filter(Boolean).join('\n'));
    const article = parseLooseJson(out);
    article.source = String((req.body && req.body.source) || '');

    const mainQuery = String(article.image_query || '').trim() || defaultImageQueries(title)[0];
    const mainImage = await fetchPexelsImage(mainQuery);

    let galleryQueries = Array.isArray(article.image_queries) ? article.image_queries.filter(Boolean).slice(0, 5) : [];
    if (!galleryQueries.length) galleryQueries = defaultImageQueries(title);
    const gallery = await fetchPexelsGallery(galleryQueries, 4);
    const galleryFiltered = gallery.filter(function(x){return x && x !== mainImage;});

    article.image = mainImage || galleryFiltered[0] || '';
    article.images = galleryFiltered.slice(0, 4);

    res.json({ok:true, article: article});
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'Article unavailable'}); }
});

app.post('/api/news/article/audio', async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  const input = String((req.body && req.body.text) || '').trim().slice(0, 4096);
  if (!input) return res.status(400).json({ok:false, error:'Text required'});
  const language = String((req.body && req.body.language) || 'ru');
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {method:'POST', headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify({model:'gpt-4o-mini-tts', voice: process.env.OPENAI_TTS_VOICE || 'onyx', input: input, response_format:'mp3', speed: 0.94, instructions: 'Professional male narrator. Speak clearly in ' + langName(language) + '.'})});
    if (!r.ok) { const errText = await r.text(); return res.status(r.status).json({ok:false, error: errText || 'TTS failed'}); }
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'TTS unavailable'}); }
});

app.post('/api/login', function(req,res){
  if (!verifyPassword((req.body && req.body.password) || '')) return res.status(401).json({ok:false, error:'Неверный пароль'});
  res.cookie('auth', '1', {httpOnly: true, secure: true, sameSite: 'lax', maxAge: 8*60*60*1000, path: '/'});
  res.json({ok:true});
});
app.post('/api/logout', function(req,res){
  res.clearCookie('auth', {httpOnly: true, secure: true, sameSite: 'lax', path: '/'});
  res.json({ok:true});
});
app.get('/api/me', auth, function(req,res){ res.json({ok:true}); });

let BUILTIN_AGENTS = [];
try {
  BUILTIN_AGENTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'agents.json'), 'utf8'));
} catch (e) {
  console.warn('agents.json not found in root');
}

app.get('/api/agents', function(req,res){
  try {
    const file = path.join(DATA_DIR, 'agents.json');
    const records = JSON.parse(fs.readFileSync(file, 'utf8'));
    const out = (Array.isArray(records) && records.length) ? records : BUILTIN_AGENTS;
    res.json({ok:true, records: out});
  } catch (e) {
    res.json({ok:true, records: BUILTIN_AGENTS});
  }
});

app.get('/api/rates', function(req,res){ res.json(ensureRateDb()); });

app.get('/api/rates/recommend', function(req,res){
  const db = ensureRateDb();
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');
  const mode = String(req.query.mode || '');
  const distance = Number(req.query.distance);
  const matches = db.records.map(function(r){return Object.assign({}, r, {_score: routeScore(r, from, to, mode, Number.isFinite(distance) ? distance : null)});}).filter(function(r){return r._score > 0;}).sort(function(a,b){return b._score - a._score || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);}).slice(0, 8);
  const prices = matches.filter(function(r){return Number.isFinite(Number(r.rate));}).map(function(r){return Number(r.rate);});
  const firstWithRate = matches.find(function(r){return Number.isFinite(Number(r.rate));});
  const range = prices.length ? {min: Math.min.apply(null, prices), max: Math.max.apply(null, prices), currency: (firstWithRate && firstWithRate.currency) || 'RUB'} : null;
  res.json({ok:true, matches: matches, range: range});
});

app.put('/api/rates', auth, function(req,res){
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ok:false, error:'Некорректные данные'});
  saveRates(data);
  res.json({ok:true});
});

app.post('/api/agents/import', auth, async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ok:false, error:'Пустой текст'});
  const system = 'Ты извлекаешь данные экспедиторов из текста КП. Верни ТОЛЬКО JSON-массив без markdown. Поля: company, contact, phone, email, site, modes, transport, notes.';
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {method:'POST', headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify({model: openAIModel(process.env.OPENAI_MODEL), input: [{role:'system', content: system}, {role:'user', content: text.slice(0, 140000)}], max_output_tokens: 1400})});
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ok:false, error: (d && d.error && d.error.message) || 'AI request failed'});
    let raw = d.output_text || '';
    if (!raw && Array.isArray(d.output)) raw = d.output.flatMap(function(o){return o.content || [];}).map(function(c){return c.text || '';}).join('');
    raw = raw.split(BT).join('').split('json').join('').trim();
    const parsed = JSON.parse(raw);
    const incoming = Array.isArray(parsed) ? parsed : [];
    const file = path.join(DATA_DIR, 'agents.json');
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
    const norm = function(x){return String(x||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '');};
    const keyOf = function(x){return [norm(x.company), norm(x.contact), norm(x.email), norm(x.phone)].filter(Boolean).join('|');};
    let added = 0;
    for (const a of incoming) {
      if (!a || !String(a.company||'').trim()) continue;
      const rec = {company:String(a.company||'').trim(), contact:String(a.contact||'').trim(), phone:String(a.phone||'').trim(), email:String(a.email||'').trim(), site:String(a.site||'').trim(), modes:Array.isArray(a.modes)?a.modes.filter(Boolean):[], transport:Array.isArray(a.transport)?a.transport.filter(Boolean):[], notes:String(a.notes||'').trim()};
      const k = keyOf(rec);
      const idx = existing.findIndex(function(x){return keyOf(x) === k;});
      if (idx >= 0) existing[idx] = Object.assign({}, existing[idx], rec);
      else { existing.push(Object.assign({id: existing.reduce(function(m, x){return Math.max(m, Number(x.id) || 0);}, 0) + 1}, rec)); added++; }
    }
    fs.writeFileSync(file, JSON.stringify(existing, null, 2));
    res.json({ok:true, added: added, records: existing.slice(-Math.max(added, 1))});
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'Не удалось разобрать контакты'}); }
});

app.post('/api/rates/import-local', auth, function(req,res){
  const records = Array.isArray(req.body && req.body.records) ? req.body.records : [];
  if (!records.length) return res.status(400).json({ok:false, error:'Нет ставок'});
  try {
    const result = mergeRateRecords(records, 'browser-local');
    res.json({ok:true, added: result.added, records: result.db.records.slice(-result.added)});
  } catch (e) { res.status(500).json({ok:false, error: e.message || 'Не удалось сохранить'}); }
});

app.post('/api/rates/import', upload.single('file'), async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  if (!(req.file && req.file.buffer) && !String((req.body && req.body.text) || '').trim()) return res.status(400).json({ok:false, error:'Нужен файл или текст'});
  let fileId = null;
  try {
    if (req.file && req.file.buffer) fileId = await openAIFileUpload(req.file.buffer, req.file.originalname, req.file.mimetype, key);
    const records = await extractRatesWithAI({key: key, text: req.body && req.body.text, fileId: fileId, filename: req.file && req.file.originalname, note: req.body && req.body.note});
    const result = mergeRateRecords(records, (req.file && req.file.originalname) || 'manual');
    res.json({ok:true, added: result.added, records: result.db.records.slice(-result.added)});
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'Не удалось обработать ставку'}); }
});

app.post('/api/rates/import-text', async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ok:false, error:'Пустой текст'});
  try {
    const records = await extractRatesWithAI({key: key, text: text, note: req.body && req.body.note});
    const result = mergeRateRecords(records, 'chat-text');
    res.json({ok:true, added: result.added, records: result.db.records.slice(-result.added)});
  } catch (e) { res.status(502).json({ok:false, error: e.message || 'Не удалось обработать текст'}); }
});

app.post('/api/transcribe', upload.single('file'), async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  if (!(req.file && req.file.buffer)) return res.status(400).json({ok:false, error:'Audio file is required'});
  try {
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], {type: req.file.mimetype || 'audio/webm'}), req.file.originalname || 'voice.webm');
    form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
    if (req.body && req.body.language) form.append('language', String(req.body.language));
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {method:'POST', headers:{Authorization: 'Bearer ' + key}, body: form});
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ok:false, error: (d && d.error && d.error.message) || 'Transcription failed'});
    res.json({ok:true, text: d.text || ''});
  } catch (e) { res.status(502).json({ok:false, error:'Transcription unavailable'}); }
});

app.post('/api/tts', async function(req,res){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok:false, error:'AI key not configured'});
  const input = String((req.body && req.body.input) || '').trim();
  if (!input) return res.status(400).json({ok:false, error:'Empty input'});
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {method:'POST', headers:{'Content-Type':'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify({model:'gpt-4o-mini-tts', voice: process.env.OPENAI_TTS_VOICE || 'marin', input: input, response_format:'mp3'})});
    if (!r.ok) { const errText = await r.text(); return res.status(r.status).json({ok:false, error: errText || 'TTS request failed'}); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(buf);
  } catch (e) { res.status(502).json({ok:false, error:'TTS unavailable'}); }
});

function relevantRateRecords(db, context){
  const from = String(context.from || ''), to = String(context.to || ''), mode = String(context.transport || '').toLowerCase(), distance = Number(context.distanceKm);
  return db.records.map(function(r){return Object.assign({}, r, {_score: routeScore(r, from, to, mode, Number.isFinite(distance) ? distance : null)});}).sort(function(a,b){return b._score - a._score || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);}).slice(0, 40);
}

async function fetchAltaTnved(code){
  const url = 'https://www.alta.ru/tnved/code/' + encodeURIComponent(code) + '/';
  const r = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 iomastavka/1.0', 'Accept':'text/html,application/xhtml+xml'}});
  if (!r.ok) throw new Error('Alta HTTP ' + r.status);
  const html = await r.text();
  const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
  if (!new RegExp('\\b' + code + '\\b').test(text)) throw new Error('TN VED code not found');
  const titleMatch = text.match(new RegExp('Код ТН ВЭД\\s*' + code + '\\s+(.+?)\\s+Информация по товарному коду', 'i'));
  const dutyMatch = text.match(/Базовая ставка таможенной пошлины\s+([^]+?)\s+НДС/i);
  const vatMatch = text.match(/НДС\s+([^]+?)\s+Экспорт/i);
  const exciseMatch = text.match(/Акциз\s+([^]+?)\s+Не облагается|Акциз\s+([^]+?)(?:\s+Ставки|\s+Особенности)/i);
  return {
    source: 'Alta-Soft', url: url, code: code,
    title: (titleMatch && titleMatch[1] && titleMatch[1].trim()) || ('ТН ВЭД ЕАЭС ' + code),
    duty: (dutyMatch && dutyMatch[1] && dutyMatch[1].trim()) || 'Не удалось извлечь',
    vat: (vatMatch && vatMatch[1] && vatMatch[1].trim()) || 'Не удалось извлечь',
    excise: ((exciseMatch && (exciseMatch[1] || exciseMatch[2])) || 'Не удалось извлечь').trim()
  };
}

app.post('/api/customs/check', async function(req,res){
  const code = String((req.body && req.body.code) || '').replace(/\D/g, '').slice(0, 10);
  if (code.length !== 10) return res.status(400).json({ok:false, error:'Введите полный 10-значный код ТН ВЭД'});
  const key = process.env.OPENAI_API_KEY;
  let alta = null;
  try { alta = await fetchAltaTnved(code); } catch (e) {}
  const baseFacts = alta ? ('Альта-Софт для кода ' + code + ': название=' + alta.title + '; пошлина=' + alta.duty + '; НДС=' + alta.vat + '; акциз=' + alta.excise + '; источник=' + alta.url + '.') : 'Альта-Софт недоступен.';
  if (!key) {
    if (!alta) return res.status(503).json({ok:false, error:'OPENAI_API_KEY не настроен и Альта-Софт недоступен'});
    return res.json({ok:true, code: code, title: alta.title, analysis: 'КОД: ' + code + '\nОПИСАНИЕ: ' + alta.title + '\nИМПОРТНАЯ ПОШЛИНА: ' + alta.duty + '\nНДС: ' + alta.vat + '\nАКЦИЗ: ' + alta.excise + '\nТАМОЖЕННЫЙ СБОР: по таможенной стоимости\nЧЕСТНЫЙ ЗНАК: зависит от товара\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: зависят от товара\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: уточнять отдельно\nЕДИНИЦА ИЗМЕРЕНИЯ: уточнять по позиции\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ' + baseFacts + '\nИСТОЧНИКИ: ' + alta.url + '\nПРИМЕЧАНИЕ: окончательная классификация зависит от характеристик.'});
  }
  const prompt = 'Проверь РОВНО код ТН ВЭД ' + code + '. Используй web search на customs.gov.ru. ' + baseFacts + '\n\nОтвет строго в формате:\nКОД: ' + code + '\nОПИСАНИЕ: ...\nИМПОРТНАЯ ПОШЛИНА: ...\nНДС: ...\nАКЦИЗ: ...\nТАМОЖЕННЫЙ СБОР: ...\nЧЕСТНЫЙ ЗНАК: ТРЕБУЕТСЯ / НЕ ТРЕБУЕТСЯ / ЗАВИСИТ — почему\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: ...\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: ...\nЕДИНИЦА ИЗМЕРЕНИЯ: ...\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ...\nИСТОЧНИКИ: ...\nПРИМЕЧАНИЕ: окончательная классификация зависит от характеристик.';
  try {
    let out = await responsesRequest({key: key, preferred: process.env.OPENAI_MODEL || 'gpt-4o', input: prompt, tools: [{type:'web_search', filters:{allowed_domains:['customs.gov.ru']}}], max_output_tokens: 3500});
    if (out.error) out = await responsesRequest({key: key, preferred: 'gpt-4o', input: prompt, tools: [{type:'web_search'}], max_output_tokens: 3500});
    if (out.error) {
      if (alta) return res.json({ok:true, code: code, title: alta.title, analysis: 'КОД: ' + code + '\nОПИСАНИЕ: ' + alta.title + '\nИМПОРТНАЯ ПОШЛИНА: ' + alta.duty + '\nНДС: ' + alta.vat + '\nАКЦИЗ: ' + alta.excise + '\nТАМОЖЕННЫЙ СБОР: по таможенной стоимости\nЧЕСТНЫЙ ЗНАК: уточнять отдельно\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: уточнять отдельно\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: уточнять отдельно\nЕДИНИЦА ИЗМЕРЕНИЯ: уточнять по позиции\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ' + baseFacts + '\nИСТОЧНИКИ: ' + alta.url + '\nПРИМЕЧАНИЕ: ответ из доступной справочной страницы.'});
      return res.status(out.error.status || 502).json({ok:false, error: out.error.error || 'Не удалось проверить ТН ВЭД'});
    }
    const text = responseText(out.d);
    if (!text) throw new Error('Пустой ответ');
    res.json({ok:true, code: code, title: 'ТН ВЭД ЕАЭС ' + code, analysis: text});
  } catch (e) {
    if (alta) return res.json({ok:true, code: code, title: alta.title, analysis: 'КОД: ' + code + '\nОПИСАНИЕ: ' + alta.title + '\nИМПОРТНАЯ ПОШЛИНА: ' + alta.duty + '\nНДС: ' + alta.vat + '\nАКЦИЗ: ' + alta.excise + '\nТАМОЖЕННЫЙ СБОР: по таможенной стоимости\nЧЕСТНЫЙ ЗНАК: уточнять отдельно\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: уточнять отдельно\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: уточнять отдельно\nЕДИНИЦА ИЗМЕРЕНИЯ: уточнять по позиции\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ' + baseFacts + '\nИСТОЧНИКИ: ' + alta.url + '\nПРИМЕЧАНИЕ: ' + e.message});
    res.status(502).json({ok:false, error: e.message || 'Ошибка проверки'});
  }
});

app.post('/api/ai', async function(req,res){
  const message = String((req.body && req.body.message) || '').trim();
  const history = Array.isArray(req.body && req.body.history) ? req.body.history.slice(-10) : [];
  const context = (req.body && req.body.context && typeof req.body.context === 'object') ? req.body.context : {};
  if (!message) return res.status(400).json({ok:false, error:'Empty message'});

  const db = ensureRateDb();
  const relevantRates = relevantRateRecords(db, context);
  const system = 'Ты AI-ассистент iomastavka — помощник по логистике Китай-Россия, ВЭД, таможне, ставкам, Incoterms. Отвечай на языке пользователя. Не выдумывай ставки. База: ' + JSON.stringify(relevantRates) + '. Контекст: ' + JSON.stringify(context) + '.';

  const messages = [{role: 'system', content: system}].concat(
    history.map(function(x){return {role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content||'')};})
  ).concat([{role: 'user', content: message}]);

  if (process.env.GROQ_API_KEY) {
    try {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json'},
        body: JSON.stringify({model: 'llama-3.3-70b-versatile', messages: messages, max_tokens: 1000, temperature: 0.5})
      });
      if (gr.ok) {
        const gd = await gr.json();
        const text = gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
        if (text) return res.json({ok: true, text: text});
      }
    } catch (e) { console.warn('Groq failed:', e.message); }
  }

  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const dr = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type': 'application/json'},
        body: JSON.stringify({model: 'deepseek-chat', messages: messages, max_tokens: 1000, temperature: 0.5})
      });
      if (dr.ok) {
        const dd = await dr.json();
        const text = dd.choices && dd.choices[0] && dd.choices[0].message && dd.choices[0].message.content;
        if (text) return res.json({ok: true, text: text});
      }
    } catch (e) { console.warn('DeepSeek failed:', e.message); }
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ok: false, error: 'API keys not configured'});

  try {
    const input = messages.map(function(m){return {role: m.role, content: m.content};});
    let out = await responsesRequest({key: key, preferred: process.env.OPENAI_MODEL, input: input, tools: [{type:'web_search', search_context_size:'medium'}], max_output_tokens: 1200});
    if (out.error) out = await responsesRequest({key: key, preferred: process.env.OPENAI_MODEL, input: input, max_output_tokens: 1200});
    if (out.error) return res.status(out.error.status || 502).json({ok: false, error: out.error.error || 'AI request failed'});
    const text = responseText(out.d);
    if (!text) return res.status(502).json({ok: false, error: 'Empty response'});
    res.json({ok: true, text: text});
  } catch (e) {
    res.status(502).json({ok: false, error: e.message || 'AI unavailable'});
  }
});

app.listen(PORT, function(){ console.log('iomastavka listening on ' + PORT); });