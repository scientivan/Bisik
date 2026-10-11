# Frontend implementation · 11 October 2026

`apps/web` implements the approved Sonogram direction in `DESIGN.md`. Live routes call the operator API and sign real Solana instructions through Wallet Standard. `/demo` is a separate, explicitly synthetic walkthrough that cannot send wallet transactions.

## Run and configuration

From the Bisik root:

```sh
pnpm install
pnpm --filter @bisik/shared --filter @bisik/zk --filter @bisik/veritas --filter @bisik/sdk build
pnpm --filter @bisik/web dev
pnpm --filter @bisik/web build
```

Development opens `http://127.0.0.1:5173`. Run the API separately (`apps/server`, `pnpm exec tsx src/index.ts`, default port 8787) and the keeper for automatic lifecycle transitions. `apps/web/.env` follows the repo's single-root-env symlink convention. No operator key or server secret is read by the frontend.

Public configuration:

| Variable | Default and use |
|---|---|
| `VITE_API_URL` | API origin without `/v1`; default `/api`, proxied to localhost:8787 in development |
| `VITE_SERVER_URL` | Existing repo alias for the API origin, used when `VITE_API_URL` is absent |
| `VITE_SOLANA_RPC_URL` | Solana JSON-RPC; default public devnet endpoint |
| `VITE_RPC_URL` | Existing repo RPC alias |
| `VITE_SOLANA_NETWORK` | Wallet Standard chain suffix, default `devnet` |
| `VITE_ARCIUM_CLUSTER_OFFSET` | Default 456 |

The program address is pinned by the SDK IDL. The mock mint and limits are read from onchain config/market accounts; the app does not mint tokens. Public RPCs may rate-limit rapid automated flows. Real wallets need devnet SOL and the configured mock USDC.

Vercel project root must be `apps/web`, build command `pnpm build`, output `dist`. Set a public HTTPS `VITE_API_URL` at build time and its matching Reclaim callback URL on the server. `vercel.json` supports direct navigation to nested routes. The production `/api` path is not a hosted backend. Deployment remains task I1.

## Routes and implemented behavior

| Route | Behavior |
|---|---|
| `/` | Landing, procedural sonogram, mechanism, payouts, flow, source links |
| `/markets` | Real newest-first markets and status filter |
| `/markets/:id` | Sealed options, add option, Veritas analysis, browser ZK and encrypted stake |
| `/scout/onboard` | Local identity, backup/import, Reclaim session and tier polling |
| `/scout/positions` | Saved/recovered positions, fresh-recipient claim, introduction and dispute responses |
| `/buyer/markets/:id` | Ceiling deposit, sealed bid, sequential selection, flat purchase, refund, encrypted view, outcomes, disputes and introduction requests |
| `/create` | Fund exclusive market or create operator auction, initialize MPC, short demo windows |
| `/admin` | Verify buyers, load dispute evidence, onchain ruling, summaries, epoch rotation, team opt-in registration |
| `/team` | Team policy and route to the actual operator registration; unsupported opt-out disclosed |
| `/demo` | Labelled synthetic sealed/revealed design walkthrough |

Semaphore wasm/zkey are fetched and SHA-256 verified during prebuild, then served from `/artifacts/semaphore/4.13.0`. The proving chunk is loaded only when needed. Claims use the original group-root snapshot, so later group additions do not invalidate a position's ownership proof. Browser backups contain the private identity and original leaves; keep them private.

The operator API receives reasons and the chosen option for Veritas. Public market responses expose index/category/opt-in and only the market-wide histogram. Purchased views include filtered reasons and the backed position for each claim, enabling a buyer to dispute a specific claim. Hidden claims and unrelated positions are rejected by the dispute API.

A scout response requires a real Semaphore proof bound to the action, request ID, answer and encrypted contact/evidence content, as well as the position's original root, nullifier and slot. Contact details use x25519 and AES-GCM and are decrypted only on the buyer device. Weights are encrypted by Arcium to the buyer's local key; reasons remain an operator API trust assumption.

