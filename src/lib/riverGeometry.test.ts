import { describe, expect, it } from "vitest";
import type { LatLngTuple } from "../types";
import {
  pathBounds,
  segmentIntersectsBounds,
  simplifyPath,
  toleranceForZoom,
} from "./riverGeometry";

describe("pathBounds", () => {
  it("returns null for an empty path", () => {
    expect(pathBounds([])).toBeNull();
  });

  it("computes the axis-aligned bounds", () => {
    const path: LatLngTuple[] = [
      [52, -3],
      [53, -1],
      [51, -2],
    ];
    expect(pathBounds(path)).toEqual({
      minLat: 51,
      maxLat: 53,
      minLng: -3,
      maxLng: -1,
    });
  });
});

describe("segmentIntersectsBounds", () => {
  const viewport = { minLat: 52, minLng: -3, maxLat: 53, maxLng: -2 };

  it("keeps a segment whose box overlaps the viewport", () => {
    const path: LatLngTuple[] = [
      [52.4, -2.6],
      [52.6, -2.4],
    ];
    expect(segmentIntersectsBounds(path, viewport)).toBe(true);
  });

  it("drops a segment entirely outside the viewport", () => {
    const path: LatLngTuple[] = [
      [40, 10],
      [41, 11],
    ];
    expect(segmentIntersectsBounds(path, viewport)).toBe(false);
  });

  it("keeps a segment that merely crosses the viewport (box overlap)", () => {
    // Endpoints sit outside on opposite sides, but the segment passes through.
    const path: LatLngTuple[] = [
      [52.5, -4],
      [52.5, -1],
    ];
    expect(segmentIntersectsBounds(path, viewport)).toBe(true);
  });

  it("drops an empty path", () => {
    expect(segmentIntersectsBounds([], viewport)).toBe(false);
  });
});

describe("toleranceForZoom", () => {
  it("returns 0 at street-level zoom and above", () => {
    expect(toleranceForZoom(13)).toBe(0);
    expect(toleranceForZoom(16)).toBe(0);
  });

  it("returns 0 for a non-finite zoom", () => {
    expect(toleranceForZoom(Number.NaN)).toBe(0);
  });

  it("grows as zoom decreases", () => {
    expect(toleranceForZoom(11)).toBeGreaterThan(toleranceForZoom(12));
    expect(toleranceForZoom(7)).toBeGreaterThan(toleranceForZoom(11));
  });

  it("clamps at very low zoom", () => {
    expect(toleranceForZoom(1)).toBeLessThanOrEqual(0.05);
  });
});

describe("simplifyPath", () => {
  it("returns the input unchanged when tolerance is zero", () => {
    const path: LatLngTuple[] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    expect(simplifyPath(path, 0)).toBe(path);
  });

  it("keeps paths of two or fewer points", () => {
    const path: LatLngTuple[] = [
      [0, 0],
      [0, 1],
    ];
    expect(simplifyPath(path, 0.5)).toBe(path);
  });

  it("drops near-collinear interior points", () => {
    // Middle point is a tiny wobble off the straight line — within tolerance.
    const path: LatLngTuple[] = [
      [0, 0],
      [0.0001, 1],
      [0, 2],
    ];
    expect(simplifyPath(path, 0.01)).toEqual([
      [0, 0],
      [0, 2],
    ]);
  });

  it("retains a point that deviates beyond the tolerance", () => {
    const path: LatLngTuple[] = [
      [0, 0],
      [1, 1],
      [0, 2],
    ];
    expect(simplifyPath(path, 0.5)).toEqual(path);
  });

  it("always preserves the endpoints", () => {
    const path: LatLngTuple[] = [
      [0, 0],
      [0.001, 1],
      [0.002, 2],
      [0.001, 3],
      [0, 4],
    ];
    const simplified = simplifyPath(path, 1);
    expect(simplified[0]).toEqual([0, 0]);
    expect(simplified[simplified.length - 1]).toEqual([0, 4]);
  });
});
