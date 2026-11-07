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
  const tn = require('../tnved').setup(app, { admin, upload, DATA_DIR: dir, cloud: null, vedSettings: crm2.vedSettings, affected: crm2.tnvedAffected });
  const crm3 = require('../crm3').setup(app, { store, admin, upload, str, newId, rates: async () => ({ date: '06.11.2026', rates: { USD: 80, EUR: 92, CNY: 11 } }), mail: { enabled: () => true, kind: () => 'test', send: async (to, subject, text) => { sent.push({ to, subject, text }); } }, publicAgents: () => [{ id: 1, company: 'Multiwell', contact: 'Kane', email: 'kane@example.com', modes: ['rail', 'road', 'sea'] }], newCalcDoc: (d, o) => crm2.newCalcDoc(d, o) });
  return { app, store, crm, crm2, crm3, tn, sent, call: (m, u, b, x) => app.call(m, u, b, x) };
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

test('калькулятор ВЭД сходится с рабочей таблицей «Контракт» (налог 2,2% от всех строк)', () => {
  // Корпус турбины: инвойс 70 296 ¥, пошлина 12,5%, фрахт 25 800 ¥, страховка 10 000 ₽, комиссия 3%, декларант 25 000 ₽, прибыль 6 400 ¥, курс 11,567
  const rates = { CNY: 11.567, USD: 80, EUR: 92 };
  const d = VED.newDoc('our_contract', 'CNY'); d.transport_mode = 'sea'; d.freight_total = 25800; d.freight_currency = 'CNY'; d.insurance_amount = 10000; d.insurance_currency = 'RUB';
  d.items[0] = Object.assign(VED.newItem('CNY'), { name: 'Корпус турбины', tnved_code: '4202229000', invoice_amount: 70296, invoice_currency: 'CNY', weight: 700, duty_rate: 12.5, vat_rate: 22, auto_lookup: false });
  d.extra_costs = [{ label: 'Комиссия за перевод', amount: 3, is_percent_of_invoice: true }, { label: 'Декларант', amount: 25000, currency: 'RUB' }, { label: 'Прибыль компании', amount: 6400, currency: 'CNY', rate_mode: 'cbr' }];
  const r = VED.calcDoc(d, { rates, settings: { taxOnExpensesPct: 2.2 } });
  const cny = v => Math.round(v / 11.567 * 100) / 100;
  assert.ok(Math.abs(cny(r.duty_sum_rub + r.vat_sum_rub) - 36117.8) < 0.05, 'таможенные платежи ' + cny(r.duty_sum_rub + r.vat_sum_rub));
  assert.equal(r.customs_fee_rub, 4924);
  assert.ok(Math.abs(cny(r.tax_on_expenses_rub) - 3171.83) < 0.05, 'налоги ' + cny(r.tax_on_expenses_rub));
});

test('ТН ВЭД: история обновлений — новые, нет в файле, изменённые ставки, задетые сделки', async () => {
  const { call, crm2 } = setupAll();
  const id = (await call('POST', '/api/deals', { title: 'Куртки', funnel: 'Контракт West Asia' })).body.item.id;
  const c = await call('POST', '/api/calc', { dealId: id, calc_type: 'our_contract' });
  await call('PATCH', '/api/calc/' + c.body.id, { items: [{ ...c.body.doc.items[0], tnved_code: '6201400000', invoice_amount: 1000 }] });
  const up = (csv, mode) => call('POST', '/api/tnved/import', mode ? { mode } : {}, { file: { originalname: 'tnved.csv', buffer: Buffer.from(csv) } });
  const a = await up('Код;Наименование;Пошлина;НДС\n6201400000;Куртки мужские;10%;22%\n8517130000;Смартфоны;0%;22%\n');
  assert.ok(a.body.diff.first); assert.equal(a.body.diff.added_n, 2);
  const b = await up('Код;Наименование;Пошлина;НДС\n6201400000;Куртки мужские;12%;22%\n8471300000;Ноутбуки;0%;22%\n', 'replace');
  assert.equal(b.body.diff.added_n, 1); assert.equal(b.body.diff.removed_n, 1); assert.equal(b.body.diff.rate_n, 1); assert.equal(b.body.diff.affected_n, 1);
  const list = await call('GET', '/api/tnved/diffs'); assert.equal(list.body.items.length, 2);
  const full = await call('GET', '/api/tnved/diffs/' + b.body.diff.id); assert.equal(full.body.item.affected[0].dealId, id); assert.match(full.body.item.rate[0].new, /12%/);
});

