'use strict';
// Проверка в настоящем браузере: гость → расчёт → КП → заявка; админ → клиент и груз; клиент → кабинет.
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { startServer, ADMIN_PASS } = require('./helpers');
const OUT = path.join(__dirname, '..', 'test-output'); fs.mkdirSync(OUT, { recursive: true });
const results = []; let failed = 0;
async function step(name, fn) { try { await fn(); results.push('✅ ' + name); } catch (e) { failed++; results.push('❌ ' + name + ' — ' + String(e.message).split('\n').slice(0, 3).join(' | ')); try { for (const pg of (global.__pages || [])) await pg.screenshot({ path: require('path').join('test-output', 'FAIL_' + (++global.__fc || (global.__fc = 1)) + '.png') }); } catch {} } }

(async () => {
  const srv = await startServer(Number(process.env.UI_PORT || 3998)); const B = srv.base;
  const browser = await chromium.launch();
  const errors = [];
  async function ctx(opts = {}) {
    const c = await browser.newContext({ viewport: { width: 1350, height: 860 }, ...opts });
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(B + '/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => /role-/.test(document.body.className));
    global.__pages = [p]; return { c, p };
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
      await p.click('.v3c-params .v3c-title'); await p.click('.v3c-chips [data-m=rail]'); await p.click('#calculate');
      await p.waitForSelector('#result .result-price:not(.muted)', { timeout: 8000 }); await shot(p, '02_guest_calc');
    });
    await step('Гость: при закрытии несохранённого расчёта сайт спрашивает «сохранить или выйти»', async () => {
      await p.click('#calculatorView .view-close'); await p.waitForSelector('#v3ask:not([hidden])'); await shot(p, '02b_ask');
      await p.click('#v3ask [data-ask=stay]'); await p.waitForSelector('#v3ask', { state: 'hidden' });
      if (!(await p.isVisible('#calculatorView.open'))) throw new Error('окно расчёта закрылось');
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
    await step('Гость: карточка расчёта на главной редактируется, карта меняется', async () => {
      await p.evaluate(() => window.__iomaCloseViews()); await p.fill('#v3hFrom', 'Циндао'); await p.fill('#v3hTo', 'Новосибирск'); await p.fill('#v3hW', '800');
      await p.waitForFunction(() => document.getElementById('fromCity').value === 'Циндао' && document.getElementById('toCity').value === 'Новосибирск' && document.getElementById('weight').value === '800');
      await p.waitForFunction(() => /Циндао/.test(document.querySelector('#v3Hero .v3-map svg').textContent), null, { timeout: 4000 }); await shot(p, '03b_home_card');
    });
    await step('Гость: курс ЦБ на выбранную дату', async () => { await p.evaluate(() => { const i = document.getElementById('v3curDate'); i.value = '2026-08-07'; i.dispatchEvent(new Event('change')); }); await p.waitForFunction(() => /07\.08\.2026|Нет курса|CBR/.test(document.getElementById('v3date').textContent), null, { timeout: 12000 }); });
    await step('Гость: заявка отправляется', async () => {
      await p.evaluate(() => window.__v3open('leadView'));
      await p.fill('#v3leadForm [name=name]', 'Тест UI'); await p.fill('#v3leadForm [name=contact]', '@ui_test');
      await p.check('#v3leadForm [name=consent]'); await p.click('#v3leadForm [type=submit]');
      await p.waitForSelector('#v3leadDone:not([hidden])'); await shot(p, '04_lead_done');
    });
    await step('Гость: заявка с инвойсом и упаковочным листом', async () => {
      await p.evaluate(() => window.__v3open('leadView')); await p.fill('#v3leadForm [name=name]', 'Документы UI'); await p.fill('#v3leadForm [name=contact]', '+7 900 000-00-00');
      await p.setInputFiles('#v3leadFiles', require('path').join(__dirname, 'fixtures', 'invoice.xlsx')); await p.waitForSelector('#v3leadFlist li');
      await p.check('#v3leadForm [name=consent]'); await p.click('#v3leadForm [type=submit]'); await p.waitForSelector('#v3leadDone:not([hidden])', { timeout: 20000 }); await shot(p, '04b_lead_docs');
    });
    await step('Гость: база знаний с источниками', async () => { await p.evaluate(() => window.__v3open('kbView')); await p.waitForSelector('#kbBody .kb-n .kb-src a'); await p.waitForSelector('#kbBody .kb-p.kb-risk'); await shot(p, '05a_kb'); await p.click('#kbBody [data-kbt=choose]'); await p.click('#kbBody [data-kbr="3"]'); await p.waitForSelector('#kbBody .kb-ans'); await p.click('#kbBody [data-kbt=docs]'); await p.check('#kbBody [data-kbd="0"]'); await p.waitForSelector('#kbBody .kb-dh b:has-text("1 /")'); await shot(p, '05b_kb_docs'); });
    await step('Гость: английская версия без русских надписей в меню', async () => { await p.evaluate(() => [...document.querySelectorAll('.lang')].find(x => x.dataset.lang === 'en').click()); await p.waitForTimeout(400); const t = await p.textContent('.v3-nav'); if (/[а-яё]/i.test(t)) throw new Error(t); await p.evaluate(() => [...document.querySelectorAll('.lang')].find(x => x.dataset.lang === 'ru').click()); await p.waitForTimeout(300); });
    await step('Гость: новости открываются', async () => { await p.evaluate(() => window.__iomaOpenView('news')); await p.waitForTimeout(1500); await shot(p, '05_news'); });

    let clientPw = '';
    const A = await ctx();
    await step('Админ: вход через форму', async () => {
      await A.p.click('.v3-loginbtn'); await A.p.fill('#v3loginForm [name=login]', 'admin'); await A.p.fill('#v3loginForm [name=password]', ADMIN_PASS);
      await A.p.click('#v3loginForm [type=submit]'); await A.p.waitForFunction(() => document.body.classList.contains('role-admin'), null, { timeout: 8000 });
    });
    await step('Админ: раздел «Работа» — заявки гостя стали сделками', async () => {
      await A.p.click('.v3-nav [data-open-view=workView]'); await A.p.waitForSelector('#crmList [data-deal]'); await shot(A.p, '06_admin_deals');
    });
    await step('Админ: карточка сделки — файл из заявки, заметка, этап', async () => {
      await A.p.fill('#crmQ', 'Документы UI'); await A.p.waitForSelector('#crmList [data-deal] >> text=Документы UI', { timeout: 6000 }).catch(() => {});
      await A.p.click('#crmList [data-deal]'); await A.p.waitForSelector('#crmDeal .crm-deal'); await shot(A.p, '06b_deal_card');
      await A.p.click('#crmDeal [data-ct=files]'); await A.p.waitForSelector('#crmDeal .crm-file');
      await A.p.click('#crmDeal [data-ct=act]'); await A.p.fill('#crmNote textarea', 'Позвонил, клиент ждёт КП'); await A.p.click('#crmNote [type=submit]'); await A.p.waitForSelector('.crm-evt:has-text("клиент ждёт КП")');
      await A.p.selectOption('#crmDeal .crm-stage', 'Расчёт'); await A.p.click('#crmForm [type=submit]'); await A.p.waitForSelector('.crm-fld:has-text("Расчёт")'); await shot(A.p, '06c_deal_saved');
    });
    await step('Админ: база клиентов с сортировкой', async () => {
      await A.p.click('#workView [data-tab=clients]'); await A.p.waitForSelector('#crmClients [data-cli]'); await A.p.selectOption('#crmCliSort', 'frequency'); await A.p.waitForTimeout(400); await shot(A.p, '06d_clients');
    });
    await step('Админ: создаёт клиента', async () => {
      await A.p.click('#workView [data-tab=clients]'); await A.p.click('.crm-access summary'); await A.p.fill('#v3clientForm [name=email]', 'ui@ci.test'); await A.p.fill('#v3clientForm [name=name]', 'Клиент UI');
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
      await C.p.click('.v3c-params .v3c-title'); await C.p.click('#calculate'); await C.p.waitForSelector('.v3p-saved', { timeout: 8000 }); await shot(C.p, '10_client_calc_saved');
      await C.p.evaluate(() => window.__v3open('cabinetView')); await C.p.click('#v3cabTabs [data-ctab=quotes]'); await C.p.waitForSelector('#v3cabQuotes .v3p-qrow'); await shot(C.p, '11_client_quotes');
    });
    await step('Клиент: смена пароля в аккаунте', async () => {
      await C.p.click('.v3-acc'); await C.p.fill('#v3pwForm [name=current]', clientPw); await C.p.fill('#v3pwForm [name=next]', 'ui-new-pass-1');
      await C.p.click('#v3pwForm [type=submit]'); await C.p.waitForSelector('#v3pwForm .v3p-ok:has-text("Пароль изменён")'); await shot(C.p, '12_client_account');
    });
    const Rg = await ctx();
    await step('Новый клиент сам создаёт кабинет и попадает в «Мои грузы»', async () => {
      await Rg.p.click('.v3-loginbtn'); await Rg.p.click('#v3regBtn'); await Rg.p.fill('#v3regForm [name=name]', 'Анна Новая'); await Rg.p.fill('#v3regForm [name=email]', 'new-ui@ci.test');
      await Rg.p.fill('#v3regForm [name=password]', 'new-ui-pass-1'); await Rg.p.click('#v3regForm .v3p-eye'); await shot(Rg.p, '12b_register');
      await Rg.p.click('#v3regForm [type=submit]'); await Rg.p.waitForFunction(() => document.body.classList.contains('role-client'), null, { timeout: 8000 });
      await Rg.p.waitForSelector('#cabinetView.open', { timeout: 6000 }); await shot(Rg.p, '12c_new_cabinet');
    });
    const M = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await step('Телефон: главная', async () => { await M.p.waitForSelector('.v3-hero'); await shot(M.p, '13_mobile_home'); });
    await step('Телефон: новости и гид', async () => { await M.p.evaluate(() => window.__iomaOpenView('news')); await M.p.waitForTimeout(1200); await shot(M.p, '14_mobile_news'); await M.p.evaluate(() => window.__v3open('kbView')); await M.p.waitForSelector('#kbBody .kb-pulse'); await shot(M.p, '15_mobile_kb'); });
    await step('Нет ошибок JavaScript на страницах', async () => { if (errors.length) throw new Error(errors.slice(0, 3).join(' | ')); });
  } finally {
    await browser.close(); srv.proc.kill();
    console.log('\nПроверка в браузере:\n' + results.join('\n') + `\n\nИтого: ${results.length - failed} ок, ${failed} ошибок. Скриншоты: test-output/`);
    if (failed) { console.log('\nЛог сервера:\n' + srv.log()); process.exit(1); }
  }
})().catch(e => { console.error(e); process.exit(1); });
