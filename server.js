const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 10000);
const ROOT = __dirname;
const DATA = fs.existsSync(path.join(ROOT,'data')) ? path.join(ROOT,'data') : ROOT;
const agents = JSON.parse(fs.readFileSync(path.join(DATA,'agents.json'),'utf8'));
const rates = JSON.parse(fs.readFileSync(path.join(DATA,'rates.json'),'utf8'));
const cache={cbr:{at:0,data:null},weather:{at:0,data:null},news:{at:0,data:null},tnved:{at:0,data:{}}};
const MODELS=[process.env.OPENAI_MODEL||'gpt-4o-mini','gpt-4.1-mini','gpt-4o','gpt-5-mini'].filter((v,i,a)=>v&&a.indexOf(v)===i);

function send(res,status,type,body){res.writeHead(status,{'content-type':type,'cache-control':'no-store','access-control-allow-origin':'*'});res.end(body)}
function json(res,status,obj){send(res,status,'application/json; charset=utf-8',JSON.stringify(obj))}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2e6){req.destroy();reject(new Error('body too large'))}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function cleanText(s){return s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/\s+/g,' ').trim()}
function xmlTag(x,n){const m=x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`,'i'));return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim():''}
function getText(url,timeout=9000){return fetch(url,{redirect:'follow',signal:AbortSignal.timeout(timeout),headers:{'user-agent':'Mozilla/5.0 (compatible; iomastavka/2.0; +https://iomastavka.ru)','accept':'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8'}}).then(async r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text()})}
function parseRss(xml,source){const blocks=xml.match(/<item[\s\S]*?<\/item>/gi)||[];return blocks.slice(0,30).map(b=>({title:xmlTag(b,'title'),url:xmlTag(b,'link')||xmlTag(b,'guid'),publishedAt:xmlTag(b,'pubDate')?new Date(xmlTag(b,'pubDate')).toISOString():new Date().toISOString(),source})).filter(x=>x.title&&x.url)}
function important(t){return /(запрет|огранич|пошлин|ставк|повыш|снижен|обязател|электронн|маркиров|честн(ый|ого) знак|санкц|квот|утилизац|таможен|ндс|акциз|сертифик|декларац|накладн|ЭТрН|ЭДО)/i.test(t)}

/* ---------- ЦБ РФ ---------- */
async function cbr(){
 if(cache.cbr.data&&Date.now()-cache.cbr.at<15*60e3)return cache.cbr.data;
 const x=await getText('https://www.cbr.ru/scripts/XML_daily.asp',7000);const vs={};
 for(const b of x.match(/<Valute[\s\S]*?<\/Valute>/gi)||[]){const c=xmlTag(b,'CharCode');if(c)vs[c]=Number(xmlTag(b,'Value').replace(',','.'))/Number(xmlTag(b,'Nominal')||1)}
 const d={date:xmlTag(x,'Date'),usd:vs.USD,eur:vs.EUR,cny:vs.CNY,source:'Банк России',fetchedAt:new Date().toISOString()};
 if(!d.usd||!d.eur||!d.cny)throw Error('CBR data incomplete');
 cache.cbr={at:Date.now(),data:d};return d;
}

/* ---------- Погода ---------- */
async function weather(){
 if(cache.weather.data&&Date.now()-cache.weather.at<5*60e3)return cache.weather.data;
 const key=process.env.OPENWEATHER_API_KEY;if(!key)return {configured:false,isNight:null,condition:'unknown',city:'Москва'};
 const r=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Moscow,RU&appid=${encodeURIComponent(key)}&units=metric&lang=ru`,{signal:AbortSignal.timeout(7000)});
 const j=await r.json();if(!r.ok||j.cod!==200)throw Error(j.message||'weather error');
 const now=Math.floor(Date.now()/1000);
 const d={configured:true,city:'Москва',condition:j.weather?.[0]?.main||'Clouds',description:j.weather?.[0]?.description||'',temp:Math.round(j.main?.temp),isNight:now<j.sys.sunrise||now>=j.sys.sunset,sunrise:j.sys.sunrise,sunset:j.sys.sunset,updatedAt:new Date().toISOString()};
 cache.weather={at:Date.now(),data:d};return d;
}

