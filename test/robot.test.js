'use strict';
// Робот-помощник администратора: разбор текста и файлов по правилам и «Применить» — агент, ставки, груз, текст и цвет сайта.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { fakeApp, admin, upload } = require('./fakeapp');
const { createStore } = require('../portal');
const R = require('../robot');

function setup(ai) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ioma-robot-'));
  const app = fakeApp(); const store = createStore(dir, null);
  const str = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const num = v => { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
  const newId = (n = 6) => require('crypto').randomBytes(n).toString('hex');
  const crm = require('../crm').setup(app, { store, admin, upload, str, num, newId });
  const merged = [];
  R.setup(app, { store, admin, upload, str, newId, crm, ai, mergeRates: (recs, src) => { merged.push(...recs.map(r => ({ ...r, src }))); return { added: recs.length }; } });
  return { app, store, merged, call: (m, u, b, x) => app.call(m, u, b, x) };
}

test('робот по правилам: агент, КП со ставками, груз, текст сайта, цвет', () => {
  let it = R.rules('Добавь агента ООО Восток Карго, Иван Петров, ivan@vostok-cargo.ru, +7 914 555 12 34, авто и ЖД');
  assert.equal(it.length, 1); assert.equal(it[0].kind, 'agent');
  assert.deepEqual([it[0].data.company, it[0].data.contact, it[0].data.email, it[0].data.transport], ['ООО Восток Карго', 'Иван Петров', 'ivan@vostok-cargo.ru', 'Авто, ЖД']);
  it = R.rules('Rate Shanghai - Moscow by rail: USD 4650 / 40HQ, transit 25-30 days, valid till 30.11.\nBest regards,\nLily Wang\nSunrise Logistics Co., Ltd\nlily@sunrise-log.cn');
  const rates = it.find(x => x.kind === 'rates'); assert.ok(rates, 'ставки найдены');
  assert.equal(rates.data.from, 'Шанхай'); assert.equal(rates.data.to, 'Москва'); assert.equal(rates.data.mode, 'rail');
  assert.equal(rates.data.rates[0].rate, 4650); assert.equal(rates.data.rates[0].basis, 'container'); assert.match(rates.data.rates[0].validUntil, /^\d{4}-11-30$/);
  assert.equal(it.find(x => x.kind === 'agent').data.contact, 'Lily Wang');
  it = R.rules('Груз: сумки и рюкзаки, 780 кг, 6 мест, 120x80x100 см, из Синьчжоу в Москву, авиа');
  assert.deepEqual(it[0], { kind: 'cargo', data: { weight: 780, dims: '120×80×100 см', places: 6, cargo: 'Сумки и рюкзаки', mode: 'air', from: 'Синьчжоу', to: 'Москва' } });
  it = R.rules('Баллистическая ткань 15 т, 5 машин, Иу — Москва'); assert.equal(it[0].data.weight, 15000); assert.equal(it[0].data.cargo, 'Баллистическая ткань'); assert.equal(it[0].data.note, 'Машин: 5');
  assert.deepEqual(R.rules('Замени «Купим и привезём» на «Купим, проверим и привезём»')[0], { kind: 'text', data: { find: 'Купим и привезём', replace: 'Купим, проверим и привезём' } });
  assert.deepEqual(R.rules('вместо "Расчёт ставки" напиши "Рассчитать доставку"')[0].data, { find: 'Расчёт ставки', replace: 'Рассчитать доставку' });
  assert.deepEqual(R.rules('Сделай акцентный цвет #d35400')[0].data, { accent: '#D35400' });
  assert.deepEqual(R.rules('верни цвета как было')[0].data, { reset: true });
  assert.equal(R.rules('сделай цвет кнопок темнее')[0].data.accent, R.shade('#2B66F0', -0.18));
  assert.deepEqual(R.rules('привет, как дела?'), []);
  // города в падежах и по-английски
  assert.deepEqual(R.route('из Гуанчжоу до Екатеринбурга'), { from: 'Гуанчжоу', to: 'Екатеринбург' });
  assert.deepEqual(R.route('Yiwu to St Petersburg'), { from: 'Иу', to: 'Санкт-Петербург' });
});

