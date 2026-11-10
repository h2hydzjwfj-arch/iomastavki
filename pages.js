/* IOMASTAVKA — у каждого раздела свой адрес: /raschet, /tnved, /vhod…
   Работает кнопка «Назад», ссылкой на раздел можно поделиться, при переходе страница открывается сверху.
   Разделы по-прежнему открываются старыми функциями (__iomaOpenView, __v3open) — здесь только адреса и заголовки. */
(function () {
  'use strict';
  var PAGES = [
    ['/raschet', 'calculatorView', 'Расчёт ставки', 'calculator'],
    ['/uslugi', 'servicesView', 'Услуги', ''],
    ['/kejsy', 'casesView', 'Кейсы', ''],
    ['/tnved', 'customsView', 'Проверка кода ТН ВЭД', 'customsView'],
    ['/ekspeditory', 'forwardersView', 'Экспедиторы', 'forwarders'],
    ['/novosti', 'newsView', 'Новости ВЭД', 'news'],
    ['/gid', 'kbView', 'Гид по доставке', ''],
    ['/zayavka', 'leadView', 'Оставить заявку', ''],
    ['/vhod', 'loginView', 'Вход', ''],
    ['/kabinet', 'cabinetView', 'Мои грузы', ''],
    ['/rabota', 'workView', 'Работа', ''],
    ['/akkaunt', 'accountView', 'Аккаунт', ''],
    ['/otsledit', 'trackView', 'Отследить груз', ''],
    ['/etrn', 'etrnView', 'Электронная транспортная накладная', ''],
    ['/vlezet', 'fitView', 'Влезет ли груз', ''],
    ['/obem', 'volumeView', 'Объём груза', ''],
    ['/terminal', 'terminalView', 'Терминальные в Шереметьево', ''],
    ['/po-rossii', 'russiaView', 'Доставка по России', ''],
    ['/telefon', 'phoneView', 'Чей номер и который час', ''],
    ['/propis', 'propisView', 'Сумма прописью', ''],
  ];
  var byView = {}, byPath = {};
  PAGES.forEach(function (p) { byView[p[1]] = p; byPath[p[0]] = p; });
  var HOME_TITLE = document.title;
  var current = function () { var v = document.querySelector('.view-layer.open'); return v ? v.id : ''; };
  var last = current(), fromPop = false;

  function openPage(p) {
    if (!p) { if (window.__iomaCloseViews) window.__iomaCloseViews(); return; }
    if (p[3] && window.__iomaOpenView) window.__iomaOpenView(p[3]);
    else if (window.__v3open) window.__v3open(p[1]);
  }
  function titleFor(id) { var p = byView[id]; document.title = p ? p[2] + ' — iomastavka' : HOME_TITLE; }

  // любой способ открыть или закрыть раздел (кнопки, меню, код) меняет адрес
  var mo = new MutationObserver(function () {
    var id = current(); if (id === last) return; last = id;
    var p = byView[id], path = p ? p[0] : (id ? location.pathname : '/');
    titleFor(id);
    if (location.pathname !== path) history[fromPop ? 'replaceState' : 'pushState']({ view: id }, '', path + (p ? '' : location.search) + location.hash);
    fromPop = false;
    window.scrollTo(0, 0);
    // блоки, которые меряют себя (карта-калькулятор), открылись из скрытого состояния — пусть пересчитают размеры
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 40);
  });
  function watch() { Array.prototype.forEach.call(document.querySelectorAll('.view-layer'), function (v) { mo.observe(v, { attributes: true, attributeFilter: ['class'] }); }); }

  window.addEventListener('popstate', function () { fromPop = true; openPage(byPath[location.pathname]); if (current() === last) fromPop = false; });

  // страховка: если окно браузера всё-таки сдвинуло страницу так, что шапка ушла, — шапка закреплена (pages.css)
  function start() {
    watch();
    var p = byPath[location.pathname.replace(/\/+$/, '') || '/'];
    if (!p) return;
    // разделы для администратора и кабинета ждут, пока станет известна роль (иначе откроется «Вход»)
    var needsRole = p[1] === 'workView' || p[1] === 'cabinetView' || p[1] === 'accountView', t0 = Date.now();
    (function go() {
      var known = /\brole-(admin|client|guest)\b/.test(document.body.className);
      if (needsRole && !known && Date.now() - t0 < 4000) return setTimeout(go, 120);
      fromPop = true; openPage(p); if (current() === last) fromPop = false; titleFor(current());
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); }); else setTimeout(start, 0);
  window.IOMA_PAGES = { list: PAGES, open: function (path) { var p = byPath[path]; openPage(p); } };
})();
