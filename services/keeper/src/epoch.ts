/**
 * D6 / F10: when the keeper should run `epoch_tiers` (pure decision, unit-tested).
 *
 * The program reveals the tier list for `current_epoch + 1` at most once per epoch
 * (`rep.tiers_epoch != next`), serializes on `rep.busy`, and resets `tiers_epoch` to 0 when
 * the MPC callback fails. The reputation counters are cumulative and the reveal cannot be
 * redone for the same epoch, so it must run as late as possible in the epoch, after pending
 * credits are folded in, and before the operator rotates the epoch. If the operator rotates
 * first, that epoch simply has no reveal (the program cannot target the current epoch).
 */

export interface EpochConfig {
  currentEpoch: number;
  epochStart: number;
  epochLen: number;
}

export interface RepState {
  ready: boolean;
  busy: boolean;
  tiersEpoch: number;
  tiersReady: boolean;
}

/** In-process memory of the last failed attempt (the keeper is single-threaded per tick). */
export interface TiersAttempt {
  epoch: number;
  at: number;
  failures: number;
}

export interface TiersOptions {
  /** Start trying this many seconds before the epoch ends. */
  leadSec: number;
  /** Operator asked for the reveal now (one-shot `--tiers-now`), ignoring the time window. */
  force?: boolean;
  /** Settled positions not yet credited were seen this tick. */
  pendingCredits?: boolean;
  lastFailure?: TiersAttempt | null;
  /** Base retry delay after a failure; doubles per failure, capped at 16x. */
  backoffSec?: number;
}

export type TiersDecision = { run: true; next: number } | { run: false; next: number; reason: string };

export function epochEnd(c: EpochConfig): number {
  return c.epochStart + c.epochLen;
}

export function retryAt(f: TiersAttempt, backoffSec: number): number {
  return f.at + backoffSec * 2 ** Math.min(f.failures - 1, 4);
}

export function decideEpochTiers(c: EpochConfig, rep: RepState | null, now: number, o: TiersOptions): TiersDecision {
  const next = c.currentEpoch + 1;
  const no = (reason: string): TiersDecision => ({ run: false, next, reason });
  if (!rep) return no("reputation table not initialized");
  if (!rep.ready) return no("reputation table not ready");
  if (rep.tiersEpoch === next) return no(rep.tiersReady ? "already revealed for next epoch" : "reveal in flight");
  if (rep.busy) return no("reputation busy (credit or reveal in flight)");
  const end = epochEnd(c);
  if (!o.force && now < end - o.leadSec) return no("too early in epoch");
  // Fold pending credits in first, unless the epoch is already over (then waiting only risks
  // the operator rotating with no reveal at all).
  if (!o.force && o.pendingCredits && now < end) return no("pending reputation credits");
  const f = o.lastFailure;
  if (f && f.epoch === next && now < retryAt(f, o.backoffSec ?? 60)) return no("backing off after failure");
  return { run: true, next };
}
