/**
 * Bisik demo seeder (task H1). All teams, scouts and reasons are fictional and labelled DEMO.
 *
 *   pnpm --filter @bisik/scripts seed            # setup + markets + anonymous stakes
 *   pnpm --filter @bisik/scripts seed bids <id>  # demo buyers place sealed bids (market in Auction)
 *   pnpm --filter @bisik/scripts seed select <id> ecosystem-a 0   # winner hides options (in rank order)
 *   pnpm --filter @bisik/scripts seed buyflat <id> ecosystem-c    # flat purchase of the remainder
 *
 * Needs: program deployed (localnet via `arcium localnet`, or devnet), the API server running
 * with BISIK_DEMO=1, and the operator keypair at OPERATOR_KEYPAIR_PATH.
 * The keeper then drives the markets through their lifecycle.
 * Local demo state (buyer keys, scout identities, mint) is kept in scripts/.demo/ (gitignored).
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ed25519 } from "@noble/curves/ed25519";
import { Identity } from "@semaphore-protocol/identity";
import {
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getArciumProgram,
  getCompDefAccOffset,
  getLookupTableAddress,
  getMXEAccAddress,
  uploadCircuit,
} from "@arcium-hq/client";
import { makeProvider, program as mkProgram, pdas, PROGRAM_ID, CIRCUITS, arciumAccounts, queueAndWait, encryptForMxe, fetchMxeKey, computeBudget, anchor, Status } from "@bisik/sdk";
import { buildGroup, proveStake } from "@bisik/zk";
import { keccak, utf8, Tier, fromHex } from "@bisik/shared";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const RPC = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const CLUSTER = Number(process.env.ARCIUM_CLUSTER_OFFSET ?? 0);
const SERVER = process.env.SERVER_PUBLIC_URL ?? "http://localhost:8787";
const LOCAL = /127\.0\.0\.1|localhost/.test(RPC);
/** Public base URL hosting contracts/build/*.arcis (devnet). Empty = upload circuits onchain (localnet). */
const CIRCUIT_URL = process.env.BISIK_CIRCUIT_BASE_URL ?? "";
const UPLOAD = CIRCUIT_URL === "";
const SUBMIT_SECS = Number(process.env.SEED_SUBMIT_SECS ?? 900);
const DEMO_DIR = fileURLToPath(new URL("./.demo/", import.meta.url));
const kpPath = (process.env.OPERATOR_KEYPAIR_PATH ?? "~/.config/solana/id.json").replace(/^~(?=\/)/, homedir());

const operator = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(kpPath, "utf8"))));
const conn = new Connection(RPC, "confirmed");
const provider = makeProvider(conn, operator);
const program: any = mkProgram(provider);
const P = pdas(PROGRAM_ID);
const USDC = (x: number) => new anchor.BN(Math.round(x * 1e6));
const log = (...a: unknown[]) => console.log("  ·", ...a);
const rpc = (b: any, signers: Keypair[] = [operator]) => b.signers(signers).rpc({ commitment: "confirmed", skipPreflight: true });
const exists = async (k: PublicKey) => (await conn.getAccountInfo(k, "confirmed")) !== null;

mkdirSync(DEMO_DIR, { recursive: true });
function demoKeypair(name: string): Keypair {
  const f = `${DEMO_DIR}${name}.json`;
  if (existsSync(f)) return Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(f, "utf8"))));
  const k = Keypair.generate();
  writeFileSync(f, JSON.stringify(Array.from(k.secretKey)));
  return k;
}
/** Write public (non-secret) values into the root .env, replacing earlier values. */
function setEnv(vals: Record<string, string>) {
  const f = fileURLToPath(new URL("../.env", import.meta.url));
  let txt = readFileSync(f, "utf8");
  for (const [k, v] of Object.entries(vals)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    txt = re.test(txt) ? txt.replace(re, `${k}=${v}`) : `${txt.replace(/\n?$/, "\n")}${k}=${v}\n`;
  }
  writeFileSync(f, txt);
}
function state(): Record<string, any> {
  const f = `${DEMO_DIR}state.json`;
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
}
function saveState(s: Record<string, any>) {
  writeFileSync(`${DEMO_DIR}state.json`, JSON.stringify(s, null, 2));
}

