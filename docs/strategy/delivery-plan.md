# Delivery Plan

## Purpose

This document gives a clear view of the feature set we want to deliver and the current delivery state. Detailed durable behaviour lives in `/docs/specs`.

## Current Delivery State

| Feature | Owning Spec | State | Current Notes |
| --- | --- | --- | --- |
| Product strategy docs | `/docs/strategy/product-brief.md` | Landed | UK-first community river intelligence positioning is documented; `/docs/strategy/strategic-positioning.md` records the decision not to build a smaller RiverApp. |
| Core geospatial domain model | `/docs/specs/core/geospatial-domain-model.md` | Active | Defines the forward model: watercourses, routes, POIs, observations, photos, reports, and groups/sessions are independent geospatial records linked by spatial/curated relationships. |
| Community data strategy | `/docs/strategy/community-data-strategy.md` | Landed | First-party community data is defined as the core product asset. |
| Data source strategy | `/docs/strategy/data-sources-and-gaps.md` | Landed | UK provider landscape and community-only gaps are documented. |
| OSM waterway seeding | `/docs/specs/data/public-source-seeding.md` | Active | Import OSM waterway geometry for visual route snapping/context, including a Geofabrik/Osmium country-wide path; explicitly not paddleable route data. |
| Demo app shell | `/docs/specs/release/demo-prototype.md` | Landed | React/Vite/Leaflet prototype exists. |
| River section map | `/docs/specs/core/river-section-map.md` | Landed | Section list, map, section panel, route lines, and markers exist. |
| Offline mode | `/docs/specs/core/offline-mode.md` | Active | Contribution saves now queue local outbox operations and can be manually synced; app-shell cache and automatic/background sync are not complete. |
| River Wye pilot dataset | `/docs/specs/data/river-wye-seed-data.md` | Active | Seven Wye sections are seeded with OSM-derived route traces and source/confidence metadata; access/hazard data remains unverified. |
| River Tryweryn active sample | `/docs/specs/data/river-tryweryn-seed-data.md` | Active | Active demo fixture now starts near the Llyn Celyn dam release/stilling-basin outflow and follows the Tryweryn to the centre and Bala. |
| Community add mode | `/docs/specs/community/community-contributions.md` | Active | Add mode, map placement, saved markers, popups, and clearer contribution-type prompts exist in localStorage demo form. |
| Hazard confirmation/resolution | `/docs/specs/community/trust-and-moderation.md` | Active | Demo supports confirm/resolve for seeded and user-added hazards; no real moderation backend yet. |
| Environment Agency live levels | `/docs/specs/data/river-level-providers.md` | Active | Temporary frontend EA adapter exists for mapped lower Wye gauge candidates and falls back for unmapped sections. |
| Observation ingestion | `/docs/specs/backend/observation-ingestion.md` | Active | Generic backend observation schema and first guarded EA ingestion job are being implemented before Cloud Scheduler automation. |
| Platform configuration | `/docs/specs/ops/platform-configuration.md` | Active | In-repo `/platform` subproject created for Firebase/GCP config templates, planning scripts, and first-pass provisioning scripts. |
| Source/confidence metadata | `/docs/specs/data/river-wye-seed-data.md` | Queued | Needed before serious external feedback. |
| Feedback capture workflow | `/docs/product/wye-pilot-feedback-template.md` | Active | Structured Wye pilot feedback template exists; real sessions still needed. |
| Backend persistence | `/docs/specs/backend/service-api.md` | Active | Authenticated contribution sync now persists to Postgres and reads back by section; broader section/rivers API and moderation actions remain queued. |
| Backend data and sync model | `/docs/specs/backend/data-and-sync-model.md` | Landed | Hybrid relational/JSONB contribution model and idempotent offline sync push are implemented locally against PostGIS. |
| Staging end-to-end deployment | `/docs/specs/ops/platform-configuration.md` | Active | Cloud Run API deploy, Cloud SQL migration, Firebase preview/live deploy, and E2E smoke scripts exist; deploy is blocked until local GCP auth and staging runtime DB URLs are refreshed. |
| Auth and contributor identity | `/docs/specs/community/community-contributions.md` | Queued | Needed before real community data collection. |
| Photo uploads | `/docs/specs/community/photo-uploads.md` | Queued | Signed-in upload workflow, Firebase Storage, metadata, moderation, and offline queue requirements are now specified; implementation not started. |
| Community trust and moderation | `/docs/specs/community/trust-and-moderation.md` | Active | Backend roles, admin role/trust editing, moderator queue, and basic moderation decisions exist; scoped moderator permissions and richer audit/edit/merge tools remain queued. |

## Recommended Next Sprint

1. Prove the community knowledge loop on 3-5 real sections: seed, use, contribute, confirm, and refresh.
2. Add member sign-in before accepting real public contributions.
3. Persist community contributions end-to-end through the backend using `/docs/specs/backend/data-and-sync-model.md` Phase 1.
4. Add the first signed-in photo upload slice for section/POI evidence once contribution persistence is live.
5. Keep offline draft/outbox support in the critical path because paddlers may contribute from poor-signal locations.
6. Run a focused Tryweryn verification pass for the near-dam start, centre rules, release source, lower portage, and Bala finish.
7. Run first Wye/Tryweryn feedback sessions with `/docs/product/wye-pilot-feedback-template.md`.
8. Verify upstream Wye and Tryweryn gauge/provider mappings, likely including NRW for Wales.
9. Seed GB OSM waterway geometry so route suggestions can visually snap to waterways beyond the small loaded sample catalogue.

## Release Interpretation

No release has been cut yet. Specs may show features as `Landed`, but `Delivered` should remain `—` until an explicit release-cut task.
