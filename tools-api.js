'use strict';
// Инструменты логиста на сайте: сервер сам обращается к сайтам-источникам и возвращает ответ на наш сайт.
//  • /api/tools/phone      — чей номер и который там час (kody.su + свой справочник часовых поясов)
//  • /api/tools/terminal   — терминальные расходы: Москва Карго (SVO-1, их калькулятор) и Шереметьево-Карго (SVO-2, их тарифы)
//  • /api/tools/awb        — где авиагруз в Шереметьево (Шереметьево-Карго, по номеру авианакладной)
//  • /api/tools/container  — контейнер: проверка номера, линия-владелец, дислокация по ЖД (ТрансКонтейнер)
//  • /api/tools/russia     — доставка по России (Деловые Линии: по ключу DELLIN_APPKEY, без ключа — ориентир)
//  • /api/tools/sources    — какие источники сейчас отвечают
// Ответы кешируются, запросы ограничены по частоте, чтобы не нагружать чужие сайты.
const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const ADV = require('./route-advice');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const VAT = 22; // НДС с 2026 года
let RU_CA = null;
try { RU_CA = [...tls.rootCertificates, fs.readFileSync(path.join(__dirname, 'certs', 'russian-trusted-ca.pem'), 'utf8')]; } catch (e) { RU_CA = null; }

