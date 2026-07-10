import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SectionObservationMeasure } from "../services/observationApi";
import { formatObservationValue, sampleObservationHistory } from "../lib/format";

// The gauge history chart — the app's flagship visual. Hand-rolled SVG so it
// stays dependency-free and theme-aware:
//   - level zones tinted + labelled in the app's band colours (Low / Normal /
//     High / Very high), derived from the gauge's own 2-year distribution
//   - round-number gridlines with a slim value gutter; real date ticks
//   - gradient area fill (short ranges) or a min–max envelope (daily buckets)
//   - pointer crosshair with a value/date tooltip (mouse + touch)
// Text lives in an unstretched SVG: the component measures its container and
// renders at native pixel width instead of scaling a fixed viewBox.

interface ObservationChartProps {
  measure: SectionObservationMeasure;
  rangeHours: number;
  ariaLabel: string;
}

const HEIGHT = 232;
const TOP = 12;
const BOTTOM = 26;
const GUTTER = 46;
const RIGHT = 10;
const MAX_POINTS = 220;

const ZONE_FILL: Record<string, string> = {
  low: "#3b82f6",
  normal: "#14b8a6",
  high: "#ffd60a",
  "very-high": "#f97316",
};
const ZONE_TEXT: Record<string, string> = {
  low: "#1d4ed8",
  normal: "#0f766e",
  high: "#8a6200",
  "very-high": "#b45309",
};
const ZONE_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  "very-high": "Very high",
};

function niceStep(range: number, target: number): number {
  const raw = range / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const multiplier = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return multiplier * magnitude;
}

function formatTickValue(value: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return value.toFixed(Math.min(decimals, 3));
}

