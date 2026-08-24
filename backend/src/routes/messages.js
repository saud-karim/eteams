const router = require('express').Router();
const ctrl = require('../controllers/messageController');
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
const upload = multer({ storage, limits: { fileSize: 2048 * 1024 * 1024 } }); // 2GB limit

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
