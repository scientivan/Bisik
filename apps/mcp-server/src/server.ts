/**
 * Bisik MCP server (D-24). Read-only market tools plus buyer tools that wrap the HTTP API.
 *
 * Deliberately NOT exposed in this version (future work): staking, bidding, buying an allocation,
 * claiming payouts, opening disputes onchain, or anything else that moves funds or signs a
 * Solana transaction. Operator/admin endpoints are never wrapped.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TIER_NAMES } from "@bisik/shared";
import { BisikClient, type Config } from "./client.js";

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: (e as Error)?.message ?? String(e) }] });
const wrap =
  <A,>(fn: (a: A) => Promise<unknown>) =>
  async (a: A) => {
    try {
      return ok(await fn(a));
    } catch (e) {
      return fail(e);
    }
  };

const iso = (s: number) => (s > 0 ? new Date(s * 1000).toISOString() : null);

/** Adds readable times and the window the market is currently in. */
function describeMarket(m: any) {
  const now = Math.floor(Date.now() / 1000);
  const window = now < m.submitEnd ? "submit" : now < m.auctionEnd ? "auction" : now < m.outcomeEnd ? "outcome" : "after-outcome";
  return {
    ...m,
    kindName: m.kind === 0 ? "Exclusive" : "Auction",
    windows: {
      submitEnd: iso(m.submitEnd),
      auctionEnd: iso(m.auctionEnd),
      outcomeEnd: iso(m.outcomeEnd),
      currentByClock: window,
      note: "status is the onchain state machine; currentByClock is derived from wall-clock time and may lead it until the keeper advances the market",
    },
    previewNote: m.preview ? "histogram of positions per Veritas strength bucket (backed = options with any stake); no option identities" : "preview is published only from the Auction status onward",
  };
}

const marketId = z.number().int().min(0).describe("Market id (u64, e.g. 0)");
const optionIndex = z.number().int().min(0).max(15).describe("Option index within the market (0-15)");

