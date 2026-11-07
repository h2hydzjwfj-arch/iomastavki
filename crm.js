'use strict';
// CRM: воронки и этапы, сделки (статусы, архив, история), лента активности, файлы с папками,
// база клиентов (компании, контакты, юрлица, дубли). Логика перенесена из прежней CRM владельца (сделки, лента, файлы, клиенты).
const crypto = require('crypto');

const INCOMING = 'Входящие';
const WON = 'Успешно', LOST = 'Закрыта';
const INCOMING_STAGES = ['Новая заявка', 'Запрос', 'Расчёт', 'Ставка отправлена', 'КП отправлено'];
const DEAL_STAGES = ['Запрос', 'Расчёт', 'Ставка отправлена', 'КП отправлено', 'Клиент на рассмотрении', 'В работе', 'Груз в пути'];
const STAGES = ['Новая заявка', ...DEAL_STAGES, WON, LOST];
const FUNNELS = [INCOMING, 'Наш контракт', 'Контракт клиента', 'Карго'];
const OLD_FUNNELS = { ['Контракт ' + 'West Asia']: 'Наш контракт' }; // прежнее название воронки → новое (сделки и этапы переносятся сами)
const SOURCES = ['Сайт', 'GW', 'Постоянный клиент', 'Рекомендация', 'Почта', 'Telegram', 'Звонок'];
const MODES = { auto: 'Авто', rail: 'ЖД', sea: 'Море', air: 'Авиа', multimodal: 'Мультимодальная' };
const CLOSE_REASONS = ['Дорого', 'Выбрали другого перевозчика', 'Не отвечает', 'Неактуально / отложили', 'Не можем перевезти', 'Дубль заявки', 'Спам', 'Другое'];
const TASK_TYPES = ['Задача', 'Звонок', 'Встреча', 'Письмо', 'Отправить КП', 'Запросить ставку', 'Документы', 'Оплата'];
const ACT_TYPES = { note: 'Комментарий', call: 'Звонок', meet: 'Встреча', tg: 'Telegram', wa: 'WhatsApp', mail: 'Email', lead: 'Заявка', rate: 'Ставка', finance: 'Финансы', calc: 'Калькулятор', file: 'Файл', quote: 'КП', task: 'Задача' };
const CATEGORIES = ['заявка', 'фрахт', 'коммерческое'];
const FIELDS = ['title', 'funnel', 'source', 'stage', 'cargo', 'weight', 'volume', 'places', 'incoterms', 'from', 'to', 'mode', 'contractType', 'broker', 'documents', 'manager', 'amount', 'currency', 'contactName', 'contactPhone', 'contactEmail', 'company', 'clientId', 'crmClientId', 'note', 'category'];
const LABELS = { title: 'Название', funnel: 'Воронка', source: 'Источник', stage: 'Этап', cargo: 'Груз', weight: 'Вес, кг', volume: 'Объём, м³', places: 'Мест', incoterms: 'Инкотермс', from: 'Откуда', to: 'Куда', mode: 'Тип перевозки', contractType: 'Тип договора', broker: 'Брокер', documents: 'Документы', manager: 'Ответственный', amount: 'Сумма', currency: 'Валюта', contactName: 'Контакт', contactPhone: 'Телефон', contactEmail: 'Email', company: 'Компания', clientId: 'Кабинет клиента', crmClientId: 'Клиент', note: 'Описание', category: 'Категория' };
const NUM = ['weight', 'volume', 'places', 'amount'];
const CLIENT_FIELDS = ['company', 'inn', 'contact', 'phone', 'email', 'manager', 'website', 'address', 'notes'];
const ENTITY_FIELDS = ['company_name', 'company_name_short', 'inn', 'kpp', 'ogrn', 'address', 'director_position', 'director_name', 'legal_basis', 'bank_name', 'bik', 'account', 'korr_account', 'phone', 'email'];

// ---------- ZIP без сжатия (скачать папку сделки одним архивом)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), data = f.buf, crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8); h.writeUInt32LE(0, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, name, data);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10); c.writeUInt32LE(0, 12); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, name); off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}

