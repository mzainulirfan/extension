(() => {
  "use strict";

  const READY_ATTR = "copyHelperReady";
  const BUTTON_CLASS = "shopee-copy-helper-btn";
  const BUTTON_HIDDEN_CLASS = "shopee-copy-helper-btn-hidden";
  const FEEDBACK_DURATION_MS = 1000;

  const TARGETS = [
    {
      type: "order_number",
      selectors: [".order-sn"],
      parser: parseOrderNumber
    },
    {
      type: "buyer_note",
      selectors: [
        ".order-comment-content .comment-desc span",
        ".order-comment-content-inline .order-comment-desc-inline span"
      ],
      parser: parseBuyerNote
    }
  ];

  let activeElement = null;
  let activeTarget = null;
  let hideTimer = null;
  let feedbackTimer = null;
  let scanFrame = null;
  let copyButton = null;
  let buttonHovered = false;

  function parseOrderNumber(text) {
    const rawText = text.trim();
    const cleaned = rawText.replace(/^No\.?\s*Pesanan\s*/i, "").trim();
    return cleaned || rawText;
  }

  function parseBuyerNote(text) {
    return text.trim();
  }

  function getElementText(element) {
    return (element.innerText || element.textContent || "").trim();
  }

  function hasCopyableText(element, target) {
    return target.parser(getElementText(element)).length > 0;
  }

  function initCopyTargets() {
    TARGETS.forEach((target) => {
      target.selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          initElement(element, target);
        });
      });
    });

    findOrderNumberFallbacks().forEach((element) => {
      initElement(element, TARGETS[0]);
    });
  }

  function initElement(element, target) {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset[READY_ATTR]) return;
    if (!hasCopyableText(element, target)) return;

    element.dataset[READY_ATTR] = target.type;
    element.addEventListener("mouseenter", () => showButton(element, target));
    element.addEventListener("mouseleave", scheduleHideButton);
  }

  function findOrderNumberFallbacks() {
    const candidates = document.querySelectorAll("span, div");
    const matches = [];

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.matches(".order-sn")) return;

      const text = getElementText(element);
      if (!/^No\.?\s*Pesanan\s+\S+/i.test(text)) return;
      if (text.length > 80) return;
      if (!isSafeFallbackElement(element, text)) return;

      matches.push(element);
    });

    return matches;
  }

  function isSafeFallbackElement(element, text) {
    const childElementCount = element.children.length;
    if (childElementCount === 0) return true;

    if (childElementCount > 2) return false;

    const childText = Array.from(element.children)
      .map((child) => getElementText(child))
      .filter(Boolean)
      .join(" ")
      .trim();

    return childText === text;
  }

  function ensureButton() {
    if (copyButton) return copyButton;

    copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = `${BUTTON_CLASS} ${BUTTON_HIDDEN_CLASS}`;
    copyButton.textContent = "Copy";
    copyButton.setAttribute("aria-label", "Copy text");

    copyButton.addEventListener("mouseenter", () => {
      buttonHovered = true;
      clearHideTimer();
    });

    copyButton.addEventListener("mouseleave", () => {
      buttonHovered = false;
      scheduleHideButton();
    });

    copyButton.addEventListener("click", handleCopyClick);

    document.body.appendChild(copyButton);
    return copyButton;
  }

  function showButton(element, target) {
    const parsedText = target.parser(getElementText(element));
    if (!parsedText) {
      hideButton();
      return;
    }

    clearHideTimer();
    clearFeedbackTimer();

    activeElement = element;
    activeTarget = target;

    const button = ensureButton();
    button.textContent = "Copy";
    button.classList.remove(BUTTON_HIDDEN_CLASS);
    positionButton(element);
  }

  function scheduleHideButton() {
    clearHideTimer();

    hideTimer = window.setTimeout(() => {
      if (buttonHovered) return;
      hideButton();
    }, 120);
  }

  function hideButton() {
    clearHideTimer();
    clearFeedbackTimer();

    if (copyButton) {
      copyButton.classList.add(BUTTON_HIDDEN_CLASS);
      copyButton.textContent = "Copy";
    }

    activeElement = null;
    activeTarget = null;
  }

  function clearHideTimer() {
    if (!hideTimer) return;
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  function clearFeedbackTimer() {
    if (!feedbackTimer) return;
    window.clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }

  async function handleCopyClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!activeElement || !activeTarget || !copyButton) return;

    const textToCopy = activeTarget.parser(getElementText(activeElement));
    if (!textToCopy) return;

    try {
      await writeToClipboard(textToCopy);
      showFeedback("Copied!");
    } catch (error) {
      console.error("[Shopee Copy Helper] Clipboard write failed:", error);
      showFeedback("Failed");
    }
  }

  async function writeToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return;
    }

    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("document.execCommand('copy') returned false");
    }
  }

  function showFeedback(label) {
    if (!copyButton) return;

    clearFeedbackTimer();
    copyButton.textContent = label;

    feedbackTimer = window.setTimeout(() => {
      if (copyButton && !copyButton.classList.contains(BUTTON_HIDDEN_CLASS)) {
        copyButton.textContent = "Copy";
      }
    }, FEEDBACK_DURATION_MS);
  }

  function positionButton(element) {
    if (!copyButton) return;

    const rect = element.getBoundingClientRect();
    const spacing = 4;
    const buttonRect = copyButton.getBoundingClientRect();
    const buttonWidth = buttonRect.width || 76;
    const buttonHeight = buttonRect.height || 34;

    let left = rect.right - buttonWidth - spacing;
    let top = rect.top - buttonHeight - spacing;

    if (top < spacing) {
      top = rect.top + spacing;
    }

    if (rect.width < buttonWidth + spacing * 2) {
      left = rect.right + spacing;
    }

    if (left + buttonWidth > window.innerWidth - spacing) {
      left = rect.left - buttonWidth - spacing;
    }

    if (left < spacing) {
      left = rect.left + spacing;
    }

    if (top + buttonHeight > window.innerHeight - spacing) {
      top = rect.bottom - buttonHeight - spacing;
    }

    left = clamp(left, spacing, window.innerWidth - buttonWidth - spacing);
    top = clamp(top, spacing, window.innerHeight - buttonHeight - spacing);

    copyButton.style.left = `${left}px`;
    copyButton.style.top = `${top}px`;
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
  }

  function scheduleScan() {
    if (scanFrame) return;

    scanFrame = window.requestAnimationFrame(() => {
      scanFrame = null;
      initCopyTargets();
    });
  }

  function startObserver() {
    if (!document.body) return;

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function repositionActiveButton() {
    if (!activeElement || !copyButton || copyButton.classList.contains(BUTTON_HIDDEN_CLASS)) {
      return;
    }

    positionButton(activeElement);
  }

  function start() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", start, { once: true });
      return;
    }

    ensureButton();
    initCopyTargets();
    startObserver();
    window.addEventListener("scroll", repositionActiveButton, true);
    window.addEventListener("resize", repositionActiveButton);
  }

  start();
})();
