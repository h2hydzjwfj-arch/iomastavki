'use strict';
// IOMASTAVKA — роли (гость / клиент / администратор), заявки, клиенты, грузы и документы.
// Данные хранятся в DATA_DIR/portal.json. На Render подключите постоянный диск (Disk)
// и укажите DATA_DIR=/var/data, иначе файл пропадёт при перезапуске сервиса.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATUSES = ['new', 'pickup', 'transit', 'border', 'customs', 'delivery', 'done'];
const LEAD_STATUSES = ['new', 'work', 'done', 'spam'];
const MODES = ['auto', 'rail', 'sea', 'air', 'multimodal', ''];

function str(v, max = 200) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
function num(v) { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null; }
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

function createStore(dataDir) {
  const file = path.join(dataDir, 'portal.json');
  const empty = () => ({ users: [], shipments: [], leads: [] });
  function load() {
    try { const d = JSON.parse(fs.readFileSync(file, 'utf8')); return { ...empty(), ...d }; } catch { return empty(); }
  }
  function save(db) {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, file);
  }
  return { load, save, file, docsDir: path.join(dataDir, 'docs') };
}

// Что видит клиент о своём грузе (без внутренних заметок).
function publicShipment(s) {
  return {
    id: s.id, number: s.number, status: s.status, from: s.from, to: s.to, mode: s.mode,
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
  const store = opts.store || createStore(DATA_DIR);
  const notify = opts.notify || telegramNotify;

  function session(req) { return verifySession(req.cookies && req.cookies.auth); }
  function roleOf(req) {
    const s = session(req);
    if (!s) return { role: 'guest' };
    if (s.role === 'admin') return { role: 'admin', name: s.name || 'Администратор' };
    if (s.role === 'client') {
      const u = store.load().users.find(x => x.id === s.uid && x.active !== false);
      return u ? { role: 'client', uid: u.id, name: u.name } : { role: 'guest' };
    }
    return { role: 'guest' };
  }
  const need = role => (req, res, next) => {
    const r = roleOf(req);
    if (r.role === role || r.role === 'admin') { req.who = r; return next(); }
    return res.status(r.role === 'guest' ? 401 : 403).json({ ok: false, error: 'Нет доступа' });
  };
  const admin = need('admin');
  const leadLimiter = rateLimit ? rateLimit({ windowMs: 60 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много заявок. Попробуйте позже.' } }) : (q, s, n) => n();

  app.get('/api/me', (req, res) => { const r = roleOf(req); res.json({ ok: true, role: r.role, name: r.name || '' }); });

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
    try { await notify(`Новая заявка с сайта\n${lead.name} · ${lead.contact}\n${lead.from || '—'} → ${lead.to || '—'}\nГруз: ${lead.cargo || '—'}${lead.weight != null ? ', ' + lead.weight + ' кг' : ''}${lead.volume != null ? ', ' + lead.volume + ' м³' : ''}\n${lead.estimate ? 'Оценка: ' + lead.estimate + '\n' : ''}${lead.comment || ''}`); } catch {}
    res.json({ ok: true });
  });
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
    for (const [k, m] of [['number', 40], ['from', 120], ['to', 120], ['cargo', 200], ['dims', 120], ['eta', 40], ['note', 1000]]) if (b[k] != null) out[k] = str(b[k], m);
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
    const s = readShipment(b, { id: newId(), clientId: b.clientId, status: 'new', docs: [], events: [{ status: 'new', note: 'Груз оформлен', date: now }], createdAt: now, updatedAt: now });
    if (!s.number) s.number = 'IO-' + now.slice(2, 10).replace(/-/g, '') + '-' + s.id.slice(0, 4).toUpperCase();
    db.shipments.unshift(s); store.save(db); res.json({ ok: true, item: s });
  });
  app.patch('/api/shipments/:id', admin, (req, res) => {
    const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Груз не найден' });
    const b = req.body || {}; readShipment(b, s);
    if (STATUSES.includes(b.status) && b.status !== s.status) {
      s.status = b.status; s.events = s.events || [];
      s.events.push({ status: b.status, note: str(b.eventNote, 300), date: new Date().toISOString() });
    } else if (b.eventNote) { s.events = s.events || []; s.events.push({ status: s.status, note: str(b.eventNote, 300), date: new Date().toISOString() }); }
    s.updatedAt = new Date().toISOString(); store.save(db); res.json({ ok: true, item: s });
  });
  app.delete('/api/shipments/:id', admin, (req, res) => {
    const db = store.load(); const i = db.shipments.findIndex(x => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ ok: false, error: 'Груз не найден' });
    db.shipments.splice(i, 1); store.save(db); res.json({ ok: true });
  });
  app.get('/api/my/shipments', need('client'), (req, res) => {
    const db = store.load(); res.json({ ok: true, items: db.shipments.filter(s => s.clientId === req.who.uid).map(publicShipment) });
  });

  // ---------- документы ----------
  const ALLOWED = /\.(pdf|jpe?g|png|webp|xlsx?|docx?|csv|txt|zip)$/i;
  if (upload) app.post('/api/shipments/:id/docs', admin, upload.single('file'), (req, res) => {
    const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Груз не найден' });
    const f = req.file; if (!f) return res.status(400).json({ ok: false, error: 'Файл не получен' });
    const name = str(Buffer.from(f.originalname || 'file', 'latin1').toString('utf8'), 120).replace(/[\\/:*?"<>|]/g, '_') || 'file';
    if (!ALLOWED.test(name)) return res.status(400).json({ ok: false, error: 'Можно загрузить PDF, фото, Excel, Word, CSV, TXT или ZIP' });
    const id = newId(8); const dir = path.join(store.docsDir, s.id); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, id), f.buffer);
    s.docs = s.docs || []; s.docs.push({ id, name, size: f.size, mime: str(f.mimetype, 80), uploadedAt: new Date().toISOString() });
    s.updatedAt = new Date().toISOString(); store.save(db); res.json({ ok: true, item: s });
  });
  app.get('/api/shipments/:id/docs/:docId', (req, res) => {
    const who = roleOf(req); const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    if (!s || !(who.role === 'admin' || (who.role === 'client' && s.clientId === who.uid))) return res.status(404).json({ ok: false, error: 'Не найдено' });
    const d = (s.docs || []).find(x => x.id === req.params.docId);
    if (!d || !/^[a-f0-9]{16}$/.test(d.id)) return res.status(404).json({ ok: false, error: 'Не найдено' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(path.join(store.docsDir, s.id, d.id), d.name);
  });
  app.delete('/api/shipments/:id/docs/:docId', admin, (req, res) => {
    const db = store.load(); const s = db.shipments.find(x => x.id === req.params.id);
    const i = s ? (s.docs || []).findIndex(x => x.id === req.params.docId) : -1;
    if (i < 0) return res.status(404).json({ ok: false, error: 'Не найдено' });
    try { fs.unlinkSync(path.join(store.docsDir, s.id, s.docs[i].id)); } catch {}
    s.docs.splice(i, 1); store.save(db); res.json({ ok: true });
  });

  function findClient(email, password) {
    const u = store.load().users.find(x => x.email === String(email || '').trim().toLowerCase() && x.active !== false);
    if (!u) { hashPassword('timing-equaliser'); return null; }
    return verifyHash(password, u.hash) ? u : null;
  }
  return { roleOf, need, admin, findClient, store };
}

async function telegramNotify(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true }), signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

module.exports = { setup, createStore, hashPassword, verifyHash, publicShipment, STATUSES };
