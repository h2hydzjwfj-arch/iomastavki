const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// --- UI helpers: icons, toasts, understandable errors -----------------------
const ICONS = {
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  map:'<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v12.5"/>',
  ship:'<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.9 5.3 2.8 7.8"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4M12 2v3"/>',
  train:'<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1M15 15l1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3M16 19l2 3"/>',
  truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  sparkle:'<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'
};
function ico(name, cls = ''){ return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>'; }

function toast(msg, type = 'info', ms = 3800){
  let host = document.getElementById('toastHost');
  if (!host){
    host = document.createElement('div');
    host.id = 'toastHost'; host.className = 'toast-host';
    host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = ico(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info') + '<span></span>';
  t.lastChild.textContent = msg;
  host.appendChild(t);
  while (host.children.length > 3) host.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

function friendlyError(e){
  const m = String((e && e.message) || e || '');
  const L = (typeof lang !== 'undefined' && lang) || 'ru';
  const T = {
    net: {ru:'Нет связи с сервером. Проверьте интернет и повторите попытку.', en:'No connection to the server. Check your internet and try again.', tr:'Sunucuya bağlanılamadı. İnternetinizi kontrol edip tekrar deneyin.', zh:'无法连接服务器，请检查网络后重试。'},
    generic: {ru:'Что-то пошло не так. Повторите попытку.', en:'Something went wrong. Please try again.', tr:'Bir şeyler ters gitti. Lütfen tekrar deneyin.', zh:'出了点问题，请重试。'}
  };
  if (/failed to fetch|networkerror|load failed|network request failed|fetch/i.test(m) || (typeof navigator !== 'undefined' && navigator.onLine === false)) return T.net[L] || T.net.ru;
  return m.trim() || T.generic[L] || T.generic.ru;
}

// --- Загрузка КП / ставок из файла в калькуляторе ---
(function(){
  const fileInput = document.getElementById('rateFileUpload');
  const statusEl = document.getElementById('rateUploadStatus');
  if(!fileInput) return;
  const setStatus = (t, kind) => { if(!statusEl) return; statusEl.textContent = t; statusEl.classList.toggle('is-ok', kind === 'ok'); statusEl.classList.toggle('is-error', kind === 'error'); };
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    setStatus('Обрабатываю КП… Это может занять до 15 секунд.');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/rates/import', { method: 'POST', body: formData });
      const d = await r.json();
      if (r.ok && d.ok) {
        setStatus('');
        toast('Ставки добавлены: ' + (d.added || 0), 'success');
        try { await loadRates(); } catch(_) {}
      } else {
        throw new Error(d.error || 'Не удалось загрузить файл');
      }
    } catch (err) {
      setStatus('');
      toast(friendlyError(err), 'error', 5200);
    } finally {
      fileInput.value = '';
    }
  });
})();


// HARDENED UI BOOT: these handlers are intentionally independent from the rest of the app.
// If an optional module fails later, the core windows, close buttons and theme controls still work.
(() => {
  const viewMap = {calculator:'calculatorView',assistant:'assistantView',forwarders:'forwardersView',news:'newsView',article:'articleView',tarotView:'tarotView',customsView:'customsView',request:'requestView'};
  const open = (name) => {
    const id=viewMap[name]; if(!id) return false;
    const target=document.getElementById(id); if(!target) return false;
    document.querySelectorAll('.view-layer').forEach(v=>{v.classList.remove('open');v.setAttribute('aria-hidden','true')});
    target.classList.add('open'); target.setAttribute('aria-hidden','false'); document.body.classList.add('view-open');
    try{ if(!window.__iomaPushed){ history.pushState({ioma:1},''); window.__iomaPushed = true; } }catch(e){}
        // Отрисовка содержимого при открытии вида
    try {
      if (name === 'forwarders' && typeof renderDirectory === 'function') renderDirectory();
      if (name === 'news' && typeof loadNews === 'function') loadNews();
      if (name === 'assistant') setTimeout(function(){ document.getElementById('assistantInput')?.focus(); }, 120);
      if (name === 'customsView') setTimeout(function(){ document.getElementById('customsCode')?.focus(); }, 120);
    } catch (err) { console.warn('view render:', err); }
    return true;
  };
  const close = () => { document.querySelectorAll('.view-layer').forEach(v=>{v.classList.remove('open');v.setAttribute('aria-hidden','true')}); document.body.classList.remove('view-open'); if(window.__iomaPushed){ window.__iomaPushed = false; try{ if(history.state && history.state.ioma) history.back(); }catch(e){} } };
  window.addEventListener('popstate', () => { if(window.__iomaPushed){ window.__iomaPushed = false; close(); } });
  window.__iomaOpenView=open; window.__iomaCloseViews=close;
  document.addEventListener('click',(e)=>{
    const trigger=e.target.closest?.('[data-open-view]');
    if(trigger){ const name=trigger.getAttribute('data-open-view'); if(open(name)){e.preventDefault();e.stopPropagation();return;} }
    const closeBtn=e.target.closest?.('[data-close-view],.view-close');
    const tarotOpen = document.getElementById('tarotView')?.classList.contains('open');
    if(closeBtn){ if(tarotOpen&&typeof closeTarot==='function')closeTarot(); else close(); e.preventDefault(); e.stopPropagation(); return; }
    if(e.target.classList?.contains('tarot-shell')){ if(typeof closeTarot==='function')closeTarot(); else close(); return; }
    if(e.target.classList?.contains('view-layer') && e.target.classList.contains('open')){close();}
  }, true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  // Always show a useful last-resort currency until the live CBR request completes.
  const seed=()=>{
    const values={homeCny:'12.5353',homeUsd:'84.3363',homeEur:'97.7626',cnyRate:'12.5353',usdRate:'84.3363',eurRate:'97.7626'};
    Object.entries(values).forEach(([id,val])=>{const el=document.getElementById(id);if(el && (!el.textContent || el.textContent==='—'))el.textContent=val});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',seed,{once:true}); else seed();
})();

const I18N = {
  ru:{title:'Расчёт ставки',tarotLabel:'Карта дня',navTarot:'Карта дня',navTheme:'Тема',navRates:'Ставки',navCustoms:'Таможня',from:'Откуда',to:'Куда',cargo:'ГРУЗ',weight:'Вес, кг',pieces:'Количество мест',distance:'Расстояние, км',auto:'Автоматически',dimensions:'ГАБАРИТЫ ОДНОГО МЕСТА',volumeAll:'Объём — по всем местам',length:'Длина',width:'Ширина',height:'Высота',forwarder:'Экспедитор',transport:'Вид транспорта',incoterms:'Условия поставки',dimWeight:'Объёмный вес',chooseForwarder:'Выберите экспедитора',chooseTransport:'Выберите транспорт',selected:'ЭКСПЕДИТОР',none:'Не выбран',calculate:'Рассчитать',agents:'Экспедиторы',assistant:'ИИ-ассистент',assistantSub:'Спросите что угодно по логистике',assistantHelp:'Можно писать обычным языком: маршрут, ставка, Incoterms, таможня, расчёт веса или новая ставка.',send:'Отправить',news:'Новости',newsSub:'Логистика · Китай · Таможня',logout:'Выйти',thinking:'Думаю над вашим ответом…',aiOff:'ИИ не подключён. Добавьте OPENAI_API_KEY в Render.',newsLoading:'Загружаю новости…',noNews:'Новости пока недоступны.',weatherError:'Погода временно недоступна.',todayDate:'15.09.2026 г.',home:'Главная',heroEyebrow:'ЛОГИСТИКА · КИТАЙ → РОССИЯ',heroText:'Точный расчёт. Умный помощник.\nВсё необходимое для работы с грузом — в одном месте.',tileRates:'Расчёт ставок',tileRatesSub:'Маршрут, ставка и транспорт',tileAI:'ИИ-ассистент',tileAISub:'Текстом или голосом',tileAgents:'Экспедиторы',tileAgentsSub:'Контакты и направления перевозок',tileNews:'Новости ВЭД',tileNewsSub:'Китай · логистика · таможня',directoryEyebrow:'СПРАВОЧНИК',directorySub:'Поставщики и контакты по направлениям.',intelligence:'ИНТЕЛЛЕКТ',assistantSub2:'Логистика, расчёты и ВЭД — голосом или текстом.',attach:'Файл',fileHint:'Файл можно добавить вместе с сообщением',voice:'Микрофон',intelligenceFeed:'ИНФОРМАЦИОННАЯ ЛЕНТА',newsSub2:'Китай · логистика · таможня',chargeWeight:'Расчётный вес',company:'Компания',contact:'Контакт',phone:'Телефон',email:'Email',website:'Сайт',directions:'Направления',note:'Примечание',all:'Все',close:'Закрыть',weatherUpdating:'',distanceWaiting:'',autoByTransport:'Автоматически по транспорту',transportRail:'ЖД',transportRoad:'Авто',transportAir:'Авиа',transportSea:'Море',transportMulti:'Море + ЖД',menu:'Меню',ready:'Готов к разговору',listen:'Слушаю…',transcribe:'Расшифровываю…',recognized:'Речь распознана',fail:'Не удалось распознать голос',mic:'Нет доступа к микрофону',unavailable:'Голос недоступен',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'ЦБ РФ',articleLoading:'Готовлю статью…',articleError:'Не удалось подготовить статью.',articleListen:'Аудиоподкаст',articlePlay:'Слушать',articlePause:'Пауза',articleSource:'Материал подготовлен на основе новости',articleBack:'К новостям',autoVolumeLabel:'Объём',autoVolumetricLabel:'Объёмный вес',factorLabel:'Фактор',themeLight:'Светлая тема',themeDark:'Тёмная тема',themeToggle:'Сменить тему',customsEyebrow:'ТАМОЖЕННЫЙ КОНТРОЛЬ',customsTitle:'Проверка ТН ВЭД',customsHelp:'Укажите код ТН ВЭД ЕАЭС — я автоматически проверю пошлину, НДС, сборы, маркировку и другие меры.',customsPlaceholder:'Например, 8467890000',customsCheck:'Проверить код'},

  tr:{title:'Navlun Hesaplama',tarotLabel:'Günün kartı',navTarot:'Kart',navTheme:'Tema',navRates:'Navlun',navCustoms:'Gümrük',from:'Nereden',to:'Nereye',cargo:'KARGO',weight:'Ağırlık, kg',pieces:'Parça sayısı',distance:'Mesafe, km',auto:'Otomatik',dimensions:'TEK PARÇA ÖLÇÜLERİ',volumeAll:'Hacim — tüm parçalar',length:'Uzunluk',width:'Genişlik',height:'Yükseklik',forwarder:'Forwarder',transport:'Taşıma şekli',incoterms:'Teslim şekli',dimWeight:'Hacimsel ağırlık',chooseForwarder:'Forwarder seçin',chooseTransport:'Taşıma şeklini seçin',selected:'FORWARDER',none:'Seçilmedi',calculate:'Hesapla',agents:'Forwarderlar',assistant:'Yapay zekâ asistanı',assistantSub:'Lojistik hakkında sorun',assistantHelp:'Rota, navlun, Incoterms, gümrük, ağırlık hesabı veya yeni bir fiyatı doğal dille yazabilirsiniz.',send:'Gönder',news:'Haberler',newsSub:'Lojistik · Çin · Gümrük',logout:'Çıkış',thinking:'Yanıt hazırlanıyor…',aiOff:'Yapay zekâ bağlı değil. Render üzerinde OPENAI_API_KEY ekleyin.',newsLoading:'Haberler yükleniyor…',noNews:'Haberler şu anda kullanılamıyor.',weatherError:'Hava durumu geçici olarak kullanılamıyor.',todayDate:'15.09.2026',home:'Ana sayfa',heroEyebrow:'LOJİSTİK · ÇİN → RUSYA',heroText:'Doğru hesaplama. Akıllı asistan.\nKargo operasyonu için gereken her şey tek yerde.',tileRates:'Navlun hesaplama',tileRatesSub:'Rota, fiyat ve taşıma şekli',tileAI:'Yapay zekâ asistanı',tileAISub:'Metin veya ses',tileAgents:'Forwarderlar',tileAgentsSub:'İletişim bilgileri ve taşıma yönleri',tileNews:'Dış ticaret haberleri',tileNewsSub:'Çin · lojistik · gümrük',directoryEyebrow:'REHBER',directorySub:'Taşıma yönlerine göre tedarikçiler ve iletişim bilgileri.',intelligence:'ZEKA',assistantSub2:'Lojistik, hesaplamalar ve dış ticaret — sesli veya yazılı.',attach:'Dosya',fileHint:'Mesajınıza dosya ekleyebilirsiniz',voice:'Mikrofon',intelligenceFeed:'BİLGİ AKIŞI',newsSub2:'Çin · lojistik · gümrük',chargeWeight:'Hesaplanan ağırlık',company:'Şirket',contact:'Yetkili',phone:'Telefon',email:'E-posta',website:'Web sitesi',directions:'Yönler',note:'Not',all:'Tümü',close:'Kapat',weatherUpdating:'',distanceWaiting:'',autoByTransport:'Taşıma şekline göre otomatik',transportRail:'Demiryolu',transportRoad:'Karayolu',transportAir:'Hava yolu',transportSea:'Deniz yolu',transportMulti:'Deniz + Demiryolu',menu:'Menü',ready:'Konuşmaya hazır',listen:'Dinliyorum…',transcribe:'Yazıya dökülüyor…',recognized:'Konuşma algılandı',fail:'Ses tanınamadı',mic:'Mikrofon erişimi yok',unavailable:'Ses kullanılamıyor',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'Rusya Merkez Bankası',articleLoading:'Makale hazırlanıyor…',articleError:'Makale hazırlanamadı.',articleListen:'Sesli podcast',articlePlay:'Dinle',articlePause:'Duraklat',articleSource:'Seçilen haber temel alınarak hazırlandı',articleBack:'Haberlere dön',autoVolumeLabel:'Hacim',autoVolumetricLabel:'Hacimsel ağırlık',factorLabel:'Faktör',themeLight:'Açık tema',themeDark:'Koyu tema',themeToggle:'Temayı değiştir',customsEyebrow:'GÜMRÜK KONTROLÜ',customsTitle:'GTİP KODU KONTROLÜ',customsHelp:'EAEU GTİP kodunu girin — gümrük vergisi, KDV, gümrük harçları, işaretleme ve diğer önlemler otomatik olarak kontrol edilir.',customsPlaceholder:'Örneğin 8467890000',customsCheck:'Kodu kontrol et'},  en:{title:'Rate calculation',tarotLabel:'Card of the day',navTarot:'Card',navTheme:'Theme',navRates:'Rates',navCustoms:'Customs',from:'From',to:'To',cargo:'CARGO',weight:'Weight, kg',pieces:'Pieces',distance:'Distance, km',auto:'Automatic',dimensions:'DIMENSIONS OF ONE PIECE',volumeAll:'Volume — all pieces',length:'Length',width:'Width',height:'Height',forwarder:'Forwarder',transport:'Transport',incoterms:'Incoterms',dimWeight:'Volumetric weight',chooseForwarder:'Choose forwarder',chooseTransport:'Choose transport',selected:'FORWARDER',none:'Not selected',calculate:'Calculate',agents:'Forwarders',assistant:'AI assistant',assistantSub:'Ask anything about logistics',assistantHelp:'Write naturally: route, rate, Incoterms, customs, weight calculation or a new rate.',send:'Send',news:'News',newsSub:'Logistics · China · Customs',logout:'Log out',thinking:'Thinking about your answer…',aiOff:'AI is not connected. Add OPENAI_API_KEY in Render.',newsLoading:'Loading news…',noNews:'News are temporarily unavailable.',weatherError:'Weather is temporarily unavailable.',todayDate:'15.09.2026',home:'Home',heroEyebrow:'LOGISTICS · CHINA → RUSSIA',heroText:'Precise calculation. Smart assistant.\nEverything you need for cargo work — in one place.',tileRates:'Rate calculation',tileRatesSub:'Route, rate and transport',tileAI:'AI assistant',tileAISub:'Text or voice',tileAgents:'Forwarders',tileAgentsSub:'Contacts and transport directions',tileNews:'Trade news',tileNewsSub:'China · logistics · customs',directoryEyebrow:'DIRECTORY',directorySub:'Suppliers and contacts by transport direction.',intelligence:'INTELLIGENCE',assistantSub2:'Logistics, rates and foreign trade — by voice or text.',attach:'File',fileHint:'Attach a file with your message',voice:'Microphone',intelligenceFeed:'NEWS FEED',newsSub2:'China · logistics · customs',chargeWeight:'Chargeable weight',company:'Company',contact:'Contact',phone:'Phone',email:'Email',website:'Website',directions:'Directions',note:'Note',all:'All',close:'Close',weatherUpdating:'',distanceWaiting:'',autoByTransport:'Automatic by transport',transportRail:'Rail',transportRoad:'Road',transportAir:'Air',transportSea:'Sea',transportMulti:'Sea + Rail',menu:'Menu',ready:'Ready to talk',listen:'Listening…',transcribe:'Transcribing…',recognized:'Speech recognized',fail:'Could not recognize speech',mic:'Microphone access denied',unavailable:'Voice unavailable',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'CBR',articleLoading:'Preparing article…',articleError:'Could not prepare the article.',articleListen:'Audio podcast',articlePlay:'Listen',articlePause:'Pause',articleSource:'Prepared from the selected news item',articleBack:'Back to news',autoVolumeLabel:'Volume',autoVolumetricLabel:'Volumetric weight',factorLabel:'Factor',themeLight:'Light theme',themeDark:'Dark theme',themeToggle:'Switch theme',customsEyebrow:'CUSTOMS CONTROL',customsTitle:'HS / TN VED CHECK',customsHelp:'Enter the EAEU TN VED code — I will automatically check duty, VAT, customs fees, marking and other measures.',customsPlaceholder:'For example, 8467890000',customsCheck:'Check code'},
  zh:{title:'运价计算',tarotLabel:'今日卡牌',navTarot:'卡片',navTheme:'主题',navRates:'运价',navCustoms:'海关',from:'起运地',to:'目的地',cargo:'货物',weight:'重量，公斤',pieces:'件数',distance:'距离，公里',auto:'自动',dimensions:'单件尺寸',volumeAll:'体积 — 所有件',length:'长度',width:'宽度',height:'高度',forwarder:'货运代理',transport:'运输方式',incoterms:'贸易术语',dimWeight:'体积重量',chooseForwarder:'选择货运代理',chooseTransport:'选择运输方式',selected:'货运代理',none:'未选择',calculate:'计算',agents:'货运代理',assistant:'AI 助手',assistantSub:'咨询物流问题',assistantHelp:'可以直接输入路线、运价、贸易术语、清关或体积重量问题。',send:'发送',news:'新闻',newsSub:'物流 · 中国 · 海关',logout:'退出',thinking:'正在组织答案…',aiOff:'AI 尚未连接。请在 Render 添加 OPENAI_API_KEY。',newsLoading:'正在加载新闻…',noNews:'暂时没有新闻。',weatherError:'天气暂时不可用。',todayDate:'15.09.2026',home:'首页',heroEyebrow:'物流 · 中国 → 俄罗斯',heroText:'精准报价。智能助手。\n货运工作所需的一切，都在这里。',tileRates:'运价计算',tileRatesSub:'路线、运价和运输方式',tileAI:'AI 助手',tileAISub:'文字或语音',tileAgents:'货运代理',tileAgentsSub:'联系方式和运输方向',tileNews:'外贸新闻',tileNewsSub:'中国 · 物流 · 海关',directoryEyebrow:'通讯录',directorySub:'按运输方向查看供应商和联系方式。',intelligence:'智能',assistantSub2:'物流、运价和外贸 — 支持语音或文字。',attach:'文件',fileHint:'可以随消息添加文件',voice:'麦克风',intelligenceFeed:'资讯',newsSub2:'中国 · 物流 · 海关',chargeWeight:'计费重量',company:'公司',contact:'联系人',phone:'电话',email:'邮箱',website:'网站',directions:'运输方向',note:'备注',all:'全部',close:'关闭',weatherUpdating:'',distanceWaiting:'',autoByTransport:'根据运输方式自动计算',transportRail:'铁路',transportRoad:'公路',transportAir:'空运',transportSea:'海运',transportMulti:'海运 + 铁路',menu:'菜单',ready:'准备好开始对话',listen:'正在听…',transcribe:'正在转写…',recognized:'已识别语音',fail:'无法识别语音',mic:'没有麦克风权限',unavailable:'语音不可用',currencyCny:'CNY',currencyUsd:'USD',currencyEur:'EUR',oneCny:'1 CNY',oneUsd:'1 USD',oneEur:'1 EUR',cbr:'中国人民银行',articleLoading:'正在准备文章…',articleError:'无法生成文章。',articleListen:'音频播客',articlePlay:'播放',articlePause:'暂停',articleSource:'根据所选新闻整理',articleBack:'返回新闻',autoVolumeLabel:'体积',autoVolumetricLabel:'体积重量',factorLabel:'换算系数',themeLight:'浅色主题',themeDark:'深色主题',themeToggle:'切换主题',customsEyebrow:'海关监管',customsTitle:'海关编码检查',customsHelp:'输入欧亚经济联盟海关编码 — 自动检查关税、增值税、海关费用、商品标记和其他措施。',customsPlaceholder:'例如 8467890000',customsCheck:'检查编码'}
};

const modes={air:{ru:'Авиа',en:'Air',zh:'空运',factor:167},road:{ru:'Авто',en:'Road',zh:'公路',factor:400},rail:{ru:'ЖД',en:'Rail',zh:'铁路',factor:500},sea:{ru:'Море',en:'Sea',zh:'海运',factor:1000},multimodal:{ru:'Море + ЖД',en:'Sea + Rail',zh:'海运+铁路',factor:1000}};
const modeGroups=[['rail','transportRail'],['road','transportRoad'],['air','transportAir'],['sea','transportSea'],['multimodal','transportMulti']];
let lang=localStorage.getItem('iomastavka_lang')||'ru';
let rates={}; let currentArticleNews=null; let selectedForwarder=''; let selectedMode=''; let selectedFactor=167;
let selectedCities={from:null,to:null};
let dimensionUnit='mm';
let agentDirectory=[{"id":1,"company":"Multiwell","contact":"Kane","phone":"8 616 608 738 886","email":"sales344@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":2,"company":"Multiwell","contact":"Sakiya","phone":"8 619 860 070 462","email":"sales242@multiwell.net","site":"www.multiwell.net","modes":["rail","road","sea"],"transport":["Прямое Ж/Д","Авто","Море"],"notes":"Сборные груза"},{"id":3,"company":"CR FREIGHT","contact":"Ирина Андреева","phone":"8 911 195 62 31","email":"andreeva@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":4,"company":"CR FREIGHT","contact":"Ella и другие","phone":"","email":"cs19@crfreight.cn, ella@crfreight.cn, sr16@crfreight.cn","site":"","modes":["air"],"transport":["Авиа"],"notes":"Опасный"},{"id":5,"company":"TRANSIT, LLC","contact":"Konstantin Leonov","phone":"8 914 791 87 81","email":"k.leonov@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":6,"company":"TRANSIT, LLC","contact":"Tatyana Iskaleeva","phone":"8 908 450 11 98","email":"t.iskaleeva@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":7,"company":"TRANSIT, LLC","contact":"","phone":"","email":"directrail@transitllc.ru","site":"www.transitllc.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России"},{"id":8,"company":"Русмарин","contact":"Евгений Ермоленко","phone":"8 921 401 61 29","email":"evermolenko@rusmarine.ru","site":"www.rusmarine.ru","modes":["rail","road","air","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Авиа","Море","Море + Ж/Д"],"notes":"Сборные груза"},{"id":9,"company":"Qtavia","contact":"Anastasiia Snatkina","phone":"86 131 499 21 667","email":"a.snatkina@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":10,"company":"Qtavia","contact":"Linara Iliazova","phone":"8 936 131 23 25","email":"linara.iliazova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":11,"company":"Qtavia","contact":"Naida Azadova","phone":"8 986 749 55 92","email":"naida.azadova@qtavia.com","site":"https://qtavia.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":12,"company":"ФЛГ","contact":"Александр Токарев","phone":"8 906 238 85 17","email":"sales@flgrussia.com","site":"https://flgrussia.com/","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":13,"company":"РусКарго","contact":"Alina Karpova","phone":"8 981 930 24 66","email":"kas@r-cargo.com","site":"https://r-cargo.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":14,"company":"YM Trans Group","contact":"Милена Никитина","phone":"8 925 988 65 99","email":"982@ymtrans.ru","site":"www.ymtrans.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":""},{"id":15,"company":"JENTY","contact":"Marina Kostukovich","phone":"375 29 192 46 69","email":"m.kostukovich@jenty-spedition.com","site":"https://jenty-spedition.ru/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза"},{"id":16,"company":"Consolidator-DV LLC","contact":"Timofei Bakanovich","phone":"8 964 432 57 95","email":"import5@consolidator-dv.ru","site":"http://consolidator-dv.ru/","modes":["sea"],"transport":["Море"],"notes":"Сборные груза"},{"id":17,"company":"ТАМГА","contact":"Осипов Николай","phone":"8 985 279 69 39","email":"n.osipov@tamga80.ru","site":"https://tamga80.ru/ru","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Негабарит"},{"id":18,"company":"Green Avia","contact":"Kuzmina Maria","phone":"8 936 506 11 15","email":"sales3@avia-dostavka.com","site":"https://avia-dostavka.com/","modes":["air"],"transport":["Авиа"],"notes":""},{"id":19,"company":"Sky Cargo Service","contact":"Ekaterina Ivanova","phone":"8 913 061 71 56","email":"sales10@scs-aero.ru","site":"www.scs-aero.ru","modes":["air"],"transport":["Авиа"],"notes":""},{"id":20,"company":"Альфа Транзит","contact":"Щепина Виктория","phone":"8 916 894 05 20","email":"v.shchepina@alfa-transit.com","site":"www.alfa-transit.com","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":21,"company":"Шатл Логистик / Shuttle-Logistic","contact":"Братасенко Михаил","phone":"8 999 614 64 92","email":"mb@shuttle-logistic.ru","site":"www.shuttle-logistic.ru","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит, Опасный"},{"id":22,"company":"Chengdu Tiechi Silk Road Supply Chain Management","contact":"Lily","phone":"8 619 115 959 752","email":"lily@tsrscm.com","site":"http://tsrscm.com/ru/","modes":["rail"],"transport":["Прямое Ж/Д"],"notes":"Сборные груза"},{"id":23,"company":"GUANGZHOU ETY TRANS INTERNATIONAL FREIGHT FORWARDING","contact":"Vera Yao","phone":"8 615 999 941 607","email":"vera@cnetytrans.com","site":"www.cnetytrans.com","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":""},{"id":24,"company":"A2","contact":"Микулин Владимир","phone":"8 913 061 71 56","email":"v.mikulin@a2-express.com","site":"a2-express.com","modes":["air"],"transport":["Авиа"],"notes":""},{"id":25,"company":"RUTENSIL Logistics","contact":"Алина","phone":"8 906 351 17 33","email":"108@rutensil.com","site":"http://rutensil.com/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Европа"},{"id":26,"company":"ВТХ","contact":"Станислав","phone":"8 914 077 79 26","email":"vthopr4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":27,"company":"ВТХ","contact":"Алексей","phone":"8 914 704 43 41","email":"sales4@vostoktransholding.ru","site":"http://vostoktransholding.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Сборные груза, США, Европа"},{"id":28,"company":"Chongqing Gudali Supply Chain Management","contact":"Logan","phone":"8 613 827 428 296","email":"logan@gdl-rail.com","site":"logan@gdl-rail.com","modes":["rail","road"],"transport":["Прямое Ж/Д","Авто"],"notes":"Сборные груза"},{"id":29,"company":"Вэй Трейд","contact":"Рукосуева Евгения Олеговна","phone":"8 902 981 11 04","email":"e.rukosueva@way-trade.ru","site":"https://way-trade.ru/","modes":["rail","road","multimodal"],"transport":["Прямое Ж/Д","Авто","Море + Ж/Д"],"notes":""},{"id":30,"company":"WAY GROUP","contact":"Общий","phone":"8 800 600 04 30","email":"info@wayg.ru","site":"https://www.wayg.ru/","modes":["rail","road","sea","multimodal"],"transport":["Прямое Ж/Д","Авто","Море","Море + Ж/Д"],"notes":"Сборные груза, Негабарит"},{"id":31,"company":"ФИТ, Владивосток","contact":"Маргарита","phone":"8-800-23-444-99 ext. 41501; +7-914-794-20-89","email":"NNKuznetsova@fesco.com","site":"https://www.fesco.ru/ru/","modes":["rail","sea","multimodal"],"transport":["Прямое Ж/Д","Море","Море + Ж/Д"],"notes":"Сборные груза, Ж/Д по России, Негабарит"},{"id":32,"company":"Нью Вэй Лоджистик","contact":"Боев Сергей","phone":"8 914 320 65 95","email":"310@newwaylogistic.ru","site":"https://newwaylogistic.ru/","modes":["sea","multimodal"],"transport":["Море","Море + Ж/Д"],"notes":"Ж/Д по России, Опасный"},{"id":33,"company":"ВЕЛЕС","contact":"Венера Рашидова","phone":"8 918 418 69 82","email":"operative2@velesforwarding.ru","site":"www.velesforwarding.ru","modes":["sea"],"transport":["Море"],"notes":"Новороссийск, Негабарит, Опасный"},{"id":34,"company":"ГАЛЕАС","contact":"Роман","phone":"8 961 520 31 25","email":"r.kuznetsov@galeasgroup.ru","site":"https://galeasgroup.ru/","modes":["sea"],"transport":["Море"],"notes":"Новороссийск"},{"id":35,"company":"Znylogistics","contact":"Maya","phone":"","email":"operator01@znylogistics.com","site":"","modes":["road"],"transport":["Авто"],"notes":"Турция"},{"id":36,"company":"РТТК","contact":"Алексей Веслополов (Чита)","phone":"8 3022 21 18 18; 8 914 464 23 32","email":"rttk888@mail.ru","site":"https://www.rttk.net/","modes":["rail","road"],"transport":["Ж/Д","Авто"],"notes":"Негабарит, Россия, Китай"},{"id":37,"company":"Tu-Tell","contact":"Вадим","phone":"375 33 3071468","email":"t14@tutell.com","site":"https://www.tutell.com/","modes":["road"],"transport":["Авто"],"notes":"Сборные груза, Турция, Европа"},{"id":38,"company":"СДЕК","contact":"Палащук Владислав Сергеевич","phone":"8 924 697 72 73","email":"v.palashchuk@cdek.ru","site":"www.cdek.ru","modes":["road"],"transport":["Мелкие груза"],"notes":"Китай"},{"id":39,"company":"ИП Полчанинов Кирилл Александрович","contact":"Кирилл","phone":"7 925 991 25 75","email":"pka666@yandex.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина 42-43 куб.м."],"notes":"Россия, Москва, МО"},{"id":40,"company":"ИП Диана Куркина","contact":"Евгений","phone":"7 962 936 27 08","email":"yevgeniy-kurkin@mail.ru","site":"","modes":["road"],"transport":["Автовывоз с СВХ, машина до 18 куб.м."],"notes":"Россия, Москва, МО"},{"id":41,"company":"Автовывоз — Алексей","contact":"Алексей","phone":"7 985 227 06 67","email":"","site":"","modes":["road"],"transport":["Автовывоз с СВХ, более 20 куб.м."],"notes":"Россия, Москва, МО"}];
let chatHistory=[];

// Быстрый локальный справочник. Он работает мгновенно и не ждёт API.
const cities=[
['Иу','Yiwu','义乌','Jinhua','China','cn'],['Циндао','Qingdao','青岛','Shandong','China','cn'],['Цзинань','Jinan','济南','Shandong','China','cn'],['Цзиньхуа','Jinhua','金华','Zhejiang','China','cn'],['Цзиньчжоу','Jinzhou','锦州','Liaoning','China','cn'],['Цзянмэнь','Jiangmen','江门','Guangdong','China','cn'],['Цзюцзян','Jiujiang','九江','Jiangxi','China','cn'],['Цицикар','Qiqihar','齐齐哈尔','Heilongjiang','China','cn'],['Цанчжоу','Cangzhou','沧州','Hebei','China','cn'],['Чанша','Changsha','长沙','Hunan','China','cn'],['Чанчжоу','Changzhou','常州','Jiangsu','China','cn'],['Чэнду','Chengdu','成都','Sichuan','China','cn'],['Чунцин','Chongqing','重庆','Chongqing','China','cn'],['Чжэнчжоу','Zhengzhou','郑州','Henan','China','cn'],['Чжухай','Zhuhai','珠海','Guangdong','China','cn'],['Шанхай','Shanghai','上海','Shanghai','China','cn'],['Шэньчжэнь','Shenzhen','深圳','Guangdong','China','cn'],['Шэньян','Shenyang','沈阳','Liaoning','China','cn'],['Шицзячжуан','Shijiazhuang','石家庄','Hebei','China','cn'],['Гуанчжоу','Guangzhou','广州','Guangdong','China','cn'],['Пекин','Beijing','北京','Beijing','China','cn'],['Нинбо','Ningbo','宁波','Zhejiang','China','cn'],['Тяньцзинь','Tianjin','天津','Tianjin','China','cn'],['Ханчжоу','Hangzhou','杭州','Zhejiang','China','cn'],['Сучжоу','Suzhou','苏州','Jiangsu','China','cn'],['Ухань','Wuhan','武汉','Hubei','China','cn'],['Сямэнь','Xiamen','厦门','Fujian','China','cn'],['Далянь','Dalian','大连','Liaoning','China','cn'],['Харбин','Harbin','哈尔滨','Heilongjiang','China','cn'],['Наньнин','Nanning','南宁','Guangxi','China','cn'],['Нанкин','Nanjing','南京','Jiangsu','China','cn'],['Фошань','Foshan','佛山','Guangdong','China','cn'],['Хэфэй','Hefei','合肥','Anhui','China','cn'],['Тайюань','Taiyuan','太原','Shanxi','China','cn'],['Куньмин','Kunming','昆明','Yunnan','China','cn'],['Сиань','Xi’an','西安','Shaanxi','China','cn'],['Сеул','Seoul','서울','South Korea','kr'],['Пусан','Busan','부산','South Korea','kr'],['Инчхон','Incheon','인천','South Korea','kr'],['Мумбаи','Mumbai','मुंबई','Maharashtra','India','in'],['Дели','Delhi','दिल्ली','Delhi','India','in'],['Ченнаи','Chennai','சென்னை','Tamil Nadu','India','in'],
['Нижний Новгород','Nizhny Novgorod','Нижний Новгород','Nizhny Novgorod','Russia','ru'],['Набережные Челны','Naberezhnye Chelny','Набережные Челны','Tatarstan','Russia','ru'],['Нижневартовск','Nizhnevartovsk','Нижневартовск','Khanty-Mansi','Russia','ru'],['Норильск','Norilsk','Норильск','Krasnoyarsk Krai','Russia','ru'],['Новосибирск','Novosibirsk','Новосибирск','Novosibirsk Oblast','Russia','ru'],['Новороссийск','Novorossiysk','Новороссийск','Krasnodar Krai','Russia','ru'],['Нальчик','Nalchik','Нальчик','Kabardino-Balkaria','Russia','ru'],['Находка','Nakhodka','Находка','Primorsky Krai','Russia','ru'],['Нефтеюганск','Nefteyugansk','Нефтеюганск','Khanty-Mansi','Russia','ru'],['Невинномысск','Nevinnomyssk','Невинномысск','Stavropol Krai','Russia','ru'],['Новокузнецк','Novokuznetsk','Новокузнецк','Kemerovo Oblast','Russia','ru'],['Новомосковск','Novomoskovsk','Новомосковск','Tula Oblast','Russia','ru'],['Ноябрьск','Noyabrsk','Ноябрьск','Yamalo-Nenets','Russia','ru'],['Москва','Moscow','Москва','Moscow','Russia','ru'],['Санкт-Петербург','Saint Petersburg','圣彼得堡','Russia','Russia','ru'],['Казань','Kazan','喀山','Tatarstan','Russia','ru'],['Екатеринбург','Yekaterinburg','叶卡捷琳堡','Sverdlovsk','Russia','ru'],['Самара','Samara','萨马拉','Samara','Russia','ru'],['Владивосток','Vladivostok','符拉迪沃斯托克','Primorsky Krai','Russia','ru'],['Краснодар','Krasnodar','克拉斯诺达尔','Krasnodar Krai','Russia','ru'],['Ростов-на-Дону','Rostov-on-Don','顿河畔罗斯托夫','Rostov','Russia','ru'],['Хабаровск','Khabarovsk','哈巴罗夫斯克','Khabarovsk Krai','Russia','ru'],['Омск','Omsk','鄂木斯克','Omsk','Russia','ru'],['Тюмень','Tyumen','秋明','Tyumen','Russia','ru'],['Уфа','Ufa','乌法','Bashkortostan','Russia','ru'],['Челябинск','Chelyabinsk','车里雅宾斯克','Chelyabinsk','Russia','ru'],['Пермь','Perm','彼尔姆','Perm Krai','Russia','ru']
];



// Asia origin directory: major cities across the user's supported countries.
const ASIA_CITY_SEED = [
['Токио','Tokyo','東京','Tokyo','Japan','asia'],['Осака','Osaka','大阪','Osaka','Japan','asia'],['Нагоя','Nagoya','名古屋','Aichi','Japan','asia'],['Йокогама','Yokohama','横浜','Kanagawa','Japan','asia'],
['Сеул','Seoul','서울','Seoul','South Korea','asia'],['Пусан','Busan','부산','Busan','South Korea','asia'],['Инчхон','Incheon','인천','Incheon','South Korea','asia'],['Тэгу','Daegu','대구','Daegu','South Korea','asia'],
['Пхеньян','Pyongyang','평양','Pyongyang','North Korea','asia'],['Хамхын','Hamhung','함흥','South Hamgyong','North Korea','asia'],
['Улан-Батор','Ulaanbaatar','Улаанбаатар','Ulaanbaatar','Mongolia','asia'],['Эрдэнэт','Erdenet','Эрдэнэт','Orkhon','Mongolia','asia'],['Дархан','Darkhan','Дархан','Darkhan-Uul','Mongolia','asia'],
['Мумбаи','Mumbai','मुंबई','Maharashtra','India','asia'],['Дели','Delhi','दिल्ली','Delhi','India','asia'],['Нью-Дели','New Delhi','नई दिल्ली','Delhi','India','asia'],['Ченнаи','Chennai','சென்னை','Tamil Nadu','India','asia'],['Бангалор','Bengaluru','ಬೆಂಗಳೂರು','Karnataka','India','asia'],['Хайдарабад','Hyderabad','హైదరాబాద్','Telangana','India','asia'],['Ахмедабад','Ahmedabad','અમદાવાદ','Gujarat','India','asia'],['Калькутта','Kolkata','কলকাতা','West Bengal','India','asia'],['Пуна','Pune','पुणे','Maharashtra','India','asia'],['Нагпур','Nagpur','नागपूर','Maharashtra','India','asia'],
['Карачи','Karachi','کراچی','Sindh','Pakistan','asia'],['Лахор','Lahore','لاہور','Punjab','Pakistan','asia'],['Исламабад','Islamabad','اسلام آباد','Islamabad','Pakistan','asia'],['Фейсалабад','Faisalabad','فیصل آباد','Punjab','Pakistan','asia'],
['Дакка','Dhaka','ঢাকা','Dhaka','Bangladesh','asia'],['Читтагонг','Chattogram','চট্টগ্রাম','Chattogram','Bangladesh','asia'],['Силхет','Sylhet','সিলেট','Sylhet','Bangladesh','asia'],
['Катманду','Kathmandu','काठमाडौं','Bagmati','Nepal','asia'],['Покхара','Pokhara','पोखरा','Gandaki','Nepal','asia'],['Лалитпур','Lalitpur','ललितपुर','Bagmati','Nepal','asia'],
['Тхимпху','Thimphu','ཐིམ་ཕུ','Thimphu','Bhutan','asia'],['Пхунчхолинг','Phuntsholing','ཕུན་ཚོགས་གླིང་','Chukha','Bhutan','asia'],
['Коломбо','Colombo','කොළඹ','Western','Sri Lanka','asia'],['Хамбантота','Hambantota','හම්බන්තොට','Southern','Sri Lanka','asia'],['Канди','Kandy','මහනුවර','Central','Sri Lanka','asia'],
['Мале','Malé','މާލެ','Malé','Maldives','asia'],
['Кабул','Kabul','کابل','Kabul','Afghanistan','asia'],['Герат','Herat','هرات','Herat','Afghanistan','asia'],['Мазари-Шариф','Mazar-i-Sharif','مزار شریف','Balkh','Afghanistan','asia'],
['Джакарта','Jakarta','Jakarta','Jakarta','Indonesia','asia'],['Сурабая','Surabaya','Surabaya','East Java','Indonesia','asia'],['Батам','Batam','Batam','Riau Islands','Indonesia','asia'],['Медан','Medan','Medan','North Sumatra','Indonesia','asia'],
['Бангкок','Bangkok','กรุงเทพมหานคร','Bangkok','Thailand','asia'],['Лаем-Чабанг','Laem Chabang','แหลมฉบัง','Chon Buri','Thailand','asia'],['Чиангмай','Chiang Mai','เชียงใหม่','Chiang Mai','Thailand','asia'],['Хошимин','Ho Chi Minh City','Thành phố Hồ Chí Minh','Ho Chi Minh','Vietnam','asia'],['Ханой','Hanoi','Hà Nội','Hanoi','Vietnam','asia'],['Хайфон','Hai Phong','Hải Phòng','Hai Phong','Vietnam','asia'],['Дананг','Da Nang','Đà Nẵng','Da Nang','Vietnam','asia'],
['Куала-Лумпур','Kuala Lumpur','Kuala Lumpur','Kuala Lumpur','Malaysia','asia'],['Порт-Кланг','Port Klang','Pelabuhan Klang','Selangor','Malaysia','asia'],['Джохор-Бару','Johor Bahru','Johor Bahru','Johor','Malaysia','asia'],['Сингапур','Singapore','Singapore','Singapore','Singapore','asia'],
['Манила','Manila','Maynila','Metro Manila','Philippines','asia'],['Себу','Cebu City','Cebu','Cebu','Philippines','asia'],['Давао','Davao City','Davao','Davao','Philippines','asia'],
['Янгон','Yangon','ရန်ကုန်','Yangon','Myanmar','asia'],['Мандалай','Mandalay','မန္တလေး','Mandalay','Myanmar','asia'],['Пномпень','Phnom Penh','ភ្នំពេញ','Phnom Penh','Cambodia','asia'],['Сиануквиль','Sihanoukville','ក្រុងព្រះសីហនុ','Preah Sihanouk','Cambodia','asia'],['Вьентьян','Vientiane','ວຽງຈັນ','Vientiane','Laos','asia'],['Луангпхабанг','Luang Prabang','ຫຼວງພະບາງ','Luang Prabang','Laos','asia'],['Бандар-Сери-Бегаван','Bandar Seri Begawan','Bandar Seri Begawan','Brunei-Muara','Brunei','asia'],['Дили','Dili','Dili','Dili','Timor-Leste','asia'],
['Алматы','Almaty','Алматы','Almaty','Kazakhstan','asia'],['Астана','Astana','Астана','Astana','Kazakhstan','asia'],['Шымкент','Shymkent','Шымкент','Shymkent','Kazakhstan','asia'],['Ташкент','Tashkent','Toshkent','Tashkent','Uzbekistan','asia'],['Самарканд','Samarkand','Samarqand','Samarkand','Uzbekistan','asia'],['Бишкек','Bishkek','Бишкек','Bishkek','Kyrgyzstan','asia'],['Ош','Osh','Ош','Osh','Kyrgyzstan','asia'],['Душанбе','Dushanbe','Душанбе','Dushanbe','Tajikistan','asia'],['Худжанд','Khujand','Хуҷанд','Sughd','Tajikistan','asia'],['Ашхабад','Ashgabat','Aşgabat','Ahal','Turkmenistan','asia'],['Туркменабад','Turkmenabat','Türkmenabat','Lebap','Turkmenistan','asia']
];
for(const c of ASIA_CITY_SEED){ if(!cities.some(x=>String(x[1]).toLowerCase()===String(c[1]).toLowerCase())) cities.push(c); }
const ASIA_CODES = new Set(['cn','jp','kr','kp','mn','in','pk','bd','np','bt','lk','mv','af','id','th','vn','my','sg','ph','mm','kh','la','bn','tl','kz','uz','kg','tj','tm','asia']);

const CITY_COORDS={'Пекин':[39.9042,116.4074],'北京':[39.9042,116.4074],'Beijing':[39.9042,116.4074],'Шанхай':[31.2304,121.4737],'上海':[31.2304,121.4737],'Shanghai':[31.2304,121.4737],'Нинбо':[29.8683,121.5440],'宁波':[29.8683,121.5440],'Ningbo':[29.8683,121.5440],'Гуанчжоу':[23.1291,113.2644],'广州':[23.1291,113.2644],'Guangzhou':[23.1291,113.2644],'Циндао':[36.0671,120.3826],'青岛':[36.0671,120.3826],'Qingdao':[36.0671,120.3826],'Сямэнь':[24.4798,118.0894],'厦门':[24.4798,118.0894],'Xiamen':[24.4798,118.0894],'Чэнду':[30.5728,104.0668],'成都':[30.5728,104.0668],'Chengdu':[30.5728,104.0668],'Москва':[55.7558,37.6173],'Moscow':[55.7558,37.6173],'Санкт-Петербург':[59.9311,30.3609],'Saint Petersburg':[59.9311,30.3609],'圣彼得堡':[59.9311,30.3609],'Екатеринбург':[56.8389,60.6057],'Yekaterinburg':[56.8389,60.6057],'Новосибирск':[55.0084,82.9357],'Novosibirsk':[55.0084,82.9357],'Нижний Новгород':[56.2965,43.9361],'Nizhny Novgorod':[56.2965,43.9361],'Казань':[55.7879,49.1233],'Kazan':[55.7879,49.1233],'Самара':[53.1959,50.1002],'Samara':[53.1959,50.1002],'Владивосток':[43.1155,131.8855],'Vladivostok':[43.1155,131.8855]};
for(const c of cities){for(const n of [c[0],c[1],c[2]])if(CITY_COORDS[n]){c[6]=CITY_COORDS[n][0];c[7]=CITY_COORDS[n][1];break;}}

function tr(k){return I18N[lang][k]||k}
function modeName(k){return modes[k]?.[lang]||k}
function setDimensionLabels(){
 const labels={length:['Длина','Length','长度'],width:['Ширина','Width','宽度'],height:['Высота','Height','高度']};
 Object.entries(labels).forEach(([id,texts])=>{
   const label=$('#'+id)?.previousElementSibling; if(!label)return;
   label.textContent=texts[lang==='ru'?0:lang==='en'?1:2]+' ';
   const span=document.createElement('span'); span.className='dimension-unit-label'; span.textContent=unitLabel(); label.appendChild(span);
 });
}
function applyLang(){
 document.documentElement.lang=lang;renderChatEmpty(true);
 $$('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(key==='heroText')el.innerHTML=tr(key).replace(/\n/g,'<br>');else el.textContent=tr(key)});
 const ph=lang==='zh'?['中国城市','俄罗斯城市']:lang==='en'?['City in China','City in Russia']:lang==='tr'?['Çin şehri','Rusya şehri']:['Город в Китае','Город в России'];
 $('#fromCity').placeholder=ph[0]; $('#toCity').placeholder=ph[1]; $('#distance').placeholder='0';
 $('#weight').placeholder='0'; $('#pieces').placeholder='1'; $('#length').placeholder='0'; $('#width').placeholder='0'; $('#height').placeholder='0';
 $('#assistantInput').placeholder=lang==='zh'?'输入消息…':lang==='en'?'Write a message…':lang==='tr'?'Mesajınızı yazın…':'Напишите сообщение…';
 $('#fileNames').textContent=tr('fileHint'); $('#voiceState').textContent=tr('ready');
 $('.close-button').forEach?.(x=>{});
 $$('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',tr(el.dataset.i18nAria)));
 $$('[data-i18n-title]').forEach(el=>el.setAttribute('title',tr(el.dataset.i18nTitle)));
$$('[data-i18n-placeholder]').forEach(el=>el.placeholder=tr(el.dataset.i18nPlaceholder));
 $('#menuButton')?.setAttribute('title',tr('menu')); $('#menuButton')?.setAttribute('aria-label',tr('menu'));
 $$('.close-button').forEach(el=>{el.setAttribute('aria-label',tr('close'));el.setAttribute('title',tr('close'))});
 $$('.lang').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang)); localStorage.setItem('iomastavka_lang',lang); 
 setDimensionLabels(); renderForwarderMenu(); renderTransportMenu(); renderIncoterms(); renderFactors();
 renderSuggestions($('#fromSuggestions'),$('#fromCity').value.trim()?cityMatches($('#fromCity').value,'asia'):[],$('#fromCity'),'asia');
 renderSuggestions($('#toSuggestions'),$('#toCity').value.trim()?cityMatches($('#toCity').value,'russia'):[],$('#toCity'),'russia');

 if($('#forwardersView')?.classList.contains('open'))renderDirectory();
 if($('#newsView')?.classList.contains('open'))loadNews();
 if($('#articleView')?.classList.contains('open')&&currentArticleNews)openArticle(currentArticleNews);
 if($('#tarotView')?.classList.contains('open'))renderTarotText();
 updateCityPlaceholders();
}
$$('.lang').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;newsCache=[];newsPrefetchPromise=null;applyLang();
  try{ if($('#homeCurrencyDate')) $('#homeCurrencyDate').textContent=formatToday().replace(' г.',''); }catch(e){}
  loadCurrency();autoDistance()});

