/** Opt-in integration check. Uses only devnet SOL and mock USDC. Keys stay in Node. */
import dotenv from "dotenv";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { ed25519 } from "@noble/curves/ed25519";
import {
  makeProvider,
  program as mkProgram,
  pdas,
  PROGRAM_ID,
  queueAndWait,
  arciumAccounts,
  anchor,
} from "@bisik/sdk";
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
if (process.env.FRONTEND_DEVNET_TEST !== "1")
  throw Error(
    "Set FRONTEND_DEVNET_TEST=1 to run this devnet integration check.",
  );
if (!process.env.SOLANA_RPC_URL?.includes("devnet"))
  throw Error("This integration check requires the devnet RPC.");
const require = createRequire(import.meta.url),
  { chromium } = require("../apps/web/node_modules/playwright-core");
const operator = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync(
        (
          process.env.OPERATOR_KEYPAIR_PATH || "~/.config/solana/id.json"
        ).replace(/^~/, homedir()),
        "utf8",
      ),
    ),
  ),
);
const rpc = new Connection(process.env.SOLANA_RPC_URL, "confirmed"),
  provider = makeProvider(rpc, operator),
  program: any = mkProgram(provider),
  P = pdas(),
  cluster = Number(process.env.ARCIUM_CLUSTER_OFFSET || 456);
