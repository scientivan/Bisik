# Bisik: Hal Penting untuk Video Demo dan Pitch

> **Versi 1.0 · 10 Oktober 2026 · untuk Dien (dan agent yang menyusun naskah demo, task J3)**
>
> Dokumen ini daftar isi wajib untuk video, bukan naskah. Isinya mencakup apa yang harus terlihat, disebut, dan dihindari. Semuanya diambil dari temuan riset dan uji selama 9–10 Oktober.
>
> Penanda: **[Fakta]** = ada sumbernya (daftar di akhir dokumen). **[Inferensi]** = penalaran agent. **[ISI NANTI]** = diisi setelah datanya ada.
>
> **Perbarui dokumen ini** setiap kali ada angka baru, misalnya hasil outreach (K4), latensi (D7), atau hasil uji live Reclaim (E2).

---

## 0. Yang dinilai juri dan cara mereka menonton

**Isi wajib submission.** [Fakta, FAQ Colosseum]

- "A two-to-three-minute presentation video" (pitch).
- "A product-demo video of no more than three minutes".
- "Go-to-market strategy, demand validation, and plans for developing distribution".

**Kriteria resmi.** [Fakta, rules §8] Functionality, Potential Impact, Novelty, UX, Open-source ("compose with other primitives"), dan Business Plan ("viable business… how adept is the team").

**Faktor yang disebut FAQ.** [Fakta] Founder + Market Fit, Insight, Product + Execution, Potential Market Size, Founder Communication, Viability, dan Traction.

**Cara juri menonton.** [Fakta, blog workshop Colosseum]

- Video pitch "is usually the first item judges review and can determine whether a project is shortlisted".
- Untuk demo teknis: "Judges are particularly interested in the reasoning behind these decisions".
- Juri mencari "early traction, conversations with potential users", dan feedback "even if informal".

**Akibatnya** [Inferensi]:

1. **Video pitch** dibuka dengan **pengguna dan masalah**, bukan produk.
2. **Video demo** menunjukkan alur yang berjalan sungguhan, dan **menjelaskan alasan** setiap keputusan teknis penting (bagian 6).
3. Kedua video harus jujur soal asumsi kepercayaan (bagian 7). Juri teknis akan menanyakannya.

---

## 1. Pesan inti

Ulangi minimal sekali di tiap video.

> **EN:** *Bisik lets blockchain ecosystems buy private, stake-backed insider signals about the best builder teams before those teams commit to a chain, and pays the insiders only when a team actually ships on the buyer's chain.*
>
> **ID:** Bisik memungkinkan ekosistem blockchain membeli sinyal privat dari orang dalam, dijamin stake, tentang tim builder terbaik sebelum tim itu memilih chain. Orang dalam hanya dibayar kalau tim benar-benar membangun di chain pembeli.

**Nama:** Bisik, dari kata *berbisik*. Informasi orang dalam disampaikan secara privat. Sebut maknanya sekali, karena mudah diingat juri.

---

## 2. Masalah dan bukti

Di video pitch, sebut angka bersama sumbernya.

| Poin | Bukti | Status |
|---|---|---|
| Ekosistem bersaing merebut tim, dan tim yang mereka bina bisa pindah | MegaETH menutup akselerator MegaMafia (Juli 2026): *"very little of that value has trickled to Mega"*; tim lulusannya pindah ke chain lain | [Fakta] |
| Pilihan chain bersifat eksklusif | Base Batches mensyaratkan tim *"committed to Base as their primary network"*, dengan investasi $100k | [Fakta] |
| Ekosistem sudah **membayar orang luar untuk rujukan tim, hanya kalau berhasil** | Avalanche Retro9000: $100 saat proyek diterima, ditambah $500–$10.000 kalau proyek mendapat grant; anggaran rujukan *"up to $2m"*. Metis: $200–$4.000 per perkenalan yang berujung integrasi | [Fakta] |
| Tim BD tidak bisa menjangkau semua tim | Metis: *"even pounding the pavement full time, we can't possibly scout every single quality project"* | [Fakta] |

**Kalimat kunci untuk pitch** [Inferensi]: *"The budget line already exists. Ecosystems pay referrers when a project joins. Bisik makes that signal private, stake-backed, explainable, and exclusive."*

**Bukti yang melemahkan, dan cara menjawabnya.** Siapkan juga untuk sesi tanya jawab juri.

