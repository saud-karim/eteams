const User = require('../models/User');

async function list(req, res, next) {
  try { res.json({ users: await User.findAll() }); } catch (e) { next(e); }
}

async function updateMyPresence(req, res, next) {
  try {
    const { presence, statusText } = req.body;
    if (!['online', 'away', 'dnd', 'meeting', 'offline'].includes(presence)) {
      return res.status(400).json({ error: 'Invalid presence' });
    }
    await User.updatePresence(req.user.id, presence, statusText || null);
    
    // Broadcast presence to all connected clients
    const { getIo } = require('../sockets');
    const io = getIo();
    if (io) io.emit('presence:update', { userId: req.user.id, presence });
    
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function updateMe(req, res, next) {
  try {
    const { name, job_title, status_text, email, phone } = req.body;
    if (!name || name.trim().length < 1) return res.status(400).json({ error: 'Name is required' });
    const { db } = require('../db/connection');
    await db.query(
      'UPDATE users SET name = :name, job_title = :job_title, status_text = :status_text, email = :email, phone = :phone WHERE id = :id',
      { id: req.user.id, name: name.trim(), job_title: job_title || '', status_text: status_text || '', email: email || '', phone: phone || '' }
    );
    const updated = await User.findById(req.user.id);
    res.json({ ok: true, user: updated });
  } catch (e) { next(e); }
}

const bcrypt = require('bcrypt');

async function updateMyPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid new password (min 6 chars) required' });
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(req.user.id, hash);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function saveFcmToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const { db } = require('../db/connection');
    await db.query(
      `INSERT INTO fcm_tokens (user_id, token) VALUES (:userId, :token) ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      { userId: req.user.id, token }
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar image uploaded' });
    }
    
    // Convert path separator for Windows to URL-friendly forward slashes if needed
    const fileUrl = `/uploads/${req.file.filename}`;
    
    const updated = await User.updateAvatar(req.user.id, fileUrl);
    res.json({ ok: true, user: updated });
  } catch (e) { next(e); }
}

module.exports = { list, updateMyPresence, updateMe, updateMyPassword, saveFcmToken, uploadAvatar };
