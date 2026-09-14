
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const I18N = {
  ru:{title:"Рассчитать параметры груза",from:"Откуда",to:"Куда",cargo:"ГРУЗ",weight:"Вес, кг",pieces:"Количество мест",distance:"Расстояние, км",dimensions:"ГАБАРИТЫ ОДНОГО МЕСТА, ММ",volumeAll:"Объём — по всем местам",length:"Длина",width:"Ширина",height:"Высота",forwarder:"Экспедитор",transport:"Вид транспорта",incoterms:"Условия поставки",dimWeight:"Объёмный вес",chooseForwarder:"Выберите экспедитора",chooseTransport:"Выберите транспорт",selected:"ЭКСПЕДИТОР",none:"Не выбран",calculate:"Рассчитать",agents:"Экспедиторы",assistant:"ИИ-ассистент",assistantSub:"Обновление ставок",assistantHelp:"Передай ставку обычным текстом. Например: «MultiWell Китай Москва ЖД 1800 USD за тонну».",updateRates:"Обновить ставки",logout:"Выйти"},
  en:{title:"Calculate cargo parameters",from:"From",to:"To",cargo:"CARGO",weight:"Weight, kg",pieces:"Pieces",distance:"Distance, km",dimensions:"DIMENSIONS OF ONE PIECE, MM",volumeAll:"Volume — all pieces",length:"Length",width:"Width",height:"Height",forwarder:"Forwarder",transport:"Transport",incoterms:"Incoterms",dimWeight:"Volumetric weight",chooseForwarder:"Choose forwarder",chooseTransport:"Choose transport",selected:"FORWARDER",none:"Not selected",calculate:"Calculate",agents:"Forwarders",assistant:"AI assistant",assistantSub:"Rate updates",assistantHelp:"Send a rate in plain text. Example: “MultiWell China Moscow rail 1800 USD per ton”.",updateRates:"Update rates",logout:"Log out"},
  zh:{title:"计算货物参数",from:"起运地",to:"目的地",cargo:"货物",weight:"重量，公斤",pieces:"件数",distance:"距离，公里",dimensions:"单件尺寸，毫米",volumeAll:"体积 — 所有件",length:"长度",width:"宽度",height:"高度",forwarder:"货运代理",transport:"运输方式",incoterms:"贸易术语",dimWeight:"体积重量",chooseForwarder:"选择货运代理",chooseTransport:"选择运输方式",selected:"货运代理",none:"未选择",calculate:"计算",agents:"货运代理",assistant:"AI 助手",assistantSub:"更新运价",assistantHelp:"用自然语言输入运价。例如：“MultiWell 中国 莫斯科 铁路 1800 USD/吨”。",updateRates:"更新运价",logout:"退出"}
};

const modes = {
  air:{ru:"Авиа",en:"Air",zh:"空运",factor:167},
  road:{ru:"Авто",en:"Road",zh:"公路",factor:400},
  rail:{ru:"ЖД",en:"Rail",zh:"铁路",factor:500},
  sea:{ru:"Море",en:"Sea",zh:"海运",factor:1000}
};
const modeGroups = [
  ["rail","ЖД"],["road","Авто"],["air","Авиа"],["sea","Море"]
];
let lang = localStorage.getItem("iomastavka_lang") || "ru";
let rates = {};
let selectedForwarder = "";
let selectedMode = "";
let selectedFactor = 167;

const cities = [
 ["Иу","Yiwu","义乌","Jinhua Shi","China","cn"],["Шанхай","Shanghai","上海","Shanghai","China","cn"],
 ["Шэньчжэнь","Shenzhen","深圳","Guangdong","China","cn"],["Гуанчжоу","Guangzhou","广州","Guangdong","China","cn"],
 ["Пекин","Beijing","北京","Beijing","China","cn"],["Циндао","Qingdao","青岛","Shandong","China","cn"],
 ["Нинбо","Ningbo","宁波","Zhejiang","China","cn"],["Тяньцзинь","Tianjin","天津","Tianjin","China","cn"],
 ["Ханчжоу","Hangzhou","杭州","Zhejiang","China","cn"],["Чэнду","Chengdu","成都","Sichuan","China","cn"],
 ["Чунцин","Chongqing","重庆","Chongqing","China","cn"],["Сямэнь","Xiamen","厦门","Fujian","China","cn"],
 ["Сучжоу","Suzhou","苏州","Jiangsu","China","cn"],["Ухань","Wuhan","武汉","Hubei","China","cn"],
 ["Далянь","Dalian","大连","Liaoning","China","cn"],["Шэньян","Shenyang","沈阳","Liaoning","China","cn"],
 ["Харбин","Harbin","哈尔滨","Heilongjiang","China","cn"],["Сеул","Seoul","서울","South Korea","kr"],
 ["Пусан","Busan","부산","South Korea","kr"],["Мумбаи","Mumbai","मुंबई","Maharashtra","India","in"],
 ["Дели","Delhi","दिल्ली","India","in"],["Ченнаи","Chennai","சென்னை","Tamil Nadu","India","in"],
 ["Москва","Moscow","Москва","Moscow","Russia","ru"],["Казань","Kazan","Казань","Tatarstan","Russia","ru"],
 ["Санкт-Петербург","Saint Petersburg","Санкт-Петербург","Russia","Russia","ru"],["Екатеринбург","Yekaterinburg","Екатеринбург","Sverdlovsk","Russia","ru"],
 ["Новосибирск","Novosibirsk","Новосибирск","Russia","Russia","ru"],["Владивосток","Vladivostok","Владивосток","Primorsky Krai","Russia","ru"],
 ["Самара","Samara","Самара","Russia","Russia","ru"],["Нижний Новгород","Nizhny Novgorod","Нижний Новгород","Russia","Russia","ru"]
];

