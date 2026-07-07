import { describe, expect, it } from "vitest";
import {
  humanisePoiSubtitle,
  humanisePoiSummary,
  humanisePoiTitle,
  poiTypeSubtitle,
} from "./poiSubtitle";

describe("humanisePoiTitle", () => {
  it("humanises unnamed source-candidate titles to their type", () => {
    expect(humanisePoiTitle("weir candidate way/154113044")).toBe("Weir");
    expect(humanisePoiTitle("weir candidate node/7676616264")).toBe("Weir");
  });
  it("passes real names through", () => {
    expect(humanisePoiTitle("Cafe Wave")).toBe("Cafe Wave");
    expect(humanisePoiTitle("Afon Tryweryn")).toBe("Afon Tryweryn");
    expect(humanisePoiTitle("")).toBe("");
  });
});

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

describe("humanisePoiSummary", () => {
  it("rewords source-derived summaries", () => {
    expect(
      humanisePoiSummary(
        "Source-derived whitewater-section candidate promoted by moderation. Grade/tag: 3.",
      ),
    ).toBe("Grade 3 whitewater section.");
    expect(
      humanisePoiSummary(
        "Source-derived waterway=dam candidate promoted by moderation. Operator: Scottish Hydro.",
      ),
    ).toBe("Dam operated by Scottish Hydro.");
    expect(
      humanisePoiSummary(
        "Source-derived waterway=weir candidate promoted by moderation. Grade/tag: 4.",
      ),
    ).toBe("Grade 4 weir.");
    expect(
      humanisePoiSummary(
        "Source-derived waterway=waterfall candidate promoted by moderation.",
      ),
    ).toBe("Waterfall.");
  });

  it("drops non-informative grade tags", () => {
    expect(
      humanisePoiSummary(
        "Source-derived rapids candidate promoted by moderation. Grade/tag: yes.",
      ),
    ).toBe("Rapids.");
  });

  it("passes non-matching summaries through", () => {
    expect(humanisePoiSummary("Community hazard reported by a paddler.")).toBe(
      "Community hazard reported by a paddler.",
    );
    expect(humanisePoiSummary("")).toBe("");
  });
});
