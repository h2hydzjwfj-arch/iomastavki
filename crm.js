'use strict';
// CRM: сделки (воронки, этапы, история, файлы) и база клиентов — по образцу прежней CRM.
const crypto = require('crypto');

const STAGES = ['Новая заявка', 'Запрос', 'Расчёт', 'Ставка отправлена', 'КП отправлено', 'Клиент на рассмотрении', 'В работе', 'Груз в пути', 'Успешно', 'Закрыта'];
const FUNNELS = ['Входящие', 'Контракт West Asia', 'Контракт клиента', 'Карго'];
const SOURCES = ['Сайт', 'GW', 'Постоянный клиент', 'Рекомендация', 'Почта', 'Telegram', 'Звонок'];
const MODES = { auto: 'Авто', rail: 'ЖД', sea: 'Море', air: 'Авиа', multimodal: 'Море + ЖД' };
const FIELDS = ['title', 'funnel', 'source', 'stage', 'cargo', 'weight', 'volume', 'places', 'incoterms', 'from', 'to', 'mode', 'contractType', 'broker', 'documents', 'manager', 'amount', 'currency', 'contactName', 'contactPhone', 'contactEmail', 'company', 'clientId', 'note'];
const LABELS = { title: 'Название', funnel: 'Воронка', source: 'Источник', stage: 'Этап', cargo: 'Груз', weight: 'Вес, кг', volume: 'Объём, м³', places: 'Мест', incoterms: 'Инкотермс', from: 'Откуда', to: 'Куда', mode: 'Тип перевозки', contractType: 'Тип договора', broker: 'Брокер', documents: 'Документы', manager: 'Менеджер', amount: 'Сумма', currency: 'Валюта', contactName: 'Контакт', contactPhone: 'Телефон', contactEmail: 'Email', company: 'Компания', clientId: 'Клиент', note: 'Описание' };
const NUM = ['weight', 'volume', 'places', 'amount'];

