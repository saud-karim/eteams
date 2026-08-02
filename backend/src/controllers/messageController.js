const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const Reaction = require('../models/Reaction');
const AuditLog = require('../models/AuditLog');
const Attachment = require('../models/Attachment');
const MessageRead = require('../models/MessageRead');
const { parseMentions } = require('../utils/mentions');
const { emitToChannel, emitToUser } = require('../sockets');

const sendSchema = z.object({
  channelId: z.string().uuid(),
  body: z.string().max(10000).optional().default(''),
  parentId: z.string().uuid().nullable().optional(),
});

async function attachReactions(msgs, authorId = null) {
  for (const m of msgs) {
    m.reactions = await Message.listReactions(m.id);
    m.attachments = await Attachment.listByMessage(m.id);
    m.readers = await MessageRead.getReaders(m.id, authorId || m.user_id);
  }
  return msgs;
}

async function markRead(req, res, next) {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array required' });
    }
    await MessageRead.markManyRead(req.user.id, messageIds);
    // Emit read receipts to the channel so other clients can update UI
    const msg = await Message.findById(messageIds[messageIds.length - 1]);
    if (msg) {
      const readers = await MessageRead.getReaders(msg.id, msg.user_id);
      emitToChannel(msg.channel_id, 'message:read', {
        messageIds,
        channelId: msg.channel_id,
        reader: { id: req.user.id },
        lastMessageId: msg.id,
        readers
      });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { channelId } = req.params;
    const ch = await Channel.findById(channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    if (ch.type === 'private') {
      if (!(await Channel.isMember(channelId, req.user.id)) && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Not a member' });
      }
    }
    const before = req.query.before || null;
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 500);
    const msgs = await Message.listByChannel(channelId, { limit, before, userId: req.user.id });
    await attachReactions(msgs);
    res.json({ messages: msgs });
  } catch (e) { next(e); }
}

