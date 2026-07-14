const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eteams',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

module.exports = { db };
