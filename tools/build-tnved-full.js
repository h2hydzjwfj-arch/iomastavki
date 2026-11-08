#!/usr/bin/env node
// Полный справочник ТН ВЭД ЕАЭС из таблицы владельца (CSV «Код ТН ВЭД;Наименование;Пошлина»)
// → reference/tnved-full.json.gz: [[код, наименование, пошлина], …]. Только открытые данные тарифа, без клиентов и цен.
// Запуск: node tools/build-tnved-full.js путь/к/файлу.csv
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { csvRows, rowsToRecords } = require('../tnved');
const src = process.argv[2]; if (!src) { console.error('Укажите CSV'); process.exit(1); }
const recs = rowsToRecords(csvRows(fs.readFileSync(src, 'utf8').replace(/^﻿/, '')));
const codes = recs.filter(r => /^\d{10}$/.test(r.code)).map(r => [r.code, String(r.name || '').replace(/\s*🠺\s*/g, ' → ').replace(/:\s*→/g, ' →').trim(), String(r.duty || '').trim()]).sort((a, b) => a[0].localeCompare(b[0]));
const out = { version: 1, source: 'Справочник ТН ВЭД ЕАЭС владельца сайта', builtAt: new Date().toISOString().slice(0, 10), count: codes.length,
  note: 'Ставки пошлины на дату выгрузки. НДС в таблице нет — общая ставка 22%, льготная 10% для отдельных товаров. Перед декларированием сверяйтесь с действующим тарифом.', codes };
const file = path.join(__dirname, '..', 'reference', 'tnved-full.json.gz');
fs.writeFileSync(file, zlib.gzipSync(Buffer.from(JSON.stringify(out)), { level: 9 }));
console.log('кодов:', codes.length, '→', file, Math.round(fs.statSync(file).size / 1024) + ' КБ');
