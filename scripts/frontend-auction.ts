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
    [recipient.publicKey.toBase58(), recipient],
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
        name: "Test flat",
        address: recipient.publicKey.toBase58(),
        publicKey: Array.from(recipient.publicKey.toBytes()),
      },
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

async function retryRpc<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= 4 || !String(e).includes("429")) throw e;
      console.log("RPC rate limit, pausing integration requests");
      await new Promise((r) => setTimeout(r, 12000));
    }
  }
}
async function waitForMarket(id: number, status: number, label: string) {
  const end = Date.now() + 360000;
  while (Date.now() < end) {
    const m: any = await retryRpc(() =>
      program.account.market.fetch(P.market(id)),
    );
    if (m.status === status) return m;
    if (m.status > status) throw Error(label + " was missed by the test");
    console.log(label, "status", m.status);
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw Error(label + " timed out; run the keeper service");
}
async function waitUntil(seconds: number, label: string) {
  while (Date.now() / 1000 < seconds) {
    console.log(label, Math.ceil(seconds - Date.now() / 1000), "seconds");
    await new Promise((r) => setTimeout(r, 15000));
  }
}
async function view(walletName: string, id: number) {
  if (
    await page
      .getByRole("button", { name: "Connect wallet", exact: true })
      .count()
  )
    await connect(walletName);
  else {
    await disconnect();
    await connect(walletName);
  }
  await page.goto(base + "/buyer/markets/" + id);
}
async function readyButton(name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await button.waitFor();
  await page.waitForFunction(
    (name: string) =>
      Array.from(document.querySelectorAll("button")).some(
        (b) => b.textContent === name && !b.disabled,
      ),
    name,
    { timeout: 45000 },
  );
  return button;
}
try {
  for (const kp of [scout, recipient]) {
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: operator.publicKey,
          toPubkey: kp.publicKey,
          lamports: 30_000_000,
        }),
      ),
    );
    const ata = await getOrCreateAssociatedTokenAccount(
      rpc,
      operator,
      config.usdcMint,
      kp.publicKey,
    );
    await mintTo(
      rpc,
      operator,
      config.usdcMint,
      ata.address,
      operator,
      250_000_000,
    );
  }
  console.log("Auction test wallets funded with devnet SOL and mock USDC");
  const id = Number(config.marketCount);
  report.marketId = id;
  await page.goto(base + "/admin");
  await connect("Test operator");
  for (const [kp, label] of [
    [operator, "Synthetic first buyer"],
    [scout, "Synthetic second buyer"],
    [recipient, "Synthetic flat buyer"],
  ] as const) {
    await page
      .getByLabel("Buyer wallet", { exact: true })
      .fill(kp.publicKey.toBase58());
    await page.getByLabel("Buyer label", { exact: true }).fill(label);
    await (await readyButton("Verify buyer")).click();
    await outcome();
  }
  report.checks.push("Browser admin SIWS and buyer verification");
  await page.goto(base + "/create");
  await page
    .getByLabel("Market question")
    .fill("Synthetic browser auction integration");
  await page.getByLabel("Market type").selectOption("1");
  await page.getByLabel("Use short demo windows").check();
  await page.getByLabel("Submit window").fill("120");
  await page.getByLabel("Auction window").fill("120");
  await page.getByLabel("Selection window").fill("90");
  await page.getByLabel("Outcome window").fill("30");
  await (await readyButton("Create market")).click();
  await page.waitForFunction(
    () =>
      location.pathname.startsWith("/markets/") ||
      document.body.textContent?.includes("Could not complete this action"),
    {},
    { timeout: 180000 },
  );
  if (!page.url().endsWith("/markets/" + id))
    throw Error(await page.locator("[aria-live]").innerText());
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
      const identity = JSON.parse(localStorage.getItem(key)!);
      identity.tier = 2;
      identity.epoch = epoch;
      localStorage.setItem(key, JSON.stringify(identity));
    },
    { epoch: group.epoch },
  );
  await disconnect();
  await connect("Test scout");
  await page.goto(base + "/markets/" + id);
  for (let i = 0; i < 3; i++) {
    await page
      .getByLabel("Team reference", { exact: true })
      .fill("https://github.com/synthetic-auction-" + i + "/demo");
    await page
      .getByRole("button", { name: "Add sealed option", exact: true })
      .click();
    await outcome();
    await page
      .getByRole("button", { name: new RegExp("^Option " + (i + 1)) })
      .click();
    await page.getByLabel("Your slot").selectOption(String(i + 1));
    await page
      .getByLabel("Why this option?", { exact: false })
      .fill(
        "Synthetic team " +
          i +
          " shipped a working Solana devnet application and published its repository. Its developers documented the payment flow and reproduced an integration run. This browser test uses synthetic evidence and makes no claim about a real team.",
      );
    await page.getByLabel("Stake", { exact: false }).last().fill("10");
    await page
      .getByRole("button", {
        name: "Seal and stake on option " + (i + 1),
        exact: true,
      })
      .click();
    await outcome();
  }
  await waitForMarket(id, 2, "Keeper allocation and preview");
  for (const [name, ceiling, bid] of [
    ["Test operator", "200", "150"],
    ["Test scout", "150", "120"],
  ]) {
    await view(name, id);
    await page
      .getByLabel("Ceiling deposit, public", { exact: true })
      .fill(ceiling);
    await page.getByLabel("Your bid, sealed", { exact: true }).fill(bid);
    await (await readyButton("Seal and submit bid")).click();
    await outcome();
    await new Promise((r) => setTimeout(r, 8000));
    console.log("PASS browser sealed bid", name);
  }
  report.checks.push(
    "Two browser open_bid deposits and place_bid MPC callbacks",
  );
  await waitForMarket(id, 3, "Keeper auction resolution");
  for (const [name, index] of [
    ["Test operator", 0],
    ["Test scout", 1],
  ] as const) {
    await view(name, id);
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("button")).some(
        (b) =>
          b.textContent === "Bid refund completed" ||
          (b.textContent === "Claim bid refund" && !b.disabled),
      ),
    );
    if (
      !(await page
        .getByRole("button", { name: "Bid refund completed", exact: true })
        .count())
    ) {
      await (await readyButton("Claim bid refund")).click();
      await outcome();
    }
    const refunded: any = await retryRpc(() =>
      program.account.bid.fetch(
        P.bid(
          P.market(id),
          name === "Test operator" ? operator.publicKey : scout.publicKey,
        ),
      ),
    );
    if (!refunded.refunded) throw Error("Bid refund not confirmed onchain");
    await (await readyButton("Decrypt my view")).click();
    await outcome();
    await page.getByLabel("Hide this option from later buyers").nth(0).check();
    await page
      .getByRole("button", { name: "Confirm 1 exclusive options", exact: true })
      .click();
    await outcome();
    console.log("PASS browser refund, decrypt and sequential selection", name);
  }
  report.checks.push(
    "Both buyer refunds, local signal decryption and sequential select_hidden",
  );
  await view("Test flat", id);
  await (await readyButton("Buy remaining signals")).click();
  await outcome();
  await (await readyButton("Decrypt my view")).click();
  await outcome();
  await page
    .getByText("https://github.com/synthetic-auction-2/demo", { exact: true })
    .waitFor();
  if (
    await page
      .getByText("https://github.com/synthetic-auction-0/demo", { exact: true })
      .count()
  )
    throw Error("Hidden option leaked to flat buyer");
  report.checks.push(
    "Browser buy_flat and decrypt remaining allocation; earlier hidden options absent",
  );
  console.log("PASS browser flat purchase with correct remaining view");
} catch (e) {
  console.log("UI FAILURE", await page.locator("body").innerText());
  throw e;
} finally {
  mkdirSync(fileURLToPath(new URL("../apps/web/.review/", import.meta.url)), {
    recursive: true,
  });
  writeFileSync(
    fileURLToPath(new URL("../apps/web/.review/auction.json", import.meta.url)),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
