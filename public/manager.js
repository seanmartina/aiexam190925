const managerList = document.getElementById('managerList');
const managerStatus = document.getElementById('managerStatus');
const refreshButton = document.getElementById('managerRefresh');

let cleaners = [];
let refreshTimer = null;

function showStatus(message, type = 'info') {
  managerStatus.textContent = message;
  managerStatus.className = `status-banner ${type}`;
  if (message) {
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

function renderManagerList() {
  managerList.innerHTML = '';
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

    item.appendChild(person);
    item.appendChild(statusText);

    managerList.appendChild(item);
  });
}

async function loadManagerView() {
  try {
    cleaners = await fetchCleaners();
    renderManagerList();
  } catch (error) {
    console.error(error);
    showStatus('Unable to load cleaner statuses. Try again later.', 'error');
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(loadManagerView, 60000);
}

refreshButton.addEventListener('click', () => {
  loadManagerView();
  showStatus('List refreshed.', 'success');
});

loadManagerView();
startAutoRefresh();
