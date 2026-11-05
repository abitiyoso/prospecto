# Prospecto

Kode aplikasi aktif berada di [Prospecto_Codex_Optimized_v16_1](Prospecto_Codex_Optimized_v16_1/README.md).

Kode aplikasi, migrasi Supabase, pengujian, screenshot QA, dan petunjuk startup tersedia di folder tersebut. Status terperinci: [IMPLEMENTATION_STATUS.md](Prospecto_Codex_Optimized_v16_1/IMPLEMENTATION_STATUS.md).

Status terkini: alur presentasi fungsional dengan akses tanpa pembayaran, KMS PDF/DOCX/TXT/URL, XLSX, undangan, SMTP Hostinger, antrean campaign, unsubscribe, analytics dan backup–restore. Landing v7 dan workspace v15 dipertahankan; aplikasi terautentikasi ada di `/app`. Sebanyak 61 tes lokal dan build produksi lulus. GPT nyata masih memerlukan API key dan model OpenAI terpisah; draft template tersedia dengan label tanpa AI. Checkout belum diaktifkan.

Panduan upload Node.js, environment, worker, domain/Auth URL dan pemulihan: [MANUAL_UPLOAD.md](Prospecto_Codex_Optimized_v16_1/MANUAL_UPLOAD.md). Riwayat migrasi sudah cocok dengan Elenio: [MIGRATIONS.md](Prospecto_Codex_Optimized_v16_1/MIGRATIONS.md).

```powershell
cd Prospecto_Codex_Optimized_v16_1
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Isi konfigurasi lokal, lalu:
pnpm dev
```

Jangan commit `.env.local`. Isi seluruh environment server menurut `.env.example`. Detail dan batas verifikasi ada di `IMPLEMENTATION_STATE.md`. Aplikasi belum dideploy ke domain publik; SMTP Auth dan sender presentasi sudah terhubung. Kredensial server tidak ikut repository.
