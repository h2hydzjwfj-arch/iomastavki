/* IOMASTAVKA — «Моя схема ЭТрН»: выбираете схему сделки, сайт показывает цепочку и кого кем указывать.
   Опирается на правила из инструкции, которая уже лежит в разделе ЭТрН:
   грузоотправитель — тот, с кем у перевозчика договор или заявка (экспедитор — только если принял груз во владение и выдал расписку);
   Т1 — грузоотправитель, Т2 — перевозчик при приёме, Т3 — грузополучатель, Т4 — перевозчик после выдачи. */
(function () {
  'use strict';
  var KEY = 'ioma_etrn_my';
  var st = { co: '', cl: '', ca: '', sc: 'nk-we', rasp: false };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var SC = [
    ['nk-we', 'Наш контракт — везём до клиента'],
    ['nk-cl', 'Наш контракт — клиент вывозит с СВХ своим перевозчиком'],
    ['kk-we', 'Контракт клиента — мы организуем доставку по России'],
    ['kk-cl', 'Контракт клиента — клиент вывозит сам']
  ];
  function chain() {
    var co = st.co || 'Ваша компания', cl = st.cl || 'Клиент', ca = st.ca || (st.sc.slice(-2) === 'cl' ? 'Перевозчик клиента (напр. «Деловые Линии»)' : 'Нанятый перевозчик');
    var pre = [
      { t: 'Поставщик в Китае', s: st.sc.indexOf('nk') === 0 ? 'Продаёт товар ' + co : 'Продаёт товар ' + cl, k: 'pre' },
      { t: 'Перевозка до границы РФ', s: 'CMR, ЖД-накладная или коносамент — это не ЭТрН', k: 'pre' },
      { t: 'Таможня и СВХ', s: st.sc.indexOf('nk') === 0 ? 'Декларант — ' + co + ', пошлины и НДС платит ' + co : 'Декларант — ' + cl + ' (подача по ЭЦП клиента или через брокера ' + co + '), платежи — ' + cl, k: 'pre' }
    ];
    var r = {};
    if (st.sc === 'nk-we') r = { go: co, goWhy: 'товар ваш до передачи клиенту, и договор с перевозчиком заключаете вы', car: ca, rec: cl, mine: ['Т1'], note: co + ' в ЭТрН — грузоотправитель и заказчик. После доставки — УПД клиенту по ЭДО.' };
    if (st.sc === 'nk-cl') r = { go: cl, goWhy: 'договор с перевозчиком заключает клиент; вы в ЭТрН не участвуете', car: ca, rec: cl, mine: [], note: co + ' передаёт товар на СВХ по документам продажи (УПД по ЭДО) и даёт доверенность или письмо на выдачу. ЭТрН создаёт клиент или его перевозчик-экспедитор.' };
    if (st.sc === 'kk-we') r = st.rasp
      ? { go: co, goWhy: 'вы приняли груз во владение и выдали экспедиторскую расписку', car: ca, rec: cl, mine: ['Т1'], note: 'Сначала оформите экспедиторскую расписку (это тоже ЭПД), потом ЭТрН.' }
      : { go: cl, goWhy: 'груз во владение вы не принимали, расписку не выдавали — грузоотправитель клиент', car: ca, rec: cl, mine: [], note: co + ' указывается как экспедитор или заказчик перевозки, а не как грузоотправитель. Поручение экспедитору — от клиента.' };
    if (st.sc === 'kk-cl') r = { go: cl, goWhy: 'клиент сам заказывает перевозку', car: ca, rec: cl, mine: [], note: co + ' в ЭТрН не участвует: ваша работа заканчивается выпуском товара.' };
    return { pre: pre, r: r, co: co };
  }
  function draw(box) {
    var c = chain(), r = c.r;
    function who(name) { return name === c.co ? ' et-me' : ''; }
    var h = '<div class="em-pre">' + c.pre.map(function (n) { return '<div class="em-node em-off"><b>' + esc(n.t) + '</b><small>' + esc(n.s) + '</small></div>'; }).join('<i class="em-arr"></i>') + '</div>';
    h += '<div class="em-line"><span>Дальше — перевозка по России, здесь нужна ЭТрН</span></div>';
    h += '<div class="em-etrn">'
      + '<div class="em-node' + who(r.go) + '"><em>Грузоотправитель · Т1</em><b>' + esc(r.go) + '</b><small>Создаёт ЭТрН и подписывает Титул 1: ' + esc(r.goWhy) + '.</small></div><i class="em-arr"></i>'
      + '<div class="em-node' + who(r.car) + '"><em>Перевозчик · Т2 и Т4</em><b>' + esc(r.car) + '</b><small>Т2 — при погрузке на СВХ после проверки груза; Т4 — после выдачи груза.</small></div><i class="em-arr"></i>'
      + '<div class="em-node' + who(r.rec) + '"><em>Грузополучатель · Т3</em><b>' + esc(r.rec) + '</b><small>Подписывает при приёмке и вносит замечания по грузу.</small></div></div>';
    h += '<div class="em-diadoc"><b>В Диадок Логистике</b><ol>'
      + (r.mine.length ? '<li>Создаёт документ «Транспортная накладная» <b>' + esc(c.co) + '</b> — от имени грузоотправителя.</li>' : '<li>' + esc(c.co) + ' документ <b>не создаёт</b> — его создаёт ' + esc(r.go) + '.</li>')
      + '<li>Грузоотправитель — <b>' + esc(r.go) + '</b>; перевозчик — <b>' + esc(r.car) + '</b>; грузополучатель — <b>' + esc(r.rec) + '</b>.</li>'
      + '<li>Пункт погрузки — адрес СВХ, пункт выгрузки — склад получателя.</li>'
      + '<li>Подписывает руководитель (УКЭП) или сотрудник по КЭП физлица с МЧД.</li></ol>'
      + '<p>' + esc(r.note) + '</p></div>';
    h += '<p class="em-caveat">Схема по общим правилам из инструкции этого раздела. Если в договоре роли распределены иначе, ориентируйтесь на договор и уточните у оператора ЭДО.</p>';
    box.querySelector('.em-out').innerHTML = h;
  }
  function mount() {
    var root = document.getElementById('etrnRoot'); if (!root || root.querySelector('.em-card')) return;
    var shell = root.querySelector('.et-head'); if (!shell) return;
    var card = document.createElement('section'); card.className = 'em-card';
    card.innerHTML = '<div class="em-h"><b>Моя схема</b><small>Выберите схему сделки — покажем, кого кем отмечать в ЭТрН</small></div>'
      + '<div class="em-sc" role="radiogroup">' + SC.map(function (s) { return '<button type="button" role="radio" data-sc="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>'
      + '<div class="em-f"><label><span>Ваша компания</span><input data-k="co" placeholder="ООО «…»" autocomplete="organization"></label><label><span>Клиент</span><input data-k="cl" placeholder="ИП Краснов"></label><label><span>Перевозчик</span><input data-k="ca" placeholder="Деловые Линии, ТК …"></label></div>'
      + '<label class="em-rasp"><input type="checkbox" data-k="rasp"> Принимаем груз во владение и выдаём экспедиторскую расписку</label>'
      + '<div class="em-out"></div>';
    shell.insertAdjacentElement('afterend', card);
    function sync() {
      card.querySelectorAll('[data-sc]').forEach(function (b) { var on = b.dataset.sc === st.sc; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      card.querySelector('.em-rasp').hidden = st.sc !== 'kk-we';
      draw(card);
    }
    card.querySelectorAll('input[data-k]').forEach(function (i) {
      if (i.type === 'checkbox') i.checked = !!st[i.dataset.k]; else i.value = st[i.dataset.k] || '';
      i.addEventListener('input', function () { st[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value.trim(); save(); sync(); });
      i.addEventListener('change', function () { st[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value.trim(); save(); sync(); });
    });
    card.addEventListener('click', function (e) { var b = e.target.closest('[data-sc]'); if (!b) return; st.sc = b.dataset.sc; save(); sync(); });
    sync();
  }
  function watch() {
    var root = document.getElementById('etrnRoot'); if (!root) return;
    new MutationObserver(function () { mount(); }).observe(root, { childList: true });
    mount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
