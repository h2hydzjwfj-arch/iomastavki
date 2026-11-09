const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.disable('x-powered-by');
app.use((_req, res) => {
  res.status(410).type('text').send('IOMASTAVKA preview removed.');
});
app.listen(PORT, '0.0.0.0', () => console.log('Preview is closed.'));
