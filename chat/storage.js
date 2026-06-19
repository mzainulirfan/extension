const STORAGE_KEYS = {
  templates: "chat_templates",
  categories: "template_categories",
  settings: "app_settings"
};

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

function storageSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

async function initializeStorage() {
  const data = await storageGet([
    STORAGE_KEYS.templates,
    STORAGE_KEYS.categories,
    STORAGE_KEYS.settings
  ]);

  const updates = {};

  if (!Array.isArray(data[STORAGE_KEYS.templates])) {
    updates[STORAGE_KEYS.templates] = STARTER_TEMPLATES.map(createTemplate);
  }

  if (!Array.isArray(data[STORAGE_KEYS.categories])) {
    updates[STORAGE_KEYS.categories] = DEFAULT_CATEGORIES;
  }

  if (!data[STORAGE_KEYS.settings]) {
    updates[STORAGE_KEYS.settings] = {
      insertMode: "replace",
      autoSend: false
    };
  }

  if (Object.keys(updates).length) {
    await storageSet(updates);
  }
}

async function getTemplates() {
  const data = await storageGet([STORAGE_KEYS.templates]);
  return Array.isArray(data[STORAGE_KEYS.templates]) ? data[STORAGE_KEYS.templates] : [];
}

async function saveTemplates(templates) {
  await storageSet({
    [STORAGE_KEYS.templates]: templates
  });
}

async function getCategories() {
  const data = await storageGet([STORAGE_KEYS.categories]);
  return Array.isArray(data[STORAGE_KEYS.categories]) ? data[STORAGE_KEYS.categories] : DEFAULT_CATEGORIES;
}

async function saveCategories(categories) {
  const uniqueCategories = Array.from(new Set(categories.filter(Boolean).map((item) => item.trim())));
  await storageSet({
    [STORAGE_KEYS.categories]: uniqueCategories
  });
}

async function getSettings() {
  const data = await storageGet([STORAGE_KEYS.settings]);
  return {
    insertMode: "replace",
    autoSend: false,
    ...(data[STORAGE_KEYS.settings] || {})
  };
}

async function saveSettings(settings) {
  await storageSet({
    [STORAGE_KEYS.settings]: {
      insertMode: settings.insertMode === "append" ? "append" : "replace",
      autoSend: false
    }
  });
}
