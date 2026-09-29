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
  // Pelacakan mode halaman: true = di halaman scan, false = di luar scan,
  // null = belum disinkronkan (baru init). Dipakai agar rutinitas masuk/keluar
  // hanya jalan saat TRANSISI, bukan tiap event SPA.
  let wasScanPage = null;
  let navBusy = false;
  let queuedNav = null;
  // Live watcher: MutationObserver ter-debounce + interval jaring pengaman.
  // Tugasnya HANYA (a) menangkap ganti URL yang lolos dari hook history dan
  // (b) menyegarkan cache bila node input diganti tanpa ganti URL.
  // Tidak mencuri fokus, tidak mengubah status.
  let liveTimer = null;
  let liveObserver = null;
  let liveDeb = null;
  let liveCheckBusy = false;
  let lastLiveUrl = '';
  // Penjaga fokus: timestamp fokus terakhir yang berhasil diminta + guard terakhir.
  // Guard hanya refocus bila fokus hilang ke body/kosong dalam jendela singkat.
  let lastFocusRequestAt = 0;
  let lastGuardAt = 0;
  const FOCUS_GUARD_WINDOW_MS = 10000;

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
    return resiInput;
  }

  function resetResiInput() {
    resiInput = null;
  }

  // Draft-aware: hanya anggap "sedang mengetik" bila fokus di area chat DAN
  // sudah ada draft ketikan. Auto-focus Shopee ke box kosong bukan mengetik —
  // tidak boleh membatalkan refocus maupun shortcut Alt+R/J.
  function isUserTypingInChat() {
    const active = document.activeElement;
    if (!DOM.isUserTyping(active, resiInput)) return false;
    return DOM.hasUserDraft(active);
  }

  // Pemicu Enter via DELEGASI level-document (didaftarkan sekali di content.js,
  // fase capture). Kebal terhadap node input yang diganti Shopee tanpa ganti URL
  // (re-render): dulu listener per-node putus diam-diam sehingga scan+Enter mati
  // dan operator terpaksa klik Jalankan Flow manual.
  function isResiInputTarget(target) {
    if (!target || target.nodeType !== 1 || (target.tagName || '').toUpperCase() !== 'INPUT') return false;
    try {
      if (target.matches(SELECTORS.resiInput[0])) return true;
    } catch (error) {
      // abaikan, lanjut ke verifikasi umum
    }
    const placeholder = (typeof target.getAttribute === 'function' && target.getAttribute('placeholder')) || '';
    if (!target.classList || !target.classList.contains('eds-input__input')) return false;
    if (/cari nama/i.test(placeholder)) return false;
    return findResiInput().element === target;
  }

  function handleDelegatedEnter(event) {
    if (!event || event.key !== 'Enter' || event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (!isResiInputTarget(target)) return;
    resiInput = target; // segarkan cache ke node yang live
    const value = (target.value || '').trim();
    if (!value || isProcessing) return;

    setTimeout(() => {
      runResiChatFlow({ source: 'enter' });
    }, settings.delayAfterScan);
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
      // Fokus terverifikasi + retry: panel chat Shopee sering mencuri fokus
      // sesaat setelah terbuka (animasi/re-render), sekali focus() tidak cukup.
      const stuck = await DOM.focusVerified(input, 6, 250);
      if (!stuck) {
        const activeTag = (document.activeElement && document.activeElement.tagName) || '?';
        await logger.addLog('Fokus input resi gagal bertahan (direbut halaman)', { reason, activeTag });
        return false;
      }
      stopInputDetection();
      startLiveWatch();
      lastFocusRequestAt = Date.now();
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
    // Deteksi menunggu input hanya relevan di halaman scan. Di luar scan,
    // polling + observer justru menimbulkan error spam dan beban DOM.
    if (!DOM.isScanPageUrl(location.href)) return;
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

  async function liveCheck() {
    if (liveCheckBusy) return;
    liveCheckBusy = true;
    try {
      if (!DOM.isShopeeSellerPage()) return;
      const curr = location.href;
      if (curr !== lastLiveUrl) {
        const prev = lastLiveUrl;
        lastLiveUrl = curr;
        await onSpaNavigate(prev, curr);
        return;
      }
      if (!DOM.isScanPageUrl(curr) || isProcessing) return;
      if (resiInput && (!document.contains(resiInput) || !DOM.isVisible(resiInput))) {
        resetResiInput();
        const fresh = getResiInput();
        if (fresh && settings.debugLog) {
          await logger.addLog('Live watch: node input resi diganti, cache disegarkan');
        }
      }
      await guardFocusIfLost();
    } finally {
      liveCheckBusy = false;
    }
  }

  // Penjaga fokus: kembalikan fokus HANYA bila ia hilang ke body/kosong
  // (tidak pernah merebut textarea/input/tombol) dan masih dalam jendela
  // singkat setelah fokus terakhir diminta. Cooldown 1x per jendela.
  async function guardFocusIfLost() {
    if (isProcessing) return;
    const now = Date.now();
    if (now - lastFocusRequestAt > FOCUS_GUARD_WINDOW_MS) return;
    if (now - lastGuardAt <= FOCUS_GUARD_WINDOW_MS) return;
    const active = document.activeElement;
    const tag = (active && active.tagName ? active.tagName : '').toLowerCase();
    if (active && tag !== 'body' && tag !== 'html' && tag !== '') return;
    if (DOM.hasUserDraft(active)) return;
    lastGuardAt = now;
    const input = getResiInput();
    if (!input) return;
    const stuck = await DOM.focusVerified(input, 4, 200);
    await logger.addLog(stuck
      ? 'Live watch: fokus hilang, dikembalikan ke input resi'
      : 'Live watch: gagal mengembalikan fokus yang hilang');
  }

  // Watcher hidup di SEMUA halaman seller. Interval URL selalu jalan (murah:
  // 1 perbandingan string/2 dtk) agar navigasi yang lolos hook tetap ketangkap.
  // Observer DOM berat hanya di halaman scan.
  function startLiveWatch() {
    if (!DOM.isShopeeSellerPage()) return;
    if (!liveTimer) {
      liveTimer = window.setInterval(liveCheck, 2000);
    }
    if (!DOM.isScanPageUrl(location.href)) return;
    if (!liveObserver && window.MutationObserver) {
      liveObserver = new MutationObserver(() => {
        if (liveDeb) return;
        liveDeb = setTimeout(() => {
          liveDeb = null;
          liveCheck();
        }, 500);
      });
      liveObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // Mode ringan: matikan observer DOM, interval URL tetap jalan.
  function stopLiveObserver() {
    if (liveDeb) {
      clearTimeout(liveDeb);
      liveDeb = null;
    }
    if (liveObserver) {
      liveObserver.disconnect();
      liveObserver = null;
    }
  }

  function stopLiveWatch() {
    stopLiveObserver();
    if (liveTimer) {
      window.clearInterval(liveTimer);
      liveTimer = null;
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
      chatItem: SELECTORS.chatItem,
      confirmBanner: SELECTORS.confirmBanner,
      confirmBannerClose: SELECTORS.confirmBannerClose
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

  // Hitung tombol chat yang terlihat (untuk fallback aman bila hanya 1 kandidat).
  // Dedupe berdasarkan elemen karena satu tombol bisa cocok >1 selector.
  function listVisibleChatButtons() {
    const seen = new Set();
    const buttons = [];
    for (const selector of SELECTORS.chatButton) {
      let elements = [];
      try {
        elements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        continue;
      }
      for (const el of elements) {
        if (seen.has(el)) continue;
        if (DOM.isVisible(el) && !DOM.isDisabled(el)) {
          seen.add(el);
          buttons.push({ element: el, selector });
        }
      }
    }
    return buttons;
  }

  // Tunggu tombol sebaris resi sampai batas waktu (antisipasi list me-render ulang).
  // Fallback tombol generik HANYA bila tepat 1 kandidat terlihat (tidak ambigu).
  async function waitForChatButtonForResi(resi, timeoutMs) {
    const interval = 150;
    const start = Date.now();
    let lastButtons = [];
    while (Date.now() - start <= timeoutMs) {
      const rowMatched = findChatButtonForResi(resi);
      if (rowMatched.element) {
        return { ...rowMatched, viaFallback: false };
      }
      lastButtons = listVisibleChatButtons();
      if (lastButtons.length === 0) {
        await DOM.sleep(interval);
        continue;
      }
      // Ada tombol tapi belum cocok baris → beri kesempatan list ter-filter dulu.
      await DOM.sleep(interval);
    }
    // Timeout: hanya aman klik bila tidak ambigu (tepat 1 tombol di halaman).
    lastButtons = listVisibleChatButtons();
    if (lastButtons.length === 1) {
      return { element: lastButtons[0].element, selector: lastButtons[0].selector, rowMatched: false, viaFallback: true };
    }
    return { element: null, selector: '', rowMatched: false, viaFallback: false, candidates: lastButtons.length };
  }
  async function openSidebarWithRounds(flowStart, resi) {
    const sidebarSelectors = [...SELECTORS.chatSidebarSearch, ...SELECTORS.chatList];
    const rounds = Math.min(5, Math.max(1, Number(settings.sidebarRounds) || 3));
    const perRound = Math.max(1500, Math.floor((Number(settings.sidebarTimeout) || 5000) / rounds));
    // chatButtonTimeout kembali bermakna: batas cari tombol per ronde.
    const findMs = Math.min(Number(settings.chatButtonTimeout) || 5000, perRound);
    let buttonEverFound = false;

    for (let round = 1; round <= rounds; round++) {
      await setState(C.STATES.findChatButton, `Mencari tombol chat (${round}/${rounds})`);
      // WAJIB sebaris resi. Fallback generik hanya bila tepat 1 tombol (tidak ambigu).
      const chatButton = await waitForChatButtonForResi(resi, findMs);
      const viaRow = Boolean(chatButton.element && chatButton.rowMatched);
      const viaFallbackSingle = Boolean(chatButton.element && chatButton.viaFallback);
      if (!chatButton.element) {
        await logger.addLog(`Ronde ${round}: tombol chat sebaris resi tidak ditemukan`, {
          tried: SELECTORS.chatButton.join(', '),
          candidates: chatButton.candidates || 0
        });
        continue;
      }
      buttonEverFound = true;

      await setState(C.STATES.clickChatButton, `Membuka chat buyer (${round}/${rounds})`);
      const method = await clickWithVerification(chatButton.element);
      if (!method) {
        // Kasus refresh: sidebar sudah terbuka dan chat yang benar sudah aktif,
        // klik ulang tombol yang sama memang tidak mengubah DOM sama sekali.
        // Itu BUKAN kegagalan — jangan error "sidebar belum terbuka".
        const sidebarNow = DOM.findFirstElement(sidebarSelectors);
        if (sidebarNow.element && (viaRow || viaFallbackSingle)) {
          await logger.addLog(`Klik tidak mengubah DOM tapi sidebar sudah terbuka — anggap sukses (kemungkinan chat sudah aktif sejak refresh)`, {
            selector: chatButton.selector,
            round,
            rowMatched: viaRow
          });
          return { ...sidebarNow, method: 'already-open-click-nop', round, rowMatched: viaRow };
        }
        await logger.addLog(`Ronde ${round}: klik diabaikan halaman (tidak ada perubahan DOM)`, {
          selector: chatButton.selector
        });
        continue;
      }
      await logger.addLog(`Tombol chat diklik (${method})`, {
        selector: chatButton.selector,
        round,
        rowMatched: viaRow,
        viaFallback: viaFallbackSingle
      });

      await setState(C.STATES.waitSidebar, `Menunggu sidebar chat (${round}/${rounds})`);
      const sidebar = await DOM.waitForAnyElement(sidebarSelectors, perRound);
      if (sidebar.element) {
        return { ...sidebar, method, round, rowMatched: viaRow };
      }
      await logger.addLog(`Ronde ${round}: sidebar belum muncul setelah klik ${method}`);
    }

    return { element: null, selector: '', method: '', round: rounds, buttonEverFound, rowMatched: false };
  }

  // Bila chat dibuka via tombol SEBARIS resi, Shopee yang memilih percakapan yang
  // benar — jangan klik item pertama secara membabi-buta (itu milik order lama).
  // Hanya klik bila tidak ada satupun item aktif (sidebar belum memilih apapun).
  function findActiveChatItem() {
    for (const selector of SELECTORS.chatItem) {
      let elements = [];
      try {
        elements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        continue;
      }
      const active = elements.find((el) => DOM.isVisible(el) && DOM.isActiveChatItem(el));
      if (active) return { element: active, selector };
    }
    return { element: null, selector: '' };
  }

  async function openChatItemIfNeeded(assumeCorrect = false) {
    await setState(C.STATES.openChatItem);

    if (assumeCorrect) {
      const active = findActiveChatItem();
      await logger.addLog('Lewati klik item chat: percakapan dibuka via tombol sebaris resi', {
        selector: active.selector || ''
      });
      return true;
    }

    const alreadyActive = findActiveChatItem();
    if (alreadyActive.element) {
      await logger.addLog('Item chat buyer sudah aktif', { selector: alreadyActive.selector });
      return true;
    }

    const found = findChatItem();
    if (!found.element) {
      await setState(C.STATES.errorChatItem);
      return false;
    }

    DOM.safeClick(found.element);
    await logger.addLog('Item chat buyer diklik', { selector: found.selector });
    return true;
  }

  // Menutup banner "Kamu sedang chat dengan Pelanggan tentang pesanan ini"
  // yang menutupi riwayat chat, via ikon X di header banner.
  // Best-effort: selalu resolve true agar flow tetap lanjut ke refocus walau
  // banner tidak ada (tidak semua chat menampilkannya) atau gagal ditutup.
  async function dismissConfirmBanner() {
    const appearTimeout = C.BANNER_APPEAR_TIMEOUT || 800;
    const closeTimeout = C.BANNER_CLOSE_TIMEOUT || 3000;

    // Banner bisa render sedikit telat setelah chat terbuka — beri kesempatan muncul.
    let banner = DOM.findFirstElement(SELECTORS.confirmBanner);
    const appearStart = Date.now();
    while (!banner.element && Date.now() - appearStart <= appearTimeout) {
      await DOM.sleep(150);
      banner = DOM.findFirstElement(SELECTORS.confirmBanner);
    }
    if (!banner.element) {
      await logger.addLog('Tidak ada banner pesanan, langsung refocus');
      return true;
    }

    await setState(C.STATES.closeBanner, 'Menutup banner pesanan');

    const close = DOM.findFirstElement(SELECTORS.confirmBannerClose);
    if (!close.element) {
      await logger.addLog('Banner pesanan terlihat tapi tombol tutup tidak ditemukan, tetap lanjut refocus', {
        selector: banner.selector
      });
      return true;
    }

    const method = await clickWithVerification(close.element, 500);
    if (!method) {
      await logger.addLog('Tombol tutup banner tidak mengubah DOM, tetap lanjut refocus', {
        selector: close.selector
      });
      return true;
    }

    const closeStart = Date.now();
    while (Date.now() - closeStart <= closeTimeout) {
      const still = DOM.findFirstElement(SELECTORS.confirmBanner);
      if (!still.element) {
        await logger.addLog('Banner pesanan ditutup', {
          selector: close.selector,
          method,
          durationMs: Date.now() - closeStart
        });
        return true;
      }
      await DOM.sleep(150);
    }

    await logger.addLog('Banner pesanan belum hilang setelah ditutup, tetap lanjut refocus', {
      selector: close.selector,
      method
    });
    return true;
  }

  async function refocusAfterFlow() {
    await DOM.sleep(settings.refocusDelay);
    const active = document.activeElement;
    if (DOM.isUserTyping(active, resiInput) && !DOM.hasUserDraft(active)) {
      await logger.addLog('Fokus chat kosong terdeteksi, tetap kembalikan ke input resi');
    } else if (isUserTypingInChat()) {
      await setState(C.STATES.done, 'Selesai (fokus tetap di chat karena operator sedang mengetik)');
      return;
    }
    await setState(C.STATES.refocusInput);
    const focused = await focusResiInput('after flow');
    if (focused) {
      await setState(C.STATES.done);
    } else {
      await setState(C.STATES.done, 'Selesai (fokus input resi gagal bertahan, tekan Alt+R)');
    }
  }

  async function refocusAfterError() {
    await DOM.sleep(settings.refocusDelay);
    const active = document.activeElement;
    if (DOM.isUserTyping(active, resiInput) && !DOM.hasUserDraft(active)) {
      await logger.addLog('Fokus chat kosong terdeteksi, tetap kembalikan ke input resi (after error)');
    } else if (isUserTypingInChat()) {
      await logger.addLog('Refocus dibatalkan: operator sedang mengetik di chat');
      return;
    }
    const input = getResiInput();
    if (input) {
      const stuck = await DOM.focusVerified(input, 4, 200);
      if (stuck) {
        await logger.addLog('Fokus dikembalikan ke input resi setelah error');
      } else {
        await logger.addLog('Gagal refocus setelah error: fokus direbut halaman');
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
        rowMatched: Boolean(sidebar.rowMatched),
        durationMs: Date.now() - flowStart
      });

      const chatItemOpened = await openChatItemIfNeeded(Boolean(sidebar.rowMatched));
      if (!chatItemOpened) {
        await refocusAfterError();
        return { ok: false, reason: 'chat-item-not-found' };
      }

      await dismissConfirmBanner();
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

  async function onSpaNavigate(prevUrl, currUrl) {
    // Event SPA bisa datang beruntun — antrekan yang terbaru, proses sekali.
    if (navBusy) {
      queuedNav = { prevUrl, currUrl };
      return;
    }
    navBusy = true;
    try {
      const curr = currUrl || location.href;
      lastLiveUrl = curr;
      const isScan = DOM.isScanPageUrl(curr);
      if (isProcessing) {
        // Jangan ganggu flow yang berjalan; cukup catat mode halaman.
        wasScanPage = isScan;
        return;
      }
      if (isScan && wasScanPage !== true) {
        await enterScanPage('spa-navigate');
      } else if (!isScan && wasScanPage !== false) {
        await leaveScanPage();
      } else if (isScan) {
        // Tetap di halaman scan: refresh cache agar node baru terdeteksi,
        // tanpa mencuri fokus operator. Pastikan live watcher hidup.
        resetResiInput();
        getResiInput();
        startLiveWatch();
      }
    } finally {
      navBusy = false;
      if (queuedNav) {
        const next = queuedNav;
        queuedNav = null;
        await onSpaNavigate(next.prevUrl, next.currUrl);
      }
    }
  }

  // Masuk halaman scan: reset status basi (DONE/error halaman lain) lalu fokus
  // siap scan. TIDAK menjalankan flow (input kosong → run flow pasti error).
  async function enterScanPage(source = 'scan-page') {
    wasScanPage = true;
    lastLiveUrl = location.href;
    stopInputDetection();
    resetResiInput();
    const input = getResiInput();
    if (input) {
      const focused = await focusResiInput(source);
      if (focused) {
        await setState(C.STATES.waitingEnter, 'Halaman scan terdeteksi — siap scan resi');
      }
    } else {
      await setState(C.STATES.waitingEnter, 'Halaman scan terdeteksi — menunggu kolom resi muncul');
      scheduleInputDetection();
    }
    startLiveWatch();
  }

  // Keluar halaman scan: set status standby yang jelas, hentikan observer DOM.
  // Interval URL tetap jalan (mode ringan) agar "kembali ke scan" ketangkap.
  async function leaveScanPage() {
    wasScanPage = false;
    lastLiveUrl = location.href;
    stopInputDetection();
    stopLiveObserver();
    resetResiInput();
    await setState(C.STATES.standby, 'Di luar halaman scan — standby');
  }

  // Sinkronisasi mode saat init (full load). Dipakai content.js.
  async function syncPageMode(source = 'init') {
    lastLiveUrl = location.href;
    if (DOM.isScanPageUrl(location.href)) {
      await enterScanPage(source);
    } else {
      await leaveScanPage();
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
    enterScanPage,
    leaveScanPage,
    syncPageMode,
    handleDelegatedEnter,
    liveCheck,
    getSettings,
    isBusy,
    isUserTypingInChat,
    findChatButtonForResi,
    diagnose
  };
})();
