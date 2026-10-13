# Colosseum Crypto World's Fair: submission text for Bisik

Copy each block into the matching field of the form. All facts come from `important_for_demo.md`, the README, and scientivan.dev.

## Web app

https://bisik.scientivan.dev

## Video links

- Pitch: https://youtu.be/Fuf4JJXD1mQ
- Product demo: https://youtu.be/QBAEB8aVygA

## Video titles

- Pitch: **Bisik: Private, stake-backed insider signals for ecosystems competing for builders | Pitch**
- Demo: **Bisik product demo: sealed calls, sealed bids and anonymous payouts on Solana devnet**

## Product name

Bisik

## Brief description (one line)

A private market where blockchain ecosystems buy stake-backed insider signals about builder teams before those teams pick a chain.

## Description (longer)

Bisik ("whisper" in Indonesian) is a private signal market. In this submission we show one use case, hackathons. Judges and mentors (scouts) sell what they saw about teams as sealed calls, each backed by a refundable USDC stake. Ecosystems (buyers) are verified first and can open an auction round. They see only an aggregate preview, then bid in a sealed auction. The winner can keep up to three signals exclusive before rival buyers see the rest, and others buy the remainder at a flat price. When a team ships, the buyer records the outcome. Scouts receive 85% of buyer payments according to outcomes, and their stake comes back. They claim to a fresh address, so nobody learns who they are.

It is not a prediction market. Honest stakes are refunded in full, rewards come only from buyers, and only a proven hoax is slashed (to charity).

## Which blockchains and tools

- **Solana** (devnet): Anchor 1.0.2 program `aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD`. It handles escrow, markets, stakes, auctions, outcomes, settlement and claims.
- **Arcium** MPC (cluster 456, v0.15.0): encrypted aggregation of which option each stake backs, sealed generalized second-price auction, and settlement. Bid values are never revealed.
- **Semaphore v4 + groth16-solana**: anonymous group-membership proofs for stake and claim, verified onchain (about 97k–130k CU).
- **Reclaim Protocol** (zkTLS): scouts prove their GitHub record. It is verified offchain, and only a tier and a nullifier hash go onchain.
- **USDC** (mock mint on devnet) for stakes, payments and payouts.
- Veritas: an internal module that scores scout reasons for duplication and AI-likelihood. It uses Gemini only as the model provider. Its scores are flags, never grounds for slashing.
- TypeScript server and keeper, React web app with Wallet Standard.

## Team

Dien Muhammad Scientivan Kurniapramono, solo founder. Information Engineering undergraduate at Universitas Gadjah Mada (2024–now). Works across Web3, AI and backend systems.

- Two-track winner, 9th Uniswap Hook Incubator (Impermanent Loss & Yield Systems, and Reactive Network). The project was Veritas, whose scoring engine now powers Bisik's reason checks.
- 2nd place, Monad Blitz Hackathon Jogja (VISTA). VISTA was later ported to Solana as four Anchor programs.
- Top 10 of 139, KeeperHub Agent Economy Hackathon (Resi, retry-safe agent payments).
- Top 150 of 9,000 builders, EDU Chain Hackathon Semester 3 (Edugram).
- Portfolio: https://scientivan.dev

## Location

Yogyakarta, Indonesia

## Logo

`docs/brand/bisik-logo-1024.png`

## GitHub

https://github.com/scientivan/Bisik (MIT)

## Go-to-market strategy

- **Buyers first:** ecosystem BD and grant teams that compete for post-hackathon teams. Start with Solana Foundation and regional Superteams, then Base, Arbitrum, Tempo and Monad.
- **Scouts:** hackathon judges, mentors, alumni and devrels from Colosseum and Superteam.
- **Product shape:** one Sourcing Round per hackathon season, opened by a verified buyer as an auction round, plus exclusive markets for a single ecosystem.
- **Pricing benchmark:** ecosystems already pay for results-based referrals. Avalanche Retro9000 pays $100 to $10,000 per project, and Metis paid $200 to $4,000 per integration. An illustrative round has 2 exclusive slots at 2,000 USDC plus 3 flat buyers at 500 USDC, which totals 5,500 USDC (4,675 to scouts, 825 to Bisik).

## Demand validation

We have not run buyer or scout interviews yet, and we have no paying users. What we have is public evidence that the budget line and the pain exist:

- Ecosystems pay outsiders for referrals that land (Avalanche Retro9000, Metis BD bounty).
- Ecosystems lose teams they invested in. MegaETH closed its MegaMafia accelerator, saying "very little of that value has trickled to Mega".
- Base Batches invests $100k per team and requires a commitment to Base as the primary network.

The next step is a pilot round, with hackathon judges as scouts and ecosystem grant teams as buyers. We will report replies, including refusals.

## Distribution plan

- Colosseum Arena profiles and the Superteam network to reach scouts.
- Grant registries as distribution partners rather than competitors: Karma GAP (300+ grant programs) and Questbook.
- Repeat every hackathon season, then expand to hiring and investment research markets.

## Trust assumptions (for the reviewer)

v1 has the following trust assumptions:

- The operator verifies buyers and records outcomes (with buyers). Every outcome keeps its signer and an evidence hash onchain.
- In the demo video, the scout tier comes from the operator demo path, because a live GitHub zkTLS proof was not recorded.
- The Veritas operator sees reason plaintext.
- Stake amounts are public. Only which team a stake backs is encrypted.

The roadmap replaces the operator oracle with an open network of staked verifiers, and moves reasons into a TEE.
