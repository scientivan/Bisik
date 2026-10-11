import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519";
import { randomBytes } from "node:crypto";
import { Veritas } from "@bisik/veritas";
import { createIdentity, buildGroup, proveClaim } from "@bisik/zk";
import { keccak, utf8, toHex, be32 } from "@bisik/shared";
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

test("market list and detail expose the aggregate preview only, never team refs", async () => {
  const BN = (n: number) => ({ toString: () => String(n), valueOf: () => n });
  const mk = (id: number, status: number) => ({
    id: BN(id), kind: 1, status, category: 0, submitEnd: BN(1), auctionEnd: BN(2), outcomeEnd: BN(3),
    optionCount: 2, positionCount: 4, minStake: BN(10_000_000), maxStake: BN(500_000_000), minReasonLen: 200,
    reservePrice: BN(500_000_000), flatPrice: BN(500_000_000), preview: [4, 1, 2, 1],
  });
  const markets = [mk(1, 0), mk(2, 2)];
  const fakeChain: any = {
    fetchMarkets: async () => markets,
    fetchMarket: async (id: number) => markets.find((m) => Number(m.id) === id) ?? null,
    fetchOption: async (_id: number, i: number) => ({ index: i, category: 3, optedIn: i === 0, teamCommitment: [9, 9] }),
  };
  const db2 = openDb(":memory:");
  const app2 = createApp({ db: db2, chain: fakeChain, veritas: new Veritas(null), cfg: { dataKey: key, jwtSecret: "t", salt: "s", publicUrl: "http://localhost", reclaim: null, enforceLoginOnly: true } });

  const list = await (await app2.request("/v1/markets")).json();
  assert.deepEqual(list.markets.map((m: any) => m.id), [2, 1]);
  assert.equal(list.markets[1].preview, null); // Open market: no preview yet
  assert.deepEqual(list.markets[0].preview, { backed: 4, weak: 1, medium: 2, strong: 1 });
  assert.equal(list.markets[0].minReasonLen, 200);

  const filtered = await (await app2.request("/v1/markets?status=Auction")).json();
  assert.deepEqual(filtered.markets.map((m: any) => m.id), [2]);

  const one = await (await app2.request("/v1/markets/2")).json();
  assert.deepEqual(one.options, [{ index: 0, category: 3, optedIn: true }, { index: 1, category: 3, optedIn: false }]);
  assert.ok(!JSON.stringify(one).includes("teamCommitment"));
  assert.equal((await app2.request("/v1/markets/9")).status, 404);
});

