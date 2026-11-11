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
    for (const f of ['/app.js', '/styles.css', '/theme-v3.css', '/night.css', '/night.js', '/theme-v3.js', '/portal-ui.js', '/palettes.css', '/routes-kb.js', '/i18n-v3.js', '/kb.js', '/v4.css', '/geo-asia.js', '/map-calc.js', '/track.js', '/rates-dyn.js', '/tour.js', '/journal-ui.js', '/ved.js', '/crm.css', '/crm-kit.js', '/crm-ui.js', '/crm-calc-ui.js', '/crm-tasks-ui.js', '/crm-clients-ui.js', '/crm-sys-ui.js', '/tnved-ui.js', '/crm-rates-ui.js', '/fact.js', '/crm-fact-ui.js', '/ui.js', '/ui.css', '/home.js', '/home.css', '/routes-map.js', '/calc-ux.js', '/calc.css', '/robot-ui.js', '/robot.css', '/site-custom.js', '/account-menu.js', '/crm-format.js'])
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
    await check('Incoterms: FOB, EXW/FCA и DAP не смешиваются', async () => {
      const url = '/api/rates/recommend?from=Shanghai&to=' + encodeURIComponent('Москва') + '&mode=rail&incoterms=';
      const fob = await call('g', 'GET', url + 'FOB');
      const exw = await call('g', 'GET', url + 'EXW');
      const fca = await call('g', 'GET', url + 'FCA');
      const dap = await call('g', 'GET', url + 'DAP');
      ok(fob.matches.length === 1 && fob.matches[0].rate === 9600, JSON.stringify(fob.matches));
      ok(exw.matches.length === 1 && exw.matches[0].rate === 10200 && /EXW.*600 USD/.test(exw.matches[0].incotermNote), JSON.stringify(exw.matches));
      ok(fca.matches.length === 1 && fca.matches[0].rate === 10200 && /FCA.*600 USD/.test(fca.matches[0].incotermNote), JSON.stringify(fca.matches));
      ok(dap.matches.length === 0, 'FOB ставка попала в DAP: ' + JSON.stringify(dap.matches));
    });
    await check('Incoterms: надбавка EXW учитывается в калькуляторе и КП', async () => {
      const fob = await call('g', 'POST', '/api/estimate', { from: 'Shanghai', to: 'Москва', weight: 20000, volume: 60, incoterms: 'FOB' });
      const exw = await call('g', 'POST', '/api/estimate', { from: 'Shanghai', to: 'Москва', weight: 20000, volume: 60, incoterms: 'EXW' });
      const fobRail = fob.options.find(o => o.kind === 'fcl_rail');
      const exwRail = exw.options.find(o => o.kind === 'fcl_rail');
      ok(fobRail && fobRail.price === 9600, JSON.stringify(fobRail));
      ok(exwRail && exwRail.price === 10200 && /EXW.*600 USD/.test(exwRail.publicWarning), JSON.stringify(exwRail));
      const q = await call('g', 'POST', '/api/quotes', { from: 'Shanghai', to: 'Москва', weight: 20000, volume: 60, kind: 'fcl_rail', incoterms: 'EXW' });
      ok(q.ok && q.quote.price === 10200 && /EXW.*600 USD/.test(q.quote.publicWarning), JSON.stringify(q));
    });
    await check('Incoterms: неподтверждённый DAP помечается в оценке', async () => {
      const d = await call('g', 'POST', '/api/estimate', { from: 'Shanghai', to: 'Москва', weight: 20000, volume: 60, incoterms: 'DAP' });
      const rail = d.options.find(o => o.kind === 'fcl_rail');
      ok(rail && rail.source === 'tariff' && /DAP/.test(rail.publicWarning), JSON.stringify(rail));
    });
    await check('Ставки: город на русском сопоставляется с названием в базе', async () => {
      const x = await call('g', 'GET', '/api/rates/recommend?from=' + encodeURIComponent('Шанхай') + '&to=' + encodeURIComponent('Москва') + '&mode=rail');
      ok(x.matches && x.matches.length === 1, JSON.stringify(x.matches));
      ok(x.matches[0].from === 'Shanghai', JSON.stringify(x.matches[0]));
    });
    await check('Ставки: не подменять направление и транспорт', async () => {
      const x = await call('g', 'GET', '/api/rates/recommend?from=Shanghai&to=Vladivostok&mode=rail');
      const y = await call('g', 'GET', '/api/rates/recommend?from=Shanghai&to=' + encodeURIComponent('Москва') + '&mode=air');
      ok(x.matches.length === 0 && y.matches.length === 0, JSON.stringify([x.matches,y.matches]));
    });
    await check('КП: используется только ставка точного маршрута и выбранного транспорта', async () => {
      const q = await call('g', 'POST', '/api/quotes', { from: 'Шанхай', to: 'Москва', mode: 'rail', weight: 1200 });
      ok(q.ok && q.quote.mode === 'rail' && q.quote.price === 9600, JSON.stringify(q));
      const a = await call('g', 'POST', '/api/quotes', { from: 'Шанхай', to: 'Москва', mode: 'air', weight: 1200 });
      const d = await call('g', 'POST', '/api/quotes', { from: 'Шанхай', to: 'Владивосток', mode: 'rail', weight: 1200 });
      ok(a._status === 404, 'ставка ЖД использована для авиа: ' + JSON.stringify(a));
      ok(d._status === 404, 'ставка до Москвы использована для Владивостока: ' + JSON.stringify(d));
    });
    let gq;
    await check('Гость: сохраняет расчёт (КП по ссылке)', async () => {
      const j = await call('g', 'POST', '/api/quotes', { from: 'Shanghai', to: 'Москва', mode: 'rail', weight: 1200 });
      ok(j.ok && j.quote && j.quote.price > 0, JSON.stringify(j)); ok(!j.quote.company, 'в КП видно агента'); gq = j.quote;
      const p = await call('x', 'GET', '/api/quotes/' + gq.id); ok(p.quote && p.quote.number === gq.number, 'ссылка на КП не открывается');
    });
    await check('Сравнение транспорта: 400 кг — авиа и сборные, без целого контейнера', async () => {
      const j = await call('g', 'POST', '/api/estimate', { from: 'Иу', to: 'Москва', weight: 400 }); ok(j.ok, JSON.stringify(j));
      const k = j.options.map(o => o.kind); ok(k.includes('air') && k.includes('ltl_auto'), k.join(',')); ok(!k.includes('fcl_rail') && !k.includes('ftl_auto'), 'предложен целый контейнер: ' + k.join(','));
      const q = await call('g', 'POST', '/api/quotes', { from: 'Иу', to: 'Москва', weight: 400, kind: 'ltl_auto' }); ok(q.ok && q.quote.price === j.options.find(o => o.kind === 'ltl_auto').price, 'цена КП не совпала с расчётом');
      const big = await call('g', 'POST', '/api/estimate', { from: 'Shanghai', to: 'Москва', weight: 20000, volume: 60 }); ok(big.options.some(o => o.kind === 'fcl_rail'), 'нет контейнера для 20 т');
    });
    await check('Статьи для поисковиков и sitemap', async () => { const r = await fetch(B + '/stati/sbornyj-gruz-iz-kitaya'); ok(r.status === 200); ok((await r.text()).includes('<h1>')); const sm = await (await fetch(B + '/sitemap.xml')).text(); ok(sm.includes('/stati/dostavka-cherez-zabaikalsk') && sm.includes('/novosti') && sm.includes('/raschet</loc>') && sm.includes('/tnved</loc>'), 'нет статей или разделов в sitemap'); ok(!sm.includes('/rabota') && !sm.includes('/kabinet'), 'закрытые разделы в sitemap'); });
    await check('Гость: заявка без контактов отклоняется', async () => ok((await call('g', 'POST', '/api/leads', { name: 'Тест' }))._status === 400));
    await check('Гость: заявка принимается', async () => ok((await call('g', 'POST', '/api/leads', { name: 'Тест CI', contact: '@test', from: 'Шанхай', to: 'Москва', consent: true })).ok));
    await check('Новости: /api/news отвечает', async () => { const j = await call('g', 'GET', '/api/news'); ok(j._status === 200, 'код ' + j._status); ok(Array.isArray(j.items), 'нет списка'); });
    await check('Курсы ЦБ: /api/currency', async () => { const j = await call('g', 'GET', '/api/currency'); ok(j._status === 200); }, { soft: true });
    await check('Курсы ЦБ на дату 07.08.2026', async () => { const j = await call('g', 'GET', '/api/currency?date=2026-08-07'); ok(j._status === 200 && j.items && j.items.USD, 'код ' + j._status); }, { soft: true });
    await check('Курсы ЦБ: неверная дата отклоняется', async () => { ok((await call('g', 'GET', '/api/currency?date=07.08.2026'))._status === 400); ok((await call('g', 'GET', '/api/currency?date=2099-01-01'))._status === 400); });
    await check('Регистрация: слабый пароль и плохая почта отклоняются', async () => { ok((await call('r0', 'POST', '/api/register', { name: 'Иван', email: 'bad', password: '12345678' }))._status === 400); ok((await call('r0', 'POST', '/api/register', { name: 'Иван', email: 'reg@ci.test', password: '123' }))._status === 400); });
    await check('Регистрация: клиент сам создаёт кабинет и сразу входит', async () => {
      const j = await call('r', 'POST', '/api/register', { name: 'Иван Рег', email: 'Reg@CI.test', password: 'reg-pass-123', company: 'ООО Тест' }); ok(j.ok && j.role === 'client', JSON.stringify(j));
      const me = await call('r', 'GET', '/api/me'); ok(me.role === 'client', 'не вошёл после регистрации');
      ok((await call('r2', 'POST', '/api/register', { name: 'Дубль', email: 'reg@ci.test', password: 'reg-pass-123' }))._status === 409, 'дубль почты принят');
      ok((await call('r3', 'POST', '/api/login', { login: 'reg@ci.test', password: 'reg-pass-123' })).ok, 'не входит по паролю');
    });
    await check('Регистрация: бот (заполнено скрытое поле) не создаёт кабинет', async () => { const j = await call('rb', 'POST', '/api/register', { name: 'Bot', email: 'bot@ci.test', password: 'bot-pass-123', website: 'http://spam' }); ok(j.role === 'guest'); ok((await call('rb', 'GET', '/api/me')).role === 'guest'); });

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
    await check('Трекинг: этапы груза, город по России и адрес видны клиенту', async () => {
      let u = await call('a', 'PATCH', '/api/shipments/' + sh.id, { stage: 'border', crossing: 'Забайкальск', customsAt: 'inland' }); ok(u.ok && u.item.stage === 'border', JSON.stringify(u).slice(0, 200));
      u = await call('a', 'PATCH', '/api/shipments/' + sh.id, { stage: 'ru', nowCity: 'Новосибирск', address: 'Москва, ул. Складская, 3' }); ok(u.item.stage === 'ru' && u.item.status === 'delivery', JSON.stringify(u.item).slice(0, 200));
      u = await call('a', 'PATCH', '/api/shipments/' + sh.id, { nowCity: 'Екатеринбург' }); ok(/Екатеринбург/.test(u.item.events[u.item.events.length - 1].note), 'смена города не попала в историю');
      ok((await call('a', 'PATCH', '/api/shipments/' + sh.id, { stage: 'flight' }))._status === 400, 'этап авиа принят для ЖД');
      const my = (await call('c', 'GET', '/api/my/shipments')).items[0]; ok(my.stage === 'ru' && my.nowCity === 'Екатеринбург' && my.address && my.crossing === 'Забайкальск', JSON.stringify(my).slice(0, 300));
    });
    await check('Журнал: расчёты и входы — отдельными строками, гостю и клиенту закрыт', async () => {
      ok((await call('g', 'GET', '/api/journal'))._status === 401, 'гостю открыт журнал'); ok((await call('c', 'GET', '/api/journal'))._status === 403, 'клиенту открыт журнал');
      const j = await call('a', 'GET', '/api/journal'); ok(j.ok && Array.isArray(j.items), JSON.stringify(j).slice(0, 200));
      const calc = j.items.find(x => x.type === 'calc' && x.from === 'Иу'); ok(calc && calc.weight === 400 && calc.price > 0, 'нет расчёта Иу → Москва: ' + JSON.stringify(j.items.slice(0, 3)).slice(0, 300));
      ok(j.items.some(x => x.type === 'login' && x.email === 'client@ci.test'), 'нет входа клиента');
      const r = await fetch(B + '/api/journal/export', { headers: { Cookie: 'auth=' + jar.a } }); const buf = Buffer.from(await r.arrayBuffer()); const t = buf.toString('utf8');
      ok(r.status === 200 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF && /Дата и время;Действие/.test(t), 'выгрузка не похожа на CSV для Excel: ' + r.status + ' ' + t.slice(0, 60));
    });
    await check('Курс ЦБ: динамика юаня за месяц', async () => { const j = await call('g', 'GET', '/api/currency/dynamics?code=CNY'); ok(j._status === 200 && j.points.length > 5, 'код ' + j._status); }, { soft: true });
    await check('Курс ЦБ: динамика — неверные параметры отклоняются', async () => { ok((await call('g', 'GET', '/api/currency/dynamics?code=XXX'))._status === 400); ok((await call('g', 'GET', '/api/currency/dynamics?code=CNY&from=2026-05-01&to=2026-04-01'))._status === 400); });
    let cq;
    await check('Клиент: КП сохраняется в «Мои КП»', async () => {
      const j = await call('c', 'POST', '/api/quotes', { from: 'Shanghai', to: 'Москва', mode: 'rail', weight: 500 }); ok(j.ok); cq = j.quote;
      ok((await call('c', 'GET', '/api/my/quotes')).items.some(q => q.id === cq.id));
    });
    await check('Кейсы: видят все, добавляет только администратор', async () => {
      const g = await call('g', 'GET', '/api/cases'); ok(g.ok && g.items.some(c => /Баллистическая ткань/.test(c.goods)), JSON.stringify(g).slice(0, 160));
      ok((await call('g', 'POST', '/api/cases', { goods: 'Тест' }))._status === 401, 'гость добавил кейс');
      const a = await call('a', 'POST', '/api/cases', { goods: 'Лампы CI', weight: 1200, transport: 'rail', from: 'Иу', to: 'Москва' }); ok(a.ok && a.item.id, JSON.stringify(a).slice(0, 160));
      ok((await call('g', 'GET', '/api/cases')).items.some(c => c.goods === 'Лампы CI'), 'новый кейс не виден гостю');
      // инструменты логиста: только сотрудникам; иностранный номер определяется без внешних сайтов
      ok((await call('g', 'POST', '/api/tools/phone', { number: '+86 138 0013 8000' }))._status === 401, 'гость пользуется инструментами');
      const phn = await call('a', 'POST', '/api/tools/phone', { number: '+86 138 0013 8000' }); ok(phn.ok && phn.country === 'Китай' && phn.tz === 'Asia/Shanghai', 'телефон: ' + JSON.stringify(phn).slice(0, 160));
      const tm = await call('a', 'POST', '/api/tools/terminal', { terminal: 'sher', weight: 120, from: '2026-11-09', to: '2026-11-16' }); ok(tm.ok && tm.total > 0 && tm.lines.length >= 3, 'терминальные: ' + JSON.stringify(tm).slice(0, 160));
      // фото кейса: загружает только администратор, смотрят все, удаляется вместе с кейсом
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const ph = () => { const fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'photo.png'); return fd; };
      ok((await call('g', 'POST', '/api/cases/' + a.item.id + '/photo', ph()))._status === 401, 'гость загрузил фото кейса');
      const bad = new FormData(); bad.append('file', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'x.svg'); ok((await call('a', 'POST', '/api/cases/' + a.item.id + '/photo', bad))._status === 400, 'принял SVG как фото');
      const up = await call('a', 'POST', '/api/cases/' + a.item.id + '/photo', ph()); ok(up.ok && /\/api\/cases\/.+\/photo\?v=/.test(up.item.photo || ''), JSON.stringify(up).slice(0, 160));
      ok((await call('g', 'GET', '/api/cases')).items.find(c => c.id === a.item.id).photo, 'гость не видит фото в списке');
      const img = await call('g', 'GET', '/api/cases/' + a.item.id + '/photo', null, true); ok(img.status === 200 && img.headers.get('content-type') === 'image/png' && Buffer.from(await img.arrayBuffer()).equals(png), 'фото не отдаётся');
      ok((await call('a', 'PATCH', '/api/cases/' + a.item.id, { value: 2700000 })).item.photo, 'фото пропало после правки кейса');
      ok((await call('a', 'DELETE', '/api/cases/' + a.item.id)).ok, 'кейс не удалился');
      ok((await call('g', 'GET', '/api/cases/' + a.item.id + '/photo', null, true)).status === 404, 'фото удалённого кейса ещё отдаётся');
    });
    await check('КП от менеджера появляется в кабинете клиента, внутренние строки не уходят', async () => {
      const dl = await call('a', 'POST', '/api/deals', { title: 'КП в кабинет CI', clientId: cl.id }); ok(dl.ok, JSON.stringify(dl).slice(0, 160));
      const html = '<div class="kp"><div class="kp-hero"><div class="kp-sum">151 652 <small>¥</small></div></div></div>';
      ok((await call('a', 'POST', '/api/deals/' + dl.item.id + '/kp-share', { html: html + '<p>Маржа</p>', total: 151652, currency: 'CNY' }))._status === 400, 'маржа ушла клиенту');
      ok((await call('a', 'POST', '/api/deals/' + dl.item.id + '/kp-share', { html: '<div class="kp"><img src=x onerror=alert(1)></div>', total: 1, currency: 'CNY' }))._status === 400, 'принят лист со скриптом');
      const sh = await call('a', 'POST', '/api/deals/' + dl.item.id + '/kp-share', { html, text: 'КП', total: 151652, currency: 'CNY', rub: 1754000, route: 'Гуанчжоу → Москва' }); ok(sh.ok, JSON.stringify(sh).slice(0, 160));
      const mine = await call('c', 'GET', '/api/my/kps'); ok(mine.items.length === 1 && mine.items[0].total === 151652, JSON.stringify(mine).slice(0, 200));
      const one = await call('c', 'GET', '/api/my/kps/' + mine.items[0].id); ok(one.item.html === html);
      ok((await call('g', 'GET', '/api/my/kps'))._status === 401, 'гостю открыты КП клиентов');
      ok((await call('c', 'POST', '/api/deals/' + dl.item.id + '/kp-share', { html, total: 1 }))._status === 403, 'клиент отправляет КП');
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
    await check('Восстановление пароля: понятные ответы', async () => { const a = await call('g', 'POST', '/api/password/forgot', { email: 'renamed@ci.test' }); ok(a.ok && /менеджеру|отправлена/.test(a.message), JSON.stringify(a)); const b = await call('g', 'POST', '/api/password/forgot', { email: 'nobody@ci.test' }); ok(b._status === 404); });
    await check('Админ: смена своего пароля', async () => {
      ok((await call('a', 'POST', '/api/account/password', { current: ADMIN_PASS, next: 'admin-new-pass-1' })).ok);
      ok((await call('a2', 'POST', '/api/login', { login: 'admin', password: 'admin-new-pass-1' })).ok);
      { const st = (await call('a3', 'POST', '/api/login', { login: 'admin', password: ADMIN_PASS }))._status; ok(st === 401 || st === 429, 'старый пароль админа работает (код ' + st + ')'); }
    });
    await check('Заявка с документами: файл сохраняется, создаётся сделка', async () => {
      const fd = new FormData(); for (const [k, v] of Object.entries({ name: 'Инвойс CI', contact: '+79001112233', from: 'Иу', to: 'Москва', consent: 'true' })) fd.append(k, v);
      fd.append('files', new Blob([require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'invoice.xlsx'))]), 'invoice.xlsx');
      const j = await call('g2', 'POST', '/api/leads/docs', fd); ok(j.ok, JSON.stringify(j));
      const ds = await call('a', 'GET', '/api/deals?q=' + encodeURIComponent('Инвойс CI')); const deal = ds.items && ds.items[0]; ok(deal && deal.files === 1, 'нет сделки с файлом: ' + JSON.stringify(ds.items && ds.items[0]));
      const full = await call('a', 'GET', '/api/deals/' + deal.id); ok(/LED grow light/.test(full.item.activity[0].text), 'содержимое Excel не попало в сделку');
      const f = await fetch(B + '/api/deals/' + deal.id + '/files/' + full.item.files[0].id, { headers: { Cookie: 'auth=' + jar.a } }); ok(f.status === 200, 'файл не скачивается');
      ok((await fetch(B + '/api/deals/' + deal.id + '/files/' + full.item.files[0].id)).status === 401, 'гостю доступен файл сделки');
    });
    await check('CRM: сделка вручную, заметка, смена этапа, база клиентов, импорт CSV', async () => {
      const c = await call('a', 'POST', '/api/deals', { title: 'Насос 261105', contactName: 'Пётр', contactPhone: '+7 901 222-33-44', company: 'ООО Насосы', mode: 'rail' }); ok(c.ok);
      ok((await call('a', 'POST', '/api/deals/' + c.item.id + '/notes', { text: 'Звонок', type: 'call' })).ok);
      const p = await call('a', 'PATCH', '/api/deals/' + c.item.id, { stage: 'Ставка отправлена' }); ok(p.item.activity.some(a => a.type === 'field' && a.to === 'Ставка отправлена'));
      const cl = await call('a', 'GET', '/api/crm/clients?sort=added'); ok(cl.items.some(x => x.name === 'Пётр' && x.deals === 1), 'клиента нет в базе');
      const csv = 'Номер;Название;Контакт;Компания;Этап;Тип перевозки;Создана\n301026-11;Железные диски 261030;Захар;Захар;Ставка отправлена;Авто;30.10.2026\n';
      const fd = new FormData(); fd.append('file', new Blob([csv]), 'deals.csv'); const im = await call('a', 'POST', '/api/deals/import', fd); ok(im.ok && im.added === 1, JSON.stringify(im));
      const again = new FormData(); again.append('file', new Blob([csv]), 'deals.csv'); ok((await call('a', 'POST', '/api/deals/import', again)).added === 0, 'дубль импортирован');
      ok((await call('g', 'GET', '/api/deals'))._status === 401, 'гостю видны сделки');
    });
    await check('CRM: задачи, финансы, калькулятор ВЭД по курсу ЦБ, коды ТН ВЭД', async () => {
      const d = await call('a', 'POST', '/api/deals', { title: 'ВЭД CI', contactName: 'Олег', funnel: 'Наш контракт', weight: 500 }); ok(d.ok && d.item.funnel === 'Наш контракт', JSON.stringify(d).slice(0, 200));
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const t = await call('a', 'POST', '/api/tasks', { dealId: d.item.id, type: 'Звонок', desc: 'Перезвонить CI', deadline: y }); ok(t.ok && t.item.overdue, 'задача не просрочена');
      ok((await call('a', 'GET', '/api/crm/badges')).tasksOverdue >= 1, 'нет счётчика просроченных');
      const r = await call('a', 'GET', '/api/ved/rates'); ok(r.rates && r.rates.USD === 80, 'курсы: ' + JSON.stringify(r).slice(0, 120));
      const c = await call('a', 'POST', '/api/calc', { dealId: d.item.id, calc_type: 'our_contract' }); ok(c.ok, JSON.stringify(c).slice(0, 200));
      const p = await call('a', 'PATCH', '/api/calc/' + c.id, { items: [{ ...c.doc.items[0], invoice_amount: 10000, invoice_currency: 'USD', duty_rate: 10 }], freight_total: 1000, freight_currency: 'USD' });
      ok(p.result && p.result.customs_base_sum_rub === 880000 && p.result.duty_sum_rub === 88000, 'расчёт: ' + JSON.stringify(p.result || p).slice(0, 200));
      ok((await call('a', 'POST', '/api/calc/' + c.id + '/to-finance')).added >= 4, 'расчёт не перенесён в финансы');
      const fin = await call('a', 'GET', '/api/deals/' + d.item.id + '/finance'); ok(fin.expense > 0, 'нет расходов в финансах');
      const csv = 'Код;Наименование;Пошлина;НДС\n6201400000;Куртки из химических нитей мужские;10%, но не менее 2,2 евро за 1 кг;22%\n8517130000;Смартфоны;0%;22%\n';
      const fd = new FormData(); fd.append('file', new Blob([csv]), 'tnved.csv'); const im = await call('a', 'POST', '/api/tnved/import', fd); ok(im.ok && im.added === 2, JSON.stringify(im));
      const s = await call('a', 'GET', '/api/tnved/search?q=' + encodeURIComponent('куртк')); ok(s.items && s.items[0].code === '6201400000', 'поиск ТН ВЭД');
      const lk = await call('a', 'GET', '/api/tnved/lookup?code=6201400000'); ok(lk.duty_type === 'min' && lk.eur_per_kg === 2.2, 'данные для калькулятора: ' + JSON.stringify(lk).slice(0, 160));
      ok((await call('g', 'GET', '/api/tnved/search?q=8517'))._status === 401, 'гостю доступен справочник');
      ok((await call('g', 'GET', '/api/tasks'))._status === 401, 'гостю доступны задачи');
      const ag = await call('a', 'GET', '/api/crm/agents'); ok(ag.items && ag.items.length > 0, 'нет агентов: ' + JSON.stringify(ag).slice(0, 120));
      const rq = await call('a', 'POST', '/api/deals/' + d.item.id + '/rq', { agentIds: [ag.items[0].id], send: false }); ok(rq.ok && rq.request.items.length === 1, JSON.stringify(rq).slice(0, 160));
      const rp = await call('a', 'POST', '/api/rq/' + rq.request.id + '/replies', { itemId: rq.request.items[0].id, text: 'Rate: USD 3 900 / 40HQ, 28 days' }); ok(rp.rates && rp.rates[0] && rp.rates[0].amount === 3900, 'ставка из ответа: ' + JSON.stringify(rp).slice(0, 160));
      ok((await call('g', 'POST', '/api/rq/rates/' + rp.rates[0].id + '/to-calc', {}))._status === 401, 'гостю доступна запись ставки в расчёт');
      const tc = await call('a', 'POST', '/api/rq/rates/' + rp.rates[0].id + '/to-calc', {}); ok(tc.ok && tc.calcId && tc.freight === 3900, 'ставка в расчёт: ' + JSON.stringify(tc).slice(0, 160));
      const cd = await call('a', 'GET', '/api/calc/' + tc.calcId); ok(cd.doc && cd.doc.freight_total === 3900 && cd.doc.freight_currency === 'USD' && cd.doc.kp_transit === '28 дн.', 'фрахт в расчёте: ' + JSON.stringify(cd.doc || cd).slice(0, 200));
      ok((await call('g', 'GET', '/api/crm/agents'))._status === 401, 'гостю доступна закрытая база агентов');
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