| Kelemahan | Jawaban Bisik |
|---|---|
| [Fakta] Rujukan Retro9000 sepi: baru $12.000 untuk 49 perujuk | [Inferensi] Rujukan publik tidak memberi privasi, reputasi, atau alasan yang bisa dinilai. Bisik memberi ketiganya, ditambah eksklusivitas bagi pembeli |
| [Fakta] Base Batches 004 menerima 750+ pendaftar, jadi tim tidak kekurangan | [Inferensi] Bisik tidak menjual "menemukan tim", tapi **penilaian kualitas dari orang dalam sebelum tim berkomitmen**. Masalah ekosistem besar adalah menyaring, bukan menemukan |
| [Fakta] Metis: "merely suggesting a project to us does not qualify". Pembeli membayar perkenalan | D-15: scout boleh membuka identitasnya **hanya ke pembeli pemenang** untuk memperkenalkan tim |

---

## 3. Kenapa crypto, dan kenapa ini bukan judi

**Peran blockchain.** Sebut dengan singkat, tidak perlu panjang.

1. **Escrow onchain.** Pembayaran pembeli terkunci dan tidak bisa ditarik, jadi scout tidak perlu percaya pembeli.
2. **Stake dan tawaran terenkripsi (MPC Arcium).** Tidak ada yang melihat dukungan siapa pun selama market berjalan, termasuk pembuat market.
3. **Identitas ZK.** Prestasi GitHub dibuktikan lewat zkTLS. Keanggotaan grup tier dibuktikan dengan Semaphore, tanpa membuka akun.
4. **Hasil diverifikasi onchain.** Deploy tim di chain pembeli terbaca langsung.
5. **Payout global otomatis** dalam USDC.

**Bukan pasar taruhan.**

- Stake **dikembalikan utuh**.
- Hadiah **hanya dari pembayaran pembeli**. Tidak ada uang dari pihak yang kalah ke pihak yang menang.
- Opini yang salah **tidak pernah dipotong**. Hanya hoax terbukti yang di-slash, dan dananya ke amal.

[Inferensi] Ini membedakan Bisik dari prediction market. Sebut eksplisit, karena juri bisa mengira ini judi.

---

## 4. Pembeda dari produk yang mirip

Juri Colosseum kenal Bench, jadi sebut pembedanya secara langsung.

| Produk | Yang sudah mereka lakukan [Fakta] | Yang Bisik tambahkan |
|---|---|---|
| **Bench / Benchdot** (Arcium, pemenang Colosseum) | Opportunity market; stake terenkripsi; pembuat market memilih pemenang; stake dikembalikan | Lelang eksklusivitas antarpembeli (b=2, x=3); alasan terenkripsi yang diolah Veritas; reputasi privat dari prestasi eksternal; hasil diverifikasi, bukan dipilih pembuat; pembeli anonim |
| **Scout Game** (CharmVerse, didanai Arbitrum DAO $20k) | Scout memegang Builder NFT; imbalan dari PR developer | Bisik menilai **tim** (bukan developer individu), dengan sinyal **privat**, dibayar **pembeli**, dan **eksklusif** |
| **Talent Protocol** | Skor builder dari data publik; Builder Rewards bersama Base | Bisik memakai penilaian orang dalam yang tidak ada di data publik |
| **Retro9000 / Metis** | Rujukan berbayar berbasis hasil | Privat, ber-stake, beralasan, dan eksklusif |

**Kalimat kunci** [Inferensi]: *"Bench proved private stake-backed signals work. Bisik adds what a competitive buyer needs: exclusivity, reasons you can audit, and reputation without doxxing."*

---

## 5. Yang harus terlihat di video demo

Urutannya mengikuti alur F0–F10. Setiap ketukan harus menunjukkan **bukti teknis**: transaksi di explorer, isi akun, atau log.

