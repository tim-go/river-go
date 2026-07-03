---
roadmap_core_feature_group: Core Map
roadmap_core_feature_item: River-First Discovery
roadmap_core_feature_phase: Soon
spec_schema: 4
maturity: Sketch
---

# River-First Discovery

**Work state:** Queued
**Last updated:** 2026-06-15
**Scope:** River-led discovery, river overview pages, selected-river map behaviour, and nearby river browsing.

## Purpose

RiverLaunch.app should present rivers as the main discovery object and treat routes/sections as supporting interpretations of part of a river.

This reduces the risk that the product sounds like it publishes official, curated, safety-certified routes. Rivers are physical named watercourses. RiverLaunch can then show community-maintained knowledge about access, features, conditions, photos, reports, and possible paddled sections with visible uncertainty.

Route and section records remain in the product and backend because paddlers still need put-in/take-out, distance, grade, level, and evidence context. They should not be the only top-level mental model.

## Product Role

- `Primary user objective:` Find nearby or relevant rivers, inspect their character and current context, then choose which specific section or feature to investigate.
- `Classification:` Core discovery
- `Loop step:` Discover / Choose
- `Why this matters:` A river-first model is clearer for users, easier to browse at national scale, and more defensible than implying RiverLaunch publishes authoritative paddle routes.

## References

