'use strict';
// Разбор инвойса и упаковочного листа: достаём поставщика, товары, цены, вес, габариты и места.
// Excel и Word читаются здесь же (без сторонних библиотек), PDF и фото отдаются ИИ как есть.
const zlib = require('zlib');

// ---------- минимальное чтение ZIP (xlsx/docx — это zip с XML внутри)
function unzip(buf, wanted) {
  const out = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8');
    p += 46 + nlen + xlen + clen;
    if (!wanted(name)) continue;
    const lnlen = buf.readUInt16LE(off + 26), lxlen = buf.readUInt16LE(off + 28), start = off + 30 + lnlen + lxlen;
    const data = buf.slice(start, start + csize);
    try { out[name] = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8'); } catch {}
    if (Object.keys(out).length > 40) break;
  }
  return out;
}
const unxml = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');

function xlsxText(buf) {
  const f = unzip(buf, n => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const shared = []; const ss = f['xl/sharedStrings.xml'] || '';
  for (const si of ss.match(/<si>[\s\S]*?<\/si>/g) || []) shared.push(unxml((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')));
  const sheets = Object.keys(f).filter(n => n.startsWith('xl/worksheets/')).sort();
  const lines = [];
  for (const sn of sheets) {
    lines.push(`--- лист ${sn.match(/sheet(\d+)/)[1]} ---`);
    for (const row of (f[sn].match(/<row\b[\s\S]*?<\/row>/g) || []).slice(0, 400)) {
      const cells = [];
      for (const c of row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
        const t = (c.match(/\bt="(\w+)"/) || [])[1]; const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; const is = (c.match(/<is>[\s\S]*?<\/is>/) || [])[0];
        let val = '';
        if (t === 's' && v != null) val = shared[+v] || ''; else if (t === 'inlineStr' && is) val = unxml(is.replace(/<[^>]+>/g, '')); else if (v != null) val = unxml(v);
        if (String(val).trim()) cells.push(String(val).trim());
      }
      if (cells.length) lines.push(cells.join(' | '));
    }
  }
  return lines.join('\n').slice(0, 60000);
}
// Таблица с сохранением колонок (для импорта из Excel): первый лист, массив строк.
function xlsxRows(buf) {
  const f = unzip(buf, n => n === 'xl/sharedStrings.xml' || n === 'xl/worksheets/sheet1.xml');
  const shared = []; for (const si of (f['xl/sharedStrings.xml'] || '').match(/<si>[\s\S]*?<\/si>/g) || []) shared.push(unxml((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')));
  const col = ref => { let n = 0; for (const ch of String(ref).replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const rows = [];
  for (const row of (f['xl/worksheets/sheet1.xml'] || '').match(/<row\b[\s\S]*?<\/row>/g) || []) {
    const r = [];
    for (const c of row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = (c.match(/\br="([A-Z]+\d+)"/) || [])[1]; const t = (c.match(/\bt="(\w+)"/) || [])[1]; const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; const is = (c.match(/<is>[\s\S]*?<\/is>/) || [])[0];
      const val = t === 's' && v != null ? shared[+v] || '' : t === 'inlineStr' && is ? unxml(is.replace(/<[^>]+>/g, '')) : v != null ? unxml(v) : '';
      r[ref ? col(ref) : r.length] = val;
    }
    rows.push(Array.from(r, x => (x == null ? '' : x)));
    if (rows.length > 20000) break;
  }
  return rows;
}
function docxText(buf) {
  const f = unzip(buf, n => n === 'word/document.xml');
  const x = f['word/document.xml'] || '';
  return unxml(x.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').slice(0, 60000);
}
function kindOf(name, mime) {
  const ext = String(name).toLowerCase().split('.').pop();
  if (ext === 'xlsx') return 'xlsx'; if (ext === 'docx') return 'docx'; if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || /^image\/(jpeg|png|webp)$/.test(mime || '')) return 'image';
  if (['csv', 'txt'].includes(ext)) return 'text';
  return 'other';
}
function plainText(file) {
  const k = kindOf(file.name, file.mime);
  try {
    if (k === 'xlsx') return xlsxText(file.buf);
    if (k === 'docx') return docxText(file.buf);
    if (k === 'text') return file.buf.toString('utf8').slice(0, 60000);
  } catch (e) { return ''; }
  return '';
}

const PROMPT = `Ты — помощник логиста. Перед тобой инвойс, упаковочный лист и/или другие документы поставщика из Китая.
Извлеки данные и верни ТОЛЬКО JSON без markdown со структурой:
{"supplier":{"name":"","address":"","phone":"","email":"","contact":""},
 "buyer":{"name":"","address":""},
 "incoterms":"", "loading":"город/порт отгрузки", "currency":"",
 "items":[{"name":"","model":"","qty":0,"unit":"шт","unitPrice":0,"total":0,"netKg":0,"grossKg":0,"dims":"Д×Ш×В см","hsHint":""}],
 "totals":{"places":0,"netKg":0,"grossKg":0,"volumeM3":0,"amount":0},
 "packaging":"", "notes":""}
Правила: не придумывай — если данных нет, оставь пустую строку или 0. Числа — числами. Вес в кг, объём в м³, габариты в см.
Если в упаковочном листе указаны габариты мест или общий объём — перенеси их. hsHint — только если код явно указан в документах.`;

function parseJson(text) {
  const t = String(text || '').replace(/```json|```/gi, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no json');
  return JSON.parse(t.slice(a, b + 1));
}
const n = v => (Number.isFinite(+v) && +v ? +v : 0);
const fmt = v => (Math.round(v * 100) / 100).toLocaleString('ru-RU');

function summary(d) {
  if (!d) return '';
  const L = [];
  const s = d.supplier || {}, cur = d.currency || '';
  if (s.name) L.push(`Поставщик — ${s.name}`);
  if (s.address) L.push(`Адрес поставщика — ${s.address}`);
  if (s.phone) L.push(`Телефон поставщика — ${s.phone}`);
  if (s.email || s.contact) L.push(`Контакт — ${[s.contact, s.email].filter(Boolean).join(', ')}`);
  if (d.buyer && d.buyer.name) L.push(`Покупатель — ${d.buyer.name}`);
  if (d.incoterms || d.loading) L.push(`Условия поставки — ${[d.incoterms, d.loading].filter(Boolean).join(' ')}`);
  const items = Array.isArray(d.items) ? d.items.slice(0, 25) : [];
  if (items.length) {
    L.push('', 'Товары:');
    items.forEach((it, i) => {
      const parts = [];
      if (n(it.qty)) parts.push(`${fmt(n(it.qty))} ${it.unit || 'шт'}`);
      if (n(it.unitPrice)) parts.push(`за 1 ${it.unit || 'шт'} — ${fmt(n(it.unitPrice))} ${cur}`.trim());
      if (n(it.total)) parts.push(`сумма — ${fmt(n(it.total))} ${cur}`.trim());
      if (n(it.grossKg) || n(it.netKg)) parts.push(`вес — ${n(it.grossKg) ? fmt(n(it.grossKg)) + ' кг брутто' : ''}${n(it.grossKg) && n(it.netKg) ? ' / ' : ''}${n(it.netKg) ? fmt(n(it.netKg)) + ' кг нетто' : ''}`);
      if (it.dims) parts.push(`габариты — ${it.dims}`);
      if (it.hsHint) parts.push(`код из документов — ${it.hsHint}`);
      L.push(`${i + 1}) ${[it.name, it.model].filter(Boolean).join(', ') || 'товар'}${parts.length ? ': ' + parts.join('; ') : ''}`);
    });
    if (d.items.length > 25) L.push(`… и ещё ${d.items.length - 25} позиций`);
  }
  const t = d.totals || {};
  const tot = [];
  if (n(t.places)) tot.push(`Количество мест — ${fmt(n(t.places))}`);
  if (n(t.grossKg)) tot.push(`Вес брутто — ${fmt(n(t.grossKg))} кг`);
  if (n(t.netKg)) tot.push(`Вес нетто — ${fmt(n(t.netKg))} кг`);
  if (n(t.volumeM3)) tot.push(`Объём — ${fmt(n(t.volumeM3))} м³`);
  if (n(t.amount)) tot.push(`Сумма инвойса — ${fmt(n(t.amount))} ${cur}`.trim());
  if (tot.length) L.push('', 'Итого:', ...tot);
  if (d.packaging) L.push(`Упаковка — ${d.packaging}`);
  if (d.notes) L.push(`Примечание — ${d.notes}`);
  return L.join('\n').trim();
}

/**
 * files: [{ name, mime, buf }]
 * ai: { enabled(), run(input) → text } — модель с поддержкой PDF и изображений
 */
async function analyze(files, ai) {
  const texts = files.map(f => ({ f, text: plainText(f) }));
  if (!ai || !ai.enabled()) {
    const raw = texts.filter(x => x.text).map(x => `${x.f.name}:\n${x.text.slice(0, 3000)}`).join('\n\n');
    return { ok: false, reason: 'ai-off', summary: '', raw };
  }
  const content = [{ type: 'input_text', text: PROMPT }];
  for (const { f, text } of texts) {
    const k = kindOf(f.name, f.mime);
    if (text) content.push({ type: 'input_text', text: `Файл «${f.name}»:\n${text}` });
    else if (k === 'pdf') content.push({ type: 'input_file', filename: f.name, file_data: 'data:application/pdf;base64,' + f.buf.toString('base64') });
    else if (k === 'image') content.push({ type: 'input_image', image_url: `data:${f.mime || 'image/jpeg'};base64,` + f.buf.toString('base64') });
  }
  if (content.length === 1) return { ok: false, reason: 'unsupported', summary: '' };
  try {
    const text = await ai.run([{ role: 'user', content }]);
    const data = parseJson(text);
    return { ok: true, data, summary: summary(data) };
  } catch (e) {
    return { ok: false, reason: 'ai-error', error: String(e.message || e).slice(0, 200), summary: '' };
  }
}

module.exports = { analyze, summary, xlsxText, xlsxRows, docxText, kindOf, unzip };
