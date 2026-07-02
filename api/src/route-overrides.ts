import type { PoolClient } from "pg";
import { pool } from "./db.js";
import type { Member } from "./members.js";

// Publishing path only — the GET /api/route-overrides read side was removed in
// Phase 1 of docs/development/plan-community-sections.md: its only consumer
// (src/services/routeOverrideApi.ts) filtered exclusively for
// routeSource === "section_fixture" (retired fixture data), so it had nothing
// left to serve. The route_overrides table and this adjustment->override
// publishing path stay in place for now (dropped in Phase 3, once route
// adjustments apply directly to `routes`).
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
