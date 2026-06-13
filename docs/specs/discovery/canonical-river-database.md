---
roadmap_data_feature_group: Data
roadmap_data_feature_item: Canonical River Database
roadmap_data_feature_phase: Soon
spec_schema: 4
maturity: Sketch
---

# Canonical River Database

**Work state:** Queued
**Last updated:** 2026-06-05
**Scope:** Source strategy, data model, and seed workflow for building RiverLaunch.app's canonical river database from multiple public/reference datasets.

## Purpose

RiverLaunch.app should not reinvent a UK river database from scratch, and it should not treat one imported source as product truth.

The durable approach is to ingest several source-owned datasets, preserve their licence/provenance/attributes, and compile a RiverLaunch-curated river layer on top. That curated layer becomes a valuable product asset because it links official geography, map context, seed features, community evidence, paddling sections, photos, observations, and moderation state.

## Product Role

- `Primary user objective:` Browse trusted RiverLaunch river identities without losing useful source context from OS, OSM, EA/NRW/SEPA/DAERA, or future partners.
- `Classification:` Data foundation
- `Loop step:` Discover / Seed / Verify
- `Why this matters:` River-first discovery needs clean river identities, but source datasets vary by licence, coverage, geometry type, attribute richness, and suitability for paddling use.

## References

- `/docs/specs/foundations/geospatial-domain-model.md`
- `/docs/specs/discovery/river-first-discovery.md`
- `/docs/specs/discovery/public-source-seeding.md`
- `/docs/specs/foundations/seed-data-operations.md`
- `/docs/strategy/public-seed-source-register.md`
- `/docs/strategy/data-sources-and-gaps.md`
- `/docs/product/canonical-river-source-spike-2026-06-05.md`

## Source Spike Findings

### Recommended Source Roles

| Source | Coverage | Licence/status | Best role | Useful attributes observed | Limits |
| --- | --- | --- | --- | --- | --- |
| OS Open Rivers | Great Britain | OS OpenData; free via OS Data Hub | Primary GB river/watercourse network bootstrap | Named watercourse network, over 144,000 km, freshwater rivers, tidal estuaries, canals, topological link/node network, flow/connectivity context | Does not prove paddleability; OS docs say detailed analysis and river width need richer OS NGD Water data. Direct GeoPackage download returned an OS datastore error during this spike, so actual columns still need file inspection. |
| OS Open Names | Great Britain | OS OpenData; free via OS Data Hub | River/place name enrichment and alternate-name support | Place/name gazetteer, alternate Welsh/Scots/Gaelic names, quarterly refresh | Not a watercourse geometry source. Use for names/search/context only. |
| Environment Agency Statutory Main River Map | England | Public EA spatial download; licence metadata needs final confirmation | Statutory main-river status overlay | Sampled GeoJSON: `status`, `length_km`, `shape_length`, MultiLineString geometry, 183,911 features | No river names in sampled properties; status context only, not a river identity source. |
| Environment Agency WFD River, Canal and Surface Water Transfer Waterbodies Cycle 2 | England | Public EA spatial download; licence metadata needs final confirmation | Official waterbody IDs, basin context, environmental grouping | Sampled GeoJSON: `wb_id`, `wb_name`, `rbd_id`, `rbd_name`, `wb_cat`, `length_m`, MultiLineString geometry, 3,924 features | Waterbody names/segments are environmental units, not user-friendly river pages or paddling sections. |
| Environment Agency WFD River Waterbody Catchments Cycle 2 | England | Public EA spatial download; licence metadata needs final confirmation | Catchment polygons and official basin context | Sampled GeoJSON: `wb_id`, `wb_name`, `rbd_id`, `rbd_name`, `wb_cat`, `area_m2`, `length_m`, MultiPolygon geometry, 4,092 features | Polygon catchments, not river lines. |
| NRW WFD River Waterbodies / Catchments | Wales | DataMapWales/data.gov resources; some entries show OGL, some have blank licence metadata | Welsh official waterbody/catchment context | Resource pages expose WMS/download services for Cycle 1/2 WFD river waterbodies and catchments | Need direct file sampling and licence confirmation before import. |
| OpenDataNI / DAERA WFD River Water Bodies 2nd Cycle | Northern Ireland | UK OGL in CKAN | NI official waterbody/catchment context | Sampled GeoJSON: `localid`, `namespace`, `spzonetype`, `area_km2`, `SHAPE__Length`, Polygon geometry, 450 features | Polygon waterbody areas, not river-line geometry. |
| OSM waterways and waterway features | UK/global | ODbL | Visual snap/display layer, local feature/POI candidate generation, cross-checking | Sampled Tryweryn/Dart/Wye/Dee tags include `waterway=rapids/weir/waterfall/dam/sluice_gate/lock_gate`, named rapids, `rapids` grades, `whitewater:section_grade`, `boat`, `canoe`, `tunnel`, `bridge`, `tidal`, `intermittent`, `operator`, `wikidata`, `wikipedia`, bilingual names | OSM tags are uneven and community-authored; useful seed candidates, not legal/access/safety truth. Current importer stores waterway ways only and misses many node/POI waterway features. |

