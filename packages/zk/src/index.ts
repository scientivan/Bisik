import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof, verifyProof, unpackGroth16Proof } from "@semaphore-protocol/proof";

export type SemaphoreProof = Awaited<ReturnType<typeof generateProof>>;
import { be32, fieldHash, stakeScope, stakeMessage, claimMessage, SEMAPHORE_DEPTH, type StakePayload } from "@bisik/shared";

export { Identity, Group };

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
}): Promise<{ semaphore: SemaphoreProof; solana: SolanaProof }> {
  const scope = stakeScope(args.payload.marketId, args.payload.slot);
  const message = stakeMessage(args.payload);
  const semaphore = await generateProof(args.identity, args.group, message, scope, SEMAPHORE_DEPTH);
  return { semaphore, solana: toSolanaProof(semaphore) };
}

export async function proveClaim(args: {
  identity: Identity;
  group: Group;
  marketId: bigint;
  slot: number;
  recipient: Uint8Array;
}): Promise<{ semaphore: SemaphoreProof; solana: SolanaProof }> {
  const scope = stakeScope(args.marketId, args.slot);
  const message = claimMessage(args.recipient);
  const semaphore = await generateProof(args.identity, args.group, message, scope, SEMAPHORE_DEPTH);
  return { semaphore, solana: toSolanaProof(semaphore) };
}

export async function verifyInJs(proof: SemaphoreProof): Promise<boolean> {
  return verifyProof(proof);
}
