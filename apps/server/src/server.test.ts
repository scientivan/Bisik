import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519";
import { randomBytes } from "node:crypto";
import { Veritas } from "@bisik/veritas";
import { createIdentity } from "@bisik/zk";
import { openDb } from "./db.js";
import { createApp } from "./app.js";
import { addMember, leaves, rootOf } from "./groups.js";
import { seal, open } from "./sealed.js";
import { verifyScoutProofs, LOGIN_ONLY_URL, VerifyError } from "./reclaim.js";

after(() => setTimeout(() => process.exit(0), 50));

const key = randomBytes(32).toString("hex");
const db = openDb(":memory:");
const app = createApp({
  db,
  chain: null,
  veritas: new Veritas(null), // offline: lexical D, A unavailable
  cfg: { dataKey: key, jwtSecret: "test-secret", salt: "salt", publicUrl: "http://localhost", reclaim: null, enforceLoginOnly: true },
});
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("sealed data round-trips and is not plaintext", () => {
  const s = seal(key, "secret reason");
  assert.ok(!s.includes("secret"));
  assert.equal(open(key, s), "secret reason");
});

test("SIWS login issues a token only for a valid signature, nonce single-use", async () => {
  const kp = Keypair.generate();
  const n = await (await post("/v1/auth/nonce", { pubkey: kp.publicKey.toBase58() })).json();
  const sig = Buffer.from(ed25519.sign(Buffer.from(n.message), kp.secretKey.slice(0, 32))).toString("base64");
  const ok = await post("/v1/auth/verify", { pubkey: kp.publicKey.toBase58(), nonce: n.nonce, signature: sig });
  assert.equal(ok.status, 200);
  assert.ok((await ok.json()).token);
  const replay = await post("/v1/auth/verify", { pubkey: kp.publicKey.toBase58(), nonce: n.nonce, signature: sig });
  assert.equal(replay.status, 401);
  const signals = await app.request("/v1/markets/1/signals");
  assert.equal(signals.status, 401);
});

test("reasons: min length, Veritas flags duplicates, privacy filter strips handles", async () => {
  const base =
    "Team Lumen shipped a working zk light client on testnet in 9 days, their repo has 40 commits from 3 devs and the demo verified real Ethereum headers. " +
    "They are still choosing a chain for mainnet and asked mentors about Solana grant timelines. Contact me at @scout_handle for details.";
  assert.equal((await post("/v1/reasons", { marketId: 1, optionIndex: 0, text: "too short" })).status, 400);
  const r1 = await (await post("/v1/reasons", { marketId: 1, optionIndex: 0, text: base })).json();
  assert.ok(r1.veritas.D < 0.5);
  assert.equal(r1.veritas.A, null);
  assert.ok(r1.veritas.flags.includes("ai_unavailable"));
  const r2 = await (await post("/v1/reasons", { marketId: 1, optionIndex: 1, text: base + " Strong team." })).json();
  assert.ok(r2.veritas.D >= 0.8, `D=${r2.veritas.D}`);
  assert.ok(r2.veritas.flags.includes("likely_duplicate"));
  const row = db.prepare("SELECT filtered_text, ciphertext FROM reasons WHERE id=?").get(r1.reasonId) as any;
  assert.ok(!row.filtered_text.includes("@scout_handle"));
  assert.ok(!row.ciphertext.includes("Lumen"));
});

test("group service: idempotent add, root matches Semaphore group", async () => {
  const ids = [createIdentity(), createIdentity(), createIdentity()];
  for (const i of ids) await addMember(db, null, 2, 1, i.commitment.toString());
  await addMember(db, null, 2, 1, ids[0].commitment.toString());
  const ls = leaves(db, 2, 1);
  assert.equal(ls.length, 3);
  const g = await (await app.request("/v1/groups/2/1")).json();
  assert.equal(g.root, rootOf(ls).root.toString());
  assert.equal(g.size, 3);
});

test("Reclaim verifier: R23 login-only rule and rejection of tampered proofs", async () => {
  assert.ok(LOGIN_ONLY_URL.test("https://github.com/settings/profile"));
  assert.ok(!LOGIN_ONLY_URL.test("https://github.com/users/alice/contributions"));
  await assert.rejects(() => verifyScoutProofs([], { salt: "s", providerId: "p", enforceLoginOnly: true }), (e: any) => e instanceof VerifyError && e.code === "NO_PROOF");
});

test("disputes: opinions cannot be disputed", async () => {
  const kp = Keypair.generate();
  const n = await (await post("/v1/auth/nonce", { pubkey: kp.publicKey.toBase58() })).json();
  const sig = Buffer.from(ed25519.sign(Buffer.from(n.message), kp.secretKey.slice(0, 32))).toString("base64");
  const { token } = await (await post("/v1/auth/verify", { pubkey: kp.publicKey.toBase58(), nonce: n.nonce, signature: sig })).json();
  const res = await post("/v1/disputes", { marketId: 1, nullifier: "00", claimId: "nope", evidence: "x" }, { authorization: `Bearer ${token}` });
  assert.equal(res.status, 404);
});

// Fixture: a real signed proof from the Reclaim JS SDK test suite (Kaggle provider, not ours).
// It has a username but no contribution count, so a valid signature must still be rejected.
test("Reclaim verifier: real signed proof passes signature + attestor checks; tampering fails", async () => {
  const { readFileSync } = await import("node:fs");
  const fixture = JSON.parse(readFileSync(new URL("../test-fixtures/reclaim-sdk-proof.json", import.meta.url), "utf8"));
  const opts = { salt: "s", providerId: "p", enforceLoginOnly: false };
  await assert.rejects(() => verifyScoutProofs([structuredClone(fixture)], opts), (e: any) => e.code === "NO_CONTRIBUTIONS" && !String(e.detail).includes("srivatsanqb"));
  await assert.rejects(() => verifyScoutProofs([structuredClone(fixture)], { ...opts, enforceLoginOnly: true }), (e: any) => e.code === "UNOWNED_SOURCE");
  const t = structuredClone(fixture);
  t.claimData.context = t.claimData.context.replace("srivatsanqb", "someoneelse");
  await assert.rejects(() => verifyScoutProofs([t], opts), (e: any) => e.code === "INVALID_PROOF");
});
