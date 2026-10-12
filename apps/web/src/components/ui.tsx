import { useDataVersion } from "../lib/live";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
} from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useTheme } from "../lib/theme";
import { useWallet } from "../lib/wallet";
import { short, remaining } from "../lib/amounts";
import { useAction } from "../lib/hooks";
import { RolePages, RoleTabs } from "./roles";
export function Icon({ name = "arrow" }: { name?: string }) {
  const paths: Record<string, ReactNode> = {
    moon: <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    external: <path d="M7 17 17 7M9 7h8v8" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v5l3 2M9 2h6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v.1" />
      </>
    ),
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.arrow}
    </svg>
  );
}
export function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="8" width="3" height="6" rx="1.5" fill="currentColor" />
      <rect x="7" y="3" width="3" height="16" rx="1.5" fill="currentColor" />
      <rect
        x="13"
        y="6"
        width="3"
        height="10"
        rx="1.5"
        className="mark-accent"
      />
      <rect x="19" y="9" width="2" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}
export function Pill({
  children,
  state = "public",
}: {
  children: ReactNode;
  state?: string;
}) {
  return <span className={`pill ${state}`}>{children}</span>;
}
export function Note({
  children,
  title,
  dark = false,
}: {
  children: ReactNode;
  title?: string;
  dark?: boolean;
}) {
  return (
    <div className={`note ${dark ? "dark" : ""}`}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}
export function Frame({
  children,
  title,
  body,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  body?: string;
  className?: string;
}) {
  return (
    <section className={`frame ${className}`}>
      <div className="panel">{children}</div>
      {title && (
        <div className="card-caption">
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
      )}
    </section>
  );
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {action.busy && (
        <Note title={action.busy}>
          <span className="spinner" /> Keep this page open.
        </Note>
      )}
      {action.error && (
        <Note title="Could not complete this action">{action.error}</Note>
      )}
      {action.result && <Note title="Action completed">{action.result}</Note>}
    </div>
  );
}
export function PageTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="banner">
      <div className="banner-copy">
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  );
}
export function Header({ landing = false }: { landing?: boolean }) {
  const wallet = useWallet(),
    action = useAction(),
    { theme, toggle } = useTheme();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={landing ? "landing-header" : "app-header"}>
        <div className="header-inner">
          <div className="header-left">
            <Link className="wordmark" to="/" aria-label="Bisik home">
              <Mark />
              bisik
            </Link>
            {landing ? (
              <nav aria-label="Sections">
                {["Mechanism", "Parts", "Payouts", "Flow", "Source"].map(
                  (s) => (
                    <a key={s} href={`#${s.toLowerCase()}`}>
                      {s}
                    </a>
                  ),
                )}
              </nav>
            ) : <RolePages />}
          </div>
          <div className="header-actions">
            {!landing && <RoleTabs />}
            {!landing && (
              <nav className="header-links" aria-label="Help and account">
                <NavLink to="/guide">How it works</NavLink>
                <NavLink to="/profile">Profile</NavLink>
              </nav>
            )}
            <button
              className="theme-toggle"
              onClick={toggle}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
            {landing ? (
              <Link className="button bone small" to="/markets">
                Open the app
              </Link>
            ) : (
              <button
                className="button ink small"
                onClick={() =>
                  wallet.publicKey
                    ? action.run("Disconnecting wallet", wallet.disconnect)
                    : wallet.requestConnect()
                }
                disabled={!!action.busy}
              >
                {wallet.publicKey
                  ? short(wallet.publicKey.toBase58())
                  : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>
      {(action.error || action.busy) && (
        <div className="container">
          <Feedback action={action} />
        </div>
      )}
    </>
  );
}
/** A disconnected action opens the shared picker; it never submits a transaction. */
export function WalletActionButton({ children, disabled, onClick, type = "button", requiresWallet = true, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { requiresWallet?: boolean }) {
  const wallet = useWallet();
  const needsConnection = requiresWallet && !wallet.publicKey;
  return <button {...props} type={needsConnection ? "button" : type}
    disabled={needsConnection ? !!wallet.connecting : disabled}
    onClick={event => {
      if (needsConnection) {
        event.preventDefault();
        wallet.requestConnect();
      } else onClick?.(event);
    }}>
    {needsConnection ? wallet.connecting ? "Connecting…" : "Connect Wallet" : children}
  </button>;
}
/**
 * Disputes are tracked onchain by a counter on the market (`open_disputes`), not by a lifecycle
 * state. Pass `openDisputes`, or `marketId`; without either, the route's `:id` is used.
 */
function useOpenDisputes(marketId?: number, given?: number) {
  const params = useParams();
  const id = marketId ?? (params.id !== undefined && /^\d+$/.test(params.id) ? Number(params.id) : undefined);
  const [count, setCount] = useState<number | null>(null);
  const version = useDataVersion();
  useEffect(() => {
    if (given !== undefined || id === undefined) return;
    let live = true;
    const load = () =>
      api<{ openOnchain: number | null }>(`/disputes/open/${id}`)
        .then((r) => live && setCount(r.openOnchain))
        .catch(() => {});
    void load();
    return () => {
      live = false;
    };
  }, [id, given, version]);
  return given ?? count ?? 0;
}
export function StatusStrip({ status, end, marketId, openDisputes }: { status: string; end?: number; marketId?: number; openDisputes?: number }) {
  const disputes = useOpenDisputes(marketId, openDisputes);
  const stages = [
    "Open",
    "Closed",
    "Auction",
    "Allocated",
    "OutcomeWindow",
    "Settling",
    "Settled",
  ];
  return (
    <Frame className="status-frame">
      <div className="status-content">
        <div className="status-copy">
          <span className="icon-tile">
            <Icon name="clock" />
          </span>
          <div>
            <h3>
              {status === "Auction"
                ? "Auction"
                : status === "Open"
                  ? "Submissions"
                  : status === "OutcomeWindow"
                    ? "Outcome window"
                    : status}
              {end ? ` closes in ${remaining(end)}` : ""}
            </h3>
            <p>
              {disputes > 0
                ? "Settlement waits until the operator resolves every open dispute."
                : "The keeper advances this market when its window ends."}
            </p>
            {disputes > 0 && (
              <span
                className="cipher"
                tabIndex={0}
                aria-label={`${disputes === 1 ? "Dispute open" : `${disputes} disputes open`}. A buyer flagged a verifiable claim as a possible hoax. This is not a separate market state.`}
              >
                <Icon name="clock" />
                <span aria-hidden="true">
                  {disputes === 1 ? "Dispute open" : `${disputes} disputes open`}
                </span>
                <span className="cipher-tip" role="tooltip">
                  <strong>Not a separate market state</strong>
                  A buyer flagged a verifiable claim in one reason as a possible
                  hoax. The market stays in its current stage, and settlement
                  waits until the operator decides. A proven hoax sends that
                  stake to charity. Calls that turn out wrong are never slashed.
                </span>
              </span>
            )}
          </div>
        </div>
        <ol className="lifecycle">
          {stages.map((s) => (
            <li
              key={s}
              className={s === status ? "current" : ""}
              aria-current={s === status ? "step" : undefined}
            >
              {s === "OutcomeWindow" ? "Outcome" : s}
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}
/** Deterministic PRNG (Park–Miller) so packets look random but stay stable between renders. */
function prng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const HEX = "0123456789abcdef";
const hexOf = (rand: () => number, n: number) =>
  Array.from({ length: n }, () => HEX[Math.floor(rand() * 16)]).join("");
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return reduced;
}
/**
 * A sealed value: a lock and ciphertext that keeps re-scrambling, because the value exists
 * but nobody can read it. Replaces the old hatched bar.
 */
export function Cipher({
  groups = 3,
  seed = 11,
  reason = "This value is encrypted. Only the Arcium MPC network can compute with it, and nobody can read it.",
}: {
  groups?: number;
  seed?: number;
  reason?: string;
}) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 160);
    return () => window.clearInterval(id);
  }, [reduced]);
  const text = useMemo(() => {
    const rand = prng(seed * 7919 + tick * 104729);
    return Array.from({ length: groups }, () => hexOf(rand, 4)).join("·");
  }, [seed, tick, groups]);
  return (
    <span className="cipher" role="img" tabIndex={0} aria-label={`Sealed value. ${reason}`}>
      <Icon name="lock" />
      <span aria-hidden="true">{text}</span>
      <span className="cipher-tip" role="tooltip">
        <strong>Why is this locked?</strong>
        {reason}
      </span>
    </span>
  );
}
/** Kept for existing call sites. */
export function Hatch({ seed, reason }: { seed?: number; reason?: string } = {}) {
  return <Cipher seed={seed} reason={reason} />;
}
/** Market-wide strength histogram with labels and counts (never tied to an option). */
export function StrengthBars({
  strong,
  medium,
  weak,
}: {
  strong: number;
  medium: number;
  weak: number;
}) {
  const max = Math.max(1, strong, medium, weak);
  const rows: [string, number, string][] = [
    ["Near the top", strong, "strong"],
    ["Middle", medium, "medium"],
    ["Trailing", weak, "weak"],
  ];
  return (
    <div className="strength-bars" role="img" aria-label={`${strong} options near the top, ${medium} in the middle, ${weak} trailing`}>
      {rows.map(([label, n, cls]) => (
        <div className="strength-row" key={label}>
          <span>{label}</span>
          <span className="strength-track">
            <span className={`strength-fill ${cls}`} style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <strong>{n}</strong>
        </div>
      ))}
    </div>
  );
}
/** What a buyer reads after decrypting: plain sentences, so a first-time visitor understands. */
const REVEALED_LABELS = [
  "Team Lumen picks its chain within 14 days",
  "A rival ecosystem offered Team Nadi a $150k grant, still unsigned",
  "Team Arka’s private beta reached 3,000 weekly users",
  "Team Nadi needs an audit and $50k to reach mainnet",
  "Team Lumen’s lead quits his job next month to go full-time",
  "Judges saw Team Arka’s live demo run on mocked data",
  "Three scouts staked 450 USDC behind Team Lumen",
  "Team Nadi’s founders feel ignored by their current chain",
];
/** Sealed packets say what they carry instead of showing raw ciphertext. */
const INSIDER_KINDS = [
  "Sealed chain decision date",
  "Sealed rival grant offer",
  "Sealed private user count",
  "Sealed funding need",
  "Sealed founder plan",
  "Sealed red flag",
];
const SEALED_LABELS: Record<string, string[]> = {
  hero: INSIDER_KINDS,
  sealed: INSIDER_KINDS,
  dark: INSIDER_KINDS,
  pay: [
    "Ecosystem A paid 2,000 USDC",
    "Scout reward 640 USDC",
    "Stake refunded 100 USDC",
    "Platform fee 300 USDC",
  ],
};
/**
 * Encrypted signal packets streaming right to left. Sealed variants show ciphertext; the
 * "revealed" variant shows the same packets after decryption, in amber.
 * Exported as `Sonogram` too, for existing call sites.
 */
export function SignalStream({
  variant = "hero",
  seed = 7,
  speed = 48,
}: {
  variant?: string;
  seed?: number;
  speed?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    let visible = true;
    const update = () => setPlaying(visible && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        update();
      },
      { threshold: [0, 0.01] },
    );
    if (root.current) observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const lanes = useMemo(() => {
    const rand = prng(seed);
    const count =
      variant === "hero" || variant === "revealed" ? 13 : variant === "dark" ? 6 : variant === "pay" ? 5 : 1;
    return Array.from({ length: count }, (_, l) => {
      const packets = Array.from({ length: variant === "revealed" ? 8 : 16 }, (_, i) => {
        const label =
          variant === "revealed"
            ? REVEALED_LABELS[Math.floor(rand() * REVEALED_LABELS.length)]
            : (SEALED_LABELS[variant] ?? SEALED_LABELS.sealed)[Math.floor(rand() * (SEALED_LABELS[variant] ?? SEALED_LABELS.sealed).length)];
        return { key: `${l}-${i}`, label, gap: 8 + Math.floor(rand() * 40) };
      });
      // Each lane moves at its own pace; the content is doubled so the loop is seamless.
      return { packets: [...packets, ...packets], speed: speed * (0.75 + rand() * 0.5) };
    });
  }, [variant, seed, speed]);
  return (
    <div ref={root} className={`stream ${variant}`} aria-hidden="true" data-playing={playing}>
      {lanes.map((lane, l) => (
        <div className="stream-lane" key={l} style={{ "--speed": `${lane.speed}s` } as CSSProperties}>
          {lane.packets.map((p, i) => (
            <span className="packet" key={i} style={{ marginRight: p.gap }}>
              {variant !== "revealed" && <Icon name="lock" />}
              {p.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
export const Sonogram = SignalStream;
