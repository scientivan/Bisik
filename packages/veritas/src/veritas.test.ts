import { test } from "node:test";
import assert from "node:assert/strict";
import { Veritas, drs, sybilHints, styleSignal } from "./index.js";

const A = "Team Lumen shipped a working perp DEX prototype on devnet in two weeks, their lead previously maintained an audited AMM, and they have not committed to any chain yet according to their public posts.";
const B = "Completely different: Team Garuda is building a consumer wallet for remittances in Indonesia with a waitlist of merchants and a payments license application in progress.";

test("drs is noisy-OR", () => {
  assert.equal(drs(0, 0), 0);
  assert.equal(drs(1, 0.3), 1);
  assert.ok(Math.abs(drs(0.5, 0.5) - 0.75) < 1e-9);
});

test("offline: copy-paste gets high D, different text low D, AI unavailable flagged", async () => {
  const v = new Veritas(null);
  const corpus = [{ id: "r1", text: A }];
  const dup = await v.analyze(A + " Strongly recommended.", corpus);
  const diff = await v.analyze(B, corpus);
  assert.ok(dup.D >= 0.8, `dup D=${dup.D}`);
  assert.ok(diff.D < 0.4, `diff D=${diff.D}`);
  assert.ok(dup.flags.includes("likely_duplicate"));
  assert.ok(diff.flags.includes("ai_unavailable"));
  assert.equal(diff.A, null);
});

test("offline privacy scrub removes handles, emails, profile links", async () => {
  const v = new Veritas(null);
  const r = await v.privacyFilter("I'm @dien_scout (dien@example.com, https://x.com/dien) and I mentored them.");
  assert.ok(!r.filtered.includes("@dien_scout") && !r.filtered.includes("example.com") && !r.filtered.includes("x.com"));
  assert.equal(r.removed.length, 3);
});

test("sybil hints cluster near-identical reasons", () => {
  const g = sybilHints([{ id: "1", text: A }, { id: "2", text: A + " yes" }, { id: "3", text: B }]);
  assert.deepEqual(g, [["1", "2"]]);
});

test("style signal is bounded", () => {
  const s = styleSignal("Furthermore, it is worth noting the landscape. In conclusion, this is robust and scalable. Delve deeper.");
  assert.ok(s >= 0 && s <= 1);
});
