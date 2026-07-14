const Broadcast = require('../models/Broadcast');
const { getIo } = require('../sockets');
const AuditLog = require('../models/AuditLog');

async function createBroadcast(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can send broadcasts' });
    }

    const { type, recipients, messageBody } = req.body;
    if (!type || !recipients || !messageBody) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const broadcast = await Broadcast.create({
      type,
      recipients,
      messageBody,
      createdBy: req.user.id
    });

    // Log the audit event
    await AuditLog.log(req.user.id, 'broadcast.create', 'system', 'system', {
      type,
      recipients,
      message_preview: messageBody.substring(0, 50)
    }, req.ip);

    // Emit socket event to everyone
    // In a real implementation with recipients filter, we'd emit to specific rooms
    // For now, emit globally as the mock implies 'All Users' or group-level
    getIo().emit('system_broadcast', broadcast);

    res.json({ broadcast });
  } catch (err) {
    next(err);
  }
}

async function getRecentBroadcasts(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can view broadcast history' });
    }
    const broadcasts = await Broadcast.getRecent(50);
    res.json({ broadcasts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBroadcast,
  getRecentBroadcasts
};
