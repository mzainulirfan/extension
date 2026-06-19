const ResiChatHelper = (() => {
  const STORAGE_KEYS = {
    settings: 'rch_settings',
    status: 'rch_status',
    logs: 'rch_logs'
  };

  const DEFAULT_SETTINGS = {
    delayAfterScan: 500,
    chatButtonTimeout: 5000,
    sidebarTimeout: 5000,
    refocusDelay: 500,
    debugLog: false
  };

  const SELECTORS = {
    resiInput: [
      'input[placeholder="Masukkan no. resi jasa kirim"]',
      'input.eds-input__input'
    ],
    chatButton: [
      '[data-testid="buyer-chat-action"]',
      '.buyer-chat-action'
    ],
    chatSidebarSearch: [
      'input[placeholder="Cari nama"].shopee-react-input__input',
      'input[placeholder="Cari nama"]'
    ],
    chatList: [
      '#infinite-list',
      '.ReactVirtualized__Grid'
    ],
    chatItem: [
      '[data-testid="buyer-chat-item"]',
      '.buyer-chat-item',
      '.chat-item',
      '[role="listitem"]',
      '#infinite-list > div',
      '.ReactVirtualized__Grid__innerScrollContainer > div',
      '.AxOomp7jNy.eaXBbcCrTd',
      '.AxOomp7jNy',
      '.eaXBbcCrTd'
    ]
  };

  const STATES = {
    idle: 'IDLE',
    focusInput: 'FOCUS_RESI_INPUT',
    waitingEnter: 'WAITING_RESI_ENTER',
    waitingOrder: 'WAITING_ORDER_RESULT',
    findChatButton: 'FIND_CHAT_BUTTON',
    clickChatButton: 'CLICK_CHAT_BUTTON',
    waitSidebar: 'WAIT_CHAT_SIDEBAR',
    openChatItem: 'OPEN_CHAT_ITEM',
    refocusInput: 'REFOCUS_RESI_INPUT',
    done: 'DONE',
    errorInput: 'ERROR_INPUT_NOT_FOUND',
    errorEmptyResi: 'ERROR_EMPTY_RESI',
    errorChatButton: 'ERROR_CHAT_BUTTON_NOT_FOUND',
    errorSidebar: 'ERROR_SIDEBAR_NOT_FOUND',
    errorChatItem: 'ERROR_CHAT_ITEM_NOT_FOUND'
  };

  const STATUS_LABELS = {
    IDLE: 'Aktif',
    FOCUS_RESI_INPUT: 'Fokus input resi',
    WAITING_RESI_ENTER: 'Menunggu input resi',
    WAITING_ORDER_RESULT: 'Menunggu hasil pesanan',
    FIND_CHAT_BUTTON: 'Mencari tombol chat',
    CLICK_CHAT_BUTTON: 'Membuka chat buyer',
    WAIT_CHAT_SIDEBAR: 'Menunggu sidebar chat',
    OPEN_CHAT_ITEM: 'Memfokuskan chat buyer',
    REFOCUS_RESI_INPUT: 'Kembali ke input resi',
    DONE: 'Selesai',
    ERROR_INPUT_NOT_FOUND: 'Error: input resi tidak ditemukan',
    ERROR_EMPTY_RESI: 'Nomor resi kosong',
    ERROR_CHAT_BUTTON_NOT_FOUND: 'Error: tombol chat tidak ditemukan',
    ERROR_SIDEBAR_NOT_FOUND: 'Error: sidebar chat tidak terbuka',
    ERROR_CHAT_ITEM_NOT_FOUND: 'Error: item chat tidak ditemukan'
  };

  const POLL_INTERVAL = 100;
  const MAX_LOGS = 30;

  let settings = { ...DEFAULT_SETTINGS };
  let resiInput = null;
  let isProcessing = false;
  let lastResi = '';
  let currentState = STATES.idle;
  let initTimer = null;

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function storageSet(value) {
    return new Promise((resolve) => chrome.storage.local.set(value, resolve));
  }

  async function loadSettings() {
    const result = await storageGet(STORAGE_KEYS.settings);
    settings = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] || {}) };
    await storageSet({ [STORAGE_KEYS.settings]: settings });
  }

  async function getLogs() {
    const result = await storageGet(STORAGE_KEYS.logs);
    return Array.isArray(result[STORAGE_KEYS.logs]) ? result[STORAGE_KEYS.logs] : [];
  }

  async function addLog(message, extra = {}) {
    const entry = {
      time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      state: currentState,
      message,
      resi: lastResi || '',
      ...extra
    };

    if (settings.debugLog) {
      console.log('[ResiChatHelper]', entry);
    }

    const logs = await getLogs();
    logs.unshift(entry);
    await storageSet({ [STORAGE_KEYS.logs]: logs.slice(0, MAX_LOGS) });
  }

  async function setState(state, message, extra = {}) {
    currentState = state;
    const status = {
      active: isShopeeSellerPage(),
      state,
      label: message || STATUS_LABELS[state] || state,
      lastResi,
      updatedAt: Date.now(),
      error: state.startsWith('ERROR') ? message || STATUS_LABELS[state] : ''
    };

    await storageSet({ [STORAGE_KEYS.status]: status });
    await addLog(status.label, extra);
  }

  function isShopeeSellerPage() {
    return /(^|\.)shopee\./i.test(location.hostname);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  }

  function isDisabled(element) {
    return Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true');
  }

  function findFirstElement(selectors, options = {}) {
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      const element = elements.find((candidate) => {
        if (!isVisible(candidate) || isDisabled(candidate)) return false;
        return options.predicate ? options.predicate(candidate, selector) : true;
      });

      if (element) {
        return { element, selector };
      }
    }

    return { element: null, selector: '' };
  }

  function findResiInput() {
    const exact = findFirstElement([SELECTORS.resiInput[0]]);
    if (exact.element) return exact;

    return findFirstElement([SELECTORS.resiInput[1]], {
      predicate: (element) => {
        const type = (element.getAttribute('type') || 'text').toLowerCase();
        const placeholder = element.getAttribute('placeholder') || '';
        return type === 'text' && !/cari nama/i.test(placeholder);
      }
    });
  }

  function getResiInput() {
    if (resiInput && document.contains(resiInput) && isVisible(resiInput)) {
      return resiInput;
    }

    const found = findResiInput();
    resiInput = found.element;
    if (resiInput) {
      wireResiInput(resiInput);
    }
    return resiInput;
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
    await setState(STATES.focusInput, `Fokus input resi (${reason})`);

    const input = getResiInput();
    if (!input) {
      await setState(STATES.errorInput);
      scheduleInputDetection();
      return false;
    }

    try {
      input.focus({ preventScroll: true });
      input.select();
      await setState(STATES.waitingEnter);
      return true;
    } catch (error) {
      await setState(STATES.errorInput, `Error: gagal fokus input resi (${error.message})`);
      return false;
    }
  }

  function scheduleInputDetection() {
    if (initTimer) return;

    initTimer = window.setInterval(async () => {
      const input = getResiInput();
      if (!input) return;
      window.clearInterval(initTimer);
      initTimer = null;
      await focusResiInput('auto');
    }, 1500);
  }

  async function waitForAnyElement(selectors, timeoutMs, options = {}) {
    const start = Date.now();

    while (Date.now() - start <= timeoutMs) {
      const found = findFirstElement(selectors, options);
      if (found.element) {
        return found;
      }
      await sleep(POLL_INTERVAL);
    }

    return { element: null, selector: '' };
  }

  function safeClick(element) {
    if (!element || !isVisible(element) || isDisabled(element)) return false;

    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    element.click();
    return true;
  }

  function isActiveChatItem(element) {
    if (!element) return false;
    const selected = element.getAttribute('aria-selected') === 'true';
    const activeClass = /active|selected|current/i.test(element.className || '');
    return selected || activeClass;
  }

  function findChatItem() {
    return findFirstElement(SELECTORS.chatItem, {
      predicate: (element) => {
        const text = (element.textContent || '').trim();
        return text.length > 0 || element.querySelector('img, [role="img"]');
      }
    });
  }

  async function waitForSidebarWithRetry(chatButton) {
    const sidebarSelectors = [...SELECTORS.chatSidebarSearch, ...SELECTORS.chatList];
    let found = await waitForAnyElement(sidebarSelectors, settings.sidebarTimeout);
    if (found.element) return found;

    await addLog('Sidebar belum terbuka, retry klik tombol chat satu kali');
    safeClick(chatButton);
    found = await waitForAnyElement(sidebarSelectors, settings.sidebarTimeout);
    return found;
  }

  async function openChatItemIfNeeded() {
    await setState(STATES.openChatItem);

    const found = findChatItem();
    if (!found.element) {
      await setState(STATES.errorChatItem);
      return false;
    }

    if (!isActiveChatItem(found.element)) {
      safeClick(found.element);
      await addLog('Item chat buyer diklik', { selector: found.selector });
    } else {
      await addLog('Item chat buyer sudah aktif', { selector: found.selector });
    }

    return true;
  }

  async function refocusAfterFlow() {
    await sleep(settings.refocusDelay);
    await setState(STATES.refocusInput);
    const focused = await focusResiInput('after flow');
    if (focused) {
      await setState(STATES.done);
    }
  }

  async function refocusAfterError() {
    await sleep(settings.refocusDelay);
    const input = getResiInput();
    if (input) {
      try {
        input.focus({ preventScroll: true });
        input.select();
        await addLog('Fokus dikembalikan ke input resi setelah error');
      } catch (error) {
        await addLog(`Gagal refocus setelah error: ${error.message}`);
      }
    }
  }

  async function runResiChatFlow(options = {}) {
    if (isProcessing) {
      await addLog('Flow masih berjalan, request diabaikan', { source: options.source || 'manual' });
      return { ok: false, reason: 'processing' };
    }

    const input = getResiInput();
    if (!input) {
      await setState(STATES.errorInput);
      scheduleInputDetection();
      return { ok: false, reason: 'input-not-found' };
    }

    const value = input.value.trim();
    if (!value) {
      await setState(STATES.errorEmptyResi);
      return { ok: false, reason: 'empty-resi' };
    }

    lastResi = value.slice(0, 50);
    isProcessing = true;

    try {
      await setState(STATES.waitingOrder, 'Menunggu hasil pesanan', { source: options.source || 'manual' });
      await sleep(settings.delayAfterScan);

      await setState(STATES.findChatButton);
      const chatButton = await waitForAnyElement(SELECTORS.chatButton, settings.chatButtonTimeout);
      if (!chatButton.element) {
        await setState(STATES.errorChatButton);
        await refocusAfterError();
        return { ok: false, reason: 'chat-button-not-found' };
      }

      await setState(STATES.clickChatButton);
      if (!safeClick(chatButton.element)) {
        await setState(STATES.errorChatButton, 'Error: gagal klik tombol chat');
        await refocusAfterError();
        return { ok: false, reason: 'chat-button-click-failed' };
      }
      await addLog('Tombol chat buyer diklik', { selector: chatButton.selector });

      await setState(STATES.waitSidebar);
      const sidebar = await waitForSidebarWithRetry(chatButton.element);
      if (!sidebar.element) {
        await setState(STATES.errorSidebar);
        await refocusAfterError();
        return { ok: false, reason: 'sidebar-not-found' };
      }
      await addLog('Sidebar chat terbuka', { selector: sidebar.selector });

      const chatItemOpened = await openChatItemIfNeeded();
      if (!chatItemOpened) {
        await refocusAfterError();
        return { ok: false, reason: 'chat-item-not-found' };
      }

      await refocusAfterFlow();
      return { ok: true };
    } catch (error) {
      await setState(STATES.errorSidebar, `Error: ${error.message}`);
      await refocusAfterError();
      return { ok: false, reason: error.message };
    } finally {
      isProcessing = false;
    }
  }

  async function getSnapshot() {
    const result = await storageGet([STORAGE_KEYS.status, STORAGE_KEYS.logs, STORAGE_KEYS.settings]);
    return {
      status: result[STORAGE_KEYS.status] || {
        active: isShopeeSellerPage(),
        state: currentState,
        label: STATUS_LABELS[currentState] || 'Aktif',
        lastResi,
        updatedAt: Date.now(),
        error: ''
      },
      logs: result[STORAGE_KEYS.logs] || [],
      settings: { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] || settings) }
    };
  }

  function handleMessage(message, sender, sendResponse) {
    if (!message || !message.action) return false;

    (async () => {
      if (message.action === 'getStatus') {
        sendResponse(await getSnapshot());
        return;
      }

      if (message.action === 'focusResi') {
        await focusResiInput('popup');
        sendResponse(await getSnapshot());
        return;
      }

      if (message.action === 'runFlow' || message.action === 'retryOpenChat') {
        await runResiChatFlow({ source: message.action });
        sendResponse(await getSnapshot());
        return;
      }

      if (message.action === 'updateSettings') {
        settings = { ...DEFAULT_SETTINGS, ...(message.settings || {}) };
        await storageSet({ [STORAGE_KEYS.settings]: settings });
        await addLog('Setting diperbarui dari popup');
        sendResponse(await getSnapshot());
        return;
      }

      sendResponse(await getSnapshot());
    })();

    return true;
  }

  async function init() {
    if (!isShopeeSellerPage()) return;

    await loadSettings();
    await setState(STATES.idle);

    const input = getResiInput();
    if (input) {
      await focusResiInput('init');
    } else {
      await setState(STATES.errorInput);
      scheduleInputDetection();
    }

    document.addEventListener('keydown', (event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        focusResiInput('shortcut');
      }
    });

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[STORAGE_KEYS.settings]) return;
      settings = { ...DEFAULT_SETTINGS, ...(changes[STORAGE_KEYS.settings].newValue || {}) };
    });
  }

  return {
    init,
    runResiChatFlow,
    focusResiInput
  };
})();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(ResiChatHelper.init, 500);
} else {
  window.addEventListener('DOMContentLoaded', () => setTimeout(ResiChatHelper.init, 500));
}
