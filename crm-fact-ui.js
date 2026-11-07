/* IOMASTAVKA — в сделке: «Факт» (после «✓ Успешно») и «ЭТрН»; в меню работы — «Мои средства».
   «Факт»: что клиент должен (инвойс по курсу оплаты поставщику + услуги по курсу ЦБ на дату ДТ), что оплатил, что потратили,
   прибыль компании и личные 5%. Считается сразу при вводе (fact.js), сохраняется кнопкой.
   «ЭТрН»: выбираете контракт и куда везём — сайт показывает, кто что подписывает в Контур.Диадоке, по шагам, с отметками. */
(function () {
  'use strict';
  var K = window.CX, F = window.IOMA_FACT; if (!K || !F) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var CURS = ['CNY', 'USD', 'EUR', 'RUB'], SIGN = { CNY: '¥', USD: '$', EUR: '€', RUB: '₽' };
  var rub = function (v) { return v == null ? '—' : Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽'; };
  var rub0 = function (v) { return v == null ? '—' : Math.round(Number(v)).toLocaleString('ru-RU') + ' ₽'; };
  var nf = function (v) { return v === '' || v == null ? '' : String(v); };
  var inp = function (attrs, v, ph, w) { return '<input ' + attrs + ' inputmode="decimal" value="' + esc(nf(v)) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (w ? ' style="width:' + w + '"' : '') + '>'; };
  var curSel = function (attrs, c) { return '<select ' + attrs + '>' + CURS.map(function (k) { return '<option' + (k === c ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>'; };

  /* ================= «Факт» ================= */
  function Fact(el, deal) { this.el = el; this.deal = deal; }
  Fact.prototype.load = function () {
    var self = this; self.el.innerHTML = '<p class="cx-load">Загружаю «Факт»…</p>';
    return api('/api/deals/' + self.deal.id + '/fact').then(function (r) { self.r = r; self.f = r.fact; self.draw(); }).catch(function (e) { self.el.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  };
  Fact.prototype.draw = function () {
    var f = this.f, r = this.r, c = f.currency || 'CNY';
    var del = function (k, i) { return '<button type="button" class="cx-ib" data-x="del-' + k + '" data-i="' + i + '" title="Убрать строку" aria-label="Убрать строку">✕</button>'; };
    var rowE = function (e, i) {
      var foreign = e.currency !== 'RUB';
      return '<div class="fx-row" data-i="' + i + '"><div class="fx-r1"><input data-e="label" value="' + esc(e.label) + '" aria-label="Статья расхода">' + del('e', i) + '</div>'
        + '<div class="fx-r2">' + inp('data-e="amount" aria-label="Сумма"', e.amount, e.plan != null && !foreign ? 'план ' + Math.round(e.plan).toLocaleString('ru-RU') : 'сумма', '120px') + curSel('data-e="currency" aria-label="Валюта"', e.currency)
        + (foreign ? '<span class="cx-mut">×</span>' + inp('data-e="rate" aria-label="Курс оплаты, ₽"', e.rate, 'курс оплаты', '100px') : '') + '<b class="fx-rub" data-o="e' + i + '"></b></div></div>';
    };
    var rowI = function (e, i) {
      return '<div class="fx-row" data-i="' + i + '"><div class="fx-r1"><input data-p="label" value="' + esc(e.label) + '" aria-label="Назначение платежа">' + del('p', i) + '</div>'
        + '<div class="fx-r2"><input type="date" data-p="date" value="' + esc(e.date || '') + '" aria-label="Дата оплаты">' + inp('data-p="amount" aria-label="Сумма, ₽"', e.amount, 'сумма, ₽', '140px') + '<span class="cx-mut">₽</span></div></div>';
    };
    var rowX = function (e, i) {
      return '<div class="fx-row" data-i="' + i + '"><div class="fx-r1"><input data-b="label" value="' + esc(e.label) + '" aria-label="За что">' + del('b', i) + '</div>'
        + '<div class="fx-r2">' + inp('data-b="amount" aria-label="Сумма, ₽"', e.amount, 'сумма, ₽', '140px') + '<span class="cx-mut">₽</span></div></div>';
    };
    var head = '<div class="fx-head"><div><h3>Факт по сделке</h3><p class="cx-mut cx-small">' + (r.saved ? 'Сохранено ' + K.dt(r.updatedAt) + (r.by ? ' · ' + esc(r.by) : '') : 'Черновик: сумма контракта, инвойс и плановые расходы взяты из расчёта контракта — внесите факт и сохраните.') + '</p>'
      + (r.won ? '' : '<p class="cx-tag amb">Сделка ещё не отмечена «✓ Успешно» — «Мои средства» начислятся после отметки</p>') + '</div>'
      + '<div class="fx-hb"><button type="button" class="cx-btn ghost sm" data-x="reset" title="Заново взять сумму контракта и плановые расходы из расчёта">Взять план из расчёта</button><button type="button" class="cx-btn primary" data-x="save">Сохранить</button></div></div>';
    var due = '<section class="fx-card"><h4>Клиент должен</h4><div class="fx-grid">'
      + '<label class="cx-f"><span>Сумма контракта</span><span class="fx-amt">' + inp('data-f="contractTotal"', f.contractTotal, '0', '130px') + curSel('data-f="currency"', c) + '</span></label>'
      + '<label class="cx-f"><span>в т. ч. инвойс, ' + esc(c) + '</span>' + inp('data-f="invoice"', f.invoice, '0', '130px') + '</label>'
      + '<label class="cx-f"><span>Курс оплаты поставщику, ₽ за 1 ' + esc(c) + '</span><span class="fx-amt">' + inp('data-f="rateSupplier"', f.rateSupplier, f.payment === 'bank' ? 'курс банка' : 'ЦБ на день оплаты', '110px') + '<input type="date" data-f="dateSupplier" value="' + esc(f.dateSupplier || '') + '" aria-label="Дата оплаты поставщику"></span></label>'
      + '<label class="cx-f"><span>Курс ЦБ на дату ДТ, ₽ за 1 ' + esc(c) + '</span><span class="fx-amt">' + inp('data-f="rateDt"', f.rateDt, 'графа 23 ДТ', '110px') + '<input type="date" data-f="dateDt" value="' + esc(f.dateDt || '') + '" aria-label="Дата ДТ"></span></label>'
      + '</div><div class="fx-sum" data-o="dueLines"></div>'
      + '<details class="fx-more"' + ((f.extraBilled || []).length ? ' open' : '') + '><summary>Доп. расходы, выставленные клиенту по факту (ИДК, взвешивание…)</summary>' + (f.extraBilled || []).map(rowX).join('') + '<button type="button" class="cx-link" data-x="add-b">+ строка</button></details></section>';
    var paid = '<section class="fx-card"><h4>Оплатил клиент</h4>' + (f.incomes || []).map(rowI).join('') + '<button type="button" class="cx-link" data-x="add-p">+ оплата</button><div class="fx-sum" data-o="paidLines"></div></section>';
    var spent = '<section class="fx-card"><h4>Потратили</h4><div class="fx-row fx-fixed"><span>Оплата поставщику (инвойс по курсу оплаты)</span><b class="fx-rub" data-o="supplier"></b></div>' + (f.expenses || []).map(rowE).join('')
      + '<button type="button" class="cx-link" data-x="add-e">+ расход</button><div class="fx-sum" data-o="spentLines"></div></section>';
    var aside = '<aside class="fx-aside"><div class="fx-tot" data-o="totals"></div><label class="cx-f"><span>Комментарий</span><textarea data-f="note" rows="3">' + esc(f.note || '') + '</textarea></label></aside>';
    this.el.innerHTML = '<div class="fx">' + head + '<div class="fx-body"><div class="fx-main">' + due + paid + spent + '</div>' + aside + '</div></div>';
    this.paint();
    if (!this.bound) { this.bound = true; this.el.addEventListener('input', this.onInput.bind(this)); this.el.addEventListener('change', this.onInput.bind(this)); this.el.addEventListener('click', this.onClick.bind(this)); }
  };
  Fact.prototype.read = function () {
    var f = this.f, el = this.el;
    $$('[data-f]', el).forEach(function (i) { f[i.dataset.f] = i.value; });
    var rows = function (sel, key, list) { $$(sel, el).forEach(function (row) { var o = list[+row.dataset.i]; if (!o) return; $$('[data-' + key + ']', row).forEach(function (i) { o[i.dataset[key]] = i.value; }); }); };
    rows('.fx-row:has([data-e])', 'e', f.expenses); rows('.fx-row:has([data-p])', 'p', f.incomes); rows('.fx-row:has([data-b])', 'b', f.extraBilled || (f.extraBilled = []));
  };
  Fact.prototype.paint = function () {
    var R = F.calc(this.f, { bonusPct: this.r.result && this.r.result.bonusPct }), el = this.el, c = R.currency, out = function (k, h) { var o = $('[data-o="' + k + '"]', el); if (o) o.innerHTML = h; };
    this.res = R;
    out('dueLines', '<div><span>Инвойс: ' + K.num(R.invoice) + ' ' + esc(c) + ' × ' + K.num(R.rateSupplier) + '</span><b>' + rub(R.invoiceRub) + '</b></div><div><span>Услуги: ' + K.num(R.services) + ' ' + esc(c) + ' × ' + K.num(R.rateDt) + '</span><b>' + rub(R.servicesRub) + '</b></div>'
      + (R.extraRub ? '<div><span>Доп. расходы клиенту</span><b>' + rub(R.extraRub) + '</b></div>' : '') + '<div class="fx-total"><span>Итого клиент должен</span><b>' + rub(R.due) + '</b></div>');
    out('paidLines', '<div class="fx-total"><span>Оплачено</span><b>' + rub(R.paid) + '</b></div><div class="fx-total ' + (R.debt > 0.004 ? 'red' : 'green') + '"><span>' + (R.debt > 0.004 ? 'Долг клиента' : R.debt < -0.004 ? 'Переплата клиента' : 'Долга нет') + '</span><b>' + rub(Math.abs(R.debt)) + '</b></div>');
    out('supplier', rub(R.invoiceRub));
    R.expenses.slice(1).forEach(function (e, i) { out('e' + i, (e.fact ? rub(e.rub) : '<small class="cx-mut">не внесено</small>') + (e.diff != null && Math.abs(e.diff) >= 0.01 ? '<small class="fx-diff ' + (e.diff > 0 ? 'red' : 'green') + '">' + (e.diff > 0 ? '+' : '−') + rub0(Math.abs(e.diff)) + ' к плану</small>' : e.plan != null && !e.fact ? '<small class="cx-mut">план ' + rub0(e.plan) + '</small>' : '')); });
    out('spentLines', '<div class="fx-total"><span>Всего потратили</span><b>' + rub(R.spent) + '</b></div>' + (R.planSpent != null ? '<div><span class="cx-mut">по плану (без инвойса)</span><span class="cx-mut">' + rub0(R.planSpent) + '</span></div>' : ''));
    out('totals', '<div class="fx-big"><small>Прибыль компании</small><b class="' + (R.profit < 0 ? 'red' : '') + '">' + rub(R.profit) + '</b></div>'
      + '<div class="fx-line"><span>Клиент должен</span><b>' + rub(R.due) + '</b></div><div class="fx-line"><span>Потратили</span><b>' + rub(R.spent) + '</b></div>'
      + '<div class="fx-line"><span>Деньги на руках сейчас</span><b>' + rub(R.cash) + '</b></div><div class="fx-line ' + (R.debt > 0.004 ? 'red' : '') + '"><span>Долг клиента</span><b>' + rub(Math.max(R.debt, 0)) + '</b></div>'
      + '<div class="fx-wallet"><small>Мои средства · ' + K.num(R.bonusPct) + '% от прибыли</small><b>' + rub(R.bonus) + '</b>' + (this.r.saved ? '<label class="cx-cbx"><input type="checkbox" data-x="paid"' + (this.f.bonusPaid ? ' checked' : '') + '> получены' + (this.f.bonusPaidAt ? ' ' + K.d(this.f.bonusPaidAt) : '') + '</label>' : '<small class="cx-mut">начислятся после сохранения</small>') + '</div>'
      + (R.missing.length ? '<p class="fx-warn red">Не хватает: ' + R.missing.map(esc).join(', ') + '</p>' : '') + (R.warnings.length ? '<p class="fx-warn">' + R.warnings.map(esc).join('<br>') + '</p>' : ''));
  };
  Fact.prototype.onInput = function (e) {
    if (e.target.matches('[data-x="paid"]')) return;
    if (e.target.matches('[data-e="currency"], [data-f="currency"]') && e.type === 'change') { this.read(); return this.draw(); }
    if (e.target.matches('input, select, textarea')) { this.read(); this.paint(); this.dirty = true; }
  };
  Fact.prototype.onClick = function (e) {
    var b = e.target.closest('[data-x]'); if (!b) return; var x = b.dataset.x, self = this, f = this.f;
    if (x === 'paid') { if (!self.r.saved) return; return api('/api/deals/' + self.deal.id + '/fact/paid', { method: 'POST', body: { paid: b.checked } }).then(function (o) { f.bonusPaid = o.paid; f.bonusPaidAt = o.paidAt; toast(o.paid ? 'Отмечено: мои средства получены' : 'Отметка снята'); self.paint(); }).catch(function (er) { b.checked = !b.checked; toast(er.message, 'err'); }); }
    this.read();
    if (x === 'add-e') { f.expenses.push({ label: 'Иные расходы', currency: 'RUB', amount: '', rate: '', plan: null }); return this.draw(); }
    if (x === 'add-p') { f.incomes.push({ label: 'Оплата клиента', amount: '', date: K.today() }); return this.draw(); }
    if (x === 'add-b') { (f.extraBilled = f.extraBilled || []).push({ label: 'Доп. расходы клиенту', amount: '' }); return this.draw(); }
    if (x === 'del-e' || x === 'del-p' || x === 'del-b') { var l = x === 'del-e' ? f.expenses : x === 'del-p' ? f.incomes : f.extraBilled; l.splice(+b.dataset.i, 1); return this.draw(); }
    if (x === 'save') return K.guard(b, function () { return api('/api/deals/' + self.deal.id + '/fact', { method: 'PUT', body: f }).then(function (o) { self.r.saved = true; self.r.updatedAt = new Date().toISOString(); self.f = o.fact; self.dirty = false; toast('«Факт» сохранён' + (o.result.ok ? '' : ' — не хватает: ' + o.result.missing.join(', '))); self.draw(); }); });
    if (x === 'reset') return K.confirm('Заново взять сумму контракта, инвойс и плановые расходы из расчёта? Внесённые суммы пропадут.', 'Взять план').then(function (ok) { if (ok) api('/api/deals/' + self.deal.id + '/fact/reset', { method: 'POST' }).then(function (o) { self.r = Object.assign(self.r, o, { saved: false }); self.f = o.fact; self.draw(); }).catch(function (er) { toast(er.message, 'err'); }); });
  };

  /* ================= ЭТрН ================= */
  // по документу владельца «Сценарии доставки груза»: 1А/1Б — контракт клиента (мы — экспедитор), 2А/2Б — наш контракт (мы продаём товар)
  var SC = {
    'client|client': { code: '1А', title: 'Контракт клиента → склад клиента', rel: 'Экспедирование по договору с клиентом; клиент сам сторона ВЭД-контракта', rcv: 'Клиент — его сотрудник с МЧД принимает груз и подписывает ЭТрН на своём складе', mchd: 'Клиент — на своего сотрудника-приёмщика', risk: 'На клиенте' },
    'client|tk': { code: '1Б', title: 'Контракт клиента → терминал ТК', rel: 'Экспедирование по договору с клиентом; дальше груз ведёт транспортная компания', rcv: 'ТК — её представитель принимает груз на терминале по своей МЧД', mchd: 'ТК — на своего представителя на терминале', risk: 'На ТК' },
    'our|client': { code: '2А', title: 'Наш контракт → склад клиента', rel: 'Мы продаём товар клиенту (купля-продажа) и доставляем до его склада', rcv: 'Клиент (Покупатель) — его сотрудник с МЧД принимает груз и подписывает ЭТрН на своём складе', mchd: 'Клиент — на своего сотрудника-приёмщика', risk: 'На клиенте' },
    'our|tk': { code: '2Б', title: 'Наш контракт → терминал ТК', rel: 'Мы продаём товар клиенту, груз забирает ТК по поручению клиента', rcv: 'ТК — её представитель принимает груз на терминале, дальше везёт клиенту сама', mchd: 'ТК — на своего представителя на терминале', risk: 'На ТК' },
  };
  function steps(e, x) {
    var ours = e.contract === 'our', tk = e.dest === 'tk', client = x.company || x.contactName || 'клиент', tkName = e.tk || 'ТК';
    var sender = ours ? 'мы (товар наш, продаём его клиенту)' : 'клиент — ' + client, rcv = tk ? tkName + ' (представитель на терминале)' : client + ' (сотрудник с МЧД)';
    var cargo = [x.cargo, x.weight ? Number(x.weight).toLocaleString('ru-RU') + ' кг брутто' : '', x.places ? x.places + ' мест' : ''].filter(Boolean).join(', ');
    var L = [
      { id: 's0', st: '0. Поручение на вывоз с СВХ', doc: 'Поручение экспедитору', who: 'Мы формируем и направляем в ФЛГ, ФЛГ подписывает со своей стороны', where: 'Личный кабинет ФЛГ или почта — вне Диадока',
        put: ['Номер ДТ и контейнера / машины', 'Кто перевозчик на этом плече' + (e.selfEmployed ? ' — сообщите, что отдельного перевозчика нет (аренда ТС с экипажем)' : ''), 'Куда везём: ' + (tk ? 'терминал ' + tkName : 'склад клиента ' + client + (x.to ? ', ' + x.to : ''))] },
      { id: 's1', st: '1. Приёмка груза на СВХ', doc: 'Экспедиторская расписка (модуль ЭР — в разработке, пока поручение + ЭТрН)', who: 'ФЛГ принимает груз во владение как экспедитор', where: 'Контур.Диадок, модуль «Логистика»' },
      { id: 's2', st: '2. Оформление отправки', doc: 'ЭТрН, титул Т1', who: 'ФЛГ формирует и подписывает Т1 как экспедитор, от имени грузоотправителя: ' + sender + ' (сценарий №13 каталога Диадока)', where: 'Контур.Диадок, модуль «Логистика»',
        put: ['Грузоотправитель: ' + sender, 'Грузополучатель: ' + rcv, 'Груз: ' + (cargo || 'наименование, масса брутто, количество мест'), 'Пункт погрузки: СВХ', 'Пункт выгрузки: ' + (tk ? 'терминал ' + tkName : (x.to || 'адрес склада клиента')), 'Перевозчик, водитель, номер машины', 'Сопроводительные документы: ДТ' + (ours ? ', УПД' : ', инвойс')] },
      { id: 's3', st: '3. Заказ-заявка на перевозку', doc: 'ЭЗЗ, титулы Т1 → Т2', who: 'Мы (или ФЛГ по нашему поручению) формируем ЭЗЗ Т1 и отправляем перевозчику; перевозчик подписывает Т2 — подтверждает рейс', where: 'Контур.Диадок, модуль «Логистика»',
        put: ['Заказчик перевозки: мы', 'Маршрут: СВХ → ' + (tk ? 'терминал ' + tkName : (x.to || 'склад клиента')), 'Дата и время подачи машины', 'Груз: ' + (cargo || 'наименование, вес, места'), 'Стоимость рейса'] },
      { id: 's4', st: '4. Перевозка', doc: 'ЭТрН, титулы Т2 и Т4', who: 'Перевозчик получает ЭТрН Т1 и ЭЗЗ, подписывает Т2 (принял груз) и Т4 (сдал груз) — сценарий №16', where: 'Контур.Диадок, модуль «Логистика»' },
      { id: 's5', st: '5. Приёмка ' + (tk ? 'на терминале ТК' : 'на складе клиента'), doc: 'ЭТрН, титул Т3', who: (tk ? 'Представитель ' + tkName + ' подписывает Т3 при приёмке на терминале' : 'Уполномоченный сотрудник ' + client + ' подписывает Т3 при приёмке на складе') + ' — сценарий №10. Нужна действующая МЧД, загруженная в Диадок заранее', where: 'Контур.Диадок, модуль «Логистика»' },
    ];
    if (tk) L.push({ id: 's6', st: '6. Дальше ' + tkName + ' → клиент', doc: 'Новая ЭТрН / ЭЗЗ (цикл ТК)', who: 'Оформляет ' + tkName + ' от своего имени как новый грузоотправитель' + (ours ? '. Право собственности уже перешло клиенту по договору купли-продажи' : ''), where: 'Вне нашей зоны ответственности' });
    if (e.selfEmployed) L = L.filter(function (s) { return s.id !== 's3' && s.id !== 's4'; }).concat([
      { id: 'n1', st: 'Самозанятый: договор', doc: 'Договор аренды ТС с экипажем (ст. 632–641 ГК РФ) или возмездного оказания услуг', who: 'Мы с самозанятым напрямую. Без слов «перевозка», «перевозчик», «ответственность за сохранность груза»', where: 'Бумага или простая электронная форма, вне Диадока' },
      { id: 'n2', st: 'Самозанятый: путевой лист', doc: 'Путевой лист', who: 'Оформляем мы как арендатор ТС — самозанятый без ИП не выписывает его сам', where: 'Бумага или электронно' },
      { id: 'n3', st: 'Самозанятый: документ на груз', doc: ours ? 'УПД / ТОРГ-12' : 'Акт приёма-передачи груза', who: 'Мы оформляем и передаём получателю — ЭТрН на этом плече не составляется', where: 'Наша учётная система' },
      { id: 'n4', st: 'Самозанятый: после рейса', doc: 'Акт оказанных услуг + чек «Мой налог»', who: 'Подписываем акт; самозанятый присылает чек после оплаты (ч. 1 ст. 14 закона № 422-ФЗ)', where: 'Почта, приложение «Мой налог»' },
      { id: 'n5', st: 'Самозанятый: копии', doc: 'СТС, ОСАГО, диагностическая карта, права водителя', who: 'Запрашиваем у самозанятого в свой архив', where: 'Храним у себя на случай проверки' }]);
    return L;
  }
  var BEFORE = [['b1', 'МЧД получателя (' + 'клиента или ТК' + ') оформлена и загружена в Диадок до прибытия машины'], ['b2', 'Перевозчик подключён к ЭДО (Диадок или роуминг) — иначе не увидит ЭТрН Т1 и ЭЗЗ'], ['b3', 'ФЛГ запустили расписку и ЭТрН Т1 сразу после приёмки на СВХ']];
  function Etrn(el, deal) { this.el = el; this.deal = deal; this.e = Object.assign({ contract: '', dest: '', tk: '', selfEmployed: false, done: [] }, deal.etrn || {}); }
  Etrn.prototype.draw = function () {
    if (!this.bound) { this.bound = true; this.el.addEventListener('click', this.onClick.bind(this)); this.el.addEventListener('change', this.onChange.bind(this)); }
    var e = this.e, x = this.deal, s = SC[e.contract + '|' + e.dest], done = {}; (e.done || []).forEach(function (k) { done[k] = 1; });
    var seg = function (k, v, t) { return '<button type="button" data-k="' + k + '" data-v="' + v + '"' + (e[k] === v ? ' class="on"' : '') + '>' + t + '</button>'; };
    var h = '<div class="et"><div class="et-pick"><div><span class="cx-mut cx-small">Контракт</span><div class="cx-seg">' + seg('contract', 'our', 'Наш контракт') + seg('contract', 'client', 'Контракт клиента') + '</div></div>'
      + '<div><span class="cx-mut cx-small">Куда везём</span><div class="cx-seg">' + seg('dest', 'client', 'Склад клиента') + seg('dest', 'tk', 'Терминал ТК') + '</div></div>'
      + (e.dest === 'tk' ? '<label class="cx-f"><span>Транспортная компания</span><input data-tk value="' + esc(e.tk || '') + '" placeholder="Название ТК"></label>' : '')
      + '<label class="cx-cbx"><input type="checkbox" data-self' + (e.selfEmployed ? ' checked' : '') + '> Перевозчик — самозанятый без ИП</label></div>';
    if (!s) { this.el.innerHTML = h + '<p class="cx-empty">Выберите контракт и куда везём — покажу, кто грузополучатель, кто оформляет МЧД и что делать в Контур.Диадоке по шагам.</p></div>'; return; }
    var L = steps(e, x), n = L.filter(function (t) { return done[t.id]; }).length;
    h += '<div class="et-sum"><b class="et-code">' + s.code + '</b><div><h4>' + esc(s.title) + '</h4><p>' + esc(s.rel) + '</p></div></div>'
      + '<div class="et-facts"><div><small>Грузополучатель по ЭТрН</small><b>' + esc(s.rcv) + '</b></div><div><small>Перевозчика нанимаем</small><b>Мы' + (e.dest === 'tk' ? ' — до терминала ТК' : '') + '</b></div><div><small>МЧД оформляет</small><b>' + esc(s.mchd) + '</b></div><div><small>Риск простоя</small><b>' + esc(s.risk) + '</b></div></div>'
      + '<div class="et-rule"><b>Главное:</b> груз выдают только после подписи ЭТрН уполномоченным лицом получателя по МЧД — водитель не отдаст груз без подписи. МЧД и доступ в Контур.Диадок (модуль «Логистика») готовьте заранее, не в день выгрузки, иначе платим за простой машины.</div>'
      + '<h4 class="et-h">До прибытия машины</h4>' + BEFORE.map(function (b) { return '<label class="et-chk"><input type="checkbox" data-d="' + b[0] + '"' + (done[b[0]] ? ' checked' : '') + '><span>' + esc(b[1]) + '</span></label>'; }).join('')
      + '<h4 class="et-h">Шаги · сделано ' + n + ' из ' + L.length + '</h4><ol class="et-steps">' + L.map(function (t) {
        return '<li class="' + (done[t.id] ? 'done' : '') + '"><label class="et-chk"><input type="checkbox" data-d="' + t.id + '"' + (done[t.id] ? ' checked' : '') + '><span><b>' + esc(t.st) + '</b> — ' + esc(t.doc) + '</span></label><p>' + esc(t.who) + '</p><p class="cx-mut cx-small">Где: ' + esc(t.where) + '</p>'
          + (t.put ? '<details class="et-put"><summary>Что указать</summary><ul>' + t.put.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul><button type="button" class="cx-link" data-copy="' + t.id + '">Скопировать</button></details>' : '') + '</li>';
      }).join('') + '</ol>'
      + (e.selfEmployed ? '<div class="et-rule amb"><b>Самозанятый без ИП не может быть перевозчиком</b> (п. 13 ст. 2 закона № 259-ФЗ) — ЭТрН на этом плече не оформляется, риски по грузу на нас. Второй путь: он оформляет ИП с сохранением НПД и работает как обычный перевозчик с ЭТрН (нужен «Госключ для ИП»). Не заключайте с одним самозанятым много однотипных договоров подряд и не задавайте ему график — риск переквалификации в трудовые отношения.</div>' : '')
      + '<p class="cx-mut cx-small">По вашему документу «Сценарии доставки груза»; номера сценариев — из каталога «16 сценариев перевозок» Контур.Диадока.</p></div>';
    this.el.innerHTML = h; this.L = L;
  };
  Etrn.prototype.save = function () { var self = this; return api('/api/deals/' + this.deal.id + '/etrn', { method: 'PUT', body: this.e }).then(function (o) { self.deal.etrn = o.etrn; }).catch(function (er) { toast(er.message, 'err'); }); };
  Etrn.prototype.onClick = function (ev) {
    var b = ev.target.closest('[data-k][data-v]'); if (b) { this.e[b.dataset.k] = b.dataset.v; this.save(); return this.draw(); }
    var c = ev.target.closest('[data-copy]'); if (c) { var t = (this.L || []).find(function (s) { return s.id === c.dataset.copy; }); if (t && navigator.clipboard) navigator.clipboard.writeText(t.st + ' — ' + t.doc + '\n' + t.put.map(function (p) { return '• ' + p; }).join('\n')).then(function () { toast('Скопировано'); }).catch(function () {}); }
  };
  Etrn.prototype.onChange = function (ev) {
    var t = ev.target, e = this.e;
    if (t.matches('[data-d]')) { e.done = (e.done || []).filter(function (k) { return k !== t.dataset.d; }); if (t.checked) e.done.push(t.dataset.d); this.save(); return this.draw(); }
    if (t.matches('[data-self]')) { e.selfEmployed = t.checked; this.save(); return this.draw(); }
    if (t.matches('[data-tk]')) { e.tk = t.value.trim(); this.save(); return this.draw(); }
  };

  /* ================= «Мои средства» ================= */
  function wallet() {
    var box = $('#cxWallet'); if (!box) return; box.innerHTML = '<p class="cx-load">Считаю…</p>';
    api('/api/wallet').then(function (w) {
      var mon = function (m) { var p = m.split('-'); return p.length === 2 ? ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'][+p[1] - 1] + ' ' + p[0] : m; };
      box.innerHTML = '<div class="cx-ph"><div><h2>Мои средства</h2><p class="cx-mut">' + K.num(w.bonusPct) + '% от прибыли компании по успешным сделкам. Видите только вы — клиентам и в КП это не попадает никогда.</p></div>'
        + '<label class="cx-f wl-pct"><span>Мой процент</span><span class="fx-amt"><input data-pct inputmode="decimal" value="' + esc(w.bonusPct) + '" style="width:70px"> %</span></label></div>'
        + '<div class="wl-cards"><div class="k wl-c"><small>Начислено</small><b>' + rub(w.total) + '</b></div><div class="k wl-c"><small>Получено</small><b>' + rub(w.received) + '</b></div><div class="k wl-c acc"><small>Ждёт выплаты</small><b>' + rub(w.pending) + '</b></div><div class="k wl-c"><small>Прибыль компании</small><b>' + rub0(w.profit) + '</b></div>' + (w.debts ? '<div class="k wl-c red"><small>Долги клиентов</small><b>' + rub0(w.debts) + '</b></div>' : '') + '</div>'
        + (w.noFact ? '<p class="fx-warn">Успешных сделок без «Факта»: ' + w.noFact + ' — откройте сделку, вкладка «Факт», и внесите приходы и расходы.</p>' : '')
        + (w.items.length ? '<div class="cx-table wl-t"><div class="cx-tr cx-thd"><span>Сделка</span><span class="lp">Закрыта</span><span>Прибыль</span><span>Мои</span><span class="lp">Долг клиента</span><span>Получены</span></div>' + w.items.map(function (i) {
          return '<div class="cx-tr"><span class="cx-t"><button type="button" class="cx-link" data-deal="' + esc(i.dealId) + '">' + esc((i.number ? '№ ' + i.number + ' · ' : '') + i.title) + '</button><small>' + esc(i.client) + '</small></span><span class="lp cx-mut">' + K.d(i.closedAt) + '</span>'
            + (i.hasFact ? '<span>' + rub0(i.profit) + (i.ready ? '' : ' <em class="cx-tag amb">не всё внесено</em>') + '</span><span><b>' + rub(i.bonus) + '</b></span><span class="lp' + (i.debt > 0 ? ' red' : '') + '">' + (i.debt > 0 ? rub0(i.debt) : '—') + '</span><span><label class="cx-cbx"><input type="checkbox" data-paid="' + esc(i.dealId) + '"' + (i.paid ? ' checked' : '') + '>' + (i.paidAt ? ' ' + K.d(i.paidAt) : '') + '</label></span>'
              : '<span class="cx-mut">нет факта</span><span></span><span class="lp"></span><span><button type="button" class="cx-link" data-deal="' + esc(i.dealId) + '" data-fact="1">внести</button></span>') + '</div>';
        }).join('') + '</div>' : '<p class="cx-empty">Пока нет успешных сделок. Когда отметите сделку «✓ Успешно» и внесёте «Факт», здесь появятся ваши средства.</p>')
        + (w.months.length ? '<h4 class="et-h">По месяцам</h4><div class="wl-months">' + w.months.map(function (m) { return '<div><span>' + esc(mon(m.month)) + ' · ' + m.deals + '</span><b>' + rub(m.bonus) + '</b></div>'; }).join('') + '</div>' : '');
    }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  document.addEventListener('click', function (ev) {
    var box = $('#cxWallet'); if (!box || !box.contains(ev.target)) return;
    var d = ev.target.closest('[data-deal]'); if (d && window.IOMA_CRM) { var p = window.IOMA_CRM.openDeal(d.dataset.deal, 'wallet'); if (p && p.then) p.then(function () { window.IOMA_CRM.showTab('fact'); }); }
  });
  document.addEventListener('change', function (ev) {
    var box = $('#cxWallet'); if (!box || !box.contains(ev.target)) return; var t = ev.target;
    if (t.matches('[data-paid]')) api('/api/deals/' + t.dataset.paid + '/fact/paid', { method: 'POST', body: { paid: t.checked } }).then(wallet).catch(function (er) { t.checked = !t.checked; toast(er.message, 'err'); });
    if (t.matches('[data-pct]')) api('/api/wallet/settings', { method: 'PUT', body: { bonusPct: t.value } }).then(function () { toast('Процент сохранён'); wallet(); }).catch(function (er) { toast(er.message, 'err'); });
  });
  K.on('wallet', wallet);

  var facts = new WeakMap();
  window.IOMA_FACT_UI = { mount: function (el, deal) { var f = facts.get(el); if (!f || f.deal.id !== deal.id) { f = new Fact(el, deal); facts.set(el, f); } f.deal = deal; return f.load(); } };
  var etrns = new WeakMap();
  window.IOMA_ETRN = { mount: function (el, deal) { var e = etrns.get(el); if (!e || e.deal.id !== deal.id) { e = new Etrn(el, deal); etrns.set(el, e); } e.deal = deal; e.draw(); } };
})();
