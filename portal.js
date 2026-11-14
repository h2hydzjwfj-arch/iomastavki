'use strict';
// IOMASTAVKA — роли (гость / клиент / администратор), заявки, клиенты, грузы и документы.
// Данные хранятся в DATA_DIR/portal.json. На Render подключите постоянный диск (Disk)
// и укажите DATA_DIR=/var/data, иначе файл пропадёт при перезапуске сервиса.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATUSES = ['new', 'pickup', 'transit', 'border', 'customs', 'delivery', 'done'];
// Этапы перевозки для трекинга (полоса «Где мой груз»). Набор зависит от транспорта;
// таможня — либо на границе / в порту прибытия (тогда отдельного этапа нет), либо в России.
const TRACK = {
  land: ['wh', 'cn', 'border', 'ru', 'customs', 'delivery'],
  sea: ['wh', 'port_cn', 'sea', 'port_ru', 'ru', 'customs', 'delivery'],
  air: ['wh', 'airport_cn', 'flight', 'airport_ru', 'customs', 'delivery'],
};
const STAGE_RU = { wh: 'На складе в Китае', cn: 'В пути по Китаю', port_cn: 'В порту отправки', sea: 'В море', airport_cn: 'В аэропорту вылета', flight: 'В полёте',
  border: 'На границе', port_ru: 'В порту прибытия', airport_ru: 'В аэропорту прибытия', ru: 'В пути по России', customs: 'На таможне', delivery: 'Доставка до вас', done: 'Доставлен' };
const STAGE_STATUS = { wh: 'pickup', cn: 'transit', port_cn: 'transit', sea: 'transit', airport_cn: 'transit', flight: 'transit', border: 'border', port_ru: 'border', airport_ru: 'border', ru: 'delivery', customs: 'customs', delivery: 'delivery', done: 'done' };
const STATUS_STAGE = { pickup: 'wh', transit: 'cn', border: 'border', customs: 'customs', delivery: 'ru', done: 'done' };
function trackKind(mode) { return mode === 'sea' || mode === 'multimodal' ? 'sea' : mode === 'air' ? 'air' : 'land'; }
function trackStages(s) { const list = TRACK[trackKind(s.mode)]; return s.customsAt === 'border' ? list.filter(k => k !== 'customs') : list.slice(); }
const LEAD_STATUSES = ['new', 'work', 'done', 'spam'];
const MODES = ['auto', 'road', 'rail', 'sea', 'air', 'multimodal', ''];

