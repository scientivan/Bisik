# Bisik: Task Tracker, Rencana Build, dan Spesifikasi Antarmuka

> **Versi 1.5 · diperbarui Sabtu 10 Oktober 2026, 21:15 WIB · pemilik: Dien (keputusan) dan agent (eksekusi)**
>
> Dokumen hidup. Dokumen ini satu-satunya tempat status pengerjaan Bisik. Setiap kali ada task yang dimulai, selesai, gagal, atau berubah, perbarui status task di bagian 8 dan tambahkan baris di **Progress Log** (bagian 15).
>
> **Deadline submit:** Selasa 13 Oktober 2026, 13:59 WIB (12 Oktober 23:59 PT). Target submit internal: **Selasa 11:00 WIB** (buffer 3 jam).

---

## 0. Untuk agent atau sesi baru: baca ini dulu

Kalau kamu agent baru tanpa konteks, urutan bacanya:

1. **Bagian 1–3 dokumen ini.** Isinya: apa itu Bisik, keputusan yang terkunci, dan status saat ini.
2. **`AGENTS.md` di folder ini.** Aturan kerja khusus repo Bisik.
3. **Living document** (spesifikasi produk lengkap): `../Ideation-Colosseum/living-doc/builder-sourcing-living-doc.md`. Bacalah bagian yang relevan dengan task-mu, tidak perlu semuanya.
4. **Bagian 8 (task list)** dokumen ini. Ambil task berstatus `[ ]` dengan prioritas tertinggi yang dependensinya sudah `[x]`.
5. **`../AGENTS.md`** (knowledge base lintas sesi, sangat panjang). Baca hanya entri bertanggal 9–10 Oktober 2026 di bagian atas.

**Aturan yang tidak boleh dilanggar** (rinciannya di `AGENTS.md` repo ini):

- Jangan pernah mencetak atau meng-commit isi `.env`.
- Jangan menyalin kode dari `arcium-hq/examples`, karena repo itu tidak berlisensi. Jadikan rujukan, lalu tulis ulang sendiri (R21).
- Username GitHub scout **tidak boleh** ditulis onchain (D-16).
- Saat ragu, atau ada lebih dari satu arah yang masuk akal, **tanya Dien**. Jangan diam-diam berasumsi.
- Bahasa ke Dien: Bahasa Indonesia, kesimpulan di kalimat pertama, tandai **[Fakta]** dan **[Inferensi]**.

**Legenda status:** `[ ]` belum mulai · `[~]` sedang dikerjakan · `[x]` selesai dan terverifikasi · `[!]` terblokir atau gagal (tulis alasannya) · `[-]` dibatalkan atau dipindah ke v2.

**Legenda prioritas:**

- **P0** = jalur emas. Wajib ada supaya demo berjalan dari awal sampai akhir.
- **P1** = penting untuk skor juri.
- **P2** = bagus kalau sempat.
- **P3** = v2.

---

## 1. Konteks produk (ringkas)

### 1.1 Satu paragraf

**Bisik** (dari kata *berbisik*) adalah pasar sinyal privat di Solana.

- Ekosistem blockchain (Solana, Base, Arbitrum, Tempo, dan lainnya) bersaing merebut tim builder terbaik.
- Informasi paling berharga, yaitu "tim ini bagus dan belum terikat chain mana pun", dipegang orang dalam: juri hackathon, mentor, developer, dan pemimpin komunitas.
- Di Bisik, orang dalam itu (**scout**) men-stake USDC yang **dikembalikan utuh**, disertai **alasan terenkripsi**, pada tim yang menurutnya menjanjikan.
- Ekosistem (**pembeli**) membeli sinyal itu. Hak eksklusifnya bisa diperebutkan lewat **lelang tertutup harga kedua**.
- Scout dibayar dari pembayaran pembeli, **hanya kalau ada hasil**: tim benar-benar deploy di chain pembeli atau menerima grant pembeli.
- Identitas scout dilindungi oleh **bukti zkTLS** (prestasi GitHub tanpa membuka username), **grup anonim Semaphore**, dan **MPC Arcium**.
- Alasan scout diolah oleh **Veritas**, modul internal yang memberi skor duplikasi dan tulisan AI, memilah klaim, membuat ringkasan, dan menyaring privasi.

### 1.2 Inspirasi dan pembeda

- **Inspirasi:** Bench / Benchdot (opportunity market Arcium, pemenang Colosseum, mainnet sejak 24 Agustus 2026).
- **Pembeda dari Bench:**
  1. lelang eksklusivitas antarpembeli;
  2. alasan terenkripsi yang diolah Veritas;
  3. reputasi privat dari prestasi eksternal;
  4. hasil diverifikasi, bukan sekadar dipilih pembuat market;
  5. fokus pada builder sourcing antar-ekosistem.
- **Pembanding lain** (living doc bagian 14): Scout Game (CharmVerse), Talent Protocol, program rujukan Metis dan Avalanche Retro9000.

### 1.3 Aktor

| Aktor | Peran singkat |
|---|---|
| **Scout** | Mengusulkan tim (opsi), men-stake, menulis alasan. Anonim di dalam grup tier |
| **Pembeli (ekosistem)** | Melihat pratinjau, menawar eksklusivitas atau membeli harga rata, membaca sinyal, mencatat hasil |
| **Pembuat market** | Membuka Sourcing Round (operator) atau Market Eksklusif (ekosistem) |
| **Tim (opsi)** | Objek sinyal. Bisa opt-in atau opt-out |
| **Operator (Bisik)** | Menjalankan server verifier, Veritas, keeper, dan memutus sengketa di v1 |
| **Arcium MXE** | Menghitung stake, tawaran, agregasi, dan payout secara terenkripsi |
| **Reclaim (zkTLS)** | Attestor yang menandatangani bukti prestasi GitHub |

### 1.4 Alur produk F0–F10

Rincian lengkapnya di living doc bagian 5.

```
F0 Onboarding -> F1 Buat market -> F2 Masa submit (stake + alasan) -> F3 Tutup & agregasi (Arcium)
  -> F4 Pratinjau & lelang tertutup (Vickrey/GSP, b=2) -> F5 Alokasi berurutan (#1 sembunyikan x=3, lalu #2, sisanya harga rata)
  -> F6 Due diligence (+ perkenalan oleh scout, D-15) -> F7 Jendela hasil (deploy/grant)
  -> F8 Sengketa hoax (slash ke amal) -> F9 Settlement (stake kembali + payout) -> F10 Update reputasi
```

Mesin status market: `Draft → Open → Closed → Auction → Allocated → OutcomeWindow → Settled`, dengan cabang `Disputed`.

### 1.5 Keputusan yang terkunci [Keputusan Dien]

| ID | Keputusan |
|---|---|
| D-01 | Nama produk **Bisik** |
| D-02 | Pembuat market: operator (Sourcing Round) dan ekosistem (Market Eksklusif) |
| D-03 | b = 2 slot eksklusif, x = 3 sinyal disembunyikan per slot, harga cadangan, harga rata |
| D-04 | Hasil = deploy di chain pembeli atau terima grant pembeli; jendela 90 hari (bisa dipendekkan untuk demo) |
| D-05 | Pembeli wajib menandai minimal 1 opsi; kalau tidak, otomatis ke skor tertinggi |
| D-06 | Stake 10–500 USDC per posisi; maksimal 3 opsi per scout per market |
| D-07 | Dana slash ke dana amal |
| D-08 | Pembagian pembayaran pembeli: 80% scout / 15% platform / 5% tim opt-in |
| D-09 | Hanya entitas publik; tim bisa opt-out; dapat bagian kalau opt-in |
| D-10 | Layanan AI (Veritas) di v1 melihat plaintext alasan. Ini asumsi kepercayaan yang diungkapkan |
| D-11 | Lisensi MIT |
| D-12 | Validasi permintaan lewat pesan digital dari akun Dien, tidak memblokir development |
| D-13 | Scope demo: seluruh daftar di living doc bagian 17 |
| D-14 | Settlement memakai USDC di Solana |
| D-15 | Scout boleh membuka identitas hanya ke pembeli pemenang (pemegang eksklusif), untuk memperkenalkan tim |
| D-16 | Bukti zkTLS diverifikasi offchain. Onchain hanya tier dan nullifier hash |
| D-17 | Grup anonim (Semaphore) masuk v1 |
| D-18 | Build dimulai atas aba-aba Dien. Aba-aba untuk rencana build diberikan 10 Okt 15:00 WIB |
| D-19 | Epoch 30 hari, ambang k-anonimitas = 5 |
| D-20 | Provider zkTLS sendiri: `e5ece37a-f0eb-4ab5-8f97-84a39dd5bb16` (tipe AI) |
| D-21 | Veritas adalah modul internal Bisik, bukan layanan eksternal. Gemini hanya penyedia model |
| D-22 | Nominal stake per posisi boleh publik; yang dirahasiakan adalah **opsi** yang didukung. Diungkapkan; shielded pool di v2 |
| D-23 | Tawaran lelang memakai **ceiling deposit** (pembeli menyetor batas atas, bukan nilai tawaran) |
| D-24 | `apps/mcp-server`: P3, tool MCP read-only untuk agen AI pembeli. Tidak dikerjakan sebelum M6 |
| D-25 | Hosting: web di **Vercel**, memakai akun GitHub Dien yang terhubung dengan repo. Server dan keeper di **Railway**, di-deploy **manual oleh Dien** (agent menyiapkan konfigurasi dan langkahnya) |
| D-26 | Penyimpanan server: SQLite + enkripsi at-rest AES-256-GCM |
| D-27 | Token di localnet/devnet: mock USDC buatan sendiri |
| D-28 | Ambang tier dari kontribusi 12 bulan: ≥1000 Gold, 300–999 Silver, 50–299 Bronze, <50 ditolak |
| D-29 | Sidetrack Superteam diputuskan setelah M4 |
| D-30 | Model Gemini dipilih agent (Dien: "ikut kamu"), berdasarkan uji 10 Okt: `GEMINI_MODEL=gemini-3.8-flash` (kualitas terbaik yang tidak kena kuota, tapi lambat 72–110 detik per panggilan, jadi hanya untuk pekerjaan latar seperti ringkasan setelah market ditutup); `GEMINI_FAST_MODEL=gemini-3.5-flash-lite` (sekitar 1,2 detik, untuk alur interaktif: skor D/A, klaim, penyaring privasi); `GEMINI_EMBED_MODEL=gemini-embedding-2` (3072 dimensi). Model Pro (`gemini-pro-latest`, `gemini-3.1-pro-preview`) dan `gemini-3.5-flash` → 429 RESOURCE_EXHAUSTED; `gemini-2.5-pro` → 404 |
| — | Validasi argumen antar-scout **tidak** masuk v1 (masuk v2, living doc 18.2) |
| — | Saringan syariah wajib (living doc bagian 13): hadiah hanya dari pembeli, stake kembali utuh, slash ke amal, tanpa instrumen berbunga |
| — | Satu chain utama: Solana. Track: Solana + award umum |
| — | Repo private sampai menjelang submit |

---

## 2. Peta referensi

Semua path relatif terhadap folder `Bisik/`.

| Apa | Path |
|---|---|
| Spesifikasi produk lengkap (living doc, untuk agent) | `../Ideation-Colosseum/living-doc/builder-sourcing-living-doc.md` |
| Living doc versi PDF (untuk Dien) | `../Ideation-Colosseum/living-doc/builder-sourcing-living-doc.pdf` |
| Cara membuat ulang PDF living doc | Living doc bagian 22 |
| Hasil uji tiga dependensi (Arcium, Semaphore, Reclaim) | `../Ideation-Colosseum/ideation/114-uji-tiga-dependensi.md` |
| Kode uji (rujukan, jangan di-commit ke Bisik) | `../Ideation-Colosseum/spikes/` (`semaphore/`, `reclaim/`, `arcium-examples/` tanpa lisensi) |
| Riset validasi permintaan | `../Ideation-Colosseum/ideation/113-validasi-permintaan-d12.md` |
| Kit outreach (target, pesan, survei) | `../Ideation-Colosseum/living-doc/d12-outreach-kit.md` |
| Log bukti outreach | `../Ideation-Colosseum/living-doc/d12-evidence-log.csv` |
| Reputasi privat (rancangan awal) | `../Ideation-Colosseum/ideation/111-reputasi-privat-scout.md` dan living doc bagian 8 |
| Catatan lengkap sesi ideasi 9 Okt | `../Ideation-Colosseum/ideation/112-catatan-lengkap-sesi-9-okt-2026.md` |
| Spesifikasi provider Reclaim | `docs/reclaim-provider-spec.md` |
| **Isi wajib video demo dan pitch** (bukti, pembeda, alasan teknis, asumsi, larangan) | `important_for_demo.md` |
| Aturan agent repo Bisik | `AGENTS.md` |
| Knowledge base lintas sesi | `../AGENTS.md` |
| Rules resmi hackathon | https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf |
| FAQ hackathon (isi wajib submission) | https://colosseum.com/hackathon |
| Rujukan Arcium | https://docs.arcium.com/developers dan `arcium-hq/examples` (`sealed_bid_auction`, rujukan saja) |
| Semaphore v4 | https://docs.semaphore.pse.dev/ |
| groth16-solana | https://docs.rs/groth16-solana |
| Reclaim | https://docs.reclaimprotocol.org dan https://dev.reclaimprotocol.org |

