const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const RATES_FILE = path.join(DATA_DIR, 'rates.json');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const fallbackHash = 'scrypt$16384$8$1$bd186dac2105a3d050c5f769e28d25a2$51e731def6ff02e823b43cb8cfce55adcad745c5c72935ce68d875f583096288';

function safeReadRates() {
  try { return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8')); } catch { return {}; }
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
  if (req.cookies?.auth === '1') return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

app.get('/', (req,res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/app.js', (req,res) => res.sendFile(path.join(ROOT, 'app.js')));
app.get('/styles.css', (req,res) => res.sendFile(path.join(ROOT, 'styles.css')));
app.get('/api/health', (req,res) => res.json({ ok: true }));
app.get('/api/config', (req,res) => res.json({ weatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY), aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));

app.get('/api/currency', async (req,res) => {
  try {
    const r = await fetch('https://www.cbr.ru/scripts/XML_daily.asp', {headers:{'User-Agent':'iomastavka/1.0'}});
    if (!r.ok) return res.status(502).json({ok:false,error:'CBR unavailable'});
    const xml = await r.text();
    const items = {};
    const blocks = [...xml.matchAll(/<Valute\b[^>]*>[\s\S]*?<\/Valute>/gi)].map(m => m[0]);
    for (const block of blocks) {
      const code = block.match(/<CharCode>\s*([^<]+?)\s*<\/CharCode>/i)?.[1]?.trim();
      if (!['USD','EUR','CNY'].includes(code)) continue;
      const nominal = block.match(/<Nominal>\s*([^<]+?)\s*<\/Nominal>/i)?.[1];
      const value = block.match(/<Value>\s*([^<]+?)\s*<\/Value>/i)?.[1];
      if (value) items[code] = { nominal:Number((nominal || '1').replace(',', '.')), value:Number(value.replace(',', '.')) };
    }
    const dateMatch = xml.match(/Date=\"([^\"]+)\"/i);
    res.json({ok:true,date:dateMatch?.[1] || new Date().toISOString(),items});
  } catch { res.status(502).json({ok:false,error:'CBR unavailable'}); }
});

app.get('/api/weather', async (req,res) => {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(503).json({ok:false,error:'Weather key not configured'});
  try {
    const u = `https://api.openweathermap.org/data/2.5/weather?lat=55.7558&lon=37.6173&appid=${encodeURIComponent(key)}&units=metric&lang=ru`;
    const r = await fetch(u);
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ok:false,error:d.message||'weather error'});
    res.json({ok:true, main:d.weather?.[0]?.main||'Clear', description:d.weather?.[0]?.description||'', icon:d.weather?.[0]?.icon||'01d', temp:d.main?.temp, feelsLike:d.main?.feels_like, humidity:d.main?.humidity, pressure:d.main?.pressure, wind:d.wind?.speed, clouds:d.clouds?.all, visibility:d.visibility, rain1h:d.rain?.['1h']||0, snow1h:d.snow?.['1h']||0, sunrise:d.sys?.sunrise||0, sunset:d.sys?.sunset||0, city:d.name||'Москва'});
  } catch { res.status(502).json({ok:false,error:'weather unavailable'}); }
});

let newsCache = { at: 0, items: [] };
function stripHtml(s='') { return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); }
function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => {
    const x=m[1];
    const pick=(tag)=>{ const z=x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i')); return z ? stripHtml(z[1]) : ''; };
    const link = pick('link');
    return { title:pick('title'), link, date:pick('pubDate'), source:pick('source'), description:pick('description') };
  }).filter(x=>x.title && x.link);
}
async function fetchNews() {
  const feeds = [
    'https://news.google.com/rss/search?q=China+logistics+customs+freight&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=Китай+логистика+таможня+грузоперевозки&hl=ru&gl=RU&ceid=RU:ru',
    'https://news.google.com/rss/search?q=China+shipping+customs&hl=en-US&gl=US&ceid=US:en'
  ];
  const all=[];
  for(const url of feeds){
    try{ const r=await fetch(url,{headers:{'User-Agent':'iomastavka/1.0'}}); if(r.ok) all.push(...parseRss(await r.text())); }catch{}
  }
  const seen=new Set();
  const items=all.filter(x=>{const k=x.title.toLowerCase(); if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,24);
  newsCache={at:Date.now(),items};
  return items;
}
app.get('/api/news', async (req,res) => {
  try {
    const items = (Date.now()-newsCache.at < 6*60*60*1000 && newsCache.items.length) ? newsCache.items : await fetchNews();
    res.json({ok:true, updatedAt:newsCache.at, items});
  } catch { res.status(502).json({ok:false,error:'news unavailable',items:[]}); }
});

app.post('/api/login', (req,res) => {
  if (!verifyPassword(req.body?.password || '')) return res.status(401).json({ ok:false, error:'Неверный пароль' });
  res.cookie('auth', '1', { httpOnly:true, secure:true, sameSite:'lax', maxAge:8*60*60*1000, path:'/' });
  res.json({ ok:true });
});
app.post('/api/logout', (req,res) => {
  res.clearCookie('auth', { httpOnly:true, secure:true, sameSite:'lax', path:'/' });
  res.json({ ok:true });
});
app.get('/api/me', auth, (req,res) => res.json({ ok:true }));
app.get('/api/rates', (req,res) => res.json(safeReadRates()));
app.put('/api/rates', auth, (req,res) => {
  const data=req.body;
  if(!data || typeof data!=='object' || Array.isArray(data)) return res.status(400).json({ok:false,error:'Некорректные данные'});
  saveRates(data); res.json({ok:true});
});

app.post('/api/ai', async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  const model=process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const message=String(req.body?.message||'').trim();
  const history=Array.isArray(req.body?.history)?req.body.history.slice(-10):[];
  if(!message) return res.status(400).json({ok:false,error:'Empty message'});
  const rates=safeReadRates();
  const system=`Ты AI-ассистент сайта iomastavka — помощник по международной логистике Китай/Азия → Россия. Отвечай кратко и по делу на языке пользователя. Помогай с маршрутами, Incoterms, транспортом, расчётом объёмного веса, таможней и ставками. Не выдумывай актуальные ставки: если данных нет, прямо скажи это. Текущая база экспедиторов и ставок: ${JSON.stringify(rates)}`;
  const input=[{role:'system',content:system},...history.map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||'')})),{role:'user',content:message}];
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,input,max_output_tokens:700})});
    const d=await r.json();
    if(!r.ok) return res.status(r.status).json({ok:false,error:d?.error?.message||'AI request failed'});
    let text = typeof d.output_text === 'string' ? d.output_text : '';
    if (!text && Array.isArray(d.output)) {
      text = d.output.flatMap(o => Array.isArray(o.content) ? o.content : []).map(c => c.text || c.value || '').filter(Boolean).join('\n');
    }
    res.json({ok:true,text});
  }catch{res.status(502).json({ok:false,error:'AI unavailable'});}
});

app.listen(PORT, () => console.log(`iomastavka listening on ${PORT}`));
