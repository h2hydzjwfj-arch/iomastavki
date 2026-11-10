/* IOMASTAVKA — страница «Расчёт ставки».
   1) В пустых полях — серые подсказки, которые плавно сменяют друг друга (города Китая, Тайваня, Японии, Кореи; вес; места).
   2) Пока груз не введён и ставка не посчитана, блока «— $» и «срок уточнить» нет: справа — маршрут, он строится по мере ввода.
      После расчёта ставка плавно появляется, маршрут уходит ниже на всю ширину.
   3) Маршрут — карта и километры по участкам: по Китаю до границы, транзит, от границы до города назначения (IOMA_RMAP).
   4) «Из чего складывается» убран: клиенту нужна ставка, а не её устройство.
   5) window.IOMA_CALC_PUBLIC.prefill({ from, to, weight, pieces, mode }) — заполнить расчёт с главной и из кейсов. */
(function () {
  'use strict';
  var LI = { ru: 0, en: 1, zh: 2 };
  // язык сайта; своих текстов здесь три языка — на остальных показываем русский, его переводит общий словарь (i18n-v3 + i18n-more)
  function lang() { var l; try { l = localStorage.getItem('iomastavka_lang'); } catch (e) {} return ['ru', 'en', 'zh', 'de', 'fr', 'tr'].indexOf(l) >= 0 ? l : 'ru'; }
  function T(a) { var l = lang(); if (LI.hasOwnProperty(l)) return a[LI[l]] || a[0]; return window.IOMA_T ? window.IOMA_T(a[0], l) : a[0]; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString(({ ru: 'ru-RU', zh: 'zh-CN', de: 'de-DE', fr: 'fr-FR', tr: 'tr-TR' })[lang()] || 'en-US'); }
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var REQ = ['fromCity', 'toCity', 'weight'];
  function filled(id) { var v = val(id); return id === 'weight' || id === 'pieces' ? Number(String(v).replace(',', '.')) > 0 : !!v; }
  function isOpen() { var v = document.getElementById('calculatorView'); return !!(v && v.classList.contains('open')); }

  var W = {
    route: ['Маршрут', 'Route', '路线'], all: ['Всего', 'Total', '合计'], km: ['км', 'km', '公里'],
    china: ['по Китаю', 'in China', '中国境内'], transit: ['через Монголию', 'via Mongolia', '经蒙古'], ru: ['по России', 'in Russia', '俄罗斯境内'], kzru: ['Казахстан и Россия', 'Kazakhstan and Russia', '哈萨克斯坦和俄罗斯'],
    sea: ['морем', 'by sea', '海运'], rail: ['по ЖД', 'by rail', '铁路'], air: ['перелёт', 'flight', '航程'], via: ['через', 'via', '经'], direct: ['прямой рейс', 'direct flight', '直飞'],
    empty: ['Укажите, откуда и куда — построим маршрут и посчитаем километры', 'Enter origin and destination — we will draw the route and count the kilometres', '填写起运地和目的地，即可显示路线和公里数'],
    unknownFrom: ['пока нет на нашей карте — маршрут и километры уточнит менеджер', 'is not on our map yet — a manager will confirm the route and distance', '暂不在地图上，经理会确认路线和距离'],
    unknownTo: ['маршрут до этого города уточним — пока показываем до Москвы', 'we will confirm the route to this city — showing the route to Moscow for now', '至该城市的路线待确认，暂显示至莫斯科'],
    oversea: ['Из Тайваня, Японии и Кореи — морем до Владивостока, дальше по ЖД', 'From Taiwan, Japan and Korea — by sea to Vladivostok, then by rail', '台湾、日本、韩国：海运至符拉迪沃斯托克，再转铁路'],
    approx: ['Расстояния ориентировочные — по основным путям', 'Distances are approximate, along the main routes', '距离为主要线路的估算值'],
    more: ['Другие варианты маршрута и риски', 'Other route options and risks', '其他路线与风险'],
    s_from: ['Откуда', 'From', '起运地'], s_to: ['Куда', 'To', '目的地'], s_w: ['Вес', 'Weight', '重量'], s_p: ['Места', 'Packages', '件数'],
    ready: ['Всё готово — нажмите «Рассчитать»', 'All set — press “Get a rate”', '已填好，点击“计算运费”'],
    left: ['Осталось указать:', 'Still needed:', '还需填写：'],
    stale: ['Параметры изменились — нажмите «Рассчитать», чтобы обновить ставку', 'Details changed — press “Get a rate” to update', '参数已更改，请重新计算'],
    moreT: ['Габариты и условия поставки', 'Dimensions and delivery terms', '尺寸和交货条件'], moreS: ['необязательно — для точного объёма', 'optional — for an exact volume', '可选，用于准确计算体积']
  };

  /* ---------------- 1. подсказки в пустых полях ---------------- */
  var CN = ['Китай', 'China', '中国'], TW = ['Тайвань', 'Taiwan', '台湾'], JP = ['Япония', 'Japan', '日本'], KR = ['Корея', 'Korea', '韩国'];
  function city(k, c) { return function () { var R = window.IOMA_RMAP, n = R ? R.name(k, lang()) : k; return c ? n + (lang() === 'zh' ? '，' : ', ') + T(c) : n; }; }
  function txt(a) { return function () { return T(a); }; }
  var PH = {
    fromCity: [city('yw', CN), city('sh', CN), city('gz', CN), city('sz', CN), city('nb', CN), city('qd', CN), city('bj', CN), city('sel', KR), city('pus', KR), txt(['Мумбаи, Индия', 'Mumbai, India', '印度孟买'])],
    toCity: [city('msk'), city('spb'), city('ekb'), city('kzn'), city('nsk'), city('krd'), city('vvo')],
    weight: [txt(['Введите вес, кг', 'Enter weight, kg', '输入重量，公斤']), txt(['например, 1 200', 'e.g. 1,200', '例如 1200']), txt(['например, 350', 'e.g. 350', '例如 350'])],
    pieces: [txt(['Укажите количество мест', 'Number of packages', '填写件数']), txt(['например, 6 коробок', 'e.g. 6 boxes', '例如 6 箱']), txt(['например, 2 паллеты', 'e.g. 2 pallets', '例如 2 托盘'])]
  };
  var PHS = {};
  function phMount(id, delay) {
    var inp = document.getElementById(id); if (!inp || PHS[id]) return;
    var f = inp.closest('.field') || inp.parentElement; f.classList.add('cx-phf');
    var el = document.createElement('span'); el.className = 'cx-ph'; el.setAttribute('aria-hidden', 'true');
    inp.insertAdjacentElement('afterend', el);
    var p = PHS[id] = { id: id, inp: inp, el: el, i: 0, delay: delay };
    // свой серый текст браузера убираем навсегда: старый код ставил туда «0», «1» и города — и они проступали под нашей подсказкой
    if (inp.placeholder) inp.setAttribute('aria-placeholder', inp.placeholder);
    inp.removeAttribute('placeholder');
    try { Object.defineProperty(inp, 'placeholder', { configurable: true, get: function () { return ''; }, set: function () {} }); } catch (e) {}
    new MutationObserver(function () { if (inp.getAttribute('placeholder')) inp.removeAttribute('placeholder'); }).observe(inp, { attributes: true, attributeFilter: ['placeholder'] });
    ['input', 'change', 'focus', 'blur'].forEach(function (ev) { inp.addEventListener(ev, function () { phSync(p); }); });
    phShow(p, false); phPlace(p); phSync(p);
  }
  function phPlace(p) {
    var inp = p.inp, cs = getComputedStyle(inp), pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
    var s = p.el.style; s.left = (inp.offsetLeft + pl) + 'px'; s.top = (inp.offsetTop + pt) + 'px';
    s.width = Math.max(0, inp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) + 'px';
    s.height = Math.max(0, inp.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) + 'px';
    s.fontSize = cs.fontSize; s.lineHeight = s.height;
  }
  function phShow(p, anim) {
    var list = PH[p.id], t = list[p.i % list.length](), old = p.el.querySelector('.cx-ph-t:not(.out)');
    if (old && old.textContent === t) return;
    var n = document.createElement('span'); n.className = 'cx-ph-t'; n.textContent = t;
    if (old) { if (anim && !reduce) { old.classList.add('out'); setTimeout(function () { old.remove(); }, 320); n.classList.add('in'); } else old.remove(); }
    $$('.cx-ph-t.out', p.el).forEach(function (x) { if (x !== old) x.remove(); });
    p.el.appendChild(n);
  }
  function phSync(p) { p.el.classList.toggle('off', !!p.inp.value); p.el.classList.toggle('foc', document.activeElement === p.inp); }
  var phT = 0;
  function phTick() {
    phT++;
    if (document.hidden || !isOpen()) return;
    Object.keys(PHS).forEach(function (id) {
      var p = PHS[id]; phSync(p); if (p.inp.value) return;
      if ((phT + p.delay) % 3 !== 0) return; // каждое поле меняется в свой момент, не все разом
      p.i++; phShow(p, true);
    });
  }
  function phAll() { Object.keys(PHS).forEach(function (id) { var p = PHS[id]; phPlace(p); phSync(p); }); }
  function phLang() { Object.keys(PHS).forEach(function (id) { var p = PHS[id], o = p.el.querySelector('.cx-ph-t:not(.out)'); if (o) o.remove(); phShow(p, false); }); }

  /* ---------------- 2. маршрут ---------------- */
  var CHIP2MAP = { auto: 'road', rail: 'rail', sea: 'sea', air: 'air' };
  function mode() { var c = $('.v3c-chips .chip.on'); return c ? CHIP2MAP[c.dataset.m] || 'rail' : 'rail'; }
  function clean(s) { return String(s || '').split(/[,(（，]/)[0].trim(); }
  var card, lastKey = '', grid, res, hero, ADV = null, TOTAL = '';
  function legName(r, leg, i, from, to) {
    var R = window.IOMA_RMAP, l = lang(), g = r.gw ? R.gwKeys(r.gw) : [], ruSide = g[0], cnSide = g[1] || g[0], p = r.path;
    var nm = function (k) { return R.name(k, l); };
    if (leg.kind === 'air') return [nm(from) + ' → ' + nm(to), T(W.air)];
    if (leg.kind === 'sea') return [nm(from) + ' → ' + nm('vvo'), T(W.sea)];
    if (leg.kind === 'rail') return [nm('vvo') + ' → ' + nm(to), T(W.rail)];
    if (leg.kind === 'china') return [nm(from) + ' → ' + nm(cnSide), T(W.china)];
    if (leg.kind === 'transit') return [nm(cnSide) + ' → ' + nm(ruSide), T(W.transit)];
    return [nm(ruSide) + ' → ' + nm(to), T(r.gw === 'dos' || r.gw === 'hor' ? W.kzru : W.ru)];
  }
  function routeHtml(r, from, to, notes) {
    var R = window.IOMA_RMAP, l = lang(), legs = r.legs.filter(function (x) { return x.km > 0; });
    var g = r.gw ? R.gwNames(r.gw, l) : [];
    var sub = R.modeName(r.mode, l) + (r.mode === 'air' ? ' · ' + T(W.direct) : g.length ? ' · ' + T(W.via) + ' ' + g.join(' · ') : '');
    var total = legs.reduce(function (s, x) { return s + x.km; }, 0);
    var h = '<div class="cxr-od"><b>' + esc(R.name(from, l)) + '</b><i aria-hidden="true"></i><b>' + esc(R.name(to, l)) + '</b></div><div class="cxr-sub">' + esc(sub) + '</div>';
    h += '<div class="cxr-map" data-r="' + esc(JSON.stringify(r)) + '">' + R.routeSvg(r, l, { px: mapPx(), aspect: aspect() }) + '</div>';
    h += '<div class="cxr-bar" aria-hidden="true">' + legs.map(function (x) { return '<i class="k-' + x.kind + '" style="flex-grow:' + x.km + '"></i>'; }).join('') + '</div>';
    h += '<ul class="cxr-legs">' + legs.map(function (x, i) { var n = legName(r, x, i, from, to); return '<li class="k-' + x.kind + '"><i aria-hidden="true"></i><span>' + esc(n[0]) + '<em>' + esc(n[1]) + '</em></span><b>≈ ' + fmt(x.km) + ' ' + T(W.km) + '</b></li>'; }).join('') + '</ul>';
    TOTAL = '≈ ' + fmt(total) + ' ' + T(W.km);
    notes.push(T(W.approx));
    return h;
  }
  function ghost() { var R = window.IOMA_RMAP, r = R && R.routeTo('sh', 'msk', 'rail'); return r ? '<div class="cxr-map cxr-ghost" data-r="' + esc(JSON.stringify(r)) + '">' + R.routeSvg(r, lang(), { px: mapPx(), aspect: aspect() }) + '</div>' : ''; }
  function aspect() { return grid.classList.contains('cx-res') ? 1.9 : window.innerWidth > 860 ? 2.4 : 1.9; }
  // ширина карты на экране: подписи на карте всегда одного размера
  function mapPx() { var m = card && $('.cxr-map', card); if (m && m.clientWidth) return m.clientWidth; var w = card && card.clientWidth > 120 ? card.clientWidth - 52 : 600, px = grid.classList.contains('cx-res') && window.innerWidth > 860 ? w * 1.35 / 2.35 - 15 : w; return px > 120 ? px : 600; }
  function refit() { if (!card) return; $$('.cxr-map[data-r]', card).forEach(function (m) { var svg = $('svg', m); if (!svg || !m.clientWidth) return; var u = parseFloat(svg.style.getPropertyValue('--u')), vb = svg.viewBox.baseVal, want = vb.width / m.clientWidth; if (Math.abs(want - u) / u < .06) return; try { var r = JSON.parse(m.dataset.r); m.innerHTML = window.IOMA_RMAP.routeSvg(r, lang(), { px: m.clientWidth, aspect: aspect() }); } catch (e) {} }); }
  // как лучше везти: рекомендация по региону отправления, части России и размеру партии (route-advice.js)
  var CHIP = { auto: 'auto', rail: 'rail', sea: 'sea', air: 'air' };
  function nval(id) { var e = document.getElementById(id), v = !e ? '' : 'value' in e ? e.value : e.textContent; var n = parseFloat(String(v || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function adviceHtml(fromT, toT) {
    var A = window.IOMA_ADVICE, R = window.IOMA_RMAP; if (!A || !fromT) return '';
    var ll = function (k) { var c = k && R && R.cities && R.cities[k]; return c ? [c[3], c[4]] : null; };
    var fk = R && R.find(fromT), tk = R && R.find(toT || 'Москва');
    var a = A.advise({ from: fromT, to: toT || 'Москва', fromLL: ll(fk), toLL: ll(tk), fromLabel: fk && lang() !== 'ru' ? R.name(fk) : undefined, toLabel: tk && lang() !== 'ru' ? R.name(tk) : undefined, weight: nval('weight'), volume: nval('autoVolume'), lang: lang() });
    if (!a.ok) return '';
    var X = A.text[a.lang], b = a.options[0], cm = ($('.v3c-chips .chip.on') || {}).dataset;
    var tag = function (o) { return o.tags.indexOf('cheap') >= 0 ? X.cheap : o.tags.indexOf('fast') >= 0 ? X.fast : ''; };
    var rubs = function (o) { return '<i class="cxa-r" aria-label="цена">' + '₽₽₽₽₽'.slice(0, o.rub) + '<s>' + '₽₽₽₽₽'.slice(o.rub) + '</s></i>'; };
    var h = '<div class="cxa"><div class="cxa-h"><b>' + esc(X.how) + '</b><span>' + esc(a.from.regionName + ' → ' + a.to.zoneName + ' · ' + a.bandName) + '</span></div>';
    h += '<button type="button" class="cxa-best' + (cm && cm.m === CHIP[b.mode] ? ' on' : '') + '" data-cxm="' + b.mode + '"><em>' + esc(X.best) + '</em><b>' + esc(b.title) + '</b><span>' + esc(b.via || '') + '</span><strong>' + b.days[0] + '–' + b.days[1] + ' ' + esc(X.days) + rubs(b) + '</strong><small>' + esc(b.why[0] || '') + (b.cons[0] ? ' · ' + esc(b.cons[0]) : '') + '</small></button>';
    var alt = a.options.slice(1, 4);
    if (alt.length) h += '<div class="cxa-alt">' + alt.map(function (o) { return '<button type="button" data-cxm="' + o.mode + '" title="' + esc((o.why[0] || '') + (o.cons[0] ? ' · ' + o.cons[0] : '')) + '"><b>' + esc(o.title) + '</b><span>' + o.days[0] + '–' + o.days[1] + ' ' + esc(X.days) + (tag(o) ? ' · ' + esc(tag(o)) : '') + '</span>' + rubs(o) + '</button>'; }).join('') + '</div>';
    if (a.impossible.length) h += '<p class="cxa-no">' + esc(a.impossible.map(function (n) { return { auto: X.auto, rail: X.rail, sea: X.sea }[n.mode]; }).join(', ')) + ' — ' + esc(a.impossible[0].why) + '</p>';
    return h + '</div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cxm]'); if (!b || !window.__v3setMode) return;
    window.__v3setMode(CHIP[b.dataset.cxm] || 'rail', true); setTimeout(function () { draw(true); }, 30);
  });
  function draw(force) {
    if (!card || !window.IOMA_RMAP) return;
    var R = window.IOMA_RMAP, fromT = clean(val('fromCity')), toT = clean(val('toCity')), m = mode();
    var key = [fromT, toT, m, lang(), grid.classList.contains('cx-res'), nval('weight'), nval('autoVolume')].join('|');
    steps();
    if (!force && key === lastKey) return; lastKey = key;
    var from = R.find(fromT), to = R.find(toT) || (toT ? null : 'msk'), notes = [], body; TOTAL = '';
    if (!fromT) body = ghost() + '<p class="cxr-hint">' + T(W.empty) + '</p>';
    else if (!from) body = ghost() + '<p class="cxr-hint"><b>' + esc(fromT) + '</b> — ' + T(W.unknownFrom) + '</p>';
    else {
      var dest = to || 'msk', r = R.routeTo(from, dest, m);
      if (!r) body = ghost() + '<p class="cxr-hint">' + T(W.unknownFrom) + '</p>';
      else {
        if (!to && toT) notes.push('<b>' + esc(toT) + '</b>: ' + T(W.unknownTo));
        if (r.mode === 'sea' && m !== 'sea' && m !== 'air') notes.push(T(W.oversea));
        body = routeHtml(r, from, dest, notes).replace('<div class="cxr-map"', adviceHtml(fromT, toT) + '<div class="cxr-map"'); // сначала — как лучше везти, потом карта
      }
    }
    var adv = ADV || (ADV = document.getElementById('v3advice')), more = adv && adv.textContent.trim() ? 1 : 0;
    if (adv && adv.parentNode) adv.parentNode.removeChild(adv);
    card.innerHTML = '<div class="cxr-head"><b class="v3c-title">' + T(W.route) + '</b>' + (TOTAL ? '<span class="cxr-tot"><small>' + T(W.all) + '</small>' + TOTAL + '</span>' : '') + '</div><div class="cxr-body' + (reduce ? '' : ' cx-anim') + '">' + body
      + (notes.length ? '<p class="cxr-note">' + notes.join('<br>') + '</p>' : '')
      + '<details class="cxr-more"' + (more ? '' : ' hidden') + '><summary>' + T(W.more) + '</summary><div class="cxr-adv"></div></details></div><div class="cxr-steps" aria-live="polite"></div>';
    if (adv) $('.cxr-adv', card).appendChild(adv);
    refit(); steps();
  }

  /* шаги: что уже заполнено */
  function steps() {
    if (!card) return; var box = $('.cxr-steps', card); if (!box) return;
    var S = [['fromCity', W.s_from], ['toCity', W.s_to], ['weight', W.s_w], ['pieces', W.s_p]], miss = [];
    var h = '<div class="cxr-pills">' + S.map(function (s) { var on = filled(s[0]); if (!on && REQ.indexOf(s[0]) >= 0) miss.push(T(s[1])); return '<span class="' + (on ? 'on' : '') + '"><i aria-hidden="true"></i>' + T(s[1]) + '</span>'; }).join('') + '</div>';
    h += '<p>' + (miss.length ? T(W.left) + ' ' + miss.join(', ').toLowerCase() : T(W.ready)) + '</p>';
    if (box.innerHTML !== h) box.innerHTML = h;
    var btn = document.getElementById('calculate'); if (btn) btn.classList.toggle('cx-go', !miss.length && (!grid.classList.contains('cx-res') || hero.classList.contains('cx-stale')));
  }

  /* ---------------- 3. ставка появляется только после расчёта ---------------- */
  function hasRes() { return !!(res && !res.classList.contains('hidden') && res.innerHTML.trim()); }
  var snap = '';
  function params() { return ['fromCity', 'toCity', 'weight', 'pieces'].map(val).join('|') + '|' + mode() + '|' + (($('#v3dg') || {}).className || ''); }
  function state() {
    var on = hasRes(), was = grid.classList.contains('cx-res');
    if (on !== was) {
      grid.classList.toggle('cx-res', on); grid.classList.toggle('cx-pre', !on);
      if (on && !reduce) { hero.classList.remove('cx-in'); void hero.offsetWidth; hero.classList.add('cx-in'); }
      draw(true);
    }
    if (on && !$('.result-loading', res)) { snap = params(); hero.classList.remove('cx-stale'); }
    steps();
  }
  function staleCheck() { if (grid.classList.contains('cx-res') && snap) { hero.dataset.stale = T(W.stale); hero.classList.toggle('cx-stale', params() !== snap); } steps(); }

  /* ---------------- 4. «Габариты и условия» — свёрнуто ---------------- */
  function more() {
    var mc = $('.v3c-morecard'); if (!mc || mc.dataset.cx) return; mc.dataset.cx = '1';
    var t = $('.v3c-title', mc), b = document.createElement('button');
    b.type = 'button'; b.className = 'cx-more-b'; b.setAttribute('aria-expanded', 'false');
    function lbl() { b.innerHTML = '<span><b>' + T(W.moreT) + '</b><small>' + T(W.moreS) + '</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'; }
    lbl(); b._lbl = lbl;
    if (t) t.insertAdjacentElement('afterend', b); else mc.insertBefore(b, mc.firstChild);
    b.addEventListener('click', function () { var o = !mc.classList.contains('cx-open'); mc.classList.toggle('cx-open', o); b.setAttribute('aria-expanded', o); });
  }

  /* ---------------- 5. заполнить расчёт снаружи ---------------- */
  function set(id, v) { if (v == null || v === '') return; var e = document.getElementById(id); if (!e) return; e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }
  function prefill(o) {
    o = o || {};
    set('fromCity', o.from); set('toCity', o.to || (val('toCity') ? null : 'Москва')); set('weight', o.weight); set('pieces', o.pieces);
    ['fromSuggestions', 'toSuggestions'].forEach(function (id) { var s = document.getElementById(id); if (s) { s.innerHTML = ''; s.classList.remove('show', 'open', 'visible'); } });
    var m = { road: 'auto', auto: 'auto', truck: 'auto', rail: 'rail', sea: 'sea', multi: 'sea', air: 'air' }[o.mode];
    if (m && window.__v3setMode) window.__v3setMode(m, true);
    phAll(); draw(true);
    var miss = REQ.filter(function (id) { return !filled(id); })[0]; var f = miss && document.getElementById(miss);
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 120);
  }
  window.IOMA_CALC_PH = true; clearInterval(window.cityPlaceholderTimer);
  window.IOMA_CALC_PUBLIC = window.IOMA_CALC_PUBLIC || {};
  window.IOMA_CALC_PUBLIC.prefill = prefill;

  /* ---------------- запуск ---------------- */
  function init() {
    grid = $('.v3-calc-grid'); res = document.getElementById('result'); hero = $('.v3c-hero');
    if (!grid || !res || !hero || grid.dataset.cx) return; grid.dataset.cx = '1';
    grid.classList.add('cx-pre');
    card = document.createElement('div'); card.className = 'k cx-route'; card.id = 'cxRoute';
    var old = $('.v3c-map', grid); grid.insertBefore(card, old || null);
    more();
    ADV = document.getElementById('v3advice');
    if (ADV) new MutationObserver(function () { var d = card && $('.cxr-more', card); if (d) d.hidden = !ADV.textContent.trim(); }).observe(ADV, { childList: true });
    phMount('fromCity', 0); phMount('toCity', 1); phMount('weight', 2); phMount('pieces', 1);
    setInterval(phTick, 1000);
    // пустые обязательные поля — подсвечиваем вместо пустого «нужно ещё чуть-чуть»
    document.addEventListener('click', function (e) {
      if (!(e.target.closest && e.target.closest('#calculate'))) return;
      var miss = REQ.filter(function (id) { return !filled(id); }); if (!miss.length) return;
      e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
      miss.forEach(function (id) { var f = document.getElementById(id).closest('.field'); if (!f) return; f.classList.remove('cx-need'); void f.offsetWidth; f.classList.add('cx-need'); setTimeout(function () { f.classList.remove('cx-need'); }, 1500); });
      var first = document.getElementById(miss[0]); first && first.focus();
    }, true);
    new MutationObserver(state).observe(res, { attributes: true, attributeFilter: ['class'], childList: true });
    var chips = $('.v3c-chips'); if (chips) new MutationObserver(function () { draw(); staleCheck(); }).observe(chips, { subtree: true, attributes: true, attributeFilter: ['class'] });
    var tm = 0; ['fromCity', 'toCity', 'weight', 'pieces'].forEach(function (id) { var e = document.getElementById(id); if (!e) return; e.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { draw(); staleCheck(); }, 220); }); e.addEventListener('change', function () { draw(); staleCheck(); }); });
    var dg = $('#v3dg'); dg && dg.addEventListener('click', function () { setTimeout(staleCheck, 0); });
    // значения, вставленные программно (подсказки городов, восстановленный расчёт), — догоняем раз в секунду
    setInterval(function () { if (isOpen()) { draw(); staleCheck(); Object.keys(PHS).forEach(function (id) { phSync(PHS[id]); }); } }, 1000);
    var drawnLang = lang(); new MutationObserver(function () { if (lang() === drawnLang) return; drawnLang = lang(); lastKey = ''; draw(true); phLang(); var b = $('.cx-more-b'); b && b._lbl && b._lbl(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    var rz = 0; window.addEventListener('resize', function () { phAll(); clearTimeout(rz); rz = setTimeout(refit, 150); });
    var view = document.getElementById('calculatorView'); if (view) new MutationObserver(function () { if (isOpen()) setTimeout(function () { phAll(); draw(); state(); }, 60); }).observe(view, { attributes: true, attributeFilter: ['class'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(phAll);
    state(); draw(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
