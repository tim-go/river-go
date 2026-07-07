---
roadmap_core_feature_group: Core Map
roadmap_core_feature_item: Unified Entity Surfaces
roadmap_core_feature_phase: Soon
spec_schema: 4
maturity: Sketch
---

# Map entity surfaces — one entity, two surfaces, capability-driven

**Work state:** Agreed shape (2026-07-06) — not yet scheduled
**Last updated:** 2026-07-06
**Scope:** How mappable entities (paddling features, amenities, gauges, photos, contributions, and the river/route containers) are *presented and contributed to* — the shared surface/interaction framework on top of the `pois` data model. Amenities becoming first-class is the first customer. **River attribution is out of scope** (see [/docs/specs/map-features-data-model.md](/docs/specs/map-features-data-model.md) §5 and [/docs/specs/discovery/river-first-discovery.md](/docs/specs/discovery/river-first-discovery.md)).

## Purpose

We want new mappable things — starting with **making amenities first-class so people can add notes/photos to car parks and campsites** — without growing a parallel stack of markers, panels, pages and contribution paths per type. The data layer is already unified (the `pois` index); the **surface layer is not**, and that is where duplication and capability gaps live today.

This spec defines a single framework — *one entity, two surfaces, capability-driven sections* — so a new entity type is **config plus maybe one new section component**, never a new panel or page. The explicit goal is **less code, not more**: adopting the framework should let us delete divergent paths (popup-only amenities, the legacy dual contribution key, the ~3× duplicated marker/click block, the bespoke river page), not add to them.

The motivating idea, in the owner's words: treat all these points "in a similar way … a simple model / framework … we don't want code duplication and bloat — if anything we should simplify the model." Where a type genuinely needs a richer surface (rivers get a detail *page*), it must still compose the *same* building blocks.

## Product Role

- `Primary user objective:` Contributors add and enrich the places that matter (rapids, access, hazards, **car parks, campsites**, gauges) with notes, photos and confirmations; browsers read a consistent detail surface wherever they tap.
- `Classification:` Core map / contribution framework (internal architecture with direct product payoff — amenity contributions).
- `Loop step:` Plan / Paddle / Recover / Contribute.
- `Why this matters:` The community-contribution loop is the product's moat. A single surface framework makes every entity type contributable cheaply and consistently, and keeps the codebase small enough to keep moving.

## 1. Current shape (grounded)

**Already unified — the point layer & runtime shape:**

- The `pois` index holds paddling features, amenities, stations and standalone contributions via one `(source_entity_type, source_entity_id)` stable-upsert contract (see [/docs/specs/map-features-data-model.md](/docs/specs/map-features-data-model.md)). No id churn.
- Frontend `MapPoi` → `SelectedPoi` → `PoiDetailPanel` is a genuine shared spine; `mapPoiDisplayMeta` derives the fine display category from OSM tags.
- **`"photo"` is a first-class contribution `type`** (alongside `hazard`/`report`/`feature`/`access`). There is **no photo entity and no photo panel** — a photo is coerced into the same `SelectedPoi`/`PoiDetailPanel`. Photo-specific code is confined to a map layer toggle, a badge-vs-standalone-pin representation with dedup, and the `PhotoLightbox` full-image overlay.
- Contributions already carry a **generic `poi_id`** that can target *any* `pois` row — not just paddling features.

**Not yet unified — the surface & interaction layer (the debt):**

| Divergence | Where | Consequence |
|---|---|---|
| Amenities & stations are **popup-only** (`bindPopup`, no click→panel) | `RiverMap.tsx` amenity ~1123 / station ~1205 | No details/photos/contribute for them — the capability gap this spec closes |
| **Dual contribution key**: legacy `map_poi_id` (paddling-feature only) vs generic `poi_id` | `sync.ts`, `contributions.ts`; `hasPhotos` keys on `map_poi_id` (`map-pois.ts`) | Amenity/station photos can't surface even though the data model allows them |
| POI marker+click block **duplicated ~3×** | `RiverMap.tsx` global / selected-river / section | Change-amplification, drift risk |
| **Two `SelectedPoi` photo adapters** (`contributionToSelectedPoi`, `riverPhotoToSelectedPoi` — the latter fabricates a `ContributionPhoto`) | `appCore.ts` | Parallel conversion code |
| `RiverDetailPage` is **bespoke**, ignores the shared `EntityPage` base that Groups/Profile use | `RiverDetailPage.tsx` | Divergent page framework for the highest-traffic entity |
| `map_poi:` id vs `paddling_feature` type mismatch | migrations 028/031 | Consumers special-case |

## 2. Target framework — one entity, two surfaces, capabilities

### 2.1 One entity

Everything on the map is a `pois` row discriminated by `source_entity_type`; `SelectedPoi` is its runtime shape. Amenities and stations are simply entity types that don't yet receive the full surface. No new entity structs.

### 2.2 Two surfaces, both composing shared sections

- **Panel** — the in-map glance, for **points** (feature, amenity, gauge, photo, contribution). One `PoiDetailPanel`.
- **Page** — the routed destination, for **containers** (rivers now; possibly amenity/section later *only if demand shows*). One `EntityPage` base.

The rule: **both surfaces render the same section components** (POI list, photo gallery, levels, contribute, verification, location/directions). A river gets a *page* because it is a container, not because it has bespoke code. `RiverDetailPage` should be refactored onto the shared `EntityPage` base + shared sections.

### 2.3 Capability-driven sections

Each entity type declares a capability set; the surface renders the matching sections. Illustrative:

| entity type | capabilities | panel sections |
|---|---|---|
| paddling feature | `verify, contribute, photo, locate` | Details · Location · Verification · Photos |
| amenity (car park, campsite) | `contribute, photo, locate` | Details · Location · Add note / photo |
| gauge / station | `levels, locate` | Details · Location · Levels |
| photo | `photo` | (opens on Photos) |
| contribution | `photo, locate` | Details · Location · Photos |

