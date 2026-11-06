'use strict';
// Постоянное хранение в Supabase Storage (бесплатно). Нужны две переменные в Render:
//   SUPABASE_URL          — https://<проект>.supabase.co
//   SUPABASE_SERVICE_KEY  — ключ service_role (секретный, только на сервере)
// Таблицы создавать не нужно: сайт сам создаёт закрытое хранилище (bucket) и кладёт туда
// состояние (клиенты, грузы, заявки), ставки, агентов и документы.
const fs = require('fs');
const path = require('path');

// Принимаем и распространённые варианты имён переменных (как их называет Supabase или другие инструкции).
const URL_NAMES = ['SUPABASE_URL', 'SUPABASE_PROJECT_URL', 'SUPABASE_API_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const KEY_NAMES = ['SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE', 'SUPABASE_SECRET_KEY', 'SUPABASE_SECRET', 'SUPABASE_KEY'];
const pick = (env, names) => { for (const n of names) { const v = String(env[n] || '').trim(); if (v) return v; } return ''; };
// Адрес: допускаем хвосты вроде /rest/v1 и косую черту в конце — берём только https://<проект>.supabase.co
function supabaseUrl(env = process.env) { const v = pick(env, URL_NAMES).replace(/\s/g, ''); const m = v.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i); return m ? 'https://' + m[1].toLowerCase() + '.supabase.' + m[2].toLowerCase() : v.replace(/\/+$/, ''); }
function supabaseKey(env = process.env) { return pick(env, KEY_NAMES); }
// Имена (без значений) переменных со словом SUPABASE — чтобы подсказать, что не так
function supabaseVarNames(env = process.env) { return Object.keys(env).filter(k => /SUPABASE/i.test(k) && String(env[k] || '').trim()).sort(); }

function createCloud(env = process.env) {
  const url = supabaseUrl(env);
  const key = supabaseKey(env);
  if (!url || !key) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) { console.error('SUPABASE_URL должен выглядеть как https://xxxx.supabase.co'); return null; }
  const bucket = String(env.SUPABASE_BUCKET || 'iomastavka').replace(/[^a-z0-9_-]/gi, '') || 'iomastavka';
  const enc = p => String(p).split('/').map(encodeURIComponent).join('/');

  async function call(method, p, body, headers = {}) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      return await fetch(url + p, { method, body, signal: ctrl.signal, headers: { Authorization: 'Bearer ' + key, apikey: key, ...headers } });
    } finally { clearTimeout(t); }
  }
  async function ensureBucket() {
    const r = await call('POST', '/storage/v1/bucket', JSON.stringify({ id: bucket, name: bucket, public: false }), { 'Content-Type': 'application/json' });
    if (r.ok) return true;
    const txt = await r.text().catch(() => '');
    if (/already exists|duplicate|409/i.test(txt) || r.status === 409) return true;
    throw new Error('Supabase: не удалось создать хранилище (' + r.status + ') ' + txt.slice(0, 200));
  }
  async function get(name) {
    const r = await call('GET', `/storage/v1/object/${bucket}/${enc(name)}`);
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (r.status === 404 || r.status === 400) return null;
    throw new Error('Supabase get ' + r.status);
  }
  async function put(name, data, contentType = 'application/octet-stream') {
    const r = await call('POST', `/storage/v1/object/${bucket}/${enc(name)}`, data, { 'Content-Type': contentType, 'x-upsert': 'true' });
    if (!r.ok) throw new Error('Supabase put ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200));
    return true;
  }
  async function del(name) {
    const r = await call('DELETE', `/storage/v1/object/${bucket}`, JSON.stringify({ prefixes: [name] }), { 'Content-Type': 'application/json' });
    if (!r.ok && r.status !== 404) throw new Error('Supabase delete ' + r.status);
    return true;
  }
  // Файлы из DATA_DIR (ставки, агенты): при запуске — скачать, при изменении — загрузить.
  async function syncFiles(dir, names, intervalMs = 15000) {
    fs.mkdirSync(dir, { recursive: true });
    const seen = {};
    for (const n of names) {
      const f = path.join(dir, n);
      try {
        const remote = await get('state/' + n);
        if (remote) fs.writeFileSync(f, remote);
        else if (fs.existsSync(f)) await put('state/' + n, fs.readFileSync(f), 'application/json');
      } catch (e) { console.error('sync', n, e.message); }
      try { seen[n] = fs.statSync(f).mtimeMs; } catch { seen[n] = 0; }
    }
    const timer = setInterval(async () => {
      for (const n of names) {
        const f = path.join(dir, n); let m = 0;
        try { m = fs.statSync(f).mtimeMs; } catch { continue; }
        if (m !== seen[n]) { try { await put('state/' + n, fs.readFileSync(f), 'application/json'); seen[n] = m; } catch (e) { console.error('sync up', n, e.message); } }
      }
    }, intervalMs);
    timer.unref && timer.unref();
  }
  return { kind: 'supabase', bucket, ensureBucket, get, put, del, syncFiles };
}
module.exports = { supabaseUrl, supabaseKey, supabaseVarNames, URL_NAMES, KEY_NAMES, createCloud };
