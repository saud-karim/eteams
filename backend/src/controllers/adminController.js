const User = require('../models/User');
const Channel = require('../models/Channel');
const AuditLog = require('../models/AuditLog');
const RolePreset = require('../models/RolePreset');
const { emitToUser, getIo } = require('../sockets');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function getAuditLogs(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const logs = await AuditLog.list({ limit: 100, offset: 0 });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { db } = require('../db/connection');
    const [[{c: totalUsers}]] = await db.query('SELECT COUNT(*) as c FROM users');
    const [[{c: activeSessions}]] = await db.query("SELECT COUNT(*) as c FROM users WHERE presence = 'online'");
    const [[{c: totalChannels}]] = await db.query('SELECT COUNT(*) as c FROM channels');
    const [[{c: totalMessages}]] = await db.query('SELECT COUNT(*) as c FROM messages');
    const [[{s: storageBytes}]] = await db.query('SELECT SUM(size_bytes) as s FROM attachments');
    
    // 1. Activity Chart (messages per day for last 12 days)
    const [activityRows] = await db.query(`
      SELECT DATE(created_at) as d, COUNT(*) as c 
      FROM messages 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `);
    
    const activityChart = Array(12).fill(0);
    const today = new Date();
    today.setHours(0,0,0,0);
    activityRows.forEach(row => {
      const rowDate = new Date(row.d);
      rowDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today - rowDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 12) {
        activityChart[11 - diffDays] = row.c;
      }
    });

    // 2. Most Active Channels
    const [mostActiveChannels] = await db.query(`
      SELECT c.name as n, COUNT(DISTINCT m.id) as msgs, COUNT(DISTINCT r.id) as reacts
      FROM channels c
      LEFT JOIN messages m ON m.channel_id = c.id AND m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      LEFT JOIN reactions r ON r.message_id = m.id AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY c.id
      ORDER BY msgs DESC, reacts DESC
      LIMIT 5
    `);

    // 3. Recent Admin Actions
    const recentAdminActions = await AuditLog.list({ limit: 5, offset: 0 });

    res.json({ 
      stats: {
        totalUsers,
        activeSessions,
        totalChannels,
        totalMessages,
        storageBytes: storageBytes || 0,
        activityChart,
        mostActiveChannels,
        recentAdminActions
      }
    });
  } catch (err) {
    next(err);
  }
}


async function getUsers(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { db } = require('../db/connection');
    const [rows] = await db.query('SELECT id, username, name, avatar_initials, avatar_color, role, department, job_title, presence, status_text, last_seen_at, is_active, reports_to, employment_type, role_preset, permissions, approval_status FROM users WHERE approval_status = "approved" ORDER BY name ASC');
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
}

async function getPendingUsers(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const users = await User.findPending();
    res.json({ users });
  } catch (err) { next(err); }
}

