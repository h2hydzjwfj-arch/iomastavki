'use strict';
// CRM West Asia → iomastavka: сделки, задачи, финансы, калькулятор ВЭД, ТН ВЭД, аналитика, отгулы, компания, почта, бот.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { fakeApp, admin, upload } = require('./fakeapp');
const { createStore } = require('../portal');
const VED = require('../ved');

function setupAll() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ioma-crm-'));
  const app = fakeApp(); const store = createStore(dir, null);
  const str = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const num = v => { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
  const newId = (n = 6) => require('crypto').randomBytes(n).toString('hex');
  const sent = [];
  const crm = require('../crm').setup(app, { store, admin, upload, str, num, newId });
  const crm2 = require('../crm2').setup(app, { store, admin, upload, str, num, newId, crm, rates: async () => ({ date: '06.11.2026', rates: { USD: 80, EUR: 92, CNY: 11 } }), mail: { enabled: () => true, kind: () => 'SMTP', send: async (...a) => { sent.push(a); } }, tg: { ready: () => false } });
  const tn = require('../tnved').setup(app, { admin, upload, DATA_DIR: dir, cloud: null, vedSettings: crm2.vedSettings });
  return { app, store, crm, crm2, tn, sent, call: (m, u, b, x) => app.call(m, u, b, x) };
}

test('калькулятор ВЭД: пошлина «но не менее», антидемпинг, сбор по шкале и 73 860 ₽', () => {
  const rates = { USD: 80, EUR: 92, CNY: 11 };
  const d = VED.newDoc('our_contract', 'USD'); d.extra_costs = [];
  d.items[0] = Object.assign(VED.newItem('USD'), { invoice_amount: 10000, weight: 500, duty_type: 'min', duty_rate: 10, eur_per_kg: 2.2 });
  let r = VED.calcDoc(d, { rates, settings: { taxOnExpensesPct: 0 } });
  assert.equal(r.customs_base_sum_rub, 800000); assert.equal(r.duty_sum_rub, 101200); // 2,2 € × 500 кг × 92 > 10%
  assert.equal(r.vat_sum_rub, Math.round((800000 + 101200) * 0.22 * 100) / 100); assert.equal(r.customs_fee_rub, 4924);
  d.items[0].duty_extra_rate = 100; d.items[0].duty_extra_unit = 1; // 100 €/т × 0,5 т
  r = VED.calcDoc(d, { rates, settings: { taxOnExpensesPct: 0 } }); assert.equal(r.duty_extra_sum_rub, 4600);
  d.radio_fee = true; r = VED.calcDoc(d, { rates }); assert.equal(r.customs_fee_rub, 73860); assert.ok(r.customs_fee_radio);
  // фрахт по весу и граница: в базу 30% фрахта
  const e = VED.newDoc('our_contract', 'CNY'); e.extra_costs = []; e.transport_mode = 'auto'; e.border_split_enabled = true; e.freight_total = 1000; e.freight_currency = 'USD';
  e.items = [Object.assign(VED.newItem('CNY'), { invoice_amount: 1000, weight: 100 }), Object.assign(VED.newItem('CNY'), { invoice_amount: 1000, weight: 300 })];
  r = VED.calcDoc(e, { rates }); assert.equal(r.items[0].freight_share_rub, 20000); assert.equal(r.items[1].freight_share_rub, 60000); assert.equal(r.freight_in_base_rub, 24000);
  assert.equal(VED.customsFee(200000), 1231); assert.equal(VED.customsFee(200001), 2462); assert.equal(VED.customsFee(12e6), 73860);
  const p = VED.parseDuty('15% плюс 0,1 евро за 1 кг'); assert.equal(p.duty_type, 'plus'); assert.equal(p.eur_per_kg, 0.1);
});

