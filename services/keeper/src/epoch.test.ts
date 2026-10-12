import { test } from "node:test";
import assert from "node:assert/strict";
import { decideEpochTiers, retryAt, type EpochConfig, type RepState } from "./epoch.js";

const cfg: EpochConfig = { currentEpoch: 3, epochStart: 1_000, epochLen: 10_000 }; // ends at 11_000
const rep: RepState = { ready: true, busy: false, tiersEpoch: 3, tiersReady: true };
const opts = { leadSec: 600 };

test("runs once inside the lead window, targeting current_epoch + 1", () => {
  assert.deepEqual(decideEpochTiers(cfg, rep, 5_000, opts), { run: false, next: 4, reason: "too early in epoch" });
  assert.deepEqual(decideEpochTiers(cfg, rep, 10_400, opts), { run: true, next: 4 });
  assert.deepEqual(decideEpochTiers(cfg, rep, 20_000, opts), { run: true, next: 4 }); // overdue rotation
});

test("never double-runs for the same epoch, in flight or done", () => {
  const inFlight = { ...rep, busy: true, tiersEpoch: 4, tiersReady: false };
  assert.equal(decideEpochTiers(cfg, inFlight, 10_900, opts).run, false);
  // even if a stuck computation released busy without a callback outcome, tiers_epoch still blocks
  assert.equal(decideEpochTiers(cfg, { ...inFlight, busy: false }, 10_900, opts).run, false);
  assert.equal(decideEpochTiers(cfg, { ...rep, tiersEpoch: 4 }, 10_900, opts).run, false);
  assert.equal(decideEpochTiers(cfg, { ...rep, tiersEpoch: 4 }, 10_900, { ...opts, force: true }).run, false);
});

test("waits while a credit computation holds rep.busy, and for missing/unready table", () => {
  assert.equal(decideEpochTiers(cfg, { ...rep, busy: true }, 10_900, opts).run, false);
  assert.equal(decideEpochTiers(cfg, null, 10_900, opts).run, false);
  assert.equal(decideEpochTiers(cfg, { ...rep, ready: false }, 10_900, opts).run, false);
});

test("pending credits defer the reveal until the epoch end, not past it", () => {
  assert.equal(decideEpochTiers(cfg, rep, 10_900, { ...opts, pendingCredits: true }).run, false);
  assert.equal(decideEpochTiers(cfg, rep, 11_000, { ...opts, pendingCredits: true }).run, true);
});

test("a failed callback (tiers_epoch reset to 0) is retried with exponential backoff", () => {
  const failed = { ...rep, tiersEpoch: 0, tiersReady: false };
  const lastFailure = { epoch: 4, at: 10_500, failures: 2 };
  assert.equal(retryAt(lastFailure, 60), 10_620);
  assert.equal(decideEpochTiers(cfg, failed, 10_600, { ...opts, lastFailure }).run, false);
  assert.equal(decideEpochTiers(cfg, failed, 10_620, { ...opts, lastFailure }).run, true);
  assert.equal(retryAt({ epoch: 4, at: 0, failures: 99 }, 60), 960); // capped at 16x
  // a failure recorded for another epoch does not block
  assert.equal(decideEpochTiers(cfg, failed, 10_600, { ...opts, lastFailure: { ...lastFailure, epoch: 3 } }).run, true);
});

test("operator force ignores the time window but keeps the state guards", () => {
  assert.deepEqual(decideEpochTiers(cfg, rep, 2_000, { ...opts, force: true }), { run: true, next: 4 });
  assert.equal(decideEpochTiers(cfg, { ...rep, busy: true }, 2_000, { ...opts, force: true }).run, false);
});