async function approveUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { department, reports_to, employment_type } = req.body;
    
    // Partially update if admin made changes
    const user = await User.findByIdAnyStatus(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (department !== undefined || reports_to !== undefined || employment_type !== undefined) {
      await User.update(id, {
        ...user,
        department: department !== undefined ? department : user.department,
        reports_to: reports_to !== undefined ? reports_to : user.reports_to,
        employment_type: employment_type !== undefined ? employment_type : user.employment_type
      });
    }

    await User.updateApproval(id, 'approved', 1);
    await AuditLog.log(req.user.id, 'user.approve', 'user', id, null, req.ip);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function rejectUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    await User.updateApproval(id, 'rejected', 0);
    await AuditLog.log(req.user.id, 'user.reject', 'user', id, null, req.ip);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function deactivateUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });
    
    // In a real app we'd update is_active in DB. The User model might not have deactivate yet.
    // Let's just do a direct DB call if User model doesn't have it.
    const { db } = require('../db/connection');
    await db.query('UPDATE users SET is_active = 0, presence = :presence WHERE id = :id', { presence: 'offline', id });
    
    await AuditLog.log(req.user.id, 'user.deactivate', 'user', id, null, req.ip);
    
    // Force logout the user so they can't make further requests
    emitToUser(id, 'force_logout', { message: 'Your account has been deactivated.' });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function reactivateUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    
    const { db } = require('../db/connection');
    await db.query('UPDATE users SET is_active = 1 WHERE id = :id', { id });
    
    await AuditLog.log(req.user.id, 'user.reactivate', 'user', id, null, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function forceLogoutUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    
    await AuditLog.log(req.user.id, 'user.force_logout', 'user', id, null, req.ip);
    emitToUser(id, 'force_logout', { message: 'An administrator ended your session.' });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) return res.status(400).json({ error: 'New password is required' });
    
    const hash = await bcrypt.hash(newPassword, 10);
    
    const { db } = require('../db/connection');
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    
    await AuditLog.log(req.user.id, 'user.reset_password', 'user', id, null, req.ip);
    emitToUser(id, 'force_logout', { message: 'Your password was reset by an administrator.' });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { name, username, department, role, password, job_title, reports_to, employment_type, role_preset, permissions, initial_channels } = req.body;
    
    if (!name || !username || !password) return res.status(400).json({ error: 'Name, username, and password are required' });
    
    const existing = await User.findByUsername(username);
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const avatar_initials = name.substring(0, 2).toUpperCase();
    const avatar_color = 'var(--emerald)'; // Default color
    
    const user = await User.create({
      id, username, password_hash, name, avatar_initials, avatar_color, role: role || 'user', department: department || '', job_title: job_title || '',
      reports_to: reports_to || null, employment_type: employment_type || 'Full-time employee', role_preset: role_preset || 'standard', permissions: permissions || null
    });

    if (Array.isArray(initial_channels) && initial_channels.length > 0) {
      const Channel = require('../models/Channel');
      for (const channelId of initial_channels) {
        await Channel.addMember(channelId, id);
      }
    }
    
    await AuditLog.log(req.user.id, 'user.create', 'user', id, { username, role_preset }, req.ip);
    
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function getUserChannels(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { db } = require('../db/connection');
    const [rows] = await db.query('SELECT channel_id FROM memberships WHERE user_id = :id', { id });
    res.json({ channels: rows.map(r => r.channel_id) });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { name, username, department, role, job_title, reports_to, employment_type, role_preset, permissions, initial_channels } = req.body;
    
    const user = await User.update(id, { name, username, department, role, job_title: job_title || '', reports_to: reports_to || null, employment_type: employment_type || 'Full-time employee', role_preset: role_preset || 'standard', permissions: permissions || null });
    
    if (Array.isArray(initial_channels)) {
      const Channel = require('../models/Channel');
      const { db } = require('../db/connection');
      const [rows] = await db.query('SELECT channel_id FROM memberships WHERE user_id = :id', { id });
      const currentChannelIds = rows.map(r => r.channel_id);
      
      const toAdd = initial_channels.filter(cId => !currentChannelIds.includes(cId));
      const toRemove = currentChannelIds.filter(cId => !initial_channels.includes(cId));

      for (const cId of toAdd) await Channel.addMember(cId, id);
      for (const cId of toRemove) await Channel.removeMember(cId, id);
    }

    await AuditLog.log(req.user.id, 'user.update', 'user', id, { name, username, department, role }, req.ip);

    emitToUser(id, 'user:permissions_updated', { role, permissions, role_preset });
    
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function importUsers(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { users } = req.body;
    if (!Array.isArray(users)) return res.status(400).json({ error: 'Expected array of users' });
    
    const password_hash = await bcrypt.hash('Welcome@123', 10);
    const createdUsers = [];
    
    for (const u of users) {
      if (!u.username || !u.name) continue;
      const existing = await User.findByUsername(u.username);
      if (existing) continue;
      
      const id = uuidv4();
      const avatar_initials = u.name.substring(0, 2).toUpperCase();
      const avatar_color = 'var(--blue)';
      const user = await User.create({
        id, username: u.username, password_hash, name: u.name, 
        avatar_initials, avatar_color, role: 'user', 
        department: u.department || '', job_title: u.jobTitle || ''
      });
      createdUsers.push(user);
    }
    
    if (createdUsers.length > 0) {
      await AuditLog.log(req.user.id, 'user.import', 'user', null, { count: createdUsers.length }, req.ip);
    }
    
    res.json({ success: true, imported: createdUsers.length });
  } catch (err) {
    next(err);
  }
}


async function getChannels(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const channels = await Channel.adminListAll();
    res.json({ channels });
  } catch (err) {
    next(err);
  }
}

async function getChannelManagers(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { db } = require('../db/connection');
    
    const [rows] = await db.query(`
      SELECT 
        m.user_id, m.channel_id,
        u.name as u,
        c.name as ch,
        m.is_manager,
        m.can_post, m.can_add_members, m.can_remove_members, 
        m.can_pin_messages, m.can_edit_topic, m.can_delete_messages,
        m.joined_at as 'when'
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      WHERE m.is_manager = 1 
         OR m.can_add_members = 1 
         OR m.can_remove_members = 1 
         OR m.can_pin_messages = 1 
         OR m.can_delete_messages = 1
         OR m.can_edit_topic = 1
         OR (c.is_readonly = 1 AND m.can_post = 1)
         OR (c.is_readonly = 0 AND m.can_post = 0)
      ORDER BY m.joined_at DESC
    `);
    res.json({ managers: rows });
  } catch (err) {
    next(err);
  }
}


