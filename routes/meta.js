const router = require('express').Router();
const ctrl = require('../controllers/metaController');

router.get('/', ctrl.lookups);   // concerns, allergens, brands, ingredients: lists for the forms

module.exports = router;
