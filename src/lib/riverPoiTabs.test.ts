import { describe, expect, it } from "vitest";
import {
  ALL_MAP_POI_DISPLAY_CATEGORIES,
  RIVER_TAB_POI_CATEGORIES,
} from "./riverPoiTabs";

// The river detail panel splits reviewed points across the Rapids/Hazards/Access
// tabs by display category. If a category isn't assigned to a tab, its points
// silently disappear from every tab; if it's assigned to two, they show twice.
// These tests lock the category→tab mapping as a true partition.
describe("RIVER_TAB_POI_CATEGORIES", () => {
  const grouped = Object.values(RIVER_TAB_POI_CATEGORIES).flat();

  it("assigns each display category to at most one tab (no duplicates)", () => {
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("covers every display category (nothing can vanish from the tabs)", () => {
    expect([...grouped].sort()).toEqual(
      [...ALL_MAP_POI_DISPLAY_CATEGORIES].sort(),
    );
  });
});
