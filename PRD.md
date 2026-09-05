# PRD: Statibin (Client-Side Web Pastebin, Serverless MVP)

## 1. Ringkasan Produk

**Statibin** — pastebin serverless di mana **URL adalah database**. Tidak ada backend, tidak ada database. Seluruh data (setelah dikompresi dan dienkripsi) disimpan di dalam URL hash fragment (`#...`), yang berarti data tidak pernah dikirim atau disentuh oleh server hosting — zero-knowledge by design.

**Prinsip inti:** "Link hilang = data hilang." Ini bukan kekurangan, ini kontrak kepercayaan dengan user.

**Bahasa UI: English.** PRD ini ditulis dalam Bahasa Indonesia, tetapi seluruh string yang terlihat user wajib English. Semua string terpusat di satu file (`src/strings.ts`) sejak hari pertama agar mudah i18n di masa depan.

---

## 2. Tech Stack

| Layer           | Pilihan                                                  | Alasan                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework       | React + Vite                                             | Setup instan, bundle kecil, akses mudah ke Web API native                                                                                                                                        |
| Styling         | Tailwind CSS                                             | Utility-first, cepat untuk MVP                                                                                                                                                                   |
| Rendering       | Client-Side Rendering (SPA)                              | SSR tidak dibutuhkan dan menghambat akses `window.crypto`/`window.location`                                                                                                                      |
| Kompresi        | `fflate` (deflate, sync)                                 | Binary-first (`Uint8Array` → `Uint8Array`), nyambung langsung ke `crypto.subtle` tanpa juggling string; rasio ~20-30% lebih baik dari `lz-string`; sync sehingga pipeline tetap sederhana; ~8 KB |
| Markdown render | `react-markdown` (+ `rehype-highlight` untuk code block) | Ringan, tidak render raw HTML by default (aman dari XSS)                                                                                                                                         |
| Enkripsi        | Web Crypto API native (AES-GCM 256-bit)                  | Tidak perlu library eksternal, sudah CSPRNG                                                                                                                                                      |
| Key derivation  | Argon2id via `hash-wasm`                                 | Resisten brute-force GPU, cocok untuk mode password                                                                                                                                              |
| QR Code         | `qrcode.react`                                           | Ringan, untuk share link antar device (dengan batas ukuran, lihat §3.4)                                                                                                                          |
| Hosting         | Vercel Static (pure static, no SSR/functions)            | HTTPS otomatis (syarat `crypto.subtle` + `navigator.clipboard`); path selalu `/` sehingga tidak butuh rewrite; tanpa `COOP`/`COEP`                                                               |

**Tidak dipakai (dan alasannya):**

- Rich text editor (Tiptap/editorcn) — bundle terlalu berat, output HTML mismatch dengan pipeline Markdown, buka celah XSS baru
- PBKDF2 — Argon2id lebih resisten untuk proyek baru tanpa beban legacy
- `lz-string` — string-to-string (UTF-16 centric), rasio lebih buruk dari DEFLATE, perlu encode ulang ke byte sebelum enkripsi; digantikan `fflate`
- `CompressionStream` native — 0 KB bundle dan rasio setara `fflate`, tetapi API async + butuh fallback untuk Safari lama; kompleksitas tidak worth it untuk MVP; dipertimbangkan lagi pasca-MVP sebagai optimasi bundle

---

## 3. Algoritma & Skema Data

### 3.1 Pipeline

```text
Input teks (Markdown string)
  → TextEncoder (UTF-8) → bytes
  → fflate deflate (sync) → bytes, dengan fallback ke bytes mentah
    jika hasil compress >= input (flag c:0/1 di envelope)
  → Binary envelope [flag:1B][epoch:4B][payload:N] (tanpa encoding teks)
  → AES-GCM 256-bit encrypt → bytes (iv + ciphertext)
  → Base64URL encode sekali (no padding)
  → Susun ke URL fragment dengan version prefix
```

Catatan: envelope biner (v2) — payload disimpan mentah sehingga ciphertext
adalah satu-satunya base64url round. Format v1 (JSON envelope dengan payload
base64, didokumentasikan di `docs/v1/PRD.md`) membayar pajak base64url dua
kali (`(4/3)² ≈ 1,78×`) dan tidak lagi di-decode (cutover bersih, app belum
deploy saat migrasi).

### 3.2 Format Fragment (dengan versioning)

```text
Tanpa password: #v2.r.<key_b64url>.<iv_b64url>.<ciphertext_b64url>
Dengan password: #v2.p.<salt_b64url>.<iv_b64url>.<ciphertext_b64url>
```

