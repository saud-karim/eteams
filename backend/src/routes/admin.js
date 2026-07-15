const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireRole('superadmin'));

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/stats', adminController.getStats);

router.get('/users', adminController.getUsers);
router.get('/users/pending', adminController.getPendingUsers);
router.post('/users/:id/approve', adminController.approveUser);
router.post('/users/:id/reject', adminController.rejectUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/reactivate', adminController.reactivateUser);
router.post('/users/:id/force-logout', adminController.forceLogoutUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.get('/users/:id/channels', adminController.getUserChannels);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/import', adminController.importUsers);




// Channels
router.get('/channels', adminController.getChannels);
router.get('/channels/managers', adminController.getChannelManagers);

router.put('/channels/:id', adminController.updateChannel);
router.post('/channels/:id/archive', adminController.archiveChannel);
router.post('/channels/:id/managers', adminController.assignChannelManager);
router.delete('/channels/:id/managers/:userId', adminController.revokeChannelManager);

router.get('/role-presets', adminController.getRolePresets);
router.post('/role-presets', adminController.createRolePreset);
router.put('/role-presets/:id', adminController.updateRolePreset);
router.delete('/role-presets/:id', adminController.deleteRolePreset);

router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

router.get('/job-titles', adminController.getJobTitles);
router.post('/job-titles', adminController.createJobTitle);
router.put('/job-titles/:id', adminController.updateJobTitle);
router.delete('/job-titles/:id', adminController.deleteJobTitle);

module.exports = router;
