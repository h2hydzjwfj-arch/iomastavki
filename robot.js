'use strict';
// Робот-помощник администратора. Текст или файл → что это: новый агент, КП агента со ставками, груз, правка текста сайта, цвет сайта.
// Робот ничего не меняет сам: показывает, что понял, администратор правит поля и нажимает «Применить».
// Без ИИ разбирает по правилам; с ИИ (OPENAI_API_KEY в Render) понимает свободный текст, PDF и фото.
const docparse = require('./docparse');
const C3 = require('./crm3');

// города: [по-русски, по-английски, регион] — регион cn/asia (откуда) или ru (куда)
const CITIES = [
  ['Иу', 'Yiwu', 'cn'], ['Шанхай', 'Shanghai', 'cn'], ['Гуанчжоу', 'Guangzhou', 'cn'], ['Шэньчжэнь', 'Shenzhen', 'cn'], ['Нинбо', 'Ningbo', 'cn'], ['Пекин', 'Beijing', 'cn'],
  ['Тяньцзинь', 'Tianjin', 'cn'], ['Циндао', 'Qingdao', 'cn'], ['Харбин', 'Harbin', 'cn'], ['Шэньян', 'Shenyang', 'cn'], ['Далянь', 'Dalian', 'cn'], ['Чжэнчжоу', 'Zhengzhou', 'cn'],
  ['Сиань', "Xi'an", 'cn'], ['Чэнду', 'Chengdu', 'cn'], ['Чунцин', 'Chongqing', 'cn'], ['Ухань', 'Wuhan', 'cn'], ['Ханчжоу', 'Hangzhou', 'cn'], ['Сучжоу', 'Suzhou', 'cn'],
  ['Нанкин', 'Nanjing', 'cn'], ['Сямэнь', 'Xiamen', 'cn'], ['Фошань', 'Foshan', 'cn'], ['Дунгуань', 'Dongguan', 'cn'], ['Циньчжоу', 'Qinzhou', 'cn'], ['Урумчи', 'Urumqi', 'cn'],
  ['Синьчжоу', 'Xinzhou', 'cn'], ['Тайюань', 'Taiyuan', 'cn'], ['Чанша', 'Changsha', 'cn'], ['Гонконг', 'Hong Kong', 'cn'], ['Маньчжурия', 'Manzhouli', 'cn'], ['Эрлянь', 'Erenhot', 'cn'],
  ['Хоргос', 'Khorgos', 'cn'], ['Суйфэньхэ', 'Suifenhe', 'cn'], ['Тайбэй', 'Taipei', 'asia'], ['Гаосюн', 'Kaohsiung', 'asia'], ['Токио', 'Tokyo', 'asia'], ['Осака', 'Osaka', 'asia'],
  ['Йокогама', 'Yokohama', 'asia'], ['Сеул', 'Seoul', 'asia'], ['Пусан', 'Busan', 'asia'], ['Инчхон', 'Incheon', 'asia'],
  ['Москва', 'Moscow', 'ru'], ['Санкт-Петербург', 'St Petersburg', 'ru'], ['Екатеринбург', 'Yekaterinburg', 'ru'], ['Новосибирск', 'Novosibirsk', 'ru'], ['Казань', 'Kazan', 'ru'],
  ['Краснодар', 'Krasnodar', 'ru'], ['Владивосток', 'Vladivostok', 'ru'], ['Нижний Новгород', 'Nizhny Novgorod', 'ru'], ['Самара', 'Samara', 'ru'], ['Ростов-на-Дону', 'Rostov-on-Don', 'ru'],
  ['Челябинск', 'Chelyabinsk', 'ru'], ['Омск', 'Omsk', 'ru'], ['Красноярск', 'Krasnoyarsk', 'ru'], ['Иркутск', 'Irkutsk', 'ru'], ['Хабаровск', 'Khabarovsk', 'ru'], ['Пермь', 'Perm', 'ru'],
  ['Уфа', 'Ufa', 'ru'], ['Воронеж', 'Voronezh', 'ru'], ['Тюмень', 'Tyumen', 'ru'], ['Минск', 'Minsk', 'ru'], ['Забайкальск', 'Zabaikalsk', 'ru'], ['Благовещенск', 'Blagoveshchensk', 'ru'],
];
const ALIAS = { 'спб': 'Санкт-Петербург', 'питер': 'Санкт-Петербург', 'мск': 'Москва', 'гз': 'Гуанчжоу' };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CITY_RX = CITIES.map(c => { const st = c[0].length > 4 ? c[0].replace(/[аяоеьй]$/i, '') : c[0]; return { c, rx: new RegExp('(?<![а-яёa-z])(?:' + esc(st) + '[а-яё]{0,3}|' + esc(c[1]) + ')(?![а-яёa-z])', 'gi') }; });
function cities(text) {
  const t = String(text || ''), out = [];
  for (const { c, rx } of CITY_RX) { rx.lastIndex = 0; let m; while ((m = rx.exec(t))) out.push({ name: c[0], region: c[2], at: m.index }); }
  for (const [a, name] of Object.entries(ALIAS)) { const m = t.match(new RegExp('(?<![а-яёa-z])' + a + '(?![а-яёa-z])', 'i')); if (m) out.push({ name, region: CITIES.find(c => c[0] === name)[2], at: m.index }); }
  return out.sort((a, b) => a.at - b.at);
}
function route(text) {
  const cs = cities(text);
  const from = (cs.find(x => x.region !== 'ru') || {}).name || '';
  const to = (cs.find(x => x.region === 'ru' && !/Забайкальск|Благовещенск/.test(x.name)) || cs.find(x => x.region === 'ru') || {}).name || '';
  return { from, to };
}

