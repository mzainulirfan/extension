'use strict';

// Wrapper promise untuk chrome.storage.local agar konsisten di semua modul.
window.RCH_STORAGE = (() => {
  function get(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function set(value) {
    return new Promise((resolve) => chrome.storage.local.set(value, resolve));
  }

  return { get, set };
})();
