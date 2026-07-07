import type {
  NearestRiver,
  NearestRiversResult,
} from "../services/canonicalRiverApi";

// Corridor half-width (metres) around a river's line within which a dropped
// point is attributed to that river. On-water features hug the line; amenities
// (car parks, campsites) legitimately sit further back. See
// docs/specs/discovery/river-attribution.md.
export const CORRIDOR_METERS = {
  feature: 250,
  amenity: 600,
} as const;

export type AttributionConfidence = "confirmed" | "proposed" | "off-river";

export interface RiverResolution {
  // null = off-river (river_id NULL).
  river: NearestRiver | null;
  confidence: AttributionConfidence;
}

// Geometry proposes, the human confirms, selection is only a hint:
// - selected river within its corridor → keep it (confirmed);
// - else nearest river within corridor → propose switching (proposed);
// - else off-river.
export function resolveRiverForPoint(
  result: NearestRiversResult,
  corridorMeters: number,
): RiverResolution {
  const { nearest, selected } = result;
  if (selected && selected.meters <= corridorMeters) {
    return { river: selected, confidence: "confirmed" };
  }
  const proposed = nearest.find((r) => r.meters <= corridorMeters);
  if (proposed) {
    return { river: proposed, confidence: "proposed" };
  }
  return { river: null, confidence: "off-river" };
}
