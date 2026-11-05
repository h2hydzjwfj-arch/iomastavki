'use strict';
// Проверка в настоящем браузере: гость → расчёт → КП → заявка; админ → клиент и груз; клиент → кабинет.
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { startServer, ADMIN_PASS } = require('./helpers');
const OUT = path.join(__dirname, '..', 'test-output'); fs.mkdirSync(OUT, { recursive: true });
const results = []; let failed = 0;
async function step(name, fn) { try { await fn(); results.push('✅ ' + name); } catch (e) { failed++; results.push('❌ ' + name + ' — ' + String(e.message).split('\n')[0]); } }

(async () => {
  const srv = await startServer(Number(process.env.UI_PORT || 3998)); const B = srv.base;
  const browser = await chromium.launch();
  const errors = [];
  async function ctx(opts = {}) {
    const c = await browser.newContext({ viewport: { width: 1350, height: 860 }, ...opts });
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(B + '/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => /role-/.test(document.body.className));
    return { c, p };
  }
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  try {
    const { p } = await ctx();
    await step('Гость: главная и меню без закрытых разделов', async () => {
      await p.waitForSelector('.v3-hero'); await shot(p, '01_guest_home');
      if (await p.isVisible('.v3-nav [data-open-view=workView]')) throw new Error('видно «Работа»');
      if (await p.isVisible('.v3-nav [data-open-view=forwarders]')) throw new Error('видно «Экспедиторы»');
    });
    await step('Гость: расчёт ставки', async () => {
      await p.click('.v3-nav [data-open-view=calculator]');
      await p.fill('#fromCity', 'Shanghai'); await p.fill('#toCity', 'Москва'); await p.fill('#weight', '1200');
      await p.click('.v3c-chips [data-m=rail]'); await p.click('#calculate');
      await p.waitForSelector('#result .result-price:not(.muted)', { timeout: 8000 }); await shot(p, '02_guest_calc');
    });
    await step('Гость: сохранить расчёт → КП по ссылке', async () => {
      await p.click('.v3p-savebtn'); await p.waitForSelector('.v3p-saved'); await p.click('.v3p-saved [data-kpopen]');
      await p.waitForSelector('#quoteView.open .v3p-kp'); await shot(p, '03_quote');
      const link = await p.getAttribute('[data-kpcopy]', 'data-kpcopy');
      const p2 = await p.context().newPage(); await p2.goto(link); await p2.waitForSelector('#quoteView.open .v3p-kp', { timeout: 8000 }); await p2.close();
    });
    await step('Гость: ввод калькулятора не теряется после перезагрузки', async () => {
      await p.reload(); await p.waitForFunction(() => document.getElementById('fromCity').value === 'Shanghai', null, { timeout: 5000 });
    });
    await step('Гость: заявка отправляется', async () => {
      await p.evaluate(() => window.__v3open('leadView'));
      await p.fill('#v3leadForm [name=name]', 'Тест UI'); await p.fill('#v3leadForm [name=contact]', '@ui_test');
      await p.check('#v3leadForm [name=consent]'); await p.click('#v3leadForm [type=submit]');
      await p.waitForSelector('#v3leadDone:not([hidden])'); await shot(p, '04_lead_done');
    });
    await step('Гость: новости открываются', async () => { await p.evaluate(() => window.__iomaOpenView('news')); await p.waitForTimeout(1500); await shot(p, '05_news'); });

    let clientPw = '';
    const A = await ctx();
    await step('Админ: вход через форму', async () => {
      await A.p.click('.v3-loginbtn'); await A.p.fill('#v3loginForm [name=login]', 'admin'); await A.p.fill('#v3loginForm [name=password]', ADMIN_PASS);
      await A.p.click('#v3loginForm [type=submit]'); await A.p.waitForFunction(() => document.body.classList.contains('role-admin'), null, { timeout: 8000 });
    });
    await step('Админ: раздел «Работа», заявка гостя видна', async () => {
      await A.p.click('.v3-nav [data-open-view=workView]'); await A.p.waitForSelector('#v3leadsList .v3p-lead'); await shot(A.p, '06_admin_leads');
    });
    await step('Админ: создаёт клиента', async () => {
      await A.p.click('#workView [data-tab=clients]'); await A.p.fill('#v3clientForm [name=email]', 'ui@ci.test'); await A.p.fill('#v3clientForm [name=name]', 'Клиент UI');
      await A.p.click('#v3clientForm [type=submit]'); await A.p.waitForSelector('#v3clientOk code'); clientPw = await A.p.textContent('#v3clientOk code');
    });
    await step('Админ: создаёт груз', async () => {
      await A.p.click('#workView [data-tab=ships]'); await A.p.selectOption('#v3shipClient', { label: 'Клиент UI' });
      await A.p.fill('#v3shipForm [name=from]', 'Шанхай'); await A.p.fill('#v3shipForm [name=to]', 'Москва'); await A.p.fill('#v3shipForm [name=costs]', 'Фрахт; 2450; USD');
      await A.p.click('#v3shipForm [type=submit]'); await A.p.waitForSelector('#v3shipsList .v3p-ship'); await shot(A.p, '07_admin_ships');
    });
    await step('Админ: аккаунт и состояние сайта', async () => { await A.p.click('.v3-acc'); await A.p.waitForSelector('#v3accBody .v3p-notif'); await shot(A.p, '08_admin_account'); });

    const C = await ctx();
    await step('Клиент: вход', async () => {
      await C.p.click('.v3-loginbtn'); await C.p.fill('#v3loginForm [name=login]', 'ui@ci.test'); await C.p.fill('#v3loginForm [name=password]', clientPw);
      await C.p.click('#v3loginForm [type=submit]'); await C.p.waitForFunction(() => document.body.classList.contains('role-client'), null, { timeout: 8000 });
    });
    await step('Клиент: «Мои грузы»', async () => { await C.p.click('.v3-nav [data-open-view=cabinetView]'); await C.p.waitForSelector('#v3cabList .v3p-ship'); await shot(C.p, '09_client_cabinet'); });
    await step('Клиент: расчёт сохраняется как КП автоматически', async () => {
      await C.p.evaluate(() => window.__iomaOpenView('calculator')); await C.p.fill('#fromCity', 'Shanghai'); await C.p.fill('#toCity', 'Москва'); await C.p.fill('#weight', '300');
      await C.p.click('#calculate'); await C.p.waitForSelector('.v3p-saved', { timeout: 8000 }); await shot(C.p, '10_client_calc_saved');
      await C.p.evaluate(() => window.__v3open('cabinetView')); await C.p.click('#v3cabTabs [data-ctab=quotes]'); await C.p.waitForSelector('#v3cabQuotes .v3p-qrow'); await shot(C.p, '11_client_quotes');
    });
    await step('Клиент: смена пароля в аккаунте', async () => {
      await C.p.click('.v3-acc'); await C.p.fill('#v3pwForm [name=current]', clientPw); await C.p.fill('#v3pwForm [name=next]', 'ui-new-pass-1');
      await C.p.click('#v3pwForm [type=submit]'); await C.p.waitForSelector('#v3pwForm .v3p-ok:has-text("Пароль изменён")'); await shot(C.p, '12_client_account');
    });
    const M = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await step('Телефон: главная', async () => { await M.p.waitForSelector('.v3-hero'); await shot(M.p, '13_mobile_home'); });
    await step('Нет ошибок JavaScript на страницах', async () => { if (errors.length) throw new Error(errors.slice(0, 3).join(' | ')); });
  } finally {
    await browser.close(); srv.proc.kill();
    console.log('\nПроверка в браузере:\n' + results.join('\n') + `\n\nИтого: ${results.length - failed} ок, ${failed} ошибок. Скриншоты: test-output/`);
    if (failed) { console.log('\nЛог сервера:\n' + srv.log()); process.exit(1); }
  }
})().catch(e => { console.error(e); process.exit(1); });
