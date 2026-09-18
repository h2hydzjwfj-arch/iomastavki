const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 10000);
const ROOT = __dirname;
const DATA = path.join(ROOT,'data');
const agents = JSON.parse(fs.readFileSync(path.join(DATA,'agents.json'),'utf8'));
const rates = JSON.parse(fs.readFileSync(path.join(DATA,'rates.json'),'utf8'));
const cache={cbr:{at:0,data:null},weather:{at:0,data:null},news:{at:0,data:null}};
const MODELS=[process.env.OPENAI_MODEL||'gpt-5.6-luna','gpt-5.1','gpt-5','gpt-4.1-mini'].filter((v,i,a)=>v&&a.indexOf(v)===i);

function send(res,status,type,body){res.writeHead(status,{'content-type':type,'cache-control':'no-store','access-control-allow-origin':'*'});res.end(body)}
function json(res,status,obj){send(res,status,'application/json; charset=utf-8',JSON.stringify(obj))}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2e6){req.destroy();reject(new Error('body too large'))}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function xmlTag(x,n){const m=x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`,'i'));return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim():''}
function getText(url,timeout=8000){return fetch(url,{redirect:'follow',signal:AbortSignal.timeout(timeout),headers:{'user-agent':'iomastavka-file1'}}).then(async r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text()})}
function parseRss(xml,source){const blocks=xml.match(/<item[\s\S]*?<\/item>/gi)||[];return blocks.slice(0,30).map(b=>({title:xmlTag(b,'title'),url:xmlTag(b,'link')||xmlTag(b,'guid'),publishedAt:xmlTag(b,'pubDate')?new Date(xmlTag(b,'pubDate')).toISOString():new Date().toISOString(),source})).filter(x=>x.title&&x.url)}
function important(t){return /(запрет|огранич|пошлин|ставк|повыш|снижен|обязател|электронн|маркиров|честн(ый|ого) знак|санкц|квот|утилизац|таможен|ндс|акциз|сертифик|декларац|накладн|ЭТрН|ЭДО)/i.test(t)}
async function cbr(){if(cache.cbr.data&&Date.now()-cache.cbr.at<15*60e3)return cache.cbr.data;const x=await getText('https://www.cbr.ru/scripts/XML_daily.asp',7000);const vs={};for(const b of x.match(/<Valute[\s\S]*?<\/Valute>/gi)||[]){const c=xmlTag(b,'CharCode');if(c)vs[c]=Number(xmlTag(b,'Value').replace(',','.'))/Number(xmlTag(b,'Nominal')||1)}const d={date:xmlTag(x,'Date'),usd:vs.USD,eur:vs.EUR,cny:vs.CNY,source:'Банк России',fetchedAt:new Date().toISOString()};if(!d.usd||!d.eur||!d.cny)throw Error('CBR data incomplete');cache.cbr={at:Date.now(),data:d};return d}
async function weather(){if(cache.weather.data&&Date.now()-cache.weather.at<5*60e3)return cache.weather.data;const key=process.env.OPENWEATHER_API_KEY;if(!key)return {configured:false,isNight:null,condition:'unknown',city:'Москва'};const r=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Moscow,RU&appid=${encodeURIComponent(key)}&units=metric&lang=ru`,{signal:AbortSignal.timeout(7000)});const j=await r.json();if(!r.ok||j.cod!==200)throw Error(j.message||'weather error');const now=Math.floor(Date.now()/1000);const d={configured:true,city:'Москва',condition:j.weather?.[0]?.main||'Clouds',description:j.weather?.[0]?.description||'',temp:Math.round(j.main?.temp),isNight:now<j.sys.sunrise||now>=j.sys.sunset,sunrise:j.sys.sunrise,sunset:j.sys.sunset,updatedAt:new Date().toISOString()};cache.weather={at:Date.now(),data:d};return d}
async function news(){if(cache.news.data&&Date.now()-cache.news.at<10*60e3)return cache.news.data;const feeds=[['Google News · ВЭД/логистика','https://news.google.com/rss/search?q=ВЭД+логистика+Китай+Россия+таможня&hl=ru&gl=RU&ceid=RU:ru'],['Google News · таможня','https://news.google.com/rss/search?q=ФТС+таможня+ТН+ВЭД+Россия&hl=ru&gl=RU&ceid=RU:ru'],['ФТС России','https://customs.gov.ru/press/federal/novosti']];let out=[];for(const [src,url] of feeds){try{const x=await getText(url,7000);if(url.includes('news.google'))out.push(...parseRss(x,src));else{for(const m of x.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const title=m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();if(title.length<35||!/(тамож|ВЭД|логист|перевоз|импорт|экспорт|ТН ВЭД|декларац|Китай|ЕАЭС)/i.test(title))continue;let u=m[1];if(u.startsWith('/'))u='https://customs.gov.ru'+u;if(/^https?:/.test(u))out.push({title,url:u,publishedAt:new Date().toISOString(),source:src})}}}catch(e){}}
const seen=new Set();out=out.filter(x=>{const k=x.title.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,24).map(x=>({...x,important:important(x.title)}));const d={items:out,updatedAt:new Date().toISOString()};cache.news={at:Date.now(),data:d};return d}
async function ai(input,{web=false,instructions='' }={}){const key=process.env.OPENAI_API_KEY;if(!key)throw Error('OPENAI_API_KEY не настроен на Render');let last='';for(const model of MODELS){try{const body={model,input,instructions,max_output_tokens:900};if(web)body.tools=[{type:'web_search',search_context_size:'low'}];const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'authorization':`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(web?20000:12000)});const j=await r.json();if(!r.ok){last=j?.error?.message||`OpenAI HTTP ${r.status}`;continue}if(j.output_text)return j.output_text;const t=(j.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');if(t)return t;last='Пустой ответ'}catch(e){last=e.message}}throw Error(last||'AI недоступен')}
function staticFile(res,p){let f=p==='/'?'/index.html':p;if(f.includes('..'))return json(res,403,{ok:false});const full=path.join(ROOT,f);if(!fs.existsSync(full)||fs.statSync(full).isDirectory())return json(res,404,{ok:false,error:'Not found'});const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};send(res,200,types[ext]||'application/octet-stream',fs.readFileSync(full))}

const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const p=u.pathname;
  if(req.method==='GET'&&p==='/api/version')return json(res,200,{ok:true,version:'1.0.0-file1',build:'clean-rebuild-2026-09-16'});
  if(req.method==='GET'&&p==='/api/config')return json(res,200,{ok:true,weatherConfigured:!!process.env.OPENWEATHER_API_KEY,aiConfigured:!!process.env.OPENAI_API_KEY});
  if(req.method==='GET'&&p==='/api/agents')return json(res,200,{ok:true,records:agents});
  if(req.method==='GET'&&p==='/api/rates')return json(res,200,{ok:true,...rates});
  if(req.method==='GET'&&p==='/api/cbr')return json(res,200,{ok:true,data:await cbr()});
  if(req.method==='GET'&&p==='/api/weather')return json(res,200,{ok:true,data:await weather()});
  if(req.method==='GET'&&p==='/api/news')return json(res,200,{ok:true,data:await news()});
  if(req.method==='POST'&&p==='/api/ai'){const b=await readBody(req);const message=String(b.message||'').trim();if(!message)return json(res,400,{ok:false,error:'Введите сообщение'});const history=Array.isArray(b.history)?b.history.slice(-8):[];const web=/(сегодня|сейчас|актуаль|последн|новост|курс|тамож|ТН ВЭД|ставк|запрет|огранич|Китай|Россия|ФТС|ЕАЭС)/i.test(message);const input=[...history.map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||'')})),{role:'user',content:message}];const answer=await ai(input,{web,instructions:'Ты AI-ассистент iomastavka. Специализация: логистика, ВЭД, Китай—Россия, перевозки, Incoterms, документы, таможня и ТН ВЭД. Отвечай кратко и практично по-русски. Не выдумывай ставки и нормативные требования. Для актуальных вопросов используй веб-поиск. Для таможни приоритетны customs.gov.ru и eec.eaeunion.org.'});return json(res,200,{ok:true,answer})}
  if(req.method==='POST'&&p==='/api/customs/check'){
    const b=await readBody(req);
    const code=String(b.code||'').replace(/\D/g,'');
    if(!/^\d{10}$/.test(code)) return json(res,400,{ok:false,error:'Введите ровно 10 цифр ТН ВЭД ЕАЭС'});
    const prompt=`Проверь ТН ВЭД ЕАЭС ${code}. Используй веб-поиск, приоритет customs.gov.ru и eec.eaeunion.org. Верни JSON: {"code":"${code}","shortDescription":"краткое название до 100 символов","importDuty":"0%/5%/10%/… или неизвестно","vat":"ставка или неизвестно","customsFee":"сумма/правило или неизвестно","excise":"нет/ставка/неизвестно","honestSign":"да/нет/зависит/неизвестно","restrictions":"кратко до 180 символов","sourceUrls":["https://..."],"confidence":"high|medium|low"}. Не выдумывай ставку.`;
    try {
      const raw=await ai(prompt,{web:true,instructions:'Ты специалист по таможенному регулированию ЕАЭС. Только достоверные данные. Только JSON.'});
      const clean=raw.replace(/^```json\s*/,'').replace(/```$/,'').trim();
      return json(res,200,{ok:true,data:JSON.parse(clean)});
    } catch(e) {
      return json(res,200,{ok:true,data:{code,shortDescription:'Требуется уточнение описания товара',importDuty:'Не подтверждено',vat:'Не подтверждено',customsFee:'По таможенной стоимости и виду декларации',excise:'Не подтверждено',honestSign:'Зависит от товара',restrictions:'Требуется отдельная проверка характеристик и мер нетарифного регулирования',sourceUrls:['https://customs.gov.ru/','https://eec.eaeunion.org/'],confidence:'low',warning:e.message}});
    }
  }
  return staticFile(res,p);
 }catch(e){console.error(e);return json(res,502,{ok:false,error:e.message||'Server error'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`iomastavka File 1 listening on ${PORT}`));
