'use strict';
/**
 * Dependency-free article extractor.
 *   extractArticle(html, pageUrl) -> { title, image, siteName, publishedAt, markdown, paragraphs, chars }
 *
 * The result body is Markdown that the front-end renderer understands:
 *   ## / ###  headings, "- " lists, "| a | b |" tables, **bold**, *italic*, [text](url), "> " quotes.
 * Nothing is rewritten or invented: only text that is really on the page is returned.
 */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const DROP = new Set(['script', 'style', 'noscript', 'svg', 'iframe', 'form', 'nav', 'footer', 'header', 'aside', 'button', 'select', 'option', 'textarea', 'canvas', 'video', 'audio', 'template', 'dialog', 'object', 'head']);
const NEG = /(comment|footer|footnote|sidebar|side-bar|related|share|social|menu|nav|breadcrumb|banner|advert|adv-|promo|popup|modal|subscribe|newsletter|widget|tags?\b|rating|pagination|pager|print|toolbar|author-box|recommend|more-news|read-also|readmore|inform|counter|cookie)/i;
const POS = /(article|content|post|entry|text|body|news|detail|story|main|publication|material)/i;
const BOILER = /^(читайте также|читайте еще|читайте ещё|поделиться|подписывайтесь|подписаться|источник:|фото:|реклама|наш telegram|мы в telegram|подпишитесь|теги:|рубрики?:|комментарии|все права защищены|copyright|©|read also|share this)/i;

const ENT = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…', bull: '•', middot: '·', copy: '©', reg: '®', deg: '°', euro: '€', rarr: '→', larr: '←', times: '×', minus: '−', plusmn: '±', frac12: '½', sup2: '²', sup3: '³', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bdquo: '„', thinsp: ' ', ensp: ' ', emsp: ' ', shy: '' };
function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch (e) { return ''; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch (e) { return ''; } })
    .replace(/&([a-z0-9]+);/gi, (m, n) => (ENT[n.toLowerCase()] !== undefined ? ENT[n.toLowerCase()] : m));
}

/* ------------------------------------------------------------------ tiny DOM */
function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>|([^<]+|<)/g;
  let m;
  let guard = 0;
  while ((m = re.exec(html)) !== null) {
    if (++guard > 400000) break;
    if (m[5] !== undefined) {
      if (m[5] !== '<') cur.children.push({ text: m[5] });
      continue;
    }
    if (!m[2]) continue; // comment / doctype
    const tag = m[2].toLowerCase();
    if (m[1]) { // closing
      let n = cur;
      while (n && n.tag !== tag) n = n.parent;
      if (n && n.parent) cur = n.parent;
      continue;
    }
    const attrs = {};
    const ar = /([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a;
    while ((a = ar.exec(m[3] || '')) !== null) attrs[a[1].toLowerCase()] = decode(a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '');
    const node = { tag, attrs, children: [], parent: cur };
    if (DROP.has(tag) && !VOID.has(tag)) {
      // skip everything up to the matching close tag without building children
      const close = new RegExp('</' + tag + '\\s*>', 'ig');
      close.lastIndex = re.lastIndex;
      const c = close.exec(html);
      re.lastIndex = c ? close.lastIndex : html.length;
      continue;
    }
    // auto-close <p>/<li> when a sibling starts
    if ((tag === 'p' || tag === 'li') && cur.tag === tag && cur.parent) cur = cur.parent;
    cur.children.push(node);
    if (!VOID.has(tag) && !m[4]) cur = node;
  }
  return root;
}

function classId(n) { return ((n.attrs && n.attrs.class) || '') + ' ' + ((n.attrs && n.attrs.id) || '') + ' ' + ((n.attrs && n.attrs.itemprop) || ''); }
function textOf(n) {
  if (n.text !== undefined) return n.text;
  if (n.tag === 'br') return ' ';
  let s = '';
  for (const c of n.children || []) s += textOf(c);
  return s;
}
function clean(s) { return decode(s).replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\s+/g, ' ').trim(); }
function linkTextLen(n) {
  if (n.text !== undefined) return 0;
  if (n.tag === 'a') return clean(textOf(n)).length;
  let t = 0;
  for (const c of n.children || []) t += linkTextLen(c);
  return t;
}

