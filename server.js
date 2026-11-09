const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { signSession, verifySession, safeFetchText } = require('./security');
const TNVED_CHECK = require('./tnved-check');
const RES = require('./resilience');
RES.installProcessGuards();
let compression = null; try { compression = require('compression'); } catch { /* необязательная зависимость */ }
const upload = multer({storage: multer.memoryStorage(), limits:{fileSize: 15*1024*1024}});

const app = RES.catchAsyncRoutes(express()); // ошибки async-маршрутов уходят в общий обработчик, а не роняют процесс
const ENV = RES.logEnv();
const aiBreaker = RES.breaker({ limit: 3, coolMs: 60000 });
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const RATES_FILE = process.env.RATES_FILE || path.join(DATA_DIR, 'rates.json');
const MAX_RATE_RECORDS = 5000;

// За прокси Render без этого все посетители выглядят как один IP, и лимит запросов общий на весь сайт.
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
// CSP пока в режиме «только отчёт»: ничего не ломает, нарушения видны в консоли браузера.
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy-Report-Only', "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
  next();
});
if (compression) app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// Общий лимит — только на API: статика (скрипты, стили, картинки) не считается, а работа в CRM делает много коротких запросов.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1500, standardHeaders: true, legacyHeaders: false }));
// Перебор пароля администратора: не более 8 попыток за 15 минут с одного IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много попыток входа. Попробуйте позже.' } });
// Эндпоинты, которые тратят деньги на OpenAI: ограничиваем частоту.
const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много запросов. Подождите несколько минут.' } });
const importLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много импортов. Попробуйте позже.' } });
app.use(['/api/ai', '/api/tts', '/api/transcribe', '/api/realtime/call', '/api/news/article', '/api/customs/check'], aiLimiter);
app.use(['/api/rates/import', '/api/rates/import-text', '/api/agents/import'], importLimiter);
// Роли: гость / клиент / администратор (portal.js). Всё, что стоит денег или раскрывает
// контакты и ставки агентов, — только администратору.
const cloud = require('./cloud').createCloud();
// Лучшая ставка из базы для КП (тот же подбор, что и в /api/rates/recommend).
function bestRate({ from, to, mode, distance }) {
  const db = ensureRateDb();
  const term = String(arguments[0]?.incoterms || 'FOB');
  const m = db.records.map(r => { const x = rateWithIncoterm(r, term); return x ? { ...x, _score: routeScore(x, from, to, mode, Number.isFinite(distance) ? distance : null) } : null; })
    .filter(r => r && rateRouteMatches(r, from, to, mode) && r.rate != null && Number.isFinite(Number(r.rate)) && Number(r.rate) > 0)
    .sort((a, b) => b._score - a._score || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return m[0] || null;
}
const portal = require('./portal').setup(app, { verifySession, DATA_DIR, upload, rateLimit, cloud, engine: q => bestRate(q), mergeRates: (recs, src) => mergeRateRecords(recs, src), rates: () => cbrRatesToday(), fetchTnved: code => TNVED_CHECK.fetchTnved(code),
  agents: () => { try { const r = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'agents.json'), 'utf8')); return Array.isArray(r) && r.length ? r : BUILTIN_AGENTS; } catch { return BUILTIN_AGENTS; } },
  // ИИ для разбора инвойсов и упаковочных листов (если задан OPENAI_API_KEY)
  ai: { enabled: () => !!process.env.OPENAI_API_KEY && aiBreaker.allow(), state: () => aiBreaker.state(), run: async (input, o = {}) => { const out = await responsesRequest({ key: process.env.OPENAI_API_KEY, preferred: process.env.OPENAI_MODEL, input, max_output_tokens: o.maxTokens || 8000, timeoutMs: o.timeoutMs || 120000 }); if (out.error) throw Object.assign(new Error(out.error.error || 'AI error'), { status: out.error.status }); return responseText(out.d); } } });
app.use(['/api/agents', '/api/agents/import', '/api/rates/import', '/api/rates/import-text', '/api/rates/import-local',
  '/api/ai', '/api/tts', '/api/transcribe', '/api/realtime/call', '/api/customs/check', '/api/news/article/audio'], portal.admin);
require('./tools-api').setup(app, { rateLimit, admin: portal.admin }); // инструменты логиста — только для сотрудников (администратор)
app.get('/api/rates', portal.admin);
app.put('/api/rates', portal.admin);

const fallbackHash = 'scrypt$16384$8$1$bd186dac2105a3d050c5f769e28d25a2$51e731def6ff02e823b43cb8cfce55adcad745c5c72935ce68d875f583096288';

function safeReadRates() {
  // Сначала рабочая база (DATA_DIR, туда пишет импорт), иначе — стартовая база из репозитория.
  try { return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8')); } catch {}
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'rates.json'), 'utf8')); } catch { return {}; }
}

function ensureRateDb() {
  const raw = safeReadRates();
  if (Array.isArray(raw)) return { version: 2, updatedAt: null, records: raw };
  if (raw && Array.isArray(raw.records)) return raw;
  const records = [];
  for (const [company, v] of Object.entries(raw || {})) {
    if (!v || typeof v !== 'object') continue;
    if (v.latestRate && typeof v.latestRate === 'object') records.push({ company, ...v.latestRate, source: 'legacy', updatedAt: new Date().toISOString() });
  }
  return { version: 2, updatedAt: null, records };
}
function normalizeText(s='') { return String(s).toLowerCase().replace(/ё/g,'е').normalize('NFD').replace(/([a-z])[\u0300-\u036f]+/g,'$1').normalize('NFC').trim(); }

// Синонимы названий городов из ставок. В интерфейсе город выбирают на русском,
// английском или китайском, а ставки могут храниться на другом языке.
const RATE_CITY_ALIASES = Object.freeze({
  'шанхай': 'shanghai', '上海': 'shanghai', 'shanghai': 'shanghai',
  'циндао': 'qingdao', '青岛': 'qingdao', 'qingdao': 'qingdao',
  'нинбо': 'ningbo', '宁波': 'ningbo', 'ningbo': 'ningbo',
  'наньша': 'nansha', '南沙': 'nansha', 'nansha': 'nansha',
  'сямэнь': 'xiamen', '厦门': 'xiamen', 'xiamen': 'xiamen',
  'москва': 'moscow', '莫斯科': 'moscow', 'moscow': 'moscow',
  'санкт-петербург': 'saint petersburg', 'saint petersburg': 'saint petersburg',
  'st petersburg': 'saint petersburg', '圣彼得堡': 'saint petersburg',
  'екатеринбург': 'yekaterinburg', 'yekaterinburg': 'yekaterinburg', '叶卡捷琳堡': 'yekaterinburg',
  'новосибирск': 'novosibirsk', 'novosibirsk': 'novosibirsk', '新西伯利亚': 'novosibirsk',
  'минск': 'minsk', 'minsk': 'minsk', '明斯克': 'minsk'
});
function canonicalRateCity(value) {
  const s = normalizeText(value).split(/[;,]/, 1)[0].trim().replace(/\s+/g, ' ');
  return RATE_CITY_ALIASES[s] || s;
}
function rateCityMatches(recordCity, requestedCity) {
  const a = canonicalRateCity(recordCity), b = canonicalRateCity(requestedCity);
  return !!a && !!b && a === b;
}
function canonicalRateMode(value) {
  const s = normalizeText(value);
  return s === 'auto' || s === 'road' ? 'road' : s;
}
function rateRouteMatches(record, from, to, mode) {
  return !!String(from || '').trim() && !!String(to || '').trim() &&
    rateCityMatches(record.from, from) && rateCityMatches(record.to, to) &&
    (!mode || canonicalRateMode(record.mode) === canonicalRateMode(mode));
}
function rateWithIncoterm(record, requested) {
  if (!record || record.rate == null || !Number.isFinite(Number(record.rate)) || Number(record.rate) <= 0) return null;
  const wanted = String(requested || 'FOB').trim().toUpperCase();
  const source = String(record.incoterms || '').trim().toUpperCase();
  const base = Number(record.rate);
  if (wanted === source) return { ...record, incoterms: wanted, incotermAdjustment: 0, incotermNote: '' };
  if ((wanted === 'EXW' || wanted === 'FCA')) {
    const note = String(record.notes || '');
    const m = note.match(/EXW\s*\/\s*FCA\s*:\s*\+\s*([\d\s]+(?:[.,]\d+)?)\s*(USD|EUR|RUB)\s*к\s*FOB/i);
    if (m) {
      const amount = Number(m[1].replace(/\s/g, '').replace(',', '.'));
      const currency = m[2].toUpperCase();
      if (Number.isFinite(amount) && amount > 0 && currency === String(record.currency || '').toUpperCase() && source === 'FOB') {
        return { ...record, rate: base + amount, incoterms: wanted, incotermAdjustment: amount, incotermNote: wanted + ': +' + amount + ' ' + currency + ' к ' + source };
      }
    }
  }
  // Не применяем FOB/иной базовый тариф к неподтверждённым условиям поставки.
  return null;
}
function routeScore(record, from, to, mode, distance) {
  const a=canonicalRateCity(from), b=canonicalRateCity(to), rf=canonicalRateCity(record.from), rt=canonicalRateCity(record.to);
  let score=0;
  if (rf && (rf===a || rf.includes(a) || a.includes(rf))) score+=8;
  else if (rf && a && (rf.split(/\s+/)[0]===a.split(/\s+/)[0])) score+=3;
  if (rt && (rt===b || rt.includes(b) || b.includes(rt))) score+=8;
  else if (rt && b && (rt.split(/\s+/)[0]===b.split(/\s+/)[0])) score+=3;
  if (mode && record.mode && canonicalRateMode(record.mode)===canonicalRateMode(mode)) score+=5;
  if (Number.isFinite(distance) && Number(record.distanceKm)) score += Math.max(0,5-Math.abs(distance-Number(record.distanceKm))/1200);
  if (record.validUntil){const t=Date.parse(record.validUntil);if(Number.isFinite(t)&&t>=Date.now())score+=1;} else if(record.approximateAfterValidity) score+=0.25;
  return score;
}
function parseJsonLoose(text) {
  const cleaned=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();
  const start=Math.min(...[cleaned.indexOf('{'),cleaned.indexOf('[')].filter(x=>x>=0));
  const end=Math.max(cleaned.lastIndexOf('}'),cleaned.lastIndexOf(']'));
  if(start===Infinity || end<start) throw new Error('No JSON');
  return JSON.parse(cleaned.slice(start,end+1));
}
async function openAIFileUpload(buffer, filename, mimetype, key) {
  const form=new FormData();
  form.append('purpose','user_data');
  form.append('file',new Blob([buffer],{type:mimetype||'application/octet-stream'}),filename||'rate-file');
  const r=await fetch('https://api.openai.com/v1/files',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form});
  const d=await r.json(); if(!r.ok) throw new Error(d?.error?.message||'OpenAI file upload failed');
  return d.id;
}
async function extractRatesWithAI({key, text, fileId, filename, note=''}) {
  const model=process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const prompt=`Ты извлекаешь ставки международной логистики из КП, прайса, переписки или текста. Верни ТОЛЬКО JSON-массив объектов без markdown. Поля каждого объекта: company, from, to, mode, incoterms, distanceKm, basis (weight|volume|container|shipment|unknown), weightKg, volumeM3, rate, currency, minCharge, transitDays, validUntil, notes, source. Не выдумывай отсутствующие данные: ставь null. Если в документе несколько ставок — создай несколько объектов. rate должно быть числом только если цена однозначно указана. mode: air|road|rail|sea|multimodal. ${note?`Дополнительная информация пользователя: ${note}`:''}`;
  const content=[{type:'input_text',text:prompt}];
  if(fileId) content.push({type:'input_file',file_id:fileId});
  else content.push({type:'input_text',text:String(text||'')});
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,input:[{role:'user',content}],max_output_tokens:2500})});
  const d=await r.json(); if(!r.ok) throw new Error(d?.error?.message||'AI extraction failed');
  const out=typeof d.output_text==='string'?d.output_text:(d.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||c.value||'').filter(Boolean).join('\n');
  const parsed=parseJsonLoose(out); return Array.isArray(parsed)?parsed:[parsed];
}
function mergeRateRecords(records, sourceLabel='manual') {
  const db=ensureRateDb(); const now=new Date().toISOString();
  const incoming=(records||[]).filter(x=>x&&typeof x==='object').map(x=>({...x, source:x.source||sourceLabel, updatedAt:now}));
  for(const rec of incoming){
    const key=[normalizeText(rec.company),normalizeText(rec.from),normalizeText(rec.to),normalizeText(rec.mode),normalizeText(rec.incoterms),String(rec.weightKg||''),String(rec.volumeM3||'')].join('|');
    const idx=db.records.findIndex(old=>[normalizeText(old.company),normalizeText(old.from),normalizeText(old.to),normalizeText(old.mode),normalizeText(old.incoterms),String(old.weightKg||''),String(old.volumeM3||'')].join('|')===key);
    if(idx>=0) db.records[idx]={...db.records[idx],...rec,updatedAt:now}; else db.records.push(rec);
  }
  db.records=db.records.slice(-MAX_RATE_RECORDS); db.updatedAt=now; saveRates(db); return {db, added:incoming.length};
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
    const actual = crypto.scryptSync(String(password), salt, 32, { N, r, p: Number(p[3]), maxmem: 64 * 1024 * 1024 }).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}
