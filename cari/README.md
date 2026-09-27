# Shopee Seller Resi Chat Helper

Extension Chrome/Brave (Manifest V3) untuk mempercepat alur operator seller Shopee:
scan resi → buka chat buyer → kembali fokus ke input resi.

## Struktur

```text
├── manifest.json
├── src/
│   ├── shared/
│   │   ├── constants.js      # STORAGE_KEYS, DEFAULT_SETTINGS, STATES, STATUS_LABELS
│   │   └── storage.js        # wrapper promise chrome.storage.local
│   ├── content/
│   │   ├── selectors.js      # SEMUA selector DOM terpusat di sini
│   │   ├── dom-utils.js      # helper DOM murni (tanpa state)
│   │   ├── logger.js         # log lokal (factory)
│   │   ├── flow.js           # state + alur runResiChatFlow
│   │   └── content.js        # entry: init, message, shortcut, SPA
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── background/
│       └── service-worker.js # teruskan chrome.commands Alt+R
├── icons/
└── README.md
```

Aturan ubah kode:

- DOM Shopee berubah → edit `src/content/selectors.js` saja.
- Delay/timeout → `src/shared/constants.js` (`DEFAULT_SETTINGS`), bisa juga diubah user via popup (tersimpan di `chrome.storage.local`).
- Jangan tambah fetch ke server eksternal; semua data lokal.

## Cara pasang (unpacked)

1. Buka `chrome://extensions`, aktifkan Developer mode.
2. Load unpacked → pilih folder ini.
3. Buka `https://seller.shopee.co.id/`, pastikan input resi auto-fokus.

## Alur & shortcut

- Scan resi + `Enter` → flow jalan otomatis.
- `Alt+R` (custom di `chrome://extensions/shortcuts`) → fokus input resi.
- Popup: Fokus Resi / Jalankan Flow / Retry / Refresh + setting delay + log.

## Verifikasi cepat

```powershell
node --check src/shared/constants.js
node --check src/shared/storage.js
node --check src/content/selectors.js
node --check src/content/dom-utils.js
node --check src/content/logger.js
node --check src/content/flow.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/service-worker.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest OK')"
```
