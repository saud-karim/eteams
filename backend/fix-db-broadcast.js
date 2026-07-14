const { db } = require('./src/db/connection');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id CHAR(36) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        recipients VARCHAR(100) NOT NULL,
        message_body TEXT NOT NULL,
        created_by CHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Broadcasts table created successfully.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
