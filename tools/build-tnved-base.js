#!/usr/bin/env node
'use strict';
/*
 * Сборка локального справочника ТН ВЭД (reference/tnved-base.json) — запасной источник, когда alta.ru недоступен.
 *
 * Берёт реальные данные: обходит дерево ТН ВЭД на alta.ru по выбранным позициям (электроника, одежда,
 * оборудование, станки и т. д. — то, что чаще всего везут из Китая), затем открывает страницу каждого
 * 10-значного кода и разбирает её тем же парсером, что и сайт (tnved-check.js).
 *
 * Запуск: node tools/build-tnved-base.js [файл] [--limit 300]
 * Обычно запускается в GitHub Actions (.github/workflows/tnved-base.yml) раз в месяц: на сервере Render
 * и в среде разработки доступ к alta.ru может быть закрыт.
 */
const fs = require('fs');
const path = require('path');
const T = require('../tnved-check');

const BASE = 'https://www.alta.ru/tnved/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 iomastavka-tnved-base/1.0';
const PAUSE = Number(process.env.TNVED_PAUSE_MS || 700);

// Позиции, которые чаще всего ввозят из Китая. Число после кода — сколько 10-значных кодов взять максимум.
const PLAN = {
  'Электроника': [['847130', 3], ['847141', 3], ['847149', 3], ['847150', 3], ['847160', 6], ['847170', 6], ['847180', 3], ['847330', 4],
    ['850440', 8], ['850760', 3], ['851713', 3], ['851762', 6], ['851779', 4], ['851810', 3], ['851822', 3], ['851830', 3], ['851850', 3],
    ['852589', 4], ['852852', 4], ['852862', 3], ['852872', 6], ['852351', 3], ['854231', 2], ['854143', 3], ['854141', 2], ['853950', 4],
    ['854442', 4], ['854449', 4], ['853669', 4], ['853650', 4], ['851671', 2], ['851660', 4], ['851631', 2], ['851650', 2], ['850940', 3],
    ['850811', 2], ['851610', 3], ['850131', 3], ['851220', 3]],
  'Бытовая техника и климат': [['841510', 4], ['841821', 3], ['845011', 4], ['842211', 2], ['841459', 4], ['842121', 4], ['851679', 4]],
  'Оборудование': [['841370', 6], ['841480', 6], ['842139', 4], ['842381', 3], ['842710', 3], ['844331', 3], ['844332', 3], ['846721', 3],
    ['846722', 3], ['846729', 4], ['847989', 6], ['848180', 8], ['848210', 3], ['848340', 4], ['850164', 4], ['851521', 3], ['842490', 3],
    ['843143', 3], ['843149', 4], ['902680', 3], ['903180', 3]],
  'Станки': [['8456', 8], ['8457', 6], ['8458', 8], ['8459', 8], ['8460', 6], ['8461', 6], ['8462', 8], ['8463', 4], ['8465', 6], ['8466', 6]],
  'Одежда и текстиль': [['610910', 2], ['610990', 3], ['611020', 3], ['611030', 3], ['610462', 3], ['610463', 3], ['611120', 3], ['611595', 2],
    ['620140', 3], ['620240', 3], ['620342', 4], ['620343', 3], ['620462', 4], ['620463', 3], ['620520', 3], ['620630', 2], ['621210', 2],
    ['630231', 3], ['630260', 2], ['630790', 4]],
  'Обувь и сумки': [['640299', 6], ['640399', 6], ['640411', 3], ['640419', 3], ['640590', 2], ['420212', 3], ['420222', 3], ['420292', 3]],
  'Мебель, свет, дом': [['9401', 8], ['9403', 8], ['9405', 8], ['392410', 3], ['392690', 4], ['392310', 3], ['732393', 3], ['691200', 3], ['701337', 3]],
  'Игрушки и спорт': [['950300', 8], ['950490', 3], ['950691', 3], ['871200', 3], ['871160', 3]],
  'Автозапчасти и инструмент': [['870830', 4], ['870840', 4], ['870870', 3], ['870880', 3], ['870899', 6], ['401110', 2], ['820559', 3], ['820750', 3], ['820740', 3]],
  'Косметика и медицина': [['330499', 3], ['330420', 2], ['330510', 2], ['901890', 4], ['901831', 3]],
};

const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const digits = s => String(s || '').replace(/\D/g, '');
const ENT = { nbsp: ' ', quot: '"', amp: '&', lt: '<', gt: '>', laquo: '«', raquo: '»', mdash: '—', ndash: '–' };
const txt = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&(#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCharCode(+e.slice(1)) : (ENT[e.toLowerCase()] || m)).replace(/\s+/g, ' ').trim();

async function get(url, tries = 3) {
  let last = '';
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9', 'X-Requested-With': 'XMLHttpRequest' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return '';
      if (r.ok) return await r.text();
      last = 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
    await sleep(1500 * i);
  }
  throw new Error(url + ': ' + last);
}

