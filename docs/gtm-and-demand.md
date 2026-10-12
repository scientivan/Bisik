# Bisik: Go-to-Market and Demand Validation

> Draft for the Colosseum submission ("Go-to-market strategy, demand validation, and plans for developing distribution", https://colosseum.com/hackathon). Last updated 10 Oct 2026.
>
> Labels: **[Fact]** = sourced (link or file:line). **[Inference]** = our reasoning. **[Plan]** = not done yet. Outreach results are **pending** and will be filled in on 12 Oct 2026 (section 8).

## 1. The buyer and the ICP

**Buyer:** ecosystem BD and grant teams that compete to land strong builder teams before those teams commit to a chain.

**ICP (first customer profile)** [Inference]:

- An ecosystem that already pays to attract teams (grants, accelerators, referral bounties).
- It loses value when a team it supported ships elsewhere.
- It runs post-hackathon or grant intake where judges and mentors see teams early.

Why this profile hurts:

- [Fact] MegaETH closed its MegaMafia accelerator. Its 20 teams raised "more than $80 million", yet cofounder Shuyao Kong wrote: "very little of that value has trickled to Mega" (Crypto Briefing, 16 Jul 2026, https://cryptobriefing.com/megaeth-shuts-down-megamafia-flagship-accelerator-to-focus-on-first-party-apps/).
- [Fact] Graduates moved: "GTE built its own chain, Noise launched on Base, HelloTrade went to Monad, Cap chose multichain" (https://cryptodaily.co.uk/2026/07/megaeth-ends-mega-mafia-after-migrations).
- [Fact] Chain choice is exclusive. Base Batches requires teams "committed to Base as their primary network", for "A $100,000 investment from the Base Ecosystem Fund" (https://docs.base.org/get-started/base-batches).

## 2. First 10 target buyers

These are **targets, not customers**. No one below has agreed to anything. Names are organisations with public programs, not individuals.

| # | Target | Public reason it fits |
|---|---|---|
| 1 | Solana Foundation grants | [Fact] Runs milestone grants, convertible grants and RFPs (https://solana.org/grants-funding) |
| 2 | Superteam Indonesia | [Fact] Solana community hub; hosted Solana Village Bali with Solana Foundation as co-host (https://luma.com/ia8qk9nx). Founder is local |
| 3 | Other Superteam chapters | [Fact] Superteam offers "quick microgrants ($10k)" to early builders (https://solana.org/grants-funding) |
| 4 | Avalanche Retro9000 | [Fact] Already pays referrers on outcome (section 5) |
| 5 | Base Ecosystem Fund / Base Batches | [Fact] Primary-network commitment, $100k per team |
| 6 | Arbitrum DAO Domain Allocator (prev. Questbook) | [Fact] Funded Scout Game, $20k (https://forum.arbitrum.foundation/t/scout-game-final/30144) |
| 7 | Monad ecosystem | [Fact] Received a MegaMafia graduate (HelloTrade) |
| 8 | Tempo partnerships | [Inference] New payments chain recruiting teams; World's Fair track |
| 9 | MegaETH | [Fact] Lost graduates; [Inference] may now buy signal instead of running an accelerator, or may not buy at all |
| 10 | Metis | [Fact] Paid BD bounties for introductions in 2021; current status not checked |

## 3. Wedge and first market

**Wedge** [Inference]: a **Sourcing Round** run by the operator right after a hackathon. Judges, mentors and devrel are the scouts. Two to five ecosystems buy the signal.

- Why here: hackathon insiders see teams weeks before those teams pick a chain or apply anywhere.
- Why not "finding teams": [Fact] Base Batches 004 drew "exceeding 750" applications (https://cryptobriefing.com/base-batches-004-teams-to-be-announced-september-29-after-record-applications/). Big ecosystems are not short of names. We sell **filtered, stake-backed insider judgement before commitment**, with exclusivity.

**First market** [Plan]: Solana-side buyers (Solana Foundation, Superteam chapters) for World's Fair and Superteam hackathon cohorts. Then rival ecosystems (Base, Arbitrum, Monad, Tempo) as buyers of the same rounds. The buyer's competition is what gives the exclusive slots their price.

## 4. Pricing and unit economics

**Split of every buyer payment** [Fact, code]:

- 15% platform fee (`contracts/tests/e2e.ts:183`, `feeBps: 1500`).
- Scouts: **85%** regardless of team wallet registration (revised D-08, 12 Oct).
- Teams: no automatic share. A team needs no account to be proposed. Request consent for introductions and consent plus wallet ownership evidence for outcome verification. This rule is active on devnet after the 12 Oct program upgrade (slot 510110372).
- Scout stake (10–500 USDC) is **always refunded in full**, unless a hoax is proven; slashed funds go to charity (decisions D-06, D-07).

**Price anchors** [Fact]:

- Avalanche Retro9000: "$100 in AVAX when a referred project is accepted", plus "between $500 and $10,000 in AVAX if the referred project is awarded a grant" (2 Dec 2025, https://www.avalanche.com/about/blog/the-avalanche-foundation-announces-third-cohort-for-retro9000-l1-and).
- Metis: $200 to $4,000 in METIS per introduction that leads to integration, scaled by CoinMarketCap rank (7 Sep 2021, https://www.metis.io/blog/introducing-the-metis-business-development-bounty-program).

**Illustrative round** (not market data, not a quote):

| Item | USDC |
|---|---|
| 2 exclusive slots @ 2,000 | 4,000 |
| 3 flat-price buyers @ 500 | 1,500 |
| **Gross** | **5,500** |
| Platform (15%) | 825 |
| Scouts (85%) | 4,675 |

Scouts receive 85% regardless of deploy-wallet registration; there is no team share.

[Inference] The per-slot price sits inside the Retro9000 grant-referral range ($500–$10,000). That only shows the budget line exists. It does not show anyone will pay this for our product.

**Honest caveat on "paid only on outcome"** [Fact, living doc §5.9 and D-05]: the buyer's payment is escrowed and not refundable. At the end of the outcome window the buyer must mark at least one option; if they mark nothing, the pool goes to the highest-scoring option they bought. So scouts are paid **by outcome weighting**, not strictly "only if a team ships". [Inference] Buyers used to pure success fees (Retro9000, Metis) may object to this. We will ask about it directly (section 8).

## 5. Distribution channels

[Plan] Ordered by expected cost of reach:

1. **Hackathon organisers' networks.** Colosseum Arena profiles, Superteam chapters. Scouts and teams already gather there.
2. **Direct BD outreach** by the founder to the 10 targets above.
3. **Grant tooling as partners, not rivals:** Karma GAP and Questbook. [Fact, living doc §12] Karma GAP lists 300+ grant programs; this count comes from our earlier research and was not re-checked today.
4. **Exclusive Markets** opened by an ecosystem itself, once one buyer has run a Sourcing Round.

## 6. Scout supply and cold start

**Who scouts** [Plan]: hackathon judges, mentors and alumni (Colosseum, Superteam), devrel, community leads.

**Why they would join** [Inference]:

- They already hold this information and have no paid, private channel for it.
- Stake is refunded, so a wrong call costs nothing but time.
- Identity stays private: zkTLS proof of GitHub record, anonymous tier group (Semaphore), encrypted positions (Arcium).

**Cold-start plan** [Plan]:

- Seed the first round with invited scouts from one hackathon cohort, so the k = 5 anonymity threshold per tier (D-19) is met.
- One buyer is enough to run a round. Exclusivity pricing starts once two buyers compete.
- [Inference, living doc R1] If no buyer pays at first, run a subsidised exclusive market to produce a public track record.

**Warning sign** [Fact]: Retro9000's referral program paid only "$12,000 ... between 49 community members" after three snapshots, against "up to $2m allocated" (same Avalanche page). Scout supply is unproven.

## 7. Public demand evidence

### Supports the thesis

- [Fact] Ecosystems already pay outsiders for team referrals, **only on outcome** (Retro9000, Metis; section 4).
- [Fact] Metis on why: "even pounding the pavement full time, we can't possibly scout every single quality project".
- [Fact] Teams supported by one ecosystem leave for others (MegaMafia; section 1).
- [Fact] DAOs fund talent scouting: Scout Game received $20,000 via the Arbitrum Domain Allocator, and reports 160 rewarded PRs and 196 developers (posted 29 Oct 2025, https://forum.arbitrum.foundation/t/scout-game-final/30144). These are the grantee's own claims.

### Weakens the thesis

- [Fact] Retro9000 referrals are thin: $12,000 to 49 people, and "$85,500 in referral rewards that went unclaimed".
- [Fact] Inbound is abundant: 750+ Base Batches 004 applications.
- [Fact] Metis pays for introductions, not names: "merely suggesting a project to us does not qualify". Our scouts are anonymous. Our answer (D-15): a scout may reveal identity **only to the winning exclusive buyer**, to make the introduction.
- [Fact] Some ecosystems are retreating from third-party teams: MegaETH is redirecting to "OMEGA applications" and its own consumer apps.
- [Fact] "Paid scouting of builders" exists already (Scout Game, Talent Protocol). See section 10.

## 8. What is NOT validated yet

- **Willingness to pay** for private, stake-backed, exclusive signal. No ecosystem has said yes.
- **Scout participation** at our stake range (10–500 USDC) and reward levels.
- **Team acceptance** of being proposed privately (opt-in vs opt-out).
- **Buyer acceptance** of a non-refundable payment with a default winner (section 4).
- **Signal quality**: whether insider calls beat what a BD team already knows.

[Fact] As of the last records (`Ideation-Colosseum/living-doc/d12-evidence-log.csv`, header only), **no outreach message had been sent and no reply logged**.

## 9. Validation plan and results

**Method** [Plan, `d12-outreach-kit.md`]: the founder sends short research DMs (X, Telegram, Discord, Arbitrum forum). Questions ask about past events, not opinions: "In the last 6 months, did you lose a team you wanted to another ecosystem?" No money or tokens are promised. Quotes are used only with permission, anonymised by role.

**Targets:** 10 buyer conversations, 10 scout conversations, 5 team conversations. Numbers locked Mon 12 Oct 2026, 20:00 WIB.

**Metrics:**

- Buyers: replies; share who lost a team in the last 6 months; preferred model (per successful team vs per round); price range; willing to join a non-binding pilot round.
- Scouts: knew of an uncommitted strong team before ecosystems did; willing to stake; minimum reward; importance of anonymity (1–5); waitlist sign-ups.
- Teams: chain already chosen; reaction to private proposal; opt-in vs opt-out.

**Results (K4, to be filled from the evidence log; do not edit numbers by hand):**

| Segment | Contacted | Replied | Positive / pilot_yes | Negative | Main objection |
|---|---|---|---|---|---|
| Buyers (ecosystem BD / grants) | _TBD_ | _TBD_ | _TBD_ / _TBD_ | _TBD_ | _TBD_ |
| Scouts | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| Teams | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

Summary line for the form: *"We asked N ecosystem BD/grant leads; M replied; K would join a non-binding pilot round. Main objection: …"* A non-binding pilot is **not** a customer or a commitment.

## 10. Competition and why us

| Product | What it already does [Fact] | What Bisik adds |
|---|---|---|
| Bench / Benchdot (Arcium) | Private stake-backed opportunity market; refundable stake; market creator picks the winner (https://docs.bench.markets) | Exclusive auction between rival buyers; encrypted reasons scored by Veritas; private reputation from external record; outcome checked onchain |
| Scout Game (CharmVerse) | Rewards scouts for endorsing individual developers; sponsor-funded | Judges **teams**, privately, paid by the **buyer**, exclusive |
| Talent Protocol | Public Builder Score; Builder Rewards with Base | Insider judgement that is not in public data |
| Retro9000 / Metis referrals | Outcome-based public referrals by one referrer | Many anonymous scouts, stake-backed, with reasons, exclusive |

**Why this founder** [Fact]: Dien won 2 tracks solo at the UHI9 Hookathon with Veritas, which scores content for duplication and AI authorship. That engine now scores scout reasons inside Bisik.

## 11. Risks

- **No buyer pays** (biggest risk). [Plan] Validation above; subsidised first market.
- **Few buyers.** Possibly a dozen ecosystems at most. [Inference] Revenue per round must be high, or the model must extend to other uses (hiring, research).
- **Scouts don't show up.** The Retro9000 referral data points this way.
- **De-anonymisation in small communities.** Mitigated by coarse tiers, k = 5, AI privacy filter. Not eliminated.
- **Teams object to being "traded".** Public entities only, a policy channel for objections, consent for introductions and outcome verification (revised D-09). No automatic team payment.
- **Trust assumptions.** In v1 the operator's AI service sees plaintext reasons (D-10). Arcium Mainnet Alpha is not fully decentralised.
- **Closeness to Bench.** Judges know Bench, so the differences must stay explicit.
- **Gambling perception.** Bisik is not a prediction market. Stakes are refunded, rewards come only from buyer payments, and wrong opinions are never slashed.
