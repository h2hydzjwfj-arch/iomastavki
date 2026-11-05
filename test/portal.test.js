'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { signSession, verifySession } = require('../security');
const { setup, verifyHash, hashPassword } = require('../portal');

// Минимальная подмена express: собираем обработчики и вызываем их по очереди.
function fakeApp() {
  const routes = [];
  const add = m => (p, ...h) => routes.push({ m, p, h });
  const app = { get: add('GET'), post: add('POST'), patch: add('PATCH'), delete: add('DELETE'), put: add('PUT'), use() {} };
  app.call = async (m, url, { body = {}, cookie, params } = {}) => {
    const r = routes.find(x => x.m === m && match(x.p, url));
    if (!r) throw new Error('no route ' + m + ' ' + url);
    const req = { body, cookies: cookie ? { auth: cookie } : {}, params: params || match(r.p, url) };
    const res = { code: 200, json(o) { this.out = o; return this; }, status(c) { this.code = c; return this; }, setHeader() {}, download(f) { this.file = f; } };
    let i = 0; const next = async () => { const h = r.h[i++]; if (h) await h(req, res, next); };
    await next(); return res;
  };
  return app;
}
function match(pattern, url) {
  const a = pattern.split('/'), b = url.split('/'); if (a.length !== b.length) return null;
  const p = {}; for (let i = 0; i < a.length; i++) { if (a[i].startsWith(':')) p[a[i].slice(1)] = b[i]; else if (a[i] !== b[i]) return null; } return p;
}
function make() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-'));
  const sent = [];
  const app = fakeApp();
  const portal = setup(app, { verifySession, DATA_DIR: dir, upload: null, rateLimit: null, notify: async t => sent.push(t) });
  return { app, portal, sent, admin: signSession({ role: 'admin' }) };
}

test('пароли: хэш проверяется, чужой пароль нет', () => {
  const h = hashPassword('секрет-123');
  assert.ok(verifyHash('секрет-123', h)); assert.ok(!verifyHash('другой', h));
});

test('гость: роль guest, оставляет заявку, уведомление уходит', async () => {
  const { app, sent } = make();
  assert.strictEqual((await app.call('GET', '/api/me')).out.role, 'guest');
  const bad = await app.call('POST', '/api/leads', { body: { name: 'Иван' } });
  assert.strictEqual(bad.code, 400);
  const ok = await app.call('POST', '/api/leads', { body: { name: 'Иван', contact: '@ivan', from: 'Шанхай', to: 'Москва', consent: true } });
  assert.strictEqual(ok.out.ok, true); assert.strictEqual(sent.length, 1); assert.match(sent[0], /Иван/);
});

test('гость не видит заявки, клиентов и грузы', async () => {
  const { app } = make();
  for (const u of ['/api/leads', '/api/clients', '/api/shipments']) assert.strictEqual((await app.call('GET', u)).code, 401);
  assert.strictEqual((await app.call('GET', '/api/my/shipments')).code, 401);
});

test('поддельная или чужая кука не даёт прав администратора', async () => {
  const { app } = make();
  assert.strictEqual((await app.call('GET', '/api/leads', { cookie: 'auth=1' })).code, 401);
  const client = signSession({ role: 'client', uid: 'nope' });
  assert.strictEqual((await app.call('GET', '/api/leads', { cookie: client })).code, 401);
});

test('клиент видит только свои грузы, без внутренних заметок', async () => {
  const { app, portal, admin } = make();
  const a = await app.call('POST', '/api/clients', { cookie: admin, body: { email: 'a@test.ru', name: 'Анна' } });
  const b = await app.call('POST', '/api/clients', { cookie: admin, body: { email: 'b@test.ru', name: 'Борис' } });
  assert.ok(a.out.password && a.out.password.length >= 10);
  await app.call('POST', '/api/shipments', { cookie: admin, body: { clientId: a.out.item.id, from: 'Шанхай', to: 'Москва', note: 'внутреннее', costs: [{ label: 'Фрахт', amount: 2450, currency: 'usd' }] } });
  await app.call('POST', '/api/shipments', { cookie: admin, body: { clientId: b.out.item.id, from: 'Нинбо', to: 'СПб' } });
  assert.ok(portal.findClient('A@test.ru', a.out.password)); assert.ok(!portal.findClient('a@test.ru', 'wrong'));
  const sess = signSession({ role: 'client', uid: a.out.item.id });
  const mine = await app.call('GET', '/api/my/shipments', { cookie: sess });
  assert.strictEqual(mine.out.items.length, 1); assert.strictEqual(mine.out.items[0].from, 'Шанхай');
  assert.strictEqual(mine.out.items[0].note, undefined); assert.strictEqual(mine.out.items[0].costs[0].currency, 'USD');
  assert.strictEqual((await app.call('GET', '/api/leads', { cookie: sess })).code, 403);
});

test('смена статуса пишет историю; отключённый клиент теряет доступ', async () => {
  const { app, admin } = make();
  const c = await app.call('POST', '/api/clients', { cookie: admin, body: { email: 'c@test.ru' } });
  const s = await app.call('POST', '/api/shipments', { cookie: admin, body: { clientId: c.out.item.id } });
  const upd = await app.call('PATCH', '/api/shipments/' + s.out.item.id, { cookie: admin, body: { status: 'transit', eventNote: 'Вышел со станции' } });
  assert.strictEqual(upd.out.item.status, 'transit'); assert.strictEqual(upd.out.item.events.length, 2);
  await app.call('PATCH', '/api/clients/' + c.out.item.id, { cookie: admin, body: { active: false } });
  const sess = signSession({ role: 'client', uid: c.out.item.id });
  assert.strictEqual((await app.call('GET', '/api/my/shipments', { cookie: sess })).code, 401);
});
