const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const pool = require('./db');
const { authenticate, sanitize } = require('./auth');
const multer = require('multer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8097;
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key-12345';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|csv|txt)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error('Unsupported file type.'))
});
const uploadAttachment = (req, res, next) =>
  upload.single('attachment')(req, res, err => err ? res.status(400).json({ error: err.message }) : next());

// Trust Nginx reverse proxy (fixes express-rate-limit X-Forwarded-For error)
app.set('trust proxy', 1);

// Security Headers & Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auto-migrate: Ensure actual_time, description, and attachment columns exist in daily_reports table
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_reports'"
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));
    if (!existing.has('actual_time')) {
      await pool.query("ALTER TABLE daily_reports ADD COLUMN actual_time INT NULL DEFAULT NULL AFTER meeting_count");
      console.log("Added column 'actual_time' to daily_reports table.");
    }
    if (!existing.has('description')) {
      await pool.query("ALTER TABLE daily_reports ADD COLUMN description TEXT NULL DEFAULT NULL AFTER actual_time");
      console.log("Added column 'description' to daily_reports table.");
    }
    if (!existing.has('attachment')) {
      await pool.query("ALTER TABLE daily_reports ADD COLUMN attachment VARCHAR(255) NULL DEFAULT NULL AFTER description");
      console.log("Added column 'attachment' to daily_reports table.");
    }
    if (!existing.has('time_added')) {
      await pool.query("ALTER TABLE daily_reports ADD COLUMN time_added DATETIME NULL DEFAULT NULL");
      console.log("Added column 'time_added' to daily_reports table.");
    }
    if (!existing.has('time_finished')) {
      await pool.query("ALTER TABLE daily_reports ADD COLUMN time_finished DATETIME NULL DEFAULT NULL");
      console.log("Added column 'time_finished' to daily_reports table.");
    }
  } catch (err) {
    console.error("Migration check error for daily_reports columns:", err);
  }
})();

// Auto-migrate: Ensure logs table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        type ENUM('sign in', 'sign out') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("Migration check error for logs table:", err);
  }
})();

