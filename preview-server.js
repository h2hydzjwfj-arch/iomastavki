const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
app.disable('x-powered-by');
app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'iomastavka-preview' }));
app.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(ROOT, 'preview.html'));
});
app.get('/preview.html', (_req, res) => res.sendFile(path.join(ROOT, 'preview.html')));
app.use((_req, res) => res.status(404).send('Not found'));
app.listen(PORT, '0.0.0.0', () => console.log('IOMASTAVKA preview listening on ' + PORT));
