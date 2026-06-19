# PRD — Chrome Extension Template Chat Shopee

## 1. Ringkasan Produk

**Nama Produk:** Shopee Chat Template Helper  
**Tipe Produk:** Chrome/Brave Extension  
**Target Pengguna:** Seller Shopee / Admin toko online  
**Platform:** Google Chrome, Brave Browser, browser berbasis Chromium  
**Status:** MVP Planning  

Shopee Chat Template Helper adalah extension browser untuk membantu seller Shopee mengelola, memanggil, menyisipkan, dan menggunakan template chat secara cepat saat membalas pembeli di Shopee Seller Center atau halaman chat Shopee.

Extension ini dibuat untuk mengurangi proses manual copy-paste dari banyak sumber seperti Notepad, WhatsApp, spreadsheet, catatan, atau file lain. Seller dapat menyimpan template chat, mencari template, mengambil teks hasil copy-paste dari mana saja, lalu memasukkannya ke kolom chat Shopee.

Pada tahap MVP, extension **tidak langsung mengirim chat otomatis**. Extension hanya membantu mengisi kolom chat agar seller tetap bisa mengecek pesan sebelum dikirim. Fitur auto-send dapat dipertimbangkan pada fase lanjutan dengan kontrol keamanan tambahan.

---

## 2. Latar Belakang Masalah

Seller Shopee sering menggunakan template chat untuk membalas pembeli. Contohnya:

- Konfirmasi pesanan diterima
- Permintaan foto atau catatan desain
- Konfirmasi desain sedang diproses
- Informasi pesanan sudah dikirim
- Follow-up pembeli
- Penjelasan keterlambatan
- Informasi aturan toko
- Balasan komplain

Saat ini proses yang dilakukan masih manual:

1. Seller membuka sumber template seperti Notepad, WhatsApp, spreadsheet, atau dokumen lain.
2. Seller mencari template yang sesuai.
3. Seller copy template.
4. Seller kembali ke chat Shopee.
5. Seller paste ke kolom chat.
6. Seller menyesuaikan isi pesan jika perlu.
7. Seller mengirim chat ke pembeli.

Proses ini menjadi merepotkan saat jumlah order banyak karena seller harus berpindah aplikasi/tab secara berulang.

---

## 3. Problem Statement

Seller membutuhkan alat bantu yang dapat menyimpan dan memanggil template chat langsung dari browser ketika membuka Shopee, sehingga proses membalas pembeli menjadi lebih cepat, konsisten, dan tidak bergantung pada copy-paste manual dari banyak sumber.

Masalah utama yang ingin diselesaikan:

- Template chat tersebar di banyak tempat.
- Proses copy-paste memakan waktu.
- Seller sering berpindah tab/aplikasi.
- Risiko salah template cukup tinggi.
- Pesan tidak konsisten antar admin.
- Sulit menggunakan template yang membutuhkan data dinamis seperti nama pembeli, nomor pesanan, atau catatan pembeli.
- Teks hasil copy dari mana saja belum mudah disimpan menjadi template baru.

---

## 4. Tujuan Produk

Tujuan utama produk ini adalah menyediakan extension browser sederhana yang dapat:

1. Menyimpan template chat seller.
2. Mengelompokkan template berdasarkan kategori.
3. Mencari template dengan cepat.
4. Menyalin template ke clipboard.
5. Menyisipkan template langsung ke kolom chat Shopee.
6. Menyimpan teks hasil copy-paste dari mana saja menjadi template baru.
7. Mendukung template dengan variabel sederhana seperti `{nama}`, `{no_pesanan}`, dan `{catatan}`.

---

## 5. Target Pengguna

### 5.1 Pengguna Utama

- Seller Shopee
- Admin toko online
- Customer service toko online
- Operator marketplace

### 5.2 Karakteristik Pengguna

- Sering membalas chat pembeli.
- Sering menggunakan template pesan yang sama.
- Membutuhkan kerja cepat saat order banyak.
- Tidak selalu memiliki kemampuan teknis tinggi.
- Mengutamakan fitur sederhana, cepat, dan mudah dipahami.

---

## 6. Scope Produk

### 6.1 Scope MVP

Fitur yang wajib ada pada versi pertama:

1. Popup extension.
2. Manajemen template chat.
3. Tambah template.
4. Edit template.
5. Hapus template.
6. Cari template.
7. Kategori template.
8. Copy template ke clipboard.
9. Insert template ke kolom chat Shopee.
10. Paste/capture teks manual ke extension untuk disimpan sebagai template.
11. Penyimpanan lokal menggunakan `chrome.storage.local`.
12. Export dan import template dalam format JSON.

### 6.2 Di Luar Scope MVP

Fitur berikut tidak wajib pada MVP:

1. Login user.
2. Sinkronisasi cloud.
3. Database online.
4. Auto-send chat.
5. Auto-detect nama pembeli.
6. Auto-detect nomor pesanan.
7. Auto-detect catatan pembeli.
8. Statistik penggunaan template.
9. Multi-admin sync.
10. Integrasi API Shopee.

Fitur-fitur tersebut dapat masuk ke fase lanjutan.

---

## 7. Use Case Utama

### 7.1 Seller Menggunakan Template Chat

**Aktor:** Seller/Admin  
**Tujuan:** Mengisi kolom chat Shopee dengan template yang sudah disimpan.

**Alur:**

1. Seller membuka halaman chat Shopee.
2. Seller klik icon extension.
3. Popup extension muncul.
4. Seller mencari template.
5. Seller klik tombol `Insert ke Chat`.
6. Extension memasukkan isi template ke kolom chat Shopee.
7. Seller mengecek pesan.
8. Seller mengirim pesan secara manual.

**Hasil yang Diharapkan:**  
Template masuk ke kolom chat Shopee tanpa perlu copy-paste manual dari aplikasi lain.

---

### 7.2 Seller Menyalin Template ke Clipboard

**Aktor:** Seller/Admin  
**Tujuan:** Mengambil template untuk digunakan di luar Shopee.

**Alur:**

1. Seller membuka popup extension.
2. Seller mencari template.
3. Seller klik tombol `Copy`.
4. Template tersalin ke clipboard.
5. Seller dapat paste di mana saja.

**Hasil yang Diharapkan:**  
Template berhasil disalin ke clipboard.

---

### 7.3 Seller Menambah Template Baru

**Aktor:** Seller/Admin  
**Tujuan:** Menyimpan template baru ke extension.

**Alur:**

1. Seller membuka popup extension.
2. Seller klik tombol `Tambah Template`.
3. Seller mengisi nama template.
4. Seller memilih kategori.
5. Seller menulis isi template.
6. Seller klik `Simpan`.
7. Template tersimpan ke extension.

**Hasil yang Diharapkan:**  
Template baru muncul di daftar template.

---

### 7.4 Seller Menyimpan Teks Copas Menjadi Template

**Aktor:** Seller/Admin  
**Tujuan:** Menyimpan teks dari sumber mana saja menjadi template.

**Alur:**

1. Seller copy teks dari WhatsApp, spreadsheet, Notepad, browser, atau sumber lain.
2. Seller membuka popup extension.
3. Seller paste teks ke field `Draft / Teks Sementara`.
4. Seller klik `Simpan sebagai Template`.
5. Seller mengisi nama template dan kategori.
6. Seller klik `Simpan`.

**Hasil yang Diharapkan:**  
Teks hasil copas tersimpan sebagai template baru.

---

### 7.5 Seller Menggunakan Template dengan Variabel

**Aktor:** Seller/Admin  
**Tujuan:** Mengisi template yang memiliki placeholder dinamis.

**Contoh Template:**

```text
Halo kak, untuk pesanan atas nama {nama}, desainnya akan kami proses terlebih dahulu ya.
```

**Alur:**

1. Seller memilih template yang memiliki variabel `{nama}`.
2. Extension mendeteksi variabel pada template.
3. Extension menampilkan field input `nama`.
4. Seller mengisi nama.
5. Seller klik `Generate` atau `Insert ke Chat`.
6. Extension mengganti `{nama}` dengan input seller.
7. Pesan final masuk ke kolom chat Shopee.

**Hasil yang Diharapkan:**

```text
Halo kak, untuk pesanan atas nama Alya Syafa Humaira, desainnya akan kami proses terlebih dahulu ya.
```

---

## 8. Fitur Detail

## 8.1 Popup Extension

Popup adalah tampilan utama ketika user klik icon extension di browser.

### Komponen Popup

- Header extension
- Search template
- Filter kategori
- Daftar template
- Tombol tambah template
- Tombol import/export
- Area draft/paste manual
- Tombol pengaturan

### Layout Dasar

