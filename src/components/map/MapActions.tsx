import type { ReactNode } from "react";
import "./map-actions.css";

// Floating map actions — "do something" controls (locate, show me, info-click,
// sync…), kept spatially separate from the filter bar (which is "what's shown").
export function MapActions({ children }: { children: ReactNode }) {
  return <div className="map-actions">{children}</div>;
}

interface MapActionButtonProps {
  label: string;
  onClick?: () => void;
  /** Toggle-style action that is currently on (e.g. info-click mode). */
  active?: boolean;
  /** Show an attention dot (e.g. sync has pending changes). */
  badge?: boolean;
  /** Dot tone — "error" turns it red (e.g. sync has failures). */
  badgeTone?: "default" | "error";
  children: ReactNode;
}

export function MapActionButton({
  label,
  onClick,
  active = false,
  badge = false,
  badgeTone = "default",
  children,
}: MapActionButtonProps) {
  return (
    <button
      type="button"
      className={`map-action ${active ? "map-action--active" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      {children}
      {badge ? (
        <span
          className={`map-action__badge${
            badgeTone === "error" ? " map-action__badge--error" : ""
          }`}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
