/**
 * Smoke test: start the MCP server over stdio with a real MCP client, list tools, and call
 * health / get_market / list_markets / buyer_login against the API when it is reachable.
 * Network-dependent assertions are skipped when the API is down.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER_URL = process.env.BISIK_SERVER_URL ?? "http://localhost:8787";
const here = fileURLToPath(new URL(".", import.meta.url));
const tsx = join(here, "../../../node_modules/.bin/tsx");

const EXPECTED = ["health", "get_market", "list_markets", "get_group", "buyer_login", "get_signals", "request_introduction", "get_introduction", "check_outcome"];
const FORBIDDEN = /stake|bid|buy_allocation|claim|payout|transfer|withdraw|admin|sign_tx/i;

async function apiUp(): Promise<boolean> {
  try {
    return (await fetch(`${SERVER_URL}/v1/health`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}

const text = (r: any) => (r.content?.[0]?.text ?? "") as string;

test("bisik MCP server over stdio", async (t) => {
  // throwaway buyer key (not registered anywhere); proves SIWS signing without real credentials
  const dir = mkdtempSync(join(tmpdir(), "bisik-mcp-"));
  const seed = ed25519.utils.randomPrivateKey();
  const kp = join(dir, "buyer.json");
  writeFileSync(kp, JSON.stringify([...seed, ...ed25519.getPublicKey(seed)]));

  const client = new Client({ name: "bisik-smoke", version: "0.0.0" });
  const transport = new StdioClientTransport({
    command: tsx,
    args: [join(here, "index.ts")],
    env: { PATH: process.env.PATH ?? "", BISIK_SERVER_URL: SERVER_URL, BISIK_BUYER_KEYPAIR_PATH: kp, BISIK_HTTP_TIMEOUT_MS: "30000" },
    stderr: "ignore",
  });
  await client.connect(transport);
  try {
    await t.test("lists the expected tools and no fund-moving ones", async () => {
      const { tools } = await client.listTools();
      const names = tools.map((x) => x.name).sort();
      console.log("tools:", names.join(", "));
      assert.deepEqual(names, [...EXPECTED].sort());
      for (const n of names) if (n !== "check_outcome") assert.ok(!FORBIDDEN.test(n), `unexpected tool ${n}`);
    });

    await t.test("input validation happens before any network call", async () => {
      const r: any = await client.callTool({ name: "request_introduction", arguments: { marketId: 0, optionIndex: 0, buyerX25519: "not-a-key" } });
      assert.equal(r.isError, true);
    });

    const up = await apiUp();
    if (!up) console.log(`API at ${SERVER_URL} is down: skipping network assertions`);

    await t.test("health", { skip: !up && "API down" }, async () => {
      const r: any = await client.callTool({ name: "health", arguments: {} });
      assert.ok(!r.isError, text(r));
      const h = JSON.parse(text(r));
      console.log("health:", JSON.stringify(h.api), "buyer configured:", h.buyer.configured);
      assert.equal(h.api.ok, true);
      assert.equal(h.buyer.configured, true);
      assert.ok(!text(r).includes(JSON.stringify([...seed]).slice(1, 20)), "secret leaked");
    });

    await t.test("get_market 0", { skip: !up && "API down" }, async () => {
      const r: any = await client.callTool({ name: "get_market", arguments: { marketId: 0 } });
      assert.ok(!r.isError, text(r));
      const m = JSON.parse(text(r));
      console.log("market 0:", m.status, m.kindName, "options", m.optionCount, "preview", JSON.stringify(m.preview), "window", m.windows.currentByClock);
      assert.equal(m.id, 0);
      assert.ok(typeof m.status === "string");
      assert.ok(m.windows.outcomeEnd);
      assert.ok(!("teamRef" in m));
    });

    await t.test("list_markets", { skip: !up && "API down" }, async () => {
      const r: any = await client.callTool({ name: "list_markets", arguments: { limit: 10 } });
      assert.ok(!r.isError, text(r));
      const l = JSON.parse(text(r));
      console.log("markets:", l.markets.map((m: any) => `${m.id}:${m.status}`).join(" "));
      assert.ok(l.count >= 1);
    });

    await t.test("get_market unknown id is an error, not a crash", { skip: !up && "API down" }, async () => {
      const r: any = await client.callTool({ name: "get_market", arguments: { marketId: 999999 } });
      assert.equal(r.isError, true);
      assert.match(text(r), /404/);
    });

    await t.test("buyer_login + get_signals without allocation", { skip: !up && "API down" }, async () => {
      const r: any = await client.callTool({ name: "buyer_login", arguments: {} });
      assert.ok(!r.isError, text(r));
      const who = JSON.parse(text(r));
      assert.ok(who.pubkey && who.expiresAt);
      assert.deepEqual(Object.keys(who).sort(), ["expiresAt", "pubkey"]);
      const s: any = await client.callTool({ name: "get_signals", arguments: { marketId: 0 } });
      console.log("signals for unregistered buyer:", text(s));
      assert.equal(s.isError, true);
      assert.match(text(s), /403|no allocation/);
    });
  } finally {
    await client.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
