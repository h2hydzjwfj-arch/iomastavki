'use strict';
// Проверка кода ТН ВЭД для сайта и бота (tnved-check.js) — на сохранённых страницах alta.ru, без интернета.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const T = require('../tnved-check');

const FIX = path.join(__dirname, '..', 'tools', 'tnved_fixtures');
const page = code => fs.readFileSync(path.join(FIX, `alta_${code}.html`), 'utf8');
const fakeGet = calls => async url => {
  calls && calls.push(url);
  const code = url.replace(/\/$/, '').split('/').pop();
  const f = path.join(FIX, `alta_${code}.html`);
  return fs.existsSync(f) ? { status: 200, text: page(code) } : { status: 404, text: '' };
};
const RATES = { date: '07.11.2026', rates: { USD: 81.6699, EUR: 91.601, CNY: 12.1816 } };
const deps = (extra) => Object.assign({ get: fakeGet(), rates: async () => RATES }, extra || {});
test.beforeEach(() => T._cache.clear());

test('ТН ВЭД: ввод — код, суммы, формат', () => {
  assert.equal(T.cleanCode('6201.40.000.0'), '6201400000');
  assert.equal(T.cleanCode(' 6403 19 000 0 '), '6403190000');
  assert.throws(() => T.cleanCode('64031900'), e => e.status === 400);
  assert.equal(T.parseAmount('1 250 000,50 ₽'), 1250000.5);
  assert.equal(T.parseAmount('1.250.000'), 1250000);
  assert.equal(T.parseAmount('', 'Вес', true), null);
  assert.throws(() => T.parseAmount('много'), /не похоже на число/);
  assert.equal(T.fmtMoney(1231), '1 231');
  assert.equal(T.fmtMoney(22000000), '22 000 000');
  assert.equal(T.fmtMoney(91.601, 2), '91.60');
});

test('ТН ВЭД: таможенный сбор по шкале 2026 и фиксированный для радиоэлектроники', () => {
  const cases = [[1, 1231], [200000, 1231], [200000.01, 2462], [450000, 2462], [500000, 4924], [1200000, 4924], [2700000, 13541],
    [4200000, 18465], [5500000, 21344], [10000000, 49240], [10000000.01, 73860], [50000000, 73860]];
  for (const [v, fee] of cases) assert.equal(T.customsFee(v), fee, String(v));
  assert.equal(T.customsFee(100000, null, true), 73860);
});

test('ТН ВЭД: разбор ставок пошлины', () => {
  let d = T.parseDuty('15% ');
  assert.deepEqual([d.mode, d.parts[0].kind, d.parts[0].value], ['single', 'ad_valorem', 15]);
  d = T.parseDuty('0.34 евр/пару ');
  assert.deepEqual([d.parts[0].kind, d.parts[0].currency, d.parts[0].unit], ['specific', 'EUR', 'пару']);
  d = T.parseDuty('10% , но не менее 2.25 евро/кг');
  assert.equal(d.text, '10%, но не менее 2.25 евро/кг');
  assert.deepEqual([d.mode, d.parts.length, d.parts[1].unit], ['min', 2, 'кг']);
  d = T.parseDuty('5% плюс 0,1 евро за 1 кг');
  assert.deepEqual([d.mode, d.parts[1].value], ['plus', 0.1]);
  d = T.parseDuty('3 доллара/шт');
  assert.deepEqual([d.parts[0].currency, d.parts[0].unit], ['USD', 'шт']);
  assert.equal(T.parseDuty('0').text, '0%');
  assert.equal(T.parseDuty('Беспошлинно').parts[0].value, 0);
  assert.throws(() => T.parseDuty('по решению комиссии'), e => e.kind === 'format_changed');
});

test('ТН ВЭД: комбинированная пошлина — берётся большее; без количества — подсказка', () => {
  const d = T.parseDuty('10%, но не менее 2.25 евро/кг');
  let c = T.computeDuty(d, 500000, 300, null, { EUR: 91.601 });
  assert.equal(T.fmtMoney(c.amount), '61 831'); assert.match(c.detail, /берётся большее/);
  c = T.computeDuty(d, 5000000, 300, null, { EUR: 91.601 });
  assert.equal(T.fmtMoney(c.amount), '500 000');
  c = T.computeDuty(T.parseDuty('0.34 евр/пару'), 100000, null, null, { EUR: 90 });
  assert.equal(c.amount, null); assert.match(c.missing, /пар/);
  c = T.computeDuty(T.parseDuty('5% плюс 0.1 евро/кг'), 100000, 1000, null, { EUR: 90 });
  assert.equal(c.amount, 5000 + 9000);
});

