/**
 * Bisik end-to-end test on the Arcium localnet (task C14).
 *
 * Scenario (fictional demo data):
 *  - 5 scouts in the Gold anonymous group (k = 5); 3 options (teams); 4 anonymous positions.
 *  - Auction market: 3 verified buyers bid sealed; GSP for 2 slots with a reserve.
 *  - Winner #1 hides option 0, winner #2 hides option 1, the loser buys the rest flat.
 *  - Outcomes recorded per buyer; one hoax dispute upheld (stake to charity).
 *  - Settlement via MPC; a scout claims stake + payout to a fresh address with a ZK proof.
 *
 * Run: `arcium test` (Anchor.toml points the test script at this file).
 */
import * as anchorNs from "@anchor-lang/core";
// CJS package under ESM: use the default export when present.
const anchor: typeof anchorNs = ((anchorNs as any).default ?? anchorNs) as typeof anchorNs;
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getArciumProgram,
  uploadCircuit,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getLookupTableAddress,
  x25519,
} from "@arcium-hq/client";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import assert from "node:assert/strict";
import { Identity } from "@semaphore-protocol/identity";
import { buildGroup, proveStake, proveClaim } from "@bisik/zk";
import { keccak, utf8, be32, Tier } from "@bisik/shared";

const idl = JSON.parse(fs.readFileSync(new URL("../target/idl/bisik.json", import.meta.url), "utf8"));
const CIRCUITS = [
  "init_market_agg",
  "allocate",
  "preview",
  "init_auction",
  "place_bid",
  "resolve_auction",
  "winning_weights",
  "position_hits",
] as const;
const USDC = (x: number) => new anchor.BN(Math.round(x * 1e6));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log("  ·", ...a);
const timings: Record<string, number[]> = {};

function kp(path: string) {
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, "utf8"))));
}
const seed = (s: string) => Buffer.from(s);
const u64le = (n: number | bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const u32le = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};
const u16le = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};

