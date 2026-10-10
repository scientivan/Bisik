import { test } from "node:test";
import assert from "node:assert/strict";
import { Identity } from "@semaphore-protocol/identity";
import { buildGroup, proveStake, proveClaim, verifyInJs } from "./index.js";
import { keccak, utf8 } from "@bisik/shared";

test("stake and claim proofs share a nullifier and verify", async () => {
  const ids = ["a", "b", "c", "d", "e"].map((s) => new Identity(`bisik-test-${s}`));
  const group = buildGroup(ids.map((i) => i.commitment));
  const payload = {
    marketId: 7n,
    slot: 2,
    amount: 25_000_000n,
    encOptionHash: keccak(utf8("opt")),
    reasonHash: keccak(utf8("reason")),
    creditHash: keccak(utf8("credit")),
  };
  const stake = await proveStake({ identity: ids[1], group, payload });
  assert.ok(await verifyInJs(stake.semaphore));
  assert.equal(stake.solana.proof.length, 256);
  const claim = await proveClaim({ identity: ids[1], group, marketId: 7n, slot: 2, recipient: new Uint8Array(32).fill(9) });
  assert.ok(await verifyInJs(claim.semaphore));
  assert.deepEqual(claim.solana.nullifier, stake.solana.nullifier);
  process.exitCode = 0;
});

// snarkjs keeps worker threads alive; end the process once tests are done.
import { after } from "node:test";
after(() => setTimeout(() => process.exit(0), 50));
