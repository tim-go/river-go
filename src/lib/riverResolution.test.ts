import { describe, expect, it } from "vitest";
import { resolveRiverForPoint } from "./riverResolution";

const R = (id: string, meters: number) => ({ id, displayName: id, meters });

describe("resolveRiverForPoint", () => {
  it("keeps the selected river when it's within its corridor (even if a closer one exists)", () => {
    const res = resolveRiverForPoint(
      { nearest: [R("b", 40), R("a", 120)], selected: R("a", 120) },
      250,
    );
    expect(res).toEqual({ river: R("a", 120), confidence: "confirmed" });
  });

  it("proposes the nearest river when the selected one is outside its corridor", () => {
    // selected river far (stale selection), point actually sits on 'b'
    const res = resolveRiverForPoint(
      { nearest: [R("b", 90), R("c", 15000)], selected: R("a", 94000) },
      250,
    );
    expect(res).toEqual({ river: R("b", 90), confidence: "proposed" });
  });

  it("returns off-river when nothing is within the corridor", () => {
    const res = resolveRiverForPoint(
      { nearest: [R("teifi", 75473)], selected: null },
      250,
    );
    expect(res).toEqual({ river: null, confidence: "off-river" });
  });

  it("respects a wider corridor (amenity)", () => {
    const point = { nearest: [R("a", 500)], selected: null };
    expect(resolveRiverForPoint(point, 250).confidence).toBe("off-river");
    expect(resolveRiverForPoint(point, 600)).toEqual({
      river: R("a", 500),
      confidence: "proposed",
    });
  });
});
