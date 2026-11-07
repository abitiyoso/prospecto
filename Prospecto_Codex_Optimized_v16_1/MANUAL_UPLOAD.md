# Upload manual Prospecto

## Paket aplikasi

Folder aplikasi adalah `Prospecto_Codex_Optimized_v16_1` di dalam repository. Gunakan hosting **Node.js 24**, bukan layanan upload HTML statis atau PHP saja. Landing dan workspace referensi tetap disertakan. Instal pnpm versi yang tercantum di `package.json`.

1. Checkout branch yang diserahkan dan jalankan `pnpm install --frozen-lockfile` di folder aplikasi.
2. Isi environment server memakai daftar `.env.example`. Jangan upload `.env.local` ke folder publik atau masukkan ke Git.
3. Jalankan `pnpm typecheck`, `pnpm test`, `pnpm build`, lalu `pnpm start`. Default server bind ke `127.0.0.1:3000`; reverse proxy HTTPS harus meneruskan host/origin asli. Untuk platform yang membutuhkan bind semua interface gunakan `pnpm exec next start --hostname 0.0.0.0 --port 3000` pada jaringan hosting yang sesuai.
4. Set `APP_BASE_URL` ke origin HTTPS final (tanpa slash akhir). Atur domain/SSL melalui panel hosting, sesuai rencana upload manual.
5. Di Supabase Auth, ubah Site URL ke origin final dan tambahkan tepat `https://DOMAIN/auth/confirm` serta callback OAuth/legacy yang memang dipakai. Pertahankan konfirmasi email ON dan custom SMTP Hostinger. Template email ada di `supabase/templates/`; pengaturan SMTP/URL berada di dashboard, bukan migrasi SQL.
6. Jalankan `pnpm worker --check` untuk memeriksa koneksi dan autentikasi tanpa memproses antrean/mengirim email. Untuk operasi terjadwal, jalankan `pnpm worker` sebagai proses terpisah dengan supervisor/restart otomatis. Alternatif: scheduler setiap menit melakukan POST `/api/worker` dengan header `Authorization: Bearer WORKER_SECRET`. Jangan pasang secret pada URL. Satu panggilan memproses maksimal 3 langkah jatuh tempo; klaim database mencegah klaim ganda. `pnpm worker --once` untuk satu putaran aktif. Worker dan web harus menggunakan environment serta database yang sama. Worker global tidak dinyalakan dalam sesi handoff ini; presentasi dapat memakai tombol Proses antrean sekarang pada workspace setelah peluncuran yang dikonfirmasi.
7. Periksa GET `/api/health` = 200, lalu login, tambah produk, indeks sumber, buat draft, koneksi sender, test mailbox sendiri, review campaign dan backup–restore di workspace uji.

## Environment dan data

- `NEXT_PUBLIC_SUPABASE_URL` / publishable key boleh di browser. `SUPABASE_SECRET_KEY` hanya server, untuk indeks, undangan dan worker. Gunakan proyek Elenio yang sudah ditentukan pengguna; migrasinya sudah diterapkan. Lihat `MIGRATIONS.md` sebelum menjalankan migrasi lagi.
- `PROSPECTO_ENCRYPTION_KEY`: 32 byte heksadesimal untuk AES-256-GCM kredensial sender. **Simpan backup terpisah dengan aman.** Menggantinya membuat kredensial lama tidak bisa dibaca; pengguna harus menghubungkan ulang sender.
- `WORKER_SECRET`: nilai acak terpisah; juga menandatangani tautan unsubscribe. Rotasi membatalkan tautan unsubscribe terdahulu. Jangan mengubahnya setiap restart.
- Konfigurasi SMTP Auth Supabase terpisah dari SMTP aplikasi. Aplikasi memakai `SMTP_*` untuk preset Hostinger dan undangan; sender lain dapat dimasukkan di Settings. From harus sama dengan akun SMTP. Verifikasi TLS nyata dilakukan sebelum penyimpanan terenkripsi.
- `PRESENTATION_MODE=true` dan `PRESENTATION_OWNER_EMAIL` (email login aplikasi, boleh dipisah koma) mengizinkan akun yang ditentukan mengaktifkan akses workspace 30 hari melalui Subscription & Credits. Ini tidak membuat pembayaran, invoice atau kredit berbayar. Akses hanya berlaku sebelum tanggal kedaluwarsa; payment adapter belum ada. Workspace utama pengguna sudah diberi akses presentasi dan preset sender diverifikasi tanpa mengirim campaign. Utilitas admin opsional: `node --conditions=react-server --import tsx scripts/configure-presentation.mts WORKSPACE_UUID` (memerlukan dependency dev `tsx`).
- Preview HTTP lokal membatasi tujuan email ke `SMTP_PRESENTATION_RECIPIENTS`. Origin HTTPS membuka tujuan email normal setelah audience ditinjau dan dikonfirmasi di aplikasi.
- `FIRECRAWL_API_KEY` dipakai server untuk riset dan indeks URL. Batas bersama: 500 permintaan/hari server, 100/hari pengguna, 5/menit pengguna. Batas worker: 5 langkah/menit, 30/jam, 200/hari server. Hasil riset membutuhkan review manusia sebelum dipromosikan sebagai kontak terverifikasi.
- Pilih AI di server: `AI_PROVIDER=9router`, `NINE_ROUTER_BASE_URL=http://127.0.0.1:20128/v1`, `NINE_ROUTER_API_KEY` dan `NINE_ROUTER_MODEL=cx/gpt-6-luna`. Jalankan 9Router dengan provider/model yang terhubung. `AI_REASONING_EFFORT=low` opsional dan harus didukung model. Konfigurasi lokal ini sudah diuji sampai draft nyata tersimpan dan digunakan di campaign. Provider alternatif: `AI_PROVIDER=openai` dengan `OPENAI_API_KEY` + `OPENAI_MODEL`. Key antar-provider tidak dipertukarkan. API OpenAI langsung pada pemeriksaan awal menolak karena kredit habis; konfigurasi aktif memakai 9Router. Semua key hanya di environment server.
- Saat upload ke hosting, alamat `127.0.0.1` mengacu ke mesin hosting, bukan komputer pengguna. Jalankan 9Router pada mesin tersebut atau gunakan endpoint HTTPS 9Router yang dapat dijangkau server. Uji `/v1/models` dan generasi sesudah memindahkannya. Jika provider mati/kuota habis/keluaran tidak valid, aplikasi menampilkan kegagalan tanpa menyimpan hasil AI palsu; template tetap tersedia secara terpisah. Tidak ada failover diam-diam ke provider lain.

