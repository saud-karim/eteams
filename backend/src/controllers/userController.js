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
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function updateMe(req, res, next) {
  try {
    const { name, job_title, status_text } = req.body;
    if (!name || name.trim().length < 1) return res.status(400).json({ error: 'Name is required' });
    const { db } = require('../db/connection');
    await db.query(
      'UPDATE users SET name = :name, job_title = :job_title, status_text = :status_text WHERE id = :id',
      { id: req.user.id, name: name.trim(), job_title: job_title || '', status_text: status_text || '' }
    );
    const updated = await User.findById(req.user.id);
    res.json({ ok: true, user: updated });
  } catch (e) { next(e); }
}

const bcrypt = require('bcrypt');

async function updateMyPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid current and new password (min 6 chars) required' });
    }
    
    // Need full user record to verify current password
    const { db } = require('../db/connection');
    const [rows] = await db.query(`SELECT password_hash FROM users WHERE id = :id`, { id: req.user.id });
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect current password' });
    
    const hash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(req.user.id, hash);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, updateMyPresence, updateMe, updateMyPassword };
