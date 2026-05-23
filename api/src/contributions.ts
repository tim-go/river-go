import type { PoolClient } from "pg";
import { pool } from "./db.js";

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
