# PRD — Brave Extension Copy Nomor Pesanan & Catatan Pembeli Shopee Seller

## 1. Ringkasan Produk

Extension Brave ini dibuat untuk membantu seller Shopee mengambil **Nomor Pesanan** dan **Catatan Pembeli** secara cepat dari halaman Seller Shopee.

Saat user mengarahkan kursor ke elemen tertentu di halaman pesanan Shopee, akan muncul tombol kecil bertuliskan **Copy**. Ketika tombol diklik, extension akan menyalin isi teks dari elemen tersebut ke clipboard.

Target awal:
- Ambil **Nomor Pesanan** dari elemen:
  ```html
  <span class="order-sn">No. Pesanan 260618CJVT82NE</span>
  ```
- Ambil **Catatan Pembeli** dari elemen:
  ```html
  <div class="order-comment-content order-comment-content-inline">
    <div class="comment-desc order-comment-desc-inline">
      <span>Alya Syafa Humaira</span>
    </div>
  </div>
  ```

Extension dibuat untuk browser **Brave**, tetapi secara teknis menggunakan standar **Chrome Extension Manifest V3**, sehingga juga dapat berjalan di Chrome, Edge, dan Chromium-based browser lain.

---

## 2. Tujuan Produk

### 2.1 Tujuan Utama

Mempercepat proses kerja seller saat mengambil data pesanan dari Seller Shopee tanpa perlu blok teks manual.

### 2.2 Masalah yang Ingin Diselesaikan

Saat ini seller perlu:
1. Mencari nomor pesanan.
2. Blok teks secara manual.
3. Copy teks.
4. Membersihkan teks yang tidak dibutuhkan jika ikut terseleksi.
5. Mengulangi proses untuk catatan pembeli.

Masalah:
- Lambat saat pesanan banyak.
- Rawan salah blok/copy.
- Teks yang tersalin bisa mengandung label tambahan.
- Tidak efisien untuk proses produksi, packing, atau input data ke sistem lain.

### 2.3 Solusi

Extension menambahkan tombol **Copy** otomatis ketika user hover di atas elemen:
- Nomor pesanan
- Catatan pembeli

Saat tombol diklik:
- Untuk nomor pesanan, extension menyalin hanya kode pesanan, contoh:
  ```text
  260618CJVT82NE
  ```
  Bukan:
  ```text
  No. Pesanan 260618CJVT82NE
  ```

- Untuk catatan pembeli, extension menyalin isi catatan, contoh:
  ```text
  Alya Syafa Humaira
  ```

---

## 3. Scope Produk

### 3.1 In Scope

Fitur yang termasuk pada versi awal:

1. Detect elemen nomor pesanan Shopee.
2. Detect elemen catatan pembeli Shopee.
3. Tampilkan tombol kecil **Copy** saat hover.
4. Copy isi teks ke clipboard.
5. Beri feedback setelah berhasil copy, misalnya tombol berubah menjadi **Copied!**.
6. Extension berjalan otomatis di halaman Seller Shopee.
7. Support halaman yang kontennya berubah dinamis tanpa reload penuh.
8. Tidak mengubah data atau melakukan aksi transaksi di Shopee.

### 3.2 Out of Scope

Tidak termasuk pada versi awal:

1. Login ke akun Shopee.
2. Mengirim chat otomatis.
3. Mengambil data dari API Shopee.
4. Menyimpan data pesanan ke database.
5. Export Excel/CSV.
6. Sinkronisasi cloud.
7. Auto klik tombol di Shopee.
8. Auto proses pesanan.
9. Integrasi WhatsApp.
10. Integrasi sistem internal toko.

---

## 4. Target User

### 4.1 User Utama

Seller Shopee yang sering membuka halaman pesanan dan perlu mengambil data:
- Nomor pesanan
- Catatan pembeli
- Nama custom
- Catatan produksi
- Informasi tambahan dari pembeli

### 4.2 Kondisi Penggunaan

Extension digunakan ketika:
- Admin sedang mengecek daftar pesanan.
- Tim produksi butuh mengambil nama/catatan pembeli.
- Tim packing butuh mengambil nomor pesanan.
- Seller ingin mempercepat copy data dari halaman Seller Shopee.

