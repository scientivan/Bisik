/**
 * @bisik/sdk — typed helpers around the `bisik` Anchor program (task-tracker 6.7).
 * Used by apps/server, services/keeper, scripts and the web app.
 */
import * as anchorNs from "@anchor-lang/core";
import { PublicKey, Connection, Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
  getCompDefAccOffset,
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  awaitComputationFinalization,
  getMXEPublicKey,
  RescueCipher,
  deserializeLE,
  x25519,
} from "@arcium-hq/client";
import { createRequire } from "node:module";

const anchor: typeof anchorNs = ((anchorNs as any).default ?? anchorNs) as typeof anchorNs;
export { anchor };
const require = createRequire(import.meta.url);
export const IDL = require("./idl/bisik.json");
export const PROGRAM_ID = new PublicKey(IDL.address);

export const Status = { Open: 0, Closed: 1, Auction: 2, Allocated: 3, Outcome: 4, Settling: 5, Settled: 6 } as const;
export const STATUS_NAMES = ["Open", "Closed", "Auction", "Allocated", "OutcomeWindow", "Settling", "Settled"];
export const Kind = { Exclusive: 0, Auction: 1 } as const;
export const CIRCUITS = ["init_market_agg", "allocate", "preview", "init_auction", "place_bid", "resolve_auction", "winning_weights", "position_hits"] as const;
export type Circuit = (typeof CIRCUITS)[number];

const seed = (s: string) => Buffer.from(s);
const le = (n: number | bigint, bytes: number) => {
  const b = Buffer.alloc(bytes);
  if (bytes === 8) b.writeBigUInt64LE(BigInt(n));
  else if (bytes === 4) b.writeUInt32LE(Number(n));
  else b.writeUInt16LE(Number(n));
  return b;
};

export function pdas(programId: PublicKey = PROGRAM_ID) {
  const f = (...s: Buffer[]) => PublicKey.findProgramAddressSync(s, programId)[0];
  return {
    config: () => f(seed("config")),
    group: (tier: number, epoch: number) => f(seed("group"), Buffer.from([tier]), le(epoch, 4)),
    source: (nullifier: Uint8Array) => f(seed("src"), Buffer.from(nullifier)),
    buyer: (authority: PublicKey) => f(seed("buyer"), authority.toBuffer()),
    market: (id: number | bigint) => f(seed("market"), le(id, 8)),
    agg: (market: PublicKey) => f(seed("agg"), market.toBuffer()),
    auction: (market: PublicKey) => f(seed("auction"), market.toBuffer()),
    escrow: (market: PublicKey) => f(seed("escrow"), market.toBuffer()),
    option: (market: PublicKey, index: number) => f(seed("option"), market.toBuffer(), le(index, 2)),
    position: (market: PublicKey, nullifier: Uint8Array) => f(seed("pos"), market.toBuffer(), Buffer.from(nullifier)),
    bid: (market: PublicKey, buyer: PublicKey) => f(seed("bid"), market.toBuffer(), buyer.toBuffer()),
    outcome: (market: PublicKey, buyerIndex: number, option: number) => f(seed("outcome"), market.toBuffer(), Buffer.from([buyerIndex]), le(option, 2)),
    dispute: (market: PublicKey, nullifier: Uint8Array) => f(seed("dispute"), market.toBuffer(), Buffer.from(nullifier)),
  };
}

/** Accounts every queue_computation instruction needs. */
export function arciumAccounts(programId: PublicKey, clusterOffset: number, offset: anchorNs.BN, circuit: Circuit) {
  return {
    computationAccount: getComputationAccAddress(clusterOffset, offset),
    clusterAccount: getClusterAccAddress(clusterOffset),
    mxeAccount: getMXEAccAddress(programId),
    mempoolAccount: getMempoolAccAddress(clusterOffset),
    executingPool: getExecutingPoolAccAddress(clusterOffset),
    compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset(circuit)).readUInt32LE()),
  };
}

export function randomOffset(): anchorNs.BN {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return new anchor.BN(Buffer.from(b).toString("hex"), "hex");
}

/** Encrypt u64-sized values for the MXE (x25519 + Rescue). Returns everything a tx needs. */
export function encryptForMxe(mxePublicKey: Uint8Array, values: bigint[]) {
  const sk = x25519.utils.randomSecretKey();
  const pubkey = x25519.getPublicKey(sk);
  const cipher = new RescueCipher(x25519.getSharedSecret(sk, mxePublicKey));
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  const ciphertexts = cipher.encrypt(values, nonce);
  return { pubkey, nonce, nonceBN: new anchor.BN(deserializeLE(nonce).toString()), ciphertexts, cipher };
}

export async function fetchMxeKey(provider: anchorNs.AnchorProvider, programId = PROGRAM_ID, tries = 40): Promise<Uint8Array> {
  for (let i = 0; i < tries; i++) {
    try {
      const k = await getMXEPublicKey(provider, programId);
      if (k) return k;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("MXE public key unavailable");
}

export function makeProvider(connection: Connection, payer: Keypair) {
  const wallet = new anchor.Wallet(payer);
  return new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed", preflightCommitment: "confirmed", skipPreflight: true });
}

export function program(provider: anchorNs.AnchorProvider) {
  return new anchor.Program(IDL, provider) as anchorNs.Program<any>;
}

/** Queue a computation built by `build(offset)` and wait for its callback. */
export async function queueAndWait(provider: anchorNs.AnchorProvider, programId: PublicKey, build: (offset: anchorNs.BN) => any, timeoutMs = 120_000) {
  const offset = randomOffset();
  const sig = await build(offset).rpc({ skipPreflight: true, commitment: "confirmed" });
  const fin = await awaitComputationFinalization(provider, offset, programId, "confirmed", timeoutMs);
  return { sig, finalizeSig: fin, offset };
}

export const computeBudget = (units = 400_000) => ComputeBudgetProgram.setComputeUnitLimit({ units });

/** Mirror of the program's `visible_mask` (F5): which options buyer index `i` may see. */
export function visibleMask(m: { optionCount: number; kind: number; buyers: PublicKey[]; winners: PublicKey[]; hidden: number[] }, i: number): number {
  const all = m.optionCount >= 16 ? 0xffff : (1 << m.optionCount) - 1;
  const b = m.buyers[i];
  const isDefault = (k: PublicKey) => k.equals(PublicKey.default);
  if (m.kind === Kind.Exclusive || (b.equals(m.winners[0]) && !isDefault(b))) return all;
  if (b.equals(m.winners[1]) && !isDefault(b)) return all & ~m.hidden[0] & 0xffff;
  return all & ~(m.hidden[0] | m.hidden[1]) & 0xffff;
}
