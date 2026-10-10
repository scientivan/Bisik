import { keccak_256 } from "@noble/hashes/sha3";

/** keccak256 of raw bytes. */
export function keccak(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  return keccak_256(buf);
}

/** Big-endian 32-byte encoding of a non-negative bigint. */
export function be32(x: bigint): Uint8Array {
  if (x < 0n || x >= 1n << 256n) throw new Error("be32: out of range");
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

export function bytesToBigInt(b: Uint8Array): bigint {
  let x = 0n;
  for (const v of b) x = (x << 8n) | BigInt(v);
  return x;
}

/**
 * Semaphore field hash: keccak256(x as 32-byte big-endian) >> 8.
 * Must match @semaphore-protocol/proof `hash()` exactly.
 */
export function fieldHash(x: bigint): bigint {
  return bytesToBigInt(keccak(be32(x))) >> 8n;
}

export function u64be(x: bigint): Uint8Array {
  const out = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

export function toHex(b: Uint8Array): string {
  return "0x" + Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("");
}

export function fromHex(h: string): Uint8Array {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  if (s.length % 2) throw new Error("fromHex: odd length");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const enc = new TextEncoder();
export const utf8 = (s: string): Uint8Array => enc.encode(s);
