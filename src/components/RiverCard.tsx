import { useEffect, useRef, type KeyboardEvent } from "react";
import { Map as MapIcon, Star } from "lucide-react";
import type { CanonicalRiverSummary } from "../services/canonicalRiverApi";
import type { SectionObservationMeasure } from "../services/observationApi";
import { disciplineLabel } from "../appCore";
import {
  buildObservationChartPoints,
  formatShortDateTime,
  getObservationStats,
} from "../lib/format";

interface RiverCardProps {
  river: CanonicalRiverSummary;
  // The card's primary action — "View on map" (select the river + jump to the
  // map). Also fired by the explicit "View on map" button.
  onOpen: (riverId: string) => void;
  // When set, the card body opens the river's detail page instead, and a
  // "View on map" button surfaces the onOpen action.
  onOpenPage?: (riverId: string) => void;
  isFavourite?: boolean;
  onToggleFavourite?: (riverId: string) => void;
  level?: SectionObservationMeasure | null;
  // Called once when the card first scrolls into view — lets Discover lazy-load
  // this river's level instead of fetching all ~62 up front.
  onVisible?: (riverId: string) => void;
}

const TREND_ARROW: Record<string, string> = {
  rising: "▲",
  falling: "▼",
  steady: "→",
};

// Shared card for the Discovery and Dashboard pages — the Surge demo "river
// card": name, where, grade, then a hero level number with sparkline + gauge
// footer when there's a live reading. The whole card is the click target
// (selects the river, zooms the map, opens its detail panel); the favourite
// star is a nested action that stops propagation.
export function RiverCard({
  river,
  onOpen,
  onOpenPage,
  isFavourite,
  onToggleFavourite,
  level,
  onVisible,
}: RiverCardProps) {
  const where = [river.region, river.nation].filter(Boolean).join(" · ");
  const stats = level ? getObservationStats(level) : null;
  const sparkPoints = level ? buildObservationChartPoints(level) : "";

  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!onVisible) {
      return;
    }
    const element = cardRef.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible(river.id);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible, river.id]);

  // Primary card action: the river page when available, else the map.
  const openPrimary = () => (onOpenPage ?? onOpen)(river.id);
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Only act on the card itself, not keystrokes bubbling from nested buttons.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPrimary();
    }
  };

  return (
    <article
      className="river-card"
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={
        onOpenPage
          ? `Open the ${river.displayName} river page`
          : `Open ${river.displayName} on the map`
      }
      onClick={openPrimary}
      onKeyDown={handleKeyDown}
    >
      <div className="river-card__head">
        <div className="river-card__open">
          <span className="river-card__name">{river.displayName}</span>
          {where ? <span className="river-card__where">{where}</span> : null}
        </div>
        <div className="river-card__head-actions">
          {river.grade ? (
            <span className="river-card__grade">{river.grade}</span>
          ) : null}
          {onToggleFavourite ? (
            <button
              className={`river-card__fav${
                isFavourite ? " river-card__fav--active" : ""
              }`}
              type="button"
              aria-pressed={Boolean(isFavourite)}
              aria-label={
                isFavourite ? "Remove from favourites" : "Add to favourites"
              }
              title={isFavourite ? "Favourited" : "Favourite this river"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavourite(river.id);
              }}
            >
              <Star size={15} fill={isFavourite ? "currentColor" : "none"} />
            </button>
          ) : null}
        </div>
      </div>

      {level !== undefined ? (
        level &&
        level.latest &&
        typeof level.latest.value === "number" &&
        stats ? (
          <div className="river-card__gauge">
            <div className="river-card__level">
              <span className="river-card__level-num">
                {level.latest.value.toFixed(2)}
              </span>
              <span className="river-card__level-unit">{level.unit}</span>
              <span
                className={`river-card__trend river-card__trend--${stats.trend}`}
              >
                {TREND_ARROW[stats.trend]} {stats.trend}
              </span>
            </div>
            {sparkPoints ? (
              <svg
                className="river-card__spark"
                viewBox="0 0 240 72"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  className={`river-card__spark-line river-card__spark-line--${stats.trend}`}
                  points={sparkPoints}
                />
              </svg>
            ) : null}
            <div className="river-card__gauge-foot">
              <span>{level.stationName}</span>
              <span>{formatShortDateTime(level.latest.observedAt)}</span>
            </div>
          </div>
        ) : (
          <p className="river-card__no-gauge">No live gauge</p>
        )
      ) : null}

      <div className="river-card__tags">
        {river.discipline ? (
          <span
            className={`discipline-chip discipline-chip--${river.discipline}`}
          >
            {disciplineLabel(river.discipline)}
          </span>
        ) : null}
        <span className="river-card__stat">
          {river.sectionCount} section{river.sectionCount === 1 ? "" : "s"}
        </span>
        {river.candidatePoiCount ? (
          <span className="river-card__stat">
            {river.candidatePoiCount} points
          </span>
        ) : null}
      </div>
      {river.summary ? (
        <p className="river-card__summary">{river.summary}</p>
      ) : null}
      {onOpenPage ? (
        <div className="river-card__actions">
          <button
            className="ghost-button ghost-button--compact"
            type="button"
            aria-label={`View ${river.displayName} on the map`}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(river.id);
            }}
          >
            <MapIcon size={14} />
            View on map
          </button>
        </div>
      ) : null}
    </article>
  );
}
