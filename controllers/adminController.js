// controllers/adminController.js - catalogue management and reports (role 'admin' only)
const pool = require('../db');
const { toId, fail, sqlError } = require('../utils/http');
const L = require('./lists');

// GET /admin/report/brands - the view does the joins and aggregates
exports.brandReport = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM v_brand_report ORDER BY avg_rating IS NULL, avg_rating DESC, brand_name');
    res.json(rows);
  } catch (err) {
    fail(res, err);
  }
};

// GET /admin/report/categories - GROUP BY with a derived table of per-product ratings
exports.categoryReport = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.category,
              COUNT(*)                     AS products,
              ROUND(AVG(p.price), 2)       AS avg_price,
              ROUND(AVG(rs.avg_rating), 2) AS avg_rating,
              COALESCE(SUM(rs.n), 0)       AS reviews
         FROM product p
         LEFT JOIN (SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS n
                      FROM review GROUP BY product_id) rs ON rs.product_id = p.product_id
        GROUP BY p.category
        ORDER BY products DESC`);
    res.json(rows);
  } catch (err) {
    fail(res, err);
  }
};

// GET /admin/users
exports.users = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM v_user_profile_summary ORDER BY user_id');
    res.json(rows);
  } catch (err) {
    fail(res, err);
  }
};

// GET /admin/price-log - rows written only by trigger trg_product_price_audit
exports.priceLog = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT l.log_id, l.product_id, p.product_name, l.old_price, l.new_price, l.changed_by, l.changed_at
         FROM product_price_log l JOIN product p ON p.product_id = l.product_id
        ORDER BY l.log_id DESC LIMIT 50`);
    res.json(rows);
  } catch (err) {
    fail(res, err);
  }
};

// validation for a new product; returns an error message or null
function checkProduct(b) {
  const name = String(b.product_name || '').trim();
  if (!name || name.length > 150) return 'Product name is required (at most 150 characters).';
  if (!toId(b.brand_id)) return 'Please choose a brand.';
  if (!L.CATEGORIES.includes(b.category)) return 'Please choose a category.';
  const price = Number(b.price);
  if (!Number.isFinite(price) || price <= 0 || price > 999999) return 'Price must be a positive number.';
  if (b.volume_ml != null && b.volume_ml !== '' && !toId(b.volume_ml)) return 'Volume must be a positive whole number.';
  if (b.gender_target && !L.GENDER_TARGETS.includes(b.gender_target)) return 'Unknown gender target.';
  for (const t of b.skin_types || []) if (!L.SKIN_TYPES.includes(t)) return 'Unknown skin type.';
  for (const c of b.concerns || []) {
    const e = Number(c.effectiveness_level ?? 2);
    if (!toId(c.concern_id) || !Number.isInteger(e) || e < 1 || e > 3) return 'Each concern needs an id and effectiveness 1-3.';
  }
  for (const i of b.ingredients || []) {
    if (!toId(i.ingredient_id)) return 'Each ingredient needs a valid id.';
    if (i.concentration_percent != null && i.concentration_percent !== '') {
      const p = Number(i.concentration_percent);
      if (!Number.isFinite(p) || p < 0 || p > 100) return 'Concentration must be 0-100.';
    }
  }
  const s = b.subtype || {};
  if (b.category === 'moisturizer' && (!L.TEXTURES.includes(s.texture) || !L.FINISHES.includes(s.finish)))
    return 'A moisturizer needs a texture and a finish.';
  if (b.category === 'serum' && !String(s.key_active || '').trim()) return 'A serum needs its key active ingredient.';
  if (b.category === 'sunscreen') {
    const spf = Number(s.spf);
    if (!Number.isInteger(spf) || spf < 1 || spf > 100) return 'SPF must be a whole number from 1 to 100.';
    if (!L.PA_RATINGS.includes(s.pa_rating) || !L.FILTER_TYPES.includes(s.filter_type)) return 'A sunscreen needs a PA rating and filter type.';
  }
  return null;
}

