'use strict';
// Расчёт контракта: сверка с рабочими Excel-шаблонами владельца и с решениями из его ответов.
const test = require('node:test');
const assert = require('node:assert');
const K = require('../contract');

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps == null ? 0.02 : eps), `${msg || ''}: ${a} ≠ ${b}`);
const lineOf = (r, key) => (r.lines.find(l => l.key === key) || {}).amount;
// В шаблонах курс в таблице — «ЦБ − 1» = 11,567, значит ЦБ = 12,567
const rates = { CNY: 12.567, USD: 90.1, EUR: 104.2 };
const compat = { settings: { excelCompat: true }, rates };

test('шаблон «Контракт»: те же строки, но сбор в итоге один раз (147 385,38 ¥ вместо 147 820,44 ¥)', () => {
  const r = K.calc({ mode: 'our', currency: 'CNY', payment: 'bank', paymentPct: 3, insurancePct: 0.15,
    items: [{ name: 'Корпус', value: 70296, duty: '12.5%' }],
    freight: [{ label: 'Фрахт', amount: 25800, currency: 'CNY' }], declarant: 'ecp', margin: 7519.6 }, compat);
  assert.ok(r.ok, r.missing.join('; '));
  assert.equal(lineOf(r, 'invoice'), 70296);
  assert.equal(lineOf(r, 'payment'), 2108.88);                 // G4
  assert.equal(lineOf(r, 'insurance'), 105.44);                // G6 = 0,15% инвойса
  near(lineOf(r, 'customs'), 12012 + 23783.76, 0.01, 'пошлина + НДС'); // H2 + K2 (ТС = инвойс + фрахт = 96 096 ¥)
  near(lineOf(r, 'fee'), 425.69, 0.01, 'сбор 4 924 ₽ / 11,567');
  near(lineOf(r, 'declarant'), 2161.32, 0.01, 'декларант 25 000 ₽ / 11,567');
  assert.equal(r.customs.feeRub, 4924);
  near(r.sum, 147385.38, 0.05, 'итог без двойного сбора');
  assert.equal(r.total, 147386, 'итог вверх до целого юаня');
  assert.equal(r.taxPct, 2.2);
});

test('шаблон d15548: страховка 10 000 ₽ в ТС — 147 346,05 ¥', () => {
  const r = K.calc({ mode: 'our', currency: 'CNY', payment: 'bank', paymentPct: 3, insuranceFixedRub: 10000, insuranceInCV: true,
    items: [{ name: 'Корпус турбины', value: 70296, duty: '12.5%' }],
    freight: [{ label: 'Фрахт', amount: 25800, currency: 'CNY' }], declarant: 'ecp', margin: 6400 }, compat);
  near(lineOf(r, 'insurance'), 864.53, 0.01, 'страховка');
  near(lineOf(r, 'customs'), 36117.80, 0.02, 'ТС 96 960,53 ¥ → пошлина 12 120,07 + НДС');
  near(r.sum, 147346.05, 0.05, 'итог d15548');
  assert.equal(r.total, 147347);
});

test('шаблон c15855: три позиции, фрахт по весу брутто 10,03 ¥/кг, своя пошлина у каждой', () => {
  const w = [8934, 8935, 8934];
  const r = K.calc({ mode: 'our', currency: 'CNY', items: [
    { name: 'Стул', code: '9401', value: 3373467, gross: w[0], duty: '10%' },
    { name: 'Стол', code: '9403', value: 3373467, gross: w[1], duty: '12,5%' },
    { name: 'Качалка', code: '9401', value: 3373467, gross: w[2], duty: '8%' }],
  freight: [{ amount: 10.03 * (w[0] + w[1] + w[2]), currency: 'CNY' }] }, compat);
  assert.equal(r.freightPerKg, 10.03);
  const exp = [[89608.02, 3463075.02, 346307.50, 1184371.66], [89618.05, 3463085.05, 432885.63, 1289999.18], [89608.02, 3463075.02, 277046.00, 1099872.63]];
  r.items.forEach((it, i) => {
    near(it.freightShare, exp[i][0], 0.01, 'фрахт позиции ' + i);
    near(it.cv, exp[i][1], 0.01, 'ТС позиции ' + i);
    near(it.duty, exp[i][2], 0.01, 'пошлина позиции ' + i);
    near(it.duty + it.vatCur, exp[i][3], 0.02, 'итого таможня позиции ' + i);
  });
  // в шаблоне «Таможенные платежи» брали сумму ТС (10 389 235 ¥) — здесь сумма платежей
  near(lineOf(r, 'customs'), 1184371.66 + 1289999.18 + 1099872.63, 0.05, 'сумма платежей, а не ТС');
  assert.equal(r.declarant.codes, 2, 'два разных кода — декларант без доплаты');
});

