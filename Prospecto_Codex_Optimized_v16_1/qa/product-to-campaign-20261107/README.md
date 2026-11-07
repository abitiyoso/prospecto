# QA — produk sampai campaign, 7 November 2026

Pengujian memakai preview produksi lokal dan workspace QA terisolasi di Supabase Elenio. Penawaran uji: perangkat lunak billing sewa dan smart room untuk operator kos, dengan pengetahuan produk yang diindeks dan target Jakarta.

| Tahap | Bukti |
|---|---|
| Perusahaan yang cocok | Tanpa mengetik kata kunci, pencarian menyusun target `pengelola kos Jakarta situs resmi`. Firecrawl dan 9Router menemukan Singgahsini dan ZIPKOS. |
| Profil dan alasan | Profil tersimpan dapat dibuka kembali untuk produk yang sama. Contoh: sumber Singgahsini menyebut penagihan otomatis; ini mendukung potensi relevansi billing. Kebutuhan, anggaran dan minat membeli belum diketahui. |
| Decision maker | Rujukan bisnis publik memuat nama dan jabatan Maria Regina Anggit di Singgahsini. Tidak ada email bisnis di sumber. Kandidat bisa disimpan; pilihan kandidat ini memblokir pembuatan draft email sampai dilengkapi dan ditinjau. |
| Campaign | Browser membuat draft dengan produk yang benar dan hanya satu PIC uji yang dicentang. PIC uji lain tidak masuk. LEO memakai peran audience melalui 9Router (`gpt-6-luna`), dan Hostinger menerima satu email uji ke `hello@elenio.id`. Tidak ada pengiriman ke prospek. Bukti SMTP mencatat penerimaan oleh server, bukan penempatan di inbox. |

[Hasil riset dan sumber](discovery-results.json) · [Uji draft idempoten](draft-results.json) · [Hasil 9Router dan SMTP](campaign-results.json).

[Profil dan PIC](01-company-and-pic.png) · [Draft dan audience terpilih](02-selected-campaign.png) · [Editor pada viewport ponsel 390 px](03-mobile-campaign.png).

84 tes, TypeScript, build produksi, [smoke HTTP dan dry check worker](http-smoke.json), serta [pemeriksaan secret browser](client-secrets.json) lulus. Hosted: 12 migrasi, 39/39 tabel publik memakai RLS; fungsi draft memakai izin pemanggil dan ditolak untuk role anonim. Akun QA diblokir, kredensial sementara dan SMTP uji dibersihkan, dan antrean QA dibatalkan. Worker global tidak dijalankan.

Batas: sumber publik tidak selalu memuat nama atau email terkini. Email harus ditinjau dengan bukti; pengayaan kontak eksternal belum terhubung. Hosting domain dan penjadwalan worker masih perlu dipasang untuk pengiriman otomatis di produksi.
