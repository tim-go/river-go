import { getApiBaseUrl } from "./apiConfig";

export type ObservationParameter =
  | "river_level"
  | "river_flow"
  | "rainfall"
  | "tidal_level"
  | "sea_level"
  | "release"
  | "forecast";

export interface SectionObservationMeasure {
  id: string;
  provider: string;
  providerMeasureId: string;
  providerStationId: string;
  stationName: string;
  parameter: ObservationParameter;
  unit: string;
  relevance: string;
  confidence: string;
  sourceUrl: string | null;
  latest: {
    observedAt: string;
    value: number;
    quality: string | null;
    fetchedAt: string;
    state: "live" | "stale" | "unavailable" | "error";
  } | null;
  history: Array<{
    observedAt: string;
    value: number;
    quality: string | null;
  }>;
}

export async function fetchSectionObservations(
  sectionId: string,
  hours = 48,
): Promise<SectionObservationMeasure[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/sections/${encodeURIComponent(
      sectionId,
    )}/observations?hours=${encodeURIComponent(String(hours))}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Observation API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { measures?: unknown[] };
  return (result.measures ?? []).reduce<SectionObservationMeasure[]>(
    (measures, item) => {
      const measure = mapSectionObservationMeasure(item);

      if (measure) {
        measures.push(measure);
      }

      return measures;
    },
    [],
  );
}

function mapSectionObservationMeasure(
  value: unknown,
): SectionObservationMeasure | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: readString(value.id),
    provider: readString(value.provider),
    providerMeasureId: readString(value.providerMeasureId),
    providerStationId: readString(value.providerStationId),
    stationName: readString(value.stationName),
    parameter: readObservationParameter(value.parameter),
    unit: readString(value.unit),
    relevance: readString(value.relevance),
    confidence: readString(value.confidence),
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : null,
    latest: mapLatest(value.latest),
    history: Array.isArray(value.history)
      ? value.history.reduce<SectionObservationMeasure["history"]>(
          (history, item) => {
            if (!isRecord(item) || typeof item.value !== "number") {
              return history;
            }

            history.push({
              observedAt: readString(item.observedAt),
              value: item.value,
              quality: typeof item.quality === "string" ? item.quality : null,
            });

            return history;
          },
          [],
        )
      : [],
  };
}

function mapLatest(
  value: unknown,
): SectionObservationMeasure["latest"] {
  if (!isRecord(value) || typeof value.value !== "number") {
    return null;
  }

  return {
    observedAt: readString(value.observedAt),
    value: value.value,
    quality: typeof value.quality === "string" ? value.quality : null,
    fetchedAt: readString(value.fetchedAt),
    state: readLatestState(value.state),
  };
}

function readObservationParameter(value: unknown): ObservationParameter {
  if (
    value === "river_level" ||
    value === "river_flow" ||
    value === "rainfall" ||
    value === "tidal_level" ||
    value === "sea_level" ||
    value === "release" ||
    value === "forecast"
  ) {
    return value;
  }

  return "river_level";
}

function readLatestState(
  value: unknown,
): NonNullable<SectionObservationMeasure["latest"]>["state"] {
  if (
    value === "live" ||
    value === "stale" ||
    value === "unavailable" ||
    value === "error"
  ) {
    return value;
  }

  return "unavailable";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