/* ---------- Новости ---------- */
async function news(){
 if(cache.news.data&&Date.now()-cache.news.at<10*60e3)return cache.news.data;
 const feeds=[
  ['Google News · ВЭД/логистика','https://news.google.com/rss/search?q=ВЭД+логистика+Китай+Россия+таможня&hl=ru&gl=RU&ceid=RU:ru'],
  ['Google News · таможня','https://news.google.com/rss/search?q=ФТС+таможня+ТН+ВЭД+Россия&hl=ru&gl=RU&ceid=RU:ru'],
  ['ФТС России','https://customs.gov.ru/press/federal/novosti']
 ];
 let out=[];
 for(const [src,url] of feeds){
  try{
   const x=await getText(url,7000);
   if(url.includes('news.google')){out.push(...parseRss(x,src))}
   else{for(const m of x.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const title=cleanText(m[2]);if(title.length<35||!/(тамож|ВЭД|логист|перевоз|импорт|экспорт|ТН ВЭД|декларац|Китай|ЕАЭС)/i.test(title))continue;let u=m[1];if(u.startsWith('/'))u='https://customs.gov.ru'+u;if(/^https?:/.test(u))out.push({title,url:u,publishedAt:new Date().toISOString(),source:src})}}
  }catch(e){}
 }
 const seen=new Set();
 out=out.filter(x=>{const k=x.title.toLowerCase();if(seen.has(k))return false;seen.add(k);return true})
  .sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,24).map(x=>({...x,important:important(x.title)}));
 const d={items:out,updatedAt:new Date().toISOString()};
 cache.news={at:Date.now(),data:d};return d;
}

/* ---------- Чтение статьи прямо на сайте ---------- */
async function readArticle(rawUrl){
 let url=rawUrl;
 if(/news\.google\./i.test(url)){ // google-ссылки редиректят через HTML — пробуем вытащить цель
  const h=await getText(url,9000);
  const m=h.match(/url=(https?[^"&]+)/i)||h.match(/href="(https?[^"]+)"/i);
  if(m)url=decodeURIComponent(m[1]);
 }
 const html=await getText(url,10000);
 let title='';
 const og=html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)||html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
 if(og)title=cleanText(og[1]);
 if(!title){const t=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);title=t?cleanText(t[1]):'Новость'}
 let scope=html.replace(/<(script|style|noscript|svg|iframe|header|footer|nav|aside|form)[\s\S]*?<\/\1>/gi,' ');
 const art=scope.match(/<article[\s\S]*?<\/article>/i)||scope.match(/<main[\s\S]*?<\/main>/i);
 if(art)scope=art[0];
 let paras=[...scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>cleanText(m[1])).filter(t=>t.length>60&&t.split(' ').length>8);
 if(!paras.length)paras=[...scope.replace(/<[^>]+>/g,'\n').split('\n')].map(s=>cleanText(s)).filter(t=>t.length>100);
 const text=paras.slice(0,50).join('\n\n').slice(0,15000);
 if(text.length<200)throw Error('Текст статьи не извлёкся');
 return {title,text,finalUrl:url};
}

/* ---------- AI (chat/completions — дешевле и стабильнее) ---------- */
async function aiChat(messages){
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw Error('Ключ OPENAI_API_KEY не задан в настройках Render (Environment → Add)');
 let last='';
 for(const model of MODELS){
  try{
   const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'authorization':`Bearer ${key}`,'content-type':'application/json'},
    body:JSON.stringify({model,messages,max_tokens:900,temperature:0.3}),
    signal:AbortSignal.timeout(30000)
   });
   const j=await r.json();
   if(!r.ok){
    last=(j&&j.error&&j.error.message)||(`OpenAI HTTP ${r.status}`);
    if(/quota|credit|billing|balance/i.test(last))last='У аккаунта OpenAI нет средств (insufficient credits) или ключ неверный. Пополните баланс на platform.openai.com → Billing → Add credit, затем перезапустите сервис на Render.';
    continue;
   }
   const t=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
   if(t&&t.trim())return t.trim();
   last='Пустой ответ от модели';
  }catch(e){last=e.message}
 }
 throw Error(last||'AI временно недоступен');
}