const NUM = '(\\d{1,3}(?:[\\s\\u00a0]\\d{3})+|\\d+)(?:[.,](\\d+))?';
const num = (a, b) => Number(String(a).replace(/[\s ]/g, '') + (b ? '.' + b : ''));
const NB = '(?![а-яёa-z])';
function cargoOf(text) {
  const t = String(text || ''), o = {};
  let m = t.match(new RegExp(NUM + '\\s*(?:кг|kg|kgs|килограмм[а-яё]*)' + NB, 'i')); if (m) o.weight = num(m[1], m[2]);
  if (!o.weight && (m = t.match(new RegExp(NUM + '\\s*(?:т|тн|тонн[а-яё]*|tons?|tn)' + NB, 'i')))) o.weight = Math.round(num(m[1], m[2]) * 1000);
  if ((m = t.match(new RegExp(NUM + '\\s*(?:м3|м³|куб[а-яё.]*|cbm|m3|кбм)' + NB, 'i')))) o.volume = num(m[1], m[2]);
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×х*]\s*(\d+(?:[.,]\d+)?)\s*[x×х*]\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м|mm|cm|m)?(?![а-яёa-z])/i))) o.dims = m[1] + '×' + m[2] + '×' + m[3] + (m[4] ? ' ' + m[4].replace(/^mm$/i, 'мм').replace(/^cm$/i, 'см').replace(/^m$/i, 'м') : '');
  if ((m = t.match(/(\d+)\s*(?:мест[а-яё]*|коробк[а-яё]*|короб[а-яё]*|паллет[а-яё]*|палет[а-яё]*|ящик[а-яё]*|мешк[а-яё]*|pallets?|boxes|box|cartons?|ctns?|pcs|pkgs?)(?![а-яёa-z])/i))) o.places = Number(m[1]);
  if ((m = t.match(/(?:груз|товар[а-яё]*|cargo|goods)\s*[:—–-]?\s*([^,.;:\n\d(]{3,60})/i))) { const nm = m[1].split(/\s(?:из|в|во|до|от|from|to|весом|вес|объём|объем)\s/i)[0].trim(); if (nm.length >= 3 && !/^(из|в|до|от)\b/i.test(nm)) o.cargo = nm.charAt(0).toUpperCase() + nm.slice(1); }
  if (!o.cargo && (m = t.match(/^\s*([А-ЯЁA-Z][а-яёa-z-]+(?:\s+[а-яёa-z-]+){0,4})\s*[,:–—-]?\s*\d/)) && !/^(груз|добав|замен|помен|нов|заявк|привез|отправ|нужно|надо|хочу|клиент)/i.test(m[1])) o.cargo = m[1].trim();
  if ((m = t.match(/(\d+)\s*(?:машин[а-яё]*|фур[а-яё]*|трак[а-яё]*|грузовик[а-яё]*|trucks?)(?![а-яёa-z])/i))) o.note = 'Машин: ' + m[1];
  if ((m = t.match(/(\d+)\s*(?:контейнер[а-яё]*|containers?)(?![а-яёa-z])/i))) o.note = [o.note, 'Контейнеров: ' + m[1]].filter(Boolean).join('; ');
  const modes = C3.modesFrom(t); if (modes.length === 1) o.mode = modes[0] === 'road' ? 'auto' : modes[0];
  Object.assign(o, route(t));
  return o;
}