// Auto-migrate: Ensure attendance table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        clock_in DATETIME NOT NULL,
        clock_out DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_attendance_user_id (user_id)
      )
    `);
  } catch (err) {
    console.error("Migration check error for attendance table:", err);
  }
})();

// Auto-migrate: Ensure last_active_at column exists in users table
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_active_at'"
    );
    if (cols.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN last_active_at DATETIME NULL DEFAULT NULL");
      console.log("Added column 'last_active_at' to users table.");
    }
  } catch (err) {
    console.error("Migration check error for last_active_at:", err);
  }
})();

// Auto-migrate: Track what task a user is currently running the live timer
// on, so Team Status can show it in real time.
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('current_task_label', 'current_task_started_at')"
    );
    const have = new Set(cols.map(c => c.COLUMN_NAME));
    if (!have.has('current_task_label')) {
      await pool.query("ALTER TABLE users ADD COLUMN current_task_label VARCHAR(255) NULL DEFAULT NULL");
      console.log("Added column 'current_task_label' to users table.");
    }
    if (!have.has('current_task_started_at')) {
      await pool.query("ALTER TABLE users ADD COLUMN current_task_started_at DATETIME NULL DEFAULT NULL");
      console.log("Added column 'current_task_started_at' to users table.");
    }
  } catch (err) {
    console.error("Migration check error for current_task columns:", err);
  }
})();

// Auto-migrate: Allow users to sign in with a username, email, or both
(async () => {
  try {
    const [columns] = await pool.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('username', 'email')"
    );
    let usernameColumn = columns.find(column => column.COLUMN_NAME === 'username');
    const emailColumn = columns.find(column => column.COLUMN_NAME === 'email');

    if (!usernameColumn) {
      await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL');
      await pool.query("UPDATE users SET username = CONCAT('user', id) WHERE username IS NULL OR TRIM(username) = ''");
      usernameColumn = { COLUMN_TYPE: 'varchar(100)', IS_NULLABLE: 'YES' };
    }

    if (usernameColumn.IS_NULLABLE === 'NO') {
      await pool.query(`ALTER TABLE users MODIFY username ${usernameColumn.COLUMN_TYPE} NULL`);
    }
    if (emailColumn && emailColumn.IS_NULLABLE === 'NO') {
      await pool.query(`ALTER TABLE users MODIFY email ${emailColumn.COLUMN_TYPE} NULL`);
    }

    const [indexes] = await pool.query(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_username'"
    );
    if (indexes.length === 0) {
      await pool.query('ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)');
    }
  } catch (err) {
    console.error('Migration check error for username:', err);
  }
})();

// Auto-migrate: Ensure role enum includes 'supervisor'
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
    );
    if (cols.length > 0 && !cols[0].COLUMN_TYPE.includes("'supervisor'")) {
      await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','hr','supervisor','employee','viewer') DEFAULT 'employee'");
      console.log("Updated users.role ENUM to include 'supervisor'.");
    }
  } catch (err) {
    console.error('Migration check error for supervisor role:', err);
  }
})();

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// App-wide reporting timezone (matches frontend's DEFAULT_TIMEZONE in dateUtils.js).
const APP_TIMEZONE = process.env.VITE_DEFAULT_TIMEZONE || 'America/Anchorage';
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

// Helper: Convert an ISO datetime string (or Date) to MySQL DATETIME format,
// normalized to APP_TIMEZONE so the stored wall-clock value is correct
// regardless of what timezone the server/host machine itself is set to.
const toMySQLDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(d).map(p => [p.type, p.value]));
  // hour12: false can still report midnight as "24" per the Intl spec
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
};

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
    let { identifier, email, username, password } = req.body;
    identifier = identifier ?? email ?? username;
    if (!identifier || !password || typeof identifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username or email and password are required.' });
    }
    identifier = identifier.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1',
      [identifier, identifier]
    );
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

    await pool.query(
      'INSERT INTO logs (user_id, type) VALUES (?, ?)',
      [user.id, 'sign in']
    );

    // Set 12 hours token lifetime
    const token = jwt.sign(
      { user_id: user.id, token_version: user.token_version },
      SECRET_KEY,
      { expiresIn: '12h' }
    );

    // Update last_active_at on login
    await pool.query('UPDATE users SET last_active_at = NOW() WHERE id = ?', [user.id]).catch(() => { });

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
    // Save logout activity
    await pool.query(
      'INSERT INTO logs (user_id, type) VALUES (?, ?)',
      [req.user.id, 'sign out']
    );

    await pool.query(
      'UPDATE users SET token_version = token_version + 1, last_active_at = NULL WHERE id = ?',
      [req.user.id]
    );

    return res.json({ message: 'Successfully logged out.' });
  } catch (err) {
    console.error('Logout error:', err);
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
      'UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Error changing password.', detail: err.message });
  }
});

// 6. Users List & Create
app.get(['/api/users', '/api/users/'], authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM users';
    let params = [];

    if (req.user.role === 'admin') {
      query += ' ORDER BY id ASC';
    } else if (['hr', 'supervisor'].includes(req.user.role) && req.user.company) {
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

    let { id_number, first_name, last_name, username, email, password, role, company, task_list } = req.body;

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
    if ((username !== undefined && username !== null && typeof username !== 'string') ||
      (email !== undefined && email !== null && typeof email !== 'string')) {
      return res.status(400).json({ error: 'Username and email must be text.', detail: 'Username and email must be text.' });
    }
    username = typeof username === 'string' ? username.trim().toLowerCase() : '';
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!username && !email) {
      return res.status(400).json({ error: 'Enter a username, an email, or both.', detail: 'Enter a username, an email, or both.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g., name@gratusinc.org).', detail: 'Please enter a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters long.', detail: 'Password must be at least 6 characters long.' });
    }

    const validRoles = ['admin', 'hr', 'supervisor', 'employee', 'viewer'];
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

    if (username) {
      const [existingUsername] = await pool.query('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [username, username]);
      if (existingUsername.length > 0) {
        return res.status(400).json({ error: `An account with Username "${username}" already exists.`, detail: `An account with Username "${username}" already exists.` });
      }
    }

    // Check for existing email
    if (email) {
      const [existingEmail] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?', [email, email]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: `An account with Email "${email}" already exists.`, detail: `An account with Email "${email}" already exists.` });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Strict exact case-insensitive match deduplication (preserves SUB10498-3 vs SUB104983)
    let cleanTaskList = Array.isArray(task_list) ? task_list : [];
    const seenPostTasks = new Set();
    cleanTaskList = cleanTaskList.filter(t => {
      if (typeof t !== 'string') return true;
      const key = t.trim().toLowerCase();
      if (seenPostTasks.has(key)) return false;
      seenPostTasks.add(key);
      return true;
    });
    const taskListJson = JSON.stringify(cleanTaskList);

    const [result] = await pool.query(
      'INSERT INTO users (id_number, first_name, last_name, username, email, password, role, company, task_list, token_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [id_number.trim(), first_name.trim(), last_name.trim(), username || null, email || null, hashedPassword, chosenRole, company ? company.trim() : null, taskListJson]
    );

    const [created] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json(formatUser(created[0]));
  } catch (err) {
    console.error('Create user error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username, email, or ID number already exists.', detail: 'Username, email, or ID number already exists.' });
    }
    return res.status(500).json({ error: 'Error creating user: ' + (err.sqlMessage || err.message), detail: 'Error creating user: ' + (err.sqlMessage || err.message) });
  }
});

// 6.1. Heartbeat - keep current user active
app.post(['/api/users/heartbeat', '/api/users/heartbeat/'], authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE users SET last_active_at = NOW() WHERE id = ?', [req.user.id]);
    return res.json({ status: 'ok', timestamp: new Date() });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating heartbeat.' });
  }
});

// 6.1b. Set/clear the task the current user's live timer is running on, so
// Team Status can show it in real time. Called by the frontend when a task
// timer starts, and cleared when it ends/is cancelled.
app.post(['/api/users/current-task', '/api/users/current-task/'], authenticate, async (req, res) => {
  try {
    const { label } = req.body;
    if (label) {
      await pool.query(
        'UPDATE users SET current_task_label = ?, current_task_started_at = NOW() WHERE id = ?',
        [String(label).slice(0, 255), req.user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET current_task_label = NULL, current_task_started_at = NULL WHERE id = ?',
        [req.user.id]
      );
    }
    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating current task.' });
  }
});

// 6.2. Online Users - Admin and HR multi-company monitor
app.get(['/api/users/online', '/api/users/online/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr', 'supervisor', 'viewer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied. Only Admin, HR, Supervisor, and Viewer can view online users.' });
    }

    // 1. Fetch users active within last 5 minutes, or currently clocked in
    //    (even if their browser heartbeat has gone stale). The active/away
    //    threshold is computed here in SQL (TIMESTAMPDIFF against MySQL's own
    //    NOW()) rather than by re-parsing last_active_at as a JS Date -
    //    mysql2 reads DATETIME columns using the Node process's own host
    //    timezone when none is configured, which silently corrupts the
    //    comparison on any host whose OS timezone isn't UTC (harmless on
    //    production only because its host happens to run on UTC).
    const [onlineRows] = await pool.query(
      `SELECT u.id, u.id_number, u.first_name, u.last_name, u.email, u.role, u.company, u.last_active_at,
              u.current_task_label, u.current_task_started_at,
              a.clock_in AS attendance_clock_in,
              TIMESTAMPDIFF(MINUTE, u.last_active_at, NOW()) AS minutes_since_active
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.clock_out IS NULL
       WHERE u.last_active_at >= NOW() - INTERVAL 5 MINUTE OR a.id IS NOT NULL
       ORDER BY (a.id IS NOT NULL) DESC, u.last_active_at DESC`
    );
    onlineRows.forEach(u => {
      u.clocked_in = !!u.attendance_clock_in;
      const mins = u.minutes_since_active;
      u.status = (mins !== null && mins >= 0 && mins <= 2)
        ? 'active'
        : (mins !== null && mins >= 0 && mins <= 5)
          ? 'away'
          : 'offline';
      delete u.minutes_since_active;
    });

    // 2. Fetch known companies for the filter tabs/chips. Viewer is locked to
    //    their own company and must never see other companies' names.
    const isCompanyLocked = req.user.role === 'viewer' && !!req.user.company;
    let allCompanies;
    if (isCompanyLocked) {
      allCompanies = [req.user.company.trim()];
    } else {
      const [companyRows] = await pool.query(
        `SELECT DISTINCT company FROM users WHERE company IS NOT NULL AND TRIM(company) != '' ORDER BY company ASC`
      );
      allCompanies = companyRows.map(r => r.company.trim()).filter(Boolean);
    }

    // 3. Tally online counts per company
    const companyCounts = {};
    allCompanies.forEach(c => { companyCounts[c] = 0; });
    onlineRows.forEach(u => {
      if (u.status === 'offline') return; // clocked in but not actually online
      const c = (u.company || '').trim();
      if (c) {
        companyCounts[c] = (companyCounts[c] || 0) + 1;
      }
    });

    // 4. Multi-company filter support (e.g. ?companies=CompA,CompB or ?company=CompA)
    let selectedCompanies = [];
    if ((req.user.role === 'supervisor' || isCompanyLocked) && req.user.company) {
      // Hard-locked to their own company; query params below can't widen this.
      selectedCompanies = [req.user.company.trim().toLowerCase()];
    } else if (req.query.companies) {
      selectedCompanies = req.query.companies.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    } else if (req.query.company) {
      selectedCompanies = [req.query.company.trim().toLowerCase()];
    }

    let filteredUsers = onlineRows;
    if (selectedCompanies.length > 0) {
      filteredUsers = onlineRows.filter(u => {
        const userComp = (u.company || '').trim().toLowerCase();
        return selectedCompanies.includes(userComp);
      });
    }

    return res.json({
      total_online: filteredUsers.filter(u => u.status !== 'offline').length,
      all_online_count: onlineRows.filter(u => u.status !== 'offline').length,
      company_counts: companyCounts,
      companies: allCompanies,
      users: filteredUsers
    });
  } catch (err) {
    console.error('Error fetching online users:', err);
    return res.status(500).json({ error: 'Error fetching online users.' });
  }
});

// 7. User Detail, Update, Delete
app.get(['/api/users/:id', '/api/users/:id/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.', detail: 'User not found.' });

    const targetUser = rows[0];
    if (req.user.role === 'admin' || (['hr', 'supervisor'].includes(req.user.role) && req.user.company === targetUser.company) || req.user.id == targetUser.id) {
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
    const isSupervisor = req.user.role === 'supervisor' && req.user.company === targetUser.company && (targetUser.role === 'employee' || isSelf);

    if (!isAdmin && !isHR && !isSupervisor && !isSelf) {
      return res.status(403).json({ error: 'Permission denied.', detail: 'Permission denied.' });
    }

    if (isHR && targetUser.role === 'admin') {
      return res.status(403).json({ error: 'HR cannot edit administrator accounts.', detail: 'HR cannot edit administrator accounts.' });
    }

    let { first_name, last_name, username, email, role, company, id_number, task_list, password } = req.body;
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
    if (username !== undefined || email !== undefined) {
      if ((username !== undefined && username !== null && typeof username !== 'string') ||
        (email !== undefined && email !== null && typeof email !== 'string')) {
        return res.status(400).json({ error: 'Username and email must be text.', detail: 'Username and email must be text.' });
      }

      const nextUsername = username === undefined ? targetUser.username : (username || '').trim().toLowerCase() || null;
      const nextEmail = email === undefined ? targetUser.email : (email || '').trim().toLowerCase() || null;
      if (!nextUsername && !nextEmail) {
        return res.status(400).json({ error: 'An account must have a username, an email, or both.', detail: 'An account must have a username, an email, or both.' });
      }

      if (username !== undefined) {
        if (nextUsername) {
          const [existingUsername] = await pool.query('SELECT id FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id != ?', [nextUsername, nextUsername, req.params.id]);
          if (existingUsername.length > 0) return res.status(400).json({ error: `An account with Username "${nextUsername}" already exists.`, detail: `An account with Username "${nextUsername}" already exists.` });
        }
        updates.push('username = ?'); params.push(nextUsername);
      }
      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (nextEmail && !emailRegex.test(nextEmail)) return res.status(400).json({ error: 'Please enter a valid email address.', detail: 'Please enter a valid email address.' });
        if (nextEmail) {
          const [existingEmail] = await pool.query('SELECT id FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND id != ?', [nextEmail, nextEmail, req.params.id]);
          if (existingEmail.length > 0) return res.status(400).json({ error: `An account with Email "${nextEmail}" already exists.`, detail: `An account with Email "${nextEmail}" already exists.` });
        }
        updates.push('email = ?'); params.push(nextEmail);
      }
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
        const validRoles = ['admin', 'hr', 'supervisor', 'employee', 'viewer'];
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
        const validRoles = ['employee', 'viewer', 'hr', 'supervisor'];
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
    } else if (isSupervisor) {
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
    } else if (['hr', 'viewer', 'supervisor'].includes(req.user.role) && req.user.company) {
      query += ' AND u.company = ?'; params.push(req.user.company);
      if (user_id) { query += ' AND r.user_id = ?'; params.push(user_id); }
    } else {
      query += ' AND r.user_id = ?'; params.push(req.user.id);
    }

    if (year) { query += ' AND YEAR(r.date) = ?'; params.push(year); }
    if (month) { query += ' AND MONTH(r.date) = ?'; params.push(month); }

    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY r.date ${sortOrder}, r.id ${sortOrder}`;
    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => {
      let taskList = [];
      if (typeof r.task_list === 'string') {
        try { taskList = JSON.parse(r.task_list); } catch (e) { }
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
        updated_at: r.updated_at,
        actual_time: r.actual_time,
        description: r.description,
        attachment_url: r.attachment ? `/api/daily-reports/${r.id}/attachment` : null,
        time_added: r.time_added,
        time_finished: r.time_finished,
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ error: 'Error fetching daily reports.' });
  }
});

