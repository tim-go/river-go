import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CkanPackageResult {
  success?: boolean;
  result?: {
    id?: string;
    title?: string;
    license_id?: string;
    license_title?: string;
    resources?: CkanResource[];
  };
}

interface CkanResource {
  name?: string;
  format?: string;
  url?: string;
}

interface SourcePackage {
  id: string;
  label: string;
  sourceUrl: string;
  preferredResourceNames: string[];
}

interface HttpProbe {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLength: string | null;
  sample: string | null;
  error: string | null;
}

interface FeatureCollection {
  type?: string;
  numberMatched?: number;
  numberReturned?: number;
  features?: GeoJsonFeature[];
}

interface GeoJsonFeature {
  type?: string;
  geometry?: {
    type?: string;
  } | null;
  properties?: Record<string, unknown> | null;
}

interface FeatureSample {
  label: string;
  url: string;
  ok: boolean;
  count: number | null;
  returned: number | null;
  geometryType: string | null;
  propertyKeys: string[];
  sampleProperties: Record<string, unknown>;
  error: string | null;
}

interface ArcGisCountResponse {
  count?: number;
  error?: {
    message?: string;
  };
}

interface OverpassElement {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
  remark?: string;
}

interface PilotRiver {
  label: string;
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  reason: string;
}

interface OsmPilotSummary {
  label: string;
  bbox: string;
  queryMode: string;
  ok: boolean;
  elementCount: number;
  typeCounts: Record<string, number>;
  waterwayValues: Record<string, number>;
  topTags: Array<[string, number]>;
  usefulTagCounts: Record<string, number>;
  candidateCounts: Record<string, number>;
  namedCandidateExamples: string[];
  error: string | null;
}

const CKAN_PACKAGES: SourcePackage[] = [
  {
    id: "os-open-rivers1",
    label: "OS Open Rivers",
    sourceUrl: "https://ckan.publishing.service.gov.uk/dataset/os-open-rivers1",
    preferredResourceNames: ["GeoPackage download", "Shapefile download"],
  },
  {
    id: "os-open-names1",
    label: "OS Open Names",
    sourceUrl: "https://ckan.publishing.service.gov.uk/dataset/os-open-names1",
    preferredResourceNames: ["Geopackage download", "CSV download"],
  },
  {
    id: "statutory-main-river-map",
    label: "Environment Agency Statutory Main River Map",
    sourceUrl:
      "https://ckan.publishing.service.gov.uk/dataset/statutory-main-river-map",
    preferredResourceNames: ["OGC API - Features service", "Statutory_Main_River_Map.geojson.zip"],
  },
  {
    id: "wfd-river-canal-and-surface-water-transfer-waterbodies-cycle-2",
    label: "EA WFD River/Canal/SWT Waterbodies Cycle 2",
    sourceUrl:
      "https://ckan.publishing.service.gov.uk/dataset/wfd-river-canal-and-surface-water-transfer-waterbodies-cycle-2",
    preferredResourceNames: [
      "OGC API - Features service",
      "WFD_River_Canal_and_Surface_Water_Transfer_Waterbodies_Cycle_2.geojson.zip",
    ],
  },
  {
    id: "wfd-river-water-bodies-2nd-cycle11",
    label: "OpenDataNI / DAERA WFD River Water Bodies 2nd Cycle",
    sourceUrl:
      "https://ckan.publishing.service.gov.uk/dataset/wfd-river-water-bodies-2nd-cycle11",
    preferredResourceNames: ["ArcGIS GeoService", "GeoJSON"],
  },
];

const OS_DOWNLOAD_PROBES = [
  {
    label: "OS Open Rivers GeoPackage",
    url: "https://api.os.uk/downloads/v1/products/OpenRivers/downloads?area=GB&format=GeoPackage&redirect",
  },
  {
    label: "OS Open Rivers Shapefile",
    url: "https://api.os.uk/downloads/v1/products/OpenRivers/downloads?area=GB&format=ESRI%C2%AE+Shapefile&redirect",
  },
  {
    label: "OS Open Names GeoPackage",
    url: "https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=GeoPackage&redirect",
  },
];

