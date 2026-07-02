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
  nation?: string;
  discipline?: "whitewater" | "touring" | "both";
  grade?: string;
  run?: string;
}

interface Options {
  dryRun: boolean;
  allowPartialCandidates: boolean;
  sourceVersion: string;
  riverIds: string[] | null;
  catalogue: "pilots" | "paddling" | "all";
}

const SEED_THROTTLE_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    nation: "Wales",
    discipline: "both",
    grade: "II",
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
    nation: "Wales",
    discipline: "whitewater",
    grade: "III-IV",
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
    nation: "Wales",
    discipline: "whitewater",
    grade: "III-IV",
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
    nation: "England",
    discipline: "whitewater",
    grade: "III-IV",
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
    nation: "Scotland",
    discipline: "whitewater",
    grade: "II-III",
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

function paddlingRiver(
  id: string,
  canonicalName: string,
  nation: string,
  region: string,
  centre: [number, number],
  discipline: "whitewater" | "touring" | "both",
  grade: string,
  run: string,
): PilotRiver {
  const [lat, lng] = centre;
  const disciplineLabel =
    discipline === "whitewater"
      ? "whitewater"
      : discipline === "touring"
        ? "canoe touring"
        : "whitewater & touring";
  return {
    id,
    canonicalName,
    displayName: canonicalName,
    country: "GB",
    region,
    riverType: "river",
    summary: `${run} — grade ${grade} (${disciplineLabel}). Source-derived paddling-river record; review sections, levels, and POIs before treating it as paddling guidance.`,
    centre,
    bbox: {
      south: lat - 0.05,
      west: lng - 0.07,
      north: lat + 0.05,
      east: lng + 0.07,
    },
    sectionIds: [`${id}-main`],
    nation,
    discipline,
    grade,
    run,
  };
}

