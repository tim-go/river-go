import {
  LEVEL_BAND_LABELS,
  levelBandColor,
  type SectionLevelBand,
} from "../../services/levelStateApi";
import "./map-level-legend.css";

const ORDER: SectionLevelBand[] = [
  "low",
  "normal",
  "high",
  "very-high",
  "unknown",
];

// The single map legend: river-line level state (vs each gauge's own history,
// never a runnable verdict) plus the marker key. Shown as the toggled popout.
export function MapLevelLegend({
  showKnownRivers,
  knownWatercourseStatus,
}: {
  showKnownRivers: boolean;
  knownWatercourseStatus?: string;
}) {
  return (
    <div className="map-level-legend">
      <span className="map-level-legend__title">River &amp; gauge level</span>
      <span className="map-level-legend__note">
        river lines &amp; gauge dots, vs each gauge's normal
      </span>
      <div className="map-level-legend__items">
        {ORDER.map((band) => (
          <span className="map-level-legend__item" key={band}>
            <span
              className="map-level-legend__swatch"
              style={{ background: levelBandColor(band) }}
            />
            {LEVEL_BAND_LABELS[band]}
          </span>
        ))}
      </div>

      <span className="map-level-legend__title map-level-legend__title--group">
        Map markers
      </span>
      <div className="map-level-legend__items">
        {showKnownRivers ? (
          <span
            className="map-level-legend__item"
            title={knownWatercourseStatus || undefined}
          >
            <i className="legend-line legend-line--known-river" /> Waterways
            {knownWatercourseStatus ? (
              <small className="map-level-legend__status">
                {knownWatercourseStatus}
              </small>
            ) : null}
          </span>
        ) : null}
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--section" /> Section
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--access" /> Access
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--hazard" /> Hazard
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--rapid" /> Rapid
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--whitewater" /> Whitewater
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--structure" /> Structure
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--feature" /> Feature
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--navigation" /> Navigation
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--utility" /> Utility
        </span>
        <span className="map-level-legend__item">
          <i className="legend-dot legend-dot--amenity" /> Amenity
        </span>
      </div>
    </div>
  );
}
