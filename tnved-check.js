'use strict';
/*
 * Проверка 10-значного кода ТН ВЭД ЕАЭС для сайта и Telegram-бота.
 * Та же логика, что в tools/tnved_check.py (скрипт для командной строки):
 *   1) очистка кода; 2) страница кода в публичном справочнике alta.ru — дерево позиции, базовая ставка
 *   импортной пошлины, НДС, акциз; 3) сумма пошлины в ₽ (адвалорная, специфическая по весу/количеству
 *   и курсу ЦБ, комбинированная «но не менее» — большая из двух, «плюс» — сумма); 4) таможенный сбор
 *   по действующей шкале (настройки калькулятора ВЭД, по умолчанию — 2026 год); 5) отчёт с эмодзи.
 * Без внешних зависимостей: разметка alta.ru разбирается по известным классам (pTnved_*).
 */
const fs = require('fs');
const path = require('path');
const VED = require('./ved');

const ALTA_URL = code => `https://www.alta.ru/tnved/code/${code}/`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 iomastavka-tnved/1.0';
const BASE_VAT = 22;
const CACHE_MS = 6 * 3600 * 1000;

class TnvedError extends Error {
  constructor(message, status, kind) { super(message); this.status = status || 400; this.kind = kind || 'bad_input'; }
}
const badInput = m => new TnvedError(m, 400, 'bad_input');
const notFound = m => new TnvedError(m, 404, 'not_found');
const unavailable = m => new TnvedError(m, 503, 'source_unavailable');
const formatChanged = m => new TnvedError(m, 502, 'format_changed');

// ---------------------------------------------------------------- ввод и форматирование

function cleanCode(raw) {
  const d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (d.length !== 10) throw badInput(`Код ТН ВЭД должен содержать 10 цифр, получено ${d.length}: «${String(raw == null ? '' : raw).trim()}»`);
  return d;
}

/** «1 250 000,50 ₽» → 1250000.5; пустое → null (если allowEmpty), иначе ошибка. */
function parseAmount(raw, what, allowEmpty) {
  let s = String(raw == null ? '' : raw).replace(/руб(лей|ля|ль)?\.?|₽|rub/gi, '').replace(/[\s  ]/g, '').replace(/,/g, '.');
  if (!s) { if (allowEmpty) return null; throw badInput(`${what || 'Стоимость'}: укажите число`); }
  if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, ''); // «1.250.000» — точки как разделители тысяч
  if (!/^\d+(\.\d+)?$/.test(s)) throw badInput(`${what || 'Стоимость'}: не похоже на число — «${String(raw).trim()}»`);
  return Number(s);
}

/** «800 USD», «$800», «5 000 юаней», «€300», «120000 ₽» → { amount, currency }; без валюты — валюта из подсказки (по умолчанию ₽). */
const CUR_RE = [[/usd|\$|долл/i, 'USD'], [/eur|€|евро/i, 'EUR'], [/cny|rmb|¥|юан|yuan/i, 'CNY'], [/rub|₽|руб/i, 'RUB']];
function parseMoney(raw, curHint, what) {
  const s = String(raw == null ? '' : raw);
  let cur = null; for (const [re, c] of CUR_RE) if (re.test(s)) { cur = c; break; }
  const amount = parseAmount(s.replace(/usd|eur|cny|rmb|rub|долл[а-яё.]*|евро|юан[а-яё]*|yuan|руб[а-яё.]*|[$€¥₽]/gi, ''), what || 'Стоимость товара', true);
  const hint = String(curHint || '').toUpperCase();
  return amount == null ? null : { amount, currency: cur || (['USD', 'EUR', 'CNY', 'RUB'].includes(hint) ? hint : 'RUB') };
}

const fmtCode = c => `${c.slice(0, 4)} ${c.slice(4, 6)} ${c.slice(6, 9)} ${c.slice(9)}`;

/** Разделитель тысяч — пробел: 1231 → «1 231»; 91.601 (digits=2) → «91.60». */
function fmtMoney(v, digits) {
  digits = digits || 0; const f = Math.pow(10, digits);
  const r = Math.round((Math.abs(Number(v)) + 1e-9) * f) / f;
  const [w, fr] = r.toFixed(digits).split('.');
  return (Number(v) < 0 && r ? '-' : '') + w.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (digits ? '.' + fr : '');
}
const fmtNum = v => String(+Number(v).toFixed(6));

/** Сбор за таможенные операции. Товары из Приложения № 1 к ПП № 1637 (радиоэлектроника) — фиксированный сбор. */
function customsFee(value, settings, radio) {
  const S = settings || VED.DEFAULTS;
  if (radio) return Number(S.radioFee) || 73860;
  return VED.customsFee(value, S.feeScale);
}

// ---------------------------------------------------------------- пошлина

const UNITS = { 'кг': 'кг', kg: 'кг', 'т': 'т', 'тонну': 'т', 'тонна': 'т', 'пару': 'пару', 'пара': 'пару', 'пар': 'пару', 'пары': 'пару',
  'шт': 'шт', 'штуку': 'шт', 'штука': 'шт', 'л': 'л', 'литр': 'л', 'см3': 'см³', 'см³': 'см³', 'куб.см': 'см³', 'м2': 'м²', 'м²': 'м²', 'кв.м': 'м²', 'л.с': 'л.с.', 'л.с.': 'л.с.' };
