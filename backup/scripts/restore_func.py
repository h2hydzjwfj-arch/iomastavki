import re

p = 'app.js'
s = open(p, 'r', encoding='utf-8').read()

# Проверяем наличие
has = 'function updateCityPlaceholders' in s
print('Функция updateCityPlaceholders: ' + ('✅ есть' if has else '❌ нет'))

if not has:
    # Вставляем перед функцией loadRates (или перед applyLang)
    anchor = s.find('async function loadRates(')
    if anchor < 0:
        anchor = s.find('function loadRates(')
    if anchor < 0:
        anchor = s.find('function setTheme(')
    if anchor < 0:
        anchor = s.find('const views=')
    if anchor < 0:
        anchor = s.find('function showView(')
    if anchor < 0:
        print('❌ anchor не найден')
        exit()
    
    block = '''function updateCityPlaceholders(){
  const examples = {
    ru: [['Пекин','Шанхай','Нинбо','Гуанчжоу'],['Москва','Санкт-Петербург','Екатеринбург','Новосибирск']],
    en: [['Beijing','Shanghai','Ningbo','Guangzhou'],['Moscow','Saint Petersburg','Yekaterinburg','Novosibirsk']],
    tr: [['Pekin','Şanghay','Ningbo','Guangzhou'],['Moskova','St Petersburg','Yekaterinburg','Novosibirsk']],
    zh: [['北京','上海','宁波','广州'],['莫斯科','圣彼得堡','叶卡捷琳堡','新西伯利亚']]
  };
  const arr = examples[lang] || examples.ru;
  let i = 0;
  clearInterval(window.cityPlaceholderTimer);
  const tick = function(){
    const fromEl = document.getElementById('fromCity');
    const toEl = document.getElementById('toCity');
    if (fromEl && !fromEl.value) fromEl.placeholder = arr[0][i % arr[0].length];
    if (toEl && !toEl.value) toEl.placeholder = arr[1][i % arr[1].length];
    i++;
  };
  tick();
  window.cityPlaceholderTimer = setInterval(tick, 2000);
}

'''
    s = s[:anchor] + block + s[anchor:]
    print('OK: функция добавлена перед ' + str(anchor))
else:
    print('OK: функция уже есть')

# Защитный вызов — не падать если функции нет
# Находим "updateCityPlaceholders();" в конце файла и делаем безопасным
s = s.replace('updateCityPlaceholders();',
              'if (typeof updateCityPlaceholders === "function") updateCityPlaceholders();')

# И в applyLang — тоже защитный вызов
s = s.replace(' updateCityPlaceholders();',
              ' if (typeof updateCityPlaceholders === "function") updateCityPlaceholders();')

open(p, 'w', encoding='utf-8').write(s)
print('OK: защитные вызовы добавлены')
print('==== app.js готов ====')

# Версия
p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>77', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>77', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html → v77')
print('===== ГОТОВО =====')
