import type { PoolClient } from "pg";
import { closePool, pool } from "./db.js";

interface PilotRiver {
  id: string;
  canonicalName: string;
  displayName: string;
  country: string;
  region: string;
  riverType: string;
  summary: string;
  centre: [number, number];
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  sectionIds: string[];
}

interface Options {
  dryRun: boolean;
  allowPartialCandidates: boolean;
  sourceVersion: string;
  riverIds: string[] | null;
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface CandidateRecord {
  sourceId: string;
  sourceVersion: string;
  sourceUrl: string;
  licence: string;
  featureType: string;
  candidateType: string;
  name: string | null;
  title: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  rawProperties: Record<string, string>;
  sourceMetadata: Record<string, unknown>;
}

interface RiverCandidateBatch {
  river: PilotRiver;
  candidates: CandidateRecord[];
}

const PILOT_RIVERS: PilotRiver[] = [
  {
    id: "river-wye",
    canonicalName: "River Wye",
    displayName: "River Wye",
    country: "GB",
    region: "Wales / England",
    riverType: "river",
    summary:
      "Pilot touring river record linking existing Wye sections, OSM candidate features, and later official context.",
    centre: [52.095, -3.137],
    bbox: { south: 52.0, west: -3.21, north: 52.16, east: -2.55 },
    sectionIds: [
      "wye-glasbury-hay",
      "wye-hay-whitney",
      "wye-whitney-bredwardine",
      "wye-hoarwithy-ross",
      "wye-ross-kerne",
      "wye-kerne-symonds-yat",
      "wye-symonds-yat-monmouth",
    ],
  },
  {
    id: "afon-tryweryn",
    canonicalName: "Afon Tryweryn",
    displayName: "Afon Tryweryn",
    country: "GB",
    region: "Wales",
    riverType: "river",
    summary:
      "Pilot managed whitewater river record linking upper/lower Tryweryn sections and OSM candidate features.",
    centre: [52.934, -3.635],
    bbox: { south: 52.9, west: -3.7, north: 52.99, east: -3.55 },
    sectionIds: ["tryweryn-dam-centre", "tryweryn-centre-bala"],
  },
  {
    id: "river-dee-llangollen",
    canonicalName: "River Dee",
    displayName: "River Dee / Llangollen",
    country: "GB",
    region: "Wales",
    riverType: "river",
    summary:
      "Pilot Dee/Llangollen river record for whitewater, canal-adjacent context, and candidate feature extraction.",
    centre: [52.976, -3.17],
    bbox: { south: 52.94, west: -3.25, north: 53.05, east: -3.05 },
    sectionIds: ["dee-llangollen"],
  },
  {
    id: "river-dart-loop",
    canonicalName: "River Dart",
    displayName: "River Dart",
    country: "GB",
    region: "England",
    riverType: "river",
    summary:
      "Pilot Dart river record for English whitewater candidate features and future local verification.",
    centre: [50.54, -3.8],
    bbox: { south: 50.48, west: -3.9, north: 50.62, east: -3.7 },
    sectionIds: ["dart-loop"],
  },
  {
    id: "river-tay-grandtully",
    canonicalName: "River Tay",
    displayName: "River Tay / Grandtully",
    country: "GB",
    region: "Scotland",
    riverType: "river",
    summary:
      "Pilot Scottish river record for Grandtully-area candidate features and future official source discovery.",
    centre: [56.65, -3.7],
    bbox: { south: 56.55, west: -3.85, north: 56.75, east: -3.55 },
    sectionIds: ["tay-grandtully"],
  },
];

const OSM_CANDIDATE_WATERWAY_VALUES = new Set([
  "rapids",
  "weir",
  "waterfall",
  "dam",
  "sluice_gate",
  "lock_gate",
  "lock",
  "turning_point",
  "sanitary_dump_station",
]);

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function main() {
  const options = readOptions(process.argv.slice(2));
  const pilots = PILOT_RIVERS.filter(
    (river) => !options.riverIds || options.riverIds.includes(river.id),
  );

  if (!pilots.length) {
    throw new Error("No matching pilot rivers selected.");
  }

  const results = [];
  const batches: RiverCandidateBatch[] = [];

  for (const river of pilots) {
    try {
      const candidates = await fetchOsmCandidateRecords(river, options.sourceVersion);

      batches.push({ river, candidates });

      results.push({
        riverId: river.id,
        displayName: river.displayName,
        ok: true,
        sectionLinks: river.sectionIds.length,
        osmCandidates: candidates.length,
        candidateTypes: countBy(candidates, (candidate) => candidate.candidateType),
        dryRun: options.dryRun,
      });
    } catch (error) {
      if (!options.dryRun && !options.allowPartialCandidates) {
        throw new Error(
          `Failed to fetch OSM candidates for ${river.id}: ${errorMessage(error)}`,
        );
      }

      batches.push({ river, candidates: [] });

      results.push({
        riverId: river.id,
        displayName: river.displayName,
        ok: false,
        sectionLinks: river.sectionIds.length,
        osmCandidates: 0,
        candidateTypes: {},
        dryRun: options.dryRun,
        error: errorMessage(error),
      });
    }
  }

  if (!options.dryRun) {
    await writeBatches(batches);
  }

  console.log(JSON.stringify({ sourceVersion: options.sourceVersion, results }, null, 2));
}

async function writeBatches(batches: RiverCandidateBatch[]) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const { river, candidates } of batches) {
      await upsertCanonicalRiver(client, river);
      await upsertSectionLinks(client, river);

      for (const candidate of candidates) {
        const sourceFeatureId = await upsertSourceFeature(client, candidate);
        await upsertRiverSourceLink(client, river.id, sourceFeatureId, candidate);
        await upsertSourceCandidatePoi(client, river.id, sourceFeatureId, candidate);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function fetchOsmCandidateRecords(
  river: PilotRiver,
  sourceVersion: string,
): Promise<CandidateRecord[]> {
  const response = await fetchOverpass(river);
  const records: CandidateRecord[] = [];

  for (const element of response.elements ?? []) {
    const tags = element.tags ?? {};
    const candidateType = candidateTypeForTags(tags);
    const location = locationForElement(element);

    if (!candidateType || !location || typeof element.id !== "number" || !element.type) {
      continue;
    }

    const sourceId = `${element.type}/${element.id}`;
    const name = tags.name ?? tags["whitewater:section_name"] ?? null;
    const title = name ?? titleForCandidate(candidateType, sourceId);

    records.push({
      sourceId,
      sourceVersion,
      sourceUrl: `https://www.openstreetmap.org/${sourceId}`,
      licence: "Open Database Licence",
      featureType: "osm-candidate-poi",
      candidateType,
      name,
      title,
      geometry: {
        type: "Point",
        coordinates: [location.lon, location.lat],
      },
      rawProperties: tags,
      sourceMetadata: {
        source: "OpenStreetMap",
        sourceVersion,
        role: "Review-needed candidate POI for RiverLaunch canonical river pilot.",
        warning:
          "OSM tags are source-derived hints only; they do not prove access, safety, legal status, grade, or current conditions.",
      },
    });
  }

  return dedupeCandidates(records);
}

async function fetchOverpass(river: PilotRiver): Promise<OverpassResponse> {
  const query = `[out:json][timeout:120];
(
  nwr["waterway"~"^(rapids|weir|waterfall|dam|sluice_gate|lock_gate|lock|turning_point|sanitary_dump_station)$"](${river.bbox.south},${river.bbox.west},${river.bbox.north},${river.bbox.east});
  nwr["whitewater:section_grade"](${river.bbox.south},${river.bbox.west},${river.bbox.north},${river.bbox.east});
  nwr["whitewater:section_name"](${river.bbox.south},${river.bbox.west},${river.bbox.north},${river.bbox.east});
  nwr["rapids"](${river.bbox.south},${river.bbox.west},${river.bbox.north},${river.bbox.east});
);
out tags center 1000;`;
  let lastError: string | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": "RiverLaunch.app canonical river pilot seed",
        },
        body: new URLSearchParams({ data: query }).toString(),
      }, 60_000);

      if (response.ok) {
        return await response.json() as OverpassResponse;
      }

      lastError = `${endpoint} HTTP ${response.status}: ${await response.text()}`;
    } catch (error) {
      lastError = `${endpoint}: ${errorMessage(error)}`;
    }
  }

  throw new Error(lastError ?? "All Overpass endpoints failed.");
}

