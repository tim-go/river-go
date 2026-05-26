import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export type LatLngTuple = [number, number];
export type WatercourseSource = "osm_waterway";

const OSM_WATERWAY_SOURCE: WatercourseSource = "osm_waterway";
const DEGREE_BUFFER_PER_METRE = 1 / 111_320;
const GRAPH_NODE_PRECISION = 7;

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
    source: WatercourseSource;
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

export interface WatercourseViewportInput {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number | null;
  limit: number | null;
  source: WatercourseSource | null;
}

export interface ApiWatercourseFeature {
  id: string;
  name: string | null;
  watercourseType: string;
  form: string | null;
  flowDirection: string | null;
  hints: WatercourseHints;
  routes: LatLngTuple[][];
  source: {
    kind: "watercourse-reference";
    label: string;
    licence: string;
    sourceVersion: string;
    source: WatercourseSource;
  };
}

interface WatercourseHints {
  access: string | null;
  boat: string | null;
  canoe: string | null;
  operator: string | null;
  tidal: string | null;
  intermittent: string | null;
  lock: string | null;
  lockName: string | null;
  tunnel: string | null;
  bridge: string | null;
  towpath: string | null;
  wikidata: string | null;
  wikipedia: string | null;
}

interface WatercourseGeometryRow {
  source: WatercourseSource;
  source_id: string;
  name: string | null;
  source_version: string;
  licence: string;
  geometry_geojson: {
    type: "LineString" | "MultiLineString";
    coordinates: unknown;
  } | null;
}

interface WatercourseViewportRow {
  source: WatercourseSource;
  source_id: string;
  name: string | null;
  watercourse_type: string;
  form: string | null;
  flow_direction: string | null;
  source_version: string;
  licence: string;
  raw_properties: Record<string, unknown> | null;
  geometry_geojson: {
    type: "LineString" | "MultiLineString";
    coordinates: unknown;
  } | null;
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
  const source = readWatercourseSource(input.source, OSM_WATERWAY_SOURCE);

  if (route.length < 2) {
    throw new HttpError(400, "route must include at least two points.");
  }

  const watercourses = await listWatercourseGeometriesForRoute(
    route,
    maxDistanceM,
    source,
    client,
  );
  const graph = buildWatercourseGraph(watercourses);
  const snappedControls = route.map((point, index) =>
    snapControlPointToGraph(point, index, graph, maxDistanceM),
  );
  connectSnapControlsOnSharedSegments(graph, snappedControls);

  const matchedControls = snappedControls.filter(
    (control) => control.snap != null,
  );
  const matchedPoints = matchedControls.length;
  const snappedRoute = routeThroughSnappedControls(graph, snappedControls);
  const distances = matchedControls.map((control) => control.snap!.distanceM);
  const averageDistanceM = distances.length
    ? Math.round(distances.reduce((total, value) => total + value, 0) / distances.length)
    : null;
  const roundedMaxDistanceM = distances.length
    ? Math.round(Math.max(...distances))
    : null;
  const failedRoutePairs = countFailedRoutePairs(graph, snappedControls);
  const effectiveMatchedPoints = failedRoutePairs ? 0 : matchedPoints;
  const confidence = confidenceForSnap(
    effectiveMatchedPoints,
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
    route: failedRoutePairs || snappedRoute.length < 2 ? route : snappedRoute,
    matchedPoints: effectiveMatchedPoints,
    totalPoints: route.length,
    averageDistanceM,
    maxDistanceM: roundedMaxDistanceM,
    confidence,
    source: {
      kind: "watercourse-reference",
      label: sourceLabel(source),
      licence: sourceLicence(source),
      source,
    },
    warnings: failedRoutePairs
      ? [
          ...warnings,
          `${failedRoutePairs} route segment${
            failedRoutePairs === 1 ? "" : "s"
          } could not be traced through connected waterway geometry.`,
        ]
      : warnings,
    matches: snappedControls.map((control) => ({
      input: control.input,
      snapped: control.snap?.location ?? null,
      distanceM:
        control.snap?.distanceM == null
          ? null
          : Math.round(control.snap.distanceM),
      watercourseId: control.snap?.watercourseId ?? null,
      name: control.snap?.name ?? null,
    })),
  };
}

