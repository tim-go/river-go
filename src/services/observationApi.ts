import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

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
    /** Daily-bucket envelope; present only on downsampled (long-range) reads. */
    valueMin?: number | null;
    valueMax?: number | null;
    quality: string | null;
  }>;
  /** Gauge's 2-year distribution breakpoints (chart guide lines). */
  levelBands: { p25: number; p75: number; p90: number } | null;
}

export interface ObservationJobRun {
  id: string;
  jobType: string;
  provider: string;
  status: "running" | "success" | "partial" | "failed";
  startedAt: string;
  finishedAt: string | null;
  measuresAttempted: number;
  readingsFetched: number;
  readingsInserted: number;
  readingsUpdated: number;
  errorCount: number;
  message: string | null;
}

export async function fetchSectionObservations(
  sectionId: string,
  hours = 48,
): Promise<SectionObservationMeasure[]> {
  return fetchObservationMeasures(
    `/api/sections/${encodeURIComponent(sectionId)}/observations`,
    hours,
  );
}

// River-keyed gauge history (via river_measure_links) — the durable path for the
// river Levels tab after section_measure_links was retired.
export async function fetchRiverObservations(
  riverId: string,
  hours = 48,
): Promise<SectionObservationMeasure[]> {
  return fetchObservationMeasures(
    `/api/rivers/${encodeURIComponent(riverId)}/observations`,
    hours,
  );
}

async function fetchObservationMeasures(
  path: string,
  hours: number,
): Promise<SectionObservationMeasure[]> {
  const response = await fetch(
    `${getApiBaseUrl()}${path}?hours=${encodeURIComponent(String(hours))}`,
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

export async function fetchObservationJobRuns(): Promise<ObservationJobRun[]> {
  const result = await fetchObservationAdminEndpoint<{
    jobRuns?: unknown[];
  }>("/api/admin/observations/jobs?limit=10");

  return (result.jobRuns ?? []).reduce<ObservationJobRun[]>((jobRuns, item) => {
    const jobRun = mapObservationJobRun(item);

    if (jobRun) {
      jobRuns.push(jobRun);
    }

    return jobRuns;
  }, []);
}

export async function runObservationIngestion(): Promise<ObservationJobRun> {
  const result = await fetchObservationAdminEndpoint<{ jobRun?: unknown }>(
    "/api/jobs/observations/ingest",
    { method: "POST", body: JSON.stringify({}) },
  );
  const jobRun = mapObservationJobRun(result.jobRun);

  if (!jobRun) {
    throw new Error("Observation job response was not valid.");
  }

  return jobRun;
}

async function fetchObservationAdminEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before running observation jobs.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    method: options.method ?? "GET",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Observation API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
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
    levelBands:
      isRecord(value.levelBands) &&
      typeof value.levelBands.p25 === "number" &&
      typeof value.levelBands.p75 === "number" &&
      typeof value.levelBands.p90 === "number"
        ? {
            p25: value.levelBands.p25,
            p75: value.levelBands.p75,
            p90: value.levelBands.p90,
          }
        : null,
    history: Array.isArray(value.history)
      ? value.history.reduce<SectionObservationMeasure["history"]>(
          (history, item) => {
            if (!isRecord(item) || typeof item.value !== "number") {
              return history;
            }

            history.push({
              observedAt: readString(item.observedAt),
              value: item.value,
              valueMin:
                typeof item.valueMin === "number" ? item.valueMin : null,
              valueMax:
                typeof item.valueMax === "number" ? item.valueMax : null,
              quality: typeof item.quality === "string" ? item.quality : null,
            });

            return history;
          },
          [],
        )
      : [],
  };
}

function mapObservationJobRun(value: unknown): ObservationJobRun | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: readString(value.id),
    jobType: readString(value.jobType),
    provider: readString(value.provider),
    status: readJobStatus(value.status),
    startedAt: readString(value.startedAt),
    finishedAt: typeof value.finishedAt === "string" ? value.finishedAt : null,
    measuresAttempted: readNumber(value.measuresAttempted),
    readingsFetched: readNumber(value.readingsFetched),
    readingsInserted: readNumber(value.readingsInserted),
    readingsUpdated: readNumber(value.readingsUpdated),
    errorCount: readNumber(value.errorCount),
    message: typeof value.message === "string" ? value.message : null,
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

function readJobStatus(value: unknown): ObservationJobRun["status"] {
  if (
    value === "running" ||
    value === "success" ||
    value === "partial" ||
    value === "failed"
  ) {
    return value;
  }

  return "failed";
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
