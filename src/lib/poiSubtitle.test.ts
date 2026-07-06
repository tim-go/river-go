import { describe, expect, it } from "vitest";
import { humanisePoiSubtitle, poiTypeSubtitle } from "./poiSubtitle";

describe("humanisePoiSubtitle", () => {
  it("humanises OSM waterway tags", () => {
    expect(humanisePoiSubtitle("waterway=rapids")).toBe("Rapids");
    expect(humanisePoiSubtitle("waterway=weir")).toBe("Weir");
    expect(humanisePoiSubtitle("waterway=lock gate")).toBe("Lock gate");
    expect(humanisePoiSubtitle("natural=waterfall")).toBe("Waterfall");
    expect(humanisePoiSubtitle("some_type=lock_gate")).toBe("Lock gate");
  });

  it("passes non-tag subtitles through", () => {
    expect(humanisePoiSubtitle("Gauge")).toBe("Gauge");
    expect(humanisePoiSubtitle("Community hazard · Wye")).toBe(
      "Community hazard · Wye",
    );
    expect(humanisePoiSubtitle("")).toBe("");
  });
});

describe("poiTypeSubtitle", () => {
  it("collapses a redundant type into the label", () => {
    expect(poiTypeSubtitle("Rapids", "waterway=rapids")).toBe("Rapids");
    expect(poiTypeSubtitle("Dams", "waterway=dam")).toBe("Dams");
  });

  it("keeps a distinct type", () => {
    expect(poiTypeSubtitle("Hazards", "waterway=weir")).toBe("Hazards · Weir");
    expect(poiTypeSubtitle("Access", "waterway=lock gate")).toBe(
      "Access · Lock gate",
    );
  });

  it("falls back to the label when there is no subtitle", () => {
    expect(poiTypeSubtitle("Rapids", "")).toBe("Rapids");
  });
});