/* ------------------------------------------------------------------ meta */
function metaContent(html, key) {
  const re1 = new RegExp('<meta[^>]+(?:property|name|itemprop)=["\']' + key + '["\'][^>]*content=["\']([^"\']*)["\']', 'i');
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name|itemprop)=["\']' + key + '["\']', 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? clean(m[1]) : '';
}
function absUrl(u, base) {
  if (!u) return '';
  try { return new URL(decode(u), base).toString(); } catch (e) { return ''; }
}

/* ------------------------------------------------------------------ inline → markdown */
function inline(n, base) {
  if (n.text !== undefined) return n.text.replace(/\s+/g, ' ');
  const tag = n.tag;
  if (tag === 'br') return ' ';
  if (tag === 'img' || tag === 'sup' || tag === 'sub' && false) return '';
  let inner = '';
  for (const c of n.children || []) inner += inline(c, base);
  if (tag === 'strong' || tag === 'b') { const t = inner.trim(); return t ? ' **' + t.replace(/\*+/g, '') + '** ' : inner; }
  if (tag === 'em' || tag === 'i') { const t = inner.trim(); return t ? ' *' + t.replace(/\*+/g, '') + '* ' : inner; }
  if (tag === 'a') {
    const href = absUrl(n.attrs.href, base);
    const t = inner.trim();
    if (t && /^https?:\/\//i.test(href) && !/^#/.test(n.attrs.href || '#') && t.length < 300) return ' [' + t.replace(/[\[\]]/g, '') + '](' + href.replace(/\)/g, '%29') + ') ';
    return inner;
  }
  return inner;
}
function md(n, base) {
  return decode(inline(n, base)).replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?»)])/g, '$1').replace(/([«(])\s+/g, '$1').replace(/\*\*\s+\*\*/g, ' ').trim();
}

/* ------------------------------------------------------------------ block emit */
function tableMd(t, base) {
  const rows = [];
  (function walk(n) {
    if (n.tag === 'tr') {
      const cells = (n.children || []).filter(c => c.tag === 'td' || c.tag === 'th').map(c => md(c, base).replace(/\|/g, '/'));
      if (cells.length) rows.push(cells);
      return;
    }
    for (const c of n.children || []) if (c.tag) walk(c);
  })(t);
  if (rows.length < 2) return '';
  const w = Math.max(...rows.map(r => r.length));
  if (w < 2 || w > 8) return '';
  const pad = r => { const x = r.slice(); while (x.length < w) x.push(''); return '| ' + x.join(' | ') + ' |'; };
  return [pad(rows[0]), '|' + Array(w).fill('---').join('|') + '|'].concat(rows.slice(1).map(pad)).join('\n');
}

function emit(node, out, base, depth) {
  if (depth > 40) return;
  for (const c of node.children || []) {
    if (c.text !== undefined) continue;
    const cid = classId(c);
    if (depth > 0 && NEG.test(cid) && !/(article|content|post-body|entry-content)/i.test(cid)) continue;
    const tag = c.tag;
    if (tag === 'p' || tag === 'div' && c.children.every(x => x.text !== undefined || /^(a|b|i|em|strong|span|br|sup|sub|u|font|small|mark|time)$/.test(x.tag))) {
      const t = md(c, base);
      if (t.length > 1 && !BOILER.test(t)) out.push(t);
    } else if (/^h[1-6]$/.test(tag)) {
      const t = md(c, base).replace(/[*_]/g, '');
      if (t && t.length < 220) out.push((tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ? '### ' : '## ') + t);
    } else if (tag === 'ul' || tag === 'ol') {
      const items = (c.children || []).filter(x => x.tag === 'li').map(li => md(li, base)).filter(x => x && !BOILER.test(x));
      if (items.length) out.push(items.map(x => '- ' + x).join('\n'));
    } else if (tag === 'table') {
      const t = tableMd(c, base);
      if (t) out.push(t);
    } else if (tag === 'blockquote') {
      const t = md(c, base);
      if (t.length > 20) out.push('> ' + t);
    } else if (tag === 'pre') {
      const t = clean(textOf(c));
      if (t.length > 20) out.push(t);
    } else if (tag === 'li') {
      const t = md(c, base);
      if (t && !BOILER.test(t)) out.push('- ' + t);
    } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'span' || tag === 'figure' || tag === 'td' || tag === 'center' || tag === 'font' || tag === 'body' || tag === 'html') {
      // bare text directly inside a container that also has blocks
      const bare = (c.children || []).filter(x => x.text !== undefined).map(x => x.text).join(' ');
      const hasBlocks = (c.children || []).some(x => x.tag && /^(p|div|ul|ol|table|h[1-6]|blockquote|section|article)$/.test(x.tag));
      if (hasBlocks) {
        const b = clean(bare);
        if (b.length > 60 && !BOILER.test(b)) out.push(b);
        emit(c, out, base, depth + 1);
      } else {
        const t = md(c, base);
        if (t.length > 40 && !BOILER.test(t)) out.push(t);
      }
    }
  }
}

