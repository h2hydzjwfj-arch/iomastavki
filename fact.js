/* IOMASTAVKA — «Факт» по завершённой сделке и личные 5% («Мои средства»).
   Логика листа «Бонус» из рабочего Excel:
   - инвойс клиенту = инвойс × курс, по которому реально платили поставщику (ЦБ на день оплаты или внутренний курс банка);
   - услуги клиенту = (сумма контракта − инвойс) × курс ЦБ на дату ДТ;
   - доп. расходы, выставленные клиенту по факту (ИДК, взвешивание…), — сверху;
   - долг клиента = всё, что клиент должен, − всё, что он уже оплатил;
   - прибыль компании = всё, что клиент должен, − всё, что потратили (поставщик, фрахт, ДТ, декларант, вывоз…);
   - мои средства = 5% от прибыли компании (процент меняется в «Моих средствах»).
   Все суммы в рублях с копейками; округление до копейки на каждой строке, как в бухгалтерии. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IOMA_FACT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var num = function (v) { if (v == null || v === '') return 0; var x = Number(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
  var has = function (v) { return v != null && v !== '' && isFinite(num(v)) && num(v) !== 0; };
  var r2 = function (x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; };
  var DEFAULT_PCT = 5;

  function calc(f, opts) {
    f = f || {}; opts = opts || {};
    var pct = has(opts.bonusPct) ? num(opts.bonusPct) : DEFAULT_PCT, cur = String(f.currency || 'CNY').toUpperCase();
    var missing = [], warnings = [];
    var contract = num(f.contractTotal), invoice = num(f.invoice);
    var rS = cur === 'RUB' ? 1 : num(f.rateSupplier), rD = cur === 'RUB' ? 1 : num(f.rateDt);
    if (invoice && !rS) missing.push('курс оплаты поставщику');
    if (contract - invoice > 0 && !rD) missing.push('курс ЦБ на дату ДТ');
    if (invoice > contract && contract) warnings.push('Инвойс больше суммы контракта — проверьте суммы');
    var invoiceRub = r2(invoice * rS), services = r2(contract - invoice), servicesRub = r2(services * rD);
    var extra = (f.extraBilled || []).filter(function (e) { return has(e.amount); }).map(function (e) { return { label: e.label || 'Доп. расходы клиенту', rub: r2(num(e.amount)) }; });
    var extraRub = r2(extra.reduce(function (s, e) { return s + e.rub; }, 0));
    var due = r2(invoiceRub + servicesRub + extraRub);
    var inc = (f.incomes || []).filter(function (e) { return has(e.amount); }).map(function (e) { return { label: e.label || 'Оплата клиента', date: e.date || '', rub: r2(num(e.amount)) }; });
    var paid = r2(inc.reduce(function (s, e) { return s + e.rub; }, 0));
    var exp = [{ key: 'supplier', label: 'Оплата поставщику (инвойс ' + fmt(invoice) + ' ' + cur + ')', rub: invoiceRub, plan: null, fact: true }];
    (f.expenses || []).forEach(function (e, i) {
      var c = String(e.currency || 'RUB').toUpperCase(), a = num(e.amount), rt = c === 'RUB' ? 1 : num(e.rate);
      var row = { key: 'e' + i, label: e.label || 'Расход', currency: c, amount: a, rate: c === 'RUB' ? null : rt, plan: has(e.plan) ? r2(num(e.plan)) : null, fact: has(e.amount) };
      if (row.fact && !rt) { missing.push('курс для «' + row.label + '»'); row.rub = 0; } else row.rub = row.fact ? r2(a * rt) : 0;
      row.diff = row.fact && row.plan != null ? r2(row.rub - row.plan) : null;
      if (!row.fact && row.plan) warnings.push('Не внесён факт: ' + row.label);
      exp.push(row);
    });
    var spent = r2(exp.reduce(function (s, e) { return s + e.rub; }, 0));
    var profit = r2(due - spent), debt = r2(due - paid), cash = r2(paid - spent);
    var bonus = profit > 0 ? r2(profit * pct / 100) : 0;
    var plan = exp.filter(function (e) { return e.plan != null; });
    return {
      ok: !missing.length, currency: cur, rateSupplier: rS, rateDt: rD, contract: contract, invoice: invoice, services: services,
      invoiceRub: invoiceRub, servicesRub: servicesRub, extra: extra, extraRub: extraRub, due: due,
      incomes: inc, paid: paid, debt: debt, expenses: exp, spent: spent, profit: profit, cash: cash,
      bonusPct: pct, bonus: bonus, planSpent: plan.length ? r2(plan.reduce(function (s, e) { return s + e.plan; }, 0)) : null,
      missing: missing, warnings: warnings,
    };
  }
  function fmt(v) { return Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); }

  // черновик «Факта» из расчёта контракта: сумма контракта, инвойс и плановые расходы — чтобы вносить только факт
  function draft(contract, doc) {
    var c = contract || {}, lines = c.lines || [], d = doc || {};
    var by = function (k) { return lines.filter(function (l) { return l.key === k || (k === 'extra' && /^extra/.test(l.key)) || (k === 'permit' && /^permit/.test(l.key)); }); };
    var rub = function (ls) { return r2(ls.reduce(function (s, l) { return s + num(l.rub != null ? l.rub : l.amount * (c.rate || 0)); }, 0)); };
    var ex = [];
    var fr = by('freight'); if (fr.length || num(d.freight_total)) ex.push({ label: 'Фрахт + локальные расходы КНР', currency: String(d.freight_currency || c.currency || 'CNY').toUpperCase(), amount: '', rate: '', plan: fr.length ? rub(fr) : null });
    var cu = by('customs').concat(by('fee')); if (cu.length) ex.push({ label: 'Таможенные платежи по ДТ (пошлина, НДС, сбор)', currency: 'RUB', amount: '', plan: rub(cu) });
    var de = by('declarant'); if (de.length) ex.push({ label: 'Декларант', currency: 'RUB', amount: '', plan: rub(de) });
    var ins = by('insurance'); if (ins.length) ex.push({ label: 'Страхование', currency: 'RUB', amount: '', plan: rub(ins) });
    by('permit').concat(by('extra')).forEach(function (l) { ex.push({ label: l.label, currency: 'RUB', amount: '', plan: rub([l]) }); });
    if (!ex.some(function (e) { return /термин/i.test(e.label); })) ex.push({ label: 'Терминальные расходы', currency: 'RUB', amount: '', plan: null });
    if (!ex.some(function (e) { return /вывоз|автодостав/i.test(e.label); })) ex.push({ label: 'Вывоз / автодоставка', currency: 'RUB', amount: '', plan: null });
    return {
      currency: c.currency || 'CNY', contractTotal: num(c.total) || '', invoice: num(c.invoice) || '', rateSupplier: '', rateDt: '',
      payment: c.payment || '', expenses: ex, incomes: [{ label: 'Оплата клиента', amount: '', date: '' }], extraBilled: [],
    };
  }
  return { calc: calc, draft: draft, DEFAULT_PCT: DEFAULT_PCT };
});
