const { db } = require('../db/connection');

async function findById(id) {
  const [rows] = await db.query(
    `SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, u.role AS author_role
     FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = :id AND m.deleted_at IS NULL`,
    { id }
  );
  return rows[0] || null;
}

async function listByChannel(channelId, { limit = 50, before = null, userId = null } = {}) {
  let sql = `
    SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, u.role AS author_role
    ${userId ? `, (SELECT 1 FROM saved_messages sm WHERE sm.message_id = m.id AND sm.user_id = :userId) AS is_saved` : ''}
    FROM messages m JOIN users u ON u.id = m.user_id
    WHERE m.channel_id = :channelId AND m.deleted_at IS NULL AND m.parent_id IS NULL`;
  const params = { channelId, limit, userId };
  if (before) {
    sql += ` AND m.created_at < :before`;
    params.before = before;
  }
  sql += ` ORDER BY m.created_at DESC LIMIT :limit`;
  const [rows] = await db.query(sql, params);
  return rows.reverse();
}

async function listReplies(parentId, { limit = 50, before = null, userId = null } = {}) {
  let sql = `
    SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, u.role AS author_role
    ${userId ? `, (SELECT 1 FROM saved_messages sm WHERE sm.message_id = m.id AND sm.user_id = :userId) AS is_saved` : ''}
    FROM messages m JOIN users u ON u.id = m.user_id
    WHERE m.parent_id = :parentId AND m.deleted_at IS NULL`;
  const params = { parentId, limit, userId };
  if (before) {
    sql += ` AND m.created_at < :before`;
    params.before = before;
  }
  sql += ` ORDER BY m.created_at ASC LIMIT :limit`;
  
  // Note: For replies, sorting ascending means newest is at bottom.
  // If we want pagination going backward (loading older replies), we'd order DESC, then reverse.
  if (before) {
    sql = sql.replace('ASC', 'DESC');
    const [rows] = await db.query(sql, params);
    return rows.reverse();
  } else {
    // Standard fetch (oldest to newest) - but what if there's >50? We want newest 50.
    sql = sql.replace('ASC', 'DESC');
    const [rows] = await db.query(sql, params);
    return rows.reverse();
  }
}

async function listAllForExport(channelId) {
  const [rows] = await db.query(
    `SELECT m.*, u.name AS author_name
     FROM messages m JOIN users u ON u.id = m.user_id
     WHERE m.channel_id = :channelId
     ORDER BY m.created_at ASC`,
    { channelId }
  );
  return rows;
}

async function create(data) {
  await db.query(
    `INSERT INTO messages (id, channel_id, user_id, parent_id, body, mentions)
     VALUES (:id, :channel_id, :user_id, :parent_id, :body, :mentions)`,
    { ...data, mentions: data.mentions ? JSON.stringify(data.mentions) : null }
  );
  return findById(data.id);
}

async function update(id, body) {
  await db.query(`UPDATE messages SET body = :body, edited_at = NOW() WHERE id = :id`, { id, body });
  return findById(id);
}

async function softDelete(id) {
  await db.query(`UPDATE messages SET deleted_at = NOW() WHERE id = :id`, { id });
}

async function togglePin(id, pinned) {
  await db.query(`UPDATE messages SET is_pinned = :p WHERE id = :id`, { id, p: pinned ? 1 : 0 });
  return findById(id);
}

async function listReactions(messageId) {
  const [rows] = await db.query(
    `SELECT emoji, COUNT(*) AS count, GROUP_CONCAT(user_id) AS user_ids
     FROM reactions WHERE message_id = :messageId GROUP BY emoji`,
    { messageId }
  );
  return rows.map(r => ({ emoji: r.emoji, count: r.count, user_ids: (r.user_ids || '').split(',') }));
}

async function search(userId, query, hasGlobalSearch, { limit = 30 } = {}) {
  let sql;
  if (hasGlobalSearch) {
    // Can search anything they are a member of, PLUS any public channel
    sql = `SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, c.slug AS channel_slug, c.name AS channel_name
      FROM messages m
      JOIN users u ON u.id = m.user_id
      JOIN channels c ON c.id = m.channel_id
      LEFT JOIN memberships mem ON mem.channel_id = c.id AND mem.user_id = :userId
      WHERE m.deleted_at IS NULL AND m.body LIKE CONCAT('%', :q, '%')
      AND (mem.user_id = :userId OR c.type = 'public' OR c.type = 'announce')
      ORDER BY m.created_at DESC LIMIT :limit`;
  } else {
    // Strict membership only
    sql = `SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, c.slug AS channel_slug, c.name AS channel_name
      FROM messages m
      JOIN users u ON u.id = m.user_id
      JOIN channels c ON c.id = m.channel_id
      JOIN memberships mem ON mem.channel_id = c.id AND mem.user_id = :userId
      WHERE m.deleted_at IS NULL AND m.body LIKE CONCAT('%', :q, '%')
      ORDER BY m.created_at DESC LIMIT :limit`;
  }

  const [rows] = await db.query(sql, { userId, q: query, limit });
  return rows;
}

async function toggleSave(userId, messageId, save) {
  if (save) {
    await db.query(`INSERT IGNORE INTO saved_messages (user_id, message_id) VALUES (:userId, :messageId)`, { userId, messageId });
  } else {
    await db.query(`DELETE FROM saved_messages WHERE user_id = :userId AND message_id = :messageId`, { userId, messageId });
  }
}

async function getSavedMessages(userId) {
  const [rows] = await db.query(
    `SELECT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, c.slug AS channel_slug, c.name AS channel_name, 1 AS is_saved
     FROM saved_messages sm
     JOIN messages m ON m.id = sm.message_id
     JOIN users u ON u.id = m.user_id
     JOIN channels c ON c.id = m.channel_id
     WHERE sm.user_id = :userId AND m.deleted_at IS NULL
     ORDER BY sm.saved_at DESC`,
    { userId }
  );
  return rows;
}

async function getParticipatedThreads(userId) {
  // Fetch root messages where user participated (authored root, authored reply, or mentioned)
  const [rows] = await db.query(
    `SELECT DISTINCT m.*, u.name AS author_name, u.avatar_initials, u.avatar_color, c.slug AS channel_slug, c.name AS channel_name,
     (SELECT 1 FROM saved_messages sm WHERE sm.message_id = m.id AND sm.user_id = :userId) AS is_saved
     FROM messages m
     JOIN users u ON u.id = m.user_id
     JOIN channels c ON c.id = m.channel_id
     LEFT JOIN messages replies ON replies.parent_id = m.id AND replies.deleted_at IS NULL
     WHERE m.parent_id IS NULL AND m.deleted_at IS NULL
       AND (
         m.user_id = :userId
         OR replies.user_id = :userId
         OR JSON_CONTAINS(m.mentions, JSON_QUOTE(:userId))
         OR JSON_CONTAINS(replies.mentions, JSON_QUOTE(:userId))
       )
     ORDER BY (SELECT COALESCE(MAX(r.created_at), m.created_at) FROM messages r WHERE r.parent_id = m.id) DESC`,
    { userId }
  );
  return rows;
}

module.exports = { findById, listByChannel, listReplies, listAllForExport, create, update, softDelete, togglePin, listReactions, search, toggleSave, getSavedMessages, getParticipatedThreads };
