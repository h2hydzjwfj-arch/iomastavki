const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
app.disable('x-powered-by');

const pages = {
  '/': 'preview-home.html',
  '/delivery': 'preview-delivery.html',
  '/calculator': 'preview-calculator.html',
  '/tnved': 'preview-tnved.html',
  '/tracking': 'preview-tracking.html',
  '/documents': 'preview-documents.html',
  '/reports': 'preview-reports.html',
  '/cabinet': 'preview-cabinet.html',
  '/rates': 'preview-rates.html',
  '/business': 'preview-business.html',
  '/about': 'preview-about.html',
  '/help': 'preview-help.html'
};

app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'iomastavka-preview' }));

app.get('/assets/site.css', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('text/css').sendFile(path.join(ROOT, 'preview-assets', 'site.css'));
});
app.get('/assets/site.js', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('application/javascript').sendFile(path.join(ROOT, 'preview-assets', 'site.js'));
});

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT, file));
  });
});

// Old palette routes lead to the new approved light concept.
app.get('/v/:variant', (req, res) => {
  if (!['1', '2', '3', '4', '5'].includes(req.params.variant)) {
    return res.status(404).send('Вариант не найден');
  }
  return res.redirect(302, '/');
});
app.get('/preview.html', (_req, res) => res.redirect(302, '/'));
app.use((_req, res) => res.status(404).send('Страница не найдена'));
app.listen(PORT, '0.0.0.0', () => console.log('IOMASTAVKA multi-page preview listening on ' + PORT));
