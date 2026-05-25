---
roadmap_data_feature_group: Data
roadmap_data_feature_item: River Tryweryn Seed Data
roadmap_data_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# River Tryweryn Seed Data

**Work state:** Active
**Last updated:** 2026-05-23
**Scope:** Draft River Tryweryn demo section data, starting near the Llyn Celyn dam release and continuing through the lower Tryweryn.

## Purpose

The River Tryweryn seed dataset gives the prototype a dam-release whitewater river where release state, venue rules, hazards, portages, and community verification are central to the product.

The seed data is draft and unverified. It must not be treated as published trip advice.

## Product Role

- `Primary user objective:` Inspect a dam-release whitewater section and understand where local knowledge is required before paddling.
- `Classification:` Core
- `Loop step:` Choose / Review / Report
- `Why this matters:` The Tryweryn makes the value of RiverLaunch.app clearer: static map data is not enough when release schedules, centre rules, obstructions, and portage knowledge change.

## References

- `/docs/specs/core/river-section-map.md`
- `/docs/specs/data/river-level-providers.md`
- `/docs/specs/community/community-contributions.md`
- `/src/data/riverTrywerynSeed.ts`
- `/src/data/trywerynRouteTraces.ts`
- National White Water Centre river guide: `https://www.nationalwhitewatercentre.co.uk/the-river`
- National White Water Centre water level information: `https://www.nationalwhitewatercentre.co.uk/water-level-information`
- OpenStreetMap copyright: `https://www.openstreetmap.org/copyright`

## Requirements

The seed dataset must provide a Tryweryn-focused sample map with:

- a section beginning near the Llyn Celyn dam/stilling-basin outflow
- a downstream section from Canolfan Tryweryn toward Bala
- OSM-derived route traces that follow the river line
- dam-release context and live-release caveats
- access points marked as candidates until verified
- hazards for release-dependent flow, technical rapids, bridge warnings, natural obstructions, and lower-section portage decisions
- source metadata and confidence metadata on seeded items
- photo-needed prompts for community validation
- user-provided Tryweryn river photography for the active section hero and photo grid, with location/caption verification still required

The active demo must make the near-dam section visible by default through the normal section list and map selection behaviour.

Before public use, validate:

- authorised start/access near the dam and centre
- whether near-dam points should be labelled as access, release reference, or feature only
- current facility-fee/check-in requirements
- release calendar data source and refresh model
- NRW Bala Weir X level and Tryweryn Dam rainfall relevance to the upper/centre sections
- exact bridge and rapid names
- lower-section portage route and Bala finish
- OSM/ODbL obligations for derived route geometry

## Open Questions

- Should Tryweryn release information be integrated from the centre page, NRW data, or both? Initial backend ingestion uses NRW level/rainfall as context only; it does not replace release calendar data.
- Should dam-release rivers have a dedicated `release` level-provider model separate from gauge readings?
- What field-level confidence is needed for venue-managed access points?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TRYWERYN-F1 | Near-dam sample section | Data/map | Active | prototype | — | Starts near the Llyn Celyn outflow/stilling basin and runs to the centre. |
| TRYWERYN-F2 | Lower Tryweryn sample section | Data/map | Active | prototype | — | Provides Bala/portage context below the centre. |
| TRYWERYN-F3 | OSM-derived Tryweryn route traces | Data/map | Active | prototype | — | Route traces follow the river geometry for demo use. |
| TRYWERYN-F4 | Release-aware seed metadata | Data/levels | Active | prototype | — | Release checks remain centre-page seed metadata; NRW Bala Weir X level and Tryweryn Dam rainfall are available as candidate context observations. |
| TRYWERYN-F5 | User-provided river photo | Data/media | Active | prototype | — | Demo uses `/images/river-tryweryn.jpeg` for Tryweryn section imagery. |
| TRYWERYN-F6 | Local verification pass | Research/data | Queued | v0.2 | — | Needs local paddler, centre, and NRW/source validation. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| TRYWERYN-B1 | dependency | Confirm release data source | Open | v0.2 | Centre water-level page currently describes release availability; production needs a reliable ingest model. |
| TRYWERYN-B2 | dependency | OSM licence review | Open | v0.2 | Required before using derived route geometry as product data. |
| TRYWERYN-B3 | validation | Verify near-dam access semantics | Open | prototype | The first marker may be a release/stilling-basin reference rather than a public put-in. |
| TRYWERYN-B4 | validation | Verify lower portage and Bala take-out | Open | prototype | Needs local photos and current instructions. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-23 | Added user-provided Tryweryn photo as active section imagery. |
| 2026-05-23 | Added Tryweryn seed-data spec for dam-release sample map. |
