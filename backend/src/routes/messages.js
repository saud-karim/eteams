const router = require('express').Router();
const ctrl = require('../controllers/messageController');
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
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'video/mp4', 'application/zip'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'));
  }
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.mp4', '.zip'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file extension'));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2048 * 1024 * 1024 } }); // 2GB limit

router.use(requireAuth);
router.get('/channel/:channelId', ctrl.list);
router.get('/single/:id', ctrl.getById);
router.get('/:parentId/replies', ctrl.listReplies);
router.get('/search', ctrl.search);
router.get('/saved', ctrl.getSavedMessages);
router.get('/threads', ctrl.getThreads);
router.get('/mentions', ctrl.getMentions);
router.get('/files', ctrl.getFiles);
router.get('/download/:attachmentId', ctrl.downloadAttachment);
router.post('/', upload.single('file'), ctrl.send);
router.patch('/:id', ctrl.edit);
router.delete('/:id', ctrl.remove);
router.post('/:id/react', ctrl.react);
router.post('/:id/pin', ctrl.togglePin);
router.post('/:id/save', ctrl.toggleSave);
router.post('/read', ctrl.markRead);

module.exports = router;
