# PRD — Extension Brave/Chrome: Cari Resi & Buka Chat Buyer Shopee Seller

## 1. Ringkasan Produk

Extension ini dibuat untuk membantu seller Shopee mempercepat proses pencarian pesanan berdasarkan nomor resi, membuka chat buyer dari hasil pesanan, memastikan sidebar chat terbuka, lalu mengembalikan fokus ke field input resi agar operator bisa langsung scan/resi berikutnya.

Target utama extension adalah mengurangi klik manual berulang saat operator melakukan follow-up buyer dari halaman Seller Shopee, khususnya pada alur:

1. Operator scan / input nomor resi pada field pencarian resi.
2. Extension membantu memastikan input aktif.
3. Operator / sistem membuka hasil pesanan.
4. Extension menekan tombol chat buyer.
5. Extension mendeteksi apakah sidebar chat sudah terbuka.
6. Jika sidebar terbuka, chat buyer dibuka / difokuskan.
7. Fokus dikembalikan ke input resi untuk proses berikutnya.

## 2. Latar Belakang Masalah

Saat ini operator perlu melakukan beberapa langkah manual:

- Klik field input resi.
- Input atau scan nomor resi.
- Klik tombol chat buyer.
- Memastikan panel/sidebar chat terbuka.
- Memilih/membuka chat buyer.
- Kembali lagi ke field input resi untuk memproses pesanan berikutnya.

Alur ini berulang dan rawan memperlambat kerja, terutama ketika jumlah pesanan banyak.

## 3. Tujuan

### 3.1 Tujuan Utama

Membuat extension browser untuk Brave/Chrome yang dapat mempercepat proses pencarian resi dan pembukaan chat buyer pada halaman Seller Shopee.

### 3.2 Tujuan Operasional

- Mengurangi jumlah klik manual operator.
- Membuat alur kerja lebih cepat untuk proses follow-up buyer.
- Menjaga fokus kerja operator tetap pada input resi.
- Mengurangi risiko salah klik pada halaman Shopee Seller.
- Membuat alur bisa digunakan dengan scanner barcode/keyboard wedge.

## 4. Ruang Lingkup

### 4.1 In Scope

Fitur yang termasuk dalam versi awal:

- Content script aktif pada halaman Seller Shopee.
- Deteksi field input resi berdasarkan placeholder `Masukkan no. resi jasa kirim`.
- Fokus otomatis ke field input resi.
- Deteksi tombol chat buyer berdasarkan selector `data-testid="buyer-chat-action"` atau class terkait.
- Klik tombol chat buyer.
- Deteksi apakah sidebar chat terbuka.
- Deteksi daftar chat pada sidebar.
- Membuka/memfokuskan chat buyer bila sidebar chat tersedia.
- Mengembalikan fokus ke field input resi setelah chat terbuka.
- Menyediakan log status sederhana untuk debugging.
- Menyediakan konfigurasi delay/waktu tunggu antar langkah.

### 4.2 Out of Scope Versi Awal

Fitur berikut tidak termasuk versi awal:

- Mengirim pesan otomatis ke buyer.
- Membaca isi percakapan buyer.
- Integrasi API resmi Shopee.
- Penyimpanan database eksternal.
- Login otomatis Shopee.
- Bypass captcha, proteksi, atau mekanisme keamanan Shopee.
- Multi-akun Shopee otomatis.
- Web dashboard terpisah.
- Sinkronisasi cloud.
- Otomasi yang melanggar aturan platform.

## 5. Target Pengguna

### 5.1 Primary User

Operator toko / admin seller Shopee yang bertugas mencari pesanan dan membuka chat buyer berdasarkan resi.

### 5.2 Secondary User

Owner toko yang ingin mempercepat workflow operasional dan mengurangi kesalahan manual.

## 6. Platform

- Browser: Brave dan Google Chrome.
- Extension Manifest: Manifest V3.
- Target halaman: Shopee Seller Center / halaman pesanan yang memiliki input resi dan tombol chat buyer.
- OS: Windows 10/11.
- Input device: Keyboard manual atau barcode scanner yang bertindak sebagai keyboard input.