function tr(key){return I18N[lang][key] || key}
function modeName(k){return modes[k]?.[lang] || k}
function applyLang(){
  document.documentElement.lang=lang;
  $$("[data-i18n]").forEach(el=>el.textContent=tr(el.dataset.i18n));
  $$(".lang").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
  localStorage.setItem("iomastavka_lang",lang);
}
$$(".lang").forEach(b=>b.onclick=()=>{lang=b.dataset.lang;applyLang();renderForwarderMenu();renderTransportMenu()});

async function loadRates(){
  try{
    const r=await fetch("/api/rates",{credentials:"same-origin"});
    if(r.ok) rates=await r.json();
  }catch{}
  renderForwarderMenu();
}
function forwarderModes(name){return rates[name]?.modes || []}
function renderForwarderMenu(){
  const menu=$("#forwarderMenu"); menu.innerHTML="";
  Object.keys(rates).forEach(name=>{
    const b=document.createElement("button"); b.className="hover-item"; b.textContent=name;
    b.onclick=()=>selectForwarder(name); menu.appendChild(b);
  });
  renderAgents();
}
function selectForwarder(name){
  selectedForwarder=name; selectedMode="";
  $("#forwarderBtn span").textContent=name;
  $("#transportBtn span").textContent=tr("chooseTransport");
  $("#selectedForwarder strong").textContent=name;
  $("#capabilities").textContent=forwarderModes(name).map(modeName).join(" · ");
  renderTransportMenu();
  closeSide();
  showRecommendation(name);
}
function renderTransportMenu(){
  const menu=$("#transportMenu"); menu.innerHTML="";
  const list=selectedForwarder?forwarderModes(selectedForwarder):[];
  if(!list.length){menu.innerHTML=`<div class="hover-item">${tr("chooseForwarder")}</div>`;return}
  list.forEach(k=>{const b=document.createElement("button");b.className="hover-item";b.textContent=`${modeName(k)} · ${modes[k].factor} кг/м³`;b.onclick=()=>{selectedMode=k;selectedFactor=modes[k].factor;$("#transportBtn span").textContent=modeName(k);$("#factorBtn span").textContent=`1 м³ = ${selectedFactor} кг`;};menu.appendChild(b)});
}
function renderAgents(){
  const box=$("#agentGroups"); box.innerHTML="";
  modeGroups.forEach(([mode,title])=>{
    const list=Object.keys(rates).filter(n=>forwarderModes(n).includes(mode)); if(!list.length)return;
    const g=document.createElement("div");g.innerHTML=`<div class="group-title">${title}</div>`;
    list.forEach(n=>{const b=document.createElement("button");b.className="agent-row";b.innerHTML=`<strong>${n}</strong><small>${forwarderModes(n).map(modeName).join(" · ")}</small>`;b.onclick=()=>selectForwarder(n);g.appendChild(b)});
    box.appendChild(g);
  });
}
const incoterms=["EXW","FCA","FOB","CIF","DAP","DDP"];
incoterms.forEach(x=>{const b=document.createElement("button");b.className="hover-item";b.textContent=x;b.onclick=()=>$("#incotermBtn span").textContent=x;$("#incotermMenu").appendChild(b)});
[167,400,500,1000].forEach(x=>{const b=document.createElement("button");b.className="hover-item";b.textContent=`1 м³ = ${x} кг`;b.onclick=()=>{selectedFactor=x;$("#factorBtn span").textContent=`1 м³ = ${x} кг`};$("#factorMenu").appendChild(b)});

