import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

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
      c.section_id,
      c.type,
      CASE
        WHEN c.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(c.geometry)::json
      END AS geometry,
      c.payload,
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      m.display_name,
      m.email,
      m.trust_level
    FROM contributions c
    LEFT JOIN members m ON m.id = c.member_id
    WHERE c.section_id = $1
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
    [sectionId, viewerMemberId],
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
      c.observed_at,
      c.created_at,
      c.updated_at,
      c.moderation_status,
      c.sync_status,
      c.revision,
      c.member_id,
      m.display_name,
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

export type ModerationDecision =
  | "approve"
  | "confirm"
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
  const result = await client.query<ContributionRow>(
    `WITH updated AS (
      UPDATE contributions
      SET moderation_status = $2,
        updated_at = now(),
        revision = revision + 1
      WHERE id = $1
      RETURNING *
    )
    SELECT
      updated.id,
      updated.section_id,
      updated.type,
      CASE
        WHEN updated.geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(updated.geometry)::json
      END AS geometry,
      updated.payload,
      updated.observed_at,
      updated.created_at,
      updated.updated_at,
      updated.moderation_status,
      updated.sync_status,
      updated.revision,
      updated.member_id,
      m.display_name,
      m.email,
      m.trust_level
    FROM updated
    LEFT JOIN members m ON m.id = updated.member_id`,
    [contributionId, nextStatus],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Contribution not found.");
  }

  return mapContributionRow(result.rows[0]);
}

export function mapContributionRow(row: ContributionRow): ApiContribution {
  return {
    id: row.id,
    sectionId: row.section_id,
    type: row.type,
    geometry: row.geometry,
    payload: row.payload ?? {},
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

export function isModerationDecision(
  value: unknown,
): value is ModerationDecision {
  return (
    value === "approve" ||
    value === "confirm" ||
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
  if (decision === "challenge") return "challenged";
  if (decision === "hide") return "hidden";
  if (decision === "reject") return "rejected";
  return "resolved";
}
