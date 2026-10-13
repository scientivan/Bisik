# Bisik

**Private, stake-backed insider signals for blockchain ecosystems competing for the best builder teams.**

*Bisik* is Indonesian for "whisper". Insiders (hackathon judges, mentors, developers) quietly flag promising teams that have not yet committed to a chain. Ecosystems buy those signals, can bid for exclusivity, and pay the insiders **according to outcomes**: a buyer's payment goes to the scouts behind the teams that shipped on the buyer's chain or won its grant (if the buyer reports none, a default rule picks the strongest signal they bought).

> Status: hackathon build for the Colosseum Crypto World's Fair (Solana track). The on-chain program, MPC circuits, ZK identity, Veritas module, API server and keeper are implemented. The end-to-end test passes on the Arcium localnet, and the program runs on **Solana devnet with Arcium MPC (cluster 456, Arcium 0.15.0)**. The web app is implemented; Chrome browser create/stake/reveal/claim passes on devnet. Real GitHub onboarding and Safari acceptance remain pending. The submission uses one use case, hackathons (ecosystems buy what judges and mentors saw); the mechanism itself is general.

| | |
|---|---|
| Program (devnet) | [`aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD`](https://explorer.solana.com/address/aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD?cluster=devnet) |
| Compiled circuits | [`scientivan/bisik-circuits`](https://github.com/scientivan/bisik-circuits) (pinned by commit; each file is hash-checked by the Arx nodes) |
| Demo USDC | a mock 6-decimal mint created by the seed script (demo only) |
| Pitch video | https://youtu.be/Fuf4JJXD1mQ |
| Product demo video | https://youtu.be/QBAEB8aVygA |

## Why

- Ecosystems already pay outsiders for referrals, but only on results. Avalanche Retro9000 pays referrers up to $10,000 when a referred project gets a grant. Metis paid $200–$4,000 per introduction that led to an integration.
- Teams are contested. MegaETH wound down its MegaMafia accelerator after its graduates moved to other chains. Base Batches requires teams to commit to Base as their primary network.
- Public referrals leak the signal to competitors, carry no reasoning a buyer can audit, and expose the referrer. Bisik makes the signal **private**, **stake-backed**, **explainable**, and **exclusive**.

**Bisik is not a prediction market:**

- Stakes are refundable in full.
- Rewards come only from buyers' payments; no loser pays a winner.
- Only proven hoaxes are slashed, and the slashed funds go to charity.

## How it works

1. **Private reputation.** A scout proves GitHub activity with a zkTLS proof (Reclaim). The server verifies it **offchain**, so the username is never written onchain. Only a tier and a source-account nullifier hash go onchain. The scout joins an anonymous **Semaphore** group for that tier.
2. **Anonymous stake.** The scout stakes refundable USDC with a Groth16 group-membership proof, verified onchain by `groth16-solana` (~97k CU). The proof's scope is `(market, slot ≤ 3)`, so one scout gets at most 3 options per market without anyone learning who they are. The supported option is encrypted for the **Arcium** MXE.
3. **Encrypted aggregation.** MPC folds every position into encrypted per-option weights. Buyers see only a strength histogram before buying.
4. **Sealed-bid exclusivity.** Buyers are verified by the operator first (an onchain buyer profile). A verified buyer opens an **auction round** (or an exclusive market it funds alone); unverified wallets are rejected (`NotEligibleBuyer`, 6018). Each buyer also has an onchain `BuyerRecord` (markets joined, outcomes recorded, missed reports, disputes) that scouts can read before accepting an intro request. Buyers deposit a public ceiling and submit encrypted bids. MPC keeps the top 3 and reveals two winners with a generalized second price and a reserve price. Winner #1 hides up to 3 signals, then winner #2 chooses from what is left. Everyone else buys the remainder at a flat price.
5. **Veritas** (internal module). Reasons are scored for duplication (D) and AI-likelihood (A), with `DRS = 1 − (1 − D)(1 − A)`. Veritas also splits verifiable claims from opinions and rewrites the reason to remove what could identify the scout. Scores are flags, never grounds for slashing.
6. **Outcome and settlement.** A success is a deploy on the buyer's chain or a grant from the buyer. MPC reveals only per-buyer denominators and per-position hit bits; payouts are computed onchain. Scouts receive 85% of each buyer's payment, and the platform 15%. Teams receive no automatic share and need no account to be proposed. Deploy-wallet registration is only for outcome verification, with team consent and ownership confirmed. The revised rule is active on devnet after the 12 October upgrade (slot 510110372); previously settled payouts remain recorded. See [upgrade verification](docs/devnet-upgrade-2026-10-12.md).
7. **Claim.** The scout claims stake plus payout to **any fresh address** by proving ownership of the position's nullifier with a new Semaphore proof.

## Repository

| Path | What |
|---|---|
| `contracts/programs/bisik` | Anchor 1.0.2 program: config, groups, markets, escrow, ZK stake/claim, auction, selection, outcomes, disputes, settlement |
| `contracts/encrypted-ixs` | Arcis circuits (Arcium 0.15.0): `allocate`, `preview`, `place_bid`, `resolve_auction`, `winning_weights`, `position_hits`, and more |
| `contracts/tests/e2e.ts` | End-to-end test on the Arcium localnet (real ZK proofs and MPC) |
| `packages/shared` | Hashing, constants, ZK message and scope encoding |
| `packages/zk` | Semaphore identities and groups, stake/claim proofs, conversion to the `groth16-solana` layout |
| `packages/veritas` | Veritas module (Gemini only as the model provider) |
| `apps/web` | Vite + React web app, Wallet Standard, browser ZK stake/claim, buyer and operator flows |
| `apps/server` | API: Reclaim verifier, group service, reasons and Veritas, signals, outcome oracle |
| `services/keeper` | Lifecycle worker (close, preview, resolve, settle, reputation credit) |
| `scripts/` | Verification-key generation, demo seeding, demo screen recorder (`record-demo.ts`) |
| `my-video` | Remotion projects for the submission videos: product demo (`Demo`) and pitch (`Pitch`) |
| `docs/brand` | Product logo (SVG and PNG exports) |

## Run it

Requirements: Solana CLI 3.1.10, Anchor 1.0.2, Arcium 0.15.0 (`arcup`), Rust 1.89.0, Docker, Node 24, pnpm 10.

```bash
pnpm install
pnpm --filter @bisik/shared --filter @bisik/zk --filter @bisik/veritas --filter @bisik/sdk build

# End-to-end test on a local Arcium cluster (real ZK proofs and MPC)
cd contracts && arcium build && arcium test
```

Local stack (one `.env` at the repo root; see `.env.example`):

```bash
cd contracts && arcium localnet --skip-build          # validator + Arx nodes
cd apps/server && BISIK_DEMO=1 npx tsx src/index.ts    # API on :8787
npx tsx scripts/seed-demo.ts                           # fictional demo markets, scouts, buyers
cd services/keeper && npx tsx src/index.ts             # drives markets to settlement
```

Demo actions: `seed-demo.ts bids <id>`, `select <id> ecosystem-a 0`, `buyflat <id> ecosystem-c`, `claim <id> ayu 1`.
Hosting the server and keeper: `docs/deploy-railway.md`.

Frontend (`http://127.0.0.1:5173`):

```bash
pnpm --filter @bisik/web dev
pnpm --filter @bisik/web build
```

`/demo` is an explicitly synthetic walkthrough; live routes use the API and onchain accounts. Configuration, Vercel settings, validation and remaining acceptance are in [docs/frontend-implementation.md](docs/frontend-implementation.md).

## Trust assumptions (v1) and limitations

These are deliberate v1 trade-offs, disclosed rather than hidden:

1. **Verifier:** the Bisik server sees the GitHub username briefly while verifying the zkTLS proof, then stores only a salted hash.
2. **Veritas:** the operator's Veritas service reads plaintext reasons in order to score and filter them. A TEE is planned for v2.
3. **Disputes:** hoax disputes are decided by the operator in v1.
4. **Outcomes:** Solana deploys are attested by the operator's oracle; grants are attested by the buyer. `record_outcome` accepts only those two signers, and every record keeps its signer and an evidence hash onchain (shown on the Operator page under Outcome oracle). There is no open oracle network yet. Planned next: the program checks Solana deployments itself, and subjective outcomes and hoax disputes go to randomly drawn, staked verifiers who vote in secret and are paid or slashed by consensus (living document §18.3).
5. **Arcium:** MPC trust rests on the Arcium node operators (devnet cluster 456).
6. **Signal view:** the API's per-option scores and reasons are assembled by the server from public position weights and the reasons it holds, because the server knows which option each reason backs (see 2). Independently of the server, each buyer can also get MPC-computed weights encrypted to their own x25519 key (`reveal_signals`, live on devnet) and decrypt them client-side.
7. **Stake amounts** per position are public, because USDC transfers are public. *Which team* a position supports stays encrypted.
8. Stake-wallet funding is traceable. Shielded funding is planned for v2.
9. **Buyer verification** is done by the operator in v1.
10. **Demo recording:** the scout's tier in the demo video comes from the operator's demo path (`BISIK_DEMO=1`), because a live GitHub zkTLS proof was not recorded. Groups smaller than k = 5 are allowed only in demo mode. Waiting time for MPC and market windows is cut from the video.

## References and disclosure

- Arcium Arcis/MXE APIs were learned from the `arcium-hq/examples` sealed-bid auction. That repository has no license, so **no code was copied**. All circuits and program code here are original. The example also lacks escrow, reserve-price enforcement, signer-bound bidders and per-market auctions, all of which Bisik adds.
- Semaphore v4 (MIT) for identities, groups and proofs; `groth16-solana` for onchain verification; Reclaim Protocol JS SDK for zkTLS.

## License

MIT, see `LICENSE`.