// ---------- запросы к источникам
function cleanText(html) {
  return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;?/g, ' ').replace(/&mdash;/g, '—').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').trim();
}
// fetch с таймаутом и кукой; для сайтов на сертификатах Минцифры — https с российским корневым сертификатом
function request(url, opt = {}) {
  const timeout = opt.timeout || 15000;
  // https напрямую: свой корневой сертификат (ruCa) или только IPv4 (ipv4) — некоторые сайты не отвечают по IPv6 из облака
  if ((opt.ruCa && RU_CA) || opt.ipv4) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: opt.method || 'GET', family: opt.ipv4 ? 4 : undefined, ca: opt.ruCa ? RU_CA : undefined, headers: { 'user-agent': UA, accept: opt.ruCa ? 'application/json' : '*/*', 'accept-language': 'ru-RU,ru;q=0.9', ...(opt.body ? { 'content-length': Buffer.byteLength(opt.body) } : {}), ...(opt.headers || {}) }, timeout }, x => {
        const ch = []; x.on('data', d => ch.push(d)); x.on('end', () => resolve({ status: x.statusCode, buf: Buffer.concat(ch), headers: x.headers, setCookie: [].concat(x.headers['set-cookie'] || []) }));
      });
      r.on('timeout', () => r.destroy(new Error('Источник не ответил вовремя'))); r.on('error', reject);
      if (opt.body) r.write(opt.body); r.end();
    });
  }
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeout);
  return fetch(url, { method: opt.method || 'GET', body: opt.body, redirect: 'follow', signal: ac.signal, headers: { 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9', ...(opt.headers || {}) } })
    .then(async r => ({ status: r.status, buf: Buffer.from(await r.arrayBuffer()), headers: r.headers, setCookie: r.headers.getSetCookie ? r.headers.getSetCookie() : [] }))
    .finally(() => clearTimeout(t));
}

const cache = new Map();
function cached(key, ttl, fn) {
  const c = cache.get(key); if (c && Date.now() - c.at < ttl) return Promise.resolve(c.v);
  return fn().then(v => { cache.set(key, { at: Date.now(), v }); if (cache.size > 2000) cache.delete(cache.keys().next().value); return v; });
}

// ---------- часовые пояса
const TZ_REGION = [
  [/калинингр/i, 'Europe/Kaliningrad'],
  [/самар|удмурт|ижевск|ульянов|астрахан|саратов|тольятт/i, 'Europe/Samara'],
  [/свердлов|екатеринб|челяб|магнитог|курган|тюмен|ханты|хмао|югр|ямал|янао|перм|башк|уф[аы]\b|оренбург|сургут/i, 'Asia/Yekaterinburg'],
  [/омск/i, 'Asia/Omsk'],
  [/новосиб|томск|алтай|барнаул|кемеров|кузбас|новокузн/i, 'Asia/Novosibirsk'],
  [/краснояр|хакас|тыв|абакан/i, 'Asia/Krasnoyarsk'],
  [/иркут|бурят|улан-уд/i, 'Asia/Irkutsk'],
  [/забайкал|чит[аы]\b|амурск|благовещ|якут|саха\b/i, 'Asia/Yakutsk'],
  [/примор|владивост|хабаров|еврейск|биробидж|находк|уссурийск/i, 'Asia/Vladivostok'],
  [/магадан|сахалин|южно-сах/i, 'Asia/Magadan'],
  [/камчат|чукот|петропавловск-к/i, 'Asia/Kamchatka'],
];
function tzForRegion(s) { for (const [re, tz] of TZ_REGION) if (re.test(s || '')) return tz; return 'Europe/Moscow'; }
// коды городов (ABC), если источник не ответил
const ABC = { 495: 'Москва', 499: 'Москва', 812: 'Санкт-Петербург', 343: 'Екатеринбург', 351: 'Челябинск', 383: 'Новосибирск', 381: 'Омск', 846: 'Самара', 843: 'Казань', 831: 'Нижний Новгород',
  863: 'Ростов-на-Дону', 861: 'Краснодар', 423: 'Владивосток', 421: 'Хабаровск', 395: 'Иркутск', 391: 'Красноярск', 342: 'Пермь', 347: 'Уфа', 345: 'Тюмень', 301: 'Улан-Удэ', 302: 'Чита', 416: 'Благовещенск',
  411: 'Якутск', 415: 'Петропавловск-Камчатский', 424: 'Южно-Сахалинск', 413: 'Магадан', 401: 'Калининград', 844: 'Волгоград', 845: 'Саратов', 473: 'Воронеж', 487: 'Тула', 485: 'Ярославль', 382: 'Томск',
  385: 'Барнаул', 384: 'Кемерово', 341: 'Ижевск', 848: 'Тольятти', 842: 'Ульяновск', 353: 'Оренбург', 352: 'Курган', 346: 'Сургут', 862: 'Сочи', 865: 'Ставрополь', 851: 'Астрахань', 872: 'Махачкала' };
const COUNTRY = [
  ['86', 'Китай', 'Asia/Shanghai'], ['852', 'Гонконг', 'Asia/Hong_Kong'], ['853', 'Макао', 'Asia/Macau'], ['886', 'Тайвань', 'Asia/Taipei'], ['82', 'Южная Корея', 'Asia/Seoul'], ['81', 'Япония', 'Asia/Tokyo'],
  ['84', 'Вьетнам', 'Asia/Ho_Chi_Minh'], ['66', 'Таиланд', 'Asia/Bangkok'], ['65', 'Сингапур', 'Asia/Singapore'], ['60', 'Малайзия', 'Asia/Kuala_Lumpur'], ['62', 'Индонезия', 'Asia/Jakarta', 'в стране три часовых пояса'],
  ['63', 'Филиппины', 'Asia/Manila'], ['91', 'Индия', 'Asia/Kolkata'], ['90', 'Турция', 'Europe/Istanbul'], ['971', 'ОАЭ', 'Asia/Dubai'], ['998', 'Узбекистан', 'Asia/Tashkent'], ['996', 'Киргизия', 'Asia/Bishkek'],
  ['992', 'Таджикистан', 'Asia/Dushanbe'], ['993', 'Туркменистан', 'Asia/Ashgabat'], ['994', 'Азербайджан', 'Asia/Baku'], ['995', 'Грузия', 'Asia/Tbilisi'], ['374', 'Армения', 'Asia/Yerevan'], ['375', 'Беларусь', 'Europe/Minsk'],
  ['976', 'Монголия', 'Asia/Ulaanbaatar'], ['380', 'Украина', 'Europe/Kyiv'], ['49', 'Германия', 'Europe/Berlin'], ['44', 'Великобритания', 'Europe/London'], ['33', 'Франция', 'Europe/Paris'], ['39', 'Италия', 'Europe/Rome'],
  ['34', 'Испания', 'Europe/Madrid'], ['48', 'Польша', 'Europe/Warsaw'], ['31', 'Нидерланды', 'Europe/Amsterdam'], ['972', 'Израиль', 'Asia/Jerusalem'], ['966', 'Саудовская Аравия', 'Asia/Riyadh'], ['98', 'Иран', 'Asia/Tehran'],
  ['92', 'Пакистан', 'Asia/Karachi'], ['880', 'Бангладеш', 'Asia/Dhaka'], ['20', 'Египет', 'Africa/Cairo'], ['1', 'США или Канада', 'America/New_York', 'в стране несколько часовых поясов, показано время Нью-Йорка'],
];
function tzInfo(tz) {
  const now = new Date(Math.floor(Date.now() / 60000) * 60000);
  const part = (z, o) => new Intl.DateTimeFormat('en-US', { timeZone: z, ...o }).formatToParts(now).reduce((a, p) => (a[p.type] = p.value, a), {});
  const off = z => { const p = part(z, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - now.getTime()) / 60000); };
  const o = off(tz), m = off('Europe/Moscow');
  return { tz, utcOffsetMin: o, mskDiffMin: o - m };
}

function normPhone(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, ''); const plus = d.startsWith('+'); d = d.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (!plus && d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  else if (!plus && d.length === 10 && /^[3489]/.test(d)) d = '7' + d;
  return d;
}
function fmtPhone(d) {
  if (d.length === 11 && d[0] === '7') return '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9);
  return '+' + d;
}
async function kody(d) {
  const r = await request('https://www.kody.su/check-tel', { method: 'POST', body: 'number=' + encodeURIComponent('+' + d), headers: { 'content-type': 'application/x-www-form-urlencoded', referer: 'https://www.kody.su/check-tel' }, timeout: 12000 });
  if (r.status !== 200) throw new Error('kody.su: ' + r.status);
  const t = cleanText(r.buf.toString('utf8')); const i = t.indexOf('Результат распознавания'); if (i < 0) { const e = t.match(/Ошибка:\s*([^\n.]{3,90})/); return { error: e ? e[1].trim() : 'номер не распознан' }; }
  const s = t.slice(i, i + 900);
  const mob = s.match(/Код сотового оператора:\s*([^\[\n]+?)\s*\[([^\]]+)\]/), city = s.match(/Код города\s+([А-ЯЁA-Z][^\n]*?)\s+Номер абонента/), op = s.match(/Оператор:\s*([^\n]+?)\s+(?:Местное время|Время региона|Популярное|$)/);
  const ported = s.match(/База данных перенесенных номеров:\s*([^\n]+?)\s+(?:Время региона|Местное время|Популярное)/), country = s.match(/Страна:\s*([А-ЯЁA-Za-z \-]+?)\s+(?:Код|Оператор|Номер)/);
  return { country: country ? country[1].trim() : '', operator: mob ? mob[1].trim() : op ? op[1].trim() : '', region: mob ? mob[2].trim() : '', city: city ? city[1].trim() : '', ported: ported ? ported[1].trim() : '' };
}
async function phoneInfo(raw) {
  const d = normPhone(raw);
  if (d.length < 7 || d.length > 15) return { ok: false, error: 'Проверьте номер: нужен код страны или 11 цифр российского номера' };
  const out = { ok: true, number: fmtPhone(d), digits: d, source: '' };
  if (d[0] === '7' && d.length === 11) {
    if (/^7[67]/.test(d)) Object.assign(out, { country: 'Казахстан', region: '', operator: '', ...tzInfo('Asia/Almaty') }); // Казахстан с 2024 г. в одном поясе UTC+5
    else {
      let k = null; try { k = await cached('kody:' + d, 7 * 864e5, () => kody(d)); } catch (e) { k = null; }
      if (k && !k.error) Object.assign(out, k, { source: 'kody.su' });
      else if (k && k.error) return { ok: false, error: 'kody.su: ' + k.error };
      if (!out.city && !out.region) { const abc = ABC[d.slice(1, 4)]; if (abc) out.city = abc; }
      out.country = out.country || 'Россия';
      Object.assign(out, tzInfo(tzForRegion([out.region, out.city].join(' '))));
      if (!out.region && !out.city && /^79/.test(d)) out.note = 'Регион мобильного номера определить не удалось — показано московское время';
    }
  } else {
    const c = COUNTRY.slice().sort((a, b) => b[0].length - a[0].length).find(x => d.startsWith(x[0]));
    if (!c) return { ok: false, error: 'Не удалось определить страну по коду. Введите номер с кодом страны, например +86…' };
    Object.assign(out, { country: c[1], ...tzInfo(c[2]), note: c[3] || '', source: 'справочник кодов стран' });
  }
  return out;
}

// ---------- терминальные расходы
const MC_URL = 'https://www.moscow-cargo.com/tarify/kalkulyator-stoimosti';
const MC_TYPES = { general: '', dangerous: 'DGR', perishable: 'COL', valuable: 'VAL', animals: 'AVI' };
async function moscowCargo(q) {
  const page = await request(MC_URL, { timeout: 20000, ipv4: true });
  const html = page.buf.toString('utf8'); const tok = (html.match(/name="_token" type="hidden" value="([^"]+)"/) || [])[1];
  if (!tok) throw new Error('Москва Карго не отдала форму расчёта');
  const cookie = (page.setCookie || []).map(c => c.split(';')[0]).join('; ');
  const body = new URLSearchParams({ _token: tok, tech: 'IMP', avia: q.airline || 'SU', mvl_vvl: q.domestic ? 'vvl' : 'mvl', cargo_type: MC_TYPES[q.category] || '', phys_weight: String(Math.round(q.weight)), weight: String(Math.round(q.chargeable || q.weight)), from: q.from, to: q.to, extra_day: q.after16 ? '1' : '0', load: q.load ? '1' : '0', coordination: '0' });
  const r = await request('https://www.moscow-cargo.com/intapi/calculate-v2', { method: 'POST', body: body.toString(), timeout: 20000, ipv4: true, headers: { cookie, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest', 'x-csrf-token': tok, referer: MC_URL, origin: 'https://www.moscow-cargo.com' } });
  const j = JSON.parse(r.buf.toString('utf8'));
  if (j.errorcode !== 0 || !Array.isArray(j.data)) throw new Error(j.message || 'Москва Карго не посчитала');
  const lines = j.data.map(x => ({ name: String(x.contrName || '').trim(), sum: Math.round(Number(x.finalSum) * 100) / 100 })).filter(x => x.name);
  return { ok: true, terminal: 'mc', source: 'moscow-cargo.com', live: true, vatIncluded: true, lines, total: Math.round(lines.reduce((s, x) => s + x.sum, 0) * 100) / 100 };
}
// дни хранения: со следующего дня после прибытия по день выдачи включительно
function dayList(from, to) { const a = new Date(from + 'T00:00:00Z'), b = new Date(to + 'T00:00:00Z'), out = []; for (let d = new Date(a.getTime() + 864e5); d <= b; d = new Date(d.getTime() + 864e5)) out.push(d); return out; }
const money = n => Math.round(n * 100) / 100;
// Москва Карго по тарифам «на рейсах других авиакомпаний» (если их калькулятор недоступен)
function mcTariff(q) {
  const H = { general: [31.19, 2302.76], valuable: [71.24, 9786.30], animals: [38.67, 3649.48], perishable: [38.67, 3649.48], dangerous: [38.67, 3649.48] }[q.category] || [31.19, 2302.76];
  const lines = [{ name: 'Наземная обработка груза (МВЛ)', sum: Math.max(H[1], H[0] * q.weight) }];
  const all = dayList(q.from, q.to); const special = q.category !== 'general' && q.category !== 'dangerous';
  const free = special ? 0 : 2 + (q.after16 ? 1 : 0); // 3 суток бесплатно, включая день размещения; если готов после 16:00 — ещё сутки
  const paid = all.slice(free), cw = q.chargeable || q.weight;
  if (paid.length) {
    const rate = (i) => special ? (q.category === 'valuable' ? 43.5 : q.category === 'animals' ? 30.81 : 21.53) : (i + 1 <= 5 ? 14.32 : 25.19); // до 5 суток платного хранения — нижняя ставка
    const min = special ? (q.category === 'valuable' ? 2260.15 : q.category === 'animals' ? 978.66 : 2000.35) : 821.11;
    lines.push({ name: 'Хранение, ' + paid.length + ' сут.', sum: Math.max(min, paid.reduce((s, _, i) => s + rate(i) * cw, 0)) });
  }
  lines.push({ name: 'Извещение о прибытии груза', sum: 594.22 }, { name: 'Обработка данных о товарах МВЛ по прилёту', sum: 1017 });
  if (q.load) lines.push({ name: 'Погрузо-разгрузочные работы', sum: Math.max(1214.69, 6.06 * q.weight) });
  const net = lines.reduce((s, x) => s + x.sum, 0);
  return { ok: true, terminal: 'mc', source: 'тарифы Москва Карго (другие авиакомпании, 26.10.2026)', live: false, vatIncluded: true, lines: lines.map(x => ({ name: x.name, sum: money(x.sum * (1 + VAT / 100)) })), total: money(net * (1 + VAT / 100)) };
}
// Шереметьево-Карго, тарифы МВЛ с 01.11.2026 (без НДС)
function sherTariff(q) {
  const H = { general: [34.56, 2724], perishable: [41.76, 4392], dangerous: [41.76, 4392], valuable: [79.86, 10186], animals: [45.96, 4392] }[q.category] || [34.56, 2724];
  const lines = [{ name: 'Формальности госорганов (импорт), за накладную', sum: 995 }, { name: 'Наземная обработка груза', sum: Math.max(H[1], H[0] * q.weight) }];
  // бесплатно двое суток, не считая дня уведомления и выходных сразу после него; скоропорт — платно со следующего дня
  let days = dayList(q.from, q.to);
  if (q.category !== 'perishable') { while (days.length && [0, 6].includes(days[0].getUTCDay())) days.shift(); }
  const free = q.category === 'perishable' ? 0 : 2, paid = days.slice(free);
  if (paid.length) {
    let sum = 0, min = 815;
    if (q.category === 'valuable') { min = 2040; paid.forEach((_, i) => { sum += (i + 1 <= 5 ? 396 : 612) * Math.max(1, q.places || 1); }); }
    else if (q.category === 'perishable') { min = 1950; paid.forEach((_, i) => { sum += (i + 1 <= 2 ? 14.88 : 25.15) * q.weight; }); }
    else { const r1 = q.category === 'dangerous' ? 14.88 : 14.25; paid.forEach((_, i) => { sum += (i + 1 <= 5 ? r1 : 25.15) * q.weight; }); }
    lines.push({ name: 'Хранение, ' + paid.length + ' сут.', sum: Math.max(min, sum) });
  }
  if (q.load) lines.push({ name: 'Погрузочно-разгрузочные работы', sum: Math.max(1248, 6 * q.weight) });
  if (q.coordination) lines.push({ name: 'Координация обслуживания импортного груза', sum: 1620 });
  const net = lines.reduce((s, x) => s + x.sum, 0);
  return { ok: true, terminal: 'sher', source: 'тарифы Шереметьево-Карго МВЛ с 01.11.2026', live: false, vatIncluded: true, lines: lines.map(x => ({ name: x.name, sum: money(x.sum * (1 + VAT / 100)) })), total: money(net * (1 + VAT / 100)) };
}

// ---------- авианакладная в Шереметьево-Карго
async function sherAwb(pr, no) {
  const r = await request('https://www.shercargo.ru/w/pls/pub/www_pub.awb_info?p_awb_pr=' + pr + '&p_awb_no=' + no, { timeout: 15000 });
  const html = new TextDecoder('windows-1251').decode(r.buf);
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(tr => [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(td => cleanText(td[1]).replace(/\s+/g, ' ').trim())).filter(row => row.some(Boolean)));
  return tables.filter(t => t.length);
}

// ---------- контейнер: ISO 6346, линия по префиксу, ЖД-дислокация
const OWNER = { // префикс владельца (BIC) → линия или лизинговая компания и её страница отслеживания
  FESU: ['FESCO', 'line', 'https://www.fesco.ru/'], SKLU: ['Sinokor', 'line', 'https://www.sinokor.co.kr/'], SKHU: ['Sinokor', 'line', 'https://www.sinokor.co.kr/'], HASU: ['Heung-A Line', 'line', 'https://www.heung-a.com/'],
  KMTU: ['KMTC', 'line', 'https://www.ekmtc.com/'], SITU: ['SITC', 'line', 'https://www.sitcline.com/'], PCIU: ['PIL', 'line', 'https://www.pilship.com/'],
  CBHU: ['COSCO', 'line', 'https://elines.coscoshipping.com/ebusiness/cargoTracking'], CSNU: ['COSCO', 'line', 'https://elines.coscoshipping.com/ebusiness/cargoTracking'], CCLU: ['COSCO', 'line', 'https://elines.coscoshipping.com/ebusiness/cargoTracking'],
  OOLU: ['OOCL', 'line', 'https://www.oocl.com/'], EGHU: ['Evergreen', 'line', 'https://www.shipmentlink.com/'], EMCU: ['Evergreen', 'line', 'https://www.shipmentlink.com/'], EISU: ['Evergreen', 'line', 'https://www.shipmentlink.com/'],
  ONEU: ['ONE', 'line', 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking'], YMLU: ['Yang Ming', 'line', 'https://www.yangming.com/'], HMMU: ['HMM', 'line', 'https://www.hmm21.com/'], HDMU: ['HMM', 'line', 'https://www.hmm21.com/'],
  ZIMU: ['ZIM', 'line', 'https://www.zim.com/tools/track-a-shipment'], WHLU: ['Wan Hai', 'line', 'https://www.wanhai.com/'], ESPU: ['Emirates Shipping Line', 'line', 'https://www.emiratesline.com/'],
  CMAU: ['CMA CGM', 'line', 'https://www.cma-cgm.com/ebusiness/tracking'], APLU: ['APL', 'line', 'https://www.apl.com/ebusiness/tracking'], MSKU: ['Maersk', 'line', 'https://www.maersk.com/tracking/'], MAEU: ['Maersk', 'line', 'https://www.maersk.com/tracking/'],
  MSCU: ['MSC', 'line', 'https://www.msc.com/en/track-a-shipment'], MEDU: ['MSC', 'line', 'https://www.msc.com/en/track-a-shipment'], HLXU: ['Hapag-Lloyd', 'line', 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html'],
  HLBU: ['Hapag-Lloyd', 'line', 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html'], TKRU: ['ТрансКонтейнер', 'rail', 'https://isales.trcont.ru/'],
  TCLU: ['Triton', 'leasing', ''], TCNU: ['Triton', 'leasing', ''], TRHU: ['Triton', 'leasing', ''], TTNU: ['Triton', 'leasing', ''], TGHU: ['Textainer', 'leasing', ''], TEMU: ['Textainer', 'leasing', ''],
  CAIU: ['CAI', 'leasing', ''], FCIU: ['Florens', 'leasing', ''], BMOU: ['Beacon', 'leasing', ''], GESU: ['Seaco', 'leasing', ''], SEGU: ['Seaco', 'leasing', ''],
};
function isoCheck(no) {
  const V = c => { if (/\d/.test(c)) return +c; let v = c.charCodeAt(0) - 55; v += Math.floor((v - 1) / 10); return v; }; // A=10, без кратных 11
  let s = 0; for (let i = 0; i < 10; i++) s += V(no[i]) * Math.pow(2, i); return s % 11 % 10;
}
async function trcont(no) {
  if (!RU_CA) throw new Error('нет сертификата');
  const r = await request('https://isales.trcont.ru/api/unauthorized/dislocation?search_type=equipment&term=' + encodeURIComponent(no), { ruCa: true, timeout: 15000 });
  if (r.status !== 200) throw new Error('ТрансКонтейнер: ' + r.status);
  const j = JSON.parse(r.buf.toString('utf8')); return Array.isArray(j.result) ? j.result.slice(0, 20) : [];
}

// ---------- доставка по России
async function dellin(q) {
  const key = process.env.DELLIN_APPKEY; if (!key) return null;
  const post = (u, b) => request('https://api.dellin.ru' + u, { method: 'POST', body: JSON.stringify({ appkey: key, ...b }), headers: { 'content-type': 'application/json' }, timeout: 15000 }).then(r => JSON.parse(r.buf.toString('utf8')));
  const city = async name => { const r = await post('/v2/public/kladr.json', { q: name, limit: 1 }); const c = (r.cities || r.data || [])[0]; if (!c) throw new Error('Деловые Линии не знают город «' + name + '»'); return c.code || c.cityID; };
  const [fromCode, toCode] = await Promise.all([city(q.from), city(q.to)]);
  const d = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const L = q.length || Math.cbrt(q.volume / Math.max(1, q.places)), W = q.width || L, H = q.height || L;
  const r = await post('/v2/calculator.json', {
    delivery: { deliveryType: { type: 'auto' }, derival: { produceDate: d, variant: 'terminal', city: fromCode }, arrival: { variant: 'terminal', city: toCode } },
    cargo: { quantity: Math.max(1, q.places || 1), length: +L.toFixed(2), width: +W.toFixed(2), height: +H.toFixed(2), totalVolume: +q.volume.toFixed(3), totalWeight: +q.weight.toFixed(1), weight: +(q.weight / Math.max(1, q.places || 1)).toFixed(1), oversizedWeight: 0, oversizedVolume: 0 },
    payment: { type: 'noncash', paymentCitizen: 'sender' }
  });
  const data = r.data || {}; if (r.errors || !data.price) throw new Error((r.errors && JSON.stringify(r.errors).slice(0, 200)) || 'Деловые Линии не посчитали');
  return { ok: true, live: true, source: 'Деловые Линии (API)', price: data.price, days: data.orderDates && data.orderDates.giveoutFromOspReceiver ? null : null, raw: { derival: data.derival, arrival: data.arrival, intercity: data.intercity } };
}
function ruEstimate(q) {
  const A = ADV.lookup(q.from), B = ADV.lookup(q.to); if (!A || !B) return { ok: false, error: 'Укажите города России, например «Москва» и «Челябинск»' };
  const r = Math.PI / 180, h = 2 * 6371 * Math.asin(Math.sqrt(Math.sin((B.lat - A.lat) * r / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin((B.lon - A.lon) * r / 2) ** 2));
  const km = Math.round(h * 1.22 / 10) * 10, perM3 = 600 + 1.3 * km, cw = Math.max(q.volume, q.weight / 250);
  const price = Math.max(1500, cw * perM3 + 450 + q.weight * 0.6);
  const days = [Math.max(1, Math.round(km / 650)), Math.max(2, Math.round(km / 650) + 3)];
  return { ok: true, live: false, source: 'ориентир по рынку сборных перевозок', km, price: Math.round(price / 10) * 10, days, priceRange: [Math.round(price * 0.85 / 10) * 10, Math.round(price * 1.3 / 10) * 10] };
}

// ---------- маршруты
function setup(app, opts = {}) {
  const staff = opts.admin || ((req, res, next) => next()); // инструменты — только сотрудникам компании
  const limit = opts.rateLimit ? opts.rateLimit({ windowMs: 5 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Слишком много запросов. Подождите пару минут.' } }) : (req, res, next) => next();
  const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => res.status(502).json({ ok: false, error: e && e.message ? e.message : 'Источник не ответил' }));
  const num = (v, d = 0) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const date = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null;

  app.post('/api/tools/phone', staff, limit, wrap(async (req, res) => res.json(await phoneInfo((req.body || {}).number))));

  app.post('/api/tools/terminal', staff, limit, wrap(async (req, res) => {
    const b = req.body || {}, today = new Date().toISOString().slice(0, 10);
    const q = { airline: /^[A-Z0-9]{2}$/.test(b.airline || '') ? b.airline : 'SU', weight: num(b.weight), chargeable: num(b.chargeable), places: Math.round(num(b.places, 1)), category: MC_TYPES.hasOwnProperty(b.category) ? b.category : 'general',
      from: date(b.from) || today, to: date(b.to) || today, after16: !!b.after16, load: !!b.load, coordination: !!b.coordination };
    if (!(q.weight > 0) || q.weight > 200000) return res.status(400).json({ ok: false, error: 'Укажите фактический вес груза, кг' });
    if (!q.chargeable || q.chargeable < q.weight) q.chargeable = q.weight;
    if (q.to < q.from) return res.status(400).json({ ok: false, error: 'Дата получения раньше даты прибытия' });
    if (b.terminal === 'sher') return res.json(sherTariff(q));
    try { res.json(await cached('mc:' + JSON.stringify(q), 30 * 60 * 1000, () => moscowCargo(q))); }
    catch (e) { const t = mcTariff(q); t.note = 'Калькулятор Москва Карго не ответил (' + e.message + '), посчитано по их тарифам на рейсах других авиакомпаний'; res.json(t); }
  }));

  app.get('/api/tools/awb', staff, limit, wrap(async (req, res) => {
    const d = String(req.query.no || '').replace(/\D/g, ''); if (d.length !== 11) return res.status(400).json({ ok: false, error: 'Номер авианакладной — 11 цифр: префикс авиакомпании и номер, например 555-12345675' });
    const pr = d.slice(0, 3), no = d.slice(3); const okDigit = +no[7] === +no.slice(0, 7) % 7;
    const tables = await cached('awb:' + d, 10 * 60 * 1000, () => sherAwb(pr, no));
    res.json({ ok: true, awb: pr + '-' + no, checkOk: okDigit, source: 'Шереметьево-Карго', url: 'https://www.shercargo.ru/w/pls/pub/www_pub.awb_info?p_awb_pr=' + pr + '&p_awb_no=' + no, tables });
  }));

  app.get('/api/tools/container', staff, limit, wrap(async (req, res) => {
    const no = String(req.query.no || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(no)) return res.status(400).json({ ok: false, error: 'Номер контейнера: 4 буквы и 7 цифр, например FESU5011022' });
    const cd = isoCheck(no), valid = cd === +no[10], own = OWNER[no.slice(0, 4)] || null;
    const out = { ok: true, number: no, valid, checkDigit: cd, owner: own ? { code: no.slice(0, 4), name: own[0], kind: own[1], url: own[2] } : { code: no.slice(0, 4) }, rail: null };
    try { const rows = await cached('trc:' + no, 15 * 60 * 1000, () => trcont(no)); out.rail = { ok: true, source: 'ТрансКонтейнер (isales.trcont.ru)', rows }; }
    catch (e) { out.rail = { ok: false, error: e.message }; }
    res.json(out);
  }));


  // ---------- бесплатный разовый морской трекинг Navo24 (без ключа)
  async function navoPublicTrack(reference, referenceType) {
    return cached('navo-public:' + referenceType + ':' + reference, 10 * 60 * 1000, async () => {
      const r = await request('https://api.navo24.com/v1/tracking/track/public', {
        method: 'POST', body: JSON.stringify({ reference, reference_type: referenceType }),
        headers: { 'content-type': 'application/json', accept: 'application/json' }, timeout: 20000
      });
      let j = {}; try { j = JSON.parse(r.buf.toString('utf8')); } catch (_) {}
      if (r.status === 429) return { ok: false, limited: true, error: 'Бесплатный лимит Navo24 на этот IP временно исчерпан. Попробуйте позже или воспользуйтесь поиском TraceContainer.' };
      if (r.status === 404) return { ok: false, notFound: true, error: (j && (j.message || j.error)) || 'Отправление не найдено у подключённых перевозчиков.' };
      if (r.status < 200 || r.status >= 300) return { ok: false, error: 'Navo24 временно недоступен (HTTP ' + r.status + ').' };
      if (!j || j.ok !== true || !j.data) return { ok: false, notFound: true, error: (j && (j.message || j.recommendation)) || 'По этому номеру пока нет данных от перевозчика.', diagnosis: j && j.diagnosis || null, suggestions: j && j.suggestions || [] };
      return { ok: true, source: 'Navo24', data: j.data, lineCorrection: j.line_correction || null };
    });
  }
  app.post('/api/tools/ocean-track', staff, limit, wrap(async (req, res) => {
    const b = req.body || {}, reference = String(b.reference || '').toUpperCase().replace(/\\s+/g, '').slice(0, 80);
    const type = b.type === 'bl' ? 'bill_of_lading' : 'container_id';
    if (type === 'container_id' && !/^[A-Z]{3}[UJZ]\\d{7}$/.test(reference)) return res.status(400).json({ ok: false, error: 'Номер контейнера должен содержать 4 буквы и 7 цифр.' });
    if (type === 'bill_of_lading' && (reference.length < 5 || reference.length > 80)) return res.status(400).json({ ok: false, error: 'Проверьте номер коносамента B/L.' });
    res.json(await navoPublicTrack(reference, type));
  }));

  app.post('/api/tools/russia', staff, limit, wrap(async (req, res) => {
    const b = req.body || {}, q = { from: String(b.from || '').slice(0, 60), to: String(b.to || '').slice(0, 60), weight: num(b.weight), volume: num(b.volume), places: Math.max(1, Math.round(num(b.places, 1))), length: num(b.length), width: num(b.width), height: num(b.height) };
    if (!q.from || !q.to) return res.status(400).json({ ok: false, error: 'Укажите, откуда и куда везём' });
    if (!(q.weight > 0)) return res.status(400).json({ ok: false, error: 'Укажите вес, кг' });
    if (!(q.volume > 0)) q.volume = Math.max(0.01, q.weight / 250);
    const est = ruEstimate(q);
    if (process.env.DELLIN_APPKEY) {
      try { const d = await cached('dl:' + JSON.stringify(q), 60 * 60 * 1000, () => dellin(q)); return res.json({ ...d, km: est.km, days: est.days }); }
      catch (e) { if (est.ok) est.note = 'Деловые Линии не ответили: ' + e.message + '. Показан ориентир.'; }
    } else if (est.ok) est.keyMissing = true;
    res.json(est);
  }));

  // какие источники отвечают (для подсказки в окнах инструментов)
  app.get('/api/tools/sources', wrap(async (req, res) => {
    const probe = (name, fn) => cached('src:' + name, 10 * 60 * 1000, () => fn().then(r => ({ name, ok: r.status > 0 && r.status < 500, status: r.status })).catch(e => ({ name, ok: false, error: String(e.message || e).slice(0, 80) })));
    const list = await Promise.all([
      probe('kody.su', () => request('https://www.kody.su/check-tel', { timeout: 8000 })),
      probe('moscow-cargo.com', () => request(MC_URL, { timeout: 15000, ipv4: true })),
      probe('shercargo.ru', () => request('https://www.shercargo.ru/clients/payment/rates/', { timeout: 8000 })),
      probe('isales.trcont.ru', () => request('https://isales.trcont.ru/api/unauthorized/dislocation?search_type=equipment&term=TKRU', { ruCa: true, timeout: 8000 })),
    ]);
    res.json({ ok: true, sources: list, dellinKey: !!process.env.DELLIN_APPKEY, ruCa: !!RU_CA });
  }));
}

module.exports = { setup, normPhone, tzForRegion, isoCheck, sherTariff, mcTariff, ruEstimate, phoneInfo, dayList };