## Validation and remaining acceptance

Production build, TypeScript checks, three frontend tests and ten server tests pass. Chrome route checks at 1440 and 390 pixels cover all ten routes, without JS exceptions or horizontal overflow. Reduced motion disables decorative motion and reveals content immediately. Screenshots and the fresh design review are under `.impeccable/review/`. The follow-up verdict marks both requested corrections resolved: a real three-bin histogram and amber Operator reads disclosure. Its ship verdict covers those corrections, not a comprehensive audit. The implementation companion is `docs/frontend-design-system.md`.

Opt-in integration scripts `scripts/frontend-devnet.ts` and `scripts/frontend-auction.ts` use devnet SOL and mock USDC only. Test signers remain in Node; the browser receives Wallet Standard public accounts and a signing bridge, never the operator secret. They inject synthetic group membership via the demo API, so they do not establish that real GitHub onboarding works. Run one at a time with an updated demo server on port 8788 and web dev server on port 5173:

```sh
cd scripts
FRONTEND_DEVNET_TEST=1 pnpm exec tsx frontend-devnet.ts
FRONTEND_DEVNET_TEST=1 pnpm exec tsx frontend-auction.ts
```

The auction check relies on the running keeper; do not run a second lifecycle driver against the same market. The exclusive check directly advances lifecycle steps and should run with the keeper paused or configured to exclude its test market. Public devnet RPC may rate-limit rapid automated flows.

Buyer refunds read the bid account’s `refunded` flag. A keeper-completed refund is shown as completed; a keeper transaction racing the manual action is recognized by re-reading onchain state.

Admin dispute decisions are read from the onchain dispute account, and settled or unconfirmed disputes cannot be resolved again from the UI.

Reports are in `apps/web/.review/` and ignored by Git. A private integration backup may also be saved there; do not publish that directory. Timing/status checks and chain assertions are the evidence, not visual mock values.

Chrome exclusive market 6 passed creation/init MPC, browser ZK stake, SIWS/reveal/local decryption, settlement and a claim of 27 mock USDC to a fresh recipient. Auction market 8 passed two sealed MPC bids and the first buyer’s refund, decryption and hidden selection. The second refund exposed a keeper race, now corrected using `bid.refunded`; a fresh full auction rerun was interrupted by public RPC HTTP 429 and local server termination. A complete UI auction, plus the outcome/dispute walkthrough, remains to be verified.

Acceptance still requiring external action or program work:

- G2: complete Reclaim with Dien's GitHub account and show its tier/group in UI. No logged-in GitHub session was used by the agent.
- B4/Safari: Safari WebDriver rejects sessions until “Allow remote automation” is enabled in Safari settings. Chrome is tested; Safari is not.
- G10: current program has operator-only registration and no opt-out instruction. Full self-service opt-in/out requires a program change and deployment.
- Extension wallet approval UX and deployed HTTPS Reclaim callbacks need a manual walkthrough with the user's wallet and hosted server.

No commit, push or deployment was performed during frontend implementation.

## Fullscreen, motion and themes

The opening is a flex column including its header and normal-flow lifecycle rail. Dynamic viewport units and fluid typography handle ordinary browser zoom; `useFullscreenHero` proportionally scales only the opening when intrinsic content exceeds a very small viewport. Resize/font observers recalculate fitting. App text and later landing sections keep their natural zoom.

Both headers expose an accessible theme toggle. A pre-render initializer selects the stored theme, otherwise the system preference. Theme is persisted under `bisik:theme`; no wallet or identity storage is changed. Semantic surfaces cover dark panels, forms, borders, labels, placeholders, grid and links. Dark sonograms use the deep-ultramarine hero field.

Animation adds hero decrypt entrance, scroll/intersection fill, navigation and button feedback. Offscreen/hidden-tab sonograms pause. Reduced motion removes movement and preserves visible data. Chrome checks covered viewport dimensions corresponding to desktop zoom 25–500%, mobile, dark demo decryption and theme persistence; artifacts are ignored under `apps/web/.review/theme-motion/`.