function updateCityPlaceholders(){
 const examples={ru:[['Пекин','Шанхай','Нинбо','Гуанчжоу'],['Москва','Санкт-Петербург','Екатеринбург','Новосибирск']],en:[['Beijing','Shanghai','Ningbo','Guangzhou'],['Moscow','Saint Petersburg','Yekaterinburg','Novosibirsk']],tr:[['Pekin','Şanghay','Ningbo','Guangzhou'],['Moskova','St Petersburg','Yekaterinburg','Novosibirsk']],zh:[['北京','上海','宁波','广州'],['莫斯科','圣彼得堡','叶卡捷琳堡','新西伯利亚']]};
 const arr=examples[lang]||examples.ru; let i=0;
 clearInterval(window.cityPlaceholderTimer); const tick=()=>{if(!$('#fromCity')?.value)$('#fromCity').placeholder=arr[0][i%arr[0].length];if(!$('#toCity')?.value)$('#toCity').placeholder=arr[1][i%arr[1].length];i++};tick();window.cityPlaceholderTimer=setInterval(tick,2000);
}

async function loadRates(){try{const r=await fetch('/api/rates',{credentials:'same-origin'});if(r.ok){const d=await r.json();rates=d||{};window.rateRecords=Array.isArray(d.records)?d.records:[]}}catch{} renderForwarderMenu();renderTransportMenu()}
function companyModes(company){
  const found=agentDirectory.filter(a=>a.company===company).flatMap(a=>a.modes||[]);
  return [...new Set(found.concat(rates[company]?.modes||[]))];
}
async function loadAgents(){try{const r=await fetch('/api/agents',{cache:'no-store',credentials:'same-origin'});const d=r.ok?await r.json():null;if(Array.isArray(d?.records)&&d.records.length){const seen=new Set(agentDirectory.map(a=>[normalizeTextCompany(a.company),normalizeTextCompany(a.contact),normalizeTextCompany(a.email),normalizeTextCompany(a.phone)].join('|')));d.records.forEach(a=>{const k=[normalizeTextCompany(a.company),normalizeTextCompany(a.contact),normalizeTextCompany(a.email),normalizeTextCompany(a.phone)].join('|');if(!seen.has(k)){agentDirectory.push(a);seen.add(k)}})}}catch{}renderForwarderMenu();renderDirectory();}
function allForwarderNames(){return [...new Set(agentDirectory.map(a=>a.company).filter(Boolean).concat(Object.keys(rates)))];}
function forwarderModes(name){return companyModes(name)}
function filteredAgents(){return agentDirectory.filter(a=>{
  const ms=a.modes||[];
  if(!selectedMode)return true;
  return ms.includes(selectedMode) || (selectedMode==='sea'&&ms.includes('multimodal')) || (selectedMode==='rail'&&ms.includes('multimodal'));
})}
function renderForwarderMenu(){
 const menu=$('#forwarderMenu'); if(!menu)return; menu.innerHTML='';
 const list=(()=>{const seen=new Set();return filteredAgents().filter(a=>{const k=normalizeTextCompany(a.company||'');if(!k||seen.has(k))return false;seen.add(k);return true})})();
 list.forEach(agent=>{
   const b=document.createElement('button'); b.type='button'; b.className='hover-item agent-option';
   const main=document.createElement('strong'); main.textContent=agent.company;
   b.append(main);
   b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectForwarder(agent.company);menu.classList.remove('open')});
   menu.appendChild(b);
 });
 if(!list.length) menu.innerHTML=`<div class="hover-item">${tr('none')}</div>`;
}
function selectForwarder(name){
 selectedForwarder=name; $('#forwarderBtn span').textContent=name; renderTransportMenu(); showRecommendation(name);
}
function renderTransportMenu(){
 const menu=$('#transportMenu'); if(!menu)return; menu.innerHTML='';
 const list=selectedForwarder?forwarderModes(selectedForwarder):Object.keys(modes);
 list.filter(k=>modes[k]).forEach(k=>{const b=document.createElement('button');b.className='hover-item';b.textContent=modeName(k);b.onclick=()=>{selectedMode=k;selectedFactor=modes[k].factor;$('#transportBtn span').textContent=modeName(k);renderFactors();updateAutoVolume();renderForwarderMenu();renderTransportMenu();renderRouteAdvice();menu.classList.remove('open')};menu.appendChild(b)})
}
function renderIncoterms(){const m=$('#incotermMenu');m.innerHTML='';['EXW','FCA','FOB','CIF','DAP','DDP'].forEach(x=>{const b=document.createElement('button');b.className='hover-item';b.textContent=x;b.onclick=()=>{$('#incotermBtn span').textContent=x;m.classList.remove('open')};m.appendChild(b)})}
function renderFactors(){selectedFactor=selectedMode&&modes[selectedMode]?modes[selectedMode].factor:167;}

// Dropdowns work both by hover and by click/tap.
['forwarderBtn','transportBtn','incotermBtn'].forEach(id=>{const btn=$('#'+id);const menu=$('#'+id.replace('Btn','Menu'));if(btn&&menu)btn.addEventListener('click',e=>{e.stopPropagation();const open=menu.style.visibility==='visible'||menu.classList.contains('open');$$('.hover-menu').forEach(m=>m.classList.remove('open'));if(!open)menu.classList.add('open')})});
document.addEventListener('click',e=>{$$('.hover-menu').forEach(m=>{if(!e.target.closest('.hover-select'))m.classList.remove('open')});if(!e.target.closest('.autocomplete'))$$('.suggestions.open').forEach(m=>m.classList.remove('open'))});

// Navigation controls. Keep a single source of truth to avoid duplicate handlers.
$('#customsButton')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.__iomaOpenView?.('customsView')});
$('#menuButton')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showTarot()});
$('#agentImportButton')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openAgentImporter()});
$('#logoutButton')?.addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST'})}finally{location.href='/'}});
$('#themeToggleButton')?.addEventListener('click',()=>setTheme(document.body.classList.contains('manual-dark')?'light':'dark'));
{ const __saved = localStorage.getItem('iomastavka_theme'); const __mq = window.matchMedia('(prefers-color-scheme: dark)'); setTheme(__saved || (__mq.matches ? 'dark' : 'light'), false); __mq.addEventListener?.('change', e => { if (!localStorage.getItem('iomastavka_theme')) setTheme(e.matches ? 'dark' : 'light', false); }); }

