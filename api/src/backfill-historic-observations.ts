// Historic level/flow backfill — pulls archive readings for the gauges we
// already track, far beyond the live endpoints' rolling windows:
//   - SEPA: the same KiWIS endpoint the live ingest uses serves the full
//     multi-year archive with an explicit from/to window.
//   - Environment Agency: the flood-monitoring API only holds ~28 days; the
//     open Hydrology API (environment.data.gov.uk/hydrology) holds years of
//     15-minute data. We resolve each flood-monitoring stationReference to its
//     hydrology station/measure once, then walk month windows.
//   - NRW: the API-portal "River level, Rainfall and Sea data" API serves ~1
//     year per station+parameter in a single response. Needs NRW_API_KEY (an
//     Ocp-Apim-Subscription-Key from api-portal.naturalresources.wales);
//     without it NRW is skipped with a note.
//
// Idempotent: inserts land with ON CONFLICT (measure_id, observed_at) DO
// NOTHING, so re-runs and overlaps with the live ingest are safe.
//
// Run: npm --prefix api run backfill:observations:historic -- \
//        [--years=2] [--provider=all|sepa|environment-agency] \
//        [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
//      (DATABASE_URL selects the target database.)
import { closePool, pool } from "./db.js";

const REQUEST_SPACING_MS = 300;
const EA_HYDROLOGY_BASE = "https://environment.data.gov.uk/hydrology";
const SEPA_KIWIS_BASE = "https://timeseries.sepa.org.uk/KiWIS/KiWIS";

interface BackfillMeasure {
  id: string;
  provider: string;
  providerMeasureId: string;
  parameter: string;
}

interface HistoricReading {
  observedAt: string;
  value: number;
}

function parseArgs(args: string[]) {
  const read = (name: string) =>
    args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const years = Math.max(0.1, Math.min(Number(read("years") ?? "2"), 10));
  const provider = read("provider") ?? "all";
  const now = new Date();
  const from = read("from")
    ? new Date(`${read("from")}T00:00:00Z`)
    : new Date(now.getTime() - years * 365.25 * 24 * 60 * 60 * 1000);
  const to = read("to") ? new Date(`${read("to")}T00:00:00Z`) : now;
  if (
    !["all", "sepa", "environment-agency", "natural-resources-wales"].includes(
      provider,
    )
  ) {
    throw new Error(`Unsupported --provider=${provider}`);
  }
  return { from, to, provider };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, attempts = 3): Promise<unknown> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt >= attempts) {
        throw new Error(`${url} failed after ${attempts} attempts: ${error}`);
      }
      await sleep(1000 * attempt * attempt);
    }
  }
}

/** Month-sized [from, to) windows, newest first so progress reads naturally. */
function monthWindows(from: Date, to: Date): Array<{ from: Date; to: Date }> {
  const windows: Array<{ from: Date; to: Date }> = [];
  let end = to;
  while (end > from) {
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, end.getUTCDate()),
    );
    windows.push({ from: start < from ? from : start, to: end });
    end = start;
  }
  return windows;
}

// --- Environment Agency (Hydrology API archive) -----------------------------

interface EaHydrologyMapping {
  readingsUrl: string;
}

const eaMappingCache = new Map<string, EaHydrologyMapping | null>();

async function resolveEaHydrologyMeasure(
  measure: BackfillMeasure,
): Promise<EaHydrologyMapping | null> {
  const stationReference = measure.providerMeasureId.split("-")[0];
  const cacheKey = `${stationReference}:${measure.parameter}`;
  const cached = eaMappingCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const targetParameter =
    measure.parameter === "river_flow" ? "flow" : "level";
  const stations = (await fetchJson(
    `${EA_HYDROLOGY_BASE}/id/stations?stationReference=${encodeURIComponent(stationReference)}`,
  )) as { items?: Array<{ "@id"?: string }> };
  const stationUrl = stations.items?.[0]?.["@id"];
  if (!stationUrl) {
    eaMappingCache.set(cacheKey, null);
    return null;
  }
  await sleep(REQUEST_SPACING_MS);

  const measures = (await fetchJson(`${stationUrl}/measures`)) as {
    items?: Array<{
      "@id"?: string;
      parameter?: string;
      period?: number;
      valueType?: string;
    }>;
  };
  const candidates = (measures.items ?? []).filter(
    (item) =>
      item.parameter === targetParameter &&
      item.valueType === "instantaneous" &&
      item.period === 900 &&
      item["@id"],
  );
  // Prefer the quality-checked series when both exist.
  const chosen =
    candidates.find((item) => item["@id"]!.endsWith("-qualified")) ??
    candidates[0];
  const mapping = chosen ? { readingsUrl: `${chosen["@id"]}/readings` } : null;
  eaMappingCache.set(cacheKey, mapping);
  return mapping;
}

