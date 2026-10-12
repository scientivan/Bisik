/** Read-only pre/post-upgrade audit. Never prints RPC credentials or secret keys. */
import { Connection, Keypair } from "@solana/web3.js";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import dotenv from "dotenv";
import { makeProvider, program as mkProgram, pdas, PROGRAM_ID, STATUS_NAMES } from "@bisik/sdk";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname, quiet: true });
const rpc = process.env.SOLANA_RPC_URL;
if (!rpc || /localhost|127\.0\.0\.1/.test(rpc)) throw Error("Expected configured devnet RPC");
const connection = new Connection(rpc, "confirmed");
const genesis = await connection.getGenesisHash();
const devnetGenesis = await new Connection("https://api.devnet.solana.com", "confirmed").getGenesisHash();
if (genesis !== devnetGenesis) throw Error("Configured RPC does not match public Solana devnet");
const keyPath = (process.env.OPERATOR_KEYPAIR_PATH ?? "~/.config/solana/id.json").replace(/^~(?=\/)/, homedir());
const signer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(keyPath, "utf8"))));
const program: any = mkProgram(makeProvider(connection, signer));
const p = pdas(PROGRAM_ID);
const config = await program.account.config.fetch(p.config());
const markets = await program.account.market.fetchMultiple(Array.from({ length: config.marketCount.toNumber() }, (_, i) => p.market(i)));
const report = {
  genesis, programId: PROGRAM_ID.toBase58(), authorityWallet: signer.publicKey.toBase58(), keyPath,
  balanceSol: (await connection.getBalance(signer.publicKey)) / 1e9,
  legacyTeamBps: config.teamBps,
  markets: markets.flatMap((m: any, i: number) => m ? [{ id: i, status: STATUS_NAMES[m.status], optedMask: m.optedMask, teamPaid: m.teamPaid, positions: m.positionCount, settled: m.settledCount, aggBusy: m.aggBusy, auctionBusy: m.auctionBusy, feesWithdrawn: m.feesWithdrawn }] : []),
};
writeFileSync(new URL("../tmp/devnet-upgrade-audit.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
