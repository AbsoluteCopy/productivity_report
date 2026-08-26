const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DATABASE_USER || 'productivity',
  password: process.env.DATABASE_PASSWORD || 'mQAaDzZ7kLzdN3P1QQxw',
  database: process.env.DATABASE_NAME || 'productivity',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

module.exports = pool;
