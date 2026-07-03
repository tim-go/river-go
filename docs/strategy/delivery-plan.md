# Delivery Plan

**Last reconciled:** 2026-07-03 (against shipped code — earlier revisions materially understated what's built).

## Purpose

This document gives a clear view of the current delivery state. The full feature set (by product tier) is `/docs/strategy/feature-register.md`; the phased view is `/docs/strategy/roadmap.md`; detailed durable behaviour lives in `/docs/specs`.

## Current Delivery State

| Feature | Owning Spec | State | Current Notes |
| --- | --- | --- | --- |
| Product strategy docs | `/docs/strategy/product-brief.md` | Landed | UK-first community river intelligence positioning is documented; `/docs/strategy/strategic-positioning.md` records the decision not to build a smaller RiverApp. |
| Core geospatial domain model | `/docs/specs/foundations/geospatial-domain-model.md` | Active | Decoupled model: watercourses, routes, POIs, observations, photos, reports, groups/sessions as independent records with relationships. Location-owned POIs (`pois` index) + community `routes` now built; whole-river grouping still forward-looking. |
| River-first discovery | `/docs/specs/discovery/river-first-discovery.md` | Active | Built: canonical river markers/list, selected-river context, level-band colouring, discipline filter. Queued: river **detail page** (F3), **nearby-river list** (F4), historical charts on the card (F7). |
| Canonical river database | `/docs/specs/discovery/canonical-river-database.md` | Active | **62 canonical rivers**, geometry from **OS Open Rivers** (single clean traces), coloured by live level band; public river read API, moderator source-candidate queue, confirm-to-POI promotion all built. Official WFD/status enrichment still queued. |
| River section map | `/docs/specs/discovery/river-section-map.md` | Active | Map shell, OS-Open-Rivers geometry, live level colouring, Layers control, POI layer (access/hazard/feature), stations layer, amenities layer, rain-radar + 7-day forecast, viewport culling. Grade (WW I–V) filter still queued. |
| Amenities & emergency points | `/docs/specs/discovery/nearby-amenities-and-emergency-points.md` | Active | OSM amenities pipeline + map layer (pubs / car parks / toilets / cafés / shops) shipped; emergency-point set (defibs/hospitals) still to extend. |
| Observation ingestion / live levels | `/docs/specs/foundations/observation-ingestion.md` · `/docs/specs/discovery/river-level-providers.md` | Active | Generic observation schema; **EA + NRW adapters**; ~30-min ingest + backfill + admin manual refresh; per-river/section read API + chart (latest / trend / 48h·7d·28d). River gauges re-keyed to `river_measure_links` (2026-07-02). Queued: **SEPA adapter** (Scotland), rainfall/tide types, stale-labelling, job alerting. |
| Community sections (canonical routes) | `/docs/specs/contributions/route-submissions.md` · `/docs/development/plan-community-sections.md` | **Landed (2026-07-02)** | Community-origin only. `routes` table + moderator **Promote to section** + public read API + map display (put-in/take-out markers, one Sections layer) + Section Favs. Suggest/trace/snap/moderation/impact-review pipeline all live. Deferred: per-section gauge links, "On this stretch" river-POI derivation, club-owned private routes. |
| Water quality / sewage context | `/docs/specs/discovery/water-quality.md` | **On hold (2026-07-03)** | Spec ready; **build paused** after a coverage check: spill data is strong in England/Wales but patchy in Scotland (~40–50% of CSOs), and our rivers are upland/whitewater (overflows cluster downstream near towns). Bathing classifications are too sparse (~14 EN + 2 WA + ~0 SC river sites). Revisit as a targeted layer on touring/lowland rivers (Wye, Dart, Usk, Teme) rather than the whole set. |
| Community add mode | `/docs/specs/contributions/community-contributions.md` | Active | Add mode, map placement, typed contributions backend-persisted + identity-gated; attach updates/photos to an existing POI (CON-F19) without duplicate markers. Queued: rich feature + access/parking categories. |
| Auth and contributor identity | `/docs/specs/contributions/community-contributions.md` · `/docs/specs/identity/app-shell-navigation.md` | Active | Identity gate enforced client + server (signed-in · email-verified · public name · contributor terms) + "Become a contributor" on-ramp. Email verification relaxed by default — **confirm Resend wiring** (`posts-and-sharing` implies it's live) before re-enabling the flags. |
| Photos | `/docs/specs/contributions/photo-uploads.md` | Active | Upload (resize → Firebase Storage → metadata) · display · moderation landed. Queued: **level-linked metadata** (F12) + level filtering (F13), feature photo sets, offline photo queue. |
| Trust and moderation | `/docs/specs/contributions/trust-and-moderation.md` | Active | Two-dimension moderation (visibility gate + review-status reason), review-first + trusted direct-publish, roles (member/trusted/moderator/admin) + admin role/trust editing. Queued: **staleness rules (7/30/90-day)**, richer audit/merge. |
| Member profiles and paddle history | `/docs/specs/member-tools/member-profiles-and-history.md` | Queued | Tier 3a, not started: paddle-history log, personal river history, stats/recap, kit, skills, training grounds. (Kit/skills models already feed Groups' advisory coverage.) |
| Group paddle sessions (Meetups) | `/docs/specs/group-tools/group-paddle-sessions.md` | **V1 Delivered (2026-06-16)** | Clubs/subgroups/friend/trip groups, roles, planned sessions, RSVP + availability, check-in/out lifecycle, session-scoped ICE consent, advisory kit/skills coverage, manual completion. Parked: location sharing / SOS (GROUP-F8). |
| Group membership & invites v2 | `/docs/specs/group-tools/group-membership-and-invites.md` | **Landed** | `/api/members/search` retired; invite-by-exact-email, group link + request-to-join, access modes (request_to_join / invite_only), invite/request management, ownership transfer, role promote/demote, membership audit (migration 032). Parked: non-member email invites (F7), public/discoverable groups (F8). |
| Public profile page | `/docs/specs/member-tools/public-profile.md` | Draft | Design agreed, `/p/<handle>` not implemented (needs SSR/OG meta). |
| Posts & social sharing | `/docs/specs/group-tools/posts-and-sharing.md` | Draft | Post primitive + external share-cards specified, not built; messaging/chat deferred. |
| PWA installable + offline | `/docs/specs/pwa-installable.md` · `/docs/specs/foundations/offline-mode.md` | Active | Installable PWA (Android WebAPK + iOS A2HS) + service-worker app-shell cache shipped; contribution outbox + idempotent sync built. Queued: runtime data caching (open offline with last-known rivers/levels), offline data packs, offline photo queue. |
| Backend service API | `/docs/specs/foundations/service-api.md` | Active | Cloud Run API, Firebase Auth, PostGIS; endpoints for rivers, POIs, contributions, photos, observations, groups/sessions/membership, routes, moderation. Broad and in-flight. |
| Backend data and sync model | `/docs/specs/foundations/data-and-sync-model.md` | Landed | Hybrid relational/JSONB model + idempotent offline sync push against PostGIS. |
| Staging end-to-end deployment | `/docs/specs/foundations/platform-configuration.md` | Active | Cloud Run deploy, Cloud SQL migration, Firebase deploy, E2E smoke scripts. **Staging auto-deploys from `main`.** Scheduled ingestion via Cloud Scheduler + OIDC still to confirm in prod. |
| Feedback capture workflow | `/docs/product/wye-pilot-feedback-template.md` | Active | Template exists; **real pilot sessions still not run** — the biggest unaddressed validation gap. |
| Future community, commerce, learning | `/docs/specs/commerce/community-commerce-and-learning.md` | Parked | Marketplace, recommendations, beginner learning, social discovery, lost-and-found, monetisation. |

## Recommended Next Sprint

The prior sprint's headline item (community sections) is **done**. Current priorities:

1. **Discovery river detail page (RIVERDISC-F3) + nearby-river list (F4).** Highest user-facing value, cheap — the map, level-state, discipline filter, and observation history already exist; this is the last mile of the core "find a river" job and the thing to put in front of pilot paddlers.
2. **Run the first Wye/Tryweryn pilot feedback sessions** (`/docs/product/wye-pilot-feedback-template.md`). A large, unvalidated surface area is built; real feedback may reorder everything below.
3. **Level-linked photos (PHOTO-F12) + historical level chart on the river card (RIVERDISC-F7).** Both ride on data that already exists (observation history, level state).
4. **Trips / unified float-plan engine** (new spec to write). One `trips` + `trip_legs` model serving both solo float-plans (fills the vacant RYA SafeTrx niche) and club Meetups; freeform-first legs with optional section links; one trip-level return deadline + server-side overdue escalation. Builds on Groups V1 + sections.
5. **Confirm/close email verification** — verify Resend is wired, then re-enable `VITE_REQUIRE_EMAIL_VERIFICATION` + `REQUIRE_EMAIL_VERIFICATION`.
6. **Foundations carry-over:** SEPA level adapter (Scotland pilots), staleness rules (TRUST-F5), "useful offline" runtime caching.

**On hold:** water quality (see table) — revisit as a targeted touring-river layer, not a whole-set spine.

## Release Interpretation

No release has been cut yet. Specs may show features as `Landed`, but `Delivered` should remain `—` until an explicit release-cut task. The product currently spans roadmap Phases 2–4 (largely delivered) with Phase 5 (UK coverage) partly realised at 62 rivers.
