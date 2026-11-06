/* IOMASTAVKA — калькулятор ВЭД (перенос calc.js из CRM West Asia) и финансы сделки.
   Один и тот же код работает на сервере (require('./ved')) и в браузере (window.IOMA_VED).

   Типы расчёта:
     our_contract    — «Наш контракт»: позиции с кодами ТН ВЭД, таможенные платежи, фрахт, страховка, доп. расходы;
     client_contract — «Контракт клиента (без таможни)»: инвойс, фрахт, вес, страховка, доп. расходы;
     cargo           — «Карго (без таможни)»: ставка за кг/м³, стоимость товара и страховка в % (только просмотр старых расчётов).

   Таможенная стоимость позиции = инвойс + доля фрахта до границы ЕАЭС + доля страховки (всё в рублях по курсу ЦБ).
     Фрахт делится между позициями по весу (или берётся «фрахт вручную» у позиции).
     Для авто и прямого ЖД можно включить «делить фрахт до/после границы»: в базу идёт только % до границы (по умолчанию 30%).
   Пошлина: percent — % от ТС; min — большее из % и евро-части; plus — % плюс евро-часть; fixed_eur — только евро-часть.
     Евро-часть = ставка € за кг / л / шт / пар / м² × вес или количество × курс евро ЦБ.
   Антидемпинг — поверх пошлины: %, €/т, $/т, €/кг, $/кг.
   Акциз — % от ТС или ₽ за единицу (кол-во).
   НДС = (ТС + пошлина + антидемпинг + акциз) × ставка; общая ставка с 01.01.2026 — 22%, льготные — 10% и 0%.
   Таможенный сбор — по шкале от суммы ТС декларации (ПП РФ № 1637 от 28.11.2024 в ред. ПП № 1638 от 23.10.2025);
     для товаров из Приложения № 1 к ПП № 1637 — фиксированно 73 860 ₽. Шкала и суммы меняются в настройках. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.IOMA_VED = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DEFAULTS = {
    vatDefault: 22,
    feeScale: [[200000, 1231], [450000, 2462], [1200000, 4924], [2700000, 13541], [4200000, 18465], [5500000, 21344], [10000000, 49240], [null, 73860]],
    feeSource: 'ПП РФ № 1637 от 28.11.2024 в ред. ПП № 1638 от 23.10.2025, с 01.01.2026',
    radioFee: 73860, radioPrefixes: [],
    taxOnExpensesPct: 2.2,
    borderSplitPercent: 30,
  };
  var TYPES = { our_contract: 'Наш контракт', client_contract: 'Контракт клиента (без таможни)', cargo: 'Карго (без таможни)' };
  var CREATABLE = ['our_contract', 'client_contract'];
  var CURRENCIES = ['CNY', 'USD', 'EUR', 'RUB'];
  var TRANSPORT = { auto: 'Авто', sea: 'Море', rail: 'ЖД', avia: 'Авиа', multimodal: 'Мультимодальная' };
  var ANTIDUMP_UNITS = ['%', '€/т', '$/т', '€/кг', '$/кг'];
  var EUR_UNITS = ['кг', 'л', 'шт', 'пар', 'м²'];

  function n(v) { if (v == null || v === '') return 0; var x = Number(String(v).replace(/\s| /g, '').replace(',', '.')); return isFinite(x) ? x : 0; }
  function has(v) { return v != null && v !== '' && isFinite(Number(String(v).replace(',', '.'))); }
  function r2(v) { return Math.round((v || 0) * 100) / 100; }
  function unitOf(u) { u = String(u || 'кг').toLowerCase(); if (u === 'м2' || u === 'м²' || u === 'кв.м' || u === 'm2') return 'м²'; if (u === 'l' || u === 'л') return 'л'; if (u === 'шт' || u === 'pcs') return 'шт'; if (u === 'пар' || u === 'пара' || u === 'pair') return 'пар'; return 'кг'; }
  function eurRateOf(it) { var u = unitOf(it.eur_unit); return n(u === 'м²' ? it.eur_per_m2 : u === 'л' ? it.eur_per_l : (u === 'шт' || u === 'пар') ? it.eur_per_pcs : it.eur_per_kg); }

  function customsFee(valueRub, scale) {
    scale = scale && scale.length ? scale : DEFAULTS.feeScale;
    for (var i = 0; i < scale.length; i++) { var lim = scale[i][0]; if (lim == null || valueRub <= lim) return n(scale[i][1]); }
    return n(scale[scale.length - 1][1]);
  }

  /* Разбор текста ставки из справочника ТН ВЭД в поля позиции калькулятора.
     «10%» · «5%, но не менее 0,2 евро/кг» · «15% плюс 0,1 евро за 1 кг» · «0,5 евро/пара» · «0,3 евро за 1 л» */
  var UNIT_RX = [[/кг|kg/i, 'кг'], [/пар/i, 'пар'], [/шт|pcs|ед(?![а-яё])/i, 'шт'], [/м2|м²|кв\.?\s*м/i, 'м²'], [/^\s*л(?![а-яё])|литр|^l$/i, 'л']];
  function parseDuty(text) {
    var s = String(text == null ? '' : text).toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ');
    var out = { duty_type: 'percent', duty_rate: 0, eur_per_kg: 0, eur_per_l: 0, eur_per_pcs: 0, eur_per_m2: 0, eur_unit: 'кг', text: String(text || '') };
    if (!s.trim()) return out;
    var pct = s.match(/(\d+(?:\.\d+)?)\s*%/); if (pct) out.duty_rate = Number(pct[1]);
    var sp = s.match(/(\d+(?:\.\d+)?)\s*(?:евро|eur|€)[^\d%]*?(?:\/|за\s*(?:1\s*)?)\s*([а-яa-z²0-9.\s]{1,10})/);
    if (sp) {
      var v = Number(sp[1]), un = UNIT_RX.find(function (u) { return u[0].test(sp[2]); }), unit = un ? un[1] : 'кг';
      out.eur_unit = unit;
      if (unit === 'м²') out.eur_per_m2 = v; else if (unit === 'л') out.eur_per_l = v; else if (unit === 'шт' || unit === 'пар') out.eur_per_pcs = v; else out.eur_per_kg = v;
      out.duty_type = out.duty_rate ? (/плюс|\+/.test(s) ? 'plus' : 'min') : 'fixed_eur';
    }
    return out;
  }
  function parseVat(text, general) {
    var s = String(text == null ? '' : text); general = general || DEFAULTS.vatDefault;
    var m = s.match(/(\d+(?:[.,]\d+)?)\s*%/); if (!m) return general;
    var v = Number(m[1].replace(',', '.'));
    return v === 20 || v === 18 ? general : v; // в старых справочниках общая ставка 20% — сейчас действует общая ставка из настроек
  }

  // rates: { USD: 80.45, EUR: 92.77, CNY: 11.28 } — рублей за 1 единицу
  function rateOf(cur, rates) { cur = String(cur || 'RUB').toUpperCase(); if (cur === 'RUB') return 1; var r = rates && n(rates[cur]); return r > 0 ? r : 0; }
  function isRadio(code, prefixes) { code = String(code || '').replace(/\D/g, ''); return !!code && (prefixes || []).some(function (p) { p = String(p).replace(/\D/g, ''); return p && code.indexOf(p) === 0; }); }

  /* Расчёт документа. ctx = { rates, rateDate, settings } */
  function calcDoc(doc, ctx) {
    doc = doc || {}; ctx = ctx || {};
    var S = Object.assign({}, DEFAULTS, ctx.settings || {}), rates = ctx.rates || {}, warn = [];
    var type = TYPES[doc.calc_type] ? doc.calc_type : 'our_contract';
    var noCustoms = type !== 'our_contract';
    var items = (doc.items || []).slice(0, 200);
    var R = { calc_type: type, rate_date: ctx.rateDate || '', vat_default: n(S.vatDefault) || 22, fee_source: S.feeSource, items: [], extra_costs: [], warnings: warn };
    var displayCur = type === 'cargo' ? String(doc.cargo_rate_currency || 'CNY').toUpperCase() : String((items[0] && items[0].invoice_currency) || doc.freight_currency || 'CNY').toUpperCase();
    var dispRate = rateOf(displayCur, rates); if (!dispRate) { warn.push('Нет курса ЦБ для ' + displayCur + ' — итог показан в рублях'); displayCur = 'RUB'; dispRate = 1; }
    R.display_currency = displayCur; R.display_rate = dispRate;
    var disp = function (rub) { return r2(rub / dispRate); };
    var miss = function (cur, what) { warn.push('Нет курса ЦБ для ' + cur + (what ? ' (' + what + ')' : '') + ' — сумма не учтена'); };

    var freightRub = 0, insuranceRub = 0, invoiceRub = 0;
    if (type === 'cargo') {
      var cr = rateOf(doc.cargo_rate_currency || 'CNY', rates), gr = rateOf(doc.cargo_goods_currency || 'CNY', rates);
      if (!cr) miss(doc.cargo_rate_currency || 'CNY', 'ставка');
      if (n(doc.cargo_goods_value) && !gr) miss(doc.cargo_goods_currency || 'CNY', 'стоимость товара');
      freightRub = n(doc.cargo_rate_value) * n(doc.cargo_qty) * cr;
      insuranceRub = n(doc.cargo_goods_value) * gr * n(doc.cargo_insurance_percent) / 100;
      invoiceRub = n(doc.cargo_goods_value) * gr;
    } else {
      var fr = rateOf(doc.freight_currency || displayCur, rates), ir = rateOf(doc.insurance_currency || 'RUB', rates);
      if (n(doc.freight_total) && !fr) miss(doc.freight_currency, 'фрахт');
      if (n(doc.insurance_amount) && !ir) miss(doc.insurance_currency, 'страховка');
      freightRub = n(doc.freight_total) * fr; insuranceRub = n(doc.insurance_amount) * ir;
    }

    // позиции: инвойс в рублях, доли фрахта и страховки
    var rows = items.map(function (it) {
      var cur = String(it.invoice_currency || displayCur).toUpperCase(), rt = rateOf(cur, rates);
      if (n(it.invoice_amount) && !rt) miss(cur, it.name || it.tnved_code || 'инвойс');
      var inv = n(it.invoice_amount) * rt; if (type !== 'cargo') invoiceRub += inv;
      return { src: it, cur: cur, rate: rt, invRub: inv, weight: n(it.weight), override: has(it.freight_override) ? n(it.freight_override) * rt : null };
    });
    var fixedFreight = rows.reduce(function (s, r) { return s + (r.override != null ? r.override : 0); }, 0);
    var rest = Math.max(0, freightRub - fixedFreight), free = rows.filter(function (r) { return r.override == null; });
    var wSum = free.reduce(function (s, r) { return s + r.weight; }, 0), vSum = free.reduce(function (s, r) { return s + r.invRub; }, 0);
    var invAll = rows.reduce(function (s, r) { return s + r.invRub; }, 0);
    var splitOn = !!doc.border_split_enabled && (doc.transport_mode === 'auto' || doc.transport_mode === 'rail');
    var inBase = splitOn ? Math.min(100, Math.max(0, has(doc.border_split_percent) ? n(doc.border_split_percent) : S.borderSplitPercent)) / 100 : 1;
    R.border_split = splitOn ? r2(inBase * 100) : null;

    var T = { cv: 0, duty: 0, extra: 0, excise: 0, vat: 0, freightBase: 0 };
    rows.forEach(function (r) {
      var it = r.src, share = r.override != null ? r.override : rest * (wSum > 0 ? r.weight / wSum : vSum > 0 ? r.invRub / vSum : free.length ? 1 / free.length : 0);
      var ins = insuranceRub * (invAll > 0 ? r.invRub / invAll : rows.length ? 1 / rows.length : 0);
      var o = { freight_share_rub: r2(share), freight_share_display: r.rate ? r2(share / r.rate) : null, insurance_share_rub: r2(ins), rate_missing: !r.rate && n(it.invoice_amount) > 0 };
      if (!noCustoms) {
        var cv = r.invRub + share * inBase + ins;
        var unit = unitOf(it.eur_unit), qty = unit === 'кг' ? n(it.weight) : n(it.unit_qty), eurRate = rateOf('EUR', rates);
        var adv = cv * n(it.duty_rate) / 100, eurAmount = eurRateOf(it) * qty, eurRub = eurAmount * eurRate;
        var t = it.duty_type || 'percent';
        if (t !== 'percent' && eurRateOf(it) && !eurRate) miss('EUR', 'пошлина в евро');
        if (t !== 'percent' && eurRateOf(it) && !qty) warn.push('«' + (it.name || it.tnved_code || 'Позиция') + '»: для пошлины ' + eurRateOf(it) + ' €/' + unit + ' укажите ' + (unit === 'кг' ? 'вес' : 'количество, ' + unit));
        var duty = t === 'fixed_eur' ? eurRub : t === 'min' ? Math.max(adv, eurRub) : t === 'plus' ? adv + eurRub : adv;
        var du = Math.max(0, Math.min(4, Math.round(n(it.duty_extra_unit)))), dr = n(it.duty_extra_rate), kg = n(it.weight);
        var extra = !dr ? 0 : du === 0 ? cv * dr / 100 : du === 1 ? dr * kg / 1000 * rateOf('EUR', rates) : du === 2 ? dr * kg / 1000 * rateOf('USD', rates) : du === 3 ? dr * kg * rateOf('EUR', rates) : dr * kg * rateOf('USD', rates);
        var exQty = n(it.excise_qty) || qty, excise = it.excise_type === 'rub_per_unit' ? n(it.excise_rate) * exQty : it.excise_type === 'percent' ? cv * n(it.excise_rate) / 100 : 0;
        var vatRate = has(it.vat_rate) ? n(it.vat_rate) : n(S.vatDefault) || 22;
        var vat = (cv + duty + extra + excise) * vatRate / 100;
        T.cv += cv; T.duty += duty; T.extra += extra; T.excise += excise; T.vat += vat; T.freightBase += share * inBase;
        var total = r.invRub + share + ins + duty + extra + excise + vat;
        Object.assign(o, { customs_value_rub: r2(cv), duty_rub: r2(duty), duty_display: r.rate ? r2(duty / r.rate) : null, duty_eur_amount: r2(eurAmount), duty_adv_rub: r2(adv), duty_eur_rub: r2(eurRub), duty_extra_rub: r2(extra), excise_rub: r2(excise), vat_rate: vatRate, vat_rub: r2(vat), item_total_rub: r2(total), item_total_display: r.rate ? r2(total / r.rate) : null });
      } else {
        Object.assign(o, { item_total_rub: r2(r.invRub + share + ins), item_total_display: r.rate ? r2((r.invRub + share + ins) / r.rate) : null });
      }
      R.items.push(o);
    });

    // таможенный сбор: одна декларация на документ
    var fee = 0, radio = false;
    if (!noCustoms && rows.length && (T.cv > 0 || invoiceRub > 0)) {
      radio = !!doc.radio_fee || items.some(function (it) { return it.radio || isRadio(it.tnved_code, S.radioPrefixes); });
      fee = radio ? n(S.radioFee) || 73860 : customsFee(T.cv, S.feeScale);
    }

    // доп. расходы
    var extraTotal = 0;
    (doc.extra_costs || []).slice(0, 60).forEach(function (ec) {
      var o = { label: ec.label || '', is_percent_of_invoice: !!ec.is_percent_of_invoice };
      if (ec.is_percent_of_invoice) { o.amount_rub = r2(invoiceRub * n(ec.amount) / 100); o.rate = null; }
      else {
        var cur = String(ec.currency || 'RUB').toUpperCase(), rt = cur === 'RUB' ? 1 : ec.rate_mode === 'manual' ? n(ec.manual_rate) : rateOf(cur, rates);
        o.currency = cur; o.rate = rt || null;
        if (n(ec.amount) && !rt) { o.rate_missing = true; o.amount_rub = 0; }
        else o.amount_rub = r2(n(ec.amount) * rt);
      }
      o.amount_display = disp(o.amount_rub); extraTotal += o.amount_rub; R.extra_costs.push(o);
    });

    var taxPct = type === 'our_contract' ? n(S.taxOnExpensesPct) : 0;
    // как в рабочих таблицах (лист «Контракт»): налог = 2,2% от суммы всех строк — инвойс, комиссия, фрахт, страховка, таможенные платежи, сбор, декларант, доставка, прибыль
    var taxBase = invoiceRub + freightRub + insuranceRub + extraTotal + T.duty + T.extra + T.excise + T.vat + fee;
    var tax = taxBase * taxPct / 100;
    var grand = type === 'our_contract' ? invoiceRub + freightRub + insuranceRub + T.duty + T.extra + T.excise + T.vat + fee + extraTotal + tax : freightRub + insuranceRub + extraTotal;

    Object.assign(R, {
      invoice_sum_rub: r2(invoiceRub), invoice_sum_display: disp(invoiceRub),
      freight_total_rub: r2(freightRub), freight_total_display: disp(freightRub), freight_in_base_rub: r2(T.freightBase),
      insurance_total_rub: r2(insuranceRub), insurance_total_display: disp(insuranceRub),
      customs_base_sum_rub: r2(T.cv), customs_base_sum_display: disp(T.cv),
      duty_sum_rub: r2(T.duty + T.extra), duty_sum_display: disp(T.duty + T.extra), duty_extra_sum_rub: r2(T.extra), duty_extra_display: disp(T.extra),
      excise_sum_rub: r2(T.excise), excise_sum_display: disp(T.excise),
      vat_sum_rub: r2(T.vat), vat_sum_display: disp(T.vat),
      customs_fee_rub: r2(fee), customs_fee_display: disp(fee), customs_fee_radio: radio,
      customs_payments_rub: r2(T.duty + T.extra + T.excise + T.vat + fee),
      extra_total_rub: r2(extraTotal), extra_total_display: disp(extraTotal),
      tax_on_expenses_pct: taxPct, tax_on_expenses_rub: r2(tax), tax_on_expenses_display: disp(tax),
      grand_total_rub: r2(grand), grand_total_display: disp(grand),
      ratio_to_invoice: invoiceRub > 0 && type === 'our_contract' ? Math.round((grand - invoiceRub) / invoiceRub * 10000) / 10000 : null,
    });
    R.warnings = warn.filter(function (w, i, a) { return a.indexOf(w) === i; });
    return R;
  }

  /* Финансы сделки: статьи расходов и приходов. Для валюты: сумма в валюте × курс ЦБ на дату ввода. */
  function finance(items) {
    var rows = (items || []).map(function (x) {
      var cur = String(x.currency || 'RUB').toUpperCase(), foreign = cur !== 'RUB';
      var amount = foreign ? r2(n(x.amount_orig) * n(x.rate)) : r2(n(x.amount));
      return { id: x.id, kind: x.kind === 'income' ? 'income' : 'expense', label: String(x.label || ''), currency: cur, amount_orig: foreign ? n(x.amount_orig) : null, rate: foreign ? n(x.rate) : null, rateDate: foreign ? (x.rateDate || '') : '', amount: amount };
    });
    var inc = rows.filter(function (x) { return x.kind === 'income'; }).reduce(function (s, x) { return s + x.amount; }, 0);
    var exp = rows.filter(function (x) { return x.kind === 'expense'; }).reduce(function (s, x) { return s + x.amount; }, 0);
    var margin = r2(inc - exp);
    return { items: rows, income: r2(inc), expense: r2(exp), margin: margin, percent: inc ? Math.round(margin / inc * 1000) / 10 : 0, foreign: rows.some(function (x) { return x.currency !== 'RUB'; }), rateMissing: rows.some(function (x) { return x.currency !== 'RUB' && x.amount_orig && !x.rate; }) };
  }

  function newItem(cur) { return { name: '', name_is_auto: true, tnved_code: '', invoice_amount: 0, invoice_currency: cur || 'CNY', weight: 0, auto_lookup: true, duty_type: 'percent', duty_rate: 0, duty_extra_rate: 0, duty_extra_unit: 0, eur_per_kg: 0, eur_per_l: 0, eur_per_pcs: 0, eur_per_m2: 0, eur_unit: 'кг', unit_qty: 0, vat_rate: '', freight_override: null, excise_type: 'none', excise_rate: 0 }; }
  function newDoc(type, cur) {
    var d = { calc_type: TYPES[type] ? type : 'our_contract', name: '', transport_mode: 'sea', freight_total: 0, freight_currency: cur || 'CNY', insurance_amount: 0, insurance_currency: 'RUB', border_split_enabled: false, border_split_percent: DEFAULTS.borderSplitPercent, radio_fee: false, extra_costs: [], items: [newItem(cur)] };
    if (d.calc_type === 'our_contract') d.extra_costs.push({ label: 'Комиссия за перевод', amount: 3, is_percent_of_invoice: true });
    return d;
  }

  return { DEFAULTS: DEFAULTS, TYPES: TYPES, CREATABLE: CREATABLE, CURRENCIES: CURRENCIES, TRANSPORT: TRANSPORT, ANTIDUMP_UNITS: ANTIDUMP_UNITS, EUR_UNITS: EUR_UNITS,
    customsFee: customsFee, parseDuty: parseDuty, parseVat: parseVat, unitOf: unitOf, eurRateOf: eurRateOf, rateOf: rateOf, isRadio: isRadio, calcDoc: calcDoc, finance: finance, newDoc: newDoc, newItem: newItem };
});