### Key Conclusion

The repeatable source-inspection report lives at `/docs/product/canonical-river-source-spike-2026-06-05.md`. It found:

- OS Open Rivers and OS Open Names CKAN metadata is reachable, but direct OS download probes returned HTTP 500 during the 2026-06-05 run.
- EA WFD River/Canal/SWT Waterbodies OGC sample returned 3,924 MultiLineString features with `wb_id`, `wb_name`, `rbd_id`, `rbd_name`, `wb_cat`, and `length_m`.
- EA Statutory Main River OGC sample returned 183,911 MultiLineString features with `status`, `length_km`, and `shape_length`.
- OpenDataNI/DAERA WFD ArcGIS sample returned 450 Polygon features with `localid`, `namespace`, `spzonetype`, area, and shape-length fields.
- OSM pilot samples for Tryweryn, Wye, Dee/Llangollen, Dart, and Tay/Grandtully all exposed candidate POI tags worth importing into review-needed state.

OS Open Rivers remains a useful later enrichment and cross-check source, but it is not a dependency for the first canonical river build. Proceed first with curated pilot RiverLaunch river records linked to existing sections, OSM watercourses/candidate features, and official WFD/Main River context where available.

When OS Open Rivers file access is working, add it as another source-owned layer and link it to existing RiverLaunch canonical rivers rather than regenerating the product model around OS.

Use **OSM** as the map-aligned geometry and local feature hint layer. OSM's feature tags are too valuable to ignore, but they should create candidate POIs/review prompts rather than confirmed RiverLaunch hazards/features.

Use **EA/NRW/SEPA/DAERA WFD/Main River** datasets for official status, waterbody IDs, catchment/basin context, and environmental/provider linking.

## Requirements

### Source-Owned Layer

Every imported dataset must retain source ownership.

Source-owned tables or source-type fields should store:

- source dataset id
- source feature id
- source version/date
- source URL
- licence and attribution requirements
- original/raw properties
- imported geometry
- import timestamp
- refresh history

Source refreshes must not overwrite RiverLaunch-curated records, member contributions, or moderation decisions.

### Canonical River Layer

RiverLaunch should create canonical `rivers` records separately from source rows.

Minimum target fields:

- `id`
- `canonical_name`
- `display_name`
- `alternate_names`
- `country`
- `region`
- `river_type`
- `summary`
- `geometry` or corridor
- `source_confidence`
- `curation_status`
- `created_at`, `updated_at`, `revision`

Implemented/pilot relationship tables:

- `river_source_links`
- `river_source_features`
- `canonical_river_section_links`
- `source_candidate_pois`

Future enrichment relationship concepts:

- `river_watercourse_links`
- `river_name_links`
- `river_observation_links`
- `river_wfd_links`
- `river_main_river_links`

Canonical river records should carry statuses such as `source-seeded`, `candidate`, `curated`, `community-reviewed`, `verified`, `stale`, and `disputed`.

### Candidate POI And Feature Extraction

Source tags may generate candidate POIs where the source data is useful but unverified.

OSM candidate POI extraction should consider:

- `waterway=rapids`
- `waterway=weir`
- `waterway=waterfall`
- `waterway=dam`
- `waterway=sluice_gate`
- `waterway=lock_gate`
- `waterway=lock`
- `waterway=turning_point`
- `waterway=sanitary_dump_station`
- `rapids`
- `whitewater:section_grade`
- `whitewater:section_name`
- `boat`
- `canoe`
- `access`
- `tunnel`
- `bridge`
- `tidal`
- `intermittent`
- `operator`
- `wikidata`
- `wikipedia`

Candidate POIs must be labelled as source-derived and review-needed. They should invite member photos, confirmations, corrections, and moderator review before becoming confirmed RiverLaunch POIs.

The first implementation exposes source candidates only through moderator/admin surfaces. Public map and river views may show aggregate candidate counts and data-confidence context, but must not render source-derived candidate POIs as confirmed public features until a moderator marks them confirmed or merged into a RiverLaunch POI.

Candidate status values:

- `review_needed`
- `confirmed`
- `rejected`
- `merged`

Status changes must preserve source provenance and write review metadata rather than deleting or rewriting the source feature.

### API And Moderation Surface

The pilot canonical river layer has a read-only public API:

- `GET /api/rivers` lists canonical river summaries with centre, bounding box, source confidence, curation status, linked-section count, and candidate POI counts.
- `GET /api/rivers/:riverId` returns river detail with section links and candidate counts by type.

The pilot moderator API exposes source candidates:

- `GET /api/moderation/source-candidate-pois`
- `POST /api/moderation/source-candidate-pois/:id/status`

The admin moderation UI should show raw source tags, source URL, licence, source id, candidate type, river link, and status action. Confirming a candidate upserts a source-backed confirmed `map_pois` record linked to a RiverLaunch section and records the promoted map POI id in candidate metadata. Merged candidates are marked as reviewed without creating a duplicate POI. Rejection should retain the record for audit and refresh comparison.

### Combined Curated Source

RiverLaunch's valuable data asset is the curated combination, not any one source.

The compiled record for a river may combine:

- OS Open Rivers geometry and names
- OS Open Names alternate names
- OSM local waterway alignment and feature candidates
- EA/NRW/SEPA/DAERA WFD waterbody/catchment links
- statutory main-river status where relevant
- observation stations and readings
- RiverLaunch paddling sections/routes
- access points, hazards, features, parking, and photos
- source confidence and community/moderation state

The app must keep source facts separate from paddling interpretation.

## Open Questions

- What exact OS Open Rivers columns are available in the downloadable GeoPackage once the OS datastore endpoint is healthy?
- What licence text/attribution is required for OS Open Rivers/Open Names in RiverLaunch UI and exports?
- Which Scottish open dataset should provide WFD-style waterbody context beyond OS Open Rivers geometry?
- Should OSM POI extraction import nodes only, ways only, or both nodes and ways with centroid/geometry support?
- What confidence thresholds promote candidate POIs from source-derived to community-reviewed?
- Should canonical river records be generated automatically from OS Open Rivers names first, or created only when there is RiverLaunch section/community relevance?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RIVERDB-F1 | Multi-source river source model | Data/backend | Active | MVP | — | Keep source-owned records separate from RiverLaunch canonical rivers and relationships; first build proceeds without OS dependency. |
| RIVERDB-F2 | OS Open Rivers import spike | Data/backend | Parked | Later | — | Source metadata and download probes are repeatable; direct OS file download still returns HTTP 500, so OS is optional later enrichment. |
| RIVERDB-F3 | Canonical rivers table | Data/backend | Active | MVP | — | Store RiverLaunch-curated river identities with source links and curation status. |
| RIVERDB-F4 | Source relationship links | Data/backend | Active | MVP | — | Link canonical rivers to OSM/WFD/Main River/source rows without merging provenance away; OS links can be added later. |
| RIVERDB-F5 | OSM feature candidate extraction | Data/backend/moderation | Active | MVP | — | Extract rapids, weirs, waterfalls, dams, sluices, locks, access hints, and whitewater tags as review-needed POI candidates. |
| RIVERDB-F6 | Official waterbody/status enrichment | Data/backend | Queued | Later | — | Link WFD waterbodies/catchments and main-river status to canonical rivers where useful. |
| RIVERDB-F7 | Repeatable source inspection report | Data/tooling | Active | MVP | — | `npm run data:spike:canonical-rivers` writes `/docs/product/canonical-river-source-spike-2026-06-05.md` with public source probes and OSM pilot tag summaries. |
| RIVERDB-F8 | Pilot canonical river seed | Data/backend/tooling | Active | MVP | — | `npm run data:seed:canonical-river-pilots` seeds curated pilot rivers, section links, source features, river-source links, and review-needed OSM candidate POIs without OS; local run seeded 5 rivers and 116 candidates. |
| RIVERDB-F9 | Canonical river read API | Backend/frontend | Active | MVP | — | Public `GET /api/rivers` and `GET /api/rivers/:riverId` expose read-only river summaries/details for river-first discovery. |
| RIVERDB-F10 | Source candidate moderation | Backend/admin | Active | MVP | — | Moderators can list review-needed source-derived POI candidates and mark them confirmed, rejected, merged, or back to review. |
| RIVERDB-F11 | Candidate POI promotion workflow | Data/moderation | Active | MVP | — | Confirming a source candidate promotes it to a source-backed confirmed map POI and preserves source provenance in candidate metadata and POI payload. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| RIVERDB-B1 | validation | OS download endpoint failure | Parked | Later | OS Open Rivers GeoPackage and Shapefile plus OS Open Names GeoPackage returned HTTP 500 in the repeatable 2026-06-05 report; retry later with an OS API key/project, but do not block the pilot canonical model. |
| RIVERDB-B2 | decision | Canonical generation threshold | Open | MVP | Decide whether every named OS river becomes a RiverLaunch river or only rivers with paddling/community relevance. |
| RIVERDB-B3 | risk | Licence mixing | Open | MVP | Keep OGL/OS OpenData and ODbL-derived records separate enough to manage attribution and reuse obligations. |
| RIVERDB-B4 | validation | OSM tag quality | Triaged | MVP | Repeatable report confirms useful candidate tags on Tryweryn, Wye, Dee/Llangollen, Dart, and Tay/Grandtully; compare sampled candidates with local knowledge before public display. |
| RIVERDB-B5 | task | Scottish official waterbody source | Open | Later | Identify SEPA/Scottish portal source equivalent for WFD-style context. |
| RIVERDB-B6 | task | Staging seed wrapper | Open | MVP | Add dedicated staging/prod npm wrappers for pilot canonical river seeding; current operator path uses the existing runtime command helper directly. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-05 | Created canonical river database spec from public-source spike. |
| 2026-06-05 | Added repeatable source-inspection report findings and next implementation state. |
| 2026-06-05 | Removed OS Open Rivers as a dependency for the first pilot canonical river build. |
| 2026-06-05 | Added pilot canonical river schema and seed command details. |
| 2026-06-05 | Recorded local pilot seed result: 5 canonical rivers, 12 section links, and 116 review-needed OSM candidate POIs. |
