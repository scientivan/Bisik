/** Explicit devnet-only upgrade, using configured authority; never log RPC keys. */
import dotenv from "dotenv";
import { Connection, Keypair } from "@solana/web3.js";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PROGRAM_ID } from "@bisik/sdk";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname, quiet: true });
const rpc = process.env.SOLANA_RPC_URL;
if (!rpc || /localhost|127\.0\.0\.1/.test(rpc)) throw Error("Expected configured devnet RPC");
const connection = new Connection(rpc, "confirmed");
const genesis = await connection.getGenesisHash();
if (genesis !== await new Connection("https://api.devnet.solana.com").getGenesisHash()) throw Error("Not devnet");
const audit = JSON.parse(readFileSync(new URL("../tmp/devnet-upgrade-audit.json", import.meta.url), "utf8"));
if (audit.programId !== PROGRAM_ID.toBase58() || audit.genesis !== genesis) throw Error("Audit does not match deployment");
if (audit.markets.some((m: any) => m.aggBusy || m.auctionBusy || (m.positions > 0 && m.status !== "Settled"))) throw Error("Finish active markets before upgrade");
const keyPath = (process.env.OPERATOR_KEYPAIR_PATH ?? "~/.config/solana/id.json").replace(/^~(?=\/)/, homedir());
const key = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(keyPath, "utf8"))));
if (key.publicKey.toBase58() !== audit.authorityWallet) throw Error("Authority changed");
const binary = "contracts/target/deploy/bisik.so";
const hash = createHash("sha256").update(readFileSync(binary)).digest("hex");
const resume = process.argv.includes("--resume");
const dir = resume
  ? readdirSync(tmpdir()).filter(x => x.startsWith("bisik-devnet-upgrade-")).map(x => join(tmpdir(), x)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
  : mkdtempSync(join(tmpdir(), "bisik-devnet-upgrade-"));
if (!dir) throw Error("No existing buffer to resume");
const bufferPath = join(dir, "buffer.json");
if (!resume) writeFileSync(bufferPath, JSON.stringify(Array.from(Keypair.generate().secretKey)), { mode: 0o600 });
const bufferKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(bufferPath, "utf8"))));
writeFileSync(new URL("../tmp/devnet-upgrade-buffer.json", import.meta.url), JSON.stringify({ buffer: bufferKey.publicKey.toBase58(), keyPath: bufferPath, binarySha256: hash }));
const deployRpc = process.argv.includes("--public-rpc") ? "https://api.devnet.solana.com" : rpc;
console.log(JSON.stringify({ programId: PROGRAM_ID.toBase58(), binarySha256: hash, authority: key.publicKey.toBase58() }));
const child = spawn("solana", ["program", "deploy", binary, "--program-id", PROGRAM_ID.toBase58(), "--upgrade-authority", keyPath, "--keypair", keyPath, "--buffer", bufferPath, "--url", deployRpc, "--use-rpc", "--max-sign-attempts", "10", "--with-compute-unit-price", "1000", "--output", "json"], { stdio: ["ignore", "pipe", "pipe"] });
let output = "";
const log = (data: Buffer) => {
  const safe = data.toString().split(rpc).join("<configured devnet RPC>");
  output += safe; process.stdout.write(safe);
};
child.stdout.on("data", log); child.stderr.on("data", log);
const code = await new Promise<number>((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
writeFileSync(new URL("../tmp/devnet-upgrade-result.json", import.meta.url), JSON.stringify({ programId: PROGRAM_ID.toBase58(), binarySha256: hash, exitCode: code, output }, null, 2));
if (code !== 0) throw Error("Upgrade failed; persistent buffer retained for recovery");
