/** Bounded, resumable writes to an already-funded loader-v3 buffer. Never deploys by itself. */
import dotenv from "dotenv";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname, quiet: true });
const connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
if (await connection.getGenesisHash() !== await new Connection("https://api.devnet.solana.com").getGenesisHash()) throw Error("Not devnet");
const state = JSON.parse(readFileSync(new URL("../tmp/devnet-upgrade-buffer.json", import.meta.url), "utf8"));
const buffer = new PublicKey(state.buffer);
const keyPath = (process.env.OPERATOR_KEYPAIR_PATH ?? "~/.config/solana/id.json").replace(/^~(?=\/)/, homedir());
const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(keyPath, "utf8"))));
const binary = readFileSync(new URL("../contracts/target/deploy/bisik.so", import.meta.url));
if (createHash("sha256").update(binary).digest("hex") !== state.binarySha256) throw Error("Binary changed");
const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const account = await connection.getAccountInfo(buffer);
if (!account || !account.owner.equals(loader) || account.data.readUInt32LE(0) !== 1 || account.data[4] !== 1 || !new PublicKey(account.data.subarray(5, 37)).equals(authority.publicKey)) throw Error("Unexpected buffer or authority");
const missing: number[] = [];
const chunkSize = 800;
for (let offset = 0; offset < binary.length; offset += chunkSize) {
  const bytes = binary.subarray(offset, Math.min(offset + chunkSize, binary.length));
  if (!account.data.subarray(37 + offset, 37 + offset + bytes.length).equals(bytes)) missing.push(offset);
}
// Stable bincode ABI from solana-loader-v3-interface 6.1.1 instruction::write:
// enum Write (u32=1), offset (u32), Vec length (u64), payload.
const instruction = (offset: number) => {
  const bytes = binary.subarray(offset, Math.min(offset + chunkSize, binary.length));
  const data = Buffer.alloc(16 + bytes.length);
  data.writeUInt32LE(1, 0); data.writeUInt32LE(offset, 4); data.writeBigUInt64LE(BigInt(bytes.length), 8); bytes.copy(data, 16);
  return new TransactionInstruction({ programId: loader, keys: [{ pubkey: buffer, isSigner: false, isWritable: true }, { pubkey: authority.publicKey, isSigner: true, isWritable: false }], data });
};
const transaction = (offset: number) => new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), instruction(offset));
console.log(JSON.stringify({ buffer: buffer.toBase58(), missingChunks: missing.length, chunkSize }));
if (missing.length) {
  const test = transaction(missing[0]);
  const simulation = await connection.simulateTransaction(test, [authority]);
  if (simulation.value.err) throw Error("Write simulation failed: " + JSON.stringify(simulation.value.err));
  console.log("Loader write simulation passed; sending only missing chunks.");
}
let cursor = 0, completed = 0;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const worker = async () => {
  while (cursor < missing.length) {
    const offset = missing[cursor++];
    for (let attempt = 0; ; attempt++) {
      try {
        const signature = await connection.sendTransaction(transaction(offset), [authority], { skipPreflight: false, maxRetries: 3 });
        let confirmed = false;
        for (let poll = 0; poll < 60; poll++) {
          const status = (await connection.getSignatureStatuses([signature])).value[0];
          if (status?.err) throw Error("Write transaction failed");
          if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") { confirmed = true; break; }
          await wait(1000);
        }
        if (!confirmed) throw Error("Write confirmation timed out");
        completed++;
        if (completed % 20 === 0 || completed === missing.length) console.log(JSON.stringify({ completed, total: missing.length }));
        await wait(250);
        break;
      } catch (error) {
        if (attempt >= 4) throw Error("Buffer write failed at offset " + offset);
        console.log(JSON.stringify({ retryOffset: offset, attempt: attempt + 1 }));
        await wait(1000 * (attempt + 1));
      }
    }
  }
};
await Promise.all([worker(), worker()]);
const final = await connection.getAccountInfo(buffer);
if (!final || !final.data.subarray(37, 37 + binary.length).equals(binary)) throw Error("Buffer verification failed");
console.log("Buffer matches tested binary exactly; ready for CLI finalization.");