function setup(app, ctx) {
  const { store, admin, upload, str, num, newId } = ctx;
  const db = () => { const d = store.load(); d.deals = d.deals || []; return d; };
  const now = () => new Date().toISOString();
  const pad = n => String(n).padStart(2, '0');
  function nextNumber(d, at) {
    const t = new Date(at); const day = pad(t.getDate()) + pad(t.getMonth() + 1) + String(t.getFullYear()).slice(2);
    const n = d.deals.filter(x => String(x.number || '').startsWith(day + '-')).length + 1;
    return day + '-' + n;
  }
  function clean(field, v) {
    if (NUM.includes(field)) return num(v);
    if (field === 'mode') return MODES[v] ? v : '';
    return str(v, field === 'note' || field === 'documents' ? 2000 : 200);
  }
  function create(src, by) {
    const d = db(); const at = src.createdAt || now();
    const deal = { id: newId(), number: src.number ? str(src.number, 40) : nextNumber(d, at), createdAt: at, updatedAt: at, activity: [], files: [] };
    for (const f of FIELDS) if (src[f] != null && src[f] !== '') deal[f] = clean(f, src[f]);
    deal.stage = STAGES.includes(deal.stage) ? deal.stage : (deal.stage || 'Новая заявка');
    deal.funnel = deal.funnel || 'Входящие'; deal.source = deal.source || 'Сайт';
    if (!deal.title) { const t = new Date(at); deal.title = (deal.cargo || 'Заявка') + ' ' + String(t.getFullYear()).slice(2) + pad(t.getMonth() + 1) + pad(t.getDate()); }
    for (const k of ['leadId', 'quoteId', 'imported']) if (src[k]) deal[k] = src[k];
    if (src.activityText) deal.activity.push({ id: newId(4), at, type: src.activityType || 'lead', by: by || 'Сайт', text: str(src.activityText, 8000) });
    d.deals.unshift(deal); d.deals = d.deals.slice(0, 20000); store.save(d);
    return deal;
  }
  function list(q) {
    let items = db().deals;
    const s = String(q.q || '').trim().toLowerCase(), digits = s.replace(/\D/g, '');
    if (q.funnel) items = items.filter(x => x.funnel === q.funnel);
    if (q.stage) items = items.filter(x => x.stage === q.stage);
    if (q.open === '1') items = items.filter(x => !['Успешно', 'Закрыта'].includes(x.stage));
    if (s) items = items.filter(x => [x.title, x.number, x.contactName, x.company, x.contactEmail, x.cargo, x.from, x.to].some(v => String(v || '').toLowerCase().includes(s)) || (digits.length >= 4 && String(x.contactPhone || '').replace(/\D/g, '').includes(digits)));
    return items.map(x => ({ ...x, activity: undefined, files: (x.files || []).length, notes: (x.activity || []).length }));
  }

  app.get('/api/deals/meta', admin, (req, res) => {
    const d = db(); const uniq = (k, base) => [...new Set(base.concat(d.deals.map(x => x[k]).filter(Boolean)))];
    res.json({ ok: true, stages: uniq('stage', STAGES), funnels: uniq('funnel', FUNNELS), sources: uniq('source', SOURCES), modes: MODES, labels: LABELS });
  });
  app.get('/api/deals', admin, (req, res) => res.json({ ok: true, items: list(req.query || {}) }));
  app.post('/api/deals', admin, (req, res) => {
    const b = req.body || {};
    if (!str(b.title, 200) && !str(b.cargo, 200) && !str(b.contactName, 200)) return res.status(400).json({ ok: false, error: 'Укажите название, груз или контакт' });
    const deal = create({ ...b, source: b.source || 'Звонок', activityText: b.note ? 'Сделка создана вручную.\n' + b.note : 'Сделка создана вручную.', activityType: 'note' }, 'Администратор');
    res.json({ ok: true, item: deal });
  });
  app.get('/api/deals/:id', admin, (req, res) => {
    const d = db(); const x = d.deals.find(v => v.id === req.params.id);
    if (!x) return res.status(404).json({ ok: false, error: 'Сделка не найдена' });
    const quotes = (d.quotes || []).filter(q => q.dealId === x.id || (x.quoteId && q.id === x.quoteId)).map(q => ({ id: q.id, number: q.number, price: q.price, currency: q.currency, createdAt: q.createdAt, basis: q.basis }));
    res.json({ ok: true, item: x, quotes });
  });
  app.patch('/api/deals/:id', admin, (req, res) => {
    const d = db(); const x = d.deals.find(v => v.id === req.params.id);
    if (!x) return res.status(404).json({ ok: false, error: 'Сделка не найдена' });
    const b = req.body || {}; const at = now(); x.activity = x.activity || [];
    for (const f of FIELDS) if (Object.prototype.hasOwnProperty.call(b, f)) {
      const v = clean(f, b[f]); const old = x[f] == null ? '' : x[f];
      if (String(old) === String(v == null ? '' : v)) continue;
      x[f] = v; x.activity.push({ id: newId(4), at, type: 'field', by: 'Администратор', field: f, from: f === 'mode' ? (MODES[old] || old) : old, to: f === 'mode' ? (MODES[v] || v) : v });
    }
    if (['Успешно', 'Закрыта'].includes(x.stage) && !x.closedAt) x.closedAt = at; if (!['Успешно', 'Закрыта'].includes(x.stage)) delete x.closedAt;
    x.updatedAt = at; store.save(d); res.json({ ok: true, item: x });
  });
  app.post('/api/deals/:id/notes', admin, (req, res) => {
    const d = db(); const x = d.deals.find(v => v.id === req.params.id);
    if (!x) return res.status(404).json({ ok: false, error: 'Сделка не найдена' });
    const text = str(req.body && req.body.text, 4000); if (!text) return res.status(400).json({ ok: false, error: 'Пустая заметка' });
    const type = ['note', 'call', 'mail', 'rate'].includes(req.body.type) ? req.body.type : 'note';
    x.activity = x.activity || []; x.activity.push({ id: newId(4), at: now(), type, by: 'Администратор', text }); x.updatedAt = now(); store.save(d);
    res.json({ ok: true, item: x });
  });
  app.delete('/api/deals/:id', admin, (req, res) => {
    const d = db(); const i = d.deals.findIndex(v => v.id === req.params.id);
    if (i < 0) return res.status(404).json({ ok: false, error: 'Сделка не найдена' });
    d.deals.splice(i, 1); store.save(d); res.json({ ok: true });
  });
  async function attach(deal, file) {
    const fid = newId(6);
    await store.putDoc('deal-' + deal.id, fid, file.buf, file.mime);
    deal.files = deal.files || []; deal.files.push({ id: fid, name: str(file.name, 160), size: file.buf.length, type: file.mime || '', at: now() });
    return fid;
  }
  if (upload) app.post('/api/deals/:id/files', admin, upload.single('file'), async (req, res) => {
    const d = db(); const x = d.deals.find(v => v.id === req.params.id);
    if (!x) return res.status(404).json({ ok: false, error: 'Сделка не найдена' });
    const f = req.file; if (!f) return res.status(400).json({ ok: false, error: 'Выберите файл' });
    try { await attach(x, { buf: f.buffer, mime: f.mimetype, name: Buffer.from(f.originalname, 'latin1').toString('utf8') }); } catch { return res.status(502).json({ ok: false, error: 'Не удалось сохранить файл' }); }
    x.activity.push({ id: newId(4), at: now(), type: 'file', by: 'Администратор', text: 'Добавлен файл: ' + x.files[x.files.length - 1].name }); x.updatedAt = now(); store.save(d);
    res.json({ ok: true, item: x });
  });
  app.get('/api/deals/:id/files/:fid', admin, async (req, res) => {
    const x = db().deals.find(v => v.id === req.params.id); const f = x && (x.files || []).find(v => v.id === req.params.fid);
    if (!f) return res.status(404).json({ ok: false, error: 'Файл не найден' });
    let buf = null; try { buf = await store.getDoc('deal-' + x.id, f.id); } catch {}
    if (!buf) return res.status(404).json({ ok: false, error: 'Файл не найден в хранилище' });
    res.set('Content-Type', f.type || 'application/octet-stream');
    res.set('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.name)}`);
    res.set('X-Content-Type-Options', 'nosniff'); res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
    res.send(buf);
  });

  // ---------- база клиентов: зарегистрированные + контакты из сделок
  app.get('/api/crm/clients', admin, (req, res) => {
    const d = db(); const map = new Map();
    const keyOf = (email, phone, name) => (email && 'e:' + email.toLowerCase()) || (String(phone || '').replace(/\D/g, '').length >= 7 && 'p:' + String(phone).replace(/\D/g, '').slice(-10)) || (name && 'n:' + name.toLowerCase());
    const touch = (k, base) => { if (!k) return null; if (!map.has(k)) map.set(k, { key: k, name: '', company: '', email: '', phone: '', firstAt: null, lastAt: null, deals: 0, open: 0, won: 0, quotes: 0, cabinet: false, userId: '', dealIds: [] }); const c = map.get(k); for (const f of ['name', 'company', 'email', 'phone']) if (!c[f] && base[f]) c[f] = base[f]; return c; };
    const seen = (c, at) => { if (!at) return; if (!c.firstAt || at < c.firstAt) c.firstAt = at; if (!c.lastAt || at > c.lastAt) c.lastAt = at; };
    for (const u of d.users || []) { const c = touch(keyOf(u.email, u.phone, u.name), u); if (!c) continue; c.cabinet = true; c.userId = u.id; c.active = u.active !== false; seen(c, u.createdAt); }
    const byUser = new Map((d.users || []).map(u => [u.id, u]));
    for (const x of d.deals) {
      const u = x.clientId && byUser.get(x.clientId);
      const c = u ? touch(keyOf(u.email, u.phone, u.name), u) : touch(keyOf(x.contactEmail, x.contactPhone, x.contactName || x.company), { name: x.contactName, company: x.company, email: x.contactEmail, phone: x.contactPhone });
      if (!c) continue; c.deals++; c.dealIds.push(x.id); if (!['Успешно', 'Закрыта'].includes(x.stage)) c.open++; if (x.stage === 'Успешно') c.won++; seen(c, x.createdAt); seen(c, x.updatedAt);
    }
    for (const q of d.quotes || []) { const u = q.ownerUid && byUser.get(q.ownerUid); if (!u) continue; const c = touch(keyOf(u.email, u.phone, u.name), u); if (c) { c.quotes++; seen(c, q.createdAt); } }
    const cutoff = Date.now() - 120 * 864e5;
    let items = [...map.values()].map(c => ({ ...c, current: c.open > 0 || (c.lastAt && Date.parse(c.lastAt) >= cutoff), dealIds: c.dealIds.slice(0, 50) }));
    const s = String(req.query.q || '').trim().toLowerCase(); if (s) items = items.filter(c => [c.name, c.company, c.email, c.phone].some(v => String(v || '').toLowerCase().includes(s)));
    if (req.query.status === 'current') items = items.filter(c => c.current); else if (req.query.status === 'past') items = items.filter(c => !c.current);
    const sort = req.query.sort || 'recent';
    const t = v => (v ? Date.parse(v) : 0);
    items.sort(sort === 'added' ? (a, b) => t(b.firstAt) - t(a.firstAt) : sort === 'frequency' ? (a, b) => (b.deals + b.quotes) - (a.deals + a.quotes) || t(b.lastAt) - t(a.lastAt) : (a, b) => t(b.lastAt) - t(a.lastAt));
    res.json({ ok: true, items });
  });

  // ---------- импорт из прежней CRM (Excel или CSV)
  const HEAD = { number: /^(№|номер|number)/i, title: /^(название|сделка|title)/i, source: /^(источник|source)/i, funnel: /^(воронка|funnel)/i, contactName: /^(контакт|клиент|contact|имя)/i, company: /^(компания|company|организация)/i, contactPhone: /^(телефон|phone|тел)/i, contactEmail: /^(e-?mail|почта)/i, stage: /^(этап|статус|stage)/i, mode: /^(тип перевозки|транспорт|вид транспорта)/i, manager: /^(менеджер|ответственный|manager)/i, createdAt: /^(создана|дата|created)/i, cargo: /^(груз|товар|cargo)/i, weight: /^(вес|weight)/i, volume: /^(объ[её]м|volume)/i, from: /^(откуда|from)/i, to: /^(куда|to)$/i, incoterms: /^(инкотермс|incoterms|условия)/i, amount: /^(сумма|бюджет|amount)/i };
  const MODE_BY_NAME = { 'авто': 'auto', 'жд': 'rail', 'ж/д': 'rail', 'море': 'sea', 'авиа': 'air', 'море + жд': 'multimodal' };
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

  return { create, attach, STAGES, FUNNELS };
}

module.exports = { setup, STAGES, FUNNELS, SOURCES, MODES };