test('решения из ответов: ТД вместе с +6%, сбор от стоимости товара, таможня по чистому ЦБ, рубли по «ЦБ − 1»', () => {
  const r = K.calc({ mode: 'our', currency: 'CNY', payment: 'cbr', td: true,
    items: [{ name: 'Сумка', code: '4202229000', value: 100000, gross: 700, duty: '12.5%' }],
    freight: [{ amount: 30000, currency: 'CNY' }, { label: 'Терминал', amount: 54750, currency: 'RUB', inCV: false }] }, { rates });
  assert.equal(lineOf(r, 'td'), 4000);                         // 4% от инвойса
  assert.equal(lineOf(r, 'payment'), 6240);                    // 6% от (инвойс + ТД)
  assert.equal(lineOf(r, 'insurance'), 150);                   // 0,15% от инвойса, обязательно в нашем контракте
  near(lineOf(r, 'freight1'), 54750 / 11.567, 0.01, 'рублёвый терминал по «ЦБ − 1»');
  // ТС = (100 000 + 30 000) ¥ × 12,567 = 1 633 710 ₽; терминал в ТС не входит
  assert.equal(r.customs.cvRub, 1633710);
  assert.equal(r.customs.dutyRub, 204213.75);
  assert.equal(r.customs.vatRub, r2((1633710 + 204213.75) * 0.22));
  // сбор — от стоимости товара: 100 000 ¥ × 12,567 = 1 256 700 ₽ → 13 541 ₽, по чистому ЦБ
  assert.equal(r.customs.feeBaseRub, 1256700); assert.equal(r.customs.feeRub, 13541);
  near(lineOf(r, 'fee'), 13541 / 12.567, 0.01, 'сбор по чистому ЦБ');
  near(lineOf(r, 'customs'), (204213.75 + r.customs.vatRub) / 12.567, 0.01, 'пошлина + НДС по чистому ЦБ');
  near(lineOf(r, 'declarant'), 25000 / 11.567, 0.01, 'декларант');
  // маржа по умолчанию — 2 × «на налоги» при нулевой марже; налоги считаются уже с маржой
  const base = r.lines.filter(l => !['margin', 'taxes'].includes(l.key)).reduce((s, l) => s + l.amount, 0);
  assert.equal(r.marginAuto, r2(2 * r2(base * 0.022)));
  assert.equal(lineOf(r, 'taxes'), r2((base + r.margin) * 0.022));
  assert.equal(r.total, Math.ceil(r.sum - 1e-9));
  assert.equal(r.totalRub, Math.round(r.total * 12.567));
  assert.equal(r.paymentNote, 'по курсу ЦБ + 6%');
  const b = K.calc({ mode: 'our', currency: 'CNY', payment: 'bank', items: [{ value: 1000, duty: '0' }] }, { rates });
  assert.equal(lineOf(b, 'payment'), 30); assert.equal(b.totalRub, null, 'по внутреннему курсу банка рубли не называем');
  function r2(v) { return K.round(v, 2); }
});

test('декларант: до 3 кодов включено, +350 ₽ за код; ЧЗ — 2 500 ₽ за 2 кода и +500 ₽; под печать брокера — 30 000 ₽', () => {
  const items = ['6201', '6202', '6203', '6204', '6205'].map((c, i) => ({ code: c + '000000', value: 1000, gross: 10, duty: '10%', chz: i < 3 }));
  const r = K.calc({ mode: 'our', items, declarant: 'broker' }, { rates });
  assert.equal(r.declarant.codes, 5); assert.equal(r.declarant.chzCodes, 3);
  assert.equal(r.declarant.rub, 30000 + 2 * 350 + 2500 + 500);
  assert.equal(K.calc({ mode: 'our', items, declarantRub: 18000 }, { rates }).declarant.rub, 18000);
});

