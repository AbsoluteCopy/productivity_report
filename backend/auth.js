const jwt = require('jsonwebtoken');
const pool = require('./db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication credentials were not provided.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.SECRET_KEY || 'default-secret-key-12345';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.user_id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = rows[0];
    // Check token version for immediate revocation
    if (decoded.token_version !== undefined && decoded.token_version !== user.token_version) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }

    // Parse task_list JSON safely
    if (typeof user.task_list === 'string') {
      try {
        user.task_list = JSON.parse(user.task_list);
      } catch (e) {
        user.task_list = [];
      }
    } else if (!user.task_list) {
      user.task_list = [];
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Internal authentication error.' });
  }
};

const sanitize = (val) => {
  if (typeof val !== 'string') return val;
  return val.trim();
};

module.exports = { authenticate, sanitize };
