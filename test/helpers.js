'use strict';
// Запуск настоящего сервера для проверок (CI). Пароль администратора — тестовый.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { hashPassword } = require('../portal');
const ADMIN_PASS = 'ci-admin-pass-123';
async function startServer(port) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ioma-e2e-'));
  const env = { ...process.env, PORT: String(port), DATA_DIR: dir, SESSION_SECRET: 'ci-secret-' + Date.now(), ADMIN_PASSWORD_HASH: hashPassword(ADMIN_PASS), SITE_URL: `http://localhost:${port}` };
  delete env.SUPABASE_URL; delete env.TELEGRAM_BOT_TOKEN; delete env.SMTP_URL; delete env.TELEGRAM_CHAT_ID;
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; proc.stdout.on('data', d => { log += d; }); proc.stderr.on('data', d => { log += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(base + '/api/health'); if (r.ok) return { base, proc, dir, log: () => log }; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  proc.kill(); throw new Error('Сервер не запустился:\n' + log);
}
module.exports = { startServer, ADMIN_PASS };
