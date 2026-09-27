'use strict';

// Konstanta bersama content script, popup, dan service worker.
// Dimuat sebagai classic script → expose via globalThis agar bisa dipakai
// di page (window), popup, maupun service worker (importScripts, tanpa window).
// Jangan taruh selector DOM di sini (lihat src/content/selectors.js).
globalThis.RCH_CONSTANTS = {
  STORAGE_KEYS: {
    settings: 'rch_settings',
    status: 'rch_status',
    logs: 'rch_logs',
    pending: 'rch_pending'
  },

  DEFAULT_SETTINGS: {
    delayAfterScan: 500,
    chatButtonTimeout: 5000,
    sidebarTimeout: 5000,
    refocusDelay: 500,
    sidebarRounds: 3,
    debugLog: false
  },

  STATES: {
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
    errorSidebarHidden: 'ERROR_SIDEBAR_HIDDEN',
    errorChatItem: 'ERROR_CHAT_ITEM_NOT_FOUND'
  },

  STATUS_LABELS: {
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
    ERROR_SIDEBAR_HIDDEN: 'Error: panel chat tersembunyi (klik tidak mempan)',
    ERROR_CHAT_ITEM_NOT_FOUND: 'Error: item chat tidak ditemukan'
  },

  POLL_INTERVAL: 100,
  MAX_LOGS: 30,
  MAX_RESI_LENGTH: 50,
  PENDING_MAX_AGE_MS: 60000,
  SELLER_HOST_PATTERN: /(^|\.)seller\.shopee\.co\.id$/i,
  SELLER_ORDER_URL: 'https://seller.shopee.co.id/portal/sale/order?type=toship&source=processed&sort_by=ship_by_date_asc'
};