---

## 3. Status saat ini (snapshot)

**Per 10 Oktober 2026, 18:30 WIB.**

### 3.1 Yang sudah selesai

- ✅ Ideasi, riset, spesifikasi produk (living doc), uji tiga dependensi (memo 114), toolchain.
- ✅ **Program onchain `bisik`** + 8 circuit Arcium. Tes `contracts/tests/e2e.ts` **lulus** di localnet (bukti ZK dan MPC sungguhan).
- ✅ **Paket**: `@bisik/shared`, `@bisik/zk`, `@bisik/veritas`, `@bisik/sdk`.
- ✅ **API server** `apps/server` (E1–E8) dengan 7 tes lulus, termasuk bukti Reclaim asli dan tolak bukti yang diubah.
- ✅ **Keeper** `services/keeper` (E7) dan **seed demo** `scripts/seed-demo.ts` (H1). Uji gabungan di localnet: dua market berjalan sendiri dari Open sampai Settled.
- ✅ **Hosting server**: `Dockerfile` + `railway.json`, image sudah dibangun dan dijalankan lokal (`/v1/health` OK). Langkah Railway untuk Dien: `docs/deploy-railway.md`.
- ✅ README (versi kerja) + LICENSE MIT. Repo private, 3 commit di `main`.

### 3.2 Yang belum ada

- ✅ **Devnet live (A6/H3):** program `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD` + MXE di cluster Arcium **456**, Arcium **0.15.0**. Circuit di repo publik `scientivan/bisik-circuits` (URL raw dipin ke commit `a86729c`). Seed demo devnet sukses (mint mock USDC `F1uGxYkPfypwni9tfLDSCanFX5dN1nDhPSz7izFEWR37`).
- 🟡 Frontend (fase G): desain disetujui Dien pada 11 Okt (`DESIGN.md`, `docs/design-reference/`). SDK sudah bisa jalan di browser (`docs/web-sdk-bundling.md`). Implementasi `apps/web` G1–G12 tersedia. Chrome lulus create → stake ZK → dekripsi MPC → klaim ke alamat baru (market 6, total 27 mock USDC). Penerimaan G2 butuh login GitHub Dien; Safari belum, G10 opt-out belum didukung program. Rincian di `docs/frontend-implementation.md`.
- ❌ Uji live Reclaim dengan akun GitHub asli (R23). Butuh server di URL publik (I3) atau tunnel.
- ✅ D4 (`reveal_signals`) dan D6 (reputasi terenkripsi) lulus di localnet **dan di devnet** (market 3). ⚠️ Tabel reputasi devnet berisi 6 entri acak dari insiden kredit posisi lama (lihat Progress Log 20:45).
- ❌ Video, project di Arena, naskah demo.

### 3.3 Lingkungan

| Alat | Versi terpasang | Catatan |
|---|---|---|
| Solana CLI | 3.1.10 | Sesuai docs Arcium. Proyek lain bisa kembali dengan `agave-install init 3.1.12` |
| Anchor | 1.0.2 (via `avm`) | Sebelumnya 0.31.1 |
| Arcium CLI + ARX Node | 0.13.2 (via `arcup`) | Biner `arcup` 0.15.0. Image Docker `arcium/arx-node:v0.13.2` |
| Rust | 1.89.0 untuk program | Toolchain lain juga ada |
| Node / pnpm | 24.10 / 10.18.3 | |
| circom / snarkjs | 2.2.3 / 0.7.6 | |
| Docker | 29.2.1 | Harus berjalan untuk localnet Arcium |
| Disk | Sisa ~7–8 GiB | ⚠️ Sempit (R22). Cek `df -h` sebelum build besar |

**Catatan teknis dari uji:**

- Localnet Arcium butuh `[test] startup_wait = 180000` di `Anchor.toml`. Satu tes Vickrey makan sekitar 135 detik.
- Konversi bukti Semaphore ke format `groth16-solana`:
  - `proof_a` dinegasikan (y → p − y);
  - G2 disusun x.c1‖x.c0‖y.c1‖y.c0;
  - public input = [root, nullifier, hash(message), hash(scope)], dengan hash(x) = keccak256(x sebagai 32 byte BE) >> 8.
  - Contoh kodenya ada di `../Ideation-Colosseum/spikes/semaphore/to-solana.mjs`.

---

### 3.4 Catatan teknis hasil build (penting untuk sesi berikutnya)

- **Program ID:** `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD`. IDL disalin ke `packages/sdk/src/idl/bisik.json` dengan `node scripts/sync-idl.mjs` setiap selesai `arcium build`.
- **Ukuran program** 1,3 MB → sewa 6,6 SOL. Deploy butuh buffer + akun program sekaligus, jadi puncaknya ~13,5 SOL.
- **Arcium 0.15.0 (upgrade 10 Okt, keputusan Dien):** devnet menjalankan 0.15; CLI 0.13.2 gagal di `QueueKeyRecoveryInit` (`AccountOwnedByWrongProgram`, akun `mxe_program` dihapus sejak 0.14.1). Upgrade tanpa perubahan kode; e2e lulus lagi.
- **Deploy devnet yang andal:** RPC publik membuang transaksi tulis (`Max retries exceeded`), jadi tulis buffer sendiri lalu deploy/upgrade: `solana program write-buffer target/deploy/bisik.so --buffer .deploy/buffer.json -u devnet --with-compute-unit-price 20000 --max-sign-attempts 30`, lalu `solana program upgrade <buffer> <program-id> -u devnet`, lalu `arcium deploy … --skip-deploy --resume`. Kalau program membesar: `solana program extend <id> <bytes>`. Buffer gagal: `solana program close --buffers` untuk mengambil SOL kembali.
- **URL circuit sekarang argumen instruksi** `init_<circuit>_comp_def(circuit_base_url)`, bukan variabel build. String kosong = upload onchain (localnet). Seed membaca `BISIK_CIRCUIT_BASE_URL` dari `.env`.
- **Circuit offchain:** build dengan `BISIK_CIRCUIT_BASE_URL=https://…/circuits arcium build`. Tanpa variabel itu, circuit diupload onchain (hanya untuk localnet).
- **Latensi MPC (localnet):** 2,6–4,1 dtk per computation (tabel di Progress Log). Satu market penuh di keeper: ±8 menit dengan jendela pendek.
- **Instruksi lelang dipecah:** `open_bid(ceiling)` lalu `place_bid(offset, …)`. Alasan: struct akun `PlaceBid` melewati batas stack 4 KB Solana.
- **RPC:** pakai `skipPreflight: true` + commitment `confirmed`. Validator baru sering memberi "Blockhash not found" saat preflight.
- **Menjalankan stack lokal:**
  1. `cd contracts && arcium localnet --skip-build` (tunggu slot berjalan).
  2. `cd apps/server && BISIK_DEMO=1 npx tsx src/index.ts` (port 8787).
  3. `npx tsx scripts/seed-demo.ts` (setup, 2 market, 6 stake anonim). Lalu `seed-demo.ts bids 0`, `select 0 ecosystem-a 0`, `buyflat 0 ecosystem-c`.
  4. `cd services/keeper && npx tsx src/index.ts`.
- **Endpoint server (prefix `/v1`):** `health`; `identity/reclaim-session` (+ GET status, POST `reclaim/callback`); `groups/:tier/:epoch`; `options/team-ref`; `reasons`; `markets/:id`; `auth/nonce`, `auth/verify` (SIWS); `markets/:id/signals`; `intro` (D-15); `outcomes/check`; `disputes`; admin: `buyers/verify`, `markets/:id/summarize`, `markets/:id/default-outcomes`, `disputes`, `demo/members` (hanya `BISIK_DEMO=1`).
- **Aturan R23 di verifier:** username harus berasal dari URL halaman yang perlu login (`github.com/settings/…`). Bisa dimatikan sementara dengan `BISIK_ENFORCE_LOGIN_ONLY=0` hanya untuk uji.
- **Data sensitif server** (teks alasan, team-ref, bukti sengketa) dienkripsi AES-256-GCM dengan `SERVER_DATA_KEY`. Username GitHub tidak pernah disimpan; yang disimpan hanya hash bergaram.
- **Default outcome (D-05):** pembeli yang tidak menandai apa pun mendapat opsi terkuat yang bisa dilihatnya; dijalankan keeper lewat `POST /v1/admin/markets/:id/default-outcomes`.
- **Bug yang sudah diperbaiki di uji gabungan:** dua posisi dengan teks alasan identik dulu saling menimpa di DB. Sekarang keduanya dihitung dan salinannya ditandai `likely_duplicate` (D = 1).
- **zkey Semaphore (B5):** artefak dari `privacy-scaling-explorations/snark-artifacts` (lisensi MIT), hasil ceremony phase-2 Semaphore V4 lewat ceremony.pse.dev. Versi 4.13.0, sha256 `33f9a067…` dipin di `scripts/gen-vk.mjs`. Jumlah kontributor ceremony belum terverifikasi.
- **Disk:** ~4 GiB setelah membersihkan clone rujukan, image Arcium 0.13.2, dan cache debug (izin Dien).
- **`.env` sekarang mengarah ke devnet** (`SOLANA_RPC_URL`, `ARCIUM_CLUSTER_OFFSET=456`, `SERVER_DB_PATH=./data/devnet.sqlite`). Untuk localnet, timpa lewat variabel lingkungan saat menjalankan.

### 3.5 D4/D6 (hasil subagent, diverifikasi root dari log)

- **D4 `reveal_signals(offset, buyer_x25519)`**: MPC mengenkripsi bobot per opsi yang boleh dilihat pembeli ke kunci x25519 milik pembeli; disimpan di akun `SignalReveal` `["signals", market, buyer]`. Server mengembalikan `encryptedSignals` di endpoint sinyal; SDK `decryptSignals`. Bukan pembeli ditolak.
- **D6**: `init_reputation` (operator), `credit_reputation` (siapa pun, posisi harus settled, sekali per posisi lewat `RepCredit`), `epoch_tiers` (operator, sekali per epoch; daftar diurutkan di MPC). Tabel `Reputation` `["rep"]` 32 slot, counter maks 255. Kunci = 64 bit bawah komitmen C, dibuka hanya di MPC.
- **Syarat stake baru:** opsi dan kredit dienkripsi dengan **kunci x25519 yang sama** (`encryptStakeSecrets` di SDK). Seed sudah diperbaiki. Posisi devnet lama (dibuat sebelum perbaikan) tidak bisa dikredit.
- **Latensi localnet:** reveal_signals 3,7 dtk, init_rep 12,6, credit_reputation 3,5, epoch_tiers 4,5.
- **Keputusan untuk Dien (usulan agent, belum dikunci):**
  1. Aturan level: 0 = turun satu tier (ada hoax terbukti, atau ≥2 meleset tanpa tepat); 1 = tetap; 2 = naik satu (≥1 tepat dan tepat ≥ meleset); 3 = naik dua (≥3 tepat dan tepat ≥ 2× meleset). Tier epoch berikut = clamp(tier impor + level − 1).
  2. Kapasitas tabel 32 scout (batas callback satu transaksi). Scout ke-33 tidak tercatat.
  3. "Tepat" = opsi ada di mask sukses pembeli mana pun (dihitung sekali).
- **Risiko yang tersisa (inferensi agent):** bukti Semaphore tidak membuktikan bahwa plaintext kredit = C milik pembukti, jadi pelaku hoax bisa mengarahkan penalti ke C orang lain (perlu circuit ZK khusus). Keterkaitan lewat perubahan tier antar-epoch masih mungkin bila scout sedikit (living doc 8.3).

## 4. Timeline dan milestone

Semua waktu dalam WIB. [Inferensi] Total sekitar 71 jam, dikurangi waktu tidur.

| Milestone | Target selesai | Isi | Syarat lolos |
|---|---|---|---|
| **M0 Fondasi** | Sab 10 Okt 19:00 | Fase A + B1–B3 | `pnpm -r build` dan `arcium build` lolos; verifikasi Semaphore di program lolos tes |
| **M1 Jalur emas onchain** | Min 11 Okt 03:00 | C1–C6, C12 (tanpa Arcium penuh), E1–E3 | Scout bisa onboard, stake anonim, klaim refund di localnet |
| **M2 Arcium + lelang** | Min 11 Okt 18:00 | D1–D3, C7–C9 | Agregasi terenkripsi, lelang GSP b=2, dan alokasi berurutan lolos di localnet |
| **M3 Veritas + frontend inti** | Min 11 Okt 24:00 | F1–F7, G1–G6 | Semua alur F0–F5 bisa diklik di UI |
| **M4 Hasil, sengketa, settlement** | Sen 12 Okt 10:00 | C10–C12, D5, E5–E8, G7–G9 | F6–F9 berjalan dari awal sampai akhir |
| **M5 Deploy + hosting** | Sen 12 Okt 15:00 | Fase I, H1–H3 | URL publik berjalan (devnet, atau localnet terekam) |
| **M6 Video + materi** | Sen 12 Okt 23:00 | J2–J6, angka outreach dikunci 20:00 | Dua video selesai, README final |
| **M7 Submit** | Sel 13 Okt 11:00 | J7–J8 | Form terkirim, repo public |

