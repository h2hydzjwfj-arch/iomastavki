'use strict';
// Полная проверка сайта на настоящем сервере: гость, клиент, администратор.
const { startServer, ADMIN_PASS } = require('./helpers');
const results = [];
let failed = 0;
async function check(name, fn, { soft = false } = {}) {
  try { await fn(); results.push(['✅', name]); }
  catch (e) { if (soft) results.push(['⚠️', name + ' — ' + e.message]); else { failed++; results.push(['❌', name + ' — ' + e.message]); } }
}
function ok(c, msg) { if (!c) throw new Error(msg || 'условие не выполнено'); }

(async () => {
  const srv = await startServer(3999); const B = srv.base;
  const jar = {};
  async function call(who, method, url, body, raw) {
    const h = {}; if (jar[who]) h.Cookie = 'auth=' + jar[who];
    let payload = body;
    if (body && !(body instanceof FormData)) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(B + url, { method, headers: h, body: payload, redirect: 'manual' });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/auth=([^;]*)/); if (m) jar[who] = m[1]; r.cookieHeader = sc; }
    if (raw) return r;
    let j = {}; try { j = await r.json(); } catch {}
    j._status = r.status; j._cookie = sc || ''; return j;
  }
  try {
    // --- страницы и файлы
    await check('Главная открывается', async () => { const r = await fetch(B + '/'); ok(r.status === 200); ok((await r.text()).includes('iomastavka')); });
    for (const f of ['/app.js', '/styles.css', '/theme-v3.css', '/theme-v3.js', '/portal-ui.js', '/palettes.css'])
      await check('Файл ' + f, async () => { const r = await fetch(B + f); ok(r.status === 200, 'код ' + r.status); });
    await check('robots.txt и sitemap.xml', async () => { ok((await fetch(B + '/robots.txt')).status === 200); ok((await (await fetch(B + '/sitemap.xml')).text()).includes('<urlset')); });
    await check('Несуществующая страница → 404', async () => { ok((await fetch(B + '/net-takoy')).status === 404); });
    await check('Проверка здоровья /api/health', async () => { const j = await call('g', 'GET', '/api/health'); ok(j.ok && j.storage, JSON.stringify(j)); });

    // --- гость
    await check('Гость: роль guest', async () => ok((await call('g', 'GET', '/api/me')).role === 'guest'));
    for (const [m, u] of [['GET', '/api/agents'], ['GET', '/api/rates'], ['POST', '/api/ai'], ['POST', '/api/customs/check'], ['GET', '/api/leads'], ['GET', '/api/clients'], ['GET', '/api/quotes']])
      await check(`Гостю закрыто: ${m} ${u}`, async () => { const j = await call('g', m, u, m === 'POST' ? {} : undefined); ok(j._status === 401, 'код ' + j._status); });
    await check('Гость: ориентир ставки без названия агента', async () => {
      const j = await call('g', 'GET', '/api/rates/recommend?from=Shanghai&to=' + encodeURIComponent('Москва') + '&mode=rail');
      ok(j.matches && j.matches.length > 0, 'нет совпадений — база ставок не читается'); ok(j.matches.every(m => !m.company && !m.notes), 'видны названия агентов');
    });
    let gq;
    await check('Гость: сохраняет расчёт (КП по ссылке)', async () => {
      const j = await call('g', 'POST', '/api/quotes', { from: 'Shanghai', to: 'Москва', mode: 'rail', weight: 1200 });
      ok(j.ok && j.quote && j.quote.price > 0, JSON.stringify(j)); ok(!j.quote.company, 'в КП видно агента'); gq = j.quote;
      const p = await call('x', 'GET', '/api/quotes/' + gq.id); ok(p.quote && p.quote.number === gq.number, 'ссылка на КП не открывается');
    });
    await check('Гость: заявка без контактов отклоняется', async () => ok((await call('g', 'POST', '/api/leads', { name: 'Тест' }))._status === 400));
    await check('Гость: заявка принимается', async () => ok((await call('g', 'POST', '/api/leads', { name: 'Тест CI', contact: '@test', from: 'Шанхай', to: 'Москва', consent: true })).ok));
    await check('Новости: /api/news отвечает', async () => { const j = await call('g', 'GET', '/api/news'); ok(j._status === 200, 'код ' + j._status); ok(Array.isArray(j.items), 'нет списка'); });
    await check('Курсы ЦБ: /api/currency', async () => { const j = await call('g', 'GET', '/api/currency'); ok(j._status === 200); }, { soft: true });
    await check('Погода: /api/weather', async () => { const j = await call('g', 'GET', '/api/weather'); ok(j._status === 200 && j.temp != null, 'код ' + j._status); }, { soft: true });

    // --- администратор
    await check('Админ: неверный пароль не пускает', async () => ok((await call('bad', 'POST', '/api/login', { login: 'admin', password: 'wrong' }))._status === 401));
    await check('Админ: вход', async () => { const j = await call('a', 'POST', '/api/login', { login: 'admin', password: ADMIN_PASS }); ok(j.ok && j.role === 'admin', JSON.stringify(j)); });
    await check('Админ: вход по почте из ADMIN_EMAIL', async () => { const j = await call('ae', 'POST', '/api/login', { login: 'Boss@Ioma.test', password: ADMIN_PASS }); ok(j.ok && j.role === 'admin', JSON.stringify(j)); });
    await check('Админ: видит агентов и полную базу', async () => { ok((await call('a', 'GET', '/api/agents')).records.length > 0); ok((await call('a', 'GET', '/api/rates'))._status === 200); });
    await check('Админ: видит заявку гостя', async () => ok((await call('a', 'GET', '/api/leads')).items.some(l => l.name === 'Тест CI')));
    let cl, pw;
    await check('Админ: создаёт клиента', async () => { const j = await call('a', 'POST', '/api/clients', { email: 'client@ci.test', name: 'Клиент CI' }); ok(j.ok && j.password); cl = j.item; pw = j.password; });
    let sh;
    await check('Админ: создаёт груз и меняет статус', async () => {
      const j = await call('a', 'POST', '/api/shipments', { clientId: cl.id, from: 'Шанхай', to: 'Москва', mode: 'rail', weight: 1200, costs: [{ label: 'Фрахт', amount: 2450, currency: 'USD' }] }); ok(j.ok); sh = j.item;
      const u = await call('a', 'PATCH', '/api/shipments/' + sh.id, { status: 'transit', eventNote: 'Отправлен' }); ok(u.item.status === 'transit');
    });
    await check('Админ: загружает документ', async () => {
      const fd = new FormData(); fd.append('file', new Blob(['%PDF-1.4 test']), 'invoice.pdf');
      const j = await call('a', 'POST', `/api/shipments/${sh.id}/docs`, fd); ok(j.ok && j.item.docs.length === 1, JSON.stringify(j));
    });

    // --- клиент
    await check('Клиент: вход с «запомнить меня» (30 дней)', async () => {
      const j = await call('c', 'POST', '/api/login', { login: 'client@ci.test', password: pw, remember: true });
      ok(j.ok && j.role === 'client'); ok(/Max-Age=2592000/i.test(j._cookie), 'кука не на 30 дней: ' + j._cookie);
    });
    await check('Клиент: видит свой груз', async () => { const j = await call('c', 'GET', '/api/my/shipments'); ok(j.items.length === 1 && j.items[0].status === 'transit'); });
    await check('Клиент: скачивает документ', async () => { const d = (await call('c', 'GET', '/api/my/shipments')).items[0].docs[0]; const r = await call('c', 'GET', `/api/shipments/${sh.id}/docs/${d.id}`, undefined, true); ok(r.status === 200 && (await r.text()).startsWith('%PDF')); });
    await check('Клиенту закрыты заявки и чужие данные', async () => { ok((await call('c', 'GET', '/api/leads'))._status === 403); ok((await call('c', 'GET', '/api/agents'))._status === 403); });
    let cq;
    await check('Клиент: КП сохраняется в «Мои КП»', async () => {
      const j = await call('c', 'POST', '/api/quotes', { from: 'Shanghai', to: 'Москва', mode: 'rail', weight: 500 }); ok(j.ok); cq = j.quote;
      ok((await call('c', 'GET', '/api/my/quotes')).items.some(q => q.id === cq.id));
    });
    await check('Админ: видит КП клиента с агентом', async () => { const j = await call('a', 'GET', '/api/quotes'); const q = j.items.find(x => x.id === cq.id); ok(q && q.ownerName === 'Клиент CI' && q.company); });
    await check('Клиент: смена пароля', async () => {
      ok((await call('c', 'POST', '/api/account/password', { current: 'nope', next: 'new-password-1' }))._status === 403);
      ok((await call('c', 'POST', '/api/account/password', { current: pw, next: 'new-password-1' })).ok);
      ok((await call('c2', 'POST', '/api/login', { login: 'client@ci.test', password: pw }))._status === 401, 'старый пароль работает');
      ok((await call('c2', 'POST', '/api/login', { login: 'client@ci.test', password: 'new-password-1' })).ok, 'новый пароль не работает');
    });
    await check('Клиент: смена логина (почты)', async () => {
      ok((await call('c', 'PATCH', '/api/account', { email: 'renamed@ci.test', currentPassword: 'new-password-1' })).item.email === 'renamed@ci.test');
      ok((await call('c3', 'POST', '/api/login', { login: 'renamed@ci.test', password: 'new-password-1' })).ok);
    });
    await check('Восстановление пароля отвечает одинаково', async () => { const a = await call('g', 'POST', '/api/password/forgot', { email: 'renamed@ci.test' }); const b = await call('g', 'POST', '/api/password/forgot', { email: 'nobody@ci.test' }); ok(a.ok && a.message === b.message); });
    await check('Админ: смена своего пароля', async () => {
      ok((await call('a', 'POST', '/api/account/password', { current: ADMIN_PASS, next: 'admin-new-pass-1' })).ok);
      ok((await call('a2', 'POST', '/api/login', { login: 'admin', password: 'admin-new-pass-1' })).ok);
      { const st = (await call('a3', 'POST', '/api/login', { login: 'admin', password: ADMIN_PASS }))._status; ok(st === 401 || st === 429, 'старый пароль админа работает (код ' + st + ')'); }
    });
    await check('Отключённый клиент теряет доступ', async () => { await call('a', 'PATCH', '/api/clients/' + cl.id, { active: false }); ok((await call('c', 'GET', '/api/my/shipments'))._status === 401); });
    await check('Выход', async () => { await call('a', 'POST', '/api/logout'); });
    await check('Поддельная кука не даёт доступа', async () => { jar.fake = 'eyJyb2xlIjoiYWRtaW4ifQ.fake'; ok((await call('fake', 'GET', '/api/leads'))._status === 401); });
  } finally {
    srv.proc.kill();
    console.log('\nРезультаты проверки:\n' + results.map(r => r.join(' ')).join('\n'));
    console.log(`\nИтого: ${results.filter(r => r[0] === '✅').length} ок, ${results.filter(r => r[0] === '⚠️').length} предупреждений, ${failed} ошибок`);
    if (failed) { console.log('\nЛог сервера:\n' + srv.log()); process.exit(1); }
  }
})().catch(e => { console.error(e); process.exit(1); });