test('пошлина за м², «но не менее» за кг, нет ставки — КП не формируется', () => {
  // когтеточка: 0,48 €/м²
  let r = K.calc({ mode: 'our', items: [{ name: 'Когтеточка', value: 10000, duty: '0,48 евро/м2', area: 1500 }] }, { rates });
  assert.ok(r.ok); assert.equal(r.customs.dutyRub, r2(0.48 * 1500 * 104.2));
  r = K.calc({ mode: 'our', items: [{ name: 'Когтеточка', value: 10000, duty: '0,48 евро/м2' }] }, { rates });
  assert.ok(!r.ok); assert.match(r.missing.join(' '), /площадь, м²/);
  // 10%, но не менее 2,25 €/кг нетто: 10 000 ¥ × 12,567 × 10% = 12 567 ₽ < 2,25 × 100 × 104,2 = 23 445 ₽
  r = K.calc({ mode: 'our', items: [{ value: 10000, net: 100, duty: '10%, но не менее 2,25 евро/кг' }] }, { rates });
  assert.equal(r.customs.dutyRub, 23445);
  r = K.calc({ mode: 'our', items: [{ name: 'Без кода', value: 10000 }] }, { rates });
  assert.ok(!r.ok); assert.match(r.missing.join(' '), /нет ставки пошлины/);
  function r2(v) { return K.round(v, 2); }
});

test('радиоэлектроника — сбор 73 860 ₽ при любой стоимости; часть фрахта до границы', () => {
  let r = K.calc({ mode: 'our', items: [{ value: 100, duty: '0', radio: true }] }, { rates });
  assert.equal(r.customs.feeRub, 73860); assert.ok(r.customs.feeRadio);
  r = K.calc({ mode: 'our', borderShare: 30, items: [{ value: 1000, duty: '10%' }], freight: [{ amount: 1000, currency: 'CNY' }] }, { rates });
  assert.equal(r.customs.cvRub, K.round(1000 * 12.567 + 0.3 * 1000 * 12.567, 2));
});

test('фрахт в долларах — по кросс-курсу ЦБ с надбавкой агента; остаток округления — на самую тяжёлую позицию', () => {
  const r = K.calc({ mode: 'our', items: [{ value: 1000, gross: 1, duty: '0' }, { value: 1000, gross: 1, duty: '0' }, { value: 1000, gross: 1, duty: '0' }],
    freight: [{ amount: 1000, currency: 'USD', fx: 2 }] }, { rates });
  const f = 1000 * 90.1 * 1.02 / 12.567;
  near(lineOf(r, 'freight'), f, 0.01, 'фрахт в ¥');
  near(r.items.reduce((s, it) => s + it.freightShare, 0), K.round(f, 2), 0.0001, 'доли сходятся до фэня');
  assert.deepEqual(K.split(100, [1, 1, 1]), [33.34, 33.33, 33.33]);
  assert.deepEqual(K.split(100, [1, 5, 1]), [14.29, 71.42, 14.29]);
});

test('контракт клиента (ТЭО): наценки к ставке агента, таможня справочно, без 2,2% и без инвойса в итоге', () => {
  const r = K.calc({ mode: 'client', items: [{ value: 50000, duty: '5%' }], freight: [{ amount: 3000, currency: 'USD' }],
    markups: [{ label: 'Наценка: море', amount: 200, currency: 'USD' }], declarant: 'ecp' }, { rates });
  assert.ok(!r.lines.some(l => l.key === 'invoice' || l.key === 'taxes' || l.key === 'customs'));
  near(r.profit, 200 * 90.1 / 12.567, 0.01, 'прибыль = наценка');
  assert.ok(r.customs.dutyRub > 0 && !r.customs.inTotal, 'пошлина посчитана справочно');
  assert.equal(r.paymentNote, '');
});

test('нет курса — расчёт не выдаётся', () => {
  const r = K.calc({ mode: 'our', currency: 'CNY', items: [{ value: 1, duty: '0' }] }, { rates: { USD: 90 } });
  assert.ok(!r.ok); assert.match(r.missing[0], /Нет курса ЦБ для CNY/);
});