test('ставки агентов: срок действия, надбавка к курсу, кто прислал', () => {
  const C = require('../crm3'), T = '2026-11-07';
  assert.equal(C.validDate('30.11', T), '2026-11-30'); assert.equal(C.validDate('05.01', T), '2027-01-05'); assert.equal(C.validDate('01.08', T), '2026-08-01');
  assert.equal(C.validDate('28.12', '2027-01-10'), '2026-12-28'); assert.equal(C.validDate('30 ноября 2026', T), '2026-11-30'); assert.equal(C.validDate('Nov 30, 2026', T), '2026-11-30');
  assert.equal(C.validDate('конца месяца', T), '2026-11-30'); assert.equal(C.validDate('31.02', T), ''); assert.equal(C.validDate('', T), '');
  assert.equal(C.validOf('Ставка актуальна до конца месяца'), 'конца месяца'); assert.equal(C.validOf('Доставка до Москвы 25 дней'), '');
  assert.equal(C.fxOf('оплата в рублях по курсу ЦБ на день оплаты + 2%'), 2); assert.equal(C.fxOf('CBR+1.5%'), 1.5); assert.equal(C.fxOf('тел. +7 953 550 56 54'), 0);
  const txt = 'Ставка: USD 4 200 / 40HQ, транзит 25-30 дней.\nОплата по курсу ЦБ + 2%. Ставка действует до 30.11.2026.\n\nС уважением,\nЛиза Ван\nRail Go Logistics Co., Ltd\nTel: +86 138 0013 8000\nlisa@railgo.example';
  const r = C.parseRatesPlain(txt)[0]; assert.equal(r.amount, 4200); assert.equal(r.valid, '30.11.2026'); assert.equal(r.fx, 2); assert.equal(r.transit, '25-30 дн.');
  assert.deepEqual(C.senderOf(txt), { email: 'lisa@railgo.example', phone: '+86 138 0013 8000', name: 'Лиза Ван', company: 'Rail Go Logistics Co., Ltd' });
  assert.equal(C.senderOf('Best regards, Tom Lee\nShenzhen Fast Cargo Ltd\nWeChat: tomlee88').wechat, 'tomlee88');
});

test('ставки агентов: архив просроченных, сравнение за партию, выбранная ставка уходит в расчёт контракта', async () => {
  const { call } = setupAll();
  const deal = (await call('POST', '/api/deals', { title: 'Станки', from: 'Иу', to: 'Москва', mode: 'rail', weight: 8000, volume: 30 })).body.item;
  const ag = (await call('GET', '/api/crm/agents')).body.items.filter(a => a.company === 'Multiwell').map(a => a.id);
  const rq = (await call('POST', '/api/deals/' + deal.id + '/rq', { agentIds: ag, subject: 'Ставка', text: 'Просим ставку' })).body.request;
  const r1 = await call('POST', '/api/rq/' + rq.id + '/replies', { itemId: rq.items[0].id, text: 'Ставка USD 4 200 / 40HQ, транзит 25 дней. Оплата по курсу ЦБ + 2%. Действует до 31.12.2099.\n\nС уважением,\nКейн\nkane@example.com' });
  assert.equal(r1.body.rates[0].fx, 2); assert.equal(r1.body.rates[0].validUntil, '2099-12-31'); assert.match(r1.body.rates[0].contact, /Кейн · kane@example.com/);
  assert.equal(r1.body.reply.sender.name, 'Кейн');
  await call('POST', '/api/rq/rates', { rqId: rq.id, agent: 'Old Cargo', amount: 3000, currency: 'USD', unit: 'контейнер', valid: '01.01.2020' });
  await call('POST', '/api/rq/rates', { rqId: rq.id, agent: 'Kg Line', amount: 0.5, currency: 'USD', unit: 'кг', valid: '31.12.2099' });
  const v = (await call('GET', '/api/deals/' + deal.id + '/rq')).body;
  const old = v.rates.find(t => t.agent === 'Old Cargo'), kg = v.rates.find(t => t.agent === 'Kg Line'), mw = v.rates.find(t => /^Multiwell/.test(t.agent));
  assert.ok(old.expired); assert.ok(!old.best); assert.equal(v.archived, 1);
  // за партию: 4200 × 80 × 1,02 = 342 720 ₽; 0,5 × 8000 кг × 80 = 320 000 ₽ — лучшая за кг, хоть просроченная и дешевле
  assert.equal(mw.totRub, 342720); assert.equal(kg.totRub, 320000); assert.equal(kg.qty, 8000); assert.ok(kg.best); assert.ok(!mw.best);
  const exp = await call('POST', '/api/rq/rates/' + old.id + '/to-calc', {}); assert.ok(exp.body.ok); // архивную можно взять осознанно
  const tc = await call('POST', '/api/rq/rates/' + mw.id + '/to-calc', {});
  assert.ok(tc.body.ok); assert.equal(tc.body.freight, 4200); assert.equal(tc.body.currency, 'USD'); assert.equal(tc.body.fx, 2); assert.equal(tc.body.created, false);
  const doc = (await call('GET', '/api/calc/' + tc.body.calcId)).body;
  assert.equal(doc.doc.freight_total, 4200); assert.equal(doc.doc.freight_currency, 'USD'); assert.equal(doc.doc.freight_fx, 2); assert.equal(doc.doc.kp_transit, '25 дн.'); assert.equal(doc.doc.kp_valid, '31.12.2099');
  assert.match(doc.doc.freight_src.agent, /^Multiwell/); assert.equal(doc.doc.calc_type, 'our_contract'); assert.equal(doc.doc.dealId, deal.id);
  const fr = doc.contract.lines.find(l => l.key === 'freight0' || /^freight/.test(l.key)); assert.ok(fr, 'фрахт есть в расчёте контракта');
  const v2 = (await call('GET', '/api/deals/' + deal.id + '/rq')).body; assert.equal(v2.rates.find(t => t.id === mw.id).inCalc, tc.body.calcId);
  const tk = await call('POST', '/api/rq/rates/' + kg.id + '/to-calc', { calcId: tc.body.calcId }); assert.equal(tk.body.freight, 4000); assert.equal(tk.body.qty, 8000);
  const d2 = (await call('GET', '/api/calc/' + tc.body.calcId)).body.doc; assert.equal(d2.freight_fx, 0); assert.equal(d2.freight_src.agent, 'Kg Line');
  const p = await call('PATCH', '/api/calc/' + tc.body.calcId, { freight_total: 5000 }); assert.ok(p.body.ok); assert.equal((await call('GET', '/api/calc/' + tc.body.calcId)).body.doc.freight_src, undefined);
  await call('PATCH', '/api/rq/rates/' + kg.id, { status: 'rejected' }); const rej = await call('POST', '/api/rq/rates/' + kg.id + '/to-calc', {}); assert.equal(rej.status, 400);
});

