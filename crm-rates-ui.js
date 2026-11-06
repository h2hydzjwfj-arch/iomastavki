/* IOMASTAVKA — вкладка «Ставки» в сделке: запрос ставок агентам, ответы, ставки с подтверждением, ориентиры по прайсам, база агентов.
   Логика — как в модуле RQ West Asia CRM (rq_rates.js): ИИ предлагает ставку, менеджер подтверждает; лучшая — минимальная в USD внутри единицы. */
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

  function rateRow(t) {
    var acts = t.status === 'proposed' ? '<button type="button" class="cx-ib ok" data-r="ok" data-id="' + t.id + '" title="Подтвердить">✓</button><button type="button" class="cx-ib" data-r="no" data-id="' + t.id + '" title="Отклонить">✕</button>'
      : t.status === 'confirmed' ? (t.inFinance ? '<span class="cx-mut">в финансах</span>' : '<button type="button" class="cx-link" data-r="fin" data-id="' + t.id + '">в финансы</button>') : '<button type="button" class="cx-link" data-r="back" data-id="' + t.id + '">вернуть</button>';
    var more = [t.container, t.includes && 'включено: ' + t.includes, t.extras && 'доп.: ' + t.extras, t.valid && 'действует: ' + t.valid].filter(Boolean).join(' · ');
    return '<div class="cx-tr cx-rt ' + t.status + (t.best ? ' best' : '') + '"><span class="cx-t"><b>' + esc(t.agent) + (t.best ? ' <em class="cx-tag green">лучшая</em>' : '') + (t.status === 'proposed' ? ' <em class="cx-tag amb">' + (t.source === 'ai' ? 'ИИ' : 'авто') + ' — проверьте</em>' : '') + '</b>' + (more ? '<small>' + esc(more) + '</small>' : '') + (t.quote ? '<small class="cx-q">«' + esc(t.quote) + '»</small>' : '') + '</span>'
      + '<span><b>' + fmt(t.amount) + ' ' + esc(t.currency) + '</b>' + (t.unit ? '<small class="cx-mut"> / ' + esc(t.unit) + '</small>' : '') + '</span>'
      + '<span class="cx-mut lp">' + (t.usd != null && t.currency !== 'USD' ? '≈ $' + fmt(t.usd) : '') + '</span><span class="cx-mut lp">' + esc(t.transit || '') + '</span><span class="cx-racts">' + acts + '</span></div>';
  }

  function draw() {
    var r = V, rates = r.rates.slice().sort(function (a, b) { var o = { confirmed: 0, proposed: 1, rejected: 2 }; return (o[a.status] - o[b.status]) || ((a.usd || 1e12) - (b.usd || 1e12)); });
    var h = '<div class="cx-bar"><button type="button" class="cx-btn primary" data-r="ask">Запросить ставки</button><button type="button" class="cx-btn ghost" data-r="reply"' + (r.requests.length ? '' : ' disabled title="Сначала отправьте запрос"') + '>Вставить ответ агента</button><button type="button" class="cx-btn ghost" data-r="manual"' + (r.requests.length ? '' : ' disabled') + '>+ Ставка вручную</button><button type="button" class="cx-link" data-r="base">База агентов</button></div>';
    if (r.questions.length) h += '<div class="cx-qbox"><b>Агенты спрашивают</b>' + r.questions.map(function (q) { return '<div><span><b>' + esc(q.agent) + ':</b> ' + q.questions.map(esc).join(' · ') + '</span><button type="button" class="cx-link" data-r="ans" data-id="' + q.replyId + '">Ответили</button></div>'; }).join('') + '</div>';
    h += rates.length ? '<div class="cx-table cx-rates"><div class="cx-tr cx-thd"><span>Агент</span><span>Ставка</span><span class="lp">≈ USD</span><span class="lp">Транзит</span><span></span></div>' + rates.map(rateRow).join('') + '</div>'
      : r.requests.length ? '<p class="cx-empty">Ответов пока нет. Когда агент ответит — нажмите «Вставить ответ агента», ставку найдёт ИИ.</p>' : '';
    if (r.refs.length) h += '<section class="cx-refs"><h4>Ориентир по прайсам агентов</h4>' + r.refs.map(function (p) { return '<div class="cx-ref"><span><b>' + esc(p.agent) + '</b> <small class="cx-mut">' + esc(MODE[p.mode] || '') + ' · ' + esc(p.origin) + (p.dest ? ' → ' + esc(p.dest) : '') + (p.days ? ' · ' + esc(p.days) + ' дн.' : '') + '</small></span><span>' + fmt(p.perKg) + ' ₽/кг' + (p.min ? '<small class="cx-mut">, от ' + fmt(p.min) + ' ₽</small>' : '') + '</span><span>' + (p.est ? '<b>≈ ' + fmt(p.est) + ' ₽</b>' : '<small class="cx-mut">укажите вес</small>') + '</span>' + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" class="cx-link">сайт ↗</a>' : '<span></span>') + '</div>'; }).join('') + '<p class="cx-mut cx-small">Цены «от» с сайтов агентов; меняются в разделе «Тарифы».</p></section>';
    if (r.requests.length) h += '<details class="cx-rqs"><summary>Запросы · ' + r.requests.length + '</summary>' + r.requests.map(function (q) {
      return '<div class="cx-rq"><div class="cx-rqh"><b>' + esc(q.id) + '</b><span class="cx-mut">' + K.dt(q.createdAt) + ' · ' + esc(q.by || '') + '</span><button type="button" class="cx-link" data-r="copy" data-id="' + q.id + '">Скопировать текст</button><button type="button" class="cx-ib" data-r="delrq" data-id="' + q.id + '" title="Удалить запрос">✕</button></div><div class="cx-rqi">' + q.items.map(function (it) { var s = ST[it.status] || ['', '']; return '<button type="button" class="cx-chip2 ' + s[1] + '" data-r="reply1" data-rq="' + q.id + '" data-id="' + it.id + '" title="' + esc((it.email || it.phone || '') + (it.error ? ' — ' + it.error : '')) + '">' + esc(it.agent) + ' <small>' + s[0] + '</small></button>'; }).join('') + '</div></div>';
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
    var md = K.modal('Ответ агента', '<label class="cx-f"><span>Агент</span><select data-w>' + opts.join('') + '</select></label><label class="cx-f"><span>Текст ответа (из почты, WeChat, Telegram)</span><textarea data-t rows="10" placeholder="Вставьте ответ целиком — ставки и вопросы найдутся сами"></textarea></label>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Разобрать ответ</button>');
    var el = md.el;
    $('[data-go]', el).addEventListener('click', function () {
      var w = $('[data-w]', el).value.split('|'), t = $('[data-t]', el).value.trim(); if (!t) return toast('Вставьте текст ответа', 'err');
      var b = this; b.disabled = true; b.textContent = 'Разбираю…';
      api('/api/rq/' + w[0] + '/replies', { method: 'POST', body: { itemId: w[1], text: t } }).then(function (r) { md.close(); toast(r.rates.length ? 'Найдено ставок: ' + r.rates.length + ' — проверьте и подтвердите' : 'Ставок в ответе не нашлось — добавьте вручную', r.rates.length ? '' : 'err'); load(); })
        .catch(function (e) { b.disabled = false; b.textContent = 'Разобрать ответ'; toast(e.message, 'err'); });
    });
  }

  function manualModal() {
    var opts = V.requests.map(function (q) { return '<option value="' + q.id + '">' + esc(q.id) + ' · ' + K.d(q.createdAt) + '</option>'; }).join('');
    var md = K.modal('Ставка вручную', '<div class="cx-grid2"><label class="cx-f"><span>Агент</span><input data-k="agent"></label><label class="cx-f"><span>Запрос</span><select data-k="rqId">' + opts + '</select></label><label class="cx-f"><span>Сумма</span><input data-k="amount" type="number" step="any" min="0"></label><label class="cx-f"><span>Валюта</span><select data-k="currency"><option>USD</option><option>CNY</option><option>RUB</option><option>EUR</option></select></label><label class="cx-f"><span>За что</span><select data-k="unit"><option value="контейнер">контейнер</option><option value="кг">кг</option><option value="м³">м³</option><option value="машина">машина</option><option value="партия">партия</option></select></label><label class="cx-f"><span>Транзит</span><input data-k="transit" placeholder="25 дней"></label></div>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Добавить</button>');
    $('[data-go]', md.el).addEventListener('click', function () { var b = {}; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); api('/api/rq/rates', { method: 'POST', body: b }).then(function () { md.close(); load(); }).catch(function (e) { toast(e.message, 'err'); }); });
  }

  function baseModal() {
    var md = K.modal('База агентов', '<div class="cx-bar"><div class="cx-search"><input type="search" data-q placeholder="Компания, контакт, вид транспорта" aria-label="Поиск агента"></div><label class="cx-btn ghost">Загрузить Excel<input type="file" accept=".xlsx,.xlsm,.csv" data-f hidden></label><button type="button" class="cx-btn primary" data-add>+ Агент</button></div><p class="cx-mut cx-small">Колонки файла: Компания, Виды транспорта, Email, Контакт, Телефон. Ваша база закрыта — её видит только администратор; общий справочник «Экспедиторы» тоже здесь.</p><div data-l><p class="cx-load">Загружаю…</p></div>', '', { wide: true });
    var el = md.el, all = [];
    var draw2 = function (q) { q = String(q || '').toLowerCase(); var l = all.filter(function (a) { return !q || (a.company + ' ' + a.contact + ' ' + a.email + ' ' + (a.transport || []).join(' ')).toLowerCase().indexOf(q) >= 0; }); $('[data-l]', el).innerHTML = '<div class="cx-table cx-agents"><div class="cx-tr cx-thd"><span>Компания · ' + l.length + '</span><span>Транспорт</span><span class="lp">Контакт</span><span></span></div>' + l.slice(0, 400).map(function (a) { return '<div class="cx-tr"><span class="cx-t"><b>' + esc(a.company) + (a.own ? '' : ' <em class="cx-tag">справочник</em>') + '</b><small>' + esc(a.email || a.phone || '') + '</small></span><span class="cx-mut">' + esc((a.transport || []).join(', ') || (a.modes || []).map(function (m) { return MODE[m]; }).join(', ')) + '</span><span class="cx-mut lp">' + esc(a.contact || '') + '</span><span>' + (a.own ? '<button type="button" class="cx-ib" data-del="' + esc(a.id) + '" title="Удалить">✕</button>' : '') + '</span></div>'; }).join('') + '</div>'; };
    var reload = function () { api('/api/crm/agents').then(function (r) { all = r.items; draw2($('[data-q]', el).value); }).catch(function (e) { toast(e.message, 'err'); }); };
    reload();
    $('[data-q]', el).addEventListener('input', function () { draw2(this.value); });
    $('[data-f]', el).addEventListener('change', function () { var f = this.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f); api('/api/crm/agents/import', { method: 'POST', body: fd }).then(function (r) { toast('Загружено: новых ' + r.added + ', обновлено ' + r.updated); reload(); }).catch(function (e) { toast(e.message, 'err'); }); this.value = ''; });
    $('[data-add]', el).addEventListener('click', function () {
      var m2 = K.modal('Новый агент', '<div class="cx-grid2">' + [['company', 'Компания'], ['contact', 'Контакт'], ['email', 'Email'], ['phone', 'Телефон / WeChat'], ['transport', 'Виды транспорта'], ['notes', 'Заметка']].map(function (f) { return '<label class="cx-f"><span>' + f[1] + '</span><input data-k="' + f[0] + '"' + (f[0] === 'transport' ? ' placeholder="Авиа, ЖД, Авто, Море"' : '') + '></label>'; }).join('') + '</div>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-go>Добавить</button>');
      $('[data-go]', m2.el).addEventListener('click', function () { var b = {}; $$('[data-k]', m2.el).forEach(function (i) { b[i.dataset.k] = i.value; }); api('/api/crm/agents', { method: 'POST', body: b }).then(function () { m2.close(); reload(); }).catch(function (e) { toast(e.message, 'err'); }); });
    });
    el.addEventListener('click', function (e) { var d = e.target.closest('[data-del]'); if (!d) return; K.confirm('Удалить агента из вашей базы?').then(function (ok) { if (ok) api('/api/crm/agents/' + d.dataset.del, { method: 'DELETE' }).then(reload).catch(function (x) { toast(x.message, 'err'); }); }); });
  }

  function onClick(e) {
    var b = e.target.closest('[data-r]'); if (!b || !box.contains(b) || b.disabled) return;
    var r = b.dataset.r, id = b.dataset.id;
    if (r === 'ask') return askModal();
    if (r === 'reply') return replyModal();
    if (r === 'reply1') return replyModal(b.dataset.rq, id);
    if (r === 'manual') return manualModal();
    if (r === 'base') return baseModal();
    if (r === 'copy') { var q = V.requests.find(function (x) { return x.id === id; }); return api('/api/deals/' + deal.id + '/rq/draft').then(function (d) { copyText((q && q.subject) || d.subject + '\n\n' + d.text); }); }
    if (r === 'delrq') return K.confirm('Удалить запрос вместе с ответами и ставками?').then(function (ok) { if (ok) api('/api/rq/' + id, { method: 'DELETE' }).then(load).catch(function (x) { toast(x.message, 'err'); }); });
    if (r === 'ok' || r === 'no' || r === 'back') return api('/api/rq/rates/' + id, { method: 'PATCH', body: { status: r === 'ok' ? 'confirmed' : r === 'no' ? 'rejected' : 'proposed' } }).then(load).catch(function (x) { toast(x.message, 'err'); });
    if (r === 'fin') { var t = V.rates.find(function (x) { return x.id === id; }); var qty = t && t.unit && t.unit !== 'партия' && t.unit !== 'контейнер' && t.unit !== 'машина' ? (t.unit === 'кг' ? deal.weight : deal.volume) || 1 : 1;
      return api('/api/rq/rates/' + id + '/finance', { method: 'POST', body: { qty: qty } }).then(function (x) { toast('Добавлено в расходы сделки' + (x.rateMissing ? ' — курс не найден, проверьте во вкладке «Финансы»' : '')); load(); }).catch(function (x) { toast(x.message, 'err'); }); }
    if (r === 'ans') return api('/api/rq/replies/' + id + '/answered', { method: 'POST' }).then(load).catch(function (x) { toast(x.message, 'err'); });
  }

  window.IOMA_RATES = {
    mount: function (el, d) { deal = d; if (box !== el) { box = el; el.addEventListener('click', onClick); } load(); }
  };
})();