function auth(req, res, next) {
  // Раньше пропускала любая кука auth=1, которую можно подделать. Теперь нужна подписанная сессия.
  const sess = verifySession(req.cookies?.auth);
  if (sess && sess.role === 'admin') return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

// Страница всегда свежая, скрипты и стили кэшируются на час (в index.html они подключаются с ?v=...).
app.get('/', (req,res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(ROOT, 'index.html'), { cacheControl: false }); });
// Разделы сайта — отдельные адреса (pages.js открывает нужный раздел); остальные пути по-прежнему 404
const PAGE_PATHS = ['/raschet', '/uslugi', '/kejsy', '/tnved', '/ekspeditory', '/novosti', '/gid', '/zayavka', '/vhod', '/kabinet', '/rabota', '/akkaunt', '/vlezet', '/propis', '/obem', '/telefon', '/terminal', '/po-rossii', '/otsledit'];
app.get('/assistent', (req, res) => res.redirect(301, '/')); // ИИ-ассистент убран: вместо него — робот-помощник администратора
app.get(PAGE_PATHS, (req,res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(ROOT, 'index.html'), { cacheControl: false }); });
app.get('/app.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'app.js'), { cacheControl: false }); });
app.get('/styles.css', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'styles.css'), { cacheControl: false }); });
app.get('/theme-v3.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'theme-v3.js'), { cacheControl: false }); });
app.get('/portal-ui.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'portal-ui.js'), { cacheControl: false }); });
app.get('/routes-kb.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'routes-kb.js'), { cacheControl: false }); });
app.get('/i18n-v3.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'i18n-v3.js'), { cacheControl: false }); });
app.get('/crm-ui.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'crm-ui.js'), { cacheControl: false }); });
app.get('/kb.js', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'kb.js'), { cacheControl: false }); });
app.get('/palettes.css', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'palettes.css'), { cacheControl: false }); });
app.get('/theme-v3.css', (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, 'theme-v3.css'), { cacheControl: false }); });
// Новые модули главной и кабинета: карта-калькулятор, трекинг груза, динамика курса, экскурсия, журнал
for (const f of ['i18n-more.js', 'd3-geo.min.js', 'globe-geo.js', 'night.css', 'night.js', 'journal-ui.js', 'geo-asia.js', 'map-calc.js', 'track.js', 'rates-dyn.js', 'tour.js', 'v4.css', 'ved.js', 'contract.js', 'pages.js', 'pages.css', 'crm.css', 'crm-kit.js', 'crm-calc-ui.js', 'crm-tasks-ui.js', 'crm-clients-ui.js', 'crm-sys-ui.js', 'tnved-ui.js', 'crm-rates-ui.js', 'fact.js', 'crm-fact-ui.js', 'ui.js', 'ui.css', 'home.js', 'home.css', 'routes-map.js', 'calc-ux.js', 'calc.css', 'robot-ui.js', 'robot.css', 'site-custom.js', 'account-menu.js', 'crm-format.js', 'page-fit.js', 'route-advice.js', 'tools.js', 'tools.css', 'journey-map.js']) app.get('/' + f, (req,res) => { res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(path.join(ROOT, f), { cacheControl: false }); });
const SITE_URL = process.env.SITE_URL || 'https://iomastavki.onrender.com';
app.get('/robots.txt', (req,res) => { res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`); });
app.get('/sitemap.xml', (req,res) => { const urls = [...new Set(['/', '/raschet', '/uslugi', '/kejsy', '/tnved', '/ekspeditory', '/novosti', '/gid', '/zayavka'].concat(seoPages ? seoPages.urls() : []))]; res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${SITE_URL}${u === '/' ? '/' : u}</loc><lastmod>2026-11-06</lastmod><changefreq>${u === '/novosti' || u === '/' ? 'daily' : 'monthly'}</changefreq><priority>${u === '/' ? '1.0' : '0.7'}</priority></url>`).join('')}</urlset>`); });
let seoPages = null;
// Почему хранилище не подключилось — без значений ключей, только что не так (видно в проверке сайта и в «Работе»).
let cloudError = '';
function storageIssue() {
  if (cloud) return cloudError ? 'Supabase не отвечает: ' + cloudError.slice(0, 160) : '';
  const C = require('./cloud'), u = C.supabaseUrl(), k = C.supabaseKey(), seen = C.supabaseVarNames();
  const hint = seen.length ? ' (сайт видит переменные: ' + seen.join(', ') + ')' : ' (переменных со словом SUPABASE сайт не видит — проверьте, что они добавлены в Environment именно этого сервиса и сделан Deploy)';
  if (!u && !k) return 'нет адреса и ключа Supabase' + hint;
  if (!u) return 'нет адреса Supabase — добавьте SUPABASE_URL' + hint;
  if (!k) return 'нет секретного ключа Supabase — добавьте SUPABASE_SERVICE_KEY (Supabase → Project Settings → API Keys → Secret key, sb_secret_…; публичный publishable не подходит)' + hint;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u)) return 'адрес Supabase в неверном виде — нужно https://<проект>.supabase.co' + hint;
  return 'ключи заданы, но подключение не создано' + hint;
}
app.get('/api/health', (req,res) => res.json({ ok: true, storage: cloud && !cloudError ? 'supabase' : 'local', storageIssue: storageIssue() || undefined, uptime: Math.round(process.uptime()), ai: ENV.flags.ai ? (aiBreaker.state().ok ? 'ok' : 'paused') : 'off', bot: ENV.flags.telegramWebhook ? 'webhook' : ENV.flags.telegram ? 'token-only' : 'off' }));
app.get('/api/version', (req,res) => res.json({ok:true,version:'28',build:'IOMASTAVKA_FILE_28'}));
// Weather without API key: Open-Meteo (fixed URL, cached 10 min).
let weatherCache = { at: 0, data: null };
app.get('/api/weather', async (req,res) => {
  try {
    if (weatherCache.data && Date.now() - weatherCache.at < 10*60*1000) return res.json(weatherCache.data);
    const lat = Number(process.env.WEATHER_LAT || 55.7558), lon = Number(process.env.WEATHER_LON || 37.6173);
    const city = process.env.WEATHER_CITY || 'Москва';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day&daily=sunrise,sunset&timezone=auto&timeformat=unixtime&forecast_days=1`;
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal }); clearTimeout(t);
    if (!r.ok) throw new Error('weather upstream ' + r.status);
    const j = await r.json(); const c = j.current || {}; const code = Number(c.weather_code);
    const main = code === 0 || code === 1 ? 'Clear' : code <= 3 || code === 45 || code === 48 ? 'Clouds' : code >= 51 && code <= 57 ? 'Drizzle' : (code >= 61 && code <= 67) || (code >= 80 && code <= 82) ? 'Rain' : (code >= 71 && code <= 77) || code === 85 || code === 86 ? 'Snow' : code >= 95 ? 'Thunderstorm' : 'Clouds';
    const data = { city, main, temp: c.temperature_2m, clouds: c.cloud_cover, wind: c.wind_speed_10m, sunrise: j.daily?.sunrise?.[0], sunset: j.daily?.sunset?.[0], updatedAt: new Date().toISOString() };
    weatherCache = { at: Date.now(), data }; res.json(data);
  } catch (e) { res.status(502).json({ error: 'weather unavailable' }); }
});
app.get('/api/config', (req,res) => res.json({ weatherConfigured: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY), ftsConfigured: Boolean(process.env.API_CLOUD_FTS_TOKEN) }));

