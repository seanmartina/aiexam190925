const cleanerGrid = document.getElementById('cleanerGrid');
const logList = document.getElementById('logList');
const statusBanner = document.getElementById('statusBanner');
const refreshButton = document.getElementById('refreshButton');
const scanToggle = document.getElementById('scanToggle');
const scannerSection = document.getElementById('scanner');
const stopScanButton = document.getElementById('stopScan');
const scannerVideo = document.getElementById('scannerVideo');

let cleaners = [];
let logs = [];
let scanning = false;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load data');
  return response.json();
}

function renderCleaners() {
  cleanerGrid.innerHTML = '';
  cleaners.forEach((cleaner) => {
    const button = document.createElement('button');
    button.className = `cleaner ${cleaner.status}`;
    button.dataset.cleanerId = cleaner.id;
    button.innerHTML = `
      <span class="name">${cleaner.name}</span>
      <span class="status">${cleaner.status === 'clocked-in' ? 'Clocked in' : 'Clocked out'}</span>
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
      fetchJson('/api/cleaners'),
      fetchJson('/api/logs'),
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
    const response = await fetch('/api/clock', {
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
    }
    renderCleaners();
    renderLogs();
    showStatus(`${entry.cleanerName} ${entry.action === 'clock-in' ? 'clocked in' : 'clocked out'}.`, 'success');
  } catch (error) {
    console.error(error);
    showStatus('There was a problem saving your time. Please try again.', 'error');
  }
}

function startScanning() {
  if (scanning) return;
  scanning = true;
  scannerSection.classList.remove('hidden');
  scanToggle.disabled = true;

  const config = {
    inputStream: {
      type: 'LiveStream',
      target: scannerVideo,
      constraints: {
        facingMode: 'environment',
      },
    },
    decoder: {
      readers: ['code_128_reader', 'ean_reader', 'upc_reader'],
    },
    locate: true,
  };

  if (window.Quagga) {
    window.Quagga.init(config, (err) => {
      if (err) {
        console.error(err);
        showStatus('Unable to start camera. Check permissions.', 'error');
        stopScanning();
        return;
      }
      window.Quagga.start();
      window.Quagga.onDetected(onBarcodeDetected);
    });
  }
}

function stopScanning() {
  if (!scanning) return;
  scanning = false;
  scanToggle.disabled = false;
  scannerSection.classList.add('hidden');
  if (window.Quagga) {
    window.Quagga.stop();
    window.Quagga.offDetected(onBarcodeDetected);
  }
}

function onBarcodeDetected(result) {
  const code = result.codeResult?.code;
  if (!code) return;
  const match = cleaners.find((cleaner) => cleaner.barcode === code);
  if (match) {
    stopScanning();
    toggleClock(match.id);
  } else {
    showStatus('Barcode not recognised. Please select your name manually.', 'error');
  }
}

refreshButton.addEventListener('click', loadData);
scanToggle.addEventListener('click', startScanning);
stopScanButton.addEventListener('click', stopScanning);

loadData();
