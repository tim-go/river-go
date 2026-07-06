import { describe, expect, it } from "vitest";
import { entityFamily, poiDetailSections } from "./entityCapabilities";
import type { SelectedPoi } from "../types";

// Only the fields the classifier reads matter here.
const sel = (partial: Partial<SelectedPoi>) => partial as SelectedPoi;

describe("entityFamily", () => {
  it("classifies features, contributions and photos", () => {
    expect(entityFamily(sel({ kind: "hazard", mapPoi: {} as never }))).toBe(
      "feature",
    );
    expect(entityFamily(sel({ kind: "contribution", contributionType: "report" }))).toBe(
      "contribution",
    );
    expect(entityFamily(sel({ kind: "contribution", contributionType: "photo" }))).toBe(
      "photo",
    );
  });
});

describe("poiDetailSections", () => {
  // Behaviour-preservation: today features and contributions/photos both show
  // details · location · verification · photos.
  it("keeps the existing four sections for features and contributions", () => {
    for (const poi of [
      sel({ kind: "feature", mapPoi: {} as never }),
      sel({ kind: "contribution", contributionType: "report" }),
      sel({ kind: "contribution", contributionType: "photo" }),
    ]) {
      expect(poiDetailSections(poi)).toEqual([
        "details",
        "location",
        "verification",
        "photos",
      ]);
    }
  });

  it("gives amenities details·location·photos (no verification)", () => {
    expect(entityFamily(sel({ kind: "feature", entityKind: "amenity" }))).toBe(
      "amenity",
    );
    expect(poiDetailSections(sel({ kind: "feature", entityKind: "amenity" }))).toEqual([
      "details",
      "location",
      "photos",
    ]);
  });

  it("gives stations details·location", () => {
    expect(poiDetailSections(sel({ kind: "gauge", entityKind: "station" }))).toEqual([
      "details",
      "location",
    ]);
  });
});
