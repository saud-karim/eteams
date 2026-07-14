const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.post('/signup', ctrl.signup);
router.get('/managers', ctrl.getManagers);
router.get('/me', requireAuth, ctrl.me);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;
