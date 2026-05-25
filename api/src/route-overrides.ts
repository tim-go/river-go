import type { PoolClient } from "pg";
import { pool } from "./db.js";
import type { Member } from "./members.js";

export interface ApiRouteOverride {
  routeSource: string;
  routeId: string;
  route: Array<[number, number]>;
  sourceRouteAdjustmentId: string | null;
  appliedBy: string | null;
  appliedAt: string;
  revision: number;
}

interface RouteOverrideRow {
  route_source: string;
  route_id: string;
  route: { type: string; coordinates: unknown };
  source_route_adjustment_id: string | null;
  applied_by: string | null;
  applied_at: Date;
  revision: string;
}

export async function listRouteOverrides(
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteOverride[]> {
  const result = await client.query<RouteOverrideRow>(
    `SELECT
      route_source,
      route_id,
      ST_AsGeoJSON(route)::json AS route,
      source_route_adjustment_id,
      applied_by,
      applied_at,
      revision
    FROM route_overrides
    ORDER BY route_source, route_id`,
  );

  return result.rows.map(mapRouteOverrideRow);
}

export async function publishRouteOverrideFromAdjustment(
  routeAdjustmentId: string,
  actor: Member,
  client: PoolClient | typeof pool = pool,
): Promise<void> {
  await client.query(
    `INSERT INTO route_overrides (
      route_source,
      route_id,
      route,
      source_route_adjustment_id,
      applied_by,
      notes,
      payload
    )
    SELECT
      'section_fixture',
      ra.target_id,
      ra.route,
      ra.id,
      $2,
      ra.evidence,
      jsonb_build_object(
        'riverName', ra.river_name,
        'sectionName', ra.section_name,
        'summary', ra.summary,
        'accessNotes', ra.access_notes,
        'difficulty', ra.difficulty
      )
    FROM route_adjustments ra
    WHERE ra.id = $1
      AND ra.target_type = 'section'
      AND ra.status = 'approved'
    ON CONFLICT (route_source, route_id) DO UPDATE SET
      route = EXCLUDED.route,
      source_route_adjustment_id = EXCLUDED.source_route_adjustment_id,
      applied_by = EXCLUDED.applied_by,
      applied_at = now(),
      notes = EXCLUDED.notes,
      payload = EXCLUDED.payload,
      updated_at = now(),
      revision = route_overrides.revision + 1`,
    [routeAdjustmentId, actor.id],
  );
}

function mapRouteOverrideRow(row: RouteOverrideRow): ApiRouteOverride {
  return {
    routeSource: row.route_source,
    routeId: row.route_id,
    route: mapLineString(row.route),
    sourceRouteAdjustmentId: row.source_route_adjustment_id,
    appliedBy: row.applied_by,
    appliedAt: row.applied_at.toISOString(),
    revision: Number(row.revision),
  };
}

function mapLineString(
  geometry: RouteOverrideRow["route"],
): Array<[number, number]> {
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
