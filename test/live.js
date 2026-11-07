'use strict';
// Проверка живого сайта: открывается, отвечает, закрытое закрыто, видны ключевые экраны.
const fs = require('fs'); const path = require('path');
const B = String(process.env.SITE_URL || 'https://iomastavki.onrender.com').replace(/\/+$/, '');
const OUT = path.join(__dirname, '..', 'test-output'); fs.mkdirSync(OUT, { recursive: true });
const res = []; let failed = 0;
async function check(n, fn, soft) { try { const extra = await fn(); res.push('✅ ' + n + (extra ? ' — ' + extra : '')); } catch (e) { if (soft) res.push('⚠️ ' + n + ' — ' + e.message); else { failed++; res.push('❌ ' + n + ' — ' + e.message); } } }
const ok = (c, m) => { if (!c) throw new Error(m || 'нет'); };
(async () => {
  await check('Сайт просыпается и отвечает', async () => { for (let i = 0; i < 6; i++) { try { const r = await fetch(B + '/api/health'); if (r.ok) { const j = await r.json(); return 'хранилище: ' + (j.storage || 'старая версия') + (j.storageIssue ? ' (' + j.storageIssue + ')' : ''); } } catch {} await new Promise(r => setTimeout(r, 15000)); } throw new Error('не отвечает'); });
  await check('Хранилище постоянное (Supabase)', async () => { const j = await (await fetch(B + '/api/health')).json(); ok(j.storage === 'supabase', 'сейчас: ' + (j.storage || 'неизвестно') + (j.storageIssue ? ' — ' + j.storageIssue : '') + ' — данные сотрутся при перезапуске'); }, true);
  await check('Главная', async () => { const r = await fetch(B + '/'); ok(r.status === 200); ok((await r.text()).includes('portal-ui.js'), 'на сайте старая версия — Render не выложил новую'); });
  await check('Дизайн «Глина и полночь»: группы кнопок, графика без картинок транспорта', async () => { const h = await (await fetch(B + '/')).text(); ok(h.includes('night.css?v=7') && h.includes('data-sg') && h.includes('class="hx"'), 'на сайте старая главная — Render ещё не обновился'); ok(!/<svg[^>]*>[^]{0,400}IOMASTAVKA<\/text>/.test(h), 'остались старые иллюстрации'); for (const f of ['/night.css', '/night.js']) ok((await fetch(B + f)).status === 200, f); });
  await check('Бэкенд: здоровье, ИИ и бот', async () => { const r = await (await fetch(B + '/api/health')).json(); ok(r.ok, 'health'); return 'ИИ: ' + (r.ai || '—') + ', бот: ' + (r.bot || '—') + ', хранилище: ' + r.storage; });
  await check('Отдельные страницы: /raschet, /tnved, /vhod открываются, шапка закреплена', async () => { for (const u of ['/raschet', '/tnved', '/vhod']) { const r = await fetch(B + u); ok(r.status === 200, u + ' → ' + r.status); ok((await r.text()).includes('/pages.js'), u + ': нет pages.js — Render ещё не обновился'); } ok((await (await fetch(B + '/pages.css')).text()).includes('position:sticky'), 'pages.css без закреплённой шапки'); });
  await check('Факт, мои средства и ЭТрН — только администратору', async () => { const h = await (await fetch(B + '/')).text(); ok(h.includes('/fact.js') && h.includes('/crm-fact-ui.js'), 'нет fact.js / crm-fact-ui.js'); const j = await (await fetch(B + '/fact.js')).text(); ok(j.includes('IOMA_FACT'), 'старый fact.js'); ok((await fetch(B + '/api/wallet')).status === 401, '/api/wallet открыт'); ok((await fetch(B + '/api/deals/x/fact')).status === 401, '/api/deals/:id/fact открыт'); });
  await check('Расчёт контракта по рабочей таблице', async () => { const h = await (await fetch(B + '/')).text(); ok(h.includes('/contract.js'), 'нет contract.js — Render ещё не обновился'); const j = await (await fetch(B + '/contract.js')).text(); ok(j.includes('IOMA_CONTRACT') && j.includes('marginFactor'), 'старый contract.js'); ok((await fetch(B + '/api/calc')).status === 401, '/api/calc открыт'); });
  await check('Новая главная: один экран, карта маршрутов, «Услуги» и «Кейсы»', async () => { const h = await (await fetch(B + '/')).text(); for (const f of ['routes-map.js', 'home.js', 'home.css', 'ui.js', 'ui.css']) ok(h.includes(f), 'нет ' + f + ' — Render ещё не обновился'); ok(!h.includes('map-calc.js') && !h.includes('tour.js'), 'старая главная ещё на месте'); for (const u of ['/uslugi', '/kejsy']) ok((await fetch(B + u)).status === 200, u + ' не открывается'); const c = await (await fetch(B + '/api/cases')).json(); ok(c.ok && c.items.length >= 1, 'нет кейсов'); });
  await check('Расчёт ставки с маршрутом и робот-помощник', async () => { const h = await (await fetch(B + '/')).text(); for (const f of ['calc-ux.js', 'calc.css', 'robot-ui.js', 'robot.css', 'site-custom.js']) ok(h.includes(f), 'нет ' + f + ' — Render ещё не обновился'); ok(!h.includes('data-open-view="assistant"'), 'в меню остался ИИ-ассистент'); const c = await (await fetch(B + '/api/site/custom')).json(); ok(c.ok && Array.isArray(c.texts), 'нет /api/site/custom'); ok((await fetch(B + '/api/robot')).status === 401, '/api/robot открыт'); });
  await check('Закрытые разделы закрыты', async () => { for (const u of ['/api/agents', '/api/leads', '/api/rates', '/api/robot']) ok((await fetch(B + u)).status === 401, u + ' открыт'); });
  await check('Проверка ТН ВЭД открыта всем, ошибки ввода понятны', async () => { const r = await fetch(B + '/api/tnved/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '12345' }) }); ok(r.status === 400, 'код ' + r.status); ok(/10 цифр/.test((await r.json()).error || ''), 'нет понятной ошибки'); });
  await check('Справочник alta.ru читается (разметка не изменилась)', async () => { const T = require('../tnved-check'); const r = await T.check({ code: '6201400000', value: '500000', weight: '300' }, { rates: async () => ({ date: 'тест', rates: { EUR: 100 } }) }); ok(r.levels.length >= 3, 'нет дерева позиции'); ok(r.duty.parts.length === 2, 'ставка: ' + r.duty.text); ok(r.vat.length, 'нет НДС'); return r.duty.text; }, true);
  await check('Расчёт ставки работает', async () => { const j = await (await fetch(B + '/api/rates/recommend?from=Shanghai&to=' + encodeURIComponent('Москва') + '&mode=rail')).json(); ok(j.matches && j.matches.length, 'нет ставок'); ok(j.matches.every(m => !m.company), 'видны агенты'); });
  await check('Новости', async () => ok((await fetch(B + '/api/news')).status === 200), true);
  await check('Погода', async () => { const j = await (await fetch(B + '/api/weather')).json(); ok(j.temp != null); return Math.round(j.temp) + '° ' + (j.city || ''); }, true);
  await check('robots.txt и sitemap.xml', async () => { ok((await fetch(B + '/robots.txt')).ok && (await fetch(B + '/sitemap.xml')).ok); });
  try {
    const { chromium } = require('playwright'); const br = await chromium.launch(); const errs = [];
    for (const [n, o] of [['live_desktop', { viewport: { width: 1350, height: 860 } }], ['live_mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
      const c = await br.newContext(o); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
      await p.goto(B + '/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2000); await p.screenshot({ path: path.join(OUT, n + '.png') });
      if (n === 'live_desktop') { await check('Расчёт в браузере', async () => { await p.evaluate(() => window.__iomaOpenView && window.__iomaOpenView('calculator')); await p.fill('#fromCity', 'Shanghai'); await p.fill('#toCity', 'Москва'); await p.fill('#weight', '1200'); await p.click('#calculate'); await p.waitForSelector('#result .result-price', { timeout: 15000 }); await p.screenshot({ path: path.join(OUT, 'live_calc.png') }); }); }
      await c.close();
    }
    await br.close();
    await check('Нет ошибок JavaScript', async () => ok(!errs.length, errs.slice(0, 2).join(' | ')));
  } catch (e) { failed++; res.push('❌ Браузер — ' + e.message); }
  console.log('\nЖивой сайт ' + B + ':\n' + res.join('\n'));
  if (failed) process.exit(1);
})();
