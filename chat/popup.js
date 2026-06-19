const elements = {
  templateCount: document.querySelector("#templateCount"),
  newTemplateButton: document.querySelector("#newTemplateButton"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusMessage: document.querySelector("#statusMessage"),
  insertMode: document.querySelector("#insertMode"),
  exportButton: document.querySelector("#exportButton"),
  importFile: document.querySelector("#importFile"),
  templateList: document.querySelector("#templateList"),
  draftInput: document.querySelector("#draftInput"),
  copyDraftButton: document.querySelector("#copyDraftButton"),
  insertDraftButton: document.querySelector("#insertDraftButton"),
  saveDraftButton: document.querySelector("#saveDraftButton"),
  variablePanel: document.querySelector("#variablePanel"),
  variableFields: document.querySelector("#variableFields"),
  previewOutput: document.querySelector("#previewOutput"),
  copyPreviewButton: document.querySelector("#copyPreviewButton"),
  insertPreviewButton: document.querySelector("#insertPreviewButton"),
  clearVariableButton: document.querySelector("#clearVariableButton"),
  editorPanel: document.querySelector("#editorPanel"),
  editorTitle: document.querySelector("#editorTitle"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  templateForm: document.querySelector("#templateForm"),
  templateId: document.querySelector("#templateId"),
  titleInput: document.querySelector("#titleInput"),
  categoryInput: document.querySelector("#categoryInput"),
  categoryOptions: document.querySelector("#categoryOptions"),
  contentInput: document.querySelector("#contentInput")
};

let templates = [];
let categories = [];
let selectedTemplate = null;
let variableValues = {};
let statusTimer = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    await initializeStorage();
    await refreshState();
    bindEvents();
    render();
  } catch (error) {
    showStatus("Gagal memuat data extension", "error");
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", renderTemplateList);
  elements.categoryFilter.addEventListener("change", renderTemplateList);
  elements.newTemplateButton.addEventListener("click", () => openEditor());
  elements.cancelEditButton.addEventListener("click", closeEditor);
  elements.templateForm.addEventListener("submit", handleTemplateSubmit);
  elements.copyDraftButton.addEventListener("click", () => copyText(elements.draftInput.value));
  elements.insertDraftButton.addEventListener("click", () => insertText(elements.draftInput.value));
  elements.saveDraftButton.addEventListener("click", saveDraftAsTemplate);
  elements.exportButton.addEventListener("click", exportTemplates);
  elements.importFile.addEventListener("change", importTemplates);
  elements.insertMode.addEventListener("change", handleInsertModeChange);
  elements.clearVariableButton.addEventListener("click", clearVariablePanel);
  elements.copyPreviewButton.addEventListener("click", () => copyText(elements.previewOutput.value));
  elements.insertPreviewButton.addEventListener("click", () => insertText(elements.previewOutput.value));
}

async function refreshState() {
  [templates, categories] = await Promise.all([getTemplates(), getCategories()]);
  const settings = await getSettings();
  elements.insertMode.value = settings.insertMode;
}

function render() {
  renderCategoryOptions();
  renderTemplateList();
}

function renderCategoryOptions() {
  elements.categoryFilter.innerHTML = '<option value="">Semua kategori</option>';
  elements.categoryOptions.innerHTML = "";

  categories.forEach((category) => {
    const filterOption = document.createElement("option");
    filterOption.value = category;
    filterOption.textContent = category;
    elements.categoryFilter.append(filterOption);

    const datalistOption = document.createElement("option");
    datalistOption.value = category;
    elements.categoryOptions.append(datalistOption);
  });
}

function getFilteredTemplates() {
  const keyword = normalizeText(elements.searchInput.value);
  const category = elements.categoryFilter.value;

  return templates.filter((template) => {
    const matchesCategory = !category || template.category === category;
    const haystack = normalizeText(`${template.title} ${template.category} ${template.content}`);
    return matchesCategory && (!keyword || haystack.includes(keyword));
  });
}

function renderTemplateList() {
  const filteredTemplates = getFilteredTemplates();
  elements.templateCount.textContent = `${templates.length} template`;
  elements.templateList.innerHTML = "";

  if (!filteredTemplates.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Template tidak ditemukan";
    elements.templateList.append(empty);
    return;
  }

  filteredTemplates.forEach((template) => {
    elements.templateList.append(createTemplateCard(template));
  });
}

function createTemplateCard(template) {
  const card = document.createElement("article");
  card.className = "template-card";

  const header = document.createElement("header");
  const titleBlock = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "template-title";
  title.textContent = template.title;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = template.category;

  titleBlock.append(title, badge);

  const quickActions = document.createElement("div");
  quickActions.className = "card-actions";

  const editButton = createButton("Edit", "secondary", () => openEditor(template));
  const deleteButton = createButton("Hapus", "secondary", () => deleteTemplate(template.id));
  quickActions.append(editButton, deleteButton);
  header.append(titleBlock, quickActions);

  const content = document.createElement("p");
  content.className = "template-content";
  content.textContent = template.content;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  actions.append(
    createButton("Copy", "secondary", () => handleTemplateAction(template, "copy")),
    createButton("Insert ke Chat", "", () => handleTemplateAction(template, "insert")),
    createButton("Variabel", "secondary", () => openVariablePanel(template))
  );

  card.append(header, content, actions);
  return card;
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;

  if (className) {
    button.className = className;
  }

  button.addEventListener("click", onClick);
  return button;
}

function openEditor(template = null, contentFromDraft = "") {
  elements.editorPanel.classList.remove("hidden");
  elements.editorTitle.textContent = template ? "Edit Template" : "Tambah Template";
  elements.templateId.value = template ? template.id : "";
  elements.titleInput.value = template ? template.title : "";
  elements.categoryInput.value = template ? template.category : "Custom";
  elements.contentInput.value = template ? template.content : contentFromDraft;
  elements.titleInput.focus();
}

function closeEditor() {
  elements.editorPanel.classList.add("hidden");
  elements.templateForm.reset();
  elements.templateId.value = "";
}

async function handleTemplateSubmit(event) {
  event.preventDefault();

  const input = {
    title: elements.titleInput.value,
    category: elements.categoryInput.value,
    content: elements.contentInput.value
  };
  const error = validateTemplateInput(input);

  if (error) {
    showStatus(error, "error");
    return;
  }

  const editingId = elements.templateId.value;
  const now = new Date().toISOString();

  if (editingId) {
    templates = templates.map((template) => {
      if (template.id !== editingId) {
        return template;
      }

      return {
        ...template,
        title: input.title.trim(),
        category: input.category.trim(),
        content: input.content.trim(),
        updatedAt: now
      };
    });
  } else {
    templates = [createTemplate(input), ...templates];
  }

  await persistTemplatesAndCategories();
  closeEditor();
  render();
  showStatus("Template berhasil disimpan", "success");
}

async function deleteTemplate(id) {
  const template = templates.find((item) => item.id === id);

  if (!template || !confirm(`Hapus template "${template.title}"?`)) {
    return;
  }

  templates = templates.filter((item) => item.id !== id);
  await saveTemplates(templates);
  renderTemplateList();
  showStatus("Template berhasil dihapus", "success");
}

async function persistTemplatesAndCategories() {
  const nextCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories, ...templates.map((item) => item.category)]));
  categories = nextCategories;
  await Promise.all([saveTemplates(templates), saveCategories(categories)]);
}