test('робот: «Применить» раскладывает по местам, правки сайта видны всем и отменяются', async () => {
  const { call, store, merged } = setup(null);
  let r = await call('POST', '/api/robot/parse', { text: 'Добавь агента ООО Восток Карго, Иван Петров, ivan@vostok-cargo.ru, авто' });
  assert.equal(r.status, 200); assert.equal(r.body.ai, 'none'); assert.equal(r.body.items[0].kind, 'agent');
  r = await call('POST', '/api/robot/apply', { kind: 'agent', data: r.body.items[0].data }); assert.match(r.body.message, /Агент добавлен: ООО Восток Карго/);
  r = await call('POST', '/api/robot/apply', { kind: 'agent', data: { company: 'ооо восток карго', phone: '+7 900 000-00-00' } }); assert.match(r.body.message, /уже был/);
  let d = store.load(); assert.equal(d.crmAgents.length, 1); assert.equal(d.crmAgents[0].phone, '+7 900 000-00-00'); assert.deepEqual(d.crmAgents[0].modes, ['road']);
  // повторный разбор видит, что агент уже есть
  r = await call('POST', '/api/robot/parse', { text: 'Добавь агента ООО Восток Карго, ivan@vostok-cargo.ru' }); assert.equal(r.body.items[0].exists.company, 'ООО Восток Карго');
  // ставки: отмеченные строки — в базу ставок
  r = await call('POST', '/api/robot/apply', { kind: 'rates', data: { company: 'Sunrise', from: 'Шанхай', to: 'Москва', mode: 'rail', addAgent: true, rates: [{ rate: 4650, currency: 'USD', basis: 'container', unit: 'контейнер', container: "40'HC", validUntil: '2026-11-30' }, { rate: 2650, currency: 'USD', basis: 'container', use: false }] } });
  assert.equal(r.status, 200); assert.equal(merged.length, 1); assert.equal(merged[0].rate, 4650); assert.equal(merged[0].mode, 'rail'); assert.equal(merged[0].src, 'robot'); assert.equal(merged[0].validUntil, '2026-11-30');
  assert.ok(store.load().crmAgents.some(a => a.company === 'Sunrise'), 'агент из КП добавлен');
  r = await call('POST', '/api/robot/apply', { kind: 'rates', data: { company: 'X', rates: [{ rate: 0 }] } }); assert.equal(r.status, 400);
  // груз → сделка в CRM
  r = await call('POST', '/api/robot/apply', { kind: 'cargo', data: { cargo: 'Сумки', from: 'Синьчжоу', to: 'Москва', weight: '780', places: 6, mode: 'air', dims: '120×80×100 см' } });
  assert.equal(r.status, 200); d = store.load(); const deal = d.deals.find(x => x.id === r.body.dealId);
  assert.ok(deal); assert.equal(deal.cargo, 'Сумки'); assert.equal(deal.weight, 780); assert.equal(deal.source, 'Робот'); assert.match(deal.note, /Габариты: 120×80×100 см/);
  r = await call('POST', '/api/robot/apply', { kind: 'cargo', data: { from: 'Иу' } }); assert.equal(r.status, 400);
  // текст и цвет сайта
  r = await call('POST', '/api/robot/apply', { kind: 'text', data: { find: 'Купим в Китае.', replace: 'Найдём и купим в Китае.', en: 'We find and buy in China.' } }); assert.equal(r.status, 200);
  r = await call('POST', '/api/robot/apply', { kind: 'theme', data: { accent: '#2b5bd7' } }); assert.equal(r.status, 200);
  r = await call('GET', '/api/site/custom'); assert.deepEqual(r.body.texts, [{ find: 'Купим в Китае.', replace: 'Найдём и купим в Китае.', en: 'We find and buy in China.', zh: '' }]); assert.deepEqual(r.body.theme, { accent: '#2B5BD7' });
  r = await call('POST', '/api/robot/apply', { kind: 'theme', data: { accent: 'синий' } }); assert.equal(r.status, 400);
  const id = (await call('GET', '/api/robot')).body.texts[0].id;
  r = await call('DELETE', '/api/robot/texts/' + id); assert.equal(r.status, 200);
  r = await call('POST', '/api/robot/apply', { kind: 'theme', data: { reset: true } });
  r = await call('GET', '/api/site/custom'); assert.deepEqual(r.body.texts, []); assert.equal(r.body.theme, null);
  r = await call('POST', '/api/robot/apply', { kind: 'nope', data: {} }); assert.equal(r.status, 400);
});

test('робот: список агентов из CSV, файл без текста, ИИ и откат на правила', async () => {
  const csv = 'Компания;Контакт;Почта;Транспорт\nTrans Asia Ltd;Ли Мин;li@trans.cn;ЖД, авто\nSky Cargo;;sky@cargo.ru;Авиа\n';
  let { call, store } = setup(null);
  let r = await call('POST', '/api/robot/parse', {}, { file: { originalname: 'agents.csv', buffer: Buffer.from(csv), mimetype: 'text/csv' } });
  assert.equal(r.body.items[0].kind, 'agents'); assert.equal(r.body.items[0].data.items.length, 2);
  r = await call('POST', '/api/robot/apply', { kind: 'agents', data: r.body.items[0].data }); assert.match(r.body.message, /добавлено 2/);
  assert.deepEqual(store.load().crmAgents.map(a => a.company), ['Trans Asia Ltd', 'Sky Cargo']);
  r = await call('POST', '/api/robot/parse', {}, { file: { originalname: 'kp.pdf', buffer: Buffer.from('%PDF-1.4'), mimetype: 'application/pdf' } });
  assert.equal(r.body.items.length, 0); assert.match(r.body.note, /PDF и фото робот читает только с подключённым ИИ/);
  r = await call('POST', '/api/robot/parse', { text: '' }); assert.equal(r.status, 400);
  // с ИИ: его ответ, а если ИИ упал — правила
  let asked = null;
  ({ call } = setup({ enabled: () => true, run: async input => { asked = input; return '```json\n{"items":[{"kind":"cargo","data":{"cargo":"Ткань","weight":15000,"from":"Иу","to":"Москва"}},{"kind":"bad","data":{}}]}\n```'; } }));
  r = await call('POST', '/api/robot/parse', { text: 'нужно привезти ткань' }); assert.equal(r.body.ai, 'ok'); assert.equal(r.body.items.length, 1); assert.equal(r.body.items[0].data.weight, 15000);
  assert.match(asked[0].content[0].text, /робот-помощник администратора/);
  ({ call } = setup({ enabled: () => true, run: async () => { throw new Error('timeout'); } }));
  r = await call('POST', '/api/robot/parse', { text: 'Замени «А» на «Б»' }); assert.equal(r.body.ai, 'failed'); assert.equal(r.body.items[0].kind, 'text');
});
