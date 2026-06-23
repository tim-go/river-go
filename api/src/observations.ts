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

type ObservationProvider =
  | "environment-agency"
  | "natural-resources-wales"
  | "sepa";

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

interface SepaTimeseriesValuesResponse {
  columns?: string;
  data?: Array<Array<string | number | null>>;
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

function gaugeSourceUrl(
  provider: ObservationProvider,
  stationId: string,
  measureId: string,
): string {
  if (provider === "environment-agency") {
    return `https://environment.data.gov.uk/flood-monitoring/id/measures/${measureId}`;
  }
  if (provider === "natural-resources-wales") {
    return `https://rivers-and-seas.naturalresources.wales/Station/${stationId}?lang=en&parameterType=1`;
  }
  return `https://timeseries.sepa.org.uk/KiWIS/KiWIS?service=kisters&type=queryServices&datasource=0&request=getTimeseriesValues&ts_id=${measureId}&format=html`;
}

// Research-discovered, live-verified paddler gauges for the catalogue rivers.
// Attached as primary at nearby-candidate confidence (needs-confirmation). One
// station may serve several rivers (proxy gauges for ungauged neighbours).
function paddlingGauge(
  provider: ObservationProvider,
  providerStationId: string,
  providerMeasureId: string,
  stationName: string,
  sectionIds: string[],
): SeedObservationMeasure {
  return {
    provider,
    providerStationId,
    providerMeasureId,
    stationName,
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl: gaugeSourceUrl(provider, providerStationId, providerMeasureId),
    sectionLinks: sectionIds.map((sectionId) => ({
      sectionId,
      relevance: "primary" as const,
      confidence: "nearby-candidate" as const,
      notes:
        "Research-discovered paddler gauge; auto-attached and needs local confirmation.",
    })),
  };
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
  {
    provider: "environment-agency",
    providerStationId: "46122",
    providerMeasureId: "46122-level-stage-i-15_min-m",
    stationName: "River Dart at Austins Bridge",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "m",
    sourceUrl:
      "https://environment.data.gov.uk/flood-monitoring/id/measures/46122-level-stage-i-15_min-m",
    sectionLinks: [
      {
        sectionId: "dart-loop",
        relevance: "primary",
        confidence: "section-candidate",
        notes:
          "EA Austins Bridge is the standard paddler gauge for the Dart Loop (Newbridge to Buckfastleigh). Runnable ranges need local validation.",
      },
    ],
  },
  {
    provider: "natural-resources-wales",
    providerStationId: "4163",
    providerMeasureId: "4163:38",
    stationName: "Dee at Corwen",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl:
      "https://rivers-and-seas.naturalresources.wales/Station/4163?lang=en&parameterType=1",
    sectionLinks: [
      {
        sectionId: "dee-llangollen",
        relevance: "primary",
        confidence: "nearby-candidate",
        notes:
          "NRW Dee at Corwen is the nearest online gauge upstream of Llangollen (Town Falls/Serpent's Tail); there is no telemetered gauge in Llangollen itself. Runnable ranges need local validation.",
      },
    ],
  },
  {
    provider: "sepa",
    providerStationId: "14935",
    providerMeasureId: "55173010",
    stationName: "Tay at Pitnacree",
    parameter: "river_level",
    unit: "m",
    samplingInterval: "15_min",
    datum: "stage",
    sourceUrl:
      "https://timeseries.sepa.org.uk/KiWIS/KiWIS?service=kisters&type=queryServices&datasource=0&request=getTimeseriesValues&ts_id=55173010&format=html",
    sectionLinks: [
      {
        sectionId: "tay-grandtully",
        relevance: "primary",
        confidence: "nearby-candidate",
        notes:
          "SEPA Pitnacree is the closest gauge (about 2 km downstream) to Grandtully; the de-facto Tay-at-Grandtully level. Runnable ranges need local validation.",
      },
    ],
  },
  // --- Research-discovered paddler gauges for the 57 catalogue rivers (#2) ---
  // England (EA)
  paddlingGauge("environment-agency", "750801", "750801-level-stage-i-15_min-m", "Greta at Riddings Wood", ["river-greta-cumbria-main"]),
  paddlingGauge("environment-agency", "730511", "730511-level-stage-i-15_min-m", "Kent at Sedgwick", ["river-kent-main"]),
  paddlingGauge("environment-agency", "735430", "735430-level-stage-i-15_min-m", "Leven at Newby Bridge", ["river-leven-main"]),
  paddlingGauge("environment-agency", "737537", "737537-level-stage-i-15_min-m", "Crake at Low Nibthwaite", ["river-crake-main"]),
  paddlingGauge("environment-agency", "740101", "740101-level-stage-i-15_min-m", "Duddon at Ulpha", ["river-duddon-main"]),
  paddlingGauge("environment-agency", "742006", "742006-level-stage-i-15_min-m", "Esk at Cropple How", ["river-esk-eskdale-main"]),
  paddlingGauge("environment-agency", "735123", "735123-level-stage-i-15_min-m", "Brathay at Jeffy Knotts", ["river-brathay-main"]),
  paddlingGauge("environment-agency", "760502", "760502-level-stage-i-15_min-m", "Eden at Temple Sowerby", ["river-eden-cumbria-main"]),
  paddlingGauge("environment-agency", "722242", "722242-level-stage-i-15_min-m", "Lune at Lunes Bridge", ["river-lune-main"]),
  paddlingGauge("environment-agency", "723423", "723423-level-stage-i-15_min-m", "Rawthey at Brigflats", ["river-rawthey-main"]),
  paddlingGauge("environment-agency", "F3505", "F3505-level-stage-i-15_min-m", "Tees at Middleton", ["river-tees-upper-main"]),
  paddlingGauge("environment-agency", "F2306", "F2306-level-stage-i-15_min-m", "Swale at Catterick Bridge", ["river-swale-main"]),
  paddlingGauge("environment-agency", "L2208", "L2208-level-stage-i-15_min-m", "Ure at Bainbridge", ["river-ure-main"]),
  paddlingGauge("environment-agency", "L1907", "L1907-level-stage-i-15_min-m", "Wharfe at Kettlewell", ["river-wharfe-main"]),
  paddlingGauge("environment-agency", "023003", "023003-level-stage-i-15_min-m", "North Tyne at Reaverhill", ["river-north-tyne-main"]),
  paddlingGauge("environment-agency", "47135", "47135-level-stage-i-15_min-m", "Tavy at Mary Tavy", ["river-tavy-main"]),
  paddlingGauge("environment-agency", "45121", "45121-level-stage-i-15_min-m", "Barle at Brushford", ["river-barle-main"]),
  paddlingGauge("environment-agency", "50150", "50150-level-stage-i-15_min-m", "East Lyn at Brendon", ["river-east-lyn-main"]),
  // Wales (NRW) — Conwy/Glaslyn serve proxy neighbours
  paddlingGauge("natural-resources-wales", "4145", "4145:28", "Conwy at Cwmlanerch", ["river-conwy-main", "river-llugwy-main", "river-lledr-main"]),
  paddlingGauge("natural-resources-wales", "4155", "4155:71", "Glaslyn at Beddgelert", ["river-glaslyn-main", "river-colwyn-main"]),
  paddlingGauge("natural-resources-wales", "4171", "4171:50", "Dwyfor at Garndolbenmaen", ["river-dwyfor-main"]),
  paddlingGauge("natural-resources-wales", "4179", "4179:130", "Seiont at Peblic Mill", ["river-seiont-main"]),
  paddlingGauge("natural-resources-wales", "4150", "4150:102", "Mawddach at Tyddyn Gwladys", ["river-mawddach-main"]),
  paddlingGauge("natural-resources-wales", "4146", "4146:51", "Dyfi at Dyfi Bridge", ["river-dyfi-main"]),
  paddlingGauge("natural-resources-wales", "4210", "4210:156", "Teifi at Glan Teifi", ["river-teifi-main"]),
  paddlingGauge("natural-resources-wales", "4286", "4286:10093", "Usk at Brecon Promenade", ["river-usk-main"]),
  paddlingGauge("natural-resources-wales", "4010", "4010:84", "Irfon at Cilmery", ["river-irfon-main"]),
  paddlingGauge("natural-resources-wales", "4196", "4196:169", "Tywi at Dolau Hirion", ["river-tywi-main"]),
  paddlingGauge("natural-resources-wales", "4091", "4091:152", "Tawe at Craig y Nos", ["river-tawe-main"]),
  paddlingGauge("natural-resources-wales", "4121", "4121:103", "Mellte at Pontneddfechan", ["river-mellte-main"]),
  // Scotland (SEPA) — Tummel serves the Perthshire Garry proxy
  paddlingGauge("sepa", "133087", "52986010", "Orchy at Glen Orchy", ["river-orchy-main"]),
  paddlingGauge("sepa", "116011", "52539010", "Nevis at Claggan", ["river-nevis-main"]),
  paddlingGauge("sepa", "234189", "57174010", "Garry at Craigard", ["river-garry-invergarry-main"]),
  paddlingGauge("sepa", "234262", "57823010", "Moriston at Levishie", ["river-moriston-main"]),
  paddlingGauge("sepa", "234215", "57395010", "Affric at Fasnakyle", ["river-affric-main"]),
  paddlingGauge("sepa", "234289", "58017010", "Carron at New Kelso", ["river-carron-wester-ross-main"]),
  paddlingGauge("sepa", "234306", "58236010", "Findhorn at Shenachie", ["river-findhorn-main"]),
  paddlingGauge("sepa", "234168", "56932010", "Spey at Boat of Garten", ["river-spey-main"]),
  paddlingGauge("sepa", "234217", "57411010", "Feshie at Feshie Bridge", ["river-feshie-main"]),
  paddlingGauge("sepa", "234274", "57912010", "Dee at Mar Lodge", ["river-dee-aberdeenshire-main"]),
  paddlingGauge("sepa", "14963", "55554010", "Tummel at Pitlochry", ["river-tummel-main", "river-garry-perthshire-main"]),
  paddlingGauge("sepa", "14951", "55383010", "Lyon at Comrie Bridge", ["river-lyon-main"]),
  paddlingGauge("sepa", "14956", "55481010", "Ericht at Craighall", ["river-ericht-main"]),
  paddlingGauge("sepa", "14979", "55822010", "Tweed at Peebles", ["river-tweed-main"]),
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

const LEVEL_STATE_HISTORY_DAYS = 90;
const LEVEL_STATE_MIN_SAMPLES = 20;

export type SectionLevelBand =
  | "low"
  | "normal"
  | "high"
  | "very-high"
  | "unknown";

export interface SectionLevelState {
  sectionId: string;
  band: SectionLevelBand;
  parameter: string;
  unit: string | null;
  value: number | null;
  observedAt: string | null;
  /** Fraction of the gauge's own recent history below the current reading (0..1). */
  percentile: number | null;
  sampleSize: number;
}

function classifyLevelBand(
  sampleSize: number,
  percentile: number | null,
): SectionLevelBand {
  if (sampleSize < LEVEL_STATE_MIN_SAMPLES || percentile === null) {
    return "unknown";
  }
  if (percentile < 0.25) return "low";
  if (percentile < 0.75) return "normal";
  if (percentile < 0.9) return "high";
  return "very-high";
}

// Honest level *state* per section: where the primary gauge's current reading sits in
// its OWN recent history (percentile), not a curated runnable threshold. Sections with
// no live primary gauge or too little history are omitted (the map renders them grey).
export async function listSectionLevelStates(): Promise<SectionLevelState[]> {
  const result = await pool.query(
    `WITH primary_measure AS (
       SELECT DISTINCT ON (l.section_id)
         l.section_id,
         m.id AS measure_id,
         m.parameter,
         m.unit,
         latest.value AS latest_value,
         latest.observed_at
       FROM section_measure_links l
       JOIN observation_measures m ON m.id = l.measure_id
       JOIN observation_latest_readings latest ON latest.measure_id = m.id
       WHERE l.relevance = 'primary'
         AND m.parameter IN ('river_level', 'river_flow')
         AND latest.state = 'live'
         AND latest.value IS NOT NULL
       ORDER BY l.section_id,
         CASE m.parameter WHEN 'river_level' THEN 1 ELSE 2 END,
         m.id
     ),
     stats AS (
       SELECT pm.section_id,
         pm.parameter,
         pm.unit,
         pm.latest_value,
         pm.observed_at,
         count(r.*) AS sample_size,
         count(r.*) FILTER (WHERE r.value < pm.latest_value) AS below
       FROM primary_measure pm
       JOIN observation_readings r
         ON r.measure_id = pm.measure_id
         AND r.observed_at >= now() - ($1::int * interval '1 day')
         AND r.value IS NOT NULL
       GROUP BY pm.section_id, pm.parameter, pm.unit, pm.latest_value, pm.observed_at
     )
     SELECT section_id,
       parameter,
       unit,
       latest_value,
       observed_at,
       sample_size,
       CASE WHEN sample_size > 0 THEN below::float8 / sample_size ELSE NULL END
         AS percentile
     FROM stats`,
    [LEVEL_STATE_HISTORY_DAYS],
  );

  return result.rows.map((row) => {
    const sampleSize = Number(row.sample_size ?? 0);
    const percentile =
      row.percentile === null || row.percentile === undefined
        ? null
        : Number(row.percentile);
    return {
      sectionId: row.section_id as string,
      parameter: row.parameter as string,
      unit: (row.unit as string | null) ?? null,
      value: row.latest_value === null ? null : Number(row.latest_value),
      observedAt: row.observed_at
        ? new Date(row.observed_at).toISOString()
        : null,
      percentile,
      sampleSize,
      band: classifyLevelBand(sampleSize, percentile),
    };
  });
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

  if (measure.provider === "sepa") {
    return fetchSepaReadings(measure, windowHours);
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

async function fetchSepaReadings(
  measure: ObservationMeasure,
  windowHours: number,
) {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const query = new URLSearchParams({
    service: "kisters",
    type: "queryServices",
    datasource: "0",
    request: "getTimeseriesValues",
    ts_id: measure.providerMeasureId,
    from: since,
    format: "json",
  });
  const url = `https://timeseries.sepa.org.uk/KiWIS/KiWIS?${query.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `SEPA returned HTTP ${response.status} for ${measure.providerMeasureId}.`,
    );
  }

  // KiWIS getTimeseriesValues returns an array with one series object that
  // carries a `columns` header ("Timestamp,Value") and a `data` array of rows.
  const payload = (await response.json()) as SepaTimeseriesValuesResponse[];
  const series = Array.isArray(payload) ? payload.at(0) : undefined;
  const columns = (series?.columns ?? "Timestamp,Value")
    .split(",")
    .map((column) => column.trim().toLowerCase());
  const timestampIndex = Math.max(columns.indexOf("timestamp"), 0);
  const valueColumn = columns.indexOf("value");
  const valueIndex = valueColumn === -1 ? 1 : valueColumn;

  return (series?.data ?? [])
    .map((row) => {
      const observedAt = row[timestampIndex];
      const rawValue = row[valueIndex];
      const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
      return { observedAt, value };
    })
    .filter(
      (reading): reading is { observedAt: string; value: number } =>
        typeof reading.observedAt === "string" && Number.isFinite(reading.value),
    )
    .map((reading) => ({
      observedAt: reading.observedAt,
      value: reading.value,
      raw: { observedAt: reading.observedAt, value: reading.value },
    }));
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