// Курсы ЦБ РФ: на сегодня или на выбранную дату (?date=YYYY-MM-DD) + динамика за 30 дней для мини-графиков.
const CBR_IDS = { USD: 'R01235', EUR: 'R01239', CNY: 'R01375' };
const curCache = new Map();
const pad2 = n => String(n).padStart(2, '0');
const cbrDate = d => `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
const numRu = v => Number(String(v || '').replace(/\s/g, '').replace(',', '.'));
function parseCbrDaily(xml) {
  const items = {};
  for (const block of xml.match(/<Valute\b[\s\S]*?<\/Valute>/gi) || []) {
    const code = (block.match(/<CharCode>([^<]+)<\/CharCode>/i) || [])[1];
    if (!CBR_IDS[code]) continue;
    const nominal = numRu((block.match(/<Nominal>([^<]+)<\/Nominal>/i) || [])[1]) || 1;
    const value = numRu((block.match(/<Value>([^<]+)<\/Value>/i) || [])[1]);
    if (value) items[code] = { nominal: 1, value: +(value / nominal).toFixed(4) };
  }
  const date = (xml.match(/<ValCurs[^>]*Date="([^"]+)"/i) || [])[1] || '';
  return { date, items };
}
function parseCbrDynamic(xml) {
  const out = [];
  for (const rec of xml.match(/<Record\b[\s\S]*?<\/Record>/gi) || []) {
    const date = (rec.match(/Date="([^"]+)"/) || [])[1];
    const nominal = numRu((rec.match(/<Nominal>([^<]+)<\/Nominal>/i) || [])[1]) || 1;
    const value = numRu((rec.match(/<Value>([^<]+)<\/Value>/i) || [])[1]);
    if (date && value) out.push({ date, value: +(value / nominal).toFixed(4) });
  }
  return out;
}
async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'iomastavka/2.0' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('upstream ' + r.status);
  return r.text();
}
// Курсы ЦБ на сегодня для калькулятора ВЭД и финансов сделки (кеш 30 минут). IOMA_FIXED_RATES — только для автотестов.
let cbrToday = { at: 0, data: null };
async function cbrRatesToday() {
  if (process.env.IOMA_FIXED_RATES) { try { return { date: 'тест', rates: JSON.parse(process.env.IOMA_FIXED_RATES) }; } catch {} }
  if (cbrToday.data && Date.now() - cbrToday.at < 30 * 60 * 1000) return cbrToday.data;
  let data = null;
  try { const p = parseCbrDaily(await fetchText('https://www.cbr.ru/scripts/XML_daily.asp')); if (p.items.USD) { const rates = {}; for (const k of Object.keys(p.items)) rates[k] = p.items[k].value; data = { date: p.date, rates }; } } catch {}
  if (!data) { try { const j = JSON.parse(await fetchText('https://www.cbr-xml-daily.ru/daily_json.js')); const rates = {}; for (const k of Object.keys(CBR_IDS)) { const x = j.Valute && j.Valute[k]; if (x && x.Value) rates[k] = +(x.Value / (x.Nominal || 1)).toFixed(4); } if (rates.USD) { const d = new Date(j.Date); data = { date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`, rates }; } } catch {} }
  if (data) cbrToday = { at: Date.now(), data };
  return data || (cbrToday.data || { date: '', rates: {} });
}
app.get('/api/currency', async (req,res) => {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  let day = today;
  if (req.query.date) {
    const m = String(req.query.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return res.status(400).json({ ok: false, error: 'Дата в формате ГГГГ-ММ-ДД' });
    day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (isNaN(day) || day < new Date(Date.UTC(1993, 0, 1)) || day > new Date(today.getTime() + 864e5)) return res.status(400).json({ ok: false, error: 'Выберите дату с 1993 года по завтрашний день' });
  }
  const key = day.toISOString().slice(0, 10), isToday = key === today.toISOString().slice(0, 10);
  const hit = curCache.get(key);
  if (hit && (Date.now() - hit.at < (isToday ? 30 * 60 * 1000 : 7 * 864e5))) return res.json(hit.data);
  let data = null;
  try {
    const parsed = parseCbrDaily(await fetchText('https://www.cbr.ru/scripts/XML_daily.asp' + (req.query.date ? '?date_req=' + cbrDate(day) : '')));
    if (parsed.items.USD && parsed.items.EUR && parsed.items.CNY) data = { ok: true, source: 'cbr.ru', date: parsed.date, items: parsed.items };
  } catch {}
  if (!data) {
    try {
      const url = req.query.date ? `https://www.cbr-xml-daily.ru/archive/${day.getUTCFullYear()}/${pad2(day.getUTCMonth() + 1)}/${pad2(day.getUTCDate())}/daily_json.js` : 'https://www.cbr-xml-daily.ru/daily_json.js';
      const j = JSON.parse(await fetchText(url)), items = {};
      for (const code of Object.keys(CBR_IDS)) { const x = j.Valute && j.Valute[code]; if (x && x.Value) items[code] = { nominal: 1, value: +(x.Value / (x.Nominal || 1)).toFixed(4), prev: x.Previous ? +(x.Previous / (x.Nominal || 1)).toFixed(4) : undefined }; }
      if (items.USD && items.EUR && items.CNY) { const d = new Date(j.Date); data = { ok: true, source: 'cbr-xml-daily.ru', date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`, items }; }
    } catch {}
  }
  if (!data) return res.status(502).json({ ok: false, error: req.query.date ? 'Нет курса ЦБ на эту дату — попробуйте другую' : 'CBR unavailable' });
  // Динамика за 30 дней до выбранной даты (для мини-графиков и изменения за день).
  try {
    const from = new Date(day.getTime() - 30 * 864e5);
    const series = await Promise.all(Object.entries(CBR_IDS).map(async ([code, id]) => [code, parseCbrDynamic(await fetchText(`https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${cbrDate(from)}&date_req2=${cbrDate(day)}&VAL_NM_RQ=${id}`))]));
    data.series = {};
    for (const [code, list] of series) if (list.length > 1) {
      data.series[code] = list.map(x => x.value);
      const it = data.items[code]; if (it && it.prev == null) { const i = list.findIndex(x => Math.abs(x.value - it.value) < 1e-4); const p = i > 0 ? list[i - 1] : list[list.length - 2]; if (p) it.prev = p.value; }
    }
  } catch {}
  curCache.set(key, { at: Date.now(), data });
  if (curCache.size > 200) curCache.delete(curCache.keys().next().value);
  res.json(data);
});

// Динамика курса за период: /api/currency/dynamics?code=CNY&from=2026-01-01&to=2026-11-06
// (ЦБ РФ, XML_dynamic). KZT и KRW показываем за 100 тенге и 1000 вон — как в официальной таблице ЦБ.
const DYN_IDS = { ...CBR_IDS, KZT: 'R01335', KRW: 'R01815' };
const DYN_NOMINAL = { KZT: 100, KRW: 1000 };
const dynCache = new Map();
app.get('/api/currency/dynamics', async (req, res) => {
  const code = String(req.query.code || 'CNY').toUpperCase();
  if (!DYN_IDS[code]) return res.status(400).json({ ok: false, error: 'Валюта: ' + Object.keys(DYN_IDS).join(', ') });
  const parse = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const to = parse(req.query.to) || today, from = parse(req.query.from) || new Date(to.getTime() - 30 * 864e5);
  if (isNaN(from) || isNaN(to) || from >= to) return res.status(400).json({ ok: false, error: 'Начало периода должно быть раньше конца' });
  if (from < new Date(Date.UTC(1993, 0, 1)) || to > new Date(today.getTime() + 864e5)) return res.status(400).json({ ok: false, error: 'Выберите даты с 1993 года по завтрашний день' });
  if (to - from > 30 * 366 * 864e5) return res.status(400).json({ ok: false, error: 'Слишком длинный период: не больше 30 лет' });
  const key = code + from.toISOString().slice(0, 10) + to.toISOString().slice(0, 10);
  const fresh = to >= today ? 30 * 60 * 1000 : 7 * 864e5, hit = dynCache.get(key);
  if (hit && Date.now() - hit.at < fresh) return res.json(hit.data);
  let list;
  try { list = parseCbrDynamic(await fetchText(`https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${cbrDate(from)}&date_req2=${cbrDate(to)}&VAL_NM_RQ=${DYN_IDS[code]}`)); }
  catch { return res.status(502).json({ ok: false, error: 'ЦБ сейчас не отвечает — попробуйте через минуту' }); }
  if (!list.length) return res.status(404).json({ ok: false, error: 'За этот период у ЦБ нет курса ' + code });
  const nom = DYN_NOMINAL[code] || 1;
  const points = list.map(x => { const [d, m, y] = x.date.split('.'); return { d: `${y}-${m}-${d}`, v: +(x.value * nom).toFixed(4) }; });
  const vals = points.map(p => p.v), first = vals[0], last = vals[vals.length - 1];
  const data = { ok: true, code, nominal: nom, from: points[0].d, to: points[points.length - 1].d, points, min: Math.min(...vals), max: Math.max(...vals), first, last, change: +(last - first).toFixed(4), changePct: +((last - first) / first * 100).toFixed(2) };
  dynCache.set(key, { at: Date.now(), data }); if (dynCache.size > 300) dynCache.delete(dynCache.keys().next().value);
  res.json(data);
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
 'чжуншань':['Zhongshan','CN','Гуандун','中山'],'сучжо́у':['Suzhou','CN','Цзянсу','苏州']
};
app.get('/api/cities', async (req,res) => {
  const q=String(req.query.q||'').trim(), country=String(req.query.country||'CN').toUpperCase(), limit=Math.min(100,Math.max(1,Number(req.query.limit)||30));
  const ASIA_CODES_SERVER=new Set(['CN','JP','KR','KP','MN','IN','PK','BD','NP','BT','LK','MV','AF','ID','TH','VN','MY','SG','PH','MM','KH','LA','BN','TL','KZ','UZ','KG','TJ','TM']);
  const isAsiaScope=country==='ASIA';
  const allowedCodes=isAsiaScope?ASIA_CODES_SERVER:new Set([country]);
  if(!q) return res.json({ok:true,results:[]});
  try{
    const alias=CITY_ALIASES[normalizeText(q)]; const searchName=alias?.[0]||q; const results=[];
    const add=(x)=>{if(!x)return;const name=x.name||x.city||x.town||x.village||x.municipality||x.display_name?.split(',')[0];if(!name)return;results.push({name,nameEn:x.nameEn||x.name||name,nameZh:x.nameZh||x.name||name,admin1:x.admin1||x.state||x.province||'',country:x.country||'China',country_code:x.country_code||country,latitude:Number(x.latitude??x.lat),longitude:Number(x.longitude??x.lon)})};
    try{const u=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=100&language=en&format=json`;const r=await fetch(u,{headers:{'User-Agent':'iomastavastka/1.0'}});if(r.ok){const d=await r.json();for(const x of d.results||[]){if((isAsiaScope&&ASIA_CODES_SERVER.has(String(x.country_code||'').toUpperCase()))||(!isAsiaScope&&x.country_code===country))add({name:x.name,nameEn:x.name,admin1:x.admin1,country:x.country,country_code:x.country_code,latitude:x.latitude,longitude:x.longitude})}}}catch{}
    if(q.length>=1){try{const cc=isAsiaScope?[...ASIA_CODES_SERVER].map(x=>x.toLowerCase()).join(','):country.toLowerCase(); const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=100&countrycodes=${cc}&q=${encodeURIComponent(q)}`;const r=await fetch(u,{headers:{'User-Agent':'iomastavka/1.1'}});if(r.ok){const d=await r.json();for(const x of d)add(x)}}catch{}}
    if(alias && (isAsiaScope||country===alias[1])) add({name:alias[0],nameEn:alias[0],nameZh:alias[3],admin1:alias[2],country:'China',country_code:'CN',latitude:null,longitude:null});
    const seen=new Set(); const clean=results.filter(x=>{if(x.country_code&&((isAsiaScope&&!ASIA_CODES_SERVER.has(String(x.country_code).toUpperCase()))||(!isAsiaScope&&x.country_code!==country)))return false;const k=normalizeText(`${x.name}|${x.admin1}|${x.country_code}`);if(seen.has(k))return false;seen.add(k);return true});
    clean.sort((a,b)=>{const aa=normalizeText(`${a.name} ${a.nameEn} ${a.nameZh}`),bb=normalizeText(`${b.name} ${b.nameEn} ${b.nameZh}`),qq=normalizeText(q);const sa=aa.startsWith(qq)?0:aa.includes(qq)?1:2,sb=bb.startsWith(qq)?0:bb.includes(qq)?1:2;return sa-sb});
    res.json({ok:true,results:clean.slice(0,limit)});
  }catch{res.status(502).json({ok:false,error:'city search unavailable',results:[]});}
});

app.get('/api/geocode', async (req,res) => {
  const q=String(req.query.q||'').trim(), country=String(req.query.country||'').toLowerCase(), scope=String(req.query.scope||'').toLowerCase();
  const asiaCodes=new Set(['cn','jp','kr','kp','mn','in','pk','bd','np','bt','lk','mv','af','id','th','vn','my','sg','ph','mm','kh','la','bn','tl','kz','uz','kg','tj','tm']);
  if(!q)return res.json({ok:true,results:[]});
  try{
    const cc=scope==='asia'||scope==='china'?'cn,jp,kr,kp,mn,in,pk,bd,np,bt,lk,mv,af,id,th,vn,my,sg,ph,mm,kh,la,bn,tl,kz,uz,kg,tj,tm':country;
    const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20${cc?`&countrycodes=${encodeURIComponent(cc)}`:''}&q=${encodeURIComponent(q)}`;
    const r=await fetch(url,{headers:{'User-Agent':'iomastavka/1.3 (logistics calculator)'}}); if(!r.ok)throw new Error('geocode unavailable');
    const data=await r.json();
    const results=(data||[]).map(x=>({name:x.name||x.display_name?.split(',')[0]||q,nameEn:x.name||x.display_name?.split(',')[0]||q,nameZh:x.name||x.display_name?.split(',')[0]||q,admin1:x.address?.state||x.address?.province||'',country:x.address?.country||'',country_code:x.address?.country_code||'',latitude:Number(x.lat),longitude:Number(x.lon),display_name:x.display_name||''})).filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)).filter(x=>scope==='asia'||scope==='china'?asiaCodes.has(String(x.country_code).toLowerCase()):(!country||String(x.country_code).toLowerCase()===country));
    res.json({ok:true,results});
  }catch{res.status(502).json({ok:false,error:'geocode unavailable',results:[]});}
});


function stripHtml(html='') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/\s+/g,' ').trim();
}
function xmlUnescape(s=''){return stripHtml(String(s)).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function newsIsUrgent(item={}) {
  const text=String(item.title||'')+' '+String(item.description||'');
  return /(обязательн|вступ(ает|ил).*сил|запрет|ограничен|пошлин|тариф|таможенн|маркиров|санкц|лиценз|сертификат|электронн.*транспортн|транспортн.*накладн|law|mandatory|ban|restriction|customs|duty|tariff|sanction|licen[cs]|certificate)/i.test(text);
}
async function fetchRss(url, sourceName){
  try{
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 iomastavka news/28'},signal:AbortSignal.timeout(9000)});
    if(!r.ok)return [];
    const xml=await r.text(); const items=[];
    const blocks=xml.match(/<item[\s\S]*?<\/item>/gi)||[];
    for(const block of blocks.slice(0,20)){
      const title=(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
      const link=(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1]||'';
      const desc=(block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)||[])[1]||'';
      const pub=(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)||[])[1]||'';
      const t=xmlUnescape(title), l=xmlUnescape(link).trim(), d=xmlUnescape(desc);
      if(!t)continue;
      const date=Date.parse(pub); items.push({title:t,link:l,date:Number.isFinite(date)?new Date(date).toISOString():new Date().toISOString(),source:sourceName,description:d.slice(0,500)});
    }
    return items;
  }catch{return []}
}
async function fetchNews(){
  const queries=[
    ['https://news.google.com/rss/search?q='+encodeURIComponent('логистика Китай Россия таможня')+'&hl=ru&gl=RU&ceid=RU:ru','Логистика · Китай / Россия'],
    ['https://news.google.com/rss/search?q='+encodeURIComponent('таможня ЕАЭС пошлина маркировка')+'&hl=ru&gl=RU&ceid=RU:ru','Таможня · ЕАЭС'],
    ['https://news.google.com/rss/search?q='+encodeURIComponent('электронная транспортная накладная Россия')+'&hl=ru&gl=RU&ceid=RU:ru','Транспортные документы · Россия'],
    ['https://news.google.com/rss/search?q='+encodeURIComponent('China Russia freight rail sea air logistics')+'&hl=en&gl=US&ceid=US:en','Asia logistics'],
    ['https://news.google.com/rss/search?q='+encodeURIComponent('контейнерные перевозки Китай ставки')+'&hl=ru&gl=RU&ceid=RU:ru','Ставки и контейнеры'],
    ['https://news.google.com/rss/search?q='+encodeURIComponent('Забайкальск OR Владивосток порт контейнеры')+'&hl=ru&gl=RU&ceid=RU:ru','Погранпереходы и порты'],
    ['https://news.google.com/rss/search?q='+encodeURIComponent('ФТС импорт изменения правил')+'&hl=ru&gl=RU&ceid=RU:ru','Таможня · ФТС']
  ];
  const lists=await Promise.all(queries.map(([u,s])=>fetchRss(u,s)));
  let all=lists.flat();
  // Keep recent items first and remove duplicate headlines.
  const seen=new Set();
  all=all.filter(x=>{const k=normalizeText(x.title);if(!k||seen.has(k))return false;seen.add(k);return true});
  all.sort((a,b)=>new Date(b.date)-new Date(a.date));
  // Сначала свежие (2 недели), затем добираем до 18 материалов за 2 месяца — лента не бывает пустой.
  const age=x=>Date.now()-new Date(x.date).getTime();
  const recent=all.filter(x=>age(x)<=14*864e5), older=all.filter(x=>age(x)>14*864e5&&age(x)<=60*864e5);
  const selected=recent.concat(recent.length<18?older.slice(0,18-recent.length):[]).slice(0,30).map(x=>({...x,urgent:newsIsUrgent(x)}));
  if(!selected.length){
    const key=process.env.OPENAI_API_KEY;
    if(key){
      const prompt=`Собери 10 свежих новостей за последние 7 дней для сайта iomastavka: международная логистика Азия/Китай→Россия, перевозки, ВЭД, таможня ЕАЭС/РФ, документы и обязательные требования. Приоритет: официальные источники ФТС/ЕЭК/Минтранс/правительство, затем надежные отраслевые СМИ. Верни только JSON-массив объектов: title,link,date,source,description,urgent. urgent=true только для реально значимых изменений правил, запретов, пошлин, обязательных требований или таможенных решений. Текущая дата: ${new Date().toISOString()}`;
      const out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input:[{role:'user',content:prompt}],tools:[{type:'web_search',search_context_size:'medium'}],max_output_tokens:2200});
      if(!out.error){try{const raw=responseText(out.d);const parsed=parseJsonLoose(raw);if(Array.isArray(parsed))selected.push(...parsed.map(x=>({...x,urgent:Boolean(x.urgent)||newsIsUrgent(x)})).slice(0,24));}catch{}}
    }
  }
  newsCache.at=Date.now(); newsCache.items=selected;
  return selected;
}
const newsCache={at:0,items:[]};

