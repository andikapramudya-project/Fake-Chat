# Fake Chat

Generator percakapan fiktif bergaya WhatsApp yang dikelola oleh **Andika Pramudya**.
Buat percakapan dua arah, tambahkan foto, lalu simpan sebagai gambar PNG atau video cerita chat.
Pemrosesan chat dan ekspor dilakukan di browser tanpa backend aplikasi.

[Repository](https://github.com/andikapramudya-project/fake-chat) ·
[Laporkan masalah](https://github.com/andikapramudya-project/fake-chat/issues)

> **Status publikasi:** folder ini disiapkan untuk repository di atas. GitHub Pages
> belum diverifikasi aktif. Kode awal berasal dari proyek lain; izin redistribusi
> kode dan sejumlah aset masih perlu dipastikan. Baca [NOTICE.md](NOTICE.md)
> sebelum mempublikasikan. Perubahan nama pengelola tidak mengalihkan hak pihak ketiga.

## Fitur

- Percakapan dua arah dengan pemilih pengirim **You / Them**.
- Nama kontak, foto profil, status, dan jam ponsel dapat diubah.
- Pesan teks multiline dan foto dengan caption; mendukung pilih file, paste, serta drag-and-drop.
- Gambar dikecilkan hingga sisi terpanjang 1280 piksel; batas per file 15 MB.
- Ekspor tampilan chat yang sedang terlihat menjadi PNG.
- Ekspor video 30 fps melalui WebCodecs, dengan suara pesan dan opsi pembatalan.
- Replay setiap dua detik; pembatalan mengembalikan seluruh percakapan.
- Pengeditan dikunci selama replay, screenshot, dan pembuatan video untuk mencegah benturan perubahan.
- Konfirmasi sebelum menghapus seluruh pesan dan panduan penggunaan bawaan.

## Menjalankan di komputer

Gunakan Node.js **22.12 atau lebih baru**; workflow memakai Node.js 24.
Setelah repository tersedia:

```sh
git clone https://github.com/andikapramudya-project/fake-chat.git
cd fake-chat
npm ci
npm run dev
```

Untuk folder lokal yang sudah ada, buka terminal di folder proyek lalu jalankan
`npm ci` dan `npm run dev`. Buka alamat yang ditampilkan Vite, biasanya
`http://localhost:3000`.

| Perintah | Fungsi |
| --- | --- |
| `npm start` / `npm run dev` | Menjalankan server pengembangan |
| `npm test` | Menguji waktu tunggu dan pembatalan replay |
| `npm run test:browser` | Menguji alur aplikasi di Chromium; jalankan `npx playwright install --no-shell chromium` sekali sebelumnya |
| `npm run build` | Membuat aplikasi produksi di `build/` |
| `npm run preview` | Membuka hasil build secara lokal |
| `npm audit` | Memeriksa kerentanan dependensi yang diketahui |

## Cara penggunaan

| Kebutuhan | Langkah |
| --- | --- |
| Mengubah kontak | Klik foto, nama, atau status di header. Kosongkan status untuk menyembunyikannya. |
| Mengubah jam | Klik jam di kiri atas. |
| Mengirim teks | Ketik lalu tekan **Enter** atau tombol kirim. **Shift + Enter** untuk baris baru. |
| Mengganti pengirim | Klik pemilih **You / Them** sebelum mengirim. |
| Memindahkan pesan | Klik dua kali pada gelembung pesan. |
| Mengirim foto | Klik lampiran/kamera, paste foto, atau seret file ke chat. Teks di input menjadi caption foto pertama. |
| Menyimpan gambar | Menu **⋮ → Take screenshot**. |
| Menyimpan video | Menu **⋮ → Save video**. Biarkan tab terbuka hingga selesai; **Cancel** untuk membatalkan. |
| Memutar ulang | Menu **⋮ → Replay chat**. |
| Menghapus pesan | Menu **⋮ → Clear chat**, kemudian konfirmasi. |
| Membuka panduan | Menu **⋮ → How to use**. |

Pada layar landscape, aplikasi menampilkan bingkai ponsel 9:16. Screenshot
menyimpan area yang terlihat, bukan seluruh riwayat chat panjang.
Kontrol editor dan kredit pengelola berada di luar hasil ekspor.

## Batasan dan privasi

- Percakapan dan profil hanya disimpan dalam memori tab. **Refresh atau menutup tab akan menghapusnya.**
  Ekspor hasil sebelum meninggalkan halaman. Hanya status panduan yang disimpan di localStorage.
- Aplikasi tidak menyediakan akun, database, analitik, atau pengiriman pesan ke WhatsApp.
  Penyedia hosting tetap dapat mencatat permintaan halaman seperti situs biasa.
- Video memerlukan WebCodecs dan encoder yang tersedia di perangkat. Gunakan browser
  terbaru melalui HTTPS atau localhost. Format diutamakan MP4/H.264; dapat beralih ke WebM.
  Suara video bergantung pada encoder audio yang didukung browser.
- Video panjang dan foto dalam jumlah besar dapat memakai banyak RAM. Dukungan video
  tidak dijamin untuk setiap kombinasi browser dan perangkat.
- Gunakan untuk cerita fiksi, mockup, atau pembelajaran. Beri konteks bahwa hasilnya
  simulasi; hindari penipuan, penyamaran, dan pembuatan bukti palsu.
- Proyek tidak berafiliasi dengan WhatsApp atau Meta.

## GitHub Pages

Setelah izin redistribusi kode dan aset dipastikan:

1. Unggah kode sumber ke `andikapramudya-project/fake-chat`, branch `main`.
   Jangan unggah `node_modules/` atau `build/`.
2. Di **Settings → Pages → Build and deployment**, pilih **GitHub Actions**.
3. Push ke `main` atau jalankan **Actions → Deploy to GitHub Pages → Run workflow**.
4. Periksa keberhasilan workflow. Alamat yang diharapkan:
   <https://andikapramudya-project.github.io/fake-chat/>.

Workflow memasang dependensi dari lockfile, menjalankan tes, membangun aplikasi,
dan menerbitkan `build/`. Pull request menjalankan pemeriksaan tanpa deployment.
`base: "./"` mendukung hosting di subfolder. Untuk hosting lain, unggah isi `build/`.

## Struktur proyek

```text
.github/workflows/    Pemeriksaan dan deployment GitHub Pages
src/
  config.js          Identitas pengelola dan repository
  App.jsx            State, layout, dan penguncian editor
  utils.js           Pengolahan gambar dan screenshot
  timing.js          Waktu tunggu yang dapat dibatalkan
  video.js           Renderer video WebCodecs melalui Mediabunny
  sounds.js          Audio pesan dan timeline video
  components/        Kontak, chat, menu, panduan, dan progres
public/              Manifest dan aset statis
tests/               Pengujian regresi
NOTICE.md            Asal-usul dan status hak pihak ketiga
```

## Pengelola dan kontribusi

**Andika Pramudya** · [andikapramudya-project](https://github.com/andikapramudya-project)

Identitas versi ini berada di `src/config.js`, `package.json`, `index.html`, dan
`public/manifest.json`. Saat melaporkan masalah, sertakan browser, perangkat,
langkah reproduksi, dan contoh percakapan fiktif tanpa data pribadi.

Belum ada lisensi distribusi umum yang diberikan untuk keseluruhan proyek.
Catatan asal-usul, dependensi, dan aset ada di [NOTICE.md](NOTICE.md).
