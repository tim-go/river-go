import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import type { Member } from "./members.js";
import { canModerate } from "./members.js";

export type ContributionModerationStatus =
  | "reported"
  | "pending"
  | "needs-confirmation"
  | "confirmed"
  | "challenged"
  | "hidden"
  | "rejected"
  | "resolved";

export interface ApiContribution {
  id: string;
  sectionId: string | null;
  type: string;
  geometry: GeoJsonGeometry | null;
  payload: Record<string, unknown>;
  photos: ApiContributionPhoto[];
  observedAt: string | null;
  createdAt: string;
  updatedAt: string;
  moderationStatus: ContributionModerationStatus;
  syncStatus: string;
  revision: number;
  contributor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
}

export interface ApiContributionPhoto {
  id: string;
  caption: string;
  storagePath: string | null;
  displayPath: string | null;
  thumbnailPath: string | null;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  sizeBytes: number | null;
  thumbnailSizeBytes: number | null;
  mimeType: string | null;
  originalName: string | null;
  moderationStatus: string | null;
}

interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
}

export interface ContributionRow {
  id: string;
  section_id: string | null;
  type: string;
  geometry: GeoJsonGeometry | null;
  payload: Record<string, unknown>;
  photos: unknown;
  observed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  moderation_status: ContributionModerationStatus;
  sync_status: string;
  revision: string;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  trust_level: string | null;
}

