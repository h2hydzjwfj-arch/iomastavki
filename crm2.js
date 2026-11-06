'use strict';
// CRM, часть 2: задачи, финансы сделки, калькулятор ВЭД, аналитика, отгулы, праздники,
// компания (сотрудники, юрлица, шаблоны), безопасность, почта и очередь менеджеров, бот (база знаний, диалоги).
// Перенос логики CRM West Asia: tasks.js, activity.js (финансы), calc.js, analytics.js, time_off.js,
// company_settings.js, security_panel.js, mail.js, bot_panel.js.
const VED = require('./ved');

// Производственный календарь РФ на 2026 год и праздники КНР 2026 (распоряжение Госсовета КНР).
const HOLIDAYS = {
  2026: {
    ru: [
      ['2026-01-01', 'Новогодние каникулы', 'holiday'], ['2026-01-02', 'Новогодние каникулы', 'holiday'], ['2026-01-03', 'Новогодние каникулы', 'holiday'], ['2026-01-04', 'Новогодние каникулы', 'holiday'],
      ['2026-01-05', 'Новогодние каникулы', 'holiday'], ['2026-01-06', 'Новогодние каникулы', 'holiday'], ['2026-01-07', 'Рождество Христово', 'holiday'], ['2026-01-08', 'Новогодние каникулы', 'holiday'],
      ['2026-01-09', 'Выходной (перенос с 3 января)', 'transfer'], ['2026-02-23', 'День защитника Отечества', 'holiday'], ['2026-03-08', 'Международный женский день', 'holiday'],
      ['2026-03-09', 'Выходной (перенос с 8 марта)', 'transfer'], ['2026-04-30', 'Предпраздничный день, на 1 час короче', 'short'], ['2026-05-01', 'Праздник Весны и Труда', 'holiday'],
      ['2026-05-08', 'Предпраздничный день, на 1 час короче', 'short'], ['2026-05-09', 'День Победы', 'holiday'], ['2026-05-11', 'Выходной (перенос с 9 мая)', 'transfer'],
      ['2026-06-11', 'Предпраздничный день, на 1 час короче', 'short'], ['2026-06-12', 'День России', 'holiday'], ['2026-11-03', 'Предпраздничный день, на 1 час короче', 'short'],
      ['2026-11-04', 'День народного единства', 'holiday'], ['2026-12-31', 'Выходной (перенос с 4 января)', 'transfer'],
    ],
    cn: [
      ['2026-01-01', 'Новый год', 3], ['2026-01-04', 'Рабочий день (перенос)', 'workday'], ['2026-02-14', 'Рабочий день (перенос)', 'workday'], ['2026-02-15', 'Праздник Весны (Китайский Новый год)', 9],
      ['2026-02-28', 'Рабочий день (перенос)', 'workday'], ['2026-04-04', 'Цинмин', 3], ['2026-05-01', 'День труда', 5], ['2026-05-09', 'Рабочий день (перенос)', 'workday'],
      ['2026-06-19', 'Праздник драконьих лодок', 3], ['2026-09-20', 'Рабочий день (перенос)', 'workday'], ['2026-09-25', 'Праздник середины осени', 3], ['2026-10-01', 'День образования КНР', 7], ['2026-10-10', 'Рабочий день (перенос)', 'workday'],
    ],
  },
};
function expandCn(list) {
  const out = [];
  for (const [date, name, k] of list) {
    if (k === 'workday') { out.push({ date, name, kind: 'workday' }); continue; }
    const d0 = new Date(date + 'T00:00:00Z');
    for (let i = 0; i < k; i++) { const d = new Date(d0.getTime() + i * 864e5); out.push({ date: d.toISOString().slice(0, 10), name, kind: 'holiday', first: i === 0, days: k }); }
  }
  return out;
}

const SECRETS = [
  ['SESSION_SECRET', 'Ключ подписи сессий (входа)', 'auto'], ['TELEGRAM_WEBHOOK_SECRET', 'Секрет вебхука Telegram', 'auto'],
  ['ADMIN_PASSWORD_HASH', 'Пароль администратора (хеш)', 'manual'], ['ADMIN_EMAIL', 'Почта администратора', 'manual'],
  ['OPENAI_API_KEY', 'Ключ ИИ (OpenAI)', 'manual'], ['TELEGRAM_BOT_TOKEN', 'Токен Telegram-бота (@BotFather)', 'manual'], ['TELEGRAM_CHAT_ID', 'Чат для уведомлений', 'manual'],
  ['RESEND_API_KEY', 'Отправка писем (Resend)', 'manual'], ['SMTP_URL', 'Отправка писем (SMTP)', 'manual'],
  ['SUPABASE_URL', 'Хранилище Supabase: адрес', 'manual'], ['SUPABASE_SERVICE_KEY', 'Хранилище Supabase: ключ', 'manual'],
  ['IMAP_HOST', 'Входящая почта: сервер IMAP', 'manual'], ['IMAP_USER', 'Входящая почта: логин', 'manual'], ['IMAP_PASSWORD', 'Входящая почта: пароль', 'manual'],
];
const MAIL_CATS = ['заявка', 'фрахт', 'коммерческое', 'спам'];
function classify(text) {
  const s = String(text || '').toLowerCase();
  if (/(казино|casino|viagra|кредит онлайн|раскрутк|seo-продвиж|выигр|unsubscribe|рассылк)/.test(s)) return 'спам';
  if (/(ставк\w* фрахт|freight rate|our rates|rate offer|тариф\w* на|sailing schedule|fcl|lcl rate|прайс на перевозк)/.test(s)) return 'фрахт';
  if (/(коммерческ\w* предложени|предлагаем сотруднич|offer you|cooperation|партнёрств|партнерств)/.test(s)) return 'коммерческое';
  return 'заявка';
}
const words = s => String(s || '').toLowerCase().replace(/ё/g, 'е').split(/[^a-zа-я0-9]+/).filter(w => w.length > 2).map(w => w.slice(0, 6));