```text
+--------------------------------+
| Shopee Chat Template Helper    |
+--------------------------------+
| Search template...             |
+--------------------------------+
| Kategori: Semua                |
+--------------------------------+
| [Konfirmasi Pesanan]           |
| Halo kak, pesanan...           |
| [Copy] [Insert ke Chat]        |
+--------------------------------+
| [Desain]                       |
| Halo kak, desain akan...       |
| [Copy] [Insert ke Chat]        |
+--------------------------------+
| Draft / Paste Manual           |
| textarea                       |
| [Simpan sebagai Template]      |
+--------------------------------+
```

---

## 8.2 Manajemen Template

User dapat membuat, membaca, mengubah, dan menghapus template.

### Data Template

Setiap template memiliki struktur:

```json
{
  "id": "uuid",
  "title": "Konfirmasi Pesanan Diterima",
  "category": "Konfirmasi Pesanan",
  "content": "Halo kak, pesanan kakak sudah kami terima ya...",
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z"
}
```

### Field Template

| Field | Tipe | Wajib | Keterangan |
|---|---|---:|---|
| id | string | Ya | ID unik template |
| title | string | Ya | Nama template |
| category | string | Ya | Kategori template |
| content | string | Ya | Isi template chat |
| createdAt | string | Ya | Tanggal dibuat |
| updatedAt | string | Ya | Tanggal terakhir diedit |

---

## 8.3 Kategori Template

Kategori digunakan agar template mudah dikelompokkan.

### Kategori Default

- Konfirmasi Pesanan
- Desain
- Pengiriman
- Follow-up
- Komplain
- Closing
- Custom

User dapat menambah kategori custom pada fase lanjutan. Untuk MVP, kategori boleh berupa input teks atau dropdown sederhana.

---

## 8.4 Search Template

User dapat mencari template berdasarkan:

- Judul template
- Isi template
- Kategori

### Requirement

- Search berjalan secara realtime saat user mengetik.
- Search tidak case-sensitive.
- Jika tidak ada hasil, tampilkan pesan `Template tidak ditemukan`.

---

## 8.5 Copy Template

User dapat klik tombol `Copy` pada template.

### Requirement

- Isi template disalin ke clipboard.
- Setelah berhasil, tampilkan status `Template berhasil disalin`.
- Jika gagal, tampilkan status `Gagal menyalin template`.

---

## 8.6 Insert Template ke Chat Shopee

Fitur ini memasukkan template langsung ke kolom input chat Shopee.

### Requirement

- Extension harus berjalan pada domain Shopee yang relevan.
- Extension mencari kolom input chat aktif.
- Extension mengisi kolom chat dengan template yang dipilih.
- Extension tidak otomatis menekan tombol kirim pada MVP.
- Jika kolom chat tidak ditemukan, tampilkan pesan error.

### Pesan Error

```text
Kolom chat Shopee tidak ditemukan. Pastikan halaman chat sedang terbuka.
```

### Catatan Teknis

Shopee dapat mengubah struktur HTML sewaktu-waktu. Karena itu selector harus dibuat fleksibel dan mudah diperbarui.

Kemungkinan pendekatan selector:

- Cari `textarea`
- Cari elemen `contenteditable="true"`
- Cari input chat berdasarkan role atau placeholder
- Cari elemen aktif/focus terakhir

---

## 8.7 Draft / Paste Manual

User dapat memasukkan teks manual ke extension.

### Requirement

- Popup menyediakan textarea `Draft / Paste Manual`.
- User dapat paste teks dari mana saja.
- User dapat menyimpan teks tersebut menjadi template.
- User juga dapat langsung copy isi draft.
- User juga dapat insert isi draft ke chat Shopee.

---

## 8.8 Template dengan Variabel

Template dapat menggunakan placeholder dengan format kurung kurawal.

Contoh:

```text
Halo kak, pesanan nomor {no_pesanan} atas nama {nama} akan segera kami proses ya.
```

### Requirement MVP

- Extension mendeteksi placeholder dengan format `{nama_variabel}`.
- Extension menampilkan input field sesuai variabel yang ditemukan.
- User mengisi nilai variabel.
- Extension menghasilkan pesan final.
- Pesan final dapat dicopy atau diinsert ke chat.

### Contoh Variabel Umum

- `{nama}`
- `{no_pesanan}`
- `{catatan}`
- `{produk}`
- `{tanggal}`
- `{resi}`

---

## 8.9 Export dan Import Template

