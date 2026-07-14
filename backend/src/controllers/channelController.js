const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const Channel = require('../models/Channel');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { slugify } = require('../utils/slugify');

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  type: z.enum(['public', 'private', 'announcement']).default('public'),
  is_mandatory: z.boolean().optional().default(false),
});

async function myChannels(req, res, next) {
  try { res.json({ channels: await Channel.listForUser(req.user.id) }); } catch (e) { next(e); }
}

async function getBySlug(req, res, next) {
  try {
    const ch = await Channel.findBySlug(req.params.slug);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    const isMember = await Channel.isMember(ch.id, req.user.id);
    if (ch.type === 'private' && !isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Not a member' });
    }
    const members = await Channel.listMembers(ch.id);
    res.json({ channel: ch, members, membership: await Channel.getMembership(ch.id, req.user.id) });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const perms = req.user.permissions || {};
    
    if (data.type === 'public') {
      if (!perms['create-public'] && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Missing create-public permission' });
      }
    } else if (data.type === 'announcement') {
      if (!perms['create-announcement'] && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Missing create-announcement permission' });
      }
    } else if (data.type === 'private') {
      if (!perms['create-private'] && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Missing create-private permission' });
      }
    }
    const id = uuidv4();
    const slug = slugify(data.name);
    const channel = await Channel.create({
      id, slug,
      name: data.name,
      description: data.description || null,
      type: data.type,
      is_mandatory: data.is_mandatory ? 1 : 0,
      is_readonly: data.type === 'announcement' ? 1 : 0,
      created_by: req.user.id,
    });
    
    // Add the creator as a manager
    await Channel.addMember(id, req.user.id, { is_manager: 1, can_post: 1, can_add_members: 1, can_remove_members: 1, can_pin_messages: 1, can_edit_topic: 1, can_delete_messages: 1 });
    
    // If mandatory, add all active users
    if (data.is_mandatory) {
      const allUsers = await User.findAll();
      for (const u of allUsers) {
        if (u.id !== req.user.id) {
          // Announcement logic means only superadmins or managers can post, so defaults are fine.
          await Channel.addMember(id, u.id, { is_manager: 0 });
        }
      }
    }

    await AuditLog.log(req.user.id, 'channel.create', 'channel', id, { name: data.name, type: data.type, is_mandatory: data.is_mandatory }, req.ip);
    res.status(201).json({ channel });
  } catch (e) { next(e); }
}

async function createDM(req, res, next) {
  try {
    const { targetUserId, targetUserIds } = req.body;
    let ids = targetUserIds || (targetUserId ? [targetUserId] : []);
    if (!ids || ids.length === 0) return res.status(400).json({ error: 'targetUserIds required' });
    if (ids.includes(req.user.id)) return res.status(400).json({ error: 'Cannot DM yourself' });
    if (ids.length > 9) return res.status(400).json({ error: 'Maximum 9 people in a Group DM' });

    const perms = req.user.permissions || {};
    if (ids.length > 1 && !perms['group-dm'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing group-dm permission' });
    }

    const targets = await Promise.all(ids.map(id => User.findById(id)));
    if (targets.includes(null)) return res.status(404).json({ error: 'One or more target users not found' });
    
    if (!perms['dm-anyone'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Missing dm-anyone permission' });
    }
    
    const hasExec = targets.some(t => t.role_preset === 'executive' || t.role === 'superadmin' || t.department?.toLowerCase() === 'executive');
    if (hasExec && !perms['dm-exec'] && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'You do not have permission to message executives directly.' });
    }

    const sortedIds = [req.user.id, ...ids].sort();
    const slug = `dm-${sortedIds.join('-')}`;

    let ch = await Channel.findBySlug(slug);
    if (ch) {
      return res.json({ channel: ch });
    }

    const allNames = [req.user.name, ...targets.map(t => t.name)].join(', ');

    const id = uuidv4();
    ch = await Channel.create({
      id, slug,
      name: allNames.length > 100 ? allNames.substring(0, 97) + '...' : allNames,
      description: ids.length > 1 ? 'Group Direct Message' : 'Direct Message',
      type: 'dm',
      is_mandatory: 0,
      is_readonly: 0,
      created_by: req.user.id,
    });
    
    await Channel.addMember(id, req.user.id, { is_manager: 1 });
    for (const uid of ids) {
      await Channel.addMember(id, uid, { is_manager: 1 });
    }
    
    await AuditLog.log(req.user.id, 'channel.dm', 'channel', id, { targetUserIds: ids }, req.ip);
    res.status(201).json({ channel: ch });
  } catch (e) { next(e); }
}

