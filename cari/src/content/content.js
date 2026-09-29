'use strict';

// Entry point content script: init, message handling, shortcut, SPA.
// Logika bisnis ada di flow.js; file ini hanya orkestrasi.
(() => {
  const C = window.RCH_CONSTANTS;
  const storage = window.RCH_STORAGE;
  const DOM = window.RCH_DOM;
  const FLOW = window.RCH_FLOW;

  let initialized = false;
  let spaHooked = false;
  let lastSeenUrl = location.href;

  function handleMessage(message, sender, sendResponse) {
    if (!message || !message.action) return false;

    (async () => {
      if (message.action === 'getStatus') {
        sendResponse(await FLOW.getSnapshot());
        return;
      }

      if (message.action === 'focusResi') {
        await FLOW.focusResiInput(message.source || 'popup');
        sendResponse(await FLOW.getSnapshot());
        return;
      }

      if (message.action === 'runFlow' || message.action === 'retryOpenChat') {
        // Shortcut keyboard global bisa kepencet saat operator mengetik di chat.
        // Abaikan agar tidak mencuri alur kerja; aksi popup eksplisit tetap jalan.
        if ((message.source === 'command' || message.source === 'shortcut') && FLOW.isUserTypingInChat()) {
          await FLOW.addLog('Shortcut diabaikan: operator sedang mengetik di chat', { source: message.source });
          sendResponse(await FLOW.getSnapshot());
          return;
        }
        await FLOW.runResiChatFlow({ source: message.action });
        sendResponse(await FLOW.getSnapshot());
        return;
      }

      if (message.action === 'diagnose') {
        sendResponse({ ok: true, diagnosis: FLOW.diagnose() });
        return;
      }

      if (message.action === 'updateSettings') {
        FLOW.applySettingsUpdate(message.settings);
        await storage.set({ [C.STORAGE_KEYS.settings]: FLOW.getSettings() });
        await FLOW.addLog('Setting diperbarui dari popup');
        sendResponse(await FLOW.getSnapshot());
        return;
      }

      sendResponse(await FLOW.getSnapshot());
    })();

    return true;
  }

  async function init() {
    if (!DOM.isShopeeSellerPage()) return;
    if (initialized) return;
    initialized = true;

    await FLOW.loadSettings();

    // Pending intent dari popup luar-seller ("Buka Halaman Seller"):
    // langsung fokus siap scan. Kedaluwarsa bila lebih tua dari batas.
    let pendingAction = '';
    try {
      const stored = await storage.get(C.STORAGE_KEYS.pending);
      const pending = stored[C.STORAGE_KEYS.pending];
      if (pending && pending.setAt && Date.now() - pending.setAt <= (C.PENDING_MAX_AGE_MS || 60000)) {
        pendingAction = pending.action || '';
      }
      await storage.set({ [C.STORAGE_KEYS.pending]: null });
    } catch (error) {
      pendingAction = '';
    }

    if (DOM.isScanPageUrl(location.href)) {
      const input = FLOW.getResiInput();
      // Pending 'runFlow': jalankan hanya bila input sudah terisi,
      // kalau kosong artinya belum ada yang di-scan → cukup siap scan.
      if (pendingAction === 'runFlow' && input && input.value.trim()) {
        await FLOW.addLog('Menjalankan flow dari intent tertunda');
        await FLOW.enterScanPage('direct-open');
        await FLOW.runResiChatFlow({ source: 'pending' });
      } else {
        await FLOW.syncPageMode(pendingAction ? 'direct-open' : 'init');
        if (pendingAction) {
          await FLOW.addLog('Siap scan: halaman seller dibuka dari luar');
        }
      }
    } else {
      await FLOW.syncPageMode('init');
      if (pendingAction) {
        await FLOW.addLog('Dibuka di luar halaman scan — standby');
      }
    }

    // Delegasi Enter level-document (capture): satu-satunya pemicu Enter.
    // Kebal terhadap node input yang diganti Shopee tanpa ganti URL.
    document.addEventListener('keydown', (event) => FLOW.handleDelegatedEnter(event), true);

    // Fallback shortcut lokal; shortcut utama via chrome.commands + service worker.
    // Alt+R = fokus resi, Alt+J = jalankan flow (keduanya diam saat mengetik di chat).
    document.addEventListener('keydown', (event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === 'r') {
          if (FLOW.isUserTypingInChat()) return;
          event.preventDefault();
          FLOW.focusResiInput('shortcut');
        } else if (key === 'j') {
          if (FLOW.isUserTypingInChat()) return;
          event.preventDefault();
          FLOW.runResiChatFlow({ source: 'shortcut' });
        }
      }
    });

    // Shopee adalah SPA: URL bisa ganti tanpa reload → sinkronkan mode scan/standby.
    // pageshow menutup lubang bfcache/tombol Back: restore tidak menjalankan
    // ulang init dan belum tentu memicu event history yang terbungkus hook.
    if (!spaHooked) {
      spaHooked = true;
      DOM.hookSpaNavigation(async () => {
        const prev = lastSeenUrl;
        const curr = location.href;
        lastSeenUrl = curr;
        if (prev === curr) return;
        if (!DOM.isShopeeSellerPage()) return;
        await FLOW.onSpaNavigate(prev, curr);
      });
      window.addEventListener('pageshow', async (event) => {
        const prev = lastSeenUrl;
        const curr = location.href;
        lastSeenUrl = curr;
        if (!DOM.isShopeeSellerPage()) return;
        if (prev === curr && !event.persisted) return; // load awal, sudah ditangani init
        await FLOW.onSpaNavigate(prev, curr);
      });
    }

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[C.STORAGE_KEYS.settings]) return;
      FLOW.applySettingsUpdate(changes[C.STORAGE_KEYS.settings].newValue);
    });
  }

  window.ResiChatHelper = { init, runResiChatFlow: FLOW.runResiChatFlow, focusResiInput: FLOW.focusResiInput };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 500);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  }
})();
