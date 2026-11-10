'use strict';
// Проверка в настоящем браузере: гость → расчёт → КП → заявка; админ → клиент и груз; клиент → кабинет.
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { startServer, ADMIN_PASS, navTo } = require('./helpers');
const OUT = path.join(__dirname, '..', 'test-output'); fs.mkdirSync(OUT, { recursive: true });
const results = []; let failed = 0;
async function step(name, fn) { try { await fn(); results.push('✅ ' + name); } catch (e) { failed++; results.push('❌ ' + name + ' — ' + String(e.message).split('\n').slice(0, 3).join(' | ')); try { for (const pg of (global.__pages || [])) await pg.screenshot({ path: require('path').join('test-output', 'FAIL_' + (++global.__fc || (global.__fc = 1)) + '.png') }); } catch {} } }

(async () => {
  const srv = await startServer(Number(process.env.UI_PORT || 3998)); const B = srv.base;
  const browser = await chromium.launch();
  const errors = [];
  async function ctx(opts = {}) {
    const c = await browser.newContext({ viewport: { width: 1350, height: 860 }, ...opts });
    const p = await c.newPage(); const cdp = await c.newCDPSession(p); await cdp.send('Debugger.enable'); cdp.on('Debugger.scriptFailedToParse', e => { if (/Invalid or unexpected token/i.test(e.errorMessage || '')) errors.push((e.errorMessage || 'Script parse failed') + ' [script] ' + (e.url || 'inline') + ':' + ((e.startLine || 0) + 1) + ':' + ((e.startColumn || 0) + 1)); }); p.on('pageerror', e => errors.push((e.stack || ((e.name || 'Error') + ': ' + e.message)) + ' [pageerror]'));
    await p.goto(B + '/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => /role-/.test(document.body.className));
    global.__pages = [p]; return { c, p };
  }
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  try {
    const { p } = await ctx();
    await step('Гость: главная и меню без закрытых разделов', async () => {
      await p.waitForSelector('.hx'); await shot(p, '01_guest_home');
      if (await p.isVisible('.v3-nav [data-open-view=workView]')) throw new Error('видно «Работа»');
      if (await p.isVisible('.v3-nav [data-open-view=forwarders]')) throw new Error('видно «Экспедиторы»');
    });
    await step('Гость: расчёт ставки', async () => {
      await navTo(p, 'calculator');
      await p.fill('#fromCity', 'Shanghai'); await p.fill('#toCity', 'Москва'); await p.fill('#weight', '1200');
      await p.waitForTimeout(1200); await p.click('.v3c-params .v3c-title'); await p.click('.v3c-chips [data-m=rail]'); await p.click('#calculate');
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
    await step('Гость: главная — один экран; карта по шагам: откуда → куда → транспорт → путешествие → расчёт', async () => {
      await p.evaluate(() => window.__iomaCloseViews()); await p.waitForSelector('#hxMap .jm-chips [data-from="gz"]');
      const h = await p.evaluate(() => { const r = document.querySelector('.hx').getBoundingClientRect(); return { top: r.top, h: r.height, vh: innerHeight }; });
      if (Math.abs(h.top + h.h - h.vh) > 2) throw new Error('первый экран не до низа окна: ' + JSON.stringify(h));
      await p.click('.hx-pick [data-hx="cargo"]'); await p.waitForSelector('.hx-card.on[data-hxc="cargo"]');
      await p.click('#hxMap .jm-chips [data-from="gz"]'); await p.click('#hxMap .jm-chips [data-to="spb"]');
      await p.waitForSelector('#hxMap .jm-m.best'); const modes = await p.textContent('#hxMap .jm-panel'); if (!/Рекомендуем/.test(modes) || !/Москв/.test(modes)) throw new Error('выбор транспорта: ' + modes.slice(0, 200));
      await shot(p, '03b_home_map'); await p.click('#hxMap [data-jm="rail"]'); await p.waitForSelector('#hxMap .jm-fly .jm-hud b'); await shot(p, '03b2_home_journey');
      await p.click('#hxMap .jm-skip'); await p.waitForSelector('#hxMap .jm-sum');
      const sum = await p.textContent('#hxMap .jm-sum'); if (!/Забайкальск/.test(sum) || !/км/.test(sum)) throw new Error('итог маршрута: ' + sum.slice(0, 200));
      await p.click('#hxMap .jm-calc'); await p.waitForSelector('#calculatorView.open');
      await p.waitForFunction(() => /Гуанчжоу/.test(document.getElementById('fromCity').value) && /Санкт-Петербург/.test(document.getElementById('toCity').value), null, { timeout: 5000 });
      await p.evaluate(() => window.__iomaCloseViews());
      await p.hover('.hx-num'); await p.waitForSelector('#hxCallActs:not([hidden]) .hx-i-tg');
    });
    await step('Гость: глобус — город можно написать; авто Пекин → Нижний Новгород по этапам через Забайкальск и Москву', async () => {
      await p.click('#hxMap .jm-reset'); await p.fill('#hxMap .jm-in[data-side=from]', 'Пек'); await p.waitForSelector('#hxMap .jm-sug:not([hidden]) [data-k="bj"]'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.querySelector('#hxMap .jm-in[data-side=from]').value === 'Пекин');
      await p.fill('#hxMap .jm-in[data-side=to]', 'нижн'); await p.keyboard.press('Enter'); await p.waitForSelector('#hxMap [data-jm="road"]');
      const drawn = await p.evaluate(() => { const c = document.querySelector('#hxMap .jm-cv'), d = c.getContext('2d').getImageData(c.width / 2 - 20, c.height / 2 - 20, 40, 40).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
      if (drawn < 100) throw new Error('глобус не нарисован');
      await p.click('#hxMap [data-jm="road"]'); await p.waitForSelector('#hxMap .jm-cap b'); await shot(p, '03b3_home_globe_story');
      const tl = await p.textContent('#hxMap .jm-tl'); if (!/Маньчжурия — Забайкальск/.test(tl) || !/Москва → Нижний Новгород/.test(tl)) throw new Error('этапы пути: ' + tl.slice(0, 300));
      await p.click('#hxMap .jm-skip'); await p.waitForSelector('#hxMap .jm-sum'); await p.click('#hxMap .jm-reset');
    });
    await step('Гость: «Услуги» и «Кейсы» — отдельные страницы, кейс открывается по клику', async () => {
      await p.goto(B + '/uslugi'); await p.waitForSelector('#servicesView.open .sv-c');
      await p.goto(B + '/kejsy'); await p.waitForSelector('#casesView.open [data-case]'); await p.click('[data-case]'); await p.waitForSelector('.cx-ov .cs-m');
      await shot(p, '03c_case'); await p.click('.cx-ov .cx-x'); await p.goto(B + '/'); await p.waitForFunction(() => /role-/.test(document.body.className));
    });
    await step('Гость: инструменты только для сотрудников — в меню их нет, по адресу — приглашение войти', async () => {
      await p.goto(B + '/vlezet'); await p.waitForSelector('#fitView.open .tl-login'); await p.goto(B + '/');
      if (await p.isVisible('.sg-menu [data-open-view="fitView"]')) throw new Error('гость видит инструменты в меню');
    });
    await step('Гость: язык одной кнопкой — весь первый экран на английском', async () => {
      await p.click('.lx-btn'); await p.click('.lx-menu [data-lang="en"]'); await p.waitForFunction(() => /We buy in China/.test(document.querySelector('.hx-h1').textContent));
      await p.waitForFunction(() => { const e = document.querySelector('.jm-steps'); return e && /From/.test(e.textContent) && /Transport/.test(e.textContent); });
      await p.click('.lx-btn'); await p.click('.lx-menu [data-lang="ru"]'); await p.waitForFunction(() => /Купим в Китае/.test(document.querySelector('.hx-h1').textContent));
    });
    await step('Окно закрывается только крестиком — ни протяжка мышью, ни щелчок мимо его не закрывают', async () => {
      await p.evaluate(() => window.__v3open('leadView'));
      const box = await (await p.$('#leadView .v3p-form')).boundingBox();
      await p.mouse.move(box.x + 30, box.y + 30); await p.mouse.down(); await p.mouse.move(8, box.y + 30); await p.mouse.up(); await p.waitForTimeout(200);
      if (!(await p.evaluate(() => document.getElementById('leadView').classList.contains('open')))) throw new Error('окно закрылось');
      await p.mouse.click(8, 300); await p.waitForTimeout(200);
      if (!(await p.evaluate(() => document.getElementById('leadView').classList.contains('open')))) throw new Error('щелчок мимо закрыл окно — закрывать можно только крестиком');
      await p.click('#leadView .view-close'); await p.waitForFunction(() => !document.getElementById('leadView').classList.contains('open'));
    });
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
    await step('Гость: немецкий, французский и турецкий — главная, меню и гид без русских надписей', async () => {
      const want = { de: 'Wir kaufen in China', fr: 'Nous achetons en Chine', tr: 'Çin’de satın alırız' };
      for (const l of ['de', 'fr', 'tr']) {
        await p.evaluate(x => [...document.querySelectorAll('.lang')].find(b => b.dataset.lang === x).click(), l); await p.waitForTimeout(500);
        const nav = await p.textContent('.v3-nav'); if (/[а-яё]/i.test(nav)) throw new Error(l + ' меню: ' + nav);
        const home = await p.evaluate(() => document.getElementById('homeView').textContent); if (!home.includes(want[l])) throw new Error(l + ' главная: ' + home.slice(0, 300));
        await p.evaluate(() => window.__v3open('kbView')); await p.waitForTimeout(500);
        const kb = await p.evaluate(() => document.getElementById('kbBody').innerText); const ru = (kb.match(/[А-Яа-яЁё][^\n]{0,40}/) || [])[0]; if (ru) throw new Error(l + ' гид: ' + ru);
      }
      await shot(p, '05c_lang_tr');
      await p.evaluate(() => [...document.querySelectorAll('.lang')].find(x => x.dataset.lang === 'ru').click()); await p.waitForTimeout(300);
    });
    await step('Гость: новости открываются', async () => { await p.evaluate(() => window.__iomaOpenView('news')); await p.waitForTimeout(1500); await shot(p, '05_news'); });

    let clientPw = '';
    const A = await ctx();
    await step('Админ: вход через форму', async () => {
      await A.p.click('.v3-loginbtn'); await A.p.fill('#v3loginForm [name=login]', 'admin'); await A.p.fill('#v3loginForm [name=password]', ADMIN_PASS);
      await A.p.click('#v3loginForm [type=submit]'); await A.p.waitForFunction(() => document.body.classList.contains('role-admin'), null, { timeout: 8000 });
    });
    await step('Админ: раздел «Работа» — заявки гостя стали сделками', async () => {
      await navTo(A.p, 'workView'); await A.p.waitForSelector('#crmInbox [data-x=open]'); await shot(A.p, '06_admin_inbox');
    });
    await step('Админ: карточка сделки — файл из заявки, заметка, этап', async () => {
      await A.p.fill('#crmInbox [data-x=q]', 'Документы UI'); await A.p.waitForSelector('#crmInbox [data-x=open]:has-text("Документы UI")', { timeout: 8000 });
      await A.p.click('#crmInbox [data-x=open]:has-text("Документы UI")'); await A.p.waitForSelector('#crmDeal .cx-deal'); await shot(A.p, '06b_deal_card');
      await A.p.click('#crmDeal [data-t=files]'); await A.p.waitForSelector('#crmDeal .cx-fi');
      await A.p.click('#crmDeal [data-t=act]'); await A.p.fill('#crmDeal .cx-add [data-a=text]', 'Позвонил, клиент ждёт КП'); await A.p.click('#crmDeal .cx-add [type=submit]'); await A.p.waitForSelector('#crmDeal .cx-act:has-text("клиент ждёт КП")');
      await A.p.selectOption('#crmDeal .cx-stagesel', 'Расчёт'); await A.p.waitForSelector('#crmDeal .cx-hist:has-text("Расчёт")'); await shot(A.p, '06c_deal_saved');
    });
    await step('Админ: задачи, калькулятор ВЭД и коды ТН ВЭД', async () => {
      await A.p.click('#workView .cx-nav [data-tab=tasks]'); await A.p.waitForSelector('#cxTasks .cx-search', { timeout: 8000 });
      await A.p.click('#workView .cx-nav [data-tab=ved]'); await A.p.click('#cxVed [data-c=create][data-t=our_contract]'); await A.p.waitForSelector('#cxVed .cv-layout');
      await A.p.fill('#cxVed [data-k=invoice_amount]', '10000'); await A.p.waitForFunction(() => { const b = document.querySelector('#cxVed .cv-total b'); return b && /[1-9]/.test(b.textContent); }, null, { timeout: 6000 }); await shot(A.p, '06e_ved_calc');
      await A.p.waitForSelector('#cxVed [data-v-edit]');
      if (await A.p.isVisible('#cxVed [data-vs]')) throw new Error('постоянные параметры открыты для редактирования без карандаша');
      await A.p.click('#cxVed [data-v-edit]'); await A.p.waitForSelector('#cxVed [data-vs]:not([hidden])');
      await A.p.click('#cxVed [data-v-cancel]'); await A.p.waitForFunction(() => document.querySelector('#cxVed [data-vs]') && document.querySelector('#cxVed [data-vs]').hidden);
      // расчёт контракта по рабочей таблице: условия, итог вверх до юаня, текст КП без маржи
      await A.p.selectOption('#cxVed [data-d=payment]', 'bank'); await A.p.waitForFunction(() => /по внутреннему курсу банка/.test(document.querySelector('#cxVed [data-r=result]').textContent), null, { timeout: 6000 });
      await A.p.click('#cxVed [data-c=kp]'); await A.p.waitForSelector('.cx-modal .kp'); const kp = await A.p.textContent('.cx-modal .kp');
      if (!/Стоимость контракта/.test(kp) || !/по курсу ЦБ/.test(kp) || !/В стоимость включено/i.test(kp) || /Маржа|налог/i.test(kp)) throw new Error('КП: ' + kp.slice(0, 200));
      await shot(A.p, '06e2_kp'); await A.p.keyboard.press('Escape');
      await A.p.click('#workView .cx-nav [data-tab=tnved]'); await A.p.waitForSelector('#cxTnved [data-tq]'); await shot(A.p, '06f_tnved');
      // ставки агентов в сделке: ориентир по прайсу и окно запроса
      await A.p.click('#workView .cx-nav [data-tab=inbox]'); await A.p.click('#crmInbox [data-x=open]:has-text("Документы UI")'); await A.p.waitForSelector('#crmDeal .cx-deal');
      await A.p.click('#crmDeal [data-t=rates]'); await A.p.waitForSelector('#crmDeal [data-r=ask]'); await A.p.click('#crmDeal [data-r=ask]'); await A.p.waitForSelector('.cx-asks .cx-ag'); await shot(A.p, '06g_rates_ask'); await A.p.keyboard.press('Escape');
      await A.p.click('#crmDeal [data-r=base]'); await A.p.waitForSelector('.cx-ov [data-add]');
      await A.p.click('.cx-ov [data-add]'); await A.p.waitForSelector('.cx-ov .cx-modal [data-k=company]');
      const addModal = A.p.locator('.cx-ov').last();
      await addModal.locator('[data-k=company]').fill('IOMA UI Test Agent'); await addModal.locator('[data-k=contact]').fill('Test Contact');
      await addModal.locator('[data-k=email]').fill('ui-agent@ioma-test.example'); await addModal.locator('[data-go]').click();
      await A.p.waitForSelector('.cx-ov .cx-agents .cx-tr:has-text("IOMA UI Test Agent")');
      const agentRow = A.p.locator('.cx-ov .cx-agents .cx-tr').filter({ hasText: 'IOMA UI Test Agent' }).last();
      await agentRow.locator('[data-edit]').click(); const editModal = A.p.locator('.cx-ov').last();
      await editModal.locator('[data-k=contact]').fill('Edited Contact'); await editModal.locator('[data-go]').click();
      await A.p.waitForSelector('.cx-ov .cx-agents .cx-tr:has-text("Edited Contact")'); await A.p.keyboard.press('Escape');
    });
    await step('Админ: база клиентов с сортировкой', async () => {
      await A.p.click('#workView .cx-nav [data-tab=clients]'); await A.p.waitForSelector('#crmClients [data-cli]'); await A.p.selectOption('#crmCliSort', 'frequency'); await A.p.waitForTimeout(400); await shot(A.p, '06d_clients');
    });
    await step('Админ: создаёт клиента', async () => {
      await A.p.click('#workView .cx-nav [data-tab=clients]'); await A.p.click('.crm-access summary'); await A.p.fill('#v3clientForm [name=email]', 'ui@ci.test'); await A.p.fill('#v3clientForm [name=name]', 'Клиент UI');
      await A.p.click('#v3clientForm [type=submit]'); await A.p.waitForSelector('#v3clientOk code'); clientPw = await A.p.textContent('#v3clientOk code');
    });
    await step('Админ: создаёт груз', async () => {
      await A.p.click('#workView .cx-nav [data-tab=ships]'); await A.p.click('#v3shipNew > summary'); await A.p.selectOption('#v3shipClient', { label: 'Клиент UI' });
      await A.p.fill('#v3shipForm [name=from]', 'Шанхай'); await A.p.fill('#v3shipForm [name=to]', 'Москва'); await A.p.fill('#v3shipForm [name=costs]', 'Фрахт; 2450; USD');
      await A.p.click('#v3shipForm [type=submit]'); await A.p.waitForSelector('#v3shipsList .v3p-ship'); await shot(A.p, '07_admin_ships');
    });
    await step('Админ: этап груза на полосе — склад, граница, город по России', async () => {
      const id = await A.p.getAttribute('#v3shipsList .v3p-ship', 'data-id'); const F = `.trk-form[data-ship="${id}"]`;
      await A.p.click(`#v3shipsList [data-setstage="border"][data-ship="${id}"]`); await A.p.fill(F + ' [data-f=crossing]', 'Забайкальск');
      await A.p.click(`[data-trksave="${id}"]`); await A.p.waitForSelector('#v3shipsList .trk-stops li.cur:has-text("Забайкальск")');
      await A.p.selectOption(F + ' [data-f=stage]', 'ru'); await A.p.fill(F + ' [data-f=nowCity]', 'Новосибирск'); await A.p.click(`[data-trksave="${id}"]`);
      await A.p.waitForSelector('#v3shipsList .trk-stops li.cur:has-text("Новосибирск")'); await shot(A.p, '07b_admin_track');
    });
    await step('Админ: журнал — все расчёты и заявки отдельными строками', async () => {
      await A.p.click('#workView .cx-nav [data-tab=settings]'); await A.p.click('#cxSetBar [data-sub=journal]'); await A.p.waitForSelector('#jrnBox table.jrn tbody tr', { timeout: 8000 });
      const types = await A.p.$$eval('#jrnBox td.ty', els => els.map(e => e.textContent)); if (!types.some(t => /Расчёт/.test(t)) || !types.some(t => /Заявка/.test(t))) throw new Error('в журнале нет расчётов или заявок: ' + types.slice(0, 8).join(', '));
      await shot(A.p, '07c_admin_journal');
    });
    await step('Админ: робот-помощник — правка текста сайта видна гостю и отменяется', async () => {
      await A.p.waitForSelector('.rb-btn:not([hidden])'); await A.p.click('.rb-btn'); await A.p.waitForSelector('.rb-panel:not([hidden])');
      await A.p.fill('.rb-in textarea', 'Замени «Купим в Китае.» на «Найдём и купим в Китае.»'); await A.p.click('.rb-send');
      await A.p.waitForSelector('.rb-card[data-kind=text] [data-go]', { timeout: 8000 }); await A.p.click('.rb-card[data-kind=text] [data-go]'); await A.p.waitForSelector('.rb-card[data-kind=text].done', { timeout: 8000 }); await shot(A.p, '08b_admin_robot');
      await p.goto(B + '/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => /Найдём и купим в Китае/.test(document.querySelector('.hx-h1').innerText), null, { timeout: 8000 });
      if (await p.isVisible('.rb-btn')) throw new Error('гость видит робота');
      const t = await A.p.evaluate(() => fetch('/api/robot').then(r => r.json())); for (const x of t.texts) await A.p.evaluate(id => fetch('/api/robot/texts/' + id, { method: 'DELETE' }), x.id);
      await A.p.click('.rb-x');
    });
    await step('Админ: инструменты — влезет ли груз, объём, сумма прописью, без прокрутки страницы', async () => {
      const p = A.p;
      await p.goto(B + '/vlezet'); await p.waitForSelector('#fitView.open .tl-go');
      await p.fill('#fitView [data-k="l"]', '300'); await p.fill('#fitView [data-k="w"]', '200'); await p.fill('#fitView [data-k="h"]', '275'); await p.fill('#fitView [data-k="kg"]', '5000'); await p.fill('#fitView [data-k="q"]', '1');
      await p.click('#fitView .tl-go'); await p.waitForSelector('#fitView .tl-verdict');
      const fit = await p.textContent('#fitView .tl-out'); if (!/Open Top|Flat Rack/.test(fit) || !/Мега|мега/.test(fit)) throw new Error('влезет ли: ' + fit.slice(0, 200));
      await shot(p, '03d_fit');
      await p.goto(B + '/propis'); await p.waitForSelector('#propisView .tl-res-row'); await p.fill('#propisView [data-p="sum"]', '1000'); await p.selectOption('#propisView [data-p="c"]', 'gen');
      await p.waitForFunction(() => /одной тысячи рублей/i.test(document.querySelector('#propisView .tl-out').textContent));
      await p.goto(B + '/obem'); await p.waitForSelector('#volumeView .tl-big');
      const sc = await p.evaluate(() => document.scrollingElement.scrollHeight - innerHeight); if (sc > 4) throw new Error('страница «Объём груза» прокручивается на ' + sc + ' px');
      await p.goto(B + '/');
      for (const id of ['trackView', 'terminalView', 'phoneView']) { await p.evaluate(() => window.__iomaCloseViews()); await p.click('.sg-btn >> text=Инструменты ВЭД').catch(() => {}); await p.evaluate(v => document.querySelector('.sg-menu [data-open-view="' + v + '"]').click(), id); await p.waitForSelector('#' + id + '.open .tl-go'); }
      await p.evaluate(() => window.__iomaCloseViews());
    });
    await step('Админ: трекинг B/L и вагона, подробный гид ЭТРН', async () => {
      const p = A.p;
      await p.evaluate(() => window.__v3open('trackView')); await p.waitForSelector('#trackView .tl-go');
      await p.click('#trackView [data-t=bl]'); await p.selectOption('#trackView [data-k=line]', 'maersk');
      await p.fill('#trackView [data-k=no]', 'MAEU1234567'); await p.click('#trackView .tl-go');
      await p.waitForSelector('#trackView [data-provider-url]'); if (!/Maersk/.test(await p.textContent('#trackView .tl-out'))) throw new Error('B/L не выбрал линию Maersk');
      await p.click('#trackView [data-t=wagon]'); await p.fill('#trackView [data-k=no]', '12345678'); await p.click('#trackView .tl-go');
      await p.waitForFunction(() => document.querySelectorAll('#trackView [data-provider-url]').length === 2);
      await p.evaluate(() => window.__v3open('etrnView')); await p.waitForSelector('#etrnView .et-card');
      await p.click('#etrnView [data-et-tab=t12]'); const et = await p.textContent('#etrnRoot');
      if (!/Титул 1/.test(et) || !/Титул 2/.test(et) || !/QR-код/.test(et)) throw new Error('в гиде ЭТРН отсутствует алгоритм титулов 1–2');
      await shot(p, '08c_etrn_guide');
    });
    await step('Админ: меню аккаунта — состояние сайта, профиль, меню закрывается после выбора', async () => {
      await A.p.click('.v3-acc'); await A.p.waitForSelector('.am-menu:not([hidden]) [data-am=site]'); await shot(A.p, '08a_admin_menu');
      await A.p.click('.am-menu [data-am=site]'); await A.p.waitForSelector('#v3accBody .v3p-notif'); if (await A.p.isVisible('.am-menu')) throw new Error('меню не закрылось'); await shot(A.p, '08_admin_account');
      await A.p.click('.v3-acc'); await A.p.click('.am-menu [data-am=profile]'); await A.p.waitForSelector('.am-modal [data-f=pw]'); await A.p.click('.am-modal .cx-x'); await A.p.waitForSelector('.am-modal', { state: 'detached' });
    });

    const C = await ctx();
    await step('Клиент: вход', async () => {
      await C.p.click('.v3-loginbtn'); await C.p.fill('#v3loginForm [name=login]', 'ui@ci.test'); await C.p.fill('#v3loginForm [name=password]', clientPw);
      await C.p.click('#v3loginForm [type=submit]'); await C.p.waitForFunction(() => document.body.classList.contains('role-client'), null, { timeout: 8000 });
    });
    await step('Клиент: «Мои грузы»', async () => { await navTo(C.p, 'cabinetView'); await C.p.waitForSelector('#v3cabList .v3p-ship'); await shot(C.p, '09_client_cabinet'); });
    await step('Клиент: расчёт сохраняется как КП автоматически', async () => {
      await C.p.evaluate(() => window.__iomaOpenView('calculator')); await C.p.fill('#fromCity', 'Shanghai'); await C.p.fill('#toCity', 'Москва'); await C.p.fill('#weight', '300');
      await C.p.waitForTimeout(1200); await C.p.click('.v3c-params .v3c-title'); await C.p.click('#calculate'); await C.p.waitForSelector('.v3p-saved', { timeout: 8000 }); await shot(C.p, '10_client_calc_saved');
      await C.p.evaluate(() => window.__v3open('cabinetView')); await C.p.click('#v3cabTabs [data-ctab=quotes]'); await C.p.waitForSelector('#v3cabQuotes .v3p-qrow'); await shot(C.p, '11_client_quotes');
    });
    await step('Клиент: смена пароля в аккаунте', async () => {
      await C.p.click('.v3-acc'); await C.p.click('.am-menu [data-am=profile]'); await C.p.waitForSelector('.am-modal [data-f=prof] [name=name]');
      await C.p.click('.am-modal .am-pw summary'); await C.p.fill('.am-modal [data-f=pw] [name=current]', clientPw); await C.p.fill('.am-modal [data-f=pw] [name=next]', 'ui-new-pass-1');
      await C.p.click('.am-modal [data-f=pw] [type=submit]'); await C.p.waitForSelector('.am-modal .am-ok:has-text("Пароль изменён")'); await shot(C.p, '12_client_account');
      await C.p.click('.am-modal .cx-x');
    });
    const Rg = await ctx();
    await step('Новый клиент сам создаёт кабинет и попадает в «Мои грузы»', async () => {
      await Rg.p.click('.v3-loginbtn'); await Rg.p.click('#v3regBtn'); await Rg.p.fill('#v3regForm [name=name]', 'Анна Новая'); await Rg.p.fill('#v3regForm [name=email]', 'new-ui@ci.test');
      await Rg.p.fill('#v3regForm [name=password]', 'new-ui-pass-1'); await Rg.p.click('#v3regForm .v3p-eye'); await shot(Rg.p, '12b_register');
      await Rg.p.click('#v3regForm [type=submit]'); await Rg.p.waitForFunction(() => document.body.classList.contains('role-client'), null, { timeout: 8000 });
      await Rg.p.waitForSelector('#cabinetView.open', { timeout: 6000 }); await shot(Rg.p, '12c_new_cabinet');
    });
    const M = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await step('Телефон: главная', async () => { await M.p.waitForSelector('.hx'); await shot(M.p, '13_mobile_home'); });
    await step('Телефон: новости и гид', async () => { await M.p.evaluate(() => window.__iomaOpenView('news')); await M.p.waitForTimeout(1200); await shot(M.p, '14_mobile_news'); await M.p.evaluate(() => window.__v3open('kbView')); await M.p.waitForSelector('#kbBody .kb-pulse'); await shot(M.p, '15_mobile_kb'); });
    await step('Нет ошибок JavaScript на страницах', async () => { if (errors.length) throw new Error(errors.slice(0, 3).join(' | ')); });
  } finally {
    await browser.close(); srv.proc.kill();
    console.log('\nПроверка в браузере:\n' + results.join('\n') + `\n\nИтого: ${results.length - failed} ок, ${failed} ошибок. Скриншоты: test-output/`);
    if (failed) { console.log('\nЛог сервера:\n' + srv.log()); process.exit(1); }
  }
})().catch(e => { console.error(e); process.exit(1); });
