import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

type ObservationParameter =
  | "river_level"
  | "river_flow"
  | "rainfall"
  | "tidal_level"
  | "sea_level"
  | "release"
  | "forecast";

type SectionMeasureRelevance =
  | "primary"
  | "secondary"
  | "upstream"
  | "downstream"
  | "rainfall_context"
  | "tidal_context"
  | "release_context";

type SectionMeasureConfidence =
  | "nearby-candidate"
  | "section-candidate"
  | "community-confirmed"
  | "moderator-verified";

type ObservationProvider = "environment-agency" | "natural-resources-wales";

interface SeedObservationMeasure {
  provider: ObservationProvider;
  providerStationId: string;
  providerMeasureId: string;
  stationName: string;
  parameter: ObservationParameter;
  unit: string;
  samplingInterval: string;
  datum: string;
  sourceUrl: string;
  sectionLinks: Array<{
    sectionId: string;
    relevance: SectionMeasureRelevance;
    confidence: SectionMeasureConfidence;
    notes: string;
  }>;
}

interface ObservationMeasure {
  id: string;
  provider: string;
  providerMeasureId: string;
  parameter: ObservationParameter;
  unit: string;
  sourceUrl: string | null;
  enabled: boolean;
}

export interface SectionObservationMeasure {
  id: string;
  provider: string;
  providerMeasureId: string;
  providerStationId: string;
  stationName: string;
  parameter: ObservationParameter;
  unit: string;
  relevance: SectionMeasureRelevance;
  confidence: SectionMeasureConfidence;
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

interface EaReadingResponse {
  items?: Array<{
    dateTime?: string;
    value?: number;
    measure?: string;
    "@id"?: string;
  }>;
}

interface NrwGraphDataResponse {
  data?: Array<{
    x?: string;
    y?: number;
  }>;
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
  details: unknown;
}

interface ObservationProviderJobOptions {
  jobType: "observations.ingest" | "observations.backfill";
  provider: ObservationProvider | "all";
  windowHours: number;
}

const initialObservationMeasures: SeedObservationMeasure[] = [
  {
    provider: "natural-resources-wales",
    providerStationId: "4153",
    providerMeasureId: "4153:164",
    stationName: "Tryweryn at Bala Weir X",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl:
      "https://rivers-and-seas.naturalresources.wales/Station/4153?lang=en&parameterType=1",
    sectionLinks: [
      {
        sectionId: "tryweryn-dam-centre",
        relevance: "downstream",
        confidence: "nearby-candidate",
        notes:
          "NRW Bala Weir X is downstream of the upper Tryweryn section. Useful release/level context, but needs local validation before interpreting conditions near the dam or centre.",
      },
      {
        sectionId: "tryweryn-centre-bala",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "NRW Bala Weir X is a candidate primary level measure for the lower Tryweryn toward Bala. Runnable interpretation needs local validation.",
      },
    ],
  },
  {
    provider: "natural-resources-wales",
    providerStationId: "1018",
    providerMeasureId: "1018:10113",
    stationName: "Tryweryn Dam Pluvio and raingauge",
    parameter: "rainfall",
    unit: "mm",
    samplingInterval: "15_min",
    datum: "rainfall",
    sourceUrl:
      "https://rivers-and-seas.naturalresources.wales/Station/1018?lang=en&parameterType=2",
    sectionLinks: [
      {
        sectionId: "tryweryn-dam-centre",
        relevance: "rainfall_context",
        confidence: "nearby-candidate",
        notes:
          "NRW rainfall measure at Tryweryn Dam provides local catchment context only. Release-managed flow still needs release schedule and local interpretation.",
      },
      {
        sectionId: "tryweryn-centre-bala",
        relevance: "rainfall_context",
        confidence: "nearby-candidate",
        notes:
          "NRW rainfall measure at Tryweryn Dam provides upstream rainfall context for the lower Tryweryn.",
      },
    ],
  },
  {
    provider: "natural-resources-wales",
    providerStationId: "4014",
    providerMeasureId: "4014:197",
    stationName: "Wye at Glasbury",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl:
      "https://rivers-and-seas.naturalresources.wales/Station/4014?lang=en&parameterType=1",
    sectionLinks: [
      {
        sectionId: "wye-glasbury-hay",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "NRW Glasbury is a candidate primary level measure for Glasbury to Hay-on-Wye. Runnable ranges need local validation.",
      },
    ],
  },
  {
    provider: "natural-resources-wales",
    providerStationId: "4016",
    providerMeasureId: "4016:198",
    stationName: "Wye at Hay On Wye",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl:
      "https://rivers-and-seas.naturalresources.wales/Station/4016?lang=en&parameterType=1",
    sectionLinks: [
      {
        sectionId: "wye-glasbury-hay",
        relevance: "downstream",
        confidence: "section-candidate",
        notes:
          "NRW Hay-on-Wye is a downstream candidate for Glasbury to Hay-on-Wye.",
      },
      {
        sectionId: "wye-hay-whitney",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "NRW Hay-on-Wye is a candidate primary level measure for Hay-on-Wye to Whitney Bridge.",
      },
    ],
  },
  {
    provider: "natural-resources-wales",
    providerStationId: "4004",
    providerMeasureId: "4004:10036",
    stationName: "Wye at Bredwardine",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl:
      "https://rivers-and-seas.naturalresources.wales/Station/4004?lang=en&parameterType=1",
    sectionLinks: [
      {
        sectionId: "wye-whitney-bredwardine",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "NRW/EA Bredwardine is a candidate primary level measure for Whitney Bridge to Bredwardine.",
      },
    ],
  },
  {
    provider: "environment-agency",
    providerStationId: "055807_TG_320",
    providerMeasureId: "055807_TG_320-level-stage-i-15_min-mASD",
    stationName: "Old Wye Bridge",
    parameter: "river_level",
    unit: "mASD",
    samplingInterval: "15_min",
    datum: "mASD",
    sourceUrl:
      "https://environment.data.gov.uk/flood-monitoring/id/measures/055807_TG_320-level-stage-i-15_min-mASD",
    sectionLinks: [
      {
        sectionId: "wye-hoarwithy-ross",
        relevance: "upstream",
        confidence: "nearby-candidate",
        notes:
          "EA Old Wye Bridge is upstream of Hoarwithy to Ross-on-Wye. Use as context until a better section-specific link is validated.",
      },
    ],
  },
  {
    provider: "environment-agency",
    providerStationId: "055817_TG_323",
    providerMeasureId: "055817_TG_323-level-stage-i-15_min-mASD",
    stationName: "Ross On Wye",
    parameter: "river_level",
    unit: "mASD",
    samplingInterval: "15_min",
    datum: "mASD",
    sourceUrl:
      "https://environment.data.gov.uk/flood-monitoring/id/measures/055817_TG_323-level-stage-i-15_min-mASD",
    sectionLinks: [
      {
        sectionId: "wye-hoarwithy-ross",
        relevance: "downstream",
        confidence: "section-candidate",
        notes:
          "EA Ross-on-Wye is a downstream candidate for Hoarwithy to Ross-on-Wye.",
      },
      {
        sectionId: "wye-ross-kerne",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "EA Ross-on-Wye is a candidate primary level measure for Ross-on-Wye to Kerne Bridge.",
      },
      {
        sectionId: "wye-kerne-symonds-yat",
        relevance: "upstream",
        confidence: "section-candidate",
        notes:
          "EA Ross-on-Wye is an upstream candidate for Kerne Bridge to Symonds Yat.",
      },
    ],
  },
  {
    provider: "environment-agency",
    providerStationId: "2320",
    providerMeasureId: "2320-level-stage-i-15_min-mASD",
    stationName: "Lydbrook LVL",
    parameter: "river_level",
    unit: "mASD",
    samplingInterval: "15_min",
    datum: "mASD",
    sourceUrl:
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2320-level-stage-i-15_min-mASD",
    sectionLinks: [
      {
        sectionId: "wye-ross-kerne",
        relevance: "downstream",
        confidence: "section-candidate",
        notes:
          "EA Lydbrook is downstream of Ross-on-Wye to Kerne Bridge. Needs local validation before interpreting runnable ranges.",
      },
      {
        sectionId: "wye-kerne-symonds-yat",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "Lower Wye candidate EA level measure. Needs local validation before interpreting runnable ranges.",
      },
      {
        sectionId: "wye-symonds-yat-monmouth",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "Lower Wye candidate EA level measure. Needs local validation before interpreting runnable ranges.",
      },
    ],
  },
];

export async function runObservationIngestionJob(): Promise<ObservationJobRun> {
  return runObservationProviderJob({
    jobType: "observations.ingest",
    provider: "all",
    windowHours: 48,
  });
}

export async function runObservationBackfillJob(
  hours = 672,
): Promise<ObservationJobRun> {
  return runObservationProviderJob({
    jobType: "observations.backfill",
    provider: "all",
    windowHours: Math.max(1, Math.min(hours, 672)),
  });
}

async function runObservationProviderJob({
  jobType,
  provider,
  windowHours,
}: ObservationProviderJobOptions): Promise<ObservationJobRun> {
  const client = await pool.connect();
  const jobRun = await createObservationJobRun(client, provider, jobType);
  const details: Array<Record<string, unknown>> = [];
  let measuresAttempted = 0;
  let readingsFetched = 0;
  let readingsInserted = 0;
  let readingsUpdated = 0;
  let errorCount = 0;

  try {
    await ensureInitialObservationMeasures(client);
    const measures = await listEnabledObservationMeasures(client);

    for (const measure of measures) {
      if (provider !== "all" && measure.provider !== provider) {
        continue;
      }

      measuresAttempted += 1;

      try {
        const readings = await fetchObservationReadings(measure, windowHours);
        readingsFetched += readings.length;

        for (const reading of readings) {
          const inserted = await upsertObservationReading(client, measure.id, reading);

          if (inserted) {
            readingsInserted += 1;
          }
        }

        await updateLatestReading(client, measure.id);
        details.push({
          provider: measure.provider,
          measureId: measure.providerMeasureId,
          windowHours,
          readingsFetched: readings.length,
        });
      } catch (error) {
        errorCount += 1;
        details.push({
          provider: measure.provider,
          measureId: measure.providerMeasureId,
          windowHours,
          error: error instanceof Error ? error.message : "Unknown provider error",
        });
      }
    }

    const status =
      errorCount === 0 ? "success" : readingsInserted > 0 ? "partial" : "failed";
    const message = `${readingsFetched} readings fetched, ${readingsInserted} inserted.`;

    return await finishObservationJobRun(client, jobRun.id, {
      status,
      measuresAttempted,
      readingsFetched,
      readingsInserted,
      readingsUpdated,
      errorCount,
      message,
      details,
    });
  } catch (error) {
    return await finishObservationJobRun(client, jobRun.id, {
      status: "failed",
      measuresAttempted,
      readingsFetched,
      readingsInserted,
      readingsUpdated,
      errorCount: errorCount + 1,
      message:
        error instanceof Error ? error.message : "Observation provider job failed.",
      details,
    });
  } finally {
    client.release();
  }
}

export async function listObservationJobRuns(
  limit = 20,
): Promise<ObservationJobRun[]> {
  const result = await pool.query(
    `SELECT id,
      job_type,
      provider,
      status,
      started_at,
      finished_at,
      measures_attempted,
      readings_fetched,
      readings_inserted,
      readings_updated,
      error_count,
      message,
      details
    FROM observation_job_runs
    ORDER BY started_at DESC
    LIMIT $1`,
    [limit],
  );

  return result.rows.map(observationJobRunRow);
}

export async function getRecentObservationIngestionJobRun(
  cooldownMinutes = 15,
): Promise<ObservationJobRun | null> {
  const result = await pool.query(
    `SELECT id,
      job_type,
      provider,
      status,
      started_at,
      finished_at,
      measures_attempted,
      readings_fetched,
      readings_inserted,
      readings_updated,
      error_count,
      message,
      details
    FROM observation_job_runs
    WHERE job_type = 'observations.ingest'
      AND started_at > now() - ($1::int * interval '1 minute')
    ORDER BY started_at DESC
    LIMIT 1`,
    [Math.max(1, Math.min(cooldownMinutes, 60))],
  );

  return result.rows[0] ? observationJobRunRow(result.rows[0]) : null;
}

export async function listObservationsForSection(
  sectionId: string,
  hours = 48,
): Promise<SectionObservationMeasure[]> {
  const boundedHours = Math.max(1, Math.min(hours, 672));
  const result = await pool.query(
    `SELECT m.id,
      m.provider,
      m.provider_measure_id,
      m.parameter,
      m.unit,
      m.source_url,
      s.provider_station_id,
      s.name AS station_name,
      l.relevance,
      l.confidence,
      latest.observed_at AS latest_observed_at,
      latest.value AS latest_value,
      latest.quality AS latest_quality,
      latest.fetched_at AS latest_fetched_at,
      latest.state AS latest_state,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'observedAt', r.observed_at,
            'value', r.value,
            'quality', r.quality
          )
          ORDER BY r.observed_at
        ) FILTER (WHERE r.observed_at IS NOT NULL),
        '[]'::jsonb
      ) AS history
    FROM section_measure_links l
    JOIN observation_measures m ON m.id = l.measure_id
    JOIN observation_stations s ON s.id = m.station_id
    LEFT JOIN observation_latest_readings latest ON latest.measure_id = m.id
    LEFT JOIN observation_readings r
      ON r.measure_id = m.id
      AND r.observed_at >= now() - ($2::int * interval '1 hour')
    WHERE l.section_id = $1
    GROUP BY m.id,
      m.provider,
      m.provider_measure_id,
      m.parameter,
      m.unit,
      m.source_url,
      s.provider_station_id,
      s.name,
      l.relevance,
      l.confidence,
      latest.observed_at,
      latest.value,
      latest.quality,
      latest.fetched_at,
      latest.state
    ORDER BY
      CASE l.relevance
        WHEN 'primary' THEN 1
        WHEN 'secondary' THEN 2
        WHEN 'upstream' THEN 3
        ELSE 4
      END,
      m.parameter,
      s.name`,
    [sectionId, boundedHours],
  );

  return result.rows.map(sectionObservationMeasureRow);
}

async function ensureInitialObservationMeasures(client: PoolClient) {
  for (const seed of initialObservationMeasures) {
    const stationResult = await client.query<{ id: string }>(
      `INSERT INTO observation_stations (
        provider,
        provider_station_id,
        name,
        source_url,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider, provider_station_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        source_url = EXCLUDED.source_url,
        metadata = observation_stations.metadata || EXCLUDED.metadata,
        updated_at = now()
      RETURNING id`,
      [
        seed.provider,
        seed.providerStationId,
        seed.stationName,
        seed.sourceUrl,
        {
          seededBy: "RiverLaunch.app observation ingestion",
        },
      ],
    );
    const stationId = stationResult.rows[0].id;
    const measureResult = await client.query<{ id: string }>(
      `INSERT INTO observation_measures (
        station_id,
        provider,
        provider_measure_id,
        parameter,
        unit,
        sampling_interval,
        datum,
        source_url,
        enabled,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
      ON CONFLICT (provider, provider_measure_id)
      DO UPDATE SET
        station_id = EXCLUDED.station_id,
        parameter = EXCLUDED.parameter,
        unit = EXCLUDED.unit,
        sampling_interval = EXCLUDED.sampling_interval,
        datum = EXCLUDED.datum,
        source_url = EXCLUDED.source_url,
        metadata = observation_measures.metadata || EXCLUDED.metadata,
        updated_at = now()
      RETURNING id`,
      [
        stationId,
        seed.provider,
        seed.providerMeasureId,
        seed.parameter,
        seed.unit,
        seed.samplingInterval,
        seed.datum,
        seed.sourceUrl,
        {
          seededBy: "RiverLaunch.app observation ingestion",
        },
      ],
    );
    const measureId = measureResult.rows[0].id;

    for (const link of seed.sectionLinks) {
      await client.query(
        `DELETE FROM section_measure_links
        WHERE section_id = $1
          AND measure_id = $2
          AND relevance <> $3`,
        [link.sectionId, measureId, link.relevance],
      );

      await client.query(
        `INSERT INTO section_measure_links (
          section_id,
          measure_id,
          relevance,
          confidence,
          notes
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (section_id, measure_id, relevance)
        DO UPDATE SET
          confidence = EXCLUDED.confidence,
          notes = EXCLUDED.notes,
          updated_at = now()`,
        [
          link.sectionId,
          measureId,
          link.relevance,
          link.confidence,
          link.notes,
        ],
      );
    }
  }
}

async function listEnabledObservationMeasures(
  client: PoolClient,
): Promise<ObservationMeasure[]> {
  const result = await client.query(
    `SELECT id,
      provider,
      provider_measure_id,
      parameter,
      unit,
      source_url,
      enabled
    FROM observation_measures
    WHERE enabled = true
    ORDER BY provider, provider_measure_id`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    providerMeasureId: row.provider_measure_id,
    parameter: row.parameter,
    unit: row.unit,
    sourceUrl: row.source_url,
    enabled: row.enabled,
  }));
}

