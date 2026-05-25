import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import type { Member } from "./members.js";

export type RouteAdjustmentTargetType = "section" | "route_suggestion";

export type RouteAdjustmentStatus =
  | "pending_review"
  | "needs_info"
  | "approved"
  | "rejected"
  | "hidden";

export type RouteAdjustmentDecision =
  | "approve"
  | "request-review"
  | "needs-info"
  | "reject"
  | "hide";

export interface ApiRouteAdjustment {
  id: string;
  targetType: RouteAdjustmentTargetType;
  targetId: string;
  riverName: string;
  sectionName: string;
  difficulty: string;
  summary: string;
  accessNotes: string;
  evidence: string;
  route: Array<[number, number]>;
  status: RouteAdjustmentStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
  contributor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
}

interface RouteAdjustmentRow {
  id: string;
  target_type: RouteAdjustmentTargetType;
  target_id: string;
  river_name: string;
  section_name: string;
  difficulty: string;
  summary: string;
  access_notes: string;
  evidence: string;
  route: { type: string; coordinates: unknown };
  status: RouteAdjustmentStatus;
  created_at: Date;
  updated_at: Date;
  revision: string;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  trust_level: string | null;
}

export async function createRouteAdjustment(
  input: unknown,
  member: Member,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteAdjustment> {
  const adjustment = validateRouteAdjustmentInput(input);
  const result = await client.query<{ id: string }>(
    `INSERT INTO route_adjustments (
      member_id,
      target_type,
      target_id,
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
      $2,
      $3,
      'pending_review',
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      ST_SetSRID(ST_GeomFromGeoJSON($10), 4326),
      $11
    )
    RETURNING id`,
    [
      member.id,
      adjustment.targetType,
      adjustment.targetId,
      adjustment.riverName,
      adjustment.sectionName,
      adjustment.difficulty,
      adjustment.summary,
      adjustment.accessNotes,
      adjustment.evidence,
      JSON.stringify({
        type: "LineString",
        coordinates: adjustment.route.map(([lat, lng]) => [lng, lat]),
      }),
      {
        source: "pwa-route-adjustment",
        pointCount: adjustment.route.length,
      },
    ],
  );

  return getRouteAdjustmentById(result.rows[0].id, client);
}

export async function listModerationRouteAdjustments(
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteAdjustment[]> {
  const result = await client.query<RouteAdjustmentRow>(
    `${routeAdjustmentSelectSql()}
    WHERE ra.status != 'hidden'
    ORDER BY
      CASE ra.status
        WHEN 'pending_review' THEN 1
        WHEN 'needs_info' THEN 2
        WHEN 'approved' THEN 3
        WHEN 'rejected' THEN 4
        ELSE 5
      END,
      ra.created_at DESC
    LIMIT 200`,
  );

  return result.rows.map(mapRouteAdjustmentRow);
}

export async function applyRouteAdjustmentDecision(
  routeAdjustmentId: string,
  decision: RouteAdjustmentDecision,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteAdjustment> {
  const status = routeAdjustmentStatusForDecision(decision);
  const result = await client.query(
    `UPDATE route_adjustments
    SET status = $2,
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1`,
    [routeAdjustmentId, status],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Route adjustment not found.");
  }

  return getRouteAdjustmentById(routeAdjustmentId, client);
}

export function isRouteAdjustmentDecision(
  value: unknown,
): value is RouteAdjustmentDecision {
  return (
    value === "approve" ||
    value === "request-review" ||
    value === "needs-info" ||
    value === "reject" ||
    value === "hide"
  );
}

async function getRouteAdjustmentById(
  routeAdjustmentId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteAdjustment> {
  const result = await client.query<RouteAdjustmentRow>(
    `${routeAdjustmentSelectSql()}
    WHERE ra.id = $1`,
    [routeAdjustmentId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Route adjustment not found.");
  }

  return mapRouteAdjustmentRow(result.rows[0]);
}

function routeAdjustmentSelectSql() {
  return `SELECT
    ra.id,
    ra.target_type,
    ra.target_id,
    ra.river_name,
    ra.section_name,
    ra.difficulty,
    ra.summary,
    ra.access_notes,
    ra.evidence,
    ST_AsGeoJSON(ra.route)::json AS route,
    ra.status,
    ra.created_at,
    ra.updated_at,
    ra.revision,
    ra.member_id,
    COALESCE(m.public_name, m.display_name) AS display_name,
    m.email,
    m.trust_level
  FROM route_adjustments ra
  LEFT JOIN members m ON m.id = ra.member_id`;
}

function validateRouteAdjustmentInput(input: unknown) {
  if (!isRecord(input)) {
    throw new HttpError(400, "Route adjustment body is required.");
  }

  const targetType = readTargetType(input.targetType);
  const targetId = cleanRequiredText(input.targetId, "targetId", 160);
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
    targetType,
    targetId,
    riverName,
    sectionName,
    difficulty,
    summary,
    accessNotes,
    evidence,
    route,
  };
}

function readTargetType(value: unknown): RouteAdjustmentTargetType {
  if (value === "section" || value === "route_suggestion") {
    return value;
  }

  throw new HttpError(400, "targetType must be section or route_suggestion.");
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

function mapRouteAdjustmentRow(row: RouteAdjustmentRow): ApiRouteAdjustment {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
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
  };
}

function mapLineString(
  geometry: RouteAdjustmentRow["route"],
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

function routeAdjustmentStatusForDecision(
  decision: RouteAdjustmentDecision,
): RouteAdjustmentStatus {
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
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
