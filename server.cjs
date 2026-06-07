const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 8081;
const BASE_PATH = '/gatesimulator';

// Database paths inside the project workspace
const DB_DIR = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const CIRCUITS_FILE = path.join(DB_DIR, 'circuits.json');
const PROGRESS_FILE = path.join(DB_DIR, 'progress.json');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize files if they don't exist
const initFile = (filePath, defaultData) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
};
initFile(USERS_FILE, []);
initFile(CIRCUITS_FILE, {});
initFile(PROGRESS_FILE, {});

app.use(express.json());

// Helper functions for file DB
const readData = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeData = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// Simple Session Storage (Tokens)
const activeSessions = new Map(); // token -> username

// Helper for crypto hashing (Built-in Node.js crypto, zero native dependency issues)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Middleware: Authenticate Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  
  const username = activeSessions.get(token);
  if (!username) return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  
  req.username = username;
  next();
};

// --- API ROUTES ---

// 1. Auth: Register
app.post(`${BASE_PATH}/api/auth/register`, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const users = readData(USERS_FILE);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  users.push({
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  });
  
  writeData(USERS_FILE, users);
  res.status(201).json({ success: true, message: 'Registration successful' });
});

// 2. Auth: Login
app.post(`${BASE_PATH}/api/auth/login`, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const users = readData(USERS_FILE);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }
  
  // Generate random secure token
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, user.username);
  
  res.json({ success: true, token, username: user.username });
});

// 3. Auth: Profile Check
app.get(`${BASE_PATH}/api/auth/profile`, authenticateToken, (req, res) => {
  res.json({ username: req.username });
});

// 4. Curriculum: Save Progress
app.post(`${BASE_PATH}/api/user/progress`, authenticateToken, (req, res) => {
  const { completedMissions, missionStates, curriculumCustomGates } = req.body;
  const progress = readData(PROGRESS_FILE);
  
  progress[req.username] = {
    completedMissions: completedMissions || [],
    missionStates: missionStates || {},
    curriculumCustomGates: curriculumCustomGates || {},
    updatedAt: new Date().toISOString()
  };
  
  writeData(PROGRESS_FILE, progress);
  res.json({ success: true, message: 'Progress saved successfully' });
});

// 5. Curriculum: Load Progress
app.get(`${BASE_PATH}/api/user/progress`, authenticateToken, (req, res) => {
  const progress = readData(PROGRESS_FILE);
  const userProgress = progress[req.username] || {
    completedMissions: [],
    missionStates: {},
    curriculumCustomGates: {}
  };
  res.json(userProgress);
});

// 6. Sandbox: Save/Update Circuit
app.post(`${BASE_PATH}/api/circuits`, authenticateToken, (req, res) => {
  const { id, name, state } = req.body;
  if (!id || !name || !state) {
    return res.status(400).json({ error: 'Missing circuit fields (id, name, state)' });
  }
  
  const circuits = readData(CIRCUITS_FILE);
  const userCircuits = circuits[req.username] || [];
  
  const existingIdx = userCircuits.findIndex(c => c.id === id);
  const circuitData = {
    id,
    name,
    state,
    updatedAt: new Date().toISOString()
  };
  
  if (existingIdx >= 0) {
    userCircuits[existingIdx] = circuitData;
  } else {
    userCircuits.push(circuitData);
  }
  
  circuits[req.username] = userCircuits;
  writeData(CIRCUITS_FILE, circuits);
  
  res.json({ success: true, message: 'Circuit saved successfully', circuit: circuitData });
});

// 7. Sandbox: List Saved Circuits
app.get(`${BASE_PATH}/api/circuits`, authenticateToken, (req, res) => {
  const circuits = readData(CIRCUITS_FILE);
  const userCircuits = circuits[req.username] || [];
  res.json(userCircuits);
});

// 8. Sandbox: Delete Circuit
app.delete(`${BASE_PATH}/api/circuits/:id`, authenticateToken, (req, res) => {
  const { id } = req.params;
  const circuits = readData(CIRCUITS_FILE);
  const userCircuits = circuits[req.username] || [];
  
  const nextCircuits = userCircuits.filter(c => c.id !== id);
  circuits[req.username] = nextCircuits;
  writeData(CIRCUITS_FILE, circuits);
  
  res.json({ success: true, message: 'Circuit deleted successfully' });
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
