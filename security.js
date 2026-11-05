'use strict';
// Безопасность IOMASTAVKA: подписанные сессии и защита от SSRF.
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
let runtimeSecret = null;
function getSecret() {
  // Задайте SESSION_SECRET в Render (длинная случайная строка). Без неё секрет
  // генерируется при запуске: сессии сбрасываются при каждом перезапуске.
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!runtimeSecret) runtimeSecret = crypto.randomBytes(32).toString('hex');
  return runtimeSecret;
}
function hmac(body) {
  return crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
}
function signSession(payload = {}, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + SESSION_TTL_MS })).toString('base64url');
  return `${body}.${hmac(body)}`;
}
function verifySession(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(hmac(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p || typeof p.exp !== 'number' || p.exp < now) return null;
    return p;
  } catch { return null; }
}

function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && p[2] === 0) ||
    (a === 198 && (b === 18 || b === 19));
}
function isPrivateIp(ip) {
  const v = net.isIP(ip);
  if (v === 4) return isPrivateIPv4(ip);
  if (v === 6) {
    const s = ip.toLowerCase();
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('ff');
  }
  return true; // не IP — считаем небезопасным
}
async function assertPublicHttpUrl(input) {
  let u;
  try { u = new URL(String(input)); } catch { throw new Error('bad url'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
  if (u.username || u.password) throw new Error('credentials not allowed');
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('port not allowed');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('private host');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('private address');
    return u;
  }
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('private address');
  return u;
}
// Загрузка страницы с проверкой каждого редиректа и ограничением размера.
async function safeFetchText(url, { timeoutMs = 7000, maxBytes = 1000000, maxRedirects = 3, headers = {} } = {}) {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertPublicHttpUrl(current);
    const r = await fetch(u, { headers, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { current = new URL(loc, u).toString(); continue; }
    if (!r.ok || !r.body) return '';
    const reader = r.body.getReader();
    const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { try { await reader.cancel(); } catch {} break; }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  return '';
}
module.exports = { signSession, verifySession, isPrivateIp, assertPublicHttpUrl, safeFetchText, SESSION_TTL_MS };
