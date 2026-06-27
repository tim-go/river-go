import type { LatLngTuple } from "../types";

// Geometry helpers for the map's river-line layer. Kept pure (no Leaflet, no
// DOM) so they're cheap to unit-test and reuse: the map effect feeds them the
// current viewport + zoom and gets back only the lines worth drawing, at a
// detail level the zoom can actually show.

export interface GeoBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

// Axis-aligned bounding box of a polyline. Returns null for empty input so
// callers can skip it cheaply.
export function pathBounds(points: LatLngTuple[]): GeoBounds | null {
  if (points.length === 0) {
    return null;
  }
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, minLng, maxLat, maxLng };
}

// Conservative viewport cull: do the segment's and the viewport's bounding
// boxes overlap at all? A box-vs-box test can keep a few segments that don't
// truly cross the viewport, but it never drops one that does — exactly the
// safe side to err on for a visual layer.
export function segmentIntersectsBounds(
  points: LatLngTuple[],
  bounds: GeoBounds,
): boolean {
  const box = pathBounds(points);
  if (!box) {
    return false;
  }
  return (
    box.minLat <= bounds.maxLat &&
    box.maxLat >= bounds.minLat &&
    box.minLng <= bounds.maxLng &&
    box.maxLng >= bounds.minLng
  );
}

// Simplification tolerance (in degrees) for a given map zoom. The backend
// already simplifies to ~0.0001° on read, so this is a second, zoom-aware pass:
// aggressive when zoomed out (the screen can't show the detail anyway), and
// zero past street level so the full geometry returns when it's actually
// visible. Each zoom level out roughly doubles the ground distance per pixel,
// so the tolerance doubles to match.
export function toleranceForZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom >= 13) {
    return 0;
  }
  const tolerance = 0.0006 * 2 ** (12 - zoom);
  // Clamp so a very low zoom can't collapse a river to a single straight line.
  return Math.min(tolerance, 0.05);
}

// Perpendicular distance from `point` to the line through `start`–`end`, in
// degree space. Latitude/longitude aren't isotropic, but at a single river's
// scale the distortion is negligible for a visual simplification threshold.
function perpendicularDistance(
  point: LatLngTuple,
  start: LatLngTuple,
  end: LatLngTuple,
): number {
  const [py, px] = point;
  const [ay, ax] = start;
  const [by, bx] = end;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  // Area of the parallelogram / length of the base = perpendicular height.
  const area = Math.abs(dx * (ay - py) - dy * (ax - px));
  return area / Math.hypot(dx, dy);
}

// Ramer–Douglas–Peucker line simplification. Iterative (explicit stack) so a
// long, dense segment can't blow the call stack on a low-powered device.
export function simplifyPath(
  points: LatLngTuple[],
  tolerance: number,
): LatLngTuple[] {
  if (tolerance <= 0 || points.length <= 2) {
    return points;
  }

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistance(
        points[i],
        points[first],
        points[last],
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > tolerance && index !== -1) {
      keep[index] = true;
      stack.push([first, index]);
      stack.push([index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}