test('сделки: воронки, этапы, закрытие с причиной, архив и восстановление', async () => {
  const { call } = setupAll();
  const c = await call('POST', '/api/deals', { title: 'Станки', contactName: 'Иван', contactPhone: '+7 900 111-22-33', funnel: 'Контракт West Asia', manager: 'Анна' });
  assert.ok(c.body.ok); const id = c.body.item.id; assert.equal(c.body.item.stage, 'Запрос');
  const p = await call('PATCH', '/api/deals/' + id, { stage: 'Расчёт' }); assert.equal(p.body.item.stage, 'Расчёт');
  let l = await call('GET', '/api/deals?notFunnel=Входящие'); assert.equal(l.body.items[0].status, 'active'); assert.equal(l.body.items[0].daysInStage, 0);
  const cl = await call('PATCH', '/api/deals/' + id, { status: 'closed', closeReason: 'Дорого' }); assert.equal(cl.body.item.status, 'closed'); assert.equal(cl.body.item.stage, 'Закрыта');
  l = await call('GET', '/api/deals?status=closed'); assert.equal(l.body.total, 1);
  await call('PATCH', '/api/deals/' + id, { status: 'active' }); assert.equal((await call('GET', '/api/deals/' + id)).body.item.stage, 'Запрос');
  await call('DELETE', '/api/deals/' + id); l = await call('GET', '/api/deals'); assert.equal(l.body.total, 0);
  assert.equal((await call('GET', '/api/deals?status=deleted')).body.total, 1);
  await call('POST', '/api/deals/' + id + '/restore'); assert.equal((await call('GET', '/api/deals')).body.total, 1);
  // смена воронки → первый этап новой воронки
  const f = await call('PATCH', '/api/deals/' + id, { funnel: 'Входящие' }); assert.equal(f.body.item.stage, 'Новая заявка');
  // лента: закрепить, изменить, удалить
  const n = await call('POST', '/api/deals/' + id + '/notes', { type: 'wa', text: 'Написал в WhatsApp' }); const aid = n.body.activity.id; assert.equal(n.body.activity.type, 'wa');
  await call('PATCH', '/api/deals/' + id + '/notes/' + aid, { pinned: true, text: 'Написал в WhatsApp, ждём ответ' });
  const g = await call('GET', '/api/deals/' + id); const a = g.body.item.activity.find(v => v.id === aid); assert.ok(a.pinned); assert.match(a.text, /ждём/);
  await call('DELETE', '/api/deals/' + id + '/notes/' + aid); assert.ok(!(await call('GET', '/api/deals/' + id)).body.item.activity.some(v => v.id === aid));
  await call('DELETE', '/api/deals/' + id + '/permanent'); assert.equal((await call('GET', '/api/deals?status=all')).body.total, 0);
});

test('файлы сделки: папки, перенос, переименование, zip папки', async () => {
  const { call } = setupAll();
  const id = (await call('POST', '/api/deals', { title: 'Файлы' })).body.item.id;
  const fo = (await call('POST', '/api/deals/' + id + '/folders', { name: 'Документы' })).body.folder;
  const up = await call('POST', '/api/deals/' + id + '/files', { folder_id: fo.id }, { file: { originalname: 'invoice.txt', mimetype: 'text/plain', buffer: Buffer.from('hello') } });
  assert.ok(up.body.ok); assert.equal(up.body.file.folderId, fo.id);
  const fid = up.body.file.id;
  await call('PATCH', '/api/deals/' + id + '/files/' + fid, { name: 'Инвойс.txt' });
  const z = await call('GET', '/api/deals/' + id + '/folders/' + fo.id + '/zip'); assert.ok(Buffer.isBuffer(z.body)); assert.equal(z.body.readUInt32LE(0), 0x04034b50); assert.ok(z.body.includes(Buffer.from('Инвойс.txt')));
  await call('DELETE', '/api/deals/' + id + '/folders/' + fo.id); const g = await call('GET', '/api/deals/' + id); assert.equal(g.body.item.files.length, 0);
});

test('задачи: просрочка, перенос, выполнение, бейджи', async () => {
  const { call } = setupAll();
  const id = (await call('POST', '/api/deals', { title: 'Задачи' })).body.item.id;
  const y = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const t = await call('POST', '/api/tasks', { dealId: id, type: 'Звонок', desc: 'Перезвонить', deadline: y, manager: 'Анна' }); assert.ok(t.body.item.overdue);
  assert.equal((await call('GET', '/api/crm/badges')).body.tasksOverdue, 1);
  const tm = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  await call('PATCH', '/api/tasks/' + t.body.id, { deadline: tm }); assert.equal((await call('GET', '/api/crm/badges')).body.tasksOverdue, 0);
  await call('PATCH', '/api/tasks/' + t.body.id, { status: 'done', comment: 'Договорились' });
  assert.equal((await call('GET', '/api/tasks')).body.items.length, 0); assert.equal((await call('GET', '/api/tasks?status=done')).body.items[0].comment, 'Договорились');
  assert.equal((await call('GET', '/api/deals/' + id)).body.tasks.length, 1);
  assert.equal((await call('POST', '/api/tasks', { desc: 'без срока' })).status, 400);
});

