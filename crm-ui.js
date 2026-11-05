/* IOMASTAVKA — CRM для администратора: сделки, карточка сделки, база клиентов, тарифы. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function api(url, opt) { opt = opt || {}; var o = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} }; if (opt.body instanceof FormData) o.body = opt.body; else if (opt.body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opt.body); }
    return fetch(url, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.ok === false) throw new Error(d.error || 'Ошибка ' + r.status); return d; }); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { window.__v3toast ? window.__v3toast(m) : alert(m); }
  function d(v) { return v ? new Date(v).toLocaleDateString('ru-RU') : '—'; }
  function dt(v) { return v ? new Date(v).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''; }
  function age(v) { var n = Math.max(0, Math.floor((Date.now() - new Date(v).getTime()) / 864e5)); return n; }
  function fmt(n) { return n == null || n === '' ? '' : Number(n).toLocaleString('ru-RU'); }
  var META = null, filt = { q: '', funnel: '', stage: '', open: '1' }, cur = null, gen = 0, searchT = null;
  var STC = { 'Новая заявка': 'n', 'Запрос': 'q', 'Расчёт': 'q', 'Ставка отправлена': 'r', 'КП отправлено': 'r', 'Клиент на рассмотрении': 'w', 'В работе': 'g', 'Груз в пути': 'g', 'Успешно': 'ok', 'Закрыта': 'x' };

  function meta() { return META ? Promise.resolve(META) : api('/api/deals/meta').then(function (m) { META = m; return m; }); }

  /* ---------------- список сделок ---------------- */
  function bar() {
    var b = $('#crmBar'); if (!b || b.dataset.ready) return; b.dataset.ready = '1';
    b.innerHTML = '<div class="crm-search"><input type="search" id="crmQ" placeholder="Поиск: клиент, компания, груз, телефон…" aria-label="Поиск сделок"></div>'
      + '<select id="crmStage" aria-label="Этап"><option value="">Все этапы</option></select>'
      + '<label class="crm-open"><input type="checkbox" id="crmOpen" checked> Только открытые</label>'
      + '<button type="button" class="calculate v3p-sm" id="crmNew">+ Сделка</button>'
      + '<label class="v3c-link crm-imp">Импорт из Excel/CSV<input type="file" id="crmImport" accept=".xlsx,.csv" hidden></label>'
      + '<div class="crm-funnels" id="crmFunnels" role="group" aria-label="Воронка"></div>';
    meta().then(function (m) {
      $('#crmStage').innerHTML += m.stages.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
      $('#crmFunnels').innerHTML = ['<button type="button" class="chip on" data-f="">Все сделки</button>'].concat(m.funnels.map(function (f) { return '<button type="button" class="chip" data-f="' + esc(f) + '">' + esc(f) + '</button>'; })).join('');
    });
    $('#crmQ').addEventListener('input', function () { clearTimeout(searchT); searchT = setTimeout(function () { filt.q = $('#crmQ').value; loadDeals(); }, 250); });
    $('#crmStage').addEventListener('change', function () { filt.stage = this.value; loadDeals(); });
    $('#crmOpen').addEventListener('change', function () { filt.open = this.checked ? '1' : ''; loadDeals(); });
    b.addEventListener('click', function (e) { var c = e.target.closest('[data-f]'); if (!c) return; filt.funnel = c.dataset.f; $$('#crmFunnels .chip').forEach(function (x) { x.classList.toggle('on', x === c); }); loadDeals(); });
    $('#crmNew').addEventListener('click', function () { openDeal(null); });
    $('#crmImport').addEventListener('change', function () { var f = this.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f); this.value = ''; toast('Импортирую…');
      api('/api/deals/import', { method: 'POST', body: fd }).then(function (r) { toast('Импортировано сделок: ' + r.added + (r.skipped ? ', пропущено: ' + r.skipped : '')); META = null; loadDeals(); }).catch(function (x) { toast(x.message); }); });
  }
  function loadDeals() {
    bar(); var box = $('#crmList'); if (!box) return; var my = ++gen; $('#crmDeal').hidden = true; box.hidden = false; $('#crmBar').hidden = false;
    var q = Object.keys(filt).filter(function (k) { return filt[k]; }).map(function (k) { return k + '=' + encodeURIComponent(filt[k]); }).join('&');
    api('/api/deals' + (q ? '?' + q : '')).then(function (r) {
      if (my !== gen) return; var items = r.items;
      box.innerHTML = '<div class="crm-h"><b>Сделки (' + items.length + ')</b></div>' + (items.length ? '<div class="crm-table" role="table"><div class="crm-tr crm-th" role="row"><span></span><span>Название</span><span>Источник</span><span>Воронка</span><span>Контакт</span><span>Компания</span><span>Этап</span><span>Перевозка</span><span>Создана</span></div>'
        + items.map(function (x) { var a = age(x.updatedAt || x.createdAt), m = META && META.modes || {};
          return '<button type="button" class="crm-tr" role="row" data-deal="' + esc(x.id) + '"><span class="crm-age a' + (a <= 5 ? 1 : a <= 20 ? 2 : 3) + '">' + a + 'дн</span><span class="crm-t"><b>' + esc(x.title) + '</b><small>№ ' + esc(x.number || '') + (x.files ? ' · 📎 ' + x.files : '') + '</small></span><span>' + (x.source ? '<em class="crm-src">' + esc(x.source) + '</em>' : '') + '</span><span class="crm-mut">' + esc(x.funnel || '') + '</span><span>' + esc(x.contactName || '—') + '</span><span class="crm-mut">' + esc(x.company || x.contactName || '') + '</span><span><em class="crm-st s-' + (STC[x.stage] || 'q') + '">' + esc(x.stage) + '</em></span><span>' + esc(m[x.mode] || '—') + '</span><span class="crm-mut">' + d(x.createdAt) + '</span></button>'; }).join('') + '</div>'
        : '<div class="k v3p-empty"><b>Сделок пока нет</b><small>Каждая заявка с сайта сразу становится сделкой. Можно добавить сделку вручную или импортировать из прежней CRM (Excel/CSV).</small></div>');
    }).catch(function (x) { box.innerHTML = '<p class="v3p-err">' + esc(x.message) + '</p>'; });
  }

  /* ---------------- карточка сделки ---------------- */
  function field(k, lab, val, type, opts) {
    var v = val == null ? '' : val;
    if (type === 'select') return '<label class="crm-f"><span>' + lab + '</span><select name="' + k + '">' + (opts || []).map(function (o) { var ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select></label>';
    if (type === 'list') return '<label class="crm-f"><span>' + lab + '</span><input name="' + k + '" list="crmL-' + k + '" value="' + esc(v) + '"><datalist id="crmL-' + k + '">' + (opts || []).map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist></label>';
    return '<label class="crm-f"><span>' + lab + '</span><input name="' + k + '"' + (type === 'number' ? ' type="number" step="any" min="0" inputmode="decimal"' : '') + ' value="' + esc(v) + '"></label>';
  }
  var ACT = { lead: '📩', note: '📝', call: '📞', mail: '✉️', rate: '💲', field: '•', file: '📎', quote: '📄' };
  function activity(x) {
    var L = META ? META.labels : {};
    var items = (x.activity || []).slice().reverse(), last = '';
    return items.map(function (a) { var day = d(a.at), h = '';
      if (day !== last) { h += '<div class="crm-day">' + day + '</div>'; last = day; }
      if (a.type === 'field') return h + '<div class="crm-ev crm-fld">' + dt(a.at).split(', ')[1] + ' · ' + esc(a.by || '') + ' · поле «' + esc(L[a.field] || a.field) + '»: <s>' + esc(a.from || '—') + '</s> → <b>' + esc(a.to || '—') + '</b></div>';
      return h + '<div class="crm-ev"><div class="crm-evh"><span>' + (ACT[a.type] || '📝') + '</span><b>' + ({ lead: 'Заявка', note: 'Примечание', call: 'Звонок', mail: 'Письмо', rate: 'Ставка', file: 'Файл', quote: 'КП' }[a.type] || 'Запись') + '</b><small>' + dt(a.at).split(', ')[1] + ' · ' + esc(a.by || '') + '</small></div><div class="crm-evt">' + esc(a.text || '') + '</div></div>'; }).join('') || '<p class="v3p-muted">Пока пусто.</p>';
  }
  function openDeal(id) {
    clearTimeout(searchT); var my = ++gen;
    meta().then(function (m) {
      var p = id ? api('/api/deals/' + encodeURIComponent(id)) : Promise.resolve({ item: { stage: 'Новая заявка', funnel: 'Входящие', source: 'Звонок', activity: [], files: [] }, quotes: [] });
      return p.then(function (r) { if (my !== gen) return; cur = r.item; render(cur, r.quotes || [], m); });
    }).catch(function (x) { toast(x.message); });
  }
  function render(x, quotes, m) {
    var box = $('#crmDeal'); $('#crmList').hidden = true; $('#crmBar').hidden = true; box.hidden = false;
    var isNew = !x.id, modes = [['', '—']].concat(Object.keys(m.modes).map(function (k) { return [k, m.modes[k]]; }));
    var tel = String(x.contactPhone || ''), telHref = /^@/.test(tel) ? 'https://t.me/' + encodeURIComponent(tel.slice(1)) : tel.replace(/[^\d+]/g, '').length >= 7 ? 'tel:' + tel.replace(/[^\d+]/g, '') : '';
    box.innerHTML = '<button type="button" class="v3c-link crm-back" data-crm="back">← Назад к сделкам</button><div class="crm-deal"><div class="crm-left">'
      + '<div class="k crm-head"><input class="crm-title" name="title" form="crmForm" value="' + esc(x.title || '') + '" placeholder="Название сделки" aria-label="Название сделки">' + (x.source ? '<em class="crm-src">' + esc(x.source) + '</em>' : '') + '<small>' + (isNew ? 'Новая сделка' : '№ ' + esc(x.number) + ' · создана ' + dt(x.createdAt)) + '</small>'
      + '<select name="stage" form="crmForm" class="crm-stage s-' + (STC[x.stage] || 'q') + '" aria-label="Этап">' + m.stages.map(function (s) { return '<option' + (s === x.stage ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>'
      + '<div class="k crm-contact"><div class="crm-ava">' + esc(String(x.contactName || x.company || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase()) + '</div><div><b>' + esc(x.contactName || 'Контакт не указан') + '</b><small>' + esc(x.company || '') + '</small></div>'
      + (tel ? '<a href="' + esc(telHref) + '" target="_blank" rel="noopener">' + esc(tel) + '</a>' : '') + (x.contactEmail ? '<a href="mailto:' + esc(x.contactEmail) + '">' + esc(x.contactEmail) + '</a>' : '') + '</div>'
      + '<form class="k crm-form" id="crmForm">'
      + field('contactName', 'Контакт', x.contactName) + field('company', 'Компания', x.company) + field('contactPhone', 'Телефон / Telegram', x.contactPhone) + field('contactEmail', 'Email', x.contactEmail)
      + field('funnel', 'Воронка', x.funnel, 'list', m.funnels) + field('source', 'Источник', x.source, 'list', m.sources)
      + field('cargo', 'Груз', x.cargo) + '<div class="crm-two">' + field('weight', 'Вес, кг', x.weight, 'number') + field('volume', 'Объём, м³', x.volume, 'number') + '</div>'
      + '<div class="crm-two">' + field('places', 'Мест', x.places, 'number') + field('incoterms', 'Инкотермс', x.incoterms, 'list', ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'DAP', 'DDP']) + '</div>'
      + field('from', 'Откуда', x.from) + field('to', 'Куда', x.to) + field('mode', 'Тип перевозки', x.mode, 'select', modes)
      + field('contractType', 'Тип договора', x.contractType, 'list', ['Контракт компании', 'Контракт клиента', 'Карго']) + field('broker', 'Брокер', x.broker, 'list', ['Наш брокер', 'Брокер клиента'])
      + field('documents', 'Документы', x.documents) + '<div class="crm-two">' + field('amount', 'Сумма сделки', x.amount, 'number') + field('currency', 'Валюта', x.currency || 'USD', 'list', ['USD', 'CNY', 'RUB', 'EUR']) + '</div>'
      + field('manager', 'Менеджер', x.manager)
      + '<div class="crm-actions">' + (isNew ? '' : '<button type="button" class="crm-close" data-crm="close">Закрыть сделку</button>') + '<button type="submit" class="calculate">' + (isNew ? 'Создать сделку' : 'Сохранить') + '</button></div>'
      + (isNew ? '' : '<button type="button" class="v3c-link crm-del" data-crm="del">Удалить сделку</button>') + '</form></div>'
      + '<div class="crm-right k">' + (isNew ? '<p class="v3p-muted">Заполните поля слева и нажмите «Создать сделку». После этого здесь появятся история, заметки, файлы и КП.</p>' :
        '<div class="crm-tabs" role="tablist"><button type="button" class="chip on" data-ct="act">Активность (' + (x.activity || []).length + ')</button><button type="button" class="chip" data-ct="files">Файлы (' + (x.files || []).length + ')</button><button type="button" class="chip" data-ct="kp">КП (' + quotes.length + ')</button><button type="button" class="chip" data-ct="calc">Калькулятор</button></div>'
        + '<div class="crm-pane" data-cp="act"><div class="crm-acts">' + activity(x) + '</div><form class="crm-note" id="crmNote"><select name="type" aria-label="Тип записи"><option value="note">📝 Примечание</option><option value="call">📞 Звонок</option><option value="mail">✉️ Письмо</option><option value="rate">💲 Ставка</option></select><textarea name="text" rows="3" placeholder="Текст заметки, итоги звонка, ставка агента…" required></textarea><button type="submit" class="calculate v3p-sm">Добавить</button></form></div>'
        + '<div class="crm-pane" data-cp="files" hidden><div class="crm-files">' + ((x.files || []).map(function (f) { return '<a class="crm-file" href="/api/deals/' + esc(x.id) + '/files/' + esc(f.id) + '" target="_blank" rel="noopener"><span>📎</span><b>' + esc(f.name) + '</b><small>' + Math.max(1, Math.round(f.size / 1024)) + ' КБ · ' + d(f.at) + '</small></a>'; }).join('') || '<p class="v3p-muted">Файлов пока нет.</p>') + '</div><label class="v3-drop crm-upl"><input type="file" id="crmFile" hidden>＋ Добавить файл (инвойс, упаковочный лист, договор…)</label></div>'
        + '<div class="crm-pane" data-cp="kp" hidden>' + (quotes.length ? quotes.map(function (q) { return '<a class="crm-file" href="/#kp=' + esc(q.id) + '" target="_blank" rel="noopener"><span>📄</span><b>' + esc(q.number) + ' · ' + fmt(q.price) + ' ' + esc(q.currency) + '</b><small>' + esc(q.basis || '') + ' · ' + d(q.createdAt) + '</small></a>'; }).join('') : '<p class="v3p-muted">КП по этой сделке пока нет. Откройте «Калькулятор», посчитайте и нажмите «Создать КП» — оно привяжется к сделке.</p>') + '</div>'
        + '<div class="crm-pane" data-cp="calc" hidden><p>Откроем калькулятор с данными сделки: ' + esc(x.from || '—') + ' → ' + esc(x.to || '—') + (x.weight ? ', ' + fmt(x.weight) + ' кг' : '') + (x.volume ? ', ' + fmt(x.volume) + ' м³' : '') + '.</p><button type="button" class="calculate" data-crm="calc">Посчитать доставку →</button></div>')
      + '</div></div>';
    $('#crmForm').addEventListener('submit', function (e) { e.preventDefault(); save(); });
    var nf = $('#crmNote'); nf && nf.addEventListener('submit', function (e) { e.preventDefault(); api('/api/deals/' + encodeURIComponent(x.id) + '/notes', { method: 'POST', body: { type: nf.type.value, text: nf.text.value } }).then(function (r) { cur = r.item; $('.crm-acts').innerHTML = activity(cur); nf.text.value = ''; }).catch(function (er) { toast(er.message); }); });
    var fi = $('#crmFile'); fi && fi.addEventListener('change', function () { var f = fi.files[0]; if (!f) return; var fd = new FormData(); fd.append('file', f); api('/api/deals/' + encodeURIComponent(x.id) + '/files', { method: 'POST', body: fd }).then(function () { openDeal(x.id); }).catch(function (er) { toast(er.message); }); });
    $('.crm-stage', box).addEventListener('change', function () { this.className = 'crm-stage s-' + (STC[this.value] || 'q'); });
  }
  function formBody() { var f = $('#crmForm'), b = {}; $$('input[name],select[name]', f).forEach(function (i) { b[i.name] = i.value; }); $$('[form=crmForm]').forEach(function (i) { b[i.name] = i.value; }); return b; }
  function save(extra) {
    var b = formBody(); for (var k in extra) b[k] = extra[k];
    var p = cur && cur.id ? api('/api/deals/' + encodeURIComponent(cur.id), { method: 'PATCH', body: b }) : api('/api/deals', { method: 'POST', body: b });
    return p.then(function (r) { toast('Сохранено'); META = null; openDeal(r.item.id); }).catch(function (x) { toast(x.message); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-deal],[data-crm],[data-ct],[data-cli]'); if (!t || !t.closest('#workView')) return;
    if (t.dataset.deal) return openDeal(t.dataset.deal);
    if (t.dataset.ct) { $$('.crm-tabs .chip').forEach(function (c) { c.classList.toggle('on', c === t); }); $$('.crm-pane').forEach(function (p) { p.hidden = p.dataset.cp !== t.dataset.ct; }); return; }
    if (t.dataset.cli) { $('#workView [data-tab=deals]').click(); filt.q = t.dataset.cli; filt.open = ''; var q = $('#crmQ'); if (q) q.value = t.dataset.cli; var o = $('#crmOpen'); if (o) o.checked = false; return loadDeals(); }
    var a = t.dataset.crm;
    if (a === 'back') loadDeals();
    if (a === 'close') { var won = confirm('Сделка успешна? «ОК» — успешно, «Отмена» — закрыть без результата.'); save({ stage: won ? 'Успешно' : 'Закрыта' }); }
    if (a === 'del' && confirm('Удалить сделку безвозвратно?')) api('/api/deals/' + encodeURIComponent(cur.id), { method: 'DELETE' }).then(loadDeals).catch(function (x) { toast(x.message); });
    if (a === 'calc') { var v = function (id, val) { var el = document.getElementById(id); if (el && val != null && val !== '') { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      v('fromCity', cur.from); v('toCity', cur.to); v('weight', cur.weight); window.__crmDeal = cur.id; window.__iomaOpenView && window.__iomaOpenView('calculator'); setTimeout(function () { window.__v3calc && window.__v3calc(); }, 200); }
  });

  /* ---------------- база клиентов ---------------- */
  var cf = { q: '', status: '', sort: 'recent' };
  function loadClientsDb() {
    var box = $('#crmClients'); if (!box) return;
    if (!box.dataset.ready) { box.dataset.ready = '1';
      box.insertAdjacentHTML('beforebegin', '<div class="crm-bar" id="crmCliBar"><div class="crm-search"><input type="search" id="crmCliQ" placeholder="Поиск: имя, компания, почта, телефон" aria-label="Поиск клиентов"></div><div class="crm-funnels" role="group" aria-label="Статус"><button type="button" class="chip on" data-cs="">Все</button><button type="button" class="chip" data-cs="current">Текущие</button><button type="button" class="chip" data-cs="past">Прошлые</button></div><select id="crmCliSort" aria-label="Сортировка"><option value="recent">По последней активности</option><option value="added">По дате добавления</option><option value="frequency">По частоте обращений</option></select></div>');
      var t; $('#crmCliQ').addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { cf.q = $('#crmCliQ').value; loadClientsDb(); }, 250); });
      $('#crmCliSort').addEventListener('change', function () { cf.sort = this.value; loadClientsDb(); });
      $('#crmCliBar').addEventListener('click', function (e) { var c = e.target.closest('[data-cs]'); if (!c) return; cf.status = c.dataset.cs; $$('#crmCliBar [data-cs]').forEach(function (x) { x.classList.toggle('on', x === c); }); loadClientsDb(); });
    }
    var q = Object.keys(cf).filter(function (k) { return cf[k]; }).map(function (k) { return k + '=' + encodeURIComponent(cf[k]); }).join('&');
    api('/api/crm/clients?' + q).then(function (r) {
      box.innerHTML = '<div class="crm-h"><b>Клиенты (' + r.items.length + ')</b></div>' + (r.items.length ? '<div class="crm-table crm-clients"><div class="crm-tr crm-th"><span>Клиент</span><span>Контакты</span><span>Сделок</span><span>Добавлен</span><span>Последняя активность</span><span></span></div>'
        + r.items.map(function (c) { var key = c.email || c.phone || c.name; return '<button type="button" class="crm-tr" data-cli="' + esc(key) + '"><span class="crm-t"><b>' + esc(c.name || c.company || '—') + '</b><small>' + esc(c.company && c.name ? c.company : '') + '</small></span><span class="crm-mut">' + esc([c.phone, c.email].filter(Boolean).join(' · ')) + '</span><span><b>' + c.deals + '</b>' + (c.open ? ' <small class="crm-mut">открыто ' + c.open + '</small>' : '') + (c.quotes ? ' <small class="crm-mut">· КП ' + c.quotes + '</small>' : '') + '</span><span class="crm-mut">' + d(c.firstAt) + '</span><span class="crm-mut">' + d(c.lastAt) + '</span><span>' + (c.current ? '<em class="crm-st s-g">текущий</em>' : '<em class="crm-st s-x">прошлый</em>') + (c.cabinet ? ' <em class="crm-src">кабинет</em>' : '') + '</span></button>'; }).join('') + '</div>'
        : '<div class="k v3p-empty"><b>Клиентов пока нет</b><small>Сюда попадают клиенты с кабинетом и все контакты из сделок.</small></div>');
    }).catch(function (x) { box.innerHTML = '<p class="v3p-err">' + esc(x.message) + '</p>'; });
  }

  /* ---------------- тарифы для расчёта ---------------- */
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
        api('/api/tariffs', { method: 'PUT', body: { tariffs: o } }).then(function () { toast('Тарифы сохранены'); }).catch(function (x) { toast(x.message); }); });
    }).catch(function (x) { box.innerHTML = '<p class="v3p-err">' + esc(x.message) + '</p>'; });
  }

  // вкладки «Работы»
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('#workView .v3p-tabs .chip'); if (!t) return;
    if (t.dataset.tab === 'deals') loadDeals(); if (t.dataset.tab === 'clients') loadClientsDb(); if (t.dataset.tab === 'tariffs') loadTariffs(); });
  window.IOMA_CRM = { loadDeals: loadDeals, openDeal: openDeal, loadClientsDb: loadClientsDb };
})();
