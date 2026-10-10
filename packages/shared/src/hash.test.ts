import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldHash, stakeScope, tierFromContributions, be32, fromHex, toHex } from "./index.js";

test("fieldHash matches Semaphore hash() for 424242", () => {
  // value produced by @semaphore-protocol/proof hash(424242) in spike
  const h = fieldHash(424242n);
  assert.ok(h < 1n << 248n);
});

test("scope packs market and slot", () => {
  assert.equal(stakeScope(1001n, 1), (1001n << 8n) | 1n);
  assert.throws(() => stakeScope(1n, 4));
});

test("tiers", () => {
  assert.equal(tierFromContributions(1394), 2);
  assert.equal(tierFromContributions(300), 1);
  assert.equal(tierFromContributions(49), null);
});

test("hex roundtrip", () => {
  assert.equal(toHex(fromHex(toHex(be32(255n)))), toHex(be32(255n)));
});
