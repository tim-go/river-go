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
| Community add mode | `/docs/specs/contributions/community-contributions.md` | Active | Add mode, map placement, and typed contributions are backend-persisted and identity-gated; contributors can attach updates/photos to an existing POI (CON-F19) without creating duplicate markers. |
| Hazard confirmation/resolution | `/docs/specs/contributions/trust-and-moderation.md` | Active | Identity-gated confirm/suggest-correction on POIs (CON-F16) is backed by the API; POI verification status (confirmed/needs-correction/resolved) is tracked server-side. |
| Environment Agency live levels | `/docs/specs/discovery/river-level-providers.md` | Active | Temporary frontend EA adapter exists for mapped lower Wye gauge candidates and falls back for unmapped sections. |
| Observation ingestion | `/docs/specs/foundations/observation-ingestion.md` | Active | Generic backend observation schema and first guarded EA ingestion job are being implemented before Cloud Scheduler automation. |
| Platform configuration | `/docs/specs/foundations/platform-configuration.md` | Active | In-repo `/platform` subproject created for Firebase/GCP config templates, planning scripts, and first-pass provisioning scripts. |
| Source/confidence metadata | `/docs/specs/discovery/river-wye-seed-data.md` | Queued | Needed before serious external feedback. |
| Feedback capture workflow | `/docs/product/wye-pilot-feedback-template.md` | Active | Structured Wye pilot feedback template exists; real sessions still needed. |
| Backend persistence | `/docs/specs/foundations/service-api.md` | Active | Authenticated contribution sync now persists to Postgres and reads back by section; broader section/rivers API and moderation actions remain queued. |
| Backend data and sync model | `/docs/specs/foundations/data-and-sync-model.md` | Landed | Hybrid relational/JSONB contribution model and idempotent offline sync push are implemented locally against PostGIS. |
| Staging end-to-end deployment | `/docs/specs/foundations/platform-configuration.md` | Active | Cloud Run API deploy, Cloud SQL migration, Firebase preview/live deploy, and E2E smoke scripts exist; deploy is blocked until local GCP auth and staging runtime DB URLs are refreshed. |
| Auth and contributor identity | `/docs/specs/contributions/community-contributions.md` | Active | Contribution identity gate is enforced client + server (signed-in · email-verified · public contributor name · accepted contributor terms), with a "Become a contributor" on-ramp. Email verification is relaxed by default pending Resend wiring. |
| Photo uploads | `/docs/specs/contributions/photo-uploads.md` | Active | Signed-in contribution-scoped photo upload, storage, metadata, display, and moderation slices are landed; feature photo sets, upload-intent hardening, offline media queue, and level-linked metadata remain queued. |
| Community trust and moderation | `/docs/specs/contributions/trust-and-moderation.md` | Active | Two-dimension moderation shipped: a visibility gate (published/removed) plus a review-status reason code, review-first by default with trusted direct-publish; authors see their own pending items. Backend roles and admin role/trust editing exist; richer audit/merge tools remain queued. |
| Member profiles and paddle history | `/docs/specs/member-tools/member-profiles-and-history.md` | Queued | Later member value: paddled-river history, personal notes, photos, kit, skills, training grounds, profile privacy, and public links. |
| Group paddle sessions | `/docs/specs/group-tools/group-paddle-sessions.md` | Queued | Later club/friend trip planning, check-in/out, session-scoped ICE sharing, advisory kit/skills checks, and session history. |
| Future community, commerce, and learning | `/docs/specs/commerce/community-commerce-and-learning.md` | Parked | Captures marketplace, local recommendations, beginner learning, social discovery, lost-and-found, and monetisation as later-phase ideas. |

## Recommended Next Sprint

1. Light up live levels on the remaining pilot rivers so every pilot opens to a level. The Dart (EA) and Dee/Llangollen (NRW) need only the paddler-relevant station + measure mapped — a `section_measure_links` seed alongside the existing Wye/Tryweryn entries in `api/src/observations.ts`. The Tay/Grandtully is in Scotland (SEPA), which is outside the current EA + NRW adapters and needs a new provider adapter — a code task, not just data.
2. Discovery depth: river detail page (RIVERDISC-F3), nearby-river list ranked by distance (F4), and fact-based filters (grade/craft/level-state).
3. Begin Tier 3a Member Tools: paddle history log and personal river history, building on the now-solid contribution identity.
4. Re-enable email verification once Resend is wired (`VITE_REQUIRE_EMAIL_VERIFICATION` + `REQUIRE_EMAIL_VERIFICATION`).
5. Run first Wye/Tryweryn feedback sessions with `/docs/product/wye-pilot-feedback-template.md`.
6. Carry-over foundations: keep the offline outbox in the critical path; seed GB OSM waterway geometry for route snapping.

## Release Interpretation

No release has been cut yet. Specs may show features as `Landed`, but `Delivered` should remain `—` until an explicit release-cut task.
