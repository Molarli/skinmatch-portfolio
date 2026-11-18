// controllers/metaController.js - lookup lists the front-end needs for its forms
const pool = require('../db');
const { fail } = require('../utils/http');

// GET /meta
exports.lookups = async (req, res) => {
  try {
    const [[concerns], [allergens], [brands], [ingredients]] = await Promise.all([
      pool.execute('SELECT concern_id, concern_name, name_th, description FROM skin_concern ORDER BY concern_id'),
      pool.execute('SELECT ingredient_id, ingredient_name, name_th FROM ingredient WHERE is_allergen = TRUE ORDER BY ingredient_id'),
      pool.execute('SELECT brand_id, brand_name, country_of_origin FROM brand ORDER BY brand_name'),
      pool.execute('SELECT ingredient_id, ingredient_name, name_th, is_allergen FROM ingredient ORDER BY ingredient_name')
    ]);
    res.json({ concerns, allergens, brands, ingredients });
  } catch (err) {
    fail(res, err);
  }
};
