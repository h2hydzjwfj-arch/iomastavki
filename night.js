/* IOMASTAVKA — тема «Полночь и стекло»: поведение новых блоков главной.
   Без зависимостей; всё, что не нашлось на странице, тихо пропускается. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function safe(f) { try { f(); } catch (e) { if (window.console) console.warn('night.js', e); } }

  // «Рассчитать ставку» — плавно к карте-калькулятору и в поле веса
  safe(function () {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-n-go="calc"]');
      if (!b) return;
      e.preventDefault();
      if (window.__iomaCloseViews) { try { window.__iomaCloseViews(); } catch (x) {} }
      var head = $('#nCalcHead') || $('#v3Hero');
      if (head) head.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { var w = $('#mcW'); if (w) try { w.focus({ preventScroll: true }); } catch (x) { w.focus(); } }, 700);
    });
  });

  // Вкладки «Ключевые возможности» / «Как мы работаем»
  safe(function () {
    $$('.nw-group').forEach(function (g) {
      $$('.nw-tabs button', g).forEach(function (t) {
        t.addEventListener('click', function () {
          var n = t.getAttribute('data-t');
          $$('.nw-tabs button', g).forEach(function (x) { var on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
          $$('.nw-pane', g).forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-p') === n); });
          var num = $('#nwNum'); if (num) num.textContent = '0' + n;
        });
      });
    });
  });

  // Заголовок первого экрана на выбранном языке: первая строка heroText — в заголовок, вторая — в абзац
  safe(function () {
    var src = $('#nHeroSrc'), h1 = $('#nH1'), p = $('#nHeroP');
    if (!src || !h1 || !p) return;
    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function sync() {
      var parts = src.innerHTML.split(/<br\s*\/?>/i).map(function (s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent.trim(); });
      if (!parts[0]) return;
      var t = esc(parts[0]).replace(/([.!?。])\s+(?=\S)/, '$1<br>');
      if (h1.innerHTML !== t) h1.innerHTML = t;
      if (parts[1] && p.textContent !== parts[1]) p.textContent = parts[1];
    }
    sync();
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
  });

  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Пункты меню, которые жмут спрятанные кнопки (бывшая панель ✦): «Обновить экспедиторов», «Карта дня»
  safe(function () {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-proxy]');
      if (!b) return;
      var t = $(b.getAttribute('data-proxy'));
      e.preventDefault(); closeGroups();
      if (t) t.click();
    });
  });

  // Умные группы кнопок: одна кнопка «Управление грузом» / «Инструменты ВЭД» раскрывается при наведении,
  // по нажатию (телефон) и с клавиатуры. Меню позиционируется fixed — не обрезается прокруткой полосы меню.
  var groups = [];
  function closeGroups(except) { groups.forEach(function (g) { if (g !== except) g.close(); }); }
  safe(function () {
    $$('[data-sg]').forEach(function (sg) {
      var btn = $('.sg-btn', sg), menu = $('.sg-menu', sg);
      if (!btn || !menu) return;
      var tIn = 0, tOut = 0;
      var items = function () { return $$('button', menu).filter(function (x) { return getComputedStyle(x).display !== 'none'; }); };
      function place() {
        var r = btn.getBoundingClientRect(), w = menu.offsetWidth || 300;
        var left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
        menu.style.left = left + 'px'; menu.style.top = Math.round(r.bottom + 10) + 'px';
      }
      var api = {
        open: function () {
          var list = items(); if (!list.length) return;
          if (sg.classList.contains('sg-solo')) return;
          closeGroups(api); list.forEach(function (x, i) { x.style.setProperty('--i', i); });
          place(); sg.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
        },
        close: function () { clearTimeout(tIn); sg.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); },
        isOpen: function () { return sg.classList.contains('open'); }
      };
      groups.push(api);
      // одна видимая команда для этой роли (гость: «Оставить заявку») — вместо группы показываем саму команду
      // обычной кнопкой меню (стили .sg-solo); подпись переводится вместе с остальным меню
      function solo() {
        var list = items(), one = list.length === 1;
        if (sg.classList.contains('sg-solo') !== one) { api.close(); sg.classList.toggle('sg-solo', one); }
        sg.hidden = !list.length;
        list.forEach(function (x) { if (one) x.removeAttribute('role'); else x.setAttribute('role', 'menuitem'); });
      }
      solo(); new MutationObserver(solo).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        // мышью группа уже раскрылась при наведении — щелчок её не закрывает; на телефоне — переключает
        if (e.pointerType === 'mouse' || (fine && !e.pointerType)) { clearTimeout(tOut); api.open(); return; }
        api.isOpen() ? api.close() : api.open();
      });
      if (fine) {
        sg.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse' || sg.classList.contains('sg-solo')) return; clearTimeout(tOut); tIn = setTimeout(api.open, 70); });
        sg.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(tIn); tOut = setTimeout(api.close, 220); });
        menu.addEventListener('pointerenter', function () { clearTimeout(tOut); });
        menu.addEventListener('pointerleave', function () { tOut = setTimeout(api.close, 220); });
      }
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.open(); var f = items()[0]; if (f) setTimeout(function () { f.focus(); }, 30); }
      });
      menu.addEventListener('keydown', function (e) {
        var list = items(), i = list.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (list[i + 1] || list[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (list[i - 1] || list[list.length - 1]).focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); api.close(); btn.focus(); }
      });
      sg.addEventListener('focusout', function (e) { if (!sg.contains(e.relatedTarget)) api.close(); });
      menu.addEventListener('click', function (e) { if (e.target.closest('button') && !sg.classList.contains('sg-solo')) setTimeout(api.close, 0); });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('[data-sg]')) closeGroups(); });
    window.addEventListener('resize', function () { closeGroups(); });
    window.addEventListener('scroll', function () { closeGroups(); }, { passive: true });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeGroups(); });
  });

  // Вплывание при прокрутке: где нет CSS scroll-driven анимаций — IntersectionObserver
  safe(function () {
    var els = $$('.rv'); if (!els.length) return;
    if (reduce || (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) || !('IntersectionObserver' in window)) { els.forEach(function (x) { x.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (x) { io.observe(x); });
  });

  // Курсор: точка следует точно, кольцо — с мягкой задержкой. Над кнопками кольцо растёт,
  // над группами кнопок становится терракотовой «капсулой», над полями ввода прячется.
  safe(function () {
    if (!fine || reduce) return;
    var root = document.createElement('div'); root.className = 'ccur is-hidden'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<span class="ccur-ring"></span><span class="ccur-dot"></span>';
    document.body.appendChild(root); document.documentElement.classList.add('has-ccur');
    var dot = root.lastChild, ring = root.firstChild;
    var x = -100, y = -100, rx = -100, ry = -100, raf = 0;
    function loop() {
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      raf = (Math.abs(x - rx) + Math.abs(y - ry) > 0.3) ? requestAnimationFrame(loop) : 0;
    }
    var LINK = 'a,button,[role=button],[role=menuitem],[role=tab],summary,label,.k,.ncard-a,select';
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      if (!raf) raf = requestAnimationFrame(loop);
      var t = e.target, txt = t.closest && t.closest('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable="true"]');
      root.classList.remove('is-hidden');
      root.classList.toggle('is-text', !!txt);
      root.classList.toggle('is-group', !txt && !!(t.closest && t.closest('[data-sg] .sg-btn, .sg-menu')));
      root.classList.toggle('is-link', !txt && !root.classList.contains('is-group') && !!(t.closest && t.closest(LINK)));
    }, { passive: true });
    document.addEventListener('pointerdown', function () { root.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { root.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { root.classList.add('is-hidden'); });
    window.addEventListener('blur', function () { root.classList.add('is-hidden'); });
  });
})();
