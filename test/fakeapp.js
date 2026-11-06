'use strict';
// Мини-заменитель express для модульных тестов маршрутов (без сети и без зависимостей).
function fakeApp() {
  const routes = [];
  const add = method => (path, ...handlers) => {
    const keys = []; const rx = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, rx, keys, handlers });
  };
  const app = { get: add('GET'), post: add('POST'), put: add('PUT'), patch: add('PATCH'), delete: add('DELETE'), use() {} };
  app.call = (method, url, body, extra) => new Promise((resolve, reject) => {
    const [path, qs] = url.split('?');
    const r = routes.find(x => x.method === method && x.rx.test(path));
    if (!r) return resolve({ status: 404, body: { error: 'no route ' + method + ' ' + path } });
    const m = path.match(r.rx); const params = {}; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    const query = {}; new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    const req = { method, params, query, body: body || {}, headers: {}, cookies: {}, get: h => (extra && extra.headers && extra.headers[h.toLowerCase()]) || '', _file: extra && extra.file };
    const out = { status: 200, headers: {}, body: null };
    const res = { status(c) { out.status = c; return res; }, json(j) { out.body = j; resolve(out); return res; }, set(k, v) { out.headers[k] = v; return res; }, send(b) { out.body = b; resolve(out); return res; }, end() { resolve(out); return res; }, clearCookie() { return res; } };
    let i = 0; const next = e => { if (e) return reject(e); const h = r.handlers[i++]; if (!h) return resolve(out); try { const p = h(req, res, next); if (p && p.catch) p.catch(reject); } catch (err) { reject(err); } };
    next();
  });
  return app;
}
const admin = (req, res, next) => { req.who = { role: 'admin', name: 'Администратор' }; next(); };
const upload = { single: () => (req, res, next) => { req.file = req._file || null; next(); }, array: () => (req, res, next) => { req.files = req._file ? [req._file] : []; next(); } };
module.exports = { fakeApp, admin, upload };
