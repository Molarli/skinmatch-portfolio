// controllers/productController.js - catalogue, product page, reviews
const pool = require('../db');
const { toId, fail, sqlError } = require('../utils/http');
const { CATEGORIES, SKIN_TYPES } = require('./lists');

// tags for the product cards: the skin types it suits and the concerns it treats
const TAG_COLUMNS = `
  (SELECT GROUP_CONCAT(pst.skin_type ORDER BY pst.skin_type)
     FROM product_skin_type pst WHERE pst.product_id = c.product_id) AS skin_types,
  (SELECT GROUP_CONCAT(sc.name_th ORDER BY pc.effectiveness_level DESC, sc.concern_id SEPARATOR '|')
     FROM product_concern pc JOIN skin_concern sc ON sc.concern_id = pc.concern_id
    WHERE pc.product_id = c.product_id) AS concerns`;

// the user's own allergens found in a product (0 when not logged in)
const MY_ALLERGEN_HITS = `
  (SELECT COUNT(*) FROM product_ingredient pi
     JOIN skin_profile_allergen spa ON spa.ingredient_id = pi.ingredient_id
     JOIN skin_profile sp ON sp.profile_id = spa.profile_id
    WHERE pi.product_id = c.product_id AND sp.user_id = ?) AS my_allergen_hits`;

function splitTags(row) {
  row.skin_types = row.skin_types ? row.skin_types.split(',') : [];
  row.concerns = row.concerns ? row.concerns.split('|') : [];
  return row;
}

// GET /products?q=&category=&brand_id=&min_price=&max_price=&skin_type=&concern_id=&exclude_allergens=1&sort=
exports.list = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : null;
  const q = req.query;

  // SELECT part: its ? values come first, in order
  const selectParams = [];
  let select = `SELECT c.*, ${TAG_COLUMNS}`;
  if (userId) {
    select += `, fn_match_score(?, c.product_id) AS match_score, ${MY_ALLERGEN_HITS}`;
    selectParams.push(userId, userId);
  }

  // WHERE part: every filter is a ? placeholder, never glued into the SQL (Lab 10)
  const where = [];
  const params = [];
  if (q.q) {
    where.push('(c.product_name LIKE ? OR c.brand_name LIKE ?)');
    const like = `%${String(q.q).trim()}%`;
    params.push(like, like);
  }
  if (q.category) {
    if (!CATEGORIES.includes(q.category)) return res.status(400).json({ error: 'Unknown category.' });
    where.push('c.category = ?');
    params.push(q.category);
  }
  if (q.brand_id) {
    const b = toId(q.brand_id);
    if (!b) return res.status(400).json({ error: 'brand_id must be a positive whole number.' });
    where.push('c.brand_id = ?');
    params.push(b);
  }
  for (const [key, op] of [['min_price', '>='], ['max_price', '<=']]) {
    if (q[key] !== undefined && q[key] !== '') {
      const v = Number(q[key]);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: `${key} must be a number.` });
      where.push(`c.price ${op} ?`);
      params.push(v);
    }
  }
  if (q.skin_type) {
    if (!SKIN_TYPES.includes(q.skin_type)) return res.status(400).json({ error: 'Unknown skin type.' });
    where.push('EXISTS (SELECT 1 FROM product_skin_type pst WHERE pst.product_id = c.product_id AND pst.skin_type = ?)');
    params.push(q.skin_type);
  }
  if (q.concern_id) {
    const cid = toId(q.concern_id);
    if (!cid) return res.status(400).json({ error: 'concern_id must be a positive whole number.' });
    where.push('EXISTS (SELECT 1 FROM product_concern pc WHERE pc.product_id = c.product_id AND pc.concern_id = ?)');
    params.push(cid);
  }
  if (q.exclude_allergens === '1') {
    if (userId) {
      // logged in: hide products with the user's OWN allergens (nested NOT EXISTS)
      where.push(`NOT EXISTS (SELECT 1 FROM product_ingredient pi
                    JOIN skin_profile_allergen spa ON spa.ingredient_id = pi.ingredient_id
                    JOIN skin_profile sp ON sp.profile_id = spa.profile_id
                   WHERE pi.product_id = c.product_id AND sp.user_id = ?)`);
      params.push(userId);
    } else {
      where.push('c.allergen_count = 0');   // visitor: hide anything with a flagged allergen
    }
  }

  const SORTS = {
    rating: 'c.avg_rating IS NULL, c.avg_rating DESC, c.review_count DESC',
    price_asc: 'c.price ASC',
    price_desc: 'c.price DESC',
    match: userId ? 'match_score DESC, c.avg_rating DESC' : 'c.avg_rating IS NULL, c.avg_rating DESC'
  };
  const orderBy = SORTS[q.sort] || 'c.product_id';   // fixed list: user text never reaches ORDER BY

  const sql = `${select} FROM v_product_catalog c
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY ${orderBy}`;
  try {
    const [rows] = await pool.execute(sql, [...selectParams, ...params]);
    res.json(rows.map(splitTags));
  } catch (err) {
    fail(res, err);
  }
};

