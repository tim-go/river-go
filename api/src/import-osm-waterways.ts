import { readFile } from "node:fs/promises";
import { closePool, pool } from "./db.js";

interface ImportOptions {
  file: string | null;
  bbox: string | null;
  sourceVersion: string;
  truncateSource: boolean;
}

interface OverpassElement {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
  geometry?: Array<{
    lat?: number;
    lon?: number;
  }>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface OsmWaterwayRecord {
  source_id: string;
  source_version: string;
  source_url: string;
  licence: string;
  name: string | null;
  alternate_name: string | null;
  watercourse_type: string;
  flow_direction: string | null;
  form: string | null;
  length_m: number | null;
  geometry: {
    type: "MultiLineString";
    coordinates: Array<Array<[number, number]>>;
  };
  raw_properties: Record<string, unknown>;
  source_metadata: Record<string, unknown>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OSM_WATERWAY_VALUES = [
  "river",
  "stream",
  "canal",
  "drain",
  "ditch",
  "tidal_channel",
];

async function main() {
  const options = readOptions(process.argv.slice(2));
  const input = options.file
    ? JSON.parse(await readFile(options.file, "utf8")) as OverpassResponse
    : await fetchOverpassWaterways(readBbox(options.bbox));

  if (options.truncateSource) {
    await pool.query("DELETE FROM watercourses WHERE source = 'osm_waterway'");
  }

  const records = (input.elements ?? []).flatMap((element) =>
    elementToRecord(element, options.sourceVersion),
  );

  let imported = 0;
  for (let index = 0; index < records.length; index += 500) {
    imported += await upsertBatch(records.slice(index, index + 500));
    console.log(`Imported ${imported} OSM waterways...`);
  }

  console.log(`Imported ${imported} OSM waterway links.`);
  await closePool();
}

async function fetchOverpassWaterways(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<OverpassResponse> {
  const query = `[out:json][timeout:180];
(
  way["waterway"~"^(${OSM_WATERWAY_VALUES.join("|")})$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out tags geom;`;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "RiverLaunch.app development importer",
    },
    body: new URLSearchParams({ data: query }).toString(),
  });

  if (!response.ok) {
    throw new Error(
      `Overpass request failed with HTTP ${response.status}: ${await response.text()}`,
    );
  }

  return await response.json() as OverpassResponse;
}

function elementToRecord(
  element: OverpassElement,
  sourceVersion: string,
): OsmWaterwayRecord[] {
  if (element.type !== "way" || typeof element.id !== "number") {
    return [];
  }

  const tags = element.tags ?? {};
  const waterway = tags.waterway;

  if (!waterway || !OSM_WATERWAY_VALUES.includes(waterway)) {
    return [];
  }

  const line = (element.geometry ?? []).flatMap((point) => {
    const lat = Number(point.lat);
    const lon = Number(point.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }

    return [[lon, lat] as [number, number]];
  });

  if (line.length < 2) {
    return [];
  }

  return [
    {
      source_id: `way/${element.id}`,
      source_version: sourceVersion,
      source_url: `https://www.openstreetmap.org/way/${element.id}`,
      licence: "Open Database Licence",
      name: tags.name ?? null,
      alternate_name: tags.alt_name ?? tags["name:en"] ?? null,
      watercourse_type: waterway,
      flow_direction: tags.oneway ?? null,
      form: tags.intermittent === "yes" ? "intermittent" : null,
      length_m: null,
      geometry: {
        type: "MultiLineString",
        coordinates: [line],
      },
      raw_properties: tags,
      source_metadata: {
        source: "OpenStreetMap",
        sourceVersion,
        sourceUrl: `https://www.openstreetmap.org/way/${element.id}`,
        licence: "Open Database Licence",
        role: "Visual waterway geometry for route snap preview and map context only",
        warning:
          "This geometry does not prove paddleability, legal access, safety, grade, or current conditions.",
      },
    },
  ];
}

async function upsertBatch(records: OsmWaterwayRecord[]) {
  if (!records.length) {
    return 0;
  }

  const result = await pool.query(
    `WITH input AS (
      SELECT *
      FROM jsonb_to_recordset($1::jsonb) AS record(
        source_id text,
        source_version text,
        source_url text,
        licence text,
        name text,
        alternate_name text,
        watercourse_type text,
        flow_direction text,
        form text,
        length_m numeric,
        geometry jsonb,
        raw_properties jsonb,
        source_metadata jsonb
      )
    )
    INSERT INTO watercourses (
      source,
      source_id,
      source_version,
      source_url,
      licence,
      name,
      alternate_name,
      watercourse_type,
      flow_direction,
      form,
      length_m,
      geometry,
      raw_properties,
      source_metadata
    )
    SELECT
      'osm_waterway',
      source_id,
      source_version,
      source_url,
      licence,
      name,
      alternate_name,
      watercourse_type,
      flow_direction,
      form,
      length_m,
      ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 4326)),
      raw_properties,
      source_metadata
    FROM input
    WHERE jsonb_array_length(geometry -> 'coordinates') > 0
    ON CONFLICT (source, source_id, source_version) DO UPDATE SET
      source_url = EXCLUDED.source_url,
      licence = EXCLUDED.licence,
      name = EXCLUDED.name,
      alternate_name = EXCLUDED.alternate_name,
      watercourse_type = EXCLUDED.watercourse_type,
      flow_direction = EXCLUDED.flow_direction,
      form = EXCLUDED.form,
      length_m = EXCLUDED.length_m,
      geometry = EXCLUDED.geometry,
      raw_properties = EXCLUDED.raw_properties,
      source_metadata = EXCLUDED.source_metadata,
      updated_at = now(),
      revision = watercourses.revision + 1`,
    [JSON.stringify(records)],
  );

  return result.rowCount ?? 0;
}

function readOptions(args: string[]): ImportOptions {
  const valueFor = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const file = valueFor("--file") ?? null;
  const bbox = valueFor("--bbox") ?? null;

  if (!file && !bbox) {
    throw new Error(
      "Usage: npm run import:osm-waterways -- --file overpass.json OR --bbox south,west,north,east",
    );
  }

  return {
    file,
    bbox,
    sourceVersion:
      valueFor("--source-version") ?? `overpass-${new Date().toISOString().slice(0, 10)}`,
    truncateSource: args.includes("--truncate-source"),
  };
}

function readBbox(value: string | null) {
  if (!value) {
    throw new Error("--bbox is required when --file is not supplied.");
  }

  const [south, west, north, east] = value
    .split(",")
    .map((part) => Number.parseFloat(part.trim()));

  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east) ||
    south >= north ||
    west >= east
  ) {
    throw new Error("--bbox must be south,west,north,east.");
  }

  return { south, west, north, east };
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
