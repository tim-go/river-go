import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import type { PoolClient } from "pg";
import { closePool, pool } from "./db.js";

interface ImportOptions {
  file: string | null;
  format: "overpass-json" | "geojson" | "geojsonseq";
  bbox: string | null;
  bufferMetres: number;
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

interface GeoJsonFeature {
  type?: string;
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
}

interface AmenityRecord {
  source_id: string;
  category: string;
  name: string | null;
  geometry: { type: string; coordinates: unknown };
  raw_properties: Record<string, unknown>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const AMENITY_VALUES = [
  "pub",
  "bar",
  "parking",
  "toilets",
  "cafe",
  "drinking_water",
];

// Map OSM tags → our amenity category. Returns null for anything we don't keep.
function categorise(tags: Record<string, unknown>): string | null {
  const amenity = typeof tags.amenity === "string" ? tags.amenity : "";
  if (amenity === "pub" || amenity === "bar") return "pub";
  if (amenity === "parking") return "car_park";
  if (amenity === "toilets") return "toilets";
  if (amenity === "cafe") return "cafe";
  if (amenity === "drinking_water") return "drinking_water";
  if (typeof tags.shop === "string" && tags.shop) return "shop";
  return null;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const client = await pool.connect();
  let inserted = 0;

  try {
    // Repeatable refresh: clear, then re-insert only what survives the proximity
    // filter. (DELETE+reinsert, not a one-off seed.)
    await client.query("DELETE FROM amenities WHERE source = 'osm_amenity'");

    // Build "our rivers" geometry once — the OSM watercourse ways that match a
    // featured canonical river (same match the level-lines use) — indexed, so the
    // proximity test is fast. Temp table lives for this client session.
    await client.query(`CREATE TEMP TABLE our_rivers AS
      SELECT w.geometry
      FROM watercourses w
      JOIN canonical_rivers cr
        ON lower(w.name) IN (
          lower(split_part(cr.display_name, ' / ', 1)),
          lower(regexp_replace(split_part(cr.display_name, ' / ', 1), '^(River|Afon|Water of|Allt) ', ''))
        )
        AND ST_Intersects(w.geometry, cr.bbox)`);
    await client.query(
      "CREATE INDEX our_rivers_gix ON our_rivers USING gist (geometry)",
    );
    await client.query("ANALYZE our_rivers");

    const batch: AmenityRecord[] = [];
    for await (const record of readRecords(options)) {
      batch.push(record);
      if (batch.length >= 500) {
        inserted += await insertBatch(client, batch, options.bufferMetres);
        batch.length = 0;
      }
    }
    if (batch.length) {
      inserted += await insertBatch(client, batch, options.bufferMetres);
    }
  } finally {
    client.release();
  }

  console.log(`Imported ${inserted} riverside amenities.`);
  await closePool();
}

async function* readRecords(
  options: ImportOptions,
): AsyncGenerator<AmenityRecord> {
  if (!options.file) {
    const response = await fetchOverpassAmenities(readBbox(options.bbox));
    for (const element of response.elements ?? []) {
      for (const record of elementToRecord(element)) yield record;
    }
    return;
  }

  if (options.format === "overpass-json") {
    const input = JSON.parse(await readFile(options.file, "utf8")) as {
      elements?: OverpassElement[];
    };
    for (const element of input.elements ?? []) {
      for (const record of elementToRecord(element)) yield record;
    }
    return;
  }

  if (options.format === "geojson") {
    const input = JSON.parse(await readFile(options.file, "utf8")) as
      | GeoJsonFeature
      | { type?: string; features?: GeoJsonFeature[] };
    const features =
      input.type === "FeatureCollection"
        ? ((input as { features?: GeoJsonFeature[] }).features ?? [])
        : input.type === "Feature"
          ? [input as GeoJsonFeature]
          : [];
    for (const feature of features) {
      for (const record of featureToRecord(feature)) yield record;
    }
    return;
  }

  const stream = createReadStream(options.file, { encoding: "utf8" });
  const lines = createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  for await (const line of lines) {
    const trimmed = line.replace(/^\u001e+/, "").trim();
    if (!trimmed) continue;
    const feature = JSON.parse(trimmed) as GeoJsonFeature;
    for (const record of featureToRecord(feature)) yield record;
  }
}

async function fetchOverpassAmenities(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}) {
  const amenity = AMENITY_VALUES.join("|");
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = `[out:json][timeout:180];
(
  nwr["amenity"~"^(${amenity})$"](${b});
  nwr["shop"](${b});
);
out tags center;`;

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

  return (await response.json()) as { elements?: OverpassElement[] };
}

function elementToRecord(element: OverpassElement): AmenityRecord[] {
  if (typeof element.id !== "number" || !element.type) return [];
  const tags = element.tags ?? {};
  const category = categorise(tags);
  if (!category) return [];

  const lat = element.type === "node" ? element.lat : element.center?.lat;
  const lon = element.type === "node" ? element.lon : element.center?.lon;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return [];

  return [
    {
      source_id: `${element.type}/${element.id}`,
      category,
      name: typeof tags.name === "string" ? tags.name : null,
      geometry: { type: "Point", coordinates: [Number(lon), Number(lat)] },
      raw_properties: tags,
    },
  ];
}

function featureToRecord(feature: GeoJsonFeature): AmenityRecord[] {
  if (feature.type !== "Feature" || !feature.geometry) return [];
  const properties = feature.properties ?? {};
  const category = categorise(properties);
  if (!category) return [];

  return [
    {
      source_id: readOsmSourceId(feature, properties),
      category,
      name:
        typeof properties.name === "string" && properties.name.trim()
          ? properties.name.trim()
          : null,
      geometry: feature.geometry as { type: string; coordinates: unknown },
      raw_properties: properties,
    },
  ];
}

function readOsmSourceId(
  feature: GeoJsonFeature,
  properties: Record<string, unknown>,
): string {
  for (const candidate of [feature.id, properties["@id"], properties.id]) {
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate))
      return String(Math.trunc(candidate));
  }
  return `amenity/${JSON.stringify(feature.geometry?.coordinates ?? []).length}-${
    typeof properties.name === "string" ? properties.name : "unnamed"
  }`;
}

