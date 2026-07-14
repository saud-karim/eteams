const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', ctrl.list);
router.put('/me', ctrl.updateMe);
router.put('/me/presence', ctrl.updateMyPresence);
router.put('/me/password', ctrl.updateMyPassword);

module.exports = router;
