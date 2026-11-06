'use strict';
// Наглядная проверка: настоящий сервер + тестовый Telegram + браузер с записью видео.
// Всё, что сайт отправил бы в Telegram, сохраняется и показывается как переписка.
const fs = require('fs'); const path = require('path'); const http = require('http');
const { chromium } = require('playwright');
const { startServer, ADMIN_PASS } = require('./helpers');
const OUT = path.join(__dirname, '..', 'test-output'); fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });
const ADMIN_CHAT = 999001, CLIENT_CHAT = 555001, SECRET = 'showcase-secret';
const msgs = [];
const steps = []; let failed = 0;
async function step(name, fn) { try { await fn(); steps.push(['✅', name]); } catch (e) { failed++; steps.push(['❌', name + ' — ' + String(e.message).split('\n')[0]]); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'нет'); };
const waitMsg = async (re, chat, t = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const m = msgs.find(x => (!chat || x.chat === chat) && re.test(x.text)); if (m) return m; await new Promise(r => setTimeout(r, 150)); } throw new Error('в Telegram не пришло: ' + re); };

// --- тестовый Telegram API
const tgServer = http.createServer((req, res) => {
  let b = ''; req.on('data', d => { b += d; }); req.on('end', () => {
    let body = {}; try { body = JSON.parse(b || '{}'); } catch {}
    const m = req.url.match(/\/bot[^/]+\/(\w+)/); const method = m && m[1];
    res.setHeader('Content-Type', 'application/json');
    if (method === 'getMe') return res.end(JSON.stringify({ ok: true, result: { username: 'iomastavka_bot' } }));
    if (method === 'setWebhook') return res.end(JSON.stringify({ ok: true, result: true }));
    if (method === 'sendMessage') { msgs.push({ chat: Number(body.chat_id), text: String(body.text), at: new Date() }); return res.end(JSON.stringify({ ok: true, result: { message_id: msgs.length } })); }
    res.end(JSON.stringify({ ok: false, description: 'unknown' }));
  });
});

