/* IOMASTAVKA — «Задачи» (перенос tasks.js): канбан по срокам (просроченные / сегодня / завтра / позже),
   список с отметкой нескольких, фильтр по ответственному, поиск, карточка задачи с результатом и быстрым переносом. */
(function () {
  'use strict';
  var K = window.CX; if (!K) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var F = { status: 'open', view: 'kanban', manager: '', q: '' }, cache = [], gen = 0, qT = null, sel = {};
  try { var sv = JSON.parse(localStorage.getItem('iomaTasksF') || '{}'); if (sv.view) F.view = sv.view; if (sv.manager != null) F.manager = sv.manager; } catch (e) {}
  function keep() { try { localStorage.setItem('iomaTasksF', JSON.stringify({ view: F.view, manager: F.manager })); } catch (e) {} }
  function deadline(t) { return t.deadline ? K.d(t.deadline) + (t.time ? ' ' + t.time : '') : 'без срока'; }
  function bucket(t) { var td = K.today(), tm = K.today(1); if (!t.deadline) return 'rest'; if (t.deadline < td) return 'overdue'; if (t.deadline === td) return 'today'; if (t.deadline === tm) return 'tomorrow'; return 'rest'; }
  function card(t) {
    var over = t.status !== 'done' && t.overdue;
    return '<button type="button" class="cx-task' + (t.status === 'done' ? ' done' : '') + (over ? ' over' : '') + '" draggable="true" data-t="open" data-id="' + esc(t.id) + '"><small class="cx-tt">' + esc(t.type || 'Задача') + (t.dealTitle ? ' · <u data-t="deal" data-deal="' + esc(t.dealId) + '">' + esc(t.dealTitle) + '</u>' : '') + (t.clientName ? ' · ' + esc(t.clientName) : '') + '</small><b>' + esc(t.desc || '—') + '</b><span class="cx-tm">До: ' + deadline(t) + ' · ' + esc(t.manager || '—') + (t.managerOff ? ' <em class="cx-tag amb" title="Ответственный в этот день отсутствует">отсутствует</em>' : '') + '</span>' + (t.comment && t.status === 'done' ? '<span class="cx-tres">✓ ' + esc(t.comment) + '</span>' : '') + '</button>';
  }
  function bar() {
    var m = K.META || {};
    return '<div class="cx-bar"><div class="cx-seg">' + [['open', 'Открытые'], ['done', 'Завершённые'], ['', 'Все']].map(function (s) { return '<button type="button" class="' + (F.status === s[0] ? 'on' : '') + '" data-t="status" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>'
      + '<div class="cx-seg">' + [['kanban', '▦ Канбан'], ['table', '☰ Список']].map(function (s) { return '<button type="button" class="' + (F.view === s[0] ? 'on' : '') + '" data-t="view" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>'
      + '<select data-t="mgr" aria-label="Ответственный"><option value="">👤 Все ответственные</option><option value="—"' + (F.manager === '—' ? ' selected' : '') + '>Без ответственного</option>' + (m.managers || []).map(function (x) { return '<option' + (x === F.manager ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>'
      + '<div class="cx-search"><input type="search" data-t="q" value="' + esc(F.q) + '" placeholder="Поиск по тексту задачи, сделке, клиенту" aria-label="Поиск задач"></div><button type="button" class="cx-btn primary" data-t="new">+ Задача</button></div>';
  }
  function load() {
    var box = $('#cxTasks'); if (!box) return; var my = ++gen;
    K.meta().then(function () {
      if (!$('.cx-bar', box)) { box.innerHTML = bar() + '<div class="cx-body"></div>'; bind(box); }
      return api('/api/tasks?status=' + encodeURIComponent(F.status) + (F.manager ? '&manager=' + encodeURIComponent(F.manager) : '') + (F.q ? '&q=' + encodeURIComponent(F.q) : ''));
    }).then(function (r) { if (my !== gen || !r) return; cache = r.items; draw($('.cx-body', box)); K.badges(); }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  function draw(body) {
    if (!cache.length) { body.innerHTML = '<div class="k v3p-empty"><b>✅ Задач нет</b><small>Поставьте задачу здесь или прямо в ленте сделки — она появится в этом списке и в карточке сделки.</small></div>'; return; }
    if (F.view === 'table') {
      body.innerHTML = '<div class="cx-bulk" hidden><b></b><button type="button" class="cx-btn ok" data-t="bulkdone">✓ Выполнить отмеченные</button></div><div class="cx-table cx-ttable"><div class="cx-tr cx-thd"><label class="cx-cb"><input type="checkbox" data-t="selall" aria-label="Выбрать все"></label><span>Срок</span><span>Задача</span><span class="lp">Сделка</span><span class="lp">Ответственный</span></div>'
        + cache.map(function (t) { return '<div class="cx-tr' + (t.status === 'done' ? ' done' : '') + '" role="button" tabindex="0" data-t="open" data-id="' + esc(t.id) + '"><label class="cx-cb"><input type="checkbox" data-t="sel" data-id="' + esc(t.id) + '"' + (sel[t.id] ? ' checked' : '') + '></label><span class="' + (t.overdue ? 'cx-red' : '') + '">' + (t.status === 'done' ? '✓ ' : '') + deadline(t) + '</span><span class="cx-t"><b>' + esc(t.type || 'Задача') + (t.desc ? ': ' + esc(t.desc) : '') + '</b>' + (t.comment ? '<small>' + esc(t.comment) + '</small>' : '') + '</span><span class="lp">' + (t.dealTitle ? '<u data-t="deal" data-deal="' + esc(t.dealId) + '">' + esc(t.dealTitle) + '</u>' : '<span class="cx-mut">—</span>') + '</span><span class="cx-mut lp">' + esc(t.manager || '—') + '</span></div>'; }).join('') + '</div>';
      return bulkBar();
    }
    var B = { overdue: [], today: [], tomorrow: [], rest: [] };
    cache.forEach(function (t) { B[t.status === 'done' && F.status !== 'done' ? 'rest' : bucket(t)].push(t); });
    var cols = [['overdue', 'Просроченные задачи', 'x-red'], ['today', 'Задачи на сегодня', 'x-green'], ['tomorrow', 'Задачи на завтра', 'x-blue'], ['rest', 'Позже и без срока', 'x-blue']];
    body.innerHTML = '<div class="cx-board cx-tboard">' + cols.map(function (c) { var l = B[c[0]]; return '<section class="cx-kcol" data-bucket="' + c[0] + '"><header><b>' + c[1] + '</b><small>' + l.length + ' ' + K.plural(l.length, 'задача', 'задачи', 'задач') + '</small></header><i class="cx-kbar ' + c[2] + '"></i><div class="cx-kbody">' + (l.map(card).join('') || '<p class="cx-empty">Пусто</p>') + '</div></section>'; }).join('') + '</div><p class="cx-hint">Перетащите задачу в другую колонку, чтобы перенести срок.</p>';
    var drag = null, board = $('.cx-board', body);
    $$('.cx-task', board).forEach(function (c) { c.addEventListener('dragstart', function (e) { drag = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag); } catch (er) {} }); c.addEventListener('dragend', function () { c.classList.remove('drag'); }); });
    $$('.cx-kcol', board).forEach(function (col) {
      col.addEventListener('dragover', function (e) { if (drag) { e.preventDefault(); col.classList.add('over'); } });
      col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', function (e) { e.preventDefault(); col.classList.remove('over'); var id = drag; drag = null; if (!id) return; var b = col.dataset.bucket, d = b === 'overdue' ? K.today(-1) : b === 'today' ? K.today() : b === 'tomorrow' ? K.today(1) : K.today(7); api('/api/tasks/' + id, { method: 'PATCH', body: { deadline: d } }).then(load).catch(function (er) { toast(er.message, 'err'); }); });
    });
  }
  function bulkBar() { var n = Object.keys(sel).filter(function (k) { return sel[k]; }).length, b = $('#cxTasks .cx-bulk'); if (b) { b.hidden = !n; $('b', b).textContent = 'Выбрано: ' + n; } }
  function bind(box) {
    box.addEventListener('input', function (e) { if (e.target.dataset.t !== 'q') return; clearTimeout(qT); var v = e.target.value; qT = setTimeout(function () { F.q = v; load(); }, 260); });
    box.addEventListener('change', function (e) { var t = e.target.dataset.t; if (t === 'mgr') { F.manager = e.target.value; keep(); load(); } if (t === 'sel') { sel[e.target.dataset.id] = e.target.checked; bulkBar(); } if (t === 'selall') { $$('[data-t=sel]', box).forEach(function (c) { c.checked = e.target.checked; sel[c.dataset.id] = c.checked; }); bulkBar(); } });
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.t === 'open' && e.target.tagName !== 'BUTTON') openById(e.target.dataset.id); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b || !box.contains(b)) return; var t = b.dataset.t;
      if (t === 'deal') { e.stopPropagation(); return window.IOMA_CRM && window.IOMA_CRM.openDeal(b.dataset.deal, 'tasks'); }
      if (t === 'status' || t === 'view') { F[t] = b.dataset.v; keep(); $('.cx-bar', box).outerHTML = bar(); return load(); }
      if (t === 'new') return create({}, load);
      if (t === 'open') { if (e.target.closest('label.cx-cb,input')) return; return openById(b.dataset.id); }
      if (t === 'bulkdone') { var ids = Object.keys(sel).filter(function (k) { return sel[k]; }); return api('/api/tasks/bulk', { method: 'POST', body: { ids: ids, status: 'done' } }).then(function (r) { sel = {}; toast('Выполнено задач: ' + r.changed); load(); }); }
    });
  }
  function openById(id) { var t = cache.find(function (x) { return x.id === id; }); if (t) detail(t, load); }
  function fields(t) {
    var types = (K.META.taskTypes || ['Задача']).slice(); if (t.type && types.indexOf(t.type) < 0) types.push(t.type);
    return '<div class="cx-grid2"><label class="cx-f"><span>Тип задачи</span><select data-k="type">' + types.map(function (v) { return '<option' + (v === (t.type || 'Задача') ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></label>'
      + '<label class="cx-f"><span>Ответственный</span><select data-k="manager">' + K.mgrOptions(t.manager || '', true) + '</select></label>'
      + '<label class="cx-f"><span>Срок</span><input type="date" data-k="deadline" value="' + esc(t.deadline || K.today()) + '"></label><label class="cx-f"><span>Время</span><input type="time" data-k="time" value="' + esc(t.time || '') + '"></label>'
      + '<label class="cx-f wide"><span>Описание</span><textarea data-k="desc" rows="3" placeholder="Подробности задачи">' + esc(t.desc || '') + '</textarea></label></div>';
  }
  function collect(md) { var b = {}; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); return b; }
  function create(pre, after) {
    pre = pre || {};
    K.meta().then(function () {
      var dealPick = pre.dealId ? '' : '<label class="cx-f"><span>Сделка (необязательно)</span><input data-dq placeholder="Найти сделку по названию, клиенту, №"><input type="hidden" data-k="dealId"><div class="cx-lc" data-dres></div></label>';
      var md = K.modal('Новая задача', fields({ manager: pre.manager || '' }) + dealPick, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Создать</button>', { wide: true });
      var dq = $('[data-dq]', md.el), t = null;
      if (dq) { dq.addEventListener('input', function () { var q = dq.value.trim(); $('[data-k=dealId]', md.el).value = ''; clearTimeout(t); t = setTimeout(function () { if (!q) { $('[data-dres]', md.el).innerHTML = ''; return; } api('/api/deals?status=all&q=' + encodeURIComponent(q)).then(function (r) { $('[data-dres]', md.el).innerHTML = r.items.slice(0, 8).map(function (x) { return '<button type="button" data-did="' + esc(x.id) + '"><b>' + esc(x.title) + '</b><small>№ ' + esc(x.number) + ' · ' + esc(x.clientName || '') + '</small></button>'; }).join(''); }); }, 250); });
        $('[data-dres]', md.el).addEventListener('click', function (e) { var b = e.target.closest('[data-did]'); if (!b) return; $('[data-k=dealId]', md.el).value = b.dataset.did; dq.value = $('b', b).textContent; $('[data-dres]', md.el).innerHTML = ''; }); }
      $('[data-ok]', md.el).addEventListener('click', function () { var b = collect(md); if (pre.dealId) b.dealId = pre.dealId; if (!b.desc.trim() && b.type === 'Задача') return toast('Опишите задачу', 'err'); if (!b.deadline) return toast('Укажите срок', 'err');
        K.guard(this, function () { return api('/api/tasks', { method: 'POST', body: b }).then(function () { md.close(); toast('Задача поставлена'); K.badges(); if (after) after(); }); }); });
    });
  }
  function detail(t, after) {
    K.meta().then(function () {
      var td = K.today(), days = t.deadline ? Math.round((Date.parse(t.deadline) - Date.parse(td)) / 864e5) : null;
      var lbl = days == null ? '' : days < 0 ? '(' + -days + ' дн. назад)' : days === 0 ? '(сегодня)' : '(через ' + days + ' дн.)';
      var html = '<p class="cx-tdh">' + (t.dealId ? '<button type="button" class="cx-link" data-go>' + esc(t.dealTitle || 'Сделка') + '</button>' + (t.clientName ? ', ' + esc(t.clientName) : '') : esc(t.type || 'Задача')) + '</p>'
        + '<p class="cx-tdm' + (t.overdue ? ' cx-red' : '') + '">' + deadline(t) + ' <b>' + lbl + '</b> · ' + esc(t.manager || '—') + ' · ' + esc(t.type || 'Задача') + (t.createdBy ? ' · поставил(а): ' + esc(t.createdBy) : '') + '</p>'
        + '<div class="cx-tdres"><input data-res placeholder="Результат: что сделано" value="' + esc(t.comment || '') + '"><button type="button" class="cx-btn ' + (t.status === 'done' ? '' : 'primary') + '" data-done>' + (t.status === 'done' ? 'Открыть заново' : 'Выполнить') + '</button></div>'
        + '<div class="cx-pinq"><span>Перенести:</span><button type="button" data-move="1">завтра</button><button type="button" data-move="7">через неделю</button><button type="button" data-move="30">через месяц</button></div>'
        + '<details class="cx-tdedit"><summary>Изменить задачу</summary>' + fields(t) + '<button type="button" class="cx-btn sm" data-save>Сохранить изменения</button></details>';
      var md = K.modal('Задача', html, '<button type="button" class="cx-link danger" data-del>Удалить</button><button type="button" class="cx-btn ghost" data-cx="close">Закрыть</button>', { noFocus: true });
      var fin = function () { md.close(); K.badges(); if (after) after(); };
      var go = $('[data-go]', md.el); if (go) go.addEventListener('click', function () { md.close(); window.IOMA_CRM && window.IOMA_CRM.openDeal(t.dealId, K.current === 'tasks' ? 'tasks' : undefined); });
      $('[data-done]', md.el).addEventListener('click', function () { api('/api/tasks/' + t.id, { method: 'PATCH', body: { status: t.status === 'done' ? 'open' : 'done', comment: $('[data-res]', md.el).value } }).then(fin).catch(function (e) { toast(e.message, 'err'); }); });
      $$('[data-move]', md.el).forEach(function (b) { b.addEventListener('click', function () { api('/api/tasks/' + t.id, { method: 'PATCH', body: { deadline: K.today(+b.dataset.move) } }).then(fin); }); });
      $('[data-save]', md.el).addEventListener('click', function () { api('/api/tasks/' + t.id, { method: 'PATCH', body: collect(md) }).then(fin).catch(function (e) { toast(e.message, 'err'); }); });
      $('[data-del]', md.el).addEventListener('click', function () { K.confirm('Удалить задачу?', 'Удалить', true).then(function (ok) { if (ok) api('/api/tasks/' + t.id, { method: 'DELETE' }).then(fin); }); });
    });
  }
  K.on('tasks', load);
  window.IOMA_TASKS = { load: load, create: create, detail: detail };
})();