function closeSide(){$("#sideMenu").classList.remove("open")}
$("#menuButton").onclick=e=>{$("#sideMenu").classList.toggle("open");e.stopPropagation()};
$("#agentsOpen").onclick=()=>{$("#agentsPanel").classList.toggle("open");closeSide()};
$("#assistantOpen").onclick=()=>{$("#assistantPanel").classList.add("open");closeSide()};
$("#assistantClose").onclick=()=>$("#assistantPanel").classList.remove("open");
$("#logoutButton").onclick=$("#menuLogout").onclick=async()=>{await fetch("/api/logout",{method:"POST"});location.href="/";};
document.addEventListener("click",e=>{
  if(!e.target.closest("#menuButton")&&!e.target.closest("#sideMenu"))closeSide();
  if(!e.target.closest("#agentsPanel")&&!e.target.closest("#agentsOpen"))$("#agentsPanel").classList.remove("open");
});

function showRecommendation(name){
  const el=$("#recommendation");
  if(name==="MultiWell"){el.textContent=lang==="ru"?"Совет: на этом направлении стоит присмотреться к MultiWell — по прошлым ставкам у него были хорошие условия.":lang==="en"?"Tip: consider MultiWell on this route — previous rates were competitive.":"建议：可以关注 MultiWell，这个方向之前的报价比较有竞争力。";el.classList.remove("hidden")}
  else el.classList.add("hidden");
}

