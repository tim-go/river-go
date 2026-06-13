import { useDiscovery } from "../discovery/DiscoveryContext";
import { formatDateTime } from "../lib/format";
import type { MapPoi, MapPoiKind } from "../types";

// Paddler-priority order. Each group renders its facts, or an honest gap that
// (once contributions are re-exposed) becomes an invitation to add one.
const POI_GROUPS: Array<{ kind: MapPoiKind; title: string; empty: string }> = [
  { kind: "access", title: "Access", empty: "No put-ins or take-outs logged here yet." },
  { kind: "hazard", title: "Hazards", empty: "No hazards logged here yet." },
  { kind: "feature", title: "Features", empty: "No features logged here yet." },
  { kind: "gauge", title: "Gauges", empty: "No gauges linked here yet." },
];

// Trust shown as dated, sourced human freshness — never a bare "confidence: low".
function poiFreshness(poi: MapPoi): string {
  const confirmed =
    poi.confirmations > 0
      ? `confirmed by ${poi.confirmations} paddler${poi.confirmations === 1 ? "" : "s"}`
      : "not yet paddler-confirmed";
  return poi.updatedAt ? `${confirmed} · ${formatDateTime(poi.updatedAt)}` : confirmed;
}

function riverFreshness(curationStatus: string): string {
  if (curationStatus === "candidate") {
    return "Community-curated pilot record — not yet paddler-confirmed";
  }
  return "Community-curated record";
}

/**
 * Fact-first river card. Presents what is known about a river — never a go/no-go
 * verdict. See /docs/specs/principles/no-advice-and-liability-language.md.
 */
export function RiverCard() {
  const { selectedRiver: river, riverPois, isRiverLoading } = useDiscovery();

  if (!river) {
    return null;
  }

  const place = [river.region, river.country].filter(Boolean).join(" · ");

  return (
    <section className="river-card" aria-label={`${river.displayName} overview`}>
      <header className="river-card__header">
        {place ? <p className="river-card__eyebrow">{place}</p> : null}
        <h2>{river.displayName}</h2>
        <p className="river-card__confidence">{riverFreshness(river.curationStatus)}</p>
      </header>

      <p className="river-card__note">
        Community-sourced and official information. Conditions change quickly —
        check locally and paddle within your own judgement.
      </p>

      {river.summary ? (
        <p className="river-card__summary">{river.summary}</p>
      ) : null}

      <div className="river-card__block">
        <h3>Today</h3>
        <p className="river-card__gap">No live gauge linked to this river yet.</p>
      </div>

      <div className="river-card__block">
        <h3>Paddling sections</h3>
        {river.sectionLinks.length > 0 ? (
          <p>
            {river.sectionLinks.length} section
            {river.sectionLinks.length === 1 ? "" : "s"} linked to this river.
          </p>
        ) : (
          <p className="river-card__gap">No paddling sections linked yet.</p>
        )}
      </div>

      {POI_GROUPS.map(({ kind, title, empty }) => {
        const items = riverPois.filter((poi) => poi.kind === kind);
        return (
          <div className="river-card__block" key={kind}>
            <h3>{title}</h3>
            {items.length > 0 ? (
              <ul className="river-card__list">
                {items.map((poi) => (
                  <li className="river-card__poi" key={poi.id}>
                    <strong>{poi.title}</strong>
                    {poi.subtitle ? <span>{poi.subtitle}</span> : null}
                    <small>{poiFreshness(poi)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="river-card__gap">{empty}</p>
            )}
          </div>
        );
      })}

      <footer className="river-card__sourcing">
        Source confidence: {river.sourceConfidence}. Updated{" "}
        {formatDateTime(river.updatedAt)}.
      </footer>

      {isRiverLoading ? (
        <p className="river-card__loading" role="status">
          Updating…
        </p>
      ) : null}
    </section>
  );
}
