# Bisik devnet upgrade · 13 October 2026

Dien approved buyer-opened auction rounds, the onchain buyer record (N1) and a separate outcome kind for the buyer's "most valuable" mark (N2), with this upgrade.

| Item | Result |
| --- | --- |
| Program | `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD` |
| Deployment slot | `510358648` (previous: `510110372`) |
| Upgrade authority | `FRTMLy9suBCQYGya341V4urVedMJXFg21dDw4CTn43Ke` (unchanged) |
| Binary SHA-256 | `7db4a4e3d96ee9228974e2445dac8d2d5317035e05c8850ef7b18a1916c19171` |
| Program data | extended by 100,000 bytes to 1,697,044 bytes (binary is 1,686,880) |
| Transaction | [58bEe5Fx…](https://explorer.solana.com/tx/58bEe5FxsNujGwG31iRgHT7BfT1ePSRMkFz6g8fkc8N1gxFaeXWUks22wSFRR2Fdy8LfPKVqD5ahV8tUbTwRHD1T?cluster=devnet) |
| Recovery point | git commit `a5a3cc5` |

## What changed onchain

- `create_market`: an auction round may be opened only by a wallet whose `BuyerProfile` is verified (`NotEligibleBuyer` 6018 otherwise). Exclusive markets are unchanged. The creator of an auction gets no allocation and bids like everyone else. This replaces decision D-02 (operator opened auction rounds).
- New `BuyerRecord` PDA `["brec", buyer]` counts markets joined, outcomes recorded, default outcomes applied (missed reports), and disputes opened, upheld and rejected. It is created on first use, paid by the instruction signer.
- No existing account layout, discriminator or instruction argument changed. Seven instructions gained accounts (`create_market`, `open_bid`, `buy_flat`, `record_outcome`, `set_default_outcome`, `open_dispute`, `resolve_dispute`), so clients must use the new IDL.
- The buyer's "most valuable" mark is recorded as outcome kind 3. The program stores kind without validating it and payouts read only masks, so payouts are unchanged.

## Verification

- `arcium test --skip-build` on localnet passed end to end, including BuyerRecord counter assertions (`contracts/tests/e2e.ts:563-572`) and the rejection of an unverified auction creator.
- `cargo test -p bisik` 7/7; server 15/15, keeper 6/6, web 7/7.
- Pre-upgrade audit: markets 0–8 Settled, 9 Settling with no positions, no MPC computation busy.
- Live program bytes equal the tested binary; the remaining allocation is zero. All 11 markets still deserialize after the upgrade.

## Transport

The CLI upload over the public RPC stopped with `Data writes to account failed: Max retries exceeded`, keeping the funded buffer `5fvckf9X…`. `scripts/resume-devnet-buffer.ts` wrote the missing 800-byte chunks and confirmed the buffer matched the binary, then `scripts/upgrade-devnet.ts --resume --public-rpc` finalised. The program was never in a partial state.

## Still required

- Restart the server so `recordOutcome` and `setDefaultOutcome` use the new accounts.
- Redeploy the production web build. Old builds fail on the seven changed instructions.
- No transaction under the new rules was sent on devnet in this session; the evidence is the localnet run and the bytecode match.
