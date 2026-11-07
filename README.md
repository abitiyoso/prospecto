# Prospecto

Kode aplikasi aktif berada di [Prospecto_Codex_Optimized_v16_1](Prospecto_Codex_Optimized_v16_1/README.md).

Kode aplikasi, migrasi Supabase, pengujian, screenshot QA, dan petunjuk startup tersedia di folder tersebut. Status terperinci: [IMPLEMENTATION_STATUS.md](Prospecto_Codex_Optimized_v16_1/IMPLEMENTATION_STATUS.md).

Status terkini: LEO memakai AI nyata melalui 9Router (`cx/gpt-6-luna`), dengan sumber KMS, riwayat tersimpan dan Apply/Save campaign yang sudah diuji. Tombol verifikasi/reset browser sudah diperbaiki. Sebanyak 77 tes dan build produksi lulus; uji lokal mencakup Auth, riset, leads, anggota, KMS PDF/DOCX/XLSX, campaign SMTP Hostinger ke mailbox sendiri dan backup–restore. Landing v7 dan workspace v15 tetap identik. Pembayaran masih dibypass untuk presentasi; hosting/domain belum dipasang. [Bukti QA](Prospecto_Codex_Optimized_v16_1/qa/acceptance-20261107/README.md).

Panduan upload Node.js, environment, worker, domain/Auth URL dan pemulihan: [MANUAL_UPLOAD.md](Prospecto_Codex_Optimized_v16_1/MANUAL_UPLOAD.md). Riwayat migrasi sudah cocok dengan Elenio: [MIGRATIONS.md](Prospecto_Codex_Optimized_v16_1/MIGRATIONS.md).

```powershell
cd Prospecto_Codex_Optimized_v16_1
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Isi konfigurasi lokal, lalu:
pnpm dev
```

Jangan commit `.env.local`. Isi seluruh environment server menurut `.env.example`. Detail dan batas verifikasi ada di `IMPLEMENTATION_STATE.md`. Aplikasi belum dideploy ke domain publik; SMTP Auth dan sender presentasi sudah terhubung. Kredensial server tidak ikut repository.
