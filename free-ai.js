import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.84";
import { KNOWLEDGE } from "./knowledge.js";

const MODEL="Llama-3.2-1B-Instruct-q4f16_1-MLC";
let engine=null, loading=null;

function status(t){const e=document.getElementById('assistantStatus');if(e)e.innerHTML=`<span>${t}</span>`}

async function init(){
  if(engine)return engine;
  if(loading)return loading;
  if(!navigator.gpu)throw new Error('Бесплатный ИИ требует WebGPU. Откройте сайт в актуальном Chrome или Edge.');
  loading=webllm.CreateMLCEngine(MODEL,{initProgressCallback:p=>status(`Бесплатный ИИ загружается… ${Math.round((p.progress||0)*100)}%`)})
    .then(e=>{engine=e;status('Бесплатный ИИ готов.');return e})
    .finally(()=>loading=null);
  return loading;
}

const STOP = new Set(['что','как','для','или','это','его','она','они','где','когда','если','при','чем','тем','без','под','над','все','всё','эта','эти','тот','так','там','тут','быть','есть','надо','нужно','можно','тоже','также']);

function tokenize(s){
  return String(s).toLowerCase()
    .replace(/[^\wа-яё\s]/gi,' ')
    .split(/\s+/)
    .filter(w=>w.length>2 && !STOP.has(w));
}

function findRelevant(query, topK=3){
  const q = new Set(tokenize(query));
  if(q.size === 0) return [];
  const scored = KNOWLEDGE.map((c) => {
    const words = tokenize(c.text);
    let score = 0;
    const seen = new Set();
    for(const w of words){
      if(q.has(w) && !seen.has(w)){ score += 1; seen.add(w); }
    }
    const qstr = String(query).toLowerCase();
    if(qstr.length > 6 && c.text.toLowerCase().includes(qstr)) score += 5;
    return { score, c };
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0, topK).filter(x=>x.score>0).map(x=>x.c);
}

function sys(context, refs){
  let s = `Ты — встроенный помощник сайта iomastavka (West Asia). Помогаешь по темам: логистика Китай→Россия, ВЭД, таможня, Incoterms, ставки, документы, сценарии доставки.
Отвечай простым, дружелюбным языком, по делу, без воды. Не выдумывай факты и цифры. Если не знаешь — скажи честно.
Если пользователь прикрепил документ — используй его содержимое (это важнее справочника).
Если в вопросе есть расчёт — считай аккуратно, показывай ход.

Контекст калькулятора: ${JSON.stringify(context||{})}`;

  if(refs && refs.length){
    s += `\n\n=== СПРАВКА ИЗ БАЗЫ ЗНАНИЙ (используй как источник, если релевантно вопросу) ===\n`;
    refs.forEach((c, i) => {
      s += `\n--- Фрагмент ${i+1}${c.section ? ' · ' + c.section : ''} ---\n${c.text}\n`;
    });
    s += `\n=== КОНЕЦ СПРАВКИ ===\n`;
  }
  return s;
}

async function chat(message, history=[], context={}){
  const e = await init();
  const refs = findRelevant(message, 3);
  const messages = [{ role:'system', content: sys(context, refs) }];
  for(const m of (history||[]).slice(-6)){
    if(m?.role && m?.content) messages.push({ role:m.role, content:String(m.content) });
  }
  messages.push({ role:'user', content:String(message) });
  const r = await e.chat.completions.create({ messages, temperature:0.35, max_tokens:800 });
  return r?.choices?.[0]?.message?.content || 'Не смог сформулировать ответ.';
}

window.freeAI = { init, chat, model: MODEL, findRelevant };
