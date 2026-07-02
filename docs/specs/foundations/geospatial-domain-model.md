---
roadmap_core_feature_group: Core
roadmap_core_feature_item: Geospatial Domain Model
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# Geospatial Domain Model

**Work state:** Active
**Last updated:** 2026-07-02
**Scope:** Defines the durable domain objects and relationship model for watercourses/rivers, routes, POIs, observations, photos, reports, and future group/session features.

## Purpose

RiverLaunch.app should not make routes own every related piece of data.

The product is a geospatial community knowledge system. Rivers, routes, POIs,
photos, observations, reports, and group activity records need to survive changes
to each other. A route may be shortened, split, deprecated, or replaced without
deleting the POIs near it. A POI may matter to several routes, a river branch, a
car park, a path, a confluence, or the user's current location without being
fundamentally owned by any one route.

The public product should increasingly use rivers as the primary discovery
container and treat routes/sections as sourced paddling interpretations. This
keeps the app from implying that RiverLaunch publishes official or safety-
certified routes while preserving the practical section-level detail paddlers
need.

This spec defines the target model: core entities are mostly independent
geospatial records, and the app creates route/river/location views through
spatial queries, curated links, confidence, and moderation state.

## Product Role

- `Primary user objective:` Browse useful paddling knowledge by route, river, location, level, and group context without losing information when route definitions change.
- `Classification:` Core domain model
- `Loop step:` Discover / Report / Verify / Plan
- `Why this matters:` Community data becomes more valuable when it is durable, reusable, and not trapped inside brittle route records.

## References

- `/docs/strategy/community-data-strategy.md`
- `/docs/strategy/data-sources-and-gaps.md`
- `/docs/specs/discovery/river-first-discovery.md`
- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/discovery/canonical-river-database.md`
- `/docs/specs/contributions/route-submissions.md`
- `/docs/specs/foundations/data-and-sync-model.md`
- `/docs/specs/foundations/observation-ingestion.md`
- `/docs/strategy/data-model.md`

## Requirements

### Core Principle

Use independent geospatial objects plus explicit or derived relationships.

The long-term model should not assume:

- POIs belong to routes
- POIs belong only to rivers
- routes are just polylines
- river geometry proves paddling suitability
- provider observation stations belong to one route
- photos only belong to one section

Instead, records should hold their own stable identity, geometry/location,
source, evidence, moderation state, and audit trail. Route, river, and map views
then decide which records are relevant.

### Entity Definitions

#### Watercourse

A physical mapped water feature such as a river, canal, tributary, estuary, or
named branch.

Watercourses, presented publicly as rivers where appropriate, are the main
long-term discovery container. They may provide geometry for snapping, search,
map context, river-level association, selected-river views, and broad grouping.
They do not prove a paddling route exists.

The visual snapping layer should use OSM waterways because route geometry must
line up with the map the user sees. Watercourse geometry must not be presented
as paddleable routes or used as route authority.

Minimum target fields:

- `id`
- `name`
- `alternate_names`
- `watercourse_type`
- `country`, `region`
- `geometry` or corridor
- `source_metadata`
- `confidence`
- `created_at`, `updated_at`

#### Route

A human-defined paddling interpretation of part of a watercourse or water area.

A route is a reviewable product/community object, not just a line. It usually
has a put-in/take-out intent, direction, grade/character, access context,
runnable conditions, evidence, confidence, and moderation state.

Minimum target fields:

- `id`
- `name`
- `route_type`
- `primary_watercourse_id` optional
- `status`
- `evidence_status`
- `grade` / character
- `start_intent`, `end_intent`
- `route_geometry`
- `geometry_source`
- `conditions_summary`
- `access_summary`
- `source_metadata`
- `created_by`, `reviewed_by`
- `created_at`, `updated_at`, `revision`

Route types may include touring section, whitewater section, play spot/lap,
training route, race course, canal route, lake route, tidal/sea route, portage
variant, or other.

Route and section records should be described as human/community interpretations
with source, evidence, confidence, and moderation state. Public navigation may
prefer `Rivers`, but the backend still needs route geometry and section records
for put-in/take-out, distance, grade, access, level, and impact-review logic.

**Decisions locked (2026-07-02):**

- The durable entity is a **`routes` table** — matching the existing internal
  naming (`route_suggestions`, `route_adjustments`, `route_overrides`,
  `poi_route_links.route_id`). "Section" is a `route_type` value, not a table.
- **"Section" is the only user-facing word.** UI copy, tabs, and public pages
  never say "Route"; `route` remains internal schema/API vocabulary.
- **Routes are community-origin only.** RiverLaunch does not seed, import, or
  declare paddleable routes/sections. Every `routes` row is created by
  promoting a moderated member route suggestion, carries attribution to its
  submitting member and the promoting moderator, and uses candidate/confidence
  language per `/docs/specs/principles/no-advice-and-liability-language.md`.
  The Wye/Tryweryn section fixtures are retired, not promoted — they were
  centrally authored, which is exactly what this stance rules out.

#### Point Of Interest

A location-based knowledge item such as hazard, access point, feature, photo
location, weir, bridge, parking, portage, gauge marker, or facility.

POIs are location-owned, not route-owned. A POI may be linked to a watercourse,
route, report, photo, group/session, or none of those yet.

Minimum target fields:

- `id`
- `geometry` or `location`
- `poi_type`
- `category`
- `title`
- `summary`
- `status`
- `source_metadata`
- `confidence`
- `created_by`
- `created_at`, `updated_at`, `revision`

#### Observation Station

A provider or manually curated measurement location for river level, flow,
rainfall, tide, sea state, release schedule, water quality, or forecast data.

Stations are independent provider-backed geospatial records. Their relevance to
a route is a relationship with context, not ownership.

#### Photo

A media/evidence object with optional location, capture time, uploader, storage
metadata, moderation state, and one or more target links.

Photos should be able to support POIs, route evidence, condition reports, group
sessions, or general location evidence.

#### Report

A time-sensitive community observation such as recent paddle condition, access
change, hazard update, level impression, obstruction, crowding, or event/closure.

Reports may reference a location, route, POI, watercourse, observation station,
or group/session context.

#### Group / Session

A future planning object for paddling activity, member participation, ICE access
permissions, messages, conditions, attendance, and post-session history.

Groups/sessions should reference routes, POIs, observations, reports, and photos
rather than duplicating or owning them.

### Relationship Model

Relationships may be explicit, derived, or both.

Target relationship tables/concepts:

- `route_watercourse_links`
- `poi_watercourse_links`
- `route_poi_links`
- `route_observation_station_links`
- `photo_links`
- `report_links`
- `group_session_links`

Relationship records should carry:

- `source` such as derived, moderator, contributor, provider, import, or system
- `relationship_type`
- `status`
- `confidence`
- optional distance/position metadata
- audit timestamps and actor where human-curated

Example route/POI relationship types:

- `within-corridor`
- `near-start`
- `near-finish`
- `manually-included`
- `manually-excluded`
- `upstream-context`
- `downstream-context`
- `needs-review`

### Spatial Views

The app should create views through spatial and curated relationship logic:

- `POIs near this route`
- `routes on this watercourse`
- `gauges relevant to this route`
- `hazards near my current location`
- `reports around this access point`
- `photos supporting this POI`
- `routes that are Grade III-IV and running now`

Route details should show POIs by relationship and proximity. A route geometry
change should recompute derived relationships and flag impacted curated links,
not delete POIs.

### Route Change Impact

Publishing a route geometry change should run an impact review before the
change becomes the public/current route.

Impact checks should include:

- POIs no longer inside the new route corridor
- start/end access POIs now outside expected distance
- observation stations whose relevance changed
- route distance or estimated time changed materially
- photos/reports linked only through the old route corridor
- neighbouring routes that may now overlap or leave gaps

Moderators should be able to keep, move, exclude, or flag impacted links before
publishing.

### Snap-To-River Role

Snap-to-river aligns human rough traces to known watercourse/route geometry.
For route editing, visual alignment with the map is the primary requirement.
Users judge and navigate routes against the visible map, so the snapping
authority should match the map's OSM waterway geometry rather than an
independent reference dataset when the two differ.

It is a geometry aid only. It can reduce dry-land lines, but it must not imply:

- paddleability
- legal access
- safety
- correct grade
- current conditions
- official status

The target backend model should store the rough trace, snapped trace, snap
source, confidence/warnings, and final reviewed geometry separately.

The backend snap endpoint should treat the submitted points as control points:
normally start, optional midpoints, and finish. It should snap each control point
to nearby OSM waterway geometry, then route along connected waterway vertices
between each pair of control points and return the expanded route trace. This
remains a preview/assist action; the user or moderator must review and accept
the result.

The map should also be able to show this watercourse reference layer as a
visible overlay. The overlay is for context, debugging, and route-tracing
confidence only. It must be visually distinct from RiverLaunch paddling routes.

Clicking a visible OSM watercourse should select a local stretch rather than a
whole named river. The selected stretch may show nearby RiverLaunch routes,
POIs, gauges, photos, and safe OSM metadata hints such as name, waterway type,
tidal/intermittent flags, operator, and access/canoe/boat tags. It must not
infer that the whole named river, tributary system, or catchment has been
selected.

### River Grouping

Whole-river grouping is now part of the river-first discovery direction, but it
should be introduced carefully. `/docs/specs/discovery/canonical-river-database.md`
owns the national source strategy for compiling RiverLaunch canonical river
identities from OS Open Rivers, OSM, WFD/Main River datasets, and moderator or
community correction.

The first river grouping implementation may use pragmatic curated groups for
known sample rivers before national automatic grouping is trusted. River
grouping must not imply that every reach of a named river is paddleable,
accessible, or suitable. Local-stretch selection remains useful where whole-
river identity is uncertain.

### Migration From Current Model

The remaining section-centric residue (2026-07-02 audit):

- `paddling_features.section_id` / `contributions.section_id` still carry
  fixture section ids, and several live reads pivot on
  `route_source = 'section_fixture'` link rows: river POI reads
  (`listMapPoisForRiver`), river photo stamping in the sync write path, and —
  most critically — **river level states** (`listRiverLevelStates` joins
  `canonical_river_section_links` → `section_measure_links`).
- The frontend fabricates one placeholder "River overview" section per
  canonical river; the rich Wye/Tryweryn fixtures are dead code.

The retirement path (owned by
`/docs/development/plan-community-sections.md`): re-key those reads to
`pois.river_id` and a new `river_measure_links` table first, then delete the
fixture seeds and `section_fixture` link rows, then introduce the community
`routes` table via suggestion promotion.

## Open Questions

- Should `watercourse` include lakes, estuaries, tidal reaches, and coastal sea areas, or should there be a broader `waterbody` abstraction?
- What corridor distance should define derived route/POI relevance by default?
- How should manually excluded POIs appear when they are still physically near a route?
- Should route variants be separate routes or child routes?
- How should disputed access be represented without giving legal advice?
- What is the first migration from section-owned POIs to location-owned POIs?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GEO-F1 | Decoupled geospatial domain model | Product/data | Active | MVP | — | Defines watercourses, routes, POIs, observations, photos, reports, and groups as independent records with relationships. |
| GEO-F2 | Route as curated paddling object | Product/data | Active | MVP | — | Routes are human/community paddling units with evidence, conditions, access, and geometry; not just polylines. |
| GEO-F3 | Location-owned POIs | Product/data | Active | MVP | — | POIs are now shadowed into durable location records beside existing source tables. |
| GEO-F4 | Relationship-based route views | Map/API | Active | MVP | — | Route map POI reads now use `poi_route_links` for seeded map POIs; contribution reads include relationship-linked contribution POIs. |
| GEO-F5 | Route change impact review | Admin/moderation | Active | MVP | — | Moderation now shows a first-pass route edit impact review using current geometry and known points; backend spatial impact review remains future work. |
| GEO-F6 | Snap trace provenance | Route editor/API | Queued | MVP | — | Store rough trace, snapped trace, source geometry, warnings, and final reviewed geometry separately. |
| GEO-F7 | GB watercourse reference layer | Backend/data | Active | MVP | — | Seed OSM waterway geometry for snapping, search, and spatial context; OSM waterways are the visual snap authority. |
| GEO-F8 | Backend watercourse snap endpoint | API/map | Active | MVP | — | Snap route control points to stored OSM waterway geometry, route along connected vertices, and return confidence/warnings. |
| GEO-F9 | Known rivers map overlay | Map/API | Active | MVP | — | Map can show visible OSM waterway reference geometry within the current viewport so users can see where visual snap support exists. |
| GEO-F10 | Local watercourse stretch selection | Map/API | Active | MVP | — | Clicking visible OSM watercourse geometry selects the local stretch and shows nearby app context without whole-river grouping. |
| GEO-F11 | River grouping model | Product/data | Queued | MVP | — | Support river-first discovery by grouping sections, POIs, observations, and reports under river/watercourse identities without implying route authority. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| GEO-B1 | migration | Section-owned POI migration | Active | MVP | Staged migration exists through `pois` plus `poi_route_links`; remaining work is full spatial/curated relationship reads and write-path migration. |
| GEO-B2 | decision | Watercourse vs waterbody | Open | MVP | Decide whether canals, lakes, estuaries, sea routes, and tidal reaches use one shared abstraction. |
| GEO-B3 | enhancement | Derived relationship engine | Open | MVP | Build spatial relationship queries for route corridor, current location, watercourse, and observation relevance. |
| GEO-B4 | validation | Route impact thresholds | Active | MVP | First-pass frontend thresholds use a 120 m route corridor and 350 m endpoint warning distance; tune with field feedback and backend spatial queries. |
| GEO-B5 | migration | Canonical route publishing | Active | MVP | Route overrides were the fixture-era bridge. With fixtures retiring, the durable path is suggestion → promotion → `routes` records (see `/docs/development/plan-community-sections.md`). |
| GEO-B6 | task | Watercourse imports | Active | MVP | Import OSM waterways for visual snapping and map context. |
| GEO-B7 | validation | Known rivers overlay density | Open | MVP | Tune viewport limits, simplification, and styling after testing on dense urban/canal areas and small mobile screens. |
| GEO-B8 | validation | OSM waterway routing quality | Active | MVP | Validate graph routing, branch handling, midpoint disambiguation, and snap distance thresholds on real user route submissions. |
| GEO-B9 | decision | Whole-river grouping | Triaged | MVP | River-first discovery needs river identities, but grouping must not imply every reach is paddleable or safe. |
| GEO-B10 | risk | Route wording liability | Open | MVP | Public copy should avoid making `Routes` the top-level promise; use river/section/candidate language with source confidence. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-25 | Created core geospatial domain model spec after route/POI ownership review. |
| 2026-05-26 | Changed snap authority to OSM waterway visual routing. |
| 2026-06-05 | Added river-first discovery direction while retaining route/section records as sourced paddling interpretations. |
| 2026-07-02 | Locked decisions: durable `routes` table (section = route_type; "Section" user-facing only); routes are community-origin only — no seeded/declared paddleable routes; Wye/Tryweryn fixtures retired. |
