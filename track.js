/* IOMASTAVKA — «Где мой груз»: полоса этапов с контейнером.
   Полоса зеркальная: справа — склад в Китае (старт), слева — доставка клиенту.
   Наземный путь: склад → по Китаю → граница (или граница и таможня) → по России (город) → таможня → доставка (адрес).
   Море и авиа — свои этапы. Используется в кабинете клиента, в «Работе» у менеджера и на главной. */
(function () {
  'use strict';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lang() { try { return localStorage.getItem('iomastavka_lang') || 'ru'; } catch (e) { return 'ru'; } }
  var LOC = { ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN', tr: 'tr-TR', de: 'de-DE', fr: 'fr-FR' };
  function dshort(iso) { if (!iso) return ''; var d = new Date(/^\d{4}-\d\d-\d\d$/.test(iso) ? iso + 'T12:00:00' : iso); if (isNaN(d)) return ''; return d.toLocaleDateString(LOC[lang()] || 'ru-RU', { day: 'numeric', month: 'short' }).replace('.', ''); }
  function dtime(iso) { var d = new Date(iso); if (isNaN(d)) return ''; return d.toLocaleString(LOC[lang()] || 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', ''); }

  var TRACK = { land: ['wh', 'cn', 'border', 'ru', 'customs', 'delivery'], sea: ['wh', 'port_cn', 'sea', 'port_ru', 'ru', 'customs', 'delivery'], air: ['wh', 'airport_cn', 'flight', 'airport_ru', 'customs', 'delivery'] };
  var TITLE = { wh: 'Склад в Китае', cn: 'По Китаю', port_cn: 'Порт отправки', sea: 'Море', airport_cn: 'Аэропорт вылета', flight: 'Перелёт', border: 'Граница', port_ru: 'Порт прибытия', airport_ru: 'Аэропорт прилёта', ru: 'По России', customs: 'Таможня', delivery: 'Доставка', done: 'Доставлен' };
  var NOW = { wh: 'На складе в Китае', cn: 'В пути по Китаю', port_cn: 'В порту отправки', sea: 'В море', airport_cn: 'В аэропорту вылета', flight: 'В полёте', border: 'На границе', port_ru: 'В порту прибытия', airport_ru: 'В аэропорту прилёта', ru: 'В пути по России', customs: 'На таможне', delivery: 'Везём к вам', done: 'Доставлен' };
  var LEGACY = { new: 'Оформлен', pickup: 'Забран у поставщика', transit: 'В пути', border: 'На границе', customs: 'Таможня', delivery: 'Доставка по РФ', done: 'Доставлен' };
  function kind(mode) { return mode === 'sea' || mode === 'multimodal' ? 'sea' : mode === 'air' ? 'air' : 'land'; }
  function list(s) { var l = TRACK[kind(s.mode)]; return s.customsAt === 'border' ? l.filter(function (k) { return k !== 'customs'; }) : l.slice(); }
  function curIndex(s, l) {
    var st = s.stage || ''; if (st === 'done' || s.status === 'done') return l.length;
    var i = l.indexOf(st); if (i >= 0) return i;
    var k = kind(s.mode), alias = { cn: { sea: 'port_cn', air: 'airport_cn' }, border: { sea: 'port_ru', air: 'airport_ru' }, ru: { air: 'airport_ru' } };
    if (alias[st] && alias[st][k]) return l.indexOf(alias[st][k]);
    if (st === 'customs' && s.customsAt === 'border') { for (var j = 0; j < l.length; j++) if (/^(border|port_ru|airport_ru)$/.test(l[j])) return j; }
    return -1; // ещё не забран
  }
  function title(k, s) { var t = TITLE[k] || k; if (s.customsAt === 'border' && /^(border|port_ru|airport_ru)$/.test(k)) t += ' и таможня'; return t; }
  function sub(k, s, state) {
    var at = (s.stageAt || {})[k];
    if (k === 'wh') return state === 'next' ? (s.whCity || s.from || '') : [s.whCity || s.from, dshort(at)].filter(Boolean).join(', ');
    if (k === 'border' || k === 'port_ru' || k === 'airport_ru') return state === 'next' ? (s.crossing || '') : [s.crossing, state === 'done' ? dshort(at) : ''].filter(Boolean).join(', ');
    if (k === 'ru') return state === 'cur' ? (s.nowCity ? 'сейчас: ' + s.nowCity : dshort(at)) : state === 'done' ? dshort(at) : '';
    if (k === 'customs') return state === 'done' ? [s.customsPlace, dshort(at)].filter(Boolean).join(', ') : (s.customsPlace || '');
    if (k === 'delivery') { if (state === 'done') return dshort(at); var a = s.address ? s.address : ''; var e = s.eta ? '≈ ' + dshort(s.eta) : ''; return state === 'cur' ? (a || e) : (e || a); }
    if (k === 'port_cn') return state === 'next' ? (s.from || '') : dshort(at);
    return state === 'next' ? '' : dshort(at);
  }
  function stages(s) {
    var l = list(s), ci = curIndex(s, l);
    return l.map(function (k, i) { var st = i < ci ? 'done' : i === ci ? 'cur' : 'next'; return { key: k, title: title(k, s), sub: sub(k, s, st), state: st }; });
  }
  function nowText(s) { var l = list(s), ci = curIndex(s, l); if (ci >= l.length) return NOW.done; if (ci < 0) return 'Оформлен, ждём забора у поставщика'; var k = l[ci]; return NOW[k] + (k === 'ru' && s.nowCity ? ': ' + s.nowCity : (/^(border|port_ru|airport_ru)$/.test(k) && s.crossing) ? ': ' + s.crossing : (k === 'customs' && s.customsPlace) ? ': ' + s.customsPlace : ''); }

  // полоса: позиция 0 — левый край (доставка), 1 — правый (склад в Китае)
  function rail(s, opt) {
    opt = opt || {}; var st = stages(s), n = st.length, ci = st.findIndex(function (x) { return x.state === 'cur'; });
    var doneAll = st.every(function (x) { return x.state === 'done'; });
    var pos = function (i) { return 1 - (i + .5) / n; }, edge = .5 / n;
    var cpos = doneAll ? edge : ci >= 0 ? pos(ci) : 1 - edge;
    var h = '<div class="trk' + (opt.admin ? ' trk-admin' : '') + (doneAll ? ' trk-fin' : '') + (ci < 0 && !doneAll ? ' trk-wait' : '') + '" style="--n:' + n + '">';
    h += '<div class="trk-rail"><i class="trk-line"></i><i class="trk-done" style="width:' + ((1 - edge - cpos) * 100).toFixed(2) + '%"></i>';
    st.forEach(function (x, i) { h += '<i class="trk-dot ' + x.state + '" style="left:' + (pos(i) * 100).toFixed(2) + '%"></i>'; });
    h += '<span class="trk-ct" style="left:' + (cpos * 100).toFixed(2) + '%" title="' + esc(nowText(s)) + '"><span></span></span></div>';
    h += '<ol class="trk-stops">';
    // в разметке — слева направо, то есть от доставки к складу
    for (var i = n - 1; i >= 0; i--) {
      var x = st[i], p = pos(i), al = 'c';
      var inner = '<b>' + esc(x.title) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '');
      h += '<li class="' + x.state + ' a-' + al + '" style="left:' + (p * 100).toFixed(2) + '%" data-n="' + (i + 1) + '">' + (opt.admin ? '<button type="button" data-setstage="' + x.key + '" data-ship="' + esc(s.id) + '" title="Поставить этап «' + esc(x.title) + '»">' + inner + '</button>' : inner) + '</li>';
    }
    h += '</ol></div>';
    return h;
  }
  function history(s, max) {
    var ev = (s.events || []).slice().reverse().slice(0, max || 30);
    if (!ev.length) return '<p class="trk-empty">Сообщений пока нет</p>';
    return ev.map(function (e) {
      var t = e.stage ? (TITLE[e.stage] || e.stage) : (LEGACY[e.status] || e.status || '');
      return '<div class="trk-msg"><span class="trk-tag">' + esc(t) + '</span>' + (e.note ? '<p>' + esc(e.note) + '</p>' : '') + '<time>' + esc(dtime(e.date)) + '</time></div>';
    }).join('');
  }
  // целый блок как в макете: номер, полоса, сообщения по грузу
  function block(s, opt) {
    opt = opt || {};
    var head = '<div class="trk-h"><div><span class="trk-no">' + esc(s.number || '') + '</span><span class="trk-route">' + esc(s.from || '—') + ' → ' + esc(s.to || '—') + '</span></div><span class="trk-now">' + esc(nowText(s)) + '</span></div>';
    var meta = [s.cargo, s.places != null ? s.places + ' мест' : '', s.weight != null ? Number(s.weight).toLocaleString('ru-RU') + ' кг' : ''].filter(Boolean).join(', ');
    return '<div class="trk-block"><div class="trk-card">' + head + (meta ? '<p class="trk-meta">' + esc(meta) + '</p>' : '') + rail(s, opt) + '</div>'
      + (opt.noHistory ? '' : '<aside class="trk-bot"><div class="trk-bh"><i></i><b>Сообщения по грузу</b></div>' + history(s, opt.max || 4) + '</aside>') + '</div>';
  }
  // маленькая полоса для плитки на главной
  function mini(s) {
    var demo = !s; s = s || { mode: 'rail', stage: 'ru', customsAt: 'inland', stageAt: {} };
    var st = stages(s), n = st.length, ci = st.findIndex(function (x) { return x.state === 'cur'; }), done = st.every(function (x) { return x.state === 'done'; });
    var pos = function (i) { return 1 - (i + .5) / n; }, edge = .5 / n, cp = done ? edge : ci >= 0 ? pos(ci) : 1 - edge;
    var h = '<div class="trk-mini' + (demo ? ' demo' : '') + '" style="--n:' + n + '"><div class="trk-rail"><i class="trk-line"></i><i class="trk-done" style="width:' + ((1 - edge - cp) * 100).toFixed(1) + '%"></i>';
    st.forEach(function (x, i) { h += '<i class="trk-dot ' + x.state + '" style="left:' + (pos(i) * 100).toFixed(1) + '%"></i>'; });
    h += '<span class="trk-ct" style="left:' + (cp * 100).toFixed(1) + '%"><span></span></span></div><div class="trk-mini-l"><span>Доставка</span><span>Склад в Китае</span></div></div>';
    return h;
  }
  window.IOMA_TRACK = { stages: stages, rail: rail, history: history, block: block, mini: mini, nowText: nowText, list: list, TITLE: TITLE, kind: kind };

  /* ---------- главная: плитка «Где мой груз» и блок с грузами клиента ---------- */
  function api(u) { return fetch(u, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json().then(function (d) { if (!r.ok || d.ok === false) throw new Error(d.error || 'Ошибка'); return d; }); }); }
  function tile(s) {
    var t = document.querySelector('.v3-track'); if (!t) return;
    var old = t.querySelector('.v3-track-steps'); if (old) old.remove();
    var box = t.querySelector('.trk-tile'); if (!box) { box = document.createElement('span'); box.className = 'trk-tile'; box.setAttribute('aria-hidden', 'true'); t.appendChild(box); }
    box.innerHTML = mini(s) + (s ? '<span class="trk-tile-now">' + esc((s.number ? s.number + ' · ' : '') + nowText(s)) + '</span>' : '');
  }
  function homeSection(items) {
    var sec = document.getElementById('v3homeTrack');
    var act = items.filter(function (s) { return s.status !== 'done' && s.stage !== 'done'; });
    if (!act.length) { if (sec) sec.remove(); return; }
    if (!sec) { sec = document.createElement('section'); sec.id = 'v3homeTrack'; sec.className = 'v3-hometrack'; var g = document.querySelector('#homeView .v3-grid'); if (!g) return; g.parentNode.insertBefore(sec, g.nextSibling); }
    sec.innerHTML = '<div class="v3-hometrack-h"><h2>Где мой груз</h2><button type="button" class="v3c-link" data-open-view="cabinetView">Все грузы →</button></div>' + act.slice(0, 3).map(function (s) { return block(s, { max: 3 }); }).join('');
  }
  var rendered = '';
  function boot() {
    var role = window.__v3role || (document.body.className.match(/role-(\w+)/) || [])[1];
    if (!role) return setTimeout(boot, 150);
    if (role !== 'client') { tile(null); return; }
    api('/api/my/shipments').then(function (d) {
      var items = d.items || []; var key = JSON.stringify(items.map(function (s) { return [s.id, s.stage, s.status, s.nowCity, s.updatedAt]; }));
      if (key === rendered) return; rendered = key;
      var act = items.find(function (s) { return s.status !== 'done' && s.stage !== 'done'; }) || items[0];
      tile(act || null); homeSection(items);
    }).catch(function () { tile(null); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.lang')) { rendered = ''; setTimeout(boot, 120); } });
})();
