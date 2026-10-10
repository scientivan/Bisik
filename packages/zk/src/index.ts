import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof, verifyProof, unpackGroth16Proof } from "@semaphore-protocol/proof";

export type SemaphoreProof = Awaited<ReturnType<typeof generateProof>>;
import { be32, fieldHash, stakeScope, stakeMessage, claimMessage, SEMAPHORE_DEPTH, type StakePayload } from "@bisik/shared";

export { Identity, Group };

/**
 * Snark artifacts for the depth-20 Semaphore circuit. Each field is a URL/path (snarkjs fetches it in the
 * browser, reads it from disk in Node) or the raw bytes. Omit to use Semaphore's default resolver
 * (Node: download + tmp cache; browser: https://snark-artifacts.pse.dev, unpinned by hash).
 */
export interface ArtifactSource {
  wasm: string | Uint8Array;
  zkey: string | Uint8Array;
}

/** snark-artifacts version used by @semaphore-protocol/proof 4.14.3 and by the onchain VK (scripts/gen-vk.mjs). */
export const SEMAPHORE_ARTIFACTS_VERSION = "4.13.0";
/** sha256 pins of semaphore-20.{wasm,zkey} @ 4.13.0. The zkey pin must match contracts/programs/bisik/src/vk.rs. */
export const SEMAPHORE_20_SHA256 = {
  wasm: "6f71e55586929e520e76027ebe067daac8b41e2f4b8057313a5fd0304e1e44ee",
  zkey: "33f9a067a80c7daf90e085449073613a9559a1904dd40aeb6d603afb7988c2cc",
} as const;
export const SEMAPHORE_ARTIFACTS_CDN = `https://snark-artifacts.pse.dev/semaphore/${SEMAPHORE_ARTIFACTS_VERSION}`;

/** URLs of semaphore-20.{wasm,zkey} under `baseUrl` (no trailing slash needed). */
export function artifactsAt(baseUrl: string): { wasm: string; zkey: string } {
  const b = baseUrl.replace(/\/+$/, "");
  return { wasm: `${b}/semaphore-20.wasm`, zkey: `${b}/semaphore-20.zkey` };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(d), (v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * Fetch semaphore-20.{wasm,zkey} from `baseUrl` and check them against SEMAPHORE_20_SHA256.
 * Works in browsers and Node >= 18 (fetch + WebCrypto). Throws on any hash mismatch.
 */
export async function fetchPinnedArtifacts(
  baseUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<{ wasm: Uint8Array; zkey: Uint8Array }> {
  const urls = artifactsAt(baseUrl);
  const get = async (k: "wasm" | "zkey") => {
    const res = await fetchImpl(urls[k]);
    if (!res.ok) throw new Error(`fetch ${urls[k]}: HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const h = await sha256Hex(bytes);
    if (h !== SEMAPHORE_20_SHA256[k]) throw new Error(`semaphore-20.${k} sha256 mismatch: got ${h}`);
    return bytes;
  };
  const [wasm, zkey] = await Promise.all([get("wasm"), get("zkey")]);
  return { wasm, zkey };
}

let defaultArtifacts: ArtifactSource | undefined;
/** Set the artifacts used when proveStake/proveClaim get no `artifacts` argument (e.g. once at app start). */
export function setDefaultArtifacts(a: ArtifactSource | undefined): void {
  defaultArtifacts = a;
}

type GenArtifacts = Parameters<typeof generateProof>[5];
const artifactsArg = (a?: ArtifactSource): GenArtifacts => (a ?? defaultArtifacts) as unknown as GenArtifacts;

/** BN254 base field modulus. */
const P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

export function createIdentity(): Identity {
  return new Identity();
}

/** Serialized private key (base64). Keep secret; store client-side only. */
export function exportIdentity(id: Identity): string {
  return id.export();
}

export function importIdentity(secret: string): Identity {
  return Identity.import(secret);
}

export function buildGroup(leaves: (bigint | string)[]): Group {
  return new Group(leaves.map((l) => BigInt(l)));
}

export interface SolanaProof {
  /** proof_a (negated) ‖ proof_b ‖ proof_c = 256 bytes */
  proof: Uint8Array;
  root: Uint8Array;
  nullifier: Uint8Array;
  /** raw message / scope (program hashes them) */
  message: bigint;
  scope: bigint;
  /** the four public inputs exactly as the verifier sees them */
  publicInputs: [Uint8Array, Uint8Array, Uint8Array, Uint8Array];
}

const g1 = (p: [string, string] | string[]) => [...be32(BigInt(p[0])), ...be32(BigInt(p[1]))];
const g1neg = (p: [string, string] | string[]) => [...be32(BigInt(p[0])), ...be32((P - BigInt(p[1])) % P)];
// snarkjs G2 = [[x.c0, x.c1],[y.c0, y.c1]] -> groth16-solana wants x.c1‖x.c0‖y.c1‖y.c0
const g2 = (p: string[][]) => [
  ...be32(BigInt(p[0][1])),
  ...be32(BigInt(p[0][0])),
  ...be32(BigInt(p[1][1])),
  ...be32(BigInt(p[1][0])),
];

/** Convert a Semaphore v4 proof into the byte layout consumed by the Bisik program (groth16-solana). */
export function toSolanaProof(proof: SemaphoreProof): SolanaProof {
  const pr = unpackGroth16Proof(proof.points);
  const bytes = new Uint8Array([...g1neg(pr.pi_a as string[]), ...g2(pr.pi_b as string[][]), ...g1(pr.pi_c as string[])]);
  const root = be32(BigInt(proof.merkleTreeRoot));
  const nullifier = be32(BigInt(proof.nullifier));
  const message = BigInt(proof.message);
  const scope = BigInt(proof.scope);
  return {
    proof: bytes,
    root,
    nullifier,
    message,
    scope,
    publicInputs: [root, nullifier, be32(fieldHash(message)), be32(fieldHash(scope))],
  };
}

export async function proveStake(args: {
  identity: Identity;
  group: Group;
  payload: StakePayload;
  artifacts?: ArtifactSource;
}): Promise<{ semaphore: SemaphoreProof; solana: SolanaProof }> {
  const scope = stakeScope(args.payload.marketId, args.payload.slot);
  const message = stakeMessage(args.payload);
  const semaphore = await generateProof(args.identity, args.group, message, scope, SEMAPHORE_DEPTH, artifactsArg(args.artifacts));
  return { semaphore, solana: toSolanaProof(semaphore) };
}

export async function proveClaim(args: {
  identity: Identity;
  group: Group;
  marketId: bigint;
  slot: number;
  recipient: Uint8Array;
  artifacts?: ArtifactSource;
}): Promise<{ semaphore: SemaphoreProof; solana: SolanaProof }> {
  const scope = stakeScope(args.marketId, args.slot);
  const message = claimMessage(args.recipient);
  const semaphore = await generateProof(args.identity, args.group, message, scope, SEMAPHORE_DEPTH, artifactsArg(args.artifacts));
  return { semaphore, solana: toSolanaProof(semaphore) };
}

export async function verifyInJs(proof: SemaphoreProof): Promise<boolean> {
  return verifyProof(proof);
}
