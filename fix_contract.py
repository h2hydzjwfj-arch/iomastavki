import re, os, shutil

# === Backup ===
os.makedirs('backup/before_contract', exist_ok=True)
for f in ['index.html', 'app.js', 'styles.css']:
    if os.path.exists(f): shutil.copy2(f, 'backup/before_contract/' + f)
print('✅ Backup создан в backup/before_contract/')

# ============================================================
# 1. INDEX.HTML — карточка на главной + секция contractView
# ============================================================
p = 'index.html'
s = open(p, 'r', encoding='utf-8').read()

# 1a. Добавляем 2 карточки в quick-grid (Контракт + ТН ВЭД)
NEW_CARDS = '''<button class="service-card" data-open-view="contract"><span class="service-icon icon-contract"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/><circle cx="17" cy="17" r="4"/><path d="M17 15v2l1 1"/></svg></span><span class="service-text"><b>Калькулятор контракта</b><small>Пошлина · НДС · фрахт · маржа · итог</small></span><span class="service-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button><button class="service-card" data-open-view="customsView"><span class="service-icon icon-shield"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z"/><circle cx="12" cy="10" r="2.5"/><path d="M7 19c1-2.5 3-3.5 5-3.5s4 1 5 3.5"/></svg></span><span class="service-text"><b data-i18n="customsTitle">Проверка ТН ВЭД</b><small data-i18n="customsHelp">Пошлина, НДС, маркировка, документы</small></span><span class="service-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>'''

# Вставляем перед </div> закрывающим quick-grid
m = re.search(r'(<button class="service-card"[^>]*data-open-view="news".*?</button>)\s*(</div>)', s, re.S)
if m:
    s = s[:m.end(1)] + NEW_CARDS + s[m.end(1):]
    print('✅ index.html: добавлены карточки Контракт и ТН ВЭД')
else:
    print('⚠️ index.html: не нашёл quick-grid, добавляю после news-карточки')
    s = s.replace('data-open-view="news"', 'data-open-view="contract"', 1)

# 1b. Секция contractView (перед articleView)
CONTRACT_SECTION = '''<section id="contractView" class="view-layer" aria-hidden="true"><div class="contract-shell"><button class="close-button view-close" data-close-view="contractView" data-i18n-aria="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
<div class="contract-head">
  <span class="eyebrow">РАСЧЁТ КОНТРАКТА</span>
  <h2>Импортный калькулятор</h2>
  <p>Полный расчёт сделки: стоимость инвойса, фрахт, пошлины, НДС, таможенный сбор, налоги и маржа.</p>
</div>

<div class="contract-grid">
  <div class="contract-inputs">
    <div class="field"><label>Инвойс, ¥</label><input id="cfInvoice" type="number" min="0" step="100" placeholder="70296"></div>
    <div class="field"><label>ТД, %</label><input id="cfTD" type="number" min="0" step="0.1" placeholder="0"></div>
    <div class="field"><label>Пошлина, %</label><input id="cfDuty" type="number" min="0" step="0.1" placeholder="12.5"></div>
    <div class="field"><label>Фрахт, ¥</label><input id="cfFreight" type="number" min="0" step="100" placeholder="25800"></div>
    <div class="field"><label>Декларант, ₽</label><input id="cfDeclarant" type="number" min="0" step="500" placeholder="25000"></div>
    <div class="field"><label>Страхование, %</label><input id="cfInsurance" type="number" min="0" step="0.01" placeholder="0.15"></div>
    <div class="field"><label>НДС, %</label><input id="cfVAT" type="number" min="0" step="1" placeholder="22"></div>
    <div class="field"><label>Прибыль, ¥</label><input id="cfProfit" type="number" min="0" step="100" placeholder="7519.6"></div>
    <div class="field"><label>Курс юаня, ₽</label><input id="cfRate" type="number" min="0" step="0.0001" placeholder="12.567"></div>
    <div class="field"><label>Комиссия за перевод, %</label><input id="cfTransferFee" type="number" min="0" step="0.1" placeholder="3"></div>
    <div class="field"><label>Налоги, %</label><input id="cfTaxes" type="number" min="0" step="0.1" placeholder="2.2"></div>
  </div>

  <div class="contract-results" id="contractResults">
    <div class="contract-placeholder">Введите данные слева — расчёт появится здесь автоматически</div>
  </div>
</div>

<div class="contract-actions">
  <button id="contractCalc" class="calculate" type="button">Рассчитать</button>
  <button id="contractReset" class="attach-button" type="button">Сбросить</button>
</div>
</div></section>
'''

