/**
 * Records the product demo footage (my-video/RECORDING-TRACKER.md, v2 flow).
 * Devnet only, mock USDC, synthetic teams. Keys stay in Node; state lives outside the repo.
 *
 *   RECORD_DEMO=1 REC_STATE=/path/state.json npx tsx scripts/record-demo.ts <phase>
 *   phases: setup p1 p2 p3 p4 p5 p6 p7
 *
 * Each take is one browser page recorded to my-video/public/rec/raw/<take>.webm, with
 * click/type/scroll boxes logged to my-video/public/rec/<take>.events.json for the edit camera.
 */
import dotenv from "dotenv";
import { readFileSync, mkdirSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { ed25519 } from "@noble/curves/ed25519";
import { makeProvider, program as mkProgram, pdas } from "@bisik/sdk";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
if (process.env.RECORD_DEMO !== "1") throw Error("Set RECORD_DEMO=1.");
if (!process.env.SOLANA_RPC_URL?.includes("devnet")) throw Error("Devnet only.");
const STATE = process.env.REC_STATE;
if (!STATE) throw Error("Set REC_STATE to a path outside the repo (it holds test keys).");

const require = createRequire(import.meta.url),
  { chromium } = require("../apps/web/node_modules/playwright-core");
const REC = fileURLToPath(new URL("../my-video/public/rec/", import.meta.url));
const RAW = REC + "raw/";
mkdirSync(RAW, { recursive: true });

const operator = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync((process.env.OPERATOR_KEYPAIR_PATH || "~/.config/solana/id.json").replace(/^~/, homedir()), "utf8"),
    ),
  ),
);
const rpc = new Connection(process.env.SOLANA_RPC_URL, {
    commitment: "confirmed",
    wsEndpoint: "wss://api.devnet.solana.com",
  }),
  provider = makeProvider(rpc, operator),
  program: any = mkProgram(provider),
  P = pdas();
const base = "http://127.0.0.1:5173",
  server = "http://127.0.0.1:8787";
const VIEW = { width: 1280, height: 800 };

type State = {
  keys: Record<string, number[]>;
  marketId?: number;
  storage: Record<string, Record<string, string>>;
  recipient?: number[];
};
const state: State = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { keys: {}, storage: {} };
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2));
const ROLES = ["buyerA", "buyerB", "buyerC", "scout1", "scout2", "scout3"] as const;
const kp = (role: string): Keypair =>
  role === "operator" ? operator : Keypair.fromSecretKey(Uint8Array.from(state.keys[role]));
const NAMES: Record<string, string> = {
  operator: "Operator test wallet",
  buyerA: "Buyer test wallet",
  buyerB: "Rival buyer test wallet",
  buyerC: "Flat buyer test wallet",
  scout1: "Scout test wallet",
  scout2: "Scout 2 test wallet",
  scout3: "Scout 3 test wallet",
};

// Headed Chrome placed off screen: headless screencasts drop the bottom 88 px of the viewport.
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: false,
  args: ["--window-position=4000,0"],
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const openPages = new Set<any>();
type Take = { page: any; ctx: any; name?: string; t0: number; events: any[] };

