import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon, Mark } from "./ui";
import { useTheme } from "../lib/theme";

const sections = ["Mechanism", "Parts", "Payouts", "Flow", "Source"];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  useEffect(() => {
    const update = () => setCompact(window.scrollY > 100);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById("landing-menu-toggle")?.focus();
      }
    };
    if (open) document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  useEffect(() => setOpen(false), [location]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={`butter-header ${compact ? "compact" : ""} ${open ? "menu-open" : ""}`}>
        <div className="nav-island">
          <Link className="wordmark" to="/" aria-label="Bisik home"><Mark />bisik</Link>
          <nav className="desktop-sections" aria-label="Sections">
            {sections.map(section => <a key={section} href={`#${section.toLowerCase()}`}>{section}</a>)}
          </nav>
          <button id="landing-menu-toggle" className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen(!open)}>
            {open ? <Icon name="close" /> : <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></svg>}
          </button>
        </div>
        <div className="action-island">
          <button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><Icon name={theme === "light" ? "moon" : "sun"} /></button>
          <Link className="button small" to="/markets">Open the app</Link>
        </div>
        <nav id="landing-menu" className="expanded-menu" aria-label="Expanded sections" hidden={!open}>
          {sections.map(section => <a key={section} href={`#${section.toLowerCase()}`} onClick={() => setOpen(false)}>{section}<Icon /></a>)}
          <Link to="/guide" onClick={() => setOpen(false)}>Try the walkthrough<Icon /></Link>
        </nav>
      </header>
    </>
  );
}