| # | Tampilkan | Bukti yang ditunjukkan | Kriteria |
|---|---|---|---|
| 1 | Scout onboarding: login GitHub lewat Reclaim → mendapat tier | **Akun onchain hanya berisi tier dan nullifier hash, tanpa username.** Buka akunnya di explorer | Novelty, UX |
| 2 | Identitas scout dibuat di browser → masuk grup anonim tier Gold | Root grup onchain sama dengan root di UI | Novelty |
| 3 | Scout menambah opsi tim, menulis alasan → **flag Veritas muncul langsung** (D/A, klaim terverifikasi atau opini) | Skor tampil sebelum stake | Novelty, UX |
| 4 | Stake: bukti ZK dibuat di browser → transaksi | Transaksi stake berisi **opsi terenkripsi**; verifikasi bukti di program (sekitar 97k CU) | Functionality |
| 5 | Market ditutup → pratinjau untuk pembeli (histogram tier dan kekuatan sinyal, tanpa nama tim) | Callback Arcium mengisi pratinjau | Functionality |
| 6 | Tiga pembeli: dua menawar tertutup, satu harga rata → hasil lelang | Pemenang #1 membayar tawaran #2, #2 membayar tawaran #3, minimal harga cadangan. Nilai tawaran tidak pernah terlihat | Novelty |
| 7 | Pemenang #1 menyembunyikan 3 sinyal → #2 memilih dari sisanya → pembeli harga rata melihat sisanya | Pembeli #2 **tidak bisa** melihat sinyal yang disembunyikan #1 | Novelty |
| 8 | Pembaca sinyal: alasan yang sudah difilter privasi, ringkasan pro dan kontra, klaim | Teks asli dibanding hasil filter (detail pengenal hilang) | UX |
| 9 | Pembeli meminta perkenalan → scout menerima (D-15) | Kontak terenkripsi ke pembeli | UX, Business |
| 10 | Tim melakukan deploy di devnet → oracle mencatat hasil | `record_outcome` di explorer | Functionality |
| 11 | Settlement → scout klaim stake + payout ke **alamat baru** | Klaim memakai bukti nullifier; alamat penerima tidak terhubung ke wallet stake | Novelty |
| 12 | (Opsional) Sengketa hoax → slash ke dana amal | Transfer ke wallet amal | Business |

**Kalau ada cadangan yang dipakai** (bagian 12 task tracker), misalnya demo di localnet, lelang commit-reveal, atau agregasi oleh operator: **sebut di video**, jangan disamarkan.

**Data demo:**

- **Fiktif dan diberi label "DEMO DATA".**
- Pembeli: "Ecosystem A/B/C". **Jangan** memakai logo atau nama ekosistem nyata sebagai pembeli.
- Mata uang: mock USDC.

---

## 6. Keputusan teknis dan alasannya

Juri secara eksplisit tertarik pada alasan di balik keputusan teknis. Pilih 3–4 yang paling kuat untuk video demo; sisanya untuk README.

| Keputusan | Alasan yang bisa disebut |
|---|---|
| **Verifikasi zkTLS offchain, onchain hanya tier + nullifier** (D-16) | [Fakta] Verifikasi onchain mengirim `parameters` dan `context` bukti di transaksi, sehingga username jadi publik. [Fakta] Verifier Reclaim Solana 2024 tidak aktif di devnet maupun mainnet, dan format identifier-nya tidak cocok dengan bukti SDK 5.8.2. Kami memilih privasi, lalu mengungkapkan asumsi kepercayaannya |
| **Provider GitHub harus membuktikan kepemilikan akun** | [Fakta] Halaman kontribusi GitHub publik (bisa dibuka tanpa login). Provider komunitas "GitHub test 1" hanya membacanya, jadi siapa pun bisa mengaku pemilik akun orang lain. Verifier Bisik menolak bukti yang tidak berasal dari halaman yang memerlukan login (R23) |
| **Grup anonim Semaphore + reputasi lewat kredit terenkripsi** (D-17) | Memisahkan tiga hubungan: username ↔ identitas (verifier, sesaat), identitas ↔ posisi (tidak ada yang tahu), identitas ↔ skor (hanya Arcium). [Fakta] Kredit terenkripsi sudah dilampirkan di setiap stake, tetapi circuit pengumpul reputasinya (D6) **belum dibuat**. Sebut sebagai rancangan/roadmap, jangan sebagai fitur jalan. [Fakta] Verifikasi Groth16 di Solana: 96.861 CU |
| **Maksimal 3 opsi per scout tanpa tahu siapa scout-nya** | Scope ZK = (market, slot 1–3). Setiap slot hanya punya satu nullifier |
| **Lelang tertutup harga kedua yang diperumum, dengan ceiling deposit** | Lelang tertutup mengurangi kolusi; harga cadangan mengurangi shill bid; hasil lelang ke scout, bukan ke pembuat market. Setoran dana publik, jadi pembeli menyetor batas atas, bukan nilai tawaran |
| **Payout mengikuti hasil** | [Fakta] Program yang sudah ada (Retro9000, Metis) membayar dengan pemicu yang mirip, jadi pos anggarannya sudah ada. ⚠️ [Fakta] Di Bisik, bayaran pembeli tidak dikembalikan: kalau pembeli tidak menandai hasil apa pun, aturan default D-05 memberikannya ke sinyal terkuat yang dibeli. Jadi bukan murni bayar-kalau-sukses. Jangan bilang "bayar hanya kalau tim ship" sebelum Dien memutuskan framing-nya |
| **Veritas sebagai modul internal; skor hanya penanda, bukan dasar slashing** (D-21) | [Inferensi] Detektor tulisan AI tidak cukup andal untuk menghukum orang, jadi skornya hanya membantu pembeli menilai. Veritas adalah rumus noisy-OR `DRS = 1 − (1−D)(1−A)` dari proyek Dien sebelumnya, Veritas UHI9 (lihat bagian 10) |
| **Ditulis sendiri, bukan menyalin contoh Arcium** | [Fakta] Repo `arcium-hq/examples` tidak berlisensi. Contoh lelangnya juga tidak punya escrow, tidak menegakkan harga cadangan, dan tidak mengikat penawar ke signer. Bisik menambal semua itu |

