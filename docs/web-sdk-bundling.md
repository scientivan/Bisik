# Using `@bisik/sdk` in the web app (Vite)

`@bisik/sdk` is shared by the server, the keeper, the scripts and the web app. Since 11 Oct 2026 the SDK itself no longer uses Node-only APIs: the Anchor IDL is loaded with `import IDL_JSON from "./idl/bisik.json" with { type: "json" }` instead of `createRequire` from `node:module` (`packages/sdk/src/index.ts`).

Its dependencies still need help in the browser:

| Dependency | Problem | Fix |
|---|---|---|
| `@arcium-hq/client` 0.15.0 | Imports `randomBytes` and `createHash` from Node `crypto`; `createCipheriv` (AES-CTR) and `sha3-256` are used only by its `AesCipher`, which Bisik does not use | Polyfill `crypto` with `crypto-browserify` |
| `@arcium-hq/client` 0.15.0 | Imports `fs` for `ArcisModule.loadFromFile` only | Alias `fs` to `packages/sdk/browser/empty-fs.js` |
| `@arcium-hq/client` 0.15.0 | `import anchor from "@anchor-lang/core"`, but Anchor's browser build has no default export | Alias the exact specifier `@anchor-lang/core` to `packages/sdk/browser/anchor-default-shim.js` |
| `@solana/web3.js`, Anchor, the SDK | Use the global `Buffer` (and some code reads `process`, `global`) | Inject `Buffer` and `process`, define `global` as `globalThis` |

## Verified

On 11 Oct 2026, `packages/sdk/dist/index.js` was bundled with esbuild for `platform: "browser"` using exactly the shims above (3.4 MB, unminified). The bundle was then loaded in Chrome. These calls worked:

- `PROGRAM_ID` (`aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD`);
- `pdas()`;
- `newViewKey()` (32-byte x25519 public key);
- `encryptStakeSecrets()` (Rescue cipher over an x25519 shared secret);
- `randomOffset()`.

The implemented configuration is `apps/web/vite.config.ts`. Use it as the authoritative recipe. It aliases the exact Anchor and fs specifiers, resolves plugin shim paths absolutely for pnpm, and polyfills crypto, stream, util, events and vm. `vm-browserify` currently emits a build warning about its dependency's `eval`; no app code uses that API.

Vite development and production need different global initialization. Plugin globals use `build` only; `src/polyfills.ts` is the first app import and installs Buffer, process and global for development. Injecting the plugin's Buffer banner into dev imports caused a circular initialization error. PDA u64 seeds are encoded as two unsigned 32-bit words, because the browser Buffer shim does not implement Node's `writeBigUInt64LE`.

The ZK chunk loads on demand. `prebuild` fetches the pinned Semaphore 4.13.0 wasm and zkey, checks their SHA-256 hashes, and includes them under `/artifacts/semaphore/4.13.0`. Artifact fetch failures are retryable in the app.

The alias for `@anchor-lang/core` must match the exact specifier (the regex `^…$`). The shim itself imports `@anchor-lang/core/dist/browser/index.js`, and a prefix alias would loop.

Only `VITE_`-prefixed variables may be read in the web app. The SDK takes the RPC URL and program ID as arguments, so it never reads `process.env` in the browser.
