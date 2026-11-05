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
  app.call = async (m, url, { body = {}, cookie, params, headers = {} } = {}) => {
    const r = routes.find(x => x.m === m && match(x.p, url));
    if (!r) throw new Error('no route ' + m + ' ' + url);
    const req = { body, cookies: cookie ? { auth: cookie } : {}, params: params || match(r.p, url), headers, get(h) { return this.headers[h.toLowerCase()]; } };
    const res = { code: 200, json(o) { this.out = o; return this; }, status(c) { this.code = c; return this; }, setHeader() {}, send(b) { this.body = b; return this; }, end() { return this; }, download(f) { this.file = f; } };
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
  const tgSent = [], mailSent = [];
  const tg = { ready: () => true, send: async (c, t) => tgSent.push([c, t]), username: async () => 'iomabot', setWebhook: async () => ({ ok: true }) };
  const mail = { enabled: () => true, send: async (to, sub, t) => mailSent.push([to, sub, t]) };
  const engine = ({ from, to }) => (/шанхай/i.test(from) && /москв/i.test(to) ? { rate: 9600, currency: 'USD', company: 'Ruscargo', notes: 'внутреннее', mode: 'rail', transitDays: '30-35', basis: 'container' } : null);
  const portal = setup(app, { verifySession, DATA_DIR: dir, upload: null, rateLimit: null, notify: async t => sent.push(t), tg, mail, engine });
  portal.setEnvAdminCheck(pw => pw === 'env-admin-pass');
  return { app, portal, sent, tgSent, mailSent, admin: signSession({ role: 'admin' }) };
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

test('Supabase: без ключей не включается, чужой адрес отклоняется', () => {
  const { createCloud } = require('../cloud');
  assert.strictEqual(createCloud({}), null);
  assert.strictEqual(createCloud({ SUPABASE_URL: 'https://evil.example.com', SUPABASE_SERVICE_KEY: 'x' }), null);
  assert.ok(createCloud({ SUPABASE_URL: 'https://abcd1234.supabase.co', SUPABASE_SERVICE_KEY: 'x' }));
});

test('облачное хранилище: данные и документы переживают перезапуск', async () => {
  const { createStore } = require('../portal');
  const mem = new Map();
  const cloud = { put: async (k, v) => { mem.set(k, Buffer.from(v)); }, get: async k => mem.get(k) || null, del: async k => { mem.delete(k); } };
  const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-'));
  const s1 = createStore(dir1, cloud); await s1.init();
  const db = s1.load(); db.leads.push({ id: 'x', name: 'Тест' }); s1.save(db); await s1.flush();
  await s1.putDoc('ship1', 'abc', Buffer.from('PDF'), 'application/pdf');
  // «перезапуск»: новая пустая папка, данные должны прийти из облака
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'p2-'));
  const s2 = createStore(dir2, cloud); await s2.init();
  assert.strictEqual(s2.load().leads[0].name, 'Тест');
  assert.strictEqual((await s2.getDoc('ship1', 'abc')).toString(), 'PDF');
  await s2.delDoc('ship1', 'abc'); assert.strictEqual(await s2.getDoc('ship1', 'abc'), null);
});

async function clientWith(app, admin) {
  const c = await app.call('POST', '/api/clients', { cookie: admin, body: { email: 'q@test.ru', name: 'Кира' } });
  return { id: c.out.item.id, pw: c.out.password, sess: signSession({ role: 'client', uid: c.out.item.id }) };
}

test('смена пароля клиента и администратора', async () => {
  const { app, portal, admin } = make();
  const c = await clientWith(app, admin);
  assert.strictEqual((await app.call('POST', '/api/account/password', { cookie: c.sess, body: { current: 'wrong', next: 'новыйпароль1' } })).code, 403);
  assert.strictEqual((await app.call('POST', '/api/account/password', { cookie: c.sess, body: { current: c.pw, next: 'short' } })).code, 400);
  assert.ok((await app.call('POST', '/api/account/password', { cookie: c.sess, body: { current: c.pw, next: 'новыйпароль1' } })).out.ok);
  assert.ok(portal.findClient('q@test.ru', 'новыйпароль1')); assert.ok(!portal.findClient('q@test.ru', c.pw));
  assert.ok(portal.adminPasswordOk('env-admin-pass'));
  assert.ok((await app.call('POST', '/api/account/password', { cookie: admin, body: { current: 'env-admin-pass', next: 'admin-new-pass' } })).out.ok);
  assert.ok(portal.adminPasswordOk('admin-new-pass')); assert.ok(!portal.adminPasswordOk('env-admin-pass'));
});

test('смена логина требует текущий пароль', async () => {
  const { app, admin } = make();
  const c = await clientWith(app, admin);
  assert.strictEqual((await app.call('PATCH', '/api/account', { cookie: c.sess, body: { email: 'new@test.ru' } })).code, 403);
  const ok = await app.call('PATCH', '/api/account', { cookie: c.sess, body: { email: 'new@test.ru', currentPassword: c.pw } });
  assert.strictEqual(ok.out.item.email, 'new@test.ru');
});

