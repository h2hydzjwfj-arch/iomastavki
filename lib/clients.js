// lib/clients.js — работа с клиентами личного кабинета
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, '..', 'data', 'clients.json');

function load() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const arr = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch (e) { console.error('[clients] load:', e.message); return []; }
}

function save(list) {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(String(pw), salt, 32, { N, r, p, maxmem: 64*1024*1024 });
  return ['scrypt', N, r, p, salt.toString('hex'), hash.toString('hex')].join('$');
}

function verifyPassword(pw, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  try {
    const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
    const salt = Buffer.from(parts[4], 'hex');
    const expected = Buffer.from(parts[5], 'hex');
    const actual = crypto.scryptSync(String(pw), salt, expected.length, { N, r, p, maxmem: 64*1024*1024 });
    return crypto.timingSafeEqual(actual, expected);
  } catch (e) { return false; }
}

function findByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  return load().find(c => String(c.email || '').toLowerCase() === e) || null;
}

function findById(id) {
  if (!id) return null;
  return load().find(c => String(c.id) === String(id)) || null;
}

function createClient({ email, name, password }) {
  const e = String(email || '').trim().toLowerCase();
  const n = String(name || '').trim();
  if (!e) throw new Error('email required');
  if (!password || String(password).length < 6) throw new Error('password too short (min 6)');
  if (findByEmail(e)) throw new Error('email already exists');
  const list = load();
  const client = {
    id: 'c_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
    email: e,
    name: n || e,
    passHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    active: true
  };
  list.push(client);
  save(list);
  return client;
}

function verifyClient(email, password) {
  const c = findByEmail(email);
  if (!c || !c.active) return null;
  if (!verifyPassword(password, c.passHash)) return null;
  return c;
}

function listClients() {
  return load().map(c => ({ id: c.id, email: c.email, name: c.name, createdAt: c.createdAt, active: c.active }));
}

module.exports = { load, save, findByEmail, findById, createClient, verifyClient, listClients, hashPassword, verifyPassword };
