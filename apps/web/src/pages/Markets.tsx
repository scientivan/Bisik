import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { type Market } from "../lib/api";
import { cachedApi, cachedValue, useDataVersion } from "../lib/live";
import { amount, category, remaining } from "../lib/amounts";
import { Icon, Note, Pill } from "../components/ui";
import { InfoTip } from "../components/info-tip";
import { Banner, Steps, type Role } from "../components/roles";

const STAGES = ["Open", "Closed", "Auction", "Allocated", "OutcomeWindow", "Settling", "Settled"];
const stageLabel = (s: string) => (s === "OutcomeWindow" ? "Outcome" : s);

/**
 * What the public preview says, in measured terms. The MPC preview counts options by how much
 * weighted stake they hold compared with the leading option (see `preview` in encrypted-ixs).
 */
function previewText(p: NonNullable<Market["preview"]>) {
  if (!p.backed) return "No team has received scout support yet.";
  const parts = [
    p.strong && `${p.strong} with strong support`,
    p.medium && `${p.medium} with moderate support`,
    p.weak && `${p.weak} with light support`,
  ].filter(Boolean);
  return `${p.backed} ${p.backed === 1 ? "team has" : "teams have"} support${parts.length ? `: ${parts.join(", ")}` : ""}.`;
}
// Market-wide tier mix of staked calls from the server (never per option). null means 1 to 4 calls and
// "many" means k or more; both hide exact counts so a small group of scouts cannot be singled out.
type TierSupport = { k: number; counts: (number | null | "many")[] } | null | undefined;
const CATEGORIES = [0, 1, 2, 3, 4];
const HELP = {
  question: "What the buyer wants to know. Each proposed team is a possible answer. Round and category are reference labels.",
  stage: "Where the market is in its life. Open means scouts can stake, Auction means buyers can bid, and Settled means payouts are done.",
  support: "How much backing scouts have given so far. A call is one scout's stake and reason behind a team; one scout can make up to three calls, so calls are not people. The bar compares teams with the best-backed one without naming them.",
  tiers: "Scouts prove a GitHub contribution range without revealing the account. Gold is 1,000 or more, Silver 300 to 999, Bronze 50 to 299. Counts below 5 are hidden so a small group cannot be singled out.",
  price: "Exclusive bid is the reserve price for one of the two exclusive slots; winners pay the next-highest bid and may hide signals from later buyers. Shared access is the flat price for the signals left over.",
  stake: "The amount you can put behind one call. It comes back after settlement even if the call is wrong. Only a proven hoax loses its stake, and that money goes to charity. Devnet uses mock USDC.",
};
const TIER_SHORT = ["Bronze", "Silver", "Gold"];
const hasTiers = (t: TierSupport) => !!t && t.counts.some((n) => n !== 0);
function TierChips({ t }: { t: TierSupport }) {
  if (!t) return null;
  const chips = [2, 1, 0].filter((i) => t.counts[i] !== 0).map((i) => {
    const n = t.counts[i];
    return <span className={`tier-chip t${i}`} key={i}>{TIER_SHORT[i]} {n === null ? `<${t.k}` : n === "many" ? `${t.k}+` : n}</span>;
  });
  return chips.length ? <span className="tier-chips">{chips}</span> : null;
}
function SupportBar({ p }: { p: NonNullable<Market["preview"]> }) {
  if (!p.backed) return <small>No team backed yet</small>;
  const parts: [number, string, string][] = [[p.strong, "strong", "strong"], [p.medium, "medium", "moderate"], [p.weak, "weak", "light"]];
  return (
    <span className="support-mini" role="img" aria-label={previewText(p)}>
      <span className="support-bar">{parts.filter(([n]) => n).map(([n, c]) => <i key={c} className={c} style={{ flex: n }} />)}</span>
      <small>{parts.filter(([n]) => n).map(([n, , l]) => `${n} ${l}`).join(" · ")}</small>
    </span>
  );
}
function Head({ label, help, align = "start" }: { label: string; help: string; align?: "start" | "end" }) {
  return <span className="head-label">{label}<InfoTip title={label} align={align}>{help}</InfoTip></span>;
}

// Old integration fixtures share technical titles. Give only these synthetic records
// clearly labelled illustrative questions; the stored questions remain unchanged.
const DEMO_QUESTIONS: Record<number, string> = {
  0: "Which DeFi team is preparing a mainnet launch before announcing it?",
  1: "Which consumer app has private traction worth a grants team's attention?",
  2: "Which DeFi team needs liquidity partners before choosing a chain?",
  3: "Which DeFi teams from recent hackathons are worth courting before they pick a chain?",
  4: "Which team needs audit funding to reach mainnet?",
  5: "Which team has an unsigned offer from a rival ecosystem?",
  6: "Which founder is about to commit to building full-time?",
  7: "Which team's private beta is gaining real users?",
  8: "Which team will choose its blockchain in the next two weeks?",
  9: "Which team has a red flag a buyer should know about?",
};
const isIntegrationDemo = (m: Market) =>
  /^Synthetic browser (auction )?integration(?: round)?$/i.test(m.question?.trim() ?? "") || /\(DEMO\)\s*$/i.test(m.question?.trim() ?? "");