if 'id="contractView"' not in s:
    s = s.replace('<section id="articleView"', CONTRACT_SECTION + '\n<section id="articleView"', 1)
    print('✅ index.html: добавлена секция contractView')
else:
    print('SKIP: contractView уже есть')

# 1c. Обновляем версии файлов
s = re.sub(r'(styles\.css\?v=)\d{8}', r'\g<1>20260921', s)
s = re.sub(r'(app\.js\?v=)\d{8}', r'\g<1>20260921', s)
s = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>201', s)
s = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>201', s)

open(p, 'w', encoding='utf-8').write(s)
print('✅ index.html → v201')

# ============================================================
# 2. APP.JS — viewMap + логика калькулятора
# ============================================================
p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# 2a. viewMap: добавляем contract
old_vm = "const viewMap = {calculator:'calculatorView',assistant:'assistantView',forwarders:'forwardersView',news:'newsView',article:'articleView',tarotView:'tarotView',customsView:'customsView'};"
new_vm = "const viewMap = {calculator:'calculatorView',assistant:'assistantView',forwarders:'forwardersView',news:'newsView',article:'articleView',tarotView:'tarotView',customsView:'customsView',contract:'contractView'};"
if old_vm in s:
    s = s.replace(old_vm, new_vm, 1)
    print('✅ app.js: viewMap → contract')
elif 'contract:contractView' in s:
    print('SKIP: viewMap уже содержит contract')
else:
    print('⚠️ app.js: viewMap не найден — попробуй вручную добавить contract:contractView')