async function listReplies(req, res, next) {
  try {
    const { parentId } = req.params;
    const parent = await Message.findById(parentId);
    if (!parent) return res.status(404).json({ error: 'Message not found' });
    
    const ch = await Channel.findById(parent.channel_id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    if (ch.type === 'private') {
      if (!(await Channel.isMember(ch.id, req.user.id)) && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Not a member' });
      }
    }
    const before = req.query.before || null;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const msgs = await Message.listReplies(parentId, { limit, before, userId: req.user.id });
    await attachReactions(msgs);
    res.json({ messages: msgs });
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    
    // Check channel access
    const ch = await Channel.findById(msg.channel_id);
    if (ch.type === 'private') {
      if (!(await Channel.isMember(ch.id, req.user.id)) && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Not a member' });
      }
    }
    
    // Attach reactions, attachments, and readers
    await attachReactions([msg], req.user.id);
    
    res.json({ message: msg });
  } catch (e) { next(e); }
}

async function send(req, res, next) {
  try {
    // If formData sends "null" string, convert it to actual null
    const bodyData = { ...req.body };
    if (bodyData.parentId === 'null' || bodyData.parentId === '') bodyData.parentId = null;
    
    const data = sendSchema.parse(bodyData);
    
    if (!data.body && !req.file) {
      return res.status(400).json({ error: 'Message body or attachment is required' });
    }

    const mem = await Channel.getMembership(data.channelId, req.user.id);
    if (!mem && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Not a member' });
    const ch = await Channel.findById(data.channelId);
    const perms = req.user.permissions || {};
    
    if (ch.is_readonly && req.user.role !== 'superadmin' && !mem?.is_manager) {
      return res.status(403).json({ error: 'Channel is read-only. Only managers can post.' });
    }
    
    if (!ch.is_readonly && req.user.role !== 'superadmin' && !mem?.can_post && !mem?.is_manager) {
      return res.status(403).json({ error: 'You do not have permission to post in this channel.' });
    }

    if (data.parentId && !perms['thread'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing thread permission' });
    }

    if (data.body.includes('@everyone') && !perms['at-everyone'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing at-everyone permission' });
    }
    if (data.body.includes('@channel') && !perms['at-channel'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing at-channel permission' });
    }
    if (data.body.includes('@here') && !perms['at-here'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing at-here permission' });
    }

    if (req.file) {
      if (!perms['upload'] && !perms['upload-large'] && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Missing upload permission' });
      }
      if (req.file.size > 25 * 1024 * 1024 && !perms['upload-large'] && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'File too large and missing upload-large permission' });
      }
    }

    const allUsers = await User.findAll();
    const memberLookup = {};
    for (const u of allUsers) {
      if (u.name) {
        memberLookup[u.name.replace(/\s+/g, '').toLowerCase()] = u.id;
      }
    }
    const mentions = parseMentions(data.body, memberLookup);
    
    if (mentions.users.length > 0 && !perms['at-user'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing at-user permission to mention users' });
    }

    const id = uuidv4();
    let msg = await Message.create({
      id, channel_id: data.channelId, user_id: req.user.id,
      parent_id: data.parentId || null, body: data.body, mentions
    });

    if (req.file) {
      await Attachment.create({
        message_id: id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_key: `uploads/${req.file.filename}`
      });
      msg.attachments = await Attachment.listByMessage(id);
    } else {
      msg.attachments = [];
    }

    msg.reactions = [];
    emitToChannel(data.channelId, 'message:new', msg);
    
    // Notifications logic
    const channelObj = await Channel.findById(data.channelId);
    const members = await Channel.listMembers(data.channelId);
    const offlineUserIds = [];
    
    let parentMsg = null;
    if (data.parentId) {
      const Message = require('../models/Message');
      parentMsg = await Message.findById(data.parentId);
    }

    if (mentions.users.length > 0 || mentions.special.length > 0 || channelObj.type === 'direct' || channelObj.type === 'dm' || parentMsg) {
      for (const m of members) {
        if (m.id === req.user.id) continue;
        let shouldNotify = false;
        let noteText = '';
        if (mentions.users.includes(m.id)) {
          shouldNotify = true;
          noteText = `You were mentioned by ${req.user.name}`;
        } else if (mentions.special.includes('channel') || mentions.special.includes('everyone')) {
          shouldNotify = true;
          noteText = `${req.user.name} mentioned @${mentions.special.includes('everyone') ? 'everyone' : 'channel'}`;
        } else if (mentions.special.includes('here') && m.presence === 'online') {
          shouldNotify = true;
          noteText = `${req.user.name} used @here`;
        } else if (parentMsg && parentMsg.user_id === m.id) {
          shouldNotify = true;
          noteText = `${req.user.name} replied to your thread`;
        } else if (channelObj.type === 'direct' || channelObj.type === 'dm') {
          shouldNotify = true;
          noteText = `New DM from ${req.user.name}`;
        }
        
        if (shouldNotify) {
          emitToUser(m.id, 'notification:mention', { id: msg.id, channel_slug: channelObj.slug, body: noteText });
          
          // Collect for push notification if they are offline or we just want to push to all devices
          if (m.presence === 'offline' || m.presence === 'away' || m.presence === 'dnd' || true) {
            offlineUserIds.push({ id: m.id, noteText });
          }
        }
      }
    }

    // Send Web Push Notifications
    if (offlineUserIds.length > 0) {
      const { db } = require('../db/connection');
      const { messaging } = require('../firebaseAdmin');
      
      // We group by user to get their tokens
      for (const u of offlineUserIds) {
        db.query('SELECT token FROM fcm_tokens WHERE user_id = ?', [u.id])
          .then(([rows]) => {
            const tokens = rows.map(r => r.token);
            if (tokens.length > 0 && messaging) {
              const payload = {
                notification: {
                  title: channelObj.name ? `#${channelObj.name}` : 'New Message',
                  body: u.noteText
                }
              };
              messaging.sendEachForMulticast({ tokens, ...payload })
                .then(response => {
                  const failedTokens = [];
                  response.responses.forEach((resp, idx) => {
                    if (!resp.success && resp.error && resp.error.code === 'messaging/registration-token-not-registered') {
                      failedTokens.push(tokens[idx]);
                    }
                  });
                  if (failedTokens.length > 0) {
                    const placeholders = failedTokens.map(() => '?').join(',');
                    db.query(`DELETE FROM fcm_tokens WHERE token IN (${placeholders})`, failedTokens).catch(e => console.error('Error cleaning up tokens:', e));
                  }
                })
                .catch(e => console.error('FCM Error:', e));
            }
          })
          .catch(e => console.error('DB Error getting FCM tokens:', e));
      }
    }

    res.status(201).json({ message: msg });
  } catch (e) { next(e); }
}

async function edit(req, res, next) {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.user_id !== req.user.id && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Cannot edit others messages' });
    
    const perms = req.user.permissions || {};
    if (msg.user_id === req.user.id && !perms['edit-own'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing edit-own permission' });
    }
    
    const { body } = req.body;
    if (!body || body.length < 1) return res.status(400).json({ error: 'Body required' });
    const updated = await Message.update(req.params.id, body);
    updated.reactions = await Message.listReactions(req.params.id);
    emitToChannel(msg.channel_id, 'message:updated', updated);
    res.json({ message: updated });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const mem = await Channel.getMembership(msg.channel_id, req.user.id);
    const perms = req.user.permissions || {};
    
    let canDelete = false;
    if (req.user.role === 'superadmin') {
      canDelete = true;
    } else if (msg.user_id === req.user.id) {
      if (perms['delete-own']) canDelete = true;
    } else {
      if (mem?.can_delete_messages || mem?.is_manager) canDelete = true;
    }
    
    if (!canDelete) return res.status(403).json({ error: 'Cannot delete' });
    
    await Message.softDelete(req.params.id);
    await AuditLog.log(req.user.id, 'message.delete', 'message', req.params.id, { channel_id: msg.channel_id }, req.ip);
    emitToChannel(msg.channel_id, 'message:deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function react(req, res, next) {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });
    
    const perms = req.user.permissions || {};
    if (!perms['react'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing react permission' });
    }
    
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    await Reaction.toggle(req.params.id, req.user.id, emoji);
    const reactions = await Message.listReactions(req.params.id);
    emitToChannel(msg.channel_id, 'message:reactions', { id: req.params.id, reactions });
    res.json({ reactions });
  } catch (e) { next(e); }
}

async function togglePin(req, res, next) {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const mem = await Channel.getMembership(msg.channel_id, req.user.id);
    if (!mem?.can_pin_messages && !mem?.is_manager && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Cannot pin' });
    const updated = await Message.togglePin(req.params.id, !msg.is_pinned);
    updated.reactions = await Message.listReactions(req.params.id);
    emitToChannel(msg.channel_id, 'message:updated', updated);
    res.json({ message: updated });
  } catch (e) { next(e); }
}

async function search(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ messages: [] });
    
    const perms = req.user.permissions || {};
    const hasGlobalSearch = req.user.role === 'superadmin' || !!perms['search-history'];
    
    const results = await Message.search(req.user.id, q, hasGlobalSearch);
    res.json({ messages: results });
  } catch (e) { next(e); }
}

async function toggleSave(req, res, next) {
  try {
    const { id } = req.params;
    const save = req.body.saved !== undefined ? req.body.saved : req.body.save;
    await Message.toggleSave(req.user.id, id, save);
    res.json({ success: true, saved: !!save });
  } catch (err) {
    next(err);
  }
}

async function getSavedMessages(req, res, next) {
  try {
    const msgs = await Message.getSavedMessages(req.user.id);
    await attachReactions(msgs);
    res.json(msgs);
  } catch (err) {
    next(err);
  }
}

async function getThreads(req, res, next) {
  try {
    const msgs = await Message.getParticipatedThreads(req.user.id);
    await attachReactions(msgs);
    res.json(msgs);
  } catch (err) {
    next(err);
  }
}

async function getFiles(req, res, next) {
  try {
    const { db } = require('../db/connection');
    const [rows] = await db.query(
      `SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, c.slug AS channel_slug, c.name AS channel_name, c.type AS channel_type
       FROM messages m
       JOIN users u ON u.id = m.user_id
       JOIN channels c ON c.id = m.channel_id
       JOIN memberships mem ON mem.channel_id = c.id AND mem.user_id = :userId
       WHERE m.deleted_at IS NULL
         AND m.attachments IS NOT NULL 
         AND JSON_LENGTH(m.attachments) > 0
       ORDER BY m.created_at DESC
       LIMIT 50`,
      { userId: req.user.id }
    );
    await attachReactions(rows);
    res.json(rows);
  } catch (err) { next(err); }
}

async function getMentions(req, res, next) {
  try {
    const { db } = require('../db/connection');
    const [rows] = await db.query(
      `SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, c.slug AS channel_slug, c.name AS channel_name, c.type AS channel_type
       FROM messages m
       JOIN users u ON u.id = m.user_id
       JOIN channels c ON c.id = m.channel_id
       JOIN memberships mem ON mem.channel_id = c.id AND mem.user_id = :userId
       WHERE m.deleted_at IS NULL
         AND (
           JSON_CONTAINS(m.mentions, JSON_QUOTE(:userId))
           OR m.body LIKE :namePattern
         )
       ORDER BY m.created_at DESC
       LIMIT 15`,
      { userId: req.user.id, namePattern: `%@${req.user.name.replace(/ /g, '')}%` }
    );
    res.json({ mentions: rows });
  } catch (err) { next(err); }
}

module.exports = { list, listReplies, send, edit, remove, react, togglePin, search, toggleSave, getSavedMessages, getThreads, getMentions, markRead, getById, getFiles };

