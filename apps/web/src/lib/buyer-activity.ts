import { Connection, PublicKey } from "@solana/web3.js";
import { P } from "./chain";

/**
 * Every market a buyer took part in, read from public accounts: sealed bids (Bid), allocations
 * (Market.buyers/winners/pools) and outcome marks (Market.masks). Used by the buyer's "My bids" page.
 */
export type Stage = "action" | "progress" | "won" | "outbid" | "done";
export interface Activity {
  marketId: number;
  status: string;
  kind: number;
  /** How this buyer is in the market. */
  role: "exclusive-creator" | "winner-1" | "winner-2" | "shared" | "bidder";
  bidPlaced: boolean;
  ceiling: number | null;
  refunded: boolean;
  paid: number | null;
  marked: number;
  stage: Stage;
  next: string;
}

const STATUS = ["Open", "Closed", "Auction", "Allocated", "OutcomeWindow", "Settling", "Settled"];
const scan = new Connection(import.meta.env.VITE_SOLANA_SCAN_RPC_URL || "https://api.devnet.solana.com", "confirmed");

export async function fetchBuyerActivity(buyer: PublicKey): Promise<Activity[]> {
  const sdk = await import("@bisik/sdk");
  const program: any = sdk.program(new sdk.anchor.AnchorProvider(scan, {} as any, { commitment: "confirmed" }));
  const me = buyer.toBase58();
  const cfg: any = await program.account.config.fetch(P.config());
  const count = Number(cfg.marketCount);
  const keys = Array.from({ length: count }, (_, i) => P.market(i));
  const markets: any[] = [];
  for (let i = 0; i < keys.length; i += 100) markets.push(...(await program.account.market.fetchMultiple(keys.slice(i, i + 100))));
  const bids: any[] = await program.account.bid.all([{ memcmp: { offset: 40, bytes: me } }]);
  const bidBy = new Map(bids.map((b) => [b.account.market.toBase58(), b.account]));
  const out: Activity[] = [];
  markets.forEach((m, id) => {
    if (!m) return;
    const bid = bidBy.get(keys[id].toBase58());
    const index = (m.buyers as PublicKey[]).slice(0, m.buyerCount).findIndex((b) => b.toBase58() === me);
    if (!bid && index < 0) return;
    const status = STATUS[m.status] ?? "Open";
    const role: Activity["role"] =
      m.kind === 0 && index === 0 ? "exclusive-creator"
        : m.winners[0].toBase58() === me ? "winner-1"
          : m.winners[1].toBase58() === me ? "winner-2"
            : index >= 0 ? "shared" : "bidder";
    const marked = index >= 0 ? Number(m.masks[index]) : 0;
    const refunded = !!bid?.refunded;
    let stage: Stage, next: string;
    if (role === "bidder") {
      if (status === "Auction" || (status === "Closed" && bid?.placed)) [stage, next] = ["progress", "Waiting for the sealed auction to close."];
      else if (refunded) [stage, next] = ["outbid", "Outbid. Your deposit was refunded."];
      else [stage, next] = ["action", "Outbid. Claim your deposit back."];
    } else if (status === "Allocated" && (role === "winner-1" || role === "winner-2")) {
      [stage, next] = ["action", "Read your signals and choose which to keep hidden."];
    } else if (status === "OutcomeWindow") {
      [stage, next] = marked ? ["won", "Outcome reported. Waiting for settlement."] : ["action", "Report what happened before the window closes."];
    } else if (status === "Settling" || status === "Settled") {
      [stage, next] = ["done", status === "Settled" ? "Settled. Scouts were paid from your payment." : "Payouts are being settled."];
    } else {
      [stage, next] = ["progress", status === "Open" ? "Scouts are still staking." : "Waiting for the next stage."];
    }
    out.push({
      marketId: id, status, kind: m.kind, role, bidPlaced: !!bid?.placed,
      ceiling: bid ? Number(bid.ceiling) : null, refunded,
      paid: index >= 0 ? Number(m.pools[index]) : null, marked, stage, next,
    });
  });
  return out.sort((a, b) => b.marketId - a.marketId);
}
