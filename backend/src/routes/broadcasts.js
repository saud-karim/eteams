const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcastController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', broadcastController.createBroadcast);
router.get('/', broadcastController.getRecentBroadcasts);

module.exports = router;
