# Prospecto

Kode aplikasi aktif berada di [Prospecto_Codex_Optimized_v16_1](Prospecto_Codex_Optimized_v16_1/README.md).

Kode aplikasi, migrasi Supabase, pengujian, screenshot QA, dan petunjuk startup tersedia di folder tersebut. Status terperinci: [IMPLEMENTATION_STATUS.md](Prospecto_Codex_Optimized_v16_1/IMPLEMENTATION_STATUS.md).

Status terkini: V8 Phase 0–2, integrasi Firecrawl, dan authoring/review Phase 3 selesai untuk alur yang dicatat dalam [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md). Landing v7 dan workspace v15 dipertahankan; aplikasi berautentikasi ada di `/app`. Sebanyak 37 tes lokal dan build produksi lulus, dengan bukti integrasi live di folder QA. Sequence, template, personalisasi dan approval tersimpan; LEO dan pengiriman masih membutuhkan koneksi provider. Berikutnya: Phase 4 — Commercial + reporting.

```powershell
cd Prospecto_Codex_Optimized_v16_1
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Isi konfigurasi lokal, lalu:
pnpm dev
```

Jangan commit `.env.local`. Supabase URL/publishable key dan Firecrawl server key harus disediakan di environment masing-masing. Detail integrasi, batas kemampuan, migrasi, verifikasi, dan langkah berikutnya ada di `IMPLEMENTATION_STATE.md`. Aplikasi belum dideploy; SMTP khusus dan layanan fase berikutnya belum dikonfigurasi.
