// utils/passwords.js - store a salted scrypt hash, never the password (Lab 10)
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);   // same time wherever bytes differ
}

module.exports = { hashPassword, verifyPassword };
