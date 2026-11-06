// node phonesheet.js red/N.html -> печатает JSON с координатами (css px) ключевых блоков на телефоне
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const top = el => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let opt = null, n;
    while ((n = walk.nextNode())) { if (n.textContent.trim() === 'Оптимально') { opt = n.parentElement; break; } }
    const hs = [...document.querySelectorAll('h2,h3')];
    const routes = hs.find(h => /маршрут/i.test(h.textContent));
    const track = hs.find(h => /Где мой груз/.test(h.textContent));
    return { opt: top(opt), routes: top(routes), track: top(track), height: document.documentElement.scrollHeight };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
