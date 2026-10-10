/** Sign-In With Solana for buyers/operator: sign `Bisik login\nnonce: <n>\nissued: <ts>`. */
import { ed25519 } from "@noble/curves/ed25519";
import { createHmac, randomBytes } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import type { DB } from "./db.js";

export const loginMessage = (nonce: string, issued: number) => `Bisik login\nnonce: ${nonce}\nissued: ${issued}`;

export function newNonce(db: DB, pubkey: string): { nonce: string; issued: number; message: string } {
  const nonce = randomBytes(16).toString("hex");
  const issued = Math.floor(Date.now() / 1000);
  db.prepare("INSERT INTO nonces (nonce, pubkey, created_at) VALUES (?,?,?)").run(nonce, pubkey, issued);
  return { nonce, issued, message: loginMessage(nonce, issued) };
}

const b64u = (b: Buffer) => b.toString("base64url");

export function verifyLogin(db: DB, secret: string, pubkey: string, nonce: string, signatureB64: string): string {
  const row = db.prepare("SELECT * FROM nonces WHERE nonce=? AND pubkey=?").get(nonce, pubkey) as any;
  if (!row) throw new Error("unknown nonce");
  db.prepare("DELETE FROM nonces WHERE nonce=?").run(nonce);
  if (Date.now() / 1000 - row.created_at > 600) throw new Error("nonce expired");
  const ok = ed25519.verify(Buffer.from(signatureB64, "base64"), Buffer.from(loginMessage(nonce, row.created_at)), new PublicKey(pubkey).toBytes());
  if (!ok) throw new Error("bad signature");
  const payload = b64u(Buffer.from(JSON.stringify({ sub: pubkey, exp: Math.floor(Date.now() / 1000) + 12 * 3600 })));
  return `${payload}.${b64u(createHmac("sha256", secret).update(payload).digest())}`;
}

export function verifyToken(secret: string, token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.replace(/^Bearer /, "").split(".");
  if (!payload || !sig || b64u(createHmac("sha256", secret).update(payload).digest()) !== sig) return null;
  const d = JSON.parse(Buffer.from(payload, "base64url").toString());
  return d.exp > Date.now() / 1000 ? d.sub : null;
}
