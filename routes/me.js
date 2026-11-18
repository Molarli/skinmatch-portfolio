// Every /me route uses the id from the SESSION, never from the URL or body (Lab 10/12)
const router = require('express').Router();
const ctrl = require('../controllers/meController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.saveProfile);                 // transaction
router.post('/recommendations', ctrl.recommend);          // CALL sp_generate_recommendations
router.get('/recommendations/history', ctrl.history);
router.get('/reviews', ctrl.myReviews);
router.delete('/reviews/:id', ctrl.deleteReview);

module.exports = router;
