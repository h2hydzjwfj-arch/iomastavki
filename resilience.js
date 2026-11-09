'use strict';
/*
 * Отказоустойчивость сервера: проверка переменных окружения, глобальный перехват ошибок,
 * «предохранитель» для ИИ и пинг, чтобы Render не усыплял сервис.
 *
 * Ничего из этого не печатает значения ключей — только «задан / не задан / похоже на ошибку».
 */

// ---------------------------------------------------------------- переменные окружения

/** Что сервер ждёт от окружения. kind: required — без неё часть сайта не работает; optional — включает функцию. */
const ENV_SPEC = [
  { name: 'SESSION_SECRET', kind: 'required', what: 'подпись входа', check: v => v.length >= 32, hint: 'не короче 32 символов' },
  { name: 'ADMIN_PASSWORD_HASH', kind: 'optional', what: 'пароль администратора (хеш)', alt: ['ADMIN_PASSWORD'] },
  { name: 'OPENAI_API_KEY', kind: 'optional', what: 'ИИ-ассистент и разбор документов', check: v => /^sk-[\w-]{20,}$/.test(v), hint: 'ключ OpenAI начинается с sk-' },
  { name: 'TELEGRAM_BOT_TOKEN', kind: 'optional', what: 'Telegram-бот', check: v => /^\d{5,}:[\w-]{30,}$/.test(v), hint: 'формат 123456789:AA…' },
  { name: 'TELEGRAM_WEBHOOK_SECRET', kind: 'optional', what: 'приём сообщений ботом', check: v => /^[\w-]{16,256}$/.test(v), hint: 'буквы, цифры, _ и -, от 16 символов', needs: 'TELEGRAM_BOT_TOKEN' },
  { name: 'SUPABASE_URL', kind: 'optional', what: 'постоянное хранилище', alt: ['SUPABASE_PROJECT_URL', 'SUPABASE_API_URL', 'NEXT_PUBLIC_SUPABASE_URL'], check: v => /^https:\/\/[\w.-]+$/.test(v.replace(/\/+$/, '')), hint: 'https://<проект>.supabase.co', pair: 'SUPABASE_SERVICE_KEY' },
  { name: 'SUPABASE_SERVICE_KEY', kind: 'optional', what: 'постоянное хранилище', alt: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE', 'SUPABASE_SECRET_KEY', 'SUPABASE_SECRET', 'SUPABASE_KEY'], pair: 'SUPABASE_URL' },
  { name: 'RESEND_API_KEY', kind: 'optional', what: 'отправка писем', alt: ['SMTP_URL'] },
  { name: 'SITE_URL', kind: 'optional', what: 'адрес сайта в ссылках и вебхуке', check: v => /^https?:\/\/[^\s/]+/.test(v), hint: 'https://…' },
];

/**
 * Проверяет process.env и возвращает сводку { ok, items: [{ name, state, what, hint }], flags }.
 * state: set | alt | missing | invalid. Значения не возвращаются и не печатаются.
 */
function checkEnv(env) {
  env = env || process.env;
  const items = ENV_SPEC.map(s => {
    const raw = env[s.name]; const v = typeof raw === 'string' ? raw.trim() : '';
    const altValue = (s.alt || []).map(a => String(env[a] || '').trim()).find(Boolean) || '';
    const effective = v || altValue;
    let state = v ? 'set' : (altValue ? 'alt' : 'missing');
    if (effective && s.check && !s.check(effective)) state = 'invalid';
    return { name: s.name, kind: s.kind, state, what: s.what, hint: state === 'invalid' ? s.hint : '' };
  });
  const val = n => String(env[n] || '').trim();
  const spec = n => ENV_SPEC.find(x => x.name === n);
  const isSet = s => !!s && [s.name, ...(s.alt || [])].some(n => !!val(n));
  const problems = [];
  for (const s of ENV_SPEC) {
    const it = items.find(i => i.name === s.name);
    if (s.kind === 'required' && it.state !== 'set') problems.push(`${s.name}: ${it.state === 'invalid' ? 'неверный формат (' + s.hint + ')' : 'не задана'} — ${s.what}`);
    else if (it.state === 'invalid') problems.push(`${s.name}: похоже на ошибку (${s.hint}) — ${s.what}`);
    if (s.pair && isSet(s) && !isSet(spec(s.pair))) problems.push(`${s.name} задана, а ${s.pair} — нет: ${s.what} не включится`);
    if (s.needs && isSet(s) && !isSet(spec(s.needs))) problems.push(`${s.name} без ${s.needs} не нужна`);
  }
  const flags = {
    ai: !!val('OPENAI_API_KEY'),
    telegram: !!val('TELEGRAM_BOT_TOKEN'),
    telegramWebhook: !!(val('TELEGRAM_BOT_TOKEN') && val('TELEGRAM_WEBHOOK_SECRET')),
    storage: !!(isSet(spec('SUPABASE_URL')) && isSet(spec('SUPABASE_SERVICE_KEY'))),
    mail: !!(val('RESEND_API_KEY') || val('SMTP_URL')),
  };
  return { ok: !problems.length, problems, items, flags };
}

function logEnv(log, env) {
  log = log || console;
  const r = checkEnv(env);
  const on = k => (r.flags[k] ? 'да' : 'нет');
  log.log(`Окружение: ИИ — ${on('ai')}, Telegram — ${on('telegram')} (вебхук — ${on('telegramWebhook')}), Supabase — ${on('storage')}, почта — ${on('mail')}`);
  for (const p of r.problems) log.warn('Окружение: ' + p);
  return r;
}

// ---------------------------------------------------------------- глобальный перехват ошибок

const scrub = s => String(s == null ? '' : s).replace(/(sk-|eyJ)[\w.-]{8,}/g, '$1***').replace(/bot\d+:[\w-]+/g, 'bot***').slice(0, 500);

/** Необработанные ошибки и отклонённые промисы логируются, процесс продолжает работать (бот и сайт не падают). */
function installProcessGuards(log) {
  log = log || console;
  if (process.__iomaGuards) return; process.__iomaGuards = true;
  process.on('unhandledRejection', reason => log.error('Необработанная ошибка (промис):', scrub(reason && reason.stack || reason)));
  process.on('uncaughtException', err => log.error('Необработанная ошибка:', scrub(err && err.stack || err)));
}

/**
 * Express 4 не ловит ошибки async-обработчиков: запрос висит, а процесс может упасть.
 * Оборачиваем все обработчики маршрутов — отклонённый промис уходит в next(err).
 * Вызывать сразу после express(), до регистрации маршрутов.
 */
function catchAsyncRoutes(app) {
  const wrap = fn => {
    // error-обработчики (4 аргумента), роутеры и вложенные приложения (есть .handle) — как есть
    if (typeof fn !== 'function' || fn.length === 4 || fn.__iomaWrapped || typeof fn.handle === 'function') return fn;
    const w = function (req, res, next) {
      try { const r = fn.call(this, req, res, next); if (r && typeof r.catch === 'function') r.catch(next); return r; }
      catch (e) { next(e); }
    };
    w.__iomaWrapped = true;
    return w;
  };
  const deep = a => a.map(x => (Array.isArray(x) ? deep(x) : wrap(x)));
  for (const m of ['get', 'post', 'put', 'patch', 'delete', 'all', 'use']) {
    const orig = app[m].bind(app);
    app[m] = function (...args) {
      if (m === 'get' && args.length === 1 && typeof args[0] === 'string') return orig(...args); // app.get('настройка')
      return orig(...deep(args));
    };
  }
  return app;
}

/** Последний обработчик: вменяемый ответ вместо падения и трассировки. */
function errorHandler(log) {
  log = log || console;
  return function iomaErrorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    const status = Number(err && (err.status || err.statusCode)) || 500;
    if (status >= 500) log.error('Ошибка запроса', req.method, req.originalUrl, scrub(err && err.stack || err));
    if (res.headersSent) return;
    const msg = status >= 500 ? 'Внутренняя ошибка сервера. Попробуйте ещё раз через минуту.' : (err && err.expose && err.message) || 'Неверный запрос.';
    if (String(req.originalUrl || '').startsWith('/api/')) return res.status(status).json({ ok: false, error: msg });
    res.status(status).type('text').send(msg);
  };
}