test('восстановление пароля: ссылка приходит, одинаковый ответ для чужой почты', async () => {
  const { app, portal, admin, mailSent } = make();
  const c = await clientWith(app, admin);
  const a = await app.call('POST', '/api/password/forgot', { body: { email: 'nobody@test.ru' } });
  const b = await app.call('POST', '/api/password/forgot', { body: { email: 'q@test.ru' } });
  assert.strictEqual(a.out.message, b.out.message);
  const token = mailSent[0][2].match(/#reset=([\w-]+)/)[1];
  assert.strictEqual((await app.call('POST', '/api/password/reset', { body: { token: 'bad', password: 'abcdefgh1' } })).code, 400);
  assert.ok((await app.call('POST', '/api/password/reset', { body: { token, password: 'восстановлен1' } })).out.ok);
  assert.ok(portal.findClient('q@test.ru', 'восстановлен1'));
  assert.strictEqual((await app.call('POST', '/api/password/reset', { body: { token, password: 'ещё-раз-123' } })).code, 400);
});

test('КП: считается на сервере, сохраняется, без названия агента, уходит клиенту', async () => {
  const { app, admin, tgSent, mailSent } = make();
  const c = await clientWith(app, admin);
  assert.strictEqual((await app.call('POST', '/api/quotes', { body: { from: 'Урюпинск', to: 'Москва' } })).code, 404);
  const q = await app.call('POST', '/api/quotes', { cookie: c.sess, body: { from: 'Шанхай', to: 'Москва', weight: 1200, price: 1 } });
  assert.strictEqual(q.out.quote.price, 9600); assert.strictEqual(q.out.quote.company, undefined); assert.strictEqual(q.out.quote.notes, undefined);
  assert.match(q.out.quote.number, /^КП-\d{6}-[A-F0-9]{4}$/);
  assert.ok(q.out.delivered.email); assert.match(mailSent[0][2], /9[\s\u00a0]?600 USD/);
  const pub = await app.call('GET', '/api/quotes/' + q.out.quote.id);
  assert.strictEqual(pub.out.quote.company, undefined);
  assert.strictEqual((await app.call('GET', '/api/quotes/' + q.out.quote.id, { cookie: admin })).out.quote.company, 'Ruscargo');
  const mine = await app.call('GET', '/api/my/quotes', { cookie: c.sess });
  assert.strictEqual(mine.out.items.length, 1);
  assert.strictEqual((await app.call('GET', '/api/quotes/zzz')).code, 404);
});

test('Telegram: привязка через /start, проверка секрета, уведомление о статусе', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'whsec';
  const { app, admin, tgSent } = make();
  const c = await clientWith(app, admin);
  const link = await app.call('POST', '/api/account/telegram', { cookie: c.sess });
  const code = link.out.url.match(/start=([a-f0-9]+)/)[1];
  assert.strictEqual((await app.call('POST', '/api/telegram/webhook', { body: { message: { chat: { id: 55 }, text: '/start ' + code } } })).code, 401);
  await app.call('POST', '/api/telegram/webhook', { body: { message: { chat: { id: 55 }, text: '/start ' + code } }, headers: { 'x-telegram-bot-api-secret-token': 'whsec' } });
  await new Promise(r => setTimeout(r, 20));
  assert.ok((await app.call('GET', '/api/account', { cookie: c.sess })).out.telegramLinked);
  const s = await app.call('POST', '/api/shipments', { cookie: admin, body: { clientId: c.id, from: 'Шанхай', to: 'Москва' } });
  await app.call('PATCH', '/api/shipments/' + s.out.item.id, { cookie: admin, body: { status: 'transit', eventNote: 'Поезд вышел' } });
  await new Promise(r => setTimeout(r, 20));
  assert.ok(tgSent.some(([chat, t]) => chat === 55 && /В пути/.test(t) && /Поезд вышел/.test(t)));
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

test('почта через Resend: правильный запрос', async () => {
  const { mailer } = require('../portal');
  const calls = []; const realFetch = global.fetch;
  global.fetch = async (url, o) => { calls.push([url, o]); return { ok: true, text: async () => '' }; };
  process.env.RESEND_API_KEY = 're_test'; process.env.RESEND_FROM = 'iomastavka <kp@iomastavka.ru>';
  try {
    const m = mailer(); assert.ok(m.enabled()); assert.strictEqual(m.kind(), 'Resend');
    await m.send('client@test.ru', 'КП', 'текст');
    assert.strictEqual(calls[0][0], 'https://api.resend.com/emails');
    const body = JSON.parse(calls[0][1].body); assert.deepStrictEqual(body.to, ['client@test.ru']); assert.strictEqual(body.from, 'iomastavka <kp@iomastavka.ru>');
    assert.strictEqual(calls[0][1].headers.Authorization, 'Bearer re_test');
  } finally { global.fetch = realFetch; delete process.env.RESEND_API_KEY; delete process.env.RESEND_FROM; }
});