const CURRENCIES = [['евро', 'EUR'], ['евр', 'EUR'], ['eur', 'EUR'], ['€', 'EUR'], ['доллар', 'USD'], ['долл', 'USD'], ['usd', 'USD'], ['$', 'USD'], ['руб', 'RUB'], ['rub', 'RUB'], ['₽', 'RUB']];
const CUR_SIGN = { EUR: '€', USD: '$', RUB: '₽' };
const NUM = '(\\d+(?:\\.\\d+)?)';
const SPEC_RE = new RegExp(NUM + '\\s*(евро|евр|eur|€|доллар[а-яё]*|долл[а-яё]*|usd|\\$|руб[а-яё]*|rub|₽)\\.?\\s*(?:/|за)\\s*(?:1\\s*)?([а-яёa-z²³0-9.]+)');

/** «15%», «0», «Беспошлинно», «0.34 евр/пару», «10%, но не менее 2.25 евро/кг», «5% плюс 0.1 евро/кг». */
function parseDuty(text, note) {
  let shown = String(text || '').replace(/\s+/g, ' ').trim().replace(/\s+,/g, ',');
  const t = shown.toLowerCase().replace(/ё/g, 'е').replace(/(\d),(\d)/g, '$1.$2');
  const duty = { text: shown, parts: [], mode: 'single', note: String(note || '').replace(/\s+/g, ' ').trim() };
  if (!t || t.includes('беспошлин') || /^0+(\.0+)?\s*%?$/.test(t)) {
    duty.parts = [{ kind: 'ad_valorem', value: 0 }];
    if (!shown || /^0(\.0)?$/.test(shown)) duty.text = '0%';
    return duty;
  }
  const adv = t.match(new RegExp(NUM + '\\s*%'));
  const spec = t.match(SPEC_RE);
  if (adv) duty.parts.push({ kind: 'ad_valorem', value: Number(adv[1]) });
  if (spec) {
    const cur = (CURRENCIES.find(([k]) => spec[2].startsWith(k)) || [, 'EUR'])[1];
    const raw = spec[3].replace(/\.$/, '');
    duty.parts.push({ kind: 'specific', value: Number(spec[1]), currency: cur, unit: UNITS[raw] || UNITS[raw.replace(/\.$/, '')] || raw });
  }
  if (!duty.parts.length) throw formatChanged(`Не удалось понять ставку пошлины: «${shown}»`);
  if (duty.parts.length === 2) duty.mode = (t.includes('плюс') || t.includes('+')) ? 'plus' : 'min';
  return duty;
}

/** Количество в единицах ставки и подпись, чего не хватает. */
function quantityFor(unit, weight, qty) {
  if (unit === 'кг') return [weight, 'вес груза в кг'];
  if (unit === 'т') return [weight == null ? null : weight / 1000, 'вес груза в кг'];
  const names = { 'пару': 'количество пар', 'шт': 'количество штук', 'л': 'объём в литрах', 'см³': 'объём двигателя в см³', 'м²': 'площадь в м²', 'л.с.': 'мощность в л.с.' };
  return [qty, names[unit] || `количество в «${unit}»`];
}

/** Сумма пошлины в ₽ с расшифровкой. rates — курсы ЦБ { EUR: 91.6, USD: … } за 1 единицу валюты. */
function computeDuty(duty, value, weight, qty, rates) {
  const pieces = [];
  for (const p of duty.parts) {
    if (p.kind === 'ad_valorem') {
      if (value == null) { if (p.value === 0) { pieces.push([0, '']); continue; } return { amount: null, detail: '', missing: 'стоимость груза в ₽' }; }
      const amt = value * p.value / 100;
      pieces.push([amt, `${fmtNum(p.value)}% от ${fmtMoney(value)} ₽ = ${fmtMoney(amt)} ₽`]);
      continue;
    }
    const [q, need] = quantityFor(p.unit, weight, qty);
    if (q == null) return { amount: null, detail: '', missing: need };
    let rate = 1;
    if (p.currency !== 'RUB') {
      rate = rates && Number(rates[p.currency]);
      if (!rate) throw unavailable('Нет курса ЦБ РФ для пересчёта специфической пошлины — попробуйте позже');
    }
    const amt = p.value * q * rate;
    const unitN = p.unit === 'пару' ? 'пар' : p.unit;
    pieces.push([amt, `${fmtNum(p.value)} ${CUR_SIGN[p.currency] || p.currency} × ${fmtNum(q)} ${unitN}${p.currency === 'RUB' ? '' : ` × ${fmtMoney(rate, 2)} ₽`} = ${fmtMoney(amt)} ₽`]);
  }
  if (pieces.length === 1) return { amount: pieces[0][0], detail: duty.parts[0].kind === 'ad_valorem' ? '' : pieces[0][1], missing: '' };
  if (duty.mode === 'plus') return { amount: pieces[0][0] + pieces[1][0], detail: `${pieces[0][1]} + ${pieces[1][1]}`, missing: '' };
  return { amount: Math.max(pieces[0][0], pieces[1][0]), detail: `${pieces[0][1]}; ${pieces[1][1]} — берётся большее`, missing: '' };
}

