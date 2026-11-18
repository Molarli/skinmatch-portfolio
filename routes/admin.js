const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));                 // every admin route: 401 / 403 otherwise
router.get('/report/brands', ctrl.brandReport);   // view v_brand_report
router.get('/report/categories', ctrl.categoryReport);
router.get('/users', ctrl.users);                 // view v_user_profile_summary
router.get('/price-log', ctrl.priceLog);          // written by the trigger
router.post('/products', ctrl.createProduct);     // transaction: product + subtype + bridges
router.patch('/products/:id', ctrl.updateProduct);// price change fires the audit trigger
router.delete('/products/:id', ctrl.deleteProduct);

module.exports = router;
