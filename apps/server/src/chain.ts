/** Operator-side chain access (the operator keypair signs; trust assumptions in README). */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { makeProvider, program as mkProgram, pdas, PROGRAM_ID, anchor } from "@bisik/sdk";

export interface Chain {
  operator: PublicKey;
  registerSourceNullifier(n: Uint8Array): Promise<string>;
  publishGroupRoot(tier: number, epoch: number, root: Uint8Array, size: number): Promise<string>;
  registerBuyer(authority: PublicKey, pseudonymHash: Uint8Array): Promise<string>;
  currentEpoch(): Promise<number>;
  fetchMarket(id: number): Promise<any | null>;
  fetchPositions(marketId: number): Promise<any[]>;
  fetchOption(marketId: number, index: number): Promise<any | null>;
  recordOutcome(marketId: number, buyerIndex: number, option: number, kind: number, evidence: Uint8Array): Promise<string>;
  findDeploys(wallet: PublicKey, sinceUnix: number): Promise<string[]>;
  setDefaultOutcome(marketId: number, buyerIndex: number, option: number): Promise<string>;
}

export function solanaChain(rpcUrl: string, keypairPath: string): Chain {
  const operator = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf8"))));
  const conn = new Connection(rpcUrl, "confirmed");
  const provider = makeProvider(conn, operator);
  const program: any = mkProgram(provider);
  const P = pdas(PROGRAM_ID);
  const send = (b: any) => b.signers([operator]).rpc({ commitment: "confirmed", skipPreflight: true });
  return {
    operator: operator.publicKey,
    registerSourceNullifier: (n) =>
      send(program.methods.registerSourceNullifier(Array.from(n)).accounts({ operator: operator.publicKey, config: P.config(), source: P.source(n) })),
    publishGroupRoot: (tier, epoch, root, size) =>
      send(program.methods.publishGroupRoot(tier, epoch, Array.from(root), size).accounts({ operator: operator.publicKey, config: P.config(), group: P.group(tier, epoch) })),
    registerBuyer: (authority, h) =>
      send(program.methods.registerBuyer(authority, Array.from(h)).accounts({ operator: operator.publicKey, config: P.config(), buyer: P.buyer(authority) })),
    currentEpoch: async () => ((await program.account.config.fetch(P.config())) as any).currentEpoch as number,
    fetchMarket: async (id) => (await program.account.market.fetchNullable(P.market(id))) as any,
    fetchPositions: async (id) => {
      const market = P.market(id);
      const all = await program.account.position.all([{ memcmp: { offset: 8, bytes: market.toBase58() } }]);
      return all.map((a: any) => ({ pubkey: a.publicKey, ...a.account }));
    },
    fetchOption: async (id, index) => (await program.account.optionEntry.fetchNullable(P.option(P.market(id), index))) as any,
    recordOutcome: (id, bi, opt, kind, ev) =>
      send(
        program.methods
          .recordOutcome(bi, opt, kind, Array.from(ev))
          .accounts({ signer: operator.publicKey, config: P.config(), market: P.market(id), outcome: P.outcome(P.market(id), bi, opt) }),
      ),
    setDefaultOutcome: (id, bi, opt) =>
      send(program.methods.setDefaultOutcome(bi, opt).accounts({ operator: operator.publicKey, config: P.config(), market: P.market(id) })),
    /** Program deployments signed by `wallet` since a timestamp (BPF upgradeable loader). */
    findDeploys: async (wallet, since) => {
      const sigs = await conn.getSignaturesForAddress(wallet, { limit: 100 });
      const out: string[] = [];
      for (const s of sigs) {
        if ((s.blockTime ?? 0) < since || s.err) continue;
        const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
        const keys = tx?.transaction.message.staticAccountKeys?.map((k) => k.toBase58()) ?? [];
        if (keys.includes("BPFLoaderUpgradeab1e11111111111111111111111")) out.push(s.signature);
      }
      return out;
    },
  };
}

export { anchor };
