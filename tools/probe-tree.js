const { nodes } = require('./build-tnved-base');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const get = u => fetch(u, { headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', 'Accept-Language': 'ru' } }).then(r => r.text());
(async () => {
  const a = await get('https://www.alta.ru/tnved/get_tree/?tncode=847130');
  const n = nodes(a); console.log('N', n.length); n.forEach(x => console.log('NODE', JSON.stringify(x).slice(0, 200)));
  const i = a.indexOf('8471'); console.log('RAW', a.slice(Math.max(0, i - 1500), i + 2500).replace(/\s+/g, ' '));
  const sec = n.find(x => x.raw === '84-85'); if (sec) { const b = await get('https://www.alta.ru/tnved/get_tree/?uin=' + sec.uin); console.log('CHILD-RAW', b.slice(0, 1500).replace(/\s+/g, ' ')); const b2 = await get('https://www.alta.ru/tnved/get_tree/?tncode=847130&uin=' + sec.uin); console.log('CHILD2-RAW', b2.slice(0, 1500).replace(/\s+/g, ' ')); }
})();
