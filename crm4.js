// IOMASTAVKA — после сделки: «Факт» (приходы и расходы по курсам оплаты и ДТ, долг клиента, прибыль компании),
// «Мои средства» (5% от прибыли компании по успешным сделкам) и ЭТрН (сценарий доставки и шаги в Контур.Диадоке).
// Всё — только для администратора; клиенту не показывается никогда.
'use strict';
const FACT = require('./fact');

function setup(app, ctx) {
  const { store, admin, str, newId } = ctx;
  const now = () => new Date().toISOString();
  const bad = (res, error, code = 400) => res.status(code).json({ ok: false, error });
  const who = req => (ctx.who && ctx.who(req)) || 'Менеджер';
  const db = () => { const d = store.load(); d.deals = d.deals || []; d.settings = d.settings || {}; return d; };
  const dealOf = (d, id) => d.deals.find(x => x.id === id);
  const n = v => { const x = Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  const numOrEmpty = v => (v === '' || v == null ? '' : Math.round(n(v) * 1e6) / 1e6);
  const CUR = ['CNY', 'USD', 'EUR', 'RUB'];
  const cur = c => (CUR.includes(String(c || '').toUpperCase()) ? String(c).toUpperCase() : 'RUB');
  const pctOf = d => { const p = n((d.settings.fact || {}).bonusPct); return p > 0 && p <= 100 ? p : FACT.DEFAULT_PCT; };
  const won = x => x.stage === 'Успешно' || x.status === 'won';
  const dateOk = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

  function clean(b) {
    const rows = (a, f, max) => (Array.isArray(a) ? a.slice(0, max) : []).map(f);
    return {
      currency: cur(b.currency || 'CNY'), contractTotal: numOrEmpty(b.contractTotal), invoice: numOrEmpty(b.invoice),
      rateSupplier: numOrEmpty(b.rateSupplier), rateDt: numOrEmpty(b.rateDt), dateSupplier: dateOk(b.dateSupplier), dateDt: dateOk(b.dateDt), payment: str(b.payment, 10),
      expenses: rows(b.expenses, e => ({ label: str(e.label, 120) || 'Расход', currency: cur(e.currency), amount: numOrEmpty(e.amount), rate: numOrEmpty(e.rate), plan: e.plan === '' || e.plan == null ? null : n(e.plan), date: dateOk(e.date) }), 40),
      incomes: rows(b.incomes, e => ({ label: str(e.label, 120) || 'Оплата клиента', amount: numOrEmpty(e.amount), date: dateOk(e.date) }), 40),
      extraBilled: rows(b.extraBilled, e => ({ label: str(e.label, 120) || 'Доп. расходы клиенту', amount: numOrEmpty(e.amount) }), 20),
      note: str(b.note, 1000), bonusPaid: !!b.bonusPaid, bonusPaidAt: b.bonusPaid ? (dateOk(b.bonusPaidAt) || now().slice(0, 10)) : '',
    };
  }
  async function draftFor(x) {
    let plan = null; try { plan = ctx.contractFor ? await ctx.contractFor(x.id) : null; } catch { plan = null; }
    return { fact: FACT.draft(plan && plan.contract, plan && plan.doc), calcId: plan && plan.doc ? plan.doc.id : '' };
  }

  app.get('/api/deals/:id/fact', admin, async (req, res) => {
    const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    const pct = pctOf(d);
    if (x.fact) return res.json({ ok: true, saved: true, won: won(x), fact: x.fact, result: FACT.calc(x.fact, { bonusPct: pct }), updatedAt: x.factAt || '', by: x.factBy || '' });
    const dr = await draftFor(x);
    res.json({ ok: true, saved: false, won: won(x), fact: dr.fact, calcId: dr.calcId, result: FACT.calc(dr.fact, { bonusPct: pct }) });
  });
  app.put('/api/deals/:id/fact', admin, (req, res) => {
    const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    const was = x.fact; x.fact = clean(req.body || {}); x.factAt = now(); x.factBy = who(req);
    const r = FACT.calc(x.fact, { bonusPct: pctOf(d) });
    x.activity = x.activity || [];
    if (!was) x.activity.push({ id: newId(4), at: now(), type: 'finance', section: 'finance', internal: true, by: who(req), text: 'Заполнен «Факт» по сделке' });
    if (was && !was.bonusPaid && x.fact.bonusPaid) x.activity.push({ id: newId(4), at: now(), type: 'finance', section: 'finance', internal: true, by: who(req), text: 'Личные средства по сделке отмечены как полученные' });
    store.save(d); res.json({ ok: true, fact: x.fact, result: r });
  });
  app.post('/api/deals/:id/fact/reset', admin, async (req, res) => { // заново взять план из расчёта
    const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    delete x.fact; delete x.factAt; delete x.factBy; store.save(d);
    const dr = await draftFor(x); res.json({ ok: true, saved: false, fact: dr.fact, result: FACT.calc(dr.fact, { bonusPct: pctOf(d) }) });
  });

  app.post('/api/deals/:id/fact/paid', admin, (req, res) => { // отметка «мои средства получены»
    const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404); if (!x.fact) return bad(res, 'Сначала заполните «Факт» по сделке');
    const p = !!(req.body || {}).paid; x.fact.bonusPaid = p; x.fact.bonusPaidAt = p ? now().slice(0, 10) : ''; store.save(d); res.json({ ok: true, paid: p, paidAt: x.fact.bonusPaidAt });
  });
  // «Мои средства»: личные % от прибыли компании по успешным сделкам с заполненным «Фактом»
  app.get('/api/wallet', admin, (req, res) => {
    const d = db(), pct = pctOf(d), items = [];
    for (const x of d.deals) {
      if (x.deletedAt || !won(x)) continue;
      const r = x.fact ? FACT.calc(x.fact, { bonusPct: pct }) : null;
      items.push({ dealId: x.id, number: x.number || '', title: x.title || '', client: x.company || x.contactName || '', closedAt: x.closedAt || x.updatedAt || '', hasFact: !!x.fact,
        profit: r ? r.profit : null, bonus: r ? r.bonus : null, debt: r ? r.debt : null, ready: r ? r.ok : false, paid: !!(x.fact && x.fact.bonusPaid), paidAt: (x.fact && x.fact.bonusPaidAt) || '' });
    }
    items.sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt)));
    const sum = f => Math.round(items.reduce((s, i) => s + (f(i) || 0), 0) * 100) / 100;
    const months = {};
    for (const i of items) { if (!i.hasFact) continue; const m = String(i.closedAt).slice(0, 7) || '—'; months[m] = months[m] || { month: m, bonus: 0, profit: 0, deals: 0 }; months[m].bonus = Math.round((months[m].bonus + (i.bonus || 0)) * 100) / 100; months[m].profit = Math.round((months[m].profit + (i.profit || 0)) * 100) / 100; months[m].deals++; }
    res.json({ ok: true, bonusPct: pct, items, total: sum(i => i.bonus), received: sum(i => (i.paid ? i.bonus : 0)), pending: sum(i => (i.paid ? 0 : i.bonus)), profit: sum(i => i.profit), debts: sum(i => (i.debt > 0 ? i.debt : 0)), noFact: items.filter(i => !i.hasFact).length, months: Object.values(months).sort((a, b) => b.month.localeCompare(a.month)) });
  });
  app.put('/api/wallet/settings', admin, (req, res) => {
    const d = db(), p = n((req.body || {}).bonusPct); if (!(p > 0 && p <= 100)) return bad(res, 'Процент — от 0 до 100');
    d.settings.fact = { ...(d.settings.fact || {}), bonusPct: p }; store.save(d); res.json({ ok: true, bonusPct: p });
  });

  // ЭТрН: какой сценарий у сделки и какие шаги уже сделаны
  app.put('/api/deals/:id/etrn', admin, (req, res) => {
    const d = db(), x = dealOf(d, req.params.id); if (!x) return bad(res, 'Сделка не найдена', 404);
    const b = req.body || {}, prev = x.etrn || {};
    x.etrn = { contract: b.contract === 'client' ? 'client' : b.contract === 'our' ? 'our' : (prev.contract || ''), dest: b.dest === 'tk' ? 'tk' : b.dest === 'client' ? 'client' : (prev.dest || ''),
      tk: b.tk != null ? str(b.tk, 120) : (prev.tk || ''), selfEmployed: b.selfEmployed != null ? !!b.selfEmployed : !!prev.selfEmployed,
      done: Array.isArray(b.done) ? b.done.map(v => str(v, 40)).filter(Boolean).slice(0, 60) : (prev.done || []), at: now() };
    store.save(d); res.json({ ok: true, etrn: x.etrn });
  });
  return {};
}
module.exports = { setup };
