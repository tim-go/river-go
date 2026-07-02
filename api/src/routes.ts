import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import type { Member } from "./members.js";

// Canonical community-promoted sections. "routes" is internal schema/API
// vocabulary only — every user-facing surface calls these "sections". See
// docs/development/plan-community-sections.md. Community-origin only: the
// ONLY write path is promoteRouteSuggestion(), called from an approved
// route_suggestion. There is no seed script for this table.
export type RouteStatus = "published" | "hidden" | "retired";

export interface ApiRoute {
  id: string;
  name: string;
  // Free-text river name captured from the source suggestion at promote time
  // (payload.riverName) — display fallback for when riverId doesn't resolve
  // to a canonical river.
  riverName: string | null;
  routeType: string;
  riverId: string | null;
  status: RouteStatus;
  evidenceStatus: string;
  grade: string | null;
  summary: string | null;
  accessSummary: string | null;
  conditionsSummary: string | null;
  route: Array<[number, number]>;
  geometrySource: string;
  distanceKm: number | null;
  sourceRouteSuggestionId: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  attribution: {
    submittedBy: string | null;
    promotedBy: string | null;
  };
}

interface RouteRow {
  id: string;
  name: string;
  river_name_text: string | null;
  route_type: string;
  river_id: string | null;
  status: RouteStatus;
  evidence_status: string;
  grade: string | null;
  summary: string | null;
  access_summary: string | null;
  conditions_summary: string | null;
  route: { type: string; coordinates: unknown };
  geometry_source: string;
  distance_km: string | null;
  source_route_suggestion_id: string | null;
  created_at: Date;
  updated_at: Date;
  revision: string;
  submitted_by_name: string | null;
  promoted_by_name: string | null;
}

// Promote an approved route_suggestion into a canonical, published route
// ("section" to members). Requires the suggestion to be in status 'approved';
// throws HttpError(409) otherwise. Single transaction: insert the route row
// (copying name/grade/summary/access notes/geometry/attribution from the
// suggestion, resolving river_id against canonical_rivers by name when it
// matches), then flip the suggestion to 'promoted'.
export async function promoteRouteSuggestion(
  routeSuggestionId: string,
  actor: Member,
): Promise<ApiRoute> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the suggestion row so concurrent/repeat "Promote to section" clicks
    // serialise — otherwise both transactions read status='approved' before
    // either commits and each inserts a route (duplicate sections). The unique
    // index on routes(source_route_suggestion_id) is the DB-level backstop.
    const locked = await client.query<{ status: string }>(
      `SELECT status FROM route_suggestions WHERE id = $1 FOR UPDATE`,
      [routeSuggestionId],
    );
    if (!locked.rowCount) {
      throw new HttpError(404, "Route suggestion not found.");
    }
    if (locked.rows[0].status !== "approved") {
      throw new HttpError(
        409,
        `Route suggestion must be approved before it can be promoted (current status: ${locked.rows[0].status}).`,
      );
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO routes (
        name,
        route_type,
        river_id,
        grade,
        summary,
        access_summary,
        route,
        geometry_source,
        distance_km,
        source_route_suggestion_id,
        created_by,
        promoted_by,
        payload
      )
      SELECT
        rs.section_name,
        'whitewater-section',
        (
          SELECT cr.id FROM canonical_rivers cr
          WHERE lower(cr.display_name) = lower(rs.river_name)
             OR lower(cr.canonical_name) = lower(rs.river_name)
          LIMIT 1
        ),
        NULLIF(rs.difficulty, ''),
        NULLIF(rs.summary, ''),
        NULLIF(rs.access_notes, ''),
        rs.route,
        'member-trace',
        ST_Length(rs.route::geography) / 1000.0,
        rs.id,
        rs.member_id,
        $2,
        jsonb_build_object(
          'riverName', rs.river_name,
          'sectionName', rs.section_name,
          'evidence', rs.evidence
        )
      FROM route_suggestions rs
      WHERE rs.id = $1
        AND rs.status = 'approved'
      RETURNING id`,
      [routeSuggestionId, actor.id],
    );

    if (!inserted.rowCount) {
      // Either the suggestion doesn't exist, or it isn't approved.
      const existing = await client.query<{ status: string }>(
        `SELECT status FROM route_suggestions WHERE id = $1`,
        [routeSuggestionId],
      );
      if (!existing.rowCount) {
        throw new HttpError(404, "Route suggestion not found.");
      }
      throw new HttpError(
        409,
        `Route suggestion must be approved before it can be promoted (current status: ${existing.rows[0].status}).`,
      );
    }

    const routeId = inserted.rows[0].id;

    await client.query(
      `UPDATE route_suggestions
       SET status = 'promoted', updated_at = now(), revision = revision + 1
       WHERE id = $1`,
      [routeSuggestionId],
    );

    const result = await client.query<RouteRow>(
      `${routeSelectSql()} WHERE r.id = $1`,
      [routeId],
    );
    const route = mapRouteRow(result.rows[0]);

    await client.query("COMMIT");
    return route;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listPublicRoutes(
  riverId: string | null,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRoute[]> {
  const result = await client.query<RouteRow>(
    `${routeSelectSql()}
    WHERE r.status = 'published'
      ${riverId ? "AND r.river_id = $1" : ""}
    ORDER BY r.name ASC`,
    riverId ? [riverId] : [],
  );

  return result.rows.map(mapRouteRow);
}

export async function getPublicRouteById(
  routeId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRoute> {
  const result = await client.query<RouteRow>(
    `${routeSelectSql()}
    WHERE r.status = 'published' AND r.id = $1`,
    [routeId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Section not found.");
  }

  return mapRouteRow(result.rows[0]);
}

function routeSelectSql() {
  return `SELECT
    r.id,
    r.name,
    r.payload ->> 'riverName' AS river_name_text,
    r.route_type,
    r.river_id,
    r.status,
    r.evidence_status,
    r.grade,
    r.summary,
    r.access_summary,
    r.conditions_summary,
    ST_AsGeoJSON(r.route)::json AS route,
    r.geometry_source,
    r.distance_km,
    r.source_route_suggestion_id,
    r.created_at,
    r.updated_at,
    r.revision,
    COALESCE(submitter.public_name, submitter.display_name) AS submitted_by_name,
    COALESCE(promoter.public_name, promoter.display_name) AS promoted_by_name
  FROM routes r
  LEFT JOIN members submitter ON submitter.id = r.created_by
  LEFT JOIN members promoter ON promoter.id = r.promoted_by`;
}

function mapRouteRow(row: RouteRow): ApiRoute {
  return {
    id: row.id,
    name: row.name,
    riverName: row.river_name_text,
    routeType: row.route_type,
    riverId: row.river_id,
    status: row.status,
    evidenceStatus: row.evidence_status,
    grade: row.grade,
    summary: row.summary,
    accessSummary: row.access_summary,
    conditionsSummary: row.conditions_summary,
    route: mapLineString(row.route),
    geometrySource: row.geometry_source,
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    sourceRouteSuggestionId: row.source_route_suggestion_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    revision: Number(row.revision),
    attribution: {
      submittedBy: row.submitted_by_name,
      promotedBy: row.promoted_by_name,
    },
  };
}

function mapLineString(geometry: RouteRow["route"]): Array<[number, number]> {
  if (geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  return geometry.coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return [];
    }

    const [lng, lat] = coordinate;
    return typeof lat === "number" && typeof lng === "number"
      ? ([[lat, lng]] as Array<[number, number]>)
      : [];
  });
}
