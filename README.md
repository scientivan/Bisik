# Bisik

**Private, stake-backed insider signals for blockchain ecosystems competing for the best builder teams.**

*Bisik* is Indonesian for "whisper". Insiders (hackathon judges, mentors, developers) quietly flag promising teams that have not yet committed to a chain. Ecosystems buy those signals, can bid for exclusivity, and pay the insiders **only when a team actually ships on the buyer's chain**.

> Status: hackathon build for the Colosseum Crypto World's Fair (Solana track). The on-chain program, MPC circuits, ZK identity and Veritas module are implemented and pass an end-to-end test on the Arcium localnet. The frontend is in progress.

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
4. **Sealed-bid exclusivity.** Buyers deposit a public ceiling and submit encrypted bids. MPC keeps the top 3 and reveals two winners with a generalized second price and a reserve price. Winner #1 hides up to 3 signals, then winner #2 chooses from what is left. Everyone else buys the remainder at a flat price.
5. **Veritas** (internal module). Reasons are scored for duplication (D) and AI-likelihood (A), with `DRS = 1 − (1 − D)(1 − A)`. Veritas also splits verifiable claims from opinions and rewrites the reason to remove what could identify the scout. Scores are flags, never grounds for slashing.
6. **Outcome and settlement.** A success is a deploy on the buyer's chain or a grant from the buyer. MPC reveals only per-buyer denominators and per-position hit bits; payouts are computed onchain. Scouts receive 80% of each buyer's payment (85% when no opted-in team takes its 5%), and the platform 15%.
7. **Claim.** The scout claims stake plus payout to **any fresh address** by proving ownership of the position's nullifier with a new Semaphore proof.

## Repository

| Path | What |
|---|---|
| `contracts/programs/bisik` | Anchor 1.0.2 program: config, groups, markets, escrow, ZK stake/claim, auction, selection, outcomes, disputes, settlement |
| `contracts/encrypted-ixs` | Arcis circuits (Arcium 0.13.2): `allocate`, `preview`, `place_bid`, `resolve_auction`, `winning_weights`, `position_hits`, and more |
| `contracts/tests/e2e.ts` | End-to-end test on the Arcium localnet (real ZK proofs and MPC) |
| `packages/shared` | Hashing, constants, ZK message and scope encoding |
| `packages/zk` | Semaphore identities and groups, stake/claim proofs, conversion to the `groth16-solana` layout |
| `packages/veritas` | Veritas module (Gemini only as the model provider) |
| `apps/server` | API: Reclaim verifier, group service, reasons and Veritas, signals, outcome oracle |
| `services/keeper` | Lifecycle worker (close, preview, resolve, settle) |
| `scripts/` | Verification-key generation, demo seeding |

## Run the end-to-end test

```bash
pnpm install
pnpm --filter @bisik/shared --filter @bisik/zk build
cd contracts && arcium build && arcium test
```

Requirements: Solana CLI 3.1.10, Anchor 1.0.2, Arcium 0.13.2 (`arcup`), Rust 1.89.0, Docker, Node 22+, pnpm.

## Trust assumptions (v1) and limitations

These are deliberate v1 trade-offs, disclosed rather than hidden:

1. **Verifier:** the Bisik server sees the GitHub username briefly while verifying the zkTLS proof, then stores only a salted hash.
2. **Veritas:** the operator's Veritas service reads plaintext reasons in order to score and filter them. A TEE is planned for v2.
3. **Disputes:** hoax disputes are decided by the operator in v1.
4. **Outcomes:** Solana deploys are attested by the operator's oracle; grants are attested by the buyer.
5. **Arcium:** MPC trust rests on the Arcium node operators. Development uses localnet.
6. **Stake amounts** per position are public, because USDC transfers are public. *Which team* a position supports stays encrypted.
7. Stake-wallet funding is traceable. Shielded funding is planned for v2.

## References and disclosure

- Arcium Arcis/MXE APIs were learned from the `arcium-hq/examples` sealed-bid auction. That repository has no license, so **no code was copied**. All circuits and program code here are original. The example also lacks escrow, reserve-price enforcement, signer-bound bidders and per-market auctions, all of which Bisik adds.
- Semaphore v4 (MIT) for identities, groups and proofs; `groth16-solana` for onchain verification; Reclaim Protocol JS SDK for zkTLS.

## License

MIT, see `LICENSE`.
