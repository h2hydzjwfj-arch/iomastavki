'use strict';
/**
 * Deterministic helpers around an article. Nothing here calls an AI model, so nothing is invented.
 */

/* ------------------------------------------------------------ key facts */
const MONTHS = 'января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря';
function sentenceAround(text, index, len) {
  const start = Math.max(text.lastIndexOf('.', index - 1) + 1, index - 160);
  let end = text.indexOf('.', index + len);
  if (end < 0 || end - index > 200) end = Math.min(text.length, index + len + 120);
  return text.slice(start, end + 1).replace(/^[\s,;:—-]+/, '').replace(/\s+/g, ' ').trim();
}
function extractFacts(markdown, max) {
  max = max || 8;
  const text = String(markdown || '').replace(/[*_>#|-]{1,3}/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ');
  const out = [];
  const seen = new Set();
  function add(type, value, index, len) {
    const k = type + ':' + value.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ type, value: value.trim(), ctx: sentenceAround(text, index, len).slice(0, 220) });
  }
  let m;
  const reCode = /(?:ТН\s?ВЭД[^\d]{0,40}|код[а-я]*\s+)(\d{4}(?:\s?\d{2}){0,3})\b/gi;
  while ((m = reCode.exec(text)) !== null) add('code', m[1].replace(/\s/g, ''), m.index, m[0].length);
  const reCode2 = /\b(\d{10})\b/g;
  while ((m = reCode2.exec(text)) !== null) add('code', m[1], m.index, 10);
  const reDate = new RegExp('(?:с\\s+|до\\s+|по\\s+|от\\s+)?\\b(\\d{1,2}\\s(?:' + MONTHS + ')(?:\\s\\d{4})?|\\d{2}\\.\\d{2}\\.\\d{4})', 'gi');
  while ((m = reDate.exec(text)) !== null) add('date', m[1], m.index, m[0].length);
  const rePct = /(\d+(?:[.,]\d+)?)\s?%/g;
  while ((m = rePct.exec(text)) !== null) add('percent', m[1].replace(',', '.') + '%', m.index, m[0].length);
  const reMoney = /(\d[\d\s.,]*)\s?(млрд|млн|тыс\.?)?\s?(руб(?:л[а-я]+)?\.?|₽|долл(?:ар[а-я]*)?\.?|\$|USD|CNY|юан[а-я]*|евро|€|EUR)/gi;
  while ((m = reMoney.exec(text)) !== null) { const v = (m[1].trim() + ' ' + (m[2] || '') + ' ' + m[3]).replace(/\s+/g, ' ').trim(); if (/\d/.test(v)) add('money', v, m.index, m[0].length); }
  const reQty = /(\d[\d\s.,]*)\s?(тыс\.?\s?)?(тонн[а-я]*|т\b|TEU|ДФЭ|контейнер[а-я]*|вагон[а-я]*|км\b)/gi;
  while ((m = reQty.exec(text)) !== null) { const v = (m[1].trim() + ' ' + (m[2] || '') + m[3]).replace(/\s+/g, ' ').trim(); if (/\d/.test(v) && v.length < 24) add('qty', v, m.index, m[0].length); }
  // keep a balanced mix, most informative first
  const order = ['date', 'percent', 'code', 'money', 'qty'];
  const byType = {};
  out.forEach(f => { (byType[f.type] = byType[f.type] || []).push(f); });
  const picked = [];
  for (let round = 0; picked.length < max && round < 4; round++) {
    for (const t of order) { const f = (byType[t] || [])[round]; if (f && picked.length < max) picked.push(f); }
  }
  return picked;
}

/* ------------------------------------------------------------ related */
const STOP = new Set(['который', 'которая', 'которые', 'также', 'после', 'между', 'более', 'этого', 'этой', 'россии', 'россия', 'новости', 'года', 'году', 'тыс', 'млрд', 'млн', 'будет', 'могут', 'стало', 'чтобы', 'когда', 'перед', 'через', 'около']);
function keywords(s) {
  return String(s || '').toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length > 4 && !STOP.has(w)).map(w => w.slice(0, 6));
}
function related(item, all, n) {
  n = n || 3;
  const kw = new Set(keywords(item.title + ' ' + (item.description || '')));
  return all
    .filter(x => x.id !== item.id && x.link !== item.link)
    .map(x => {
      const k = keywords(x.title + ' ' + (x.description || ''));
      let s = 0;
      k.forEach(w => { if (kw.has(w)) s += 2; });
      (x.category || []).forEach(c => { if ((item.category || []).includes(c)) s += 1.5; });
      if (x.sourceId === item.sourceId) s -= 0.5;
      return { x, s };
    })
    .filter(o => o.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(o => o.x);
}

/* ------------------------------------------------------------ reuse policy */
function firstSentences(paragraphs, maxChars) {
  const out = [];
  let total = 0;
  for (const p of paragraphs) {
    if (total >= maxChars) break;
    if (total + p.length > maxChars) {
      const cut = p.slice(0, Math.max(0, maxChars - total));
      const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
      if (stop > 60) out.push(cut.slice(0, stop + 1));
      else if (!out.length) out.push(cut.trim() + '…');
      break;
    }
    out.push(p);
    total += p.length;
  }
  return out;
}
/** 'full' returns everything; 'excerpt' returns the lead only (plain paragraphs, no tables). */
function applyReuse(markdown, mode) {
  if (mode === 'full') return { content: markdown, truncated: false };
  const blocks = String(markdown || '').split(/\n{2,}/);
  const paras = blocks.filter(b => !/^(##|###|-|\||>)/.test(b));
  const kept = firstSentences(paras, 800);
  const truncated = kept.join('\n\n').length < String(markdown || '').length - 40;
  return { content: kept.join('\n\n'), truncated };
}

/* ------------------------------------------------------------ chunking for translation */
function splitForTranslation(markdown, maxChars) {
  maxChars = maxChars || 1800;
  const blocks = String(markdown || '').split(/\n{2,}/);
  const chunks = [];
  let cur = '';
  for (const b of blocks) {
    if ((cur + '\n\n' + b).length > maxChars && cur) { chunks.push(cur); cur = b; } else cur = cur ? cur + '\n\n' + b : b;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/* ------------------------------------------------------------ reading time */
function readingMinutes(markdown) {
  const words = String(markdown || '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 180));
}

module.exports = { extractFacts, related, applyReuse, splitForTranslation, readingMinutes, keywords };
