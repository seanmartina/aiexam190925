import { requirePasscode } from './auth.js';

const cleanerGrid = document.getElementById('cleanerGrid');
const logList = document.getElementById('logList');
const statusBanner = document.getElementById('statusBanner');
const refreshButton = document.getElementById('refreshButton');

let cleaners = [];
let logs = [];

async function fetchJson(url) {
  const requestUrl = new URL(url, window.location.origin);
  requestUrl.searchParams.set('_', Date.now().toString());

  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event('auth:required'));
    throw new Error('Authentication required');
  }
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

function buildSinceText(cleaner) {
  const formattedTimestamp = formatTimestamp(cleaner.lastTimestamp);

  if (cleaner.status === 'clocked-in') {
    return formattedTimestamp ? `Clocked in since ${formattedTimestamp}` : 'Clocked in';
  }

  if (formattedTimestamp) {
    const actionLabel = cleaner.lastAction === 'clock-in' ? 'Clocked in' : 'Clocked out';
    return `${actionLabel} at ${formattedTimestamp}`;
  }

  return 'No activity yet';
}

function renderCleaners() {
  cleanerGrid.innerHTML = '';
  cleaners.forEach((cleaner) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cleaner-card ${cleaner.status}`;
    button.dataset.cleanerId = cleaner.id;
    const statusLabel = cleaner.status === 'clocked-in' ? 'Clocked in' : 'Clocked out';
    const sinceText = buildSinceText(cleaner);

    button.setAttribute('aria-pressed', cleaner.status === 'clocked-in' ? 'true' : 'false');
    button.setAttribute('aria-label', `${cleaner.name}: ${statusLabel}. ${sinceText}.`);

    button.innerHTML = `
      <div class="card-header">
        <div class="person">
          <span class="status-dot ${cleaner.status}" aria-hidden="true"></span>
          <div class="details">
            <span class="name">${cleaner.name}</span>
            <span class="since">${sinceText}</span>
            <span class="status-label">${statusLabel}</span>
          </div>
        </div>
      </div>
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
    if (error instanceof Error && error.message === 'Authentication required') {
      showStatus('Session expired. Please enter the passcode again.', 'error');
    } else {
      showStatus('Unable to load data. Check your connection.', 'error');
    }
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
      credentials: 'same-origin',
    });
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:required'));
      throw new Error('Authentication required');
    }
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
    if (error instanceof Error && error.message === 'Authentication required') {
      showStatus('Please re-enter the passcode to continue.', 'error');
    } else {
      showStatus('There was a problem saving your time. Please try again.', 'error');
    }
  }
}

refreshButton.addEventListener('click', loadData);

requirePasscode({
  onAuthenticated: loadData,
});
