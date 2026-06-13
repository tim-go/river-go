---
roadmap_data_feature_group: Data
roadmap_data_feature_item: UK Kayaking Sample Catalogue
roadmap_data_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# UK Kayaking Sample Catalogue

**Work state:** Active
**Last updated:** 2026-05-23
**Scope:** Prototype seed sections for well-known UK canoeing and kayaking rivers beyond the Tryweryn and Wye pilot data.

## Purpose

The UK kayaking sample catalogue makes the demo feel like a national discovery app rather than a single-river prototype.

The catalogue is not a ranked list and is not verified guidebook advice. It is a curated starter set of familiar UK paddling rivers for testing search, favourites, map browsing, and future filters.

## Product Role

- `Primary user objective:` See how RiverLaunch.app could browse multiple well-known rivers across the UK.
- `Classification:` Data
- `Loop step:` Browse / Choose
- `Why this matters:` A single sample river cannot validate discovery, account-gated favourites, or future grade/runnability filters.

## References

- `/docs/specs/discovery/public-source-seeding.md`
- `/docs/strategy/public-seed-source-register.md`
- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/identity/app-shell-navigation.md`
- `/docs/specs/discovery/river-wye-seed-data.md`
- `/docs/specs/discovery/river-tryweryn-seed-data.md`
- `/src/data/ukKayakingSeed.ts`
- `/src/data/demoData.ts`

## Requirements

The prototype should include an active sample set covering a mix of:

- dam-release whitewater
- rain-fed whitewater
- intermediate club-trip rivers
- touring canoe/kayak rivers
- England, Wales, Scotland, and Norfolk Broads-style lowland paddling

The first catalogue includes:

- River Dart
- River Dee
- River Usk
- River Tay
- River Spey
- River Findhorn
- River Orchy
- River Etive
- River Moriston
- River Garry
- River Tummel
- River Tees
- River Bure / Norfolk Broads

The active demo should also include:

- River Tryweryn seed sections
- River Wye seed sections

All sample catalogue records must be labelled as seed/prototype data with low confidence.

Public sources used for the catalogue must be recorded in `/docs/strategy/public-seed-source-register.md` before they are treated as seed inputs. Reference-only and permission-needed sources may support discovery and verification prompts, but must not be copied into route descriptions, POIs, photos, or GPX/geometry imports without explicit reuse rights.

Route lines in `/src/data/ukKayakingSeed.ts` are schematic and must not be treated as verified route traces. Replace them with licensed/verified geometry before production use.

Each sample should provide enough data for the current UI:

- section name
- summary
- schematic route
- approximate distance
- estimated time
- difficulty
- suitability
- level/runnability placeholder
- access summary
- candidate access points
- verification-needed hazard
- feature note
- placeholder photo
- seed report
- source metadata

## Open Questions

- Which rivers should be in the first real UK discovery catalogue?
- Should the catalogue include flatwater/touring rivers and whitewater rivers in one list, or separate discovery modes?
- What source/licence model should provide production route geometry?
- Which paddling clubs or local contributors can validate each river first?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| UKCAT-F1 | UK sample catalogue | Data/map/search | Active | prototype | — | Adds 13 extra sample sections beyond Tryweryn and Wye. |
| UKCAT-F2 | Wye in active demo | Data/map/search | Active | prototype | — | Re-adds existing River Wye seed sections to active demo data. |
| UKCAT-F3 | Seed confidence labels | Data | Active | prototype | — | Catalogue entries use low-confidence seed metadata and verification-needed notes. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| UKCAT-B1 | validation | Confirm river shortlist | Open | v0.2 | Validate with UK paddlers before treating the list as representative. |
| UKCAT-B2 | dependency | Verified route geometry | Open | v0.2 | Replace schematic routes with licensed/verified traces. |
| UKCAT-B3 | research | River popularity evidence | Open | v0.2 | Avoid claiming "most popular" without defensible source data. |
| UKCAT-B4 | task | Align sample sources with source register | Open | v0.2 | Replace weak/generic source references with registered source entries and explicit permission classifications. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-23 | Added initial UK kayaking sample catalogue spec. |