// ---------------------------------------------------------------- предохранитель для ИИ

/**
 * После нескольких ошибок подряд ИИ «отдыхает» — ответы сразу идут из запасного варианта,
 * а не ждут таймаута на каждом сообщении. Неверный ключ и закончившийся баланс — пауза дольше.
 */
function breaker(opts) {
  opts = opts || {};
  const limit = opts.limit || 3, coolMs = opts.coolMs || 60000, hardMs = opts.hardMs || 10 * 60000;
  let fails = 0, until = 0, last = '';
  return {
    allow: () => Date.now() >= until,
    success: () => { fails = 0; until = 0; last = ''; },
    failure: (err) => {
      const status = Number(err && err.status) || 0;
      last = scrub(err && (err.message || err.error) || err) || 'ошибка';
      if (status === 401 || status === 403 || status === 429 && /quota|billing|insufficient/i.test(last)) { until = Date.now() + hardMs; fails = 0; return; }
      if (++fails >= limit) { until = Date.now() + coolMs; fails = 0; }
    },
    state: () => ({ ok: Date.now() >= until, pausedFor: Math.max(0, Math.round((until - Date.now()) / 1000)), lastError: last }),
  };
}

/** Промис с ограничением по времени. */
function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error((label || 'Запрос') + ': нет ответа за ' + Math.round(ms / 1000) + ' с'), { status: 504 })), ms); })])
    .finally(() => clearTimeout(t));
}