function saveDraftAsTemplate() {
  const content = elements.draftInput.value.trim();

  if (!content) {
    showStatus("Isi template tidak boleh kosong", "error");
    return;
  }

  openEditor(null, content);
}

async function handleTemplateAction(template, action) {
  const variables = extractVariables(template.content);

  if (variables.length) {
    openVariablePanel(template, action);
    return;
  }

  if (action === "copy") {
    await copyText(template.content);
  } else {
    await insertText(template.content);
  }
}

function openVariablePanel(template, pendingAction = "") {
  selectedTemplate = template;
  variableValues = {};
  elements.variablePanel.dataset.pendingAction = pendingAction;
  elements.variablePanel.classList.remove("hidden");
  elements.variableFields.innerHTML = "";

  const variables = extractVariables(template.content);

  variables.forEach((variable) => {
    const label = document.createElement("label");
    label.textContent = variable;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Isi ${variable}`;
    input.addEventListener("input", () => {
      variableValues[variable] = input.value;
      updatePreview();
    });

    label.append(input);
    elements.variableFields.append(label);
  });

  updatePreview();

  const firstInput = elements.variableFields.querySelector("input");
  if (firstInput) {
    firstInput.focus();
  }
}

function updatePreview() {
  if (!selectedTemplate) {
    elements.previewOutput.value = "";
    return;
  }

  elements.previewOutput.value = renderTemplate(selectedTemplate.content, variableValues);
}

function clearVariablePanel() {
  selectedTemplate = null;
  variableValues = {};
  elements.variablePanel.classList.add("hidden");
  elements.variableFields.innerHTML = "";
  elements.previewOutput.value = "";
}

async function copyText(text) {
  const finalText = String(text || "").trim();

  if (!finalText) {
    showStatus("Isi template tidak boleh kosong", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(finalText);
    showStatus("Template berhasil disalin", "success");
  } catch (error) {
    showStatus("Gagal menyalin template", "error");
  }
}

async function insertText(text) {
  const finalText = String(text || "").trim();

  if (!finalText) {
    showStatus("Isi template tidak boleh kosong", "error");
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showStatus("Tab aktif tidak ditemukan", "error");
      return;
    }

    let response = await sendInsertMessage(tab.id, finalText);

    if (!response && tab.url && tab.url.includes("shopee.co.id")) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      response = await sendInsertMessage(tab.id, finalText);
    }

    if (!response || !response.ok) {
      showStatus(response && response.error ? response.error : "Kolom chat Shopee tidak ditemukan. Pastikan halaman chat sedang terbuka.", "error");
      return;
    }

    showStatus("Template berhasil dimasukkan ke chat", "success");
  } catch (error) {
    showStatus("Kolom chat Shopee tidak ditemukan. Pastikan halaman chat sedang terbuka.", "error");
  }
}

async function sendInsertMessage(tabId, text) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "INSERT_TEMPLATE",
      text,
      mode: elements.insertMode.value
    });
  } catch (error) {
    return null;
  }
}

async function handleInsertModeChange() {
  await saveSettings({
    insertMode: elements.insertMode.value,
    autoSend: false
  });
  showStatus("Pengaturan insert disimpan", "success");
}

function exportTemplates() {
  const payload = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    templates
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `shopee-chat-templates-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showStatus("Export template berhasil", "success");
}

async function importTemplates(event) {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const importedTemplates = Array.isArray(payload) ? payload : payload.templates;

    if (!Array.isArray(importedTemplates)) {
      throw new Error("Invalid template payload");
    }

    const validTemplates = importedTemplates.map((template) => {
      const error = validateTemplateInput(template);
      if (error) {
        throw new Error(error);
      }

      return createTemplate({
        ...template,
        id: template.id || createId()
      });
    });

    const existingIds = new Set(templates.map((template) => template.id));
    const mergedTemplates = validTemplates.map((template) => (
      existingIds.has(template.id)
        ? { ...template, id: createId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : template
    ));

    templates = [...mergedTemplates, ...templates];
    await persistTemplatesAndCategories();
    render();
    showStatus("Import template berhasil", "success");
  } catch (error) {
    showStatus("Format file template tidak valid", "error");
  }
}

function showStatus(message, type = "") {
  window.clearTimeout(statusTimer);
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status ${type}`.trim();

  statusTimer = window.setTimeout(() => {
    elements.statusMessage.textContent = "";
    elements.statusMessage.className = "status";
  }, 3200);
}