async function upsertCanonicalRiver(client: PoolClient, river: PilotRiver) {
  await client.query(
    `INSERT INTO canonical_rivers (
      id,
      canonical_name,
      display_name,
      country,
      region,
      river_type,
      summary,
      overview_location,
      bbox,
      source_confidence,
      curation_status,
      payload
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      ST_SetSRID(ST_MakePoint($8, $9), 4326),
      ST_MakeEnvelope($10, $11, $12, $13, 4326),
      'pilot-curated',
      'candidate',
      $14::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      canonical_name = EXCLUDED.canonical_name,
      display_name = EXCLUDED.display_name,
      country = EXCLUDED.country,
      region = EXCLUDED.region,
      river_type = EXCLUDED.river_type,
      summary = EXCLUDED.summary,
      overview_location = EXCLUDED.overview_location,
      bbox = EXCLUDED.bbox,
      source_confidence = EXCLUDED.source_confidence,
      curation_status = EXCLUDED.curation_status,
      payload = EXCLUDED.payload,
      updated_at = now(),
      revision = canonical_rivers.revision + 1`,
    [
      river.id,
      river.canonicalName,
      river.displayName,
      river.country,
      river.region,
      river.riverType,
      river.summary,
      river.centre[1],
      river.centre[0],
      river.bbox.west,
      river.bbox.south,
      river.bbox.east,
      river.bbox.north,
      JSON.stringify({
        seedKind: "pilot-canonical-river",
        osOpenRivers: "not-used",
        sourcePolicy:
          "Curated pilot river identity. OSM candidates remain review-needed.",
      }),
    ],
  );
}

