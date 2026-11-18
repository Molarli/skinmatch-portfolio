// controllers/authController.js - accounts and sessions (Lab 10)
const pool = require('../db');
const { hashPassword, verifyPassword } = require('../utils/passwords');
const { fail } = require('../utils/http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// put the logged-in user in a NEW session (a fresh id at login)
function startSession(req, res, user, status) {
  req.session.regenerate((err) => {
    if (err) return fail(res, err);
    req.session.user = { id: user.user_id, full_name: user.full_name, email: user.email, role: user.role };
    res.status(status).json({ ok: true, user: req.session.user });
  });
}

// POST /auth/register  { full_name, email, password }
exports.register = async (req, res) => {
  const fullName = String(req.body.full_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!fullName || fullName.length > 100) return res.status(400).json({ error: 'Name is required (at most 100 characters).' });
  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const [r] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [fullName, email, hashPassword(password)]);
    startSession(req, res, { user_id: r.insertId, full_name: fullName, email, role: 'member' }, 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This email is already registered.' });
    fail(res, err);
  }
};

// POST /auth/login  { email, password }
exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const [rows] = await pool.execute(
      'SELECT user_id, full_name, email, password_hash, role FROM users WHERE email = ?', [email]);
    // the same answer for "no such email" and "wrong password": nobody learns which emails exist
    if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    startSession(req, res, rows[0], 200);
  } catch (err) {
    fail(res, err);
  }
};

// POST /auth/logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
};

// GET /auth/me  -> who is logged in (or null)
exports.me = (req, res) => {
  res.json({ user: req.session.user || null });
};
