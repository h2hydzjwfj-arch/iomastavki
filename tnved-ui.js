/* IOMASTAVKA — «Коды ТН ВЭД»: собственный справочник (импорт, поиск по части названия и цифрам кода, правка)
   и поиск по названию в окне «Проверка ТН ВЭД». Только своя база — без платных внешних сервисов. */
(function () {
  'use strict';
  var K = window.CX; if (!K) return;
  var $ = K.$, $$ = K.$$, esc = K.esc, api = K.api, toast = K.toast;
  function fmtCode(c) { c = String(c || ''); return c.length === 10 ? c.slice(0, 4) + ' ' + c.slice(4, 6) + ' ' + c.slice(6, 9) + ' ' + c.slice(9) : c; }
  function hl(text, q) { var t = esc(text || ''); var w = String(q || '').toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(function (x) { return x.length > 2 && !/^\d+$/.test(x); }); w.forEach(function (x) { var stem = x.length > 5 ? x.slice(0, x.length - 2) : x; t = t.replace(new RegExp('(' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); }); return t; }
  var Q = '', qT = null, gen = 0;
  function load() {
    var box = $('#cxTnved'); if (!box) return;
    api('/api/tnved/stats').then(function (s) {
      box.innerHTML = '<div class="cx-intro"><p>Собственный справочник кодов ТН ВЭД ЕАЭС: ставки пошлины, НДС, акциз, разрешительные документы и маркировка. Поиск работает по части названия («куртк муж») и по цифрам кода («6201», «8517 13»). Калькулятор ВЭД и «Проверка ТН ВЭД» берут данные отсюда.</p></div>'
        + '<div class="cx-metrics">' + '<div class="cx-metric"><small>Кодов в базе</small><b>' + K.num(s.count) + '</b><span>' + (s.groups || 0) + ' групп</span></div><div class="cx-metric"><small>С разрешительными документами</small><b>' + K.num(s.withCert || 0) + '</b></div><div class="cx-metric"><small>С маркировкой</small><b>' + K.num(s.withMarking || 0) + '</b></div><div class="cx-metric"><small>Обновлено</small><b class="sm">' + (s.importedAt ? K.d(s.importedAt) : '—') + '</b><span>' + esc(s.source || '') + '</span></div></div>'
        + '<details class="k cx-imp"' + (s.count ? '' : ' open') + '><summary><b>Загрузить справочник</b> — Excel, CSV или JSON до 20 000 строк</summary><p class="cx-mut">Нужны колонки с заголовками: <b>Код</b>, <b>Наименование</b>, <b>Пошлина</b> («10%», «5%, но не менее 0,2 евро/кг»), <b>НДС</b>; по желанию — <b>Акциз</b>, <b>Ед. изм.</b>, <b>Сертификат</b> (СС / ДС / СГР / не требуется), <b>Регламент</b>, <b>Маркировка</b>, <b>Примечание</b>, <b>Приложение 1</b> (да — для сбора 73 860 ₽). Порядок колонок любой.</p>'
        + '<label class="cx-drop" data-tz><input type="file" accept=".xlsx,.csv,.json,.txt" hidden data-tf><b>📎 Перетащите файл сюда или нажмите для выбора</b><small>Совпадающие коды обновятся, новые добавятся.</small></label><label class="cx-cbx"><input type="checkbox" data-replace> Заменить весь справочник (старые коды удалятся)</label><p class="cx-mut" data-ts></p></details>'
        + '<div class="cx-bar"><div class="cx-search big"><input type="search" data-tq value="' + esc(Q) + '" placeholder="Название товара или цифры кода" aria-label="Поиск по справочнику ТН ВЭД" autocomplete="off"></div><button type="button" class="cx-btn" data-tn="add">+ Код вручную</button></div><div data-tr></div>';
      var dz = $('[data-tz]', box), up = function (f) { var st = $('[data-ts]', box); st.textContent = '⏳ Загружаю ' + f.name + '…'; var fd = new FormData(); fd.append('file', f); if ($('[data-replace]', box).checked) fd.append('mode', 'replace');
        api('/api/tnved/import', { method: 'POST', body: fd }).then(function (r) { toast('Справочник обновлён: добавлено ' + r.added + ', обновлено ' + r.updated); load(); }).catch(function (e) { st.textContent = '❌ ' + e.message; }); };
      K.dropzone(dz, function (fl) { up(fl[0]); }); $('[data-tf]', box).addEventListener('change', function () { if (this.files[0]) up(this.files[0]); });
      $('[data-tq]', box).addEventListener('input', function () { var v = this.value; clearTimeout(qT); qT = setTimeout(function () { Q = v; search(); }, 220); });
      box.onclick = function (e) { var b = e.target.closest('[data-tn]'); if (!b) return; if (b.dataset.tn === 'add') return editForm(null); if (b.dataset.tn === 'open') return openCode(b.dataset.code); };
      search();
    }).catch(function (e) { box.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  function search() {
    var out = $('#cxTnved [data-tr]'); if (!out) return; var my = ++gen;
    if (Q.trim().length < 2) { out.innerHTML = '<p class="cx-empty">Введите хотя бы 2 символа — часть названия или цифры кода.</p>'; return; }
    api('/api/tnved/search?limit=100&q=' + encodeURIComponent(Q)).then(function (r) {
      if (my !== gen) return;
      out.innerHTML = r.items.length ? '<p class="cx-mut">Найдено: ' + r.total + (r.total > r.items.length ? ', показаны первые ' + r.items.length : '') + '</p><div class="cx-table cx-tn"><div class="cx-tr cx-thd"><span>Код</span><span>Наименование</span><span>Пошлина</span><span>НДС</span><span>Документы</span><span>Маркировка</span></div>'
        + r.items.map(function (x) { return '<button type="button" class="cx-tr" data-tn="open" data-code="' + esc(x.code) + '"><span class="cx-code">' + esc(fmtCode(x.code)) + (x.radio ? ' <em class="cx-tag amb" title="Приложение № 1 к ПП № 1637 — сбор 73 860 ₽">прил. 1</em>' : '') + '</span><span class="cx-t"><b>' + hl(x.name, Q) + '</b></span><span>' + esc(x.duty || '—') + '</span><span>' + esc(x.vat || '—') + '</span><span class="cx-mut">' + esc(x.cert || '—') + '</span><span class="cx-mut">' + esc(x.marking || '—') + '</span></button>'; }).join('') + '</div>'
        : '<p class="cx-empty">Ничего не найдено. Попробуйте короче: первые буквы слова или первые цифры кода.</p>';
    }).catch(function (e) { out.innerHTML = '<p class="v3p-err">' + esc(e.message) + '</p>'; });
  }
  var FL = [['code', 'Код (4–10 цифр)'], ['name', 'Наименование', 'wide'], ['duty', 'Пошлина'], ['vat', 'НДС'], ['excise', 'Акциз'], ['unit', 'Доп. единица'], ['cert', 'Разрешительные документы'], ['reglament', 'Техрегламенты'], ['marking', 'Маркировка «Честный знак»'], ['note', 'Примечание', 'wide']];
  function openCode(code) {
    api('/api/tnved/code/' + encodeURIComponent(code)).then(function (r) {
      var x = r.item, c = r.calc, ct = r.cert;
      var html = '<p class="cx-code big">' + esc(fmtCode(x.code)) + (x.exact ? '' : ' <small class="cx-mut">(ближайшая позиция)</small>') + '</p><p>' + esc(x.name || '') + '</p>'
        + '<div class="cx-tnc"><div><small>Пошлина</small><b>' + esc(x.duty || '—') + '</b>' + (c && c.duty_type !== 'percent' ? '<span>для калькулятора: ' + ({ min: c.duty_value + '%, но не менее ', plus: c.duty_value + '% плюс ', fixed_eur: '' }[c.duty_type] || '') + V(c) + ' €/' + esc(c.eur_unit) + '</span>' : '') + '</div><div><small>НДС</small><b>' + esc(x.vat || 'общая ставка') + '</b>' + (c ? '<span>в расчёте: ' + c.vat_rate + '%</span>' : '') + '</div><div><small>Акциз</small><b>' + esc(x.excise || '—') + '</b></div><div><small>Документы</small><b>' + esc(ct.cert ? ct.cert.doc_type : '—') + '</b>' + (x.reglament ? '<span>' + esc(x.reglament) + '</span>' : '') + '</div><div><small>Честный знак</small><b>' + esc(ct.honest_sign ? (ct.honest_sign.required ? 'обязателен' : ct.honest_sign.experiment ? 'эксперимент' : 'не требуется') : '—') + '</b></div><div><small>Таможенный сбор</small><b>' + (x.radio ? '73 860 ₽ (прил. № 1)' : 'по шкале') + '</b></div></div>' + (x.note ? '<p class="cx-mut">' + esc(x.note) + '</p>' : '');
      var md = K.modal('Код ТН ВЭД', html, '<button type="button" class="cx-link danger" data-del>Удалить</button><button type="button" class="cx-btn" data-edit>Изменить</button><button type="button" class="cx-btn primary" data-check>Полная проверка кода →</button>', { wide: true, noFocus: true });
      $('[data-edit]', md.el).addEventListener('click', function () { md.close(); editForm(x); });
      $('[data-del]', md.el).addEventListener('click', function () { K.confirm('Удалить код из справочника?', 'Удалить', true).then(function (ok) { if (ok) api('/api/tnved/code/' + x.code, { method: 'DELETE' }).then(function () { md.close(); load(); }); }); });
      $('[data-check]', md.el).addEventListener('click', function () { md.close(); openCheck(x.code); });
    }).catch(function (e) { toast(e.message, 'err'); });
  }
  function V(c) { return c.eur_unit === 'м²' ? c.eur_per_m2 : c.eur_unit === 'л' ? c.eur_per_l : (c.eur_unit === 'шт' || c.eur_unit === 'пар') ? c.eur_per_pcs : c.eur_per_kg; }
  function editForm(x) {
    x = x || {};
    var html = '<div class="cx-grid2">' + FL.map(function (f) { return '<label class="cx-f' + (f[2] ? ' wide' : '') + '"><span>' + f[1] + '</span>' + (f[0] === 'name' || f[0] === 'note' ? '<textarea data-k="' + f[0] + '" rows="2">' + esc(x[f[0]] || '') + '</textarea>' : '<input data-k="' + f[0] + '" value="' + esc(x[f[0]] || '') + '"' + (f[0] === 'code' && x.code ? ' readonly' : '') + '>') + '</label>'; }).join('') + '</div><label class="cx-cbx"><input type="checkbox" data-radio' + (x.radio ? ' checked' : '') + '> Товар из Приложения № 1 к ПП № 1637 (сбор 73 860 ₽)</label>';
    var md = K.modal(x.code ? 'Изменить код ' + fmtCode(x.code) : 'Новый код', html, '<button type="button" class="cx-btn ghost" data-cx="close">Отмена</button><button type="button" class="cx-btn primary" data-ok>Сохранить</button>', { wide: true });
    $('[data-ok]', md.el).addEventListener('click', function () { var b = {}; $$('[data-k]', md.el).forEach(function (i) { b[i.dataset.k] = i.value; }); b.radio = $('[data-radio]', md.el).checked; var code = String(b.code || '').replace(/\D/g, ''); if (code.length < 4) return toast('Код — от 4 до 10 цифр', 'err');
      K.guard(this, function () { return api('/api/tnved/code/' + code, { method: 'PUT', body: b }).then(function () { md.close(); toast('Сохранено'); Q = code; load(); }); }); });
  }
  function openCheck(code) { if (window.__iomaOpenView) window.__iomaOpenView('customsView'); setTimeout(function () { var i = document.getElementById('customsCode'); if (i) { i.value = code; var b = document.getElementById('customsCheck'); if (b) b.click(); } }, 200); }
  K.on('tnved', load);

  /* ---------- «Проверка ТН ВЭД»: поиск кода по названию в собственном справочнике ---------- */
  function enhanceCustoms() {
    var form = document.querySelector('#customsView .customs-form'); if (!form || document.getElementById('customsFind')) return;
    var wrap = document.createElement('div'); wrap.className = 'cx-cfind';
    wrap.innerHTML = '<input id="customsFind" type="search" autocomplete="off" placeholder="Не знаете код? Начните вводить название товара: «смартфон», «куртка мужская»…" aria-label="Поиск кода по названию товара"><div class="cx-cres" id="customsFindRes" hidden></div>';
    form.parentNode.insertBefore(wrap, form);
    var local = document.createElement('div'); local.id = 'customsLocal'; local.className = 'cx-clocal'; local.hidden = true;
    var res0 = document.getElementById('customsStatus'); if (res0) res0.parentNode.insertBefore(local, res0);
    var inp = $('#customsFind'), out = $('#customsFindRes'), t = null, g = 0;
    inp.addEventListener('input', function () { var q = inp.value.trim(); clearTimeout(t); if (q.length < 2) { out.hidden = true; return; } var my = ++g;
      t = setTimeout(function () { api('/api/tnved/search?limit=12&q=' + encodeURIComponent(q)).then(function (r) { if (my !== g) return; out.hidden = false; out.innerHTML = r.items.length ? r.items.map(function (x) { return '<button type="button" data-code="' + esc(x.code) + '"><span class="cx-code">' + esc(fmtCode(x.code)) + '</span><span>' + hl(x.name, q) + '</span><small>' + esc([x.duty, x.vat ? 'НДС ' + x.vat : ''].filter(Boolean).join(' · ')) + '</small></button>'; }).join('') + (r.total > r.items.length ? '<p class="cx-mut">Ещё ' + (r.total - r.items.length) + ' — уточните запрос</p>' : '') : '<p class="cx-mut">' + (r.total === 0 && !document.body.classList.contains('role-admin') ? '' : 'В справочнике не нашлось. Загрузите справочник в «Работа» → «Коды ТН ВЭД».') + '</p>'; }).catch(function (e) { out.hidden = false; out.innerHTML = '<p class="cx-mut">' + esc(e.message) + '</p>'; }); }, 200); });
    out.addEventListener('click', function (e) { var b = e.target.closest('[data-code]'); if (!b) return; out.hidden = true; inp.value = ''; var ci = document.getElementById('customsCode'); ci.value = b.dataset.code; showLocal(b.dataset.code); var cb = document.getElementById('customsCheck'); if (cb && b.dataset.code.length === 10) cb.click(); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) out.hidden = true; });
    var cb = document.getElementById('customsCheck'); if (cb) cb.addEventListener('click', function () { var v = (document.getElementById('customsCode').value || '').replace(/\D/g, ''); if (v.length >= 4) showLocal(v); });
  }
  function showLocal(code) {
    var box = document.getElementById('customsLocal'); if (!box) return;
    api('/api/tnved/code/' + encodeURIComponent(code)).then(function (r) { var x = r.item;
      box.hidden = false; box.innerHTML = '<div class="cx-clh"><b>Из собственного справочника</b>' + (x.exact ? '' : '<small>точного кода нет — ближайшая позиция ' + esc(fmtCode(x.code)) + '</small>') + '</div><p>' + esc(x.name || '') + '</p><div class="cx-tnc"><div><small>Пошлина</small><b>' + esc(x.duty || '—') + '</b></div><div><small>НДС</small><b>' + esc(x.vat || '—') + '</b></div><div><small>Документы</small><b>' + esc(x.cert || '—') + '</b></div><div><small>Честный знак</small><b>' + esc(x.marking || '—') + '</b></div>' + (x.radio ? '<div><small>Сбор</small><b>73 860 ₽</b></div>' : '') + '</div>';
    }).catch(function () { box.hidden = true; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceCustoms); else enhanceCustoms();
  window.IOMA_TNVED = { load: load, openCode: openCode };
})();
