const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DATABASE_USER || 'productivityuser',
  password: process.env.DATABASE_PASSWORD || 'mQAaDzZ7kLzdN3P1QQxw',
  database: process.env.DATABASE_NAME || 'productivity',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

module.exports = pool;
