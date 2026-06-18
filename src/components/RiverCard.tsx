import { Star } from "lucide-react";
import type { CanonicalRiverSummary } from "../services/canonicalRiverApi";
import { disciplineLabel } from "../appCore";

interface RiverCardProps {
  river: CanonicalRiverSummary;
  onOpen: (riverId: string) => void;
  isFavourite?: boolean;
  onToggleFavourite?: (riverId: string) => void;
}

// Shared card for the Discovery and Dashboard pages — the Surge demo "river
// card" (name, where, grade) over the rich static data we already hold. Live
// levels are intentionally not fetched here (per-section EA/NRW/SEPA feeds are
// too heavy for a full grid); a card opens the river on the map where the level
// loads. Favourite control is optional so Discovery and Dashboard can share it.
export function RiverCard({
  river,
  onOpen,
  isFavourite,
  onToggleFavourite,
}: RiverCardProps) {
  const where = [river.region, river.nation].filter(Boolean).join(" · ");

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
