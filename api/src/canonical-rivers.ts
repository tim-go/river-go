import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import type { Member } from "./members.js";

export type SourceCandidatePoiStatus =
  | "review_needed"
  | "confirmed"
  | "rejected"
  | "merged";

export interface ApiCanonicalRiverSummary {
  id: string;
  canonicalName: string;
  displayName: string;
  country: string;
  region: string;
  riverType: string;
  nation: string | null;
  discipline: string | null;
  grade: string | null;
  run: string | null;
  summary: string;
  centre: [number, number];
  bbox: [number, number, number, number];
  sourceConfidence: string;
  curationStatus: string;
  sectionCount: number;
  candidatePoiCount: number;
  reviewNeededCandidatePoiCount: number;
  updatedAt: string;
}

export interface ApiCanonicalRiverDetail extends ApiCanonicalRiverSummary {
  sectionLinks: ApiCanonicalRiverSectionLink[];
  candidatePoiCountsByType: Record<string, number>;
}

export interface ApiCanonicalRiverSectionLink {
  sectionId: string;
  routeSource: string;
  relationshipType: string;
  status: string;
  confidence: string;
}

export interface ApiSourceCandidatePoi {
  id: string;
  riverId: string | null;
  riverDisplayName: string | null;
  source: string;
  sourceId: string;
  sourceVersion: string;
  sourceUrl: string;
  licence: string;
  candidateType: string;
  title: string;
  status: SourceCandidatePoiStatus;
  location: [number, number] | null;
  rawProperties: Record<string, unknown>;
  sourceMetadata: Record<string, unknown>;
  updatedAt: string;
}

interface CanonicalRiverRow {
  id: string;
  canonical_name: string;
  display_name: string;
  country: string;
  region: string;
  river_type: string;
  summary: string;
  payload: Record<string, unknown> | null;
  centre_geojson: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  bbox_min_lng: string | number;
  bbox_min_lat: string | number;
  bbox_max_lng: string | number;
  bbox_max_lat: string | number;
  source_confidence: string;
  curation_status: string;
  section_count: string;
  candidate_poi_count: string;
  review_needed_candidate_poi_count: string;
  updated_at: Date;
}

interface SectionLinkRow {
  section_id: string;
  route_source: string;
  relationship_type: string;
  status: string;
  confidence: string;
}

interface CandidateCountRow {
  candidate_type: string;
  count: string;
}

interface SourceCandidatePoiRow {
  id: string;
  river_id: string | null;
  river_display_name: string | null;
  source: string;
  source_id: string;
  source_version: string;
  source_url: string;
  licence: string;
  candidate_type: string;
  title: string;
  status: SourceCandidatePoiStatus;
  geometry_geojson: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  raw_properties: Record<string, unknown> | null;
  source_metadata: Record<string, unknown> | null;
  updated_at: Date;
}

const candidateStatuses = new Set<SourceCandidatePoiStatus>([
  "review_needed",
  "confirmed",
  "rejected",
  "merged",
]);

export async function listCanonicalRivers(
  client: PoolClient | typeof pool = pool,
): Promise<ApiCanonicalRiverSummary[]> {
  const result = await client.query<CanonicalRiverRow>(
    `${canonicalRiverSelectSql()}
    ORDER BY cr.display_name ASC`,
  );

  return result.rows.map(mapCanonicalRiverRow);
}

