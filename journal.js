'use strict';
// Журнал для администратора: всё, что люди вводят на сайте, — отдельной записью,
// каждое поле в своей колонке (расчёты, заявки, КП, регистрации, входы, изменения грузов).
// Хранится помесячно: DATA_DIR/journal/ГГГГ-ММ.json и в Supabase (journal/ГГГГ-ММ.json),
// поэтому файл не разрастается и старые месяцы не мешают текущему.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Колонки таблицы и выгрузки (порядок = порядок в Excel)
const COLUMNS = [
  ['at', 'Дата и время'], ['typeName', 'Действие'], ['roleName', 'Кто'], ['name', 'Имя'], ['email', 'Почта'],
  ['phone', 'Телефон'], ['contact', 'Контакт'], ['company', 'Компания'],
  ['from', 'Откуда'], ['to', 'Куда'], ['weight', 'Вес, кг'], ['volume', 'Объём, м³'], ['places', 'Мест'],
  ['dangerous', 'Опасный груз'], ['mode', 'Транспорт'], ['option', 'Вариант'], ['price', 'Цена'], ['currency', 'Валюта'],
  ['days', 'Срок, дн.'], ['cargo', 'Груз'], ['comment', 'Комментарий'], ['files', 'Файлы'], ['result', 'Результат'],
  ['number', 'Номер'], ['source', 'Откуда пришёл'], ['lang', 'Язык'], ['visitor', 'Посетитель'],
];
const TYPES = {
  calc: 'Расчёт', quote: 'КП сохранено', lead: 'Заявка', lead_docs: 'Заявка с документами',
  register: 'Регистрация', login: 'Вход', login_fail: 'Неудачный вход', forgot: 'Восстановление пароля',
  profile: 'Изменение профиля', cabinet: 'Смотрел свои грузы', ship: 'Груз создан', ship_update: 'Груз обновлён',
};
const ROLES = { guest: 'Гость', client: 'Клиент', admin: 'Администратор' };
const MODES = { auto: 'Авто', road: 'Авто', rail: 'ЖД', sea: 'Море', air: 'Авиа', multimodal: 'Море + ЖД' };
const MAX_PER_MONTH = 50000;

function clean(v, max = 300) {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v;
  return String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const ym = d => d.toISOString().slice(0, 7);

function createJournal(dataDir, cloud) {
  const dir = path.join(dataDir, 'journal');
  const months = new Map(); // 'ГГГГ-ММ' -> { items, dirty, ready }
  let index = null, indexDirty = false, timer = null;

  function localFile(m) { return path.join(dir, m + '.json'); }
  function readLocal(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
  function writeLocal(file, data) {
    try { fs.mkdirSync(dir, { recursive: true }); const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, file); }
    catch (e) { if (!cloud) console.error('journal write', e.message); }
  }
  async function loadIndex() {
    if (index) return index;
    let list = null;
    if (cloud) { try { const b = await cloud.get('journal/index.json'); if (b) list = JSON.parse(b.toString('utf8')); } catch (e) { console.error('journal index', e.message); } }
    if (!list) list = readLocal(path.join(dir, 'index.json'));
    if (!list) { try { list = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}\.json$/.test(f)).map(f => f.slice(0, 7)); } catch { list = []; } }
    index = new Set(Array.isArray(list) ? list.filter(x => /^\d{4}-\d{2}$/.test(x)) : []);
    return index;
  }
  function month(m) {
    let rec = months.get(m);
    if (rec) return rec;
    rec = { items: [], dirty: false, ready: null };
    rec.ready = (async () => {
      let data = null;
      if (cloud) { try { const b = await cloud.get(`journal/${m}.json`); if (b) data = JSON.parse(b.toString('utf8')); } catch (e) { console.error('journal load', m, e.message); } }
      if (!data) data = readLocal(localFile(m));
      // записи, добавленные пока месяц грузился, не теряются
      if (Array.isArray(data)) { const seen = new Set(rec.items.map(x => x.id)); rec.items = data.filter(x => !seen.has(x.id)).concat(rec.items); }
    })();
    months.set(m, rec);
    return rec;
  }
  async function flush() {
    timer = null;
    for (const [m, rec] of months) {
      if (!rec.dirty) continue;
      await rec.ready; rec.dirty = false;
      writeLocal(localFile(m), rec.items);
      if (cloud) { try { await cloud.put(`journal/${m}.json`, Buffer.from(JSON.stringify(rec.items)), 'application/json'); } catch (e) { rec.dirty = true; console.error('journal save', e.message); } }
    }
    if (indexDirty) {
      indexDirty = false; const list = [...index].sort();
      writeLocal(path.join(dir, 'index.json'), list);
      if (cloud) { try { await cloud.put('journal/index.json', Buffer.from(JSON.stringify(list)), 'application/json'); } catch (e) { indexDirty = true; } }
    }
    if ([...months.values()].some(r => r.dirty) || indexDirty) schedule(15000);
  }
  function schedule(ms) { if (!timer) { timer = setTimeout(() => { flush().catch(e => console.error('journal flush', e.message)); }, ms); timer.unref && timer.unref(); } }

  // Добавить запись. fields — любые поля из COLUMNS; лишнее отбрасывается.
  function add(type, fields) {
    if (!TYPES[type]) return null;
    const now = new Date();
    const r = { id: crypto.randomBytes(6).toString('hex'), at: now.toISOString(), type };
    for (const [k] of COLUMNS) {
      if (k === 'at' || k === 'typeName' || k === 'roleName') continue;
      const v = fields && fields[k];
      if (v == null || v === '') continue;
      r[k] = k === 'result' || k === 'comment' ? clean(v, 1500) : clean(v);
    }
    if (fields && fields.role) r.role = clean(fields.role, 10);
    if (fields && fields.uid) r.uid = clean(fields.uid, 40);
    const m = ym(now), rec = month(m);
    rec.items.push(r); if (rec.items.length > MAX_PER_MONTH) rec.items.splice(0, rec.items.length - MAX_PER_MONTH);
    rec.dirty = true;
    loadIndex().then(ix => { if (!ix.has(m)) { ix.add(m); indexDirty = true; } schedule(2500); }).catch(() => schedule(2500));
    return r;
  }
  async function list(m) {
    if (!/^\d{4}-\d{2}$/.test(m || '')) m = ym(new Date());
    const rec = month(m); await rec.ready;
    return rec.items.slice().reverse();
  }
  async function monthsList() { const ix = await loadIndex(); const cur = ym(new Date()); return [...new Set([...ix, cur])].sort().reverse(); }

  function view(r) {
    return { ...r, typeName: TYPES[r.type] || r.type, roleName: ROLES[r.role] || '', mode: MODES[r.mode] || r.mode || '' };
  }
  function csv(items) {
    const q = v => { v = v == null ? '' : typeof v === 'boolean' ? (v ? 'да' : 'нет') : String(v); return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const head = COLUMNS.map(c => c[1]).join(';');
    const rows = items.map(view).map(r => COLUMNS.map(([k]) => {
      if (k === 'at') { const d = new Date(r.at); return q(d.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })); }
      const v = r[k]; return q(typeof v === 'number' ? String(v).replace('.', ',') : v);
    }).join(';'));
    return '﻿' + [head, ...rows].join('\r\n');
  }
  return { add, list, monthsList, view, csv, flush, COLUMNS, TYPES };
}

module.exports = { createJournal, COLUMNS, TYPES };