export async function listWatercoursesForViewport(
  input: WatercourseViewportInput,
  client: PoolClient | typeof pool = pool,
): Promise<ApiWatercourseFeature[]> {
  const bounds = readViewportBounds(input);
  const limit = readViewportLimit(input.limit);
  const simplifyTolerance = simplificationToleranceForZoom(input.zoom);
  const source = input.source ?? OSM_WATERWAY_SOURCE;

  const result = await client.query<WatercourseViewportRow>(
    `WITH bounds AS (
      SELECT
        ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom,
        ST_SetSRID(ST_MakePoint(($1 + $3) / 2.0, ($2 + $4) / 2.0), 4326) AS centre
    ),
    matches AS (
      SELECT
        wc.source,
        wc.source_id,
        wc.name,
        wc.watercourse_type,
        wc.form,
        wc.flow_direction,
        wc.source_version,
        wc.licence,
        wc.raw_properties,
        ST_CollectionExtract(ST_Intersection(wc.geometry, bounds.geom), 2) AS clipped_geometry,
        wc.geometry <-> bounds.centre AS distance_sort
      FROM watercourses wc, bounds
      WHERE wc.geometry && bounds.geom
        AND ST_Intersects(wc.geometry, bounds.geom)
        AND wc.source = $7
      ORDER BY distance_sort
      LIMIT $5
    )
    SELECT
      source_id,
      source,
      name,
      watercourse_type,
      form,
      flow_direction,
      source_version,
      licence,
      raw_properties,
      ST_AsGeoJSON(
        CASE
          WHEN $6::double precision > 0
            THEN ST_SimplifyPreserveTopology(clipped_geometry, $6::double precision)
          ELSE clipped_geometry
        END
      )::json AS geometry_geojson
    FROM matches
    WHERE NOT ST_IsEmpty(clipped_geometry)`,
    [
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
      limit,
      simplifyTolerance,
      source,
    ],
  );

  return result.rows.flatMap((row) => {
    const routes = routesFromGeoJson(row.geometry_geojson);

    if (!routes.length) {
      return [];
    }

    return [
      {
        id: row.source_id,
        name: row.name,
        watercourseType: row.watercourse_type,
        form: row.form,
        flowDirection: row.flow_direction,
        hints: watercourseHints(row.raw_properties),
        routes,
        source: {
          kind: "watercourse-reference",
          label: sourceLabel(row.source),
          licence: row.licence || sourceLicence(row.source),
          sourceVersion: row.source_version,
          source: row.source,
        },
      },
    ];
  });
}

function watercourseHints(
  properties: Record<string, unknown> | null,
): WatercourseHints {
  return {
    access: readPropertyText(properties, "access"),
    boat: readPropertyText(properties, "boat"),
    canoe: readPropertyText(properties, "canoe"),
    operator: readPropertyText(properties, "operator"),
    tidal: readPropertyText(properties, "tidal"),
    intermittent: readPropertyText(properties, "intermittent"),
    lock: readPropertyText(properties, "lock"),
    lockName: readPropertyText(properties, "lock_name"),
    tunnel: readPropertyText(properties, "tunnel"),
    bridge: readPropertyText(properties, "bridge"),
    towpath: readPropertyText(properties, "towpath"),
    wikidata: readPropertyText(properties, "wikidata"),
    wikipedia: readPropertyText(properties, "wikipedia"),
  };
}

