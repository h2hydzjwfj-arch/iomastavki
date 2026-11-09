#!/usr/bin/env node
/* Сборка данных для глобуса на главной (globe-geo.js).

   Источник — Natural Earth 1:50m (общественное достояние, naturalearthdata.com):
     geojson/ne_50m_admin_0_countries.geojson, geojson/ne_50m_lakes.geojson
   Запуск: node tools/build-globe.js <папка natural-earth-vector/geojson> > globe-geo.js

   Координаты — долгота и широта (глобус крутится, проекция считается в браузере).
   Подробность разная: Россия, Китай и соседи по маршрутам — подробно, остальная Евразия — средне,
   остальной мир — грубо (его видно только когда глобус повёрнут далеко).
   Точки округлены до 1/20 градуса и записаны разностями — файл маленький. */
'use strict';
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '.';
const countries = JSON.parse(fs.readFileSync(path.join(dir, 'ne_50m_admin_0_countries.geojson'), 'utf8')).features;
const lakes = JSON.parse(fs.readFileSync(path.join(dir, 'ne_50m_lakes.geojson'), 'utf8')).features;

const Q = 20; // 1/20 градуса
const HOT = new Set(['RUS', 'CHN', 'MNG', 'KAZ', 'KOR', 'PRK', 'JPN', 'TWN', 'KGZ', 'UZB', 'BLR', 'HKG', 'MAC']);
const NEAR_CONT = new Set(['Asia', 'Europe']);
const EPS = [0.05, 0.12, 0.3], MIN_AREA = [0.02, 0.4, 3];

function sqSegDist(p, a, b) { let x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y; if (dx || dy) { const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy); if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; } } dx = p[0] - x; dy = p[1] - y; return dx * dx + dy * dy; }
function dp(pts, eps) { // Дуглас — Пекер
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]], e2 = eps * eps;
  while (st.length) { const [a, b] = st.pop(); let m = 0, idx = -1; for (let i = a + 1; i < b; i++) { const d = sqSegDist(pts[i], pts[a], pts[b]); if (d > m) { m = d; idx = i; } } if (m > e2) { keep[idx] = 1; st.push([a, idx], [idx, b]); } }
  return pts.filter((_, i) => keep[i]);
}
function area(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s / 2; } // >0 — по часовой (x вправо, y вверх)
function enc(ring) { // разности целых чисел
  let px = 0, py = 0; const out = [];
  ring.forEach(([lon, lat]) => { const x = Math.round(lon * Q), y = Math.round(lat * Q); if (out.length && x === px && y === py) return; out.push(x - px, y - py); px = x; py = y; });
  return out.join(',');
}
// d3 рисует сферу: внешнее кольцо — по часовой, дыры — против (иначе закрасится весь глобус)
function ringOut(r, outer) { const a = area(r); return (outer ? a > 0 : a < 0) ? r.slice().reverse() : r; }
function polys(geom) { return geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []; }

const out = [];
for (const f of countries) {
  const p = f.properties, iso = p.ADM0_A3, tier = HOT.has(iso) ? 0 : NEAR_CONT.has(p.CONTINENT) ? 1 : 2;
  if (p.CONTINENT === 'Antarctica') continue;
  const ps = [];
  for (const poly of polys(f.geometry)) {
    const rings = [];
    poly.forEach((ring, i) => {
      if (i === 0 && Math.abs(area(ring)) < MIN_AREA[tier]) return;
      if (i > 0 && (!rings.length || Math.abs(area(ring)) < MIN_AREA[tier])) return;
      let s = dp(ring, EPS[tier]); if (s.length < 4) return;
      rings.push(enc(ringOut(s, i === 0)));
    });
    if (rings.length) ps.push(rings.join(';'));
  }
  if (ps.length) out.push([iso, tier, ps.join('|')]);
}
const water = [];
for (const f of lakes) {
  const n = f.properties.name || f.properties.NAME || '';
  if (!/Baikal|Balkhash|Khanka|Ladoga|Onega/i.test(n)) continue;
  for (const poly of polys(f.geometry)) { const s = dp(poly[0], 0.05); if (s.length >= 4) water.push(enc(ringOut(s, true))); }
}
process.stdout.write('/* Глобус на главной: суша (Natural Earth 1:50m, общественное достояние). Сгенерировано tools/build-globe.js.\n' +
  '   c: [код страны, подробность 0–2, многоугольники через |, кольца через ;, точки — разности в 1/' + Q + ' градуса]. */\n' +
  'window.IOMA_GLOBE=' + JSON.stringify({ q: Q, c: out, lakes: water }) + ';\n');
