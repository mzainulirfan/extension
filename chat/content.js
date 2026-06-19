if (!window.__shopeeChatTemplateHelperLoaded) {
  window.__shopeeChatTemplateHelperLoaded = true;

  const SHOPEE_INPUT_SELECTORS = [
    "textarea[placeholder='Tulis pesan']",
    "textarea[placeholder*='Tulis pesan']",
    ".RR2wewQMSf textarea",
    "textarea",
    "[contenteditable='true']",
    "[role='textbox']",
    "input[type='text']"
  ];
  const TEMPLATE_STORAGE_KEY = "chat_templates";
  const MAX_RESULTS = 12;
  const FIRST_SEND_DELAY_MS = 700;
  const NEXT_SEND_DELAY_MS = 2700;
  const SEND_RETRY_INTERVAL_MS = 250;
  const SEND_RETRY_TIMEOUT_MS = 3000;

  let templatesCache = [];
  let activeInput = null;
  let targetInput = null;
  let palette = null;
  let paletteInput = null;
  let paletteList = null;
  let paletteSelectedIndex = 0;
  let sequencePanel = null;
  let messageSequence = null;
  let sequenceTimer = null;

  injectPaletteStyles();
  loadTemplates();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[TEMPLATE_STORAGE_KEY]) {
      templatesCache = Array.isArray(changes[TEMPLATE_STORAGE_KEY].newValue)
        ? changes[TEMPLATE_STORAGE_KEY].newValue
        : [];
      renderCommandPaletteList();
    }
  });

  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) {
      return false;
    }

    if (message.type === "OPEN_TEMPLATE_PALETTE") {
      openCommandPalette();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type !== "INSERT_TEMPLATE") {
      return false;
    }

    const input = findChatInput();

    if (!input) {
      sendResponse({
        ok: false,
        error: "Kolom chat Shopee tidak ditemukan. Pastikan halaman chat sedang terbuka."
      });
      return false;
    }

    const currentValue = getCurrentValue(input);
    const nextValue = message.mode === "append" && currentValue
      ? `${currentValue}\n${message.text}`
      : message.text;

    setValueWithCaret(input, nextValue, nextValue.length);
    sendResponse({ ok: true });
    return false;
  });

  function loadTemplates() {
    chrome.storage.local.get([TEMPLATE_STORAGE_KEY], (data) => {
      templatesCache = Array.isArray(data[TEMPLATE_STORAGE_KEY]) ? data[TEMPLATE_STORAGE_KEY] : [];
      renderCommandPaletteList();
    });
  }

  function handleFocusIn(event) {
    if (!isHelperElement(event.target) && isEditableElement(event.target)) {
      activeInput = event.target;
      targetInput = event.target;
    }
  }

  function handleDocumentClick(event) {
    if (palette && !palette.hidden && palette.contains(event.target)) {
      return;
    }

    if (!isHelperElement(event.target) && isEditableElement(event.target)) {
      activeInput = event.target;
      targetInput = event.target;
      return;
    }

    if (palette && !palette.hidden) {
      closeCommandPalette(false);
    }
  }

  function handleKeyDown(event) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopPropagation();
      openCommandPalette();
      return;
    }

    if (palette && !palette.hidden) {
      handlePaletteKeyDown(event);
      return;
    }

    if (messageSequence && event.key === "Escape") {
      event.preventDefault();
      clearMessageSequence();
    }
  }

  function openCommandPalette() {
    const input = findChatInput();

    if (input) {
      activeInput = input;
      targetInput = input;
    }

    getCommandPalette();
    palette.hidden = false;
    paletteInput.value = "";
    paletteSelectedIndex = 0;
    renderCommandPaletteList();
    window.setTimeout(() => paletteInput.focus(), 0);
  }

  function closeCommandPalette(restoreFocus = true) {
    if (palette) {
      palette.hidden = true;
    }

    if (restoreFocus && activeInput && isVisible(activeInput)) {
      activeInput.focus();
    }
  }

  function getCommandPalette() {
    if (palette) {
      return palette;
    }

    palette = document.createElement("div");
    palette.id = "scth-command-palette";
    palette.hidden = true;
    palette.innerHTML = `
      <div class="scth-palette-dialog" role="dialog" aria-label="Command palette template chat">
        <div class="scth-palette-header">
          <input class="scth-palette-input" type="search" placeholder="Cari template chat..." autocomplete="off">
          <button class="scth-palette-close" type="button" title="Tutup">Tutup</button>
        </div>
        <div class="scth-palette-list"></div>
        <div class="scth-palette-help">Ctrl+Shift+K buka palette, Enter pilih, Esc tutup</div>
      </div>
    `;

    paletteInput = palette.querySelector(".scth-palette-input");
    paletteList = palette.querySelector(".scth-palette-list");

    palette.querySelector(".scth-palette-close").addEventListener("click", () => closeCommandPalette());
    palette.addEventListener("mousedown", (event) => {
      if (event.target === palette) {
        event.preventDefault();
        closeCommandPalette();
      }
    });
    paletteInput.addEventListener("input", () => {
      paletteSelectedIndex = 0;
      renderCommandPaletteList();
    });

    document.body.append(palette);
    return palette;
  }

  function handlePaletteKeyDown(event) {
    const matches = getMatchedTemplates(paletteInput ? paletteInput.value : "");

    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandPalette();
      return;
    }

    if (!matches.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      paletteSelectedIndex = (paletteSelectedIndex + 1) % matches.length;
      renderCommandPaletteList();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      paletteSelectedIndex = (paletteSelectedIndex - 1 + matches.length) % matches.length;
      renderCommandPaletteList();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      insertTemplateFromCommandPalette(matches[paletteSelectedIndex]);
    }
  }

  function renderCommandPaletteList() {
    if (!paletteList) {
      return;
    }

    const query = paletteInput ? paletteInput.value : "";
    const matches = getMatchedTemplates(query);
    paletteList.innerHTML = "";

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "scth-palette-empty";
      empty.textContent = "Template tidak ditemukan";
      paletteList.append(empty);
      return;
    }

    matches.forEach((template, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === paletteSelectedIndex ? "scth-palette-item is-selected" : "scth-palette-item";
      button.innerHTML = `
        <span class="scth-title"></span>
        <span class="scth-meta"></span>
        <span class="scth-preview"></span>
      `;
      button.querySelector(".scth-title").textContent = template.title || "Tanpa judul";
      button.querySelector(".scth-meta").textContent = template.category || "Custom";
      button.querySelector(".scth-preview").textContent = template.content || "";
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        insertTemplateFromCommandPalette(template);
      });
      paletteList.append(button);
    });
  }

  function insertTemplateFromCommandPalette(template) {
    const input = getTargetChatInput();

    if (!input || !template) {
      return;
    }

    activeInput = input;
    const messages = splitTemplateMessages(template.content || "");

    if (messages.length > 1) {
      startAutoSendSequence(input, template, messages);
    } else {
      autoSendMessage(input, template.content || "", null);
      clearMessageSequence();
    }

    closeCommandPalette();
  }

  function splitTemplateMessages(content) {
    return String(content || "")
      .split(/\n\s*---+\s*\n/g)
      .map((message) => message.trim())
      .filter(Boolean);
  }

  function startAutoSendSequence(input, template, messages) {
    messageSequence = {
      input,
      templateTitle: template.title || "Template multi-pesan",
      messages,
      index: 0,
      status: "running"
    };

    renderSequencePanel();
    scheduleCurrentSequenceMessage(FIRST_SEND_DELAY_MS);
  }

  function scheduleCurrentSequenceMessage(delayMs) {
    if (!messageSequence) {
      return;
    }

    window.clearTimeout(sequenceTimer);
    sequenceTimer = window.setTimeout(sendCurrentSequenceMessage, delayMs);
  }

  function sendCurrentSequenceMessage() {
    if (!messageSequence) {
      return;
    }

    const input = messageSequence.input && isVisible(messageSequence.input) && !isHelperElement(messageSequence.input)
      ? messageSequence.input
      : getTargetChatInput();

    if (!input) {
      clearMessageSequence();
      return;
    }

    activeInput = input;
    messageSequence.input = input;

    const message = messageSequence.messages[messageSequence.index] || "";
    autoSendMessage(input, message, () => {
      if (!messageSequence) {
        return;
      }

      if (messageSequence.index >= messageSequence.messages.length - 1) {
        messageSequence.status = "done";
        renderSequencePanel();
        window.setTimeout(clearMessageSequence, 1800);
        return;
      }

      messageSequence.index += 1;
      renderSequencePanel();
      scheduleCurrentSequenceMessage(NEXT_SEND_DELAY_MS);
    });
  }

  function autoSendMessage(input, message, afterSend) {
    setValueWithCaret(input, message, message.length);

    window.setTimeout(async () => {
      const sent = await clickSendButton(input);

      if (messageSequence && !sent) {
        messageSequence.status = "error";
        renderSequencePanel();
        return;
      }

      if (afterSend) {
        afterSend();
      }
    }, FIRST_SEND_DELAY_MS);
  }

  function clearMessageSequence() {
    window.clearTimeout(sequenceTimer);
    sequenceTimer = null;
    messageSequence = null;

    if (sequencePanel) {
      sequencePanel.hidden = true;
    }
  }

  function renderSequencePanel() {
    if (!messageSequence) {
      clearMessageSequence();
      return;
    }

    const panel = getSequencePanel();
    const current = messageSequence.index + 1;
    const total = messageSequence.messages.length;
    const isLast = current >= total;
    const isDone = messageSequence.status === "done";
    const isError = messageSequence.status === "error";

    panel.querySelector(".scth-sequence-title").textContent = messageSequence.templateTitle;
    panel.querySelector(".scth-sequence-count").textContent = isDone
      ? "Selesai"
      : `Auto-send pesan ${current} dari ${total}`;
    panel.querySelector(".scth-sequence-note").textContent = isError
      ? "Tombol kirim tidak ditemukan. Pesan sudah masuk field, kirim manual."
      : isDone
        ? "Semua pesan sudah dikirim."
        : isLast
          ? "Mengirim pesan terakhir..."
          : `Pesan berikutnya dikirim sekitar ${Math.round(NEXT_SEND_DELAY_MS / 1000)} detik lagi.`;
    panel.querySelector(".scth-sequence-cancel").disabled = isDone;
    panel.hidden = false;
  }

  function getSequencePanel() {
    if (sequencePanel) {
      return sequencePanel;
    }

    sequencePanel = document.createElement("div");
    sequencePanel.id = "scth-sequence-panel";
    sequencePanel.hidden = true;
    sequencePanel.innerHTML = `
      <div>
        <strong class="scth-sequence-title"></strong>
        <span class="scth-sequence-count"></span>
        <p class="scth-sequence-note"></p>
      </div>
      <div class="scth-sequence-actions">
        <button class="scth-sequence-cancel" type="button">Batal</button>
      </div>
    `;

    sequencePanel.querySelector(".scth-sequence-cancel").addEventListener("click", clearMessageSequence);
    document.body.append(sequencePanel);
    return sequencePanel;
  }

  async function clickSendButton(input) {
    const deadline = Date.now() + SEND_RETRY_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const container = input.closest(".RR2wewQMSf") || input.parentElement || document;
      const beforeSendValue = getCurrentValue(input).trim();

      fireEnterSend(input);
      await wait(350);

      if (beforeSendValue && !getCurrentValue(input).trim()) {
        return true;
      }

      const sendButtons = findSendButtons(container);
      const documentButtons = container === document ? [] : findSendButtons(document);
      const candidates = uniqueElements([...sendButtons, ...documentButtons]);

      for (const sendButton of candidates) {
        if (!sendButton || isDisabled(sendButton)) {
          continue;
        }

        fireClickSequence(sendButton);
        await wait(350);

        if (beforeSendValue && !getCurrentValue(input).trim()) {
          return true;
        }
      }

      await wait(SEND_RETRY_INTERVAL_MS);
    }

    return false;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function fireClickSequence(element) {
    element.focus && element.focus();

    const pointerOptions = {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      view: window
    };
    const mouseOptions = {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: 1,
      view: window
    };

    dispatchPointerLikeEvent(element, "pointerover", pointerOptions);
    dispatchPointerLikeEvent(element, "pointerenter", pointerOptions);
    element.dispatchEvent(new MouseEvent("mouseover", mouseOptions));
    element.dispatchEvent(new MouseEvent("mouseenter", mouseOptions));
    dispatchPointerLikeEvent(element, "pointerdown", pointerOptions);
    element.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
    dispatchPointerLikeEvent(element, "pointerup", pointerOptions);
    element.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
    element.dispatchEvent(new MouseEvent("click", mouseOptions));
  }

  function fireEnterSend(input) {
    input.focus();

    const options = {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13
    };

    input.dispatchEvent(new KeyboardEvent("keydown", options));
    input.dispatchEvent(new KeyboardEvent("keypress", options));
    input.dispatchEvent(new KeyboardEvent("keyup", options));
  }

  function dispatchPointerLikeEvent(element, type, options) {
    if (typeof PointerEvent === "function") {
      element.dispatchEvent(new PointerEvent(type, options));
      return;
    }

    element.dispatchEvent(new MouseEvent(type.replace("pointer", "mouse"), options));
  }

  function findSendButtons(root) {
    const directCandidates = [
      ...Array.from(root.querySelectorAll(".RR2wewQMSf .C4eQ_E6clG")),
      ...Array.from(root.querySelectorAll(".RR2wewQMSf .pqq6o4R57Y")),
      ...Array.from(root.querySelectorAll(".RR2wewQMSf .C4eQ_E6clG .pqq6o4R57Y")),
      ...Array.from(root.querySelectorAll(".RR2wewQMSf .C4eQ_E6clG i")),
      ...Array.from(root.querySelectorAll(".RR2wewQMSf .C4eQ_E6clG svg.chat-icon")),
      ...Array.from(root.querySelectorAll(".RR2wewQMSf .chat-icon")).map((icon) => findClickableAncestor(icon)),
      ...Array.from(root.querySelectorAll(".C4eQ_E6clG")),
      ...Array.from(root.querySelectorAll(".pqq6o4R57Y")),
      ...Array.from(root.querySelectorAll(".C4eQ_E6clG i")),
      ...Array.from(root.querySelectorAll(".C4eQ_E6clG svg.chat-icon")),
      ...Array.from(root.querySelectorAll(".chat-icon")).map((icon) => findClickableAncestor(icon)),
      ...Array.from(root.querySelectorAll("[aria-label*='Kirim' i], [aria-label*='Send' i], [title*='Kirim' i], [title*='Send' i]")),
      ...Array.from(root.querySelectorAll("button[type='submit'], button"))
    ].filter(Boolean);

    return uniqueElements(directCandidates).filter((candidate) => {
      if (!isVisible(candidate) || isDisabled(candidate)) {
        return false;
      }

      const text = (candidate.textContent || "").toLowerCase();
      const ariaLabel = (candidate.getAttribute("aria-label") || "").toLowerCase();
      const title = (candidate.getAttribute("title") || "").toLowerCase();
      const hasChatIcon = Boolean(candidate.querySelector(".chat-icon, svg.chat-icon")) || candidate.classList.contains("chat-icon");
      const className = String(candidate.className || "");

      return (
        className.includes("pqq6o4R57Y") ||
        className.includes("C4eQ_E6clG") ||
        hasChatIcon ||
        text.includes("kirim") ||
        text.includes("send") ||
        ariaLabel.includes("kirim") ||
        ariaLabel.includes("send") ||
        title.includes("kirim") ||
        title.includes("send")
      );
    });
  }

  function findClickableAncestor(element) {
    return element.closest("button, [role='button'], .pqq6o4R57Y, .C4eQ_E6clG, i, div") || element;
  }

  function uniqueElements(elements) {
    return Array.from(new Set(elements));
  }

  function isDisabled(element) {
    return Boolean(
      element.disabled ||
      element.getAttribute("aria-disabled") === "true" ||
      element.classList.contains("disabled") ||
      element.classList.contains("is-disabled")
    );
  }

  function insertTextAtCaret(input, text) {
    const value = getCurrentValue(input);
    const caret = getCaretPosition(input);
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const separatorBefore = before && !before.endsWith("\n") && !before.endsWith(" ") ? " " : "";
    const separatorAfter = after && !after.startsWith("\n") && !after.startsWith(" ") ? " " : "";
    const nextValue = `${before}${separatorBefore}${text}${separatorAfter}${after}`;
    const nextCaret = before.length + separatorBefore.length + String(text || "").length;

    setValueWithCaret(input, nextValue, nextCaret);
  }

  function getMatchedTemplates(query) {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return templatesCache
      .filter((template) => {
        const haystack = `${template.title || ""} ${template.category || ""} ${template.content || ""}`.toLowerCase();
        return !normalizedQuery || haystack.includes(normalizedQuery);
      })
      .slice(0, MAX_RESULTS);
  }

  function findChatInput() {
    const activeElement = document.activeElement;

    if (!isHelperElement(activeElement) && isEditableElement(activeElement)) {
      return activeElement;
    }

    const candidates = SHOPEE_INPUT_SELECTORS.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const visibleCandidates = candidates.filter((element) => isVisible(element) && !isHelperElement(element));

    return visibleCandidates.find((element) => {
      const placeholder = (element.getAttribute("placeholder") || "").toLowerCase();
      const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();
      const role = (element.getAttribute("role") || "").toLowerCase();

      return (
        placeholder.includes("tulis pesan") ||
        placeholder.includes("chat") ||
        placeholder.includes("pesan") ||
        placeholder.includes("message") ||
        ariaLabel.includes("chat") ||
        ariaLabel.includes("pesan") ||
        ariaLabel.includes("message") ||
        role === "textbox"
      );
    }) || visibleCandidates[0] || null;
  }

  function getTargetChatInput() {
    if (targetInput && isVisible(targetInput) && !isHelperElement(targetInput)) {
      return targetInput;
    }

    if (activeInput && isVisible(activeInput) && !isHelperElement(activeInput)) {
      return activeInput;
    }

    const input = findChatInput();

    if (input) {
      targetInput = input;
      activeInput = input;
    }

    return input;
  }

  function isHelperElement(element) {
    return Boolean(
      element &&
      element.closest &&
      (element.closest("#scth-command-palette") || element.closest("#scth-sequence-panel"))
    );
  }

  function isEditableElement(element) {
    if (!element || !isVisible(element)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    return element.isContentEditable || tagName === "textarea" || tagName === "input" || element.getAttribute("role") === "textbox";
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function getCurrentValue(element) {
    if (element.isContentEditable || element.getAttribute("role") === "textbox") {
      return element.textContent || "";
    }

    return element.value || "";
  }

  function getCaretPosition(element) {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "textarea" || tagName === "input") {
      return typeof element.selectionStart === "number" ? element.selectionStart : getCurrentValue(element).length;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !element.contains(selection.anchorNode)) {
      return getCurrentValue(element).length;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }

  function setValueWithCaret(element, value, caretPosition) {
    const tagName = element.tagName.toLowerCase();

    if (element.isContentEditable || element.getAttribute("role") === "textbox") {
      element.focus();
      element.textContent = value;
      placeCaretAtTextOffset(element, caretPosition);
    } else if (tagName === "textarea" || tagName === "input") {
      const previousValue = element.value;
      setNativeInputValue(element, value);
      element.focus();
      element.setSelectionRange(caretPosition, caretPosition);

      if (element.value !== value) {
        element.value = previousValue;
        element.select();
        document.execCommand("insertText", false, value);
        element.setSelectionRange(caretPosition, caretPosition);
      }
    }

    dispatchInputEvents(element, value);
  }

  function setNativeInputValue(element, value) {
    const tagName = element.tagName.toLowerCase();
    const prototype = tagName === "textarea" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    const ownDescriptor = Object.getOwnPropertyDescriptor(element, "value");

    if (prototypeDescriptor && prototypeDescriptor.set && (!ownDescriptor || ownDescriptor.set !== prototypeDescriptor.set)) {
      prototypeDescriptor.set.call(element, value);
    } else if (ownDescriptor && ownDescriptor.set) {
      ownDescriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  function placeCaretAtTextOffset(element, offset) {
    const selection = window.getSelection();
    const range = document.createRange();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let textNode = walker.nextNode();

    while (textNode) {
      const nextOffset = currentOffset + textNode.textContent.length;

      if (offset <= nextOffset) {
        range.setStart(textNode, Math.max(0, offset - currentOffset));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }

      currentOffset = nextOffset;
      textNode = walker.nextNode();
    }

    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function dispatchInputEvents(element, value) {
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: value
    }));
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function injectPaletteStyles() {
    if (document.getElementById("scth-palette-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "scth-palette-style";
    style.textContent = `
      #scth-command-palette {
        align-items: flex-start;
        background: rgba(15, 23, 42, 0.32);
        bottom: 0;
        display: flex;
        justify-content: center;
        left: 0;
        padding-top: min(12vh, 96px);
        position: fixed;
        right: 0;
        top: 0;
        z-index: 2147483647;
      }

      #scth-command-palette[hidden] {
        display: none;
      }

      .scth-palette-dialog {
        background: #ffffff;
        border: 1px solid #d9e1ea;
        border-radius: 8px;
        box-shadow: 0 24px 70px rgba(23, 32, 51, 0.28);
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        overflow: hidden;
        width: min(560px, calc(100vw - 28px));
      }

      .scth-palette-header {
        align-items: center;
        border-bottom: 1px solid #e7edf3;
        display: flex;
        gap: 8px;
        padding: 10px;
      }

      .scth-palette-input {
        border: 1px solid #d9e1ea;
        border-radius: 6px;
        color: #172033;
        flex: 1;
        font: 14px Arial, Helvetica, sans-serif;
        outline: none;
        padding: 10px 12px;
      }

      .scth-palette-input:focus {
        border-color: #e8522c;
        box-shadow: 0 0 0 3px rgba(232, 82, 44, 0.16);
      }

      .scth-palette-close {
        background: #eef2f6;
        border: 0;
        border-radius: 6px;
        color: #172033;
        cursor: pointer;
        font: 700 12px Arial, Helvetica, sans-serif;
        height: 36px;
        padding: 0 10px;
      }

      .scth-palette-list {
        max-height: min(52vh, 420px);
        overflow: auto;
        padding: 6px;
      }

      .scth-palette-item {
        background: transparent;
        border: 0;
        border-radius: 6px;
        color: inherit;
        cursor: pointer;
        display: grid;
        gap: 4px;
        padding: 10px;
        text-align: left;
        width: 100%;
      }

      .scth-palette-item:hover,
      .scth-palette-item.is-selected {
        background: #fff1ec;
      }

      .scth-title {
        font-weight: 700;
        line-height: 1.25;
      }

      .scth-meta {
        color: #c93c1b;
        font-size: 12px;
        font-weight: 700;
      }

      .scth-preview {
        color: #667085;
        display: block;
        line-height: 1.35;
        max-height: 34px;
        overflow: hidden;
      }

      .scth-palette-empty {
        color: #667085;
        padding: 24px;
        text-align: center;
      }

      .scth-palette-help {
        border-top: 1px solid #e7edf3;
        color: #667085;
        font: 12px Arial, Helvetica, sans-serif;
        padding: 8px 12px;
      }

      #scth-sequence-panel {
        align-items: center;
        background: #ffffff;
        border: 1px solid #d9e1ea;
        border-radius: 8px;
        bottom: 18px;
        box-shadow: 0 16px 36px rgba(23, 32, 51, 0.2);
        color: #172033;
        display: flex;
        font-family: Arial, Helvetica, sans-serif;
        gap: 14px;
        max-width: min(520px, calc(100vw - 28px));
        padding: 12px;
        position: fixed;
        right: 18px;
        z-index: 2147483647;
      }

      #scth-sequence-panel[hidden] {
        display: none;
      }

      .scth-sequence-title {
        display: block;
        font-size: 13px;
        line-height: 1.25;
        max-width: 280px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .scth-sequence-count {
        color: #c93c1b;
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-top: 3px;
      }

      .scth-sequence-note {
        color: #667085;
        font-size: 12px;
        line-height: 1.35;
        margin: 4px 0 0;
      }

      .scth-sequence-actions {
        display: flex;
        flex: 0 0 auto;
        gap: 6px;
      }

      .scth-sequence-actions button {
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        font: 700 12px Arial, Helvetica, sans-serif;
        height: 32px;
        padding: 0 10px;
      }

      .scth-sequence-cancel {
        background: #e8522c;
        color: #ffffff;
      }

      .scth-sequence-cancel:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
    `;
    document.documentElement.append(style);
  }
}
