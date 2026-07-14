const { db } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class Broadcast {
  static async create({ type, recipients, messageBody, createdBy }) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO broadcasts (id, type, recipients, message_body, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, type, recipients, messageBody, createdBy]
    );
    const [rows] = await db.query(
      `SELECT b.*, u.name as sender_name, u.avatar_color as sender_color, u.avatar_initials as sender_initials
       FROM broadcasts b JOIN users u ON b.created_by = u.id WHERE b.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async getRecent(limit = 20) {
    const [rows] = await db.query(
      `SELECT b.*, u.name as sender_name, u.avatar_color as sender_color, u.avatar_initials as sender_initials
       FROM broadcasts b JOIN users u ON b.created_by = u.id
       ORDER BY b.created_at DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }
}

module.exports = Broadcast;
