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

// Explains the river-line colours. Framed as level *state* (vs each gauge's own
// history), never a runnable verdict.
export function MapLevelLegend() {
  return (
    <div className="map-level-legend">
      <span className="map-level-legend__title">River level</span>
      <span className="map-level-legend__note">vs each gauge's normal</span>
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
