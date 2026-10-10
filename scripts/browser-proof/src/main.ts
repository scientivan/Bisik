import {
  createIdentity,
  buildGroup,
  proveStake,
  proveClaim,
  verifyInJs,
  fetchPinnedArtifacts,
  SEMAPHORE_ARTIFACTS_VERSION,
  type ArtifactSource,
} from "@bisik/zk";
import { keccak, utf8, toHex } from "@bisik/shared";
import { Identity } from "@semaphore-protocol/identity";

const logEl = document.getElementById("log")!;
const lines: string[] = [];
const log = (s: string) => {
  lines.push(s);
  logEl.textContent = lines.join("\n");
  console.log(s);
};
const now = () => performance.now();
const ms = (t0: number) => Math.round(now() - t0);

declare global {
  interface Window {
    __B4__?: unknown;
  }
}

async function run() {
  const mode = new URLSearchParams(location.search).get("artifacts") ?? "pinned"; // pinned | cdn
  const warmRuns = Number(new URLSearchParams(location.search).get("runs") ?? 3);
  const timings: Record<string, number | number[]> = {};
  log(`userAgent: ${navigator.userAgent}`);
  log(`hardwareConcurrency: ${navigator.hardwareConcurrency}, crossOriginIsolated: ${self.crossOriginIsolated}`);

  let artifacts: ArtifactSource | undefined;
  if (mode === "pinned") {
    const t = now();
    artifacts = await fetchPinnedArtifacts(`${location.origin}/artifacts/semaphore/${SEMAPHORE_ARTIFACTS_VERSION}`);
    timings.artifactFetchAndHashMs = ms(t);
    log(`artifacts: self-hosted, sha256-pinned (${artifacts.wasm.length} + ${artifacts.zkey.length} bytes) in ${timings.artifactFetchAndHashMs} ms`);
  } else {
    log("artifacts: Semaphore default (snark-artifacts.pse.dev, not hash-checked)");
  }

  // Identity + group (k = 6 members; the scout is one of them).
  let t = now();
  const me = createIdentity();
  const others = Array.from({ length: 5 }, (_, i) => new Identity(`b4-member-${i}`));
  const leaves = [...others.map((o) => o.commitment), me.commitment];
  const group = buildGroup(leaves);
  timings.identityAndGroupMs = ms(t);

  const payload = {
    marketId: 7n,
    slot: 2,
    amount: 25_000_000n,
    encOptionHash: keccak(utf8("opt")),
    reasonHash: keccak(utf8("reason")),
    creditHash: keccak(utf8("credit")),
  };
  const recipient = new Uint8Array(32).fill(9);

  t = now();
  const stake = await proveStake({ identity: me, group, payload, artifacts });
  timings.stakeProofColdMs = ms(t);
  log(`proveStake (cold): ${timings.stakeProofColdMs} ms`);

  t = now();
  const claim = await proveClaim({ identity: me, group, marketId: 7n, slot: 2, recipient, artifacts });
  timings.claimProofMs = ms(t);
  log(`proveClaim: ${timings.claimProofMs} ms`);

  const warm: number[] = [];
  for (let i = 0; i < warmRuns; i++) {
    t = now();
    await proveStake({ identity: me, group, payload, artifacts });
    warm.push(ms(t));
  }
  timings.stakeProofWarmMs = warm;
  log(`proveStake warm x${warmRuns}: ${warm.join(", ")} ms`);

  t = now();
  const okStake = await verifyInJs(stake.semaphore);
  const okClaim = await verifyInJs(claim.semaphore);
  timings.verifyBothMs = ms(t);
  const sameNullifier = toHex(stake.solana.nullifier) === toHex(claim.solana.nullifier);
  log(`verifyInJs stake=${okStake} claim=${okClaim} (${timings.verifyBothMs} ms); same nullifier=${sameNullifier}`);
  log(`stake solana proof (${stake.solana.proof.length} bytes): ${toHex(stake.solana.proof)}`);
  log(`claim solana proof (${claim.solana.proof.length} bytes): ${toHex(claim.solana.proof)}`);
  log(`stake publicInputs: ${stake.solana.publicInputs.map(toHex).join(" ")}`);

  const enc = (s: typeof stake) => ({
    semaphore: s.semaphore,
    proofHex: toHex(s.solana.proof),
    rootHex: toHex(s.solana.root),
    nullifierHex: toHex(s.solana.nullifier),
    message: s.solana.message.toString(),
    scope: s.solana.scope.toString(),
    publicInputsHex: s.solana.publicInputs.map(toHex),
  });
  window.__B4__ = {
    ok: okStake && okClaim && sameNullifier,
    mode,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    timings,
    leaves: leaves.map(String),
    payload: { ...payload, marketId: "7", amount: payload.amount.toString(), encOptionHash: toHex(payload.encOptionHash), reasonHash: toHex(payload.reasonHash), creditHash: toHex(payload.creditHash) },
    recipientHex: toHex(recipient),
    stake: enc(stake),
    claim: enc(claim),
  };
  log("DONE");
}

run().catch((e) => {
  log(`ERROR: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  window.__B4__ = { ok: false, error: String(e) };
});
