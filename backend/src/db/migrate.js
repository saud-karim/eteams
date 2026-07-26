require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const { db } = require('./connection');

async function run() {
  const reset = process.argv.includes('reset');
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  if (reset) {
    console.log('⚠ Resetting database — dropping all tables...');
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const [rows] = await db.query('SHOW TABLES');
    for (const row of rows) {
      const tableName = Object.values(row)[0];
      await db.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`  dropped ${tableName}`);
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  // Ensure migrations_log table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already executed migrations
  const [executedRows] = await db.query('SELECT migration_name FROM migrations_log');
  const executedMigrations = new Set(executedRows.map(r => r.migration_name));

  let runCount = 0;

  for (const file of files) {
    if (executedMigrations.has(file)) {
      // Skip already executed migrations
      continue;
    }

    console.log(`⏳ Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = sql.split(/;\s*$/m).map(s => s.trim()).filter(Boolean);
    
    // Execute all statements in the file
    for (const stmt of statements) {
      await db.query(stmt);
    }
    
    // Log the migration as executed
    await db.query('INSERT INTO migrations_log (migration_name) VALUES (?)', [file]);
    console.log(`✓ successfully ran ${file}`);
    runCount++;
  }

  if (runCount === 0) {
    console.log('✓ Database is already up to date. No new migrations to run.');
  } else {
    console.log(`✓ Migrations complete. Ran ${runCount} new migration(s).`);
  }
  
  process.exit(0);
}

run().catch(err => {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
});
