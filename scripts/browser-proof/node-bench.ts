// Same workload as the browser page, in Node, for a like-for-like timing comparison.
// Usage: npx tsx node-bench.ts [runs=3]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createIdentity, buildGroup, proveStake, proveClaim, verifyInJs } from "@bisik/zk";
import { keccak, utf8 } from "@bisik/shared";
import { Identity } from "@semaphore-protocol/identity";

const runs = Number(process.argv[2] ?? 3);
const dir = join(import.meta.dirname, "public", "artifacts", "semaphore", "4.13.0");
const artifacts = { wasm: new Uint8Array(readFileSync(join(dir, "semaphore-20.wasm"))), zkey: new Uint8Array(readFileSync(join(dir, "semaphore-20.zkey"))) };
const me = createIdentity();
const group = buildGroup([...Array.from({ length: 5 }, (_, i) => new Identity(`b4-member-${i}`).commitment), me.commitment]);
const payload = { marketId: 7n, slot: 2, amount: 25_000_000n, encOptionHash: keccak(utf8("opt")), reasonHash: keccak(utf8("reason")), creditHash: keccak(utf8("credit")) };
const t = () => performance.now();
let t0 = t();
const stake = await proveStake({ identity: me, group, payload, artifacts });
const cold = Math.round(t() - t0);
t0 = t();
const claim = await proveClaim({ identity: me, group, marketId: 7n, slot: 2, recipient: new Uint8Array(32).fill(9), artifacts });
const claimMs = Math.round(t() - t0);
const warm: number[] = [];
for (let i = 0; i < runs; i++) {
  t0 = t();
  await proveStake({ identity: me, group, payload, artifacts });
  warm.push(Math.round(t() - t0));
}
const ok = (await verifyInJs(stake.semaphore)) && (await verifyInJs(claim.semaphore));
console.log(JSON.stringify({ node: process.version, ok, stakeProofColdMs: cold, claimProofMs: claimMs, stakeProofWarmMs: warm }));
setTimeout(() => process.exit(0), 50);