function setup(app, ctx) {
  const { store, admin, upload, str, num, newId, crm } = ctx;
  const n = v => { const x = Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  const db = () => { const d = store.load(); for (const k of ['deals', 'tasks', 'timeoff', 'calcDocs', 'mailLog', 'botKb', 'botLog']) d[k] = d[k] || []; d.settings = d.settings || {}; d.botUsers = d.botUsers || {}; return d; };
  const now = () => new Date().toISOString();
  const today = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  const who = req => (req && req.who && req.who.name) || 'Администратор';
  const dealOf = (d, id) => d.deals.find(x => x.id === id);
  const bad = (res, msg, code) => res.status(code || 400).json({ ok: false, error: msg });
  const staffNames = d => (d.settings.staff || []).filter(s => s.active !== false).map(s => s.name);
  const dateOk = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

  // ---------- отгулы: кто сегодня отсутствует (снимается с очереди заявок)
  function offOn(d, name, date) { date = date || today(); return (d.timeoff || []).some(t => t.manager === name && (t.status || 'approved') === 'approved' && t.date_from <= date && t.date_to >= date && (t.kind === 'vacation' || (!t.time_from && !t.time_to))); }

  // ================= ЗАДАЧИ =================
  const TASK_TYPES = crm.TASK_TYPES;
  function taskView(d, t) {
    const x = t.dealId && dealOf(d, t.dealId), td = today();
    const c = x && x.crmClientId && (d.crmClients || []).find(v => v.id === x.crmClientId);
    return { ...t, dealTitle: x ? x.title : '', dealNumber: x ? x.number : '', dealFunnel: x ? x.funnel : '', clientName: c ? (c.company || c.contact) : x ? (x.company || x.contactName || '') : '', overdue: t.status !== 'done' && !!t.deadline && t.deadline < td, managerOff: t.manager ? offOn(d, t.manager, t.deadline || td) : false };
  }
  function taskBody(b, t) {
    if (b.type != null) t.type = str(b.type, 60) || 'Задача';
    if (b.desc != null) t.desc = str(b.desc, 4000);
    if (b.manager != null) t.manager = str(b.manager, 80);
    if (b.deadline !== undefined) t.deadline = dateOk(b.deadline) ? b.deadline : '';
    if (b.time !== undefined) t.time = /^\d{2}:\d{2}$/.test(String(b.time || '')) ? b.time : '';
    if (b.comment != null) t.comment = str(b.comment, 2000);
    if (b.dealId !== undefined) t.dealId = b.dealId ? String(b.dealId) : '';
    return t;
  }
  app.get('/api/tasks', admin, (req, res) => {
    const d = db(); const q = req.query || {}; let items = d.tasks;
    const st = q.status == null ? 'open' : q.status;
    if (st === 'open') items = items.filter(t => t.status !== 'done'); else if (st === 'done') items = items.filter(t => t.status === 'done');
    if (q.dealId) items = items.filter(t => t.dealId === q.dealId);
    if (q.manager) { const set = String(q.manager).split('|'); items = items.filter(t => set.includes(t.manager || '—')); }
    let out = items.map(t => taskView(d, t));
    const s = String(q.q || '').trim().toLowerCase(); if (s) out = out.filter(t => [t.desc, t.dealTitle, t.type, t.clientName, t.comment].some(v => String(v || '').toLowerCase().includes(s)));
    out.sort((a, b) => String(b.deadline || '') + (b.time || '') < String(a.deadline || '') + (a.time || '') ? -1 : 1);
    res.json({ ok: true, items: out.slice(0, 2000), types: TASK_TYPES });
  });
  app.post('/api/tasks', admin, (req, res) => {
    const d = db(); const b = req.body || {};
    const t = taskBody(b, { id: newId(5), type: 'Задача', status: 'open', createdAt: now(), createdBy: who(req) });
    if (!t.desc && t.type === 'Задача') return bad(res, 'Введите описание задачи');
    if (!t.deadline) return bad(res, 'Укажите срок');
    if (t.dealId && !dealOf(d, t.dealId)) return bad(res, 'Сделка не найдена');
    if (!t.manager && t.dealId) t.manager = dealOf(d, t.dealId).manager || '';
    d.tasks.unshift(t); d.tasks = d.tasks.slice(0, 20000); store.save(d);
    res.json({ ok: true, item: taskView(d, t), id: t.id });
  });
  app.patch('/api/tasks/:id', admin, (req, res) => {
    const d = db(); const t = d.tasks.find(v => v.id === req.params.id); if (!t) return bad(res, 'Задача не найдена', 404);
    const b = req.body || {}; taskBody(b, t);
    if (b.status === 'done' && t.status !== 'done') { t.status = 'done'; t.doneAt = now(); t.doneBy = who(req); }
    if (b.status === 'open' && t.status === 'done') { t.status = 'open'; delete t.doneAt; }
    t.updatedAt = now(); store.save(d); res.json({ ok: true, item: taskView(d, t) });
  });
  app.delete('/api/tasks/:id', admin, (req, res) => { const d = db(); const i = d.tasks.findIndex(v => v.id === req.params.id); if (i < 0) return bad(res, 'Задача не найдена', 404); d.tasks.splice(i, 1); store.save(d); res.json({ ok: true }); });
  app.post('/api/tasks/bulk', admin, (req, res) => {
    const d = db(); const ids = new Set((req.body && req.body.ids) || []); let k = 0;
    for (const t of d.tasks) if (ids.has(t.id)) { if (req.body.status === 'done' && t.status !== 'done') { t.status = 'done'; t.doneAt = now(); k++; } else if (req.body.manager != null) { t.manager = str(req.body.manager, 80); k++; } else if (req.body.delete) { t._del = true; k++; } }
    d.tasks = d.tasks.filter(t => !t._del); store.save(d); res.json({ ok: true, changed: k });
  });
  app.get('/api/crm/badges', admin, (req, res) => {
    const d = db(); const td = today(); const open = d.tasks.filter(t => t.status !== 'done');
    const inbox = d.deals.filter(x => x.funnel === crm.INCOMING && crm.statusOf(x) === 'active');
    res.json({ ok: true, inbox: inbox.length, inboxNew: inbox.filter(x => x.stage === crm.stagesOf(crm.INCOMING)[0] && !x.manager).length, tasksOverdue: open.filter(t => t.deadline && t.deadline < td).length, tasksToday: open.filter(t => t.deadline === td).length, tasksOpen: open.length, offToday: staffNames(d).filter(nm => offOn(d, nm)) });
  });

  // ================= ФИНАНСЫ СДЕЛКИ =================
  async function currentRates() { try { const r = await ctx.rates(); return r || { rates: {} }; } catch { return { rates: {} }; } }
  function finView(d, x) {
    const t = VED.finance(x.finance || []);
    const history = (x.activity || []).filter(a => a.section === 'finance').slice().reverse().slice(0, 200);
    return { ok: true, ...t, note: x.financeNote || '', updatedAt: x.financeAt || null, history };
  }
  app.get('/api/deals/:id/finance', admin, (req, res) => { const d = db(); const x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404); res.json(finView(d, x)); });
  app.put('/api/deals/:id/finance', admin, async (req, res) => {
    const d0 = db(); if (!dealOf(d0, req.params.id)) return bad(res, 'Сделка не найдена', 404);
    const b = req.body || {}; const rt = await currentRates();
    const d = db(); const x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    const old = x.finance || [];
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 100).map(it => {
      const cur = VED.CURRENCIES.includes(String(it.currency || 'RUB').toUpperCase()) ? String(it.currency || 'RUB').toUpperCase() : 'RUB';
      const prev = old.find(o => o.id && o.id === it.id);
      const o = { id: it.id && String(it.id).length < 20 && !String(it.id).startsWith('-') ? String(it.id) : newId(4), kind: it.kind === 'income' ? 'income' : 'expense', label: str(it.label, 120), currency: cur };
      if (cur === 'RUB') o.amount = Math.round(n(it.amount) * 100) / 100;
      else { o.amount_orig = n(it.amount_orig); o.rate = n(it.rate) || (prev && prev.currency === cur && prev.rate) || n(rt.rates[cur]) || 0; o.amount = Math.round(o.amount_orig * o.rate * 100) / 100; o.rateDate = (prev && prev.currency === cur && prev.rateDate) || rt.date || ''; }
      return o;
    }).filter(o => o.label);
    // журнал изменений статей (видно во вкладке «Финансы»)
    const fmt = o => (o.currency === 'RUB' ? `${o.amount.toLocaleString('ru-RU')} ₽` : `${(o.amount_orig || 0).toLocaleString('ru-RU')} ${o.currency} (≈ ${o.amount.toLocaleString('ru-RU')} ₽)`);
    const kindRu = k => (k === 'income' ? 'приход' : 'расход'); const log = [];
    for (const o of items) { const p = old.find(v => v.id === o.id); if (!p) log.push(`+ ${kindRu(o.kind)} «${o.label}»: ${fmt(o)}`); else if (p.amount !== o.amount || p.label !== o.label || p.currency !== o.currency) log.push(`${kindRu(o.kind)} «${p.label}»${p.label !== o.label ? ' → «' + o.label + '»' : ''}: ${fmt(p)} → ${fmt(o)}`); }
    for (const p of old) if (!items.some(o => o.id === p.id)) log.push(`− ${kindRu(p.kind)} «${p.label}»: ${fmt(p)}`);
    x.finance = items; if (b.note != null) x.financeNote = str(b.note, 4000);
    const t = VED.finance(items); x.financeTotals = { income: t.income, expense: t.expense, margin: t.margin, percent: t.percent }; x.financeAt = now();
    if (log.length) { x.activity = x.activity || []; x.activity.push({ id: newId(4), at: now(), type: 'finance', by: who(req), text: log.join('\n'), section: 'finance', internal: true }); }
    x.updatedAt = now(); store.save(d); res.json(finView(d, x));
  });

  // ================= КАЛЬКУЛЯТОР ВЭД =================
  const vedSettings = () => { const s = db().settings.ved || {}; return { ...VED.DEFAULTS, ...s }; };
  const NUMF = ['freight_total', 'insurance_amount', 'border_split_percent', 'cargo_rate_value', 'cargo_qty', 'cargo_goods_value', 'cargo_insurance_percent'];
  const ITEM_NUM = ['invoice_amount', 'weight', 'duty_rate', 'duty_extra_rate', 'duty_extra_unit', 'eur_per_kg', 'eur_per_l', 'eur_per_pcs', 'eur_per_m2', 'unit_qty', 'excise_rate', 'excise_qty'];
  const curOk = c => (VED.CURRENCIES.includes(String(c || '').toUpperCase()) ? String(c).toUpperCase() : 'CNY');
  function docBody(b, doc) {
    if (b.name != null) doc.name = str(b.name, 160);
    if (b.transport_mode != null) doc.transport_mode = VED.TRANSPORT[b.transport_mode] ? b.transport_mode : 'sea';
    for (const f of NUMF) if (b[f] !== undefined) doc[f] = n(b[f]);
    for (const f of ['freight_currency', 'insurance_currency', 'cargo_rate_currency', 'cargo_goods_currency']) if (b[f] != null) doc[f] = curOk(b[f]);
    if (b.cargo_rate_basis != null) doc.cargo_rate_basis = b.cargo_rate_basis === 'm3' ? 'm3' : 'kg';
    for (const f of ['border_split_enabled', 'radio_fee']) if (b[f] !== undefined) doc[f] = !!b[f];
    if (Array.isArray(b.extra_costs)) doc.extra_costs = b.extra_costs.slice(0, 60).map(ec => ({ label: str(ec.label, 120), amount: n(ec.amount), is_percent_of_invoice: !!ec.is_percent_of_invoice, currency: curOk(ec.currency || 'RUB'), rate_mode: ec.rate_mode === 'manual' ? 'manual' : 'cbr', manual_rate: n(ec.manual_rate) }));
    if (Array.isArray(b.items)) doc.items = b.items.slice(0, 200).map(it => {
      const o = { name: str(it.name, 300), name_is_auto: it.name_is_auto !== false, tnved_code: String(it.tnved_code || '').replace(/\D/g, '').slice(0, 10), invoice_currency: curOk(it.invoice_currency), auto_lookup: it.auto_lookup !== false,
        duty_type: ['percent', 'min', 'plus', 'fixed_eur'].includes(it.duty_type) ? it.duty_type : 'percent', eur_unit: VED.unitOf(it.eur_unit), excise_type: ['none', 'percent', 'rub_per_unit'].includes(it.excise_type) ? it.excise_type : 'none', radio: !!it.radio };
      for (const f of ITEM_NUM) o[f] = n(it[f]);
      o.vat_rate = it.vat_rate === '' || it.vat_rate == null ? '' : n(it.vat_rate);
      o.freight_override = it.freight_override === '' || it.freight_override == null ? null : n(it.freight_override);
      return o;
    });
    return doc;
  }
  async function docOut(doc) {
    const rt = await currentRates();
    return { ok: true, doc, result: VED.calcDoc(doc, { rates: rt.rates, rateDate: rt.date, settings: vedSettings() }), rates: rt.rates, rateDate: rt.date || '' };
  }
  app.get('/api/ved/settings', admin, (req, res) => res.json({ ok: true, settings: vedSettings(), defaults: VED.DEFAULTS, types: VED.TYPES, transport: VED.TRANSPORT }));
  app.put('/api/ved/settings', admin, (req, res) => {
    const d = db(); const b = req.body || {}; const s = d.settings.ved || {};
    if (b.vatDefault != null) s.vatDefault = Math.max(0, Math.min(50, n(b.vatDefault)));
    if (b.taxOnExpensesPct != null) s.taxOnExpensesPct = Math.max(0, Math.min(50, n(b.taxOnExpensesPct)));
    if (b.radioFee != null) s.radioFee = Math.max(0, n(b.radioFee));
    if (b.borderSplitPercent != null) s.borderSplitPercent = Math.max(0, Math.min(100, n(b.borderSplitPercent)));
    if (b.radioPrefixes != null) s.radioPrefixes = String(Array.isArray(b.radioPrefixes) ? b.radioPrefixes.join(',') : b.radioPrefixes).split(/[,;\n]+/).map(v => v.replace(/\D/g, '')).filter(v => v.length >= 2).slice(0, 500);
    if (Array.isArray(b.feeScale)) { const sc = b.feeScale.map(r => [r[0] === null || r[0] === '' ? null : n(r[0]), n(r[1])]).filter(r => r[1] > 0); if (sc.length) { sc.sort((a, c) => (a[0] == null ? 1 : c[0] == null ? -1 : a[0] - c[0])); if (sc[sc.length - 1][0] != null) sc.push([null, sc[sc.length - 1][1]]); s.feeScale = sc; } }
    if (b.reset) { delete d.settings.ved; store.save(d); return res.json({ ok: true, settings: vedSettings() }); }
    d.settings.ved = s; store.save(d); res.json({ ok: true, settings: vedSettings() });
  });
  app.get('/api/ved/rates', admin, async (req, res) => { const rt = await currentRates(); res.json({ ok: true, rates: rt.rates, date: rt.date || '' }); });
  app.post('/api/ved/quick', admin, async (req, res) => { const doc = docBody(req.body || {}, VED.newDoc((req.body || {}).calc_type || 'our_contract')); res.json(await docOut(doc)); });
  app.get('/api/calc', admin, (req, res) => {
    const d = db(); let items = d.calcDocs;
    if (req.query.deal) items = items.filter(v => v.dealId === req.query.deal); else if (req.query.standalone) items = items.filter(v => !v.dealId);
    res.json({ ok: true, items: items.map(v => { const x = v.dealId && dealOf(d, v.dealId); return { id: v.id, name: v.name, calc_type: v.calc_type, dealId: v.dealId || '', dealTitle: x ? x.title : '', updatedAt: v.updatedAt, total: v.lastTotal || null }; }) });
  });
  app.post('/api/calc', admin, async (req, res) => {
    const d = db(); const b = req.body || {};
    if (b.dealId && !dealOf(d, b.dealId)) return bad(res, 'Сделка не найдена');
    const type = VED.CREATABLE.includes(b.calc_type) ? b.calc_type : 'our_contract';
    const cur = (d.settings.company && d.settings.company.defaultCurrency) || 'CNY';
    const doc = Object.assign(VED.newDoc(type, cur), { id: newId(5), dealId: b.dealId || '', createdAt: now(), updatedAt: now(), createdBy: who(req) });
    if (b.name) doc.name = str(b.name, 160);
    const x = b.dealId && dealOf(d, b.dealId); if (x) { if (x.weight && doc.items[0]) doc.items[0].weight = x.weight; if (x.cargo && doc.items[0]) doc.items[0].name = x.cargo; doc.transport_mode = { auto: 'auto', rail: 'rail', sea: 'sea', air: 'avia', multimodal: 'multimodal' }[x.mode] || 'sea'; }
    d.calcDocs.unshift(doc); d.calcDocs = d.calcDocs.slice(0, 5000); store.save(d);
    res.json({ ...(await docOut(doc)), id: doc.id });
  });
  app.get('/api/calc/:id', admin, async (req, res) => { const doc = db().calcDocs.find(v => v.id === req.params.id); if (!doc) return bad(res, 'Расчёт не найден', 404); res.json(await docOut(doc)); });
  app.patch('/api/calc/:id', admin, async (req, res) => {
    const d = db(); const doc = d.calcDocs.find(v => v.id === req.params.id); if (!doc) return bad(res, 'Расчёт не найден', 404);
    docBody(req.body || {}, doc); if (req.body && req.body.dealId !== undefined) { if (req.body.dealId && !dealOf(d, req.body.dealId)) return bad(res, 'Сделка не найдена'); doc.dealId = req.body.dealId || ''; }
    doc.updatedAt = now(); const out = await docOut(doc); doc.lastTotal = { rub: out.result.grand_total_rub, display: out.result.grand_total_display, currency: out.result.display_currency };
    store.save(d); res.json(out);
  });
  app.delete('/api/calc/:id', admin, (req, res) => { const d = db(); const i = d.calcDocs.findIndex(v => v.id === req.params.id); if (i < 0) return bad(res, 'Расчёт не найден', 404); d.calcDocs.splice(i, 1); store.save(d); res.json({ ok: true }); });
  // перенос итогов расчёта в «Финансы» сделки — отдельными статьями расходов в рублях
  app.post('/api/calc/:id/to-finance', admin, async (req, res) => {
    const d0 = db(); const doc = d0.calcDocs.find(v => v.id === req.params.id); if (!doc || !doc.dealId) return bad(res, 'Расчёт не привязан к сделке');
    const out = await docOut(doc); const r = out.result;
    const d = db(); const x = dealOf(d, doc.dealId); if (!x) return bad(res, 'Сделка не найдена', 404);
    const tag = doc.name ? ` (${doc.name})` : ''; const rows = [];
    const add = (label, rub) => { if (rub > 0) rows.push({ id: newId(4), kind: 'expense', label: label + tag, currency: 'RUB', amount: Math.round(rub * 100) / 100 }); };
    add('Фрахт', r.freight_total_rub); add('Страховка', r.insurance_total_rub);
    if (r.calc_type === 'our_contract') { add('Пошлина', r.duty_sum_rub); add('Акциз', r.excise_sum_rub); add('НДС на ввоз', r.vat_sum_rub); add(r.customs_fee_radio ? 'Таможенный сбор (Прил. №1 к ПП №1637)' : 'Таможенный сбор', r.customs_fee_rub); add('Налог на расходы', r.tax_on_expenses_rub); }
    for (const ec of r.extra_costs) add(ec.label || 'Доп. расход', ec.amount_rub);
    x.finance = (x.finance || []).concat(rows); const t = VED.finance(x.finance); x.financeTotals = { income: t.income, expense: t.expense, margin: t.margin, percent: t.percent }; x.financeAt = now();
    x.activity = x.activity || []; x.activity.push({ id: newId(4), at: now(), type: 'calc', by: who(req), text: `Расчёт «${doc.name || VED.TYPES[doc.calc_type]}» перенесён в финансы: ${rows.length} статей, ${Math.round(rows.reduce((s, v) => s + v.amount, 0)).toLocaleString('ru-RU')} ₽` });
    store.save(d); res.json({ ok: true, added: rows.length });
  });

  // ================= АНАЛИТИКА =================
  const PERIOD = { month: 30, quarter: 91, half: 182, year: 365 };
  const periodFrom = p => new Date(Date.now() - (PERIOD[p] || 30) * 864e5).toISOString();
  function analyticsDeals(d, q) {
    const from = periodFrom(q.period); const st = q.status;
    return d.deals.filter(x => {
      const s = crm.statusOf(x); if (q.manager != null && q.manager !== '' && (x.manager || '—') !== q.manager) return false;
      if (st === 'active') return s === 'active' && x.funnel !== crm.INCOMING;
      if (st === 'won') return s === 'won' && (x.closedAt || x.updatedAt) >= from;
      if (st === 'closed') return s === 'closed' && (x.closedAt || x.updatedAt) >= from && (q.reason == null || (q.reason === '' ? !x.closeReason : x.closeReason === q.reason));
      if (st === 'deleted') return s === 'deleted' && x.deletedAt >= from;
      return x.createdAt >= from && s !== 'deleted';
    });
  }
  const dealRow = (d, x) => { const b = crm.brief(d, x); return { id: x.id, title: x.title, number: x.number, manager: x.manager || '', client: b.clientName, status: b.status, stage: x.stage, margin: x.financeTotals ? x.financeTotals.margin : 0, createdAt: x.createdAt, closedAt: x.closedAt || '', closeReason: x.closeReason || '' }; };
  app.get('/api/analytics', admin, (req, res) => {
    const d = db(); const p = PERIOD[req.query.period] ? req.query.period : 'month'; const from = periodFrom(p);
    const inPeriod = x => x.createdAt >= from;
    const leadsIn = d.deals.filter(x => inPeriod(x) && (x.funnel === crm.INCOMING || x.leadId)).length;
    const active = analyticsDeals(d, { period: p, status: 'active' }), won = analyticsDeals(d, { period: p, status: 'won' }), lost = analyticsDeals(d, { period: p, status: 'closed' }), archived = analyticsDeals(d, { period: p, status: 'deleted' });
    const reasons = {}; for (const x of lost) { const k = x.closeReason || ''; reasons[k] = (reasons[k] || 0) + 1; }
    const names = new Set(staffNames(d)); for (const x of d.deals) if (x.manager && (inPeriod(x) || (x.closedAt || '') >= from)) names.add(x.manager);
    const toDays = (name) => (d.timeoff || []).filter(t => t.manager === name && (t.status || 'approved') === 'approved' && t.date_to >= from.slice(0, 10)).reduce((s, t) => s + Math.max(0, Math.round((Date.parse(t.date_to) - Math.max(Date.parse(t.date_from), Date.parse(from.slice(0, 10)))) / 864e5) + 1) * (t.kind === 'day_off' && (t.time_from || t.time_to) ? 0.5 : 1), 0);
    const byMgr = [...names, '—'].map(name => {
      const mine = x => (x.manager || '—') === name;
      const total = d.deals.filter(x => mine(x) && inPeriod(x) && crm.statusOf(x) !== 'deleted').length;
      const w = won.filter(mine), l = lost.filter(mine), a = archived.filter(mine);
      const margin = d.deals.filter(x => mine(x) && (inPeriod(x) || (x.closedAt || '') >= from) && crm.statusOf(x) !== 'deleted').reduce((s, x) => s + (x.financeTotals ? x.financeTotals.margin : 0), 0);
      const tasks = d.tasks.filter(t => (t.manager || '—') === name);
      const done = tasks.filter(t => t.status === 'done' && (t.doneAt || '') >= from), overdue = tasks.filter(t => t.status !== 'done' && t.deadline && t.deadline < today());
      const onTime = done.filter(t => !t.deadline || String(t.doneAt).slice(0, 10) <= t.deadline).length;
      const acts = d.deals.filter(mine).reduce((s, x) => s + (x.activity || []).filter(v => v.at >= from && ['call', 'meet', 'mail', 'tg', 'wa', 'note'].includes(v.type)).length, 0);
      return { name, total, won: w.length, lost: l.length, archived: a.length, time_off_days: name === '—' ? 0 : toDays(name), margin_sum: Math.round(margin), tasks_done: done.length, tasks_overdue: overdue.length, on_time: done.length ? Math.round(onTime / done.length * 100) : null, activities: acts };
    }).filter(m => m.total || m.won || m.lost || m.archived || m.tasks_done || m.tasks_overdue || (m.name !== '—' && names.has(m.name)));
    const conv = won.length + lost.length ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
    const funnel = {}; for (const x of d.deals.filter(v => crm.statusOf(v) === 'active')) { const k = x.funnel + ' · ' + x.stage; funnel[k] = (funnel[k] || 0) + 1; }
    const sources = {}; for (const x of d.deals.filter(inPeriod)) sources[x.source || '—'] = (sources[x.source || '—'] || 0) + 1;
    res.json({ ok: true, period: p, from, leads_in: leadsIn, deals_active: active.length, deals_closed_won: won.length, deals_closed_lost: lost.length, deals_archived: archived.length, conversion: conv,
      margin_sum: Math.round(d.deals.filter(x => crm.statusOf(x) !== 'deleted' && (inPeriod(x) || (x.closedAt || '') >= from)).reduce((s, x) => s + (x.financeTotals ? x.financeTotals.margin : 0), 0)),
      close_reasons: Object.keys(reasons).map(k => ({ close_reason: k, cnt: reasons[k] })).sort((a, b) => b.cnt - a.cnt), by_manager: byMgr, funnel, sources });
  });
  app.get('/api/analytics/deals', admin, (req, res) => { const d = db(); res.json({ ok: true, deals: analyticsDeals(d, req.query || {}).map(x => dealRow(d, x)) }); });
  app.get('/api/analytics/deal/:id/finance', admin, (req, res) => {
    const d = db(); const x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    const t = VED.finance(x.finance || []); res.json({ ok: true, deal_name: x.title, deal_number: x.number, manager_name: x.manager || '', items: t.items, margin: t.margin, percent: t.percent, general_note: x.financeNote || '', updated_at: x.financeAt || '' });
  });

  // ================= ОТГУЛЫ И ОТПУСКА =================
  function toBody(b, t) {
    if (b.manager != null) t.manager = str(b.manager, 80);
    if (b.kind != null) t.kind = b.kind === 'vacation' ? 'vacation' : 'day_off';
    for (const f of ['date_from', 'date_to']) if (b[f] != null) t[f] = dateOk(b[f]) ? b[f] : t[f];
    for (const f of ['time_from', 'time_to']) if (b[f] !== undefined) t[f] = t.kind === 'day_off' && /^\d{2}:\d{2}$/.test(String(b[f] || '')) ? b[f] : '';
    if (b.reason != null) t.reason = str(b.reason, 1000);
    return t;
  }
  const toView = t => ({ ...t, days: Math.round((Date.parse(t.date_to) - Date.parse(t.date_from)) / 864e5) + 1, status: t.status || 'approved' });
  app.get('/api/timeoff', admin, (req, res) => {
    const d = db(); let items = d.timeoff; if (req.query.manager) items = items.filter(t => t.manager === req.query.manager);
    res.json({ ok: true, items: items.slice().sort((a, b) => String(b.date_from).localeCompare(String(a.date_from))).map(toView), managers: staffNames(d), offToday: staffNames(d).filter(nm => offOn(d, nm)) });
  });
  app.post('/api/timeoff', admin, (req, res) => {
    const d = db(); const b = req.body || {}; const t = toBody(b, { id: newId(4), kind: 'day_off', createdAt: now(), createdBy: who(req) });
    if (!t.manager) return bad(res, 'Укажите сотрудника'); if (!t.date_from || !t.date_to) return bad(res, 'Укажите даты'); if (t.date_to < t.date_from) return bad(res, 'Дата окончания раньше начала');
    t.status = b.status === 'pending' ? 'pending' : 'approved'; if (t.status === 'approved') { t.decidedBy = who(req); t.decidedAt = now(); }
    d.timeoff.unshift(t); store.save(d); res.json({ ok: true, item: toView(t) });
  });
  app.patch('/api/timeoff/:id', admin, (req, res) => {
    const d = db(); const t = d.timeoff.find(v => v.id === req.params.id); if (!t) return bad(res, 'Запись не найдена', 404);
    const b = req.body || {}; toBody(b, t); if (t.date_to < t.date_from) return bad(res, 'Дата окончания раньше начала');
    if (['pending', 'approved', 'rejected'].includes(b.status) && b.status !== t.status) { t.status = b.status; t.decidedBy = who(req); t.decidedAt = now(); }
    store.save(d); res.json({ ok: true, item: toView(t) });
  });
  app.delete('/api/timeoff/:id', admin, (req, res) => { const d = db(); const i = d.timeoff.findIndex(v => v.id === req.params.id); if (i < 0) return bad(res, 'Запись не найдена', 404); d.timeoff.splice(i, 1); store.save(d); res.json({ ok: true }); });

  // ================= ПРАЗДНИКИ =================
  app.get('/api/holidays', admin, (req, res) => {
    const d = db(); const year = Number(req.query.year) || new Date().getFullYear(); const H = HOLIDAYS[year];
    const custom = (d.settings.holidays || []).filter(h => String(h.date).startsWith(String(year)));
    res.json({ ok: true, year, years: Object.keys(HOLIDAYS).map(Number), builtIn: !!H, ru: H ? H.ru.map(([date, name, kind]) => ({ date, name, kind })) : [], cn: H ? expandCn(H.cn) : [], custom, offToday: staffNames(d).filter(nm => offOn(d, nm)) });
  });
  app.post('/api/holidays', admin, (req, res) => {
    const d = db(); const b = req.body || {}; if (!dateOk(b.date)) return bad(res, 'Укажите дату'); const name = str(b.name, 120); if (!name) return bad(res, 'Укажите название');
    const h = { id: newId(4), date: b.date, name, country: ['ru', 'cn', 'kz', 'other'].includes(b.country) ? b.country : 'other', kind: b.kind === 'workday' ? 'workday' : 'holiday' };
    d.settings.holidays = (d.settings.holidays || []).concat(h).sort((a, c) => a.date.localeCompare(c.date)); store.save(d); res.json({ ok: true, item: h });
  });
  app.delete('/api/holidays/:id', admin, (req, res) => { const d = db(); d.settings.holidays = (d.settings.holidays || []).filter(h => h.id !== req.params.id); store.save(d); res.json({ ok: true }); });

  // ================= КОМПАНИЯ: сотрудники, юрлица, шаблоны =================
  const COMPANY_F = ['name', 'domain', 'brandColor', 'logoLetter', 'defaultCurrency', 'phone', 'email', 'site'];
  const ENTITY_F = ['name', 'name_short', 'contract_prefix', 'inn', 'kpp', 'ogrn', 'address', 'phone', 'email', 'director_position', 'director_name', 'vat_rate', 'bik', 'account', 'korr_account', 'bank_name', 'legal_basis_full', 'managing_company_name', 'managing_company_name_short', 'managing_ceo_name_nominative', 'managing_ceo_position_nominative'];
  const STAFF_F = ['name', 'position', 'email', 'phone', 'telegram', 'color'];
  const company = d => { d.settings.company = d.settings.company || {}; d.settings.staff = d.settings.staff || []; d.settings.entities = d.settings.entities || []; d.settings.templates = d.settings.templates || {}; return d.settings; };
  app.get('/api/company', admin, (req, res) => { const d = db(); const s = company(d); res.json({ ok: true, company: s.company, staff: s.staff.map(m => ({ ...m, offNow: offOn(d, m.name) })), entities: s.entities, templates: s.templates }); });
  app.put('/api/company', admin, (req, res) => { const d = db(); const s = company(d); const b = req.body || {}; for (const f of COMPANY_F) if (b[f] != null) s.company[f] = str(b[f], 200); store.save(d); res.json({ ok: true, company: s.company }); });
  app.post('/api/company/staff', admin, (req, res) => {
    const d = db(); const s = company(d); const b = req.body || {}; const name = str(b.name, 80); if (!name) return bad(res, 'Введите имя сотрудника');
    if (s.staff.some(m => m.name.toLowerCase() === name.toLowerCase())) return bad(res, 'Такой сотрудник уже есть', 409);
    const m = { id: newId(4), active: true }; for (const f of STAFF_F) if (b[f] != null) m[f] = str(b[f], 120); m.name = name; s.staff.push(m); store.save(d); res.json({ ok: true, item: m });
  });
  app.patch('/api/company/staff/:id', admin, (req, res) => {
    const d = db(); const s = company(d); const m = s.staff.find(v => v.id === req.params.id); if (!m) return bad(res, 'Сотрудник не найден', 404);
    const b = req.body || {}; const old = m.name;
    for (const f of STAFF_F) if (b[f] != null) m[f] = str(b[f], 120); if (!m.name) m.name = old; if (b.active != null) m.active = !!b.active;
    if (old !== m.name) { for (const x of d.deals) if (x.manager === old) x.manager = m.name; for (const t of d.tasks) if (t.manager === old) t.manager = m.name; for (const t of d.timeoff) if (t.manager === old) t.manager = m.name; const q = d.settings.queue; if (q) { q.order = (q.order || []).map(v => (v === old ? m.name : v)); q.active = (q.active || []).map(v => (v === old ? m.name : v)); } }
    store.save(d); res.json({ ok: true, item: m });
  });
  app.delete('/api/company/staff/:id', admin, (req, res) => { const d = db(); const s = company(d); s.staff = s.staff.filter(v => v.id !== req.params.id); store.save(d); res.json({ ok: true }); });
  const entBody = (b, e) => { for (const f of ENTITY_F) if (b[f] != null) e[f] = str(b[f], 300); if (b.has_managing_company != null) e.has_managing_company = !!b.has_managing_company; return e; };
  app.post('/api/company/entities', admin, (req, res) => { const d = db(); const s = company(d); const e = entBody(req.body || {}, { id: newId(4), contractTypes: [], templates: {} }); if (!e.name) return bad(res, 'Название юрлица обязательно'); s.entities.push(e); store.save(d); res.json({ ok: true, item: e }); });
  app.patch('/api/company/entities/:id', admin, (req, res) => { const d = db(); const e = company(d).entities.find(v => v.id === req.params.id); if (!e) return bad(res, 'Юрлицо не найдено', 404); entBody(req.body || {}, e); if (!e.name) return bad(res, 'Название юрлица обязательно'); store.save(d); res.json({ ok: true, item: e }); });
  app.delete('/api/company/entities/:id', admin, (req, res) => { const d = db(); const s = company(d); s.entities = s.entities.filter(v => v.id !== req.params.id); store.save(d); res.json({ ok: true }); });
  // реквизиты из карточки компании: ИНН, КПП, ОГРН, БИК, счета — без ИИ по шаблонам, с ИИ — полностью
  function extractRequisites(text) {
    const t = String(text || '').replace(/\u00a0/g, ' '); const g = rx => { const m = t.match(rx); return m ? m[1].replace(/\s/g, '') : ''; };
    const o = { inn: g(/ИНН[\s:\/]*(\d{10}|\d{12})\b/i), kpp: g(/КПП[\s:]*(\d{9})\b/i), ogrn: g(/ОГРН(?:ИП)?[\s:]*(\d{13}|\d{15})\b/i), bik: g(/БИК[\s:]*(\d{9})\b/i),
      account: g(/(?:р\/?с|расч[её]тный сч[её]т|р\.с\.)[\s:№]*(\d[\d\s]{18,24}\d)/i), korr_account: g(/(?:к\/?с|корр?\.?\s*сч[её]т|корреспондентский сч[её]т)[\s:№]*(\d[\d\s]{18,24}\d)/i) };
    const nm = t.match(/((?:ООО|АО|ЗАО|ПАО|ОАО|ИП)\s*[«"][^»"]{2,80}[»"])/); if (nm) o.name_short = nm[1].replace(/"/g, '«').replace(/«([^«]*)«/, '«$1»');
    const full = t.match(/(Общество с ограниченной ответственностью\s*[«"][^»"]{2,80}[»"])/i); if (full) o.name = full[1]; else if (o.name_short) o.name = o.name_short;
    const addr = t.match(/(?:юридический адрес|адрес)[\s:]*([^\n]{10,200})/i); if (addr) o.address = addr[1].trim();
    const bank = t.match(/(?:банк)[\s:]*([^\n]{4,120})/i); if (bank) o.bank_name = bank[1].trim();
    const dir = t.match(/(?:генеральный директор|директор)[\s:–-]*([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+|[А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.)/); if (dir) { o.director_name = dir[1]; o.director_position = 'Генеральный директор'; }
    const ph = t.match(/(?:тел\.?|телефон)[\s:]*([+\d][\d\s()-]{8,20}\d)/i); if (ph) o.phone = ph[1].trim();
    const em = t.match(/([\w.+-]+@[\w-]+\.[\w.]+)/); if (em) o.email = em[1];
    for (const k of Object.keys(o)) if (!o[k]) delete o[k];
    return o;
  }
  if (upload) app.post('/api/company/entities/extract', admin, upload.single('file'), async (req, res) => {
    const f = req.file; if (!f) return bad(res, 'Выберите файл');
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8'); const dp = require('./docparse'); const k = dp.kindOf(name, f.mimetype);
    let text = ''; try { text = k === 'docx' ? dp.docxText(f.buffer) : k === 'xlsx' ? dp.xlsxText(f.buffer) : k === 'text' ? f.buffer.toString('utf8') : ''; } catch {}
    const warnings = []; let data = text ? extractRequisites(text) : {};
    if (ctx.ai && ctx.ai.enabled() && (k === 'pdf' || k === 'image' || Object.keys(data).length < 4)) {
      try {
        const prompt = 'Извлеки реквизиты российской компании из документа. Верни ТОЛЬКО JSON с полями: ' + ENTITY_F.join(', ') + '. Нет данных — пустая строка. Не выдумывай.';
        const content = [{ type: 'input_text', text: prompt + (text ? '\n\n' + text.slice(0, 20000) : '') }];
        if (!text && (k === 'pdf' || k === 'image')) content.push(k === 'pdf' ? { type: 'input_file', filename: name, file_data: 'data:application/pdf;base64,' + f.buffer.toString('base64') } : { type: 'input_image', image_url: 'data:' + (f.mimetype || 'image/jpeg') + ';base64,' + f.buffer.toString('base64') });
        const out = await ctx.ai.run([{ role: 'user', content }]); const j = JSON.parse(String(out).replace(/^```(?:json)?|```$/g, '').trim());
        for (const key of ENTITY_F) if (j[key] && !data[key]) data[key] = String(j[key]).slice(0, 300);
      } catch (e) { warnings.push('ИИ не смог разобрать файл: ' + e.message); }
    } else if (!text) warnings.push('PDF и фото разбираются только с подключённым ИИ (OPENAI_API_KEY) — заполните поля вручную');
    if (data.inn && !/^(\d{10}|\d{12})$/.test(data.inn)) warnings.push('ИНН выглядит неполным');
    res.json({ ok: Object.keys(data).length > 0 || !warnings.length, data, warnings, error: Object.keys(data).length ? '' : 'Реквизиты не найдены' });
  });
  const entOf = (d, id) => company(d).entities.find(v => v.id === id);
  const ctOf = (d, ctid) => { for (const e of company(d).entities) { const c = (e.contractTypes || []).find(v => v.id === ctid); if (c) return [e, c]; } return [null, null]; };
  app.post('/api/company/entities/:id/contract-types', admin, (req, res) => { const d = db(); const e = entOf(d, req.params.id); if (!e) return bad(res, 'Юрлицо не найдено', 404); const name = str(req.body && req.body.name, 120); if (!name) return bad(res, 'Название типа договора'); e.contractTypes = e.contractTypes || []; const c = { id: newId(4), name, is_supply_type: !!(req.body && req.body.is_supply_type) }; e.contractTypes.push(c); store.save(d); res.json({ ok: true, item: c }); });
  app.patch('/api/company/contract-types/:ctid', admin, (req, res) => { const d = db(); const [, c] = ctOf(d, req.params.ctid); if (!c) return bad(res, 'Тип договора не найден', 404); const b = req.body || {}; if (b.name != null && str(b.name, 120)) c.name = str(b.name, 120); if (b.is_supply_type != null) c.is_supply_type = !!b.is_supply_type; store.save(d); res.json({ ok: true, item: c }); });
  app.delete('/api/company/contract-types/:ctid', admin, async (req, res) => { const d = db(); const [e, c] = ctOf(d, req.params.ctid); if (!c) return bad(res, 'Тип договора не найден', 404); if (c.template) { try { await store.delDoc('company', c.template.fileId); } catch {} } e.contractTypes = e.contractTypes.filter(v => v !== c); store.save(d); res.json({ ok: true }); });
  async function putTemplate(req, res, setTpl) {
    const f = req.file; if (!f) return bad(res, 'Выберите файл .docx'); const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    if (!/\.docx$/i.test(name)) return bad(res, 'Шаблон должен быть в формате .docx');
    const fileId = newId(6); await store.putDoc('company', fileId, f.buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const tpl = { fileId, name: str(name, 160), size: f.buffer.length, at: now() }; const prev = setTpl(tpl); if (prev) { try { await store.delDoc('company', prev.fileId); } catch {} }
    res.json({ ok: true, template: tpl });
  }
  async function sendTemplate(res, tpl) { if (!tpl) return bad(res, 'Шаблон не загружен', 404); let buf = null; try { buf = await store.getDoc('company', tpl.fileId); } catch {} if (!buf) return bad(res, 'Файл не найден', 404); res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(tpl.name)}`); res.send(buf); }
  if (upload) app.post('/api/company/contract-types/:ctid/template', admin, upload.single('file'), (req, res) => { const d = db(); const [, c] = ctOf(d, req.params.ctid); if (!c) return bad(res, 'Тип договора не найден', 404); return putTemplate(req, res, tpl => { const p = c.template; c.template = tpl; store.save(d); return p; }); });
  app.get('/api/company/contract-types/:ctid/template', admin, (req, res) => { const [, c] = ctOf(db(), req.params.ctid); return sendTemplate(res, c && c.template); });
  app.delete('/api/company/contract-types/:ctid/template', admin, async (req, res) => { const d = db(); const [, c] = ctOf(d, req.params.ctid); if (!c || !c.template) return bad(res, 'Шаблон не загружен', 404); try { await store.delDoc('company', c.template.fileId); } catch {} delete c.template; store.save(d); res.json({ ok: true }); });
  const TPL = { kp: 'Коммерческое предложение (КП)', spec: 'Спецификация' };
  const tplHolder = (d, q) => { if (q && q.entity) { const e = entOf(d, q.entity); if (!e) return null; e.templates = e.templates || {}; return e.templates; } return company(d).templates; };
  if (upload) app.post('/api/company/templates/:key', admin, upload.single('file'), (req, res) => { if (!TPL[req.params.key]) return bad(res, 'Неизвестный шаблон'); const d = db(); const h = tplHolder(d, req.query); if (!h) return bad(res, 'Юрлицо не найдено', 404); return putTemplate(req, res, tpl => { const p = h[req.params.key]; h[req.params.key] = tpl; store.save(d); return p; }); });
  app.get('/api/company/templates/:key', admin, (req, res) => { const h = tplHolder(db(), req.query); return sendTemplate(res, h && h[req.params.key]); });
  app.delete('/api/company/templates/:key', admin, async (req, res) => { const d = db(); const h = tplHolder(d, req.query); if (!h || !h[req.params.key]) return bad(res, 'Шаблон не загружен', 404); try { await store.delDoc('company', h[req.params.key].fileId); } catch {} delete h[req.params.key]; store.save(d); res.json({ ok: true }); });

  // ================= БЕЗОПАСНОСТЬ =================
  app.get('/api/security', admin, async (req, res) => {
    const d = db(); let logins = [];
    if (ctx.journal) { try { const months = (await ctx.journal.monthsList()).slice(0, 2); for (const m of months) logins = logins.concat((await ctx.journal.list(m)).filter(r => r.type === 'login' || r.type === 'login_fail')); } catch {} }
    const fails24 = logins.filter(r => r.type === 'login_fail' && Date.parse(r.at) > Date.now() - 864e5).length;
    res.json({ ok: true, secrets: SECRETS.map(([key, label, kind]) => ({ key, label, kind, set: !!(process.env[key] || (key === 'SUPABASE_SERVICE_KEY' && process.env.SUPABASE_SERVICE_ROLE_KEY)) })),
      logins: logins.slice(0, 80).map(r => ({ at: r.at, ok: r.type === 'login', role: r.role || '', name: r.name || '', login: r.contact || r.email || '', visitor: r.visitor || '', result: r.result || '' })),
      fails24, storage: store.kind, sessionVersion: d.settings.adminSv || 0, customPassword: !!d.settings.adminHash, lastLogoutAll: d.settings.adminSvAt || null });
  });
  app.post('/api/security/logout-all', admin, (req, res) => { const d = db(); d.settings.adminSv = (d.settings.adminSv || 0) + 1; d.settings.adminSvAt = now(); store.save(d); res.clearCookie('auth', { path: '/' }); res.json({ ok: true }); });
  app.post('/api/security/client-logout/:uid', admin, (req, res) => { const d = db(); const u = (d.users || []).find(v => v.id === req.params.uid); if (!u) return bad(res, 'Клиент не найден', 404); u.sv = (u.sv || 0) + 1; store.save(d); res.json({ ok: true }); });

  // ================= ПОЧТА и ОЧЕРЕДЬ МЕНЕДЖЕРОВ =================
  function mailAdd(e) { const d = db(); const m = { id: newId(5), at: now(), dir: 'in', mailbox: 'Сайт', category: 'заявка', ...e }; d.mailLog.unshift(m); d.mailLog = d.mailLog.slice(0, 3000); store.save(d); return m; }
  function queue(d) { const q = d.settings.queue = d.settings.queue || { enabled: false, order: [], active: [] }; for (const nm of staffNames(d)) if (!q.order.includes(nm)) q.order.push(nm); q.order = q.order.filter(nm => staffNames(d).includes(nm)); q.active = (q.active || []).filter(nm => q.order.includes(nm)); return q; }
  function nextFromQueue(d) {
    const q = queue(d); if (!q.enabled) return '';
    const list = q.order.filter(nm => q.active.includes(nm) && !offOn(d, nm)); if (!list.length) return '';
    const i = list.indexOf(q.last); const nm = list[(i + 1) % list.length]; q.last = nm; return nm;
  }
  crm.hooks.onCreate.push((deal, d) => {
    if (deal.funnel === crm.INCOMING && !deal.manager) { const nm = nextFromQueue(d); if (nm) { deal.manager = nm; deal.activity.push({ id: newId(4), at: now(), type: 'field', by: 'Очередь', field: 'manager', from: '', to: nm }); } }
    if (deal.createdVia === 'site') { const text = (deal.activity[0] && deal.activity[0].text) || ''; d.mailLog = d.mailLog || []; d.mailLog.unshift({ id: newId(5), at: deal.createdAt, dir: 'in', mailbox: 'Сайт', from: [deal.contactName, deal.contactPhone || deal.contactEmail].filter(Boolean).join(' · '), subject: deal.title, text, category: 'заявка', manager: deal.manager || '', dealId: deal.id }); d.mailLog = d.mailLog.slice(0, 3000); }
  });
  app.get('/api/mail/stats', admin, (req, res) => {
    const d = db(); const td = today(); const st = { today: {}, total: {} };
    for (const c of MAIL_CATS) { st.today[c] = 0; st.total[c] = 0; }
    for (const m of d.mailLog) if (m.dir === 'in') { st.total[m.category] = (st.total[m.category] || 0) + 1; if (String(m.at).slice(0, 10) === td) st.today[m.category] = (st.today[m.category] || 0) + 1; }
    res.json({ ok: true, ...st, all: d.mailLog.length, sent: d.mailLog.filter(m => m.dir === 'out').length, last_check: d.settings.mailLastCheck || '—', out: ctx.mail ? { enabled: ctx.mail.enabled(), kind: ctx.mail.kind() } : { enabled: false }, inbound: { configured: !!(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD) } });
  });
  app.get('/api/mail/entries', admin, (req, res) => {
    const d = db(); let items = d.mailLog; const c = req.query.category; const q = String(req.query.q || '').trim().toLowerCase();
    if (c === 'исходящие') items = items.filter(m => m.dir === 'out'); else if (c) items = items.filter(m => m.category === c && m.dir === 'in');
    if (q) items = items.filter(m => [m.from, m.to, m.subject, m.text, m.manager].some(v => String(v || '').toLowerCase().includes(q)));
    const limit = Math.min(100, Number(req.query.limit) || 20), offset = Math.max(0, Number(req.query.offset) || 0);
    res.json({ ok: true, total: items.length, entries: items.slice(offset, offset + limit).map(m => ({ ...m, text: undefined, preview: String(m.text || '').slice(0, 160) })) });
  });
  app.get('/api/mail/entries/:id', admin, (req, res) => { const m = db().mailLog.find(v => v.id === req.params.id); if (!m) return bad(res, 'Письмо не найдено', 404); res.json({ ok: true, item: m }); });
  app.patch('/api/mail/entries/:id', admin, (req, res) => { const d = db(); const m = d.mailLog.find(v => v.id === req.params.id); if (!m) return bad(res, 'Письмо не найдено', 404); if (MAIL_CATS.includes(req.body && req.body.category)) m.category = req.body.category; store.save(d); res.json({ ok: true, item: m }); });
  app.post('/api/mail/check', admin, (req, res) => {
    const d = db(); d.settings.mailLastCheck = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); store.save(d);
    if (!(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD)) return res.status(400).json({ ok: false, error: 'Входящий ящик не подключён. Добавьте в Render → Environment: IMAP_HOST, IMAP_USER, IMAP_PASSWORD. Заявки с сайта уже попадают сюда сами.' });
    res.status(501).json({ ok: false, error: 'Ящик указан в настройках. Чтение писем по IMAP будет включено следующим обновлением.' });
  });
  app.post('/api/mail/send', admin, async (req, res) => {
    const b = req.body || {}; const to = str(b.to, 160), subject = str(b.subject, 200), text = str(b.text, 20000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return bad(res, 'Укажите почту получателя'); if (!subject || !text) return bad(res, 'Тема и текст письма обязательны');
    if (!ctx.mail || !ctx.mail.enabled()) return bad(res, 'Отправка писем не настроена: добавьте RESEND_API_KEY или SMTP_URL в Render', 503);
    let ok = true, error = '';
    try { await ctx.mail.send(to, subject, text); } catch (e) { ok = false; error = e.message; }
    const d = db(); const x = b.dealId && dealOf(d, b.dealId);
    d.mailLog.unshift({ id: newId(5), at: now(), dir: 'out', mailbox: ctx.mail.kind(), to, subject, text, category: 'исходящее', manager: x ? x.manager || '' : '', dealId: x ? x.id : '', ok, error }); d.mailLog = d.mailLog.slice(0, 3000);
    if (x && ok) { x.activity = x.activity || []; x.activity.push({ id: newId(4), at: now(), type: 'mail', by: who(req), text: `Письмо → ${to}\nТема: ${subject}\n\n${text}` }); x.updatedAt = now(); }
    store.save(d); if (!ok) return bad(res, 'Письмо не отправлено: ' + error, 502); res.json({ ok: true });
  });
  app.get('/api/mail/queue', admin, (req, res) => {
    const d = db(); const q = queue(d); store.save(d);
    const open = nm => d.deals.filter(x => x.funnel === crm.INCOMING && crm.statusOf(x) === 'active' && x.manager === nm).length;
    const st = d.settings.staff || [];
    res.json({ ok: true, enabled: !!q.enabled, managers: q.order.map(nm => { const m = st.find(v => v.name === nm) || {}; return { name: nm, active: q.active.includes(nm), leads: open(nm), is_current: q.last === nm, off_now: offOn(d, nm), telegram: m.telegram || '' }; }) });
  });
  app.patch('/api/mail/queue/managers', admin, (req, res) => {
    const d = db(); const q = queue(d); const list = (req.body && req.body.managers) || [];
    const names = list.map(m => String(m.name || '')).filter(nm => q.order.includes(nm));
    q.order = names.concat(q.order.filter(nm => !names.includes(nm))); q.active = list.filter(m => m.active && q.order.includes(m.name)).map(m => m.name);
    store.save(d); res.json({ ok: true });
  });
  app.post('/api/mail/queue/toggle', admin, (req, res) => { const d = db(); const q = queue(d); q.enabled = !q.enabled; store.save(d); res.json({ ok: true, enabled: q.enabled }); });

  // ================= БОТ: база знаний, диалоги, пользователи, промпт =================
  const bot = d => { d.settings.bot = d.settings.bot || { enabled: true, prompt: '', whitelist: [], answerSite: true }; return d.settings.bot; };
  function kbFor(message, limit) {
    const d = db(); const q = new Set(words(message)); if (!q.size) return [];
    return d.botKb.map(k => { const tw = words(k.topic), cw = words(k.content); let s = 0; for (const w of tw) if (q.has(w)) s += 3; for (const w of new Set(cw)) if (q.has(w)) s += 1; return [s, k]; }).filter(v => v[0] > 1).sort((a, b) => b[0] - a[0]).slice(0, limit || 6).map(v => v[1]);
  }
  function botContext(message) {
    const d = db(); const b = bot(d); const kb = kbFor(message, 6);
    let out = ''; if (b.prompt) out += '\nДополнительные указания администратора: ' + b.prompt.slice(0, 4000);
    if (kb.length) { let total = 0; out += '\nБаза знаний компании (используй в первую очередь, это проверенные ответы):\n' + kb.map(k => { const t = `• ${k.topic}: ${String(k.content).slice(0, 1500)}`; total += t.length; return total < 6500 ? t : ''; }).filter(Boolean).join('\n'); }
    return out;
  }
  function botLog(e) { const d = db(); d.botLog.unshift({ id: newId(5), at: now(), ...e, q: str(e.q, 4000), a: String(e.a || '').slice(0, 8000) }); d.botLog = d.botLog.slice(0, 3000); store.save(d); }
  async function telegramMessage(m) {
    // ответ бота в Telegram: белый список, блокировка, база знаний и ИИ. Возвращает текст или '' (не отвечать особо).
    const d = db(); const b = bot(d); const uid = String(m.from && m.from.id || m.chat.id);
    const u = d.botUsers[uid] = d.botUsers[uid] || { user_id: uid, username: (m.from && (m.from.username || m.from.first_name)) || uid, display_name: [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(' '), msg_count: 0 };
    u.msg_count++; u.last_active = now(); store.save(d);
    if (!b.enabled || u.blocked) return '';
    if ((b.whitelist || []).length && !b.whitelist.some(w => String(w.user_id) === uid)) return '';
    const text = String(m.text || '').trim(); const t0 = Date.now(); let a = '';
    const kb = kbFor(text, 4);
    if (ctx.ai && ctx.ai.enabled()) {
      try { a = await ctx.ai.run([{ role: 'system', content: 'Ты — бот логистической компании iomastavka (доставка грузов из Китая и Азии в Россию). Отвечай кратко, по делу, на языке вопроса. Не выдумывай ставки и сроки — предложи оставить заявку на сайте.' + botContext(text) }, { role: 'user', content: text }]); } catch (e) { a = ''; }
    }
    if (!a && kb.length) a = kb[0].content.slice(0, 3500);
    if (!a) return '';
    botLog({ channel: 'telegram', user_id: uid, username: u.display_name || u.username, q: text, a, ms: Date.now() - t0 });
    return a;
  }
  app.get('/api/bot/stats', admin, (req, res) => {
    const d = db(); const td = today(); const yd = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const t = d.botLog.filter(v => String(v.at).slice(0, 10) === td).length, y = d.botLog.filter(v => String(v.at).slice(0, 10) === yd).length;
    const users = Object.values(d.botUsers);
    res.json({ ok: true, msgs_today: t, msgs_delta: y ? Math.round((t - y) / y * 100) : (t ? 100 : 0), active_users: new Set(d.botLog.filter(v => String(v.at).slice(0, 10) === td).map(v => v.user_id || v.visitor || v.username)).size, total_users: users.length, site_today: d.botLog.filter(v => v.channel === 'site' && String(v.at).slice(0, 10) === td).length, kb_count: d.botKb.length, enabled: bot(d).enabled !== false, aiReady: !!(ctx.ai && ctx.ai.enabled()), tgReady: !!(ctx.tg && ctx.tg.ready()), feedback_bad: d.botLog.filter(v => v.rating === 'bad').length });
  });
  app.get('/api/bot/dialogs', admin, (req, res) => {
    const d = db(); let items = d.botLog; if (req.query.channel) items = items.filter(v => v.channel === req.query.channel); if (req.query.rating) items = items.filter(v => v.rating === req.query.rating);
    const limit = Math.min(100, Number(req.query.limit) || 20), offset = Math.max(0, Number(req.query.offset) || 0);
    res.json({ ok: true, total: items.length, pairs: items.slice(offset, offset + limit) });
  });
  app.post('/api/bot/feedback', admin, (req, res) => { const d = db(); const v = d.botLog.find(x => x.id === (req.body && req.body.id)); if (!v) return bad(res, 'Диалог не найден', 404); v.rating = req.body.rating === 'good' ? 'good' : 'bad'; v.comment = str(req.body.comment, 1000); store.save(d); res.json({ ok: true }); });
  app.get('/api/bot/kb', admin, (req, res) => res.json({ ok: true, items: db().botKb }));
  app.post('/api/bot/kb', admin, (req, res) => { const d = db(); const b = req.body || {}; const k = { id: newId(4), topic: str(b.topic, 200), content: str(b.content, 20000), source: ['manual', 'doc', 'ai_feedback'].includes(b.source) ? b.source : 'manual', createdAt: now() }; if (!k.topic || !k.content) return bad(res, 'Укажите тему и содержание'); d.botKb.unshift(k); store.save(d); res.json({ ok: true, item: k }); });
  app.put('/api/bot/kb/:id', admin, (req, res) => { const d = db(); const k = d.botKb.find(v => v.id === req.params.id); if (!k) return bad(res, 'Запись не найдена', 404); const b = req.body || {}; if (b.topic != null) k.topic = str(b.topic, 200) || k.topic; if (b.content != null) k.content = str(b.content, 20000) || k.content; k.updatedAt = now(); store.save(d); res.json({ ok: true, item: k }); });
  app.delete('/api/bot/kb/:id', admin, (req, res) => { const d = db(); const k = d.botKb.find(v => v.id === req.params.id); if (!k) return bad(res, 'Запись не найдена', 404); d.botKb = k.source_doc && req.query.group ? d.botKb.filter(v => v.source_doc !== k.source_doc) : d.botKb.filter(v => v !== k); store.save(d); res.json({ ok: true }); });
  if (upload) app.post('/api/bot/kb/upload', admin, upload.single('file'), (req, res) => {
    const f = req.file; if (!f) return bad(res, 'Выберите файл .txt или .docx'); const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    let text = ''; if (/\.txt$/i.test(name)) text = f.buffer.toString('utf8'); else if (/\.docx$/i.test(name)) text = require('./docparse').docxText(f.buffer); else return bad(res, 'Поддерживаются только .txt и .docx');
    const topic = str(req.body && req.body.topic, 200) || name.replace(/\.\w+$/, '');
    // делим на секции по заголовкам/пустым строкам, ~1500 символов
    const paras = text.replace(/\r/g, '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean); const secs = []; let cur = null;
    for (const p of paras) { const head = p.length < 90 && !/[.!?]$/.test(p) && p.split('\n').length === 1; if (head || !cur || cur.content.length > 1500) { cur = { topic: head ? p : (cur ? cur.topic : topic), content: head ? '' : p }; secs.push(cur); } else cur.content += '\n\n' + p; }
    const d = db(); const at = now(); const items = secs.filter(s => s.content.trim()).slice(0, 300).map(s => ({ id: newId(4), topic: s.topic.slice(0, 200), content: s.content.slice(0, 20000), source: 'doc', source_doc: name.slice(0, 160), createdAt: at }));
    if (!items.length) return bad(res, 'В файле нет текста');
    d.botKb = items.concat(d.botKb); store.save(d); res.json({ ok: true, sections: items.length });
  });
  app.get('/api/bot/whitelist', admin, (req, res) => res.json({ ok: true, users: bot(db()).whitelist || [] }));
  app.post('/api/bot/whitelist', admin, (req, res) => {
    const d = db(); const b = bot(d); const body = req.body || {};
    if (body.remove) b.whitelist = (b.whitelist || []).filter(w => String(w.user_id) !== String(body.remove));
    else { const id = String(body.user_id || '').trim(); if (!/^\d{3,15}$/.test(id)) return bad(res, 'Введите числовой Telegram ID'); b.whitelist = (b.whitelist || []).filter(w => String(w.user_id) !== id).concat({ user_id: id, display_name: str(body.display_name, 80), email: str(body.email, 120), notes: str(body.notes, 500) }); }
    store.save(d); res.json({ ok: true, users: b.whitelist });
  });
  app.get('/api/bot/users', admin, (req, res) => res.json({ ok: true, users: Object.values(db().botUsers).sort((a, b) => String(b.last_active || '').localeCompare(String(a.last_active || ''))) }));
  app.post('/api/bot/users/:uid/:act', admin, (req, res) => { const d = db(); const u = d.botUsers[req.params.uid]; if (!u) return bad(res, 'Пользователь не найден', 404); u.blocked = req.params.act === 'block'; store.save(d); res.json({ ok: true }); });
  app.get('/api/bot/prompt', admin, (req, res) => { const b = bot(db()); res.json({ ok: true, enabled: b.enabled !== false, answerSite: b.answerSite !== false, prompt: b.prompt || '', base: 'Ты AI-ассистент сайта iomastavka — помощник по международной логистике, ВЭД, Китай/Азия → Россия, ставкам, маршрутам, Incoterms, таможне, документам. Отвечает на языке пользователя, не выдумывает ставки и таможенные данные, для свежих фактов ищет в интернете. Ниже к нему добавляются ваши указания и подходящие записи базы знаний.' }); });
  app.put('/api/bot/prompt', admin, (req, res) => { const d = db(); const b = bot(d); const body = req.body || {}; if (body.prompt != null) b.prompt = str(body.prompt, 6000); if (body.enabled != null) b.enabled = !!body.enabled; if (body.answerSite != null) b.answerSite = !!body.answerSite; store.save(d); res.json({ ok: true }); });
  app.post('/api/bot/ai_suggest', admin, async (req, res) => {
    if (!ctx.ai || !ctx.ai.enabled()) return bad(res, 'ИИ не подключён: добавьте OPENAI_API_KEY в Render', 503);
    const b = req.body || {};
    try {
      const out = await ctx.ai.run([{ role: 'user', content: `Пользователь спросил: «${str(b.user_msg, 3000)}». Бот ответил: «${str(b.bot_msg, 4000)}». Замечание менеджера: «${str(b.comment, 1000)}». Напиши улучшенный ответ и запись для базы знаний. Верни ТОЛЬКО JSON: {"improved_answer":"","kb_topic":"","kb_content":""}` }]);
      const j = JSON.parse(String(out).replace(/^```(?:json)?|```$/g, '').trim()); res.json({ ok: true, improved_answer: j.improved_answer || '', kb_topic: j.kb_topic || '', kb_content: j.kb_content || '' });
    } catch (e) { bad(res, 'ИИ не ответил: ' + e.message, 502); }
  });
  app.post('/api/bot/test', admin, async (req, res) => {
    const text = str(req.body && req.body.message, 2000); if (!text) return bad(res, 'Введите вопрос');
    const kb = kbFor(text, 4); let a = '';
    if (ctx.ai && ctx.ai.enabled()) { try { a = await ctx.ai.run([{ role: 'system', content: 'Ты — бот логистической компании iomastavka. Отвечай кратко.' + botContext(text) }, { role: 'user', content: text }]); } catch (e) { a = ''; } }
    res.json({ ok: true, answer: a || (kb[0] ? kb[0].content.slice(0, 3500) : ''), source: a ? 'ai' : kb[0] ? 'kb' : 'none', kb: kb.map(k => ({ id: k.id, topic: k.topic })) });
  });

  // какие сделки задевает обновление справочника ТН ВЭД (коды из расчётов ВЭД)
  function tnvedAffected(touched) {
    const d = db(), out = [], seen = new Set();
    for (const doc of d.calcDocs) {
      if (!doc.dealId) continue; const deal = d.deals.find(x => x.id === doc.dealId); if (!deal || deal.status === 'deleted') continue;
      for (const it of doc.items || []) { const code = String(it.tnved_code || '').replace(/\D/g, ''); if (!code || !touched.has(code)) continue; const k = deal.id + code; if (seen.has(k)) continue; seen.add(k); out.push({ dealId: deal.id, number: deal.number, deal: deal.title || '', code, what: touched.get(code) }); }
    }
    return out;
  }
  return { tnvedAffected, botContext, botLog, telegramMessage, vedSettings, mailAdd, classify, offOn: (name, date) => offOn(db(), name, date), siteBotEnabled: () => bot(db()).answerSite !== false };
}

module.exports = { setup, HOLIDAYS, expandCn, classify, SECRETS };
