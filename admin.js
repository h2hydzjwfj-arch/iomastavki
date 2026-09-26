// admin.js — грузится всегда. Активируется только для администратора.
(async function(){
  var who;
  try {
    who = await fetch('/api/whoami', { credentials:'same-origin' }).then(function(r){ return r.json(); });
  } catch(e){ who = { role:'client' }; }
  if (!who || who.role !== 'admin') return;

  window.__iomaRole = 'admin';
  document.documentElement.classList.add('is-admin');
  document.body.classList.add('is-admin');
  console.log('[admin] logged in as ' + (who.username || 'admin'));

  // Показываем админ-элементы (кнопки Ставки, Контракт, Карта, карточка Экспедиторы и т.п.)
  document.querySelectorAll('[data-admin-only]').forEach(function(el){
    el.removeAttribute('hidden');
  });

  // Справочник экспедиторов — только админу
  try {
    var r = await fetch('/api/agents', { credentials:'same-origin' });
    if (r.ok){
      var d = await r.json();
      if (d && Array.isArray(d.records) && d.records.length){
        try { agentDirectory = d.records; } catch(e){ window.agentDirectory = d.records; }
        if (typeof renderDirectory === 'function') renderDirectory();
        if (typeof renderForwarderMenu === 'function') renderForwarderMenu();
        console.log('[admin] agents loaded: ' + d.records.length);
      }
    }
  } catch(e){ console.warn('[admin] agents:', e.message); }

  // Калькулятор контракта — отдельный защищённый модуль
  try {
    await import('/contract.js');
    console.log('[admin] contract.js loaded');
  } catch(e){
    console.warn('[admin] contract.js:', e.message);
  }
})();