/* ---------- ТН ВЭД: реальные данные без OpenAI ---------- */
const FEE_TABLE=[[200000,775,'до 200 000 ₽'],[450000,1550,'200 000 – 450 000 ₽'],[1200000,3100,'450 000 – 1 200 000 ₽'],[2500000,8530,'1 200 000 – 2 500 000 ₽'],[5000000,12000,'2 500 000 – 5 000 000 ₽'],[10000000,30000,'5 000 000 – 10 000 000 ₽'],[Infinity,30000,'свыше 10 000 000 ₽']];
function feeFor(value){if(!value||value<=0)return null;for(const [lim,fee] of FEE_TABLE){if(value<=lim)return fee}return 30000}
function feeRule(){return FEE_TABLE.map(([l,f,r])=>`${r} → ${f.toLocaleString('ru-RU')} ₽`).join(' · ')}

const MARKING_GROUPS=[
 [/^640[1-5]/,'Обувь — обязательная маркировка «Честный знак»'],
 [/^3303/,'Парфюмерия — маркировка'],
 [/^4011/,'Шины — маркировка'],
 [/^9006/,'Фотокамеры — маркировка'],
 [/^(610[0-9]|611[0-9]|620[0-9]|621[0-9]|6217)/,'Одежда и текстиль — маркировка'],
 [/^2201/,'Питьевая вода — маркировка'],
 [/^2203/,'Пиво — маркировка'],
 [/^240[1-4]/,'Табак — маркировка'],
 [/^87(01|02|03|04|11)/,'Авто/мототехника — есть риск утилизационного сбора'],
 [/^8517/,'Радиоэлектроника — проверьте требования ЕАЭС (сертификация)'],
 [/^84(71|72|73|50)/,'Компьютерная/офисная техника — сертификация ЕАЭС'],
 [/^8541/,'Микросхемы — экспортный контроль, проверьте ограничения'],
];

async function tnvedLookup(code){
 if(cache.tnved.data[code]&&Date.now()-cache.tnved.at<24*3600e3)return cache.tnved.data[code];
 const result={code,shortDescription:'',importDuty:'',vat:'',excise:'',honestSign:'',restrictions:'',confidence:'low',sourceUrls:['https://www.alta.ru/tnved/code/'+code+'/','https://customs.gov.ru/','https://eec.eaeunion.org/']};
 let gotFromAlta=false;
 try{
  const html=await getText('https://www.alta.ru/tnved/code/'+code+'/',10000);
  gotFromAlta=true;
  let desc='';
  const h1=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if(h1)desc=cleanText(h1[1]);
  if(!desc){const og=html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i);if(og)desc=cleanText(og[1])}
  if(!desc){const t=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);if(t)desc=cleanText(t[1]).replace(/\s*[—–-]\s*alta\.?ru.*$/i,'')}
  desc=desc.replace(new RegExp('^'+code.replace(/(\d)/g,'$1\\s?')+'\\s*[-–—:]?\\s*','i'),'').replace(/^код\s*/i,'').trim();
  if(desc&&desc.length>10)result.shortDescription=desc.slice(0,180);
  const duty=html.match(/ввозн\w*\s+(?:таможенн\w+\s+)?пошлин[\s\S]{0,250}?(\d+(?:[.,]\d+)?)\s*%/i)
    ||html.match(/импортн\w*\s+пошлин[\s\S]{0,150}?(\d+(?:[.,]\d+)?)\s*%/i)
    ||html.match(/ставка\s+пошлин[\s\S]{0,150}?(\d+(?:[.,]\d+)?)\s*%/i);
  if(duty)result.importDuty=duty[1].replace(',','.')+'%';
  const vat=html.match(/НДС[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i);
  if(vat)result.vat=vat[1].replace(',','.')+'%';
  const exc=html.match(/акциз[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i);
  if(exc)result.excise='по ставке (см. alta.ru)';
  result.confidence=(result.importDuty&&result.vat)?'medium':'low';
 }catch(e){}
 for(const [re,label] of MARKING_GROUPS){if(re.test(code)){result.honestSign=label+'. Точный статус — честныйзнак.рф';break}}
 if(!result.honestSign)result.honestSign='По коду не относится к типовым маркируемым группам; финальную проверку делайте на честныйзнак.рф';
 if(!result.importDuty)result.importDuty=gotFromAlta?'не подтверждено (уточните на alta.ru / eec.eaeunion.org)':'не подтверждено';
 if(!result.vat)result.vat=gotFromAlta?'не подтверждено':'20% (базовая ставка в РФ; уточните льготы)';
 if(!result.excise)result.excise='Нет данных — акцизы: алкоголь, табак, топливо, авто';
 result.restrictions='Проверьте меры нетарифного регулирования (сертификаты/декларации ЕАЭС, разрешительные документы) на customs.gov.ru и eec.eaeunion.org';
 if(!gotFromAlta)result.warning='Не удалось связаться с alta.ru — показаны ориентировочные данные. Обязательно сверьте ставки по ссылкам ниже.';
 cache.tnved.data[code]=result;cache.tnved.at=Date.now();
 return result;
}