function readPropertyText(
  properties: Record<string, unknown> | null,
  key: string,
) {
  const value = properties?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function listWatercourseGeometriesForRoute(
  route: LatLngTuple[],
  maxDistanceM: number,
  source: WatercourseSource,
  client: PoolClient | typeof pool,
): Promise<WatercourseGeometryRow[]> {
  const bounds = boundsForRoute(route, maxDistanceM);

  const result = await client.query<WatercourseGeometryRow>(
    `WITH bounds AS (
      SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom
    )
    SELECT
      wc.source,
      wc.source_id,
      wc.name,
      wc.source_version,
      wc.licence,
      ST_AsGeoJSON(wc.geometry)::json AS geometry_geojson
    FROM watercourses wc, bounds
    WHERE wc.source = $5
      AND wc.geometry && bounds.geom
      AND ST_Intersects(wc.geometry, bounds.geom)
    LIMIT 2500`,
    [
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
      source,
    ],
  );

  return result.rows;
}

interface GraphSegment {
  key: string;
  from: string;
  to: string;
  fromPoint: LatLngTuple;
  toPoint: LatLngTuple;
  watercourseId: string;
  name: string | null;
}

interface GraphEdge {
  to: string;
  weight: number;
  route: LatLngTuple[];
}

interface WatercourseGraph {
  nodes: Map<string, LatLngTuple>;
  edges: Map<string, GraphEdge[]>;
  segments: GraphSegment[];
}

interface SnappedControl {
  input: LatLngTuple;
  nodeKey: string | null;
  snap: {
    location: LatLngTuple;
    distanceM: number;
    segmentKey: string;
    fraction: number;
    watercourseId: string;
    name: string | null;
  } | null;
}

function buildWatercourseGraph(rows: WatercourseGeometryRow[]): WatercourseGraph {
  const graph: WatercourseGraph = {
    nodes: new Map(),
    edges: new Map(),
    segments: [],
  };

  rows.forEach((row) => {
    routesFromGeoJson(row.geometry_geojson).forEach((line, lineIndex) => {
      for (let index = 0; index < line.length - 1; index += 1) {
        const fromPoint = line[index];
        const toPoint = line[index + 1];

        if (sameLocation(fromPoint, toPoint)) {
          continue;
        }

        const from = pointKey(fromPoint);
        const to = pointKey(toPoint);
        const weight = distanceMetres(fromPoint, toPoint);
        const segment: GraphSegment = {
          key: `${row.source_id}:${lineIndex}:${index}`,
          from,
          to,
          fromPoint,
          toPoint,
          watercourseId: row.source_id,
          name: row.name,
        };

        graph.nodes.set(from, fromPoint);
        graph.nodes.set(to, toPoint);
        graph.segments.push(segment);
        addEdge(graph, from, to, weight, [fromPoint, toPoint]);
        addEdge(graph, to, from, weight, [toPoint, fromPoint]);
      }
    });
  });

  return graph;
}

function snapControlPointToGraph(
  input: LatLngTuple,
  index: number,
  graph: WatercourseGraph,
  maxDistanceM: number,
): SnappedControl {
  let best:
    | {
        segment: GraphSegment;
        location: LatLngTuple;
        distanceM: number;
        fraction: number;
      }
    | null = null;

  for (const segment of graph.segments) {
    const projection = projectPointToSegment(input, segment.fromPoint, segment.toPoint);

    if (!best || projection.distanceM < best.distanceM) {
      best = { segment, ...projection };
    }
  }

  if (!best || best.distanceM > maxDistanceM) {
    return { input, nodeKey: null, snap: null };
  }

  const nodeKey = `snap:${index}`;
  graph.nodes.set(nodeKey, best.location);
  addEdge(
    graph,
    nodeKey,
    best.segment.from,
    distanceMetres(best.location, best.segment.fromPoint),
    [best.location, best.segment.fromPoint],
  );
  addEdge(
    graph,
    best.segment.from,
    nodeKey,
    distanceMetres(best.segment.fromPoint, best.location),
    [best.segment.fromPoint, best.location],
  );
  addEdge(
    graph,
    nodeKey,
    best.segment.to,
    distanceMetres(best.location, best.segment.toPoint),
    [best.location, best.segment.toPoint],
  );
  addEdge(
    graph,
    best.segment.to,
    nodeKey,
    distanceMetres(best.segment.toPoint, best.location),
    [best.segment.toPoint, best.location],
  );

  return {
    input,
    nodeKey,
    snap: {
      location: best.location,
      distanceM: best.distanceM,
      segmentKey: best.segment.key,
      fraction: best.fraction,
      watercourseId: best.segment.watercourseId,
      name: best.segment.name,
    },
  };
}

function connectSnapControlsOnSharedSegments(
  graph: WatercourseGraph,
  controls: SnappedControl[],
) {
  const bySegment = new Map<string, Array<{ control: SnappedControl; point: LatLngTuple }>>();

  controls.forEach((control) => {
    if (!control.nodeKey || !control.snap) {
      return;
    }

    const current = bySegment.get(control.snap.segmentKey) ?? [];
    current.push({ control, point: control.snap.location });
    bySegment.set(control.snap.segmentKey, current);
  });

  bySegment.forEach((segmentControls) => {
    for (let leftIndex = 0; leftIndex < segmentControls.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < segmentControls.length;
        rightIndex += 1
      ) {
        const left = segmentControls[leftIndex];
        const right = segmentControls[rightIndex];

        if (!left.control.nodeKey || !right.control.nodeKey) {
          continue;
        }

        const weight = distanceMetres(left.point, right.point);
        addEdge(graph, left.control.nodeKey, right.control.nodeKey, weight, [
          left.point,
          right.point,
        ]);
        addEdge(graph, right.control.nodeKey, left.control.nodeKey, weight, [
          right.point,
          left.point,
        ]);
      }
    }
  });
}

