import { requirePasscode } from './auth.js';

const adminStatus = document.getElementById('adminStatus');
const adminCleanerList = document.getElementById('adminCleanerList');
const addCleanerForm = document.getElementById('addCleanerForm');
const addCleanerNameInput = document.getElementById('addCleanerName');
const exportLogsForm = document.getElementById('exportLogsForm');
const exportMonthInput = document.getElementById('exportMonth');

let cleaners = [];

function showStatus(message, type = 'info') {
  if (!adminStatus) {
    return;
  }

  adminStatus.textContent = message;
  adminStatus.className = `status-banner ${type}`;

  if (message && type !== 'info') {
    setTimeout(() => {
      adminStatus.textContent = '';
      adminStatus.className = 'status-banner';
    }, 5000);
  }
}

async function fetchJson(endpoint) {
  const requestUrl = new URL(endpoint, window.location.origin);
  requestUrl.searchParams.set('_', Date.now().toString());

  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${endpoint}`);
  }

  return response.json();
}

function renderAdminCleanerList() {
  if (!adminCleanerList) {
    return;
  }

  adminCleanerList.innerHTML = '';

  if (!cleaners.length) {
    const empty = document.createElement('li');
    empty.className = 'admin-empty';
    empty.textContent = 'No cleaners available yet.';
    adminCleanerList.appendChild(empty);
    return;
  }

  const sorted = cleaners.slice().sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach((cleaner) => {
    const row = document.createElement('li');
    row.className = 'admin-item';

    const name = document.createElement('span');
    name.className = 'admin-name';
    name.textContent = cleaner.name;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'danger compact';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => deleteCleaner(cleaner.id));

    row.appendChild(name);
    row.appendChild(removeButton);
    adminCleanerList.appendChild(row);
  });
}

async function loadCleaners({ suppressStatus = false } = {}) {
  try {
    const data = await fetchJson('api/cleaners.php');
    cleaners = data;
    renderAdminCleanerList();
    if (!suppressStatus) {
      const now = new Date();
      const timeString = now.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
      showStatus(`Cleaner list updated at ${timeString}.`, 'info');
    }
  } catch (error) {
    console.error(error);
    showStatus('Unable to load cleaners. Try again later.', 'error');
  }
}

if (addCleanerForm) {
  addCleanerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = addCleanerNameInput ? addCleanerNameInput.value.trim() : '';
    if (!name) {
      showStatus('Enter a name to add a cleaner.', 'error');
      return;
    }

    try {
      const response = await fetch('api/cleaners.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Unable to add cleaner.');
      }

      if (addCleanerNameInput) {
        addCleanerNameInput.value = '';
      }

      await loadCleaners({ suppressStatus: true });
      showStatus(`Added ${name}.`, 'success');
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'Unable to add cleaner.', 'error');
    }
  });
}

async function deleteCleaner(cleanerId) {
  if (!cleanerId) {
    return;
  }

  try {
    const response = await fetch(`api/cleaners.php?id=${encodeURIComponent(cleanerId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Unable to remove cleaner.');
    }

    await loadCleaners({ suppressStatus: true });
    showStatus('Cleaner removed.', 'success');
  } catch (error) {
    console.error(error);
    showStatus(error.message || 'Unable to remove cleaner.', 'error');
  }
}

async function exportLogs(monthValue) {
  const requestUrl = new URL('api/logs.php', window.location.origin);
  requestUrl.searchParams.set('month', monthValue);

  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Unable to export logs.');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `logs-${monthValue}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}

if (exportLogsForm) {
  exportLogsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const monthValue = exportMonthInput ? exportMonthInput.value : '';
    if (!monthValue) {
      showStatus('Select a month to export logs.', 'error');
      return;
    }

    try {
      await exportLogs(monthValue);
      showStatus(`Exported logs for ${monthValue}.`, 'success');
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'Unable to export logs.', 'error');
    }
  });
}

if (exportMonthInput) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  exportMonthInput.value = `${now.getFullYear()}-${month}`;
}

requirePasscode({
  onAuthenticated: () => {
    loadCleaners();
  },
});