export function createServer(cfg: Config) {
  const api = new BisikClient(cfg);
  const server = new McpServer(
    { name: "bisik", version: "0.1.0" },
    {
      instructions:
        "Bisik is a private signal market on Solana where ecosystems buy stake-backed scout signals about builder teams. " +
        "Read-only tools need no login. Buyer tools log in with the configured buyer keypair (SIWS) automatically. " +
        "Signals are confidential to the buyer: do not repost team references or reasons outside the buyer's organisation. " +
        "This server cannot move funds or sign Solana transactions.",
    },
  );

  // ── read-only ──
  server.registerTool(
    "health",
    { title: "Bisik server health", description: "Check that the Bisik API is reachable and which subsystems are on; also reports whether a buyer key is configured (public key only).", inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: true } },
    wrap(async () => ({ serverUrl: cfg.serverUrl, api: await api.request("GET", "/v1/health"), buyer: api.buyerStatus() })),
  );

  server.registerTool(
    "get_market",
    { title: "Get market", description: "One market: status, kind, windows (submit/auction/outcome end), option count, position count and the aggregate preview histogram. Never includes team identities.", inputSchema: { marketId }, annotations: { readOnlyHint: true, openWorldHint: true } },
    wrap(async ({ marketId }: { marketId: number }) => describeMarket(await api.request("GET", `/v1/markets/${marketId}`))),
  );

  server.registerTool(
    "list_markets",
    {
      title: "List markets",
      description: "List markets by probing ids from `fromId` upward until the first missing id (the API has no list endpoint yet). Returns summaries.",
      inputSchema: { fromId: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    wrap(async ({ fromId, limit }: { fromId: number; limit: number }) => {
      const markets: any[] = [];
      for (let id = fromId; id < fromId + limit; id++) {
        try {
          const m = describeMarket(await api.request("GET", `/v1/markets/${id}`));
          markets.push({ id: m.id, kindName: m.kindName, status: m.status, category: m.category, optionCount: m.optionCount, positions: m.positions, currentByClock: m.windows.currentByClock, outcomeEnd: m.windows.outcomeEnd, hasPreview: !!m.preview });
        } catch (e: any) {
          if (e?.status === 404) break;
          throw e;
        }
      }
      return { count: markets.length, markets, truncated: markets.length === limit };
    }),
  );

  server.registerTool(
    "get_group",
    {
      title: "Get scout group",
      description: "Anonymous scout group for a tier and epoch: Merkle root and size (the anonymity set). Leaves are public identity commitments; include them only if needed.",
      inputSchema: { tier: z.number().int().min(0).max(2).describe("0 Bronze, 1 Silver, 2 Gold"), epoch: z.number().int().min(0), includeLeaves: z.boolean().default(false) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    wrap(async ({ tier, epoch, includeLeaves }: { tier: number; epoch: number; includeLeaves: boolean }) => {
      const g = await api.request<{ root: string; size: number; leaves: string[] }>("GET", `/v1/groups/${tier}/${epoch}`);
      return { tier, tierName: TIER_NAMES[tier], epoch, root: g.root, size: g.size, ...(includeLeaves ? { leaves: g.leaves } : {}) };
    }),
  );

  // ── buyer (SIWS) ──
  server.registerTool(
    "buyer_login",
    { title: "Buyer login (SIWS)", description: "Sign in with the buyer keypair from BISIK_BUYER_KEYPAIR_PATH. Other buyer tools log in automatically; use this to check the identity or force a fresh session. Returns the public key only.", inputSchema: { force: z.boolean().default(false) }, annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true } },
    wrap(async ({ force }: { force: boolean }) => api.login(force)),
  );

  server.registerTool(
    "get_signals",
    {
      title: "Get my signals",
      description: "Signals the logged-in buyer is allowed to see for a market (per the onchain allocation): per option the team reference, score, scout count, tier distribution, summary, claims and privacy-filtered reasons. Confidential to the buyer.",
      inputSchema: { marketId },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    wrap(async ({ marketId }: { marketId: number }) => api.request("GET", `/v1/markets/${marketId}/signals`, undefined, true)),
  );

  server.registerTool(
    "request_introduction",
    {
      title: "Request introduction (D-15)",
      description:
        "Ask the scouts behind an option for an introduction to the team. Only exclusive (winning) buyers may do this. The scout's contact is encrypted to `buyerX25519`; this server never holds that private key, so the buyer must decrypt it elsewhere.",
      inputSchema: { marketId, optionIndex, buyerX25519: z.string().describe("Buyer's x25519 public key, 32 bytes as hex (64 chars) or base64") },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    wrap(async ({ marketId, optionIndex, buyerX25519 }: { marketId: number; optionIndex: number; buyerX25519: string }) => {
      const k = buyerX25519.trim();
      const bytes = /^[0-9a-fA-F]{64}$/.test(k) ? Buffer.from(k, "hex") : Buffer.from(k, "base64");
      if (bytes.length !== 32) throw new Error("buyerX25519 must be a 32-byte public key (hex or base64)");
      return api.request("POST", "/v1/intro", { marketId, optionIndex, buyerX25519: k }, true);
    }),
  );

  server.registerTool(
    "get_introduction",
    { title: "Introduction status", description: "Status of an introduction request made by this buyer (REQUESTED / ACCEPTED / DECLINED) and the encrypted contact if accepted.", inputSchema: { requestId: z.string().uuid() }, annotations: { readOnlyHint: true, openWorldHint: true } },
    wrap(async ({ requestId }: { requestId: string }) => api.request("GET", `/v1/intro/${requestId}`, undefined, true)),
  );

  server.registerTool(
    "check_outcome",
    {
      title: "Check outcome",
      description:
        "Ask the Bisik outcome oracle whether the team behind an option deployed a Solana program from its opted-in deploy wallet during the outcome window. " +
        "Side effect: if a deploy is found, the Bisik server (operator key, server-side) records the outcome onchain. This MCP server signs nothing and moves no funds. " +
        "`buyerIndex` defaults to the logged-in buyer's index in the market.",
      inputSchema: { marketId, optionIndex, buyerIndex: z.number().int().min(0).max(255).optional() },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
    },
    wrap(async ({ marketId, optionIndex, buyerIndex }: { marketId: number; optionIndex: number; buyerIndex?: number }) => {
      const bi = buyerIndex ?? (await api.request<{ buyerIndex: number }>("GET", `/v1/markets/${marketId}/signals`, undefined, true)).buyerIndex;
      return { buyerIndex: bi, ...(await api.request("POST", "/v1/outcomes/check", { marketId, optionIndex, buyerIndex: bi }, true)) };
    }),
  );

  return server;
}
