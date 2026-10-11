# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Scouts (insiders):** people who see something valuable before the market does, for example hackathon judges, mentors, devrel and senior developers. They want to sell what they know without revealing who they are, and they put a refundable stake behind each call.
- **Buyers:** organisations that pay for private, stake-backed judgement and compete with each other for it. In the first use case these are ecosystem BD and grant teams looking for builder teams before those teams commit to a chain.
- **Hackathon judges (Colosseum Crypto World's Fair):** they evaluate the product mostly through a 2–3 minute pitch video, a 3 minute demo video and the repository. They must understand the mechanism quickly.

## Product Purpose

Bisik is a private, stake-backed insider-signal market on Solana. Insiders stake anonymously behind options, explain why, and buyers pay to see the aggregated signal. Exclusivity is sold through a sealed-bid auction. Payouts follow outcomes, and scouts claim to a fresh address.

**The mechanism is the product.** Builder sourcing between rival ecosystems is the first use case, not the definition of the product (Dien, 11 Oct 2026). Judges must come away understanding the mechanism; the use case illustrates it.

Success for the hackathon: a judge who sees the first viewport knows that insider signals stay secret while still being sold and paid for, and the demo proves it on devnet.

## Positioning

What neighbouring products cannot truthfully claim:

- Identity, picks and bids stay private at the same time: zkTLS reputation verified offchain, anonymous Semaphore groups, encrypted positions and bids aggregated in Arcium MPC.
- Stakes are refundable; rewards come only from buyer payments. It is not a prediction market and no loser pays a winner.
- Rival buyers bid for exclusivity in a sealed-bid auction (generalised second price, reserve price).
- Reasons are scored by Veritas (duplication and AI-likelihood) and rewritten to remove identifying details.

Closest comparisons: Bench (Arcium), Scout Game, Talent Protocol, Retro9000/Metis referral programs.

## Operating Context

- Lifecycle per market: Open (scouts stake) → Closed (weights folded in MPC) → Auction (sealed bids) → Allocated (signals assigned) → Outcome window → Settling → Settled (scouts claim privately).
- Scouts onboard once with a Reclaim zkTLS proof of their GitHub record; only a tier and a nullifier hash go onchain.
- Buyers see only a strength histogram before buying; after buying, they decrypt their own view with an x25519 key.
- A keeper drives lifecycle transitions; an operator server handles verification, Veritas scoring and outcome attestation.
- Runs on Solana devnet with Arcium MPC (cluster 456). Demo USDC is a mock mint.

## Capabilities and Constraints

- Stack for `apps/web`: Vite + React + TypeScript + Tailwind (task G1). Only `VITE_` variables in the web app. Hosted on Vercel.
- Stake range 10–500 USDC, refundable. Up to 3 options per scout per market. Anonymity threshold k = 5 per tier group.
- Split of each buyer payment: 15% platform, 80% scouts (85% when no opted-in team takes its 5%), 5% opted-in team.
- Payout honesty: a buyer's payment is not refunded. If the buyer marks no successful option, the pool goes to the strongest signal they bought (D-05). Never claim "paid only if the team ships".
- Deadline: Colosseum submission 13 Oct 2026 13:59 WIB.

## Brand Commitments

- Name: Bisik (Indonesian for "whisper").
- Must not look like gambling or trading: no price charts, no green/red win-loss colouring, no betting language (Dien, 11 Oct 2026).
- Must not look AI-generated (Dien, 11 Oct 2026).
- Layout structure reference chosen by Dien: Halyard landing and app (https://halyard-bnb.vercel.app/). Copy the section structure only; content, palette, fonts and element shapes must be different.

## Evidence on Hand

- Devnet runs passed end to end (market 2 and 3), including D4 per-buyer decryption and D6 encrypted reputation. Ayu claimed 213.58 USDC to a fresh address (task-tracker.md Progress Log).
- Localnet MPC latency 2.6–4.1 s per step.
- No customers, pilots or demand evidence yet. Outreach has not produced replies. Do not invent users, testimonials, volumes or partners.
- Demo market data (team names, scout names, weights) is synthetic and must be labelled as demo.

## Product Principles

1. Show the mechanism working, not adjectives about it.
2. Every private value has a visible state: sealed, revealed to you, or public.
3. Honest economics: say exactly who pays whom and when.
4. The use case is an example; the mechanism is the product.