// 8a-2. Check duplicate task across system for category (Strict exact case-insensitive match)
app.get(['/api/daily-reports/check-duplicate', '/api/daily-reports/check-duplicate/'], authenticate, async (req, res) => {
  try {
    const { task, category, sub_category, exclude_id } = req.query;
    if (!task || !category || !task.trim() || !category.trim()) {
      return res.json({ duplicate: false });
    }

    const trimmedTask = task.trim();
    const effectiveCategory = (category.toLowerCase() === 'others' && sub_category && sub_category.trim())
      ? sub_category.trim()
      : category.trim();

    let query = `
      SELECT r.id, r.date, r.task_category, r.sub_category, u.first_name, u.last_name, u.username
      FROM daily_reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE (
        CASE 
          WHEN LOWER(r.task_category) = 'others' AND r.sub_category IS NOT NULL AND TRIM(r.sub_category) != '' 
          THEN LOWER(TRIM(r.sub_category)) 
          ELSE LOWER(TRIM(r.task_category)) 
        END
      ) = LOWER(?)
        AND JSON_CONTAINS(LOWER(r.task_list), JSON_QUOTE(LOWER(?)))
    `;
    const params = [effectiveCategory, trimmedTask];

    if (exclude_id) {
      query += ` AND r.id != ?`;
      params.push(exclude_id);
    }

    query += ` ORDER BY r.date DESC, r.id DESC LIMIT 1`;

    const [rows] = await pool.query(query, params);

    if (rows.length > 0) {
      const match = rows[0];
      const matchCat = (match.task_category === 'Others' && match.sub_category)
        ? match.sub_category
        : match.task_category;
      const person = (match.first_name || match.last_name)
        ? `${match.first_name || ''} ${match.last_name || ''}`.trim()
        : (match.username || 'another user');
      const formattedDate = match.date instanceof Date
        ? match.date.toISOString().split('T')[0]
        : String(match.date).split('T')[0];

      return res.json({
        duplicate: true,
        task: trimmedTask,
        category: matchCat,
        date: formattedDate,
        submitted_by: person
      });
    }

    return res.json({ duplicate: false });
  } catch (err) {
    console.error('Check duplicate task error:', err);
    return res.status(500).json({ error: 'Error checking duplicate task.' });
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
      !(['hr', 'supervisor'].includes(req.user.role) && req.user.company === r.user_company) &&
      req.user.id != r.user_id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    let taskList = [];
    if (typeof r.task_list === 'string') {
      try { taskList = JSON.parse(r.task_list); } catch (e) { }
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
      updated_at: r.updated_at,
      actual_time: r.actual_time,
      description: r.description,
      attachment_url: r.attachment ? `/api/daily-reports/${r.id}/attachment` : null,
      time_added: r.time_added,
      time_finished: r.time_finished,
    });
  } catch (err) {
    console.error('Fetch single report error:', err);
    return res.status(500).json({ error: 'Error fetching daily report.' });
  }
});

