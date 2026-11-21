const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API routes (placeholder, implement logic later) ---
app.post('/api/links', (req, res) => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  res.json({ code });
});

app.get('/api/links/:code', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.post('/api/verify/send', (req, res) => {
  res.json({ requestId: 'demo-' + Date.now() });
});

app.get('/api/verify/status/:id', (req, res) => {
  res.json({ status: 'pending' });
});

app.get('/api/logs', (req, res) => {
  res.json({ entries: [] });
});

// Fallback: serve admin.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
