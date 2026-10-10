/**
 * Bisik API (task-tracker 6.5). Endpoints are mounted under /v1.
 * Operator trust assumptions are listed in the README (verifier, Veritas, disputes, oracle).
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { PublicKey } from "@solana/web3.js";
import { randomUUID } from "node:crypto";
import { keccak, utf8, toHex, fromHex, be32, Tier, TIER_NAMES, type SignalOption } from "@bisik/shared";
import { Veritas, sybilHints } from "@bisik/veritas";
import { visibleMask, STATUS_NAMES } from "@bisik/sdk";
import type { DB } from "./db.js";
import type { Chain } from "./chain.js";
import { seal, open } from "./sealed.js";
import { addMember, leaves, rootOf } from "./groups.js";
import { newNonce, verifyLogin, verifyToken } from "./auth.js";
import { verifyScoutProofs, createSession, pollSession, VerifyError } from "./reclaim.js";

export interface Deps {
  db: DB;
  chain: Chain | null;
  veritas: Veritas;
  cfg: {
    dataKey: string;
    jwtSecret: string;
    salt: string;
    publicUrl: string;
    reclaim: { appId: string; appSecret: string; providerId: string } | null;
    enforceLoginOnly: boolean;
    demo?: boolean;
  };
}

export function createApp(d: Deps) {
  const app = new Hono();
  app.use("*", cors());
  const now = () => Math.floor(Date.now() / 1000);
  const authed = (c: any): string | null => verifyToken(d.cfg.jwtSecret, c.req.header("authorization"));

  app.get("/v1/health", (c) => c.json({ ok: true, version: "0.1.0", veritasModel: d.veritas.modelAvailable, chain: !!d.chain }));

  // ── scout identity (F0a) ──
  app.post("/v1/identity/reclaim-session", async (c) => {
    const { identityCommitment } = await c.req.json();
    if (!/^\d+$/.test(String(identityCommitment ?? ""))) return c.json({ error: "identityCommitment must be a decimal field element" }, 400);
    if (!d.cfg.reclaim) return c.json({ error: "reclaim not configured" }, 503);
    const callback = d.cfg.publicUrl.startsWith("https://") ? `${d.cfg.publicUrl}/v1/reclaim/callback` : null;
    const s = await createSession(d.cfg.reclaim, callback, "bisik-onboarding");
    d.db.prepare("INSERT INTO sessions (id, identity_commitment, status, created_at) VALUES (?,?,?,?)").run(s.sessionId, String(identityCommitment), "PENDING", now());
    return c.json(s);
  });

  async function finishSession(sessionId: string, proofs: any[]) {
    const row = d.db.prepare("SELECT * FROM sessions WHERE id=?").get(sessionId) as any;
    if (!row || row.status === "VERIFIED") return row;
    try {
      const v = await verifyScoutProofs(proofs, { salt: d.cfg.salt, providerId: d.cfg.reclaim?.providerId ?? "", enforceLoginOnly: d.cfg.enforceLoginOnly });
      const nHex = toHex(v.sourceNullifier);
      if (d.db.prepare("SELECT 1 FROM source_nullifiers WHERE hash=?").get(nHex)) throw new VerifyError("DUPLICATE_SOURCE", "this account is already registered");
      if (d.chain) await d.chain.registerSourceNullifier(v.sourceNullifier);
      d.db.prepare("INSERT INTO source_nullifiers (hash, created_at) VALUES (?,?)").run(nHex, now());
      const epoch = d.chain ? await d.chain.currentEpoch() : 1;
      const idx = await addMember(d.db, d.chain, v.tier, epoch, row.identity_commitment);
      d.db.prepare("UPDATE sessions SET status='VERIFIED', tier=?, epoch=?, leaf_index=? WHERE id=?").run(v.tier, epoch, idx, sessionId);
    } catch (e) {
      const code = e instanceof VerifyError ? e.code : "ERROR";
      d.db.prepare("UPDATE sessions SET status='REJECTED', error=? WHERE id=?").run(code, sessionId);
    }
    return d.db.prepare("SELECT * FROM sessions WHERE id=?").get(sessionId);
  }

  app.post("/v1/reclaim/callback", async (c) => {
    const body = await c.req.json().catch(async () => JSON.parse(decodeURIComponent(await c.req.text())));
    const proofs = Array.isArray(body) ? body : [body];
    const sessionId = JSON.parse(proofs[0]?.claimData?.context ?? "{}").reclaimSessionId;
    if (!sessionId) return c.json({ error: "no session" }, 400);
    await finishSession(String(sessionId), proofs);
    return c.json({ ok: true });
  });

  app.get("/v1/identity/reclaim-session/:id", async (c) => {
    const id = c.req.param("id");
    let row = d.db.prepare("SELECT * FROM sessions WHERE id=?").get(id) as any;
    if (!row) return c.json({ error: "unknown session" }, 404);
    if (row.status === "PENDING") {
      const s = await pollSession(id).catch(() => null);
      if (s && s.proofs.length) row = await finishSession(id, s.proofs);
    }
    const out: any = { status: row.status };
    if (row.status === "VERIFIED") {
      const ls = leaves(d.db, row.tier, row.epoch);
      out.result = { tier: row.tier, tierName: TIER_NAMES[row.tier], epoch: row.epoch, leafIndex: row.leaf_index, root: rootOf(ls).root.toString() };
    }
    if (row.status === "REJECTED") out.error = row.error;
    return c.json(out);
  });

  app.get("/v1/groups/:tier/:epoch", (c) => {
    const ls = leaves(d.db, Number(c.req.param("tier")), Number(c.req.param("epoch")));
    const { root, size } = rootOf(ls);
    return c.json({ root: root.toString(), size, leaves: ls });
  });

  // ── options & reasons (F2) ──
  app.post("/v1/options/team-ref", async (c) => {
    const { marketId, teamRef, category } = await c.req.json();
    if (typeof teamRef !== "string" || teamRef.length < 3) return c.json({ error: "teamRef required" }, 400);
    const salt = randomUUID();
    const commitment = toHex(keccak(utf8(`${teamRef}|${salt}`)));
    d.db.prepare("INSERT OR REPLACE INTO team_refs (market_id, commitment, category, ciphertext) VALUES (?,?,?,?)").run(Number(marketId), commitment, Number(category ?? 0), seal(d.cfg.dataKey, JSON.stringify({ teamRef, salt })));
    return c.json({ teamCommitment: commitment });
  });

  app.post("/v1/reasons", async (c) => {
    const { marketId, optionIndex, text } = await c.req.json();
    if (typeof text !== "string" || text.trim().length < 200) return c.json({ error: "reason must be at least 200 characters" }, 400);
    const reasonHash = toHex(keccak(utf8(text)));
    const corpus = (d.db.prepare("SELECT id, ciphertext, embedding FROM reasons WHERE market_id=?").all(Number(marketId)) as any[]).map((r) => ({
      id: r.id,
      text: open(d.cfg.dataKey, r.ciphertext),
      embedding: r.embedding ? JSON.parse(r.embedding) : undefined,
    }));
    const a = await d.veritas.analyze(text, corpus);
    const id = randomUUID();
    d.db
      .prepare("INSERT INTO reasons (id, market_id, option_index, reason_hash, ciphertext, filtered_text, d, a, drs, flags, claims, embedding, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, Number(marketId), Number(optionIndex), reasonHash, seal(d.cfg.dataKey, text), a.filtered, a.D, a.A, a.drs, JSON.stringify(a.flags), JSON.stringify(a.claims.map((cl, i) => ({ ...cl, id: `${id}:${i}` }))), a.embedding ? JSON.stringify(a.embedding) : null, now());
    return c.json({ reasonId: id, reasonHash, veritas: { D: a.D, A: a.A, drs: a.drs, flags: a.flags }, claims: a.claims });
  });

  // ── markets ──
  app.get("/v1/markets/:id", async (c) => {
    if (!d.chain) return c.json({ error: "chain not configured" }, 503);
    const m = await d.chain.fetchMarket(Number(c.req.param("id")));
    if (!m) return c.json({ error: "not found" }, 404);
    const options = (d.db.prepare("SELECT category FROM team_refs WHERE market_id=?").all(Number(c.req.param("id"))) as any[]).length;
    return c.json({
      id: Number(m.id),
      kind: m.kind,
      status: STATUS_NAMES[m.status],
      category: m.category,
      submitEnd: Number(m.submitEnd),
      auctionEnd: Number(m.auctionEnd),
      outcomeEnd: Number(m.outcomeEnd),
      optionCount: m.optionCount,
      positions: m.positionCount,
      preview: m.status >= 2 ? { backed: m.preview[0], weak: m.preview[1], medium: m.preview[2], strong: m.preview[3] } : null,
      teamRefsRegistered: options,
    });
  });

  // ── buyer auth ──
  app.post("/v1/auth/nonce", async (c) => {
    const { pubkey } = await c.req.json();
    try {
      new PublicKey(pubkey);
    } catch {
      return c.json({ error: "bad pubkey" }, 400);
    }
    return c.json(newNonce(d.db, pubkey));
  });
  app.post("/v1/auth/verify", async (c) => {
    const { pubkey, nonce, signature } = await c.req.json();
    try {
      return c.json({ token: verifyLogin(d.db, d.cfg.jwtSecret, pubkey, nonce, signature) });
    } catch (e: any) {
      return c.json({ error: e.message }, 401);
    }
  });

  // ── signals (F5/F6) ──
  app.get("/v1/markets/:id/signals", async (c) => {
    const who = authed(c);
    if (!who) return c.json({ error: "login required" }, 401);
    if (!d.chain) return c.json({ error: "chain not configured" }, 503);
    const id = Number(c.req.param("id"));
    const m = await d.chain.fetchMarket(id);
    if (!m) return c.json({ error: "not found" }, 404);
    const bi = (m.buyers as PublicKey[]).slice(0, m.buyerCount).findIndex((b) => b.toBase58() === who);
    if (bi < 0) return c.json({ error: "no allocation for this buyer" }, 403);
    const mask = visibleMask({ optionCount: m.optionCount, kind: m.kind, buyers: m.buyers, winners: m.winners, hidden: m.hidden }, bi);
    const signals = await buildSignals(id, m.optionCount, mask);
    return c.json({ buyerIndex: bi, visibleMask: mask, options: signals });
  });

  /**
   * Signals per visible option. Each onchain position is matched to the reason whose hash it
   * committed to; the server knows the option a reason backs (Veritas trust assumption).
   * Two positions may commit to the same text (a copied reason): both count, both are flagged.
   */
  async function buildSignals(marketId: number, optionCount: number, mask: number): Promise<SignalOption[]> {
    const positions = d.chain ? await d.chain.fetchPositions(marketId) : [];
    const reasons = d.db.prepare("SELECT * FROM reasons WHERE market_id=? ORDER BY created_at").all(marketId) as any[];
    const refs = d.db.prepare("SELECT * FROM team_refs WHERE market_id=?").all(marketId) as any[];
    // pair each position with one reason row (rows with the same hash are consumed in order)
    const used = new Set<string>();
    const pairs: { p: any; r: any }[] = [];
    for (const p of positions.sort((a: any, b: any) => Number(a.stakedAt) - Number(b.stakedAt))) {
      if (p.slashed) continue;
      const h = toHex(Uint8Array.from(p.reasonHash));
      const r = reasons.find((x) => x.reason_hash === h && !used.has(x.id)) ?? reasons.find((x) => x.reason_hash === h);
      if (!r) continue;
      used.add(r.id);
      pairs.push({ p, r });
    }
    const weight = (opt: number) => pairs.filter((x) => x.r.option_index === opt).reduce((s, x) => s + Number(x.p.weight), 0);
    let maxW = 1;
    for (let i = 0; i < optionCount; i++) maxW = Math.max(maxW, weight(i));
    const out: SignalOption[] = [];
    for (let i = 0; i < optionCount; i++) {
      if (!(mask & (1 << i))) continue;
      const ps = pairs.filter((x) => x.r.option_index === i);
      const tierDist: [number, number, number] = [0, 0, 0];
      for (const x of ps) tierDist[x.p.tier as 0 | 1 | 2]++;
      const opt = d.chain ? await d.chain.fetchOption(marketId, i) : null;
      const ref = opt ? refs.find((x) => fromHex(x.commitment).every((v: number, k: number) => v === opt.teamCommitment[k])) : undefined;
      const cached = d.db.prepare("SELECT json FROM summaries WHERE market_id=? AND option_index=?").get(marketId, i) as any;
      out.push({
        index: i,
        teamRef: ref ? JSON.parse(open(d.cfg.dataKey, ref.ciphertext)).teamRef : `option #${i}`,
        score: Math.round((weight(i) / maxW) * 100) / 100,
        nScouts: ps.length,
        tierDist,
        summary: cached ? JSON.parse(cached.json) : undefined,
        claims: ps.flatMap((x) => JSON.parse(x.r.claims)),
        reasons: ps.map((x) => ({ filteredText: x.r.filtered_text, D: x.r.d, A: x.r.a, flags: JSON.parse(x.r.flags) })),
      });
    }
    return out;
  }

  /** Background: pros/cons per option with the quality model (call after close). */
  app.post("/v1/admin/markets/:id/summarize", async (c) => {
    if (!isOperator(c)) return c.json({ error: "operator only" }, 403);
    const id = Number(c.req.param("id"));
    const reasons = d.db.prepare("SELECT option_index, ciphertext FROM reasons WHERE market_id=?").all(id) as any[];
    const opts = [...new Set(reasons.map((r) => r.option_index))];
    for (const o of opts) {
      const s = await d.veritas.summarize(reasons.filter((r) => r.option_index === o).map((r) => open(d.cfg.dataKey, r.ciphertext)));
      d.db.prepare("INSERT OR REPLACE INTO summaries (market_id, option_index, json) VALUES (?,?,?)").run(id, o, JSON.stringify(s));
    }
    const hints = sybilHints(reasons.map((r, i) => ({ id: String(i), text: open(d.cfg.dataKey, r.ciphertext) })));
    return c.json({ summarized: opts.length, sybilClusters: hints.length });
  });

  /**
   * D-05 default rule, run by the keeper after the outcome window: a buyer who marked nothing
   * gets the strongest signal they could see. Strength = public stake weight of positions whose
   * reasons back that option (the operator's Veritas view; disclosed trust assumption).
   */
  app.post("/v1/admin/markets/:id/default-outcomes", async (c) => {
    if (!isOperator(c) || !d.chain) return c.json({ error: "operator only" }, 403);
    const id = Number(c.req.param("id"));
    const m = await d.chain.fetchMarket(id);
    if (!m) return c.json({ error: "not found" }, 404);
    const done: { buyerIndex: number; option: number }[] = [];
    for (let bi = 0; bi < m.buyerCount; bi++) {
      if (m.masks[bi] !== 0) continue;
      const mask = visibleMask({ optionCount: m.optionCount, kind: m.kind, buyers: m.buyers, winners: m.winners, hidden: m.hidden }, bi);
      const sig = await buildSignals(id, m.optionCount, mask);
      const best = sig.sort((a, b) => b.score - a.score || a.index - b.index)[0];
      const option = best && best.score > 0 ? best.index : sig[0]?.index ?? Math.max(0, Math.log2(mask & -mask));
      await d.chain.setDefaultOutcome(id, bi, option);
      done.push({ buyerIndex: bi, option });
    }
    return c.json({ defaults: done });
  });

  // ── D-15 introductions ──
  app.post("/v1/intro", async (c) => {
    const who = authed(c);
    if (!who || !d.chain) return c.json({ error: "login required" }, 401);
    const { marketId, optionIndex, buyerX25519 } = await c.req.json();
    const m = await d.chain.fetchMarket(Number(marketId));
    const exclusive = m && (m.kind === 0 ? m.creator.toBase58() === who : (m.winners as PublicKey[]).some((w) => w.toBase58() === who));
    if (!exclusive) return c.json({ error: "only exclusive (winning) buyers may request an introduction (D-15)" }, 403);
    const id = randomUUID();
    d.db.prepare("INSERT INTO intros (id, market_id, option_index, buyer, buyer_x25519, status, created_at) VALUES (?,?,?,?,?,?,?)").run(id, Number(marketId), Number(optionIndex), who, String(buyerX25519), "REQUESTED", now());
    return c.json({ requestId: id });
  });
  app.get("/v1/intro/open/:marketId/:option", (c) =>
    c.json(d.db.prepare("SELECT id, buyer_x25519, status FROM intros WHERE market_id=? AND option_index=?").all(Number(c.req.param("marketId")), Number(c.req.param("option")))),
  );
  /** Scout answers with contact details encrypted to the buyer's x25519 key (server cannot read them). */
  app.post("/v1/intro/:id/respond", async (c) => {
    const { accept, contactCiphertext } = await c.req.json();
    d.db.prepare("UPDATE intros SET status=?, contact_ciphertext=? WHERE id=?").run(accept ? "ACCEPTED" : "DECLINED", accept ? String(contactCiphertext) : null, c.req.param("id"));
    return c.json({ ok: true });
  });
  app.get("/v1/intro/:id", (c) => {
    const who = authed(c);
    const row = d.db.prepare("SELECT * FROM intros WHERE id=?").get(c.req.param("id")) as any;
    if (!row || row.buyer !== who) return c.json({ error: "not found" }, 404);
    return c.json({ status: row.status, contactCiphertext: row.contact_ciphertext });
  });

  // ── outcomes (F7) ──
  app.post("/v1/outcomes/check", async (c) => {
    if (!d.chain) return c.json({ error: "chain not configured" }, 503);
    const { marketId, optionIndex, buyerIndex } = await c.req.json();
    const m = await d.chain.fetchMarket(Number(marketId));
    const opt = await d.chain.fetchOption(Number(marketId), Number(optionIndex));
    if (!m || !opt) return c.json({ error: "not found" }, 404);
    if (!opt.optedIn) return c.json({ found: false, reason: "team has not registered a deploy wallet (opt-in)" });
    const since = Number(m.outcomeEnd) - Number(m.outcomeLen);
    const deploys = await d.chain.findDeploys(opt.deployWallet, since);
    if (!deploys.length) return c.json({ found: false });
    const evidence = keccak(utf8(deploys[0]));
    const sig = await d.chain.recordOutcome(Number(marketId), Number(buyerIndex), Number(optionIndex), 0, evidence);
    return c.json({ found: true, txSig: deploys[0], evidenceHash: toHex(evidence), recordSig: sig });
  });

  // ── disputes (F8) — evidence store; the onchain dispute is opened by the buyer ──
  app.post("/v1/disputes", async (c) => {
    const who = authed(c);
    if (!who) return c.json({ error: "login required" }, 401);
    const { marketId, nullifier, claimId, evidence } = await c.req.json();
    const claim = (d.db.prepare("SELECT claims FROM reasons WHERE market_id=?").all(Number(marketId)) as any[])
      .flatMap((r) => JSON.parse(r.claims))
      .find((cl: any) => cl.id === claimId);
    if (!claim) return c.json({ error: "unknown claim" }, 404);
    if (claim.kind !== "verifiable") return c.json({ error: "opinions cannot be disputed; only verifiable claims" }, 400);
    const id = randomUUID();
    d.db.prepare("INSERT INTO disputes (id, market_id, nullifier, buyer, claim_id, evidence, status, created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, Number(marketId), String(nullifier), who, claimId, seal(d.cfg.dataKey, String(evidence)), "OPEN", now());
    return c.json({ disputeId: id, claimHash: toHex(keccak(utf8(claim.text))), evidenceHash: toHex(keccak(utf8(String(evidence)))) });
  });
  app.post("/v1/disputes/:id/respond", async (c) => {
    const { response } = await c.req.json();
    d.db.prepare("UPDATE disputes SET response=? WHERE id=?").run(seal(d.cfg.dataKey, String(response)), c.req.param("id"));
    return c.json({ ok: true });
  });

  // ── operator ──
  function isOperator(c: any) {
    const who = authed(c);
    return !!who && !!d.chain && who === d.chain.operator.toBase58();
  }
  app.post("/v1/admin/buyers/verify", async (c) => {
    if (!isOperator(c) || !d.chain) return c.json({ error: "operator only" }, 403);
    const { pubkey, label } = await c.req.json();
    const sig = await d.chain.registerBuyer(new PublicKey(pubkey), keccak(utf8(`buyer|${label ?? pubkey}`)));
    return c.json({ sig });
  });
  /**
   * Demo only (BISIK_DEMO=1): add fictional scout commitments to a tier group without Reclaim,
   * so the seeded demo can run without real GitHub accounts. Disabled in normal operation.
   */
  app.post("/v1/admin/demo/members", async (c) => {
    if (!d.cfg.demo) return c.json({ error: "demo mode off" }, 404);
    if (!isOperator(c)) return c.json({ error: "operator only" }, 403);
    const { tier, commitments } = await c.req.json();
    const epoch = d.chain ? await d.chain.currentEpoch() : 1;
    const idx: number[] = [];
    for (const cm of commitments as string[]) {
      d.db.prepare("INSERT OR IGNORE INTO group_leaves (tier, epoch, idx, commitment) VALUES (?,?,?,?)").run(Number(tier), epoch, leaves(d.db, Number(tier), epoch).length, String(cm));
    }
    const ls = leaves(d.db, Number(tier), epoch);
    const { root, size } = rootOf(ls);
    if (d.chain) await d.chain.publishGroupRoot(Number(tier), epoch, be32(root), size);
    for (const cm of commitments as string[]) idx.push(ls.indexOf(String(cm)));
    return c.json({ epoch, root: root.toString(), size, leafIndexes: idx });
  });
  app.get("/v1/admin/disputes", (c) => {
    if (!isOperator(c)) return c.json({ error: "operator only" }, 403);
    const rows = d.db.prepare("SELECT * FROM disputes ORDER BY created_at DESC").all() as any[];
    return c.json(rows.map((r) => ({ ...r, evidence: open(d.cfg.dataKey, r.evidence), response: r.response ? open(d.cfg.dataKey, r.response) : null })));
  });

  return app;
}

export { Tier };
