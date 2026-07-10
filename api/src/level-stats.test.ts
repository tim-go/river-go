import { describe, expect, it } from "vitest";
import { percentileFromQuantiles } from "./observations.js";

// 99-point grid for a uniform 0.01..0.99 distribution — quantile k = k/100.
const uniformGrid = Array.from({ length: 99 }, (_, i) => (i + 1) / 100);

describe("percentileFromQuantiles", () => {
  it("returns null without a grid or value", () => {
    expect(percentileFromQuantiles(null, 0.5)).toBeNull();
    expect(percentileFromQuantiles([], 0.5)).toBeNull();
    expect(percentileFromQuantiles(uniformGrid, null)).toBeNull();
  });

  it("places values within the grid to ~1%", () => {
    expect(percentileFromQuantiles(uniformGrid, 0.505)).toBeCloseTo(0.5, 1);
    expect(percentileFromQuantiles(uniformGrid, 0.105)).toBeCloseTo(0.1, 1);
    expect(percentileFromQuantiles(uniformGrid, 0.905)).toBeCloseTo(0.9, 1);
  });

  it("clamps below and above the observed range", () => {
    expect(percentileFromQuantiles(uniformGrid, -5)).toBe(0);
    expect(percentileFromQuantiles(uniformGrid, 99)).toBeCloseTo(0.99, 2);
  });

  it("maps band thresholds sensibly (25/75/90)", () => {
    // A dry-summer reading just under q25 classifies low; just over q90 very-high.
    expect(percentileFromQuantiles(uniformGrid, 0.24)!).toBeLessThan(0.25);
    expect(percentileFromQuantiles(uniformGrid, 0.91)!).toBeGreaterThanOrEqual(
      0.9,
    );
  });

  it("treats ties conservatively (flat gauges stay low, not high)", () => {
    const flat = Array.from({ length: 99 }, () => 0.4);
    expect(percentileFromQuantiles(flat, 0.4)).toBe(0);
    expect(percentileFromQuantiles(flat, 0.41)).toBeCloseTo(0.99, 2);
  });
});
