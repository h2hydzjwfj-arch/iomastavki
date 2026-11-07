/* IOMASTAVKA — правки сайта, сделанные роботом-помощником: замена текстов и акцентный цвет.
   Тексты меняются на всех страницах, включая то, что дорисовывается позже (кейсы, услуги, карта);
   рабочее место администратора и поля ввода не трогаем. */
(function () {
  'use strict';
  var S = { texts: [], theme: null }, SKIP = 'script,style,textarea,input,select,code,pre,#workView,.cx-ov,.rb-panel,[contenteditable]';
  var done = new WeakMap(), busy = false, timer = 0;
  function apply(root) {
    if (!S.texts.length || busy) return; busy = true;
    try {
      var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT), nd;
      while ((nd = w.nextNode())) {
        var v = nd.nodeValue; if (!v || v.length < 2 || done.get(nd) === v) continue;
        var el = nd.parentElement; if (!el || el.closest(SKIP)) continue;
        var out = v;
        for (var i = 0; i < S.texts.length; i++) { var t = S.texts[i]; if (out.indexOf(t.find) >= 0 && out.indexOf(t.replace) < 0) out = out.split(t.find).join(t.replace); }
        if (out !== v) nd.nodeValue = out;
        done.set(nd, out);
      }
    } finally { busy = false; }
  }
  function later() { clearTimeout(timer); timer = setTimeout(function () { apply(); }, 90); }
  // цвет: из одного акцента — светлый и тёмный оттенки, во все переменные темы
  function shade(h, k) { var n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); }); return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function theme() {
    var id = 'iomaSiteTheme', st = document.getElementById(id);
    if (!S.theme || !/^#[0-9a-f]{6}$/i.test(S.theme.accent || '')) { if (st) st.remove(); return; }
    var a = S.theme.accent, l = shade(a, .2), d = shade(a, -.2), dd = shade(a, -.34);
    var css = ':root,html:root body{--ui-o1:' + l + ';--ui-o2:' + a + ';--ui-o3:' + d + ';--c-clay:' + a + ';--c-clayd:' + d + ';--c-claydd:' + dd + ';--c-clayl:' + shade(a, .38) + ';--v-acc:' + d + ';--v-accd:' + dd + ';--v-amber:' + d + ';--v-amberd:' + dd + '}'
      + 'html:root body .calculate,html:root body #calculate,html:root body .hx-btn-o,html:root body .rmap-go{background:linear-gradient(120deg,' + l + ',' + a + ' 55%,' + d + ')!important}';
    if (!st) { st = document.createElement('style'); st.id = id; document.head.appendChild(st); }
    st.textContent = css;
  }
  function i18n() {
    if (!window.IOMA_T_ADD) return; var add = {};
    S.texts.forEach(function (t) { if (t.en || t.zh) add[t.replace] = [t.en || t.replace, t.zh || t.en || t.replace]; });
    if (Object.keys(add).length) window.IOMA_T_ADD(add);
  }
  function load() {
    return fetch('/api/site/custom', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) return;
      var had = S.texts.length; S.texts = (d.texts || []).filter(function (t) { return t && t.find && t.replace; }); S.theme = d.theme || null;
      done = new WeakMap(); theme(); i18n(); apply();
      if (!had && S.texts.length) new MutationObserver(function () { if (!busy) later(); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }).catch(function () {});
  }
  // сколько раз текст встречается на сайте (робот проверяет, что правка найдёт свой текст)
  function count(find) {
    var n = 0, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nd;
    while ((nd = w.nextNode())) { var el = nd.parentElement; if (!el || el.closest(SKIP)) continue; var v = nd.nodeValue || ''; var i = v.indexOf(find); while (i >= 0) { n++; i = v.indexOf(find, i + find.length); } }
    // и в атрибутах-подсказках
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(function (e) { if (e.closest(SKIP.replace('input,', ''))) return; ['placeholder', 'title', 'aria-label'].forEach(function (a) { var v = e.getAttribute(a); if (v && v.indexOf(find) >= 0) n++; }); });
    return n;
  }
  window.IOMA_SITE = { reload: load, count: count, get state() { return S; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
