const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { requireLogin } = require('../middleware/auth');

router.get('/', ctrl.list);                                  // anyone: catalogue + filters
router.get('/:id', ctrl.detail);                             // anyone: one product
router.post('/:id/reviews', requireLogin, ctrl.addReview);   // logged-in users

module.exports = router;