- `v2` — version tag. Parser menolak versi tak dikenal dengan pesan ramah ("This link uses a newer format. Please update the app.") bukan crash. Link `v1` (JSON envelope) ikut ditolak — cutover bersih, arsip spesifikasi di `docs/v1/PRD.md`.
- `r` / `p` — flag mode (random key vs password-derived key)
- Mode `r`: `key` = 256-bit random dari `crypto.getRandomValues`, disimpan di fragment (user tidak pernah mengetiknya). Format PRD awal yang hanya menulis `<iv>.<ciphertext>` tidak lengkap — tanpa key di URL, decrypt mustahil.
- Mode `p`: key = Argon2id(password, salt); `salt` = 128-bit random dari `crypto.getRandomValues` per-paste.
- Separator `.` aman karena tidak ada di alfabet Base64URL.
- Ciphertext = AES-GCM atas byte envelope biner `[flag:1B][epoch:4B BE uint32][payload:N]` (flag 0 = raw, 1 = deflated; epoch detik, valid sampai 2106). Timestamp tetap zero-knowledge karena dienkripsi utuh.

### 3.3 Parameter Kunci

| Parameter                      | Nilai                                                                     | Catatan                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enkripsi                       | AES-GCM 256-bit                                                           | IV baru (96-bit random via `crypto.getRandomValues`) di **setiap** enkripsi — tidak boleh pernah reuse                                                                                 |
| Salt (mode password)           | 128-bit random via `crypto.getRandomValues` per-paste                     | Sama strict-nya dengan IV: tidak boleh cache/reuse                                                                                                                                     |
| Key derivation (mode password) | Argon2id — memory cost 19 MiB, iterations 2, parallelism 1                | Parallelism 1 karena multi-thread butuh Web Worker + SharedArrayBuffer (COOP/COEP headers) — di luar scope MVP. Angka ini baseline, wajib benchmark ulang di HP low-end sebelum final. |
| Mode tanpa password            | Random 256-bit key via `crypto.getRandomValues`, disimpan di URL fragment | Key tidak pernah diketik user; siapa pun pemegang link bisa decrypt (by design)                                                                                                        |
| Timestamp cosmetic             | Unix epoch (detik, integer) di dalam envelope terenkripsi                 | Lebih ringkas dari ISO string untuk kompresi, parsing native murah, presisi detik cukup untuk kebutuhan cosmetic                                                                       |

### 3.4 Batas Ukuran URL

Panjang dihitung dari **karakter URL final** (bukan KB plaintext). Indikator menampilkan karakter, misal `1,240 / 4,000 chars`.

| Level         | Batas                                | Aksi                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal        | <3200 karakter (80% dari soft limit) | Netral/abu-abu                                                                                                                                                                                                                                          |
| Soft warning  | 3200–3999 karakter                   | Kuning/oranye, teks: "Approaching safe limit" (tombol tetap aktif)                                                                                                                                                                                      |
| Large warning | 4000–8000 karakter                   | Merah, teks: "Large size — may fail in some browsers/messenger apps" (tombol tetap aktif)                                                                                                                                                               |
| Hard block    | >8000 karakter                       | Tombol "Generate Link" disabled, error: "Exceeds maximum size — please shorten your content"                                                                                                                                                            |
| QR limit      | Total URL >~2000 karakter            | Tombol QR disabled + tooltip: "Too large for QR code — copy the link instead." Alasan: fragment base64url memaksa QR byte-mode (max teori 2953 byte, praktis stabil ~1000-2000 char). Link 4000-8000 char secara teori maupun praktik tidak bisa di-QR. |

---

## 4. Fitur MVP v1

### Wajib (Core)

- [ ] Buat paste baru (textarea Markdown)
- [ ] Toggle enkripsi dengan password (checkbox → expand input password)
- [ ] Generate link + tombol copy-to-clipboard (wajib HTTPS + fallback manual-select jika `navigator.clipboard` tidak tersedia)
- [ ] Buka link → auto-decrypt (tanpa password) atau prompt password (mode terkunci)
- [ ] Preview Markdown — **toggle mode di mobile, split-view di desktop** (responsive berdasarkan breakpoint)
- [ ] Syntax highlighting untuk code block dalam Markdown
- [ ] Indikator ukuran payload real-time saat mengetik (dengan soft/hard limit warning, dalam karakter)
- [ ] Warning eksplisit di halaman hasil generate, bukan disembunyikan: "⚠️ This link cannot be recovered if lost. Store it safely."

### Fitur Tambahan MVP v1 (disepakati)