// ---------------------------------------------------------------- keep-alive

/**
 * Бесплатный Render усыпляет сервис после 15 минут без входящих запросов, и первое сообщение боту
 * ждёт пробуждения. Раз в 10 минут сервис обращается к себе по внешнему адресу — это входящий запрос.
 * Включается само на основном адресе (SITE_URL); на копиях — только с KEEPALIVE=1, чтобы две копии
 * не съели месячный лимит бесплатных часов. KEEPALIVE=0 выключает.
 */
function startKeepAlive(opts) {
  opts = opts || {}; const env = opts.env || process.env; const log = opts.log || console;
  const flag = String(env.KEEPALIVE || '').trim();
  const self = String(env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
  const site = String(env.SITE_URL || opts.site || '').replace(/\/+$/, '');
  if (flag === '0' || !self) return null;
  if (flag !== '1' && (!site || self !== site)) return null;
  const every = Math.max(60000, Number(env.KEEPALIVE_MS) || 10 * 60000);
  const url = self + (opts.path || '/api/health');
  const doFetch = opts.fetch || fetch;
  let fails = 0;
  const ping = async () => {
    try {
      const r = await doFetch(url, { headers: { 'User-Agent': 'iomastavka-keepalive' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (fails) log.log('Keep-alive: снова отвечает'); fails = 0;
    } catch (e) { if (++fails === 1 || fails % 6 === 0) log.warn('Keep-alive: ' + scrub(e.message)); }
  };
  const timer = setInterval(ping, every); if (timer.unref) timer.unref();
  log.log(`Keep-alive: пинг ${url} каждые ${Math.round(every / 60000)} мин`);
  return { stop: () => clearInterval(timer), ping };
}

module.exports = { checkEnv, logEnv, installProcessGuards, catchAsyncRoutes, errorHandler, breaker, withTimeout, startKeepAlive, scrub, ENV_SPEC };