function questionText(m: Market, markets: Market[]) {
  if (isIntegrationDemo(m)) {
    return DEMO_QUESTIONS[m.id] ?? `Round #${m.id}: Which builder team is ready to commit to an ecosystem?`;
  }
  const question = m.question?.trim() || "Question not published yet";
  const repeated = markets.filter(other =>
    !isIntegrationDemo(other) && (other.question?.trim() || "Question not published yet").toLowerCase() === question.toLowerCase(),
  ).length > 1;
  return repeated ? `Round #${m.id}: ${question}` : question;
}

export default function Markets({ role = "buyer" }: { role?: Role }) {
  const scout = role === "scout";
  const remembered = cachedValue<{ markets: Market[] }>("/markets");
  const version = useDataVersion();
  const [markets, setMarkets] = useState<Market[]>(remembered?.markets ?? []),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!remembered),
    [filter, setFilter] = useState(scout ? "Open" : ""),
    [cat, setCat] = useState<number | null>(null);
  async function load(signal?: AbortSignal) {
    try {
      const d = await cachedApi<{ markets: Market[] }>("/markets", signal);
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
  }, [version]);
  const shown = markets.filter((m) => (!filter || m.status === filter) && (cat === null || m.category === cat));
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
        <label className="category-filter">
          <span>Team category</span>
          <select value={cat ?? ""} onChange={(e) => setCat(e.target.value === "" ? null : Number(e.target.value))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{category(c)} ({markets.filter((m) => m.category === c).length})</option>)}
          </select>
        </label>
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
        <Note title="No markets match these filters">Choose another stage or category{scout ? "." : ", or open the next round."}</Note>
      ) : (
        <div className="market-table" role="table" aria-label="Markets">
          <div className="market-row head" role="row">
            <span role="columnheader"><Head label="Question" help={HELP.question} /></span>
            <span role="columnheader"><Head label="Stage" help={HELP.stage} /></span>
            <span role="columnheader"><Head label="Scout support" help={HELP.support} /></span>
            <span role="columnheader">{scout ? <Head label="Stake per call" help={HELP.stake} align="end" /> : <Head label="Access price" help={HELP.price} align="end" />}</span>
            <span role="columnheader" className="sr-only">Action</span>
          </div>
          {shown.map((m) => (
            <div className="market-row" role="row" key={m.id}>
              <div role="cell" className="market-q">
                <strong>{questionText(m, markets)}</strong>
                <small className="q-meta">{isIntegrationDemo(m) && <span className="demo-tag">Demo</span>}Round #{m.id} · {category(m.category)}</small>
                <small>{m.optionCount === 0 ? "No teams proposed yet" : `${m.optionCount} ${m.optionCount === 1 ? "team" : "teams"} proposed`}</small>
              </div>
              <div role="cell">
                <Pill state={m.status === "Open" ? "blue" : m.status === "Auction" ? "yours" : "sealed"}>{stageLabel(m.status)}</Pill>
                <small className="when">
                  {m.status === "Open" ? `${remaining(m.submitEnd)} left to stake` : m.status === "Auction" ? `${remaining(m.auctionEnd)} left to bid` : ""}
                </small>
              </div>
              <div role="cell" className="market-backing">
                <span className="cell-label"><Head label="Scout support" help={HELP.support} /></span>
                {m.positions === 0 ? (
                  <span className="muted-line">No calls yet</span>
                ) : (
                  <span className="support-line"><strong>{m.positions} {m.positions === 1 ? "call" : "calls"}</strong><span className="usdc-chip">{amount(m.totalStaked ?? 0)} USDC</span></span>
                )}
                {m.preview ? <SupportBar p={m.preview} /> : m.positions > 0 && <small className="sealed-line"><Icon name="lock" /> Spread sealed until scouting closes</small>}
                {m.positions > 0 && hasTiers((m as Market & { tierSupport?: TierSupport }).tierSupport) && <span className="tier-line"><TierChips t={(m as Market & { tierSupport?: TierSupport }).tierSupport} /><InfoTip title="Scout tiers" align="start">{HELP.tiers}</InfoTip></span>}
              </div>
              <div role="cell" className="market-price">
                <span className="cell-label">{scout ? <Head label="Stake per call" help={HELP.stake} /> : <Head label="Access price" help={HELP.price} />}</span>
                {scout ? (
                  <>
                    <span className="stake-range">{amount(m.minStake)}–{amount(m.maxStake)} <small>USDC</small></span>
                    <span className="stake-return"><Icon name="check" /> Refundable</span>
                  </>
                ) : (
                  <dl className="price-pairs">
                    <div><dt>Exclusive</dt><dd>from {amount(m.reservePrice)} USDC</dd></div>
                    <div><dt>Shared</dt><dd>{amount(m.flatPrice)} USDC</dd></div>
                  </dl>
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
      {markets.some(isIntegrationDemo) && <p className="fine table-foot">Questions tagged Demo are illustrative titles for synthetic test rounds on devnet. Amounts are mock USDC.</p>}
    </>
  );
}
