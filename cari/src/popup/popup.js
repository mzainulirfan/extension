'use strict';

// Popup controller hasil redesign: badge 3-state + stepper + aksi parsial-busy.
(() => {
  const C = window.RCH_CONSTANTS;
  const storage = window.RCH_STORAGE;
  const DEFAULT_SETTINGS = C.DEFAULT_SETTINGS;
  const STORAGE_KEYS = C.STORAGE_KEYS;

  const settingIds = [
    'delayAfterScan',
    'chatButtonTimeout',
    'sidebarTimeout',
    'sidebarRounds',
    'refocusDelay',
    'debugLog'
  ];

  // STATES → langkah stepper (search / chat / sidebar / done).
  const STATE_TO_STEP = {
    IDLE: -1,
    FOCUS_RESI_INPUT: 0,
    WAITING_RESI_ENTER: 0,
    WAITING_ORDER_RESULT: 0,
    FIND_CHAT_BUTTON: 1,
    CLICK_CHAT_BUTTON: 1,
    WAIT_CHAT_SIDEBAR: 2,
    OPEN_CHAT_ITEM: 2,
    CLOSE_CONFIRM_BANNER: 2,
    REFOCUS_RESI_INPUT: 3,
    DONE: 3,
    STANDBY: -1,
    ERROR_INPUT_NOT_FOUND: 0,
    ERROR_EMPTY_RESI: 0,
    ERROR_CHAT_BUTTON_NOT_FOUND: 1,
    ERROR_SIDEBAR_NOT_FOUND: 2,
    ERROR_SIDEBAR_HIDDEN: 2,
    ERROR_CHAT_ITEM_NOT_FOUND: 2
  };

  const ERROR_HINTS = {
    ERROR_INPUT_NOT_FOUND: 'Buka halaman pesanan yang ada kolom resi, lalu Refresh.',
    ERROR_EMPTY_RESI: 'Isi nomor resi dulu sebelum menjalankan flow.',
    ERROR_CHAT_BUTTON_NOT_FOUND: 'Pastikan hasil pesanan sudah muncul, lalu tekan Retry.',
    ERROR_SIDEBAR_NOT_FOUND: 'Sidebar chat tidak terbuka — tekan Retry satu kali.',
    ERROR_SIDEBAR_HIDDEN: 'Panel chat ada tapi tersembunyi — klik tombol chat buyer sekali manual, lalu Retry.',
    ERROR_CHAT_ITEM_NOT_FOUND: 'Daftar chat kosong — buka manual satu chat lalu ulangi.',
    ERROR_INACTIVE_TAB: 'Bukan halaman seller — tekan "Buka Halaman Seller" di bawah.',
    STANDBY: 'Kembali ke halaman scan (Perlu Dikirim) untuk siap scan resi.'
  };

  let lastSnapshot = null;
  let saveTimer = null;
  let offSellerMode = false;

  function isSellerUrl(url) {
    if (!url) return false;
    try {
      return C.SELLER_HOST_PATTERN.test(new URL(url).hostname);
    } catch (error) {
      return false;
    }
  }

  // Deteksi live halaman scan dari URL tab aktif (pola sama seperti content:
  // path + nilai query harus persis, urutan bebas). Popup tak bisa akses DOM
  // content script, jadi pola dicocokkan ulang di sini.
  function isScanPageUrlLive(url) {
    try {
      const parsed = new URL(String(url));
      if (!C.SELLER_HOST_PATTERN.test(parsed.hostname)) return false;
      if (parsed.pathname !== (C.SCAN_PATH || '/portal/sale/order')) return false;
      const want = C.SCAN_QUERY || {};
      for (const key of Object.keys(want)) {
        if (parsed.searchParams.get(key) !== String(want[key])) return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function renderLivePage(url) {
    const el = document.getElementById('livePage');
    if (!el) return;
    if (!url) {
      el.textContent = 'Halaman: tidak diketahui';
      return;
    }
    el.textContent = isScanPageUrlLive(url)
      ? 'Halaman: scan terdeteksi (live) — siap scan'
      : 'Halaman: bukan halaman scan';
  }

  // Mode luar-seller: tombol primer jadi CTA navigasi, bukan aksi flow.
  function setOffSellerMode(on) {
    offSellerMode = on;
    const btn = document.getElementById('runFlowBtn');
    if (btn) {
      if (on) {
        if (!btn.dataset.label) btn.dataset.label = btn.textContent;
        btn.textContent = 'Buka Halaman Seller';
      } else if (btn.dataset.label) {
        btn.textContent = btn.dataset.label;
        delete btn.dataset.label;
      }
    }
  }

  // Cari tab seller yang sudah terbuka (url tab seller terlihat berkat host_permissions).
  function findExistingSellerTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const found = (tabs || []).find((t) => isSellerUrl(t.url));
        resolve(found || null);
      });
    });
  }

  // Buka/aktifkan halaman seller siap scan. Popup tertutup otomatis,
  // niat "siap scan" dititipkan via storage dan dibaca content.js saat init.
  async function openSellerPage() {
    updateStatus('Membuka halaman seller…', 'busy');
    await storage.set({ [STORAGE_KEYS.pending]: { action: 'focusResi', setAt: Date.now() } });

    const existing = await findExistingSellerTab();
    if (existing && existing.id != null) {
      await new Promise((resolve) => chrome.tabs.update(existing.id, { active: true }, resolve));
      if (existing.windowId != null) {
        chrome.windows.update(existing.windowId, { focused: true }, () => {});
      }
      window.close();
      return;
    }

    chrome.tabs.create({ url: C.SELLER_ORDER_URL, active: true });
    window.close();
  }

  function getActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
    });
  }

  async function sendMessageToTab(action, payload = {}) {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      updateStatus('Tidak ada tab aktif yang tersedia', 'error');
      return null;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action, ...payload }, (response) => {
        if (chrome.runtime.lastError) {
          updateStatus('Konten extension tidak tersedia di halaman ini', 'error');
          renderHint('ERROR_INACTIVE_TAB');
          resolve(null);
          return;
        }
        resolve(response);
      });
    });
  }

  // tone: idle | busy | ok | error
  function updateStatus(message, tone = 'ok') {
    const statusEl = document.getElementById('popupStatus');
    const badgeEl = document.getElementById('activeBadge');

    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.toggle('muted', tone !== 'error');
    }

    if (badgeEl) {
      const label = tone === 'error' ? 'Error' : tone === 'busy' ? 'Memproses' : tone === 'idle' ? 'Menunggu' : 'Aktif';
      badgeEl.textContent = label;
      badgeEl.dataset.tone = tone;
    }
  }

  function toneForState(state, hasError) {
    if (hasError || String(state || '').startsWith('ERROR')) return 'error';
    if (state === 'STANDBY') return 'idle';
    if (state === 'DONE' || state === 'IDLE' || state === 'WAITING_RESI_ENTER') return 'ok';
    if (!state) return 'idle';
    return 'busy';
  }

  function renderStepper(state) {
    const stepper = document.getElementById('flowStepper');
    if (!stepper) return;
    const items = Array.from(stepper.querySelectorAll('li'));
    const isError = String(state || '').startsWith('ERROR');
    const stepIndex = STATE_TO_STEP[state] ?? -1;

    items.forEach((li, i) => {
      li.classList.remove('done', 'active', 'error');
      if (isError && i === stepIndex) {
        li.classList.add('error');
      } else if (stepIndex < 0) {
        // idle: tidak ada penanda
      } else if (i < stepIndex || state === 'DONE') {
        li.classList.add('done');
      } else if (i === stepIndex) {
        li.classList.add('active');
      }
    });
  }

  function renderHint(state) {
    const hintEl = document.getElementById('statusHint');
    if (!hintEl) return;
    const hint = ERROR_HINTS[state];
    if (hint) {
      hintEl.textContent = hint;
      hintEl.hidden = false;
    } else {
      hintEl.textContent = '';
      hintEl.hidden = true;
    }
  }

  function isEditingSettings() {
    const panel = document.getElementById('settingsPanel');
    return Boolean(panel && panel.contains(document.activeElement));
  }

  function renderSettings(settings, force = false) {
    if (!force && isEditingSettings()) return; // jangan timpa ketikan user
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
      sidebarRounds: readNumber('sidebarRounds', DEFAULT_SETTINGS.sidebarRounds),
      refocusDelay: readNumber('refocusDelay', DEFAULT_SETTINGS.refocusDelay),
      debugLog: document.getElementById('debugLog').checked
    };
  }

  function readNumber(id, fallback) {
    const input = document.getElementById(id);
    let value = Number(input.value);
    if (!Number.isFinite(value)) return fallback;

    const min = Number(input.min);
    const max = Number(input.max);
    if (Number.isFinite(min)) value = Math.max(min, value);
    if (Number.isFinite(max)) value = Math.min(max, value);
    if (String(input.value) !== String(value)) input.value = value;
    return value;
  }

  // Hanya tombol berat yang dikunci; Refresh tetap bisa dipakai.
  function setBusy(busy, activeBtnId) {
    for (const id of ['focusResiBtn', 'runFlowBtn', 'retryChatBtn']) {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = busy;
    }
    if (busy && activeBtnId) {
      const btn = document.getElementById(activeBtnId);
      if (btn) {
        btn.dataset.label = btn.textContent;
        btn.textContent = 'Memproses…';
      }
    } else {
      for (const id of ['focusResiBtn', 'runFlowBtn', 'retryChatBtn']) {
        // Label CTA luar-seller milik setOffSellerMode — jangan ditimpa.
        if (offSellerMode && id === 'runFlowBtn') continue;
        const btn = document.getElementById(id);
        if (btn && btn.dataset.label) {
          btn.textContent = btn.dataset.label;
          delete btn.dataset.label;
        }
      }
    }
  }

  async function runAction(action, payload, btnId) {
    setBusy(true, btnId);
    updateStatus('Memproses…', 'busy');
    try {
      renderSnapshot(await sendMessageToTab(action, payload));
    } finally {
      setBusy(false);
    }
  }

  function renderVersion() {
    const el = document.getElementById('appVersion');
    if (!el) return;
    try {
      el.textContent = `v${chrome.runtime.getManifest().version}`;
    } catch (error) {
      el.textContent = '';
    }
  }

  function formatMeta(entry) {
    const parts = [entry.state || ''];
    if (Number.isFinite(entry.durationMs)) parts.push(`${entry.durationMs}ms`);
    if (entry.selector) parts.push(entry.selector);
    return parts.filter(Boolean).join(' • ');
  }

  function renderLogs(logs) {
    const list = document.getElementById('logList');
    if (!list) return;

    if (!Array.isArray(logs) || logs.length === 0) {
      list.textContent = 'Belum ada log.';
      list.classList.add('muted');
      return;
    }
    list.classList.remove('muted');

    list.innerHTML = logs.slice(0, 8).map((entry) => {
      const time = escapeHtml(entry.time || '');
      const message = escapeHtml(entry.message || '');
      const meta = escapeHtml(formatMeta(entry));
      return `<div class="log-item"><strong>${time}</strong> ${message}<br><span class="log-meta">${meta}</span></div>`;
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
    lastSnapshot = snapshot;

    const status = snapshot.status || {};
    const hasError = String(status.state || '').startsWith('ERROR') || Boolean(status.error);
    updateStatus(status.label || 'Aktif', toneForState(status.state, hasError));
    renderStepper(status.state);
    renderHint(status.state);

    const lastResi = document.getElementById('lastResi');
    if (lastResi) {
      lastResi.textContent = `Resi terakhir: ${status.lastResi || '-'}`;
    }

    renderSettings(snapshot.settings);
    renderLogs(snapshot.logs);
  }

  async function refresh() {
    const tab = await getActiveTab();
    renderLivePage(tab && tab.url);
    if (tab && tab.url && !isSellerUrl(tab.url)) {
      // Tab aktif jelas bukan seller → langsung mode luar-seller, tanpa coba message.
      setOffSellerMode(true);
      const local = await storage.get([STORAGE_KEYS.settings, STORAGE_KEYS.status, STORAGE_KEYS.logs]);
      renderSnapshot({
        settings: local[STORAGE_KEYS.settings] || DEFAULT_SETTINGS,
        status: { label: 'Bukan halaman seller Shopee', state: 'ERROR_INACTIVE_TAB', lastResi: '' },
        logs: local[STORAGE_KEYS.logs] || []
      });
      return;
    }

    const response = await sendMessageToTab('getStatus');
    if (response) {
      setOffSellerMode(false);
      renderSnapshot(response);
      return;
    }

    setOffSellerMode(true);
    const local = await storage.get([STORAGE_KEYS.settings, STORAGE_KEYS.status, STORAGE_KEYS.logs]);
    renderSnapshot({
      settings: local[STORAGE_KEYS.settings] || DEFAULT_SETTINGS,
      status: { label: 'Tidak aktif di halaman ini', state: 'ERROR_INACTIVE_TAB', lastResi: '' },
      logs: local[STORAGE_KEYS.logs] || []
    });
  }

  function saveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const settings = readSettingsFromForm();
      await storage.set({ [STORAGE_KEYS.settings]: settings });
      const response = await sendMessageToTab('updateSettings', { settings });
      if (response) {
        renderSnapshot(response);
      }
    }, 300);
  }

  async function resetSettings() {
    await storage.set({ [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS } });
    renderSettings(DEFAULT_SETTINGS, true);
    const response = await sendMessageToTab('updateSettings', { settings: { ...DEFAULT_SETTINGS } });
    if (response) {
      renderSnapshot(response);
    }
  }

  function copyText(text, fallbackMessage) {
    const value = String(text || '');
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch(() => {
        updateStatus(fallbackMessage || 'Gagal menyalin', 'error');
      });
    }
  }

  function renderDiagnosis(diagnosis) {
    const box = document.getElementById('diagBox');
    const result = document.getElementById('diagResult');
    if (!box || !result) return;
    if (!diagnosis) {
      box.hidden = true;
      result.textContent = '';
      return;
    }

    const lines = [];
    lines.push(`URL: ${diagnosis.url || '-'}`);
    for (const [name, rows] of Object.entries(diagnosis.groups || {})) {
      const visible = rows.reduce((sum, r) => sum + (r.visible || 0), 0);
      const total = rows.reduce((sum, r) => sum + (r.total || 0), 0);
      const mark = visible > 0 ? 'OK' : '--';
      lines.push(`${mark} ${name}: ${visible} terlihat / ${total} total`);
      for (const r of rows) {
        if (r.invalid) {
          lines.push(`   !! selector tidak valid: ${r.selector}`);
        } else if (r.total > 0 && r.visible === 0) {
          lines.push(`   .. tersembunyi semua: ${r.selector} (${r.total})`);
        }
      }
    }
    const openPanels = Object.entries(diagnosis.panels || {})
      .filter(([, p]) => p.open)
      .map(([sel]) => sel);
    lines.push(openPanels.length > 0 ? `Panel terbuka: ${openPanels.join(', ')}` : 'Panel terbuka: tidak ada');
    if (diagnosis.overlays > 0) lines.push(`Overlay menutupi: ${diagnosis.overlays}`);
    if (diagnosis.flow) {
      lines.push(`Flow: ${diagnosis.flow.state || '-'} | resi input hidup: ${diagnosis.flow.resiInputAlive ? 'ya' : 'tidak'}`);
    }

    result.textContent = lines.join('\n');
    box.hidden = false;
  }

  async function runDiagnose(btnId) {
    const btn = document.getElementById(btnId);
    const label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Memindai…';
    }
    try {
      const response = await sendMessageToTab('diagnose');
      if (response && response.diagnosis) {
        renderDiagnosis(response.diagnosis);
      } else {
        renderDiagnosis(null);
        updateStatus('Konten extension tidak tersedia di halaman ini', 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
    }
  }

  function bindEvents() {
    document.getElementById('focusResiBtn').addEventListener('click', () => {
      if (offSellerMode) return openSellerPage();
      runAction('focusResi', undefined, 'focusResiBtn');
    });
    document.getElementById('runFlowBtn').addEventListener('click', () => {
      if (offSellerMode) return openSellerPage();
      runAction('runFlow', undefined, 'runFlowBtn');
    });
    document.getElementById('retryChatBtn').addEventListener('click', () => {
      if (offSellerMode) return openSellerPage();
      runAction('retryOpenChat', undefined, 'retryChatBtn');
    });
    document.getElementById('refreshBtn').addEventListener('click', refresh);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
    document.getElementById('diagnoseBtn').addEventListener('click', () => runDiagnose('diagnoseBtn'));
    document.getElementById('copyDiagBtn').addEventListener('click', () => {
      copyText(document.getElementById('diagResult').textContent, 'Belum ada hasil diagnosa');
    });

    document.getElementById('copyResiBtn').addEventListener('click', () => {
      copyText(lastSnapshot && lastSnapshot.status && lastSnapshot.status.lastResi, 'Resi kosong');
    });

    document.getElementById('copyLogBtn').addEventListener('click', () => {
      const logs = (lastSnapshot && lastSnapshot.logs) || [];
      const text = logs.map((e) => {
        let line = `${e.time || ''} [${e.state || ''}] ${e.message || ''}`;
        if (e.durationMs != null) line += ` (${e.durationMs}ms)`;
        if (e.selector) line += ` <${e.selector}>`;
        if (e.tried) line += ` tried=[${e.tried}]`;
        if (e.chatButtonAlive != null) line += ` btnAlive=${e.chatButtonAlive}`;
        if (e.hiddenSelector) line += ` hidden=<${e.hiddenSelector}>`;
        if (e.method) line += ` via=${e.method}`;
        if (e.round != null) line += ` ronde=${e.round}`;
        if (e.dom) line += ` dom={${e.dom}}`;
        return line;
      }).join('\n');
      copyText(text, 'Belum ada log');
    });

    document.getElementById('clearLogBtn').addEventListener('click', async () => {
      await storage.set({ [STORAGE_KEYS.logs]: [] });
      renderLogs([]);
      if (lastSnapshot) lastSnapshot.logs = [];
    });

    for (const id of settingIds) {
      const input = document.getElementById(id);
      input.addEventListener('change', saveSettings);
      input.addEventListener('input', saveSettings);
    }

    // Live update saat content script menulis status/log baru selagi popup terbuka.
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !lastSnapshot) return;
        if (changes[STORAGE_KEYS.logs]) {
          lastSnapshot.logs = changes[STORAGE_KEYS.logs].newValue || [];
          renderLogs(lastSnapshot.logs);
        }
        if (changes[STORAGE_KEYS.status]) {
          lastSnapshot.status = changes[STORAGE_KEYS.status].newValue || lastSnapshot.status;
          const status = lastSnapshot.status || {};
          const hasError = String(status.state || '').startsWith('ERROR') || Boolean(status.error);
          updateStatus(status.label || 'Aktif', toneForState(status.state, hasError));
          renderStepper(status.state);
          renderHint(status.state);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    renderVersion();

    const local = await storage.get(STORAGE_KEYS.settings);
    renderSettings(local[STORAGE_KEYS.settings] || DEFAULT_SETTINGS, true);
    await refresh();

    // Baris "Halaman: ..." ikut live selagi popup terbuka (baca URL tab saja,
    // tanpa message ke content script) agar desinkron sesaat setelah navigasi
    // terlihat pulih sendiri.
    setInterval(async () => {
      try {
        const tab = await getActiveTab();
        renderLivePage(tab && tab.url);
      } catch (error) {
        // abaikan, coba lagi interval berikutnya
      }
    }, 1000);
  });
})();
