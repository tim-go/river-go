import type { MapPoiDisplayCategory } from "../appCore";

// The points-style tabs on the river detail panel. (Levels/Photos/About are not
// POI tabs and so are not represented here.)
export type RiverPoiTab = "rapids" | "hazards" | "access";

// Which POI display categories surface under each points-style tab. Together
// these must partition MapPoiDisplayCategory — every category belongs to exactly
// one tab — so no reviewed point can fall through and vanish from the UI. The
// partition is locked by riverPoiTabs.test.ts.
export const RIVER_TAB_POI_CATEGORIES: Record<
  RiverPoiTab,
  MapPoiDisplayCategory[]
> = {
  rapids: ["rapid", "whitewater", "feature"],
  hazards: ["weir", "dam", "waterfall", "lock", "structure", "hazard"],
  access: ["access", "navigation", "utility", "gauge"],
};

// Keyed by every MapPoiDisplayCategory: the compiler rejects this object if the
// union gains or loses a member, so ALL_MAP_POI_DISPLAY_CATEGORIES stays an exact
// runtime mirror of the type for the partition test to check the tabs against.
// (Importing the type is erased at runtime, so this module stays Leaflet-free and
// unit-testable, unlike appCore.)
const CATEGORY_PRESENCE: Record<MapPoiDisplayCategory, true> = {
  rapid: true,
  whitewater: true,
  weir: true,
  dam: true,
  waterfall: true,
  lock: true,
  structure: true,
  access: true,
  navigation: true,
  utility: true,
  hazard: true,
  gauge: true,
  feature: true,
};

export const ALL_MAP_POI_DISPLAY_CATEGORIES = Object.keys(
  CATEGORY_PRESENCE,
) as MapPoiDisplayCategory[];