- [ ] **Timestamp cosmetic** — tanggal dibuat, di-embed dalam envelope terenkripsi (bukan metadata terpisah, supaya tetap zero-knowledge), ditampilkan setelah decrypt (format English, misal `Created on Sep 4, 2026`)
- [ ] **QR Code share** — generate QR dari link hanya jika total URL ≤ ~2000 karakter; di atas itu tombol disabled dengan penjelasan (lihat §3.4)
- [ ] **Fork/Edit** — tombol eksplisit "✏️ Edit as new paste" saat melihat paste hasil buka link. Men-decrypt isi ke textarea baru (state terpisah), generate **link baru** saat disimpan. Link asli tidak berubah/tidak terpengaruh.
- [ ] **Error states ramah** — link terpotong/rusak: "This link looks incomplete or corrupted."; versi tak dikenal: "This link uses a newer format."; gagal auth (password salah ATAU link rusak — keduanya tidak bisa dibedakan di AES-GCM): "Wrong password or corrupted link."; KDF gagal jalan (WASM diblokir browser/CSP, OOM) wajib pesan beda: "Could not run the password check on this device or browser. Try a different browser." — jangan pernah menyalahkan password user atas masalah device/browser.

### Tidak Termasuk MVP v1 (ditunda / out of scope)

- Plain-text mode (non-Markdown) — semua fitur Markdown (heading, table, dll) dianggap "teks biasa" dalam scope ini
- Live-preview single-pane ala Obsidian/Typora (render inline sambil mengetik tanpa switch mode) — kompleksitas teknis tinggi (custom CodeMirror decoration atau Milkdown), dipertimbangkan sebagai proyek terpisah di masa depan
- Upload/embed gambar — bertentangan dengan filosofi "URL is the database" (base64 image akan meledakkan ukuran URL)
- Expiry/burn-after-read yang sungguhan — tidak mungkin tanpa server; hanya timestamp cosmetic yang tersedia
- `CompressionStream` native / multi-thread Argon2 — optimasi pasca-MVP

---

## 5. UI/UX Flow (semua string UI English)

### 5.1 Halaman Utama (Buat Paste)

- Textarea besar full-width, placeholder: `"Paste your Markdown here..."`
- Toggle **Preview**: di desktop split-view (dua panel bersebelahan, editor kiri — preview kanan); di mobile toggle switch (satu panel, tombol untuk ganti mode). Breakpoint transisi: **768px** (breakpoint `md` Tailwind CSS) — di bawahnya toggle mode, di atasnya split-view
- Toggle **Password**: checkbox `"Protect with password"`, saat aktif expand input field password di bawahnya
- Indikator ukuran payload (live, kecil, di pojok — misal `"1,240 / 4,000 chars"`)
- Tombol `"Generate Link"` — disabled jika textarea kosong atau melewati hard limit
- Cap render: jika plaintext > ~200KB, preview Markdown tidak auto-render (tampilkan `"Preview disabled for very large pastes — [Render anyway]"`) agar tidak freeze

### 5.2 Halaman Hasil (Setelah Generate)

- Tampilkan link lengkap + tombol `"Copy"`
- Tombol `"Show QR Code"` (buka modal/expand menampilkan QR) — disabled jika URL > ~2000 char dengan tooltip di §3.4
- Warning permanen dan jelas: "⚠️ This link cannot be recovered if lost. Store it safely."

### 5.3 Halaman Buka Paste (dari Link)

**Routing constraint:** path selalu `/`; bedakan state dari ada/tidaknya hash (`#v1...` = view, kosong = create). Dilarang memakai HashRouter (konflik dengan fragment data). Di Vercel static tidak perlu rewrite karena path tidak berubah.

**Tanpa password:**

- Langsung tampil hasil decrypt dalam mode **preview** (read-only), lengkap dengan timestamp cosmetic
- Tombol `"✏️ Edit as new paste"` (Fork) tersedia

**Dengan password:**

- Tampilkan form input password terlebih dahulu (`type="password"`, `autocomplete="off"`, tombol `"Unlock"`)
- Salah password → pesan error jelas dan langsung: `"Wrong password or corrupted link."` (tanpa rate-limiting palsu di client — percuma dan merusak UX, karena rate-limit di client bisa di-bypass devtools)
- Berhasil → sama seperti alur tanpa password

---

## 6. Keamanan & Privasi — Checklist Wajib