### 6.1 Fakta build yang boleh disebut (per 10 Okt 2026)

- [Fakta] Program `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD` jalan di **Solana devnet** dengan MPC **Arcium devnet** (cluster 456, Arcium 0.15.0). Circuit dihosting publik dan dicek hash-nya oleh node Arcium.
- [Fakta] Tes ujung-ke-ujung `contracts/tests/e2e.ts` lulus dengan bukti ZK dan MPC sungguhan: stake anonim, agregasi terenkripsi, preview, lelang GSP (nilai tawaran tidak pernah terbuka), seleksi berurutan, sengketa (stake hoax ke amal), settlement MPC, klaim ZK ke alamat baru.
- [Fakta] Latensi satu langkah MPC di localnet 2,8–3,9 detik; di devnet sekitar 4–20 detik (sampel kecil, RPC publik).
- [Fakta] Keeper menjalankan market dari Open sampai Settled tanpa campur tangan manual.
- [Fakta] Verifier Reclaim diuji dengan bukti asli dari SDK: tanda tangan attestor dicek, bukti yang diubah ditolak, username tidak pernah disimpan.
- Jangan klaim: reputasi terenkripsi sudah jalan (D6), skor sinyal dihitung di MPC (D4), atau uji live GitHub sudah sukses (belum diuji, R23).

---

## 7. Asumsi kepercayaan dan keterbatasan

Wajib disebut, singkat, di video demo atau README.

**Asumsi kepercayaan v1:**

1. Server verifier melihat username GitHub sesaat saat onboarding, lalu tidak menyimpannya.
2. Veritas (operator) melihat plaintext alasan untuk menilai dan menyaringnya. TEE masuk v2.
3. Operator memutus sengketa hoax di v1.
4. Arcium berjalan dengan sejumlah node operator. [Fakta] Mainnet Alpha diluncurkan dengan 4 operator.
5. Oracle hasil dijalankan operator.

**Keterbatasan:**

- Nominal stake per posisi terlihat publik, karena transfer USDC publik. Yang dirahasiakan adalah **tim mana** yang didukung (D-22).
- Pendanaan wallet stake masih bisa dilacak. Shielded funding masuk v2.
- Komunitas builder kecil, jadi kombinasi tier, isi alasan, dan waktu masih bisa mengidentifikasi scout. Mitigasinya: penyaring privasi dan k = 5.
- Validasi argumen antar-scout sengaja **tidak** masuk v1 (masuk v2).
- Lingkungan demo [ISI NANTI setelah A6/H3]: devnet atau localnet terekam, mock USDC, data fiktif.

[Inferensi] Juri menghargai pengakuan seperti ini. Klaim "trustless" yang berlebihan justru menurunkan kepercayaan.

---

## 8. Bisnis dan go-to-market

Isinya untuk video pitch dan form submission.

**Model bisnis:**

