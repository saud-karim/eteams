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

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = sql.split(/;\s*$/m).map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await db.query(stmt);
    }
    console.log(`✓ ran ${file}`);
  }

  console.log('✓ Migrations complete');
  process.exit(0);
}

run().catch(err => {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
});
