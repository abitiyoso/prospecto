# Deploy Prospecto ke production

Production memakai `https://prospecto.elenio.id`. Arahkan deployment VPS/Docker ke branch `codex/prospecto-phase2` pada repository `abitiyoso/prospecto` dan pilih `Prospecto_Codex_Optimized_v16_1` sebagai root aplikasi. Di dalam container, jalankan `pnpm exec next start --hostname 0.0.0.0 --port 3000`. Reverse proxy yang melayani domain production meneruskan trafik ke port 3000 container.

Masukkan nilai berikut di environment deployment dan buat ulang container setelah nilainya disimpan.

| Variabel | Nilai di production |
|---|---|
| `APP_BASE_URL` | `https://prospecto.elenio.id` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qmuwqwzmezbatvatawur.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key proyek Elenio. Sediakan saat build dan saat aplikasi berjalan. |
| `SUPABASE_SECRET_KEY` | Secret key proyek Elenio. Sediakan saat aplikasi berjalan. `/api/health` memeriksa akses database dengan key ini. |
| `FIRECRAWL_API_KEY` | Key akun Firecrawl baru yang telah diuji di preview. |
| `AI_PROVIDER` | `9router` |
| `NINE_ROUTER_BASE_URL` | `https://9router.elenio.id/v1` |
| `NINE_ROUTER_MODEL` | `cx/gpt-6-luna` |
| `NINE_ROUTER_API_KEY` | API key khusus Prospecto dari 9Router Elenio. |

Salin nilai yang bersifat rahasia ke konfigurasi VPS atau secret store. Gunakan konfigurasi SMTP yang telah diuji, pertahankan `SMTP_DELIVERY_MODE=allowlist` selama pengujian, serta gunakan kembali `PROSPECTO_ENCRYPTION_KEY` dan `WORKER_SECRET` yang berlaku untuk data dan tautan pengiriman yang sudah ada.

## Paket aplikasi

Folder aplikasi adalah `Prospecto_Codex_Optimized_v16_1` di dalam repository, atau `prospecto/` jika memakai ZIP release. Gunakan hosting **Node.js 24**, bukan layanan upload HTML statis atau PHP saja. Landing dan workspace referensi tetap disertakan. ZIP source tidak menyertakan secret, hasil build lokal, dependency terpasang, atau bukti visual QA. Instal pnpm versi yang tercantum di `package.json`.

