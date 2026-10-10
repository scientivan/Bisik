/**
 * Entry point: Bisik MCP server over stdio.
 * Config (env only; the shared .env is NOT loaded so server secrets never enter this process):
 *   BISIK_SERVER_URL          default http://localhost:8787
 *   BISIK_BUYER_KEYPAIR_PATH  optional Solana keypair JSON for buyer tools
 *   BISIK_HTTP_TIMEOUT_MS     optional, default 20000
 * stdout carries the MCP protocol; logs go to stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configFromEnv } from "./client.js";
import { createServer } from "./server.js";

const cfg = configFromEnv();
const server = createServer(cfg);
await server.connect(new StdioServerTransport());
console.error(`[bisik-mcp] ready on stdio, API ${cfg.serverUrl}, buyer key ${cfg.buyerKeypairPath ? "configured" : "not configured"}`);
