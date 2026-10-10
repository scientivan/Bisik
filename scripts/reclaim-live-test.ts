/**
 * Live Reclaim onboarding test (tasks E2/I3, risk R23). Run with the API server up:
 *   npx tsx scripts/reclaim-live-test.ts
 * Open the printed link on your phone, log in to GitHub and finish the flow.
 * The script prints only the verification status, tier, or a rejection code (with the
 * source page pattern, username redacted). The GitHub username is never printed or stored.
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createIdentity } from "@bisik/zk";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const SERVER = process.env.SERVER_PUBLIC_URL ?? "http://localhost:8787";
const identity = createIdentity();
const r = await fetch(`${SERVER}/v1/identity/reclaim-session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identityCommitment: identity.commitment.toString() }),
});
const s = await r.json();
if (!r.ok) throw new Error(JSON.stringify(s));
console.log("\nOpen this link and complete the GitHub verification:\n\n" + s.requestUrl + "\n");
for (let i = 0; i < 120; i++) {
  await new Promise((res) => setTimeout(res, 5000));
  const st = await (await fetch(`${SERVER}/v1/identity/reclaim-session/${s.sessionId}`)).json();
  if (st.status !== "PENDING") {
    console.log(JSON.stringify(st, null, 2));
    process.exit(st.status === "VERIFIED" ? 0 : 1);
  }
  if (i % 6 === 0) console.log(`waiting… (${i * 5}s)`);
}
console.log("timed out after 10 minutes");
process.exit(1);
