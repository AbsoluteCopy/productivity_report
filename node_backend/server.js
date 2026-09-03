const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { authenticate, sanitize } = require('./auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8097;
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key-12345';

// Security Headers & Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Helper: Format user object (omit password hash)
const formatUser = (user) => {
  const { password, ...safeUser } = user;
  if (typeof safeUser.task_list === 'string') {
    try { safeUser.task_list = JSON.parse(safeUser.task_list); } catch (e) { safeUser.task_list = []; }
  } else if (!safeUser.task_list) {
    safeUser.task_list = [];
  }
  return safeUser;
};

// 1. Health check
app.get(['/api', '/api/'], (req, res) => {
  res.json({ status: 'online', message: 'Productivity Report API is operating normally.' });
});

// 2. Login (12 hours token expiration)
app.post(['/api/login', '/api/login/'], loginLimiter, async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    email = email.trim().toLowerCase();

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    let passwordMatches = false;

    // Check bcrypt or PBKDF2 (Django style)
    if (user.password && user.password.startsWith('pbkdf2_sha256$')) {
      const crypto = require('crypto');
      const parts = user.password.split('$');
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const hash = parts[3];
      const testHash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64');
      passwordMatches = (testHash === hash);
    } else if (user.password) {
      passwordMatches = await bcrypt.compare(password, user.password).catch(() => false);
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Set 12 hours token lifetime
    const token = jwt.sign(
      { user_id: user.id, token_version: user.token_version },
      SECRET_KEY,
      { expiresIn: '12h' }
    );

    return res.json({
      message: 'Login successful.',
      user: formatUser(user),
      token: token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. Logout
app.post(['/api/logout', '/api/logout/'], authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [req.user.id]);
    return res.json({ message: 'Successfully logged out.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error logging out.' });
  }
});

// 4. Current user (me)
app.get(['/api/users/me', '/api/users/me/'], authenticate, (req, res) => {
  return res.json(formatUser(req.user));
});

// 5. Change Password
app.post(['/api/change-password', '/api/change-password/'], authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    let passwordMatches = false;
    if (req.user.password.startsWith('pbkdf2_sha256$')) {
      const crypto = require('crypto');
      const parts = req.user.password.split('$');
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const hash = parts[3];
      const testHash = crypto.pbkdf2Sync(current_password, salt, iterations, 32, 'sha256').toString('base64');
      passwordMatches = (testHash === hash);
    } else {
      passwordMatches = await bcrypt.compare(current_password, req.user.password).catch(() => false);
    }

    if (!passwordMatches) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password = ?, token_version = token_version + 1, updated_at = NOW() WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error changing password.' });
  }
});

// 6. Users List & Create
app.get(['/api/users', '/api/users/'], authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM users';
    let params = [];

    if (req.user.role === 'admin') {
      query += ' ORDER BY id ASC';
    } else if (req.user.role === 'hr' && req.user.company) {
      query += ' WHERE company = ? ORDER BY id ASC';
      params.push(req.user.company);
    } else if (req.user.company) {
      query += ' WHERE company = ? ORDER BY id ASC';
      params.push(req.user.company);
    } else {
      query += ' WHERE id = ?';
      params.push(req.user.id);
    }

    const [rows] = await pool.query(query, params);
    return res.json(rows.map(formatUser));
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching users.' });
  }
});

