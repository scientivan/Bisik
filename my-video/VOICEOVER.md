# Bisik demo: voice-over script (draft v2)

> Pace about 2.4 words per second. Each line maps to a recording ID in `RECORDING-TRACKER.md`.
> Source rules: `../important_for_demo.md` (demo = how, explain the Solana reasoning, disclose trust assumptions and skipped time).
> Everything runs on Solana devnet with mock USDC and synthetic teams.

| ID | Seconds | Line |
|---|---|---|
| B1 | 0–7 | A buyer, say an ecosystem team, connects a wallet. Rival buyers can only open auction rounds once they are verified. |
| B2 | 7–14 | Today the operator verifies buyers. One transaction writes a buyer profile onchain. |
| B4 | 14–30 | The buyer asks one question about teams. An exclusive market has one buyer who funds the pool now. An auction round lets rival buyers bid for exclusivity, so the buyer picks auction, sets a reserve and a flat price, and opens it. Creating it also initialises encrypted state on Arcium. |
| B5 | 30–38 | The round is live in the marketplace. Anyone can see the windows and prices. Nobody can see who backs which team. |
| S1 | 38–50 | Now a scout. The identity is created in the browser; only its commitment is public. Reclaim's zkTLS proves the GitHub record, and only a tier and a nullifier go onchain. For this recording the Gold tier comes from the operator's demo path. |
| S2 | 50–62 | The scout adds a team as a sealed option and explains why. Before any money moves, Veritas scores the reason: duplicate risk and verifiable claims. Flags only, never grounds for slashing. |
| S3 | 62–74 | Seal and stake. The browser builds a Semaphore proof of group membership, and the team choice is encrypted for Arcium's MPC. The Bisik program verifies the Groth16 proof onchain, about 130 thousand compute units. |
| B6 | 74–82 | We skip ahead to the end of scouting. Arcium aggregates the sealed calls; buyers see only a tier histogram and signal strength, no team names. |
| B7 | 82–96 | Two buyers bid. The ceiling deposit is public, the bid is encrypted. Arcium compares the bids without anyone seeing them. |
| B8 | 96–104 | Second-price result: the winner pays the runner-up's bid, and the unused deposit is refunded. |
| B9 | 104–116 | The winner decrypts its view with its own key and hides one signal from later buyers. The second buyer then picks from what is left, and cannot see the hidden one. |
| B10 | 116–123 | A third buyer skips the auction, pays the flat price and gets the remainder. |
| B11 | 123–131 | Reasons arrive filtered for privacy, with claims separated from opinion. |
| B12 | 131–139 | The buyer asks for an introduction. The scout accepts and shares a contact encrypted to that buyer only. |
| O1 | 139–150 | When the team delivers, the buyer marks the most valuable signal. Only a hash of the evidence goes onchain. Today the operator and buyers sign outcomes publicly. Next, an open network of staked verifiers with secret votes. |
| S4 | 150–162 | After settlement the scout claims stake and reward to a fresh address with a nullifier proof, unlinked from the staking wallet. |
| End | 162–170 | Private calls, sealed bids and anonymous payouts, all settled on Solana. Bisik. |

Disclosures said in the voice-over: demo tier path, skipped waiting time, operator-signed outcomes in v1, synthetic data.