test('ТН ВЭД: страницы alta.ru — дерево, ставки, НДС', () => {
  let info = T.parseAltaPage(page('6403190000'), '6403190000');
  assert.deepEqual(info.levels.map(l => l.code), ['64-67', '64', '6403', '6403 1', '6403 19 000 0']);
  assert.equal(info.levels.at(-1).text, 'прочая');
  assert.equal(info.duty.text, '0.34 евр/пару');
  assert.deepEqual(info.vat.map(v => v.rate), [22]);
  info = T.parseAltaPage(page('0401101000'), '0401101000');
  assert.deepEqual([...new Set(info.vat.map(v => v.rate))].sort(), [10, 22]);
  const [head, extra] = T.vatLines(info.vat);
  assert.equal(head, '22% (базовая)'); assert.ok(extra[0].startsWith('10% — для использования в пищевых'));
  info = T.parseAltaPage(page('8471300000'), '8471300000');
  assert.equal(info.duty.text, '0%'); assert.match(info.duty.note, /преференциальный/);
  assert.throws(() => T.parseAltaPage(page('6403190000'), '6403190001'), e => e.status === 404);
  assert.throws(() => T.parseAltaPage('<html><body>Сервис временно недоступен</body></html>', '6403190000'), e => e.kind === 'format_changed');
});

test('ТН ВЭД: отчёт в формате ТЗ — комбинированная пошлина по весу', async () => {
  const res = await T.check({ code: '6201 40 000 0', value: '500 000', weight: '300' }, deps());
  const lines = res.report.split('\n');
  assert.equal(lines[0], '📋 Код: 6201400000');
  assert.ok(lines[1].startsWith('🔧 XI. Текстильные материалы'));
  assert.ok(res.report.includes('   ↳ 6201 40 000 0 — из химических нитей'));
  assert.ok(res.report.includes('💰 Пошлина: 10%, но не менее 2.25 евро/кг ≈ 61 831 ₽'));
  assert.ok(res.report.includes('(курс ЦБ на 07.11.2026)'));
  assert.ok(res.report.includes('🧾 НДС: 22% (базовая)'));
  assert.ok(res.report.includes('   10% — для мальчиков'));
  assert.ok(res.report.endsWith('⚡ Сбор: 4 924 ₽ (при стоимости груза 500 000 ₽)'));
  assert.equal(res.fee, 4924);
});

test('ТН ВЭД: специфическая пошлина — без количества курс не запрашивается', async () => {
  let rateCalls = 0;
  const d = deps({ rates: async () => { rateCalls++; return RATES; } });
  let res = await T.check({ code: '6403190000', value: '150000' }, d);
  assert.equal(rateCalls, 0);
  assert.ok(res.report.includes('💰 Пошлина: 0.34 евр/пару\n   Для расчёта суммы укажите количество пар'));
  assert.ok(res.report.includes('⚡ Сбор: 1 231 ₽ (при стоимости груза 150 000 ₽)'));
  res = await T.check({ code: '6403190000', value: '150000', qty: '200' }, d);
  assert.equal(rateCalls, 1);
  assert.ok(res.report.includes('≈ 6 229 ₽')); assert.ok(res.report.includes('0.34 € × 200 пар × 91.60 ₽'));
});

test('ТН ВЭД: без стоимости, радиоэлектроника, кеш, ошибки', async () => {
  T.loadBase(path.join(__dirname, 'нет-такого-файла.json')); // проверяем ошибки без запасного справочника
  const calls = [];
  let res = await T.check({ code: '8471300000' }, deps({ get: fakeGet(calls) }));
  assert.ok(res.report.includes('💰 Пошлина: 0%\n🧾 НДС')); assert.ok(res.report.endsWith('⚡ Сбор: укажите стоимость груза, ₽'));
  assert.match((await T.check({ code: '0401101000' }, deps())).report, /💰 Пошлина: 15%\n   Для расчёта суммы укажите стоимость груза в ₽/);
  res = await T.check({ code: '8471300000', value: '900000' }, deps({ get: fakeGet(calls), local: () => ({ exact: true, radio: true }) }));
  assert.equal(res.fee, 73860); assert.match(res.report, /73 860 ₽ \(при стоимости груза 900 000 ₽\) — товар из Приложения № 1/);
  assert.equal(calls.length, 1); // вторая проверка того же кода — из кеша
  await assert.rejects(T.check({ code: '0000000000', value: '1000' }, deps()), e => e.status === 404);
  await assert.rejects(T.check({ code: '123', value: '1000' }, deps()), e => e.status === 400);
  await assert.rejects(T.check({ code: '6403190000', value: '1000' }, deps({ get: async () => { throw T.TnvedError && new T.TnvedError('нет сети', 503, 'source_unavailable'); } })), e => e.status === 503);
});