function formatTickDate(iso: string, rangeHours: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (rangeHours <= 48) {
    const day = date.toLocaleDateString(undefined, { weekday: "short" });
    const time = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${day} ${time}`;
  }
  if (rangeHours <= 2160) {
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const year = date.toLocaleDateString(undefined, { year: "2-digit" });
  return `${month} '${year}`;
}

function formatTooltipDate(iso: string, daily: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (daily) {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ObservationChart({
  measure,
  rangeHours,
  ariaLabel,
}: ObservationChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const measured = Math.round(entries[0]?.contentRect.width ?? 0);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const readings = useMemo(
    () =>
      measure.history.length > MAX_POINTS
        ? sampleObservationHistory(measure.history, MAX_POINTS)
        : measure.history,
    [measure],
  );

  const geometry = useMemo(() => {
    if (readings.length < 2) return null;
    const lo = Math.min(...readings.map((r) => r.valueMin ?? r.value));
    const hi = Math.max(...readings.map((r) => r.valueMax ?? r.value));
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.07;
    const yLo = lo - pad;
    const yHi = hi + pad;
    const t0 = new Date(readings[0].observedAt).getTime();
    const t1 = new Date(readings[readings.length - 1].observedAt).getTime();
    const plotW = Math.max(40, width - GUTTER - RIGHT);
    const plotH = HEIGHT - TOP - BOTTOM;
    const x = (t: number) =>
      GUTTER + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
    const y = (v: number) => TOP + (1 - (v - yLo) / (yHi - yLo)) * plotH;

    const points = readings.map((reading) => ({
      reading,
      x: x(new Date(reading.observedAt).getTime()),
      y: y(reading.value),
    }));

    // Round-number horizontal gridlines.
    const step = niceStep(yHi - yLo, 4);
    const ticks: Array<{ value: number; y: number }> = [];
    for (let v = Math.ceil(yLo / step) * step; v <= yHi + 1e-9; v += step) {
      const value = Number(v.toFixed(6));
      ticks.push({ value, y: y(value) });
    }

    // Level zones from the gauge's 2-year distribution, clipped to the plot.
    const zones: Array<{ key: string; yTop: number; yBottom: number }> = [];
    const bands = measure.levelBands;
    if (bands) {
      const edges: Array<{ key: string; from: number; to: number }> = [
        { key: "low", from: yLo, to: bands.p25 },
        { key: "normal", from: bands.p25, to: bands.p75 },
        { key: "high", from: bands.p75, to: bands.p90 },
        { key: "very-high", from: bands.p90, to: yHi },
      ];
      for (const edge of edges) {
        const from = Math.max(yLo, Math.min(yHi, edge.from));
        const to = Math.max(yLo, Math.min(yHi, edge.to));
        if (to - from <= 0) continue;
        zones.push({ key: edge.key, yTop: y(to), yBottom: y(from) });
      }
    }

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const hasEnvelope = readings.some(
      (r) => r.valueMin != null && r.valueMax != null,
    );
    const envelopePath = hasEnvelope
      ? [
          ...points.map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${y(p.reading.valueMax ?? p.reading.value).toFixed(1)}`,
          ),
          ...[...points]
            .reverse()
            .map(
              (p) =>
                `L${p.x.toFixed(1)},${y(p.reading.valueMin ?? p.reading.value).toFixed(1)}`,
            ),
          "Z",
        ].join(" ")
      : null;
    const areaPath = !hasEnvelope
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${(HEIGHT - BOTTOM).toFixed(1)} L${points[0].x.toFixed(1)},${(HEIGHT - BOTTOM).toFixed(1)} Z`
      : null;

    // 4 date ticks across the domain.
    const dateTicks = [0, 1 / 3, 2 / 3, 1].map((fraction) => {
      const index = Math.round(fraction * (readings.length - 1));
      return {
        x: points[index].x,
        label: formatTickDate(readings[index].observedAt, rangeHours),
        anchor: (fraction === 0
          ? "start"
          : fraction === 1
            ? "end"
            : "middle") as "start" | "end" | "middle",
      };
    });

    return {
      points,
      ticks,
      step,
      zones,
      linePath,
      envelopePath,
      areaPath,
      dateTicks,
      hasEnvelope,
      plotBottom: HEIGHT - BOTTOM,
    };
  }, [readings, width, measure.levelBands, rangeHours]);

  if (!geometry) return null;

  const hovered = hoverIndex === null ? null : geometry.points[hoverIndex];
  const latest = geometry.points[geometry.points.length - 1];
  const gradientId = `obs-area-${measure.id}`;

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    let nearest = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < geometry.points.length; i += 1) {
      const distance = Math.abs(geometry.points[i].x - px);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  };

  const tooltipLeft = hovered
    ? Math.min(Math.max(hovered.x, 70), width - 70)
    : 0;

  return (
    <div className="observation-chart2" ref={wrapperRef} role="img" aria-label={ariaLabel}>
      <svg
        width={width}
        height={HEIGHT}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--river)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--river)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {geometry.zones.map((zone) => (
          <g key={zone.key}>
            <rect
              className="observation-chart2__zone"
              x={GUTTER}
              width={Math.max(0, width - GUTTER - RIGHT)}
              y={zone.yTop}
              height={zone.yBottom - zone.yTop}
              fill={ZONE_FILL[zone.key]}
            />
            {zone.yBottom - zone.yTop >= 18 ? (
              <text
                className="observation-chart2__zone-label"
                x={width - RIGHT - 6}
                y={zone.yTop + 13}
                textAnchor="end"
                fill={ZONE_TEXT[zone.key]}
              >
                {ZONE_LABELS[zone.key]}
              </text>
            ) : null}
          </g>
        ))}

        {/* gridlines + value labels */}
        {geometry.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              className="observation-chart2__grid"
              x1={GUTTER}
              x2={width - RIGHT}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className="observation-chart2__tick"
              x={GUTTER - 7}
              y={tick.y + 3.5}
              textAnchor="end"
            >
              {formatTickValue(tick.value, geometry.step)}
            </text>
          </g>
        ))}

        {geometry.areaPath ? (
          <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        ) : null}
        {geometry.envelopePath ? (
          <path
            className="observation-chart2__envelope"
            d={geometry.envelopePath}
          />
        ) : null}
        <path className="observation-chart2__line" d={geometry.linePath} />

        {/* date ticks */}
        {geometry.dateTicks.map((tick, index) => (
          <text
            key={index}
            className="observation-chart2__date"
            x={tick.x}
            y={HEIGHT - 8}
            textAnchor={tick.anchor}
          >
            {tick.label}
          </text>
        ))}

        {/* crosshair */}
        {hovered ? (
          <g>
            <line
              className="observation-chart2__crosshair"
              x1={hovered.x}
              x2={hovered.x}
              y1={TOP}
              y2={geometry.plotBottom}
            />
            <circle
              className="observation-chart2__hover-dot"
              cx={hovered.x}
              cy={hovered.y}
              r="4.5"
            />
          </g>
        ) : (
          <g>
            <circle
              className="observation-chart2__latest-halo"
              cx={latest.x}
              cy={latest.y}
              r="9"
            />
            <circle
              className="observation-chart2__latest"
              cx={latest.x}
              cy={latest.y}
              r="4"
            />
          </g>
        )}
      </svg>

      {hovered ? (
        <div
          className="observation-chart2__tooltip"
          style={{ left: tooltipLeft, top: Math.max(0, hovered.y - 54) }}
        >
          <strong>
            {formatObservationValue(hovered.reading.value, measure.unit)}
          </strong>
          {hovered.reading.valueMin != null &&
          hovered.reading.valueMax != null ? (
            <span>
              {formatObservationValue(hovered.reading.valueMin, measure.unit)}–
              {formatObservationValue(hovered.reading.valueMax, measure.unit)}
            </span>
          ) : null}
          <span>
            {formatTooltipDate(
              hovered.reading.observedAt,
              geometry.hasEnvelope,
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}