- `/docs/specs/foundations/geospatial-domain-model.md`
- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/discovery/uk-kayaking-sample-catalogue.md`
- `/docs/specs/discovery/river-level-providers.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/contributions/photo-uploads.md`
- `/docs/strategy/strategic-positioning.md`

## Requirements

### Discovery Model

The overview map should show one primary river marker or compact cluster per river where possible, instead of requiring every section, access point, hazard, and feature to be visible at national or regional zoom.

River markers should communicate compact context without claiming safety:

- river initial or short label
- representative grade band where known
- current runnable/level state where a relevant observation exists
- whether recent community reports or unresolved hazards exist
- whether the river has verified, candidate, or sparse data

Suggested grade colour treatment:

- Grade 1: blue
- Grade 2: green
- Grade 3: yellow
- Grade 4: orange
- Grade 5 and above: red

Grade colour must not be the only meaning channel. The map should also use labels, icons, or legends because colour alone is not accessible and grade can vary by section and level.

Runnability should use wording such as `low`, `good range`, `high`, `no recent reading`, or `unknown`, not `safe`.

### Selected River Behaviour

Selecting a river should create a selected-river context.

In selected-river context, the map may show:

- known sections or candidate routes on that river
- access points
- parking and shuttle points
- hazards
- rapids, playspots, waves, eddies, portages, bridges, and notable features
- gauges or release references
- photos and recent reports
- nearby rivers for comparison

The first implementation may be deliberately sparse: selected-river context can start with a canonical river summary, linked-section count, candidate POI counts, curation/source-confidence labels, and known section shortcuts. Source-derived candidate POIs must remain hidden from public map detail until reviewed.

The UI should allow users to hide or filter dense feature layers so the map remains legible. Access and parking should remain easy to distinguish from generic features.

#### Card vs detail layering

The selected-river card is a **scannable overview, not a deep record**. It shows the priority facts (today's level, grade, notable features) plus counts that lead into depth (for example "Hazards · 3", "Photos · 12") — it must not bury the first glance behind tabs, which was the failure of the earlier section-shaped overview.

Per-aspect depth — the earlier card's Levels (incl. historical charts, RIVERDISC-F7), Access, Hazards, Updates, and Photos tabs — lives one layer down, in the **river detail surface**: the river page (RIVERDISC-F3) or an **expanded card view** (the panel already has an expand affordance). Tabs/sections are acceptable there, where the user has chosen to go deep. Section-specific depth (a particular paddle's put-in/take-out, access, and hazards) lives in section detail. Lean on expand-in-place first, before building the full river page.

### River Page

**Panel vs page — two surfaces, one data model (decided 2026-07-03).** The map
river *panel* and the river *page* are deliberately different surfaces for
different intents, and must not drift:

- **Map river panel (the glance)** — the ~460px overlay on the map. "I'm on the
  map, give me quick context on this river without leaving." Stays lightweight
  (summary + counts leading into the depth tabs); gains a prominent **"Open
  river page"** action.
- **River page (the destination)** — a standalone, **desktop-rich** landing
  surface at `/river/<id>`. "Tell me everything about this river" — the
  reference/planning surface you land on, link to, and (later) that search
  indexes. The map becomes one *component on* the page, not the container. On
  mobile it renders as a full-screen scroll of the same content.

Both read **one river-detail content model** — the panel shows a subset, the
page shows the full thing — so they can never diverge (the failure mode we hit
when two panels stacked).

**Why the page is worth its own surface** (things the panel structurally can't
do): desktop multi-column richness; **shareable URLs** (`/river/<id>`, matching
the existing `/club/<handle>` pattern); **organic discovery** — an indexable
page per river is a real top-of-funnel lever (needs SSR/prerender to index —
see RIVERDISC-B8, a separable later stage); and a home for river-level content
that has nowhere to live on a map (history, sourced news, local clubs, the
river-wide photo roll-up).

**Staged build:** (1) the consolidated **Overview content model** (facts, grade/
character, current level, sections, key access/hazards, recent photos, gauges,
**data gaps + sources**) — usable in both surfaces; (2) the desktop-rich
`/river/<id>` page reusing it; (3) SSR/prerender for shareability + SEO.

The first useful river page should show:

- river name, alternate names, region, country, and broad watercourse type
- known sections and candidate sections
- grade range and character summary with source/confidence labels
- current level/release context where available
- key access, parking, hazards, and notable features
- recent reports and recent photos
- related gauges and observation stations
- known data gaps and verification status

Later versions may add:

- source, mouth, tributaries, and what it feeds into
- short local/history notes
- notable bridges, viaducts, venues, films, or landmarks
- recent public news references naming that river
- local clubs, venues, instructors, cafes, shops, or accommodation where commercial policy allows

Public-news and history-style content must be sourced and must not crowd out paddling-critical information.

Historical level and rainfall charts (the old card's 48h / 7d / 28d observation-history view) are a planned addition to the river card/detail. The underlying observation history and chart rendering already exist from the earlier section view, so the remaining work is re-surfacing them on the river-first card. Tracked as RIVERDISC-F7.

### Nearby Rivers

When the user opts into browser location, Search and Map should be able to show rivers nearby in distance order.

Nearby river rows should support filters for:

- distance or travel-time estimate
- grade band
- current level/runnability band
- craft suitability
- verified vs candidate data
- recent reports or unresolved hazards

Travel time should be labelled as an estimate. It should not be required for the first implementation if straight-line distance is the only reliable local calculation.

### Liability And Language

River-first copy should avoid presenting RiverLaunch as a safety authority.

Preferred words:

- `river`
- `section`
- `known feature`
- `candidate section`
- `community report`
- `recent level context`
- `source confidence`

Use `route` internally where it describes a route geometry or route submission record, but avoid making `Routes` the primary public-navigation concept.

Avoid:

- `safe to paddle`
- `approved route`
- `official route` unless an official or licensed source explicitly owns that route
- implying that a tick/cross alone decides whether someone should paddle

## Open Questions

- Should the public nav label become `Rivers` while the backend keeps `routes` and `sections` as data records?
- At what zoom should the map switch from river markers to section/feature detail?
- Should river markers represent whole named rivers, local river groups, or the best-known local section when river grouping is uncertain?
- Which source should provide whole-river identity first: OSM relations, OS Open Rivers, WFD waterbodies, or moderator-created grouping?
- How should travel-time estimates work without adding expensive routing dependencies?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RIVERDISC-F1 | River overview markers | Map | Active | MVP | — | First slice shows canonical pilot river markers from the public river API; grade/runnability/data-confidence badge treatment remains next. |
| RIVERDISC-F2 | Selected-river context | Map | Active | MVP | — | First slice shows canonical river summary, linked-section/candidate counts, source caveat, and section shortcuts; richer feature layers remain queued. |
| RIVERDISC-F3 | River detail page | River detail/search | Active | MVP | — | Dedicated desktop-rich `/river/<id>` page (the "destination"); the map panel stays the in-map "glance". One shared content model. Building 2026-07-03. |
| RIVERDISC-F4 | Nearby river list | Search/map | Queued | MVP | — | Opt-in location can rank nearby rivers by distance and filter by grade and current conditions. |
| RIVERDISC-F5 | River-first copy migration | App shell/map/search | Queued | MVP | — | Public IA should favour `Rivers`; route/section language remains for detailed paddling interpretations. |
| RIVERDISC-F6 | Feature layer density controls | Map | Queued | MVP | — | Let users hide/show feature categories on selected rivers to reduce marker clutter. |
| RIVERDISC-F7 | Historical level & rainfall charts | River card/detail | Queued | Later | — | Re-surface the old 48h/7d/28d observation-history charts (level + rainfall) on the river card. Data + chart rendering already exist from the earlier section view; remaining work is the river-card display. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| RIVERDISC-B1 | decision | Whole-river identity source | Resolved | MVP | First grouping uses RiverLaunch-curated pilot canonical rivers seeded without OS dependency, with source links for later enrichment. |
| RIVERDISC-B2 | risk | Liability wording | Open | MVP | Ensure grade, tick/cross, and runnability indicators are contextual signals, not safety advice. |
| RIVERDISC-B3 | validation | Marker semantics | Open | MVP | Test whether initial/grade/runnability markers are understandable on mobile. |
| RIVERDISC-B4 | dependency | River grouping data | Open | MVP | Requires watercourse grouping beyond local OSM stretch selection. |
| RIVERDISC-B5 | enhancement | Public news/history references | Parked | Later | Useful for richness, but not part of paddling-critical MVP. |
| RIVERDISC-B6 | decision | Card-vs-detail layering | Resolved | Later | Card = scannable overview with counts that lead into depth; per-aspect depth (old Levels/Access/Hazards/Updates/Photos tabs) lives in the river detail surface — expanded card first, then the river page (F3). |
| RIVERDISC-B7 | enhancement | River-wide photo gallery | Parked | Later | Aggregate POI and contribution photos into a river-level gallery on the river detail surface (RIVERDISC-F3). Photos currently live on their POI (CON-F19); this rolls them up to the river. Confirmed wanted, deferred. |
| RIVERDISC-B8 | task | SSR/prerender for river pages | Open | Later | The `/river/<id>` page must be server-rendered/prerendered to be indexable (organic-search top-of-funnel). Separable later stage; the page is useful to users without it. Shares the SPA-SSR need noted in posts-and-sharing / public-profile. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-05 | Created river-first discovery spec from Joe feedback and route/liability review. |
| 2026-06-14 | Captured historical level & rainfall charts on the river card as tracked future work (RIVERDISC-F7). |
| 2026-06-14 | Recorded card-vs-detail layering: card stays a scannable overview; per-aspect depth lives in the river detail surface (expanded card / river page). |
| 2026-06-15 | Captured river-wide photo gallery as deferred future work (RIVERDISC-B7). |
| 2026-07-03 | Panel-vs-page design: map panel = in-map glance, `/river/<id>` page = desktop-rich destination, one shared content model; staged build; added SSR/SEO backlog (RIVERDISC-B8). F3 moved to Active. |
