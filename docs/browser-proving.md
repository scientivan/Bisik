# Browser proving (task B4)

Status (10 Oct 2026): Semaphore v4 depth-20 stake and claim proofs (`proveStake`, `proveClaim` from `@bisik/zk`) are generated in headless Chrome 154 in about 0.6–0.8 s each. That is well under the 10 s target. The browser output is byte-identical in layout to the Node path and passes every offchain check we have (19/19, listed below). Safari has not been tested.

## Approach

- `@bisik/zk` and `@bisik/shared` were already browser-safe at the source level. They import only `@semaphore-protocol/*` (which has `browser` export conditions), `@noble/hashes`, and plain TS. No Node builtins end up in the Vite bundle, and Vite printed no "externalized for browser compatibility" warnings.
- New in `packages/zk/src/index.ts` (additive; existing calls are unchanged):
  - `ArtifactSource { wasm, zkey }` (URL string or bytes), plus an optional `artifacts` argument on `proveStake` / `proveClaim`.
  - `setDefaultArtifacts(src)`, to configure the artifacts once at app start.
  - `SEMAPHORE_ARTIFACTS_VERSION = "4.13.0"`, `SEMAPHORE_20_SHA256 = { wasm, zkey }`, `SEMAPHORE_ARTIFACTS_CDN`, `artifactsAt(baseUrl)`.
  - `fetchPinnedArtifacts(baseUrl, fetch?)` fetches both files and checks their sha256 with WebCrypto, so it runs in browsers and in Node 18+. It throws on a mismatch.
  - When no artifacts are passed, behaviour is unchanged: Semaphore's own resolver runs (Node: download plus a cache under `$TMPDIR/snark-artifacts`; browser: `snark-artifacts.pse.dev`, with no hash check).
- New test `packages/zk/src/artifacts.test.ts` covers two cases: pinned bytes produce a verifiable proof, and tampered bytes are rejected.
- `packages/zk/dist` was rebuilt (`tsc -p packages/zk`) so that Node consumers (server, scripts) see the new exports.

## Artifact hosting: decision

**Self-host** `semaphore-20.wasm` and `semaphore-20.zkey` at version 4.13.0 on the same origin, and verify their sha256 in the client before proving.

| File | Bytes | sha256 |
|---|---|---|
| `semaphore-20.wasm` | 1,847,949 | `6f71e55586929e520e76027ebe067daac8b41e2f4b8057313a5fd0304e1e44ee` |
| `semaphore-20.zkey` | 3,890,175 | `33f9a067a80c7daf90e085449073613a9559a1904dd40aeb6d603afb7988c2cc` |

Why self-host:

- The zkey has to match the VK compiled into the program (`contracts/programs/bisik/src/vk.rs` records the same zkey sha256).
- The CDN default is not hash-checked.
- A same-origin fetch is faster: about 0.1 s here, against roughly 4.3 s extra for the CDN on a cold cache (see the timings below).
- There is one less third-party dependency during the demo.

The CDN copy at `https://snark-artifacts.pse.dev/semaphore/4.13.0/` currently serves the same bytes, so it also works as a fallback, called as `fetchPinnedArtifacts(SEMAPHORE_ARTIFACTS_CDN)`.

`*.zkey` is gitignored at the repo root, so the files are not committed. `scripts/browser-proof/fetch-artifacts.mjs` copies them from the local `@zk-kit` tmp cache, or downloads them from the CDN when the cache is missing. It verifies both pins and writes them to `public/artifacts/semaphore/4.13.0/`. The frontend (G1/G4) needs the same step before `vite build`, for example as a `prebuild` script, so that Vercel builds include the files.

## Harness (`scripts/browser-proof/`, not the product frontend)

The harness is Vite 6.4.3 and plain TS. It aliases `@bisik/zk` and `@bisik/shared` to their TS sources, which proves the source itself is browser-safe. The page generates a fresh identity and a 6-member group, then runs `proveStake` (cold), `proveClaim`, and 3 warm `proveStake`. It then runs `verifyInJs` and prints the timings and the 256-byte Solana proof hex.

```bash
cd scripts/browser-proof
node fetch-artifacts.mjs && npx vite build
node run-headless.mjs [--artifacts=pinned|cdn] [--runs=3] [--throttle=4]   # system Chrome via playwright-core, channel "chrome"
npx tsx cross-check.ts results/browser-pinned.json                           # Node-side checks
npx tsx node-bench.ts 3                                                      # same workload in Node
```

`playwright-core` 1.60.0 drives the installed Google Chrome, so no browser was downloaded. Results are written to `results/*.json`, which is gitignored.