// GET /products/:id - everything the product page shows
exports.detail = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Product id must be a positive whole number.' });
  const userId = req.session.user ? req.session.user.id : 0;   // 0 matches no user

  try {
    const [[rows], [ingredients], [concerns], [reviews]] = await Promise.all([
      // superclass + its subclass details (LEFT JOIN to each subtype table = EER mapping)
      pool.execute(
        `SELECT c.*, ${TAG_COLUMNS},
                m.texture, m.finish, s.key_active, s.active_percent,
                u.spf, u.pa_rating, u.filter_type,
                fn_match_score(?, c.product_id) AS match_score
           FROM v_product_catalog c
           LEFT JOIN moisturizer m ON m.product_id = c.product_id
           LEFT JOIN serum s       ON s.product_id = c.product_id
           LEFT JOIN sunscreen u   ON u.product_id = c.product_id
          WHERE c.product_id = ?`, [userId, id]),
      pool.execute(
        `SELECT i.ingredient_id, i.ingredient_name, i.name_th, i.function_benefit, i.is_allergen,
                pi.concentration_percent,
                EXISTS (SELECT 1 FROM skin_profile_allergen spa
                          JOIN skin_profile sp ON sp.profile_id = spa.profile_id
                         WHERE spa.ingredient_id = i.ingredient_id AND sp.user_id = ?) AS is_my_allergen
           FROM product_ingredient pi
           JOIN ingredient i ON i.ingredient_id = pi.ingredient_id
          WHERE pi.product_id = ?
          ORDER BY pi.concentration_percent IS NULL, pi.concentration_percent DESC, i.ingredient_name`,
        [userId, id]),
      pool.execute(
        `SELECT sc.concern_id, sc.name_th, pc.effectiveness_level
           FROM product_concern pc JOIN skin_concern sc ON sc.concern_id = pc.concern_id
          WHERE pc.product_id = ? ORDER BY pc.effectiveness_level DESC`, [id]),
      pool.execute(
        'SELECT review_id, reviewer, rating, comment, review_date FROM v_public_reviews WHERE product_id = ? ORDER BY review_date DESC',
        [id])
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });

    const product = splitTags(rows[0]);
    product.ingredients = ingredients.map((i) => ({ ...i, is_allergen: !!i.is_allergen, is_my_allergen: !!i.is_my_allergen }));
    product.concern_list = concerns;
    product.reviews = reviews;
    product.logged_in = !!req.session.user;
    res.json(product);
  } catch (err) {
    fail(res, err);
  }
};

// POST /products/:id/reviews  { rating, comment }
exports.addReview = async (req, res) => {
  const productId = toId(req.params.id);
  const rating = Number(req.body.rating);
  const comment = req.body.comment === undefined ? null : String(req.body.comment).trim();
  if (!productId) return res.status(400).json({ error: 'Product id must be a positive whole number.' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
  if (comment && comment.length > 500) return res.status(400).json({ error: 'Comment is at most 500 characters.' });

  try {
    const [r] = await pool.execute(
      'INSERT INTO review (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [req.session.user.id, productId, rating, comment || null]);
    res.status(201).json({ ok: true, review_id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'You have already reviewed this product.' });
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ error: 'Product not found.' });
    sqlError(res, err);
  }
};