**Aturan potong** (rinciannya di bagian 12):

- Kalau sebuah milestone meleset lebih dari 4 jam, jalankan cadangan yang ditulis di bagian 12.
- Jangan menambah fitur P2 sebelum M4 selesai.

---

## 5. Arsitektur v1

### 5.1 Diagram

```
                ┌──────────────────────── apps/web (Vite + React) ─────────────────────────┐
                │ Scout: identitas lokal, Reclaim, bukti Semaphore (browser), stake, klaim  │
                │ Pembeli: pratinjau, tawaran, pilih sinyal tersembunyi, baca sinyal        │
                │ Pembuat/Operator: buat market, admin                                      │
                └──────┬───────────────────────────────┬───────────────────────────────────┘
                       │ tx (wallet)                    │ HTTPS (REST)
                       v                                v
   ┌──────────── contracts/ (Anchor 1.0.2 + Arcium 0.13.2) ─────────┐   ┌──── apps/server (Node + Hono) ─────┐
   │ program `bisik`: config, grup, market, escrow, posisi,          │   │ verifier Reclaim (offchain, D-16)   │
   │ lelang, alokasi, hasil, sengketa, settlement, klaim             │<->│ layanan grup (pohon Merkle LeanIMT) │
   │ verifikasi Groth16 (groth16-solana) + keccak                    │   │ penyimpanan alasan (terenkripsi)    │
   │ encrypted-ixs/ (Arcis): agregasi, lelang, payout, reputasi      │   │ Veritas (packages/veritas)          │
   └──────────────────────────┬──────────────────────────────────────┘   │ oracle hasil, endpoint sinyal       │
                              │ queue computation / callback            └──────────────┬──────────────────────┘
                              v                                                         │
                    Arcium MXE (localnet / devnet)                       services/keeper (cron tx)
```

### 5.2 Struktur monorepo [Usulan]

Monorepo memakai pnpm workspaces.

```
Bisik/
├── AGENTS.md                 aturan agent repo ini
├── task-tracker.md           dokumen ini
├── .env / .env.example       satu-satunya .env (folder lain memakai symlink)
├── package.json              root workspace (pnpm)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── LICENSE                   MIT (D-11)
├── README.md                 untuk juri: masalah, arsitektur, asumsi kepercayaan, rujukan
├── contracts/                workspace Anchor + Arcium
│   ├── Anchor.toml  Arcium.toml  Cargo.toml  rust-toolchain.toml (1.89.0)
│   ├── programs/bisik/src/   lib.rs, state/, instructions/, zk/{vk.rs,verify.rs}, errors.rs, events.rs
│   ├── encrypted-ixs/src/    circuit Arcis
│   └── tests/                tes TypeScript (localnet Arcium) + LiteSVM (Rust)
├── packages/
│   ├── shared/               tipe, konstanta (tier, parameter default), util hash (fieldHash, keccak)
│   ├── zk/                   identitas Semaphore, grup, bukti stake/klaim, konversi ke byte Solana
│   ├── sdk/                  client program: PDA, builder instruksi, enkripsi Arcium, decoder akun
│   └── veritas/              modul Veritas (D-21): D/A/DRS, klaim, ringkasan, penyaring privasi
├── apps/
│   ├── web/                  frontend
│   ├── server/               API: verifier, grup, alasan, sinyal, oracle, sengketa
│   └── mcp-server/           [keputusan terbuka D-24] usulan: tool MCP read-only untuk agen AI pembeli (P3)
├── services/
│   └── keeper/               worker cron: tutup market, selesaikan lelang, tutup jendela, settle, ganti epoch
├── scripts/                  gen-vk, buat mock USDC, seed data demo, deploy
└── docs/                     spesifikasi (Reclaim provider, arsitektur, asumsi kepercayaan)
```

### 5.3 Asumsi kepercayaan v1

Asumsi ini **wajib diungkapkan** di README dan video.

1. **Server verifier (operator)** melihat username GitHub sesaat saat onboarding, lalu menambahkan komitmen identitas ke grup (D-16, R19).
2. **Veritas** melihat plaintext alasan (D-10). Alasan disimpan terenkripsi at-rest dengan kunci server.
3. **Operator memutus sengketa hoax** di v1.
4. **Arcium Mainnet Alpha / devnet**: kepercayaan ada pada node MPC. [Fakta] Saat diluncurkan, ada 4 operator node.
5. **Oracle hasil**: operator membaca deploy di Solana dan menandatangani `record_outcome`. Hasil lintas chain memakai atestasi pembeli.
6. **Nominal stake per posisi terlihat publik**, karena transfer USDC bersifat publik. Yang dirahasiakan adalah **opsi mana** yang didukung. Lihat D-22 (keputusan terbuka).

---

## 6. Spesifikasi antarmuka

> Semua bagian di sini berstatus **[Usulan]**, kecuali yang ditandai lain. Kalau implementasi harus menyimpang, perbarui spesifikasi ini di commit yang sama dan catat di Progress Log.

### 6.1 Konvensi

- **Uang:** USDC 6 desimal, disimpan sebagai `u64` base unit (1 USDC = 1_000_000). Di localnet dan devnet dipakai **mock USDC** yang dicetak sendiri (D-27).
- **Waktu:** `i64` unix seconds dari `Clock`. Durasi demo boleh dipendekkan lewat parameter market.
- **ID market:** `u64` berurutan dari `Config.market_count`.
- **Indeks opsi:** `u16`. Maksimal **16 opsi per market** (`MAX_OPTIONS = 16`), karena circuit Arcis memakai array berukuran tetap.
- **Hash umum:** `keccak256` (syscall `solana_program::keccak`).
- **Field hash Semaphore:** `fieldHash(x32) = keccak256(x32) >> 8`, dengan x32 berupa 32 byte big-endian. Ini wajib sama persis dengan `@semaphore-protocol/proof`.
- **Tier:** `0 = Bronze`, `1 = Silver`, `2 = Gold`. Multiplier reputasi [Usulan]: 1,00 / 1,15 / 1,30 (basis poin 10000 / 11500 / 13000).
- **Basis poin:** `fee_bps = 1500`, `team_bps = 500`, sisa `8000` untuk scout (D-08).

### 6.2 Program onchain `bisik`

#### 6.2.1 Akun (PDA)

| Akun | Seeds | Field utama |
|---|---|---|
| `Config` | `["config"]` | `admin`, `operator`, `usdc_mint`, `treasury`, `charity`, `fee_bps: u16`, `team_bps: u16`, `market_count: u64`, `current_epoch: u32`, `epoch_len: i64`, `k_min: u8 (5)`, `bump` |
| `GroupRoot` | `["group", tier u8, epoch u32 LE]` | `tier`, `epoch`, `root: [u8;32]`, `size: u32`, `history: [[u8;32];4]`, `updated_at` |
| `SourceNullifier` | `["src", nullifier [u8;32]]` | `created_at`. Keberadaan akun ini berarti akun sumber sudah dipakai |
| `BuyerProfile` | `["buyer", authority]` | `authority`, `pseudonym_hash: [u8;32]`, `verified: bool`, `bought: u32`, `late_outcomes: u32`, `disputes_rejected: u32` |
| `Market` | `["market", id u64 LE]` | Lihat di bawah tabel ini |
| `Escrow` (token account) | `["escrow", market]` | Authority = PDA `Market` |
| `OptionEntry` | `["option", market, index u16 LE]` | `index`, `team_commitment: [u8;32]` (= keccak(teamRef ‖ salt), plaintext disimpan server), `category: u8`, `opted_out: bool`, `deploy_wallet: Option<Pubkey>` (diisi saat hasil diverifikasi) |
| `Position` | `["pos", market, nullifier [u8;32]]` | `nullifier`, `slot: u8 (1..3)`, `tier: u8`, `epoch: u32`, `amount: u64` (publik, D-22), `weight_bps: u32`, `enc_option: [u8;32] + nonce: u128` (opsi terenkripsi untuk MXE), `reason_hash: [u8;32]`, `credit_ct: [u8;32] + credit_nonce` (komitmen identitas terenkripsi ke MXE), `staked_at`, `payout: u64` (diisi saat settle), `settled: bool`, `claimed: bool`, `slashed: bool` |
| `Bid` | `["bid", market, buyer]` | `buyer`, `ceiling: u64` (setoran batas atas, D-23), `enc_bid: [u8;32] + nonce`, `refunded: bool` |
| `Allocation` | `["alloc", market, buyer]` | `buyer`, `rank: u8` (1..b; 0 = harga rata), `price: u64`, `hidden: [u16; 3]` + `hidden_len`, `selected_at` |
| `OutcomeRecord` | `["outcome", market, buyer, option u16]` | `kind: Deploy / Grant / Default`, `evidence_hash`, `recorded_by`, `at` |
| `Dispute` | `["dispute", market, nullifier]` | `buyer`, `claim_hash`, `evidence_hash`, `response_hash`, `status: Open / Upheld / Rejected`, `opened_at`, `deadline` |

**Field akun `Market`:**

- `id`, `creator`, `kind: Exclusive / Auction`, `status`, `question_hash`, `category`;
- `submit_end`, `auction_end`, `outcome_end`, `dispute_window: i64`;
- `params`: `min_stake`, `max_stake`, `max_slots = 3`, `min_reason_len = 200`, `b = 2`, `x = 3`, `reserve_price`, `flat_price`, `early_bonus_start_bps = 15000`;
- `option_count: u16`, `position_count: u32`, `total_staked: u64`, `pool: u64`;
- `preview`: `n_scouts`, `n_options_backed`, `tier_hist [u16;3]`, `strength_hist [u16;3]`;
- `winners [Pubkey;2]`, `prices [u64;2]`, `next_rank_to_select: u8`;
- `enc_state` (ciphertext agregat Arcium), `state_nonce`;
- `bump`, `escrow_bump`.

#### 6.2.2 Instruksi

| # | Instruksi | Penandatangan | Pemeriksaan utama | Efek |
|---|---|---|---|---|
| 1 | `init_config(operator, usdc_mint, treasury, charity, fee_bps, team_bps, epoch_len, k_min)` | admin | Sekali saja | Membuat `Config` |
| 2 | `publish_group_root(tier, epoch, root, size)` | operator | `size ≥ k_min`, kecuali flag demo | Upsert `GroupRoot`; root lama masuk `history` |
| 3 | `register_source_nullifier(nullifier)` | operator | Belum ada | Membuat `SourceNullifier` (anti-sybil, D-16) |
| 4 | `register_buyer(authority, pseudonym_hash)` | operator | — | `BuyerProfile.verified = true` |
| 5 | `create_market(params, kind, question_hash, category, durations)` | creator | Parameter dalam batas; `Auction` hanya oleh operator atau pembuat terverifikasi | Membuat `Market` dan `Escrow`; `Exclusive` menyetor `pool` |
| 6 | `add_option(market, team_commitment, category)` | siapa pun (scout) | `status = Open`, `option_count < 16` | Membuat `OptionEntry` |
| 7 | `stake(market, slot, amount, tier, epoch, proof: [u8;256], root, nullifier, enc_option, nonce, reason_hash, credit_ct, credit_nonce)` | wallet stake (sekali pakai) | `Open`; `slot ∈ 1..3`; batas `amount`; `root ∈ GroupRoot[tier][epoch]` (root atau history); `scope = (market_id << 8) | slot`; `message = keccak(payload)` (6.4); bukti Groth16 valid; PDA `Position` belum ada | Transfer USDC ke `Escrow`; membuat `Position`; menghitung `weight_bps` (bonus awal × tier); mengantre circuit `allocate_position` |
| 8 | `close_submit(market)` | siapa pun | `now ≥ submit_end` | `status = Closed`; mengantre `aggregate_preview`; callback mengisi `preview` |
| 9 | `place_bid(market, ceiling, enc_bid, nonce)` | pembeli terverifikasi | `Auction`, `Closed`, `now < auction_end`, satu tawaran per pembeli | Transfer `ceiling` ke `Escrow`; mengantre `place_bid` |
| 10 | `resolve_auction(market)` | siapa pun | `now ≥ auction_end` | Mengantre `resolve_auction`; callback mengisi `winners`, `prices`, `status = Auction→Allocated` |
| 11 | `refund_bid(market)` | pembeli | Sudah resolved | Kalah: seluruh `ceiling` kembali. Menang: `ceiling − price` kembali; `price` masuk `pool` |
| 12 | `select_hidden(market, options[≤x])` | pembeli rank `next_rank_to_select` | Urutan ketat #1 lalu #2; opsi belum disembunyikan orang lain | Mengisi `Allocation.hidden`; `next_rank_to_select += 1` |
| 13 | `buy_flat(market)` | pembeli terverifikasi | `Allocated` dan semua rank sudah memilih (atau timeout) | Transfer `flat_price` ke `pool`; membuat `Allocation(rank 0)` |
| 14 | `request_intro(market, nullifier)` / `accept_intro(...)` | pembeli eksklusif / scout (lewat bukti) | D-15: hanya pemegang eksklusif | P2. v1 lewat server dengan kontak terenkripsi |
| 15 | `register_deploy_wallet(market, option, wallet)` | operator (atas klaim tim opt-in) | — | Mengisi `OptionEntry.deploy_wallet` |
| 16 | `record_outcome(market, buyer, option, kind, evidence_hash)` | operator (oracle Solana) atau pembeli (atestasi grant) | `OutcomeWindow`; opsi termasuk sinyal yang dibeli pembeli | Membuat `OutcomeRecord` |
| 17 | `finalize_outcomes(market)` | siapa pun | `now ≥ outcome_end` | Menerapkan aturan default D-05; `status = Settling` |
| 18 | `open_dispute(market, nullifier, claim_hash, evidence_hash)` | pembeli yang membeli sinyal itu | Dalam jendela sengketa | Membuat `Dispute`; posisi dibekukan |
| 19 | `resolve_dispute(market, nullifier, upheld)` | operator | `Open`, lewat deadline tanggapan | Upheld: `Position.slashed`, stake ke `charity` (D-07) |
| 20 | `settle_position(market, nullifier)` | siapa pun (keeper) | `Settling`, belum di-settle | Mengantre `compute_payout`; callback mengisi `Position.payout` |
| 21 | `claim(market, nullifier, recipient, proof)` | siapa pun | Bukti Semaphore dengan scope sama dan `message = keccak("claim" ‖ recipient)`; `settled`; belum `claimed`; tidak `slashed` | Transfer `amount + payout` ke `recipient` |
| 22 | `settle_market_fees(market)` | siapa pun | Semua posisi sudah di-settle | Transfer 15% ke `treasury`, 5% ke tim opt-in (atau kembali ke pool scout) |
| 23 | `rotate_epoch()` | operator | `now ≥ epoch_start + epoch_len` | `current_epoch += 1` |

