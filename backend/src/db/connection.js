const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eteams',
  waitForConnections: true,
  connectionLimit: 100, // Increased to handle 600-700 concurrent users
  queueLimit: 0,
  namedPlaceholders: true,
});

module.exports = { db };