## Pengiriman dan laporan

Email hanya diluncurkan setelah konten dan audience lolos review/approval serta sender terverifikasi. Konten yang berubah, role hilang, sender berubah, akses berakhir atau suppression menghentikan pemrosesan. Pause/cancel berlaku pada pekerjaan yang belum dikirim; pesan yang sudah diterima SMTP tidak dapat ditarik kembali.

`sent` berarti SMTP menerima pesan; tidak berarti delivered/open. Tidak ada tracking open/delivery atau pembacaan inbox otomatis. Balasan, meeting, bounce dan hasil percakapan dapat dicatat secara manual beserta bukti dan diberi asal manual pada analytics. LinkedIn selalu tugas manual. Network timeout/hasil pengiriman ambigu masuk `needs_attention` dan tidak dikirim ulang otomatis; cocokkan Message-ID di provider sebelum mengambil tindakan. Launch yang identik dideduplikasi; ubah draft dan review ulang untuk peluncuran baru.

## Backup dan pemulihan

Settings menyediakan arsip produk, KMS beserta file asli, ICP, leads dan draft campaign. Restore membuat workspace baru dengan UUID baru; tidak memulihkan approval, sender, antrean kirim, sesi atau pembayaran. Dokumen perlu diindeks ulang. Batas arsip restore 10 MB, file asli total 20 MB sebelum kompresi. Ini backup isi workspace, bukan pengganti backup database/PITR dan Storage hosting. Jadwalkan backup database dan bucket melalui Supabase/penyedia hosting sesuai paket yang tersedia; simpan kunci enkripsi di tempat terpisah.

Daftar leads beserta anggotanya dan draft kosong ikut dipulihkan. Batas tambahan: 999 file, 40 MB seluruh isi sebelum kompresi, 5.000 baris per jenis data. Upload yang belum tersimpan harus diselesaikan atau dihapus sebelum backup. File/referensi yang hilang pada arsip menyebabkan penolakan sebelum workspace dibuat. Nama workspace hingga 160 karakter diterima; nama hasil restore dipotong seperlunya agar akhiran `(restored)` tetap muat.

Owner dapat mengubah admin/member dan mencabut akses. Admin hanya dapat menghapus member; owner tidak dapat dihapus/didemote lewat fungsi ini. Anggota non-owner bisa keluar sendiri. Penghapusan/demotion membatalkan antrean yang dikelola pengguna serta mencabut undangan lama ketika akses dihapus. SMTP yang sudah terlanjur menerima pesan tidak dapat ditarik kembali.

Rollback aplikasi: checkout commit release sebelumnya dan build ulang. Jangan rollback SQL dengan menghapus tabel berisi data; gunakan migrasi perbaikan maju. Simpan release sebelumnya dan uji di staging sebelum mengganti proses produksi.

## Batas kesiapan

Hosting/domain/HTTPS dan URL Auth final masih manual. Pembayaran sengaja belum diaktifkan. AI lokal sudah terhubung ke 9Router; pindahkan konfigurasi server dan koneksi provider saat upload. Hosting harus memonitor `/api/health`, restart proses, dan mencatat kegagalan worker (tanpa secret); kegagalan langkah tercatat sebagai status antrean/operational event. Peringatan Supabase leaked-password protection bawaan proyek perlu ditangani sesuai kemampuan paket Auth. Lakukan test signup/reset terbaru setelah origin produksi diganti. Verifikasi/reset browser lokal sudah diuji; penerimaan email signup baru ke inbox merupakan pemeriksaan terpisah dari uji token QA.