test("scout response requires a real proof bound to the position, request and ciphertext", async () => {
  const identity = createIdentity();
  const group = buildGroup([identity.commitment, ...Array.from({length:4}, () => createIdentity().commitment)]);
  const content = '{"version":1,"ciphertext":"opaque-contact"}';
  const bound = keccak(utf8(JSON.stringify({action:"intro", id:"intro-proof-test", accept:true, content})));
  const { semaphore, solana } = await proveClaim({identity, group, marketId:77n, slot:1, recipient:bound});
  const reason = "Browser integration proof fixture. ".repeat(8);
  const hash = keccak(utf8(reason));
  const fixtureDb = openDb(":memory:");
  const fixture = createApp({ db:fixtureDb, chain:{fetchPositions:async()=>[{slot:1,root:be32(group.root),nullifier:solana.nullifier,reasonHash:hash}]} as any,
    veritas:new Veritas(null),cfg:{dataKey:key,jwtSecret:"test",salt:"test",publicUrl:"http://localhost",reclaim:null,enforceLoginOnly:true}});
  fixtureDb.prepare("INSERT INTO intros (id,market_id,option_index,buyer,buyer_x25519,status,created_at) VALUES (?,?,?,?,?,?,?)").run("intro-proof-test",77,0,"buyer","key","REQUESTED",1);
  fixtureDb.prepare("INSERT INTO reasons (id,market_id,option_index,reason_hash,ciphertext,filtered_text,d,a,drs,flags,claims,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run("proof-reason",77,0,toHex(hash),seal(key,reason),reason,0,null,0,"[]","[]",1);
  const body = {accept:true,contactCiphertext:content,proof:semaphore,marketId:77,slot:1,nullifier:toHex(solana.nullifier)};
  const call = (value:any) => fixture.request("/v1/intro/intro-proof-test/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(value)});
  assert.equal((await call({...body,proof:undefined})).status,403);
  assert.equal((await call({...body,contactCiphertext:"tampered"})).status,403);
  assert.equal((await call({...body,nullifier:toHex(new Uint8Array(32))})).status,403);
  assert.equal((await call({...body,slot:2})).status,403);
  assert.equal((await call(body)).status,200);
  assert.equal((await call(body)).status,404); // response cannot overwrite an accepted request
  fixtureDb.close();
});

test("allocated claims identify their backed position; disputes reject a different position or hidden claim", async () => {
  const buyer = Keypair.generate(), other = Keypair.generate();
  const fixtureDb = openDb(":memory:");
  const hashes = [keccak(utf8("reason zero")), keccak(utf8("reason one"))];
  const ns = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2)];
  const positions = ns.map((nullifier, i) => ({ nullifier, reasonHash:hashes[i], tier:2, weight:10, stakedAt:i, slashed:false }));
  const market = {status:4,kind:1,optionCount:2,buyerCount:2,buyers:[other.publicKey,buyer.publicKey],winners:[other.publicKey,buyer.publicKey],hidden:[1,0]};
  const fixture = createApp({db:fixtureDb, chain:{operator:other.publicKey,fetchMarket:async()=>market,fetchPositions:async()=>positions,fetchOption:async()=>null} as any,
    veritas:new Veritas(null),cfg:{dataKey:key,jwtSecret:"fixture",salt:"fixture",publicUrl:"http://localhost",reclaim:null,enforceLoginOnly:true}});
  for(let i=0;i<2;i++) fixtureDb.prepare("INSERT INTO reasons (id,market_id,option_index,reason_hash,ciphertext,filtered_text,d,a,drs,flags,claims,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run("reason"+i,1,i,toHex(hashes[i]),seal(key,"text"),"text",0,null,0,"[]",JSON.stringify([{id:"claim"+i,text:"A deployment exists.",kind:"verifiable"}]),i);
  const call=(path:string,body:any,token?:string)=>fixture.request(path,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  const n=await(await call("/v1/auth/nonce",{pubkey:buyer.publicKey.toBase58()})).json();
  const signature=Buffer.from(ed25519.sign(Buffer.from(n.message),buyer.secretKey.slice(0,32))).toString("base64");
  const {token}=await(await call("/v1/auth/verify",{pubkey:buyer.publicKey.toBase58(),nonce:n.nonce,signature})).json();
  const view=await(await fixture.request("/v1/markets/1/signals",{headers:{authorization:`Bearer ${token}`}})).json();
  assert.equal(view.options.length,1);
  assert.equal(view.options[0].claims[0].nullifier,toHex(ns[1]));
  assert.ok(!JSON.stringify(view).includes(toHex(ns[0])));
  assert.equal((await call("/v1/disputes",{marketId:1,nullifier:toHex(ns[0]),claimId:"claim1",evidence:"Evidence"},token)).status,403);
  assert.equal((await call("/v1/disputes",{marketId:1,nullifier:toHex(ns[0]),claimId:"claim0",evidence:"Evidence"},token)).status,403);
  assert.equal((await call("/v1/disputes",{marketId:1,nullifier:toHex(ns[1]),claimId:"claim1",evidence:"Evidence"},token)).status,200);
  fixtureDb.close();
});

test("market question is accepted only when it matches the onchain hash", async () => {
  const { keccak, utf8 } = await import("@bisik/shared");
  const q = "Which teams will ship next? (DEMO)";
  const m: any = { id: { toString: () => "5" }, kind: 1, status: 2, category: 0, submitEnd: 1, auctionEnd: 2, outcomeEnd: 3, optionCount: 0, positionCount: 0, minStake: 1, maxStake: 2, minReasonLen: 200, reservePrice: 1, flatPrice: 1, totalStaked: 7, preview: [0, 0, 0, 0], questionHash: Array.from(keccak(utf8(q))) };
  const chain: any = { fetchMarket: async () => m, fetchMarkets: async () => [m], fetchOption: async () => null };
  const app3 = createApp({ db: openDb(":memory:"), chain, veritas: new Veritas(null), cfg: { dataKey: key, jwtSecret: "t", salt: "s", publicUrl: "http://localhost", reclaim: null, enforceLoginOnly: true } });
  const bad = await app3.request("/v1/markets/5/question", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "something else" }) });
  assert.equal(bad.status, 400);
  const ok = await app3.request("/v1/markets/5/question", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
  assert.equal(ok.status, 200);
  const list = await (await app3.request("/v1/markets")).json();
  assert.equal(list.markets[0].question, q);
  assert.equal(list.markets[0].totalStaked, 7);
});
