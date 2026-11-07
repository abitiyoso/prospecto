# Prospecto

Next.js/TypeScript sales workspace dengan Supabase Auth, PostgreSQL RLS dan private Storage. Landing yang disetujui tetap di `/`, referensi Workspace v15 di `/workspace.html`, aplikasi terautentikasi di `/app`. Logo, hero dan aset referensi dipertahankan.

## Menjalankan

Node.js 24, pnpm sesuai `packageManager` dalam `package.json`.

```sh
pnpm install --frozen-lockfile
# Salin .env.example ke .env.local dan isi environment server.
pnpm dev
# Terminal terpisah, setelah sender/campaign dikonfigurasi:
pnpm worker
```

Preview default: http://127.0.0.1:3000. Login memakai akun aplikasi Supabase; password mailbox SMTP berbeda dari password aplikasi. Konfirmasi email dan pemulihan password memakai Hostinger dari hello@elenio.id. Proyek Elenio telah dipilih pengguna dan migrasi sudah diterapkan; jangan menjalankan ulang foundation pada database tersebut.

## Fungsi

- Workspace terpisah, pengaturan peran/hapus anggota, pencabutan undangan dan perlindungan owner. Produk dengan pilihan kategori/industri dan multi buyer roles. Riset berdasarkan produk/KMS dan ICP menampilkan perusahaan, profil singkat, alasan kecocokan, dan PIC bernama dengan bukti publik. PIC yang siap dihubungi dapat dipilih langsung untuk membuat draft campaign; LEO memakai peran audience yang dipilih.
- Leads manual, CSV/XLSX, mapping, deduplikasi, daftar leads tersimpan dan export aman untuk spreadsheet.
- KMS privat: catatan/URL/PDF/DOCX/TXT, ekstraksi teks, indeks dan pencarian sumber sesuai workspace. PDF hasil scan memerlukan OCR di luar aplikasi.
- LEO menghasilkan draft AI nyata melalui 9Router atau OpenAI, dengan sumber KMS/ICP dari workspace, riwayat tersimpan dan penggunaan draft di editor campaign. Pilih provider lewat environment server; template tetap diberi label tanpa AI. Koneksi lokal 9Router dengan `cx/gpt-6-luna` sudah diuji sampai Apply/Save.
- Campaign builder/template, personalisasi, review/approval, jadwal, SMTP TLS, antrean persisten, pause/cancel, suppression dan unsubscribe dengan konfirmasi. LinkedIn merupakan tugas manual.
- `sent` hanya sesudah SMTP menerima pesan. Balasan positif dihitung sebagai balasan pada cabang dan analytics. Identitas pengirim/penerima unsubscribe diambil dari peluncuran asli, meskipun sender/kontak kemudian diubah. Riwayat antrean memiliki pagination per campaign.
- Undangan member terikat email yang telah dikonfirmasi. Menghapus anggota mencabut undangan lama serta antrean yang dikelolanya. Backup/restore mencakup file asli, daftar leads dan draft tanpa audience; validasi dilakukan sebelum menulis. Credential dan eksekusi tidak dipulihkan. Endpoint health dan worker berautentikasi tersedia.
- Akses presentasi 30 hari untuk akun yang ditentukan server. Pembayaran dibypass melalui akses ini, tanpa membuat invoice, langganan atau kredit berbayar palsu.

## Validasi dan pengiriman

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
```

Lihat [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md) untuk hasil dan batas validasi terbaru; [MANUAL_UPLOAD.md](MANUAL_UPLOAD.md) untuk environment, upload Node.js, domain/Auth URL, worker, backup dan rollback; [MIGRATIONS.md](MIGRATIONS.md) untuk pencocokan riwayat database. Bukti terbaru: [produk sampai campaign](qa/product-to-campaign-20261107/README.md), 84 tes dan satu pengiriman uji yang diterima Hostinger untuk mailbox sendiri. [QA sebelumnya](qa/acceptance-20261107/README.md) mencakup verifikasi/reset. Kandidat tanpa email bisnis bersumber tetap dapat disimpan, tetapi belum dapat menjadi penerima campaign email.

Hosting/domain/HTTPS final diatur manual. Pembayaran sengaja belum aktif. ChatGPT login tidak memberikan API key ke aplikasi; GPT masih memerlukan koneksi API terpisah. Local HTTP membatasi penerima SMTP ke allowlist server. Jangan masukkan `.env.local`, server key, SMTP password atau output build ke Git.
