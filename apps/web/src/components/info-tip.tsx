import { useId, type ReactNode } from "react";
import { Icon } from "./ui";

/**
 * A small info icon whose explanation appears on hover or keyboard focus. Keeps secondary
 * explanations off the page until someone asks for them (Dien, 12 Oct 2026).
 */
export function InfoTip({ title, children, label = "More information", align = "center" }: { title: string; children: ReactNode; label?: string; align?: "center" | "start" | "end" }) {
  const id = useId();
  return (
    <span className={`info-tip align-${align}`}>
      <button type="button" className="info-tip-button" aria-label={`${label}. ${title}`} aria-describedby={id}>
        <Icon name="info" />
      </button>
      <span className="info-tip-body" role="tooltip" id={id}>
        <strong>{title}</strong>
        {children}
      </span>
    </span>
  );
}