New type ⇒ add a capability entry (and, at most, one new section component). Never a new panel/page.

### 2.4 Contributions unified on `poi_id`

Make notes/photos/comments target the generic `poi_id` for **any** `pois` row, and key `hasPhotos`/photo badges on `poi_id`. Retire the `map_poi_id`-only assumption. This is the single backend change that lets amenities/stations carry contributions — and it deletes a code path rather than adding one. The backend map indicates **no schema change is required** (`poi_id` already exists and is backfilled) — the riskiest assumption; verify first (see Delivery §3, phase 0).

## 3. Delivery — amenities-first

Amenities are the **first customer** that proves the generalisation and pays down the debt on the way.

- **Phase 0 — De-risk (spike).** Confirm a contribution can be created against a non-paddling-feature `poi_id` (an amenity) end-to-end with no schema change, and surface its photo. If a schema tweak is needed, scope it here.
- **Phase 1 — Capability + section plumbing.** Introduce the capability map and refactor `PoiDetailPanel` to render sections from it (behaviour-preserving for existing types). Collapse the two photo `SelectedPoi` adapters into one.
- **Phase 2 — Amenities/stations get the panel.** Route amenity and station clicks to `PoiDetailPanel` (capability-selected sections) instead of popup-only. Fold the ~3× marker/click block into one helper.
- **Phase 3 — Amenity contributions.** Enable the contribute section (notes/photos) for `car_park` + `camp_site` first; `hasPhotos`/badges keyed on `poi_id`. Retire the legacy `map_poi_id`-only path.
- **Phase 4 — River-page tie-in & page unification.** Surface amenity contributions on `/river/<id>` ("Parking & camping near this river", using the amenities' asserted `river_id`); refactor `RiverDetailPage` onto the shared `EntityPage` base + shared sections.
- **Phase 5 — Optional.** A routed `/amenity/<id>` page (shareable/SEO), mirroring `/river/<id>`, only if demand appears.

Tier richness: keep toilets/shops as plain markers — do **not** make all ~6280 amenities equally rich. (`camp_site` already exists as an amenity kind — this is surfacing, not adding, camping.)

## 4. Non-goals / out of scope

- **River attribution** (which river a POI belongs to, add-time correctness, corridors, off-river points) — a separate concern, now specced in [/docs/specs/discovery/river-attribution.md](/docs/specs/discovery/river-attribution.md) (on top of the `river_id` data model in [/docs/specs/map-features-data-model.md](/docs/specs/map-features-data-model.md) §5).
- **Fully merging amenities into the paddling-feature table.** They stay separate source tables by domain/trust/lifecycle; unification is at the `pois` index + surface layer only (per the data-model spec's "separate tables + unified capability").
- **Routes/sections as points.** They remain container/line entities referenced by `poi_route_links`; add-segment stays river-scoped.

## 5. Simplifications this unlocks (net-negative code)

- One contribution target key (retire legacy `map_poi_id`).
- One photo→`SelectedPoi` adapter.
- One marker/click helper (was ~3×).
- `RiverDetailPage` on the shared `EntityPage` base.
- Fix the `map_poi:` id / `paddling_feature` type mismatch so consumers stop special-casing.

## Tracking

| ID | Type | Item | Status | Phase | Notes |
|---|---|---|---|---|---|
| MES-B1 | backend | Contributions target any `poi_id`; `hasPhotos`/badges keyed on `poi_id` | Queued | Amenities-first | Retire `map_poi_id`-only assumption. De-risk in phase 0. |
| MES-F1 | feature | Capability map + section-composed `PoiDetailPanel` | Queued | Amenities-first | Behaviour-preserving refactor; single photo adapter. |
| MES-F2 | feature | Amenity/station click → panel (not popup-only) | Queued | Amenities-first | Fold ~3× marker/click block into one helper. |
| MES-F3 | feature | Amenity contributions (car park + campsite) | Queued | Amenities-first | Notes/photos via generic `poi_id`. |
| MES-F4 | feature | Amenities on the river page + `RiverDetailPage` → `EntityPage` | Queued | Later | "Parking & camping near this river". |
| MES-F5 | feature | Routed `/amenity/<id>` page | Parked | Later | Only if demand appears. |
| MES-B2 | backend | Fix `map_poi:` id / `paddling_feature` type mismatch | Parked | Later | Consumer cleanup. |

## References

- [/docs/specs/map-features-data-model.md](/docs/specs/map-features-data-model.md) — the `pois` index, source tables, contributions, asserted `river_id` (the data foundation this sits on).
- [/docs/specs/discovery/nearby-amenities-and-emergency-points.md](/docs/specs/discovery/nearby-amenities-and-emergency-points.md) — amenity layer, relevance filtering, sourcing.
- [/docs/specs/contributions/community-contributions.md](/docs/specs/contributions/community-contributions.md) — contribution types, lifecycle.
- [/docs/specs/contributions/photo-uploads.md](/docs/specs/contributions/photo-uploads.md) — photo attachments & lightbox.
- [/docs/specs/discovery/river-first-discovery.md](/docs/specs/discovery/river-first-discovery.md) — `/river/<id>` (the Page tier's first instance) and river attribution context.
- [/docs/specs/identity/app-shell-navigation.md](/docs/specs/identity/app-shell-navigation.md) — routed-entity navigation.

## Changelog

| Date | Change |
|---|---|
| 2026-07-06 | Initial spec — framework agreed in discussion (one entity, two surfaces, capability-driven sections; contributions on generic `poi_id`; amenities-first delivery). River attribution kept separate. |
