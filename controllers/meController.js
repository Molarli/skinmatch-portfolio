// controllers/meController.js - the logged-in user's own data.
// The user id ALWAYS comes from req.session.user.id, so nobody can read someone else's rows.
const pool = require('../db');
const { toId, fail, sqlError } = require('../utils/http');
const { SKIN_TYPES, SKIN_TONES, AGE_GROUPS, GENDERS } = require('./lists');

// GET /me/profile
exports.getProfile = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [[profiles], [[user]]] = await Promise.all([
      pool.execute(
        'SELECT profile_id, skin_type, skin_tone, age_group, updated_at FROM skin_profile WHERE user_id = ?',
        [userId]),
      pool.execute('SELECT full_name, email, gender FROM users WHERE user_id = ?', [userId])
    ]);
    if (profiles.length === 0) return res.json({ user, profile: null });

    const profile = profiles[0];
    const [[concerns], [allergens]] = await Promise.all([
      pool.execute(
        `SELECT spc.concern_id, sc.name_th, spc.severity_level
           FROM skin_profile_concern spc JOIN skin_concern sc ON sc.concern_id = spc.concern_id
          WHERE spc.profile_id = ? ORDER BY spc.severity_level DESC`, [profile.profile_id]),
      pool.execute(
        `SELECT spa.ingredient_id, i.ingredient_name, i.name_th
           FROM skin_profile_allergen spa JOIN ingredient i ON i.ingredient_id = spa.ingredient_id
          WHERE spa.profile_id = ?`, [profile.profile_id])
    ]);
    profile.concerns = concerns;
    profile.allergens = allergens;
    res.json({ user, profile });
  } catch (err) {
    fail(res, err);
  }
};

// check the body of PUT /me/profile; returns an error message or null
function checkProfile(b) {
  if (!SKIN_TYPES.includes(b.skin_type)) return 'Please choose your skin type.';
  if (!AGE_GROUPS.includes(b.age_group)) return 'Please choose your age group.';
  if (b.skin_tone != null && b.skin_tone !== '' && !SKIN_TONES.includes(b.skin_tone)) return 'Unknown skin tone.';
  if (b.gender != null && b.gender !== '' && !GENDERS.includes(b.gender)) return 'Unknown gender.';
  if (!Array.isArray(b.concerns || []) || (b.concerns || []).length > 10) return 'concerns must be a list.';
  for (const c of b.concerns || []) {
    if (!toId(c.concern_id)) return 'Each concern needs a valid concern_id.';
    const s = Number(c.severity_level ?? 2);
    if (!Number.isInteger(s) || s < 1 || s > 3) return 'Severity must be 1, 2 or 3.';
  }
  if (!Array.isArray(b.allergens || []) || (b.allergens || []).length > 30) return 'allergens must be a list.';
  for (const a of b.allergens || []) if (!toId(a)) return 'Each allergen must be an ingredient id.';
  return null;
}

// PUT /me/profile  { skin_type, age_group, skin_tone?, gender?, concerns:[{concern_id, severity_level}], allergens:[id] }
// Saving a profile touches FOUR tables. It must be all-or-nothing (Lab 9): if the 3rd
// step fails, the user must not end up with a profile that lost all its concerns.
exports.saveProfile = async (req, res) => {
  const b = req.body || {};
  const msg = checkProfile(b);
  if (msg) return res.status(400).json({ error: msg });

  const userId = req.session.user.id;
  const concerns = (b.concerns || []).map((c) => [toId(c.concern_id), Number(c.severity_level ?? 2)]);
  const allergens = [...new Set((b.allergens || []).map(toId))];

  let conn;
  try {
    conn = await pool.getConnection();          // ONE connection for the whole transaction
    await conn.beginTransaction();

    // 1. gender lives in USER
    await conn.execute('UPDATE users SET gender = ? WHERE user_id = ?', [b.gender || null, userId]);

    // 2. insert or update the 1:1 SKIN_PROFILE (FOR UPDATE locks the row until COMMIT)
    const [existing] = await conn.execute(
      'SELECT profile_id FROM skin_profile WHERE user_id = ? FOR UPDATE', [userId]);
    let profileId;
    if (existing.length) {
      profileId = existing[0].profile_id;
      await conn.execute(
        'UPDATE skin_profile SET skin_type = ?, skin_tone = ?, age_group = ?, updated_at = NOW() WHERE profile_id = ?',
        [b.skin_type, b.skin_tone || null, b.age_group, profileId]);
    } else {
      const [r] = await conn.execute(
        'INSERT INTO skin_profile (user_id, skin_type, skin_tone, age_group) VALUES (?, ?, ?, ?)',
        [userId, b.skin_type, b.skin_tone || null, b.age_group]);
      profileId = r.insertId;
    }

    // 3. replace the concerns (bridge SKIN_PROFILE_CONCERN)
    await conn.execute('DELETE FROM skin_profile_concern WHERE profile_id = ?', [profileId]);
    for (const [cid, sev] of concerns) {
      await conn.execute(
        'INSERT INTO skin_profile_concern (profile_id, concern_id, severity_level) VALUES (?, ?, ?)',
        [profileId, cid, sev]);
    }

    // 4. replace the allergen list (bridge SKIN_PROFILE_ALLERGEN)
    await conn.execute('DELETE FROM skin_profile_allergen WHERE profile_id = ?', [profileId]);
    for (const iid of allergens) {
      await conn.execute(
        'INSERT INTO skin_profile_allergen (profile_id, ingredient_id) VALUES (?, ?)', [profileId, iid]);
    }

    await conn.commit();
    res.json({ ok: true, profile_id: profileId });
  } catch (err) {
    if (conn) await conn.rollback();             // undo every step above
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'The same concern was sent twice.' });
    sqlError(res, err);
  } finally {
    if (conn) conn.release();                    // ALWAYS give the connection back
  }
};