// ---------------------------------------------------------------- страница справочника

const ENT = { nbsp: ' ', quot: '"', amp: '&', lt: '<', gt: '>', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…', apos: "'", shy: '' };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n ? String.fromCodePoint(n) : m; }
    const v = ENT[e.toLowerCase()]; return v == null ? m : v;
  });
}
const text = h => decodeEntities(String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const firstB = h => { const m = String(h || '').match(/<b\b[^>]*>([\s\S]*?)<\/b>/i); return m ? text(m[1]) : ''; };
const without = (s, part) => (part && s.includes(part) ? s.replace(part, '') : s).replace(/\s+/g, ' ').trim();

/** Разбирает HTML страницы кода на alta.ru (ту же разметку, что и tools/tnved_check.py). */
function parseAltaPage(html, code, url) {
  html = String(html || '');
  const shown = html.match(/data-original-code="([^"]*)"/i);
  if (shown && shown[1].replace(/\D/g, '') && shown[1].replace(/\D/g, '') !== code) {
    throw notFound(`Справочник открыл другой код (${shown[1]}) — кода ${code} в номенклатуре, вероятно, нет`);
  }
  // дерево позиции: блок «Позиция ТН ВЭД»
  const levels = [];
  const fsRe = /<fieldset\b[^>]*pTnved_positionFieldset[^>]*>([\s\S]*?)<\/fieldset>/gi; let fs;
  while ((fs = fsRe.exec(html))) {
    const legend = text((fs[1].match(/<legend\b[^>]*>([\s\S]*?)<\/legend>/i) || [])[1]);
    if (!legend.includes('ТН ВЭД')) continue;
    const liRe = /<li\b[^>]*pTnved_item[^>]*>([\s\S]*?)<\/li>/gi; let li;
    while ((li = liRe.exec(fs[1]))) {
      const body = li[1];
      const label = firstB(body).replace(/\.\.\.|…/g, '').trim();
      const cut = body.search(/<\/div>/i);
      let t = cut >= 0 ? text(body.slice(cut + 6)) : without(text(body), label);
      if (!t && cut >= 0) t = without(text(body), label);
      if (t) levels.push({ code: label, text: t });
    }
    break;
  }
  // ставки при импорте: вложенный блок «Импорт»
  let dutyText = '', dutyNote = '', excise = ''; const vat = [];
  const imp = html.search(/<legend\b[^>]*>\s*Импорт\s*<\/legend>/i);
  if (imp >= 0) {
    const end = html.indexOf('</fieldset>', imp);
    const block = html.slice(imp, end > 0 ? end : undefined);
    const rowRe = /<tr\b[^>]*pTnved_item[^>]*>([\s\S]*?)<\/tr>/gi; let row;
    while ((row = rowRe.exec(block))) {
      const cells = row[1].split(/<td\b[^>]*>/i).slice(1).map(c => c.replace(/<\/td>\s*$/i, ''));
      if (cells.length < 2) continue;
      const label = text(cells[0]), cell = cells.slice(1).join(' ');
      if (label.startsWith('Базовая ставка')) {
        dutyText = firstB(cell) || text(cell);
        dutyNote = without(text(cell), dutyText);
      } else if (label === 'НДС') {
        const items = cell.match(/<div\b[^>]*>[\s\S]*?<\/div>/gi) || [cell];
        for (const it of items) {
          const b = firstB(it); if (!b) continue;
          const m = b.match(/(\d+(?:[.,]\d+)?)\s*%/); if (!m) continue;
          let cond = without(text(it), b).replace(/^[-–—\s]+/, '');
          if (cond.startsWith('Для отдельных категорий')) cond = '';
          vat.push({ rate: Number(m[1].replace(',', '.')), condition: cond });
        }
      } else if (label === 'Акциз') excise = text(cell);
    }
  }
  if (!levels.length && !dutyText) throw formatChanged('На странице справочника не нашлось ни описания, ни ставок — похоже, изменилась вёрстка alta.ru или сайт показал заглушку');
  return { code, url: url || ALTA_URL(code), levels, duty: parseDuty(dutyText, dutyNote), vat, excise };
}

// ---------------------------------------------------------------- загрузка

