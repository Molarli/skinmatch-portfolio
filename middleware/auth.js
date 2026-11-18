// middleware/auth.js - written once, reused on every protected route (Lab 10)

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Please log in first.' });
    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'You are not allowed to do that.' });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
