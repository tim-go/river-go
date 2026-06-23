import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import type { Member } from "./members.js";

export type MapPoiKind = "access" | "hazard" | "feature" | "gauge";
export type MapPoiVerificationStatus =
  | "needs-confirmation"
  | "confirmed"
  | "needs-correction"
  | "resolved";
export type MapPoiReviewDecision = "confirm" | "correction";
export type MapPoiReviewAction = "add" | "remove";

export interface ApiMapPoi {
  id: string;
  sectionId: string;
  kind: MapPoiKind;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  title: string;
  subtitle: string;
  summary: string;
  source: {
    kind: string | null;
    label: string | null;
    confidence: string | null;
    updatedAt: string | null;
    url: string | null;
  };
  verificationStatus: MapPoiVerificationStatus;
  confirmations: number;
  corrections: number;
  viewerReview?: {
    confirmed: boolean;
    suggestedCorrection: boolean;
    correctionNote: string | null;
  };
  payload: Record<string, unknown>;
  revision: number;
  updatedAt: string;
}

export interface ApiMapPoiCorrectionReview {
  id: string;
  poi: ApiMapPoi;
  note: string;
  createdAt: string;
  reviewer: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
}

export interface MapPoiSeedInput {
  id: string;
  sectionId: string;
  kind: MapPoiKind;
  location: [number, number];
  title: string;
  subtitle: string;
  summary: string;
  source?: {
    kind?: string;
    label?: string;
    confidence?: string;
    updatedAt?: string;
    url?: string;
  };
  verificationStatus?: MapPoiVerificationStatus;
  payload?: Record<string, unknown>;
}

interface MapPoiRow {
  id: string;
  section_id: string;
  kind: MapPoiKind;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  title: string;
  subtitle: string;
  summary: string;
  source_kind: string | null;
  source_label: string | null;
  source_confidence: string | null;
  source_updated_at: string | null;
  source_url: string | null;
  verification_status: MapPoiVerificationStatus;
  confirmations: string;
  corrections: string;
  viewer_confirmed?: boolean | null;
  viewer_suggested_correction?: boolean | null;
  viewer_correction_note?: string | null;
  payload: Record<string, unknown>;
  revision: string;
  updated_at: Date;
}

interface MapPoiCorrectionReviewRow extends MapPoiRow {
  review_id: string;
  review_note: string | null;
  review_created_at: Date;
  reviewer_id: string | null;
  reviewer_display_name: string | null;
  reviewer_email: string | null;
  reviewer_trust_level: string | null;
}