# 2b. Логика калькулятора — в конец файла
CONTRACT_JS = '''

// ========== Импортный калькулятор контракта ==========
(function(){
  const $id = id => document.getElementById(id);
  const num = v => { const x = Number(String(v||'').replace(/\\s/g,'').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  const fmt = n => { const x = Number(n); if (!Number.isFinite(x)) return '0'; return x.toLocaleString('ru-RU', { maximumFractionDigits: 2 }); };

  function getValues(){
    return {
      invoice:      num($id('cfInvoice')?.value),
      td:           num($id('cfTD')?.value),
      duty:         num($id('cfDuty')?.value),
      freight:      num($id('cfFreight')?.value),
      declarant:    num($id('cfDeclarant')?.value),
      insurance:    num($id('cfInsurance')?.value),
      vat:          num($id('cfVAT')?.value) || 22,
      profit:       num($id('cfProfit')?.value),
      rate:         num($id('cfRate')?.value) || 12.567,
      transferFee:  num($id('cfTransferFee')?.value) || 3,
      taxes:        num($id('cfTaxes')?.value) || 2.2
    };
  }

  // Таможенный сбор по стоимости (рубли) — сетка ФТС
  function customsFee(rub){
    if (!rub) return 0;
    if (rub <= 200000)   return 1231;
    if (rub <= 450000)   return 2462;
    if (rub <= 1200000)  return 4924;
    if (rub <= 2700000)  return 13541;
    if (rub <= 4200000)  return 18465;
    if (rub <= 5500000)  return 21344;
    if (rub <= 10000000) return 49240;
    return 73860;
  }

  function calculate(){
    const v = getValues();
    const invoiceWithTD = v.invoice * (1 + v.td / 100);           // Инвойс + ТД, ¥
    const transferFeeY  = invoiceWithTD * (v.transferFee / 100);  // Комиссия, ¥
    const insuranceY    = v.invoice * (v.insurance / 100);        // Страхование, ¥
    const customsBaseY  = invoiceWithTD + v.freight;              // База ТС, ¥
    const dutyY         = customsBaseY * (v.duty / 100);          // Пошлина, ¥
    const vatBaseY      = customsBaseY + dutyY;                   // База НДС, ¥
    const vatY          = vatBaseY * (v.vat / 100);               // НДС, ¥
    const feeRub        = customsFee(customsBaseY * v.rate);      // Сбор, ₽
    const feeY          = v.rate ? feeRub / v.rate : 0;           // Сбор, ¥
    const customsPayY   = dutyY + vatY + feeY;                    // Таможенные платежи, ¥
    const declarantY    = v.rate ? v.declarant / v.rate : 0;      // Декларант, ¥
    const expensesY     = invoiceWithTD + transferFeeY + v.freight + insuranceY + customsPayY + declarantY;
    const taxesY        = expensesY * (v.taxes / 100);            // Налоги, ¥
    const totalY        = expensesY + v.profit + taxesY;          // Итого, ¥
    const totalRub      = totalY * v.rate;                        // Итого, ₽
    const overhead      = invoiceWithTD ? (totalY - invoiceWithTD) / invoiceWithTD * 100 : 0;

    return { v, invoiceWithTD, transferFeeY, insuranceY, dutyY, vatY, feeY, customsPayY, declarantY, taxesY, totalY, totalRub, overhead };
  }

  function render(){
    const box = $id('contractResults');
    if (!box) return;
    const r = calculate();
    if (!r.invoiceWithTD){
      box.innerHTML = '<div class="contract-placeholder">Введите данные слева — расчёт появится здесь автоматически</div>';
      return;
    }
    const rows = [
      ['Инвойс + ТД',                  r.invoiceWithTD, '¥', ''],
      ['Комиссия за перевод',          r.transferFeeY,  '¥', ''],
      ['Фрахт',                        r.v.freight,     '¥', ''],
      ['Страхование',                  r.insuranceY,    '¥', ''],
      ['Пошлина',                      r.dutyY,         '¥', ''],
      ['НДС',                          r.vatY,          '¥', ''],
      ['Таможенный сбор',              r.feeY,          '¥', ''],
      ['Таможенные платежи (всего)',   r.customsPayY,   '¥', 'accent'],
      ['Декларант',                    r.declarantY,    '¥', ''],
      ['Прибыль',                      r.v.profit,      '¥', ''],
      ['Налоги',                       r.taxesY,        '¥', '']
    ];
    let html = '<div class="contract-table">';
    rows.forEach(function(row){
      html += '<div class="contract-row ' + row[3] + '"><span>' + row[0] + '</span><b>' + fmt(row[1]) + ' ' + row[2] + '</b></div>';
    });
    html += '<div class="contract-row contract-row-total"><span>Итого</span><b>' + fmt(r.totalY) + ' ¥</b></div>';
    html += '<div class="contract-row contract-row-total-rub"><span>Итого, ₽</span><b>' + fmt(r.totalRub) + ' ₽</b></div>';
    html += '<div class="contract-row contract-row-overhead"><span>Накладные расходы</span><b>' + fmt(r.overhead) + ' %</b></div>';
    html += '</div>';
    box.innerHTML = html;
  }

  function init(){
    const ids = ['cfInvoice','cfTD','cfDuty','cfFreight','cfDeclarant','cfInsurance','cfVAT','cfProfit','cfRate','cfTransferFee','cfTaxes'];
    ids.forEach(function(id){ const el = $id(id); if (el) el.addEventListener('input', render); });
    const $c = $id('contractCalc'); if ($c) $c.addEventListener('click', render);
    const $r = $id('contractReset');
    if ($r) $r.addEventListener('click', function(){
      ids.forEach(function(id){ const el = $id(id); if (el) el.value = ''; });
      if ($id('cfVAT')) $id('cfVAT').value = 22;
      if ($id('cfRate')) $id('cfRate').value = 12.567;
      if ($id('cfTransferFee')) $id('cfTransferFee').value = 3;
      if ($id('cfTaxes')) $id('cfTaxes').value = 2.2;
      if ($id('cfInsurance')) $id('cfInsurance').value = 0.15;
      render();
    });
    // Дефолты при первой загрузке
    if ($id('cfVAT') && !$id('cfVAT').value) $id('cfVAT').value = 22;
    if ($id('cfRate') && !$id('cfRate').value) $id('cfRate').value = 12.567;
    if ($id('cfTransferFee') && !$id('cfTransferFee').value) $id('cfTransferFee').value = 3;
    if ($id('cfTaxes') && !$id('cfTaxes').value) $id('cfTaxes').value = 2.2;
    if ($id('cfInsurance') && !$id('cfInsurance').value) $id('cfInsurance').value = 0.15;
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
'''

if 'Импортный калькулятор контракта' in s:
    print('SKIP: логика уже есть')
else:
    s = s.rstrip() + '\n' + CONTRACT_JS
    print('✅ app.js: добавлен калькулятор контракта')

open(p, 'w', encoding='utf-8').write(s)
print('✅ app.js обновлён')

# ============================================================
# 3. STYLES.CSS — стили новой страницы
# ============================================================
p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()

