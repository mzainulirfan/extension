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
    await FLOW.setState(C.STATES.idle);

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

    const input = FLOW.getResiInput();
    if (input) {
      // Pending 'runFlow' (mis. dari shortcut): jalankan hanya bila input sudah terisi,
      // kalau kosong artinya belum ada yang di-scan → cukup fokus siap scan.
      if (pendingAction === 'runFlow' && input.value.trim()) {
        await FLOW.addLog('Menjalankan flow dari intent tertunda');
        await FLOW.runResiChatFlow({ source: 'pending' });
      } else {
        await FLOW.focusResiInput(pendingAction ? 'direct-open' : 'init');
        if (pendingAction) {
          await FLOW.addLog('Siap scan: halaman seller dibuka dari luar');
        }
      }
    } else {
      await FLOW.setState(C.STATES.errorInput);
      FLOW.scheduleInputDetection();
    }

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

    // Shopee adalah SPA: URL bisa ganti tanpa reload → deteksi ulang input resi.
    if (!spaHooked) {
      spaHooked = true;
      DOM.hookSpaNavigation(async () => {
        if (!DOM.isShopeeSellerPage()) return;
        await FLOW.onSpaNavigate();
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
