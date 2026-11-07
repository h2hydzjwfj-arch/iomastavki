/* IOMASTAVKA — рабочее место: «Входящие» и «Сделки» (канбан, список, архив), карточка сделки
   (активность с закреплением, задачи, файлы с папками, калькулятор ВЭД, КП, финансы). Перенос deals.js / activity.js / files.js. */
(function () {
  'use strict';
  var K = window.CX; if (!K) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var CONTRACTS = ['Поставка', 'ТЭО', 'Поставка + ТЭО'], BROKERS = ['Наш брокер', 'Брокер клиента', 'Оба'], INCOTERMS = ['', 'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
  var CAT_CLS = { 'фрахт': 'pur', 'коммерческое': 'amb' };

  /* ======================= списки: Входящие и Сделки ======================= */
  var S = {
    inbox: { box: '#crmInbox', view: 'kanban', status: 'active', q: '', funnel: 'Входящие', category: '', manager: '', from: '', to: '', page: 1, sort: 'createdAt', dir: 'desc', sel: {} },
    deals: { box: '#crmList', view: 'table', status: 'active', q: '', funnel: '', category: '', manager: '', from: '', to: '', page: 1, sort: 'createdAt', dir: 'desc', sel: {} },
  };
  var gen = 0, qT = null;
  function catBadge(c) { return c && c !== 'заявка' ? '<em class="cx-tag ' + (CAT_CLS[c] || '') + '">' + esc(c) + '</em>' : ''; }
  function barHtml(kind) {
    var s = S[kind], m = K.META || {}, inbox = kind === 'inbox';
    var funnels = (m.funnels || []).filter(function (f) { return f !== m.incoming; });
    var statusL = inbox ? { active: 'Активные', deleted: 'Архив' } : { active: 'Активные', won: 'Завершённые', closed: 'Закрытые', deleted: 'Архив' };
    var flt = s.manager || s.from || s.to || s.category;
    return '<div class="cx-bar">'
      + '<div class="cx-search"><input type="search" data-x="q" value="' + esc(s.q) + '" placeholder="' + (inbox ? 'Поиск по заявкам' : 'Поиск: клиент, груз, телефон, №') + '" aria-label="Поиск"></div>'
      + '<div class="cx-seg" role="group" aria-label="Вид"><button type="button" class="' + (s.view === 'table' ? 'on' : '') + '" data-x="view" data-v2="table">Список</button><button type="button" class="' + (s.view === 'kanban' ? 'on' : '') + '" data-x="view" data-v2="kanban">Канбан</button></div>'
      + '<select class="cx-sel" data-x="statussel" aria-label="Какие показать">' + Object.keys(statusL).map(function (k) { return '<option value="' + k + '"' + (s.status === k ? ' selected' : '') + '>' + statusL[k] + '</option>'; }).join('') + '</select>'
      + '<button type="button" class="cx-btn ghost' + (flt ? ' act' : '') + '" data-x="filters">Фильтр' + (flt ? ' •' : '') + '</button>'
      + '<button type="button" class="cx-btn primary" data-x="new">+ ' + (inbox ? 'Заявка' : 'Сделка') + '</button>'
      + (inbox ? '' : '<div class="cx-funnels" role="group" aria-label="Воронка">' + (funnels.length < 2 ? '' : '<button type="button" class="chip' + (!s.funnel ? ' on' : '') + '" data-x="funnel" data-v2="">Все</button>' + funnels.map(function (f) { return '<button type="button" class="chip' + (s.funnel === f ? ' on' : '') + '" data-x="funnel" data-v2="' + esc(f) + '">' + esc(f) + '</button>'; }).join('')) + '<label class="cx-link cx-imp" title="Загрузить сделки из Excel или CSV">Импорт из Excel<input type="file" accept=".xlsx,.csv" data-x="import" hidden></label></div>')
      + '</div>';
  }
  function query(kind, extra) {
    var s = S[kind], p = { status: s.status === 'deleted' ? 'deleted' : s.status, q: s.q, manager: s.manager, from: s.from, to: s.to, category: s.category };
    if (kind === 'inbox') p.funnel = 'Входящие'; else if (s.funnel) p.funnel = s.funnel; else { p.notFunnel = 'Входящие'; if (s.q) p.searchAll = '1'; }
    if (s.view === 'table' || s.status === 'deleted') { p.page = s.page; p.per = 50; p.sort = s.sort; p.dir = s.dir; }
    for (var k in extra || {}) p[k] = extra[k];
    return '/api/deals?' + Object.keys(p).filter(function (k) { return p[k]; }).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
  }
  function render(kind) {
    var s = S[kind], box = $(s.box); if (!box) return; var my = ++gen;
    K.meta().then(function (m) {
      if (!box.querySelector('.cx-bar')) { box.innerHTML = barHtml(kind) + '<div class="cx-body"></div>'; bindBar(kind, box); }
      var body = $('.cx-body', box); body.classList.add('loading');
      return api(query(kind)).then(function (r) {
        if (my !== gen) return; body.classList.remove('loading');
        if (s.status === 'deleted') return archive(kind, body, r);
        if (s.view === 'kanban') return kanban(kind, body, r.items, m);
        table(kind, body, r);
      });
    }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  function rebar(kind) { var box = $(S[kind].box); if (!box) return; var b = $('.cx-bar', box), h = $(':scope > .cx-hint', box), body = $('.cx-body', box); if (!b || !body) return; var tmp = document.createElement('div'); tmp.innerHTML = barHtml(kind); if (h) h.remove(); b.remove(); while (tmp.firstChild) box.insertBefore(tmp.firstChild, body); }
  function bindBar(kind, box) {
    box.addEventListener('input', function (e) { if (e.target.dataset.x !== 'q') return; clearTimeout(qT); var v = e.target.value; qT = setTimeout(function () { S[kind].q = v; S[kind].page = 1; render(kind); }, 280); });
    box.addEventListener('change', function (e) {
      if (e.target.dataset.x === 'import') { var f = e.target.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f); e.target.value = ''; toast('Импортирую…');
        api('/api/deals/import', { method: 'POST', body: fd }).then(function (r) { toast('Импортировано сделок: ' + r.added + (r.skipped ? ', пропущено: ' + r.skipped : '')); K.meta(true); render(kind); }).catch(function (x) { toast(x.message, 'err'); }); }
      if (e.target.dataset.x === 'statussel') { var st = S[kind]; st.status = e.target.value; st.page = 1; st.sel = {}; rebar(kind); render(kind); return; }
      if (e.target.dataset.x === 'selall') { var on = e.target.checked; $$('[data-x=sel]', box).forEach(function (c) { c.checked = on; S[kind].sel[c.dataset.id] = on; }); bulkBar(kind); }
      if (e.target.dataset.x === 'sel') { S[kind].sel[e.target.dataset.id] = e.target.checked; bulkBar(kind); }
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.x === 'open' && e.target.tagName !== 'BUTTON') openDeal(e.target.dataset.id, kind); });
    box.addEventListener('click', function (e) {
      var t = e.target.closest('[data-x]'); if (!t || !box.contains(t)) return; var s = S[kind], x = t.dataset.x;
      if (x === 'view') { s.view = t.dataset.v2; s.page = 1; rebar(kind); render(kind); }
      else if (x === 'status') { s.status = t.dataset.v2; s.page = 1; s.sel = {}; rebar(kind); render(kind); }
      else if (x === 'funnel') { s.funnel = t.dataset.v2; s.page = 1; rebar(kind); render(kind); }
      else if (x === 'filters') filters(kind);
      else if (x === 'new') newDeal(kind === 'inbox' ? 'Входящие' : (s.funnel || ''));
      else if (x === 'open') { if (e.target.closest('input,label.cx-cb')) return; openDeal(t.dataset.id, kind); }
      else if (x === 'sort') { s.sort === t.dataset.v2 ? (s.dir = s.dir === 'asc' ? 'desc' : 'asc') : (s.sort = t.dataset.v2, s.dir = 'asc'); render(kind); }
      else if (x === 'page') { s.page = +t.dataset.v2; render(kind); }
      else if (x === 'restore') api('/api/deals/' + t.dataset.id + '/restore', { method: 'POST' }).then(function () { toast('Восстановлено'); render(kind); K.badges(); });
      else if (x === 'purge') K.confirm('Удалить навсегда без возможности восстановления? Удалятся файлы, задачи, расчёты, финансы и история.', 'Удалить навсегда', true).then(function (ok) { if (ok) api('/api/deals/' + t.dataset.id + '/permanent', { method: 'DELETE' }).then(function () { render(kind); }); });
      else if (x === 'bulk-mgr') { var mg = $('[data-x=bulkmgr]', box).value; if (!mg) return toast('Выберите ответственного'); bulk(kind, { manager: mg }); }
      else if (x === 'bulk-del') K.confirm('Перенести выбранные сделки в архив?', 'В архив', true).then(function (ok) { if (ok) bulk(kind, null, true); });
    });
  }
  function bulk(kind, patch, del) {
    var ids = Object.keys(S[kind].sel).filter(function (k) { return S[kind].sel[k]; });
    Promise.all(ids.map(function (id) { return del ? api('/api/deals/' + id, { method: 'DELETE' }) : api('/api/deals/' + id, { method: 'PATCH', body: patch }); })).then(function () { S[kind].sel = {}; toast('Готово: ' + ids.length); render(kind); K.badges(); }).catch(function (e) { toast(e.message, 'err'); });
  }
  function bulkBar(kind) { var box = $(S[kind].box), n = Object.keys(S[kind].sel).filter(function (k) { return S[kind].sel[k]; }).length, b = $('.cx-bulk', box); if (!b) return; b.hidden = !n; $('b', b).textContent = 'Выбрано: ' + n; }
  function filters(kind) {
    var s = S[kind], m = K.META;
    var html = '<div class="cx-grid2"><label class="cx-f"><span>Ответственный</span><select data-k="manager"><option value="">Все</option><option value="—"' + (s.manager === '—' ? ' selected' : '') + '>Без ответственного</option>' + (m.managers || []).map(function (x) { return '<option' + (x === s.manager ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label>'
      + (kind === 'inbox' ? '<label class="cx-f"><span>Категория</span><select data-k="category"><option value="">Все</option>' + (m.categories || []).map(function (c) { return '<option' + (c === s.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' : '<span></span>')
      + '<label class="cx-f"><span>Создана с</span><input type="date" data-k="from" value="' + esc(s.from) + '"></label><label class="cx-f"><span>по</span><input type="date" data-k="to" value="' + esc(s.to) + '"></label></div>';
    var md = K.modal('Фильтр', html, '<button type="button" class="cx-btn ghost" data-reset2>Сбросить</button><button type="button" class="cx-btn primary" data-ok>Применить</button>');
    $('[data-ok]', md.el).addEventListener('click', function () { $$('[data-k]', md.el).forEach(function (i) { s[i.dataset.k] = i.value; }); s.page = 1; md.close(); rebar(kind); render(kind); });
    $('[data-reset2]', md.el).addEventListener('click', function () { s.manager = s.from = s.to = s.category = ''; md.close(); rebar(kind); render(kind); });
  }
  function card(x) {
    return '<button type="button" class="cx-kc" draggable="true" data-x="open" data-id="' + esc(x.id) + '"><span class="cx-kt"><b>' + esc(x.title || x.number) + '</b>' + catBadge(x.category) + '</span>'
      + '<span class="cx-kcl">' + esc(x.clientName || 'Клиент не указан') + '</span>'
      + '<span class="cx-kbt"><span>' + (x.manager ? esc(x.manager) : '<i>без ответственного</i>') + '</span><span>' + (x.tasksOverdue ? '<em class="cx-dot red" title="Есть просроченные задачи"></em>' : '') + K.d(x.createdAt) + '</span></span>'
      + (x.margin ? '<span class="cx-km' + (x.margin < 0 ? ' neg' : '') + '">' + K.money(x.margin, 'RUB') + '</span>' : '') + '</button>';
  }
  function kanban(kind, body, items, m) {
    var s = S[kind], stages;
    if (kind === 'inbox') stages = m.pipelines[m.incoming];
    else if (s.funnel) stages = m.pipelines[s.funnel] || [];
    else { stages = []; Object.keys(m.pipelines).forEach(function (f) { if (f !== m.incoming) m.pipelines[f].forEach(function (st) { if (stages.indexOf(st) < 0) stages.push(st); }); }); }
    var split = kind === 'inbox' && !s.category, by = {}, extra = { 'фрахт': [], 'коммерческое': [] };
    stages.forEach(function (st) { by[st] = []; });
    items.forEach(function (x) { if (split && extra[x.category]) return extra[x.category].push(x); (by[x.stage] = by[x.stage] || []).push(x); });
    var cols = Object.keys(by).map(function (st) { var l = by[st]; return '<section class="cx-kcol" data-stage="' + esc(st) + '"><header><b>' + esc(st) + '</b><small>' + l.length + ' ' + K.plural(l.length, 'сделка', 'сделки', 'сделок') + (l.some(function (x) { return x.margin; }) ? ' · ' + K.money(l.reduce(function (a, x) { return a + (x.margin || 0); }, 0), 'RUB') : '') + '</small></header><i class="cx-kbar ' + K.stageCls(st) + '"></i><div class="cx-kbody">' + (l.map(card).join('') || '<p class="cx-empty">Пусто</p>') + '</div></section>'; }).join('');
    if (split) cols += [['фрахт', 'Фрахт', 'pur'], ['коммерческое', 'Коммерческое', 'amb']].map(function (c) { var l = extra[c[0]]; return '<section class="cx-kcol cx-kx"><header><b>' + c[1] + '</b><small>' + l.length + ' · предложения</small></header><i class="cx-kbar ' + c[2] + '"></i><div class="cx-kbody">' + (l.map(card).join('') || '<p class="cx-empty">Пусто</p>') + '</div></section>'; }).join('');
    body.innerHTML = '<div class="cx-board">' + cols + '</div>';
    // перетаскивание карточки в другую колонку = смена этапа; доска двигается мышью
    var board = $('.cx-board', body), dragId = null;
    $$('.cx-kc', board).forEach(function (c) { c.addEventListener('dragstart', function (e) { dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (er) {} }); c.addEventListener('dragend', function () { c.classList.remove('drag'); $$('.cx-kcol.over', board).forEach(function (k) { k.classList.remove('over'); }); }); });
    $$('.cx-kcol[data-stage]', board).forEach(function (col) {
      col.addEventListener('dragover', function (e) { if (!dragId) return; e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', function (e) { e.preventDefault(); col.classList.remove('over'); var id = dragId; dragId = null; if (!id) return; api('/api/deals/' + id, { method: 'PATCH', body: { stage: col.dataset.stage } }).then(function () { render(kind); }).catch(function (er) { toast(er.message, 'err'); }); });
    });
    board.addEventListener('mousedown', function (e) { if (e.button !== 0 || e.target.closest('.cx-kc')) return; pan = { el: board, x: e.clientX, l: board.scrollLeft }; board.classList.add('pan'); });
  }
  var pan = null;
  window.addEventListener('mousemove', function (e) { if (pan) pan.el.scrollLeft = pan.l - (e.clientX - pan.x); });
  window.addEventListener('mouseup', function () { if (pan) { pan.el.classList.remove('pan'); pan = null; } });
  function th(kind, label, key) { var s = S[kind]; return key ? '<button type="button" class="cx-th" data-x="sort" data-v2="' + key + '">' + label + (s.sort === key ? (s.dir === 'asc' ? ' ↑' : ' ↓') : '') + '</button>' : '<span>' + label + '</span>'; }
  function pager(kind, total) { var s = S[kind], pages = Math.ceil(total / 50); if (pages < 2) return ''; var out = []; for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - s.page) < 3) out.push(i); else if (out[out.length - 1] !== '…') out.push('…'); return '<nav class="cx-pager">' + out.map(function (p) { return p === '…' ? '<span>…</span>' : '<button type="button" class="' + (p === s.page ? 'on' : '') + '" data-x="page" data-v2="' + p + '">' + p + '</button>'; }).join('') + '</nav>'; }
  function table(kind, body, r) {
    var m = K.META, s = S[kind], inbox = kind === 'inbox';
    if (!r.items.length) { body.innerHTML = '<div class="k v3p-empty"><b>' + (s.q ? 'Ничего не найдено' : inbox ? 'Новых заявок нет' : 'Сделок пока нет') + '</b><small>' + (inbox ? 'Заявки с сайта и заявки по документам появятся здесь сами.' : 'Создайте сделку или перенесите заявку из «Входящих».') + '</small></div>'; return; }
    body.innerHTML = '<div class="cx-bulk" hidden><b></b><select data-x="bulkmgr" aria-label="Ответственный">' + K.mgrOptions('', true, 'Назначить ответственного…') + '</select><button type="button" class="cx-btn" data-x="bulk-mgr">Назначить</button><button type="button" class="cx-btn danger" data-x="bulk-del">В архив</button></div>'
      + '<div class="cx-table cx-deals"><div class="cx-tr cx-thd"><label class="cx-cb"><input type="checkbox" data-x="selall" aria-label="Выбрать все"></label>' + th(kind, 'Сделка', 'title') + th(kind, 'Этап', 'stage') + '<span class="lp">Ответственный</span>' + th(kind, 'Создана', 'createdAt') + '</div>'
      + r.items.map(function (x) {
        var sub = [x.clientName && x.clientName !== x.title ? esc(x.clientName) : '', '№ ' + esc(x.number || ''), x.status !== 'active' ? ({ won: 'завершена', closed: 'закрыта', deleted: 'в архиве' }[x.status]) : '', x.funnel === m.incoming && !inbox ? 'входящие' : ''].filter(Boolean).join(' · ');
        return '<div class="cx-tr" role="button" tabindex="0" data-x="open" data-id="' + esc(x.id) + '"><label class="cx-cb"><input type="checkbox" data-x="sel" data-id="' + esc(x.id) + '"' + (s.sel[x.id] ? ' checked' : '') + ' aria-label="Выбрать"></label>'
          + '<span class="cx-t"><b>' + esc(x.title || x.number) + (inbox ? ' ' + catBadge(x.category) : '') + '</b><small>' + sub + '</small></span>'
          + '<span class="cx-stg">' + K.stageBadge(x.stage) + K.ageDot(x.daysInStage) + '</span><span class="cx-mut lp">' + esc(x.manager || '—') + '</span><span class="cx-mut">' + K.d(x.createdAt) + (x.tasksOverdue ? ' <em class="cx-dot red" title="Есть просроченные задачи"></em>' : '') + '</span></div>';
      }).join('') + '</div>' + pager(kind, r.total) + (r.total > 50 ? '<p class="cx-total">Всего: ' + r.total + '</p>' : '');
    bulkBar(kind);
  }
  function archive(kind, body, r) {
    body.innerHTML = r.items.length ? '<div class="cx-table cx-arch"><div class="cx-tr cx-thd"><span>Название</span><span>Клиент</span><span>Этап</span><span>Ответственный</span><span>В архиве с</span><span></span></div>' + r.items.map(function (x) {
      return '<div class="cx-tr"><span class="cx-t"><b>' + esc(x.title) + '</b><small>№ ' + esc(x.number) + '</small></span><span>' + esc(x.clientName || '—') + '</span><span>' + K.stageBadge(x.stage) + '</span><span class="cx-mut">' + esc(x.manager || '—') + '</span><span class="cx-mut">' + K.dt(x.deletedAt) + '</span><span class="cx-acts"><button type="button" class="cx-btn sm" data-x="restore" data-id="' + esc(x.id) + '">Восстановить</button><button type="button" class="cx-btn sm danger" data-x="purge" data-id="' + esc(x.id) + '">Удалить навсегда</button></span></div>';
    }).join('') + '</div>' + pager(kind, r.total) : '<div class="k v3p-empty"><b>Архив пуст</b><small>Сюда попадают удалённые сделки — их можно восстановить.</small></div>';
  }
  function newDeal(funnel) {
    K.meta().then(function (m) {
      var funnels = m.funnels.map(function (f) { return '<option' + (f === (funnel || m.funnels[1] || m.incoming) ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('');
      var html = '<div class="cx-grid2"><label class="cx-f wide"><span>Название сделки *</span><input name="title" placeholder="Например: Электроника из Шанхая для ООО Ромашка" autofocus></label>'
        + '<label class="cx-f"><span>Контакт</span><input name="contactName"></label><label class="cx-f"><span>Компания</span><input name="company"></label>'
        + '<label class="cx-f"><span>Телефон / Telegram</span><input name="contactPhone"></label><label class="cx-f"><span>Email</span><input name="contactEmail" type="email"></label>'
        + '<label class="cx-f"><span>Воронка</span><select name="funnel">' + funnels + '</select></label><label class="cx-f"><span>Ответственный</span><select name="manager">' + K.mgrOptions('', true) + '</select></label>'
        + '<label class="cx-f"><span>Источник</span><select name="source">' + m.sources.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select></label><label class="cx-f"><span>Тип перевозки</span><select name="mode"><option value="">—</option>' + Object.keys(m.modes).map(function (k) { return '<option value="' + k + '">' + m.modes[k] + '</option>'; }).join('') + '</select></label>'
        + '<label class="cx-f"><span>Тип договора</span><select name="contractType"><option value="">—</option>' + CONTRACTS.map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select></label><label class="cx-f"><span>Брокер</span><select name="broker"><option value="">—</option>' + BROKERS.map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select></label>'
        + '<label class="cx-f"><span>Откуда</span><input name="from"></label><label class="cx-f"><span>Куда</span><input name="to"></label>'
        + '<label class="cx-f"><span>Груз</span><input name="cargo" placeholder="Название товара"></label><div class="cx-grid2 in"><label class="cx-f"><span>Вес, кг</span><input name="weight" type="number" step="any" min="0"></label><label class="cx-f"><span>Объём, м³</span><input name="volume" type="number" step="any" min="0"></label></div>'
        + '<label class="cx-f wide"><span>Комментарий</span><textarea name="note" rows="2"></textarea></label></div>';
      var md = K.modal(funnel === m.incoming ? 'Новая заявка' : 'Новая сделка', html, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Создать</button>', { wide: true });
      $('[data-ok]', md.el).addEventListener('click', function () { var b = {}; $$('[name]', md.el).forEach(function (i) { b[i.name] = i.value; }); if (!b.title.trim()) return toast('Введите название сделки', 'err');
        K.guard(this, function () { return api('/api/deals', { method: 'POST', body: b }).then(function (r) { md.close(); K.meta(true); K.badges(); openDeal(r.item.id, b.funnel === m.incoming ? 'inbox' : 'deals'); }); }); });
    });
  }

  /* ======================= карточка сделки ======================= */
  var cur = null, back = 'deals', dGen = 0, lastTab = 'act', pinMode = {};
  function openDeal(id, from) {
    if (from) back = from; var my = ++dGen; var box = K.page('crmDeal'); if (!box) return;
    if (!cur || cur.item.id !== id) { box.innerHTML = '<p class="cx-load">Загружаю сделку…</p>'; lastTab = 'act'; }
    return K.meta().then(function (m) { return api('/api/deals/' + encodeURIComponent(id)).then(function (r) { if (my !== dGen) return; cur = r; renderDeal(box, r, m); }); }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  function reload() { return cur ? openDeal(cur.item.id) : Promise.resolve(); }
  function sel(name, val, opts, cls) { if (val && !opts.some(function (o) { return (Array.isArray(o) ? o[0] : o) === val; })) opts = opts.concat(val); return '<select name="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : (o || '—'); return '<option value="' + esc(v) + '"' + (String(v) === String(val || '') ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>'; }
  function cf(label, inner) { return '<label class="cx-cf"><span>' + label + '</span>' + inner + '</label>'; }
  function renderDeal(box, r, m) {
    var x = r.item, c = r.client, st = r.stages || m.pipelines[x.funnel] || [], closed = x.status !== 'active';
    var tel = String(x.contactPhone || ''), telHref = /^@/.test(tel) ? 'https://t.me/' + encodeURIComponent(tel.slice(1)) : tel.replace(/[^\d+]/g, '').length >= 7 ? 'tel:' + tel.replace(/[^\d+]/g, '') : '';
    var stageOpts = st.concat(closed ? [x.stage] : []); var modes = [['', '—']].concat(Object.keys(m.modes).map(function (k) { return [k, m.modes[k]]; }));
    var side = '<button type="button" class="cx-back" data-y="back">← Назад ' + (back === 'inbox' ? 'к входящим' : back === 'tasks' ? 'к задачам' : back === 'clients' ? 'к клиентам' : 'к сделкам') + '</button>'
      + '<div class="cx-dh"><input class="cx-dname" name="title" form="cxDealForm" value="' + esc(x.title || '') + '" placeholder="Название сделки…" aria-label="Название сделки">'
      + '<small>№ ' + esc(x.number) + ' · создана ' + K.dt(x.createdAt) + (x.source ? ' · <em class="crm-src">' + esc(x.source) + '</em>' : '') + catBadge(x.category) + '</small>'
      + (closed ? '<div class="cx-closed ' + x.status + '"><b>' + ({ won: '✓ Сделка завершена успешно', closed: 'Сделка закрыта', deleted: 'Сделка в архиве' }[x.status]) + '</b>' + (x.closeReason ? '<span>Причина: ' + esc(x.closeReason) + (x.closeComment ? ' — ' + esc(x.closeComment) : '') + '</span>' : '') + '<button type="button" class="cx-btn sm" data-y="' + (x.status === 'deleted' ? 'restore' : 'reopen') + '">' + (x.status === 'deleted' ? 'Восстановить' : 'Вернуть в работу') + '</button></div>'
        : '<div class="cx-pill ' + K.stageCls(x.stage) + '"><i></i>' + sel('stage', x.stage, stageOpts, 'cx-stagesel') + '</div>')
      + '<label class="cx-mgr"><span>Ответственный</span>' + sel('manager', x.manager, [['', '— не назначен —']].concat((m.managers || []).map(function (v) { return [v, v]; })), 'cx-mgrsel') + '</label>'
      + (x.daysInStage != null && !closed ? '<small class="cx-age-l">' + K.ageDot(x.daysInStage) + ' на этапе</small>' : '') + '</div>'
      + (c ? '<div class="cx-client"><button type="button" class="cx-cl-main" data-y="client" data-id="' + esc(c.id) + '"><span class="cx-ava">' + esc(K.initials(c.contact || c.company)) + '</span><span><b>' + esc(c.company || c.contact) + '</b><small>' + esc(c.company && c.contact ? c.contact : 'Клиент') + (c.deals > 1 ? ' · сделок: ' + c.deals : '') + '</small></span></button><button type="button" class="cx-link cx-change" data-y="linkclient">сменить</button>'
        + (c.phone ? '<a href="' + esc(/^@/.test(c.phone) ? 'https://t.me/' + c.phone.slice(1) : 'tel:' + c.phone.replace(/[^\d+]/g, '')) + '" target="_blank" rel="noopener">📞 ' + esc(c.phone) + '</a>' : '') + (c.email ? '<a href="mailto:' + esc(c.email) + '">✉️ ' + esc(c.email) + '</a>' : '') + (c.email ? '<button type="button" class="cx-link" data-y="mail">Написать письмо →</button>' : '') + '</div>'
        : '<button type="button" class="cx-client-empty" data-y="linkclient">+ Привязать клиента</button>')
      + '<form class="cx-cfs" id="cxDealForm" autocomplete="off">'
      + (x.funnel === m.incoming ? cf('Перенести в', sel('funnel', x.funnel, m.funnels)) : '')
      + cf('Груз', '<input name="cargo" value="' + esc(x.cargo || '') + '" placeholder="не указано">')
      + '<div class="cx-pair">' + cf('Вес, кг', '<input name="weight" type="number" step="any" min="0" value="' + esc(x.weight == null ? '' : x.weight) + '">') + cf('Объём, м³', '<input name="volume" type="number" step="any" min="0" value="' + esc(x.volume == null ? '' : x.volume) + '">') + '</div>'
      + '<div class="cx-pair">' + cf('Откуда', '<input name="from" value="' + esc(x.from || '') + '">') + cf('Куда', '<input name="to" value="' + esc(x.to || '') + '">') + '</div>'
      + cf('Перевозка', sel('mode', x.mode, modes))
      + '<details class="cx-more"><summary>Подробнее</summary>'
      + (x.funnel !== m.incoming ? cf('Воронка', sel('funnel', x.funnel, m.funnels)) : '') + cf('Источник', sel('source', x.source, m.sources))
      + (x.funnel === m.incoming ? cf('Категория', sel('category', x.category || 'заявка', m.categories)) : '')
      + cf('Инкотермс', sel('incoterms', x.incoterms, INCOTERMS)) + cf('Тип договора', sel('contractType', x.contractType, [''].concat(CONTRACTS))) + cf('Брокер', sel('broker', x.broker, [''].concat(BROKERS)))
      + cf('Документы', '<input name="documents" value="' + esc(x.documents || '') + '" placeholder="Коносамент, CMR…">')
      + '<div class="cx-pair">' + cf('Сумма сделки', '<input name="amount" type="number" step="any" min="0" value="' + esc(x.amount == null ? '' : x.amount) + '">') + cf('Валюта', sel('currency', x.currency || 'USD', ['USD', 'CNY', 'RUB', 'EUR'])) + '</div>'
      + '<p class="cx-sub2">Контакт из заявки</p>' + cf('Контакт', '<input name="contactName" value="' + esc(x.contactName || '') + '">') + cf('Компания', '<input name="company" value="' + esc(x.company || '') + '">') + cf('Телефон', '<input name="contactPhone" value="' + esc(tel) + '">' + (telHref ? '<a class="cx-call" href="' + esc(telHref) + '" target="_blank" rel="noopener" title="Позвонить / написать">↗</a>' : '')) + cf('Email', '<input name="contactEmail" value="' + esc(x.contactEmail || '') + '">')
      + '</details>'
      + '<div class="cx-dacts">' + (closed ? '' : '<button type="button" class="cx-btn danger" data-y="close">Закрыть сделку</button><button type="button" class="cx-btn ok" data-y="won">✓ Успешно</button>') + '<button type="submit" class="cx-btn primary">Сохранить</button></div>'
      + (x.status !== 'deleted' ? '<button type="button" class="cx-link danger" data-y="archive">🗑 Перенести в архив</button>' : '') + '</form>';
    var acts = x.activity || [], tasks = r.tasks || [];
    var main = '<div class="cx-dtabs" role="tablist">' + [['act', 'Активность (' + acts.filter(function (a) { return !a.internal; }).length + ')'], ['tasks', 'Задачи (' + tasks.length + ')'], ['rates', 'Ставки'], ['files', 'Файлы (' + (x.files || []).length + ')'], ['calc', 'Калькулятор ВЭД' + (r.calcs.length ? ' (' + r.calcs.length + ')' : '')], ['kp', 'КП (' + r.quotes.length + ')'], ['fin', 'Финансы']].map(function (t) { return '<button type="button" class="chip' + (lastTab === t[0] ? ' on' : '') + '" data-y="tab" data-t="' + t[0] + '">' + t[1].replace(/ \((\d+)\)$/, function (_, n) { return n === '0' ? '' : ' <small>' + n + '</small>'; }) + '</button>'; }).join('') + '</div>'
      + '<div class="cx-dpane" data-dp="act"></div><div class="cx-dpane" data-dp="tasks" hidden></div><div class="cx-dpane" data-dp="rates" hidden></div><div class="cx-dpane" data-dp="files" hidden></div><div class="cx-dpane" data-dp="calc" hidden></div><div class="cx-dpane" data-dp="kp" hidden></div><div class="cx-dpane" data-dp="fin" hidden></div>';
    box.innerHTML = '<div class="cx-deal"><aside class="cx-dside k">' + side + '</aside><div class="cx-dmain k">' + main + '</div></div>';
    bindDeal(box);
    showTab(lastTab);
  }
  function showTab(t, openId) {
    var box = $('#crmDeal'); lastTab = t;
    $$('.cx-dtabs .chip', box).forEach(function (c) { c.classList.toggle('on', c.dataset.t === t); });
    $$('.cx-dpane', box).forEach(function (p) { p.hidden = p.dataset.dp !== t; });
    var p = $('.cx-dpane[data-dp="' + t + '"]', box);
    if (t === 'act') actPane(p); if (t === 'tasks') tasksPane(p); if (t === 'files') filesPane(p); if (t === 'kp') kpPane(p); if (t === 'fin') finPane(p); if (t === 'rates' && window.IOMA_RATES) window.IOMA_RATES.mount(p, cur.item);
    if (t === 'calc' && window.IOMA_CALC) window.IOMA_CALC.mount(p, { dealId: cur.item.id, onChange: function () {}, openId: openId || '' });
  }
  function bindDeal(box) {
    var form = $('#cxDealForm', box);
    form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    var withForm = function (o) { var b = formBody(); for (var k in o) b[k] = o[k]; return b; };
    var ss = $('.cx-stagesel', box); if (ss) ss.addEventListener('change', function () { patch(withForm({ stage: ss.value })).then(maybeCloseTasks); });
    $('.cx-mgrsel', box).addEventListener('change', function () { patch(withForm({ manager: this.value })); });
    $('[name=funnel]', form).addEventListener('change', function () { var v = this.value; var b = withForm({ funnel: v }); delete b.stage; patch(b).then(function () { if (v !== 'Входящие' && back === 'inbox') toast('Сделка перенесена в воронку «' + v + '»'); }); });
    var nm = $('.cx-dname', box); nm.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); nm.blur(); } }); nm.addEventListener('change', function () { if (nm.value.trim()) patch({ title: nm.value.trim() }); });
    box.onclick = function (e) {
      var t = e.target.closest('[data-y]'); if (!t || !box.contains(t)) return; var y = t.dataset.y, id = cur.item.id;
      if (y === 'back') { K.show(back); return; }
      if (y === 'tab') return showTab(t.dataset.t);
      if (y === 'close') return closeDeal();
      if (y === 'won') return K.confirm('Отметить сделку успешной?', 'Да, успешно').then(function (ok) { if (ok) patch({ status: 'won' }).then(maybeCloseTasks); });
      if (y === 'reopen') return patch({ status: 'active' });
      if (y === 'restore') return api('/api/deals/' + id + '/restore', { method: 'POST' }).then(reload);
      if (y === 'archive') return K.confirm('Перенести сделку в архив? Её можно будет восстановить.', 'В архив', true).then(function (ok) { if (ok) api('/api/deals/' + id, { method: 'DELETE' }).then(function () { K.badges(); K.show(back); }); });
      if (y === 'linkclient') return linkClient();
      if (y === 'client' && window.IOMA_CLIENTS) return window.IOMA_CLIENTS.open(t.dataset.id, reload);
      if (y === 'mail') return mailTo();
    };
  }
  function formBody() { var b = {}; $$('#cxDealForm [name]').forEach(function (i) { if (i.closest('form') && i.name !== 'stage' && i.name !== 'manager') b[i.name] = i.value; }); var n = $('#crmDeal .cx-dname'); if (n) b.title = n.value; return b; }
  function save() { return patch(formBody()).then(function () { toast('Сохранено'); }); }
  function patch(b) { return api('/api/deals/' + encodeURIComponent(cur.item.id), { method: 'PATCH', body: b }).then(function () { K.meta(true); K.badges(); return reload(); }).catch(function (e) { toast(e.message, 'err'); }); }
  function maybeCloseTasks() {
    if (!cur || cur.item.status === 'active') return; var open = (cur.tasks || []).filter(function (t) { return t.status !== 'done'; }); if (!open.length) return;
    K.confirm('Закрыть все ' + open.length + ' ' + K.plural(open.length, 'задачу', 'задачи', 'задач') + ' по сделке?', 'Закрыть').then(function (ok) { if (ok) api('/api/tasks/bulk', { method: 'POST', body: { ids: open.map(function (t) { return t.id; }), status: 'done' } }).then(function () { K.badges(); reload(); }); });
  }
  function closeDeal() {
    var rs = (K.META.closeReasons || []).map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
    var md = K.modal('Закрыть сделку', '<label class="cx-f"><span>Причина закрытия</span><select data-r>' + rs + '</select></label><label class="cx-f"><span>Комментарий</span><textarea data-c rows="3" placeholder="Обязательно при «Другое»"></textarea></label>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn danger" data-ok>Закрыть сделку</button>');
    $('[data-ok]', md.el).addEventListener('click', function () { var r = $('[data-r]', md.el).value, c = $('[data-c]', md.el).value.trim(); if (r === 'Другое' && !c) return toast('Напишите комментарий', 'err'); md.close(); patch({ status: 'closed', closeReason: r, closeComment: c }).then(maybeCloseTasks); });
  }
  function linkClient() {
    var md = K.modal('Привязать клиента', '<label class="cx-f"><span>Поиск клиента</span><input data-q placeholder="Компания, контакт, телефон, ИНН, почта…"></label><div class="cx-lc" data-res></div><button type="button" class="cx-link" data-new>+ Создать нового клиента из данных сделки</button>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button>' + (cur.item.crmClientId ? '<button type="button" class="cx-btn danger" data-unlink>Отвязать</button>' : ''));
    var t = null, res = $('[data-res]', md.el);
    $('[data-q]', md.el).addEventListener('input', function () { var q = this.value.trim(); clearTimeout(t); t = setTimeout(function () { if (!q) { res.innerHTML = ''; return; } api('/api/crm/clients?q=' + encodeURIComponent(q)).then(function (r) { res.innerHTML = r.items.slice(0, 12).map(function (c) { return '<button type="button" data-cid="' + esc(c.id) + '"><b>' + esc(c.company || c.contact) + '</b><small>' + esc([c.company ? c.contact : '', c.phone, c.email, c.inn ? 'ИНН ' + c.inn : ''].filter(Boolean).join(' · ')) + '</small></button>'; }).join('') || '<p class="cx-mut">Ничего не найдено</p>'; }); }, 250); });
    res.addEventListener('click', function (e) { var b = e.target.closest('[data-cid]'); if (!b) return; md.close(); patch({ crmClientId: b.dataset.cid }); });
    $('[data-new]', md.el).addEventListener('click', function () { var x = cur.item; api('/api/crm/clients', { method: 'POST', body: { company: x.company || '', contact: x.contactName || x.title, phone: x.contactPhone || '', email: x.contactEmail || '', manager: x.manager || '' } }).then(function (r) { md.close(); patch({ crmClientId: r.id }); }).catch(function (e) { toast(e.message, 'err'); }); });
    var u = $('[data-unlink]', md.el); if (u) u.addEventListener('click', function () { md.close(); patch({ crmClientId: '' }); });
  }
  function mailTo() {
    var c = cur.client, x = cur.item;
    var md = K.modal('Письмо клиенту', '<label class="cx-f"><span>Кому</span><input data-to value="' + esc(c ? c.email : x.contactEmail || '') + '"></label><label class="cx-f"><span>Тема</span><input data-s value="' + esc(x.title + ' · №' + x.number) + '"></label><label class="cx-f"><span>Текст</span><textarea data-t rows="8">' + esc('Добрый день' + (c && c.contact ? ', ' + c.contact.split(' ')[0] : '') + '!\n\n') + '</textarea></label><p class="cx-hint">Письмо уйдёт с адреса из настроек отправки (Resend или SMTP) и сохранится в ленте сделки.</p>', '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Отправить</button>', { wide: true });
    $('[data-ok]', md.el).addEventListener('click', function () { var b = this; K.guard(b, function () { return api('/api/mail/send', { method: 'POST', body: { to: $('[data-to]', md.el).value, subject: $('[data-s]', md.el).value, text: $('[data-t]', md.el).value, dealId: x.id } }).then(function () { toast('Письмо отправлено'); md.close(); reload(); }); }); });
  }

  /* ---------- вкладка «Активность»: закреплённые, лента с историей полей и выполненными задачами, открытые задачи, добавление ---------- */
  var CLAMP = 400;
  function actItem(a, dealId) {
    var L = K.META.labels || {}, T = K.META.actTypes || {};
    if (a.type === 'field') return '<div class="cx-hist" data-aid="' + esc(a.id) + '"><time>' + K.hm(a.at) + '</time> ' + esc(a.by || '') + ' · поле «<b>' + esc(L[a.field] || a.field) + '</b>»: ' + (a.from ? '<s>' + esc(a.from) + '</s> → ' : '') + '<b>' + esc(a.to || '—') + '</b><button type="button" class="cx-ib" data-z="del" title="Удалить запись истории">✕</button></div>';
    var raw = String(a.text || ''), long = raw.length > CLAMP;
    var body = a.type === 'file' && a.fileId ? '📎 <a href="/api/deals/' + esc(dealId) + '/files/' + esc(a.fileId) + '" target="_blank" rel="noopener">' + esc(raw.replace(/^Добавлен файл:\s*/, '')) + '</a>'
      : long ? '<span class="cx-short">' + esc(raw.slice(0, CLAMP)) + '…</span><span class="cx-full" hidden>' + esc(raw) + '</span>' : esc(raw);
    return '<article class="cx-act t-' + esc(a.type) + (a.pinned ? ' pinned' : '') + '" data-aid="' + esc(a.id) + '"><span class="cx-ai">' + (K.ICON[a.type] || '📝') + '</span><div class="cx-ab"><header><b>' + esc(T[a.type] || 'Запись') + '</b><small>' + (a.pinned ? K.d(a.at) + ' ' : '') + K.hm(a.at) + ' · ' + esc(a.by || '') + (a.editedAt ? ' · изм.' : '') + '</small>'
      + (a.type !== 'file' ? '<button type="button" class="cx-ib" data-z="edit" title="Изменить">✎</button><button type="button" class="cx-ib' + (a.pinned ? ' on' : '') + '" data-z="pin" title="' + (a.pinned ? 'Открепить' : 'Закрепить') + '">📌</button>' : '') + '<button type="button" class="cx-ib danger" data-z="del" title="Удалить">✕</button></header>'
      + '<div class="cx-at">' + body + '</div>' + (long ? '<button type="button" class="cx-more" data-z="more">показать полностью</button>' : '') + '</div></article>';
  }
  function taskDone(t) { return '<div class="cx-tdone" data-tid="' + esc(t.id) + '"><span>✓</span><div><small>' + K.hm(t.doneAt || t.updatedAt) + ' для ' + esc(t.manager || '—') + '</small><b>' + esc(t.type || 'Задача') + (t.desc ? ': ' + esc(t.desc) : '') + '</b>' + (t.comment ? '<p>' + esc(t.comment) + '</p>' : '') + '</div></div>'; }
  function pinTask(t) {
    var td = K.today(), over = t.deadline && t.deadline < td, open = !!pinMode[t.id];
    var label = (t.deadline === td ? 'Сегодня' : t.deadline ? K.d(t.deadline) : 'Без срока') + (t.time ? ', ' + t.time : '');
    var types = (K.META.taskTypes || []).slice(); if (t.type && types.indexOf(t.type) < 0) types.push(t.type);
    return '<div class="cx-pin' + (over ? ' over' : '') + (open ? ' open' : '') + '" data-tid="' + esc(t.id) + '"><button type="button" class="cx-pinhead" data-z="ptoggle"><small>' + label + ' для ' + esc(t.manager || '—') + (over ? ' · просрочено' : '') + '</small><span><b>' + esc(t.type || 'Задача') + '</b>' + (t.desc ? ': ' + esc(t.desc) : '') + '</span></button>'
      + (open ? '<div class="cx-pinedit"><input type="date" data-p="deadline" value="' + esc(t.deadline || '') + '"><input type="time" data-p="time" value="' + esc(t.time || '') + '"><select data-p="manager">' + K.mgrOptions(t.manager, true) + '</select><select data-p="type">' + types.map(function (v) { return '<option' + (v === t.type ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select><input data-p="desc" value="' + esc(t.desc || '') + '" placeholder="Текст задачи"></div>'
        + '<div class="cx-pinres"><input data-p="comment" placeholder="Результат (что сделано)"><button type="button" class="cx-btn primary sm" data-z="pdone">Выполнить</button></div>'
        + '<div class="cx-pinq"><button type="button" data-z="pmove" data-days="1">завтра</button><button type="button" data-z="pmove" data-days="7">через неделю</button><button type="button" data-z="pmove" data-days="30">через месяц</button><button type="button" class="cx-btn sm" data-z="psave">Сохранить изменения</button><button type="button" class="cx-link danger" data-z="pdel">Удалить</button></div>' : '') + '</div>';
  }
  function actPane(p) {
    var x = cur.item, acts = (x.activity || []).filter(function (a) { return !a.internal; }), tasks = cur.tasks || [];
    var pinned = acts.filter(function (a) { return a.pinned; });
    var items = acts.filter(function (a) { return !a.pinned; }).map(function (a) { return { at: a.at, h: actItem(a, x.id) }; }).concat(tasks.filter(function (t) { return t.status === 'done'; }).map(function (t) { return { at: t.doneAt || t.updatedAt || t.createdAt, h: taskDone(t) }; })).sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    var last = '', feed = items.map(function (i) { var day = K.d(i.at), h = ''; if (day !== last) { h = '<div class="cx-day">' + day + '</div>'; last = day; } return h + i.h; }).join('') || '<p class="cx-empty">Пока пусто</p>';
    var open = tasks.filter(function (t) { return t.status !== 'done'; }).sort(function (a, b) { return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')); });
    var kinds = [['note', '📝 Комментарий'], ['call', '📞 Звонок'], ['meet', '🤝 Встреча'], ['tg', '✈️ Telegram'], ['wa', '💬 WhatsApp'], ['mail', '✉️ Email'], ['rate', '💲 Ставка'], ['task', '✅ Задача']];
    p.innerHTML = (pinned.length ? '<div class="cx-pinned">' + pinned.map(function (a) { return actItem(a, x.id); }).join('') + '</div>' : '')
      + '<div class="cx-feed" tabindex="0" aria-label="Лента активности">' + feed + '</div>'
      + '<div class="cx-pins">' + open.map(pinTask).join('') + '</div>'
      + '<form class="cx-add" data-add><div class="cx-addrow"><select data-a="type" aria-label="Тип записи">' + kinds.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + '</option>'; }).join('') + '</select>'
      + '<span class="cx-taskf" hidden><select data-a="manager" aria-label="Ответственный">' + K.mgrOptions(x.manager, true, 'Ответственный —') + '</select><select data-a="ttype" aria-label="Тип задачи">' + (K.META.taskTypes || []).map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select><input type="date" data-a="deadline" value="' + K.today() + '" aria-label="Срок"><input type="time" data-a="time" aria-label="Время"></span></div>'
      + '<textarea data-a="text" rows="3" placeholder="Текст заметки, итоги звонка, ставка агента… Можно перетащить сюда файлы"></textarea><div class="cx-addf"><small>Файлы можно бросить прямо в ленту — они сохранятся во вкладке «Файлы».</small><button type="submit" class="cx-btn primary">Добавить</button></div></form>';
    var feedEl = $('.cx-feed', p); requestAnimationFrame(function () { feedEl.scrollTop = feedEl.scrollHeight; });
    var form = $('[data-add]', p), typeSel = $('[data-a=type]', form);
    typeSel.addEventListener('change', function () { var task = typeSel.value === 'task'; $('.cx-taskf', form).hidden = !task; $('[data-a=text]', form).placeholder = task ? 'Описание задачи…' : 'Текст заметки, итоги звонка, ставка агента…'; $('[type=submit]', form).textContent = task ? 'Поставить задачу' : 'Добавить'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var g = function (k) { return $('[data-a=' + k + ']', form).value; }, text = g('text').trim(), btn = $('[type=submit]', form);
      if (g('type') === 'task') { if (!text) return toast('Введите описание задачи', 'err'); return K.guard(btn, function () { return api('/api/tasks', { method: 'POST', body: { dealId: x.id, type: g('ttype'), desc: text, manager: g('manager'), deadline: g('deadline'), time: g('time') } }).then(function () { K.badges(); return reload(); }); }); }
      if (!text) return toast('Введите текст', 'err');
      K.guard(btn, function () { return api('/api/deals/' + x.id + '/notes', { method: 'POST', body: { type: g('type'), text: text } }).then(reload); });
    });
    K.dropzone(p, function (files) { toast('Загружаю файлы…'); K.upload('/api/deals/' + x.id + '/files', files).then(function (n) { if (n) toast('Добавлено файлов: ' + n); reload(); }); });
    p.onclick = function (e) {
      var b = e.target.closest('[data-z]'); if (!b) return; var z = b.dataset.z, art = b.closest('[data-aid]'), pin = b.closest('[data-tid]');
      if (z === 'more') { var full = $('.cx-full', art), short = $('.cx-short', art), op = full.hidden; full.hidden = !op; short.hidden = op; b.textContent = op ? 'свернуть' : 'показать полностью'; return; }
      if (art) { var aid = art.dataset.aid, a = (cur.item.activity || []).find(function (v) { return v.id === aid; }); var url = '/api/deals/' + x.id + '/notes/' + aid;
        if (z === 'pin') return api(url, { method: 'PATCH', body: { pinned: !a.pinned } }).then(reload);
        if (z === 'del') return K.confirm('Удалить запись?', 'Удалить', true).then(function (ok) { if (ok) api(url, { method: 'DELETE' }).then(reload); });
        if (z === 'edit') return editAct(art, a, url);
      }
      if (pin) { var tid = pin.dataset.tid, turl = '/api/tasks/' + tid, val = function (k) { var el = $('[data-p=' + k + ']', pin); return el ? el.value : undefined; };
        if (z === 'ptoggle') { var was = !!pinMode[tid]; pinMode = {}; if (!was) pinMode[tid] = 1; return actPane(p); }
        if (z === 'pdone') return api(turl, { method: 'PATCH', body: { status: 'done', comment: val('comment') } }).then(function () { pinMode = {}; K.badges(); reload(); });
        if (z === 'pmove') return api(turl, { method: 'PATCH', body: { deadline: K.today(+b.dataset.days) } }).then(function () { pinMode = {}; K.badges(); reload(); });
        if (z === 'psave') return api(turl, { method: 'PATCH', body: { deadline: val('deadline'), time: val('time'), manager: val('manager'), type: val('type'), desc: val('desc') } }).then(function () { pinMode = {}; K.badges(); reload(); });
        if (z === 'pdel') return K.confirm('Удалить задачу?', 'Удалить', true).then(function (ok) { if (ok) api(turl, { method: 'DELETE' }).then(function () { pinMode = {}; K.badges(); reload(); }); });
      }
    };
  }
  function editAct(art, a, url) {
    var box = $('.cx-at', art); if ($('textarea', box)) return; var more = $('.cx-more', art); if (more) more.hidden = true;
    var lines = String(a.text || '').split('\n').length;
    box.innerHTML = '<textarea class="cx-edit" style="height:' + Math.min(520, Math.max(110, lines * 22 + 30)) + 'px">' + esc(a.text || '') + '</textarea><div class="cx-editb"><button type="button" class="cx-btn primary sm" data-e="save">Сохранить</button><button type="button" class="cx-link" data-e="cancel">Отменить</button></div>';
    var ta = $('textarea', box); ta.focus();
    function done(saveIt) { document.removeEventListener('mousedown', outside, true); if (!saveIt) return reload(); var v = ta.value.trim(); if (!v) return ta.focus(); api(url, { method: 'PATCH', body: { text: v } }).then(reload).catch(function (e) { toast(e.message, 'err'); }); }
    function outside(e) { if (!art.contains(e.target)) done(true); }
    document.addEventListener('mousedown', outside, true);
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-e]'); if (b) done(b.dataset.e === 'save'); });
  }
  function tasksPane(p) {
    var tasks = cur.tasks || [], td = K.today();
    p.innerHTML = '<div class="cx-tlist">' + (tasks.map(function (t) { var over = t.status !== 'done' && t.deadline && t.deadline < td;
      return '<div class="cx-titem' + (t.status === 'done' ? ' done' : '') + '" data-tid="' + esc(t.id) + '"><button type="button" class="cx-check' + (t.status === 'done' ? ' on' : '') + '" data-z="tgl" aria-label="' + (t.status === 'done' ? 'Вернуть в работу' : 'Выполнить') + '">' + (t.status === 'done' ? '✓' : '') + '</button><button type="button" class="cx-tb" data-z="topen"><small>' + esc(t.type || 'Задача') + '</small><b>' + esc(t.desc || '—') + '</b><span class="' + (over ? 'over' : '') + '">До: ' + (t.deadline ? K.d(t.deadline) : 'без срока') + (t.time ? ' ' + t.time : '') + ' · ' + esc(t.manager || '—') + (t.comment ? ' · ' + esc(t.comment) : '') + '</span></button></div>'; }).join('') || '<p class="cx-empty">Задач по сделке нет</p>') + '</div><button type="button" class="cx-btn primary" data-z="tnew">+ Задача</button>';
    p.onclick = function (e) { var b = e.target.closest('[data-z]'); if (!b) return; var it = b.closest('[data-tid]'), t = it && tasks.find(function (v) { return v.id === it.dataset.tid; });
      if (b.dataset.z === 'tgl') api('/api/tasks/' + t.id, { method: 'PATCH', body: { status: t.status === 'done' ? 'open' : 'done' } }).then(function () { K.badges(); reload(); });
      if (b.dataset.z === 'topen' && window.IOMA_TASKS) window.IOMA_TASKS.detail(t, reload);
      if (b.dataset.z === 'tnew' && window.IOMA_TASKS) window.IOMA_TASKS.create({ dealId: cur.item.id, manager: cur.item.manager }, reload); };
  }

  /* ---------- вкладка «Файлы»: папки, перетаскивание, переименование, архив папки ---------- */
  var expanded = {};
  function filesPane(p) {
    var x = cur.item, files = x.files || [], folders = x.folders || [];
    function level(parent, depth) {
      var fo = folders.filter(function (f) { return (f.parentId || '') === (parent || ''); }), fi = files.filter(function (f) { return (f.folderId || '') === (parent || ''); });
      return fo.map(function (f) { var open = expanded[f.id], n = files.filter(function (v) { return v.folderId === f.id; }).length;
        return '<div class="cx-fnode"><div class="cx-fi folder" draggable="true" data-kind="folder" data-fid="' + esc(f.id) + '" style="--dp:' + depth + '"><button type="button" class="cx-fbtn" data-w="toggle">' + (open ? '▾' : '▸') + ' 📁</button><b data-w="toggle">' + esc(f.name) + '</b><small>' + n + ' ' + K.plural(n, 'файл', 'файла', 'файлов') + '</small><span class="cx-facts"><a class="cx-ib" href="/api/deals/' + esc(x.id) + '/folders/' + esc(f.id) + '/zip" title="Скачать папку (zip)">⇩</a><button type="button" class="cx-ib" data-w="rename" title="Переименовать">✎</button><button type="button" class="cx-ib danger" data-w="del" title="Удалить папку">✕</button></span></div>' + (open ? level(f.id, depth + 1) || '<p class="cx-empty" style="--dp:' + (depth + 1) + '">Пусто</p>' : '') + '</div>'; }).join('')
        + fi.map(function (f) { return '<div class="cx-fi" draggable="true" data-kind="file" data-fid="' + esc(f.id) + '" style="--dp:' + depth + '"><span class="cx-ficon">' + K.fileIcon(f.name) + '</span><a href="/api/deals/' + esc(x.id) + '/files/' + esc(f.id) + '" target="_blank" rel="noopener"><b>' + esc(f.name) + '</b><small>' + K.size(f.size) + ' · ' + K.dt(f.at) + '</small></a><span class="cx-facts"><a class="cx-ib" href="/api/deals/' + esc(x.id) + '/files/' + esc(f.id) + '?dl=1" title="Скачать">⇩</a><button type="button" class="cx-ib" data-w="rename" title="Переименовать">✎</button><button type="button" class="cx-ib danger" data-w="del" title="Удалить">✕</button></span></div>'; }).join('');
    }
    p.innerHTML = '<div class="cx-ftool"><button type="button" class="cx-btn" data-w="mkdir">📁 Новая папка</button></div><label class="cx-drop" data-w="drop"><input type="file" multiple hidden data-w="pick"><b>📎 Перетащите файлы сюда или нажмите для выбора</b><small>PDF, Word, Excel, фото, архивы. Файл можно перетащить прямо на папку.</small></label>'
      + '<div class="cx-ftree" data-w="root">' + (level('', 0) || '<p class="cx-empty">Файлов пока нет</p>') + '</div>';
    var base = '/api/deals/' + x.id;
    $('[data-w=pick]', p).addEventListener('change', function () { var fl = this.files; K.upload(base + '/files', fl).then(reload); });
    K.dropzone($('[data-w=drop]', p), function (fl) { K.upload(base + '/files', fl).then(reload); });
    p.onclick = function (e) {
      var b = e.target.closest('[data-w]'); if (!b) return; var w = b.dataset.w, row = b.closest('[data-fid]'), id = row && row.dataset.fid, isF = row && row.dataset.kind === 'folder';
      if (w === 'mkdir') return K.prompt('Новая папка', 'Название папки').then(function (nm) { if (nm) api(base + '/folders', { method: 'POST', body: { name: nm } }).then(reload); });
      if (w === 'toggle') { expanded[id] = !expanded[id]; return filesPane(p); }
      if (w === 'rename') { var obj = (isF ? folders : files).find(function (v) { return v.id === id; }); return K.prompt(isF ? 'Переименовать папку' : 'Переименовать файл', 'Новое название', obj.name).then(function (nm) { if (nm && nm !== obj.name) api(base + (isF ? '/folders/' : '/files/') + id, { method: 'PATCH', body: { name: nm } }).then(reload).catch(function (er) { toast(er.message, 'err'); }); }); }
      if (w === 'del') return K.confirm(isF ? 'Удалить папку вместе со всем содержимым?' : 'Удалить файл?', 'Удалить', true).then(function (ok) { if (ok) api(base + (isF ? '/folders/' : '/files/') + id, { method: 'DELETE' }).then(reload); });
    };
    // перетаскивание: файл/папка на папку — перенос; файлы с компьютера на папку — загрузка в неё; в пустое место дерева — в корень
    var drag = null;
    $$('.cx-fi', p).forEach(function (el) {
      el.addEventListener('dragstart', function (e) { drag = { kind: el.dataset.kind, id: el.dataset.fid }; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/x-ioma', drag.id); } catch (er) {} e.stopPropagation(); });
      el.addEventListener('dragend', function () { el.classList.remove('drag'); drag = null; $$('.cx-fi.target', p).forEach(function (v) { v.classList.remove('target'); }); });
      if (el.dataset.kind !== 'folder') return;
      el.addEventListener('dragover', function (e) { var ext = e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; if (!ext && (!drag || drag.id === el.dataset.fid)) return; e.preventDefault(); e.stopPropagation(); el.classList.add('target'); });
      el.addEventListener('dragleave', function () { el.classList.remove('target'); });
      el.addEventListener('drop', function (e) { e.preventDefault(); e.stopPropagation(); el.classList.remove('target'); var fid = el.dataset.fid;
        if (e.dataTransfer.files && e.dataTransfer.files.length) { expanded[fid] = 1; return K.upload(base + '/files', e.dataTransfer.files, { folder_id: fid }).then(reload); }
        if (!drag) return; var body = drag.kind === 'file' ? { folderId: fid } : { parentId: fid }; api(base + (drag.kind === 'file' ? '/files/' : '/folders/') + drag.id, { method: 'PATCH', body: body }).then(function () { expanded[fid] = 1; reload(); }).catch(function (er) { toast(er.message, 'err'); }); });
    });
    var root = $('[data-w=root]', p);
    root.addEventListener('dragover', function (e) { if (drag) e.preventDefault(); });
    root.addEventListener('drop', function (e) { if (!drag || e.target.closest('.cx-fi.folder')) return; e.preventDefault(); var body = drag.kind === 'file' ? { folderId: '' } : { parentId: '' }; api(base + (drag.kind === 'file' ? '/files/' : '/folders/') + drag.id, { method: 'PATCH', body: body }).then(reload); });
  }
  function kpPane(p) {
    var q = cur.quotes || [], x = cur.item;
    p.innerHTML = (q.length ? '<div class="cx-kps">' + q.map(function (k) { return '<a class="cx-kp" href="/#kp=' + esc(k.id) + '" target="_blank" rel="noopener"><span>📄</span><b>' + esc(k.number) + ' · ' + K.money(k.price, k.currency) + '</b><small>' + esc(k.basis || '') + ' · ' + K.d(k.createdAt) + '</small></a>'; }).join('') + '</div>' : '<p class="cx-empty">КП по этой сделке пока нет. Откройте калькулятор ставок, посчитайте и нажмите «Создать КП» — оно привяжется к сделке.</p>')
      + '<p class="cx-mut">Маршрут: ' + esc(x.from || '—') + ' → ' + esc(x.to || '—') + (x.weight ? ', ' + K.num(x.weight) + ' кг' : '') + (x.volume ? ', ' + K.num(x.volume) + ' м³' : '') + '</p><button type="button" class="cx-btn primary" data-kq>Посчитать доставку и создать КП →</button>';
    $('[data-kq]', p).addEventListener('click', function () { var v = function (id, val) { var el = document.getElementById(id); if (el && val != null && val !== '') { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      v('fromCity', x.from); v('toCity', x.to); v('weight', x.weight); window.__crmDeal = x.id; window.__iomaOpenView && window.__iomaOpenView('calculator'); setTimeout(function () { window.__v3calc && window.__v3calc(); }, 200); });
  }

  /* ---------- вкладка «Финансы»: статьи расходов и приходов, валюта по курсу ЦБ, сохранение при уходе с поля ---------- */
  var FIN = null, finDirty = false, finRates = null;
  function finPane(p) {
    p.innerHTML = '<p class="cx-load">Загружаю финансы…</p>';
    Promise.all([api('/api/deals/' + cur.item.id + '/finance'), finRates ? Promise.resolve(finRates) : api('/api/ved/rates').catch(function () { return { rates: {} }; })]).then(function (rr) { FIN = rr[0]; finRates = rr[1]; finDraw(p); }).catch(function (e) { p.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  function finRow(it, i) {
    var f = it.currency !== 'RUB';
    return '<div class="cx-frow' + (f ? ' fx' : '') + '" data-i="' + i + '"><input class="cx-flabel" data-g="label" value="' + esc(it.label) + '" placeholder="Название статьи"><span class="cx-famt"><input type="number" step="0.01" data-g="amount" value="' + (f ? (it.amount_orig || '') : (it.amount || '')) + '" placeholder="0" inputmode="decimal"><select data-g="currency">' + K.curOptions(it.currency) + '</select></span><button type="button" class="cx-ib danger" data-g="del" title="Удалить статью">✕</button>'
      + (f ? '<small class="cx-fhint">≈ ' + K.money(it.amount, 'RUB') + ' по курсу ЦБ ' + (it.rate ? K.num(it.rate) : '— нет курса') + (it.rateDate ? ' на ' + esc(it.rateDate) : '') + '</small>' : '') + '</div>';
  }
  function finTotals() {
    var inc = 0, exp = 0; FIN.items.forEach(function (it) { it.amount = it.currency === 'RUB' ? +it.amount || 0 : Math.round((+it.amount_orig || 0) * (+it.rate || 0) * 100) / 100; if (it.kind === 'income') inc += it.amount; else exp += it.amount; });
    var m = inc - exp, pc = inc ? Math.round(m / inc * 1000) / 10 : 0;
    return '<div class="cx-fres ' + (m < 0 ? 'neg' : '') + '"><span>Приходы <b>' + K.money(inc, 'RUB') + '</b></span><span>Расходы <b>' + K.money(exp, 'RUB') + '</b></span><span class="cx-fm">Финансы: <b>' + K.money(m, 'RUB') + ' (' + K.num(pc) + '%)</b></span><small class="cx-saved" hidden>✓ Сохранено</small>' + (FIN.items.some(function (it) { return it.currency !== 'RUB'; }) ? '<small>Часть сумм в валюте — пересчитано по курсу ЦБ на дату ввода, итог ориентировочный.</small>' : '') + '</div>';
  }
  function finDraw(p) {
    var col = function (kind, title, ph) { var rows = FIN.items.map(function (it, i) { return it.kind === kind ? finRow(it, i) : ''; }).join(''); return '<div class="cx-fcol"><h4>' + title + '</h4>' + (rows || '<p class="cx-empty">Нет статей</p>') + '<div class="cx-fadd"><input data-new="' + kind + '" placeholder="' + ph + '"><button type="button" class="cx-btn sm" data-g="add" data-k="' + kind + '">+ Добавить</button></div></div>'; };
    p.innerHTML = '<div class="cx-fin">' + col('expense', 'Расходы', 'Новая статья расхода: фрахт, таможня, склад…') + col('income', 'Приходы', 'Новая статья прихода: оплата клиента…') + '</div><div class="cx-fresw">' + finTotals() + '</div>'
      + '<div class="cx-fnote"><h4>Комментарий по финансам</h4><textarea data-g="note" rows="2" placeholder="Заметка себе или коллегам — попадёт в историю ниже и в общую ленту сделки"></textarea><button type="button" class="cx-btn primary sm" data-g="addnote">Добавить запись</button></div>'
      + '<h4 class="cx-fh">История изменений</h4><div class="cx-fhist">' + ((FIN.history || []).map(function (h) { return '<div class="cx-fhi"><small>' + K.dt(h.at) + ' · ' + esc(h.by || '') + '</small><p>' + esc(h.text) + '</p></div>'; }).join('') || '<p class="cx-empty">Пока нет записей</p>') + '</div>';
    p.oninput = function (e) { var r = e.target.closest('[data-i]'); if (!r) return; var it = FIN.items[+r.dataset.i], g = e.target.dataset.g; if (g === 'label') it.label = e.target.value; if (g === 'amount') { if (it.currency === 'RUB') it.amount = +e.target.value || 0; else it.amount_orig = +e.target.value || 0; } finDirty = true; $('.cx-fresw', p).innerHTML = finTotals(); var hint = $('.cx-fhint', r); if (hint) hint.textContent = '≈ ' + K.money(it.amount, 'RUB') + ' по курсу ЦБ ' + (it.rate ? K.num(it.rate) : '—'); };
    p.onfocusout = function (e) { if (e.target.closest('[data-i]') && finDirty) finSave(p, true); };
    p.onchange = function (e) { var r = e.target.closest('[data-i]'); if (!r || e.target.dataset.g !== 'currency') return; var it = FIN.items[+r.dataset.i], c = e.target.value; if (c === 'RUB') { it.amount = it.amount || Math.round((it.amount_orig || 0) * (it.rate || 0)); delete it.amount_orig; delete it.rate; } else { it.amount_orig = it.currency === 'RUB' ? 0 : it.amount_orig; it.rate = (finRates.rates || {})[c] || 0; it.rateDate = finRates.date || ''; } it.currency = c; finDraw(p); var a = $('[data-i="' + r.dataset.i + '"] [data-g=amount]', p); if (a) { a.focus(); a.select(); } finSave(p, true); };
    p.onclick = function (e) { var b = e.target.closest('[data-g]'); if (!b) return; var g = b.dataset.g;
      if (g === 'del') { FIN.items.splice(+b.closest('[data-i]').dataset.i, 1); finDraw(p); finSave(p, true); }
      if (g === 'add') { var inp = $('[data-new=' + b.dataset.k + ']', p), lab = inp.value.trim(); if (!lab) return inp.focus(); FIN.items.push({ kind: b.dataset.k, label: lab, currency: 'RUB', amount: 0 }); finDraw(p); var idx = FIN.items.length - 1, el = $('[data-i="' + idx + '"] [data-g=amount]', p); if (el) el.focus(); finSave(p, true); }
      if (g === 'addnote') { var t = $('[data-g=note]', p), v = t.value.trim(); if (!v) return t.focus(); api('/api/deals/' + cur.item.id + '/notes', { method: 'POST', body: { type: 'finance', text: v, section: 'finance' } }).then(function () { t.value = ''; finPane(p); api('/api/deals/' + cur.item.id).then(function (r) { if (cur && r.item.id === cur.item.id) cur = r; }); }); }
    };
    $$('[data-new]', p).forEach(function (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('[data-g=add][data-k=' + inp.dataset.new + ']', p).click(); } }); });
  }
  function finSave(p, silent) {
    finDirty = false; var items = FIN.items.filter(function (it) { return String(it.label || '').trim(); });
    return api('/api/deals/' + cur.item.id + '/finance', { method: 'PUT', body: { items: items } }).then(function (r) {
      FIN.history = r.history; var j = 0;
      FIN.items.forEach(function (it) { if (!String(it.label || '').trim()) return; var s = r.items[j++]; if (!s) return; it.id = s.id; if (it.currency !== 'RUB') { it.rate = s.rate; it.rateDate = s.rateDate; it.amount = s.amount; } });
      var h = $('.cx-fhist', p); if (h) h.innerHTML = (r.history || []).map(function (x) { return '<div class="cx-fhi"><small>' + K.dt(x.at) + ' · ' + esc(x.by || '') + '</small><p>' + esc(x.text) + '</p></div>'; }).join('') || '<p class="cx-empty">Пока нет записей</p>';
      var s2 = $('.cx-saved', p); if (s2) { s2.hidden = false; setTimeout(function () { s2.hidden = true; }, 1500); }
    }).catch(function (e) { toast(e.message, 'err'); });
  }

  K.on('inbox', function () { render('inbox'); });
  K.on('deals', function () { render('deals'); });
  window.IOMA_CRM = { loadDeals: function () { render('deals'); }, loadInbox: function () { render('inbox'); }, openDeal: openDeal, reload: reload, render: render, newDeal: newDeal, showTab: function (t, openId) { if (cur && $('#crmDeal .cx-dtabs')) showTab(t, openId); }, get current() { return cur; } };
})();