/* ------------------------------------------------------------------ candidate scoring */
function pickContainer(root) {
  // 1. explicit semantic containers win
  let sem = null;
  (function walk(n) {
    if (sem || !n.children) return;
    if (n.tag && (/articleBody/i.test((n.attrs || {}).itemprop || '') || n.tag === 'article')) {
      const len = clean(textOf(n)).length;
      if (len > 400) { sem = n; return; }
    }
    for (const c of n.children) walk(c);
  })(root);

  // 2. Readability-style paragraph scoring
  const scores = new Map();
  function bump(n, v) { scores.set(n, (scores.get(n) || 0) + v); }
  (function walk(n) {
    if (n.tag === 'p' || n.tag === 'li' && false) {
      const t = clean(textOf(n));
      if (t.length >= 40) {
        const v = 1 + (t.match(/[,;]/g) || []).length + Math.min(3, Math.floor(t.length / 100));
        if (n.parent) bump(n.parent, v);
        if (n.parent && n.parent.parent) bump(n.parent.parent, v / 2);
      }
    }
    for (const c of n.children || []) if (c.tag) walk(c);
  })(root);
  let best = null, bestScore = 0;
  for (const [n, s] of scores) {
    if (!n.tag || n.tag === '#root') continue;
    const total = clean(textOf(n)).length || 1;
    const linkDensity = linkTextLen(n) / total;
    const cid = classId(n);
    let sc = s * (1 - Math.min(0.9, linkDensity));
    if (POS.test(cid)) sc *= 1.25;
    if (NEG.test(cid)) sc *= 0.5;
    if (sc > bestScore) { bestScore = sc; best = n; }
  }
  if (sem) {
    // prefer the semantic container unless the scored one is clearly richer *and* inside/equal to it
    return sem;
  }
  return best;
}

function extractArticle(html, pageUrl) {
  html = String(html || '');
  if (!html) return null;
  const title0 = metaContent(html, 'og:title') || metaContent(html, 'twitter:title');
  const image = absUrl(metaContent(html, 'og:image') || metaContent(html, 'twitter:image') || metaContent(html, 'og:image:url'), pageUrl);
  const siteName = metaContent(html, 'og:site_name');
  const published = metaContent(html, 'article:published_time') || metaContent(html, 'datePublished') || metaContent(html, 'pubdate') || ((html.match(/<time[^>]+datetime=["']([^"']+)["']/i) || [])[1] || '');
  const desc = metaContent(html, 'og:description') || metaContent(html, 'description');

  // charset fallback: strip BOM
  html = html.replace(/^\ufeff/, '');
  const root = parseHtml(html);
  const container = pickContainer(root);
  if (!container) return null;

  const blocks = [];
  emit({ children: [container] }, blocks, pageUrl, 0);
  // if the container itself is a paragraph parent, emit() above treats it as a container → fine
  const seen = new Set();
  const lines = [];
  let title = title0;
  if (!title) {
    const h1 = (function f(n) { if (n.tag === 'h1') return n; for (const c of n.children || []) { const r = c.tag && f(c); if (r) return r; } return null; })(root);
    if (h1) title = clean(textOf(h1));
  }
  title = String(title || '').replace(/\s+[|«–—-]\s+[^|«–—-]{2,40}$/, '').trim();

  for (const b of blocks) {
    const key = b.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    // drop a leading heading that only repeats the title
    if (!lines.length && /^##\s/.test(b) && title && clean(b.replace(/^##\s*/, '')).toLowerCase() === title.toLowerCase()) continue;
    lines.push(b);
  }
  const paragraphs = lines.filter(l => !/^(##|###|-|\||>)/.test(l) && l.length > 50).length;
  let markdown = lines.join('\n\n').slice(0, 80000);
  return { title, image, siteName, publishedAt: published, description: desc, markdown, paragraphs, chars: markdown.length };
}

module.exports = { extractArticle, decode, clean };
