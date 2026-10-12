# Team participation and payment revision · 12 October 2026

Dien approved removing the automatic 5% team share and deferring the Team page. Paying a team merely for wallet registration adds no demonstrated value and can encourage coordinated promotion by scouts and teams.

## Result

- A scout can propose a team without a Bisik account, consented onboarding or registered wallet. Existing add-option behavior already supports this.
- Buyer payments are split 85% to scouts and 15% to the platform. Teams receive no automatic payment.
- `/team` and its navigation entry are removed from the active frontend. `apps/web-backup` is unchanged as a historical backup.
- Obtain the team's consent when arranging an introduction. For deployment evidence, obtain consent and confirm wallet ownership before operator registration. This is an operational policy; the program does not verify a team consent signature or independently prove ownership.
- Operator wallet registration remains available solely for outcome verification. Legacy `opted_in` and `opted_mask` fields still serve the existing oracle/keeper wallet-registration lookup; they no longer affect new payout calculations.

## Program compatibility and rollout

Account sizes, instruction names and discriminators are unchanged. `team_bps` stays in Config/InitConfig for ABI compatibility; new initialization requires zero. Legacy devnet Config can still contain 500, but the revised `pay_team_share` instruction always rejects with `TeamShareRemoved`, and payout calculations do not consult that Config field.

Scouts receive 85% independent of the wallet-registration mask. If a legacy buyer pool already paid a team before upgrade (`team_paid`), it retains an 80% scout allocation so the transferred 5% cannot be spent twice. Already settled position payouts stay unchanged. A partially settled legacy market can retain older recorded payouts alongside newly calculated ones, leaving rounding or legacy residual funds; do not promise retroactive recalculation.

The devnet deployment was upgraded on 12 October at slot 510110372, explicitly requested by Dien. Bytecode matches the tested build; live `pay_team_share` simulation returns `TeamShareRemoved` (6024). Audit found no funded active/partially settled markets or prior team transfers. Full report: `devnet-upgrade-2026-10-12.md`. Already recorded payouts remain unchanged. No commit/push was performed, and no lifecycle driver ran alongside the keeper.

## Verification

- Three Rust payout tests: wallet registration does not reduce rewards; 85/15 accounting; previously transferred legacy team money is not paid twice; no-hit/zero-denominator cases.
- Frontend build/typecheck, workspace typecheck and three frontend tests pass.
- Server tests pass 11/11 with attestor endpoint access.
- SBF compilation and IDL generation complete. SBF build prints dependency stack-offset diagnostics in syn/anchor_syn; no onchain execution is claimed by this build.
- Browser review passes on desktop (1440px) and mobile (390px): 85/15 labels, no Team navigation, `/team` returns Page not found, outcome-registration copy, no horizontal overflow. Payment artwork uses normal flow to keep text readable. Living document PDF rebuilt at v0.21.
- Generated IDL account types, instruction names/discriminators/accounts/args match the previous ABI.
