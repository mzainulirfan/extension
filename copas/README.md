# Shopee Copy Helper

Extension Brave/Chromium Manifest V3 untuk menyalin nomor pesanan dan catatan pembeli dari halaman Seller Shopee dengan tombol hover kecil.

## Fitur MVP

- Mendeteksi nomor pesanan dari `.order-sn`.
- Mendeteksi catatan pembeli dari `.order-comment-content .comment-desc span` dan fallback inline Shopee.
- Menampilkan tombol `Copy` saat target di-hover.
- Menyalin nomor pesanan tanpa label `No. Pesanan`.
- Menyalin catatan pembeli apa adanya setelah `trim()`.
- Memberi feedback `Copied!` atau `Failed`.
- Mendukung konten Shopee yang muncul dinamis lewat `MutationObserver`.

## Cara Install di Brave

1. Buka `brave://extensions`.
2. Aktifkan `Developer mode`.
3. Klik `Load unpacked`.
4. Pilih folder repo ini: `d:\dev\extension\copas`.
5. Buka halaman Seller Shopee di `https://seller.shopee.co.id/`.

Setelah mengubah file extension, klik tombol reload pada kartu extension di `brave://extensions`, lalu refresh halaman Seller Shopee.

## Batasan

- Extension hanya aktif di `seller.shopee.co.id`.
- Tidak login, tidak klik tombol Shopee otomatis, dan tidak memproses transaksi.
- Tidak menyimpan data pesanan.
- Tidak mengirim analytics, tracking, atau request ke server eksternal.
- Tidak membaca cookie atau localStorage Shopee.

## Manual Test

Pada halaman Seller Shopee:

1. Hover teks nomor pesanan seperti `No. Pesanan 260618CJVT82NE`.
2. Klik tombol `Copy`.
3. Paste ke tempat lain dan pastikan hasilnya `260618CJVT82NE`.
4. Hover catatan pembeli, klik `Copy`, lalu pastikan teks catatan tersalin.
5. Scroll, filter, atau pindah tab internal Shopee untuk memastikan elemen baru tetap mendapat tombol copy.

Untuk test cepat tanpa Shopee:

1. Buka `test.html` di browser.
2. Pastikan extension sudah di-load.
3. Hover nomor pesanan dan catatan pada card test.
4. Klik `Tambah order dinamis`, lalu hover order baru.
5. Jika content script tidak berjalan pada file lokal, buka DevTools Console di `test.html`, paste isi `content.js`, lalu tekan Enter untuk simulasi.
