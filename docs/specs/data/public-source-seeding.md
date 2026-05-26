---
roadmap_data_feature_group: Data
roadmap_data_feature_item: Public Source Seeding
roadmap_data_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# Public Source Seeding

**Work state:** Active
**Last updated:** 2026-05-26
**Scope:** Governs how public source material becomes RiverLaunch.app seed data, candidate sections, source metadata, or partnership targets.

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
- `/docs/specs/data/uk-kayaking-sample-catalogue.md`
- `/docs/specs/data/river-tryweryn-seed-data.md`
- `/docs/specs/data/river-wye-seed-data.md`
- `/docs/specs/backend/observation-ingestion.md`
- `/docs/specs/ops/seed-data-operations.md`

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

- `Candidate section:` A route exists as a source-backed investigation target, but remains low-confidence.
- `Reference-backed section:` The section is visible with source references, but exact POIs and guidance remain unverified.
- `Imported section:` A partner/licensed source supplied usable data, still requiring local confidence review.
- `Community-reviewed section:` Trusted contributors or multiple credible members have checked key details.
- `Verified section:` RiverLaunch.app treats the record as the best current community-maintained version, with caveats and freshness indicators.

## Initial Source Policy

Use open-data sources immediately for baseline observations and map context.

Use OSM waterways as the visual watercourse geometry source for route tracing,
snap preview, and map context. This layer should be imported as watercourse
reference geometry, not as paddling routes, and should retain OSM source
metadata, ODbL attribution, version/date, and confidence warnings.

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
`/docs/specs/ops/seed-data-operations.md`.

Imported watercourses should live in a `watercourses` table with source id, source version, source URL, licence, name fields, form/flow metadata, raw properties, source metadata, and a spatial index. The importer should be runnable locally and against staging/prod runtime config via npm scripts.

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

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| PUBSEED-B1 | task | Review current sample catalogue source URLs | Open | v0.2 | Replace weak/generic source URLs with source-register entries and explicit classifications. |
| PUBSEED-B2 | dependency | Paddle UK partnership decision | Open | v0.2 | Go Paddling/PaddlePoints appear strategically valuable but are permission-needed. |
| PUBSEED-B3 | validation | OSM geometry licence review | Open | v0.2 | Required before production route geometry is derived from map datasets. |
| PUBSEED-B4 | task | Design contributor verification prompts | Open | v0.2 | Candidate sections should ask members for exact access, hazards, photos, and level interpretation. |
| PUBSEED-B5 | task | Seed all GB visual waterways from OSM | Active | MVP | Build Geofabrik/Osmium preparation script, streamed importer, PostGIS watercourse records, source metadata, and staging seed run for visual snap-to-river. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-25 | Added public source seeding spec and source-register workflow. |
| 2026-05-26 | Changed visual route snapping source to OSM waterways. |
