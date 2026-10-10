/**
 * Bisik keeper (task-tracker 6.5/E-phase): drives every market through its lifecycle.
 * Each tick reads all markets and performs the single next permissionless/operator step.
 * Steps are idempotent; failures are logged and retried on the next tick.
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ed25519 } from "@noble/curves/ed25519";
import { makeProvider, program as mkProgram, pdas, PROGRAM_ID, Status, Kind, arciumAccounts, queueAndWait, anchor, STATUS_NAMES } from "@bisik/sdk";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
const RPC = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const CLUSTER = Number(process.env.ARCIUM_CLUSTER_OFFSET ?? 0);
const SERVER = process.env.SERVER_PUBLIC_URL ?? "http://localhost:8787";
const INTERVAL = Number(process.env.KEEPER_INTERVAL_MS ?? 5000);
const kpPath = (process.env.OPERATOR_KEYPAIR_PATH ?? "~/.config/solana/id.json").replace(/^~(?=\/)/, homedir());

const operator = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.OPERATOR_KEYPAIR_JSON ?? readFileSync(kpPath, "utf8"))));
const conn = new Connection(RPC, "confirmed");
const provider = makeProvider(conn, operator);
const program: any = mkProgram(provider);
const P = pdas(PROGRAM_ID);
const now = () => Math.floor(Date.now() / 1000);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const send = (b: any) => b.signers([operator]).rpc({ commitment: "confirmed", skipPreflight: true });
const queue = (circuit: any, build: (o: any) => any) => queueAndWait(provider, PROGRAM_ID, (o) => build(o).signers([operator]), 180_000).then(() => undefined);
const arc = (o: any, c: any) => arciumAccounts(PROGRAM_ID, CLUSTER, o, c);

let token: string | null = null;
async function serverToken(): Promise<string | null> {
  if (token) return token;
  try {
    const pubkey = operator.publicKey.toBase58();
    const n = await (await fetch(`${SERVER}/v1/auth/nonce`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pubkey }) })).json();
    const signature = Buffer.from(ed25519.sign(Buffer.from(n.message), operator.secretKey.slice(0, 32))).toString("base64");
    token = (await (await fetch(`${SERVER}/v1/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pubkey, nonce: n.nonce, signature }) })).json()).token;
    setTimeout(() => (token = null), 6 * 3600_000);
    return token;
  } catch {
    return null;
  }
}
async function serverPost(path: string, body: unknown = {}) {
  const t = await serverToken();
  if (!t) throw new Error("server unreachable");
  const r = await fetch(`${SERVER}${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${t}` }, body: JSON.stringify(body) });
  return r.json();
}

/** One step for one market. Returns a label of what was done, or null. */
async function step(pubkey: PublicKey, m: any): Promise<string | null> {
  const id = Number(m.id);
  const market = pubkey;
  const agg = P.agg(market);
  const auction = P.auction(market);
  const escrow = P.escrow(market);
  const t = now();

  // The creator initializes encrypted state right after create_market; only step in if it stalled.
  const fresh = t - Number(m.submitStart) < 120;
  if (!m.aggReady && !m.aggBusy && !fresh) {
    await queue("init_market_agg", (o) => program.methods.initMarketState(o).accountsPartial({ payer: operator.publicKey, market, agg, ...arc(o, "init_market_agg") }));
    return "init_market_agg";
  }
  if (m.kind === Kind.Auction && !m.auctionReady && !m.auctionBusy && !fresh) {
    await queue("init_auction", (o) => program.methods.initAuctionState(o).accountsPartial({ payer: operator.publicKey, market, auction, ...arc(o, "init_auction") }));
    return "init_auction";
  }

  if (m.status === Status.Open) {
    if (m.allocatedCount < m.positionCount && !m.aggBusy) {
      const ps = await program.account.position.all([{ memcmp: { offset: 8, bytes: market.toBase58() } }]);
      const next = ps.find((p: any) => !p.account.allocated);
      if (next) {
        await queue("allocate", (o) => program.methods.allocatePosition(o).accountsPartial({ payer: operator.publicKey, market, agg, position: next.publicKey, ...arc(o, "allocate") }));
        return "allocate";
      }
    }
    if (t >= Number(m.submitEnd) && m.allocatedCount === m.positionCount && !m.aggBusy) {
      await send(program.methods.closeSubmit().accounts({ signer: operator.publicKey, market }));
      serverPost(`/v1/admin/markets/${id}/summarize`).catch(() => {}); // background, quality model is slow
      return "close_submit";
    }
    return null;
  }
  if (m.status === Status.Closed && !m.aggBusy) {
    await queue("preview", (o) => program.methods.requestPreview(o).accountsPartial({ payer: operator.publicKey, market, agg, ...arc(o, "preview") }));
    return "preview";
  }
  if (m.status === Status.Auction) {
    if (t >= Number(m.auctionEnd) && !m.auctionBusy) {
      await queue("resolve_auction", (o) => program.methods.resolveAuction(o).accountsPartial({ payer: operator.publicKey, market, auction, ...arc(o, "resolve_auction") }));
      return "resolve_auction";
    }
    return null;
  }
  if (m.status === Status.Allocated) {
    if (m.kind === Kind.Auction) {
      const bids = await program.account.bid.all([{ memcmp: { offset: 8, bytes: market.toBase58() } }]);
      const open = bids.find((b: any) => !b.account.refunded);
      if (open) {
        const mint = (await program.account.config.fetch(P.config())).usdcMint as PublicKey;
        const buyerToken = getAssociatedTokenAddressSync(mint, open.account.buyer, true);
        await send(program.methods.settleBid().accounts({ signer: operator.publicKey, market, bid: open.publicKey, buyerToken, escrow, tokenProgram: TOKEN_PROGRAM_ID }));
        return "settle_bid";
      }
    }
    if (t >= Number(m.selectionDeadline)) {
      if (m.nextRank < 2) {
        await send(program.methods.skipSelection().accounts({ signer: operator.publicKey, market }));
        return "skip_selection";
      }
      await send(program.methods.openOutcomeWindow().accounts({ signer: operator.publicKey, market }));
      return "open_outcome_window";
    }
    return null;
  }
  if (m.status === Status.Outcome) {
    if (t < Number(m.outcomeEnd)) {
      // outcome oracle: look for deploys of opted-in teams on each buyer's chain (Solana in v1)
      if (t % 60 < INTERVAL / 1000) {
        for (let bi = 0; bi < m.buyerCount; bi++)
          for (let o = 0; o < m.optionCount; o++)
            if ((m.optedMask >> o) & 1) await serverPost("/v1/outcomes/check", { marketId: id, optionIndex: o, buyerIndex: bi }).catch(() => {});
      }
      return null;
    }
    if (m.masks.slice(0, m.buyerCount).some((x: number) => x === 0)) {
      const r = await serverPost(`/v1/admin/markets/${id}/default-outcomes`);
      return `default_outcomes ${JSON.stringify(r.defaults ?? r)}`;
    }
    if (m.openDisputes === 0 && !m.aggBusy) {
      await queue("winning_weights", (o) => program.methods.computeWeights(o).accountsPartial({ payer: operator.publicKey, market, agg, ...arc(o, "winning_weights") }));
      return "compute_weights";
    }
    return null;
  }
  if (m.status === Status.Settling) {
    const ps = await program.account.position.all([{ memcmp: { offset: 8, bytes: market.toBase58() } }]);
    const next = ps.find((p: any) => !p.account.settled && !p.account.settleBusy);
    if (!next) return null;
    if (next.account.slashed) {
      const zero = new anchor.BN(0);
      await send(program.methods.settlePosition(zero).accountsPartial({ payer: operator.publicKey, market, position: next.publicKey, ...arc(zero, "position_hits") }));
    } else {
      await queue("position_hits", (o) => program.methods.settlePosition(o).accountsPartial({ payer: operator.publicKey, market, position: next.publicKey, ...arc(o, "position_hits") }));
    }
    return "settle_position";
  }
  return null;
}

