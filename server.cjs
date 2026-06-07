const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 8081;
const BASE_PATH = '/gatesimulator';

// Database directory inside the workspace
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 1. Establish persistent cryptographic secret key for JWT (stays active across restarts)
const SECRET_FILE = path.join(DB_DIR, 'jwt_secret.key');
let JWT_SECRET;
if (fs.existsSync(SECRET_FILE)) {
  JWT_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(SECRET_FILE, JWT_SECRET, 'utf8');
}

// 2. Initialize SQLite Database
const db = new sqlite3.Database(path.join(DB_DIR, 'gatesim.db'));

// Promisified Database Helper Methods for Async/Await
const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize SQLite Schema Tables
const initDb = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS progress (
      username TEXT PRIMARY KEY,
      completed_missions TEXT NOT NULL,
      mission_states TEXT NOT NULL,
      curriculum_custom_gates TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS circuits (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    )
  `);
  console.log("SQLite schemas initialized successfully.");
};

initDb().catch(err => {
  console.error("Database initialization failed:", err);
});

app.use(express.json());

// Password Hashing Helper (PBKDF2)
const hashPassword = (password, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const iterations = 10000;
  const keylen = 64;
  const digest = 'sha512';
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
};

// Password Verification Helper
const verifyPassword = (password, storedHash) => {
  if (!storedHash.startsWith('pbkdf2$')) {
    const oldHash = crypto.createHash('sha256').update(password).digest('hex');
    return oldHash === storedHash;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const hash = parts[3];
  const testHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return testHash === hash;
};

// Middleware: Authenticate stateless JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    req.username = decoded.username;
    next();
  });
};

// --- API ROUTES ---

// 1. Auth: Register
app.post(`${BASE_PATH}/api/auth/register`, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    await dbRun(
      'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
      [username, hashPassword(password), new Date().toISOString()]
    );
    
    res.status(201).json({ success: true, message: 'Registration successful' });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Auth: Login
app.post(`${BASE_PATH}/api/auth/login`, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const user = await dbGet('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    // Sign JWT token valid for 7 days
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Auth: Profile Check
app.get(`${BASE_PATH}/api/auth/profile`, authenticateToken, (req, res) => {
  res.json({ username: req.username });
});

// 4. Curriculum: Save Progress
app.post(`${BASE_PATH}/api/user/progress`, authenticateToken, async (req, res) => {
  const { completedMissions, missionStates, curriculumCustomGates } = req.body;
  
  try {
    await dbRun(
      `INSERT INTO progress (username, completed_missions, mission_states, curriculum_custom_gates, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET
         completed_missions = excluded.completed_missions,
         mission_states = excluded.mission_states,
         curriculum_custom_gates = excluded.curriculum_custom_gates,
         updated_at = excluded.updated_at`,
      [
        req.username,
        JSON.stringify(completedMissions || []),
        JSON.stringify(missionStates || {}),
        JSON.stringify(curriculumCustomGates || {}),
        new Date().toISOString()
      ]
    );
    res.json({ success: true, message: 'Progress saved successfully' });
  } catch (err) {
    console.error("Save progress error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Curriculum: Load Progress
app.get(`${BASE_PATH}/api/user/progress`, authenticateToken, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM progress WHERE username = ?', [req.username]);
    if (!row) {
      return res.json({
        completedMissions: [],
        missionStates: {},
        curriculumCustomGates: {}
      });
    }
    res.json({
      completedMissions: JSON.parse(row.completed_missions),
      missionStates: JSON.parse(row.mission_states),
      curriculumCustomGates: JSON.parse(row.curriculum_custom_gates)
    });
  } catch (err) {
    console.error("Load progress error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Sandbox: Save/Update Circuit
app.post(`${BASE_PATH}/api/circuits`, authenticateToken, async (req, res) => {
  const { id, name, state } = req.body;
  if (!id || !name || !state) {
    return res.status(400).json({ error: 'Missing circuit fields (id, name, state)' });
  }
  
  try {
    await dbRun(
      `INSERT INTO circuits (id, username, name, state, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         state = excluded.state,
         updated_at = excluded.updated_at`,
      [
        id,
        req.username,
        name,
        JSON.stringify(state),
        new Date().toISOString()
      ]
    );
    res.json({ success: true, message: 'Circuit saved successfully' });
  } catch (err) {
    console.error("Save circuit error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Sandbox: List Saved Circuits
app.get(`${BASE_PATH}/api/circuits`, authenticateToken, async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, name, state, updated_at FROM circuits WHERE username = ? ORDER BY updated_at DESC', [req.username]);
    const circuits = rows.map(r => ({
      id: r.id,
      name: r.name,
      state: JSON.parse(r.state),
      updatedAt: r.updated_at
    }));
    res.json(circuits);
  } catch (err) {
    console.error("List circuits error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Sandbox: Delete Circuit
app.delete(`${BASE_PATH}/api/circuits/:id`, authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const circuit = await dbGet('SELECT * FROM circuits WHERE id = ? AND username = ?', [id, req.username]);
    if (!circuit) {
      return res.status(404).json({ error: 'Circuit not found' });
    }
    
    await dbRun('DELETE FROM circuits WHERE id = ? AND username = ?', [id, req.username]);
    res.json({ success: true, message: 'Circuit deleted successfully' });
  } catch (err) {
    console.error("Delete circuit error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend static build files
app.use(BASE_PATH, express.static(path.join(__dirname, 'dist')));

// Fallback: Support client-side routing (React Router)
app.get(`${BASE_PATH}/{*any}`, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GateSim Server (Dynamic) listening on http://localhost:${PORT}${BASE_PATH}`);
});
