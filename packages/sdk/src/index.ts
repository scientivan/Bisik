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
import IDL_JSON from "./idl/bisik.json" with { type: "json" };

const anchor: typeof anchorNs = ((anchorNs as any).default ?? anchorNs) as typeof anchorNs;
export { anchor };
// Imported as JSON (no node:module), so the same entry works in Node and in Vite/browsers.
export const IDL: any = IDL_JSON;
export const PROGRAM_ID = new PublicKey(IDL.address);

export const Status = { Open: 0, Closed: 1, Auction: 2, Allocated: 3, Outcome: 4, Settling: 5, Settled: 6 } as const;
export const STATUS_NAMES = ["Open", "Closed", "Auction", "Allocated", "OutcomeWindow", "Settling", "Settled"];
export const Kind = { Exclusive: 0, Auction: 1 } as const;
export const CIRCUITS = ["init_market_agg", "allocate", "preview", "init_auction", "place_bid", "resolve_auction", "winning_weights", "position_hits"] as const;
/**
 * D4/D6 circuits. Kept separate from `CIRCUITS` so existing setup scripts do not try to
 * initialize them against a program build that predates them (devnet, 10 Oct).
 */
export const CIRCUITS_V2 = ["reveal_signals", "init_rep", "credit_reputation", "epoch_tiers"] as const;
export type Circuit = (typeof CIRCUITS)[number] | (typeof CIRCUITS_V2)[number];

const seed = (s: string) => Buffer.from(s);
const le = (n: number | bigint, bytes: number) => {
  const b = Buffer.alloc(bytes);
  if (bytes === 8) {
    // The Buffer shim used by browser crypto dependencies lacks writeBigUInt64LE.
    // Preserve the unsigned u64 range check and encode the two words explicitly.
    const value = BigInt(n);
    if (value < 0n || value >= (1n << 64n)) throw new RangeError("PDA seed exceeds u64");
    b.writeUInt32LE(Number(value & 0xffffffffn), 0);
    b.writeUInt32LE(Number(value >> 32n), 4);
  }
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
    /** D4: buyer's encrypted signal view. */
    signals: (market: PublicKey, buyer: PublicKey) => f(seed("signals"), market.toBuffer(), buyer.toBuffer()),
    /** D6: global encrypted reputation table. */
    reputation: () => f(seed("rep")),
    /** D6: per-position "already credited" marker. */
    repCredit: (position: PublicKey) => f(seed("repc"), position.toBuffer()),
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

// ───────────────────────────── D4: signals encrypted to the buyer ─────────────────────────────

/** Onchain `SignalReveal` (as decoded by Anchor) or the JSON shape the server returns. */
export interface EncryptedSignals {
  mask: number;
  encPubkey: Uint8Array | number[] | string;
  nonce: bigint | string | { toString(): string };
  ciphertexts: (Uint8Array | number[] | string)[];
}

const toBytes = (x: Uint8Array | number[] | string): Uint8Array =>
  typeof x === "string" ? Uint8Array.from(Buffer.from(x.replace(/^0x/, ""), "hex")) : Uint8Array.from(x as ArrayLike<number>);

/** u128 → 16 little-endian bytes (the nonce layout Rescue expects). */
export function u128ToLE(n: bigint): Uint8Array {
  const out = new Uint8Array(16);
  let v = n;
  for (let i = 0; i < 16; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Serialize a fetched `SignalReveal` account for an HTTP response (hex + decimal strings). */
export function signalRevealToJson(acc: any) {
  if (!acc || !acc.ready) return null;
  return {
    mask: acc.mask as number,
    encPubkey: Buffer.from(acc.encPubkey).toString("hex"),
    nonce: acc.nonce.toString(),
    ciphertexts: (acc.ct as number[][]).map((c) => Buffer.from(c).toString("hex")),
    revealedAt: Number(acc.revealedAt),
  };
}

/**
 * Decrypt the buyer's signal view with the buyer's x25519 secret key. Returns the weighted
 * support per option (16 entries; options outside `mask` are 0).
 */
export function decryptSignals(s: EncryptedSignals, buyerSecretKey: Uint8Array, mxePublicKey: Uint8Array): bigint[] {
  const cipher = new RescueCipher(x25519.getSharedSecret(buyerSecretKey, mxePublicKey));
  const nonce = u128ToLE(BigInt(s.nonce.toString()));
  return cipher.decrypt(s.ciphertexts.map((c) => Array.from(toBytes(c))), nonce);
}

/** Fresh x25519 keypair for a buyer's signal view. Keep `secretKey` client-side only. */
export function newViewKey() {
  const secretKey = x25519.utils.randomSecretKey();
  return { secretKey, publicKey: x25519.getPublicKey(secretKey) };
}

// ───────────────────────────── D6: private reputation ─────────────────────────────

/**
 * Encrypt the option and the credit (identity commitment C) with ONE x25519 key, as `stake`
 * expects: `Position` stores only `enc_pubkey`, so the MXE can open the credit in
 * `credit_reputation` only if it shares the option's key (different nonces).
 */
export function encryptStakeSecrets(mxePublicKey: Uint8Array, option: number, commitment: bigint) {
  const o = encryptForMxe(mxePublicKey, [BigInt(option)]);
  const cnonce = new Uint8Array(16);
  crypto.getRandomValues(cnonce);
  const credit = o.cipher.encrypt([commitment], cnonce);
  return {
    pubkey: o.pubkey,
    optionNonce: o.nonce,
    optionNonceBN: o.nonceBN,
    optionCt: o.ciphertexts[0],
    creditNonce: cnonce,
    creditNonceBN: new anchor.BN(deserializeLE(cnonce).toString()),
    creditCt: credit[0],
  };
}

/** Level semantics of `epoch_tiers`: 0 = one tier down, 1 = unchanged, 2 = +1, 3 = +2. */
export const REP_LEVEL_NAMES = ["down", "unchanged", "up", "up2"] as const;

/** Tag the MXE publishes for commitment C: low 64 bits of C with the low byte cleared. */
export function repTag(commitment: bigint): bigint {
  return (BigInt.asUintN(64, commitment) >> 8n) << 8n;
}

/**
 * Map the revealed sorted `(tag | level)` list back to the public group leaves. Commitments
 * without an entry have no internal reputation yet (level 1 = unchanged).
 */
export function decodeEpochTiers(entries: (bigint | number | { toString(): string })[], commitments: bigint[]) {
  const byTag = new Map<bigint, number>();
  for (const e of entries) {
    const v = BigInt(e.toString());
    if (v === 0n) continue;
    byTag.set((v >> 8n) << 8n, Number(v & 0xffn));
  }
  return commitments.map((c) => ({ commitment: c, level: byTag.get(repTag(c)) ?? 1, credited: byTag.has(repTag(c)) }));
}

/** Effective tier for the next epoch: imported (zkTLS) tier shifted by the internal level. */
export function applyRepLevel(importedTier: number, level: number, maxTier = 2): number {
  return Math.max(0, Math.min(maxTier, importedTier + level - 1));
}
