# Identitas, asal-usul, dan hak pihak ketiga

Versi ini dikelola dan dikembangkan lebih lanjut oleh **Andika Pramudya** untuk
repository <https://github.com/andikapramudya-project/fake-chat>.
Identitas pengelola tidak menyatakan bahwa semua kode dan aset adalah karya asli pengelola.

## Kode awal

Folder yang diterima memuat README dan tautan aplikasi menuju
<https://github.com/AmirPhenomenal/fake-chat>. Struktur dan deskripsi fitur juga
sesuai dengan repository tersebut. Referensi ini dipertahankan sebagai catatan asal-usul.

Pada pemeriksaan 23 November 2026, salinan lokal dan daftar berkas utama repository
asal tidak menampilkan berkas lisensi proyek. Izin penggunaan, modifikasi, dan
redistribusi kode awal belum dapat dipastikan dari berkas yang tersedia.
Sebelum mempublikasikan salinan ini, pastikan izin dari pemegang hak kode awal.
Jika lisensi atau izin tersedia, simpan teks dan pemberitahuan yang diwajibkan di sini.

`license: UNLICENSED` pada package.json berarti versi ini belum memberikan lisensi
distribusi umum; nilai tersebut bukan klaim kepemilikan eksklusif atas kode pihak lain.
Tidak ada lisensi baru yang diterapkan pada seluruh kode awal.

## Dependensi dan aset

- React dan React DOM: Meta dan kontributor; MIT.
- Vite dan plugin React Vite: kontributor proyek masing-masing; MIT.
- html-to-image: kontributor proyek; MIT.
- Mediabunny: kontributor proyek; MPL-2.0.
- Roboto: The Roboto Project Authors; SIL Open Font License 1.1.
- `src/components/Icons.jsx` memuat sebagian ikon Material Icons (Apache-2.0), yaitu
  titik tiga dan kirim; pertahankan atribusinya. Ikon header, composer, perekaman, dan
  status bar digambar ulang sebagai SVG lokal untuk proyek ini dengan mencocokkan bentuk
  pada screenshot referensi; screenshot referensi tidak disimpan di repository.
- `src/images/whatsappLight.jpg`, `src/messageSend.mp3`, ikon di `public/`, dan
  gambar di `docs/` adalah aset bawaan folder awal. Pencipta dan izin redistribusinya
  belum terverifikasi. Jangan menyatakannya sebagai karya asli Andika Pramudya.

Lisensi dependensi tetap berlaku secara terpisah. Teks lisensi paket tersedia
di distribusi masing-masing dalam node_modules setelah `npm ci`.
WhatsApp dan Meta merupakan merek pihak ketiga; proyek ini tidak berafiliasi dengan keduanya.

Referensi: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository>.
