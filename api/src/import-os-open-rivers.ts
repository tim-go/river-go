import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import proj4 from "proj4";
import { open as openShapefile } from "shapefile";
import { closePool, pool } from "./db.js";

type LatLngTuple = [number, number];
type LineString = LatLngTuple[];
type MultiLineString = LineString[];

interface ImportOptions {
  file: string;
  format: "geojson" | "shapefile";
  sourceSrid: "27700" | "4326";
  sourceVersion: string;
  sourceUrl: string;
  truncate: boolean;
  limit: number | null;
}

interface GeoJsonFeature {
  type: "Feature";
  properties?: Record<string, unknown> | null;
  geometry?: {
    type: string;
    coordinates: unknown;
  } | null;
}

interface WatercourseImportRecord {
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

const OS_OPEN_RIVERS_SOURCE_URL =
  "https://osdatahub.os.uk/downloads/open/OpenRivers";

proj4.defs(
  "EPSG:27700",
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +units=m +no_defs",
);

async function main() {
  const options = readOptions(process.argv.slice(2));

  if (options.truncate) {
    await pool.query("TRUNCATE watercourses");
  }

  let imported = 0;
  const batch: WatercourseImportRecord[] = [];

  for await (const feature of readFeatures(options)) {
    const record = featureToRecord(feature, options);

    if (!record) {
      continue;
    }

    batch.push(record);

    if (batch.length >= 500) {
      imported += await upsertBatch(batch);
      batch.length = 0;
      console.log(`Imported ${imported} watercourse links...`);
    }

    if (options.limit != null && imported + batch.length >= options.limit) {
      break;
    }
  }

  if (batch.length) {
    imported += await upsertBatch(batch);
  }

  console.log(`Imported ${imported} OS Open Rivers watercourse links.`);
}

async function* readFeatures(options: ImportOptions): AsyncGenerator<GeoJsonFeature> {
  if (options.format === "geojson") {
    const parsed = JSON.parse(await readFile(options.file, "utf8")) as {
      type?: string;
      features?: GeoJsonFeature[];
    };

    if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
      throw new Error("GeoJSON input must be a FeatureCollection.");
    }

    for (const feature of parsed.features) {
      yield feature;
    }
    return;
  }

  const source = await openShapefile(options.file);

  while (true) {
    const result = await source.read();
    if (result.done) {
      break;
    }

    yield result.value as GeoJsonFeature;
  }
}

function featureToRecord(
  feature: GeoJsonFeature,
  options: ImportOptions,
): WatercourseImportRecord | null {
  if (!feature.geometry) {
    return null;
  }

  const geometry = normaliseGeometry(feature.geometry, options.sourceSrid);

  if (!geometry) {
    return null;
  }

  const properties = feature.properties ?? {};
  const sourceId =
    readText(properties, "id") ??
    readText(properties, "identifier") ??
    readText(properties, "gml_identifier") ??
    stableFeatureId(properties, geometry);

  return {
    source_id: sourceId,
    source_version: options.sourceVersion,
    source_url: options.sourceUrl,
    licence: "Open Government Licence",
    name:
      readText(properties, "watercourse_name") ??
      readText(properties, "watercourseName") ??
      readText(properties, "name1"),
    alternate_name:
      readText(properties, "watercourse_name_alternative") ??
      readText(properties, "watercourseNameAlternative") ??
      readText(properties, "name2"),
    watercourse_type: "watercourse",
    flow_direction:
      readText(properties, "flow_direction") ??
      readText(properties, "flowDirection") ??
      readText(properties, "flow"),
    form: readText(properties, "form"),
    length_m: readNumber(properties, "length"),
    geometry: {
      type: "MultiLineString",
      coordinates: geometry.map((line) => line.map(([lat, lng]) => [lng, lat])),
    },
    raw_properties: properties,
    source_metadata: {
      source: "OS Open Rivers",
      sourceVersion: options.sourceVersion,
      sourceUrl: options.sourceUrl,
      sourceSrid: options.sourceSrid,
      licence: "Open Government Licence",
      role: "Watercourse reference geometry for snapping and context only",
      warning:
        "This geometry does not prove paddleability, legal access, safety, grade, or current conditions.",
    },
  };
}

function normaliseGeometry(
  geometry: NonNullable<GeoJsonFeature["geometry"]>,
  sourceSrid: ImportOptions["sourceSrid"],
): MultiLineString | null {
  if (geometry.type === "LineString") {
    return [normaliseLine(geometry.coordinates, sourceSrid)];
  }

  if (geometry.type === "MultiLineString") {
    if (!Array.isArray(geometry.coordinates)) {
      return null;
    }

    return geometry.coordinates.flatMap((line) =>
      Array.isArray(line) ? [normaliseLine(line, sourceSrid)] : [],
    );
  }

  return null;
}

function normaliseLine(
  coordinates: unknown,
  sourceSrid: ImportOptions["sourceSrid"],
): LineString {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return [];
    }

    const x = Number(coordinate[0]);
    const y = Number(coordinate[1]);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return [];
    }

    if (sourceSrid === "4326") {
      return [[y, x] as LatLngTuple];
    }

    const [lng, lat] = proj4("EPSG:27700", "WGS84", [x, y]);
    return [[lat, lng] as LatLngTuple];
  });
}

async function upsertBatch(records: WatercourseImportRecord[]) {
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
      'os_open_rivers',
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

  const file = valueFor("--file");
  if (!file) {
    throw new Error(
      "Usage: npm run import:os-open-rivers -- --file <WatercourseLink.shp|watercourse.geojson> [--format shapefile|geojson] [--source-srid 27700|4326] [--truncate]",
    );
  }

  const format =
    valueFor("--format") ??
    (path.extname(file).toLowerCase() === ".shp" ? "shapefile" : "geojson");
  const sourceSrid = valueFor("--source-srid") ?? (format === "shapefile" ? "27700" : "4326");
  const limitRaw = valueFor("--limit");

  if (format !== "geojson" && format !== "shapefile") {
    throw new Error("--format must be geojson or shapefile.");
  }

  if (sourceSrid !== "27700" && sourceSrid !== "4326") {
    throw new Error("--source-srid must be 27700 or 4326.");
  }

  return {
    file,
    format,
    sourceSrid,
    sourceVersion: valueFor("--source-version") ?? "April 2026",
    sourceUrl: valueFor("--source-url") ?? OS_OPEN_RIVERS_SOURCE_URL,
    truncate: args.includes("--truncate"),
    limit: limitRaw ? Number.parseInt(limitRaw, 10) : null,
  };
}

function readText(
  properties: Record<string, unknown>,
  key: string,
): string | null {
  const value = properties[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(
  properties: Record<string, unknown>,
  key: string,
): number | null {
  const value = properties[key];
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function stableFeatureId(
  properties: Record<string, unknown>,
  geometry: MultiLineString,
) {
  return createHash("sha256")
    .update(JSON.stringify({ properties, geometry }))
    .digest("hex")
    .slice(0, 32);
}

main()
  .then(() => closePool())
  .catch(async (error: unknown) => {
    console.error(error);
    await closePool();
    process.exit(1);
  });