const TAROT_DECK=[
    {n:'0',sym:'0',ru:['Шут','Новый цикл','Сегодня стоит дать место новому: небольшому шагу, идее или разговору, который давно откладывался.'],en:['The Fool','New cycle',"Today, make room for something new — a small step, an idea, or a conversation you've been putting off."],zh:['愚者','新的开始','今天值得为新事物留出空间——一小步、一个想法，或一场你一直拖延的对话。'],tr:['Deli','Yeni döngü','Bugün yeni bir şeye yer aç — küçük bir adım, bir fikir ya da uzun süredir ertelediğin bir konuşma.']},
    {n:'I',sym:'I',ru:['Маг','Инициатива','Сегодня многое зависит от твоего первого действия. Не жди идеального момента — используй то, что уже есть.'],en:['The Magician','Initiative',"Today a lot depends on your first move. Don't wait for the perfect moment — use what you already have."],zh:['魔术师','主动','今天很多事情取决于你迈出的第一步。别等最好的时机——用好手头已有的一切。'],tr:['Büyücü','İnisiyatif','Bugün çoğu şey attığın ilk adıma bağlı. Mükemmel anı bekleme — elindekini kullan.']},
    {n:'II',sym:'II',ru:['Верховная Жрица','Интуиция','Не вся информация должна быть получена сразу. Сегодня полезнее наблюдать, чем торопиться с выводами.'],en:['The High Priestess','Intuition','Not everything needs to be known right away. Today it helps more to observe than to rush to conclusions.'],zh:['女祭司','直觉','并非所有信息都需要立刻获得。今天，观察比急于下结论更有益。'],tr:['Başrahibe','Sezgi','Bugün her bilgiye hemen ulaşmak gerekmiyor. Sonuca koşmaktansa gözlemlemek daha faydalı.']},
    {n:'III',sym:'III',ru:['Императрица','Рост','Хороший день для того, что должно постепенно приносить результат: работа, идея, отношения или проект.'],en:['The Empress','Growth','A good day for things that pay off gradually: work, an idea, a relationship or a project.'],zh:['女皇','成长','适合做那些需要慢慢见效的事：工作、想法、关系或项目。'],tr:['İmparatoriçe','Büyüme','İşi, fikri, ilişkiyi ya da projeyi yavaş yavaş sonuca taşımak için iyi bir gün.']},
    {n:'IV',sym:'IV',ru:['Император','Опора','Сегодня сила в структуре. Разложи задачи по местам и не позволяй чужой суете управлять твоим ритмом.'],en:['The Emperor','Support','Today, strength is in structure. Put your tasks in order and don\u2019t let others\u2019 rush set your pace.'],zh:['皇帝','支撑','今天力量在于结构。把任务安排妥当，别让别人的忙乱打乱你的节奏。'],tr:['İmparator','Dayanak','Bugün güç düzende. İşlerini yerli yerine koy, başkalarının telaşı ritmini bozmasın.']},
    {n:'V',sym:'V',ru:['Иерофант','Знание','Полезный ответ сегодня может прийти через человека с опытом, документ или уже проверенный путь.'],en:['The Hierophant','Knowledge','A useful answer today may come through an experienced person, a document, or an already proven path.'],zh:['教皇','知识','今天有用的答案可能来自有经验的人、一份文件，或一条已被验证过的路径。'],tr:['Başrahip','Bilgi','Bugün işe yarar cevap deneyimli biri, bir belge ya da denenmiş bir yoldan gelebilir.']},
    {n:'VI',sym:'VI',ru:['Влюблённые','Выбор','День про выбор между двумя направлениями. Смотри не только на выгоду, но и на то, куда тебя действительно тянет.'],en:['The Lovers','Choice','A day about choosing between two directions. Look not only at the benefit, but at what really draws you.'],zh:['恋人','抉择','今天关乎在两个方向之间做选择。不只看利益，也看真正吸引你的是什么。'],tr:['Aşıklar','Seçim','Bugün iki yön arasında seçim yapmakla ilgili. Sadece kazanca değil, seni gerçekten çeken şeye de bak.']},
    {n:'VII',sym:'VII',ru:['Колесница','Движение','День хорошо подходит для дороги, переговоров и решительного движения к конкретной цели.'],en:['The Chariot','Movement','A good day for travel, negotiations, and decisive movement toward a specific goal.'],zh:['战车','前行','适合出行、谈判，以及朝具体目标坚定前进。'],tr:['Savaş Arabası','Hareket','Yolculuk, müzakere ve somut bir hedefe kararlı ilerleme için iyi bir gün.']},
    {n:'VIII',sym:'VIII',ru:['Сила','Спокойная сила','Сегодня не нужно доказывать силу громкостью. Мягкая уверенность окажется сильнее давления.'],en:['Strength','Calm strength',"Today you don't need to prove strength with volume. Quiet confidence will beat pressure."],zh:['力量','沉稳的力量','今天不必用声音证明力量。温和的自信比压力更有力。'],tr:['Güç','Sakin güç','Bugün gücü yükseklikle kanıtlamana gerek yok. Yumuşak bir özgüven baskıdan daha güçlü olacak.']},
    {n:'IX',sym:'IX',ru:['Отшельник','Фокус','Убери лишний шум и закончи одну важную вещь. Ясность сегодня приходит через концентрацию.'],en:['The Hermit','Focus','Cut the noise and finish one important thing. Today, clarity comes through focus.'],zh:['隐士','专注','减少多余的干扰，完成一件重要的事。清晰来自专注。'],tr:['Ermiş','Odak','Gereksiz gürültüyü azalt ve önemli bir işi bitir. Bugün netlik odaklanmaktan gelir.']},
    {n:'X',sym:'X',ru:['Колесо Фортуны','Поворот','Ситуация может неожиданно поменять направление. Оставь немного пространства для удачного поворота.'],en:['Wheel of Fortune','Turn','The situation may suddenly change direction. Leave a little room for a lucky turn.'],zh:['命运之轮','转折','局势可能突然转向。给幸运的转折留一点空间。'],tr:['Kader Çarkı','Dönüş','Durum beklenmedik şekilde yön değiştirebilir. İyi bir dönüş için biraz alan bırak.']},
    {n:'XI',sym:'XI',ru:['Справедливость','Баланс','Сегодня особенно важно проверять цифры, документы и договорённости. Точность сыграет на твоей стороне.'],en:['Justice','Balance','Today it especially pays to double-check numbers, documents and agreements. Accuracy is on your side.'],zh:['正义','平衡','今天尤其要核对数字、文件和约定。准确会站在你这边。'],tr:['Adalet','Denge','Bugün rakamları, belgeleri ve anlaşmaları kontrol etmek özellikle önemli. Doğruluk senin lehine olacak.']},
    {n:'XII',sym:'XII',ru:['Повешенный','Пауза','Если что-то не двигается, не обязательно давить сильнее. Иногда смена взгляда быстрее приводит к решению.'],en:['The Hanged Man','Pause',"If something isn't moving, you don't have to push harder. Sometimes a change of view gets you to the answer faster."],zh:['倒吊人','暂停','如果事情停滞不前，不一定要更用力推动。有时换个角度看问题会更快找到答案。'],tr:['Asılan Adam','Duraklama','Bir şey ilerlemiyorsa daha sert bastırmak gerekmeyebilir. Bazen bakış açını değiştirmek çözüme daha hızlı götürür.']},
    {n:'XIII',sym:'XIII',ru:['Смерть','Обновление','Это не про плохое событие, а про завершение старого этапа. Освободив место, ты увидишь следующий шаг.'],en:['Death','Renewal',"It's not about something bad — it's about closing an old chapter. Once you clear the space, the next step becomes visible."],zh:['死神','更新','这不是坏事，而是旧阶段的结束。腾出空间后，你会看到下一步。'],tr:['Ölüm','Yenilenme','Bu kötü bir olay değil, eski bir dönemin kapanışı. Yer açtığında bir sonraki adımı göreceksin.']},
    {n:'XIV',sym:'XIV',ru:['Умеренность','Ритм','Сегодня тебе особенно полезен ровный темп: без рывков, перегруза и попытки сделать всё одновременно.'],en:['Temperance','Rhythm','Today an even pace serves you best: no sudden pushes, no overload, no trying to do everything at once.'],zh:['节制','节奏','今天尤其需要平稳的步调：不要突进、不要超负荷，也别想同时完成所有事。'],tr:['Denge','Ritim','Bugün sana özellikle düzenli bir tempo iyi gelir: ani atılımlar, aşırı yük olmadan.']},
    {n:'XV',sym:'XV',ru:['Дьявол','Освобождение','Заметь, что забирает внимание больше, чем заслуживает. Не каждая срочность действительно твоя.'],en:['The Devil','Liberation',"Notice what's taking more attention than it deserves. Not every urgency is really yours."],zh:['恶魔','解脱','留意什么占据了超出它本该有的注意力。不是每一件"紧急事"都真的属于你。'],tr:['Şeytan','Özgürleşme','Neyin hak ettiğinden fazla dikkatini aldığına dikkat et. Her aciliyet gerçekten senin değildir.']},
    {n:'XVI',sym:'XVI',ru:['Башня','Перестройка','Неожиданная перемена может оказаться полезной, если не держаться за то, что уже перестало работать.'],en:['The Tower','Rebuild',"An unexpected change can turn out useful if you don't hold on to what's already stopped working."],zh:['塔','重建','意想不到的变化如果不再执着于已经失效的东西，可能反而有益。'],tr:['Kule','Yeniden yapılanma','Artık işe yaramayan şeye tutunmazsan, beklenmedik bir değişiklik faydalı olabilir.']},
    {n:'XVII',sym:'☆',ru:['Звезда','Надежда','Хороший день для идеи, которая ещё не принесла результат, но уже показывает направление. Продолжай.'],en:['The Star','Hope',"A good day for an idea that hasn't paid off yet but is already showing direction. Keep going."],zh:['星星','希望','适合还未见成效、但已显方向的想法。继续前进。'],tr:['Yıldız','Umut','Henüz sonuç vermemiş ama yönünü göstermeye başlamış bir fikir için iyi bir gün. Devam et.']},
    {n:'XVIII',sym:'\u263D',ru:['Луна','Наблюдение','Не спеши верить первому впечатлению. Часть картины станет понятнее чуть позже.'],en:['The Moon','Observation',"Don't rush to trust the first impression. Part of the picture will become clearer a bit later."],zh:['月亮','观察','别急于相信第一印象。部分真相稍后才会清晰。'],tr:['Ay','Gözlem','İlk izlenime hemen inanma. Tablonun bir kısmı biraz sonra netleşecek.']},
    {n:'XIX',sym:'\u2609',ru:['Солнце','Ясность','Одна из самых светлых карт. Сегодня хорошо говорить прямо, действовать уверенно и не усложнять очевидное.'],en:['The Sun','Clarity','One of the brightest cards. A good day to speak plainly, act with confidence, and not overcomplicate the obvious.'],zh:['太阳','明朗','这是最明亮的一张牌。今天适合坦率表达、自信行动，不把简单的事复杂化。'],tr:['Güneş','Netlik','En aydınlık kartlardan biri. Bugün açık konuşmak, kararlı davranmak için uygun.']},
    {n:'XX',sym:'XX',ru:['Суд','Решение','Сегодня может появиться момент, когда старый вопрос наконец попросит окончательного ответа.'],en:['Judgement','Decision','Today a moment may come when an old question finally asks for a final answer.'],zh:['审判','决断','今天可能出现一个时刻，一个悬而未决的问题终于要求给出最终答案。'],tr:['Mahkeme','Karar','Bugün eski bir sorunun nihayet kesin bir cevap istediği bir an gelebilir.']},
    {n:'XXI',sym:'XXI',ru:['Мир','Завершение','Хороший знак для закрытия этапа, результата и перехода на следующий уровень.'],en:['The World','Completion','A good sign for closing a chapter, getting a result, and moving to the next level.'],zh:['世界','完成','适合结束一个阶段、收获成果，迈向下一个层次的好兆头。'],tr:['Dünya','Tamamlanma','Bir dönemi kapatmak, sonuç almak ve bir sonraki seviyeye geçmek için iyi bir işaret.']}
  ];