// Curated UK whitewater & canoe rivers (the paddling class). Seeded via
// `--catalogue=paddling`; bbox is derived from the run-centre and each river
// gets a single whole-river section. Run-centres are approximate; OSM POIs and
// any level are source-derived and stay needs-confirmation.
const PADDLING_RIVERS: PilotRiver[] = [
  // --- Scotland ---
  paddlingRiver("river-etive", "River Etive", "Scotland", "Glen Etive / West Highlands", [56.628, -4.93], "whitewater", "IV-V", "Triple Falls to Dalness"),
  paddlingRiver("river-orchy", "River Orchy", "Scotland", "Glen Orchy / West Highlands", [56.505, -4.84], "whitewater", "III-IV", "Bridge of Orchy to Falls of Orchy"),
  paddlingRiver("river-coe", "River Coe", "Scotland", "Glen Coe / West Highlands", [56.662, -5.05], "whitewater", "IV-V", "Meeting of Three Waters to Glencoe"),
  paddlingRiver("river-roy", "River Roy", "Scotland", "Glen Roy / Lochaber", [56.915, -4.83], "whitewater", "IV", "The Roy Gorge"),
  paddlingRiver("river-spean", "River Spean", "Scotland", "Lochaber", [56.89, -4.92], "whitewater", "III-IV", "Spean Gorge, Roybridge to Spean Bridge"),
  paddlingRiver("river-nevis", "River Nevis", "Scotland", "Glen Nevis / Lochaber", [56.772, -5.0], "whitewater", "IV-V", "Steall Gorge to Polldubh"),
  paddlingRiver("river-garry-invergarry", "River Garry (Invergarry)", "Scotland", "Great Glen", [57.065, -4.8], "whitewater", "III-IV", "Garry Dam to White Bridge"),
  paddlingRiver("river-moriston", "River Moriston", "Scotland", "Glenmoriston / Great Glen", [57.21, -4.73], "whitewater", "IV", "Dundreggan Dam to Invermoriston"),
  paddlingRiver("river-affric", "River Affric", "Scotland", "Glen Affric", [57.275, -4.92], "whitewater", "V", "Dog Falls to Fasnakyle"),
  paddlingRiver("river-conon", "River Conon", "Scotland", "Easter Ross", [57.58, -4.7], "whitewater", "IV-V", "Luichart Dam falls section"),
  paddlingRiver("river-carron-wester-ross", "River Carron (Wester Ross)", "Scotland", "Strathcarron", [57.435, -5.42], "whitewater", "IV-V", "Achnashellach to New Kelso"),
  paddlingRiver("river-findhorn", "River Findhorn", "Scotland", "Morayshire", [57.505, -3.67], "whitewater", "IV", "Randolph's Leap gorge"),
  paddlingRiver("river-spey", "River Spey", "Scotland", "Cairngorms to Moray", [57.2, -3.75], "touring", "I-II", "Aviemore to Spey Bay"),
  paddlingRiver("river-feshie", "River Feshie", "Scotland", "Glen Feshie / Cairngorms", [57.06, -3.88], "whitewater", "III", "Achlean to Feshiebridge"),
  paddlingRiver("river-dee-aberdeenshire", "River Dee (Aberdeenshire)", "Scotland", "Royal Deeside", [57.02, -3.23], "both", "II-III", "Braemar to Ballater"),
  paddlingRiver("river-tummel", "River Tummel", "Scotland", "Perthshire", [56.705, -3.8], "whitewater", "III-IV", "Below Cluny Dam to Linn of Tummel"),
  paddlingRiver("river-lyon", "River Lyon", "Scotland", "Glen Lyon", [56.605, -4.2], "whitewater", "IV-V", "Bridge of Balgie down"),
  paddlingRiver("river-ericht", "River Ericht", "Scotland", "Blairgowrie", [56.605, -3.33], "whitewater", "III-IV", "Craighall Gorge to Blairgowrie"),
  paddlingRiver("river-awe", "River Awe", "Scotland", "Argyll", [56.415, -5.15], "whitewater", "III-IV", "Barrage to Bridge of Awe"),
  paddlingRiver("river-tweed", "River Tweed", "Scotland", "Scottish Borders", [55.6, -2.9], "touring", "I-II", "Peebles to Melrose"),
  paddlingRiver("river-garry-perthshire", "River Garry (Perthshire)", "Scotland", "Killiecrankie", [56.74, -3.77], "whitewater", "III-IV", "Pass of Killiecrankie"),
  // --- Wales ---
  paddlingRiver("river-conwy", "Afon Conwy", "Wales", "Snowdonia / Eryri", [53.084, -3.8], "whitewater", "IV-V", "Conwy Falls to Fairy Glen"),
  paddlingRiver("river-llugwy", "Afon Llugwy", "Wales", "Snowdonia / Eryri", [53.093, -3.83], "whitewater", "III-IV", "Pont Cyfyng to Betws-y-Coed"),
  paddlingRiver("river-lledr", "Afon Lledr", "Wales", "Snowdonia / Eryri", [53.07, -3.81], "whitewater", "III-IV", "Pont-y-Pant to Beaver Pool"),
  paddlingRiver("river-glaslyn", "Afon Glaslyn", "Wales", "Snowdonia / Eryri", [53.001, -4.098], "whitewater", "IV", "Aberglaslyn Gorge"),
  paddlingRiver("river-colwyn", "Afon Colwyn", "Wales", "Snowdonia / Eryri", [53.015, -4.11], "whitewater", "IV+", "Above Beddgelert to the Glaslyn"),
  paddlingRiver("river-ogwen", "Afon Ogwen", "Wales", "Snowdonia / Eryri", [53.185, -4.06], "whitewater", "IV", "Bethesda / Fisherman's Gorge"),
  paddlingRiver("river-dwyfor", "Afon Dwyfor", "Wales", "Snowdonia / Llyn fringe", [52.93, -4.27], "whitewater", "III+", "B4411 to Llanystumdwy"),
  paddlingRiver("river-seiont", "Afon Seiont", "Wales", "Snowdonia / Eryri", [53.13, -4.22], "whitewater", "III", "Llyn Padarn to the sea"),
  paddlingRiver("river-eden-coed-y-brenin", "Afon Eden", "Wales", "Coed-y-Brenin", [52.835, -3.89], "whitewater", "III-IV", "Through Coed-y-Brenin to the Mawddach"),
  paddlingRiver("river-mawddach", "Afon Mawddach", "Wales", "Coed-y-Brenin", [52.85, -3.87], "whitewater", "III-IV", "Pont Aber-Geirw to the Eden confluence"),
  paddlingRiver("river-dyfi", "Afon Dyfi", "Wales", "Mid-Wales", [52.69, -3.66], "both", "II-III", "Dinas Mawddwy to the A470 bridge"),
  paddlingRiver("river-teifi", "Afon Teifi", "Wales", "West Wales", [52.03, -4.33], "both", "II-III", "Llandysul to Cenarth Falls"),
  paddlingRiver("river-usk", "River Usk / Afon Wysg", "Wales", "Brecon Beacons / Bannau", [51.945, -3.39], "both", "II-III", "Sennybridge to Talybont"),
  paddlingRiver("river-irfon", "Afon Irfon", "Wales", "Mid-Wales", [52.11, -3.63], "whitewater", "III-IV", "Cammarch gorge to Llanwrtyd Wells"),
  paddlingRiver("river-tywi", "Afon Tywi / Towy", "Wales", "Mid / West Wales", [52.05, -3.78], "both", "III", "Below Llyn Brianne to Dolauhirion"),
  paddlingRiver("river-tawe", "Afon Tawe", "Wales", "South Wales", [51.835, -3.71], "whitewater", "IV", "Glyntawe to Abercrave"),
  paddlingRiver("river-mellte", "Afon Mellte", "Wales", "Bannau / Waterfall Country", [51.78, -3.57], "whitewater", "IV", "Porth-yr-Ogof to Pontneddfechan"),
  // --- England ---
  paddlingRiver("river-greta-cumbria", "River Greta", "England", "Lake District / Cumbria", [54.6168, -3.086], "whitewater", "III", "Threlkeld to Keswick"),
  paddlingRiver("river-kent", "River Kent", "England", "Lake District / Cumbria", [54.287, -2.76], "whitewater", "III-IV", "Kendal to Force Falls"),
  paddlingRiver("river-leven", "River Leven", "England", "Lake District / Cumbria", [54.27, -3.015], "whitewater", "IV-V", "Newby Bridge to Backbarrow"),
  paddlingRiver("river-crake", "River Crake", "England", "Lake District / Cumbria", [54.284, -3.079], "both", "II-III", "Coniston to Spark Bridge"),
  paddlingRiver("river-duddon", "River Duddon", "England", "Lake District / Cumbria", [54.33, -3.225], "whitewater", "III-IV", "Seathwaite to Ulpha"),
  paddlingRiver("river-esk-eskdale", "River Esk (Eskdale)", "England", "Lake District / Cumbria", [54.396, -3.27], "whitewater", "II-III", "Boot, Eskdale down"),
  paddlingRiver("river-brathay", "River Brathay", "England", "Lake District / Cumbria", [54.418, -2.992], "both", "II-III", "Elterwater to Clappersgate"),
  paddlingRiver("river-eden-cumbria", "River Eden (Cumbria)", "England", "Eden Valley / Cumbria", [54.8, -2.76], "both", "II-III", "Lazonby to Armathwaite"),
  paddlingRiver("river-lune", "River Lune", "England", "Cumbria / Pennines", [54.35, -2.59], "whitewater", "III-IV", "Tebay to the Rawthey confluence"),
  paddlingRiver("river-rawthey", "River Rawthey", "England", "Cumbria / Dales", [54.345, -2.52], "whitewater", "III-IV", "Rawthey Bridge to the Lune"),
  paddlingRiver("river-tees-upper", "River Tees (Upper)", "England", "North Pennines", [54.652, -2.173], "whitewater", "IV", "High Force to Low Force"),
  paddlingRiver("river-swale", "River Swale", "England", "Yorkshire Dales", [54.385, -1.69], "both", "II-III", "Richmond to Catterick Bridge"),
  paddlingRiver("river-ure", "River Ure", "England", "Wensleydale", [54.288, -1.97], "whitewater", "III-IV", "Aysgarth Falls to Wensley"),
  paddlingRiver("river-wharfe", "River Wharfe", "England", "Yorkshire Dales", [54.15, -2.03], "whitewater", "II-IV", "Kettlewell to Linton Falls"),
  paddlingRiver("river-washburn", "River Washburn", "England", "Washburn Valley / Yorkshire", [53.987, -1.705], "whitewater", "II-III", "Thruscross dam-release course"),
  paddlingRiver("river-north-tyne", "North Tyne", "England", "Northumberland", [55.17, -2.37], "both", "II-III", "Falstone to Bellingham"),
  paddlingRiver("river-tavy", "River Tavy", "England", "Dartmoor", [50.565, -4.13], "whitewater", "III-IV", "Hill Bridge to Tavistock"),
  paddlingRiver("river-barle", "River Barle", "England", "Exmoor", [51.07, -3.63], "touring", "II-III", "Tarr Steps to Dulverton"),
  paddlingRiver("river-east-lyn", "East Lyn", "England", "Exmoor", [51.22, -3.82], "whitewater", "IV-V", "Watersmeet to Lynmouth"),
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
  const catalogue =
    options.catalogue === "paddling"
      ? PADDLING_RIVERS
      : options.catalogue === "all"
        ? [...PILOT_RIVERS, ...PADDLING_RIVERS]
        : PILOT_RIVERS;
  const pilots = catalogue.filter(
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

    await sleep(SEED_THROTTLE_MS);
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
      // Fixture section links are retired (see
      // docs/development/plan-community-sections.md): this seed never writes
      // canonical_river_section_links rows any more. river.sectionIds stays on
      // the pilot-river config only as descriptive metadata for the OSM-candidate
      // report below.

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
        paddlingClass: "whitewater-canoe",
        nation: river.nation ?? null,
        discipline: river.discipline ?? null,
        grade: river.grade ?? null,
        run: river.run ?? null,
        osOpenRivers: "not-used",
        sourcePolicy:
          "Curated paddling-river identity. OSM candidates remain review-needed until approved.",
      }),
    ],
  );
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
    -- Conflict on the derived primary key (id = osm:<sourceId>) so an OSM feature
    -- already owned by another river (e.g. a boundary feature shared with an
    -- existing pilot) upserts instead of colliding on the PK. river_id and status
    -- are intentionally NOT overwritten, so an already-claimed/approved feature
    -- keeps its owner and moderation state.
    ON CONFLICT (id) DO UPDATE SET
      source_feature_id = EXCLUDED.source_feature_id,
      source_url = EXCLUDED.source_url,
      licence = EXCLUDED.licence,
      candidate_type = EXCLUDED.candidate_type,
      title = EXCLUDED.title,
      source_version = EXCLUDED.source_version,
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
  const catalogue = valueFor("--catalogue");

  return {
    dryRun: args.includes("--dry-run"),
    allowPartialCandidates: args.includes("--allow-partial-candidates"),
    sourceVersion:
      valueFor("--source-version") ?? `overpass-candidates-${new Date().toISOString().slice(0, 10)}`,
    riverIds: riverIds ? riverIds.split(",").map((id) => id.trim()).filter(Boolean) : null,
    catalogue:
      catalogue === "paddling" || catalogue === "all" ? catalogue : "pilots",
  };
}

main()
  .then(() => closePool())
  .catch(async (error: unknown) => {
    console.error(error);
    await closePool();
    process.exit(1);
  });