async function fetchObservationReadings(
  measure: ObservationMeasure,
  windowHours: number,
) {
  if (measure.provider === "environment-agency") {
    return fetchEnvironmentAgencyReadings(measure, windowHours);
  }

  if (measure.provider === "natural-resources-wales") {
    return fetchNaturalResourcesWalesReadings(measure, windowHours);
  }

  throw new Error(`Unsupported observation provider: ${measure.provider}`);
}

async function fetchEnvironmentAgencyReadings(
  measure: ObservationMeasure,
  windowHours: number,
) {
  if (!measure.sourceUrl) {
    throw new HttpError(400, `Measure ${measure.id} has no source URL.`);
  }

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const url = `${measure.sourceUrl}/readings?since=${encodeURIComponent(since)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Environment Agency returned HTTP ${response.status} for ${measure.providerMeasureId}.`,
    );
  }

  const data = (await response.json()) as EaReadingResponse;
  return (data.items ?? [])
    .filter(
      (item): item is Required<Pick<typeof item, "dateTime" | "value">> &
        typeof item =>
        typeof item.dateTime === "string" && typeof item.value === "number",
    )
    .map((item) => ({
      observedAt: item.dateTime,
      value: item.value,
      raw: item,
    }));
}

async function fetchNaturalResourcesWalesReadings(
  measure: ObservationMeasure,
  windowHours: number,
) {
  const parameterId = readNaturalResourcesWalesParameterId(measure);
  const to = new Date();
  const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);
  const query = new URLSearchParams({
    parameterId,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const url = `https://rivers-and-seas.naturalresources.wales/graph/getdata?${query.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Natural Resources Wales returned HTTP ${response.status} for ${measure.providerMeasureId}.`,
    );
  }

  const data = (await response.json()) as NrwGraphDataResponse;

  return (data.data ?? [])
    .filter(
      (item): item is Required<Pick<typeof item, "x" | "y">> & typeof item =>
        typeof item.x === "string" && typeof item.y === "number",
    )
    .map((item) => ({
      observedAt: item.x,
      value: item.y,
      raw: item,
    }));
}

