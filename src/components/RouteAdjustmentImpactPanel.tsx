import {
  formatDistanceMetres,
  formatSignedDistanceKm,
  routeImpactPoiLabel,
  ROUTE_IMPACT_CORRIDOR_METRES,
} from "../appCore";
import type { RouteAdjustmentImpact } from "../appCore";

export function RouteAdjustmentImpactPanel({
  impact,
}: {
  impact: RouteAdjustmentImpact;
}) {
  const impactedCount =
    impact.movedOutside.length + impact.newlyNear.length + impact.endpointWarnings.length;

  return (
    <div className="route-impact-panel">
      <div className="route-impact-panel__header">
        <strong>Impact review</strong>
        <span>{impactedCount ? `${impactedCount} checks flagged` : "No major flags"}</span>
      </div>
      <div className="route-impact-metrics" aria-label="Route edit impact metrics">
        <span>
          Current <strong>{impact.currentDistanceKm?.toFixed(1) ?? "?"} km</strong>
        </span>
        <span>
          Proposed <strong>{impact.proposedDistanceKm.toFixed(1)} km</strong>
        </span>
        <span>
          Change <strong>{formatSignedDistanceKm(impact.distanceDeltaKm)}</strong>
        </span>
        <span>
          Points <strong>{impact.pointsChecked}</strong>
        </span>
      </div>
      {impact.endpointWarnings.length ? (
        <ul className="route-impact-list route-impact-list--warning">
          {impact.endpointWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {impact.movedOutside.length ? (
        <div className="route-impact-group">
          <span>May no longer sit on this route</span>
          <ul className="route-impact-list">
            {impact.movedOutside.slice(0, 4).map((point) => (
              <li key={point.id}>
                {routeImpactPoiLabel(point.kind)}: {point.title}{" "}
                <small>
                  {formatDistanceMetres(point.beforeDistanceM)} to{" "}
                  {formatDistanceMetres(point.afterDistanceM)}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {impact.newlyNear.length ? (
        <div className="route-impact-group">
          <span>Newly near the proposed route</span>
          <ul className="route-impact-list">
            {impact.newlyNear.slice(0, 4).map((point) => (
              <li key={point.id}>
                {routeImpactPoiLabel(point.kind)}: {point.title}{" "}
                <small>{formatDistanceMetres(point.afterDistanceM)} away</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!impactedCount ? (
        <p>
          Known points remain inside the {ROUTE_IMPACT_CORRIDOR_METRES} m review
          corridor. This does not confirm access, safety, or suitability.
        </p>
      ) : null}
    </div>
  );
}

