#!/usr/bin/env python3
"""Сборка карты для калькулятора на главной (geo-asia.js).

Источник — Natural Earth 1:50m (общественное достояние, naturalearthdata.com):
  geojson/ne_50m_admin_0_countries.geojson, geojson/ne_50m_lakes.geojson
Запуск: python3 tools/build-geo.py <папка natural-earth-vector> > geo-asia.js

Суша рисуется одним цветом. Границы показываем только там, где идут грузы:
Россия, Китай, Казахстан, Монголия, Корея и соседние им страны Центральной Азии.
Проекция — коническая равновеликая Альберса (как на настенных картах России).
"""
import json, math, sys, os

NE = sys.argv[1] if len(sys.argv) > 1 else '.'
LON0, LON1, LAT0, LAT1 = -20.0, 179.0, 0.0, 85.0         # что берём из мира (до рамки)
FRAME = (30.0, 30.0, 905.0, 525.0)                         # рамка карты в единицах проекции: от Балтики до Японии, от Арктики до Гонконга
P = dict(lon0=95.0, lat0=48.0, lat1=32.0, lat2=64.0)      # параметры проекции
W = 1000.0                                                 # ширина карты в единицах SVG

FOCUS = {'RUS', 'CHN', 'KAZ', 'MNG', 'PRK', 'KOR'}
PAIRS = {frozenset(p) for p in [('RUS', 'CHN'), ('RUS', 'KAZ'), ('RUS', 'MNG'), ('RUS', 'PRK'), ('CHN', 'MNG'), ('CHN', 'KAZ'),
                                ('CHN', 'PRK'), ('PRK', 'KOR'), ('KAZ', 'KGZ'), ('KAZ', 'UZB'), ('KAZ', 'TKM'), ('CHN', 'KGZ')]}

def albers(lon, lat):
    r = math.radians
    n = (math.sin(r(P['lat1'])) + math.sin(r(P['lat2']))) / 2
    C = math.cos(r(P['lat1'])) ** 2 + 2 * n * math.sin(r(P['lat1']))
    rho0 = math.sqrt(C - 2 * n * math.sin(r(P['lat0']))) / n
    rho = math.sqrt(C - 2 * n * math.sin(r(lat))) / n
    th = n * r(lon - P['lon0'])
    return rho * math.sin(th), rho0 - rho * math.cos(th)

def clip(ring):
    """Sutherland–Hodgman по прямоугольнику долгот/широт."""
    def cut(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            ia, ib = inside(a), inside(b)
            if ib:
                if not ia: out.append(inter(a, b))
                out.append(b)
            elif ia: out.append(inter(a, b))
        return out
    def ix(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))
    def iy(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)
    pts = [tuple(p[:2]) for p in ring]
    for inside, inter in [(lambda p: p[0] >= LON0, ix(LON0)), (lambda p: p[0] <= LON1, ix(LON1)),
                          (lambda p: p[1] >= LAT0, iy(LAT0)), (lambda p: p[1] <= LAT1, iy(LAT1))]:
        if not pts: break
        pts = cut(pts, inside, inter)
    return pts

