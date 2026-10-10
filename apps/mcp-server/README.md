# @bisik/mcp-server

A Model Context Protocol server (stdio) that lets an AI agent, for example an ecosystem's BD agent, read Bisik markets and act as one logged-in buyer. It wraps the HTTP API in `apps/server` (task-tracker 6.5). Decision D-24.

## Tools

| Tool | Auth | What it does |
|---|---|---|
| `health` | none | API health, plus whether a buyer key is configured (public key only) |
| `list_markets` | none | Probes market ids upward until the first 404 (the API has no list endpoint yet) |
| `get_market` | none | Status, kind, windows (with ISO times), option and position counts, preview histogram |
| `get_group` | none | Scout group root and size per tier and epoch; leaves only on request |
| `buyer_login` | buyer key | SIWS login; other buyer tools log in automatically |
| `get_signals` | buyer | Signals the buyer may see under the onchain allocation (confidential) |
| `request_introduction` | buyer | D-15 intro request; needs the buyer's x25519 **public** key |
| `get_introduction` | buyer | Status of an intro request, plus the encrypted contact if accepted |
| `check_outcome` | buyer (for the default `buyerIndex`) | Outcome oracle check. Side effect: if a deploy is found, the **Bisik server** records the outcome onchain with the operator key |

**Not included (future work):** staking, bidding, buying allocations, claiming payouts, opening onchain disputes, or anything else that moves funds or signs a Solana transaction. Admin and operator endpoints are never wrapped.

## Config (env only)

- `BISIK_SERVER_URL`: default `http://localhost:8787`.
- `BISIK_BUYER_KEYPAIR_PATH`: optional. A Solana CLI keypair JSON file. Its secret is used only to sign the exact `Bisik login` message. It is never returned or logged.
- `BISIK_HTTP_TIMEOUT_MS`: optional, default 20000.

The shared root `.env` is **not** loaded, so server secrets (operator key, JWT secret, Gemini and Reclaim keys) never enter this process. Use a dedicated buyer keypair, never the operator keypair.

## Run

```bash
pnpm --filter @bisik/mcp-server start      # stdio; logs go to stderr
pnpm --filter @bisik/mcp-server test       # smoke test; network checks skip if the API is down
```

## Claude Code

```bash
claude mcp add bisik \
  -e BISIK_SERVER_URL=http://localhost:8787 \
  -e BISIK_BUYER_KEYPAIR_PATH=/absolute/path/buyer.json \
  -- /absolute/path/Bisik/node_modules/.bin/tsx /absolute/path/Bisik/apps/mcp-server/src/index.ts
```

## Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "bisik": {
      "command": "/absolute/path/Bisik/node_modules/.bin/tsx",
      "args": ["/absolute/path/Bisik/apps/mcp-server/src/index.ts"],
      "env": {
        "BISIK_SERVER_URL": "http://localhost:8787",
        "BISIK_BUYER_KEYPAIR_PATH": "/absolute/path/buyer.json"
      }
    }
  }
}
```

## Limitations

- Signals contain team references and filtered reasons. They go into the agent's context, so the agent's model provider sees them.
- The intro contact is encrypted to the buyer's x25519 key. This server does not hold that private key and cannot decrypt it.
- `list_markets` stops at the first missing id, so a gap in ids hides later markets.
- The session token is kept in memory only. It is lost on restart, and the server simply logs in again.