app.post(['/api/daily-reports', '/api/daily-reports/'], authenticate, uploadAttachment, async (req, res) => {
  // delete the uploaded file if the request ends up failing
  res.on('finish', () => {
    if (res.statusCode >= 400 && req.file) fsPromises.unlink(req.file.path).catch(() => { });
  });
  try {
    let { date, task_category, sub_category, work_type, task_list, number_of_tasks,
      time_spent, meeting_count, user, actual_time, description, time_added, time_finished } = req.body;

    // multipart sends everything as strings
    if (typeof task_list === 'string') {
      try { task_list = JSON.parse(task_list); } catch (e) { task_list = []; }
    }
    let targetUserId = req.user.id;
    if (req.user.role === 'admin' && user) {
      targetUserId = user;
    } else if (['hr', 'supervisor'].includes(req.user.role) && user) {
      const [uRows] = await pool.query('SELECT company FROM users WHERE id = ?', [user]);
      if (uRows.length === 0 || uRows[0].company !== req.user.company) {
        return res.status(403).json({ error: 'Cannot submit report for employee in different company.' });
      }
      targetUserId = user;
    }

    // Strict exact case-insensitive match deduplication (preserves SUB10498-3 vs SUB104983)
    let cleanTaskList = Array.isArray(task_list) ? task_list : [];
    const seenPostTasks = new Set();
    cleanTaskList = cleanTaskList.filter(t => {
      if (typeof t !== 'string') return true;
      const key = t.trim().toLowerCase();
      if (seenPostTasks.has(key)) return false;
      seenPostTasks.add(key);
      return true;
    });
    const taskListJson = JSON.stringify(cleanTaskList);
    // Validate non-empty task_list for working categories
    if (work_type === 'Working' && task_category && task_category !== 'Meeting') {
      const isOthersNoTime = (task_category === 'Others' && Number(time_spent) === 0);
      if (!isOthersNoTime && cleanTaskList.length === 0) {
        return res.status(400).json({ error: `Tasks cannot be empty for category "${task_category}".` });
      }
    }

    // System-wide duplicate check for each task in this category
    const effectiveCategory = (task_category === 'Others' && sub_category && sub_category.trim())
      ? sub_category.trim()
      : (task_category || '').trim();

    if (task_category && !['Meeting', 'PTO', 'Holiday', 'Company Event'].includes(task_category)) {
      for (const t of cleanTaskList) {
        if (typeof t !== 'string' || !t.trim()) continue;
        const [dupRows] = await pool.query(`
          SELECT r.id, r.date, r.task_category, r.sub_category, u.first_name, u.last_name, u.username
          FROM daily_reports r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE (
            CASE 
              WHEN LOWER(r.task_category) = 'others' AND r.sub_category IS NOT NULL AND TRIM(r.sub_category) != '' 
              THEN LOWER(TRIM(r.sub_category)) 
              ELSE LOWER(TRIM(r.task_category)) 
            END
          ) = LOWER(?)
            AND JSON_CONTAINS(LOWER(r.task_list), JSON_QUOTE(LOWER(?)))
          LIMIT 1
        `, [effectiveCategory, t.trim()]);

        if (dupRows.length > 0) {
          const match = dupRows[0];
          const matchCat = (match.task_category === 'Others' && match.sub_category)
            ? match.sub_category
            : match.task_category;
          const person = (match.first_name || match.last_name)
            ? `${match.first_name || ''} ${match.last_name || ''}`.trim()
            : (match.username || 'another user');
          const formattedDate = match.date instanceof Date
            ? match.date.toISOString().split('T')[0]
            : String(match.date).split('T')[0];

          return res.status(400).json({
            error: `Task "${t.trim()}" has already been submitted for category "${matchCat}" by ${person} on ${formattedDate}. Duplicates are not allowed across the system.`
          });
        }
      }
    }

    const [result] = await pool.query(
      `INSERT INTO daily_reports
        (user_id, date, task_category, sub_category, work_type, task_list, number_of_tasks,
         time_spent, meeting_count, actual_time, description, attachment, time_added, time_finished, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [targetUserId, date, task_category, sub_category || null, work_type || null, taskListJson,
        number_of_tasks || 0, time_spent || 0, meeting_count || 0,
        Number(actual_time) || null,                      // seconds
        (description || '').trim() || null,
        req.file ? req.file.filename : null,
        toMySQLDateTime(time_added),
        toMySQLDateTime(time_finished)]
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
    const isSupervisor = req.user.role === 'supervisor' && req.user.company === report.company;

    if (!isAdmin && !isHR && !isSupervisor && !isOwner) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    let { date, task_category, sub_category, work_type, task_list, number_of_tasks, time_spent, meeting_count, time_added, time_finished } = req.body;
    let updates = [];
    let params = [];
    let cleanTaskList = [];

    if (date) { updates.push('date = ?'); params.push(date); }
    if (task_category) { updates.push('task_category = ?'); params.push(task_category); }
    if (sub_category !== undefined) { updates.push('sub_category = ?'); params.push(sub_category); }
    if (work_type !== undefined) { updates.push('work_type = ?'); params.push(work_type); }
    if (task_list !== undefined) {
      cleanTaskList = Array.isArray(task_list) ? task_list : [];
      const seenPutTasks = new Set();
      cleanTaskList = cleanTaskList.filter(t => {
        if (typeof t !== 'string') return true;
        const key = t.trim().toLowerCase();
        if (seenPutTasks.has(key)) return false;
        seenPutTasks.add(key);
        return true;
      });
      updates.push('task_list = ?');
      params.push(JSON.stringify(cleanTaskList));
    }
    if (number_of_tasks !== undefined) { updates.push('number_of_tasks = ?'); params.push(number_of_tasks); }
    if (time_spent !== undefined) { updates.push('time_spent = ?'); params.push(time_spent); }
    if (meeting_count !== undefined) { updates.push('meeting_count = ?'); params.push(meeting_count); }
    const { description, actual_time } = req.body;
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
    if (actual_time !== undefined) { updates.push('actual_time = ?'); params.push(actual_time !== null && actual_time !== '' ? actual_time : null); }
    if (time_added !== undefined) { updates.push('time_added = ?'); params.push(toMySQLDateTime(time_added)); }
    if (time_finished !== undefined) { updates.push('time_finished = ?'); params.push(toMySQLDateTime(time_finished)); }

    // System-wide duplicate check for each task in this category (excluding this report)
    const targetCategory = task_category || report.task_category;
    const targetSubCategory = sub_category !== undefined ? sub_category : report.sub_category;
    const effectiveCategory = (targetCategory === 'Others' && targetSubCategory && targetSubCategory.trim())
      ? targetSubCategory.trim()
      : (targetCategory || '').trim();

    if (cleanTaskList.length > 0 && targetCategory && !['Meeting', 'PTO', 'Holiday', 'Company Event'].includes(targetCategory)) {
      for (const t of cleanTaskList) {
        if (typeof t !== 'string' || !t.trim()) continue;
        const [dupRows] = await pool.query(`
          SELECT r.id, r.date, r.task_category, r.sub_category, u.first_name, u.last_name, u.username
          FROM daily_reports r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE (
            CASE 
              WHEN LOWER(r.task_category) = 'others' AND r.sub_category IS NOT NULL AND TRIM(r.sub_category) != '' 
              THEN LOWER(TRIM(r.sub_category)) 
              ELSE LOWER(TRIM(r.task_category)) 
            END
          ) = LOWER(?)
            AND JSON_CONTAINS(LOWER(r.task_list), JSON_QUOTE(LOWER(?)))
            AND r.id != ?
          LIMIT 1
        `, [effectiveCategory, t.trim(), req.params.id]);

        if (dupRows.length > 0) {
          const match = dupRows[0];
          const matchCat = (match.task_category === 'Others' && match.sub_category)
            ? match.sub_category
            : match.task_category;
          const person = (match.first_name || match.last_name)
            ? `${match.first_name || ''} ${match.last_name || ''}`.trim()
            : (match.username || 'another user');
          const formattedDate = match.date instanceof Date
            ? match.date.toISOString().split('T')[0]
            : String(match.date).split('T')[0];

          return res.status(400).json({
            error: `Task "${t.trim()}" has already been submitted for category "${matchCat}" by ${person} on ${formattedDate}. Duplicates are not allowed across the system.`
          });
        }
      }
    }

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
    const isSupervisor = req.user.role === 'supervisor' && req.user.company === report.company;

    if (!isAdmin && !isHR && !isSupervisor && !isOwner) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // 24-hour delete window for employees on their tasks
    if (req.user.role === 'employee') {
      const createdTime = report.created_at ? new Date(report.created_at).getTime() : new Date(report.date).getTime();
      const hoursAgo = (Date.now() - createdTime) / (1000 * 60 * 60);
      if (hoursAgo > 24) {
        return res.status(403).json({ error: 'Employees can only delete tasks within a 24-hour window.' });
      }
    }

    await pool.query('DELETE FROM daily_reports WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting daily report.' });
  }
});

app.get(['/api/daily-reports/:id/attachment'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.user_id, r.attachment, u.company FROM daily_reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?',
      [req.params.id]
    );
    if (rows.length === 0 || !rows[0].attachment) return res.status(404).json({ error: 'Attachment not found.' });
    const r = rows[0];
    const allowed = req.user.role === 'admin' || req.user.id == r.user_id ||
      (['hr', 'supervisor', 'viewer'].includes(req.user.role) && req.user.company === r.company);
    if (!allowed) return res.status(403).json({ error: 'Permission denied.' });
    return res.sendFile(path.join(UPLOAD_DIR, path.basename(r.attachment)));
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching attachment.' });
  }
});

// 9. User Daily Reports Endpoint
app.get(['/api/users/:user_id/reports', '/api/users/:user_id/reports/'], authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.user_id;
    const [uRows] = await pool.query('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (uRows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const targetUser = uRows[0];
    if (req.user.role !== 'admin' && !(['hr', 'supervisor', 'viewer'].includes(req.user.role) && req.user.company === targetUser.company) && req.user.id != targetUserId) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const { year, month, date } = req.query;
    let query = 'SELECT * FROM daily_reports WHERE user_id = ?';
    let params = [targetUserId];

    if (date) { query += ' AND date = ?'; params.push(date); }
    if (year) { query += ' AND YEAR(date) = ?'; params.push(year); }
    if (month) { query += ' AND MONTH(date) = ?'; params.push(month); }

    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY date ${sortOrder}, id ${sortOrder}`;

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
    if (!['admin', 'hr', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin, HR, or Supervisor can create task categories.' });
    }
    let { name, status, company, default_time } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    if (['hr', 'supervisor'].includes(req.user.role)) company = req.user.company;

    let parsedDefaultTime = default_time !== undefined && default_time !== null && default_time !== '' ? parseInt(default_time, 10) : null;
    if (isNaN(parsedDefaultTime)) parsedDefaultTime = null;

    const [result] = await pool.query(
      'INSERT INTO task_categories (name, status, company, default_time, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [name.trim(), status || 'active', company || null, parsedDefaultTime]
    );
    const [created] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [result.insertId]);
    return res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating task category:', err);
    return res.status(500).json({ error: 'Error creating task category: ' + (err.sqlMessage || err.message) });
  }
});

app.put(['/api/task-categories/:id', '/api/task-categories/:id/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin, HR, or Supervisor can edit task categories.' });
    }
    const [rows] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task category not found.' });

    const cat = rows[0];
    if (['hr', 'supervisor'].includes(req.user.role) && cat.company && cat.company.trim().toLowerCase() !== (req.user.company || '').trim().toLowerCase()) {
      return res.status(403).json({ error: 'Cannot modify categories belonging to another company.' });
    }

    let { name, status, company, default_time } = req.body;
    let updates = [];
    let params = [];
    if (name) { updates.push('name = ?'); params.push(name.trim()); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (req.user.role === 'admin' && company !== undefined) { updates.push('company = ?'); params.push(company); }
    // Only tag company if the category already belongs to a company (preserve global categories as global)
    if (['hr', 'supervisor'].includes(req.user.role) && cat.company && cat.company.trim() !== '') { updates.push('company = ?'); params.push(req.user.company); }
    if (default_time !== undefined) {
      let parsedDefaultTime = default_time !== null && default_time !== '' ? parseInt(default_time, 10) : null;
      if (isNaN(parsedDefaultTime)) parsedDefaultTime = null;
      updates.push('default_time = ?');
      params.push(parsedDefaultTime);
    }

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
    console.error('Error updating task category:', err);
    return res.status(500).json({ error: 'Error updating task category: ' + (err.sqlMessage || err.message) });
  }
});

