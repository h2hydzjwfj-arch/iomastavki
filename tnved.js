'use strict';
// Локальный справочник ТН ВЭД: импорт таблицы (Excel / CSV / JSON), поиск по части названия и по цифрам кода.
// Никаких внешних платных API: всё ищется в собственной базе (DATA_DIR/tnved.json, копия в Supabase).
const fs = require('fs');
const path = require('path');
const VED = require('./ved');

const FIELDS = ['code', 'name', 'duty', 'vat', 'excise', 'unit', 'cert', 'reglament', 'marking', 'note', 'radio'];
const HEAD = {
  code: /^(код|code|тн\s*вэд|hs\b|товарн\w* код)/i, name: /^(наименован|назван|описан|name|товар(?![а-яё])|description)/i,
  duty: /(пошлин|duty|ставк\w* ввоз|импортн\w* ставк)/i, vat: /^(ндс|vat)/i, excise: /(акциз|excise)/i,
  unit: /(ед\.?\s*изм|единиц|unit|доп\.?\s*ед)/i, cert: /(сертиф|разрешит|соответств|сс\s*\/\s*дс|cert|док\w* для ввоза)/i,
  reglament: /(регламент|тр\s*тс|тр\s*еаэс)/i, marking: /(маркир|честн|honest)/i, note: /(примеч|note|комментар|особенн)/i,
  radio: /(радио|1637|73\s*860|приложени[ея]\s*(№\s*)?1(?!\d))/i,
};
const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"'()]/g, ' ').replace(/\s+/g, ' ').trim();
const digits = s => String(s || '').replace(/\D/g, '');

function csvRows(text) {
  const first = text.split('\n')[0];
  const delim = [';', '\t', ','].sort((a, b) => (first.split(b).length) - (first.split(a).length))[0];
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

function clean(rec) {
  const o = {};
  o.code = digits(rec.code).slice(0, 10);
  for (const f of FIELDS) if (f !== 'code' && f !== 'radio' && rec[f] != null && String(rec[f]).trim() !== '') o[f] = String(rec[f]).replace(/\s+/g, ' ').trim().slice(0, f === 'name' || f === 'note' ? 2000 : 400);
  if (rec.radio === true || /^(да|yes|1|true|\+|x|✓)$/i.test(String(rec.radio || '').trim())) o.radio = true;
  return o;
}

function rowsToRecords(rows) {
  rows = rows.filter(r => Array.isArray(r) && r.some(c => String(c == null ? '' : c).trim() !== ''));
  if (!rows.length) return [];
  let hi = rows.slice(0, 15).findIndex(r => r.filter(c => Object.values(HEAD).some(rx => rx.test(String(c || '').trim()))).length >= 2);
  let map;
  if (hi >= 0) {
    map = rows[hi].map(h => { const t = String(h || '').trim(); return Object.keys(HEAD).find(k => HEAD[k].test(t)) || null; });
    // одна колонка — одно поле: при повторе оставляем первую
    const seen = new Set(); map = map.map(k => (k && !seen.has(k) ? (seen.add(k), k) : null));
  } else { hi = -1; map = ['code', 'name', 'duty', 'vat', 'excise', 'unit']; }
  if (!map.includes('code')) throw new Error('Не нашёл колонку с кодом ТН ВЭД. Нужны заголовки вроде «Код», «Наименование», «Пошлина», «НДС».');
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const o = {}; map.forEach((k, i) => { if (k && r[i] != null) o[k] = r[i]; });
    const c = clean(o); if (c.code.length >= 4 && (c.name || c.duty)) out.push(c);
  }
  return out;
}

