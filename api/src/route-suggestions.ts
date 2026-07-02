import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import type { Member } from "./members.js";

export type RouteSuggestionStatus =
  | "local_draft"
  | "pending_review"
  | "needs_info"
  | "approved"
  | "rejected"
  | "hidden"
  // Terminal status set only by promoteRouteSuggestion() (routes.ts): an
  // approved suggestion that a moderator has promoted into a canonical
  // `routes` row. Drops out of the public "approved" list (superseded by the
  // route) but stays visible in moderation with a link to the route.
  | "promoted";

export type RouteSuggestionDecision =
  | "approve"
  | "request-review"
  | "needs-info"
  | "reject"
  | "hide";

export interface ApiRouteSuggestion {
  id: string;
  riverName: string;
  sectionName: string;
  difficulty: string;
  summary: string;
  accessNotes: string;
  evidence: string;
  route: Array<[number, number]>;
  status: RouteSuggestionStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
  contributor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
  // Set once a moderator has promoted this suggestion (routes.ts).
  promotedRouteId: string | null;
}

interface RouteSuggestionRow {
  id: string;
  river_name: string;
  section_name: string;
  difficulty: string;
  summary: string;
  access_notes: string;
  evidence: string;
  route: { type: string; coordinates: unknown };
  status: RouteSuggestionStatus;
  created_at: Date;
  updated_at: Date;
  revision: string;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  trust_level: string | null;
  promoted_route_id: string | null;
}

