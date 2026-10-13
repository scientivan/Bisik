# Bisik pitch video: production tracker (v1)

> Read `../important_for_demo.md` first (pitch = why; 2–3 minutes; open with users and the problem; no unverified numbers; no "prediction market"/"betting"; no real ecosystem as customer).

## Decisions (Dien, 13 Oct 2026)

- Format: designed motion presentation, not app footage and not a talking head. Style, motion and layout follow `screen-record-reference.mov`. Palette is Bisik's own (`src/theme.ts`).
- Dien appears as solo founder in a framed face cam, **bottom right**, for the whole video. Dien records their own voice (no TTS) and edits the face video in themselves after the presentation is done.
- The presentation keeps the bottom-right area (face frame slot, 336 × 380 px incl. frame and name bar, 40 px margin; content is centred in the area left of it) free of content.
- Length target 150 s (limit 2–3 minutes). No background music decided yet.

## Style rules taken from the reference

- Dark scenes: deep blue radial glow on ink, big bold white numbers that count up, words rise in from blur one by one, one accent word in soft blue.
- Light scenes: near-white base, big bold headline in Bisik blue, floating pills (chain/token chips) drifting slowly.
- Vertical timeline scene for the stack: list of steps on the left, circle icon on a blue rail, sponsor label + bold sentence on the right.
- Cuts are quick (2–5 s per idea), no zooms (Dien gets motion sickness), slow drift only.
- Deviation to confirm: the reference uses a blue gradient glow. `DESIGN-PREFERENCES.md` forbids gradient washes. v1 keeps a subtle radial glow on dark scenes only, because Dien asked to follow the reference art style.

## Status legend

`todo` · `built` · `QA Dien` · `approved`

## Scenes, script and time budget (≈150 s)

Script lines are what Dien says. Facts and sources come from `important_for_demo.md` §2, §4, §8, §10, §11.

| ID | s | Visual | Dien says | Status |
|---|---|---|---|---|
| P1 | 0–5 | Dark. Counter `$100,000`, "Base Batches invests per team" | "Base invests a hundred thousand dollars in each team it backs, and asks them to commit to Base as their primary network." | QA Dien |
| P2 | 5–10 | Dark. Floating chain chips. "Every Ecosystem Wants The Same Teams" | "Every ecosystem is chasing the same builders." | QA Dien |
| P3 | 10–15 | Light. Quote card MegaETH: "very little of that value has trickled to Mega" | "MegaETH shut down its accelerator because the teams it trained shipped somewhere else." | QA Dien |
| P4 | 15–27 | Light. "Ecosystems Already Pay For Referrals". Retro9000 $100–$10,000, Metis $200–$4,000 | "The budget already exists. Avalanche and Metis pay outsiders for intros, only when a project lands." | todo |
| P5 | 27–37 | Dark. "The Best Signal Never Reaches The Internet" + six signal chips | "But the signal that matters is said in the room: when a team will pick a chain, which rival offered a grant. Anything online is already priced in." | todo |
| P6 | 37–45 | Dark. Logo + meaning "Bisik = to whisper" | "So I built Bisik. It means whisper in Indonesian." | todo |
| P7 | 45–65 | Light. Three-actor flow: Scout, Buyer, Team (scout stakes, buyer bids, payout on outcome) | Core message §1 in Dien's words; scouts sell what they saw and think, never a team's private documents. | todo |
| P8 | 65–80 | Light. "Not A Betting Market": refundable stake, rewards only from buyers, only proven hoaxes slashed | §3 lines | todo |
| P9 | 80–100 | Timeline (reference style): Reclaim zkTLS, Semaphore, Arcium MPC, Solana escrow/payout, Veritas | "Why crypto" in one sentence per row | todo |
| P10 | 100–112 | Light. Bench vs Bisik comparison card | §4 key line | todo |
| P11 | 112–130 | Dark. Business: 85/15 split, illustration 5,500 USDC round, first buyers, scouts, distribution, demand validation | §8 (report outreach numbers as they are) | todo |
| P12 | 130–142 | Dark. Founder: UHI9 two tracks solo, Veritas engine | §10 line | todo |
| P13 | 142–150 | Dark. Roadmap line (open oracle network first) + end card | §11 point 1 + closing | todo |

## Open questions for Dien

1. Gradient glow on dark scenes OK, or solid ink with grid like the demo?
2. Demand validation numbers (`d12-evidence-log.csv`) for P11: are there any replies to report?
3. Face frame label: "Dien · Solo founder", or your full name?

## Log

- 13 Oct 2026: tracker v1. First 15 s (P1–P3) built as `src/Pitch.tsx`, composition `Pitch`, render `out/pitch-qa-15s.mp4` for QA.
- 13 Oct 2026: Dien clarified: copy the reference's qualities (clean, one focal element per scene, easy to read, not AI-looking), not its scene order, layout or palette. Rebuilt the first 10 s: bone grid background, solid Bisik blue/ink/amber, sentence case, no blur-word gimmick, no gradient. P1 = `$100,000` + one sentence with the condition underlined; P2 = four ecosystems draw lines to one builder team. Render `out/pitch-qa-10s.mp4`. Scene table above is from v1 and will be redesigned scene by scene the same way.
- 13 Oct 2026: v3 of the first 10 s. Product palette from `apps/web/src/styles.css` (bone #F7F7F7, ink #0F0F0F, accent #1E1E1E, amber = money, lavender = highlight). Chain names replaced with logos (`public/logos/`, from `@web3icons/core`), team drawn as a card, money as an amber line. All reasoning recorded in `PITCH-VIDEO-GUIDE.md`.
- 13 Oct 2026: official requirements checked (pitch 2–3 min, max 3:00; see `PITCH-VIDEO-GUIDE.md` §1b). 10–30 s built: P3 MegaETH team leaves (unnamed destination), P4 Retro9000/Metis referral payouts, P5 whisper in the room vs "0 results" search. Render `out/pitch-qa-30s-v1.mp4`. Old QA renders deleted so the player cannot show a stale file.
- 13 Oct 2026: full organiser requirements and recommendations saved in `PITCH-VIDEO-GUIDE.md` §1b. Dien wants subtitles: added `<Sub>` (spoken line in about 7-word chunks, bottom-left, clear of the face frame); sources moved to top-left. 0–30 s rebuilt, P4 and P5 are 7.5 s each. Render `out/pitch-qa-30s-v2.mp4`. The spoken lines are in the guide (section 5) and are now the script Dien reads.
- 13 Oct 2026: 30–60 s built (P6 name and meaning, P7 sealed stake-backed signal, P8 sealed auction and exclusivity, P9 outcome rewards and stake back). Render `out/pitch-qa-60s-v1.mp4` (full first minute).
- 13 Oct 2026: full pitch v1 built, 169 s (limit 180). Scenes P10–P17 cover why crypto, not betting, difference from earlier markets (no Bench name), users and 85/15, honest status (devnet live, no paying users yet, pilot next), founder (scientivan.dev facts), roadmap and vision, close. Render `out/pitch-full-v1.mp4`. Scene table in `PITCH-VIDEO-GUIDE.md` §5 replaces the v1 table above.
- 13 Oct 2026: full v2, 177.5 s. Added opening P0 (hackathon use case of a broad product), EDU Chain Top 150 founder card, roadmap split into product and business lanes. Render `out/pitch-full-v2.mp4`.
- 13 Oct 2026: subtitles now show one full sentence at a time (start to full stop), timed by word share. Render `out/pitch-full-v3.mp4` (177.5 s).
