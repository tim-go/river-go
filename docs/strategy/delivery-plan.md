# Delivery Plan

## Purpose

This document gives a clear view of the current delivery state. The full feature set (by product tier) is `/docs/strategy/feature-register.md`; the phased view is `/docs/strategy/roadmap.md`; detailed durable behaviour lives in `/docs/specs`.

## Current Delivery State

| Feature | Owning Spec | State | Current Notes |
| --- | --- | --- | --- |
| Product strategy docs | `/docs/strategy/product-brief.md` | Landed | UK-first community river intelligence positioning is documented; `/docs/strategy/strategic-positioning.md` records the decision not to build a smaller RiverApp. |
| Core geospatial domain model | `/docs/specs/foundations/geospatial-domain-model.md` | Active | Defines the forward model: watercourses, routes, POIs, observations, photos, reports, and groups/sessions are independent geospatial records linked by spatial/curated relationships. |
| River-first discovery | `/docs/specs/discovery/river-first-discovery.md` | Active | First river-first slice is implemented: canonical river summaries load through the public API, render as map markers/list rows, and open selected-river context without exposing unreviewed candidate POIs. |
| Community data strategy | `/docs/strategy/community-data-strategy.md` | Landed | First-party community data is defined as the core product asset. |
| Data source strategy | `/docs/strategy/data-sources-and-gaps.md` | Landed | UK provider landscape and community-only gaps are documented. |
| OSM waterway seeding | `/docs/specs/discovery/public-source-seeding.md` | Active | Import OSM waterway geometry for visual route snapping/context, including a Geofabrik/Osmium country-wide path; explicitly not paddleable route data. |
| Canonical river database | `/docs/specs/discovery/canonical-river-database.md` | Active | Proceeding without OS dependency: local seed created 5 canonical rivers, 12 section links, and 116 review-needed OSM candidate POIs; public river read API, moderator source-candidate queue, and confirm-to-POI promotion are implemented. |
| Demo app shell | `/docs/specs/foundations/demo-prototype.md` | Landed | React/Vite/Leaflet prototype exists. |
| River section map | `/docs/specs/discovery/river-section-map.md` | Active | The active frontend map now uses canonical river API records for overview browsing; old Wye/Tryweryn/sample section fixtures are no longer imported into the active app path. |
| Offline mode | `/docs/specs/foundations/offline-mode.md` | Active | Contribution saves now queue local outbox operations and can be manually synced; app-shell cache and automatic/background sync are not complete. |
| River Wye pilot dataset | `/docs/specs/discovery/river-wye-seed-data.md` | Active | Seven Wye sections are seeded with OSM-derived route traces and source/confidence metadata; access/hazard data remains unverified. |
| River Tryweryn active sample | `/docs/specs/discovery/river-tryweryn-seed-data.md` | Active | Active demo fixture now starts near the Llyn Celyn dam release/stilling-basin outflow and follows the Tryweryn to the centre and Bala. |
| Community add mode | `/docs/specs/contributions/community-contributions.md` | Active | Add mode, map placement, saved markers, popups, and clearer contribution-type prompts exist in localStorage demo form. |
| Hazard confirmation/resolution | `/docs/specs/contributions/trust-and-moderation.md` | Active | Demo supports confirm/resolve for seeded and user-added hazards; no real moderation backend yet. |
| Environment Agency live levels | `/docs/specs/discovery/river-level-providers.md` | Active | Temporary frontend EA adapter exists for mapped lower Wye gauge candidates and falls back for unmapped sections. |
| Observation ingestion | `/docs/specs/foundations/observation-ingestion.md` | Active | Generic backend observation schema and first guarded EA ingestion job are being implemented before Cloud Scheduler automation. |
| Platform configuration | `/docs/specs/foundations/platform-configuration.md` | Active | In-repo `/platform` subproject created for Firebase/GCP config templates, planning scripts, and first-pass provisioning scripts. |
| Source/confidence metadata | `/docs/specs/discovery/river-wye-seed-data.md` | Queued | Needed before serious external feedback. |
| Feedback capture workflow | `/docs/product/wye-pilot-feedback-template.md` | Active | Structured Wye pilot feedback template exists; real sessions still needed. |
| Backend persistence | `/docs/specs/foundations/service-api.md` | Active | Authenticated contribution sync now persists to Postgres and reads back by section; broader section/rivers API and moderation actions remain queued. |
| Backend data and sync model | `/docs/specs/foundations/data-and-sync-model.md` | Landed | Hybrid relational/JSONB contribution model and idempotent offline sync push are implemented locally against PostGIS. |
| Staging end-to-end deployment | `/docs/specs/foundations/platform-configuration.md` | Active | Cloud Run API deploy, Cloud SQL migration, Firebase preview/live deploy, and E2E smoke scripts exist; deploy is blocked until local GCP auth and staging runtime DB URLs are refreshed. |
| Auth and contributor identity | `/docs/specs/contributions/community-contributions.md` | Active | Contributor identity exists for MVP workflows; public contributor-name moderation and real-world operating policy still need hardening. |
| Photo uploads | `/docs/specs/contributions/photo-uploads.md` | Active | Signed-in contribution-scoped photo upload, storage, metadata, display, and moderation slices are landed; feature photo sets, upload-intent hardening, offline media queue, and level-linked metadata remain queued. |
| Community trust and moderation | `/docs/specs/contributions/trust-and-moderation.md` | Active | Backend roles, admin role/trust editing, moderator queues, contribution decisions, and source-derived candidate POI status review exist; scoped moderator permissions and richer audit/edit/merge tools remain queued. |
| Member profiles and paddle history | `/docs/specs/member-tools/member-profiles-and-history.md` | Queued | Later member value: paddled-river history, personal notes, photos, kit, skills, training grounds, profile privacy, and public links. |
| Group paddle sessions | `/docs/specs/group-tools/group-paddle-sessions.md` | Queued | Later club/friend trip planning, check-in/out, session-scoped ICE sharing, advisory kit/skills checks, and session history. |
| Future community, commerce, and learning | `/docs/specs/commerce/community-commerce-and-learning.md` | Parked | Captures marketplace, local recommendations, beginner learning, social discovery, lost-and-found, and monetisation as later-phase ideas. |

## Recommended Next Sprint

1. Deploy migration 016 and seed the five pilot canonical rivers into staging, then smoke-test `/api/rivers` and the Admin Candidates tab against staging data.
2. Harden source-candidate promotion: add moderator edit fields, explicit merge target selection, and an audit view for promoted/merged candidates.
3. Rebuild reviewed section geometry and public POIs from the canonical backend model, replacing the temporary canonical-river overview compatibility rows.
4. Prove the community knowledge loop on 3-5 real rivers/sections: seed, use, contribute, confirm, and refresh.
5. Run a focused Tryweryn verification pass for the near-dam start, centre rules, release source, lower portage, and Bala finish.
6. Run first Wye/Tryweryn feedback sessions with `/docs/product/wye-pilot-feedback-template.md`.
7. Verify upstream Wye and Tryweryn gauge/provider mappings, likely including NRW for Wales.
8. Keep offline draft/outbox support in the critical path because paddlers may contribute from poor-signal locations.
9. Seed GB OSM waterway geometry so route suggestions can visually snap to waterways beyond the small loaded sample catalogue.
10. Retry OS Open Rivers later as optional enrichment once credentials/download access are clear.

## Release Interpretation

No release has been cut yet. Specs may show features as `Landed`, but `Delivered` should remain `—` until an explicit release-cut task.
