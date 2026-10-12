import { test } from "node:test";
import assert from "node:assert/strict";
import { repTag } from "@bisik/sdk";
import { scoutReputation, type ReputationEpochView } from "./reputation";

const me = 0x1234_5678_9abc_def0_1122n;
const other = 0x9999_0000_1111_2222_3333n;
const view = (r: Partial<ReputationEpochView["reputation"]>, currentEpoch = 4): ReputationEpochView => ({
  currentEpoch,
  epochStart: 100,
  epochLen: 50,
  epochEnd: 150,
  secondsLeft: 10,
  rotationAllowed: false,
  demoMode: true,
  reputation: { enabled: true, tiersEpoch: null, nextStatus: "none", entries: [], ...r },
});
const entries = [String(repTag(other) | 0n), String(repTag(me) | 2n)];

test("next-epoch level is decoded locally and applied to the imported tier", () => {
  const s = scoutReputation(view({ tiersEpoch: 5, nextStatus: "ready", entries }), { commitment: me.toString(), tier: 0, epoch: 1 });
  assert.equal(s.next.status, "ready");
  assert.deepEqual(s.next.revealed, { epoch: 5, level: 2, levelName: "up", credited: true, tier: 1, tierName: "Silver" });
  assert.equal(s.current.revealed, null);
  assert.equal(s.current.source, "onboarding");
});

test("uncredited scouts stay unchanged; tier clamps; unknown imported tier stays null", () => {
  const v = view({ tiersEpoch: 5, nextStatus: "ready", entries: [String(repTag(other) | 3n)] });
  assert.deepEqual(scoutReputation(v, { commitment: me.toString(), tier: 2 }).next.revealed, { epoch: 5, level: 1, levelName: "unchanged", credited: false, tier: 2, tierName: "Gold" });
  assert.equal(scoutReputation(v, { commitment: other.toString(), tier: 2 }).next.revealed?.tier, 2);
  assert.equal(scoutReputation(v, { commitment: me.toString() }).next.revealed?.tier, null);
});

test("computing or absent reveal shows no level; disabled deployments say so", () => {
  assert.equal(scoutReputation(view({ nextStatus: "computing" }), { commitment: me.toString(), tier: 1 }).next.revealed, null);
  assert.equal(scoutReputation(view({ enabled: false }), { commitment: me.toString(), tier: 1 }).next.status, "disabled");
});

test("current tier comes from the published group of the current epoch when present", () => {
  const s = scoutReputation(view({ tiersEpoch: 4, entries }), { commitment: me.toString(), tier: 0, epoch: 1 }, { 0: [other.toString()], 2: [me.toString()] });
  assert.equal(s.current.source, "group");
  assert.equal(s.current.tier, 2);
  assert.equal(s.current.epoch, 4);
  // a reveal made for the now-current epoch is surfaced as current, not next
  assert.equal(s.current.revealed?.levelName, "up");
  assert.equal(s.next.revealed, null);
});
