/* IOMASTAVKA — расчёт контракта по рабочей таблице «Контракт» (одна строка таблицы = одна строка расчёта).
   Работает и на сервере (require('./contract')), и в браузере (window.IOMA_CONTRACT).

   Режимы:
     our    — «Наш контракт»: мы оплачиваем инвойс поставщику, страхуем, растамаживаем; итог в валюте инвойса.
     client — «Контракт клиента» (ТЭО): только логистика и услуги; таможенные платежи — справочно.

   «Наш контракт», по строкам (всё в валюте инвойса, обычно ¥):
     Инвойс → ТД (+4%, если нужен) → Оплата инвойса (+6% по ЦБ или +3% по внутреннему курсу банка, от инвойса + ТД)
     → Фрахт (как дал агент, с его надбавкой к курсу) → Страхование (0,15% от инвойса, в ТС не входит)
     → Таможенные платежи: пошлина + НДС (ТС = инвойс + фрахт; можно взять в ТС только часть фрахта до границы)
     → Таможенный сбор (по шкале от стоимости товара в ₽; радиоэлектроника — 73 860 ₽)
     → Декларант (25 000 ₽ с ЭЦП клиента / 30 000 ₽ под печать брокера, до 3 кодов, +350 ₽ за код; ЧЗ — 2 500 ₽ за 2 кода, +500 ₽)
     → Разрешительные документы → Прочие расходы → Маржа (по умолчанию 2 × «на налоги») → На налоги 2,2% → Итого.
   Таможенные платежи считаются в рублях по чистому курсу ЦБ до копейки, как в декларации, и переводятся в валюту инвойса по ЦБ.
   Рублёвые расходы переводятся по курсу «ЦБ − 1 ₽» (запас). Валютные — по кросс-курсу ЦБ.
   Несколько кодов: фрахт делится по весу брутто, «фрахт за кг» считается сам; остаток от округления — на самую тяжёлую позицию.
   Строки округляются до 0,01, итог — вверх до целого. Ошибка шаблона (сбор в итоге дважды) не повторяется. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.IOMA_CONTRACT = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    feeScale: [[200000, 1231], [450000, 2462], [1200000, 4924], [2700000, 13541], [4200000, 18465], [5500000, 21344], [10000000, 49240], [null, 73860]],
    radioFee: 73860,
    rubCushion: 1,              // «Курс ЦБ − 1 ₽» для рублёвых строк
    tdPct: 4,                   // торговый дом (платёжный агент в Китае)
    payPct: { cbr: 6, bank: 3 },
    insurancePct: 0.15,
    taxPct: 2.2,
    marginFactor: 2,            // маржа = 2 × «на налоги»
    declarant: { ecp: 25000, broker: 30000, codesIncluded: 3, perCode: 350, chzBase: 2500, chzIncluded: 2, chzPerCode: 500 },
    clientMarkupsUSD: { exw: 150, sea: 200, rail: 150, auto: 150, air: 100 },
    clientTaxPct: 0,
    feeBase: 'invoice',         // сбор — от стоимости товара (решение владельца); 'cv' — от таможенной стоимости
    excelCompat: false,         // true — как в Excel-шаблоне: база сбора и перевод сбора по курсу «ЦБ − 1»
  };
  var PAY_NOTE = { cbr: 'по курсу ЦБ + 6%', bank: 'по внутреннему курсу банка + 3%' };
  var CUR_SIGN = { CNY: '¥', USD: '$', EUR: '€', RUB: '₽' };

  // ------------------------------------------------------------------ числа
  function num(v) { if (v == null || v === '') return 0; var x = Number(String(v).replace(/[\s ]/g, '').replace(',', '.')); return isFinite(x) ? x : 0; }
  function has(v) { return v != null && v !== '' && isFinite(Number(String(v).replace(/[\s ]/g, '').replace(',', '.'))); }
  // округление «как в бухгалтерии»: половина — вверх, с поправкой на двоичную погрешность
  function round(v, d) { var f = Math.pow(10, d == null ? 2 : d); var s = v < 0 ? -1 : 1; return s * Math.round(Math.abs(v) * f + 1e-7) / f; }
  var r2 = function (v) { return round(v, 2); };
  function ceil0(v) { return Math.ceil(r2(v) - 1e-9); }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in (b || {})) if (b[k] != null) o[k] = (typeof a[k] === 'object' && a[k] && !Array.isArray(a[k])) ? merge(a[k], b[k]) : b[k]; return o; }
  function cleanCode(c) { return String(c || '').replace(/\D/g, ''); }

  // ------------------------------------------------------------------ сбор
  function customsFee(rub, scale) {
    scale = scale && scale.length ? scale : DEFAULTS.feeScale;
    for (var i = 0; i < scale.length; i++) { var lim = scale[i][0]; if (lim == null || rub <= lim) return num(scale[i][1]); }
    return num(scale[scale.length - 1][1]);
  }

  // ------------------------------------------------------------------ пошлина
  // «12.5%», «0», «беспошлинно», «0,48 евро/м2», «10%, но не менее 2,25 евро/кг», «5% плюс 0,1 евро за 1 кг»
  var UNITS = [[/^(кг|kg)/, 'кг'], [/^(т|тонн)/, 'т'], [/^(пар|pair)/, 'пар'], [/^(шт|штук|pcs|ед)/, 'шт'], [/^(м2|м²|кв\.?\s*м|m2)/, 'м²'], [/^(л|литр|l)(?![а-яё])/, 'л']];
  function parseDuty(text) {
    if (text && typeof text === 'object' && text.parts) return text;
    var shown = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    var t = shown.toLowerCase().replace(/ё/g, 'е').replace(/(\d),(\d)/g, '$1.$2');
    var d = { text: shown, parts: [], mode: 'single' };
    if (!t) return null;
    if (t.indexOf('беспошлин') >= 0 || /^0+(\.0+)?\s*%?$/.test(t)) { d.parts = [{ kind: 'ad_valorem', value: 0 }]; return d; }
    var adv = t.match(/(\d+(?:\.\d+)?)\s*%/);
    var sp = t.match(/(\d+(?:\.\d+)?)\s*(евро|евр|eur|€|долл[а-яё]*|usd|\$)\.?\s*(?:\/|за)\s*(?:1\s*)?([а-яёa-z²0-9.]+(?:\s*м)?)/);
    if (adv) d.parts.push({ kind: 'ad_valorem', value: Number(adv[1]) });
    if (sp) {
      var cur = /^(евр|eur|€)/.test(sp[2]) ? 'EUR' : 'USD', unit = 'кг', raw = sp[3].replace(/\.$/, '');
      for (var i = 0; i < UNITS.length; i++) if (UNITS[i][0].test(raw)) { unit = UNITS[i][1]; break; }
      d.parts.push({ kind: 'specific', value: Number(sp[1]), currency: cur, unit: unit });
    }
    if (!d.parts.length) return null;
    if (d.parts.length === 2) d.mode = /плюс|\+/.test(t) ? 'plus' : 'min';
    return d;
  }
  // количество для специфической ставки и что спросить, если его нет
  function quantity(unit, it) {
    if (unit === 'кг' || unit === 'т') {
      var kg = has(it.net) ? num(it.net) : null;
      return { q: kg == null ? null : (unit === 'т' ? kg / 1000 : kg), need: 'вес нетто, кг' };
    }
    if (unit === 'м²') return { q: has(it.area) ? num(it.area) : null, need: 'площадь, м²' };
    if (unit === 'л') return { q: has(it.liters) ? num(it.liters) : null, need: 'объём, л' };
    return { q: has(it.qty) ? num(it.qty) : null, need: unit === 'пар' ? 'количество пар' : 'количество, шт' };
  }
  function dutyRub(duty, cvRub, it, rates) {
    var pieces = [];
    for (var i = 0; i < duty.parts.length; i++) {
      var p = duty.parts[i];
      if (p.kind === 'ad_valorem') { pieces.push(cvRub * p.value / 100); continue; }
      var qn = quantity(p.unit, it);
      if (qn.q == null) return { rub: null, need: qn.need };
      var rt = num(rates[p.currency]); if (!rt) return { rub: null, need: 'курс ЦБ ' + p.currency };
      pieces.push(p.value * qn.q * rt);
    }
    var v = pieces.length === 1 ? pieces[0] : duty.mode === 'plus' ? pieces[0] + pieces[1] : Math.max(pieces[0], pieces[1]);
    return { rub: r2(v), need: '' };
  }

  // ------------------------------------------------------------------ деление суммы по весу
  // shares в тех же единицах, что total; сумма долей ровно total; остаток — на самую тяжёлую позицию
  function split(total, weights) {
    var sum = 0, i, heavy = 0;
    for (i = 0; i < weights.length; i++) { sum += weights[i]; if (weights[i] > weights[heavy]) heavy = i; }
    var out = weights.map(function () { return 0; });
    if (!weights.length) return out;
    if (sum <= 0) { weights = weights.map(function () { return 1; }); sum = weights.length; }
    var acc = 0;
    for (i = 0; i < weights.length; i++) { if (i === heavy) continue; out[i] = r2(total * weights[i] / sum); acc += out[i]; }
    out[heavy] = r2(total - acc);
    return out;
  }

  // ------------------------------------------------------------------ расчёт
  /* input — см. newInput(); ctx = { rates: { CNY, USD, EUR } — ₽ за 1 единицу по ЦБ, rateDate, settings } */
  function calc(input, ctx) {
    ctx = ctx || {};
    var S = merge(DEFAULTS, ctx.settings || {});
    var inp = input || {};
    var mode = inp.mode === 'client' ? 'client' : 'our';
    var cur = String(inp.currency || 'CNY').toUpperCase();
    var rates = {}; var k; for (k in (ctx.rates || {})) rates[String(k).toUpperCase()] = num(ctx.rates[k]); rates.RUB = 1;
    var warnings = [], missing = [];
    var rate = rates[cur];
    if (!rate) { missing.push('Нет курса ЦБ для ' + cur + ' — расчёт невозможен'); return { ok: false, mode: mode, currency: cur, missing: missing, warnings: warnings, lines: [], items: [] }; }
    var cushion = cur === 'RUB' ? 0 : num(S.rubCushion);
    var rubRate = cur === 'RUB' ? 1 : rate - cushion;           // для рублёвых строк
    if (rubRate <= 0) { rubRate = rate; warnings.push('Запас «ЦБ − ' + cushion + ' ₽» больше курса — рублёвые строки по чистому ЦБ'); }

    // сумма в валюте X → { rub: стоимость в рублях (по ЦБ с надбавкой агента), cur: в валюте контракта }
    function conv(amount, x, fxPct, label) {
      x = String(x || cur).toUpperCase(); var a = num(amount), fx = 1 + num(fxPct) / 100;
      if (!a) return { rub: 0, cur: 0 };
      if (x === 'RUB') return { rub: a * fx, cur: a * fx / rubRate };
      var rx = rates[x];
      if (!rx) { missing.push('Нет курса ЦБ для ' + x + (label ? ' («' + label + '»)' : '')); return { rub: 0, cur: 0 }; }
      return { rub: a * rx * fx, cur: x === cur ? a * fx : a * rx * fx / rate };
    }

    // ---- позиции
    var items = (inp.items || []).slice(0, 300).map(function (it, i) {
      return { src: it, i: i, name: String(it.name || ''), code: cleanCode(it.code), value: num(it.value), gross: num(it.gross), duty: parseDuty(it.duty),
        vat: has(it.vat) ? num(it.vat) : 22, radio: !!it.radio, chz: !!it.chz };
    });
    var invoice = items.reduce(function (s, it) { return s + it.value; }, 0);
    if (!items.length) missing.push('Добавьте хотя бы одну позицию инвойса');
    if (mode === 'our' && !invoice) missing.push('Укажите стоимость товара');

    // ---- фрахт и прочие строки агента
    var freightCur = 0, freightRubCV = 0, freightLines = [];
    (inp.freight || []).forEach(function (f) {
      var c = conv(f.amount, f.currency, f.fx, f.label || 'фрахт');
      freightLines.push({ label: f.label || 'Фрахт', amount: num(f.amount), currency: String(f.currency || cur).toUpperCase(), fx: num(f.fx), cur: c.cur, rub: c.rub, inCV: f.inCV !== false });
      freightCur += c.cur; if (f.inCV !== false) freightRubCV += c.rub;
    });
    var extras = (inp.extras || []).map(function (e) { var c = conv(e.amount, e.currency, e.fx, e.label); if (e.inCV) freightRubCV += c.rub; return { label: e.label || 'Прочие расходы', cur: c.cur, rub: c.rub, inCV: !!e.inCV }; });
    var share = has(inp.borderShare) ? Math.min(100, Math.max(0, num(inp.borderShare))) : 100;
    var freightInCV = freightRubCV * share / 100;

    // ---- страхование
    var insPct = has(inp.insurancePct) ? num(inp.insurancePct) : (mode === 'our' ? S.insurancePct : 0);
    var insurance = has(inp.insuranceFixedRub) ? { cur: num(inp.insuranceFixedRub) / rubRate, rub: num(inp.insuranceFixedRub) } : { cur: invoice * insPct / 100, rub: invoice * insPct / 100 * rate };
    var insuranceInCV = !!inp.insuranceInCV;
    if (S.excelCompat) insurance.rub = insurance.cur * rate;   // шаблон клал в ТС страховку, уже переведённую по «ЦБ − 1»

    // ---- распределение по весу брутто
    var totalGross = items.reduce(function (s, it) { return s + it.gross; }, 0);
    if (items.length > 1 && freightCur && !totalGross) warnings.push('Нет веса брутто — фрахт поделён по позициям поровну');
    items.forEach(function (it) { if (items.length > 1 && totalGross && !it.gross) warnings.push('«' + (it.name || it.code || 'позиция ' + (it.i + 1)) + '»: нет веса брутто — доля фрахта 0'); });
    var weights = items.map(function (it) { return it.gross; });
    var freightShares = split(r2(freightCur), weights);
    var cvFreightShares = split(r2(freightInCV), weights);
    var insShares = insuranceInCV ? split(r2(insurance.rub), items.map(function (it) { return it.value; })) : items.map(function () { return 0; });

    // ---- таможня (в рублях, по чистому ЦБ, до копейки)
    var C = { cvRub: 0, invoiceRub: 0, dutyRub: 0, vatRub: 0, feeRub: 0, feeRadio: false, feeBaseRub: 0 };
    var outItems = items.map(function (it, i) {
      var valueRub = r2(it.value * rate);
      var cvRub = r2(valueRub + cvFreightShares[i] + insShares[i]);
      var o = { name: it.name, code: it.code, value: r2(it.value), gross: it.gross, freightShare: freightShares[i], cvRub: cvRub, cv: r2(cvRub / rate),
        dutyText: it.duty ? it.duty.text : '', vatRate: it.vat, radio: it.radio, chz: it.chz, dutyRub: null, vatRub: null, need: '' };
      C.invoiceRub += valueRub; C.cvRub += cvRub;
      if (!it.duty) { o.need = 'ставка пошлины'; missing.push('«' + (it.name || it.code || 'позиция ' + (i + 1)) + '»: нет ставки пошлины — нужен код ТН ВЭД'); return o; }
      var d = dutyRub(it.duty, cvRub, it.src, rates);
      if (d.rub == null) { o.need = d.need; missing.push('«' + (it.name || it.code || 'позиция ' + (i + 1)) + '»: для пошлины ' + it.duty.text + ' укажите ' + d.need); return o; }
      o.dutyRub = d.rub; o.vatRub = r2((cvRub + d.rub) * it.vat / 100);
      o.duty = r2(o.dutyRub / rate); o.vatCur = r2(o.vatRub / rate);
      C.dutyRub += o.dutyRub; C.vatRub += o.vatRub;
      return o;
    });
    C.cvRub = r2(C.cvRub); C.invoiceRub = r2(C.invoiceRub); C.dutyRub = r2(C.dutyRub); C.vatRub = r2(C.vatRub);
    var feeRateRub = S.excelCompat ? rubRate : rate;      // шаблон считал базу сбора и перевод сбора по «ЦБ − 1»
    C.feeBaseRub = S.feeBase === 'cv' ? C.cvRub : r2(invoice * feeRateRub);
    C.feeRadio = items.some(function (it) { return it.radio; }) || !!inp.radio;
    C.feeRub = !items.length ? 0 : C.feeRadio ? num(S.radioFee) : customsFee(C.feeBaseRub, S.feeScale);
    C.paymentsRub = r2(C.dutyRub + C.vatRub + C.feeRub);
    var customsCur = r2((C.dutyRub + C.vatRub) / rate), feeCur = r2(C.feeRub / feeRateRub);

    // ---- декларант
    var codes = {}, chzCodes = {};
    items.forEach(function (it) { if (it.code) { codes[it.code] = 1; if (it.chz) chzCodes[it.code] = 1; } });
    var nCodes = Object.keys(codes).length || (items.length ? 1 : 0), nChz = Object.keys(chzCodes).length;
    var D = S.declarant, decl = inp.declarant === 'none' ? 'none' : inp.declarant === 'broker' ? 'broker' : 'ecp';
    var declRub = 0, declNote = '';
    if (has(inp.declarantRub)) { declRub = num(inp.declarantRub); declNote = 'вручную'; }
    else if (decl !== 'none' && items.length) {
      declRub = num(D[decl]) + num(D.perCode) * Math.max(0, nCodes - num(D.codesIncluded));
      declNote = (decl === 'ecp' ? 'с ЭЦП клиента' : 'под печать брокера') + ', кодов: ' + nCodes;
      if (nChz) { declRub += num(D.chzBase) + num(D.chzPerCode) * Math.max(0, nChz - num(D.chzIncluded)); declNote += ', с ЧЗ: ' + nChz; }
    }

    // ---- строки
    var lines = [];
    function line(key, label, amount, extra) { var o = { key: key, label: label, amount: r2(amount) }; for (var x in (extra || {})) o[x] = extra[x]; lines.push(o); return o; }
    var pay = inp.payment === 'bank' ? 'bank' : 'cbr';
    var tdPct = inp.td ? (has(inp.tdPct) ? num(inp.tdPct) : S.tdPct) : 0;
    var payPct = has(inp.paymentPct) ? num(inp.paymentPct) : S.payPct[pay];
    if (mode === 'our') {
      var inv = line('invoice', 'Инвойс', invoice);
      var td = tdPct ? line('td', 'ТД (платёжный агент), ' + tdPct + '%', inv.amount * tdPct / 100, { secret: true }) : null;
      line('payment', 'Оплата инвойса, ' + payPct + '% (' + PAY_NOTE[pay].replace(/ \+ \d+%$/, '') + ')', (inv.amount + (td ? td.amount : 0)) * payPct / 100, { secret: true });
    }
    freightLines.forEach(function (f, i) { line('freight' + (i ? i : ''), f.label, f.cur, { rub: r2(f.rub), currencyIn: f.currency, amountIn: f.amount, fx: f.fx, inCV: f.inCV }); });
    (inp.markups || []).forEach(function (m, i) { var c = conv(m.amount, m.currency || 'USD', 0, m.label); line('markup' + i, m.label || 'Наценка', c.cur, { secret: true, markup: true }); });
    if (insurance.cur) line('insurance', has(inp.insuranceFixedRub) ? 'Страхование' : 'Страхование, ' + insPct + '% от инвойса', insurance.cur, { rub: r2(insurance.rub), inCV: insuranceInCV });
    var customsInTotal = mode === 'our' || !!inp.includeCustoms;
    if (items.length && customsInTotal) {
      line('customs', 'Таможенные платежи (пошлина + НДС)', customsCur, { rub: r2(C.dutyRub + C.vatRub) });
      line('fee', C.feeRadio ? 'Таможенный сбор (радиоэлектроника)' : 'Таможенный сбор', feeCur, { rub: C.feeRub });
    }
    if (declRub) line('declarant', 'Декларант', declRub / rubRate, { rub: declRub, note: declNote });
    (inp.permits || []).forEach(function (p, i) { var c = conv(p.amount, p.currency || 'RUB', 0, p.label); line('permit' + i, p.label || 'Разрешительные документы', c.cur, { rub: r2(c.rub) }); });
    extras.forEach(function (e, i) { line('extra' + i, e.label, e.cur, { rub: r2(e.rub), inCV: e.inCV }); });

    var base = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var taxPct = has(inp.taxPct) ? num(inp.taxPct) : mode === 'our' ? S.taxPct : S.clientTaxPct;
    var marginAuto = mode === 'our' ? r2(num(S.marginFactor) * r2(base * taxPct / 100)) : 0;
    var margin = has(inp.margin) ? r2(num(inp.margin)) : marginAuto;
    if (margin) line('margin', 'Маржа', margin, { secret: true, auto: !has(inp.margin) });
    var taxes = r2((base + margin) * taxPct / 100);
    if (taxPct) line('taxes', 'На налоги, ' + taxPct + '%', taxes, { secret: true });
    var sum = r2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
    var total = ceil0(sum);

    var markupSum = lines.filter(function (l) { return l.markup; }).reduce(function (s, l) { return s + l.amount; }, 0);
    return {
      ok: !missing.length, mode: mode, currency: cur, sign: CUR_SIGN[cur] || cur, rate: rate, rubRate: rubRate, rateDate: ctx.rateDate || '',
      lines: lines, items: outItems, sum: sum, total: total,
      totalRub: pay === 'cbr' && mode === 'our' && cur !== 'RUB' ? Math.round(total * rate) : null,
      payment: pay, paymentNote: mode === 'our' ? PAY_NOTE[pay].replace(/\d+(?:[.,]\d+)?%$/, String(payPct).replace('.', ',') + '%') : '', tdPct: tdPct, payPct: payPct,
      margin: margin, marginAuto: marginAuto, profit: r2(margin + markupSum), taxes: taxes, taxPct: taxPct,
      invoice: r2(invoice), freight: r2(freightCur), freightInCVRub: r2(freightInCV), borderShare: share,
      totalGross: totalGross, freightPerKg: totalGross ? round(freightCur / totalGross, 4) : null,
      customs: { cvRub: C.cvRub, invoiceRub: C.invoiceRub, feeBaseRub: C.feeBaseRub, dutyRub: C.dutyRub, vatRub: C.vatRub, feeRub: C.feeRub, feeRadio: C.feeRadio, paymentsRub: C.paymentsRub,
        payments: r2(customsCur + feeCur), inTotal: customsInTotal },
      declarant: { kind: decl, rub: declRub, codes: nCodes, chzCodes: nChz, note: declNote },
      ratio: invoice && mode === 'our' ? round(sum / r2(invoice) - 1, 4) : null,
      warnings: warnings.filter(function (w, i, a) { return a.indexOf(w) === i; }), missing: missing.filter(function (w, i, a) { return a.indexOf(w) === i; }),
    };
  }

  /* Документ «Калькулятора ВЭД» сделки (ved.js) → вход расчёта контракта.
     Старые документы: строка «Комиссия за перевод, % от инвойса» превращается в способ оплаты (6% — по ЦБ, 3% — по курсу банка). */
  var UNIT_OF = { 'кг': 'кг', 'л': 'л', 'шт': 'шт', 'пар': 'пар', 'м²': 'м²' };
  function dutyFromVed(it) {
    var u = UNIT_OF[String(it.eur_unit || 'кг')] || 'кг';
    var eur = num(u === 'м²' ? it.eur_per_m2 : u === 'л' ? it.eur_per_l : (u === 'шт' || u === 'пар') ? it.eur_per_pcs : it.eur_per_kg);
    var t = it.duty_type || 'percent', rate = num(it.duty_rate), parts = [];
    if (t !== 'fixed_eur') parts.push({ kind: 'ad_valorem', value: rate });
    if (t !== 'percent' && eur) parts.push({ kind: 'specific', value: eur, currency: 'EUR', unit: u });
    if (!parts.length) parts.push({ kind: 'ad_valorem', value: 0 });
    var text = (t !== 'fixed_eur' ? rate + '%' : '') + (t !== 'percent' && eur ? (t === 'min' ? ', но не менее ' : t === 'plus' ? ' плюс ' : '') + eur + ' €/' + u : '');
    return { text: text, parts: parts, mode: parts.length === 2 ? (t === 'plus' ? 'plus' : 'min') : 'single' };
  }
  function fromVedDoc(doc, rates) {
    doc = doc || {}; rates = rates || {};
    var mode = doc.calc_type === 'client_contract' ? 'client' : 'our';
    var items = doc.items || [];
    var cur = String((items[0] && items[0].invoice_currency) || doc.freight_currency || 'CNY').toUpperCase();
    var rc = cur === 'RUB' ? 1 : num(rates[cur]);
    var pctRow = (doc.extra_costs || []).filter(function (e) { return e.is_percent_of_invoice; })[0];
    var payment = doc.payment === 'bank' || doc.payment === 'cbr' ? doc.payment : pctRow && num(pctRow.amount) === 3 ? 'bank' : 'cbr';
    var inp = {
      mode: mode, currency: cur, payment: payment, td: !!doc.td, declarant: doc.declarant || (mode === 'our' ? 'ecp' : 'none'),
      declarantRub: has(doc.declarant_rub) ? num(doc.declarant_rub) : null, margin: has(doc.margin) ? num(doc.margin) : null,
      insurancePct: has(doc.insurance_pct) ? num(doc.insurance_pct) : null, radio: !!doc.radio_fee,
      borderShare: doc.border_split_enabled ? (has(doc.border_split_percent) ? num(doc.border_split_percent) : 30) : null,
      items: items.map(function (it) {
        var ic = String(it.invoice_currency || cur).toUpperCase(), ri = ic === 'RUB' ? 1 : num(rates[ic]);
        var value = ic === cur ? num(it.invoice_amount) : (ri && rc ? num(it.invoice_amount) * ri / rc : 0);
        var u = UNIT_OF[String(it.eur_unit || 'кг')] || 'кг', q = has(it.unit_qty) && num(it.unit_qty) ? num(it.unit_qty) : null;
        return { name: it.name || '', code: it.tnved_code || '', value: value, gross: num(it.weight), net: has(it.net) && num(it.net) ? num(it.net) : (num(it.weight) || null),
          qty: (u === 'шт' || u === 'пар') ? q : null, area: u === 'м²' ? q : null, liters: u === 'л' ? q : null,
          duty: it.auto_lookup && it.tnved_code && it.duty_text ? (parseDuty(it.duty_text) || dutyFromVed(it)) : dutyFromVed(it),
          vat: has(it.vat_rate) ? num(it.vat_rate) : 22, radio: !!it.radio, chz: !!it.chz };
      }),
      freight: num(doc.freight_total) ? [{ label: 'Фрахт + локальные расходы КНР', amount: num(doc.freight_total), currency: doc.freight_currency || cur, fx: num(doc.freight_fx) }] : [],
      extras: (doc.extra_costs || []).filter(function (e) { return !e.is_percent_of_invoice && num(e.amount); }).map(function (e) {
        var c = String(e.currency || 'RUB').toUpperCase();
        return e.rate_mode === 'manual' && c !== 'RUB' ? { label: e.label, amount: num(e.amount) * num(e.manual_rate), currency: 'RUB' } : { label: e.label, amount: num(e.amount), currency: c };
      }),
      markups: (doc.markups || []).filter(function (m) { return num(m.amount); }).map(function (m) { return { label: m.label || 'Наценка', amount: num(m.amount), currency: m.currency || 'USD' }; }),
    };
    if (num(doc.insurance_amount) && !has(doc.insurance_pct)) { // старый документ: страховка суммой
      var ic2 = String(doc.insurance_currency || 'RUB').toUpperCase();
      if (ic2 === 'RUB') inp.insuranceFixedRub = num(doc.insurance_amount); else inp.extras.push({ label: 'Страхование', amount: num(doc.insurance_amount), currency: ic2 });
      inp.insurancePct = 0;
    }
    return inp;
  }

  function newInput(mode, cur) {
    return { mode: mode === 'client' ? 'client' : 'our', currency: cur || 'CNY', payment: 'cbr', td: false, declarant: 'ecp', borderShare: null,
      items: [{ name: '', code: '', value: 0, gross: 0, net: null, qty: null, area: null, duty: '', vat: 22, radio: false, chz: false }],
      freight: [{ label: 'Фрахт + локальные расходы КНР', amount: 0, currency: cur || 'CNY', fx: 0 }], permits: [], extras: [], markups: [], margin: null };
  }

  return { DEFAULTS: DEFAULTS, PAY_NOTE: PAY_NOTE, calc: calc, newInput: newInput, fromVedDoc: fromVedDoc, parseDuty: parseDuty, customsFee: customsFee, split: split, round: round };
});