function str(v, max = 200) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
function num(v) { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null; }
function newId(n = 6) { return crypto.randomBytes(n).toString('hex'); }

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('hex')}$${h.toString('hex')}`;
}
function verifyHash(pw, stored) {
  const p = String(stored || '').split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  try {
    const h = crypto.scryptSync(String(pw), Buffer.from(p[4], 'hex'), 32, { N: Number(p[1]), r: Number(p[2]), p: Number(p[3]), maxmem: 64 * 1024 * 1024 });
    return crypto.timingSafeEqual(h, Buffer.from(p[5], 'hex'));
  } catch { return false; }
}
function tempPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; const b = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) s += abc[b[i] % abc.length];
  return s;
}

function createStore(dataDir, cloud) {
  const file = path.join(dataDir, 'portal.json');
  const docsDir = path.join(dataDir, 'docs');
  const empty = () => ({ users: [], shipments: [], leads: [], quotes: [], settings: {} });
  let cache = null, timer = null, dirty = false;
  function readLocal() { try { const d = JSON.parse(fs.readFileSync(file, 'utf8')); return { ...empty(), ...d }; } catch { return empty(); } }
  function writeLocal(db) {
    try { fs.mkdirSync(dataDir, { recursive: true }); const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 1)); fs.renameSync(tmp, file); }
    catch (e) { if (!cloud) throw e; }
  }
  async function flush() {
    if (!cloud || !dirty) return; dirty = false;
    try { await cloud.put('state/portal.json', Buffer.from(JSON.stringify(cache)), 'application/json'); }
    catch (e) { dirty = true; console.error('portal save', e.message); clearTimeout(timer); timer = setTimeout(flush, 5000); }
  }
  async function init() {
    if (cloud) { const buf = await cloud.get('state/portal.json'); if (buf) { cache = { ...empty(), ...JSON.parse(buf.toString('utf8')) }; writeLocal(cache); return; } }
    cache = readLocal(); if (cloud && (cache.users.length || cache.shipments.length || cache.leads.length)) { dirty = true; await flush(); }
  }
  function load() { if (!cache) cache = readLocal(); return cache; }
  function save(db) { cache = db; writeLocal(db); if (cloud) { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 300); } }
  async function putDoc(shipId, id, buf, mime) {
    if (cloud) return cloud.put(`docs/${shipId}/${id}`, buf, mime || 'application/octet-stream');
    const dir = path.join(docsDir, shipId); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, id), buf);
  }
  async function getDoc(shipId, id) {
    if (cloud) return cloud.get(`docs/${shipId}/${id}`);
    try { return fs.readFileSync(path.join(docsDir, shipId, id)); } catch { return null; }
  }
  async function delDoc(shipId, id) {
    if (cloud) return cloud.del(`docs/${shipId}/${id}`);
    try { fs.unlinkSync(path.join(docsDir, shipId, id)); } catch {}
  }
  return { init, load, save, flush, putDoc, getDoc, delDoc, file, kind: cloud ? 'supabase' : 'local' };
}

// Что видит клиент о своём грузе (без внутренних заметок).
function publicShipment(s) {
  return {
    id: s.id, number: s.number, status: s.status, from: s.from, to: s.to, mode: s.mode,
    stage: s.stage || (s.status && STATUS_STAGE[s.status]) || '', customsAt: s.customsAt || 'inland', crossing: s.crossing || '', whCity: s.whCity || '',
    nowCity: s.nowCity || '', customsPlace: s.customsPlace || '', address: s.address || '', stageAt: s.stageAt || {}, trackNo: s.trackNo || '',
    cargo: s.cargo, weight: s.weight, volume: s.volume, places: s.places, dims: s.dims,
    eta: s.eta, costs: s.costs || [], events: s.events || [],
    docs: (s.docs || []).map(d => ({ id: d.id, name: d.name, size: d.size, uploadedAt: d.uploadedAt })),
    createdAt: s.createdAt, updatedAt: s.updatedAt,
  };
}
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, company: u.company, phone: u.phone, active: u.active !== false, createdAt: u.createdAt }; }

function cleanCosts(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 30).map(c => ({ label: str(c.label, 80), amount: num(c.amount), currency: str(c.currency || 'USD', 5).toUpperCase() }))
    .filter(c => c.label && c.amount != null);
}

function setup(app, opts) {
  const { verifySession, DATA_DIR, upload, rateLimit } = opts;
  const store = opts.store || createStore(DATA_DIR, opts.cloud || null);
  const notify = opts.notify || telegramNotify;

  function session(req) { return verifySession(req.cookies && req.cookies.auth); }
  function roleOf(req) {
    const s = session(req);
    if (!s) return { role: 'guest' };
    if (s.role === 'admin') { const sv = (store.load().settings || {}).adminSv || 0; return (s.sv || 0) === sv ? { role: 'admin', name: s.name || 'Администратор' } : { role: 'guest' }; }
    if (s.role === 'client') {
      const u = store.load().users.find(x => x.id === s.uid && x.active !== false);
      return u && (s.sv || 0) === (u.sv || 0) ? { role: 'client', uid: u.id, name: u.name } : { role: 'guest' };
    }
    return { role: 'guest' };
  }
  const need = role => (req, res, next) => {
    const r = roleOf(req);
    if (r.role === role || r.role === 'admin') { req.who = r; return next(); }
    return res.status(r.role === 'guest' ? 401 : 403).json({ ok: false, error: 'Нет доступа' });
  };
  const admin = need('admin');

  // ---------- журнал для администратора: всё, что вводят на сайте ----------
  const journal = opts.journal || require('./journal').createJournal(DATA_DIR, opts.cloud || null);
  function log(req, type, fields) {
    try {
      const r = roleOf(req), f = { role: r.role };
      if (r.role === 'client') { const u = store.load().users.find(x => x.id === r.uid); if (u) Object.assign(f, { uid: u.id, name: u.name, email: u.email, phone: u.phone, company: u.company }); }
      if (r.role === 'admin') f.name = r.name || 'Администратор';
      const vis = String(req.get('x-ioma-visitor') || ''); if (/^[a-z0-9]{8,32}$/.test(vis)) f.visitor = vis;
      const lang = String(req.get('x-ioma-lang') || ''); if (/^(ru|en|zh|tr)$/.test(lang)) f.lang = lang;
      return journal.add(type, Object.assign(f, fields || {}));
    } catch (e) { console.error('journal', e.message); return null; }
  }
  app.get('/api/journal', admin, async (req, res) => {
    const m = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month) : new Date().toISOString().slice(0, 7);
    const items = (await journal.list(m)).map(journal.view);
    res.json({ ok: true, month: m, months: await journal.monthsList(), columns: journal.COLUMNS, types: journal.TYPES, items });
  });
  app.get('/api/journal/export', admin, async (req, res) => {
    const m = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month) : new Date().toISOString().slice(0, 7);
    let items = await journal.list(m); const t = String(req.query.type || '');
    if (t) { const set = t.split(',').filter(x => journal.TYPES[x]); if (set.length) items = items.filter(x => set.includes(x.type)); }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="iomastavka-journal-${m}.csv"`);
    res.send(journal.csv(items));
  });
  const leadLimiter = rateLimit ? rateLimit({ windowMs: 60 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много заявок. Попробуйте позже.' } }) : (q, s, n) => n();

  app.get('/api/me', (req, res) => { const r = roleOf(req); res.json({ ok: true, role: r.role, name: r.name || '', storage: r.role === 'admin' ? store.kind : undefined }); });

  const crm = require('./crm').setup(app, { store, admin, upload, str, num, newId });
  // CRM, часть 2 (задачи, финансы, калькулятор ВЭД, аналитика, отгулы, компания, безопасность, почта, бот) и справочник ТН ВЭД.
  // mail и tg объявлены ниже — передаём обёртки, которые обращаются к ним в момент вызова.
  const crm2 = require('./crm2').setup(app, { store, admin, upload, str, num, newId, crm, journal, ai: opts.ai,
    rates: opts.rates || (async () => ({ rates: {} })),
    mail: { enabled: () => mail.enabled(), kind: () => mail.kind(), send: (...a) => mail.send(...a) }, tg: { ready: () => tg.ready() } });
  const tnved = require('./tnved').setup(app, { admin, upload, DATA_DIR, cloud: opts.cloud || null, vedSettings: crm2.vedSettings, affected: crm2.tnvedAffected, who: req => roleOf(req).name || 'Администратор', fetchTnved: opts.fetchTnved || null });
  // Проверка кода ТН ВЭД по справочнику alta.ru: дерево позиции, пошлина с суммой в ₽, НДС и таможенный сбор.
  // Тот же расчёт, что в tools/tnved_check.py; на сайте — раздел «ТН ВЭД», в Telegram — команда /tnved.
  const TNV = require('./tnved-check');
  const tnvedDeps = { rates: opts.rates || (async () => ({ rates: {} })), settings: () => crm2.vedSettings(), local: code => tnved.get(code), certPrices: () => crm2.certPrices() };
  // Проверка кода открыта всем (решение владельца): администратору — полный ответ с ценами сертификации,
  // клиентам и гостям — с пометкой «данные примерные» и строже лимит
  const tnvedLimiter = rateLimit ? rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много проверок. Подождите несколько минут.' } }) : (q, s, n) => n();
  const tnvedGuestLimiter = rateLimit ? rateLimit({ windowMs: 10 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false, skip: req => roleOf(req).role === 'admin', message: { ok: false, error: 'Слишком много проверок. Подождите несколько минут или войдите в кабинет.' } }) : (q, s, n) => n();
  const tnvedOut = r => ({ ok: true, code: r.code, report: r.report, url: r.url, levels: r.levels, duty: r.duty, dutyAmount: r.dutyCalc.amount == null ? null : Math.round(r.dutyCalc.amount),
    dutyDetail: r.dutyCalc.detail, missing: r.dutyCalc.missing, vat: r.vat, vatRate: r.vatRate, vatAmount: r.vatAmount, excise: r.excise, value: r.value, fee: r.fee, feeSource: r.feeSource, radio: r.radio,
    permits: r.permits, ratesDate: r.ratesDate });
  app.post('/api/tnved/check', tnvedLimiter, tnvedGuestLimiter, async (req, res) => {
    const b = req.body || {}; const isAdmin = roleOf(req).role === 'admin';
    try { res.json(tnvedOut(await TNV.check({ code: b.code, value: b.value, currency: b.currency, freight: b.freight, weight: b.weight, qty: b.qty }, { ...tnvedDeps, forClient: !isAdmin }))); }
    catch (e) {
      if (e instanceof TNV.TnvedError) return res.status(e.status).json({ ok: false, error: e.message, kind: e.kind });
      console.error('tnved check', e.message); res.status(500).json({ ok: false, error: 'Не удалось проверить код. Попробуйте позже.' });
    }
  });
  const tnvedBotHits = new Map(); // не больше 10 проверок в минуту из одного чата
  const tnvedBotBusy = chat => { const t = Date.now(), a = (tnvedBotHits.get(chat) || []).filter(x => t - x < 60000); a.push(t); tnvedBotHits.set(chat, a); if (tnvedBotHits.size > 2000) tnvedBotHits.delete(tnvedBotHits.keys().next().value); return a.length > 10; };
  // агенты и запросы ставок из сделки (модуль запросов ставок)
  const crm3 = require('./crm3').setup(app, { store, admin, upload, str, newId, ai: opts.ai, rates: opts.rates || (async () => ({ rates: {} })),
    mail: { enabled: () => mail.enabled(), kind: () => mail.kind(), send: (...a) => mail.send(...a) }, who: req => roleOf(req).name || 'Менеджер', publicAgents: opts.agents || null, newCalcDoc: (d, o) => crm2.newCalcDoc(d, o) });
  // после сделки: «Факт», «Мои средства», ЭТрН
  require('./crm4').setup(app, { store, admin, need, upload, str, newId, who: req => roleOf(req).name || 'Менеджер', contractFor: id => crm2.contractFor(id) });
  // робот-помощник администратора: агенты, КП → ставки, груз → сделка, тексты и цвет сайта
  require('./robot').setup(app, { store, admin, upload, str, newId, ai: opts.ai, crm, who: req => roleOf(req).name || 'Администратор', mergeRates: opts.mergeRates || null });
  const splitContact = c => { c = String(c || '').trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? { contactEmail: c } : { contactPhone: c }; };
  function dealFromLead(lead, extraText) {
    const text = ['Новая заявка с сайта', `Имя: ${lead.name}`, `Контакт: ${lead.contact}`, `Маршрут: ${lead.from || '—'} → ${lead.to || '—'}`, lead.cargo ? `Груз: ${lead.cargo}` : '', lead.weight != null ? `Вес: ${lead.weight} кг` : '', lead.volume != null ? `Объём: ${lead.volume} м³` : '', lead.estimate ? `Оценка с сайта: ${lead.estimate}` : '', lead.comment ? `Комментарий: ${lead.comment}` : '', extraText || ''].filter(Boolean).join('\n');
    return crm.create({ contactName: lead.name, ...splitContact(lead.contact), from: lead.from, to: lead.to, cargo: lead.cargo, weight: lead.weight, volume: lead.volume, mode: lead.mode === 'road' ? 'auto' : lead.mode, leadId: lead.id, source: 'Сайт', funnel: 'Входящие', stage: 'Новая заявка', activityText: text, activityType: 'lead' }, 'Сайт');
  }

  // ---------- заявки ----------
  app.post('/api/leads', leadLimiter, async (req, res) => {
    const b = req.body || {};
    if (str(b.website)) return res.json({ ok: true }); // ловушка для ботов
    const lead = {
      id: newId(), createdAt: new Date().toISOString(), status: 'new',
      name: str(b.name, 80), contact: str(b.contact, 120), from: str(b.from, 120), to: str(b.to, 120),
      cargo: str(b.cargo, 200), weight: num(b.weight), volume: num(b.volume), mode: MODES.includes(b.mode) ? b.mode : '',
      comment: str(b.comment, 1000), estimate: str(b.estimate, 120),
    };
    if (!lead.name || !lead.contact) return res.status(400).json({ ok: false, error: 'Укажите имя и телефон или Telegram' });
    if (b.consent !== true) return res.status(400).json({ ok: false, error: 'Нужно согласие на обработку данных' });
    const db = store.load(); db.leads.unshift(lead); db.leads = db.leads.slice(0, 2000); store.save(db);
    try { const deal = dealFromLead(lead); lead.dealId = deal.id; const d2 = store.load(); const l2 = d2.leads.find(x => x.id === lead.id); if (l2) { l2.dealId = deal.id; store.save(d2); } } catch (e) { console.error('deal from lead:', e.message); }
    log(req, 'lead', { name: lead.name, contact: lead.contact, from: lead.from, to: lead.to, cargo: lead.cargo, weight: lead.weight, volume: lead.volume, mode: lead.mode, comment: lead.comment, result: lead.estimate ? 'Оценка с сайта: ' + lead.estimate : '', number: lead.id });
    try { await notify(`Новая заявка с сайта\n${lead.name} · ${lead.contact}\n${lead.from || '—'} → ${lead.to || '—'}\nГруз: ${lead.cargo || '—'}${lead.weight != null ? ', ' + lead.weight + ' кг' : ''}${lead.volume != null ? ', ' + lead.volume + ' м³' : ''}\n${lead.estimate ? 'Оценка: ' + lead.estimate + '\n' : ''}${lead.comment || ''}`); } catch {}
    res.json({ ok: true });
  });
  // ---------- заявка с документами: инвойс, упаковочный лист, фото → разбор и заявка менеджеру с файлами
  const DOC_EXT = /\.(pdf|xlsx|xls|docx|doc|csv|txt|jpe?g|png|webp)$/i;
  const docParse = require('./docparse');
  if (upload) app.post('/api/leads/docs', leadLimiter, upload.array('files', 6), async (req, res) => {
    const b = req.body || {};
    if (str(b.website)) return res.json({ ok: true });
    const files = (req.files || []).map(f => ({ name: Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 160), mime: f.mimetype, buf: f.buffer }));
    if (!files.length) return res.status(400).json({ ok: false, error: 'Прикрепите инвойс, упаковочный лист или фото' });
    const bad = files.find(f => !DOC_EXT.test(f.name)); if (bad) return res.status(400).json({ ok: false, error: `Файл «${bad.name}» не подходит: нужен PDF, Excel, Word или фото` });
    if (files.reduce((a, f) => a + f.buf.length, 0) > 40 * 1024 * 1024) return res.status(400).json({ ok: false, error: 'Слишком большие файлы: до 40 МБ вместе' });
    const lead = { id: newId(), createdAt: new Date().toISOString(), status: 'new', name: str(b.name, 80), contact: str(b.contact, 120), from: str(b.from, 120), to: str(b.to, 120), cargo: str(b.cargo, 200), weight: num(b.weight), volume: num(b.volume), mode: '', comment: str(b.comment, 1000), estimate: '' };
    if (!lead.name || !lead.contact) return res.status(400).json({ ok: false, error: 'Укажите имя и телефон или Telegram' });
    if (b.consent !== 'true' && b.consent !== true) return res.status(400).json({ ok: false, error: 'Нужно согласие на обработку данных' });
    const an = await Promise.race([docParse.analyze(files, opts.ai), new Promise(r => setTimeout(() => r({ ok: false, reason: 'timeout', summary: '' }), 60000))]);
    const t = an.ok && an.data && an.data.totals || {};
    if (lead.weight == null && +t.grossKg) lead.weight = +t.grossKg;
    if (lead.volume == null && +t.volumeM3) lead.volume = +t.volumeM3;
    if (!lead.cargo && an.ok && Array.isArray(an.data.items) && an.data.items.length) lead.cargo = str(an.data.items.map(i => i.name).filter(Boolean).slice(0, 3).join(', '), 200);
    if (!lead.from && an.ok && an.data.loading) lead.from = str(an.data.loading, 120);
    lead.docs = files.map(f => ({ name: f.name, size: f.buf.length }));
    lead.parsed = an.summary || '';
    const db = store.load(); db.leads.unshift(lead); db.leads = db.leads.slice(0, 2000); store.save(db);
    log(req, 'lead_docs', { name: lead.name, contact: lead.contact, from: lead.from, to: lead.to, cargo: lead.cargo, weight: lead.weight, volume: lead.volume, comment: lead.comment, files: lead.docs.map(f => f.name).join(', '), result: lead.parsed || (an.reason === 'ai-off' ? 'Автоматический разбор выключен' : ''), number: lead.id });
    const extra = an.summary ? '\nРаспознано из документов:\n' + an.summary : (an.raw ? '\nСодержимое таблиц (без ИИ):\n' + an.raw.slice(0, 3000) : '');
    let deal = null; try { deal = dealFromLead(lead, extra); for (const f of files) await crm.attach(deal, f); const d2 = store.load(); const x = d2.deals.find(v => v.id === deal.id); if (x) x.files = deal.files; const l2 = d2.leads.find(v => v.id === lead.id); if (l2) l2.dealId = deal.id; store.save(d2); } catch (e) { console.error('docs deal:', e.message); }
    const head = `Новая заявка с документами\n${lead.name} · ${lead.contact}\n${lead.from || '—'} → ${lead.to || '—'}${lead.comment ? '\n' + lead.comment : ''}`;
    const body = head + (an.summary ? '\n\n' + an.summary : an.reason === 'ai-off' ? '\n\nАвтоматический разбор выключен (нет OPENAI_API_KEY) — файлы во вложении.' + (an.raw ? '\n\n' + an.raw.slice(0, 2500) : '') : '\n\nФайлы во вложении.');
    const sent = { telegram: false, email: false };
    try { sent.telegram = await adminTelegramDocs(body, files); } catch {}
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim();
    if (adminEmail && mail.enabled()) { try { await mail.send(adminEmail, `Заявка с документами: ${lead.name}`, body, files.map(f => ({ filename: f.name, content: f.buf }))); sent.email = true; } catch (e) { console.error('docs mail:', e.message); } }
    if (!sent.telegram) { try { await notify(body); } catch {} }
    res.json({ ok: true, summary: an.summary || '', parsed: !!an.ok });
  });
  async function adminTelegramDocs(text, files) {
    const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID; if (!token || !chat) return false;
    const r = await fetch(`${tgBase()}/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true }), signal: AbortSignal.timeout(10000) });
    for (const f of files) { const fd = new FormData(); fd.append('chat_id', chat); fd.append('document', new Blob([f.buf], { type: f.mime || 'application/octet-stream' }), f.name); try { await fetch(`${tgBase()}/bot${token}/sendDocument`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) }); } catch {} }
    return r.ok;
  }
  app.get('/api/leads', admin, (req, res) => res.json({ ok: true, items: store.load().leads }));
  app.patch('/api/leads/:id', admin, (req, res) => {
    const db = store.load(); const l = db.leads.find(x => x.id === req.params.id);
    if (!l) return res.status(404).json({ ok: false, error: 'Заявка не найдена' });
    if (LEAD_STATUSES.includes(req.body?.status)) l.status = req.body.status;
    if (req.body?.note != null) l.note = str(req.body.note, 1000);
    l.updatedAt = new Date().toISOString(); store.save(db); res.json({ ok: true, item: l });
  });

  // ---------- клиенты ----------
  app.get('/api/clients', admin, (req, res) => res.json({ ok: true, items: store.load().users.map(publicUser) }));
  app.post('/api/clients', admin, (req, res) => {
    const b = req.body || {}; const email = str(b.email, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Укажите корректную почту клиента' });
    const db = store.load();
    if (db.users.some(u => u.email === email)) return res.status(409).json({ ok: false, error: 'Клиент с такой почтой уже есть' });
    const password = tempPassword();
    const u = { id: newId(), email, name: str(b.name, 80) || email, company: str(b.company, 120), phone: str(b.phone, 40), hash: hashPassword(password), active: true, createdAt: new Date().toISOString() };
    db.users.push(u); store.save(db);
    res.json({ ok: true, item: publicUser(u), password }); // пароль показывается один раз
  });
  app.post('/api/clients/:id/reset', admin, (req, res) => {
    const db = store.load(); const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ ok: false, error: 'Клиент не найден' });
    const password = tempPassword(); u.hash = hashPassword(password); store.save(db);
    res.json({ ok: true, password });
  });
  app.patch('/api/clients/:id', admin, (req, res) => {
    const db = store.load(); const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ ok: false, error: 'Клиент не найден' });
    const b = req.body || {};
    if (b.name != null) u.name = str(b.name, 80); if (b.company != null) u.company = str(b.company, 120);
    if (b.phone != null) u.phone = str(b.phone, 40); if (typeof b.active === 'boolean') u.active = b.active;
    store.save(db); res.json({ ok: true, item: publicUser(u) });
  });

  // ---------- грузы ----------
  function readShipment(b, s) {
    const out = s || {};
    for (const [k, m] of [['number', 40], ['from', 120], ['to', 120], ['cargo', 200], ['dims', 120], ['eta', 40], ['note', 1000], ['crossing', 80], ['whCity', 80], ['nowCity', 80], ['customsPlace', 120], ['address', 300], ['trackNo', 40]]) if (b[k] != null) out[k] = str(b[k], m);
    if (b.customsAt === 'border' || b.customsAt === 'inland') out.customsAt = b.customsAt;
    for (const k of ['weight', 'volume', 'places']) if (b[k] != null) out[k] = num(b[k]);
    if (b.mode != null && MODES.includes(b.mode)) out.mode = b.mode;
    if (b.costs != null) out.costs = cleanCosts(b.costs);
    return out;
  }
  app.get('/api/shipments', admin, (req, res) => { const db = store.load(); res.json({ ok: true, items: db.shipments.map(s => ({ ...publicShipment(s), clientId: s.clientId, note: s.note || '' })) }); });
  app.post('/api/shipments', admin, (req, res) => {
    const b = req.body || {}; const db = store.load();
    if (!db.users.some(u => u.id === b.clientId)) return res.status(400).json({ ok: false, error: 'Выберите клиента' });
    const now = new Date().toISOString();
    const s = readShipment(b, { id: newId(), clientId: b.clientId, status: 'new', stage: '', stageAt: {}, docs: [], events: [{ status: 'new', note: 'Груз оформлен', date: now }], createdAt: now, updatedAt: now });
    if (b.stage && (trackStages(s).includes(b.stage) || b.stage === 'done')) { s.stage = b.stage; s.status = STAGE_STATUS[b.stage]; s.stageAt[b.stage] = now; s.events.push({ stage: b.stage, status: s.status, note: '', date: now }); }
    if (!s.number) s.number = 'IO-' + now.slice(2, 10).replace(/-/g, '') + '-' + s.id.slice(0, 4).toUpperCase();
    db.shipments.unshift(s); store.save(db);
    const cu = db.users.find(u => u.id === s.clientId);
    log(req, 'ship', { number: s.number, from: s.from, to: s.to, mode: s.mode, cargo: s.cargo, weight: s.weight, volume: s.volume, places: s.places, comment: cu ? 'Клиент: ' + cu.name + ' (' + cu.email + ')' : '' });
    res.json({ ok: true, item: s });
  });
  app.patch('/api/shipments/:id', admin, (req, res) => {
    const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Груз не найден' });
    const b = req.body || {}; const before = { stage: s.stage || STATUS_STAGE[s.status] || '', nowCity: s.nowCity || '' }; readShipment(b, s);
    const now = new Date().toISOString(); s.stageAt = s.stageAt || {}; s.events = s.events || [];
    const valid = trackStages(s).concat(['done']);
    if (b.stage != null && b.stage !== '' && !valid.includes(b.stage)) return res.status(400).json({ ok: false, error: 'Такого этапа нет для этого вида транспорта' });
    const cityNote = st => st === 'ru' && s.nowCity ? `сейчас — ${s.nowCity}` : st === 'border' && s.crossing ? s.crossing : st === 'customs' && s.customsPlace ? s.customsPlace : st === 'delivery' && s.address ? s.address : '';
    if (b.stage && b.stage !== before.stage) {
      s.stage = b.stage; s.status = STAGE_STATUS[b.stage] || s.status; s.stageAt[b.stage] = now;
      const note = [cityNote(b.stage), str(b.eventNote, 300)].filter(Boolean).join('. ');
      s.events.push({ stage: b.stage, status: s.status, note, date: now });
      shipmentNotice(s, `${STAGE_RU[b.stage]}${note ? ': ' + note : ''}`);
      log(req, 'ship_update', { number: s.number, from: s.from, to: s.to, mode: s.mode, result: STAGE_RU[b.stage] + (note ? ': ' + note : '') });
    } else if ((s.stage || before.stage) === 'ru' && s.nowCity && s.nowCity !== before.nowCity) {
      const note = [`сейчас — ${s.nowCity}`, str(b.eventNote, 300)].filter(Boolean).join('. ');
      s.events.push({ stage: 'ru', status: s.status, note, date: now }); shipmentNotice(s, `В пути по России: ${note}`);
      log(req, 'ship_update', { number: s.number, from: s.from, to: s.to, mode: s.mode, result: 'В пути по России: ' + note });
    } else if (STATUSES.includes(b.status) && b.status !== s.status) {
      s.stage = STATUS_STAGE[b.status] || '';
      s.status = b.status; s.events = s.events || [];
      s.events.push({ status: b.status, note: str(b.eventNote, 300), date: new Date().toISOString() });
      shipmentNotice(s, `Новый статус: ${ST_RU[s.status] || s.status}${b.eventNote ? ' — ' + str(b.eventNote, 300) : ''}`);
    } else if (b.eventNote) { s.events = s.events || []; s.events.push({ status: s.status, note: str(b.eventNote, 300), date: new Date().toISOString() }); shipmentNotice(s, str(b.eventNote, 300)); }
    s.updatedAt = new Date().toISOString(); store.save(db); res.json({ ok: true, item: s });
  });
  app.delete('/api/shipments/:id', admin, (req, res) => {
    const db = store.load(); const i = db.shipments.findIndex(x => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ ok: false, error: 'Груз не найден' });
    db.shipments.splice(i, 1); store.save(db); res.json({ ok: true });
  });
  const cabSeen = new Map();
  app.get('/api/my/shipments', need('client'), (req, res) => {
    const last = cabSeen.get(req.who.uid) || 0; if (Date.now() - last > 30 * 60 * 1000) { cabSeen.set(req.who.uid, Date.now()); log(req, 'cabinet', {}); }
    const db = store.load(); res.json({ ok: true, items: db.shipments.filter(s => s.clientId === req.who.uid).map(publicShipment) });
  });

  // ---------- документы ----------
  const ALLOWED = /\.(pdf|jpe?g|png|webp|xlsx?|docx?|csv|txt|zip)$/i;
  if (upload) app.post('/api/shipments/:id/docs', admin, upload.single('file'), async (req, res) => {
    const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Груз не найден' });
    const f = req.file; if (!f) return res.status(400).json({ ok: false, error: 'Файл не получен' });
    const name = str(Buffer.from(f.originalname || 'file', 'latin1').toString('utf8'), 120).replace(/[\\/:*?"<>|]/g, '_') || 'file';
    if (!ALLOWED.test(name)) return res.status(400).json({ ok: false, error: 'Можно загрузить PDF, фото, Excel, Word, CSV, TXT или ZIP' });
    const id = newId(8);
    try { await store.putDoc(s.id, id, f.buffer, f.mimetype); } catch (e) { return res.status(502).json({ ok: false, error: 'Не удалось сохранить файл, попробуйте ещё раз' }); }
    s.docs = s.docs || []; s.docs.push({ id, name, size: f.size, mime: str(f.mimetype, 80), uploadedAt: new Date().toISOString() });
    s.updatedAt = new Date().toISOString(); store.save(db); shipmentNotice(s, `Добавлен документ: ${name}`); res.json({ ok: true, item: s });
  });
  app.get('/api/shipments/:id/docs/:docId', async (req, res) => {
    const who = roleOf(req); const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    if (!s || !(who.role === 'admin' || (who.role === 'client' && s.clientId === who.uid))) return res.status(404).json({ ok: false, error: 'Не найдено' });
    const d = (s.docs || []).find(x => x.id === req.params.docId);
    if (!d || !/^[a-f0-9]{16}$/.test(d.id)) return res.status(404).json({ ok: false, error: 'Не найдено' });
    let buf = null; try { buf = await store.getDoc(s.id, d.id); } catch {}
    if (!buf) return res.status(404).json({ ok: false, error: 'Файл не найден' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(d.name));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buf);
  });
  app.delete('/api/shipments/:id/docs/:docId', admin, async (req, res) => {
    const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    const i = s ? (s.docs || []).findIndex(x => x.id === req.params.docId) : -1;
    if (i < 0) return res.status(404).json({ ok: false, error: 'Не найдено' });
    try { await store.delDoc(s.id, s.docs[i].id); } catch {}
    s.docs.splice(i, 1); store.save(db); res.json({ ok: true });
  });

  // =====================================================================
  //  Аккаунт: смена пароля и логина, «запомнить меня», восстановление
  // =====================================================================
  const tg = opts.tg || telegram();
  const mail = opts.mail || mailer();
  const SITE = String(process.env.SITE_URL || 'https://iomastavki.onrender.com').replace(/\/+$/, '');
  const sha = v => crypto.createHash('sha256').update(String(v)).digest('hex');
  const okPw = pw => typeof pw === 'string' && pw.length >= 8 && pw.length <= 128;

  function adminPasswordOk(pw, envCheck) {
    // ADMIN_PASSWORD в Render — запасной вход: работает всегда, даже если пароль меняли на сайте и забыли.
    const plain = process.env.ADMIN_PASSWORD;
    if (plain && pw && crypto.timingSafeEqual(Buffer.from(sha(pw)), Buffer.from(sha(plain)))) return true;
    const h = store.load().settings && store.load().settings.adminHash;
    return h ? verifyHash(pw, h) : envCheck(pw);
  }
  async function tellUser(u, subject, text) {
    const out = { telegram: false, email: false };
    if (u && u.tgChatId) { try { await tg.send(u.tgChatId, text); out.telegram = true; } catch {} }
    if (u && u.email && mail.enabled()) { try { await mail.send(u.email, subject, text); out.email = true; } catch {} }
    return out;
  }

  app.get('/api/account', (req, res) => {
    const r = roleOf(req);
    if (r.role === 'guest') return res.status(401).json({ ok: false, error: 'Войдите' });
    if (r.role === 'admin') { const st = store.load().settings || {}; return res.json({ ok: true, role: 'admin', name: r.name, storage: store.kind, telegram: !!process.env.TELEGRAM_CHAT_ID, botReady: tg.ready(), mail: mail.enabled(), customPassword: !!st.adminHash }); }
    const u = store.load().users.find(x => x.id === r.uid);
    res.json({ ok: true, role: 'client', ...publicUser(u), telegramLinked: !!u.tgChatId, botReady: tg.ready(), mail: mail.enabled() });
  });
  app.patch('/api/account', (req, res) => {
    const r = roleOf(req); if (r.role !== 'client') return res.status(401).json({ ok: false, error: 'Войдите' });
    const db = store.load(); const u = db.users.find(x => x.id === r.uid); const b = req.body || {};
    if (b.name != null) u.name = str(b.name, 80) || u.name;
    if (b.phone != null) u.phone = str(b.phone, 40);
    if (b.email != null && str(b.email, 120).toLowerCase() !== u.email) {
      const email = str(b.email, 120).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Некорректная почта' });
      if (!verifyHash(String(b.currentPassword || ''), u.hash)) return res.status(403).json({ ok: false, error: 'Для смены логина введите текущий пароль' });
      if (db.users.some(x => x.email === email)) return res.status(409).json({ ok: false, error: 'Эта почта уже занята' });
      u.email = email;
    }
    store.save(db); log(req, 'profile', { name: u.name, email: u.email, phone: u.phone });
    res.json({ ok: true, item: publicUser(u) });
  });
  // envAdminCheck подставляет server.js (пароль из ADMIN_PASSWORD_HASH)
  let envAdminCheck = () => false;
  app.post('/api/account/password', (req, res) => {
    const r = roleOf(req); const b = req.body || {};
    if (!okPw(b.next)) return res.status(400).json({ ok: false, error: 'Новый пароль — от 8 символов' });
    const db = store.load(); db.settings = db.settings || {};
    if (r.role === 'admin') {
      if (!adminPasswordOk(String(b.current || ''), envAdminCheck)) return res.status(403).json({ ok: false, error: 'Текущий пароль неверный' });
      db.settings.adminHash = hashPassword(b.next); store.save(db); return res.json({ ok: true });
    }
    if (r.role !== 'client') return res.status(401).json({ ok: false, error: 'Войдите' });
    const u = db.users.find(x => x.id === r.uid);
    if (!verifyHash(String(b.current || ''), u.hash)) return res.status(403).json({ ok: false, error: 'Текущий пароль неверный' });
    u.hash = hashPassword(b.next); u.pwChangedAt = Date.now(); store.save(db); res.json({ ok: true });
  });
  const forgotLimiter = rateLimit ? rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много попыток. Попробуйте позже.' } }) : (q, s, n) => n();
  // Адрес сайта для ссылок в письмах: тот, с которого пришёл запрос (превью или основной сайт),
  // но только если это наш домен — иначе подставной Host мог бы увести ссылку на чужой сайт.
  function siteOf(req) {
    const host = String(req.get('host') || '').toLowerCase();
    const allowed = /^[a-z0-9-]+\.onrender\.com$/.test(host) || /^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(host) || (SITE && host === SITE.replace(/^https?:\/\//, ''));
    return allowed ? `${req.protocol}://${host}` : SITE;
  }
  function maskEmail(e) { const [u, d] = String(e).split('@'); return d ? (u.slice(0, 2) + '•••@' + d) : e; }
  async function adminTelegram(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chat) return false;
    try { const r = await fetch(`${tgBase()}/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }), signal: AbortSignal.timeout(8000) }); return r.ok; } catch { return false; }
  }
  app.post('/api/password/forgot', forgotLimiter, async (req, res) => {
    const login = str(req.body && (req.body.email || req.body.login), 120).toLowerCase();
    if (!login) return res.status(400).json({ ok: false, error: 'Укажите почту, с которой входите' });
    log(req, 'forgot', { contact: login });
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const site = siteOf(req);
    // --- администратор: ссылка уходит в Telegram-бот (TELEGRAM_CHAT_ID) и на почту ADMIN_EMAIL
    if (login === 'admin' || (adminEmail && login === adminEmail)) {
      const token = crypto.randomBytes(24).toString('base64url');
      const db = store.load(); db.settings = db.settings || {}; db.settings.adminReset = { h: sha(token), exp: Date.now() + 30 * 60 * 1000 }; store.save(db);
      const text = `Восстановление пароля администратора iomastavka.\nНовый пароль можно задать по ссылке (действует 30 минут):\n${site}/#reset=${token}\n\nЕсли это были не вы — ничего не делайте, старый пароль продолжит работать.`;
      const tgOk = await adminTelegram(text);
      let mailOk = false; if (adminEmail && mail.enabled()) { try { await mail.send(adminEmail, 'Восстановление пароля администратора — iomastavka', text); mailOk = true; } catch (e) { console.error('admin reset mail:', e.message); } }
      if (!tgOk && !mailOk) {
        const miss = [!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID ? 'TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID' : 'Telegram не ответил', !adminEmail ? 'ADMIN_EMAIL' : (!mail.enabled() ? 'RESEND_API_KEY (или SMTP_URL)' : 'почтовый сервис не принял письмо')];
        return res.status(503).json({ ok: false, error: `Ссылку некуда отправить: в Render не хватает ${miss.join('; ')}. Запасной вход: добавьте в Render переменную ADMIN_PASSWORD — это и будет пароль администратора.` });
      }
      const where = [tgOk ? 'в Telegram-бот' : '', mailOk ? 'на почту ' + maskEmail(adminEmail) : ''].filter(Boolean).join(' и ');
      return res.json({ ok: true, message: `Ссылка для нового пароля отправлена ${where}. Она действует 30 минут.` });
    }
    // --- клиент
    const db = store.load(); const u = db.users.find(x => x.email === login && x.active !== false);
    if (!u) return res.status(404).json({ ok: false, error: 'Кабинет с такой почтой не найден. Проверьте почту или создайте кабинет.' });
    const token = crypto.randomBytes(24).toString('base64url');
    u.reset = { h: sha(token), exp: Date.now() + 30 * 60 * 1000 }; store.save(db);
    const sent = await tellUser(u, 'Восстановление пароля — iomastavka', `Ссылка для нового пароля (действует 30 минут):\n${site}/#reset=${token}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это сообщение.`);
    if (sent.telegram || sent.email) {
      const where = [sent.telegram ? 'в Telegram' : '', sent.email ? 'на почту ' + maskEmail(u.email) : ''].filter(Boolean).join(' и ');
      return res.json({ ok: true, message: `Ссылка для нового пароля отправлена ${where}. Она действует 30 минут.` });
    }
    try { await notify(`Клиент ${u.name} (${u.email}) просит восстановить пароль. Выдайте новый в разделе «Работа → Клиенты».`); } catch {}
    res.json({ ok: true, message: 'Отправка писем пока не подключена, поэтому запрос передан менеджеру — он пришлёт вам новый пароль.' });
  });
  app.post('/api/password/reset', forgotLimiter, (req, res) => {
    const b = req.body || {}; if (!okPw(b.password)) return res.status(400).json({ ok: false, error: 'Новый пароль — от 8 символов' });
    const db = store.load(); const h = sha(String(b.token || ''));
    const ar = db.settings && db.settings.adminReset;
    if (ar && ar.h === h && ar.exp > Date.now()) { db.settings.adminHash = hashPassword(b.password); delete db.settings.adminReset; store.save(db); return res.json({ ok: true, role: 'admin' }); }
    const u = db.users.find(x => x.reset && x.reset.h === h && x.reset.exp > Date.now());
    if (!u) return res.status(400).json({ ok: false, error: 'Ссылка устарела. Запросите восстановление ещё раз.' });
    u.hash = hashPassword(b.password); delete u.reset; u.pwChangedAt = Date.now(); store.save(db); res.json({ ok: true });
  });

  // =====================================================================
  //  Telegram: привязка клиента к боту и уведомления
  // =====================================================================
  app.post('/api/account/telegram', async (req, res) => {
    const r = roleOf(req); if (r.role !== 'client') return res.status(401).json({ ok: false, error: 'Войдите' });
    if (!tg.ready()) return res.status(503).json({ ok: false, error: 'Telegram-бот ещё не подключён администратором' });
    const db = store.load(); const u = db.users.find(x => x.id === r.uid);
    const code = crypto.randomBytes(12).toString('hex'); u.tgLink = { h: sha(code), exp: Date.now() + 15 * 60 * 1000 }; store.save(db);
    res.json({ ok: true, url: `https://t.me/${await tg.username()}?start=${code}` });
  });
  app.delete('/api/account/telegram', (req, res) => {
    const r = roleOf(req); if (r.role !== 'client') return res.status(401).json({ ok: false, error: 'Войдите' });
    const db = store.load(); const u = db.users.find(x => x.id === r.uid); delete u.tgChatId; store.save(db); res.json({ ok: true });
  });
  app.post('/api/telegram/webhook', async (req, res) => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret || req.get('x-telegram-bot-api-secret-token') !== secret) return res.status(401).end();
    res.json({ ok: true }); // Telegram ждёт быстрый ответ
    // Отправка без исключений: заблокированный бот, сбой сети или 5xx Telegram не роняют процесс.
    const send = (chat, text) => tg.send(chat, text).catch(e => console.warn('telegram send:', String(e.message || e).slice(0, 200)));
    try {
      const m = req.body && req.body.message; if (!m || !m.chat || typeof m.text !== 'string') return;
      const chat = m.chat.id, text = m.text.trim();
      const db = store.load();
      const start = text.match(/^\/start\s+([a-f0-9]{24})$/i);
      if (start) {
        const u = db.users.find(x => x.tgLink && x.tgLink.h === sha(start[1].toLowerCase()) && x.tgLink.exp > Date.now());
        if (!u) return send(chat, 'Ссылка устарела. Откройте «Аккаунт» на сайте и нажмите «Подключить Telegram» ещё раз.');
        u.tgChatId = chat; delete u.tgLink; store.save(db);
        return send(chat, `Готово, ${u.name}! Сюда будут приходить ваши КП, статусы грузов и документы.\nОтключить: /stop`);
      }
      const tnCmd = TNV.parseCommand(text);
      if (tnCmd) {
        const acc = crm2.telegramAccess(m); if (!acc) return;
        if (tnCmd.code.length !== 10) return send(chat, TNV.HELP);
        if (tnvedBotBusy(chat)) return send(chat, 'Слишком много проверок подряд — подождите минуту.');
        const t0 = Date.now(); let ans;
        try { ans = (await TNV.check(tnCmd, tnvedDeps)).report + '\n\nСправочно: ставки зависят от страны происхождения и условий поставки.'; }
        catch (e) { ans = '❌ ' + (e instanceof TNV.TnvedError ? e.message : 'Не удалось проверить код. Попробуйте позже.'); if (!(e instanceof TNV.TnvedError)) console.error('bot tnved', e.message); }
        try { crm2.botLog({ channel: 'telegram', user_id: acc.uid, username: acc.u.display_name || acc.u.username, q: text, a: ans, ms: Date.now() - t0 }); } catch {}
        return send(chat, ans);
      }
      if (!/^\//.test(text)) {
        let ans = null;
        try { ans = await crm2.telegramMessage(m); } catch (e) { console.error('bot', e.message); ans = crm2.botFallback(); }
        if (ans === null) return; // бот выключен, пользователь заблокирован или не в белом списке
        if (ans) return send(chat, ans);
      }
      if (/^\/stop/.test(text)) { const u = db.users.find(x => x.tgChatId === chat); if (u) { delete u.tgChatId; store.save(db); } return send(chat, 'Уведомления отключены.'); }
      return send(chat, `Это бот iomastavka. Чтобы получать КП и статусы грузов, войдите на сайте ${SITE} → «Аккаунт» → «Подключить Telegram».\n\n${TNV.HELP}`);
    } catch (e) { console.error('telegram webhook', e.message); }
  });

  // Кнопка «Проверить уведомления» для администратора: шлёт тестовое сообщение и показывает результат.
  app.post('/api/account/test-notify', admin, async (req, res) => {
    const out = { telegram: { ok: false, info: '' }, bot: { ok: tg.ready(), info: '' }, email: { ok: false, info: '' } };
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!process.env.TELEGRAM_BOT_TOKEN) out.telegram.info = 'Нет TELEGRAM_BOT_TOKEN в Render';
    else if (!chat) out.telegram.info = 'Нет TELEGRAM_CHAT_ID в Render';
    else { try { await tg.send(chat, '✅ Проверка iomastavka: уведомления о заявках работают. ' + new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })); out.telegram = { ok: true, info: 'Сообщение отправлено — проверьте Telegram' }; } catch (e) { out.telegram.info = 'Telegram ответил ошибкой: ' + e.message; } }
    if (tg.ready()) { try { out.bot.info = '@' + (await tg.username()); out.bot.ok = !!out.bot.info.slice(1); } catch (e) { out.bot = { ok: false, info: e.message }; } } else out.bot.info = 'Нет TELEGRAM_BOT_TOKEN';
    if (!process.env.TELEGRAM_WEBHOOK_SECRET) { out.bot.ok = false; out.bot.info += ' · нет TELEGRAM_WEBHOOK_SECRET — клиенты не смогут подключить бота'; }
    const to = str(req.body && req.body.email, 120) || process.env.ADMIN_EMAIL || '';
    if (!mail.enabled()) out.email.info = 'Нет RESEND_API_KEY (или SMTP_URL) в Render';
    else if (!to) out.email.info = 'Укажите почту для проверки';
    else { try { await mail.send(to, 'Проверка iomastavka', 'Письма с сайта работают.'); out.email = { ok: true, info: 'Письмо отправлено на ' + to + (mail.kind ? ' через ' + mail.kind() : '') }; } catch (e) { out.email.info = 'Ошибка почты: ' + e.message; } }
    res.json({ ok: true, ...out });
  });

  // =====================================================================
  //  Коммерческие предложения (КП): считаются на сервере, хранятся, по ссылке
  // =====================================================================
  const engine = opts.engine || (() => null);
  const quoteLimiter = rateLimit ? rateLimit({ windowMs: 60 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много расчётов. Попробуйте позже.' } }) : (q, s, n) => n();
  const MODE_RU = { road: 'Авто', auto: 'Авто', rail: 'ЖД', sea: 'Море', air: 'Авиа', multimodal: 'Море + ЖД' };
  function publicQuote(q) {
    const { company, notes, source, ownerUid, guestEmail, baseRate, dealId, ...pub } = q; return pub;
  }
  function quoteText(q) {
    return `${q.number} · iomastavka\n${q.from} → ${q.to}${q.mode ? ' · ' + (MODE_RU[q.mode] || q.mode) : ''}\n` +
      `${q.weight != null ? 'Вес ' + q.weight + ' кг' : ''}${q.volume ? ' · объём ' + q.volume + ' м³' : ''}\n` +
      `Ставка: ${Number(q.price).toLocaleString('ru-RU')} ${q.currency}${q.transitDays ? ' · срок ' + q.transitDays + ' дн.' : ''}\n` +
      `Действует до ${new Date(q.validUntil).toLocaleDateString('ru-RU')}. Терминальные расходы в пункте прибытия уточняются.\n${SITE}/#kp=${q.id}`;
  }
  // ---------- сравнение видов транспорта (ориентир) ----------
  const EST = require('./estimate');
  const tariffs = () => EST.mergeTariffs((store.load().settings || {}).tariffs);
  const baseRate = (from, to, mode) => { try { const b = engine({ from, to, mode }); return b && b.mode === mode && (b._score || 0) >= 13 && /container/i.test(b.basis || 'container') ? b : null; } catch { return null; } };
  function runEstimate(b) { return EST.estimate({ from: str(b.from, 120), to: str(b.to, 120), weight: num(b.weight), volume: num(b.volume), places: num(b.places), dangerous: b.dangerous === true || b.dangerous === 'true' || b.dangerous === '1' }, tariffs(), baseRate); }
  const KIND_RU = { air: 'Авиа', ltl_auto: 'Авто, сборный', lcl_rail: 'ЖД, сборный', lcl_sea: 'Море + ЖД, сборный', fcl_rail: "ЖД, контейнер 40'", ftl_auto: 'Авто, машина целиком' };
  app.post('/api/estimate', quoteLimiter, (req, res) => {
    const b = req.body || {}; const r = runEstimate(b);
    const src = { map: 'Карта на главной', calc: 'Калькулятор', home: 'Главная' }[String(b.source || '')] || 'Калькулятор';
    if (!r.ok) { log(req, 'calc', { from: str(b.from, 120), to: str(b.to, 120), weight: num(b.weight), volume: num(b.volume), places: num(b.places), result: 'Не посчитано: ' + (r.error || ''), source: src }); return res.status(400).json(r); }
    const best = r.options.find(o => o.kind === r.recommended) || r.options[0];
    log(req, 'calc', { from: str(b.from, 120), to: str(b.to, 120), weight: r.weight, volume: r.volume, places: num(b.places), dangerous: !!r.dangerous,
      mode: best && best.mode, option: best && KIND_RU[best.kind], price: best && best.price, currency: 'USD', days: best && best.days.join('–'),
      result: r.options.map(o => `${KIND_RU[o.kind] || o.kind}: ${o.price} $ (${o.days.join('–')} дн.)`).join('; '), source: src });
    res.json(r);
  });
  app.get('/api/tariffs', admin, (req, res) => res.json({ ok: true, tariffs: tariffs(), defaults: EST.DEFAULT_TARIFFS }));
  app.put('/api/tariffs', admin, (req, res) => {
    const db = store.load(); db.settings = db.settings || {}; db.settings.tariffs = EST.mergeTariffs(req.body && req.body.tariffs); store.save(db);
    res.json({ ok: true, tariffs: db.settings.tariffs });
  });

  app.post('/api/quotes', quoteLimiter, async (req, res) => {
    const b = req.body || {}; const who = roleOf(req);
    const from = str(b.from, 120), to = str(b.to, 120);
    if (!from || !to) return res.status(400).json({ ok: false, error: 'Укажите откуда и куда' });
    let best = null;
    if (b.kind && EST.KINDS.includes(String(b.kind))) {
      // КП по выбранному варианту из сравнения — цена считается здесь же, на сервере
      const e = runEstimate(b); const o = e.ok && e.options.find(x => x.kind === b.kind);
      if (!o) return res.status(400).json({ ok: false, error: 'Этот вариант не подходит для такого груза — пересчитайте' });
      const NAMES = { air: 'Авиа', ltl_auto: 'Авто, сборный груз', lcl_rail: 'ЖД, сборный груз', lcl_sea: 'Море + ЖД, сборный груз', fcl_rail: 'ЖД, контейнер 40\'', ftl_auto: 'Авто, машина целиком' };
      best = { rate: o.price, currency: 'USD', mode: o.mode, transitDays: o.days.join('–'), basis: NAMES[o.kind], container: o.kind === 'fcl_rail' ? '40HC' : '', company: o.source === 'base' ? 'база ставок' : 'ориентир по рынку', notes: [o.note, e.assumedVolume ? 'Объём не указан — принят ~1 м³ на 250 кг.' : '', e.dangerous ? 'Опасный груз — с надбавкой.' : ''].filter(Boolean).join(' '), _noCommission: true };
    } else best = await engine({ from, to, mode: str(b.mode, 20), distance: num(b.distance) });
    if (!best || !Number.isFinite(Number(best.rate))) return res.status(404).json({ ok: false, error: 'В базе нет ставки для этого маршрута — оставьте заявку, посчитаем вручную' });
    const now = Date.now(); const id = newId(8);
    const chinese = !best._noCommission && /中国|china|chinese|\.cn$/i.test(`${best.company || ''} ${best.source || ''} ${best.notes || ''}`);
    const base = Number(best.rate), commission = chinese ? Math.round(base * 0.05 * 100) / 100 : 0;
    const q = {
      id, number: 'КП-' + new Date(now).toISOString().slice(2, 10).replace(/-/g, '') + '-' + id.slice(0, 4).toUpperCase(),
      createdAt: new Date(now).toISOString(), validUntil: new Date(now + 7 * 864e5).toISOString(),
      from, to, mode: best.mode || str(b.mode, 20), weight: num(b.weight), volume: num(b.volume), places: num(b.places), incoterms: str(b.incoterms, 10),
      price: Math.round((base + commission) * 100) / 100, baseRate: base, commission, currency: str(best.currency || 'USD', 5).toUpperCase(),
      transitDays: str(best.transitDays, 20), basis: str(best.basis, 40), container: str(best.container, 40),
      company: str(best.company, 120), notes: str(best.notes, 600), ownerUid: who.role === 'client' ? who.uid : null,
    };
    const db = store.load(); db.quotes = db.quotes || []; db.quotes.unshift(q); db.quotes = db.quotes.slice(0, 5000);
    if (who.role === 'admin' && b.dealId) { const deal = (db.deals || []).find(x => x.id === str(b.dealId, 40)); if (deal) { q.dealId = deal.id; deal.activity = deal.activity || []; deal.activity.push({ id: newId(4), at: q.createdAt, type: 'quote', by: 'Администратор', text: `${q.number}: ${q.price} ${q.currency}${q.basis ? ' · ' + q.basis : ''}${q.transitDays ? ' · ' + q.transitDays + ' дн.' : ''}` }); deal.updatedAt = q.createdAt; if (['Новая заявка', 'Запрос', 'Расчёт'].includes(deal.stage)) deal.stage = 'КП отправлено'; } }
    let delivered = { telegram: false, email: false };
    if (who.role === 'client') {
      const u = db.users.find(x => x.id === who.uid);
      delivered = await tellUser(u, `${q.number} — коммерческое предложение iomastavka`, quoteText(q));
      try { await notify(`Клиент ${u.name} посчитал ${q.number}: ${q.from} → ${q.to}, ${q.price} ${q.currency}`); } catch {}
    } else if (b.email && mail.enabled() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(b.email, 120))) {
      q.guestEmail = str(b.email, 120).toLowerCase();
      try { await mail.send(q.guestEmail, `${q.number} — расчёт доставки iomastavka`, quoteText(q)); delivered.email = true; } catch {}
    }
    store.save(db);
    log(req, 'quote', { number: q.number, from: q.from, to: q.to, mode: q.mode, weight: q.weight, volume: q.volume, places: q.places, option: q.basis, price: q.price, currency: q.currency, days: q.transitDays, email: q.guestEmail || undefined, result: [delivered.telegram ? 'отправлено в Telegram' : '', delivered.email ? 'отправлено на почту' : ''].filter(Boolean).join(', ') });
    res.json({ ok: true, quote: publicQuote(q), delivered });
  });
  app.get('/api/quotes/:id', (req, res) => {
    if (!/^[a-f0-9]{16}$/.test(req.params.id)) return res.status(404).json({ ok: false, error: 'КП не найдено' });
    const q = (store.load().quotes || []).find(x => x.id === req.params.id);
    if (!q) return res.status(404).json({ ok: false, error: 'КП не найдено' });
    const who = roleOf(req);
    res.json({ ok: true, quote: who.role === 'admin' ? q : publicQuote(q) });
  });
  app.get('/api/my/quotes', need('client'), (req, res) => res.json({ ok: true, items: (store.load().quotes || []).filter(q => q.ownerUid === req.who.uid).slice(0, 200).map(publicQuote) }));
  app.get('/api/quotes', admin, (req, res) => { const db = store.load(); const by = {}; db.users.forEach(u => { by[u.id] = u.name; }); res.json({ ok: true, items: (db.quotes || []).slice(0, 500).map(q => ({ ...q, ownerName: q.ownerUid ? by[q.ownerUid] || 'клиент удалён' : 'гость' })) }); });

  // Клиенту — уведомление при смене статуса и новых документах
  const ST_RU = { new: 'Оформлен', pickup: 'Забран у поставщика', transit: 'В пути', border: 'На границе', customs: 'Таможня', delivery: 'Доставка по РФ', done: 'Доставлен' };
  function shipmentNotice(s, what) {
    const u = store.load().users.find(x => x.id === s.clientId); if (!u) return;
    tellUser(u, `Груз ${s.number}: ${what}`, `Груз ${s.number} (${s.from || '—'} → ${s.to || '—'})\n${what}\n${SITE}/#cabinet`).catch(() => {});
  }


  function findClient(email, password) {
    const u = store.load().users.find(x => x.email === String(email || '').trim().toLowerCase() && x.active !== false);
    if (!u) { hashPassword('timing-equaliser'); return null; }
    return verifyHash(password, u.hash) ? u : null;
  }

  // Самостоятельная регистрация клиента (кабинет создаётся сразу, менеджер получает уведомление).
  async function registerClient(b) {
    const email = str(b.email, 120).toLowerCase(), name = str(b.name, 80), company = str(b.company, 120), phone = str(b.phone, 40);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Укажите корректную почту', status: 400 };
    if (!name) return { error: 'Укажите имя', status: 400 };
    if (!okPw(b.password)) return { error: 'Пароль — от 8 символов', status: 400 };
    const db = store.load();
    if (db.users.some(u => u.email === email)) return { error: 'Кабинет с этой почтой уже есть. Войдите или восстановите пароль.', status: 409 };
    const u = { id: newId(), email, name, company, phone, hash: hashPassword(b.password), active: true, self: true, createdAt: new Date().toISOString() };
    db.users.push(u); store.save(db);
    try { await notify(`Новый клиент зарегистрировался на сайте\n${name} · ${email}${company ? '\n' + company : ''}${phone ? '\n' + phone : ''}`); } catch {}
    return { user: u };
  }
  return { roleOf, need, admin, findClient, registerClient, store, journal, log, crm, crm2, tnved, adminPasswordOk: pw => adminPasswordOk(pw, envAdminCheck), setEnvAdminCheck: f => { envAdminCheck = f; }, tg, mail };
}


