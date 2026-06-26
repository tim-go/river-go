import type { ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

// Shared shell for the map detail panels (POI, selected river, waterway stretch).
// Owns the chrome only — positioned container (desktop side-panel ⟷ mobile bottom
// sheet), fixed header, expand/close, and the scrolling `.panel-content` body — so
// every panel reads at the same size, height and behaviour. Pass the body as
// `children`; `actions` are extra header buttons (rendered before expand/close).
export function DetailPanel({
  title,
  eyebrow,
  subtitle,
  badges,
  actions,
  expanded = false,
  onToggleExpand,
  onClose,
  ariaLabel,
  className,
  children,
}: {
  title: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onClose: () => void;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      // Panels are conditionally mounted (rendered only when open), so a mounted
      // panel is always open — carry --open so the shared shell is visible at every
      // breakpoint (the slide/visibility rules are keyed off it).
      className={`detail-panel detail-panel--open${
        expanded ? " detail-panel--expanded" : ""
      }${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      <header className="detail-panel__header">
        <div className="detail-panel__heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {subtitle ? <p className="detail-panel__subtitle">{subtitle}</p> : null}
          {badges ? <div className="detail-panel__badges">{badges}</div> : null}
        </div>
        <div className="detail-panel__actions">
          {actions}
          {onToggleExpand ? (
            <button
              className="icon-button icon-button--compact"
              type="button"
              aria-label={expanded ? "Collapse details" : "Expand details"}
              title={expanded ? "Collapse" : "Expand"}
              onClick={onToggleExpand}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          ) : null}
          <button
            className="icon-button icon-button--compact"
            type="button"
            aria-label="Close details"
            title="Close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="panel-content panel-content--tabbed">{children}</div>
    </section>
  );
}
