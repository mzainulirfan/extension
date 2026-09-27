'use strict';

// Helper DOM murni: tanpa state global, semua input lewat parameter.
// Bergantung hanya pada window.RCH_CONSTANTS untuk POLL_INTERVAL.
window.RCH_DOM = (() => {
  function getConstants() {
    return window.RCH_CONSTANTS || { POLL_INTERVAL: 100 };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function isShopeeSellerPage(hostname = location.hostname) {
    const pattern = getConstants().SELLER_HOST_PATTERN;
    return pattern ? pattern.test(hostname) : false;
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  }

  function isDisabled(element) {
    return Boolean(element && (element.disabled || element.getAttribute('aria-disabled') === 'true'));
  }

  function findFirstElement(selectors, options = {}) {
    for (const selector of selectors) {
      let elements = [];
      try {
        elements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        continue;
      }
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

  async function waitForAnyElement(selectors, timeoutMs, options = {}) {
    const interval = getConstants().POLL_INTERVAL || 100;
    const start = Date.now();

    while (Date.now() - start <= timeoutMs) {
      const found = findFirstElement(selectors, options);
      if (found.element) {
        return found;
      }
      await sleep(interval);
    }

    return { element: null, selector: '' };
  }

  // Elemen ada di DOM tapi tersembunyi (kasus panel chat pre-render hidden).
  // Dipakai untuk membedakan "klik tidak mempan" vs "struktur tak dikenal".
  function findHiddenElement(selectors) {
    for (const selector of selectors) {
      let elements = [];
      try {
        elements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        continue;
      }
      const element = elements.find((candidate) => !isVisible(candidate) && !isDisabled(candidate));
      if (element) {
        return { element, selector };
      }
    }
    return { element: null, selector: '' };
  }

  // True bila ada mutasi DOM dalam timeout — bukti klik "bereaksi".
  // Resolve false bila tidak ada perubahan sama sekali (klik meleset/diabaikan).
  function waitForDomMutation(timeoutMs) {
    return new Promise((resolve) => {
      if (!window.MutationObserver) {
        setTimeout(() => resolve(false), Math.max(0, Number(timeoutMs) || 0));
        return;
      }
      let done = false;
      const observer = new MutationObserver(() => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        observer.disconnect();
        resolve(true);
      });
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        observer.disconnect();
        resolve(false);
      }, Math.max(0, Number(timeoutMs) || 0));
      try {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      } catch (error) {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(false);
        }
      }
    });
  }

  function scrollToCenter(element) {
    try {
      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
    } catch (error) {
      try {
        element.scrollIntoView({ block: 'center', inline: 'center' });
      } catch (ignored) {
        // abaikan, lanjut ke klik
      }
    }
  }

  // Varian klik native (tanpa mouse events sintetis).
  function clickNative(element) {
    if (!element || !isVisible(element) || isDisabled(element)) return false;
    scrollToCenter(element);
    element.click();
    return true;
  }

  // Varian klik sintetis penuh (hover + mousedown/up + click).
  function safeClick(element) {
    if (!element || !isVisible(element) || isDisabled(element)) return false;
    scrollToCenter(element);
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    element.click();
    return true;
  }

  // Varian klik keyboard: fokus + Enter (untuk tombol yang butuh fokus).
  function clickKeyboard(element) {
    if (!element || !isVisible(element) || isDisabled(element)) return false;
    scrollToCenter(element);
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      // lanjut walau fokus gagal
    }
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }));
    element.click();
    return true;
  }

  function isActiveChatItem(element) {
    if (!element) return false;
    const selected = element.getAttribute('aria-selected') === 'true';
    const activeClass = /active|selected|current/i.test(element.className || '');
    return selected || activeClass;
  }

  // True bila operator sedang mengetik pesan (bukan di input resi / pencarian sidebar).
  function isUserTyping(activeElement, resiInput) {
    const active = activeElement || document.activeElement;
    if (!active) return false;
    if (active === resiInput) return false;
    const tag = (active.tagName || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (active.isContentEditable) return true;
    if (tag === 'input') {
      const placeholder = active.getAttribute('placeholder') || '';
      if (/cari nama/i.test(placeholder)) return false;
      return true;
    }
    return false;
  }

  // Selector generik untuk mendeteksi panel/drawer/modal yang sedang terbuka.
  // Dipakai diagnosis "panel salah terbuka" vs "tidak ada panel sama sekali".
  const PANEL_PROBE_SELECTORS = [
    '[role="dialog"]',
    '[role="complementary"]',
    '.drawer',
    '.sidebar',
    '.modal',
    '.popup',
    'iframe'
  ];

  function countMatches(selector) {
    let total = 0;
    let visible = 0;
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      total = elements.length;
      visible = elements.filter((el) => isVisible(el) && !isDisabled(el)).length;
    } catch (error) {
      return { total: 0, visible: 0, invalid: true };
    }
    return { total, visible, invalid: false };
  }

  // Snapshot diagnosis halaman: match per grup selector + panel terbuka.
  // Murni baca DOM, tidak mengubah apapun. Hasilnya JSON-able.
  function diagnosePage(groups) {
    const result = {
      url: location.href,
      hostname: location.hostname,
      timestamp: Date.now(),
      groups: {},
      panels: {},
      overlays: 0
    };

    for (const [name, selectors] of Object.entries(groups || {})) {
      result.groups[name] = (selectors || []).map((selector) => ({
        selector,
        ...countMatches(selector)
      }));
    }

    for (const selector of PANEL_PROBE_SELECTORS) {
      const found = findFirstElement([selector]);
      result.panels[selector] = {
        open: Boolean(found.element),
        ...countMatches(selector)
      };
    }

    // Overlay/modal yang bisa menutupi tombol chat saat diklik.
    try {
      result.overlays = Array.from(document.querySelectorAll('.modal, [role="dialog"], .mask, .overlay'))
        .filter((el) => isVisible(el)).length;
    } catch (error) {
      result.overlays = 0;
    }

    return result;
  }
  // Hook navigasi SPA Shopee (pushState/replaceState tanpa reload).
  // Mengembalikan fungsi unhook. onNavigate dipanggil tiap URL berubah.
  function hookSpaNavigation(onNavigate) {
    let lastUrl = location.href;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    function checkUrlChanged() {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      onNavigate();
    }

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      checkUrlChanged();
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      checkUrlChanged();
      return result;
    };
    window.addEventListener('popstate', checkUrlChanged);
    window.addEventListener('hashchange', checkUrlChanged);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', checkUrlChanged);
      window.removeEventListener('hashchange', checkUrlChanged);
    };
  }

  return {
    sleep,
    isShopeeSellerPage,
    isVisible,
    isDisabled,
    findFirstElement,
    findHiddenElement,
    waitForAnyElement,
    waitForDomMutation,
    scrollToCenter,
    clickNative,
    safeClick,
    clickKeyboard,
    isActiveChatItem,
    isUserTyping,
    hookSpaNavigation,
    diagnosePage,
    PANEL_PROBE_SELECTORS
  };
})();