/* ---------- Статика ---------- */
function staticFile(res,p){
 let f=p==='/'?'/index.html':p;
 if(f.includes('..'))return json(res,403,{ok:false});
 const full=path.join(ROOT,f);
 if(!fs.existsSync(full)||fs.statSync(full).isDirectory())return json(res,404,{ok:false,error:'Not found'});
 const ext=path.extname(full);
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
 send(res,200,types[ext]||'application/octet-stream',fs.readFileSync(full));
}

const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const p=u.pathname;
  if(req.method==='GET'&&p==='/api/version')return json(res,200,{ok:true,version:'2.1.0-file1',build:'functional-restore-2026-09-18'});
  if(req.method==='GET'&&p==='/api/config')return json(res,200,{ok:true,weatherConfigured:!!process.env.OPENWEATHER_API_KEY,aiConfigured:!!process.env.OPENAI_API_KEY});
  if(req.method==='GET'&&p==='/api/agents')return json(res,200,{ok:true,records:agents});
  if(req.method==='GET'&&p==='/api/rates')return json(res,200,{ok:true,...rates});
  if(req.method==='GET'&&p==='/api/cbr')return json(res,200,{ok:true,data:await cbr()});
  if(req.method==='GET'&&p==='/api/weather')return json(res,200,{ok:true,data:await weather()});
  if(req.method==='GET'&&p==='/api/news')return json(res,200,{ok:true,data:await news()});
  if(req.method==='GET'&&p==='/api/news/read'){
   const url=u.searchParams.get('url')||'';
   if(!/^https?:\/\//i.test(url)||url.length>2000)return json(res,400,{ok:false,error:'Некорректная ссылка'});
   try{const a=await readArticle(url);return json(res,200,{ok:true,title:a.title,text:a.text,finalUrl:a.finalUrl})}
   catch(e){return json(res,200,{ok:false,error:e.message||'Не удалось загрузить статью'})}
  }
  if(req.method==='POST'&&p==='/api/ai'){
   const b=await readBody(req);
   const message=String(b.message||'').trim();
   if(!message)return json(res,400,{ok:false,error:'Введите сообщение'});
   const history=Array.isArray(b.history)?b.history.slice(-8):[];
   const messages=[
    {role:'system',content:'Ты AI-ассистент iomastavka. Специализация: логистика, ВЭД, Китай—Россия, перевозки, Incoterms, документы, таможня и ТН ВЭД. Отвечай кратко и практично по-русски. Не выдумывай ставки и нормативные требования.'},
    ...history.map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||'')})),
    {role:'user',content:message}
   ];
   try{const answer=await aiChat(messages);return json(res,200,{ok:true,answer})}
   catch(e){return json(res,200,{ok:false,error:e.message})}
  }
  if(req.method==='POST'&&p==='/api/customs/check'){
   const b=await readBody(req);
   const code=String(b.code||'').replace(/\D/g,'');
   if(!/^\d{10}$/.test(code))return json(res,400,{ok:false,error:'Введите ровно 10 цифр ТН ВЭД ЕАЭС'});
   const value=Number(b.value)||0;
   const d=await tnvedLookup(code);
   const fee=feeFor(value);
   const data={...d,
    customsFee:fee?fee.toLocaleString('ru-RU')+' ₽':'укажите таможенную стоимость для расчёта',
    feeNote:fee?('Сбор по шкале Совета ЕЭК № 51. Шкала: '+feeRule()):('Шкала сборов (Совет ЕЭК № 51): '+feeRule()),
    checkedAt:new Date().toLocaleString('ru-RU')
   };
   return json(res,200,{ok:true,data});
  }
  return staticFile(res,p);
 }catch(e){console.error(e);return json(res,502,{ok:false,error:e.message||'Server error'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`iomastavka File 1 listening on ${PORT}`));