function routeThroughSnappedControls(
  graph: WatercourseGraph,
  controls: SnappedControl[],
): LatLngTuple[] {
  const output: LatLngTuple[] = [];

  for (let index = 0; index < controls.length - 1; index += 1) {
    const from = controls[index];
    const to = controls[index + 1];

    if (!from.nodeKey || !to.nodeKey) {
      appendRoutePoints(output, [
        from.snap?.location ?? from.input,
        to.snap?.location ?? to.input,
      ]);
      continue;
    }

    const routed = shortestPathRoute(graph, from.nodeKey, to.nodeKey);
    appendRoutePoints(output, routed ?? [from.snap!.location, to.snap!.location]);
  }

  return output;
}

function countFailedRoutePairs(
  graph: WatercourseGraph,
  controls: SnappedControl[],
): number {
  let failed = 0;

  for (let index = 0; index < controls.length - 1; index += 1) {
    const from = controls[index].nodeKey;
    const to = controls[index + 1].nodeKey;

    if (!from || !to || !shortestPathRoute(graph, from, to)) {
      failed += 1;
    }
  }

  return failed;
}

function shortestPathRoute(
  graph: WatercourseGraph,
  start: string,
  finish: string,
): LatLngTuple[] | null {
  const distances = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, { node: string; edge: GraphEdge }>();
  const unvisited = new Set(graph.nodes.keys());

  while (unvisited.size) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    unvisited.forEach((node) => {
      const distance = distances.get(node) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        current = node;
        currentDistance = distance;
      }
    });

    if (!current || currentDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    unvisited.delete(current);

    if (current === finish) {
      break;
    }

    (graph.edges.get(current) ?? []).forEach((edge) => {
      if (!unvisited.has(edge.to)) {
        return;
      }

      const nextDistance = currentDistance + edge.weight;

      if (nextDistance < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, { node: current!, edge });
      }
    });
  }

  if (!distances.has(finish)) {
    return null;
  }

  const edgeRoutes: LatLngTuple[][] = [];
  let current = finish;

  while (current !== start) {
    const step = previous.get(current);
    if (!step) {
      return null;
    }

    edgeRoutes.unshift(step.edge.route);
    current = step.node;
  }

  const route: LatLngTuple[] = [];
  edgeRoutes.forEach((edgeRoute) => appendRoutePoints(route, edgeRoute));
  return route;
}

function appendRoutePoints(target: LatLngTuple[], points: LatLngTuple[]) {
  points.forEach((point) => {
    const previous = target[target.length - 1];
    if (!previous || !sameLocation(previous, point)) {
      target.push(point);
    }
  });
}

function addEdge(
  graph: WatercourseGraph,
  from: string,
  to: string,
  weight: number,
  route: LatLngTuple[],
) {
  const edges = graph.edges.get(from) ?? [];
  edges.push({ to, weight, route });
  graph.edges.set(from, edges);
}

function projectPointToSegment(
  point: LatLngTuple,
  from: LatLngTuple,
  to: LatLngTuple,
) {
  const origin = point;
  const fromXY = toLocalMetres(from, origin);
  const toXY = toLocalMetres(to, origin);
  const dx = toXY.x - fromXY.x;
  const dy = toXY.y - fromXY.y;
  const lengthSquared = dx * dx + dy * dy;
  const fraction =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, -(fromXY.x * dx + fromXY.y * dy) / lengthSquared));
  const projected: LatLngTuple = [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction,
  ];

  return {
    location: projected,
    distanceM: distanceMetres(point, projected),
    fraction,
  };
}

function boundsForRoute(route: LatLngTuple[], bufferM: number) {
  const buffer = Math.max(bufferM, 250) * DEGREE_BUFFER_PER_METRE;
  const lats = route.map((point) => point[0]);
  const lngs = route.map((point) => point[1]);

  return {
    minLat: Math.min(...lats) - buffer,
    maxLat: Math.max(...lats) + buffer,
    minLng: Math.min(...lngs) - buffer,
    maxLng: Math.max(...lngs) + buffer,
  };
}

