import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { closePool, pool } from "./db.js";

interface ImportOptions {
  file: string | null;
  format: "overpass-json" | "geojson" | "geojsonseq";
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

interface GeoJsonFeature {
  type?: string;
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
}

interface GeoJsonFeatureCollection {
  type?: string;
  features?: GeoJsonFeature[];
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

  if (options.truncateSource) {
    await pool.query("DELETE FROM watercourses WHERE source = 'osm_waterway'");
  }

  let imported = 0;
  const batch: OsmWaterwayRecord[] = [];

  for await (const record of readRecords(options)) {
    batch.push(record);

    if (batch.length >= 500) {
      imported += await upsertBatch(batch);
      batch.length = 0;
      console.log(`Imported ${imported} OSM waterways...`);
    }
  }

  if (batch.length) {
    imported += await upsertBatch(batch);
  }

  console.log(`Imported ${imported} OSM waterway links.`);
  await closePool();
}

async function* readRecords(
  options: ImportOptions,
): AsyncGenerator<OsmWaterwayRecord> {
  if (!options.file) {
    const response = await fetchOverpassWaterways(readBbox(options.bbox));

    for (const element of response.elements ?? []) {
      for (const record of elementToRecord(element, options.sourceVersion)) {
        yield record;
      }
    }
    return;
  }

  if (options.format === "overpass-json") {
    const input = JSON.parse(await readFile(options.file, "utf8")) as OverpassResponse;

    for (const element of input.elements ?? []) {
      for (const record of elementToRecord(element, options.sourceVersion)) {
        yield record;
      }
    }
    return;
  }

  if (options.format === "geojson") {
    const input = JSON.parse(await readFile(options.file, "utf8")) as
      | GeoJsonFeature
      | GeoJsonFeatureCollection;
    const features =
      isGeoJsonFeatureCollection(input)
        ? input.features ?? []
        : input.type === "Feature"
          ? [input]
          : [];

    for (const feature of features) {
      for (const record of geoJsonFeatureToRecord(feature, options.sourceVersion)) {
        yield record;
      }
    }
    return;
  }

  const stream = createReadStream(options.file, { encoding: "utf8" });
  const lines = createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of lines) {
    const trimmed = normaliseGeoJsonSequenceLine(line);

    if (!trimmed) {
      continue;
    }

    const feature = JSON.parse(trimmed) as GeoJsonFeature;
    for (const record of geoJsonFeatureToRecord(feature, options.sourceVersion)) {
      yield record;
    }
  }
}

function normaliseGeoJsonSequenceLine(line: string) {
  return line.replace(/^\u001e+/, "").trim();
}

function isGeoJsonFeatureCollection(
  value: GeoJsonFeature | GeoJsonFeatureCollection,
): value is GeoJsonFeatureCollection {
  return value.type === "FeatureCollection";
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

function geoJsonFeatureToRecord(
  feature: GeoJsonFeature,
  sourceVersion: string,
): OsmWaterwayRecord[] {
  if (feature.type !== "Feature" || !feature.geometry) {
    return [];
  }

  const properties = feature.properties ?? {};
  const waterway = readText(properties, "waterway");

  if (!waterway || !OSM_WATERWAY_VALUES.includes(waterway)) {
    return [];
  }

  const geometry = normaliseGeoJsonGeometry(feature.geometry);

  if (!geometry.length) {
    return [];
  }

  const sourceId = readOsmSourceId(feature, properties);
  const sourceUrl = sourceId.startsWith("way/")
    ? `https://www.openstreetmap.org/${sourceId}`
    : "";

  return [
    {
      source_id: sourceId,
      source_version: sourceVersion,
      source_url: sourceUrl,
      licence: "Open Database Licence",
      name: readText(properties, "name"),
      alternate_name:
        readText(properties, "alt_name") ?? readText(properties, "name:en"),
      watercourse_type: waterway,
      flow_direction: readText(properties, "oneway"),
      form: readText(properties, "intermittent") === "yes" ? "intermittent" : null,
      length_m: null,
      geometry: {
        type: "MultiLineString",
        coordinates: geometry,
      },
      raw_properties: properties,
      source_metadata: {
        source: "OpenStreetMap",
        sourceVersion,
        sourceUrl,
        licence: "Open Database Licence",
        role: "Visual waterway geometry for route snap preview and map context only",
        warning:
          "This geometry does not prove paddleability, legal access, safety, grade, or current conditions.",
      },
    },
  ];
}

function normaliseGeoJsonGeometry(
  geometry: NonNullable<GeoJsonFeature["geometry"]>,
): Array<Array<[number, number]>> {
  if (geometry.type === "LineString") {
    const line = normaliseCoordinates(geometry.coordinates);
    return line.length >= 2 ? [line] : [];
  }

  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates
      .map(normaliseCoordinates)
      .filter((line) => line.length >= 2);
  }

  return [];
}

function normaliseCoordinates(coordinates: unknown): Array<[number, number]> {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return [];
    }

    const lng = Number(coordinate[0]);
    const lat = Number(coordinate[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    return [[lng, lat] as [number, number]];
  });
}

function readOsmSourceId(
  feature: GeoJsonFeature,
  properties: Record<string, unknown>,
) {
  const candidates = [
    feature.id,
    properties["@id"],
    properties.id,
    properties.osm_id,
    properties.osm_way_id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normaliseOsmId(candidate.trim());
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return `way/${Math.trunc(candidate)}`;
    }
  }

  const name = readText(properties, "name") ?? "unnamed";
  return `feature/${name}-${JSON.stringify(feature.geometry?.coordinates ?? []).length}`;
}

function normaliseOsmId(value: string) {
  if (value.startsWith("way/")) {
    return value;
  }

  if (value.startsWith("w")) {
    const numeric = value.replace(/^w/, "");
    return numeric ? `way/${numeric}` : value;
  }

  if (/^\d+$/.test(value)) {
    return `way/${value}`;
  }

  return value;
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
  const explicitFormat = valueFor("--format");
  const format = readFormat(file, explicitFormat);

  if (!file && !bbox) {
    throw new Error(
      "Usage: npm run import:osm-waterways -- --file waterways.geojsonseq [--format geojsonseq|geojson|overpass-json] OR --bbox south,west,north,east",
    );
  }

  return {
    file,
    format,
    bbox,
    sourceVersion:
      valueFor("--source-version") ?? `overpass-${new Date().toISOString().slice(0, 10)}`,
    truncateSource: args.includes("--truncate-source"),
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
  if (!file) {
    return "overpass-json";
  }

  if (file.endsWith(".geojsonseq") || file.endsWith(".geojsonl")) {
    return "geojsonseq";
  }

  if (file.endsWith(".geojson")) {
    return "geojson";
  }

  return "overpass-json";
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

function readText(
  properties: Record<string, unknown>,
  key: string,
): string | null {
  const value = properties[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
