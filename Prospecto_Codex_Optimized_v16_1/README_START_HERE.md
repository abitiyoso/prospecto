# Prospecto by Elenio — Codex Optimized v16.1

Paket ini memisahkan **HTML, CSS, JavaScript, dan sembilan aset gambar unik** dari HTML v16.1 yang sebelumnya berisi Base64. Tidak mengubah visual, fungsi frontend atau logo yang disetujui.

## Mulai

1. Ekstrak ZIP dan buka `reference-ui/index.html` pada Chrome/Edge untuk melihat UI referensi, atau jalankan server statis lokal dari folder `reference-ui`.
2. Masukkan folder paket ke repository Prospecto. Jika repo sudah punya `AGENTS.md`, **gabungkan petunjuknya** dan jangan menimpa aturan existing secara otomatis.
3. Berikan isi `START_CODEX_HERE.md` ke Codex. Fase aktif **hanya Phase 1**.
4. Setelah Phase 1 diuji, gunakan `docs/phases/PHASE_2_RESEARCH_AI.md`, kemudian PHASE_3 dan PHASE_4 secara berurutan.

## Struktur

- `AGENTS.md`: aturan ringkas yang selalu relevan.
- `START_CODEX_HERE.md`: prompt singkat agar penggunaan token hemat.
- `reference-ui/index.html`: HTML kecil, memuat CSS/JS dan aset terpisah dengan path relatif.
- `reference-ui/styles/` dan `reference-ui/scripts/`: kode referensi tanpa gambar Base64; pisah berdasarkan versi, jangan langsung anggap sebagai kode produksi.
- `reference-ui/assets/`: logo resmi dan gambar. `manifest.json` mencatat SHA256 serta dimensi.
- `screenshots/`: acuan visual desktop/mobile yang sebelumnya disetujui.
- `docs/phases/`: kebutuhan dan acceptance criteria per fase.
- `docs/contracts/`: aturan billing, campaign, provider.
- `docs/QA_CHECKLIST.md`: tes lintas fitur.

**Penting:** Konten awal UI adalah fixture visual, bukan data pelanggan sungguhan. Fitur eksternal di HTML masih berupa konsep frontend. Codex harus memakai data backend yang sah dan state aktual.