// правка текста сайта: «замени «A» на «B»», «вместо «A» напиши «B»», «A» → «B»
const Q = '[«"“„\']([^»"”“\']{1,400})[»"”“\']';
function textEdit(text) {
  const t = String(text || '');
  let m = t.match(new RegExp('(?:замени|заменить|поменяй|поменять|измени|изменить|исправь|исправить|перепиши|replace|change)[^«"“„\']{0,80}' + Q + '[^«"“„\']{0,40}?(?:на|→|->|with|to)\\s*' + Q, 'i'));
  if (!m) m = t.match(new RegExp('(?:вместо|instead of)\\s*' + Q + '[^«"“„\']{0,40}?(?:напиши|пиши|поставь|сделай|будет|write|put)\\s*' + Q, 'i'));
  if (!m) m = t.match(new RegExp('^\\s*' + Q + '\\s*(?:→|->|=>)\\s*' + Q + '\\s*$', 'i'));
  return m && m[1].trim() && m[1].trim() !== m[2].trim() ? { find: m[1].trim(), replace: m[2].trim() } : null;
}

// цвет: «#D35400», «акцент темнее», «сделай кнопки синими», «верни цвета как было»
const COLORS = [[/оранж|orange/i, '#E06A2C'], [/терракот|кирпич/i, '#B4562F'], [/красн|red/i, '#C8372D'], [/бордов|вишн|burgundy/i, '#8E2C3A'], [/розов|pink/i, '#D9577A'],
  [/фиолет|сирен|purple|violet/i, '#6B4FBB'], [/бирюз|teal|морск/i, '#14837B'], [/зел[её]н|green/i, '#2E7D5B'], [/голуб|light blue/i, '#3A8DD8'], [/син|blue/i, '#2B5BD7'],
  [/золот|gold|жёлт|желт|yellow|охр/i, '#C9932E'], [/графит|сер|gray|grey/i, '#4B5563'], [/ч[её]рн|black/i, '#1F2328']];