async function addMember(req, res, next) {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    const { userId, isManager, permissions } = req.body;
    if (req.user.role !== 'superadmin') {
      const perms = req.user.permissions || {};
      const isSelfJoin = req.user.id === userId;
      
      if (isSelfJoin) {
        if (ch.type === 'private' && !perms['join-any']) {
          return res.status(403).json({ error: 'Cannot join private channel without invite' });
        }
      } else {
        const mem = await Channel.getMembership(ch.id, req.user.id);
        if (!mem || (!mem.can_add_members && !mem.is_manager)) {
          // Check if it's an invite-guest situation (if target is guest). 
          // For now just enforce can_add_members.
          return res.status(403).json({ error: 'Cannot add members' });
        }
      }
    }
    await Channel.addMember(ch.id, userId, { is_manager: isManager ? 1 : 0, ...(permissions || {}) });
    await AuditLog.log(req.user.id, 'channel.add_member', 'channel', ch.id, { userId, isManager }, req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try {
    await Channel.markRead(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function leaveChannel(req, res, next) {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (ch.type === 'announcement') return res.status(403).json({ error: 'Cannot leave announcement channels' });
    await Channel.removeMember(ch.id, req.user.id);
    await AuditLog.log(req.user.id, 'channel.leave', 'channel', ch.id, {}, req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function removeMember(req, res, next) {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (req.user.role !== 'superadmin') {
      const mem = await Channel.getMembership(ch.id, req.user.id);
      if (!mem || (!mem.can_remove_members && !mem.is_manager)) return res.status(403).json({ error: 'Cannot remove members' });
    }
    const { userId } = req.params;
    await Channel.removeMember(ch.id, userId);
    await AuditLog.log(req.user.id, 'channel.remove_member', 'channel', ch.id, { userId }, req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function deleteChannel(req, res, next) {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (ch.created_by !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only the creator or superadmin can delete this channel' });
    }
    await Channel.deleteChannel(ch.id);
    await AuditLog.log(req.user.id, 'channel.delete', 'channel', ch.id, { name: ch.name }, req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function updateMemberPermissions(req, res, next) {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    // Check if the requester is superadmin or a channel manager
    if (req.user.role !== 'superadmin') {
      const requesterMem = await Channel.getMembership(ch.id, req.user.id);
      if (!requesterMem || !requesterMem.is_manager) {
        return res.status(403).json({ error: 'Only channel managers can update permissions' });
      }
    }
    
    const { userId } = req.params;
    const targetMem = await Channel.getMembership(ch.id, userId);
    if (!targetMem) return res.status(404).json({ error: 'User is not a member of this channel' });
    
    const permissions = req.body;
    
    // Merge existing permissions with the updates
    let updatedPerms = {
      is_manager: permissions.is_manager !== undefined ? (permissions.is_manager ? 1 : 0) : (targetMem.is_manager || 0),
      can_post: permissions.can_post !== undefined ? (permissions.can_post ? 1 : 0) : (targetMem.can_post || 0),
      can_add_members: permissions.can_add_members !== undefined ? (permissions.can_add_members ? 1 : 0) : (targetMem.can_add_members || 0),
      can_remove_members: permissions.can_remove_members !== undefined ? (permissions.can_remove_members ? 1 : 0) : (targetMem.can_remove_members || 0),
      can_pin_messages: permissions.can_pin_messages !== undefined ? (permissions.can_pin_messages ? 1 : 0) : (targetMem.can_pin_messages || 0),
      can_edit_topic: permissions.can_edit_topic !== undefined ? (permissions.can_edit_topic ? 1 : 0) : (targetMem.can_edit_topic || 0),
      can_delete_messages: permissions.can_delete_messages !== undefined ? (permissions.can_delete_messages ? 1 : 0) : (targetMem.can_delete_messages || 0)
    };

    if (updatedPerms.is_manager) {
      updatedPerms.can_post = 1;
      updatedPerms.can_add_members = 1;
      updatedPerms.can_remove_members = 1;
      updatedPerms.can_pin_messages = 1;
      updatedPerms.can_edit_topic = 1;
      updatedPerms.can_delete_messages = 1;
    }
    
    await Channel.updateMembership(ch.id, userId, updatedPerms);
    await AuditLog.log(req.user.id, 'channel.update_member_permissions', 'channel', ch.id, { userId, permissions: updatedPerms }, req.ip);
    
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { myChannels, getBySlug, create, createDM, addMember, removeMember, markRead, leaveChannel, deleteChannel, updateMemberPermissions };

