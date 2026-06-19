chrome.runtime.onInstalled.addListener(() => {
  const defaultCategories = [
    "Konfirmasi Pesanan",
    "Desain",
    "Pengiriman",
    "Follow-up",
    "Komplain",
    "Closing",
    "Custom"
  ];
  const starterTemplates = [
    {
      title: "Konfirmasi Pesanan",
      category: "Konfirmasi Pesanan",
      content: "Halo kak, pesanan kakak sudah kami terima ya. Mohon ditunggu, pesanan akan segera kami proses sesuai antrean. Terima kasih."
    },
    {
      title: "Minta Catatan Desain",
      category: "Desain",
      content: "Halo kak, untuk proses desain mohon kirimkan catatan nama/tulisan yang ingin dicantumkan ya. Jika tidak ada catatan, kami akan proses sesuai default toko. Terima kasih."
    },
    {
      title: "Desain Diproses",
      category: "Desain",
      content: "Halo kak, desain pesanan kakak sedang kami proses ya. Jika sudah selesai, akan kami lanjutkan ke tahap produksi/pengemasan. Terima kasih sudah menunggu."
    },
    {
      title: "Pesanan Dikirim",
      category: "Pengiriman",
      content: "Halo kak, pesanan kakak sudah kami kirim ya. Mohon ditunggu update dari pihak ekspedisi. Terima kasih sudah berbelanja di toko kami."
    },
    {
      title: "Pesanan Tanpa Catatan",
      category: "Konfirmasi Pesanan",
      content: "Halo kak, karena tidak ada catatan khusus pada pesanan, kami akan proses sesuai format default toko ya. Terima kasih."
    },
    {
      title: "Follow-up Desain",
      category: "Follow-up",
      content: "Halo kak, kami izin follow-up ya. Mohon konfirmasi desain/pesanan agar bisa segera kami lanjutkan ke proses berikutnya. Terima kasih."
    }
  ];

  chrome.storage.local.get(["chat_templates", "template_categories", "app_settings"], (data) => {
    const updates = {};

    if (!Array.isArray(data.chat_templates)) {
      updates.chat_templates = starterTemplates.map((template) => {
        const now = new Date().toISOString();
        const id = globalThis.crypto && globalThis.crypto.randomUUID
          ? `tpl_${globalThis.crypto.randomUUID()}`
          : `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        return {
          id,
          ...template,
          createdAt: now,
          updatedAt: now
        };
      });
    }

    if (!Array.isArray(data.template_categories)) {
      updates.template_categories = defaultCategories;
    }

    if (!data.app_settings) {
      updates.app_settings = {
        insertMode: "replace",
        autoSend: false
      };
    }

    if (Object.keys(updates).length) {
      chrome.storage.local.set(updates);
    }
  });
});

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== "open-template-palette") {
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id || !tab.url || !tab.url.includes("shopee.co.id")) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { type: "OPEN_TEMPLATE_PALETTE" });
    } catch (error) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      await chrome.tabs.sendMessage(tab.id, { type: "OPEN_TEMPLATE_PALETTE" });
    }
  });
}