/**
 * D6: after settlement, fold each position's hit/miss into the encrypted reputation table.
 * Skipped when the reputation account is not initialized (e.g. a deployment without D6).
 * One computation per tick to stay gentle on public RPCs.
 */
const REP_FROM_MARKET = Number(process.env.KEEPER_REP_FROM_MARKET ?? 0);

async function creditReputation(market: PublicKey, marketId: number): Promise<void> {
  // Positions staked before the option/credit key fix cannot be decrypted correctly: skip them.
  if (marketId < REP_FROM_MARKET) return;
  const rep = P.reputation();
  const r: any = await program.account.reputation.fetchNullable(rep);
  if (!r || !r.ready || r.busy) return;
  const ps = await program.account.position.all([{ memcmp: { offset: 8, bytes: market.toBase58() } }]);
  for (const p of ps) {
    if (!p.account.settled) continue;
    const repCredit = P.repCredit(p.publicKey);
    if (await conn.getAccountInfo(repCredit, "confirmed")) continue;
    await queue("credit_reputation", (o) =>
      program.methods.creditReputation(o).accountsPartial({ payer: operator.publicKey, market, position: p.publicKey, rep, repCredit, ...arc(o, "credit_reputation") }),
    );
    log(`market ${(await program.account.market.fetch(market)).id} [Settled] → credit_reputation`);
    return;
  }
}

async function tick() {
  const markets = await program.account.market.all();
  for (const { publicKey, account } of markets) {
    if (account.status === Status.Settled) {
      if (!account.feesWithdrawn && (account.pools as any[]).some((x) => Number(x) > 0)) {
        try {
          const cfg = await program.account.config.fetch(P.config());
          await send(program.methods.withdrawFees().accounts({ signer: operator.publicKey, config: P.config(), market: publicKey, escrow: P.escrow(publicKey), treasuryToken: cfg.treasury, tokenProgram: TOKEN_PROGRAM_ID }));
          log(`market ${account.id} [Settled] → withdraw_fees`);
        } catch (e: any) {
          log(`market ${account.id} withdraw_fees error: ${String(e?.message ?? e).slice(0, 160)}`);
        }
      }
      await creditReputation(publicKey, Number(account.id)).catch((e) => log(`market ${account.id} credit_reputation error: ${String(e?.message ?? e).slice(0, 160)}`));
      continue;
    }
    try {
      const did = await step(publicKey, account);
      if (did) log(`market ${account.id} [${STATUS_NAMES[account.status]}] → ${did}`);
    } catch (e: any) {
      log(`market ${account.id} [${STATUS_NAMES[account.status]}] error: ${String(e?.message ?? e).slice(0, 200)}`);
    }
  }
}

const once = process.argv.includes("--once");
log(`keeper started (rpc ${RPC}, operator ${operator.publicKey.toBase58()})`);
do {
  await tick().catch((e) => log("tick failed:", e?.message ?? e));
  if (!once) await new Promise((r) => setTimeout(r, INTERVAL));
} while (!once);