function hex(h) { h = String(h || '').trim(); if (/^#?[0-9a-f]{3}$/i.test(h)) h = '#' + h.replace('#', '').split('').map(c => c + c).join(''); return /^#?[0-9a-f]{6}$/i.test(h) ? '#' + h.replace('#', '').toUpperCase() : ''; }
function shade(h, k) { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }
function themeEdit(text, current) {
  const t = String(text || '');
  if (!/(цвет|оттен|акцент|палитр|color|colour|кнопк)/i.test(t)) return null;
  if (/(верни|сбрось|сброс|как было|по умолчанию|исходн|reset|default)/i.test(t)) return { reset: true };
  const h = (t.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i) || [])[0];
  if (h) return { accent: hex(h) };
  const base = (current && current.accent) || '#2B66F0';
  if (/темнее|darker|насыщенн/i.test(t)) return { accent: shade(base, -0.18) };
  if (/светлее|lighter|мягче|спокойн/i.test(t)) return { accent: shade(base, 0.18) };
  const c = COLORS.find(([rx]) => rx.test(t)); return c ? { accent: c[1] } : null;
}

// текст из файла: Excel, Word, текст; PDF и фото — только через ИИ
function fileText(f) {
  if (!f || !f.buffer) return null;
  const name = Buffer.from(f.originalname || '', 'latin1').toString('utf8'), low = name.toLowerCase();
  if (/\.(xlsx|xlsm)$/.test(low)) return { text: docparse.xlsxText(f.buffer), rows: docparse.xlsxRows(f.buffer), kind: 'xlsx', name };
  if (/\.docx$/.test(low)) return { text: docparse.docxText(f.buffer), kind: 'docx', name };
  if (/\.csv$/.test(low)) { const text = f.buffer.toString('utf8').replace(/^\uFEFF/, ''); let rows = null; try { rows = require('./tnved').csvRows(text); } catch (e) {} return { text, rows, kind: 'text', name }; }
  if (/\.(txt|eml|md)$/.test(low)) return { text: f.buffer.toString('utf8').replace(/^\uFEFF/, ''), kind: 'text', name };
  return { text: '', kind: docparse.kindOf(name, f.mimetype), name, buf: f.buffer, mime: f.mimetype };
}

function agentsFromRows(rows) {
  const hi = (rows || []).findIndex(r => r.some(c => /компан|company|агент|экспедитор/i.test(String(c || '')))); if (hi < 0) return null;
  const H = rows[hi].map(c => String(c || '').toLowerCase()), col = rx => H.findIndex(h => rx.test(h));
  const K = { company: col(/компан|company|агент|экспедитор|назван/), transport: col(/транспорт|вид|transport|mode/), email: col(/mail|почт/), contact: col(/контакт|contact|имя|лицо/), phone: col(/телеф|phone|тел\.|wechat|whatsapp/), site: col(/сайт|site|web/), notes: col(/примеч|коммент|note|направлен/) };
  if (K.company < 0) return null;
  const out = rows.slice(hi + 1).map(r => { const g = k => K[k] >= 0 ? String(r[K[k]] == null ? '' : r[K[k]]).trim() : ''; return { company: g('company'), contact: g('contact'), phone: g('phone'), email: g('email'), site: g('site'), transport: g('transport'), notes: g('notes') }; }).filter(a => a.company);
  return out.length ? out : null;
}

const UNIT_BASIS = { 'кг': 'weight', 'м³': 'volume', 'контейнер': 'container', 'машина': 'shipment', 'партия': 'shipment' };
// разбор по правилам — без ИИ
function rules(text, file, theme) {
  const t = String(text || ''), items = [];
  const te = textEdit(t); if (te) return [{ kind: 'text', data: te }];
  const th = themeEdit(t, theme); if (th) return [{ kind: 'theme', data: th }];
  const list = file && file.rows && agentsFromRows(file.rows); if (list) return [{ kind: 'agents', data: { items: list.slice(0, 500) } }];
  const sender = C3.senderOf(t), rates = C3.parseRatesPlain(t), r = route(t), modes = C3.modesFrom(t);
  const addAgent = t.match(/(?:добав[а-яё]*|нов[а-яё]+|занеси|запиши)\s+(?:агент[а-яё]*|экспедитор[а-яё]*|перевозчик[а-яё]*|партн[её]р[а-яё]*)\s*[:—–-]?\s*([^\n,;]{2,80})/i);
  const company = (addAgent && addAgent[1].replace(/\s+(?:email|e-mail|почта|тел|телефон|phone|контакт).*$/i, '').trim()) || sender.company || '';
  const isKp = rates.length && /(ставк|тариф|кп|коммерческ|quotation|quote|offer|rate|freight|фрахт|цена|price|стоимост|usd|\$|cny|rmb|¥|eur|€)/i.test(t);
  let contact = sender.name || '';
  if (!contact && addAgent) { const part = t.slice(addAgent.index).split(/[,;\n]/).slice(1).map(x => x.trim()).find(x => /^[A-ZА-ЯЁ][a-zа-яё]+(?:\s+[A-ZА-ЯЁ][a-zа-яё]+){0,2}$/.test(x) && !/^(Авто|ЖД|Авиа|Море|Китай|Россия)$/i.test(x)); if (part) contact = part; }
  if (company && (addAgent || sender.email || sender.phone || sender.wechat)) items.push({ kind: 'agent', data: { company, contact, phone: sender.phone || '', email: sender.email || '', wechat: sender.wechat || '', site: (t.match(/(?:https?:\/\/|www\.)[^\s,;]+/i) || [''])[0], transport: modes.map(m => ({ air: 'Авиа', road: 'Авто', rail: 'ЖД', sea: 'Море', multimodal: 'Мультимодальные' }[m] || m)).join(', '), notes: '' } });
  if (isKp) items.push({ kind: 'rates', data: { company: company || 'Агент', from: r.from, to: r.to, mode: modes.length === 1 ? (modes[0] === 'road' ? 'auto' : modes[0]) : '', rates: rates.map(x => ({ rate: x.amount, currency: x.currency, basis: UNIT_BASIS[x.unit] || 'shipment', unit: x.unit || '', container: x.container || '', transitDays: x.transit || '', validUntil: C3.validDate(x.valid) || '', fx: x.fx || 0, quote: x.quote })) } });
  if (!isKp) { const c = cargoOf(t); if ((c.weight || c.volume || c.places) && (c.from || c.to || /груз|cargo|товар|отправ|забрать|везти|доставить|партия/i.test(t))) items.push({ kind: 'cargo', data: c }); }
  return items;
}

const AI_PROMPT = `Ты — робот-помощник администратора логистической компании iomastavka (Китай/Азия → Россия). Тебе прислали текст и, возможно, файл.
Определи, что это, и верни ТОЛЬКО JSON без markdown: {"items":[...]} — элементы любых видов (обычно один-два):
{"kind":"agent","data":{"company":"","contact":"","phone":"","email":"","wechat":"","site":"","transport":"Авиа, Авто, ЖД, Море — через запятую","notes":""}} — новый агент/экспедитор и его контакты;
{"kind":"rates","data":{"company":"агент","from":"город отправления","to":"город назначения","mode":"air|auto|rail|sea|","rates":[{"rate":число,"currency":"USD|CNY|EUR|RUB","basis":"weight|volume|container|shipment","unit":"кг|м³|контейнер|машина|партия","container":"","transitDays":"","validUntil":"ГГГГ-ММ-ДД или пусто","minCharge":число или null,"quote":"кусок текста со ставкой"}]}} — КП агента со ставками;
{"kind":"cargo","data":{"cargo":"что за груз","from":"","to":"","weight":кг,"volume":м³,"places":число,"dims":"Д×Ш×В с единицами","mode":"air|auto|rail|sea|","note":""}} — груз клиента для заявки;
{"kind":"text","data":{"find":"точный текст на сайте","replace":"новый текст","en":"перевод нового текста на английский","zh":"перевод на китайский"}} — правка текста сайта;
{"kind":"theme","data":{"accent":"#RRGGBB"}} или {"kind":"theme","data":{"reset":true}} — цвет сайта (акцент).
Города пиши по-русски в именительном падеже. Не выдумывай: чего нет — пусто или null. Если ничего не подходит — {"items":[]}.`;
async function aiParse(ai, text, file) {
  const content = [{ type: 'input_text', text: AI_PROMPT + '\n\nСообщение администратора:\n' + (text || '(без текста)') }];
  if (file && file.text) content.push({ type: 'input_text', text: 'Файл «' + file.name + '»:\n' + file.text.slice(0, 30000) });
  else if (file && file.kind === 'pdf') content.push({ type: 'input_file', filename: file.name, file_data: 'data:application/pdf;base64,' + file.buf.toString('base64') });
  else if (file && file.kind === 'image') content.push({ type: 'input_image', image_url: 'data:' + (file.mime || 'image/jpeg') + ';base64,' + file.buf.toString('base64') });
  const out = await ai.run([{ role: 'user', content }], { maxTokens: 4000, timeoutMs: 90000 });
  const s = String(out || ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
  const j = JSON.parse(s.slice(a, b + 1));
  return Array.isArray(j.items) ? j.items.filter(x => x && ['agent', 'rates', 'cargo', 'text', 'theme', 'agents'].includes(x.kind) && x.data && typeof x.data === 'object') : [];
}

function setup(app, ctx) {
  const { store, admin, upload, str, newId } = ctx;
  const now = () => new Date().toISOString();
  const bad = (res, error, code = 400) => res.status(code).json({ ok: false, error });
  const n = v => { const x = Number(String(v == null ? '' : v).replace(/[\s ]/g, '').replace(',', '.')); return Number.isFinite(x) && x >= 0 ? x : null; };
  const low = s => String(s || '').trim().toLowerCase();
  const db = () => { const d = store.load(); d.settings = d.settings || {}; d.crmAgents = d.crmAgents || []; return d; };
  const custom = d => ({ texts: Array.isArray(d.settings.siteTexts) ? d.settings.siteTexts : [], theme: d.settings.siteTheme || null });
  const aiOn = () => !!(ctx.ai && ctx.ai.enabled());

  // на сайте — для всех: правки текстов и цвет
  app.get('/api/site/custom', (req, res) => { const c = custom(db()); res.set('Cache-Control', 'no-store'); res.json({ ok: true, texts: c.texts.map(t => ({ find: t.find, replace: t.replace, en: t.en || '', zh: t.zh || '' })), theme: c.theme ? { accent: c.theme.accent } : null }); });

  app.get('/api/robot', admin, (req, res) => { const c = custom(db()); res.json({ ok: true, ai: aiOn(), texts: c.texts, theme: c.theme }); });

  app.post('/api/robot/parse', admin, upload ? upload.single('file') : (q, r, nx) => nx(), async (req, res) => {
    const text = String((req.body || {}).text || '').slice(0, 20000).trim();
    let file = null; try { file = fileText(req.file); } catch (e) { return bad(res, 'Не удалось прочитать файл: ' + e.message); }
    if (!text && !file) return bad(res, 'Напишите, что сделать, или приложите файл');
    const all = [text, file && file.text].filter(Boolean).join('\n\n');
    const d = db(); let items = [], ai = 'none', aiError = '';
    if (aiOn()) { try { items = await aiParse(ctx.ai, text, file); ai = 'ok'; } catch (e) { ai = 'failed'; aiError = String(e.message || e).slice(0, 160); } }
    // правила — если ИИ нет, ошибся или ничего не нашёл; список агентов из Excel правила читают точнее
    const ruleItems = rules(all, file, d.settings.siteTheme);
    if (!items.length || ruleItems.some(x => x.kind === 'agents')) items = ruleItems.length ? ruleItems : items;
    if (file && !file.text && !items.length) return res.json({ ok: true, items: [], ai, aiError, note: file.kind === 'pdf' || file.kind === 'image' ? 'PDF и фото робот читает только с подключённым ИИ. Скопируйте текст в сообщение или подключите ИИ (OPENAI_API_KEY в Render).' : 'Этот файл робот не читает: пришлите Excel, Word или текст.' });
    items = items.slice(0, 6).map(x => ({ id: newId(4), kind: x.kind, data: x.data }));
    // для агента — есть ли уже такой
    for (const it of items) if (it.kind === 'agent' || it.kind === 'rates') { const ex = find(d, it.data); if (ex) it.exists = { id: ex.id, company: ex.company }; }
    res.json({ ok: true, items, ai, aiError, note: items.length ? '' : 'Не понял, что сделать. Примеры: «Добавь агента …», КП агента со ставками, «Груз 1200 кг из Иу в Москву», «Замени «…» на «…»», «Сделай акцент #D35400».' });
  });

  function find(d, a) { const e = low(a.email), c = low(a.company); return d.crmAgents.find(x => (e && low(x.email) === e) || (c && c !== 'агент' && low(x.company) === c)); }
  function addAgent(d, a) {
    const ex = find(d, a), transport = String(a.transport || '').split(/[,;/]/).map(t => str(t, 40)).filter(Boolean);
    const rec = { company: str(a.company, 160), contact: str(a.contact, 120), phone: str(a.phone || (a.wechat ? 'WeChat: ' + a.wechat : ''), 60), email: str(a.email, 160).toLowerCase(), site: str(a.site, 160), notes: str(a.notes, 500), transport };
    if (ex) { for (const [k, v] of Object.entries(rec)) if (v && !(Array.isArray(v) && !v.length) && !ex[k]) ex[k] = v; if (transport.length) ex.modes = C3.modesFrom(transport.join(' ')); return { item: ex, updated: true }; }
    const item = { id: newId(5), ...rec, modes: C3.modesFrom(transport.join(' ') + ' ' + rec.notes), createdAt: now(), via: 'robot' };
    d.crmAgents.push(item); return { item, updated: false };
  }

  app.post('/api/robot/apply', admin, (req, res) => {
    const b = req.body || {}, kind = String(b.kind || ''), a = b.data && typeof b.data === 'object' ? b.data : {};
    const by = (req.who && req.who.name) || (ctx.who && ctx.who(req)) || 'Администратор';
    const d = db();
    if (kind === 'agent') {
      if (!str(a.company, 160)) return bad(res, 'Укажите компанию агента');
      const r = addAgent(d, a); store.save(d);
      return res.json({ ok: true, message: (r.updated ? 'Агент уже был — дополнил контакты: ' : 'Агент добавлен: ') + r.item.company, open: 'agents' });
    }
    if (kind === 'agents') {
      const list = Array.isArray(a.items) ? a.items.slice(0, 500) : []; let added = 0, updated = 0;
      for (const x of list) { if (!str(x.company, 160)) continue; const r = addAgent(d, x); r.updated ? updated++ : added++; }
      store.save(d); return res.json({ ok: true, message: `Агенты: добавлено ${added}, дополнено ${updated}`, open: 'agents' });
    }
    if (kind === 'rates') {
      const rows = (Array.isArray(a.rates) ? a.rates : []).filter(r => n(r.rate) > 0 && r.use !== false).slice(0, 40);
      if (!rows.length) return bad(res, 'Нет ни одной ставки с суммой');
      if (!ctx.mergeRates) return bad(res, 'База ставок недоступна', 503);
      const mode = { road: 'auto', truck: 'auto' }[a.mode] || str(a.mode, 20);
      const recs = rows.map(r => ({ company: str(a.company, 160) || 'Агент', from: str(a.from, 120), to: str(a.to, 120), mode, basis: ['weight', 'volume', 'container', 'shipment'].includes(r.basis) ? r.basis : 'shipment',
        rate: n(r.rate), currency: String(r.currency || 'USD').toUpperCase().slice(0, 3), minCharge: n(r.minCharge), transitDays: str(r.transitDays, 40), validUntil: C3.validDate(r.validUntil) || str(r.validUntil, 20),
        notes: [r.unit && 'за ' + r.unit, r.container, n(r.fx) ? 'курс ЦБ +' + n(r.fx) + '%' : '', 'добавлено роботом'].filter(Boolean).join(' · '), source: 'robot' }));
      const out = ctx.mergeRates(recs, 'robot');
      if (str(a.company, 160) && a.addAgent && !find(d, a)) { addAgent(d, { company: a.company }); store.save(d); }
      return res.json({ ok: true, message: `Ставки обновлены: ${recs.length} — ${recs[0].company}${recs[0].from || recs[0].to ? ', ' + (recs[0].from || '…') + ' → ' + (recs[0].to || '…') : ''}`, added: out && out.added, open: 'rates' });
    }
    if (kind === 'cargo') {
      if (!ctx.crm) return bad(res, 'CRM недоступна', 503);
      if (!(n(a.weight) || n(a.volume) || n(a.places) || str(a.cargo, 200))) return bad(res, 'Укажите груз: вес, объём или количество мест');
      const mode = { road: 'auto', truck: 'auto' }[a.mode] || str(a.mode, 20);
      const note = [a.dims && 'Габариты: ' + str(a.dims, 80), str(a.note, 1000)].filter(Boolean).join('\n');
      const deal = ctx.crm.create({ cargo: str(a.cargo, 200) || 'Груз', from: str(a.from, 120), to: str(a.to, 120), weight: n(a.weight), volume: n(a.volume), places: n(a.places), mode: mode || undefined, note: note || undefined, source: 'Робот', activityText: 'Груз добавлен роботом.' + (note ? '\n' + note : ''), activityType: 'note' }, by);
      return res.json({ ok: true, message: 'Груз добавлен в CRM: сделка ' + (deal.number || deal.title), dealId: deal.id, open: 'deal' });
    }
    if (kind === 'text') {
      const find = str(a.find, 400), replace = str(a.replace, 400);
      if (!find || !replace) return bad(res, 'Нужны оба текста: что заменить и на что');
      if (find === replace) return bad(res, 'Тексты одинаковые');
      const list = custom(d).texts.filter(t => t.find !== find);
      list.push({ id: newId(4), find, replace, en: str(a.en, 400), zh: str(a.zh, 400), at: now(), by });
      d.settings.siteTexts = list.slice(-200); store.save(d);
      return res.json({ ok: true, message: `Текст на сайте изменён: «${find}» → «${replace}»`, open: 'site' });
    }
    if (kind === 'theme') {
      if (a.reset) { delete d.settings.siteTheme; store.save(d); return res.json({ ok: true, message: 'Цвета сайта — как были', open: 'site' }); }
      const h = hex(a.accent); if (!h) return bad(res, 'Цвет — в виде #RRGGBB');
      d.settings.siteTheme = { accent: h, at: now(), by }; store.save(d);
      return res.json({ ok: true, message: 'Акцентный цвет сайта: ' + h, open: 'site' });
    }
    bad(res, 'Неизвестное действие');
  });
  app.delete('/api/robot/texts/:id', admin, (req, res) => { const d = db(), l = custom(d).texts, i = l.findIndex(t => t.id === req.params.id); if (i < 0) return bad(res, 'Правка не найдена', 404); l.splice(i, 1); d.settings.siteTexts = l; store.save(d); res.json({ ok: true }); });
  return { rules, aiParse };
}

module.exports = { setup, rules, cities, route, cargoOf, textEdit, themeEdit, hex, shade, agentsFromRows };