## 7. Asumsi Teknis

- Barcode scanner mengirimkan nomor resi ke field input seperti input keyboard biasa.
- Setelah scan, scanner dapat dikonfigurasi menambahkan tombol `Enter`.
- Struktur DOM Shopee dapat berubah sewaktu-waktu, sehingga selector harus dibuat fleksibel.
- Extension hanya bekerja di halaman Seller Shopee yang sudah login.
- Extension tidak memakai API internal Shopee yang tidak terdokumentasi.
- Extension hanya melakukan interaksi DOM seperti klik, fokus input, dan pengecekan elemen.

## 8. Referensi Elemen DOM

### 8.1 Field Input Resi

Elemen input utama memiliki placeholder:

```html
<input placeholder="Masukkan no. resi jasa kirim" class="eds-input__input">
```

Selector prioritas:

```js
input[placeholder="Masukkan no. resi jasa kirim"]
```

Fallback selector:

```js
input.eds-input__input
```

Catatan: fallback harus dipakai hati-hati karena class `eds-input__input` bisa digunakan oleh input lain.

### 8.2 Tombol Chat Buyer

Elemen tombol chat buyer memiliki atribut:

```html
<div class="buyer-chat-action" data-testid="buyer-chat-action"></div>
```

Selector prioritas:

```js
[data-testid="buyer-chat-action"]
```

Fallback selector:

```js
.buyer-chat-action
```

### 8.3 Sidebar Chat

Indikator sidebar chat terbuka dapat dilihat dari keberadaan elemen pencarian chat dengan placeholder:

```html
<input class="shopee-react-input__input" placeholder="Cari nama">
```

Selector prioritas:

```js
input[placeholder="Cari nama"].shopee-react-input__input
```

Selector pendukung:

```js
#infinite-list
.ReactVirtualized__Grid
```

### 8.4 Item Chat

Item chat dalam sidebar muncul dalam list virtualized dengan class seperti:

```html
.AxOomp7jNy.eaXBbcCrTd
```

Selector awal:

```js
.AxOomp7jNy.eaXBbcCrTd
```

Catatan: selector ini berisiko berubah. Perlu fallback berbasis struktur list, bukan hanya class acak.

## 9. Alur User

### 9.1 Alur Normal

1. User membuka halaman Seller Shopee yang memiliki input resi.
2. Extension aktif otomatis.
3. Extension mendeteksi field input resi.
4. Extension memberi fokus pada input resi.
5. User scan atau mengetik nomor resi.
6. Setelah user menekan `Enter`, extension menunggu hasil pesanan muncul.
7. Extension mencari tombol chat buyer.
8. Extension klik tombol chat buyer.
9. Extension menunggu sidebar chat terbuka.
10. Extension mendeteksi sidebar chat.
11. Extension membuka / memfokuskan chat buyer terkait.
12. Extension mengembalikan fokus ke input resi.
13. User dapat scan resi berikutnya.

### 9.2 Alur Manual Trigger

1. User klik tombol extension di toolbar.
2. Popup extension muncul.
3. User klik tombol `Aktifkan Fokus Resi`.
4. Extension fokus ke input resi.
5. User scan nomor resi.
6. Extension menjalankan flow sesuai alur normal.

### 9.3 Alur Jika Sidebar Belum Terbuka

1. Extension klik tombol chat buyer.
2. Extension menunggu sidebar chat selama batas waktu tertentu.
3. Jika sidebar tidak muncul, extension menampilkan status error.
4. Extension tidak mengulang klik terus-menerus tanpa batas.
5. User dapat menekan tombol retry dari popup extension.

## 10. Kebutuhan Fungsional

### FR-001 — Deteksi Halaman Seller Shopee

Extension harus hanya aktif pada domain Shopee Seller yang relevan.

Acceptance Criteria:

- Extension tidak aktif di website umum.
- Extension aktif pada halaman Seller Shopee yang mengandung field input resi.
- Jika field input resi tidak ditemukan, extension menampilkan status `Input resi tidak ditemukan`.

