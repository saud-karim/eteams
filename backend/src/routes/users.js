const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads'),
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit for avatars

router.use(requireAuth);
router.get('/', ctrl.list);
router.put('/me', ctrl.updateMe);
router.put('/me/presence', ctrl.updateMyPresence);
router.put('/me/password', ctrl.updateMyPassword);
router.post('/fcm-token', ctrl.saveFcmToken);
router.post('/me/avatar', upload.single('avatar'), ctrl.uploadAvatar);
router.get('/favorites', ctrl.getFavorites);
router.post('/favorites/:id', ctrl.addFavorite);
router.delete('/favorites/:id', ctrl.removeFavorite);

module.exports = router;
