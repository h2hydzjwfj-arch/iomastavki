'use strict';
/**
 * Trusted news sources for the IOMASTAVKA news feed.
 *
 * Strategy per source (first that works wins):
 *   1. known RSS/Atom feeds (verified ones are listed explicitly)
 *   2. feed auto-discovery: <link rel="alternate" type="application/rss+xml"> on the home page
 *   3. Google News "site:" search (only to *find* articles; the link is resolved to the real URL)
 *
 * reuse:  'full'    – official material, the whole text may be shown with attribution
 *         'excerpt' – commercial media: show the lead only + link to the source
 * Set NEWS_FULL_TEXT=1 to show whole texts for every source (private / internal use only).
 */
const crypto = require('crypto');
const { decode, clean } = require('./extract');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const SOURCES = [
  { id: 'fts', name: 'ФТС России', kind: 'official', reuse: 'full', home: 'https://customs.gov.ru/', gnews: 'site:customs.gov.ru', feeds: [] },
  { id: 'eec', name: 'ЕЭК', kind: 'official', reuse: 'full', home: 'https://eec.eaeunion.org/', gnews: 'site:eaeunion.org', feeds: [] },
  { id: 'mintrans', name: 'Минтранс России', kind: 'official', reuse: 'full', home: 'https://mintrans.gov.ru/', gnews: 'site:mintrans.gov.ru', feeds: [] },
  { id: 'pravo', name: 'Портал правовой информации', kind: 'official', reuse: 'full', home: 'http://pravo.gov.ru/', gnews: 'site:pravo.gov.ru', feeds: [] },
  { id: 'alta', name: 'Альта-Софт', kind: 'media', reuse: 'excerpt', home: 'https://www.alta.ru/', gnews: 'site:alta.ru',
    feeds: ['https://www.alta.ru/rss/laws_news/', 'https://www.alta.ru/rss/ts_news/', 'https://www.alta.ru/rss/logistics_news/', 'https://www.alta.ru/rss/external_news/'] },
  { id: 'tks', name: 'TKS.RU', kind: 'media', reuse: 'excerpt', home: 'https://www.tks.ru/', gnews: 'site:tks.ru',
    feeds: ['https://www.tks.ru/law.rss', 'https://www.tks.ru/nearby.rss'] },
  { id: 'logirus', name: 'Логирус', kind: 'media', reuse: 'excerpt', home: 'https://logirus.ru/', gnews: 'site:logirus.ru', feeds: [] },
  { id: 'rzdp', name: 'РЖД-Партнёр', kind: 'media', reuse: 'excerpt', home: 'https://www.rzd-partner.ru/', gnews: 'site:rzd-partner.ru', feeds: [] },
  { id: 'pravoru', name: 'Право.ru', kind: 'media', reuse: 'excerpt', home: 'https://pravo.ru/', gnews: 'site:pravo.ru', feeds: [] }
];

const RELEVANT = /(китай|кнр|азі|азия|азии|азиат|china|asia|жд|ж\/д|железнодорож|контейнер|порт|таможн|тн вэд|пошлин|импорт|экспорт|логист|перевоз|грузо|евразийск|еаэс|тариф|маркиров|вэд|incoterms|фрахт|морск|судоход|транзит|склад|экспедит|пункт пропуска|декларир|товар|ставк|санкц|валют|утильсбор)/i;
const BAD = /(украин|киев|зеленск|ВСУ|мариупол|херсон|донец|луганск|запорож)/i;

const CATEGORIES = [
  ['customs', /(таможн|пошлин|тн вэд|декларир|ФТС|маркиров|досмотр|таможенн)/i],
  ['law', /(закон|постановлен|приказ|решени[ея] (коллегии|совета)|суд|арбитраж|законодательств|регулировани)/i],
  ['rail', /(жд|ж\/д|железнодорож|вагон|рж[дд]|поезд|контейнерн\w+ поезд)/i],
  ['sea', /(морск|порт|судоход|контейнеровоз|фрахт|судно|навигаци)/i],
  ['china', /(китай|кнр|china|пекин|шанхай|гуанчжоу|шэньчжэнь)/i],
  ['road', /(автоперевоз|фур|грузовик|автомобильн|пункт пропуска|граница|мамт)/i]
];

function hash(s) { return crypto.createHash('md5').update(String(s)).digest('hex').slice(0, 16); }