### FR-002 — Fokus ke Input Resi

Extension harus dapat mengaktifkan/fokus ke field input resi.

Acceptance Criteria:

- Saat halaman selesai dimuat, input resi otomatis difokuskan jika ditemukan.
- Jika user menekan shortcut tertentu, input resi kembali difokuskan.
- Fokus tidak berpindah jika user sedang mengetik di area chat, kecuali flow sudah selesai dan sistem harus kembali ke input resi.

Rekomendasi shortcut:

```text
Alt + R = fokus ke input resi
```

### FR-003 — Input Resi dari Scanner

Extension harus mendukung input dari barcode scanner yang bertindak sebagai keyboard.

Acceptance Criteria:

- Nomor resi masuk ke input.
- Setelah scanner mengirim `Enter`, extension menjalankan flow.
- Extension tidak menghapus isi input sebelum proses selesai.
- Nomor resi dengan panjang maksimal 50 karakter tetap diterima sesuai batas field.

### FR-004 — Deteksi Tombol Chat Buyer

Extension harus mencari tombol chat buyer setelah pencarian resi/pesanan.

Acceptance Criteria:

- Extension menemukan tombol dengan selector `[data-testid="buyer-chat-action"]`.
- Jika selector utama gagal, extension mencoba `.buyer-chat-action`.
- Jika tombol tidak ditemukan dalam batas waktu, tampil status `Tombol chat buyer tidak ditemukan`.

### FR-005 — Klik Tombol Chat Buyer

Extension harus dapat melakukan klik pada tombol chat buyer.

Acceptance Criteria:

- Klik dilakukan satu kali per resi.
- Jika klik gagal, extension memberi status error.
- Extension tidak menjalankan klik berulang yang berisiko membuka chat berkali-kali.

### FR-006 — Deteksi Sidebar Chat Terbuka

Extension harus mengecek apakah sidebar chat sudah terbuka.

Acceptance Criteria:

- Sidebar dianggap terbuka jika input `Cari nama` ditemukan.
- Sidebar dianggap terbuka jika elemen `#infinite-list` atau list chat ditemukan.
- Timeout default: 5 detik.
- Timeout dapat dikonfigurasi di popup.

### FR-007 — Buka / Fokus Chat Buyer

Jika sidebar chat sudah terbuka, extension harus memfokuskan chat buyer yang muncul.

Acceptance Criteria:

- Extension mendeteksi item chat yang aktif atau item chat pertama yang relevan.
- Extension klik item chat bila diperlukan.
- Jika chat sudah aktif, extension tidak melakukan klik ulang.
- Jika item chat tidak ditemukan, extension memberi status `Item chat tidak ditemukan`.

### FR-008 — Kembali Fokus ke Input Resi

Setelah chat buyer terbuka, extension harus kembali mengaktifkan field input resi.

Acceptance Criteria:

- Input resi kembali fokus setelah flow selesai.
- Delay default sebelum refocus: 300–700 ms.
- Jika input resi hilang, extension menampilkan status error.

### FR-009 — Popup Extension

Extension harus memiliki popup sederhana.

Isi popup:

- Status extension: Aktif / Tidak aktif.
- Tombol `Fokus Input Resi`.
- Tombol `Jalankan Flow Sekarang`.
- Tombol `Retry`.
- Pengaturan delay:
  - Delay setelah scan.
  - Timeout cari tombol chat.
  - Timeout tunggu sidebar.
  - Delay refocus input.
- Toggle debug log.

Acceptance Criteria:

- Popup dapat menjalankan flow manual.
- Popup menampilkan status terakhir.
- Setting tersimpan di `chrome.storage.local`.

### FR-010 — Debug Log

Extension harus menyediakan log sederhana untuk troubleshooting.

Data log:

- Waktu proses.
- Resi terakhir.
- Status langkah.
- Error terakhir.
- Selector yang berhasil/gagal.

Acceptance Criteria:

- Debug log bisa diaktifkan/nonaktifkan.
- Log tidak menyimpan data sensitif percakapan buyer.
- Log hanya disimpan lokal di browser.

## 11. Kebutuhan Non-Fungsional

### 11.1 Performance

- Extension tidak boleh membuat halaman Shopee lambat.
- Observer DOM harus dibatasi.
- Polling harus menggunakan timeout dan interval wajar.
- Hindari loop tanpa batas.

### 11.2 Reliability

- Harus tahan terhadap delay loading Shopee.
- Harus ada retry terbatas.
- Harus ada fallback selector.
- Harus ada status jelas ketika elemen tidak ditemukan.

### 11.3 Security & Privacy

- Tidak mengambil password, cookie, token, atau data login.
- Tidak mengirim data ke server eksternal.
- Semua setting dan log disimpan lokal.
- Tidak membaca isi chat kecuali nanti dibutuhkan dan disetujui sebagai fitur lanjutan.
- Tidak melakukan bypass sistem keamanan Shopee.

### 11.4 Maintainability

- Selector DOM dipusatkan dalam satu file konfigurasi.
- Delay dan timeout dapat diubah tanpa mengubah banyak kode.
- Flow automation harus dipisah per modul:
  - DOM finder.
  - Action runner.
  - State manager.
  - Popup controller.
  - Logger.

## 12. Arsitektur Teknis

### 12.1 Struktur Extension