(async () => {
  await new Promise(r => tgServer.listen(4010, r));
  const srv = await startServer(3997, { TELEGRAM_BOT_TOKEN: '123:test', TELEGRAM_CHAT_ID: String(ADMIN_CHAT), TELEGRAM_WEBHOOK_SECRET: SECRET, TELEGRAM_API_BASE: 'http://localhost:4010' });
  const B = srv.base;
  const browser = await chromium.launch();
  const errors = [];
  async function ctx(name, opts = {}) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: path.join(OUT, 'video', name), size: { width: 1280, height: 800 } }, ...opts });
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(B + '/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => /role-/.test(document.body.className)); await p.waitForTimeout(800);
    return { c, p };
  }
  let n = 0; const shot = (p, name) => p.screenshot({ path: path.join(OUT, String(++n).padStart(2, '0') + '_' + name + '.png') });
  const slow = p => p.waitForTimeout(900);
  let clientPw = '', clientEmail = 'anna@client.test';
  try {
    // ---------- ГОСТЬ ----------
    const G = await ctx('1_guest');
    await step('Гость открывает сайт', async () => { await G.p.waitForSelector('.v3-hero'); await slow(G.p); await shot(G.p, 'guest_home'); });
    await step('Гость считает ставку Шанхай → Москва', async () => {
      await G.p.click('.v3-nav [data-open-view=calculator]'); await slow(G.p);
      await G.p.fill('#fromCity', 'Shanghai'); await G.p.fill('#toCity', 'Москва'); await G.p.fill('#weight', '1200');
      await G.p.waitForTimeout(1200); await G.p.click('.v3c-params .v3c-title'); await G.p.click('.v3c-chips [data-m=rail]'); await G.p.click('#calculate');
      await G.p.waitForSelector('#result .result-price:not(.muted)'); await slow(G.p); await shot(G.p, 'guest_rate');
    });
    let kpLink = '';
    await step('Гость сохраняет КП и получает ссылку', async () => {
      await G.p.click('.v3p-savebtn'); await G.p.waitForSelector('.v3p-saved'); await G.p.click('.v3p-saved [data-kpopen]');
      await G.p.waitForSelector('#quoteView.open .v3p-kp'); kpLink = await G.p.getAttribute('[data-kpcopy]', 'data-kpcopy'); await slow(G.p); await shot(G.p, 'guest_kp');
    });
    await step('Ссылка на КП открывается в новом окне', async () => { const p2 = await G.c.newPage(); await p2.goto(kpLink); await p2.waitForSelector('#quoteView.open .v3p-kp'); await p2.close(); });
    await step('Гость оставляет заявку → она приходит вам в Telegram', async () => {
      await G.p.evaluate(() => window.__v3open('leadView')); await slow(G.p);
      await G.p.fill('#v3leadForm [name=name]', 'Сергей Иванов'); await G.p.fill('#v3leadForm [name=contact]', '@sergey_import');
      await G.p.fill('#v3leadForm [name=cargo]', 'Запчасти, 6 паллет'); await G.p.check('#v3leadForm [name=consent]'); await G.p.click('#v3leadForm [type=submit]');
      await G.p.waitForSelector('#v3leadDone:not([hidden])'); await slow(G.p); await shot(G.p, 'guest_lead_sent');
      await waitMsg(/Новая заявка[\s\S]*Сергей Иванов/, ADMIN_CHAT);
    });
    await step('Новости открываются', async () => { await G.p.evaluate(() => window.__iomaOpenView('news')); await G.p.waitForTimeout(2500); await shot(G.p, 'news'); });
    await G.c.close();

    // ---------- АДМИНИСТРАТОР ----------
    const A = await ctx('2_admin');
    await step('Вы входите как администратор', async () => {
      await A.p.click('.v3-loginbtn'); await slow(A.p); await A.p.fill('#v3loginForm [name=login]', 'admin'); await A.p.fill('#v3loginForm [name=password]', ADMIN_PASS);
      await A.p.click('#v3loginForm [type=submit]'); await A.p.waitForFunction(() => document.body.classList.contains('role-admin')); await slow(A.p);
    });
    await step('Кнопка «Проверить уведомления» → сообщение пришло вам', async () => {
      await A.p.click('.v3-acc'); await A.p.waitForSelector('#v3testBtn'); await A.p.click('#v3testBtn');
      await A.p.waitForSelector('#v3testOut .v3p-on'); await slow(A.p); await shot(A.p, 'admin_test_notify');
      await waitMsg(/Проверка iomastavka/, ADMIN_CHAT);
    });
    await step('Заявка гостя стала сделкой в разделе «Работа»', async () => {
      await A.p.click('.v3-nav [data-open-view=workView]'); await A.p.waitForSelector('#crmInbox [data-x=open]:has-text("Сергей Иванов")'); await slow(A.p); await shot(A.p, 'admin_leads');
    });
    await step('Вы создаёте клиенту доступ', async () => {
      await A.p.click('#workView .cx-nav [data-tab=clients]'); await A.p.click('.crm-access summary'); await A.p.fill('#v3clientForm [name=email]', clientEmail); await A.p.fill('#v3clientForm [name=name]', 'Анна Петрова');
      await A.p.fill('#v3clientForm [name=company]', 'ООО Вектор'); await A.p.click('#v3clientForm [type=submit]'); await A.p.waitForSelector('#v3clientOk code');
      clientPw = (await A.p.textContent('#v3clientOk code')).trim(); await slow(A.p); await shot(A.p, 'admin_client_created');
    });
    await step('Вы оформляете груз клиенту', async () => {
      await A.p.click('#workView .cx-nav [data-tab=ships]'); await A.p.click('#v3shipNew > summary'); await A.p.selectOption('#v3shipClient', { label: 'Анна Петрова · ООО Вектор' });
      await A.p.fill('#v3shipForm [name=from]', 'Шанхай'); await A.p.fill('#v3shipForm [name=to]', 'Москва'); await A.p.selectOption('#v3shipForm [name=mode]', 'rail');
      await A.p.fill('#v3shipForm [name=cargo]', 'Запчасти, 6 паллет'); await A.p.fill('#v3shipForm [name=weight]', '1200'); await A.p.fill('#v3shipForm [name=volume]', '4.5');
      await A.p.fill('#v3shipForm [name=costs]', 'Фрахт ЖД; 2450; USD\nТаможенные платежи; 184300; RUB');
      await A.p.click('#v3shipForm [type=submit]'); await A.p.waitForSelector('#v3shipsList .v3p-ship'); await slow(A.p); await shot(A.p, 'admin_shipment');
    });

    // ---------- КЛИЕНТ ----------
    const C = await ctx('3_client');
    await step('Клиент входит по логину и паролю', async () => {
      await C.p.click('.v3-loginbtn'); await C.p.fill('#v3loginForm [name=login]', clientEmail); await C.p.fill('#v3loginForm [name=password]', clientPw);
      await C.p.click('#v3loginForm [type=submit]'); await C.p.waitForFunction(() => document.body.classList.contains('role-client')); await slow(C.p);
    });
    await step('Клиент подключает Telegram-бота', async () => {
      await C.p.click('.v3-acc'); await C.p.waitForSelector('#v3tgOn');
      await C.p.evaluate(() => { window.open = u => { window.__tgurl = u; }; }); await C.p.click('#v3tgOn');
      const url = await C.p.waitForFunction(() => window.__tgurl).then(h => h.jsonValue());
      ok(/t\.me\/iomastavka_bot\?start=/.test(url), url);
      const code = url.split('start=')[1];
      // так Telegram сообщает сайту, что клиент нажал «Запустить» в боте
      const r = await fetch(B + '/api/telegram/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': SECRET }, body: JSON.stringify({ message: { chat: { id: CLIENT_CHAT }, text: '/start ' + code } }) });
      ok(r.ok); await waitMsg(/Готово, Анна Петрова/, CLIENT_CHAT);
      await C.p.evaluate(() => window.__v3open('accountView')); await C.p.waitForSelector('.v3p-notif .v3p-on:has-text("подключён")'); await slow(C.p); await shot(C.p, 'client_telegram_linked');
    });
    await step('Клиент видит свой груз', async () => { await C.p.click('.v3-nav [data-open-view=cabinetView]'); await C.p.waitForSelector('#v3cabList .v3p-ship'); await slow(C.p); await shot(C.p, 'client_cabinet'); });
    await step('Клиент считает ставку → КП сохраняется и приходит ему в Telegram', async () => {
      await C.p.click('.v3-nav [data-open-view=calculator]'); await C.p.fill('#fromCity', 'Shanghai'); await C.p.fill('#toCity', 'Москва'); await C.p.fill('#weight', '800');
      await C.p.waitForTimeout(1200); await C.p.click('.v3c-params .v3c-title'); await C.p.click('#calculate'); await C.p.waitForSelector('.v3p-saved:has-text("Telegram")'); await slow(C.p); await shot(C.p, 'client_kp_saved');
      await waitMsg(/КП-\d{6}-[A-F0-9]{4}[\s\S]*Ставка/, CLIENT_CHAT); await waitMsg(/посчитал КП/, ADMIN_CHAT);
      await C.p.evaluate(() => window.__v3open('cabinetView')); await C.p.click('#v3cabTabs [data-ctab=quotes]'); await C.p.waitForSelector('#v3cabQuotes .v3p-qrow'); await slow(C.p); await shot(C.p, 'client_my_kp');
    });
    await step('Вы меняете статус груза → клиенту приходит уведомление', async () => {
      await A.p.bringToFront(); await A.p.evaluate(() => window.__v3open('workView')); await A.p.click('#workView .cx-nav [data-tab=ships]');
      const id = await A.p.getAttribute('#v3shipsList .v3p-ship', 'data-id');
      const F = `.trk-form[data-ship="${id}"]`;
      await A.p.selectOption(F + ' [data-f=stage]', 'ru'); await A.p.fill(F + ' [data-f=nowCity]', 'Новосибирск'); await A.p.fill(F + ' [data-f=address]', 'Москва, ул. Складская, 3');
      await A.p.fill(F + ' [data-f=eventNote]', 'Отправлен поездом со станции Сиань'); await A.p.click(`[data-trksave="${id}"]`);
      await waitMsg(/В пути по России[\s\S]*Новосибирск[\s\S]*Сиань/, CLIENT_CHAT); await A.p.waitForSelector('#v3shipsList .trk-stops li.cur'); await slow(A.p); await shot(A.p, 'admin_status_changed');
    });
    await step('Вы загружаете документ → клиенту приходит уведомление', async () => {
      const f = path.join(OUT, 'Инвойс_IO-A1F3.pdf'); fs.writeFileSync(f, '%PDF-1.4 test invoice');
      await A.p.setInputFiles('#v3shipsList [data-upl]', f); await waitMsg(/Добавлен документ: Инвойс_IO-A1F3\.pdf/, CLIENT_CHAT); fs.unlinkSync(f);
    });
    await step('Клиент видит новый статус и документ', async () => {
      await C.p.bringToFront(); await C.p.evaluate(() => window.__v3open('cabinetView')); await C.p.waitForSelector('#v3cabList .v3p-status:has-text("В пути")');
      await C.p.waitForSelector('#v3cabList .trk-stops li.cur:has-text("Новосибирск")');
      await C.p.waitForSelector('#v3cabList .v3p-docs a'); await slow(C.p); await shot(C.p, 'client_status_doc');
    });
    await step('Клиент забыл пароль → ссылка приходит в Telegram → новый пароль работает', async () => {
      await C.p.click('#logoutButton'); await C.p.waitForFunction(() => document.body.classList.contains('role-guest'));
      await C.p.click('.v3-loginbtn'); await C.p.click('#v3forgotBtn'); await C.p.fill('#v3forgotForm [name=email]', clientEmail); await C.p.click('#v3forgotForm [type=submit]');
      await C.p.waitForSelector('#v3forgotOk:not(:empty)'); await slow(C.p); await shot(C.p, 'client_forgot');
      const m = await waitMsg(/#reset=/, CLIENT_CHAT); const link = m.text.match(/https?:\/\/\S+#reset=\S+/)[0];
      await C.p.goto(link); await C.p.waitForSelector('#resetView.open'); await C.p.fill('#v3resetForm [name=password]', 'новый-пароль-2026'); await C.p.click('#v3resetForm [type=submit]');
      await C.p.waitForSelector('#v3resetOk:not(:empty)'); await slow(C.p); await shot(C.p, 'client_reset_done');
      const r = await fetch(B + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: clientEmail, password: 'новый-пароль-2026' }) }); ok(r.ok, 'новый пароль не подошёл');
    });
    await step('Телефон: главная и расчёт', async () => {
      const M = await ctx('4_mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir: path.join(OUT, 'video', '4_mobile'), size: { width: 390, height: 844 } } });
      await slow(M.p); await shot(M.p, 'mobile_home'); await M.c.close();
    });
    await step('Нет ошибок JavaScript', async () => ok(!errors.length, errors.slice(0, 2).join(' | ')));
    await C.c.close(); await A.c.close();

    // ---------- «Что пришло в Telegram» ----------
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const chatHtml = (title, sub, list) => `<!doctype html><meta charset="utf-8"><style>body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial;background:#8BB4A3 linear-gradient(160deg,#9cc4b0,#6f9f8b)}header{background:#fff;padding:14px 22px;display:flex;gap:12px;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.15)}header i{width:42px;height:42px;border-radius:50%;background:#2E7D5B;display:grid;place-items:center;color:#fff;font-style:normal;font-weight:700}header b{display:block;font-size:16px}header small{color:#777}main{padding:20px 22px;display:flex;flex-direction:column;gap:10px;max-width:760px}.m{background:#fff;border-radius:14px 14px 14px 4px;padding:10px 14px 18px;white-space:pre-wrap;font-size:14.5px;line-height:1.4;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.12);max-width:600px}.m time{position:absolute;right:10px;bottom:4px;font-size:11px;color:#999}h3{margin:6px 0;color:#fff;font-size:13px;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.3)}</style><header><i>io</i><div><b>${title}</b><small>${sub}</small></div></header><main><h3>Тестовый Telegram (автопроверка) — ровно эти сообщения отправил сайт</h3>${list.map(m => `<div class="m">${esc(m.text)}<time>${m.at.toTimeString().slice(0, 5)}</time></div>`).join('')}</main>`;
    const P = await (await browser.newContext({ viewport: { width: 820, height: 900 } })).newPage();
    for (const [chat, file, title, sub] of [[ADMIN_CHAT, 'telegram_vam', 'iomastavka_bot', 'сообщения вам (администратору)'], [CLIENT_CHAT, 'telegram_klientu', 'iomastavka_bot', 'сообщения клиенту Анне Петровой']]) {
      await P.setContent(chatHtml(title, sub, msgs.filter(m => m.chat === chat))); await P.screenshot({ path: path.join(OUT, file + '.png'), fullPage: true });
    }
  } finally {
    await browser.close(); srv.proc.kill(); tgServer.close();
    const report = `Наглядная проверка iomastavka\n${new Date().toISOString()}\n\n${steps.map(s => s.join(' ')).join('\n')}\n\nИтого: ${steps.length - failed} ок, ${failed} ошибок\nСообщений в Telegram: ${msgs.length}\n\n` + msgs.map(m => `[${m.chat === ADMIN_CHAT ? 'вам' : 'клиенту'}] ${m.text}`).join('\n---\n');
    fs.writeFileSync(path.join(OUT, 'report.txt'), report); console.log(report);
    if (failed) { console.log('\nЛог сервера:\n' + srv.log()); process.exit(1); }
  }
})().catch(e => { console.error(e); process.exit(1); });