app.delete(['/api/task-categories/:id', '/api/task-categories/:id/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin, HR, or Supervisor can delete task categories.' });
    }
    const [rows] = await pool.query('SELECT * FROM task_categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task category not found.' });

    const cat = rows[0];
    if (['hr', 'supervisor'].includes(req.user.role) && cat.company && cat.company.trim().toLowerCase() !== (req.user.company || '').trim().toLowerCase()) {
      return res.status(403).json({ error: 'Cannot delete categories belonging to another company.' });
    }

    await pool.query('DELETE FROM task_categories WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting task category:', err);
    return res.status(500).json({ error: 'Error deleting task category: ' + (err.sqlMessage || err.message) });
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

// Admin-only: Live database SQL dump download
app.get(['/api/admin/backup-sql', '/api/admin/backup-sql/'], authenticate, async (req, res) => {
  let tempDir;
  let child;
  let finished = false;

  const cleanup = async () => {
    if (!tempDir) return;
    const directory = tempDir;
    tempDir = null;
    await fsPromises.rm(directory, { recursive: true, force: true }).catch(() => { });
  };

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only administrators can download database backups.' });
    }

    const dbUser = process.env.DATABASE_USER || 'productivityuser';
    const dbPass = process.env.DATABASE_PASSWORD;
    const dbName = process.env.DATABASE_NAME || 'productivity';
    if (!dbPass || /[\r\n]/.test(dbUser) || /[\r\n]/.test(dbPass) || !/^[A-Za-z0-9_]+$/.test(dbName)) {
      return res.status(500).json({ error: 'Database backup configuration is invalid.' });
    }

    const escapeOption = value => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'productivity-backup-'));
    await fsPromises.chmod(tempDir, 0o700);
    const credentialsPath = path.join(tempDir, 'client.cnf');
    await fsPromises.writeFile(
      credentialsPath,
      `[client]\nhost=127.0.0.1\nuser=${escapeOption(dbUser)}\npassword=${escapeOption(dbPass)}\n`,
      { mode: 0o600, flag: 'wx' }
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `productivity_backup_${timestamp}.sql`;
    child = spawn('mysqldump', [
      `--defaults-extra-file=${credentialsPath}`,
      '--single-transaction',
      '--quick',
      '--skip-lock-tables',
      dbName,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/sql');
    child.stdout.on('data', chunk => {
      if (!res.write(chunk)) child.stdout.pause();
    });
    res.on('drain', () => child.stdout.resume());

    child.on('error', async err => {
      if (finished) return;
      finished = true;
      console.error('Database backup process failed:', err.message);
      await cleanup();
      if (res.headersSent) return res.destroy(err);
      res.removeHeader('Content-Disposition');
      res.removeHeader('Content-Type');
      return res.status(500).json({ error: 'Failed to generate database backup.' });
    });

    child.on('close', async code => {
      if (finished) return;
      finished = true;
      await cleanup();
      if (code !== 0) {
        console.error('Database backup process exited with code:', code);
        if (res.headersSent) return res.destroy();
        res.removeHeader('Content-Disposition');
        res.removeHeader('Content-Type');
        return res.status(500).json({ error: 'Failed to generate database backup.' });
      }
      return res.end();
    });

    res.on('close', () => {
      if (!finished) child.kill('SIGTERM');
      void cleanup();
    });
  } catch (err) {
    console.error('Admin backup route error:', err.message);
    if (child && !finished) child.kill('SIGTERM');
    await cleanup();
    if (res.headersSent) return res.destroy(err);
    return res.status(500).json({ error: 'Internal server error generating backup.' });
  }
});