let token: string | null = null;
async function api(path: string, body?: unknown) {
  if (!token && path.startsWith("/v1/admin")) {
    const pubkey = operator.publicKey.toBase58();
    const n = await (await fetch(`${SERVER}/v1/auth/nonce`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pubkey }) })).json();
    const signature = Buffer.from(ed25519.sign(Buffer.from(n.message), operator.secretKey.slice(0, 32))).toString("base64");
    token = (await (await fetch(`${SERVER}/v1/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pubkey, nonce: n.nonce, signature }) })).json()).token;
  }
  const r = await fetch(`${SERVER}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path}: ${JSON.stringify(j)}`);
  return j;
}
async function fundSol(to: PublicKey, sol: number) {
  if ((await conn.getBalance(to)) >= sol * 1e9 * 0.5) return;
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: operator.publicKey, toPubkey: to, lamports: Math.round(sol * 1e9) }));
  await sendAndConfirmTransaction(conn, tx, [operator], { commitment: "confirmed" });
}

// ── fictional demo content ──
const SCOUTS = ["ayu", "bima", "citra", "dewa", "eka"].map((s) => new Identity(`bisik-demo-scout-${s}`));
const MARKETS = [
  {
    kind: 1,
    category: 1,
    question: "Which DeFi teams from recent hackathons are worth courting before they pick a chain? (DEMO)",
    teams: ["Lumen Labs: zk light client for cross-chain lending (DEMO)", "Garuda Pay: stablecoin payroll for Indonesian SMEs (DEMO)", "Rinjani: onchain FX hedging for importers (DEMO)"],
    stakes: [
      { scout: 0, slot: 1, option: 0, amount: 100 },
      { scout: 1, slot: 1, option: 0, amount: 50 }, // copies scout 0's reason: Veritas flags likely_duplicate
      { scout: 2, slot: 1, option: 1, amount: 80 },
      { scout: 3, slot: 1, option: 2, amount: 30 },
    ],
    initialPool: 0,
  },
  {
    kind: 0,
    category: 2,
    question: "Which consumer apps should our grants team meet this month? (DEMO)",
    teams: ["Pasar Kita: social commerce with USDC checkout (DEMO)", "Sawah: crop-yield data marketplace (DEMO)"],
    stakes: [
      { scout: 0, slot: 1, option: 1, amount: 40 },
      { scout: 4, slot: 1, option: 0, amount: 60 },
    ],
    initialPool: 500,
  },
];
const REASONS: Record<string, string> = {
  "0:0": "Lumen Labs shipped a working zk light client on testnet during the hackathon; the demo verified real block headers and the repo shows steady commits from three engineers over six weeks. They told mentors they are still comparing chains for their lending launch and want grant support for an audit. (DEMO)",
  "0:1": "Garuda Pay already runs a pilot paying salaries in stablecoins for a handful of small businesses; the founders come from a payments company and understand compliance. They have not chosen a settlement chain yet and care most about fees and local off-ramps. (DEMO)",
  "0:2": "Rinjani built an onchain FX hedge for importers with a clear buyer: small trading firms that lose margin to currency swings. The prototype is rough but the problem is real and the team is open to any chain that gives them reliable oracles. (DEMO)",
  "1:0": "Pasar Kita has strong traction signals for a consumer app: an active seller community and a checkout flow that already accepts USDC in a closed beta. The team is small but ships every week and is looking for grant introductions. (DEMO)",
  "1:1": "Sawah collects crop-yield data from farmer cooperatives and wants to sell it to insurers. The data pipeline works and they have letters of intent from two cooperatives; they have not decided where to anchor the data marketplace. (DEMO)",
};

async function setup() {
  const st = state();
  const mxeKey = await fetchMxeKey(provider);
  // 1. computation definitions
  const arcium = getArciumProgram(provider);
  const mxeAccount = getMXEAccAddress(PROGRAM_ID);
  const mxe = await arcium.account.mxeAccount.fetch(mxeAccount);
  const lut = getLookupTableAddress(PROGRAM_ID, mxe.lutOffsetSlot);
  for (const c of CIRCUITS) {
    const compDef = PublicKey.findProgramAddressSync([getArciumAccountBaseSeed("ComputationDefinitionAccount"), PROGRAM_ID.toBuffer(), getCompDefAccOffset(c)], getArciumProgramId())[0];
    if (await exists(compDef)) continue;
    const m = "init" + c.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("") + "CompDef";
    await rpc(program.methods[m[0].toLowerCase() + m.slice(1)](CIRCUIT_URL).accounts({ compDefAccount: compDef, payer: operator.publicKey, mxeAccount, addressLookupTable: lut }));
    if (UPLOAD) await uploadCircuit(provider, c, PROGRAM_ID, readFileSync(fileURLToPath(new URL(`../contracts/build/${c}.arcis`, import.meta.url))), true);
    log("comp def", c);
  }
  // 2. config + mock USDC (D-27)
  if (!(await exists(P.config()))) {
    const mint = await createMint(conn, operator, operator.publicKey, null, 6);
    const ata = async (o: PublicKey) => (await getOrCreateAssociatedTokenAccount(conn, operator, mint, o, true)).address;
    const treasury = await ata(demoKeypair("treasury").publicKey);
    const charity = await ata(demoKeypair("charity").publicKey);
    await rpc(
      program.methods
        .initConfig({ operator: operator.publicKey, treasury, charity, feeBps: 1500, teamBps: 500, epochLen: new anchor.BN(30 * 86400), kMin: 5, demoMode: true })
        .accounts({ admin: operator.publicKey, config: P.config(), usdcMint: mint }),
    );
    st.mint = mint.toBase58();
    setEnv({ USDC_MINT: mint.toBase58(), VITE_USDC_MINT: mint.toBase58() });
    log("config + mock USDC", mint.toBase58());
  }
  const cfg = await program.account.config.fetch(P.config());
  const mint: PublicKey = cfg.usdcMint;
  st.mint = mint.toBase58();
  const ata = async (o: PublicKey) => (await getOrCreateAssociatedTokenAccount(conn, operator, mint, o, true)).address;

  // 3. anonymous Gold group (fictional scouts; demo endpoint skips Reclaim)
  const g = await api("/v1/admin/demo/members", { tier: Tier.Gold, commitments: SCOUTS.map((s) => s.commitment.toString()) });
  st.scouts = SCOUTS.map((s, i) => ({ name: ["ayu", "bima", "citra", "dewa", "eka"][i], commitment: s.commitment.toString() }));
  log(`Gold group: ${g.size} members, epoch ${g.epoch}`);

  // 4. demo buyers (ecosystem pseudonyms)
  st.buyers = [];
  for (const name of ["ecosystem-a", "ecosystem-b", "ecosystem-c"]) {
    const b = demoKeypair(`buyer-${name}`);
    await fundSol(b.publicKey, LOCAL ? 2 : 0.1);
    const tok = await ata(b.publicKey);
    await mintTo(conn, operator, mint, tok, operator, 2_000e6);
    if (!(await exists(P.buyer(b.publicKey)))) await rpc(program.methods.registerBuyer(b.publicKey, Array.from(keccak(utf8(`buyer|${name}`)))).accounts({ operator: operator.publicKey, config: P.config(), buyer: P.buyer(b.publicKey) }));
    st.buyers.push({ name, pubkey: b.publicKey.toBase58(), keyFile: `scripts/.demo/buyer-${name}.json` });
  }
  log("3 verified demo buyers, 2,000 mock USDC each");
  saveState(st);

  // 5. markets with anonymous stakes
  const opTok = await ata(operator.publicKey);
  await mintTo(conn, operator, mint, opTok, operator, 10_000e6);
  st.markets = st.markets ?? [];
  for (const spec of MARKETS) {
    const cfgNow = await program.account.config.fetch(P.config());
    const id = Number(cfgNow.marketCount);
    const market = P.market(id);
    await rpc(
      program.methods
        .createMarket({
          kind: spec.kind,
          category: spec.category,
          questionHash: Array.from(keccak(utf8(spec.question))),
          submitLen: new anchor.BN(SUBMIT_SECS),
          auctionLen: new anchor.BN(Number(process.env.SEED_AUCTION_SECS ?? 600)),
          selectionLen: new anchor.BN(Number(process.env.SEED_SELECTION_SECS ?? 300)),
          outcomeLen: new anchor.BN(Number(process.env.SEED_OUTCOME_SECS ?? 900)),
          disputeLen: new anchor.BN(Number(process.env.SEED_DISPUTE_SECS ?? 300)),
          minStake: USDC(10),
          maxStake: USDC(500),
          minReasonLen: 200,
          b: 2,
          x: 3,
          reservePrice: USDC(100),
          flatPrice: USDC(90),
          earlyBonusBps: 15000,
          initialPool: USDC(spec.initialPool),
        })
        .accounts({ creator: operator.publicKey, config: P.config(), market, agg: P.agg(market), auction: P.auction(market), escrow: P.escrow(market), usdcMint: mint, creatorToken: opTok, tokenProgram: TOKEN_PROGRAM_ID }),
    );
    const mi = MARKETS.indexOf(spec);
    // encrypted state (the keeper would also do this)
    await queueAndWait(provider, PROGRAM_ID, (o) => program.methods.initMarketState(o).accountsPartial({ payer: operator.publicKey, market, agg: P.agg(market), ...arciumAccounts(PROGRAM_ID, CLUSTER, o, "init_market_agg") }).signers([operator]));
    if (spec.kind === 1)
      await queueAndWait(provider, PROGRAM_ID, (o) => program.methods.initAuctionState(o).accountsPartial({ payer: operator.publicKey, market, auction: P.auction(market), ...arciumAccounts(PROGRAM_ID, CLUSTER, o, "init_auction") }).signers([operator]));
    for (let i = 0; i < spec.teams.length; i++) {
      const { teamCommitment } = await api("/v1/options/team-ref", { marketId: id, teamRef: spec.teams[i], category: spec.category });
      await rpc(program.methods.addOption(Array.from(fromHex(teamCommitment)), spec.category).accounts({ payer: operator.publicKey, market, option: P.option(market, i) }));
    }
    const leaves: string[] = (await api(`/v1/groups/${Tier.Gold}/${g.epoch}`)).leaves;
    const group = buildGroup(leaves);
    for (const s of spec.stakes) {
      const wallet = Keypair.generate(); // fresh stake wallet per position
      await fundSol(wallet.publicKey, 0.02);
      const wTok = await ata(wallet.publicKey);
      await mintTo(conn, operator, mint, wTok, operator, s.amount * 1e6);
      const reason = REASONS[`${mi}:${s.option}`];
      const r = await api("/v1/reasons", { marketId: id, optionIndex: s.option, text: reason });
      const opt = encryptForMxe(mxeKey, [BigInt(s.option)]);
      const credit = encryptForMxe(mxeKey, [SCOUTS[s.scout].commitment]);
      const payload = {
        marketId: BigInt(id),
        slot: s.slot,
        amount: BigInt(s.amount * 1e6),
        encOptionHash: keccak(opt.pubkey, opt.nonce, Uint8Array.from(opt.ciphertexts[0])),
        reasonHash: fromHex(r.reasonHash),
        creditHash: keccak(Uint8Array.from(credit.ciphertexts[0]), credit.nonce),
      };
      const { solana } = await proveStake({ identity: SCOUTS[s.scout], group, payload });
      await rpc(
        program.methods
          .stake({
            slot: s.slot,
            amount: USDC(s.amount),
            tier: Tier.Gold,
            epoch: g.epoch,
            proof: Array.from(solana.proof),
            root: Array.from(solana.root),
            nullifier: Array.from(solana.nullifier),
            encPubkey: Array.from(opt.pubkey),
            encNonce: opt.nonceBN,
            encOption: Array.from(opt.ciphertexts[0]),
            reasonHash: Array.from(payload.reasonHash),
            creditCt: Array.from(credit.ciphertexts[0]),
            creditNonce: credit.nonceBN,
          })
          .accounts({ payer: wallet.publicKey, config: P.config(), market, group: P.group(Tier.Gold, g.epoch), position: P.position(market, solana.nullifier), payerToken: wTok, escrow: P.escrow(market), tokenProgram: TOKEN_PROGRAM_ID })
          .preInstructions([computeBudget()]),
        [wallet],
      );
    }
    st.markets.push({ id, kind: spec.kind === 1 ? "auction" : "exclusive", question: spec.question });
    saveState(st);
    log(`market ${id} (${spec.kind === 1 ? "auction" : "exclusive"}): ${spec.teams.length} options, ${spec.stakes.length} anonymous stakes`);
  }
  log("done. Start the keeper to allocate, close, preview and settle.");
}

async function bids(id: number) {
  const market = P.market(id);
  const m = await program.account.market.fetch(market);
  if (m.status !== Status.Auction) throw new Error(`market ${id} is not in the auction phase`);
  const mxeKey = await fetchMxeKey(provider);
  const plan = [
    { name: "ecosystem-a", amount: 300, ceiling: 400 },
    { name: "ecosystem-b", amount: 200, ceiling: 250 },
    { name: "ecosystem-c", amount: 120, ceiling: 150 },
  ];
  for (const p of plan) {
    const buyer = demoKeypair(`buyer-${p.name}`);
    const bid = P.bid(market, buyer.publicKey);
    const tok = (await getOrCreateAssociatedTokenAccount(conn, operator, (await program.account.config.fetch(P.config())).usdcMint, buyer.publicKey, true)).address;
    if (!(await exists(bid)))
      await rpc(program.methods.openBid(USDC(p.ceiling)).accounts({ payer: buyer.publicKey, config: P.config(), buyerProfile: P.buyer(buyer.publicKey), market, bid, payerToken: tok, escrow: P.escrow(market), tokenProgram: TOKEN_PROGRAM_ID }), [buyer]);
    const enc = encryptForMxe(mxeKey, [BigInt(p.amount * 1e6)]);
    await queueAndWait(provider, PROGRAM_ID, (o) =>
      program.methods
        .placeBid(o, Array.from(enc.pubkey), enc.nonceBN, Array.from(enc.ciphertexts[0]))
        .accountsPartial({ payer: buyer.publicKey, market, auction: P.auction(market), bid, ...arciumAccounts(PROGRAM_ID, CLUSTER, o, "place_bid") })
        .signers([buyer]),
    );
    log(`${p.name}: sealed bid placed (ceiling ${p.ceiling} USDC public, amount encrypted)`);
  }
}

/** Winner of rank `rank` hides `options` (comma list), or the flat buyer joins. */
async function select(id: number, name: string, options: number[]) {
  const buyer = demoKeypair(`buyer-${name}`);
  await rpc(program.methods.selectHidden(options).accounts({ buyer: buyer.publicKey, market: P.market(id) }), [buyer]);
  log(`${name} hid options [${options}]`);
}
async function buyFlat(id: number, name: string) {
  const buyer = demoKeypair(`buyer-${name}`);
  const market = P.market(id);
  const mint = (await program.account.config.fetch(P.config())).usdcMint;
  const tok = (await getOrCreateAssociatedTokenAccount(conn, operator, mint, buyer.publicKey, true)).address;
  await rpc(program.methods.buyFlat().accounts({ payer: buyer.publicKey, config: P.config(), buyerProfile: P.buyer(buyer.publicKey), market, payerToken: tok, escrow: P.escrow(market), tokenProgram: TOKEN_PROGRAM_ID }), [buyer]);
  log(`${name} bought the remaining signals at the flat price`);
}

const [cmd, arg, arg2, arg3] = process.argv.slice(2);
(cmd === "bids"
  ? bids(Number(arg))
  : cmd === "select"
    ? select(Number(arg), arg2, (arg3 ?? "").split(",").filter(Boolean).map(Number))
    : cmd === "buyflat"
      ? buyFlat(Number(arg), arg2)
      : setup())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("SEED FAILED:", e);
    process.exit(1);
  });
