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
  if (req.cookies?.auth === '1') return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

app.get('/', (req,res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/app.js', (req,res) => res.sendFile(path.join(ROOT, 'app.js')));
app.get('/styles.css', (req,res) => res.sendFile(path.join(ROOT, 'styles.css')));
app.get('/api/health', (req,res) => res.json({ ok: true }));
app.get('/api/version', (req,res) => res.json({ok:true,version:'24',build:'IOMASTAVKA_FILE_24'}));
app.get('/api/config', (req,res) => res.json({ weatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY), aiConfigured: Boolean(process.env.OPENAI_API_KEY), ftsConfigured: Boolean(process.env.API_CLOUD_FTS_TOKEN) }));

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
        const m=xml.match(new RegExp('<Valute[^>]*>[\\s\\S]*?<CharCode>'+code+'<\\/CharCode>[\\s\\S]*?<Nominal>([^<]+)<\\/Nominal>[\\s\\S]*?<Value>([^<]+)<\\/Value>[\\s\\S]*?<\\/Valute>'));
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

app.get('/api/news', async (req,res) => {
  try {
    const items = (Date.now()-newsCache.at < 6*60*60*1000 && newsCache.items.length) ? newsCache.items : await fetchNews();
    res.json({ok:true, updatedAt:newsCache.at, items});
  } catch { res.status(502).json({ok:false,error:'news unavailable',items:[]}); }
});


function langName(code){return code==='zh'?'Chinese':code==='en'?'English':code==='tr'?'Turkish':'Russian';}

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
async function responsesRequest({key,preferred,input,tools,max_output_tokens=1000}){
  let last={status:502,error:'OpenAI request failed'};
  for(const model of aiModelCandidates(preferred)){
    const body={model,input,max_output_tokens};
    if(tools) body.tools=tools;
    try{
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify(body)});
      const raw=await r.text(); let d={}; try{d=JSON.parse(raw)}catch{}
      if(r.ok)return {r,d};
      last={status:r.status,error:d?.error?.message||raw||`Model ${model} failed`};
    }catch(e){last={status:502,error:e.message||'OpenAI unavailable'};}
  }
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
  try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 iomastavka/1.0'},signal:AbortSignal.timeout(7000)});if(!r.ok)return '';const html=await r.text();return stripHtml(html).slice(0,18000);}catch{return '';}
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
const BUILTIN_AGENTS = [{"id":1,"company":"Multiwell","contact":"Kane","phone":"8 616 608 738 886","email":"sales344@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":2,"company":"Multiwell","contact":"Sakiya","phone":"8 619 860 070 462","email":"sales242@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":3,"company":"CR FREIGHT","contact":"Ирина Андреева","phone":"8 911 195 62 31","email":"andreeva@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":4,"company":"CR FREIGHT","contact":"Ella и другие","phone":"","email":"cs19@crfreight.cn, ella@crfreight.cn, sr16@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":5,"company":"TRANSIT, LLC","contact":"Konstantin Leonov","phone":"8 914 791 87 81","email":"k.leonov@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":6,"company":"TRANSIT, LLC","contact":"Tatyana Iskaleeva","phone":"8 908 450 11 98","email":"t.iskaleeva@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":7,"company":"TRANSIT, LLC","contact":"","phone":"","email":"directrail@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":8,"company":"Русмарин","contact":"Евгений Ермоленко","phone":"8 921 401 61 29","email":"evermolenko@rusmarine.ru","site":"www.rusmarine.ru","modes":["rail","road","air","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Авиа","Море","Море + Ж/Д"],"notes":"Сборные груза"},{"id":9,"company":"Qtavia","contact":"Anastasiia Snatkina","phone":"86 131 499 21 667","email":"a.snatkina@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":10,"company":"Qtavia","contact":"Linara Iliazova","phone":"8 936 131 23 25","email":"linara.iliazova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":11,"company":"Qtavia","contact":"Naida Azadova","phone":"8 986 749 55 92","email":"naida.azadova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":12,"company":"ФЛГ","contact":"Александр Токарев","phone":"8 906 238 85 17","email":"sales@flgrussia.com","site":"https://flgrussia.com/","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":13,"company":"РусКарго","contact":"Alina Karpova","phone":"8 981 930 24 66","email":"kas@r-cargo.com","site":"https://r-cargo.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":14,"company":"YM Trans Group","contact":"Милена Никитина","phone":"8 925 988 65 99","email":"982@ymtrans.ru","site":"www.ymtrans.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":15,"company":"JENTY","contact":"Marina Kostukovich","phone":"375 29 192 46 69","email":"m.kostukovich@jenty-spedition.com","site":"https://jenty-spedition.ru/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза"},{"id":16,"company":"Consolidator-DV LLC","contact":"Timofei Bakanovich","phone":"8 964 432 57 95","email":"import5@consolidator-dv.ru","site":"http://consolidator-dv.ru/","modes":["sea"],"transport":["Море"],"notes":"Сборные груза"},{"id":17,"company":"ТАМГА","contact":"Осипов Николай","phone":"8 985 279 69 39","email":"n.osipov@tamga80.ru","site":"https://tamga80.ru/ru","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Негабарит"},{"id":18,"company":"Green Avia","contact":"Kuzmina Maria","phone":"8 936 506 11 15","email":"sales3@avia-dostavka.com","site":"https://avia-dostavka.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":19,"company":"Sky Cargo Service","contact":"Ekaterina Ivanova","phone":"8 913 061 71 56","email":"sales10@scs-aero.ru","site":"www.scs-aero.ru","modes":["air"],"transport":["Авиа"],"notes":""},{"id":20,"company":"Альфа Транзит","contact":"Щепина Виктория","phone":"8 916 894 05 20","email":"v.shchepina@alfa-transit.com","site":"www.alfa-transit.com","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":21,"company":"Шатл Логистик / Shuttle-Logistic","contact":"Братасенко Михаил","phone":"8 999 614 64 92","email":"mb@shuttle-logistic.ru","site":"www.shuttle-logistic.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":22,"company":"Chengdu Tiechi Silk Road Supply Chain Management","contact":"Lily","phone":"8 619 115 959 752","email":"lily@tsrscm.com","site":"http://tsrscm.com/ru/","modes":["rail"],"transport":["Прямое Ж/Д"],"notes":"Сборные груза"},{"id":23,"company":"GUANGZHOU ETY TRANS INTERNATIONAL FREIGHT FORWARDING","contact":"Vera Yao","phone":"8 615 999 941 607","email":"vera@cnetytrans.com","site":"www.cnetytrans.com","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":""},{"id":24,"company":"A2","contact":"Микулин Владимир","phone":"8 913 061 71 56","email":"v.mikulin@a2-express.com","site":"a2-express.com","modes":["air"],"transport":["Авиа"],"notes":""},{"id":25,"company":"RUTENSIL Logistics","contact":"Алина","phone":"8 906 351 17 33","email":"108@rutensil.com","site":"http://rutensil.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Европа"},{"id":26,"company":"ВТХ","contact":"Станислав","phone":"8 914 077 79 26","email":"vthopr4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":27,"company":"ВТХ","contact":"Алексей","phone":"8 914 704 43 41","email":"sales4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":28,"company":"Chongqing Gudali Supply Chain Management","contact":"Logan","phone":"8 613 827 428 296","email":"logan@gdl-rail.com","site":"logan@gdl-rail.com","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":29,"company":"Вэй Трейд","contact":"Рукосуева Евгения Олеговна","phone":"8 902 981 11 04","email":"e.rukosueva@way-trade.ru","site":"https://way-trade.ru/","modes":["rail","road","multimodal"],"transport":["Прямое Ж/Д","Авто","Море + Ж/Д"],"notes":""},{"id":30,"company":"WAY GROUP","contact":"Общий","phone":"8 800 600 04 30","email":"info@wayg.ru","site":"https://www.wayg.ru/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Негабарит"},{"id":31,"company":"ФИТ, Владивосток","contact":"Маргарита","phone":"8-800-23-444-99 ext. 41501; +7-914-794-20-89","email":"NNKuznetsova@fesco.com","site":"https://www.fesco.ru/ru/","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит"},{"id":32,"company":"Нью Вэй Лоджистик","contact":"Боев Сергей","phone":"8 914 320 65 95","email":"310@newwaylogistic.ru","site":"https://newwaylogistic.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Ж/Д по России, Опасный"},{"id":33,"company":"ВЕЛЕС","contact":"Венера Рашидова","phone":"8 918 418 69 82","email":"operative2@velesforwarding.ru","site":"www.velesforwarding.ru","modes":["sea"],"transport":["Море"],"notes":"Новороссийск, Негабарит, Опасный"},{"id":34,"company":"ГАЛЕАС","contact":"Роман","phone":"8 961 520 31 25","email":"r.kuznetsov@galeasgroup.ru","site":"https://galeasgroup.ru/","modes":["sea"],"transport":["Море"],"notes":"Новороссийск"},{"id":35,"company":"Znylogistics","contact":"Maya","phone":"","email":"operator01@znylogistics.com","site":"","modes":["road"],"transport":["Авто"],"notes":"Турция"},{"id":36,"company":"РТТК","contact":"Алексей Веслополов (Чита)","phone":"8 3022 21 18 18; 8 914 464 23 32","email":"rttk888@mail.ru","site":"https://www.rttk.net/","modes":["rail","road"],"transport":["Ж/Д","Авто"],"notes":"Негабарит, Россия, Китай"},{"id":37,"company":"Tu-Tell","contact":"Вадим","phone":"375 33 3071468","email":"t14@tutell.com","site":"https://www.tutell.com/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Турция, Европа"},{"id":38,"company":"СДЕК","contact":"Палащук Владислав Сергеевич","phone":"8 924 697 72 73","email":"v.palashchuk@cdek.ru","site":"www.cdek.ru","modes":["road"],"transport":["Мелкие груза"],"notes":"Китай"},{"id":39,"company":"ИП Полчанинов Кирилл Александрович","contact":"Кирилл","phone":"7 925 991 25 75","email":"pka666@yandex.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина 42-43 куб.м."],"notes":"Россия, Москва, МО"},{"id":40,"company":"ИП Диана Куркина","contact":"Евгений","phone":"7 962 936 27 08","email":"yevgeniy-kurkin@mail.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина до 18 куб.м."],"notes":"Россия, Москва, МО"},{"id":41,"company":"Автовывоз — Алексей","contact":"Алексей","phone":"7 985 227 06 67","email":"","site":"","modes":["road"],"transport":["Автовывоз с СВХ, более 20 куб.м."],"notes":"Россия, Москва, МО"}];
app.get('/api/agents', (req,res) => { try { const file=path.join(DATA_DIR,'agents.json'); const records=JSON.parse(fs.readFileSync(file,'utf8')); const out=Array.isArray(records)&&records.length?records:BUILTIN_AGENTS; res.json({ok:true,records:out}); } catch { res.json({ok:true,records:BUILTIN_AGENTS}); } });
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


