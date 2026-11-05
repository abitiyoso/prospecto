Status terbaru: V8 Phase 4 — commercial foundation/reporting. Lihat [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md) dan [bukti QA](qa/v8-phase4/results.json). Checkout dan worker pembayaran belum terhubung; laporan fase sebelumnya di bawah bersifat historis.

Status terkini dan batas integrasi: [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md). Laporan Phase 1 di bawah dipertahankan sebagai riwayat; urutan campaign, template dan approval Phase 3 sudah tersedia. LEO dan pengiriman masih diblokir sampai provider terhubung.

# Prospecto — V8 Phase 3 authoring/review

Aplikasi Next.js/TypeScript dengan Supabase Auth, PostgreSQL RLS, dan private Storage. UI memakai logo, aset, warna, layout, dan CSS referensi v16.1. Workspace pelanggan dimulai kosong.

## Menjalankan

Prasyarat: Node.js 24 dan pnpm 11.25.0.

```powershell
cd C:\Users\metan\Documents\ChatGPT\Prospecto\Prospecto_Codex_Optimized_v16_1
pnpm install --frozen-lockfile
# .env.local sudah terhubung ke proyek Elenio pada workspace ini.
# Untuk checkout baru, salin .env.example dan isi nilai Supabase.
pnpm dev
```

Buka http://127.0.0.1:3000. Tanpa konfigurasi, aplikasi menampilkan koneksi belum tersedia dan menonaktifkan login; tidak membuka workspace palsu.

## Backend lokal

Docker diperlukan untuk seluruh stack Supabase dan tidak tersedia dalam lingkungan pengerjaan ini. Konfigurasi lokal telah disediakan, tanpa seed pelanggan.

```powershell
pnpm exec supabase start
pnpm exec supabase status
```

Salin API URL dan publishable/anon key lokal ke `.env.local`. `supabase start` menerapkan migrasi pada stack baru. Jangan gunakan service-role/secret key. Untuk database lokal yang sudah ada, ikuti mekanisme migrasi Supabase; `supabase db reset --no-seed` **menghapus data lokal** dan hanya sesuai untuk database uji yang boleh dihapus.

Untuk proyek hosted yang dipilih khusus bagi Prospecto, terapkan `supabase/migrations/20261104180159_prospecto_foundation.sql`, atur URL Auth dan redirect `/auth/callback` serta `/auth/callback?next=/auth/password`, konfirmasi email dan SMTP, lalu uji dua pengguna dari tenant berbeda. Proyek Elenio (qmuwqwzmezbatvatawur) telah diaktifkan dan dipilih pengguna untuk Prospecto. Dua migrasi telah diterapkan dan login/Storage/isolation diuji live. Aplikasi web belum dideploy.

## Alur tersedia

1. Daftar/konfirmasi email → masuk → buat workspace kosong. Logout dan reset/ganti password memakai Supabase Auth.
2. Tambah/edit produk: nama, kategori, pain points, industri, buyer roles, value proposition, harga/konteks.
3. Tambah catatan, URL HTTPS, atau PDF/TXT ke Product KMS. Maksimal 10 MB. Pengindeksan tetap pending; URL tidak di-fetch. Upload gagal memiliki status terpisah.
4. Kelola kontak manual, sumber, dan verifikasi manual. Impor CSV UTF-8 maksimal 2 MB/1.000 baris dengan pemetaan, validasi, laporan, deduplikasi email/domain. Ekspor owner/admin melindungi formula spreadsheet.
5. Pilih kontak → buat campaign draft → edit pesan dan lihat audience yang persis dipilih. Pengiriman diblokir.
6. Workspace switch membersihkan state UI. Akses melalui session pengguna, membership server, dan RLS; tanpa service-role bypass.

Owner/admin dapat menghapus produk/KMS/kontak dan mengekspor. Member dapat membaca/menambah/memperbarui konten, tanpa menghapus atau mengubah membership. Undangan anggota diblokir dengan penjelasan. Riset/PIC, LEO, sender, analytics pengiriman, subscription, dan pembayaran menampilkan keadaan belum terhubung. Phase 2–4 tidak dikerjakan.

DOCX/XLSX belum tersedia karena parser terverifikasi belum diintegrasikan. PDF/TXT disimpan privat, belum diindeks. Impor tidak menimpa email yang sudah tersimpan di workspace.

## Verifikasi

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm test:visual
```

QA memakai Chrome lokal dan port 3187. Skrip membuat rute development sementara dengan identitas QA terisolasi, menolaknya di production, lalu menghapusnya. Screenshot ada di `qa/phase1/`. Interaksi browser mengintersep respons command untuk memeriksa payload; persistence/RLS diperiksa terpisah dengan PostgreSQL melalui PGlite. Ini bukan bukti Supabase Auth/Storage HTTP live.

Status dan batas verifikasi: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Operasi

- Simpan kredensial di environment/secret manager. Aplikasi hanya membutuhkan URL/publishable key. Jangan commit `.env.local`.
- Atur backup database **dan objek Storage** di proyek yang benar. Uji pemulihan pada staging; backup SQL tidak mencakup bytes objek Storage.
- Audit append-only menyimpan workspace, actor, entity ID, operasi dan waktu; tanpa isi catatan/email/kredensial.
- Penghapusan produk membersihkan Storage sebelum metadata. Jika gagal di tengah, coba ulang sebagai owner/admin dan cocokkan metadata/objek; tidak ada transaksi lintas Storage/PostgreSQL.
- Pencabutan membership berlaku pada lookup database request berikutnya. Server memverifikasi Auth dengan `getUser()`.
- Sebelum produksi: jalankan security advisors, E2E Auth/Storage dua tenant, periksa SMTP/redirect/HTTPS, backup dan rate control di gateway.

Sumber yang diperiksa: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Storage ACL](https://supabase.com/docs/guides/storage/security/access-control), [changelog CLI v3](https://supabase.com/changelog), dan dokumentasi Next.js 16.4.5 dalam paket terpasang. Inter disajikan lokal; lisensi di `public/fonts/INTER_LICENSE.txt`.


## Status email terbaru

Konfirmasi dan reset password melalui email asli ke `hello@elenio.id` telah lulus. Bukti: `qa/phase1/email-results.json`. Akun tersebut sudah dikonfirmasi dan belum memiliki workspace; gunakan **Lupa kata sandi** untuk membuat password pribadi. Password pengujian tidak disimpan.

Untuk pengguna publik, SMTP khusus masih perlu dikonfigurasi. Lihat `docs/CREDENTIALS_AND_CONNECTIONS.md` untuk daftar koneksi/kredensial yang benar-benar diperlukan. Landing page menunggu prompt tersendiri; implementasi berhenti di Phase 1 sesuai prompt master.
