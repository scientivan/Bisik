import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { registerReputationRoutes, reputationView, type EpochSnapshot } from "./reputation.js";

const snap = (rep: EpochSnapshot["rep"], demoMode = false): EpochSnapshot => ({ currentEpoch: 2, epochStart: 1_000, epochLen: 500, demoMode, rep });
const rep = { ready: true, busy: false, tiersEpoch: 2, tiersReady: true, tiers: [0n, 0n, (7n << 8n) | 2n, (9n << 8n) | 0n] };

test("epoch timing and rotation window", () => {
  const v = reputationView(snap(rep), 1_200);
  assert.equal(v.epochEnd, 1_500);
  assert.equal(v.secondsLeft, 300);
  assert.equal(v.rotationAllowed, false);
  assert.equal(reputationView(snap(rep), 1_600).secondsLeft, 0);
  assert.equal(reputationView(snap(rep), 1_600).rotationAllowed, true);
  assert.equal(reputationView(snap(rep, true), 1_200).rotationAllowed, true);
});

test("returns only the public non-zero reveal entries, never counters", () => {
  const v = reputationView(snap(rep), 1_200);
  assert.deepEqual(v.reputation, { enabled: true, tiersEpoch: 2, nextStatus: "none", entries: [String((7n << 8n) | 2n), String(9n << 8n)] });
  assert.deepEqual(Object.keys(v.reputation).sort(), ["enabled", "entries", "nextStatus", "tiersEpoch"]);
});

test("next-epoch status: computing hides the stale list, ready shows it, failed resets", () => {
  const computing = reputationView(snap({ ...rep, busy: true, tiersEpoch: 3, tiersReady: false }), 1_400).reputation;
  assert.equal(computing.nextStatus, "computing");
  assert.equal(computing.tiersEpoch, null);
  assert.deepEqual(computing.entries, []);
  const ready = reputationView(snap({ ...rep, tiersEpoch: 3 }), 1_400).reputation;
  assert.equal(ready.nextStatus, "ready");
  assert.equal(ready.tiersEpoch, 3);
  const failed = reputationView(snap({ ...rep, tiersEpoch: 0, tiersReady: false }), 1_400).reputation;
  assert.equal(failed.nextStatus, "none");
  assert.equal(reputationView(snap(null), 1_400).reputation.enabled, false);
});

test("route: 503 without chain, 502 on read failure, JSON otherwise; no identity input", async () => {
  const none = new Hono();
  registerReputationRoutes(none, null);
  assert.equal((await none.request("/v1/reputation/epoch")).status, 503);
  const broken = new Hono();
  registerReputationRoutes(broken, async () => { throw new Error("rpc down"); });
  assert.equal((await broken.request("/v1/reputation/epoch")).status, 502);
  const ok = new Hono();
  registerReputationRoutes(ok, async () => snap(rep), () => 1_200);
  const r = await ok.request("/v1/reputation/epoch?commitment=123");
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.currentEpoch, 2);
  assert.equal(body.reputation.entries.length, 2);
});