seoPages = require('./seo').setup(app, { site: () => SITE_URL, newsItems: async () => (Date.now()-newsCache.at < 6*60*60*1000 && newsCache.items.length) ? newsCache.items : await fetchNews() });
app.get('/api/news', async (req,res) => {
  try {
    const items = (Date.now()-newsCache.at < 6*60*60*1000 && newsCache.items.length) ? newsCache.items : await fetchNews();
    res.json({ok:true, updatedAt:newsCache.at, items});
  } catch { res.status(502).json({ok:false,error:'news unavailable',items:[]}); }
});


function langName(code){return ({zh:'Chinese',en:'English',tr:'Turkish',de:'German',fr:'French'})[code]||'Russian';}

function openAIModel(preferred){
  const m=String(preferred||'').trim();
  // API model IDs are different from internal ChatGPT model labels. GPT-5.6 Luna is a valid API model.
  if(m && !/mini-test|local|chatgpt/i.test(m)) return m;
  return 'gpt-5';
}
function aiModelCandidates(preferred){
  const first=openAIModel(preferred);
  return [...new Set([first,'gpt-5','gpt-4.1-mini','gpt-4o-mini'])];
}
// Запрос к ИИ: перебор моделей, общий лимит времени и «предохранитель» — при серии ошибок ИИ отдыхает,
// и ответы сразу уходят в запасной вариант вместо ожидания таймаута. Никогда не бросает исключение.
async function responsesRequest({key,preferred,input,tools,max_output_tokens=1000,timeoutMs=90000}){
  if(!key) return {error:{status:503,error:'OPENAI_API_KEY не задан'}};
  if(!aiBreaker.allow()) return {error:{status:503,error:'ИИ временно недоступен: '+(aiBreaker.state().lastError||'серия ошибок')}};
  let last={status:502,error:'OpenAI request failed'}; const deadline=Date.now()+timeoutMs;
  for(const model of aiModelCandidates(preferred)){
    const left=deadline-Date.now(); if(left<1500){last={status:504,error:'ИИ не ответил вовремя'};break;}
    const body={model,input,max_output_tokens};
    if(tools) body.tools=tools;
    try{
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify(body),signal:AbortSignal.timeout(left)});
      const raw=await r.text(); let d={}; try{d=JSON.parse(raw)}catch{}
      if(r.ok){aiBreaker.success();return {r,d};}
      last={status:r.status,error:d?.error?.message||raw.slice(0,300)||`Model ${model} failed`};
      if(r.status===401||r.status===403||(r.status===429&&/quota|billing|insufficient/i.test(last.error)))break; // ключ или баланс — другие модели не помогут
    }catch(e){last={status:e.name==='TimeoutError'||e.name==='AbortError'?504:502,error:e.name==='TimeoutError'?'ИИ не ответил вовремя':(e.message||'OpenAI unavailable')};}
  }
  aiBreaker.failure(last);
  return {error:last};
}
function responseText(d){
  let text=typeof d?.output_text==='string'?d.output_text:'';
  if(!text&&Array.isArray(d?.output)) text=d.output.flatMap(o=>Array.isArray(o.content)?o.content:[]).map(c=>c.text||c.value||'').filter(Boolean).join('\n');
  return String(text||'').trim();
}