export async function getCanonicalRiver(
  riverId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiCanonicalRiverDetail> {
  const riverResult = await client.query<CanonicalRiverRow>(
    `${canonicalRiverSelectSql()}
    WHERE cr.id = $1`,
    [riverId],
  );

  if (!riverResult.rowCount) {
    throw new HttpError(404, "River not found.");
  }

  const sectionLinks = await client.query<SectionLinkRow>(
    `SELECT
      section_id,
      route_source,
      relationship_type,
      status,
      confidence
    FROM canonical_river_section_links
    WHERE river_id = $1
    ORDER BY route_source ASC, section_id ASC`,
    [riverId],
  );
  const candidateCounts = await client.query<CandidateCountRow>(
    `SELECT candidate_type, count(*)::text AS count
    FROM source_candidate_pois
    WHERE river_id = $1
    GROUP BY candidate_type
    ORDER BY candidate_type ASC`,
    [riverId],
  );

  return {
    ...mapCanonicalRiverRow(riverResult.rows[0]),
    sectionLinks: sectionLinks.rows.map((row) => ({
      sectionId: row.section_id,
      routeSource: row.route_source,
      relationshipType: row.relationship_type,
      status: row.status,
      confidence: row.confidence,
    })),
    candidatePoiCountsByType: Object.fromEntries(
      candidateCounts.rows.map((row) => [
        row.candidate_type,
        Number.parseInt(row.count, 10),
      ]),
    ),
  };
}

export async function listSourceCandidatePois(
  input: {
    riverId: string | null;
    status: SourceCandidatePoiStatus | null;
    limit: number | null;
  },
  client: PoolClient | typeof pool = pool,
): Promise<ApiSourceCandidatePoi[]> {
  const values: unknown[] = [];
  const where: string[] = [];

  if (input.riverId) {
    values.push(input.riverId);
    where.push(`scp.river_id = $${values.length}`);
  }

  if (input.status) {
    values.push(input.status);
    where.push(`scp.status = $${values.length}`);
  }

  values.push(Math.max(1, Math.min(input.limit ?? 100, 250)));

  const result = await client.query<SourceCandidatePoiRow>(
    `SELECT
      scp.id,
      scp.river_id,
      cr.display_name AS river_display_name,
      scp.source,
      scp.source_id,
      scp.source_version,
      scp.source_url,
      scp.licence,
      scp.candidate_type,
      scp.title,
      scp.status,
      ST_AsGeoJSON(scp.geometry)::json AS geometry_geojson,
      scp.raw_properties,
      scp.source_metadata,
      scp.updated_at
    FROM source_candidate_pois scp
    LEFT JOIN canonical_rivers cr ON cr.id = scp.river_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY cr.display_name ASC NULLS LAST, scp.candidate_type ASC, scp.title ASC
    LIMIT $${values.length}`,
    values,
  );

  return result.rows.map(mapSourceCandidatePoiRow);
}

export async function updateSourceCandidatePoiStatus(
  candidateId: string,
  status: SourceCandidatePoiStatus,
  actor: Member,
  note: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiSourceCandidatePoi> {
  if (client === pool) {
    const pooledClient = await pool.connect();

    try {
      await pooledClient.query("BEGIN");
      const candidate = await updateSourceCandidatePoiStatus(
        candidateId,
        status,
        actor,
        note,
        pooledClient,
      );
      await pooledClient.query("COMMIT");
      return candidate;
    } catch (error) {
      await pooledClient.query("ROLLBACK");
      throw error;
    } finally {
      pooledClient.release();
    }
  }

  const transactionClient = client as PoolClient;
  const promotedMapPoiId =
    status === "confirmed"
      ? await promoteSourceCandidateToMapPoi(candidateId, actor, transactionClient)
      : null;

  const result = await transactionClient.query<SourceCandidatePoiRow>(
    `UPDATE source_candidate_pois scp
    SET status = $2,
      source_metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(scp.source_metadata, '{}'::jsonb),
            '{review}',
            jsonb_build_object(
              'status', $2::text,
              'reviewedBy', $3::text,
              'reviewedAt', now(),
              'note', $4::text
            ),
            true
          ),
          '{promotion}',
          CASE
            WHEN $5::text IS NULL THEN COALESCE(scp.source_metadata -> 'promotion', '{}'::jsonb)
            ELSE jsonb_build_object(
              'mapPoiId', $5::text,
              'promotedBy', $3::text,
              'promotedAt', now()
            )
          END,
          true
        ),
        '{warning}',
        to_jsonb('Source-derived candidate; review status is not paddling advice.'::text),
        true
      ),
      updated_at = now(),
      revision = scp.revision + 1
    FROM canonical_rivers cr
    WHERE scp.id = $1
      AND cr.id = scp.river_id
    RETURNING
      scp.id,
      scp.river_id,
      cr.display_name AS river_display_name,
      scp.source,
      scp.source_id,
      scp.source_version,
      scp.source_url,
      scp.licence,
      scp.candidate_type,
      scp.title,
      scp.status,
      ST_AsGeoJSON(scp.geometry)::json AS geometry_geojson,
      scp.raw_properties,
      scp.source_metadata,
      scp.updated_at`,
    [candidateId, status, actor.id, note, promotedMapPoiId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Source candidate POI not found.");
  }

  return mapSourceCandidatePoiRow(result.rows[0]);
}

async function promoteSourceCandidateToMapPoi(
  candidateId: string,
  actor: Pick<Member, "id">,
  client: PoolClient,
): Promise<string> {
  const candidateResult = await client.query<
    SourceCandidatePoiRow & {
      longitude: string | number;
      latitude: string | number;
    }
  >(
    `SELECT
      scp.id,
      scp.river_id,
      cr.display_name AS river_display_name,
      scp.source,
      scp.source_id,
      scp.source_version,
      scp.source_url,
      scp.licence,
      scp.candidate_type,
      scp.title,
      scp.status,
      ST_AsGeoJSON(scp.geometry)::json AS geometry_geojson,
      scp.raw_properties,
      scp.source_metadata,
      scp.updated_at,
      ST_X(ST_PointOnSurface(scp.geometry)) AS longitude,
      ST_Y(ST_PointOnSurface(scp.geometry)) AS latitude
    FROM source_candidate_pois scp
    LEFT JOIN canonical_rivers cr ON cr.id = scp.river_id
    WHERE scp.id = $1
    FOR UPDATE OF scp`,
    [candidateId],
  );

  if (!candidateResult.rowCount) {
    throw new HttpError(404, "Source candidate POI not found.");
  }

  const candidate = candidateResult.rows[0];

  const sectionsResult = await client.query<{ section_id: string }>(
    `SELECT section_id
     FROM canonical_river_section_links
     WHERE river_id = $1 AND status = 'active'
     ORDER BY section_id ASC`,
    [candidate.river_id],
  );
  const sectionIds = sectionsResult.rows.map((row) => row.section_id);

  if (!sectionIds.length) {
    throw new HttpError(
      409,
      "Cannot promote source candidate without a linked river section.",
    );
  }

  const sectionId =
    sectionIds.length === 1
      ? sectionIds[0]
      : nearestSectionId(sectionIds, {
          latitude: Number(candidate.latitude),
          longitude: Number(candidate.longitude),
        });

  const mapPoiId = `source-candidate:${candidate.id}`;
  const mapPoiKind = sourceCandidateMapPoiKind(candidate.candidate_type);
  const sourceLabel = `${candidate.source} ${candidate.source_version}`.trim();
  const payload = {
    sourceCandidatePoiId: candidate.id,
    sourceFeatureId:
      typeof candidate.source_metadata?.sourceFeatureId === "string"
        ? candidate.source_metadata.sourceFeatureId
        : null,
    candidateType: candidate.candidate_type,
    riverId: candidate.river_id,
    riverDisplayName: candidate.river_display_name,
    rawProperties: candidate.raw_properties ?? {},
    promotedBy: actor.id,
  };

  await client.query(
    `INSERT INTO map_pois (
      id,
      section_id,
      kind,
      geometry,
      title,
      subtitle,
      summary,
      source_kind,
      source_label,
      source_confidence,
      source_updated_at,
      source_url,
      verification_status,
      payload
    ) VALUES (
      $1,
      $2,
      $3,
      ST_SetSRID(ST_MakePoint($4, $5), 4326),
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      'needs-confirmation',
      $14::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      section_id = EXCLUDED.section_id,
      kind = EXCLUDED.kind,
      geometry = EXCLUDED.geometry,
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      summary = EXCLUDED.summary,
      source_kind = EXCLUDED.source_kind,
      source_label = EXCLUDED.source_label,
      source_confidence = EXCLUDED.source_confidence,
      source_updated_at = EXCLUDED.source_updated_at,
      source_url = EXCLUDED.source_url,
      verification_status = 'needs-confirmation',
      payload = EXCLUDED.payload,
      updated_at = now(),
      revision = map_pois.revision + 1`,
    [
      mapPoiId,
      sectionId,
      mapPoiKind,
      Number(candidate.longitude),
      Number(candidate.latitude),
      candidate.title,
      sourceCandidateSubtitle(candidate.candidate_type),
      sourceCandidateSummary(candidate),
      candidate.source,
      sourceLabel || candidate.source,
      "source-confirmed",
      candidate.source_version || null,
      candidate.source_url || null,
      JSON.stringify(payload),
    ],
  );

  return mapPoiId;
}

function isExcludedPilotCandidate(row: {
  candidate_type: string;
  title: string | null;
  raw_properties: Record<string, unknown> | null;
}): boolean {
  if (
    row.candidate_type === "waterway=turning_point" ||
    row.candidate_type === "waterway=sanitary_dump_station"
  ) {
    return true;
  }

  const name = (
    readRawPropertyString(row.raw_properties, "name") ||
    row.title ||
    ""
  ).toLowerCase();

  return name.includes("flood alleviation");
}

async function resolvePilotPromoter(
  client: PoolClient,
): Promise<Pick<Member, "id">> {
  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM members
     ORDER BY (role = 'ADMIN') DESC, (role = 'CONTRIB_MODERATOR') DESC, created_at ASC
     LIMIT 1`,
  );

  if (!result.rowCount) {
    throw new Error("No member available to attribute pilot promotions to.");
  }

  return { id: result.rows[0].id };
}

// Bulk-approve + promote every source candidate (review_needed or already
// confirmed) with the corrected kind + nearest-section logic, rejecting the
// non-paddling types (turning points, sanitary dump stations) and named
// flood-alleviation structures. Promoted POIs publish as needs-confirmation.
// Re-runnable; pilot data is disposable.
export async function repromotePilotCandidates(): Promise<{
  promoted: number;
  excluded: number;
}> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const promoter = await resolvePilotPromoter(client);
    const candidates = await client.query<{
      id: string;
      candidate_type: string;
      title: string | null;
      raw_properties: Record<string, unknown> | null;
    }>(
      `SELECT id, candidate_type, title, raw_properties
       FROM source_candidate_pois
       WHERE status IN ('review_needed', 'confirmed')
       ORDER BY id ASC`,
    );

    let promoted = 0;
    let excluded = 0;

    for (const candidate of candidates.rows) {
      if (isExcludedPilotCandidate(candidate)) {
        await client.query(
          `UPDATE source_candidate_pois
           SET status = 'rejected', updated_at = now(), revision = revision + 1
           WHERE id = $1`,
          [candidate.id],
        );
        await client.query(`DELETE FROM map_pois WHERE id = $1`, [
          `source-candidate:${candidate.id}`,
        ]);
        excluded += 1;
        continue;
      }

      await client.query(
        `UPDATE source_candidate_pois
         SET status = 'confirmed', updated_at = now(), revision = revision + 1
         WHERE id = $1 AND status <> 'confirmed'`,
        [candidate.id],
      );
      await promoteSourceCandidateToMapPoi(candidate.id, promoter, client);
      promoted += 1;
    }

    await client.query("COMMIT");
    return { promoted, excluded };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// OSM candidate types are stored as "waterway=<value>" (e.g. "waterway=dam") or
// bare tokens ("rapids", "whitewater-section"). Normalise to the value so the
// hazard match actually fires — previously the exact-string checks never matched
// the "waterway=" form, so every structure (weirs, dams, waterfalls) was filed as
// a generic feature.
const HAZARD_WATERWAY_VALUES = new Set([
  "weir",
  "dam",
  "waterfall",
  "sluice_gate",
  "sluice",
  "lock_gate",
  "lock",
]);

function sourceCandidateMapPoiKind(candidateType: string) {
  if (candidateType === "access_hint") {
    return "access";
  }

  const value = candidateType.startsWith("waterway=")
    ? candidateType.slice("waterway=".length)
    : candidateType;

  if (HAZARD_WATERWAY_VALUES.has(value)) {
    return "hazard";
  }

  return "feature";
}

// There is no per-section geometry in the data model yet, so multi-section pilot
// rivers anchor each section to a representative midpoint of the named stretch and
// a candidate is assigned to the nearest one. Single-section rivers bypass this.
// Approximate — POIs still render at their own true geometry on the map.
const SECTION_ANCHORS: Record<string, { lat: number; lng: number }> = {
  "wye-glasbury-hay": { lat: 52.07, lng: -3.153 },
  "wye-hay-whitney": { lat: 52.095, lng: -3.072 },
  "wye-whitney-bredwardine": { lat: 52.112, lng: -2.992 },
  "wye-hoarwithy-ross": { lat: 51.942, lng: -2.602 },
  "wye-ross-kerne": { lat: 51.893, lng: -2.6 },
  "wye-kerne-symonds-yat": { lat: 51.856, lng: -2.628 },
  "wye-symonds-yat-monmouth": { lat: 51.826, lng: -2.677 },
  "tryweryn-dam-centre": { lat: 52.935, lng: -3.624 },
  "tryweryn-centre-bala": { lat: 52.914, lng: -3.6 },
};

function nearestSectionId(
  sectionIds: string[],
  candidate: { latitude: number; longitude: number },
): string {
  let best = sectionIds[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const sectionId of sectionIds) {
    const anchor = SECTION_ANCHORS[sectionId];
    if (!anchor) {
      continue;
    }
    const distance =
      (anchor.lat - candidate.latitude) ** 2 +
      (anchor.lng - candidate.longitude) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sectionId;
    }
  }
  return best;
}

function sourceCandidateSubtitle(candidateType: string) {
  return candidateType.replace(/_/g, " ");
}

function sourceCandidateSummary(candidate: SourceCandidatePoiRow) {
  const grade = readRawPropertyString(candidate.raw_properties, "rapids") ||
    readRawPropertyString(candidate.raw_properties, "whitewater:section_grade");
  const operator = readRawPropertyString(candidate.raw_properties, "operator");
  const parts = [
    `Source-derived ${sourceCandidateSubtitle(candidate.candidate_type)} candidate promoted by moderation.`,
    grade ? `Grade/tag: ${grade}.` : "",
    operator ? `Operator: ${operator}.` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function readRawPropertyString(
  properties: Record<string, unknown> | null,
  key: string,
): string {
  const value = properties?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function isSourceCandidatePoiStatus(
  value: unknown,
): value is SourceCandidatePoiStatus {
  return typeof value === "string" && candidateStatuses.has(value as SourceCandidatePoiStatus);
}

function canonicalRiverSelectSql() {
  return `SELECT
    cr.id,
    cr.canonical_name,
    cr.display_name,
    cr.country,
    cr.region,
    cr.river_type,
    cr.summary,
    cr.payload,
    ST_AsGeoJSON(cr.overview_location)::json AS centre_geojson,
    ST_XMin(cr.bbox::box3d) AS bbox_min_lng,
    ST_YMin(cr.bbox::box3d) AS bbox_min_lat,
    ST_XMax(cr.bbox::box3d) AS bbox_max_lng,
    ST_YMax(cr.bbox::box3d) AS bbox_max_lat,
    cr.source_confidence,
    cr.curation_status,
    cr.updated_at,
    COALESCE(section_counts.count, 0)::text AS section_count,
    COALESCE(candidate_counts.count, 0)::text AS candidate_poi_count,
    COALESCE(review_needed_counts.count, 0)::text AS review_needed_candidate_poi_count
  FROM canonical_rivers cr
  LEFT JOIN (
    SELECT river_id, count(*) AS count
    FROM canonical_river_section_links
    WHERE status = 'active'
    GROUP BY river_id
  ) section_counts ON section_counts.river_id = cr.id
  LEFT JOIN (
    SELECT river_id, count(*) AS count
    FROM source_candidate_pois
    GROUP BY river_id
  ) candidate_counts ON candidate_counts.river_id = cr.id
  LEFT JOIN (
    SELECT river_id, count(*) AS count
    FROM source_candidate_pois
    WHERE status = 'review_needed'
    GROUP BY river_id
  ) review_needed_counts ON review_needed_counts.river_id = cr.id`;
}

function mapCanonicalRiverRow(row: CanonicalRiverRow): ApiCanonicalRiverSummary {
  const coordinates = row.centre_geojson?.coordinates;
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const payloadString = (key: string) =>
    typeof payload[key] === "string" ? (payload[key] as string) : null;

  return {
    id: row.id,
    canonicalName: row.canonical_name,
    displayName: row.display_name,
    country: row.country,
    region: row.region,
    riverType: row.river_type,
    nation: payloadString("nation"),
    discipline: payloadString("discipline"),
    grade: payloadString("grade"),
    run: payloadString("run"),
    summary: row.summary,
    centre: coordinates ? [coordinates[1], coordinates[0]] : [0, 0],
    bbox: [
      Number(row.bbox_min_lng),
      Number(row.bbox_min_lat),
      Number(row.bbox_max_lng),
      Number(row.bbox_max_lat),
    ],
    sourceConfidence: row.source_confidence,
    curationStatus: row.curation_status,
    sectionCount: Number.parseInt(row.section_count, 10),
    candidatePoiCount: Number.parseInt(row.candidate_poi_count, 10),
    reviewNeededCandidatePoiCount: Number.parseInt(
      row.review_needed_candidate_poi_count,
      10,
    ),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapSourceCandidatePoiRow(
  row: SourceCandidatePoiRow,
): ApiSourceCandidatePoi {
  const coordinates = row.geometry_geojson?.coordinates;

  return {
    id: row.id,
    riverId: row.river_id,
    riverDisplayName: row.river_display_name,
    source: row.source,
    sourceId: row.source_id,
    sourceVersion: row.source_version,
    sourceUrl: row.source_url,
    licence: row.licence,
    candidateType: row.candidate_type,
    title: row.title,
    status: row.status,
    location: coordinates ? [coordinates[1], coordinates[0]] : null,
    rawProperties: row.raw_properties ?? {},
    sourceMetadata: row.source_metadata ?? {},
    updatedAt: row.updated_at.toISOString(),
  };
}