async function main() {
  process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
  process.env.ANCHOR_WALLET ??= `${os.homedir()}/.config/solana/id.json`;
  const envProvider = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(envProvider.connection, envProvider.wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: true,
  });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider) as anchor.Program<any>;
  const pid = program.programId;
  const conn = provider.connection;
  const admin = kp(`${os.homedir()}/.config/solana/id.json`);
  const arciumEnv = getArciumEnv();
  const cluster = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  const pda = (...s: Buffer[]) => PublicKey.findProgramAddressSync(s, pid)[0];
  const configPda = pda(seed("config"));

  async function fund(k: Keypair, sol = 5) {
    const sig = await conn.requestAirdrop(k.publicKey, sol * 1e9);
    await conn.confirmTransaction(sig, "confirmed");
  }
  async function chainNow(): Promise<number> {
    const slot = await conn.getSlot("confirmed");
    return (await conn.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);
  }
  async function waitUntil(ts: number, label: string) {
    for (;;) {
      const now = await chainNow();
      if (now >= ts) return;
      if ((ts - now) % 10 === 0) log(`waiting for ${label}: ${ts - now}s`);
      await sleep(1000);
    }
  }
  function arciumAccs(offset: anchor.BN, circuit: string) {
    return {
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, offset),
      clusterAccount: cluster,
      mxeAccount: getMXEAccAddress(pid),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(pid, Buffer.from(getCompDefAccOffset(circuit)).readUInt32LE()),
    };
  }
  /** Queue a computation and wait for its callback; records latency (task D7). */
  async function queue(circuit: string, build: (offset: anchor.BN) => any, signers: Keypair[] = []) {
    const offset = new anchor.BN(randomBytes(8), "hex");
    const t0 = Date.now();
    await build(offset).signers(signers).rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider, offset, pid, "confirmed");
    (timings[circuit] ??= []).push((Date.now() - t0) / 1000);
    return offset;
  }

  // ── 0. MXE key + computation definitions ──
  let mxeKey: Uint8Array | null = null;
  for (let i = 0; i < 40 && !mxeKey; i++) {
    try {
      mxeKey = await getMXEPublicKey(provider, pid);
    } catch {}
    if (!mxeKey) await sleep(500);
  }
  assert.ok(mxeKey, "MXE public key");
  const arciumProgram = getArciumProgram(provider);
  const mxeAccount = getMXEAccAddress(pid);
  const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
  const lut = getLookupTableAddress(pid, mxeAcc.lutOffsetSlot);
  for (const c of CIRCUITS) {
    const off = getCompDefAccOffset(c);
    const compDef = PublicKey.findProgramAddressSync(
      [getArciumAccountBaseSeed("ComputationDefinitionAccount"), pid.toBuffer(), off],
      getArciumProgramId(),
    )[0];
    const method = "init" + c.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("") + "CompDef";
    await (program.methods as any)
      [method[0].toLowerCase() + method.slice(1)]("")
      .accounts({ compDefAccount: compDef, payer: admin.publicKey, mxeAccount, addressLookupTable: lut })
      .signers([admin])
      .rpc({ preflightCommitment: "confirmed", commitment: "confirmed" });
    await uploadCircuit(provider, c, pid, fs.readFileSync(`build/${c}.arcis`), true);
  }
  log("computation definitions ready:", CIRCUITS.length);

  // ── 1. Mock USDC, treasury, charity, config ──
  const mint = await createMint(conn, admin, admin.publicKey, null, 6);
  const ata = async (owner: PublicKey) => (await getOrCreateAssociatedTokenAccount(conn, admin, mint, owner, true)).address;
  const treasury = await ata(Keypair.generate().publicKey);
  const charity = await ata(Keypair.generate().publicKey);
  await program.methods
    .initConfig({
      operator: admin.publicKey,
      treasury,
      charity,
      feeBps: 1500,
      teamBps: 500,
      epochLen: new anchor.BN(30 * 86400),
      kMin: 5,
      demoMode: true,
    })
    .accounts({ admin: admin.publicKey, config: configPda, usdcMint: mint })
    .signers([admin])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  log("config initialized (demo mode)");

  // ── 2. Anonymous Gold group (5 identities) + source nullifiers ──
  const ids = ["a", "b", "c", "d", "e"].map((s) => new Identity(`bisik-demo-scout-${s}`));
  const group = buildGroup(ids.map((i) => i.commitment));
  const root = be32(group.root);
  const epoch = 1;
  const groupPda = pda(seed("group"), Buffer.from([Tier.Gold]), u32le(epoch));
  await program.methods
    .publishGroupRoot(Tier.Gold, epoch, Array.from(root), group.size)
    .accounts({ operator: admin.publicKey, config: configPda, group: groupPda })
    .signers([admin])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  for (const s of ["github:demo-a", "github:demo-b"]) {
    const n = keccak(utf8("bisik-salt|" + s));
    await program.methods
      .registerSourceNullifier(Array.from(n))
      .accounts({ operator: admin.publicKey, config: configPda, source: pda(seed("src"), Buffer.from(n)) })
      .signers([admin])
      .rpc({ commitment: "confirmed", skipPreflight: true });
  }
  // duplicate source must fail
  await assert.rejects(
    program.methods
      .registerSourceNullifier(Array.from(keccak(utf8("bisik-salt|github:demo-a"))))
      .accounts({ operator: admin.publicKey, config: configPda, source: pda(seed("src"), Buffer.from(keccak(utf8("bisik-salt|github:demo-a")))) })
      .signers([admin])
      .rpc({ commitment: "confirmed", skipPreflight: true }),
  );
  log("group root published; duplicate source nullifier rejected");

  // ── 3. Buyers ──
  const buyers = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const buyerTok: PublicKey[] = [];
  for (const b of buyers) {
    await fund(b);
    buyerTok.push(await ata(b.publicKey));
    await mintTo(conn, admin, mint, buyerTok.at(-1)!, admin, 1_000e6);
    await program.methods
      .registerBuyer(b.publicKey, Array.from(keccak(utf8("pseudonym-" + b.publicKey.toBase58()))))
      .accounts({ operator: admin.publicKey, config: configPda, buyer: pda(seed("buyer"), b.publicKey.toBuffer()) })
      .signers([admin])
      .rpc({ commitment: "confirmed", skipPreflight: true });
  }

  // ── 4. Market ──
  const marketId = 0;
  const market = pda(seed("market"), u64le(marketId));
  const agg = pda(seed("agg"), market.toBuffer());
  const auction = pda(seed("auction"), market.toBuffer());
  const escrow = pda(seed("escrow"), market.toBuffer());
  const adminTok = await ata(admin.publicKey);
  await mintTo(conn, admin, mint, adminTok, admin, 10_000e6);
  await program.methods
    .createMarket({
      kind: 1,
      category: 1,
      questionHash: Array.from(keccak(utf8("Most promising DeFi team still open to choosing a chain? (DEMO)"))),
      submitLen: new anchor.BN(90),
      auctionLen: new anchor.BN(60),
      selectionLen: new anchor.BN(5),
      outcomeLen: new anchor.BN(20),
      disputeLen: new anchor.BN(5),
      minStake: USDC(10),
      maxStake: USDC(500),
      minReasonLen: 200,
      b: 2,
      x: 3,
      reservePrice: USDC(100),
      flatPrice: USDC(90),
      earlyBonusBps: 15000,
      initialPool: new anchor.BN(0),
    })
    .accounts({
      creator: admin.publicKey,
      config: configPda,
      market,
      agg,
      auction,
      escrow,
      usdcMint: mint,
      creatorToken: adminTok,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([admin])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  await queue("init_market_agg", (o) => program.methods.initMarketState(o).accountsPartial({ payer: admin.publicKey, market, agg, ...arciumAccs(o, "init_market_agg") }), [admin]);
  await queue("init_auction", (o) => program.methods.initAuctionState(o).accountsPartial({ payer: admin.publicKey, market, auction, ...arciumAccs(o, "init_auction") }), [admin]);
  log("market created; encrypted aggregate and auction state initialized");

  const teams = ["Team Lumen (DEMO)", "Team Garuda (DEMO)", "Team Rinjani (DEMO)"];
  for (let i = 0; i < teams.length; i++) {
    await program.methods
      .addOption(Array.from(keccak(utf8(teams[i] + "|salt"))), 1)
      .accounts({ payer: admin.publicKey, market, option: pda(seed("option"), market.toBuffer(), u16le(i)) })
      .signers([admin])
      .rpc({ commitment: "confirmed", skipPreflight: true });
  }

  // ── 5. Anonymous stakes ──
  const stakes = [
    { id: 0, slot: 1, option: 0, amount: 100 },
    { id: 1, slot: 1, option: 0, amount: 50 },
    { id: 2, slot: 1, option: 1, amount: 80 },
    { id: 0, slot: 2, option: 2, amount: 20 },
  ];
  const positions: { nullifier: Uint8Array; pda: PublicKey; s: (typeof stakes)[number] }[] = [];
  for (const s of stakes) {
    const wallet = Keypair.generate(); // fresh stake wallet per position
    await fund(wallet, 1);
    const wTok = await ata(wallet.publicKey);
    await mintTo(conn, admin, mint, wTok, admin, s.amount * 1e6);

    const sk = x25519.utils.randomSecretKey();
    const pk = x25519.getPublicKey(sk);
    const cipher = new RescueCipher(x25519.getSharedSecret(sk, mxeKey!));
    const nonce = randomBytes(16);
    const encOption = cipher.encrypt([BigInt(s.option)], nonce)[0];
    const cnonce = randomBytes(16);
    const creditCt = cipher.encrypt([ids[s.id].commitment], cnonce)[0];
    const reason = `DEMO reason: ${teams[s.option]} shipped a working prototype and has not committed to any chain yet. `.repeat(3);
    const reasonHash = keccak(utf8(reason));
    const payload = {
      marketId: BigInt(marketId),
      slot: s.slot,
      amount: BigInt(s.amount * 1e6),
      encOptionHash: keccak(Uint8Array.from(pk), Uint8Array.from(nonce), Uint8Array.from(encOption)),
      reasonHash,
      creditHash: keccak(Uint8Array.from(creditCt), Uint8Array.from(cnonce)),
    };
    const { solana } = await proveStake({ identity: ids[s.id], group, payload });
    const posPda = pda(seed("pos"), market.toBuffer(), Buffer.from(solana.nullifier));
    await program.methods
      .stake({
        slot: s.slot,
        amount: USDC(s.amount),
        tier: Tier.Gold,
        epoch,
        proof: Array.from(solana.proof),
        root: Array.from(solana.root),
        nullifier: Array.from(solana.nullifier),
        encPubkey: Array.from(pk),
        encNonce: new anchor.BN(deserializeLE(nonce).toString()),
        encOption: Array.from(encOption),
        reasonHash: Array.from(reasonHash),
        creditCt: Array.from(creditCt),
        creditNonce: new anchor.BN(deserializeLE(cnonce).toString()),
      })
      .accounts({
        payer: wallet.publicKey,
        config: configPda,
        market,
        group: groupPda,
        position: posPda,
        payerToken: wTok,
        escrow,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })])
      .signers([wallet])
      .rpc({ commitment: "confirmed", skipPreflight: true });
    positions.push({ nullifier: solana.nullifier, pda: posPda, s });
  }
  log("4 anonymous stakes accepted (ZK membership + one nullifier per slot)");

  // same identity + same slot again must fail (nullifier reuse)
  {
    const wallet = Keypair.generate();
    await fund(wallet, 1);
    const wTok = await ata(wallet.publicKey);
    await mintTo(conn, admin, mint, wTok, admin, 10e6);
    const zero = new Uint8Array(32);
    const payload = { marketId: 0n, slot: 1, amount: 10_000_000n, encOptionHash: keccak(zero, new Uint8Array(16), zero), reasonHash: zero, creditHash: keccak(zero, new Uint8Array(16)) };
    const { solana } = await proveStake({ identity: ids[0], group, payload });
    await assert.rejects(
      program.methods
        .stake({ slot: 1, amount: USDC(10), tier: Tier.Gold, epoch, proof: Array.from(solana.proof), root: Array.from(solana.root), nullifier: Array.from(solana.nullifier), encPubkey: Array.from(zero), encNonce: new anchor.BN(0), encOption: Array.from(zero), reasonHash: Array.from(zero), creditCt: Array.from(zero), creditNonce: new anchor.BN(0) })
        .accounts({ payer: wallet.publicKey, config: configPda, market, group: groupPda, position: pda(seed("pos"), market.toBuffer(), Buffer.from(solana.nullifier)), payerToken: wTok, escrow, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })])
        .signers([wallet])
        .rpc({ commitment: "confirmed", skipPreflight: true }),
    );
    log("reused nullifier (same scout, same slot) rejected");
  }

  for (const p of positions) {
    await queue("allocate", (o) => program.methods.allocatePosition(o).accountsPartial({ payer: admin.publicKey, market, agg, position: p.pda, ...arciumAccs(o, "allocate") }), [admin]);
  }
  log("positions folded into the encrypted aggregate");

  // ── 6. Close + preview ──
  let m: any = await program.account.market.fetch(market);
  await waitUntil(m.submitEnd.toNumber(), "submit window");
  await program.methods.closeSubmit().accounts({ signer: admin.publicKey, market }).signers([admin]).rpc({ commitment: "confirmed", skipPreflight: true });
  await queue("preview", (o) => program.methods.requestPreview(o).accountsPartial({ payer: admin.publicKey, market, agg, ...arciumAccs(o, "preview") }), [admin]);
  m = await program.account.market.fetch(market);
  log("preview (backed, weak, medium, strong):", m.preview);
  assert.equal(m.preview[0], 3);

  // ── 7. Sealed bids ──
  const bids = [
    { b: 0, amount: 300, ceiling: 400 },
    { b: 1, amount: 200, ceiling: 250 },
    { b: 2, amount: 120, ceiling: 150 },
  ];
  for (const bd of bids) {
    const buyer = buyers[bd.b];
    const sk = x25519.utils.randomSecretKey();
    const pk = x25519.getPublicKey(sk);
    const cipher = new RescueCipher(x25519.getSharedSecret(sk, mxeKey!));
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(bd.amount * 1e6)], nonce)[0];
    const bidPda = pda(seed("bid"), market.toBuffer(), buyer.publicKey.toBuffer());
    await program.methods
      .openBid(USDC(bd.ceiling))
      .accounts({ payer: buyer.publicKey, config: configPda, buyerProfile: pda(seed("buyer"), buyer.publicKey.toBuffer()), market, bid: bidPda, payerToken: buyerTok[bd.b], escrow, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([buyer])
      .rpc({ commitment: "confirmed", skipPreflight: true });
    await queue(
      "place_bid",
      (o) =>
        program.methods
          .placeBid(o, Array.from(pk), new anchor.BN(deserializeLE(nonce).toString()), Array.from(ct))
          .accountsPartial({ payer: buyer.publicKey, market, auction, bid: bidPda, ...arciumAccs(o, "place_bid") }),
      [buyer],
    );
  }
  m = await program.account.market.fetch(market);
  await waitUntil(m.auctionEnd.toNumber(), "auction end");
  await queue("resolve_auction", (o) => program.methods.resolveAuction(o).accountsPartial({ payer: admin.publicKey, market, auction, ...arciumAccs(o, "resolve_auction") }), [admin]);
  m = await program.account.market.fetch(market);
  assert.ok(m.winners[0].equals(buyers[0].publicKey), "winner #1");
  assert.ok(m.winners[1].equals(buyers[1].publicKey), "winner #2");
  assert.equal(m.prices[0].toNumber(), 200e6, "#1 pays bid #2");
  assert.equal(m.prices[1].toNumber(), 120e6, "#2 pays bid #3");
  log("auction resolved: #1 pays 200, #2 pays 120 (GSP); bid amounts never revealed");

  for (let i = 0; i < 3; i++) {
    await program.methods
      .settleBid()
      .accounts({ signer: admin.publicKey, market, bid: pda(seed("bid"), market.toBuffer(), buyers[i].publicKey.toBuffer()), buyerToken: buyerTok[i], escrow, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([admin])
      .rpc({ commitment: "confirmed", skipPreflight: true });
  }
  const balC = await getAccount(conn, buyerTok[2]);
  assert.equal(Number(balC.amount), 1_000e6, "loser refunded in full");

  // ── 8. Sequential hidden selection + flat purchase ──
  await assert.rejects(program.methods.selectHidden([1]).accounts({ buyer: buyers[1].publicKey, market }).signers([buyers[1]]).rpc());
  await program.methods.selectHidden([0]).accounts({ buyer: buyers[0].publicKey, market }).signers([buyers[0]]).rpc({ commitment: "confirmed", skipPreflight: true });
  await assert.rejects(program.methods.selectHidden([0]).accounts({ buyer: buyers[1].publicKey, market }).signers([buyers[1]]).rpc());
  await program.methods.selectHidden([1]).accounts({ buyer: buyers[1].publicKey, market }).signers([buyers[1]]).rpc({ commitment: "confirmed", skipPreflight: true });
  await program.methods
    .buyFlat()
    .accounts({ payer: buyers[2].publicKey, config: configPda, buyerProfile: pda(seed("buyer"), buyers[2].publicKey.toBuffer()), market, payerToken: buyerTok[2], escrow, tokenProgram: TOKEN_PROGRAM_ID })
    .signers([buyers[2]])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  log("selection order enforced; flat buyer joined");

  m = await program.account.market.fetch(market);
  await waitUntil(m.selectionDeadline.toNumber(), "selection deadline");
  await program.methods.openOutcomeWindow().accounts({ signer: admin.publicKey, market }).signers([admin]).rpc({ commitment: "confirmed", skipPreflight: true });

  // ── 9. Outcomes + one upheld hoax dispute ──
  const outcome = (bi: number, opt: number, signer: Keypair) =>
    program.methods
      .recordOutcome(bi, opt, 0, Array.from(keccak(utf8(`deploy-evidence-${bi}-${opt}`))))
      .accounts({ signer: signer.publicKey, config: configPda, market, outcome: pda(seed("outcome"), market.toBuffer(), Buffer.from([bi]), u16le(opt)) })
      .signers([signer])
      .rpc({ commitment: "confirmed", skipPreflight: true });
  // flat buyer (index 2) cannot see option 0 (hidden by #1)
  await assert.rejects(outcome(2, 0, buyers[2]));
  await outcome(0, 0, buyers[0]);
  await outcome(1, 1, buyers[1]);
  await outcome(2, 2, admin); // operator oracle records a Solana deploy
  const hoax = positions[3];
  await program.methods
    .openDispute(Array.from(keccak(utf8("claim: led migration of X"))), Array.from(keccak(utf8("evidence: public commit history"))))
    .accounts({ buyer: buyers[2].publicKey, market, position: hoax.pda, dispute: pda(seed("dispute"), market.toBuffer(), Buffer.from(hoax.nullifier)) })
    .signers([buyers[2]])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  await program.methods
    .resolveDispute(true)
    .accounts({ operator: admin.publicKey, config: configPda, market, position: hoax.pda, dispute: pda(seed("dispute"), market.toBuffer(), Buffer.from(hoax.nullifier)), escrow, charityToken: charity, tokenProgram: TOKEN_PROGRAM_ID })
    .signers([admin])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  assert.equal(Number((await getAccount(conn, charity)).amount), 20e6, "slashed stake to charity");
  log("outcomes recorded; hoax upheld → 20 USDC to charity");

  // ── 10. Settlement ──
  m = await program.account.market.fetch(market);
  await waitUntil(m.outcomeEnd.toNumber(), "outcome window");
  await queue("winning_weights", (o) => program.methods.computeWeights(o).accountsPartial({ payer: admin.publicKey, market, agg, ...arciumAccs(o, "winning_weights") }), [admin]);
  for (const p of positions) {
    const pos: any = await program.account.position.fetch(p.pda);
    if (pos.slashed) {
      await program.methods.settlePosition(new anchor.BN(0)).accountsPartial({ payer: admin.publicKey, market, position: p.pda, ...arciumAccs(new anchor.BN(0), "position_hits") }).signers([admin]).rpc({ commitment: "confirmed", skipPreflight: true });
      continue;
    }
    await queue("position_hits", (o) => program.methods.settlePosition(o).accountsPartial({ payer: admin.publicKey, market, position: p.pda, ...arciumAccs(o, "position_hits") }), [admin]);
  }
  m = await program.account.market.fetch(market);
  assert.equal(m.status, 6, "settled");
  const payouts = await Promise.all(positions.map(async (p) => ((await program.account.position.fetch(p.pda)) as any).payout.toNumber() / 1e6));
  log("payouts (USDC):", payouts);
  // Buyer #1 pool 200 → option 0 supporters (100 & 50 stake, same tier) share 85%.
  assert.ok(Math.abs(payouts[0] + payouts[1] - 170) < 0.01, "option 0 supporters share 170");
  assert.ok(payouts[0] > payouts[1], "bigger, earlier stake earns more");
  assert.ok(Math.abs(payouts[2] - 102) < 0.01, "option 1 supporter gets 102");
  assert.equal(payouts[3], 0, "slashed position earns nothing");

  // ── 11. Claim to a fresh address with a ZK proof ──
  const recipient = Keypair.generate();
  const recTok = await ata(recipient.publicKey);
  const first = positions[0];
  const { solana: cp } = await proveClaim({ identity: ids[0], group, marketId: 0n, slot: 1, recipient: recipient.publicKey.toBytes() });
  // wrong identity cannot claim
  const { solana: bad } = await proveClaim({ identity: ids[4], group, marketId: 0n, slot: 1, recipient: recipient.publicKey.toBytes() });
  await assert.rejects(
    program.methods.claim(Array.from(bad.proof), Array.from(bad.root)).accounts({ payer: admin.publicKey, market, position: first.pda, recipientToken: recTok, escrow, tokenProgram: TOKEN_PROGRAM_ID }).preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })]).signers([admin]).rpc(),
  );
  await program.methods
    .claim(Array.from(cp.proof), Array.from(cp.root))
    .accounts({ payer: admin.publicKey, market, position: first.pda, recipientToken: recTok, escrow, tokenProgram: TOKEN_PROGRAM_ID })
    .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })])
    .signers([admin])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  const got = Number((await getAccount(conn, recTok)).amount) / 1e6;
  assert.ok(Math.abs(got - (100 + payouts[0])) < 0.01);
  log(`claimed ${got} USDC (stake + payout) to a fresh address; other identities cannot claim`);

  await program.methods
    .withdrawFees()
    .accounts({ signer: admin.publicKey, config: configPda, market, escrow, treasuryToken: treasury, tokenProgram: TOKEN_PROGRAM_ID })
    .signers([admin])
    .rpc({ commitment: "confirmed", skipPreflight: true });
  assert.equal(Number((await getAccount(conn, treasury)).amount), 61.5e6, "15% of 410");
  log("platform fee withdrawn: 61.5 USDC");

  console.log("\nMPC latency per circuit (seconds):");
  for (const [k, v] of Object.entries(timings)) {
    console.log(`  ${k.padEnd(18)} n=${v.length} avg=${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)} max=${Math.max(...v).toFixed(1)}`);
  }
  console.log("\nE2E PASSED");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("E2E FAILED:", e);
    process.exit(1);
  });
