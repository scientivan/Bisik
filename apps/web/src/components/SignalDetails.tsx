import type { Signals } from "../lib/api";
import { Pill } from "./ui";

type SignalOption = Signals["options"][number];

/** Plain-language names for the Veritas flags the server attaches to a reason. */
const FLAG_TEXT: Record<string, string> = {
  likely_duplicate: "Much of this reason repeats an earlier one",
  likely_ai_written: "This reason reads like AI-written text",
  ai_unavailable: "The AI-writing check could not run for this reason",
  no_verifiable_claims: "This reason has no facts you could check",
};

const TIERS: { label: string; meaning: string; cls: string }[] = [
  { label: "Gold", meaning: "1,000 or more", cls: "strong" },
  { label: "Silver", meaning: "300 to 999", cls: "medium" },
  { label: "Bronze", meaning: "50 to 299", cls: "weak" },
];

const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

/** Supporter tiers as a small labelled bar chart, strongest tier first. */
function TierBars({ dist }: { dist: number[] }) {
  const counts = [dist[2] ?? 0, dist[1] ?? 0, dist[0] ?? 0];
  const max = Math.max(1, ...counts);
  const total = counts.reduce((s, n) => s + n, 0);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <strong>Who backed this option</strong>
      <p className="fine">
        {total === 1 ? "One scout" : `${total} scouts`} backed this option.
        Tiers come from verified GitHub contributions in the last 12 months.
        Identities stay hidden.
      </p>
      <div
        className="strength-bars"
        role="img"
        aria-label={TIERS.map((t, i) => `${counts[i]} ${t.label}`).join(", ")}
      >
        {TIERS.map((t, i) => (
          <div className="strength-row" key={t.label} title={`${t.label} means ${t.meaning} contributions`}>
            <span>{t.label}</span>
            <span className="strength-track">
              <span
                className={`strength-fill ${t.cls}`}
                style={{ width: `${(counts[i] / max) * 100}%` }}
              />
            </span>
            <strong>{counts[i]}</strong>
          </div>
        ))}
      </div>
      <p className="fine" style={{ fontSize: 12 }}>
        Gold means 1,000 or more contributions, Silver 300 to 999, Bronze 50 to 299.
      </p>
    </div>
  );
}

/** One scout reason with its Veritas indicators and flags in plain words. */
function ReasonBlock({ r, n }: { r: SignalOption["reasons"][number]; n: number }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <strong>Reason {n}</strong>
      <p>{r.filteredText}</p>
      <div className="row" style={{ gap: 8 }}>
        <Pill>{pct(r.D)} likely copied from earlier reasons</Pill>
        <Pill>
          {r.A === null || r.A === undefined
            ? "AI-writing check unavailable"
            : `${pct(r.A)} likely written by AI`}
        </Pill>
      </div>
      {r.flags.length > 0 && (
        <ul className="fine">
          {r.flags.map((f) => (
            <li key={f}>{FLAG_TEXT[f] ?? "Flagged by the Veritas check"}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Everything the operator API returns for one option in the buyer's view, written so a
 * first-time reader understands each number. Uses only fields the server already sends.
 */
export function SignalDetails({
  option,
  showScore,
  demo = false,
}: {
  option: SignalOption;
  showScore: boolean;
  demo?: boolean;
}) {
  const checkable = option.claims.filter((c) => c.kind === "verifiable");
  const opinions = option.claims.filter((c) => c.kind !== "verifiable");
  return (
    <div className="stack" style={{ gap: 18 }}>
      {showScore && typeof option.score === "number" && (
        <p className="fine">
          {option.score >= 1
            ? "This option holds the most stake in this market."
            : `This option holds ${pct(option.score)} of the stake behind the most-backed option in this market.`}
          {demo ? " Demo value." : ""}
        </p>
      )}
      <TierBars dist={option.tierDist} />
      {option.reasons.map((r, i) => (
        <ReasonBlock r={r} n={i + 1} key={i} />
      ))}
      <div className="stack" style={{ gap: 8 }}>
        <strong>Facts you can check</strong>
        {checkable.length ? (
          <ul>
            {checkable.map((c) => (
              <li key={`${c.id}~${c.nullifier ?? ""}`}>{c.text}</li>
            ))}
          </ul>
        ) : (
          <p className="fine">No checkable facts were found in these reasons.</p>
        )}
        <p className="fine" style={{ fontSize: 12 }}>
          Nobody has confirmed these yet. If one turns out to be false, you can
          open a hoax dispute during the outcome window.
        </p>
      </div>
      {opinions.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <strong>Scout opinions</strong>
          <ul>
            {opinions.map((c) => (
              <li key={`${c.id}~${c.nullifier ?? ""}`}>{c.text}</li>
            ))}
          </ul>
          <p className="fine" style={{ fontSize: 12 }}>
            Opinions are judgment calls. A wrong opinion is never slashed.
          </p>
        </div>
      )}
    </div>
  );
}

/** Shown once per revealed view, so the indicators are not read as proof. */
export function IndicatorNote() {
  return (
    <p className="fine" style={{ fontSize: 12 }}>
      The copy and AI percentages are estimates from the Veritas check. They
      help you decide where to look first. They are not proof, and no scout is
      penalised because of them.
    </p>
  );
}
