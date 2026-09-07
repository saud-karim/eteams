const { db } = require('./src/db/connection');
async function test() {
  const [rows] = await db.query(
      `SELECT m.id, m.body, m.created_at, m.mentions, c.name AS channel_name
       FROM messages m
       JOIN users u ON u.id = m.user_id
       JOIN channels c ON c.id = m.channel_id
       WHERE JSON_CONTAINS(m.mentions, JSON_QUOTE('64753e33-ba17-4f90-9b9c-154c01d6a61e'), '$.users')
       ORDER BY m.created_at DESC
       LIMIT 5`
  );
  console.log('Admin Mentions:', rows);
  process.exit(0);
}
test();
