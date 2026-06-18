import { Star } from "lucide-react";
import type { CanonicalRiverSummary } from "../services/canonicalRiverApi";
import type { SectionObservationMeasure } from "../services/observationApi";
import { disciplineLabel } from "../appCore";
import { getObservationStats } from "../lib/format";

interface RiverCardProps {
  river: CanonicalRiverSummary;
  onOpen: (riverId: string) => void;
  isFavourite?: boolean;
  onToggleFavourite?: (riverId: string) => void;
  // Live level for this river's primary gauge. `undefined` = not shown (e.g.
  // Discovery); `null` = loaded but no gauge; a measure = show the reading.
  level?: SectionObservationMeasure | null;
}

const TREND_ARROW: Record<string, string> = {
  rising: "▲",
  falling: "▼",
  steady: "→",
};

// Shared card for the Discovery and Dashboard pages — the Surge demo "river
// card" (name, where, grade, optional live level) over the rich static data we
// already hold. Live levels are only passed on the Dashboard (a small favourite
// set); Discovery omits them. A card opens the river on the map.
export function RiverCard({
  river,
  onOpen,
  isFavourite,
  onToggleFavourite,
  level,
}: RiverCardProps) {
  const where = [river.region, river.nation].filter(Boolean).join(" · ");
  const stats = level ? getObservationStats(level) : null;

  return (
    <article className="river-card">
      <div className="river-card__head">
        <button
          className="river-card__open"
          type="button"
          onClick={() => onOpen(river.id)}
        >
          <span className="river-card__name">{river.displayName}</span>
          {where ? <span className="river-card__where">{where}</span> : null}
        </button>
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
              onClick={() => onToggleFavourite(river.id)}
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
    </article>
  );
}
