---
roadmap_release_group: Prototype
roadmap_release_item: Demo Prototype
roadmap_release_phase: Now
spec_schema: 4
maturity: Trial
---

# Demo Prototype

**Work state:** Active
**Last updated:** 2026-06-05
**Scope:** The runnable frontend prototype used to validate RiverLaunch.app's river/section map, dam-release Tryweryn sample, and community contribution workflow.

## Purpose

The demo prototype exists to validate RiverLaunch.app's product shape before backend investment. It lets paddlers understand a real river section, inspect map-based river knowledge, and test the community contribution flow.

The demo is not yet a production app. It uses seeded data and local browser persistence.

## Product Role

- `Primary user objective:` Understand whether RiverLaunch.app's river/section map and contribution model would help plan and refresh river knowledge.
- `Classification:` Core
- `Loop step:` Choose / Report / Review
- `Why this matters:` The prototype is the fastest way to validate whether community-maintained river intelligence is a strong enough product wedge before building backend infrastructure.

## References

- `/docs/strategy/product-brief.md`
- `/docs/strategy/river-wye-pilot-plan.md`
- `/docs/product/demo-feedback-plan.md`
- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/foundations/platform-configuration.md`
- `/src/App.tsx`

## Requirements

The prototype must:

- show a usable app as the first screen
- show river/section browsing context
- show a Leaflet map with traced section routes and map markers
- show selected section details in a right-hand panel
- support explicit add mode for placing community contributions
- support saved contribution markers and popups
- persist demo contributions in localStorage
- avoid claiming that section conditions are safe or verified

Current surfaces:

- top app bar
- river/section list or browsing context
- Leaflet map
- section detail panel
- add-mode banner
- floating contribution form
- seeded community updates
- localStorage-backed demo contributions

Prototype data currently comes from:

- `/src/data/riverTrywerynSeed.ts`
- `/src/data/trywerynRouteTraces.ts`
- `/src/data/riverWyeSeed.ts`
- `/src/data/wyeRouteTraces.ts`
- `/src/data/demoData.ts`
- localStorage for user-added demo contributions and hazard review state

The active sample map currently uses River Tryweryn sections, including a near-dam Llyn Celyn release/stilling-basin section. Wye fixtures remain in the repo for pilot work but are not the active demo dataset.

The public app brand is RiverLaunch.app. Internal repo, GCP, Firebase, and deployment IDs remain `river-go`.

The prototype should remain lightweight until feedback confirms the contribution model.

## Open Questions

- How much of the current prototype should survive once backend persistence exists?
- Should feedback capture become part of the demo app or remain a separate interview template?
- Which Tryweryn contributors or centre/local paddlers should validate the dam-release sample?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-F1 | React/Vite app shell | App | Landed | prototype | — | Establishes runnable frontend demo. |
| DEMO-F2 | Leaflet map surface | Map | Landed | prototype | — | Uses OpenStreetMap tiles and section overlays. |
| DEMO-F3 | Section detail panel | Map/detail | Landed | prototype | — | Shows selected section summary, access, hazards, reports, and photos. |
| DEMO-F4 | Local demo persistence | Browser | Landed | prototype | — | Stores demo contributions and hazard review state in localStorage. |
| DEMO-F5 | Floating add form | Map | Landed | prototype | — | Replaces buried right-panel form with map overlay contribution form. |
| DEMO-F6 | Tryweryn active sample | Data/map | Active | prototype | — | Demo data now focuses on a dam-release Tryweryn sample beginning near Llyn Celyn dam. |
| DEMO-F7 | Backend persistence | Backend | Queued | post-feedback | — | Defer until contribution model is validated with users. |
| DEMO-F8 | RiverLaunch.app public brand | App shell | Active | prototype | — | Visible app title and browser title use RiverLaunch.app while internal IDs remain `river-go`. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| DEMO-B1 | decision | Decide backend timing | Open | post-feedback | Cloud Run plus Cloud SQL/PostGIS is the preferred backend path, but should wait until Wye feedback. |
| DEMO-B2 | enhancement | Add feedback capture UI/export | Open | prototype | Could support structured demo sessions. |
| DEMO-B3 | dependency | Verify Wye section data | Open | prototype | Needed before serious external demo claims. |
| DEMO-B4 | dependency | Verify Tryweryn near-dam access and release data | Open | prototype | Needed before treating the Tryweryn sample as paddling guidance. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
| 2026-05-23 | Switched active sample data to River Tryweryn, starting near the Llyn Celyn dam release. |
| 2026-05-23 | Updated public app brand to RiverLaunch.app. |
| 2026-06-05 | Aligned prototype language with river-first discovery while retaining section-detail behaviour. |