app.post(['/api/users', '/api/users/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to create users.', detail: 'You do not have permission to create users.' });
    }

    let { id_number, first_name, last_name, email, password, role, company, task_list } = req.body;
    
    // Explicit field validations
    if (!id_number || typeof id_number !== 'string' || !id_number.trim()) {
      return res.status(400).json({ error: 'ID Number is required.', detail: 'ID Number is required.' });
    }
    if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
      return res.status(400).json({ error: 'First Name is required.', detail: 'First Name is required.' });
    }
    if (!last_name || typeof last_name !== 'string' || !last_name.trim()) {
      return res.status(400).json({ error: 'Last Name is required.', detail: 'Last Name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.', detail: 'Email is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g., name@gratusinc.org).', detail: 'Please enter a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters long.', detail: 'Password must be at least 6 characters long.' });
    }
    
    const validRoles = ['admin', 'hr', 'employee', 'viewer'];
    const chosenRole = (role && validRoles.includes(role)) ? role : 'employee';

    if (req.user.role === 'hr') {
      if (role === 'admin') {
        return res.status(403).json({ error: 'HR users cannot create administrator accounts.', detail: 'HR users cannot create administrator accounts.' });
      }
      company = req.user.company;
    }

    // Check for existing ID number
    const [existingId] = await pool.query('SELECT id FROM users WHERE id_number = ?', [id_number.trim()]);
    if (existingId.length > 0) {
      return res.status(400).json({ error: `An account with ID Number "${id_number.trim()}" already exists.`, detail: `An account with ID Number "${id_number.trim()}" already exists.` });
    }

    // Check for existing email
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: `An account with Email "${email.trim().toLowerCase()}" already exists.`, detail: `An account with Email "${email.trim().toLowerCase()}" already exists.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const taskListJson = JSON.stringify(task_list || []);

    const [result] = await pool.query(
      'INSERT INTO users (id_number, first_name, last_name, email, password, role, company, task_list, token_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [id_number.trim(), first_name.trim(), last_name.trim(), email.trim().toLowerCase(), hashedPassword, chosenRole, company ? company.trim() : null, taskListJson]
    );

    const [created] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json(formatUser(created[0]));
  } catch (err) {
    console.error('Create user error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email or ID number already exists.', detail: 'Email or ID number already exists.' });
    }
    return res.status(500).json({ error: 'Error creating user: ' + (err.sqlMessage || err.message), detail: 'Error creating user: ' + (err.sqlMessage || err.message) });
  }
});

// 7. User Detail, Update, Delete
app.get(['/api/users/:id', '/api/users/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.', detail: 'User not found.' });

    const targetUser = rows[0];
    if (req.user.role === 'admin' || (req.user.role === 'hr' && req.user.company === targetUser.company) || req.user.id == targetUser.id) {
      return res.json(formatUser(targetUser));
    }
    return res.status(403).json({ error: 'Permission denied.', detail: 'Permission denied.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching user.', detail: 'Error fetching user.' });
  }
});

app.put(['/api/users/:id', '/api/users/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.', detail: 'User not found.' });

    const targetUser = rows[0];
    const isSelf = req.user.id == targetUser.id;
    const isAdmin = req.user.role === 'admin';
    const isHR = req.user.role === 'hr' && req.user.company === targetUser.company;

    if (!isAdmin && !isHR && !isSelf) {
      return res.status(403).json({ error: 'Permission denied.', detail: 'Permission denied.' });
    }

    let { first_name, last_name, email, role, company, id_number, task_list, password } = req.body;
    let updates = [];
    let params = [];

    if (first_name !== undefined) {
      if (!first_name.trim()) return res.status(400).json({ error: 'First Name cannot be blank.', detail: 'First Name cannot be blank.' });
      updates.push('first_name = ?'); params.push(first_name.trim());
    }
    if (last_name !== undefined) {
      if (!last_name.trim()) return res.status(400).json({ error: 'Last Name cannot be blank.', detail: 'Last Name cannot be blank.' });
      updates.push('last_name = ?'); params.push(last_name.trim());
    }
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) return res.status(400).json({ error: 'Please enter a valid email address.', detail: 'Please enter a valid email address.' });
      const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim().toLowerCase(), req.params.id]);
      if (existingEmail.length > 0) return res.status(400).json({ error: `An account with Email "${email.trim().toLowerCase()}" already exists.`, detail: `An account with Email "${email.trim().toLowerCase()}" already exists.` });
      updates.push('email = ?'); params.push(email.trim().toLowerCase());
    }
    if (task_list !== undefined) {
      updates.push('task_list = ?'); params.push(JSON.stringify(task_list));
    }
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long.', detail: 'Password must be at least 6 characters long.' });
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (isAdmin) {
      if (role) {
        const validRoles = ['admin', 'hr', 'employee', 'viewer'];
        if (!validRoles.includes(role)) return res.status(400).json({ error: `Invalid role '${role}'.`, detail: `Invalid role '${role}'.` });
        updates.push('role = ?'); params.push(role);
      }
      if (company !== undefined) { updates.push('company = ?'); params.push(company ? company.trim() : null); }
      if (id_number !== undefined) {
        if (!id_number.trim()) return res.status(400).json({ error: 'ID Number cannot be blank.', detail: 'ID Number cannot be blank.' });
        const [existingId] = await pool.query('SELECT id FROM users WHERE id_number = ? AND id != ?', [id_number.trim(), req.params.id]);
        if (existingId.length > 0) return res.status(400).json({ error: `An account with ID Number "${id_number.trim()}" already exists.`, detail: `An account with ID Number "${id_number.trim()}" already exists.` });
        updates.push('id_number = ?'); params.push(id_number.trim());
      }
    } else if (isHR) {
      if (role && role !== 'admin') {
        const validRoles = ['employee', 'viewer', 'hr'];
        if (!validRoles.includes(role)) return res.status(400).json({ error: `Invalid role '${role}'.`, detail: `Invalid role '${role}'.` });
        updates.push('role = ?'); params.push(role);
      }
      updates.push('company = ?'); params.push(req.user.company);
      if (id_number !== undefined) {
        if (!id_number.trim()) return res.status(400).json({ error: 'ID Number cannot be blank.', detail: 'ID Number cannot be blank.' });
        const [existingId] = await pool.query('SELECT id FROM users WHERE id_number = ? AND id != ?', [id_number.trim(), req.params.id]);
        if (existingId.length > 0) return res.status(400).json({ error: `An account with ID Number "${id_number.trim()}" already exists.`, detail: `An account with ID Number "${id_number.trim()}" already exists.` });
        updates.push('id_number = ?'); params.push(id_number.trim());
      }
    }

    if (updates.length === 0) {
      return res.json(formatUser(targetUser));
    }

    params.push(req.params.id);
    const updateQuery = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?';
    await pool.query(updateQuery, params);
    const [updated] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    return res.json(formatUser(updated[0]));
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Error updating user: ' + (err.sqlMessage || err.message), detail: 'Error updating user: ' + (err.sqlMessage || err.message) });
  }
});

app.delete(['/api/users/:id', '/api/users/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const targetUser = rows[0];
    if (req.user.role === 'admin') {
      if (targetUser.id === req.user.id) {
        const [adminCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        if (adminCount[0].count <= 1) {
          return res.status(400).json({ error: 'Cannot delete the sole administrator account.' });
        }
      }
    } else if (req.user.role === 'hr' && req.user.company === targetUser.company) {
      if (['admin', 'hr'].includes(targetUser.role)) {
        return res.status(403).json({ error: 'HR cannot delete admin or HR accounts.' });
      }
    } else {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting user.' });
  }
});

// 8. Daily Reports - List
app.get(['/api/daily-reports', '/api/daily-reports/'], authenticate, async (req, res) => {
  try {
    const { year, month, user_id } = req.query;
    let query = `
      SELECT r.*, 
             u.first_name, u.last_name, u.email, u.id_number, u.company as user_company
      FROM daily_reports r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (req.user.role === 'admin') {
      if (user_id) { query += ' AND r.user_id = ?'; params.push(user_id); }
    } else if (req.user.role === 'hr' && req.user.company) {
      query += ' AND u.company = ?'; params.push(req.user.company);
      if (user_id) { query += ' AND r.user_id = ?'; params.push(user_id); }
    } else {
      query += ' AND r.user_id = ?'; params.push(req.user.id);
    }

    if (year) { query += ' AND YEAR(r.date) = ?'; params.push(year); }
    if (month) { query += ' AND MONTH(r.date) = ?'; params.push(month); }

    query += ' ORDER BY r.date ASC';
    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => {
      let taskList = [];
      if (typeof r.task_list === 'string') {
        try { taskList = JSON.parse(r.task_list); } catch (e) {}
      } else if (Array.isArray(r.task_list)) {
        taskList = r.task_list;
      }
      return {
        id: r.id,
        user: r.user_id,
        user_name: `${r.first_name} ${r.last_name}`,
        date: r.date,
        task_category: r.task_category,
        sub_category: r.sub_category,
        work_type: r.work_type,
        task_list: taskList,
        number_of_tasks: r.number_of_tasks,
        time_spent: r.time_spent,
        meeting_count: r.meeting_count,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ error: 'Error fetching daily reports.' });
  }
});