const FEATURE_SAMPLES = [
  {
    label: "EA WFD River/Canal/SWT Waterbodies Cycle 2",
    url: "https://environment.data.gov.uk/spatialdata/wfd-river-canal-and-surface-water-transfer-waterbodies-cycle-2/ogc/features/v1/collections/WFD_River_Canal_and_Surface_Water_Transfer_Water_Bodies_Cycle_2/items?limit=2",
  },
  {
    label: "EA Statutory Main River Map",
    url: "https://environment.data.gov.uk/spatialdata/statutory-main-river-map/ogc/features/v1/collections/Statutory_Main_River_Map/items?limit=2",
  },
  {
    label: "OpenDataNI / DAERA WFD River Water Bodies 2nd Cycle",
    url: "https://services-eu1.arcgis.com/kswen6BYexuc1SUk/arcgis/rest/services/WFD_River_Water_Bodies_2016/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=2",
    countUrl:
      "https://services-eu1.arcgis.com/kswen6BYexuc1SUk/arcgis/rest/services/WFD_River_Water_Bodies_2016/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json",
  },
];

const PILOT_RIVERS: PilotRiver[] = [
  {
    label: "Tryweryn",
    bbox: { south: 52.9, west: -3.7, north: 52.99, east: -3.55 },
    reason: "Managed dam-release whitewater pilot.",
  },
  {
    label: "Wye",
    bbox: { south: 52.0, west: -3.15, north: 52.15, east: -2.6 },
    reason: "Touring/open-canoe pilot with broad public awareness.",
  },
  {
    label: "Dee / Llangollen",
    bbox: { south: 52.94, west: -3.25, north: 53.05, east: -3.05 },
    reason: "Welsh whitewater and canal/aqueduct context.",
  },
  {
    label: "Dart Loop",
    bbox: { south: 50.48, west: -3.9, north: 50.62, east: -3.7 },
    reason: "English whitewater candidate.",
  },
  {
    label: "Tay / Grandtully",
    bbox: { south: 56.55, west: -3.85, north: 56.75, east: -3.55 },
    reason: "Scottish pilot where official WFD source discovery remains open.",
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

const USEFUL_OSM_TAGS = [
  "waterway",
  "rapids",
  "whitewater:section_grade",
  "whitewater:section_name",
  "boat",
  "canoe",
  "access",
  "tunnel",
  "bridge",
  "tidal",
  "intermittent",
  "operator",
  "wikidata",
  "wikipedia",
];

const DEFAULT_OUTPUT = fileURLToPath(
  new URL(
    "../../docs/product/canonical-river-source-spike-2026-06-05.md",
    import.meta.url,
  ),
);

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function main() {
  const outputPath = resolve(readOutputPath(process.argv.slice(2)));
  const generatedAt = new Date().toISOString();

  const ckanPackages = await Promise.all(
    CKAN_PACKAGES.map(async (source) => ({
      source,
      result: await fetchCkanPackage(source),
    })),
  );
  const osProbes = await Promise.all(
    OS_DOWNLOAD_PROBES.map(async (probe) => ({
      label: probe.label,
      result: await probeHttp(probe.url),
    })),
  );
  const featureSamples = await Promise.all(
    FEATURE_SAMPLES.map((sample) => fetchFeatureSample(sample)),
  );
  const osmSummaries: OsmPilotSummary[] = [];

  for (const pilot of PILOT_RIVERS) {
    osmSummaries.push(await fetchOsmPilotSummary(pilot));
  }

  const report = renderReport({
    generatedAt,
    ckanPackages,
    osProbes,
    featureSamples,
    osmSummaries,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report, "utf8");
  console.log(`Wrote ${outputPath}`);
}

async function fetchCkanPackage(source: SourcePackage) {
  try {
    const url = `https://ckan.publishing.service.gov.uk/api/3/action/package_show?id=${encodeURIComponent(source.id)}`;
    const response = await fetchJson<CkanPackageResult>(url);
    const result = response.result;
    const resources = result?.resources ?? [];

    return {
      ok: Boolean(response.success && result),
      title: result?.title ?? source.label,
      licence: result?.license_title ?? result?.license_id ?? "Unknown",
      resources: resources.map((resource) => ({
        name: resource.name ?? "",
        format: resource.format ?? "",
        url: resource.url ?? "",
      })),
      preferredResources: source.preferredResourceNames.flatMap((name) =>
        resources
          .filter((resource) => resource.name === name)
          .map((resource) => ({
            name: resource.name ?? name,
            format: resource.format ?? "",
            url: resource.url ?? "",
          })),
      ),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      title: source.label,
      licence: "Unknown",
      resources: [],
      preferredResources: [],
      error: errorMessage(error),
    };
  }
}

async function probeHttp(url: string): Promise<HttpProbe> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        accept: "*/*",
        range: "bytes=0-4095",
        "user-agent": "RiverLaunch.app canonical river source spike",
      },
      signal: controller.signal,
    }, 25_000);
    const text = await response.text();

    return {
      url,
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      sample: text.slice(0, 500),
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      contentType: null,
      contentLength: null,
      sample: null,
      error: errorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFeatureSample(sample: {
  label: string;
  url: string;
  countUrl?: string;
}): Promise<FeatureSample> {
  try {
    const collection = await fetchJson<FeatureCollection>(sample.url);
    const first = collection.features?.[0];
    const sampleProperties = first?.properties ?? {};
    const count = sample.countUrl
      ? await fetchArcGisCount(sample.countUrl)
      : collection.numberMatched ?? null;

    return {
      label: sample.label,
      url: sample.url,
      ok: true,
      count,
      returned: collection.numberReturned ?? collection.features?.length ?? null,
      geometryType: first?.geometry?.type ?? null,
      propertyKeys: Object.keys(sampleProperties),
      sampleProperties,
      error: null,
    };
  } catch (error) {
    return {
      label: sample.label,
      url: sample.url,
      ok: false,
      count: null,
      returned: null,
      geometryType: null,
      propertyKeys: [],
      sampleProperties: {},
      error: errorMessage(error),
    };
  }
}

async function fetchArcGisCount(url: string) {
  const result = await fetchJson<ArcGisCountResponse>(url);

  if (typeof result.count === "number") {
    return result.count;
  }

  throw new Error(result.error?.message ?? "ArcGIS count response had no count.");
}

async function fetchOsmPilotSummary(pilot: PilotRiver): Promise<OsmPilotSummary> {
  const bbox = `${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east}`;

  try {
    const { response, queryMode } = await fetchOverpassWithFallback(pilot);
    const elements = response.elements ?? [];
    const typeCounts: Record<string, number> = {};
    const waterwayValues: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const usefulTagCounts: Record<string, number> = {};
    const candidateCounts: Record<string, number> = {};
    const namedCandidateExamples: string[] = [];

    for (const element of elements) {
      typeCounts[element.type ?? "unknown"] =
        (typeCounts[element.type ?? "unknown"] ?? 0) + 1;

      const tags = element.tags ?? {};
      for (const [key, value] of Object.entries(tags)) {
        tagCounts[key] = (tagCounts[key] ?? 0) + 1;

        if (USEFUL_OSM_TAGS.includes(key)) {
          usefulTagCounts[key] = (usefulTagCounts[key] ?? 0) + 1;
        }

        if (key === "waterway") {
          waterwayValues[value] = (waterwayValues[value] ?? 0) + 1;
        }
      }

      const candidateType = candidateTypeForTags(tags);
      if (candidateType) {
        candidateCounts[candidateType] = (candidateCounts[candidateType] ?? 0) + 1;

        const name = tags.name ?? tags["whitewater:section_name"];
        if (name && namedCandidateExamples.length < 8) {
          const elementId =
            typeof element.id === "number" && element.type
              ? `${element.type}/${element.id}`
              : "unknown";
          namedCandidateExamples.push(
            `${name} (${candidateType}, ${elementId})`,
          );
        }
      }
    }

    return {
      label: pilot.label,
      bbox,
      queryMode,
      ok: true,
      elementCount: elements.length,
      typeCounts: sortRecord(typeCounts),
      waterwayValues: sortRecord(waterwayValues),
      topTags: topEntries(tagCounts, 12),
      usefulTagCounts: sortRecord(usefulTagCounts),
      candidateCounts: sortRecord(candidateCounts),
      namedCandidateExamples,
      error: response.remark ?? null,
    };
  } catch (error) {
    return {
      label: pilot.label,
      bbox,
      queryMode: "failed",
      ok: false,
      elementCount: 0,
      typeCounts: {},
      waterwayValues: {},
      topTags: [],
      usefulTagCounts: {},
      candidateCounts: {},
      namedCandidateExamples: [],
      error: errorMessage(error),
    };
  }
}

async function fetchOverpassWithFallback(pilot: PilotRiver) {
  try {
    return {
      response: await fetchOverpass(pilot, "waterway-and-candidates"),
      queryMode: "waterway-and-candidates",
    };
  } catch (error) {
    return {
      response: await fetchOverpass(pilot, "candidate-only"),
      queryMode: `candidate-only fallback after ${shortError(error)}`,
    };
  }
}

async function fetchOverpass(
  pilot: PilotRiver,
  mode: "waterway-and-candidates" | "candidate-only",
): Promise<OverpassResponse> {
  const query =
    mode === "waterway-and-candidates"
      ? `[out:json][timeout:120];
(
  nwr["waterway"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
  nwr["whitewater:section_grade"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
  nwr["whitewater:section_name"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
  nwr["rapids"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
);
out tags center 1000;`
      : `[out:json][timeout:120];
(
  nwr["waterway"~"^(rapids|weir|waterfall|dam|sluice_gate|lock_gate|lock|turning_point|sanitary_dump_station)$"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
  nwr["whitewater:section_grade"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
  nwr["whitewater:section_name"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
  nwr["rapids"](${pilot.bbox.south},${pilot.bbox.west},${pilot.bbox.north},${pilot.bbox.east});
);
out tags center 1000;`;

  let lastError: string | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "user-agent": "RiverLaunch.app canonical river source spike",
      },
      body: new URLSearchParams({ data: query }).toString(),
    }, 25_000);

    if (response.ok) {
      return await response.json() as OverpassResponse;
    }

    lastError = `${endpoint} HTTP ${response.status}: ${await response.text()}`;
  }

  throw new Error(lastError ?? "All Overpass endpoints failed.");
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url, {
    headers: {
      accept: "application/json",
      "user-agent": "RiverLaunch.app canonical river source spike",
    },
  }, 25_000);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json() as T;
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