const server = "http://127.0.0.1:8788",
  base = "http://127.0.0.1:5173",
  scout = Keypair.generate(),
  recipient = Keypair.generate(),
  signers = new Map([
    [operator.publicKey.toBase58(), operator],
    [scout.publicKey.toBase58(), scout],
  ]),
  report: any = {
    network: "devnet",
    started: new Date().toISOString(),
    checks: [],
    transactions: [],
  };
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
});
page.on("pageerror", (e: Error) => console.log("BROWSER ERROR", e.message));
await page.route("**/v1/**", async (route: any) => {
  const url = route
    .request()
    .url()
    .replace(/^https?:\/\/[^/]+(?:\/api)?/, server);
  try {
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  } catch {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Integration API temporarily unavailable",
      }),
    });
  }
});
await page.exposeFunction("__bisikSign", ({ address, bytes }: any) => {
  const kp = signers.get(address);
  if (!kp) throw Error("Unknown test wallet.");
  const tx = Transaction.from(Uint8Array.from(bytes));
  tx.partialSign(kp);
  return Array.from(tx.serialize());
});
await page.exposeFunction("__bisikMessage", ({ address, bytes }: any) => {
  const kp = signers.get(address);
  if (!kp) throw Error("Unknown test wallet.");
  return Array.from(
    ed25519.sign(Uint8Array.from(bytes), kp.secretKey.slice(0, 32)),
  );
});
await page.addInitScript("globalThis.__name = (fn) => fn;");
await page.addInitScript(
  ({ wallets }: any) => {
    const supplied = wallets.map(({ name, address, publicKey }: any) => {
      const account = {
        address,
        publicKey: Uint8Array.from(publicKey),
        chains: ["solana:devnet"],
        features: ["solana:signTransaction", "solana:signMessage"],
      };
      return {
        version: "1.0.0",
        name,
        icon: "data:image/svg+xml;base64,PHN2Zy8+",
        chains: ["solana:devnet"],
        accounts: [account],
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: async () => ({ accounts: [account] }),
          },
          "standard:disconnect": {
            version: "1.0.0",
            disconnect: async () => {},
          },
          "solana:signTransaction": {
            version: "1.0.0",
            supportedTransactionVersions: ["legacy", 0],
            signTransaction: async (...inputs: any[]) =>
              Promise.all(
                inputs.map(async (input) => ({
                  signedTransaction: Uint8Array.from(
                    await (window as any).__bisikSign({
                      address,
                      bytes: Array.from(input.transaction),
                    }),
                  ),
                })),
              ),
          },
          "solana:signMessage": {
            version: "1.0.0",
            signMessage: async (...inputs: any[]) =>
              Promise.all(
                inputs.map(async (input) => ({
                  signedMessage: input.message,
                  signature: Uint8Array.from(
                    await (window as any).__bisikMessage({
                      address,
                      bytes: Array.from(input.message),
                    }),
                  ),
                })),
              ),
          },
        },
      };
    });
    const register = ({ register }: any) => register(...supplied);
    window.addEventListener("wallet-standard:app-ready", (event: any) =>
      register(event.detail),
    );
    window.dispatchEvent(
      new CustomEvent("wallet-standard:register-wallet", { detail: register }),
    );
  },
  {
    wallets: [
      {
        name: "Test operator",
        address: operator.publicKey.toBase58(),
        publicKey: Array.from(operator.publicKey.toBytes()),
      },
      {
        name: "Test scout",
        address: scout.publicKey.toBase58(),
        publicKey: Array.from(scout.publicKey.toBytes()),
      },
    ],
  },
);
async function connect(name: string) {
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function disconnect() {
  await page.locator("header").getByRole("button").click();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .waitFor();
}
async function outcome() {
  await page.waitForFunction(
    () =>
      document.body.textContent?.includes("Action completed") ||
      document.body.textContent?.includes("Could not complete this action"),
    {},
    { timeout: 180000 },
  );
  const errors = page.getByText("Could not complete this action", {
    exact: true,
  });
  if (await errors.count())
    throw Error(await page.locator("[aria-live]").innerText());
}
async function api(path: string, body?: unknown, token?: string) {
  const r = await fetch(server + "/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value: any = await r.json();
  if (!r.ok) throw Error(JSON.stringify(value));
  return value;
}
async function opAuth() {
  const pubkey = operator.publicKey.toBase58(),
    n = await api("/auth/nonce", { pubkey }),
    signature = Buffer.from(
      ed25519.sign(Buffer.from(n.message), operator.secretKey.slice(0, 32)),
    ).toString("base64");
  return (await api("/auth/verify", { pubkey, nonce: n.nonce, signature }))
    .token;
}
async function queue(circuit: any, build: (o: any) => any) {
  const r = await queueAndWait(
    provider,
    PROGRAM_ID,
    (o) => build(o).signers([operator]),
    180000,
  );
  report.transactions.push(r.sig);
  console.log("MPC", circuit, "confirmed");
}
const config: any = await program.account.config.fetch(P.config());
if (!config.demoMode) throw Error("The program must permit demo windows.");
try {
  const fund = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: operator.publicKey,
      toPubkey: scout.publicKey,
      lamports: 25_000_000,
    }),
  );
  await provider.sendAndConfirm(fund);
  console.log("Test scout fee funding confirmed");
  const ata = await getOrCreateAssociatedTokenAccount(
    rpc,
    operator,
    config.usdcMint,
    scout.publicKey,
  );
  await mintTo(
    rpc,
    operator,
    config.usdcMint,
    ata.address,
    operator,
    20_000_000,
  );
  console.log("Test mock USDC minted");
  const marketId = Number(config.marketCount);
  report.marketId = marketId;
  await page.goto(base + "/create");
  await connect("Test operator");
  await page
    .getByLabel("Market question")
    .fill("Synthetic browser integration round");
  await page.getByLabel("Initial reward pool in USDC").fill("20");
  await page.getByLabel("Use short demo windows").check();
  await page.getByLabel("Submit window").fill("90");
  await page.getByLabel("Selection window").fill("20");
  await page.getByLabel("Outcome window").fill("30");
  await page
    .getByRole("button", { name: "Create market", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      location.pathname.startsWith("/markets/") ||
      document.body.textContent?.includes("Could not complete this action"),
    {},
    { timeout: 180000 },
  );
  if (!page.url().endsWith("/markets/" + marketId))
    throw Error(await page.locator("[aria-live]").innerText());
  console.log("PASS browser create + queueAndWait");
  report.checks.push(
    "Browser wallet-standard create_market and init_market_state MPC callback",
  );
  await page.goto(base + "/scout/onboard");
  await page
    .getByRole("button", { name: "Create private identity", exact: true })
    .click();
  await outcome();
  const commitment = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([k]) =>
      k.endsWith(":scout"),
    );
    return JSON.parse(entry![1]).commitment;
  });
  const group = await api(
    "/admin/demo/members",
    { tier: 2, commitments: [commitment] },
    await opAuth(),
  );
  await page.evaluate(
    ({ epoch }: any) => {
      const key = Object.keys(localStorage).find((k) => k.endsWith(":scout"))!;
      const scout = JSON.parse(localStorage.getItem(key)!);
      scout.tier = 2;
      scout.epoch = epoch;
      localStorage.setItem(key, JSON.stringify(scout));
    },
    { epoch: group.epoch },
  );
  await disconnect();
  await connect("Test scout");
  await page.goto(base + "/markets/" + marketId);
  await page
    .getByLabel("Team reference", { exact: true })
    .fill("https://github.com/synthetic-browser-team/demo");
  await page
    .getByRole("button", { name: "Add sealed option", exact: true })
    .click();
  await outcome();
  await page
    .getByLabel("Why this option?", { exact: false })
    .fill(
      "The team shipped a working devnet prototype with a public repository and reproducible test instructions. Its maintainers documented the payments flow and published integration tests. This round uses entirely synthetic team data for browser verification.",
    );
  await page.getByLabel("Stake", { exact: false }).last().fill("10");
  await page
    .getByRole("button", { name: "Seal and stake on option 1", exact: true })
    .click();
  await outcome();
  const position: any = (
    await program.account.position.all([
      { memcmp: { offset: 8, bytes: P.market(marketId).toBase58() } },
    ])
  )[0];
  if (!position) throw Error("Browser stake account not found.");
  mkdirSync(fileURLToPath(new URL("../apps/web/.review/", import.meta.url)), {
    recursive: true,
  });
  writeFileSync(
    fileURLToPath(
      new URL("../apps/web/.review/test-backup.json", import.meta.url),
    ),
    JSON.stringify(
      await page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([key]) =>
            key.startsWith("bisik:"),
          ),
        ),
      ),
    ),
  );
  console.log("PASS browser-generated proof accepted on devnet");
  report.checks.push(
    "Browser-generated Semaphore proof accepted by stake on devnet",
  );
  await queue("allocate", (o) =>
    program.methods.allocatePosition(o).accountsPartial({
      payer: operator.publicKey,
      market: P.market(marketId),
      agg: P.agg(P.market(marketId)),
      position: position.publicKey,
      ...arciumAccounts(PROGRAM_ID, cluster, o, "allocate"),
    }),
  );
  let m: any = await program.account.market.fetch(P.market(marketId));
  while (Date.now() / 1000 < Number(m.submitEnd)) {
    console.log(
      "Waiting for submission window",
      Math.ceil(Number(m.submitEnd) - Date.now() / 1000),
      "seconds",
    );
    await new Promise((r) => setTimeout(r, 15000));
  }
  await program.methods
    .closeSubmit()
    .accounts({ signer: operator.publicKey, market: P.market(marketId) })
    .rpc();
  await queue("preview", (o) =>
    program.methods.requestPreview(o).accountsPartial({
      payer: operator.publicKey,
      market: P.market(marketId),
      agg: P.agg(P.market(marketId)),
      ...arciumAccounts(PROGRAM_ID, cluster, o, "preview"),
    }),
  );
  await disconnect();
  await connect("Test operator");
  await page.goto(base + "/buyer/markets/" + marketId);
  await page
    .getByRole("button", { name: "Decrypt my view", exact: true })
    .waitFor({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Decrypt my view", exact: true })
    .click();
  await outcome();
  await page
    .getByText("synthetic-browser-team/demo", { exact: false })
    .first()
    .waitFor();
  console.log("PASS browser signal reveal and local decryption");
  report.checks.push(
    "Browser SIWS, reveal_signals, queueAndWait and local weight decryption",
  );
  m = await program.account.market.fetch(P.market(marketId));
  while (Date.now() / 1000 < Number(m.selectionDeadline))
    await new Promise((r) => setTimeout(r, 1000));
  await program.methods
    .openOutcomeWindow()
    .accounts({ signer: operator.publicKey, market: P.market(marketId) })
    .rpc();
  m = await program.account.market.fetch(P.market(marketId));
  while (Date.now() / 1000 < Number(m.outcomeEnd))
    await new Promise((r) => setTimeout(r, 1000));
  await api(`/admin/markets/${marketId}/default-outcomes`, {}, await opAuth());
  await queue("winning_weights", (o) =>
    program.methods.computeWeights(o).accountsPartial({
      payer: operator.publicKey,
      market: P.market(marketId),
      agg: P.agg(P.market(marketId)),
      ...arciumAccounts(PROGRAM_ID, cluster, o, "winning_weights"),
    }),
  );
  await queue("position_hits", (o) =>
    program.methods.settlePosition(o).accountsPartial({
      payer: operator.publicKey,
      market: P.market(marketId),
      position: position.publicKey,
      ...arciumAccounts(PROGRAM_ID, cluster, o, "position_hits"),
    }),
  );
  await disconnect();
  await connect("Test scout");
  await page.goto(base + "/scout/positions");
  await page
    .getByLabel("Recipient Solana address")
    .fill(recipient.publicKey.toBase58());
  await page
    .getByRole("button", { name: "Claim stake and reward", exact: true })
    .waitFor();
  await page.waitForFunction(() => {
    const b = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Claim stake and reward",
    );
    return b && !b.disabled;
  });
  await page
    .getByRole("button", { name: "Claim stake and reward", exact: true })
    .click();
  await outcome();
  const claimed: any = await program.account.position.fetch(position.publicKey);
  if (!claimed.claimed) throw Error("Browser claim did not complete.");
  console.log("PASS browser-generated claim proof accepted on devnet");
  report.checks.push(
    "Browser-generated claim proof accepted on devnet to fresh recipient",
  );
  report.claimedBaseUnits = (
    BigInt(claimed.amount.toString()) + BigInt(claimed.payout.toString())
  ).toString();
} catch (e) {
  console.log("UI FAILURE", await page.locator("body").innerText());
  throw e;
} finally {
  mkdirSync(fileURLToPath(new URL("../apps/web/.review/", import.meta.url)), {
    recursive: true,
  });
  writeFileSync(
    fileURLToPath(new URL("../apps/web/.review/devnet.json", import.meta.url)),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
