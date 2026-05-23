---
roadmap_core_feature_group: Core Map
roadmap_core_feature_item: River Section Map
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Trial
---

# River Section Map

**Work state:** Active
**Last updated:** 2026-05-23
**Scope:** The map, section list, route traces, markers, and selected-section panel for browsing river sections.

## Purpose

The map lets users browse river sections, inspect traced routes, and understand where access points, hazards, gauges, features, and community contributions sit relative to the river.

The map is the primary workspace. The section list and right-hand panel are supporting surfaces.

## Product Role

- `Primary user objective:` Choose and inspect a river section using a route-aware map.
- `Classification:` Core
- `Loop step:` Choose
- `Why this matters:` River Go's core unit is the river section. If users cannot quickly orient themselves on the map, the community data model will not be trusted.

## References

- `/docs/specs/release/demo-prototype.md`
- `/docs/specs/data/river-wye-seed-data.md`
- `/docs/specs/data/river-tryweryn-seed-data.md`
- `/docs/specs/community/community-contributions.md`
- `/src/App.tsx`
- `/src/data/wyeRouteTraces.ts`
- `/src/data/trywerynRouteTraces.ts`

## Requirements

The map must display:

- river section route polylines
- section centre markers
- access markers
- hazard markers
- feature markers
- gauge markers
- saved contribution markers
- draft contribution marker

Selecting a section from the left list must fit the map to that section's route bounds.

Clicking markers must not unexpectedly zoom out or recenter the map.

Marker popups/tooltips must make clicked objects understandable.

River Wye route traces are generated from OpenStreetMap River Wye waterway geometry through `/scripts/generateWyeRouteTraces.mjs` and stored in `/src/data/wyeRouteTraces.ts`.

The active Tryweryn sample map uses OSM-derived Afon Tryweryn route geometry stored in `/src/data/trywerynRouteTraces.ts`. The first section starts near the Llyn Celyn dam/stilling-basin outflow and runs to Canolfan Tryweryn.

Seeded Wye access points, hazards, features, and gauge markers are currently snapped onto the section route for demo coherence.

Seeded Tryweryn access points, hazards, features, and release-reference markers are also snapped onto the section route for demo coherence.

Production behaviour may differ:

- access/hazard/feature markers should remain at true submitted coordinates
- gauge markers may remain at true station locations
- gauge-to-section relevance should be modelled separately

## Open Questions

- Should production markers be snapped, projected visually only, or left at true coordinates?
- What OSM/ODbL obligations apply if route traces become product data?
- When should the map gain filters or clustering?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| MAP-F1 | Section list selection | Left panel/map | Landed | prototype | — | Selecting a section fits the map to route bounds. |
| MAP-F2 | Traced route fixtures | Map | Landed | prototype | — | Wye and active Tryweryn samples use OSM-derived route traces instead of straight lines. |
| MAP-F3 | Marker display | Map | Landed | prototype | — | Access, hazards, features, gauges, saved contributions, and draft markers render. |
| MAP-F4 | Marker popups | Map | Landed | prototype | — | Seeded and saved markers expose popups/tooltips. |
| MAP-F5 | Marker click without recenter | Map | Landed | prototype | — | Marker clicks do not trigger route fit/zoom. |
| MAP-F6 | Layer filters | Map | Queued | v0.2 | — | Filter by hazards, access, reports, photos, and stale items. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| MAP-B1 | decision | True marker coordinates vs route snapping | Open | v0.2 | Demo snaps markers; production should likely preserve true coordinates. |
| MAP-B2 | dependency | OSM attribution and ODbL review | Open | v0.2 | Required before using derived geometry as product data. |
| MAP-B3 | enhancement | Highlight current selected object | Triaged | prototype | Useful when clicking saved markers or seeded hazards. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
| 2026-05-23 | Added active Tryweryn route-trace fixture context. |