1. Checkout branch yang diserahkan dan jalankan `pnpm install --frozen-lockfile` di folder aplikasi.
2. Isi environment server dari `.env.example` sebelum build. Set `APP_BASE_URL` ke origin HTTPS final tanpa slash akhir. Aplikasi memakai origin ini untuk pemeriksaan CSRF dan redirect autentikasi ketika TLS ditangani reverse proxy. Jangan upload `.env.local` ke folder publik atau masukkan ke Git. Pertahankan `SMTP_DELIVERY_MODE=allowlist` untuk pemeriksaan awal.
3. Jalankan `pnpm typecheck`, `pnpm test`, `pnpm build`, lalu `pnpm start`. Default server bind ke `127.0.0.1:3000`. Atur domain/TLS di panel hosting. Reverse proxy HTTPS harus meneruskan `Host` asli dan menimpa `X-Forwarded-Proto` dengan protokol TLS yang benar. Untuk platform yang membutuhkan bind semua interface gunakan `pnpm exec next start --hostname 0.0.0.0 --port 3000` pada jaringan hosting yang sesuai.
4. Jalankan `pnpm release:check` dengan environment yang sama seperti proses web. Perintah mengecek HTTPS dan origin, health database, Supabase Auth, model 9Router, kredit Firecrawl, login SMTP, dan autentikasi worker. Perintah ini tidak membuat akun, menghasilkan draft, mengirim email, atau menjalankan antrean. `pnpm release:check --local` tersedia untuk preview loopback dan tidak menggantikan pemeriksaan dari server hosting.
5. Site URL proyek Elenio sudah disetel ke `https://prospecto.elenio.id`, dengan `https://prospecto.elenio.id/auth/confirm` sebagai redirect yang diizinkan. Redirect lokal tetap tersedia untuk pengujian. Pertahankan konfirmasi email dan custom SMTP Hostinger. Template ada di `supabase/templates/`. Di domain production, uji signup, tautan verifikasi, reset password, pencarian perusahaan/PIC, draft LEO, dan satu email ke mailbox sendiri. [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) · [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
6. Setelah uji tersebut lulus, jadwalkan worker jika membutuhkan pengiriman otomatis. Jalankan `pnpm worker` dengan supervisor/restart otomatis **atau** scheduler setiap menit yang melakukan POST `/api/worker` dengan header `Authorization: Bearer WORKER_SECRET`; gunakan salah satu. Satu panggilan memproses maksimal 3 langkah jatuh tempo; klaim database mencegah klaim ganda. `pnpm worker --once` adalah satu putaran aktif, sedangkan `pnpm worker --check` tidak mengambil antrean. Worker dan web harus memakai environment serta database yang sama. Jangan pasang secret pada URL.

## Environment dan data

- `NEXT_PUBLIC_SUPABASE_URL` / publishable key boleh di browser. `SUPABASE_SECRET_KEY` hanya server, untuk indeks, undangan dan worker. Gunakan proyek Elenio yang sudah ditentukan pengguna; migrasinya sudah diterapkan. Lihat `MIGRATIONS.md` sebelum menjalankan migrasi lagi.
- `PROSPECTO_ENCRYPTION_KEY`: 32 byte heksadesimal untuk AES-256-GCM kredensial sender. **Simpan backup terpisah dengan aman.** Menggantinya membuat kredensial lama tidak bisa dibaca; pengguna harus menghubungkan ulang sender.
- `WORKER_SECRET`: nilai acak terpisah; juga menandatangani tautan unsubscribe. Rotasi membatalkan tautan unsubscribe terdahulu. Jangan mengubahnya setiap restart.
- Konfigurasi SMTP Auth Supabase terpisah dari SMTP aplikasi. Aplikasi memakai `SMTP_*` untuk preset Hostinger dan undangan; sender lain dapat dimasukkan di Settings. From harus sama dengan akun SMTP. Verifikasi TLS nyata dilakukan sebelum penyimpanan terenkripsi.
- `PRESENTATION_MODE=true` dan `PRESENTATION_OWNER_EMAIL` (email login aplikasi, boleh dipisah koma) mengizinkan akun yang ditentukan mengaktifkan akses workspace 30 hari melalui Subscription & Credits. Ini tidak membuat pembayaran, invoice atau kredit berbayar. Akses hanya berlaku sebelum tanggal kedaluwarsa; payment adapter belum ada. Workspace utama pengguna sudah diberi akses presentasi dan preset sender diverifikasi tanpa mengirim campaign. Utilitas admin opsional: `node --conditions=react-server --import tsx scripts/configure-presentation.mts WORKSPACE_UUID` (memerlukan dependency dev `tsx`).
- `SMTP_DELIVERY_MODE=allowlist` (default bila kosong) membatasi campaign, email uji, dan undangan aplikasi ke `SMTP_PRESENTATION_RECIPIENTS`, termasuk pada staging HTTPS. Setelah siap menghubungi penerima nyata, ubah ke `live` pada origin HTTPS publik. Approval campaign tetap wajib. Mode ini tidak mengubah email registrasi dan reset yang dikirim oleh Supabase Auth.
- `FIRECRAWL_API_KEY` dipakai server untuk riset dan indeks URL. Batas bersama: 500 permintaan/hari server, 100/hari pengguna, 5/menit pengguna. Batas worker: 5 langkah/menit, 30/jam, 200/hari server. Hasil riset membutuhkan review manusia sebelum dipromosikan sebagai kontak terverifikasi.
- Konfigurasi AI Prospecto memakai `AI_PROVIDER=9router`, `NINE_ROUTER_BASE_URL=https://9router.elenio.id/v1`, `NINE_ROUTER_MODEL=cx/gpt-6-luna`, dan `NINE_ROUTER_API_KEY` khusus aplikasi yang diterbitkan dashboard 9Router Elenio. Masukkan key di environment server hosting sebelum menjalankan `pnpm start`. 9Router perlu koneksi provider Codex aktif. Provider alternatif memakai `AI_PROVIDER=openai` dengan `OPENAI_API_KEY` dan `OPENAI_MODEL` dari akun OpenAI API.
- Jalankan `pnpm release:check`, lalu coba pencarian company dan PIC setelah mengubah konfigurasi AI. `/v1/models` memeriksa daftar model. Pencarian nyata menguji apakah provider di belakang model bisa menghasilkan jawaban. Saat OAuth Codex mengarah ke callback `localhost` yang gagal dibuka, tempel URL callback lengkap ke dialog koneksi di dashboard 9Router yang memulai OAuth.

## Pengiriman dan laporan

Email hanya diluncurkan setelah konten dan audience lolos review/approval serta sender terverifikasi. Konten yang berubah, role hilang, sender berubah, akses berakhir atau suppression menghentikan pemrosesan. Pause/cancel berlaku pada pekerjaan yang belum dikirim; pesan yang sudah diterima SMTP tidak dapat ditarik kembali.

`sent` berarti SMTP menerima pesan; tidak berarti delivered/open. Tidak ada tracking open/delivery atau pembacaan inbox otomatis. Balasan, meeting, bounce dan hasil percakapan dapat dicatat secara manual beserta bukti dan diberi asal manual pada analytics. LinkedIn selalu tugas manual. Network timeout/hasil pengiriman ambigu masuk `needs_attention` dan tidak dikirim ulang otomatis; cocokkan Message-ID di provider sebelum mengambil tindakan. Launch yang identik dideduplikasi; ubah draft dan review ulang untuk peluncuran baru.

## Backup dan pemulihan

Settings menyediakan arsip produk, KMS beserta file asli, ICP, leads dan draft campaign. Restore membuat workspace baru dengan UUID baru; tidak memulihkan approval, sender, antrean kirim, sesi atau pembayaran. Dokumen perlu diindeks ulang. Batas arsip restore 10 MB, file asli total 20 MB sebelum kompresi. Ini backup isi workspace, bukan pengganti backup database/PITR dan Storage hosting. Jadwalkan backup database dan bucket melalui Supabase/penyedia hosting sesuai paket yang tersedia; simpan kunci enkripsi di tempat terpisah.

Daftar leads beserta anggotanya dan draft kosong ikut dipulihkan. Batas tambahan: 999 file, 40 MB seluruh isi sebelum kompresi, 5.000 baris per jenis data. Upload yang belum tersimpan harus diselesaikan atau dihapus sebelum backup. File/referensi yang hilang pada arsip menyebabkan penolakan sebelum workspace dibuat. Nama workspace hingga 160 karakter diterima; nama hasil restore dipotong seperlunya agar akhiran `(restored)` tetap muat.

Owner dapat mengubah admin/member dan mencabut akses. Admin hanya dapat menghapus member; owner tidak dapat dihapus/didemote lewat fungsi ini. Anggota non-owner bisa keluar sendiri. Penghapusan/demotion membatalkan antrean yang dikelola pengguna serta mencabut undangan lama ketika akses dihapus. SMTP yang sudah terlanjur menerima pesan tidak dapat ditarik kembali.

Rollback aplikasi: checkout commit release sebelumnya dan build ulang. Jangan rollback SQL dengan menghapus tabel berisi data; gunakan migrasi perbaikan maju. Simpan release sebelumnya dan uji di staging sebelum mengganti proses produksi.

## Batas kesiapan

Domain production sudah melayani halaman Prospecto. Login dan pemakaian token konfirmasi berhasil di domain itu, sementara `/api/health` masih HTTP 503 saat diperiksa. Jalankan `pnpm release:check` dari konfigurasi VPS setelah memperbarui container. Pembayaran belum diaktifkan. Pertahankan akses presentasi pada workspace yang membutuhkannya. Pantau `/api/health`, restart proses, dan catat kegagalan worker tanpa mencatat secret.
