# Handoff: pre-frontend fixes and corrections (11 Oct 2026)

Copy the block below into the AI agent session that will build Bisik's frontend. It explains what was fixed, what was wrong before, and what is still open.

```text
Context: you are about to build the Bisik web app (`apps/web`, Vite + React + TypeScript + Tailwind). Repository root: `/Users/scientivan/Programming/VeritasProtocol/Bisik`. Before this handoff, a review found six gaps between the approved design, the docs and the real code. All six were valid. Below is what was wrong, what changed, and what is still open. Trust the code and this note over older text you may find elsewhere.

## 1. The SDK could not be imported in a browser (fixed)

- What was wrong: `packages/sdk/src/index.ts` loaded the Anchor IDL with `createRequire` from `node:module`, which does not exist in browsers.
- What changed: the IDL is now imported as JSON (`import IDL_JSON from "./idl/bisik.json" with { type: "json" }`). Node consumers (server, keeper, scripts) still work: the SDK was rebuilt and Node import was checked.
- The SDK's dependencies still need browser shims. `@arcium-hq/client` imports Node `crypto` and `fs`, and it uses a default import of `@anchor-lang/core`, which Anchor's browser build does not provide. Two shims now live in `packages/sdk/browser/`: `anchor-default-shim.js` and `empty-fs.js`.
- Verified: the SDK was bundled with esbuild for the browser, with those shims and polyfills for crypto, stream, buffer and process. In Chrome, `PROGRAM_ID`, `pdas()`, `newViewKey()`, `encryptStakeSecrets()` and `randomOffset()` all worked.
- What you must do: copy the Vite config from `docs/web-sdk-bundling.md` (uses `vite-plugin-node-polyfills` and two exact-match aliases).

## 2. There was no market list endpoint (fixed)

- What was wrong: the spec in `task-tracker.md` listed `GET /v1/markets`, but `apps/server/src/app.ts` only had `GET /v1/markets/:id`. This was an omission when the server was built.
- What changed: `GET /v1/markets` (optional `?status=Open|Closed|Auction|Allocated|OutcomeWindow|Settling|Settled`) returns `{ markets: [...] }`, newest first, read straight from the onchain accounts (no indexer).
- Each market summary now includes `minStake`, `maxStake`, `minReasonLen`, `reservePrice` and `flatPrice` (USDC with 6 decimals). `GET /v1/markets/:id` returns the same summary plus `options: [{ index, category, optedIn }]` and `teamRefsRegistered`. Team identities are never included.
- Verified: server tests pass 8/8, including a new test that checks no team commitment leaks. The endpoint was also called against the running devnet server for markets 1 to 3.
- The older spec rows in `task-tracker.md` section 6 were updated to match.

## 3. The design showed per-team strength before purchase (design error, fixed)

- What was wrong: the buyer market mockup showed "Strong signal", "Medium signal" and "Light signal" next to each team name before the buyer paid. The product does not reveal that. Before purchase, the program and API expose only one market-wide histogram, `preview: { backed, weak, medium, strong }` (counts of options per bucket, `null` before the Auction stage). The mockup was designed without checking the API contract.
- What changed in the mockup (`docs/design-reference/Market.dc.html` and the live artifact https://claude.ai/artifact/9vRNtrmSEyg12kQ674y6DG):
  - before decrypting, the screen shows the histogram ("Three options backed. Two strong, none medium, one weak."), matching the real devnet market 3;
  - rows are titled "Option N, <category>" with a "Team sealed" pill;
  - the sonogram strips are uniform grey noise that leaks no strength;
  - team names, weights and reasons appear only after "Decrypt my view";
  - prices now use the real devnet values (reserve 100 USDC, flat 90 USDC).
- `DESIGN.md` now has a section "Data truth constraints (what the UI may show)". Follow it strictly.

## 4. Example reasons were shorter than the API allows (design error, fixed)

- What was wrong: `POST /v1/reasons` rejects reasons under the market's `minReasonLen` (200 characters on devnet), but the mockups used one-sentence reasons.
- What changed: all example reasons are now 205 to 215 characters. The stake form shows a counter ("215 / 200") and the line "At least 200 characters, set by this market." Read the limit from the market, never hard-code it.

## 5. Browser proofs in Safari and real devnet transactions from the browser (still open)

- Semaphore proofs were generated and checked in headless Chrome (0.55 to 0.85 s; see `docs/browser-proving.md`).
- Not yet verified:
  - Safari;
  - sending a real devnet stake or claim transaction built from a browser-generated proof;
  - `queueAndWait` over a browser `Connection`.
- Do these while building the stake flow (task G4), and log the results in the `task-tracker.md` Progress Log.

## 6. Stale statements in README and tracker (fixed)

- `README.md` trust assumption 6 said MPC-computed signal scores were "planned (task D4)". D4 is live on devnet. The text now explains both paths: the server-assembled scores, and the MPC weights encrypted to each buyer's key (`reveal_signals`).
- The README repo table said the circuits use Arcium 0.13.2. It now says 0.15.0.
- The `task-tracker.md` snapshot said the frontend was not started at all. It now says the design is approved, the SDK works in the browser, and `apps/web` implementation has not started.
- Payout framing: never say scouts are "paid only if the team ships". A buyer's payment is not refunded, and if the buyer marks no successful option, it goes to the strongest signal they bought (decision D-05). README and DESIGN.md already reflect this.

## Files to read before coding (in order)

1. `DESIGN.md`. The visual system, plus the "Data truth constraints" section.
2. `PRODUCT.md`
3. `docs/design-reference/*.dc.html` and the live artifact link above
4. `docs/web-sdk-bundling.md`
5. `docs/design-agent-prompt.md` (full onboarding prompt for design rules)
6. `apps/server/src/app.ts` (the real API contract) and `packages/sdk/src/index.ts`
7. `task-tracker.md`: Phase G tasks and the latest Progress Log entries

None of these changes are committed yet. Ask Dien before committing or pushing.
```