- Dari setiap pembayaran pembeli: 80% untuk scout, 15% fee platform, 5% untuk tim yang opt-in (D-08).
- **Patokan harga:**
  - [Fakta] Retro9000 membayar $100–$10.000 per proyek yang berhasil.
  - [Fakta] Metis membayar $200–$4.000 per integrasi.
  - [Inferensi] Ilustrasi (bukan data pasar): satu Sourcing Round dengan 2 slot eksklusif @ 2.000 USDC + 3 pembeli harga rata @ 500 USDC = 5.500 USDC. Pembagiannya: 4.400 ke scout, 825 ke platform, 275 ke tim.

**Pembeli awal:**

- Tim BD dan grant ekosistem yang bersaing merebut tim pasca-hackathon: Solana Foundation dan Superteam regional, lalu Base, Arbitrum, Tempo, dan Monad.
- Bentuk produk: Sourcing Round yang dibuat operator, dan Market Eksklusif yang dibuat ekosistem.

**Scout awal:** juri, mentor, dan alumni hackathon Colosseum dan Superteam, serta devrel.

**Distribusi:** profil Colosseum Arena, Karma GAP (registry 300+ program grant), dan Questbook. Ketiganya mitra distribusi, bukan pesaing.

**Validasi permintaan** [ISI NANTI, Senin 12 Okt 20:00 WIB, dari `d12-evidence-log.csv`]:

- Format: *"We asked N ecosystem BD/grant leads, M replied; K would join a non-binding pilot round. Main objection: …"*, ditambah angka scout dan tim.
- **Laporkan apa adanya, termasuk penolakan.** Minat informal **bukan** pelanggan atau komitmen.
- [Fakta] Panduan Colosseum menghitung feedback informal, jadi kutipan anonim yang diizinkan boleh ditampilkan.

---

## 9. Dampak dan ukuran pasar

[Inferensi] Bingkai ukuran pasar sebagai **anggaran yang sudah dibelanjakan ekosistem untuk menarik builder**, bukan TAM yang dikarang.

- [Fakta, docs Base] Base Batches: investasi $100k per tim.
- [Fakta, ringkasan pencarian; cek ulang sebelum dipakai] Sekitar 10 tim per kohort, dua kohort per tahun.
- [Fakta] Avalanche Retro9000: anggaran rujukan sampai $2 juta.
- [Fakta] Solana Foundation menjalankan grant milestone, grant konvertibel, dan RFP.
- **Jangan menjumlahkan** angka-angka ini menjadi satu TAM. Masing-masing berbeda jenisnya.
- **Dampak bagi ekosistem crypto:** alokasi grant dan BD yang lebih tepat sasaran. [Fakta] Kajian ARDC atas Arbitrum STIP menunjukkan metrik sebagian besar penerima insentif turun lagi setelah program berakhir. [Inferensi] Memilih tim yang tepat sejak awal itu bernilai.

---

## 10. Founder dan founder-market fit

- Dien: solo builder, mahasiswa (cocok untuk University Award).
- [Fakta] Sebelumnya **memenangkan 2 track di UHI9 Hookathon secara solo** dengan Veritas (Dilution Risk Score: skor duplikasi D dan kemungkinan tulisan AI A). Mekanisme itu sekarang menjadi **modul Veritas di Bisik**, yang menilai kualitas alasan scout.
- [Inferensi] Kalimat untuk pitch: *"I built Veritas to price duplicate and AI-generated content. In Bisik, the same engine tells a buyer whether a scout's reasoning is original or copy-pasted."*
- Tunjukkan bahwa kamu **bicara dengan calon pengguna** (hasil outreach). Ini faktor "Founder + Market Fit" dan "Insight" di FAQ.

---

## 11. Roadmap

Cukup satu kalimat per poin di pitch.

1. Validasi argumen antar-scout (desain sudah ada, ditunda dari v1).
2. Aturan surprisingly popular, supaya minoritas yang benar tetap terlihat.
3. Veritas di dalam TEE, sehingga operator tidak melihat plaintext.
4. Oracle hasil lintas chain (Base, Arbitrum).
5. Pendanaan stake lewat shielded pool.
6. Pengadilan sengketa terdesentralisasi.
7. Use case lanjutan: rekrutmen, investasi halal, riset.

---

## 12. Hal yang tidak boleh dikatakan atau ditampilkan