export async function listMapPoisForSection(
  sectionId: string,
  viewerMemberId?: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoi[]> {
  const result = await client.query<MapPoiRow>(
    `SELECT
      ${locationBackedMapPoiSelectColumnsSql(viewerMemberId)}
    FROM pois lp
    JOIN poi_route_links prl ON prl.poi_id = lp.id
    JOIN map_pois p ON p.id = lp.source_entity_id
    WHERE lp.source_entity_type = 'map_poi'
      AND lp.status != 'hidden'
      AND prl.route_source = 'section_fixture'
      AND prl.route_id = $1
      AND prl.status = 'active'
    ORDER BY
      CASE p.kind
        WHEN 'gauge' THEN 1
        WHEN 'access' THEN 2
        WHEN 'hazard' THEN 3
        ELSE 4
      END,
      p.title ASC`,
    viewerMemberId ? [sectionId, viewerMemberId] : [sectionId],
  );

  return result.rows.map(mapPoiRow);
}

export async function listMapPoisForRiver(
  riverId: string,
  viewerMemberId?: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoi[]> {
  const result = await client.query<MapPoiRow>(
    `SELECT DISTINCT ON (p.id)
      ${mapPoiSelectColumnsSql(viewerMemberId)}
    FROM map_pois p
    JOIN canonical_river_section_links crsl
      ON crsl.section_id = p.section_id
      AND crsl.route_source = 'section_fixture'
      AND crsl.status = 'active'
    WHERE crsl.river_id = $1
      AND p.verification_status IN ('confirmed', 'needs-confirmation')
    ORDER BY p.id, p.kind ASC, p.title ASC`,
    viewerMemberId ? [riverId, viewerMemberId] : [riverId],
  );

  return result.rows.map(mapPoiRow);
}

// All curated map POIs, location-agnostic and public — for the global POI map layer.
export async function listAllMapPois(
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoi[]> {
  const result = await client.query<MapPoiRow>(
    `SELECT DISTINCT ON (p.id)
      ${mapPoiSelectColumnsSql(null)}
    FROM map_pois p
    WHERE p.verification_status IN ('confirmed', 'needs-confirmation')
    ORDER BY p.id, p.kind ASC, p.title ASC`,
  );

  return result.rows.map(mapPoiRow);
}

function locationBackedMapPoiSelectColumnsSql(viewerMemberId?: string | null) {
  return `
    p.id,
    prl.route_id AS section_id,
    p.kind,
    ST_AsGeoJSON(lp.geometry)::json AS geometry,
    lp.title,
    p.subtitle,
    lp.summary,
    lp.source_kind,
    lp.source_label,
    lp.source_confidence,
    lp.source_updated_at,
    lp.source_url,
    p.verification_status,
    COALESCE(lp.payload -> 'payload', lp.payload) AS payload,
    lp.revision,
    lp.updated_at,
    COALESCE((
      SELECT count(*) FROM map_poi_reviews r
      WHERE r.poi_id = p.id AND r.decision = 'confirm'
    ), 0) AS confirmations,
    COALESCE((
      SELECT count(*) FROM map_poi_reviews r
      WHERE r.poi_id = p.id AND r.decision = 'correction'
    ), 0) AS corrections${
      viewerMemberId
        ? `,
    EXISTS (
      SELECT 1 FROM map_poi_reviews vr
      WHERE vr.poi_id = p.id
        AND vr.member_id = $2
        AND vr.decision = 'confirm'
    ) AS viewer_confirmed,
    EXISTS (
      SELECT 1 FROM map_poi_reviews vr
      WHERE vr.poi_id = p.id
        AND vr.member_id = $2
        AND vr.decision = 'correction'
        AND p.verification_status = 'needs-correction'
    ) AS viewer_suggested_correction,
    (
      SELECT vr.note FROM map_poi_reviews vr
      WHERE vr.poi_id = p.id
        AND vr.member_id = $2
        AND vr.decision = 'correction'
        AND p.verification_status = 'needs-correction'
      ORDER BY vr.created_at DESC
      LIMIT 1
    ) AS viewer_correction_note`
        : ""
    }`;
}

export async function listMapPoiCorrectionReviews(
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoiCorrectionReview[]> {
  const result = await client.query<MapPoiCorrectionReviewRow>(
    `SELECT
      ${mapPoiSelectColumnsSql(null, "p")},
      r.id AS review_id,
      r.note AS review_note,
      r.created_at AS review_created_at,
      m.id AS reviewer_id,
      COALESCE(m.public_name, m.display_name) AS reviewer_display_name,
      m.email AS reviewer_email,
      m.trust_level AS reviewer_trust_level
    FROM map_pois p
    JOIN map_poi_reviews r ON r.poi_id = p.id
    LEFT JOIN members m ON m.id = r.member_id
    WHERE r.decision = 'correction'
      AND p.verification_status = 'needs-correction'
    ORDER BY r.created_at DESC
    LIMIT 100`,
  );

  return result.rows.map((row) => ({
    id: row.review_id,
    poi: mapPoiRow(row),
    note: row.review_note ?? "",
    createdAt: row.review_created_at.toISOString(),
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_display_name,
      email: row.reviewer_email,
      trustLevel: row.reviewer_trust_level,
    },
  }));
}

export async function getMapPoiById(
  poiId: string,
  viewerMemberId?: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoi> {
  const result = await client.query<MapPoiRow>(
    `${mapPoiSelectSql(viewerMemberId)}
    WHERE p.id = $1`,
    viewerMemberId ? [poiId, viewerMemberId] : [poiId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Map point not found.");
  }

  return mapPoiRow(result.rows[0]);
}

export async function reviewMapPoi(
  poiId: string,
  actor: Member,
  decision: MapPoiReviewDecision,
  action: MapPoiReviewAction,
  note: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoi> {
  if (decision === "correction" && (!note || note.trim().length < 3)) {
    throw new HttpError(400, "A correction note is required.");
  }

  if (action === "remove") {
    await client.query(
      `DELETE FROM map_poi_reviews
      WHERE poi_id = $1
        AND member_id = $2
        AND decision = $3`,
      [poiId, actor.id, decision],
    );

    await refreshMapPoiVerificationStatus(poiId, client);
    return getMapPoiById(poiId, actor.id, client);
  }

  await client.query(
    `INSERT INTO map_poi_reviews (
      poi_id,
      member_id,
      decision,
      note
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (poi_id, member_id, decision) DO UPDATE SET
      note = EXCLUDED.note,
      created_at = now()`,
    [poiId, actor.id, decision, normaliseNote(note)],
  );

  await refreshMapPoiVerificationStatus(poiId, client);

  return getMapPoiById(poiId, actor.id, client);
}

export async function updateMapPoiVerificationStatus(
  poiId: string,
  status: MapPoiVerificationStatus,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMapPoi> {
  const result = await client.query(
    `UPDATE map_pois
    SET verification_status = $2,
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1`,
    [poiId, status],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Map point not found.");
  }

  return getMapPoiById(poiId, null, client);
}

export async function upsertMapPoiSeeds(
  seeds: MapPoiSeedInput[],
  client: PoolClient | typeof pool = pool,
): Promise<{ upserted: number }> {
  let upserted = 0;

  for (const seed of seeds) {
    const payload = seed.payload ?? {};
    const source = seed.source ?? {};

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
        $14,
        $15::jsonb
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
        payload = EXCLUDED.payload,
        updated_at = now(),
        revision = map_pois.revision + 1`,
      [
        seed.id,
        seed.sectionId,
        seed.kind,
        seed.location[1],
        seed.location[0],
        seed.title,
        seed.subtitle,
        seed.summary,
        source.kind ?? null,
        source.label ?? null,
        source.confidence ?? null,
        source.updatedAt ?? null,
        source.url ?? null,
        seed.verificationStatus ?? "needs-confirmation",
        JSON.stringify(payload),
      ],
    );

    upserted += 1;
  }

  return { upserted };
}

export function isMapPoiReviewDecision(
  value: unknown,
): value is MapPoiReviewDecision {
  return value === "confirm" || value === "correction";
}

export function isMapPoiReviewAction(value: unknown): value is MapPoiReviewAction {
  return value === "add" || value === "remove";
}

export function isMapPoiVerificationStatus(
  value: unknown,
): value is MapPoiVerificationStatus {
  return (
    value === "needs-confirmation" ||
    value === "confirmed" ||
    value === "needs-correction" ||
    value === "resolved"
  );
}

async function refreshMapPoiVerificationStatus(
  poiId: string,
  client: PoolClient | typeof pool,
): Promise<void> {
  await client.query(
    `UPDATE map_pois
    SET verification_status = CASE
        WHEN EXISTS (
          SELECT 1 FROM map_poi_reviews
          WHERE poi_id = $1 AND decision = 'correction'
        ) THEN 'needs-correction'
        WHEN EXISTS (
          SELECT 1 FROM map_poi_reviews
          WHERE poi_id = $1 AND decision = 'confirm'
        ) THEN 'confirmed'
        ELSE 'needs-confirmation'
      END,
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1`,
    [poiId],
  );
}

function mapPoiSelectSql(viewerMemberId?: string | null) {
  return `SELECT
    ${mapPoiSelectColumnsSql(viewerMemberId, "$2")}
  FROM map_pois p`;
}

function mapPoiSelectColumnsSql(
  viewerMemberId?: string | null,
  viewerMemberParam = "$2",
) {
  return `
    p.id,
    p.section_id,
    p.kind,
    ST_AsGeoJSON(p.geometry)::json AS geometry,
    p.title,
    p.subtitle,
    p.summary,
    p.source_kind,
    p.source_label,
    p.source_confidence,
    p.source_updated_at,
    p.source_url,
    p.verification_status,
    p.payload,
    p.revision,
    p.updated_at,
    COALESCE((
      SELECT count(*) FROM map_poi_reviews r
      WHERE r.poi_id = p.id AND r.decision = 'confirm'
    ), 0) AS confirmations,
    COALESCE((
      SELECT count(*) FROM map_poi_reviews r
      WHERE r.poi_id = p.id AND r.decision = 'correction'
    ), 0) AS corrections${
      viewerMemberId
        ? `,
    EXISTS (
      SELECT 1 FROM map_poi_reviews vr
      WHERE vr.poi_id = p.id
        AND vr.member_id = ${viewerMemberParam}
        AND vr.decision = 'confirm'
    ) AS viewer_confirmed,
    EXISTS (
      SELECT 1 FROM map_poi_reviews vr
      WHERE vr.poi_id = p.id
        AND vr.member_id = ${viewerMemberParam}
        AND vr.decision = 'correction'
        AND p.verification_status = 'needs-correction'
    ) AS viewer_suggested_correction,
    (
      SELECT vr.note FROM map_poi_reviews vr
      WHERE vr.poi_id = p.id
        AND vr.member_id = ${viewerMemberParam}
        AND vr.decision = 'correction'
        AND p.verification_status = 'needs-correction'
      ORDER BY vr.created_at DESC
      LIMIT 1
    ) AS viewer_correction_note`
        : ""
    }`;
}

function mapPoiRow(row: MapPoiRow): ApiMapPoi {
  return {
    id: row.id,
    sectionId: row.section_id,
    kind: row.kind,
    geometry: row.geometry,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    source: {
      kind: row.source_kind,
      label: row.source_label,
      confidence: row.source_confidence,
      updatedAt: row.source_updated_at,
      url: row.source_url,
    },
    verificationStatus: row.verification_status,
    confirmations: Number(row.confirmations),
    corrections: Number(row.corrections),
    viewerReview:
      typeof row.viewer_confirmed === "boolean" ||
      typeof row.viewer_suggested_correction === "boolean"
        ? {
            confirmed: Boolean(row.viewer_confirmed),
            suggestedCorrection: Boolean(row.viewer_suggested_correction),
            correctionNote: row.viewer_correction_note ?? null,
          }
        : undefined,
    payload: row.payload ?? {},
    revision: Number(row.revision),
    updatedAt: row.updated_at.toISOString(),
  };
}

function normaliseNote(note: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed.slice(0, 2000) : null;
}
