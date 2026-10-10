import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Identity } from "@semaphore-protocol/identity";
import { buildGroup, proveClaim, verifyInJs, fetchPinnedArtifacts, SEMAPHORE_ARTIFACTS_VERSION } from "./index.js";

// Reuses the tmp cache that @zk-kit/artifacts fills on the first Node proof (zk.test.ts).
const cache = join(tmpdir(), "snark-artifacts", "semaphore", SEMAPHORE_ARTIFACTS_VERSION);
const fileFetch = (async (url: string) => {
  const p = join(cache, url.split("/").pop()!);
  const data = await readFile(p);
  return new Response(data);
}) as unknown as typeof fetch;

test("pinned artifacts (bytes) produce a verifiable proof; tampered bytes are rejected", { skip: !existsSync(join(cache, "semaphore-20.zkey")) }, async () => {
  const art = await fetchPinnedArtifacts("https://example.invalid/semaphore", fileFetch);
  const ids = ["a", "b", "c"].map((s) => new Identity(`bisik-art-${s}`));
  const group = buildGroup(ids.map((i) => i.commitment));
  const claim = await proveClaim({ identity: ids[0], group, marketId: 1n, slot: 1, recipient: new Uint8Array(32).fill(1), artifacts: art });
  assert.ok(await verifyInJs(claim.semaphore));
  assert.equal(claim.solana.proof.length, 256);

  const badFetch = (async (url: string) => {
    const r = await fileFetch(url);
    const b = new Uint8Array(await r.arrayBuffer());
    b[b.length - 1] ^= 1;
    return new Response(b);
  }) as unknown as typeof fetch;
  await assert.rejects(fetchPinnedArtifacts("https://example.invalid/semaphore", badFetch), /sha256 mismatch/);
});

after(() => setTimeout(() => process.exit(0), 50));
