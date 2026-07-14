const Message = require('../models/Message');
const Channel = require('../models/Channel');

async function exportChannel(req, res, next) {
  try {
    const { id: channelId } = req.params;
    
    // Authorization check
    const ch = await Channel.findById(channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    const isSuperAdmin = req.user.role === 'superadmin';
    const membership = await Channel.getMembership(channelId, req.user.id);
    const isChannelManager = membership && membership.is_manager;
    
    if (ch.type === 'private' && !membership && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const canExportDeleted = isSuperAdmin || isChannelManager;

    const msgs = await Message.listAllForExport(channelId);
    
    let textOutput = `Chat Export: ${ch.name || ch.slug}\n`;
    textOutput += `Exported at: ${new Date().toISOString()}\n`;
    textOutput += `----------------------------------------\n\n`;

    msgs.forEach(m => {
      // Filter out deleted messages if user doesn't have permission
      if (m.deleted_at && !canExportDeleted) {
        return; // skip
      }

      const date = new Date(m.created_at).toLocaleString();
      const author = m.author_name || 'Unknown';
      let content = m.body;
      
      if (m.deleted_at) {
        content = `[DELETED] ${content}`;
      }
      
      textOutput += `[${date}] ${author}: ${content}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${ch.name || ch.slug}-export.txt"`);
    res.send(textOutput);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportChannel };
