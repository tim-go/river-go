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

The map should support two browsing levels:

- a UK overview mode where river sections can be discovered from far out
- a section-detail mode where a selected section shows route, access, hazards, photos, features, reports, and level context

Overview route styling should use level/runnability state as the primary colour channel. Difficulty or whitewater grade should be shown as a compact badge/label rather than competing route colour.

The map and section list should eventually allow paddlers to filter sections by:

- whitewater grade range, for example grade III-IV
- current level/runnability band
- craft suitability
- recent community reports
- hazards or access constraints

Selecting a section from the section list or Search must fit the map to show the selected route's start and end points.

The selected-section route panel should stay closed by default. Users can open it explicitly with the Route control.

Sections and Route controls should live in the map header action strip and show active state when their panel is open.

Clicking markers must not unexpectedly zoom out or recenter the map.

Marker click popups must make clicked objects understandable without becoming the full details surface.

The map should distinguish three inspection surfaces:

- section popup for quick route-level context and a route-details action
- route panel for section/route information, including access, gauges, hazards, reports, and photos
- POI detail panel for marker-specific access points, hazards, features, gauges, saved contributions, photos, source information, confirmations, and future contribution actions

POI marker popups should include a `Details` action that opens the POI detail panel. Opening POI details must not open the route panel.

Access point markers and access details should expose a navigation action that opens an external navigation app, starting with Google Maps directions to the access point latitude/longitude.

Hover tooltips should not duplicate marker popups in the prototype because they create two simultaneous information surfaces.

Clicking seeded or saved information markers must inspect that object only. It must not create a draft marker or open the add-contribution form.

The map should not show a persistent instruction box during normal browsing. Add-mode instructions may appear in the dedicated add-mode banner.

When add mode is active, clicking an open part of the route or map may place a new contribution. Clicking an existing information marker still opens that marker's details.

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
- Should overview discovery use clustered section markers, simplified route lines, or catchment-level grouping at low zoom?
- How should grade filters handle mixed-grade sections or sections whose grade changes materially by level?
- Should navigation actions offer Google Maps only, or detect Apple Maps/Waze on mobile?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| MAP-F1 | Section list selection | Left panel/map | Landed | prototype | — | Selecting a section fits the map to route bounds. |
| MAP-F2 | Traced route fixtures | Map | Landed | prototype | — | Wye and active Tryweryn samples use OSM-derived route traces instead of straight lines. |
| MAP-F3 | Marker display | Map | Landed | prototype | — | Access, hazards, features, gauges, saved contributions, and draft markers render. |
| MAP-F4 | Marker popups | Map | Landed | prototype | — | Seeded and saved markers expose click popups without hover tooltip duplication. |
| MAP-F5 | Marker click without recenter | Map | Landed | prototype | — | Marker clicks do not trigger route fit/zoom. |
| MAP-F6 | Inspect-only information markers | Map | Active | prototype | — | Marker clicks show details and do not create draft contribution markers. |
| MAP-F7 | Layer filters | Map | Queued | v0.2 | — | Filter by hazards, access, reports, photos, and stale items. |
| MAP-F8 | Access navigation links | Map/detail panel | Active | v0.2 | — | Access points should open external directions using their coordinates. |
| MAP-F9 | UK discovery overview | Map | Queued | MVP | — | Show rivers/sections from wider zooms, coloured by level/runnability and labelled with grade. |
| MAP-F10 | Grade and runnability filters | Map | Queued | MVP | — | Let paddlers filter to sections such as grade III-IV that are running now. |
| MAP-F11 | POI details surface | Map/POI panel | Active | prototype | — | Marker popups stay compact and open a separate POI detail panel for full marker information. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| MAP-B1 | decision | True marker coordinates vs route snapping | Open | v0.2 | Demo snaps markers; production should likely preserve true coordinates. |
| MAP-B2 | dependency | OSM attribution and ODbL review | Open | v0.2 | Required before using derived geometry as product data. |
| MAP-B3 | enhancement | Highlight current selected object | Triaged | prototype | Useful when clicking saved markers or seeded hazards. |
| MAP-B4 | decision | Whitewater grade model | Open | MVP | Add structured min/max grade fields alongside current human-readable difficulty text. |
| MAP-B5 | research | RiverPredictor-style forecasts | Open | Later | Assess 48h forecast data/model options after live levels and section-grade filters are established. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
| 2026-05-23 | Added active Tryweryn route-trace fixture context. |
| 2026-05-23 | Clarified inspect-only marker click behaviour. |
| 2026-05-23 | Removed persistent map instruction panel and marker hover tooltips. |
| 2026-05-23 | Added discovery overview, grade filtering, and access navigation requirements. |
| 2026-05-23 | Added separate section popup, route panel, and POI detail surface model. |