## Timings (MacBook, 8 logical cores, Chrome 154 headless, Node v24.10.0)

All values are in ms.

| Run | Artifact load | proveStake cold | proveClaim | proveStake warm ×3 | verify both |
|---|---|---|---|---|---|
| Browser, self-hosted pinned (run 1) | 122 | 838 | 777 | 717 / 643 / 610 | 23 |
| Browser, self-hosted pinned (run 2) | 113 | 715 | 564 | 551 / 559 / 548 | 22 |
| Browser, self-hosted pinned (run 3) | 89 | 728 | 574 | 582 / 600 / 548 | 23 |
| Browser, CDN default, cold HTTP cache | (inside cold) | 4,984 | 553 | 583 / 524 / 522 | 22 |
| Browser, CDN default, warm HTTP cache | (inside cold) | 1,806 | 580 | 538 / 571 / 600 | 20 |
| Browser, pinned, CDP CPU throttle ×4 | 156 | 1,192 | 992 | 871 / 850 / 867 | 73 |
| Browser, pinned, CDP CPU throttle ×6 | 125 | 1,605 | 1,044 | 1,126 / 1,073 / 1,024 | 94 |
| Node, bytes from disk (run 1) | n/a | 1,029 | 681 | 565 / 565 / 701 | n/a |
| Node, bytes from disk (run 2) | n/a | 886 | 726 | 644 / 748 / 608 | n/a |

Browser proving runs at roughly Node speed (about 0.55–0.85 s per proof). The JS bundle that contains snarkjs, the ethers hashing helpers and Semaphore weighs 461 kB (140 kB gzip). The artifacts add 5.7 MB, which is fetched once per page load.

## Cross-check (Node, `cross-check.ts`): 19/19 PASS

The checks pass for the pinned, CDN and throttled-×4 results:

- The zkey on disk matches the pin, and `vk.rs` records the same zkey sha256.
- For stake and for claim:
  - Node `verifyInJs` accepts the browser proof.
  - Node `toSolanaProof` reproduces the browser's 256 bytes exactly.
  - `message` equals the recomputed `stakeMessage(payload)` or `claimMessage(recipient)`.
  - `scope` equals `(market_id << 8) | slot`.
  - `root` equals the Node group root over the same leaves.
  - `publicInputs` equals `[root, nullifier, fieldHash(message), fieldHash(scope)]` (tracker 6.4).
  - The 256-byte layout, decoded back (−A, B with c1‖c0 swapped, C), together with those 4 public inputs verifies under the VK exported from the pinned zkey. A tampered `fieldHash(message)` is rejected.
- Stake and claim share the same nullifier.

## Caveats for the frontend (G4/G8)

- **Not run through the onchain verifier.** The checks use snarkjs with the VK exported from the same zkey. They do not use `groth16-solana` or the program. The bytes are identical in layout to what Node `toSolanaProof` produces, and `contracts/tests/e2e.ts` and `scripts/seed-demo.ts` already submit that layout onchain. So it is expected to pass. Confirm with one devnet `stake` built from a browser proof.
- **Safari/WebKit has not been tested.** Only Chromium was installed, and no WebKit download was made because disk space is limited. The < 10 s criterion mentions Safari, so test it manually once the frontend is up.
- **The CPU-throttle rows are not a low-end-device benchmark.** CDP throttling slows the main thread. snarkjs proves in Web Workers, which are probably not throttled to the same degree. Real phones should be measured on a device.
- **Memory.** The zkey and wasm (5.7 MB) are held as bytes. Call `setDefaultArtifacts` once and reuse it, instead of refetching per proof.
- **Threads.** The page is not `crossOriginIsolated`. snarkjs still used worker threads (`hardwareConcurrency` 8), and SharedArrayBuffer is not required. COOP/COEP headers are not needed.
- **Main thread.** `generateProof` keeps the main thread busy for part of the work (witness calculation). Show a spinner. A dedicated Worker is optional, since one proof takes about 0.7 s here.
- **Identity storage.** The identity secret stays in `localStorage` (tracker 6.4). The harness creates a throwaway identity and stores nothing.
- **Artifacts in the frontend build.** Add the `fetch-artifacts` step (or equivalent) before `vite build`, and serve the files with long cache headers. Their content is immutable for 4.13.0.
- **Lockfile.** Adding this harness package to the workspace made `pnpm install` add Vite, Rollup and esbuild. It also re-resolved a few peer-dependency suffixes (it dropped `utf-8-validate` from some `@solana`/`@arcium-hq` variant keys). The server, keeper and scripts still typecheck.
