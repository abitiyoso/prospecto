# Riwayat migrasi Elenio

Migrasi lokal diselaraskan dengan versi yang sudah diterapkan melalui Supabase MCP pada proyek qmuwqwzmezbatvatawur. SQL migrasi lama tidak diubah, hanya nama/timestamp file. Tes memuat seluruh file SQL berurutan.

| Versi lokal lama | Versi hosted / lokal sekarang |
|---|---|
| 20261104180159 | 20261104223027 |
| 20261104223206 | 20261104223239 |
| 20261104234302 | 20261104234532 |
| 20261104235659 | 20261104235939 |
| 20261105001844 | 20261105002417 |
| 20261105002739 | 20261105002929 |
| 20261105004019 | 20261105005053 |
| 20261105012958 | 20261105121950 |
| 20261105122754 | 20261105122807 |
| 20261105135532 | 20261105141025 |
| 20261107011209 | 20261107011858 |

Jangan menjalankan ulang foundation pada database Elenio yang sudah berisi schema. Cocokkan supabase migration list terlebih dahulu. Database baru: terapkan semua migrasi berurutan menggunakan CLI dan konfigurasi Supabase resmi. Auth/SMTP, URL redirect, dan secrets dikelola terpisah; tidak disimpan dalam migrasi.

Migrasi kesepuluh `functional_repair` menyimpan identitas sender per peluncuran, memperbaiki hitungan balasan positif, menambah lifecycle anggota/undangan melalui RPC terotorisasi, serta dua tabel daftar leads dengan RLS. Seluruh 39 tabel publik memakai RLS. Backfill sender hanya dilakukan ketika koneksi belum berubah sejak peluncuran; pemeriksaan hosted menemukan nol peluncuran yang ambigu. Worker tidak akan mengirim dari identitas historis yang tidak dapat dipastikan.

Migrasi kesebelas `20261107011858_leo_router_provider` sudah diterapkan di Elenio. Riwayat LEO menerima engine `9router` serta menyimpan `model` aktual dan `requested_model`. Template lama tetap memakai nilai kosong untuk model. Tidak ada data lama dihapus atau kebijakan RLS dilonggarkan; insert LEO tetap hanya melalui server. Riwayat sebelas migrasi cocok dengan hosted.