**Event** (untuk indexer dan UI): `MarketCreated`, `OptionAdded`, `Staked{market, nullifier, slot, amount, tier}`, `MarketClosed{preview}`, `BidPlaced{market, buyer}`, `AuctionResolved{winners, prices}`, `HiddenSelected{buyer, rank, count}`, `FlatBought`, `OutcomeRecorded`, `DisputeOpened/Resolved`, `PositionSettled{nullifier, payout}`, `Claimed{nullifier}`, `GroupRootPublished`.

**Error utama:** `InvalidProof`, `UnknownRoot`, `NullifierUsed`, `SlotOutOfRange`, `StakeOutOfBounds`, `MarketNotOpen`, `MarketNotClosed`, `AuctionNotEnded`, `WrongSelectionOrder`, `OptionAlreadyHidden`, `NotEligibleBuyer`, `DisputeWindowClosed`, `AlreadyClaimed`, `PositionSlashed`, `TooManyOptions`.

### 6.3 Circuit Arcium (`contracts/encrypted-ixs`)

Semuanya ditulis sendiri. Contoh `sealed_bid_auction` hanya rujukan (R21).

| Circuit | Input | Output | Catatan |
|---|---|---|---|
| `init_market_state` | — | `Enc<Mxe, MarketAgg>`: `total[16]: u64`, `weighted[16]: u64`, `scouts[16]: u16`, `tiers[16][3]: u16` | Dipanggil oleh `create_market` |
| `allocate_position` | `Enc<Shared, u8 option>`, `amount: u64`, `weight_bps: u32`, `tier: u8`, state | State baru | Satu posisi untuk satu opsi |
| `aggregate_preview` | state | Plaintext: `n_options_backed`, `strength_hist[3]` (lemah/sedang/kuat dari ambang skor), `tier_hist[3]` | Tanpa identitas opsi |
| `init_auction` / `place_bid` | `Enc<Shared, Bid{bidder_lo, bidder_hi, amount}>`, state lelang | Menyimpan **top-3** | b = 2, jadi butuh tawaran ke-3 untuk harga #2 |
| `resolve_auction` | state lelang, `reserve_price` | Plaintext: `winner1, price1 = max(bid2, reserve)`, `winner2, price2 = max(bid3, reserve)` | Generalized second price, sesuai living doc 5.6. Tawaran di bawah cadangan tidak menang. Tawaran > `ceiling` dianggap tidak sah (dicek di program memakai ceiling, D-23) |
| `reveal_signals` (P1) | state, `buyer_x25519`, mask opsi yang boleh dilihat | `Enc<Shared to buyer>`: skor sinyal per opsi yang diizinkan | Cadangan: server mengirim skor setelah memeriksa `Allocation` onchain (asumsi operator) |
| `compute_payout` | `enc_option` posisi, `amount`, `weight_bps`, state, pool per pembeli, mask opsi menang per pembeli | Plaintext `payout: u64` | `payout_i = Σ_b pool_b × 0,80 × [opt_i ∈ W_b] × w_i / Σ_{opt∈W_b} weighted[opt]` |
| `credit_reputation` (P2) | `credit_ct`, sukses/gagal, state reputasi `[64]` | State baru | Cadangan: operator menghitung tier dari kredit terdekripsi, diungkapkan (R19) |
| `epoch_tiers` (P2) | state reputasi | Daftar tier per komitmen | Untuk pembaruan grup per epoch |

### 6.4 Bukti ZK (Semaphore v4)

- **Paket:** `@semaphore-protocol/{identity,group,proof}` 4.14.3 (MIT). Kedalaman pohon **tetap 20**, sehingga cukup satu verification key.
- **Identitas:** dibuat di browser. Rahasianya disimpan di `localStorage` (v1) dan bisa diekspor sebagai file cadangan. Komitmen `C = identity.commitment`.
- **Grup:** satu per `(tier, epoch)`. Daun = C. Pohon dibangun server (LeanIMT), dan daunnya publik.
- **Stake:**
  - `scope = (market_id << 8) | slot`;
  - `message = keccak256(market_id u64 BE ‖ slot u8 ‖ amount u64 BE ‖ keccak(enc_option‖nonce) ‖ reason_hash ‖ keccak(credit_ct‖credit_nonce))`.
- **Klaim:** `scope` sama dengan stake, sehingga nullifier-nya sama. `message = keccak256("bisik-claim" ‖ recipient pubkey)`.
- **Pemeriksaan program:** `public_inputs = [root, nullifier, fieldHash(message), fieldHash(scope)]`, lalu `groth16-solana` dengan VK dari `contracts/programs/bisik/src/zk/vk.rs`. File VK dihasilkan oleh `scripts/gen-vk.ts` dari `semaphore-20.zkey`.
- **Biaya:** sekitar 97 ribu CU per verifikasi (memo 114). Tambahkan instruksi compute budget 400 ribu CU untuk `stake` dan `claim`.

### 6.5 API server (`apps/server`, HTTP JSON, prefix `/v1`)

**Autentikasi:**

- Pembeli dan operator memakai **Sign-In With Solana**: menandatangani pesan `Bisik login\nnonce: <n>\nissued: <ts>` dan mendapat token sesi (JWT, 12 jam).
- Endpoint scout tidak memakai login. Scout anonim, jadi aksesnya diikat ke bukti atau ke sesi Reclaim.

| Method + path | Pengguna | Request | Response | Catatan |
|---|---|---|---|---|
| `POST /v1/identity/reclaim-session` | scout | `{ identityCommitment }` | `{ sessionId, requestUrl }` | Server memakai `RECLAIM_APP_SECRET` (tidak pernah dikirim ke browser), `acceptAiProviders: true` |
| `POST /v1/reclaim/callback` | Reclaim | Bukti | `200` | Verifikasi: `verifyProof`, penanda tangan ∈ `/api/attestors`, **aturan R23** (lihat bawah), tier, `sourceNullifier`, lalu `register_source_nullifier` dan tambah daun |
| `GET /v1/identity/reclaim-session/:id` | scout | — | `{ status, result?: { tier, epoch, leafIndex, root } }` | Polling UI |
| `GET /v1/groups/:tier/:epoch` | publik | — | `{ root, size, leaves: string[] }` | Untuk bukti Merkle di browser |
| `POST /v1/options/team-ref` | scout | `{ marketId, teamRef, category }` | `{ teamCommitment }` | `teamRef` (URL repo atau profil) disimpan terenkripsi |
| `POST /v1/reasons` | scout | `{ marketId, slot, text }` | `{ reasonId, reasonHash, veritas: { D, A, drs, flags[] } }` | Panjang minimal 200 karakter; `reasonHash = keccak(text)`; flag Veritas ditampilkan sebelum stake |
| `GET /v1/markets` | publik | `?status=` opsional | `{ markets: [MarketSummary] }`, urut ID turun | Dibaca langsung dari akun onchain (`program.account.market.all()`), tanpa indexer. MarketSummary: id, kind, status, category, submitEnd, auctionEnd, outcomeEnd, optionCount, positions, minStake, maxStake, minReasonLen, reservePrice, flatPrice, preview |
| `GET /v1/markets/:id` | publik | — | `{ ...MarketSummary, options: [{index, category, optedIn}], teamRefsRegistered }` | Tanpa `teamRef`. `preview` = histogram satu market `{backed, weak, medium, strong}` (jumlah opsi per tingkat kekuatan), tidak terkait ke opsi tertentu, `null` sebelum status Auction |
| `GET /v1/markets/:id/signals` | pembeli (SIWS) | — | `{ options: [{ index, teamRef, score, nScouts, tierDist, summary: {pros, cons}, claims: [{id, text, kind}], reasons: [{ filteredText, D, A, flags }] }] }` | Hanya opsi yang diizinkan `Allocation` onchain: rank #k mendapat semua opsi kecuali yang sudah disembunyikan rank sebelumnya; rank 0 mendapat n − b·x |
| `POST /v1/intro` | pembeli eksklusif | `{ marketId, optionIndex }` | `{ requestId }` | D-15. Scout menerima atau menolak lewat `POST /v1/intro/:id/respond` dengan bukti nullifier; kontak dienkripsi ke kunci pembeli |
| `POST /v1/outcomes/check` | pembeli / operator | `{ marketId, optionIndex, buyer }` | `{ found, txSig?, evidenceHash }` | Oracle: cari deploy program oleh `deploy_wallet` di Solana dalam jendela, lalu operator mengirim `record_outcome` |
| `POST /v1/disputes` | pembeli | `{ marketId, nullifier, claimId, evidence }` | `{ disputeId }` | Hanya klaim berjenis `verifiable` |
| `POST /v1/disputes/:id/respond` | scout | `{ response, proof }` | `200` | |
| `POST /v1/admin/*` | operator | — | — | `buyers/verify`, `disputes/:id/resolve`, `epoch/rotate`, `keeper/run` |

**Aturan R23 di verifier** (wajib):

- Bukti diterima hanya kalau `JSON.parse(claimData.parameters).url` sesuai pola halaman yang **memerlukan login**, misalnya `^https://github\.com/settings/`, atau kalau ada bukti kepemilikan terpisah dengan username yang sama.
- Selain itu, tolak dengan kode `UNOWNED_SOURCE`. Profil publik tidak membuktikan kepemilikan akun.

**Tier dari jumlah kontribusi** [Usulan]: ≥ 1.000 Gold · 300–999 Silver · 50–299 Bronze · < 50 ditolak.

**Penyimpanan server** [Usulan, D-26]: SQLite (`better-sqlite3`). Tabel:

- `sessions(id, identity_commitment, status, tier, epoch, created_at)`
- `source_nullifiers(hash)`
- `group_leaves(tier, epoch, idx, commitment)`
- `team_refs(market_id, commitment, ciphertext)`
- `reasons(id, market_id, slot, reason_hash, ciphertext, filtered_text, d, a, drs, flags, claims_json)`
- `buyers(pubkey, pseudonym_hash, verified)`
- `intros(...)`
- `disputes(...)`
- `outcome_checks(...)`

Teks sensitif dienkripsi at-rest dengan AES-256-GCM, kunci di `.env` (`SERVER_DATA_KEY`).

### 6.6 Modul Veritas (`packages/veritas`, D-21)

```ts
export interface VeritasScores { D: number; A: number; drs: number; flags: string[] }   // semua 0..1
export function drs(D: number, A: number): number                                        // 1 - (1-D)(1-A), noisy-OR dari Veritas UHI9
export async function scoreDuplicate(text: string, corpus: string[]): Promise<number>     // max(cosine embedding Gemini, Jaccard shingle-5)
export async function scoreAiLikelihood(text: string): Promise<number>                    // rubrik Gemini + heuristik gaya; hanya penanda
export async function extractClaims(text: string): Promise<{ text: string; kind: "verifiable" | "opinion" }[]>
export async function privacyFilter(text: string): Promise<{ filtered: string; removed: string[] }> // buang nama, handle, detail pengenal, gaya khas
export async function summarize(reasons: string[]): Promise<{ pros: string[]; cons: string[] }>
export async function sybilHints(items: { id: string; text: string }[]): Promise<string[][]> // P2: klaster kemiripan
export async function analyze(text: string, corpus: string[]): Promise<VeritasScores & { claims; filtered }>
```