function renderTarotText(){
  const d=new Date(); const daySeed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  const idx=Math.abs(daySeed*17+21)%TAROT_DECK.length; const c=TAROT_DECK[idx];
  const loc=c[lang]||c.ru;
  $('#tarotSymbol').textContent=c.sym;
  $('#tarotRoman').textContent=c.sym===c.n?'':c.n;
  $('#tarotTitle').textContent=loc[0];
  $('#tarotKeyword').textContent=loc[1];
  $('#tarotText').textContent=loc[2];
  const dateStr=d.toLocaleDateString(lang==='ru'?'ru-RU':lang==='zh'?'zh-CN':lang==='tr'?'tr-TR':'en-GB',{day:'numeric',month:'long'});
  $('#tarotMeta').textContent='iomastavka \u00b7 '+dateStr;
}
function showTarot(){
  showView('tarotView');
  const shell=$('#tarotShell'), card=$('.tarot-card');
  if(!shell||!card)return;
  shell.classList.remove('tarot-ready','tarot-closing');
  renderTarotText();
  requestAnimationFrame(()=>{shell.classList.add('tarot-ready');card.classList.add('tarot-reveal-stable');startTarotDust(false);});
}
function startTarotDust(reverse=false){
  const canvas=$('#tarotDustCanvas'), shell=$('#tarotShell'); if(!canvas||!shell)return;
  const ctx=canvas.getContext('2d'); if(!ctx)return;
  const dpr=Math.min(window.devicePixelRatio||1,2), w=shell.clientWidth, h=shell.clientHeight;
  canvas.width=Math.max(1,Math.floor(w*dpr)); canvas.height=Math.max(1,Math.floor(h*dpr)); ctx.setTransform(dpr,0,0,dpr,0,0);
  const cx=w/2, cy=h/2, cardW=Math.min(390,w*.88), cardH=Math.min(560,h*.78);
  const particles=[];
  const count=Math.min(1050,Math.max(620,Math.floor(w*h/1200)));
  for(let i=0;i<count;i++){
    const edge=Math.random()<.72;
    let sx,sy;
    if(edge){
      const a=Math.random()*Math.PI*2, rr=.58+Math.random()*.75;
      sx=cx+Math.cos(a)*cardW*rr; sy=cy+Math.sin(a)*cardH*rr;
    }else{ sx=Math.random()*w; sy=Math.random()*h; }
    const ang=Math.random()*Math.PI*2;
    const radius=.18+Math.random()*.92;
    const tx=cx+(Math.random()-.5)*cardW*.96;
    const ty=cy+(Math.random()-.5)*cardH*.96;
    const burstX=cx+Math.cos(ang)*(cardW*(.54+radius*.48));
    const burstY=cy+Math.sin(ang)*(cardH*(.54+radius*.48));
    particles.push({
      x:reverse?tx:sx,y:reverse?ty:sy,
      gatherX:tx,gatherY:ty,
      burstX,burstY,
      r:.35+Math.random()*1.25,
      delay:Math.random()*.28,
      phase:Math.random()*Math.PI*2,
      tw:Math.random()*Math.PI*2
    });
  }
  const started=performance.now();
  const duration=reverse?540:1120;
  function easeOut(t){return 1-Math.pow(1-t,3)}
  function easeInOut(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function frame(now){
    const raw=Math.min(1,(now-started)/duration);
    ctx.clearRect(0,0,w,h);
    for(const p of particles){
      let t=Math.max(0,(raw-p.delay*.18)/(1-p.delay*.18));
      let x,y,alpha;
      if(!reverse){
        // First the card is born from dust, then the particles make a soft outward "impact".
        if(t<.78){
          const q=easeInOut(t/.78);
          x=p.x+(p.gatherX-p.x)*q; y=p.y+(p.gatherY-p.y)*q;
          alpha=Math.min(1,q*1.35)*(1-t*.18);
        }else{
          const q=easeOut((t-.78)/.22);
          x=p.gatherX+(p.burstX-p.gatherX)*q; y=p.gatherY+(p.burstY-p.gatherY)*q;
          alpha=(1-q)*.95;
        }
      }else{
        const q=easeOut(t);
        x=p.gatherX+(p.burstX-p.gatherX)*q; y=p.gatherY+(p.burstY-p.gatherY)*q;
        alpha=(1-q)*.95;
      }
      const pulse=.75+.35*Math.sin(now/170+p.tw);
      ctx.globalAlpha=alpha;
      ctx.fillStyle=`rgba(255,${218+Math.floor(28*pulse)},${150+Math.floor(75*pulse)},1)`;
      ctx.shadowBlur=2+8*pulse; ctx.shadowColor='rgba(255,224,130,.9)';
      ctx.beginPath();ctx.arc(x,y,p.r*pulse,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    if(raw<1)requestAnimationFrame(frame); else ctx.clearRect(0,0,w,h);
  }
  requestAnimationFrame(frame);
}

function openAgentImporter(){
  let v=$('#agentImportView'); if(!v){v=document.createElement('section');v.id='agentImportView';v.className='view-layer';v.innerHTML=`<div class="agent-import-shell"><button class="close-button" data-agent-import-close aria-label="Назад" title="Назад"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button><span class="eyebrow">ИМПОРТ ЭКСПЕДИТОРОВ</span><h2>Обновить справочник</h2><p>Вставь текст или прикрепи КП/контакты. ИИ выделит компании, контакты, телефоны, почты, сайты и направления и добавит их в справочник.</p><textarea id="agentImportText" placeholder="Вставь сюда текст…"></textarea><div class="agent-import-actions"><label class="attach-button icon-only" for="agentImportFile" title="Прикрепить файл"><svg viewBox="0 0 24 24"><path d="M8.5 12.5 14.9 6.1a3.3 3.3 0 0 1 4.7 4.7l-8.9 8.9a5 5 0 0 1-7.1-7.1l9.2-9.2a2.9 2.9 0 0 1 4.1 4.1l-8.8 8.8a1.4 1.4 0 0 1-2-2l7.9-7.9"/></svg></label><input id="agentImportFile" type="file" accept=".pdf,.txt,.csv,.xlsx,.xls,.docx,.rtf,.json,.png,.jpg,.jpeg,.webp"><button id="agentImportRun" class="calculate">Обновить справочник</button></div><div id="agentImportStatus"></div></div>`;document.querySelector('main').appendChild(v);v.querySelector('[data-agent-import-close]').onclick=()=>{v.classList.remove('open');document.body.classList.remove('view-open')};v.addEventListener('click',e=>{if(e.target===v){v.classList.remove('open');document.body.classList.remove('view-open')}});$('#agentImportFile').onchange=()=>{const f=$('#agentImportFile').files?.[0];if(f)$('#agentImportStatus').textContent=f.name};$('#agentImportRun').onclick=async()=>{const st=$('#agentImportStatus');st.textContent='Обрабатываю…';try{let text=$('#agentImportText').value.trim();const f=$('#agentImportFile').files?.[0];if(f)text+=(text?'\n\n':'')+await extractAttachment(f);if(!text)throw new Error('Добавь текст или файл');const r=await fetch('/api/agents/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Не удалось обновить');if(Array.isArray(d.records)&&d.records.length){agentDirectory=agentDirectory.concat(d.records);renderDirectory();}st.textContent=`Добавлено новых контактов: ${d.added||d.records?.length||0}`;setTimeout(()=>{v.classList.remove('open');document.body.classList.remove('view-open')},900)}catch(e){st.textContent=e.message||'Ошибка'}}}
  v.classList.add('open');document.body.classList.add('view-open');
}

function setTheme(mode, persist = true){
  const dark = mode === 'dark';
  const root = document.documentElement;
  root.classList.add('theme-anim'); clearTimeout(window.__themeAnimT); window.__themeAnimT = setTimeout(() => root.classList.remove('theme-anim'), 450);
  root.classList.toggle('dark', dark);
  document.body.classList.toggle('manual-dark', dark);
  document.body.classList.toggle('manual-light', !dark);
  if (persist) { try { localStorage.setItem('iomastavka_theme', mode); } catch(e) {} }
  const b = $('#themeToggleButton');
  if (b) { b.title = dark ? tr('themeLight') : tr('themeDark'); b.setAttribute('aria-label', b.title); }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b2238' : '#bfe6f8');
}
let newsCache=[];
let newsPrefetchPromise=null;
function prefetchNews(){if(newsCache.length)return Promise.resolve(newsCache);if(newsPrefetchPromise)return newsPrefetchPromise;const fallback=[{title:'Китай — Россия: что проверить перед расчётом мультимодальной перевозки',link:'',date:new Date().toISOString(),source:'IOMASTAVKA',description:'Incoterms, габариты, объёмный вес, терминальные расходы и документы.'},{title:'ТН ВЭД и импорт: какие данные собрать до запроса ставки',link:'',date:new Date().toISOString(),source:'IOMASTAVKA',description:'Описание товара, код ТН ВЭД, инвойс, упаковка, разрешительные документы и базис поставки.'},{title:'ЖД, море или авиа: как выбрать транспорт из Китая',link:'',date:new Date().toISOString(),source:'IOMASTAVKA',description:'Сравнение сроков, расчётного веса и структуры стоимости.'}];newsPrefetchPromise=fetch('/api/news?lang='+lang,{cache:'no-store',credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error('news');return r.json()}).then(d=>{newsCache=Array.isArray(d.items)&&d.items.length?d.items:fallback;return newsCache}).catch(()=>{newsCache=fallback;return newsCache});return newsPrefetchPromise}
prefetchNews().then(items=>{if(items.length&&document.getElementById('newsView')?.classList.contains('open'))renderNewsItems(items)});

const views={home:'#homeView',calculator:'#calculatorView',assistant:'#assistantView',forwarders:'#forwardersView',news:'#newsView',article:'#articleView',tarotView:'#tarotView',customsView:'#customsView'};
function showView(name){
  if(name==='home'){window.__iomaCloseViews?.();return;}
  if(window.__iomaOpenView?.(name)){
    if(name==='forwarders')renderDirectory();
    if(name==='news')loadNews();
    if(name==='assistant')setTimeout(()=>$('#assistantInput')?.focus(),120);
  }
}
function closeTarot(){const shell=$('#tarotShell'),card=$('.tarot-card');if(!shell)return window.__iomaCloseViews?.();shell.classList.add('tarot-closing');try{startTarotDust(true)}catch{}setTimeout(()=>{shell.classList.remove('tarot-closing','tarot-ready');card?.classList.remove('tarot-reveal-stable');window.__iomaCloseViews?.()},420)}

// ========== Маршрутная логика Китай → Россия ==========
const CHINA_CITIES_TRANSPORT = {
  // ===== ЮГ: только море + авто, прямого ЖД нет =====
  'гуанчжоу':   { region:'south', sea:true,  rail:false, road:true, air:true,  hub:'Шэньчжэнь', note:'Южный Китай. Прямого ЖД нет — оптимально море из Наньша + ЖД через Владивосток. Или авто до Шэньчжэня (150 км) → ЖД.' },
  'шэньчжэнь':  { region:'south', sea:true,  rail:false, road:true, air:true,  hub:null,         note:'Крупнейший порт Юга. Море из Яньтянь/Шэкоу — самый оптимальный вариант. Прямого ЖД нет.' },
  'дунгуань':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Шэньчжэнь', note:'Промышленный Юг. Море через Яньтянь (100 км). Прямого ЖД нет, до ближайшей станции — авто.' },
  'фошань':     { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Рядом с Гуанчжоу. Море из Наньша (60 км). Прямого ЖД нет.' },
  'чжухай':     { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Юг. Море через Шэньчжэнь/Наньша. Прямого ЖД нет.' },
  'чжуншань':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Юг, рядом с Гуанчжоу. Море из Наньша/Шэньчжэня.' },
  'шаньтоу':    { region:'south', sea:true,  rail:false, road:true, air:true,  hub:'Шэньчжэнь', note:'Восточный Гуандун. Море. Прямого ЖД в РФ нет.' },
  'цзянмэнь':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Гуанчжоу',  note:'Юг. Море из Наньша/Яньтянь.' },
  'хуэйчжоу':   { region:'south', sea:true,  rail:false, road:true, air:false, hub:'Шэньчжэнь', note:'Юг. Море из Яньтянь.' },
  'фучжоу':     { region:'south', sea:true,  rail:false, road:true, air:true,  hub:'Сямэнь',    note:'Юго-восток. Море из Сямэня/Фучжоу.' },
  'сямынь':     { region:'south', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт Юго-Востока. Море из Сямэня. Есть ограниченное ЖД через Чэнду (перегрузка).' },
  'хайкоу':     { region:'south', sea:true,  rail:false, road:false, air:true, hub:'Гуанчжоу',  note:'Остров Хайнань. Только море + паром. Авто через паром.' },
  'санья':      { region:'south', sea:true,  rail:false, road:false, air:true, hub:'Гуанчжоу',  note:'Хайнань. Только море (паром) или авиа.' },

  // ===== ВОСТОК: море + ЖД =====
  'шанхай':     { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Крупнейший порт Китая. Море из Яншань. ЖД через Сиань/Чэнду. Авто до границы.' },
  'нинбо':      { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт Нинбо-Чжоушань. Море + ЖД — универсальный вариант.' },
  'ханчжоу':    { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:'Нинбо',      note:'Через Нинбо (150 км). Есть ЖД через Сиань.' },
  'сучжоу':     { region:'east',  sea:true,  rail:true,  road:true, air:false, hub:'Шанхай',     note:'Через Шанхай (100 км). Море + ЖД.' },
  'нанькин':    { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт на Янцзы. Море через Шанхай. ЖД через Сиань.' },
  'иу':         { region:'east',  sea:true,  rail:true,  road:true, air:false, hub:'Нинбо',      note:'Город-экспортёр. Через Нинбо (180 км) морем, или авто до Сианя (1500 км) → ЖД.' },
  'цзиньхуа':   { region:'east',  sea:true,  rail:true,  road:true, air:false, hub:'Нинбо',      note:'Рядом с Иу. Через Нинбо морем или авто до ЖД-хаба.' },
  'вэньчжоу':   { region:'east',  sea:true,  rail:true,  road:true, air:true,  hub:'Нинбо',      note:'Порт Востока. Море из Вэньчжоу/Нинбо.' },

  // ===== СЕВЕР: прямое ЖД =====
  'пекин':      { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД из Пекина. Порт Тяньцзинь (150 км) для моря. Универсальный хаб.' },
  'тяньцзинь':  { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Северный порт + прямое ЖД. Оптимально море или ЖД.' },
  'шэньян':     { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД + порт Далянь (400 км). Универсал.' },
  'далянь':     { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт Северо-Востока. Море + ЖД. Хорошая логистика.' },
  'харбин':     { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД через Забайкальск. Один из главных ЖД-хабов.' },
  'цицикар':    { region:'north', sea:false, rail:true,  road:true, air:false, hub:'Харбин',     note:'Через Харбин (300 км) прямое ЖД.' },
  'цзинань':    { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:'Циндао',     note:'Через Циндао (350 км) море, или прямое ЖД.' },
  'циндао':     { region:'north', sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Порт + прямое ЖД. Универсальный хаб Севера.' },
  'чжэнчжоу':   { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Крупнейший ЖД-хаб Центра. Прямое ЖД в РФ.' },
  'шицзячжуан': { region:'north', sea:false, rail:true,  road:true, air:false, hub:'Чжэнчжоу',   note:'Через Чжэнчжоу (400 км) прямое ЖД.' },
  'тайюань':    { region:'north', sea:false, rail:true,  road:true, air:true,  hub:'Чжэнчжоу',   note:'Через Чжэнчжоу (500 км). Есть ЖД через Эрлянь.' },
  'сиань':      { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Главный ЖД-хаб для Центрального Китая. Прямое ЖД, 25-30 дней.' },
  'ланьчжоу':   { region:'north', sea:false, rail:true,  road:true, air:true,  hub:'Сиань',      note:'Через Сиань (600 км). ЖД через Хоргос.' },
  'урумчи':     { region:'north', sea:false, rail:true,  road:true, air:true,  hub:null,         note:'Прямое ЖД через Хоргос/Алашанькоу — самый быстрый ЖД-маршрут.' },

  // ===== ЦЕНТР: ЖД + река =====
  'ухань':      { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Речной порт + ЖД. Универсальный хаб Центра.' },
  'чанша':      { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'ЖД-хаб для Юга. Прямое ЖД через Чжэнчжоу.' },
  'наньчан':    { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:'Ухань',      note:'Через Ухань (350 км) ЖД.' },
  'чунцин':     { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Крупный ЖД-хаб. Прямое ЖД в РФ.' },
  'чэнду':      { region:'center',sea:false, rail:true,  road:true, air:true,  hub:null,         note:'ЖД-хаб. Прямое ЖД через Сиань/Чжэнчжоу.' },
  'хэфэй':      { region:'center',sea:false, rail:true,  road:true, air:true,  hub:'Ухань',      note:'Через Ухань (400 км) ЖД.' },
  'куньмин':    { region:'center',sea:false, rail:true,  road:true, air:true,  hub:'Чэнду',      note:'Через Чэнду (1100 км) ЖД.' },
  'наннин':     { region:'center',sea:true,  rail:true,  road:true, air:true,  hub:null,         note:'Юго-Запад. Есть ЖД в РФ через Чунцин.' },
};

function normalizeCityKey(s){ return String(s||'').toLowerCase().replace(/[^a-zа-яё]/gi,''); }

function renderRouteAdvice(){
  const el = $('#routeAdvice');
  if (!el) return;
  const from = ($('#fromCity')?.value || '').trim();
  const to = ($('#toCity')?.value || '').trim();
  if (!from || !to){ el.classList.add('hidden'); return; }
  const key = normalizeCityKey(from);
  const info = CHINA_CITIES_TRANSPORT[key];
  if (!info){ el.classList.add('hidden'); return; }

  const warnings = [];
  const modes = [];
  if (info.sea)  modes.push(ico('ship') + 'море' + (info.region==='south'?' (Наньша/Яньтянь)':info.region==='east'?' (Нинбо/Шанхай)':info.region==='north'?' (Циндао/Тяньцзинь)':' (Янцзы)'));
  if (info.rail) modes.push(ico('train') + 'прямое ЖД');
  if (info.road) modes.push(ico('truck') + 'авто');
  if (info.air)  modes.push(ico('plane') + 'авиа');

  // Предупреждения по выбранному транспорту
  if (selectedMode === 'rail' && !info.rail){
    warnings.push({ type:'danger', html:'<b>Прямого ЖД из ' + escapeHtml(from) + ' нет.</b> Варианты: авто до ' + escapeHtml(info.hub || 'ближайшего ЖД-хаба') + ', либо морем через порт.' });
  }
  if (selectedMode === 'road' && info.region === 'south'){
    warnings.push({ type:'warning', html:'<b>Авто из ' + escapeHtml(from) + ' в РФ — в 2-3 раза дороже моря + ЖД.</b> Оправдано только для срочных грузов до 20 т.' });
  }
  if (selectedMode === 'sea' && !info.sea && info.region === 'north'){
    warnings.push({ type:'warning', html:'Море из ' + escapeHtml(from) + ' — через ' + escapeHtml(info.hub || 'ближайший порт') + ' (авто 300-500 км). ЖД обычно выгоднее.' });
  }
  if (selectedMode === 'sea' && !info.sea){
    warnings.push({ type:'warning', html:'У ' + escapeHtml(from) + ' нет прямого выхода к морю. Груз пойдёт через ' + escapeHtml(info.hub || 'ближайший порт') + '.' });
  }
  if (selectedMode === 'air'){
    warnings.push({ type:'info', html:'Авиа — быстрее всего (5-8 дней), но в 5-10 раз дороже. Оправдано для грузов до 200 кг.' });
  }

  // Основная карточка
  let html = '<div class="route-advice-main"><span class="route-advice-icon">' + ico('map') + '</span><div class="route-advice-text">' +
    '<b>' + escapeHtml(from) + ' → ' + escapeHtml(to) + '</b>' +
    '<p>' + escapeHtml(info.note) + '</p>' +
    '<div class="route-advice-modes">' + modes.join(' · ') + '</div>' +
    '</div></div>';

  // Предупреждения
  warnings.forEach(function(w){
    const icon = ico(w.type === 'danger' ? 'ban' : w.type === 'warning' ? 'alert' : 'info');
    html += '<div class="route-advice-warn route-advice-' + w.type + '"><span class="route-advice-warn-icon">' + icon + '</span><div>' + w.html + '</div></div>';
  });

  el.innerHTML = html;
  el.classList.remove('hidden');
}

async function showRecommendation(name){
 const el=$('#recommendation'); if(!el)return;
 const from=$('#fromCity')?.value?.trim()||'';
 const to=$('#toCity')?.value?.trim()||'';
 const distance=Number($('#distance')?.value)||0;
 const weight=Number($('#weight')?.value)||0;
 const dims=dimensionsMm();
 const hasCargo=(weight>0)||(dims[0]>0&&dims[1]>0&&dims[2]>0);
 if(!from||!to||!hasCargo){el.classList.add('hidden');return;}
 try{
  const q=new URLSearchParams({from,to,mode:selectedMode||'',distance:String(distance)});
  const d=await fetch('/api/rates/recommend?'+q.toString()).then(r=>r.json());
  const pool=(d.matches||[]).filter(x=>Number.isFinite(Number(x.rate)));
  const best=pool[0];
  if(best){
    const rate=` — ${best.rate} ${best.currency||'RUB'}`;
    el.textContent=lang==='ru'?`Совет: присмотритесь к ${best.company}${rate}. Есть сохранённая ставка по похожему направлению.`:lang==='en'?`Tip: consider ${best.company}${rate}. A saved rate exists for a similar route.`:`建议关注 ${best.company}${rate}。数据库中有相似路线的历史运价。`;
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
 }catch{el.classList.add('hidden')}
}
function normalizeTextCompany(s=''){return String(s).toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'')}

const UNIT_SCALE={mm:1,cm:10,m:1000};
function unitLabel(){return dimensionUnit==='mm'?'мм':dimensionUnit==='cm'?'см':'м'}
function setDimensionUnit(next){
 if(!UNIT_SCALE[next]||next===dimensionUnit)return;
 ['length','width','height'].forEach(id=>{
   const el=$('#'+id); const old=Number(el.value); if(Number.isFinite(old)&&old>0){const mm=old*UNIT_SCALE[dimensionUnit]; const nextValue=mm/UNIT_SCALE[next]; el.value=Number.isInteger(nextValue)?nextValue:Number(nextValue.toFixed(3));}
 });
 dimensionUnit=next;
 updateDimensionUnitUI();
 containerFitWarning();
}
function updateDimensionUnitUI(){
 $$('.unit-choice').forEach(b=>b.classList.toggle('active',b.dataset.unit===dimensionUnit));
 const title=$('#dimensionsTitle'); if(title) title.textContent=lang==='ru'?`ГАБАРИТЫ ОДНОГО МЕСТА, ${unitLabel()}`:lang==='en'?`DIMENSIONS OF ONE PIECE, ${unitLabel()}`:`单件尺寸，${unitLabel()}`;
 setDimensionLabels();
}
function dimensionsMm(){
 return ['length','width','height'].map(id=>(Number($('#'+id).value)||0)*UNIT_SCALE[dimensionUnit]);
}
function fmtNum(n){const x=Number(n);if(!Number.isFinite(x))return '0';return Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(3).replace(/0+$/,'').replace(/\.$/,'')} function updateAutoVolume(){const [l,w,h]=dimensionsMm(),pieces=Number($('#pieces').value)||1,volume=(l*w*h/1e9)*pieces,factor=selectedMode&&modes[selectedMode]?modes[selectedMode].factor:167;const v=$('#autoVolume'),vw=$('#autoVolumetricWeight'),f=$('#autoFactor');if(v)v.textContent=volume?fmtNum(volume)+' m³':'0 m³';if(vw)vw.textContent=volume?fmtNum(volume*factor)+' kg':'0 kg';if(f)f.textContent=factor+' kg/m³';}
function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function cityName(c){if(Array.isArray(c)) return String(c[1]||c[0]||c[2]||'').trim(); if(c&&typeof c==='object') return String(c.name||c.nameEn||c.nameZh||'').trim(); return String(c||'').trim()}
function editDistance(a,b){a=normalize(a);b=normalize(b);const m=a.length,n=b.length;if(!m||!n)return Math.max(m,n);let prev=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[n]}
function cityMatches(q,target){
 const x=normalize(q).trim(); const isAsia=/^(asia|china)$/i.test(String(target||'')); const list=cities.filter(c=>isAsia?ASIA_CODES.has(String(c[5]||'').toLowerCase()):String(c[5]||'').toLowerCase()==='ru'); if(!x)return [];
 return list.map(c=>{
   const fields=[c[0],c[1],c[2]]; let score=99; let fuzzy=false; let correction='';
   fields.forEach((f,i)=>{const n=normalize(f); if(n===x)score=Math.min(score,0); else if(n.startsWith(x))score=Math.min(score,1+i*.1); else if(n.includes(x))score=Math.min(score,3+i*.1); else {const d=editDistance(x,n); const limit=Math.max(1,Math.floor(Math.max(x.length,n.length)*.35)); if(d<=limit){score=Math.min(score,6+d);fuzzy=true; if(!correction||d<editDistance(x,normalize(correction)))correction=f;}}});
   if(fuzzy&&correction){c=[...c];c[8]={correction}}
   return {c,score};
 }).filter(o=>o.score<99).sort((a,b)=>a.score-b.score||a.c[0].localeCompare(b.c[0],'ru')).slice(0,20).map(o=>o.c)
}
function renderSuggestions(box,list,input,target){
 box.innerHTML='';
 list.forEach(c=>{const d=document.createElement('button');d.type='button';const title=c[lang==='zh'?2:lang==='en'?1:0]||c[0];const sub=c[8]?.address|| (c[3]?`${c[3]} · ${c[4]||''}`:'');const correction=(c[8]&&c[8].correction)?`<em class=city-correction>Возможно, вы имели в виду «${escapeHtml(c[8].correction)}»?</em>`:'';d.innerHTML=`<strong>${escapeHtml(title)}</strong><small>${escapeHtml(sub)}</small>${correction}`;d.onclick=()=>{input.value=lang==='zh'?c[2]:lang==='en'?c[1]:c[0];box.classList.remove('open');if(target==='asia')selectedCities.from=c;else selectedCities.to=c;autoDistance();renderRouteAdvice()};box.appendChild(d)});
 if(box)box.classList.toggle('open',list.length>0)
}
function inputIdForTarget(target){return target==='asia'?'fromCity':'toCity'}
function setupAutocomplete(inputId,boxId,target){const input=$('#'+inputId),box=$('#'+boxId);if(!input||!box)return;input.addEventListener('input',()=>{const q=input.value.trim();if(inputId==='fromCity')selectedCities.from=null;else selectedCities.to=null;renderSuggestions(box,cityMatches(q,target),input,target);if(q.length>=1)fetchGeo(q,target,box,input)});input.addEventListener('focus',()=>{const q=input.value.trim();renderSuggestions(box,q?cityMatches(q,target):[],input,target)});}
async function fetchGeo(q,target,box,input){
  const local=cityMatches(q,target); renderSuggestions(box,local,input,target);
  try{
    const endpoint=q.length>=4?`/api/geocode?q=${encodeURIComponent(q)}&scope=${target}`:`/api/cities?q=${encodeURIComponent(q)}&country=${/^(asia|china)$/i.test(String(target||''))?'ASIA':'RU'}`;
    const r=await fetch(endpoint,{cache:'no-store'}); const data=await r.json(); if(input.value.trim()!==q)return;
    const remote=(data.results||[]).map(x=>{const label=x.display_name||x.name||'';const name=x.name||label.split(',')[0];const arr=[name,x.nameEn||name,x.nameZh||name,x.admin1||'',x.country||'',x.country_code,x.latitude,x.longitude];if(label&&label!==name)arr[8]={address:label};return arr});
    let merged=[...local,...remote]; const seen=new Set(); merged=merged.filter(v=>{const k=normalize(`${v[0]}|${v[1]}`);if(seen.has(k))return false;seen.add(k);return true});
    renderSuggestions(box,merged.slice(0,20),input,target);
  }catch{ renderSuggestions(box,local,input,target); }
}
setupAutocomplete('fromCity','fromSuggestions','asia');setupAutocomplete('toCity','toSuggestions','russia');

document.addEventListener('click',e=>{$$('.suggestions').forEach(box=>{if(!e.target.closest('.autocomplete'))box.classList.remove('open')})});


// ========== Сохранение полей формы ==========
// v110: поля калькулятора всегда пустые при открытии
(function(){
  const ids = ['fromCity','toCity','weight','pieces','distance','length','width','height'];
  ids.forEach(function(id){
    try { localStorage.removeItem('iomas_field_' + id); } catch(e){}
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
    el.addEventListener('change', function(){ try { localStorage.setItem('iomas_field_' + id, el.value); } catch(e){} });
  });
})();
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('blur',()=>setTimeout(autoDistance,120)));
let autoDistanceTimer=0;
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{clearTimeout(autoDistanceTimer);autoDistanceTimer=setTimeout(autoDistance,350);}));
function haversineKm(a,b){const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(b[0]-a[0]),dLon=rad(b[1]-a[1]);const q=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
async function resolveCityCoordinates(city,target){
 if(Array.isArray(city)&&Number.isFinite(Number(city[6]))&&Number.isFinite(Number(city[7])))return [Number(city[6]),Number(city[7])];
 const q=cityName(city); if(!q)return null;
 const isAsia=/^(asia|china)$/i.test(String(target||'')); const local=cities.filter(c=>isAsia?ASIA_CODES.has(String(c[5]||'').toLowerCase()):String(c[5]||'').toLowerCase()==='ru');
 const hit=local.find(c=>[c[0],c[1],c[2]].some(v=>normalize(v)===normalize(q))) || local.find(c=>[c[0],c[1],c[2]].some(v=>normalize(v).startsWith(normalize(q))));
 if(hit&&Number.isFinite(Number(hit[6]))&&Number.isFinite(Number(hit[7])))return [Number(hit[6]),Number(hit[7])];
 try{const url=`/api/cities?q=${encodeURIComponent(q)}&limit=8&country=${/^(asia|china)$/i.test(String(target||''))?'ASIA':'RU'}`;const r=await fetch(url);if(!r.ok)return null;const d=await r.json();const x=(d.results||[]).find(v=>{const cc=String(v.country_code||'').toUpperCase();return (/^(asia|china)$/i.test(String(target||''))?ASIA_CODES.has(cc.toLowerCase()):cc==='RU')&&Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))}) || (d.results||[]).find(v=>Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude)));return x?[Number(x.latitude),Number(x.longitude)]:null}catch{return null}
}
let distanceRequestId=0;
async function autoDistance(){
 const requestId=++distanceRequestId;
 const fromText=$('#fromCity')?.value?.trim()||'', toText=$('#toCity')?.value?.trim()||'';
 if(!fromText||!toText){$('#distance').value='';$('#distance').dataset.auto='';document.getElementById('recommendation')?.classList.add('hidden');document.getElementById('routeAdvice')?.classList.add('hidden');return}
 try{
   const r = await fetch('/api/route-distance?from=' + encodeURIComponent(fromText) + '&to=' + encodeURIComponent(toText));
   if (requestId !== distanceRequestId) return;
   const d = await r.json();
   if (d && d.ok && Number.isFinite(d.distanceKm)){
     $('#distance').value = d.distanceKm;
     $('#distance').dataset.auto = '1';
     try{ renderRouteAdvice(); }catch(e){}
     showRecommendation(selectedForwarder);
     return;
   }
 }catch(e){ console.warn('route-distance:', e.message); }
 // Fallback — прямая линия
 const a=selectedCities.from && cityName(selectedCities.from)===fromText?selectedCities.from:[fromText];
 const b=selectedCities.to && cityName(selectedCities.to)===toText?selectedCities.to:[toText];
 const [ca,cb]=await Promise.all([resolveCityCoordinates(a,'china'),resolveCityCoordinates(b,'russia')]);
 if(requestId!==distanceRequestId||!ca||!cb)return;
 const km=Math.round(haversineKm(ca,cb)*1.25);
 $('#distance').value=km;$('#distance').dataset.auto='1';
 try{ renderRouteAdvice(); }catch(e){}
 showRecommendation(selectedForwarder);
}

function fitsContainer(dims, container){
 const sorted=[...dims].sort((a,b)=>b-a), c=[...container].sort((a,b)=>b-a);
 return sorted.every((v,i)=>v<=c[i]);
}
function containerFitWarning(){
 const box=$('#containerWarning'); if(!box)return;
 const dims=dimensionsMm(); const [l,w,h]=dims;
 if(!l||!w||!h){box.classList.add('hidden');return}
 const c20=[5898,2352,2390], c40=[12032,2352,2390], c40hc=[12032,2352,2690];
 let text='';
 if(fitsContainer(dims,c20)) text='';
 else if(fitsContainer(dims,c40)) text='⚠️ В 20 DC не войдёт. Потребуется 40 DC.';
 else if(fitsContainer(dims,c40hc)) text='⚠️ В 20 DC и 40 DC не войдёт. Потребуется 40 HC.';
 else text='⚠️ Габариты не помещаются даже в 40 HC. Нужен негабарит / OOG и отдельное согласование.';
 box.innerHTML=text?ico('alert')+'<span>'+escapeHtml(text.replace(/^⚠️\s*/,''))+'</span>':'';box.classList.toggle('hidden',!text);
}
['length','width','height','pieces'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{containerFitWarning();updateAutoVolume()}));
$$('.unit-choice').forEach(b=>b.addEventListener('click',()=>setDimensionUnit(b.dataset.unit)));
updateDimensionUnitUI();
containerFitWarning();
$('#calculate').onclick=async()=>{const btn=$('#calculate');btn.classList.add('is-loading');btn.disabled=true;const weight=Number($('#weight').value)||0,pieces=Number($('#pieces').value)||1,[l,w,h]=dimensionsMm();selectedFactor=selectedMode&&modes[selectedMode]?modes[selectedMode].factor:167;renderFactors();const volume=l*w*h/1e9*pieces,volumetric=volume*selectedFactor,charge=Math.max(weight,volumetric);const result=$('#result');result.classList.remove('hidden');result.innerHTML=`<div class="result-loading">${lang==='ru'?'Ищу подходящую ставку…':lang==='en'?'Finding a matching rate…':'正在寻找匹配的运价…'}</div>`;containerFitWarning();
 try{const qs=new URLSearchParams({from:$('#fromCity').value.trim(),to:$('#toCity').value.trim(),mode:selectedMode||'',distance:$('#distance').value||''});const r=await fetch('/api/rates/recommend?'+qs.toString());const d=await r.json();const rows=(d.matches||[]).filter(x=>Number.isFinite(Number(x.rate)));const best=rows[0];const fmtMoney=n=>new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='zh'?'zh-CN':'en-US',{maximumFractionDigits:3}).format(Number(n));const chinese=x=>/中国|china|chinese|\.cn$/i.test(String(x?.company||'')+' '+String(x?.source||'')+' '+String(x?.notes||''));let html='';
 if(best){let price=Number(best.rate);let commission=0;if(chinese(best)){commission=price*.05;price+=commission}html=`<div class="result-price-window"><div class="result-kicker">${lang==='ru'?'РАСЧЁТ ПЕРЕВОЗКИ':lang==='en'?'TRANSPORT QUOTE':'运输报价'}</div><div class="result-price">${fmtMoney(price)} <span>${escapeHtml(best.currency||'USD')}</span></div><div class="result-meta"><b>${escapeHtml(best.company||'—')}</b> · ${escapeHtml(best.basis||'shipment')} · ${escapeHtml(best.mode||selectedMode||'—')}</div><div class="result-grid"><span>${lang==='ru'?'Грузовой вес':'Chargeable weight'}<b>${fmtNum(charge)} kg</b></span><span>${lang==='ru'?'Объём':'Volume'}<b>${fmtNum(volume)} m³</b></span><span>${lang==='ru'?'Расстояние':'Distance'}<b>${fmtNum(Number($('#distance').value)||0)} km</b></span><span>${lang==='ru'?'Ставка':'Base rate'}<b>${fmtMoney(best.rate)} ${escapeHtml(best.currency||'')}</b></span></div>${commission?`<div class="commission-note">+ 5% ${lang==='ru'?'комиссия китайского перевозчика уже включена':'Chinese carrier transfer commission included'}</div>`:''}<div class="terminal-warning">${ico('alert')}${lang==='ru'?'Обязательно уточнить терминальные расходы в пункте прибытия.':lang==='en'?'Confirm terminal charges at destination.':'务必确认目的地的码头费用。'}</div>${best.notes?`<div class="result-notes">${escapeHtml(best.notes)}</div>`:''}</div>`}
 else {html=`<div class="result-price-window"><div class="result-kicker">${lang==='ru'?'СТАВКА НЕ НАЙДЕНА':lang==='en'?'NO MATCHING RATE':'未找到匹配运价'}</div><div class="result-price muted">—</div><p>${lang==='ru'?'В базе нет однозначной ставки для этого маршрута. Я не буду придумывать цену. Добавьте КП или выберите экспедитора/транспорт с сохранённой ставкой.':lang==='en'?'There is no unambiguous saved rate for this route. I will not invent a price. Add a quote or choose a forwarder/transport with a saved rate.':'数据库中没有该路线的明确运价，不会虚构价格。请添加报价或选择已有运价的代理商/运输方式。'}</p><div class="terminal-warning">${ico('alert')}${lang==='ru'?'Даже при найденной ставке обязательно уточнять терминальные расходы в пункте прибытия.':lang==='en'?'Always confirm destination terminal charges.':'务必确认目的地码头费用。'}</div></div>`}
 result.innerHTML=html;
 }catch(e){result.innerHTML=`<div class="result-price-window"><div class="result-kicker">${lang==='ru'?'НЕ УДАЛОСЬ РАССЧИТАТЬ':lang==='en'?'CALCULATION ERROR':'计算失败'}</div><p>${escapeHtml(friendlyError(e))}</p></div>`}
 showRecommendation(selectedForwarder);btn.classList.remove('is-loading');btn.disabled=false;try{result.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}};
$('#result')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.add('hidden')});

let distanceTimer=null;
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{clearTimeout(distanceTimer);distanceTimer=setTimeout(autoDistance,450)}));
['fromCity','toCity'].forEach(id=>$('#'+id)?.addEventListener('change',autoDistance));

// AI chat: полностью локальный бесплатный режим. Файлы извлекаются в браузере.
function getCalculatorContext(){return {from:$('#fromCity')?.value||'',to:$('#toCity')?.value||'',distanceKm:Number($('#distance')?.value)||null,weightKg:Number($('#weight')?.value)||null,pieces:Number($('#pieces')?.value)||null,lengthMm:dimensionsMm()[0]||null,widthMm:dimensionsMm()[1]||null,heightMm:dimensionsMm()[2]||null,forwarder:selectedForwarder||'',transport:selectedMode?modeName(selectedMode):'',incoterms:$('#incotermBtn span')?.textContent||'EXW'};}
function clearChatEmpty(){$('#chatMessages')?.querySelector('.chat-empty')?.remove()}
function renderChatEmpty(force){const box=$('#chatMessages');if(!box)return;if(force)box.querySelector('.chat-empty')?.remove();if(box.children.length)return;const S={ru:{t:'Чем помочь?',p:'Спросите про маршрут, ставку, Incoterms или таможню — текстом или голосом.',c:['Ставка Гуанчжоу → Новосибирск','Что такое EXW и FCA?','Как посчитать объёмный вес?','Какие документы нужны для ввоза товара?']},en:{t:'How can I help?',p:'Ask about routes, rates, Incoterms or customs — by text or voice.',c:['Rate Guangzhou → Novosibirsk','What are EXW and FCA?','How to calculate volumetric weight?','Which documents do I need to import goods?']},tr:{t:'Nasıl yardımcı olabilirim?',p:'Rota, navlun, Incoterms veya gümrük hakkında sorun — yazılı ya da sesli.',c:['Guangzhou → Novosibirsk navlun','EXW ve FCA nedir?','Hacimsel ağırlık nasıl hesaplanır?','İthalat için hangi belgeler gerekli?']},zh:{t:'需要什么帮助？',p:'可以咨询路线、运价、贸易术语或清关——文字或语音均可。',c:['广州 → 新西伯利亚 运价','EXW 和 FCA 是什么？','如何计算体积重量？','进口货物需要哪些文件？']}}[lang]||null;if(!S)return;const d=document.createElement('div');d.className='chat-empty';d.innerHTML='<div class="chat-empty-icon">'+ICONS_SVG('sparkle')+'</div><h3></h3><p></p><div class="chat-chips"></div>';d.querySelector('h3').textContent=S.t;d.querySelector('p').textContent=S.p;const chips=d.querySelector('.chat-chips');S.c.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='chat-chip';b.textContent=t;b.onclick=()=>{const i=$('#assistantInput');if(i){i.value=t;Promise.resolve(sendAI(false)).catch(()=>{})}};chips.appendChild(b)});box.appendChild(d)}
function ICONS_SVG(n){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||'')+'</svg>'}
const AI_T = {
  ru: { t1: 'Думаю над вопросом…', t2: 'Ищу подробности, ещё немного…', file: 'Читаю файл…' },
  en: { t1: 'Thinking it over…', t2: 'Looking into the details, almost there…', file: 'Reading the file…' },
  zh: { t1: '正在思考…', t2: '正在查找细节，马上就好…', file: '正在读取文件…' },
  tr: { t1: 'Düşünüyorum…', t2: 'Ayrıntılara bakıyorum, az kaldı…', file: 'Dosya okunuyor…' }
};
let __thinkTimers = [];
function miniMd(t){
  let h = String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/^#{1,4}\s+(.+)$/gm, '<strong>$1</strong>');
  h = h.replace(/^\s*[-*•]\s+(.+)$/gm, '<span class="li">• $1</span>');
  return h;
}
function setAIThinking(on, error = ''){
  const box = $('#chatMessages'); if (!box) return;
  const sb = $('#sendAI'); if (sb){ sb.disabled = !!on; sb.classList.toggle('is-loading', !!on); }
  window.__aiBusy = !!on;
  __thinkTimers.forEach(clearTimeout); __thinkTimers = [];
  if (on || error) clearChatEmpty();
  const old = box.querySelector('.ai-thinking-bubble'); if (old) old.remove();
  if (window.VoiceOrb && window.__voiceSession) window.VoiceOrb.set(on ? 'thinking' : (window.__aiSpeaking ? 'speaking' : 'idle'));
  if (on){
    const d = document.createElement('div');
    d.className = 'chat-bubble assistant ai-thinking-bubble';
    d.innerHTML = '<i></i><i></i><i></i><span class="ai-think-text"></span>';
    box.appendChild(d); box.scrollTop = box.scrollHeight;
    const tt = AI_T[lang] || AI_T.ru, label = d.querySelector('.ai-think-text');
    if (($('#aiFile')?.files || []).length) label.textContent = tt.file;
    __thinkTimers.push(setTimeout(() => { if (label.isConnected && !label.textContent) label.textContent = tt.t1; }, 1800));
    __thinkTimers.push(setTimeout(() => { if (label.isConnected) label.textContent = tt.t2; }, 7000));
  } else if (error){
    const d = document.createElement('div'); d.className = 'chat-bubble assistant ai-error-bubble'; d.textContent = error;
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
}
function addChat(role, text, shouldSpeak = false){
  clearChatEmpty();
  const d = document.createElement('div'); d.className = `chat-bubble ${role}`;
  if (role === 'assistant') d.innerHTML = miniMd(text); else d.textContent = text;
  $('#chatMessages').appendChild(d); $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
  if (role === 'assistant' && shouldSpeak) speakAI(text);
}
async function streamAnswer(payload, fromVoice){
  const box = $('#chatMessages');
  const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' }, body: JSON.stringify(Object.assign({ stream: true }, payload)) });
  if (!r.ok){ let m = 'AI unavailable'; try { const j = await r.json(); m = j.error || m; } catch (e) {} throw new Error(m); }
  if (!/event-stream/.test(r.headers.get('content-type') || '') || !r.body){
    const d = await r.json(); if (!d.ok) throw new Error(d.error || 'AI unavailable');
    setAIThinking(false); addChat('assistant', d.text, fromVoice); return d.text;
  }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = '', full = '', bubble = null, raf = 0;
  const paint = () => { raf = 0; if (bubble){ bubble.innerHTML = miniMd(full); box.scrollTop = box.scrollHeight; } };
  const show = () => {
    if (!bubble){
      setAIThinking(false);
      if (fromVoice && window.VoiceOrb) window.VoiceOrb.set('thinking');
      bubble = document.createElement('div'); bubble.className = 'chat-bubble assistant streaming'; box.appendChild(bubble);
    }
    if (!raf) raf = requestAnimationFrame(paint);
  };
  for (;;){
    const chunk = await reader.read();
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0){
      const ev = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
      if (ev.indexOf('data:') !== 0) continue;
      let j; try { j = JSON.parse(ev.slice(5)); } catch (e) { continue; }
      if (j.delta){ full += j.delta; show(); }
      else if (j.error){ throw new Error(j.error); }
    }
  }
  if (raf) cancelAnimationFrame(raf);
  if (!full.trim()) throw new Error('empty answer');
  if (!bubble) show();
  bubble.innerHTML = miniMd(full); bubble.classList.remove('streaming'); box.scrollTop = box.scrollHeight;
  if (fromVoice) speakAI(full);
  return full;
}
async function extractAttachment(file){
 const name=file.name.toLowerCase(), ext=name.split('.').pop();
 if(['txt','csv','json','text','md','markdown','rtf'].includes(ext)){let t=await file.text();if(ext==='rtf')t=t.replace(/\\[a-z]+\d* ?/gi,'').replace(/[{}]/g,'');return t.slice(0,120000)}
 if(ext==='pdf'){const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let out='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),c=await page.getTextContent();out+=c.items.map(x=>x.str||'').join(' ')+'\n';if(out.length>120000)break}return out.slice(0,120000)}
 if(['xlsx','xls'].includes(ext)){const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});return wb.SheetNames.map(n=>`[${n}]\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n').slice(0,120000)}
 if(ext==='docx'){const mammoth=await import('https://cdn.jsdelivr.net/npm/mammoth@1.9.0/+esm');const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return r.value.slice(0,120000)}
 if(['png','jpg','jpeg','webp'].includes(ext)){const T=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm');const r=await T.recognize(file,lang==='zh'?'eng+chi_sim':lang==='en'?'eng':lang==='tr'?'tur+eng':'rus+eng',{logger:m=>{if(m.status==='recognizing text')setAIThinking(true,`${tr('transcribe')} ${Math.round((m.progress||0)*100)}%`)}});return String(r.data.text||'').slice(0,120000)}
 throw new Error('Формат файла пока не поддерживается');
}
function detectRequestedAction(msg=''){const x=msg.toLowerCase();if(/перевед|translate|翻译/.test(x))return 'translate';if(/цифр|числ|numbers|extract.*number|数字/.test(x))return 'numbers';if(/структур|таблиц|структурир|structure|整理/.test(x))return 'structure';if(/ставк|кп|тариф|quote|rate|运价/.test(x))return 'rates';return 'analyze'}
async function parseRatesLocally(text,companyHint=''){
 const lower=text.toLowerCase();
 if(lower.includes('ruscargo')||lower.includes('rus cargo')||/fo?b\s*40hc\s*coc/i.test(text)){
  const destinations={Москва:[['Shanghai',9600],['Qingdao',9500],['Ningbo',9700],['Nansha',9700],['Xiamen',9600]],'Санкт-Петербург':[['Shanghai',9800],['Qingdao',9800],['Ningbo',9800],['Nansha',9900],['Xiamen',9900]],'Екатеринбург':[['Shanghai',9700],['Qingdao',9700],['Ningbo',9700],['Nansha',9800],['Xiamen',9800]],'Новосибирск':[['Shanghai',8800],['Qingdao',8800],['Ningbo',8700],['Nansha',8900],['Xiamen',8900]],Минск:[['Shanghai',9800],['Qingdao',9900],['Ningbo',9800],['Nansha',9800],['Xiamen',9800]]};
  const records=[];for(const [to,rows] of Object.entries(destinations))for(const [from,rate] of rows)records.push({company:'Ruscargo',from,to,mode:'rail',incoterms:'FOB',container:'40HC COC',rate,currency:'USD',basis:'container',transitDays:'30-35',validFrom:'2026-09-14',validUntil:null,source:'КП Ruscargo, предоставлено пользователем',sourceType:'user_quote',approximateAfterValidity:true,notes:'Индикативная ставка; брутто до 26 т; генеральный неопасный груз без батареек/АКБ; EXW/FCA: +600 USD к FOB; подтвердить наличие контейнеров и мест.'});return records;
 }
 return [];
}
async function importLocalRates(records){if(!records.length)return 0;const r=await fetch('/api/rates/import-local',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({records})});if(!r.ok)throw new Error('Не удалось сохранить ставки');const d=await r.json();return Number(d.added||0)}
async function sendAI(fromVoice=false){
 if($('#sendAI')?.classList.contains('is-loading'))return;
 if(!fromVoice){try{window.speechSynthesis?.cancel()}catch{}}
 const input=$('#assistantInput'), msg=input.value.trim(), files=[...($('#aiFile')?.files||[])];
 if(!msg&&!files.length){setAIThinking(false);addChat('assistant',lang==='tr'?'Bir soru yazın veya dosya ekleyin.':lang==='en'?'Write a question or attach a file.':'Напишите вопрос или прикрепите файл.',false);return;}
 const shown=msg||(files.length?`📎 ${files.map(f=>f.name).join(', ')}`:''); addChat('user',shown,false); setAIThinking(true);
 try{let docs=[];for(const f of files){const text=await extractAttachment(f);docs.push({name:f.name,text});}let imported=0;for(const d of docs){const recs=await parseRatesLocally(d.text,d.name);if(recs.length)imported+=await importLocalRates(recs)}if(imported)await loadRates();const action=detectRequestedAction(msg);let instruction=msg||'Проанализируй прикрепленный файл и дай краткий полезный результат.';if(action==='rates'&&docs.length)instruction+=' Считай файл КП/ставками: выдели перевозчика, маршруты, транспорт, базис, цены, валюту, срок действия и ограничения. Скажи, какие ставки сохранены.';if(action==='numbers')instruction+=' Извлеки только важные цифры и подпиши, что каждая означает.';if(action==='translate')instruction+=` Переведи содержимое файла на ${lang==='ru'?'русский':lang==='en'?'английский':lang==='tr'?'турецкий':'китайский'} язык.`;if(action==='structure')instruction+=' Структурируй данные в удобные списки/таблицу.';const fileContext=docs.length?docs.map(d=>`\n--- ФАЙЛ: ${d.name} ---\n${d.text}`).join('\n'):'';const finalMessage=instruction+fileContext+(imported?`\n\nВ базу ставок уже сохранено записей: ${imported}. Учитывай их в ответе.`:'');const text=await streamAnswer({message:finalMessage,history:chatHistory.slice(-10),context:getCalculatorContext(),language:lang},fromVoice);chatHistory.push({role:'user',content:finalMessage},{role:'assistant',content:text});chatHistory=chatHistory.slice(-12);if(input)input.value='';if($('#aiFile'))$('#aiFile').value='';if($('#fileNames'))$('#fileNames').textContent=tr('fileHint')}catch(e){const msg=friendlyError(e);setAIThinking(false,(lang==='tr'?'Yanıt alınamadı: ':lang==='en'?'Could not get a response: ':'Не удалось получить ответ: ')+msg)}}
$('#aiFile')?.addEventListener('change',e=>{const fs=[...e.target.files],el=$('#fileNames');if(el)el.textContent=fs.length?fs.map(f=>f.name).join(' · '):tr('fileHint')});
// Reliable send binding: works with mouse, touch and Enter and cannot be blocked by a nested handler.
document.addEventListener('click',e=>{const b=e.target.closest?.('#sendAI');if(!b)return;e.preventDefault();e.stopPropagation();Promise.resolve(sendAI(false)).catch(err=>console.warn('AI send:',err));},true);
document.addEventListener('keydown',e=>{if(e.target?.id==='assistantInput'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();Promise.resolve(sendAI(false)).catch(err=>console.warn('AI send:',err));}},true);
setTimeout(()=>{const i=$('#assistantInput'),b=$('#sendAI');if(i){i.disabled=false;i.removeAttribute('readonly')}if(b){b.disabled=false;b.style.pointerEvents='auto'}},0);

// Forwarder directory: clear contact table.
function normalizeText(s=''){return String(s).toLowerCase().trim().replace(/\s+/g,' ')}
function translatedTransportLabel(m){const x=normalizeText(m); if(x.includes('авиа')||x==='air')return tr('transportAir'); if(x.includes('авто')||x==='road')return tr('transportRoad'); if(x.includes('жд')||x==='rail')return tr('transportRail'); if(x.includes('море + жд')||x.includes('sea + rail')||x==='multimodal')return tr('transportMulti'); if(x.includes('море')||x==='sea')return tr('transportSea'); return m}
function renderDirectory(){
 const grid=$('#directoryGrid'), filters=$('#directoryFilters'); if(!grid||!filters)return;
 // Never leave the directory empty because of an API/network failure: the bundled directory is the source of truth.
 if(!Array.isArray(agentDirectory)||!agentDirectory.length){
   try{agentDirectory=JSON.parse(document.getElementById('embeddedAgents')?.textContent||'[]')}catch{}
 }
 filters.innerHTML=''; const allModes=[['all',tr('all')],...modeGroups.map(([k,key])=>[k,tr(key)])];
 allModes.forEach(([key,label])=>{const b=document.createElement('button');b.className='directory-filter'+(key==='all'?' active':'');b.textContent=label;b.onclick=()=>{filters.querySelectorAll('.directory-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDirectoryItems(key)};filters.appendChild(b)});
 renderDirectoryItems('all');
 function renderDirectoryItems(mode){
  grid.innerHTML='';
  const groups=new Map();
  agentDirectory.filter(a=>mode==='all'||(a.modes||[]).includes(mode)||(mode==='rail'&&(a.modes||[]).includes('multimodal'))||(mode==='sea'&&(a.modes||[]).includes('multimodal'))).forEach(a=>{
   const key=normalizeTextCompany(a.company||''); if(!groups.has(key))groups.set(key,{company:a.company,contacts:new Set(),phones:new Set(),emails:new Set(),sites:new Set(),modes:new Set(),transport:new Set(),notes:new Set()});
   const g=groups.get(key);if(a.contact)g.contacts.add(a.contact);if(a.phone)g.phones.add(a.phone);if(a.email)a.email.split(/[,;]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>g.emails.add(x));if(a.site)g.sites.add(a.site);(a.modes||[]).forEach(x=>g.modes.add(x));(a.transport||[]).forEach(x=>g.transport.add(x));if(a.notes)g.notes.add(a.notes);
  });
  [...groups.values()].forEach(g=>{const trEl=document.createElement('tr');const sites=[...g.sites];const site=sites.length?sites.map(x=>`<a href="${x.startsWith('http')?x:'https://'+x}" target="_blank" rel="noopener">${x.replace(/^https?:\/\//,'')}</a>`).join('<br>'):'—';const contacts=[...g.contacts].join('<br>')||'—';const phones=[...g.phones].join('<br>')||'—';const emails=[...g.emails].join('<br>')||'—';const modes=[...g.modes].map(translatedTransportLabel).join(', ')||[...g.transport].map(translatedTransportLabel).join(', ')||'—';const __L=[tr('company'),tr('contact'),tr('phone'),tr('email'),tr('website'),tr('directions'),tr('note')];const __cells=[`<b>${escapeHtml(g.company||'—')}</b>`,contacts,phones,emails,site,modes,[...g.notes].join('<br>')||'—'];trEl.innerHTML=__cells.map((c,i)=>`<td data-label="${__L[i]}"${c==='—'?' data-empty':''}>${c}</td>`).join('');grid.appendChild(trEl)});if(!groups.size){const __e={ru:'Нет экспедиторов для этого направления',en:'No forwarders for this direction',tr:'Bu yön için forwarder yok',zh:'该方向暂无货运代理'};grid.innerHTML=`<tr><td class="empty-cell" colspan="7">${__e[lang]||__e.ru}</td></tr>`;}
 }
}

// Customs code checker: submit to the server, which uses FTS-first web research plus OpenAI for structured analysis.
async function checkCustomsCode(){const __b=$('#customsCheck');if(__b){__b.disabled=true;__b.classList.add('is-loading')}try{await _checkCustomsCode()}finally{if(__b){__b.disabled=false;__b.classList.remove('is-loading')}}}
async function _checkCustomsCode(){
  const input=$('#customsCode'), status=$('#customsStatus'), result=$('#customsResult');
  const code=String(input?.value||'').replace(/\D/g,'').slice(0,10);
  if(!code||code.length<4){if(status)status.textContent=lang==='tr'?'En az 4 hane girin.':lang==='en'?'Enter at least 4 digits.':'Введите минимум 4 цифры кода ТН ВЭД.';return;}
  if(status)status.textContent=lang==='tr'?'Kod kontrol ediliyor…':lang==='en'?'Checking code…':'Проверяю код…';
  if(result){result.classList.remove('hidden');result.innerHTML='<div class="customs-result-grid">'+Array(6).fill('<div class="customs-info-card"><div class="skeleton" style="width:40%;height:10px"></div><div class="skeleton" style="width:80%;height:14px;margin-top:8px"></div></div>').join('')+'</div>';}
  try{
    const r=await fetch('/api/customs/check',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({code})});
    const raw=await r.text();let d={};try{d=JSON.parse(raw)}catch{throw new Error(raw||'Не удалось получить ответ')}
    if(r.status===401)throw new Error(lang==='tr'?'Oturum süresi doldu. Uygulamaya tekrar girin.':lang==='en'?'Session expired. Please log in again.':'Сессия авторизации истекла. Перезайдите в приложение.');
    if(!r.ok||!d.ok)throw new Error(d.error||'Не удалось получить информацию по коду');
    if(status)status.textContent=lang==='tr'?`Kod ${d.code||code} kontrol edildi`:lang==='en'?`Code ${d.code||code} checked`:`Код ${d.code||code} проверен`;
    if(result){const raw=String(d.analysis||(lang==='tr'?'Bilgi bulunamadı.':lang==='en'?'No information found.':'Информация не найдена.')); const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean); const labels=['КОД','ОПИСАНИЕ','ИМПОРТНАЯ ПОШЛИНА','НДС','АКЦИЗ','ТАМОЖЕННЫЙ СБОР','ЧЕСТНЫЙ ЗНАК','РАЗРЕШИТЕЛЬНЫЕ ДОКУМЕНТЫ','ЗАПРЕТЫ И ОГРАНИЧЕНИЯ','ЕДИНИЦА ИЗМЕРЕНИЯ','ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ','ИСТОЧНИКИ','ПРИМЕЧАНИЕ']; const cards=lines.map(line=>{const m=line.match(/^([^:]{2,45}):\s*(.*)$/); if(!m||!labels.includes(m[1].toUpperCase())) return `<div class="customs-free-line">${escapeHtml(line)}</div>`; const cls=m[1].toUpperCase()==='ЧЕСТНЫЙ ЗНАК'?' customs-marking':''; return `<div class="customs-info-card${cls}"><div class="customs-info-label">${escapeHtml(m[1])}</div><div class="customs-info-value">${escapeHtml(m[2])}</div></div>`}).join(''); result.innerHTML=`<div class="customs-result-title">${escapeHtml(d.title||('ТН ВЭД '+code))}</div><div class="customs-result-grid">${cards}</div>`;result.classList.remove('hidden')}
  }catch(e){if(result){result.classList.add('hidden');result.innerHTML='';}if(status)status.textContent=friendlyError(e)||(lang==='tr'?'Kontrol hatası':lang==='en'?'Check error':'Ошибка проверки');}
}
$('#customsCheck')?.addEventListener('click',e=>{e.preventDefault();checkCustomsCode()});
$('#customsCode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkCustomsCode()}});
let customsAutoTimer=null; $('#customsCode')?.addEventListener('input',()=>{const v=$('#customsCode').value.replace(/\D/g,''); if(v.length===10){clearTimeout(customsAutoTimer);customsAutoTimer=setTimeout(checkCustomsCode,250);}});

// Voice: use native SpeechRecognition when available; otherwise record audio and transcribe via OpenAI.
let recognition=null,voiceListening=false,voiceAutoSpeak=false,voiceFinalBuffer='',mediaRecorder=null,mediaChunks=[];
function voiceLang(){return lang==='zh'?'zh-CN':lang==='en'?'en-US':lang==='tr'?'tr-TR':'ru-RU'}
// Клик по орбу — ручное завершение диалога
(function(){
  if (window.__iomaOrbClickWired) return;
  window.__iomaOrbClickWired = true;
  var orb = document.getElementById('voiceOrb');
  if (!orb) return;
  orb.style.cursor = 'pointer';
  orb.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    console.warn('[IOMA-ORB] click — manual stop');
    if (window.__iomaStopVoice) {
      try { window.__iomaStopVoice(); } catch(err){}
    }
  });
})();

function forceOrbDisplay(on){
  const orb = document.querySelector('#voiceOrb'), active = !!on || !!window.__voiceSession;
  document.querySelector('.assistant-shell')?.classList.toggle('voice-active', active);
  document.body.classList.toggle('voice-active', active);
  if (orb) orb.classList.toggle('listening', !!on);
}

function setVoiceUI(on,text){
  $('#voiceButton')?.classList.toggle('listening', on);
  $('#voiceOrb')?.classList.toggle('listening', on);
  const active = on || !!window.__voiceSession;
  $('#assistantView')?.classList.toggle('voice-active', active);
  try { forceOrbDisplay(on); } catch (e) {}
  if (window.VoiceOrb){
    if (on){ window.VoiceOrb.set('listening'); window.VoiceOrb.startMic(); }
    else { window.VoiceOrb.stopMic(); if (!window.__aiBusy && !window.__aiSpeaking) window.VoiceOrb.set('idle'); }
  }
  const label = text || tr(on ? 'listen' : 'ready');
  if ($('#voiceState')) $('#voiceState').textContent = label;
}
async function transcribeRecordedAudio(){
  const blob=new Blob(mediaChunks,{type:mediaRecorder?.mimeType||'audio/webm'}); mediaChunks=[];
  if(blob.size<1000) return;
  setVoiceUI(true,tr('transcribe'));
  const fd=new FormData(); fd.append('file',blob,'voice.webm'); fd.append('language',voiceLang().slice(0,2));
  const r=await fetch('/api/transcribe',{method:'POST',body:fd,credentials:'same-origin'}); const d=await r.json();
  if(!r.ok||!d.ok) throw new Error(d.error||tr('fail'));
  const text=String(d.text||'').trim(); if(text){$('#assistantInput').value=text;sendAI(true)}
}
function initVoice(){
  const btn=$('#voiceButton'); if(!btn)return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR){
    recognition=new SR(); recognition.lang=voiceLang(); recognition.continuous=true; recognition.interimResults=true; recognition.maxAlternatives=1;
    recognition.onstart=()=>{voiceListening=true;voiceFinalBuffer='';setVoiceUI(true,tr('listen'))};
    recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t+' ';else interim+=t}if(finalText){const clean=finalText.trim();voiceFinalBuffer+=(voiceFinalBuffer?' ':'')+clean;}
      clearTimeout(window.__voiceSilenceTimer);
      window.__voiceSilenceTimer = setTimeout(function(){
        if (voiceListening){ try{ recognition.stop(); }catch(err){} }
      }, 2200);
    };
    recognition.onerror=e=>{voiceListening=false;setVoiceUI(false,e.error==='not-allowed'?tr('mic'):tr('fail'))};
    recognition.onend=()=>{voiceListening=false;setVoiceUI(false,tr('ready'));try{forceOrbDisplay(false)}catch(e){};if(voiceFinalBuffer.trim()){const text=voiceFinalBuffer.trim();voiceFinalBuffer='';const inp=$('#assistantInput');if(inp)inp.value=text;setTimeout(function(){try{sendAI(true)}catch(e){console.warn('voice send:',e)}if(inp)inp.value='';},50)}};
    btn.onclick=()=>{if(voiceListening){try{recognition.stop()}catch{};return}recognition.lang=voiceLang();window.__iomaStopVoice=function(){try{recognition.stop()}catch(err){}};try{recognition.start();try{forceOrbDisplay(true)}catch(e){}}catch{setVoiceUI(false,tr('fail'))}};
  }else if(window.MediaRecorder && navigator.mediaDevices?.getUserMedia){
    btn.onclick=async()=>{
      if(mediaRecorder && mediaRecorder.state==='recording'){mediaRecorder.stop();return}
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        mediaChunks=[]; mediaRecorder=new MediaRecorder(stream); voiceListening=true; setVoiceUI(true,tr('listen'));window.__iomaStopVoice=function(){try{mediaRecorder.stop()}catch(err){}};
        mediaRecorder.ondataavailable=e=>{if(e.data?.size)mediaChunks.push(e.data)};
        mediaRecorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());voiceListening=false;setVoiceUI(false,tr('fail'))};
        mediaRecorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());voiceListening=false;try{await transcribeRecordedAudio();setVoiceUI(false,tr('ready'))}catch(e){setVoiceUI(false,e.message||tr('fail'))}};
        mediaRecorder.start();
      }catch(e){setVoiceUI(false,e.name==='NotAllowedError'?tr('mic'):tr('fail'))}
    };
  }else btn.onclick=()=>setVoiceUI(false,tr('unavailable'));
}
function speakAI(text){
  if (!voiceAutoSpeak || !text || !('speechSynthesis' in window)) return;
  const plain = String(text).replace(/\*\*|__|`/g, '').replace(/^[#>\-\s]+/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = voiceLang(); u.rate = .98; u.pitch = 1; u.volume = 1;
  u.onstart = () => { window.__aiSpeaking = true; window.VoiceOrb?.set('speaking'); };
  u.onboundary = () => window.VoiceOrb?.pulse(.5 + Math.random() * .4);
  const done = () => { window.__aiSpeaking = false; if (window.VoiceOrb && !voiceListening) window.VoiceOrb.set('idle'); };
  u.onend = done; u.onerror = done;
  window.speechSynthesis.speak(u);
}
initVoice();
if (recognition){ const __prev = recognition.onresult; recognition.onresult = e => { window.VoiceOrb?.pulse(.55); if (__prev) __prev(e); }; recognition.onspeechstart = () => window.VoiceOrb?.pulse(.6); }

// News panel: обновляется с серверного RSS-кэша.
function formatToday(){const p=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());const d=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${d.day}.${d.month}.${d.year} г.`}
function paintCurrency(items,dateLabel){
  const fmt=x=>x==null?'—':fmtNum(x);
  if($('#homeCurrencyDate'))$('#homeCurrencyDate').textContent=dateLabel;
  if(items?.USD?.value!=null)$('#homeUsd')&&($('#homeUsd').textContent=fmt(items.USD.value));
  if(items?.EUR?.value!=null)$('#homeEur')&&($('#homeEur').textContent=fmt(items.EUR.value));
  if(items?.CNY?.value!=null)$('#homeCny')&&($('#homeCny').textContent=fmt(items.CNY.value));
}
async function loadCurrency(){
  if(window.__currencyPinned)return; // user is looking at a historical date — don't overwrite it
  const dateShort=formatToday().replace(' г.','');
  try{
    const r=await fetch('/api/currency',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok) throw new Error('currency');
    const d=await r.json();
    paintCurrency(d.items||{},dateShort);
    try{localStorage.setItem('iomastavka_currency_cache',JSON.stringify(d.items||{}))}catch{}
  }catch{
    try{const c=JSON.parse(localStorage.getItem('iomastavka_currency_cache')||'{}'); if(Object.keys(c).length){paintCurrency(c,dateShort);return}}catch{}
    // Official Bank of Russia values for 15.09.2026 as a last-resort display fallback.
    // They are replaced automatically as soon as /api/currency becomes available again.
    const fallback={CNY:{nominal:1,value:12.5353},USD:{nominal:1,value:84.3363},EUR:{nominal:1,value:97.7626}};
    paintCurrency(fallback,'15.09.2026');
  }
}

function isUrgentNews(n){if(n&&n.urgent===true)return true;const x=normalize(String(n?.title||'')+' '+String(n?.description||'')).toLowerCase();return /(обязательн|вступ(ил|ает).*сил|запрет|ограничен|повышен.*пошлин|снижен.*пошлин|изменен.*правил|нов.*пошлин|маркировк.*обяз|электронн.*транспортн|санкц|лицензир|mandatory|effective.*date|ban|restriction|duty.*increase|tariff.*change|regulation|sanction|licen[cs])/i.test(x)}
function stripSourceFromTitle(t){
  let x = String(t||'').trim();
  x = x.replace(/\s+[-–—]\s+[A-Za-zА-Яа-яЁё][\w\.\-]*\.(?:ru|ua|com|net|kz|by|org|info|biz|io|cn|tv|uz|kg|am|az|ge|md)(?:\.[a-z]{2})?\s*$/i, '');
  x = x.replace(/\s+[-–—]\s+[A-Z][a-zA-Z]+(?:[\s\-][A-Z][a-zA-Z]+){0,2}\s*$/i, '');
  x = x.replace(/\s+[-–—]\s+[А-ЯЁ][а-яё]+(?:[\s\-][А-ЯЁ][а-яё]+){0,2}\s*$/i, '');
  return x.trim();
}

function cleanNewsText(s=''){const t=document.createElement('div');t.innerHTML=String(s);return (t.textContent||t.innerText||'').replace(/\s+/g,' ').trim()}
function isSuperImportant(n){
  const text = String(n.title||'') + ' ' + String(n.description||'');
  return /(таможен|пошлин|тариф|маркиров|лиценз|запрет|ограничен|обязательн|закон|приказ|постановлен|фнс|фтс|еэк|еаэс|сертификац|декларац|вэд|тн.?вэд|честный знак|вступ.*сил)/i.test(text);
}

function renderNewsItems(items){
  const box = $('#newsList');
  if (!box) return;
  const key = items.map(function(n){ return String(n.link || n.title || ''); }).join('|') + '::' + lang;
  if (box.dataset.key === key && box.querySelector('.news-card')) return; // already rendered: opens instantly
  box.dataset.key = key;
  box.innerHTML = '';
  const frag = document.createDocumentFragment();
  // Look up missing pictures only for cards that actually scroll into view.
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const card = en.target, q = card.dataset.q, n = card._news;
      fetch('/api/news/image?title=' + encodeURIComponent(q))
        .then(function(r){ return r.json(); })
        .then(function(d){
          if (d && d.ok && d.image){
            n.image = d.image;
            const holder = card.querySelector('.news-card-img');
            if (holder){ holder.classList.remove('news-card-img-placeholder'); holder.innerHTML = '<img src="' + escapeHtml(d.image) + '" alt="" loading="lazy" decoding="async">'; }
          }
        }).catch(function(){});
    });
  }, { root: box, rootMargin: '200px' }) : null;
  items.forEach(function(n, idx){
    const a = document.createElement('button');
    a.type = 'button';
    const important = isSuperImportant(n);
    a.className = 'news-card' + (important ? ' news-card-important' : '');
    a.style.setProperty('--i', Math.min(idx, 8));
    const img = n.image || '';
    const thumb = img
      ? '<div class="news-card-img"><img src="' + escapeHtml(img) + '" alt="" ' + (idx < 3 ? '' : 'loading="lazy" ') + 'decoding="async"></div>'
      : '<div class="news-card-img news-card-img-placeholder">' + ico('news') + '</div>';
    const badge = important ? '<div class="news-card-badge">' + (lang === 'ru' ? 'ВАЖНО' : 'IMPORTANT') + '</div>' : '';
    const shortTitle = String(cleanNewsText(n.title) || '').slice(0, 140);
    const metaLine = [cleanNewsText(n.source || ''), n.date ? new Date(n.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · ');
    a.innerHTML = badge + thumb + '<div class="news-card-body"><div class="news-card-meta">' + escapeHtml(metaLine) + '</div><div class="news-card-title">' + escapeHtml(shortTitle) + '</div></div>';
    a.onclick = function(){ openArticle(n); };
    frag.appendChild(a);
    if (!img && n.title && io){
      a._news = n;
      a.dataset.q = String(cleanNewsText(n.title) || '').slice(0, 120);
      io.observe(a);
    }
  });
  box.appendChild(frag);
}

async function loadNews(){
  const box=$('#newsList'); if(!box)return;
  const fallback=[
    {title:'Китай → Россия: что проверить перед расчётом мультимодальной перевозки',date:new Date().toISOString(),source:'IOMASTAVKA',description:'Incoterms, ТН ВЭД, габариты, объёмный вес, документы и терминальные расходы.',link:''},
    {title:'ТН ВЭД и импорт: какие данные собрать до запроса ставки',date:new Date().toISOString(),source:'IOMASTAVKA',description:'Описание товара, код ТН ВЭД, инвойс, упаковка, разрешительные документы и базис поставки.',link:''},
    {title:'ЖД, море или авиа: как выбрать транспорт из Китая',date:new Date().toISOString(),source:'IOMASTAVKA',description:'Сравнение сроков, расчётного веса и структуры стоимости.',link:''}
  ];
  if(newsCache.length){renderNewsItems(newsCache);return;}
  delete box.dataset.key;
  box.setAttribute('aria-busy','true');
  box.innerHTML = Array.from({length:6}, function(){ return '<div class="news-skeleton"><div class="skeleton"></div><div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></div>'; }).join('');
  try{const r=await fetch('/api/news?lang='+lang,{cache:'no-store'});const d=r.ok?await r.json():null;const items=Array.isArray(d?.items)?d.items:[];if(items.length){newsCache=items;renderNewsItems(items);box.removeAttribute('aria-busy');return;}}catch{}
  newsCache=fallback; renderNewsItems(fallback); box.removeAttribute('aria-busy');
}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderArticleMarkdown(text=''){
  const safe=escapeHtml(text); return safe.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split(/\n\s*\n/).map(p=>p.trim()?`<p>${p.replace(/\n/g,'<br>')}</p>`:'').join('');
}
let articleMemCache = {};


// ========== localStorage кэш статей и новостей ==========
function readLocalCache(name){
  try { return JSON.parse(localStorage.getItem('iomas_' + name) || '{}'); } catch(e){ return {}; }
}
function writeLocalCache(name, obj){
  try {
    // Ограничение: не более 100 записей
    const keys = Object.keys(obj);
    if (keys.length > 100){
      const sorted = keys.sort(function(a,b){ return (obj[a].at || 0) - (obj[b].at || 0); });
      for (let i = 0; i < keys.length - 100; i++) delete obj[sorted[i]];
    }
    localStorage.setItem('iomas_' + name, JSON.stringify(obj));
  } catch(e){ console.warn('localStorage full'); }
}
function getLocalArticle(key, lang){
  const c = readLocalCache('articles2');
  const e = c[key + '::' + lang];
  if (!e) return null;
  if (Date.now() - (e.at || 0) > 7*24*60*60*1000){ delete c[key + '::' + lang]; writeLocalCache('articles2', c); return null; }
  return e.article;
}
function saveLocalArticle(key, lang, article){
  const c = readLocalCache('articles2');
  c[key + '::' + lang] = { article, at: Date.now() };
  writeLocalCache('articles2', c);
}
function getLocalNews(){
  const c = readLocalCache('news2');
  if (!c.items || !c.at) return null;
  if (Date.now() - c.at > 20*60*1000) return null;
  return c.items;
}
function saveLocalNews(items){
  writeLocalCache('news2', { items, at: Date.now() });
}

function mdToHtmlArticle(text){
  // Конвертируем литеральные \n (backslash+n) в реальные переносы строк
  let html = String(text||'').replace(/\\n/g, '\n');
  // Также разбираемся со случаями когда AI вернул реальные \r\n
  html = html.replace(/\r\n/g, '\n');
  html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  html = html.replace(/^### (.*)$/gm, '{{{H3}}}$1{{{/H3}}}');
  html = html.replace(/^## (.*)$/gm, '{{{H2}}}$1{{{/H2}}}');
  html = html.replace(/^# (.*)$/gm, '{{{H1}}}$1{{{/H1}}}');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = html.split('\n');
  const blocks = [];
  let buf = [];
  let inTable = false;
  let tableBuf = [];
  function flush(){ if (buf.length){ const t = buf.join('\n').trim(); if (t) blocks.push({type:'text', text:t}); buf = []; } }
  function flushTable(){ if (tableBuf.length){ blocks.push({type:'table', rows:tableBuf.slice()}); tableBuf = []; } inTable = false; }
  for (const line of lines){
    const trimmed = line.trim();
    if (/^\|.*\|/.test(trimmed)){ if (!inTable){ flush(); inTable = true; } tableBuf.push(trimmed); continue; }
    if (inTable) flushTable();
    buf.push(line);
  }
  flush(); flushTable();
  const out = [];
  for (const b of blocks){
    if (b.type === 'table'){
      const rows = b.rows; if (rows.length < 2) continue;
      const parseCells = function(line){ let l = line; if (l.startsWith('|')) l = l.slice(1); if (l.endsWith('|')) l = l.slice(0, -1); return l.split('|').map(function(x){return x.trim();}); };
      const headers = parseCells(rows[0]);
      let dataStart = 1;
      if (rows.length > 1 && /^[\s\-:|]+$/.test(rows[1].replace(/\|/g, ''))) dataStart = 2;
      let t = '<div class="article-table-wrap"><table class="article-table"><thead><tr>';
      headers.forEach(function(h){ t += '<th>' + h + '</th>'; });
      t += '</tr></thead><tbody>';
      for (let i = dataStart; i < rows.length; i++){
        const cells = parseCells(rows[i]);
        t += '<tr>';
        headers.forEach(function(_, j){ t += '<td>' + (cells[j] || '') + '</td>'; });
        t += '</tr>';
      }
      t += '</tbody></table></div>';
      out.push(t);
      continue;
    }
    const text = b.text;
    const paras = text.split(/\n\s*\n/);
    for (let para of paras){
      para = para.trim();
      if (!para) continue;
      if (/^\{\{\{H[123]\}\}\}/.test(para)){
        out.push(para.replace(/\{\{\{H3\}\}\}/g, '<h3>').replace(/\{\{\{\/H3\}\}\}/g, '</h3>')
                     .replace(/\{\{\{H2\}\}\}/g, '<h2>').replace(/\{\{\{\/H2\}\}\}/g, '</h2>')
                     .replace(/\{\{\{H1\}\}\}/g, '<h1>').replace(/\{\{\{\/H1\}\}\}/g, '</h1>')
                     .replace(/\n/g, '<br>'));
        continue;
      }
      if (/^&gt;\s/.test(para)){ out.push('<blockquote>' + para.replace(/^&gt;\s?/gm, '').replace(/\n/g, '<br>') + '</blockquote>'); continue; }
      if (/^[-–—•]\s/m.test(para)){
        const items = para.split('\n').map(function(l){return l.replace(/^[-–—•]\s*/, '').trim();}).filter(Boolean);
        out.push('<ul>' + items.map(function(i){return '<li>' + i + '</li>';}).join('') + '</ul>');
        continue;
      }
      out.push('<p>' + para.replace(/\n/g, '<br>') + '</p>');
    }
  }
  return out.join('');
}

const AT = {
  ru: { minRead: 'мин чтения', back: 'К новостям', original: 'Открыть оригинал', copy: 'Копировать ссылку', copied: 'Ссылка скопирована', facts: 'Ключевые факты', factsHint: 'Найдено в тексте статьи', related: 'Читайте также', source: 'Источник', official: 'Официальный источник', media: 'Отраслевое издание', excerpt: 'Показано начало материала. Полный текст — у источника.', readFull: 'Читать полностью', translating: 'Перевожу статью…', translateFail: 'Не удалось перевести. Показан оригинал на русском.', retry: 'Повторить', autoTr: 'Автоматический перевод. Оригинал на русском: ', noText: 'Полный текст не удалось загрузить — показано краткое описание. Откройте источник, чтобы прочитать статью целиком.', stock: 'Иллюстрация: Pexels', audio: 'Аудиоверсия статьи', voice: 'Голос', listen: 'Прослушать статью', mediaFullNote: 'Материал полностью воспроизведён с сайта источника. Все права на текст принадлежат: ', mediaFullNote: 'This material is reproduced in full from the source website. All rights to the text belong to: ', mediaFullNote: '本文全文转载自来源网站，文本版权归属：', mediaFullNote: 'Bu içerik kaynak sitesinden tam olarak alınmıştır. Metnin tüm hakları şuna aittir: ', officialNote: 'Официальная информация. Источник: ', excerptNote: 'Материал представлен как краткая выдержка. Права на полный текст принадлежат: ', types: { date: 'Дата', percent: 'Ставка / доля', code: 'Код ТН ВЭД', money: 'Сумма', qty: 'Объём' }, cats: { customs: 'Таможня', law: 'Право', rail: 'ЖД', sea: 'Море', china: 'Китай', road: 'Авто' }, urgent: 'СРОЧНО' },
  en: { minRead: 'min read', back: 'Back to news', original: 'Open original', copy: 'Copy link', copied: 'Link copied', facts: 'Key facts', factsHint: 'Found in the article text', related: 'Related articles', source: 'Source', official: 'Official source', media: 'Industry publication', excerpt: 'Showing the beginning of the article. Full text at the source.', readFull: 'Read the full article', translating: 'Translating the article…', translateFail: 'Translation failed. Showing the Russian original.', retry: 'Retry', autoTr: 'Automatic translation. Russian original: ', noText: 'The full text could not be loaded — showing a short summary. Open the source to read the whole article.', stock: 'Illustration: Pexels', audio: 'Audio version', voice: 'Voice', listen: 'Listen', officialNote: 'Official information. Source: ', excerptNote: 'Shown as a short excerpt. Rights to the full text belong to: ', types: { date: 'Date', percent: 'Rate / share', code: 'HS code', money: 'Amount', qty: 'Volume' }, cats: { customs: 'Customs', law: 'Law', rail: 'Rail', sea: 'Sea', china: 'China', road: 'Road' }, urgent: 'URGENT' },
  zh: { minRead: '分钟阅读', back: '返回新闻', original: '打开原文', copy: '复制链接', copied: '链接已复制', facts: '关键信息', factsHint: '摘自文章正文', related: '相关文章', source: '来源', official: '官方来源', media: '行业媒体', excerpt: '仅显示文章开头，全文请见来源。', readFull: '阅读全文', translating: '正在翻译…', translateFail: '翻译失败，显示俄文原文。', retry: '重试', autoTr: '自动翻译。俄文原文：', noText: '无法加载全文，仅显示简介。请打开来源阅读全文。', stock: '配图：Pexels', audio: '文章音频', voice: '语音', listen: '收听', officialNote: '官方信息。来源：', excerptNote: '仅为摘要，全文版权归属：', types: { date: '日期', percent: '税率 / 占比', code: '商品编码', money: '金额', qty: '数量' }, cats: { customs: '海关', law: '法规', rail: '铁路', sea: '海运', china: '中国', road: '公路' }, urgent: '紧急' },
  tr: { minRead: 'dk okuma', back: 'Haberlere dön', original: 'Orijinali aç', copy: 'Bağlantıyı kopyala', copied: 'Bağlantı kopyalandı', facts: 'Önemli bilgiler', factsHint: 'Makale metninden alındı', related: 'İlgili makaleler', source: 'Kaynak', official: 'Resmi kaynak', media: 'Sektör yayını', excerpt: 'Makalenin başlangıcı gösteriliyor. Tam metin kaynakta.', readFull: 'Tamamını oku', translating: 'Makale çevriliyor…', translateFail: 'Çeviri başarısız. Rusça orijinal gösteriliyor.', retry: 'Tekrar dene', autoTr: 'Otomatik çeviri. Rusça orijinal: ', noText: 'Tam metin yüklenemedi — kısa özet gösteriliyor. Tamamını okumak için kaynağı açın.', stock: 'Görsel: Pexels', audio: 'Sesli sürüm', voice: 'Ses', listen: 'Dinle', officialNote: 'Resmi bilgi. Kaynak: ', excerptNote: 'Kısa alıntı olarak gösteriliyor. Tam metnin hakları: ', types: { date: 'Tarih', percent: 'Oran / pay', code: 'GTİP kodu', money: 'Tutar', qty: 'Miktar' }, cats: { customs: 'Gümrük', law: 'Hukuk', rail: 'Demiryolu', sea: 'Deniz', china: 'Çin', road: 'Karayolu' }, urgent: 'ACİL' }
};
function at(k){ return (AT[lang] || AT.ru)[k] !== undefined ? (AT[lang] || AT.ru)[k] : AT.ru[k]; }
const wait = ms => new Promise(r => setTimeout(r, ms));
let articleToken = 0;

function articleDate(iso){
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  try { return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
}
function articleHeroHtml(img, badgesHtml, title, metaText, opts){
  opts = opts || {};
  const media = img ? '<img src="' + escapeHtml(img) + '" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">' : '<div class="article-art"></div>';
  return '<div class="article-hero">' + media + '<div class="article-hero-shade"></div>' +
    '<button type="button" class="article-back" data-article-back>' + ICON_BACK + '<span>' + escapeHtml(at('back')) + '</span></button>' +
    '<div class="article-title">' +
      '<div class="article-badges">' + badgesHtml + '</div>' +
      '<h1>' + escapeHtml(title) + '</h1>' +
      '<p class="article-meta">' + escapeHtml(metaText) + '</p>' +
    '</div>' +
    (opts.credit ? '<span class="article-credit">' + escapeHtml(opts.credit) + '</span>' : '') +
  '</div>';
}
const ICON_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ICON_EXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>';
const FACT_ICONS = {
  date: '<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>',
  code: '<path d="M8 8 4 12l4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.7 5 1.3 5 4 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.1-.5-2.6-1.3M12 6.5V8m0 8v1.5"/>',
  qty: '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'
};

function factsHtml(facts){
  if (!facts || !facts.length) return '';
  return '<section class="aside-card"><h3>' + escapeHtml(at('facts')) + '</h3><p class="aside-hint">' + escapeHtml(at('factsHint')) + '</p><ul class="fact-list">' +
    facts.map(f => '<li class="fact fact-' + f.type + '"><span class="fact-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' + (FACT_ICONS[f.type] || '') + '</svg></span><span class="fact-text"><b>' + escapeHtml(f.value) + '</b><small>' + escapeHtml((at('types') || {})[f.type] || '') + '</small></span></li>').join('') +
    '</ul></section>';
}
function relatedHtml(list){
  if (!list || !list.length) return '';
  return '<section class="aside-card"><h3>' + escapeHtml(at('related')) + '</h3><div class="related-list">' +
    list.map((x, i) => '<button type="button" class="related-item" data-related="' + i + '"><span class="related-title">' + escapeHtml(cleanNewsText(x.title)) + '</span><span class="related-meta">' + escapeHtml(cleanNewsText(x.source || '')) + (x.date ? ' · ' + escapeHtml(articleDate(x.date)) : '') + '</span></button>').join('') +
    '</div></section>';
}

function renderArticleFull(a, n, opts){
  opts = opts || {};
  const box = $('#articleContent');
  const shell = box.closest('.article-shell');
  const keep = opts.keepScroll && shell ? shell.scrollTop : 0;
  const title = stripSourceFromTitle(cleanNewsText(a.title || n.title || ''));
  const content = String(a.content || '');
  const srcName = cleanNewsText(a.source || n.source || '');
  const badges = [];
  if (isUrgentNews(n)) badges.push('<span class="badge badge-urgent">' + escapeHtml(at('urgent')) + '</span>');
  badges.push('<span class="badge badge-src kind-' + escapeHtml(a.sourceKind || 'media') + '">' + escapeHtml(srcName) + '</span>');
  (a.category || []).slice(0, 2).forEach(c => { if ((at('cats') || {})[c]) badges.push('<span class="badge badge-cat">' + escapeHtml(at('cats')[c]) + '</span>'); });
  const meta = [articleDate(a.publishedAt || n.date), a.readingMinutes ? a.readingMinutes + ' ' + at('minRead') : ''].filter(Boolean).join(' · ');
  const isTranslated = a.lang && a.lang !== 'ru';
  let banners = '';
  if (a.translation === 'pending') banners += '<div class="article-banner banner-progress"><span class="spin"></span><span>' + escapeHtml(at('translating')) + '</span></div>';
  if (a.translation === 'failed') banners += '<div class="article-banner banner-warn"><span>' + escapeHtml(at('translateFail')) + '</span><button type="button" data-article-retry>' + escapeHtml(at('retry')) + '</button></div>';
  if (a.textOk === false) banners += '<div class="article-banner banner-warn"><span>' + escapeHtml(at('noText')) + '</span></div>';
  const audio = (a.textOk !== false && content.length > 200) ? (
    '<div class="article-audio-block"><div class="article-audio-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="2"/><rect x="17" y="14" width="4" height="7" rx="2"/></svg></div>' +
    '<div class="article-audio-text"><div class="article-audio-title">' + escapeHtml(at('audio')) + '</div><div class="article-audio-sub">' + escapeHtml(at('voice')) + ' · ' + Math.max(1, a.readingMinutes || 1) + ' ' + escapeHtml(at('minRead')) + '</div></div>' +
    '<button class="article-audio-btn" id="articlePlayBtn" type="button"><span class="audio-orb-mini" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<svg class="audio-play-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><svg class="audio-pause-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>' +
    '<span class="audio-label">' + escapeHtml(at('listen')) + '</span></button></div>') : '';
  const url = a.sourceUrl || n.link || '';
  const excerptBox = a.truncated ? '<div class="article-excerpt-end"><p>' + escapeHtml(at('excerpt')) + '</p>' + (url ? '<a class="btn-source" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(at('readFull')) + ' ' + ICON_EXT + '</a>' : '') + '</div>' : '';
  const sourceBox = '<div class="article-sourcebox"><div><span class="sb-label">' + escapeHtml(at('source')) + '</span><b>' + escapeHtml(srcName) + '</b><span class="sb-kind">' + escapeHtml(at(a.sourceKind === 'official' ? 'official' : 'media')) + '</span></div>' +
    '<p>' + escapeHtml((a.sourceKind === 'official' ? at('officialNote') : a.reuse === 'full' ? at('mediaFullNote') : at('excerptNote')) + srcName + '.') + (isTranslated && url ? ' ' + escapeHtml(at('autoTr')) : '') + (isTranslated && url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(srcName) + '</a>' : '') + '</p>' +
    (url ? '<div class="sb-actions"><a class="btn-source" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(at('original')) + ' ' + ICON_EXT + '</a><button type="button" class="btn-ghost" data-article-copy>' + ICON_LINK + escapeHtml(at('copy')) + '</button></div>' : '') + '</div>';
  const aside = factsHtml(a.facts) + relatedHtml(a.related);
  box.innerHTML = articleHeroHtml(a.image, badges.join(''), title, meta, { credit: a.imageKind === 'stock' ? at('stock') : '' }) +
    '<div class="article-layout"><div class="article-body article-body-full">' + banners +
      (a.subtitle ? '<p class="article-subtitle">' + escapeHtml(cleanNewsText(a.subtitle)) + '</p>' : '') +
      audio + mdToHtmlArticle(content) + excerptBox + sourceBox +
    '</div>' + (aside ? '<aside class="article-aside">' + aside + '</aside>' : '') + '</div>';
  if (shell) shell.scrollTop = keep;
  const btn = document.getElementById('articlePlayBtn');
  if (btn) btn.addEventListener('click', function(){ playArticleAudio(a, a.lang || lang, btn); });
  box.querySelector('[data-article-back]')?.addEventListener('click', function(){ stopAudioPlayback(); showView('news'); });
  box.querySelector('[data-article-copy]')?.addEventListener('click', function(){ try { navigator.clipboard.writeText(url); toast(at('copied'), 'success', 1800); } catch (e) {} });
  box.querySelector('[data-article-retry]')?.addEventListener('click', function(){ delete articleMemCache[articleKeyOf(n)]; openArticle(n); });
  box.querySelectorAll('[data-related]').forEach(function(el){
    el.addEventListener('click', function(){ const x = (a.related || [])[Number(el.dataset.related)]; if (x) openArticle(x); });
  });
}

function articleKeyOf(n, l){ return String(n.id || n.link || n.title || '') + '::' + (l || lang); }
async function fetchArticle(n, language, waitMs){
  const r = await fetch('/api/news/article', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: n.id || '', title: stripSourceFromTitle(cleanNewsText(n.title || '')), description: cleanNewsText(n.description || ''), source: cleanNewsText(n.source || ''), link: n.link || '', language: language, wait: waitMs })
  });
  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error(d.error || 'Article unavailable');
  return d.article;
}
function cacheArticle(n, l, a){
  articleMemCache[articleKeyOf(n, l)] = a;
  if (a.textOk !== false) { try { saveLocalArticle(articleKeyOf(n, l).replace(/::.*/, ''), l, a); } catch (e) {} }
}
// Prepare the other languages while the reader is busy: switching language is then instant.
async function warmArticleLangs(n, token){
  for (const l of ['ru', 'en', 'zh', 'tr']){
    if (l === lang || articleMemCache[articleKeyOf(n, l)]) continue;
    for (let i = 0; i < 20; i++){
      if (token !== articleToken) return;
      try {
        const a = await fetchArticle(n, l, 0);
        if (l === 'ru' || a.translation === 'ready'){ cacheArticle(n, l, a); break; }
        if (a.translation === 'failed') break;
      } catch (e) { return; }
      await wait(2500);
    }
  }
}

async function openArticle(n){
  try { stopAudioPlayback(); } catch (e) {}
  currentArticleNews = n;
  showView('article');
  const token = ++articleToken;
  const box = $('#articleContent');
  const title = stripSourceFromTitle(cleanNewsText(n.title || ''));
  const key = articleKeyOf(n);

  const cached = articleMemCache[key] || (() => { try { return getLocalArticle(key.replace(/::.*/, ''), lang); } catch (e) { return null; } })();
  if (cached && cached.textOk !== false && (lang === 'ru' || cached.translation === 'ready')){
    articleMemCache[key] = cached;
    renderArticleFull(cached, n);
    warmArticleLangs(n, token);
    return;
  }

  const hasOld = !!box.querySelector('.article-body');
  if (hasOld) showLangBadge(true);
  else {
    box.innerHTML = articleHeroHtml(n.image || '', '<span class="badge badge-src">' + escapeHtml(cleanNewsText(n.source || '')) + '</span>', title, '', {}) +
      '<div class="article-layout"><div class="article-body article-body-full"><div class="article-skeleton">' + Array(10).fill('<div class="skeleton"></div>').join('') + '</div></div></div>';
    box.querySelector('[data-article-back]')?.addEventListener('click', function(){ showView('news'); });
    const sh = box.closest('.article-shell'); if (sh) sh.scrollTop = 0;
  }
  try {
    let a = await fetchArticle(n, lang, lang === 'ru' ? 0 : 3000);
    if (token !== articleToken) return;
    if (a.translation === 'pending'){
      if (!hasOld) renderArticleFull(a, n);                 // show the original right away, translation follows
      for (let i = 0; i < 26 && token === articleToken; i++){
        await wait(1400);
        const b = await fetchArticle(n, lang, 0);
        if (b.translation !== 'pending'){ a = b; break; }
      }
      if (token !== articleToken) return;
    }
    if (lang === 'ru' || a.translation === 'ready') cacheArticle(n, lang, a);
    renderArticleFull(a, n, { keepScroll: hasOld });
    if (a.textOk !== false) warmArticleLangs(n, token);
  } catch (e) {
    if (token !== articleToken) return;
    const msg = friendlyError(e);
    if (!hasOld){ const sk = box.querySelector('.article-skeleton'); const html = '<div class="article-error">' + escapeHtml(msg) + '</div>'; if (sk) sk.outerHTML = html; }
    toast(msg, 'error', 5000);
  } finally {
    if (token === articleToken) showLangBadge(false);
  }
}


let currentAudioPlayer = null;
let currentPlayBtn = null;
function stopAudioPlayback(){
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  if (currentAudioPlayer){
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
      try { URL.revokeObjectURL(currentAudioPlayer.src); } catch(e){}
      currentAudioPlayer.src = '';
      currentAudioPlayer.load();
    } catch(e){}
    currentAudioPlayer = null;
  }
  if (currentPlayBtn){ currentPlayBtn.classList.remove('playing'); const t = currentPlayBtn.querySelector('.audio-label'); if (t) t.textContent = 'Прослушать статью'; currentPlayBtn = null; }
}

async function playArticleAudio(article, langCode, btn){
  if (btn.classList.contains('playing')){ stopAudioPlayback(); return; }
  stopAudioPlayback();
  currentPlayBtn = btn;
  btn.classList.add('playing');
  const label = btn.querySelector('.audio-label');
  if (label) label.textContent = 'Готовлю…';
  const text = String(article.content || article.subtitle || article.title || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^\|?[\s\-:|]+\|?$/gm, ' ').replace(/[#*`>|]/g,' ').replace(/[ \t]+/g, ' ').slice(0, 40000);
  try {
    const r = await fetch('/api/news/article/audio', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: text, language: langCode })
    });
    if (r.ok){
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioPlayer = audio;
      audio.onended = stopAudioPlayback;
      await audio.play();
      if (label) label.textContent = 'Остановить';
      return;
    }
    let err = 'Ошибка'; try { const j = await r.json(); err = j.error||err; } catch(e){}
    if (label) label.textContent = err;
    setTimeout(stopAudioPlayback, 3000);
  } catch(e){
    if (label) label.textContent = 'Ошибка соединения';
    setTimeout(stopAudioPlayback, 3000);
  }
}

function showLangBadge(on){
  let b = document.getElementById('langSwitchBadge');
  if (on){
    if (!b){
      b = document.createElement('div');
      b.id = 'langSwitchBadge';
      b.className = 'lang-switch-badge';
      b.innerHTML = '<span class="lang-switch-dot"></span><span class="lang-switch-text">Перевод…</span>';
      document.body.appendChild(b);
    }
    b.classList.add('visible');
  } else if (b){
    b.classList.remove('visible');
    setTimeout(function(){ try { b.remove(); } catch(e){} }, 350);
  }
}

async function backgroundRefresh(){await Promise.allSettled([checkWeather(),loadRates(),loadCurrency()]);}
updateCityPlaceholders();
setTimeout(renderRouteAdvice, 500);
renderChatEmpty();
loadRates();loadAgents();renderIncoterms();renderFactors();updateAutoVolume();applyLang();loadCurrency();setInterval(loadCurrency,30*60*1000);
setInterval(()=>fetch('/api/health',{cache:'no-store'}).catch(()=>{}),2*60*1000);
setInterval(()=>{fetch('/api/news',{cache:'no-store'}).catch(()=>{})},30*60*1000);
window.addEventListener('error',e=>{console.warn('iomastavka:',e.error||e.message)});window.addEventListener('unhandledrejection',e=>{console.warn('iomastavka promise:',e.reason)});


// Keep the workspace alive when the browser returns to the tab.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')backgroundRefresh()});
window.addEventListener('online',()=>backgroundRefresh());
setInterval(()=>{if(document.visibilityState==='visible')backgroundRefresh()},10*60*1000);


// === v101: стрелка назад в статье -> к списку новостей ===
(function(){
  var b = document.getElementById('backToNewsBtn');
  if (!b) return;
  b.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    var articleOpen = document.querySelector('#articleView.open');
    if (articleOpen) {
      if (typeof window.__iomaOpenView === 'function') window.__iomaOpenView('news');
    } else {
      if (typeof window.__iomaCloseViews === 'function') window.__iomaCloseViews();
    }
  });
})();

