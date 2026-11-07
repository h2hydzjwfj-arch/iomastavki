'use strict';
// Отказоустойчивость: проверка окружения, перехват ошибок маршрутов, предохранитель ИИ, keep-alive.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../resilience');

test('окружение: что задано, чего нет и что с ошибкой — без значений ключей', () => {
  const env = { SESSION_SECRET: 'x'.repeat(40), OPENAI_API_KEY: 'not-a-key', TELEGRAM_BOT_TOKEN: '123456:' + 'A'.repeat(35), SUPABASE_URL: 'https://p.supabase.co' };
  const r = R.checkEnv(env);
  const st = n => r.items.find(i => i.name === n).state;
  assert.strictEqual(st('SESSION_SECRET'), 'set');
  assert.strictEqual(st('OPENAI_API_KEY'), 'invalid');
  assert.strictEqual(st('TELEGRAM_BOT_TOKEN'), 'set');
  assert.strictEqual(st('TELEGRAM_WEBHOOK_SECRET'), 'missing');
  assert.deepStrictEqual(r.flags, { ai: true, telegram: true, telegramWebhook: false, storage: false, mail: false });
  assert.ok(r.problems.some(p => /OPENAI_API_KEY: похоже на ошибку/.test(p)));
  assert.ok(r.problems.some(p => /SUPABASE_URL задана, а SUPABASE_SERVICE_KEY — нет/.test(p)));
  assert.ok(!JSON.stringify(r).includes('not-a-key'), 'значение ключа не попадает в сводку');
  assert.ok(R.checkEnv({}).problems.some(p => /SESSION_SECRET/.test(p)));
});

test('маршруты: ошибка async-обработчика уходит в next, а не роняет процесс', async () => {
  const reg = {};
  const app = { get(...a) { reg.get = a; return 'setting'; }, post(...a) { reg.post = a; }, put() {}, patch() {}, delete() {}, all() {}, use(...a) { reg.use = a; } };
  R.catchAsyncRoutes(app);
  assert.strictEqual(app.get('env'), 'setting', 'app.get(имя) — по-прежнему настройка');
  app.post('/x', async () => { throw new Error('boom'); });
  let got = null; reg.post[1]({}, {}, e => { got = e; });
  await new Promise(ok => setImmediate(ok));
  assert.strictEqual(got && got.message, 'boom');
  app.post('/y', () => { throw new Error('sync'); });
  got = null; reg.post[1]({}, {}, e => { got = e; });
  assert.strictEqual(got && got.message, 'sync');
  const errMw = (err, req, res, next) => next(err); const router = Object.assign(function () {}, { handle() {} });
  app.use(errMw, router);
  assert.strictEqual(reg.use[0], errMw); assert.strictEqual(reg.use[1], router);
});

test('общий обработчик ошибок: JSON для /api, без трассировки', () => {
  const h = R.errorHandler({ error() {} });
  let code = 0, body = null;
  const res = { headersSent: false, status(c) { code = c; return this; }, json(b) { body = b; }, type() { return this; }, send(b) { body = b; } };
  h(new Error('секрет внутри'), { method: 'GET', originalUrl: '/api/x' }, res, () => {});
  assert.strictEqual(code, 500); assert.strictEqual(body.ok, false); assert.ok(!/секрет/.test(body.error));
  h(Object.assign(new Error('Плохой JSON'), { status: 400, expose: true }), { method: 'POST', originalUrl: '/api/y' }, res, () => {});
  assert.strictEqual(code, 400); assert.strictEqual(body.error, 'Плохой JSON');
});

test('предохранитель ИИ: после серии ошибок — пауза; неверный ключ — длинная пауза', () => {
  const b = R.breaker({ limit: 3, coolMs: 60000, hardMs: 600000 });
  assert.ok(b.allow());
  b.failure({ status: 502, error: 'x' }); b.failure({ status: 504, error: 'x' }); assert.ok(b.allow());
  b.failure({ status: 500, error: 'x' }); assert.ok(!b.allow()); assert.ok(b.state().pausedFor > 50);
  const k = R.breaker(); k.failure({ status: 401, error: 'Incorrect API key sk-abcdefghijklmnop1234' });
  assert.ok(!k.allow()); assert.ok(k.state().pausedFor > 500); assert.ok(!/abcdefghijklmnop/.test(k.state().lastError), 'ключ скрыт');
  k.success(); assert.ok(k.allow());
});

test('keep-alive: только на основном адресе, на копии — по KEEPALIVE=1, выключается KEEPALIVE=0', async () => {
  const log = { log() {}, warn() {} }; const calls = [];
  const fetch = async url => { calls.push(url); return { ok: true }; };
  const site = 'https://iomastavki.onrender.com';
  const a = R.startKeepAlive({ env: { RENDER_EXTERNAL_URL: site }, site, fetch, log }); assert.ok(a); await a.ping(); a.stop();
  assert.deepStrictEqual(calls, [site + '/api/health']);
  assert.strictEqual(R.startKeepAlive({ env: { RENDER_EXTERNAL_URL: 'https://iomastavki-pr-8.onrender.com' }, site, fetch, log }), null);
  const b = R.startKeepAlive({ env: { RENDER_EXTERNAL_URL: 'https://iomastavki-pr-8.onrender.com', KEEPALIVE: '1' }, site, fetch, log }); assert.ok(b); b.stop();
  assert.strictEqual(R.startKeepAlive({ env: { RENDER_EXTERNAL_URL: site, KEEPALIVE: '0' }, site, fetch, log }), null);
  assert.strictEqual(R.startKeepAlive({ env: {}, site, fetch, log }), null, 'не на Render — не пингуем');
});

test('withTimeout: долгий промис превращается в ошибку 504', async () => {
  await assert.rejects(R.withTimeout(new Promise(() => {}), 30, 'ИИ'), e => e.status === 504 && /ИИ/.test(e.message));
  assert.strictEqual(await R.withTimeout(Promise.resolve(7), 1000), 7);
});
