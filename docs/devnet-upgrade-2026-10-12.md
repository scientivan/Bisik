# Bisik devnet upgrade · 12 October 2026

Dien explicitly requested activating the removal of automatic team payments on devnet. Upgrade completed and was verified onchain.

| Item | Result |
| --- | --- |
| Program | `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD` |
| Deployment slot | `510110372` (previous: `509545438`) |
| Upgrade authority | `FRTMLy9suBCQYGya341V4urVedMJXFg21dDw4CTn43Ke` (unchanged) |
| Binary SHA-256 | `0fddcb4a33be20561a75f3ec6c046573df5ac705e00c3687e07cc8f324cd8a41` |
| Transaction | [5H7Zj8FbN6SyMVcmaSbxVNtxA88UwpLqo5poDRXKpqMJ7iebEZMrfswEPt7bFao7wWJYDpszuvSf1K54rcRAbxmw](https://explorer.solana.com/tx/5H7Zj8FbN6SyMVcmaSbxVNtxA88UwpLqo5poDRXKpqMJ7iebEZMrfswEPt7bFao7wWJYDpszuvSf1K54rcRAbxmw?cluster=devnet) |

The live program bytes match the tested local binary exactly, including zero padding in the existing allocation. A read-only transaction simulation of `pay_team_share` returned `TeamShareRemoved` (6024). This confirms the deployed entry point cannot transfer the legacy team payment. New scout payouts are 85%, independent of deploy-wallet registration; the platform remains 15%. Already settled position payouts were not recalculated.

Pre-upgrade audit found markets 0–8 settled; market 9 was Settling with zero positions. No registered-wallet mask or prior team transfer existed in any audited market. Account layouts and instruction discriminators/arguments remain compatible. The legacy Config field `team_bps` remains 500 in the existing account but no longer enables payments; new initialization requires zero.

## Deployment transport

CLI upload hit its write retry limit; a public-RPC retry made limited progress. Both were stopped while retaining the same funded buffer. Bounded writes completed only missing 800-byte chunks using the loader-v3 Write ABI, first verified in simulation. RPC `signatureSubscribe` was unsupported, so confirmation used HTTP polling in two workers. Final buffer bytes matched the tested binary before the normal Solana CLI finalized the upgrade. No extra buffer deposit was created.

Scripts: `scripts/audit-devnet-upgrade.ts`, `scripts/upgrade-devnet.ts`, `scripts/resume-devnet-buffer.ts`, `scripts/verify-devnet-upgrade.ts`. Local audits, rollback binary and sanitized deployment results are in ignored `tmp/`; the buffer signer is stored privately in the OS temporary directory, never in the repository. Loader reference: [official Solana deployment documentation](https://solana.com/docs/core/programs/program-deployment).

## Verification limits

Three focused Rust payout tests pass, proving registration-independent rewards, conservation within rounding and legacy-transfer accounting. The deployment was verified by live bytecode comparison and a payment-rejection simulation. This session did not rerun an entire MPC market lifecycle or browser wallet transactions, and did not run a competing keeper/lifecycle driver. The same session separately verified role navigation at localhost:5173, desktop/mobile and dark mode; see `app-role-navigation.md`.