function readNaturalResourcesWalesParameterId(measure: ObservationMeasure) {
  const parameterId = measure.providerMeasureId.split(":").at(1);

  if (!parameterId) {
    throw new Error(
      `Natural Resources Wales measure ${measure.providerMeasureId} must be stationId:parameterId.`,
    );
  }

  return parameterId;
}

async function upsertObservationReading(
  client: PoolClient,
  measureId: string,
  reading: { observedAt: string; value: number; raw: Record<string, unknown> },
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO observation_readings (
      measure_id,
      observed_at,
      value,
      raw
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (measure_id, observed_at) DO NOTHING`,
    [measureId, reading.observedAt, reading.value, reading.raw],
  );

  return Boolean(result.rowCount);
}

async function updateLatestReading(client: PoolClient, measureId: string) {
  await client.query(
    `INSERT INTO observation_latest_readings (
      measure_id,
      observed_at,
      value,
      fetched_at,
      state,
      raw
    )
    SELECT measure_id,
      observed_at,
      value,
      fetched_at,
      CASE
        WHEN observed_at < now() - interval '6 hours' THEN 'stale'
        ELSE 'live'
      END,
      raw
    FROM observation_readings
    WHERE measure_id = $1
    ORDER BY observed_at DESC
    LIMIT 1
    ON CONFLICT (measure_id)
    DO UPDATE SET
      observed_at = EXCLUDED.observed_at,
      value = EXCLUDED.value,
      fetched_at = EXCLUDED.fetched_at,
      state = EXCLUDED.state,
      raw = EXCLUDED.raw`,
    [measureId],
  );
}

async function createObservationJobRun(
  client: PoolClient,
  provider: string,
  jobType: ObservationProviderJobOptions["jobType"],
): Promise<ObservationJobRun> {
  const result = await client.query(
    `INSERT INTO observation_job_runs (job_type, provider)
    VALUES ($1, $2)
    RETURNING id,
      job_type,
      provider,
      status,
      started_at,
      finished_at,
      measures_attempted,
      readings_fetched,
      readings_inserted,
      readings_updated,
      error_count,
      message,
      details`,
    [jobType, provider],
  );

  return observationJobRunRow(result.rows[0]);
}

async function finishObservationJobRun(
  client: PoolClient,
  jobRunId: string,
  values: {
    status: ObservationJobRun["status"];
    measuresAttempted: number;
    readingsFetched: number;
    readingsInserted: number;
    readingsUpdated: number;
    errorCount: number;
    message: string;
    details: Array<Record<string, unknown>>;
  },
): Promise<ObservationJobRun> {
  const result = await client.query(
    `UPDATE observation_job_runs
    SET status = $2,
      finished_at = now(),
      measures_attempted = $3,
      readings_fetched = $4,
      readings_inserted = $5,
      readings_updated = $6,
      error_count = $7,
      message = $8,
      details = $9::jsonb
    WHERE id = $1
    RETURNING id,
      job_type,
      provider,
      status,
      started_at,
      finished_at,
      measures_attempted,
      readings_fetched,
      readings_inserted,
      readings_updated,
      error_count,
      message,
      details`,
    [
      jobRunId,
      values.status,
      values.measuresAttempted,
      values.readingsFetched,
      values.readingsInserted,
      values.readingsUpdated,
      values.errorCount,
      values.message,
      JSON.stringify(values.details),
    ],
  );

  return observationJobRunRow(result.rows[0]);
}

function observationJobRunRow(row: Record<string, unknown>): ObservationJobRun {
  return {
    id: readString(row.id),
    jobType: readString(row.job_type),
    provider: readString(row.provider),
    status: readStatus(row.status),
    startedAt: readDate(row.started_at),
    finishedAt: row.finished_at ? readDate(row.finished_at) : null,
    measuresAttempted: readNumber(row.measures_attempted),
    readingsFetched: readNumber(row.readings_fetched),
    readingsInserted: readNumber(row.readings_inserted),
    readingsUpdated: readNumber(row.readings_updated),
    errorCount: readNumber(row.error_count),
    message: typeof row.message === "string" ? row.message : null,
    details: row.details ?? {},
  };
}

function sectionObservationMeasureRow(
  row: Record<string, unknown>,
): SectionObservationMeasure {
  return {
    id: readString(row.id),
    provider: readString(row.provider),
    providerMeasureId: readString(row.provider_measure_id),
    providerStationId: readString(row.provider_station_id),
    stationName: readString(row.station_name),
    parameter: readObservationParameter(row.parameter),
    unit: readString(row.unit),
    relevance: readSectionMeasureRelevance(row.relevance),
    confidence: readSectionMeasureConfidence(row.confidence),
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    latest:
      row.latest_observed_at && typeof row.latest_value === "number"
        ? {
            observedAt: readDate(row.latest_observed_at),
            value: row.latest_value,
            quality:
              typeof row.latest_quality === "string" ? row.latest_quality : null,
            fetchedAt: readDate(row.latest_fetched_at),
            state: readLatestState(row.latest_state),
          }
        : null,
    history: parseHistory(row.history),
  };
}

function parseHistory(
  value: unknown,
): SectionObservationMeasure["history"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SectionObservationMeasure["history"]>((history, item) => {
    if (!isRecord(item) || typeof item.value !== "number" || !item.observedAt) {
      return history;
    }

    history.push({
      observedAt: readDate(item.observedAt),
      value: item.value,
      quality: typeof item.quality === "string" ? item.quality : null,
    });

    return history;
  }, []);
}

function readStatus(value: unknown): ObservationJobRun["status"] {
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

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function readSectionMeasureRelevance(value: unknown): SectionMeasureRelevance {
  if (
    value === "primary" ||
    value === "secondary" ||
    value === "upstream" ||
    value === "downstream" ||
    value === "rainfall_context" ||
    value === "tidal_context" ||
    value === "release_context"
  ) {
    return value;
  }

  return "primary";
}

function readSectionMeasureConfidence(value: unknown): SectionMeasureConfidence {
  if (
    value === "nearby-candidate" ||
    value === "section-candidate" ||
    value === "community-confirmed" ||
    value === "moderator-verified"
  ) {
    return value;
  }

  return "nearby-candidate";
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

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