// POST /admin/products
// One product = superclass row + subtype row + three bridge tables -> one transaction.
exports.createProduct = async (req, res) => {
  const b = req.body || {};
  const msg = checkProduct(b);
  if (msg) return res.status(400).json({ error: msg });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [r] = await conn.execute(
      `INSERT INTO product (product_name, brand_id, category, price, volume_ml, gender_target)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [String(b.product_name).trim(), toId(b.brand_id), b.category, Number(b.price),
       toId(b.volume_ml), b.gender_target || 'unisex']);
    const id = r.insertId;

    const s = b.subtype || {};
    if (b.category === 'moisturizer') {
      await conn.execute('INSERT INTO moisturizer (product_id, texture, finish) VALUES (?, ?, ?)', [id, s.texture, s.finish]);
    } else if (b.category === 'serum') {
      const pct = s.active_percent === '' || s.active_percent == null ? null : Number(s.active_percent);
      await conn.execute('INSERT INTO serum (product_id, key_active, active_percent) VALUES (?, ?, ?)', [id, String(s.key_active).trim(), pct]);
    } else if (b.category === 'sunscreen') {
      await conn.execute('INSERT INTO sunscreen (product_id, spf, pa_rating, filter_type) VALUES (?, ?, ?, ?)',
        [id, Number(s.spf), s.pa_rating, s.filter_type]);
    }

    for (const t of new Set(b.skin_types || [])) {
      await conn.execute('INSERT INTO product_skin_type (product_id, skin_type) VALUES (?, ?)', [id, t]);
    }
    for (const c of b.concerns || []) {
      await conn.execute('INSERT INTO product_concern (product_id, concern_id, effectiveness_level) VALUES (?, ?, ?)',
        [id, toId(c.concern_id), Number(c.effectiveness_level ?? 2)]);
    }
    for (const i of b.ingredients || []) {
      const pct = i.concentration_percent === '' || i.concentration_percent == null ? null : Number(i.concentration_percent);
      await conn.execute('INSERT INTO product_ingredient (product_id, ingredient_id, concentration_percent) VALUES (?, ?, ?)',
        [id, toId(i.ingredient_id), pct]);
    }

    await conn.commit();
    res.status(201).json({ ok: true, product_id: id });
  } catch (err) {
    if (conn) await conn.rollback();   // e.g. an unknown ingredient id: nothing half-saved
    sqlError(res, err);
  } finally {
    if (conn) conn.release();
  }
};

// PATCH /admin/products/:id  { product_name?, price?, volume_ml?, gender_target? }
// SET is built from a FIXED list of columns, never from whatever keys the body has (Lab 12).
exports.updateProduct = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Product id must be a positive whole number.' });
  const b = req.body || {};
  const sets = [];
  const params = [];

  if (b.product_name !== undefined) {
    const n = String(b.product_name).trim();
    if (!n || n.length > 150) return res.status(400).json({ error: 'Product name is 1-150 characters.' });
    sets.push('product_name = ?'); params.push(n);
  }
  if (b.price !== undefined) {
    const p = Number(b.price);
    if (!Number.isFinite(p) || p <= 0 || p > 999999) return res.status(400).json({ error: 'Price must be a positive number.' });
    sets.push('price = ?'); params.push(p);
  }
  if (b.volume_ml !== undefined) {
    if (b.volume_ml !== null && !toId(b.volume_ml)) return res.status(400).json({ error: 'Volume must be a positive whole number.' });
    sets.push('volume_ml = ?'); params.push(b.volume_ml === null ? null : toId(b.volume_ml));
  }
  if (b.gender_target !== undefined) {
    if (!L.GENDER_TARGETS.includes(b.gender_target)) return res.status(400).json({ error: 'Unknown gender target.' });
    sets.push('gender_target = ?'); params.push(b.gender_target);
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

  let conn;
  try {
    conn = await pool.getConnection();
    const [found] = await conn.execute('SELECT product_id FROM product WHERE product_id = ?', [id]);
    if (found.length === 0) return res.status(404).json({ error: 'Product not found.' });

    // tell the audit trigger WHO changed the price: @app_user lives on this connection
    await conn.query('SET @app_user = ?', [req.session.user.email]);
    await conn.execute(`UPDATE product SET ${sets.join(', ')} WHERE product_id = ?`, [...params, id]);
    res.json({ ok: true, product_id: id });
  } catch (err) {
    sqlError(res, err);
  } finally {
    if (conn) {
      // clean the pooled connection so the next request does not inherit @app_user
      try { await conn.query('SET @app_user = NULL'); } catch (e) { /* ignore */ }
      conn.release();
    }
  }
};

// DELETE /admin/products/:id - ON DELETE CASCADE removes its bridge, subtype and review rows
exports.deleteProduct = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Product id must be a positive whole number.' });
  try {
    const [r] = await pool.execute('DELETE FROM product WHERE product_id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ ok: true });
  } catch (err) {
    sqlError(res, err);
  }
};
