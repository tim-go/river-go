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
| River Wye pilot dataset | `/docs/specs/data/river-wye-seed-data.md` | Active | Seven Wye sections are seeded with OSM-derived route traces; access/hazard data remains unverified. |
| Community add mode | `/docs/specs/community/community-contributions.md` | Active | Add mode, map placement, saved markers, and popups exist in localStorage demo form. |
| Hazard confirmation/resolution | `/docs/specs/community/trust-and-moderation.md` | Active | Demo supports confirm/resolve for seeded and user-added hazards; no real moderation backend yet. |
| Environment Agency live levels | `/docs/specs/data/river-level-providers.md` | Queued | Next technical feature. Should start with a frontend provider adapter but be designed for backend ingestion. |
| Platform configuration | `/docs/specs/ops/platform-configuration.md` | Active | In-repo `/platform` subproject created for Firebase/GCP config templates, planning scripts, and first-pass provisioning scripts. |
| Source/confidence metadata | `/docs/specs/data/river-wye-seed-data.md` | Queued | Needed before serious external feedback. |
| Feedback capture workflow | `/docs/product/demo-feedback-plan.md` | Queued | Plan exists; needs interview notes/template and real sessions. |
| Backend persistence | `/docs/specs/ops/platform-configuration.md` | Queued | Target Cloud Run plus Cloud SQL/PostGIS once Wye/demo feedback validates contribution model. |
| Auth and contributor identity | `/docs/specs/community/community-contributions.md` | Queued | Needed before real community data collection. |
| Photo uploads | `/docs/specs/community/community-contributions.md` | Queued | Currently represented as placeholder/photo contribution metadata only. |
| Moderation dashboard | `/docs/specs/community/trust-and-moderation.md` | Queued | Needed before public community launch. |

## Recommended Next Sprint

1. Add Environment Agency provider adapter for Wye gauge candidates.
2. Add source and confidence fields to the Wye seed dataset.
3. Tighten the contribution workflow around separate actions: report condition, add hazard, add access update, add photo.
4. Create a feedback capture template and run the first Wye demos.
5. Review `/platform` staging/prod config names before provisioning Firebase/GCP resources.

## Release Interpretation

No release has been cut yet. Specs may show features as `Landed`, but `Delivered` should remain `—` until an explicit release-cut task.
