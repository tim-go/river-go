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

// The map legend: river-line + gauge level state (vs each gauge's own history,
// never a runnable verdict). Shown as the toggled popout. Markers are left
// unlabelled — they read clearly enough on the map on their own.
export function MapLevelLegend() {
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
    </div>
  );
}