// POST /me/recommendations  { limit? }  -> CALL the stored procedure
exports.recommend = async (req, res) => {
  const limit = toId(req.body && req.body.limit) || 5;
  if (limit > 20) return res.status(400).json({ error: 'limit is at most 20.' });

  let conn;
  try {
    conn = await pool.getConnection();   // same connection for CALL and SELECT @saved
    const [result] = await conn.execute('CALL sp_generate_recommendations(?, ?, @saved)',
      [req.session.user.id, limit]);
    const rows = result[0];              // first result set of the procedure
    const [[{ saved }]] = await conn.execute('SELECT @saved AS saved');

    // add the card tags (skin types + concerns) for the recommended products
    if (rows.length) {
      const ids = rows.map((r) => r.product_id);
      const marks = ids.map(() => '?').join(',');
      const [tags] = await conn.execute(
        `SELECT p.product_id,
                (SELECT GROUP_CONCAT(pst.skin_type ORDER BY pst.skin_type)
                   FROM product_skin_type pst WHERE pst.product_id = p.product_id) AS skin_types,
                (SELECT GROUP_CONCAT(sc.name_th ORDER BY pc.effectiveness_level DESC SEPARATOR '|')
                   FROM product_concern pc JOIN skin_concern sc ON sc.concern_id = pc.concern_id
                  WHERE pc.product_id = p.product_id) AS concerns
           FROM product p WHERE p.product_id IN (${marks})`, ids);
      const byId = Object.fromEntries(tags.map((t) => [t.product_id, t]));
      for (const r of rows) {
        const t = byId[r.product_id] || {};
        r.skin_types = t.skin_types ? t.skin_types.split(',') : [];
        r.concerns = t.concerns ? t.concerns.split('|') : [];
      }
    }
    res.json({ saved, items: rows });
  } catch (err) {
    sqlError(res, err);   // SIGNAL "create your profile first" -> 409
  } finally {
    if (conn) conn.release();
  }
};

// GET /me/recommendations/history - the RECOMMENDATION log for this user
exports.history = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.recommendation_id, r.recommended_date, r.match_score, p.product_id, p.product_name, b.brand_name
         FROM recommendation r
         JOIN product p ON p.product_id = r.product_id
         JOIN brand b   ON b.brand_id = p.brand_id
        WHERE r.user_id = ?
        ORDER BY r.recommended_date DESC, r.match_score DESC
        LIMIT 30`, [req.session.user.id]);
    res.json(rows);
  } catch (err) {
    fail(res, err);
  }
};

// GET /me/reviews
exports.myReviews = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.review_id, r.product_id, p.product_name, r.rating, r.comment, r.review_date
         FROM review r JOIN product p ON p.product_id = r.product_id
        WHERE r.user_id = ? ORDER BY r.review_date DESC`, [req.session.user.id]);
    res.json(rows);
  } catch (err) {
    fail(res, err);
  }
};

// DELETE /me/reviews/:id - only your own review (user_id in the WHERE)
exports.deleteReview = async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Review id must be a positive whole number.' });
  try {
    const [r] = await pool.execute('DELETE FROM review WHERE review_id = ? AND user_id = ?',
      [id, req.session.user.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Review not found.' });
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
};
