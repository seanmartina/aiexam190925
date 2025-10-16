import { requirePasscode } from './auth.js';

const managerList = document.getElementById('managerList');
const managerStatus = document.getElementById('managerStatus');
const refreshButton = document.getElementById('managerRefresh');

let cleaners = [];
let cleanerHistories = new Map();
let refreshTimer = null;
const openHistoryPanels = new Set();

function showStatus(message, type = 'info') {
  managerStatus.textContent = message;
  managerStatus.className = `status-banner ${type}`;
  if (message && type !== 'info') {
    setTimeout(() => {
      managerStatus.textContent = '';
      managerStatus.className = 'status-banner';
    }, 5000);
  }
}

async function fetchCleaners() {
  const response = await fetch('api/cleaners.php', {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Unable to fetch cleaners');
  }
  return response.json();
}

async function fetchLogs() {
  const response = await fetch('api/logs.php', {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Unable to fetch logs');
  }
  return response.json();
}

function formatTimestamp(isoString) {
  if (!isoString) return 'No activity yet';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'No activity yet';
  }
  return date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function formatHistoryTimestamp(isoString) {
  if (!isoString) return 'Unknown time';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildHistories(logs = []) {
  const limit = new Date();
  limit.setDate(limit.getDate() - 10);
  const map = new Map();

  logs.forEach((entry) => {
    const cleanerId = entry.cleanerId;
    const timestamp = entry.timestamp;
    if (!cleanerId || !timestamp) {
      return;
    }
    const when = new Date(timestamp);
    if (Number.isNaN(when.getTime()) || when < limit) {
      return;
    }

    if (!map.has(cleanerId)) {
      map.set(cleanerId, []);
    }
    map.get(cleanerId).push(entry);
  });

  map.forEach((entries, cleanerId) => {
    entries.sort((a, b) => {
      const first = new Date(b.timestamp).getTime();
      const second = new Date(a.timestamp).getTime();
      return Number.isNaN(first) || Number.isNaN(second) ? 0 : first - second;
    });
    map.set(cleanerId, entries);
  });

  return map;
}

function renderManagerList() {
  managerList.innerHTML = '';
  const validIds = new Set(cleaners.map((cleaner) => cleaner.id));
  Array.from(openHistoryPanels).forEach((id) => {
    if (!validIds.has(id)) {
      openHistoryPanels.delete(id);
    }
  });

  if (!cleaners.length) {
    const empty = document.createElement('li');
    empty.className = 'manager-card empty';
    empty.textContent = 'No cleaners configured yet.';
    managerList.appendChild(empty);
    return;
  }

  const sorted = cleaners.slice().sort((a, b) => {
    if (a.status === b.status) {
      return a.name.localeCompare(b.name);
    }
    return a.status === 'clocked-in' ? -1 : 1;
  });

  sorted.forEach((cleaner) => {
    const item = document.createElement('li');
    item.className = `manager-card ${cleaner.status}`;

    const header = document.createElement('div');
    header.className = 'card-header';

    const person = document.createElement('div');
    person.className = 'person';

    const dot = document.createElement('span');
    dot.className = `status-dot ${cleaner.status}`;
    dot.setAttribute('aria-hidden', 'true');

    const details = document.createElement('div');
    details.className = 'details';

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = cleaner.name;

    const since = document.createElement('span');
    since.className = 'since';
    let sinceText = 'No activity yet';
    if (cleaner.status === 'clocked-in') {
      sinceText = cleaner.lastTimestamp
        ? `Clocked in since ${formatTimestamp(cleaner.lastTimestamp)}`
        : 'Clocked in';
    } else if (cleaner.lastTimestamp) {
      const actionLabel = cleaner.lastAction === 'clock-in' ? 'Clocked in' : 'Clocked out';
      sinceText = `${actionLabel} at ${formatTimestamp(cleaner.lastTimestamp)}`;
    }
    since.textContent = sinceText;

    details.appendChild(name);
    details.appendChild(since);

    person.appendChild(dot);
    person.appendChild(details);

    const statusText = document.createElement('span');
    statusText.className = 'status-label';
    statusText.textContent = cleaner.status === 'clocked-in' ? 'Clocked in' : 'Clocked out';

    header.appendChild(person);
    header.appendChild(statusText);
    item.appendChild(header);

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'history-toggle';
    toggle.textContent = 'Recent activity (last 10 days)';

    const panel = document.createElement('div');
    const panelId = `history-${cleaner.id}`;
    panel.id = panelId;
    panel.className = 'history-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', `Recent activity for ${cleaner.name}`);

    const historyList = document.createElement('ul');
    historyList.className = 'history-list';

    const historyEntries = cleanerHistories.get(cleaner.id) || [];
    if (historyEntries.length === 0) {
      const emptyState = document.createElement('li');
      emptyState.className = 'history-empty';
      emptyState.textContent = 'No activity recorded in the past 10 days.';
      historyList.appendChild(emptyState);
    } else {
      historyEntries.forEach((entry) => {
        const row = document.createElement('li');
        row.className = 'history-entry';

        const action = document.createElement('span');
        action.className = `history-action ${entry.action}`;
        action.textContent = entry.action === 'clock-in' ? 'Clocked in' : 'Clocked out';

        const time = document.createElement('time');
        time.className = 'history-time';
        time.dateTime = entry.timestamp;
        time.textContent = formatHistoryTimestamp(entry.timestamp);

        row.appendChild(action);
        row.appendChild(time);
        historyList.appendChild(row);
      });
    }

    panel.appendChild(historyList);
    panel.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', panelId);

    if (openHistoryPanels.has(cleaner.id)) {
      panel.classList.remove('hidden');
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', () => {
      const isOpen = openHistoryPanels.has(cleaner.id);
      if (isOpen) {
        openHistoryPanels.delete(cleaner.id);
        panel.classList.add('hidden');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        openHistoryPanels.add(cleaner.id);
        panel.classList.remove('hidden');
        toggle.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });

    cardBody.appendChild(toggle);
    cardBody.appendChild(panel);
    item.appendChild(cardBody);

    managerList.appendChild(item);
  });
}

async function loadManagerView() {
  try {
    const [cleanerData, logData] = await Promise.all([fetchCleaners(), fetchLogs()]);
    cleaners = cleanerData;
    cleanerHistories = buildHistories(logData);
    renderManagerList();
    const now = new Date();
    const timeString = now.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    showStatus(`Last updated at ${timeString}`, 'info');
  } catch (error) {
    console.error(error);
    showStatus('Unable to load cleaner statuses. Try again later.', 'error');
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(loadManagerView, 30000);
}

refreshButton.addEventListener('click', () => {
  loadManagerView();
  showStatus('List refreshed.', 'success');
});

requirePasscode({
  onAuthenticated: () => {
    loadManagerView();
    startAutoRefresh();
  },
});