async function upsertSectionLinks(client: PoolClient, river: PilotRiver) {
  for (const sectionId of river.sectionIds) {
    await client.query(
      `INSERT INTO canonical_river_section_links (
        river_id,
        route_source,
        section_id,
        relationship_type,
        status,
        confidence,
        payload
      ) VALUES (
        $1,
        'section_fixture',
        $2,
        'contains-section',
        'active',
        'pilot-curated',
        $3::jsonb
      )
      ON CONFLICT (river_id, route_source, section_id, relationship_type) DO UPDATE SET
        status = EXCLUDED.status,
        confidence = EXCLUDED.confidence,
        payload = EXCLUDED.payload,
        updated_at = now()`,
      [
        river.id,
        sectionId,
        JSON.stringify({
          source: "pilot-canonical-river-seed",
          warning: "Section membership is curated for the pilot and needs review before national generation.",
        }),
      ],
    );
  }
}

async function upsertSourceFeature(client: PoolClient, candidate: CandidateRecord) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO river_source_features (
      source,
      source_id,
      source_version,
      source_url,
      licence,
      feature_type,
      name,
      geometry,
      raw_properties,
      source_metadata
    ) VALUES (
      'osm',
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      ST_SetSRID(ST_GeomFromGeoJSON($7), 4326),
      $8::jsonb,
      $9::jsonb
    )
    ON CONFLICT (source, source_id, source_version) DO UPDATE SET
      source_url = EXCLUDED.source_url,
      licence = EXCLUDED.licence,
      feature_type = EXCLUDED.feature_type,
      name = EXCLUDED.name,
      geometry = EXCLUDED.geometry,
      raw_properties = EXCLUDED.raw_properties,
      source_metadata = EXCLUDED.source_metadata,
      updated_at = now(),
      revision = river_source_features.revision + 1
    RETURNING id`,
    [
      candidate.sourceId,
      candidate.sourceVersion,
      candidate.sourceUrl,
      candidate.licence,
      candidate.featureType,
      candidate.name,
      JSON.stringify(candidate.geometry),
      JSON.stringify(candidate.rawProperties),
      JSON.stringify(candidate.sourceMetadata),
    ],
  );

  return result.rows[0].id;
}

async function upsertRiverSourceLink(
  client: PoolClient,
  riverId: string,
  sourceFeatureId: string,
  candidate: CandidateRecord,
) {
  await client.query(
    `INSERT INTO river_source_links (
      river_id,
      source_feature_id,
      relationship_type,
      status,
      confidence,
      payload
    ) VALUES (
      $1,
      $2,
      'candidate-poi-within-pilot-bbox',
      'review_needed',
      'source-derived',
      $3::jsonb
    )
    ON CONFLICT (river_id, source_feature_id, relationship_type) DO UPDATE SET
      status = EXCLUDED.status,
      confidence = EXCLUDED.confidence,
      payload = EXCLUDED.payload,
      updated_at = now()`,
    [
      riverId,
      sourceFeatureId,
      JSON.stringify({
        candidateType: candidate.candidateType,
        warning: "BBox-derived river relationship; review before public display.",
      }),
    ],
  );
}

async function upsertSourceCandidatePoi(
  client: PoolClient,
  riverId: string,
  sourceFeatureId: string,
  candidate: CandidateRecord,
) {
  await client.query(
    `INSERT INTO source_candidate_pois (
      id,
      river_id,
      source_feature_id,
      source,
      source_id,
      source_version,
      source_url,
      licence,
      candidate_type,
      title,
      status,
      geometry,
      raw_properties,
      source_metadata
    ) VALUES (
      $1,
      $2,
      $3,
      'osm',
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      'review_needed',
      ST_SetSRID(ST_GeomFromGeoJSON($10), 4326),
      $11::jsonb,
      $12::jsonb
    )
    ON CONFLICT (source, source_id, source_version) DO UPDATE SET
      river_id = EXCLUDED.river_id,
      source_feature_id = EXCLUDED.source_feature_id,
      source_url = EXCLUDED.source_url,
      licence = EXCLUDED.licence,
      candidate_type = EXCLUDED.candidate_type,
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      geometry = EXCLUDED.geometry,
      raw_properties = EXCLUDED.raw_properties,
      source_metadata = EXCLUDED.source_metadata,
      updated_at = now(),
      revision = source_candidate_pois.revision + 1`,
    [
      `osm:${candidate.sourceId}`,
      riverId,
      sourceFeatureId,
      candidate.sourceId,
      candidate.sourceVersion,
      candidate.sourceUrl,
      candidate.licence,
      candidate.candidateType,
      candidate.title,
      JSON.stringify(candidate.geometry),
      JSON.stringify(candidate.rawProperties),
      JSON.stringify(candidate.sourceMetadata),
    ],
  );
}

function candidateTypeForTags(tags: Record<string, string>) {
  const waterway = tags.waterway;

  if (waterway && OSM_CANDIDATE_WATERWAY_VALUES.has(waterway)) {
    return `waterway=${waterway}`;
  }

  if (tags.rapids) {
    return "rapids";
  }

  if (tags["whitewater:section_grade"] || tags["whitewater:section_name"]) {
    return "whitewater-section";
  }

  return null;
}

function locationForElement(element: OverpassElement) {
  const lat = Number(element.lat ?? element.center?.lat);
  const lon = Number(element.lon ?? element.center?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

function titleForCandidate(candidateType: string, sourceId: string) {
  return `${candidateType.replace(/^waterway=/, "")} candidate ${sourceId}`;
}

function dedupeCandidates(records: CandidateRecord[]) {
  const bySourceId = new Map<string, CandidateRecord>();

  for (const record of records) {
    bySourceId.set(record.sourceId, record);
  }

  return [...bySourceId.values()].sort((a, b) =>
    a.sourceId.localeCompare(b.sourceId),
  );
}

function countBy<T>(values: T[], readKey: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = readKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchWithTimeout(
  url: string,
  init: Parameters<typeof fetch>[1],
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readOptions(args: string[]): Options {
  const valueFor = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const riverIds = valueFor("--river");

  return {
    dryRun: args.includes("--dry-run"),
    allowPartialCandidates: args.includes("--allow-partial-candidates"),
    sourceVersion:
      valueFor("--source-version") ?? `overpass-candidates-${new Date().toISOString().slice(0, 10)}`,
    riverIds: riverIds ? riverIds.split(",").map((id) => id.trim()).filter(Boolean) : null,
  };
}

main()
  .then(() => closePool())
  .catch(async (error: unknown) => {
    console.error(error);
    await closePool();
    process.exit(1);
  });
