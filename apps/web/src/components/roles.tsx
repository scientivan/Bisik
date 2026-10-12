import { Link, NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useWallet } from "../lib/wallet";

/** The Operator workspace is hidden from everyone except this wallet (Dien, 13 Oct 2026). */
export const OPERATOR_WALLET = "BCdn3EvSPE8TpdSDuHKfBdZkznvWfRZWgUhS5VWi1ai7";
export function useIsOperator() {
  return useWallet().publicKey?.toBase58() === OPERATOR_WALLET;
}

/** Every app page belongs to one role, so a visitor always knows whose job they are looking at. */
export type Role = "buyer" | "scout" | "operator";
export const ROLES: {
  id: Role;
  label: string;
  home: string;
  action: string;
  who: string;
  does: string;
  pages: { to: string; label: string; end?: boolean }[];
  steps?: string[];
}[] = [
  {
    id: "buyer",
    label: "Buyer",
    home: "/markets",
    action: "Buy signals",
    who: "Ecosystems and grant teams",
    does: "Buy private, stake-backed calls about teams before a rival hears them.",
    pages: [
      { to: "/markets", label: "Browse signals", end: true },
      { to: "/buyer/bids", label: "My bids" },
      { to: "/create", label: "Open a market" },
    ],
    steps: ["Read the market-wide preview", "Bid for exclusivity or buy at a flat price", "Decrypt your own view", "Report what happened"],
  },
  {
    id: "scout",
    label: "Scout",
    home: "/scout",
    action: "Sell insights",
    who: "Judges, mentors and senior developers",
    does: "Sell what you saw, anonymously, with a refundable stake behind each call.",
    pages: [
      { to: "/scout", label: "Browse markets", end: true },
      { to: "/scout/positions", label: "Stakes & rewards" },
    ],
    steps: ["Prove your GitHub record", "Back an option with a reason and a stake", "Claim stake and reward to a fresh address"],
  },
  {
    id: "operator",
    label: "Operator",
    home: "/admin",
    action: "Manage Bisik",
    who: "The Bisik operator",
    does: "Verify buyers, review hoax disputes and keep markets moving.",
    pages: [
      { to: "/admin", label: "Verify buyers", end: true },
      { to: "/admin#disputes", label: "Review disputes" },
      { to: "/admin#oracle", label: "Outcome oracle" },
      { to: "/admin#maintenance", label: "Market tools" },
      { to: "/admin#deploy-wallet", label: "Deploy wallets" },
    ],
  },
];

export function roleOf(path: string): Role {
  if (path.startsWith("/scout") || /^\/markets\/\d+/.test(path)) return "scout";
  if (path.startsWith("/admin")) return "operator";
  return "buyer";
}

function RoleIcon({ role }: { role: Role }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {role === "buyer" ? <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6m-3-3v6" /></> :
        role === "scout" ? <><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4" /></> :
        <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>}
    </svg>
  );
}

/** Role selection changes the workspace, never the wallet's permissions. */
export function RoleTabs() {
  const role = roleOf(useLocation().pathname);
  const operator = useIsOperator();
  return (
    <nav className="role-switch" aria-label="Use Bisik as">
      {ROLES.filter((r) => r.id !== "operator" || operator).map((r) => (
        <Link key={r.id} to={r.home} className={r.id === role ? "active" : ""} aria-current={r.id === role ? "true" : undefined} title={`${r.label}: ${r.action}`}>
          <RoleIcon role={r.id} />
          <span>{r.label}<span className="visually-hidden">, {r.action}</span></span>
        </Link>
      ))}
    </nav>
  );
}

/** The current role's tools, shown inline next to the wordmark. */
export function RolePages() {
  const location = useLocation();
  const role = ROLES.find((r) => r.id === roleOf(location.pathname))!;
  const active = (to: string) => {
    const [pathname, fragment] = to.split("#");
    if (role.id === "operator") return location.pathname === pathname && location.hash === (fragment ? `#${fragment}` : "");
    if (to === "/scout") return location.pathname === to || /^\/markets\/\d+/.test(location.pathname);
    if (to === "/markets") return location.pathname === to || location.pathname.startsWith("/buyer/markets/");
    return location.pathname === pathname;
  };
  return (
    <nav className="role-tools" aria-label={`${role.label} tools`}>
      {role.pages.map((p) => <Link key={p.to} to={p.to} className={active(p.to) ? "active" : ""} aria-current={active(p.to) ? "page" : undefined}>{p.label}</Link>)}
    </nav>
  );
}

/** Under the header: who this role is, what it does here, and its pages. */
export function RoleBar() {
  const role = ROLES.find((r) => r.id === roleOf(useLocation().pathname))!;
  return (
    <div className="role-bar">
      <div className="container role-bar-inner">
        <div className="role-copy">
          <strong>{role.who}</strong>
          <span>{role.does}</span>
        </div>
        <nav aria-label={`${role.label} pages`} className="role-pages">
          {role.pages.map((p) => (
            <NavLink key={p.to} to={p.to} end={p.end}>
              {p.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

/**
 * One quiet line saying where this page sits in the role's flow. The full explanation lives on
 * the guide page, so working pages stay focused (Dien, 12 Oct 2026).
 */
export function Steps({ role, at }: { role: Role; at: number }) {
  const steps = ROLES.find((r) => r.id === role)?.steps ?? [];
  if (!steps[at]) return null;
  return (
    <p className="step-hint">
      <span>Step {at + 1} of {steps.length} for {role === "buyer" ? "buyers" : "scouts"}</span>
      <strong>{steps[at]}</strong>
      <Link to={`/guide?role=${role}#step-${at + 1}`}>How this works</Link>
    </p>
  );
}

/** Page summary banner: one sentence on what this page is for, plus up to three real facts. */
export function Banner({ title, children, stats = [] }: { title: string; children?: ReactNode; stats?: { value: string; label: string }[] }) {
  return (
    <section className="banner">
      <div className="banner-copy">
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {stats.length > 0 && (
        <dl className="banner-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
