import {
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { pdas, PROGRAM_ID } from "@bisik/sdk";
import { connection } from "./wallet";
export const P = pdas();
export { PROGRAM_ID, TOKEN_PROGRAM_ID };
export async function tokenAccount(
  provider: any,
  owner: PublicKey,
  instructions: TransactionInstruction[] = [],
) {
  const instance: any = (await import("@bisik/sdk")).program(provider);
  const cfg: any = await instance.account.config.fetch(P.config());
  const ata = getAssociatedTokenAddressSync(cfg.usdcMint, owner, true);
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      provider.wallet.publicKey,
      ata,
      owner,
      cfg.usdcMint,
    ),
  );
  return ata;
}
export async function send(
  provider: any,
  instructions: TransactionInstruction[],
) {
  const tx = new Transaction().add(...instructions);
  return provider.sendAndConfirm(tx, [], {
    skipPreflight: true,
    commitment: "confirmed",
  });
}
export async function fetchMarketAccount(id: number) {
  const sdk = await import("@bisik/sdk");
  const readProvider = new sdk.anchor.AnchorProvider(connection, {} as any, {
    commitment: "confirmed",
  });
  const instance: any = sdk.program(readProvider);
  return instance.account.market.fetch(P.market(id)) as Promise<any>;
}
export function requireWallet(provider: any) {
  if (!provider) throw Error("Connect your wallet before continuing.");
  return provider;
}
