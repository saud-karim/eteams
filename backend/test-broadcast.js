const Broadcast = require('./src/models/Broadcast');
const AuditLog = require('./src/models/AuditLog');

const { db } = require('./src/db/connection');

async function run() {
  try {
    const [users] = await db.query('SELECT id FROM users LIMIT 1');
    const createdBy = users[0].id;
    const b = await Broadcast.create({
      type: 'informational',
      recipients: 'all',
      messageBody: 'Test broadcast',
      createdBy: createdBy
    });
    console.log("Broadcast created:", b);
  } catch (err) {
    console.error("Error creating broadcast:", err);
  }
  process.exit(0);
}
run();