- ❌ Logo atau nama ekosistem nyata sebagai pembeli atau pelanggan di UI demo. Menyebut mereka sebagai **target pasar** di pitch boleh.
- ❌ Klaim traction, pengguna, atau pilot yang tidak benar-benar ada.
- ❌ "Fully trustless", "fully private", atau "nobody can ever know". Lihat asumsi di bagian 7.
- ❌ "AI detects lies" atau "AI slashes bad scouts". Veritas hanya memberi penanda.
- ❌ "Prediction market", "betting", atau "bet on teams". Pakai "stake-backed signal" dan "refundable stake".
- ❌ Klaim memakai verifier onchain resmi Reclaim. Yang dipakai verifikasi offchain dengan SDK resmi.
- ❌ Mengaku kode lelang berasal dari contoh Arcium. Contoh itu hanya rujukan; kode ditulis sendiri.
- ❌ Angka yang belum diverifikasi. Contoh: klaim "$100M+ ke 500+ proyek" untuk grant Solana Foundation berasal dari agregator dan belum terverifikasi.

---

## 13. Peta kriteria juri ke isi video

| Kriteria | Video pitch | Video demo |
|---|---|---|
| Functionality | — | Ketukan 4, 5, 6, 10, 11 berjalan sungguhan |
| Potential Impact | Bagian 2 dan 9 | — |
| Novelty | Bagian 4 | Ketukan 1, 2, 6, 7, 11 dan bagian 6 |
| UX | — | Ketukan 1, 3, 8, 9 (alur jelas, waktu tunggu MPC dijelaskan) |
| Open-source / composability | Satu kalimat | README: Arcium, Semaphore (MIT), groth16-solana, Reclaim SDK, lisensi MIT |
| Business Plan | Bagian 8 | — |
| Founder + Market Fit / Insight / Traction | Bagian 2, 8, 10 | — |

---

## 14. Alokasi waktu [Usulan, naskah final di task J3]

- **Pitch (2–3 menit):**
  - masalah + bukti: 40 detik;
  - insight + solusi: 30 detik;
  - pembeda: 20 detik;
  - bisnis + GTM + validasi: 40 detik;
  - founder: 15 detik;
  - roadmap dan penutup: 15 detik.
- **Demo (maksimal 3 menit):**
  - ketukan 1–4 (scout): 60 detik;
  - ketukan 5–8 (pembeli dan lelang): 70 detik;
  - ketukan 10–11 (hasil dan klaim): 30 detik;
  - asumsi kepercayaan: 15 detik;
  - penutup: 5 detik.

  [Inferensi] Langkah MPC butuh beberapa detik per langkah. Pakai potongan atau percepatan video, dan sebut bahwa videonya dipercepat.

---

## 15. Sumber

- FAQ hackathon: https://colosseum.com/hackathon
- Rules (§8, §14): https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf
- Blog workshop submission: https://blog.colosseum.com/perfecting-your-hackathon-submission/
- MegaETH MegaMafia: https://cryptobriefing.com/megaeth-shuts-down-megamafia-flagship-accelerator-to-focus-on-first-party-apps/
- Base Batches: https://docs.base.org/get-started/base-batches ; 750+ pendaftar: https://cryptobriefing.com/base-batches-004-teams-to-be-announced-september-29-after-record-applications/
- Avalanche Retro9000: https://www.avalanche.com/about/blog/the-avalanche-foundation-announces-third-cohort-for-retro9000-l1-and
- Metis BD bounty: https://www.metis.io/blog/introducing-the-metis-business-development-bounty-program
- Scout Game: https://forum.arbitrum.foundation/t/scout-game-final/30144
- Talent Protocol: https://cryptorank.io/insights/deals/talent-protocol-m-a-2026-08-20
- Arbitrum STIP (ARDC): https://forum.arbitrum.foundation/t/ardc-research-deliverables/23438
- Bench / Benchdot: https://docs.bench.markets ; https://cryptobriefing.com/arcium-benchdot-markets-private-hiring-solana/
- Reclaim (SDK, attestor, provider): https://www.npmjs.com/package/@reclaimprotocol/js-sdk ; https://api.reclaimprotocol.org/api/attestors ; https://github.com/reclaimprotocol/reclaim-solana-sdk
- Semaphore: https://docs.semaphore.pse.dev/ ; groth16-solana: https://docs.rs/groth16-solana
- Hasil uji internal: `../Ideation-Colosseum/ideation/114-uji-tiga-dependensi.md`
- Riset validasi permintaan: `../Ideation-Colosseum/ideation/113-validasi-permintaan-d12.md`
- Spesifikasi produk: `../Ideation-Colosseum/living-doc/builder-sourcing-living-doc.md`