function normalize(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function cityMatches(q, target){
  const x=normalize(q); if(!x)return cities.slice(0,8);
  const scored=cities.map(c=>{
    const fields=[c[0],c[1],c[2]];
    let score=99;
    fields.forEach((f,i)=>{const n=normalize(f);if(n.startsWith(x))score=Math.min(score,i);else if(n.includes(x))score=Math.min(score,5+i)});
    return {...{c},score};
  }).filter(o=>o.score<99).sort((a,b)=>a.score-b.score);
  return scored.slice(0,8).map(o=>o.c);
}
let geoTimer=null, geoAbort=null;
function setupAutocomplete(inputId, boxId, target){
  const input=$("#"+inputId), box=$("#"+boxId);
  input.addEventListener("input",()=>{
    clearTimeout(geoTimer);
    const q=input.value.trim();
    renderSuggestions(box,cityMatches(q,target),input);
    geoTimer=setTimeout(()=>fetchGeo(q,target,box,input),120);
  });
  input.addEventListener("focus",()=>{renderSuggestions(box,cityMatches(input.value.trim(),target),input)});
  document.addEventListener("click",e=>{if(!e.target.closest("#"+inputId)&&!e.target.closest("#"+boxId))box.classList.remove("open")});
}
function renderSuggestions(box,list,input){
  box.innerHTML="";
  list.forEach(c=>{const d=document.createElement("button");d.type="button";d.innerHTML=`<strong>${c[0]}</strong><small>${c[1]} · ${c[3]} · ${c[4]}</small>`;d.onclick=()=>{input.value=lang==="zh"?c[2]:lang==="en"?c[1]:c[0];box.classList.remove("open");autoDistance()};box.appendChild(d)});
  box.classList.toggle("open",list.length>0);
}
async function fetchGeo(q,target,box,input){
  if(!q)return;
  if(geoAbort)geoAbort.abort(); geoAbort=new AbortController();
  try{
    const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=${lang==="ru"?"ru":"en"}&format=json`;
    const r=await fetch(url,{signal:geoAbort.signal}); const data=await r.json();
    if(input.value.trim()!==q)return;
    const remote=(data.results||[]).map(x=>[x.name,x.name,x.name,x.admin1||"",x.country||"",x.country_code||""]).filter(x=>x[4]);
    const local=cityMatches(q,target);
    const merged=[...local,...remote].filter((v,i,a)=>a.findIndex(x=>normalize(x[1])===normalize(v[1])&&normalize(x[4])===normalize(v[4]))===i);
    renderSuggestions(box,merged.slice(0,8),input);
  }catch{}
}
setupAutocomplete("fromCity","fromSuggestions","china");
setupAutocomplete("toCity","toSuggestions","russia");

function autoDistance(){
  const a=cityMatches($("#fromCity").value.trim())[0],b=cityMatches($("#toCity").value.trim())[0];
  if(a&&b&&a[0]&&b[0]){
    const known={ "Иу|Москва":7600,"Шанхай|Москва":7900,"Шэньчжэнь|Москва":8200,"Гуанчжоу|Москва":8100,"Пекин|Москва":7600,"Циндао|Москва":7400,"Нинбо|Москва":7700,"Сеул|Москва":6700,"Мумбаи|Москва":5200 };
    const key=`${a[0]}|${b[0]}`; if(known[key])$("#distance").value=known[key];
  }
}

$("#calculate").onclick=()=>{
  const weight=Number($("#weight").value)||0,pieces=Number($("#pieces").value)||1;
  const l=Number($("#length").value)||0,w=Number($("#width").value)||0,h=Number($("#height").value)||0;
  const volume=(l*w*h/1e9)*pieces, volumetric=volume*selectedFactor, charge=Math.max(weight,volumetric);
  const result=$("#result");result.classList.remove("hidden");
  result.innerHTML=`<strong>${lang==="ru"?"Объём":"Volume"}:</strong> ${volume.toFixed(3)} м³ · <strong>${lang==="ru"?"Объёмный вес":"Volumetric weight"}:</strong> ${volumetric.toFixed(1)} кг · <strong>${lang==="ru"?"Расчётный вес":"Chargeable weight"}:</strong> ${charge.toFixed(1)} кг`;
};

$("#saveRate").onclick=async()=>{
  const text=$("#rateInput").value.trim(); if(!text)return;
  const status=$("#assistantStatus"); status.textContent=lang==="ru"?"Обрабатываю…":"Processing…";
  const names=Object.keys(rates); const found=names.find(n=>normalize(text).includes(normalize(n)));
  const modeKey=Object.keys(modes).find(k=>new RegExp(modes[k].ru,"i").test(text)||new RegExp(modes[k].en,"i").test(text)||new RegExp(modes[k].zh,"i").test(text));
  const num=text.match(/(\d+(?:[.,]\d+)?)/);
  if(!found){status.textContent=lang==="ru"?"Не нашёл экспедитора. Добавь его имя и попробуй снова.":"Forwarder not found.";return}
  if(modeKey && num){
    rates[found].modes=[...new Set([...(rates[found].modes||[]),modeKey])];
    rates[found].latestRate={value:Number(num[1].replace(",",".")),raw:text,updatedAt:new Date().toISOString(),mode:modeKey};
    const r=await fetch("/api/rates",{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(rates)});
    if(r.ok){status.textContent=lang==="ru"?"Ставка обновлена.":"Rate updated.";renderForwarderMenu();showRecommendation(found)}else status.textContent="Ошибка сохранения.";
  }else status.textContent=lang==="ru"?"Укажи транспорт и число ставки.":"Add transport and a numeric rate.";
};

function openAssistantByGesture(){ $("#assistantPanel").classList.add("open") }
let touchStart=null;
document.addEventListener("touchstart",e=>{if(e.touches.length===3)touchStart=e.touches[0].clientX},{passive:true});
document.addEventListener("touchmove",e=>{if(touchStart!==null&&e.touches.length===3){const dx=e.touches[0].clientX-touchStart;if(dx<-70)openAssistantByGesture()}},{passive:true});
document.addEventListener("touchend",()=>touchStart=null,{passive:true});
document.addEventListener("wheel",e=>{if(Math.abs(e.deltaX)>80&&e.deltaX<0&&e.deltaX<e.deltaY*0+e.deltaX)openAssistantByGesture()},{passive:true});

function weather(){
  fetch("https://api.openweathermap.org/data/2.5/weather?lat=55.7558&lon=37.6173&appid="+encodeURIComponent(window.OPENWEATHER_API_KEY||"")+"&units=metric")
}
async function initWeather(){
  const key=document.querySelector('meta[name="ow-key"]')?.content;
  if(!key){ // server injects no secret; use public endpoint only if key is provided through config is impossible client-side
    setTimeWeather(); return;
  }
}
function setTimeWeather(){
  const hour=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Moscow",hour:"numeric",hour12:false}).format(new Date());
  const h=Number(hour); document.body.classList.remove("weather-night","weather-sun","weather-cloud","weather-rain","weather-snow");
  if(h<6||h>=20)document.body.classList.add("weather-night"); else document.body.classList.add("weather-sun");
}
setTimeWeather();

async function checkWeather(){
  try{
    const r=await fetch("/api/config"); const cfg=await r.json();
    if(!cfg.weatherConfigured){setTimeWeather();return}
    // Server-side proxy keeps the OpenWeather key secret.
    const wr=await fetch("/api/weather");
    if(!wr.ok){setTimeWeather();return}
    const d=await wr.json();
    document.body.classList.remove("weather-night","weather-sun","weather-cloud","weather-rain","weather-snow");
    const h=Number(new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Moscow",hour:"numeric",hour12:false}).format(new Date()));
    if(h<6||h>=20)document.body.classList.add("weather-night");
    else if(d.main==="Rain"||d.main==="Drizzle"||d.main==="Thunderstorm")document.body.classList.add("weather-rain");
    else if(d.main==="Snow")document.body.classList.add("weather-snow");
    else if(d.main==="Clouds")document.body.classList.add("weather-cloud");
    else document.body.classList.add("weather-sun");
  }catch{setTimeWeather()}
}
checkWeather(); setInterval(checkWeather,10*60*1000);

loadRates();applyLang();
