import { test } from "node:test";
import assert from "node:assert/strict";
import { x25519 } from "@noble/curves/ed25519";
import { toHex } from "@bisik/shared";
import { sealContact, openContact } from "./contact";
test("only the intended buyer can open a scout contact envelope", async () => {
  const sk = x25519.utils.randomPrivateKey(),
    other = x25519.utils.randomPrivateKey();
  const ct = await sealContact(
    "Contact the scout via their agreed channel.",
    toHex(x25519.getPublicKey(sk)),
  );
  assert.ok(!ct.includes("agreed channel"));
  assert.equal(
    await openContact(ct, sk),
    "Contact the scout via their agreed channel.",
  );
  await assert.rejects(() => openContact(ct, other));
  const tampered = JSON.parse(ct);
  tampered.ciphertext = tampered.ciphertext.slice(0, -2) + "00";
  await assert.rejects(() => openContact(JSON.stringify(tampered), sk));
});
