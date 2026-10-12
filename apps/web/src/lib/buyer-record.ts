import { Connection, PublicKey } from "@solana/web3.js";
import { P } from "./chain";

/**
 * A buyer's public track record. Since the 13 Oct upgrade (task N1) the program keeps an onchain
 * `BuyerRecord` (PDA `["brec", buyer]`) with counters, preferred when it exists. Those counters
 * start at zero at the upgrade, so for buyers active before it each number is the larger of the
 * onchain counter and the count recomputed in the browser from older public accounts (bids,
 * outcome records, disputes). Legacy buyers without a record fall back to the recomputed counts.
 */
export interface BuyerRecord {
  registered: boolean;
  verified: boolean;
  pseudonym: string | null;
  pseudonymHash: number[] | null;
  /** "onchain" when a BuyerRecord account exists, "scan" for legacy buyers. */
  source?: "onchain" | "scan";
  marketsBid: number;
  /** Markets joined by exclusive creation, a bid or a flat purchase (onchain record only). */
  marketsJoined?: number | null;
  /** Times the default rule was applied because the buyer reported nothing (onchain record only). */
  defaultsApplied?: number | null;
  outcomesRecorded: number;
  outcomesOnTime: number;
  disputesOpened: number;
  disputesUpheld: number;
  disputesRejected: number;
  disputesOpen: number;
}

// Program-account scans need an RPC that allows getProgramAccounts (the free Alchemy tier refuses it).
const scan = new Connection(
  import.meta.env.VITE_SOLANA_SCAN_RPC_URL || "https://api.devnet.solana.com",
  "confirmed",
);

const ADJECTIVES = ["Quiet", "Amber", "Patient", "Northern", "Steady", "Silver", "Early", "Careful", "Bright", "Still", "Coastal", "Open", "Tidal", "Clear", "Distant", "Calm"];
const NOUNS = ["Heron", "Harbor", "Lantern", "Cedar", "Falcon", "Meadow", "Compass", "Willow", "Signal", "Orchard", "Beacon", "River", "Summit", "Atlas", "Kestrel", "Juniper"];

/** Turns the onchain pseudonym hash into a name people can remember. Same hash, same name. */
export function pseudonymName(hash: number[] | Uint8Array): string {
  const b = Array.from(hash);
  return `${ADJECTIVES[b[0] % 16]} ${NOUNS[b[1] % 16]} ${((b[2] << 8) | b[3]) % 1000}`.trim();
}

export async function fetchBuyerRecord(buyer: PublicKey): Promise<BuyerRecord> {
  const sdk = await import("@bisik/sdk");
  const provider = new sdk.anchor.AnchorProvider(scan, {} as any, { commitment: "confirmed" });
  const program: any = sdk.program(provider);
  const key = buyer.toBase58();
  // Field offsets after the 8-byte discriminator: Bid and OutcomeRecord store `market` then
  // `buyer`; Dispute stores `market`, `nullifier`, then `buyer`.
  const byBuyer = (offset: number) => [{ memcmp: { offset, bytes: key } }];
  const [profile, onchain, bids, outcomes, disputes] = await Promise.all([
    program.account.buyerProfile.fetchNullable(P.buyer(buyer)),
    // Absent for buyers with no activity since the upgrade (or before the upgrade is deployed).
    program.account.buyerRecord.fetchNullable(P.buyerRecord(buyer)).catch(() => null),
    program.account.bid.all(byBuyer(40)),
    program.account.outcomeRecord.all(byBuyer(40)),
    program.account.dispute.all(byBuyer(72)),
  ]);
  const marketEnds = new Map<string, number>();
  await Promise.all(
    [...new Set(outcomes.map((o: any) => o.account.market.toBase58()))].map(async (m) => {
      const market = await program.account.market.fetchNullable(new PublicKey(m as string));
      if (market) marketEnds.set(m as string, Number(market.outcomeEnd));
    }),
  );
  const status = (s: number) => disputes.filter((d: any) => d.account.status === s).length;
  const marketsBid = new Set(bids.map((b: any) => b.account.market.toBase58())).size;
  const n = (field: string) => Number(onchain?.[field] ?? 0);
  return {
    registered: !!profile,
    verified: !!profile?.verified,
    pseudonym: profile ? pseudonymName(profile.pseudonymHash) : null,
    pseudonymHash: profile ? Array.from(profile.pseudonymHash as number[]) : null,
    source: onchain ? "onchain" : "scan",
    marketsBid,
    marketsJoined: onchain ? Math.max(n("marketsJoined"), marketsBid) : null,
    defaultsApplied: onchain ? n("defaultsApplied") : null,
    outcomesRecorded: Math.max(outcomes.length, n("outcomesRecorded")),
    outcomesOnTime: outcomes.filter((o: any) => {
      const end = marketEnds.get(o.account.market.toBase58());
      return end !== undefined && Number(o.account.at) <= end;
    }).length,
    disputesOpened: Math.max(disputes.length, n("disputesOpened")),
    disputesUpheld: Math.max(status(1), n("disputesUpheld")),
    disputesRejected: Math.max(status(2), n("disputesRejected")),
    disputesOpen: status(0),
  };
}
