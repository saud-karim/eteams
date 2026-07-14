const router = require('express').Router();
const ctrl = require('../controllers/channelController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', ctrl.myChannels);
router.post('/dm', ctrl.createDM);
router.get('/:slug', ctrl.getBySlug);
router.post('/', ctrl.create);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);
router.put('/:id/members/:userId/permissions', ctrl.updateMemberPermissions);
router.post('/:id/read', ctrl.markRead);
router.delete('/:id/members/me', ctrl.leaveChannel);
router.delete('/:id', ctrl.deleteChannel);
router.get('/:id/export', require('../controllers/exportController').exportChannel);

module.exports = router;
