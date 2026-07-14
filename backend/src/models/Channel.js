const { db } = require('../db/connection');

async function findById(id) {
  const [rows] = await db.query(`SELECT * FROM channels WHERE id = :id AND archived_at IS NULL`, { id });
  return rows[0] || null;
}

async function findBySlug(slug) {
  const [rows] = await db.query(`SELECT * FROM channels WHERE slug = :slug AND archived_at IS NULL`, { slug });
  return rows[0] || null;
}

async function listForUser(userId) {
  const [rows] = await db.query(
    `SELECT c.*, m.last_read_at, m.is_manager,
            (SELECT COUNT(*) FROM messages msg WHERE msg.channel_id = c.id AND msg.deleted_at IS NULL
             AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)) AS unread_count,
            (SELECT COUNT(*) FROM messages msg WHERE msg.channel_id = c.id AND msg.deleted_at IS NULL
             AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)
             AND (JSON_CONTAINS(msg.mentions, JSON_QUOTE(:userId), '$.users') = 1
                  OR JSON_CONTAINS(msg.mentions, '"channel"', '$.special') = 1
                  OR JSON_CONTAINS(msg.mentions, '"everyone"', '$.special') = 1)) AS mention_count
     FROM channels c
     JOIN memberships m ON m.channel_id = c.id
     WHERE m.user_id = :userId AND c.archived_at IS NULL
     ORDER BY c.type, c.name`,
    { userId }
  );
  return rows;
}

async function adminListAll() {
  const [rows] = await db.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM memberships m WHERE m.channel_id = c.id) AS member_count,
            (SELECT COUNT(*) FROM messages msg WHERE msg.channel_id = c.id AND msg.deleted_at IS NULL) AS message_count
     FROM channels c
     WHERE c.archived_at IS NULL
     ORDER BY c.created_at DESC`
  );
  return rows;
}

async function create(data) {
  await db.query(
    `INSERT INTO channels (id, slug, name, description, type, is_mandatory, is_readonly, created_by)
     VALUES (:id, :slug, :name, :description, :type, :is_mandatory, :is_readonly, :created_by)`,
    data
  );
  return findById(data.id);
}

async function memberCount(channelId) {
  const [rows] = await db.query(`SELECT COUNT(*) AS c FROM memberships WHERE channel_id = :channelId`, { channelId });
  return rows[0].c;
}

async function listMembers(channelId) {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.avatar_initials, u.avatar_color, u.role, u.job_title, u.presence,
            m.is_manager, m.can_post, m.can_add_members, m.can_remove_members, m.can_pin_messages, m.can_edit_topic, m.can_delete_messages, m.joined_at
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.channel_id = :channelId AND u.is_active = 1
     ORDER BY m.is_manager DESC, u.name ASC`,
    { channelId }
  );
  return rows;
}

async function addMember(channelId, userId, opts = {}) {
  const { v4: uuidv4 } = require('uuid');
  const [chRows] = await db.query('SELECT is_readonly FROM channels WHERE id = :channelId', { channelId });
  const isReadOnly = chRows[0]?.is_readonly ? 1 : 0;
  
  const perms = { is_manager: 0, can_post: isReadOnly ? 0 : 1, can_add_members: 0, can_remove_members: 0, can_pin_messages: 0, can_edit_topic: 0, can_delete_messages: 0, ...opts };
  await db.query(
    `INSERT IGNORE INTO memberships (id, channel_id, user_id, is_manager, can_post, can_add_members, can_remove_members, can_pin_messages, can_edit_topic, can_delete_messages)
     VALUES (:id, :channelId, :userId, :is_manager, :can_post, :can_add_members, :can_remove_members, :can_pin_messages, :can_edit_topic, :can_delete_messages)`,
    { id: uuidv4(), channelId, userId, ...perms }
  );
}

async function isMember(channelId, userId) {
  const [rows] = await db.query(`SELECT 1 FROM memberships WHERE channel_id = :channelId AND user_id = :userId`, { channelId, userId });
  return rows.length > 0;
}

async function getMembership(channelId, userId) {
  const [rows] = await db.query(`SELECT * FROM memberships WHERE channel_id = :channelId AND user_id = :userId`, { channelId, userId });
  return rows[0] || null;
}

async function markRead(channelId, userId) {
  await db.query(`UPDATE memberships SET last_read_at = NOW() WHERE channel_id = :channelId AND user_id = :userId`, { channelId, userId });
}

async function removeMember(channelId, userId) {
  await db.query(`DELETE FROM memberships WHERE channel_id = :channelId AND user_id = :userId`, { channelId, userId });
}

async function deleteChannel(channelId) {
  await db.query(`DELETE FROM channels WHERE id = :channelId`, { channelId });
}

async function archive(channelId) {
  await db.query(`UPDATE channels SET archived_at = NOW() WHERE id = :channelId`, { channelId });
}

async function update(channelId, data) {
  await db.query(
    `UPDATE channels SET name = :name, description = :description, type = :type, is_readonly = :is_readonly, is_mandatory = :is_mandatory WHERE id = :id`,
    { id: channelId, ...data }
  );
  return findById(channelId);
}

async function updateMembership(channelId, userId, data) {
  await db.query(
    `UPDATE memberships SET 
      is_manager = :is_manager, 
      can_post = :can_post, 
      can_add_members = :can_add_members, 
      can_remove_members = :can_remove_members, 
      can_pin_messages = :can_pin_messages, 
      can_edit_topic = :can_edit_topic, 
      can_delete_messages = :can_delete_messages 
     WHERE channel_id = :channelId AND user_id = :userId`,
    { channelId, userId, ...data }
  );
}

module.exports = { findById, findBySlug, listForUser, adminListAll, create, memberCount, listMembers, addMember, removeMember, deleteChannel, archive, update, isMember, getMembership, markRead, updateMembership };
