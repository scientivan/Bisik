/**
 * D6 / F10: public reputation epoch view (`GET /v1/reputation/epoch`).
 *
 * Privacy: the request carries no identity. It returns only data that is already public
 * onchain (epoch timing and the MPC-revealed, sorted `(tag | level)` list). The browser maps
 * the list to its own commitment locally (`apps/web/src/lib/reputation.ts`), so the server
 * never learns which commitment asked. Hit/miss/hoax counters stay encrypted in the MXE.
 */
import type { Hono } from "hono";
import { Connection, Keypair } from "@solana/web3.js";
import { makeProvider, program as mkProgram, pdas, PROGRAM_ID } from "@bisik/sdk";

export interface EpochSnapshot {
  currentEpoch: number;
  epochStart: number;
  epochLen: number;
  demoMode: boolean;
  /** null when the reputation table is not initialized (deployment without D6). */
  rep: null | { ready: boolean; busy: boolean; tiersEpoch: number; tiersReady: boolean; tiers: bigint[] };
}
export type ReputationSource = () => Promise<EpochSnapshot>;

export type TiersStatus = "none" | "computing" | "ready";

export interface ReputationEpochView {
  currentEpoch: number;
  epochStart: number;
  epochLen: number;
  epochEnd: number;
  secondsLeft: number;
  /** The program allows `rotate_epoch` now (time elapsed, or demo mode). */
  rotationAllowed: boolean;
  demoMode: boolean;
  reputation: {
    enabled: boolean;
    /** Latest reveal: the epoch its levels apply to, or null when there was none. */
    tiersEpoch: number | null;
    /** Status of the reveal for `currentEpoch + 1`. */
    nextStatus: TiersStatus;
    /** Non-zero `(tag << 8 | level)` entries of the latest completed reveal, decimal strings. */
    entries: string[];
  };
}

export function reputationView(s: EpochSnapshot, now: number): ReputationEpochView {
  const epochEnd = s.epochStart + s.epochLen;
  const next = s.currentEpoch + 1;
  const r = s.rep;
  const nextStatus: TiersStatus = !r || r.tiersEpoch !== next ? "none" : r.tiersReady ? "ready" : "computing";
  const done = !!r && r.tiersReady && r.tiersEpoch > 0;
  return {
    currentEpoch: s.currentEpoch,
    epochStart: s.epochStart,
    epochLen: s.epochLen,
    epochEnd,
    secondsLeft: Math.max(0, epochEnd - now),
    rotationAllowed: s.demoMode || now >= epochEnd,
    demoMode: s.demoMode,
    reputation: {
      enabled: !!r?.ready,
      tiersEpoch: done ? r!.tiersEpoch : null,
      nextStatus,
      entries: done ? r!.tiers.filter((x) => x !== 0n).map((x) => x.toString()) : [],
    },
  };
}

/** Read-only chain source: a throwaway wallet, no signing. Cached for 10 s (public RPC limits). */
export function solanaReputationSource(rpcUrl: string, ttlMs = 10_000): ReputationSource {
  const program: any = mkProgram(makeProvider(new Connection(rpcUrl, "confirmed"), Keypair.generate()));
  const P = pdas(PROGRAM_ID);
  let cached: { at: number; value: Promise<EpochSnapshot> } | null = null;
  const load = async (): Promise<EpochSnapshot> => {
    const [cfg, rep]: any[] = await Promise.all([
      program.account.config.fetch(P.config()),
      program.account.reputation.fetchNullable(P.reputation()).catch(() => null),
    ]);
    return {
      currentEpoch: Number(cfg.currentEpoch),
      epochStart: Number(cfg.epochStart),
      epochLen: Number(cfg.epochLen),
      demoMode: !!cfg.demoMode,
      rep: rep && {
        ready: rep.ready,
        busy: rep.busy,
        tiersEpoch: Number(rep.tiersEpoch),
        tiersReady: rep.tiersReady,
        tiers: (rep.tiers as any[]).map((x) => BigInt(x.toString())),
      },
    };
  };
  return () => {
    if (!cached || Date.now() - cached.at > ttlMs) {
      const value = load();
      cached = { at: Date.now(), value };
      value.catch(() => (cached = null));
    }
    return cached.value;
  };
}

export function registerReputationRoutes(app: Hono, source: ReputationSource | null, now = () => Math.floor(Date.now() / 1000)) {
  app.get("/v1/reputation/epoch", async (c) => {
    if (!source) return c.json({ error: "chain not configured" }, 503);
    try {
      return c.json(reputationView(await source(), now()));
    } catch {
      return c.json({ error: "could not read epoch state from the chain" }, 502);
    }
  });
}
