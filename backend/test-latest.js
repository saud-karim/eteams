const { db } = require('./src/db/connection');
async function test() {
  const [rows] = await db.query(
      `SELECT m.id, m.body, m.created_at, m.mentions, u.name as author
       FROM messages m
       JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC
       LIMIT 10`
  );
  console.log('Latest messages:', rows);
  process.exit(0);
}
test();
