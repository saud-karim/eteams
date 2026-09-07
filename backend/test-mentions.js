const { db } = require('./src/db/connection');
async function test() {
  const [users] = await db.query('SELECT id, name FROM users WHERE username = "admin" OR username = "saud_karim"');
  console.log('Users:', users);
  
  if (users.length > 0) {
    const adminUser = users.find(u => u.name.toLowerCase() === 'admin');
    if (!adminUser) return console.log('Admin not found');
    
    const [rows] = await db.query(
      `SELECT m.id, m.body, m.mentions 
       FROM messages m
       WHERE JSON_CONTAINS(m.mentions, JSON_QUOTE(:userId), '$.users')
          OR m.body LIKE :namePattern
       ORDER BY m.created_at DESC LIMIT 5`,
      { userId: adminUser.id, namePattern: `%@${adminUser.name.replace(/ /g, '')}%` }
    );
    console.log('Query result:', rows);
  }
  process.exit(0);
}
test();
