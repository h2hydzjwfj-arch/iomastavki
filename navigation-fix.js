/* IOMASTAVKA — accessible navigation menus */
(function () {
  'use strict';
  function closeAll(except) {
    document.querySelectorAll('[data-sg].is-open').forEach(function (item) {
      if (item === except) return;
      item.classList.remove('is-open');
      var trigger = item.querySelector('.sg-btn');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-sg] > .sg-btn');
    if (trigger) {
      event.preventDefault();
      var item = trigger.parentElement;
      var willOpen = !item.classList.contains('is-open');
      closeAll(item);
      item.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }
    var menuItem = event.target.closest && event.target.closest('[data-sg] .sg-menu');
    if (!menuItem) closeAll();
    else if (event.target.closest('[data-open-view],[data-proxy]')) closeAll();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAll();
      var active = document.activeElement;
      if (active && active.classList && active.classList.contains('sg-btn')) active.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', function (event) {
    var proxy = event.target.closest && event.target.closest('[data-proxy]');
    if (!proxy) return;
    var target = document.querySelector(proxy.getAttribute('data-proxy'));
    if (target) { event.preventDefault(); target.click(); }
  });
})();