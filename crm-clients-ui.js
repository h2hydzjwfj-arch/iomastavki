/* IOMASTAVKA — «Клиенты» (перенос clients.js): база компаний с контактными лицами и юрлицами,
   сделки клиента, поиск и объединение дублей (ИНН / телефон / название), реквизиты из карточки компании. */
(function () {
  'use strict';
  var K = window.CX; if (!K) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  var F = { q: '', status: '', sort: 'recent', manager: '', page: 1 }, gen = 0, qT = null;
  var ENT = [['company_name', 'Полное название'], ['company_name_short', 'Короткое название'], ['inn', 'ИНН'], ['kpp', 'КПП'], ['ogrn', 'ОГРН'], ['address', 'Юр. адрес'], ['director_position', 'Должность руководителя'], ['director_name', 'Руководитель (ФИО)'], ['legal_basis', 'Основание подписания'], ['bank_name', 'Банк'], ['bik', 'БИК'], ['account', 'Р/с'], ['korr_account', 'Корр. счёт'], ['phone', 'Телефон'], ['email', 'Email']];
  function bar() {
    return '<div class="cx-bar"><div class="cx-search"><input type="search" id="crmCliQ" data-c="q" value="' + esc(F.q) + '" placeholder="Поиск: компания, ИНН, контакт, телефон, почта" aria-label="Поиск клиентов"></div>'
      + '<div class="cx-seg">' + [['', 'Все'], ['current', 'Текущие'], ['past', 'Прошлые']].map(function (s) { return '<button type="button" class="' + (F.status === s[0] ? 'on' : '') + '" data-c="status" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>'
      + '<select id="crmCliSort" data-c="sort" aria-label="Сортировка">' + [['recent', 'По последней активности'], ['added', 'По дате добавления'], ['frequency', 'По частоте обращений'], ['name', 'По названию']].map(function (s) { return '<option value="' + s[0] + '"' + (F.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>'
      + '<select data-c="mgr" aria-label="Ответственный"><option value="">Все ответственные</option>' + K.mgrOptions(F.manager) + '</select>'
      + '<button type="button" class="cx-btn ghost" data-c="dups">🔍 Дубли</button><button type="button" class="cx-btn primary" data-c="new">+ Клиент</button></div>';
  }
  function load() {
    var box = $('#crmClients'); if (!box) return; var my = ++gen;
    K.meta().then(function () {
      if (!$('.cx-bar', box)) { box.innerHTML = bar() + '<div class="cx-body"></div>'; bind(box); }
      var q = ['page=' + F.page, 'per=50', 'sort=' + F.sort]; if (F.q) q.push('q=' + encodeURIComponent(F.q)); if (F.status) q.push('status=' + F.status); if (F.manager) q.push('manager=' + encodeURIComponent(F.manager));
      return api('/api/crm/clients?' + q.join('&'));
    }).then(function (r) {
      if (my !== gen || !r) return; var body = $('#crmClients .cx-body'), pages = Math.ceil(r.total / 50);
      body.innerHTML = r.items.length ? '<div class="cx-h"><b>Клиенты (' + r.total + ')</b></div><div class="cx-table cx-clients"><div class="cx-tr cx-thd"><span>Клиент</span><span>ИНН</span><span>Контакты</span><span>Ответственный</span><span>Сделок</span><span>Добавлен</span><span>Активность</span><span></span></div>'
        + r.items.map(function (c) { return '<div class="cx-tr" role="button" tabindex="0" data-c="open" data-cli="' + esc(c.id) + '"><span class="cx-t"><b>' + esc(c.company || c.contact || '—') + '</b><small>' + esc(c.company && c.contact ? c.contact : '') + '</small></span><span class="cx-mut">' + esc(c.inn || '—') + '</span><span class="cx-mut">' + esc([c.phone, c.email].filter(Boolean).join(' · ') || '—') + '</span><span class="cx-mut">' + esc(c.manager || '—') + '</span><span><b>' + c.deals + '</b>' + (c.open ? ' <small class="cx-mut">откр. ' + c.open + '</small>' : '') + (c.quotes ? ' <small class="cx-mut">· КП ' + c.quotes + '</small>' : '') + '</span><span class="cx-mut">' + K.d(c.firstAt) + '</span><span class="cx-mut">' + K.d(c.lastAt) + '</span><span>' + (c.current ? '<em class="crm-st s-g">текущий</em>' : '<em class="crm-st s-x">прошлый</em>') + (c.cabinet ? ' <em class="crm-src">кабинет</em>' : '') + '</span></div>'; }).join('') + '</div>'
        + (pages > 1 ? '<nav class="cx-pager">' + Array.from({ length: pages }, function (_, i) { return '<button type="button" class="' + (i + 1 === F.page ? 'on' : '') + '" data-c="page" data-v="' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') + '</nav>' : '')
        : '<div class="k v3p-empty"><b>' + (F.q ? 'Ничего не найдено' : 'Клиентов пока нет') + '</b><small>Клиенты появляются из сделок и заявок сами. Можно добавить вручную.</small></div>';
    }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  function bind(box) {
    box.addEventListener('input', function (e) { if (e.target.dataset.c !== 'q') return; clearTimeout(qT); var v = e.target.value; qT = setTimeout(function () { F.q = v; F.page = 1; load(); }, 260); });
    box.addEventListener('change', function (e) { var c = e.target.dataset.c; if (c === 'sort') { F.sort = e.target.value; load(); } if (c === 'mgr') { F.manager = e.target.value; F.page = 1; load(); } });
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.c === 'open') open(e.target.dataset.cli, load); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b || !box.contains(b)) return; var c = b.dataset.c;
      if (c === 'status') { F.status = b.dataset.v; F.page = 1; $$('[data-c=status]', box).forEach(function (x) { x.classList.toggle('on', x === b); }); load(); }
      if (c === 'page') { F.page = +b.dataset.v; load(); }
      if (c === 'open') open(b.dataset.cli, load);
      if (c === 'new') edit(null, load);
      if (c === 'dups') dups();
    });
  }
  var CF = [['company', 'Компания'], ['inn', 'ИНН'], ['contact', 'Контактное лицо'], ['phone', 'Телефон'], ['email', 'Email'], ['website', 'Сайт'], ['address', 'Адрес']];
  function formHtml(c) { return '<div class="cx-grid2">' + CF.map(function (f) { return '<label class="cx-f"><span>' + f[1] + '</span><input data-k="' + f[0] + '" value="' + esc(c[f[0]] || '') + '"></label>'; }).join('') + '<label class="cx-f"><span>Ответственный</span><select data-k="manager">' + K.mgrOptions(c.manager || '', true) + '</select></label><label class="cx-f wide"><span>Примечания</span><textarea data-k="notes" rows="2">' + esc(c.notes || '') + '</textarea></label></div>'; }
  function collect(el) { var b = {}; $$('[data-k]', el).forEach(function (i) { b[i.dataset.k] = i.value; }); return b; }
  function edit(c, after) {
    K.meta().then(function () {
      var md = K.modal('Новый клиент', formHtml({}), '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Создать</button>', { wide: true });
      $('[data-ok]', md.el).addEventListener('click', function () { var b = collect(md.el); if (!b.company.trim() && !b.contact.trim()) return toast('Введите название компании или контакт', 'err'); K.guard(this, function () { return api('/api/crm/clients', { method: 'POST', body: b }).then(function (r) { md.close(); toast('Клиент добавлен'); if (after) after(); open(r.id, after); }); }); });
    });
  }
  function open(id, after) {
    Promise.all([K.meta(), api('/api/crm/clients/' + encodeURIComponent(id))]).then(function (rr) {
      var r = rr[1], c = r.item;
      var deals = r.deals.length ? '<div class="cx-sub"><b>Сделки</b></div><div class="cx-mini">' + r.deals.map(function (x) { return '<button type="button" data-deal="' + esc(x.id) + '"><span><b>' + esc(x.title) + '</b><small>№ ' + esc(x.number) + ' · ' + K.d(x.createdAt) + '</small></span>' + K.stageBadge(x.stage) + '</button>'; }).join('') + '</div>' : '';
      var contacts = '<div class="cx-sub"><b>Контактные лица</b><button type="button" class="cx-btn sm" data-add="contacts">+ Контакт</button></div><div class="cx-mini">' + ((c.contacts || []).map(function (k) { return '<button type="button" data-sub="contacts" data-sid="' + esc(k.id) + '"><span><b>' + esc(k.name) + '</b><small>' + esc([k.position, k.phone, k.email].filter(Boolean).join(' · ')) + '</small></span>' + (k.primary ? '<em class="cx-tag">основной</em>' : '') + '</button>'; }).join('') || '<p class="cx-mut">Контакты не добавлены</p>') + '</div>';
      var ents = '<div class="cx-sub"><b>Юрлица</b><button type="button" class="cx-btn sm" data-add="entities">+ Юрлицо</button></div><div class="cx-mini">' + ((c.entities || []).map(function (k) { return '<button type="button" data-sub="entities" data-sid="' + esc(k.id) + '"><span><b>' + esc(k.company_name_short || k.company_name) + '</b><small>' + esc(k.inn ? 'ИНН ' + k.inn : '') + '</small></span>' + (k.is_default ? '<em class="cx-tag">по умолчанию</em>' : '') + '</button>'; }).join('') || '<p class="cx-mut">Юрлица не добавлены — понадобятся для договоров</p>') + '</div>';
      var md = K.modal('Клиент: ' + (c.company || c.contact), '<div class="cx-clmeta">' + (c.cabinet ? '<em class="crm-src">есть личный кабинет</em> ' : '') + 'Добавлен ' + K.d(c.firstAt) + ' · сделок: ' + c.deals + (c.quotes ? ' · КП: ' + c.quotes : '') + '</div>' + formHtml(c) + deals + contacts + ents,
        '<button type="button" class="cx-link danger" data-del>Удалить клиента</button><button type="button" class="cx-btn" data-newdeal>+ Сделка</button><button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>', { wide: true, noFocus: true });
      var reopen = function () { md.close(); open(id, after); };
      $('[data-ok]', md.el).addEventListener('click', function () { K.guard(this, function () { return api('/api/crm/clients/' + id, { method: 'PATCH', body: collect($('.cx-grid2', md.el)) }).then(function () { toast('Сохранено'); md.close(); if (after) after(); }); }); });
      $('[data-del]', md.el).addEventListener('click', function () { K.confirm('Удалить клиента? Сделки останутся, но отвяжутся от него.', 'Удалить', true).then(function (ok) { if (ok) api('/api/crm/clients/' + id, { method: 'DELETE' }).then(function () { md.close(); if (after) after(); }); }); });
      $('[data-newdeal]', md.el).addEventListener('click', function () { api('/api/deals', { method: 'POST', body: { title: (c.company || c.contact) + ' — новая сделка', contactName: c.contact, company: c.company, contactPhone: c.phone, contactEmail: c.email, manager: c.manager, funnel: (K.META.funnels || [])[1], crmClientId: c.id } }).then(function (r) { md.close(); K.meta(true); window.IOMA_CRM.openDeal(r.item.id, 'clients'); }).catch(function (e) { toast(e.message, 'err'); }); });
      md.body.addEventListener('click', function (e) {
        var d = e.target.closest('[data-deal]'); if (d) { md.close(); return window.IOMA_CRM.openDeal(d.dataset.deal, 'clients'); }
        var a = e.target.closest('[data-add]'); if (a) return sub(id, a.dataset.add, null, reopen);
        var s = e.target.closest('[data-sub]'); if (s) return sub(id, s.dataset.sub, (c[s.dataset.sub] || []).find(function (v) { return v.id === s.dataset.sid; }), reopen);
      });
    }).catch(function (e) { toast(e.message, 'err'); });
  }
  function sub(cid, kind, item, done) {
    var isC = kind === 'contacts', o = item || {};
    var fields = isC ? [['name', 'ФИО'], ['position', 'Должность'], ['phone', 'Телефон'], ['email', 'Email'], ['notes', 'Примечания']] : ENT;
    var html = (!isC && !item ? '<label class="cx-drop" data-dz><input type="file" hidden accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" data-file><b>📎 Перетащите карточку компании или нажмите для выбора</b><small>PDF, DOCX, TXT или фото — реквизиты распознаются сами. Либо заполните поля вручную.</small></label><p class="cx-mut" data-st></p>' : '')
      + '<div class="cx-grid2">' + fields.map(function (f) { return '<label class="cx-f' + (f[0] === 'company_name' || f[0] === 'address' || f[0] === 'notes' ? ' wide' : '') + '"><span>' + f[1] + '</span><input data-k="' + f[0] + '" value="' + esc(o[f[0]] || '') + '"></label>'; }).join('') + '</div>';
    var flag = isC ? 'primary' : 'is_default';
    var md = K.modal(item ? (isC ? 'Контакт: ' + (o.name || '') : 'Юрлицо: ' + (o.company_name_short || o.company_name || '')) : (isC ? 'Новый контакт' : 'Новое юрлицо'), html,
      (item ? '<button type="button" class="cx-link danger" data-rm>Удалить</button>' + (o[flag] ? '' : '<button type="button" class="cx-btn" data-main>' + (isC ? 'Сделать основным' : 'Сделать по умолчанию') + '</button>') : '') + '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>', { wide: !isC });
    var base = '/api/crm/clients/' + cid + '/' + kind;
    $('[data-ok]', md.el).addEventListener('click', function () { var b = collect(md.el); K.guard(this, function () { return api(item ? base + '/' + o.id : base, { method: item ? 'PATCH' : 'POST', body: b }).then(function () { md.close(); done(); }); }); });
    var rm = $('[data-rm]', md.el); if (rm) rm.addEventListener('click', function () { K.confirm('Удалить?', 'Удалить', true).then(function (ok) { if (ok) api(base + '/' + o.id, { method: 'DELETE' }).then(function () { md.close(); done(); }); }); });
    var mn = $('[data-main]', md.el); if (mn) mn.addEventListener('click', function () { var b = {}; b[isC ? 'set_primary' : 'set_default'] = true; api(base + '/' + o.id, { method: 'PATCH', body: b }).then(function () { md.close(); done(); }); });
    var dz = $('[data-dz]', md.el);
    if (dz) { var go = function (f) { var st = $('[data-st]', md.el); st.textContent = '⏳ Распознаю реквизиты…'; var fd = new FormData(); fd.append('file', f);
        api('/api/company/entities/extract', { method: 'POST', body: fd }).then(function (r) { var map = { name: 'company_name', name_short: 'company_name_short', legal_basis_full: 'legal_basis' }; Object.keys(r.data || {}).forEach(function (k) { var el = $('[data-k="' + (map[k] || k) + '"]', md.el); if (el && r.data[k]) el.value = r.data[k]; }); st.innerHTML = '✓ Реквизиты распознаны — проверьте поля' + (r.warnings && r.warnings.length ? '<br>⚠ ' + esc(r.warnings.join('; ')) : ''); }).catch(function (e) { st.textContent = '❌ ' + e.message; }); };
      K.dropzone(dz, function (fl) { go(fl[0]); }); $('[data-file]', md.el).addEventListener('change', function () { if (this.files[0]) go(this.files[0]); }); }
  }
  // ---------- дубли
  var dupTypes = ['inn', 'phone', 'name'], picked = {};
  function dups() {
    var html = '<div class="cx-dupbar"><input data-dq placeholder="Поиск: имя, ИНН, телефон, название, email…">' + [['inn', 'ИНН'], ['phone', 'Телефон'], ['name', 'Название']].map(function (t) { return '<label class="cx-cbx"><input type="checkbox" data-dt="' + t[0] + '"' + (dupTypes.indexOf(t[0]) >= 0 ? ' checked' : '') + '> ' + t[1] + '</label>'; }).join('') + '<small data-cnt></small></div><div class="cx-selbar" hidden><b data-n></b><button type="button" class="cx-btn primary sm" data-mergesel>🔗 Объединить выбранные</button><button type="button" class="cx-link" data-clr>Снять выбор</button></div><div data-groups><p class="cx-load">Ищу дубли…</p></div>';
    var md = K.modal('Поиск дублей клиентов', html, false, { wide: true }); var groups = [], singles = [], seen = {}, t = null;
    function row(c) { seen[c.id] = c; return '<div class="cx-duprow"><label class="cx-cbx"><input type="checkbox" data-pick="' + esc(c.id) + '"' + (picked[c.id] ? ' checked' : '') + '></label><span><b>' + esc(c.company || c.contact || '—') + '</b><small>ИНН: ' + esc(c.inn || '—') + ' · Тел: ' + esc(c.phone || '—') + ' · ' + esc(c.email || '') + ' · сделок: ' + c.deals + '</small></span></div>'; }
    function draw() {
      var q = ($('[data-dq]', md.el).value || '').toLowerCase().trim(), shown = groups.filter(function (g) { return !q || g.clients.some(function (c) { return [c.company, c.contact, c.inn, c.phone, c.email].join(' ').toLowerCase().indexOf(q) >= 0; }); });
      $('[data-cnt]', md.el).textContent = 'Групп: ' + shown.length + (q ? ' из ' + groups.length : '');
      $('[data-groups]', md.el).innerHTML = (shown.map(function (g, i) { return '<div class="cx-dupg"><small>Совпадение по: <b>' + ({ inn: 'ИНН', phone: 'телефону', name: 'названию' }[g.match_type]) + '</b> — «' + esc(g.match_value) + '»</small>' + g.clients.map(row).join('') + '<button type="button" class="cx-btn sm" data-mg="' + groups.indexOf(g) + '">🔗 Объединить эту группу</button></div>'; }).join('') || '<p class="cx-empty">Дублей по выбранным признакам не найдено</p>')
        + (singles.length ? '<p class="cx-mut">Найдено без дублей:</p>' + singles.map(row).join('') : '');
      var n = Object.keys(picked).filter(function (k) { return picked[k]; }).length; $('.cx-selbar', md.el).hidden = !n; $('[data-n]', md.el).textContent = 'Выбрано: ' + n;
    }
    function fetchG() { var q = ($('[data-dq]', md.el).value || '').trim(); api('/api/crm/clients/duplicates?types=' + dupTypes.join(',') + (q ? '&q=' + encodeURIComponent(q) : '')).then(function (r) { groups = r.groups; singles = r.singles || []; draw(); }); }
    $('[data-dq]', md.el).addEventListener('input', function () { draw(); clearTimeout(t); t = setTimeout(fetchG, 300); });
    md.el.addEventListener('change', function (e) { var dt = e.target.dataset.dt; if (dt) { dupTypes = $$('[data-dt]', md.el).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.dt; }); return fetchG(); } if (e.target.dataset.pick) { picked[e.target.dataset.pick] = e.target.checked; draw(); } });
    md.el.addEventListener('click', function (e) { var g = e.target.closest('[data-mg]'); if (g) return merge(groups[+g.dataset.mg].clients, function () { md.close(); load(); dups(); });
      if (e.target.closest('[data-clr]')) { picked = {}; draw(); }
      if (e.target.closest('[data-mergesel]')) { var list = Object.keys(picked).filter(function (k) { return picked[k] && seen[k]; }).map(function (k) { return seen[k]; }); if (list.length < 2) return toast('Отметьте минимум двух клиентов', 'err'); merge(list, function () { picked = {}; md.close(); load(); dups(); }); } });
    fetchG();
  }
  function merge(list, done) {
    var html = '<p class="cx-mut">Галочка — включить запись в объединение (можно отметить только часть: совпадение по названию бывает случайным). Кружок — какая запись станет главной.</p>' + list.map(function (c, i) { return '<label class="cx-duprow"><input type="checkbox" data-inc="' + esc(c.id) + '"' + (i < 2 ? ' checked' : '') + '><input type="radio" name="cxPrimary" value="' + esc(c.id) + '"' + (i === 0 ? ' checked' : '') + ' title="Главная запись"><span><b>' + esc(c.company || c.contact) + '</b><small>ИНН: ' + esc(c.inn || '—') + ' · Тел: ' + esc(c.phone || '—') + ' · сделок: ' + c.deals + '</small></span></label>'; }).join('');
    var md = K.modal('Объединение дублей', html, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Объединить отмеченные</button>', { wide: true });
    $('[data-ok]', md.el).addEventListener('click', function () {
      var inc = $$('[data-inc]', md.el).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.inc; }), p = ($('[name=cxPrimary]:checked', md.el) || {}).value;
      if (inc.indexOf(p) < 0) return toast('Главная запись должна быть отмечена галочкой', 'err'); var dupIds = inc.filter(function (x) { return x !== p; }); if (!dupIds.length) return toast('Отметьте хотя бы одну запись, кроме главной', 'err');
      K.confirm('Объединить ' + inc.length + ' записи в одну? Сделки, контакты и юрлица перейдут в главную запись.', 'Объединить').then(function (ok) { if (ok) api('/api/crm/clients/merge', { method: 'POST', body: { primary_id: p, duplicate_ids: dupIds } }).then(function () { toast('Объединено'); md.close(); done(); }).catch(function (e) { toast(e.message, 'err'); }); });
    });
  }
  K.on('clients', load);
  window.IOMA_CLIENTS = { load: load, open: open };
  window.IOMA_CRM_CLIENTS = load;
})();
