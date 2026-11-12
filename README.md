# Monitoring Pembangunan

Pemantauan progres pembangunan daerah. Prototipe portofolio independen, bukan aplikasi resmi pemerintah.

## Fitur utama

- CRUD proyek/kategori, anggaran rupiah bulat, tanggal mulai/target, status dan arsip/pemulihan.
- Laporan progres aktual 0–100%, riwayat petugas, grafik dari laporan tersimpan dan identifikasi keterlambatan menurut WIB.
- Pencarian, filter kategori/status/terlambat/arsip dan ekspor CSV realisasi pekerjaan.
- Admin mengelola proyek/kategori; Admin dan Petugas mencatat progres. Tidak ada progres acak.

## Teknologi

Next.js, React, TypeScript, Node.js 22.18+, SQLite.

## Cara instalasi

~~~powershell
cd C:\laragon\www\monitoring-pembangunan
npm install
npm run user
npm run build
~~~

Buat Admin dan ulangi untuk Petugas melalui prompt. Tidak ada akun bawaan.

## Cara menjalankan

~~~powershell
npm start
~~~

Buka http://127.0.0.1:5481. Pengembangan: npm run dev. Tes: npm test. SQLite data/app.sqlite dibuat otomatis dan aman diinisialisasi ulang. APP_DB mengganti lokasi; SECURE_COOKIE=1 untuk HTTPS. Progres terbaru mengikuti tanggal laporan lalu urutan pencatatan; Selesai hanya muncul untuk laporan 100%. Koreksi dilakukan dengan laporan baru. Gunakan data proyek demonstrasi.