Agar template tidak hilang dan bisa dipindahkan ke device lain, extension perlu mendukung export/import.

### Export

- User klik `Export`.
- Extension membuat file JSON berisi semua template.
- File dapat diunduh oleh user.

### Import

- User klik `Import`.
- User memilih file JSON.
- Extension membaca isi file.
- Extension memvalidasi struktur data.
- Template dimasukkan ke storage lokal.

### Format Export

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-06-19T00:00:00.000Z",
  "templates": []
}
```

---

## 9. Fitur Lanjutan Setelah MVP

Fitur ini tidak wajib untuk versi pertama, tetapi dapat dijadikan roadmap.

### 9.1 Floating Button di Halaman Shopee

Extension menampilkan tombol kecil di halaman chat Shopee.

Contoh:

```text
[Template]
```

Saat tombol diklik, panel template muncul tanpa harus membuka popup extension.

---

### 9.2 Auto Detect Data dari Halaman Order

Extension membaca data dari halaman order Shopee, seperti:

- Nomor pesanan
- Catatan pembeli
- Status pesanan
- Nama produk
- Nomor resi

Data tersebut dapat digunakan untuk mengisi variabel otomatis.

Contoh:

```text
Halo kak, pesanan nomor {no_pesanan} dengan catatan {catatan} akan segera kami proses ya.
```

Menjadi:

```text
Halo kak, pesanan nomor 260618CJVT82NE dengan catatan Alya Syafa Humaira akan segera kami proses ya.
```

---

### 9.3 Auto Send Chat

Extension dapat mengisi chat dan mengirim otomatis.

Fitur ini harus menggunakan konfirmasi tambahan.

Contoh flow aman:

1. User pilih template.
2. Extension menampilkan preview final.
3. User klik `Kirim Sekarang`.
4. Extension mengisi kolom chat.
5. Extension klik tombol kirim.

### Catatan Risiko

Auto-send memiliki risiko tinggi:

- Salah template terkirim.
- Salah chat pembeli.
- Chat terkirim sebelum dicek.
- Perubahan UI Shopee dapat menyebabkan error.
- Aktivitas otomatis dapat dianggap tidak wajar oleh platform.

Karena itu fitur ini tidak masuk MVP.

---

### 9.4 Multi Message dengan Delay

Extension dapat mengirim beberapa pesan berurutan dengan jeda.

Contoh:

1. Kirim pesan pembuka.
2. Tunggu 2 detik.
3. Kirim pesan instruksi.
4. Tunggu 2 detik.
5. Kirim pesan penutup.

Fitur ini hanya boleh dibuat setelah auto-send stabil dan memiliki sistem konfirmasi.

---

### 9.5 Sync Antar Device

Template dapat disinkronkan antar device menggunakan:

- `chrome.storage.sync`
- Backend custom
- Supabase
- Firebase
- Google Drive API

Untuk MVP, gunakan `chrome.storage.local` terlebih dahulu.

---

## 10. User Interface Requirement

### 10.1 Gaya UI

- Sederhana
- Cepat diakses
- Mobile tidak wajib karena extension digunakan di desktop browser
- Ukuran popup ideal: 380px sampai 450px lebar
- Tidak terlalu banyak warna
- Fokus pada kecepatan memilih template

### 10.2 Prioritas Tampilan

Urutan prioritas elemen:

1. Search template
2. Daftar template
3. Tombol insert/copy
4. Kategori
5. Draft manual
6. Manajemen template
7. Import/export

---

## 11. Teknologi yang Direkomendasikan

### 11.1 Stack MVP

- Manifest V3
- HTML
- CSS
- JavaScript
- Chrome Extension API
- `chrome.storage.local`
- Content Script
- Background Service Worker

### 11.2 Alternatif Stack Jika Ingin Lebih Rapi

- Vite
- React
- TypeScript
- TailwindCSS
- Chrome Extension Manifest V3

### 11.3 Rekomendasi untuk Tahap Awal

Gunakan stack sederhana dulu:

```text
HTML + CSS + JavaScript + Manifest V3
```

Alasannya:

- Lebih mudah dipahami.
- Cocok untuk MVP.
- Tidak perlu build step yang rumit.
- Lebih mudah dikerjakan bertahap.
- Cocok untuk junior developer.

---

## 12. Arsitektur Extension

### 12.1 Struktur Folder Rekomendasi

```text
shopee-chat-template-helper/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── storage.js
├── utils.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### 12.2 Penjelasan File

