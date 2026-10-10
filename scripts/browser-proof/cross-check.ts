// Cross-check a browser result in Node: verifyInJs, re-derive the Solana layout, recompute the public inputs
// from the payload exactly as the program does (tracker 6.4), and verify the 256-byte layout itself against the
// VK exported from the pinned zkey. Usage: npx tsx cross-check.ts [results/browser-pinned.json]
import { readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
// @ts-expect-error snarkjs ships no types here
import * as snarkjs from "snarkjs";
import { buildGroup, verifyInJs, toSolanaProof, SEMAPHORE_20_SHA256 } from "@bisik/zk";
import { be32, fieldHash, stakeMessage, claimMessage, stakeScope, fromHex, toHex, bytesToBigInt } from "@bisik/shared";

const P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const file = process.argv[2] ?? join(import.meta.dirname, "results", "browser-pinned.json");
const r = JSON.parse(readFileSync(file, "utf8"));
const checks: [string, boolean][] = [];
const check = (name: string, ok: boolean) => {
  checks.push([name, ok]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

const zkeyPath = join(import.meta.dirname, "public", "artifacts", "semaphore", "4.13.0", "semaphore-20.zkey");
const zkeyBytes = readFileSync(zkeyPath);
check("zkey on disk matches pinned sha256", createHash("sha256").update(zkeyBytes).digest("hex") === SEMAPHORE_20_SHA256.zkey);
const vkRs = join(import.meta.dirname, "..", "..", "contracts", "programs", "bisik", "src", "vk.rs");
if (existsSync(vkRs)) check("contracts vk.rs was generated from the same zkey", readFileSync(vkRs, "utf8").includes(SEMAPHORE_20_SHA256.zkey));
const vk = await snarkjs.zKey.exportVerificationKey(new Uint8Array(zkeyBytes));

const group = buildGroup(r.leaves);
const pl = r.payload;
const payload = {
  marketId: BigInt(pl.marketId),
  slot: pl.slot,
  amount: BigInt(pl.amount),
  encOptionHash: fromHex(pl.encOptionHash),
  reasonHash: fromHex(pl.reasonHash),
  creditHash: fromHex(pl.creditHash),
};
const scope = stakeScope(payload.marketId, payload.slot);

// Rebuild snarkjs proof from the 256-byte groth16-solana layout: -A ‖ B(c1,c0 swapped) ‖ C.
function fromSolanaLayout(bytes: Uint8Array) {
  const w = (i: number) => bytesToBigInt(bytes.slice(i * 32, i * 32 + 32)).toString();
  const ay = bytesToBigInt(bytes.slice(32, 64));
  return {
    pi_a: [w(0), ((P - ay) % P).toString(), "1"],
    pi_b: [[w(3), w(2)], [w(5), w(4)], ["1", "0"]],
    pi_c: [w(6), w(7), "1"],
    protocol: "groth16",
    curve: "bn128",
  };
}

for (const kind of ["stake", "claim"] as const) {
  const s = r[kind];
  check(`${kind}: verifyInJs (Node) accepts the browser proof`, await verifyInJs(s.semaphore));
  const sol = toSolanaProof(s.semaphore);
  check(`${kind}: Node toSolanaProof bytes == browser bytes`, toHex(sol.proof) === s.proofHex && s.proofHex.length === 2 + 512);
  const expectMsg = kind === "stake" ? stakeMessage(payload) : claimMessage(fromHex(r.recipientHex));
  check(`${kind}: message == recomputed ${kind === "stake" ? "stakeMessage(payload)" : "claimMessage(recipient)"}`, BigInt(s.message) === expectMsg);
  check(`${kind}: scope == (market_id << 8) | slot`, BigInt(s.scope) === scope);
  check(`${kind}: root == Node group root over the same leaves`, BigInt(s.semaphore.merkleTreeRoot) === group.root);
  const expectPI = [be32(group.root), be32(BigInt(s.semaphore.nullifier)), be32(fieldHash(expectMsg)), be32(fieldHash(scope))].map(toHex);
  check(`${kind}: publicInputs == [root, nullifier, fieldHash(message), fieldHash(scope)]`, JSON.stringify(expectPI) === JSON.stringify(s.publicInputsHex));
  const pub = s.publicInputsHex.map((h: string) => bytesToBigInt(fromHex(h)).toString());
  check(`${kind}: 256-byte Solana layout + public inputs verify under VK(pinned zkey)`, await snarkjs.groth16.verify(vk, pub, fromSolanaLayout(fromHex(s.proofHex))));
  const tampered = [...pub];
  tampered[2] = (BigInt(pub[2]) + 1n).toString();
  check(`${kind}: tampered fieldHash(message) is rejected`, !(await snarkjs.groth16.verify(vk, tampered, fromSolanaLayout(fromHex(s.proofHex)))));
}
check("stake and claim share the nullifier", r.stake.nullifierHex === r.claim.nullifierHex);

const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
setTimeout(() => process.exit(failed ? 1 : 0), 50);