app.post('/api/customs/check', async (req,res) => {
  const code=String(req.body?.code||'').replace(/\D/g,'').slice(0,10);
  if(code.length!==10) return res.status(400).json({ok:false,error:'Введите полный 10-значный код ТН ВЭД ЕАЭС'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:'OPENAI_API_KEY не настроен на сервере'});

  // API-CLOUD FTS is intentionally kept server-side. Its documented FTS v2 method
  // is for customs clearance of passenger cars by VIN, not for HS/TN VED codes.
  // The token is therefore not exposed to the browser and is not sent for a TN VED lookup.
  const apiCloudConfigured=Boolean(process.env.API_CLOUD_FTS_TOKEN);
  const prompt=`Ты — специалист по ВЭД и таможенному оформлению в России. Проверь ровно код ТН ВЭД ЕАЭС ${code}. Пользователь хочет получить практический ответ для импорта в РФ из Китая/Азии.

ОБЯЗАТЕЛЬНО используй web search и свежие источники. Ответ формируй на языке запроса/интерфейса пользователя. Приоритет: ФТС России/customs.gov.ru, ЕЭК/eec.eaeunion.org и официальные нормативные акты ЕАЭС/РФ. Для маркировки отдельно проверь официальный «Честный ЗНАК» (честныйзнак.рф / markirovka.ru) и нормативные документы. Не подставляй похожий 10-значный код. Если точный код не найден — так и напиши.

Верни ответ строго в следующем формате, каждый пункт с новой строки:
КОД: ${code}
ОПИСАНИЕ: ...
ИМПОРТНАЯ ПОШЛИНА: ...
НДС: ...
АКЦИЗ: ...
ТАМОЖЕННЫЙ СБОР: ...
ЧЕСТНЫЙ ЗНАК: ТРЕБУЕТСЯ / НЕ ТРЕБУЕТСЯ / ЗАВИСИТ ОТ ХАРАКТЕРИСТИК — затем кратко почему
РАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ: ...
ЗАПРЕТЫ И ОГРАНИЧЕНИЯ: ...
ЕДИНИЦА ИЗМЕРЕНИЯ: ...
ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: ...
ИСТОЧНИКИ: ...

Если ставка зависит от страны происхождения, материала, назначения, вида товара или специальных условий — обязательно укажи это. Не выдумывай ставку. Если актуальное значение не удалось подтвердить, пиши «не удалось подтвердить по доступному официальному источнику». Для пошлины укажи процент и/или формулу, если она специфическая. Для НДС учитывай актуальные правила РФ на текущую дату. Для Честного ЗНАКА не путай обязательную маркировку с таможенной пошлиной.

В самом конце одной строкой: ПРИМЕЧАНИЕ: окончательная классификация и применяемые меры зависят от точных характеристик товара и документов.`;
  try{
    let out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input:prompt,tools:[{type:'web_search'}],max_output_tokens:3500});
    if(out.error) out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input:prompt,max_output_tokens:3500});
    if(out.error) return res.status(out.error.status||502).json({ok:false,error:out.error.error||'Не удалось проверить код ТН ВЭД'});
    const text=responseText(out.d);
    if(!text) return res.status(502).json({ok:false,error:'По коду не получен ответ от справочного сервиса'});
    res.json({ok:true,code,title:`ТН ВЭД ЕАЭС ${code}`,analysis:text,apiCloudConfigured});
  }catch(e){res.status(502).json({ok:false,error:e.message||'Ошибка проверки ТН ВЭД'});}
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
  const input=[{role:'system',content:system},...history.map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||'')})),{role:'user',content:message}];
  try{
    let out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input,tools:[{type:'web_search',search_context_size:'medium'}],max_output_tokens:1200});
    if(out.error) out=await responsesRequest({key,preferred:process.env.OPENAI_MODEL,input,max_output_tokens:1200});
    if(out.error)return res.status(out.error.status||502).json({ok:false,error:out.error.error||'AI request failed'});
    const text=responseText(out.d);
    if(!text)return res.status(502).json({ok:false,error:'OpenAI returned an empty response'});
    res.json({ok:true,text});
  }catch(e){res.status(502).json({ok:false,error:e.message||'AI unavailable'});}
});

app.listen(PORT, () => console.log(`iomastavka listening on ${PORT}`));