// 8b. Single Daily Report by ID (View & Edit)
app.get(['/api/daily-reports/:id', '/api/daily-reports/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, 
             u.first_name, u.last_name, u.email, u.id_number, u.company as user_company
      FROM daily_reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Daily report not found.' });

    const r = rows[0];
    if (req.user.role !== 'admin' &&
        !(req.user.role === 'hr' && req.user.company === r.user_company) &&
        req.user.id != r.user_id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    let taskList = [];
    if (typeof r.task_list === 'string') {
      try { taskList = JSON.parse(r.task_list); } catch (e) {}
    } else if (Array.isArray(r.task_list)) {
      taskList = r.task_list;
    }

    return res.json({
      id: r.id,
      user: r.user_id,
      user_name: `${r.first_name} ${r.last_name}`,
      date: r.date,
      task_category: r.task_category,
      sub_category: r.sub_category,
      work_type: r.work_type,
      task_list: taskList,
      number_of_tasks: r.number_of_tasks,
      time_spent: r.time_spent,
      meeting_count: r.meeting_count,
      created_at: r.created_at,
      updated_at: r.updated_at
    });
  } catch (err) {
    console.error('Fetch single report error:', err);
    return res.status(500).json({ error: 'Error fetching daily report.' });
  }
});

app.post(['/api/daily-reports', '/api/daily-reports/'], authenticate, async (req, res) => {
  try {
    let { date, task_category, sub_category, work_type, task_list, number_of_tasks, time_spent, meeting_count, user } = req.body;
    let targetUserId = req.user.id;

    if (req.user.role === 'admin' && user) {
      targetUserId = user;
    } else if (req.user.role === 'hr' && user) {
      const [uRows] = await pool.query('SELECT company FROM users WHERE id = ?', [user]);
      if (uRows.length === 0 || uRows[0].company !== req.user.company) {
        return res.status(403).json({ error: 'Cannot submit report for employee in different company.' });
      }
      targetUserId = user;
    }

    const taskListJson = JSON.stringify(task_list || []);
    const [result] = await pool.query(
      'INSERT INTO daily_reports (user_id, date, task_category, sub_category, work_type, task_list, number_of_tasks, time_spent, meeting_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [targetUserId, date, task_category, sub_category || null, work_type || null, taskListJson, number_of_tasks || 0, time_spent || 0, meeting_count || 0]
    );

    const [created] = await pool.query('SELECT * FROM daily_reports WHERE id = ?', [result.insertId]);
    return res.status(201).json(created[0]);
  } catch (err) {
    console.error('Create report error:', err);
    return res.status(500).json({ error: 'Error creating daily report.' });
  }
});

