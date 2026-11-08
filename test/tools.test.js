'use strict';
// Инструменты логиста: выбор маршрута, проверка номера контейнера, терминальные тарифы, сумма прописью и вместимость.
const test = require('node:test');
const assert = require('node:assert');
const A = require('../route-advice');
const T = require('../tools-api');

function tools() { // браузерный модуль инструментов без браузера
  global.window = global; global.addEventListener = global.addEventListener || function () {}; global.document = { addEventListener() {}, readyState: 'complete', getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
  delete require.cache[require.resolve('../tools.js')]; require('../tools.js'); return global.IOMA_TOOLS;
}

test('маршрут: Иу → Челябинск сборным — авто через Маньчжурию и Забайкальск (главный коридор)', () => {
  const r = A.advise({ from: 'Иу', to: 'Челябинск', weight: 500, volume: 3 });
  assert.ok(r.ok); assert.strictEqual(r.best, 'auto'); assert.match(r.options[0].via, /Забайкальск/); assert.strictEqual(r.to.zone, 'UR'); assert.strictEqual(r.hub.via, 'direct');
  assert.strictEqual(A.advise({ from: 'Иу', to: 'Нижний Новгород' }).hub.via, 'msk');
});
test('маршрут: Шэньчжэнь → Москва контейнером — море + ЖД через Владивосток', () => {
  const r = A.advise({ from: 'Шэньчжэнь', to: 'Москва', weight: 20000, volume: 60 });
  assert.strictEqual(r.best, 'sea'); assert.match(r.options[0].via, /Владивосток/);
});
test('маршрут: из Кореи только море или авиа, в Питер — до Петербурга, во Владивосток — только море', () => {
  const r = A.advise({ from: 'Пусан', to: 'Санкт-Петербург', weight: 3000, volume: 10 });
  assert.strictEqual(r.best, 'sea'); assert.deepStrictEqual(r.impossible.map(x => x.mode).sort(), ['auto', 'rail']); assert.strictEqual(r.to.zone, 'NW');
  const v = A.advise({ from: 'Busan', to: 'Владивосток', weight: 3000, volume: 10 });
  assert.strictEqual(v.best, 'sea_only'); assert.ok(!v.options.some(o => o.mode === 'auto' || o.mode === 'rail'));
});
test('маршрут: из глубины Китая море не предлагаем, мелочь — авиа', () => {
  const r = A.advise({ from: 'Урумчи', to: 'Новосибирск', weight: 2000, volume: 8 });
  assert.ok(!r.options.some(o => o.mode === 'sea')); assert.strictEqual(r.best, 'auto');
  assert.strictEqual(A.advise({ from: 'Шанхай', to: 'Москва', weight: 40, volume: 0.1 }).best, 'air');
  assert.strictEqual(A.advise({ from: 'Харбин', to: 'Хабаровск', weight: 800, volume: 4 }).best, 'auto');
});
test('маршрут: незнакомый город — честно говорим, что не знаем', () => {
  assert.strictEqual(A.advise({ from: 'Атлантида', to: 'Москва' }).ok, false);
  assert.strictEqual(A.advise({ from: 'Иу', to: 'Москва', priority: 'fast', weight: 20000, volume: 60 }).options[0].mode !== 'sea', true);
});

test('контейнер: контрольная цифра ISO 6346', () => {
  assert.strictEqual(T.isoCheck('CSQU3054383'), 3);
  assert.strictEqual(T.isoCheck('MSKU9070323'), 3);
});
test('телефон: нормализация и часовой пояс по региону', () => {
  assert.strictEqual(T.normPhone('8 (953) 550-56-54'), '79535505654');
  assert.strictEqual(T.normPhone('+86 138 0013 8000'), '8613800138000');
  assert.strictEqual(T.tzForRegion('Челябинская область'), 'Asia/Yekaterinburg');
  assert.strictEqual(T.tzForRegion('Приморский край'), 'Asia/Vladivostok');
  assert.strictEqual(T.tzForRegion('Нижегородская область'), 'Europe/Moscow');
});
test('телефон: иностранный номер — страна и пояс без внешних запросов', async () => {
  const r = await T.phoneInfo('+86 138 0013 8000');
  assert.ok(r.ok); assert.strictEqual(r.country, 'Китай'); assert.strictEqual(r.tz, 'Asia/Shanghai'); assert.strictEqual(r.utcOffsetMin, 480);
});
test('терминальные: Шереметьево-Карго — минимальный сбор, бесплатные сутки и НДС 22%', () => {
  const r = T.sherTariff({ weight: 50, chargeable: 50, category: 'general', from: '2026-11-09', to: '2026-11-10', places: 1 });
  assert.ok(r.ok); assert.strictEqual(r.lines.length, 2); // формальности + обработка, хранение бесплатно
  assert.strictEqual(r.lines[1].sum, Math.round(2724 * 1.22 * 100) / 100);
  const long = T.sherTariff({ weight: 100, chargeable: 100, category: 'general', from: '2026-11-09', to: '2026-11-19', places: 1 });
  assert.ok(long.lines.some(l => /Хранение/.test(l.name)));
});
test('терминальные: Москва Карго по тарифам — хранение по платному весу', () => {
  const r = T.mcTariff({ weight: 100, chargeable: 120, category: 'general', from: '2026-11-08', to: '2026-11-13' });
  const st = r.lines.find(l => /Хранение/.test(l.name)); assert.ok(st);
  assert.strictEqual(st.sum, Math.round(14.32 * 120 * 3 * 1.22 * 100) / 100);
});
test('по России: ориентир по расстоянию', () => {
  const r = T.ruEstimate({ from: 'Москва', to: 'Челябинск', weight: 200, volume: 1 });
  assert.ok(r.ok && r.km > 1500 && r.km < 2200 && r.price > 1500);
});

test('сумма прописью: падежи, род и копейки', () => {
  const W = tools();
  assert.strictEqual(W.words(1234567, 'nom'), 'один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь');
  assert.strictEqual(W.words(1234567, 'gen'), 'одного миллиона двухсот тридцати четырёх тысяч пятисот шестидесяти семи');
  assert.strictEqual(W.words(2002, 'ins'), 'двумя тысячами двумя');
  assert.strictEqual(W.words(21, 'acc', 'f'), 'двадцать одну');
  const a = W.amountWords(1001.01, 'rub', 'nom', {}); assert.strictEqual(a.w + ' ' + a.unit + ' ' + a.small, 'одна тысяча один рубль 01 копейка');
  const b = W.amountWords(22.5, 'rub', 'dat', { kopWords: true }); assert.strictEqual(b.w + ' ' + b.unit + ' ' + b.small, 'двадцати двум рублям пятидесяти копейкам');
});
test('влезет ли: высокий груз — только Open Top / Flat Rack или мега; 10 паллет — 40′', () => {
  const W = tools();
  const tall = W.fitCheck([{ l: 300, w: 200, h: 275, kg: 5000, q: 1, tilt: false, stack: false }]);
  assert.ok(tall.rows.find(r => r.e.id === '40hc').fail); assert.ok(!tall.rows.find(r => r.e.id === '40ot').fail); assert.strictEqual(tall.bestT.e.id, 'mega');
  const pal = W.fitCheck([{ l: 120, w: 80, h: 150, kg: 300, q: 10, tilt: false, stack: true }]);
  assert.strictEqual(pal.bestC.e.id, '40dc'); assert.strictEqual(pal.rows.find(r => r.e.id === '20dc').units, 2);
});
