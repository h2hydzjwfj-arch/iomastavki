const B = require('./build-tnved-base');
(async () => {
  const root = B.nodes(await B.get('https://www.alta.ru/tnved/get_tree/'));
  console.log('ROOT', root.length, JSON.stringify(root.slice(14, 16)));
  const sec = root.find(n => n.raw === '84-85');
  const g = B.nodes(await B.get('https://www.alta.ru/tnved/get_tree/?uin=' + sec.uin)); console.log('GROUPS', JSON.stringify(g));
  const h = B.nodes(await B.get('https://www.alta.ru/tnved/get_tree/?uin=' + g[0].uin)); console.log('HEADINGS', h.length, JSON.stringify(h.slice(60, 75)));
  const raw = await B.get('https://www.alta.ru/tnved/get_tree/?uin=' + g[0].uin); const i = raw.indexOf('8471'); console.log('RAWH', raw.slice(i - 300, i + 600).replace(/\s+/g, ' '));
  console.log('HEADING', JSON.stringify(await B.heading('8471')));
  console.log('LEAVES', JSON.stringify(await B.leavesUnder('847130', 3)), JSON.stringify(await B.leavesUnder('8458', 4)));
})().catch(e => console.log('ERR', e));
