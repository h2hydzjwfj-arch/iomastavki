import re

# ==================== 1. INDEX.HTML — добавляем дату к курсу ====================
p = 'index.html'
s = open(p, 'r', encoding='utf-8').read()

old_currency = '<div class="home-currency"><span data-i18n="currencyCny">CNY</span><b id="homeCny">12.535</b><span data-i18n="currencyUsd">USD</span><b id="homeUsd">84.336</b><span data-i18n="currencyEur">EUR</span><b id="homeEur">97.763</b></div>'

new_currency = '<div class="home-currency"><span class="home-currency-date" id="homeCurrencyDate">19.09.2026</span><span data-i18n="currencyCny">CNY</span><b id="homeCny">12.535</b><span data-i18n="currencyUsd">USD</span><b id="homeUsd">84.336</b><span data-i18n="currencyEur">EUR</span><b id="homeEur">97.763</b></div>'

if old_currency in s:
    s = s.replace(old_currency, new_currency)
    print('OK: index.html — добавлена дата курса')
else:
    # Пробуем найти вариацию
    m = re.search(r'<div class="home-currency">[\s\S]*?</div>', s)
    if m:
        s = s[:m.start()] + new_currency + s[m.end():]
        print('OK: index.html — home-currency заменён (regex)')
    else:
        print('⚠️ не нашёл home-currency в index.html')

open(p, 'w', encoding='utf-8').write(s)

# ==================== 2. APP.JS — обновляем дату + улучшаем картинки ====================
p2 = 'app.js'
s2 = open(p2, 'r', encoding='utf-8').read()

# 2.1 Заполняем homeCurrencyDate в loadCurrency
old_load = "const paint=(items)=>{const fmt=x=>x==null?'—':fmtNum(x);if(items?.USD?.value!=null){$('#usdRate').textContent=fmt(items.USD.value);$('#homeUsd').textContent=fmt(items.USD.value)}if(items?.EUR?.value!=null){$('#eurRate').textContent=fmt(items.EUR.value);$('#homeEur').textContent=fmt(items.EUR.value)}if(items?.CNY?.value!=null){$('#cnyRate').textContent=fmt(items.CNY.value);$('#homeCny').textContent=fmt(items.CNY.value)}};"

new_load = "const paint=(items)=>{const fmt=x=>x==null?'—':fmtNum(x);const dateStr=formatToday();const dateShort=dateStr.replace(' г.','');if($('#homeCurrencyDate'))$('#homeCurrencyDate').textContent=dateShort;if(items?.USD?.value!=null){$('#usdRate').textContent=fmt(items.USD.value);$('#homeUsd').textContent=fmt(items.USD.value)}if(items?.EUR?.value!=null){$('#eurRate').textContent=fmt(items.EUR.value);$('#homeEur').textContent=fmt(items.EUR.value)}if(items?.CNY?.value!=null){$('#cnyRate').textContent=fmt(items.CNY.value);$('#homeCny').textContent=fmt(items.CNY.value)}};"

if old_load in s2:
    s2 = s2.replace(old_load, new_load)
    print('OK: loadCurrency — дата подставляется')
else:
    # Regex-замена
    m = re.search(r"const paint=\(items\)=>\{[\s\S]*?\};", s2)
    if m:
        s2 = s2[:m.start()] + new_load + s2[m.end():]
        print('OK: loadCurrency — paint заменён (regex)')
    else:
        print('⚠️ не нашёл paint в loadCurrency')

# 2.2 Обновляем дату при смене языка
if "$$('.lang').forEach(b=>b.onclick=" in s2:
    s2 = re.sub(
        r"(\$\$\('\.lang'\)\.forEach\(b=>b\.onclick=[\s\S]*?applyLang\(\);)", 
        r"\1\n  try{ if($('#homeCurrencyDate')) $('#homeCurrencyDate').textContent=formatToday().replace(' г.',''); }catch(e){}\n  loadCurrency();",
        s2, count=1
    )
    print('OK: при смене языка — обновляем дату')

open(p2, 'w', encoding='utf-8').write(s2)

# ==================== 3. STYLES.CSS — стиль даты ====================
p3 = 'styles.css'
s3 = open(p3, 'r', encoding='utf-8').read()

if 'v97: currency date' not in s3:
    s3 += '''

/* v97: дата курса на главной */
.home-currency-date{
  display: inline-block;
  padding: 3px 8px;
  margin-right: 10px;
  border-radius: 8px;
  background: rgba(40,127,168,.1);
  color: #287fa8;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .3px;
}
body.manual-dark .home-currency-date{
  background: rgba(90,180,210,.18);
  color: #a3dbf0;
}

/* v97: карточки новостей — картинка больше, чтобы лучше передавала тему */
.news-card-img{ aspect-ratio: 16/9 !important; }
.news-card-img img{
  filter: saturate(1.08) contrast(1.03);
}
.news-card-title{ font-weight: 600 !important; }
'''
    open(p3, 'w', encoding='utf-8').write(s3)
    print('OK: styles.css — стиль даты')

# ==================== 4. SERVER.JS — улучшенный подбор картинок ====================
p4 = 'server.js'
s4 = open(p4, 'r', encoding='utf-8').read()

# Проверяем, что fetchPexelsImage существует и возвращает разнообразие
if 'function fetchPexelsImage' in s4:
    # Обновляем defaultImgQuery чтобы подбирать точнее
    old_fn = re.search(r'function defaultImgQuery\(title\)\{[\s\S]*?\n\}', s4)
    if old_fn:
        new_fn = '''function defaultImgQuery(title){
  const t = String(title||'').toLowerCase();
  // Точный подбор по теме новости
  if (/таможен|пошлин|декларац|фтс|еэк|вэд|тн.?вэд|сертифик/.test(t)) return 'customs documents';
  if (/маркиров|честный знак/.test(t)) return 'product marking';
  if (/нефт|газ|barrel|oil|tanker/.test(t)) return 'oil tanker ship';
  if (/железнодорож|жд|rail|поезд/.test(t)) return 'freight train railway';
  if (/мор|порт|судно|контейнер|ship|port|container/.test(t)) return 'container ship port';
  if (/авиа|самолёт|air|flight|cargo plane/.test(t)) return 'cargo airplane';
  if (/грузовик|авто|truck|road/.test(t)) return 'cargo truck highway';
  if (/китай|china/.test(t)) return 'china logistics warehouse';
  if (/индия|india/.test(t)) return 'india port logistics';
  if (/корея|korea|япония|japan/.test(t)) return 'asia port city';
  if (/склад|warehouse|логист/.test(t)) return 'warehouse logistics';
  if (/автомобил|машин|car/.test(t)) return 'car transport ship';
  if (/рыба|fish|сельхоз|agro|food/.test(t)) return 'food cargo shipping';
  if (/импорт|экспорт|import|export/.test(t)) return 'cargo shipping logistics';
  return 'cargo logistics';
}'''
        s4 = s4[:old_fn.start()] + new_fn + s4[old_fn.end():]
        print('OK: defaultImgQuery — точный подбор картинок')

open(p4, 'w', encoding='utf-8').write(s4)

# Версия
s = open(p, 'r', encoding='utf-8').read()
s = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>97', s)
s = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>97', s)
open(p, 'w', encoding='utf-8').write(s)
print('OK: index.html → v97')
print('===== ГОТОВО =====')
