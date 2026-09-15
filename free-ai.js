import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.84";

const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
let engine = null;
let loading = null;

function emitStatus(text){
  const el=document.getElementById('assistantStatus');
  if(el && text) el.innerHTML=`<span>${text}</span>`;
}

async function init(){
  if(engine) return engine;
  if(loading) return loading;
  if(!navigator.gpu){
    throw new Error('Этот браузер не поддерживает WebGPU. Откройте сайт в актуальном Chrome или Edge.');
  }
  loading=webllm.CreateMLCEngine(MODEL,{
    initProgressCallback:(p)=>{
      const pct=Math.round((p.progress||0)*100);
      emitStatus(`Бесплатный ИИ загружается… ${pct}%`);
    }
  }).then(e=>{engine=e;emitStatus('Бесплатный ИИ готов.');return e;}).finally(()=>{loading=null});
  return loading;
}

function systemPrompt(context){
  return `Ты дружелюбный русскоязычный AI-помощник внутри калькулятора логистики iomastavka. Отвечай естественно, коротко и по делу. Можно просто поболтать, а можно обсудить ВЭД, Китай—Россия, ставки, Incoterms, таможню и расчёты. Не выдумывай актуальные цены, законы или новости. Если данных не хватает — скажи это. Контекст калькулятора: ${JSON.stringify(context||{})}`;
}

async function chat(message,history=[],context={}){
  const e=await init();
  const messages=[{role:'system',content:systemPrompt(context)}];
  for(const m of (history||[]).slice(-8)){
    if(m?.role && m?.content) messages.push({role:m.role,content:String(m.content)});
  }
  messages.push({role:'user',content:String(message)});
  const r=await e.chat.completions.create({messages,temperature:0.7,max_tokens:500});
  return r?.choices?.[0]?.message?.content||'Не смог сформулировать ответ.';
}

window.freeAI={init,chat,model:MODEL};
