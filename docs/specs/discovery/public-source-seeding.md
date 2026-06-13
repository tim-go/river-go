---
roadmap_data_feature_group: Data
roadmap_data_feature_item: Public Source Seeding
roadmap_data_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# Public Source Seeding

**Work state:** Active
**Last updated:** 2026-06-05
**Scope:** Governs how public source material becomes RiverLaunch.app seed data, source-owned records, canonical river links, candidate sections, candidate POIs, source metadata, or partnership targets.

## Purpose

Public source seeding gives RiverLaunch.app enough credible starting data to be useful before the community dataset is mature.

The goal is not to scrape existing paddling services. The goal is to create auditable seed records from sources that are open, permissioned, or referenceable, then route the missing paddling knowledge through community verification.

## Product Role

- `Primary user objective:` See useful candidate rivers and level context without mistaking unverified seed data for authoritative trip advice.
- `Classification:` Data
- `Loop step:` Browse / Choose / Verify
- `Why this matters:` Seed data starts the community flywheel, but unsafe or improperly copied route data would damage trust and create legal risk.

## References

- `/docs/strategy/public-seed-source-register.md`
- `/docs/strategy/data-sources-and-gaps.md`
- `/docs/strategy/community-data-strategy.md`
- `/docs/specs/discovery/uk-kayaking-sample-catalogue.md`
- `/docs/specs/discovery/canonical-river-database.md`
- `/docs/specs/discovery/river-tryweryn-seed-data.md`
- `/docs/specs/discovery/river-wye-seed-data.md`
- `/docs/specs/foundations/observation-ingestion.md`
- `/docs/specs/foundations/seed-data-operations.md`
- `/docs/product/canonical-river-source-spike-2026-06-05.md`

## Requirements

Public seed sources must be classified before any data is imported:

- `Open data:` reusable with attribution and licence compliance.
- `Reference only:` visible public source, but no import right for structured route content.
- `Permission needed:` valuable source where route/POI/GPX/photo reuse needs permission or partnership.
- `Do not copy:` guidebook/community/narrative/photo content that must not become RiverLaunch.app data.

Seed records must keep route suitability separate from baseline facts:

- Open agency data can supply readings, station metadata, rainfall, tide/sea data, and flood context.
- Map data can supply river geometry and broad context.
- Public route pages can identify candidate sections and verification questions.
- Community, club, venue, partner, or licensed evidence must establish paddleability, access practicality, hazards, and runnable interpretation.

Every sourced seed section must carry:

- source URL
- source organisation
- source classification
- date checked
- permitted use
- confidence
- verification status
- outstanding contributor/moderator questions

The seed system must support the following outcomes:

- `Source-owned river/watercourse record:` An imported feature remains attributed to its source dataset and can be refreshed without overwriting RiverLaunch curation.
- `Canonical river source link:` A source feature is linked to a RiverLaunch river identity without merging away provenance, licence, or confidence.
- `Candidate section:` A route exists as a source-backed investigation target, but remains low-confidence.
- `Reference-backed section:` The section is visible with source references, but exact POIs and guidance remain unverified.
- `Imported section:` A partner/licensed source supplied usable data, still requiring local confidence review.
- `Candidate POI:` A source-derived feature or tag may be useful to paddlers, but remains review-needed until members or moderators confirm it.
- `Community-reviewed section:` Trusted contributors or multiple credible members have checked key details.
- `Verified section:` RiverLaunch.app treats the record as the best current community-maintained version, with caveats and freshness indicators.

## Initial Source Policy

Use open-data sources immediately for baseline observations and map context.

Use OS Open Rivers as the first candidate source for Great Britain river and watercourse identity/network bootstrapping once its downloadable schema has been sampled successfully. Treat OS Open Rivers rows as source-owned records, not RiverLaunch truth.

Use OS Open Names for alternate-name, language-name, gazetteer, and search enrichment where it improves river discovery.

Use Environment Agency, Natural Resources Wales, SEPA, DAERA/OpenDataNI, WFD, catchment, and statutory/main-river datasets for official waterbody IDs, basin/catchment context, status overlays, and provider linking. These datasets should enrich canonical rivers and observations, not create paddling advice by themselves.

Use OSM waterways as the visual watercourse geometry source for route tracing,
snap preview, and map context. This layer should be imported as watercourse
reference geometry, not as paddling routes, and should retain OSM source
metadata, ODbL attribution, version/date, and confidence warnings.

Use OSM waterway feature tags as candidate POI and review-prompt inputs where useful. Candidate extraction may include rapids, weirs, waterfalls, dams, sluices, locks, turning points, sanitary dump stations, whitewater grades/names, access/canoe/boat hints, tunnels, bridges, tidal/intermittent flags, operators, Wikidata, and Wikipedia tags. These candidates must remain source-derived and review-needed until RiverLaunch contributors or moderators confirm them.

The OSM import implementation should support:

- bounded live Overpass queries for pilot areas
- Overpass JSON files
- GeoJSON FeatureCollections
- streamed GeoJSONSeq for large regional or country-wide imports

