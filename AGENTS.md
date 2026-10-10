# Bisik — Agent Instructions

Bisik is a private signal market where ecosystems (Solana, Base, Arbitrum, Tempo, and others) buy insider signals about promising builder teams that have not yet committed to a chain. Target: Colosseum Crypto World's Fair, Solana track. Deadline: 13 Oct 2026, 13:59 WIB.

## Source of truth

- **Build plan, interface spec, task status, progress log:** `task-tracker.md`. Start here in every new session.
- Product spec (living document): `../Ideation-Colosseum/living-doc/builder-sourcing-living-doc.md`. Read it before any product decision.
- Dependency test results: `../Ideation-Colosseum/ideation/114-uji-tiga-dependensi.md`.
- Cross-session knowledge base: `../AGENTS.md`.
- Reclaim provider spec: `docs/reclaim-provider-spec.md`.

Items tagged **[Keputusan Dien]** in the living document are locked. Do not change them without asking Dien.

## Rules

1. **Ask Dien when in doubt.** This applies to anything with a trade-off or more than one reasonable direction.
2. **Never commit secrets.** `.env` holds `GEMINI_API_KEY`, `WALLET_ADDRESS`, `RECLAIM_APP_ID`, and `RECLAIM_APP_SECRET`. Never print their values.
2b. **Use a single `.env` at the Bisik root.** Each runtime folder (`apps/web`, `apps/server`, `apps/mcp-server`, `contracts`, `scripts`, `services`) has a `.env` symlink pointing to it. Every symlink is gitignored. List new variable names in `.env.example`, never their values. Secrets must never reach the browser bundle: only variables with the bundler's public prefix (for example `VITE_`) are allowed in `apps/web`.
3. **Arcium examples are reference only.** `arcium-hq/examples` has no license. Write our own code; do not copy it (R21).
4. **Veritas is an internal module, not an external service (D-21).** Gemini is only the model provider.
5. **zkTLS proofs are verified offchain (D-16).** Only the tier and the nullifier hash go onchain. Never write a username onchain.
6. **Anonymous groups are in v1 (D-17).** See living document section 8.2.
7. **Builds wait for Dien's go-ahead** (D-18). The build plan and task tracker are created only when Dien says so.
8. **Record new knowledge** in `../AGENTS.md` and in the living document. Bump the version and the Decision Log, then rebuild the PDF.
9. **Keep the repo private until submission** (Dien's decision, 10 Oct).

## Pinned toolchain

Versions are pinned to match the Arcium docs and the `sealed_bid_auction` example:

- Solana CLI 3.1.10
- Anchor 1.0.2 (via `avm`)
- Arcium 0.13.2 (via `arcup`)
- Rust 1.89.0 for programs
- circom 2.2.3 and snarkjs 0.7.6
- Semaphore v4 packages 4.14.3
- `groth16-solana` 0.2.0

Disk space is tight. Check `df -h` before large builds.
