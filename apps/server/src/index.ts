import { serve } from "@hono/node-server";
import { env } from "./env.js";
import { openDb } from "./db.js";
import { solanaChain } from "./chain.js";
import { createApp } from "./app.js";
import { Veritas } from "@bisik/veritas";

const db = openDb(env.dbPath);
let chain = null;
try {
  chain = solanaChain(env.rpcUrl, env.operatorKeypairPath, env.scanRpcUrl);
} catch (e) {
  console.warn("chain disabled:", (e as Error).message);
}
let reclaim = null;
try {
  reclaim = env.reclaim();
} catch {}
const app = createApp({
  db,
  chain,
  veritas: new Veritas(),
  cfg: { dataKey: env.dataKey(), jwtSecret: env.jwtSecret(), salt: env.platformSalt(), publicUrl: env.publicUrl, reclaim, enforceLoginOnly: process.env.BISIK_ENFORCE_LOGIN_ONLY !== "0", demo: env.demo },
});
serve({ fetch: app.fetch, port: env.port }, (i) => console.log(`bisik server on :${i.port} (rpc ${env.rpcUrl})`));