---

## 5. Platform

### 5.1 Browser

Prioritas:
- Brave Browser

Kompatibel:
- Google Chrome
- Microsoft Edge
- Chromium-based browser

### 5.2 Website Target

Extension hanya aktif di domain Seller Shopee.

Contoh match pattern:
```json
"https://seller.shopee.co.id/*"
```

Jika diperlukan, tambahkan:
```json
"https://seller.shopee.com/*"
"https://seller.shopee.co.id/*"
```

---

## 6. Struktur Data yang Diambil

### 6.1 Nomor Pesanan

#### Contoh HTML

```html
<div class="order-identifiers">
  <span class="order-sn">No. Pesanan 260618CJVT82NE</span>
</div>
```

#### Selector Awal

```css
.order-sn
```

#### Data Mentah

```text
No. Pesanan 260618CJVT82NE
```

#### Data yang Dicopy

```text
260618CJVT82NE
```

#### Aturan Parsing

Jika teks diawali dengan:

```text
No. Pesanan
```

maka hapus label tersebut dan ambil kode pesanan saja.

Contoh logic:

```js
const rawText = "No. Pesanan 260618CJVT82NE";
const orderNumber = rawText.replace("No. Pesanan", "").trim();
```

---

### 6.2 Catatan Pembeli

#### Contoh HTML

```html
<div class="order-comment-content order-comment-content-inline">
  <div class="comment-desc order-comment-desc-inline">
    <span>Alya Syafa Humaira</span>
  </div>
</div>
```

#### Selector Awal

```css
.order-comment-content .comment-desc span
```

atau:

```css
.order-comment-content-inline .order-comment-desc-inline span
```

#### Data Mentah

```text
Alya Syafa Humaira
```

#### Data yang Dicopy

```text
Alya Syafa Humaira
```

#### Aturan Parsing

Ambil teks apa adanya, lalu trim spasi.

```js
const buyerNote = element.innerText.trim();
```

---

## 7. User Flow

### 7.1 Copy Nomor Pesanan

1. User membuka halaman pesanan di Seller Shopee.
2. Extension otomatis mendeteksi elemen nomor pesanan.
3. User hover di atas teks nomor pesanan.
4. Muncul tombol kecil **Copy** di dekat elemen.
5. User klik tombol **Copy**.
6. Extension mengambil teks nomor pesanan.
7. Extension membersihkan label `No. Pesanan`.
8. Extension menyalin kode pesanan ke clipboard.
9. Tombol berubah menjadi **Copied!** selama ±1 detik.
10. Tombol kembali menjadi **Copy**.

### 7.2 Copy Catatan Pembeli

1. User membuka halaman pesanan di Seller Shopee.
2. Extension otomatis mendeteksi elemen catatan pembeli.
3. User hover di atas catatan pembeli.
4. Muncul tombol kecil **Copy**.
5. User klik tombol **Copy**.
6. Extension mengambil isi catatan.
7. Extension menyalin catatan ke clipboard.
8. Tombol berubah menjadi **Copied!** selama ±1 detik.
9. Tombol kembali menjadi **Copy**.

---

## 8. Functional Requirements

### FR-001 — Extension Aktif di Seller Shopee

Extension harus berjalan otomatis saat user membuka halaman Seller Shopee.

**Acceptance Criteria:**
- Extension aktif pada URL `seller.shopee.co.id`.
- Extension tidak aktif di website lain.
- Tidak perlu klik icon extension untuk mengaktifkan fitur.

---

### FR-002 — Detect Nomor Pesanan

Extension harus bisa mendeteksi elemen nomor pesanan berdasarkan selector `.order-sn`.

**Acceptance Criteria:**
- Elemen dengan class `.order-sn` dikenali sebagai target copy.
- Jika ada banyak pesanan dalam satu halaman, semua elemen `.order-sn` diberi fitur hover copy.
- Jika halaman berubah secara dinamis, elemen baru tetap terdeteksi.

---