function decodeBody(buf, contentType) {
  let cs = (String(contentType || '').match(/charset=["']?([\w-]+)/i) || [])[1];
  if (!cs) cs = (Buffer.from(buf).subarray(0, 4096).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
}

/** GET с повторами при сетевых сбоях, 429 и 5xx. Возвращает { status, text }. */
async function httpGet(url, opts) {
  opts = opts || {}; const tries = opts.retries || 3, pause = opts.pause == null ? 1000 : opts.pause; let last = '';
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9', Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(opts.timeout || 15000) });
      if (r.status === 404) return { status: 404, text: '' };
      if (![429, 500, 502, 503, 504].includes(r.status)) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return { status: r.status, text: decodeBody(await r.arrayBuffer(), r.headers.get('content-type')) };
      }
      last = 'HTTP ' + r.status;
    } catch (e) { last = e.name === 'TimeoutError' ? 'нет ответа' : e.message; }
    if (i < tries && pause) await new Promise(ok => setTimeout(ok, pause * i));
  }
  throw unavailable(`Справочник alta.ru недоступен (${last}). Попробуйте позже.`);
}

// ---------------------------------------------------------------- локальный справочник (запасной источник)

/*
 * reference/tnved-base.json — 200–300 ходовых для Китая кодов (электроника, одежда, оборудование, станки…)
 * с реальными ставками, собранными с alta.ru скриптом tools/build-tnved-base.js. Используется, когда alta.ru
 * недоступен или сменил вёрстку; в отчёте всегда помечено, что данные из локальной базы и на какую дату.
 */
const BASE_FILE = path.join(__dirname, 'reference', 'tnved-base.json');
let base;
function loadBase(file) {
  if (file) { base = undefined; }
  if (base !== undefined) return base;
  try { const b = JSON.parse(fs.readFileSync(file || BASE_FILE, 'utf8')); base = b && b.codes && Array.isArray(b.nodes) ? b : null; }
  catch { base = null; }
  return base;
}
const fmtDate = iso => (/^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4) : String(iso || ''));

/** Запись локального справочника в том же виде, что разбор страницы alta.ru. */
function baseInfo(code) {
  const b = loadBase(); const e = b && b.codes[code]; if (!e) return null;
  const levels = (e.path || []).map(i => b.nodes[i]).filter(Boolean).map(([c, t]) => ({ code: c, text: t }));
  return { code, url: ALTA_URL(code), levels, duty: parseDuty(e.duty, e.note), vat: (e.vat || []).map(([rate, condition]) => ({ rate, condition: condition || '' })),
    excise: e.excise || '', category: e.cat || '', source: 'local', baseDate: b.fetchedAt || '' };
}
const baseName = e => { const b = loadBase(); const p = (e.path || []).map(i => b.nodes[i]).filter(Boolean); const last = p[p.length - 1]; let n = last ? last[1] : '';
  // «прочие» и «– – прочая» без родителя непонятны: добавляем ближайший осмысленный уровень
  if (/^[–—-]*\s*прочи[ейяхм]/i.test(n) || n.length < 14) { const up = p.slice(0, -1).reverse().find(x => x[1] && !/^[–—-]*\s*прочи/i.test(x[1])); if (up) n = up[1].replace(/\s*:$/, '') + ' — ' + n.replace(/^[–—-\s]+/, ''); }
  return n; };

// Бытовые названия → позиции ТН ВЭД: в номенклатуре нет слов «ноутбук» или «кроссовки»
const SYN = [
  [/ноутбук|лэптоп|laptop|планшет/, ['847130']], [/смартфон|телефон|мобильн/, ['851713']], [/роутер|маршрутизатор|коммутатор|модем|смарт-?час/, ['851762']],
  [/наушник|гарнитур/, ['851830']], [/колонк|динамик|акустик/, ['851822', '851821']], [/зарядн|блок питания|адаптер питания|power bank/, ['850440']],
  [/аккумулятор|батаре/, ['8507']], [/кабел|провод/, ['8544']], [/телевизор/, ['852872']], [/монитор/, ['852852', '852859']], [/проектор/, ['852862']],
  [/камер|видеонаблюд/, ['852589']], [/флешк|ssd|накопител/, ['852351', '847170']], [/клавиатур|мыш|принтер|сканер/, ['847160', '844332']],
  [/светодиод|лампа|led/, ['853950', '854141']], [/солнечн|панел/, ['854143']], [/кондиционер/, ['841510']], [/холодильник/, ['841821']],
  [/стиральн/, ['845011']], [/пылесос/, ['850811']], [/фен(?![а-яё])|фена/, ['851631']], [/микроволн/, ['851650']], [/кофе/, ['851671']], [/вентилятор/, ['841459']],
  [/насос/, ['8413']], [/компрессор/, ['8414']], [/подшипник/, ['8482']], [/клапан|кран|задвижк/, ['8481']], [/генератор/, ['8501']], [/сварочн/, ['8515']],
  [/дрел|шуруповерт|перфоратор/, ['846721']], [/пил[аы]|болгарк/, ['846722', '846729']], [/погрузчик/, ['8427']],
  [/станок|станк|чпу|фрезер|токарн|лазерн/, ['8456', '8457', '8458', '8459', '8460', '8461', '8462', '8465']],
  [/футболк|майк/, ['6109']], [/свитер|джемпер|кофт|худи/, ['6110']], [/куртк|пуховик|ветровк/, ['6201', '6202']], [/брюк|джинс/, ['6203', '6204']],
  [/рубашк/, ['6205']], [/блузк/, ['6206']], [/бюстгальтер|белье/, ['6212']], [/детск.*одежд/, ['6111']], [/постельн|полотенц/, ['6302']],
  [/кроссовк|кед/, ['6404', '6402']], [/обув|ботинк|туфл/, ['6403', '6402', '6404']], [/сумк|рюкзак|чемодан/, ['4202']],
  [/мебел|стол|шкаф/, ['9403']], [/кресл|стул|диван/, ['9401']], [/светильник|люстр/, ['9405']], [/игрушк|конструктор/, ['9503']],
  [/велосипед/, ['8712']], [/самокат|электровелосипед/, ['8711']], [/шин[аы]|покрышк/, ['4011']], [/запчаст|тормоз|подвеск|диск колес/, ['8708']],
  [/косметик|крем|макияж/, ['3304']], [/шампун/, ['3305']], [/шприц/, ['901831']], [/посуд|кастрюл|сковород/, ['7323', '6912', '6911']],
];