test('ТН ВЭД: команда бота', () => {
  assert.equal(T.parseCommand('привет'), null);
  assert.deepEqual(T.parseCommand('/tnved 6201 40 000 0 500 000 300кг'), { code: '6201400000', value: '500 000', weight: '300', qty: '' });
  assert.deepEqual(T.parseCommand('тн вэд 6403190000 150 000 200 пар'), { code: '6403190000', value: '150 000', weight: '', qty: '200' });
  assert.deepEqual(T.parseCommand('/tnved@iomabot 6201400000 1 250 000 вес 300 кол 120'), { code: '6201400000', value: '1 250 000', weight: '300', qty: '120' });
  assert.deepEqual(T.parseCommand('/tnved 6201.40.000.0 750000,50 ₽ 12.5 кг'), { code: '6201400000', value: '750000,50', weight: '12.5', qty: '' });
  assert.equal(T.parseCommand('/tnved').code, '');
});

test('ТН ВЭД: alta.ru недоступен — ставки из локального справочника с пометкой; нет кода — подсказка', async () => {
  // мини-справочник в формате reference/tnved-base.json из сохранённых страниц
  const nodes = [], idx = new Map(), codes = {};
  for (const c of ['6201400000', '6403190000', '8471300000', '0401101000']) {
    const info = T.parseAltaPage(page(c), c);
    codes[c] = { cat: 'тест', path: info.levels.map(l => { const k = l.code + '|' + l.text; if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push([l.code, l.text]); } return idx.get(k); }),
      duty: info.duty.text, ...(info.duty.note ? { note: info.duty.note } : {}), vat: info.vat.map(v => (v.condition ? [v.rate, v.condition] : [v.rate])) };
  }
  const file = path.join(require('os').tmpdir(), 'tnved-base-test.json');
  fs.writeFileSync(file, JSON.stringify({ version: 1, fetchedAt: '2026-11-07', nodes, codes }));
  T.loadBase(file);
  try {
    const offline = { get: async () => { throw new T.TnvedError('Справочник alta.ru недоступен (нет ответа).', 503, 'source_unavailable'); }, rates: async () => RATES };
    const res = await T.check({ code: '6201400000', value: '500000', weight: '300' }, offline);
    assert.strictEqual(res.source, 'local');
    assert.ok(res.report.includes('💰 Пошлина: 10%, но не менее 2.25 евро/кг ≈ 61 831 ₽'));
    assert.ok(res.report.includes('ℹ️ alta.ru недоступен — ставки из локального справочника на 07.11.2026'));
    assert.strictEqual(T._cache.has('6201400000'), false, 'запасной ответ не кешируется');
    await assert.rejects(T.check({ code: '8471300001', value: '1000' }, offline), e => e.status === 503 && /похожие: 8471300000/.test(e.message));
    const changed = { get: async () => ({ status: 200, text: '<html>заглушка</html>' }) };
    assert.strictEqual((await T.check({ code: '6403190000', value: '150000' }, changed)).source, 'local');
    assert.deepStrictEqual(T.searchBase('вычислительные портативные').map(x => x.code), ['8471300000']);
    assert.deepStrictEqual(T.searchBase('6403').map(x => x.code), ['6403190000']);
    assert.strictEqual(T.searchBase('').length, 0);
  } finally { T.loadBase(path.join(__dirname, 'нет-такого-файла.json')); }
});

test('ТН ВЭД: встроенный справочник reference/tnved-base.json цел и разбирается', () => {
  const file = path.join(__dirname, '..', 'reference', 'tnved-base.json');
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  const codes = Object.entries(b.codes);
  assert.ok(codes.length >= 200 && codes.length <= 400, 'кодов: ' + codes.length);
  assert.match(b.fetchedAt, /^\d{4}-\d{2}-\d{2}$/);
  for (const [code, e] of codes) {
    assert.match(code, /^\d{10}$/);
    assert.ok(e.path.length >= 3 && e.path.every(i => Array.isArray(b.nodes[i])), code + ': путь');
    assert.ok(T.parseDuty(e.duty, e.note).parts.length, code + ': ставка ' + e.duty);
    assert.ok(e.vat.length && e.vat.every(v => typeof v[0] === 'number'), code + ': НДС');
  }
  T.loadBase(file);
  const one = codes[0][0]; const info = T.baseInfo(one);
  assert.strictEqual(info.source, 'local'); assert.ok(info.levels.length >= 3);
  assert.ok(T.searchBase('станки').length > 0 || T.searchBase('машины').length > 0);
});

test('ТН ВЭД: поиск по бытовым названиям во встроенном справочнике', () => {
  T.loadBase(path.join(__dirname, '..', 'reference', 'tnved-base.json'));
  assert.deepStrictEqual(T.searchBase('ноутбук').map(x => x.code), ['8471300000']);
  assert.ok(T.searchBase('шины').every(x => x.code.startsWith('4011')));
  assert.ok(!T.searchBase('машины вычислительные').some(x => x.code.startsWith('4011')), '«машины» — не «шины»');
  assert.ok(T.searchBase('станок ЧПУ').every(x => /^84(5[6-9]|6[0-5])/.test(x.code)));
});
