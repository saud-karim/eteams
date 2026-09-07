const { db } = require('./src/db/connection');
async function test() {
  const [users] = await db.query('SELECT id, name FROM users WHERE username = "admin" OR username = "saud_karim"');
  const adminUser = users.find(u => u.name.toLowerCase() === 'admin');
  
  const [rows] = await db.query(
      `SELECT m.id, m.body, m.mentions, c.name AS channel_name
       FROM messages m
       JOIN users u ON u.id = m.user_id
       JOIN channels c ON c.id = m.channel_id
       JOIN memberships mem ON mem.channel_id = c.id AND mem.user_id = :userId
       WHERE m.deleted_at IS NULL
         AND (
           JSON_CONTAINS(m.mentions, JSON_QUOTE(:userId), '$.users')
           OR JSON_CONTAINS(m.mentions, JSON_QUOTE('channel'), '$.special')
           OR JSON_CONTAINS(m.mentions, JSON_QUOTE('everyone'), '$.special')
           OR JSON_CONTAINS(m.mentions, JSON_QUOTE('here'), '$.special')
           OR m.body LIKE :namePattern
         )
       ORDER BY m.created_at DESC
       LIMIT 15`,
      { userId: adminUser.id, namePattern: `%@${adminUser.name.replace(/ /g, '')}%` }
  );
  console.log('Actual Query result:', rows);
  process.exit(0);
}
test();