/** Поиск по локальному справочнику: цифры кода, слова из названия или бытовое название («ноутбук», «кроссовки»). */
function searchBase(q, limit) {
  const b = loadBase(); if (!b) return [];
  limit = Math.min(Number(limit) || 20, 100);
  const s = String(q || '').toLowerCase().replace(/ё/g, 'е'), d = s.replace(/\D/g, '');
  const words = s.replace(/[\d.\s-]+/g, ' ').trim().split(' ').filter(w => w.length > 1).map(w => (w.length > 5 ? w.slice(0, w.length - 2) : w));
  if (!d && !words.length) return [];
  // слово должно начинаться с синонима: «шины» — шины, а «машины» — нет
  const syn = []; for (const [re, pref] of SYN) if (new RegExp('(?:^|[^а-яёa-z0-9])(?:' + re.source + ')').test(s)) syn.push(...pref);
  const out = [];
  for (const [code, e] of Object.entries(b.codes)) {
    if (d && !code.startsWith(d)) continue;
    const name = baseName(e);
    const hay = ((e.path || []).map(i => (b.nodes[i] || [])[1]).join(' ') + ' ' + (e.cat || '')).toLowerCase().replace(/ё/g, 'е');
    const bySyn = syn.some(p => code.startsWith(p));
    if (syn.length && !d ? !bySyn : (words.length && !bySyn && !words.every(w => hay.includes(w)))) continue; // бытовое название — только его позиции
    const score = (d ? 50 : 0) + (bySyn ? 40 : 0) + words.reduce((a, w) => a + (name.toLowerCase().includes(w) ? 20 : 5), 0);
    out.push([score, { code, name, duty: e.duty, vat: (e.vat || []).map(v => v[0] + '%').filter((v, i, a) => a.indexOf(v) === i).join(' / '), cat: e.cat || '', source: 'base' }]);
  }
  return out.sort((a, b2) => b2[0] - a[0] || a[1].code.localeCompare(b2[1].code)).slice(0, limit).map(x => x[1]);
}

/** Ближайшие по цифрам коды локального справочника — подсказка, если точного кода нет. */
function nearestBase(code, n) {
  const b = loadBase(); if (!b) return [];
  let best = [];
  for (let len = Math.min(8, code.length - 1); len >= 4 && !best.length; len -= 2) best = Object.keys(b.codes).filter(c => c.startsWith(code.slice(0, len)));
  return best.slice(0, n || 3).map(c => ({ code: c, name: baseName(b.codes[c]) }));
}

function withHint(err, code) {
  const near = nearestBase(code, 3);
  if (near.length) err.message += ` В локальном справочнике такого кода нет; похожие: ${near.map(x => `${x.code} (${x.name.slice(0, 60)})`).join(', ')}.`;
  err.near = near;
  return err;
}

const cache = new Map();
/**
 * Страница кода с кешем на 6 часов. get(url) — загрузчик (подменяется в тестах).
 * alta.ru недоступен или сменил вёрстку → запись из локального справочника (не кешируется: в следующий раз снова alta.ru).
 */
async function fetchTnved(code, get) {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.info;
  const url = ALTA_URL(code);
  let r;
  try { r = await (get || httpGet)(url); }
  catch (e) {
    const local = baseInfo(code); if (local) return local;
    throw withHint(e instanceof TnvedError ? e : unavailable(`Справочник alta.ru недоступен (${e.message}).`), code);
  }
  if (r.status === 404) throw notFound(`Код ${code} не найден в справочнике ТН ВЭД ЕАЭС`);
  let info;
  try { info = parseAltaPage(r.text, code, url); }
  catch (e) {
    if (e.kind === 'format_changed') { const local = baseInfo(code); if (local) return local; throw withHint(e, code); }
    throw e;
  }
  cache.set(code, { at: Date.now(), info });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return info;
}

