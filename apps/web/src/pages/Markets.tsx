import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Market } from "../lib/api";
import { amount, category, remaining } from "../lib/amounts";
import { Frame, Icon, Note, PageTitle, Pill, Sonogram } from "../components/ui";
export default function Markets() {
  const [markets, setMarkets] = useState<Market[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState("");
  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const d = await api<{ markets: Market[] }>(
        `/markets${filter ? "?status=" + filter : ""}`,
        undefined,
        undefined,
        signal,
      );
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
  }, [filter]);
  return (
    <>
      <PageTitle title="Listen for what comes next.">
        Private, stake-backed calls. Choose a market to scout or buy an
        allocated view.
      </PageTitle>
      <div className="row between">
        <label className="field">
          Market stage
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All stages</option>
            {[
              "Open",
              "Closed",
              "Auction",
              "Allocated",
              "OutcomeWindow",
              "Settling",
              "Settled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="row">
          <Link className="button outline" to="/demo">
            Explore the synthetic demo
          </Link>
          <Link className="button" to="/create">
            Create a market <Icon />
          </Link>
        </div>
      </div>
      {error ? (
        <Note title="Markets could not load">
          {error}
          <button className="button" onClick={() => void load()}>
            Try again
          </button>
        </Note>
      ) : loading ? (
        <Note title="Loading markets">
          Reading market accounts from the server.
        </Note>
      ) : !markets.length ? (
        <Frame>
          <div className="empty">
            <h3>No markets in this stage.</h3>
            <p>Choose another stage or create the next round.</p>
          </div>
        </Frame>
      ) : (
        <div className="market-grid">
          {markets.map((m) => (
            <Frame
              key={m.id}
              title={`Market ${m.id}`}
              body={`${category(m.category)}. ${m.optionCount} sealed options and ${m.positions} positions.`}
            >
              <div className="stack">
                <div className="row between">
                  <Pill state={m.status === "Open" ? "blue" : "sealed"}>
                    {m.status === "OutcomeWindow" ? "Outcome window" : m.status}
                  </Pill>
                  <span className="fine">Solana devnet</span>
                </div>
                <div className="signal-strip">
                  <Sonogram variant="sealed" seed={7 + m.id * 13} />
                </div>
                {m.preview ? (
                  <p>
                    {m.preview.backed} backed options · {m.preview.strong}{" "}
                    strong · {m.preview.medium} medium · {m.preview.weak} weak
                  </p>
                ) : (
                  <p>Signals stay sealed while scouts submit.</p>
                )}
                <p className="fine">
                  Stake {amount(m.minStake)}–{amount(m.maxStake)} USDC
                  {m.status === "Open"
                    ? ` · ${remaining(m.submitEnd)} left`
                    : ""}
                </p>
                <div className="row">
                  <Link className="button small" to={`/buyer/markets/${m.id}`}>
                    Buyer view
                  </Link>
                  <Link
                    className="button small outline"
                    to={`/markets/${m.id}`}
                  >
                    Scout view
                  </Link>
                </div>
              </div>
            </Frame>
          ))}
        </div>
      )}
      <Note title="Devnet uses mock USDC">
        The token in these markets is for the demo. Public previews describe the
        market as a whole and reveal no team identities.
      </Note>
    </>
  );
}
