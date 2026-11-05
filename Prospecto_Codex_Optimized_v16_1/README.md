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

- Workspace terpisah, membership/role, produk, ICP, riset Firecrawl dengan review sumber dan promosi PIC.
- Leads manual, CSV/XLSX, mapping, deduplikasi dan export aman untuk spreadsheet.
- KMS privat: catatan/URL/PDF/DOCX/TXT, ekstraksi teks, indeks dan pencarian sumber sesuai workspace. PDF hasil scan memerlukan OCR di luar aplikasi.
- Draft berbasis profil produk dengan label template; adapter GPT Responses API disiapkan untuk `OPENAI_API_KEY` + `OPENAI_MODEL`. Tanpa kredensial itu, tombol GPT nonaktif dan tidak ada hasil AI yang diklaim.
- Campaign builder/template, personalisasi, review/approval, jadwal, SMTP TLS, antrean persisten, pause/cancel, suppression dan unsubscribe dengan konfirmasi. LinkedIn merupakan tugas manual.
- `sent` hanya sesudah SMTP menerima pesan. Analytics memakai event tersimpan; hasil percakapan manual berlabel manual. Tidak ada simulasi delivered/open atau pembacaan inbox otomatis.
- Undangan member terikat email yang telah dikonfirmasi, backup/restore ke workspace baru tanpa memulihkan credential atau menjalankan campaign, endpoint health dan worker berautentikasi.
- Akses presentasi 30 hari untuk akun yang ditentukan server. Pembayaran dibypass melalui akses ini, tanpa membuat invoice, langganan atau kredit berbayar palsu.

## Validasi dan pengiriman

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
```

Lihat [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md) untuk hasil dan batas validasi terbaru; [MANUAL_UPLOAD.md](MANUAL_UPLOAD.md) untuk environment, upload Node.js, domain/Auth URL, worker, backup dan rollback; [MIGRATIONS.md](MIGRATIONS.md) untuk pencocokan riwayat database. Bukti tambahan ada di `qa/presentation/` dan folder QA historis.

Hosting/domain/HTTPS final diatur manual. Pembayaran sengaja belum aktif. ChatGPT login tidak memberikan API key ke aplikasi; GPT masih memerlukan koneksi API terpisah. Local HTTP membatasi penerima SMTP ke allowlist server. Jangan masukkan `.env.local`, server key, SMTP password atau output build ke Git.
