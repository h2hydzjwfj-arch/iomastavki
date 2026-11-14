/* IOMASTAVKA — быстрый расчёт на главной вместо карты: три поля и кнопка, дальше открывается полный расчёт. */
(function () {
  'use strict';
  function init() {
    var host = document.querySelector('.hx .hx-r'); if (!host || host.querySelector('.hq')) return;
    var L = window.IOMA_CITIES || [];
    var opt = function (code) { return L.filter(function (c) { return c[5] === code; }).map(function (c) { return '<option value="' + c[0] + '">'; }).join(''); };
    host.insertAdjacentHTML('beforeend',
      '<form class="hq" autocomplete="off"><div class="hq-h"><b>Быстрый расчёт</b><span>ориентир за минуту</span></div>'
      + '<label><span>Откуда</span><input name="f" list="hqFrom" placeholder="Город в Китае" value="Иу"></label>'
      + '<label><span>Куда</span><input name="t" list="hqTo" placeholder="Город в России" value="Москва"></label>'
      + '<div class="hq-2"><label><span>Вес, кг</span><input name="w" inputmode="decimal" placeholder="500"></label><label><span>Мест</span><input name="p" inputmode="numeric" placeholder="1"></label></div>'
      + '<button type="submit" class="hq-go">Рассчитать</button>'
      + '<ul class="hq-facts"><li><b>Китай → Москва</b><span>авто, ЖД, авиа, море + ЖД</span></li><li><b>Забайкальск</b><span>основной погранпереход</span></li><li><b>Только ИП и юрлица</b><span>договор, закрывающие документы</span></li></ul>'
      + '<datalist id="hqFrom">' + opt('cn') + opt('kr') + opt('in') + '</datalist><datalist id="hqTo">' + opt('ru') + '</datalist></form>');
    host.querySelector('.hq').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target;
      var set = function (id, v) { var el = document.getElementById(id); if (el && v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } };
      var open = document.querySelector('[data-open-view="calculator"]'); if (open) open.click();
      setTimeout(function () {
        set('fromCity', f.f.value.trim()); set('toCity', f.t.value.trim()); set('weight', f.w.value.trim()); set('pieces', f.p.value.trim());
        ['fromSuggestions', 'toSuggestions'].forEach(function (id) { var b = document.getElementById(id); if (b) { b.classList.remove('open'); b.innerHTML = ''; } });
        if (f.w.value.trim()) { var c = document.getElementById('calculate'); if (c) c.click(); }
      }, 350);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
