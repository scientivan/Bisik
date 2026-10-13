# Bisik product demo: screen recording tracker (v2)

> Read `../important_for_demo.md` first (demo ≤ 3 minutes, demo = how, explain the Solana/tech reasoning, no pitch content).

## Decisions (Dien, 13 Oct 2026)

- The demo shows only the Bisik app. Problem, idea and market go in the pitch video.
- Palette follows `~/.claude/DESIGN-PREFERENCES.md`. Motion and art style follow `screen-record-reference.mov`.
- Voice-over plus quiet relaxed music. Claude records all app footage.
- The flow follows the real user journey: buyer first, then scout, then the rest of the lifecycle.
- The buyer opens an **Auction round** (not Exclusive), so rival buyers can bid. The Create form still explains both types.
- "Buyer account" means connecting the wallet, then the operator verifying the wallet (wallet + label) in `/admin`. The app has no self-serve buyer signup form.
- Reclaim: record identity creation and the start of the Reclaim session. The tier is assigned through the operator demo path, and the voice-over says so.
- **Version 1 footage (`out/demo-r1-r3-qa.mp4`) is discarded.** The frontend changed after it. Everything is re-recorded.
- Pace: the whole flow must fit in 180 seconds. Chapter cards are short (≈1 s) or merged into captions.
- Camera: zoom keyframes come from the logged click positions, so the cursor and the clicked element are always in frame.

## How recordings are made

- Driver: `scripts/record-demo.ts` (Playwright + installed Chrome, scripted Wallet Standard test wallets, keys stay in Node). Not a browser extension. Say "test wallet" if the wallet name is visible.
- Devnet, mock USDC, synthetic teams labelled demo.
- Every click, typed field and scroll is logged with time and on-screen box to `public/rec/<take>.events.json`. The edit builds camera moves from that log.
- Do not run lifecycle steps by hand while the keeper runs (both touch `agg_busy`). In v2 the keeper runs and drives allocate, preview and auction resolution.
- Waiting for MPC, windows or proofs is cut. The voice-over says time was skipped.

## Status legend

`todo` · `recorded` · `edited` · `QA Dien` · `approved` · `blocked`

## Flow and time budget (180 s)

| ID | Role | On screen | Proof / point made | Budget | Status |
|---|---|---|---|---|---|
| B1 | Buyer | Connect wallet, Profile says "Not registered" | Wallet only shares an address | 7 s | QA Dien |
| B2 | Operator | `/admin` Buyer verification: wallet + label, Verify buyer | Verified onchain by the operator (v1 trust) | 7 s | QA Dien |
| B3 | Buyer | Profile now verified | Buyer profile account | 0 s | dropped |
| B4 | Buyer | Create: market type dropdown (Exclusive vs Auction explained), pick Auction round, question, reserve, flat price, slots, windows, Create | Market account created + Arcium state init | 16 s | QA Dien |
| B5 | Buyer | Marketplace list shows the new round; open detail: windows, reserve, flat price, slots, calls | Public metadata only, bids sealed later | 10 s | QA Dien |
| S1 | Scout | Connect, create private identity, start Reclaim, Gold tier | Only commitment public; tier + nullifier onchain | 12 s | QA Dien |
| S2 | Scout | Same market: add sealed team option, write reason, Veritas flags | Flags before staking, never slashing grounds | 14 s | QA Dien |
| S3 | Scout | Seal and stake: ZK proof in browser, tx, explorer | Groth16 verified onchain, choice encrypted for Arcium | 12 s | QA Dien |
| B6 | Buyer | Preview after scouting closes: tier histogram, signal strength, no names | Arcium callback filled preview | 8 s | QA Dien |
| B7 | Buyers | Two sealed bids (ceiling public, bid sealed) | Bid values never shown | 14 s | QA Dien |
| B8 | Buyers | Result: second-price, refund of unused deposit | #1 pays #2's bid, #2 pays #3 / reserve | 8 s | QA Dien |
| B9 | Buyers | Winner #1 decrypts and hides a signal, #2 picks from the rest | #2 cannot see #1's hidden signal | 12 s | QA Dien |
| B10 | Buyer | Flat buyer buys the remainder | Hidden signals absent | 7 s | QA Dien |
| B11 | Buyer | Signal reader: filtered reason, pros/cons, claims | Identifying details removed | 8 s | QA Dien |
| B12 | Buyer ↔ Scout | Request intro, scout accepts | Contact encrypted to the buyer | 8 s | QA Dien |
| O1 | Operator | Outcome oracle `/admin#oracle`: signer, evidence hash; v2 open verifier network line | `record_outcome`, `recorded_by` | 8 s | QA Dien |
| S4 | Scout | Claim stake + payout to a fresh address | Nullifier claim, unlinked recipient | 10 s | QA Dien |
| | | Opening + closing frames | | 8 s | |

Total ≈ 180 s. Off-camera: two extra scouts stake on two more options so hiding and picking make sense; a third verified buyer buys flat.

## Known limits to disclose

- Reclaim live GitHub proof is not recorded; tier assigned via the operator demo path (`BISIK_DEMO=1`).
- Test wallets are scripted, not an extension popup.
- Groups smaller than k are allowed only because the server runs in demo mode.

## Log

- 13 Oct 2026 (early): v1 tracker, R1–R3 recorded and rendered. Fixes found: stale Vite prebundle (`P.buyerRecord is not a function`), Alchemy lacks `signatureSubscribe` (server now accepts `SOLANA_WS_URL`), headless grey area below y=812.
- 13 Oct 2026 02:05 WIB: Dien rejected v1 pace/zoom and asked for the real user journey. v1 footage discarded. Tracker v2.
- 13 Oct 2026 04:30 WIB: all v2 takes recorded. Market 13 (main run: B1–B8, B11, B12, S1–S5) and market 15 (second run with longer windows: B9, B10, O1, O2), because market 13's 2-minute selection window expired during the winner take. Draft render `out/demo-v2-draft.mp4` (177 s). Captions are the voice-over lines.
- Fixes during v2: headless screencast drops the bottom 88 px, so recording now uses headed Chrome off screen; operator page gating now allows `config.operator` (FRTM) as well as Dien's wallet (`apps/web/src/components/roles.tsx`, Dien approved); keeper got optional `KEEPER_MIN_MARKET` and `SOLANA_WS_URL`; public devnet RPC 429 on `getProgramAccounts` made the buyer profile unusable, so B1 shows the locked Auction option on Create instead and B3 was dropped.
- Open QA: preview on market 13 said "2 options are backed" for 3 options (one allocation likely delayed by RPC 429s); the marketplace list also shows older test rounds with the same demo question (markets 11–14).
- 13 Oct 2026: Dien reported motion sickness from fast zooms. Zoom removed entirely (`maxZoom = 1`, static full-frame footage). Voice-over is TTS, male and not too deep: edge-tts `en-US-BrianNeural` (+4% rate), one file per shot in `public/vo/`, shot length = max(footage, line + 0.35 s). Render `out/demo-v3-nozoom-vo.mp4` (176.7 s). Music still pending.
- 13 Oct 2026: white/blank page-load frames removed. Each take is clipped at its last clean second (before the first white frame, its last end mark, and 1.2 s after its last action); longer voice-over lines hold a frozen clean frame. Outro line voiced by Brian. Render `out/demo-v4.mp4` (179.1 s); automatic blackdetect scan for blank white or dark footage frames found none.
