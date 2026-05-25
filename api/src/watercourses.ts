import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export type LatLngTuple = [number, number];

export interface ApiRouteSnapResult {
  route: LatLngTuple[];
  matchedPoints: number;
  totalPoints: number;
  averageDistanceM: number | null;
  maxDistanceM: number | null;
  confidence: "none" | "low" | "medium" | "high";
  source: {
    kind: "watercourse-reference";
    label: string;
    licence: string;
  };
  warnings: string[];
  matches: Array<{
    input: LatLngTuple;
    snapped: LatLngTuple | null;
    distanceM: number | null;
    watercourseId: string | null;
    name: string | null;
  }>;
}

interface SnapPointRow {
  source_id: string;
  name: string | null;
  snapped_geojson: {
    type: "Point";
    coordinates: [number, number];
  };
  distance_m: number;
}

export async function snapRouteToWatercourses(
  input: unknown,
  client: PoolClient | typeof pool = pool,
): Promise<ApiRouteSnapResult> {
  if (!isRecord(input)) {
    throw new HttpError(400, "Snap request body is required.");
  }

  const route = readRoute(input.route);
  const maxDistanceM = readMaxDistanceM(input.maxDistanceM);

  if (route.length < 2) {
    throw new HttpError(400, "route must include at least two points.");
  }

  const matches = [];
  const snappedRoute: LatLngTuple[] = [];
  let totalDistanceM = 0;
  let maxObservedDistanceM = 0;
  let matchedPoints = 0;

  for (const point of route) {
    const match = await findNearestWatercoursePoint(point, maxDistanceM, client);

    if (!match) {
      matches.push({
        input: point,
        snapped: null,
        distanceM: null,
        watercourseId: null,
        name: null,
      });
      snappedRoute.push(point);
      continue;
    }

    const snapped: LatLngTuple = [
      match.snapped_geojson.coordinates[1],
      match.snapped_geojson.coordinates[0],
    ];
    matchedPoints += 1;
    totalDistanceM += match.distance_m;
    maxObservedDistanceM = Math.max(maxObservedDistanceM, match.distance_m);
    snappedRoute.push(snapped);
    matches.push({
      input: point,
      snapped,
      distanceM: Math.round(match.distance_m),
      watercourseId: match.source_id,
      name: match.name,
    });
  }

  const averageDistanceM = matchedPoints
    ? Math.round(totalDistanceM / matchedPoints)
    : null;
  const roundedMaxDistanceM = matchedPoints ? Math.round(maxObservedDistanceM) : null;
  const confidence = confidenceForSnap(
    matchedPoints,
    route.length,
    averageDistanceM,
    roundedMaxDistanceM,
    maxDistanceM,
  );
  const warnings = warningsForSnap(
    matchedPoints,
    route.length,
    confidence,
    averageDistanceM,
    roundedMaxDistanceM,
  );

  return {
    route: snappedRoute,
    matchedPoints,
    totalPoints: route.length,
    averageDistanceM,
    maxDistanceM: roundedMaxDistanceM,
    confidence,
    source: {
      kind: "watercourse-reference",
      label: "OS Open Rivers watercourse geometry",
      licence: "Open Government Licence",
    },
    warnings,
    matches,
  };
}

async function findNearestWatercoursePoint(
  point: LatLngTuple,
  maxDistanceM: number,
  client: PoolClient | typeof pool,
): Promise<SnapPointRow | null> {
  const result = await client.query<SnapPointRow>(
    `WITH point_input AS (
      SELECT ST_SetSRID(ST_MakePoint($2, $1), 4326) AS geom
    )
    SELECT
      wc.source_id,
      wc.name,
      ST_AsGeoJSON(ST_ClosestPoint(wc.geometry, point_input.geom))::json AS snapped_geojson,
      ST_Distance(wc.geometry::geography, point_input.geom::geography) AS distance_m
    FROM watercourses wc, point_input
    WHERE wc.geometry && ST_Expand(point_input.geom, $3 / 111320.0)
      AND ST_DWithin(wc.geometry::geography, point_input.geom::geography, $3)
    ORDER BY wc.geometry <-> point_input.geom
    LIMIT 1`,
    [point[0], point[1], maxDistanceM],
  );

  return result.rows[0] ?? null;
}

function confidenceForSnap(
  matchedPoints: number,
  totalPoints: number,
  averageDistanceM: number | null,
  maxDistanceM: number | null,
  allowedDistanceM: number,
): ApiRouteSnapResult["confidence"] {
  if (!matchedPoints || averageDistanceM == null || maxDistanceM == null) {
    return "none";
  }

  const matchedRatio = matchedPoints / totalPoints;

  if (
    matchedRatio >= 0.9 &&
    averageDistanceM <= 35 &&
    maxDistanceM <= Math.min(120, allowedDistanceM)
  ) {
    return "high";
  }

  if (
    matchedRatio >= 0.75 &&
    averageDistanceM <= 80 &&
    maxDistanceM <= Math.min(250, allowedDistanceM)
  ) {
    return "medium";
  }

  return "low";
}

function warningsForSnap(
  matchedPoints: number,
  totalPoints: number,
  confidence: ApiRouteSnapResult["confidence"],
  averageDistanceM: number | null,
  maxDistanceM: number | null,
) {
  const warnings: string[] = [
    "Watercourse snapping is a geometry aid only; it does not confirm paddleability, access, safety, grade, or current conditions.",
  ];

  if (matchedPoints < totalPoints) {
    warnings.push(
      `${totalPoints - matchedPoints} trace point${
        totalPoints - matchedPoints === 1 ? "" : "s"
      } could not be matched to a nearby watercourse.`,
    );
  }

  if (confidence === "low" || confidence === "none") {
    warnings.push("Review the snapped trace carefully before saving.");
  }

  if (averageDistanceM != null && maxDistanceM != null) {
    warnings.push(
      `Snap distance: ${averageDistanceM} m average, ${maxDistanceM} m maximum.`,
    );
  }

  return warnings;
}

function readRoute(value: unknown): LatLngTuple[] {
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

    return [lat, lng] as LatLngTuple;
  });
}

function readMaxDistanceM(value: unknown): number {
  if (value == null) {
    return 250;
  }

  const maxDistanceM = Number(value);

  if (!Number.isFinite(maxDistanceM) || maxDistanceM < 10 || maxDistanceM > 2000) {
    throw new HttpError(400, "maxDistanceM must be between 10 and 2000.");
  }

  return maxDistanceM;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
