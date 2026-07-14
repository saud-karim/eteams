const { db } = require('./src/db/connection');

async function check() {
  try {
    const [rows] = await db.query(`
      SELECT 
        m.user_id, m.channel_id, u.name as uname, c.name as cname,
        m.is_manager, m.can_post, m.can_add_members, m.can_remove_members, 
        m.can_pin_messages, m.can_edit_topic, m.can_delete_messages
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
    `);
    console.log("All memberships:");
    console.table(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
