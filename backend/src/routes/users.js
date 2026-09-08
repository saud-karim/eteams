const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'temp');
    const fs = require('fs');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid avatar file type'));
  }
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid avatar extension'));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit for avatars

router.use(requireAuth);
router.get('/', ctrl.list);
router.put('/me', ctrl.updateMe);
router.put('/me/presence', ctrl.updateMyPresence);
router.put('/me/password', ctrl.updateMyPassword);
router.post('/fcm-token', ctrl.saveFcmToken);
router.delete('/fcm-token', ctrl.removeFcmToken);
router.post('/me/avatar', upload.single('avatar'), ctrl.uploadAvatar);
router.get('/favorites', ctrl.getFavorites);
router.post('/favorites/:id', ctrl.addFavorite);
router.delete('/favorites/:id', ctrl.removeFavorite);

module.exports = router;
