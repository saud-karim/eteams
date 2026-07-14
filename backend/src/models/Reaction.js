const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/connection');

async function toggle(messageId, userId, emoji) {
  const [rows] = await db.query(
    `SELECT id FROM reactions WHERE message_id = :messageId AND user_id = :userId AND emoji = :emoji`,
    { messageId, userId, emoji }
  );
  if (rows.length) {
    await db.query(`DELETE FROM reactions WHERE id = :id`, { id: rows[0].id });
    return { added: false };
  }
  await db.query(
    `INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (:id, :messageId, :userId, :emoji)`,
    { id: uuidv4(), messageId, userId, emoji }
  );
  return { added: true };
}

module.exports = { toggle };
