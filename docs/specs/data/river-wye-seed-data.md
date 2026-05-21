---
roadmap_data_feature_group: Data
roadmap_data_feature_item: River Wye Seed Data
roadmap_data_feature_phase: Now
spec_schema: 4
maturity: Trial
---

# River Wye Seed Data

**Work state:** Active
**Last updated:** 2026-05-21
**Scope:** Draft River Wye pilot section data, route traces, marker placement, and validation requirements.

## Purpose

The River Wye seed dataset provides a realistic pilot area for validating River Go's section model, map UX, and community contribution workflow.

The seed data is draft and unverified. It should not be treated as published trip advice.

## Product Role

- `Primary user objective:` Browse plausible River Wye sections and identify where community verification is needed.
- `Classification:` Core
- `Loop step:` Choose / Review
- `Why this matters:` The Wye pilot is the first test of whether River Go can turn a real river corridor into structured, community-maintained section knowledge.

## References

- `/docs/strategy/river-wye-pilot-plan.md`
- `/docs/strategy/river-wye-seed-dataset.md`
- `/docs/specs/core/river-section-map.md`
- `/src/data/riverWyeSeed.ts`
- `/src/data/wyeRouteTraces.ts`
- `/scripts/generateWyeRouteTraces.mjs`

## Requirements

The seed dataset must provide seven initial River Wye sections:

- Glasbury to Hay-on-Wye
- Hay-on-Wye to Whitney Bridge
- Whitney Bridge to Bredwardine
- Hoarwithy to Ross-on-Wye
- Ross-on-Wye to Kerne Bridge
- Kerne Bridge to Symonds Yat
- Symonds Yat to Monmouth

Each section should include:

- section name
- summary
- route
- distance
- estimated time
- difficulty
- suitability
- level label
- runnable guidance
- access summary
- gauge candidate
- access points
- hazards
- features
- placeholder photos
- seed reports

Wye route traces are generated from OpenStreetMap River Wye waterway geometry via Overpass. The resulting route traces are stored as TypeScript fixture data for the prototype.

For demo coherence, seeded marker locations are snapped to nearest points on the traced route.

Before public use, validate:

- section splits
- put-in points
- take-out points
- parking and access notes
- gauge-to-section relevance
- runnable ranges
- fixed hazards
- recent hazards
- photo reference points
- source metadata and confidence

## Open Questions

- Which section splits should be changed after local review?
- What field-level confidence model should be used?
- Should OSM-derived route traces be used in production or replaced by a provider-backed geometry source?
- Which gauge candidates are actually relevant to each Wye section?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| WYE-F1 | Seven Wye seed sections | Data/map | Landed | prototype | — | Draft seed sections are in fixture data. |
| WYE-F2 | OSM-derived route traces | Data/map | Landed | prototype | — | Generated traces replace straight route lines. |
| WYE-F3 | Marker snapping | Data/map | Landed | prototype | — | Seeded markers snap to nearest route point for demo display. |
| WYE-F4 | Source metadata | Data | Queued | v0.2 | — | Add source/confidence fields before serious external validation. |
| WYE-F5 | Local verification pass | Research/data | Queued | v0.2 | — | Validate with Wye paddlers/clubs/operators. |
| WYE-F6 | Photo-needed markers | Community/data | Queued | v0.2 | — | Turn placeholder photo needs into contribution prompts. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| WYE-B1 | dependency | OSM licence review | Open | v0.2 | Required before production use of derived route geometry. |
| WYE-B2 | decision | Field-level confidence model | Open | v0.2 | Needed for seed data and community data. |
| WYE-B3 | dependency | Local contributor review | Open | v0.2 | Needed before treating seed data as credible. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
