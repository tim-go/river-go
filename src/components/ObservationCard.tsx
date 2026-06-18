import type { SectionObservationMeasure } from "../services/observationApi";
import {
  getObservationRangeOption,
  observationParameterLabels,
  type ObservationRangeHours,
} from "../appCore";
import {
  buildObservationChartPoints,
  formatDateTime,
  formatObservationRange,
  formatObservationValue,
  formatShortDateTime,
  getObservationStats,
} from "../lib/format";

interface ObservationCardProps {
  measure: SectionObservationMeasure;
  rangeHours: ObservationRangeHours;
}

// Gauge reading + history chart for one observation measure. Extracted from the
// section observation view so the river-first detail card can re-surface the
// historical level chart (RIVERDISC-F7).
export function ObservationCard({ measure, rangeHours }: ObservationCardProps) {
  const rangeOption = getObservationRangeOption(rangeHours);
  const chartPoints = buildObservationChartPoints(measure);
  const latestChartPoint = chartPoints.split(" ").at(-1)?.split(",");
  const stats = getObservationStats(measure);
  const midValue =
    stats.min != null && stats.max != null ? (stats.min + stats.max) / 2 : null;

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
      {chartPoints ? (
        <div
          className="observation-chart"
          role="img"
          aria-label={`${rangeOption.chartLabel} ${observationParameterLabels[
            measure.parameter
          ].toLowerCase()} trend from ${formatObservationValue(
            stats.min,
            measure.unit,
          )} to ${formatObservationValue(stats.max, measure.unit)}`}
        >
          <div className="observation-chart__axis" aria-hidden="true">
            <span>{formatObservationValue(stats.max, measure.unit)}</span>
            <span>{formatObservationValue(midValue, measure.unit)}</span>
            <span>{formatObservationValue(stats.min, measure.unit)}</span>
          </div>
          <svg viewBox="0 0 240 72" aria-hidden="true" preserveAspectRatio="none">
            <line
              className="observation-chart__grid observation-chart__grid--major"
              x1="0"
              x2="240"
              y1="8"
              y2="8"
            />
            <line
              className="observation-chart__grid"
              x1="0"
              x2="240"
              y1="36"
              y2="36"
            />
            <line
              className="observation-chart__grid observation-chart__grid--major"
              x1="0"
              x2="240"
              y1="64"
              y2="64"
            />
            <polyline
              className="observation-chart__line"
              points={chartPoints}
            />
            <circle
              className="observation-chart__point"
              cx={latestChartPoint?.[0]}
              cy={latestChartPoint?.[1]}
              r="3"
            />
          </svg>
          <div className="observation-chart__xaxis" aria-hidden="true">
            <span>{formatShortDateTime(measure.history[0]?.observedAt)}</span>
            <span>{formatShortDateTime(measure.history.at(-1)?.observedAt)}</span>
          </div>
        </div>
      ) : null}
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
