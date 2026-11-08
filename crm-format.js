/* IOMASTAVKA — читаемые тексты в CRM: входящие заявки, письма и ответы агентов.
   Сверху — главное одной строкой (маршрут, вес, места, объём, ставки, сроки); «Поле: значение» — аккуратной таблицей;
   подпись — мелко; старая переписка («> …», «-----Original Message-----», «… пишет:») — свёрнута. */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var QUOTE = /^(?:>|-{2,}\s*(?:original message|исходное сообщение|пересылаемое сообщение|forwarded message|переслано)|on\s.{6,90}\swrote:?$|.{4,90}\s(?:пишет|написал[а]?):$|от:\s.+|from:\s.+@.+|sent from my|отправлено (?:с|из) )/i;
  var SIG = /^(?:--\s*$|с уважением|best regards|kind regards|regards[,!.]?$|br,?$|thanks[,!.]?$|thank you[,!.]?$|спасибо[,!.]?$|sincerely)/i;
  var KV = /^([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9 .\/()№-]{0,34}?)\s*:\s+(\S.{0,400})$/;
  var LI = /^\s*(?:[-–—•*·]|\d{1,2}[.)])\s+(.+)$/;
  var N = '(?<![\\dA-Za-zА-Яа-яЁё.,])(?:\\d{1,3}(?:[ \\u00a0]\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?)', SP = '[ \\u00a0]?';
  var HL = [
    new RegExp('(?:(?:USD|CNY|RMB|EUR|RUB|US\\$|\\$|¥|€|₽)' + SP + '(?:' + N + ')|(?:' + N + ')' + SP + '(?:USD|CNY|RMB|EUR|RUB|руб\\.?|рубл[а-яё]*|юан[а-яё]*|долл[а-яё.]*|евро|\\$|¥|€|₽))(?:\\s?(?:\\/|за|per)\\s?(?:kg|кг|cbm|м3|м³|куб[а-яё.]*|40\\s?(?:HQ|HC|ft)|20\\s?(?:GP|ft)|контейнер[а-яё]*|container|truck|машин[а-яё]*|партию))?', 'gi'),
    new RegExp('(?:' + N + ')' + SP + '(?:кг|kg|kgs|т|тонн[а-яё]*|tons?|м3|м³|куб[а-яё.]*|cbm|мест[а-яё]*|короб[а-яё]*|паллет[а-яё]*|pallets?|ctns?|cartons?|pcs|шт\\.?)(?![а-яёa-z])', 'gi'),
    /\b(?:[1-4]\s?x\s?)?(?:40|20|45)\s?['’]?\s?(?:HQ|HC|GP|DC|ft|футов)\b/gi,
    /\b\d{1,3}\s?[-–]\s?\d{1,3}\s?(?:дн[а-яё.]*|сут[а-яё.]*|days?|рабочих дн[а-яё]*)/gi
  ];
  function hl(s) {
    var t = esc(s), marks = [];
    HL.forEach(function (rx) { t = t.replace(rx, function (m) { if (/\u0000/.test(m)) return m; marks.push(m); return '\u0000' + (marks.length - 1) + '\u0001'; }); });
    return t.replace(/\u0000(\d+)\u0001/g, function (_, i) { return '<mark class="fm-hl">' + marks[+i] + '</mark>'; });
  }
  function link(t) { return t.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g, function (u) { return '<a href="' + (/^www\./.test(u) ? 'https://' + u : u) + '" target="_blank" rel="noopener">' + u + '</a>'; }).replace(/([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '<a href="mailto:$1">$1</a>'); }

  /* главное из текста: маршрут, вес, объём, места, ставки, сроки */
  var RU = { msk: 1, spb: 1, nnov: 1, kzn: 1, sam: 1, ekb: 1, chel: 1, omsk: 1, nsk: 1, krs: 1, irk: 1, ulu: 1, chita: 1, khb: 1, uss: 1, vvo: 1, krd: 1, rnd: 1, perm: 1, ufa: 1, tmn: 1, vrn: 1, minsk: 1, bel: 1, blg: 1, zab: 1, nau: 1, pog: 1, kya: 1 };
  function cities(text) {
    var R = window.IOMA_RMAP; if (!R || !R.cities) return [];
    var C = R.cities, keys = Object.keys(C), out = [], seen = {};
    String(text).replace(/[A-Za-zА-ЯЁа-яё][A-Za-zА-ЯЁа-яё'-]{1,}/g, function (w, at) {
      var lw = w.toLowerCase().replace(/ё/g, 'е');
      for (var i = 0; i < keys.length; i++) {
        var c = C[keys[i]], ru = String(c[0]).toLowerCase().replace(/ё/g, 'е'), en = String(c[1]).toLowerCase(), st = ru.length > 4 ? ru.replace(/[аяоеьй]$/, '') : ru;
        if ((lw.indexOf(st) === 0 && lw.length - st.length <= 3 && /^[А-ЯЁ]/.test(w)) || lw === en) { if (!seen[keys[i]]) { seen[keys[i]] = 1; out.push({ k: keys[i], at: at, ru: !!RU[keys[i]] }); } break; }
      }
      return w;
    });
    return out;
  }
  function first(rx, t) { var m = String(t).match(rx); return m ? m[0].replace(/\s+/g, ' ').trim() : ''; }
  function facts(raw) {
    var t = String(raw || ''), out = [], R = window.IOMA_RMAP;
    var cs = cities(t), from = cs.filter(function (c) { return !c.ru; })[0], to = cs.filter(function (c) { return c.ru && !/^(zab|nau|pog|kya|blg)$/.test(c.k); })[0];
    if (from || to) out.push({ k: 'route', v: (from ? R.name(from.k) : '…') + ' → ' + (to ? R.name(to.k) : '…') });
    var w = first(new RegExp('(?:' + N + ')' + SP + '(?:кг|kg|kgs)(?![а-яёa-z])', 'i'), t) || first(new RegExp('(?:' + N + ')' + SP + '(?:т|тонн[а-яё]*|tons?)(?![а-яёa-z])', 'i'), t); if (w) out.push({ k: 'weight', v: w });
    var v = first(new RegExp('(?:' + N + ')' + SP + '(?:м3|м³|куб[а-яё.]*|cbm)(?![а-яёa-z])', 'i'), t); if (v) out.push({ k: 'volume', v: v });
    var p = first(/(?<![\dA-Za-zА-Яа-яЁё.,])\d+[ \u00a0]?(?:мест[а-яё]*|короб[а-яё]*|коробок|паллет[а-яё]*|pallets?|ctns?|cartons?|pcs)(?![а-яёa-z])/i, t); if (p) out.push({ k: 'places', v: p });
    var money = []; String(t).replace(HL[0], function (m) { if (money.length < 3 && money.indexOf(m) < 0) money.push(m.replace(/\s+/g, ' ')); return m; }); money.forEach(function (m) { out.push({ k: 'money', v: m }); });
    var d = first(HL[3], t); if (d) out.push({ k: 'days', v: d });
    var vd = String(t).match(/(?:valid(?:ity)?(?:\s+(?:till|until|to))?|действ[а-яё]*\s+до|актуальн[а-яё]*\s+до)\s*[:–-]?\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[а-яёa-z]{3,}\.?)/i); if (vd) out.push({ k: 'valid', v: 'до ' + vd[1] });
    return out;
  }
  var ICON = { route: '<path d="M5 18a2 2 0 100-4 2 2 0 000 4zM19 10a2 2 0 100-4 2 2 0 000 4zM6.5 14.5C9 9 15 15 17.5 9.5"/>', weight: '<path d="M6 9h12l2 11H4zM9 9a3 3 0 016 0"/>', volume: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>', places: '<path d="M4 8h16v12H4zM4 8l2-4h12l2 4M10 12h4"/>', money: '<path d="M12 3v18M16.5 7.5C15.5 6 14 5.5 12 5.5c-2.5 0-4 1.3-4 3s1.5 2.6 4 3 4 1.4 4 3.2-1.6 3.3-4 3.3c-2.2 0-3.8-.7-4.7-2.3"/>', days: '<path d="M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z"/>', valid: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>' };
  function chips(f) { return f.length ? '<div class="fm-facts">' + f.map(function (x) { return '<span class="fm-f fm-' + x.k + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[x.k] + '</svg>' + esc(x.v) + '</span>'; }).join('') + '</div>' : ''; }

  function rich(raw, o) {
    o = o || {}; var s = String(raw || '').replace(/\r\n?/g, '\n').replace(/ /g, ' ').trim(); if (!s) return '';
    // старые записи сохранялись в одну строку — возвращаем переносы перед полями заявки, подписью и старой перепиской
    if (s.indexOf('\n') < 0 && s.length > 60) s = s.replace(/\s+(?=(?:Имя|Контакт|Телефон|Почта|E-?mail|Маршрут|Откуда|Куда|Груз|Товар|Вес|Объ[её]м|Мест|Места|Габариты|Вид транспорта|Транспорт|Условия|Комментарий|Инвойс|Стоимость|Страница|Источник|Компания|ИНН|Ставка|Срок|Тема):\s)/g, '\n')
      .replace(/\s+(?=(?:С уважением|Best regards|Kind regards|-{3,}\s*Original Message|-{3,}\s*Исходное сообщение|From:\s|От:\s))/g, '\n');
    var lines = s.split('\n'), qi = -1, si = -1, i;
    for (i = 1; i < lines.length; i++) if (QUOTE.test(lines[i].trim())) { qi = i; break; }
    var main = qi > 0 ? lines.slice(0, qi) : lines, quoted = qi > 0 ? lines.slice(qi) : [];
    for (i = 1; i < main.length; i++) if (SIG.test(main[i].trim()) && main.length - i <= 12) { si = i; break; }
    var body = si > 0 ? main.slice(0, si) : main, sig = si > 0 ? main.slice(si) : [];
    var h = '', para = [], kv = [], li = [];
    function fp() { if (para.length) { h += '<p>' + para.map(function (x) { return link(hl(x)); }).join('<br>') + '</p>'; para = []; } }
    function fk() { if (kv.length) { if (kv.length === 1) para.push(kv[0][0] + ': ' + kv[0][1]); else { fp(); h += '<dl class="fm-kv">' + kv.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + link(hl(x[1])) + '</dd>'; }).join('') + '</dl>'; } kv = []; } }
    function fl() { if (li.length) { fp(); h += '<ul class="fm-ul">' + li.map(function (x) { return '<li>' + link(hl(x)) + '</li>'; }).join('') + '</ul>'; li = []; } }
    body.forEach(function (ln) {
      var t = ln.trim(), m;
      if (!t) { fk(); fl(); fp(); return; }
      if ((m = t.match(KV)) && !/^https?$/i.test(m[1])) { fl(); if (para.length && !kv.length) fp(); kv.push([m[1], m[2]]); return; }
      if ((m = t.match(LI))) { fk(); li.push(m[1]); return; }
      fk(); fl(); para.push(t);
    });
    fk(); fl(); fp();
    var f = o.facts === false ? [] : facts(body.join('\n'));
    // факты повторяют короткую заявку «Имя/Контакт/Маршрут» — для неё не нужны
    if (/<dl class="fm-kv">/.test(h) && f.length && body.length <= 8) f = f.filter(function (x) { return x.k === 'money' || x.k === 'days' || x.k === 'valid'; });
    return chips(f) + '<div class="fm-body">' + h + '</div>'
      + (sig.length ? '<div class="fm-sig">' + sig.filter(function (x) { return x.trim(); }).map(function (x) { return link(esc(x.trim())); }).join('<br>') + '</div>' : '')
      + (quoted.length ? '<details class="fm-quote"><summary>Предыдущая переписка · ' + quoted.filter(function (x) { return x.trim(); }).length + ' строк</summary><div>' + quoted.map(function (x) { return esc(x.replace(/^>\s?/, '')); }).join('<br>') + '</div></details>' : '');
  }
  window.IOMA_FMT = { rich: rich, facts: facts, esc: esc };
})();