// Attendance: current open clock-in for the logged-in user (null if clocked out)
app.get(['/api/attendance/current', '/api/attendance/current/'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE user_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    return res.json(rows[0] || null);
  } catch (err) {
    console.error('Fetch current attendance error:', err);
    return res.status(500).json({ error: 'Internal server error fetching attendance status.' });
  }
});

// Attendance: clock in
app.post(['/api/attendance/clock-in', '/api/attendance/clock-in/'], authenticate, async (req, res) => {
  try {
    const [open] = await pool.query(
      'SELECT id FROM attendance WHERE user_id = ? AND clock_out IS NULL LIMIT 1',
      [req.user.id]
    );
    if (open.length > 0) {
      return res.status(400).json({ error: 'Already clocked in.' });
    }
    const now = toMySQLDateTime(new Date());
    const [result] = await pool.query(
      'INSERT INTO attendance (user_id, clock_in) VALUES (?, ?)',
      [req.user.id, now]
    );
    const [created] = await pool.query('SELECT * FROM attendance WHERE id = ?', [result.insertId]);
    return res.status(201).json(created[0]);
  } catch (err) {
    console.error('Clock in error:', err);
    return res.status(500).json({ error: 'Internal server error during clock in.' });
  }
});

// Attendance: clock out
app.post(['/api/attendance/clock-out', '/api/attendance/clock-out/'], authenticate, async (req, res) => {
  try {
    const [open] = await pool.query(
      'SELECT id FROM attendance WHERE user_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    if (open.length === 0) {
      return res.status(400).json({ error: 'Not currently clocked in.' });
    }
    const now = toMySQLDateTime(new Date());
    await pool.query('UPDATE attendance SET clock_out = ? WHERE id = ?', [now, open[0].id]);
    const [updated] = await pool.query('SELECT * FROM attendance WHERE id = ?', [open[0].id]);
    return res.json(updated[0]);
  } catch (err) {
    console.error('Clock out error:', err);
    return res.status(500).json({ error: 'Internal server error during clock out.' });
  }
});

// Attendance: management list (admin/hr/supervisor only)
app.get(['/api/attendance', '/api/attendance/'], authenticate, async (req, res) => {
  try {
    if (!['admin', 'hr', 'supervisor', 'viewer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to view attendance records.' });
    }

    const { user_id, start_date, end_date } = req.query;
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.id_number, u.company
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.company) {
      query += ' AND u.company = ?';
      params.push(req.user.company);
    }
    if (user_id) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    }
    if (start_date) {
      query += ' AND DATE(a.clock_in) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(a.clock_in) <= ?';
      params.push(end_date);
    }
    query += ' ORDER BY a.clock_in DESC LIMIT 500';

    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error('Fetch attendance records error:', err);
    return res.status(500).json({ error: 'Internal server error fetching attendance records.' });
  }
});

// Start Server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Productivity Node.js API server running on http://127.0.0.1:${PORT}`);
});