async function httpGet(url, opts) {
  opts = opts || {};
  const r = await fetch(url, {
    headers: Object.assign({ 'User-Agent': UA, 'Accept': opts.accept || 'text/html,application/xhtml+xml,application/xml,application/rss+xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'ru,en;q=0.8' }, opts.headers || {}),
    redirect: 'follow',
    signal: AbortSignal.timeout(opts.timeout || 12000)
  });
  return r;
}
async function getText(url, opts) {
  const r = await httpGet(url, opts);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = (r.headers.get('content-type') || '') + ' ' + buf.slice(0, 600).toString('latin1');
  const cs = ((ct.match(/charset=["']?([\w-]+)/i) || [])[1] || 'utf-8').toLowerCase();
  let text;
  try { text = new TextDecoder(/^(windows-1251|cp1251|win-1251)$/.test(cs) ? 'windows-1251' : cs).decode(buf); } catch (e) { text = buf.toString('utf8'); }
  return { text, finalUrl: r.url || url, status: r.status };
}

/* --------------------------------------------------------------- feed parsing */
function tagText(block, tag) {
  const m = block.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i'));
  return m ? m[1] : '';
}
function stripCdata(s) { return String(s || '').replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, ''); }
function htmlToText(html) {
  const strip = x => String(x || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  let s = decode(strip(html));
  // some feeds double-escape their HTML (&lt;a href=...&gt;) – unwrap once more
  if (/<\/?[a-z][^>]*>/i.test(s)) s = decode(strip(s));
  return clean(s);
}
function firstImg(html) {
  const m = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? decode(m[1]) : '';
}

function parseFeed(xml, defaults) {
  const out = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of items.slice(0, 40)) {
    const title = htmlToText(stripCdata(tagText(b, 'title')));
    let link = clean(decode(stripCdata(tagText(b, 'link'))));
    if (!link) { const m = b.match(/<link[^>]+href=["']([^"']+)["']/i); if (m) link = decode(m[1]); }
    if (!link) link = clean(decode(stripCdata(tagText(b, 'guid'))));
    const rawDesc = stripCdata(tagText(b, 'description')) || stripCdata(tagText(b, 'summary'));
    const rawFull = stripCdata(tagText(b, 'content:encoded')) || stripCdata(tagText(b, 'content'));
    const desc = htmlToText(rawDesc || rawFull);
    const pub = tagText(b, 'pubDate') || tagText(b, 'published') || tagText(b, 'updated') || tagText(b, 'dc:date');
    const dt = Date.parse(clean(stripCdata(pub)));
    let image = '';
    let m = b.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i) || b.match(/<enclosure[^>]+type=["']image[^>]*url=["']([^"']+)["']/i) || b.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
    if (m) image = decode(m[1]);
    if (!image) image = firstImg(rawFull || rawDesc);
    const src = (b.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i) || []);
    if (!title || !link) continue;
    out.push(Object.assign({}, defaults, {
      title, link,
      date: Number.isFinite(dt) ? new Date(dt).toISOString() : new Date().toISOString(),
      description: desc.slice(0, 500),
      image,
      gnewsSource: src[2] ? htmlToText(src[2]) : '',
      gnewsSourceUrl: src[1] || ''
    }));
  }
  return out;
}

/* --------------------------------------------------------------- feed discovery */
const discovered = new Map(); // homeUrl -> [feedUrls]
async function discoverFeeds(home) {
  if (discovered.has(home)) return discovered.get(home);
  let feeds = [];
  try {
    const { text, finalUrl } = await getText(home, { timeout: 9000 });
    const re = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const tag = m[0];
      if (!/type=["']application\/(rss|atom)\+xml["']/i.test(tag)) continue;
      const h = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
      if (h) { try { feeds.push(new URL(decode(h), finalUrl).toString()); } catch (e) { /* ignore */ } }
    }
  } catch (e) { /* unreachable – handled by fallback */ }
  discovered.set(home, feeds.slice(0, 3));
  return discovered.get(home);
}

/* --------------------------------------------------------------- Google News (discovery only) */
function gnewsUrl(q) { return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:14d') + '&hl=ru&gl=RU&ceid=RU:ru'; }

const gnResolved = new Map();
/** Resolve a news.google.com/rss/articles/<id> link to the publisher URL. Best effort, cached. */
async function resolveGoogleNewsUrl(link) {
  if (!/news\.google\.com\/(rss\/)?articles\//i.test(link)) return link;
  if (gnResolved.has(link)) return gnResolved.get(link);
  const id = (link.match(/articles\/([^?/#]+)/) || [])[1];
  let result = '';
  try {
    // old-style ids embed the URL in base64
    const raw = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1');
    const m = raw.match(/https?:\/\/[\x21-\x7e]+/);
    if (m && !/^AU_yq/.test(raw.slice(4, 10))) result = m[0];
  } catch (e) { /* fall through */ }
  if (!result) {
    try {
      const page = await getText('https://news.google.com/rss/articles/' + id + '?hl=ru&gl=RU&ceid=RU:ru', { timeout: 9000 });
      const sg = (page.text.match(/data-n-a-sg="([^"]+)"/) || [])[1];
      const ts = (page.text.match(/data-n-a-ts="([^"]+)"/) || [])[1];
      if (sg && ts) {
        const inner = JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]);
        const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner]]]));
        const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
          method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': UA }, signal: AbortSignal.timeout(9000)
        });
        const t = await r.text();
        const part = t.split('\n\n')[1];
        const arr = JSON.parse(part);
        const parsed = JSON.parse(arr[0][2]);
        if (parsed && /^https?:\/\//.test(parsed[1])) result = parsed[1];
      }
    } catch (e) { /* unresolved */ }
  }
  gnResolved.set(link, result || '');
  return result || '';
}

/* --------------------------------------------------------------- tagging */
function tag(item) {
  const text = item.title + ' ' + item.description;
  const cats = [];
  for (const [k, re] of CATEGORIES) if (re.test(text)) cats.push(k);
  return cats.slice(0, 3);
}
function isUrgent(t) { return /(обязательн|запрет|пошлин|таможенн|маркиров|лиценз|санкц|вступ\w+ в силу|ограничен|mandatory|ban|duty|tariff|sanction)/i.test(String(t || '')); }
function stripSourceSuffix(t) {
  return String(t || '').replace(/\s+[-–—]\s+[^-–—]{2,40}$/, '').trim();
}

/* --------------------------------------------------------------- fetch everything */
async function fetchSource(src) {
  const defaults = { source: src.name, sourceId: src.id, kind: src.kind, reuse: src.reuse };
  let items = [];
  let feeds = src.feeds.slice();
  if (!feeds.length) feeds = await discoverFeeds(src.home);
  const lists = await Promise.all(feeds.map(async u => {
    try { const { text } = await getText(u, { accept: 'application/rss+xml,application/xml,text/xml,*/*', timeout: 11000 }); return parseFeed(text, defaults); } catch (e) { return []; }
  }));
  items = lists.flat();
  let via = items.length ? 'feed' : '';
  if (!items.length && src.gnews) {
    try {
      const { text } = await getText(gnewsUrl(src.gnews), { accept: 'application/rss+xml,*/*', timeout: 12000 });
      items = parseFeed(text, defaults).map(x => Object.assign(x, { viaGoogle: true, title: stripSourceSuffix(x.title), description: '' }));
      via = items.length ? 'google' : '';
    } catch (e) { /* offline */ }
  }
  return { id: src.id, items, via };
}

async function fetchAllNews(log) {
  const results = await Promise.all(SOURCES.map(s => fetchSource(s).catch(() => ({ id: s.id, items: [], via: '' }))));
  const report = results.map(r => r.id + ':' + r.items.length + (r.via ? '(' + r.via + ')' : ''));
  if (log) log('[news] sources: ' + report.join(', '));
  let all = [];
  for (const r of results) {
    const src = SOURCES.find(s => s.id === r.id);
    const rel = r.items.filter(x => !BAD.test(x.title + ' ' + x.description)).filter(x => src.kind === 'official' || RELEVANT.test(x.title + ' ' + x.description) || x.viaGoogle);
    rel.sort((a, b) => new Date(b.date) - new Date(a.date));
    all = all.concat(rel.slice(0, 8));
  }
  const seen = new Set();
  all = all.filter(x => { const k = x.title.toLowerCase().replace(/[^a-zа-яё0-9]+/g, '').slice(0, 80); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  return all.slice(0, 36).map(x => Object.assign({}, x, { id: hash(x.link || x.title), category: tag(x), urgent: isUrgent(x.title + ' ' + x.description) }));
}

module.exports = { SOURCES, parseFeed, fetchAllNews, resolveGoogleNewsUrl, getText, htmlToText, hash, UA };