// ---------------------------------------------------------------- разрешительные документы
// Ориентир по группе кода (точно — декларант). Самый длинный подходящий префикс выигрывает.
const PERMITS = [
  [['9018', '9019', '9020', '9021', '9022', '3005', '3006', '9402'], 'РУ Росздравнадзора — если товар является медицинским изделием'],
  [['30'], 'РУ Минздрава (лекарственное средство)'],
  [['01', '02', '03', '04', '05', '16'], 'ветеринарный контроль; ДС по ТР ТС 021 и техрегламенту на продукт'],
  [['06', '07', '08', '09', '10', '11', '12', '13', '14'], 'фитосанитарный контроль; ДС ТР ТС 021'],
  [['15', '17', '18', '19', '20', '21', '22'], 'ДС ТР ТС 021/022 (пищевая продукция)'],
  [['2106'], 'ДС или СГР по ТР ТС 021, 022, 029'],
  [['33'], 'ДС или СГР по ТР ТС 009 (парфюмерия и косметика)', 'для парфюмерии и части косметики — обязателен'],
  [['34'], 'ДС ТР ТС 030 (смазочные материалы)'],
  [['3923', '3924', '4819', '7310', '7612'], 'ДС ТР ТС 005, если это упаковка'],
  [['4011'], 'СС ТР ТС 018 (шины)', 'обязателен'],
  [['4202'], 'ДС ТР ТС 017 (сумки, рюкзаки, чемоданы)'],
  [['61', '62'], 'ДС ТР ТС 017; детская одежда — ТР ТС 007', 'обязателен для большинства позиций одежды'],
  [['63'], 'ДС ТР ТС 017', 'для постельного, столового и туалетного белья — обязателен'],
  [['64'], 'ДС ТР ТС 017; детская обувь — ТР ТС 007', 'обязателен'],
  [['8415', '8418', '8422', '8450', '8451', '8508', '8509', '8510', '8516'], 'СС ТР ТС 004 + ТР ТС 020 (бытовые электроприборы)'],
  [['8471', '8517', '8525', '8528'], 'ТР ТС 004/020; нотификация ФСБ, если есть шифрование'],
  [['84'], 'ДС ТР ТС 010 (машины и оборудование); с электрикой — ещё ТР ТС 004/020'],
  [['85'], 'ТР ТС 004/020 — ДС или СС по виду изделия'],
  [['87'], 'ТР ТС 018 — СС или ДС на автокомпоненты'],
  [['9405'], 'ТР ТС 004/020 (светильники) — СС или ДС'],
  [['94'], 'ДС ТР ТС 025 (мебель)'],
  [['9503'], 'СС ТР ТС 008 (игрушки)', 'проверить по коду'],
  [['93'], 'разрешение/лицензия (оружие и патроны)'],
];
function permitsFor(code, local) {
  const own = local && local.exact !== false ? local : null;
  let best = null, len = 0;
  for (const [prefixes, docs, chz] of PERMITS) for (const p of prefixes) if (code.startsWith(p) && p.length > len) { best = { docs, chz: chz || '' }; len = p.length; }
  const out = { docs: '', chz: '', source: '' };
  if (own && own.cert) { out.docs = String(own.cert); out.source = 'own'; }
  else if (best) { out.docs = best.docs; out.source = 'group'; }
  if (own && own.marking) out.chz = String(own.marking); else if (best && best.chz) out.chz = best.chz;
  return out;
}
/** Цены сертификации из таблицы владельца (загружается в «Коды ТН ВЭД»): самый длинный подходящий код группы. */
function certPriceFor(code, rows) {
  let best = null, len = 0;
  for (const r of rows || []) for (const c of r.codes || []) if (c && code.startsWith(c) && c.length > len) { best = r; len = c.length; }
  return best;
}

// ---------------------------------------------------------------- проверка целиком и отчёт

/**
 * input: { code, value, weight, qty } — строки или числа (стоимость в ₽, вес в кг).
 * deps: { get(url) → {status,text}, rates() → {date, rates}, settings() → настройки ВЭД, local(code) → запись справочника }
 */
async function check(input, deps) {
  input = input || {}; deps = deps || {};
  const code = cleanCode(input.code);
  const money = parseMoney(input.value, input.currency, 'Стоимость товара');
  const freightM = parseMoney(input.freight, input.freightCurrency || (money && money.currency), 'Фрахт');
  const weight = parseAmount(input.weight, 'Вес', true);
  const qty = parseAmount(input.qty, 'Количество', true);
  const info = await fetchTnved(code, deps.get);
  const settings = (deps.settings && deps.settings()) || VED.DEFAULTS;
  let local = null; try { local = deps.local ? deps.local(code) : null; } catch {}
  const radio = !!((local && local.radio) || VED.isRadio(code, settings.radioPrefixes)); // в своём справочнике отмечен код или его родительская позиция

  let rates = null, ratesDate = '';
  const spec = info.duty.parts.filter(p => p.kind === 'specific' && p.currency !== 'RUB');
  const foreign = [money, freightM].some(m => m && m.currency !== 'RUB');
  if (foreign || (spec.length && spec.every(p => quantityFor(p.unit, weight, qty)[0] != null) && (money != null || info.duty.parts.every(p => p.kind === 'specific')))) {
    const rt = deps.rates ? await deps.rates() : null;
    rates = rt && rt.rates; ratesDate = (rt && rt.date) || '';
  }
  const toRub = m => { if (!m) return null; if (m.currency === 'RUB') return m.amount; const r = rates && Number(rates[m.currency]); if (!r) throw unavailable(`Нет курса ЦБ для ${m.currency} — укажите стоимость в рублях или попробуйте позже`); return Math.round(m.amount * r * 100) / 100; };
  const value = toRub(money), freightRub = toRub(freightM);
  const cv = value == null ? null : Math.round((value + (freightRub || 0)) * 100) / 100;   // ТС = товар + фрахт
  const dutyCalc = computeDuty(info.duty, cv, weight, qty, rates);
  const [vatHead] = vatLines(info.vat); const vatRate = Number((vatHead.match(/^([\d.]+)/) || [0, BASE_VAT])[1]);
  const vatAmount = cv != null && dutyCalc.amount != null ? Math.round((cv + dutyCalc.amount) * vatRate) / 100 : null;
  const fee = value == null ? null : customsFee(value, settings, radio);        // сбор — от стоимости товара (решение владельца)
  const permits = permitsFor(code, local);
  const certPrice = deps.certPrices ? certPriceFor(code, deps.certPrices()) : null;
  const res = { ...info, value, money, freight: freightRub, freightMoney: freightM, cv, weight, qty, radio, fee, feeSource: radio ? 'фиксированный сбор для товаров из Приложения № 1 к ПП РФ № 1637' : settings.feeSource,
    dutyCalc, vatRate, vatAmount, permits, certPrice, ratesDate, forClient: !!deps.forClient };
  res.report = formatReport(res);
  return res;
}

