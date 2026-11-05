# Pemeriksaan terbaru — handoff presentasi

Update fungsional berikutnya: empat area bug audit sudah diperbaiki (balasan positif, unsubscribe setelah sender diganti, pengecualian ICP, validasi/restore). Pengaturan anggota, pencabutan undangan, daftar leads, status KMS dan pagination antrean juga tersedia. Bukti terbaru: 70 tes, TypeScript/build, dan uji API/browser di `qa/functional-repair/`. Semua 39 tabel publik memakai RLS. Batas provider/deployment di bawah tetap berlaku; catatan 61 tes adalah audit sebelumnya.

Temuan implementasi di audit lama di bawah telah ditindaklanjuti: KMS diekstrak/diindeks, DOCX/XLSX dan undangan aktif, sender SMTP/antrean/suppression/unsubscribe berfungsi, event sent nyata tercatat, backup–restore workspace diuji, budget akun/server diterapkan dan migrasi diselaraskan. Bukti terkini: 61 tes, build/TypeScript, audit dependency nol, pengiriman own-mailbox dan inbox cocok, PDF di runtime production, empat ukuran layar tanpa overflow, aset/pixel landing tetap sama. Detail di IMPLEMENTATION_STATE.md dan qa/presentation/.

Belum: hosting/domain/HTTPS serta URL Auth final (manual sesuai permintaan), GPT API key/model + uji provider nyata, penagihan (sengaja bypass). Tidak ada webhook delivered/open/inbox otomatis; hasil percakapan diberi label manual. Global worker tidak dinyalakan dalam handoff; probe autentikasi tanpa antrean lulus dan pengiriman diuji hanya per-workspace ke mailbox sendiri. Monitoring/supervisor dan backup database/Storage perlu dipasang pada host final. Warning lama Supabase leaked-password protection tetap tercatat. Panduan: MANUAL_UPLOAD.md.

## Audit historis sebelum penyelesaian fungsi

# Pemeriksaan pra-deploy Prospecto — 5 November 2026

Scope: kesiapan implementasi saat ini; pembayaran dikecualikan. Verdict: layak staging/internal untuk alur manual yang sudah tersedia, belum layak rilis publik sebagai SaaS outreach/AI lengkap. Tidak ada deployment atau perubahan pengaturan hosted pada audit ini.

## Pemeriksaan terbaru

- 50 unit/PostgreSQL tests, TypeScript dan build produksi lulus.
- Production build dijalankan sementara di 127.0.0.1:3105. Tujuh pemeriksaan HTTP lulus; API command/upload/research menolak tanpa login (401), CSRF asing ditolak (403), halaman password tanpa sesi meminta recovery.
- 12 JavaScript client assets dipindai: key Firecrawl server tidak ditemukan.
- Supabase Elenio ACTIVE_HEALTHY. Security advisor hanya mengembalikan warning lama Leaked Password Protection Disabled, tanpa temuan RLS/definer baru. Pengujian isolasi tenant/role pada suite PostgreSQL lulus.
- Ditemukan advisory high Zod <4.6.6. Dipatch dari 4.3.6 ke versi exact 4.6.6; lockfile diperbarui. Audit produksi sesudah patch: info/low/moderate/high/critical = 0. Sumber advisory: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 .
- DNS elenio.id memiliki SPF Hostinger, MX Hostinger, dan DMARC p=reject. DKIM/deliverability penerima eksternal belum diaudit pada run ini. DNS prospecto.elenio.id mengembalikan name does not exist.
- Bukti SMTP/reset terbaru dari run sebelumnya: email nyata dari hello@elenio.id dengan template Indonesia, recovery di cookie context baru, CSRF dan replay denial. Email confirmation ON. Tidak mengirim email baru pada audit ini.

## Yang masih kurang di luar pembayaran

1. Hosting/domain produksi: akses akun hosting dan DNS, SSL, konfigurasi environment server, production Site URL/redirect Supabase. Saat ini Auth masih memakai 127.0.0.1/localhost. Uji ulang signup-confirmation-login-reset pada HTTPS/domain final, termasuk cookie/proxy/origin. Jangan memakai URL lokal untuk email pengguna publik.
2. LEO/KMS: provider LLM belum terhubung; extraction/indexing/RAG privat belum diimplementasikan. Catatan/URL/upload KMS tersimpan tetapi indexing pending. Perlu API key provider serta pipeline dan pengujian grounding/isolasi KMS; key saja tidak mengaktifkan fitur.
3. Pengiriman campaign: baru draft/sequence/template/personalisasi/approval. Sender OAuth, worker/queue/jadwal, retry idempotent, suppression/unsubscribe dan webhook event provider belum diimplementasikan/terhubung. SMTP Hostinger yang sudah aktif menangani Auth, bukan transport campaign. LinkedIn tetap tugas manual.
4. Analytics delivery: agregasi/date/campaign filter siap, tetapi belum ada producer event pengiriman nyata karena sender belum aktif. Angka nol adalah keadaan aktual, bukan bukti integrasi delivery.
5. Kelengkapan fitur: undangan anggota belum tersedia; CSV tersedia, XLSX belum; KMS PDF/TXT tersedia, DOCX dan indexing belum. Perlu diselesaikan atau dibatasi secara jelas pada lingkup rilis beta.
6. Operasional/security publik: pasang pembatasan abuse/budget Firecrawl per akun/global (saat ini 3 permintaan/menit/workspace), kontrol signup/SMTP quota, monitoring/error alert, backup database DAN Storage, uji restore/rollback. Leaked-password protection masih OFF; cek dukungan paket sebelum mengaktifkannya.
7. Release/migrations: versi file migrasi lokal berbeda dari history hosted MCP; jangan menjalankan db push membabi-buta. Selaraskan versi/history untuk pipeline deploy tanpa mengulang DDL. Live signup-heavy suites lama bergantung auto-confirm dan perlu verified disposable mailbox, bukan mematikan confirmation. Uji end-to-end signup baru dengan confirmation aktif dan beban multi-koneksi belum menjadi bukti run ini.

## Bukti dan batas kesimpulan

qa/final-check/tests.txt, build.txt, dependencies-before.json, dependencies.json, production-smoke.json. Visual desktop/mobile dan alur authenticated yang sudah lulus ada pada qa/phase0, qa/v8-phase2, qa/v8-phase3, qa/v8-phase4, qa/firecrawl dan qa/auth-smtp; itu bukti milestone sebelumnya, bukan klaim semua E2E tersebut dijalankan ulang hari ini setelah confirmation aktif. Run ini tidak membuktikan perilaku HTTPS hosting publik, concurrency hosted multi-koneksi, integrasi LEO atau pengiriman campaign.
