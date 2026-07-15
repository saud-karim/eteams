const { v4: uuidv4 } = require('uuid');
const { db } = require('./src/db/connection');
async function run() {
  try {
    const [depts] = await db.query('SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != ""');
    for (const row of depts) {
      await db.query('INSERT IGNORE INTO departments (id, name) VALUES (?, ?)', [uuidv4(), row.department]);
    }
    const [titles] = await db.query('SELECT DISTINCT job_title FROM users WHERE job_title IS NOT NULL AND job_title != ""');
    for (const row of titles) {
      await db.query('INSERT IGNORE INTO job_titles (id, name) VALUES (?, ?)', [uuidv4(), row.job_title]);
    }
    console.log('Population successful');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
