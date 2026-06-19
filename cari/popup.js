const DEFAULT_SETTINGS = {
  delayAfterScan: 500,
  chatButtonTimeout: 5000,
  sidebarTimeout: 5000,
  refocusDelay: 500,
  debugLog: false
};

const STORAGE_KEYS = {
  settings: 'rch_settings',
  status: 'rch_status',
  logs: 'rch_logs'
};

const settingIds = [
  'delayAfterScan',
  'chatButtonTimeout',
  'sidebarTimeout',
  'refocusDelay',
  'debugLog'
];

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

async function sendMessageToTab(action, payload = {}) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    updateStatus('Tidak ada tab aktif yang tersedia', true);
    return null;
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus('Konten extension tidak tersedia di halaman ini', true);
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(value) {
  return new Promise((resolve) => chrome.storage.local.set(value, resolve));
}

function updateStatus(message, isError = false) {
  const statusEl = document.getElementById('popupStatus');
  const badgeEl = document.getElementById('activeBadge');

  if (statusEl) {
    statusEl.textContent = message;
  }

  if (badgeEl) {
    badgeEl.textContent = isError ? 'Error' : 'Aktif';
    badgeEl.classList.toggle('error', isError);
  }
}

function renderSettings(settings) {
  const normalized = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  for (const id of settingIds) {
    const input = document.getElementById(id);
    if (!input) continue;

    if (input.type === 'checkbox') {
      input.checked = Boolean(normalized[id]);
    } else {
      input.value = normalized[id];
    }
  }
}

function readSettingsFromForm() {
  return {
    delayAfterScan: readNumber('delayAfterScan', DEFAULT_SETTINGS.delayAfterScan),
    chatButtonTimeout: readNumber('chatButtonTimeout', DEFAULT_SETTINGS.chatButtonTimeout),
    sidebarTimeout: readNumber('sidebarTimeout', DEFAULT_SETTINGS.sidebarTimeout),
    refocusDelay: readNumber('refocusDelay', DEFAULT_SETTINGS.refocusDelay),
    debugLog: document.getElementById('debugLog').checked
  };
}

function readNumber(id, fallback) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : fallback;
}

function renderLogs(logs) {
  const list = document.getElementById('logList');
  if (!list) return;

  if (!Array.isArray(logs) || logs.length === 0) {
    list.textContent = 'Belum ada log.';
    return;
  }

  list.innerHTML = logs.slice(0, 8).map((entry) => {
    const time = escapeHtml(entry.time || '');
    const message = escapeHtml(entry.message || '');
    const state = escapeHtml(entry.state || '');
    return `<div class="log-item"><strong>${time}</strong> ${message}<br><span>${state}</span></div>`;
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderSnapshot(snapshot) {
  if (!snapshot) return;

  const status = snapshot.status || {};
  const isError = String(status.state || '').startsWith('ERROR') || Boolean(status.error);
  updateStatus(status.label || 'Aktif', isError);

  const lastResi = document.getElementById('lastResi');
  if (lastResi) {
    lastResi.textContent = `Resi terakhir: ${status.lastResi || '-'}`;
  }

  renderSettings(snapshot.settings);
  renderLogs(snapshot.logs);
}

async function refresh() {
  const response = await sendMessageToTab('getStatus');
  if (response) {
    renderSnapshot(response);
    return;
  }

  const local = await storageGet([STORAGE_KEYS.settings, STORAGE_KEYS.status, STORAGE_KEYS.logs]);
  renderSnapshot({
    settings: local[STORAGE_KEYS.settings] || DEFAULT_SETTINGS,
    status: { label: 'Tidak aktif di halaman ini', state: 'ERROR_INACTIVE_TAB', lastResi: '' },
    logs: local[STORAGE_KEYS.logs] || []
  });
}

async function saveSettings() {
  const settings = readSettingsFromForm();
  await storageSet({ [STORAGE_KEYS.settings]: settings });
  const response = await sendMessageToTab('updateSettings', { settings });
  if (response) {
    renderSnapshot(response);
  }
}

function bindEvents() {
  document.getElementById('focusResiBtn').addEventListener('click', async () => {
    renderSnapshot(await sendMessageToTab('focusResi'));
  });

  document.getElementById('runFlowBtn').addEventListener('click', async () => {
    renderSnapshot(await sendMessageToTab('runFlow'));
  });

  document.getElementById('retryChatBtn').addEventListener('click', async () => {
    renderSnapshot(await sendMessageToTab('retryOpenChat'));
  });

  document.getElementById('refreshBtn').addEventListener('click', refresh);

  for (const id of settingIds) {
    const input = document.getElementById(id);
    input.addEventListener('change', saveSettings);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();

  const local = await storageGet(STORAGE_KEYS.settings);
  renderSettings(local[STORAGE_KEYS.settings] || DEFAULT_SETTINGS);
  await refresh();
});
