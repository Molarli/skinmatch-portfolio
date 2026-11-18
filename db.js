// db.js - ONE connection pool for the whole app (Lab 4, Lab 6)
// The login comes from .env and is the least-privilege account skinmatch_app (Lab 10).
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'skinmatch',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  decimalNumbers: true   // DECIMAL columns arrive as numbers, not strings
});

module.exports = pool;
