import { keccak, u64be, be32, bytesToBigInt, utf8 } from "./hash.js";

/** scope = (market_id << 8) | slot (task-tracker 6.4). */
export function stakeScope(marketId: bigint, slot: number): bigint {
  if (slot < 1 || slot > 3) throw new Error("slot must be 1..3");
  return (marketId << 8n) | BigInt(slot);
}

export interface StakePayload {
  marketId: bigint;
  slot: number;
  amount: bigint;
  encOptionHash: Uint8Array; // keccak(enc_option ‖ nonce)
  reasonHash: Uint8Array; // keccak(reason text)
  creditHash: Uint8Array; // keccak(credit_ct ‖ credit_nonce)
}

/** message = keccak(market_id u64 ‖ slot u8 ‖ amount u64 ‖ encOptionHash ‖ reasonHash ‖ creditHash), as uint256. */
export function stakeMessage(p: StakePayload): bigint {
  return bytesToBigInt(
    keccak(u64be(p.marketId), new Uint8Array([p.slot]), u64be(p.amount), p.encOptionHash, p.reasonHash, p.creditHash),
  );
}

/** message = keccak("bisik-claim" ‖ recipient pubkey). */
export function claimMessage(recipient: Uint8Array): bigint {
  if (recipient.length !== 32) throw new Error("recipient must be 32 bytes");
  return bytesToBigInt(keccak(utf8("bisik-claim"), recipient));
}

export { be32 };
