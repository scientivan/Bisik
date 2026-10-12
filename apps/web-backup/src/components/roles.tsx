import { Link, NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/** Every app page belongs to one role, so a visitor always knows whose job they are looking at. */
export type Role = "buyer" | "scout" | "team" | "operator";
export const ROLES: {
  id: Role;
  label: string;
  home: string;
  who: string;
  does: string;
  pages: { to: string; label: string; end?: boolean }[];
  steps?: string[];
}[] = [
  {
    id: "buyer",
    label: "Buyer",
    home: "/markets",
    who: "Ecosystems and grant teams",
    does: "Buy private, stake-backed calls about teams before a rival hears them.",
    pages: [
      { to: "/markets", label: "Markets to buy", end: true },
      { to: "/demo", label: "Walkthrough with demo data" },
      { to: "/create", label: "Open a market" },
    ],
    steps: ["Read the market-wide preview", "Bid for exclusivity or buy at a flat price", "Decrypt your own view", "Report what happened"],
  },
  {
    id: "scout",
    label: "Scout",
    home: "/scout",
    who: "Judges, mentors and senior developers",
    does: "Sell what you saw, anonymously, with a refundable stake behind each call.",
    pages: [
      { to: "/scout/onboard", label: "Get verified" },
      { to: "/scout", label: "Markets to back", end: true },
      { to: "/scout/positions", label: "My positions and claims" },
    ],
    steps: ["Prove your GitHub record", "Back an option with a reason and a stake", "Claim stake and reward to a fresh address"],
  },
  {
    id: "team",
    label: "Team",
    home: "/team",
    who: "Builder teams named in a market",
    does: "Opt in to receive 5% of what buyers pay when your team is a successful option.",
    pages: [{ to: "/team", label: "Opt in to a share" }],
  },
  {
    id: "operator",
    label: "Operator",
    home: "/admin",
    who: "The Bisik operator",
    does: "Verify buyers, review hoax disputes and keep markets moving.",
    pages: [{ to: "/admin", label: "Console" }],
  },
];

export function roleOf(path: string): Role {
  if (path.startsWith("/scout") || /^\/markets\/\d+/.test(path)) return "scout";
  if (path.startsWith("/team")) return "team";
  if (path.startsWith("/admin")) return "operator";
  return "buyer";
}

/** Role switcher shown in the header. */
export function RoleTabs() {
  const role = roleOf(useLocation().pathname);
  return (
    <nav className="role-tabs" aria-label="Choose your role">
      {ROLES.map((r) => (
        <Link key={r.id} to={r.home} className={r.id === role ? "active" : ""} aria-current={r.id === role ? "page" : undefined}>
          {r.label}
        </Link>
      ))}
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

/** Numbered steps of a role's flow; `at` marks the step this page covers. */
export function Steps({ role, at }: { role: Role; at: number }) {
  const steps = ROLES.find((r) => r.id === role)?.steps ?? [];
  return (
    <ol className="steps" aria-label="Where you are in the flow">
      {steps.map((s, i) => (
        <li key={s} className={i === at ? "current" : i < at ? "done" : ""} aria-current={i === at ? "step" : undefined}>
          <span>{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
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