async function updateChannel(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { name, description, type, is_readonly, is_mandatory } = req.body;
    
    // Check old state to see if it just became mandatory
    const oldChannel = await Channel.findById(id);
    if (!oldChannel) return res.status(404).json({ error: 'Channel not found' });

    const newIsMandatory = is_mandatory ? 1 : 0;
    
    const channel = await Channel.update(id, { name, description, type, is_readonly: is_readonly ? 1 : 0, is_mandatory: newIsMandatory });
    
    // If it just became mandatory, add all missing users
    if (newIsMandatory === 1 && oldChannel.is_mandatory !== 1) {
      const allUsers = await User.findAll();
      for (const u of allUsers) {
        if (u.id !== req.user.id) {
           await Channel.addMember(id, u.id, { is_manager: 0 }); // ignore dupes implicitly if DB handles it, or just run it
        }
      }
    }

    await AuditLog.log(req.user.id, 'channel.update', 'channel', id, { name, type, is_mandatory: newIsMandatory }, req.ip);
    
    res.json({ success: true, channel });
  } catch (err) {
    next(err);
  }
}

async function archiveChannel(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    
    await Channel.archive(id);
    await AuditLog.log(req.user.id, 'channel.archive', 'channel', id, null, req.ip);
    
    const io = getIo();
    io.emit('channel_archived', { channelId: id });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function assignChannelManager(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { userId, is_manager, can_post, can_add_members, can_remove_members, can_pin_messages, can_edit_topic, can_delete_messages } = req.body;
    
    const { db } = require('../db/connection');
    const User = require('../models/User');
    
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    const targetPerms = typeof targetUser.permissions === 'string' ? JSON.parse(targetUser.permissions) : (targetUser.permissions || {});
    if (!targetPerms['be-manager'] && targetUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Target user lacks the be-manager permission' });
    }
    
    // Insert or update membership
    await db.query(`
      INSERT INTO memberships (id, channel_id, user_id, is_manager, can_post, can_add_members, can_remove_members, can_pin_messages, can_edit_topic, can_delete_messages)
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        is_manager = ?, can_post = ?, can_add_members = ?, can_remove_members = ?, can_pin_messages = ?, can_edit_topic = ?, can_delete_messages = ?
    `, [
      id, userId, 
      is_manager ? 1 : 0, can_post ? 1 : 0, can_add_members ? 1 : 0, can_remove_members ? 1 : 0, can_pin_messages ? 1 : 0, can_edit_topic ? 1 : 0, can_delete_messages ? 1 : 0,
      is_manager ? 1 : 0, can_post ? 1 : 0, can_add_members ? 1 : 0, can_remove_members ? 1 : 0, can_pin_messages ? 1 : 0, can_edit_topic ? 1 : 0, can_delete_messages ? 1 : 0
    ]);

    await AuditLog.log(req.user.id, 'channel.assign_manager', 'channel', id, { userId, is_manager, can_post }, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function revokeChannelManager(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const { id, userId } = req.params;
    
    const { db } = require('../db/connection');
    
    await db.query(`
      UPDATE memberships 
      SET is_manager = 0, can_post = 1, can_add_members = 0, can_remove_members = 0, can_pin_messages = 0, can_edit_topic = 0, can_delete_messages = 0
      WHERE channel_id = ? AND user_id = ?
    `, [id, userId]);

    await AuditLog.log(req.user.id, 'channel.revoke_manager', 'channel', id, { userId }, req.ip);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getRolePresets(req, res, next) {
  try {
    const presets = await RolePreset.findAll();
    res.json({ presets });
  } catch (err) { next(err); }
}

async function createRolePreset(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const preset = await RolePreset.create(req.body);
    res.json({ preset });
  } catch (err) { next(err); }
}

async function updateRolePreset(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const preset = await RolePreset.update(req.params.id, req.body);
    res.json({ preset });
  } catch (err) { next(err); }
}

async function deleteRolePreset(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    await RolePreset.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = {
  getAuditLogs,
  getStats,
  getUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  deactivateUser,
  reactivateUser,
  forceLogoutUser,
  resetUserPassword,
  getUserChannels,
  createUser,
  updateUser,
  importUsers,
  getChannels,
  getChannelManagers,
  updateChannel,
  archiveChannel,
  assignChannelManager,
  revokeChannelManager,
  getRolePresets,
  createRolePreset,
  updateRolePreset,
  deleteRolePreset
};