### FR-003 — Copy Nomor Pesanan Bersih

Extension harus menyalin hanya kode nomor pesanan tanpa label.

**Acceptance Criteria:**
- Dari teks `No. Pesanan 260618CJVT82NE`, clipboard berisi `260618CJVT82NE`.
- Spasi di awal dan akhir dihapus.
- Jika format teks berubah, fallback-nya adalah copy teks asli yang sudah di-trim.

---

### FR-004 — Detect Catatan Pembeli

Extension harus bisa mendeteksi catatan pembeli.

**Selector utama:**

```css
.order-comment-content .comment-desc span
```

**Acceptance Criteria:**
- Elemen catatan pembeli dikenali.
- Jika catatan kosong, tombol Copy tidak perlu muncul.
- Jika ada banyak catatan di halaman, masing-masing catatan bisa dicopy sendiri.

---

### FR-005 — Tombol Copy Saat Hover

Extension harus menampilkan tombol **Copy** saat user hover di atas elemen target.

**Acceptance Criteria:**
- Tombol muncul saat mouse masuk ke area elemen.
- Tombol hilang saat mouse keluar dari area elemen dan tombol.
- Posisi tombol dekat dengan elemen yang sedang di-hover.
- Tombol tidak mengganggu layout asli halaman Shopee.

---

### FR-006 — Feedback Setelah Copy

Setelah copy berhasil, tombol berubah menjadi **Copied!** sementara.

**Acceptance Criteria:**
- Tombol berubah menjadi `Copied!`.
- Durasi feedback sekitar 1 detik.
- Setelah itu kembali menjadi `Copy`.
- Jika gagal copy, tampilkan teks `Failed`.

---

### FR-007 — Support Dynamic DOM Shopee

Shopee Seller menggunakan halaman dinamis. Extension harus mendeteksi elemen baru yang muncul setelah loading.

**Acceptance Criteria:**
- Gunakan `MutationObserver`.
- Elemen baru yang muncul setelah scroll, filter, pagination, atau navigasi internal tetap diproses.
- Elemen yang sudah diproses tidak dibuatkan event listener berulang.

---

### FR-008 — Tidak Mengubah Data Shopee

Extension hanya membaca teks dari halaman dan menyalin ke clipboard.

**Acceptance Criteria:**
- Extension tidak mengirim request transaksi.
- Extension tidak klik tombol Shopee secara otomatis.
- Extension tidak mengubah status pesanan.
- Extension tidak menyimpan data pesanan tanpa persetujuan user.

---

## 9. Non-Functional Requirements

### NFR-001 — Ringan

Extension harus ringan dan tidak memperlambat halaman Seller Shopee.

**Target:**
- Tidak memakai framework besar untuk versi awal.
- Gunakan JavaScript vanilla.
- Script hanya memproses elemen target.

---

### NFR-002 — Aman

Extension tidak boleh mengambil data sensitif di luar kebutuhan.

**Requirement:**
- Tidak ada tracking.
- Tidak ada analytics.
- Tidak ada pengiriman data ke server.
- Tidak membaca cookie.
- Tidak membaca localStorage Shopee.
- Tidak meminta permission berlebihan.

---

### NFR-003 — Stabil

Extension harus tetap berjalan walaupun Shopee melakukan sedikit perubahan class.

**Strategi:**
- Gunakan selector utama berbasis class saat ini.
- Tambahkan fallback berbasis teks `No. Pesanan`.
- Pisahkan logic detector agar mudah diperbarui.

---

### NFR-004 — UX Tidak Mengganggu

Tombol copy harus kecil, jelas, dan tidak menutupi informasi penting.

**Style awal:**
- Posisi absolute/fixed dekat elemen.
- Background gelap.
- Teks putih.
- Border radius kecil.
- Font size 12px.
- Padding kecil.

---

## 10. Permission Extension

### 10.1 Manifest Permission Minimal

Rekomendasi permission:

```json
{
  "permissions": [
    "clipboardWrite"
  ],
  "host_permissions": [
    "https://seller.shopee.co.id/*"
  ]
}
```

### 10.2 Content Script

