
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const RATES_FILE = path.join(DATA_DIR, 'rates.json');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const fallbackHash = 'scrypt$16384$8$1$bd186dac2105a3d050c5f769e28d25a2$51e731def6ff02e823b43cb8cfce55adcad745c5c72935ce68d875f583096288';

function safeReadRates() {
  try {
    return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveRates(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RATES_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function makeToken() {
  const secret = process.env.SESSION_SECRET || 'change-this-session-secret';
  return crypto.createHmac('sha256', secret).update(crypto.randomBytes(32)).digest('hex');
}
function verifyPassword(password) {
  const raw = process.env.ADMIN_PASSWORD_HASH || fallbackHash;
  const p = raw.split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  const N = Number(p[1]), r = Number(p[2]), salt = Buffer.from(p[4], 'hex'), expected = p[5];
  try {
    const actual = crypto.scryptSync(String(password), salt, 32, { N, r, p: Number(p[3]), maxmem: 64 * 1024 * 1024 }).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}
function auth(req, res, next) {
  if (req.cookies?.auth === '1') return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

app.get('/', (req,res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/app.js', (req,res) => res.sendFile(path.join(ROOT, 'app.js')));
app.get('/styles.css', (req,res) => res.sendFile(path.join(ROOT, 'styles.css')));
app.get('/api/health', (req,res) => res.json({ ok: true }));
app.get('/api/config', (req,res) => res.json({ weatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY) }));
app.get('/api/weather', async (req,res) => {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(503).json({ok:false,error:'Weather key not configured'});
  try {
    const u = `https://api.openweathermap.org/data/2.5/weather?lat=55.7558&lon=37.6173&appid=${encodeURIComponent(key)}&units=metric`;
    const r = await fetch(u);
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ok:false,error:d.message||'weather error'});
    res.json({ok:true, main:d.weather?.[0]?.main || 'Clear', description:d.weather?.[0]?.description || ''});
  } catch(e) { res.status(502).json({ok:false,error:'weather unavailable'}); }
});

app.post('/api/login', (req,res) => {
  if (!verifyPassword(req.body?.password || '')) return res.status(401).json({ ok:false, error:'Неверный пароль' });
  res.cookie('auth', '1', { httpOnly:true, secure:true, sameSite:'lax', maxAge:8*60*60*1000, path:'/' });
  res.json({ ok:true });
});
app.post('/api/logout', (req,res) => {
  res.clearCookie('auth', { httpOnly:true, secure:true, sameSite:'lax', path:'/' });
  res.json({ ok:true });
});
app.get('/api/me', auth, (req,res) => res.json({ ok:true }));
app.get('/api/rates', auth, (req,res) => res.json(safeReadRates()));
app.put('/api/rates', auth, (req,res) => {
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ok:false,error:'Некорректные данные'});
  saveRates(data);
  res.json({ok:true});
});

app.listen(PORT, () => console.log(`iomastavka listening on ${PORT}`));
