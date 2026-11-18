// server.js - SkinMatch web app (CSS325 Project 2)
// Layers (Lab 6/12): routes -> middleware -> controllers -> one MySQL pool
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || require('node:crypto').randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 4 }
}));

// tiny request log: method, URL, status, time (handy during the demo)
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0} ms)`));
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', require('./routes/auth'));
app.use('/meta', require('./routes/meta'));
app.use('/products', require('./routes/products'));
app.use('/me', require('./routes/me'));
app.use('/admin', require('./routes/admin'));

// unknown API route
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// bad JSON body and any other uncaught error
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`SkinMatch running on http://localhost:${PORT}`));