app.post('/api/realtime/call', async (req,res)=>{
  const key=process.env.OPENAI_API_KEY; if(!key)return res.status(503).json({ok:false,error:'AI key not configured'});
  const sdp=String(req.body?.sdp||''); if(!sdp)return res.status(400).json({ok:false,error:'SDP offer required'});
  const language=String(req.body?.language||'ru'); const context=req.body?.context||{};
  const instructions=`You are iomastavka, a calm expert logistics assistant for China/Asia to Russia. Speak naturally like a premium OpenAI voice assistant. Respond in ${langName(language)} unless the user asks for another language. Keep answers concise but useful. You can discuss logistics, Incoterms, customs, transport, rates, cities and the calculator context. Never invent rates. Current calculator context: ${JSON.stringify(context)}`;
  try{
    const model=process.env.OPENAI_REALTIME_MODEL||'gpt-realtime-2.1';
    const form=new FormData(); form.append('sdp',sdp); form.append('session',new Blob([JSON.stringify({type:'realtime',model,instructions,output_modalities:['audio'],audio:{input:{turn_detection:{type:'server_vad',create_response:true,interrupt_response:true}},output:{voice:process.env.OPENAI_REALTIME_VOICE||'marin'}}})],{type:'application/json'}),'session.json');
    const r=await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form});
    const text=await r.text();
    if(!r.ok) {
      let message=text||'Realtime call failed';
      try { const parsed=JSON.parse(text); message=parsed?.error?.message||parsed?.error||message; } catch {}
      return res.status(r.status).json({ok:false,error:message});
    }
    // The Realtime WebRTC endpoint returns the SDP answer as plain text.
    res.status(200).type('application/sdp').send(text);
  }catch(e){res.status(502).json({ok:false,error:e.message||'Realtime unavailable'});}
});

async function fetchArticleSource(url){
  if(!/^https?:\/\//i.test(url))return '';
  // Защита от SSRF: адрес приходит от посетителя, поэтому закрытые и внутренние адреса запрещены.
  try{const html=await safeFetchText(url,{headers:{'User-Agent':'Mozilla/5.0 iomastavka/1.0'},timeoutMs:7000,maxBytes:1000000});return stripHtml(html).slice(0,18000);}catch{return '';}
}
function parseLooseJson(text){try{return JSON.parse(text)}catch{const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(text.slice(a,b+1));throw new Error('Invalid article JSON')}}
app.post('/api/news/article', async(req,res)=>{
  const key=process.env.OPENAI_API_KEY;if(!key)return res.status(503).json({ok:false,error:'AI key not configured'});
  const title=String(req.body?.title||'').trim(); if(!title)return res.status(400).json({ok:false,error:'Article title required'});
  const language=String(req.body?.language||'ru'); const sourceText=await fetchArticleSource(String(req.body?.link||''));
  const model=openAIModel(process.env.OPENAI_MODEL);
  const prompt=`Create a beautiful, self-contained study article from the supplied news item. If the source page text is empty or inaccessible, use the supplied title and description only and clearly avoid unsupported specifics; still produce a useful explanatory article rather than an error. Language: ${langName(language)}. Do not tell the reader to visit another site. Explain the event, logistics/customs implications, key terms, practical takeaways and a short "what to watch next" section. Make it useful for someone learning international logistics. 700-1000 words. Return ONLY JSON with keys title, subtitle, content, podcast. content must be markdown text with headings; podcast is a natural spoken script under 3500 characters. Preserve factual uncertainty and never invent numbers not supported by the source. News title: ${title}. Source: ${String(req.body?.source||'')}. Description: ${String(req.body?.description||'')}. Source page text (may be empty): ${sourceText}`;
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,input:[{role:'user',content:prompt}],max_output_tokens:2200})});
    const d=await r.json();if(!r.ok)return res.status(r.status).json({ok:false,error:d?.error?.message||'Article generation failed'});
    const out=d.output_text||((d.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||c.value||'').filter(Boolean).join('\\n'));
    const a=parseLooseJson(out); a.source=String(req.body?.source||''); a.image=String(req.body?.image||''); res.json({ok:true,article:a});
  }catch(e){res.status(502).json({ok:false,error:e.message||'Article unavailable'});}
});
app.post('/api/news/article/audio', async(req,res)=>{
  const key=process.env.OPENAI_API_KEY;if(!key)return res.status(503).json({ok:false,error:'AI key not configured'});
  const input=String(req.body?.text||'').trim().slice(0,4096);if(!input)return res.status(400).json({ok:false,error:'Text required'});
  const language=String(req.body?.language||'ru');
  try{const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:process.env.OPENAI_TTS_VOICE||'onyx',input,response_format:'mp3',speed:.94,instructions:`Professional male narrator. Warm, confident, cinematic documentary style. Speak clearly in ${langName(language)}, with natural pauses and calm authority.`})});if(!r.ok)return res.status(r.status).json({ok:false,error:await r.text()||'TTS failed'});res.set('Content-Type','audio/mpeg');res.set('Cache-Control','no-store');res.send(Buffer.from(await r.arrayBuffer()));}catch(e){res.status(502).json({ok:false,error:e.message||'TTS unavailable'});}
});