async function open(role: string, take?: string): Promise<Take> {
  const me = kp(role);
  const ctx = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
    ...(take ? { recordVideo: { dir: RAW, size: VIEW } } : {}),
  });
  await ctx.exposeFunction("__bisikSign", ({ bytes }: any) => {
    const tx = Transaction.from(Uint8Array.from(bytes));
    tx.partialSign(me);
    return Array.from(tx.serialize());
  });
  await ctx.exposeFunction("__bisikMessage", ({ bytes }: any) =>
    Array.from(ed25519.sign(Uint8Array.from(bytes), me.secretKey.slice(0, 32))),
  );
  await ctx.addInitScript("globalThis.__name = (fn) => fn;");
  await ctx.addInitScript(
    ({ name, address, publicKey, stored }: any) => {
      if (location.hostname === "127.0.0.1" && !sessionStorage.getItem("__restored")) {
        for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, v as string);
        sessionStorage.setItem("__restored", "1");
      }
      const account = {
        address,
        publicKey: Uint8Array.from(publicKey),
        chains: ["solana:devnet"],
        features: ["solana:signTransaction", "solana:signMessage"],
      };
      const wallet = {
        version: "1.0.0",
        name,
        icon: "data:image/svg+xml;base64,PHN2Zy8+",
        chains: ["solana:devnet"],
        accounts: [account],
        features: {
          "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
          "standard:disconnect": { version: "1.0.0", disconnect: async () => {} },
          "solana:signTransaction": {
            version: "1.0.0",
            supportedTransactionVersions: ["legacy", 0],
            signTransaction: async (...inputs: any[]) =>
              Promise.all(
                inputs.map(async (input) => ({
                  signedTransaction: Uint8Array.from(
                    await (window as any).__bisikSign({ bytes: Array.from(input.transaction) }),
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
                  signature: Uint8Array.from(await (window as any).__bisikMessage({ bytes: Array.from(input.message) })),
                })),
              ),
          },
        },
      };
      const register = ({ register }: any) => register(wallet);
      window.addEventListener("wallet-standard:app-ready", (e: any) => register(e.detail));
      window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail: register }));
      // Drawn cursor: page recordings have no pointer.
      const draw = () => {
        if (document.getElementById("__cursor")) return;
        const c = document.createElement("div");
        c.id = "__cursor";
        c.innerHTML =
          '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        Object.assign(c.style, {
          position: "fixed",
          left: "0",
          top: "0",
          zIndex: "2147483647",
          pointerEvents: "none",
          transform: "translate(640px,400px)",
        });
        document.documentElement.appendChild(c);
        addEventListener(
          "mousemove",
          (e) => (c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`),
          true,
        );
        addEventListener("mousedown", () => (c.style.scale = "0.82"), true);
        addEventListener("mouseup", () => (c.style.scale = "1"), true);
      };
      if (document.readyState === "loading") addEventListener("DOMContentLoaded", draw);
      else draw();
    },
    {
      name: NAMES[role],
      address: me.publicKey.toBase58(),
      publicKey: Array.from(me.publicKey.toBytes()),
      stored: state.storage[role] ?? {},
    },
  );
  const page = await ctx.newPage();
  openPages.add(page);
  page.on("pageerror", (e: Error) => console.log(`[${role}] BROWSER ERROR`, e.message));
  return { page, ctx, name: take, t0: Date.now(), events: [] };
}

async function close(t: Take, role?: string) {
  if (role) {
    await t.page.goto(base + "/guide").catch(() => {});
    state.storage[role] = await t.page.evaluate(() =>
      Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("bisik"))),
    );
    save();
  }
  const video = t.page.video();
  openPages.delete(t.page);
  await t.ctx.close();
  if (t.name && video) {
    renameSync(await video.path(), RAW + t.name + ".webm");
    writeFileSync(REC + t.name + ".events.json", JSON.stringify({ take: t.name, view: VIEW, events: t.events }, null, 2));
    console.log("saved take", t.name);
  }
}

const now = (t: Take) => (Date.now() - t.t0) / 1000;
const log = (t: Take, kind: string, label: string, b?: any) =>
  t.events.push({ t: now(t), kind, label, ...(b ? { x: b.x, y: b.y, w: b.width, h: b.height } : {}) });
const mark = (t: Take, label: string) => log(t, "mark", label);

/** Smoothly scrolls so the element sits in the upper-middle of the viewport. */
async function reveal(t: Take, loc: any) {
  await loc.waitFor({ state: "visible", timeout: 60000 });
  const b = await loc.boundingBox();
  if (b && (b.y < 90 || b.y + b.height > VIEW.height - 60)) {
    await t.page.evaluate((dy: number) => window.scrollBy({ top: dy, behavior: "smooth" }), b.y - VIEW.height * 0.4);
    log(t, "scroll", "scroll");
    await wait(900);
  }
}
async function point(t: Take, loc: any, label = "point") {
  await reveal(t, loc);
  const b = await loc.boundingBox();
  if (!b) throw Error("Element not visible: " + label);
  await t.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 22 });
  log(t, "point", label, b);
  await wait(250);
  return b;
}
async function click(t: Take, loc: any, label = "click") {
  const b = await point(t, loc, label);
  log(t, "click", label, b);
  await loc.click();
  await wait(250);
}
async function type(t: Take, loc: any, text: string, label = "type", delay = 10) {
  await click(t, loc, label);
  await loc.fill("");
  await loc.pressSequentially(text, { delay });
  log(t, "typed", label, await loc.boundingBox());
  await wait(200);
}
async function done(t: Take, timeout = 240000) {
  await t.page.waitForFunction(
    () =>
      document.body.textContent?.includes("Action completed") ||
      document.body.textContent?.includes("Could not complete this action"),
    {},
    { timeout },
  );
  if (await t.page.getByText("Could not complete this action", { exact: true }).count())
    throw Error(await t.page.locator("[aria-live]").first().innerText());
  const fb = t.page.getByText("Action completed", { exact: true }).last();
  log(t, "result", "Action completed", await fb.boundingBox().catch(() => null));
}
async function connect(t: Take, role: string) {
  const btn = t.page.getByRole("button", { name: /^connect wallet$/i }).first();
  await btn.waitFor({ timeout: 20000 });
  await click(t, btn, "connect");
  await click(t, t.page.getByRole("button", { name: NAMES[role], exact: true }), "wallet");
  await wait(900);
  await heal(t);
}
async function maybeConnect(t: Take, role: string) {
  await wait(800);
  if (await t.page.getByRole("button", { name: /^connect wallet$/i }).count()) await connect(t, role);
}
/** Reloads while the page shows an RPC rate-limit error (public devnet RPC returns 429 under load). */
async function heal(t: Take) {
  for (let i = 0; i < 8; i++) {
    await wait(1500);
    const txt = (await t.page.locator("body").innerText().catch(() => "")) as string;
    if (!/\b429\b|Too many requests/i.test(txt)) return;
    log(t, "cut", "rate limit reload");
    await wait(4000 + i * 3000);
    await t.page.reload();
    await t.page.waitForLoadState("load");
  }
}
async function go(t: Take, path: string) {
  await t.page.goto(base + path);
  await t.page.waitForLoadState("load");
  await heal(t);
}
async function api(path: string, body?: unknown, token?: string) {
  const r = await fetch(server + "/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const v: any = await r.json();
  if (!r.ok) throw Error(JSON.stringify(v));
  return v;
}
async function opAuth() {
  const pubkey = operator.publicKey.toBase58(),
    n = await api("/auth/nonce", { pubkey }),
    signature = Buffer.from(ed25519.sign(Buffer.from(n.message), operator.secretKey.slice(0, 32))).toString("base64");
  return (await api("/auth/verify", { pubkey, nonce: n.nonce, signature })).token;
}
async function marketStatus() {
  for (let i = 0; ; i++) {
    try {
      return (await program.account.market.fetch(P.market(state.marketId!))).status as number;
    } catch (e) {
      if (i > 5) throw e;
      await wait(5000);
    }
  }
}
async function waitStatus(target: number, label: string, maxMin = 20) {
  const end = Date.now() + maxMin * 60000;
  for (;;) {
    const s = await marketStatus();
    if (s >= target) return s;
    if (Date.now() > end) throw Error(label + " timed out (is the keeper running?)");
    console.log(label, "status", s);
    await wait(15000);
  }
}
async function readyButton(t: Take, name: string, timeout = 90000) {
  const b = t.page.getByRole("button", { name, exact: true }).first();
  await b.waitFor({ timeout });
  await t.page.waitForFunction(
    (name: string) =>
      Array.from(document.querySelectorAll("button")).some((x) => x.textContent?.trim() === name && !x.disabled),
    name,
    { timeout },
  );
  return b;
}
const scoutCommitment = (t: Take) =>
  t.page.evaluate(() => {
    const e = Object.entries(localStorage).find(([k]) => k.endsWith(":scout"));
    return JSON.parse(e![1]).commitment;
  });
async function grantTier(t: Take, commitment: string, tier: number) {
  const group = await api("/admin/demo/members", { tier, commitments: [commitment] }, await opAuth());
  await t.page.evaluate(
    ({ epoch, tier }: any) => {
      const key = Object.keys(localStorage).find((k) => k.endsWith(":scout"))!;
      const s = JSON.parse(localStorage.getItem(key)!);
      s.tier = tier;
      s.epoch = epoch;
      localStorage.setItem(key, JSON.stringify(s));
    },
    { epoch: group.epoch, tier },
  );
}

const QUESTION = "Demo question: which early-stage team should our ecosystem back next quarter?";

async function setup() {
  for (const r of ROLES) state.keys[r] ??= Array.from(Keypair.generate().secretKey);
  state.recipient ??= Array.from(Keypair.generate().secretKey);
  save();
  const config: any = await program.account.config.fetch(P.config());
  for (const r of ROLES) {
    const k = kp(r);
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({ fromPubkey: operator.publicKey, toPubkey: k.publicKey, lamports: 40_000_000 }),
      ),
    );
    const ata = await getOrCreateAssociatedTokenAccount(rpc, operator, config.usdcMint, k.publicKey);
    await mintTo(rpc, operator, config.usdcMint, ata.address, operator, 400_000_000);
    console.log("funded", r, k.publicKey.toBase58());
  }
  for (const [r, label] of [
    ["buyerB", "Rival ecosystem fund (demo)"],
    ["buyerC", "Grants team (demo)"],
  ] as const)
    await api("/admin/buyers/verify", { pubkey: kp(r).publicKey.toBase58(), label }, await opAuth());
  console.log("setup done");
}

/** B1–B5: buyer connects, operator verifies, buyer opens an auction round and finds it in the marketplace. */
async function fresh(role: string) {
  const k = Keypair.generate();
  state.keys[role] = Array.from(k.secretKey);
  state.storage[role] = {};
  save();
  const config: any = await program.account.config.fetch(P.config());
  await provider.sendAndConfirm(
    new Transaction().add(SystemProgram.transfer({ fromPubkey: operator.publicKey, toPubkey: k.publicKey, lamports: 40_000_000 })),
  );
  const ata = await getOrCreateAssociatedTokenAccount(rpc, operator, config.usdcMint, k.publicKey);
  await mintTo(rpc, operator, config.usdcMint, ata.address, operator, 400_000_000);
  console.log("fresh", role, k.publicKey.toBase58());
}

async function p1() {
  await fresh("buyerA");
  const A = await open("buyerA", "b1-buyer");
  await go(A, "/profile?as=buyer");
  mark(A, "B1 start");
  await connect(A, "buyerA");
  await wait(1500);
  const nr = A.page.getByText(/Not registered/i).first();
  if (await nr.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) {
    await point(A, nr, "not registered");
  } else {
    // Profile scan hit the public RPC limit: show the same fact on the Create form.
    log(A, "cut", "profile unavailable");
    await go(A, "/create");
    mark(A, "B1 start");
    await point(A, A.page.getByLabel("Market type"), "auction locked");
  }
  await wait(1800);
  mark(A, "B1 end");

  const O = await open("operator", "b2-operator");
  await go(O, "/admin");
  mark(O, "B2 start");
  await connect(O, "operator");
  await wait(800);
  await type(O, O.page.getByLabel("Buyer wallet", { exact: true }), kp("buyerA").publicKey.toBase58(), "buyer wallet", 4);
  await type(O, O.page.getByLabel("Buyer label", { exact: true }), "Solana ecosystem team (demo)", "buyer label", 14);
  await click(O, O.page.getByRole("button", { name: "Verify buyer", exact: true }), "verify buyer");
  await done(O);
  await wait(1800);
  mark(O, "B2 end");
  await close(O);



  const config: any = await program.account.config.fetch(P.config());
  const id = Number(config.marketCount);
  await go(A, "/create");
  mark(A, "B4 start");
  await type(A, A.page.getByLabel("Market question"), QUESTION, "question", 6);
  const kind = A.page.getByLabel("Market type");
  await point(A, kind, "market type");
  await point(A, A.page.getByText(/Exclusive means you are the only buyer/).first(), "type help");
  await wait(2500);
  await kind.selectOption("1");
  log(A, "click", "auction round", await kind.boundingBox());
  await wait(1200);
  for (const [lbl, v] of [
    ["Reserve price in USDC", "50"],
    ["Flat price in USDC", "30"],
  ])
    await type(A, A.page.getByLabel(lbl), v, lbl, 60);
  await click(A, A.page.getByLabel("Use short demo windows"), "demo windows");
  for (const [k, v] of [
    ["submit", "10"],
    ["auction", "4"],
    ["selection", "2"],
    ["outcome", "4"],
    ["dispute", "1"],
  ])
    await A.page.locator("#window-" + k).fill(v);
  await point(A, A.page.locator("#window-submit"), "windows");
  await wait(1200);
  await click(A, A.page.getByRole("button", { name: "Create market", exact: true }), "create market");
  await A.page.waitForFunction(
    () =>
      location.pathname.startsWith("/markets/") || document.body.textContent?.includes("Could not complete this action"),
    {},
    { timeout: 240000 },
  );
  if (!A.page.url().endsWith("/markets/" + id)) throw Error(await A.page.locator("[aria-live]").first().innerText());
  state.marketId = id;
  save();
  await wait(1500);
  mark(A, "B4 end");

  await go(A, "/markets");
  mark(A, "B5 start");
  const row = A.page.getByText(QUESTION).first();
  await point(A, row, "market row");
  await wait(1500);
  await click(A, row, "open market");
  await wait(2500);
  await A.page.mouse.wheel(0, 500);
  log(A, "scroll", "detail");
  await wait(2500);
  mark(A, "B5 end");
  await close(A, "buyerA");
}

async function scoutStake(t: Take, role: string, team: string, reason: string) {
  await go(t, "/markets/" + state.marketId);
  await maybeConnect(t, role);
  await click(t, t.page.getByText("Team not listed? Add it as a new option"), "add team fold");
  await type(t, t.page.getByLabel("Team reference", { exact: true }), team, "team ref", 18);
  await click(t, t.page.getByRole("button", { name: "Add sealed option", exact: true }), "add option");
  await done(t);
  await wait(1500);
  const optCount = (await program.account.market.fetch(P.market(state.marketId!))).optionCount as number;
  if (!t.name) {
    // Off camera: reload so the page reads the new option count before staking.
    await t.page.reload();
    await t.page.waitForLoadState("load");
    await heal(t);
    await maybeConnect(t, role);
  }
  const btn = t.page.getByRole("button", { name: new RegExp("^Option " + optCount) }).first();
  if (await btn.count()) await click(t, btn, "pick option");
  await type(t, t.page.getByRole("textbox", { name: /Why this option/i }), reason, "reason", 3);
  await click(t, t.page.getByRole("button", { name: "Check reason with Veritas", exact: true }), "veritas");
  await t.page.getByText(/^DRS /).first().waitFor({ timeout: 120000 });
  await wait(600);
  await point(t, t.page.getByText(/^DRS /).first(), "veritas flags");
  await wait(2200);
  const stake = t.page.getByRole("textbox", { name: /^Stake/ });
  await click(t, stake, "stake");
  await stake.fill("");
  await stake.pressSequentially("10", { delay: 80 });
  const seal = t.page.getByRole("button", { name: /Seal and stake on option/ });
  await t.page.waitForFunction(
    () => Array.from(document.querySelectorAll("button")).some((b) => /Seal and stake on option/.test(b.textContent ?? "") && !b.disabled),
    {},
    { timeout: 90000 },
  );
  await click(t, seal, "seal and stake");
  await done(t);
  await wait(2500);
}

/** S1–S3 on camera, then two more scouts off camera. */
async function p2() {
  for (const r of ["scout1", "scout2", "scout3"]) await fresh(r);
  const S = await open("scout1", "s1-scout");
  await go(S, "/scout/onboard");
  mark(S, "S1 start");
  await maybeConnect(S, "scout1");
  await click(S, S.page.getByRole("button", { name: "Create private identity", exact: true }), "create identity");
  await done(S);
  await point(S, S.page.getByText("Identity commitment").first(), "commitment");
  await wait(1500);
  await click(S, S.page.getByRole("button", { name: "Start verification", exact: true }), "start reclaim");
  await S.page.getByRole("link", { name: "Open Reclaim verification" }).waitFor({ timeout: 45000 }).catch(() => {});
  const rl = S.page.getByRole("link", { name: "Open Reclaim verification" });
  if (await rl.count()) await point(S, rl, "reclaim link");
  await wait(1500);
  mark(S, "S1 cut");
  await grantTier(S, await scoutCommitment(S), 2);
  await S.page.reload();
  await S.page.waitForLoadState("load");
  await wait(1500);
  await point(S, S.page.getByText(/Gold · epoch/).first(), "gold tier");
  await wait(1800);
  mark(S, "S1 end");
  mark(S, "S2 start");
  await scoutStake(
    S,
    "scout1",
    "github.com/demo-team-orbit/orbit-wallet",
    "Their lead engineer showed me an unreleased dashboard with 1,200 weekly active wallets on a closed beta. " +
      "The CTO said a rival L2 offered co-marketing, yet their board meets on 30 October to choose a chain. " +
      "They worry about sequencer downtime elsewhere. Demo data, synthetic team.",
  );
  mark(S, "S3 end");
  // The scout's latest transaction is the stake (Alchemy allows this call; no program scan).
  const [last] = await rpc.getSignaturesForAddress(kp("scout1").publicKey, { limit: 1 });
  const sig = last.signature;
  console.log("scout1 stake tx", sig);
  mark(S, "S3x start");
  await S.page.goto(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  await S.page.getByText(/CUs Consumed/i).first().waitFor({ timeout: 60000 }).catch(() => {});
  await wait(1500);
  const cu = S.page.getByText(/CUs Consumed/i).first();
  if (await cu.count()) await point(S, cu, "compute units");
  await wait(2500);
  mark(S, "S3x end");
  await close(S, "scout1");

  for (const [role, tier, team, reason] of [
    [
      "scout2",
      1,
      "github.com/demo-team-kite/kite-lend",
      "I advise this team. They closed a paid pilot with a regional bank last week and need an audit partner before mainnet. " +
        "Their founder told me another ecosystem's grant is still unsigned. Demo data, synthetic team.",
    ],
    [
      "scout3",
      2,
      "github.com/demo-team-tidal/tidal-games",
      "I playtested their build. Retention on day seven is 41 percent among 900 testers, not yet public. " +
        "They plan to pick an ecosystem after their November raise and want gaming distribution. Demo data, synthetic team.",
    ],
  ] as const) {
    const T = await open(role);
    await go(T, "/scout/onboard");
    await click(T, T.page.getByRole("button", { name: "Create private identity", exact: true }));
    await done(T);
    await grantTier(T, await scoutCommitment(T), tier);
    await T.page.reload();
    await T.page.waitForLoadState("load");
    await scoutStake(T, role, team, reason);
    await close(T, role);
    console.log("off-camera stake", role);
  }
}

/** B6–B7: preview and two sealed bids. */
async function p3() {
  await waitStatus(2, "Waiting for scouting to close and preview (keeper)", 25);
  for (const [role, take, ceiling, bid] of [
    ["buyerA", "b6-preview-bid", "200", "150"],
    ["buyerB", "b7-rival-bid", "160", "120"],
  ] as const) {
    const B = await open(role, take);
    await go(B, "/buyer/markets/" + state.marketId);
    mark(B, take + " start");
    await maybeConnect(B, role);
    await wait(1500);
    if (role === "buyerA") {
      await point(B, B.page.getByText("Signals", { exact: true }).first(), "preview");
      await wait(2500);
    }
    await type(B, B.page.getByLabel("Ceiling deposit, public", { exact: true }), ceiling, "ceiling", 80);
    await type(B, B.page.getByLabel("Your bid, sealed", { exact: true }), bid, "bid", 80);
    await click(B, await readyButton(B, "Seal and submit bid"), "submit bid");
    await done(B);
    await wait(2500);
    mark(B, take + " end");
    await close(B, role);
  }
}

/** B8–B12: result, refund, decrypt, sequential hide, signal reader, intro request, flat buyer. */
async function p4() {
  await waitStatus(3, "Waiting for auction resolution (keeper)", 20);
  for (const [role, take, hideTeam] of [
    ["buyerA", "b8-winner", "kite"],
    ["buyerB", "b9-second", "tidal"],
  ] as const) {
    const B = await open(role, take);
    await go(B, "/buyer/markets/" + state.marketId);
    mark(B, take + " start");
    await maybeConnect(B, role);
    await wait(2500);
    const refund = B.page.getByRole("button", { name: "Claim bid refund", exact: true });
    if (await refund.count()) {
      await click(B, await readyButton(B, "Claim bid refund"), "refund");
      await done(B);
    }
    await click(B, await readyButton(B, "Decrypt my view", 300000), "decrypt");
    await done(B);
    await wait(1500);
    const boxes = B.page.getByLabel("Hide this option from later buyers");
    await boxes.first().waitFor({ timeout: 300000 });
    const n = await boxes.count();
    let target = boxes.first();
    for (let i = 0; i < n; i++) {
      const txt = (await boxes.nth(i).locator("xpath=ancestor::article[1]").innerText()).toLowerCase();
      if (txt.includes(hideTeam)) target = boxes.nth(i);
    }
    await click(B, target, "hide option");
    await click(B, B.page.getByRole("button", { name: "Confirm 1 exclusive options", exact: true }), "confirm hide");
    await done(B);
    await wait(2000);
    if (role === "buyerA") {
      mark(B, "B11 start");
      const reason = B.page.getByText(/weekly active wallets|board meets/i).first();
      if (await reason.count()) await point(B, reason, "filtered reason");
      await wait(3000);
      mark(B, "B12 start");
      await point(B, B.page.getByText("Ask for an introduction", { exact: true }), "intro");
      const sel = B.page.getByLabel("Option in your view");
      const opts: string[] = await sel.locator("option").allInnerTexts();
      const idx = opts.map((o: string) => o.includes("orbit")).lastIndexOf(true);
      if (idx >= 0) await sel.selectOption({ index: idx });
      await click(B, B.page.getByRole("button", { name: "Request introduction", exact: true }), "request intro");
      await done(B);
      await wait(2000);
    }
    mark(B, take + " end");
    await close(B, role);
  }
  const C = await open("buyerC", "b10-flat");
  await go(C, "/buyer/markets/" + state.marketId);
  mark(C, "B10 start");
  await maybeConnect(C, "buyerC");
  await wait(1500);
  await click(C, await readyButton(C, "Buy remaining signals", 300000), "buy flat");
  await done(C);
  await click(C, await readyButton(C, "Decrypt my view", 300000), "decrypt");
  await done(C);
  await wait(1500);
  await point(C, C.page.getByText("Signals", { exact: true }).first(), "remaining view");
  await wait(2500);
  mark(C, "B10 end");
  await close(C, "buyerC");
}

/** Scout accepts the introduction. */
async function p5() {
  const S = await open("scout1", "s4-intro");
  await go(S, "/scout/positions");
  mark(S, "S4 start");
  await maybeConnect(S, "scout1");
  await wait(1500);
  await click(S, await readyButton(S, "Check introductions"), "check intros");
  await done(S);
  await type(S, S.page.getByLabel(/Your contact to share/), "Telegram @orbit_scout_demo. The team agreed to a call this week.", "contact", 12);
  await click(S, S.page.getByRole("button", { name: "Accept and share", exact: true }), "accept");
  await done(S);
  await wait(2000);
  mark(S, "S4 end");
  await close(S, "scout1");
}

/** Buyer opens the contact and marks the most valuable signal; operator oracle panel. */
async function p6() {
  await waitStatus(4, "Waiting for outcome window", 20);
  const A = await open("buyerA", "o1-outcome");
  await go(A, "/buyer/markets/" + state.marketId);
  mark(A, "O1 start");
  await maybeConnect(A, "buyerA");
  await wait(1500);
  await click(A, await readyButton(A, "Decrypt my view", 180000), "decrypt");
  await done(A);
  const check = A.page.getByRole("button", { name: "Check scout response", exact: true });
  if (await check.count()) {
    await click(A, check, "check response");
    await done(A);
    const dc = A.page.getByRole("button", { name: "Decrypt contact", exact: true });
    if (await dc.count()) {
      await click(A, dc, "decrypt contact");
      await done(A);
      await wait(2000);
    }
  }
  const sel = A.page.getByLabel("Choose the option that was most valuable to you");
  const opts: string[] = await sel.locator("option").allInnerTexts();
  const idx = opts.map((o: string) => o.includes("orbit")).lastIndexOf(true);
  await point(A, sel, "most valuable");
  if (idx >= 0) await sel.selectOption({ index: idx });
  await type(A, A.page.getByLabel(/Add evidence/), "Grant reference DEMO-2026-117: Orbit Wallet accepted our builder grant.", "evidence", 8);
  await click(A, A.page.getByRole("button", { name: /^Mark/ }).first(), "mark");
  await done(A);
  await wait(2000);
  mark(A, "O1 end");
  await close(A, "buyerA");

  const O = await open("operator", "o2-oracle");
  await go(O, "/admin#oracle");
  mark(O, "O2 start");
  await connect(O, "operator");
  await wait(1500);
  await point(O, O.page.getByText("Outcome oracle", { exact: true }).first(), "oracle");
  await wait(2500);
  await O.page.mouse.wheel(0, 400);
  log(O, "scroll", "oracle rows");
  await wait(3000);
  mark(O, "O2 end");
  await close(O);
}

/** Settlement, claim to a fresh address. */
async function p7() {
  await waitStatus(6, "Waiting for settlement (keeper)", 25);
  const S = await open("scout1", "s5-claim");
  await go(S, "/scout/positions");
  mark(S, "S5 start");
  await maybeConnect(S, "scout1");
  await wait(1500);
  const fresh = Keypair.fromSecretKey(Uint8Array.from(state.recipient!)).publicKey.toBase58();
  await type(S, S.page.getByLabel("Recipient Solana address"), fresh, "recipient", 3);
  await click(S, S.page.getByRole("button", { name: /claim/i }).last(), "claim");
  await done(S);
  await wait(2500);
  mark(S, "S5 end");
  await close(S, "scout1");
}


/** Second round for B9, B10, O1, O2 with roomy windows. Setup steps run off camera. */
async function r2() {
  const config: any = await program.account.config.fetch(P.config());
  const resume = process.env.R2_MARKET ? Number(process.env.R2_MARKET) : -1;
  const id = resume >= 0 ? resume : Number(config.marketCount);
  if (resume < 0) {
  const A0 = await open("buyerA");
  await go(A0, "/create");
  await maybeConnect(A0, "buyerA");
  await A0.page.getByLabel("Market question").fill(QUESTION);
  await A0.page.getByLabel("Market type").selectOption("1");
  await A0.page.getByLabel("Reserve price in USDC").fill("50");
  await A0.page.getByLabel("Flat price in USDC").fill("30");
  await A0.page.getByLabel("Use short demo windows").check();
  for (const [k, v] of [["submit", "12"], ["auction", "3"], ["selection", "6"], ["outcome", "12"], ["dispute", "1"]])
    await A0.page.locator("#window-" + k).fill(v);
  await A0.page.getByRole("button", { name: "Create market", exact: true }).click();
  await A0.page.waitForFunction(() => location.pathname.startsWith("/markets/"), {}, { timeout: 240000 });
  await close(A0, "buyerA");
  }
  state.marketId = id;
  save();
  console.log("r2 market", id);
  for (const [role, team, reason] of [
    ["scout1", "github.com/demo-team-orbit/orbit-wallet",
      "Their lead engineer showed me an unreleased dashboard with 1,200 weekly active wallets on a closed beta. The CTO said a rival L2 offered co-marketing, yet their board meets on 30 October to choose a chain. Demo data, synthetic team."],
    ["scout2", "github.com/demo-team-kite/kite-lend",
      "I advise this team. They closed a paid pilot with a regional bank last week and need an audit partner before mainnet. Their founder told me another ecosystem's grant is still unsigned. Demo data, synthetic team."],
    ["scout3", "github.com/demo-team-tidal/tidal-games",
      "I playtested their build. Retention on day seven is 41 percent among 900 testers, not yet public. They plan to pick an ecosystem after their November raise and want gaming distribution. Demo data, synthetic team."],
  ] as const) {
    const T = await open(role);
    await scoutStake(T, role, team, reason);
    await close(T, role);
    console.log("r2 stake", role);
  }
  await waitStatus(2, "r2 waiting for auction", 25);
  for (const [role, ceiling, bid] of [["buyerA", "200", "150"], ["buyerB", "160", "120"]] as const) {
    const B = await open(role);
    await go(B, "/buyer/markets/" + id);
    await maybeConnect(B, role);
    await B.page.getByLabel("Ceiling deposit, public", { exact: true }).fill(ceiling);
    await B.page.getByLabel("Your bid, sealed", { exact: true }).fill(bid);
    await (await readyButton(B, "Seal and submit bid")).click();
    await done(B);
    await close(B, role);
    console.log("r2 bid", role);
  }
  await waitStatus(3, "r2 waiting for resolution", 20);
  {
    const B = await open("buyerA");
    await go(B, "/buyer/markets/" + id);
    await maybeConnect(B, "buyerA");
    const refund = B.page.getByRole("button", { name: "Claim bid refund", exact: true });
    if (await refund.count()) { await (await readyButton(B, "Claim bid refund")).click(); await done(B); }
    await (await readyButton(B, "Decrypt my view", 300000)).click();
    await done(B);
    await hideTeam(B, "kite");
    await close(B, "buyerA");
    console.log("r2 winner selected");
  }
  {
    const B = await open("buyerB", "b9-second");
    await go(B, "/buyer/markets/" + id);
    mark(B, "B9 start");
    await maybeConnect(B, "buyerB");
    await wait(1500);
    const refund = B.page.getByRole("button", { name: "Claim bid refund", exact: true });
    if (await refund.count()) { await click(B, await readyButton(B, "Claim bid refund"), "refund"); await done(B); }
    await click(B, await readyButton(B, "Decrypt my view", 300000), "decrypt");
    await done(B);
    await wait(1500);
    await hideTeam(B, "tidal", true);
    await wait(1500);
    mark(B, "B9 end");
    await close(B, "buyerB");
  }
  {
    const C = await open("buyerC", "b10-flat");
    await go(C, "/buyer/markets/" + id);
    mark(C, "B10 start");
    await maybeConnect(C, "buyerC");
    await wait(1500);
    await click(C, await readyButton(C, "Buy remaining signals", 400000), "buy flat");
    await done(C);
    await click(C, await readyButton(C, "Decrypt my view", 300000), "decrypt");
    await done(C);
    await wait(1500);
    await point(C, C.page.getByText("Signals", { exact: true }).first(), "remaining view");
    await wait(2500);
    mark(C, "B10 end");
    await close(C, "buyerC");
  }
  await waitStatus(4, "r2 waiting for outcome window", 20);
  {
    const A = await open("buyerA", "o1-outcome");
    await go(A, "/buyer/markets/" + id);
    mark(A, "O1 start");
    await maybeConnect(A, "buyerA");
    await wait(1500);
    await click(A, await readyButton(A, "Decrypt my view", 300000), "decrypt");
    await done(A);
    const sel = A.page.getByLabel("Choose the option that was most valuable to you");
    const opts: string[] = await sel.locator("option").allInnerTexts();
    const idx = opts.map((o: string) => o.includes("orbit")).lastIndexOf(true);
    await point(A, sel, "most valuable");
    if (idx >= 0) await sel.selectOption({ index: idx });
    await type(A, A.page.getByLabel(/Add evidence/), "Grant reference DEMO-2026-117: Orbit Wallet accepted our builder grant.", "evidence", 8);
    await click(A, A.page.getByRole("button", { name: /^Mark/ }).first(), "mark");
    await done(A);
    await wait(2000);
    mark(A, "O1 end");
    await close(A, "buyerA");
  }
  {
    const O = await open("operator", "o2-oracle");
    await go(O, "/admin#oracle");
    mark(O, "O2 start");
    await maybeConnect(O, "operator");
    await wait(1500);
    await point(O, O.page.getByText("Outcome oracle", { exact: true }).first(), "oracle");
    await wait(2500);
    await O.page.mouse.wheel(0, 400);
    log(O, "scroll", "oracle rows");
    await wait(3000);
    mark(O, "O2 end");
    await close(O);
  }
}

async function hideTeam(B: Take, team: string, onCamera = false) {
  const boxes = B.page.getByLabel("Hide this option from later buyers");
  await boxes.first().waitFor({ timeout: 300000 });
  const n = await boxes.count();
  let target = boxes.first();
  for (let i = 0; i < n; i++) {
    const txt = (await boxes.nth(i).locator("xpath=ancestor::article[1]").innerText()).toLowerCase();
    if (txt.includes(team)) target = boxes.nth(i);
  }
  const confirm = B.page.getByRole("button", { name: "Confirm 1 exclusive options", exact: true });
  if (onCamera) {
    await click(B, target, "hide option");
    await click(B, confirm, "confirm hide");
  } else {
    await target.check();
    await confirm.click();
  }
  await done(B);
}

const PHASES: Record<string, () => Promise<void>> = { setup, p1, p2, p3, p4, p5, p6, p7, r2 };
const phase = process.argv[2];
try {
  if (!PHASES[phase]) throw Error("Unknown phase " + phase);
  await PHASES[phase]();
} catch (e) {
  let i = 0;
  for (const pg of openPages)
    await pg.screenshot({ path: `${process.env.REC_DEBUG ?? "/tmp"}/fail-${i++}.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
