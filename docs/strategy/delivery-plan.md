# Delivery Plan

## Purpose

This document gives a clear view of the feature set we want to deliver and the current delivery state. Detailed durable behaviour lives in `/docs/specs`.

## Current Delivery State

| Feature | Owning Spec | State | Current Notes |
| --- | --- | --- | --- |
| Product strategy docs | `/docs/strategy/product-brief.md` | Landed | UK-first community river intelligence positioning is documented. |
| Community data strategy | `/docs/strategy/community-data-strategy.md` | Landed | First-party community data is defined as the core product asset. |
| Data source strategy | `/docs/strategy/data-sources-and-gaps.md` | Landed | UK provider landscape and community-only gaps are documented. |
| Demo app shell | `/docs/specs/release/demo-prototype.md` | Landed | React/Vite/Leaflet prototype exists. |
| River section map | `/docs/specs/core/river-section-map.md` | Landed | Section list, map, section panel, route lines, and markers exist. |
| Offline mode | `/docs/specs/core/offline-mode.md` | Queued | Offline use is now a core requirement; PWA app-shell/data cache, contribution outbox, and sync API are not implemented yet. |
| River Wye pilot dataset | `/docs/specs/data/river-wye-seed-data.md` | Active | Seven Wye sections are seeded with OSM-derived route traces and source/confidence metadata; access/hazard data remains unverified. |
| Community add mode | `/docs/specs/community/community-contributions.md` | Active | Add mode, map placement, saved markers, popups, and clearer contribution-type prompts exist in localStorage demo form. |
| Hazard confirmation/resolution | `/docs/specs/community/trust-and-moderation.md` | Active | Demo supports confirm/resolve for seeded and user-added hazards; no real moderation backend yet. |
| Environment Agency live levels | `/docs/specs/data/river-level-providers.md` | Active | Temporary frontend EA adapter exists for mapped lower Wye gauge candidates and falls back for unmapped sections. |
| Platform configuration | `/docs/specs/ops/platform-configuration.md` | Active | In-repo `/platform` subproject created for Firebase/GCP config templates, planning scripts, and first-pass provisioning scripts. |
| Source/confidence metadata | `/docs/specs/data/river-wye-seed-data.md` | Queued | Needed before serious external feedback. |
| Feedback capture workflow | `/docs/product/wye-pilot-feedback-template.md` | Active | Structured Wye pilot feedback template exists; real sessions still needed. |
| Backend persistence | `/docs/specs/backend/service-api.md` | Queued | Cloud Run, Firebase Auth, Firebase Storage, PostgreSQL/PostGIS, and moderation API boundaries are specced. |
| Auth and contributor identity | `/docs/specs/community/community-contributions.md` | Queued | Needed before real community data collection. |
| Photo uploads | `/docs/specs/community/community-contributions.md` | Queued | Currently represented as placeholder/photo contribution metadata only. |
| Moderation dashboard | `/docs/specs/community/trust-and-moderation.md` | Queued | Needed before public community launch. |

## Recommended Next Sprint

1. Resolve GCP billing account project-link quota so staging can finish setup.
2. Run first Wye feedback sessions with `/docs/product/wye-pilot-feedback-template.md`.
3. Verify upstream Wye gauge/provider mappings, likely including NRW for Wales.
4. Decide backend package shape, migration tooling, and offline sync-friendly IDs before writing API code.
5. Design the first local/offline contribution outbox before replacing localStorage with API-only persistence.
6. Add deploy workflow only after billing is linked and staging health check is green.

## Release Interpretation

No release has been cut yet. Specs may show features as `Landed`, but `Delivered` should remain `—` until an explicit release-cut task.
