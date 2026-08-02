const { db } = require('../db/connection');

/**
 * Mark a message as read by a user.
 */
async function markRead(userId, messageId) {
  await db.query(
    `INSERT IGNORE INTO message_reads (user_id, message_id) VALUES (?, ?)`,
    [userId, messageId]
  );
}

/**
 * Get the list of readers for a message (returns [{id, name, avatar_initials, avatar_color}]).
 * Excludes the message author.
 */
async function getReaders(messageId, authorId) {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.avatar_initials, u.avatar_color
     FROM message_reads mr
     JOIN users u ON u.id = mr.user_id
     WHERE mr.message_id = ? AND mr.user_id != ?
     ORDER BY mr.read_at ASC`,
    [messageId, authorId]
  );
  return rows;
}

/**
 * Bulk mark multiple messages as read at once.
 */
async function markManyRead(userId, messageIds) {
  if (!messageIds || messageIds.length === 0) return;
  const values = messageIds.map(mid => [userId, mid]);
  const placeholders = values.map(() => '(?, ?)').join(', ');
  const flat = values.flat();
  await db.query(
    `INSERT IGNORE INTO message_reads (user_id, message_id) VALUES ${placeholders}`,
    flat
  );
}

module.exports = { markRead, getReaders, markManyRead };