test('финансы сделки: валюта по курсу ЦБ, маржа, журнал изменений', async () => {
  const { call } = setupAll();
  const id = (await call('POST', '/api/deals', { title: 'Деньги' })).body.item.id;
  let f = await call('PUT', '/api/deals/' + id + '/finance', { items: [{ kind: 'income', label: 'Ставка клиенту', currency: 'USD', amount_orig: 1000 }, { kind: 'expense', label: 'Фрахт', currency: 'RUB', amount: 50000 }] });
  assert.equal(f.body.income, 80000); assert.equal(f.body.margin, 30000); assert.equal(f.body.percent, 37.5); assert.equal(f.body.items[0].rate, 80);
  const item = f.body.items[1]; f = await call('PUT', '/api/deals/' + id + '/finance', { items: [f.body.items[0], { ...item, amount: 60000 }] });
  assert.equal(f.body.margin, 20000); assert.ok(f.body.history.some(h => /50 000 ₽ → 60 000 ₽/.test(h.text.replace(/ /g, ' '))));
  const l = await call('GET', '/api/deals'); assert.equal(l.body.items[0].margin, 20000);
});

test('калькулятор ВЭД в сделке: расчёт, сохранение, перенос в финансы', async () => {
  const { call } = setupAll();
  const id = (await call('POST', '/api/deals', { title: 'ВЭД', weight: 500 })).body.item.id;
  const c = await call('POST', '/api/calc', { dealId: id, calc_type: 'our_contract' }); assert.ok(c.body.ok); const doc = c.body.doc;
  const items = [{ ...doc.items[0], invoice_amount: 10000, invoice_currency: 'USD', duty_rate: 10 }];
  const p = await call('PATCH', '/api/calc/' + c.body.id, { items, freight_total: 1000, freight_currency: 'USD' });
  assert.equal(p.body.result.customs_base_sum_rub, 880000); assert.equal(p.body.result.duty_sum_rub, 88000); assert.ok(p.body.result.grand_total_rub > 880000);
  assert.equal((await call('GET', '/api/calc?deal=' + id)).body.items.length, 1);
  const tf = await call('POST', '/api/calc/' + c.body.id + '/to-finance'); assert.ok(tf.body.added >= 4);
  const fin = await call('GET', '/api/deals/' + id + '/finance'); assert.ok(fin.body.expense > 0);
  const s = await call('PUT', '/api/ved/settings', { vatDefault: 20, radioPrefixes: '8517 13, 8471' }); assert.equal(s.body.settings.vatDefault, 20); assert.deepEqual(s.body.settings.radioPrefixes, ['851713', '8471']);
});

test('ТН ВЭД: импорт CSV, поиск по названию и цифрам, данные для калькулятора', async () => {
  const { call } = setupAll();
  const csv = 'Код;Наименование;Пошлина;НДС;Сертификат;Маркировка\n6201400000;Куртки из химических нитей мужские;10%, но не менее 2,2 евро за 1 кг;20%;ДС ТР ТС 017;обязательна\n8517130000;Смартфоны;0%;22%;не требуется;\n8467890000;Инструменты ручные прочие;5%;22%;СС;';
  const im = await call('POST', '/api/tnved/import', {}, { file: { originalname: 'tnved.csv', buffer: Buffer.from(csv) } }); assert.equal(im.body.added, 3);
  let s = await call('GET', '/api/tnved/search?q=' + encodeURIComponent('куртк муж')); assert.equal(s.body.items[0].code, '6201400000');
  s = await call('GET', '/api/tnved/search?q=8517'); assert.equal(s.body.items[0].code, '8517130000');
  s = await call('GET', '/api/tnved/search?q=' + encodeURIComponent('смартфон')); assert.equal(s.body.total, 1);
  const lk = await call('GET', '/api/tnved/lookup?code=6201400000'); assert.equal(lk.body.duty_type, 'min'); assert.equal(lk.body.eur_per_kg, 2.2); assert.equal(lk.body.vat_rate, 22);
  const cert = await call('GET', '/api/tnved/cert?code=6201400000'); assert.equal(cert.body.cert.doc_type, 'ДС'); assert.ok(cert.body.honest_sign.required);
  const parent = await call('GET', '/api/tnved/code/62014000'); assert.equal(parent.status, 404);
  assert.equal((await call('GET', '/api/tnved/stats')).body.count, 3);
});