async function fetchEaWindow(
  mapping: EaHydrologyMapping,
  from: Date,
  to: Date,
): Promise<HistoricReading[]> {
  const min = from.toISOString().slice(0, 10);
  const max = to.toISOString().slice(0, 10);
  const data = (await fetchJson(
    `${mapping.readingsUrl}?mineq-date=${min}&maxeq-date=${max}&_limit=20000`,
  )) as { items?: Array<{ dateTime?: string; value?: number }> };
  return (data.items ?? [])
    .filter(
      (item): item is { dateTime: string; value: number } =>
        typeof item.dateTime === "string" && Number.isFinite(item.value),
    )
    .map((item) => ({ observedAt: item.dateTime, value: item.value }));
}

// --- SEPA (KiWIS archive) ----------------------------------------------------

async function fetchSepaWindow(
  measure: BackfillMeasure,
  from: Date,
  to: Date,
): Promise<HistoricReading[]> {
  const query = new URLSearchParams({
    service: "kisters",
    type: "queryServices",
    datasource: "0",
    request: "getTimeseriesValues",
    ts_id: measure.providerMeasureId,
    from: from.toISOString(),
    to: to.toISOString(),
    format: "json",
  });
  const data = (await fetchJson(`${SEPA_KIWIS_BASE}?${query}`)) as Array<{
    data?: Array<[string, number | string | null]>;
  }>;
  const rows = Array.isArray(data) ? (data[0]?.data ?? []) : [];
  return rows
    .map((row) => ({ observedAt: row[0], value: Number(row[1]) }))
    .filter(
      (reading): reading is HistoricReading =>
        typeof reading.observedAt === "string" &&
        Number.isFinite(reading.value),
    );
}

// --- NRW (API-portal historical endpoint) -------------------------------------

const NRW_HISTORICAL_BASE =
  "https://api.naturalresources.wales/rivers-and-seas/v1/api/StationData/historical";

// One response per station+parameter carries the full available archive
// (~1 year of 15-min readings), so no month-windowing.
async function fetchNrwHistory(
  measure: BackfillMeasure,
  apiKey: string,
): Promise<HistoricReading[]> {
  const [location, parameter] = measure.providerMeasureId.split(":");
  if (!location || !parameter) {
    throw new Error(
      `NRW measure ${measure.providerMeasureId} must be location:parameter`,
    );
  }
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(
        `${NRW_HISTORICAL_BASE}?location=${encodeURIComponent(location)}&parameter=${encodeURIComponent(parameter)}`,
        {
          headers: {
            Accept: "application/json",
            "Ocp-Apim-Subscription-Key": apiKey,
          },
          signal: AbortSignal.timeout(60000),
        },
      );
      if (response.status === 429 && attempt < 6) {
        // APIM per-minute quota: wait out the window rather than burning retries.
        await sleep(65000);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        parameterReadings?: Array<{ time?: string; value?: number }>;
      };
      return (data.parameterReadings ?? [])
        .filter(
          (item): item is { time: string; value: number } =>
            typeof item.time === "string" && Number.isFinite(item.value),
        )
        .map((item) => ({ observedAt: item.time, value: item.value }));
    } catch (error) {
      if (attempt >= 3) {
        throw new Error(`NRW ${measure.providerMeasureId} failed: ${error}`);
      }
      await sleep(1000 * attempt * attempt);
    }
  }
}

// --- Storage ------------------------------------------------------------------

