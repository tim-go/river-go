---
roadmap_release_group: Prototype
roadmap_release_item: Demo Prototype
roadmap_release_phase: Now
spec_schema: 4
maturity: Trial
---

# Demo Prototype

**Work state:** Active
**Last updated:** 2026-05-21
**Scope:** The runnable frontend prototype used to validate River Go's River Wye section map and community contribution workflow.

## Purpose

The demo prototype exists to validate River Go's product shape before backend investment. It lets paddlers understand a River Wye section, inspect map-based river knowledge, and test the community contribution flow.

The demo is not yet a production app. It uses seeded data and local browser persistence.

## Product Role

- `Primary user objective:` Understand whether River Go's section-first map and contribution model would help plan and refresh River Wye canoe trips.
- `Classification:` Core
- `Loop step:` Choose / Report / Review
- `Why this matters:` The prototype is the fastest way to validate whether community-maintained river intelligence is a strong enough product wedge before building backend infrastructure.

## References

- `/docs/strategy/product-brief.md`
- `/docs/strategy/river-wye-pilot-plan.md`
- `/docs/product/demo-feedback-plan.md`
- `/docs/specs/core/river-section-map.md`
- `/docs/specs/community/community-contributions.md`
- `/docs/specs/ops/platform-configuration.md`
- `/src/App.tsx`

## Requirements

The prototype must:

- show a usable app as the first screen
- show a left-hand River Wye section list
- show a Leaflet map with traced section routes and map markers
- show selected section details in a right-hand panel
- support explicit add mode for placing community contributions
- support saved contribution markers and popups
- persist demo contributions in localStorage
- avoid claiming that section conditions are safe or verified

Current surfaces:

- top app bar
- river section list
- Leaflet map
- section detail panel
- add-mode banner
- floating contribution form
- seeded community updates
- localStorage-backed demo contributions

Prototype data currently comes from:

- `/src/data/riverWyeSeed.ts`
- `/src/data/wyeRouteTraces.ts`
- `/src/data/demoData.ts`
- localStorage for user-added demo contributions and hazard review state

The prototype should remain lightweight until Wye feedback confirms the contribution model.

## Open Questions

- How much of the current prototype should survive once backend persistence exists?
- Should feedback capture become part of the demo app or remain a separate interview template?
- Which River Wye users should validate the first serious demo pass?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-F1 | React/Vite app shell | App | Landed | prototype | — | Establishes runnable frontend demo. |
| DEMO-F2 | Leaflet map surface | Map | Landed | prototype | — | Uses OpenStreetMap tiles and section overlays. |
| DEMO-F3 | Section detail panel | Map/detail | Landed | prototype | — | Shows selected section summary, access, hazards, reports, and photos. |
| DEMO-F4 | Local demo persistence | Browser | Landed | prototype | — | Stores demo contributions and hazard review state in localStorage. |
| DEMO-F5 | Floating add form | Map | Landed | prototype | — | Replaces buried right-panel form with map overlay contribution form. |
| DEMO-F6 | Backend persistence | Backend | Queued | post-feedback | — | Defer until contribution model is validated with users. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| DEMO-B1 | decision | Decide backend timing | Open | post-feedback | Cloud Run plus Cloud SQL/PostGIS is the preferred backend path, but should wait until Wye feedback. |
| DEMO-B2 | enhancement | Add feedback capture UI/export | Open | prototype | Could support structured demo sessions. |
| DEMO-B3 | dependency | Verify Wye section data | Open | prototype | Needed before serious external demo claims. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
