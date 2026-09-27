'use strict';

// State manager + action runner. Satu-satunya modul yang menyimpan mutable state.
// content.js hanya memanggil API publik di bawah, tidak menyentuh variabel langsung.
window.RCH_FLOW = (() => {
  const C = window.RCH_CONSTANTS;
  const SELECTORS = window.RCH_SELECTORS;
  const storage = window.RCH_STORAGE;
  const DOM = window.RCH_DOM;

  let settings = { ...C.DEFAULT_SETTINGS };
  let resiInput = null;
  let isProcessing = false;
  let lastResi = '';
  let currentState = C.STATES.idle;
  let initTimer = null;
  let inputObserver = null;

  const logger = window.RCH_LOGGER.createLogger({
    storage,
    constants: C,
    getContext: () => ({ currentState, lastResi, settings })
  });

  async function loadSettings() {
    const result = await storage.get(C.STORAGE_KEYS.settings);
    settings = { ...C.DEFAULT_SETTINGS, ...(result[C.STORAGE_KEYS.settings] || {}) };
    await storage.set({ [C.STORAGE_KEYS.settings]: settings });
  }

  function applySettingsUpdate(next) {
    settings = { ...C.DEFAULT_SETTINGS, ...(next || {}) };
  }

  async function setState(state, message, extra = {}) {
    currentState = state;
    const status = {
      active: DOM.isShopeeSellerPage(),
      state,
      label: message || C.STATUS_LABELS[state] || state,
      lastResi,
      updatedAt: Date.now(),
      error: state.startsWith('ERROR') ? message || C.STATUS_LABELS[state] : ''
    };

    await storage.set({ [C.STORAGE_KEYS.status]: status });
    await logger.addLog(status.label, extra);
  }

  function findResiInput() {
    const exact = DOM.findFirstElement([SELECTORS.resiInput[0]]);
    if (exact.element) return exact;

    return DOM.findFirstElement([SELECTORS.resiInput[1]], {
      predicate: (element) => {
        const type = (element.getAttribute('type') || 'text').toLowerCase();
        const placeholder = element.getAttribute('placeholder') || '';
        return type === 'text' && !/cari nama/i.test(placeholder);
      }
    });
  }

  function getResiInput() {
    if (resiInput && document.contains(resiInput) && DOM.isVisible(resiInput)) {
      return resiInput;
    }

    const found = findResiInput();
    resiInput = found.element;
    if (resiInput) {
      wireResiInput(resiInput);
    }
    return resiInput;
  }

  function resetResiInput() {
    resiInput = null;
  }

  function isUserTypingInChat() {
    return DOM.isUserTyping(document.activeElement, resiInput);
  }

  function wireResiInput(input) {
    if (!input || input.__resiChatHelperWired) return;
    input.__resiChatHelperWired = true;

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const value = input.value.trim();
      if (!value || isProcessing) return;

      setTimeout(() => {
        runResiChatFlow({ source: 'enter' });
      }, settings.delayAfterScan);
    });
  }

  async function focusResiInput(reason = 'manual') {
    await setState(C.STATES.focusInput, `Fokus input resi (${reason})`);

    const input = getResiInput();
    if (!input) {
      await setState(C.STATES.errorInput);
      scheduleInputDetection();
      return false;
    }

    try {
      input.focus({ preventScroll: true });
      input.select();
      stopInputDetection();
      await setState(C.STATES.waitingEnter);
      return true;
    } catch (error) {
      await setState(C.STATES.errorInput, `Error: gagal fokus input resi (${error.message})`);
      return false;
    }
  }

  function stopInputDetection() {
    if (initTimer) {
      window.clearInterval(initTimer);
      initTimer = null;
    }
    if (inputObserver) {
      inputObserver.disconnect();
      inputObserver = null;
    }
  }

  function scheduleInputDetection() {
    if (getResiInput()) {
      stopInputDetection();
      focusResiInput('auto');
      return;
    }

    if (!inputObserver && window.MutationObserver) {
      inputObserver = new MutationObserver(() => {
        const input = getResiInput();
        if (!input) return;
        stopInputDetection();
        focusResiInput('auto');
      });
      inputObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (!initTimer) {
      initTimer = window.setInterval(async () => {
        const input = getResiInput();
        if (!input) return;
        stopInputDetection();
        await focusResiInput('auto');
      }, 2000);
    }
  }

  // Diagnosis halaman penuh (dipakai tombol Diagnosa popup + snapshot saat gagal).
  // Tidak mengubah DOM maupun state — murni baca.
  function diagnose() {
    const snapshot = DOM.diagnosePage({
      resiInput: SELECTORS.resiInput,
      chatButton: SELECTORS.chatButton,
      chatSidebarSearch: SELECTORS.chatSidebarSearch,
      chatList: SELECTORS.chatList,
      chatItem: SELECTORS.chatItem
    });
    snapshot.flow = {
      state: currentState,
      lastResi,
      isProcessing,
      resiInputAlive: Boolean(resiInput && document.contains(resiInput))
    };
    return snapshot;
  }

  // Ringkasan satu baris per grup untuk log: "chatButton: 0/2, chatList: 1/1".
  function summarizeDiagnosis(snapshot) {
    const parts = [];
    for (const [name, rows] of Object.entries(snapshot.groups || {})) {
      const visible = rows.reduce((sum, r) => sum + (r.visible || 0), 0);
      const total = rows.reduce((sum, r) => sum + (r.total || 0), 0);
      parts.push(`${name}: ${visible}/${total}`);
    }
    const openPanels = Object.entries(snapshot.panels || {})
      .filter(([, p]) => p.open)
      .map(([sel]) => sel);
    if (openPanels.length > 0) parts.push(`panel terbuka: ${openPanels.join(', ')}`);
    if (snapshot.overlays > 0) parts.push(`overlay: ${snapshot.overlays}`);
    return parts.join(' | ');
  }

  function findChatItem() {
    return DOM.findFirstElement(SELECTORS.chatItem, {
      predicate: (element, selector) => {
        if (/infinite-list|innerScrollContainer|ReactVirtualized__Grid$/i.test(selector)) {
          const directText = (element.textContent || '').trim();
          if (directText.length < 2) return false;
        }
        const text = (element.textContent || '').trim();
        if (text.length >= 2) return true;
        return Boolean(element.querySelector('img, [role="img"], [data-testid*="avatar" i]'));
      }
    });
  }

  // Klik dengan verifikasi: coba tiap metode sampai DOM bereaksi.
  // Mengembalikan nama metode yang berhasil, atau null bila klik diabaikan.
  async function clickWithVerification(element, verifyMs = 600) {
    const methods = [
      ['native', DOM.clickNative],
      ['synthetic', DOM.safeClick],
      ['keyboard', DOM.clickKeyboard]
    ];
    for (const [name, clickFn] of methods) {
      let dispatched = false;
      try {
        dispatched = clickFn(element);
      } catch (error) {
        await logger.addLog(`Metode klik ${name} error: ${error.message}`);
        continue;
      }
      if (!dispatched) continue;
      const reacted = await DOM.waitForDomMutation(verifyMs);
      if (reacted) return name;
      await logger.addLog(`Klik ${name} tidak mengubah DOM, coba metode berikutnya`);
    }
    return null;
  }

  // Cari tombol chat di dalam baris yang memuat nomor resi yang di-scan.
  // Mencegah salah buka chat buyer lain saat list menampilkan >1 pesanan.
  // Mengembalikan tombol + rowMatched:true, atau kosong bila tidak ada yang cocok.
  function findChatButtonForResi(resi) {
    const needle = String(resi || '').trim();
    const empty = { element: null, selector: '', rowMatched: false };
    if (!needle) return empty;

    const buttons = [];
    for (const selector of SELECTORS.chatButton) {
      let elements = [];
      try {
        elements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        continue;
      }
      for (const el of elements) {
        if (DOM.isVisible(el) && !DOM.isDisabled(el)) {
          buttons.push({ element: el, selector });
        }
      }
      if (buttons.length > 0) break; // prioritaskan selector utama
    }
    if (buttons.length === 0) return empty;

    // Kumpulkan semua kandidat (tombol + kedalaman ancestor yang memuat resi),
    // pilih yang paling dalam agar container bersama (list) kalah dari baris.
    let best = null;
    for (const btn of buttons) {
      let ancestor = btn.element.parentElement;
      for (let depth = 0; depth < 7 && ancestor && ancestor !== document.body; depth++) {
        try {
          if ((ancestor.textContent || '').includes(needle)) {
            if (!best || depth < best.depth) {
              best = { element: btn.element, selector: btn.selector, depth };
            }
            break; // ancestor terdekat tombol ini sudah cukup
          }
        } catch (error) {
          break;
        }
        ancestor = ancestor.parentElement;
      }
    }
    if (best) {
      return { element: best.element, selector: best.selector, rowMatched: true };
    }
    return empty;
  }

  // Buka sidebar dalam beberapa ronde: tiap ronde cari ulang tombol
  // (antisipasi re-render list), klik terverifikasi, lalu tunggu sidebar.
  // Mengembalikan { element, selector, method, round, buttonEverFound }.
  async function openSidebarWithRounds(flowStart, resi) {
    const sidebarSelectors = [...SELECTORS.chatSidebarSearch, ...SELECTORS.chatList];
    const rounds = Math.min(5, Math.max(1, Number(settings.sidebarRounds) || 3));
    const perRound = Math.max(1500, Math.floor((Number(settings.sidebarTimeout) || 5000) / rounds));
    // chatButtonTimeout kembali bermakna: batas cari tombol per ronde.
    const findMs = Math.min(Number(settings.chatButtonTimeout) || 5000, perRound);
    let buttonEverFound = false;

    for (let round = 1; round <= rounds; round++) {
      // Sidebar mungkin sudah terbuka dari ronde/aksi sebelumnya.
      const already = DOM.findFirstElement(sidebarSelectors);
      if (already.element) {
        return { ...already, method: 'already-open', round, buttonEverFound };
      }

      await setState(C.STATES.findChatButton, `Mencari tombol chat (${round}/${rounds})`);
      // Prioritaskan tombol dalam baris resi yang sama; fallback ke tombol pertama.
      let chatButton = findChatButtonForResi(resi);
      const viaRow = Boolean(chatButton.element);
      if (!viaRow) {
        chatButton = await DOM.waitForAnyElement(SELECTORS.chatButton, findMs);
      }
      if (!chatButton.element) {
        await logger.addLog(`Ronde ${round}: tombol chat tidak ditemukan`, { tried: SELECTORS.chatButton.join(', ') });
        continue;
      }
      buttonEverFound = true;

      await setState(C.STATES.clickChatButton, `Membuka chat buyer (${round}/${rounds})`);
      const method = await clickWithVerification(chatButton.element);
      if (!method) {
        await logger.addLog(`Ronde ${round}: klik diabaikan halaman (tidak ada perubahan DOM)`, {
          selector: chatButton.selector
        });
        continue;
      }
      await logger.addLog(`Tombol chat diklik (${method})`, {
        selector: chatButton.selector,
        round,
        rowMatched: Boolean(viaRow)
      });

      await setState(C.STATES.waitSidebar, `Menunggu sidebar chat (${round}/${rounds})`);
      const sidebar = await DOM.waitForAnyElement(sidebarSelectors, perRound);
      if (sidebar.element) {
        return { ...sidebar, method, round };
      }
      await logger.addLog(`Ronde ${round}: sidebar belum muncul setelah klik ${method}`);
    }

    return { element: null, selector: '', method: '', round: rounds, buttonEverFound };
  }

  async function openChatItemIfNeeded() {
    await setState(C.STATES.openChatItem);

    const found = findChatItem();
    if (!found.element) {
      await setState(C.STATES.errorChatItem);
      return false;
    }

    if (!DOM.isActiveChatItem(found.element)) {
      DOM.safeClick(found.element);
      await logger.addLog('Item chat buyer diklik', { selector: found.selector });
    } else {
      await logger.addLog('Item chat buyer sudah aktif', { selector: found.selector });
    }

    return true;
  }

  async function refocusAfterFlow() {
    await DOM.sleep(settings.refocusDelay);
    if (isUserTypingInChat()) {
      await setState(C.STATES.done, 'Selesai (fokus tetap di chat karena operator sedang mengetik)');
      return;
    }
    await setState(C.STATES.refocusInput);
    const focused = await focusResiInput('after flow');
    if (focused) {
      await setState(C.STATES.done);
    }
  }

  async function refocusAfterError() {
    await DOM.sleep(settings.refocusDelay);
    if (isUserTypingInChat()) {
      await logger.addLog('Refocus dibatalkan: operator sedang mengetik di chat');
      return;
    }
    const input = getResiInput();
    if (input) {
      try {
        input.focus({ preventScroll: true });
        input.select();
        await logger.addLog('Fokus dikembalikan ke input resi setelah error');
      } catch (error) {
        await logger.addLog(`Gagal refocus setelah error: ${error.message}`);
      }
    }
  }

  async function runResiChatFlow(options = {}) {
    if (isProcessing) {
      await logger.addLog('Flow masih berjalan, request diabaikan', { source: options.source || 'manual' });
      return { ok: false, reason: 'processing' };
    }

    const input = getResiInput();
    if (!input) {
      await setState(C.STATES.errorInput);
      scheduleInputDetection();
      return { ok: false, reason: 'input-not-found' };
    }

    const value = input.value.trim();
    if (!value) {
      await setState(C.STATES.errorEmptyResi);
      return { ok: false, reason: 'empty-resi' };
    }

    lastResi = value.slice(0, C.MAX_RESI_LENGTH);
    isProcessing = true;
    const flowStart = Date.now();

    try {
      await setState(C.STATES.waitingOrder, 'Menunggu hasil pesanan', { source: options.source || 'manual' });
      await DOM.sleep(settings.delayAfterScan);

      const sidebar = await openSidebarWithRounds(flowStart, lastResi);
      if (!sidebar.element) {
        const diag = diagnose();
        const chatButtonAlive = DOM.findFirstElement(SELECTORS.chatButton).element !== null;
        // Tombol tidak pernah ditemukan di semua ronde → selector/usulan baris salah.
        if (!sidebar.buttonEverFound) {
          await setState(C.STATES.errorChatButton, undefined, {
            tried: SELECTORS.chatButton.join(', '),
            durationMs: Date.now() - flowStart,
            dom: summarizeDiagnosis(diag)
          });
          await refocusAfterError();
          return { ok: false, reason: 'chat-button-not-found' };
        }
        // Fase B: bedakan "panel ada tapi tersembunyi" (klik tak mempan)
        // dari "struktur tak dikenal" (selector kedaluwarsa).
        const hidden = DOM.findHiddenElement([...SELECTORS.chatSidebarSearch, ...SELECTORS.chatList]);
        if (hidden.element) {
          await setState(C.STATES.errorSidebarHidden, undefined, {
            hiddenSelector: hidden.selector,
            durationMs: Date.now() - flowStart,
            chatButtonAlive,
            dom: summarizeDiagnosis(diag)
          });
          await refocusAfterError();
          return { ok: false, reason: 'sidebar-hidden' };
        }
        await setState(C.STATES.errorSidebar, undefined, {
          tried: [...SELECTORS.chatSidebarSearch, ...SELECTORS.chatList].join(', '),
          durationMs: Date.now() - flowStart,
          chatButtonAlive,
          dom: summarizeDiagnosis(diag)
        });
        await refocusAfterError();
        return { ok: false, reason: 'sidebar-not-found' };
      }
      await logger.addLog('Sidebar chat terbuka', {
        selector: sidebar.selector,
        method: sidebar.method,
        round: sidebar.round,
        durationMs: Date.now() - flowStart
      });

      const chatItemOpened = await openChatItemIfNeeded();
      if (!chatItemOpened) {
        await refocusAfterError();
        return { ok: false, reason: 'chat-item-not-found' };
      }

      await refocusAfterFlow();
      await logger.addLog('Flow selesai', { durationMs: Date.now() - flowStart });
      return { ok: true };
    } catch (error) {
      await setState(C.STATES.errorSidebar, `Error: ${error.message}`);
      await refocusAfterError();
      return { ok: false, reason: error.message };
    } finally {
      isProcessing = false;
    }
  }

  async function getSnapshot() {
    const result = await storage.get([C.STORAGE_KEYS.status, C.STORAGE_KEYS.logs, C.STORAGE_KEYS.settings]);
    return {
      status: result[C.STORAGE_KEYS.status] || {
        active: DOM.isShopeeSellerPage(),
        state: currentState,
        label: C.STATUS_LABELS[currentState] || 'Aktif',
        lastResi,
        updatedAt: Date.now(),
        error: ''
      },
      logs: result[C.STORAGE_KEYS.logs] || [],
      settings: { ...C.DEFAULT_SETTINGS, ...(result[C.STORAGE_KEYS.settings] || settings) }
    };
  }

  async function onSpaNavigate() {
    if (isProcessing) return;
    resetResiInput();
    const nextInput = getResiInput();
    if (nextInput) {
      await focusResiInput('spa-navigate');
    } else {
      await setState(C.STATES.errorInput, 'Halaman berubah, input resi tidak ditemukan');
      scheduleInputDetection();
    }
  }

  function getSettings() {
    return { ...settings };
  }

  function isBusy() {
    return isProcessing;
  }

  return {
    loadSettings,
    applySettingsUpdate,
    setState,
    addLog: (...args) => logger.addLog(...args),
    getResiInput,
    resetResiInput,
    focusResiInput,
    scheduleInputDetection,
    stopInputDetection,
    runResiChatFlow,
    getSnapshot,
    onSpaNavigate,
    getSettings,
    isBusy,
    isUserTypingInChat,
    findChatButtonForResi,
    diagnose
  };
})();
