'use strict';

// Service worker MV3: meneruskan chrome.commands ke content script.
// Di luar halaman seller, kedua shortcut ikut mode "Buka Halaman Seller":
// aktifkan tab seller yang ada, atau buka tab baru + titip intent siap scan.
// Pola host & URL dipakai ulang dari shared/constants.js (satu sumber kebenaran).
importScripts('../shared/constants.js');

const C = globalThis.RCH_CONSTANTS || {};
const SELLER_PATTERN = C.SELLER_HOST_PATTERN || /(^|\.)seller\.shopee\.co\.id$/i;
const SELLER_ORDER_URL = C.SELLER_ORDER_URL || 'https://seller.shopee.co.id/';
const PENDING_KEY = (C.STORAGE_KEYS && C.STORAGE_KEYS.pending) || 'rch_pending';

function isSellerUrl(url) {
  if (!url) return false;
  try {
    return SELLER_PATTERN.test(new URL(url).hostname);
  } catch (error) {
    return false;
  }
}

function queryTabs(query) {
  return new Promise((resolve) => chrome.tabs.query(query, resolve));
}

// Tab seller yang sudah terbuka (url-nya terlihat berkat host_permissions).
async function findExistingSellerTab() {
  const tabs = await queryTabs({});
  return (tabs || []).find((t) => isSellerUrl(t.url)) || null;
}

async function openSellerPage() {
  await chrome.storage.local.set({ [PENDING_KEY]: { action: 'focusResi', setAt: Date.now() } });

  const existing = await findExistingSellerTab();
  if (existing && existing.id != null) {
    await new Promise((resolve) => chrome.tabs.update(existing.id, { active: true }, resolve));
    if (existing.windowId != null) {
      chrome.windows.update(existing.windowId, { focused: true }, () => {});
    }
    return;
  }

  chrome.tabs.create({ url: SELLER_ORDER_URL, active: true });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'focus-resi' && command !== 'run-flow') return;

  const [tab] = await queryTabs({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;

  // Di luar seller: kedua shortcut = buka halaman seller siap scan.
  if (!isSellerUrl(tab.url)) {
    await openSellerPage();
    return;
  }

  const message = command === 'focus-resi'
    ? { action: 'focusResi', source: 'command' }
    : { action: 'runFlow', source: 'command' };
  chrome.tabs.sendMessage(tab.id, message).catch(() => {
    // Content script belum siap — abaikan, user bisa klik popup manual.
  });
});
