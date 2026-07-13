import type { SectionObservationMeasure } from "../services/observationApi";
import {
  getObservationRangeOption,
  observationParameterLabels,
  type ObservationRangeHours,
} from "../appCore";
import {
  formatDateTime,
  formatObservationRange,
  formatObservationValue,
  getObservationStats,
} from "../lib/format";
import { ObservationChart } from "./ObservationChart";

interface ObservationCardProps {
  measure: SectionObservationMeasure;
  rangeHours: ObservationRangeHours;
  chartHeight?: number;
}

// Gauge reading + history chart for one observation measure. Extracted from the
// section observation view so the river-first detail card can re-surface the
// historical level chart (RIVERDISC-F7).
export function ObservationCard({
  measure,
  rangeHours,
  chartHeight,
}: ObservationCardProps) {
  const rangeOption = getObservationRangeOption(rangeHours);
  const stats = getObservationStats(measure);

  return (
    <article className="observation-card">
      <div className="observation-card__header">
        <div>
          <strong>{measure.stationName}</strong>
          <span>
            {observationParameterLabels[measure.parameter]} ·{" "}
            {measure.relevance.replaceAll("_", " ")}
          </span>
        </div>
        <span
          className={`status-chip status-chip--${
            measure.latest?.state ?? "unavailable"
          }`}
        >
          {measure.latest?.state ?? "unavailable"}
        </span>
      </div>
      <div className="observation-hero">
        <span className="observation-hero__value">
          {formatObservationValue(measure.latest?.value, measure.unit)}
        </span>
        <span className={`observation-hero__trend trend-label--${stats.trend}`}>
          {stats.trend === "rising"
            ? "▲"
            : stats.trend === "falling"
              ? "▼"
              : "→"}{" "}
          {stats.trend}
        </span>
      </div>
      <p className="observation-hero__range">
        {rangeOption.rangeLabel}: {formatObservationRange(measure)}
      </p>
      <ObservationChart
        measure={measure}
        rangeHours={rangeHours}
        height={chartHeight}
        ariaLabel={`${rangeOption.chartLabel} ${observationParameterLabels[
          measure.parameter
        ].toLowerCase()} trend from ${formatObservationValue(
          stats.min,
          measure.unit,
        )} to ${formatObservationValue(stats.max, measure.unit)}`}
      />
      <div className="observation-meta">
        <span>Observed {formatDateTime(measure.latest?.observedAt ?? null)}</span>
        <span>{measure.confidence.replaceAll("-", " ")}</span>
      </div>
      {measure.sourceUrl ? (
        <a
          className="source-link"
          href={measure.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
      ) : null}
    </article>
  );
}
