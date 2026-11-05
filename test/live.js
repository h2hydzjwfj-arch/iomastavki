'use strict';
// Проверка живого сайта: открывается, отвечает, закрытое закрыто, видны ключевые экраны.
const fs = require('fs'); const path = require('path');
const B = String(process.env.SITE_URL || 'https://iomastavki.onrender.com').replace(/\/+$/, '');
const OUT = path.join(__dirname, '..', 'test-output'); fs.mkdirSync(OUT, { recursive: true });
const res = []; let failed = 0;
async function check(n, fn, soft) { try { const extra = await fn(); res.push('✅ ' + n + (extra ? ' — ' + extra : '')); } catch (e) { if (soft) res.push('⚠️ ' + n + ' — ' + e.message); else { failed++; res.push('❌ ' + n + ' — ' + e.message); } } }
const ok = (c, m) => { if (!c) throw new Error(m || 'нет'); };
(async () => {
  await check('Сайт просыпается и отвечает', async () => { for (let i = 0; i < 6; i++) { try { const r = await fetch(B + '/api/health'); if (r.ok) { const j = await r.json(); return 'хранилище: ' + (j.storage || 'старая версия'); } } catch {} await new Promise(r => setTimeout(r, 15000)); } throw new Error('не отвечает'); });
  await check('Хранилище постоянное (Supabase)', async () => { const j = await (await fetch(B + '/api/health')).json(); ok(j.storage === 'supabase', 'сейчас: ' + (j.storage || 'неизвестно') + ' — данные сотрутся при перезапуске'); }, true);
  await check('Главная', async () => { const r = await fetch(B + '/'); ok(r.status === 200); ok((await r.text()).includes('portal-ui.js'), 'на сайте старая версия — Render не выложил новую'); });
  await check('Закрытые разделы закрыты', async () => { for (const u of ['/api/agents', '/api/leads', '/api/rates']) ok((await fetch(B + u)).status === 401, u + ' открыт'); });
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
