---
roadmap_data_feature_group: Data
roadmap_data_feature_item: River Wye Seed Data
roadmap_data_feature_phase: Now
spec_schema: 4
maturity: Trial
---

# River Wye Seed Data

**Work state:** Retired (2026-07-02)
**Last updated:** 2026-07-02
**Scope:** Draft River Wye pilot section data, route traces, marker placement, and validation requirements.

> **Retired:** sections are community-origin only — RiverLaunch does not seed or
> declare paddleable sections (liability decision, see
> `/docs/specs/contributions/route-submissions.md`). The Wye section fixtures
> and their `section_fixture` link rows are being removed per
> `/docs/development/plan-community-sections.md`. This spec is kept for
> historical reference; the gauge research below remains useful for river-level
> mapping.

## Purpose

The River Wye seed dataset provides a realistic pilot area for validating RiverLaunch.app's section model, map UX, and community contribution workflow.

The seed data is draft and unverified. It should not be treated as published trip advice.

## Product Role

- `Primary user objective:` Browse plausible River Wye sections and identify where community verification is needed.
- `Classification:` Core
- `Loop step:` Choose / Review
- `Why this matters:` The Wye pilot is the first test of whether RiverLaunch.app can turn a real river corridor into structured, community-maintained section knowledge.

## References

- `/docs/strategy/river-wye-pilot-plan.md`
- `/docs/strategy/river-wye-seed-dataset.md`
- `/docs/specs/discovery/river-section-map.md`
- `/src/data/riverWyeSeed.ts`
- `/src/data/wyeRouteTraces.ts`
- `/scripts/build/generateWyeRouteTraces.mjs`

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
- source metadata
- confidence metadata

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
| WYE-F4 | Source metadata | Data | Landed | v0.2 | — | Wye seed sections and nested seed items carry source/confidence metadata. |
| WYE-F5 | Local verification pass | Research/data | Queued | v0.2 | — | Validate with Wye paddlers/clubs/operators. |
| WYE-F6 | Photo-needed markers | Community/data | Active | v0.2 | — | Photo contribution flow is clearer; seeded photo prompts still need specific map prompts. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| WYE-B1 | dependency | OSM licence review | Open | v0.2 | Required before production use of derived route geometry. |
| WYE-B2 | decision | Field-level confidence model | Resolved | v0.2 | Use source metadata with low/medium/high plus seed confidence for prototype. |
| WYE-B3 | dependency | Local contributor review | Open | v0.2 | Needed before treating seed data as credible. |
| WYE-B4 | validation | Run first structured Wye feedback sessions | Open | v0.2 | Use `/docs/product/pilot-feedback-template.md`. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Added source/confidence metadata requirement and tracking updates. |
| 2026-05-21 | Migrated to spec schema v4. |