export async function listContributionsForSection(
  sectionId: string,
  viewerMemberId: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution[]> {
  const result = await client.query<ContributionRow>(
    `SELECT
      c.id,
      COALESCE(c.section_id, prl.route_id) AS section_id,
      c.type,
      CASE
        WHEN c.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(c.geometry)::json
      END AS geometry,
      c.payload,
      ${photoAggregateSql("c.id")} AS photos,
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      COALESCE(m.public_name, m.display_name) AS display_name,
      m.email,
      m.trust_level
    FROM contributions c
    LEFT JOIN LATERAL (
      SELECT route_id
      FROM poi_route_links
      WHERE poi_id = 'contribution:' || c.id::text
        AND route_source = 'section_fixture'
        AND route_id = $1
        AND status = 'active'
      LIMIT 1
    ) prl ON TRUE
    LEFT JOIN members m ON m.id = c.member_id
    WHERE (c.section_id = $1 OR prl.route_id IS NOT NULL)
      AND (
        c.moderation_status IN (
          'reported',
          'needs-confirmation',
          'confirmed',
          'challenged',
          'resolved'
        )
        OR ($2::uuid IS NOT NULL AND c.member_id = $2::uuid)
      )
      AND c.moderation_status NOT IN ('hidden', 'rejected')
      AND c.map_poi_id IS NULL
    ORDER BY c.created_at DESC`,
    [sectionId, viewerMemberId],
  );

  return result.rows.map(mapContributionRow);
}

export async function listContributionsForPoi(
  mapPoiId: string,
  viewerMemberId: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution[]> {
  const result = await client.query<ContributionRow>(
    `SELECT
      c.id,
      c.section_id,
      c.type,
      CASE
        WHEN c.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(c.geometry)::json
      END AS geometry,
      c.payload,
      ${photoAggregateSql("c.id")} AS photos,
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      COALESCE(m.public_name, m.display_name) AS display_name,
      m.email,
      m.trust_level
    FROM contributions c
    LEFT JOIN members m ON m.id = c.member_id
    WHERE c.map_poi_id = $1
      AND (
        c.moderation_status IN (
          'reported',
          'needs-confirmation',
          'confirmed',
          'challenged',
          'resolved'
        )
        OR ($2::uuid IS NOT NULL AND c.member_id = $2::uuid)
      )
      AND c.moderation_status NOT IN ('hidden', 'rejected')
    ORDER BY c.created_at DESC`,
    [mapPoiId, viewerMemberId],
  );

  return result.rows.map(mapContributionRow);
}

export async function listModerationContributions(
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution[]> {
  const result = await client.query<ContributionRow>(
    `SELECT
      c.id,
      c.section_id,
      c.type,
      CASE
        WHEN c.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(c.geometry)::json
      END AS geometry,
      c.payload,
      ${photoAggregateSql("c.id")} AS photos,
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      COALESCE(m.public_name, m.display_name) AS display_name,
      m.email,
      m.trust_level
    FROM contributions c
    LEFT JOIN members m ON m.id = c.member_id
    WHERE c.moderation_status IN (
      'pending',
      'challenged',
      'needs-confirmation',
      'reported'
    )
    ORDER BY
      CASE c.moderation_status
        WHEN 'pending' THEN 1
        WHEN 'challenged' THEN 2
        WHEN 'needs-confirmation' THEN 3
        ELSE 4
      END,
      c.created_at DESC
    LIMIT 200`,
  );

  return result.rows.map(mapContributionRow);
}

export async function listContributionsForMember(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution[]> {
  const result = await client.query<ContributionRow>(
    `SELECT
      c.id,
      c.section_id,
      c.type,
      CASE
        WHEN c.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(c.geometry)::json
      END AS geometry,
      c.payload,
      ${photoAggregateSql("c.id")} AS photos,
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      COALESCE(m.public_name, m.display_name) AS display_name,
      m.email,
      m.trust_level
    FROM contributions c
    LEFT JOIN members m ON m.id = c.member_id
    WHERE c.member_id = $1
      AND c.moderation_status NOT IN ('hidden', 'rejected')
    ORDER BY c.created_at DESC
    LIMIT 200`,
    [memberId],
  );

  return result.rows.map(mapContributionRow);
}

export async function getContributionById(
  contributionId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution> {
  const result = await client.query<ContributionRow>(
    `SELECT
      c.id,
      c.section_id,
      c.type,
      CASE
        WHEN c.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(c.geometry)::json
      END AS geometry,
      c.payload,
      ${photoAggregateSql("c.id")} AS photos,
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      COALESCE(m.public_name, m.display_name) AS display_name,
      m.email,
      m.trust_level
    FROM contributions c
    LEFT JOIN members m ON m.id = c.member_id
    WHERE c.id = $1`,
    [contributionId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Contribution not found.");
  }

  return mapContributionRow(result.rows[0]);
}

export type ModerationDecision =
  | "approve"
  | "confirm"
  | "request-confirmation"
  | "challenge"
  | "hide"
  | "reject"
  | "resolve";

export async function applyModerationDecision(
  contributionId: string,
  decision: ModerationDecision,
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution> {
  const nextStatus = moderationStatusForDecision(decision);
  const nextPhotoStatus = photoModerationStatusForDecision(decision);
  const result = await client.query(
    `UPDATE contributions
    SET moderation_status = $2,
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1`,
    [contributionId, nextStatus],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Contribution not found.");
  }

  if (nextPhotoStatus) {
    await client.query(
      `UPDATE contribution_photos
      SET moderation_status = $2
      WHERE contribution_id = $1`,
      [contributionId, nextPhotoStatus],
    );
  }

  return getContributionById(contributionId, client);
}

export async function softDeleteContribution(
  contributionId: string,
  actor: Member,
  client: PoolClient | typeof pool = pool,
): Promise<ApiContribution> {
  const existing = await getContributionById(contributionId, client);

  if (existing.contributor.id !== actor.id && !canModerate(actor)) {
    throw new HttpError(
      403,
      "Only the contribution owner or a moderator can delete it.",
    );
  }

  const result = await client.query(
    `UPDATE contributions
    SET moderation_status = 'hidden',
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1`,
    [contributionId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Contribution not found.");
  }

  await client.query(
    `UPDATE contribution_photos
    SET moderation_status = 'hidden',
      updated_at = now()
    WHERE contribution_id = $1`,
    [contributionId],
  );

  return {
    ...existing,
    moderationStatus: "hidden",
    photos: [],
    revision: existing.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function mapContributionRow(row: ContributionRow): ApiContribution {
  return {
    id: row.id,
    sectionId: row.section_id,
    type: row.type,
    geometry: row.geometry,
    payload: row.payload ?? {},
    photos: mapContributionPhotos(row.photos),
    observedAt: row.observed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    moderationStatus: row.moderation_status,
    syncStatus: row.sync_status,
    revision: Number(row.revision),
    contributor: {
      id: row.member_id,
      displayName: row.display_name,
      email: row.email,
      trustLevel: row.trust_level,
    },
  };
}

function photoAggregateSql(contributionIdExpression: string) {
  return `COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'caption', p.caption,
        'storagePath', p.storage_path,
        'displayPath', p.display_path,
        'thumbnailPath', p.thumbnail_path,
        'displayUrl', p.display_url,
        'thumbnailUrl', p.thumbnail_url,
        'width', p.width,
        'height', p.height,
        'thumbnailWidth', p.thumbnail_width,
        'thumbnailHeight', p.thumbnail_height,
        'sizeBytes', p.size_bytes,
        'thumbnailSizeBytes', p.thumbnail_size_bytes,
        'mimeType', p.mime_type,
        'originalName', p.original_name,
        'moderationStatus', p.moderation_status
      )
      ORDER BY p.created_at DESC
    )
    FROM contribution_photos p
    WHERE p.contribution_id = ${contributionIdExpression}
      AND p.moderation_status NOT IN ('hidden', 'rejected')
  ), '[]'::jsonb)`;
}

function mapContributionPhotos(value: unknown): ApiContributionPhoto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((photo) => ({
      id: readString(photo.id) ?? "",
      caption: readString(photo.caption) ?? "",
      storagePath: readString(photo.storagePath),
      displayPath: readString(photo.displayPath),
      thumbnailPath: readString(photo.thumbnailPath),
      displayUrl: readString(photo.displayUrl),
      thumbnailUrl: readString(photo.thumbnailUrl),
      width: readNumber(photo.width),
      height: readNumber(photo.height),
      thumbnailWidth: readNumber(photo.thumbnailWidth),
      thumbnailHeight: readNumber(photo.thumbnailHeight),
      sizeBytes: readNumber(photo.sizeBytes),
      thumbnailSizeBytes: readNumber(photo.thumbnailSizeBytes),
      mimeType: readString(photo.mimeType),
      originalName: readString(photo.originalName),
      moderationStatus: readString(photo.moderationStatus),
    }))
    .filter((photo) => photo.id);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isModerationDecision(
  value: unknown,
): value is ModerationDecision {
  return (
    value === "approve" ||
    value === "confirm" ||
    value === "request-confirmation" ||
    value === "challenge" ||
    value === "hide" ||
    value === "reject" ||
    value === "resolve"
  );
}

function moderationStatusForDecision(
  decision: ModerationDecision,
): ContributionModerationStatus {
  if (decision === "approve") return "reported";
  if (decision === "confirm") return "confirmed";
  if (decision === "request-confirmation") return "needs-confirmation";
  if (decision === "challenge") return "challenged";
  if (decision === "hide") return "hidden";
  if (decision === "reject") return "rejected";
  return "resolved";
}

function photoModerationStatusForDecision(decision: ModerationDecision): string | null {
  if (decision === "approve" || decision === "confirm" || decision === "resolve") {
    return "visible";
  }

  if (decision === "hide") return "hidden";
  if (decision === "reject") return "rejected";
  if (decision === "challenge") return "pending";

  return null;
}
