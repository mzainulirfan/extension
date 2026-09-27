'use strict';

// Logger lokal (chrome.storage.local, tanpa kirim ke server).
// Dibuat via factory agar state (currentState/lastResi/settings) di-supply flow.js.
window.RCH_LOGGER = (() => {
  function createLogger({ storage, constants, getContext }) {
    async function getLogs() {
      const result = await storage.get(constants.STORAGE_KEYS.logs);
      const logs = result[constants.STORAGE_KEYS.logs];
      return Array.isArray(logs) ? logs : [];
    }

    async function addLog(message, extra = {}) {
      const ctx = getContext();
      const entry = {
        time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        state: ctx.currentState,
        message,
        resi: ctx.lastResi || '',
        ...extra
      };

      if (ctx.settings.debugLog) {
        console.log('[ResiChatHelper]', entry);
      }

      const logs = await getLogs();
      logs.unshift(entry);
      await storage.set({ [constants.STORAGE_KEYS.logs]: logs.slice(0, constants.MAX_LOGS) });
    }

    return { getLogs, addLog };
  }

  return { createLogger };
})();