- **Model (D-30):** alur interaktif (`analyze`, `privacyFilter`, `extractClaims`) memakai `GEMINI_FAST_MODEL`, dengan target < 8 detik. Pekerjaan latar (`summarize`) memakai `GEMINI_MODEL`, dengan timeout 150 detik dan cadangan ke model cepat. Embedding memakai `GEMINI_EMBED_MODEL` (boleh `outputDimensionality` 768).
- **Keluaran** dipaksa berbentuk JSON (response schema), dengan retry dua kali.
- **Kalau Gemini gagal:** D memakai Jaccard saja, A diberi nilai `null` dengan flag `ai_unavailable`. Pipeline tidak boleh memblokir stake.
- **Prinsip:** skor D dan A **tidak pernah** menjadi dasar slashing. Fungsinya hanya penanda dan bobot tampilan (living doc bagian 9).

### 6.7 Paket `zk`, `sdk`, `shared`

- **`packages/zk`:**
  - `createIdentity()`, `exportIdentity()`, `importIdentity()`;
  - `buildGroup(leaves)`;
  - `proveStake({identity, group, marketId, slot, payload})` → `{ proofBytes, root, nullifier, message, scope }`;
  - `proveClaim({identity, group, marketId, slot, recipient})`;
  - `toSolanaProof(semaphoreProof)`. Port dari `spikes/semaphore/to-solana.mjs`.
- **`packages/sdk`:**
  - `pda.*` untuk semua seed di 6.2.1;
  - builder untuk setiap instruksi di 6.2.2;
  - `encryptOption(optionIndex, mxePubkey)` dan `encryptBid(amount, bidder)`, memakai `@arcium-hq/client` 0.13.2;
  - decoder akun dan listener event.
- **`packages/shared`:** `TIERS`, `DEFAULT_PARAMS` (D-03/D-06), `fieldHash()`, `keccak()`, tipe DTO API di 6.5.

### 6.8 Frontend (`apps/web`)

| Route | Pengguna | Isi |
|---|---|---|
| `/` | semua | Landing: masalah, cara kerja, tombol per peran |
| `/scout/onboard` | scout | Buat atau impor identitas → Reclaim (QR atau link) → tier → masuk grup |
| `/markets` | semua | Daftar market (status, kategori, waktu) |
| `/markets/:id` | scout | Tambah opsi, pilih ≤ 3 opsi, nominal, alasan (cek Veritas langsung), buat bukti di browser, kirim stake |
| `/scout/positions` | scout | Posisi tersimpan lokal, status, klaim ke alamat pilihan, tanggapi sengketa atau perkenalan |
| `/buyer/markets/:id` | pembeli | Pratinjau → tawaran tertutup (ceiling) → hasil → pilih x sinyal sesuai urutan → baca sinyal → minta perkenalan → catat hasil / sengketa |
| `/create` | pembuat / operator | Form market (parameter default D-03/D-06, durasi demo) |
| `/team` | tim | Opt-in / opt-out dan daftar wallet deploy (P2) |
| `/admin` | operator | Verifikasi pembeli, sengketa, epoch, picu keeper |

- **Wallet:** Phantom lewat wallet-standard.
- **Variabel publik:** hanya yang berawalan `VITE_`.
- **Tampilan:** light dan dark; nada visual "bisikan": tenang, privat, tegas.

### 6.9 Variabel lingkungan

Semuanya di satu `.env` root. Nama variabel juga dicatat di `.env.example`.

| Variabel | Dipakai oleh | Status |
|---|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FAST_MODEL`, `GEMINI_EMBED_MODEL` | server (Veritas) | ✅ semua terisi (D-30) |
| `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `RECLAIM_PROVIDER_ID` | server | ✅ |
| `WALLET_ADDRESS` | skrip / deploy | ✅ |
| `SOLANA_RPC_URL`, `BISIK_PROGRAM_ID`, `USDC_MINT`, `OPERATOR_KEYPAIR_PATH`, `ARCIUM_CLUSTER_OFFSET` | server, keeper, skrip | Belum |
| `PLATFORM_SALT`, `SERVER_DATA_KEY`, `JWT_SECRET`, `SERVER_PUBLIC_URL` | server | Belum (dibuat acak) |
| `VITE_SERVER_URL`, `VITE_RPC_URL`, `VITE_PROGRAM_ID`, `VITE_USDC_MINT` | web | Belum |

---

## 7. Data demo [Usulan]

Semua **fiktif**. Jangan memakai nama atau logo ekosistem nyata sebagai pembeli di UI.