app.put(['/api/daily-reports/:id', '/api/daily-reports/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT r.*, u.company FROM daily_reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Daily report not found.' });

    const report = rows[0];
    const isOwner = req.user.id == report.user_id;
    const isAdmin = req.user.role === 'admin';
    const isHR = req.user.role === 'hr' && req.user.company === report.company;

    if (!isAdmin && !isHR && !isOwner) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const reportDate = new Date(report.date);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    if (reportDate < oneMonthAgo) {
      return res.status(403).json({ error: 'Cannot edit records older than 1 month.' });
    }

    let { date, task_category, sub_category, work_type, task_list, number_of_tasks, time_spent, meeting_count } = req.body;
    let updates = [];
    let params = [];

    if (date) { updates.push('date = ?'); params.push(date); }
    if (task_category) { updates.push('task_category = ?'); params.push(task_category); }
    if (sub_category !== undefined) { updates.push('sub_category = ?'); params.push(sub_category); }
    if (work_type !== undefined) { updates.push('work_type = ?'); params.push(work_type); }
    if (task_list !== undefined) { updates.push('task_list = ?'); params.push(JSON.stringify(task_list)); }
    if (number_of_tasks !== undefined) { updates.push('number_of_tasks = ?'); params.push(number_of_tasks); }
    if (time_spent !== undefined) { updates.push('time_spent = ?'); params.push(time_spent); }
    if (meeting_count !== undefined) { updates.push('meeting_count = ?'); params.push(meeting_count); }

    if (updates.length === 0) {
      return res.json(report);
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const updateQuery = 'UPDATE daily_reports SET ' + updates.join(', ') + ' WHERE id = ?';
    await pool.query(updateQuery, params);
    const [updated] = await pool.query('SELECT * FROM daily_reports WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error updating daily report.' });
  }
});

app.delete(['/api/daily-reports/:id', '/api/daily-reports/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT r.*, u.company FROM daily_reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Daily report not found.' });

    const report = rows[0];
    const isOwner = req.user.id == report.user_id;
    const isAdmin = req.user.role === 'admin';
    const isHR = req.user.role === 'hr' && req.user.company === report.company;

    if (!isAdmin && !isHR && !isOwner) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const reportDate = new Date(report.date);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    if (reportDate < oneMonthAgo) {
      return res.status(403).json({ error: 'Cannot delete records older than 1 month.' });
    }

    await pool.query('DELETE FROM daily_reports WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting daily report.' });
  }
});

// 9. User Daily Reports Endpoint
app.get(['/api/users/:user_id/reports', '/api/users/:user_id/reports/'], authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.user_id;
    const [uRows] = await pool.query('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (uRows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const targetUser = uRows[0];
    if (req.user.role !== 'admin' && !(req.user.role === 'hr' && req.user.company === targetUser.company) && req.user.id != targetUserId) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const { year, month } = req.query;
    let query = 'SELECT * FROM daily_reports WHERE user_id = ?';
    let params = [targetUserId];

    if (year) { query += ' AND YEAR(date) = ?'; params.push(year); }
    if (month) { query += ' AND MONTH(date) = ?'; params.push(month); }
    query += ' ORDER BY date ASC';

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching user reports.' });
  }
});