| File | Fungsi |
|---|---|
| manifest.json | Konfigurasi extension |
| popup.html | Tampilan popup extension |
| popup.css | Styling popup |
| popup.js | Logic UI popup |
| content.js | Script yang berjalan di halaman Shopee |
| background.js | Service worker extension |
| storage.js | Helper untuk simpan/ambil data template |
| utils.js | Helper umum |
| icons/ | Icon extension |

---

## 13. Permission Extension

### 13.1 Permission MVP

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "clipboardWrite"
  ],
  "host_permissions": [
    "https://*.shopee.co.id/*",
    "https://seller.shopee.co.id/*"
  ]
}
```

### 13.2 Catatan Permission

- `storage`: menyimpan template.
- `activeTab`: akses tab aktif saat user menggunakan extension.
- `scripting`: menjalankan script untuk insert ke halaman.
- `clipboardWrite`: copy template ke clipboard.
- `host_permissions`: membatasi akses extension hanya ke domain Shopee.

---

## 14. Functional Requirement

| Kode | Requirement | Prioritas |
|---|---|---|
| FR-001 | User dapat membuka popup extension | Must Have |
| FR-002 | User dapat melihat daftar template | Must Have |
| FR-003 | User dapat menambah template | Must Have |
| FR-004 | User dapat mengedit template | Must Have |
| FR-005 | User dapat menghapus template | Must Have |
| FR-006 | User dapat mencari template | Must Have |
| FR-007 | User dapat memfilter template berdasarkan kategori | Should Have |
| FR-008 | User dapat copy template ke clipboard | Must Have |
| FR-009 | User dapat insert template ke kolom chat Shopee | Must Have |
| FR-010 | User dapat paste teks manual ke extension | Must Have |
| FR-011 | User dapat menyimpan teks manual sebagai template | Must Have |
| FR-012 | User dapat menggunakan variabel pada template | Should Have |
| FR-013 | User dapat export template ke JSON | Should Have |
| FR-014 | User dapat import template dari JSON | Should Have |
| FR-015 | Extension menampilkan error jika kolom chat tidak ditemukan | Must Have |
| FR-016 | Extension tidak auto-send pada MVP | Must Have |

---

## 15. Non-Functional Requirement

| Kode | Requirement | Keterangan |
|---|---|---|
| NFR-001 | Cepat | Popup harus terbuka kurang dari 1 detik |
| NFR-002 | Ringan | Tidak membebani halaman Shopee |
| NFR-003 | Aman | Tidak menyimpan data ke server pada MVP |
| NFR-004 | Lokal | Template disimpan di browser user |
| NFR-005 | Mudah Dipakai | UI sederhana dan tidak membingungkan |
| NFR-006 | Stabil | Gagal insert tidak boleh merusak isi chat yang sudah ada |
| NFR-007 | Mudah Backup | Support export/import JSON |

---

## 16. Validasi dan Error Handling

### 16.1 Validasi Template

Saat menyimpan template:

- `title` tidak boleh kosong.
- `content` tidak boleh kosong.
- `category` tidak boleh kosong.
- Panjang title maksimal 80 karakter.
- Panjang content disarankan maksimal 3000 karakter.

### 16.2 Error State

| Kondisi | Pesan |
|---|---|
| Template kosong | Isi template tidak boleh kosong |
| Judul kosong | Nama template wajib diisi |
| Chat input tidak ditemukan | Kolom chat Shopee tidak ditemukan |
| Gagal copy | Gagal menyalin template |
| Import gagal | Format file template tidak valid |
| Storage gagal | Gagal menyimpan data template |

---

## 17. Data Storage

### 17.1 Storage Key

Gunakan key berikut pada `chrome.storage.local`:

```text
chat_templates
template_categories
app_settings
```

### 17.2 Contoh Data

```json
{
  "chat_templates": [
    {
      "id": "tpl_001",
      "title": "Konfirmasi Pesanan",
      "category": "Konfirmasi Pesanan",
      "content": "Halo kak, pesanan kakak sudah kami terima ya. Mohon ditunggu, pesanan akan segera kami proses sesuai antrean. Terima kasih 🙏",
      "createdAt": "2026-06-19T00:00:00.000Z",
      "updatedAt": "2026-06-19T00:00:00.000Z"
    }
  ],
  "template_categories": [
    "Konfirmasi Pesanan",
    "Desain",
    "Pengiriman",
    "Follow-up",
    "Komplain",
    "Closing",
    "Custom"
  ],
  "app_settings": {
    "insertMode": "replace",
    "autoSend": false
  }
}
```

---

## 18. Insert Mode

Extension sebaiknya mendukung dua mode insert.

### 18.1 Replace Mode

Isi kolom chat diganti dengan template.

Cocok untuk kondisi:

- Kolom chat masih kosong.
- User ingin langsung menggunakan template penuh.

### 18.2 Append Mode

Template ditambahkan ke akhir isi chat yang sudah ada.

Cocok untuk kondisi:

- User sudah mengetik sebagian pesan.
- User ingin menambahkan template penutup.

### Rekomendasi MVP

Gunakan `replace mode` sebagai default. Tambahkan opsi `append mode` di settings.

---

## 19. Acceptance Criteria

### AC-001 — Tambah Template

**Given** user membuka popup extension  
**When** user mengisi nama, kategori, dan isi template  
**Then** template tersimpan dan muncul di daftar template

### AC-002 — Edit Template

**Given** user memiliki template tersimpan  
**When** user mengubah isi template  
**Then** data template berhasil diperbarui

### AC-003 — Hapus Template

**Given** user memiliki template tersimpan  
**When** user klik hapus dan mengonfirmasi  
**Then** template terhapus dari daftar

### AC-004 — Search Template

**Given** user memiliki banyak template  
**When** user mengetik keyword di search box  
**Then** daftar template hanya menampilkan item yang sesuai keyword

### AC-005 — Copy Template

**Given** user memilih template  
**When** user klik tombol copy  
**Then** isi template masuk ke clipboard

### AC-006 — Insert ke Chat Shopee

**Given** user membuka halaman chat Shopee  
**When** user memilih template dan klik `Insert ke Chat`  
**Then** isi template masuk ke kolom chat Shopee

### AC-007 — Chat Input Tidak Ditemukan

**Given** user tidak sedang membuka halaman chat Shopee  
**When** user klik `Insert ke Chat`  
**Then** extension menampilkan pesan error bahwa kolom chat tidak ditemukan

### AC-008 — Simpan Teks Manual

**Given** user paste teks ke area draft  
**When** user klik `Simpan sebagai Template`  
**Then** teks tersebut tersimpan sebagai template baru

### AC-009 — Export Template

**Given** user memiliki template tersimpan  
**When** user klik export  
**Then** extension mengunduh file JSON berisi template

### AC-010 — Import Template

**Given** user memiliki file JSON template valid  
**When** user melakukan import  
**Then** template dari file berhasil masuk ke daftar template

---

## 20. Contoh Template Awal

### 20.1 Konfirmasi Pesanan

```text
Halo kak, pesanan kakak sudah kami terima ya. Mohon ditunggu, pesanan akan segera kami proses sesuai antrean. Terima kasih 🙏
```

### 20.2 Minta Catatan Desain

```text
Halo kak, untuk proses desain mohon kirimkan catatan nama/tulisan yang ingin dicantumkan ya. Jika tidak ada catatan, kami akan proses sesuai default toko. Terima kasih 🙏
```

### 20.3 Desain Diproses

```text
Halo kak, desain pesanan kakak sedang kami proses ya. Jika sudah selesai, akan kami lanjutkan ke tahap produksi/pengemasan. Terima kasih sudah menunggu 🙏
```

### 20.4 Pesanan Dikirim

```text
Halo kak, pesanan kakak sudah kami kirim ya. Mohon ditunggu update dari pihak ekspedisi. Terima kasih sudah berbelanja di toko kami 🙏
```

### 20.5 Pesanan Tanpa Catatan

```text
Halo kak, karena tidak ada catatan khusus pada pesanan, kami akan proses sesuai format default toko ya. Terima kasih 🙏
```

### 20.6 Follow-up Desain

```text
Halo kak, kami izin follow-up ya. Mohon konfirmasi desain/pesanan agar bisa segera kami lanjutkan ke proses berikutnya. Terima kasih 🙏
```

---

## 21. Roadmap Pengembangan

### Phase 1 — MVP

- Setup manifest extension.
- Buat popup UI.
- Buat CRUD template.
- Simpan data ke `chrome.storage.local`.
- Copy template ke clipboard.
- Insert template ke chat Shopee.
- Draft manual.
- Export/import JSON.

### Phase 2 — Template Variabel

- Deteksi placeholder `{variabel}`.
- Generate input otomatis.
- Preview pesan final.
- Copy/insert pesan final.

### Phase 3 — Floating Widget

- Floating button di halaman Shopee.
- Panel template langsung di halaman Shopee.
- Quick insert tanpa membuka popup browser.

### Phase 4 — Auto Detect Data Shopee

- Ambil nomor pesanan.
- Ambil catatan pembeli.
- Ambil status pesanan.
- Ambil nomor resi jika tersedia.
- Mapping data ke variabel template.

### Phase 5 — Auto Send Aman

- Preview sebelum kirim.
- Konfirmasi manual.
- Delay antar pesan.
- Log aktivitas lokal.
- Toggle aktif/nonaktif auto-send.

---

## 22. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Struktur HTML Shopee berubah | Insert gagal | Buat selector fleksibel dan mudah diperbarui |
| Salah template dikirim | Komunikasi buruk ke buyer | MVP hanya insert, bukan auto-send |
| Data template hilang | User kehilangan template | Sediakan export/import JSON |
| Extension terlalu kompleks | Sulit dipakai admin | Fokus MVP sederhana |
| Permission terlalu luas | User tidak percaya | Batasi permission ke domain Shopee |
| Clipboard gagal | Copy tidak berjalan | Sediakan fallback textarea manual |

---

## 23. Security dan Privacy

### 23.1 Prinsip Keamanan

- Template disimpan lokal di browser.
- Tidak ada data dikirim ke server pada MVP.
- Extension hanya aktif di domain Shopee yang ditentukan.
- Tidak membaca chat pembeli kecuali dibutuhkan pada fase lanjutan.
- Tidak auto-send tanpa konfirmasi user.

### 23.2 Data yang Disimpan

- Template chat
- Kategori template
- Setting extension

### 23.3 Data yang Tidak Disimpan pada MVP

- Data pembeli
- Riwayat chat
- Nomor pesanan
- Nomor resi
- Akun Shopee
- Password
- Cookie/session

---

## 24. Definisi Sukses MVP

MVP dianggap berhasil jika:

1. Seller dapat menyimpan minimal 20 template chat.
2. Seller dapat mencari template dengan cepat.
3. Seller dapat memasukkan template ke kolom chat Shopee.
4. Seller tidak perlu berpindah ke Notepad/WhatsApp/spreadsheet untuk mengambil template umum.
5. Seller tetap bisa mengecek pesan sebelum dikirim.
6. Template dapat dibackup melalui export JSON.

---

## 25. Catatan Implementasi untuk Developer Junior

Kerjakan bertahap. Jangan langsung membuat semua fitur sekaligus.

Urutan pengerjaan yang disarankan:

1. Buat struktur extension dasar.
2. Buat popup kosong.
3. Tampilkan daftar template dummy.
4. Simpan template ke `chrome.storage.local`.
5. Buat tambah/edit/hapus template.
6. Buat search template.
7. Buat tombol copy.
8. Buat content script untuk insert ke chat Shopee.
9. Buat error handling jika input chat tidak ditemukan.
10. Buat draft manual.
11. Buat export/import JSON.
12. Baru lanjut ke variabel template.

Jangan membuat fitur auto-send pada tahap awal.

---

## 26. Prioritas Pengerjaan

### Must Have

- CRUD template
- Search template
- Copy template
- Insert ke chat Shopee
- Storage lokal
- Draft manual
- Error handling

### Should Have

- Kategori template
- Export/import JSON
- Template variabel
- Setting insert mode

### Could Have

- Floating button
- Preview pesan final
- Shortcut keyboard
- Auto detect data Shopee

### Won't Have di MVP

- Auto-send
- Login
- Cloud sync
- API Shopee
- Multi-admin dashboard

---

## 27. Kesimpulan

Shopee Chat Template Helper adalah extension sederhana tetapi bernilai tinggi untuk seller Shopee. MVP harus fokus pada penyimpanan template, pencarian cepat, copy, dan insert ke kolom chat Shopee.

Keputusan penting untuk MVP adalah tidak melakukan auto-send. Extension hanya membantu mengisi kolom chat agar seller tetap bisa mengecek isi pesan sebelum mengirim. Pendekatan ini lebih aman, lebih mudah dibuat, dan langsung menyelesaikan problem utama copy-paste manual.
