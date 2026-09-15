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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const fallbackHash = 'scrypt$16384$8$1$bd186dac2105a3d050c5f769e28d25a2$51e731def6ff02e823b43cb8cfce55adcad745c5c72935ce68d875f583096288';

function safeReadRates() {
  try { return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8')); } catch { return {}; }
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
function normalizeText(s='') { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function routeScore(record, from, to, mode, distance) {
  const a=normalizeText(from), b=normalizeText(to), rf=normalizeText(record.from), rt=normalizeText(record.to);
  let score=0;
  if (rf && (rf===a || rf.includes(a) || a.includes(rf))) score+=8;
  else if (rf && a && (rf.split(/\s+/)[0]===a.split(/\s+/)[0])) score+=3;
  if (rt && (rt===b || rt.includes(b) || b.includes(rt))) score+=8;
  else if (rt && b && (rt.split(/\s+/)[0]===b.split(/\s+/)[0])) score+=3;
  if (mode && record.mode && normalizeText(record.mode)===normalizeText(mode)) score+=5;
  if (Number.isFinite(distance) && Number(record.distanceKm)) score += Math.max(0,5-Math.abs(distance-Number(record.distanceKm))/1200);
  if (record.validUntil){const t=Date.parse(record.validUntil);if(Number.isFinite(t)&&t>=Date.now())score+=1;}
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
    let data=null;
    try {
      const r=await fetch('https://www.cbr-xml-daily.ru/daily_json.js',{headers:{'User-Agent':'iomastavka/1.0'}});
      if(r.ok) data=await r.json();
    } catch {}
    if(!data){
      const r=await fetch('https://www.cbr.ru/scripts/XML_daily.asp',{headers:{'User-Agent':'iomastavka/1.0'}});
      if(!r.ok) throw new Error('CBR unavailable');
      const xml=await r.text(); const items={};
      for(const code of ['USD','EUR','CNY']){
        const m=xml.match(new RegExp(`<Valute[^>]*ID=\"[^\"]+\"[\s\S]*?<CharCode>${code}<\/CharCode>[\s\S]*?<Nominal>([^<]+)<\/Nominal>[\s\S]*?<Value>([^<]+)<\/Value>[\s\S]*?<\/Valute>`));
        if(m) items[code]={nominal:Number(m[1].replace(',','.'))||1,value:Number(m[2].replace(',','.'))};
      }
      if(Object.keys(items).length<3) throw new Error('Incomplete rates');
      return res.json({ok:true,date:new Date().toISOString(),items});
    }
    const items={}; for(const code of ['USD','EUR','CNY']){const x=data.Valute?.[code];if(x?.Value)items[code]={nominal:x.Nominal||1,value:Number(x.Value)}}
    if(!items.USD||!items.EUR||!items.CNY) throw new Error('Incomplete rates');
    res.json({ok:true,date:data.Date||new Date().toISOString(),items});
  } catch(e){res.status(502).json({ok:false,error:'CBR unavailable'});}
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
  if(!q) return res.json({ok:true,results:[]});
  try{
    const alias=CITY_ALIASES[normalizeText(q)]; const searchName=alias?.[0]||q; const results=[];
    const add=(x)=>{if(!x)return;const name=x.name||x.city||x.town||x.village||x.municipality||x.display_name?.split(',')[0];if(!name)return;results.push({name,nameEn:x.nameEn||x.name||name,nameZh:x.nameZh||x.name||name,admin1:x.admin1||x.state||x.province||'',country:x.country||'China',country_code:x.country_code||country,latitude:Number(x.latitude??x.lat),longitude:Number(x.longitude??x.lon)})};
    try{const u=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=100&language=en&format=json`;const r=await fetch(u,{headers:{'User-Agent':'iomastavastka/1.0'}});if(r.ok){const d=await r.json();for(const x of d.results||[]){if(!country||x.country_code===country)add({name:x.name,nameEn:x.name,admin1:x.admin1,country:x.country,country_code:x.country_code,latitude:x.latitude,longitude:x.longitude})}}}catch{}
    if(q.length>=1){try{const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=100&countrycodes=${country.toLowerCase()}&q=${encodeURIComponent(q)}`;const r=await fetch(u,{headers:{'User-Agent':'iomastavka/1.1'}});if(r.ok){const d=await r.json();for(const x of d)add(x)}}catch{}}
    if(alias && country===alias[1]) add({name:alias[0],nameEn:alias[0],nameZh:alias[3],admin1:alias[2],country:'China',country_code:'CN',latitude:null,longitude:null});
    const seen=new Set(); const clean=results.filter(x=>{if(x.country_code&&x.country_code!==country)return false;const k=normalizeText(`${x.name}|${x.admin1}|${x.country_code}`);if(seen.has(k))return false;seen.add(k);return true});
    clean.sort((a,b)=>{const aa=normalizeText(`${a.name} ${a.nameEn} ${a.nameZh}`),bb=normalizeText(`${b.name} ${b.nameEn} ${b.nameZh}`),qq=normalizeText(q);const sa=aa.startsWith(qq)?0:aa.includes(qq)?1:2,sb=bb.startsWith(qq)?0:bb.includes(qq)?1:2;return sa-sb});
    res.json({ok:true,results:clean.slice(0,limit)});
  }catch{res.status(502).json({ok:false,error:'city search unavailable',results:[]});}
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
app.get('/api/rates', (req,res) => res.json(ensureRateDb()));
app.get('/api/rates/recommend', (req,res) => {
  const db=ensureRateDb(); const from=String(req.query.from||''), to=String(req.query.to||''), mode=String(req.query.mode||''); const distance=Number(req.query.distance);
  const matches=db.records.map(r=>({...r,_score:routeScore(r,from,to,mode,Number.isFinite(distance)?distance:null)})).filter(r=>r._score>0).sort((a,b)=>b._score-a._score||new Date(b.updatedAt||0)-new Date(a.updatedAt||0)).slice(0,8);
  const prices=matches.filter(r=>Number.isFinite(Number(r.rate))).map(r=>Number(r.rate));
  res.json({ok:true,matches,range:prices.length?{min:Math.min(...prices),max:Math.max(...prices),currency:matches.find(r=>Number.isFinite(Number(r.rate)))?.currency||'RUB'}:null});
});
app.put('/api/rates', auth, (req,res) => {
  const data=req.body;
  if(!data || typeof data!=='object' || Array.isArray(data)) return res.status(400).json({ok:false,error:'Некорректные данные'});
  saveRates(data); res.json({ok:true});
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

app.post('/api/ai', async (req,res) => {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'AI key not configured'});
  const model=process.env.OPENAI_MODEL || 'gpt-5.6-luna';
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
  const system=`Ты AI-ассистент сайта iomastavka — помощник по международной логистике Китай/Азия → Россия. Отвечай кратко и по делу. Объёмный вес выбирается автоматически: авиа 167, авто 400, ЖД 500, море 1000, мультимодальная море+ЖД 1000 кг/м³. Текущий расчётный вес: ${chargeableKg.toFixed(1)} кг. Для расстояния используй контекст; расстояние между городами — географическое по координатам и является ориентиром, если нет фактического маршрута перевозчика. Для ставок используй только базу ниже. Если ставка указана за кг/тонну/м³, пересчитай её на текущий груз только когда база расчёта однозначна. Если ставка указана за отправку/контейнер — не умножай её на вес. Если точного маршрута нет, допускается ориентировочный диапазон по ближайшим историческим ставкам; расстояние можно учитывать как коэффициент только если транспорт, база расчёта и характер маршрута сопоставимы, и обязательно помечай такой расчёт как ориентировочный. Не придумывай отсутствующие тарифы. Если есть историческая ставка конкретного экспедитора по этому или похожему направлению — можно рекомендовать его. Не утверждай, что ставка актуальна сегодня без срока действия. База ставок (сначала наиболее похожие): ${JSON.stringify(relevantRates)}. Текущий контекст калькулятора: ${JSON.stringify(context)}.`;
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