/** Узлы дерева из ответа get_tree: код, название, uin, есть ли дети. Вложенные списки тоже. */
function nodes(html) {
  // код берём из видимой подписи узла («8471 ...», «8471 30 000 0»): data-source у позиций дополнен нулём («84710»)
  const out = []; const re = /<li\b([^>]*)>\s*(?:<span[^>]*pTnved_code[^>]*>([^<]*)<\/span>)?/gi; let m;
  while ((m = re.exec(html))) {
    const a = m[1];
    const uin = (a.match(/data-uin="(\d+)"/) || [])[1];
    if (!uin) continue;
    const src = m[2] != null ? m[2].replace(/\.\.\.|…/g, '').trim() : ((a.match(/data-source="([^"]*)"/) || [])[1] || '');
    const title = txt((a.match(/title="([^"]*)"/) || [])[1] || '');
    out.push({ uin, code: digits(src), raw: src, title, closed: /jstree-closed|jstree-open/.test(a) });
  }
  return out;
}
const children = uin => get(`${BASE}get_tree/?uin=${uin}`).then(nodes);

const memo = new Map();
const kids = async uin => { if (!memo.has(uin)) { await sleep(PAUSE / 2); memo.set(uin, await children(uin)); } return memo.get(uin); };
const inRange = (raw, two) => { const m = String(raw).match(/^(\d{2})(?:-(\d{2}))?$/); if (!m) return false; const g = +two; return g >= +m[1] && g <= +(m[2] || m[1]); };

/** Спуск по дереву: раздел → группа (2 цифры) → товарная позиция (4 цифры). Возвращает узел позиции. */
async function heading(code4) {
  if (!memo.has('root')) memo.set('root', nodes(await get(`${BASE}get_tree/`)));
  const sec = memo.get('root').find(n => inRange(n.raw, code4.slice(0, 2))); if (!sec) return null;
  const grp = (await kids(sec.uin)).find(n => n.code === code4.slice(0, 2)); if (!grp) return null;
  return (await kids(grp.uin)).find(n => n.code === code4) || null;
}

/** 10-значные коды под позицией target (4 или 6 цифр), не больше limit. */
async function leavesUnder(target, limit) {
  const start = await heading(target.slice(0, 4));
  if (!start) return [];
  const found = []; const queue = [start.uin]; let visits = 0;
  while (queue.length && found.length < limit && visits < 80) {
    const uin = queue.shift(); visits++;
    for (const n of await kids(uin)) {
      if (n.code && !n.code.startsWith(target.slice(0, Math.min(target.length, n.code.length)))) continue;
      if (n.code.length === 10) { if (n.code.startsWith(target) && !found.includes(n.code)) found.push(n.code); if (found.length >= limit) break; }
      else if (n.closed || !n.code) queue.push(n.uin);
    }
  }
  return found;
}

async function main() {
  const args = process.argv.slice(2);
  const out = args.find(a => !a.startsWith('--')) || path.join(__dirname, '..', 'reference', 'tnved-base.json');
  const li = args.indexOf('--limit'); const LIMIT = li >= 0 ? Number(args[li + 1]) : 300;
  const plan = [];
  for (const [cat, list] of Object.entries(PLAN)) for (const [code, n] of list) plan.push({ cat, code, n });

  // 1) коды из дерева
  const picked = []; const seen = new Set();
  for (const p of plan) {
    if (picked.length >= LIMIT * 1.15) break;
    try {
      const codes = await leavesUnder(p.code, p.n);
      for (const c of codes) if (!seen.has(c)) { seen.add(c); picked.push({ code: c, cat: p.cat }); }
      console.log(`${p.cat} · ${p.code}: ${codes.length}`);
    } catch (e) { console.warn(`${p.code}: ${e.message}`); }
    await sleep(PAUSE);
  }
  console.log('Кодов из дерева:', picked.length);

  // 2) ставки со страниц кодов — тем же разбором, что и сайт
  const nodeIdx = new Map(); const nodeList = []; const codes = {}; const failed = [];
  const nodeId = (code, text) => { const k = code + '|' + text; if (!nodeIdx.has(k)) { nodeIdx.set(k, nodeList.length); nodeList.push([code, text]); } return nodeIdx.get(k); };
  for (const { code, cat } of picked) {
    if (Object.keys(codes).length >= LIMIT) break;
    try {
      const html = await get(`${BASE}code/${code}/`);
      if (!html) { failed.push(code + ' 404'); continue; }
      const info = T.parseAltaPage(html, code);
      if (!info.levels.length || !info.duty.text) { failed.push(code + ' пусто'); continue; }
      codes[code] = {
        cat,
        path: info.levels.map(l => nodeId(l.code, l.text)),
        duty: info.duty.text,
        ...(info.duty.note ? { note: info.duty.note } : {}),
        vat: info.vat.map(v => (v.condition ? [v.rate, v.condition] : [v.rate])),
        ...(info.excise && !/^нет$/i.test(info.excise) ? { excise: info.excise } : {}),
      };
    } catch (e) { failed.push(code + ' ' + e.message.slice(0, 80)); }
    await sleep(PAUSE);
  }
  const base = {
    version: 1,
    source: 'alta.ru — справочник ТН ВЭД ЕАЭС (страницы кодов)',
    fetchedAt: new Date().toISOString().slice(0, 10),
    note: 'Запасной справочник: ставки на дату сборки. Перед декларированием проверяйте действующие ставки.',
    nodes: nodeList,
    codes,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(base));
  console.log(`Готово: ${Object.keys(codes).length} кодов, узлов ${nodeList.length}, ошибок ${failed.length} → ${out}`);
  if (failed.length) console.log('Не получилось:', failed.slice(0, 40).join('; '));
  if (Object.keys(codes).length < 150) process.exitCode = 1;
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { nodes, PLAN, heading, leavesUnder, get };