app.post('/api/login', loginLimiter, (req,res) => {
  const login = String(req.body?.login || '').trim().toLowerCase(), password = String(req.body?.password || '');
  let payload = null;
  // Администратор входит по логину «admin» или по почте из ADMIN_EMAIL (как в прежней версии сайта).
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!login || login === 'admin' || (adminEmail && login === adminEmail)) { if (portal.adminPasswordOk(password)) payload = { role: 'admin', name: 'Администратор', sv: (portal.store.load().settings || {}).adminSv || 0 }; }
  else { const u = portal.findClient(login, password); if (u) payload = { role: 'client', uid: u.id, name: u.name, sv: u.sv || 0 }; }
  if (!payload) { portal.log(req, 'login_fail', { contact: login.slice(0, 120) }); return res.status(401).json({ ok:false, error:'Неверный логин или пароль' }); }
  { const u = payload.role === 'client' ? portal.store.load().users.find(x => x.id === payload.uid) : null;
    portal.log(req, 'login', { role: payload.role, uid: payload.uid, name: payload.name, email: u ? u.email : '', phone: u ? u.phone : '', company: u ? u.company : '', result: req.body?.remember ? 'с «Запомнить меня»' : '' }); }
  // «Запомнить меня»: клиент — 30 дней, администратор — 7 дней; иначе 8 часов.
  const ttl = req.body?.remember ? (payload.role === 'admin' ? 7 : 30) * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  res.cookie('auth', signSession(payload, Date.now(), ttl), { httpOnly:true, secure:true, sameSite:'lax', maxAge:ttl, path:'/' });
  res.json({ ok:true, role: payload.role, name: payload.name });
});
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много регистраций. Попробуйте позже.' } });
app.post('/api/register', registerLimiter, async (req,res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true, role: 'guest' }); // ловушка для ботов
  const r = await portal.registerClient(b);
  if (r.error) return res.status(r.status || 400).json({ ok: false, error: r.error });
  portal.log(req, 'register', { role: 'client', uid: r.user.id, name: r.user.name, email: r.user.email, phone: r.user.phone, company: r.user.company });
  const ttl = 30 * 24 * 60 * 60 * 1000;
  res.cookie('auth', signSession({ role: 'client', uid: r.user.id, name: r.user.name }, Date.now(), ttl), { httpOnly:true, secure:true, sameSite:'lax', maxAge:ttl, path:'/' });
  res.json({ ok: true, role: 'client', name: r.user.name });
});
app.post('/api/logout', (req,res) => {
  res.clearCookie('auth', { httpOnly:true, secure:true, sameSite:'lax', path:'/' });
  res.json({ ok:true });
});
const BUILTIN_AGENTS = [{"id":1,"company":"Multiwell","contact":"Kane","phone":"8 616 608 738 886","email":"sales344@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":2,"company":"Multiwell","contact":"Sakiya","phone":"8 619 860 070 462","email":"sales242@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":3,"company":"CR FREIGHT","contact":"Ирина Андреева","phone":"8 911 195 62 31","email":"andreeva@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":4,"company":"CR FREIGHT","contact":"Ella и другие","phone":"","email":"cs19@crfreight.cn, ella@crfreight.cn, sr16@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":5,"company":"TRANSIT, LLC","contact":"Konstantin Leonov","phone":"8 914 791 87 81","email":"k.leonov@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":6,"company":"TRANSIT, LLC","contact":"Tatyana Iskaleeva","phone":"8 908 450 11 98","email":"t.iskaleeva@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":7,"company":"TRANSIT, LLC","contact":"","phone":"","email":"directrail@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":8,"company":"Русмарин","contact":"Евгений Ермоленко","phone":"8 921 401 61 29","email":"evermolenko@rusmarine.ru","site":"www.rusmarine.ru","modes":["rail","road","air","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Авиа","Море","Море + Ж/Д"],"notes":"Сборные груза"},{"id":9,"company":"Qtavia","contact":"Anastasiia Snatkina","phone":"86 131 499 21 667","email":"a.snatkina@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":10,"company":"Qtavia","contact":"Linara Iliazova","phone":"8 936 131 23 25","email":"linara.iliazova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":11,"company":"Qtavia","contact":"Naida Azadova","phone":"8 986 749 55 92","email":"naida.azadova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":12,"company":"ФЛГ","contact":"Александр Токарев","phone":"8 906 238 85 17","email":"sales@flgrussia.com","site":"https://flgrussia.com/","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":13,"company":"РусКарго","contact":"Alina Karpova","phone":"8 981 930 24 66","email":"kas@r-cargo.com","site":"https://r-cargo.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":14,"company":"YM Trans Group","contact":"Милена Никитина","phone":"8 925 988 65 99","email":"982@ymtrans.ru","site":"www.ymtrans.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":15,"company":"JENTY","contact":"Marina Kostukovich","phone":"375 29 192 46 69","email":"m.kostukovich@jenty-spedition.com","site":"https://jenty-spedition.ru/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза"},{"id":16,"company":"Consolidator-DV LLC","contact":"Timofei Bakanovich","phone":"8 964 432 57 95","email":"import5@consolidator-dv.ru","site":"http://consolidator-dv.ru/","modes":["sea"],"transport":["Море"],"notes":"Сборные груза"},{"id":17,"company":"ТАМГА","contact":"Осипов Николай","phone":"8 985 279 69 39","email":"n.osipov@tamga80.ru","site":"https://tamga80.ru/ru","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Негабарит"},{"id":18,"company":"Green Avia","contact":"Kuzmina Maria","phone":"8 936 506 11 15","email":"sales3@avia-dostavka.com","site":"https://avia-dostavka.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":19,"company":"Sky Cargo Service","contact":"Ekaterina Ivanova","phone":"8 913 061 71 56","email":"sales10@scs-aero.ru","site":"www.scs-aero.ru","modes":["air"],"transport":["Авиа"],"notes":""},{"id":20,"company":"Альфа Транзит","contact":"Щепина Виктория","phone":"8 916 894 05 20","email":"v.shchepina@alfa-transit.com","site":"www.alfa-transit.com","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":21,"company":"Шатл Логистик / Shuttle-Logistic","contact":"Братасенко Михаил","phone":"8 999 614 64 92","email":"mb@shuttle-logistic.ru","site":"www.shuttle-logistic.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":22,"company":"Chengdu Tiechi Silk Road Supply Chain Management","contact":"Lily","phone":"8 619 115 959 752","email":"lily@tsrscm.com","site":"http://tsrscm.com/ru/","modes":["rail"],"transport":["Прямое Ж/Д"],"notes":"Сборные груза"},{"id":23,"company":"GUANGZHOU ETY TRANS INTERNATIONAL FREIGHT FORWARDING","contact":"Vera Yao","phone":"8 615 999 941 607","email":"vera@cnetytrans.com","site":"www.cnetytrans.com","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":""},{"id":24,"company":"A2","contact":"Микулин Владимир","phone":"8 913 061 71 56","email":"v.mikulin@a2-express.com","site":"a2-express.com","modes":["air"],"transport":["Авиа"],"notes":""},{"id":25,"company":"RUTENSIL Logistics","contact":"Алина","phone":"8 906 351 17 33","email":"108@rutensil.com","site":"http://rutensil.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Европа"},{"id":26,"company":"ВТХ","contact":"Станислав","phone":"8 914 077 79 26","email":"vthopr4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":27,"company":"ВТХ","contact":"Алексей","phone":"8 914 704 43 41","email":"sales4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":28,"company":"Chongqing Gudali Supply Chain Management","contact":"Logan","phone":"8 613 827 428 296","email":"logan@gdl-rail.com","site":"logan@gdl-rail.com","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":29,"company":"Вэй Трейд","contact":"Рукосуева Евгения Олеговна","phone":"8 902 981 11 04","email":"e.rukosueva@way-trade.ru","site":"https://way-trade.ru/","modes":["rail","road","multimodal"],"transport":["Прямое Ж/Д","Авто","Море + Ж/Д"],"notes":""},{"id":30,"company":"WAY GROUP","contact":"Общий","phone":"8 800 600 04 30","email":"info@wayg.ru","site":"https://www.wayg.ru/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Негабарит"},{"id":31,"company":"ФИТ, Владивосток","contact":"Маргарита","phone":"8-800-23-444-99 ext. 41501; +7-914-794-20-89","email":"NNKuznetsova@fesco.com","site":"https://www.fesco.ru/ru/","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит"},{"id":32,"company":"Нью Вэй Лоджистик","contact":"Боев Сергей","phone":"8 914 320 65 95","email":"310@newwaylogistic.ru","site":"https://newwaylogistic.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Ж/Д по России, Опасный"},{"id":33,"company":"ВЕЛЕС","contact":"Венера Рашидова","phone":"8 918 418 69 82","email":"operative2@velesforwarding.ru","site":"www.velesforwarding.ru","modes":["sea"],"transport":["Море"],"notes":"Новороссийск, Негабарит, Опасный"},{"id":34,"company":"ГАЛЕАС","contact":"Роман","phone":"8 961 520 31 25","email":"r.kuznetsov@galeasgroup.ru","site":"https://galeasgroup.ru/","modes":["sea"],"transport":["Море"],"notes":"Новороссийск"},{"id":35,"company":"Znylogistics","contact":"Maya","phone":"","email":"operator01@znylogistics.com","site":"","modes":["road"],"transport":["Авто"],"notes":"Турция"},{"id":36,"company":"РТТК","contact":"Алексей Веслополов (Чита)","phone":"8 3022 21 18 18; 8 914 464 23 32","email":"rttk888@mail.ru","site":"https://www.rttk.net/","modes":["rail","road"],"transport":["Ж/Д","Авто"],"notes":"Негабарит, Россия, Китай"},{"id":37,"company":"Tu-Tell","contact":"Вадим","phone":"375 33 3071468","email":"t14@tutell.com","site":"https://www.tutell.com/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Турция, Европа"},{"id":38,"company":"СДЕК","contact":"Палащук Владислав Сергеевич","phone":"8 924 697 72 73","email":"v.palashchuk@cdek.ru","site":"www.cdek.ru","modes":["road"],"transport":["Мелкие груза"],"notes":"Китай"},{"id":39,"company":"ИП Полчанинов Кирилл Александрович","contact":"Кирилл","phone":"7 925 991 25 75","email":"pka666@yandex.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина 42-43 куб.м."],"notes":"Россия, Москва, МО"},{"id":40,"company":"ИП Диана Куркина","contact":"Евгений","phone":"7 962 936 27 08","email":"yevgeniy-kurkin@mail.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина до 18 куб.м."],"notes":"Россия, Москва, МО"},{"id":41,"company":"Автовывоз — Алексей","contact":"Алексей","phone":"7 985 227 06 67","email":"","site":"","modes":["road"],"transport":["Автовывоз с СВХ, более 20 куб.м."],"notes":"Россия, Москва, МО"}];
app.get('/api/agents', (req,res) => { try { const file=path.join(DATA_DIR,'agents.json'); const records=JSON.parse(fs.readFileSync(file,'utf8')); const out=Array.isArray(records)&&records.length?records:BUILTIN_AGENTS; res.json({ok:true,records:out}); } catch { res.json({ok:true,records:BUILTIN_AGENTS}); } });
app.get('/api/rates', (req,res) => res.json(ensureRateDb()));
app.get('/api/rates/recommend', (req,res) => {
  const db=ensureRateDb(); const from=String(req.query.from||''), to=String(req.query.to||''), mode=String(req.query.mode||''), incoterms=String(req.query.incoterms||'FOB'); const distance=Number(req.query.distance);
  const matches=db.records.map(r=>{const x=rateWithIncoterm(r,incoterms);return x?{...x,_score:routeScore(x,from,to,mode,Number.isFinite(distance)?distance:null)}:null;}).filter(r=>r&&rateRouteMatches(r,from,to,mode)&&r.rate!=null&&Number.isFinite(Number(r.rate))&&Number(r.rate)>0).sort((a,b)=>b._score-a._score||new Date(b.updatedAt||0)-new Date(a.updatedAt||0)).slice(0,8);
  const prices=matches.filter(r=>Number.isFinite(Number(r.rate))).map(r=>Number(r.rate));
  const isAdmin = portal.roleOf(req).role === 'admin';
  // Гостям и клиентам — только ориентир: без названий агентов, контактов и внутренних заметок.
  const shown = isAdmin ? matches : matches.map(r => ({ from: r.from, to: r.to, mode: r.mode, rate: r.rate, currency: r.currency, basis: r.basis, container: r.container, transitDays: r.transitDays, incoterms: r.incoterms, incotermAdjustment: r.incotermAdjustment || 0, incotermNote: r.incotermNote || '', company: '', notes: '', approximate: true }));
  res.json({ok:true,matches:shown,range:prices.length?{min:Math.min(...prices),max:Math.max(...prices),currency:matches.find(r=>Number.isFinite(Number(r.rate)))?.currency||'RUB'}:null});
});
app.put('/api/rates', auth, (req,res) => {
  const data=req.body;
  if(!data || typeof data!=='object' || Array.isArray(data)) return res.status(400).json({ok:false,error:'Некорректные данные'});
  saveRates(data); res.json({ok:true});
});