Country-wide imports should use a Geofabrik `.osm.pbf` extract filtered through
Osmium into GeoJSONSeq. The importer must stream GeoJSONSeq input in batches so
GB-scale waterway imports do not load the full extract into memory. It must
accept Osmium's RFC 8142 GeoJSON text-sequence output as well as plain
newline-delimited GeoJSON. Overpass must not be used for country-wide imports.
Repeatable seed and refresh runs must follow
`/docs/specs/foundations/seed-data-operations.md`.

Imported watercourses should live in a `watercourses` table with source id, source version, source URL, licence, name fields, form/flow metadata, raw properties, source metadata, and a spatial index. The importer should be runnable locally and against staging/prod runtime config via npm scripts.

The app should expose OSM waterway names as browse/search context. Searching for a river or waterway should return matching reference geometries and let the user open that local stretch on the map with the known-rivers layer enabled. This remains a map-context workflow only; a found waterway is not a RiverLaunch route until a member submits or a moderator verifies a paddling section.

Use Paddle UK / Go Paddling, PaddlePoints, UK Rivers Guidebook, Canoe Wales/Paddle Cymru, Paddle Scotland, Paddle NI, clubs, operators, and venue pages as discovery/reference material unless explicit permission or open licensing allows import.

The first source-backed route work should concentrate on:

- Tryweryn: managed dam-release pilot.
- Wye: open-canoe/touring pilot.
- Dee/Llangollen: Welsh whitewater candidate.
- Dart Loop: English whitewater candidate.
- Spey or Tay: Scottish touring/whitewater candidate.

## Open Questions

- Which source owners should be approached first for permission or partnership?
- What UI label should distinguish source-backed candidates from community-verified route records?
- Should source-register entries become database records, or remain docs until the seed workflow is proven?
- What legal review is needed before using OSM-derived geometry in production route records?
- What attribution and data-sharing obligations apply when RiverLaunch combines OS OpenData/OGL sources with OSM ODbL-derived records?
- Which OSM candidate feature types should be imported first, and what review state should each start in?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| PUBSEED-F1 | Public source register | Data/strategy | Active | v0.2 | — | Creates the governed list of public/open/reference/permission-needed sources. |
| PUBSEED-F2 | Seed source classification | Data | Active | v0.2 | — | Requires licence/permission status before data import. |
| PUBSEED-F3 | Candidate route workflow | Data/community | Queued | v0.2 | — | Converts public references into verification prompts rather than copied routes. |
| PUBSEED-F4 | Partner import pathway | Data/partnership | Queued | later | — | Allows route import only when source owner grants permission and provenance is retained. |
| PUBSEED-F5 | Watercourse imports | Data/backend | Active | MVP | — | Import OSM waterways for visual snapping and map context without treating them as paddleable routes. |
| PUBSEED-F6 | OSM waterway import | Data/backend | Active | MVP | — | Import OSM river, stream, and canal geometry as the default route snap/known-rivers overlay source, including streamed GeoJSONSeq for country-wide extracts. |
| PUBSEED-F7 | Canonical river source stack | Data/backend | Active | MVP | — | Source roles and repeatable source-inspection report exist; next build slice is pilot source-owned import and canonical links. |
| PUBSEED-F8 | Source-derived POI candidates | Data/backend/moderation | Active | MVP | — | Pilot seed imports useful OSM waterway feature tags as review-needed candidate POIs and exposes them to moderator review, not public map display. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| PUBSEED-B1 | task | Review current sample catalogue source URLs | Open | v0.2 | Replace weak/generic source URLs with source-register entries and explicit classifications. |
| PUBSEED-B2 | dependency | Paddle UK partnership decision | Open | v0.2 | Go Paddling/PaddlePoints appear strategically valuable but are permission-needed. |
| PUBSEED-B3 | validation | OSM geometry licence review | Open | v0.2 | Required before production route geometry is derived from map datasets. |
| PUBSEED-B4 | task | Design contributor verification prompts | Open | v0.2 | Candidate sections should ask members for exact access, hazards, photos, and level interpretation. |
| PUBSEED-B5 | task | Seed all GB visual waterways from OSM | Active | MVP | Build Geofabrik/Osmium preparation script, streamed importer, PostGIS watercourse records, source metadata, and staging seed run for visual snap-to-river. |
| PUBSEED-B6 | validation | OS Open Rivers schema sample | Open | MVP | Retry OS Open Rivers GeoPackage download, inspect columns, and compare pilot rivers against OSM before implementation. |
| PUBSEED-B7 | risk | Mixed-source provenance | Open | MVP | Preserve source provenance/licensing so OS/Open Government/ODbL-derived records can be attributed and reused correctly. |
| PUBSEED-B8 | task | Candidate POI promotion workflow | Active | MVP | Confirmed candidates now upsert source-backed confirmed map POIs; richer merge handling and moderator edit controls remain. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-25 | Added public source seeding spec and source-register workflow. |
| 2026-05-26 | Changed visual route snapping source to OSM waterways. |
| 2026-06-05 | Added canonical river source stack and OSM feature candidate extraction requirements from public-source spike. |
| 2026-06-05 | Linked repeatable canonical source spike report. |
