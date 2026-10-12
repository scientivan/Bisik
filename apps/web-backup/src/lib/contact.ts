import { x25519 } from "@noble/curves/ed25519";
import { fromHex, toHex } from "@bisik/shared";
async function key(shared: Uint8Array) {
  return crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", shared as BufferSource),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function sealContact(text: string, buyerKey: string) {
  const secret = x25519.utils.randomPrivateKey(),
    publicKey = x25519.getPublicKey(secret),
    shared = x25519.getSharedSecret(secret, fromHex(buyerKey)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(shared),
    new TextEncoder().encode(text),
  );
  return JSON.stringify({
    version: 1,
    sender: toHex(publicKey),
    iv: toHex(iv),
    ciphertext: toHex(new Uint8Array(ct)),
  });
}
export async function openContact(envelope: string, secret: Uint8Array) {
  const data = JSON.parse(envelope);
  if (data.version !== 1) throw Error("Unsupported contact encryption format.");
  const shared = x25519.getSharedSecret(secret, fromHex(data.sender));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromHex(data.iv) as BufferSource },
      await key(shared),
      fromHex(data.ciphertext) as BufferSource,
    ),
  );
}
