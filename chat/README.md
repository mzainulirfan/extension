# Shopee Chat Template Helper

Chrome/Brave extension MVP untuk menyimpan, mencari, menyalin, dan menyisipkan template chat ke halaman Shopee.

## Fitur MVP

- CRUD template chat.
- Kategori dan pencarian realtime.
- Copy template ke clipboard.
- Insert template ke kolom chat Shopee.
- Auto-send setelah memilih template dari command palette.
- Draft/paste manual yang bisa dicopy, diinsert, atau disimpan sebagai template.
- Command palette template dengan shortcut `Ctrl+Shift+K`.
- Placeholder variabel seperti `{nama}`, `{no_pesanan}`, `{catatan}`.
- Template multi-pesan dengan pemisah baris `---`.
- Export dan import JSON.
- Penyimpanan lokal via `chrome.storage.local`.
- Mode insert `replace` dan `append`.

Command palette melakukan auto-send setelah template dipilih. Untuk template multi-pesan, setiap pesan dikirim berurutan dengan jeda aman sekitar 2-3 detik.

## Cara Menjalankan

1. Buka `chrome://extensions` atau `brave://extensions`.
2. Aktifkan `Developer mode`.
3. Klik `Load unpacked`.
4. Pilih folder project ini.
5. Buka halaman chat Shopee atau Seller Center.
6. Klik icon extension untuk mengelola template, atau pakai command palette di halaman chat Shopee.

## Command Palette

Tekan `Ctrl+Shift+K` di halaman chat Shopee untuk membuka command palette template. Ketik kata kunci untuk mencari template, lalu tekan `Enter` atau klik template untuk memasukkan dan mengirim pesan.

Kontrol keyboard:

- `Arrow Down` / `Arrow Up` untuk pindah pilihan.
- `Enter` atau `Tab` untuk memasukkan template.
- `Escape` untuk menutup pilihan.

## Template Multi-Pesan

Untuk template yang perlu dikirim beberapa kali, pisahkan tiap pesan dengan baris `---`.

Contoh:

```text
Silakan kirim fotonya ke WA kita agar tidak pecah. Nomor WA di bawah ini.
---
089677427887
```

Saat template dipilih, extension mengirim pesan pertama dulu, lalu mengirim pesan berikutnya otomatis dengan jeda sekitar 2-3 detik. Panel kecil akan muncul selama proses berjalan dan bisa dibatalkan dengan tombol `Batal`.

## Struktur File

```text
manifest.json
popup.html
popup.css
popup.js
content.js
background.js
storage.js
utils.js
icons/
README.md
```

## Import JSON

Format import yang didukung:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-06-19T00:00:00.000Z",
  "templates": [
    {
      "id": "tpl_001",
      "title": "Konfirmasi Pesanan",
      "category": "Konfirmasi Pesanan",
      "content": "Halo kak, pesanan kakak sudah kami terima ya.",
      "createdAt": "2026-06-19T00:00:00.000Z",
      "updatedAt": "2026-06-19T00:00:00.000Z"
    }
  ]
}
```

Array template langsung juga bisa diimport selama tiap item memiliki `title`, `category`, dan `content`.