test('аналитика, отгулы, очередь заявок, почта и бот', async () => {
  const { call, crm, sent } = setupAll();
  await call('POST', '/api/company/staff', { name: 'Анна' }); await call('POST', '/api/company/staff', { name: 'Олег' });
  const td = new Date().toISOString().slice(0, 10);
  const off = await call('POST', '/api/timeoff', { manager: 'Олег', kind: 'vacation', date_from: td, date_to: td }); assert.equal(off.body.item.status, 'approved');
  await call('PATCH', '/api/mail/queue/managers', { managers: [{ name: 'Олег', active: true }, { name: 'Анна', active: true }] });
  await call('POST', '/api/mail/queue/toggle');
  const deal = crm.create({ contactName: 'Сайт', contactPhone: '+79001112233', funnel: 'Входящие', source: 'Сайт', leadId: 'x1', activityText: 'Новая заявка', activityType: 'lead' }, 'Сайт');
  assert.equal(deal.manager, 'Анна', 'Олег в отпуске — заявка должна уйти Анне');
  const st = await call('GET', '/api/mail/stats'); assert.equal(st.body.today['заявка'], 1);
  const ms = await call('POST', '/api/mail/send', { to: 'client@test.ru', subject: 'КП', text: 'Добрый день', dealId: deal.id }); assert.ok(ms.body.ok); assert.equal(sent.length, 1);
  const won = await call('POST', '/api/deals', { title: 'Успех', manager: 'Анна' }); await call('PUT', '/api/deals/' + won.body.item.id + '/finance', { items: [{ kind: 'income', label: 'Оплата', amount: 100000 }, { kind: 'expense', label: 'Фрахт', amount: 70000 }] });
  await call('PATCH', '/api/deals/' + won.body.item.id, { status: 'won' });
  const an = await call('GET', '/api/analytics?period=month'); assert.equal(an.body.deals_closed_won, 1); const anna = an.body.by_manager.find(m => m.name === 'Анна'); assert.equal(anna.won, 1); assert.equal(anna.margin_sum, 30000);
  assert.equal(an.body.by_manager.find(m => m.name === 'Олег').time_off_days, 1);
  const h = await call('GET', '/api/holidays?year=2026'); assert.ok(h.body.ru.some(x => x.date === '2026-01-09')); assert.ok(h.body.cn.some(x => x.date === '2026-02-23'));
  await call('POST', '/api/bot/kb', { topic: 'Сроки доставки ЖД', content: 'ЖД из Китая в Москву идёт 25–35 дней.' });
  const { crm2 } = { crm2: null };
  const t = await call('POST', '/api/bot/test', { message: 'Какие сроки доставки ЖД?' }); assert.equal(t.body.source, 'kb'); assert.match(t.body.answer, /25–35/);
  const sec = await call('GET', '/api/security'); assert.ok(sec.body.secrets.every(s => typeof s.set === 'boolean' && !('value' in s)));
  const ex = await call('POST', '/api/company/entities/extract', {}, { file: { originalname: 'card.txt', mimetype: 'text/plain', buffer: Buffer.from('ООО «Ромашка»\nИНН 7701234567 КПП 770101001\nОГРН 1027700000000\nБИК 044525225\nР/с 40702810900000000001\nК/с 30101810400000000225') } });
  assert.equal(ex.body.data.inn, '7701234567'); assert.equal(ex.body.data.bik, '044525225'); assert.equal(ex.body.data.account, '40702810900000000001');
});

test('клиенты: база из сделок, поиск дублей и объединение', async () => {
  const { call } = setupAll();
  await call('POST', '/api/deals', { title: 'A', contactName: 'Пётр', company: 'ООО Насосы', contactPhone: '+7 901 222-33-44' });
  await call('POST', '/api/deals', { title: 'B', contactName: 'Пётр', company: 'ООО Насосы', contactPhone: '89012223344' });
  let cl = await call('GET', '/api/crm/clients?sort=added'); assert.equal(cl.body.items.length, 1, 'один клиент по телефону'); assert.equal(cl.body.items[0].deals, 2);
  const c2 = await call('POST', '/api/crm/clients', { company: 'ООО Насосы', contact: 'Пётр П.' });
  const dup = await call('GET', '/api/crm/clients/duplicates?types=name'); assert.equal(dup.body.groups.length, 1);
  const p = cl.body.items[0].id; await call('POST', '/api/crm/clients/merge', { primary_id: p, duplicate_ids: [c2.body.id] });
  cl = await call('GET', '/api/crm/clients'); assert.equal(cl.body.items.length, 1); assert.ok(cl.body.items[0].contacts.some(k => k.name === 'Пётр П.'));
  await call('POST', '/api/crm/clients/' + p + '/entities', { company_name: 'ООО «Насосы»', inn: '7701234567' });
  assert.equal((await call('GET', '/api/crm/clients/' + p)).body.item.entities.length, 1);
});
