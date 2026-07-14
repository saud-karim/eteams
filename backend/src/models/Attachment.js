const { db } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

async function create(data) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO attachments (id, message_id, filename, original_name, mime_type, size_bytes, storage_key)
     VALUES (:id, :message_id, :filename, :original_name, :mime_type, :size_bytes, :storage_key)`,
    { id, ...data }
  );
  return findById(id);
}

async function findById(id) {
  const [rows] = await db.query(`SELECT * FROM attachments WHERE id = :id`, { id });
  return rows[0] || null;
}

async function listByMessage(messageId) {
  const [rows] = await db.query(`SELECT * FROM attachments WHERE message_id = :messageId ORDER BY created_at ASC`, { messageId });
  return rows;
}

async function listByMessages(messageIds) {
  if (!messageIds || messageIds.length === 0) return [];
  const [rows] = await db.query(`SELECT * FROM attachments WHERE message_id IN (?) ORDER BY created_at ASC`, [messageIds]);
  return rows;
}

module.exports = { create, findById, listByMessage, listByMessages };
