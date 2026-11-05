'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.SESSION_SECRET = 'test-secret-for-unit-tests-only';
const { signSession, verifySession, isPrivateIp, assertPublicHttpUrl } = require('../security');

test('подписанная сессия проходит проверку', () => {
  assert.ok(verifySession(signSession({ role: 'admin' })));
});
test('подделанная кука auth=1 отклоняется (прежняя уязвимость)', () => {
  assert.equal(verifySession('1'), null);
});
test('изменённая подпись и изменённое тело отклоняются', () => {
  const t = signSession({ role: 'admin' });
  assert.equal(verifySession(t.slice(0, -2) + 'xx'), null);
  const [body, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 1e9 })).toString('base64url');
  assert.equal(verifySession(forged + '.' + sig), null);
  assert.ok(body);
});
test('просроченная сессия отклоняется', () => {
  const t = signSession({}, Date.now() - 9 * 60 * 60 * 1000);
  assert.equal(verifySession(t), null);
});
test('закрытые адреса определяются', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111'])
    assert.equal(isPrivateIp(ip), false, ip);
});
test('SSRF: опасные адреса отклоняются', async () => {
  for (const u of ['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://localhost/', 'http://[::1]/', 'http://10.0.0.5/', 'file:///etc/passwd', 'ftp://example.com/', 'http://user:pw@93.184.216.34/', 'http://93.184.216.34:8080/', 'http://metadata.internal/', 'не адрес'])
    await assert.rejects(assertPublicHttpUrl(u), u);
});
test('SSRF: публичный IP допускается', async () => {
  assert.ok(await assertPublicHttpUrl('https://93.184.216.34/page'));
});
