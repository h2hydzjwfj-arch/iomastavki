'use strict';
// Ориентировочный расчёт сразу по нескольким видам транспорта.
// Маленький груз не считается как целый контейнер: для него — сборные варианты (авиа, авто, ЖД, море),
// для крупного — контейнер и целая машина. Тарифы — ориентиры по рынку (администратор меняет их
// в «Работа → Тарифы»); ставки из базы агентов, если есть, имеют приоритет для контейнера.

const DEFAULT_TARIFFS = {
  air:      { perKg: 5.2, factor: 167, minUsd: 250, days: [5, 10] },
  ltl_auto: { perM3: 240, perKg: 1.4, minM3: 1, days: [18, 28] },
  lcl_rail: { perM3: 200, perKg: 1.0, minM3: 1, days: [25, 35] },
  lcl_sea:  { perM3: 130, perKg: 0.55, minM3: 2, days: [40, 60] },
  fcl_rail: { price: 9600, capM3: 67, capKg: 26000, days: [30, 35] },
  ftl_auto: { price: 12500, capM3: 82, capKg: 20000, days: [18, 25] },
  dangerousPct: 35,
};
const MODE = { air: 'air', ltl_auto: 'auto', lcl_rail: 'rail', lcl_sea: 'sea', fcl_rail: 'rail', ftl_auto: 'auto' };
const KINDS = Object.keys(MODE);

function mergeTariffs(saved) {
  const t = JSON.parse(JSON.stringify(DEFAULT_TARIFFS));
  if (saved && typeof saved === 'object') {
    for (const k of KINDS) if (saved[k] && typeof saved[k] === 'object') for (const f of Object.keys(t[k])) {
      if (f === 'days') { const d = saved[k].days; if (Array.isArray(d) && d.length === 2 && d.every(x => Number.isFinite(+x) && +x > 0)) t[k].days = [+d[0], +d[1]]; }
      else if (Number.isFinite(+saved[k][f]) && +saved[k][f] >= 0) t[k][f] = +saved[k][f];
    }
    if (Number.isFinite(+saved.dangerousPct) && +saved.dangerousPct >= 0 && +saved.dangerousPct <= 300) t.dangerousPct = +saved.dangerousPct;
  }
  return t;
}
const r10 = n => Math.max(10, Math.round(n / 10) * 10);

/**
 * @param {object} q { from, to, weight (кг), volume (м³), places, dangerous }
 * @param {object} t тарифы (mergeTariffs)
 * @param {function} baseRate (from,to,mode) → запись из базы агентов или null
 */
function estimate(q, t, baseRate) {
  const W = Math.max(0, Number(q.weight) || 0);
  let V = Math.max(0, Number(q.volume) || 0);
  const assumedVolume = !V && W > 0;
  if (assumedVolume) V = Math.max(0.05, Math.round(W / 250 * 100) / 100); // нет габаритов: ~250 кг в 1 м³
  if (!W && !V) return { ok: false, error: 'Укажите вес груза' };
  const dg = !!q.dangerous, dgK = dg ? 1 + t.dangerousPct / 100 : 1;
  const incoterms = String(q.incoterms || 'FOB').trim().toUpperCase();
  const incotermWarning = incoterms !== 'FOB' ? 'Дополнительные расходы по ' + incoterms + ' не подтверждены этим тарифом; уточните их у менеджера.' : '';
  const out = [];
  const add = (kind, price, extra = {}) => {
    const note = [extra.note, incotermWarning].filter(Boolean).join('. ');
    const option = { kind, mode: MODE[kind], price: r10(price * dgK), currency: 'USD', days: t[kind].days.slice(), source: 'tariff', ...extra };
    if (note) option.note = note;
    if (incotermWarning) option.publicWarning = incotermWarning;
    out.push(option);
  };

  if (W <= 3000 && V <= 15) {
    const cw = Math.max(W, V * t.air.factor);
    add('air', Math.max(t.air.minUsd, cw * t.air.perKg), { chargeable: Math.round(cw), note: dg ? 'Опасный груз авиа — только с DGR-упаковкой и декларацией' : '' });
  }
  for (const k of ['ltl_auto', 'lcl_rail', 'lcl_sea']) {
    const tk = t[k];
    if (V > 45 || W > 18000) continue;
    if (k === 'lcl_sea' && V < 3 && W < 1500) continue; // слишком мало для моря: минимум и срок съедают выгоду
    const cv = Math.max(V, tk.minM3);
    add(k, Math.max(cv * tk.perM3, W * tk.perKg), { chargedM3: Math.round(cv * 100) / 100, note: dg ? 'Опасный груз в сборном — берут не все перевозчики, подтвердим' : '' });
  }
  if (V >= 15 || W >= 7000) {
    const n = Math.max(1, Math.ceil(Math.max(V / t.fcl_rail.capM3, W / t.fcl_rail.capKg)));
    let price = t.fcl_rail.price, source = 'tariff', days = t.fcl_rail.days.slice();
    const b = baseRate && baseRate(q.from, q.to, 'rail', incoterms);
    if (b && Number.isFinite(Number(b.rate)) && String(b.currency || 'USD').toUpperCase() === 'USD') {
      const chinese = /中国|china|chinese|\.cn$/i.test(`${b.company || ''} ${b.source || ''} ${b.notes || ''}`);
      price = Number(b.rate) * (chinese ? 1.05 : 1); source = 'base';
      const m = String(b.transitDays || '').match(/(\d+)\D+(\d+)/); if (m) days = [+m[1], +m[2]];
    }
    const noteParts = [n > 1 ? `${n} контейнера 40'` : 'Контейнер 40HC целиком', b && b.incotermNote, !b ? incotermWarning : ''].filter(Boolean);
    const option = { kind: 'fcl_rail', mode: 'rail', price: r10(price * n * dgK), currency: 'USD', days, source, units: n, note: noteParts.join('. ') };
    if (!b && incotermWarning) option.publicWarning = incotermWarning;
    out.push(option);
  }
  if (V >= 25 || W >= 8000) {
    const n = Math.max(1, Math.ceil(Math.max(V / t.ftl_auto.capM3, W / t.ftl_auto.capKg)));
    add('ftl_auto', t.ftl_auto.price * n, { units: n, note: n > 1 ? `${n} машины` : 'Машина целиком' });
  }
  if (!out.length) return { ok: false, error: 'Для такого груза нужен индивидуальный расчёт — оставьте заявку' };
  // метки: дешевле, быстрее, оптимально (цена с поправкой на срок)
  const cheapest = out.reduce((a, b) => (b.price < a.price ? b : a));
  const fastest = out.reduce((a, b) => (b.days[1] < a.days[1] || (b.days[1] === a.days[1] && b.price < a.price) ? b : a));
  const score = o => o.price * (1 + (o.days[0] + o.days[1]) / 2 / 30);
  const best = out.reduce((a, b) => (score(b) < score(a) ? b : a));
  out.forEach(o => { o.tags = []; if (o === best) o.tags.push('best'); if (o === cheapest) o.tags.push('cheap'); if (o === fastest) o.tags.push('fast'); });
  out.sort((a, b) => (b === best) - (a === best) || a.price - b.price);
  return { ok: true, weight: W, volume: V, assumedVolume, dangerous: dg, incoterms, recommended: best.kind, options: out };
}

module.exports = { estimate, mergeTariffs, DEFAULT_TARIFFS, KINDS, MODE };
