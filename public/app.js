import { requirePasscode } from './auth.js';

const cleanerGrid = document.getElementById('cleanerGrid');
const logList = document.getElementById('logList');
const statusBanner = document.getElementById('statusBanner');
const refreshButton = document.getElementById('refreshButton');

let cleaners = [];
let logs = [];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load data');
  return response.json();
}

function formatTimestamp(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function renderCleaners() {
  cleanerGrid.innerHTML = '';
  cleaners.forEach((cleaner) => {
    const button = document.createElement('button');
    button.className = `cleaner ${cleaner.status}`;
    button.dataset.cleanerId = cleaner.id;
    const formattedLast = formatTimestamp(cleaner.lastTimestamp);
    const statusLabel =
      cleaner.status === 'clocked-in'
        ? formattedLast
          ? `Clocked in since ${formattedLast}`
          : 'Clocked in'
        : formattedLast
        ? `Last clocked out ${formattedLast}`
        : 'Clocked out';
    button.innerHTML = `
      <span class="name">${cleaner.name}</span>
      <span class="status">${statusLabel}</span>
    `;
    button.addEventListener('click', () => toggleClock(cleaner.id));
    cleanerGrid.appendChild(button);
  });
}

function renderLogs() {
  logList.innerHTML = '';
  logs
    .slice()
    .reverse()
    .slice(0, 10)
    .forEach((log) => {
      const item = document.createElement('li');
      const time = new Date(log.timestamp).toLocaleString();
      item.textContent = `${time} – ${log.cleanerName} ${log.action === 'clock-in' ? 'clocked in' : 'clocked out'}`;
      logList.appendChild(item);
    });
}

function showStatus(message, type = 'info') {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  if (message) {
    setTimeout(() => {
      statusBanner.textContent = '';
      statusBanner.className = 'status-banner';
    }, 5000);
  }
}

async function loadData() {
  try {
    const [cleanerData, logData] = await Promise.all([
      fetchJson('api/cleaners.php'),
      fetchJson('api/logs.php'),
    ]);
    cleaners = cleanerData;
    logs = logData;
    renderCleaners();
    renderLogs();
  } catch (error) {
    console.error(error);
    showStatus('Unable to load data. Check your connection.', 'error');
  }
}

async function toggleClock(cleanerId) {
  try {
    const response = await fetch('api/clock.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cleanerId }),
    });
    if (!response.ok) throw new Error('Clock action failed');
    const entry = await response.json();
    logs.push(entry);
    const cleaner = cleaners.find((c) => c.id === cleanerId);
    if (cleaner) {
      cleaner.status = entry.status;
      cleaner.lastAction = entry.action;
      cleaner.lastTimestamp = entry.timestamp;
    }
    renderCleaners();
    renderLogs();
    showStatus(`${entry.cleanerName} ${entry.action === 'clock-in' ? 'clocked in' : 'clocked out'}.`, 'success');
  } catch (error) {
    console.error(error);
    showStatus('There was a problem saving your time. Please try again.', 'error');
  }
}

refreshButton.addEventListener('click', loadData);

requirePasscode({
  onAuthenticated: loadData,
});