export async function createRouteSuggestion(
  input: unknown,
  member: Member,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion> {
  const suggestion = validateRouteSuggestionInput(input);
  const result = await client.query<{ id: string }>(
    `INSERT INTO route_suggestions (
      member_id,
      status,
      river_name,
      section_name,
      difficulty,
      summary,
      access_notes,
      evidence,
      route,
      payload
    ) VALUES (
      $1,
      'pending_review',
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      ST_SetSRID(ST_GeomFromGeoJSON($8), 4326),
      $9
    )
    RETURNING id`,
    [
      member.id,
      suggestion.riverName,
      suggestion.sectionName,
      suggestion.difficulty,
      suggestion.summary,
      suggestion.accessNotes,
      suggestion.evidence,
      JSON.stringify({
        type: "LineString",
        coordinates: suggestion.route.map(([lat, lng]) => [lng, lat]),
      }),
      {
        source: "pwa-route-suggestion",
        pointCount: suggestion.route.length,
      },
    ],
  );

  return getRouteSuggestionById(result.rows[0].id, client);
}

export async function listRouteSuggestionsForMember(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion[]> {
  const result = await client.query<RouteSuggestionRow>(
    `${routeSuggestionSelectSql()}
    WHERE rs.member_id = $1
      AND rs.status NOT IN ('hidden', 'rejected', 'promoted')
    ORDER BY rs.created_at DESC
    LIMIT 200`,
    [memberId],
  );

  return result.rows.map(mapRouteSuggestionRow);
}

export async function listModerationRouteSuggestions(
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion[]> {
  const result = await client.query<RouteSuggestionRow>(
    `${routeSuggestionSelectSql()}
    WHERE rs.status != 'hidden'
    ORDER BY
      CASE rs.status
        WHEN 'pending_review' THEN 1
        WHEN 'needs_info' THEN 2
        WHEN 'approved' THEN 3
        WHEN 'promoted' THEN 4
        WHEN 'rejected' THEN 5
        ELSE 6
      END,
      rs.created_at DESC
    LIMIT 200`,
  );

  return result.rows.map(mapRouteSuggestionRow);
}

export async function listApprovedRouteSuggestions(
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion[]> {
  const result = await client.query<RouteSuggestionRow>(
    `${routeSuggestionSelectSql()}
    WHERE rs.status = 'approved'
    ORDER BY rs.updated_at DESC, rs.created_at DESC
    LIMIT 200`,
  );

  return result.rows.map(mapRouteSuggestionRow);
}

export async function applyRouteSuggestionDecision(
  routeSuggestionId: string,
  decision: RouteSuggestionDecision,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion> {
  const status = routeSuggestionStatusForDecision(decision);
  const result = await client.query(
    `UPDATE route_suggestions
    SET status = $2,
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1`,
    [routeSuggestionId, status],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Route suggestion not found.");
  }

  return getRouteSuggestionById(routeSuggestionId, client);
}

export async function updateRouteSuggestionForModeration(
  routeSuggestionId: string,
  input: unknown,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion> {
  const suggestion = validateRouteSuggestionInput(input);
  const result = await client.query(
    `UPDATE route_suggestions
    SET
      river_name = $2,
      section_name = $3,
      difficulty = $4,
      summary = $5,
      access_notes = $6,
      evidence = $7,
      route = ST_SetSRID(ST_GeomFromGeoJSON($8), 4326),
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1
      AND status != 'hidden'`,
    [
      routeSuggestionId,
      suggestion.riverName,
      suggestion.sectionName,
      suggestion.difficulty,
      suggestion.summary,
      suggestion.accessNotes,
      suggestion.evidence,
      JSON.stringify({
        type: "LineString",
        coordinates: suggestion.route.map(([lat, lng]) => [lng, lat]),
      }),
    ],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Route suggestion not found.");
  }

  return getRouteSuggestionById(routeSuggestionId, client);
}

export function isRouteSuggestionDecision(
  value: unknown,
): value is RouteSuggestionDecision {
  return (
    value === "approve" ||
    value === "request-review" ||
    value === "needs-info" ||
    value === "reject" ||
    value === "hide"
  );
}

async function getRouteSuggestionById(
  routeSuggestionId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSuggestion> {
  const result = await client.query<RouteSuggestionRow>(
    `${routeSuggestionSelectSql()}
    WHERE rs.id = $1`,
    [routeSuggestionId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Route suggestion not found.");
  }

  return mapRouteSuggestionRow(result.rows[0]);
}

function routeSuggestionSelectSql() {
  return `SELECT
    rs.id,
    rs.river_name,
    rs.section_name,
    rs.difficulty,
    rs.summary,
    rs.access_notes,
    rs.evidence,
    ST_AsGeoJSON(rs.route)::json AS route,
    rs.status,
    rs.created_at,
    rs.updated_at,
    rs.revision,
    rs.member_id,
    COALESCE(m.public_name, m.display_name) AS display_name,
    m.email,
    m.trust_level,
    promoted.id AS promoted_route_id
  FROM route_suggestions rs
  LEFT JOIN members m ON m.id = rs.member_id
  LEFT JOIN routes promoted ON promoted.source_route_suggestion_id = rs.id`;
}

function validateRouteSuggestionInput(input: unknown) {
  if (!isRecord(input)) {
    throw new HttpError(400, "Route suggestion body is required.");
  }

  const riverName = cleanRequiredText(input.riverName, "riverName", 100);
  const sectionName = cleanRequiredText(input.sectionName, "sectionName", 140);
  const summary = cleanRequiredText(input.summary, "summary", 1000);
  const evidence = cleanRequiredText(input.evidence, "evidence", 1000);
  const difficulty = cleanOptionalText(input.difficulty, 80) || "Needs grading";
  const accessNotes =
    cleanOptionalText(input.accessNotes, 1000) || "Access needs local review.";
  const route = readRoute(input.route);

  if (route.length < 2) {
    throw new HttpError(400, "Route must include at least two points.");
  }

  return {
    riverName,
    sectionName,
    difficulty,
    summary,
    accessNotes,
    evidence,
    route,
  };
}

function readRoute(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) {
    throw new HttpError(400, "route must be an array of lat/lng points.");
  }

  return value.map((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      throw new HttpError(400, "Each route point must include lat and lng.");
    }

    const lat = Number(point[0]);
    const lng = Number(point[1]);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new HttpError(400, "Route points must be valid coordinates.");
    }

    return [lat, lng];
  });
}

function mapRouteSuggestionRow(row: RouteSuggestionRow): ApiRouteSuggestion {
  return {
    id: row.id,
    riverName: row.river_name,
    sectionName: row.section_name,
    difficulty: row.difficulty,
    summary: row.summary,
    accessNotes: row.access_notes,
    evidence: row.evidence,
    route: mapLineString(row.route),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    revision: Number(row.revision),
    contributor: {
      id: row.member_id,
      displayName: row.display_name,
      email: row.email,
      trustLevel: row.trust_level,
    },
    promotedRouteId: row.promoted_route_id,
  };
}

function mapLineString(geometry: RouteSuggestionRow["route"]): Array<[number, number]> {
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

function routeSuggestionStatusForDecision(
  decision: RouteSuggestionDecision,
): RouteSuggestionStatus {
  if (decision === "approve") return "approved";
  if (decision === "request-review") return "pending_review";
  if (decision === "needs-info") return "needs_info";
  if (decision === "reject") return "rejected";
  return "hidden";
}

function cleanRequiredText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  const cleaned = cleanOptionalText(value, maxLength);

  if (!cleaned) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  return cleaned;
}

function cleanOptionalText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
