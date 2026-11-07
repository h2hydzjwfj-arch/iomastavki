/* IOMASTAVKA — робот-помощник администратора: плавающая кнопка, которую можно перетащить куда удобно (место запоминается).
   Принимает текст и файлы, показывает, что понял (агент, КП со ставками, груз, текст сайта, цвет), — поля можно поправить —
   и раскладывает по местам только после «Применить». Закрывается только крестиком. */
(function () {
  'use strict';
  var KEY = 'iomaRobotPos', SIZE = 58;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isAdmin() { return document.body.classList.contains('role-admin'); }
  function api(url, opt) {
    opt = opt || {}; var o = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opt.form) o.body = opt.form; else if (opt.body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opt.body); }
    return fetch(url, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (r.status === 401 || r.status === 403) throw new Error('Вы вышли из аккаунта — войдите снова'); if (!r.ok || d.ok === false) throw new Error(d.error || 'Ошибка ' + r.status); return d; }); });
  }
  var ROBOT = '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="rb-ant" d="M16 3.5v4"/><circle class="rb-ant-c" cx="16" cy="3" r="1.6"/><rect x="6" y="8" width="20" height="16" rx="6"/><circle class="rb-eye" cx="12" cy="15.5" r="2"/><circle class="rb-eye" cx="20" cy="15.5" r="2"/><path d="M12.5 20.5h7"/><path d="M3.5 14v4M28.5 14v4"/></svg>';
  var CLIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8.6-8.6a3.4 3.4 0 014.8 4.8l-8.5 8.5a1.7 1.7 0 01-2.4-2.4l7.7-7.7"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>';
  var MODES = [['', '—'], ['auto', 'Авто'], ['rail', 'ЖД'], ['sea', 'Море + ЖД'], ['air', 'Авиа']];
  var BASIS = [['weight', 'за кг'], ['volume', 'за м³'], ['container', 'за контейнер'], ['shipment', 'за партию / машину']];
  var EX = ['Добавь агента ООО «Восток Карго», Иван Петров, ivan@vostok.ru, +7 914 555-12-34, авто и ЖД', 'Груз: сумки и рюкзаки, 780 кг, 6 мест, из Синьчжоу в Москву, авиа', 'Замени «Купим и привезём» на «Купим, проверим и привезём»', 'Сделай акцентный цвет #D35400'];
  var btn, panel, log, ta, fileIn, file = null, aiOn = null, suppress = false, drag = null;

  function pos() { try { var p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && isFinite(p.x) && isFinite(p.y)) return p; } catch (e) {} return null; }
  function clamp(x, y) { return { x: Math.max(8, Math.min(window.innerWidth - SIZE - 8, x)), y: Math.max(8, Math.min(window.innerHeight - SIZE - 8, y)) }; }
  function setPos(x, y) { var p = clamp(x, y); btn.style.left = p.x + 'px'; btn.style.top = p.y + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto'; return p; }
  function placeDefault() { var p = pos(); if (p) setPos(p.rx != null ? window.innerWidth * p.rx : p.x, p.ry != null ? window.innerHeight * p.ry : p.y); else setPos(window.innerWidth - SIZE - 24, window.innerHeight - SIZE - 24); }
  function save() { var r = btn.getBoundingClientRect(); try { localStorage.setItem(KEY, JSON.stringify({ x: r.left, y: r.top, rx: r.left / window.innerWidth, ry: r.top / window.innerHeight })); } catch (e) {} }

  function build() {
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rb-btn'; btn.setAttribute('aria-label', 'Робот-помощник'); btn.title = 'Робот-помощник — перетащите, куда удобно';
    btn.innerHTML = ROBOT + '<i class="rb-dot" aria-hidden="true"></i>';
    document.body.appendChild(btn); placeDefault();
    btn.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; var r = btn.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, bx: r.left, by: r.top, moved: false }; try { btn.setPointerCapture(e.pointerId); } catch (er) {} });
    btn.addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; btn.classList.add('drag'); } if (drag.moved) { setPos(drag.bx + dx, drag.by + dy); if (panel && !panel.hidden) placePanel(); } });
    btn.addEventListener('pointerup', function () { if (!drag) return; if (drag.moved) { suppress = true; save(); btn.classList.remove('drag'); } drag = null; });
    btn.addEventListener('pointercancel', function () { if (drag && drag.moved) save(); btn.classList.remove('drag'); drag = null; });
    btn.addEventListener('click', function () { if (suppress) { suppress = false; return; } toggle(); });
    window.addEventListener('resize', function () { placeDefault(); if (panel && !panel.hidden) placePanel(); });
  }

  function buildPanel() {
    panel = document.createElement('div'); panel.className = 'rb-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Робот-помощник');
    panel.innerHTML = '<div class="rb-h"><span class="rb-ava">' + ROBOT + '</span><div class="rb-ht"><b>Робот-помощник</b><small data-ai>…</small></div><button type="button" class="rb-x" aria-label="Закрыть">×</button></div>'
      + '<div class="rb-log" aria-live="polite"></div>'
      + '<form class="rb-in"><div class="rb-file" hidden></div><textarea rows="2" placeholder="Текст или файл: агент, КП со ставками, груз, «замени «…» на «…»», цвет"></textarea>'
      + '<div class="rb-act"><label class="rb-att" title="Приложить файл: Excel, Word, текст' + '; PDF и фото — с ИИ">' + CLIP + '<input type="file" hidden accept=".xlsx,.xlsm,.docx,.txt,.csv,.eml,.md,.pdf,.png,.jpg,.jpeg,.webp"></label><button type="button" class="rb-site">Правки сайта</button><button type="submit" class="rb-send" aria-label="Отправить">' + SEND + '</button></div></form>'
      + '<div class="rb-drop" aria-hidden="true">Отпустите файл — разберу</div>';
    document.body.appendChild(panel);
    log = $('.rb-log', panel); ta = $('textarea', panel); fileIn = $('input[type=file]', panel);
    $('.rb-x', panel).addEventListener('click', function () { panel.hidden = true; btn.classList.remove('on'); });
    $('.rb-in', panel).addEventListener('submit', function (e) { e.preventDefault(); send(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    ta.addEventListener('input', grow);
    fileIn.addEventListener('change', function () { if (fileIn.files[0]) setFile(fileIn.files[0]); fileIn.value = ''; });
    $('.rb-site', panel).addEventListener('click', siteEdits);
    ['dragenter', 'dragover'].forEach(function (ev) { panel.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); panel.classList.add('dropping'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { panel.addEventListener(ev, function (e) { if (ev === 'dragleave' && panel.contains(e.relatedTarget)) return; panel.classList.remove('dropping'); }); });
    panel.addEventListener('drop', function (e) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setFile(f); });
    log.addEventListener('click', onLog);
    hello();
  }
  function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; }
  function setFile(f) { file = f; var box = $('.rb-file', panel); box.hidden = false; box.innerHTML = CLIP + '<span>' + esc(f.name) + '</span><button type="button" aria-label="Убрать файл">×</button>'; $('button', box).onclick = function () { file = null; box.hidden = true; box.innerHTML = ''; }; ta.focus(); }
  function placePanel() {
    var r = btn.getBoundingClientRect(), W = Math.min(410, window.innerWidth - 16), vw = window.innerWidth, vh = window.innerHeight;
    if (vw < 560) { panel.style.cssText = 'left:8px;right:8px;width:auto;bottom:8px;top:auto;max-height:' + Math.round(vh * .82) + 'px'; return; }
    var up = r.top - 18, down = vh - r.bottom - 18, onRight = r.left + r.width / 2 > vw / 2, side = onRight ? r.left - 12 : vw - r.right - 12;
    // мало места сверху и снизу, но есть сбоку — окно рядом с кнопкой, во всю высоту
    if (Math.max(up, down) < 560 && side >= W + 8) {
      var H = Math.min(680, vh - 16), top = Math.max(8, Math.min(vh - H - 8, r.top + r.height / 2 - H / 2));
      panel.style.cssText = 'width:' + W + 'px;left:' + (onRight ? r.left - 12 - W : r.right + 12) + 'px;right:auto;top:' + top + 'px;bottom:auto;max-height:' + H + 'px';
      return;
    }
    var left = Math.max(8, Math.min(vw - W - 8, onRight ? r.right - W : r.left)), below = down > up;
    var maxH = Math.max(320, Math.min(680, below ? down : up));
    panel.style.cssText = 'width:' + W + 'px;left:' + left + 'px;right:auto;max-height:' + maxH + 'px;' + (below ? 'top:' + Math.min(vh - maxH - 8, r.bottom + 10) + 'px;bottom:auto' : 'bottom:' + Math.max(8, vh - r.top + 10) + 'px;top:auto');
  }
  function toggle() {
    if (!panel) buildPanel();
    var open = panel.hidden; panel.hidden = !open; btn.classList.toggle('on', open);
    if (open) { placePanel(); status(); setTimeout(function () { ta.focus(); }, 60); }
  }
  function status() {
    api('/api/robot').then(function (d) { aiOn = !!d.ai; $('[data-ai]', panel).innerHTML = aiOn ? '<i class="ok"></i>ИИ подключён — понимаю свободный текст, PDF и фото' : '<i></i>Работаю по правилам. С ИИ пойму больше: ключ OPENAI_API_KEY в Render'; }).catch(function (e) { $('[data-ai]', panel).textContent = e.message; });
  }
  function say(html, who) { var d = document.createElement('div'); d.className = 'rb-m ' + (who || 'bot'); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function hello() {
    say('<p>Пришлите текст или файл — разложу по местам. Ничего не меняю без вашего «Применить».</p><div class="rb-ex">' + EX.map(function (x) { return '<button type="button" data-ex="' + esc(x) + '">' + esc(x.length > 58 ? x.slice(0, 56) + '…' : x) + '</button>'; }).join('') + '</div>'
      + '<p class="rb-small">Умею: новый агент · КП агента → ставки · груз → сделка в CRM · тексты сайта · цвет сайта · список агентов из Excel.</p>');
  }

  function send() {
    var text = ta.value.trim(); if (!text && !file) { ta.focus(); return; }
    say(esc(text || '').replace(/\n/g, '<br>') + (file ? '<span class="rb-fchip">' + CLIP + esc(file.name) + '</span>' : ''), 'me');
    var fd = new FormData(); fd.append('text', text); if (file) fd.append('file', file);
    ta.value = ''; grow(); var fb = $('.rb-file', panel); fb.hidden = true; fb.innerHTML = ''; file = null;
    var wait = say('<span class="rb-typing"><i></i><i></i><i></i></span> Разбираю…');
    api('/api/robot/parse', { method: 'POST', form: fd }).then(function (d) {
      wait.remove();
      if (d.ai === 'failed') say('<p class="rb-small">ИИ не ответил' + (d.aiError ? ' (' + esc(d.aiError) + ')' : '') + ' — разобрал по правилам.</p>');
      if (!d.items.length) { say('<p>' + esc(d.note || 'Не понял, что сделать.') + '</p>'); return; }
      var m = say('<p>Вот что я понял — поправьте, если нужно, и нажмите «Применить»:</p>');
      d.items.forEach(function (it) { m.appendChild(card(it)); });
      log.scrollTop = log.scrollHeight;
    }).catch(function (e) { wait.remove(); say('<p class="rb-err">' + esc(e.message) + '</p>'); });
  }

  /* ---------- карточки «что понял» ---------- */
  function inp(k, label, v, o) {
    o = o || {}; var id = 'rb' + Math.random().toString(36).slice(2, 8);
    var ctl = o.opts ? '<select id="' + id + '" data-k="' + k + '">' + o.opts.map(function (p) { return '<option value="' + p[0] + '"' + (String(v || '') === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>'
      : o.area ? '<textarea id="' + id + '" data-k="' + k + '" rows="2">' + esc(v) + '</textarea>'
      : '<input id="' + id + '" data-k="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (o.num ? ' inputmode="decimal"' : '') + '>';
    return '<label class="rb-f' + (o.wide ? ' w' : '') + '" for="' + id + '"><span>' + label + '</span>' + ctl + '</label>';
  }
  var TITLE = { agent: 'Новый агент', agents: 'Список агентов', rates: 'КП агента → ставки', cargo: 'Груз → сделка в CRM', text: 'Текст на сайте', theme: 'Цвет сайта' };
  var ICON = { agent: '<path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0"/>', agents: '<path d="M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 19a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 6.5M18 13.5a6.5 6.5 0 013.5 5.5"/>', rates: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>', cargo: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>', text: '<path d="M4 6h16M4 12h10M4 18h7M17 14l3 3-3 3"/>', theme: '<path d="M12 3a9 9 0 100 18c1.1 0 1.6-.9 1.2-1.8-.5-1.1.2-2.2 1.4-2.2H17a4 4 0 004-4c0-5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>' };
  function card(it) {
    var d = it.data || {}, c = document.createElement('div'), h = '';
    c.className = 'rb-card'; c.dataset.kind = it.kind; c._it = it;
    var title = TITLE[it.kind] || it.kind; if (it.kind === 'agent' && it.exists) title = 'Агент уже есть — дополню контакты';
    h += '<div class="rb-ch"><svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[it.kind] || '') + '</svg><b>' + title + '</b></div><div class="rb-fs">';
    if (it.kind === 'agent') h += inp('company', 'Компания', d.company, { wide: true }) + inp('contact', 'Контакт', d.contact) + inp('phone', 'Телефон', d.phone) + inp('email', 'Почта', d.email) + inp('wechat', 'WeChat', d.wechat) + inp('transport', 'Виды транспорта', d.transport, { wide: true }) + inp('notes', 'Заметка', d.notes, { wide: true });
    if (it.kind === 'cargo') h += inp('cargo', 'Груз', d.cargo, { wide: true }) + inp('from', 'Откуда', d.from) + inp('to', 'Куда', d.to) + inp('weight', 'Вес, кг', d.weight, { num: 1 }) + inp('volume', 'Объём, м³', d.volume, { num: 1 }) + inp('places', 'Мест', d.places, { num: 1 }) + inp('mode', 'Транспорт', d.mode || '', { opts: MODES }) + inp('dims', 'Габариты', d.dims, { wide: true }) + inp('note', 'Заметка', d.note, { wide: true });
    if (it.kind === 'rates') {
      h += inp('company', 'Агент', d.company, { wide: true }) + inp('from', 'Откуда', d.from) + inp('to', 'Куда', d.to) + inp('mode', 'Транспорт', d.mode || '', { opts: MODES, wide: true }) + '</div><div class="rb-rates">'
        + (d.rates || []).map(function (r, i) { return '<div class="rb-rate" data-i="' + i + '"><label class="rb-chk"><input type="checkbox" checked data-use><i></i></label><input data-r="rate" value="' + esc(r.rate) + '" inputmode="decimal" aria-label="Сумма"><select data-r="currency" aria-label="Валюта">' + ['USD', 'CNY', 'EUR', 'RUB'].map(function (x) { return '<option' + (x === r.currency ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select><select data-r="basis" aria-label="За что">' + BASIS.map(function (b) { return '<option value="' + b[0] + '"' + (b[0] === r.basis ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('') + '</select>'
          + '<small>' + esc([r.container, r.transitDays && 'срок ' + r.transitDays, r.validUntil && 'до ' + String(r.validUntil).split('-').reverse().join('.')].filter(Boolean).join(' · ')) + '</small></div>'; }).join('') + '</div><div class="rb-fs">'
        + (it.exists ? '' : '<label class="rb-chk2"><input type="checkbox" data-k="addAgent" checked><i></i>Добавить агента в базу</label>');
    }
    if (it.kind === 'text') h += inp('find', 'Сейчас на сайте', d.find, { wide: true, area: 1 }) + inp('replace', 'Станет', d.replace, { wide: true, area: 1 }) + '<p class="rb-found w" data-found></p>';
    if (it.kind === 'theme') h += d.reset ? '<p class="rb-small w">Верну исходные цвета сайта.</p>' : '<label class="rb-f w rb-color"><span>Акцентный цвет</span><span class="rb-cw"><input type="color" data-k="accent" value="' + esc(d.accent || '#E06A2C') + '"><input data-hex value="' + esc(d.accent || '#E06A2C') + '" maxlength="7"></span></label><div class="rb-sw w" data-sw></div>';
    if (it.kind === 'agents') h += '<p class="rb-small w">В файле агентов: <b>' + (d.items || []).length + '</b>. Новые добавлю, у известных дополню пустые поля.</p><ul class="rb-list w">' + (d.items || []).slice(0, 8).map(function (a) { return '<li><b>' + esc(a.company) + '</b>' + esc([a.contact, a.email, a.transport].filter(Boolean).join(' · ')) + '</li>'; }).join('') + ((d.items || []).length > 8 ? '<li>…и ещё ' + ((d.items || []).length - 8) + '</li>' : '') + '</ul>';
    h += '</div><div class="rb-cb"><button type="button" class="rb-go" data-go>Применить</button><button type="button" class="rb-no" data-no>Убрать</button></div>';
    c.innerHTML = h;
    if (it.kind === 'text') { var upd = function () { var f = $('[data-k=find]', c).value.trim(), n = f && window.IOMA_SITE ? window.IOMA_SITE.count(f) : 0, p = $('[data-found]', c); p.className = 'rb-found w ' + (n ? 'ok' : 'warn'); p.textContent = !f ? '' : n ? 'Нашёл на сайте: ' + n + ' ' + plural(n, 'место', 'места', 'мест') : 'Такого текста на сайте не вижу — проверьте написание (буквы, кавычки, ё).'; }; $('[data-k=find]', c).addEventListener('input', upd); upd(); }
    if (it.kind === 'theme' && !d.reset) { var col = $('[data-k=accent]', c), hx = $('[data-hex]', c), sw = function () { var a = col.value; $('[data-sw]', c).innerHTML = '<i style="background:' + a + '"></i><span>Кнопки, акценты, выделения</span>'; }; col.addEventListener('input', function () { hx.value = col.value.toUpperCase(); sw(); }); hx.addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(hx.value)) { col.value = hx.value; sw(); } }); sw(); }
    return c;
  }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
  function collect(c) {
    var it = c._it, d = JSON.parse(JSON.stringify(it.data || {}));
    $$('[data-k]', c).forEach(function (e) { d[e.dataset.k] = e.type === 'checkbox' ? e.checked : e.value.trim(); });
    if (it.kind === 'rates') d.rates = $$('.rb-rate', c).map(function (row) { var r = JSON.parse(JSON.stringify((it.data.rates || [])[row.dataset.i] || {})); $$('[data-r]', row).forEach(function (e) { r[e.dataset.r] = e.value.trim(); }); r.use = $('[data-use]', row).checked; return r; });
    return d;
  }
  function onLog(e) {
    var ex = e.target.closest('[data-ex]'); if (ex) { ta.value = ex.dataset.ex; grow(); ta.focus(); return; }
    var c = e.target.closest('.rb-card'); if (!c) return;
    if (e.target.closest('[data-no]')) { c.classList.add('gone'); setTimeout(function () { c.remove(); }, 250); return; }
    var go = e.target.closest('[data-go]'); if (go) {
      go.disabled = true; go.textContent = 'Применяю…';
      api('/api/robot/apply', { method: 'POST', body: { kind: c.dataset.kind, data: collect(c) } }).then(function (d) {
        c.classList.add('done'); c.innerHTML = '<div class="rb-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>' + esc(d.message) + '</span>' + (d.dealId ? '<button type="button" data-deal="' + esc(d.dealId) + '">Открыть</button>' : '') + '</div>';
        if (d.open === 'site' && window.IOMA_SITE) window.IOMA_SITE.reload();
      }).catch(function (er) { go.disabled = false; go.textContent = 'Применить'; var p = $('.rb-cerr', c) || c.appendChild(Object.assign(document.createElement('p'), { className: 'rb-cerr' })); p.textContent = er.message; });
      return;
    }
    var dl = e.target.closest('[data-deal]'); if (dl) openDeal(dl.dataset.deal);
  }
  function openDeal(id) {
    if (window.__v3open) window.__v3open('workView'); else if (window.__iomaOpenView) window.__iomaOpenView('workView');
    setTimeout(function () { var t = $('#workView .cx-nav [data-tab="deals"]'); if (t) t.click(); setTimeout(function () { if (window.IOMA_CRM && window.IOMA_CRM.openDeal) window.IOMA_CRM.openDeal(id); }, 450); }, 350);
  }
  // список правок сайта: вернуть текст, вернуть цвета
  function siteEdits() {
    var m = say('<p>Загружаю правки сайта…</p>');
    api('/api/robot').then(function (d) {
      var h = '<p><b>Правки сайта</b></p>';
      if (!d.texts.length && !d.theme) h += '<p class="rb-small">Пока правок нет.</p>';
      h += d.texts.slice().reverse().map(function (t) { return '<div class="rb-edit" data-id="' + esc(t.id) + '"><span><s>' + esc(t.find) + '</s><b>' + esc(t.replace) + '</b></span><button type="button" data-undo="' + esc(t.id) + '">Вернуть</button></div>'; }).join('');
      if (d.theme) h += '<div class="rb-edit"><span><i class="rb-swc" style="background:' + esc(d.theme.accent) + '"></i><b>Акцент ' + esc(d.theme.accent) + '</b></span><button type="button" data-untheme>Вернуть цвета</button></div>';
      m.innerHTML = h;
      $$('[data-undo]', m).forEach(function (b) { b.onclick = function () { api('/api/robot/texts/' + encodeURIComponent(b.dataset.undo), { method: 'DELETE' }).then(function () { b.closest('.rb-edit').remove(); say('<p>Текст вернул как был. Обновите страницу, чтобы увидеть исходный текст везде.</p>'); if (window.IOMA_SITE) window.IOMA_SITE.reload(); }).catch(function (e) { say('<p class="rb-err">' + esc(e.message) + '</p>'); }); }; });
      var ut = $('[data-untheme]', m); if (ut) ut.onclick = function () { api('/api/robot/apply', { method: 'POST', body: { kind: 'theme', data: { reset: true } } }).then(function (r) { ut.closest('.rb-edit').remove(); say('<p>' + esc(r.message) + '</p>'); if (window.IOMA_SITE) window.IOMA_SITE.reload(); }).catch(function (e) { say('<p class="rb-err">' + esc(e.message) + '</p>'); }); };
    }).catch(function (e) { m.innerHTML = '<p class="rb-err">' + esc(e.message) + '</p>'; });
  }

  function sync() {
    var on = isAdmin();
    if (on && !btn) build();
    if (btn) btn.hidden = !on;
    if (!on && panel) { panel.hidden = true; if (btn) btn.classList.remove('on'); }
  }
  function init() { sync(); new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.IOMA_ROBOT = { open: function () { if (!btn) return; if (!panel || panel.hidden) toggle(); }, rules: null };
})();