test('агенты: импорт базы, запрос ставок, ответ агента, лучшая ставка, перенос в финансы, прайсы', async () => {
  const { call, sent } = setupAll();
  const csv = 'Компания;Виды транспорта;Email;Контакт;Телефон\nAir Star;Авиа;ops@airstar.example;Лиза;+86 1\nRail Go;ЖД, Авто;sales@railgo.example;Том;+86 2\nAir Star;Авиа;ops@airstar.example;Лиза Ван;+86 1\n';
  const im = await call('POST', '/api/crm/agents/import', {}, { file: { originalname: 'agents.csv', buffer: Buffer.from(csv) } });
  assert.equal(im.body.added, 2); assert.equal(im.body.updated, 1);
  const all = await call('GET', '/api/crm/agents?mode=rail'); assert.ok(all.body.items.some(a => a.company === 'Rail Go') && all.body.items.some(a => a.company === 'Multiwell') && !all.body.items.some(a => a.company === 'Air Star'));
  const deal = (await call('POST', '/api/deals', { title: 'Станки', from: 'Иу', to: 'Москва', mode: 'rail', weight: 8000, volume: 30, funnel: 'Контракт West Asia' })).body.item;
  const draft = await call('GET', '/api/deals/' + deal.id + '/rq/draft'); assert.match(draft.body.text, /Иу → Москва/);
  const ids = all.body.items.filter(a => ['Rail Go', 'Multiwell'].includes(a.company)).map(a => a.id);
  const rq = await call('POST', '/api/deals/' + deal.id + '/rq', { agentIds: ids, subject: draft.body.subject, text: draft.body.text });
  assert.equal(rq.body.sent, 2); assert.equal(sent.length, 2);
  const it = rq.body.request.items;
  const r1 = await call('POST', '/api/rq/' + rq.body.request.id + '/replies', { itemId: it[0].id, text: 'Hello! Rate Yiwu - Moscow: USD 4 200 / 40HQ, transit 25 days. Can you confirm cargo ready date?' });
  assert.equal(r1.body.rates.length, 1); assert.equal(r1.body.rates[0].amount, 4200); assert.equal(r1.body.rates[0].unit, 'контейнер');
  await call('POST', '/api/rq/' + rq.body.request.id + '/replies', { itemId: it[1].id, text: 'Ставка: ¥28500 за контейнер 40HQ, срок 30 дней' });
  const v = await call('GET', '/api/deals/' + deal.id + '/rq');
  assert.equal(v.body.rates.length, 2); const best = v.body.rates.find(t => t.best); assert.equal(best.currency, 'CNY'); assert.equal(best.usd, 3918.75);
  assert.equal(v.body.questions.length, 1);
  const fin = await call('POST', '/api/rq/rates/' + best.id + '/finance', {}); assert.ok(fin.body.ok); assert.equal(fin.body.row.amount_orig, 28500); assert.equal(fin.body.row.rate, 11);
  const f = await call('GET', '/api/deals/' + deal.id + '/finance'); assert.equal(f.body.expense, 313500);
  const air = (await call('POST', '/api/deals', { title: 'Образцы', from: 'Шанхай', to: 'Москва', mode: 'air', weight: 100, funnel: 'Контракт West Asia' })).body.item;
  const refs = (await call('GET', '/api/deals/' + air.id + '/rq')).body.refs;
  assert.equal(refs[0].agent, 'QT Avia (ГК АТС)'); assert.equal(refs[0].est, 20500);
  const road = (await call('POST', '/api/deals', { title: 'Одежда', from: 'Гуанчжоу', to: 'Новосибирск', mode: 'auto', weight: 1000, funnel: 'Контракт West Asia' })).body.item;
  const rr = (await call('GET', '/api/deals/' + road.id + '/rq')).body.refs; assert.equal(rr[0].perKg, 65); assert.equal(rr[0].est, 65000);
});