function pointKey(point: LatLngTuple) {
  return `${point[0].toFixed(GRAPH_NODE_PRECISION)},${point[1].toFixed(
    GRAPH_NODE_PRECISION,
  )}`;
}

function sameLocation(left: LatLngTuple, right: LatLngTuple) {
  return pointKey(left) === pointKey(right);
}

function distanceMetres(left: LatLngTuple, right: LatLngTuple) {
  const earthRadiusM = 6_371_000;
  const leftLat = toRadians(left[0]);
  const rightLat = toRadians(right[0]);
  const latDelta = toRadians(right[0] - left[0]);
  const lngDelta = toRadians(right[1] - left[1]);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(leftLat) *
      Math.cos(rightLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toLocalMetres(point: LatLngTuple, origin: LatLngTuple) {
  const meanLat = toRadians((point[0] + origin[0]) / 2);

  return {
    x: (point[1] - origin[1]) * 111_320 * Math.cos(meanLat),
    y: (point[0] - origin[0]) * 111_320,
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function readViewportBounds(input: WatercourseViewportInput) {
  const minLng = Number(input.minLng);
  const minLat = Number(input.minLat);
  const maxLng = Number(input.maxLng);
  const maxLat = Number(input.maxLat);

  if (
    !Number.isFinite(minLng) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLng) ||
    !Number.isFinite(maxLat) ||
    minLng < -180 ||
    maxLng > 180 ||
    minLat < -90 ||
    maxLat > 90 ||
    minLng >= maxLng ||
    minLat >= maxLat
  ) {
    throw new HttpError(400, "bbox must be minLng,minLat,maxLng,maxLat.");
  }

  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;

  if (lngSpan > 12 || latSpan > 12) {
    throw new HttpError(400, "bbox is too large for watercourse overlay.");
  }

  return { minLng, minLat, maxLng, maxLat };
}

function readViewportLimit(value: number | null): number {
  if (value == null || !Number.isFinite(value)) {
    return 500;
  }

  return Math.max(50, Math.min(Math.round(value), 900));
}

function simplificationToleranceForZoom(zoom: number | null): number {
  if (zoom == null || !Number.isFinite(zoom)) {
    return 0.00045;
  }

  if (zoom <= 7) {
    return 0.0012;
  }

  if (zoom <= 9) {
    return 0.00065;
  }

  if (zoom <= 11) {
    return 0.00028;
  }

  if (zoom <= 13) {
    return 0.00008;
  }

  return 0;
}

function routesFromGeoJson(
  geometry: WatercourseViewportRow["geometry_geojson"],
): LatLngTuple[][] {
  if (!geometry) {
    return [];
  }

  if (geometry.type === "LineString") {
    const line = lineFromCoordinates(geometry.coordinates);
    return line.length >= 2 ? [line] : [];
  }

  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates
      .map(lineFromCoordinates)
      .filter((line) => line.length >= 2);
  }

  return [];
}

function lineFromCoordinates(coordinates: unknown): LatLngTuple[] {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return [];
    }

    const lng = Number(coordinate[0]);
    const lat = Number(coordinate[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    return [[lat, lng] as LatLngTuple];
  });
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

function sourceLabel(_source: WatercourseSource) {
  return "OSM waterway geometry";
}

function sourceLicence(_source: WatercourseSource) {
  return "Open Database Licence";
}

function warningsForSnap(
  matchedPoints: number,
  totalPoints: number,
  confidence: ApiRouteSnapResult["confidence"],
  averageDistanceM: number | null,
  maxDistanceM: number | null,
) {
  const warnings: string[] = [
    "Waterway snapping is a preview aid only; it does not confirm paddleability, access, safety, grade, or current conditions.",
  ];

  if (matchedPoints < totalPoints) {
    warnings.push(
      `${totalPoints - matchedPoints} trace point${
        totalPoints - matchedPoints === 1 ? "" : "s"
      } could not be matched to a nearby waterway.`,
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

function readWatercourseSource(
  value: unknown,
  fallback: WatercourseSource,
): WatercourseSource {
  if (value === OSM_WATERWAY_SOURCE) {
    return value as WatercourseSource;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
