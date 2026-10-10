// Materialize semaphore-20.{wasm,zkey} @ 4.13.0 into public/artifacts/semaphore/4.13.0/ (self-hosted, same origin).
// Source order: local @zk-kit tmp cache (filled by `packages/zk` tests), else https://snark-artifacts.pse.dev.
// Every file is checked against the sha256 pins below (zkey pin = the one the onchain VK was generated from).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "4.13.0";
const PINS = {
  "semaphore-20.wasm": "6f71e55586929e520e76027ebe067daac8b41e2f4b8057313a5fd0304e1e44ee",
  "semaphore-20.zkey": "33f9a067a80c7daf90e085449073613a9559a1904dd40aeb6d603afb7988c2cc",
};
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "public", "artifacts", "semaphore", VERSION);
const cacheDir = join(tmpdir(), "snark-artifacts", "semaphore", VERSION);
mkdirSync(outDir, { recursive: true });

const sha = (b) => createHash("sha256").update(b).digest("hex");
for (const [name, pin] of Object.entries(PINS)) {
  const out = join(outDir, name);
  if (existsSync(out) && sha(readFileSync(out)) === pin) {
    console.log(`ok   ${name} (already present)`);
    continue;
  }
  let bytes;
  const cached = join(cacheDir, name);
  if (existsSync(cached)) {
    bytes = readFileSync(cached);
  } else {
    const url = `https://snark-artifacts.pse.dev/semaphore/${VERSION}/${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  const h = sha(bytes);
  if (h !== pin) throw new Error(`${name}: sha256 ${h} != pinned ${pin}`);
  writeFileSync(out, bytes);
  console.log(`ok   ${name} ${bytes.length} bytes sha256 ${h.slice(0, 16)}…`);
}