// 10. Task Categories
app.get(['/api/task-categories', '/api/task-categories/'], authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM task_categories';
    let params = [];
    if (req.user.role !== 'admin' && req.user.company) {
      query += ' WHERE company = ? OR company IS NULL OR company = ""';
      params.push(req.user.company);
    }
    query += ' ORDER BY id ASC';
    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching task categories.' });
  }
});

app.post(['/api/task-categories', '/api/task-categories/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or HR can create task categories.' });
    }
    let { name, status, company } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    if (req.user.role === 'hr') company = req.user.company;

    const [result] = await pool.query(
      'INSERT INTO task_categories (name, status, company, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [name, status || 'active', company || null]
    );
    const [created] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [result.insertId]);
    return res.status(201).json(created[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error creating task category.' });
  }
});

app.put(['/api/task-categories/:id', '/api/task-categories/:id/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or HR can edit task categories.' });
    }
    const [rows] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task category not found.' });

    const cat = rows[0];
    if (req.user.role === 'hr' && cat.company && cat.company !== req.user.company) {
      return res.status(403).json({ error: 'Cannot modify categories belonging to another company.' });
    }

    let { name, status, company } = req.body;
    let updates = [];
    let params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (req.user.role === 'admin' && company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (req.user.role === 'hr') { updates.push('company = ?'); params.push(req.user.company); }

    if (updates.length === 0) {
      return res.json(cat);
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const updateQuery = 'UPDATE task_categories SET ' + updates.join(', ') + ' WHERE id = ?';
    await pool.query(updateQuery, params);
    const [updated] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error updating task category.' });
  }
});

app.delete(['/api/task-categories/:id', '/api/task-categories/:id/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or HR can delete task categories.' });
    }
    const [rows] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task category not found.' });

    const cat = rows[0];
    if (req.user.role === 'hr' && cat.company && cat.company !== req.user.company) {
      return res.status(403).json({ error: 'Cannot delete categories belonging to another company.' });
    }

    await pool.query('DELETE FROM task_categories WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting task category.' });
  }
});

// 11. Holidays
app.get(['/api/holidays', '/api/holidays/'], authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM holidays';
    let params = [];
    if (req.user.role !== 'admin' && req.user.company) {
      query += ' WHERE company = ? OR company IS NULL OR company = ""';
      params.push(req.user.company);
    }
    query += ' ORDER BY date ASC';
    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching holidays.' });
  }
});

app.post(['/api/holidays', '/api/holidays/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or HR can create holidays.' });
    }
    let { name, date, company } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Name and date are required.' });
    if (req.user.role === 'hr') company = req.user.company;

    const [result] = await pool.query(
      'INSERT INTO holidays (name, date, company, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [name, date, company || null]
    );
    const [created] = await pool.query('SELECT * FROM holidays WHERE id = ?', [result.insertId]);
    return res.status(201).json(created[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error creating holiday.' });
  }
});

app.put(['/api/holidays/:id', '/api/holidays/:id/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or HR can edit holidays.' });
    }
    const [rows] = await pool.query('SELECT * FROM holidays WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Holiday not found.' });

    const hol = rows[0];
    if (req.user.role === 'hr' && hol.company && hol.company !== req.user.company) {
      return res.status(403).json({ error: 'Cannot modify holidays belonging to another company.' });
    }

    let { name, date, company } = req.body;
    let updates = [];
    let params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (date) { updates.push('date = ?'); params.push(date); }
    if (req.user.role === 'admin' && company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (req.user.role === 'hr') { updates.push('company = ?'); params.push(req.user.company); }

    if (updates.length === 0) {
      return res.json(hol);
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const updateQuery = 'UPDATE holidays SET ' + updates.join(', ') + ' WHERE id = ?';
    await pool.query(updateQuery, params);
    const [updated] = await pool.query('SELECT * FROM holidays WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error updating holiday.' });
  }
});

app.delete(['/api/holidays/:id', '/api/holidays/:id/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or HR can delete holidays.' });
    }
    const [rows] = await pool.query('SELECT * FROM holidays WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Holiday not found.' });

    const hol = rows[0];
    if (req.user.role === 'hr' && hol.company && hol.company !== req.user.company) {
      return res.status(403).json({ error: 'Cannot delete holidays belonging to another company.' });
    }

    await pool.query('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting holiday.' });
  }
});

// Start Server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Productivity Node.js API server running on http://127.0.0.1:${PORT}`);
});