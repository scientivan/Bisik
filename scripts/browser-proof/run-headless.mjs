// Serve the built harness (vite preview), open it in headless Chrome via playwright-core, and save the result.
// Usage: node run-headless.mjs [--artifacts=pinned|cdn] [--runs=3] [--channel=chrome|chromium] [--throttle=1]
import { preview } from "vite";
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const mode = arg("artifacts", "pinned");
const runs = arg("runs", "3");
const channel = arg("channel", "chrome");
const throttle = Number(arg("throttle", "1")); // CDP CPU slowdown factor, e.g. 4 ~ low-end laptop / mid phone
const here = dirname(fileURLToPath(import.meta.url));

const server = await preview({ root: here, configFile: join(here, "vite.config.ts") });
const url = `http://localhost:4317/?artifacts=${mode}&runs=${runs}`;
const browser = await chromium.launch({ channel, headless: true });
try {
  const page = await browser.newPage();
  page.on("console", (m) => console.log(`[browser] ${m.text().slice(0, 200)}`));
  if (throttle > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  }
  page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__B4__ !== undefined, null, { timeout: 180_000 });
  const result = await page.evaluate(() => window.__B4__);
  result.browserVersion = browser.version();
  result.wallClockPageMs = Date.now() - t0;
  result.cpuThrottle = throttle;
  mkdirSync(join(here, "results"), { recursive: true });
  const out = join(here, "results", `browser-${mode}${throttle > 1 ? `-x${throttle}` : ""}.json`);
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`\nresult ok=${result.ok} browser=${result.browserVersion} timings=${JSON.stringify(result.timings)}`);
  console.log(`saved ${out}`);
  if (!result.ok) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