// --- Connection feedback --------------------------------------------------
window.addEventListener('offline', () => toast(friendlyError(new Error('fetch')), 'error', 5000));
window.addEventListener('online', () => toast(lang === 'en' ? 'Connection restored' : lang === 'tr' ? 'Bağlantı yeniden kuruldu' : lang === 'zh' ? '网络已恢复' : 'Соединение восстановлено', 'success', 2600));

// =====================================================================================
//  LIVE WEATHER BACKGROUND
//  Real conditions from /api/weather (OpenWeather). Procedural clouds, rain, snow, fog and
//  lightning drawn on one canvas. Preview any state:  ?wx=rain | storm | snow | fog | clouds | clear | night | dusk
// =====================================================================================
(function(){
  const scene = document.getElementById('weatherScene');
  if (!scene || window.WX) return;
  const cv = document.createElement('canvas');
  cv.className = 'wx-canvas'; cv.setAttribute('aria-hidden', 'true');
  scene.appendChild(cv);
  const ctx = cv.getContext('2d');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1, raf = 0, last = 0, sprites = {}, spriteTone = '';
  let clouds = [], drops = [], flakes = [], fogs = [], bolt = null, flash = 0, nextBolt = 0, clock = 0;
  const S = { kind: 'clear', clouds: .1, wind: 2, intensity: 0, night: false, dusk: false };

  function rng(seed){ let s = seed >>> 0; return function(){ s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';

  const TONES = {
    day:   { top: [255, 255, 255], bot: [170, 194, 216] },
    dusk:  { top: [255, 232, 208], bot: [186, 146, 172] },
    night: { top: [116, 140, 176], bot: [44, 60, 92] },
    grey:  { top: [190, 200, 210], bot: [96, 110, 128] },
    storm: { top: [138, 150, 164], bot: [52, 62, 76] }
  };
  function toneName(){
    if (S.kind === 'storm') return S.night ? 'night' : 'storm';
    if (S.kind === 'rain' || S.kind === 'drizzle') return S.night ? 'night' : 'grey';
    if (S.night) return 'night';
    if (S.dusk) return 'dusk';
    if (S.kind === 'fog' || S.kind === 'snow' || (S.kind === 'clouds' && S.clouds > .8)) return 'grey';
    return 'day';
  }

  // One soft, volumetric cumulus: many radial puffs, bright on top, shaded underneath.
  function makeCloud(seed, tone){
    const w = 600, h = 260, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d'), r = rng(seed), puffs = [];
    const n = 46 + Math.floor(r() * 14);
    for (let i = 0; i < n; i++){
      const t = r(), mid = 1 - Math.abs(t - .5) * 2;
      const rad = (26 + r() * 50) * (.5 + .75 * mid);
      const x = w * (.13 + .74 * t);
      const y = h * .66 - mid * h * .30 * (.35 + r() * .8) - r() * 16;
      puffs.push({ x: x, y: y, rad: rad });
    }
    for (let i = 0; i < 9; i++) puffs.push({ x: w * (.16 + .68 * r()), y: h * .7 + r() * 10, rad: 26 + r() * 30 });
    puffs.sort((a, b) => b.y - a.y);            // shaded base first, bright crown last
    for (const p of puffs){
      const shade = Math.max(0, Math.min(1, (p.y - h * .28) / (h * .5)));
      const col = mix(tone.top, tone.bot, shade);
      const gr = g.createRadialGradient(p.x - p.rad * .28, p.y - p.rad * .34, p.rad * .08, p.x, p.y, p.rad);
      gr.addColorStop(0, rgba(col, .96));
      gr.addColorStop(.5, rgba(col, .6));
      gr.addColorStop(1, rgba(tone.bot, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.rad, 0, 6.2832); g.fill();
    }
    return c;
  }
  function makeFog(){
    const c = document.createElement('canvas'); c.width = 900; c.height = 240;
    const g = c.getContext('2d'), gr = g.createRadialGradient(450, 120, 10, 450, 120, 430);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.scale(1, .3); g.fillStyle = gr; g.beginPath(); g.arc(450, 400, 430, 0, 6.2832); g.fill(); g.restore();
    return c;
  }
  function ensureSprites(){
    const tn = toneName();
    if (spriteTone === tn && sprites.cloud) return;
    spriteTone = tn;
    sprites.cloud = [11, 23, 37, 51, 67, 83].map(sd => makeCloud(sd, TONES[tn]));
    if (!sprites.fog) sprites.fog = makeFog();
  }

  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    build();
  }

  function build(){
    ensureSprites();
    const r = rng(7), area = Math.min(2, (W * H) / (1400 * 800));
    // clouds -------------------------------------------------------------
    const heavy = S.kind === 'rain' || S.kind === 'storm' || S.kind === 'drizzle' || S.kind === 'snow';
    let n = Math.round(2 + S.clouds * 8 + (heavy ? 3 : 0));
    if (S.kind === 'clear') n = Math.round(1 + S.clouds * 4);
    clouds = [];
    for (let i = 0; i < n; i++){
      const depth = .35 + r() * .95;                            // .35 far … 1.3 near
      clouds.push({
        spr: Math.floor(r() * 6),
        x: r() * (W + 900) - 450,
        y: H * (.02 + (1.25 - depth) * .26) + r() * H * .10,
        s: depth * (.75 + r() * .45) * Math.max(.6, Math.min(1.4, W / 1300)),
        v: (5 + depth * 15) * (.6 + Math.min(S.wind, 14) * .16),
        a: Math.min(1, (.34 + .6 * S.clouds) * (.55 + .45 * Math.min(1, depth)) + (heavy ? .18 : 0)),
        z: depth
      });
    }
    clouds.sort((a, b) => a.z - b.z);
    // rain ---------------------------------------------------------------
    drops = [];
    if (S.kind === 'rain' || S.kind === 'storm' || S.kind === 'drizzle'){
      const base = S.kind === 'drizzle' ? 70 : 140;
      const cnt = Math.round((base + S.intensity * 560 * (S.kind === 'storm' ? 1.15 : 1)) * area);
      for (let i = 0; i < cnt; i++){
        const z = .35 + r() * .65;
        drops.push({ x: r() * (W + 260) - 130, y: r() * H, l: (9 + r() * 15) * z, v: (760 + r() * 760) * z, z: z });
      }
    }
    // snow ---------------------------------------------------------------
    flakes = [];
    if (S.kind === 'snow'){
      const cnt = Math.round((70 + S.intensity * 320) * area);
      for (let i = 0; i < cnt; i++){
        const z = .3 + r() * .7;
        flakes.push({ x: r() * W, y: r() * H, r: (.8 + r() * 2.4) * (.6 + z * .6), v: (28 + r() * 62) * z, ph: r() * 6.28, amp: 10 + r() * 28, z: z });
      }
    }
    // fog ----------------------------------------------------------------
    fogs = [];
    if (S.kind === 'fog' || S.kind === 'rain' || S.kind === 'storm'){
      const cnt = S.kind === 'fog' ? 8 : 3;
      for (let i = 0; i < cnt; i++) fogs.push({ x: r() * W - 450, y: H * (.35 + r() * .6), s: .9 + r() * 1.3, v: 6 + r() * 10, a: S.kind === 'fog' ? .55 : .3 });
    }
    nextBolt = clock + 2200 + Math.random() * 3800;
    if (reduce) draw();
  }

  function makeBolt(){
    const x0 = W * (.12 + Math.random() * .76), pts = [[x0, -10]];
    let x = x0, y = -10;
    const endY = H * (.45 + Math.random() * .3);
    while (y < endY){ y += 26 + Math.random() * 42; x += (Math.random() - .5) * 70; pts.push([x, y]); }
    const branches = [];
    for (let i = 2; i < pts.length - 2; i++){
      if (Math.random() < .28){
        const b = [pts[i].slice()]; let bx = pts[i][0], by = pts[i][1];
        for (let k = 0; k < 4; k++){ by += 22 + Math.random() * 30; bx += (Math.random() < .5 ? -1 : 1) * (14 + Math.random() * 34); b.push([bx, by]); }
        branches.push(b);
      }
    }
    return { pts: pts, branches: branches, life: 1 };
  }

  function step(dt){
    clock += dt * 1000;
    const slant = Math.max(-.7, Math.min(.7, S.wind * .045));
    for (const c of clouds){ c.x += c.v * dt; if (c.x > W + 450) c.x = -450 - Math.random() * 300; }
    for (const d of drops){
      d.y += d.v * dt; d.x += d.v * slant * dt;
      if (d.y > H + 20){ d.y = -20 - Math.random() * 80; d.x = Math.random() * (W + 260) - 130; }
    }
    for (const f of flakes){
      f.y += f.v * dt; f.ph += dt * (.8 + f.z);
      f.x += Math.sin(f.ph) * f.amp * dt + S.wind * 4 * dt;
      if (f.y > H + 6){ f.y = -6; f.x = Math.random() * W; }
      if (f.x > W + 10) f.x = -10;
    }
    for (const g of fogs){ g.x += g.v * dt; if (g.x > W + 100) g.x = -900 * g.s; }
    if (S.kind === 'storm'){
      if (clock > nextBolt){ bolt = makeBolt(); flash = 1; nextBolt = clock + 3500 + Math.random() * 7500; setTimeout(() => { flash = Math.max(flash, .7); }, 140); }
      if (bolt){ bolt.life -= dt * 4.2; if (bolt.life <= 0) bolt = null; }
      flash = Math.max(0, flash - dt * 2.6);
    } else { bolt = null; flash = 0; }
  }

  function draw(){
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // far clouds first
    const cs = sprites.cloud;
    for (const c of clouds){
      const spr = cs[c.spr % cs.length], w = spr.width * c.s, h = spr.height * c.s;
      ctx.globalAlpha = c.a;
      ctx.drawImage(spr, c.x - w / 2, c.y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
    // fog banks
    for (const g of fogs){
      ctx.globalAlpha = g.a;
      ctx.drawImage(sprites.fog, g.x, g.y, 900 * g.s, 240 * g.s);
    }
    ctx.globalAlpha = 1;
    // rain
    if (drops.length){
      const slant = Math.max(-.7, Math.min(.7, S.wind * .045));
      const tint = S.night ? '170,200,235' : '86,128,166';
      for (let pass = 0; pass < 3; pass++){
        const lo = .35 + pass * .22, hi = lo + .22;
        ctx.beginPath();
        for (const d of drops){
          if (d.z < lo || d.z >= hi) continue;
          ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * slant, d.y - d.l);
        }
        ctx.strokeStyle = 'rgba(' + tint + ',' + (.16 + pass * .13) + ')';
        ctx.lineWidth = .8 + pass * .35;
        ctx.stroke();
      }
    }
    // snow
    if (flakes.length){
      ctx.fillStyle = S.night ? 'rgba(235,245,255,.9)' : 'rgba(255,255,255,.95)';
      for (const f of flakes){
        ctx.globalAlpha = .45 + f.z * .5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // lightning
    if (bolt){
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const paint = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
      ctx.globalAlpha = Math.max(0, bolt.life);
      ctx.shadowColor = 'rgba(170,200,255,.95)'; ctx.shadowBlur = 24;
      ctx.strokeStyle = 'rgba(210,225,255,.9)'; ctx.lineWidth = 3; paint(bolt.pts);
      ctx.lineWidth = 1.4; bolt.branches.forEach(paint);
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; paint(bolt.pts);
      ctx.restore();
    }
    if (flash > .01){
      ctx.fillStyle = 'rgba(214,228,255,' + (flash * .42) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame(t){
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = t; return; }
    const open = document.body.classList.contains('view-open');
    const minDt = open ? 33 : 15;                 // 30 fps behind windows, 60 fps otherwise
    const dt = t - last;
    if (dt < minDt) return;
    last = t;
    step(Math.min(dt, 60) / 1000);
    draw();
  }

  function classes(){
    const b = document.body;
    ['clear', 'clouds', 'rain', 'storm', 'snow', 'fog'].forEach(k => b.classList.remove('wx-' + k));
    b.classList.remove('wx-night', 'wx-dusk');
    const k = S.kind === 'drizzle' ? 'rain' : S.kind;
    b.classList.add('wx-' + k);
    if (S.night) b.classList.add('wx-night');
    if (S.dusk) b.classList.add('wx-dusk');
  }

  // Sun / moon travel across the sky with the real time of day.
  function celestial(d){
    const now = Math.floor(Date.now() / 1000);
    const sr = d && d.sunrise, ss = d && d.sunset;
    let p, isSun = true;
    if (sr && ss){
      if (now >= sr && now <= ss) p = (now - sr) / (ss - sr);
      else { isSun = false; const night = 86400 - (ss - sr); const since = now > ss ? now - ss : now + 86400 - ss; p = Math.max(0, Math.min(1, since / night)); }
    } else { const h = new Date().getHours() + new Date().getMinutes() / 60; isSun = h >= 6 && h < 21; p = isSun ? (h - 6) / 15 : ((h + 3) % 24) / 9; p = Math.max(0, Math.min(1, p)); }
    // Keep the sun/moon in the upper-right quadrant always — never low or over the hero text,
    // even though p tracks the real time of day for a subtle living feel.
    const x = 60 + 28 * p, y = 9 + (1 - Math.sin(Math.PI * p)) * 17;
    const r = document.documentElement.style;
    r.setProperty(isSun ? '--sun-x' : '--moon-x', x + '%');
    r.setProperty(isSun ? '--sun-y' : '--moon-y', y + '%');
    return { isSun: isSun, p: p, dusk: isSun && (p < .07 || p > .93) };
  }

  function set(d){
    d = d || {};
    const cel = celestial(d);
    S.kind = d.kind || (d.main ? ({ Thunderstorm: 'storm', Drizzle: 'drizzle', Rain: 'rain', Snow: 'snow', Clouds: 'clouds', Clear: 'clear', Mist: 'fog', Fog: 'fog', Haze: 'fog', Smoke: 'fog', Dust: 'fog' }[d.main] || 'clear') : 'clear');
    S.clouds = Math.max(0, Math.min(1, (d.clouds != null ? d.clouds : (S.kind === 'clear' ? 8 : S.kind === 'clouds' ? 75 : 100)) / 100));
    S.wind = Number(d.wind) || 0;
    S.intensity = d.intensity != null ? d.intensity : (S.kind === 'storm' ? .8 : S.kind === 'rain' ? .55 : S.kind === 'snow' ? .5 : 0);
    S.rn = d.night != null ? !!d.night : !cel.isSun;
    S.night = S.rn || document.documentElement.classList.contains('dark');
    S.dusk = !S.night && (d.dusk != null ? !!d.dusk : cel.dusk);
    S.temp = d.temp;
    classes();
    spriteTone = '';          // rebuild sprites in the right light
    resize();
    document.documentElement.style.setProperty('--wx-wind', Math.min(1, S.wind / 15));
    if (!reduce && !raf) raf = requestAnimationFrame(frame);
  }

  window.WX = { set: set, state: S, redraw: () => { spriteTone = ''; build(); } };
  // dark theme = night sky, so the sprites must follow the theme too
  new MutationObserver(() => { const dk = document.documentElement.classList.contains('dark'); if (dk !== !!S._dark){ S._dark = dk; S.night = !!S.rn || dk; if (S.night) S.dusk = false; classes(); spriteTone = ''; build(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
  document.addEventListener('visibilitychange', () => { last = 0; });
  set({ kind: 'clear', clouds: 12 });
})();

// ---- location + data --------------------------------------------------------------
(function(){
  const KEY = 'iomastavka_geo';
  const readGeo = () => { try { const g = JSON.parse(localStorage.getItem(KEY) || 'null'); return g && isFinite(g.lat) && isFinite(g.lon) ? g : null; } catch (e) { return null; } };
  const T = {
    ru: { names: { clear: 'Ясно', clouds: 'Облачно', rain: 'Дождь', drizzle: 'Морось', storm: 'Гроза', snow: 'Снег', fog: 'Туман' }, use: 'Погода по вашему месту', back: 'Показываю погоду в Москве', asking: 'Разрешите доступ к геопозиции…', denied: 'Нет доступа к геопозиции — показываю Москву', title: 'Нажмите, чтобы показать погоду в вашем месте', titleBack: 'Нажмите, чтобы вернуться к Москве' },
    en: { names: { clear: 'Clear', clouds: 'Cloudy', rain: 'Rain', drizzle: 'Drizzle', storm: 'Thunderstorm', snow: 'Snow', fog: 'Fog' }, use: 'Weather for your location', back: 'Showing Moscow weather', asking: 'Allow location access…', denied: 'Location unavailable — showing Moscow', title: 'Click to use your location', titleBack: 'Click to go back to Moscow' },
    zh: { names: { clear: '晴', clouds: '多云', rain: '下雨', drizzle: '毛毛雨', storm: '雷雨', snow: '下雪', fog: '雾' }, use: '显示您所在位置的天气', back: '显示莫斯科天气', asking: '请允许访问位置…', denied: '无法获取位置，显示莫斯科', title: '点击使用您的位置', titleBack: '点击返回莫斯科' },
    tr: { names: { clear: 'Açık', clouds: 'Bulutlu', rain: 'Yağmur', drizzle: 'Çiseleme', storm: 'Fırtına', snow: 'Kar', fog: 'Sis' }, use: 'Konumunuza göre hava', back: 'Moskova havası gösteriliyor', asking: 'Konum erişimine izin verin…', denied: 'Konum alınamadı — Moskova gösteriliyor', title: 'Konumunuzu kullanmak için tıklayın', titleBack: "Moskova'ya dönmek için tıklayın" }
  };
  const L = () => T[lang] || T.ru;
  let lastData = null;

  function paintChip(d){
    const el = document.getElementById('homeWeatherText');
    if (!el || !d) return;
    const geo = readGeo();
    const kind = d.kind || 'clear';
    const t = d.temp != null ? (d.temp > 0 ? '+' : '') + Math.round(d.temp) + '°' : '';
    el.textContent = [d.city || (geo ? '' : 'Москва'), (L().names[kind] || ''), t].filter(Boolean).join(' · ');
    const box = el.parentElement;
    if (box){ box.classList.add('wx-chip'); box.setAttribute('role', 'button'); box.tabIndex = 0; box.title = geo ? L().titleBack : L().title; }
  }

  window.applyWeatherVisual = function(d){
    lastData = d;
    if (window.WX) window.WX.set(d);
    paintChip(d);
    const hs = $('#homeRouteStatus');
    if (hs && $('#distance')?.value) hs.textContent = (lang === 'ru' ? 'Маршрут · ' : lang === 'en' ? 'Route · ' : '路线 · ') + Number($('#distance').value).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US') + ' km';
  };
  window.setTimeWeather = function(){ window.applyWeatherVisual({ kind: 'clear', clouds: 12, wind: 2 }); };

  window.checkWeather = async function(){
    if (window.__wxDemo) return;
    try {
      const g = readGeo();
      const q = '?lang=' + encodeURIComponent(lang) + (g ? '&lat=' + g.lat + '&lon=' + g.lon : '');
      const r = await fetch('/api/weather' + q, { cache: 'no-store' });
      if (!r.ok) throw new Error('weather ' + r.status);
      window.applyWeatherVisual(await r.json());
    } catch (e) { if (!lastData) window.setTimeWeather(); }
  };

  function toggleGeo(){
    if (readGeo()){ localStorage.removeItem(KEY); toast(L().back, 'info', 2600); return window.checkWeather(); }
    if (!navigator.geolocation){ toast(L().denied, 'error', 3200); return; }
    toast(L().asking, 'info', 2400);
    navigator.geolocation.getCurrentPosition(pos => {
      try { localStorage.setItem(KEY, JSON.stringify({ lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) })); } catch (e) {}
      toast(L().use, 'success', 2200);
      window.checkWeather();
    }, () => toast(L().denied, 'error', 3600), { timeout: 9000, maximumAge: 600000 });
  }
  document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.wx-chip'); if (c) toggleGeo(); });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('wx-chip')){ e.preventDefault(); toggleGeo(); } });

  // preview: ?wx=rain
  const demo = (new URLSearchParams(location.search).get('wx') || '').toLowerCase();
  if (demo){
    window.__wxDemo = true;
    const P = {
      clear: { kind: 'clear', clouds: 10, wind: 2, night: false, dusk: false }, night: { kind: 'clear', clouds: 12, wind: 1, night: true },
      dusk: { kind: 'clear', clouds: 30, wind: 2, night: false, dusk: true }, clouds: { kind: 'clouds', clouds: 85, wind: 5 },
      rain: { kind: 'rain', clouds: 100, wind: 5, intensity: .65 }, drizzle: { kind: 'drizzle', clouds: 95, wind: 2, intensity: .3 },
      storm: { kind: 'storm', clouds: 100, wind: 9, intensity: .9 }, snow: { kind: 'snow', clouds: 90, wind: 2, intensity: .6 }, fog: { kind: 'fog', clouds: 70, wind: 1 }
    };
    const d = Object.assign({ city: 'Москва', temp: 12 }, P[demo] || P.clear);
    setTimeout(() => window.applyWeatherVisual(d), 0);
  }
  window.checkWeather();
  setInterval(() => window.checkWeather(), 5 * 60 * 1000);
})();


// =====================================================================================
//  VOICE ORB — a living, iridescent sphere (Siri / ChatGPT-voice style)
//  idle: slow breathing · listening: swells with your voice · thinking: swirls · speaking: pulses
// =====================================================================================
(function(){
  const orb = document.getElementById('voiceOrb');
  if (!orb || window.VoiceOrb) return;
  const stage = orb.parentElement;
  const cv = document.createElement('canvas');
  cv.className = 'voice-orb-canvas'; cv.setAttribute('aria-hidden', 'true');
  orb.insertBefore(cv, orb.firstChild);
  const ctx = cv.getContext('2d');
  const SIZE = 260, DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = cv.height = SIZE * DPR;

  const PAL = {
    idle:      [[96, 170, 255], [104, 130, 255], [70, 214, 204], [150, 205, 255]],
    listening: [[64, 196, 255], [76, 140, 255], [52, 228, 196], [176, 120, 255]],
    thinking:  [[160, 124, 255], [92, 150, 255], [64, 222, 212], [255, 146, 212]],
    speaking:  [[255, 154, 214], [124, 142, 255], [64, 222, 212], [255, 204, 128]]
  };
  const cur = PAL.idle.map(c => c.slice());
  const st = { state: 'idle', level: 0, target: 0, pulse: 0, t: 0 };
  let raf = 0, last = 0, mic = null;
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';

  function frame(now){
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const r = cv.getBoundingClientRect();
    if (r.height < 20) { last = now; return; }             // stage collapsed: don't draw
    const dt = Math.min(50, now - (last || now)) / 1000; last = now;
    st.t += dt;
    st.level += (st.target - st.level) * Math.min(1, dt * 3.2);
    st.pulse *= Math.exp(-dt * 1.6);
    const target = PAL[st.state] || PAL.idle;
    for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) cur[k][j] += (target[k][j] - cur[k][j]) * Math.min(1, dt * 3);
    draw();
  }

  function draw(){
    const s = st.state, t = st.t;
    const env = .5 + .5 * Math.sin(t * 1.7) * Math.sin(t * .9 + 1);
    let lv = Math.max(st.level, st.pulse);
    if (s === 'speaking') lv = Math.max(lv, .18 + .22 * env);
    if (s === 'idle') lv = 0;
    const cx = SIZE / 2, cy = SIZE / 2;
    const R = SIZE * .33 * (1 + (s === 'listening' ? lv * .1 : s === 'speaking' ? lv * .07 : s === 'thinking' ? .02 * Math.sin(t * .6) : .018 * Math.sin(t * .4)));
    // Gentle, slow, smooth — a calm breathing/liquid sphere, not a spiky blob.
    const amp = s === 'idle' ? .022 : s === 'listening' ? .028 + lv * .07 : s === 'thinking' ? .04 : .035 + lv * .05;
    const speed = s === 'idle' ? .14 : s === 'listening' ? .2 + lv * .4 : s === 'thinking' ? .38 : .28 + lv * .3;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = 'source-over';
    // Soft glow, tight to the sphere — no big outer halo, no rim stroke.
    const glow = ctx.createRadialGradient(cx, cy, R * .7, cx, cy, R * 1.35);
    glow.addColorStop(0, rgba(cur[0], .22 + lv * .18)); glow.addColorStop(1, rgba(cur[0], 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 6.2832); ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++){
      const col = cur[k], ph = t * speed * (.7 + k * .18) + k * 2.1, off = R * .05 * (1 + lv * .6);
      const ox = cx + Math.cos(ph * .5 + k) * off, oy = cy + Math.sin(ph * .45 + k * 2) * off;
      const N = 64; let rmax = 0;
      ctx.beginPath();
      for (let i = 0; i <= N; i++){
        const a = i / N * 6.2832;
        const rr = R * (1 + amp * (Math.sin(2 * a + ph) + .5 * Math.sin(3 * a - ph * .8 + k)));
        rmax = Math.max(rmax, rr);
        const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(ox - R * .2, oy - R * .25, R * .08, ox, oy, rmax * 1.05);
      g.addColorStop(0, rgba(col, .8)); g.addColorStop(.65, rgba(col, .4)); g.addColorStop(1, rgba(col, .05));
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const hl = ctx.createRadialGradient(cx - R * .38, cy - R * .42, 2, cx - R * .3, cy - R * .34, R * .75);
    hl.addColorStop(0, 'rgba(255,255,255,.5)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, 6.2832); ctx.fill();
  }

  async function startMic(){
    if (mic || localStorage.getItem('iomastavka_orb_mic') === 'off') return !!mic;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
      an.fftSize = 1024; an.smoothingTimeConstant = .82; src.connect(an);
      mic = { stream: stream, ac: ac, an: an, buf: new Uint8Array(an.fftSize), raf: 0 };
      (function poll(){
        if (!mic) return;
        mic.an.getByteTimeDomainData(mic.buf);
        let sum = 0; for (let i = 0; i < mic.buf.length; i++){ const x = (mic.buf[i] - 128) / 128; sum += x * x; }
        st.target = Math.min(1, Math.sqrt(sum / mic.buf.length) * 3.2);
        mic.raf = requestAnimationFrame(poll);
      })();
      return true;
    } catch (e) { return false; }
  }
  function stopMic(){
    if (!mic) return;
    cancelAnimationFrame(mic.raf);
    try { mic.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { mic.ac.close(); } catch (e) {}
    mic = null; st.target = 0;
  }

  window.VoiceOrb = {
    set: s => { if (PAL[s]) st.state = s; const cap = document.getElementById('voiceOrbCaption'); if (cap && window.__voiceCaptions && window.__voiceCaptions[s]) cap.textContent = window.__voiceCaptions[s](); },
    pulse: v => { st.pulse = Math.max(st.pulse, v || .6); },
    startMic: startMic, stopMic: stopMic, state: st
  };
  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(frame);
  else draw();

  // caption + exit button live inside the orb stage
  const L = {
    ru: { idle: 'Нажмите на шар и говорите', listening: 'Слушаю…', thinking: 'Думаю…', speaking: 'Отвечаю…', exit: 'Завершить голосовой режим' },
    en: { idle: 'Tap the orb and speak', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…', exit: 'End voice mode' },
    zh: { idle: '点击球体并说话', listening: '正在聆听…', thinking: '思考中…', speaking: '回答中…', exit: '结束语音模式' },
    tr: { idle: 'Küreye dokunun ve konuşun', listening: 'Dinliyorum…', thinking: 'Düşünüyorum…', speaking: 'Cevaplıyorum…', exit: 'Sesli modu bitir' }
  };
  const T = () => L[lang] || L.ru;
  window.__voiceCaptions = { idle: () => T().idle, listening: () => T().listening, thinking: () => T().thinking, speaking: () => T().speaking };
  const cap = document.createElement('div'); cap.id = 'voiceOrbCaption'; cap.className = 'voice-orb-caption'; cap.setAttribute('aria-live', 'polite');
  const exit = document.createElement('button'); exit.type = 'button'; exit.className = 'voice-exit';
  stage.appendChild(cap); stage.appendChild(exit);
  const paint = () => { exit.textContent = T().exit; cap.textContent = T()[st.state] || ''; };
  paint(); document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.lang')) setTimeout(paint, 0); });

  window.voiceSessionStart = function(){
    window.__voiceSession = true; voiceAutoSpeak = true;
    $('#assistantView')?.classList.add('voice-active', 'voice-session');
    document.querySelector('.assistant-shell')?.classList.add('voice-active', 'voice-session');
  };
  window.voiceSessionEnd = function(){
    window.__voiceSession = false; voiceAutoSpeak = false;
    try { window.__iomaStopVoice && window.__iomaStopVoice(); } catch (e) {}
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    stopMic(); st.state = 'idle'; paint();
    $('#assistantView')?.classList.remove('voice-active', 'voice-session');
    document.querySelector('.assistant-shell')?.classList.remove('voice-active', 'voice-session');
    document.body.classList.remove('voice-active');
    $('#voiceButton')?.classList.remove('listening');
  };
  exit.addEventListener('click', () => window.voiceSessionEnd());
  // tap the orb = talk / stop talking (captures before the legacy handler)
  orb.addEventListener('click', e => {
    e.preventDefault(); e.stopImmediatePropagation();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (x) {}
    $('#voiceButton')?.click();
  }, true);
  orb.style.cursor = 'pointer';
  // mic button starts a session (and keeps it open for the whole conversation)
  $('#voiceButton')?.addEventListener('click', () => { if (!window.__voiceSession) window.voiceSessionStart(); }, true);
  // leaving the assistant window ends the session
  new MutationObserver(() => { if (!$('#assistantView')?.classList.contains('open') && window.__voiceSession) window.voiceSessionEnd(); }).observe($('#assistantView'), { attributes: true, attributeFilter: ['class'] });
})();

// =====================================================================================
//  CBR RATE CALENDAR — click the date on the home currency chip to see the rate on any
//  past day. Pins the display so the 30-minute auto-refresh doesn't overwrite the choice.
// =====================================================================================
(function(){
  const T = {
    ru: { pick: 'Курс ЦБ на дату', today: 'Сегодня', close: 'Закрыть', loading: 'Загружаю…', fail: 'Не удалось получить курс на эту дату', weekdays: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'], months: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'] },
    en: { pick: 'CBR rate for a date', today: 'Today', close: 'Close', loading: 'Loading…', fail: 'Could not get the rate for that date', weekdays: ['Mo','Tu','We','Th','Fr','Sa','Su'], months: ['January','February','March','April','May','June','July','August','September','October','November','December'] },
    zh: { pick: '选择日期查看央行汇率', today: '今天', close: '关闭', loading: '加载中…', fail: '无法获取该日期的汇率', weekdays: ['一','二','三','四','五','六','日'], months: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'] },
    tr: { pick: 'Tarihe göre MB kuru', today: 'Bugün', close: 'Kapat', loading: 'Yükleniyor…', fail: 'Bu tarih için kur alınamadı', weekdays: ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'], months: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'] }
  };
  const L = () => T[typeof lang !== 'undefined' ? lang : 'ru'] || T.ru;
  const pad2 = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

  let pop, view = new Date();
  function build(){
    pop = document.createElement('div');
    pop.className = 'currency-cal';
    pop.setAttribute('role', 'dialog');
    document.body.appendChild(pop);
    pop.addEventListener('click', e => e.stopPropagation());
  }
  function render(selected){
    const t = L();
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let cells = '';
    for (let i = 0; i < startOffset; i++) cells += '<span class="cc-day cc-empty"></span>';
    for (let d = 1; d <= daysInMonth; d++){
      const dt = new Date(y, m, d);
      const future = dt > today;
      const isToday = iso(dt) === iso(today);
      const isSel = selected && iso(dt) === selected;
      cells += '<button type="button" class="cc-day' + (future ? ' cc-disabled' : '') + (isToday ? ' cc-today' : '') + (isSel ? ' cc-selected' : '') + '"' + (future ? ' disabled' : ' data-date="' + iso(dt) + '"') + '>' + d + '</button>';
    }
    pop.innerHTML =
      '<div class="cc-head">' +
        '<button type="button" class="cc-nav" data-nav="-1" aria-label="&larr;"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>' +
        '<b>' + t.months[m] + ' ' + y + '</b>' +
        '<button type="button" class="cc-nav" data-nav="1" aria-label="&rarr;"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '</div>' +
      '<div class="cc-weekdays">' + t.weekdays.map(w => '<span>' + w + '</span>').join('') + '</div>' +
      '<div class="cc-grid">' + cells + '</div>' +
      '<button type="button" class="cc-today-btn" data-today="1">' + t.today + '</button>';
    pop.querySelector('[data-nav="-1"]').onclick = () => { view = new Date(y, m - 1, 1); render(selected); };
    pop.querySelector('[data-nav="1"]').onclick = () => { const n = new Date(y, m + 1, 1); if (n <= today || (n.getFullYear() === today.getFullYear() && n.getMonth() === today.getMonth())) { view = n; render(selected); } };
    pop.querySelectorAll('.cc-day[data-date]').forEach(btn => { btn.onclick = () => pick(btn.dataset.date); });
    pop.querySelector('[data-today]').onclick = () => { window.__currencyPinned = false; close(); loadCurrency(); };
  }
  function position(anchor){
    const r = anchor.getBoundingClientRect();
    pop.style.top = (r.bottom + 10 + window.scrollY) + 'px';
    const left = Math.max(12, Math.min(r.left, window.innerWidth - 300));
    pop.style.left = left + 'px';
  }
  function open(anchor){
    if (!pop) build();
    view = new Date();
    render(null);
    pop.classList.add('open');
    position(anchor);
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
  function close(){
    if (pop) pop.classList.remove('open');
    document.removeEventListener('click', onDocClick);
  }
  function onDocClick(){ close(); }

  async function pick(dateStr){
    const t = L();
    const chip = $('#homeCurrencyDate');
    if (chip) chip.textContent = t.loading;
    try {
      const r = await fetch('/api/currency/history?date=' + dateStr);
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || 'fail');
      window.__currencyPinned = true;
      const dt = new Date(dateStr + 'T00:00:00');
      const label = dt.getDate() + ' ' + t.months[dt.getMonth()] + ' ' + dt.getFullYear();
      paintCurrency(d.items, label);
      toast(label + ' \u2014 ' + (typeof lang !== 'undefined' && lang === 'ru' ? 'курс ЦБ на эту дату' : 'CBR rate'), 'success', 2600);
    } catch (e) {
      toast(t.fail, 'error', 3600);
      window.__currencyPinned = false;
      loadCurrency();
    }
    close();
  }

  document.addEventListener('click', e => {
    const chip = e.target.closest && e.target.closest('#homeCurrencyDate');
    if (!chip) return;
    e.stopPropagation();
    if (pop && pop.classList.contains('open')) { close(); return; }
    open(chip);
  });

  // keep the chip visually hinting it's clickable, and translate the tooltip
  const style = () => { const chip = $('#homeCurrencyDate'); if (chip) chip.title = L().pick; };
  document.addEventListener('DOMContentLoaded', style);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.lang')) setTimeout(style, 0); });
  style();
})();

/* ============ IOMA: форма заявки ============ */
(function(){
  if (window.__iomaRequestHandler) return;
  window.__iomaRequestHandler = true;

  function initRequestForm(){
    var form = document.getElementById('requestForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    // Запоминаем время открытия формы
    var openedAt = Date.now();
    try {
      var tField = document.getElementById('requestTime');
      if (tField) tField.value = String(openedAt);
    } catch(e){}

    // Валидация контакта — отсеиваем спам
    function validatePhone(countryCode, digits){
      var picked = (window.__iomaPhonePick && window.__iomaPhonePick()) || { lengths: [10] };
      var expected = picked.lengths || [7,8,9,10,11,12,13,14,15];
      if (!expected.includes(digits.length)) return 'Неверная длина номера (введено ' + digits.length + ', нужно ' + expected.join('/') + ')';
      if (/^(\d)\1+$/.test(digits)) return 'Номер из одинаковых цифр';
      if (/0{6,}/.test(digits)) return 'Слишком много нулей';
      if (/9{6,}/.test(digits)) return 'Слишком много девяток';
      if (/8{6,}/.test(digits)) return 'Слишком много восьмёрок';
      if (/1{6,}/.test(digits)) return 'Слишком много единиц';
      if (/2{6,}/.test(digits)) return 'Слишком много двоек';
      // Известные спам-номера
      var blocklist = ['88005553535'];
      if (blocklist.includes(countryCode.replace('+','') + digits)) return 'Этот номер в чёрном списке';
      return '';
    }

    function validateName(n){
      var v = String(n||'').trim();
      if (v.length < 2) return 'Имя слишком короткое';
      if (v.length > 120) return 'Имя слишком длинное';
      if (/^(.)\1+$/.test(v)) return 'Некорректное имя';
      return '';
    }

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var status = document.getElementById('requestStatus');
      var name = (document.getElementById('requestName') || {}).value || '';
      var picked = (window.__iomaPhonePick && window.__iomaPhonePick()) || { code: '+7', lengths: [10] };
      var countryCode = picked.code;
      var phoneRaw = (document.getElementById('requestPhone') || {}).value || '';
      var phoneDigits = phoneRaw.replace(/\D/g, '');
      // Убираем ведущую 8 для РФ
      if (countryCode === '+7' && phoneDigits.startsWith('8')) phoneDigits = phoneDigits.slice(1);
      // Если пользователь случайно ввёл код страны — убираем дубль
      var codeDigits = countryCode.replace('+','');
      if (phoneDigits.indexOf(codeDigits) === 0 && phoneDigits.length > codeDigits.length + 5){
        phoneDigits = phoneDigits.slice(codeDigits.length);
      }
      var contact = countryCode + phoneDigits;
      var body = (window.__iomaRequestBuildBody && window.__iomaRequestBuildBody()) || ((document.getElementById('requestBody') || {}).value || '');
      var honey = (document.getElementById('requestWebsite') || {}).value || '';

      if (!name.trim() || !contact.trim()){
        if (status){ status.textContent = 'Заполните имя и контакт.'; status.className = 'request-status is-error'; }
        return;
      }

      // Honeypot — если заполнено, это бот. Тихо делаем вид что отправили.
      if (honey.trim()){
        console.log('[antispam] honeypot triggered');
        if (status){ status.textContent = '✅ Заявка отправлена! Свяжемся с вами.'; status.className = 'request-status is-ok'; }
        form.reset();
        return;
      }

      // Слишком быстро — бот
      var elapsed = Date.now() - openedAt;
      if (elapsed < 3000){
        if (status){ status.textContent = 'Подождите пару секунд и попробуйте снова.'; status.className = 'request-status is-error'; }
        return;
      }

      // Валидация имени
      var errName = validateName(name);
      if (errName){
        if (status){ status.textContent = errName; status.className = 'request-status is-error'; }
        return;
      }

      // Валидация контакта
      var errContact = validatePhone(countryCode, phoneDigits);
      if (errContact){
        if (status){ status.textContent = errContact; status.className = 'request-status is-error'; }
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn){ btn.disabled = true; btn.textContent = 'Отправляю…'; }
      if (status){ status.textContent = ''; status.className = 'request-status'; }
      try {
        var r = await fetch('/api/requests', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ name: name.trim(), contact: contact.trim(), body: body.trim() })
        });
        var d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || 'Ошибка отправки');
        if (status){ status.textContent = '✅ Заявка отправлена! Свяжемся с вами.'; status.className = 'request-status is-ok'; }
        form.reset();
      } catch(err){
        if (status){ status.textContent = 'Ошибка: ' + err.message; status.className = 'request-status is-error'; }
      } finally {
        if (btn){ btn.disabled = false; btn.textContent = 'Отправить'; }
      }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initRequestForm);
  } else {
    initRequestForm();
  }
})();

/* ============ IOMA: селектор страны для телефона ============ */
(function(){
  if (window.__iomaPhonePicker) return;
  window.__iomaPhonePicker = true;

  // Страны: флаг, код, длины номера, названия на разных языках
  var COUNTRIES = [
    {iso:'RU',c:'+7',n:'Россия',en:'Russia',zh:'俄罗斯',len:[10]},
    {iso:'KZ',c:'+7',n:'Казахстан',en:'Kazakhstan',zh:'哈萨克斯坦',len:[10]},
    {iso:'BY',c:'+375',n:'Беларусь',en:'Belarus',zh:'白俄罗斯',len:[9]},
    {iso:'UA',c:'+380',n:'Украина',en:'Ukraine',zh:'乌克兰',len:[9]},
    {iso:'UZ',c:'+998',n:'Узбекистан',en:'Uzbekistan',zh:'乌兹别克斯坦',len:[9]},
    {iso:'KG',c:'+996',n:'Киргизия',en:'Kyrgyzstan',zh:'吉尔吉斯斯坦',len:[9]},
    {iso:'TJ',c:'+992',n:'Таджикистан',en:'Tajikistan',zh:'塔吉克斯坦',len:[9]},
    {iso:'TM',c:'+993',n:'Туркмения',en:'Turkmenistan',zh:'土库曼斯坦',len:[8]},
    {iso:'AM',c:'+374',n:'Армения',en:'Armenia',zh:'亚美尼亚',len:[8]},
    {iso:'AZ',c:'+994',n:'Азербайджан',en:'Azerbaijan',zh:'阿塞拜疆',len:[9]},
    {iso:'GE',c:'+995',n:'Грузия',en:'Georgia',zh:'格鲁吉亚',len:[9]},
    {iso:'MD',c:'+373',n:'Молдова',en:'Moldova',zh:'摩尔多瓦',len:[8]},
    {iso:'RO',c:'+40',n:'Румыния',en:'Romania',zh:'罗马尼亚',len:[9]},
    {iso:'BG',c:'+359',n:'Болгария',en:'Bulgaria',zh:'保加利亚',len:[9]},
    {iso:'RS',c:'+381',n:'Сербия',en:'Serbia',zh:'塞尔维亚',len:[9]},
    {iso:'HR',c:'+385',n:'Хорватия',en:'Croatia',zh:'克罗地亚',len:[9]},
    {iso:'SI',c:'+386',n:'Словения',en:'Slovenia',zh:'斯洛文尼亚',len:[8]},
    {iso:'SK',c:'+421',n:'Словакия',en:'Slovakia',zh:'斯洛伐克',len:[9]},
    {iso:'CZ',c:'+420',n:'Чехия',en:'Czechia',zh:'捷克',len:[9]},
    {iso:'HU',c:'+36',n:'Венгрия',en:'Hungary',zh:'匈牙利',len:[9]},
    {iso:'PL',c:'+48',n:'Польша',en:'Poland',zh:'波兰',len:[9]},
    {iso:'LT',c:'+370',n:'Литва',en:'Lithuania',zh:'立陶宛',len:[8]},
    {iso:'LV',c:'+371',n:'Латвия',en:'Latvia',zh:'拉脱维亚',len:[8]},
    {iso:'EE',c:'+372',n:'Эстония',en:'Estonia',zh:'爱沙尼亚',len:[8]},
    {iso:'FI',c:'+358',n:'Финляндия',en:'Finland',zh:'芬兰',len:[9]},
    {iso:'SE',c:'+46',n:'Швеция',en:'Sweden',zh:'瑞典',len:[9]},
    {iso:'NO',c:'+47',n:'Норвегия',en:'Norway',zh:'挪威',len:[8]},
    {iso:'DK',c:'+45',n:'Дания',en:'Denmark',zh:'丹麦',len:[8]},
    {iso:'IS',c:'+354',n:'Исландия',en:'Iceland',zh:'冰岛',len:[7]},
    {iso:'IE',c:'+353',n:'Ирландия',en:'Ireland',zh:'爱尔兰',len:[9]},
    {iso:'GB',c:'+44',n:'Великобритания',en:'United Kingdom',zh:'英国',len:[10]},
    {iso:'DE',c:'+49',n:'Германия',en:'Germany',zh:'德国',len:[10]},
    {iso:'FR',c:'+33',n:'Франция',en:'France',zh:'法国',len:[9]},
    {iso:'IT',c:'+39',n:'Италия',en:'Italy',zh:'意大利',len:[10]},
    {iso:'ES',c:'+34',n:'Испания',en:'Spain',zh:'西班牙',len:[9]},
    {iso:'PT',c:'+351',n:'Португалия',en:'Portugal',zh:'葡萄牙',len:[9]},
    {iso:'NL',c:'+31',n:'Нидерланды',en:'Netherlands',zh:'荷兰',len:[9]},
    {iso:'BE',c:'+32',n:'Бельгия',en:'Belgium',zh:'比利时',len:[9]},
    {iso:'LU',c:'+352',n:'Люксембург',en:'Luxembourg',zh:'卢森堡',len:[9]},
    {iso:'CH',c:'+41',n:'Швейцария',en:'Switzerland',zh:'瑞士',len:[9]},
    {iso:'AT',c:'+43',n:'Австрия',en:'Austria',zh:'奥地利',len:[10]},
    {iso:'GR',c:'+30',n:'Греция',en:'Greece',zh:'希腊',len:[10]},
    {iso:'MT',c:'+356',n:'Мальта',en:'Malta',zh:'马耳他',len:[8]},
    {iso:'CY',c:'+357',n:'Кипр',en:'Cyprus',zh:'塞浦路斯',len:[8]},
    {iso:'AL',c:'+355',n:'Албания',en:'Albania',zh:'阿尔巴尼亚',len:[9]},
    {iso:'MK',c:'+389',n:'Северная Македония',en:'North Macedonia',zh:'北马其顿',len:[8]},
    {iso:'BA',c:'+387',n:'Босния и Герцеговина',en:'Bosnia',zh:'波斯尼亚',len:[8]},
    {iso:'ME',c:'+382',n:'Черногория',en:'Montenegro',zh:'黑山',len:[8]},
    {iso:'XK',c:'+383',n:'Косово',en:'Kosovo',zh:'科索沃',len:[8]},
    {iso:'CN',c:'+86',n:'Китай',en:'China',zh:'中国',len:[11]},
    {iso:'HK',c:'+852',n:'Гонконг',en:'Hong Kong',zh:'香港',len:[8]},
    {iso:'TW',c:'+886',n:'Тайвань',en:'Taiwan',zh:'台湾',len:[9]},
    {iso:'MO',c:'+853',n:'Макао',en:'Macau',zh:'澳门',len:[8]},
    {iso:'JP',c:'+81',n:'Япония',en:'Japan',zh:'日本',len:[10]},
    {iso:'KR',c:'+82',n:'Южная Корея',en:'South Korea',zh:'韩国',len:[10]},
    {iso:'KP',c:'+850',n:'Северная Корея',en:'North Korea',zh:'朝鲜',len:[8]},
    {iso:'MN',c:'+976',n:'Монголия',en:'Mongolia',zh:'蒙古',len:[8]},
    {iso:'VN',c:'+84',n:'Вьетнам',en:'Vietnam',zh:'越南',len:[9]},
    {iso:'TH',c:'+66',n:'Таиланд',en:'Thailand',zh:'泰国',len:[9]},
    {iso:'ID',c:'+62',n:'Индонезия',en:'Indonesia',zh:'印度尼西亚',len:[10]},
    {iso:'MY',c:'+60',n:'Малайзия',en:'Malaysia',zh:'马来西亚',len:[9]},
    {iso:'SG',c:'+65',n:'Сингапур',en:'Singapore',zh:'新加坡',len:[8]},
    {iso:'PH',c:'+63',n:'Филиппины',en:'Philippines',zh:'菲律宾',len:[10]},
    {iso:'IN',c:'+91',n:'Индия',en:'India',zh:'印度',len:[10]},
    {iso:'PK',c:'+92',n:'Пакистан',en:'Pakistan',zh:'巴基斯坦',len:[10]},
    {iso:'BD',c:'+880',n:'Бангладеш',en:'Bangladesh',zh:'孟加拉',len:[10]},
    {iso:'LK',c:'+94',n:'Шри-Ланка',en:'Sri Lanka',zh:'斯里兰卡',len:[9]},
    {iso:'NP',c:'+977',n:'Непал',en:'Nepal',zh:'尼泊尔',len:[10]},
    {iso:'BT',c:'+975',n:'Бутан',en:'Bhutan',zh:'不丹',len:[8]},
    {iso:'MV',c:'+960',n:'Мальдивы',en:'Maldives',zh:'马尔代夫',len:[7]},
    {iso:'AF',c:'+93',n:'Афганистан',en:'Afghanistan',zh:'阿富汗',len:[9]},
    {iso:'IR',c:'+98',n:'Иран',en:'Iran',zh:'伊朗',len:[10]},
    {iso:'IQ',c:'+964',n:'Ирак',en:'Iraq',zh:'伊拉克',len:[10]},
    {iso:'SA',c:'+966',n:'Саудовская Аравия',en:'Saudi Arabia',zh:'沙特阿拉伯',len:[9]},
    {iso:'AE',c:'+971',n:'ОАЭ',en:'UAE',zh:'阿联酋',len:[9]},
    {iso:'QA',c:'+974',n:'Катар',en:'Qatar',zh:'卡塔尔',len:[8]},
    {iso:'KW',c:'+965',n:'Кувейт',en:'Kuwait',zh:'科威特',len:[8]},
    {iso:'BH',c:'+973',n:'Бахрейн',en:'Bahrain',zh:'巴林',len:[8]},
    {iso:'OM',c:'+968',n:'Оман',en:'Oman',zh:'阿曼',len:[8]},
    {iso:'YE',c:'+967',n:'Йемен',en:'Yemen',zh:'也门',len:[9]},
    {iso:'JO',c:'+962',n:'Иордания',en:'Jordan',zh:'约旦',len:[9]},
    {iso:'LB',c:'+961',n:'Ливан',en:'Lebanon',zh:'黎巴嫩',len:[8]},
    {iso:'SY',c:'+963',n:'Сирия',en:'Syria',zh:'叙利亚',len:[9]},
    {iso:'IL',c:'+972',n:'Израиль',en:'Israel',zh:'以色列',len:[9]},
    {iso:'PS',c:'+970',n:'Палестина',en:'Palestine',zh:'巴勒斯坦',len:[9]},
    {iso:'TR',c:'+90',n:'Турция',en:'Turkey',zh:'土耳其',len:[10]},
    {iso:'EG',c:'+20',n:'Египет',en:'Egypt',zh:'埃及',len:[10]},
    {iso:'LY',c:'+218',n:'Ливия',en:'Libya',zh:'利比亚',len:[9]},
    {iso:'TN',c:'+216',n:'Тунис',en:'Tunisia',zh:'突尼斯',len:[8]},
    {iso:'DZ',c:'+213',n:'Алжир',en:'Algeria',zh:'阿尔及利亚',len:[9]},
    {iso:'MA',c:'+212',n:'Марокко',en:'Morocco',zh:'摩洛哥',len:[9]},
    {iso:'SD',c:'+249',n:'Судан',en:'Sudan',zh:'苏丹',len:[9]},
    {iso:'ET',c:'+251',n:'Эфиопия',en:'Ethiopia',zh:'埃塞俄比亚',len:[9]},
    {iso:'KE',c:'+254',n:'Кения',en:'Kenya',zh:'肯尼亚',len:[9]},
    {iso:'TZ',c:'+255',n:'Танзания',en:'Tanzania',zh:'坦桑尼亚',len:[9]},
    {iso:'UG',c:'+256',n:'Уганда',en:'Uganda',zh:'乌干达',len:[9]},
    {iso:'RW',c:'+250',n:'Руанда',en:'Rwanda',zh:'卢旺达',len:[9]},
    {iso:'NG',c:'+234',n:'Нигерия',en:'Nigeria',zh:'尼日利亚',len:[10]},
    {iso:'GH',c:'+233',n:'Гана',en:'Ghana',zh:'加纳',len:[9]},
    {iso:'CI',c:'+225',n:'Кот-д\'Ивуар',en:'Ivory Coast',zh:'科特迪瓦',len:[8]},
    {iso:'SN',c:'+221',n:'Сенегал',en:'Senegal',zh:'塞内加尔',len:[9]},
    {iso:'CM',c:'+237',n:'Камерун',en:'Cameroon',zh:'喀麦隆',len:[9]},
    {iso:'ZA',c:'+27',n:'ЮАР',en:'South Africa',zh:'南非',len:[9]},
    {iso:'ZW',c:'+263',n:'Зимбабве',en:'Zimbabwe',zh:'津巴布韦',len:[9]},
    {iso:'ZM',c:'+260',n:'Замбия',en:'Zambia',zh:'赞比亚',len:[9]},
    {iso:'MZ',c:'+258',n:'Мозамбик',en:'Mozambique',zh:'莫桑比克',len:[9]},
    {iso:'AO',c:'+244',n:'Ангола',en:'Angola',zh:'安哥拉',len:[9]},
    {iso:'NA',c:'+264',n:'Намибия',en:'Namibia',zh:'纳米比亚',len:[9]},
    {iso:'BW',c:'+267',n:'Ботсвана',en:'Botswana',zh:'博茨瓦纳',len:[8]},
    {iso:'MG',c:'+261',n:'Мадагаскар',en:'Madagascar',zh:'马达加斯加',len:[9]},
    {iso:'MU',c:'+230',n:'Маврикий',en:'Mauritius',zh:'毛里求斯',len:[7]},
    {iso:'SC',c:'+248',n:'Сейшелы',en:'Seychelles',zh:'塞舌尔',len:[7]},
    {iso:'US',c:'+1',n:'США',en:'United States',zh:'美国',len:[10]},
    {iso:'CA',c:'+1',n:'Канада',en:'Canada',zh:'加拿大',len:[10]},
    {iso:'MX',c:'+52',n:'Мексика',en:'Mexico',zh:'墨西哥',len:[10]},
    {iso:'GT',c:'+502',n:'Гватемала',en:'Guatemala',zh:'危地马拉',len:[8]},
    {iso:'CU',c:'+53',n:'Куба',en:'Cuba',zh:'古巴',len:[8]},
    {iso:'DO',c:'+1809',n:'Доминикана',en:'Dominican Republic',zh:'多米尼加',len:[7]},
    {iso:'HT',c:'+509',n:'Гаити',en:'Haiti',zh:'海地',len:[8]},
    {iso:'JM',c:'+1876',n:'Ямайка',en:'Jamaica',zh:'牙买加',len:[7]},
    {iso:'PA',c:'+507',n:'Панама',en:'Panama',zh:'巴拿马',len:[8]},
    {iso:'CR',c:'+506',n:'Коста-Рика',en:'Costa Rica',zh:'哥斯达黎加',len:[8]},
    {iso:'CO',c:'+57',n:'Колумбия',en:'Colombia',zh:'哥伦比亚',len:[10]},
    {iso:'VE',c:'+58',n:'Венесуэла',en:'Venezuela',zh:'委内瑞拉',len:[10]},
    {iso:'EC',c:'+593',n:'Эквадор',en:'Ecuador',zh:'厄瓜多尔',len:[9]},
    {iso:'PE',c:'+51',n:'Перу',en:'Peru',zh:'秘鲁',len:[9]},
    {iso:'BO',c:'+591',n:'Боливия',en:'Bolivia',zh:'玻利维亚',len:[8]},
    {iso:'CL',c:'+56',n:'Чили',en:'Chile',zh:'智利',len:[9]},
    {iso:'AR',c:'+54',n:'Аргентина',en:'Argentina',zh:'阿根廷',len:[10]},
    {iso:'UY',c:'+598',n:'Уругвай',en:'Uruguay',zh:'乌拉圭',len:[8]},
    {iso:'PY',c:'+595',n:'Парагвай',en:'Paraguay',zh:'巴拉圭',len:[9]},
    {iso:'BR',c:'+55',n:'Бразилия',en:'Brazil',zh:'巴西',len:[11]},
    {iso:'AU',c:'+61',n:'Австралия',en:'Australia',zh:'澳大利亚',len:[9]},
    {iso:'NZ',c:'+64',n:'Новая Зеландия',en:'New Zealand',zh:'新西兰',len:[9]},
    {iso:'FJ',c:'+679',n:'Фиджи',en:'Fiji',zh:'斐济',len:[7]},
    {iso:'PG',c:'+675',n:'Папуа-Новая Гвинея',en:'Papua New Guinea',zh:'巴布亚新几内亚',len:[8]}
]

  // Сортируем страны по алфавиту (русское название)
  COUNTRIES.sort(function(a, b){ return a.n.localeCompare(b.n, 'ru'); });
  // Находим Россию после сортировки
  var current = COUNTRIES.find(function(c){ return c.c === '+7' && c.n === 'Россия'; }) || COUNTRIES[0];
  var countryBtn, countryFlag, countryCode, phoneInput, dropdown, searchInput, listEl;
  var phoneField;

  function flagFromISO(iso){
    if (!iso || iso.length !== 2) return '🏳️';
    try {
      return String.fromCodePoint.apply(null, iso.toUpperCase().split('').map(function(ch){ return 127397 + ch.charCodeAt(0); }));
    } catch(e){ return '🏳️'; }
  }

  function render(){
    if (!listEl) return;
    var q = (searchInput.value || '').toLowerCase().trim();
    var filtered = COUNTRIES.filter(function(c){
      if (!q) return true;
      if (c.c.indexOf(q) > -1) return true;
      if (c.c.replace('+','').indexOf(q) > -1) return true;
      if (c.n.toLowerCase().indexOf(q) > -1) return true;
      if (c.en.toLowerCase().indexOf(q) > -1) return true;
      if (c.zh.indexOf(q) > -1) return true;
      return false;
    });
    if (!filtered.length){
      listEl.innerHTML = '<div class="phone-empty">Не найдено</div>';
      return;
    }
    listEl.innerHTML = filtered.map(function(c){
      var sel = (c.c === current.c && c.n === current.n) ? ' active' : '';
      var flagEmoji = flagFromISO(c.iso);
      return '<button type="button" class="phone-item'+sel+'" data-code="'+c.c+'" data-name="'+c.n+'" data-iso="'+c.iso+'">'
        + '<span class="phone-item-flag">'+flagEmoji+'</span>'
        + '<span class="phone-item-name">'+c.n+'</span>'
        + '<span class="phone-item-code">'+c.c+'</span>'
        + '</button>';
    }).join('');
  }

  function open(){
    dropdown.classList.remove('hidden');
    countryBtn.setAttribute('aria-expanded','true');
    searchInput.value = '';
    render();
    setTimeout(function(){ searchInput.focus(); }, 50);
  }

  function close(){
    dropdown.classList.add('hidden');
    countryBtn.setAttribute('aria-expanded','false');
  }

  function selectCountry(code, name){
    var found = COUNTRIES.find(function(c){ return c.c === code && c.n === name; })
             || COUNTRIES.find(function(c){ return c.c === code; });
    if (!found) return;
    current = found;
    countryFlag.textContent = flagFromISO(found.iso);
    countryCode.textContent = found.c;
    close();
    phoneInput.focus();
  }

  function init(){
    phoneField = document.getElementById('phoneField');
    countryBtn = document.getElementById('phoneCountryBtn');
    countryFlag = document.getElementById('phoneFlag');
    countryCode = document.getElementById('phoneCode');
    phoneInput = document.getElementById('requestPhone');
    dropdown = document.getElementById('phoneDropdown');
    searchInput = document.getElementById('phoneSearch');
    listEl = document.getElementById('phoneList');

    if (!phoneField || !countryBtn) return;
    countryFlag.textContent = flagFromISO(current.iso);

    countryBtn.addEventListener('click', function(e){
      e.preventDefault();
      if (dropdown.classList.contains('hidden')) open(); else close();
    });

    searchInput.addEventListener('input', render);

    listEl.addEventListener('click', function(e){
      var btn = e.target.closest('.phone-item');
      if (!btn) return;
      selectCountry(btn.getAttribute('data-code'), btn.getAttribute('data-name'));
    });

    document.addEventListener('click', function(e){
      if (!phoneField.contains(e.target)) close();
    });

    // Маска: только цифры, пробелы, дефисы, скобки
    phoneInput.addEventListener('input', function(){
      var v = phoneInput.value.replace(/[^\d\s\-()]/g, '');
      phoneInput.value = v;
    });

    // Экспортируем выбор страны наружу
    window.__iomaPhonePick = function(){ return { code: current.c, name: current.n, lengths: current.len }; };
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============ IOMA: расширенная форма заявки ============ */
(function(){
  if (window.__iomaRequestExtras) return;
  window.__iomaRequestExtras = true;

  var INCOTERM_CYCLE = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP'];
  var INCOTERM_HINTS = {
    'EXW': 'Самовывоз со склада поставщика',
    'FCA': 'Передача перевозчику',
    'FOB': 'Погрузка на судно в порту',
    'CIF': 'Стоимость, страхование и фрахт',
    'CPT': 'Перевозка оплачена до',
    'CIP': 'Перевозка и страхование оплачены',
    'DAP': 'Доставка в место назначения',
    'DPU': 'Доставка и разгрузка',
    'DDP': 'Доставка с оплатой пошлин'
  };

  var state = {
    incoterm: 'EXW',
    transit: '',
    dimUnit: 'cm'
  };

  var cycleTimer = null;
  var userTouchedIncoterm = false;

  function $(id){ return document.getElementById(id); }

  // ===== Incoterms =====
  function setIncoterm(code){
    if (!INCOTERM_HINTS[code]) return;
    state.incoterm = code;
    var v = $('incotermValue'); if (v) v.textContent = code;
    var h = $('incotermHint'); if (h) h.textContent = INCOTERM_HINTS[code];
  }

  function startIncotermCycle(){
    if (cycleTimer || userTouchedIncoterm) return;
    var idx = INCOTERM_CYCLE.indexOf(state.incoterm);
    if (idx < 0) idx = 0;
    cycleTimer = setInterval(function(){
      if (userTouchedIncoterm){ clearInterval(cycleTimer); cycleTimer = null; return; }
      idx = (idx + 1) % INCOTERM_CYCLE.length;
      setIncoterm(INCOTERM_CYCLE[idx]);
    }, 2000);
  }

  function stopIncotermCycle(){
    userTouchedIncoterm = true;
    if (cycleTimer){ clearInterval(cycleTimer); cycleTimer = null; }
  }

  function initIncoterm(){
    var btn = $('incotermBtn');
    var dd = $('incotermDropdown');
    if (!btn || !dd) return;

    startIncotermCycle();

    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var open = !dd.classList.contains('hidden');
      if (open){ dd.classList.add('hidden'); btn.setAttribute('aria-expanded','false'); }
      else { dd.classList.remove('hidden'); btn.setAttribute('aria-expanded','true'); }
    });

    dd.addEventListener('click', function(e){
      var item = e.target.closest('.incoterm-item');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      stopIncotermCycle();
      setIncoterm(item.getAttribute('data-code'));
      dd.classList.add('hidden');
      btn.setAttribute('aria-expanded','false');
    });

    document.addEventListener('click', function(e){
      if (!dd.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
        dd.classList.add('hidden');
        btn.setAttribute('aria-expanded','false');
      }
    });

    // При фокусе на поле — останавливаем
    btn.addEventListener('focus', stopIncotermCycle);
    btn.addEventListener('mouseenter', stopIncotermCycle);
  }

  // ===== Транзит =====
  function setTransit(code, hint){
    state.transit = code || '';
    var v = $('transitValue');
    var h = $('transitHint');
    if (v) v.textContent = code ? hint : 'не важно';
    if (h) h.textContent = code ? (code === 'express' ? 'Авиа / экспресс' : code === 'medium' ? 'Авто / ускоренно' : code === 'rail' ? 'Ж/Д контейнер' : 'Море / мультимодал') : 'Подберём оптимальный вариант';
  }

  function initTransit(){
    var btn = $('transitBtn');
    var dd = $('transitDropdown');
    if (!btn || !dd) return;

    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var open = !dd.classList.contains('hidden');
      if (open){ dd.classList.add('hidden'); btn.setAttribute('aria-expanded','false'); }
      else { dd.classList.remove('hidden'); btn.setAttribute('aria-expanded','true'); }
    });

    dd.addEventListener('click', function(e){
      var item = e.target.closest('.incoterm-item');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      var code = item.getAttribute('data-code');
      var hint = item.getAttribute('data-hint');
      setTransit(code, hint);
      dd.classList.add('hidden');
      btn.setAttribute('aria-expanded','false');
    });

    document.addEventListener('click', function(e){
      if (!dd.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
        dd.classList.add('hidden');
        btn.setAttribute('aria-expanded','false');
      }
    });
  }

  // ===== Единицы габаритов =====
  function setDimUnit(unit){
    state.dimUnit = unit;
    ['L','W','H'].forEach(function(k){
      var el = $('dimSuffix' + k);
      if (el) el.textContent = unit;
    });
    document.querySelectorAll('#dimUnitSwitch .unit-choice').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-unit') === unit);
    });
  }

  function initDimUnit(){
    var sw = $('dimUnitSwitch');
    if (!sw) return;
    sw.addEventListener('click', function(e){
      var btn = e.target.closest('.unit-choice');
      if (!btn) return;
      setDimUnit(btn.getAttribute('data-unit'));
    });
  }

  // ===== Сборка summary для отправки =====
  window.__iomaRequestBuildBody = function(){
    var parts = [];
    var from = ($('requestFrom') || {}).value || '';
    var to = ($('requestTo') || {}).value || '';
    if (from.trim()) parts.push('Откуда: ' + from.trim());
    if (to.trim()) parts.push('Куда: ' + to.trim());
    if (state.incoterm) parts.push('Условия: ' + state.incoterm);
    var w = ($('requestWeight') || {}).value || '';
    if (w) parts.push('Вес: ' + w + ' кг');
    var L = ($('requestDimL') || {}).value || '';
    var W = ($('requestDimW') || {}).value || '';
    var H = ($('requestDimH') || {}).value || '';
    if (L || W || H) parts.push('Габариты: ' + L + '×' + W + '×' + H + ' ' + state.dimUnit);
    if (state.transit){
      var map = {express:'3-7 дней (авиа)', medium:'10-20 дней (авто)', rail:'20-35 дней (Ж/Д)', sea:'35-60 дней (море)'};
      parts.push('Транзит: ' + (map[state.transit] || state.transit));
    }
    var comment = ($('requestBody') || {}).value || '';
    if (comment.trim()) parts.push('Комментарий: ' + comment.trim());
    return parts.join('\n');
  };

  function init(){
    initIncoterm();
    initTransit();
    initDimUnit();
    // Устанавливаем начальный Incoterm и подсказку
    setIncoterm('EXW');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============ FIX: переинициализация формы при открытии ============ */
(function(){
  if (window.__iomaFormFix) return;
  window.__iomaFormFix = true;

  function reinit(){
    // Проверяем, что кнопки на месте
    var btn = document.getElementById('incotermBtn');
    var dd = document.getElementById('incotermDropdown');
    if (!btn || !dd) return;
    // Убираем возможные дубликаты обработчиков
    if (btn.dataset.fixed === '1') return;
    btn.dataset.fixed = '1';
    // Ничего не навешиваем — полагаемся на __iomaRequestExtras
  }

  // Следим за открытием формы (MutationObserver на class у #requestView)
  var view = document.getElementById('requestView');
  if (view){
    var mo = new MutationObserver(function(){
      if (view.classList.contains('open') || !view.getAttribute('aria-hidden') || view.style.display !== 'none'){
        setTimeout(reinit, 50);
      }
    });
    mo.observe(view, { attributes:true, attributeFilter:['class','aria-hidden','style'] });
  }

  // Плюс при клике на плитку request
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-open-view="request"]');
    if (t) setTimeout(reinit, 100);
  }, true);
})();


/* ============ IOMA: метеориты в тёмной теме ============ */
(function(){
  if (window.__iomaMeteors) return;
  window.__iomaMeteors = true;

  function spawnMeteor(){
    if (!document.documentElement.classList.contains('dark')) return;
    var layer = document.getElementById('meteorsLayer');
    if (!layer) return;
    var m = document.createElement('i');
    m.className = 'meteor';
    m.style.left = (-5 + Math.random() * 85) + '%';
    m.style.top = (-15 + Math.random() * 20) + '%';
    var len = 120 + Math.random() * 180;
    m.style.height = len + 'px';
    var dur = 2.0 + Math.random() * 1.2;
    m.style.animationDuration = dur + 's';
    layer.appendChild(m);
    setTimeout(function(){ m.remove(); }, (dur + 0.5) * 1000);
    // Следующий метеор через 10-18 секунд
    setTimeout(spawnMeteor, 10000 + Math.random() * 8000);
  }

  // Первый через 3 секунды
  setTimeout(spawnMeteor, 3000);
})();