app.post('/api/agents/import', auth, async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  const text=String(req.body?.text||'').trim();
  if(!text) return res.status(400).json({ok:false,error:'Пустой текст'});
  const system=`Ты извлекаешь данные экспедиторов из текста КП, писем, прайс-листов и контактных листов. Верни ТОЛЬКО валидный JSON-массив объектов без markdown. Поля каждого объекта: company, contact, phone, email, site, modes, transport, notes. modes допускаются только rail, road, air, sea, multimodal. transport — массив строк на языке исходного текста. Не придумывай данные. Если один и тот же человек/компания встречается несколько раз, объедини очевидные дубли. Если данных нет, оставь пустую строку/массив.`;
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:openAIModel(process.env.OPENAI_MODEL),input:[{role:'system',content:system},{role:'user',content:text.slice(0,140000)}],max_output_tokens:1400})});
    const d=await r.json(); if(!r.ok)return res.status(r.status).json({ok:false,error:d?.error?.message||'AI request failed'});
    let raw=d.output_text||''; if(!raw&&Array.isArray(d.output))raw=d.output.flatMap(o=>o.content||[]).map(c=>c.text||'').join('');
    raw=raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim(); const parsed=JSON.parse(raw); const incoming=Array.isArray(parsed)?parsed:[];
    const file=path.join(DATA_DIR,'agents.json'); let existing=[]; try{existing=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
    const norm=x=>String(x||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi,''); const keyOf=x=>[norm(x.company),norm(x.contact),norm(x.email),norm(x.phone)].filter(Boolean).join('|');
    let added=0; for(const a of incoming){if(!a||!String(a.company||'').trim())continue;const rec={company:String(a.company||'').trim(),contact:String(a.contact||'').trim(),phone:String(a.phone||'').trim(),email:String(a.email||'').trim(),site:String(a.site||'').trim(),modes:Array.isArray(a.modes)?a.modes.filter(Boolean):[],transport:Array.isArray(a.transport)?a.transport.filter(Boolean):[],notes:String(a.notes||'').trim()};const k=keyOf(rec);const idx=existing.findIndex(x=>keyOf(x)===k);if(idx>=0){existing[idx]={...existing[idx],...Object.fromEntries(Object.entries(rec).filter(([_,v])=>v!==''&&!(Array.isArray(v)&&!v.length)))}}else{existing.push({id:existing.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1,...rec});added++}}
    fs.writeFileSync(file,JSON.stringify(existing,null,2)); res.json({ok:true,added,records:existing.slice(-Math.max(added,1))});
  }catch(e){res.status(502).json({ok:false,error:e.message||'Не удалось разобрать контакты'})}
});

app.post('/api/rates/import-local', auth, (req,res) => {
  const records=Array.isArray(req.body?.records)?req.body.records:[];
  if(!records.length)return res.status(400).json({ok:false,error:'Нет ставок'});
  try{const result=mergeRateRecords(records,'browser-local');res.json({ok:true,added:result.added,records:result.db.records.slice(-result.added)})}catch(e){res.status(500).json({ok:false,error:e.message||'Не удалось сохранить ставки'})}
});

app.post('/api/rates/import', upload.single('file'), async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  if(!req.file?.buffer && !String(req.body?.text||'').trim()) return res.status(400).json({ok:false,error:'Нужен файл или текст'});
  let fileId=null;
  try {
    if(req.file?.buffer) fileId=await openAIFileUpload(req.file.buffer,req.file.originalname,req.file.mimetype,key);
    const records=await extractRatesWithAI({key,text:req.body?.text,fileId,filename:req.file?.originalname,note:req.body?.note});
    const result=mergeRateRecords(records,req.file?.originalname||'manual');
    res.json({ok:true,added:result.added,records:result.db.records.slice(-result.added)});
  } catch(e) { res.status(502).json({ok:false,error:e.message||'Не удалось обработать ставку'}); }
});
app.post('/api/rates/import-text', async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  const text=String(req.body?.text||'').trim(); if(!text) return res.status(400).json({ok:false,error:'Пустой текст'});
  try { const records=await extractRatesWithAI({key,text,note:req.body?.note}); const result=mergeRateRecords(records,'chat-text'); res.json({ok:true,added:result.added,records:result.db.records.slice(-result.added)}); }
  catch(e){res.status(502).json({ok:false,error:e.message||'Не удалось обработать текст'});}
});

app.post('/api/transcribe', upload.single('file'), async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  if(!req.file?.buffer) return res.status(400).json({ok:false,error:'Audio file is required'});
  try{
    const form=new FormData();
    form.append('file',new Blob([req.file.buffer],{type:req.file.mimetype||'audio/webm'}),req.file.originalname||'voice.webm');
    form.append('model',process.env.OPENAI_TRANSCRIBE_MODEL||'gpt-4o-mini-transcribe');
    if(req.body?.language) form.append('language',String(req.body.language));
    const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{'Authorization':`Bearer ${key}`},body:form});
    const d=await r.json(); if(!r.ok)return res.status(r.status).json({ok:false,error:d?.error?.message||'Transcription failed'});
    res.json({ok:true,text:d.text||''});
  }catch{res.status(502).json({ok:false,error:'Transcription unavailable'});}
});

app.post('/api/tts', async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  const input=String(req.body?.input||'').trim();
  if(!input) return res.status(400).json({ok:false,error:'Empty input'});
  try{
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:process.env.OPENAI_TTS_VOICE||'marin',input,response_format:'mp3',instructions:'Natural, calm, warm professional voice. Speak clearly and not too quickly.'})});
    if(!r.ok){const d=await r.text();return res.status(r.status).json({ok:false,error:d||'TTS request failed'});}
    const buf=Buffer.from(await r.arrayBuffer());
    res.set('Content-Type','audio/mpeg');res.set('Cache-Control','no-store');res.send(buf);
  }catch{res.status(502).json({ok:false,error:'TTS unavailable'});}
});

function relevantRateRecords(db, context){
 const from=String(context.from||''),to=String(context.to||''),mode=String(context.transport||'').toLowerCase(),distance=Number(context.distanceKm);
 return db.records.map(r=>({...r,_score:routeScore(r,from,to,mode,Number.isFinite(distance)?distance:null)})).sort((a,b)=>b._score-a._score||new Date(b.updatedAt||0)-new Date(a.updatedAt||0)).slice(0,40);
}


// Страница кода в справочнике Альта-Софт (разбор — tnved-check.js, общий с разделом «ТН ВЭД» и ботом).
async function fetchAltaTnved(code){
  const info=await TNVED_CHECK.fetchTnved(code);
  const [vatHead,vatExtra]=TNVED_CHECK.vatLines(info.vat);
  return {
    source:'Alta-Soft',url:info.url,code,
    title:info.levels.map(l=>l.text).join(' → ')||`ТН ВЭД ЕАЭС ${code}`,
    duty:info.duty.text+(info.duty.note?` (${info.duty.note})`:''),
    vat:[vatHead,...vatExtra].join('; '),
    excise:info.excise||'Не указан в справочнике'
  };
}

