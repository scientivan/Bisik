/** AES-256-GCM at-rest encryption for sensitive server data (D-26). */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function seal(keyHex: string, plaintext: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function open(keyHex: string, sealed: string): string {
  const key = Buffer.from(keyHex, "hex");
  const b = Buffer.from(sealed, "base64");
  const d = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}