CONTRACT_CSS = '''

/* ==========================================================================
   CONTRACT CALCULATOR (v201)
   ========================================================================== */
.contract-shell {
  --pw: 1080px;
  --pt: 28px;
  --pb: 24px;
  --close-top: 14px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(var(--pw), 100%);
  max-height: 100%;
  min-height: 0;
  padding: var(--pt) 32px var(--pb);
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: var(--r-xl);
  background: var(--panel);
  box-shadow: var(--shadow-lg);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
  opacity: 0;
  transform: translate3d(0, 22px, 0) scale(.985);
  transition: transform var(--t-slow) var(--ease-sheet), opacity var(--t-base) var(--ease);
}
.view-layer.open > .contract-shell { opacity: 1; transform: none; }

.contract-head { margin-bottom: 20px; }
.contract-head h2 {
  margin: 4px 0 6px;
  font-size: var(--fs-xl);
  line-height: var(--lh-tight);
  font-weight: 650;
  letter-spacing: -.03em;
  color: var(--ink);
}
.contract-head p { font-size: var(--fs-base); line-height: var(--lh-body); color: var(--muted); }

.contract-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}
.contract-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  align-content: start;
}
.contract-inputs .field { gap: 4px; }
.contract-inputs .field label { font-size: var(--fs-2xs); font-weight: 600; color: var(--ink-2); letter-spacing: 0; text-transform: none; }
.contract-inputs input { height: 40px; font-size: 14px; font-variant-numeric: tabular-nums; }

.contract-results {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 18px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--blue-soft), var(--teal-soft));
  overflow-y: auto;
  overscroll-behavior: contain;
}
.contract-placeholder { margin: auto; text-align: center; font-size: 14px; line-height: 1.5; color: var(--muted); }

.contract-table { display: flex; flex-direction: column; gap: 2px; }
.contract-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  font-size: 14px;
  line-height: 1.4;
}
.contract-row > span { color: var(--ink-2); }
.contract-row > b { font-weight: 650; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.contract-row.accent { background: rgba(43, 120, 168, .08); }
.contract-row.accent > b { color: var(--blue); }
.contract-row-total {
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line-strong);
  font-size: 16px;
}
.contract-row-total > span { color: var(--ink); font-weight: 700; }
.contract-row-total > b { color: var(--teal); font-size: 20px; font-weight: 700; }
.contract-row-total-rub { padding-top: 2px; font-size: 14px; }
.contract-row-total-rub > span { color: var(--ink-2); font-weight: 600; }
.contract-row-total-rub > b { color: var(--ink); font-size: 15px; }
.contract-row-overhead {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  font-size: 13px;
}
.contract-row-overhead > span { color: var(--muted); }
.contract-row-overhead > b { color: var(--ink-2); }

.contract-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  align-items: stretch;
}
.contract-actions .calculate { flex: 1; }
.contract-actions .attach-button { padding: 0 22px; }

.icon-contract { background: linear-gradient(135deg, var(--blue-soft), var(--teal-soft)); color: var(--teal); }
.icon-shield { background: var(--blue-soft); color: var(--blue); }

@media (max-width: 900px) {
  .contract-shell { --pt: 26px; --pb: 22px; padding: var(--pt) 24px var(--pb); }
  .contract-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .contract-shell {
    width: 100%; height: 100%; max-height: 100%;
    --pt: 22px; --pb: calc(18px + var(--safe-b)); --close-top: 12px;
    padding: var(--pt) 16px var(--pb);
    border-width: 1px 0 0;
    border-radius: 24px 24px 0 0;
    transform: translate3d(0, 44px, 0);
  }
  .contract-head h2 { font-size: 26px; }
  .contract-inputs { grid-template-columns: 1fr; }
  .contract-inputs input { height: 46px; font-size: 16px; }
  .contract-actions { flex-direction: column-reverse; }
  .contract-actions .attach-button { height: 46px; }
}
'''

if '.contract-shell' not in s:
    s = s.rstrip() + '\n' + CONTRACT_CSS
    print('✅ styles.css: добавлены стили калькулятора')
else:
    print('SKIP: стили уже есть')

open(p, 'w', encoding='utf-8').write(s)
print('✅ styles.css обновлён')

print()
print('=' * 50)
print('✅ ГОТОВО')
print('=' * 50)
print()
print('Дальше:')
print('1. Перезапусти сервер (Ctrl+C → node server.js)')
print('2. Safari: Cmd+Option+E → Cmd+R')
print('3. На главной появится карточка «Калькулятор контракта»')