Extension perlu menjalankan content script di halaman Seller Shopee.

```json
{
  "content_scripts": [
    {
      "matches": ["https://seller.shopee.co.id/*"],
      "js": ["content.js"],
      "css": ["style.css"],
      "run_at": "document_idle"
    }
  ]
}
```

---

## 11. Struktur Folder

Rekomendasi struktur folder:

```text
shopee-copy-helper/
├── manifest.json
├── content.js
├── style.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 12. Rekomendasi Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Shopee Copy Helper",
  "version": "1.0.0",
  "description": "Copy nomor pesanan dan catatan pembeli dari Seller Shopee dengan tombol hover.",
  "permissions": ["clipboardWrite"],
  "host_permissions": ["https://seller.shopee.co.id/*"],
  "content_scripts": [
    {
      "matches": ["https://seller.shopee.co.id/*"],
      "js": ["content.js"],
      "css": ["style.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## 13. Detail Logic Teknis

### 13.1 Target Element Registry

Setiap target copy memiliki konfigurasi:

```js
const TARGETS = [
  {
    type: "order_number",
    selector: ".order-sn",
    parser: parseOrderNumber
  },
  {
    type: "buyer_note",
    selector: ".order-comment-content .comment-desc span",
    parser: parseBuyerNote
  }
];
```

---

### 13.2 Parser Nomor Pesanan

```js
function parseOrderNumber(text) {
  const cleaned = text.replace(/^No\. Pesanan\s*/i, "").trim();
  return cleaned || text.trim();
}
```

---

### 13.3 Parser Catatan Pembeli

```js
function parseBuyerNote(text) {
  return text.trim();
}
```

---

### 13.4 Inisialisasi Elemen

```js
function initCopyTargets() {
  TARGETS.forEach((target) => {
    document.querySelectorAll(target.selector).forEach((element) => {
      if (element.dataset.copyHelperReady === "true") return;

      element.dataset.copyHelperReady = "true";
      attachHoverCopy(element, target);
    });
  });
}
```

---

### 13.5 MutationObserver

```js
const observer = new MutationObserver(() => {
  initCopyTargets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

---

## 14. UI Requirement

### 14.1 Tampilan Tombol

Label default:

```text
Copy
```

Setelah berhasil:

```text
Copied!
```

Jika gagal:

```text
Failed
```

### 14.2 Posisi Tombol

Tombol muncul:
- Di sebelah kanan elemen, atau
- Di atas elemen jika kanan tidak cukup ruang.

### 14.3 Style Awal

```css
.shopee-copy-helper-btn {
  position: fixed;
  z-index: 999999;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1;
  border: none;
  border-radius: 4px;
  background: #222;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.shopee-copy-helper-btn:hover {
  background: #000;
}
```

---

## 15. Error Handling

### 15.1 Clipboard Gagal

Jika clipboard API gagal:

1. Tampilkan status `Failed`.
2. Log error ke console untuk debugging.
3. Jangan crash halaman.

### 15.2 Elemen Kosong

Jika teks kosong:
- Jangan tampilkan tombol copy, atau
- Jika sudah muncul, klik tombol tidak melakukan apa-apa.

### 15.3 Selector Tidak Ditemukan

Jika selector tidak ditemukan:
- Extension tetap aktif.
- Tidak tampil error ke user.
- Jalankan ulang deteksi saat DOM berubah.

---

## 16. Testing Scenario

### TC-001 — Copy Nomor Pesanan

**Given:** User hover elemen `.order-sn` berisi `No. Pesanan 260618CJVT82NE`  
**When:** User klik tombol Copy  
**Then:** Clipboard berisi `260618CJVT82NE`

---

### TC-002 — Copy Catatan Pembeli

**Given:** User hover elemen catatan berisi `Alya Syafa Humaira`  
**When:** User klik tombol Copy  
**Then:** Clipboard berisi `Alya Syafa Humaira`

---

### TC-003 — Banyak Pesanan

**Given:** Halaman berisi banyak card pesanan  
**When:** User hover tiap nomor pesanan  
**Then:** Masing-masing elemen punya tombol copy sendiri

---

### TC-004 — DOM Dinamis

**Given:** User scroll atau pindah tab internal di Seller Shopee  
**When:** Pesanan baru muncul  
**Then:** Extension tetap menambahkan fitur copy ke elemen baru

---

### TC-005 — Tidak Aktif di Website Lain

**Given:** User membuka website selain Seller Shopee  
**When:** Extension terpasang  
**Then:** Content script tidak berjalan

---

## 17. Rencana Pengembangan Bertahap

### Phase 1 — MVP

Fitur:
- Manifest V3
- Content script
- Detect nomor pesanan
- Detect catatan pembeli
- Tombol hover copy
- Clipboard write
- Feedback copied

Output:
- Extension bisa dipasang manual via `Load unpacked`.

---

### Phase 2 — UX Improvement

Fitur:
- Posisi tombol lebih rapi
- Animasi kecil
- Toast notification opsional
- Setting enable/disable fitur
- Icon extension

---

### Phase 3 — Data Tambahan

Potensi data tambahan:
- Nama produk
- Variasi produk
- Username pembeli
- Alamat ringkas
- Kurir
- Resi
- Status pesanan

Catatan:
Data tambahan harus dipertimbangkan secara hati-hati agar tidak melanggar privasi atau membuat extension terlalu invasif.

---

### Phase 4 — Export Opsional

Fitur opsional:
- Simpan data yang dicopy ke riwayat lokal
- Export CSV
- Copy format gabungan:
  ```text
  Nomor Pesanan: 260618CJVT82NE
  Catatan: Alya Syafa Humaira
  ```

---

## 18. Risiko Teknis

### 18.1 Shopee Mengubah Struktur HTML

Risiko:
- Class seperti `.order-sn` atau `.order-comment-content` berubah.

Mitigasi:
- Buat selector fallback.
- Deteksi teks berbasis keyword `No. Pesanan`.
- Pisahkan selector dalam satu konfigurasi agar mudah diedit.

---

### 18.2 Halaman Shopee SPA/Dinamis

Risiko:
- Elemen muncul setelah content script dijalankan.

Mitigasi:
- Gunakan MutationObserver.
- Jalankan scan ulang secara aman.
- Hindari duplicate listener dengan dataset marker.

---

### 18.3 Clipboard Permission

Risiko:
- Clipboard gagal karena permission atau browser policy.

Mitigasi:
- Gunakan `navigator.clipboard.writeText`.
- Pastikan copy dipicu oleh user gesture/click.
- Tambahkan fallback `document.execCommand("copy")` jika diperlukan.

---

## 19. Definition of Done

MVP dianggap selesai jika:

1. Extension bisa dipasang di Brave lewat `brave://extensions`.
2. Extension aktif di Seller Shopee.
3. Hover nomor pesanan menampilkan tombol Copy.
4. Klik Copy nomor pesanan menyalin kode pesanan bersih.
5. Hover catatan pembeli menampilkan tombol Copy.
6. Klik Copy catatan pembeli menyalin isi catatan.
7. Berhasil untuk banyak pesanan dalam satu halaman.
8. Tetap berjalan pada elemen yang muncul dinamis.
9. Tidak ada error fatal di console.
10. Tidak mengganggu tampilan dan fungsi asli Seller Shopee.

---

## 20. Catatan Implementasi untuk Developer Junior

Prioritas pengerjaan:

1. Buat folder extension.
2. Buat `manifest.json`.
3. Buat `content.js`.
4. Buat `style.css`.
5. Test extension dengan `Load unpacked` di Brave.
6. Buka halaman Seller Shopee.
7. Pastikan tombol Copy muncul saat hover.
8. Test isi clipboard.
9. Rapikan posisi tombol.
10. Tambahkan MutationObserver.
11. Test dengan banyak pesanan.

Prinsip penting:
- Jangan langsung membuat fitur besar.
- Jangan pakai framework dulu.
- Jangan simpan data dulu.
- Fokus ke copy yang stabil dan cepat.
- Hindari permission yang tidak dibutuhkan.