function createTnved(dataDir, cloud) {
  const file = path.join(dataDir, 'tnved.json');
  let list = null, index = null, meta = { importedAt: null, source: '', count: 0 }, diffs = [], dirty = false, timer = null;
  function build() { index = list.map(r => ({ r, n: norm(r.name), d: r.code })); meta.count = list.length; }
  function readLocal() { try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); list = Array.isArray(j.items) ? j.items : []; meta = { ...meta, ...(j.meta || {}) }; diffs = Array.isArray(j.diffs) ? j.diffs : []; } catch { list = []; } build(); }
  async function init() {
    if (cloud) { try { const buf = await cloud.get('state/tnved.json'); if (buf) { const j = JSON.parse(buf.toString('utf8')); list = j.items || []; meta = { ...meta, ...(j.meta || {}) }; diffs = Array.isArray(j.diffs) ? j.diffs : []; build(); writeLocal(); return; } } catch (e) { console.error('tnved cloud', e.message); } }
    readLocal();
  }
  function writeLocal() { try { fs.mkdirSync(dataDir, { recursive: true }); const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ meta, items: list, diffs })); fs.renameSync(tmp, file); } catch (e) { if (!cloud) throw e; } }
  async function flush() { if (!cloud || !dirty) return; dirty = false; try { await cloud.put('state/tnved.json', Buffer.from(JSON.stringify({ meta, items: list, diffs })), 'application/json'); } catch (e) { dirty = true; console.error('tnved save', e.message); } }
  function save() { build(); writeLocal(); if (cloud) { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 500); } }
  const all = () => { if (!list) readLocal(); return list; };

  // сравнение с прежним справочником (перенос tnved_diff.js): новые, нет в файле, изменённые ставки и названия, задетые сделки
  const rateOf = r => [r.duty || '—', r.vat ? 'НДС ' + r.vat : ''].filter(Boolean).join(' · ');
  function makeDiff(prevList, recs, source, by, affectedFn) {
    const prev = new Map(prevList.map(r => [r.code, r])), inFile = new Set(recs.map(r => r.code)), cap = a => a.slice(0, 3000);
    const added = [], rate = [], name = [];
    for (const r of recs) {
      const o = prev.get(r.code);
      if (!o) { added.push({ code: r.code, name: r.name || '', duty: r.duty || '' }); continue; }
      if (r.duty != null && (o.duty || '') !== (r.duty || '') || r.vat != null && (o.vat || '') !== (r.vat || '')) rate.push({ code: r.code, name: r.name || o.name || '', old: rateOf(o), new: rateOf({ ...o, ...r }) });
      if (r.name && o.name && norm(o.name) !== norm(r.name)) name.push({ code: r.code, old: o.name, new: r.name });
    }
    const removed = prevList.length ? prevList.filter(o => !inFile.has(o.code)).map(o => ({ code: o.code, name: o.name || '', duty: o.duty || '' })) : [];
    let affected = [];
    if (affectedFn) { try { const touched = new Map(rate.map(x => [x.code, 'ставка: ' + x.old + ' → ' + x.new]).concat(removed.map(x => [x.code, 'кода нет в новом файле']))); if (touched.size) affected = affectedFn(touched) || []; } catch (e) { console.error('tnved affected', e.message); } }
    const d = { id: Date.now().toString(36), at: new Date().toISOString(), by: String(by || '').slice(0, 80), source: String(source || '').slice(0, 160), first: !prevList.length,
      added_n: added.length, removed_n: removed.length, rate_n: rate.length, name_n: name.length, affected_n: affected.length,
      added: cap(added), removed: cap(removed), rate: cap(rate), name: cap(name), affected: cap(affected) };
    diffs = [d].concat(diffs).slice(0, 15);
    return d;
  }
  const brief = d => ({ id: d.id, at: d.at, by: d.by, source: d.source, first: d.first, added_n: d.added_n, removed_n: d.removed_n, rate_n: d.rate_n, name_n: d.name_n, affected_n: d.affected_n });
  function diffList() { all(); return diffs.map(brief); }
  function diffGet(id) { all(); return diffs.find(d => d.id === id) || null; }
  function importRecords(recs, mode, source, by, affectedFn) {
    all();
    const diff = makeDiff(list.slice(), recs, source, by, affectedFn);
    if (mode === 'replace') list = [];
    const byCode = new Map(list.map((r, i) => [r.code, i])); let added = 0, updated = 0;
    for (const r of recs) { if (byCode.has(r.code)) { list[byCode.get(r.code)] = { ...list[byCode.get(r.code)], ...r }; updated++; } else { byCode.set(r.code, list.length); list.push(r); added++; } }
    list.sort((a, b) => a.code.localeCompare(b.code));
    meta.importedAt = new Date().toISOString(); meta.source = String(source || '').slice(0, 160); save();
    return { added, updated, total: list.length, diff: brief(diff) };
  }
  function search(q, limit) {
    all(); limit = Math.min(Number(limit) || 30, 200);
    const s = norm(q), d = digits(q), words = s.replace(/[\d.\s-]+/g, ' ').trim().split(' ').filter(w => w.length > 1);
    if (!s) return { items: [], total: 0 };
    const scored = [];
    for (const x of index) {
      let score = 0;
      if (d.length >= 2 && !words.length) {
        if (x.d.startsWith(d)) score = 100 - Math.min(40, x.d.length - d.length);
        else if (d.length >= 4 && x.d.includes(d)) score = 30;
        else continue;
      } else {
        if (d.length >= 2 && !x.d.startsWith(d)) continue;
        let ok = true, pos = 0;
        for (const w of words) { const stem = w.length > 5 ? w.slice(0, w.length - 2) : w; const i = x.n.indexOf(stem); if (i < 0) { ok = false; break; } pos += i; }
        if (!ok) continue;
        score = 60 - Math.min(40, pos / 4) + (x.n.startsWith(words[0] || '') ? 15 : 0) + (x.d.length === 10 ? 5 : 0) + (d.length ? 20 : 0);
      }
      scored.push([score, x.r]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].code.localeCompare(b[1].code));
    const items = scored.slice(0, limit).map(v => v[1]);
    // своих записей мало — добавляем коды из встроенного справочника (reference/tnved-base.json), помечены source: 'base'
    if (items.length < limit) {
      const have = new Set(items.map(r => r.code));
      for (const r of require('./tnved-check').searchBase(q, limit)) if (!have.has(r.code) && items.length < limit) items.push(r);
    }
    return { items, total: Math.max(scored.length, items.length) };
  }
  function get(code) {
    all(); const c = digits(code); if (!c) return null;
    const exact = list.find(r => r.code === c); if (exact) return { ...exact, exact: true };
    // ближайшая родительская позиция (группа / подсубпозиция)
    let best = null; for (const r of list) if (c.startsWith(r.code) && (!best || r.code.length > best.code.length)) best = r;
    return best ? { ...best, exact: false, parentOf: c } : null;
  }
  // Поля для калькулятора ВЭД (как /calc/tnved_lookup в прежней CRM)
  function lookup(code, vatDefault) {
    const r = get(code); if (!r) return null;
    const d = VED.parseDuty(r.duty || '');
    return { code: r.code, exact: r.exact, name: r.name || '', duty_text: r.duty || '', duty_type: d.duty_type, duty_value: d.duty_rate, eur_per_kg: d.eur_per_kg, eur_per_l: d.eur_per_l, eur_per_pcs: d.eur_per_pcs, eur_per_m2: d.eur_per_m2, eur_unit: d.eur_unit,
      vat_rate: VED.parseVat(r.vat, vatDefault), vat_text: r.vat || '', excise_text: r.excise || '', unit: r.unit || '', radio: !!r.radio };
  }
  // Разрешительные документы и маркировка (как /calc/cert_check)
  function certCheck(code) {
    const r = get(code); if (!r) return { found: false, cert: null, honest_sign: null };
    const c = String(r.cert || '').trim(), low = c.toLowerCase();
    const W = '(?:^|[^а-яёa-z])', E = '(?:$|[^а-яёa-z])', word = w => new RegExp(W + w + E);
    const doc = !c ? null : /не\s*(требу|подлеж)|^нет|^-$/.test(low) ? 'не требуется' : /сгр|госрег/.test(low) ? 'СГР' : /сс.*(или|\/).*дс|дс.*(или|\/).*сс/.test(low) ? 'СС или ДС' : word('сс').test(low) || /сертификат/.test(low) ? 'СС' : word('дс').test(low) || /декларац/.test(low) ? 'ДС' : c.slice(0, 40);
    const m = String(r.marking || '').toLowerCase();
    const hs = !m ? null : /эксперимент/.test(m) ? { required: false, experiment: true, label: r.marking } : /не\s*(требу|подлеж)|^нет|^-$/.test(m) ? { required: false, label: 'Честный знак не требуется' } : { required: true, label: r.marking };
    return { found: true, exact: r.exact, code: r.code, cert: doc ? { doc_type: doc, reglaments: r.reglament || '', extra: r.note || '' } : null, honest_sign: hs };
  }
  function upsert(rec) { const c = clean(rec); if (c.code.length < 4) throw new Error('Код — от 4 до 10 цифр'); all(); const i = list.findIndex(r => r.code === c.code); if (i >= 0) list[i] = c; else { list.push(c); list.sort((a, b) => a.code.localeCompare(b.code)); } save(); return c; }
  function remove(code) { all(); const c = digits(code); const i = list.findIndex(r => r.code === c); if (i < 0) return false; list.splice(i, 1); save(); return true; }
  function stats() { all(); const groups = new Set(list.map(r => r.code.slice(0, 2))); return { ...meta, count: list.length, groups: groups.size, withCert: list.filter(r => r.cert).length, withMarking: list.filter(r => r.marking).length, history: diffs.length }; }
  return { init, flush, search, get, lookup, certCheck, importRecords, upsert, remove, stats, diffList, diffGet, all: () => all() };
}

