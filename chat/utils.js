const DEFAULT_CATEGORIES = [
  "Konfirmasi Pesanan",
  "Desain",
  "Pengiriman",
  "Follow-up",
  "Komplain",
  "Closing",
  "Custom"
];

const STARTER_TEMPLATES = [
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

function createId(prefix = "tpl") {
  if (globalThis.crypto && globalThis.crypto.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createTemplate(template) {
  const now = new Date().toISOString();

  return {
    id: template.id || createId(),
    title: template.title.trim(),
    category: template.category.trim(),
    content: template.content.trim(),
    createdAt: template.createdAt || now,
    updatedAt: now
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function extractVariables(content) {
  const variables = new Set();
  const matches = String(content || "").matchAll(/\{([a-zA-Z0-9_ -]+)\}/g);

  for (const match of matches) {
    const name = match[1].trim();
    if (name) {
      variables.add(name);
    }
  }

  return Array.from(variables);
}

function renderTemplate(content, values) {
  return String(content || "").replace(/\{([a-zA-Z0-9_ -]+)\}/g, (match, variable) => {
    const key = variable.trim();
    return values[key] || match;
  });
}

function validateTemplateInput({ title, category, content }) {
  if (!title || !title.trim()) {
    return "Nama template wajib diisi";
  }

  if (title.trim().length > 80) {
    return "Nama template maksimal 80 karakter";
  }

  if (!category || !category.trim()) {
    return "Kategori wajib diisi";
  }

  if (!content || !content.trim()) {
    return "Isi template tidak boleh kosong";
  }

  if (content.trim().length > 3000) {
    return "Isi template maksimal 3000 karakter";
  }

  return "";
}