app.post('/api/customs/check', async (req,res) => {
  const code=String(req.body?.code||'').replace(/\D/g,'').slice(0,10);
  if(code.length!==10) return res.status(400).json({ok:false,error:'Введите полный 10-значный код ТН ВЭД ЕАЭС'});
  const key=process.env.OPENAI_API_KEY;
  // Сначала — собственный справочник ТН ВЭД (без внешних сервисов). Если код в нём есть, сторонние страницы не запрашиваем.
  let local=null; try{ local=portal.tnved.get(code); }catch{}
  const localFacts=local?`Собственный справочник компании${local.exact?'':' (ближайшая позиция '+local.code+')'}: наименование=${local.name||'—'}; пошлина=${local.duty||'—'}; НДС=${local.vat||'—'}; акциз=${local.excise||'—'}; разрешительные документы=${local.cert||'—'}; техрегламенты=${local.reglament||'—'}; маркировка «Честный знак»=${local.marking||'—'}; единица=${local.unit||'—'}${local.radio?'; товар из Приложения №1 к ПП №1637 — сбор 73 860 ₽':''}.`:'';
  const localCard=local?{code:local.code,exact:local.exact,name:local.name||'',duty:local.duty||'',vat:local.vat||'',excise:local.excise||'',cert:local.cert||'',reglament:local.reglament||'',marking:local.marking||'',unit:local.unit||'',note:local.note||'',radio:!!local.radio}:null;
  if(!key&&local){
    return res.json({ok:true,code,title:local.name||`ТН ВЭД ЕАЭС ${code}`,local:localCard,analysis:`КОД: ${code}\nОПИСАНИЕ: ${local.name||'—'}${local.exact?'':' (ближайшая позиция '+local.code+')'}\nИМПОРТНАЯ ПОШЛИНА: ${local.duty||'нет в справочнике'}\nНДС: ${local.vat||'общая ставка 22%'}\nАКЦИЗ: ${local.excise||'—'}\nТАМОЖЕННЫЙ СБОР: ${local.radio?'73 860 ₽ (товар из Приложения №1 к ПП №1637)':'по шкале от таможенной стоимости декларации — посчитает «Калькулятор ВЭД»'}\nЧЕСТНЫЙ ЗНАК: ${local.marking||'нет данных в справочнике'}\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: ${local.cert||'нет данных в справочнике'}${local.reglament?' ('+local.reglament+')':''}\nЕДИНИЦА ИЗМЕРЕНИЯ: ${local.unit||'—'}\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ${local.note||'—'}\nИСТОЧНИКИ: собственный справочник ТН ВЭД\nПРИМЕЧАНИЕ: окончательная классификация и применяемые меры зависят от точных характеристик товара и документов.`});
  }
  let alta=null;
  if(!(local&&local.exact)){ try{ alta=await fetchAltaTnved(code); }catch{} }
  const baseFacts=(localFacts?localFacts+' ':'')+(alta?`Публичная справочная страница Альта-Софт для кода ${code}: название=${alta.title}; импортная пошлина=${alta.duty}; НДС=${alta.vat}; акциз=${alta.excise}; источник=${alta.url}.`:'Публичную страницу Альта-Софт получить не удалось.');
  if(!key){
    if(!alta) return res.status(503).json({ok:false,error:'OPENAI_API_KEY не настроен на сервере и справочная страница ТН ВЭД недоступна'});
    return res.json({ok:true,code,title:alta.title,analysis:`КОД: ${code}\nОПИСАНИЕ: ${alta.title}\nИМПОРТНАЯ ПОШЛИНА: ${alta.duty}\nНДС: ${alta.vat}\nАКЦИЗ: ${alta.excise}\nТАМОЖЕННЫЙ СБОР: требуется рассчитать по таможенной стоимости; ставка зависит от вида декларации и действующих правил\nЧЕСТНЫЙ ЗНАК: зависит от конкретного товара и его характеристик — требуется отдельная проверка\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: зависят от товара\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: требуется отдельная проверка\nЕДИНИЦА ИЗМЕРЕНИЯ: требуется уточнение по полной тарифной позиции\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ${baseFacts}\nИСТОЧНИКИ: ${alta.url}\nПРИМЕЧАНИЕ: окончательная классификация и применяемые меры зависят от точных характеристик товара и документов.`,apiCloudConfigured:Boolean(process.env.API_CLOUD_FTS_TOKEN)});
  }
  const prompt=`Ты — специалист по ВЭД и таможенному оформлению РФ/ЕАЭС. Проверь РОВНО код ТН ВЭД ${code}. Не заменяй его похожим кодом. Пользователь специально просит проверить код через официальный сайт ФТС России customs.gov.ru.

ПОРЯДОК ПРОВЕРКИ:
1) Сначала используй web search с разрешённым доменом customs.gov.ru и ищи сведения именно по коду ${code}. Это главный источник для ответа. Ищи ставки/меры таможенно-тарифного и нетарифного регулирования, платежи, ограничения и связанные материалы ФТС.
2) Затем проверь ЕЭК и официальные нормативные акты ЕАЭС/РФ, если на customs.gov.ru недостаточно данных или требуется подтвердить актуальность ставки.
3) Альта-Софт используй только как дополнительный справочный источник, а не вместо ФТС.
4) Не выдумывай данные. Если официальный сайт не содержит конкретной ставки или она зависит от условий, так и напиши.
5) Таможенный сбор нельзя назвать одной фиксированной суммой без таможенной стоимости и применимого вида декларации — укажи правило и что нужно для расчёта.
6) Отдельно проверь Честный ЗНАК, разрешительные документы, запреты/ограничения и единицу измерения.

${baseFacts}

Ответ строго:
КОД: ${code}
ОПИСАНИЕ: ...
ИМПОРТНАЯ ПОШЛИНА: ...
НДС: ...
АКЦИЗ: ...
ТАМОЖЕННЫЙ СБОР: ...
ЧЕСТНЫЙ ЗНАК: ТРЕБУЕТСЯ / НЕ ТРЕБУЕТСЯ / ЗАВИСИТ ОТ ХАРАКТЕРИСТИК — почему
РАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: ...
ЗАПРЕТЫ И ОГРАНИЧЕНИЯ: ...
ЕДИНИЦА ИЗМЕРЕНИЯ: ...
ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ...
ИСТОЧНИКИ: ...
ПРИМЕЧАНИЕ: окончательная классификация и применяемые меры зависят от точных характеристик товара и документов.`;
  try{
    let out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt,tools:[{type:'web_search',filters:{allowed_domains:['customs.gov.ru']}}],max_output_tokens:3500});
    if(out.error) out=await responsesRequest({key,preferred:'gpt-5.6-luna',input:prompt,tools:[{type:'web_search',filters:{allowed_domains:['customs.gov.ru','eec.eaeunion.org','pravo.gov.ru']}}],max_output_tokens:3500});
    if(out.error) out=await responsesRequest({key,preferred:'gpt-5.6-luna',input:prompt,tools:[{type:'web_search'}],max_output_tokens:3500});
    if(out.error){
      if(alta) return res.json({ok:true,code,title:alta.title,analysis:`КОД: ${code}\nОПИСАНИЕ: ${alta.title}\nИМПОРТНАЯ ПОШЛИНА: ${alta.duty}\nНДС: ${alta.vat}\nАКЦИЗ: ${alta.excise}\nТАМОЖЕННЫЙ СБОР: требуется рассчитать по таможенной стоимости и виду декларации\nЧЕСТНЫЙ ЗНАК: требуется отдельная проверка по характеристикам товара\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: требуется отдельная проверка\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: требуется отдельная проверка\nЕДИНИЦА ИЗМЕРЕНИЯ: уточнить по тарифной позиции\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ${baseFacts}\nИСТОЧНИКИ: ${alta.url}\nПРИМЕЧАНИЕ: ответ сформирован из доступной справочной страницы; для юридически значимых решений проверьте первоисточник.`,apiCloudConfigured:Boolean(process.env.API_CLOUD_FTS_TOKEN)});
      return res.status(out.error.status||502).json({ok:false,error:out.error.error||'Не удалось проверить код ТН ВЭД'});
    }
    const text=responseText(out.d); if(!text) throw new Error('Пустой ответ от справочного сервиса');
    res.json({ok:true,code,title:local&&local.name?local.name:`ТН ВЭД ЕАЭС ${code}`,local:localCard,analysis:text,apiCloudConfigured:Boolean(process.env.API_CLOUD_FTS_TOKEN)});
  }catch(e){
    if(alta) return res.json({ok:true,code,title:alta.title,analysis:`КОД: ${code}\nОПИСАНИЕ: ${alta.title}\nИМПОРТНАЯ ПОШЛИНА: ${alta.duty}\nНДС: ${alta.vat}\nАКЦИЗ: ${alta.excise}\nТАМОЖЕННЫЙ СБОР: требуется рассчитать по таможенной стоимости и виду декларации\nЧЕСТНЫЙ ЗНАК: требуется отдельная проверка по характеристикам товара\nРАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: требуется отдельная проверка\nЗАПРЕТЫ И ОГРАНИЧЕНИЯ: требуется отдельная проверка\nЕДИНИЦА ИЗМЕРЕНИЯ: уточнить по тарифной позиции\nДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ${baseFacts}\nИСТОЧНИКИ: ${alta.url}\nПРИМЕЧАНИЕ: ${e.message}`,apiCloudConfigured:Boolean(process.env.API_CLOUD_FTS_TOKEN)});
    res.status(502).json({ok:false,error:e.message||'Ошибка проверки ТН ВЭД'});
  }
});

app.post('/api/ai', async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'OPENAI_API_KEY не настроен на сервере'});
  const message=String(req.body?.message||'').trim();
  const history=Array.isArray(req.body?.history)?req.body.history.slice(-10):[];
  const context=req.body?.context&&typeof req.body.context==='object'?req.body.context:{};
  if(!message) return res.status(400).json({ok:false,error:'Empty message'});
  const db=ensureRateDb();
  const relevantRates=relevantRateRecords(db,context);
  const modeFactor={Авиа:167,Air:167,авиа:167,Авто:400,Road:400,авто:400,ЖД:500,Rail:500,жд:500,Море:1000,Sea:1000,море:1000,'Море + ЖД':1000,'Sea + Rail':1000,multimodal:1000};
  const factor=modeFactor[String(context.transport||'')]||167;
  const volume=Number(context.lengthMm||0)*Number(context.widthMm||0)*Number(context.heightMm||0)/1e9*Number(context.pieces||1);
  const chargeableKg=Math.max(Number(context.weightKg||0),volume*factor);
  const system=`Ты AI-ассистент сайта iomastavka — специализированный помощник по международной логистике, ВЭД, Китай/Азия → Россия, ставкам, маршрутам, Incoterms, таможне, документам и анализу КП. Отвечай на языке интерфейса пользователя, если он не попросил другой язык. Для tr используй естественный турецкий язык. Не превращай короткие запросы вроде «курс» в случайный ответ: уточни, какой курс нужен. Для свежих фактов используй web search. Не выдумывай ставки и таможенные данные. Исторические ставки из базы ниже помечай как исторические/ориентировочные, если срок не подтверждён. Текущий расчётный вес: ${chargeableKg.toFixed(1)} кг. Фактор: ${factor} кг/м³. База ставок: ${JSON.stringify(relevantRates)}. Контекст калькулятора: ${JSON.stringify(context)}.`;
  let kbExtra=''; try{ if(portal.crm2.siteBotEnabled()) kbExtra=portal.crm2.botContext(message); }catch{}
  const t0=Date.now();
  const input=[{role:'system',content:system+kbExtra},...history.map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||'')})),{role:'user',content:message}];
  try{
    let out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input,tools:[{type:'web_search',search_context_size:'medium'}],max_output_tokens:1200});
    if(out.error) out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input,max_output_tokens:1200});
    if(out.error)return res.status(out.error.status||502).json({ok:false,error:out.error.error||'AI request failed'});
    const text=responseText(out.d);
    if(!text)return res.status(502).json({ok:false,error:'OpenAI returned an empty response'});
    try{ portal.crm2.botLog({channel:'site',username:req.who?.name||'Администратор',visitor:String(req.get('x-ioma-visitor')||'').slice(0,40),q:message,a:text,ms:Date.now()-t0}); }catch{}
    res.json({ok:true,text});
  }catch(e){res.status(502).json({ok:false,error:e.message||'AI unavailable'});}
});

app.use('/api', (req,res) => res.status(404).json({ error: 'not found' }));
app.use((req,res) => res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — iomastavka</title><body style="font-family:system-ui;background:#F7F5EF;color:#1B2B26;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h1 style="font-size:64px;margin:0;color:#2E7D5B">404</h1><p>Такой страницы нет.</p><a href="/" style="background:#E8A33D;color:#1B2B26;padding:12px 22px;border-radius:14px;text-decoration:none;font-weight:700">На главную</a></div>'));
(async () => {
  // Сначала поднимаем данные из Supabase (если подключён), потом принимаем запросы.
  try {
    if (cloud) {
      await cloud.ensureBucket();
      await cloud.syncFiles(DATA_DIR, ['rates.json', 'agents.json']);
      console.log('Хранилище: Supabase (' + cloud.bucket + ')');
      // Бесплатный Supabase ставит проект на паузу после недели тишины — раз в 12 часов обращаемся к нему.
      setInterval(() => { cloud.get('state/portal.json').catch(() => {}); }, 12 * 60 * 60 * 1000).unref();
    } else console.warn('Хранилище: локальные файлы. На бесплатном Render они стираются при перезапуске — подключите Supabase.');
    await portal.store.init();
    await portal.tnved.init();
    portal.setEnvAdminCheck(verifyPassword);
    // Telegram-бот: принимаем сообщения клиентов (привязка /start) через webhook.
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET) {
      const site = String(process.env.SITE_URL || 'https://iomastavki.onrender.com').replace(/\/+$/, '');
      portal.tg.setWebhook(site + '/api/telegram/webhook', process.env.TELEGRAM_WEBHOOK_SECRET)
        .then(r => console.log('Telegram webhook:', r && r.ok ? 'ok' : (r && r.description)))
        .catch(e => console.error('Telegram webhook:', e.message));
    }
  } catch (e) { console.error('Ошибка подключения хранилища:', e.message); if (cloud) cloudError = String(e.message || e).replace(/eyJ[\w.-]+/g, '***'); }
  app.use(RES.errorHandler()); // последним: любая ошибка маршрута — вменяемый ответ, процесс живёт
  app.listen(PORT, () => { console.log(`iomastavka listening on ${PORT}`); RES.startKeepAlive({ site: 'https://iomastavki.onrender.com' }); });
})();
// Перед остановкой сохраняем несохранённое.
process.on('SIGTERM', async () => { try { await portal.store.flush(); } catch {} try { await portal.journal.flush(); } catch {} try { await portal.tnved.flush(); } catch {} process.exit(0); });
