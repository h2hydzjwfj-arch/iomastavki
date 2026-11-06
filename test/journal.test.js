'use strict';
// Журнал для администратора: запись, чтение по месяцу и выгрузка для Excel.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createJournal } = require('../journal');

test('журнал: каждое поле — в своей колонке, лишнее отбрасывается', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jr-'));
  const j = createJournal(dir, null);
  j.add('calc', { role: 'guest', from: 'Иу', to: 'Москва', weight: 400, price: 560, currency: 'USD', secret: 'нельзя', result: 'Авто: 560 $' });
  j.add('lead', { role: 'guest', name: 'Сергей', contact: '@sergey', from: 'Иу\n', comment: 'x'.repeat(3000) });
  assert.strictEqual(j.add('unknown', {}), null);
  const items = await j.list();
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].type, 'lead'); // новые сверху
  assert.strictEqual(items[1].weight, 400); assert.strictEqual(items[1].secret, undefined);
  assert.strictEqual(items[0].from, 'Иу'); assert.ok(items[0].comment.length <= 1500);
  const csv = j.csv(items);
  assert.ok(csv.charCodeAt(0) === 0xFEFF, 'BOM для Excel');
  assert.ok(/^﻿Дата и время;Действие;Кто;/.test(csv));
  assert.ok(/;Расчёт;Гость;/.test(csv) && /;Иу;Москва;400;/.test(csv));
  await j.flush();
  const saved = fs.readdirSync(path.join(dir, 'journal')); assert.ok(saved.some(f => /^\d{4}-\d{2}\.json$/.test(f)), 'месяц не сохранился: ' + saved);
  const j2 = createJournal(dir, null); assert.strictEqual((await j2.list()).length, 2, 'после перезапуска журнал пуст');
});
