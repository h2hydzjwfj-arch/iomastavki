'use strict';
/**
 * OpenWeather "Current weather" (free 2.5 API) -> compact object for the background engine.
 * `kind` is what the front-end draws: clear | clouds | rain | drizzle | storm | snow | fog
 */
const MOSCOW = { lat: 55.7558, lon: 37.6173, name: 'Москва' };
const cache = new Map();
const TTL = 10 * 60 * 1000;

function kindOf(id, main) {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id >= 500 && id < 600) return id >= 520 ? 'rain' : 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'fog';
  if (id === 800) return 'clear';
  if (id > 800) return 'clouds';
  return String(main || 'clear').toLowerCase();
}

/** Rough precipitation intensity 0..1 from OpenWeather condition id (and rain.1h when present). */
function intensityOf(id, mm) {
  if (Number.isFinite(mm) && mm > 0) return Math.max(0.15, Math.min(1, mm / 8));
  const t = { 200: .6, 201: .8, 202: 1, 210: .3, 211: .5, 212: .8, 221: .6, 230: .4, 231: .5, 232: .7, 300: .15, 301: .25, 302: .4, 310: .2, 311: .3, 312: .5, 313: .5, 314: .7, 321: .4, 500: .3, 501: .55, 502: .8, 503: 1, 504: 1, 511: .5, 520: .5, 521: .7, 522: .95, 531: .8, 600: .3, 601: .6, 602: 1, 611: .5, 612: .5, 613: .6, 615: .4, 616: .6, 620: .4, 621: .6, 622: .9 };
  return t[id] !== undefined ? t[id] : 0.5;
}

function normalize(d) {
  const w = (d.weather && d.weather[0]) || {};
  const rainMm = (d.rain && (d.rain['1h'] || d.rain['3h'])) || 0;
  const snowMm = (d.snow && (d.snow['1h'] || d.snow['3h'])) || 0;
  const kind = kindOf(w.id, w.main);
  return {
    ok: true,
    kind,
    id: w.id,
    main: w.main || '',
    description: w.description || '',
    icon: w.icon || '',
    temp: d.main ? d.main.temp : null,
    feels: d.main ? d.main.feels_like : null,
    humidity: d.main ? d.main.humidity : null,
    clouds: d.clouds ? d.clouds.all : 0,
    wind: d.wind ? d.wind.speed : 0,
    windDeg: d.wind ? d.wind.deg : 0,
    gust: d.wind ? d.wind.gust : 0,
    visibility: d.visibility,
    intensity: (kind === 'rain' || kind === 'drizzle' || kind === 'storm' || kind === 'snow') ? intensityOf(w.id, rainMm || snowMm) : 0,
    sunrise: d.sys ? d.sys.sunrise : 0,
    sunset: d.sys ? d.sys.sunset : 0,
    city: d.name || '',
    country: d.sys ? d.sys.country : '',
    lat: d.coord ? d.coord.lat : null,
    lon: d.coord ? d.coord.lon : null,
    dt: d.dt
  };
}

async function getWeather(lat, lon, key, lang) {
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { lat = MOSCOW.lat; lon = MOSCOW.lon; }
  const ck = lat.toFixed(1) + ',' + lon.toFixed(1) + ',' + (lang || 'ru');
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const url = 'https://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&units=metric&lang=' + encodeURIComponent(lang || 'ru') + '&appid=' + encodeURIComponent(key);
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    if (hit) return hit.data; // stale is better than nothing
    const e = new Error('OpenWeather HTTP ' + r.status); e.status = r.status; throw e;
  }
  const data = normalize(await r.json());
  cache.set(ck, { at: Date.now(), data });
  return data;
}

module.exports = { getWeather, normalize, kindOf, MOSCOW };
