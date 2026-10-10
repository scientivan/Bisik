import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";
import { writeFileSync } from "node:fs";

// Single .env at the Bisik root (apps/server/.env is a symlink to it).
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const req = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`missing env ${k}`);
  return v;
};
const home = (p: string) => p.replace(/^~(?=\/)/, homedir());
/** Hosted deploys pass the operator key as OPERATOR_KEYPAIR_JSON (a secret); locally a file path is used. */
function keypairPath(): string {
  if (process.env.OPERATOR_KEYPAIR_JSON) {
    const f = `${tmpdir()}/bisik-operator.json`;
    writeFileSync(f, process.env.OPERATOR_KEYPAIR_JSON, { mode: 0o600 });
    return f;
  }
  return home(process.env.OPERATOR_KEYPAIR_PATH ?? "~/.config/solana/id.json");
}

export const env = {
  port: Number(process.env.SERVER_PORT ?? 8787),
  publicUrl: process.env.SERVER_PUBLIC_URL ?? "http://localhost:8787",
  dbPath: process.env.SERVER_DB_PATH ?? "./data/bisik.sqlite",
  rpcUrl: process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899",
  clusterOffset: Number(process.env.ARCIUM_CLUSTER_OFFSET ?? 0),
  operatorKeypairPath: keypairPath(),
  platformSalt: () => req("PLATFORM_SALT"),
  dataKey: () => req("SERVER_DATA_KEY"),
  jwtSecret: () => req("JWT_SECRET"),
  reclaim: () => ({ appId: req("RECLAIM_APP_ID"), appSecret: req("RECLAIM_APP_SECRET"), providerId: req("RECLAIM_PROVIDER_ID") }),
  /** demo flag: allows groups smaller than k and skips the live Reclaim requirement in tests */
  demo: process.env.BISIK_DEMO === "1",
};