- **Pembeli:** "Ecosystem A" (rank #1), "Ecosystem B" (rank #2), "Ecosystem C" (harga rata).
- **Scout:** 5 identitas di grup Gold epoch 1 (memenuhi k = 5). Satu di antaranya memakai bukti Reclaim asli dari akun Dien. Sisanya dimasukkan lewat skrip seed yang ditandai jelas sebagai data demo.
- **Tim:** 6 tim fiktif ("Team Lumen", "Team Garuda", dst.) dengan repo dummy.
- **Market:** "Tim DeFi pasca-hackathon Q4 2026". Durasi demo: submit 5 menit, lelang 3 menit, jendela hasil 10 menit, sengketa 3 menit.
- **Hasil:** satu tim melakukan deploy program dummy di devnet dari `deploy_wallet` terdaftar, sehingga oracle mendeteksinya.

---

## 8. Daftar task

Format: **ID · judul · prioritas · pemilik · dependensi.** Lalu langkah, dan **Selesai bila** (kriteria penerimaan).

### Fase A: Fondasi repo (target M0, Sab 19:00)

- [x] **A1 · Workspace pnpm · P0 · agent · –**
  - `package.json` root (private, scripts `build`, `test`, `dev`), `pnpm-workspace.yaml` (apps/*, packages/*, services/*), `tsconfig.base.json` dipakai semua paket TS.
  - Buat `package.json` + `tsconfig.json` minimal untuk `packages/{shared,zk,sdk,veritas}`, `apps/{web,server}`, `services/keeper`.
  - **Selesai bila:** `pnpm install` dan `pnpm -r build` lolos tanpa error.
- [x] **A2 · Workspace Anchor + Arcium · P0 · agent · –**
  - `arcium init` (atau setara) di `contracts/` dengan nama program `bisik`. Pin Anchor 1.0.2, `arcium-anchor`/`arcis` =0.13.2, `rust-toolchain.toml` 1.89.0, `[test] startup_wait = 180000`.
  - Circuit hello-world sendiri (bukan salinan contoh).
  - **Selesai bila:** `arcium build` lolos dan `arcium test` untuk circuit hello lolos di localnet.
- [x] **A3 · LICENSE MIT + README kerangka · P0 · agent · –**
  - README memuat: ringkasan, arsitektur, asumsi kepercayaan (5.3), rujukan dan pengungkapan (Arcium examples sebagai rujukan, Semaphore MIT, provider Reclaim), cara menjalankan.
  - **Selesai bila:** file ada dan tidak menyebut data rahasia.
- [x] **A4 · Keypair dan mock USDC · P0 · agent · A2**
  - `scripts/create-mock-usdc.ts`: mint 6 desimal, airdrop ke wallet demo.
  - Keypair operator dan admin disimpan di `~/.config/bisik/` (di luar repo). Path-nya ditulis ke `.env`.
  - **Selesai bila:** saldo mock USDC muncul di localnet; nama variabel tercatat di `.env.example`.
- [x] **A5 · `.env.example` lengkap · P0 · agent · –**
  - Semua nama variabel di 6.9, tanpa nilai.
  - Buat `PLATFORM_SALT`, `SERVER_DATA_KEY`, dan `JWT_SECRET` secara acak dan tulis ke `.env` (jangan dicetak).
  - **Selesai bila:** `grep -c = .env.example` cocok dengan tabel 6.9.
- [x] **A6 · Verifikasi jalur devnet Arcium · P0 · agent · A2**
  - Baca docs Arcium tentang deploy ke devnet (cluster offset, biaya, akun MXE). Coba deploy circuit hello ke devnet.
  - **Selesai bila:** deploy devnet berhasil (catat `ARCIUM_CLUSTER_OFFSET`), **atau** terbukti tidak tersedia dan cadangan "demo localnet terekam" diaktifkan (bagian 12). Catat hasilnya di Progress Log.
- [x] **A7 · Commit pertama · P0 · agent · A1–A5**
  - Commit kerangka (tanpa `.env`, tanpa clone contoh Arcium). Push ke `origin main` (private).
  - **Selesai bila:** `git status` bersih dan `git ls-files | grep -E '\.env$'` kosong.

### Fase B: Identitas ZK (Semaphore)

- [x] **B1 · `packages/zk` · P0 · agent · A1**
  - API seperti 6.7. Port konversi dari `spikes/semaphore/to-solana.mjs`. Kedalaman pohon tetap 20.
  - **Selesai bila:** tes unit membuat bukti stake dan klaim, mengonversinya, dan memverifikasinya di JS.
- [x] **B2 · Generator VK · P0 · agent · B1, A2**
  - `scripts/gen-vk.ts`: ekspor VK dari `semaphore-20.zkey` → `contracts/programs/bisik/src/zk/vk.rs`. Catat hash file zkey.
  - **Selesai bila:** `vk.rs` dihasilkan secara deterministik dan ter-commit.
- [x] **B3 · Verifikasi di program · P0 · agent · B2**
  - `zk/verify.rs`: `verify_semaphore(proof, root, nullifier, message, scope)` dengan `groth16-solana` 0.2.0 dan `field_hash` berbasis keccak.
  - **Selesai bila:** tes LiteSVM: bukti valid lolos, nullifier/root/message yang diubah ditolak, CU < 120 ribu.
- [~] **B4 · Pembuatan bukti di browser · P0 · agent · B1, G1**
  - Muat `semaphore-20.wasm` dan `.zkey` di Vite: aset lokal di `public/` atau unduh dari snark-artifacts. Ukur waktunya.
  - **Selesai bila:** bukti dibuat di Chrome/Safari dalam < 10 detik. Kalau gagal, jalankan cadangan B4 (bagian 12).
- [x] **B5 · Cek lisensi dan asal-usul artefak zkey · P1 · agent · –**
  - Cari sumber trusted setup Semaphore v4 (ceremony PSE) dan lisensi artefaknya.
  - **Selesai bila:** dicatat di README, bagian rujukan.

### Fase C: Program onchain (tanpa Arcium dulu, lalu disambungkan)

- [x] **C1 · `Config` + `init_config` + `rotate_epoch` · P0 · agent · A2**
  - **Selesai bila:** tes inisialisasi dan perubahan epoch lolos.
- [x] **C2 · `publish_group_root`, `register_source_nullifier`, `register_buyer` · P0 · agent · C1**
  - **Selesai bila:** hanya operator yang bisa memanggil (tes penolakan); root history bergeser dengan benar.
- [x] **C3 · `create_market` + Escrow · P0 · agent · C1**
  - Validasi parameter D-03/D-06; dua jenis market; durasi bebas untuk demo.
  - **Selesai bila:** tes membuat kedua jenis market; parameter di luar batas ditolak.
- [x] **C4 · `add_option` · P0 · agent · C3**
  - Batas 16 opsi. Simpan komitmen tim, bukan identitas tim.
  - **Selesai bila:** tes batas opsi dan status lolos.
- [x] **C5 · `stake` (dengan ZK) · P0 · agent · B3, C2, C4**
  - Semua pemeriksaan di 6.2.2 #7. Transfer USDC ke escrow. Hitung `weight_bps`: bonus awal linear 1,5 → 1,0 sepanjang masa submit, dikali multiplier tier.
  - Sebelum D1 siap: simpan `enc_option` saja (agregasi lewat cadangan).
  - **Selesai bila:** tes stake valid; slot 4, nullifier ganda, root asing, dan message yang diubah semuanya ditolak.
- [x] **C6 · `close_submit` · P0 · agent · C5**
  - **Selesai bila:** status berubah, dan (setelah D2) `preview` terisi lewat callback.
- [x] **C7 · `place_bid`, `resolve_auction`, `refund_bid` · P0 · agent · C6, D3**
  - Ceiling deposit (D-23); GSP b = 2; harga cadangan.
  - **Selesai bila:** skenario 3 penawar: dua pemenang dengan harga yang benar; refund selisih tepat sampai base unit.
- [x] **C8 · `select_hidden` · P0 · agent · C7**
  - Urutan wajib #1 lalu #2. Timeout: setelah `auction_end + T`, rank berikutnya boleh memilih.
  - **Selesai bila:** tes urutan, duplikasi opsi, dan batas x lolos.
- [x] **C9 · `buy_flat` · P0 · agent · C8**
  - **Selesai bila:** pembeli rank 0 mendapat alokasi; dana masuk pool.
- [x] **C10 · `register_deploy_wallet`, `record_outcome`, `finalize_outcomes` · P0 · agent · C9**
  - Aturan default D-05.
  - **Selesai bila:** tes hasil deploy, hasil grant (atestasi pembeli), dan default.
- [x] **C11 · `open_dispute`, `resolve_dispute` · P1 · agent · C10**
  - Slash ke `charity` (D-07); opini tidak pernah di-slash.
  - **Selesai bila:** upheld → stake ke charity dan posisi tidak bisa diklaim; rejected → normal.
- [x] **C12 · `settle_position`, `claim`, `settle_market_fees` · P0 · agent · C10, D5**
  - Cadangan sebelum D5: payout dihitung operator dari data terdekripsi (diungkapkan).
  - **Selesai bila:** total yang dibayarkan = stake + 80% pool (+ 15% treasury + 5% tim, atau kembali ke pool scout); tidak ada dana tersisa tak terdistribusi; klaim kedua ditolak.
- [x] **C13 · Event + IDL · P0 · agent · C1–C12**
  - **Selesai bila:** IDL dihasilkan; event terbaca di tes.
- [x] **C14 · Tes integrasi program · P0 · agent · C1–C13**
  - Satu skenario lengkap F0–F9 di localnet Arcium.
  - **Selesai bila:** `arcium test` lolos dari awal sampai akhir.

### Fase D: Circuit Arcium

- [x] **D1 · `init_market_state` + `allocate_position` · P0 · agent · A2**
  - **Selesai bila:** setelah 3 stake terenkripsi, total per opsi (didekripsi di tes) benar.
- [x] **D2 · `aggregate_preview` · P0 · agent · D1**
  - Ambang kekuatan [Usulan]: lemah < 20% skor maksimum, kuat ≥ 50%.
  - **Selesai bila:** pratinjau hanya berisi histogram, tanpa indeks opsi.
- [x] **D3 · Lelang top-3 + `resolve_auction` GSP · P0 · agent · A2**
  - Tulis sendiri dengan contoh Vickrey sebagai rujukan. Ikat penawar ke signer (keterbatasan contoh).
  - **Selesai bila:** tes 3–4 penawar: pemenang dan harga sesuai rumus, harga cadangan ditegakkan.
- [x] **D4 · `reveal_signals` ke kunci pembeli · P1 · agent · D2**
  - **Selesai bila:** pembeli mendekripsi skor opsi yang diizinkan saja.
- [x] **D5 · `compute_payout` · P0 · agent · D1**
  - **Selesai bila:** payout per posisi cocok dengan perhitungan referensi TypeScript (toleransi 1 base unit).
- [x] **D6 · `credit_reputation` + `epoch_tiers` · P2 · agent · D5**
  - **Selesai bila:** tier scout naik setelah hasil sukses di epoch berikutnya.
- [x] **D7 · Ukur latensi · P1 · agent · D1–D5**
  - Catat detik per circuit di localnet. Hasilnya dipakai untuk menyusun naskah demo.
  - **Selesai bila:** tabel latensi masuk Progress Log.

### Fase E: Server (`apps/server`) dan keeper

- [x] **E1 · Kerangka Hono + SQLite + loader `.env` · P0 · agent · A1**
  - **Selesai bila:** `GET /v1/health` mengembalikan versi; skema tabel 6.5 dibuat lewat migrasi.
- [x] **E2 · Verifier Reclaim · P0 · agent · E1, C2**
  - Sesi (`acceptAiProviders: true`), callback, `verifyProof` (konfigurasi hash provider kalau tersedia), penanda tangan ∈ attestor, **aturan R23**, tier, `sourceNullifier = keccak(PLATFORM_SALT ‖ "github" ‖ lowercase(username))`, `register_source_nullifier`, tambah daun.
  - **Uji live wajib:** satu login GitHub asli Dien. Catat `parameters.url` yang dipakai provider AI.
  - **Selesai bila:** bukti asli Dien diterima (atau ditolak dengan `UNOWNED_SOURCE` sesuai aturan, lalu provider diperbaiki); bukti fixture yang diubah ditolak; username tidak tersimpan di DB maupun log.
- [x] **E3 · Layanan grup · P0 · agent · E1, B1, C2**
  - LeanIMT per (tier, epoch); `publish_group_root` setiap ada daun baru (debounce 10 detik); ambang k (flag demo).
  - **Selesai bila:** root di server = root onchain = root yang dihitung browser.
- [x] **E4 · Team-ref + alasan + pipeline Veritas · P0 · agent · E1, F1–F6**
  - **Selesai bila:** `POST /v1/reasons` mengembalikan skor dalam < 8 detik; teks tersimpan terenkripsi.
- [x] **E5 · SIWS + endpoint sinyal · P0 · agent · E4, C8, C9**
  - Pemeriksaan izin dari `Allocation` onchain.
  - **Selesai bila:** pembeli rank #2 tidak bisa melihat opsi yang disembunyikan #1; pembeli rank 0 hanya melihat sisanya.
- [x] **E6 · Oracle hasil · P0 · agent · C10**
  - Cari transaksi deploy program dari `deploy_wallet` di devnet dalam jendela (`getSignaturesForAddress` + cek instruksi BPF Loader).
  - **Selesai bila:** deploy dummy terdeteksi dan `record_outcome` terkirim.
- [x] **E7 · Keeper (`services/keeper`) · P0 · agent · C6–C12**
  - Loop: tutup submit, selesaikan lelang, timeout pemilihan, finalisasi hasil, settle posisi, biaya, ganti epoch. Idempoten.
  - **Selesai bila:** satu market demo berjalan sampai `Settled` tanpa intervensi manual.
- [x] **E8 · Sengketa + perkenalan (D-15) · P1 · agent · C11, E5**
  - **Selesai bila:** alur sengketa dan permintaan perkenalan berjalan lewat API.

### Fase F: Veritas (`packages/veritas`, D-21)

- [x] **F1 · Client Gemini · P0 · agent · A1**
  - Model dari `.env`, retry, batas laju, keluaran JSON.
  - **Selesai bila:** panggilan uji berhasil memakai `GEMINI_API_KEY` (kunci tidak tercetak).
- [x] **F2 · `scoreDuplicate` · P0 · agent · F1**
  - **Selesai bila:** teks salin-tempel → D ≥ 0,9; teks berbeda → D < 0,4 (fixture).
- [x] **F3 · `scoreAiLikelihood` + `drs` · P0 · agent · F1**
  - **Selesai bila:** nilai 0..1 dan flag terisi; tidak pernah dipakai untuk slashing.
- [x] **F4 · `extractClaims` · P0 · agent · F1**
  - **Selesai bila:** fixture "memimpin migrasi X ke Y" → `verifiable`; "timnya keren" → `opinion`.
- [x] **F5 · `privacyFilter` · P0 · agent · F1**
  - **Selesai bila:** nama orang, handle, dan URL pribadi hilang; makna tetap (cek manual 5 fixture).
- [x] **F6 · `summarize` · P1 · agent · F1**
  - **Selesai bila:** pro dan kontra per opsi, masing-masing maksimal 3 poin.
- [x] **F7 · Mode gagal-aman · P0 · agent · F2–F6**
  - **Selesai bila:** saat API Gemini dimatikan, stake tetap bisa jalan dengan flag `ai_unavailable`.
- [x] **F8 · `sybilHints` · P2 · agent · F2**

### Fase G: Frontend (`apps/web`)

- [x] **G1 · Kerangka Vite + React + TS + Tailwind, wallet, routing, tema · P0 · agent · A1**
- [~] **G2 · Onboarding scout · P0 · agent · G1, E2, E3, B1**
  - **Selesai bila:** akun GitHub Dien → tier tampil → komitmen masuk grup.
  - UI identitas/backup/Reclaim/polling siap. Uji devnet memakai anggota sintetis lewat demo API; login GitHub Dien belum dilakukan.
- [x] **G3 · Daftar dan detail market · P0 · agent · G1, C13**
- [x] **G4 · Alur stake · P0 · agent · G3, B4, E4, D1**
  - Pilih opsi, nominal, alasan dengan flag Veritas langsung, bukti dibuat di browser, kirim transaksi.
  - **Selesai bila:** stake berhasil di localnet/devnet dari UI.
- [x] **G5 · Form pembuat market · P0 · agent · G1, C3**
- [~] **G6 · Dashboard pembeli · P0 · agent · G3, C7–C9, E5**
  - Pratinjau, tawaran, hasil lelang, pilih tersembunyi, harga rata, pembaca sinyal tersedia. Chrome market 8: dua tawaran MPC, refund/dekripsi/seleksi pembeli pertama lulus. Keeper mengembalikan bid otomatis; UI kini membaca flag refunded dan menangani balapan. Uji ulang siklus lengkap tertahan RPC publik HTTP 429; penerimaan G6 belum ditandai selesai.
- [x] **G7 · Hasil dan sengketa (pembeli) · P0 · agent · G6, C10, C11, E6**
  - Form grant/deploy dan klaim sengketa terhubung ke API serta transaksi onchain. API menolak klaim tersembunyi/posisi lain; respons scout dibuktikan dengan Semaphore. Walkthrough lengkap sengketa dari UI masih bagian H2.
- [x] **G8 · Posisi dan klaim (scout) · P0 · agent · G4, C12**
- [x] **G9 · Konsol admin · P1 · agent · G1, E8**
- [~] **G10 · Halaman tim (opt-in/out) · P2 · agent · C10**
  - Halaman siap; opt-in lewat operator terhubung ke `registerDeployWallet`. Program belum memiliki instruksi opt-out atau registrasi mandiri tim; UI mengungkapkan batas tersebut.
- [x] **G11 · Mode demo · P1 · agent · G5**
  - Preset durasi pendek dan banner "DEMO DATA".
- [x] **G12 · Pemolesan UI dan aksesibilitas · P1 · agent · G2–G8**
  - Status kosong, loading, dan error; teks jelas; responsif.

### Fase H: Integrasi dan data demo

- [x] **H1 · `scripts/seed-demo.ts` · P0 · agent · C14, E3**
  - Data fiktif bagian 7.
  - **Selesai bila:** satu perintah menyiapkan seluruh skenario.
- [ ] **H2 · Uji E2E manual F0–F10 · P0 · agent + Dien · H1, G2–G8**
  - **Selesai bila:** checklist alur lengkap tercentang; durasi tiap langkah tercatat.
- [x] **H3 · Deploy program ke devnet · P0 · agent · A6, C14**
  - **Selesai bila:** `BISIK_PROGRAM_ID` devnet aktif, atau cadangan localnet terekam diaktifkan.

### Fase I: Hosting [Usulan, D-25]

- [ ] **I1 · Web ke Vercel · P0 · agent + Dien (akun GitHub yang terhubung dengan repo, D-25) · G1**
  - **Selesai bila:** URL publik memuat aplikasi.
- [~] **I2 · Server + keeper ke Railway dengan volume persisten · P0 · deploy manual oleh Dien; agent menyiapkan `railway.json`/Dockerfile, daftar env, dan langkah-langkahnya · E1, E7**
  - **Selesai bila:** `GET /v1/health` publik merespons.
- [ ] **I3 · Callback Reclaim ke URL server publik · P0 · agent · I2, E2**
- [ ] **I4 · Uji asap produksi · P0 · agent · I1–I3**
  - **Selesai bila:** onboarding dan satu stake berjalan dari URL publik.

### Fase J: Submission

- [ ] **J1 · Buat project di Colosseum Arena dan cek syarat bukti University Award · P0 · Dien · –**
  - Catat syaratnya di Progress Log.
- [ ] **J2 · README final · P0 · agent · semua P0**
  - Masalah, demo, arsitektur, asumsi kepercayaan, keterbatasan, rujukan, lisensi, cara menjalankan.
- [ ] **J3 · Naskah demo · P0 · agent · M4 (atas aba-aba Dien)**
  - Wajib memakai `important_for_demo.md` sebagai daftar isi wajib. Perbarui dokumen itu setelah K4, D7, dan E2.
- [ ] **J4 · Rekam video demo ≤ 3 menit · P0 · Dien (agent menyiapkan skrip dan data) · J3, H2**
- [ ] **J5 · Video pitch 2–3 menit · P0 · Dien · J6**
  - Buka dengan pengguna dan masalah, bukan produk.
- [~] **J6 · Bagian GTM + validasi permintaan · P0 · agent · K4**
  - Angka outreach apa adanya, termasuk penolakan (memo 113).
- [ ] **J7 · Ubah repo ke public · P0 · Dien · J2**
- [ ] **J8 · Isi dan kirim form submission · P0 · Dien · J1–J7**
  - Target Selasa 11:00 WIB.
- [ ] **J9 · Sidetrack Superteam (opsional) · P2 · Dien · keputusan D-29**

### Fase K: Outreach D-12 (pemilik: Dien; agent mencatat)

Bahan lengkap: `../Ideation-Colosseum/living-doc/d12-outreach-kit.md`. Target: 10 percakapan dengan pembeli, 10 dengan scout, 5 dengan tim.

- [ ] **K1 · Sab 10 Okt · Dien ·** Kirim DM ke pembeli prioritas 1–2 (Superteam Indonesia, tim Retro9000, Solana Foundation, Base Ecosystem Fund, Arbitrum Domain Allocator, ekosistem Monad); unggah ajakan publik.
- [ ] **K2 · Min 11 Okt · Dien ·** DM ke calon scout (juri, mentor, devrel, komunitas Indonesia) dan ke tim builder.
- [ ] **K3 · Sen 12 Okt jam kerja · Dien ·** Follow-up ke pembeli.
- [ ] **K4 · Sen 12 Okt 20:00 · Dien + agent ·** Kunci angka. Agent merangkum `d12-evidence-log.csv` untuk J6.
- [ ] **K5 · terus-menerus · agent ·** Setiap balasan yang ditempel Dien dicatat ke log bukti (tanpa nama orang, kutipan hanya kalau diizinkan).

### Fase L: Uji dependensi (status)

| ID | Uji | Status | Catatan |
|---|---|---|---|
| L1 | Lelang Arcium Vickrey (localnet) | [x] | Memo 114. Rujukan saja (R21) |
| L2 | Semaphore + `groth16-solana` onchain | [x] | 96.861 CU |
| L3 | Logika verifier Reclaim offchain | [x] | Fixture bukti asli |
| L4 | Reclaim live lewat aplikasi Bisik + aturan R23 | [ ] | Bagian dari E2 |
| L5 | Bukti Semaphore di browser | [ ] | Bagian dari B4 |
| L6 | Deploy ke devnet Arcium | [ ] | A6 |

---

## 9. Rencana uji dependensi (yang tersisa)

| Uji | Batas waktu | Lolos bila | Kalau gagal |
|---|---|---|---|
| L6 devnet Arcium (A6) | Sab 21:00 | Circuit hello ter-deploy di devnet | Demo localnet terekam; diungkapkan di README dan video |
| L5 bukti di browser (B4) | Min 12:00 | < 10 detik di browser | Bukti dibuat di CLI lokal scout (`pnpm bisik prove`), lalu diunggah. Privasi tetap terjaga, UX lebih buruk |
| L4 Reclaim live (E2) | Min 20:00 | Bukti Dien diterima dan URL sumbernya halaman login-only | (a) Buat provider kedua khusus kepemilikan, lalu verifier mewajibkan dua bukti; (b) kalau tetap gagal, onboarding demo memakai fixture terverifikasi + tier manual oleh operator, **diungkapkan** |

---

## 10. Rencana outreach (ringkas)

- Pengirim: **Dien**, lewat X, Telegram, atau Discord. Agent tidak mengirim apa pun (D-12).
- Pesan siap pakai ada di kit, bagian 3: pembeli (EN), Retro9000 (EN), scout (ID/EN), tim (ID/EN), dan unggahan publik.
- Jadwal ada di Fase K. Penguncian angka: Senin 12 Okt 20:00 WIB.
- Format pelaporan di submission: "Asked N, replied M; K would join a non-binding pilot; main objection: …".

---

## 11. Rencana hosting [Usulan, D-25]

| Komponen | Usulan | Alasan |
|---|---|---|
| `apps/web` | Vercel | Statis/Vite, gratis, cepat |
| `apps/server` + `services/keeper` | Railway, Render, atau Fly.io dengan volume persisten | Butuh proses yang terus berjalan (callback Reclaim, keeper, SQLite) |
| RPC | Devnet publik `api.devnet.solana.com` (atau Helius gratis kalau kena batas) | — |
| Arcium | Devnet cluster kalau A6 lolos; kalau tidak, localnet di laptop untuk rekaman | — |

Akun hosting dibuat Dien. Agent menyiapkan konfigurasi dan perintah.

---

## 12. Cadangan dan aturan potong

| Pemicu | Cadangan | Wajib diungkapkan? |
|---|---|---|
| D3 (lelang Arcium) belum lolos pada Min 18:00 | Lelang commit-reveal (hash tawaran → reveal), harga GSP sama | Ya |
| D1/D2/D5 belum lolos pada Min 22:00 | Agregasi dan payout dihitung operator dari data yang didekripsi server | Ya |
| B4 gagal | Bukti dibuat di CLI lokal (lihat bagian 9) | Ya (UX) |
| B3/E3 gagal total | Nullifier sumber saja, tanpa grup anonim (D-17 turun ke v2, **harus minta izin Dien**) | Ya |
| E2 / R23 gagal | Lihat bagian 9 | Ya |
| A6 gagal | Demo localnet terekam | Ya |
| M4 meleset > 4 jam | Tunda D4, D6, E8, G9–G10, C11 ke v2; fokus jalur emas | Tidak (fitur P1/P2) |
| Disk < 3 GiB | `cargo clean` di `contracts/target`; hapus cache Docker build | — |

---

## 13. Risiko aktif

Rincian lengkap ada di living doc bagian 16.

| ID | Risiko | Pengaruh ke build |
|---|---|---|
| R1 | Ekosistem tidak mau membayar | Validasi lewat outreach (Fase K) |
| R4 | De-anonimisasi di komunitas kecil | Penyaring privasi Veritas, k = 5 |
| R14 | Arcium Mainnet Alpha / devnet belum terdesentralisasi penuh | Diungkapkan |
| R18 | Dependensi | Fase L dan bagian 9 |
| R19 | Operator tahu username ↔ komitmen identitas | Tidak disimpan; diungkapkan |
| R20 | Grup kecil dan pendanaan stake bisa dilacak | k = 5; diungkapkan |
| R21 | Contoh Arcium tanpa lisensi | Tulis ulang; jangan commit clone |
| R22 | Disk sempit | Pantau `df -h` |
| R23 | Provider Reclaim tipe AI; sumber username belum jelas | Aturan verifier R23 + uji live E2 |
| R-T1 | Latensi MPC per langkah beberapa detik | Durasi demo pendek, rekaman dipercepat (D7) |
| R-T2 | Kuota Gemini habis | Mode gagal-aman F7; `GEMINI_MODEL` bisa diganti |

---

## 14. Keputusan terbuka (butuh Dien)

> **10 Okt 16:00:** D-22 sampai D-30 sudah diputuskan (Dien: "ikut usulanmu semua") dan dipindah ke tabel 1.5. Tabel di bawah ini arsip.

| ID | Pertanyaan | Usulan agent |
|---|---|---|
| D-22 | Privasi stake: nominal per posisi terlihat publik karena transfer USDC publik. Cukupkah merahasiakan **opsi** yang didukung? | Ya untuk v1. Diungkapkan. Shielded pool di v2 |
| D-23 | Tawaran lelang butuh setoran dana. Setoran = "ceiling" (batas atas yang dipilih pembeli), sehingga yang bocor hanya batas atas | Ya, ceiling deposit |
| D-24 | Peran `apps/mcp-server` | P3: tool MCP read-only (daftar market, pratinjau) untuk agen AI pembeli. Tidak dikerjakan sebelum M6 |
| D-25 | Penyedia hosting | Vercel (web) + Railway (server/keeper) |
| D-26 | Penyimpanan server | SQLite + enkripsi at-rest AES-GCM |
| D-27 | Token di devnet | Mock USDC buatan sendiri |
| D-28 | Ambang tier dari kontribusi | ≥1000 Gold, 300–999 Silver, 50–299 Bronze |
| D-29 | Ikut sidetrack Superteam? | Diputuskan setelah M4 |
| D-30 | Model Gemini yang dipakai (`GEMINI_MODEL`) | Dien mengisi model yang belum kena batas |

---

## 15. Progress Log

Hanya ditambah, jangan dihapus. Format: `waktu WIB · siapa · apa · bukti/path`.

- 2026-10-09 · Dien + agent · Ideasi selesai; living doc v0.1 · `../Ideation-Colosseum/living-doc/`
- 2026-10-09 · agent · Riset validasi permintaan dan kit outreach · memo 113, `d12-outreach-kit.md`
- 2026-10-10 12:50 · agent · Toolchain dipasang (Solana 3.1.10, Anchor 1.0.2, Arcium 0.13.2, circom 2.2.3, snarkjs 0.7.6) · living doc 17.1
- 2026-10-10 13:30 · agent · Disk penuh (578 MB); dibersihkan atas izin Dien → ~8 GiB · memo 114
- 2026-10-10 13:45 · agent · Uji Arcium Vickrey lolos (localnet) · `../Ideation-Colosseum/spikes/arcium-spike2.log`
- 2026-10-10 13:50 · agent · Uji Semaphore onchain lolos (96.861 CU) · `../Ideation-Colosseum/spikes/semaphore/`
- 2026-10-10 14:00 · agent · Uji verifier Reclaim offchain lolos (fixture) · `../Ideation-Colosseum/spikes/reclaim/offchain-verifier.mjs`
- 2026-10-10 14:15 · Dien + agent · Repo `scientivan/Bisik`, kerangka folder, satu `.env` + symlink · `AGENTS.md`
- 2026-10-10 14:45 · Dien · Provider Reclaim `e5ece37a…` (tipe AI) dibuat; Try Demo sukses; uji live dari kode macet, ditunda ke E2 · memo 114 (lanjutan)
- 2026-10-10 15:00 · agent · `task-tracker.md` v1.0 dibuat atas aba-aba Dien · file ini
- 2026-10-10 15:45 · agent · Uji model Gemini: 3.8-flash OK (72–110 dtk), 3.5-flash-lite OK (1,2 dtk), 3.1-flash-lite OK (5,4 dtk), embedding-2 OK (3072); Pro dan 3.5-flash 429; 2.5-pro 404. Nama model ditulis ke `.env` · D-30
- 2026-10-10 16:00 · Dien · D-22 sampai D-30 diputuskan (ikut usulan; Vercel lewat akun GitHub, Railway manual oleh Dien) · tabel 1.5
- 2026-10-10 16:00 · agent · `important_for_demo.md` dibuat (isi wajib video demo dan pitch) · file itu

- 2026-10-10 17:00 · agent · A1–A5, A7, B1–B3, C1–C14, D1–D3, D5, D7, F1–F8 selesai. `contracts/tests/e2e.ts` LULUS di localnet Arcium: stake ZK, agregasi MPC, preview (3 opsi: 1 lemah, 2 kuat), lelang GSP (#1 bayar 200, #2 bayar 120, nilai tawaran tidak terbuka), seleksi berurutan, beli flat, sengketa (20 USDC ke amal), settlement MPC, klaim ZK ke alamat baru, fee 61,5 USDC. `place_bid` dipecah jadi `open_bid` + `place_bid` (batas stack). Commit `5964495` · `../Ideation-Colosseum/spikes/bisik-e2e4.log`
- 2026-10-10 17:00 · agent · D7 latensi MPC localnet (dtk, rata-rata/maks): init_market_agg 4,0/4,0 · init_auction 2,6/2,6 · allocate 3,5/4,1 · preview 3,5/3,5 · place_bid 3,3/3,5 · resolve_auction 2,9/2,9 · winning_weights 2,9/2,9 · position_hits 3,1/3,4 · `bisik-e2e4.log`
- 2026-10-10 17:05 · agent · A6 [!]: deploy devnet butuh ~13,5 SOL di puncak; wallet deploy 7,88 SOL; airdrop devnet kena batas. Program kini mendukung circuit offchain (`BISIK_CIRCUIT_BASE_URL`). Commit `f0596de`
- 2026-10-10 17:10 · agent · `@bisik/sdk` (PDA, akun Arcium, enkripsi MXE, `visibleMask`, `queueAndWait`) · `packages/sdk`
- 2026-10-10 17:10 · agent · E1–E8 selesai: `apps/server` (Hono + `node:sqlite`). Tes 7/7 lulus termasuk bukti Reclaim asli dari SDK (tanda tangan dan attestor lolos, ditolak karena tidak ada jumlah kontribusi; versi yang diubah ditolak `INVALID_PROOF`) · `apps/server/src/server.test.ts`
- 2026-10-10 17:10 · agent · E7 + H1: keeper dan seed. Uji gabungan localnet: market 0 (lelang) dan market 1 (eksklusif, pool 500) berjalan otomatis sampai Settled. Market 1: opsi default terkuat, pembayaran 425 USDC (85% pool) ke posisi pendukung. Bug alasan identik saling menimpa ditemukan dan diperbaiki · `services/keeper`, `scripts/seed-demo.ts`
- 2026-10-10 17:10 · agent · I2 disiapkan: `Dockerfile`, `.dockerignore`, `railway.json`; image dibangun dan dijalankan lokal, `/v1/health` OK. Deploy Railway menunggu Dien · `docs/deploy-railway.md`
- 2026-10-10 17:10 · agent · B5: artefak zkey dari `snark-artifacts` (MIT), ceremony Semaphore V4 di ceremony.pse.dev; hash dipin. Jumlah kontributor belum terverifikasi · https://docs.semaphore.pse.dev/trusted-setup
- 2026-10-10 17:10 · agent · D4 dan D6 ditunda (P1/P2). Alasan: frontend lebih mendesak; sinyal pembeli sudah tersedia lewat server (asumsi kepercayaan Veritas) · bagian 3.2

- 2026-10-10 18:00 · Dien · Menambah ~6 SOL ke wallet deploy `FRTMLy9…` (wallet CLI `~/.config/solana/id.json`, juga operator Bisik) · saldo 13,88 SOL
- 2026-10-10 18:05 · agent · Deploy pertama gagal `Max retries exceeded` (RPC publik); buffer 6,6 SOL ditutup dan diambil kembali. Deploy ulang lewat buffer sendiri berhasil · program `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD`
- 2026-10-10 18:10 · agent · Init MXE gagal: devnet menjalankan Arcium 0.15, CLI kita 0.13.2. Dien memilih upgrade ke 0.15 dan mengizinkan hapus clone `arcium-examples`, image 0.13.2, dan cache build
- 2026-10-10 18:20 · agent · Upgrade ke Arcium 0.15.0 tanpa perubahan kode. `arcium test` LULUS lagi; latensi MPC localnet 2,8–3,9 dtk · `../Ideation-Colosseum/spikes/bisik-e2e5.log`
- 2026-10-10 18:25 · agent · Program devnet di-upgrade (hash onchain = build lokal `2ed56b58…`), MXE devnet selesai (recovery material) · tx `51481H5j…`
- 2026-10-10 18:25 · Dien + agent · Circuit dihosting di repo publik baru `scientivan/bisik-circuits` (hanya .arcis, bukan source), URL raw dipin ke commit `a86729c`. Hash file cocok dengan build lokal
- 2026-10-10 18:30 · agent · Seed demo di devnet sukses: comp def offchain, config, grup Gold 5 anggota, 3 pembeli, 2 market, 6 stake anonim. MPC devnet berjalan (alokasi ±4–20 dtk). Keeper devnet menjalankan siklus penuh (lulus, lihat 19:35)

- 2026-10-10 19:10 · Dien · Meminta sisa pekerjaan non-frontend dikerjakan paralel dengan beberapa sesi
- 2026-10-10 19:10 · agent · 4 subagent paralel dimulai: (1) D4 `reveal_signals` + D6 reputasi terenkripsi, uji localnet, tanpa deploy devnet karena SOL kurang untuk buffer upgrade; (2) B4 bukti Semaphore di browser + `docs/browser-proving.md`; (3) J6 draf `docs/gtm-and-demand.md`; (4) D-24 `apps/mcp-server`. Root memantau uji siklus penuh devnet (market 2) dan satu-satunya penulis tracker serta commit

- 2026-10-10 19:15 · subagent · J6 draf `docs/gtm-and-demand.md` (Inggris, ±1.940 kata, label Fakta/Inferensi/Rencana). Sumber diverifikasi ulang: Retro9000, Metis, MegaMafia, Base Batches, Scout Game, Colosseum FAQ. Tabel hasil K4 masih `_TBD_` (menunggu data outreach Dien) · J6 tetap [~]
- 2026-10-10 19:15 · agent · Temuan J6: klaim "scout dibayar hanya kalau tim ship" tidak tepat. Bayaran pembeli tidak bisa di-refund, dan default D-05 memberikannya ke sinyal terkuat. README dikoreksi; `important_for_demo.md` diberi peringatan. **Framing pitch = keputusan Dien**

- 2026-10-10 19:20 · subagent · D-24 `apps/mcp-server` (MCP stdio, 9 tool: health, list_markets, get_market, get_group, buyer_login, get_signals, request_introduction, get_introduction, check_outcome). Tidak ada tool yang memindahkan dana atau memakai kunci operator; `.env` root tidak dimuat. Smoke test 8/8 lulus terhadap API devnet · `apps/mcp-server/README.md`
- 2026-10-10 19:20 · agent · Catatan: `POST /v1/outcomes/check` belum butuh login, padahal bisa memicu transaksi operator. Diperbaiki setelah agent D4/D6 selesai menyentuh `apps/server/src/app.ts`

- 2026-10-10 19:30 · subagent · B4 (Chrome) lulus: bukti stake/klaim Semaphore depth 20 di headless Chrome 0,55–0,85 dtk; byte bukti Solana identik dengan Node; cross-check 19/19. Artefak wasm/zkey di-self-host dengan pin sha256 (zkey `33f9a067…`, sama dengan VK onchain), tidak di-commit; frontend perlu langkah `fetch-artifacts` sebelum `vite build`. Safari belum diuji, jadi B4 tetap [~] · `docs/browser-proving.md`, `scripts/browser-proof/`

- 2026-10-10 19:35 · agent · **Siklus penuh di devnet LULUS** (market 2, lelang): 4 stake anonim → alokasi MPC → preview → 3 tawaran tertutup → `resolve_auction` → refund tawaran → seleksi berurutan (A sembunyikan opsi 0, B opsi 1) → C beli flat → default outcome per pembeli → `compute_weights` → 4× `settle_position` → klaim ZK scout "ayu" 213,55 USDC (stake 100 + payout 113,55) ke alamat baru `ECdjg9Nd…`. Market 0 dan 1 juga Settled; fee market 1 ditarik keeper. Satu langkah MPC devnet ±15–20 dtk termasuk polling keeper. Saldo operator 6,31 SOL · log `tmp/devnet-run.log`, `tmp/keeper-dev.log` (lokal)

- 2026-10-10 20:00 · subagent + agent · D4 + D6 selesai di localnet: `arcium test` LULUS dengan asersi baru (3 pembeli mendekripsi tampilan masing-masing dan cocok dengan bobot onchain; 4 posisi dikredit, kredit ganda ditolak; tier epoch 2 = 1,2,2,2,2; reveal kedua per epoch ditolak). Root memverifikasi log · `../Ideation-Colosseum/spikes/bisik-e2e-d4d6.log`
- 2026-10-10 20:00 · agent · Integrasi: seed memakai `encryptStakeSecrets` (satu kunci untuk opsi + kredit) dan opsi `SEED_V2=1` (comp def D4/D6 + init reputasi); keeper memanggil `credit_reputation` setelah settlement bila tabel siap; `POST /v1/outcomes/check` kini wajib login; MCP mengirim token. Tes: server 7/7, zk 2/2, shared 4/4, veritas 5/5; semua paket typecheck
- 2026-10-10 20:00 · agent · Devnet belum di-upgrade ke D4/D6: perlu ±13 SOL di puncak (perpanjang ±287 KB ≈ 2 SOL + buffer 1,6 MB ≈ 11 SOL yang kembali), saldo 6,31 SOL · menunggu Dien

- 2026-10-10 20:30 · Dien · Mengirim 7 SOL ke wallet deploy (saldo 13,31 SOL)
- 2026-10-10 20:40 · agent · Devnet di-upgrade ke versi D4/D6: perpanjang 269.100 byte, buffer, upgrade; hash onchain = build lokal `4973d168…`; dana buffer kembali (saldo 11,92 SOL). 4 circuit baru di `scientivan/bisik-circuits` commit `3362b44` (8 circuit lama identik). `seed-demo.ts v2init` membuat 4 comp def + tabel reputasi (MPC `init_rep` di devnet OK)
- 2026-10-10 20:45 · agent · **D4 lulus di devnet** (market 2): ecosystem-a mask 111, b mask 110, c mask 100; masing-masing mendekripsi bobotnya sendiri lewat `seed-demo.ts reveal`
- 2026-10-10 20:45 · agent · ⚠️ Insiden: keeper mengkredit 6 posisi lama (market 0–2, dibuat sebelum perbaikan kunci) sebelum dihentikan. Kredit itu terdekripsi dengan kunci salah → sampai 6 dari 32 slot tabel reputasi devnet berisi entri acak. Tidak bisa direset tanpa instruksi baru + upgrade. Perbaikan: keeper hanya mengkredit market ID ≥ `KEEPER_REP_FROM_MARKET` (=3 di `.env`)
- 2026-10-10 21:15 · agent · **D4 + D6 LULUS di devnet** (market 3): siklus lelang penuh → 3 pembeli mendekripsi tampilan masing-masing (mask 111/110/100) → settlement → keeper `credit_reputation` 4× (credits 6→10) → `epoch_tiers` mengungkap daftar epoch 2 yang diurutkan di MPC (10 entri: 4 asli + 6 acak dari insiden); ayu/bima/citra/dewa level 2 (naik satu tier), eka tanpa catatan → klaim ayu 213,58 USDC ke alamat baru. Saldo operator 11,72 SOL · `tmp/devnet-d6.log` (lokal)
- 2026-10-11 · agent · Atas permintaan Dien, pesan outreach direvisi ke v0.2 (`../Ideation-Colosseum/living-doc/d12-outreach-kit.md` bagian 3): pesan pertama satu pertanyaan, framing payout dikoreksi (bukan "hanya kalau tim ship"), follow-up Senin, daftar larangan. Belum ada pesan terkirim (K1–K2 terlambat dari jadwal)
- 2026-10-11 · agent · Desain frontend disetujui Dien (artifact versi 13, arah Sonogram Bisikan lewat `/impeccable`). Seluruh aturan dan preferensi desain didokumentasikan di `DESIGN.md` (format DESIGN.md, bisa dibaca agent tanpa konteks). Sumber mockup ada di `docs/design-reference/`. `PRODUCT.md` dibuat. Implementasi di `apps/web` belum dimulai (G1)
- 2026-10-11 · agent · Koreksi pra-frontend (permintaan Dien). (1) SDK: `createRequire`/`node:module` diganti import JSON. Bundle browser (esbuild + polyfill crypto/stream/buffer + shim `packages/sdk/browser/`) lulus smoke test di Chrome: PROGRAM_ID, pdas, newViewKey, encryptStakeSecrets. Resep Vite di `docs/web-sdk-bundling.md`. (2) Server: `GET /v1/markets` (+ `?status=`), detail market kini memuat `options[{index,category,optedIn}]` serta minStake/maxStake/minReasonLen/reservePrice/flatPrice. Tes server 8/8 lulus, dicoba di devnet (market 1–3). (3) Mockup dan DESIGN.md dikoreksi: preview sebelum membeli = histogram satu market (bukan kekuatan per tim), alasan ≥ 200 karakter + penghitung, harga dari devnet. Ditambah bagian "Data truth constraints". (4) README asumsi #6, versi Arcium di tabel repo, serta spec API di tracker diperbarui. Belum: Safari dan transaksi devnet dari browser (G4)
- 2026-10-11 · agent · Revisi frontend `apps/web` atas review Dien: sonogram diganti aliran paket terenkripsi (`SignalStream`), bar bergaris diganti `Cipher` (gembok + sandi acak), bar tanpa label diganti `StrengthBars`. Halaman app dikecilkan mengikuti veritasprotocol.vercel.app/pools/init. Onboard dan Positions muat satu viewport 1440×900 (Positions jadi tiga kolom). typecheck, 3 tes web, dan vite build lulus. Catatan di `DESIGN.md` bagian "Revision 11 Oct 2026"

- 2026-10-11 · agent · Atas aba-aba Dien, implementasi semua task frontend G1–G12 dimulai. Kerangka Vite/React/TS/Tailwind, token desain, wallet-standard, landing Sonogram, routing, integrasi API dan transaksi stake/buyer/claim/admin ditulis. Menunggu typecheck, build dan verifikasi browser. Alur respons scout diberi bukti kepemilikan yang mengikat isi respons sebelum dihubungkan ke UI · `apps/web`, `apps/server/src/app.ts`

---

- 2026-10-11 · agent · Browser Chrome devnet market 6 lulus pembuatan market dan callback init MPC, stake dengan bukti Semaphore dari browser, SIWS + reveal_signals + dekripsi lokal, settlement dan klaim ke alamat baru sebesar 27 mock USDC. Group onboarding memakai fixture sintetis demo, bukan bukti GitHub Dien. Build produksi dan typecheck lulus, tes frontend 3/3 dan server 10/10. Safari WebDriver ditolak karena remote automation nonaktif. Desain diperiksa desktop/mobile; reviewer meminta histogram nyata dan amber Operator reads; keduanya sudah dikoreksi dan verdict tindak lanjut ship untuk dua koreksi tersebut · `docs/frontend-implementation.md`, `scripts/frontend-devnet.ts`

## 16. Cara memperbarui dokumen ini

1. **Saat mulai mengerjakan task:** ubah `[ ]` menjadi `[~]`.
2. **Saat selesai:** ubah menjadi `[x]` **hanya kalau** kriteria "Selesai bila" sudah terbukti. Tambahkan baris di Progress Log beserta buktinya (perintah, output, atau path).
3. **Saat terblokir:** `[!]` beserta alasan singkat di baris task, lalu tambahkan ke Progress Log.
4. **Kalau spesifikasi (bagian 6) berubah**, perbarui di commit yang sama, lalu catat di Progress Log.
5. **Keputusan baru dari Dien:** pindahkan dari bagian 14 ke tabel 1.5. Catat juga di Decision Log living doc dan di `../AGENTS.md`.
6. **Naikkan versi** di header: minor untuk status, mayor untuk perubahan rencana.

- 2026-10-11 · agent · G6 browser market 8: dua tawaran tertutup lulus, refund/dekripsi/seleksi #1 lulus. Ditemukan keeper sudah refund #2 tetapi UI menawarkan refund lagi; diperbaiki dengan status bid.refunded dan recheck setelah race. Percobaan ulang tertahan rate limit RPC 429 (server lokal perlu restart); tidak mengklaim lelang UI lengkap lulus. Konsol sengketa membaca status onchain dan menonaktifkan keputusan ulang. G7 implementasi + pengikat klaim API selesai; H2 walkthrough sengketa lengkap belum. Dokumentasi desain pendamping selesai, dua koreksi reviewer ship, seluruh build/typecheck lulus · `docs/frontend-design-system.md`

- 2026-10-11 · agent · Permintaan Dien: fullscreen hero termasuk header/rail pada perubahan zoom; animasi sesuai panduan; dark mode. Hero memakai 100dvh, rail normal-flow, ukuran fluid dan proportional fit khusus opening pada zoom ekstrem. Tema tersimpan, diterapkan sebelum render, mencakup landing/app/form. Animasi reveal/fill dan feedback 180ms; loop berhenti offscreen/hidden, reduced motion dihormati. Viewport simulasi 25–500% dan mobile lulus tanpa overflow/rail terpotong · `apps/web/src/lib/theme.tsx`, `apps/web/src/lib/motion.ts`, `DESIGN.md`
