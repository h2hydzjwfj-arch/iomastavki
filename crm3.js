// IOMASTAVKA — агенты и запросы ставок (перенос модуля RQ из West Asia CRM).
// База агентов: публичный справочник «Экспедиторы» + своя закрытая база (только для администратора, импорт из Excel/CSV).
// Запрос ставок из сделки → ответы агентов → ИИ (или простой разбор) предлагает ставки → менеджер подтверждает → в финансы сделки.
// Прайсы агентов (опубликованные тарифы) дают ориентир сразу, до ответов.
'use strict';
const VED = require('./ved');

const MODES = { air: 'Авиа', road: 'Авто', rail: 'ЖД', sea: 'Море', multimodal: 'Мультимодальная' };
const DEAL_MODE = { auto: 'road', road: 'road', rail: 'rail', sea: 'sea', air: 'air', multimodal: 'multimodal' };
const CUR = { '$': 'USD', usd: 'USD', 'долл': 'USD', '¥': 'CNY', cny: 'CNY', rmb: 'CNY', 'юан': 'CNY', '€': 'EUR', eur: 'EUR', 'евро': 'EUR', '₽': 'RUB', rub: 'RUB', 'руб': 'RUB', 'р.': 'RUB' };

// Опубликованные тарифы агентов — ориентир «от», без гарантий; правятся в разделе «Тарифы».
const DEFAULT_PRICES = [
  ...[['Пекин', 195, 12500], ['Шанхай', 205, 12500], ['Гуанчжоу', 205, 12500], ['Санья', 195, 12500], ['Гонконг', 545, 40000]].map(([o, kg, min]) => ({ agent: 'QT Avia (ГК АТС)', url: 'https://qtavia.com', mode: 'air', origin: o, dest: '', perKg: kg, min, days: '', asOf: '2026-11-06' })),
  ...[['Новосибирск', [55, 60, 65]], ['Екатеринбург', [60, 65, 70]], ['Москва', [65, 70, 75]], ['Санкт-Петербург', [70, 75, 80]]].flatMap(([dest, p]) => [['Северный Китай / Пекин', p[0]], ['Восточный Китай / Шанхай', p[1]], ['Южный Китай / Гуанчжоу', p[2]]].map(([o, kg]) => ({ agent: 'QT Avia (ГК АТС)', url: 'https://qtavia.com', mode: 'road', origin: o, dest, perKg: kg, min: 0, days: '', asOf: '2026-11-06' }))),
  { agent: 'Sky Cargo Service', url: 'https://scs-aero.ru', mode: 'air', origin: 'Пекин', dest: 'Москва (Шереметьево)', perKg: 492, min: 13645, days: '2–6', asOf: '2026-11-06' },
  { agent: 'Sky Cargo Service', url: 'https://scs-aero.ru', mode: 'air', origin: 'Гуанчжоу', dest: 'Москва (Шереметьево)', perKg: 479, min: 13645, days: '2–6', asOf: '2026-11-06' },
].map((p, i) => ({ id: 'p' + (i + 1), ...p }));

// Города Китая → регион для автотарифов «Северный / Восточный / Южный Китай»
const REGION = [
  [/пекин|beijing|тяньцзин|tianjin|харбин|harbin|шэньян|shenyang|далян|dalian|циндао|qingdao|шицзячжуан|баотоу|хух|эрлянь|маньчжур/i, 'Северный'],
  [/шанха|shanghai|иу\b|yiwu|нинбо|ningbo|ханчжоу|hangzhou|сучжоу|suzhou|нанкин|nanjing|уси|wuxi|вэньчжоу|хэфэй/i, 'Восточный'],
  [/гуанчжоу|guangzhou|шэньчжэнь|shenzhen|фошань|foshan|дунгуань|dongguan|сямэнь|xiamen|чжуха|фуцзянь|гонконг|hong ?kong|наньнин/i, 'Южный'],
];
const low = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
const n = v => { const x = Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(x) ? x : 0; };

