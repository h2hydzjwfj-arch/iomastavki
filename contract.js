// contract.js — калькулятор контракта. Загружается только администратором.
// Защищён на сервере: /contract.js отдаётся только при cookie auth=1.

// =====================================================================================
//  КАЛЬКУЛЯТОР КОНТРАКТА v3 — фиксированные ставки в коде, без скролла
//  Фиксированные: НДС 22%, страхование 0.15%, комиссия 3%, налоги 2.2%
//  Курс = CBR(CNY) - 1 ₽ (динамически, при открытии страницы)
// =====================================================================================
(function(){
  // ========== ФИКСИРОВАННЫЕ СТАВКИ (при изменении закона — править здесь) ==========
  const STATIC = {
    VAT: 22,          // НДС РФ с 01.01.2026 (ФЗ №425-ФЗ от 28.11.2025). Ранее было 20%.
    INSURANCE: 0.15,
    TD: 4,            // Торговый дом: +4% к инвойсу, если используется  // стандарт страхования импортных грузов
    COMMISSION: 3,    // банковская комиссия за перевод в Китай
    TAX: 2.2          // налог на прибыль/операционные налоги компании
  };

  const $id = id => document.getElementById(id);
  const num = v => { const x = Number(String(v==null?'':v).replace(/\s/g,'').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  const fmt = (n, d) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return '0';
    const digits = Number.isFinite(d) ? d : 2;
    return x.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  };
  const fmtRub = n => fmt(n, 2) + ' ₽';
  const fmtYen = n => fmt(n, 2) + ' ¥';

  function customsFeeRub(rub){
    if (!rub || rub <= 0) return 0;
    if (rub <= 200000) return 1231;
    if (rub <= 450000) return 2462;
    if (rub <= 1200000) return 4924;
    if (rub <= 2700000) return 13541;
    if (rub <= 4200000) return 18465;
    if (rub <= 5500000) return 21344;
    if (rub <= 10000000) return 49240;
    return 73860;
  }

  let contractRate = 0;
  let extraRows = [];

  // ---- Курс ----
  async function fetchContractRate(){
    const el = $id('cf_rate_val');
    if (el) el.textContent = 'Загружаю…';
    const endpoints = ['/api/currency', 'https://www.cbr-xml-daily.ru/daily_json.js'];
    for (const url of endpoints){
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) continue;
        const d = await r.json();
        let cny = null;
        if (d && d.ok && d.items && d.items.CNY && d.items.CNY.value) cny = Number(d.items.CNY.value);
        else if (d && d.Valute && d.Valute.CNY && d.Valute.CNY.Value) cny = Number(d.Valute.CNY.Value);
        if (Number.isFinite(cny) && cny > 1){
          contractRate = +(cny - 1).toFixed(4);
          console.log('[contract] CBR CNY = ' + cny + ' → ЦБ−1 = ' + contractRate);
          if (el) el.textContent = fmt(contractRate, 3);
          renderContract();
          return;
        }
      } catch (e) { console.warn('[contract] ' + url + ': ' + e.message); }
    }
    if (el) el.textContent = 'не удалось загрузить';
  }

  // ---- Доп. статьи ----
  function renderExtraInputs(){
    const host = $id('cf_extra_fields');
    if (!host) return;
    host.innerHTML = '';
    extraRows.forEach((row, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'cf-extra-row';
      wrap.innerHTML = '<input type="text" class="cf-extra-name" placeholder="Название" value="' + String(row.name||'').replace(/"/g,'&quot;') + '">' +
                       '<input type="number" min="0" step="100" class="cf-extra-rub" placeholder="0 ₽" value="' + (row.rub||'') + '">' +
                       '<button type="button" class="cf-extra-del" title="Удалить">×</button>';
      wrap.querySelector('.cf-extra-name').addEventListener('input', e => { row.name = e.target.value; renderContract(); });
      wrap.querySelector('.cf-extra-rub').addEventListener('input', e => { row.rub = num(e.target.value); renderContract(); });
      wrap.querySelector('.cf-extra-del').addEventListener('click', () => { extraRows.splice(i, 1); renderExtraInputs(); renderContract(); });
      host.appendChild(wrap);
    });
  }

  function renderExtraResults(){
    const host = $id('cf_extra_rows_host');
    if (!host) return;
    const active = extraRows.filter(r => (r.name && r.name.trim()) || Number(r.rub) > 0);
    host.innerHTML = active.map(r => {
      const rub = Number(r.rub) || 0;
      const yen = contractRate ? rub / contractRate : 0;
      const nameSafe = String(r.name||'Статья').replace(/[<>&"]/g, '');
      return '<div class="contract-row extra"><span>+ ' + nameSafe + '</span><b>' + fmtYen(yen) + ' (' + fmtRub(rub) + ')</b></div>';
    }).join('');
  }

  // ---- Расчёт ----
  function renderContract(){
    const invoice   = num($id('cf_invoice')?.value);
    const hasTD     = !!($id('cf_td_use')?.checked);
    const duty      = num($id('cf_duty')?.value);
    const freight   = num($id('cf_freight')?.value);
    const declarant = num($id('cf_declarant')?.value);
    const auto      = num($id('cf_auto')?.value);
    const profit    = num($id('cf_profit')?.value);
    const rate      = contractRate || 0;

    // фиксированные
    const vatRate    = STATIC.VAT;
    const insurance  = STATIC.INSURANCE;
    const commission = STATIC.COMMISSION;
    const taxRate    = STATIC.TAX;

    if (!invoice || !rate){
      ['cf_invoice_m','cf_commission_val','cf_freight_val','cf_insurance_val',
       'cf_duty_val','cf_vat_val','cf_fee_val','cf_customs_val','cf_declarant_val',
       'cf_auto_val','cf_profit_val','cf_taxes_val','cf_total_yen','cf_total_rub',
       'cf_overhead'].forEach(id => { const e = $id(id); if (e) e.textContent = '—'; });
      renderExtraResults();
      return;
    }

    const invoiceWithTD = invoice * (1 + (hasTD ? STATIC.TD : 0) / 100);
    const commissionYen = invoiceWithTD * commission / 100;
    const insuranceYen  = invoice * insurance / 100;
    const customsValueYen = invoice + freight;
    const dutyYen       = customsValueYen * duty / 100;
    const vatYen        = (customsValueYen + dutyYen) * vatRate / 100;

    const cargoValueRub = invoice * rate;
    const feeRub = customsFeeRub(cargoValueRub);
    const feeYen = rate ? feeRub / rate : 0;

    const customsTotalYen = dutyYen + vatYen + feeYen;

    const declarantYen = rate ? declarant / rate : 0;
    const autoYen      = rate ? auto / rate : 0;
    const extraYen     = extraRows.reduce((s, r) => s + (rate ? (Number(r.rub)||0) / rate : 0), 0);

    const sumRowsYen = invoiceWithTD + commissionYen + freight + insuranceYen
                     + customsTotalYen + declarantYen + autoYen + extraYen + profit;
    const taxesYen = sumRowsYen * taxRate / 100;
    const totalYen = sumRowsYen + taxesYen;
    const totalRub = totalYen * rate;
    const overhead = invoiceWithTD > 0 ? (totalYen / invoiceWithTD - 1) * 100 : 0;

    const set = (id, txt) => { const e = $id(id); if (e) e.textContent = txt; };
    set('cf_invoice_m',       fmtYen(invoiceWithTD));
    set('cf_commission_val',  fmtYen(commissionYen));
    set('cf_freight_val',     fmtYen(freight));
    set('cf_insurance_val',   fmtYen(insuranceYen));
    set('cf_duty_val',        fmtYen(dutyYen));
    set('cf_vat_val',         fmtYen(vatYen));
    set('cf_fee_val',         fmtYen(feeYen) + ' (' + fmtRub(feeRub) + ')');
    set('cf_customs_val',     fmtYen(customsTotalYen));
    set('cf_declarant_val',   fmtYen(declarantYen));
    set('cf_auto_val',        fmtYen(autoYen));
    set('cf_profit_val',      fmtYen(profit));
    set('cf_taxes_val',       fmtYen(taxesYen));
    set('cf_total_yen',       fmtYen(totalYen));
    set('cf_total_rub',       fmtRub(totalRub));
    set('cf_overhead',        fmt(overhead, 1) + ' %');
    renderExtraResults();
  }

  async function openContract(){
    if (!contractRate) await fetchContractRate();
    else renderContract();
    renderExtraInputs();
  }

  function bind(){
    if (window.__contractBound3) return;
    window.__contractBound3 = true;

    $id('cf_calc')?.addEventListener('click', renderContract);
    $id('cf_reset')?.addEventListener('click', () => {
      ['cf_invoice','cf_duty','cf_freight','cf_declarant','cf_auto','cf_profit'].forEach(id => { const e = $id(id); if (e) e.value = ''; });
      const tdBox = $id('cf_td_use'); if (tdBox) tdBox.checked = false;
      extraRows = [];
      renderExtraInputs();
      renderContract();
    });
    $id('cf_add_row')?.addEventListener('click', () => {
      extraRows.push({ name: '', rub: '' });
      renderExtraInputs();
      renderContract();
    });
    ['cf_invoice','cf_duty','cf_freight','cf_declarant','cf_auto','cf_profit'].forEach(id => {
      $id(id)?.addEventListener('input', renderContract);
    });
    $id('cf_td_use')?.addEventListener('change', e => {
      const txt = e.target.parentElement?.querySelector('.cf-toggle-text');
      if (txt) txt.textContent = e.target.checked ? '+4% от инвойса' : 'не используется';
      renderContract();
    });
  }

  const view = $id('contractView');
  if (view){
    const obs = new MutationObserver(() => {
      if (view.classList.contains('open')){ bind(); openContract(); }
    });
    obs.observe(view, { attributes: true, attributeFilter: ['class'] });
    if (view.classList.contains('open')){ bind(); openContract(); }
  }
  window.__renderContract = renderContract;
  window.__openContract = openContract;
})();
