# Deploying the Bisik server and keeper to Railway (manual, by Dien)

The repo root has a `Dockerfile` and a `railway.json`. One image runs either the API server or the keeper, depending on `BISIK_ROLE`.

## 1. Create the project

1. In Railway, choose **New Project → Deploy from GitHub repo → `scientivan/Bisik`**. Railway reads `railway.json` and builds the `Dockerfile`.
2. Name this first service **`bisik-server`**.
3. Add a **Volume** to `bisik-server`, mounted at `/data`. The SQLite database lives at `/data/bisik.sqlite`. Without a volume, every redeploy wipes the scout groups and reasons.
4. Under **Settings → Networking**, click **Generate Domain**. Copy the URL, for example `https://bisik-server-production.up.railway.app`.

## 2. Server variables (`bisik-server`)

Copy the values from the root `.env`. Do not paste them anywhere else.

| Variable | Value |
|---|---|
| `BISIK_ROLE` | `server` |
| `SERVER_PUBLIC_URL` | the Railway domain from step 1.4 (with `https://`) |
| `SOLANA_RPC_URL` | a devnet RPC URL (a dedicated provider is better than `api.devnet.solana.com`) |
| `ARCIUM_CLUSTER_OFFSET` | `456` (Arcium devnet) |
| `OPERATOR_KEYPAIR_JSON` | the full contents of the operator keypair file (the JSON array). **This is a secret.** |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FAST_MODEL`, `GEMINI_EMBED_MODEL` | from `.env` |
| `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `RECLAIM_PROVIDER_ID` | from `.env` |
| `PLATFORM_SALT`, `SERVER_DATA_KEY`, `JWT_SECRET` | from `.env`. **Never change these after launch**: changing them breaks the nullifiers and makes stored data unreadable. |
| `BISIK_DEMO` | `1` only while recording the demo (enables the demo-only seeding endpoint) |

Railway sets `PORT` automatically. Also set `SERVER_PORT` to the same value Railway shows, or simply `8787` and set the service port to 8787.

## 3. Keeper service

1. In the same project, choose **New → GitHub Repo → `scientivan/Bisik`** again and name it **`bisik-keeper`**.
2. Use the same variables as the server, but with `BISIK_ROLE=keeper`. The keeper needs no volume and no domain.
3. Set `SERVER_PUBLIC_URL` to the server's domain, so the keeper can call the operator endpoints.

## 4. Check

- Open `https://<server-domain>/v1/health`. Expect `{"ok":true,...,"chain":true}`.
- The keeper logs should show `keeper started (rpc …, operator …)`.

## 5. Reclaim callback (task I3)

When `SERVER_PUBLIC_URL` starts with `https://`, the server asks Reclaim to POST proofs to `<SERVER_PUBLIC_URL>/v1/reclaim/callback`. No change in the Reclaim dashboard is needed.