function modesFrom(text) {
  const t = low(text), out = new Set();
  if (/авиа|air|самол/.test(t)) out.add('air');
  if (/авто|road|truck|грузов|фур/.test(t)) out.add('road');
  if (/ж\/?д|жд|rail|желез|поезд/.test(t)) out.add('rail');
  if (/мор|sea|ocean|контейнер|fcl|lcl/.test(t)) out.add('sea');
  if (/мульти|multimodal/.test(t)) out.add('multimodal');
  return [...out];
}

// Простой разбор ответа агента без ИИ: суммы с валютой и единицей («$1 250 / 40HQ», «5.2 USD/kg», «¥3800 за куб»)
function parseRatesPlain(text) {
  const out = [], seen = new Set();
  const rx = /(?:(\$|¥|€|₽|usd|cny|rmb|eur|rub)\s*)?(\d{1,3}(?:[  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(usd|cny|rmb|eur|rub|руб\.?|юан\w*|долл\w*|евро|\$|¥|€|₽)?\s*(?:\/|за|per)?\s*(kg|кг|cbm|м3|м³|куб\w*|40\s*hq|40'?\s*hc|40'?|20'?\s*gp|20'?|контейнер\w*|container|truck|фур\w*|машин\w*|партию|отправк\w*)?/gi;
  let m;
  while ((m = rx.exec(text))) {
    const curRaw = low(m[1] || m[3] || ''); if (!curRaw) continue;
    const cur = Object.keys(CUR).find(k => curRaw.startsWith(k)) ? CUR[Object.keys(CUR).find(k => curRaw.startsWith(k))] : '';
    const amount = n(m[2]); if (!cur || !amount || amount < 0.1) continue;
    const u = low(m[4] || ''), unit = /kg|кг/.test(u) ? 'кг' : /cbm|м3|м³|куб/.test(u) ? 'м³' : /40|20|контейн|container/.test(u) ? 'контейнер' : /truck|фур|машин/.test(u) ? 'машина' : u ? 'партия' : '';
    const container = /40/.test(u) ? "40'HC" : /20/.test(u) ? "20'" : '';
    const k = amount + cur + unit; if (seen.has(k)) continue; seen.add(k);
    out.push({ amount, currency: cur, unit, container, quote: String(m[0]).trim().slice(0, 120) });
    if (out.length >= 6) break;
  }
  return out;
}

function setup(app, ctx) {
  const { store, admin, upload, str, newId } = ctx;
  const now = () => new Date().toISOString();
  const bad = (res, error, code = 400) => res.status(code).json({ ok: false, error });
  const who = req => (ctx.who && ctx.who(req)) || 'Менеджер';
  const db = () => { const d = store.load(); d.rq = d.rq || []; d.crmAgents = d.crmAgents || []; d.settings = d.settings || {}; d.deals = d.deals || []; return d; };
  const dealOf = (d, id) => d.deals.find(x => x.id === id);
  const prices = d => Array.isArray(d.settings.agentPrices) ? d.settings.agentPrices : DEFAULT_PRICES;
  const pubAgents = () => { try { return (ctx.publicAgents && ctx.publicAgents()) || []; } catch { return []; } };
  const agentKey = a => low(a.email) || low(a.company) + '|' + low(a.contact);
  function allAgents(d) {
    const own = d.crmAgents.map(a => ({ ...a, own: true })), keys = new Set(own.map(agentKey));
    const pub = pubAgents().filter(a => a && a.company && !keys.has(agentKey(a))).map(a => ({ id: 'pub' + a.id, company: a.company, contact: a.contact || '', phone: a.phone || '', email: a.email || '', site: a.site || '', modes: (a.modes || []).map(m => m === 'auto' ? 'road' : m), transport: a.transport || [], notes: a.notes || '', own: false }));
    return own.concat(pub);
  }

  /* ---------- база агентов ---------- */
  app.get('/api/crm/agents', admin, (req, res) => {
    const d = db(), q = low(req.query.q), mode = String(req.query.mode || '');
    let items = allAgents(d);
    if (mode) items = items.filter(a => !a.modes.length || a.modes.includes(DEAL_MODE[mode] || mode));
    if (q) items = items.filter(a => low([a.company, a.contact, a.email, a.phone, (a.transport || []).join(' '), a.notes].join(' ')).includes(q));
    res.json({ ok: true, items, own: d.crmAgents.length, modes: MODES });
  });
  app.post('/api/crm/agents', admin, (req, res) => {
    const b = req.body || {}; if (!str(b.company, 160)) return bad(res, 'Укажите компанию');
    const d = db(); const a = { id: newId(5), company: str(b.company, 160), contact: str(b.contact, 120), phone: str(b.phone, 60), email: str(b.email, 160).toLowerCase(), site: str(b.site, 160), modes: Array.isArray(b.modes) ? b.modes.filter(m => MODES[m]) : modesFrom(b.transport), transport: Array.isArray(b.transport) ? b.transport.map(t => str(t, 40)).filter(Boolean) : String(b.transport || '').split(/[,;/]/).map(t => str(t, 40)).filter(Boolean), notes: str(b.notes, 500), createdAt: now() };
    d.crmAgents.push(a); store.save(d); res.json({ ok: true, item: a });
  });
  app.patch('/api/crm/agents/:id', admin, (req, res) => {
    const d = db(), a = d.crmAgents.find(x => x.id === req.params.id); if (!a) return bad(res, 'Агент не найден (общий справочник правится в «Экспедиторах»)', 404);
    const b = req.body || {};
    for (const [k, m] of [['company', 160], ['contact', 120], ['phone', 60], ['email', 160], ['site', 160], ['notes', 500]]) if (b[k] != null) a[k] = str(b[k], m);
    if (b.transport != null) { a.transport = (Array.isArray(b.transport) ? b.transport : String(b.transport).split(/[,;/]/)).map(t => str(t, 40)).filter(Boolean); a.modes = modesFrom(a.transport.join(' ')); }
    store.save(d); res.json({ ok: true, item: a });
  });
  app.delete('/api/crm/agents/:id', admin, (req, res) => { const d = db(); const i = d.crmAgents.findIndex(x => x.id === req.params.id); if (i < 0) return bad(res, 'Не найдено', 404); d.crmAgents.splice(i, 1); store.save(d); res.json({ ok: true }); });
  if (upload) app.post('/api/crm/agents/import', admin, upload.single('file'), (req, res) => {
    const f = req.file; if (!f) return bad(res, 'Выберите файл Excel или CSV');
    const name = low(Buffer.from(f.originalname, 'latin1').toString('utf8'));
    let rows;
    try {
      if (/\.xlsx$|\.xlsm$/.test(name)) rows = require('./docparse').xlsxRows(f.buffer);
      else if (/\.csv$|\.txt$|\.tsv$/.test(name)) rows = require('./tnved').csvRows(f.buffer.toString('utf8').replace(/^﻿/, ''));
      else return bad(res, 'Поддерживаются .xlsx и .csv');
    } catch (e) { return bad(res, 'Не удалось прочитать файл: ' + e.message); }
    const hi = rows.findIndex(r => r.some(c => /компан|company|агент/i.test(String(c || '')))); if (hi < 0) return bad(res, 'Нужна строка заголовков с колонкой «Компания»');
    const H = rows[hi].map(c => low(c)), col = rx => H.findIndex(h => rx.test(h));
    const C = { company: col(/компан|company|агент|назван/), transport: col(/транспорт|вид|transport|mode/), email: col(/mail|почт/), contact: col(/контакт|contact|имя|лицо/), phone: col(/телеф|phone|тел\.|wechat|whatsapp/), site: col(/сайт|site|web/), notes: col(/примеч|коммент|note|направлен/) };
    const d = db(), byKey = new Map(d.crmAgents.map(a => [agentKey(a), a])); let added = 0, updated = 0;
    for (const r of rows.slice(hi + 1)) {
      const g = k => C[k] >= 0 ? String(r[C[k]] == null ? '' : r[C[k]]).trim() : '';
      if (!g('company')) continue;
      const a = { company: str(g('company'), 160), contact: str(g('contact'), 120), phone: str(g('phone'), 60), email: str(g('email'), 160).toLowerCase(), site: str(g('site'), 160), notes: str(g('notes'), 500), transport: g('transport').split(/[,;/]/).map(t => str(t, 40)).filter(Boolean) };
      a.modes = modesFrom(a.transport.join(' ') + ' ' + a.notes);
      const k = agentKey(a), ex = byKey.get(k);
      if (ex) { for (const [kk, v] of Object.entries(a)) if (v && !(Array.isArray(v) && !v.length)) ex[kk] = v; updated++; }
      else { const rec = { id: newId(5), ...a, createdAt: now() }; d.crmAgents.push(rec); byKey.set(k, rec); added++; }
    }
    store.save(d); res.json({ ok: true, added, updated, total: d.crmAgents.length });
  });

  /* ---------- прайсы агентов (ориентиры) ---------- */
  app.get('/api/crm/agent-prices', admin, (req, res) => { const d = db(); res.json({ ok: true, items: prices(d), custom: Array.isArray(d.settings.agentPrices) }); });
  app.put('/api/crm/agent-prices', admin, (req, res) => {
    const b = req.body || {}, d = db();
    if (b.reset) { delete d.settings.agentPrices; store.save(d); return res.json({ ok: true, items: DEFAULT_PRICES }); }
    if (!Array.isArray(b.items)) return bad(res, 'Нет строк');
    d.settings.agentPrices = b.items.slice(0, 300).map(p => ({ id: str(p.id, 20) || newId(4), agent: str(p.agent, 120), url: str(p.url, 200), mode: MODES[p.mode] ? p.mode : 'road', origin: str(p.origin, 120), dest: str(p.dest, 120), perKg: n(p.perKg), min: n(p.min), days: str(p.days, 20), asOf: str(p.asOf, 10) })).filter(p => p.agent && (p.perKg || p.min));
    store.save(d); res.json({ ok: true, items: d.settings.agentPrices });
  });
  function refsFor(d, x) {
    const mode = DEAL_MODE[x.mode] || '', from = low(x.from), to = low(x.to), w = n(x.weight);
    const region = (REGION.find(([rx]) => rx.test(from)) || [])[1] || '';
    return prices(d).filter(p => !mode || p.mode === mode).map(p => {
      const o = low(p.origin), dst = low(p.dest);
      let score = 0;
      if (from && o.split(/\s*\/\s*/).some(part => part && (from.includes(part) || part.includes(from)))) score += 3;
      else if (region && o.startsWith(low(region))) score += 2;
      if (to && dst && dst.split(/[\s(),]+/).some(part => part.length > 3 && to.includes(part))) score += 2; else if (!dst) score += 1;
      const est = w ? Math.max(p.perKg * w, p.min || 0) : 0;
      return { ...p, score, est: Math.round(est) };
    }).filter(p => p.score >= (from ? 2 : 0)).sort((a, b) => b.score - a.score || (a.est || a.perKg) - (b.est || b.perKg)).slice(0, 6);
  }

  /* ---------- запросы ставок по сделке ---------- */
  async function usdRates() { try { const r = ctx.rates ? await ctx.rates() : null; return (r && r.rates) || {}; } catch { return {}; } }
  function view(d, x, R) {
    const reqs = d.rq.filter(r => r.dealId === x.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const usd = (amount, cur) => { const c = String(cur || 'USD').toUpperCase(); if (c === 'USD') return amount; const rub = c === 'RUB' ? amount : amount * (R[c] || 0); return R.USD ? Math.round(rub / R.USD * 100) / 100 : null; };
    const rates = [];
    for (const r of reqs) for (const t of r.rates || []) rates.push({ ...t, rqId: r.id, usd: usd(t.amount, t.currency) });
    const live = rates.filter(t => t.status !== 'rejected' && t.usd != null);
    const groups = {}; for (const t of live) { const k = t.unit || '—'; if (!groups[k] || t.usd < groups[k]) groups[k] = t.usd; }
    for (const t of rates) t.best = t.status !== 'rejected' && t.usd != null && groups[t.unit || '—'] === t.usd && live.filter(v => (v.unit || '—') === (t.unit || '—')).length > 1;
    const questions = [];
    for (const r of reqs) for (const p of r.replies || []) if ((p.questions || []).length && !p.answered) questions.push({ replyId: p.id, rqId: r.id, agent: p.agent, questions: p.questions });
    return { requests: reqs.map(r => ({ id: r.id, createdAt: r.createdAt, by: r.by, subject: r.subject, items: r.items, replies: (r.replies || []).map(p => ({ id: p.id, at: p.at, agent: p.agent, text: p.text, ai: p.ai, rates_n: (r.rates || []).filter(t => t.replyId === p.id).length })) })), rates, questions, refs: refsFor(d, x) };
  }
  app.get('/api/deals/:id/rq', admin, async (req, res) => {
    const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    res.json({ ok: true, ...view(d, x, await usdRates()), mailOn: !!(ctx.mail && ctx.mail.enabled()) });
  });
  function requestText(x) {
    const M = { auto: 'авто', road: 'авто', rail: 'ЖД', sea: 'море', air: 'авиа', multimodal: 'мультимодальная' };
    return ['Добрый день!', '', 'Просим ставку на перевозку:',
      x.from || x.to ? `Маршрут: ${x.from || '—'} → ${x.to || '—'}` : '', x.mode ? `Вид транспорта: ${M[x.mode] || x.mode}` : '', x.cargo ? `Груз: ${x.cargo}` : '',
      x.weight ? `Вес: ${x.weight} кг` : '', x.volume ? `Объём: ${x.volume} м³` : '', x.incoterms ? `Условия: ${x.incoterms}` : '',
      '', 'Укажите, пожалуйста, ставку, валюту, что входит, срок транзита и срок действия ставки.', '', 'Спасибо!'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  }
  app.get('/api/deals/:id/rq/draft', admin, (req, res) => { const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404); res.json({ ok: true, subject: `Запрос ставки: ${[x.from, x.to].filter(Boolean).join(' → ') || x.title || ''} (№ ${x.number || ''})`.slice(0, 200), text: requestText(x) }); });
  app.post('/api/deals/:id/rq', admin, async (req, res) => {
    const b = req.body || {}, d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    const ids = Array.isArray(b.agentIds) ? b.agentIds.map(String) : []; const agents = allAgents(d).filter(a => ids.includes(String(a.id)));
    if (!agents.length) return bad(res, 'Выберите хотя бы одного агента');
    const subject = str(b.subject, 200) || `Запрос ставки (№ ${x.number || ''})`, text = String(b.text || requestText(x)).slice(0, 6000);
    const canMail = !!(ctx.mail && ctx.mail.enabled()) && b.send !== false;
    const items = [];
    for (const a of agents) {
      let status = 'manual', error = '';
      if (canMail && a.email) { try { await ctx.mail.send(a.email, subject, text); status = 'sent'; } catch (e) { status = 'error'; error = String(e.message || e).slice(0, 200); } }
      items.push({ id: newId(4), agentId: String(a.id), agent: a.company + (a.contact ? ' · ' + a.contact : ''), email: a.email || '', phone: a.phone || '', status, error });
    }
    const d2 = db(), x2 = dealOf(d2, x.id);
    const rq = { id: 'RQ-' + Date.now().toString(36).toUpperCase().slice(-6), dealId: x.id, createdAt: now(), by: who(req), subject, text, items, replies: [], rates: [] };
    d2.rq.unshift(rq); d2.rq = d2.rq.slice(0, 3000);
    const sent = items.filter(i => i.status === 'sent').length;
    x2.activity = x2.activity || []; x2.activity.push({ id: newId(4), at: now(), type: 'rate', section: 'rates', by: who(req), text: `Запрос ставок ${items.length} ${items.length === 1 ? 'агенту' : 'агентам'}` + (sent ? ` · отправлено письмом: ${sent}` : '') });
    store.save(d2); res.json({ ok: true, request: rq, sent, manual: items.filter(i => i.status !== 'sent').length });
  });
  app.delete('/api/rq/:rid', admin, (req, res) => { const d = db(); const i = d.rq.findIndex(r => r.id === req.params.rid); if (i < 0) return bad(res, 'Запрос не найден', 404); d.rq.splice(i, 1); store.save(d); res.json({ ok: true }); });

  async function aiRates(text, agent) {
    if (!ctx.ai || !ctx.ai.enabled()) return null;
    const prompt = 'Это ответ агента-экспедитора на запрос ставки. Верни ТОЛЬКО JSON без markdown: {"rates":[{"amount":число,"currency":"USD|CNY|EUR|RUB","unit":"кг|м³|контейнер|машина|партия|","container":"","route_to":"","transit":"","includes":"","extras":"","valid":"","quote":"точная цитата со ставкой"}],"questions":["вопросы агента к нам, если есть"]}. Не выдумывай: если ставки нет — пустой массив.\n\nАгент: ' + agent + '\n\nОтвет:\n' + text.slice(0, 12000);
    const out = await ctx.ai.run([{ role: 'user', content: prompt }]);
    const j = JSON.parse(String(out).replace(/^```(?:json)?|```$/g, '').trim());
    return { rates: Array.isArray(j.rates) ? j.rates : [], questions: Array.isArray(j.questions) ? j.questions.map(q => str(q, 300)).filter(Boolean).slice(0, 8) : [] };
  }
  app.post('/api/rq/:rid/replies', admin, async (req, res) => {
    const b = req.body || {}, text = String(b.text || '').trim().slice(0, 20000); if (!text) return bad(res, 'Вставьте текст ответа агента');
    const d0 = db(), r0 = d0.rq.find(r => r.id === req.params.rid); if (!r0) return bad(res, 'Запрос не найден', 404);
    const item = r0.items.find(i => i.id === b.itemId); const agent = item ? item.agent : str(b.agent, 160) || 'Агент';
    let parsed = null, ai = 'none';
    try { parsed = await aiRates(text, agent); if (parsed) ai = 'ok'; } catch (e) { ai = 'failed'; }
    if (!parsed) parsed = { rates: parseRatesPlain(text), questions: (text.match(/[^.!?\n]*\?/g) || []).map(q => q.trim()).filter(q => q.length > 8).slice(0, 5) };
    const d = db(), r = d.rq.find(v => v.id === req.params.rid), x = dealOf(d, r.dealId);
    const reply = { id: newId(4), at: now(), itemId: item ? item.id : '', agent, text, ai, questions: parsed.questions || [], answered: false };
    r.replies = r.replies || []; r.replies.push(reply);
    if (item) item.status = 'replied';
    const rows = (parsed.rates || []).filter(t => n(t.amount) > 0).slice(0, 12).map(t => ({ id: newId(4), replyId: reply.id, agent, amount: n(t.amount), currency: String(t.currency || 'USD').toUpperCase().slice(0, 3), unit: str(t.unit, 20), container: str(t.container, 20), route_to: str(t.route_to, 120), transit: str(t.transit, 60), includes: str(t.includes, 300), extras: str(t.extras, 300), valid: str(t.valid, 60), quote: str(t.quote, 300), status: 'proposed', source: ai === 'ok' ? 'ai' : 'auto' }));
    r.rates = (r.rates || []).concat(rows);
    if (x) { x.activity = x.activity || []; x.activity.push({ id: newId(4), at: now(), type: 'rate', section: 'rates', by: who(req), text: `Ответ агента ${agent}: ${rows.length ? 'найдено ставок ' + rows.length : 'ставок не найдено'}` }); }
    store.save(d); res.json({ ok: true, reply, rates: rows, ai });
  });
  app.post('/api/rq/rates', admin, (req, res) => { // ставка вручную
    const b = req.body || {}, d = db(), r = d.rq.find(v => v.id === b.rqId); if (!r) return bad(res, 'Запрос не найден', 404);
    if (!(n(b.amount) > 0)) return bad(res, 'Укажите сумму');
    const t = { id: newId(4), replyId: '', agent: str(b.agent, 160) || 'Агент', amount: n(b.amount), currency: String(b.currency || 'USD').toUpperCase().slice(0, 3), unit: str(b.unit, 20), container: str(b.container, 20), route_to: '', transit: str(b.transit, 60), includes: str(b.includes, 300), extras: '', valid: str(b.valid, 60), quote: '', status: 'confirmed', source: 'manual' };
    r.rates = (r.rates || []).concat(t); store.save(d); res.json({ ok: true, item: t });
  });
  app.patch('/api/rq/rates/:id', admin, (req, res) => {
    const b = req.body || {}, d = db(); let t = null; for (const r of d.rq) { t = (r.rates || []).find(v => v.id === req.params.id); if (t) break; } if (!t) return bad(res, 'Ставка не найдена', 404);
    if (['proposed', 'confirmed', 'rejected'].includes(b.status)) t.status = b.status;
    if (b.amount != null && n(b.amount) > 0) t.amount = n(b.amount);
    for (const [k, m] of [['currency', 3], ['unit', 20], ['container', 20], ['transit', 60], ['includes', 300], ['valid', 60]]) if (b[k] != null) t[k] = k === 'currency' ? String(b[k]).toUpperCase().slice(0, 3) : str(b[k], m);
    store.save(d); res.json({ ok: true, item: t });
  });
  app.post('/api/rq/rates/:id/finance', admin, async (req, res) => {
    const d = db(); let t = null, r = null; for (const v of d.rq) { t = (v.rates || []).find(z => z.id === req.params.id); if (t) { r = v; break; } } if (!t) return bad(res, 'Ставка не найдена', 404);
    const x = dealOf(d, r.dealId); if (!x) return bad(res, 'Сделка не найдена', 404);
    const qty = n(req.body && req.body.qty) || 1, R = await usdRates(), cur = t.currency || 'USD';
    const label = `Фрахт: ${t.agent}${t.unit ? ' (' + t.amount + ' ' + cur + ' / ' + t.unit + (qty !== 1 ? ' × ' + qty : '') + ')' : ''}`.slice(0, 160);
    const row = cur === 'RUB' ? { id: newId(4), kind: 'expense', label, currency: 'RUB', amount: Math.round(t.amount * qty * 100) / 100 } : { id: newId(4), kind: 'expense', label, currency: cur, amount_orig: Math.round(t.amount * qty * 100) / 100, rate: R[cur] || 0, rateDate: (ctx.ratesDate && ctx.ratesDate()) || '' };
    x.finance = (x.finance || []).concat(row); const tt = VED.finance(x.finance); x.financeTotals = { income: tt.income, expense: tt.expense, margin: tt.margin, percent: tt.percent }; x.financeAt = now();
    t.status = 'confirmed'; t.inFinance = true;
    x.activity = x.activity || []; x.activity.push({ id: newId(4), at: now(), type: 'finance', section: 'finance', internal: true, by: who(req), text: `Ставка ${t.agent} добавлена в расходы` });
    store.save(d); res.json({ ok: true, row, rateMissing: cur !== 'RUB' && !R[cur] });
  });
  app.post('/api/rq/replies/:id/answered', admin, (req, res) => { const d = db(); for (const r of d.rq) { const p = (r.replies || []).find(v => v.id === req.params.id); if (p) { p.answered = true; store.save(d); return res.json({ ok: true }); } } bad(res, 'Не найдено', 404); });

  return { DEFAULT_PRICES, parseRatesPlain, refsFor: x => refsFor(db(), x) };
}

module.exports = { setup, parseRatesPlain, DEFAULT_PRICES, modesFrom };
