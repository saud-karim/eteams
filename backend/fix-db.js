const { db } = require('./src/db/connection');

async function fixDB() {
  try {
    await db.query("ALTER TABLE users ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'");
    console.log('Added approval_status successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('approval_status already exists. No action needed.');
    } else {
      console.error('Error adding approval_status:', err);
    }
  } finally {
    process.exit(0);
  }
}

fixDB();