def dp(pts, tol):
    """Дуглас — Пекер."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-12
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / L if (dx or dy) else math.hypot(px - ax, py - ay)
            if d > best: best, bi = d, i
        if best > tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(pts):
    return abs(sum(pts[i - 1][0] * pts[i][1] - pts[i][0] * pts[i - 1][1] for i in range(len(pts)))) / 2

def polys(geom):
    return geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]

countries = json.load(open(os.path.join(NE, 'geojson/ne_50m_admin_0_countries.geojson')))['features']
lakes = json.load(open(os.path.join(NE, 'geojson/ne_50m_lakes.geojson')))['features']

# масштаб: по углам области
corners = [albers(lo, la) for lo in [LON0, (LON0 + LON1) / 2, LON1] for la in [LAT0, 30, 50, LAT1]]
xs = [c[0] for c in corners]; ys = [c[1] for c in corners]
mnx, mxx = min(xs), max(xs)
# не тянем крайний восток и юг: рамка по Москве—Владивостоку с запасом
K = W / (mxx - mnx)
def to_svg(lon, lat):
    x, y = albers(lon, lat)
    return ((x - mnx) * K, (-y) * K)
allpts = [to_svg(lo, la) for lo in range(int(LON0), int(LON1) + 1, 2) for la in [LAT0, LAT1]]
miny = min(p[1] for p in allpts); maxy = max(p[1] for p in allpts)
def P2(lon, lat):
    x, y = to_svg(lon, lat); return (x, y - miny)
H = maxy - miny

TOL = 0.18
FX0, FY0, FX1, FY1 = FRAME
def fclip(pts):
    """Обрезка по рамке в координатах карты; лишнее за рамкой не попадает в файл."""
    M = 6
    def cut(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            ia, ib = inside(a), inside(b)
            if ib:
                if not ia: out.append(inter(a, b))
                out.append(b)
            elif ia: out.append(inter(a, b))
        return out
    def ix(x): return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))
    def iy(y): return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)
    for inside, inter in [(lambda p: p[0] >= FX0 - M, ix(FX0 - M)), (lambda p: p[0] <= FX1 + M, ix(FX1 + M)),
                          (lambda p: p[1] >= FY0 - M, iy(FY0 - M)), (lambda p: p[1] <= FY1 + M, iy(FY1 + M))]:
        if not pts: break
        pts = cut(pts, inside, inter)
    return [(x - FX0, y - FY0) for x, y in pts]
def ring_path(pts):
    return ''.join(('M' if i == 0 else 'L') + f'{x:.1f},{y:.1f}' for i, (x, y) in enumerate(pts)) + 'Z'

land = []
segs = {}   # сегмент (округлённые точки) -> множество стран
for f in countries:
    a3 = f['properties']['ADM0_A3']
    d = []
    for poly in polys(f['geometry']):
        for ri, ring in enumerate(poly):
            # границы: исходные (непрореженные) отрезки
            for i in range(1, len(ring)):
                p, q = tuple(round(v, 5) for v in ring[i - 1][:2]), tuple(round(v, 5) for v in ring[i][:2])
                if p == q: continue
                k = (p, q) if p < q else (q, p)
                segs.setdefault(k, set()).add(a3)
            c = clip(ring)
            if len(c) < 3: continue
            pts = fclip([P2(lo, la) for lo, la in c])
            if len(pts) < 3: continue
            pts = dp(pts + [pts[0]], TOL)[:-1]
            if len(pts) < 3 or area(pts) < (1.2 if ri == 0 else 0.6): continue
            d.append(ring_path(pts))
    if d: land.append([a3, ''.join(d)])

# границы между выбранными парами: собираем отрезки в ломаные
from collections import defaultdict
pair_segs = defaultdict(list)
for (p, q), owners in segs.items():
    if len(owners) == 2 and frozenset(owners) in PAIRS:
        pair_segs[frozenset(owners)].append((p, q))
borders = []
for pair, sl in pair_segs.items():
    adj = defaultdict(list)
    for p, q in sl: adj[p].append(q); adj[q].append(p)
    used = set()
    def ek(a, b): return (a, b) if a < b else (b, a)
    starts = [p for p in adj if len(adj[p]) != 2] + list(adj.keys())
    for s in starts:
        for nb in adj[s]:
            if ek(s, nb) in used: continue
            line = [s, nb]; used.add(ek(s, nb)); cur, prev = nb, s
            while True:
                nxt = [x for x in adj[cur] if ek(cur, x) not in used]
                if len(adj[cur]) != 2 or not nxt: break
                used.add(ek(cur, nxt[0])); line.append(nxt[0]); prev, cur = cur, nxt[0]
            pts = [(x - FX0, y - FY0) for x, y in (P2(lo, la) for lo, la in line) if FX0 - 6 <= x <= FX1 + 6 and FY0 - 6 <= y <= FY1 + 6]
            pts = dp(pts, TOL * 0.8)
            if len(pts) >= 2: borders.append(''.join(('M' if i == 0 else 'L') + f'{x:.1f},{y:.1f}' for i, (x, y) in enumerate(pts)))

lk = []
for f in lakes:
    for poly in polys(f['geometry']):
        c = clip(poly[0])
        if len(c) < 3: continue
        pts = fclip([P2(lo, la) for lo, la in c])
        if len(pts) < 3: continue
        pts = dp(pts, TOL)
        if len(pts) >= 3 and area(pts) > 2.5: lk.append(ring_path(pts))

out = {'w': FX1 - FX0, 'h': FY1 - FY0, 'proj': {**P, 'mnx': mnx, 'k': K, 'miny': miny, 'fx': FX0, 'fy': FY0},
       'land': land, 'borders': borders, 'lakes': ''.join(lk),
       'src': 'Natural Earth 1:50m (public domain)'}
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
print('/* Карта для калькулятора на главной. Сгенерировано tools/build-geo.py из Natural Earth 1:50m (общественное достояние). */')
print('window.IOMA_GEO=' + s + ';')
