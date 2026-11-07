/* IOMASTAVKA — «Калькулятор ВЭД» (перенос calc.js): расчёты сделки и отдельные расчёты.
   Позиции с кодами ТН ВЭД из собственного справочника, пошлина %/€, антидемпинг, акциз, НДС, сбор, фрахт по весу,
   страховка, доп. расходы в любой валюте по курсу ЦБ или своему. Итог считается сразу, сохраняется при уходе с поля. */
(function () {
  'use strict';
  var K = window.CX, V = window.IOMA_VED; if (!K || !V) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var CURS = V.CURRENCIES, KC = window.IOMA_CONTRACT;
  var CUR_WORD = { CNY: 'юаней', USD: 'долларов США', EUR: 'евро', RUB: 'рублей' };

  function Calc(root, opts) { this.root = root; this.opts = opts || {}; this.docs = []; this.curId = null; this.doc = null; this.rates = {}; this.rateDate = ''; this.settings = null; this.busy = null; this.again = false; this.dirty = false; }
  Calc.prototype.listUrl = function () { return this.opts.dealId ? '/api/calc?deal=' + encodeURIComponent(this.opts.dealId) : '/api/calc?standalone=1'; };
  Calc.prototype.load = function (openId) {
    var self = this; self.root.innerHTML = '<p class="cx-load">Загружаю расчёты…</p>';
    return Promise.all([api(self.listUrl()), self.settings ? Promise.resolve({ settings: self.settings }) : api('/api/ved/settings')]).then(function (rr) {
      self.docs = rr[0].items; self.settings = rr[1].settings;
      if (!self.docs.length) return self.empty();
      var id = openId && self.docs.some(function (d) { return d.id === openId; }) ? openId : self.curId && self.docs.some(function (d) { return d.id === self.curId; }) ? self.curId : self.docs[0].id;
      return self.open(id);
    }).catch(function (e) { self.root.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  };
  Calc.prototype.addButtons = function () { return V.CREATABLE.map(function (t) { return '<button type="button" class="cx-btn primary sm" data-c="create" data-t="' + t + '">+ ' + esc(V.TYPES[t]) + '</button>'; }).join(''); };
  Calc.prototype.empty = function () {
    var self = this; self.root.innerHTML = '<div class="cv-empty"><p>Расчётов пока нет. «Наш контракт» — с пошлиной, НДС и таможенным сбором; «Контракт клиента» — только логистика без таможни.</p><div class="cv-addb">' + self.addButtons() + '</div></div>';
    self.bindTop();
  };
  Calc.prototype.bindTop = function () {
    var self = this;
    self.root.onclick = function (e) {
      var b = e.target.closest('[data-c]'); if (!b || !self.root.contains(b)) return; var c = b.dataset.c;
      if (c === 'create') return K.guard(b, function () { return api('/api/calc', { method: 'POST', body: { calc_type: b.dataset.t, dealId: self.opts.dealId || '' } }).then(function (r) { self.curId = r.id; return self.load(r.id); }); });
      if (c === 'tab') return self.flush().then(function () { self.open(b.dataset.id); });
      if (c === 'deldoc') { e.stopPropagation(); return K.confirm('Удалить этот расчёт?', 'Удалить', true).then(function (ok) { if (ok) api('/api/calc/' + b.dataset.id, { method: 'DELETE' }).then(function () { self.curId = null; self.load(); }); }); }
      self.click(b, c, e);
    };
  };
  Calc.prototype.open = function (id) {
    var self = this; self.curId = id;
    return api('/api/calc/' + id).then(function (r) {
      self.doc = r.doc; self.rates = r.rates || {}; self.rateDate = r.rateDate; self.result = r.result;
      var d = self.doc, pr = (d.extra_costs || []).filter(function (e) { return e.is_percent_of_invoice; })[0];
      if (self.isContract() && pr) { if (!d.payment) d.payment = +pr.amount === 3 ? 'bank' : 'cbr'; d.extra_costs = d.extra_costs.filter(function (e) { return !e.is_percent_of_invoice; }); self.dirty = true; }
      self.render(); if (self.dirty) self.persist();
    });
  };
  Calc.prototype.isContract = function () { return !!KC && this.doc && this.doc.calc_type !== 'cargo'; };
  Calc.prototype.calc = function () {
    this.result = V.calcDoc(this.doc, { rates: this.rates, rateDate: this.rateDate, settings: this.settings });
    var s = this.settings || {};
    this.contract = this.isContract() ? KC.calc(KC.fromVedDoc(this.doc, this.rates), { rates: this.rates, rateDate: this.rateDate, settings: { feeScale: s.feeScale, radioFee: s.radioFee, taxPct: s.taxOnExpensesPct } }) : null;
    return this.result;
  };
  function cur(sel, attr) { return '<select class="cv-cur" ' + attr + '>' + CURS.map(function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>'; }
  function numIn(attr, val, ph, w) { return '<input type="number" step="any" inputmode="decimal" class="cv-num" ' + attr + ' value="' + (val === 0 || val == null || val === '' ? '' : esc(val)) + '" placeholder="' + (ph || '0') + '"' + (w ? ' style="width:' + w + '"' : '') + '>'; }
  function fld(label, inner, cls) { return '<div class="cv-fld' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + inner + '</div>'; }
  Calc.prototype.render = function () {
    var self = this, d = self.doc, no = d.calc_type !== 'our_contract', cargo = d.calc_type === 'cargo', cc = d.calc_type === 'client_contract';
    var tabs = self.docs.map(function (x) { return '<button type="button" class="cv-tab' + (x.id === self.curId ? ' on' : '') + '" data-c="tab" data-id="' + esc(x.id) + '">' + esc(x.name || V.TYPES[x.calc_type]) + '<span data-c="deldoc" data-id="' + esc(x.id) + '" title="Удалить расчёт" aria-label="Удалить расчёт">✕</span></button>'; }).join('');
    var head = '<div class="cv-card cv-head"><input class="cv-name" data-d="name" value="' + esc(d.name || '') + '" placeholder="' + esc(V.TYPES[d.calc_type]) + ' — название расчёта (необязательно)"><select class="cv-sel" data-d="transport_mode">' + Object.keys(V.TRANSPORT).map(function (k) { return '<option value="' + k + '"' + (k === d.transport_mode ? ' selected' : '') + '>' + V.TRANSPORT[k] + '</option>'; }).join('') + '</select><em class="cx-tag">' + esc(V.TYPES[d.calc_type]) + '</em>'
      + (self.opts.standalone ? '<button type="button" class="cx-link" data-c="attach">' + (d.dealId ? 'Сделка привязана ✓' : 'Привязать к сделке') + '</button>' : '') + '</div>';
    var body = '';
    if (cargo) body += '<div class="cv-card" data-part="cargo">' + self.cargoHtml() + '</div>';
    else if (cc && !KC) body += '<div class="cv-card" data-part="simple">' + self.simpleHtml() + '</div>';
    else body += '<div class="cv-card"><div class="cv-ct">Позиции <button type="button" class="cx-btn primary sm" data-c="additem">+ Позиция</button></div><div data-part="items">' + self.itemsHtml() + '</div>'
      + '<label class="cv-check"><input type="checkbox" data-d="radio_fee"' + (d.radio_fee ? ' checked' : '') + '> Товар из Приложения № 1 к ПП № 1637 — таможенный сбор ' + K.money(self.settings.radioFee, 'RUB') + ' вместо шкалы</label></div>';
    if (!no || (cc && KC)) body += '<div class="cv-card"><div class="cv-row">' + fld('Фрахт (ставка агента)', '<span class="cv-combo">' + numIn('data-d="freight_total"', d.freight_total, '0', '120px') + cur(d.freight_currency, 'data-d="freight_currency"') + '</span>') + (KC ? fld('Надбавка агента к курсу, %', numIn('data-d="freight_fx" data-null="1"', d.freight_fx, '0', '80px')) : fld('Страховка', '<span class="cv-combo">' + numIn('data-d="insurance_amount"', d.insurance_amount, '0', '120px') + cur(d.insurance_currency, 'data-d="insurance_currency"') + '</span>')) + '</div>'
      + '<div class="cv-split"' + (d.transport_mode === 'auto' || d.transport_mode === 'rail' ? '' : ' hidden') + '><label class="cv-check"><input type="checkbox" data-d="border_split_enabled"' + (d.border_split_enabled ? ' checked' : '') + '> Делить фрахт до/после границы</label>' + fld('% до границы (в тамож. базу)', numIn('data-d="border_split_percent"', d.border_split_percent, String(self.settings.borderSplitPercent), '80px')) + '<small>При авто и прямом ЖД в таможенную стоимость по закону идёт только участок до границы ЕАЭС — остальное реальный расход, пошлиной и НДС не облагается.</small></div>'
      + '<small class="cv-hint">' + (KC ? 'Фрахт — как дал агент, с локальными расходами в Китае. Делится между позициями по весу брутто; «фрахт за кг» считается сам. Терминал, если агент его не включил, — строкой в «Доп. расходы».' : 'Фрахт делится между позициями по весу. Для своей доли впишите сумму в «Фрахт вручную» у позиции.') + '</small></div>'
      + (KC ? '<div class="cv-card" data-part="cond">' + self.condHtml() + '</div>' : '');
    body += '<div class="cv-card"><div class="cv-ct">Доп. расходы' + (cargo ? ' <small>терминал в РФ и пр. — по факту</small>' : '') + '</div><div data-part="extras">' + self.extrasHtml() + '</div><div class="cv-extot" data-r="extot"></div><div class="cv-add"><input data-c2="newextra" placeholder="Название новой статьи расхода…"><button type="button" class="cx-btn sm" data-c="addextra">+ Добавить</button></div></div>';
    if (no && self.opts.dealId) body += '<div class="cv-card"><div class="cv-ct">Комментарий к расчёту</div><div data-part="notes"></div><div class="cv-add"><input data-c2="note" placeholder="Комментарий к расчёту…"><button type="button" class="cx-btn sm" data-c="addnote">Отправить</button></div></div>';
    self.root.innerHTML = '<div class="cv-tabs">' + tabs + '<span class="cv-addb">' + self.addButtons() + '</span></div><div class="cv-layout"><div class="cv-main">' + head + body + '</div><aside class="cv-aside"><div class="cv-card cv-res"><div class="cv-ct">Итого</div><div data-r="result"></div>'
      + (self.isContract() ? '<button type="button" class="cx-btn primary sm cv-kpb" data-c="kp">Текст КП для клиента</button>' : '')
      + (self.opts.dealId ? '<button type="button" class="cx-btn sm" data-c="tofin" title="Добавит статьи расходов во вкладку «Финансы»">→ В финансы сделки</button>' : '') + '<small class="cv-rates">' + self.ratesLine() + '</small></div></aside></div>';
    self.bindTop(); self.bind(); self.paint();
    if (no && self.opts.dealId) self.notes();
  };
  Calc.prototype.ratesLine = function () { var r = this.rates; return 'Курс ЦБ' + (this.rateDate ? ' на ' + esc(this.rateDate) : '') + ': ' + ['USD', 'EUR', 'CNY'].map(function (c) { return c + ' ' + (r[c] ? K.num(r[c]) : '—'); }).join(' · '); };
  Calc.prototype.simpleHtml = function () {
    var d = this.doc; if (!d.items.length) d.items.push(V.newItem(d.freight_currency)); var it = d.items[0];
    return '<div class="cv-row">' + fld('Инвойс', '<span class="cv-combo">' + numIn('data-i="0" data-k="invoice_amount"', it.invoice_amount, '0', '110px') + cur(it.invoice_currency, 'data-i="0" data-k="invoice_currency"') + '</span>')
      + fld('Фрахт', '<span class="cv-combo">' + numIn('data-d="freight_total"', d.freight_total, '0', '110px') + cur(d.freight_currency, 'data-d="freight_currency"') + '</span>')
      + fld('Вес, кг', numIn('data-i="0" data-k="weight"', it.weight, '0', '90px')) + fld('Страховка', '<span class="cv-combo">' + numIn('data-d="insurance_amount"', d.insurance_amount, '0', '110px') + cur(d.insurance_currency, 'data-d="insurance_currency"') + '</span>') + '</div>';
  };
  Calc.prototype.cargoHtml = function () {
    var d = this.doc; return '<div class="cv-row">' + fld('Ставка за', '<select class="cv-sel" data-d="cargo_rate_basis"><option value="kg"' + (d.cargo_rate_basis !== 'm3' ? ' selected' : '') + '>кг</option><option value="m3"' + (d.cargo_rate_basis === 'm3' ? ' selected' : '') + '>м³</option></select>') + fld(d.cargo_rate_basis === 'm3' ? 'Объём, м³' : 'Вес, кг', numIn('data-d="cargo_qty"', d.cargo_qty, '0', '100px'))
      + fld('Ставка', '<span class="cv-combo">' + numIn('data-d="cargo_rate_value"', d.cargo_rate_value, '0', '100px') + cur(d.cargo_rate_currency, 'data-d="cargo_rate_currency"') + '</span>') + fld('Стоимость товара', '<span class="cv-combo">' + numIn('data-d="cargo_goods_value"', d.cargo_goods_value, '0', '110px') + cur(d.cargo_goods_currency, 'data-d="cargo_goods_currency"') + '</span>') + fld('Страховка, %', numIn('data-d="cargo_insurance_percent"', d.cargo_insurance_percent, '1–5', '80px')) + '</div>';
  };
  Calc.prototype.itemsHtml = function () {
    var self = this, d = self.doc; if (!d.items.length) d.items.push(V.newItem(d.freight_currency));
    return d.items.map(function (it, i) {
      var unit = V.unitOf(it.eur_unit), comb = it.duty_type !== 'percent' && V.eurRateOf(it), ro = it.auto_lookup ? ' readonly title="Подставлено из справочника ТН ВЭД. Снимите «авто», чтобы править вручную."' : '';
      var combHint = comb ? '<small class="cv-comb">' + ({ min: '(но не менее ' + V.eurRateOf(it) + ' €/' + unit + ')', plus: '(+ ' + V.eurRateOf(it) + ' €/' + unit + ')', fixed_eur: '(' + V.eurRateOf(it) + ' €/' + unit + ')' }[it.duty_type] || '') + '</small>' : '';
      return '<div class="cv-item" data-item="' + i + '"><div class="cv-ih"><input class="cv-iname" data-i="' + i + '" data-k="name" value="' + esc(it.name || '') + '" placeholder="Товар"><span class="cv-cert" data-cert="' + i + '"></span><button type="button" class="cx-ib danger" data-c="delitem" data-i="' + i + '" title="Удалить позицию">✕</button></div>'
        + '<div class="cv-row">'
        + fld('ТН ВЭД', '<span class="cv-combo"><input class="cv-code" data-i="' + i + '" data-k="tnved_code" value="' + esc(it.tnved_code || '') + '" placeholder="0000000000" inputmode="numeric" maxlength="13" list="cvCodes"><label class="cv-auto"><input type="checkbox" data-i="' + i + '" data-k="auto_lookup"' + (it.auto_lookup ? ' checked' : '') + '> авто</label></span>')
        + fld('Пошлина, %', '<span class="cv-combo">' + numIn('data-i="' + i + '" data-k="duty_rate"' + ro, it.auto_lookup && it.tnved_code && !it.duty_rate ? '0' : it.duty_rate, '0', '72px') + combHint + '</span>')
        + (it.duty_extra_rate || it._dump ? fld('Антидемпинг', '<span class="cv-combo">' + numIn('data-i="' + i + '" data-k="duty_extra_rate"', it.duty_extra_rate, '0', '72px') + '<select class="cv-cur" data-i="' + i + '" data-k="duty_extra_unit">' + V.ANTIDUMP_UNITS.map(function (u, j) { return '<option value="' + j + '"' + (+it.duty_extra_unit === j ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></span>') : '')
        + (it.excise_type && it.excise_type !== 'none' || it._exc ? fld('Акциз', '<span class="cv-combo">' + numIn('data-i="' + i + '" data-k="excise_rate"', it.excise_rate, '0', '72px') + '<select class="cv-cur" data-i="' + i + '" data-k="excise_type"><option value="percent"' + (it.excise_type === 'percent' ? ' selected' : '') + '>% от ТС</option><option value="rub_per_unit"' + (it.excise_type === 'rub_per_unit' ? ' selected' : '') + '>₽ за ед.</option></select></span>') : '')
        + fld('НДС, %', numIn('data-i="' + i + '" data-k="vat_rate"' + ro, it.vat_rate, String(self.settings.vatDefault), '64px'))
        + fld('Инвойс', '<span class="cv-combo">' + numIn('data-i="' + i + '" data-k="invoice_amount"', it.invoice_amount, '0', '100px') + cur(it.invoice_currency, 'data-i="' + i + '" data-k="invoice_currency"') + '</span>')
        + fld(KC ? 'Брутто, кг' : 'Вес, кг', numIn('data-i="' + i + '" data-k="weight"', it.weight, '0', '80px'))
        + (KC ? fld('Нетто, кг', numIn('data-i="' + i + '" data-k="net"', it.net, it.weight ? String(it.weight) : '= брутто', '80px')) : '')
        + (unit !== 'кг' || it.excise_type === 'rub_per_unit' ? fld('Кол-во, ' + (unit !== 'кг' ? unit : 'ед.'), numIn('data-i="' + i + '" data-k="unit_qty"', it.unit_qty, '0', '80px')) : '')
        + fld('Фрахт (авто)', '<b class="cv-auto-v" data-r="fr' + i + '">—</b>')
        + (KC ? '' : fld('Фрахт вручную', numIn('data-i="' + i + '" data-k="freight_override"', it.freight_override, '—', '86px')))
        + fld('Итого', '<b class="cv-itot" data-r="it' + i + '">—</b>', 'cv-right') + '</div>'
        + '<div class="cv-more">' + (KC ? '<label class="cv-check"><input type="checkbox" data-i="' + i + '" data-k="chz"' + (it.chz ? ' checked' : '') + '> Честный знак</label>' : '') + (KC || it.duty_extra_rate || it._dump ? '' : '<button type="button" class="cx-link" data-c="dump" data-i="' + i + '">+ антидемпинг</button>') + (KC || it.excise_type && it.excise_type !== 'none' || it._exc ? '' : '<button type="button" class="cx-link" data-c="exc" data-i="' + i + '">+ акциз</button>') + '<span class="cv-explain" data-r="ex' + i + '"></span></div></div>';
    }).join('') + '<datalist id="cvCodes"></datalist>';
  };
  Calc.prototype.extrasHtml = function () {
    var d = this.doc; if (!d.extra_costs.length) return '<p class="cx-empty">Нет статей</p>';
    return d.extra_costs.map(function (ec, i) {
      if (ec.is_percent_of_invoice) return '<div class="cv-ex" data-ex="' + i + '"><input class="cv-exl" value="' + esc(ec.label) + '" disabled>' + numIn('data-e="' + i + '" data-k="amount"', ec.amount, '0', '70px') + '<span class="cv-exhint">% от инвойса. 3% — коммерческий курс банка, 6% — курс ЦБ</span><b class="cv-exres" data-r="ex_' + i + '"></b><span class="cv-sp"></span></div>';
      var foreign = ec.currency !== 'RUB';
      return '<div class="cv-ex" data-ex="' + i + '"><input class="cv-exl" data-e="' + i + '" data-k="label" value="' + esc(ec.label) + '" placeholder="Название статьи">' + numIn('data-e="' + i + '" data-k="amount"', ec.amount, '0', '100px') + cur(ec.currency, 'data-e="' + i + '" data-k="currency"')
        + (foreign ? '<select class="cv-cur" data-e="' + i + '" data-k="rate_mode"><option value="cbr"' + (ec.rate_mode !== 'manual' ? ' selected' : '') + '>ЦБ</option><option value="manual"' + (ec.rate_mode === 'manual' ? ' selected' : '') + '>Ручн.</option></select>' + (ec.rate_mode === 'manual' ? numIn('data-e="' + i + '" data-k="manual_rate"', ec.manual_rate, 'курс', '80px') : '') : '')
        + '<b class="cv-exres" data-r="ex_' + i + '"></b><button type="button" class="cx-ib danger" data-c="delextra" data-i="' + i + '" title="Удалить">✕</button></div>';
    }).join('');
  };
  Calc.prototype.rerenderCond = function () { var box = $('[data-part=cond]', this.root); if (box) box.innerHTML = this.condHtml(); this.paint(); };
  Calc.prototype.condHtml = function () {
    var d = this.doc, our = d.calc_type === 'our_contract', cc = String((d.items[0] && d.items[0].invoice_currency) || d.freight_currency || 'CNY');
    var sel = function (key, opts) { return '<select class="cv-sel" data-d="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(d[key] || opts[0][0]) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    var txt = function (key, ph, w) { return '<input class="cv-txt" data-d="' + key + '" value="' + esc(d[key] || '') + '" placeholder="' + esc(ph) + '" style="width:' + (w || '180px') + '">'; };
    var h = '<div class="cv-ct">Условия расчёта</div><div class="cv-row">';
    if (our) h += fld('Оплата инвойса', sel('payment', [['cbr', 'по курсу ЦБ + 6%'], ['bank', 'по внутреннему курсу банка + 3%']]))
      + fld('Торговый дом', '<label class="cv-check"><input type="checkbox" data-d="td"' + (d.td ? ' checked' : '') + '> +4% к инвойсу</label>');
    h += fld('Страхование, % инвойса', numIn('data-d="insurance_pct" data-null="1"', d.insurance_pct, our ? '0.15' : '0', '80px'))
      + fld('Декларант', sel('declarant', our ? [['ecp', 'с ЭЦП клиента'], ['broker', 'под печать брокера'], ['none', 'без декларанта']] : [['none', 'без декларанта'], ['ecp', 'с ЭЦП клиента'], ['broker', 'под печать брокера']]))
      + fld('Декларант, ₽', numIn('data-d="declarant_rub" data-null="1"', d.declarant_rub, 'авто', '110px'));
    if (our) h += fld('Маржа, ' + cc, numIn('data-d="margin" data-null="1"', d.margin, 'авто', '110px'));
    h += '</div>';
    if (!our) h += '<div class="cv-ct">Наценки к ставке агента <small>в КП клиент видит их внутри фрахта</small></div>'
      + ((d.markups || []).map(function (m, i) { return '<div class="cv-ex"><input class="cv-exl" data-m="' + i + '" data-k="label" value="' + esc(m.label || '') + '" placeholder="Например: море">' + numIn('data-m="' + i + '" data-k="amount"', m.amount, '0', '90px') + cur(m.currency || 'USD', 'data-m="' + i + '" data-k="currency"') + '<button type="button" class="cx-ib danger" data-c="delmk" data-i="' + i + '" title="Удалить">✕</button></div>'; }).join('') || '<p class="cx-empty">Наценок нет</p>')
      + '<div class="cv-more">' + [['Забор EXW по Китаю', 150], ['Море', 200], ['ЖД', 150], ['Авто', 150], ['Авиа', 100]].map(function (x) { return '<button type="button" class="cx-link" data-c="addmk" data-l="Наценка: ' + x[0].toLowerCase() + '" data-a="' + x[1] + '">+ ' + x[0] + ' ' + x[1] + ' $</button>'; }).join(' ') + '</div>';
    h += '<div class="cv-row">' + fld('Срок доставки (для КП)', txt('kp_transit', 'например: 20–25 дней')) + fld('Ставка действительна до', txt('kp_valid', 'например: 15.11.2026', '150px')) + '</div>'
      + '<small class="cv-hint">Пошлина и НДС берутся из справочника по коду и руками не правятся — снимите «авто» у позиции, только если декларант дал другую ставку. ' + (our ? 'Маржа по умолчанию — 2 × «на налоги». ' : '') + 'Декларант: 25 000 ₽ с ЭЦП / 30 000 ₽ под печать брокера, до 3 кодов, +350 ₽ за код; Честный знак — 2 500 ₽ за 2 кода, +500 ₽ за код.</small>';
    return h;
  };
  Calc.prototype.paintContract = function (k) {
    var self = this, d = self.doc, cc = k.currency, f = function (v) { return K.money(v, cc); }, R = self.root;
    var set = function (key, h) { var el = $('[data-r="' + key + '"]', R); if (el) el.innerHTML = h; };
    k.items.forEach(function (o, i) {
      set('fr' + i, K.money(o.freightShare, cc));
      set('it' + i, o.dutyRub == null ? '<span class="cv-warn">нужно: ' + esc(o.need) + '</span>' : 'ТС ' + K.money(o.cvRub, 'RUB'));
      set('ex' + i, o.dutyRub == null ? '' : 'Пошлина ' + esc(o.dutyText) + ' → ' + K.money(o.dutyRub, 'RUB') + ' · НДС ' + K.num(o.vatRate) + '% → ' + K.money(o.vatRub, 'RUB'));
    });
    (d.extra_costs || []).forEach(function (ec, i) { var el = $('[data-r="ex_' + i + '"]', R); if (!el) return; var c = String(ec.currency || 'RUB'), rt = c === 'RUB' ? 1 : +self.rates[c] || 0; var amt = ec.rate_mode === 'manual' && c !== 'RUB' ? +ec.amount * +ec.manual_rate : +ec.amount * rt; el.innerHTML = rt || ec.rate_mode === 'manual' ? f(amt / (c === 'RUB' || ec.rate_mode === 'manual' ? k.rubRate : k.rate)) : '<span class="cv-warn">⚠ нет курса</span>'; });
    set('extot', '');
    var mi = $('[data-d=margin]', R); if (mi) mi.placeholder = 'авто: ' + K.num(k.marginAuto);
    var di = $('[data-d=declarant_rub]', R); if (di) di.placeholder = d.declarant === 'none' ? '—' : 'авто: ' + K.num(k.declarant.rub);
    var row = function (l, v, cls) { return '<div class="cv-rr' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + v + '</b></div>'; };
    var lock = ' <i class="cv-lock" title="Клиент этого не видит">🔒</i>';
    var h = (k.missing.length ? '<div class="cv-miss"><b>КП не формируется:</b>' + k.missing.map(function (w) { return '<p>' + esc(w) + '</p>'; }).join('') + '</div>' : '')
      + (k.warnings.length ? '<div class="cv-warns">' + k.warnings.map(function (w) { return '<p>⚠ ' + esc(w) + '</p>'; }).join('') + '</div>' : '')
      + k.lines.map(function (l) { var rub = l.rub != null && cc !== 'RUB' && !/^freight|^insurance/.test(l.key) ? '<small>' + K.money(l.rub, 'RUB') + '</small>' : ''; return row(esc(l.label) + (l.secret ? lock : ''), f(l.amount) + rub); }).join('')
      + '<div class="cv-total"><span>ИТОГО</span><b>' + f(k.total) + '</b>' + (k.totalRub ? '<small>≈ ' + K.money(k.totalRub, 'RUB') + ' по ЦБ</small>' : '') + '</div>'
      + (k.paymentNote ? '<small class="cv-sub">Оплата инвойса ' + esc(k.paymentNote) + (k.tdPct ? ', через торговый дом +' + K.num(k.tdPct) + '%' : '') + '</small>' : '')
      + (cc !== 'RUB' ? '<small class="cv-sub">ЦБ' + (k.rateDate ? ' на ' + esc(k.rateDate) : '') + ': 1 ' + cc + ' = ' + K.num(k.rate) + ' ₽; рублёвые строки — по ' + K.num(k.rubRate) + ' ₽</small>' : '')
      + (k.items.length > 1 && k.freightPerKg != null ? '<small class="cv-sub">Фрахт за кг брутто: ' + K.num(k.freightPerKg) + ' ' + cc + ' (' + K.num(k.totalGross) + ' кг)</small>' : '')
      + '<small class="cv-sub">' + (k.customs.inTotal ? 'На таможне' : 'Таможня справочно (платит клиент)') + ': ТС ' + K.money(k.customs.cvRub, 'RUB') + ' · пошлина ' + K.money(k.customs.dutyRub, 'RUB') + ' · НДС ' + K.money(k.customs.vatRub, 'RUB') + ' · сбор ' + K.money(k.customs.feeRub, 'RUB') + ' = <b>' + K.money(k.customs.paymentsRub, 'RUB') + '</b></small>'
      + '<small class="cv-sub">Прибыль' + lock + ': ' + f(k.profit) + (k.ratio != null ? ' · сверх инвойса ' + K.num(Math.round(k.ratio * 1000) / 10) + '%' : '') + '</small>';
    var box = $('[data-r=result]', R); if (box) box.innerHTML = h;
    // кнопка КП живёт вне перерисовываемого итога: иначе клик после ввода суммы терялся (поле теряет фокус → итог перерисован → кнопка заменена)
    var kb = $('[data-c=kp]', R); if (kb) { kb.disabled = !k.ok; kb.title = k.ok ? '' : 'Сначала заполните то, чего не хватает'; }
  };
  function fmtInt(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  Calc.prototype.kpText = function (k) {
    var d = this.doc, w = CUR_WORD[k.currency] || k.currency, names = d.items.map(function (it) { return it.name; }).filter(Boolean).join(', ');
    var inc = [], has = function (key) { return k.lines.some(function (l) { return l.key === key || l.key.indexOf(key) === 0; }); };
    var L = ['iomastavka — расчёт' + (names ? ': ' + names : '') + (V.TRANSPORT[d.transport_mode] ? ' (' + V.TRANSPORT[d.transport_mode].toLowerCase() + ')' : ''), ''];
    if (k.mode === 'our') {
      L.push('Стоимость контракта: ' + fmtInt(k.total) + ' ' + w + (k.totalRub ? ' (≈ ' + fmtInt(k.totalRub) + ' ₽ по курсу ЦБ' + (k.rateDate ? ' на ' + k.rateDate : '') + ')' : '') + '.');
      inc.push('стоимость товара по инвойсу и его оплата поставщику ' + k.paymentNote);
    } else L.push('Стоимость доставки: ' + fmtInt(k.total) + ' ' + w + '.');
    if (has('freight')) inc.push('фрахт и локальные расходы в Китае');
    if (has('insurance')) inc.push('страхование груза');
    if (k.customs.inTotal && has('customs')) inc.push('таможенные платежи: пошлина, НДС, таможенный сбор');
    if (has('declarant')) inc.push('таможенное оформление (услуги декларанта)');
    k.lines.forEach(function (l) { if (/^permit|^extra/.test(l.key)) inc.push(String(l.label).replace(/^[А-ЯЁA-Z](?=[а-яёa-z ])/, function (c) { return c.toLowerCase(); })); });
    if (inc.length) { L.push('', 'В стоимость включено:'); inc.forEach(function (x, i) { L.push('— ' + x + (i === inc.length - 1 ? '.' : ';')); }); }
    if (!k.customs.inTotal && k.customs.paymentsRub) L.push('', 'Таможенные платежи оплачиваются отдельно (справочно): пошлина ' + fmtInt(k.customs.dutyRub) + ' ₽, НДС ' + fmtInt(k.customs.vatRub) + ' ₽, сбор ' + fmtInt(k.customs.feeRub) + ' ₽.');
    if (d.kp_transit) L.push('', 'Срок доставки: ' + d.kp_transit + '.');
    if (d.kp_valid) L.push((d.kp_transit ? '' : '\n') + 'Ставка действительна до ' + d.kp_valid + '.');
    L.push('', 'Дополнительные расходы (оплачиваются по факту возникновения): досмотр, ИДК, ПРР, хранение, использование контейнера, простои, штрафы (отмена/перенос брони), документальное оформление, индексация тарифа.');
    return L.join('\n');
  };
  Calc.prototype.kpModal = function () {
    var k = this.calc() && this.contract; if (!k || !k.ok) return toast('Расчёт не готов: ' + (k ? k.missing.join('; ') : ''), 'err');
    var text = this.kpText(k);
    var md = K.modal('Текст КП для клиента', '<p class="cx-mut">Без маржи, налогов и комиссий — только итог и что в него входит.</p><textarea class="cv-kp" rows="16" readonly>' + esc(text) + '</textarea><div class="cv-setb"><button type="button" class="cx-btn primary" data-copy>Скопировать</button></div>', false);
    $('[data-copy]', md.el).addEventListener('click', function () { var ta = $('textarea', md.el); (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(function () { ta.select(); document.execCommand('copy'); }).then(function () { toast('Текст КП скопирован'); }); });
  };
  Calc.prototype.paint = function () {
    var self = this, r = self.calc();
    if (self.contract) return self.paintContract(self.contract);
    var d = self.doc, cc = r.display_currency, f = function (v) { return v == null ? '—' : K.money(v, cc); }, no = r.calc_type !== 'our_contract';
    (r.items || []).forEach(function (o, i) {
      var it = d.items[i], ic = (it && it.invoice_currency) || cc, set = function (k, h) { var el = $('[data-r="' + k + i + '"]', self.root); if (el) el.innerHTML = h; };
      set('fr', o.freight_share_display == null ? '—' : K.money(o.freight_share_display, ic));
      set('it', o.item_total_display == null ? '<span class="cv-warn">нет курса</span>' : K.money(o.item_total_display, ic));
      if (!no && it) { var u = V.unitOf(it.eur_unit), rate = V.eurRateOf(it), q = u === 'кг' ? +it.weight || 0 : +it.unit_qty || 0;
        set('ex', it.duty_type !== 'percent' && rate ? 'Пошлина: ' + rate + ' €/' + u + ' × ' + K.num(q) + ' ' + u + ' = ' + K.num(o.duty_eur_amount) + ' €' + (it.duty_rate ? ' и ' + it.duty_rate + '% от ТС' : '') + ({ min: ' — берётся большее', plus: ' — складываются' }[it.duty_type] || '') + ' → <b>' + K.money(o.duty_display, ic) + '</b>' : o.customs_value_rub ? 'Таможенная стоимость ' + K.money(o.customs_value_rub, 'RUB') + ' · пошлина ' + K.money(o.duty_rub, 'RUB') + ' · НДС ' + o.vat_rate + '% ' + K.money(o.vat_rub, 'RUB') : ''); }
    });
    (r.extra_costs || []).forEach(function (ec, i) { var el = $('[data-r="ex_' + i + '"]', self.root); if (el) el.innerHTML = ec.rate_missing ? '<span class="cv-warn" title="Курс не указан — статья не учтена">⚠ нет курса</span>' : f(ec.amount_display); });
    var et = $('[data-r=extot]', self.root); if (et) et.innerHTML = d.extra_costs.length ? 'Итого доп. расходы: <b>' + f(r.extra_total_display) + '</b>' : '';
    var row = function (l, v, cls) { return '<div class="cv-rr' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + v + '</b></div>'; };
    var rub = function (v) { return cc === 'RUB' ? '' : '<small>' + K.money(v, 'RUB') + '</small>'; };
    var h = (r.warnings.length ? '<div class="cv-warns">' + r.warnings.map(function (w) { return '<p>⚠ ' + esc(w) + '</p>'; }).join('') + '</div>' : '')
      + (no ? '' : row('Сумма инвойсов', f(r.invoice_sum_display))) + row('Фрахт', f(r.freight_total_display)) + (r.calc_type === 'cargo' ? '' : row('Страховка', f(r.insurance_total_display)))
      + (no ? '' : row('Таможенная стоимость', f(r.customs_base_sum_display)) + row('Пошлина', f(r.duty_sum_display)) + (r.duty_extra_sum_rub ? row('&nbsp;&nbsp;в т. ч. антидемпинг', f(r.duty_extra_display), 'sub') : '') + (r.excise_sum_rub ? row('Акциз', f(r.excise_sum_display)) : '') + row('НДС', f(r.vat_sum_display)) + row(r.customs_fee_radio ? 'Сбор (Прил. № 1 к ПП № 1637)' : 'Таможенный сбор', f(r.customs_fee_display)))
      + row('Доп. расходы', f(r.extra_total_display)) + (r.calc_type === 'our_contract' && r.tax_on_expenses_pct ? row('Налог на расходы (' + K.num(r.tax_on_expenses_pct) + '%)', f(r.tax_on_expenses_display)) : '')
      + '<div class="cv-total"><span>ИТОГО</span><b>' + f(r.grand_total_display) + '</b>' + rub(r.grand_total_rub) + '</div>'
      + (cc !== 'RUB' ? '<small class="cv-sub">по курсу ЦБ' + (r.rate_date ? ' на ' + esc(r.rate_date) : '') + ': 1 ' + cc + ' = ' + K.num(r.display_rate) + ' ₽</small>' : '')
      + (!no && r.ratio_to_invoice != null ? '<small class="cv-sub">Расходы сверх инвойса: ' + K.num(Math.round(r.ratio_to_invoice * 1000) / 10) + '%</small>' : '')
      + (!no ? '<small class="cv-sub">Платежи на таможне: ' + K.money(r.customs_payments_rub, 'RUB') + '</small>' : '');
    var box = $('[data-r=result]', self.root); if (box) box.innerHTML = h;
  };
  Calc.prototype.payload = function () { var d = this.doc; var o = {}; ['name', 'transport_mode', 'freight_total', 'freight_currency', 'insurance_amount', 'insurance_currency', 'border_split_enabled', 'border_split_percent', 'radio_fee', 'cargo_rate_basis', 'cargo_rate_value', 'cargo_qty', 'cargo_rate_currency', 'cargo_goods_value', 'cargo_goods_currency', 'cargo_insurance_percent'].forEach(function (k) { o[k] = d[k]; }); o.extra_costs = d.extra_costs; o.items = d.items.map(function (it) { var c = {}; for (var k in it) if (k[0] !== '_') c[k] = it[k]; return c; }); return o; };
  // сохранения идут строго по одному; если во время сохранения пришло ещё одно — после него выполняется ровно одно со свежими данными
  Calc.prototype.persist = function () {
    var self = this; if (!self.curId) return Promise.resolve();
    if (self.busy) { self.again = true; return self.busy; }
    self.busy = (function loop() { self.again = false; self.dirty = false; return api('/api/calc/' + self.curId, { method: 'PATCH', body: self.payload() }).then(function (r) { self.rates = r.rates || self.rates; self.rateDate = r.rateDate || self.rateDate; var dd = self.docs.find(function (x) { return x.id === self.curId; }); if (dd) dd.name = r.doc.name; if (self.again) return loop(); }); })()
      .catch(function (e) { toast('Расчёт не сохранён: ' + e.message, 'err'); }).then(function () { self.busy = null; });
    return self.busy;
  };
  Calc.prototype.flush = function () { return this.dirty ? this.persist() : Promise.resolve(); };
  Calc.prototype.setVal = function (el) {
    var d = this.doc, k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.value, isNum = el.type === 'number';
    if (isNum) v = v === '' ? (k === 'freight_override' || k === 'net' ? null : k === 'vat_rate' ? '' : 0) : Number(v);
    if (el.dataset.d) { d[el.dataset.d] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? (el.dataset.null ? null : 0) : Number(el.value)) : el.value; return el.dataset.d; }
    if (el.dataset.m != null && k) { var mk = (d.markups || [])[+el.dataset.m]; if (mk) mk[k] = isNum ? (v || 0) : v; return 'mk-' + k; }
    if (el.dataset.i != null && k) { var it = d.items[+el.dataset.i]; if (!it) return; if (k === 'tnved_code') v = String(v).replace(/\D/g, ''); if (k === 'name') it.name_is_auto = false; if (k === 'duty_extra_unit') v = +v; it[k] = v; return k; }
    if (el.dataset.e != null && k) { var ec = d.extra_costs[+el.dataset.e]; if (ec) ec[k] = isNum ? (v || 0) : v; return 'ex-' + k; }
  };
  Calc.prototype.bind = function () {
    var self = this, R = self.root;
    R.oninput = function (e) { var el = e.target; if (!el.dataset || !(el.dataset.d || el.dataset.k)) return; if (el.dataset.k === 'tnved_code') self.suggest(el); self.setVal(el); self.dirty = true; if (el.type === 'number' || el.dataset.k === 'name' || el.dataset.d === 'name') self.paint(); };
    R.onchange = function (e) {
      var el = e.target; if (!el.dataset || !(el.dataset.d || el.dataset.k)) return; var k = self.setVal(el); self.dirty = true;
      if (k === 'transport_mode' || k === 'cargo_rate_basis') { self.render(); }
      else if (k === 'auto_lookup') { if (el.checked) return self.lookup(+el.dataset.i); self.rerenderItems(); }
      else if (k === 'ex-currency' || k === 'ex-rate_mode') { var ec = self.doc.extra_costs[+el.dataset.e]; if (k === 'ex-currency' && ec.currency === 'RUB') ec.rate_mode = 'cbr'; self.rerenderExtras(); }
      else if (k === 'excise_type' || k === 'duty_extra_unit' || k === 'invoice_currency') self.rerenderItems();
      self.paint(); self.persist();
    };
    R.onfocusout = function (e) { var el = e.target; if (!el.dataset) return; if (el.dataset.k === 'tnved_code') { var i = +el.dataset.i, it = self.doc.items[i]; if (it && it.tnved_code && it.auto_lookup) return self.lookup(i); if (it && it.tnved_code) self.cert(i); } if (self.dirty) self.persist(); };
    R.onkeydown = function (e) { var el = e.target; if (e.key !== 'Enter' || !el.dataset) return; if (el.dataset.c2 === 'newextra') { e.preventDefault(); $('[data-c=addextra]', R).click(); } if (el.dataset.c2 === 'note') { e.preventDefault(); $('[data-c=addnote]', R).click(); } if (el.dataset.k === 'tnved_code') { e.preventDefault(); el.blur(); } };
    self.doc.items.forEach(function (it, i) { if (it.tnved_code && self.doc.calc_type === 'our_contract') self.cert(i); });
  };
  Calc.prototype.rerenderItems = function () { var box = $('[data-part=items]', this.root); if (box) box.innerHTML = this.itemsHtml(); var self = this; this.doc.items.forEach(function (it, i) { if (it._certData) self.certPaint(i); }); this.paint(); };
  Calc.prototype.rerenderExtras = function () { var box = $('[data-part=extras]', this.root); if (box) box.innerHTML = this.extrasHtml(); this.paint(); };
  Calc.prototype.click = function (b, c) {
    var self = this, d = self.doc, i = +b.dataset.i;
    if (c === 'additem') { var cc = (d.items[d.items.length - 1] || {}).invoice_currency || d.freight_currency; d.items.push(V.newItem(cc)); self.rerenderItems(); var n = $$('.cv-item', self.root); var last = n[n.length - 1]; if (last) $('.cv-iname', last).focus(); return self.persist(); }
    if (c === 'delitem') { d.items.splice(i, 1); if (!d.items.length) d.items.push(V.newItem(d.freight_currency)); self.rerenderItems(); return self.persist(); }
    if (c === 'dump') { d.items[i]._dump = true; self.rerenderItems(); var x = $('[data-i="' + i + '"][data-k=duty_extra_rate]', self.root); if (x) x.focus(); return; }
    if (c === 'exc') { d.items[i]._exc = true; d.items[i].excise_type = 'percent'; self.rerenderItems(); return; }
    if (c === 'addextra') { var inp = $('[data-c2=newextra]', self.root), lab = inp.value.trim(); if (!lab) return inp.focus(); d.extra_costs.push({ label: lab, amount: 0, is_percent_of_invoice: false, currency: 'RUB', rate_mode: 'cbr', manual_rate: 0 }); inp.value = ''; self.rerenderExtras(); var am = $$('.cv-ex [data-k=amount]', self.root); if (am.length) am[am.length - 1].focus(); return self.persist(); }
    if (c === 'delextra') { d.extra_costs.splice(i, 1); self.rerenderExtras(); return self.persist(); }
    if (c === 'addnote') { var ni = $('[data-c2=note]', self.root), v = ni.value.trim(); if (!v) return ni.focus(); return api('/api/deals/' + self.opts.dealId + '/notes', { method: 'POST', body: { type: 'calc', section: 'calc', text: v } }).then(function () { ni.value = ''; self.notes(); }); }
    if (c === 'tofin') return K.guard(b, function () { return self.flush().then(function () { return api('/api/calc/' + self.curId + '/to-finance', { method: 'POST' }); }).then(function (r) { toast('В финансы добавлено статей: ' + r.added); if (self.opts.onFinance) self.opts.onFinance(); }); });
    if (c === 'attach') return self.attach();
    if (c === 'addmk') { d.markups = d.markups || []; d.markups.push({ label: b.dataset.l || 'Наценка', amount: +b.dataset.a || 0, currency: 'USD' }); self.rerenderCond(); return self.persist(); }
    if (c === 'delmk') { d.markups.splice(i, 1); self.rerenderCond(); return self.persist(); }
    if (c === 'kp') return self.flush().then(function () { self.kpModal(); });
  };
  Calc.prototype.notes = function () {
    var self = this, box = $('[data-part=notes]', self.root); if (!box) return;
    api('/api/deals/' + self.opts.dealId).then(function (r) { var list = (r.item.activity || []).filter(function (a) { return a.section === 'calc'; }).reverse(); box.innerHTML = list.map(function (a) { return '<div class="cx-fhi"><small>' + K.dt(a.at) + ' · ' + esc(a.by || '') + '</small><p>' + esc(a.text) + '</p></div>'; }).join('') || '<p class="cx-empty">Пока нет записей</p>'; });
  };
  // подсказки кодов из собственного справочника (по цифрам или словам)
  var sugT = null;
  Calc.prototype.suggest = function (el) {
    var q = el.value.trim(); clearTimeout(sugT); if (q.length < 3) return;
    sugT = setTimeout(function () { api('/api/tnved/search?limit=12&q=' + encodeURIComponent(q)).then(function (r) { var dl = document.getElementById('cvCodes'); if (dl) dl.innerHTML = r.items.map(function (x) { return '<option value="' + esc(x.code) + '">' + esc(x.code + ' — ' + String(x.name || '').slice(0, 90)) + '</option>'; }).join(''); }).catch(function () {}); }, 220);
  };
  Calc.prototype.lookup = function (i) {
    var self = this, it = self.doc.items[i]; if (!it || !it.tnved_code) return Promise.resolve();
    return api('/api/tnved/lookup?code=' + encodeURIComponent(it.tnved_code)).then(function (r) {
      it.duty_type = r.duty_type; it.duty_rate = r.duty_value; it.eur_per_kg = r.eur_per_kg; it.eur_per_l = r.eur_per_l; it.eur_per_pcs = r.eur_per_pcs; it.eur_per_m2 = r.eur_per_m2; it.eur_unit = r.eur_unit; it.vat_rate = r.vat_rate;
      if (it.name_is_auto !== false || !it.name) { it.name = r.name ? String(r.name).slice(0, 300) : it.name; it.name_is_auto = true; }
      it.duty_text = r.duty_text || '';
      if (r.source === 'alta') toast('Ставки по коду ' + r.code + ' взяты с alta.ru'); else if (r.source === 'base') toast('alta.ru недоступен — ставки из встроенного справочника' + (r.baseDate ? ' на ' + String(r.baseDate).slice(0, 10) : ''));
      if (r.vat_options && r.vat_options.some(function (v) { return v.rate !== r.vat_rate; })) toast('По коду бывает льготный НДС: ' + r.vat_options.map(function (v) { return v.rate + '%' + (v.condition ? ' — ' + v.condition : ''); }).join('; ') + '. Если подходит — снимите «авто» и поменяйте НДС.');
      if (r.radio && !self.doc.radio_fee) toast('Код из Приложения № 1 к ПП № 1637 — включите сбор 73 860 ₽, если товар подпадает');
      if (!r.exact) toast('Точного кода нет в справочнике — взяты ставки позиции ' + r.code);
    }).catch(function (e) { toast(e.status === 404 ? 'Кода ' + it.tnved_code + ' нет в справочнике ТН ВЭД — заполните ставки вручную или загрузите справочник' : e.message, 'err'); it.auto_lookup = false; })
      .then(function () { self.dirty = true; self.rerenderItems(); self.persist(); self.cert(i); });
  };
  Calc.prototype.cert = function (i) {
    var self = this, it = self.doc.items[i]; if (!it || !it.tnved_code) return;
    var el = $('[data-cert="' + i + '"]', self.root); if (el) el.innerHTML = '<span class="cv-certl">⏳</span>';
    api('/api/tnved/cert?code=' + encodeURIComponent(it.tnved_code)).then(function (r) { it._certData = r; if (KC && it.chz == null && r.honest_sign && r.honest_sign.required) { it.chz = true; self.rerenderItems(); self.persist(); } self.certPaint(i); }).catch(function () { if (el) el.innerHTML = ''; });
  };
  Calc.prototype.certPaint = function (i) {
    var it = this.doc.items[i], r = it && it._certData, el = $('[data-cert="' + i + '"]', this.root); if (!el || !r) return;
    var parts = [];
    if (!r.found) parts.push('<span class="cv-cw" title="Кода нет в справочнике">❓ нет в справочнике</span>');
    else if (r.cert) { var L = { 'не требуется': '✅ не треб.', 'СС': '🔏 СС', 'ДС': '📄 ДС', 'СС или ДС': '📋 СС/ДС', 'СГР': '🏥 СГР' }; parts.push('<span title="' + esc(r.cert.reglaments || '') + '">' + (L[r.cert.doc_type] || '📋 ' + esc(r.cert.doc_type)) + '</span>'); if (r.cert.extra) parts.push('<span class="cv-cw" title="' + esc(r.cert.extra) + '">⚠️</span>'); }
    if (r.honest_sign) parts.push(r.honest_sign.required ? '<span class="cv-cw" title="' + esc(r.honest_sign.label || '') + '">🏷 ЧЗ обяз.</span>' : r.honest_sign.experiment ? '<span class="cv-cw" title="' + esc(r.honest_sign.label || '') + '">🏷 ЧЗ эксп.</span>' : '<span title="Честный знак не требуется">🏷 —</span>');
    el.innerHTML = parts.join(' ');
  };
  Calc.prototype.attach = function () {
    var self = this;
    var md = K.modal('Привязать расчёт к сделке', '<label class="cx-f"><span>Поиск сделки</span><input data-q placeholder="Название, клиент, №…"></label><div class="cx-lc" data-res></div>', false);
    var t = null, res = $('[data-res]', md.el);
    $('[data-q]', md.el).addEventListener('input', function () { var q = this.value.trim(); clearTimeout(t); t = setTimeout(function () { api('/api/deals?status=all&q=' + encodeURIComponent(q)).then(function (r) { res.innerHTML = r.items.slice(0, 12).map(function (x) { return '<button type="button" data-id="' + esc(x.id) + '"><b>' + esc(x.title) + '</b><small>№ ' + esc(x.number) + ' · ' + esc(x.clientName || '') + '</small></button>'; }).join('') || '<p class="cx-mut">Ничего не найдено</p>'; }); }, 250); });
    res.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (!b) return; api('/api/calc/' + self.curId, { method: 'PATCH', body: { dealId: b.dataset.id } }).then(function () { md.close(); toast('Расчёт перенесён в сделку'); self.load(); }); });
  };

  /* ---------- страница «Калькулятор ВЭД» в рабочем месте: отдельные расчёты + настройки ставок ---------- */
  var page = null;
  function settingsHtml(s, def) {
    return '<details class="cv-set"><summary>Настройки расчёта: НДС, шкала таможенных сборов, особый сбор, налог на расходы</summary><form class="cv-setf" data-vs>'
      + '<div class="cv-row">' + fld('НДС по умолчанию, %', numIn('name="vatDefault"', s.vatDefault, '22', '80px')) + fld('Налог на расходы, %', numIn('name="taxOnExpensesPct"', s.taxOnExpensesPct, '2.2', '80px')) + fld('Фрахт до границы, %', numIn('name="borderSplitPercent"', s.borderSplitPercent, '30', '80px')) + fld('Сбор по Прил. № 1, ₽', numIn('name="radioFee"', s.radioFee, '73860', '110px')) + '</div>'
      + '<label class="cx-f"><span>Коды из Приложения № 1 к ПП № 1637 (начало кода, через запятую) — для них сбор считается фиксированным</span><input name="radioPrefixes" value="' + esc((s.radioPrefixes || []).join(', ')) + '" placeholder="например: 8517 13, 8471 30"></label>'
      + '<div class="cv-scale"><b>Шкала таможенных сборов при ввозе</b><small>' + esc(def.feeSource) + '</small>' + s.feeScale.map(function (r, i) { return '<div class="cv-sr"><span>' + (r[0] == null ? 'свыше' : 'до') + '</span>' + (r[0] == null ? '<i>' + K.money(s.feeScale[i - 1] ? s.feeScale[i - 1][0] : 0, 'RUB') + '</i>' : numIn('data-lim="' + i + '"', r[0], '', '140px')) + '<span>₽ ТС →</span>' + numIn('data-fee="' + i + '"', r[1], '', '110px') + '<span>₽</span></div>'; }).join('') + '</div>'
      + '<div class="cv-setb"><button type="button" class="cx-link" data-vreset>Вернуть значения по умолчанию</button><button type="submit" class="cx-btn primary">Сохранить настройки</button></div></form></details>';
  }
  function loadPage() {
    var box = $('#cxVed'); if (!box) return;
    api('/api/ved/settings').then(function (r) {
      box.innerHTML = '<div class="cx-intro"><p>Расчёт таможенных платежей при ввозе в РФ: пошлина (%, € за кг/шт/л/м², «но не менее» и «плюс»), антидемпинг, акциз, НДС 22/10/0%, таможенный сбор по шкале 2026 года. Валюты — по курсу ЦБ на сегодня или своему курсу. Коды ТН ВЭД подставляются из собственного справочника — без платных сервисов.</p></div>'
        + settingsHtml(r.settings, r.defaults) + '<div id="cxVedCalc" class="cv-root"></div>';
      var f = $('[data-vs]', box);
      f.addEventListener('submit', function (e) { e.preventDefault(); var b = {}; $$('[name]', f).forEach(function (i) { b[i.name] = i.value; }); var sc = r.settings.feeScale.map(function (row, i) { var lim = $('[data-lim="' + i + '"]', f), fee = $('[data-fee="' + i + '"]', f); return [lim ? lim.value : null, fee.value]; }); b.feeScale = sc;
        api('/api/ved/settings', { method: 'PUT', body: b }).then(function () { toast('Настройки расчёта сохранены'); page && (page.settings = null); loadPage(); }).catch(function (er) { toast(er.message, 'err'); }); });
      $('[data-vreset]', f).addEventListener('click', function () { K.confirm('Вернуть ставки и шкалу сборов по умолчанию?', 'Вернуть').then(function (ok) { if (ok) api('/api/ved/settings', { method: 'PUT', body: { reset: true } }).then(function () { loadPage(); }); }); });
      page = new Calc($('#cxVedCalc'), { standalone: true }); page.load();
    }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  K.on('ved', loadPage);

  var mounted = new WeakMap();
  window.IOMA_CALC = {
    mount: function (el, opts) { var c = mounted.get(el); if (!c || c.opts.dealId !== opts.dealId) { c = new Calc(el, opts); mounted.set(el, c); } c.opts = opts; c.settings = null; return c.load(); },
    Calc: Calc,
  };
})();