async function insertReadings(
  measureId: string,
  readings: HistoricReading[],
): Promise<number> {
  if (readings.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < readings.length; i += 2000) {
    const chunk = readings.slice(i, i + 2000);
    const result = await pool.query(
      `INSERT INTO observation_readings (measure_id, observed_at, value, raw)
       SELECT $1, x.observed_at, x.value, '{"source":"historic-backfill"}'::jsonb
       FROM jsonb_to_recordset($2::jsonb)
         AS x(observed_at timestamptz, value double precision)
       ON CONFLICT (measure_id, observed_at) DO NOTHING`,
      [
        measureId,
        JSON.stringify(
          chunk.map((r) => ({ observed_at: r.observedAt, value: r.value })),
        ),
      ],
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

// --- Main ---------------------------------------------------------------------

async function main() {
  const { from, to, provider } = parseArgs(process.argv.slice(2));
  const nrwApiKey = process.env.NRW_API_KEY ?? "";
  let providers: string[];
  if (provider === "all") {
    providers = ["sepa", "environment-agency"];
    if (nrwApiKey) {
      providers.push("natural-resources-wales");
    } else {
      console.warn(
        "NRW skipped: set NRW_API_KEY (api-portal.naturalresources.wales subscription key) to include Wales.",
      );
    }
  } else {
    providers = [provider];
  }
  if (providers.includes("natural-resources-wales") && !nrwApiKey) {
    throw new Error("--provider=natural-resources-wales requires NRW_API_KEY.");
  }

  const measures = await pool.query<{
    id: string;
    provider: string;
    provider_measure_id: string;
    parameter: string;
  }>(
    `SELECT m.id, s.provider, m.provider_measure_id, m.parameter
     FROM observation_measures m
     JOIN observation_stations s ON s.id = m.station_id
     WHERE m.enabled = true AND s.provider = ANY($1)
     ORDER BY s.provider, m.provider_measure_id`,
    [providers],
  );

  console.log(
    `Backfilling ${measures.rowCount} measures (${providers.join(", ")}) ` +
      `${from.toISOString().slice(0, 10)} -> ${to.toISOString().slice(0, 10)}`,
  );

  let totalFetched = 0;
  let totalInserted = 0;
  const failures: string[] = [];

  for (const row of measures.rows) {
    const measure: BackfillMeasure = {
      id: row.id,
      provider: row.provider,
      providerMeasureId: row.provider_measure_id,
      parameter: row.parameter,
    };
    let fetched = 0;
    let inserted = 0;
    try {
      let eaMapping: EaHydrologyMapping | null = null;
      if (measure.provider === "environment-agency") {
        eaMapping = await resolveEaHydrologyMeasure(measure);
        await sleep(REQUEST_SPACING_MS);
        if (!eaMapping) {
          console.warn(
            `  SKIP ${measure.providerMeasureId}: no EA hydrology archive measure found`,
          );
          continue;
        }
      }
      if (measure.provider === "natural-resources-wales") {
        // Single response carries the full archive; still bound to the
        // requested window so --from/--to behave consistently.
        const readings = (await fetchNrwHistory(measure, nrwApiKey)).filter(
          (reading) => {
            const at = new Date(reading.observedAt).getTime();
            return at >= from.getTime() && at <= to.getTime();
          },
        );
        fetched += readings.length;
        inserted += await insertReadings(measure.id, readings);
        // NRW responses are the full archive (~1.7MB); space them well clear
        // of the APIM per-minute quota.
        await sleep(8000);
      } else {
        for (const window of monthWindows(from, to)) {
          const readings =
            measure.provider === "sepa"
              ? await fetchSepaWindow(measure, window.from, window.to)
              : await fetchEaWindow(eaMapping!, window.from, window.to);
          fetched += readings.length;
          inserted += await insertReadings(measure.id, readings);
          await sleep(REQUEST_SPACING_MS);
        }
      }
      totalFetched += fetched;
      totalInserted += inserted;
      console.log(
        `  OK ${measure.provider} ${measure.providerMeasureId} (${measure.parameter}): fetched ${fetched}, inserted ${inserted}`,
      );
    } catch (error) {
      failures.push(measure.providerMeasureId);
      console.error(`  FAIL ${measure.providerMeasureId}: ${error}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        measures: measures.rowCount,
        totalFetched,
        totalInserted,
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
