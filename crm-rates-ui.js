/* IOMASTAVKA — вкладка «Ставки» в сделке: запрос ставок агентам, ответы, ставки с подтверждением, ориентиры по прайсам, база агентов.
   Логика — как в прежней CRM (rq_rates.js): ИИ предлагает ставку, менеджер подтверждает; лучшая — минимальная в USD внутри единицы. */
(function () {
  'use strict';
  var K = window.CX; if (!K) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var MODE = { air: 'Авиа', road: 'Авто', rail: 'ЖД', sea: 'Море', multimodal: 'Мульти' };
  var ST = { sent: ['отправлено', 'blue'], manual: ['отправить вручную', ''], error: ['ошибка отправки', 'red'], replied: ['ответил', 'green'] };
  var deal = null, box = null, V = null;
  var fmt = function (v) { return Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); };

  function load() {
    box.innerHTML = '<p class="cx-load">Загружаю ставки…</p>';
    api('/api/deals/' + deal.id + '/rq').then(function (r) { V = r; draw(); }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }

  var rub = function (v) { return Math.round(Number(v || 0)).toLocaleString('ru-RU') + ' ₽'; };
  function rateRow(t) {
    var acts = t.status === 'proposed' ? '<button type="button" class="cx-ib ok" data-r="ok" data-id="' + t.id + '" title="Подтвердить">✓</button><button type="button" class="cx-ib" data-r="no" data-id="' + t.id + '" title="Отклонить">✕</button>'
      : t.status === 'confirmed' ? (t.inFinance ? '<span class="cx-mut">в финансах</span>' : '<button type="button" class="cx-link" data-r="fin" data-id="' + t.id + '">в финансы</button>') : '<button type="button" class="cx-link" data-r="back" data-id="' + t.id + '">вернуть</button>';
    if (t.status !== 'rejected' && !t.expired) acts = (t.inCalc ? '<button type="button" class="cx-link" data-r="opencalc" data-id="' + esc(t.inCalc) + '" title="Открыть расчёт контракта">в расчёте ✓</button>' : '<button type="button" class="cx-btn sm primary" data-r="calc" data-id="' + t.id + '" title="Фрахт, надбавка к курсу, транзит и срок действия уйдут в расчёт контракта сделки">В расчёт</button>') + acts;
    var more = [t.container, t.fx ? 'курс ЦБ +' + String(t.fx).replace('.', ',') + '%' : '', t.includes && 'включено: ' + t.includes, t.extras && 'доп.: ' + t.extras].filter(Boolean).join(' · ');
    var left = t.validUntil && !t.expired ? Math.round((Date.parse(t.validUntil) - Date.parse(V.today)) / 864e5) : null;
    var valid = t.validUntil ? '<span class="cx-valid' + (t.expired ? ' red' : left != null && left <= 3 ? ' amb' : '') + '">' + (t.expired ? 'истекла ' : 'действует до ') + esc(t.validRu) + '</span>' : t.valid ? '<small class="cx-mut">действует: ' + esc(t.valid) + '</small>' : '<small class="cx-mut">срок ставки не указан</small>';
    var tot = t.totRub != null ? '<b>≈ ' + rub(t.totRub) + '</b>' + (t.qty && t.qty !== 1 ? '<small class="cx-mut"> ' + fmt(t.qty) + ' ' + esc(t.unit) + '</small>' : '') : '<small class="cx-mut">' + (t.unit === 'кг' ? 'нет веса' : t.unit === 'м³' ? 'нет объёма' : 'нет курса') + '</small>';
    return '<div class="cx-tr cx-rt ' + t.status + (t.best ? ' best' : '') + (t.expired ? ' expired' : '') + '"><span class="cx-t"><b>' + esc(t.agent) + (t.best ? ' <em class="cx-tag green">лучшая</em>' : '') + (t.status === 'proposed' ? ' <em class="cx-tag amb">' + (t.source === 'ai' ? 'ИИ' : 'авто') + ' — проверьте</em>' : '') + '</b>' + (t.contact ? '<small class="cx-who">' + esc(t.contact) + '</small>' : '') + (more ? '<small>' + esc(more) + '</small>' : '') + (t.quote ? '<small class="cx-q">«' + esc(t.quote) + '»</small>' : '') + '</span>'
      + '<span><b>' + fmt(t.amount) + ' ' + esc(t.currency) + '</b>' + (t.unit ? '<small class="cx-mut"> / ' + esc(t.unit) + '</small>' : '') + (t.usd != null && t.currency !== 'USD' ? '<small class="cx-mut"> ≈ $' + fmt(t.usd) + '</small>' : '') + '</span>'
      + '<span class="lp">' + tot + '</span><span class="lp cx-terms">' + (t.transit ? '<small class="cx-mut">в пути ' + esc(t.transit) + '</small>' : '') + valid + '</span><span class="cx-racts">' + acts + '</span></div>';
  }
  // сравнение: лучшая за всю партию и насколько дешевле следующей
  function compare(list) {
    var c = list.filter(function (t) { return t.status !== 'rejected' && t.totRub != null; }).sort(function (a, b) { return a.totRub - b.totRub; });
    if (c.length < 2) return '';
    var d = c[1].totRub - c[0].totRub, w = [deal.weight ? fmt(deal.weight) + ' кг' : '', deal.volume ? fmt(deal.volume) + ' м³' : ''].filter(Boolean).join(', ');
    return '<p class="cx-cmp">Сравнение за всю партию' + (w ? ' (' + esc(w) + ')' : '') + ' с надбавками агентов к курсу: дешевле всех — <b>' + esc(c[0].agent) + '</b>, ≈ ' + rub(c[0].totRub) + (d > 0 ? ', на ' + rub(d) + ' дешевле, чем ' + esc(c[1].agent) : ', столько же, сколько ' + esc(c[1].agent)) + '.</p>';
  }
  var HEAD = '<div class="cx-tr cx-thd"><span>Агент</span><span>Ставка</span><span class="lp">За партию</span><span class="lp">Сроки</span><span></span></div>';

  function draw() {
    var r = V, rates = r.rates.slice().sort(function (a, b) { var o = { confirmed: 0, proposed: 1, rejected: 2 }; return (o[a.status] - o[b.status]) || ((a.usd || 1e12) - (b.usd || 1e12)); });
    var h = '<div class="cx-bar"><button type="button" class="cx-btn primary" data-r="ask">Запросить ставки</button><button type="button" class="cx-btn ghost" data-r="reply"' + (r.requests.length ? '' : ' disabled title="Сначала отправьте запрос"') + '>Вставить ответ агента</button><button type="button" class="cx-btn ghost" data-r="manual"' + (r.requests.length ? '' : ' disabled') + '>+ Ставка вручную</button><button type="button" class="cx-btn ghost" data-r="client">Ставка клиенту</button><button type="button" class="cx-link" data-r="base">База агентов</button></div>';
    if (r.questions.length) h += '<div class="cx-qbox"><b>Агенты спрашивают</b>' + r.questions.map(function (q) { return '<div><span><b>' + esc(q.agent) + ':</b> ' + q.questions.map(esc).join(' · ') + '</span><button type="button" class="cx-link" data-r="ans" data-id="' + q.replyId + '">Ответили</button></div>'; }).join('') + '</div>';
    var act = rates.filter(function (t) { return !t.expired; }), arch = rates.filter(function (t) { return t.expired; });
    h += act.length ? compare(act) + '<div class="cx-table cx-rates">' + HEAD + act.map(rateRow).join('') + '</div>'
      : arch.length ? '<p class="cx-empty">Действующих ставок нет — у всех истёк срок. Запросите свежие ставки.</p>'
      : r.requests.length ? '<p class="cx-empty">Ответов пока нет. Когда агент ответит — нажмите «Вставить ответ агента», ставку найдёт ИИ.</p>' : '';
    if (arch.length) h += '<details class="cx-rqs cx-arch"><summary>Архив — истёк срок действия · ' + arch.length + '</summary><p class="cx-mut cx-small">Ставки не удаляются: видно, кто и сколько предлагал раньше.</p><div class="cx-table cx-rates">' + HEAD + arch.map(rateRow).join('') + '</div></details>';
    if (r.refs.length) h += '<section class="cx-refs"><h4>Ориентир по прайсам агентов</h4>' + r.refs.map(function (p) { return '<div class="cx-ref"><span><b>' + esc(p.agent) + '</b> <small class="cx-mut">' + esc(MODE[p.mode] || '') + ' · ' + esc(p.origin) + (p.dest ? ' → ' + esc(p.dest) : '') + (p.days ? ' · ' + esc(p.days) + ' дн.' : '') + '</small></span><span>' + fmt(p.perKg) + ' ₽/кг' + (p.min ? '<small class="cx-mut">, от ' + fmt(p.min) + ' ₽</small>' : '') + '</span><span>' + (p.est ? '<b>≈ ' + fmt(p.est) + ' ₽</b>' : '<small class="cx-mut">укажите вес</small>') + '</span>' + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" class="cx-link">сайт ↗</a>' : '<span></span>') + '</div>'; }).join('') + '<p class="cx-mut cx-small">Цены «от» с сайтов агентов; меняются в разделе «Тарифы».</p></section>';
    if (r.requests.length) h += '<details class="cx-rqs"><summary>Запросы · ' + r.requests.length + '</summary>' + r.requests.map(function (q) {
      return '<div class="cx-rq"><div class="cx-rqh"><b>' + esc(q.id) + '</b><span class="cx-mut">' + K.dt(q.createdAt) + ' · ' + esc(q.by || '') + '</span><button type="button" class="cx-link" data-r="copy" data-id="' + q.id + '">Скопировать текст</button><button type="button" class="cx-ib" data-r="delrq" data-id="' + q.id + '" title="Удалить запрос">✕</button></div><div class="cx-rqi">' + q.items.map(function (it) { var s = ST[it.status] || ['', '']; return '<button type="button" class="cx-chip2 ' + s[1] + '" data-r="reply1" data-rq="' + q.id + '" data-id="' + it.id + '" title="' + esc((it.email || it.phone || '') + (it.error ? ' — ' + it.error : '')) + '">' + esc(it.agent) + ' <small>' + s[0] + '</small></button>'; }).join('') + '</div></div>';
    }).join('') + '</details>';
    // ответы агентов целиком — читаемо: суммы и сроки подсвечены, подпись мелко, старая переписка свёрнута
    var reps = []; r.requests.forEach(function (q) { (q.replies || []).forEach(function (p) { reps.push(p); }); });
    if (reps.length) h += '<details class="cx-rqs cx-reps"><summary>Ответы агентов · ' + reps.length + '</summary>' + reps.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).map(function (p) {
      var who = [p.sender && p.sender.name, p.sender && p.sender.email, p.sender && p.sender.phone].filter(Boolean).join(' · ');
      return '<article class="cx-rep"><header><b>' + esc(p.agent) + '</b><small class="cx-mut">' + K.dt(p.at) + (who ? ' · ' + esc(who) : '') + '</small><em class="cx-tag ' + (p.rates_n ? 'green' : 'amb') + '">' + (p.rates_n ? 'ставок: ' + p.rates_n : 'ставок не нашлось') + '</em></header>'
        + '<div class="fm fm-clamp">' + (window.IOMA_FMT ? window.IOMA_FMT.rich(p.text || '') : esc(p.text || '')) + '</div><button type="button" class="cx-more" data-r="repmore">показать полностью</button></article>';
    }).join('') + '</details>';
    if (!r.requests.length && !r.refs.length) h += '<p class="cx-empty">Запросите ставки у агентов — письмо уйдёт тем, у кого указан email, остальным можно отправить текст в мессенджер.</p>';
    box.innerHTML = h;
  }

  function askModal() {
    Promise.all([api('/api/crm/agents?mode=' + encodeURIComponent(deal.mode || '')), api('/api/deals/' + deal.id + '/rq/draft')]).then(function (rr) {
      var A = rr[0].items, D = rr[1], sel = {};
      var list = function (q) { q = String(q || '').toLowerCase(); return A.filter(function (a) { return !q || (a.company + ' ' + a.contact + ' ' + (a.transport || []).join(' ')).toLowerCase().indexOf(q) >= 0; }).map(function (a) { return '<label class="cx-ag"><input type="checkbox" data-a="' + esc(a.id) + '"' + (sel[a.id] ? ' checked' : '') + '><span><b>' + esc(a.company) + '</b><small>' + esc([a.contact, (a.modes || []).map(function (m) { return MODE[m]; }).join(', '), a.email ? '✉' : 'без почты'].filter(Boolean).join(' · ')) + '</small></span></label>'; }).join('') || '<p class="cx-mut">Никого не нашлось. Добавьте агентов в «Базе агентов».</p>'; };
      var md = K.modal('Запрос ставок', '<div class="cx-asks"><div><input type="search" data-q placeholder="Найти агента" aria-label="Найти агента"><div class="cx-aglist" data-l>' + list('') + '</div><p class="cx-mut cx-small" data-n>Выбрано: 0</p></div><div><label class="cx-f"><span>Тема</span><input data-s value="' + esc(D.subject) + '"></label><label class="cx-f"><span>Текст запроса</span><textarea data-t rows="11">' + esc(D.text) + '</textarea></label>' + (V && V.mailOn ? '<label class="cx-cbx"><input type="checkbox" data-send checked> Отправить письмом тем, у кого есть email</label>' : '<p class="cx-mut cx-small">Почта не подключена — текст можно будет скопировать и отправить в мессенджер.</p>') + '</div></div>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Отправить запрос</button>', { wide: true });
      var el = md.el, upd = function () { $('[data-n]', el).textContent = 'Выбрано: ' + Object.keys(sel).filter(function (k) { return sel[k]; }).length; };
      $('[data-q]', el).addEventListener('input', function () { $('[data-l]', el).innerHTML = list(this.value); });
      el.addEventListener('change', function (e) { var c = e.target.closest('[data-a]'); if (c) { sel[c.dataset.a] = c.checked; upd(); } });
      $('[data-go]', el).addEventListener('click', function () {
        var ids = Object.keys(sel).filter(function (k) { return sel[k]; }); if (!ids.length) return toast('Выберите агентов', 'err');
        var b = this; b.disabled = true;
        api('/api/deals/' + deal.id + '/rq', { method: 'POST', body: { agentIds: ids, subject: $('[data-s]', el).value, text: $('[data-t]', el).value, send: !!($('[data-send]', el) && $('[data-send]', el).checked) } }).then(function (r) {
          md.close(); toast('Запрос создан' + (r.sent ? ': письмом — ' + r.sent : '') + (r.manual ? ', вручную — ' + r.manual : ''));
          if (r.manual) copyText(r.request.subject + '\n\n' + r.request.text, false);
          load();
        }).catch(function (e) { b.disabled = false; toast(e.message, 'err'); });
      });
    }).catch(function (e) { toast(e.message, 'err'); });
  }
  function copyText(t, say) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { if (say !== false) toast('Текст запроса скопирован'); }).catch(function () {}); }

  function replyModal(rqId, itemId) {
    var reqs = V.requests, opts = [];
    reqs.forEach(function (q) { q.items.forEach(function (it) { opts.push('<option value="' + q.id + '|' + it.id + '"' + (it.id === itemId ? ' selected' : '') + '>' + esc(it.agent) + ' — ' + esc(q.id) + '</option>'); }); });
    var md = K.modal('Ответ агента', '<label class="cx-f"><span>Агент</span><select data-w>' + opts.join('') + '</select></label><label class="cx-f"><span>Текст ответа (из почты, WeChat, Telegram)</span><textarea data-t rows="10" placeholder="Вставьте ответ целиком — ставки, срок действия, кто прислал и вопросы найдутся сами"></textarea></label><label class="cx-f"><span>или файл КП агента — Excel, Word, текст</span><input type="file" data-f accept=".xlsx,.xlsm,.docx,.txt,.csv,.eml"></label>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Разобрать ответ</button>');
    var el = md.el;
    $('[data-go]', el).addEventListener('click', function () {
      var w = $('[data-w]', el).value.split('|'), t = $('[data-t]', el).value.trim(), f = $('[data-f]', el).files[0]; if (!t && !f) return toast('Вставьте текст ответа или выберите файл', 'err');
      var b = this; b.disabled = true; b.textContent = 'Разбираю…';
      var body = { itemId: w[1], text: t }; if (f) { body = new FormData(); body.append('itemId', w[1]); body.append('text', t); body.append('file', f); }
      api('/api/rq/' + w[0] + '/replies', { method: 'POST', body: body }).then(function (r) { md.close(); toast(r.rates.length ? 'Найдено ставок: ' + r.rates.length + ' — проверьте и подтвердите' : 'Ставок в ответе не нашлось — добавьте вручную', r.rates.length ? '' : 'err'); load(); })
        .catch(function (e) { b.disabled = false; b.textContent = 'Разобрать ответ'; toast(e.message, 'err'); });
    });
  }

  function manualModal() {
    var opts = V.requests.map(function (q) { return '<option value="' + q.id + '">' + esc(q.id) + ' · ' + K.d(q.createdAt) + '</option>'; }).join('');
    var md = K.modal('Ставка вручную', '<div class="cx-grid2"><label class="cx-f"><span>Агент</span><input data-k="agent"></label><label class="cx-f"><span>Запрос</span><select data-k="rqId">' + opts + '</select></label><label class="cx-f"><span>Сумма</span><input data-k="amount" type="number" step="any" min="0"></label><label class="cx-f"><span>Валюта</span><select data-k="currency"><option>USD</option><option>CNY</option><option>RUB</option><option>EUR</option></select></label><label class="cx-f"><span>За что</span><select data-k="unit"><option value="контейнер">контейнер</option><option value="кг">кг</option><option value="м³">м³</option><option value="машина">машина</option><option value="партия">партия</option></select></label><label class="cx-f"><span>Транзит</span><input data-k="transit" placeholder="25 дней"></label><label class="cx-f"><span>Действует до</span><input data-k="valid" placeholder="30.11.2026"></label><label class="cx-f"><span>Надбавка к курсу ЦБ, %</span><input data-k="fx" type="number" step="any" min="0" max="20" placeholder="0"></label><label class="cx-f wide"><span>Кто прислал (имя, почта, телефон)</span><input data-k="contact"></label></div>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Добавить</button>');
    $('[data-go]', md.el).addEventListener('click', function () { var b = {}; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); api('/api/rq/rates', { method: 'POST', body: b }).then(function () { md.close(); load(); }).catch(function (e) { toast(e.message, 'err'); }); });
  }

  function baseModal() {
    var md = K.modal('База агентов', '<div class="cx-bar"><div class="cx-search"><input type="search" data-q placeholder="Компания, контакт, вид транспорта" aria-label="Поиск агента"></div><label class="cx-btn ghost">Загрузить Excel<input type="file" accept=".xlsx,.xlsm,.csv" data-f hidden></label><button type="button" class="cx-btn primary" data-add>+ Агент</button></div><p class="cx-mut cx-small">Колонки файла: Компания, Виды транспорта, Email, Контакт, Телефон, Сайт, Примечание. Импорт обновляет совпадающие записи; похожие дубли не создаются. Общий справочник доступен для просмотра.</p><div data-l><p class="cx-load">Загружаю…</p></div>', '', { wide: true });
    var el = md.el, all = [];
    var draw2 = function (q) {
      q = String(q || '').toLowerCase();
      var l = all.filter(function (a) { return !q || (a.company + ' ' + a.contact + ' ' + a.email + ' ' + a.phone + ' ' + (a.transport || []).join(' ') + ' ' + (a.notes || '')).toLowerCase().indexOf(q) >= 0; });
      $('[data-l]', el).innerHTML = '<div class="cx-table cx-agents"><div class="cx-tr cx-thd"><span>Компания · ' + l.length + '</span><span>Транспорт</span><span class="lp">Контакт</span><span>Управление</span></div>' + l.slice(0, 400).map(function (a) {
        return '<div class="cx-tr"><span class="cx-t"><b>' + esc(a.company) + (a.own ? '' : ' <em class="cx-tag">справочник</em>') + '</b><small>' + esc(a.email || a.phone || '') + '</small></span><span class="cx-mut">' + esc((a.transport || []).join(', ') || (a.modes || []).map(function (m) { return MODE[m]; }).join(', ')) + '</span><span class="cx-mut lp">' + esc(a.contact || '') + '</span><span>' + (a.own ? '<button type="button" class="cx-ib" data-edit="' + esc(a.id) + '" title="Редактировать" aria-label="Редактировать агента">✎</button><button type="button" class="cx-ib" data-del="' + esc(a.id) + '" title="Удалить" aria-label="Удалить агента">✕</button>' : '—') + '</span></div>';
      }).join('') + '</div>';
    };
    var reload = function () { api('/api/crm/agents').then(function (r) { all = r.items || []; draw2($('[data-q]', el).value); }).catch(function (e) { toast(e.message, 'err'); }); };
    function editor(agent) {
      var edit = !!agent, title = edit ? 'Редактировать агента' : 'Новый агент';
      var fields = [['company', 'Компания'], ['contact', 'Контакт'], ['email', 'Email'], ['phone', 'Телефон / WeChat'], ['site', 'Сайт'], ['transport', 'Виды транспорта'], ['notes', 'Заметка']];
      var body = '<div class="cx-grid2">' + fields.map(function (f) {
        var val = f[0] === 'transport' ? (agent && (agent.transport || []).join(', ')) : agent && agent[f[0]] || '';
        return '<label class="cx-f"><span>' + f[1] + '</span><input data-k="' + f[0] + '" value="' + esc(val) + '"' + (f[0] === 'transport' ? ' placeholder="Авиа, ЖД, Авто, Море"' : '') + '></label>';
      }).join('') + '</div>';
      var m2 = K.modal(title, body, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>' + (edit ? 'Сохранить' : 'Добавить') + '</button>');
      $('[data-go]', m2.el).addEventListener('click', function () {
        var data = {}; $$('[data-k]', m2.el).forEach(function (i) { data[i.dataset.k] = i.value; });
        if (!String(data.company || '').trim()) return toast('Укажите компанию', 'err');
        api(edit ? '/api/crm/agents/' + encodeURIComponent(agent.id) : '/api/crm/agents', { method: edit ? 'PATCH' : 'POST', body: data })
          .then(function () { m2.close(); reload(); toast(edit ? 'Данные агента обновлены' : 'Агент добавлен'); })
          .catch(function (e) { toast(e.message, 'err'); });
      });
    }
    reload();
    $('[data-q]', el).addEventListener('input', function () { draw2(this.value); });
    $('[data-f]', el).addEventListener('change', function () {
      var f = this.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f);
      api('/api/crm/agents/import', { method: 'POST', body: fd }).then(function (r) { toast('Импорт: новых ' + r.added + ', обновлено ' + r.updated); reload(); }).catch(function (e) { toast(e.message, 'err'); }); this.value = '';
    });
    $('[data-add]', el).addEventListener('click', function () { editor(null); });
    el.addEventListener('click', function (e) {
      var edit = e.target.closest('[data-edit]');
      if (edit) { var item = all.find(function (a) { return a.own && String(a.id) === String(edit.dataset.edit); }); if (item) editor(item); return; }
      var del = e.target.closest('[data-del]'); if (!del) return;
      K.confirm('Удалить агента из вашей базы?').then(function (ok) { if (ok) api('/api/crm/agents/' + encodeURIComponent(del.dataset.del), { method: 'DELETE' }).then(reload).catch(function (x) { toast(x.message, 'err'); }); });
    });
  }

  /* «Ставка клиенту» — тексты по рабочим шаблонам: под контракт клиента (EXW / фрахт / авто / декларант) и под наш контракт (всё включено) */
  var MODE_UP = { auto: 'АВТО', road: 'АВТО', rail: 'ЖД', sea: 'МОРЕ', air: 'АВИА', multimodal: 'МОРЕ + ЖД' };
  var CUR_W = { CNY: 'юаней', USD: 'USD', EUR: 'евро', RUB: 'руб.' };
  function money(v) { return Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }); }
  function inDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('ru-RU'); }
  function clientText(kind, D) {
    var x = deal, best = D.rate, days = String((best && best.transit) || '').replace(/[^\d–-]/g, '') || '__', valid = (best && best.valid) || inDays(14) + ' г.';
    var who = String(x.contactName || '').split(' ')[0];
    if (kind === 'client') return ['Условия ' + (x.incoterms || 'EXW') + ':', (x.incoterms || 'EXW') + ' — ____ USD', 'Фрахт — ' + (best ? money(best.amount) + ' ' + best.currency : '____ USD'), (x.mode === 'auto' || x.mode === 'road' ? '' : 'Авто — ____ руб.'), 'Терминальные расходы — уже включены в стоимость', 'Услуги декларанта:', 'Под ваш ЭЦП – 25 000 рублей', 'Под печать брокера – 30 000 рублей', 'Транзитное время ' + days + ' дней. Ставка валидна – до ' + valid].filter(Boolean).join('\n');
    var c = D.calc, cur = (c && c.display_currency) || 'CNY', w = CUR_W[cur] || cur;
    return [(who ? who + ', добрый день' : 'Добрый день') + ', направляю Вам ставку!', '', 'Ставка (' + (MODE_UP[x.mode] || 'АВТО') + ')', x.cargo ? 'Груз: ' + x.cargo : '', x.weight ? 'Вес: ' + money(x.weight) + ' кг' : '', x.volume ? 'Объем: ' + String(x.volume).replace('.', ',') + ' м3' : '',
      'Условия поставки: ' + (x.incoterms || 'EXW') + ' ' + (x.from || '') + ' - ' + (x.to || 'Москва'), c ? 'Инвойс – ' + money(c.invoice_sum_display) + ' ' + w : 'Инвойс – ____',
      'Стоимость под наш контракт составит - ' + (c ? money(c.grand_total_display) + ' ' + w : '____') + ' (оплата инвойса уже входит в эту стоимость), в ставку включено:',
      '- инвойс', '- оплата инвойса (по коммерческому курсу банка)', '- фрахт + локальные расходы по Китаю', '- таможенные платежи', '- терминальные расходы', '- ДС (декларация соответствия)',
      'Дополнительные расходы (ИДК, взвешивание и т. д.) в ставку не включены, при их возникновении они оплачиваются по факту.', 'Транзитное время - ' + days + ' дней. Ставка валидна до ' + valid].filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
  }
  function clientModal() {
    var conf = V.rates.filter(function (t) { return t.status === 'confirmed'; }).sort(function (a, b) { return (a.usd || 1e12) - (b.usd || 1e12); });
    api('/api/calc?deal=' + encodeURIComponent(deal.id)).then(function (r) {
      var last = (r.items || []).filter(function (c) { return c.calc_type === 'our_contract'; })[0];
      return last ? api('/api/calc/' + last.id).then(function (o) { return o.result; }) : null;
    }).catch(function () { return null; }).then(function (calc) {
      var D = { rate: conf[0] || null, calc: calc }, kind = calc ? 'our' : 'client';
      var md = K.modal('Ставка клиенту', '<div class="cx-seg" data-k><button type="button" data-v="our"' + (kind === 'our' ? ' class="on"' : '') + '>Под наш контракт</button><button type="button" data-v="client"' + (kind === 'client' ? ' class="on"' : '') + '>Под контракт клиента</button></div>'
        + '<p class="cx-mut cx-small">' + (D.rate ? 'Фрахт и срок — из подтверждённой ставки ' + esc(D.rate.agent) + '.' : 'Подтверждённой ставки агента нет — впишите фрахт сами.') + (calc ? ' Инвойс и итог — из калькулятора ВЭД.' : ' Расчёта ВЭД нет — итог впишите сами.') + '</p>'
        + '<textarea data-t rows="16" class="cx-ctext"></textarea>', '<button type="button" class="cx-btn ghost" data-note>В ленту сделки</button>' + (deal.contactEmail ? '<button type="button" class="cx-btn ghost" data-mail>Отправить на ' + esc(deal.contactEmail) + '</button>' : '') + '<button type="button" class="cx-btn primary" data-copy>Скопировать</button>', { wide: true, noFocus: true });
      var ta = $('[data-t]', md.el); ta.value = clientText(kind, D);
      md.el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-k] [data-v]'); if (b) { $$('[data-k] button', md.el).forEach(function (z) { z.classList.toggle('on', z === b); }); ta.value = clientText(b.dataset.v, D); return; }
        if (e.target.closest('[data-copy]')) return copyText(ta.value);
        if (e.target.closest('[data-note]')) return api('/api/deals/' + deal.id + '/notes', { method: 'POST', body: { text: ta.value, type: 'rate' } }).then(function () { toast('Ставка сохранена в ленте сделки'); md.close(); }).catch(function (x) { toast(x.message, 'err'); });
        if (e.target.closest('[data-mail]')) return api('/api/mail/send', { method: 'POST', body: { to: deal.contactEmail, subject: 'Ставка: ' + (deal.cargo || deal.title || ''), text: ta.value, dealId: deal.id } }).then(function () { toast('Письмо отправлено'); md.close(); }).catch(function (x) { toast(x.message, 'err'); });
      });
    });
  }

  function onClick(e) {
    var b = e.target.closest('[data-r]'); if (!b || !box.contains(b) || b.disabled) return;
    var r = b.dataset.r, id = b.dataset.id;
    if (r === 'repmore') { var fm = b.previousElementSibling, cl = fm.classList.toggle('fm-clamp'); b.textContent = cl ? 'показать полностью' : 'свернуть'; return; }
    if (r === 'ask') return askModal();
    if (r === 'reply') return replyModal();
    if (r === 'reply1') return replyModal(b.dataset.rq, id);
    if (r === 'manual') return manualModal();
    if (r === 'base') return baseModal();
    if (r === 'client') return clientModal();
    if (r === 'copy') { var q = V.requests.find(function (x) { return x.id === id; }); return api('/api/deals/' + deal.id + '/rq/draft').then(function (d) { copyText((q && q.subject) || d.subject + '\n\n' + d.text); }); }
    if (r === 'delrq') return K.confirm('Удалить запрос вместе с ответами и ставками?').then(function (ok) { if (ok) api('/api/rq/' + id, { method: 'DELETE' }).then(load).catch(function (x) { toast(x.message, 'err'); }); });
    if (r === 'ok' || r === 'no' || r === 'back') return api('/api/rq/rates/' + id, { method: 'PATCH', body: { status: r === 'ok' ? 'confirmed' : r === 'no' ? 'rejected' : 'proposed' } }).then(load).catch(function (x) { toast(x.message, 'err'); });
    if (r === 'calc') return K.guard(b, function () { return api('/api/rq/rates/' + id + '/to-calc', { method: 'POST', body: {} }).then(function (x) {
      toast((x.created ? 'Создан расчёт контракта, фрахт записан: ' : 'Фрахт записан в расчёт: ') + fmt(x.freight) + ' ' + x.currency + (x.fx ? ', курс ЦБ +' + String(x.fx).replace('.', ',') + '%' : ''));
      if (window.IOMA_CRM && window.IOMA_CRM.showTab) window.IOMA_CRM.showTab('calc', x.calcId); else load();
    }).catch(function (x) { toast(x.message, 'err'); }); });
    if (r === 'opencalc') return window.IOMA_CRM && window.IOMA_CRM.showTab && window.IOMA_CRM.showTab('calc', id);
    if (r === 'fin') { var t = V.rates.find(function (x) { return x.id === id; }); var qty = (t && t.qty) || 1;
      return api('/api/rq/rates/' + id + '/finance', { method: 'POST', body: { qty: qty } }).then(function (x) { toast('Добавлено в расходы сделки' + (x.rateMissing ? ' — курс не найден, проверьте во вкладке «Финансы»' : '')); load(); }).catch(function (x) { toast(x.message, 'err'); }); }
    if (r === 'ans') return api('/api/rq/replies/' + id + '/answered', { method: 'POST' }).then(load).catch(function (x) { toast(x.message, 'err'); });
  }

  window.IOMA_RATES = {
    mount: function (el, d) { deal = d; if (box !== el) { box = el; el.addEventListener('click', onClick); } load(); }
  };
})();
