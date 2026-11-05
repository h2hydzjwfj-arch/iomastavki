'use strict';
// IOMASTAVKA — роли (гость / клиент / администратор), заявки, клиенты, грузы и документы.
// Данные хранятся в DATA_DIR/portal.json. На Render подключите постоянный диск (Disk)
// и укажите DATA_DIR=/var/data, иначе файл пропадёт при перезапуске сервиса.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATUSES = ['new', 'pickup', 'transit', 'border', 'customs', 'delivery', 'done'];
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

  app.get('/api/me', (req, res) => { const r = roleOf(req); res.json({ ok: true, role: r.role, name: r.name || '', storage: r.role === 'admin' ? store.kind : undefined }); });

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
      shipmentNotice(s, `Новый статус: ${ST_RU[s.status] || s.status}${b.eventNote ? ' — ' + str(b.eventNote, 300) : ''}`);
    } else if (b.eventNote) { s.events = s.events || []; s.events.push({ status: s.status, note: str(b.eventNote, 300), date: new Date().toISOString() }); shipmentNotice(s, str(b.eventNote, 300)); }
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
    store.save(db); res.json({ ok: true, item: publicUser(u) });
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
  app.post('/api/password/forgot', forgotLimiter, async (req, res) => {
    const email = str(req.body && req.body.email, 120).toLowerCase();
    const db = store.load(); const u = db.users.find(x => x.email === email && x.active !== false);
    let sent = { telegram: false, email: false };
    if (u) {
      const token = crypto.randomBytes(24).toString('base64url');
      u.reset = { h: sha(token), exp: Date.now() + 30 * 60 * 1000 }; store.save(db);
      const link = `${SITE}/#reset=${token}`;
      sent = await tellUser(u, 'Восстановление пароля — iomastavka', `Ссылка для нового пароля (действует 30 минут):\n${link}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это сообщение.`);
      if (!sent.telegram && !sent.email) { try { await notify(`Клиент ${u.name} (${u.email}) просит восстановить пароль. Выдайте новый в разделе «Работа → Клиенты».`); } catch {} }
    }
    // Одинаковый ответ, чтобы нельзя было проверить, есть ли такая почта
    res.json({ ok: true, message: 'Если такой аккаунт есть, мы отправили ссылку в Telegram или на почту. Если ни то ни другое не подключено — менеджер получил запрос и выдаст новый пароль.' });
  });
  app.post('/api/password/reset', forgotLimiter, (req, res) => {
    const b = req.body || {}; if (!okPw(b.password)) return res.status(400).json({ ok: false, error: 'Новый пароль — от 8 символов' });
    const db = store.load(); const h = sha(String(b.token || ''));
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
    try {
      const m = req.body && req.body.message; if (!m || !m.chat || typeof m.text !== 'string') return;
      const chat = m.chat.id, text = m.text.trim();
      const db = store.load();
      const start = text.match(/^\/start\s+([a-f0-9]{24})$/i);
      if (start) {
        const u = db.users.find(x => x.tgLink && x.tgLink.h === sha(start[1].toLowerCase()) && x.tgLink.exp > Date.now());
        if (!u) return tg.send(chat, 'Ссылка устарела. Откройте «Аккаунт» на сайте и нажмите «Подключить Telegram» ещё раз.');
        u.tgChatId = chat; delete u.tgLink; store.save(db);
        return tg.send(chat, `Готово, ${u.name}! Сюда будут приходить ваши КП, статусы грузов и документы.\nОтключить: /stop`);
      }
      if (/^\/stop/.test(text)) { const u = db.users.find(x => x.tgChatId === chat); if (u) { delete u.tgChatId; store.save(db); } return tg.send(chat, 'Уведомления отключены.'); }
      return tg.send(chat, `Это бот iomastavka. Чтобы получать КП и статусы грузов, войдите на сайте ${SITE} → «Аккаунт» → «Подключить Telegram».`);
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
    if (!mail.enabled()) out.email.info = 'Нет SMTP_URL в Render';
    else if (!to) out.email.info = 'Укажите почту для проверки';
    else { try { await mail.send(to, 'Проверка iomastavka', 'Письма с сайта работают.'); out.email = { ok: true, info: 'Письмо отправлено на ' + to }; } catch (e) { out.email.info = 'Ошибка почты: ' + e.message; } }
    res.json({ ok: true, ...out });
  });

  // =====================================================================
  //  Коммерческие предложения (КП): считаются на сервере, хранятся, по ссылке
  // =====================================================================
  const engine = opts.engine || (() => null);
  const quoteLimiter = rateLimit ? rateLimit({ windowMs: 60 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много расчётов. Попробуйте позже.' } }) : (q, s, n) => n();
  const MODE_RU = { road: 'Авто', auto: 'Авто', rail: 'ЖД', sea: 'Море', air: 'Авиа', multimodal: 'Море + ЖД' };
  function publicQuote(q) {
    const { company, notes, source, ownerUid, guestEmail, ...pub } = q; return pub;
  }
  function quoteText(q) {
    return `${q.number} · iomastavka\n${q.from} → ${q.to}${q.mode ? ' · ' + (MODE_RU[q.mode] || q.mode) : ''}\n` +
      `${q.weight != null ? 'Вес ' + q.weight + ' кг' : ''}${q.volume ? ' · объём ' + q.volume + ' м³' : ''}\n` +
      `Ставка: ${Number(q.price).toLocaleString('ru-RU')} ${q.currency}${q.transitDays ? ' · срок ' + q.transitDays + ' дн.' : ''}\n` +
      `Действует до ${new Date(q.validUntil).toLocaleDateString('ru-RU')}. Терминальные расходы в пункте прибытия уточняются.\n${SITE}/#kp=${q.id}`;
  }
  app.post('/api/quotes', quoteLimiter, async (req, res) => {
    const b = req.body || {}; const who = roleOf(req);
    const from = str(b.from, 120), to = str(b.to, 120);
    if (!from || !to) return res.status(400).json({ ok: false, error: 'Укажите откуда и куда' });
    const best = await engine({ from, to, mode: str(b.mode, 20), distance: num(b.distance) });
    if (!best || !Number.isFinite(Number(best.rate))) return res.status(404).json({ ok: false, error: 'В базе нет ставки для этого маршрута — оставьте заявку, посчитаем вручную' });
    const now = Date.now(); const id = newId(8);
    const chinese = /中国|china|chinese|\.cn$/i.test(`${best.company || ''} ${best.source || ''} ${best.notes || ''}`);
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
  return { roleOf, need, admin, findClient, store, adminPasswordOk: pw => adminPasswordOk(pw, envAdminCheck), setEnvAdminCheck: f => { envAdminCheck = f; }, tg, mail };
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
  // Почта через любой SMTP (Яндекс, Mail.ru, Gmail с паролем приложения):
  // SMTP_URL=smtps://логин:пароль@smtp.yandex.ru:465  и  MAIL_FROM="iomastavka <логин@yandex.ru>"
  let tr = null;
  function transport() {
    if (tr || !process.env.SMTP_URL) return tr;
    try { tr = require('nodemailer').createTransport(process.env.SMTP_URL); } catch (e) { console.error('nodemailer:', e.message); }
    return tr;
  }
  return {
    enabled: () => !!transport(),
    send: async (to, subject, text) => { const t = transport(); if (!t) throw new Error('mail off'); await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_FROM, to, subject, text }); },
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
