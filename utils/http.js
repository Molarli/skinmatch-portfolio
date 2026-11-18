// utils/http.js - small helpers shared by every controller

// "12" -> 12, anything that is not a positive whole number -> null
function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Unexpected error: full details go to the server log, the client gets a generic 500 (Lab 10)
function fail(res, err) {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

// Turn the MySQL errors we expect into clear 4xx answers
function sqlError(res, err) {
  if (err.sqlState === '45000') return res.status(409).json({ error: err.sqlMessage }); // our SIGNAL
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This item already exists.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'A referenced item does not exist.' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'This item is still used by other data.' });
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return res.status(400).json({ error: 'A value is outside the allowed range.' });
  return fail(res, err);
}

module.exports = { toId, fail, sqlError };