function setup(app, ctx) {
  const { store, admin, upload, str, num, newId } = ctx;
  const hooks = { onCreate: [] };
  let migrated = false;
  function migrate(d) {
    let ch = false;
    for (const x of d.deals) if (OLD_FUNNELS[x.funnel]) { x.funnel = OLD_FUNNELS[x.funnel]; ch = true; }
    const p = d.settings.pipelines; if (p) for (const k of Object.keys(OLD_FUNNELS)) if (p[k]) { if (!p[OLD_FUNNELS[k]]) p[OLD_FUNNELS[k]] = p[k]; delete p[k]; ch = true; }
    return ch;
  }
  const db = () => { const d = store.load(); d.deals = d.deals || []; d.tasks = d.tasks || []; d.settings = d.settings || {}; if (!migrated) { migrated = true; if (migrate(d)) store.save(d); } return d; };
  const now = () => new Date().toISOString();
  const pad = n => String(n).padStart(2, '0');
  const pipelines = () => { const p = (db().settings.pipelines) || {}; const out = {}; for (const f of FUNNELS) out[f] = Array.isArray(p[f]) && p[f].length ? p[f] : (f === INCOMING ? INCOMING_STAGES : DEAL_STAGES); for (const k of Object.keys(p)) if (!out[k] && Array.isArray(p[k]) && p[k].length) out[k] = p[k]; return out; };
  const stagesOf = funnel => pipelines()[funnel] || DEAL_STAGES;
  const statusOf = x => (x.deletedAt ? 'deleted' : x.stage === WON ? 'won' : x.stage === LOST ? 'closed' : 'active');
  const daysIn = x => Math.max(0, Math.floor((Date.now() - Date.parse(x.stageAt || x.createdAt || now())) / 864e5));
  const who = req => (req && req.who && req.who.name) || 'Администратор';
  function nextNumber(d, at) {
    const t = new Date(at); const day = pad(t.getDate()) + pad(t.getMonth() + 1) + String(t.getFullYear()).slice(2);
    const n = d.deals.filter(x => String(x.number || '').startsWith(day + '-')).length + 1;
    return day + '-' + n;
  }
  function clean(field, v) {
    if (NUM.includes(field)) return num(v);
    if (field === 'mode') return MODES[v] ? v : (v === 'road' ? 'auto' : '');
    if (field === 'category') return CATEGORIES.includes(v) ? v : 'заявка';
    return str(v, field === 'note' || field === 'documents' ? 2000 : 200);
  }
  const dealFind = (d, id) => d.deals.find(v => v.id === id);
  const notFound = res => res.status(404).json({ ok: false, error: 'Сделка не найдена' });

  // ---------- клиенты (компании): ключ для поиска совпадений
  const phoneKey = p => { const s = String(p || '').replace(/\D/g, ''); return s.length >= 7 ? s.slice(-10) : ''; };
  function clientsDb(d) {
    if (!Array.isArray(d.crmClients)) {
      // первый запуск: собираем базу из кабинетов и контактов сделок (как раньше показывалось на лету)
      d.crmClients = [];
      for (const u of d.users || []) d.crmClients.push({ id: newId(), company: u.company || '', contact: u.name || '', phone: u.phone || '', email: u.email || '', userId: u.id, contacts: [], entities: [], createdAt: u.createdAt || now() });
      for (const x of d.deals.slice().reverse()) linkClient(d, x, true);
    }
    return d.crmClients;
  }
  function findClientFor(d, src) {
    const list = d.crmClients || []; const e = String(src.email || '').toLowerCase(), p = phoneKey(src.phone), inn = String(src.inn || '').replace(/\D/g, '');
    return (inn && list.find(c => String(c.inn || '').replace(/\D/g, '') === inn)) || (e && list.find(c => String(c.email || '').toLowerCase() === e || (c.contacts || []).some(k => String(k.email || '').toLowerCase() === e)))
      || (p && list.find(c => phoneKey(c.phone) === p || (c.contacts || []).some(k => phoneKey(k.phone) === p))) || null;
  }
  function linkClient(d, x, silent) {
    if (x.crmClientId && (d.crmClients || []).some(c => c.id === x.crmClientId)) return;
    const u = x.clientId && (d.users || []).find(v => v.id === x.clientId);
    const src = u ? { email: u.email, phone: u.phone, company: u.company, contact: u.name } : { email: x.contactEmail, phone: x.contactPhone, company: x.company, contact: x.contactName };
    if (!src.email && !phoneKey(src.phone) && !src.contact && !src.company) return;
    let c = findClientFor(d, src);
    if (!c && !src.email && !phoneKey(src.phone)) c = (d.crmClients || []).find(k => (src.company && k.company && k.company.toLowerCase() === String(src.company).toLowerCase()) || (!src.company && src.contact && !k.company && String(k.contact || '').toLowerCase() === String(src.contact).toLowerCase()));
    if (!c) { c = { id: newId(), company: src.company || '', contact: src.contact || '', phone: src.phone || '', email: src.email || '', manager: x.manager || '', contacts: [], entities: [], createdAt: x.createdAt || now() }; if (u) c.userId = u.id; d.crmClients.push(c); }
    else for (const [k, v] of [['company', src.company], ['contact', src.contact], ['phone', src.phone], ['email', src.email]]) if (!c[k] && v) c[k] = v;
    x.crmClientId = c.id;
  }
  function clientView(d, c) {
    const deals = d.deals.filter(x => x.crmClientId === c.id && !x.deletedAt);
    const quotes = c.userId ? (d.quotes || []).filter(q => q.ownerUid === c.userId).length : 0;
    const times = [c.createdAt, ...deals.map(x => x.updatedAt || x.createdAt)].filter(Boolean).sort();
    const open = deals.filter(x => statusOf(x) === 'active').length;
    const lastAt = times[times.length - 1] || null;
    return { ...c, name: c.contact || c.company, key: c.email || c.phone || c.contact || c.company, deals: deals.length, open, won: deals.filter(x => x.stage === WON).length, quotes, cabinet: !!c.userId, firstAt: c.createdAt || times[0] || null, lastAt, current: open > 0 || (lastAt && Date.parse(lastAt) >= Date.now() - 120 * 864e5) };
  }

  function create(src, by) {
    const d = db(); const at = src.createdAt || now();
    const deal = { id: newId(), number: src.number ? str(src.number, 40) : nextNumber(d, at), createdAt: at, updatedAt: at, stageAt: at, activity: [], files: [], folders: [] };
    for (const f of FIELDS) if (src[f] != null && src[f] !== '') deal[f] = clean(f, src[f]);
    deal.funnel = OLD_FUNNELS[deal.funnel] || deal.funnel || INCOMING; deal.source = deal.source || 'Сайт';
    const st = stagesOf(deal.funnel);
    deal.stage = deal.stage && (st.includes(deal.stage) || deal.stage === WON || deal.stage === LOST) ? deal.stage : (deal.stage || st[0]);
    if (deal.stage === WON || deal.stage === LOST) deal.closedAt = at;
    if (!deal.title) { const t = new Date(at); deal.title = (deal.cargo || 'Заявка') + ' ' + String(t.getFullYear()).slice(2) + pad(t.getMonth() + 1) + pad(t.getDate()); }
    for (const k of ['leadId', 'quoteId', 'imported', 'createdVia']) if (src[k]) deal[k] = src[k];
    deal.createdVia = deal.createdVia || (src.leadId ? 'site' : src.imported ? 'import' : 'manual');
    if (src.activityText) deal.activity.push({ id: newId(4), at, type: src.activityType || 'lead', by: by || 'Сайт', text: str(src.activityText, 8000) });
    clientsDb(d); linkClient(d, deal);
    for (const h of hooks.onCreate) { try { h(deal, d); } catch (e) { console.error('deal hook', e.message); } }
    d.deals.unshift(deal); d.deals = d.deals.slice(0, 20000); store.save(d);
    return deal;
  }
  function brief(d, x) {
    const c = x.crmClientId && (d.crmClients || []).find(v => v.id === x.crmClientId);
    const tasks = d.tasks.filter(t => t.dealId === x.id && t.status !== 'done'); const today = now().slice(0, 10);
    return { ...x, activity: undefined, folders: undefined, finance: undefined, files: (x.files || []).length, notes: (x.activity || []).length, status: statusOf(x), daysInStage: daysIn(x), clientName: c ? (c.company || c.contact) : (x.company || x.contactName || ''), clientContact: c ? c.contact : x.contactName, tasksOpen: tasks.length, tasksOverdue: tasks.filter(t => t.deadline && t.deadline < today).length, margin: x.financeTotals ? x.financeTotals.margin : null };
  }
  function list(q) {
    const d = db(); let items = d.deals;
    const s = String(q.q || '').trim().toLowerCase(), digits = s.replace(/\D/g, '');
    const status = q.status || (q.open === '1' ? 'active' : q.open === '0' ? 'all' : '');
    if (s) items = items.filter(x => [x.title, x.number, x.contactName, x.company, x.contactEmail, x.cargo, x.from, x.to, x.manager].some(v => String(v || '').toLowerCase().includes(s)) || (digits.length >= 4 && String(x.contactPhone || '').replace(/\D/g, '').includes(digits)));
    if (q.funnel) items = items.filter(x => x.funnel === q.funnel);
    if (q.notFunnel && !(s && q.searchAll)) items = items.filter(x => x.funnel !== q.notFunnel);
    if (status && status !== 'all' && !(s && q.searchAll && status === 'active')) items = items.filter(x => statusOf(x) === status);
    else if (!status) items = items.filter(x => !x.deletedAt);
    if (q.stage) { const set = String(q.stage).split('|'); items = items.filter(x => set.includes(x.stage)); }
    if (q.manager) { const set = String(q.manager).split('|'); items = items.filter(x => set.includes(x.manager || '—')); }
    if (q.category) items = items.filter(x => (x.category || 'заявка') === q.category);
    if (q.source) items = items.filter(x => (x.source || '') === q.source);
    if (q.from) items = items.filter(x => String(x.createdAt).slice(0, 10) >= q.from);
    if (q.to) items = items.filter(x => String(x.createdAt).slice(0, 10) <= q.to);
    const sort = q.sort || 'createdAt', dir = q.dir === 'asc' ? 1 : -1;
    const key = x => (sort === 'number' ? String(x.number || '') : sort === 'title' ? String(x.title || '').toLowerCase() : sort === 'stage' ? String(x.stage || '') : String(x[sort] || x.createdAt || ''));
    if (q.sort) items = items.slice().sort((a, b) => (key(a) < key(b) ? -dir : key(a) > key(b) ? dir : 0));
    const total = items.length;
    if (q.page) { const per = Math.min(200, Math.max(10, Number(q.per) || 50)), page = Math.max(1, Number(q.page) || 1); items = items.slice((page - 1) * per, page * per); }
    else items = items.slice(0, 1000);
    return { items: items.map(x => brief(d, x)), total };
  }

  app.get('/api/deals/meta', admin, (req, res) => {
    const d = db(); const uniq = (k, base) => [...new Set(base.concat(d.deals.map(x => x[k]).filter(Boolean)))];
    const staff = (d.settings.staff || []).filter(s => s.active !== false).map(s => s.name);
    res.json({ ok: true, stages: uniq('stage', STAGES), funnels: [...new Set(FUNNELS.concat(Object.keys(pipelines()), d.deals.map(x => x.funnel).filter(Boolean)))], pipelines: pipelines(), incoming: INCOMING, won: WON, lost: LOST,
      sources: uniq('source', SOURCES), modes: MODES, labels: LABELS, closeReasons: CLOSE_REASONS, taskTypes: TASK_TYPES, actTypes: ACT_TYPES, categories: CATEGORIES,
      managers: [...new Set(staff.concat(d.deals.map(x => x.manager).filter(Boolean)))] });
  });
  app.get('/api/deals', admin, (req, res) => res.json({ ok: true, ...list(req.query || {}) }));
  app.post('/api/deals', admin, (req, res) => {
    const b = req.body || {};
    if (!str(b.title, 200) && !str(b.cargo, 200) && !str(b.contactName, 200)) return res.status(400).json({ ok: false, error: 'Укажите название, груз или контакт' });
    const deal = create({ ...b, source: b.source || 'Звонок', createdVia: 'manual', activityText: b.note ? 'Сделка создана вручную.\n' + b.note : 'Сделка создана вручную.', activityType: 'note' }, who(req));
    res.json({ ok: true, item: deal, id: deal.id });
  });
  function full(d, x) {
    const quotes = (d.quotes || []).filter(q => q.dealId === x.id || (x.quoteId && q.id === x.quoteId)).map(q => ({ id: q.id, number: q.number, price: q.price, currency: q.currency, createdAt: q.createdAt, basis: q.basis }));
    const tasks = d.tasks.filter(t => t.dealId === x.id).sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')));
    const c = x.crmClientId && (d.crmClients || []).find(v => v.id === x.crmClientId);
    const calcs = (d.calcDocs || []).filter(v => v.dealId === x.id).map(v => ({ id: v.id, name: v.name, calc_type: v.calc_type }));
    return { item: { ...x, status: statusOf(x), daysInStage: daysIn(x) }, quotes, tasks, client: c ? clientView(d, c) : null, calcs, stages: stagesOf(x.funnel) };
  }
  app.get('/api/deals/:id', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    res.json({ ok: true, ...full(d, x) });
  });
  app.patch('/api/deals/:id', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    const b = { ...(req.body || {}) }; const at = now(); x.activity = x.activity || [];
    if (b.status === 'closed') { b.stage = LOST; x.closeReason = str(b.closeReason || b.close_reason, 120) || 'Другое'; x.closeComment = str(b.closeComment || b.close_comment, 1000); }
    if (b.status === 'won') b.stage = WON;
    if (b.status === 'active' && statusOf(x) !== 'active') b.stage = stagesOf(b.funnel || x.funnel)[0];
    if (OLD_FUNNELS[b.funnel]) b.funnel = OLD_FUNNELS[b.funnel];
    if (b.funnel && b.funnel !== x.funnel) { const st = stagesOf(b.funnel); if (!b.stage || !st.includes(b.stage)) b.stage = st[0]; }
    if (b.crmClientId != null) { clientsDb(d); const c = d.crmClients.find(v => v.id === b.crmClientId); if (b.crmClientId && !c) return res.status(400).json({ ok: false, error: 'Клиент не найден' }); if (c) { for (const [k, v] of [['company', c.company], ['contactName', c.contact], ['contactPhone', c.phone], ['contactEmail', c.email]]) if (v && b[k] == null) b[k] = v; } }
    for (const f of FIELDS) if (Object.prototype.hasOwnProperty.call(b, f)) {
      const v = clean(f, b[f]); const old = x[f] == null ? '' : x[f];
      if (String(old) === String(v == null ? '' : v)) continue;
      x[f] = v;
      const show = val => (f === 'mode' ? (MODES[val] || val) : f === 'crmClientId' ? ((d.crmClients || []).find(c => c.id === val) || {}).company || ((d.crmClients || []).find(c => c.id === val) || {}).contact || '' : val);
      x.activity.push({ id: newId(4), at, type: 'field', by: who(req), field: f, from: show(old), to: show(v) });
      if (f === 'stage') x.stageAt = at;
    }
    if ([WON, LOST].includes(x.stage) && !x.closedAt) x.closedAt = at;
    if (![WON, LOST].includes(x.stage)) { delete x.closedAt; if (x.stage !== LOST) { delete x.closeReason; delete x.closeComment; } }
    if (b.status === 'closed' && x.closeReason) x.activity.push({ id: newId(4), at, type: 'note', by: who(req), text: 'Сделка закрыта. Причина: ' + x.closeReason + (x.closeComment ? '\n' + x.closeComment : '') });
    x.updatedAt = at; store.save(d); res.json({ ok: true, item: { ...x, status: statusOf(x) } });
  });
  // в архив (восстановление — POST /restore), навсегда — DELETE /permanent
  app.delete('/api/deals/:id', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    x.deletedAt = now(); x.updatedAt = x.deletedAt; store.save(d); res.json({ ok: true, archived: true });
  });
  app.post('/api/deals/:id/restore', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    delete x.deletedAt; x.updatedAt = now(); store.save(d); res.json({ ok: true });
  });
  app.delete('/api/deals/:id/permanent', admin, async (req, res) => {
    const d = db(); const i = d.deals.findIndex(v => v.id === req.params.id); if (i < 0) return notFound(res);
    const x = d.deals[i];
    for (const f of x.files || []) { try { await store.delDoc('deal-' + x.id, f.id); } catch {} }
    d.deals.splice(i, 1); d.tasks = d.tasks.filter(t => t.dealId !== x.id); d.calcDocs = (d.calcDocs || []).filter(v => v.dealId !== x.id);
    store.save(d); res.json({ ok: true });
  });

  // ---------- лента активности
  app.post('/api/deals/:id/notes', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    const text = str(req.body && req.body.text, 8000); if (!text) return res.status(400).json({ ok: false, error: 'Пустая заметка' });
    const type = ACT_TYPES[req.body.type] && !['field', 'file', 'lead', 'quote', 'task'].includes(req.body.type) ? req.body.type : 'note';
    const a = { id: newId(4), at: now(), type, by: who(req), text };
    if (['finance', 'calc'].includes(req.body.section)) a.section = req.body.section;
    x.activity = x.activity || []; x.activity.push(a); x.updatedAt = now(); store.save(d);
    res.json({ ok: true, item: x, activity: a });
  });
  app.patch('/api/deals/:id/notes/:aid', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    const a = (x.activity || []).find(v => v.id === req.params.aid); if (!a) return res.status(404).json({ ok: false, error: 'Запись не найдена' });
    const b = req.body || {};
    if (b.text != null && a.type !== 'field') { const t = str(b.text, 8000); if (!t) return res.status(400).json({ ok: false, error: 'Пустой текст' }); a.text = t; a.editedAt = now(); }
    if (b.pinned != null) a.pinned = !!b.pinned;
    store.save(d); res.json({ ok: true, activity: a });
  });
  app.delete('/api/deals/:id/notes/:aid', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    const i = (x.activity || []).findIndex(v => v.id === req.params.aid); if (i < 0) return res.status(404).json({ ok: false, error: 'Запись не найдена' });
    x.activity.splice(i, 1); store.save(d); res.json({ ok: true });
  });

  // ---------- файлы и папки сделки
  async function attach(deal, file, folderId) {
    const fid = newId(6);
    await store.putDoc('deal-' + deal.id, fid, file.buf, file.mime);
    deal.files = deal.files || []; const f = { id: fid, name: str(file.name, 160), size: file.buf.length, type: file.mime || '', at: now() };
    if (folderId && (deal.folders || []).some(v => v.id === folderId)) f.folderId = folderId;
    deal.files.push(f);
    return fid;
  }
  if (upload) app.post('/api/deals/:id/files', admin, upload.single('file'), async (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    const f = req.file; if (!f) return res.status(400).json({ ok: false, error: 'Выберите файл' });
    let fid; try { fid = await attach(x, { buf: f.buffer, mime: f.mimetype, name: Buffer.from(f.originalname, 'latin1').toString('utf8') }, req.body && req.body.folder_id); } catch { return res.status(502).json({ ok: false, error: 'Не удалось сохранить файл' }); }
    const file = x.files.find(v => v.id === fid);
    x.activity.push({ id: newId(4), at: now(), type: 'file', by: who(req), text: file.name, fileId: fid }); x.updatedAt = now(); store.save(d);
    res.json({ ok: true, item: x, file });
  });
  app.get('/api/deals/:id/files/:fid', admin, async (req, res) => {
    const x = dealFind(db(), req.params.id); const f = x && (x.files || []).find(v => v.id === req.params.fid);
    if (!f) return res.status(404).json({ ok: false, error: 'Файл не найден' });
    let buf = null; try { buf = await store.getDoc('deal-' + x.id, f.id); } catch {}
    if (!buf) return res.status(404).json({ ok: false, error: 'Файл не найден в хранилище' });
    res.set('Content-Type', f.type || 'application/octet-stream');
    res.set('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.name)}`);
    res.set('X-Content-Type-Options', 'nosniff'); res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
    res.send(buf);
  });
  app.patch('/api/deals/:id/files/:fid', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); const f = x && (x.files || []).find(v => v.id === req.params.fid);
    if (!f) return res.status(404).json({ ok: false, error: 'Файл не найден' });
    const b = req.body || {};
    if (b.name != null) { const nm = str(b.name, 160); if (!nm) return res.status(400).json({ ok: false, error: 'Пустое название' }); f.name = nm; }
    if (b.folderId !== undefined) { if (!b.folderId) delete f.folderId; else if ((x.folders || []).some(v => v.id === b.folderId)) f.folderId = b.folderId; else return res.status(400).json({ ok: false, error: 'Папка не найдена' }); }
    store.save(d); res.json({ ok: true, file: f });
  });
  app.delete('/api/deals/:id/files/:fid', admin, async (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); const i = x ? (x.files || []).findIndex(v => v.id === req.params.fid) : -1;
    if (i < 0) return res.status(404).json({ ok: false, error: 'Файл не найден' });
    const [f] = x.files.splice(i, 1); try { await store.delDoc('deal-' + x.id, f.id); } catch {}
    store.save(d); res.json({ ok: true });
  });
  const subFolders = (x, id) => { const out = [id]; for (let k = 0; k < out.length; k++) for (const fo of x.folders || []) if (fo.parentId === out[k]) out.push(fo.id); return out; };
  app.post('/api/deals/:id/folders', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x) return notFound(res);
    const name = str(req.body && req.body.name, 120); if (!name) return res.status(400).json({ ok: false, error: 'Название папки' });
    x.folders = x.folders || []; const fo = { id: newId(5), name, at: now() }; const p = req.body.parentId; if (p && x.folders.some(v => v.id === p)) fo.parentId = p;
    x.folders.push(fo); store.save(d); res.json({ ok: true, folder: fo });
  });
  app.patch('/api/deals/:id/folders/:fo', admin, (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); const fo = x && (x.folders || []).find(v => v.id === req.params.fo);
    if (!fo) return res.status(404).json({ ok: false, error: 'Папка не найдена' });
    const b = req.body || {};
    if (b.name != null) { const nm = str(b.name, 120); if (!nm) return res.status(400).json({ ok: false, error: 'Пустое название' }); fo.name = nm; }
    if (b.parentId !== undefined) { if (!b.parentId) delete fo.parentId; else { if (subFolders(x, fo.id).includes(b.parentId) || !x.folders.some(v => v.id === b.parentId)) return res.status(400).json({ ok: false, error: 'Нельзя переместить папку в саму себя' }); fo.parentId = b.parentId; } }
    store.save(d); res.json({ ok: true, folder: fo });
  });
  app.delete('/api/deals/:id/folders/:fo', admin, async (req, res) => {
    const d = db(); const x = dealFind(d, req.params.id); if (!x || !(x.folders || []).some(v => v.id === req.params.fo)) return res.status(404).json({ ok: false, error: 'Папка не найдена' });
    const ids = subFolders(x, req.params.fo);
    for (const f of (x.files || []).filter(v => ids.includes(v.folderId))) { try { await store.delDoc('deal-' + x.id, f.id); } catch {} }
    x.files = (x.files || []).filter(v => !ids.includes(v.folderId)); x.folders = x.folders.filter(v => !ids.includes(v.id));
    store.save(d); res.json({ ok: true });
  });
  app.get('/api/deals/:id/folders/:fo/zip', admin, async (req, res) => {
    const x = dealFind(db(), req.params.id); const fo = x && (x.folders || []).find(v => v.id === req.params.fo);
    if (!fo) return res.status(404).json({ ok: false, error: 'Папка не найдена' });
    const pathOf = id => { const parts = []; let cur = (x.folders || []).find(v => v.id === id); while (cur && cur.id !== fo.id) { parts.unshift(cur.name); cur = (x.folders || []).find(v => v.id === cur.parentId); } return parts.join('/'); };
    const ids = subFolders(x, fo.id), files = [];
    for (const f of (x.files || []).filter(v => ids.includes(v.folderId))) { let buf = null; try { buf = await store.getDoc('deal-' + x.id, f.id); } catch {} if (buf) { const p = pathOf(f.folderId); files.push({ name: (p ? p + '/' : '') + f.name, buf }); } }
    res.set('Content-Type', 'application/zip'); res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fo.name + '.zip')}`);
    res.send(zipStore(files));
  });

  // ---------- база клиентов
  app.get('/api/crm/clients', admin, (req, res) => {
    const d = db(); const fresh = !Array.isArray(d.crmClients); const list0 = clientsDb(d); if (fresh) store.save(d);
    let items = list0.map(c => clientView(d, c));
    const s = String(req.query.q || '').trim().toLowerCase(), dg = s.replace(/\D/g, '');
    if (s) items = items.filter(c => [c.company, c.contact, c.email, c.phone, c.inn, c.manager, ...(c.contacts || []).map(k => k.name + ' ' + k.email + ' ' + k.phone)].some(v => String(v || '').toLowerCase().includes(s)) || (dg.length >= 4 && [c.phone, c.inn, ...(c.contacts || []).map(k => k.phone)].some(v => String(v || '').replace(/\D/g, '').includes(dg))));
    if (req.query.manager) items = items.filter(c => (c.manager || '') === req.query.manager);
    if (req.query.status === 'current') items = items.filter(c => c.current); else if (req.query.status === 'past') items = items.filter(c => !c.current);
    const t = v => (v ? Date.parse(v) : 0), sort = req.query.sort || 'recent';
    items.sort(sort === 'added' ? (a, b) => t(b.firstAt) - t(a.firstAt) : sort === 'frequency' ? (a, b) => (b.deals + b.quotes) - (a.deals + a.quotes) || t(b.lastAt) - t(a.lastAt) : sort === 'name' ? (a, b) => String(a.company || a.contact).localeCompare(String(b.company || b.contact), 'ru') : (a, b) => t(b.lastAt) - t(a.lastAt));
    const total = items.length;
    if (req.query.page) { const per = Math.min(200, Math.max(10, Number(req.query.per) || 50)), page = Math.max(1, Number(req.query.page) || 1); items = items.slice((page - 1) * per, page * per); }
    res.json({ ok: true, items, total });
  });
  function clientBody(b, c) { for (const f of CLIENT_FIELDS) if (b[f] != null) c[f] = str(b[f], f === 'notes' ? 2000 : 200); if (b.inn != null) c.inn = String(b.inn).replace(/[^\d]/g, '').slice(0, 12); return c; }
  app.post('/api/crm/clients', admin, (req, res) => {
    const d = db(); clientsDb(d); const b = req.body || {};
    if (!str(b.company) && !str(b.contact)) return res.status(400).json({ ok: false, error: 'Введите название компании или контакт' });
    const c = clientBody(b, { id: newId(), contacts: [], entities: [], createdAt: now() }); d.crmClients.push(c); store.save(d);
    res.json({ ok: true, id: c.id, item: clientView(d, c) });
  });
  const clientFind = (d, id) => clientsDb(d).find(c => c.id === id);
  app.get('/api/crm/clients/duplicates', admin, (req, res) => {
    const d = db(); const list0 = clientsDb(d); const types = String(req.query.types || 'inn,phone,name').split(',');
    const groups = [], used = new Set();
    const add = (type, keyFn) => { const m = new Map(); for (const c of list0) { const k = keyFn(c); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(c); } for (const [k, arr] of m) if (arr.length > 1) { const sig = type + ':' + arr.map(c => c.id).sort().join(','); if (used.has(sig)) continue; used.add(sig); groups.push({ match_type: type, match_value: k, clients: arr.map(c => clientView(d, c)) }); } };
    if (types.includes('inn')) add('inn', c => String(c.inn || '').replace(/\D/g, '').length >= 10 ? String(c.inn).replace(/\D/g, '') : '');
    if (types.includes('phone')) add('phone', c => phoneKey(c.phone));
    if (types.includes('name')) add('name', c => String(c.company || c.contact || '').toLowerCase().replace(/["«»]/g, '').replace(/^(ооо|ип|ао|зао|оао)\s+/, '').trim() || '');
    const q = String(req.query.q || '').trim().toLowerCase(); let singles = [];
    if (q) { const inGroups = new Set(groups.flatMap(g => g.clients.map(c => c.id))); singles = list0.filter(c => !inGroups.has(c.id) && [c.company, c.contact, c.inn, c.phone, c.email].some(v => String(v || '').toLowerCase().includes(q))).slice(0, 30).map(c => clientView(d, c)); }
    res.json({ ok: true, groups, singles });
  });
  app.post('/api/crm/clients/merge', admin, (req, res) => {
    const d = db(); const b = req.body || {}; const p = clientFind(d, b.primary_id); const dups = (b.duplicate_ids || []).map(id => clientFind(d, id)).filter(c => c && c !== p);
    if (!p || !dups.length) return res.status(400).json({ ok: false, error: 'Выберите главную запись и хотя бы один дубль' });
    for (const c of dups) {
      for (const f of CLIENT_FIELDS.concat(['userId'])) if (!p[f] && c[f]) p[f] = c[f];
      p.contacts = (p.contacts || []).concat(c.contacts || []); p.entities = (p.entities || []).concat(c.entities || []);
      if (c.contact && c.contact !== p.contact && !(p.contacts || []).some(k => k.name === c.contact)) p.contacts.push({ id: newId(4), name: c.contact, phone: c.phone || '', email: c.email || '', position: '', notes: 'Перенесено при объединении' });
      for (const x of d.deals) if (x.crmClientId === c.id) x.crmClientId = p.id;
      if (Date.parse(c.createdAt) < Date.parse(p.createdAt)) p.createdAt = c.createdAt;
    }
    d.crmClients = d.crmClients.filter(c => !dups.includes(c));
    d.settings.mergeLog = [{ at: now(), primary: p.id, merged: dups.map(c => ({ id: c.id, company: c.company, contact: c.contact })) }].concat(d.settings.mergeLog || []).slice(0, 200);
    store.save(d); res.json({ ok: true, item: clientView(d, p) });
  });
  app.get('/api/crm/clients/:id', admin, (req, res) => {
    const d = db(); const c = clientFind(d, req.params.id); if (!c) return res.status(404).json({ ok: false, error: 'Клиент не найден' });
    const deals = d.deals.filter(x => x.crmClientId === c.id).map(x => brief(d, x));
    res.json({ ok: true, item: clientView(d, c), deals });
  });
  app.patch('/api/crm/clients/:id', admin, (req, res) => {
    const d = db(); const c = clientFind(d, req.params.id); if (!c) return res.status(404).json({ ok: false, error: 'Клиент не найден' });
    clientBody(req.body || {}, c); c.updatedAt = now(); store.save(d); res.json({ ok: true, item: clientView(d, c) });
  });
  app.delete('/api/crm/clients/:id', admin, (req, res) => {
    const d = db(); const i = clientsDb(d).findIndex(c => c.id === req.params.id); if (i < 0) return res.status(404).json({ ok: false, error: 'Клиент не найден' });
    const [c] = d.crmClients.splice(i, 1); for (const x of d.deals) if (x.crmClientId === c.id) delete x.crmClientId;
    store.save(d); res.json({ ok: true });
  });
  // контактные лица и юрлица клиента
  for (const [kind, fields] of [['contacts', ['name', 'position', 'phone', 'email', 'notes']], ['entities', ENTITY_FIELDS]]) {
    app.post(`/api/crm/clients/:id/${kind}`, admin, (req, res) => {
      const d = db(); const c = clientFind(d, req.params.id); if (!c) return res.status(404).json({ ok: false, error: 'Клиент не найден' });
      const b = req.body || {}; const o = { id: newId(4) }; for (const f of fields) if (b[f] != null) o[f] = str(b[f], 300);
      if (kind === 'contacts' && !o.name) return res.status(400).json({ ok: false, error: 'Введите имя контакта' });
      if (kind === 'entities' && !o.company_name && !o.company_name_short) return res.status(400).json({ ok: false, error: 'Введите название компании' });
      c[kind] = c[kind] || []; if (!c[kind].length) o[kind === 'contacts' ? 'primary' : 'is_default'] = true; c[kind].push(o); store.save(d); res.json({ ok: true, item: o });
    });
    app.patch(`/api/crm/clients/:id/${kind}/:sid`, admin, (req, res) => {
      const d = db(); const c = clientFind(d, req.params.id); const o = c && (c[kind] || []).find(v => v.id === req.params.sid); if (!o) return res.status(404).json({ ok: false, error: 'Не найдено' });
      const b = req.body || {}; for (const f of fields) if (b[f] != null) o[f] = str(b[f], 300);
      const flag = kind === 'contacts' ? 'primary' : 'is_default'; if (b.set_primary || b.set_default) for (const v of c[kind]) v[flag] = v === o;
      store.save(d); res.json({ ok: true, item: o });
    });
    app.delete(`/api/crm/clients/:id/${kind}/:sid`, admin, (req, res) => {
      const d = db(); const c = clientFind(d, req.params.id); if (!c) return res.status(404).json({ ok: false, error: 'Не найдено' });
      c[kind] = (c[kind] || []).filter(v => v.id !== req.params.sid); store.save(d); res.json({ ok: true });
    });
  }

  // ---------- импорт из прежней CRM (Excel или CSV)
  const HEAD = { number: /^(№|номер|number)/i, title: /^(название|сделка|title)/i, source: /^(источник|source)/i, funnel: /^(воронка|funnel)/i, contactName: /^(контакт|клиент|contact|имя)/i, company: /^(компания|company|организация)/i, contactPhone: /^(телефон|phone|тел)/i, contactEmail: /^(e-?mail|почта)/i, stage: /^(этап|статус|stage)/i, mode: /^(тип перевозки|транспорт|вид транспорта)/i, manager: /^(менеджер|ответственный|manager)/i, createdAt: /^(создана|дата|created)/i, cargo: /^(груз|товар|cargo)/i, weight: /^(вес|weight)/i, volume: /^(объ[её]м|volume)/i, from: /^(откуда|from)/i, to: /^(куда|to)$/i, incoterms: /^(инкотермс|incoterms|условия)/i, amount: /^(сумма|бюджет|amount)/i };
  const MODE_BY_NAME = { 'авто': 'auto', 'жд': 'rail', 'ж/д': 'rail', 'море': 'sea', 'авиа': 'air', 'море + жд': 'multimodal', 'мультимодальная': 'multimodal' };
  function parseDate(v) {
    const s = String(v || '').trim(); let m;
    if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/))) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(Date.UTC(y, +m[2] - 1, +m[1], 9)).toISOString(); }
    if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + Math.round(parseFloat(s) * 864e5)).toISOString(); // дата Excel
    const t = Date.parse(s); return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  function importRows(rows) {
    if (!rows.length) return { added: 0, skipped: 0 };
    let hi = rows.findIndex(r => r.filter(c => Object.values(HEAD).some(rx => rx.test(String(c || '').trim()))).length >= 3);
    if (hi < 0) throw new Error('Не нашёл строку с заголовками: нужны колонки вроде «Название», «Контакт», «Этап», «Создана»');
    const map = rows[hi].map(h => { const k = Object.keys(HEAD).find(f => HEAD[f].test(String(h || '').trim())); return k || null; });
    const d = db(); const have = new Set(d.deals.map(x => x.number).filter(Boolean));
    let added = 0, skipped = 0;
    for (const r of rows.slice(hi + 1)) {
      const o = {}; map.forEach((k, i) => { if (k && r[i] != null && String(r[i]).trim() !== '') o[k] = String(r[i]).trim(); });
      if (!o.title && !o.contactName && !o.cargo) { skipped++; continue; }
      if (o.number) { o.number = o.number.replace(/^№\s*/, ''); if (have.has(o.number)) { skipped++; continue; } have.add(o.number); }
      if (o.mode) o.mode = MODE_BY_NAME[o.mode.toLowerCase()] || '';
      if (o.createdAt) o.createdAt = parseDate(o.createdAt) || undefined;
      for (const k of ['weight', 'volume', 'amount']) if (o[k]) o[k] = String(o[k]).replace(/\s/g, '').replace(',', '.');
      create({ ...o, imported: true, activityText: 'Импортировано из прежней CRM.', activityType: 'note' }, 'Импорт');
      added++;
    }
    return { added, skipped };
  }
  function csvRows(text) {
    const delim = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  if (upload) app.post('/api/deals/import', admin, upload.single('file'), (req, res) => {
    const f = req.file; if (!f) return res.status(400).json({ ok: false, error: 'Выберите файл Excel или CSV' });
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8').toLowerCase();
    try {
      const rows = name.endsWith('.xlsx') ? require('./docparse').xlsxRows(f.buffer) : name.endsWith('.csv') || name.endsWith('.txt') ? csvRows(f.buffer.toString('utf8').replace(/^﻿/, '')) : null;
      if (!rows) return res.status(400).json({ ok: false, error: 'Поддерживаются .xlsx и .csv' });
      res.json({ ok: true, ...importRows(rows) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  return { create, attach, hooks, statusOf, stagesOf, pipelines, brief, clientsDb, STAGES, FUNNELS, INCOMING, WON, LOST, TASK_TYPES, ACT_TYPES };
}

module.exports = { setup, STAGES, FUNNELS, SOURCES, MODES, INCOMING, WON, LOST, CLOSE_REASONS, TASK_TYPES, ACT_TYPES, zipStore, crc32 };