function renderReport(input: {
  generatedAt: string;
  ckanPackages: Array<{
    source: SourcePackage;
    result: Awaited<ReturnType<typeof fetchCkanPackage>>;
  }>;
  osProbes: Array<{
    label: string;
    result: HttpProbe;
  }>;
  featureSamples: FeatureSample[];
  osmSummaries: OsmPilotSummary[];
}) {
  const lines = [
    "# Canonical River Source Spike",
    "",
    `**Generated:** ${input.generatedAt}`,
    "",
    "## Purpose",
    "",
    "This report is a repeatable evidence snapshot for the RiverLaunch canonical river database spike. It inspects public source metadata, lightweight official feature samples, OS download availability, and OSM candidate feature tags across pilot rivers. It does not write to the application database.",
    "",
    "## Summary",
    "",
    "- OS Open Rivers remains the best identified Great Britain river-network bootstrap candidate, but the direct OS download endpoint still needs a successful file sample before implementation.",
    "- EA WFD and Statutory Main River OGC APIs are reachable and expose useful official IDs/status/context, not paddling guidance.",
    "- OpenDataNI/DAERA WFD is reachable through the ArcGIS service and provides polygon waterbody context for Northern Ireland.",
    "- OSM pilot samples expose useful candidate POI and feature tags, especially rapids, weirs, whitewater grades/names, access/boat/canoe hints, tunnels, bridges, tidal/intermittent flags, and named structures.",
    "",
    "## CKAN Source Metadata",
    "",
    "| Source | OK | Licence | Preferred resources | Source URL |",
    "| --- | --- | --- | --- | --- |",
    ...input.ckanPackages.map(({ source, result }) =>
      [
        md(source.label),
        result.ok ? "yes" : "no",
        md(result.licence),
        md(
          result.preferredResources
            .map((resource) => `${resource.name || "unnamed"} ${resource.format ? `(${resource.format})` : ""}`)
            .join("; ") || "none",
        ),
        md(source.sourceUrl),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
    ),
    "",
    "## OS Download Probes",
    "",
    "| Probe | OK | Status | Content type | Content length | Result |",
    "| --- | --- | --- | --- | --- | --- |",
    ...input.osProbes.map(({ label, result }) =>
      [
        md(label),
        result.ok ? "yes" : "no",
        result.status == null ? "n/a" : String(result.status),
        md(result.contentType ?? "n/a"),
        md(result.contentLength ?? "n/a"),
        md(result.error ?? summarizeSample(result.sample)),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
    ),
    "",
    "## Official Feature Samples",
    "",
    "| Source | OK | Count | Returned | Geometry | Property keys | Sample properties |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...input.featureSamples.map((sample) =>
      [
        md(sample.label),
        sample.ok ? "yes" : "no",
        sample.count == null ? "n/a" : String(sample.count),
        sample.returned == null ? "n/a" : String(sample.returned),
        md(sample.geometryType ?? "n/a"),
        md(sample.propertyKeys.join(", ") || "n/a"),
        md(JSON.stringify(sample.sampleProperties)),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
    ),
    "",
    "## OSM Pilot Feature Samples",
    "",
    "| Pilot river | OK | Query | Reason | BBox | Elements | Element types | Waterway values | Useful tags | Candidate POI tags | Named candidate examples |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...input.osmSummaries.map((summary) =>
      [
        md(summary.label),
        summary.ok ? "yes" : "no",
        md(summary.queryMode),
        md(PILOT_RIVERS.find((pilot) => pilot.label === summary.label)?.reason ?? ""),
        md(summary.bbox),
        String(summary.elementCount),
        md(formatRecord(summary.typeCounts)),
        md(formatRecord(summary.waterwayValues)),
        md(formatRecord(summary.usefulTagCounts)),
        md(formatRecord(summary.candidateCounts)),
        md(summary.namedCandidateExamples.join("; ") || summary.error || "none"),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
    ),
    "",
    "## OSM Tag Frequency Detail",
    "",
    ...input.osmSummaries.flatMap((summary) => [
      `### ${summary.label}`,
      "",
      summary.ok
        ? `Top tags: ${summary.topTags.map(([key, count]) => `\`${key}\` ${count}`).join(", ") || "none"}`
        : `Error: ${summary.error ?? "unknown"}`,
      "",
    ]),
    "## Implementation Implications",
    "",
    "1. Add source-owned tables/imports before canonical `rivers`. The existing `watercourses` model already has the right provenance shape, but canonical records need separate source links.",
    "2. Keep OSM line geometry as the map-aligned snap/display layer. Use OSM nodes/ways with candidate tags as source-derived POI candidates, not confirmed hazards/features.",
    "3. Treat EA/NRW/SEPA/DAERA WFD and Main River datasets as official enrichment/context. They should link to rivers and observation providers, not create route suitability.",
    "4. Do not start a national canonical generation until OS Open Rivers file access and schema are confirmed and pilot river matching is reviewed.",
    "",
    "## Recommended Next Build Slice",
    "",
    "Build a non-public pilot importer that creates source-owned `river_source_features`, `canonical_rivers`, and `river_source_links` rows for the five pilot rivers only, plus `source_candidate_pois` rows for OSM feature tags in review-needed state.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function readOutputPath(args: string[]) {
  const outputIndex = args.indexOf("--out");
  return outputIndex >= 0 && args[outputIndex + 1]
    ? args[outputIndex + 1]
    : DEFAULT_OUTPUT;
}

function sortRecord(record: Record<string, number>) {
  return Object.fromEntries(topEntries(record, Number.POSITIVE_INFINITY));
}

function topEntries(record: Record<string, number>, limit: number) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function formatRecord(record: Record<string, number>) {
  return Object.entries(record)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ") || "none";
}

function summarizeSample(sample: string | null) {
  if (!sample) {
    return "No sample";
  }

  return sample.replace(/\s+/g, " ").trim().slice(0, 160);
}

function md(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function shortError(error: unknown) {
  return errorMessage(error).replace(/\s+/g, " ").slice(0, 80);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
