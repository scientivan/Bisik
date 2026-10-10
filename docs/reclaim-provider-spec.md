# Spesifikasi provider Reclaim: Bisik GitHub Contributions

Status: rancangan, 10 Oktober 2026. Belum dibuat di portal Reclaim. Keputusan terkait: D-16 (verifikasi offchain) dan D-20 (provider sendiri).

## Tujuan

Scout membuktikan dua hal dalam satu bukti:

1. **Kepemilikan akun:** ia sedang login sebagai akun GitHub X.
2. **Aktivitas:** akun X punya N kontribusi dalam 12 bulan terakhir.

Server verifier Bisik mengubah N menjadi tier, lalu membuat nullifier dari X. Yang ditulis onchain hanya tier dan nullifier. Username tidak pernah ditulis onchain.

## Kenapa tidak memakai provider "GitHub test 1"

- [Fakta] Provider `9cdf8c1a…` adalah provider komunitas (`isVerified: false`). Provider itu hanya mengambil halaman kontribusi `github.com/{{URL_PARAMS_1}}`.
- [Fakta] Halaman kontribusi GitHub bersifat publik. Siapa pun bisa membukanya tanpa login (hasil `curl` ke `/users/torvalds/contributions`: 3,805 contributions, tanpa meta `user-login`).
- [Inferensi] Artinya provider itu tidak membuktikan kepemilikan akun. Siapa pun bisa mengklaim kontribusi milik orang lain.

## Rancangan: dua request dalam satu provider

| # | Request | Yang dicocokkan | Variabel |
|---|---|---|---|
| 1 | `GET https://github.com/settings/profile` | `<meta name="user-login" content="{{username}}">` | `username` |
| 2 | `GET https://github.com/users/{{username}}/contributions` | `mb-2">\n      {{contributions}}\n      contributions` | `contributions` |

Dasar fakta:

- [Fakta] `/settings/profile` mengarahkan ke halaman login (HTTP 302) kalau belum login. Jadi request 1 hanya berhasil dengan sesi akun itu sendiri.
- [Fakta] Saat belum login, profil publik memuat `<meta name="user-login" content="">`. [Inferensi] Saat login, nilai meta itu terisi login pengguna, sehingga bisa dicocokkan.
- [Fakta] Fragmen `/users/{username}/contributions` memuat `<h2 ... class="f4 text-normal mb-2">` diikuti angka dan kata "contributions".

**Contoh response redaction (regex):**

- Request 1: `name="user-login" content="(.*?)"`
- Request 2: `mb-2">\s*([0-9,]+)\s*contributions`

**Login URL:** `https://github.com/login`

## Pemetaan ke tier [Usulan]

| Kontribusi 12 bulan | Tier |
|---|---|
| ≥ 1.000 | Gold |
| 300–999 | Silver |
| 50–299 | Bronze |
| < 50 | Tidak masuk |

## Hal yang belum terverifikasi

- Apakah satu provider Reclaim bisa memakai variabel `{{username}}` dari request 1 di URL request 2. Uji di portal.
- [Fakta] Docs Reclaim menyebut DevTool "soon going to be deprecated" dan menyarankan AI Agent untuk membuat provider. Jalur pembuatan provider bisa berbeda dari tabel di atas.
- Regex bergantung pada struktur HTML GitHub. Kalau HTML-nya berubah, bukti bisa rusak (R11).
- [Inferensi] Username tetap terlihat oleh server verifier (D-16). Ini sudah diterima dan diungkapkan.

## Nilai yang harus masuk `.env` setelah dibuat

```bash
RECLAIM_APP_ID=
RECLAIM_APP_SECRET=
RECLAIM_PROVIDER_ID=
```
