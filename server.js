const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const CLEANERS_FILE = path.join(DATA_DIR, 'cleaners.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CLEANERS_FILE)) {
    fs.writeFileSync(CLEANERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getCleanerStatus(cleanerId, logs) {
  const lastEntry = [...logs].reverse().find((entry) => entry.cleanerId === cleanerId);
  return lastEntry?.action === 'clock-in' ? 'clocked-in' : 'clocked-out';
}

app.get('/api/cleaners', (req, res) => {
  const cleaners = readJson(CLEANERS_FILE);
  const logs = readJson(LOGS_FILE);
  const enriched = cleaners.map((cleaner) => ({
    ...cleaner,
    status: getCleanerStatus(cleaner.id, logs),
  }));
  res.json(enriched);
});

app.get('/api/logs', (req, res) => {
  const logs = readJson(LOGS_FILE);
  res.json(logs);
});

app.post('/api/clock', (req, res) => {
  const { cleanerId, action } = req.body;
  if (!cleanerId) {
    return res.status(400).json({ message: 'Cleaner ID is required.' });
  }

  const cleaners = readJson(CLEANERS_FILE);
  const cleaner = cleaners.find((c) => c.id === cleanerId);
  if (!cleaner) {
    return res.status(404).json({ message: 'Cleaner not found.' });
  }

  const logs = readJson(LOGS_FILE);
  const status = getCleanerStatus(cleanerId, logs);

  const nextAction = action || (status === 'clocked-in' ? 'clock-out' : 'clock-in');
  if (!['clock-in', 'clock-out'].includes(nextAction)) {
    return res.status(400).json({ message: 'Invalid action.' });
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cleanerId,
    cleanerName: cleaner.name,
    action: nextAction,
    timestamp: new Date().toISOString(),
  };

  logs.push(entry);
  writeJson(LOGS_FILE, logs);

  res.json({ ...entry, status: nextAction === 'clock-in' ? 'clocked-in' : 'clocked-out' });
});

ensureDataFiles();

app.listen(PORT, () => {
  console.log(`Cleaner clock-in system running on port ${PORT}`);
});
