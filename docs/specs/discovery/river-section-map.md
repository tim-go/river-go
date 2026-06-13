---
roadmap_core_feature_group: Core Map
roadmap_core_feature_item: River Section Map
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Trial
---

# River Section Map

**Work state:** Active
**Last updated:** 2026-06-05
**Scope:** The map, river/section list, route traces, markers, selected-river context, and selected-section panel for browsing rivers and river sections.

## Purpose

The map lets users browse rivers, inspect known or candidate sections, and understand where access points, hazards, gauges, features, and community contributions sit relative to the river.

The map is the primary workspace. The section list and right-hand panel are supporting surfaces.

## Product Role

- `Primary user objective:` Choose and inspect a river or river section using a route-aware map.
- `Classification:` Core
- `Loop step:` Choose
- `Why this matters:` RiverLaunch.app's core browsing unit is moving toward rivers, with sections/routes as detailed paddling interpretations. If users cannot quickly orient themselves on the map, the community data model will not be trusted.

## References

- `/docs/specs/foundations/demo-prototype.md`
- `/docs/specs/discovery/river-first-discovery.md`
- `/docs/specs/foundations/geospatial-domain-model.md`
- `/docs/specs/discovery/river-wye-seed-data.md`
- `/docs/specs/discovery/river-tryweryn-seed-data.md`
- `/docs/specs/discovery/uk-kayaking-sample-catalogue.md`
- `/docs/specs/contributions/community-contributions.md`
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
- locally saved candidate route suggestions
- public approved candidate route suggestions
- draft route suggestion trace while a member is sketching a missing route
- admin/moderator route-adjustment traces for existing route targets
- searched-location marker opened from Search
- opt-in browser live-location marker and accuracy circle

The map should support three browsing levels:

- a UK overview mode where river sections can be discovered from far out
- a river overview mode where one selected river shows its known sections and key context
- a section-detail mode where a selected section shows route, access, hazards, photos, features, reports, and level context

The overview mode should not require a selected section. It should let users pan, zoom, inspect available rivers, and apply discovery filters. Selecting a river marker or river search result should set active river context. Selecting a section line, section marker, or section search result should set active section context and switch the relevant controls into section-detail behaviour.

Overview styling should favour compact river markers or clusters over dense route lines where the zoom level would otherwise clutter the map. A river marker may use a short label, grade badge, and runnability/status indicator. Difficulty or whitewater grade should be shown as a compact badge/label rather than competing route or runnability colour.

The product should move public discovery language toward `Rivers`. Route/section paths remain visible where they provide useful paddling context, but they should be presented as sourced sections, candidate sections, or route geometry rather than top-level safety-certified routes.

The map and section list should eventually allow paddlers to filter sections by:

- whitewater grade range, for example grade III-IV
- current level/runnability band
- craft suitability
- recent community reports
- hazards or access constraints

Map controls should also let users reduce selected-river clutter by hiding or showing feature categories such as access, parking, hazards, rapids/features, whitewater, structures, navigation, utilities, photos, reports, and gauges.

Selecting a section from the map section list or Search must fit the map to show the selected route's start and end points. The Map `Sections` panel is contextual to the currently selected river and should list only sections for that river; global river/section discovery belongs in Search.

The selected-river context should have a compact river detail surface or page entry point showing known sections, level context, key POIs, recent reports, photos, and data confidence before the user opens a specific section. Users must be able to dismiss the river detail surface without deselecting the river, so the map remains usable while selected-river markers and context stay active.

Opening a location reference from Search should centre and zoom the map to the searched point, without creating a draft contribution marker.

Live location should use the browser/PWA geolocation permission model. The app must not track location until the user explicitly enables it. When enabled, the map should render the latest browser-provided location locally as a current-location marker with an accuracy circle. Location should not be sent to the backend as part of this feature.

The selected-section route panel should stay closed by default. Users can open it explicitly with the Route control.

Approved route suggestions should be selectable in Map and Search as low-confidence candidate routes. They must be visually distinct from verified/seeded sections, labelled as `Candidate`, and carry source/warning copy that makes clear they are not verified paddling advice.

Sections and Route controls should live in the map header action strip and show active state when their panel is open.

The map header should stay compact on desktop and mobile so route context and core actions do not consume a large share of the map viewport. It should still expose the selected section's headline level/status context without forcing users to open route details.

The route layer should be independently toggleable from the map header, similar
to the known-rivers overlay. When enabled, route paths should render faintly by
default so waterways, POIs, and local-stretch context remain readable. Hovering
or clicking a route path should highlight that route. Route popups should
separate `Details` from `Select route`: details opens the route panel without
forcing a map refit, while selecting a route makes it active and fits the map to
the route.

When provider observations are available for a selected section, the map should show an immediately visible route status card with current level/flow context, trend, source, freshness, and a direct action to open full level history. Users should be able to hide this card temporarily and restore it from a compact map control.

Clicking markers must not unexpectedly zoom out or recenter the map.

Section and route marker click popups must make clicked objects understandable without becoming the full details surface. River and POI marker clicks should be controlled by a quick/user setting: `Info` shows a compact quick-info popup first with a `Details` action; `Detail` opens the primary detail panel directly. River quick-info popups should also include `Select river`, which selects the river context and closes the popup without opening the detail panel.

Opening route details from a route marker popup must not force the map to refit the whole route. The user's current zoom and pan should be preserved unless they explicitly choose a section from Search or the section list.

Selecting a POI from a list, selected-river detail surface, marker quick-info popup, or direct-detail marker click should open the POI details and intentionally centre/zoom the map to that point. On mobile, opening POI or selected-river details should place the detail panel in the bottom half of the viewport and position the selected point in the centre of the visible top half.

The map should distinguish three inspection surfaces:

- section popup for quick route-level context and a route-details action
- route panel for section/route information, grouped into compact tabs for details, levels, access, hazards, updates, and photos
- POI details panel grouped into compact tabs for details, location, verification, and photos so community review controls do not make the first view too long
- POI detail panel for marker-specific access points, hazards, features, gauges, saved contributions, photos, source information, confirmations, and future contribution actions

Only one detail inspection surface should be primary at a time. Selecting a river, section, or POI should close or replace the previously open detail surface so panels do not stack over each other. Mobile POI and selected-river detail panels should have a full-screen expand action; closing a detail panel should hide it and restore the map to the centre/zoom it had immediately before the detail panel opened.

POI markers should respect the marker-click setting: quick info first or direct POI detail. Opening POI details must not open the route panel.

Photo contribution marker popups should show a compact thumbnail when the contribution has an attached photo, while keeping the full photo set in the POI detail panel.

Access point markers and access details should expose a navigation action that opens an external navigation app, starting with Google Maps directions to the access point latitude/longitude.

Put-in and take-out markers should be more visually distinct than ordinary POIs. They may use directional in/out icons, larger markers, or stronger labels, provided the design avoids copying another app's protected artwork.

Parking and lay-by markers should be first-class access-adjacent POIs. They should support practical details such as free/paid, time limits, distance to river access, capacity notes, access sensitivity, and whether the point is suitable for shuttle logistics.

POI details should expose practical location-sharing actions for all marker types: open the point in Google Maps, copy coordinates, and show/copy a stored what3words address when available. The POI detail panel should not automatically call the what3words API on every view; live lookup should be an explicit fallback action until the relevant POI data has been enriched and stored.

Seeded gauges, access points, hazards, and features should use checked-in location reference data keyed by section and marker id, so prototype fixtures behave like enriched records without making provider calls during normal map viewing.

When the backend is available, seeded gauges, access points, hazards, and features should load from DB-backed map POI records rather than frontend-only fixture arrays. Frontend fixtures remain an offline/dev fallback until the section catalogue itself is fully backend-driven.

If the what3words provider is configured but temporarily unavailable, blocked, or otherwise unable to return an address, the UI should show neutral unavailable copy and continue to expose coordinates and Google Maps actions. It should not expose provider billing, quota, key, or plan details to ordinary users.

On mobile, Sections, Add Info, and route details should use full-screen overlays above the map, app title bar, and bottom navigation rather than cramped bottom sheets. Route details should open as a full-screen inspection surface with compact tab navigation so the app title bar, section image/header, and tabs do not consume most of the usable viewport. POI and selected-river details should default to a half-height bottom map overlay with an explicit full-screen expand action, so users can still see the selected point or river marker behind it.

Hover tooltips should not duplicate marker popups in the prototype because they create two simultaneous information surfaces.

Clicking seeded or saved information markers must inspect that object only. It must not create a draft marker or open the add-contribution form.

The map should not show a persistent instruction box during normal browsing. Add-mode instructions may appear in the dedicated add-mode banner.

When add mode is active, clicking an open part of the route or map may place a new contribution. Clicking an existing information marker still opens that marker's details.

When route suggestion mode is active, map clicks add points to a rough candidate route trace. These points are a member review sketch only; they do not create a canonical section until future backend moderation and promotion.

When route adjustment mode is active for an admin or contribution moderator, map clicks add points to a corrected route trace for the selected existing section. This creates an auditable route-adjustment record rather than immediately rewriting published route geometry.

Route adjustment should not require retracing when only metadata is changing. Existing route edits should open with the current trace preloaded and allow moderators to move existing trace points when they explicitly choose to edit geometry.

Editing a pending route suggestion from moderation should update the suggestion itself rather than creating a separate route edit overlay.

The route editor may offer a `Snap` preview action that aligns the rough trace to known river geometry already loaded in the app. This is only a geometry assist; it must keep the review and evidence workflow explicit.

When the known-rivers overlay is visible, clicking an OSM waterway line may
select that local stretch. The map should highlight the clicked line more
strongly and show a compact information panel with the waterway name/type,
source caveat, safe OSM hints, and nearby RiverLaunch routes/POIs already known
to the app. This is local context only; it must not select or imply the whole
named river.

Selected-river feature detail should be hidden until a river is selected or the
user zooms far enough into a local river context. This prevents national or
regional map views from becoming a dense cloud of access, hazard, feature, and
photo markers.

The first canonical-river map slice uses public `GET /api/rivers` records to
render compact river markers and a river-first list above the current section
list. Selecting a river opens a compact selected-river panel with source
confidence, curation status, linked-section count, review-needed candidate POI
count, and shortcuts to matching known sections. Source-derived candidate POIs
stay hidden from the public map until moderation promotes or merges them.

Legacy frontend section fixtures are no longer part of the active map data path.
The old Wye, Tryweryn, and UK sample fixture files may remain in the repository
temporarily for reference, but the app should browse canonical river records
from the backend and avoid displaying old hand-written fixture routes, section
summaries, system-generated fixture POIs, or localStorage demo contributions.

When source candidates are confirmed/promoted, the selected canonical river map
should load them through the river-level POI endpoint and render them as reviewed
points even before reviewed section geometry is rebuilt.

The first selected-river POI classification slice may derive display categories
from promoted source-candidate payload tags such as `candidateType`,
`rawProperties.waterway`, `rawProperties.rapids`, and
`rawProperties.whitewater:section_grade`. These derived categories drive marker
icons, list labels, and map filters, but should remain source-derived hints
until locally reviewed.

On narrow mobile viewports, the map header may collapse secondary controls behind an explicit `Controls` toggle. Expanded controls must show text labels for route actions so `Suggest route` and `Edit route` are distinguishable.

River Wye route traces are generated from OpenStreetMap River Wye waterway geometry through `/scripts/generateWyeRouteTraces.mjs` and stored in `/src/data/wyeRouteTraces.ts`.

The active Tryweryn sample map uses OSM-derived Afon Tryweryn route geometry stored in `/src/data/trywerynRouteTraces.ts`. The first section starts near the Llyn Celyn dam/stilling-basin outflow and runs to Canolfan Tryweryn.

Seeded Wye access points, hazards, features, and gauge markers are currently snapped onto the section route for demo coherence.

Seeded Tryweryn access points, hazards, features, and release-reference markers are also snapped onto the section route for demo coherence.

The active demo also includes a UK kayaking sample catalogue under `/src/data/ukKayakingSeed.ts`. These entries are schematic discovery samples only; route lines and markers must be replaced with verified geometry and local review before publication.

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
- What marker design best communicates river grade, runnability, and data confidence without implying safety approval?
- Should put-in/take-out marker icons use arrows, paddle-specific symbols, or generic access symbols to avoid accidental brand/artwork overlap with other apps?
- What level of river page content belongs in the map overlay versus a dedicated page?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| MAP-F1 | Section list selection | Left panel/map | Landed | prototype | — | Selecting a section fits the map to route bounds. |
| MAP-F2 | Traced route fixtures | Map | Landed | prototype | — | Wye and active Tryweryn samples use OSM-derived route traces instead of straight lines. |
| MAP-F3 | Marker display | Map | Landed | prototype | — | Access, hazards, features, gauges, saved contributions, and draft markers render. |
| MAP-F4 | Marker popups | Map | Landed | prototype | — | Section/route markers expose click popups without hover tooltip duplication; river and POI markers can either show quick info or open primary details directly. |
| MAP-F5 | Marker click without recenter | Map | Landed | prototype | — | Marker clicks do not trigger route fit/zoom. |
| MAP-F6 | Inspect-only information markers | Map | Active | prototype | — | Marker clicks show details and do not create draft contribution markers. |
| MAP-F7 | Layer filters | Map | Queued | v0.2 | — | Filter by hazards, access, reports, photos, and stale items. |
| MAP-F8 | Access navigation links | Map/detail panel | Active | v0.2 | — | Access points should open external directions using their coordinates. |
| MAP-F9 | UK discovery overview | Map | Queued | MVP | — | Show rivers/sections from wider zooms, coloured by level/runnability and labelled with grade. |
| MAP-F10 | Grade and runnability filters | Map | Queued | MVP | — | Let paddlers filter to sections such as grade III-IV that are running now. |
| MAP-F11 | POI details surface | Map/POI panel | Active | prototype | — | POI markers open a separate POI detail panel for full marker information, either directly or via quick info depending on the marker-click setting. |
| MAP-F12 | Multi-river sample catalogue | Map/search | Active | prototype | — | Active demo includes Tryweryn, Wye, and a schematic UK kayaking sample catalogue. |
| MAP-F13 | POI location actions | Map/POI panel | Active | MVP | — | POIs expose Google Maps, coordinate copy, and what3words display/copy when configured. |
| MAP-F14 | Searched-location marker | Search/map | Active | prototype | — | Location-reference search can place a distinct searched-location marker without entering add mode. |
| MAP-F15 | Opt-in live location | Map/PWA | Active | prototype | — | Browser geolocation can show the user's current location and accuracy circle locally on the map. |
| MAP-F16 | Visible route level status | Map/header | Active | prototype | — | Selected sections expose headline level context and a direct path to full observation history. |
| MAP-F17 | Candidate route suggestion display | Map/PWA | Active | prototype | — | Locally saved route suggestions render as distinct pending-review route traces separate from canonical sections. |
| MAP-F18 | Route adjustment display | Map/admin | Active | MVP | — | Admin/moderator route edits render as distinct traces and can be focused from moderation. |
| MAP-F19 | Snap rough trace to known river | Map/route editor | Active | prototype | — | Route editor can snap a rough trace to known in-app route geometry for review. |
| MAP-F20 | Public candidate section display | Map/search | Active | MVP | — | Reviewed route suggestions may appear as selectable low-confidence candidate sections with distinct styling and source-warning copy. |
| MAP-F21 | Local watercourse stretch panel | Map | Active | MVP | — | Clicking a known-rivers overlay line highlights the selected local stretch and shows nearby routes/POIs plus source caveats. |
| MAP-F22 | Route layer toggle | Map | Active | MVP | — | Users can show/hide all route paths, with faint default route styling and hover/click highlight before explicit route selection. |
| MAP-F23 | River overview markers | Map/search | Active | MVP | — | First slice renders canonical pilot river markers and river-list rows; grade/runnability badge treatment remains queued. |
| MAP-F24 | Selected-river detail context | Map/river detail | Active | MVP | — | First slice shows canonical river summary, source confidence, candidate counts, and known-section shortcuts; feature/level/photo layers remain next. |
| MAP-F25 | Selected-river feature filters | Map | Active | MVP | — | Hide/show dense selected-river POI categories so river views remain legible; first slice derives rapid, whitewater, structure, navigation, utility, and generic feature classes from promoted source tags. |
| MAP-F26 | Distinct access and parking markers | Map/POI panel | Queued | MVP | — | Put-in, take-out, parking, and lay-by markers should stand apart from generic features. |
| MAP-F27 | Remove active frontend fixtures | Map/data | Active | MVP | — | Active UI no longer imports old section fixture catalogue; canonical river API records drive the map overview while reviewed section geometry is rebuilt. |
| MAP-F28 | Selected-river promoted POIs | Map/backend | Active | MVP | — | Confirmed/promoted source candidates render as reviewed POI markers and list rows on the selected canonical river. |
| MAP-F29 | POI list focus | Map/POI panel | Active | MVP | — | Selecting a POI from a river/detail list opens its details and centres/zooms the map to the POI without changing marker-click viewport behaviour. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| MAP-B1 | decision | True marker coordinates vs route snapping | Open | v0.2 | Demo snaps markers; production should likely preserve true coordinates. |
| MAP-B2 | dependency | OSM attribution and ODbL review | Open | v0.2 | Required before using derived geometry as product data. |
| MAP-B3 | enhancement | Highlight current selected object | Triaged | prototype | Useful when clicking saved markers or seeded hazards. |
| MAP-B4 | decision | Whitewater grade model | Open | MVP | Add structured min/max grade fields alongside current human-readable difficulty text. |
| MAP-B5 | research | RiverPredictor-style forecasts | Open | Later | Assess 48h forecast data/model options after live levels and section-grade filters are established. |
| MAP-B6 | enhancement | Native navigation app choices | Open | Later | Consider Apple Maps, Waze, OS-level share sheets, and mobile app deep-link behaviour after Google Maps links prove useful. |
| MAP-B7 | decision | River marker semantics | Open | MVP | Decide how labels, grade colours, level state, tick/cross signals, and data confidence combine without implying safety approval. |
| MAP-B8 | migration | Route-to-river public wording | Open | MVP | Migrate navigation/copy toward river-first discovery while keeping route/section records and route editing internally. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
| 2026-05-23 | Added active Tryweryn route-trace fixture context. |
| 2026-05-23 | Clarified inspect-only marker click behaviour. |
| 2026-05-23 | Removed persistent map instruction panel and marker hover tooltips. |
| 2026-05-23 | Added discovery overview, grade filtering, and access navigation requirements. |
| 2026-05-23 | Added separate section popup, route panel, and POI detail surface model. |
| 2026-05-23 | Added active multi-river sample catalogue context. |
| 2026-05-23 | Added Google Maps, coordinate copy, what3words, and mobile full-height POI overlay requirements. |
| 2026-05-24 | Added opt-in browser live-location map marker requirement. |
| 2026-05-25 | Added public approved candidate route display requirement. |
| 2026-06-05 | Added river-first overview, selected-river context, feature filters, and access/parking marker refinements from Joe feedback. |
