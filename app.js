const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// --- UI helpers: icons, toasts, understandable errors -----------------------
const ICONS = {
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  map:'<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v12.5"/>',
  ship:'<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.9 5.3 2.8 7.8"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4M12 2v3"/>',
  train:'<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1M15 15l1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3M16 19l2 3"/>',
  truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  sparkle:'<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'
};
function ico(name, cls = ''){ return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>'; }

function toast(msg, type = 'info', ms = 3800){
  let host = document.getElementById('toastHost');
  if (!host){
    host = document.createElement('div');
    host.id = 'toastHost'; host.className = 'toast-host';
    host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = ico(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info') + '<span></span>';
  t.lastChild.textContent = msg;
  host.appendChild(t);
  while (host.children.length > 3) host.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

function friendlyError(e){
  const m = String((e && e.message) || e || '');
  const L = (typeof lang !== 'undefined' && lang) || 'ru';
  const T = {
    net: {ru:'Нет связи с сервером. Проверьте интернет и повторите попытку.', en:'No connection to the server. Check your internet and try again.', tr:'Sunucuya bağlanılamadı. İnternetinizi kontrol edip tekrar deneyin.', zh:'无法连接服务器，请检查网络后重试。'},
    generic: {ru:'Что-то пошло не так. Повторите попытку.', en:'Something went wrong. Please try again.', tr:'Bir şeyler ters gitti. Lütfen tekrar deneyin.', zh:'出了点问题，请重试。'}
  };
  if (/failed to fetch|networkerror|load failed|network request failed|fetch/i.test(m) || (typeof navigator !== 'undefined' && navigator.onLine === false)) return T.net[L] || T.net.ru;
  return m.trim() || T.generic[L] || T.generic.ru;
}

// --- Загрузка КП / ставок из файла в калькуляторе ---


/* ============ РОЛЬ-ГЕЙТ 2026-09-30 ============ */
(function(){
  if (window.__iomaGate) return;
  window.__iomaGate = true;

  var AUTH_ONLY = ['agentImportButton', 'customsButton'];

  function apply(role, username){
    var authed = (role === 'admin' || role === 'client');
    document.querySelectorAll('[data-client-only]').forEach(function(el){
      if (authed){ el.removeAttribute('hidden'); el.style.removeProperty('display'); }
      else { el.setAttribute('hidden', ''); el.style.setProperty('display', 'none', 'important'); }
    });
    AUTH_ONLY.forEach(function(id){
      var el = document.getElementById(id); if (!el) return;
      if (authed) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });
    var login  = document.getElementById('loginGateBtn');
    var logout = document.getElementById('iomaLogoutBtn');
    var cab    = document.getElementById('iomaCabinetBtn');
    if (login)  login.style.display  = authed ? 'none' : 'inline-flex';
    if (logout) logout.style.display = authed ? 'inline-flex' : 'none';
    if (cab)    cab.style.display    = (role === 'client') ? 'inline-flex' : 'none';
    document.documentElement.classList.toggle('is-authed', authed);
  }

  function check(){
    fetch('/api/whoami?t=' + Date.now(), { credentials:'same-origin', cache:'no-store' })
      .then(function(r){ return r.json().catch(function(){ return {}; }); })
      .then(function(d){ apply((d && d.role) || 'guest', (d && d.username) || ''); })
      .catch(function(){ apply('guest', ''); });
  }

  function ensureBtn(id, label, cls, handler){
    if (document.getElementById(id)) return;
    var actions = document.querySelector('.top-actions'); if (!actions) return;
    var b = document.createElement('button');
    b.id = id; b.type = 'button'; b.className = 'login-gate-btn ' + cls;
    b.style.display = 'none';
    b.innerHTML = '<span>' + label + '</span>';
    b.addEventListener('click', handler, true);
    actions.appendChild(b);
  }

  function ensureLogout(){
    ensureBtn('iomaLogoutBtn', 'Выйти', 'ioma-logout', function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      window.location.href = '/api/logout?t=' + Date.now();
    });
  }

  function ensureCabinetBtn(){
    ensureBtn('iomaCabinetBtn', 'Личный кабинет', 'ioma-cabinet', function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      if (window.iomaOpenCabinet) window.iomaOpenCabinet();
    });
  }

  function init(){ ensureCabinetBtn(); ensureLogout(); check(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
