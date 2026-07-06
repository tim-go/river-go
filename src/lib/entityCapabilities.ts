// The capability model for map-entity detail surfaces (see
// /docs/specs/map-entity-surfaces.md). A selected entity is classified into a
// "family", and each family declares which detail-panel sections it exposes.
// New first-class types (amenity, station) plug in here rather than adding
// bespoke branches in PoiDetailPanel.
import type { PoiDetailsTab, SelectedPoi } from "../types";

export type EntityFamily =
  | "feature"
  | "contribution"
  | "photo"
  | "amenity"
  | "station";

// Classify a SelectedPoi into its family. Today only features and
// contributions/photos open the shared panel; amenity/station discriminators
// are added when their click paths are routed here (Phase 2).
export function entityFamily(poi: SelectedPoi): EntityFamily {
  if (poi.entityKind === "amenity") return "amenity";
  if (poi.entityKind === "station") return "station";
  if (poi.kind === "contribution") {
    return poi.contributionType === "photo" ? "photo" : "contribution";
  }
  return "feature";
}

// Which detail sections each family exposes, in display order. Feature /
// contribution / photo reproduce today's tabs (details · location · verify ·
// photos) exactly. Amenity / station are declared ahead of their wiring so the
// section list is the single source of truth.
const FAMILY_SECTIONS: Record<EntityFamily, PoiDetailsTab[]> = {
  feature: ["details", "location", "verification", "photos"],
  contribution: ["details", "location", "verification", "photos"],
  photo: ["details", "location", "verification", "photos"],
  amenity: ["details", "location", "photos"],
  station: ["details", "location"],
};

// The ordered set of detail-panel sections to show for this entity.
export function poiDetailSections(poi: SelectedPoi): PoiDetailsTab[] {
  return FAMILY_SECTIONS[entityFamily(poi)];
}
