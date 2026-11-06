/* IOMASTAVKA — разделы рабочего места: Отгулы, Праздники, Аналитика, Компания, Безопасность, Почта, Бот, Тарифы.
   Перенос time_off.js, analytics.js, company_settings.js, security_panel.js, mail.js, bot_panel.js. */
(function () {
  'use strict';
  var K = window.CX; if (!K) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function err(box, e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; }
  function metric(label, value, sub, attrs, cls) { return '<button type="button" class="cx-metric' + (cls ? ' ' + cls : '') + '"' + (attrs || ' disabled') + '><small>' + label + '</small><b' + (String(value).length > 8 ? ' class="money"' : '') + '>' + value + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</button>'; }

  /* ======================= ОТГУЛЫ И ОТПУСКА ======================= */
  var TO = { mgr: '', month: null, items: [], managers: [], holidays: {} };
  var TO_KIND = { day_off: '🕐 Отгул', vacation: '🏖 Отпуск' }, TO_ST = { pending: 'На согласовании', approved: 'Подтверждён', rejected: 'Отклонён' };
  function loadTimeoff() {
    var box = $('#cxTimeoff'); if (!box) return; if (!TO.month) { var t = new Date(); TO.month = [t.getFullYear(), t.getMonth()]; }
    Promise.all([api('/api/timeoff' + (TO.mgr ? '?manager=' + encodeURIComponent(TO.mgr) : '')), api('/api/holidays?year=' + TO.month[0]).catch(function () { return { ru: [] }; })]).then(function (rr) {
      var r = rr[0]; TO.items = r.items; TO.managers = r.managers; TO.holidays = {}; (rr[1].ru || []).forEach(function (h) { if (h.kind !== 'short') TO.holidays[h.date] = h.name; });
      box.innerHTML = '<div class="cx-bar"><button type="button" class="cx-btn primary" data-o="add">+ Отгул или отпуск</button><select data-o="mgr" aria-label="Сотрудник"><option value="">Все сотрудники</option>' + r.managers.map(function (m) { return '<option' + (m === TO.mgr ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select>' + (r.offToday.length ? '<span class="cx-note">Сегодня отсутствуют: <b>' + esc(r.offToday.join(', ')) + '</b> — заявки из очереди им не назначаются.</span>' : '') + '</div>'
        + (r.managers.length ? '' : '<p class="cx-hint">Сначала добавьте сотрудников в разделе «Компания» — их можно будет выбрать здесь, в сделках и задачах.</p>')
        + calHtml() + listHtml();
      box.onclick = toClick; box.onchange = function (e) { if (e.target.dataset.o === 'mgr') { TO.mgr = e.target.value; loadTimeoff(); } };
    }).catch(function (e) { err(box, e); });
  }
  function calHtml() {
    var y = TO.month[0], m = TO.month[1], days = new Date(y, m + 1, 0).getDate(), names = TO.mgr ? [TO.mgr] : TO.managers.slice();
    TO.items.forEach(function (t) { if (names.indexOf(t.manager) < 0 && (!TO.mgr || t.manager === TO.mgr)) names.push(t.manager); });
    var pad = function (n) { return String(n).padStart(2, '0'); }, td = K.today();
    var head = '<div class="cx-calr cx-calh"><span></span>' + Array.from({ length: days }, function (_, i) { var dt = y + '-' + pad(m + 1) + '-' + pad(i + 1), wd = new Date(y, m, i + 1).getDay(); return '<i class="' + (wd === 0 || wd === 6 ? 'we' : '') + (TO.holidays[dt] ? ' hol' : '') + (dt === td ? ' td' : '') + '" title="' + esc(TO.holidays[dt] || '') + '">' + (i + 1) + '</i>'; }).join('') + '</div>';
    var rows = names.map(function (nm) { return '<div class="cx-calr"><span>' + esc(nm) + '</span>' + Array.from({ length: days }, function (_, i) { var dt = y + '-' + pad(m + 1) + '-' + pad(i + 1), wd = new Date(y, m, i + 1).getDay(); var t = TO.items.find(function (x) { return x.manager === nm && x.date_from <= dt && x.date_to >= dt && x.status !== 'rejected'; });
      return '<i class="' + (wd === 0 || wd === 6 ? 'we' : '') + (TO.holidays[dt] ? ' hol' : '') + (t ? ' ' + t.kind + (t.status === 'pending' ? ' pend' : '') : '') + '"' + (t ? ' title="' + esc(TO_KIND[t.kind] + ' · ' + (t.reason || '') + ' · ' + TO_ST[t.status]) + '" data-o="edit" data-id="' + esc(t.id) + '"' : '') + '></i>'; }).join('') + '</div>'; }).join('');
    return '<div class="cx-cal k"><div class="cx-calnav"><button type="button" class="cx-ib" data-o="prev" aria-label="Предыдущий месяц">◀</button><b>' + MONTHS[m] + ' ' + y + '</b><button type="button" class="cx-ib" data-o="next" aria-label="Следующий месяц">▶</button><span class="cx-legend"><i class="vacation"></i>отпуск <i class="day_off"></i>отгул <i class="pend vacation"></i>на согласовании <i class="hol"></i>праздник РФ</span></div><div class="cx-calg">' + head + (rows || '<p class="cx-empty">Нет сотрудников</p>') + '</div></div>';
  }
  function listHtml() {
    if (!TO.items.length) return '<div class="k v3p-empty"><b>Отгулов и отпусков пока нет</b><small>Добавьте — сотрудник автоматически снимется с очереди заявок на эти дни, а в задачах появится пометка «отсутствует».</small></div>';
    return '<div class="cx-table cx-totable"><div class="cx-tr cx-thd"><span>Сотрудник</span><span>Тип</span><span>Период</span><span>Дней</span><span>Причина</span><span>Статус</span><span></span></div>' + TO.items.map(function (t) {
      return '<div class="cx-tr"><span><b>' + esc(t.manager) + '</b></span><span>' + TO_KIND[t.kind] + '</span><span>' + K.d(t.date_from) + (t.date_to !== t.date_from ? ' — ' + K.d(t.date_to) : '') + (t.kind === 'day_off' && (t.time_from || t.time_to) ? ' <small class="cx-mut">' + (t.time_from || '00:00') + '–' + (t.time_to || '23:59') + '</small>' : '') + '</span><span>' + t.days + '</span><span class="cx-mut">' + esc(t.reason || '') + '</span>'
        + '<span class="st-' + t.status + '"><b>' + TO_ST[t.status] + '</b>' + (t.decidedBy && t.status !== 'pending' ? '<small>' + esc(t.decidedBy) + '</small>' : '') + '</span><span class="cx-acts">' + (t.status === 'pending' ? '<button type="button" class="cx-ib ok" data-o="approve" data-id="' + t.id + '" title="Подтвердить">✓</button><button type="button" class="cx-ib danger" data-o="reject" data-id="' + t.id + '" title="Отклонить">✕</button>' : '') + '<button type="button" class="cx-ib" data-o="edit" data-id="' + t.id + '" title="Изменить">✎</button><button type="button" class="cx-ib danger" data-o="del" data-id="' + t.id + '" title="Удалить">🗑</button></span></div>';
    }).join('') + '</div>';
  }
  function toClick(e) {
    var b = e.target.closest('[data-o]'); if (!b) return; var o = b.dataset.o, t = TO.items.find(function (x) { return x.id === b.dataset.id; });
    if (o === 'prev' || o === 'next') { var m = TO.month[1] + (o === 'next' ? 1 : -1), y = TO.month[0]; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } TO.month = [y, m]; return loadTimeoff(); }
    if (o === 'add') return toForm(null);
    if (o === 'edit') return toForm(t);
    if (o === 'approve' || o === 'reject') return api('/api/timeoff/' + t.id, { method: 'PATCH', body: { status: o === 'approve' ? 'approved' : 'rejected' } }).then(function () { K.badges(); loadTimeoff(); });
    if (o === 'del') return K.confirm('Удалить запись об отгуле или отпуске?', 'Удалить', true).then(function (ok) { if (ok) api('/api/timeoff/' + t.id, { method: 'DELETE' }).then(loadTimeoff); });
  }
  function toForm(t) {
    t = t || { kind: 'day_off', date_from: K.today(), date_to: K.today(), status: 'approved', manager: TO.mgr || TO.managers[0] || '' };
    var html = '<div class="cx-pills" role="radiogroup"><button type="button" class="' + (t.kind !== 'vacation' ? 'on' : '') + '" data-kind="day_off">🕐 Отгул</button><button type="button" class="' + (t.kind === 'vacation' ? 'on' : '') + '" data-kind="vacation">🏖 Отпуск</button></div>'
      + '<div class="cx-grid2"><label class="cx-f"><span>Сотрудник</span><select data-k="manager">' + TO.managers.concat(t.manager && TO.managers.indexOf(t.manager) < 0 ? [t.manager] : []).map(function (m) { return '<option' + (m === t.manager ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></label><label class="cx-f"><span>Статус</span><select data-k="status">' + Object.keys(TO_ST).map(function (s) { return '<option value="' + s + '"' + (s === t.status ? ' selected' : '') + '>' + TO_ST[s] + '</option>'; }).join('') + '</select></label>'
      + '<label class="cx-f"><span>С даты</span><input type="date" data-k="date_from" value="' + esc(t.date_from) + '"></label><label class="cx-f"><span>По дату</span><input type="date" data-k="date_to" value="' + esc(t.date_to) + '"></label>'
      + '<label class="cx-f tf"><span>Время с</span><input type="time" data-k="time_from" value="' + esc(t.time_from || '') + '"></label><label class="cx-f tf"><span>Время по</span><input type="time" data-k="time_to" value="' + esc(t.time_to || '') + '"></label>'
      + '<label class="cx-f wide"><span>Причина</span><textarea data-k="reason" rows="2">' + esc(t.reason || '') + '</textarea></label></div><p class="cx-hint tf">Для отгула можно указать часы — если оставить пустыми, считается весь день. На всё время отсутствия сотрудник снимается с очереди заявок.</p>';
    if (!TO.managers.length && !t.manager) return toast('Сначала добавьте сотрудников в разделе «Компания»', 'err');
    var md = K.modal(t.id ? 'Изменить отгул или отпуск' : 'Новый отгул или отпуск', html, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>');
    var kind = t.kind, tf = function () { $$('.tf', md.el).forEach(function (x) { x.hidden = kind === 'vacation'; }); };
    $$('[data-kind]', md.el).forEach(function (b) { b.addEventListener('click', function () { kind = b.dataset.kind; $$('[data-kind]', md.el).forEach(function (x) { x.classList.toggle('on', x === b); }); tf(); }); }); tf();
    $('[data-ok]', md.el).addEventListener('click', function () { var b = { kind: kind }; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); if (!b.date_from || !b.date_to) return toast('Укажите даты', 'err'); if (kind === 'vacation') { b.time_from = ''; b.time_to = ''; }
      K.guard(this, function () { return api(t.id ? '/api/timeoff/' + t.id : '/api/timeoff', { method: t.id ? 'PATCH' : 'POST', body: b }).then(function () { md.close(); K.badges(); loadTimeoff(); }); }); });
  }
  K.on('timeoff', loadTimeoff);

  /* ======================= ПРАЗДНИКИ ======================= */
  var HY = new Date().getFullYear();
  function loadHolidays() {
    var box = $('#cxHolidays'); if (!box) return;
    api('/api/holidays?year=' + HY).then(function (r) {
      var td = K.today(), next = function (list) { return list.filter(function (h) { return h.date >= td && h.kind !== 'workday' && h.kind !== 'short'; })[0]; };
      var nr = next(r.ru), nc = next(r.cn.filter(function (h) { return h.first; }));
      var group = function (list, cn) {
        var by = {}, prev = null; list.forEach(function (h) { if (cn && h.kind === 'holiday' && !h.first) return; var m = +h.date.slice(5, 7) - 1;
          if (!cn && prev && prev.name === h.name && prev.kind === h.kind && Date.parse(h.date) - Date.parse(prev.last || prev.date) === 864e5 && +prev.date.slice(5, 7) - 1 === m) { prev.last = h.date; prev.days = (prev.days || 1) + 1; return; }
          prev = cn ? h : { date: h.date, name: h.name, kind: h.kind }; (by[m] = by[m] || []).push(prev); });
        return Object.keys(by).map(function (m) { return '<div class="cx-hm"><b>' + MONTHS[m] + '</b>' + by[m].map(function (h) { var d1 = +h.date.slice(8, 10); var range = !cn && h.last ? d1 + '–' + +h.last.slice(8, 10) + ' ' + MONTHS_G[m] : cn && h.days > 1 ? d1 + '–' + new Date(Date.parse(h.date) + (h.days - 1) * 864e5).getUTCDate() + ' ' + MONTHS_G[+h.date.slice(5, 7) - 1] : d1 + ' ' + MONTHS_G[m];
          return '<p class="h-' + h.kind + (h.date < td ? ' past' : '') + '"><span>' + range + '</span>' + esc(h.name) + (cn && h.days ? ' <small>' + h.days + ' ' + K.plural(h.days, 'день', 'дня', 'дней') + '</small>' : '') + '</p>'; }).join('') + '</div>'; }).join('');
      };
      box.innerHTML = '<div class="cx-bar"><div class="cx-seg">' + [HY - 1, HY, HY + 1].map(function (y) { return '<button type="button" class="' + (y === HY ? 'on' : '') + '" data-h="year" data-v="' + y + '">' + y + '</button>'; }).join('') + '</div>'
        + (nr || nc ? '<span class="cx-note">Ближайшие: ' + (nr ? '🇷🇺 ' + K.d(nr.date) + ' — ' + esc(nr.name) : '') + (nc ? ' · 🇨🇳 ' + K.d(nc.date) + ' — ' + esc(nc.name) : '') + '</span>' : '') + '</div>'
        + (r.builtIn ? '' : '<p class="cx-hint">Официального календаря на ' + HY + ' год в системе пока нет — добавьте праздники вручную ниже, когда календарь утвердят.</p>')
        + '<div class="cx-hgrid"><section class="k"><h3>🇷🇺 Россия — производственный календарь</h3><p class="cx-mut">Нерабочие праздники, переносы выходных и сокращённые дни.</p>' + (group(r.ru) || '<p class="cx-empty">Нет данных</p>') + '</section>'
        + '<section class="k"><h3>🇨🇳 Китай — государственные праздники</h3><p class="cx-mut">В эти дни фабрики, склады и таможня КНР не работают; в Праздник Весны — до 2–3 недель. Планируйте отгрузки заранее. Красным — рабочие выходные (переносы).</p>' + (group(r.cn, true) || '<p class="cx-empty">Нет данных</p>') + '</section></div>'
        + '<section class="k cx-hcustom"><h3>Свои даты</h3><p class="cx-mut">Корпоративные выходные, праздники в Казахстане и других странах, закрытие складов партнёров.</p><div class="cx-mini">' + (r.custom.map(function (h) { return '<div class="cx-hc"><span><b>' + K.d(h.date) + '</b> ' + esc(h.name) + ' <small class="cx-mut">' + ({ ru: 'Россия', cn: 'Китай', kz: 'Казахстан', other: 'другое' }[h.country]) + (h.kind === 'workday' ? ' · рабочий день' : '') + '</small></span><button type="button" class="cx-ib danger" data-h="del" data-id="' + h.id + '" title="Удалить">✕</button></div>'; }).join('') || '<p class="cx-empty">Пока нет</p>') + '</div>'
        + '<form class="cx-hform" data-hf><input type="date" name="date" required aria-label="Дата"><input name="name" placeholder="Название" required aria-label="Название"><select name="country" aria-label="Страна"><option value="ru">Россия</option><option value="cn">Китай</option><option value="kz">Казахстан</option><option value="other">Другое</option></select><select name="kind" aria-label="Тип дня"><option value="holiday">выходной</option><option value="workday">рабочий день</option></select><button type="submit" class="cx-btn primary sm">Добавить</button></form></section>';
      box.onclick = function (e) { var b = e.target.closest('[data-h]'); if (!b) return; if (b.dataset.h === 'year') { HY = +b.dataset.v; loadHolidays(); } if (b.dataset.h === 'del') api('/api/holidays/' + b.dataset.id, { method: 'DELETE' }).then(loadHolidays); };
      $('[data-hf]', box).addEventListener('submit', function (e) { e.preventDefault(); var b = {}; $$('[name]', this).forEach(function (i) { b[i.name] = i.value; }); api('/api/holidays', { method: 'POST', body: b }).then(loadHolidays).catch(function (er) { toast(er.message, 'err'); }); });
    }).catch(function (e) { err(box, e); });
  }
  K.on('holidays', loadHolidays);

  /* ======================= АНАЛИТИКА ======================= */
  var AP = 'month';
  function loadAnalytics() {
    var box = $('#cxAnalytics'); if (!box) return;
    api('/api/analytics?period=' + AP).then(function (d) {
      var convCls = d.conversion >= 50 ? 'good' : d.conversion >= 25 ? 'mid' : 'bad', P = { month: 'Месяц', quarter: 'Квартал', half: 'Полгода', year: 'Год' };
      var bars = function (obj) { var keys = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }), max = Math.max.apply(null, keys.map(function (k) { return obj[k]; }).concat(1)); return keys.slice(0, 12).map(function (k) { return '<div class="cx-hbar"><span title="' + esc(k) + '">' + esc(k) + '</span><i style="--w:' + Math.round(obj[k] / max * 100) + '%"></i><b>' + obj[k] + '</b></div>'; }).join('') || '<p class="cx-empty">Нет данных</p>'; };
      box.innerHTML = '<div class="cx-bar"><div class="cx-seg">' + Object.keys(P).map(function (k) { return '<button type="button" class="' + (k === AP ? 'on' : '') + '" data-an="period" data-v="' + k + '">' + P[k] + '</button>'; }).join('') + '</div><span class="cx-mut">за последние ' + ({ month: '30 дней', quarter: '3 месяца', half: '6 месяцев', year: '12 месяцев' }[AP]) + '</span></div>'
        + '<div class="cx-metrics">' + metric('Входящих заявок', d.leads_in) + metric('Сделки в работе', d.deals_active, 'сейчас', ' data-an="list" data-st="active" data-t="Сделки в работе"', 'blue') + metric('Завершённые', d.deals_closed_won, 'успешно', ' data-an="list" data-st="won" data-t="Завершённые сделки"', 'green') + metric('Закрыто без сделки', d.deals_closed_lost, '', ' data-an="list" data-st="closed" data-t="Закрытые без сделки"', 'red') + metric('🗑 В архиве', d.deals_archived, '', ' data-an="list" data-st="deleted" data-t="В архиве"') + metric('Конверсия', d.conversion + '%', 'успешные из закрытых', '', convCls) + metric('Финансы', K.money(d.margin_sum, 'RUB'), 'маржа по сделкам', '', d.margin_sum < 0 ? 'red' : 'green') + '</div>'
        + '<div class="cx-an2">' + (d.close_reasons.length ? '<section class="k"><h3>Причины закрытия</h3><div class="cx-table cx-rs">' + d.close_reasons.map(function (r) { return '<button type="button" class="cx-tr" data-an="reason" data-r="' + esc(r.close_reason) + '"><span>' + esc(r.close_reason || 'Не указана') + '</span><b>' + r.cnt + '</b></button>'; }).join('') + '</div></section>' : '')
        + '<section class="k"><h3>Источники заявок</h3>' + bars(d.sources) + '</section><section class="k"><h3>Сделки по этапам сейчас</h3>' + bars(d.funnel) + '</section></div>'
        + '<section class="k cx-anm"><h3>По менеджерам</h3>' + (d.by_manager.length ? '<div class="cx-table cx-mgrs"><div class="cx-tr cx-thd"><span>Менеджер</span><span>Всего</span><span>Завершено</span><span>Закрыто</span><span>Архив</span><span>Отгулы, дн.</span><span>Конверсия</span><span>Финансы</span><span>Задачи: выполнено / просрочено</span><span>В срок</span><span>Касаний</span></div>'
          + d.by_manager.map(function (m) { var conv = m.total ? Math.round(m.won / m.total * 100) : 0; return '<button type="button" class="cx-tr" data-an="mgr" data-m="' + esc(m.name) + '"><span><b>' + esc(m.name === '—' ? 'Без ответственного' : m.name) + '</b></span><span>' + m.total + '</span><span class="cx-green">' + m.won + '</span><span class="cx-red">' + m.lost + '</span><span class="cx-mut">' + (m.archived || '—') + '</span><span>' + (m.time_off_days ? K.num(m.time_off_days) : '—') + '</span><span>' + conv + '%</span><span class="' + (m.margin_sum < 0 ? 'cx-red' : 'cx-green') + '"><b>' + (m.margin_sum ? K.money(m.margin_sum, 'RUB') : '—') + '</b></span><span>' + m.tasks_done + ' / <span class="' + (m.tasks_overdue ? 'cx-red' : '') + '">' + m.tasks_overdue + '</span></span><span>' + (m.on_time == null ? '—' : m.on_time + '%') + '</span><span>' + m.activities + '</span></button>'; }).join('') + '</div>' : '<p class="cx-empty">Нет данных за период</p>') + '</section>';
      box.onclick = function (e) { var b = e.target.closest('[data-an]'); if (!b) return; var a = b.dataset.an;
        if (a === 'period') { AP = b.dataset.v; loadAnalytics(); }
        if (a === 'list') dealsModal('/api/analytics/deals?status=' + b.dataset.st + '&period=' + AP, b.dataset.t);
        if (a === 'reason') dealsModal('/api/analytics/deals?status=closed&period=' + AP + '&reason=' + encodeURIComponent(b.dataset.r), 'Причина: ' + (b.dataset.r || 'не указана'));
        if (a === 'mgr') dealsModal('/api/analytics/deals?period=' + AP + '&manager=' + encodeURIComponent(b.dataset.m), 'Сделки — ' + (b.dataset.m === '—' ? 'без ответственного' : b.dataset.m), true); };
    }).catch(function (e) { err(box, e); });
  }
  function dealsModal(url, title, fin) {
    api(url).then(function (r) {
      var md = K.modal(title, r.deals.length ? '<div class="cx-table cx-adeals"><div class="cx-tr cx-thd"><span>Сделка</span><span>Ответственный</span><span>Клиент</span><span>Статус</span><span>Финансы</span><span>Дата</span></div>' + r.deals.map(function (x) { return '<div class="cx-tr"><span><button type="button" class="cx-link" data-go="' + esc(x.id) + '">' + esc(x.title || x.number) + '</button><small class="cx-mut">№ ' + esc(x.number) + (x.closeReason ? ' · ' + esc(x.closeReason) : '') + '</small></span><span>' + esc(x.manager || '—') + '</span><span>' + esc(x.client || '—') + '</span><span>' + K.stageBadge(x.stage) + '</span><span class="' + (x.margin < 0 ? 'cx-red' : 'cx-green') + '">' + (x.margin ? K.money(x.margin, 'RUB') : '—') + (fin || x.margin ? ' <button type="button" class="cx-link" data-fd="' + esc(x.id) + '">детали</button>' : '') + '</span><span class="cx-mut">' + K.d(x.closedAt || x.createdAt) + '</span></div>'; }).join('') + '</div>' : '<p class="cx-empty">Сделок нет</p>', false, { wide: true });
      md.el.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) { md.close(); return window.IOMA_CRM.openDeal(g.dataset.go, 'deals'); } var f = e.target.closest('[data-fd]'); if (f) finDetail(f.dataset.fd); });
    }).catch(function (e) { toast(e.message, 'err'); });
  }
  function finDetail(id) {
    api('/api/analytics/deal/' + id + '/finance').then(function (f) {
      var rows = function (kind) { var l = f.items.filter(function (i) { return i.kind === kind; }); return l.map(function (i) { return '<div class="cx-fdr"><span>' + esc(i.label) + (i.currency !== 'RUB' ? '<small>' + K.num(i.amount_orig) + ' ' + i.currency + ' × ' + K.num(i.rate) + '</small>' : '') + '</span><b>' + K.money(i.amount, 'RUB') + '</b></div>'; }).join('') || '<p class="cx-mut">Нет статей</p>'; };
      K.modal('Детализация финансов', '<p class="cx-mut">' + esc(f.deal_name || f.deal_number) + ' · ' + esc(f.manager_name || '') + '</p><h4>Расходы</h4>' + rows('expense') + '<h4>Приходы</h4>' + rows('income') + '<div class="cx-fres ' + (f.margin < 0 ? 'neg' : '') + '"><span class="cx-fm">Финансы: <b>' + K.money(f.margin, 'RUB') + ' (' + K.num(f.percent) + '%)</b></span></div>' + (f.general_note ? '<p class="cx-mut">Заметка: ' + esc(f.general_note) + '</p>' : '') + (f.updated_at ? '<small class="cx-mut">Обновлено ' + K.dt(f.updated_at) + '</small>' : ''));
    });
  }
  K.on('analytics', loadAnalytics);

  /* ======================= КОМПАНИЯ ======================= */
  var CO = null, coOpen = {};
  var EF = [['name', 'Полное название *', 'wide'], ['name_short', 'Короткое название'], ['contract_prefix', 'Префикс договоров'], ['inn', 'ИНН'], ['kpp', 'КПП'], ['ogrn', 'ОГРН'], ['address', 'Юр. адрес', 'wide'], ['phone', 'Телефон (для КП)'], ['email', 'Email (для КП)'], ['director_position', 'Должность директора'], ['director_name', 'Директор (ФИО)'], ['vat_rate', 'Ставка НДС'], ['bik', 'БИК'], ['account', 'Р/с'], ['korr_account', 'Корр. счёт'], ['bank_name', 'Банк', 'wide'], ['legal_basis_full', 'Основание подписания', 'wide']];
  function loadCompany() {
    var box = $('#cxCompany'); if (!box) return;
    api('/api/company').then(function (r) {
      CO = r; var c = r.company;
      var inp = function (k, label, ph, type) { return '<label class="cx-f"><span>' + label + '</span><input data-co="' + k + '" value="' + esc(c[k] || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (type ? ' type="' + type + '"' : '') + '></label>'; };
      box.innerHTML = '<section class="k"><h3>Основные настройки</h3><p class="cx-mut">Название, контакты и цвет — подставляются в КП и письма. Сохраняется само при уходе с поля.</p><div class="cx-grid3">' + inp('name', 'Название компании', 'Например: Ромашка Логистикс') + inp('site', 'Сайт', 'iomastavka.ru') + inp('domain', 'Домен', 'crm.company.ru') + inp('phone', 'Телефон') + inp('email', 'Почта') + '<label class="cx-f"><span>Валюта расчётов по умолчанию</span><select data-co="defaultCurrency">' + K.curOptions(c.defaultCurrency || 'CNY', ['CNY', 'USD', 'EUR', 'RUB']) + '</select></label><label class="cx-f"><span>Цвет бренда</span><input type="color" data-co="brandColor" value="' + esc(c.brandColor || '#2E7D5B') + '"></label>' + inp('logoLetter', 'Буква логотипа', 'i') + '</div><small class="cx-saved" data-cosaved hidden>✓ Сохранено</small></section>'
        + '<section class="k"><div class="cx-sh"><h3>Сотрудники</h3><button type="button" class="cx-btn primary sm" data-co2="staffadd">+ Сотрудник</button></div><p class="cx-mut">Из этого списка выбирают ответственных в сделках, задачах, отгулах и очереди заявок.</p><div class="cx-staff">' + (r.staff.map(function (m) { return '<div class="cx-st' + (m.active === false ? ' off' : '') + '"><span class="cx-ava" style="background:' + esc(m.color || '') + '">' + esc(K.initials(m.name)) + '</span><span><b>' + esc(m.name) + '</b><small>' + esc([m.position, m.phone, m.email, m.telegram].filter(Boolean).join(' · ')) + (m.offNow ? ' · <em class="cx-tag amb">сегодня отсутствует</em>' : '') + (m.active === false ? ' · не работает' : '') + '</small></span><button type="button" class="cx-ib" data-co2="staffedit" data-id="' + m.id + '" title="Изменить">✎</button></div>'; }).join('') || '<p class="cx-empty">Сотрудников пока нет</p>') + '</div></section>'
        + '<section class="k"><div class="cx-sh"><h3>Юрлица и типы договоров</h3><button type="button" class="cx-btn primary sm" data-co2="entadd">+ Юрлицо</button></div><p class="cx-mut">У каждого юрлица свой набор типов договоров со своими шаблонами .docx.</p>' + (r.entities.map(entHtml).join('') || '<p class="cx-empty">Юрлица не добавлены — договоры и КП генерировать не получится, пока не заполните хотя бы одно.</p>') + '</section>'
        + '<section class="k"><h3>Общие шаблоны</h3><p class="cx-mut">КП и спецификация — единые шаблоны; юрлицо выбирается при генерации документа.</p>' + ['kp', 'spec'].map(function (k) { return tplRow(k, r.templates[k], ''); }).join('') + '</section>';
      bindCompany(box);
    }).catch(function (e) { err(box, e); });
  }
  var TPLN = { kp: 'Коммерческое предложение (КП)', spec: 'Спецификация' };
  function tplRow(key, t, entity) { return '<div class="cx-tpl"><span><b>' + TPLN[key] + '</b><small class="' + (t ? 'cx-green' : 'cx-red') + '">' + (t ? 'загружен: ' + esc(t.name) : 'не загружен') + '</small></span>' + (t ? '<a class="cx-btn sm" href="/api/company/templates/' + key + (entity ? '?entity=' + entity : '') + '">Скачать</a>' : '') + '<label class="cx-btn sm">' + (t ? 'Заменить' : 'Загрузить') + '<input type="file" accept=".docx" hidden data-tplup="' + key + '" data-ent="' + (entity || '') + '"></label>' + (t ? '<button type="button" class="cx-ib danger" data-co2="tpldel" data-key="' + key + '" data-ent="' + (entity || '') + '" title="Удалить шаблон">✕</button>' : '') + '</div>'; }
  function entHtml(e) {
    var open = coOpen[e.id], types = e.contractTypes || [];
    return '<div class="cx-ent' + (open ? ' open' : '') + '"><div class="cx-enth"><button type="button" class="cx-entt" data-co2="enttoggle" data-id="' + e.id + '">' + (open ? '▾' : '▸') + ' <b>' + esc(e.name_short || e.name) + '</b><small>ИНН ' + esc(e.inn || '—') + ' · НДС ' + esc(e.vat_rate || '—') + ' · префикс «' + esc(e.contract_prefix || '—') + '» · ' + types.length + ' ' + K.plural(types.length, 'тип', 'типа', 'типов') + ' договоров' + (e.has_managing_company ? ' · через УК' : '') + '</small></button><button type="button" class="cx-btn sm" data-co2="entedit" data-id="' + e.id + '">Изменить</button><button type="button" class="cx-ib danger" data-co2="entdel" data-id="' + e.id + '" title="Удалить юрлицо">✕</button></div>'
      + (open ? '<div class="cx-entb"><div class="cx-sh"><small>Типы договоров этого юрлица</small><button type="button" class="cx-btn sm" data-co2="ctadd" data-id="' + e.id + '">+ Тип договора</button></div>' + (types.map(function (t) { return '<div class="cx-tpl"><span><input class="cx-ctname" data-ct="' + t.id + '" value="' + esc(t.name) + '" aria-label="Название типа договора"><small class="' + (t.template ? 'cx-green' : 'cx-red') + '">' + (t.template ? 'шаблон: ' + esc(t.template.name) : 'шаблон не загружен') + '</small><label class="cx-cbx"><input type="checkbox" data-ctsup="' + t.id + '"' + (t.is_supply_type ? ' checked' : '') + '> договор поставки (доступны спецификации)</label></span>' + (t.template ? '<a class="cx-btn sm" href="/api/company/contract-types/' + t.id + '/template">Скачать</a>' : '') + '<label class="cx-btn sm">' + (t.template ? 'Заменить' : 'Загрузить') + '<input type="file" accept=".docx" hidden data-ctup="' + t.id + '"></label>' + (t.template ? '<button type="button" class="cx-ib danger" data-co2="cttpldel" data-id="' + t.id + '" title="Удалить файл">✕</button>' : '') + '<button type="button" class="cx-link danger" data-co2="ctdel" data-id="' + t.id + '">Удалить тип</button></div>'; }).join('') || '<p class="cx-mut">Пока не добавлено ни одного типа</p>')
        + '<small class="cx-mut">Шаблоны КП этого юрлица (если отличаются от общих):</small>' + ['kp', 'spec'].map(function (k) { return tplRow(k, (e.templates || {})[k], e.id); }).join('') + '</div>' : '') + '</div>';
  }
  function bindCompany(box) {
    box.onfocusout = function (e) { var ct = e.target.dataset && e.target.dataset.ct; if (ct && e.target.value.trim()) return api('/api/company/contract-types/' + ct, { method: 'PATCH', body: { name: e.target.value.trim() } }); var k = e.target.dataset && e.target.dataset.co; if (!k) return; var b = {}; b[k] = e.target.value; api('/api/company', { method: 'PUT', body: b }).then(function () { var s = $('[data-cosaved]', box); s.hidden = false; setTimeout(function () { s.hidden = true; }, 1500); }); };
    box.onchange = function (e) {
      var d = e.target.dataset;
      if (d.co && (e.target.type === 'color' || e.target.tagName === 'SELECT')) { var b = {}; b[d.co] = e.target.value; api('/api/company', { method: 'PUT', body: b }); }
      if (d.tplup !== undefined || d.ctup) { var f = e.target.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f); var url = d.ctup ? '/api/company/contract-types/' + d.ctup + '/template' : '/api/company/templates/' + d.tplup + (d.ent ? '?entity=' + d.ent : ''); api(url, { method: 'POST', body: fd }).then(function () { toast('Шаблон загружен'); loadCompany(); }).catch(function (er) { toast(er.message, 'err'); }); }
      if (d.ctsup) api('/api/company/contract-types/' + d.ctsup, { method: 'PATCH', body: { is_supply_type: e.target.checked } });
    };
    box.onclick = function (e) {
      var b = e.target.closest('[data-co2]'); if (!b) return; var a = b.dataset.co2, id = b.dataset.id;
      if (a === 'staffadd') return staffForm(null);
      if (a === 'staffedit') return staffForm(CO.staff.find(function (m) { return m.id === id; }));
      if (a === 'enttoggle') { coOpen[id] = !coOpen[id]; return loadCompany(); }
      if (a === 'entadd') return entForm(null);
      if (a === 'entedit') return entForm(CO.entities.find(function (x) { return x.id === id; }));
      if (a === 'entdel') return K.confirm('Удалить юрлицо вместе с типами договоров?', 'Удалить', true).then(function (ok) { if (ok) api('/api/company/entities/' + id, { method: 'DELETE' }).then(loadCompany); });
      if (a === 'ctadd') return K.prompt('Новый тип договора', 'Название (например: Договор поставки)').then(function (nm) { if (nm) { coOpen[id] = true; api('/api/company/entities/' + id + '/contract-types', { method: 'POST', body: { name: nm } }).then(loadCompany); } });
      if (a === 'ctdel') return K.confirm('Удалить тип договора вместе с шаблоном?', 'Удалить', true).then(function (ok) { if (ok) api('/api/company/contract-types/' + id, { method: 'DELETE' }).then(loadCompany); });
      if (a === 'cttpldel') return K.confirm('Удалить файл шаблона? Тип договора останется.', 'Удалить', true).then(function (ok) { if (ok) api('/api/company/contract-types/' + id + '/template', { method: 'DELETE' }).then(loadCompany); });
      if (a === 'tpldel') return K.confirm('Удалить шаблон?', 'Удалить', true).then(function (ok) { if (ok) api('/api/company/templates/' + b.dataset.key + (b.dataset.ent ? '?entity=' + b.dataset.ent : ''), { method: 'DELETE' }).then(loadCompany); });
    };
  }
  function staffForm(m) {
    m = m || { active: true, color: '#2E7D5B' };
    var html = '<div class="cx-grid2">' + [['name', 'Имя и фамилия *'], ['position', 'Должность'], ['phone', 'Телефон'], ['email', 'Почта'], ['telegram', 'Telegram']].map(function (f) { return '<label class="cx-f"><span>' + f[1] + '</span><input data-k="' + f[0] + '" value="' + esc(m[f[0]] || '') + '"></label>'; }).join('') + '<label class="cx-f"><span>Цвет</span><input type="color" data-k="color" value="' + esc(m.color || '#2E7D5B') + '"></label></div>' + (m.id ? '<label class="cx-cbx"><input type="checkbox" data-act' + (m.active !== false ? ' checked' : '') + '> Работает (показывать в списках ответственных)</label>' : '');
    var md = K.modal(m.id ? 'Сотрудник' : 'Новый сотрудник', html, (m.id ? '<button type="button" class="cx-link danger" data-del>Удалить</button>' : '') + '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>');
    $('[data-ok]', md.el).addEventListener('click', function () { var b = {}; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); var a = $('[data-act]', md.el); if (a) b.active = a.checked; if (!b.name.trim()) return toast('Введите имя', 'err');
      K.guard(this, function () { return api(m.id ? '/api/company/staff/' + m.id : '/api/company/staff', { method: m.id ? 'PATCH' : 'POST', body: b }).then(function () { md.close(); K.meta(true); loadCompany(); }); }); });
    var dl = $('[data-del]', md.el); if (dl) dl.addEventListener('click', function () { K.confirm('Удалить сотрудника из списка? Его сделки и задачи останутся с его именем.', 'Удалить', true).then(function (ok) { if (ok) api('/api/company/staff/' + m.id, { method: 'DELETE' }).then(function () { md.close(); K.meta(true); loadCompany(); }); }); });
  }
  function entForm(e) {
    var v = function (k) { return esc((e && e[k]) || ''); };
    var html = (!e ? '<label class="cx-drop" data-dz><input type="file" hidden accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" data-file><b>📎 Перетащите карточку компании или устав сюда — или нажмите для выбора</b><small>PDF, DOCX, TXT или фото — реквизиты распознаются автоматически. Либо заполните поля вручную ниже.</small></label><p class="cx-mut" data-st></p>' : '')
      + '<div class="cx-grid2">' + EF.map(function (f) { return '<label class="cx-f' + (f[2] ? ' wide' : '') + '"><span>' + f[1] + '</span><input data-k="' + f[0] + '" value="' + v(f[0]) + '"' + (f[0] === 'vat_rate' ? ' placeholder="22%"' : f[0] === 'legal_basis_full' ? ' placeholder="на основании Устава / доверенности №… от …"' : '') + '></label>'; }).join('') + '</div>'
      + '<details' + (e && e.has_managing_company ? ' open' : '') + '><summary>Компанией управляет другая организация (УК)</summary><label class="cx-cbx"><input type="checkbox" data-uk' + (e && e.has_managing_company ? ' checked' : '') + '> Директор подписывает как руководитель управляющей организации</label><div class="cx-grid2">' + [['managing_company_name_short', 'Название УК (короткое)'], ['managing_company_name', 'Название УК (полное)'], ['managing_ceo_name_nominative', 'Руководитель УК (ФИО)'], ['managing_ceo_position_nominative', 'Должность руководителя УК']].map(function (f) { return '<label class="cx-f"><span>' + f[1] + '</span><input data-k="' + f[0] + '" value="' + v(f[0]) + '"></label>'; }).join('') + '</div></details>';
    var md = K.modal(e ? 'Юрлицо' : 'Новое юрлицо', html, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>', { wide: true });
    $('[data-ok]', md.el).addEventListener('click', function () { var b = { has_managing_company: $('[data-uk]', md.el).checked }; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); if (!b.name.trim()) return toast('Название юрлица обязательно', 'err');
      K.guard(this, function () { return api(e ? '/api/company/entities/' + e.id : '/api/company/entities', { method: e ? 'PATCH' : 'POST', body: b }).then(function () { md.close(); loadCompany(); }); }); });
    var dz = $('[data-dz]', md.el);
    if (dz) { var go = function (f) { var st = $('[data-st]', md.el); st.textContent = '⏳ Извлекаю реквизиты — это может занять до минуты…'; var fd = new FormData(); fd.append('file', f);
        api('/api/company/entities/extract', { method: 'POST', body: fd }).then(function (r) { Object.keys(r.data || {}).forEach(function (k) { var el = $('[data-k="' + k + '"]', md.el); if (el && r.data[k]) el.value = r.data[k]; }); st.innerHTML = '✓ Реквизиты распознаны, проверьте поля перед сохранением' + (r.warnings && r.warnings.length ? '<br>⚠ ' + esc(r.warnings.join('; ')) : ''); }).catch(function (er) { st.textContent = '❌ ' + er.message; }); };
      K.dropzone(dz, function (fl) { go(fl[0]); }); $('[data-file]', md.el).addEventListener('change', function () { if (this.files[0]) go(this.files[0]); }); }
  }
  K.on('company', loadCompany);

  /* ======================= БЕЗОПАСНОСТЬ ======================= */
  function loadSecurity() {
    var box = $('#cxSecurity'); if (!box) return;
    api('/api/security').then(function (r) {
      box.innerHTML = '<section class="k"><h3>Ключи и пароли сервисов</h3><p class="cx-mut">Ключи хранятся только в Render → Environment и никогда не показываются на сайте. Здесь видно, какие заданы. Для ключей с пометкой «можно сгенерировать» сайт создаст случайное значение прямо в вашем браузере — скопируйте его в Render и нажмите «Save, rebuild and deploy».</p>'
        + r.secrets.map(function (s) { return '<div class="cx-svc"><i class="cx-sdot ' + (s.set ? 'on' : 'off') + '"></i><span><b>' + esc(s.label) + '</b><small><code>' + esc(s.key) + '</code> · ' + (s.set ? 'задан' : 'не задан') + (s.kind === 'manual' ? ' · <em>только вручную</em>' : '') + '</small></span>' + (s.kind === 'auto' ? '<button type="button" class="cx-btn sm" data-sec="gen" data-k="' + s.key + '">Сгенерировать новый</button>' : '<button type="button" class="cx-btn sm ghost" data-sec="how" data-k="' + s.key + '">Где взять</button>') + '</div>'; }).join('') + '</section>'
        + '<section class="k"><h3>Сеансы входа</h3><p class="cx-mut">Хранилище данных: <b>' + (r.storage === 'supabase' ? 'Supabase (постоянное)' : 'локальные файлы — стираются при перезапуске Render') + '</b> · пароль администратора ' + (r.customPassword ? 'изменён на сайте' : 'из переменной окружения') + (r.lastLogoutAll ? ' · последний выход на всех устройствах: ' + K.dt(r.lastLogoutAll) : '') + '</p><div class="cx-sbtns"><button type="button" class="cx-btn danger" data-sec="logoutall">Выйти на всех устройствах</button><button type="button" class="cx-btn" data-sec="pw">Сменить пароль</button></div>' + (r.fails24 >= 5 ? '<p class="cx-warnbox">⚠ За сутки ' + r.fails24 + ' неудачных попыток входа. Если это не вы — смените пароль и выйдите на всех устройствах.</p>' : '') + '</section>'
        + '<section class="k"><h3>История входов</h3>' + (r.logins.length ? '<div class="cx-table cx-logins"><div class="cx-tr cx-thd"><span>Когда</span><span>Результат</span><span>Логин</span><span>Кто</span><span>Устройство</span></div>' + r.logins.map(function (l) { return '<div class="cx-tr"><span class="cx-mut">' + K.dt(l.at) + '</span><span class="' + (l.ok ? 'cx-green' : 'cx-red') + '">' + (l.ok ? '✓ вход' : '✕ неверный пароль') + '</span><span>' + esc(l.login || (l.role === 'admin' ? 'admin' : '')) + '</span><span>' + esc(l.name || (l.role === 'admin' ? 'Администратор' : '—')) + '</span><span class="cx-mut">' + esc(String(l.visitor || '').slice(0, 10) || '—') + '</span></div>'; }).join('') + '</div>' : '<p class="cx-empty">Пока нет записей</p>') + '</section>';
      box.onclick = function (e) {
        var b = e.target.closest('[data-sec]'); if (!b) return; var a = b.dataset.sec;
        if (a === 'gen') { var arr = new Uint8Array(32); (window.crypto || window.msCrypto).getRandomValues(arr); var v = Array.prototype.map.call(arr, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
          var md = K.modal('Новое значение: ' + b.dataset.k, '<p>Скопируйте и вставьте в Render → ваш сервис → Environment → <code>' + esc(b.dataset.k) + '</code>, затем «Save, rebuild and deploy». Значение создано в вашем браузере и никуда не отправлялось.</p><div class="cx-secret"><input readonly value="' + v + '" data-sv><button type="button" class="cx-btn primary sm" data-copy>Копировать</button></div>' + (b.dataset.k === 'SESSION_SECRET' ? '<p class="cx-mut">После смены все сеансы входа завершатся — войдите заново.</p>' : '') + '<p class="cx-mut">Окно закроется — значение пропадёт. Не пересылайте его в мессенджерах.</p>');
          $('[data-copy]', md.el).addEventListener('click', function () { var i = $('[data-sv]', md.el); i.select(); try { navigator.clipboard.writeText(i.value).then(function () { toast('Скопировано'); }); } catch (er) { document.execCommand('copy'); toast('Скопировано'); } }); }
        if (a === 'how') { var H = { OPENAI_API_KEY: 'platform.openai.com → API keys → Create new secret key.', TELEGRAM_BOT_TOKEN: 'Telegram → @BotFather → /newbot (или /token для существующего бота).', TELEGRAM_CHAT_ID: 'Напишите своему боту, затем откройте «Аккаунт» на сайте → «Проверить уведомления» — там будет подсказка.', RESEND_API_KEY: 'resend.com → API Keys → Create API key.', SMTP_URL: 'Адрес SMTP вашей почты в виде smtps://логин:пароль@smtp.yandex.ru:465.', SUPABASE_URL: 'supabase.com → ваш проект → Settings → API → Project URL.', SUPABASE_SERVICE_KEY: 'supabase.com → Settings → API → service_role key.', ADMIN_PASSWORD_HASH: 'Проще сменить пароль на сайте: «Аккаунт» → «Сменить пароль».', ADMIN_EMAIL: 'Почта, на которую приходят заявки и восстановление пароля.', IMAP_HOST: 'Сервер входящей почты, например imap.yandex.ru.', IMAP_USER: 'Адрес почтового ящика.', IMAP_PASSWORD: 'Пароль приложения для почты (в настройках безопасности почтового сервиса).' };
          K.modal(b.dataset.k, '<p>' + esc(H[b.dataset.k] || 'Значение выдаёт сам сервис.') + '</p><p class="cx-mut">Вставляйте ключ только в Render → Environment. Не присылайте его в чат и не храните в коде.</p>'); }
        if (a === 'logoutall') K.confirm('Завершить все сеансы администратора на всех устройствах? Сразу после этого нужно будет войти заново.', 'Выйти везде', true).then(function (ok) { if (ok) api('/api/security/logout-all', { method: 'POST' }).then(function () { location.reload(); }); });
        if (a === 'pw') window.__iomaOpenView && window.__iomaOpenView('accountView');
      };
    }).catch(function (e) { err(box, e); });
  }
  K.on('security', loadSecurity);

  /* ======================= ПОЧТА ======================= */
  var M = { tab: 'entries', cat: '', q: '', off: 0, per: 20 };
  var CAT_CLS = { 'заявка': 'green', 'фрахт': 'amb', 'коммерческое': 'blue', 'спам': 'red', 'исходящее': 'gray' }, CAT_IC = { 'заявка': '📋', 'фрахт': '🚢', 'коммерческое': '💼', 'спам': '🗑', 'исходящее': '↗' };
  function loadMail() {
    var box = $('#cxMail'); if (!box) return;
    box.innerHTML = '<div class="cx-bar"><div class="cx-seg">' + [['entries', 'Письма'], ['queue', 'Очередь менеджеров'], ['compose', 'Написать']].map(function (t) { return '<button type="button" class="' + (M.tab === t[0] ? 'on' : '') + '" data-m="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><span data-mw class="cx-mailw"></span></div><div data-mb></div>';
    box.onclick = mailClick; var body = $('[data-mb]', box);
    if (M.tab === 'queue') return mailQueue(body); if (M.tab === 'compose') return mailCompose(body);
    api('/api/mail/stats').then(function (s) {
      $('[data-mw]', box).innerHTML = '<small>последняя проверка: ' + esc(s.last_check) + '</small><button type="button" class="cx-btn primary sm" data-m="check">▶ Проверить почту</button>';
      body.innerHTML = '<p class="cx-mut">Отправка писем: ' + (s.out.enabled ? '<b class="cx-green">подключена (' + esc(s.out.kind) + ')</b>' : '<b class="cx-red">не настроена</b> — добавьте RESEND_API_KEY или SMTP_URL в Render') + ' · входящий ящик: ' + (s.inbound.configured ? '<b>указан</b>' : '<b>не подключён</b> — заявки с сайта уже попадают сюда') + '</p>'
        + '<div class="cx-metrics">' + metric('Все письма', s.all, 'в базе', ' data-m="cat" data-v=""', M.cat === '' ? 'sel' : '') + metric('Заявки сегодня', s.today['заявка'], 'всего ' + s.total['заявка'], ' data-m="cat" data-v="заявка"', 'green' + (M.cat === 'заявка' ? ' sel' : '')) + metric('Фрахт', s.today['фрахт'], 'предложений', ' data-m="cat" data-v="фрахт"', 'amb' + (M.cat === 'фрахт' ? ' sel' : '')) + metric('Коммерческое', s.today['коммерческое'], 'предложений', ' data-m="cat" data-v="коммерческое"', 'blue' + (M.cat === 'коммерческое' ? ' sel' : '')) + metric('Спам', s.today['спам'], 'отфильтровано', ' data-m="cat" data-v="спам"', 'red' + (M.cat === 'спам' ? ' sel' : '')) + metric('Отправлено', s.sent, 'писем', ' data-m="cat" data-v="исходящие"', M.cat === 'исходящие' ? 'sel' : '') + '</div>'
        + '<div class="cx-bar"><div class="cx-search"><input type="search" data-m="q" value="' + esc(M.q) + '" placeholder="Поиск по письмам" aria-label="Поиск по письмам"></div><select data-m="per" aria-label="Показывать по">' + [20, 40, 60].map(function (n) { return '<option' + (n === M.per ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div data-mt></div>';
      $('[data-m=q]', body).addEventListener('input', function () { var v = this.value; clearTimeout(M.t); M.t = setTimeout(function () { M.q = v; M.off = 0; mailTable(); }, 300); });
      $('[data-m=per]', body).addEventListener('change', function () { M.per = +this.value; M.off = 0; mailTable(); });
      mailTable();
    }).catch(function (e) { err(body, e); });
  }
  function mailTable() {
    var box = $('#cxMail [data-mt]'); if (!box) return;
    api('/api/mail/entries?limit=' + M.per + '&offset=' + M.off + (M.cat ? '&category=' + encodeURIComponent(M.cat) : '') + (M.q ? '&q=' + encodeURIComponent(M.q) : '')).then(function (r) {
      var to = Math.min(M.off + M.per, r.total);
      box.innerHTML = r.entries.length ? '<div class="cx-table cx-mails"><div class="cx-tr cx-thd"><span>Время</span><span>Ящик</span><span>От кого / кому</span><span>Тема</span><span>Категория</span><span>Менеджер</span><span>Сделка</span></div>' + r.entries.map(function (m) { var c = m.dir === 'out' ? 'исходящее' : m.category; return '<button type="button" class="cx-tr" data-m="open" data-id="' + m.id + '"><span class="cx-mut">' + K.dt(m.at) + '</span><span><em class="cx-tag">' + esc(m.mailbox || '') + '</em></span><span>' + esc(m.dir === 'out' ? '→ ' + (m.to || '') : m.from || '') + '</span><span class="cx-t"><b>' + esc(m.subject || '(без темы)') + '</b><small>' + esc(m.preview || '') + '</small></span><span><em class="cx-tag ' + (CAT_CLS[c] || '') + '">' + (CAT_IC[c] || '') + ' ' + esc(c) + '</em>' + (m.ok === false ? ' <em class="cx-tag red">не отправлено</em>' : '') + '</span><span class="cx-mut">' + esc(m.manager || '') + '</span><span>' + (m.dealId ? '<u data-m="deal" data-deal="' + esc(m.dealId) + '">открыть</u>' : '') + '</span></button>'; }).join('') + '</div>'
        + '<nav class="cx-pager"><button type="button" data-m="prev"' + (M.off ? '' : ' disabled') + '>← Назад</button><span>' + (M.off + 1) + '–' + to + ' из ' + r.total + '</span><button type="button" data-m="next"' + (to >= r.total ? ' disabled' : '') + '>Вперёд →</button></nav>' : '<p class="cx-empty">Писем нет</p>';
    });
  }
  function mailClick(e) {
    var b = e.target.closest('[data-m]'); if (!b) return; var a = b.dataset.m;
    if (a === 'tab') { M.tab = b.dataset.v; return loadMail(); }
    if (a === 'cat') { M.cat = b.dataset.v; M.off = 0; return loadMail(); }
    if (a === 'prev') { M.off = Math.max(0, M.off - M.per); return mailTable(); }
    if (a === 'next') { M.off += M.per; return mailTable(); }
    if (a === 'deal') { e.stopPropagation(); return window.IOMA_CRM.openDeal(b.dataset.deal, 'inbox'); }
    if (a === 'check') return K.guard(b, function () { return api('/api/mail/check', { method: 'POST' }).then(function () { loadMail(); }).catch(function (er) { toast(er.message, 'err'); loadMail(); }); });
    if (a === 'open') return api('/api/mail/entries/' + b.dataset.id).then(function (r) { var m = r.item; var md = K.modal(m.subject || '(без темы)', '<p class="cx-mut">' + K.dt(m.at) + ' · ' + esc(m.dir === 'out' ? 'кому: ' + m.to : 'от: ' + m.from) + ' · ' + esc(m.mailbox || '') + '</p><pre class="cx-mailbody">' + esc(m.text || '') + '</pre>' + (m.dir === 'in' ? '<label class="cx-f"><span>Категория</span><select data-cat>' + ['заявка', 'фрахт', 'коммерческое', 'спам'].map(function (c) { return '<option' + (c === m.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' : ''), (m.dealId ? '<button type="button" class="cx-btn" data-gd>Открыть сделку</button>' : '') + '<button type="button" class="cx-btn ghost" data-cx="close">Закрыть</button>', { wide: true });
      var cs = $('[data-cat]', md.el); if (cs) cs.addEventListener('change', function () { api('/api/mail/entries/' + m.id, { method: 'PATCH', body: { category: cs.value } }).then(function () { toast('Категория изменена'); mailTable(); }); });
      var gd = $('[data-gd]', md.el); if (gd) gd.addEventListener('click', function () { md.close(); window.IOMA_CRM.openDeal(m.dealId, 'inbox'); }); });
    if (a === 'qtoggle') return api('/api/mail/queue/toggle', { method: 'POST' }).then(function () { mailQueue($('#cxMail [data-mb]')); });
    if (a === 'qmove') { var Q = M.qdata; var mm = Q.managers.find(function (x) { return x.name === b.dataset.name; }); mm.active = !mm.active; return qSave(); }
  }
  function mailQueue(body) {
    api('/api/mail/queue').then(function (q) {
      M.qdata = q; var inq = q.managers.filter(function (m) { return m.active; }), out = q.managers.filter(function (m) { return !m.active; });
      var cardQ = function (m, on) { return '<div class="cx-qc' + (on ? '' : ' off') + '" draggable="true" data-qn="' + esc(m.name) + '"><span class="cx-grip">⠿</span><span class="cx-ava">' + esc(K.initials(m.name)) + '</span><span><b>' + esc(m.name) + '</b><small>' + (m.telegram ? 'TG ✓' : 'нет TG') + (m.leads ? ' · ' + m.leads + ' ' + K.plural(m.leads, 'заявка', 'заявки', 'заявок') : '') + (m.is_current ? ' · 👉 последний' : '') + (m.off_now ? ' · <em class="cx-tag amb">отсутствует</em>' : '') + '</small></span><button type="button" class="cx-btn sm ghost" data-m="qmove" data-name="' + esc(m.name) + '">' + (on ? '← Убрать' : 'Добавить →') + '</button></div>'; };
      body.innerHTML = '<div class="cx-bar"><span>Распределение заявок: <em class="cx-tag ' + (q.enabled ? 'green' : 'red') + '">' + (q.enabled ? 'включено' : 'выключено') + '</em></span><button type="button" class="cx-btn ' + (q.enabled ? '' : 'primary') + '" data-m="qtoggle">' + (q.enabled ? 'Выключить' : 'Включить') + '</button></div>'
        + '<p class="cx-mut">Новая заявка с сайта по кругу назначается сотрудникам из левого списка, сверху вниз. Сотрудники в отгуле или отпуске пропускаются автоматически. Перетащите карточку между колонками или внутри колонки, чтобы изменить порядок.</p>'
        + (q.managers.length ? '<div class="cx-q2"><section class="k" data-qz="in"><h4>В очереди (' + inq.length + ')</h4>' + (inq.map(function (m) { return cardQ(m, true); }).join('') || '<p class="cx-empty">Никого нет в очереди</p>') + '</section><section class="k" data-qz="out"><h4>Не в очереди (' + out.length + ')</h4>' + (out.map(function (m) { return cardQ(m, false); }).join('') || '<p class="cx-empty">Все в очереди</p>') + '</section></div>' : '<p class="cx-hint">Добавьте сотрудников в разделе «Компания», чтобы настроить очередь.</p>');
      var drag = null;
      $$('.cx-qc', body).forEach(function (c) { c.addEventListener('dragstart', function (e) { drag = c.dataset.qn; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag); } catch (er) {} }); c.addEventListener('dragend', function () { c.classList.remove('drag'); }); });
      $$('[data-qz]', body).forEach(function (z) { z.addEventListener('dragover', function (e) { if (drag) e.preventDefault(); }); z.addEventListener('drop', function (e) { e.preventDefault(); if (!drag) return; var Q = M.qdata, mv = Q.managers.find(function (x) { return x.name === drag; }); mv.active = z.dataset.qz === 'in';
        var before = null; $$('.cx-qc', z).some(function (c) { if (c.dataset.qn === drag) return false; var r = c.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = c.dataset.qn; return true; } return false; });
        var rest = Q.managers.filter(function (x) { return x !== mv; }), at = before ? rest.findIndex(function (x) { return x.name === before; }) : rest.length; rest.splice(at < 0 ? rest.length : at, 0, mv); Q.managers = rest; drag = null; qSave(); }); });
    }).catch(function (e) { err(body, e); });
  }
  function qSave() { return api('/api/mail/queue/managers', { method: 'PATCH', body: { managers: M.qdata.managers.map(function (m) { return { name: m.name, active: m.active }; }) } }).then(function () { mailQueue($('#cxMail [data-mb]')); }); }
  function mailCompose(body) {
    body.innerHTML = '<form class="k cx-compose" data-mc><label class="cx-f"><span>Кому</span><input type="email" name="to" required placeholder="client@company.ru"></label><label class="cx-f"><span>Тема</span><input name="subject" required></label><label class="cx-f"><span>Текст</span><textarea name="text" rows="9" required></textarea></label><p class="cx-hint">Чтобы письмо сохранилось в ленте сделки, пишите из карточки сделки — кнопка «Написать письмо» у клиента.</p><button type="submit" class="cx-btn primary">Отправить</button></form>';
    $('[data-mc]', body).addEventListener('submit', function (e) { e.preventDefault(); var f = this, b = { to: f.to.value, subject: f.subject.value, text: f.text.value }; K.guard($('[type=submit]', f), function () { return api('/api/mail/send', { method: 'POST', body: b }).then(function () { toast('Письмо отправлено'); f.reset(); }); }); });
  }
  K.on('mail', loadMail);

  /* ======================= БОТ ======================= */
  var B = { sub: 'dialogs', per: 20, off: 0, src: 'all', ch: '' };
  function loadBot() {
    var box = $('#cxBot'); if (!box) return;
    api('/api/bot/stats').then(function (s) {
      box.innerHTML = '<div class="cx-metrics">' + metric('Сообщений сегодня', s.msgs_today, (s.msgs_delta >= 0 ? '+' : '') + s.msgs_delta + '% к вчера', '', s.msgs_delta >= 0 ? 'green' : 'red') + metric('Активных сегодня', s.active_users, 'из ' + s.total_users + ' в Telegram') + metric('С сайта сегодня', s.site_today, 'ИИ-ассистент') + metric('База знаний', s.kb_count, 'записей') + metric('Плохих ответов', s.feedback_bad, 'отмечено 👎', '', s.feedback_bad ? 'red' : '') + '</div>'
        + '<p class="cx-mut">ИИ: ' + (s.aiReady ? '<b class="cx-green">подключён</b>' : '<b class="cx-red">не подключён</b> (OPENAI_API_KEY в Render) — бот отвечает только из базы знаний') + ' · Telegram-бот: ' + (s.tgReady ? '<b class="cx-green">подключён</b>' : '<b>не подключён</b> (TELEGRAM_BOT_TOKEN)') + ' · бот ' + (s.enabled ? 'включён' : '<b class="cx-red">выключен</b>') + '</p>'
        + '<div class="cx-seg cx-subt">' + [['dialogs', 'Диалоги'], ['kb', 'База знаний'], ['whitelist', 'Белый список'], ['users', 'Пользователи'], ['prompt', 'Промпт и проверка']].map(function (t) { return '<button type="button" class="' + (B.sub === t[0] ? 'on' : '') + '" data-b="sub" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div data-bb></div>';
      box.onclick = botClick; botSub();
    }).catch(function (e) { err(box, e); });
  }
  function botSub() {
    var el = $('#cxBot [data-bb]'); if (!el) return;
    if (B.sub === 'dialogs') return api('/api/bot/dialogs?limit=' + B.per + '&offset=' + B.off + (B.ch ? '&channel=' + B.ch : '')).then(function (r) {
      B.pairs = r.pairs; var to = Math.min(B.off + B.per, r.total);
      el.innerHTML = '<div class="cx-bar"><div class="cx-seg">' + [['', 'Все'], ['site', 'Сайт'], ['telegram', 'Telegram']].map(function (c) { return '<button type="button" class="' + (B.ch === c[0] ? 'on' : '') + '" data-b="ch" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div><select data-b="per" aria-label="Показывать по">' + [20, 40, 60].map(function (n) { return '<option' + (n === B.per ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select><span class="cx-mut">' + r.total + ' пар</span></div>'
        + (r.pairs.length ? '<div class="cx-table cx-dlg"><div class="cx-tr cx-thd"><span>Время</span><span>Кто</span><span>Вопрос</span><span>Ответ бота</span><span></span></div>' + r.pairs.map(function (p, i) { return '<div class="cx-tr' + (p.rating === 'bad' ? ' bad' : p.rating === 'good' ? ' good' : '') + '" role="button" tabindex="0" data-b="view" data-i="' + i + '"><span class="cx-mut">' + K.dt(p.at) + '</span><span><em class="cx-tag">' + (p.channel === 'telegram' ? 'TG' : 'сайт') + '</em> ' + esc(p.username || '') + '</span><span class="cx-clip">' + esc(p.q) + '</span><span class="cx-clip cx-mut">' + esc(p.a || 'нет ответа') + '</span><span class="cx-fb"><button type="button" data-b="good" data-i="' + i + '" title="Хороший ответ">👍</button><button type="button" data-b="bad" data-i="' + i + '" title="Плохой ответ — улучшить">👎</button></span></div>'; }).join('') + '</div><nav class="cx-pager"><button type="button" data-b="prev"' + (B.off ? '' : ' disabled') + '>← Назад</button><span>' + (B.off + 1) + '–' + to + ' из ' + r.total + '</span><button type="button" data-b="next"' + (to >= r.total ? ' disabled' : '') + '>Вперёд →</button></nav>' : '<p class="cx-empty">Диалогов пока нет. Здесь появятся вопросы к ИИ-ассистенту на сайте и сообщения Telegram-боту.</p>');
      var per = $('[data-b=per]', el); per.addEventListener('change', function () { B.per = +per.value; B.off = 0; botSub(); });
    });
    if (B.sub === 'kb') return api('/api/bot/kb').then(function (r) {
      var all = r.items, cnt = { manual: 0, doc: 0, ai_feedback: 0 }; all.forEach(function (k) { cnt[k.source] = (cnt[k.source] || 0) + 1; });
      var rows = B.src === 'all' ? all : all.filter(function (k) { return k.source === B.src; }), SRC = { manual: 'Вручную', doc: 'Документ', ai_feedback: 'Из оценок' }, seenDoc = {};
      var items = rows.map(function (k) { if (k.source_doc) { if (seenDoc[k.source_doc]) return ''; seenDoc[k.source_doc] = 1; var g = rows.filter(function (x) { return x.source_doc === k.source_doc; });
        return '<details class="cx-kb s-doc"><summary><b>' + esc(k.source_doc) + '</b><em class="cx-tag">Документ · ' + g.length + ' ' + K.plural(g.length, 'секция', 'секции', 'секций') + '</em><small>' + K.dt(k.createdAt) + '</small><button type="button" class="cx-ib danger" data-b="kbdelg" data-id="' + k.id + '" title="Удалить документ целиком">✕</button></summary>' + g.map(function (s) { return '<div class="cx-kbs"><span><b>' + esc(s.topic) + '</b><small>' + esc(String(s.content).slice(0, 160)) + '…</small></span><button type="button" class="cx-btn sm ghost" data-b="kbedit" data-id="' + s.id + '">Изм.</button></div>'; }).join('') + '</details>'; }
        return '<div class="cx-kb s-' + k.source + '"><span><b>' + esc(k.topic) + '</b> <em class="cx-tag">' + SRC[k.source] + '</em><small>' + esc(String(k.content).slice(0, 200)) + (k.content.length > 200 ? '…' : '') + '</small><small class="cx-mut">' + K.dt(k.updatedAt || k.createdAt) + '</small></span><button type="button" class="cx-btn sm ghost" data-b="kbedit" data-id="' + k.id + '">Изм.</button><button type="button" class="cx-ib danger" data-b="kbdel" data-id="' + k.id + '" title="Удалить">✕</button></div>'; }).join('');
      el.innerHTML = '<div class="cx-bar"><div class="cx-seg">' + [['all', 'Все', all.length], ['manual', 'Вручную', cnt.manual], ['doc', 'Документы', cnt.doc], ['ai_feedback', 'Из оценок', cnt.ai_feedback]].map(function (s) { return '<button type="button" class="' + (B.src === s[0] ? 'on' : '') + '" data-b="src" data-v="' + s[0] + '">' + s[1] + ' (' + (s[2] || 0) + ')</button>'; }).join('') + '</div><button type="button" class="cx-btn primary" data-b="kbadd">+ Добавить</button></div>'
        + '<p class="cx-mut">Бот сначала ищет ответ здесь: подходящие записи добавляются к вопросу ИИ, а без ИИ бот отвечает лучшей записью. Пишите темы так, как спрашивают клиенты: «сроки ЖД», «документы для растаможки».</p>' + (items || '<p class="cx-empty">База знаний пуста</p>');
      B.kb = all;
    });
    if (B.sub === 'whitelist') return api('/api/bot/whitelist').then(function (r) {
      el.innerHTML = '<div class="cx-bar"><input data-wl="id" placeholder="Telegram ID" inputmode="numeric" aria-label="Telegram ID"><input data-wl="name" placeholder="Имя" aria-label="Имя"><input data-wl="email" placeholder="Email" aria-label="Email"><button type="button" class="cx-btn primary sm" data-b="wladd">+ Добавить</button>' + (r.users.length ? '<em class="cx-tag amb">⚠ бот отвечает только им</em>' : '') + '</div>'
        + (r.users.map(function (u) { return '<div class="cx-st"><span class="cx-ava">' + esc(K.initials(u.display_name || u.user_id)) + '</span><span><b>' + esc(u.display_name || u.user_id) + '</b><small>TG: ' + esc(u.user_id) + (u.email ? ' · ' + esc(u.email) : '') + (u.notes ? ' · ' + esc(u.notes) : '') + '</small></span><button type="button" class="cx-ib danger" data-b="wlrm" data-id="' + esc(u.user_id) + '" title="Убрать">✕</button></div>'; }).join('') || '<p class="cx-empty">Белый список пуст — бот доступен всем</p>');
    });
    if (B.sub === 'users') return api('/api/bot/users').then(function (r) {
      el.innerHTML = r.users.map(function (u) { return '<div class="cx-st"><span class="cx-ava">' + esc(K.initials(u.display_name || u.username)) + '</span><span><b>' + esc(u.display_name || u.username) + (u.blocked ? ' <em class="cx-tag red">заблокирован</em>' : '') + '</b><small>' + u.msg_count + ' ' + K.plural(u.msg_count, 'сообщение', 'сообщения', 'сообщений') + ' · последнее: ' + K.dt(u.last_active) + ' · TG ' + esc(u.user_id) + '</small></span><button type="button" class="cx-btn sm ' + (u.blocked ? '' : 'danger') + '" data-b="' + (u.blocked ? 'unblock' : 'block') + '" data-id="' + esc(u.user_id) + '">' + (u.blocked ? 'Разблокировать' : 'Блок') + '</button></div>'; }).join('') || '<p class="cx-empty">Пока никто не писал боту в Telegram</p>';
    });
    if (B.sub === 'prompt') return api('/api/bot/prompt').then(function (r) {
      el.innerHTML = '<label class="cx-cbx"><input type="checkbox" data-pp="enabled"' + (r.enabled ? ' checked' : '') + '> Бот отвечает в Telegram</label><label class="cx-cbx"><input type="checkbox" data-pp="answerSite"' + (r.answerSite ? ' checked' : '') + '> Подключать базу знаний к ИИ-ассистенту на сайте</label>'
        + '<h4>Базовые правила ассистента</h4><p class="cx-mut">' + esc(r.base) + '</p><label class="cx-f"><span>Ваши указания (добавляются к правилам)</span><textarea data-pp="prompt" rows="7" placeholder="Например: всегда предлагай оставить заявку; ЖД из Китая в Москву 25–35 дней; не называй цены без расчёта.">' + esc(r.prompt) + '</textarea></label><button type="button" class="cx-btn primary" data-b="psave">Сохранить</button>'
        + '<h4>Проверить ответ</h4><div class="cx-test"><input data-pp="q" placeholder="Вопрос как от клиента"><button type="button" class="cx-btn" data-b="ptest">Спросить</button></div><div data-pt></div>';
    });
  }
  function botClick(e) {
    var b = e.target.closest('[data-b]'); if (!b) return; var a = b.dataset.b, i = +b.dataset.i;
    if (a === 'sub') { B.sub = b.dataset.v; B.off = 0; $$('#cxBot .cx-subt button').forEach(function (x) { x.classList.toggle('on', x === b); }); return botSub(); }
    if (a === 'ch') { B.ch = b.dataset.v; B.off = 0; return botSub(); }
    if (a === 'prev') { B.off = Math.max(0, B.off - B.per); return botSub(); } if (a === 'next') { B.off += B.per; return botSub(); }
    if (a === 'good') { e.stopPropagation(); return api('/api/bot/feedback', { method: 'POST', body: { id: B.pairs[i].id, rating: 'good' } }).then(function () { b.textContent = '✅'; }); }
    if (a === 'bad') { e.stopPropagation(); return improve(B.pairs[i]); }
    if (a === 'view') { var p = B.pairs[i]; return K.modal('Диалог · ' + (p.username || ''), '<h4>Вопрос</h4><pre class="cx-mailbody">' + esc(p.q) + '</pre><h4>Ответ бота</h4><pre class="cx-mailbody">' + esc(p.a || '(нет ответа)') + '</pre>' + (p.comment ? '<p class="cx-mut">Замечание: ' + esc(p.comment) + '</p>' : ''), false, { wide: true }); }
    if (a === 'src') { B.src = b.dataset.v; return botSub(); }
    if (a === 'kbadd') return kbForm(null);
    if (a === 'kbedit') return kbForm(B.kb.find(function (k) { return k.id === b.dataset.id; }));
    if (a === 'kbdel' || a === 'kbdelg') { e.preventDefault(); return K.confirm(a === 'kbdelg' ? 'Удалить документ со всеми секциями?' : 'Удалить запись?', 'Удалить', true).then(function (ok) { if (ok) api('/api/bot/kb/' + b.dataset.id + (a === 'kbdelg' ? '?group=1' : ''), { method: 'DELETE' }).then(botSub); }); }
    if (a === 'wladd') { var g = function (k) { return $('[data-wl=' + k + ']', $('#cxBot')).value; }; return api('/api/bot/whitelist', { method: 'POST', body: { user_id: g('id'), display_name: g('name'), email: g('email') } }).then(botSub).catch(function (er) { toast(er.message, 'err'); }); }
    if (a === 'wlrm') return K.confirm('Убрать пользователя из белого списка?', 'Убрать').then(function (ok) { if (ok) api('/api/bot/whitelist', { method: 'POST', body: { remove: b.dataset.id } }).then(botSub); });
    if (a === 'block' || a === 'unblock') return api('/api/bot/users/' + b.dataset.id + '/' + a, { method: 'POST' }).then(botSub);
    if (a === 'psave') { var box = $('#cxBot'); return api('/api/bot/prompt', { method: 'PUT', body: { prompt: $('[data-pp=prompt]', box).value, enabled: $('[data-pp=enabled]', box).checked, answerSite: $('[data-pp=answerSite]', box).checked } }).then(function () { toast('Сохранено'); }); }
    if (a === 'ptest') { var bx = $('#cxBot'), q = $('[data-pp=q]', bx).value.trim(); if (!q) return; return K.guard(b, function () { return api('/api/bot/test', { method: 'POST', body: { message: q } }).then(function (r) { $('[data-pt]', bx).innerHTML = '<div class="cx-botans"><small>' + ({ ai: 'Ответ ИИ с базой знаний', kb: 'Ответ из базы знаний (ИИ не подключён)', none: 'Ответа нет' }[r.source]) + (r.kb.length ? ' · найдены записи: ' + r.kb.map(function (k) { return esc(k.topic); }).join(', ') : '') + '</small><pre>' + esc(r.answer || 'Бот не нашёл ответа — добавьте запись в базу знаний.') + '</pre></div>'; }); }); }
  }
  function kbForm(k) {
    var html = (k ? '' : '<div class="cx-pills"><button type="button" class="on" data-mode="text">Текст</button><button type="button" data-mode="file">Файл (.txt, .docx)</button></div>') + '<label class="cx-f"><span>Тема</span><input data-k="topic" value="' + esc(k ? k.topic : '') + '" placeholder="Как спрашивают клиенты: «сроки доставки ЖД»"></label><label class="cx-f" data-tm><span>Содержание</span><textarea data-k="content" rows="8">' + esc(k ? k.content : '') + '</textarea></label><label class="cx-drop" data-fm hidden><input type="file" accept=".txt,.docx" hidden data-kf><b>📎 Выберите или перетащите файл .txt или .docx</b><small>Документ разделится на секции по заголовкам.</small><span data-kfn></span></label>';
    var md = K.modal(k ? 'Запись базы знаний' : 'Новая запись', html, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>', { wide: true });
    var mode = 'text', file = null;
    $$('[data-mode]', md.el).forEach(function (x) { x.addEventListener('click', function () { mode = x.dataset.mode; $$('[data-mode]', md.el).forEach(function (y) { y.classList.toggle('on', y === x); }); $('[data-tm]', md.el).hidden = mode === 'file'; $('[data-fm]', md.el).hidden = mode !== 'file'; }); });
    var kf = $('[data-kf]', md.el); kf.addEventListener('change', function () { file = kf.files[0]; $('[data-kfn]', md.el).textContent = file ? file.name : ''; }); K.dropzone($('[data-fm]', md.el), function (fl) { file = fl[0]; $('[data-kfn]', md.el).textContent = file.name; });
    $('[data-ok]', md.el).addEventListener('click', function () { var topic = $('[data-k=topic]', md.el).value.trim(), content = $('[data-k=content]', md.el).value.trim();
      if (mode === 'file') { if (!file) return toast('Выберите файл', 'err'); var fd = new FormData(); fd.append('file', file); fd.append('topic', topic); return K.guard(this, function () { return api('/api/bot/kb/upload', { method: 'POST', body: fd }).then(function (r) { toast('Добавлено секций: ' + r.sections); md.close(); botSub(); }); }); }
      if (!topic || !content) return toast('Заполните тему и содержание', 'err');
      K.guard(this, function () { return api(k ? '/api/bot/kb/' + k.id : '/api/bot/kb', { method: k ? 'PUT' : 'POST', body: { topic: topic, content: content } }).then(function () { md.close(); botSub(); }); }); });
  }
  function improve(p) {
    var html = '<h4>Вопрос</h4><pre class="cx-mailbody">' + esc(p.q) + '</pre><h4>Ответ бота</h4><pre class="cx-mailbody">' + esc(p.a || '(нет ответа)') + '</pre><label class="cx-f"><span>Что не так (необязательно)</span><textarea data-c rows="2"></textarea></label><div class="cx-sbtns"><button type="button" class="cx-btn ok" data-ai>✨ Улучшить с ИИ</button><a class="cx-btn ghost" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(String(p.q).slice(0, 80)) + '">🔍 Google</a></div><div data-res hidden><label class="cx-f"><span>Улучшенный ответ</span><textarea data-imp rows="4"></textarea></label></div><h4>Запись в базу знаний</h4><label class="cx-f"><span>Тема</span><input data-kt></label><label class="cx-f"><span>Содержание</span><textarea data-kc rows="4"></textarea></label>';
    var md = K.modal('👎 Улучшить ответ', html, '<button type="button" class="cx-btn ghost" data-only>Только отметить</button><button type="button" class="cx-btn primary" data-kb>💾 Сохранить в базу знаний</button>', { side: true, wide: true });
    var comment = function () { return $('[data-c]', md.el).value; };
    $('[data-ai]', md.el).addEventListener('click', function () { var b = this; K.guard(b, function () { return api('/api/bot/ai_suggest', { method: 'POST', body: { user_msg: p.q, bot_msg: p.a, comment: comment() } }).then(function (r) { $('[data-res]', md.el).hidden = false; $('[data-imp]', md.el).value = r.improved_answer; $('[data-kt]', md.el).value = r.kb_topic; $('[data-kc]', md.el).value = r.kb_content; }); }); });
    $('[data-only]', md.el).addEventListener('click', function () { api('/api/bot/feedback', { method: 'POST', body: { id: p.id, rating: 'bad', comment: comment() } }).then(function () { md.close(); botSub(); }); });
    $('[data-kb]', md.el).addEventListener('click', function () { var t = $('[data-kt]', md.el).value.trim(), c = $('[data-kc]', md.el).value.trim(); if (!t || !c) return toast('Заполните тему и содержание', 'err');
      Promise.all([api('/api/bot/feedback', { method: 'POST', body: { id: p.id, rating: 'bad', comment: comment() } }), api('/api/bot/kb', { method: 'POST', body: { topic: t, content: c, source: 'ai_feedback' } })]).then(function () { toast('Сохранено в базу знаний'); md.close(); botSub(); }); });
  }
  K.on('bot', loadBot);

  /* ======================= ТАРИФЫ (ориентиры для расчёта на сайте) ======================= */
  var KN = { air: 'Авиа', ltl_auto: 'Авто, сборный', lcl_rail: 'ЖД, сборный', lcl_sea: 'Море + ЖД, сборный', fcl_rail: "ЖД, контейнер 40'", ftl_auto: 'Авто, машина целиком' };
  var FL = { perKg: '$ за кг', perM3: '$ за м³', factor: 'кг в 1 м³', minUsd: 'минимум, $', minM3: 'минимум, м³', price: '$ за единицу', capM3: 'вместимость, м³', capKg: 'вместимость, кг' };
  function loadTariffs() {
    var box = $('#crmTariffs'); if (!box) return;
    api('/api/tariffs').then(function (r) { var t = r.tariffs;
      box.innerHTML = '<form class="k v3p-form" id="crmTarForm"><b class="v3c-title">Тарифы для сравнения транспорта</b><p class="v3p-hint">Это ориентиры, по которым сайт считает цену для клиентов, когда в базе нет точной ставки агента. Цены в USD до Москвы, без таможни и терминальных расходов. Ставка контейнера из базы агентов имеет приоритет.</p><div class="crm-tar">'
        + Object.keys(KN).map(function (k) { return '<fieldset><legend>' + KN[k] + '</legend>' + Object.keys(t[k]).filter(function (f) { return f !== 'days'; }).map(function (f) { return '<label class="crm-f"><span>' + FL[f] + '</span><input type="number" step="any" min="0" name="' + k + '.' + f + '" value="' + esc(t[k][f]) + '"></label>'; }).join('') + '<div class="crm-two"><label class="crm-f"><span>срок от, дн.</span><input type="number" min="1" name="' + k + '.d0" value="' + t[k].days[0] + '"></label><label class="crm-f"><span>до, дн.</span><input type="number" min="1" name="' + k + '.d1" value="' + t[k].days[1] + '"></label></div></fieldset>'; }).join('')
        + '<fieldset><legend>Опасный груз</legend><label class="crm-f"><span>надбавка, %</span><input type="number" min="0" max="300" name="dangerousPct" value="' + t.dangerousPct + '"></label></fieldset></div><button type="submit" class="calculate">Сохранить тарифы</button></form>';
      $('#crmTarForm').addEventListener('submit', function (e) { e.preventDefault(); var o = { dangerousPct: +this.dangerousPct.value };
        Object.keys(KN).forEach(function (k) { o[k] = {}; Object.keys(t[k]).forEach(function (f) { if (f === 'days') o[k].days = [+e.target[k + '.d0'].value, +e.target[k + '.d1'].value]; else o[k][f] = +e.target[k + '.' + f].value; }); });
        api('/api/tariffs', { method: 'PUT', body: { tariffs: o } }).then(function () { toast('Тарифы сохранены'); }).catch(function (x) { toast(x.message, 'err'); }); });
    }).catch(function (x) { err(box, x); });
  }
  K.on('tariffs', loadTariffs);
})();