function setup(app, ctx) {
  const { admin, upload, DATA_DIR, cloud } = ctx;
  const db = ctx.tnved || createTnved(DATA_DIR, cloud);
  const vatDefault = () => (ctx.vedSettings ? ctx.vedSettings().vatDefault : 22);
  app.get('/api/tnved/diffs', admin, (req, res) => res.json({ ok: true, items: db.diffList() }));
  app.get('/api/tnved/diffs/:id', admin, (req, res) => { const d = db.diffGet(req.params.id); if (!d) return res.status(404).json({ ok: false, error: 'Не найдено' }); res.json({ ok: true, item: d }); });
  app.get('/api/tnved/stats', admin, (req, res) => res.json({ ok: true, ...db.stats() }));
  app.get('/api/tnved/search', admin, (req, res) => { const r = db.search(req.query.q, req.query.limit); res.json({ ok: true, ...r }); });
  app.get('/api/tnved/lookup', admin, (req, res) => { const r = db.lookup(req.query.code, vatDefault()); if (!r) return res.status(404).json({ ok: false, error: 'Кода нет в локальном справочнике' }); res.json({ ok: true, ...r }); });
  app.get('/api/tnved/cert', admin, (req, res) => res.json({ ok: true, ...db.certCheck(req.query.code) }));
  app.get('/api/tnved/code/:code', admin, (req, res) => {
    let r = db.get(req.params.code);
    if (!r || !r.exact) { // нет в своём справочнике — встроенный справочник (reference/tnved-base.json)
      const b = require('./tnved-check').baseInfo(digits(req.params.code));
      if (b) { const vat = [...new Set(b.vat.map(v => v.rate + '%'))].join(' / ') || '22%'; return res.json({ ok: true, item: { code: b.code, name: b.levels.map(l => l.text).slice(-2).join(' — '), duty: b.duty.text, vat, excise: b.excise, note: (b.duty.note ? b.duty.note + ' ' : '') + 'Встроенный справочник, ставки на ' + b.baseDate + '.', exact: true, source: 'base' }, calc: null, cert: db.certCheck(b.code) }); }
    }
    if (!r) return res.status(404).json({ ok: false, error: 'Не найдено' }); res.json({ ok: true, item: r, calc: db.lookup(r.code, vatDefault()), cert: db.certCheck(r.code) }); });
  app.put('/api/tnved/code/:code', admin, (req, res) => { try { res.json({ ok: true, item: db.upsert({ ...(req.body || {}), code: req.params.code }) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
  app.delete('/api/tnved/code/:code', admin, (req, res) => res.json({ ok: db.remove(req.params.code) }));
  if (upload) app.post('/api/tnved/import', admin, upload.single('file'), (req, res) => {
    const f = req.file; if (!f) return res.status(400).json({ ok: false, error: 'Выберите файл Excel, CSV или JSON' });
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8'); const low = name.toLowerCase();
    try {
      let recs;
      if (low.endsWith('.json')) { const j = JSON.parse(f.buffer.toString('utf8').replace(/^﻿/, '')); const arr = Array.isArray(j) ? j : j.items || j.data || []; recs = arr.map(x => clean({ code: x.code || x.tnved || x.hs || x['Код'], name: x.name || x.title || x['Наименование'], duty: x.duty || x['Пошлина'], vat: x.vat || x['НДС'], excise: x.excise, unit: x.unit, cert: x.cert, reglament: x.reglament, marking: x.marking, note: x.note, radio: x.radio })).filter(r => r.code.length >= 4); }
      else if (low.endsWith('.xlsx')) recs = rowsToRecords(require('./docparse').xlsxRows(f.buffer));
      else if (low.endsWith('.csv') || low.endsWith('.txt') || low.endsWith('.tsv')) recs = rowsToRecords(csvRows(f.buffer.toString('utf8').replace(/^﻿/, '')));
      else return res.status(400).json({ ok: false, error: 'Поддерживаются .xlsx, .csv и .json' });
      if (!recs.length) return res.status(400).json({ ok: false, error: 'В файле не нашлось строк с кодами ТН ВЭД' });
      res.json({ ok: true, ...db.importRecords(recs, req.body && req.body.mode === 'replace' ? 'replace' : 'merge', name, (ctx.who && ctx.who(req)) || 'Администратор', ctx.affected) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });
  return db;
}

module.exports = { createTnved, setup, rowsToRecords, csvRows, clean, norm };