// Адрес Telegram API. Подменяется только в автопроверке (тестовый Telegram на localhost).
function tgBase() {
  const b = String(process.env.TELEGRAM_API_BASE || '').replace(/\/+$/, '');
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(b) ? b : 'https://api.telegram.org';
}
function telegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN; let name = process.env.TELEGRAM_BOT_USERNAME || '';
  async function call(method, body) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try { const r = await fetch(`${tgBase()}/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: ctrl.signal }); return r.json(); }
    finally { clearTimeout(t); }
  }
  return {
    ready: () => !!token,
    send: async (chat, text) => { if (!token) throw new Error('no bot'); const r = await call('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), disable_web_page_preview: true }); if (!r.ok) throw new Error(r.description || 'telegram'); },
    username: async () => { if (!name && token) { const r = await call('getMe'); name = r.result && r.result.username || ''; } return name; },
    setWebhook: async (url, secret) => call('setWebhook', { url, secret_token: secret, allowed_updates: ['message'] }),
  };
}
function mailer() {
  // Письма: Resend (RESEND_API_KEY + RESEND_FROM) или любой SMTP (SMTP_URL + MAIL_FROM).
  let tr = null;
  const resendKey = () => process.env.RESEND_API_KEY;
  function transport() {
    if (tr || !process.env.SMTP_URL) return tr;
    try { tr = require('nodemailer').createTransport(process.env.SMTP_URL); } catch (e) { console.error('nodemailer:', e.message); }
    return tr;
  }
  return {
    enabled: () => !!(resendKey() || transport()),
    kind: () => (resendKey() ? 'Resend' : transport() ? 'SMTP' : ''),
    send: async (to, subject, text, attachments) => {
      if (resendKey()) {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
        try {
          const r = await fetch('https://api.resend.com/emails', { method: 'POST', signal: ctrl.signal, headers: { Authorization: 'Bearer ' + resendKey(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: process.env.RESEND_FROM || process.env.MAIL_FROM || 'iomastavka <onboarding@resend.dev>', to: [to], subject, text, ...(attachments && attachments.length ? { attachments: attachments.map(a => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })) } : {}) }) });
          if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200));
          return;
        } finally { clearTimeout(t); }
      }
      const t = transport(); if (!t) throw new Error('mail off');
      await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_FROM, to, subject, text, attachments: (attachments || []).map(a => ({ filename: a.filename, content: a.content })) });
    },
  };
}

async function telegramNotify(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(`${tgBase()}/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true }), signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

module.exports = { setup, createStore, hashPassword, verifyHash, publicShipment, STATUSES, telegram, mailer };