```text
shopee-resi-chat-extension/
├── manifest.json
├── src/
│   ├── content/
│   │   ├── content.js
│   │   ├── selectors.js
│   │   ├── flow.js
│   │   ├── dom-utils.js
│   │   └── logger.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── background/
│   │   └── service-worker.js
│   └── shared/
│       ├── constants.js
│       └── storage.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### 12.2 Manifest V3

Contoh permission:

```json
{
  "manifest_version": 3,
  "name": "Shopee Resi Chat Helper",
  "version": "1.0.0",
  "description": "Membantu fokus input resi dan membuka chat buyer di Shopee Seller.",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://seller.shopee.co.id/*",
    "https://*.shopee.co.id/*"
  ],
  "action": {
    "default_popup": "src/popup/popup.html"
  },
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://seller.shopee.co.id/*",
        "https://*.shopee.co.id/*"
      ],
      "js": ["src/content/content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

## 13. State Machine

Extension sebaiknya memakai state agar tidak klik berulang.

```text
IDLE
  ↓
FOCUS_RESI_INPUT
  ↓
WAITING_RESI_ENTER
  ↓
WAITING_ORDER_RESULT
  ↓
FIND_CHAT_BUTTON
  ↓
CLICK_CHAT_BUTTON
  ↓
WAIT_CHAT_SIDEBAR
  ↓
OPEN_CHAT_ITEM
  ↓
REFOCUS_RESI_INPUT
  ↓
DONE
  ↓
IDLE
```

Error state:

```text
ERROR_INPUT_NOT_FOUND
ERROR_CHAT_BUTTON_NOT_FOUND
ERROR_SIDEBAR_NOT_FOUND
ERROR_CHAT_ITEM_NOT_FOUND
ERROR_TIMEOUT
```

## 14. Detail Algoritma Flow

### 14.1 Saat Halaman Dibuka

```text
1. Tunggu DOM siap.
2. Cari input resi.
3. Jika ditemukan:
   - Fokus input.
   - Pasang event listener keydown Enter.
4. Jika tidak ditemukan:
   - Tampilkan status error.
```

### 14.2 Saat Enter dari Input Resi

```text
1. Ambil value input resi.
2. Validasi value tidak kosong.
3. Tunggu hasil pesanan muncul.
4. Cari tombol chat buyer.
5. Klik tombol chat buyer.
6. Tunggu sidebar chat muncul.
7. Jika sidebar terbuka, cari item chat buyer.
8. Klik/fokus chat buyer.
9. Tunggu sebentar.
10. Fokus kembali ke input resi.
```

### 14.3 Utility Wait Element

```js
async function waitForElement(selector, timeout = 5000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const element = document.querySelector(selector);

      if (element) {
        clearInterval(timer);
        resolve(element);
      }

      if (Date.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error(`Element not found: ${selector}`));
      }
    }, 100);
  });
}
```

## 15. Selector Strategy

Karena class Shopee sering berupa hash/random, gunakan selector prioritas:

1. Attribute yang stabil:
   - `placeholder`
   - `data-testid`
   - `aria-label`
   - `role`
2. Struktur DOM yang relatif stabil.
3. Class sebagai fallback terakhir.

### Selector Config

```js
export const SELECTORS = {
  resiInput: [
    'input[placeholder="Masukkan no. resi jasa kirim"]',
    'input.eds-input__input'
  ],
  chatButton: [
    '[data-testid="buyer-chat-action"]',
    '.buyer-chat-action'
  ],
  chatSidebarSearch: [
    'input[placeholder="Cari nama"].shopee-react-input__input',
    'input[placeholder="Cari nama"]'
  ],
  chatList: [
    '#infinite-list',
    '.ReactVirtualized__Grid'
  ],
  chatItem: [
    '.AxOomp7jNy.eaXBbcCrTd'
  ]
};
```

## 16. UI Popup

### 16.1 Layout Popup

```text
Shopee Resi Chat Helper

Status:
[ Aktif / Error / Menunggu ]

Aksi:
[ Fokus Input Resi ]
[ Jalankan Flow Sekarang ]
[ Retry ]

Setting:
Delay setelah scan: [500 ms]
Timeout tombol chat: [5000 ms]
Timeout sidebar chat: [5000 ms]
Delay refocus: [500 ms]

Debug:
[ ] Aktifkan Debug Log

Log Terakhir:
- Input ditemukan
- Resi diterima
- Tombol chat diklik
- Sidebar chat terbuka
- Fokus kembali ke input resi
```

### 16.2 Status yang Ditampilkan

- `Aktif`
- `Menunggu input resi`
- `Mencari tombol chat`
- `Membuka chat buyer`
- `Sidebar chat terbuka`
- `Kembali ke input resi`
- `Selesai`
- `Error: input resi tidak ditemukan`
- `Error: tombol chat tidak ditemukan`
- `Error: sidebar chat tidak terbuka`

## 17. Validasi

### 17.1 Validasi Input Resi

- Tidak boleh kosong.
- Panjang maksimal mengikuti input Shopee: 50 karakter.
- Trim spasi di awal/akhir.
- Jangan ubah value asli jika Shopee membutuhkan format tertentu.

### 17.2 Validasi DOM

- Pastikan elemen visible sebelum klik.
- Pastikan elemen tidak disabled.
- Scroll ke elemen jika perlu.
- Gunakan native click event dan fallback mouse event bila perlu.

## 18. Error Handling

### 18.1 Input Resi Tidak Ditemukan

Solusi:

- Tampilkan status error.
- Sediakan tombol retry.
- User diminta membuka halaman pesanan yang benar.

### 18.2 Tombol Chat Buyer Tidak Ditemukan

Solusi:

- Tunggu sampai timeout.
- Retry maksimal 1–2 kali.
- Tampilkan error.
- Refocus input resi agar user bisa lanjut.

### 18.3 Sidebar Chat Tidak Terbuka

Solusi:

- Cek ulang tombol chat.
- Retry klik tombol chat maksimal 1 kali.
- Jika tetap gagal, tampilkan error.
- Jangan masuk infinite loop.

### 18.4 DOM Shopee Berubah

Solusi:

- Selector dikumpulkan di file `selectors.js`.
- Debug log mencatat selector gagal.
- Update selector tanpa mengubah core flow.

## 19. Acceptance Criteria Keseluruhan

Versi awal dianggap berhasil jika:

- Extension bisa aktif di Brave/Chrome.
- Extension bisa fokus ke input resi.
- Setelah scan/input resi dan Enter, extension bisa mencari tombol chat buyer.
- Extension bisa klik tombol chat buyer.
- Extension bisa mendeteksi sidebar chat terbuka.
- Extension bisa membuka/fokus chat buyer.
- Extension bisa kembali fokus ke input resi.
- Extension tidak melakukan klik berulang tanpa kontrol.
- Extension menampilkan status jika gagal.
- Extension tidak mengirim data ke server luar.
- Extension tetap bisa dipakai manual lewat popup.

## 20. Milestone Pengembangan

### Milestone 1 — Setup Extension

Target:

- Buat struktur project.
- Buat `manifest.json`.
- Inject content script ke halaman Shopee Seller.
- Buat popup dasar.

Deliverable:

- Extension bisa di-load unpacked di Brave/Chrome.
- Popup tampil.
- Content script bisa log status di console.

### Milestone 2 — Fokus Input Resi

Target:

- Deteksi input resi.
- Fokus otomatis ke input.
- Shortcut `Alt + R`.

Deliverable:

- Input resi aktif otomatis saat halaman dibuka.
- Tombol popup `Fokus Input Resi` bekerja.

### Milestone 3 — Trigger dari Enter

Target:

- Tangkap event `Enter` dari input resi.
- Validasi nomor resi.
- Jalankan flow awal.

Deliverable:

- Setelah scan resi + Enter, extension masuk proses mencari tombol chat.

### Milestone 4 — Klik Chat Buyer

Target:

- Deteksi tombol chat buyer.
- Klik tombol chat.
- Error handling jika tombol tidak ditemukan.

Deliverable:

- Tombol chat buyer berhasil diklik dari hasil pesanan.

### Milestone 5 — Deteksi Sidebar Chat

Target:

- Deteksi input `Cari nama`.
- Deteksi list chat.
- Pastikan sidebar terbuka.

Deliverable:

- Extension bisa mengetahui apakah sidebar chat terbuka.

### Milestone 6 — Refocus Input Resi

Target:

- Setelah chat terbuka, fokus kembali ke input resi.
- Tambahkan delay configurable.

Deliverable:

- Operator bisa langsung scan resi berikutnya tanpa klik manual.

### Milestone 7 — Hardening

Target:

- Tambah retry terbatas.
- Tambah debug log.
- Tambah setting delay.
- Perbaiki selector fallback.

Deliverable:

- Extension lebih stabil untuk penggunaan harian.

## 21. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---:|---|
| DOM Shopee berubah | Extension gagal menemukan elemen | Selector config terpusat dan fallback selector |
| Loading Shopee lambat | Flow gagal karena elemen belum muncul | Wait element + timeout configurable |
| Klik terlalu cepat | Sidebar tidak terbuka | Tambahkan delay dan retry terbatas |
| Salah elemen karena class mirip | Salah klik | Prioritaskan placeholder/data-testid |
| Scanner tidak mengirim Enter | Flow tidak jalan otomatis | Sediakan tombol manual dan shortcut |
| Shopee mengubah behavior chat | Flow gagal | Debug log dan update selector |
| Auto refocus mengganggu operator | User sedang mengetik chat | Cek active element dan state sebelum refocus |

## 22. Testing Plan

### 22.1 Test Case Utama

| ID | Skenario | Ekspektasi |
|---|---|---|
| TC-001 | Buka halaman pesanan Shopee | Extension aktif |
| TC-002 | Field resi tersedia | Input otomatis fokus |
| TC-003 | Scan resi + Enter | Flow dimulai |
| TC-004 | Tombol chat buyer tersedia | Tombol diklik |
| TC-005 | Sidebar chat terbuka | Sidebar terdeteksi |
| TC-006 | Chat item tersedia | Chat dibuka/fokus |
| TC-007 | Flow selesai | Fokus kembali ke input resi |
| TC-008 | Tombol chat tidak ada | Status error tampil |
| TC-009 | Sidebar tidak terbuka | Status error tampil dan flow berhenti |
| TC-010 | Tekan Alt + R | Fokus kembali ke input resi |

### 22.2 Test Case Edge

| ID | Skenario | Ekspektasi |
|---|---|---|
| TC-011 | Input resi kosong lalu Enter | Flow tidak berjalan |
| TC-012 | Halaman belum selesai loading | Extension menunggu elemen |
| TC-013 | Selector utama gagal | Fallback selector dicoba |
| TC-014 | Chat sudah terbuka sebelum flow | Extension mengenali sidebar sudah terbuka |
| TC-015 | User klik area chat manual | Extension tidak mengganggu sampai flow selesai |
| TC-016 | Resi berikutnya discan setelah flow | Input menerima resi baru |

## 23. Rekomendasi Implementasi Bertahap untuk Junior Developer

Urutan kerja paling aman:

1. Buat extension kosong Manifest V3.
2. Inject content script dan tampilkan `console.log`.
3. Buat fungsi `findResiInput()`.
4. Buat fungsi `focusResiInput()`.
5. Buat popup dengan tombol fokus input.
6. Tambah listener `keydown Enter`.
7. Buat fungsi `findChatButton()`.
8. Buat fungsi `clickChatButton()`.
9. Buat fungsi `isChatSidebarOpen()`.
10. Buat fungsi `waitForSidebar()`.
11. Buat fungsi `openChatItem()`.
12. Buat fungsi `runFlow()`.
13. Tambah state machine.
14. Tambah setting delay di popup.
15. Tambah debug log.
16. Uji di halaman Shopee asli.
17. Rapikan selector fallback.

## 24. Draft Pseudocode

```js
async function runResiChatFlow() {
  setState('FOCUS_RESI_INPUT');

  const input = findFirstElement(SELECTORS.resiInput);
  if (!input) {
    return fail('ERROR_INPUT_NOT_FOUND');
  }

  const resi = input.value.trim();
  if (!resi) {
    return fail('ERROR_EMPTY_RESI');
  }

  setState('FIND_CHAT_BUTTON');

  const chatButton = await waitForAnyElement(SELECTORS.chatButton, settings.chatButtonTimeout);
  if (!chatButton) {
    focusElement(input);
    return fail('ERROR_CHAT_BUTTON_NOT_FOUND');
  }

  setState('CLICK_CHAT_BUTTON');
  safeClick(chatButton);

  setState('WAIT_CHAT_SIDEBAR');

  const sidebar = await waitForAnyElement(
    [...SELECTORS.chatSidebarSearch, ...SELECTORS.chatList],
    settings.sidebarTimeout
  );

  if (!sidebar) {
    focusElement(input);
    return fail('ERROR_SIDEBAR_NOT_FOUND');
  }

  setState('OPEN_CHAT_ITEM');

  const chatItem = findFirstElement(SELECTORS.chatItem);
  if (chatItem && !isActiveChat(chatItem)) {
    safeClick(chatItem);
  }

  await sleep(settings.refocusDelay);

  setState('REFOCUS_RESI_INPUT');
  focusElement(input);

  setState('DONE');
}
```

## 25. Catatan Etika dan Kepatuhan

Extension ini sebaiknya dibatasi untuk membantu navigasi UI dan efisiensi internal operator. Hindari fitur yang:

- Mengirim pesan massal tanpa kontrol.
- Mengambil data buyer secara berlebihan.
- Melakukan scraping data sensitif.
- Menghindari proteksi keamanan platform.
- Melakukan tindakan yang melanggar ketentuan Shopee.

Jika nanti ingin menambahkan fitur kirim pesan otomatis, perlu dibuat PRD terpisah dengan kontrol manual, delay aman, template pesan, audit log, dan batasan penggunaan.

## 26. Definisi Done

Project dianggap selesai untuk versi 1.0 jika:

- Extension bisa dipasang sebagai unpacked extension di Brave/Chrome.
- Input resi otomatis fokus.
- Flow scan resi → buka chat buyer → kembali ke input resi berjalan stabil.
- Popup tersedia untuk manual action dan setting delay.
- Debug log tersedia.
- Error handling dasar tersedia.
- Selector tersimpan rapi dan mudah diubah.
- Tidak ada data yang dikirim ke server eksternal.
