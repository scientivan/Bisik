import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWallet } from "../lib/wallet";
import { amount } from "../lib/amounts";
import { fetchBuyerActivity, type Activity, type Stage } from "../lib/buyer-activity";
import { recall, remember, useDataVersion } from "../lib/live";
import { Icon, WalletActionButton } from "../components/ui";
import { InfoTip } from "../components/info-tip";

const FILTERS: { id: "all" | Stage; label: string }[] = [
  { id: "all", label: "All" },
  { id: "action", label: "Needs you" },
  { id: "progress", label: "In progress" },
  { id: "won", label: "Won or bought" },
  { id: "outbid", label: "Outbid" },
  { id: "done", label: "Settled" },
];
const ROLE: Record<Activity["role"], string> = {
  "exclusive-creator": "Only buyer",
  "winner-1": "Exclusive winner #1",
  "winner-2": "Exclusive winner #2",
  shared: "Shared access",
  bidder: "Sealed bid",
};
const STAGE_LABEL: Record<Stage, string> = { action: "Needs you", progress: "In progress", won: "Won or bought", outbid: "Outbid", done: "Settled" };

export default function MyBids() {
  const wallet = useWallet(), version = useDataVersion();
  const me = wallet.publicKey?.toBase58() ?? null;
  const [params, setParams] = useSearchParams();
  const show = (params.get("show") ?? "all") as "all" | Stage;
  const [rows, setRows] = useState<Activity[] | null>(() => (me ? recall<Activity[]>(`bids:${me}`) ?? null : null));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!wallet.publicKey) return;
    const key = wallet.publicKey.toBase58();
    setRows(recall<Activity[]>(`bids:${key}`) ?? null);
    fetchBuyerActivity(wallet.publicKey).then((r) => setRows(remember(`bids:${key}`, r))).catch((e) => setError(e.message));
  }, [me, version]);

  const count = (id: "all" | Stage) => (rows ?? []).filter((r) => id === "all" || r.stage === id).length;
  const shown = (rows ?? []).filter((r) => show === "all" || r.stage === show);
  return (
    <div className="profile">
      <div className="profile-head">
        <div>
          <h1>My bids</h1>
          <p>Every market you bid in, won or bought access to, and what to do next.</p>
        </div>
        <Link className="chip-button" to="/profile"><Icon name="arrow" /> Your track record</Link>
      </div>
      {!me ? (
        <section className="identity-card">
          <span className="pmark pmark-empty" style={{ width: 64, height: 64 }} aria-hidden="true" />
          <div className="identity-copy">
            <h2>Connect the wallet you buy with</h2>
            <p className="identity-meta">Your bids are read from that wallet's public records.</p>
          </div>
          <div className="identity-side"><WalletActionButton className="button">Connect Wallet</WalletActionButton></div>
        </section>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter bids">
            {FILTERS.map((f) => (
              <button key={f.id} className={`chip ${show === f.id ? "active" : ""} ${f.id === "action" && count("action") ? "attention" : ""}`} onClick={() => setParams(f.id === "all" ? {} : { show: f.id }, { replace: true })}>
                {f.label} <span>{rows ? count(f.id) : "…"}</span>
              </button>
            ))}
          </div>
          {error && <div className="note-card"><Icon name="info" /><p><strong>Could not read your bids.</strong> {error}</p></div>}
          {!rows ? (
            <p className="fine">Reading your bids from Solana devnet.</p>
          ) : shown.length === 0 ? (
            <div className="note-card">
              <Icon name="info" />
              <p><strong>{rows.length ? "Nothing in this filter." : "No bids yet."}</strong> {rows.length ? "Pick another filter above." : "Browse open markets and place a sealed bid or buy shared access."}</p>
              {!rows.length && <Link className="button small" to="/markets">Browse signals</Link>}
            </div>
          ) : (
            <div className="bid-list">
              {shown.map((r) => (
                <article className={`bid-card stage-${r.stage}`} key={r.marketId}>
                  <div className="bid-top">
                    <strong>Round #{r.marketId}</strong>
                    <span className={`stage-tag ${r.stage}`}>{STAGE_LABEL[r.stage]}</span>
                  </div>
                  <div className="bid-facts">
                    <span><small>How you joined</small>{ROLE[r.role]}</span>
                    <span><small>{r.paid !== null ? "Paid" : "Deposit"}</small>{r.paid !== null ? `${amount(r.paid)} USDC` : r.ceiling !== null ? <>{amount(r.ceiling)} USDC <InfoTip title="Deposit, not price">Your sealed bid deposit is a ceiling. Winners pay the next-highest bid; the rest is refunded.</InfoTip></> : "None"}</span>
                    <span><small>Market stage</small>{r.status === "OutcomeWindow" ? "Outcome" : r.status}</span>
                    <span><small>Outcomes marked</small>{r.marked ? r.marked.toString(2).split("").filter((b) => b === "1").length : 0}</span>
                  </div>
                  <div className="bid-bottom">
                    <p className="bid-next">{r.next}</p>
                    <Link className={r.stage === "action" ? "button small" : "button small outline"} to={`/buyer/markets/${r.marketId}`}>Open market</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
