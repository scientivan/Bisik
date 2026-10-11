import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Market } from "../lib/api";
import { amount, category, remaining } from "../lib/amounts";
import { Icon, Note, Pill } from "../components/ui";
import { Banner, Steps, type Role } from "../components/roles";

const STAGES = ["Open", "Closed", "Auction", "Allocated", "OutcomeWindow", "Settling", "Settled"];
const stageLabel = (s: string) => (s === "OutcomeWindow" ? "Outcome" : s);

/**
 * What the public preview says, in measured terms. The MPC preview counts options by how much
 * weighted stake they hold compared with the leading option (see `preview` in encrypted-ixs).
 */
function previewText(p: NonNullable<Market["preview"]>) {
  const parts = [
    p.strong && `${p.strong} near the top`,
    p.medium && `${p.medium} in the middle`,
    p.weak && `${p.weak} trailing`,
  ].filter(Boolean);
  return `${p.backed} of the options are backed${parts.length ? `, ${parts.join(", ")}` : ""}.`;
}
const PREVIEW_HELP =
  "Near the top means at least half the stake of the leading option. Middle means 20 to 50 percent of it. Trailing means under 20 percent.";

export default function Markets({ role = "buyer" }: { role?: Role }) {
  const scout = role === "scout";
  const [markets, setMarkets] = useState<Market[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState(scout ? "Open" : "");
  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const d = await api<{ markets: Market[] }>("/markets", undefined, undefined, signal);
      setMarkets(d.markets);
      setError("");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);
  const shown = filter ? markets.filter((m) => m.status === filter) : markets;
  const staked = markets.reduce((s, m) => s + (m.totalStaked ?? 0), 0);
  const positions = markets.reduce((s, m) => s + m.positions, 0);
  const counts = Object.fromEntries(STAGES.map((s) => [s, markets.filter((m) => m.status === s).length]));
  return (
    <>
      <Banner
        title={scout ? "Back a team you know something about." : "Hear about a team before your rivals do."}
        stats={[
          { value: String(markets.length), label: "Markets on devnet" },
          { value: String(positions), label: "Calls staked" },
          { value: `${amount(staked)} USDC`, label: "Staked behind them" },
        ]}
      >
        {scout
          ? "Each market asks a buyer’s question. Pick one where you saw something first hand, explain it, and stake on it without revealing who you are."
          : "Each market is a question an ecosystem wants answered. Scouts back teams with a stake and a reason. You see how the backing is spread, then bid to read who and why."}
      </Banner>
      <Steps role={role} at={scout ? 1 : 0} />
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by stage">
          <button className={filter === "" ? "chip active" : "chip"} onClick={() => setFilter("")}>
            All <span>{markets.length}</span>
          </button>
          {STAGES.filter((s) => counts[s]).map((s) => (
            <button key={s} className={filter === s ? "chip active" : "chip"} onClick={() => setFilter(s)}>
              {stageLabel(s)} <span>{counts[s]}</span>
            </button>
          ))}
        </div>
        {!scout && (
          <Link className="button small" to="/create">
            Open a market <Icon />
          </Link>
        )}
      </div>
      {error ? (
        <Note title="Markets could not load">
          {error}{" "}
          <button className="button small outline" onClick={() => void load()}>
            Try again
          </button>
        </Note>
      ) : loading ? (
        <Note title="Loading markets">Reading market accounts from the chain.</Note>
      ) : !shown.length ? (
        <Note title="No markets in this stage">Choose another stage{scout ? "." : " or open the next round."}</Note>
      ) : (
        <div className="market-table" role="table" aria-label="Markets">
          <div className="market-row head" role="row">
            <span role="columnheader">Question</span>
            <span role="columnheader">Stage</span>
            <span role="columnheader">Backing so far</span>
            <span role="columnheader">{scout ? "Your stake" : "Price"}</span>
            <span role="columnheader" className="sr-only">Action</span>
          </div>
          {shown.map((m) => (
            <div className="market-row" role="row" key={m.id}>
              <div role="cell" className="market-q">
                <strong>{m.question ?? "Question not published yet"}</strong>
                <small>
                  Market {m.id} · {category(m.category)} · {m.optionCount} team options
                </small>
              </div>
              <div role="cell">
                <Pill state={m.status === "Open" ? "blue" : m.status === "Auction" ? "yours" : "sealed"}>{stageLabel(m.status)}</Pill>
                <small className="when">
                  {m.status === "Open" ? `${remaining(m.submitEnd)} left to stake` : m.status === "Auction" ? `${remaining(m.auctionEnd)} left to bid` : ""}
                </small>
              </div>
              <div role="cell" className="market-backing">
                <span>
                  {m.positions} {m.positions === 1 ? "call" : "calls"} · {amount(m.totalStaked ?? 0)} USDC staked
                </span>
                <small title={PREVIEW_HELP}>{m.preview ? previewText(m.preview) : "Spread stays sealed until submissions close."}</small>
              </div>
              <div role="cell" className="market-price">
                {scout ? (
                  <span>
                    {amount(m.minStake)} to {amount(m.maxStake)} USDC, refunded
                  </span>
                ) : (
                  <span>
                    From {amount(m.reservePrice)} USDC exclusive, {amount(m.flatPrice)} USDC flat
                  </span>
                )}
              </div>
              <div role="cell" className="market-action">
                {scout ? (
                  <Link className={m.status === "Open" ? "button small" : "button small outline"} to={`/markets/${m.id}`}>
                    {m.status === "Open" ? "Back an option" : "View"}
                  </Link>
                ) : (
                  <Link className={m.status === "Auction" || m.status === "Allocated" ? "button small" : "button small outline"} to={`/buyer/markets/${m.id}`}>
                    {m.status === "Auction" ? "Bid" : m.status === "Allocated" ? "Read signals" : "View"}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Note title="How to read the backing">
        {PREVIEW_HELP} The spread is public; which team holds which share stays sealed. Devnet markets use mock USDC.
      </Note>
    </>
  );
}