async function insertBatch(
  client: PoolClient,
  records: AmenityRecord[],
  bufferMetres: number,
) {
  if (!records.length) return 0;

  // Degree prefilter (uses the GIST index) generous enough for UK latitudes, then
  // a precise geography metres check.
  const degrees = bufferMetres / 50000;

  const result = await client.query(
    `WITH input AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS record(
         source_id text,
         category text,
         name text,
         geometry jsonb,
         raw_properties jsonb
       )
     ),
     pts AS (
       SELECT source_id, category, name, raw_properties,
         ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 4326)) AS geom
       FROM input
     )
     INSERT INTO amenities (source, source_id, category, name, geometry, raw_properties, source_metadata)
     SELECT 'osm_amenity', p.source_id, p.category, p.name, p.geom, p.raw_properties,
       jsonb_build_object(
         'source', 'OpenStreetMap',
         'licence', 'Open Database Licence',
         'role', 'Reference amenity near a featured river — shown as-is from OpenStreetMap'
       )
     FROM pts p
     WHERE p.geom IS NOT NULL AND NOT ST_IsEmpty(p.geom)
       AND EXISTS (
         SELECT 1 FROM our_rivers r
         WHERE ST_DWithin(r.geometry, p.geom, $2)
           AND ST_DWithin(r.geometry::geography, p.geom::geography, $3)
       )
     ON CONFLICT (source, source_id) DO UPDATE SET
       category = EXCLUDED.category,
       name = EXCLUDED.name,
       geometry = EXCLUDED.geometry,
       raw_properties = EXCLUDED.raw_properties,
       source_metadata = EXCLUDED.source_metadata,
       updated_at = now()`,
    [JSON.stringify(records), degrees, bufferMetres],
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
  const format = readFormat(file, valueFor("--format"));

  if (!file && !bbox) {
    throw new Error(
      "Usage: npm run import:osm-amenities -- --file amenities.geojsonseq [--format geojsonseq|geojson|overpass-json] OR --bbox south,west,north,east [--buffer-metres 1000]",
    );
  }

  const buffer = Number(valueFor("--buffer-metres") ?? "1000");
  return {
    file,
    format,
    bbox,
    bufferMetres: Number.isFinite(buffer) && buffer > 0 ? buffer : 1000,
  };
}

function readFormat(
  file: string | null,
  explicitFormat: string | undefined,
): ImportOptions["format"] {
  const format = explicitFormat ?? inferFormat(file);
  if (
    format !== "overpass-json" &&
    format !== "geojson" &&
    format !== "geojsonseq"
  ) {
    throw new Error("--format must be overpass-json, geojson, or geojsonseq.");
  }
  return format;
}

function inferFormat(file: string | null): ImportOptions["format"] {
  if (!file) return "overpass-json";
  if (file.endsWith(".geojsonseq") || file.endsWith(".geojsonl"))
    return "geojsonseq";
  if (file.endsWith(".geojson")) return "geojson";
  return "overpass-json";
}

function readBbox(value: string | null) {
  if (!value) throw new Error("--bbox is required when --file is not supplied.");
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