/** Первая строка НДС и строки с другими ставками и условиями. */
function vatLines(vat) {
  if (!vat || !vat.length) return [`${BASE_VAT}% (базовая; справочник ставку не указал)`, []];
  const rates = [...new Set(vat.map(v => v.rate))];
  const base = rates.includes(BASE_VAT) ? BASE_VAT : Math.max(...rates);
  if (rates.length === 1) {
    const label = base === BASE_VAT ? 'базовая' : base > 0 ? 'льготная' : 'не облагается';
    return [`${fmtNum(base)}% (${label})`, []];
  }
  const extra = [], seen = new Set();
  for (const v of vat) {
    if (v.rate === base) continue;
    const k = v.rate + '|' + v.condition; if (seen.has(k)) continue; seen.add(k);
    extra.push(v.condition ? `${fmtNum(v.rate)}% — ${v.condition}` : `${fmtNum(v.rate)}%`);
  }
  return [`${fmtNum(base)}% (базовая)`, extra];
}

/** Отчёт в формате ТЗ (разделитель тысяч — пробел). */
const cut = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').replace(/[:;,.\s]+$/, '').trim(); return t.length > n ? t.slice(0, n).replace(/[\s,;]+\S*$/, '') + '…' : t; };
/** Название позиции: уровни ниже 4-значной позиции («спортивная обувь — прочая»); повтор соседнего уровня убирается. */
function itemName(levels) {
  const lv = (levels || []).filter(l => l.text); if (!lv.length) return '';
  const clean = t => String(t).replace(/^[–—\-\s]+/, '').replace(/[:;\s]+$/, '');
  const hi = lv.findIndex(l => /^\d{4}$/.test(String(l.code).replace(/\s/g, '')));
  let chain = (hi >= 0 ? lv.slice(hi + 1) : lv.slice(-1)).map(l => clean(l.text)).filter(Boolean);
  chain = chain.filter((t, i) => !(chain[i + 1] && t.toLowerCase().startsWith(chain[i + 1].toLowerCase())));
  const n = chain.join(' — ') || clean(lv[lv.length - 1].text);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function formatReport(res) {
  const lv = res.levels || [];
  const name = itemName(lv);
  const L = [`📋 Код: ${fmtCode(res.code)}${name ? ' — ' + cut(name, 140) : ' (описание в справочнике не найдено)'}`];
  const grp = lv.find(l => /^\d{2}$/.test(String(l.code).replace(/\s/g, ''))), head = lv.find(l => /^\d{4}$/.test(String(l.code).replace(/\s/g, '')));
  if (grp) L.push(`   Группа ${grp.code}: ${cut(grp.text, 110)}`);
  if (head) L.push(`   Позиция ${head.code}: ${cut(head.text, 110)}`);
  const d = res.duty, c = res.dutyCalc;
  let line = `💰 Пошлина: ${d.text}`;
  if (c.amount != null && (c.amount > 0 || d.parts[0].value > 0)) line += ` ≈ ${fmtMoney(c.amount)} ₽`;
  L.push(line);
  if (c.amount == null && res.value != null) L.push(`   Для расчёта суммы укажите ${c.missing}`);
  else if (c.detail) L.push(`   ${c.detail}${res.ratesDate ? ` (курс ЦБ на ${res.ratesDate})` : ''}`);
  const [vhead, extra] = vatLines(res.vat);
  L.push(`🧾 НДС: ${vhead}${res.vatAmount != null ? ` ≈ ${fmtMoney(res.vatAmount)} ₽` : ''}`);
  for (const x of extra) L.push(`   ${x}`);
  if (res.fee != null) L.push(`⚡ Сбор: ${fmtMoney(res.fee)} ₽ (от стоимости товара ${fmtMoney(res.value)} ₽)${res.radio ? ' — товар из Приложения № 1 к ПП № 1637' : ''}`);
  const p = res.permits || {};
  L.push(`📄 Разрешительные: ${p.docs ? p.docs + (p.source === 'group' ? ' — ориентир по группе кода, точно скажет декларант' : '') : 'по справочнику не видно — уточните у декларанта'}`);
  if (res.certPrice && !res.forClient) { const cp = res.certPrice; L.push(`   Примерная цена: ${cp.priceRu ? cp.priceRu + ' ₽ (РФ)' : ''}${cp.priceRu && cp.priceKg ? ', ' : ''}${cp.priceKg ? cp.priceKg + ' (Киргизия)' : ''}${cp.samples ? '; образцы: ' + cp.samples : ''}`); }
  if (p.chz) L.push(`🏷 Честный знак: ${p.chz}`);
  if (res.money && res.money.currency !== 'RUB') L.push(`💱 ${fmtMoney(res.money.amount)} ${res.money.currency} = ${fmtMoney(res.value)} ₽ по курсу ЦБ${res.ratesDate ? ' на ' + res.ratesDate : ''}`);
  if (res.freight) L.push(`   В ТС учтён фрахт ${fmtMoney(res.freight)} ₽ (ТС ${fmtMoney(res.cv)} ₽)`);
  if (res.value == null) L.push('   Стоимость не указана — показаны только ставки. Укажите стоимость (в любой валюте), чтобы посчитать суммы и сбор.');
  if (res.forClient) L.push('ℹ️ Данные примерные. Точно — по запросу в ФТС или у нашего декларанта.');
  if (res.source === 'local') L.push(`ℹ️ alta.ru недоступен — ставки из локального справочника на ${fmtDate(res.baseDate)}; перед декларированием сверьте с действующими.`);
  return L.join('\n');
}

/**
 * Разбор команды бота: «/tnved 6201 40 000 0 500 000 300кг», «тн вэд 6403190000 150000 200 пар»,
 * «/tnved 6201400000 1 250 000 вес 300 кол 120». Возвращает { code, value, weight, qty } или null.
 */
function parseCommand(msg) {
  const m = String(msg || '').trim().match(/^(?:\/tnved(?:@\w+)?|\/тнвэд|тн\s*вэд|тнвэд)\s*:?\s*([\s\S]*)$/i);
  if (!m) return null;
  let rest = m[1].replace(/ /g, ' ').trim();
  const cm = rest.match(/^((?:\d[\s.]*){10})/);
  if (!cm) return { code: rest.replace(/\D/g, '').slice(0, 12), value: '', weight: '', qty: '' };
  const code = cm[1].replace(/\D/g, '');
  rest = rest.slice(cm[1].length);
  // вес и количество — одним числом без пробелов, с единицей («300кг», «200 пар») или с подписью («вес 300», «кол 120»)
  const start = '(?:^|\\s)', num = '(\\d+(?:[.,]\\d+)?)', end = '(?=[\\s,;]|$)';
  let weight = '', qty = '';
  const take = (re, set) => { const x = rest.match(re); if (x) { set(x[1]); rest = rest.replace(x[0], ' '); } };
  take(new RegExp(start + '(?:вес|w|weight)\\s*[:=]?\\s*' + num + '\\s*(?:кг|kg)?' + end, 'i'), v => { weight = v; });
  if (!weight) take(new RegExp(start + num + '\\s*(?:кг|kg)' + end, 'i'), v => { weight = v; });
  take(new RegExp(start + '(?:кол(?:-?во|ичество)?|q|qty)\\s*[:=]?\\s*' + num + '\\s*(?:шт|пар[а-яё]*|л|см3|см³|м2|м²)?' + end, 'i'), v => { qty = v; });
  if (!qty) take(new RegExp(start + num + '\\s*(?:шт|пар[а-яё]*|л|литр[а-яё]*|см3|см³|м2|м²)\\.?' + end, 'i'), v => { qty = v; });
  const value = (rest.match(/\d[\d\s]*(?:[.,]\d+)?/) || [''])[0].trim();
  let currency = ''; for (const [re, c] of CUR_RE) if (re.test(rest)) { currency = c; break; }
  return { code, value, weight: weight.trim(), qty: qty.trim(), currency };
}

const HELP = 'Проверка кода ТН ВЭД:\n/tnved <код> [стоимость в любой валюте] [вес кг] [кол-во пар/шт]\nБез стоимости — только ставки; со стоимостью — суммы и сбор.\nНапример:\n/tnved 9021101000\n/tnved 6201400000 800 USD 300кг\n/tnved 6403190000 150 000 ₽ 200 пар';

module.exports = { parseMoney, permitsFor, certPriceFor, itemName, loadBase, baseInfo, searchBase, nearestBase, check, parseAltaPage, parseDuty, computeDuty, customsFee, cleanCode, parseAmount, fmtMoney, fmtNum, fmtCode, vatLines, formatReport, parseCommand, fetchTnved, httpGet, TnvedError, HELP, _cache: cache };