- [ ] IV AES-GCM (96-bit) dan salt Argon2id (128-bit) selalu digenerate baru per-enkripsi via `crypto.getRandomValues` — dilarang keras cache/reuse, beri komentar tegas di kode
- [ ] Argon2id parameter dibenchmark di device low-end sebelum final (target: decrypt < 2 detik di Android budget)
- [ ] Markdown rendering dibatasi strict subset — **tidak** menambahkan `rehype-raw` atau plugin yang mengizinkan raw HTML tanpa sanitasi ketat (DOMPurify minimal jika suatu saat dibutuhkan)
- [ ] Semua tool monitoring/analytics (termasuk Vercel Analytics jika dinyalakan) wajib strip URL fragment sebelum logging — kebocoran zero-knowledge paling umum terjadi di sini
- [ ] Dilarang menyimpan plaintext/draft ke `localStorage`/`sessionStorage`/cache apa pun (auto-save melanggar janji zero-knowledge lokal)
- [ ] Copy-to-clipboard wajib HTTPS dengan fallback manual-select; password input `type="password"` + `autocomplete="off"`
- [ ] Testing ukuran payload: teks pendek (~1KB), besar (~500KB-1MB), dan entropi tinggi (base64/JSON minified) — pastikan fallback kompresi bekerja dan limit URL terdeteksi dengan benar

---

## 7. Catatan Arsitektur — Isolasi Komponen Editor

Editor teks (textarea di MVP v1) **wajib dibungkus dalam satu komponen terisolasi** dengan interface sederhana dan konsisten, misal:

```jsx
<MarkdownEditor value={text} onChange={setText} />
```

Seluruh bagian aplikasi lain (indikator ukuran payload, logic generate link, preview, dst) **hanya boleh berinteraksi lewat `value`/`onChange`** — tidak boleh mengakses internal textarea secara langsung dari luar komponen ini.

**Alasan:** pipeline algoritma (kompresi, enkripsi, skema URL fragment) beroperasi murni di atas string Markdown, sehingga tidak terpengaruh apa pun UI editor yang dipakai. Satu-satunya bagian yang berubah saat migrasi ke editor lain (CodeMirror 6 untuk syntax highlighting, atau Milkdown untuk live-preview ala Notion/Obsidian di fase pasca-MVP) adalah **isi satu file ini** — tanpa isolasi ini, migrasi akan jauh lebih berantakan karena textarea kemungkinan dipakai/diakses tersebar di banyak tempat.

**Catatan migrasi ke depan (referensi, bukan keputusan sekarang):**

- **CodeMirror 6**: migrasi mudah dan risiko rendah — tetap berbasis string, tinggal tambah decoration secara incremental.
- **Milkdown**: migrasi lebih berat — internal berbasis ProseMirror document, sehingga round-trip Markdown → doc → Markdown berisiko tidak 1:1 identik (spasi, gaya list marker, dll). Perlu riset konsistensi round-trip dulu sebelum dipilih.

---

## 8. Deployment — Vercel Static

- Output `dist/` Vite di-deploy apa adanya sebagai static site; tidak ada SSR, functions, atau rewrite (path selalu `/`, data di `#fragment` tidak pernah dikirim ke server).
- Wajib HTTPS (default Vercel) — tanpa ini `crypto.subtle` dan `clipboard` diblokir browser; tidak ada fallback HTTP.
- Header CSP yang disarankan: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'` (sesuaikan setelah audit Tailwind/QR). `wasm-unsafe-eval` wajib ada — `hash-wasm` meng-compile WASM via `WebAssembly.compile`, yang diblokir `script-src 'self'` polos (tanpanya generate link password gagal hanya di production, bukan di localhost).
- Tidak perlu header `COOP`/`COEP` (hanya dibutuhkan jika Argon2 multi-thread — sengaja tidak dipakai di MVP).
- Jika Vercel Analytics / Speed Insights dinyalakan: verifikasi fragment tidak ikut ter-log.

---

## 9. Decision Log (keputusan yang sudah final)

| Tanggal    | Keputusan                                                                  | Alasan                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-04 | Kompresi `fflate`, bukan `lz-string`                                       | Binary-first cocok ke AES-GCM, rasio lebih baik, tetap sync + kecil                                                                                                   |
| 2026-09-04 | QR dibatasi ~2000 char                                                     | Keterbatasan fisik QR byte-mode; link besar tidak scannable                                                                                                           |
| 2026-09-04 | UI English, PRD Indonesia                                                  | Target user global; string terpusat di `src/strings.ts`                                                                                                               |
| 2026-09-04 | Hosting Vercel Static                                                      | HTTPS gratis, zero-config untuk SPA fragment-based                                                                                                                    |
| 2026-09-04 | Format mode-`r` wajib sertakan key di URL                                  | Tanpa key di fragment, decrypt mustahil — koreksi dari format awal                                                                                                    |
| 2026-09-05 | Envelope v1 (JSON) → v2 (biner `[flag:1B][epoch:4B][payload]`), app v0.1.0 | Hilangkan pajak base64url ganda (`(4/3)²`); hemat ~25% ukuran URL. Cutover bersih tanpa parser legacy (arsip: `docs/v1/`, benchmark: `docs/compression-benchmark.md`) |
