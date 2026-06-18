import L from "leaflet";
import type { LatLngTuple } from "../types";
import type {
  ObservationParameter,
  SectionObservationMeasure,
} from "../services/observationApi";

export function routeEndpointBounds(route: LatLngTuple[]) {
  const start = route[0];
  const end = route[route.length - 1] ?? start;

  return L.latLngBounds([start, end]);
}

export function formatLocation(location: LatLngTuple) {
  return `${location[0].toFixed(4)}, ${location[1].toFixed(4)}`;
}

export function readCssColourToken(token: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return (
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(token)
      .trim() || fallback
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function formatObservationValue(
  value: number | null | undefined,
  unit: string,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "No reading";
  }

  return `${value.toFixed(2)} ${unit}`;
}

export function formatObservationRange(measure: SectionObservationMeasure) {
  if (!measure.history.length) {
    return "No stored history yet";
  }

  const values = measure.history.map((reading) => reading.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return `${min.toFixed(2)}-${max.toFixed(2)} ${measure.unit}`;
}

export function getObservationStats(measure: SectionObservationMeasure) {
  if (measure.history.length < 2) {
    return {
      min: measure.latest?.value ?? null,
      max: measure.latest?.value ?? null,
      delta: 0,
      trend: "steady" as const,
    };
  }

  const values = measure.history.map((reading) => reading.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = values[0];
  const latest = values[values.length - 1];
  const delta = latest - first;
  const trend =
    Math.abs(delta) < 0.01 ? "steady" : delta > 0 ? "rising" : "falling";

  return { min, max, delta, trend };
}

export function getPrimaryObservationMeasure(
  measures: SectionObservationMeasure[],
) {
  const parameterPriority: ObservationParameter[] = [
    "river_level",
    "river_flow",
    "release",
    "rainfall",
    "tidal_level",
    "sea_level",
    "forecast",
  ];

  return (
    measures.find(
      (measure) => measure.relevance === "primary" && measure.latest,
    ) ??
    parameterPriority
      .map((parameter) =>
        measures.find(
          (measure) => measure.parameter === parameter && measure.latest,
        ),
      )
      .find(Boolean) ??
    measures.find((measure) => measure.latest) ??
    measures[0] ??
    null
  );
}

export function formatShortDateTime(value: string | null | undefined) {
  if (!value) {
    return "not checked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function buildObservationChartPoints(measure: SectionObservationMeasure) {
  const maxPoints = 220;
  const readings =
    measure.history.length > maxPoints
      ? sampleObservationHistory(measure.history, maxPoints)
      : measure.history;

  if (readings.length < 2) {
    return "";
  }

  const values = readings.map((reading) => reading.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 240;
  const height = 72;
  const padding = 6;

  // Position each point by its actual timestamp, fitted to the available data
  // range — so the line reflects real time spacing and any gaps, and a short
  // span (e.g. only 48h of readings within a 7d window) isn't stretched to look
  // like a full one. Readings are ordered oldest→newest by the API.
  const startTime = new Date(readings[0].observedAt).getTime();
  const endTime = new Date(readings[readings.length - 1].observedAt).getTime();
  const timeSpan = endTime - startTime || 1;

  return readings
    .map((reading) => {
      const x =
        padding +
        ((new Date(reading.observedAt).getTime() - startTime) / timeSpan) *
          (width - padding * 2);
      const y =
        height -
        padding -
        ((reading.value - min) / range) * (height - padding * 2);

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function sampleObservationHistory(
  history: SectionObservationMeasure["history"],
  maxPoints: number,
) {
  if (history.length <= maxPoints) {
    return history;
  }

  const lastIndex = history.length - 1;
  const sampled: SectionObservationMeasure["history"] = [];
  const seen = new Set<string>();

  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * lastIndex);
    const reading = history[sourceIndex];

    if (!seen.has(reading.observedAt)) {
      sampled.push(reading);
      seen.add(reading.observedAt);
    }
  }

  return sampled;
}

export function parseCoordinateSearch(value: string): LatLngTuple | null {
  const match = value
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

export function looksLikeWhat3Words(value: string) {
  return /^\/{0,3}[\p{L}-]+(?:\.[\p{L}-]+){2}$/u.test(value.trim());
}

export function normaliseWhat3WordsSearch(value: string) {
  return value.trim().replace(/^\/{1,3}/, "").toLowerCase();
}

export function distanceKmBetween(from: LatLngTuple, to: LatLngTuple) {
  const earthRadiusKm = 6371;
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const deltaLat = ((to[0] - from[0]) * Math.PI) / 180;
  const deltaLng = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function routeDistanceKm(route: LatLngTuple[]) {
  return route.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }

    return total + distanceKmBetween(route[index - 1], point);
  }, 0);
}
